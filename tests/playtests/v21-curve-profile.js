'use strict';
/* ============================================================================
 * tests/playtests/v21-curve-profile.js — T-301 · v2.1.0 20 关难度曲线画像
 * ----------------------------------------------------------------------------
 * 目的：对 v2.1.0「内容填充版」20 个可玩关卡（1-1..1-10 + 2-1..2-10）做难度
 *       画像，找出手写 waves 中的离群关（明显过难 / 过易）。发布前最后一道内容
 *       质量关。纯测量：源码零改动，只新增本脚本 / results.json / 报告。
 *
 * 【T-301b 增补】Part B：对 T-301 首轮 4 种子下各 1/4 失守的 1-7/1-9/2-4，
 *   追加 4 种子（避开 9200-9393 段）加密到 8 种子复核；结论见 results.partB 与
 *   报告「T-301b 修补验证」章。（Part A 的 1-3~1-5 手写 waves 属源码改动，不在本脚本内。）
 *
 * 口径（用户拍板 + 本脚本裁量，见报告 §1）：
 *   ①每关 4 个种子（20×4=80 局；T-301b 对 1-7/1-9/2-4 各加密到 8 种子 ⇒ 共 92 局），bot=普通档通用混合防线。
 *   ②阳光【不锁】（真实经济）：startGame 后 sun=level.startSun，自然掉落 + 向日葵
 *     产阳光由 bot 真实点击收集。理由：普通玩家必须赚阳光；世界 2 的睡莲税
 *     （水行先铺 25 阳光睡莲）与逐关 startSun（100/150/175）正是世界 2 的核心难度
 *     特征，锁阳光会把它们一并抹掉。
 *   ③难度档=默认 DIFF='normal'（DIFFS.normal mult=1.0 speed=1.0）。
 *   ④bot 只读 g.probe() 决策，绝不消费随机数 ⇒ 同种子逐字节可复现。
 *
 * 【关键机制锚点（已核源码，勿臆造）】
 *   - 真实波次推进必须走 g.tick(dt)（harness 外置时钟推 gt）；__updateRaw 不推 gt
 *     ⇒ wave 恒 0 永不开波（R10 坑）。
 *   - 关卡按键寻址 g.setLevel('1-1')..('2-10')；g.sandbox.__LEVELS[key] 读关卡定义。
 *   - 种植真实路径：g.selectCard(CARDS下标) → g.clickGrid(col,row)（受 canPlant/
 *     扣费/cardCD 全约束）。selectCard 走 CARDS 下标，onClick 按 selected.type
 *     解析卡片 ⇒ 绕开 deck 组合（deck 是元进度语义，非战斗语义）。
 *   - cardCD 是【按卡片类型】的全局冷却（非按格）：peas/sunflower/lilypad 5s、nut 20s。
 *   - 水行 WATER_ROWS=[1,3]（0-indexed）：canPlant 要求水行先铺 lilypad 才能种其它。
 *     ⇒ 水行单位实际需「睡莲 + 主体」两次种植 + 两次卡冷。
 *   - 阳光收集走 onClick 命中（effects kind='sun'，半径 40px）——必须先收阳光再种植，
 *     否则种植点击可能被同位置阳光「抢走」。
 *   - 失败阈值：z.x < GRID_X-40 (=15) 即进屋（updateZombies L2127）。
 *
 * 【隐含前提（脚本内机器校验，勿只写注释）】
 *   P1) v2.1 关卡数据在位：1-7..1-10 手写（totalWaves 7/8/9/10）、2-10=10、2-6 fog
 *       且 waves ≠ 2-1。此断言即【旧源判别力】，见 §5（指向 v2.0.1 复跑必红）。
 *   P2) LEVELS 桥 / CARDS 桥 / __consts.WATER_ROWS 就位。
 *   P3) 离群判定器非空转：合成正样本（已知 dip / 已知 0 通关率 / 已知超填）必须被判
 *       出，负样本（单调无离群）必须判无 —— 能证伪的口径。
 *
 * 跑法（裸 node 不挂 PATH，用绝对路径）：
 *   "C:/Users/weixufeng/.workbuddy/binaries/node/versions/22.22.2-3/node.exe" \
 *     tests/playtests/v21-curve-profile.js
 * 环境变量：PVZ_HTML_PATH 覆盖被测源码（指向 v2.0.1 旧源复跑 ⇒ 主断言 P1 必红）。
 *
 * 产出：tests/playtests/v21-curve-profile-results.json + production/v21-curve-profile-report.md
 * 纪律：本任务只新增文件、不改任何既有文件；禁 commit / 禁 push。
 * ==========================================================================*/

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execSync } = require('child_process');
const { loadGame } = require(path.join(__dirname, '..', 'harness', 'index.js'));
const P = require(path.join(__dirname, 'lib', 'prelude.js'));

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT_JSON = path.join(__dirname, 'v21-curve-profile-results.json');
const DT = P.DT;
const BOT_DT = 0.25;         // bot 决策节拍
const MAX_T = 600;           // 单局硬顶（秒）；正常 150-470s
const SEEDS_PER_LEVEL = 4;   // 用户拍板：每关 4 种子
const SEED_BASE = 9200;      // 避开 R7(6101)/哨兵(6201/6301)/R10(8101) 段
const LEAK_X = 150;          // 「泄漏危险区」阈值：僵尸 x ≤ 150 记为一次深渗透
const V201_REF = 'v2.0.1';   // 旧源判别力参照标签

// ---- T-301b Part B：对 4 种子下各 1/4 失守的三关加密到 8 种子复核（追加 4 种子，避开 9200-9393 段）----
const SEED_OVERRIDE = {
  '1-7': [9500, 9501, 9502, 9503],
  '1-9': [9510, 9511, 9512, 9513],
  '2-4': [9520, 9521, 9522, 9523],
};
const PARTB_KEYS = Object.keys(SEED_OVERRIDE);

// ---- 20 关有序列表（世界内 l 升序）----
const LEVEL_KEYS = [];
for (let w = 1; w <= 2; w++) for (let l = 1; l <= 10; l++) LEVEL_KEYS.push(w + '-' + l);

// ---- bot 防线（普通档通用混合防线）----
// 列角色：col0=向日葵（经济，上限 4 株）、col1..4=豌豆（输出，逐行铺开）、col6=坚果（前排阻挡）。
// 决策=【严格优先级 + 等待】：受威胁行优先补豌豆 → 经济未达上限补向日葵 → 逐格铺豌豆 →
// 补坚果。严格语义（头项买不起/冷却中就等，不跳去种更便宜的）是刻意设计——贪婪「首个可负担」
// 会被 25 阳光睡莲/50 阳光向日葵「偷走」预算，导致豌豆建不起来（实测首版即此法全关失守）。
const PEA_COLS = [1, 2, 3, 4];
const NUT_COL = 6;
const SF_COL = 0;
const SF_TARGET = 4;         // 经济上限（4 株向日葵）
const NUT_TARGET = 5;        // 坚果上限（每行 1）

// 僵尸威胁权重（hp 归一，静态内容分；客观，不引入主观手感权重）
const HP = { normal: 180, cone: 340, fast: 140, bucket: 560 };

// ---------------- 工具 ----------------
const median = (arr) => {
  if (!arr || !arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  return s[(s.length - 1) >> 1];
};
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const r3 = (v) => Math.round(v * 1000) / 1000;
function makeStore() {
  const d = {};
  return { getItem: (k) => (d[k] != null ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}
/** 异步 git show（避开会话级 spawnSync EBUSY 坑；照抄 v21-world2-open.js）。 */
function gitShow(ref, file) {
  return new Promise((resolve, reject) => {
    const p = spawn('git', ['show', ref + ':' + file], { cwd: REPO_ROOT, maxBuffer: 64 * 1024 * 1024 });
    const out = []; let err = '';
    p.stdout.on('data', (d) => out.push(d));
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', (c) => (c === 0 ? resolve(Buffer.concat(out)) : reject(new Error('git show ' + ref + ' exit=' + c + ' ' + err))));
  });
}

// ---------------- v2.1 关卡数据签名（旧源判别力锚点）----------------
/** 判据：v2.1 手写 M1/M2 关卡数据在位。旧源（v2.0.1）此函数必假。 */
function hasV21LevelData(L) {
  try {
    if (!L) return false;
    const w17 = L['1-7'] && L['1-7'].totalWaves;
    const w18 = L['1-8'] && L['1-8'].totalWaves;
    const w19 = L['1-9'] && L['1-9'].totalWaves;
    const w110 = L['1-10'] && L['1-10'].totalWaves;
    const w210 = L['2-10'] && L['2-10'].totalWaves;
    const fogProbe = L['2-6'] && L['2-6'].time === 'fog' && L['2-6'].waves &&
      JSON.stringify(L['2-6'].waves) !== JSON.stringify(L['2-1'] && L['2-1'].waves);
    return w17 === 7 && w18 === 8 && w19 === 9 && w110 === 10 && w210 === 10 && !!fogProbe;
  } catch (e) { return false; }
}

/** 关卡静态指纹：zCount / threat(hp 归一) / big 波数 / 是否模板克隆。 */
function levelStatic(levelData, key) {
  const lv = levelData[key];
  const waves = lv.waves || [];
  let zCount = 0, threat = 0;
  for (const wv of waves) for (const s of (wv.spawns || [])) { zCount += s[1]; threat += s[1] * (HP[s[0]] || 180); }
  return {
    key, world: +key.split('-')[0], time: lv.time, water: !!lv.water, startSun: lv.startSun,
    totalWaves: lv.totalWaves, zCount, threat, bigCount: waves.filter((w) => w.big).length,
  };
}

// ---------------- bot：读数 → 至多一次种植（严格优先级） ----------------
function botTick(g, p, ctx) {
  const water = ctx.level.water, WR = ctx.waterRows;
  const occ = new Set(), pads = new Set();
  for (const pl of p.plantsArr) {
    occ.add(pl.type + '@' + pl.col + ',' + pl.row);
    if (pl.type === 'lilypad') pads.add(pl.col + ',' + pl.row);
  }
  const nSf = p.plantsArr.filter((q) => q.type === 'sunflower').length;
  const nNut = p.plantsArr.filter((q) => q.type === 'nut').length;
  const hasPea = (row) => PEA_COLS.some((c) => occ.has('pea@' + c + ',' + row));
  const firstPeaCol = (row) => PEA_COLS.find((c) => !occ.has('pea@' + c + ',' + row));
  // 受威胁行（最近僵尸 x 升序）：优先保障这些行有豌豆
  const thr = new Map();
  for (const z of p.zombiesArr) if (!z.dead && z.x < 820) { const cur = thr.get(z.row); if (cur == null || z.x < cur) thr.set(z.row, z.x); }
  const cells = [];
  for (const [row] of [...thr.entries()].sort((a, b) => a[1] - b[1])) if (!hasPea(row)) { const c = firstPeaCol(row); if (c != null) cells.push({ col: c, row, type: 'pea' }); }
  if (nSf < SF_TARGET) { for (let row = 0; row < 5; row++) if (!occ.has('sunflower@' + SF_COL + ',' + row)) { cells.push({ col: SF_COL, row, type: 'sunflower' }); break; } }
  for (const col of PEA_COLS) for (let row = 0; row < 5; row++) if (!occ.has('pea@' + col + ',' + row)) cells.push({ col, row, type: 'pea' });
  if (nNut < NUT_TARGET) { for (let row = 0; row < 5; row++) if (!occ.has('nut@' + NUT_COL + ',' + row)) { cells.push({ col: NUT_COL, row, type: 'nut' }); break; } }
  const head = cells[0];
  if (!head) return null;
  let req = head.type;
  if (water && WR.includes(head.row) && !pads.has(head.col + ',' + head.row)) req = 'lilypad';
  const c = ctx.cardMap[req];
  if (!c) return null;
  if ((p.cardCD[req] || 0) > 0) return null;   // 严格：头项冷却中 → 等
  if (p.sun < c.cost) return null;             // 严格：头项买不起 → 等
  const idx = ctx.cardIdx[req];
  const sel = p.selected;
  if (!sel || sel.type !== req) g.selectCard(idx);   // 同卡不重选（toggle 语义）
  g.clickGrid(head.col, head.row);
  return { planted: req, col: head.col, row: head.row, want: head.type };
}

// ---------------- 单局跑法 ----------------
function runLevel(key, seed, ctx) {
  const g = loadGame({ seed, htmlPath: ctx.htmlPath, localStorage: makeStore() });
  g.setLevel(key);
  g.startGame('curve-' + key);
  const sb = g.sandbox;

  const origKill = sb.killZombie;
  if (typeof origKill !== 'function') throw new Error('killZombie 沙箱桥缺失（击杀计数依赖）');
  let kills = 0;
  sb.killZombie = function (z) { kills++; return origKill(z); };
  g.enableSpawnCount();

  const seenPlants = new Set();
  const leaked = new Set();
  let minZX = Infinity, maxConc = 0, concSum = 0, frames = 0, sunsCollected = 0, plantAttempts = 0;
  let tNow = 0, botNext = 0, outcome = null, endProbe = null, breachWave = null;
  const p0 = g.probe();
  const sunStart = p0.sun;

  const steps = Math.ceil(MAX_T / DT);
  for (let i = 0; i < steps; i++) {
    g.tick(DT);
    tNow += DT;
    let conc = 0;
    for (const z of sb.__zombies) {
      if (!z || z.dead) continue;
      conc++;
      if (z.x < minZX) minZX = z.x;
      if (z.x <= LEAK_X) leaked.add(z);
    }
    if (conc > maxConc) maxConc = conc;
    concSum += conc; frames++;
    if (tNow >= botNext) {
      botNext += BOT_DT;
      const p = g.probe();
      if (p.state !== 'play') { endProbe = p; outcome = p.won ? 'win' : 'lose'; breachWave = p.won ? null : p.wave; break; }
      for (const pl of p.plantsArr) seenPlants.add(pl.type + '@' + pl.col + ',' + pl.row);
      // 先收阳光（onClick 命中先于种植）
      for (const e of p.effectsArr) { if (e.kind === 'sun' && !e.dead) { g.clickAt(e.x, e.y); sunsCollected++; } }
      const r = botTick(g, p, ctx);
      if (r) plantAttempts++;
    }
  }
  if (!outcome) {
    endProbe = g.probe();
    outcome = endProbe.state === 'play' ? 'timeout' : (endProbe.won ? 'win' : 'lose');
    if (outcome !== 'win') breachWave = endProbe.wave;
  }
  sb.killZombie = origKill;

  const pE = endProbe || g.probe();
  const planted = { sunflower: 0, pea: 0, nut: 0, lilypad: 0 };
  for (const s of seenPlants) { const t = s.split('@')[0]; if (planted[t] != null) planted[t]++; }

  return {
    levelKey: key, seed, outcome,
    endWave: pE.wave, totalWaves: ctx.level.totalWaves,
    gameT: P.r2(tNow), breachWave,
    botPlants: seenPlants.size, planted, plantAttempts,
    maxConcurrent: maxConc, avgConcurrent: r3(frames ? concSum / frames : 0),
    spawns: g.spawnCount(), kills,
    minZX: minZX === Infinity ? null : P.r2(minZX),
    breachDepth: P.r2(Math.max(0, (ctx.gridX) - minZX)),   // 进屋带以下=正
    leakCount: leaked.size,
    sunsCollected, sunStart, sunEnd: pE.sun,
  };
}

// ---------------- 单关聚合 ----------------
function aggLevel(key, runs, st, gridX) {
  const wins = runs.filter((r) => r.outcome === 'win').length;
  const losses = runs.filter((r) => r.outcome === 'lose').length;
  const timeouts = runs.filter((r) => r.outcome === 'timeout').length;
  const gts = runs.map((r) => r.gameT);
  const minZXs = runs.map((r) => (r.minZX == null ? 1000 : r.minZX));
  const breachWaves = runs.filter((r) => r.breachWave != null).map((r) => r.breachWave);
  const breachedRuns = runs.filter((r) => r.minZX != null && r.minZX <= gridX).length;
  const planted = { sunflower: 0, pea: 0, nut: 0, lilypad: 0 };
  for (const r of runs) for (const k of Object.keys(planted)) planted[k] += r.planted[k] || 0;
  return {
    key, world: st.world, time: st.time, water: st.water, startSun: st.startSun,
    totalWaves: st.totalWaves, zCount: st.zCount, threat: st.threat, bigCount: st.bigCount,
    winRate: P.r4(wins / runs.length), wins, losses, timeouts,
    gameT: { min: P.r2(Math.min(...gts)), median: P.r2(median(gts)), max: P.r2(Math.max(...gts)) },
    perWaveT: P.r2(median(gts) / st.totalWaves),
    endWaveMedian: median(runs.map((r) => r.endWave)),
    breachCount: losses, breachWaves,
    firstBreachWave: breachWaves.length ? Math.min(...breachWaves) : null,
    breachedRuns,                                   // 有僵尸抵达进屋带（x≤GRID_X）的局数
    minZXworst: P.r2(Math.min(...minZXs)),           // 最深渗透（最小 x）
    minZXmedian: P.r2(median(minZXs)),
    leakTotal: sum(runs.map((r) => r.leakCount)),
    maxConcurrentMedian: median(runs.map((r) => r.maxConcurrent)),
    avgConcurrentMedian: r3(median(runs.map((r) => r.avgConcurrent))),
    spawnsTotal: sum(runs.map((r) => r.spawns)),
    killsTotal: sum(runs.map((r) => r.kills)),
    sunsCollectedTotal: sum(runs.map((r) => r.sunsCollected)),
    planted, botPlantsMedian: median(runs.map((r) => r.botPlants)),
    runs,
  };
}

// ---------------- 离群判定（纯函数；被合成自检与主流程共用）----------------
/**
 * 阈值口径（报告 §4 同步披露）：
 *  - 过难（行为）：winRate ≤ 0.25（≤1/4 种子存活）。
 *  - 偏难（行为）：0.25 < winRate ≤ 0.75。
 *  - 失守（行为）：≥2 局有僵尸抵达进屋带（breachedRuns ≥ 2，即「稳定」失守）——即使全胜也提示
 *    该关对基准防线构成重复压力。**单局孤立失守（=1）归「种子级方差」，不计离群**，只作
 *    信息项 singleBreach 列示（对齐 T-301b「稳定 ≥1/8 vs 间歇」判定语义）。
 *  - 过易（内容）：threat < 0.70 × 该世界线性期望 threat 且 winRate = 1.0（内容欠填）。
 *  - 超载（内容）：threat > 1.40 × 线性期望 threat（内容过填，可能偏难）。
 * 线性期望 = 该世界首关→末关 threat 线性插值（世界内递进基线）。
 */
const TH = { tooHardWin: 0.25, edgeHardWin: 0.75, underFill: 0.70, overFill: 1.40 };
function detectOutliers(levels, gridX) {
  const out = { tooHard: [], edgeHard: [], breached: [], singleBreach: [], tooEasy: [], overFill: [], ramp: {} };
  for (const L of levels) {
    if (L.winRate <= TH.tooHardWin) out.tooHard.push(L.key);
    else if (L.winRate <= TH.edgeHardWin) out.edgeHard.push(L.key);
    // 失守·稳定=≥2 局抵达进屋带；单局孤立=种子级方差（信息项，非离群）
    const br = (L.breachedRuns != null) ? L.breachedRuns
      : ((L.minZXworst != null && L.minZXworst <= gridX) ? 1 : 0);
    if (br >= 2) out.breached.push(L.key);
    else if (br === 1) out.singleBreach.push(L.key);
  }
  const byWorld = {};
  for (const L of levels) (byWorld[L.world] = byWorld[L.world] || []).push(L);
  for (const w of Object.keys(byWorld)) {
    const arr = byWorld[w]; const n = arr.length;
    const t0 = arr[0].threat, t1 = arr[n - 1].threat;
    const ramp = [];
    for (let i = 0; i < n; i++) {
      const exp = n === 1 ? t0 : t0 + (t1 - t0) * i / (n - 1);
      const ratio = exp > 0 ? arr[i].threat / exp : 1;
      arr[i].rampRatio = P.r4(ratio);
      arr[i].rampExpected = P.r2(exp);
      ramp.push({ key: arr[i].key, threat: arr[i].threat, exp: P.r2(exp), ratio: P.r4(ratio) });
      if (ratio < TH.underFill && arr[i].winRate === 1.0) out.tooEasy.push(arr[i].key);
      if (ratio > TH.overFill) out.overFill.push(arr[i].key);
    }
    out.ramp['world' + w] = ramp;
  }
  return out;
}

// ---------------- 非零正样本自检（能证伪）----------------
function syntheticSelfCheck() {
  const mk = (key, winRate, threat, breachedRuns) => ({ key, world: +key.split('-')[0], winRate, threat, breachedRuns: breachedRuns || 0 });
  const A = [mk('1-1', 1, 10), mk('1-2', 1, 20), mk('1-3', 1, 30)];              // 负样本：单调全胜
  const B = [mk('1-1', 1, 30), mk('1-2', 1, 15), mk('1-3', 1, 30)];              // 正样本①：中段内容欠填
  const C = [mk('1-1', 0, 20), mk('1-2', 1, 22), mk('1-3', 1, 24)];              // 正样本②：通关率 0
  const D = [mk('1-1', 1, 10), mk('1-2', 1, 60), mk('1-3', 1, 20)];              // 正样本③：中段内容超填（端点≡基线，超填必须在端点之间）
  const E = [mk('1-1', 1, 10), mk('1-2', 1, 20, 2), mk('1-3', 1, 30)];           // 正样本④：稳定失守（2 局）
  const F = [mk('1-1', 1, 10), mk('1-2', 1, 20, 1), mk('1-3', 1, 30)];           // 负样本②：单局孤立失守（应归 singleBreach，非离群）
  const rA = detectOutliers(A, 55), rB = detectOutliers(B, 55), rC = detectOutliers(C, 55), rD = detectOutliers(D, 55), rE = detectOutliers(E, 55), rF = detectOutliers(F, 55);
  const checks = [
    { name: 'neg 无离群(单调全胜)', pass: rA.tooEasy.length === 0 && rA.tooHard.length === 0 && rA.overFill.length === 0 && rA.breached.length === 0 && rA.singleBreach.length === 0, got: JSON.stringify({ e: rA.tooEasy, h: rA.tooHard, o: rA.overFill, b: rA.breached, s: rA.singleBreach }) },
    { name: 'pos 内容欠填→tooEasy', pass: rB.tooEasy.includes('1-2'), got: JSON.stringify(rB.tooEasy) },
    { name: 'pos 通关率0→tooHard', pass: rC.tooHard.includes('1-1'), got: JSON.stringify(rC.tooHard) },
    { name: 'pos 内容超填→overFill', pass: rD.overFill.includes('1-2'), got: JSON.stringify(rD.overFill) },
    { name: 'pos 稳定失守(≥2局)→breached', pass: rE.breached.includes('1-2'), got: JSON.stringify(rE.breached) },
    { name: 'neg 单局失守→非离群(归 singleBreach)', pass: !rF.breached.includes('1-2') && rF.singleBreach.includes('1-2'), got: JSON.stringify({ b: rF.breached, s: rF.singleBreach }) },
  ];
  return { pass: checks.every((c) => c.pass), checks };
}

// ---------------- 主流程 ----------------
async function main() {
  const t0 = Date.now();
  const results = {
    meta: {
      task: 'T-301 v2.1.0 20 关难度曲线画像（PvZ Lite M3 首单元）',
      date: new Date().toISOString().slice(0, 10),
      node: process.version,
      htmlPath: P.htmlPath(),
      dt: DT, botDt: BOT_DT, maxT: MAX_T, seedsPerLevel: SEEDS_PER_LEVEL, seedBase: SEED_BASE,
      sunMode: 'REAL(unlocked) —— startGame sun=level.startSun，bot 真实点击收集自然/向日葵阳光',
      diff: 'normal（DIFFS.normal mult=1.0 speed=1.0，默认档）',
      botSpec: '严格优先级通用混合防线：受威胁行优先补豌豆 → col0 向日葵(≤4) → col1..4 逐行铺豌豆 → col6 坚果(≤5)；水行先睡莲；真实 selectCard→clickGrid；每 0.25s 至多一次种植；只读 probe 不消费随机数',
      outlierThresholds: TH,
      seedOverride: SEED_OVERRIDE,
      partBNote: 'T-301b Part B：对 4 种子下各 1/4 失守的 1-7/1-9/2-4 追加 4 种子加密到 8 种子复核',
      runtimeMs: null, git: {},
    },
    preconditions: null, gates: null,
    levels: {}, outliers: null, selfcheck: null, discriminator: null,
    partB: null, determinism: null, expectations: null, assertions: [], pass: false,
  };
  const assert = (name, pass, detail) => {
    results.assertions.push({ name, pass: !!pass, detail });
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail || ''}`);
    return pass;
  };

  // 跑前卫生
  try {
    const lines = execSync('git status --porcelain', { cwd: REPO_ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    results.meta.git.pre = { count: lines.length, lines };
    console.log(`[hygiene] git status pre: ${lines.length} 项`);
  } catch (e) { results.meta.git.pre = { error: e.message }; }

  // 七道门 bootstrap
  console.log('[bootstrap] 七道前置门 + 前提实测 ...');
  const { g: gBoot, pre, gates } = await P.bootstrap({});
  results.preconditions = pre;
  results.gates = { pass: gates.pass, failedGates: gates.failedGates, results: gates.results.map((r) => ({ gate: r.gate, name: r.name, pass: r.pass, detail: r.detail })) };
  for (const r of gates.results) console.log(`  gate${r.gate} ${r.pass ? 'PASS' : 'FAIL'} ${r.name} — ${r.detail}`);
  assert('七道前置门全过(gate1-6硬门)', gates.pass, gates.failedGates.join(',') || 'gate7 软门恒过');

  // P1：v2.1 关卡数据在位（旧源复跑此处必红）
  const L = gBoot.sandbox.__LEVELS;
  const v21ok = hasV21LevelData(L);
  assert('P1 前提：v2.1 手写关卡数据在位(1-7..1-10/2-10 波数 + 2-6≠2-1)', v21ok,
    v21ok ? '新源签名成立' : '★签名缺失——若 PVZ_HTML_PATH 指向 v2.0.1 旧源，此断言即判别力红灯（预期行为）');

  const sb = gBoot.sandbox;
  const CARDS = sb.__CARDS;
  const cardIdx = {}, cardMap = {};
  CARDS.forEach((c, i) => { cardIdx[c.type] = i; cardMap[c.type] = c; });
  const waterRows = sb.__consts.WATER_ROWS || [1, 3];
  const gridX = sb.__consts.GRID_X;
  const staticByKey = {};
  for (const k of LEVEL_KEYS) staticByKey[k] = levelStatic(L, k);

  console.log('\n[静态内容] key  waves time  water startSun  z  threat  big');
  for (const k of LEVEL_KEYS) {
    const s = staticByKey[k];
    console.log(`  ${k.padEnd(5)} ${String(s.totalWaves).padStart(2)}   ${s.time.padEnd(5)} ${s.water ? 'Y' : 'n'}   ${String(s.startSun).padStart(3)}      ${String(s.zCount).padStart(2)}  ${String(s.threat).padStart(5)}  ${s.bigCount}`);
  }
  const cloneGroups = {};
  for (const k of LEVEL_KEYS) { const sig = JSON.stringify(L[k].waves); (cloneGroups[sig] = cloneGroups[sig] || []).push(k); }
  const clones = Object.values(cloneGroups).filter((a) => a.length > 1);
  results.meta.cloneGroups = clones;
  console.log('\n[克隆组] 相同 waves 数组的关卡：' + (clones.length ? clones.map((a) => a.join('==')).join(' ; ') : '无'));

  // ---- 主矩阵：20 关 × 4 种子 ----
  console.log('\n[矩阵] 20 关 × 4 种子 = 80 局 ...');
  const expectations = P.createExpectations();
  expectations.expect('games.total', 92, '总局数（20×4 + Part B 加密 3×4）');
  expectations.expect('games.resolved', 80, '有终局判定的局数');
  expectations.expect('win.total', 60, '通关局总数下界（熟练基准防线）');
  expectations.expect('plant.total', 400, 'bot 累计种植数下界（防线有效性）');

  const ctx = { htmlPath: P.htmlPath(), level: null, waterRows, cardIdx, cardMap, gridX };
  for (const k of LEVEL_KEYS) {
    ctx.level = L[k];
    const seeds = P.seeds(SEED_BASE + LEVEL_KEYS.indexOf(k) * 10, SEEDS_PER_LEVEL).concat(SEED_OVERRIDE[k] || []);
    const runs = [];
    for (const seed of seeds) {
      const r = runLevel(k, seed, ctx);
      runs.push(r);
      expectations.inc('games.total');
      if (r.outcome !== 'timeout') expectations.inc('games.resolved');
      if (r.outcome === 'win') expectations.inc('win.total');
      expectations.inc('plant.total', r.botPlants);
    }
    results.levels[k] = aggLevel(k, runs, staticByKey[k], gridX);
    const a = results.levels[k];
    console.log(`  ${k.padEnd(5)} win=${a.wins}/${runs.length} T(med)=${a.gameT.median} minZX(worst)=${a.minZXworst} maxConc(med)=${a.maxConcurrentMedian} plants(med)=${a.botPlantsMedian} leaks=${a.leakTotal} breachedRuns=${a.breachedRuns}`);
  }

  // ---- T-301b Part B：加密复核结论（1-7/1-9/2-4 各 8 种子）----
  console.log('\n[Part B 加密复核] 1-7 / 1-9 / 2-4 各 8 种子');
  results.partB = PARTB_KEYS.map((k) => {
    const a = results.levels[k];
    const n = a.runs.length;
    const lost = a.runs.filter((r) => r.outcome === 'lose').length;
    const bw = a.runs.filter((r) => r.breachWave != null).map((r) => r.breachWave);
    const lossRate = P.r4(lost / n);
    const verdict = lost === 0
      ? '稳定全胜 → 维持「种子级方差」判定（无需调数值）'
      : (lossRate >= 0.125 ? '失守率 ≥1/8 → 建议考虑「首波放软 / 抬 startSun」（对齐 1-6 前两波放软惯例）'
                           : '偶发失守 <1/8 → 种子级方差');
    console.log(`  ${k} losses=${lost}/${n} lossRate=${lossRate} breachWaves=[${bw.join(',')}] → ${verdict}`);
    return { key: k, seeds: n, losses: lost, lossRate, breachWaves: bw, verdict };
  });

  // ---- 离群判定 ----
  console.log('\n[离群判定] ...');
  const levelArr = LEVEL_KEYS.map((k) => results.levels[k]);
  results.outliers = detectOutliers(levelArr, gridX);
  console.log(`  过难(winRate≤${TH.tooHardWin}): ${results.outliers.tooHard.join(',') || '无'}`);
  console.log(`  偏难(0.25<winRate≤${TH.edgeHardWin}): ${results.outliers.edgeHard.join(',') || '无'}`);
  console.log(`  失守·稳定(≥2 局抵达进屋带 minZX≤GRID_X): ${results.outliers.breached.join(',') || '无'}`);
  console.log(`  过易(内容<${TH.underFill}×期望 且 全胜): ${results.outliers.tooEasy.join(',') || '无'}`);
  console.log(`  超载(内容>${TH.overFill}×期望): ${results.outliers.overFill.join(',') || '无'}`);
  console.log(`  〔信息·非离群〕单局失守(=1 局，判种子级方差): ${results.outliers.singleBreach.join(',') || '无'}`);

  // ---- 非零正样本自检 ----
  console.log('\n[自检] 离群判定器合成用例（能证伪）...');
  results.selfcheck = syntheticSelfCheck();
  for (const c of results.selfcheck.checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}  ${c.got}`);
  assert('自检：离群判定器非空转（正/负样本齐备）', results.selfcheck.pass, results.selfcheck.checks.map((c) => c.name + ':' + (c.pass ? 'ok' : 'BAD')).join(' '));

  // ---- 旧源判别力 ----
  console.log('\n[判别力] v2.0.1 旧源导出 + 复跑签名 ...');
  const disc = { ref: V201_REF, newOk: v21ok, oldOk: null, ok: false, oldSample: null };
  let oldTmp = null;
  try {
    const buf = await gitShow(V201_REF, 'plants-vs-zombies.html');
    oldTmp = path.join(os.tmpdir(), 'pvz-t301-v201.html');
    fs.writeFileSync(oldTmp, buf);
    const go = loadGame({ htmlPath: oldTmp, seed: 1, search: '?test=1' });
    const oldL = go.sandbox.__LEVELS;
    disc.oldOk = hasV21LevelData(oldL);
    disc.oldSample = {
      '1-7': oldL['1-7'] && oldL['1-7'].totalWaves, '1-10': oldL['1-10'] && oldL['1-10'].totalWaves,
      '2-10': oldL['2-10'] && oldL['2-10'].totalWaves, '2-6cloneOf2-1': JSON.stringify(oldL['2-6'].waves) === JSON.stringify(oldL['2-1'].waves),
    };
    console.log(`  旧源签名 hasV21LevelData=${disc.oldOk}（期望 false）sample=${JSON.stringify(disc.oldSample)}`);
    disc.ok = v21ok === true && disc.oldOk === false;
  } catch (e) {
    disc.error = e.message;
    console.log(`  旧源导出失败：${e.message.slice(0, 100)}`);
  }
  try { if (oldTmp && fs.existsSync(oldTmp)) fs.rmSync(oldTmp); } catch (_) {}
  disc.cleaned = !(oldTmp && fs.existsSync(oldTmp));
  results.discriminator = disc;
  assert('判别力：新源签名在位 + 旧源必红（复跑判别力完整）', disc.ok, `new=${v21ok} old=${disc.oldOk}（旧源应为 false）`);

  // ---- 可复现性自检 ----
  const detKey = '2-1', detSeed = SEED_BASE + LEVEL_KEYS.indexOf(detKey) * 10;
  ctx.level = L[detKey];
  const rA = runLevel(detKey, detSeed, ctx);
  const rB = runLevel(detKey, detSeed, ctx);
  const detEqual = JSON.stringify(rA) === JSON.stringify(rB);
  results.determinism = { key: detKey, seed: detSeed, equal: detEqual, sample: rA };
  assert('可复现性：同关同种子逐字节一致（除 runtime）', detEqual,
    detEqual ? `${detKey}#${detSeed} 两次 run 记录深度相等` : '不一致——bot 消费了随机数或存在非确定源');

  // ---- 收尾期望核查 ----
  const expV = expectations.verify();
  results.expectations = { snapshot: expectations.snapshot(), ...expV };
  assert('执行计数器达标(gate4 收尾)', expV.pass, expV.unmet.map((u) => `${u.name}:${u.actual}<${u.min}`).join('; ') || '全部达标');

  // 跑后卫生
  try {
    const lines = execSync('git status --porcelain', { cwd: REPO_ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    const mine = [/v21-curve-profile(\.js|-results\.json)?$/, /v21-curve-profile-report\.md$/];
    const unexpected = lines.filter((l) => !mine.some((re) => re.test(l)));
    results.meta.git.post = { count: lines.length, unexpected };
    assert('卫生：跑后工作树无任务外脏文件', unexpected.length === 0, unexpected.join(' | ') || `共 ${lines.length} 项（本任务三件）`);
  } catch (e) { results.meta.git.post = { error: e.message }; }

  results.pass = results.assertions.every((a) => a.pass) && results.gates.pass && expV.pass;
  results.meta.runtimeMs = Date.now() - t0;
  fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
  console.log(`\n产物：${OUT_JSON}`);
  console.log(`${results.pass ? 'T-301 PASS' : 'T-301 FAIL'}  (${results.meta.runtimeMs}ms)`);
  process.exitCode = results.pass ? 0 : 1;
}

main().catch((e) => { console.error('T-301 CRASH:', (e && e.stack) || e); process.exitCode = 2; });
