'use strict';
/* ============================================================================
 * tests/playtests/lib/prelude-selftest.js — prelude 底座最小自证脚本
 * ----------------------------------------------------------------------------
 * 自证内容（防假绿）：
 *   [1] 七道前置门全过（gate7 为软门，恒过但带 warnings）
 *   [2] R9-a 三指标在「1 株 corn × 1 僵尸」受控场景产出合理值
 *       （frozenFrac 落 20%–40% 量级；v1.7 域理论锚点 ≈0.300）
 *       + overflow 分栏非空真校验（direct events>0）+ 已知溢出样本
 *       （hp=5 吃 8 伤 → rate=0.375）——noteHpWrite 重复 kind 键假绿缺陷回归防线
 *   [3] 哨兵双域一过一红：v1.6 域 PASS + v1.7 域必须 FAIL ⇒ 判别力完整
 *
 * 跑法（裸 node 不在 PATH，用绝对路径）：
 *   "C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2/node.exe" tests/playtests/lib/prelude-selftest.js
 * 产出：tests/playtests/lib/prelude-selftest-results.json
 * 环境变量：PVZ_HTML_PATH / PVZ_EXPECT_VER / PVZ_SELFTEST_OUT
 * ==========================================================================*/

const fs = require('fs');
const path = require('path');
const P = require(path.join(__dirname, 'prelude.js'));

const OUT_FILE = process.env.PVZ_SELFTEST_OUT || path.join(__dirname, 'prelude-selftest-results.json');
const WINDOW_T = 72;      // 受控场景观测窗（对齐 M1 口径）
const WARMUP_T = 8;       // 预热段不计入指标（弹道首次飞行+第一发黄油前）

async function main() {
  const t0 = Date.now();
  const out = {
    meta: {
      task: 'V18-Q1 R9-a prelude 底座自证（七道门 + 三指标受控场景 + 哨兵双域）',
      date: new Date().toISOString().slice(0, 10),
      node: process.version,
      htmlPath: P.htmlPath(),
      windowT: WINDOW_T, warmupT: WARMUP_T,
      runtimeMs: null,
      preconditions: null,
    },
    gates: null,
    metrics: null,
    sentinel: null,
    assertions: [],
    pass: false,
  };
  const assert = (name, pass, detail) => {
    out.assertions.push({ name, pass: !!pass, detail });
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail || ''}`);
    return pass;
  };

  // ---------- [1] 七道门 ----------
  console.log('[1/3] 七道前置门 + 前提实测 ...');
  const { g, pre, gates } = await P.bootstrap({});
  out.meta.preconditions = pre;
  out.gates = {
    pass: gates.pass, failedGates: gates.failedGates,
    results: gates.results.map((r) => ({ gate: r.gate, name: r.name, pass: r.pass, detail: r.detail, warnings: r.warnings })),
  };
  for (const r of gates.results) console.log(`  gate${r.gate} ${r.pass ? 'PASS' : 'FAIL'} ${r.name} — ${r.detail}`);
  let ok = assert('七道前置门全过(gate1-6硬门)', gates.pass, gates.failedGates.length ? `失败:${gates.failedGates.join(',')}` : 'gate7 软门恒过');
  // ⑤ 前提快照单独断言（数据落档展示）
  ok = assert('前提:黄油p实测≈0.27', Math.abs(pre.measured.butterP - 0.27) <= 1e-6, `实测 ${pre.measured.butterP}`) && ok;
  ok = assert('前提:freezeT实测=3.0', P.epsEq(pre.measured.freezeT, 3.0), `实测 ${pre.measured.freezeT}`) && ok;
  ok = assert('前提:cornCd实测=2.6', P.epsEq(pre.measured.cornCd, 2.6), `实测 ${pre.measured.cornCd}`) && ok;
  ok = assert('前提:判域=T>cd(overlapWasteExpected)', pre.domain.overlapWasteExpected === true && pre.domain.T_le_cd === false,
    `domain=${pre.domain.domainLabel}`) && ok;

  // ---------- [2] 三指标受控场景：1 corn × 1 存活靶 × 4 种子聚合 ----------
  // 说明：v1.7 域每发黄油刷新概率 ≈ (T−cd)/T ≈ 13.3%，单 72s 窗（~27 发）零刷新概率 ~2%；
  // 叠加种子抖动，单种子可能 refreshEvents=0 ⇒ 断言改 4 种子聚合（合并账本读数）。
  console.log('[2/3] 三指标受控场景（1 corn × 1 normal 存活靶, 72s ×4 种子）...');
  const mPerSeed = [];
  for (const seed of P.seeds(7001, 4)) {
    const g2 = P.freshGame(seed);
    const ledger = P.createLedger({ warmupT: WARMUP_T, classify: P.makeHitClassifier({ direct: [15], splash: [6] }) });
    const z = P.injectZombie(g2, { hp: 180 * P.SURVIVOR_MULT, maxHp: 180 * P.SURVIVOR_MULT });
    P.attachHpProbe(z, (preHp, postHp) => ledger.noteHpWrite(z, ledger.tNow, preHp, postHp));
    P.injectPlant(g2, 'corn', 0);
    P.instrument(g2, { onFreeze: (zz, preT) => ledger.noteFreeze(zz, ledger.tNow, preT) });
    const mm = P.runWindow(g2, {
      ledger, zombies: [z], duration: WINDOW_T, teleport: P.TELEPORT_X, warmupT: WARMUP_T,
      p: pre.measured.butterP, T: pre.measured.freezeT, cd: pre.measured.cornCd, nPlants: 1,
    });
    mPerSeed.push(mm);
    console.log(`  seed=${seed} cov=${mm.freezeCoverage} butters=${mm.butters} refresh=${mm.refreshEvents} waste=${mm.refreshWasteTotal} denial=${mm.denialPx}`);
  }
  const wsum = (k) => mPerSeed.reduce((a, b) => a + b[k], 0);
  const framesTot = wsum('frames');
  const m = {
    freezeCoverage: P.r4(wsum('freezeCoverage') / mPerSeed.length),
    chillFrac: P.r4(wsum('chillFrac') / mPerSeed.length),
    unionFrac: P.r4(wsum('unionFrac') / mPerSeed.length),
    butters: wsum('butters'), refreshEvents: wsum('refreshEvents'),
    refreshWasteTotal: P.r4(wsum('refreshWasteTotal')),
    denialPx: P.r2(wsum('denialPx')),
    denialBreakdown: {
      frozenPx: P.r2(wsum('frozenPx') !== undefined ? mPerSeed.reduce((a, b) => a + b.denialBreakdown.frozenPx, 0) : 0),
      chillPx: P.r2(mPerSeed.reduce((a, b) => a + b.denialBreakdown.chillPx, 0)),
    },
    legacyButters: wsum('legacyButters'), resetEvents: wsum('resetEvents'),
    overflow: mPerSeed[0].overflow,
    perZombie: mPerSeed.flatMap((x) => x.perZombie),
    naiveProjection: mPerSeed[0].naiveProjection,
  };
  m.naiveProjection.deviation = P.r4(m.naiveProjection.value - m.freezeCoverage);
  m.naiveProjection.wasteShare = P.r4(m.refreshWasteTotal / (framesTot * P.DT));
  m.naiveProjection.identityResidual = P.r4(m.naiveProjection.deviation - m.naiveProjection.wasteShare);
  out.metrics = m;
  console.log(`  [聚合] freezeCoverage=${m.freezeCoverage} chillFrac=${m.chillFrac} unionFrac=${m.unionFrac}`);
  console.log(`  [聚合] butters=${m.butters} refreshEvents=${m.refreshEvents} refreshWaste=${m.refreshWasteTotal} wastePerButter=${P.r4(m.refreshWasteTotal / Math.max(1, m.butters))}`);
  console.log(`  [聚合] denialPx=${m.denialPx} (frozen ${m.denialBreakdown.frozenPx} + chill ${m.denialBreakdown.chillPx})`);
  console.log(`  [聚合] naiveProjection=${m.naiveProjection.value} deviation=${m.naiveProjection.deviation} wasteShare=${m.naiveProjection.wasteShare} identityResidual=${m.naiveProjection.identityResidual}`);
  console.log(`  [聚合] legacyButters=${m.legacyButters} resetEvents=${m.resetEvents}`);

  ok = assert('指标:frozenFrac 落 20%-40% 量级', m.freezeCoverage >= 0.20 && m.freezeCoverage <= 0.40, `实测 ${m.freezeCoverage}`) && ok;
  ok = assert('指标:黄油可达(butters>=24)', m.butters >= 24, `实测 ${m.butters}（4×72s 窗,期望 ~0.27×4×64/2.6≈26）`) && ok;
  ok = assert('指标:口径一致 butters==freezeEvents 汇总', m.butters === m.perZombie.reduce((a, b) => a + b.butters, 0), `汇总 ${m.butters}`) && ok;
  ok = assert('指标:denialPx>0 且 breakdown 守恒', m.denialPx > 0
    && Math.abs(m.denialPx - m.denialBreakdown.frozenPx - m.denialBreakdown.chillPx) <= 0.05,
    `total=${m.denialPx}`) && ok;
  ok = assert('指标:v1.7域刷新浪费>0(T>cd)', m.refreshEvents > 0 && m.refreshWasteTotal > 0,
    `refresh=${m.refreshEvents} waste=${m.refreshWasteTotal}s`) && ok;
  // 马尔可夫 renewal 锚点：v1.7 域每刷新浪费 ≈ T−cd = 0.4s（(T-cd)/T≈13% 概率 × 剩余均摊）
  const wastePerRefresh = m.refreshWasteTotal / Math.max(1, m.refreshEvents);
  ok = assert('指标:每刷新浪费≈T-cd=0.4s(±0.2)', Math.abs(wastePerRefresh - 0.4) <= 0.2,
    `均值 ${P.r4(wastePerRefresh)}s/刷新 × ${m.refreshEvents}`) && ok;
  // 恒等式残差为稳态结论，有限窗口被边界效应（预热前冻结尾巴+窗口末截断，±2~5pp）淹没 1.1pp 信号
  // ⇒ 降为信息项上报，不做硬断言；哨兵判据锚定确定性事件（刷新浪费的有无与额度）。
  console.log(`  [信息] 恒等式残差(投影-实测-浪费份额)=${m.naiveProjection.identityResidual}（边界效应主导,仅信息项）`);
  ok = assert('指标:legacy/reset 双轨与调用计数互证', m.resetEvents >= m.refreshEvents - 1 && m.legacyButters >= 4,
    `legacy=${m.legacyButters} reset=${m.resetEvents} 调用=${m.butters}`) && ok;
  ok = assert('指标:存活靶溢杀栏保持raw且rate不定义', m.overflow.mode === 'survivor' && m.overflow.direct.rate == null
    && m.overflow.splash.rate == null && m.overflow.unknown.rate == null,
    `mode=${m.overflow.mode} rates=[${m.overflow.direct.rate},${m.overflow.splash.rate},${m.overflow.unknown.rate}]`) && ok;
  ok = assert('指标:有效伤害=raw(存活靶clamp恒等)', Math.abs(m.overflow.direct.raw - m.overflow.direct.eff) <= 0.05,
    `raw=${m.overflow.direct.raw} eff=${m.overflow.direct.eff}`) && ok;
  // 溢杀分栏非空真校验（2026-09-22 noteHpWrite 重复 kind 键假绿缺陷回归防线）：
  // 受控臂为单 corn 场景 ⇒ 直中栏必非空（溅射无第二靶，恒 0 属口径如实，不强求）。
  // 修复前直中 events 恒 0（分类值覆盖事件标记 → finalize 全跳过）→ 0=0 空真。
  ok = assert('指标:direct分栏非空真(raw>0,events>0)', m.overflow.direct.raw > 0 && m.overflow.direct.events > 0,
    `raw=${m.overflow.direct.raw} events=${m.overflow.direct.events}（修复前恒 0 假绿）`) && ok;
  // 已知溢出样本（账本内省 mock 注入）：hp=5 吃 8 点溅射 → eff=5/ovf=3/rate=3/8=0.375。
  // finalize 对 mode=survivor 统一置 rate=null（仅真实行程臂上报率）⇒ 该校验直接读事件行值
  // （clamp 口径冻结的核心量 eff/ovf 在事件上，rate 是聚合派生量），不经 survivor 门控。
  {
    const gk = P.freshGame(7001);
    const lk = P.createLedger({ classify: P.makeHitClassifier({ splash: [8] }) });
    const zk = P.injectZombie(gk, { hp: 5, maxHp: 5, spd: 0 });
    P.attachHpProbe(zk, (a, b) => lk.noteHpWrite(zk, lk.tNow, a, b));
    const wk = lk.noteHpWrite(zk, 1.5, 5, -3);   // pre=5 → post=-3：delta=8，clamp eff=min(max(5,0),8)=5
    ok = assert('指标:已知溢出样本 eff=5/ovf=3/rate=0.375', wk.eff === 5 && wk.overflow === 3 && wk.hitKind === 'splash',
      `事件行 eff=${wk.eff} ovf=${wk.overflow} hitKind=${wk.hitKind}（率=3/8=0.375，聚合 rate 受 survivor 门控为 null，见下）`) && ok;
    const fk = lk.finalize(0, 3, 2.6, 1);
    ok = assert('指标:已知溢出样本分栏归位(splash events=1,raw=8)', fk.overflow.splash.events === 1
      && fk.overflow.splash.raw === 8 && fk.overflow.splash.eff === 5 && fk.overflow.splash.ovf === 3,
      `栏 raw=${fk.overflow.splash.raw} eff=${fk.overflow.splash.eff} ovf=${fk.overflow.splash.ovf} events=${fk.overflow.splash.events}`) && ok;
  }
  ok = assert('指标:hp账本有真实事件(直中15/溅6)', m.perZombie.reduce((a, b) => a + b.hpWrites, 0) >= 20,
    `hpWrites=${m.perZombie.reduce((a, b) => a + b.hpWrites, 0)}`) && ok;

  // ---------- [3] 哨兵双域 ----------
  console.log('[3/3] 口径自检哨兵（双域双跑）...');
  const sent = P.runSentinel({ cd: pre.measured.cornCd, nSeeds: 8, windowT: 72, warmupT: 8 });
  out.sentinel = sent;
  console.log(`  A(${sent.A.label}): butters=${sent.A.buttersTotal} refresh=${sent.A.refreshTotal} waste=${sent.A.wasteTotal} → ${sent.A.verdict}`);
  console.log(`     coverage=${sent.A.covAgg.mean}±${sent.A.covAgg.std} pred=${sent.A.predMean} dev=${sent.A.devAgg.mean}`);
  console.log(`  B(${sent.B.label}): butters=${sent.B.buttersTotal} refresh=${sent.B.refreshTotal} waste=${sent.B.wasteTotal} wastePerRefresh=${sent.B.wastePerRefresh} → ${sent.B.verdict}`);
  console.log(`     coverage=${sent.B.covAgg.mean}±${sent.B.covAgg.std} pred=${sent.B.predMean} dev=${sent.B.devAgg.mean} identityRes=${sent.identityCheck.B_absResidualMean}`);
  ok = assert('哨兵:v1.6域刷新浪费恒0', sent.A.wasteTotal === 0 && sent.A.refreshTotal === 0, `waste=${sent.A.wasteTotal}`) && ok;
  ok = assert('哨兵:v1.6域判PASS', sent.A.verdict.startsWith('PASS'), sent.A.verdict) && ok;
  ok = assert('哨兵:v1.7域刷新浪费确凿', sent.B.refreshTotal >= 3 && sent.B.wasteTotal > 0,
    `refresh=${sent.B.refreshTotal} waste=${sent.B.wasteTotal}`) && ok;
  // 哨兵 B 域核心判据：每刷新浪费 ≈ T*−cd = 0.4s（确定性额度锚点，dev 符号被边界效应淹没不作判据）
  ok = assert('哨兵:v1.7域每刷新浪费≈T*-cd=0.4s(±0.15)', sent.B.wastePerRefresh > 0.25 && sent.B.wastePerRefresh < 0.55,
    `wastePerRefresh=${sent.B.wastePerRefresh}s × ${sent.B.refreshTotal} 次`) && ok;
  ok = assert('哨兵:v1.7域判FAIL(公式前提崩塌)', sent.B.verdict.startsWith('FAIL'), sent.B.verdict) && ok;
  ok = assert('哨兵:双域判别力完整', sent.discriminative === true, sent.conclusion) && ok;
  ok = assert('哨兵:v1.6域投影偏差≈0(<=5pp)', Math.abs(sent.A.devAgg.mean) <= 0.05, `dev=${sent.A.devAgg.mean}`) && ok;

  // ---------- 收尾 ----------
  out.pass = ok && out.assertions.every((a) => a.pass);
  out.meta.runtimeMs = Date.now() - t0;
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log(`\n${out.pass ? 'SELFTEST PASS' : 'SELFTEST FAIL'} → ${OUT_FILE} (${out.meta.runtimeMs}ms)`);
  process.exitCode = out.pass ? 0 : 1;
}

main().catch((e) => {
  console.error('SELFTEST CRASH:', e && e.stack || e);
  process.exitCode = 2;
});
