'use strict';
/* ============================================================================
 * v16-butter-balance.js — R1 黄油定身强度复核 · 无头量化测量（只读游戏，零依赖）
 * ----------------------------------------------------------------------------
 * 背景来源：v1.6 KNOWN-ISSUES R1「玉米投手黄油弹是否过强」——机制正确性已由
 * 自动化证明（三停+恢复+与 chill 并存），本脚本只产出【强度量化数据】供拍板，
 * 不做 PASS/FAIL 门控、不改 plants-vs-zombies.html。
 * v1.7（V17-D3）：R-A 加强 25%/2.5s → 27%/3.0s 后复跑；T(3.0s) 已超过攻击间隔(2.6s)，
 * 旧「跨 0 计次」口径会漏计连发黄油 ⇒ 计数口径改为「applyFreeze 调用次数」为准
 * （顶层 function applyFreeze 经 sandbox 桥接可包装拦截），并保留「freezeT 重置事件」
 * 交叉校验；新增 M6「多 corn 叠加」臂（设计稿 §3.3③ 指出的唯一未测风险点）。
 *
 * 跑法（裸 node 不在 PATH，用绝对路径）：
 *   "C:\Users\user3667\.workbuddy\binaries\node\versions\22.22.2-3\node.exe" tests/playtests/v16-butter-balance.js
 * 产出：tests/playtests/v16-butter-balance-results.json（同目录）
 * 环境变量：PVZ_HTML_PATH 覆盖被测源码（前后对比用：指向旧版文件即得基线）；
 *          PVZ_BALANCE_OUT 覆盖输出文件名（避免前后对比互相覆盖）。
 *
 * 【口径说明 · 复现关键】
 * - 源码事实（v1.7.0-wip，行号为 plants-vs-zombies.html 绝对行号）：
 *   L1471 butter=Math.random()<0.27（发射时掷定）；L1615 applyFreeze 置 freezeT=3.0；
 *   L1626-1636 冻结=移动/啃食/walk 三停，与 slowT(×0.6) 独立并存、冻结优先；
 *   L1673 进屋判定 z.x<GRID_X-40=15；L37 GRID_X=55,CELL_W=90；L94-98 难度表
 *   normal/hard/expert=血×1.0/1.35/1.8、速×1.0/1.15/1.30；L1235-1240 僵尸基表
 *   normal 180/16、cone 340/15、fast 140/45、bucket 560/12；CARDS L223-238 造价
 *   corn/pea/cabbage=100、snowpea/melon=175、icemelon=300。
 * - 场景隔离：loadGame→setLevel(1)→startGame→forceWaves(5)（wave=5=totalWaves，
 *   checkWave 的 canAdvance 恒 false ⇒ 自动波次永不触发）→clearField（清残留队列），
 *   再直接向沙箱 __zombies/__plants push 实体（bench.js 手法，字段对齐 spawnPlant/
 *   newWave 结构）。僵尸 hp/spd 按注入值给定（不经 newWave 的 R(0.92,1.08) 抖动）。
 * - 固定种子：每局 loadGame({seed:N}) 注入 mulberry32 覆盖 Math.random，逐种子可复现。
 * - 「存活观测」场景（M1/M3/M5/黄油概率）：僵尸 hp×200 作存活靶，x<300 时回传
 *   x=800（freezeT/slowT 不清零），保证 ≥60s 连续观测窗；回传只影响位置、不影响
 *   开火节奏（hasZombieAhead 仅需 z.x>90），故定身覆盖率/DPS 与真实行进场景同分布。
 * - 「真实行程」场景（M2/M4）：不回传、不干预，测到击杀或进屋为止。
 * - 控制口径双轨：严格=freezeT>0 秒数占比；宽松=严格 + 0.5×chill 减速折算
 *   （chill=×0.6 即 −40% 速度，0.5×0.4×slowT占比）。冻结期 slowT 照常递减（源码
 *   L1631 不受 frozen 门控），故宽松口径对并存场景略保守，取整说明见报告。
 * - 黄油计数（★ v1.7 口径改造）：以【applyFreeze 调用次数】为准（instrument() 包装
 *   sandbox.applyFreeze 计数，直中黄油必触发该单点）。旧口径「freezeT 从 ≤0 跨到 >0 记 1 次」
 *   依赖「射速 2.6s > 定身 2.5s ⇒ 不可能刷新式续冻」的旧前提；R-A 后 T=3.0s > 2.6s，
 *   连发黄油（0.27²≈7.3%）会在僵尸仍冻结时命中 ⇒ 无跨 0 事件 ⇒ 漏计。故改用调用次数，
 *   并保留「freezeT 重置事件」（帧间 freezeT 不降反升）作交叉校验字段 legacyButters/resetEvents。
 *   射击数用 SFX.melonThrow/shoot 计数包装（corn/投掷类走 melonThrow，pea/snowpea 走 shoot，
 *   场景内无其它来源）。
 * - 每帧步长 dt=1/60s，与游戏帧驱动的 dt 语义一致；覆盖率量化误差 ≤1 帧。
 *
 * 【测量项】
 *   M1 定身覆盖率     单 corn vs 单 normal，≥60s 窗 ×24 种子
 *   M2 位移抑制       无植物 / corn(100) / pea(100) 三臂 ×20 种子，真实行程到进屋或击杀
 *   M3 每阳光性价比   6 投手/射手单目标稳态 DPS + 每 100 阳光 DPS + 严格/宽松控制
 *   M4 高压锁死判定   地狱 bucket(1008hp/15.6速) vs 单 corn ×20 种子，真实行程
 *   M5 组合叠加       corn+icemelon vs 各自单独（地狱 bucket 存活靶 ×8 种子）
 *   M6 多 corn 叠加   1/2/3 株 corn 同排 + 地狱 bucket（存活靶测纯覆盖率 ×6 + 真实行程判锁死 ×10）
 *   P  概率校验       黄油实测命中率聚合 ≥2000 次发射（验收 27%）
 * ==========================================================================*/

const fs = require('fs');
const path = require('path');
const { loadGame } = require(path.join(__dirname, '..', 'harness', 'index.js'));

// 环境变量：PVZ_HTML_PATH 覆盖被测源码（前后对比）；PVZ_BALANCE_OUT 覆盖输出文件名
const HTML_PATH = process.env.PVZ_HTML_PATH || undefined;
const OUT_FILE = process.env.PVZ_BALANCE_OUT || 'v16-butter-balance-results.json';

// ---------------- 常量口径（与源码对齐，注入用） ----------------
const DT = 1 / 60;
const ROW = 2;
const START_X = 800;
const HOME_X = 15;            // GRID_X(55) − 40，源码 L1673
const TELEPORT_X = 300;
const SURVIVOR_MULT = 200;    // 存活靶 hp 倍率
const BASE = { normal: [180, 16], cone: [340, 15], fast: [140, 45], bucket: [560, 12] };
const DIFF_EXPERT = { mult: 1.8, speed: 1.3 };   // 源码 L97
const COST = { corn: 100, pea: 100, cabbage: 100, snowpea: 175, melon: 175, icemelon: 300 };
const CORN = { p: 0.27, freezeT: 3.0, cd: 2.6, dmg: 15, splash: 30, splashRatio: 0.40 };   // ★ v1.7 R-A
const M3_TYPES = ['corn', 'pea', 'cabbage', 'snowpea', 'melon', 'icemelon'];

// ---------------- 工具 ----------------
const r4 = (v) => Math.round(v * 10000) / 10000;
const r2 = (v) => Math.round(v * 100) / 100;
function agg(arr) {
  const n = arr.length;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n);
  const s = arr.slice().sort((a, b) => a - b);
  return { n, mean: r4(mean), std: r4(std), min: r4(s[0]), median: r4(s[(n - 1) >> 1]), max: r4(s[n - 1]) };
}
function seeds(base, count) { return Array.from({ length: count }, (_, i) => base + i); }

// ---------------- 场景脚手架 ----------------
function freshGame(seed) {
  const g = loadGame({ seed, htmlPath: HTML_PATH });
  g.setLevel(1);
  g.startGame('butter-balance');
  g.forceWaves(5);   // wave=totalWaves ⇒ checkWave 自动推进恒关闭
  g.clearField();    // 清 forceWaves 残留 spawnQueue，waveActive=false
  return g;
}
function injectZombie(g, o) {
  g.sandbox.__zombies.push(Object.assign({
    type: 'normal', row: ROW, hp: 180, maxHp: 180, spd: 16, x: START_X,
    eating: false, eatAnim: 0, walk: 0, dead: false, freezeT: 0, slowT: 0, splashed: false,
  }, o));
}
function injectPlant(g, type, col) {
  g.sandbox.__plants.push({
    type, col, row: ROW, cd: 0, sunT: 0, armT: 0,
    dur: 900, maxDur: 900, plantT: 0, plantDone: true, dirtDone: true,
  });
}
function instrument(g) {
  const c = { melonThrow: 0, shoot: 0, freezeCalls: 0 };
  const S = g.sandbox.__SFX;
  S.melonThrow = function () { c.melonThrow++; };
  S.shoot = function () { c.shoot++; };
  // ★ v1.7 口径改造：包装顶层 function applyFreeze（经 sandbox 桥接可达，已验证内部直中调用
  //   会走到被替换后的 globalThis.applyFreeze ⇒ freezeCalls = 直中黄油次数，刷新式续冻亦计入）。
  const orig = g.sandbox.applyFreeze;
  if (typeof orig === 'function') {
    g.sandbox.applyFreeze = function (z) { c.freezeCalls++; return orig(z); };
  }
  return c;
}

// 主模拟循环：逐帧 tick(1/60)，帧间读沙箱实体字段
function simulate(g, opts) {
  const steps = Math.ceil(opts.duration / DT);
  let t = 0, frozenT = 0, slowT = 0, unionT = 0, retSum = 0, frames = 0, dmg = 0;
  let legacyButters = 0, resetEvents = 0, home = false, killed = false, lastX = START_X;
  let eatT = null, plantDeathT = null;
  for (let i = 0; i < steps; i++) {
    const z = g.sandbox.__zombies[0];
    if (!z || z.dead) { killed = true; break; }
    const preHp = z.hp, preFreeze = z.freezeT || 0;
    if (eatT === null && z.eating) eatT = t;
    g.tick(DT); t += DT;
    const z2 = g.sandbox.__zombies[0];
    if (!z2 || z2.dead) { killed = true; lastX = Math.min(lastX, z2 ? z2.x : lastX); break; }
    if (plantDeathT === null && g.sandbox.__plants.length === 0) plantDeathT = t;
    const postFreeze = z2.freezeT || 0;
    const frozen = postFreeze > 0, slowed = (z2.slowT || 0) > 0;
    dmg += Math.max(0, preHp - z2.hp);
    if (preFreeze <= 0 && frozen) legacyButters++;          // 旧口径（跨 0 事件；T>cd 时漏计连发）
    if (postFreeze > preFreeze + 1e-9) resetEvents++;       // 新交叉校验（freezeT 帧间不降反升）
    if (frozen) frozenT += DT;
    if (slowed) slowT += DT;
    if (frozen || slowed) unionT += DT;
    retSum += frozen ? 0 : (slowed ? 0.6 : 1);
    frames++;
    lastX = z2.x;
    if (z2.x <= HOME_X + 0.5) { home = true; break; }
    if (opts.teleport != null && z2.x < opts.teleport) z2.x = START_X;
  }
  // ★ v1.7：权威黄油计数 = applyFreeze 调用次数（含刷新式续冻）；无 counter 时回退旧口径
  const butters = (opts.cnt && typeof opts.cnt.freezeCalls === 'number') ? opts.cnt.freezeCalls : legacyButters;
  return {
    t, frames, frozenT, slowT, unionT,
    retention: frames ? retSum / frames : 0,
    dmg, butters, legacyButters, resetEvents, home, killed, lastX, eatT, plantDeathT,
  };
}

// ---------------- P · 黄油概率校验（≥2000 发射聚合） ----------------
function measureButterProbability() {
  const list = [];
  let shots = 0, butters = 0, legacy = 0, resets = 0;
  for (const seed of seeds(6101, 40)) {
    const g = freshGame(seed);
    const cnt = instrument(g);
    injectZombie(g, { hp: 180 * SURVIVOR_MULT, maxHp: 180 * SURVIVOR_MULT });
    injectPlant(g, 'corn', 0);
    const r = simulate(g, { duration: 150, teleport: TELEPORT_X, cnt: cnt });
    shots += cnt.melonThrow; butters += r.butters; legacy += r.legacyButters; resets += r.resetEvents;
    list.push({ seed, shots: cnt.melonThrow, butters: r.butters, legacyButters: r.legacyButters, resetEvents: r.resetEvents });
  }
  return {
    totalShots: shots, totalButters: butters, pMeasured: r4(butters / shots), pExpected: CORN.p,
    countMethod: 'applyFreeze 调用次数（含刷新式续冻）',
    legacyTotalButters: legacy, legacyPMeasured: r4(legacy / shots),
    resetEventsTotal: resets,
    note: 'legacy=旧「跨 0」口径；resetEvents=freezeT 帧间重置口径（应与 freezeCalls 一致）',
    perSeed: list,
  };
}

// ---------------- M1 · 定身覆盖率（单 corn vs 单 normal，存活靶） ----------------
function measureM1() {
  const list = seeds(1101, 24).map((seed) => {
    const g = freshGame(seed);
    const cnt = instrument(g);
    injectZombie(g, { hp: 180 * SURVIVOR_MULT, maxHp: 180 * SURVIVOR_MULT });
    injectPlant(g, 'corn', 0);
    const r = simulate(g, { duration: 72, teleport: TELEPORT_X, cnt: cnt });
    return {
      seed, windowT: r2(r.t), shots: cnt.melonThrow, butters: r.butters,
      legacyButters: r.legacyButters, resetEvents: r.resetEvents,
      frozenT: r2(r.frozenT), coverage: r4(r.frozenT / r.t),
    };
  });
  return {
    perSeed: list,
    coverageAgg: agg(list.map((x) => x.coverage)),
    butterShareAgg: agg(list.map((x) => x.butters / Math.max(1, x.shots))),
    legacyButterShareAgg: agg(list.map((x) => x.legacyButters / Math.max(1, x.shots))),
    shotsPerSeedAgg: agg(list.map((x) => x.shots)),
    countMethod: 'butters=applyFreeze 调用次数；legacyButters=旧跨 0 口径（对照）',
    note: '72s 观测窗（x<300 回传 x=800 保持目标在场，freezeT 不清零）；coverage=frozenT/窗口',
  };
}

// ---------------- M2 · 位移抑制（真实行程：进屋或击杀） ----------------
function measureM2() {
  const armSeeds = seeds(2101, 20);
  function arm(plantType) {
    const rows = armSeeds.map((seed) => {
      const g = freshGame(seed);
      const cnt = instrument(g);
      if (plantType) injectPlant(g, plantType, 0);
      injectZombie(g, {});
      const r = simulate(g, { duration: 120, teleport: null, cnt: cnt });
      const finalX = r.home ? HOME_X : r.lastX;
      return {
        seed, outcome: r.home ? 'home' : 'killed', time: r2(r.t), finalX: r2(finalX),
        avgNetSpeed: r4((START_X - finalX) / r.t),
        frozenT: r2(r.frozenT), frozenFrac: r4(r.frozenT / r.t),
        dmgDealt: r2(r.dmg), shots: cnt.melonThrow + cnt.shoot,
      };
    });
    const homeRows = rows.filter((x) => x.outcome === 'home');
    return {
      perSeed: rows,
      timeAgg: agg(rows.map((x) => x.time)),
      avgNetSpeedAgg: agg(rows.map((x) => x.avgNetSpeed)),
      frozenFracAgg: agg(rows.map((x) => x.frozenFrac)),
      homeCount: homeRows.length,
      killedCount: rows.filter((x) => x.outcome === 'killed').length,
    };
  }
  return {
    none: arm(null),
    corn: arm('corn'),
    pea: arm('pea'),
    note: '真实行程 x:800→15（进屋判定 GRID_X-40），到进屋或被击杀为止；avgNetSpeed=净位移/总耗时',
  };
}

// ---------------- M3 · 每阳光性价比（单目标稳态，存活靶） ----------------
function measureM3() {
  const types = {};
  const seedList = seeds(3101, 8);
  for (const type of M3_TYPES) {
    const rows = seedList.map((seed) => {
      const g = freshGame(seed);
      const cnt = instrument(g);
      injectZombie(g, { hp: 180 * SURVIVOR_MULT, maxHp: 180 * SURVIVOR_MULT });
      injectPlant(g, type, 0);
      const r = simulate(g, { duration: 100, teleport: TELEPORT_X, cnt: cnt });
      const dps = r.dmg / r.t;
      const strict = r.frozenT / r.t;
      const loose = strict + 0.5 * 0.4 * (r.slowT / r.t);   // 0.5×chill 减速(−40%)折算
      return {
        seed, dps: r4(dps), per100sun: r4(dps * 100 / COST[type]),
        strictCtrl: r4(strict), looseCtrl: r4(loose),
        shots: type === 'pea' || type === 'snowpea' ? cnt.shoot : cnt.melonThrow,
      };
    });
    types[type] = {
      cost: COST[type],
      dpsAgg: agg(rows.map((x) => x.dps)),
      per100sunAgg: agg(rows.map((x) => x.per100sun)),
      strictCtrlAgg: agg(rows.map((x) => x.strictCtrl)),
      looseCtrlAgg: agg(rows.map((x) => x.looseCtrl)),
      perSeed: rows,
    };
  }
  return {
    types,
    note: '单 normal 存活靶(hp×200) 100s 稳态窗；严格=freeze 占比；宽松=freeze+0.5×slow(−40%)折算；单目标无溅射受益',
  };
}

// ---------------- M4 · 高压锁死判定（地狱 bucket 真实行程） ----------------
function measureM4() {
  const hp = Math.round(BASE.bucket[0] * DIFF_EXPERT.mult);   // 1008
  const spd = +(BASE.bucket[1] * DIFF_EXPERT.speed).toFixed(2); // 15.6
  const rows = seeds(4101, 20).map((seed) => {
    const g = freshGame(seed);
    const cnt = instrument(g);
    injectZombie(g, { type: 'bucket', hp, maxHp: hp, spd });
    injectPlant(g, 'corn', 0);
    const r = simulate(g, { duration: 240, teleport: null, cnt: cnt });
    const finalX = r.home ? HOME_X : r.lastX;
    return {
      seed, outcome: r.home ? 'home' : 'killed', time: r2(r.t),
      butters: r.butters, frozenT: r2(r.frozenT), frozenFrac: r4(r.frozenT / r.t),
      netDisp: r2(START_X - finalX), hpRemaining: r2(Math.max(0, r.lastX >= 0 && r.home ? 'n/a' : hp - r.dmg)),
      dmgDealt: r2(r.dmg), shots: cnt.melonThrow,
      eatStartT: r.eatT == null ? null : r2(r.eatT),
      plantDeathT: r.plantDeathT == null ? null : r2(r.plantDeathT),
    };
  });
  const hpRemainingClean = rows.map((x) => (x.hpRemaining === 'n/a' ? null : x.hpRemaining));
  return {
    target: { type: 'bucket', hp, spd, diff: 'expert(×1.8血/×1.3速)' },
    perSeed: rows,
    buttersAgg: agg(rows.map((x) => x.butters)),
    frozenTAgg: agg(rows.map((x) => x.frozenT)),
    frozenFracAgg: agg(rows.map((x) => x.frozenFrac)),
    timeAgg: agg(rows.map((x) => x.time)),
    netDispAgg: agg(rows.map((x) => x.netDisp)),
    homeCount: rows.filter((x) => x.outcome === 'home').length,
    killedCount: rows.filter((x) => x.outcome === 'killed').length,
    hpRemainingAtHome: hpRemainingClean.filter((v) => v != null).length ? null : null,
    hpRemainingList: hpRemainingClean,
    note: '真实行程，单 corn col0；eatStartT=僵尸开始啃玉米时刻，plantDeathT=玉米被啃穿时刻',
  };
}

// ---------------- M5 · 组合叠加（corn+icemelon vs 各自单独，地狱 bucket 存活靶） ----------------
function measureM5() {
  const hp = Math.round(BASE.bucket[0] * DIFF_EXPERT.mult) * SURVIVOR_MULT;
  const spd = +(BASE.bucket[1] * DIFF_EXPERT.speed).toFixed(2);
  const arms = { corn: [['corn', 0]], icemelon: [['icemelon', 0]], both: [['corn', 0], ['icemelon', 1]] };
  const out = {};
  for (const [name, plants] of Object.entries(arms)) {
    const rows = seeds(5101, 8).map((seed) => {
      const g = freshGame(seed);
      const cnt = instrument(g);
      injectZombie(g, { type: 'bucket', hp, maxHp: hp, spd });
      for (const [t, col] of plants) injectPlant(g, t, col);
      const r = simulate(g, { duration: 90, teleport: TELEPORT_X, cnt: cnt });
      return {
        seed, dps: r4(r.dmg / r.t),
        frozenFrac: r4(r.frozenT / r.t),
        slowFrac: r4(r.slowT / r.t),
        unionFrac: r4(r.unionT / r.t),
        speedRetention: r4(r.retention),   // 平均行进速度保持率：frozen→0、slowed→0.6、自由→1
      };
    });
    out[name] = {
      frozenFracAgg: agg(rows.map((x) => x.frozenFrac)),
      slowFracAgg: agg(rows.map((x) => x.slowFrac)),
      unionFracAgg: agg(rows.map((x) => x.unionFrac)),
      speedRetentionAgg: agg(rows.map((x) => x.speedRetention)),
      dpsAgg: agg(rows.map((x) => x.dps)),
      perSeed: rows,
    };
  }
  const fc = out.corn.frozenFracAgg.mean, si = out.icemelon.slowFracAgg.mean;
  out.analysis = {
    sumOfParts: r4(Math.min(1, fc + si)),
    bothUnion: out.both.unionFracAgg.mean,
    superAdditive: r4(out.both.unionFracAgg.mean - Math.min(1, fc + si)),
    note: 'superAdditive>0 ⇒ 组合超过部件和（锁死效应）；speedRetention 越低越接近锁死',
  };
  return out;
}

// ---------------- M6 · 多 corn 叠加（链式续冻风险，设计稿 §3.3③ 唯一未测点） ----------------
function measureM6() {
  const hpReal = Math.round(BASE.bucket[0] * DIFF_EXPERT.mult);      // 1008
  const spd = +(BASE.bucket[1] * DIFF_EXPERT.speed).toFixed(2);      // 15.6
  const hpSurv = hpReal * SURVIVOR_MULT;
  const ARMS = [['corn1', 0], ['corn2', 1], ['corn3', 2]];           // [名, 额外 corn 数（col0..colN）]

  // (a) 存活靶：纯控制覆盖率（无输出死亡干扰），测多 corn 链式续冻占比
  const survivor = {};
  for (const [name, extra] of ARMS) {
    const rows = seeds(6101, 6).map((seed) => {
      const g = freshGame(seed);
      const cnt = instrument(g);
      injectZombie(g, { type: 'bucket', hp: hpSurv, maxHp: hpSurv, spd });
      for (let i = 0; i <= extra; i++) injectPlant(g, 'corn', i);
      const r = simulate(g, { duration: 90, teleport: TELEPORT_X, cnt: cnt });
      return {
        seed, frozenFrac: r4(r.frozenT / r.t), unionFrac: r4(r.unionT / r.t),
        speedRetention: r4(r.retention), dps: r4(r.dmg / r.t),
        butters: cnt.freezeCalls, shots: cnt.melonThrow,
        butterShare: r4(cnt.freezeCalls / Math.max(1, cnt.melonThrow)),
      };
    });
    survivor[name] = {
      nCorn: extra + 1,
      frozenFracAgg: agg(rows.map((x) => x.frozenFrac)),
      unionFracAgg: agg(rows.map((x) => x.unionFrac)),
      speedRetentionAgg: agg(rows.map((x) => x.speedRetention)),
      buttersAgg: agg(rows.map((x) => x.butters)),
      shotsAgg: agg(rows.map((x) => x.shots)),
      dpsAgg: agg(rows.map((x) => x.dps)),
      perSeed: rows,
    };
  }

  // (b) 真实行程：单/多 corn vs 地狱 bucket，判「是否进屋 / 击杀 / 超时未进门（卡死）」
  const real = {};
  for (const [name, extra] of ARMS) {
    const rows = seeds(6201, 10).map((seed) => {
      const g = freshGame(seed);
      const cnt = instrument(g);
      injectZombie(g, { type: 'bucket', hp: hpReal, maxHp: hpReal, spd });
      for (let i = 0; i <= extra; i++) injectPlant(g, 'corn', i);
      const r = simulate(g, { duration: 240, teleport: null, cnt: cnt });
      const finalX = r.home ? HOME_X : r.lastX;
      const outcome = r.home ? 'home' : (r.killed ? 'killed' : 'timeout');
      return {
        seed, outcome: outcome, time: r2(r.t), frozenFrac: r4(r.frozenT / r.t),
        netDisp: r2(START_X - finalX), butters: cnt.freezeCalls,
        plantDeathT: (r.plantDeathT == null ? null : r2(r.plantDeathT)),
      };
    });
    real[name] = {
      nCorn: extra + 1,
      homeCount: rows.filter((x) => x.outcome === 'home').length,
      killedCount: rows.filter((x) => x.outcome === 'killed').length,
      timeoutCount: rows.filter((x) => x.outcome === 'timeout').length,
      frozenFracAgg: agg(rows.map((x) => x.frozenFrac)),
      timeAgg: agg(rows.map((x) => x.time)),
      buttersAgg: agg(rows.map((x) => x.butters)),
      perSeed: rows,
    };
  }

  const sf = (n) => survivor[n].frozenFracAgg.mean;
  const sr = (n) => survivor[n].speedRetentionAgg.mean;
  const anyTimeout = ARMS.some(([n]) => real[n].timeoutCount > 0);
  return {
    target: { type: 'bucket', hpReal: hpReal, hpSurv: hpSurv, spd: spd },
    survivor: survivor,
    real: real,
    analysis: {
      frozenFracByArm: { corn1: sf('corn1'), corn2: sf('corn2'), corn3: sf('corn3') },
      speedRetentionByArm: { corn1: sr('corn1'), corn2: sr('corn2'), corn3: sr('corn3') },
      realHomeByArm: { corn1: real.corn1.homeCount, corn2: real.corn2.homeCount, corn3: real.corn3.homeCount },
      realTimeoutByArm: { corn1: real.corn1.timeoutCount, corn2: real.corn2.timeoutCount, corn3: real.corn3.timeoutCount },
      anyRealTimeout: anyTimeout,
      lockupThreshold: 0.99,
      lockupVerdict: anyTimeout
        ? '存在超时未进门（疑似锁死，需人工复核）'
        : '3 臂真实行程均无超时（僵尸或在 240s 内进屋/被击杀）⇒ 未构成锁死',
      note: '多 corn 同排，col0/col1/col2 递增；survivor=纯控制覆盖率（无死亡干扰），real=真实行程判进屋/击杀/超时',
    },
  };
}

// ---------------- 削弱档位反事实推算（模型，基于测量参数） ----------------
function nerfModel(m1) {
  // 模型：稳态覆盖率 uptime ≈ p×T/cd（p×T<cd 时不饱和；p×T>cd 时按 min(1,·) 封顶，实测 M1 校验记入报告）
  const cadence = r4(1 / (m1.shotsPerSeedAgg.mean / 72));   // 实测平均射击间隔
  const cur = { p: CORN.p, T: CORN.freezeT };
  const cases = [
    { label: 'v1.6 基线 p=25% T=2.5s', p: 0.25, T: 2.5 },
    { label: 'v1.7 现行(R-A) p=27% T=3.0s', p: 0.27, T: 3.0 },
    { label: '回退阀1 概率 p=25% T=3.0s', p: 0.25, T: 3.0 },
    { label: '回退阀2 定身 T=2.5s p=27%', p: 0.27, T: 2.5 },
  ];
  const baseUptime = Math.min(1, (cur.p * cur.T) / cadence);
  return {
    measuredCadence: cadence,
    currentLabel: 'v1.7 现行(R-A) p=27% T=3.0s',
    cases: cases.map((c) => {
      const uptime = Math.min(1, (c.p * c.T) / cadence);
      return { ...c, modelUptime: r4(uptime), relVsV17: r4(uptime / baseUptime - 1) };
    }),
    pxDeniedPerButter: { normal: r2(16 * cur.T), expertBucket: r2(15.6 * cur.T), note: '每枚黄油 denies 的僵尸行程 px（v×T）' },
  };
}

// ---------------- 主流程 ----------------
function main() {
  const t0 = Date.now();
  console.log('[1/7] 黄油概率校验（40 种子 × 150s）...');
  const prob = measureButterProbability();
  console.log(`      shots=${prob.totalShots} butters=${prob.totalButters} p=${prob.pMeasured}（legacy=${prob.legacyPMeasured}）`);

  console.log('[2/7] M1 定身覆盖率（24 种子 × 72s）...');
  const m1 = measureM1();
  console.log(`      coverage mean=${m1.coverageAgg.mean} ±${m1.coverageAgg.std}`);

  console.log('[3/7] M2 位移抑制（3 臂 × 20 种子）...');
  const m2 = measureM2();

  console.log('[4/7] M3 每阳光性价比（6 种植物 × 8 种子 × 100s）...');
  const m3 = measureM3();

  console.log('[5/7] M4 高压锁死（地狱 bucket × 20 种子）...');
  const m4 = measureM4();
  console.log(`      home=${m4.homeCount}/20 killed=${m4.killedCount}/20 frozenFrac=${m4.frozenFracAgg.mean}`);

  console.log('[6/7] M5 组合叠加（3 臂 × 8 种子）...');
  const m5 = measureM5();

  console.log('[7/7] M6 多 corn 叠加（1/2/3 株 × 存活靶 + 真实行程）...');
  const m6 = measureM6();
  console.log(`      survivor frozenFrac corn1/2/3=${m6.analysis.frozenFracByArm.corn1}/${m6.analysis.frozenFracByArm.corn2}/${m6.analysis.frozenFracByArm.corn3}`);
  console.log(`      real home corn1/2/3=${m6.analysis.realHomeByArm.corn1}/${m6.analysis.realHomeByArm.corn2}/${m6.analysis.realHomeByArm.corn3} · timeout=${m6.analysis.realTimeoutByArm.corn1}/${m6.analysis.realTimeoutByArm.corn2}/${m6.analysis.realTimeoutByArm.corn3}`);

  // 源码常量核对快照（证明测量与 CARDS 对齐）
  const g0 = freshGame(999999);
  const cardsSnap = g0.sandbox.__CARDS.map((c) => ({ type: c.type, cost: c.cost, cd: c.cd, dur: c.dur }));
  const costMismatch = M3_TYPES.filter((t) => {
    const c = cardsSnap.find((x) => x.type === t);
    return !c || c.cost !== COST[t];
  });

  const out = {
    meta: {
      task: 'R1 黄油定身强度复核（v1.6 KNOWN-ISSUES）· v1.7 D-3 R-A 复跑（27%/3.0s）',
      gameVersion: g0.sandbox.__VERSION,
      date: new Date().toISOString().slice(0, 10),
      htmlPath: HTML_PATH || '(default: plants-vs-zombies.html)',
      countMethod: 'applyFreeze 调用次数（v1.7 口径改造；legacy=旧跨 0 口径对照）',
      dt: DT, survivorMult: SURVIVOR_MULT, startX: START_X, homeX: HOME_X, teleportX: TELEPORT_X,
      corn: CORN, expertBucket: { hp: Math.round(BASE.bucket[0] * DIFF_EXPERT.mult), spd: +(BASE.bucket[1] * DIFF_EXPERT.speed).toFixed(2) },
      cardsSnapshot: cardsSnap, costMismatch,
      runtimeMs: Date.now() - t0,
      repro: 'node tests/playtests/v16-butter-balance.js（种子区间见各测量 perSeed）',
    },
    butterProbability: prob,
    M1: m1,
    M2: m2,
    M3: m3,
    M4: m4,
    M5: m5,
    M6: m6,
    nerfModel: nerfModel(m1),
  };
  const outPath = path.isAbsolute(OUT_FILE) ? OUT_FILE : path.join(__dirname, OUT_FILE);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
  console.log('已写出: ' + outPath + `（用时 ${((Date.now() - t0) / 1000).toFixed(1)}s）`);
  if (costMismatch.length) console.log('!! 造价与 CARDS 不一致: ' + costMismatch.join(','));
}

main();
