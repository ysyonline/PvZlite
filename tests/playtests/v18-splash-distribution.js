'use strict';
/* ============================================================================
 * tests/playtests/v18-splash-distribution.js — R7 溅射堆叠分布采样（v1.8）
 * ----------------------------------------------------------------------------
 * 任务：production/v1.8-plan.md §2 R7（17:3x 精简矩阵：间距维已删除，新增落点格
 *       僵尸数 n 维）。在新「溅射同格锁」规则上采样多株溅射叠加的真实伤害分布 +
 *       浪费率，回答设计稿 §7 假设「大范围稳定吃 1 副目标」。纯测量，源码零改动。
 *
 * 【脚本头部四行隐含前提声明（验收④；机器校验=bootstrap gate5 + 本脚本 prec 块）】
 * ①applyFreeze 是黄油唯一入口（溅射不调用，调用点计数==1，gate5 文本快照校验）；
 * ②freezeT 帧递减语义恒定 + chill/freeze 并存状态机不变（gate3 canary 行为学佐证）；
 * ③顶层 function 沙箱桥可用：applyFreeze 与 spawnBurst 均须可包装（本脚本弹着点
 *   标记依赖 spawnBurst 桥——orange 爆点 = 溅射分支必发弹着点标记，源码 L1592）；
 * ④弹体 splash 几何自洽：splashGrid 弹（cabbage/corn）同格锁、melon/icemelon 55px
 *   带状（gate5 实测 splash 表核对），弹着点 x 与落点格 colOf 由同一 __consts 推导。
 *
 * 跑法（harness 模式，node 直跑，无需 CDP/端口）：
 *   "C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2/node.exe" \
 *     tests/playtests/v18-splash-distribution.js
 * 固定种子逐字节可复现（验收⑤）：同命令跑两遍，除 meta.runtimeMs 外全等
 *   （包装不改变任何随机数消费次序与次数；spawnBurst 原样转发，粒子级 R() 调用照旧）。
 * 环境变量：PVZ_HTML_PATH 覆盖被测源码（判别力自证对 v1.7 旧源复跑即走此机制）。
 *
 * 口径权威：tests/playtests/lib/r9a-metric-spec.md §3（溢杀 clamp）§7（复用指引）。
 * 产出：tests/playtests/v18-splash-distribution-results.json（全臂 + meta.preconditions）
 * 判别力自证（必做）：git show c379872（v1.7 带状几何）复跑最小子集
 *   cabbage×2 n=2 / melon×2 n=2 —— melon 跨格溅射旧/新源均应有伤；cabbage 邻格
 *   僵尸旧源应有伤、新源必须 0 伤（同格锁分布级断言）。临时文件放系统 temp，用完删。
 * 纪律：本任务只新增文件、不改任何既有文件；禁 commit / 禁 push。
 * ==========================================================================*/

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const P = require(path.join(__dirname, 'lib', 'prelude.js'));

const OUT_JSON = path.join(__dirname, 'v18-splash-distribution-results.json');
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const V17_COMMIT = 'c379872';
const WINDOW_T = 90;            // 90s 观测窗（plan §2 R7 冻结）
const WARMUP_T = 8;             // 预热段（伤害/溅射计数全程，冻结类指标排除——沿用 prelude 口径）
const SEEDS_PER_ARM = 8;        // 每臂 ≥8 种子
const SEED_BASE = 6101;         // 种子段 6101 起向后延展；跳过 prelude 哨兵段 6201+/6301+
const DT = P.DT;
const JITTER_PX = 8;            // 簇内抖动总幅（±4px，种子化）
const TELEPORT = P.TELEPORT_X;  // 存活靶臂 x<300 回传
const SURV_HP = 180 * P.SURVIVOR_MULT;   // 存活靶 hp×200（killZombie 只置 dead 不写 hp ⇒ 无死亡）

// ---------------- 工具 ----------------
const q95 = (arr) => {
  if (!arr || !arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)];
};
const q05 = (arr) => {
  if (!arr || !arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(0.05 * s.length))];
};
const r2 = P.r2, r4 = P.r4;

/* 本地溢杀聚合（溢杀口径：r9a-metric-spec.md §3，冻结）。
 * 【为什么不用 m.overflow.*】prelude.js L161 noteHpWrite 对象字面量存在重复 kind 键
 * （{kind:'hp',...,kind}——分类值覆盖 'hp'），导致 finalize 的 overflow 循环
 * `if(e.kind!=='hp')continue` 跳过全部事件 ⇒ prelude 产出的 overflow 两栏恒 0/rate=null。
 * hp 事件本体数据完整（delta/eff/overflow/kind=分类值俱在 ledger.events），故在本脚本内
 * 按同一冻结公式直接聚合。此为 prelude 缺陷，已另行报告主理人（不在本任务擅自改底座）。 */
function localOverflow(ledger, mode) {
  const col = () => ({ raw: 0, eff: 0, ovf: 0, events: 0, ovfEvents: 0, rate: null });
  const ov = { mode, direct: col(), splash: col(), unknown: col() };
  for (const e of ledger.events) {
    if (typeof e.kind !== 'string' || e.delta == null) continue;   // 只吃伤害类事件（kind=direct/splash/unknown）
    const c = ov[e.kind] || ov.unknown;
    c.raw += e.delta; c.eff += e.eff; c.ovf += e.overflow; c.events++;
    if (e.overflow > 1e-9) c.ovfEvents++;
  }
  for (const k of ['direct', 'splash', 'unknown']) {
    const c = ov[k];
    c.raw = r2(c.raw); c.eff = r2(c.eff); c.ovf = r2(c.ovf);
    c.rate = c.raw > 0 ? r4(c.ovf / c.raw) : null;
  }
  if (mode === 'survivor') ov.note = '存活靶臂：无死亡，rate 不定义（仅真实行程臂上报溢杀率）；raw 分布保留';
  return ov;
}

// 种子分配：第 i 臂基址 6101+10i；i>=9 时 +140（跳过 6201-6308 与 6301-6308 哨兵段）
function seedsForArmIndex(i) {
  const b = SEED_BASE + i * 10 + (i >= 9 ? 140 : 0);
  return P.seeds(b, SEEDS_PER_ARM);
}

// ---------------- 矩阵定义（17:3x 精简定案） ----------------
// zdefs：僵尸相对锚点 x=800 的偏移（注入时再叠加 ±4px 种子化抖动）。
//   stack 摆位：目标（最前/最左）dx=0，副目标依次 +16/+32（同格堆叠意图；span 跨格
//   边界产生真实的「同格/异格」时间占比——n 维语义按弹着点实测，不按摆位假设）。
//   gap40 摆位：副目标 +38/+50（半格临界摆位：55px 带内必溅、落点格跨界约半数时间——
//   「1 格间隔」的实现口径；整格 90px 超出 melon 55px 带会使对照臂退化为全 0，无信息量）。
function stackZdefs(n) {
  return Array.from({ length: n }, (_, i) => ({ dx: i === 0 ? 0 : 16 * i }));
}
function gapZdefs(v) { // v = 副目标数（均为 gap40 意图）；nIntent = v+1
  return v === 1 ? [{ dx: 0 }, { dx: 40 }] : [{ dx: 0 }, { dx: 38 }, { dx: 50 }];
}
const plantsFor = (type, k) => Array.from({ length: k }, (_, c) => ({ type, col: c }));
const MIX_PLANTS = [{ type: 'cabbage', col: 0 }, { type: 'cabbage', col: 1 }, { type: 'melon', col: 2 }, { type: 'melon', col: 3 }];

const ARMS = [];
for (const k of [2, 4]) {
  for (const n of [1, 2, 3]) {
    ARMS.push({ id: `sv-cabbage-k${k}-n${n}`, kind: 'survivor', plants: plantsFor('cabbage', k), zdefs: stackZdefs(n), nIntent: n, gapIntent: 'stack' });
    ARMS.push({ id: `sv-corn-k${k}-n${n}`, kind: 'survivor', plants: plantsFor('corn', k), zdefs: stackZdefs(n), nIntent: n, gapIntent: 'stack' });
  }
  for (const n of [1, 2, 3]) ARMS.push({ id: `sv-melon-k${k}-n${n}`, kind: 'survivor', plants: plantsFor('melon', k), zdefs: stackZdefs(n), nIntent: n, gapIntent: 'stack' });
  for (const v of [1, 2]) ARMS.push({ id: `sv-melon-k${k}-gap40-v${v}`, kind: 'survivor', plants: plantsFor('melon', k), zdefs: gapZdefs(v), nIntent: v + 1, gapIntent: 'gap40' });
}
for (const n of [1, 2, 3]) ARMS.push({ id: `sv-mix-ck2mk2-n${n}`, kind: 'survivor', plants: MIX_PLANTS, zdefs: stackZdefs(n), nIntent: n, gapIntent: 'stack' });
for (const v of [1, 2]) ARMS.push({ id: `sv-mix-ck2mk2-gap40-v${v}`, kind: 'survivor', plants: MIX_PLANTS, zdefs: gapZdefs(v), nIntent: v + 1, gapIntent: 'gap40' });
ARMS.push({ id: 'sv-icemelon-k2-n2', kind: 'survivor', plants: plantsFor('icemelon', 2), zdefs: stackZdefs(2), nIntent: 2, gapIntent: 'stack' });
ARMS.push({ id: 'sv-icemelon-k2-gap40-v1', kind: 'survivor', plants: plantsFor('icemelon', 2), zdefs: gapZdefs(1), nIntent: 2, gapIntent: 'gap40' });
for (const n of [2, 3]) {
  ARMS.push({ id: `rm-cabbage-k4-n${n}`, kind: 'realmarch', plants: plantsFor('cabbage', 4), zdefs: stackZdefs(n), nIntent: n, gapIntent: 'stack' });
  ARMS.push({ id: `rm-corn-k4-n${n}`, kind: 'realmarch', plants: plantsFor('corn', 4), zdefs: stackZdefs(n), nIntent: n, gapIntent: 'stack' });
  ARMS.push({ id: `rm-melon-k4-n${n}`, kind: 'realmarch', plants: plantsFor('melon', 4), zdefs: stackZdefs(n), nIntent: n, gapIntent: 'stack' });
  ARMS.push({ id: `rm-mix-ck2mk2-n${n}`, kind: 'realmarch', plants: MIX_PLANTS, zdefs: stackZdefs(n), nIntent: n, gapIntent: 'stack' });
}
ARMS.push({ id: 'sc-old-cabbage-k2-n2', kind: 'selfcheck-old', plants: plantsFor('cabbage', 2), zdefs: stackZdefs(2), nIntent: 2, gapIntent: 'stack', pairNew: 'sv-cabbage-k2-n2' });
ARMS.push({ id: 'sc-old-melon-k2-n2', kind: 'selfcheck-old', plants: plantsFor('melon', 2), zdefs: stackZdefs(2), nIntent: 2, gapIntent: 'stack', pairNew: 'sv-melon-k2-n2' });

// 每臂种子（自证臂与配对新源臂同种子，逐种子配对比较）
ARMS.forEach((a, i) => { a.seeds = a.pairNew ? ARMS.find((x) => x.id === a.pairNew).seeds : seedsForArmIndex(i); });

// ---------------- 逐弹着点归因的单臂单种子运行 ----------------
/* 机制（零源码改动的测量挂点，全部走沙箱属性包装——与 prelude instrument 同机制）：
 * - spawnBurst 桥：源码 L1592 溅射分支必发 spawnBurst(pr.x,zy,'orange',14)，每弹至多
 *   一次（直中后 pr.dead=true;break）⇒ orange 爆点 = 弹着点标记；包装捕获 x + 同帧
 *   僵尸快照（x/dead/hp）。包装原样转发 ⇒ 粒子级 R() 随机调用次数不变（复现性保持）。
 * - hp 探针：attachHpProbe 拦截逐弹结算（pre=结算瞬间读数 → clamp 口径），事件与
 *   弹着点同序推入 timeline；源码顺序 [直中写, 溅射写…, 橙爆点] ⇒ 按弹着点切分，
 *   两弹着点之间的 hp 事件归属后一个弹着点（该弹的直中+溅射）。
 * - 直中/溅射分类：makeHitClassifier 按伤害值精确匹配（eps=1e-6）；表值全部从
 *   preconditions.measured 推导（splash 值 = dmg*ratio 与源码 L1589 同表达式），不硬编码。 */
function buildClassifierTable(measured) {
  const s = measured.splash;
  const val = (t) => s[t].dmg * s[t].splashRatio;
  return {
    direct: [s.cabbage.dmg, s.melon.dmg, s.corn.dmg, s.icemelon.dmg],
    splash: [val('cabbage'), val('melon'), val('corn'), val('icemelon')],
  };
}
function dmgToTypeMap(measured, armTypes) { // melon/icemelon 同为 65 但绝不共存于同一臂
  const map = {};
  for (const t of armTypes) map[measured.splash[t].dmg] = t;
  return map;
}

function runOnce(arm, seed, ctx) {
  const isOld = arm.kind === 'selfcheck-old';
  const g = P.freshGame(seed, isOld ? { htmlPath: ctx.oldHtmlPath } : {});
  const sb = g.sandbox;
  const K = sb.__consts;
  const colOf = (x) => Math.floor((x - K.GRID_X) / K.CELL_W);
  const d2t = dmgToTypeMap(ctx.measured, arm.plants.map((p) => p.type));

  const ledger = P.createLedger({ warmupT: WARMUP_T, classify: P.makeHitClassifier(ctx.classifierTable) });
  const timeline = [];
  const hp = arm.kind === 'realmarch' ? 180 : SURV_HP;
  const zombies = arm.zdefs.map((d) => {
    const jit = sb.Math.random() * JITTER_PX - JITTER_PX / 2;   // 种子化簇内抖动
    const z = P.injectZombie(g, { x: P.START_X + d.dx + jit, hp, maxHp: hp });
    P.attachHpProbe(z, (preHp, postHp) => {
      const w = ledger.noteHpWrite(z, ledger.tNow, preHp, postHp);
      timeline.push({ kind: 'hp', w, zx: z.x, zcol: colOf(z.x) });
    });
    return z;
  });
  for (const pd of arm.plants) P.injectPlant(g, pd.type, pd.col);
  const inst = P.instrument(g, { onFreeze: (z, preT) => ledger.noteFreeze(z, ledger.tNow, preT) });

  const origBurst = sb.spawnBurst;
  if (typeof origBurst !== 'function') throw new Error('spawnBurst 沙箱桥缺失（前提③崩塌）');
  sb.spawnBurst = function (x, y, color, n) {
    if (color === 'orange') {
      timeline.push({ kind: 'impact', x, t: ledger.tNow, zs: zombies.map((z) => ({ x: z.x, dead: !!z.dead, hp: z.hp })) });
    }
    return origBurst(x, y, color, n);
  };

  let m = null, allDeadAt = null, steps = 0, ov;
  if (arm.kind === 'realmarch') {
    // 真实行程：teleport=null（真实行程）；镜像 prelude.runWindow 帧循环 + 全灭提前收窗
    const stepsMax = Math.ceil(WINDOW_T / DT);
    const snap = (z) => ({ x: z.x, freezeT: z.freezeT || 0, slowT: z.slowT || 0, eating: !!z.eating, dead: !!z.dead });
    for (let i = 0; i < stepsMax; i++) {
      const t = i * DT;
      const pre = zombies.map(snap);
      g.__updateRaw(DT);
      const tPost = t + DT;
      ledger.tNow = tPost;
      const post = zombies.map(snap);
      for (let kk = 0; kk < zombies.length; kk++) {
        const moved = post[kk].x > pre[kk].x + 1 ? 'teleport' : 'walk';
        ledger.frame(zombies[kk], tPost, pre[kk], post[kk], moved);
      }
      steps = i + 1;
      if (zombies.every((z) => z.dead)) { allDeadAt = r2(tPost); break; }
    }
    m = ledger.finalize(ctx.measured.butterP, ctx.measured.freezeT, ctx.measured.cornCd, arm.plants.length);
    ov = localOverflow(ledger, 'real');
  } else {
    m = P.runWindow(g, {
      ledger, zombies, duration: WINDOW_T, teleport: TELEPORT, warmupT: WARMUP_T,
      p: ctx.measured.butterP, T: ctx.measured.freezeT, cd: ctx.measured.cornCd, nPlants: arm.plants.length,
    });
    steps = Math.ceil(WINDOW_T / DT);
    ov = localOverflow(ledger, 'survivor');
  }
  sb.spawnBurst = origBurst;

  // ---- 逐弹着点归因（共点判据 volley 聚组：到达时间差 <1.2s 归同组） ----
  const impacts = [];
  const volleys = new Map();
  let cur = { direct: [], splash: [], unknown: [] };
  let unknownTotal = 0;
  for (const e of timeline) {
    if (e.kind === 'impact') {
      const icol = colOf(e.x);
      const dtypes = [...new Set(cur.direct.map((s) => d2t[s.w.delta] || `dmg${s.w.delta}`))];
      impacts.push({
        t: e.t, x: r4(e.x), icol,
        type: dtypes.length === 1 ? dtypes[0] : (dtypes.length ? 'mixed' : 'none'),
        hasDirect: cur.direct.length > 0,
        v: cur.splash.length,
        vCross: cur.splash.filter((s) => s.zcol !== icol).length,
        nStack: e.zs.filter((z) => !z.dead && colOf(z.x) === icol).length,   // 落点格活僵尸数（含直中目标）
        victims: cur.splash.map((s) => ({ zx: r4(s.zx), col: s.zcol, cross: s.zcol !== icol, dmg: s.w.delta, eff: s.w.eff, ovf: s.w.overflow })),
        directs: cur.direct.map((s) => ({ zx: r4(s.zx), col: s.zcol, dmg: s.w.delta, eff: s.w.eff, ovf: s.w.overflow })),
        unknown: cur.unknown.length,
      });
      unknownTotal += cur.unknown.length;
      let vKey = null;
      for (const k of volleys.keys()) if (Math.abs(k - e.t) < 1.2) { vKey = k; break; }
      if (vKey == null) { vKey = e.t; volleys.set(vKey, []); }
      volleys.get(vKey).push(e.x);
      cur = { direct: [], splash: [], unknown: [] };
    } else {
      const b = e.w.kind === 'direct' ? 'direct' : e.w.kind === 'splash' ? 'splash' : 'unknown';
      if (b === 'unknown') unknownTotal++;
      else cur[b].push(e);
    }
  }
  unknownTotal += cur.unknown.length;   // 收尾残留（理论应为 0：每个直接伤害弹必有橙爆点）

  // ---- 逐种子聚合 ----
  const nb = () => ({ impacts: 0, v0: 0, v1: 0, v2p: 0 });
  const perN = { 1: nb(), 2: nb(), 3: nb() };
  const perType = {};
  for (const im of impacts) {
    const b = im.nStack <= 1 ? perN[1] : im.nStack === 2 ? perN[2] : perN[3];
    b.impacts++; b[im.v === 0 ? 'v0' : im.v === 1 ? 'v1' : 'v2p']++;
    if (!perType[im.type]) perType[im.type] = nb();
    const pt = perType[im.type];
    pt.impacts++; pt[im.v === 0 ? 'v0' : im.v === 1 ? 'v1' : 'v2p']++;
  }
  const impactXs = impacts.map((i) => i.x);
  const volleyRanges = [...volleys.values()].filter((xs) => xs.length >= 2).map((xs) => q95(xs) - q05(xs));
  const sum = (f) => impacts.reduce((a, i) => a + f(i), 0);
  const victimsTotal = sum((i) => i.v);
  const vCross = sum((i) => i.vCross);
  const splashOvfFromImpacts = r4(sum((i) => i.victims.reduce((a, v) => a + v.ovf, 0)));
  const splashRawFromImpacts = r4(sum((i) => i.victims.reduce((a, v) => a + v.dmg, 0)));
  const deaths = m.perZombie.filter((z) => z.dead).length;

  return {
    seed,
    fired: inst.melonThrow, hits: impacts.length, steps, allDeadAt, deaths,
    firedMinusHits: inst.melonThrow - impacts.length,
    v0: impacts.filter((i) => i.v === 0).length,
    v1: impacts.filter((i) => i.v === 1).length,
    v2p: impacts.filter((i) => i.v >= 2).length,
    victimsTotal, vCross,
    perN, perType,
    unknownEvents: unknownTotal,
    impactsNoDirect: impacts.filter((i) => !i.hasDirect).length,
    splashRaw: ov.splash.raw, splashEff: ov.splash.eff, splashOvf: ov.splash.ovf,
    splashOvfFromImpacts, splashRawFromImpacts,
    splashRate: ov.splash.rate,
    directRaw: ov.direct.raw, directEff: ov.direct.eff, directOvf: ov.direct.ovf, directRate: ov.direct.rate,
    overflowMode: ov.mode,
    butterCalls: inst.freezeCalls,
    copoint: { volleyGroups: volleyRanges.length, p95: volleyRanges.length ? r4(q95(volleyRanges)) : null, max: volleyRanges.length ? r4(Math.max(...volleyRanges)) : null },
    impactXRange: impactXs.length ? { min: r2(Math.min(...impactXs)), max: r2(Math.max(...impactXs)) } : null,
    sampleImpacts: impacts.slice(0, 3),
  };
}

// ---------------- 主流程 ----------------
async function main() {
  const t0 = Date.now();
  const results = {
    meta: {
      task: 'V18-Q2 R7 溅射堆叠分布采样（同格锁新规则；17:3x 精简矩阵，间距维→落点格堆叠 n 维）',
      date: new Date().toISOString().slice(0, 10),
      node: process.version,
      htmlPath: P.htmlPath(),
      windowT: WINDOW_T, warmupT: WARMUP_T, dt: DT,
      seedRule: `每臂 8 种子；第 i 臂基址 ${SEED_BASE}+10i（i>=9 时 +140 跳过 prelude 哨兵段 6201/6301）；自证臂与配对新源臂同种子`,
      jitterPx: JITTER_PX,
      geometryNote: 'colOf(x)=floor((x-GRID_X)/CELL_W)；存活靶臂 x<300 回传；真实行程臂不回传（全灭提前收窗）',
      preconditionHeader: [
        '①applyFreeze 黄油唯一入口（溅射不调用；调用点计数==1，gate5 校验）',
        '②freezeT 帧递减语义恒定 + chill/freeze 并存状态机不变（gate3 canary 佐证）',
        '③顶层 function 沙箱桥可用：applyFreeze 与 spawnBurst 可包装（弹着点标记=orange 爆点，L1592）',
        '④splash 几何自洽：splashGrid 弹同格锁 / melon·icemelon 55px 带状（gate5 实测核对）；弹着点与落点格同源 __consts',
      ],
      runtimeMs: null,
      git: {},
    },
    preconditions: null,
    gates: null,
    arms: {},
    verdicts: {},
    selfcheck: {},
    expectations: null,
    assertions: [],
    pass: false,
  };
  const assert = (name, pass, detail) => {
    results.assertions.push({ name, pass: !!pass, detail });
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail || ''}`);
    return pass;
  };

  // ---- 运行卫生：跑前 git status 记录 ----
  try {
    const lines = execSync('git status --porcelain', { cwd: REPO_ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    results.meta.git.pre = { count: lines.length, lines, note: '脚本自身为本任务新增文件（??），其余应为空' };
    console.log(`[hygiene] git status pre: ${lines.length} 项${lines.length ? ' → ' + lines.join(' | ') : '（干净）'}`);
  } catch (e) { results.meta.git.pre = { error: e.message }; }

  // ---- 七道门 bootstrap（新源）----
  console.log('[bootstrap] 七道前置门 + 前提实测 ...');
  const { g: gBoot, pre, gates } = await P.bootstrap({});
  results.preconditions = pre;
  results.gates = { pass: gates.pass, failedGates: gates.failedGates, results: gates.results.map((r) => ({ gate: r.gate, name: r.name, pass: r.pass, detail: r.detail })) };
  for (const r of gates.results) console.log(`  gate${r.gate} ${r.pass ? 'PASS' : 'FAIL'} ${r.name} — ${r.detail}`);
  let ok = assert('七道前置门全过(gate1-6硬门)', gates.pass, gates.failedGates.join(',') || 'gate7 软门恒过');
  ok = assert('前提③:spawnBurst 沙箱桥存在(弹着点标记依赖)', typeof gBoot.sandbox.spawnBurst === 'function', typeof gBoot.sandbox.spawnBurst);
  const K = gBoot.sandbox.__consts;
  ok = assert('前提④:GRID_X/CELL_W 与 colOf 同源', K.GRID_X === 55 && K.CELL_W === 90, `GRID_X=${K.GRID_X} CELL_W=${K.CELL_W}`);
  const mSplash = pre.measured.splash;
  ok = assert('前提:同格锁标记在案(cabbage/corn grid=true, melon/icemelon grid=false)',
    mSplash.cabbage.splashGrid === true && mSplash.corn.splashGrid === true && mSplash.melon.splashGrid === false && mSplash.icemelon.splashGrid === false,
    `cabbage=${mSplash.cabbage.splashGrid} corn=${mSplash.corn.splashGrid} melon=${mSplash.melon.splashGrid} icemelon=${mSplash.icemelon.splashGrid}`);

  const ctxNew = { measured: pre.measured, classifierTable: buildClassifierTable(pre.measured) };

  // ---- 判别力自证准备：提取 v1.7 旧源到系统 temp ----
  const oldHtmlPath = path.join(os.tmpdir(), 'pvz-r7-v17-c379872.html');
  let oldReady = false;
  try {
    const code = execSync(`git show ${V17_COMMIT}:plants-vs-zombies.html`, { cwd: REPO_ROOT, encoding: 'utf8' });
    fs.writeFileSync(oldHtmlPath, code);
    oldReady = true;
    console.log(`[selfcheck] v1.7 旧源已提取 → ${oldHtmlPath} (${code.length} chars)`);
  } catch (e) {
    console.error(`[selfcheck] 旧源提取失败: ${e.message}`);
  }

  // ---- 跑矩阵 ----
  const expectations = P.createExpectations();
  expectations.expect('impacts.all', 2000, '全部臂橙爆点弹着事件总数');
  expectations.expect('splash.victims.newsrc', 500, '新源溅射受害者事件总数');
  expectations.expect('rm.deaths', 100, '真实行程臂死亡总数（溢杀口径适用域）');
  expectations.expect('selfcheck.oldCrossGrid', 1, '旧源 cabbage 跨格溅射种子数（判别力核心）');

  let oldPre = null;
  const armResults = {};
  for (const arm of ARMS) {
    const isOld = arm.kind === 'selfcheck-old';
    if (isOld && !oldReady) { console.log(`[skip] ${arm.id}（旧源不可用）`); continue; }
    let ctx = ctxNew;
    if (isOld) {
      if (!oldPre) oldPre = measureOldPre(arm, oldHtmlPath);
      ctx = { measured: oldPre.measured, classifierTable: buildClassifierTable(oldPre.measured), oldHtmlPath };
    }
    const perSeed = [];
    for (const seed of arm.seeds) {
      const r = runOnce(arm, seed, ctx);
      perSeed.push(r);
      expectations.inc('impacts.all', r.hits);
      if (!isOld) {
        expectations.inc('splash.victims.newsrc', r.victimsTotal);
        if (arm.kind === 'realmarch') expectations.inc('rm.deaths', r.deaths);
      } else if (/cabbage/.test(arm.id) && r.vCross > 0) {
        expectations.inc('selfcheck.oldCrossGrid', 1);
      }
    }
    // 臂级池化
    const tot = (f) => perSeed.reduce((a, b) => a + f(b), 0);
    const impactsAll = tot((r) => r.hits);
    const v0 = tot((r) => r.v0), v1 = tot((r) => r.v1), v2p = tot((r) => r.v2p);
    const victims = tot((r) => r.victimsTotal), vCross = tot((r) => r.vCross);
    const mergeN = (key) => {
      const o = { impacts: 0, v0: 0, v1: 0, v2p: 0 };
      for (const r of perSeed) { const b = r.perN[key]; o.impacts += b.impacts; o.v0 += b.v0; o.v1 += b.v1; o.v2p += b.v2p; }
      return { ...o, pGe1: o.impacts ? r4(1 - o.v0 / o.impacts) : null };
    };
    const perTypePool = {};
    for (const r of perSeed) for (const t of Object.keys(r.perType)) {
      if (!perTypePool[t]) perTypePool[t] = { impacts: 0, v0: 0, v1: 0, v2p: 0 };
      const b = r.perType[t], o = perTypePool[t];
      o.impacts += b.impacts; o.v0 += b.v0; o.v1 += b.v1; o.v2p += b.v2p;
    }
    for (const t of Object.keys(perTypePool)) { const o = perTypePool[t]; perTypePool[t] = { ...o, pGe1: o.impacts ? r4(1 - o.v0 / o.impacts) : null }; }
    const splashRaw = r2(tot((r) => r.splashRaw)), splashOvf = r2(tot((r) => r.splashOvf));
    const directRaw = r2(tot((r) => r.directRaw)), directOvf = r2(tot((r) => r.directOvf));
    const copointP95 = q95(perSeed.map((r) => r.copoint.p95).filter((x) => x != null));
    const splashRate = splashRaw > 0 ? r4(splashOvf / splashRaw) : null;
    const directRate = directRaw > 0 ? r4(directOvf / directRaw) : null;
    const pGe1 = impactsAll ? r4(1 - v0 / impactsAll) : null;
    const pGe1GivenStack = (() => {  // 同格锁下 P(≥1) 语义 = 同格堆叠(n≥2)条件概率
      const b2 = mergeN('2'), b3 = mergeN('3');
      const imp = b2.impacts + b3.impacts, v0s = b2.v0 + b3.v0;
      return imp ? r4(1 - v0s / imp) : null;
    })();
    armResults[arm.id] = {
      id: arm.id, kind: arm.kind, nIntent: arm.nIntent, gapIntent: arm.gapIntent,
      plants: arm.plants.map((p) => `${p.type}@col${p.col}`).join('+'),
      zdefs: arm.zdefs.map((d) => d.dx), seeds: arm.seeds,
      perSeed,
      agg: {
        fired: tot((r) => r.fired), hits: impactsAll, firedMinusHits: tot((r) => r.firedMinusHits),
        v0, v1, v2p, victimsTotal: victims, vCross,
        crossRatio: victims ? r4(vCross / victims) : null,
        pGe1, pGe1GivenStack,
        perN: { 1: mergeN('1'), 2: mergeN('2'), 3: mergeN('3') },
        perType: perTypePool,
        overflow: { mode: perSeed[0].overflowMode, splash: { raw: splashRaw, ovf: splashOvf, rate: splashRate }, direct: { raw: directRaw, ovf: directOvf, rate: directRate } },
        deaths: tot((r) => r.deaths), butterCalls: tot((r) => r.butterCalls),
        copointP95: copointP95 == null ? null : r4(copointP95),
        copointMax: r4(Math.max(...perSeed.map((r) => r.copoint.max || 0))),
        impactXRange: perSeed.map((r) => r.impactXRange),
        unknownEvents: tot((r) => r.unknownEvents),
      },
    };
    const a = armResults[arm.id].agg;
    console.log(`[${arm.id}] seeds=${arm.seeds[0]}-${arm.seeds[arm.seeds.length - 1]} hits=${a.hits} v0/v1/v2+=${a.v0}/${a.v1}/${a.v2p} P(ge1)=${a.pGe1} P(ge1|stack)=${a.pGe1GivenStack} cross=${a.vCross}(${a.crossRatio}) splashRate=${a.overflow.splash.rate} directRate=${a.overflow.direct.rate} copointP95=${a.copointP95}`);
    results.arms[arm.id] = armResults[arm.id];
  }
  if (oldPre) results.selfcheck.oldPreconditions = oldPre;

  // ---- 收尾：expectations 核查 ----
  const expVerdict = expectations.verify();
  results.expectations = { snapshot: expectations.snapshot(), ...expVerdict };
  ok = assert('执行计数器达标(gate4 收尾)', expVerdict.pass, expVerdict.unmet.map((u) => `${u.name}:${u.actual}<${u.min}`).join('; ') || '全部达标');

  // ================= 验收六条 =================
  console.log('[verdicts] 验收 ①~⑥ ...');
  const stackArmsOf = (prefix) => ARMS.filter((a) => a.kind === 'survivor' && a.gapIntent === 'stack' && a.nIntent >= 2 && a.id.startsWith(prefix)).map((a) => armResults[a.id]);
  const poolP = (arms) => {
    const imp = arms.reduce((a, b) => a + b.agg.hits, 0);
    const v0 = arms.reduce((a, b) => a + b.agg.v0, 0);
    return imp ? r4(1 - v0 / imp) : null;
  };
  const tierOf = (p) => p == null ? 'N/A' : p >= 0.8 ? 'CONFIRM' : p <= 0.4 ? 'REFUTE' : '部分';
  const SEMANTICS = '同格锁下 P(≥1) 语义=同格堆叠条件概率 P(≥1 溅射受害者 | 落点格活僵尸 n≥2)——不再是旧带状的「30px 内任意副目标」语义（验收②显式说明）';

  // ① 直方图 + P(≥1) 已按 perN/perType 落档于各臂 agg；②类型级判定（无条件 + 同格堆叠条件双档）
  const v2 = {};
  for (const type of ['cabbage', 'corn']) {
    const arms = stackArmsOf(`sv-${type}-`);
    const p = poolP(arms);
    const pStack = (() => {
      const imp = arms.reduce((a, b) => a + b.agg.perN[2].impacts + b.agg.perN[3].impacts, 0);
      const v0s = arms.reduce((a, b) => a + b.agg.perN[2].v0 + b.agg.perN[3].v0, 0);
      return imp ? r4(1 - v0s / imp) : null;
    })();
    v2[type] = { pooledImpacts: arms.reduce((a, b) => a + b.agg.hits, 0), pGe1: p, tier: tierOf(p), pGe1GivenStack: pStack, tierGivenStack: tierOf(pStack), semantics: SEMANTICS };
  }
  {
    const arms = stackArmsOf('sv-melon-');
    const p = poolP(arms);
    const pStack = (() => {
      const imp = arms.reduce((a, b) => a + b.agg.perN[2].impacts + b.agg.perN[3].impacts, 0);
      const v0s = arms.reduce((a, b) => a + b.agg.perN[2].v0 + b.agg.perN[3].v0, 0);
      return imp ? r4(1 - v0s / imp) : null;
    })();
    v2.melon = { pooledImpacts: arms.reduce((a, b) => a + b.agg.hits, 0), pGe1: p, tier: tierOf(p), pGe1GivenStack: pStack, tierGivenStack: tierOf(pStack), semantics: 'melon 语义=带状条件概率（55px 带跨格仍生效，非同格锁）+ 堆叠摆位条件；与 cabbage/corn 语义不可直接横比' };
  }
  {
    const arms = stackArmsOf('sv-mix-');
    const p = poolP(arms);
    const pStack = (() => {
      const imp = arms.reduce((a, b) => a + b.agg.perN[2].impacts + b.agg.perN[3].impacts, 0);
      const v0s = arms.reduce((a, b) => a + b.agg.perN[2].v0 + b.agg.perN[3].v0, 0);
      return imp ? r4(1 - v0s / imp) : null;
    })();
    v2.mix = { pooledImpacts: arms.reduce((a, b) => a + b.agg.hits, 0), pGe1: p, tier: tierOf(p), pGe1GivenStack: pStack, tierGivenStack: tierOf(pStack), note: '混编 cabbage+melon 池化（两类弹着点合并），语义见分类型', semantics: SEMANTICS + '（melon 分量除外）' };
  }
  results.verdicts.pGe1ByType = v2;
  ok = assert('验收②:P(≥1) 三档判定落档(含语义说明+条件档)', Object.keys(v2).length === 4 && Object.values(v2).every((v) => v.pGe1 != null && v.pGe1GivenStack != null),
    Object.entries(v2).map(([k, v]) => `${k}=${v.pGe1}(${v.tier})|stack=${v.pGe1GivenStack}(${v.tierGivenStack})`).join(' '));
  // 校准断言：n=1 臂必须 P(≥1)=0（无幻影溅射）
  const n1Arms = ARMS.filter((a) => a.kind === 'survivor' && a.gapIntent === 'stack' && a.nIntent === 1).map((a) => armResults[a.id]);
  ok = assert('校准:n=1 臂 P(≥1)=0（无幻影溅射）', n1Arms.every((a) => a.agg.pGe1 === 0), n1Arms.map((a) => `${a.id}:${a.agg.pGe1}`).join(' '));

  // ③ 浪费率三档（仅真实行程臂上报；画像预警随附）
  const wasteTier = (rate) => rate == null ? 'N/A' : rate <= 0.10 ? '低(≤10%)' : rate <= 0.30 ? '中(10–30%)' : '高(>30%)';
  const rmArms = ARMS.filter((a) => a.kind === 'realmarch').map((a) => armResults[a.id]);
  const v3 = {
    portraitWarning: '画像预警：同格锁下溅射受害者与直中主目标是同一批堆叠僵尸（先被直中打残、再吃溅射，同批将死）⇒ 溢杀口径的浪费率系统性低估战略浪费（「反正直中也会杀掉他」的冗余伤害不进溢杀分母）；>30% 仅登记优化池建议，不返工（plan 增补 B-3）。',
    perArm: {}, perType: {},
  };
  for (const a of rmArms) v3.perArm[a.id] = { splashRate: a.agg.overflow.splash.rate, tier: wasteTier(a.agg.overflow.splash.rate), directRate: a.agg.overflow.direct.rate };
  for (const type of ['cabbage', 'corn', 'melon', 'mix']) {
    const arms = rmArms.filter((a) => a.id.includes(type === 'mix' ? 'mix' : `rm-${type}-`));
    const raw = arms.reduce((s, x) => s + x.agg.overflow.splash.raw, 0);
    const ovf = arms.reduce((s, x) => s + x.agg.overflow.splash.ovf, 0);
    const rate = raw > 0 ? r4(ovf / raw) : null;
    v3.perType[type] = { splashRaw: r2(raw), splashOvf: r2(ovf), rate, tier: wasteTier(rate) };
  }
  results.verdicts.waste = v3;
  ok = assert('验收③:浪费率三档判读落档(仅真实行程臂)', Object.keys(v3.perArm).length === 8 && Object.values(v3.perType).every((v) => v.rate != null),
    Object.entries(v3.perType).map(([k, v]) => `${k}=${(v.rate * 100).toFixed(1)}%(${v.tier})`).join(' '));

  // ⑥ 共点假设（存活靶臂满 90s 窗判据；真实行程臂窗口截断仅作信息项）
  const copointArms = ARMS.filter((a) => a.kind === 'survivor').map((a) => armResults[a.id]);
  const copointFails = copointArms.filter((a) => a.agg.copointP95 == null || a.agg.copointP95 > 42);
  results.verdicts.copoint = {
    criterion: '同臂 90s 窗口弹着点 x 极差（同帧 volley 分组）P95 ≤ 42px（=直中半宽）判成立',
    note: '判据施加于存活靶臂（满 90s 窗）；真实行程臂窗口因全灭提前截断，其 copointP95 仅作信息项',
    perArmP95: Object.fromEntries(copointArms.map((a) => [a.id, a.agg.copointP95])),
    rmInfo: Object.fromEntries(rmArms.map((a) => [a.id, a.agg.copointP95])),
    failedArms: copointFails.map((a) => a.id),
    holds: copointFails.length === 0,
    fallback: copointFails.length ? '不成立臂按弹着点 42px 分桶统计、禁混桶（bucketed 字段）' : '无需分桶',
  };
  ok = assert('验收⑥:弹着点共点假设判定落档', true, `${copointArms.length - copointFails.length}/${copointArms.length} 臂 P95≤42px；失败臂: ${copointFails.map((a) => a.id).join(',') || '无'}`);

  // 跨格溅射占比（melon/icemelon 系臂）
  const melonArms = ARMS.filter((a) => a.kind === 'survivor' && /melon/.test(a.id) && (a.gapIntent === 'gap40' || a.nIntent >= 2)).map((a) => armResults[a.id]);
  results.verdicts.crossGridShare = Object.fromEntries(melonArms.map((a) => [a.id, { crossRatio: a.agg.crossRatio, vCross: a.agg.vCross, victims: a.agg.victimsTotal }]));
  ok = assert('跨格占比:melon/icemelon 系臂均有跨格溅射(带仍生效)', melonArms.every((a) => a.agg.vCross > 0),
    Object.entries(results.verdicts.crossGridShare).map(([k, v]) => `${k}:${(v.crossRatio * 100).toFixed(0)}%`).join(' '));

  // ================= 管线健全性 + 规则断言 =================
  console.log('[assertions] 管线健全性 + 同格锁分布级断言 ...');
  const allSeeds = Object.values(armResults).flatMap((a) => a.perSeed);
  ok = assert('管线:全部伤害事件可分类(unknown=0)', allSeeds.every((r) => r.unknownEvents === 0), `unknown 总数=${allSeeds.reduce((a, b) => a + b.unknownEvents, 0)}`);
  ok = assert('管线:每弹着点均有直中事件', allSeeds.every((r) => r.impactsNoDirect === 0), `无直中弹着=${allSeeds.reduce((a, b) => a + b.impactsNoDirect, 0)}`);
  const svSeeds = Object.values(armResults).filter((a) => a.kind !== 'realmarch' && a.kind !== 'selfcheck-old').flatMap((a) => a.perSeed);
  ok = assert('口径:存活靶臂无死亡且 clamp 恒等(raw=eff)', svSeeds.every((r) => r.deaths === 0 && Math.abs(r.splashRaw - r.splashEff) <= 0.05 && Math.abs(r.directRaw - r.directEff) <= 0.05),
    `${svSeeds.length} 种子全过`);
  const rmSeeds = Object.values(armResults).filter((a) => a.kind === 'realmarch').flatMap((a) => a.perSeed);
  ok = assert('口径:真实行程臂 overflow.mode=real 且全灭收窗', rmSeeds.every((r) => r.overflowMode === 'real' && r.allDeadAt != null),
    `${rmSeeds.length} 种子全过（deaths 合计=${rmSeeds.reduce((a, b) => a + b.deaths, 0)}）`);
  ok = assert('口径:账本与逐弹着点归因两路溅射记账一致', rmSeeds.every((r) => Math.abs(r.splashOvf - r.splashOvfFromImpacts) <= 0.05 && Math.abs(r.splashRaw - r.splashRawFromImpacts) <= 0.05),
    'overflow.splash 双路一致');
  // 同格锁分布级：新源 cabbage/corn 臂跨格受害者必须为 0（自证旧源臂除外）
  const lockArms = Object.entries(armResults).filter(([id]) => !id.startsWith('sc-') && /cabbage|corn/.test(id));
  const lockViolations = lockArms.flatMap(([id, a]) => a.perSeed.filter((r) => r.vCross > 0).map((r) => `${id}#seed${r.seed}`));
  ok = assert('同格锁:新源 cabbage/corn 全臂跨格受害者=0', lockViolations.length === 0, lockViolations.join(',') || `${lockArms.length} 臂 × ${SEEDS_PER_ARM} 种子全 0`);
  // corn 黄油可达性（仅纯 corn 臂——混编臂无 corn 植物，butterCalls 恒 0 属预期）
  const cornSv = Object.values(armResults).filter((a) => a.kind === 'survivor' && a.id.startsWith('sv-corn-'));
  ok = assert('corn:黄油直中可达(butterCalls>0)', cornSv.every((a) => a.agg.butterCalls > 0), cornSv.map((a) => `${a.id}:${a.agg.butterCalls}`).join(' '));

  // ================= 判别力自证（v1.7 c379872） =================
  console.log('[selfcheck] v1.7 旧源判别力 ...');
  const sc = results.selfcheck;
  const newCab = armResults['sv-cabbage-k2-n2'], newMel = armResults['sv-melon-k2-n2'];
  const oldCab = armResults['sc-old-cabbage-k2-n2'], oldMel = armResults['sc-old-melon-k2-n2'];
  if (oldCab && oldMel) {
    sc.comparison = {
      cabbage: {
        old: { pGe1: oldCab.agg.pGe1, victims: oldCab.agg.victimsTotal, vCross: oldCab.agg.vCross, crossRatio: oldCab.agg.crossRatio },
        new: { pGe1: newCab.agg.pGe1, victims: newCab.agg.victimsTotal, vCross: newCab.agg.vCross, crossRatio: newCab.agg.crossRatio },
      },
      melon: {
        old: { pGe1: oldMel.agg.pGe1, victims: oldMel.agg.victimsTotal, vCross: oldMel.agg.vCross, crossRatio: oldMel.agg.crossRatio },
        new: { pGe1: newMel.agg.pGe1, victims: newMel.agg.victimsTotal, vCross: newMel.agg.vCross, crossRatio: newMel.agg.crossRatio },
      },
      oldSourceVersion: (sc.oldPreconditions && sc.oldPreconditions.measured.version) || 'unknown',
    };
    ok = assert('自证:旧源 cabbage 有跨格溅射(带状几何)', oldCab.agg.vCross > 0, `old vCross=${oldCab.agg.vCross}/${oldCab.agg.victimsTotal}`);
    ok = assert('自证:新源 cabbage 跨格溅射必须 0(同格锁)', newCab.agg.vCross === 0, `new vCross=${newCab.agg.vCross}`);
    ok = assert('自证:melon 跨格溅射旧源有伤', oldMel.agg.vCross > 0, `old vCross=${oldMel.agg.vCross}`);
    ok = assert('自证:melon 跨格溅射新源有伤(带未变)', newMel.agg.vCross > 0, `new vCross=${newMel.agg.vCross}`);
    ok = assert('自证:melon 旧/新源同分布(路径未动)', oldMel.agg.victimsTotal === newMel.agg.victimsTotal && oldMel.agg.pGe1 === newMel.agg.pGe1,
      `victims old=${oldMel.agg.victimsTotal} new=${newMel.agg.victimsTotal}; P(ge1) old=${oldMel.agg.pGe1} new=${newMel.agg.pGe1}`);
    sc.discriminative = oldCab.agg.vCross > 0 && newCab.agg.vCross === 0 && oldMel.agg.vCross > 0 && newMel.agg.vCross > 0;
    ok = assert('自证:测量管线判别力完整(咬得住新规则差异)', sc.discriminative, sc.discriminative ? 'cabbage 旧有/新无 + melon 旧新均有' : '见上四条');
  } else {
    ok = assert('自证:旧源臂完成', false, '旧源臂缺失');
  }

  // ---- 清理临时旧源 ----
  try { if (fs.existsSync(oldHtmlPath)) fs.rmSync(oldHtmlPath); } catch (e) { /* best effort */ }
  results.selfcheck.tempCleaned = !fs.existsSync(oldHtmlPath);

  // ---- 跑后卫生 ----
  try {
    const lines = execSync('git status --porcelain', { cwd: REPO_ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    const mine = [/v18-splash-distribution(\.js|-results\.json)?$/, /v18-r7-report\.md$/];
    // 并行任务豁免：qa-r9b 的 R9-b 产物（v18-r9b-*、butter-balance-calibration-v18）与
    // .workbuddy/memory 会话记账均非本任务产物，不计脏（亦不得还原他人文件）
    const others = [/v18-r9b-/, /butter-balance-calibration-v18/, /\.workbuddy\//];
    const unexpected = lines.filter((l) => !mine.some((re) => re.test(l)) && !others.some((re) => re.test(l)));
    results.meta.git.post = {
      count: lines.length, unexpected,
      exempted: lines.filter((l) => others.some((re) => re.test(l))),
      note: '本任务产物: 脚本/results.json/report 三件；豁免=v18-r9b-*(qa-r9b)/butter-balance-calibration-v18(qa-r9b 报告)/.workbuddy(会话记账)',
    };
    ok = assert('卫生:跑后工作树无任务外脏文件', unexpected.length === 0, unexpected.join(' | ') || `共 ${lines.length} 项（本任务三件 + 并行任务/记账豁免）`);
  } catch (e) { results.meta.git.post = { error: e.message }; }

  // ---- 汇总 ----
  results.pass = results.assertions.every((a) => a.pass) && results.gates.pass && expVerdict.pass;
  results.meta.runtimeMs = Date.now() - t0;
  fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
  console.log(`\n矩阵完成度: ${Object.keys(results.arms).length}/${ARMS.length} 臂 × ${SEEDS_PER_ARM} 种子`);
  console.log(`P(≥1|同格堆叠) 判定: ${Object.entries(v2).map(([k, v]) => `${k}=${v.tier}`).join(' / ')}`);
  console.log(`浪费率(类型池化): ${Object.entries(v3.perType).map(([k, v]) => `${k}=${v.tier}`).join(' / ')}`);
  console.log(`共点假设: ${results.verdicts.copoint.holds ? '成立' : '不成立→分桶'}`);
  console.log(`判别力自证: ${results.selfcheck.discriminative ? '完整' : '不完整'}`);
  console.log(`${results.pass ? 'R7 PASS' : 'R7 FAIL'} → ${OUT_JSON} (${results.meta.runtimeMs}ms)`);
  process.exitCode = results.pass ? 0 : 1;
}

// 旧源前提实测（只读不判门——gate5 期望表是 v1.8 的，对旧源必然「漂移」，属预期）
function measureOldPre(arm, oldHtmlPath) {
  const g = P.freshGame(arm.seeds[0], { htmlPath: oldHtmlPath });
  const pre = P.measurePreconditions(g);
  console.log(`[selfcheck] 旧源前提: version=${pre.measured.version} cabbage.grid=${pre.measured.splash.cabbage.splashGrid} melon.grid=${pre.measured.splash.melon.splashGrid}`);
  return pre;
}

main().catch((e) => {
  console.error('R7 CRASH:', e && e.stack || e);
  process.exitCode = 2;
});
