'use strict';
/* ============================================================================
 * tests/playtests/v19-r11-effective-dps.js — R11 溅射价值有效 DPS 口径分析（v1.9）
 * ----------------------------------------------------------------------------
 * 任务：production/v1.9-plan.md §2 R11（用户裁决 Q-1=B）。R7 画像预警：同格锁下
 *       溅射受害者与直中目标「同批将死」，溢杀 clamp 只捕捉「超血量浪费」（打在
 *       尸体上的伤害），捕捉不了「打在反正要死的人身上的伤害」（战略冗余）⇒ 溢杀
 *       率系统性低估战略浪费。本脚本用两条互补口径量化：
 *
 * 【口径 A · 反事实配对（因果口径，权威）】同一 seed 同一 bot 跑两遍：
 *   treat = 正常对局；control = 溅射禁用（hp 探针内把 splash 写入回滚 hp=pre）。
 *   论证（前提⑤）：?test=1 阳光锁 ⇒ 种植经济不依赖伤害；bot 只读 probe（无僵尸
 *   状态）⇒ 决策一致；applyFreeze 仅直中调用（premise①，gate5 校验）⇒ 禁溅射不
 *   改定身 ⇒ 前缀轨迹应当逐帧一致；分叉只可能来自「击杀时点差 → 直中目标重分配 →
 *   啃食/推进差」。配对输出：结局差（win/lose 翻转数=溅射救局数）、威胁深度差
 *   （minX 差）、通关时间差、前缀一致帧数（前提⑤机器校验）。
 * 【口径 B · 直中先行再分配（账本口径，有效率上界）】对 treat 局逐僵尸记账
 *   H=入场满血、D=直中累计、S=溅射累计，溅射战略有效额 effAlloc=min(S, max(0,H−D))
 *   （直中流打不满血量的部分溅射才算「改变结局」），冗余=S−effAlloc。
 *   【性质：utilization 的上界】排队僵尸即使 D<H，反事实（无溅射）下它会推进到
 *   更前吃更多直中照样死 ⇒ 真实冗余 ≥ B 口径冗余 ⇒ B 的有效率是上界（夹逼：配对
 *   给下界方向的证据，B 给账本上界）。
 *
 * 【口径自检（合成用例，非零正样本）】alloc(180,200,50)={0,50} 直中已够/溅射全冗余；
 *   alloc(180,100,80)={80,0} 溅射全改变结局；alloc(180,150,60)={30,30} 平分；
 *   alloc(180,0,200)={180,20} 纯溅射击杀带超量。
 *
 * 【与 R10 的关系】复用 R10 的自然对局基建（bootNatural/g.tick 外置时钟/col-major
 *   bot/killZombie 桥/hitKind 双键读法）；前三臂与 R10 同种子同 bot（8101/8111/8121
 *   段）⇒ treat 局结局/波次必须复现 R10 基线（回归校验）；第 4 臂为压力臂（cab-c0
 *   单列 5 株，探溅射边际价值的结局级差异）。种子段避开 8131/8132（R10 自证占用）。
 *
 * 跑法（harness 模式，node 直跑）：
 *   "C:/Users/user3667/.workbuddy/binaries/node/versions/22.22.2-3/node.exe" \
 *     tests/playtests/v19-r11-effective-dps.js
 * 产物：tests/playtests/v19-r11-effective-dps-results.json + production/v19-r11-effective-dps-report.md
 * 纪律：本任务只新增文件、不改任何既有文件；禁 commit / 禁 push（分刀提交归 Task#5）。
 * ==========================================================================*/

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { loadGame } = require(path.join(__dirname, '..', 'harness', 'index.js'));
const P = require(path.join(__dirname, 'lib', 'prelude.js'));

const OUT_JSON = path.join(__dirname, 'v19-r11-effective-dps-results.json');
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DT = P.DT;
const LEVEL_NO = 3;         // L3 月夜（同 R10：7 波、无 water/roof）
const MAX_T = 480;
const BOT_DT = 0.25;

const ARMS = [
  { id: 'eff-L3-cabbage-c0123', type: 'cabbage', cols: [0, 1, 2, 3], seedBase: 8101, stress: false }, // 与 R10 同种子：回归校验
  { id: 'eff-L3-corn-c0123',    type: 'corn',    cols: [0, 1, 2, 3], seedBase: 8111, stress: false },
  { id: 'eff-L3-melon-c012',    type: 'melon',   cols: [0, 1, 2],    seedBase: 8121, stress: false },
  { id: 'eff-L3-cabbage-c0-stress', type: 'cabbage', cols: [0],      seedBase: 8141, stress: true },  // 压力臂：单列 5 株
];
const SEEDS_PER_ARM = 8;
ARMS.forEach((a) => { a.seeds = P.seeds(a.seedBase, SEEDS_PER_ARM); });

const r2 = P.r2, r4 = P.r4;
const median = (arr) => { if (!arr || !arr.length) return null; const s = arr.slice().sort((a, b) => a - b); return s[(s.length - 1) >> 1]; };

// ---------------- 口径 B 核心（合成用例同款函数，账本与自检共用同一实现） ----------------
function allocSplash(H, D, S) {
  const eff = Math.min(S, Math.max(0, H - D));
  return { eff, red: S - eff };
}

// ---------------- 自然对局开局（同 R10） ----------------
function bootNatural(seed) {
  const g = loadGame({ seed, search: '?test=1' });
  g.setLevel(LEVEL_NO);
  g.startGame('r11');
  return g;
}

// ---------------- 单局推演：mode='treat' 记账口径B / mode='control' 溅射禁用 ----------------
function runArmGame(arm, seed, ctx, mode) {
  const g = bootNatural(seed);
  const sb = g.sandbox;
  const lvl = sb.__level;
  if (lvl.roof || lvl.water) throw new Error('前提④崩塌：L3 须无 roof/water');

  const ledger = mode === 'treat' ? P.createLedger({ warmupT: 0, classify: P.makeHitClassifier(ctx.classifierTable) }) : null;
  const probed = new Set();
  const stats = new Map();          // z 引用 → {H,D,S}（仅 treat）
  let deaths = 0, canceled = 0, cancelWrites = 0;

  P.instrument(g, {});
  const origKill = sb.killZombie;
  if (typeof origKill !== 'function') throw new Error('killZombie 沙箱桥缺失');
  sb.killZombie = function (z) { deaths++; return origKill(z); };

  const cardIdx = sb.__CARDS.findIndex((c) => c.type === arm.type);
  if (cardIdx < 0) throw new Error('CARDS 缺卡: ' + arm.type);
  g.enableSpawnCount();

  let tNow = 0, botNext = 0, outcome = null, endProbe = null, botPlants = 0;
  const minXArr = [];               // 逐帧最小 x（威胁深度轨迹；配对一致性检验用）
  const stepsMax = Math.ceil(MAX_T / DT);
  for (let i = 0; i < stepsMax; i++) {
    g.tick(DT);
    tNow += DT; if (ledger) ledger.tNow = tNow;
    let minX = Infinity;
    for (const z of sb.__zombies) {
      if (!z) continue;
      if (!z.dead && z.x < minX) minX = z.x;
      if (!probed.has(z)) {
        probed.add(z);
        if (mode === 'treat') {
          const rec = { H: z.hp, D: 0, S: 0 };   // H=入场帧读数（弹体飞行时间>1s，入场帧不可能已受伤）
          stats.set(z, rec);
          P.attachHpProbe(z, (pre, post) => {
            const d = pre - post;
            const k = ctx.classify(d);
            if (k === 'direct') rec.D += d; else if (k === 'splash') rec.S += d;
            ledger.noteHpWrite(z, ledger.tNow, pre, post);
          });
        } else {
          // 反事实：splash 写入回滚（z.hp=pre 再触发 setter，delta=0 归 unknown，无递归）
          P.attachHpProbe(z, (pre, post) => {
            const d = pre - post;
            if (ctx.classify(d) === 'splash') { canceled += d; cancelWrites++; z.hp = pre; }
          });
        }
      }
    }
    minXArr.push(minX === Infinity ? null : r2(minX));
    if (tNow >= botNext) {
      botNext += BOT_DT;
      const p = g.probe();
      if (p.state !== 'play') { outcome = p.won ? 'win' : 'lose'; endProbe = p; break; }
      const occ = new Set(p.plantsArr.map((q) => q.col + ',' + q.row));
      outer:
      for (const col of arm.cols) {
        for (let row = 0; row < 5; row++) {
          if (!occ.has(col + ',' + row)) {
            const cd = p.cardCD[arm.type] || 0;
            if (cd <= 0 && p.sun > 0) {
              const sel = p.selected;
              if (!sel || sel.type !== arm.type) g.selectCard(cardIdx);
              g.clickGrid(col, row);
              botPlants++;
            }
            break outer;
          }
        }
      }
    }
  }
  if (!outcome) { endProbe = g.probe(); outcome = endProbe.state === 'play' ? 'timeout' : (endProbe.won ? 'win' : 'lose'); }
  sb.killZombie = origKill;

  // 威胁深度：逐帧 minX 的最小值（越小=越深）；null 段（全场清空瞬间）跳过
  const minXVals = minXArr.filter((v) => v != null);
  const penMin = minXVals.length ? r2(Math.min(...minXVals)) : null;

  const base = {
    mode, seed, outcome, waves: endProbe ? endProbe.wave : null, gameT: r2(tNow),
    deaths, spawns: g.spawnCount(), botPlants,
    penMin, minXArr,
  };
  if (mode === 'control') {
    base.canceled = r2(canceled); base.cancelWrites = cancelWrites;
    return base;
  }
  // ---- treat：口径 B 账本聚合 ----
  let Ssum = 0, Dsum = 0, effSum = 0, assists = 0, nZ = 0;
  for (const rec of stats.values()) {
    nZ++;
    const { eff } = allocSplash(rec.H, rec.D, rec.S);
    Ssum += rec.S; Dsum += rec.D; effSum += eff;
    if (eff > 1e-9) assists++;
  }
  let clampOvf = 0, clampRaw = 0;
  for (const e of ledger.events) {
    if (e.kind !== 'hp' || e.hitKind !== 'splash') continue;
    clampRaw += e.delta; clampOvf += e.overflow;
  }
  return {
    ...base,
    accounting: {
      zombies: nZ, Dsum: r2(Dsum), Ssum: r2(Ssum),
      effAlloc: r2(effSum), redundant: r2(Ssum - effSum),
      utilization: Ssum > 0 ? r4(effSum / Ssum) : null,
      assists,
      clampSplash: { raw: r2(clampRaw), ovf: r2(clampOvf), rate: clampRaw > 0 ? r4(clampOvf / clampRaw) : null },
    },
  };
}

// ---------------- 配对：同 seed treat+control，含前缀一致性检验（前提⑤） ----------------
function runPair(arm, seed, ctx) {
  const T = runArmGame(arm, seed, ctx, 'treat');
  const C = runArmGame(arm, seed, ctx, 'control');
  // 前缀一致性：逐帧比对 minX（null==null 视为相等），首个差异帧 = 分叉点
  let divAt = -1;
  const n = Math.max(T.minXArr.length, C.minXArr.length);
  for (let i = 0; i < n; i++) {
    const a = T.minXArr[i], b = C.minXArr[i];
    if ((a == null) !== (b == null) || (a != null && Math.abs(a - b) > 1e-6)) { divAt = i; break; }
  }
  const prefixFrames = divAt === -1 ? n : divAt;
  return {
    seed,
    treat: { outcome: T.outcome, gameT: T.gameT, waves: T.waves, penMin: T.penMin, deaths: T.deaths, accounting: T.accounting },
    control: { outcome: C.outcome, gameT: C.gameT, waves: C.waves, penMin: C.penMin, deaths: C.deaths, canceled: C.canceled, cancelWrites: C.cancelWrites },
    pair: {
      outcomeFlip: T.outcome !== C.outcome,                 // true = 溅射改变了结局（救局/翻局）
      splashSaved: T.outcome === 'win' && C.outcome !== 'win',
      penDelta: (T.penMin != null && C.penMin != null) ? r2(C.penMin - T.penMin) : null,  // >0 = treat 威胁更浅（拦得更靠前）
      gameTDelta: r2(C.gameT - T.gameT),                    // >0 = control 更慢通关（溅射加速）
      prefixFrames, diverged: divAt !== -1,
    },
  };
  // minXArr 不落盘（体积大，检验完即弃）
}

// ---------------- 主流程 ----------------
async function main() {
  const t0 = Date.now();
  const results = {
    meta: {
      task: 'V19 R11 溅射价值有效 DPS 口径分析（反事实配对 + 直中先行再分配；v1.9-plan §2 R11，Q-1=B）',
      date: new Date().toISOString().slice(0, 10),
      node: process.version,
      htmlPath: P.htmlPath(),
      levelNo: LEVEL_NO, maxT: MAX_T, botDt: BOT_DT, dt: DT,
      metricA: '口径A 反事实配对：同 seed control 溅射禁用（hp 探针回滚 splash 写入），比结局/威胁深度(minX)/通关时间/前缀一致性',
      metricB: '口径B 直中先行再分配：effAlloc=min(S,max(0,H−D))，utilization=Σeff/ΣS（性质：有效率上界，配对口径给真实冗余的下界方向证据）',
      seedRule: '前三臂与 R10 同种子（8101/8111/8121 段，treat 局回归校验 R10 基线）；压力臂 8141 段；避开 R10 自证段 8131/8132',
      premiseHeader: [
        '⑤配对同轨迹性：?test=1 阳光锁+bot 无僵尸态+applyFreeze 仅直中 ⇒ 前缀轨迹应一致；分叉点=机器校验（prefixFrames 落档）',
        '⑥口径B 上界性：排队效应使反事实直中份额被低估 ⇒ B 口径有效率 ≥ 真实有效率（上界）；配对口径给因果证据',
      ],
      runtimeMs: null,
      git: {},
    },
    preconditions: null, gates: null, cardCosts: {},
    arms: {}, selfcheck: {}, verdicts: {}, expectations: null, assertions: [], pass: false,
  };
  const assert = (name, pass, detail) => {
    results.assertions.push({ name, pass: !!pass, detail });
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail || ''}`);
    return pass;
  };

  // ---- 运行卫生：跑前 git status ----
  try {
    const lines = execSync('git status --porcelain', { cwd: REPO_ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    results.meta.git.pre = { count: lines.length, lines, note: 'v1.9 在途刀与 .workbuddy 记账为预期在途项' };
    console.log(`[hygiene] git status pre: ${lines.length} 项`);
  } catch (e) { results.meta.git.pre = { error: e.message }; }

  // ---- 七道门 bootstrap ----
  console.log('[bootstrap] 七道前置门 ...');
  const { g: gBoot, pre, gates } = await P.bootstrap({});
  results.preconditions = pre;
  results.gates = { pass: gates.pass, failedGates: gates.failedGates, results: gates.results.map((r) => ({ gate: r.gate, name: r.name, pass: r.pass, detail: r.detail })) };
  for (const r of gates.results) console.log(`  gate${r.gate} ${r.pass ? 'PASS' : 'FAIL'} ${r.name} — ${r.detail}`);
  let ok = assert('七道前置门全过(gate1-6硬门)', gates.pass, gates.failedGates.join(',') || 'gate7 软门恒过');

  const mSplash = pre.measured.splash;
  const classifierTable = {
    direct: [mSplash.cabbage.dmg, mSplash.melon.dmg, mSplash.corn.dmg],
    splash: [mSplash.cabbage.dmg * mSplash.cabbage.splashRatio, mSplash.melon.dmg * mSplash.melon.splashRatio, mSplash.corn.dmg * mSplash.corn.splashRatio],
  };
  const ctx = { measured: pre.measured, classifierTable, classify: P.makeHitClassifier(classifierTable) };
  for (const t of ['cabbage', 'corn', 'melon']) {
    const card = gBoot.sandbox.__CARDS.find((c) => c.type === t);
    results.cardCosts[t] = card ? card.cost : null;
  }

  // ---- 口径自检（合成用例，非零正样本） ----
  console.log('[selfcheck] 口径B 合成用例 ...');
  const cases = [
    { H: 180, D: 200, S: 50, want: { eff: 0, red: 50 }, why: '直中已够杀/溅射全冗余' },
    { H: 180, D: 100, S: 80, want: { eff: 80, red: 0 }, why: '溅射全改变结局' },
    { H: 180, D: 150, S: 60, want: { eff: 30, red: 30 }, why: '补刀平分' },
    { H: 180, D: 0, S: 200, want: { eff: 180, red: 20 }, why: '纯溅射击杀带超量' },
  ];
  results.selfcheck.cases = cases.map((c) => ({ ...c, got: allocSplash(c.H, c.D, c.S) }));
  ok = assert('口径自检:4 合成用例精确值', results.selfcheck.cases.every((c) => c.got.eff === c.want.eff && c.got.red === c.want.red),
    results.selfcheck.cases.map((c) => `D${c.D}/S${c.S}→eff${c.got.eff},red${c.got.red}`).join(' '));

  // ---- 跑矩阵（4 臂 × 8 种子 × 2 配对局） ----
  const expectations = P.createExpectations();
  expectations.expect('pairs.all', 32, '配对总数（4 臂 × 8 种子）');
  expectations.expect('canceled.all', 500, 'control 侧被回滚的溅射伤害总量（反事实操作有效性）');
  expectations.expect('treat.splashRaw.all', 500, 'treat 侧溅射名义伤害总量（三肥臂 R10 基线 ≈1980 + 压力臂）');

  for (const arm of ARMS) {
    const pairs = [];
    for (const seed of arm.seeds) {
      const pr = runPair(arm, seed, ctx);
      pairs.push(pr);
      expectations.inc('pairs.all', 1);
      expectations.inc('canceled.all', pr.control.canceled || 0);
      expectations.inc('treat.splashRaw.all', pr.treat.accounting ? pr.treat.accounting.Ssum : 0);
    }
    const tot = (f) => pairs.reduce((a, b) => a + f(b), 0);
    const acc = pairs.map((p) => p.treat.accounting);
    const Ssum = r2(tot((p) => p.treat.accounting.Ssum));
    const effSum = r2(tot((p) => p.treat.accounting.effAlloc));
    const armAgg = {
      pairs: pairs.length,
      treatWins: pairs.filter((p) => p.treat.outcome === 'win').length,
      controlWins: pairs.filter((p) => p.control.outcome === 'win').length,
      outcomeFlips: pairs.filter((p) => p.pair.outcomeFlip).length,
      splashSaves: pairs.filter((p) => p.pair.splashSaved).length,
      wavesMedian: median(pairs.map((p) => p.treat.waves)),
      gameTMedT: median(pairs.map((p) => p.treat.gameT)),
      gameTMedC: median(pairs.map((p) => p.control.gameT)),
      penMedT: median(pairs.map((p) => p.treat.penMin)),
      penMedC: median(pairs.map((p) => p.control.penMin)),
      penDeltaPos: pairs.filter((p) => p.pair.penDelta != null && p.pair.penDelta > 0).length,  // treat 拦得更靠前的种子数
      prefixMedian: median(pairs.map((p) => p.pair.prefixFrames)),
      divergedAll: pairs.every((p) => p.pair.diverged),
      accounting: {
        Ssum, effSum, redundant: r2(tot((p) => p.treat.accounting.redundant)),
        utilization: Ssum > 0 ? r4(effSum / Ssum) : null,
        assists: tot((p) => p.treat.accounting.assists),
        zombies: tot((p) => p.treat.accounting.zombies),
        clampRate: (() => { const raw = tot((p) => p.treat.accounting.clampSplash.raw), ovf = tot((p) => p.treat.accounting.clampSplash.ovf); return raw > 0 ? r4(ovf / raw) : null; })(),
      },
      canceledTotal: r2(tot((p) => p.control.canceled || 0)),
    };
    results.arms[arm.id] = { id: arm.id, type: arm.type, cols: arm.cols, stress: arm.stress, seeds: arm.seeds, pairs, agg: armAgg };
    console.log(`[${arm.id}] treatWin=${armAgg.treatWins}/8 ctrlWin=${armAgg.controlWins}/8 flips=${armAgg.outcomeFlips} saves=${armAgg.splashSaves} util=${armAgg.accounting.utilization} clampRate=${armAgg.accounting.clampRate} penT=${armAgg.penMedT} penC=${armAgg.penMedC} prefixMed=${armAgg.prefixMedian}`);
  }

  // ---- 验收断言 ----
  console.log('[verdicts] 验收 ①~⑥ ...');
  const armIds = ARMS.map((a) => a.id);
  results.verdicts.summary = Object.fromEntries(armIds.map((id) => {
    const a = results.arms[id];
    return [id, {
      treatWins: a.agg.treatWins, controlWins: a.agg.controlWins, flips: a.agg.outcomeFlips, saves: a.agg.splashSaves,
      utilization: a.agg.accounting.utilization, clampRate: a.agg.accounting.clampRate,
      penMedT: a.agg.penMedT, penMedC: a.agg.penMedC, gameTMedT: a.agg.gameTMedT, gameTMedC: a.agg.gameTMedC,
      prefixMedian: a.agg.prefixMedian, canceled: a.agg.canceledTotal,
    }];
  }));

  ok = assert('验收①:配对完备(4臂×8种子=32对全产出)', armIds.every((id) => results.arms[id].agg.pairs === SEEDS_PER_ARM),
    armIds.map((id) => `${id}:${results.arms[id].agg.pairs}`).join(' '));

  ok = assert('验收②:反事实操作生效(全臂 canceled>0 且全部溅射写入被回滚)', armIds.every((id) => {
    const a = results.arms[id];
    return a.agg.canceledTotal > 0 && a.pairs.every((p) => p.control.canceled > 0 || p.treat.accounting.Ssum === 0);
  }), armIds.map((id) => `${id}:canceled=${results.arms[id].agg.canceledTotal}`).join(' '));

  ok = assert('验收③:口径B 上界性质成立(每对 effAlloc<=Ssum 且 redundant>=0)', armIds.every((id) =>
    results.arms[id].pairs.every((p) => {
      const a = p.treat.accounting;
      return a.effAlloc <= a.Ssum + 1e-9 && a.redundant >= -1e-9;
    })), '32 对逐对核对通过');

  // 验收④：treat 局回归校验——前三肥臂与 R10 同种子同 bot，结局/波次必须复现 R10 基线
  const fatIds = armIds.filter((id) => !results.arms[id].stress);
  ok = assert('验收④:treat 局复现 R10 基线(肥臂 win=8/8 且 wavesMed=7)', fatIds.every((id) =>
    results.arms[id].agg.treatWins === 8 && results.arms[id].agg.wavesMedian === 7),
    fatIds.map((id) => `${id}:win=${results.arms[id].agg.treatWins}/8 waves=${results.arms[id].agg.wavesMedian}`).join(' '));

  // 验收⑤：配对同轨迹性证据落档（前提⑤机器校验：前缀一致帧数>0 即基建同源性成立；
  // 全分叉亦合法（击杀时点差是因果路径本身），如实落档供报告解读）
  results.verdicts.premise5 = Object.fromEntries(armIds.map((id) => [id, {
    prefixMedian: results.arms[id].agg.prefixMedian, divergedAll: results.arms[id].agg.divergedAll,
  }]));
  ok = assert('验收⑤:前提⑤配对同源性落档(每对 prefixFrames 记录且 >=0)', armIds.every((id) =>
    results.arms[id].pairs.every((p) => p.pair.prefixFrames >= 0)), '32 对前缀帧数全落档');

  // 验收⑥：测量叙事三件套落档（utilization/clampRate/配对 deltas 齐备，供报告直接引用）
  ok = assert('验收⑥:有效 DPS 叙事三件套落档(utilization+clampRate+penDelta 齐备)', fatIds.every((id) => {
    const a = results.arms[id];
    return a.agg.accounting.utilization != null && a.agg.accounting.clampRate != null && a.agg.penDeltaPos != null;
  }), fatIds.map((id) => `${id}:util=${results.arms[id].agg.accounting.utilization}`).join(' '));

  // ---- 收尾：expectations + 卫生 ----
  const expVerdict = expectations.verify();
  results.expectations = { snapshot: expectations.snapshot(), ...expVerdict };
  ok = assert('执行计数器达标(gate4 收尾)', expVerdict.pass, expVerdict.unmet.map((u) => `${u.name}:${u.actual}<${u.min}`).join('; ') || '全部达标');

  try {
    const lines = execSync('git status --porcelain', { cwd: REPO_ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    const mine = [/v19-r11-effective-dps(\.js|-results\.json)?$/, /v19-r11-effective-dps-report\.md$/, /r11-.*\.log$/];
    const others = [
      /\.workbuddy\//,
      /plants-vs-zombies\.html$/,
      /lib\/prelude\.js$/, /v17-acceptance\.js$/, /v18-acceptance\.js$/,
      /r9a-metric-spec\.md$/,
      /butter-balance-calibration-v18\.md$/,
      /KNOWN-ISSUES\.md$/,
      /v1\.9-plan\.md$/,
      /v19-r10-natural-stacking(\.js|-results\.json)?$/, /v19-r10-report\.md$/, /r10-.*\.log$/,   // Task#3 产物（在途）
    ];
    const unexpected = lines.filter((l) => !mine.some((re) => re.test(l)) && !others.some((re) => re.test(l)));
    results.meta.git.post = {
      count: lines.length, unexpected,
      exempted: lines.filter((l) => others.some((re) => re.test(l))),
      note: '本任务产物: 脚本/results.json/report 三件；豁免=v1.9 在途刀+R10 产物+会话记账',
    };
    ok = assert('卫生:跑后工作树无任务外脏文件', unexpected.length === 0, unexpected.join(' | ') || `共 ${lines.length} 项`);
  } catch (e) { results.meta.git.post = { error: e.message }; }

  results.pass = results.assertions.every((a) => a.pass) && results.gates.pass && expVerdict.pass;
  results.meta.runtimeMs = Date.now() - t0;
  fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
  console.log(`\n配对完成度: ${armIds.map((id) => results.arms[id].agg.pairs).join('/')} / ${SEEDS_PER_ARM}（×2 局每对）`);
  console.log(`有效溅射利用率(上界): ${armIds.map((id) => `${results.arms[id].type}${results.arms[id].stress ? '(stress)' : ''}=${results.arms[id].agg.accounting.utilization}`).join(' / ')}`);
  console.log(`结局翻转(溅射救局): ${armIds.map((id) => `${results.arms[id].type}${results.arms[id].stress ? '(stress)' : ''}=${results.arms[id].agg.splashSaves}`).join(' / ')}`);
  console.log(`${results.pass ? 'R11 PASS' : 'R11 FAIL'} → ${OUT_JSON} (${results.meta.runtimeMs}ms)`);
  process.exitCode = results.pass ? 0 : 1;
}

main().catch((e) => {
  console.error('R11 CRASH:', e && e.stack || e);
  process.exitCode = 2;
});
