'use strict';
/* ============================================================================
 * v18-r9b-calibration.js — R9-b 平衡模型理论标定（纯测试+文档任务，源码零改动）
 * ----------------------------------------------------------------------------
 * 任务：production/v1.8-plan.md §2 R9-b + D-1 定稿增补 A（两域分界硬性要求）。
 * 目的：把候选理论式的【系数/形式】在实测锚点上标定，产出带 T≤cd / T>cd 两域
 *       分界的修正公式文档，让下次调参的投影可信。
 *
 * 【隐含前提声明（机器校验于 prelude 七道门 + meta.preconditions，勿只当注释）】
 *   ①applyFreeze 是黄油唯一入口（溅射不调用）——gate5 调用点计数==1 校验；
 *   ②freezeT 帧递减语义恒定——gate3 canary（冻结期位移=0）行为学佐证；
 *   ③chill/freeze 并存状态机不变——gate3 canary（chill 位移 ×0.6）佐证；
 *   ④顶层 function 沙箱桥可用——gate6 自检（applyFreeze 改 const 箭头函数即失效）；
 *   ⑤v1.6 域锚点为【参数覆写重演】而非旧源码重放：p* 走受控 Math.random 门
 *     （哨兵同款）、T* 走 applyFreeze 包装覆写（overrideT）——域等价性由哨兵
 *     双域判别力（A 域刷新恒 0）+ 本脚本 A1 臂 refreshEvents==0 确定性自检背书；
 *   ⑥当前源码为 v1.8.0-wip（T=3.0>cd=2.6 刷新重叠域）；v1.7 域锚点直接在当前
 *     源码上复测（v1.8 源码对黄油冻结路径零改动，gate5 常量快照自证）。
 *
 * 【标定协议（plan §2 R9）】
 *   候选式（全部零自由参数，先验形式）：
 *     F-A 泊松逼近      C = 1−(1−p)^(n·T/cd)          （plan 原文单株：1−(1−p)^(T/cd)）
 *     F-B 连续更新回报  C = n·p·T/(cd + n·p·T)        （plan 原文单株：u=p/(cd+pT)，
 *                                                      覆盖率=u·T=pT/(cd+pT)；多株按
 *                                                      交替更新稳态占空比推广）
 *     F-C M6 式         C = 1−exp(−n·p·T/cd)          （v17 报告 M6 经验拟合；plan 要求
 *                                                      补拟合优度检验 → 本脚本 χ²/R²）
 *   参考式（非标定对象，不参与通过判定，仅供文档分段建议）：
 *     GRID 网格修正模型 C = Σ_k min(T,k·cd)·(1−q)^(k−1)·q / (cd/q)，q=1−(1−p)^n
 *                       ——机制驱动：黄油尝试是确定性 cd 网格+概率掷定（非泊松）；
 *                       T≤cd 域解析退化为线性式 n·p·T/cd。
 *   锚点复测：≥24 种子（本脚本取 48/臂），种子段 7101+ 向后延展（与 R7 的 6101 段
 *   错开，项目种子管理惯例）；历史锚点按其原生口径（覆盖率）复测。
 *   通过判据：某式全锚点 |残差| ≤ ±2pp ⇒ 标定通过；无一通过则如实报告并给
 *   分段式/修正系数建议，禁凑数放宽。
 *
 * 【残差/拟合优度口径登记（D-1 对 F-C 的硬性要求）】
 *   residual = 投影值 − 复测均值（正=高估）；A5（M5 合成）的投影 = 式(n=1) 冻结分量
 *   + 同窗口 chill 实测分量（prelude 口径 chillFrac = slowT>0 且非冻结，与冻结帧按
 *   状态机构造不相交）⇒ union_pred = frozen_pred + chillDisj_meas（加法并集）。
 *   禁用独立并集公式 1−(1−f)(1−s)——那是给重叠口径 slowFrac（含冻结帧）的，
 *   混用会把不相交当独立、系统性虚增残差 ~12pp（首轮实测教训，登记在案）。
 *   拟合优度仅对 4 个纯冻结锚点（A1/A2/A3/A4）：
 *     χ² = Σ(residual/SEM)²，SEM = 复测种子 std/√n；df = 4 − 0 = 4（零拟合参数）；
 *     R² = 1 − Σres² / Σ(y−ȳ)²（ȳ = 4 锚点复测均值）。
 *   有限窗口提示：复测锚点为全窗计量（对齐历史口径，warmup=0），与稳态式比较时
 *   含已知 ~1pp 级窗口偏置（首窗无冻结起点 → 偏正向）；另设 warmup=8s 对照跑
 *   （8 种子/臂）供「有限窗口 vs 稳态」偏差结构分析，不作判据。
 *
 * 跑法（裸 node 不在 PATH，用绝对路径）：
 *   "C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2/node.exe" tests/playtests/v18-r9b-calibration.js
 * 产出：tests/playtests/v18-r9b-calibration-results.json（同目录）
 * 纪律：本任务只新增文件、不改既有文件；禁 commit/ push（落盘即止）。
 * ==========================================================================*/

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const P = require(path.join(__dirname, 'lib', 'prelude.js'));
const { SeededRNG } = require(path.join(__dirname, '..', 'harness', 'index.js'));

const OUT_FILE = path.join(__dirname, 'v18-r9b-calibration-results.json');
const N_SEEDS = 48;          // plan 硬线 ≥24；取 48 压均值标准误（SEM≈1.4pp @ σ≈10pp）
const N_WARM8 = 8;           // warm8 对照跑种子数/臂（信息项）
const PASS_TOL = 0.02;       // 通过判据：|残差| ≤ ±2pp
const REPLAY_GUARD_24 = 0.06; // 复测保真护栏（历史 24 种子锚点，覆盖 ~2σ 抽样带）
const REPLAY_GUARD_8 = 0.08;  // 复测保真护栏（历史 6~8 种子锚点，抽样带更宽）

// ---------------- 历史锚点（出处登记；复测值 vs 历史值=复测保真度，单独上报） ----------------
const HISTORY = {
  A1_v16_single: {
    value: 0.2583, histSeeds: 24, guard: REPLAY_GUARD_24,
    source: 'design/butter-balance-review.md §2 M1（v1.6 源 p=0.25/T=2.5，单 corn vs normal 存活靶，72s×24 种子，严格 frozenFrac 全窗）',
  },
  A2_v17_single: {
    value: 0.3119, histSeeds: 24, guard: REPLAY_GUARD_24,
    source: 'design/butter-balance-review-v17.md §0/§2 M1（v1.7 源 p=0.27/T=3.0，同场景 72s×24 种子）',
  },
  A3_n2: {
    value: 0.5598, histSeeds: 6, guard: REPLAY_GUARD_8,
    source: 'design/butter-balance-review-v17.md §2 M6(a) 存活靶 corn2（地狱 bucket 1008hp×200 存活靶，90s×6 种子，frozenFrac 全窗）',
  },
  A4_n3: {
    value: 0.609, histSeeds: 6, guard: REPLAY_GUARD_8,
    source: 'design/butter-balance-review-v17.md §2 M6(a) 存活靶 corn3（同上 90s×6 种子）',
  },
  A5_m5_union: {
    value: 0.7184, histSeeds: 8, guard: REPLAY_GUARD_8,
    source: 'design/butter-balance-review-v17.md §0/§2 M5 corn+icemelon 合成控制（unionFrac=frozen∪chill，bucket 存活靶，90s×8 种子）',
  },
};

// ---------------- 候选式 + 参考式注册表（零自由参数；口径登记） ----------------
const FORMULAS = {
  'F-A': {
    name: '泊松逼近（plan 候选式 a）',
    formula: 'C = 1−(1−p)^(n·T/cd)',
    note: 'plan 原文单株形式 1−(1−p)^(T/cd)；多株按「窗口 n·T/cd 内 ≥1 次命中（率 n·p/cd 的泊松近似）」推广',
    params: 0,
  },
  'F-B': {
    name: '连续更新回报（plan 候选式 b）',
    formula: 'C = n·p·T/(cd + n·p·T)',
    note: 'plan 原文单株 u=p/(cd+pT)，覆盖率=u·T=pT/(cd+pT)；多株按交替更新过程稳态占空比 T/(T+E[自由段])、E[自由段]=cd/(np)（泊松自由段假设）推广',
    params: 0,
  },
  'F-C': {
    name: 'M6 式（plan 候选式 c）',
    formula: 'C = 1−exp(−n·p·T/cd)',
    note: 'v17 报告 M6 经验拟合式；plan 要求补拟合优度检验口径（本脚本 χ²/df=4/R² 登记）',
    params: 0,
  },
  GRID: {
    name: '网格修正模型（参考式，非标定对象）',
    formula: 'q=1−(1−p)^n; C = [Σ_k min(T,k·cd)·(1−q)^(k−1)·q] / (cd/q)',
    note: '机制驱动：黄油尝试=确定性 cd 网格+概率掷定（源码 L1473，非泊松）；每次命中贡献 min(T, 距下一命中间隔)，命中间隔 k·cd 服从几何分布。T≤cd 域解析退化为线性式 n·p·T/cd（k=1 项起 min 恒=T）。零自由参数；仅供电文档分段建议引用，不参与通过判定',
    params: 0,
    referenceOnly: true,
  },
};

function predFrozen(f, p, T, cd, n) {
  if (f === 'F-A') return 1 - Math.pow(1 - p, (n * T) / cd);
  if (f === 'F-B') return (n * p * T) / (cd + n * p * T);
  if (f === 'F-C') return 1 - Math.exp((-n * p * T) / cd);
  if (f === 'GRID') {
    const q = 1 - Math.pow(1 - p, n);
    // E[贡献/gap] = Σ min(T, k·cd)·(1−q)^(k−1)·q；级数截断 (1−q)^(k−1)<1e-12
    const kMax = 1 + Math.ceil(Math.log(1e-12) / Math.log(Math.max(1 - q, 1e-300)));
    let e = 0;
    for (let k = 1; k <= kMax; k++) e += Math.min(T, k * cd) * Math.pow(1 - q, k - 1) * q;
    return e / (cd / q);
  }
  throw new Error('未知式: ' + f);
}

// ---------------- 场景构造（对齐历史锚点原生场景；存活靶口径） ----------------
const BUCKET_SURV = { hp: Math.round(560 * 1.8) * P.SURVIVOR_MULT, spd: +(12 * 1.3).toFixed(2) }; // 201600 / 15.6（expert bucket，hp×200 存活靶）
const NORMAL_SURV = { hp: 180 * P.SURVIVOR_MULT, spd: 16 };

const ANCHORS = [
  {
    id: 'A1_v16_single', domain: 'T<=cd', nCorn: 1, icemelon: false,
    windowT: 72, zombie: { ...NORMAL_SURV, type: 'normal' },
    pOverride: 0.25, TOverride: 2.5,           // v1.6 域参数覆写（p* 受控随机门 / T* overrideT）
    metric: 'freezeCoverage', seedStart: 7101,
    scenario: '单 corn(col0) vs normal 存活靶 36000hp，72s，teleport=300，全窗计量（对齐历史 M1 无 warmup 口径）',
  },
  {
    id: 'A2_v17_single', domain: 'T>cd', nCorn: 1, icemelon: false,
    windowT: 72, zombie: { ...NORMAL_SURV, type: 'normal' },
    pOverride: null, TOverride: null,          // 当前源码原生参数（gate5 实测 0.27/3.0）
    metric: 'freezeCoverage', seedStart: 7201,
    scenario: '单 corn(col0) vs normal 存活靶 36000hp，72s，teleport=300，全窗计量（当前 v1.8 源码直跑，冻结路径与 v1.7 零差异由 gate5 自证）',
  },
  {
    id: 'A3_n2', domain: 'T>cd', nCorn: 2, icemelon: false,
    windowT: 90, zombie: { ...BUCKET_SURV, type: 'bucket' },
    pOverride: null, TOverride: null,
    metric: 'freezeCoverage', seedStart: 7301,
    scenario: 'corn×2（col0,1 同帧起手同步 cd 网格）vs 地狱 bucket 存活靶 201600hp/15.6，90s，teleport=300（对齐历史 M6(a) 场景）',
  },
  {
    id: 'A4_n3', domain: 'T>cd', nCorn: 3, icemelon: false,
    windowT: 90, zombie: { ...BUCKET_SURV, type: 'bucket' },
    pOverride: null, TOverride: null,
    metric: 'freezeCoverage', seedStart: 7401,
    scenario: 'corn×3（col0,1,2）vs 同上，90s（对齐历史 M6(a) 场景）',
  },
  {
    id: 'A5_m5_union', domain: 'T>cd', nCorn: 1, icemelon: true,
    windowT: 90, zombie: { ...BUCKET_SURV, type: 'bucket' },
    pOverride: null, TOverride: null,
    metric: 'unionFrac', seedStart: 7501,
    scenario: 'corn(col0)+icemelon(col1) vs bucket 存活靶，90s，unionFrac=frozen∪chill（对齐历史 M5 both 臂场景）；投影=式(n=1) 冻结分量 × chill 实测分量独立并集',
  },
];

const SENTINEL_SEEDS = { seedA: 7601, seedB: 7701, nSeeds: 8 }; // 哨兵复跑种子段（与 selftest 默认 6201/6301 错开）

// ---------------- 单锚点复测 ----------------
function runAnchor(cfg, pre, warmupT, nSeeds) {
  const perSeed = [];
  for (const seed of P.seeds(cfg.seedStart, nSeeds)) {
    const g = P.freshGame(seed);
    const sb = g.sandbox;
    if (cfg.pOverride != null) {
      // p* 覆写（哨兵同款）：黄油掷定消费 1 次随机调用 → 以 p* 概率给 0（<0.27 ⇒ butter）否则 0.5
      const rng2 = SeededRNG((seed * 7919 + 13) >>> 0).random;
      sb.Math.random = () => (rng2() < cfg.pOverride ? 0 : 0.5);
    }
    const ledger = P.createLedger({ warmupT });
    const z = P.injectZombie(g, { type: cfg.zombie.type, hp: cfg.zombie.hp, maxHp: cfg.zombie.hp, spd: cfg.zombie.spd });
    for (let i = 0; i < cfg.nCorn; i++) P.injectPlant(g, 'corn', i);
    if (cfg.icemelon) P.injectPlant(g, 'icemelon', 1);
    const cnt = P.instrument(g, {
      overrideT: cfg.TOverride != null ? cfg.TOverride : undefined,
      onFreeze: (zz, preT) => ledger.noteFreeze(zz, ledger.tNow, preT),
    });
    const pUsed = cfg.pOverride != null ? cfg.pOverride : pre.measured.butterP;
    const TUsed = cfg.TOverride != null ? cfg.TOverride : pre.measured.freezeT;
    const cdUsed = pre.measured.cornCd;
    const m = P.runWindow(g, {
      ledger, zombies: [z], duration: cfg.windowT, teleport: P.TELEPORT_X,
      p: pUsed, T: TUsed, cd: cdUsed, nPlants: cfg.nCorn,
    });
    // 逐刷新浪费明细（账本事件直读；counted/warmup 语义与 finalize 一致）
    const wasteRows = ledger.events.filter((e) => e.kind === 'freeze' && e.counted && e.isRefresh).map((e) => e.waste);
    perSeed.push({
      seed, coverage: m.freezeCoverage, freezeCoverage: m.freezeCoverage, chillFrac: m.chillFrac, unionFrac: m.unionFrac,
      shots: cnt.melonThrow, butters: m.butters, butterShare: cnt.melonThrow ? P.r4(m.butters / cnt.melonThrow) : null,
      refreshEvents: m.refreshEvents, wasteTotal: m.refreshWasteTotal,
      wasteRows: wasteRows.map((w) => P.r4(w)),
      legacyButters: m.legacyButters, resetEvents: m.resetEvents,
      projLinear: m.naiveProjection.value,   // 旧线性式（反面教材）对照读数，仅落档
    });
  }
  const metricKey = cfg.metric;
  const metricAgg = P.agg(perSeed.map((x) => x[metricKey]));
  const sem = metricAgg.n ? metricAgg.std / Math.sqrt(metricAgg.n) : 0;
  const tot = (k) => perSeed.reduce((a, b) => a + b[k], 0);
  const refreshTotal = tot('refreshEvents'), wasteTotal = tot('wasteTotal'), buttersTotal = tot('butters');
  // wasteRateRows：per-refresh waste 明细分箱（单株≈T−cd 锚点 vs 多株「全浪费」双峰结构证据）
  const wasteRows = perSeed.flatMap((x) => x.wasteRows);
  const TStar = cfg.TOverride != null ? cfg.TOverride : pre.measured.freezeT;
  const cdStar = pre.measured.cornCd;
  const wasteAll = wasteRows.filter((w) => w > TStar - cdStar - 0.05).length;   // ≈全浪费档（preT≈T）
  return {
    id: cfg.id, domain: cfg.domain, metric: metricKey, warmupT, nSeeds,
    seeds: P.seeds(cfg.seedStart, nSeeds), windowT: cfg.windowT, scenario: cfg.scenario,
    override: { p: cfg.pOverride, T: cfg.TOverride },
    perSeed, metricAgg, sem: P.r4(sem),
    buttersTotal, refreshTotal, wasteTotal: P.r4(wasteTotal),
    wastePerRefresh: refreshTotal ? P.r4(wasteTotal / refreshTotal) : 0,
    wasteStructure: {
      note: '全浪费档=单次刷新 preT≈T*−cd 以内（多株同 tick 双中/密集连中特征）；边际档=浪费额 T−cd 附近（马尔可夫 renewal 锚点，单株/稀疏命中场景）',
      wasteAllCount: wasteAll,
      wasteAllShare: refreshTotal ? P.r4(wasteAll / refreshTotal) : 0,
    },
    chillFracAgg: P.agg(perSeed.map((x) => x.chillFrac)),
  };
}

// ---------------- 拟合优度（4 纯冻结锚点；口径见头部登记） ----------------
function goodnessOfFit(residuals, sems, ys) {
  const n = residuals.length;                       // 4
  const ssRes = residuals.reduce((a, r) => a + r * r, 0);
  const ybar = ys.reduce((a, b) => a + b, 0) / n;
  const ssTot = ys.reduce((a, y) => a + (y - ybar) * (y - ybar), 0);
  const chi2 = residuals.reduce((a, r, i) => a + Math.pow(r / sems[i], 2), 0);
  return {
    residualDef: 'residual = 投影值 − 复测均值（正=高估）',
    df: n - 0,                                      // 零拟合参数 → df=4
    chi2: P.r2(chi2),
    r2: ssTot > 0 ? P.r4(1 - ssRes / ssTot) : null,
    ssRes: r6(ssRes), ssTot: r6(ssTot),
    note: 'χ²=Σ(residual/SEM)²，SEM=复测种子 std/√48；R²=1−Σres²/Σ(y−ȳ)²。仅 4 纯冻结锚点（A5 含 chill 实测代入与独立性假设，不入拟合优度）',
  };
}
// r6：JSON 落档用 6 位小数（残差平方和量级小）
const r6 = (v) => Math.round(v * 1e6) / 1e6;

// ---------------- 主流程 ----------------
async function main() {
  const t0 = Date.now();
  console.log('[R9-b] 平衡模型理论标定 — 开始（锚点 5 臂 × 48 种子 + warm8 对照 + 哨兵双域）');

  // [0] 运行卫生记录（跑前 git 状态）
  let gitHead = null, gitDirty = null;
  try {
    gitHead = execSync('git rev-parse --short HEAD', { cwd: path.resolve(__dirname, '..', '..'), encoding: 'utf8' }).trim();
    gitDirty = execSync('git status --porcelain', { cwd: path.resolve(__dirname, '..', '..'), encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  } catch (e) { gitDirty = ['git-unavailable: ' + e.message]; }
  console.log(`[0] git HEAD=${gitHead} · 工作树${gitDirty && gitDirty.length ? `不干净(${gitDirty.length} 项)` : '干净'}`);

  // [1] 七道门 + 前提实测
  console.log('[1] 七道前置门 + 前提实测 ...');
  const { pre, gates } = await P.bootstrap({});
  const out = {
    meta: {
      task: 'V18-R9-b 平衡模型理论标定（plan §2 R9 + D-1 定稿增补 A 两域分界）',
      date: new Date().toISOString().slice(0, 10),
      node: process.version, htmlPath: P.htmlPath(),
      gitHead, gitClean: !!(gitDirty && gitDirty.length === 0),
      nSeedsPerAnchor: N_SEEDS, passTol: PASS_TOL,
      seedPlan: ANCHORS.map((a) => ({ id: a.id, domain: a.domain, seeds: `7xxx 段 ${a.seedStart}..${a.seedStart + N_SEEDS - 1}`, warm8CtrlSeeds: `同段前 ${N_WARM8} 枚`, windowT: a.windowT, metric: a.metric, override: a.pOverride != null ? `p*=${a.pOverride}/T*=${a.TOverride}` : '无(当前源码原生)' })),
      sentinelSeeds: SENTINEL_SEEDS,
      historicalAnchors: HISTORY,
      formulaRegistry: FORMULAS,
      preconditions: pre,
      implicitPremises: [
        '①applyFreeze 唯一黄油入口（gate5 调用点计数==1 校验）',
        '②freezeT 帧递减语义恒定（gate3 canary 佐证）',
        '③chill/freeze 并存状态机不变（gate3 chill×0.6 佐证）',
        '④顶层 function 沙箱桥可用（gate6 自检）',
        '⑤v1.6 域锚点=参数覆写重演（p* 受控随机门 / T* overrideT），非旧源码重放；域等价性由哨兵双域+A1 刷新恒 0 确定性自检背书',
        '⑥v1.7 域锚点在当前 v1.8 源码直跑（冻结路径零改动，gate5 常量快照自证）',
      ],
      windowsBiasNote: '复测锚点为全窗计量（warmup=0，对齐历史口径）；与稳态式比较有 ~1pp 级首窗偏置（首窗无冻结起点→偏正向），warm8 对照跑供偏差结构分析',
      runtimeMs: null,
    },
    gates: null,
    sentinel: null,
    anchors: {},
    residuals: {},
    verdict: null,
    assertions: [],
    pass: false,
  };
  out.gates = {
    pass: gates.pass, failedGates: gates.failedGates,
    results: gates.results.map((r) => ({ gate: r.gate, name: r.name, pass: r.pass, detail: r.detail })),
  };
  for (const r of gates.results) console.log(`  gate${r.gate} ${r.pass ? 'PASS' : 'FAIL'} ${r.name} — ${r.detail}`);

  const assert = (name, pass, detail) => {
    out.assertions.push({ name, pass: !!pass, detail });
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail || ''}`);
    return pass;
  };
  let ok = true;
  ok = assert('七道前置门全过(gate1-6硬门)', gates.pass, gates.failedGates.length ? '失败:' + gates.failedGates.join(',') : 'gate7 软门恒过') && ok;
  ok = assert('前提:p=0.27/T=3.0/cd=2.6 实测一致', Math.abs(pre.measured.butterP - 0.27) <= 1e-6 && P.epsEq(pre.measured.freezeT, 3.0) && P.epsEq(pre.measured.cornCd, 2.6),
    `p=${pre.measured.butterP} T=${pre.measured.freezeT} cd=${pre.measured.cornCd}`) && ok;
  ok = assert('前提:applyFreeze 调用点==1(溅射不定身)', pre.measured.applyFreezeCallSites === 1, `实测 ${pre.measured.applyFreezeCallSites}`) && ok;
  ok = assert('前提:当前源码=T>cd 刷新重叠域', pre.domain.T > pre.domain.cd, `T=${pre.domain.T} cd=${pre.domain.cd} → ${pre.domain.domainLabel}`) && ok;

  // [2] 哨兵双域复跑（判别力背书：v1.6 域覆写法在 A 域刷新恒 0）
  console.log('[2] 口径自检哨兵双域复跑（种子段 7601/7701）...');
  const sent = P.runSentinel({ cd: pre.measured.cornCd, nSeeds: SENTINEL_SEEDS.nSeeds, windowT: 72, warmupT: 8, seedA: SENTINEL_SEEDS.seedA, seedB: SENTINEL_SEEDS.seedB });
  out.sentinel = sent;
  console.log(`  A(${sent.A.label}) refresh=${sent.A.refreshTotal} waste=${sent.A.wasteTotal} → ${sent.A.verdict}`);
  console.log(`  B(${sent.B.label}) refresh=${sent.B.refreshTotal} wastePerRefresh=${sent.B.wastePerRefresh} → ${sent.B.verdict}`);
  ok = assert('哨兵:双域判别力完整(v1.6域PASS+v1.7域FAIL)', sent.discriminative === true, sent.conclusion) && ok;

  // [3] 五锚点复测（主跑 warm0 ×48 + 对照 warm8 ×8）
  console.log('[3] 锚点复测 ...');
  for (const cfg of ANCHORS) {
    const main_ = runAnchor(cfg, pre, 0, N_SEEDS);
    const ctrl = runAnchor(cfg, pre, 8, N_WARM8);
    const hist = HISTORY[cfg.id];
    const replayMean = main_.metricAgg.mean;
    const fidelity = P.r4(replayMean - hist.value);   // 复测 − 历史（正=复测偏高）
    out.anchors[cfg.id] = {
      ...main_, warm8Ctrl: { nSeeds: N_WARM8, metricAgg: ctrl.metricAgg, refreshTotal: ctrl.refreshTotal, wastePerRefresh: ctrl.wastePerRefresh },
      historical: hist.value, historySource: hist.source, replayMinusHistory: fidelity,
      fidelityGuard: hist.guard,
    };
    console.log(`  ${cfg.id} [${cfg.domain}] ${cfg.metric}: 复测=${replayMean}±${main_.metricAgg.std} (SEM=${main_.sem}) · 历史=${hist.value} · 保真=${fidelity >= 0 ? '+' : ''}${fidelity} · refresh=${main_.refreshTotal} wastePerRefresh=${main_.wastePerRefresh}s · warm8对照=${ctrl.metricAgg.mean}`);
  }

  // 锚点确定性自检（域分界的行为学证据，接哨兵）
  const a1 = out.anchors.A1_v16_single, a2 = out.anchors.A2_v17_single;
  ok = assert('A1(v1.6域):刷新浪费恒0(T*=2.5≤cd 确定性)', a1.refreshTotal === 0 && a1.wasteTotal === 0,
    `refresh=${a1.refreshTotal} waste=${a1.wasteTotal}`) && ok;
  ok = assert('A1:每种子黄油可达', a1.perSeed.every((s) => s.butters > 0), `butters total=${a1.buttersTotal}`) && ok;
  ok = assert('A1:p* 覆写门控实测≈0.25(存活靶伪影容差内)',
    Math.abs(a1.buttersTotal / Math.max(1, a1.perSeed.reduce((a, b) => a + b.shots, 0)) - 0.25) <= 0.05,
    `实测 butterShare=${P.r4(a1.buttersTotal / Math.max(1, a1.perSeed.reduce((a, b) => a + b.shots, 0)))}（历史存活靶口径 −1.5pp 伪影带内）`) && ok;
  ok = assert('A2/A3/A4/A5(T>cd域):刷新确凿发生', [a2, out.anchors.A3_n2, out.anchors.A4_n3, out.anchors.A5_m5_union].every((a) => a.refreshTotal > 0),
    `refresh=${[a2, out.anchors.A3_n2, out.anchors.A4_n3, out.anchors.A5_m5_union].map((a) => a.refreshTotal).join('/')}`) && ok;
  // 马尔可夫 renewal 锚点（wastePerRefresh≈T−cd=0.4s）仅对【单株/稀疏命中】场景有效：
  // 多株同帧起手共享 cd 网格，同 tick 双中/密集连中产生的刷新其 preT 可远大于 T−cd（最高≈T），
  // 属「全浪费」峰——分档口径见各锚点 wasteStructure，此处只对 A2 硬断言。
  ok = assert('A2(单株):每刷新浪费≈T−cd=0.4s(±0.2 马尔可夫锚点)',
    Math.abs(a2.wastePerRefresh - 0.4) <= 0.2,
    `wastePerRefresh=${a2.wastePerRefresh}s（多株值见 wasteStructure 分档，不作硬断言）`) && ok;

  // [4] 三候选式 + 参考式：逐锚点残差 + 拟合优度
  console.log('[4] 候选式投影与残差 ...');
  const fitKeys = ['A1_v16_single', 'A2_v17_single', 'A3_n2', 'A4_n3'];
  for (const [fid, fdef] of Object.entries(FORMULAS)) {
    const perAnchor = {};
    const residuals = [], sems = [], ys = [];
    for (const cfg of ANCHORS) {
      const a = out.anchors[cfg.id];
      const pUsed = cfg.pOverride != null ? cfg.pOverride : pre.measured.butterP;
      const TUsed = cfg.TOverride != null ? cfg.TOverride : pre.measured.freezeT;
      const cdUsed = pre.measured.cornCd;
      const fPred = predFrozen(fid, pUsed, TUsed, cdUsed, cfg.nCorn);
      let pred, note = null;
      if (cfg.metric === 'unionFrac') {
        // A5 合成口径：式只负责冻结分量；chill 分量实测代入（不参与标定）。
        // prelude 的 chillFrac = slowT>0 且非冻结 ⇒ 与冻结帧不相交 ⇒ 加法并集。
        // （v16 历史口径是 slowFrac 含冻结帧的「重叠」口径，需独立并集合成——此处对齐
        //   prelude 权威口径用加法；两种口径换算关系与教训登记于标定文档。）
        const si = a.chillFracAgg.mean;
        pred = fPred + si;
        note = `union_pred = frozen_pred + chillDisj_meas=${si}（prelude 不相交口径）；冻结分量 frozen_pred=${P.r4(fPred)}；独立并集对照值=${P.r4(1 - (1 - fPred) * (1 - si))}`;
      } else {
        pred = fPred;
      }
      const residual = P.r4(pred - a.metricAgg.mean);
      perAnchor[cfg.id] = { pred: P.r4(pred), frozenPred: P.r4(fPred), replay: a.metricAgg.mean, residual, note };
      if (fitKeys.includes(cfg.id)) { residuals.push(residual); sems.push(a.sem); ys.push(a.metricAgg.mean); }
    }
    const maxAbs = Math.max(...Object.values(perAnchor).map((x) => Math.abs(x.residual)));
    const allPass = Object.values(perAnchor).every((x) => Math.abs(x.residual) <= PASS_TOL);
    out.residuals[fid] = {
      name: fdef.name, formula: fdef.formula, note: fdef.note, referenceOnly: !!fdef.referenceOnly,
      perAnchor, maxAbsResidual: P.r4(maxAbs), allAnchorsWithinTol: allPass,
      fit: goodnessOfFit(residuals, sems, ys),
    };
    const tag = fdef.referenceOnly ? '（参考式，不作判定）' : (allPass ? '✓ 全锚点 ≤±2pp' : '✗ 超差');
    console.log(`  ${fid} ${fdef.formula}: maxAbs=${P.r4(maxAbs)} ${tag}`);
    for (const [k, v] of Object.entries(perAnchor)) console.log(`    ${k}: pred=${v.pred} replay=${v.replay} residual=${v.residual >= 0 ? '+' : ''}${v.residual}`);
  }

  // [5] 通过判定（禁凑数放宽：无一式全过则如实报告）
  const cand = Object.entries(out.residuals).filter(([, v]) => !v.referenceOnly);
  const passed = cand.filter(([, v]) => v.allAnchorsWithinTol).map(([k]) => k);
  const ranking = cand.slice().sort((a, b) => a[1].maxAbsResidual - b[1].maxAbsResidual)
    .map(([k, v]) => ({ formula: k, maxAbsResidual: v.maxAbsResidual, allAnchorsWithinTol: v.allAnchorsWithinTol, chi2: v.fit.chi2, r2: v.fit.r2 }));
  out.verdict = {
    passTol: PASS_TOL, passFormula: passed.length === 1 ? passed[0] : (passed.length ? passed : null),
    ranking, fitTableNote: 'χ²/R² 仅覆盖 4 纯冻结锚点（A5 单列残差）；ranking 按 maxAbsResidual 升序',
    conclusion: passed.length === 1
      ? `标定通过：${passed[0]} 全锚点残差 ≤±2pp`
      : passed.length > 1
        ? `多式通过（${passed.join('/')}），按 maxAbsResidual 取最优 ${ranking[0].formula}`
        : `无一候选式全锚点残差 ≤±2pp（最优=${ranking[0].formula} maxAbs=${ranking[0].maxAbsResidual}）；如实报告各式残差，分段式/修正系数建议见标定文档（禁凑数放宽）`,
  };
  console.log(`[5] 判定: ${out.verdict.conclusion}`);
  ok = assert('残差表完整性(三候选式+参考式 × 5锚点)', Object.keys(out.residuals).length === 4
    && Object.values(out.residuals).every((v) => Object.keys(v.perAnchor).length === 5 && Object.values(v.perAnchor).every((x) => Number.isFinite(x.residual))),
    '三式×5锚点全有数') && ok;
  ok = assert('复测保真护栏(结构性错位检查,非判据)', Object.entries(out.anchors).every(([k, a]) => Math.abs(a.replayMinusHistory) <= a.fidelityGuard),
    `保真=${Object.entries(out.anchors).map(([k, a]) => `${k}:${a.replayMinusHistory}`).join(' ')}`) && ok;
  ok = assert('判定与数据一致(passFormula 与残差表互证)',
    passed.length === 0 ? out.verdict.passFormula === null
      : (out.verdict.passFormula != null && String(passed.includes(out.verdict.passFormula) ? out.verdict.passFormula : (out.verdict.passFormula[0] || '')) !== '' && passed.every((f) => out.residuals[f].allAnchorsWithinTol)),
    out.verdict.conclusion) && ok;

  // [6] 落盘
  out.pass = ok && out.assertions.every((a) => a.pass);
  out.meta.runtimeMs = Date.now() - t0;
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 1));
  console.log(`\nR9-B CALIBRATION ${out.pass ? 'DONE(结构断言全过)' : 'DONE(存在FAIL断言,见 assertions)'} → ${OUT_FILE} (${out.meta.runtimeMs}ms)`);
  console.log(`  注意：calibration「pass」指脚本结构断言；标定通过与否见 verdict.conclusion（两者独立）。`);
  process.exitCode = 0;
}

main().catch((e) => {
  console.error('R9-B CRASH:', e && e.stack || e);
  process.exitCode = 2;
});
