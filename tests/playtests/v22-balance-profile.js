'use strict';
/* ============================================================================
 * tests/playtests/v22-balance-profile.js — V22-QA-03 · D3 平衡曲线画像
 * ----------------------------------------------------------------------------
 * 目的：回答 GDD `design/gdd/v22-new-plants.md` §7.1 两条【中风险】：
 *   ① 航椒 pepper（125 阳 / CD 25s / 同排全清）是否过强？
 *   ② 樱桃 cherry（150 阳 / CD 30s / 3×3 面清场）是否过强？
 * 口径对齐 `production/v21-curve-profile-report.md`（v2.1.1 基线，T-301/T-301b/T-301c 终态）：
 *   同 bot 底座、同种子段（9200 + 关序×10）、同真实经济、同 DIFF=normal、同 g.tick(DT)。
 *
 * 【三臂对照设计】
 *   Arm A  基线：v2.1.1 源（git tag v2.1.1）× 策略 P0（v21 原版严格优先级混合防线，不用新卡）
 *   Arm B  对照：v2.2  源 × 策略 P0  —— 隔离「v2.2 除新卡外的任何附带难度漂移」
 *   Arm C  实测：v2.2  源 × 策略 PBURST（P0 + 应急爆发：樱桃/航椒/窝瓜，按发卡序列解锁门控）
 *   结论判据 = Arm C 相对 Arm A 的失守率 / 通关时长位移；Arm B 用于证明位移来自新卡而非其它。
 *
 * 【★ 已知坑防线（血泪教训：贪婪 bot 80 局全败实为 bot 校准问题）】
 *   G0 复现门：Arm A 的前 4 种子必须与 v21 报告 §8.3 公布的 4 种子通关数逐关一致
 *              （全部 4/4，唯 1-7=3/4、1-9=3/4）。不一致 ⇒ bot 校准/环境问题 ⇒ **不采信任何数据**。
 *   G1 通关门：三臂各自 1-1 必须全胜（1-1 已知可通关）。
 *   G2 生效门：Arm C 在新卡已解锁的关卡（1-5+ / 1-7+ / 1-8+）必须实际种下过新卡
 *              （planted>0），否则「没测到」而非「不强」。
 *
 * 边界：本脚本只新增文件（本脚本 + results.json），不改源码 / 不改既有测试 / 不 commit。
 * 产物：tests/playtests/v22-balance-profile-results.json（报告另落 production/）。
 *
 * 跑法：
 *   "C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2-3/node.exe" \
 *     tests/playtests/v22-balance-profile.js
 * ==========================================================================*/

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execSync } = require('child_process');
const { loadGame } = require(path.join(__dirname, '..', 'harness', 'index.js'));
const P = require(path.join(__dirname, 'lib', 'prelude.js'));

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT_JSON = path.join(__dirname, 'v22-balance-profile-results.json');

const DT = P.DT;
const BOT_DT = 0.25;         // bot 决策节拍（与 v21 同）
const MAX_T = 600;           // 单局硬顶（秒）
const SEEDS_PER_LEVEL = +(process.env.V22_SEEDS || 6);   // 每关 6 种子（v21 用 4；本轮加密到 6 提分辨率）
const SEED_BASE = 9200;      // 同 v21：前 4 个种子与 v21 公布口径逐字节对齐（G0 复现门）
const LEAK_X = 150;
const V211_REF = 'v2.1.1';   // 基线源

// ---- 20 关有序列表（同 v21）----
const LEVEL_KEYS = [];
for (let w = 1; w <= 2; w++) for (let l = 1; l <= 10; l++) LEVEL_KEYS.push(w + '-' + l);

// ---- 发卡序列解锁门控（GDD §6.1 / 源码 CARD_AWARD）：新卡只能在其发卡关及之后使用 ----
const AWARD_AT = { squash: '1-5', pepper: '1-7', cherry: '1-8' };

// ---- 应急爆发阈值（口径披露，非隐藏参数）----
// 两套策略共用同一套规则代码，仅阈值不同：
//   burst  = 应急型玩家：只在僵尸逼近防线（危险区）时才动用爆发卡；
//   greedy = 贪婪型玩家：只要「值得打」就用（不看危险区），用于把新卡压到最大使用强度。
const BURST = {
  burst: {
    dangerX: 520, critX: 350, pepperScanX: 900, pepperRowCount: 2,
    cherryRows: 2, cherryCluster: 3, squashDangerX: 350,
  },
  greedy: {
    dangerX: 1000, critX: 1000, pepperScanX: 1000, pepperRowCount: 1,
    cherryRows: 1, cherryCluster: 1, squashDangerX: 1000,
  },
};

// ---- bot 底座（v21 原版严格优先级通用混合防线）----
const PEA_COLS = [1, 2, 3, 4];
const NUT_COL = 6;
const SF_COL = 0;
const SF_TARGET = 4;
const NUT_TARGET = 5;
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
/** 异步 git show（避开会话级 spawnSync/execFileSync 对 .exe 恒 EBUSY 的坑）。 */
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
const colOf = (x, gridX, cellW) => Math.floor((x - gridX) / cellW);
const colCenter = (c, gridX, cellW) => gridX + c * cellW + cellW / 2;

// ---------------- 关卡静态内容分（同 v21 口径）----------------
function levelStatic(levelData, key) {
  const lv = levelData[key];
  const waves = lv.waves || [];
  let zCount = 0, threat = 0;
  for (const wv of waves) for (const s of (wv.spawns || [])) { zCount += s[1]; threat += s[1] * (HP[s[0]] || 180); }
  return { key, world: +key.split('-')[0], time: lv.time, water: !!lv.water, startSun: lv.startSun, totalWaves: lv.totalWaves, zCount, threat };
}

// ---------------- bot 上下文 ----------------
function buildCtx(sandbox, levelKey, levelData, policy) {
  const CARDS = sandbox.__CARDS;
  const cardIdx = {}, cardMap = {};
  CARDS.forEach((c, i) => { cardIdx[c.type] = i; cardMap[c.type] = c; });
  const consts = sandbox.__consts || {};
  const gridX = consts.GRID_X != null ? consts.GRID_X : 55;
  const cellW = consts.CELL_W != null ? consts.CELL_W : 90;
  // 解锁门控：policy=burst 时才放通新卡；且仅在该关发卡位序之后
  const unlocked = {};
  for (const t of Object.keys(AWARD_AT)) {
    unlocked[t] = !!cardMap[t] && LEVEL_KEYS.indexOf(levelKey) >= LEVEL_KEYS.indexOf(AWARD_AT[t]);
  }
  return {
    levelKey, level: levelData, policy,
    waterRows: consts.WATER_ROWS || [1, 3],
    cardIdx, cardMap, gridX, cellW, unlocked,
    thr: BURST[policy === 'greedy' ? 'greedy' : 'burst'],
    reserve: 50,   // 阳光盈余线：买爆发卡后至少还剩 50（够补向日葵），绝不饿死防线
  };
}

/** 从 probe 抽占用/睡莲集合。
 *  ★ 踩坑留痕（本脚本首版自查发现）：占用语义必须与源码 canPlant 一致 ——
 *    lilypad/planter 是「载体」，其所在格对其它植物**不算被占**（源码 L1327），
 *    而对 lilypad 自身则算被占。首版把「水行无睡莲」一律判不可落子 ⇒ 睡莲永远种不下
 *    ⇒ 世界 2 全 10 关 6/6 全败（bot 自身校准问题，非平衡问题）。已按源码口径修正。 */
function occSets(p) {
  const anyOcc = new Set(), solid = new Set(), byType = new Set(), pads = new Set();
  for (const pl of p.plantsArr) {
    const cell = pl.col + ',' + pl.row;
    anyOcc.add(cell);
    byType.add(pl.type + '@' + cell);
    if (pl.type === 'lilypad') pads.add(cell);
    else solid.add(cell);           // 非载体植物 = 实心占用
  }
  return { anyOcc, solid, byType, pads };
}

/** 该格是否可落子（严格复刻源码 canPlant 的 occupied / 水格睡莲前置两条规则）。 */
function canPlace(col, row, ctx, s, type) {
  if (col < 0 || col > 8 || row < 0 || row > 4) return false;
  const cell = col + ',' + row;
  const isWaterRow = ctx.level.water && ctx.waterRows.includes(row);
  if (type === 'lilypad') return !s.anyOcc.has(cell);          // 睡莲：格内已有任何植物即不可
  if (s.solid.has(cell)) return false;                          // 非空载体植物占位
  if (isWaterRow && !s.pads.has(cell)) return false;            // 水行需先铺睡莲
  return true;
}

/** 真实种植路径：selectCard(idx) → clickGrid(col,row)。 */
function doPlant(g, p, ctx, type, col, row) {
  const c = ctx.cardMap[type];
  if (!c) return null;
  if ((p.cardCD[type] || 0) > 0) return null;
  if (p.sun < c.cost) return null;
  const idx = ctx.cardIdx[type];
  const sel = p.selected;
  if (!sel || sel.type !== type) g.selectCard(idx);
  g.clickGrid(col, row);
  return { planted: type, col, row };
}

// ---------------- 策略 P0：v21 原版严格优先级混合防线 ----------------
function standardTick(g, p, ctx, s) {
  const water = ctx.level.water, WR = ctx.waterRows;
  const nSf = p.plantsArr.filter((q) => q.type === 'sunflower').length;
  const nNut = p.plantsArr.filter((q) => q.type === 'nut').length;
  const hasPea = (row) => PEA_COLS.some((c) => s.byType.has('pea@' + c + ',' + row));
  const firstPeaCol = (row) => PEA_COLS.find((c) => !s.byType.has('pea@' + c + ',' + row));
  const thr = new Map();
  for (const z of p.zombiesArr) if (!z.dead && z.x < 820) { const cur = thr.get(z.row); if (cur == null || z.x < cur) thr.set(z.row, z.x); }
  const cells = [];
  for (const [row] of [...thr.entries()].sort((a, b) => a[1] - b[1])) if (!hasPea(row)) { const c = firstPeaCol(row); if (c != null) cells.push({ col: c, row, type: 'pea' }); }
  if (nSf < SF_TARGET) { for (let row = 0; row < 5; row++) if (!s.byType.has('sunflower@' + SF_COL + ',' + row)) { cells.push({ col: SF_COL, row, type: 'sunflower' }); break; } }
  for (const col of PEA_COLS) for (let row = 0; row < 5; row++) if (!s.byType.has('pea@' + col + ',' + row)) cells.push({ col, row, type: 'pea' });
  if (nNut < NUT_TARGET) { for (let row = 0; row < 5; row++) if (!s.byType.has('nut@' + NUT_COL + ',' + row)) { cells.push({ col: NUT_COL, row, type: 'nut' }); break; } }
  const head = cells[0];
  if (!head) return null;
  let req = head.type;
  if (water && WR.includes(head.row) && !s.pads.has(head.col + ',' + head.row)) req = 'lilypad';
  const c = ctx.cardMap[req];
  if (!c) return null;
  if ((p.cardCD[req] || 0) > 0) return null;   // 严格：头项冷却中 → 等
  if (p.sun < c.cost) return null;             // 严格：头项买不起 → 等
  if (!canPlace(head.col, head.row, ctx, s, req)) return null;
  return doPlant(g, p, ctx, req, head.col, head.row);
}

// ---------------- 策略 PBURST：P0 + 应急爆发（樱桃 / 航椒 / 窝瓜）----------------
/**
 * 触发语义（严格按源码机制，不臆造）：
 *   - 樱桃：踩中触发（同排 ±54px）→ 秒杀 3×3 格（|Δcol|≤1 且 |Δrow|≤1）。落点选「覆盖最多活僵尸」的空格。
 *   - 航椒：踩中触发 → 秒杀同排全部（不限列）。落点选领头僵尸所在格（|z.x-center|≤45<54 ⇒ 当帧即炸），
 *           该格被占则向左退格（僵尸左行必然走进 54px 触发窗）。
 *   - 窝瓜：即种即跳向同排前方最近僵尸，单体秒杀。落点取该行最左空格（保证前方有目标）。
 * 门控：仅在「有僵尸进入危险区」时才考虑爆发；且受 cardCD / 阳光 / 解锁位序真实约束。
 *
 * ★ 两阶段（plan → plant-or-save）：先只按【目标价值 + 卡是否冷却完毕】选点，再判阳光。
 *   若选到点但买不起 ⇒ **本拍不种任何东西（攒钱）**，而不是退回 P0 把阳光花在豌豆上 ——
 *   否则 125/150 阳光的爆发卡永远攒不出来（首版实测 pepper=0 株 / cherry=0 株，
 *   只剩 50 阳光的窝瓜在用，画像对两张中风险卡完全无判别力）。这是本脚本第二个 bot 校准坑。
 */
function planBurst(p, ctx, s) {
  const T = ctx.thr;
  const live = p.zombiesArr.filter((z) => !z.dead);
  if (!live.length) return null;
  // ★ 经济下限门：向日葵未铺满 4 株前一律不动用爆发卡 —— 真实玩家不会在经济未立时
  //   买 125/150 的卡。首版缺此门 ⇒ greedy 臂开局就把阳光砸进樱桃、防线永远建不起来
  //   （2 种子冒烟即 27/40 全败），是 bot 校准问题而非「新卡弱」。
  const nSf = p.plantsArr.filter((q) => q.type === 'sunflower').length;
  if (nSf < SF_TARGET) return null;
  const avail = (t) => ctx.unlocked[t] && ctx.cardMap[t] && (p.cardCD[t] || 0) <= 0;
  const danger = live.filter((z) => z.x <= T.dangerX);
  if (!danger.length) return null;

  // ① 樱桃：多行告急 或 单簇密集
  if (avail('cherry')) {
    const rows = new Set(danger.map((z) => z.row));
    const cluster = live.filter((z) => z.x <= T.dangerX + 200);
    if (rows.size >= T.cherryRows || cluster.length >= T.cherryCluster) {
      let best = null;
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 9; col++) {
          if (!canPlace(col, row, ctx, s, 'cherry')) continue;
          let n = 0;
          for (const z of live) if (Math.abs(colOf(z.x, ctx.gridX, ctx.cellW) - col) <= 1 && Math.abs(z.row - row) <= 1) n++;
          if (!best || n > best.n) best = { col, row, n };
        }
      }
      if (best && best.n >= 1) return { type: 'cherry', col: best.col, row: best.row, cover: best.n };
    }
  }

  // ② 航椒：同排成群 或 单只临界
  if (avail('pepper')) {
    const cnt = new Map();
    for (const z of live) if (z.x <= T.pepperScanX) cnt.set(z.row, (cnt.get(z.row) || 0) + 1);
    let bestRow = null, bestN = 0;
    for (const [row, n] of cnt) if (n > bestN) { bestN = n; bestRow = row; }
    const crit = live.some((z) => z.x <= T.critX);
    if (bestRow != null && (bestN >= T.pepperRowCount || crit)) {
      const zs = live.filter((z) => z.row === bestRow).sort((a, b) => a.x - b.x);
      const lead = zs[0];
      if (lead) {
        const c0 = Math.max(0, Math.min(8, colOf(lead.x, ctx.gridX, ctx.cellW)));
        for (let c = c0; c >= 0; c--) {
          if (!canPlace(c, bestRow, ctx, s, 'pepper')) continue;
          return { type: 'pepper', col: c, row: bestRow, cover: bestN };
        }
      }
    }
  }

  // ③ 窝瓜：单体应急（主动跳跃）
  if (avail('squash')) {
    const zs = live.filter((z) => z.x <= T.squashDangerX).sort((a, b) => a.x - b.x);
    if (zs.length) {
      const row = zs[0].row;
      for (let c = 0; c < 9; c++) {
        if (!canPlace(c, row, ctx, s, 'squash')) continue;
        return { type: 'squash', col: c, row, cover: 1 };
      }
    }
  }
  return null;
}

function botTick(g, p, ctx) {
  const s = occSets(p);
  if (ctx.policy === 'burst' || ctx.policy === 'greedy') {
    const plan = planBurst(p, ctx, s);
    if (plan) {
      const cost = ctx.cardMap[plan.type].cost;
      // ★ 只买「阳光有盈余」的爆发卡；买不起就交回 P0 继续建造。
      //   首版允许「攒钱等爆发卡」（wait）⇒ 危机时刻 bot 捏着 100 阳光干等 125 的航椒、
      //   防线被走空（2 种子冒烟即 2/40 早期崩盘）。这是 bot 校准问题，不是新卡的强度读数。
      if (p.sun >= cost + ctx.reserve) {
        return doPlant(g, p, ctx, plan.type, plan.col, plan.row) || null;
      }
    }
  }
  return standardTick(g, p, ctx, s);
}

// ---------------- 单局跑法 ----------------
function runLevel(key, seed, arm) {
  const ctx = arm.ctxByLevel[key];
  const g = loadGame({ seed, htmlPath: arm.htmlPath, localStorage: makeStore() });
  g.setLevel(key);
  g.startGame('v22bal-' + key);
  const sb = g.sandbox;

  const origKill = sb.killZombie;
  if (typeof origKill !== 'function') throw new Error('killZombie 沙箱桥缺失（击杀计数依赖）');
  let kills = 0;
  sb.killZombie = function (z) { kills++; return origKill(z); };

  const plantedByType = {};
  let minZX = Infinity, maxConc = 0, concSum = 0, frames = 0, sunsCollected = 0, savedTicks = 0;
  let tNow = 0, botNext = 0, outcome = null, endProbe = null, breachWave = null;
  let leaked = 0;
  const leakedSet = new Set();
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
      if (z.x <= LEAK_X) leakedSet.add(z);
    }
    if (conc > maxConc) maxConc = conc;
    concSum += conc; frames++;
    if (tNow >= botNext) {
      botNext += BOT_DT;
      const p = g.probe();
      if (p.state !== 'play') { endProbe = p; outcome = p.won ? 'win' : 'lose'; breachWave = p.won ? null : p.wave; break; }
      for (const e of p.effectsArr) { if (e.kind === 'sun' && !e.dead) { g.clickAt(e.x, e.y); sunsCollected++; } }
      const r = botTick(g, p, ctx);
      if (r && r.planted) plantedByType[r.planted] = (plantedByType[r.planted] || 0) + 1;
      else if (r && r.wait) savedTicks++;
    }
  }
  if (!outcome) {
    endProbe = g.probe();
    outcome = endProbe.state === 'play' ? 'timeout' : (endProbe.won ? 'win' : 'lose');
    if (outcome !== 'win') breachWave = endProbe.wave;
  }
  sb.killZombie = origKill;

  const pE = endProbe || g.probe();
  return {
    levelKey: key, seed, outcome,
    endWave: pE.wave, gameT: P.r2(tNow), breachWave,
    maxConcurrent: maxConc, avgConcurrent: r3(frames ? concSum / frames : 0),
    kills,
    minZX: minZX === Infinity ? null : P.r2(minZX),
    leakCount: leakedSet.size,
    sunsCollected, sunStart, sunEnd: pE.sun, savedTicks,
    plantedByType,
    totalPlants: Object.values(plantedByType).reduce((a, b) => a + b, 0),
  };
}

// ---------------- 单关聚合 ----------------
function aggLevel(key, runs, st) {
  const wins = runs.filter((r) => r.outcome === 'win').length;
  const losses = runs.filter((r) => r.outcome === 'lose').length;
  const timeouts = runs.filter((r) => r.outcome === 'timeout').length;
  const gts = runs.map((r) => r.gameT);
  const winGts = runs.filter((r) => r.outcome === 'win').map((r) => r.gameT);
  const minZXs = runs.map((r) => (r.minZX == null ? 1000 : r.minZX));
  const plantedByType = {};
  for (const r of runs) for (const k of Object.keys(r.plantedByType)) plantedByType[k] = (plantedByType[k] || 0) + r.plantedByType[k];
  return {
    key, world: st.world, time: st.time, water: st.water, startSun: st.startSun,
    totalWaves: st.totalWaves, zCount: st.zCount, threat: st.threat,
    seeds: runs.length, wins, losses, timeouts,
    winRate: P.r4(wins / runs.length), lossRate: P.r4(losses / runs.length),
    gameTmedian: P.r2(median(gts)),
    gameTwinMedian: winGts.length ? P.r2(median(winGts)) : null,
    perWaveT: P.r2(median(gts) / st.totalWaves),
    minZXworst: P.r2(Math.min(...minZXs)),
    minZXmedian: P.r2(median(minZXs)),
    leakTotal: sum(runs.map((r) => r.leakCount)),
    maxConcurrentMedian: median(runs.map((r) => r.maxConcurrent)),
    killsTotal: sum(runs.map((r) => r.kills)),
    plantedByType,
    savedTicks: sum(runs.map((r) => r.savedTicks)),
    burstPlants: (plantedByType.pepper || 0) + (plantedByType.cherry || 0) + (plantedByType.squash || 0),
    runs,
  };
}

// ---------------- 主流程 ----------------
async function main() {
  const t0 = Date.now();
  const results = {
    meta: {
      task: 'V22-QA-03 D3 · v2.2 平衡曲线画像（航椒/樱桃过强与否）',
      date: new Date().toISOString().slice(0, 10),
      node: process.version,
      dt: DT, botDt: BOT_DT, maxT: MAX_T, seedsPerLevel: SEEDS_PER_LEVEL, seedBase: SEED_BASE,
      sunMode: 'REAL(unlocked) —— 同 v21 口径：真实经济，bot 自行收集阳光',
      diff: 'normal（DIFFS.normal mult=1.0 speed=1.0，默认档）',
      baselineRef: 'git tag v2.1.1（= v21 报告 T-301b/c 修补后终态）',
      arms: [
        { id: 'A', label: '基线 v2.1.1 × P0（v21 原版防线，不用新卡）' },
        { id: 'B', label: '对照 v2.2 × P0（隔离新卡以外的附带漂移）' },
        { id: 'C', label: '实测 v2.2 × PBURST（P0 + 应急型爆发：只在僵尸逼近危险区时用新卡）' },
        { id: 'D', label: '压测 v2.2 × PGREEDY（P0 + 贪婪型爆发：只要「值得打」就用，把新卡压到最大使用强度）' },
      ],
      botSpec: 'P0=v21 严格优先级通用混合防线（受威胁行补豌豆→col0向日葵≤4→col1..4铺豌豆→col6坚果≤5；水行先睡莲）；PBURST/PGREEDY=P0 + 爆发分支（樱桃→航椒→窝瓜顺序），两者共用规则代码、仅阈值不同（见 meta.burstThresholds），解锁门控见 meta.awardAt',
      burstThresholds: BURST,
      awardAt: AWARD_AT,
      unlockGate: '新卡仅在其 CARD_AWARD 发卡关及之后可用（squash@1-5 / pepper@1-7 / cherry@1-8），对齐真实解锁进度',
      runtimeMs: null, git: {},
    },
    preconditions: {}, gates: {}, levels: {}, compare: null,
    calibration: null, sanity: null, assertions: [], pass: false,
  };
  const assert = (name, pass, detail) => {
    results.assertions.push({ name, pass: !!pass, detail });
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail || ''}`);
    return pass;
  };

  try {
    const lines = execSync('git status --porcelain', { cwd: REPO_ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    results.meta.git.pre = { count: lines.length };
  } catch (e) { results.meta.git.pre = { error: e.message }; }

  // ---- 导出 v2.1.1 基线源 ----
  console.log('[基线] git show v2.1.1:plants-vs-zombies.html ...');
  const oldBuf = await gitShow(V211_REF, 'plants-vs-zombies.html');
  const baselinePath = path.join(os.tmpdir(), 'pvz-v22qa-v211.html');
  fs.writeFileSync(baselinePath, oldBuf);
  console.log(`  导出 ${oldBuf.length} 字节 → ${baselinePath}`);

  const ARMS = [
    { id: 'A', htmlPath: baselinePath, policy: 'p0', expectVersion: 'v2.1.1' },
    { id: 'B', htmlPath: path.join(REPO_ROOT, 'plants-vs-zombies.html'), policy: 'p0', expectVersion: 'v2.2.0' },
    { id: 'C', htmlPath: path.join(REPO_ROOT, 'plants-vs-zombies.html'), policy: 'burst', expectVersion: 'v2.2.0' },
    { id: 'D', htmlPath: path.join(REPO_ROOT, 'plants-vs-zombies.html'), policy: 'greedy', expectVersion: 'v2.2.0' },
  ];

  for (const arm of ARMS) {
    console.log(`\n========== Arm ${arm.id} · ${arm.label || ''} ==========`);
    process.env.PVZ_HTML_PATH = arm.htmlPath;
    // ★ gate5 的期望版本来自 EXPECT.VERSION（读 PVZ_EXPECT_VER），必须按臂设置，
    //   否则 v2.2.0 源会被拿 v2.1.1 期望常量比对 ⇒ gate5「源码漂移」假红。
    process.env.PVZ_EXPECT_VER = arm.expectVersion;
    const { g: gB, pre, gates } = await P.bootstrap({ expectVersion: arm.expectVersion });
    results.preconditions['arm' + arm.id] = {
      version: pre.version, htmlPath: pre.htmlPath,
      measured: { freezeT: pre.measured.freezeT, cornCd: pre.measured.cornCd, butterP: pre.measured.butterP, applyFreezeCallSites: pre.measured.applyFreezeCallSites },
      domain: pre.domain,
    };
    results.gates['arm' + arm.id] = { pass: gates.pass, failed: gates.failedGates, results: gates.results.map((r) => ({ gate: r.gate, name: r.name, pass: r.pass, detail: r.detail })) };
    for (const r of gates.results) console.log(`  gate${r.gate} ${r.pass ? 'PASS' : 'FAIL'} ${r.name} — ${r.detail}`);
    assert(`Arm ${arm.id} 七道前置门全过（gate1-6 硬门）`, gates.pass, gates.failedGates.join(',') || '全过');

    const sb = gB.sandbox;
    const L = sb.__LEVELS;
    const staticByKey = {};
    for (const k of LEVEL_KEYS) staticByKey[k] = levelStatic(L, k);
    arm.ctxByLevel = {};
    for (const k of LEVEL_KEYS) arm.ctxByLevel[k] = buildCtx(sb, k, L[k], arm.policy);
    arm.static = staticByKey;

    // 卡片在位性前提（Arm B/C 必须有三张新卡；Arm A 必须没有）
    const hasNew = ['squash', 'pepper', 'cherry'].filter((t) => arm.ctxByLevel['2-10'].cardMap[t]);
    if (arm.id === 'A') assert('Arm A 前提：v2.1.1 源无三张新卡（判别力）', hasNew.length === 0, `检出=${JSON.stringify(hasNew)}`);
    else assert(`Arm ${arm.id} 前提：v2.2 源三张新卡在位`, hasNew.length === 3, `检出=${JSON.stringify(hasNew)}`);

    console.log(`  [矩阵] 20 关 × ${SEEDS_PER_LEVEL} 种子 = ${20 * SEEDS_PER_LEVEL} 局 ...`);
    arm.levels = {};
    for (const k of LEVEL_KEYS) {
      const seeds = P.seeds(SEED_BASE + LEVEL_KEYS.indexOf(k) * 10, SEEDS_PER_LEVEL);
      const runs = seeds.map((s) => runLevel(k, s, arm));
      arm.levels[k] = aggLevel(k, runs, staticByKey[k]);
      const a = arm.levels[k];
      console.log(`    ${k.padEnd(5)} win=${a.wins}/${a.seeds} loss=${a.losses} T(med)=${String(a.gameTmedian).padStart(6)} minZX(worst)=${String(a.minZXworst).padStart(6)} burst=${a.burstPlants} kills=${a.killsTotal}`);
    }
    results.levels['arm' + arm.id] = {};
    for (const k of LEVEL_KEYS) {
      const a = Object.assign({}, arm.levels[k]);
      a.runs = arm.levels[k].runs;   // 保留逐局明细（可复现核对）
      results.levels['arm' + arm.id][k] = a;
    }
  }

  // ---- G0 复现门：Arm A 前 4 种子必须复现 v21 报告 §8.3 的 4 种子通关数 ----
  // v21 终态（T-301b/c 后）：20 关全部 4/4，唯 1-7=3/4、1-9=3/4（各 1 局早期失守，判种子级方差）。
  console.log('\n[G0 复现门] Arm A 前 4 种子 vs v21 报告 §8.3 公布的 4 种子通关数 ...');
  const EXPECT_WINS_4SEED = {};
  for (const k of LEVEL_KEYS) EXPECT_WINS_4SEED[k] = 4;
  EXPECT_WINS_4SEED['1-7'] = 3;
  EXPECT_WINS_4SEED['1-9'] = 3;
  const calibRows = [];
  let calibPass = true;
  for (const k of LEVEL_KEYS) {
    const first4 = results.levels.armA[k].runs.slice(0, 4);
    const got = first4.filter((r) => r.outcome === 'win').length;
    const want = EXPECT_WINS_4SEED[k];
    const ok = got === want;
    if (!ok) calibPass = false;
    calibRows.push({ key: k, want, got, ok });
  }
  results.calibration = {
    gate: 'G0 复现门：Arm A（v2.1.1 × P0）前 4 种子须逐关复现 v21 报告 §8.3 的 4 种子通关数',
    sourceOfTruth: 'production/v21-curve-profile-report.md §8.3（T-301b/c 终态）：全 20 关 4/4，唯 1-7=3/4、1-9=3/4',
    pass: calibPass, rows: calibRows,
    mismatches: calibRows.filter((r) => !r.ok),
  };
  for (const r of calibRows) if (!r.ok) console.log(`    MISMATCH ${r.key}: 期望 ${r.want}/4 实测 ${r.got}/4`);
  assert('G0 复现门：Arm A 前 4 种子逐关复现 v21 基线（bot 校准可信）', calibPass,
    calibPass ? '20/20 关逐关一致 —— bot 与 v21 同口径，后续数据可采信' : `不一致 ${results.calibration.mismatches.length} 关 → bot/环境校准异常，数据不可采信`);

  // ---- G1 通关门：每臂 1-1 必须全胜 ----
  console.log('\n[G1 通关门] 各臂 1-1 全胜（1-1 已知可通关）...');
  const sanity = { gate: 'G1：每臂 1-1 必须全胜；G2：爆发臂新卡必须被实际使用（覆盖度口径）', arms: {}, pass: true };
  let g1ok = true;
  for (const arm of ARMS) {
    const a = results.levels['arm' + arm.id]['1-1'];
    const ok = a.wins === a.seeds;
    if (!ok) { g1ok = false; sanity.pass = false; }
    sanity.arms['arm' + arm.id] = { key: '1-1', wins: a.wins, seeds: a.seeds, allWin: ok };
    console.log(`    Arm ${arm.id}: 1-1 win=${a.wins}/${a.seeds} ${ok ? 'OK' : '★FAIL'}`);
  }
  assert(`G1 通关门：${ARMS.length} 臂 1-1 全胜（bot 可正常通关，非校准性全败）`, g1ok,
    Object.keys(sanity.arms).map((k) => `${k}=${sanity.arms[k].wins}/${sanity.arms[k].seeds}`).join(' '));

  // ---- G2 生效门：爆发臂必须真的把新卡打出去（覆盖度口径，非「每关必用」）----
  //   口径说明：易关（如 2-1）本就不需要救场 ⇒ 「该关 0 次使用」是合法读数而非「没测到」。
  //   故判据取「段内覆盖 ≥2/3 关卡 且 段内累计 ≥8 株」，避免把「不需要用」误判为「未被压测」。
  console.log('\n[G2 生效门] 爆发臂新卡实际种植量（按解锁门控分区）...');
  const usageByArm = {};
  for (const armId of ['armC', 'armD']) {
    const usage = { pepper: 0, cherry: 0, squash: 0, levelsWithNewCard: [], pepperLevels: [], cherryLevels: [] };
    for (const k of LEVEL_KEYS) {
      const pb = results.levels[armId][k].plantedByType || {};
      if (pb.pepper || pb.cherry || pb.squash) usage.levelsWithNewCard.push(k);
      if (pb.pepper) usage.pepperLevels.push(k);
      if (pb.cherry) usage.cherryLevels.push(k);
      usage.pepper += pb.pepper || 0; usage.cherry += pb.cherry || 0; usage.squash += pb.squash || 0;
    }
    usageByArm[armId] = usage;
    console.log(`    ${armId}: 航椒 ${usage.pepper} 株 / 覆盖 ${usage.pepperLevels.length} 关 · 樱桃 ${usage.cherry} 株 / 覆盖 ${usage.cherryLevels.length} 关 · 窝瓜 ${usage.squash} 株`);
  }
  // 判据单位 = 两个爆发臂的【并集】：只要在某条臂上被真实压测过，强度读数就成立
  // （「某关没用」往往因为该关不需要救场，是合法读数而非「没测到」）。
  const pepperWindow = LEVEL_KEYS.slice(LEVEL_KEYS.indexOf('1-7'));
  const cherryWindow = LEVEL_KEYS.slice(LEVEL_KEYS.indexOf('1-8'));
  const unionPepperLevels = new Set([...usageByArm.armC.pepperLevels, ...usageByArm.armD.pepperLevels]);
  const unionCherryLevels = new Set([...usageByArm.armC.cherryLevels, ...usageByArm.armD.cherryLevels]);
  const g2 = {
    pepper: { plants: usageByArm.armC.pepper + usageByArm.armD.pepper, covered: unionPepperLevels.size, window: pepperWindow.length, needCovered: Math.ceil(pepperWindow.length * 2 / 3) },
    cherry: { plants: usageByArm.armC.cherry + usageByArm.armD.cherry, covered: unionCherryLevels.size, window: cherryWindow.length, needCovered: Math.ceil(cherryWindow.length * 2 / 3) },
  };
  g2.pepper.ok = g2.pepper.plants >= 8 && g2.pepper.covered >= g2.pepper.needCovered;
  g2.cherry.ok = g2.cherry.plants >= 8 && g2.cherry.covered >= g2.cherry.needCovered;
  const g2ok = g2.pepper.ok && g2.cherry.ok;
  sanity.usage = usageByArm;
  sanity.g2 = g2;
  sanity.pass = sanity.pass && g2ok;
  console.log(`    并集覆盖：航椒 ${g2.pepper.plants} 株 / ${g2.pepper.covered}/${g2.pepper.window} 关（需 ≥${g2.pepper.needCovered}）${g2.pepper.ok ? 'OK' : '★'}` +
    ` | 樱桃 ${g2.cherry.plants} 株 / ${g2.cherry.covered}/${g2.cherry.window} 关（需 ≥${g2.cherry.needCovered}）${g2.cherry.ok ? 'OK' : '★'}`);
  assert('G2 生效门：航椒/樱桃在爆发臂并集上覆盖 ≥2/3 关卡且累计 ≥8 株（两张中风险卡确被压测）', g2ok,
    `pepper=${g2.pepper.plants}株/${g2.pepper.covered}关, cherry=${g2.cherry.plants}株/${g2.cherry.covered}关`);
  results.sanity = sanity;

  // ---- 三臂对照表 ----
  console.log('\n[对照] 20 关 × 三臂：失守率 / 通关时长');
  const compare = { rows: [], agg: {} };
  console.log('  关   | A 失守  A T中位 | B 失守  B T中位 | C 失守  C T中位 | ΔT(C-A) | C 新卡用量');
  const ARM_IDS = ARMS.map((a) => 'arm' + a.id);          // ['armA','armB','armC','armD']
  const ARM_LTR = ARMS.map((a) => a.id);
  console.log('\n[对照] 20 关 × 四臂：失守 / 通关时长中位');
  console.log('  关   |' + ARM_LTR.map((l) => ` ${l}:失守  ${l}:T中位`).join(' |') + ' | ΔT(C-A) ΔT(D-A) | D 新卡用量');
  for (const k of LEVEL_KEYS) {
    const per = {};
    const row = { key: k, world: results.levels.armA[k].world, water: results.levels.armA[k].water, waves: results.levels.armA[k].totalWaves, zCount: results.levels.armA[k].zCount, threat: results.levels.armA[k].threat };
    for (const id of ARM_IDS) {
      const a = results.levels[id][k];
      per[id] = { lossRate: a.lossRate, losses: a.losses, seeds: a.seeds, Tmed: a.gameTmedian, TwinMed: a.gameTwinMedian, minZXworst: a.minZXworst, kills: a.killsTotal, plantedByType: a.plantedByType, burstPlants: a.burstPlants };
    }
    row.arms = per;
    row.dT_C_minus_A = P.r2(per.armC.Tmed - per.armA.Tmed);
    row.dT_D_minus_A = P.r2(per.armD.Tmed - per.armA.Tmed);
    row.dT_pct_C = P.r4(per.armA.Tmed ? (per.armC.Tmed - per.armA.Tmed) / per.armA.Tmed : 0);
    row.dT_pct_D = P.r4(per.armA.Tmed ? (per.armD.Tmed - per.armA.Tmed) / per.armA.Tmed : 0);
    compare.rows.push(row);
    const cell = (id) => `${String(per[id].losses).padStart(1)}/${per[id].seeds} ${String(per[id].Tmed).padStart(6)}`;
    const pb = per.armD.plantedByType || {};
    console.log(`  ${k.padEnd(5)} |${ARM_IDS.map((id) => ' ' + cell(id)).join(' |')} | ${String(row.dT_C_minus_A).padStart(7)} ${String(row.dT_D_minus_A).padStart(7)} | p${pb.pepper || 0}/c${pb.cherry || 0}/s${pb.squash || 0}`);
  }

  // ---- 聚合（提升置信度：单关 6 种子分辨率 1/6，聚合 120 局起）----
  const aggOf = (armId, keys) => {
    const rows = keys.map((k) => results.levels[armId][k]);
    const games = sum(rows.map((r) => r.seeds));
    const losses = sum(rows.map((r) => r.losses));
    const wins = sum(rows.map((r) => r.wins));
    const Tsum = sum(rows.map((r) => r.gameTmedian * r.seeds));   // 加权均值（按局数）
    const burst = sum(rows.map((r) => r.burstPlants));
    return { games, wins, losses, lossRate: P.r4(losses / games), winRate: P.r4(wins / games), Tweighted: P.r2(Tsum / games), burstPlants: burst };
  };
  const SEGMENTS = {
    all_20: LEVEL_KEYS,
    post_1_5: LEVEL_KEYS.slice(LEVEL_KEYS.indexOf('1-5')),   // 任一张新卡可用段
    pepper_window_1_7plus: pepperWindow,
    cherry_window_1_8plus: cherryWindow,
  };
  compare.agg = {};
  for (const seg of Object.keys(SEGMENTS)) {
    const o = {};
    for (const id of ARM_IDS) o[ARM_LTR[ARM_IDS.indexOf(id)]] = aggOf(id, SEGMENTS[seg]);
    compare.agg[seg] = o;
  }
  console.log('\n[聚合]');
  for (const seg of Object.keys(compare.agg)) {
    const s = compare.agg[seg];
    console.log(`  ${seg.padEnd(24)} 失守率 ${ARM_LTR.map((l) => `${l}=${s[l].lossRate}(${s[l].losses}/${s[l].games})`).join(' ')} | 加权耗时 ${ARM_LTR.map((l) => `${l}=${s[l].Tweighted}`).join(' ')} | ΔT(C-A)=${P.r2(s.C.Tweighted - s.A.Tweighted)} ΔT(D-A)=${P.r2(s.D.Tweighted - s.A.Tweighted)}`);
  }

  // ---- 过强判据（可判定阈值，先声明后执行）----
  //   ① 失守塌陷：新卡窗口内聚合失守率相对基线显著下降（≥0.10 绝对差）→ 难度被显著压低
  //   ② 时长压缩：新卡窗口内加权通关时长比基线短 ≥15% → 通关节奏被显著加速
  //   ③ 判「过强」= ①或② 成立；否则判「在带内」→ 维持现状，不触发缓解抓手
  const THV = { lossDropTrigger: 0.10, timeCompressTrigger: 0.15 };
  const verdict = { thresholds: THV, pepper: {}, cherry: {}, overall: null };
  const compress = (seg, ltr) => (seg.A.Tweighted ? (seg.A.Tweighted - seg[ltr].Tweighted) / seg.A.Tweighted : 0);
  for (const [name, segKey] of [['pepper', 'pepper_window_1_7plus'], ['cherry', 'cherry_window_1_8plus']]) {
    const seg = compare.agg[segKey];
    const v = { segment: segKey, A: seg.A };
    for (const ltr of ['B', 'C', 'D']) {
      v[ltr] = {
        lossRate: seg[ltr].lossRate, losses: seg[ltr].losses, games: seg[ltr].games,
        lossDrop_vs_A: P.r4(seg.A.lossRate - seg[ltr].lossRate),
        Tweighted: seg[ltr].Tweighted,
        timeCompress_vs_A: P.r4(compress(seg, ltr)),
        burstPlants: seg[ltr].burstPlants,
        tooStrong: (seg.A.lossRate - seg[ltr].lossRate) >= THV.lossDropTrigger || compress(seg, ltr) >= THV.timeCompressTrigger,
      };
    }
    verdict[name] = v;
  }
  // 归因：Arm B（v2.2 源 × 不用新卡）与 Arm A 之差 = 非新卡因素
  const segPost = compare.agg.post_1_5;
  verdict.attribution = {
    note: 'Arm B（v2.2 源 × 不用新卡）与 Arm A（v2.1.1 基线）之差 = 非新卡因素（源码其它改动 + 同种子噪声）；C/D − A 扣除 B − A 后为可归因于新卡的部分',
    post_1_5: {
      B_vs_A_lossRate: P.r4(segPost.B.lossRate - segPost.A.lossRate),
      B_vs_A_timeDelta: P.r2(segPost.B.Tweighted - segPost.A.Tweighted),
    },
  };
  verdict.overall = {
    pepperTooStrong: verdict.pepper.C.tooStrong || verdict.pepper.D.tooStrong,
    cherryTooStrong: verdict.cherry.C.tooStrong || verdict.cherry.D.tooStrong,
  };
  console.log('\n[过强判据] 阈值：失守率下降 ≥0.10 或 通关时长压缩 ≥15%');
  for (const name of ['pepper', 'cherry']) {
    const v = verdict[name];
    for (const ltr of ['B', 'C', 'D']) {
      console.log(`  ${name.padEnd(6)} × Arm ${ltr}: 失守率 ${v[ltr].lossRate}（基线 ${v.A.lossRate}，下降 ${v[ltr].lossDrop_vs_A}）· 时长 ${v[ltr].Tweighted}（基线 ${v.A.Tweighted}，压缩 ${(v[ltr].timeCompress_vs_A * 100).toFixed(1)}%）· 新卡用量 ${v[ltr].burstPlants} ⇒ ${v[ltr].tooStrong ? '★过强' : '在带内'}`);
    }
  }
  results.compare = compare;
  results.verdict = verdict;

  // ---- 可复现性 ----
  const detKey = '2-1', detSeed = SEED_BASE + LEVEL_KEYS.indexOf(detKey) * 10;
  const rA = runLevel(detKey, detSeed, ARMS[3]);
  const rB = runLevel(detKey, detSeed, ARMS[3]);
  const detEqual = JSON.stringify(rA) === JSON.stringify(rB);
  results.determinism = { key: detKey, seed: detSeed, arm: 'D', equal: detEqual };
  assert('可复现性：同臂同关同种子逐字节一致', detEqual, detEqual ? `${detKey}#${detSeed} 两次 run 深度相等` : '不一致');

  // ---- 卫生 ----
  try { if (fs.existsSync(baselinePath)) fs.rmSync(baselinePath); } catch (_) {}
  results.meta.baselineCleaned = !fs.existsSync(baselinePath);
  try {
    const lines = execSync('git status --porcelain', { cwd: REPO_ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    const mine = [/v22-balance-profile(\.js|-results\.json)?$/];
    const unexpected = lines.filter((l) => !mine.some((re) => re.test(l)));
    results.meta.git.post = { count: lines.length, unexpected };
    assert('卫生：跑后工作树无任务外新增脏文件', unexpected.length === 0, unexpected.join(' | ') || `共 ${lines.length} 项`);
  } catch (e) { results.meta.git.post = { error: e.message }; }

  results.pass = results.assertions.every((a) => a.pass);
  results.meta.runtimeMs = Date.now() - t0;
  fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
  console.log(`\n产物：${OUT_JSON}`);
  console.log(`${results.pass ? 'V22-BAL PASS' : 'V22-BAL FAIL'}  (${results.meta.runtimeMs}ms)`);
  process.exitCode = results.pass ? 0 : 1;
}

main().catch((e) => { console.error('V22-BAL CRASH:', (e && e.stack) || e); process.exitCode = 2; });
