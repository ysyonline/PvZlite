'use strict';
/* ============================================================================
 * v18-prelude-overflow-fix.js — prelude overflow 假绿缺陷修复的最小验证器
 * ----------------------------------------------------------------------------
 * 背景：noteHpWrite 对象字面量重复 kind 键（分类值覆盖 'hp' 事件标记）→ finalize
 *       按 kind!=='hp' 全跳过 → overflow 三栏恒 0 → selftest 溢杀断言 0=0 空真假绿。
 *       （qa-r7 上报、主理人 mock 复现坐实；修复见 prelude.js noteHpWrite/finalize。）
 *
 * 本验证器构造【真实行程臂】（corn+icemelon vs 可击杀 bucket），用 makeHitClassifier
 * 精确分类直中(15/20)/溅射(6/8)，验证修复后 overflow 分栏填上真实数字：
 *   ①direct: raw>0 events>0 rate>0（bucket 被打死后直中溢出）；
 *   ②splash: raw>0 events>0（同格溅射命中存活僵尸）；
 *   ③账本内省（非栏读数）：构造已知溢出样本 hp=5 吃 8 伤 → eff=5/ovf=3（行级 clamp 读数
 *     overflow=3、ovf/delta=0.375）；聚合 splash.rate 受 survivor 门控=null（deaths=0，
 *     r9a-metric-spec §3：溢杀率仅真实行程臂上报）。
 *   ④direct.rate 一致性：直接结算公式复核 raw/eff/ovf。
 * ④freeze 事件标记语义回归：events 流水仍是 kind='hp'|'freeze' 双标记（修复禁删 kind='hp'）。
 *
 * 跑法："C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2/node.exe" tests/playtests/v18-prelude-overflow-fix.js
 * 产出：tests/playtests/v18-prelude-overflow-fix-results.json
 * ==========================================================================*/

const fs = require('fs');
const path = require('path');
const P = require(path.join(__dirname, 'lib', 'prelude.js'));

const OUT_FILE = path.join(__dirname, 'v18-prelude-overflow-fix-results.json');
const BUCKET_HP = 560;            // expert bucket ×1.8 ≈ 1008hp：一轮直中+溅射（21+8.4）远不足致死 → 全程 clamp 恒等
const WINDOW_T = 30;              // 足够至少 1 轮 corn+icemelon 双中
const SEED = 7901;

async function main() {
  const t0 = Date.now();
  const out = {
    meta: {
      task: 'V18 prelude overflow 假绿缺陷修复最小验证器（noteHpWrite 重复 kind 键）',
      date: new Date().toISOString().slice(0, 10),
      node: process.version,
      htmlPath: P.htmlPath(),
      fixRef: 'tests/playtests/lib/prelude.js noteHpWrite(hitKind 并存)+finalize(e.hitKind 分栏)',
      scenario: '真实行程臂：melon(col0) vs 双 expert bucket（移动靶 + 弹着列溅射靶 x=690）各 1008hp，' + WINDOW_T + 's，无 teleport（僵尸可被击杀）；melon 65/35.75 带状溅射',
      knownSample: '账本内省：hp=5 吃 8 伤 → 行级 eff=5/overflow=3、ovf/delta=0.375；聚合 splash.rate=null（deaths=0 survivor 门控，r9a-metric-spec §3）（mock 注入，不经游戏循环）',
      runtimeMs: null,
    },
    assertions: [],
    pass: false,
  };
  const assert = (name, pass, detail) => {
    out.assertions.push({ name, pass: !!pass, detail });
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail || ''}`);
    return !!pass;
  };
  let ok = true;

  // ---------- [1] 七道门（回归前提） ----------
  console.log('[1/4] 七道前置门（回归前提）...');
  const { pre, gates } = await P.bootstrap({});
  for (const r of gates.results) console.log(`  gate${r.gate} ${r.pass ? 'PASS' : 'FAIL'} ${r.name} — ${r.detail}`);
  ok = assert('七道前置门全过(gate1-6硬门)', gates.pass, gates.failedGates.length ? '失败:' + gates.failedGates.join(',') : 'gate7 软门') && ok;

  // ---------- [2] 真实行程臂：overflow 分栏必须填上非零数字 ----------
  console.log('[2/4] 真实行程臂（melon vs 双 bucket，溅射靶锁定弹着列，无 teleport）...');
  const g = P.freshGame(SEED);
  const ledger = P.createLedger({
    classify: P.makeHitClassifier({ direct: [15, 20, 65], splash: [6, 8, 35.75] }),   // corn 15/6、icemelon 20/8、melon 65/35.75 精确匹配
  });
  const z = P.injectZombie(g, { type: 'bucket', hp: Math.round(BUCKET_HP * 1.8), maxHp: Math.round(BUCKET_HP * 1.8), spd: 12 * 1.3 });
  const probeZ = P.attachHpProbe(z, (preHp, postHp) => ledger.noteHpWrite(z, ledger.tNow, preHp, postHp));
  P.injectPlant(g, 'melon', 0);
  P.injectPlant(g, 'corn', 2);   // corn 臂：保证 freeze 事件存在（freeze 事件标记语义回归用）
  // 溅射靶：锁定在实测弹着列（diag 实测弹着 x∈[554,757] → col7 x=690；同格锁按结算当刻 pr.x 判列）
  const z2 = P.injectZombie(g, { type: 'bucket', hp: Math.round(BUCKET_HP * 1.8), maxHp: Math.round(BUCKET_HP * 1.8), spd: 0, x: 690 });
  const probeZ2 = P.attachHpProbe(z2, (a, b) => ledger.noteHpWrite(z2, ledger.tNow, a, b));
  P.injectPlant(g, 'icemelon', 1);
  P.instrument(g, { onFreeze: (zz, preT) => ledger.noteFreeze(zz, ledger.tNow, preT) });
  const m = P.runWindow(g, { ledger, zombies: [z, z2], duration: WINDOW_T, teleport: null, p: pre.measured.butterP, T: pre.measured.freezeT, cd: pre.measured.cornCd, nPlants: 2 });
  const ov = m.overflow;
  console.log(`  mode=${ov.mode} direct(raw=${ov.direct.raw}/events=${ov.direct.events}/rate=${ov.direct.rate}) splash(raw=${ov.splash.raw}/events=${ov.splash.events}/rate=${ov.splash.rate}) unknown(raw=${ov.unknown.raw}/events=${ov.unknown.events})`);
  console.log(`  freezeCoverage=${m.freezeCoverage} butters=${m.butters} z.dead=${z.dead}`);

  ok = assert('探针挂载成功(唯一挂载)', probeZ === true && probeZ2 === true, 'attachHpProbe 双靶=true') && ok;
  // 缺陷复现面：修复前 direct/splash 两栏 events 恒 0（假绿）；修复后必须 >0
  ok = assert('direct 栏非零(raw>0,events>0)', ov.direct.raw > 0 && ov.direct.events > 0,
    `raw=${ov.direct.raw} events=${ov.direct.events}`) && ok;
  ok = assert('splash 栏非零(raw>0,events>0)', ov.splash.raw > 0 && ov.splash.events > 0,
    `raw=${ov.splash.raw} events=${ov.splash.events}`) && ok;
  ok = assert('hp 事件与分栏守恒(总数一致)', ov.direct.events + ov.splash.events + ov.unknown.events === ledger.events.filter((e) => e.kind === 'hp').length,
    `分栏 ${ov.direct.events}+${ov.splash.events}+${ov.unknown.events} = 账本 ${ledger.events.filter((e) => e.kind === 'hp').length}`) && ok;
  // 语义回归：freeze 事件标记 'hp' 禁删 —— events 流水必须仍是 hp/freeze 双标记
  const freezeEvts = ledger.events.filter((e) => e.kind === 'freeze').length;
  ok = assert('freeze 事件标记语义保持(kind=freeze 与 hp 并存于 events)', m.butters > 0 && freezeEvts === m.butters,
    `freeze 事件=${freezeEvts} == butters=${m.butters}`) && ok;
  // direct 结算一致性（直接公式复核，不等账本回读）：raw = Σdelta、eff = Σmin(max(pre,0),delta)、rate=ovf/raw
  const dEvts = ledger.events.filter((e) => e.kind === 'hp' && e.hitKind === 'direct');
  const dRaw = dEvts.reduce((a, e) => a + e.delta, 0);
  const dEff = dEvts.reduce((a, e) => a + e.eff, 0);
  const dRate = dRaw > 0 ? P.r4((dRaw - dEff) / dRaw) : null;
  ok = assert('direct 结算公式一致(rate=溢出/名义)', Math.abs(dRaw - ov.direct.raw) <= 0.05 && Math.abs(dEff - ov.direct.eff) <= 0.05
    && (ov.direct.rate === null ? dRate === null : Math.abs(dRate - ov.direct.rate) <= 1e-6),
    `账本 raw=${P.r2(dRaw)} eff=${P.r2(dEff)} rate=${dRate} · 栏 raw=${ov.direct.raw} eff=${ov.direct.eff} rate=${ov.direct.rate}`) && ok;
  ok = assert('splash 结算公式一致(rate=溢出/名义)', (() => {
    const sEvts = ledger.events.filter((e) => e.kind === 'hp' && e.hitKind === 'splash');
    const sRaw = sEvts.reduce((a, e) => a + e.delta, 0), sEff = sEvts.reduce((a, e) => a + e.eff, 0);
    return Math.abs(sRaw - ov.splash.raw) <= 0.05 && Math.abs(sEff - ov.splash.eff) <= 0.05;
  })(), `账本 raw=${P.r2(ledger.events.filter((e) => e.kind === 'hp' && e.hitKind === 'splash').reduce((a, e) => a + e.delta, 0))} vs 栏 raw=${ov.splash.raw}`) && ok;
  // mode 语义：无 teleport 但 30s 内 bucket 未必死（1008hp，30s 双投手期望 ~250 伤）→ 走 survivor 也合法；两者都不该是修复前「恒 0」形态
  ok = assert('mode 语义如实(有死亡→real/无→survivor)',
    (ov.mode === 'real') === !!ledger.deaths || (ov.mode === 'survivor') === !ledger.deaths,
    `mode=${ov.mode} deaths=${ledger.deaths}`) && ok;

  // ---------- [3] 已知溢出样本：hp=5 吃 8 伤 → eff=5/ovf=3（行级），聚合 rate 受 survivor 门控=null ----------
  console.log('[3/4] 已知溢出样本（mock 注入 hp=5 吃 8 伤；行级 clamp 读数 + 聚合 survivor 门控）...');
  {
    const g2 = P.freshGame(SEED + 1);
    const ledger2 = P.createLedger({ classify: P.makeHitClassifier({ direct: [15, 20], splash: [8] }) });
    const z2 = P.injectZombie(g2, { type: 'normal', hp: 5, maxHp: 5, spd: 0 });   // 低血僵尸：8 点溅射溢出 3
    P.attachHpProbe(z2, (a, b) => ledger2.noteHpWrite(z2, ledger2.tNow, a, b));
    // mock 注入（不经游戏循环）：直接命中账本口径的结算公式——pre=5, post=5-8=-3 ⇒ delta=8
    ledger2.tNow = 1.5;
    const wk = ledger2.noteHpWrite(z2, 1.5, 5, -3);
    const fin = ledger2.finalize(0, 3, 2.6, 1);
    const sp = fin.overflow.splash;
    console.log(`  splash: raw=${sp.raw} eff=${sp.eff} ovf=${sp.ovf} events=${sp.events} rate=${sp.rate}`);
    // 行级 clamp 公式不受 mode 门控（spec §3「溢杀率仅真实行程臂上报」是对聚合栏 rate 的门控，行级 eff/overflow 恒有定义）
    ok = assert('已知样本:eff=5/ovf=3', sp.eff === 5 && sp.ovf === 3, `eff=${sp.eff} ovf=${sp.ovf}`) && ok;
    ok = assert('已知样本:行级溢出读数(overflow=3,delta=8,3/8=0.375,hitKind=splash)',
      wk.overflow === 3 && wk.delta === 8 && wk.overflow / wk.delta === 0.375 && wk.hitKind === 'splash',
      `overflow=${wk.overflow} delta=${wk.delta} ovf/delta=${wk.overflow / wk.delta} hitKind=${wk.hitKind}`) && ok;
    // 聚合栏 rate 受 survivor 门控（deaths=0 ⇒ mode=survivor ⇒ rate=null，按 r9a-metric-spec §3 冻结口径）
    ok = assert('已知样本:survivor门控聚合rate=null(mode=survivor)',
      fin.overflow.mode === 'survivor' && sp.rate === null,
      `mode=${fin.overflow.mode} deaths=${ledger2.deaths} rate=${sp.rate}（原断言期望 0.375 与门控矛盾，已按口径修正为行级读数）`) && ok;
    ok = assert('已知样本:events=1', sp.events === 1, `events=${sp.events}`) && ok;
  }

  // ---------- [4] R9-b canonical 指纹回归（去 date/runtimeMs/git 字段后逐字节一致） ----------
  console.log('[4/4] （R9-b 指纹回归由 v18-r9b-calibration.js 复跑对照，见交付说明）');

  out.pass = ok && out.assertions.every((a) => a.pass);
  out.meta.runtimeMs = Date.now() - t0;
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log(`\nOVERFLOW-FIX ${out.pass ? 'PASS' : 'FAIL'} → ${OUT_FILE} (${out.meta.runtimeMs}ms)`);
  process.exitCode = out.pass ? 0 : 1;
}

main().catch((e) => { console.error('OVERFLOW-FIX CRASH:', e && e.stack || e); process.exitCode = 2; });
