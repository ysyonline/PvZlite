'use strict';
/* ============================================================================
 * tests/playtests/v22-balance-harde.js — O-1 · hard/expert 档平衡画像补跑
 * ----------------------------------------------------------------------------
 * 目的：验证三新卡（squash/pepper/cherry，armT=0 即种即生效、无视防御秒杀）
 *   在 hard（HP×1.35, speed×1.15）和 expert（HP×1.80, speed×1.30）下
 *   是否因普通植物 DPS 隐性削弱而相对优势放大 → 触发失衡。
 *
 * 【六臂设计（同难度内对照）】
 *   HP = hard   × p0    （基线，不用新卡）
 *   HB = hard   × burst 策略
 *   HG = hard   × greedy 策略
 *   EP = expert × p0    （基线，不用新卡）
 *   EB = expert × burst 策略
 *   EG = expert × greedy 策略
 *
 * 不跨难度对比 normal 档——上一版把难度本身（HP×1.35/×1.80、speed×1.15/×1.30）
 * 对 P0 固定防线的压制全算到新卡头上，是判据缺陷导致的假阳性。
 * 本版改为同难度内对照：新卡臂 vs 同难度 p0 臂。
 * 所有 arm 使用同一个 htmlPath = 当前源码。
 *
 * 【判据（同难度内：新卡臂 vs 同难度 p0 基线）】
 *   Δ失守率 = p0失守率 − 新卡臂失守率（正数 = 新卡降低失守率 = 过强）≥ 10pp → O-1 FAIL
 *   Δ耗时   = (p0加权耗时 − 新卡臂加权耗时) / p0加权耗时（正数 = 新卡加快通关 = 过强）≥ 15% → O-1 FAIL
 *   全不触发 → O-1 PASS
 *
 * 【G0 复现门（p0 臂特供）】
 *   仅 HP/EP 两 p0 臂要求 1-1 全胜（1-1 只有 normal+cone，bot P0 防线应能扛住）。
 *   p0 臂 1-1 非全胜 → 标记 calibration 异常，数据不采信。
 *   burst/greedy 臂 1-1 失守不阻断（新卡未解锁，本质也是 P0，但可能因策略/种子波动失守，属正常读数）。
 *
 * 边界：只新增文件（本脚本 + results.json），不改源码 / 不改既有测试 / 不 commit。
 * 产物：tests/playtests/v22-balance-harde-results.json
 *
 * 跑法：
 *   node tests/playtests/v22-balance-harde.js
 * ==========================================================================*/

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { loadGame } = require(path.join(__dirname, '..', 'harness', 'index.js'));
const P = require(path.join(__dirname, 'lib', 'prelude.js'));

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT_JSON = path.join(__dirname, 'v22-balance-harde-results.json');

const DT = P.DT;
const BOT_DT = 0.25;
const MAX_T = 600;
const SEEDS_PER_LEVEL = 6;
const SEED_BASE = 9200;
const LEAK_X = 150;

// ---- 20 关有序列表（同 v21）----
const LEVEL_KEYS = [];
for (let w = 1; w <= 2; w++) for (let l = 1; l <= 10; l++) LEVEL_KEYS.push(w + '-' + l);

// ---- 发卡序列解锁门控（GDD §6.1 / 源码 CARD_AWARD）----
const AWARD_AT = { squash: '1-5', pepper: '1-7', cherry: '1-8' };

// ---- 应急爆发阈值（一字不改平移自 v22-balance-profile.js）----
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

// ---- bot 底座（一字不改平移自 v22-balance-profile.js）----
const PEA_COLS = [1, 2, 3, 4];
const NUT_COL = 6;
const SF_COL = 0;
const SF_TARGET = 4;
const NUT_TARGET = 5;
const HP = { normal: 180, cone: 340, fast: 140, bucket: 560 };

// ---- ARMS 配置（hard/expert 六臂：p0基线 + burst/greedy）----
const ARMS = [
  { id: 'HP', diff: 'hard',   policy: 'p0',     label: 'hard × p0（基线，不用新卡）' },
  { id: 'HB', diff: 'hard',   policy: 'burst',  label: 'hard × burst' },
  { id: 'HG', diff: 'hard',   policy: 'greedy', label: 'hard × greedy' },
  { id: 'EP', diff: 'expert', policy: 'p0',     label: 'expert × p0（基线，不用新卡）' },
  { id: 'EB', diff: 'expert', policy: 'burst',  label: 'expert × burst' },
  { id: 'EG', diff: 'expert', policy: 'greedy', label: 'expert × greedy' },
];

// ---------------- 工具（平移自 v22-balance-profile.js）----------------
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
const colOf = (x, gridX, cellW) => Math.floor((x - gridX) / cellW);
const colCenter = (c, gridX, cellW) => gridX + c * cellW + cellW / 2;

/** 异步 git status（避开会话级 spawnSync/execSync 对 cmd.exe 恒 EBUSY/挂起的坑）。 */
function gitStatus() {
  return new Promise((resolve) => {
    const p = spawn('git', ['status', '--porcelain'], { cwd: REPO_ROOT });
    const out = []; let err = '';
    p.stdout.on('data', (d) => out.push(d));
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => resolve({ lines: null, error: e.message }));
    p.on('close', (c) => {
      if (c !== 0) resolve({ lines: null, error: 'git status exit=' + c + ' ' + err });
      else resolve({ lines: Buffer.concat(out).toString('utf8').trim().split('\n').filter(Boolean), error: null });
    });
  });
}

// ---------------- 关卡静态内容分（同 v21 口径）----------------
function levelStatic(levelData, key) {
  const lv = levelData[key];
  const waves = lv.waves || [];
  let zCount = 0, threat = 0;
  for (const wv of waves) for (const s of (wv.spawns || [])) { zCount += s[1]; threat += s[1] * (HP[s[0]] || 180); }
  return { key, world: +key.split('-')[0], time: lv.time, water: !!lv.water, startSun: lv.startSun, totalWaves: lv.totalWaves, zCount, threat };
}

// ---------------- bot 上下文（平移自 v22-balance-profile.js）----------------
function buildCtx(sandbox, levelKey, levelData, policy) {
  const CARDS = sandbox.__CARDS;
  const cardIdx = {}, cardMap = {};
  CARDS.forEach((c, i) => { cardIdx[c.type] = i; cardMap[c.type] = c; });
  const consts = sandbox.__consts || {};
  const gridX = consts.GRID_X != null ? consts.GRID_X : 55;
  const cellW = consts.CELL_W != null ? consts.CELL_W : 90;
  const unlocked = {};
  for (const t of Object.keys(AWARD_AT)) {
    unlocked[t] = !!cardMap[t] && LEVEL_KEYS.indexOf(levelKey) >= LEVEL_KEYS.indexOf(AWARD_AT[t]);
  }
  return {
    levelKey, level: levelData, policy,
    waterRows: consts.WATER_ROWS || [1, 3],
    cardIdx, cardMap, gridX, cellW, unlocked,
    thr: BURST[policy === 'greedy' ? 'greedy' : 'burst'],
    reserve: 50,
  };
}

// ---------------- 占用集合（一字不改平移）----------------
function occSets(p) {
  const anyOcc = new Set(), solid = new Set(), byType = new Set(), pads = new Set();
  for (const pl of p.plantsArr) {
    const cell = pl.col + ',' + pl.row;
    anyOcc.add(cell);
    byType.add(pl.type + '@' + cell);
    if (pl.type === 'lilypad') pads.add(cell);
    else solid.add(cell);
  }
  return { anyOcc, solid, byType, pads };
}

// ---------------- canPlace（一字不改平移）----------------
function canPlace(col, row, ctx, s, type) {
  if (col < 0 || col > 8 || row < 0 || row > 4) return false;
  const cell = col + ',' + row;
  const isWaterRow = ctx.level.water && ctx.waterRows.includes(row);
  if (type === 'lilypad') return !s.anyOcc.has(cell);
  if (s.solid.has(cell)) return false;
  if (isWaterRow && !s.pads.has(cell)) return false;
  return true;
}

// ---------------- doPlant（一字不改平移）----------------
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

// ---------------- standardTick（一字不改平移）----------------
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
  if ((p.cardCD[req] || 0) > 0) return null;
  if (p.sun < c.cost) return null;
  if (!canPlace(head.col, head.row, ctx, s, req)) return null;
  return doPlant(g, p, ctx, req, head.col, head.row);
}

// ---------------- planBurst（一字不改平移）----------------
function planBurst(p, ctx, s) {
  const T = ctx.thr;
  const live = p.zombiesArr.filter((z) => !z.dead);
  if (!live.length) return null;
  const nSf = p.plantsArr.filter((q) => q.type === 'sunflower').length;
  if (nSf < SF_TARGET) return null;
  const avail = (t) => ctx.unlocked[t] && ctx.cardMap[t] && (p.cardCD[t] || 0) <= 0;
  const danger = live.filter((z) => z.x <= T.dangerX);
  if (!danger.length) return null;

  // ① 樱桃
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

  // ② 航椒
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

  // ③ 窝瓜
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

// ---------------- botTick（一字不改平移）----------------
function botTick(g, p, ctx) {
  const s = occSets(p);
  if (ctx.policy === 'burst' || ctx.policy === 'greedy') {
    const plan = planBurst(p, ctx, s);
    if (plan) {
      const cost = ctx.cardMap[plan.type].cost;
      if (p.sun >= cost + ctx.reserve) {
        return doPlant(g, p, ctx, plan.type, plan.col, plan.row) || null;
      }
    }
  }
  return standardTick(g, p, ctx, s);
}

// ---------------- singleRun（与 v22-balance-profile.js 同构，仅增加 setDiff）----------------
function runLevel(key, seed, arm) {
  const ctx = arm.ctxByLevel[key];
  const g = loadGame({ seed, htmlPath: arm.htmlPath, localStorage: makeStore() });
  g.setLevel(key);
  g.startGame('v22bal-' + key);
  // ★ 关键：startGame 之后设难度（若 startGame 未来重置 DIFF，此处兜底）
  g.setDiff(arm.diff);
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

  // ★ 自检：首帧后确认 DIFF 已生效
  let diffOk = false;

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
    if (!diffOk && i === 0) {
      const probe = g.probe();
      diffOk = (probe.DIFF === arm.diff);
    }
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
    levelKey: key, seed, outcome, diff: arm.diff, diffOk,
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

// ---------------- 单关聚合（平移）----------------
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
      task: 'O-1 · hard/expert 档平衡画像补跑（V22-QA-03 扩展）',
      date: new Date().toISOString().slice(0, 10),
      node: process.version,
      dt: DT, botDt: BOT_DT, maxT: MAX_T, seedsPerLevel: SEEDS_PER_LEVEL, seedBase: SEED_BASE,
      sunMode: 'REAL(unlocked) —— 同 v21 口径：真实经济，bot 自行收集阳光',
      diffSpec: 'hard（DIFFS.hard mult=1.35 speed=1.15）/ expert（DIFFS.expert mult=1.80 speed=1.30）',
      baselineRef: '同难度内 p0 臂（HP/EP）——不跨难度对比 normal 档',
      arms: ARMS.map((a) => ({ id: a.id, diff: a.diff, policy: a.policy, label: a.label })),
      botSpec: 'P0=v21 严格优先级通用混合防线（受威胁行补豌豆→col0向日葵≤4→col1..4铺豌豆→col6坚果≤5；水行先睡莲）；PBURST/PGREEDY=P0 + 爆发分支（樱桃→航椒→窝瓜顺序），两者共用规则代码、仅阈值不同（见 meta.burstThresholds），解锁门控见 meta.awardAt',
      burstThresholds: BURST,
      awardAt: AWARD_AT,
      unlockGate: '新卡仅在其 CARD_AWARD 发卡关及之后可用（squash@1-5 / pepper@1-7 / cherry@1-8），对齐真实解锁进度',
      runtimeMs: null,
    },
    precheck: {}, gates: {}, levels: {}, compare: null,
    verdict: null, calibration: null, assertions: [], pass: false,
  };
  const assert = (name, pass, detail) => {
    results.assertions.push({ name, pass: !!pass, detail });
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail || ''}`);
    return pass;
  };

  // ---- 卫生检查 ----
  const gitPre = await gitStatus();
  results.meta.gitPre = gitPre.error ? { error: gitPre.error } : { count: gitPre.lines.length };

  // ---- 预检：启动一只 arm 做环境自检（gate1-6 轻量版）----
  console.log('[预检] 环境自检 ...');
  const htmlPath = path.join(REPO_ROOT, 'plants-vs-zombies.html');
  process.env.PVZ_EXPECT_VER = 'v2.2.0';  // gate5 常量快照走环境变量，不设会拿 v2.1.1 误报 MISMATCH
  const { g: gPre, pre, gates } = await P.bootstrap({ expectVersion: 'v2.2.0', htmlPath });
  results.precheck = {
    version: pre.version, htmlPath: pre.htmlPath,
    measured: { freezeT: pre.measured.freezeT, cornCd: pre.measured.cornCd, butterP: pre.measured.butterP, applyFreezeCallSites: pre.measured.applyFreezeCallSites },
    domain: pre.domain,
  };
  results.gates = { pass: gates.pass, failed: gates.failedGates, results: gates.results.map((r) => ({ gate: r.gate, name: r.name, pass: r.pass, detail: r.detail })) };
  for (const r of gates.results) console.log(`  gate${r.gate} ${r.pass ? 'PASS' : 'FAIL'} ${r.name} — ${r.detail}`);
  assert('环境自检：七道前置门全过（gate1-6 硬门）', gates.pass, gates.failedGates.join(',') || '全过');

  // ---- 关卡静态分 ----
  const sb = gPre.sandbox;
  const L = sb.__LEVELS;
  const staticByKey = {};
  for (const k of LEVEL_KEYS) staticByKey[k] = levelStatic(L, k);

  // ---- 跑六臂 ----
  for (const arm of ARMS) {
    console.log(`\n========== Arm ${arm.id} · ${arm.label} ==========`);
    arm.htmlPath = htmlPath;
    process.env.PVZ_HTML_PATH = htmlPath;
    process.env.PVZ_EXPECT_VER = 'v2.2.0';

    // 卡片在位性前提
    const cards = sb.__CARDS;
    const hasNew = ['squash', 'pepper', 'cherry'].filter((t) => cards.some((c) => c.type === t));
    assert(`Arm ${arm.id} 前提：v2.2 源三张新卡在位`, hasNew.length === 3, `检出=${JSON.stringify(hasNew)}`);

    // 构建 ctx
    arm.ctxByLevel = {};
    for (const k of LEVEL_KEYS) arm.ctxByLevel[k] = buildCtx(sb, k, L[k], arm.policy);
    arm.static = staticByKey;

    console.log(`  [矩阵] 20 关 × ${SEEDS_PER_LEVEL} 种子 = ${20 * SEEDS_PER_LEVEL} 局 · diff=${arm.diff} · policy=${arm.policy} ...`);
    arm.levels = {};
    for (const k of LEVEL_KEYS) {
      const seeds = P.seeds(SEED_BASE + LEVEL_KEYS.indexOf(k) * 10, SEEDS_PER_LEVEL);
      const runs = seeds.map((s) => runLevel(k, s, arm));
      arm.levels[k] = aggLevel(k, runs, staticByKey[k]);
      const a = arm.levels[k];
      console.log(`    ${k.padEnd(5)} win=${a.wins}/${a.seeds} loss=${a.losses} T(med)=${String(a.gameTmedian).padStart(6)} burst=${a.burstPlants} kills=${a.killsTotal}`);
    }

    // DIFF 生效自检（首局 diffOk 字段）
    const allDiffOk = arm.levels['1-1'].runs.every((r) => r.diffOk === true);
    assert(`Arm ${arm.id} DIFF 生效自检：所有首帧 probe().DIFF === '${arm.diff}'`, allDiffOk,
      allDiffOk ? '全部 OK' : '存在 DIFF 不一致 → setDiff 未生效，数据不采信');

    results.levels['arm' + arm.id] = {};
    for (const k of LEVEL_KEYS) {
      const a = Object.assign({}, arm.levels[k]);
      a.runs = arm.levels[k].runs;
      results.levels['arm' + arm.id][k] = a;
    }
  }

  // ---- G0 复现门：p0 臂（HP/EP）1-1 必须全胜 ----
  // burst/greedy 臂在 1-1 新卡未解锁，本质也是 P0，但可能因策略差异/种子波动失守，属正常读数，不作为校准异常。
  console.log('\n[G0 复现门] p0 臂（HP/EP）1-1 全胜（hard/expert 特供：1-1 只有 normal+cone，bot P0 防线应能扛住）...');
  const calib = { gate: 'G0：p0 臂（HP/EP）1-1 必须全胜', arms: {}, pass: true };
  const P0_ARMS = ARMS.filter((a) => a.policy === 'p0');
  for (const arm of ARMS) {
    const a = results.levels['arm' + arm.id]['1-1'];
    const ok = a.wins === a.seeds;
    const isP0 = arm.policy === 'p0';
    if (isP0 && !ok) calib.pass = false;
    calib.arms['arm' + arm.id] = { key: '1-1', wins: a.wins, seeds: a.seeds, allWin: ok, policy: arm.policy, gateRelevant: isP0 };
    console.log(`    Arm ${arm.id}: 1-1 win=${a.wins}/${a.seeds} ${ok ? 'OK' : (isP0 ? '★FAIL（p0 臂校准异常，数据不采信）' : '(non-p0，不阻断)')}`);
  }
  results.calibration = calib;
  assert('G0 复现门：p0 臂（HP/EP）1-1 全胜', calib.pass,
    P0_ARMS.map((a) => `arm${a.id}=${calib.arms['arm' + a.id].wins}/${calib.arms['arm' + a.id].seeds}`).join(' '));

  // ---- 同难度内对照：新卡臂 vs p0 基线 ----
  // 不跨难度对比 normal；改为同难度内 p0 臂当基线。
  console.log('\n[对比] hard/expert 六臂同难度内对照');
  console.log('  关   | HP(p0)失守 HP:T中位 | HB:失守  HB:T中 | HG:失守  HG:T中 | EP(p0)失守 EP:T中 | EB:失守  EB:T中 | EG:失守  EG:T中');

  const ARM_IDS = ARMS.map((a) => 'arm' + a.id);
  const compareRows = [];

  for (const k of LEVEL_KEYS) {
    const row = { key: k, world: results.levels.armHP[k].world, water: results.levels.armHP[k].water, waves: results.levels.armHP[k].totalWaves, zCount: results.levels.armHP[k].zCount, threat: results.levels.armHP[k].threat, arms: {} };
    for (const id of ARM_IDS) {
      const a = results.levels[id][k];
      row.arms[id] = { lossRate: a.lossRate, losses: a.losses, seeds: a.seeds, Tmed: a.gameTmedian, TwinMed: a.gameTwinMedian, minZXworst: a.minZXworst, kills: a.killsTotal, plantedByType: a.plantedByType, burstPlants: a.burstPlants };
    }
    compareRows.push(row);

    const cell = (id) => `${String(row.arms[id].losses).padStart(1)}/${row.arms[id].seeds} ${String(row.arms[id].Tmed).padStart(6)}`;
    console.log(`  ${k.padEnd(5)} |${ARM_IDS.map((id) => ' ' + cell(id)).join(' |')}`);
  }

  // ---- 聚合 ----
  const aggOf = (armId, keys) => {
    const rows = keys.map((k) => results.levels[armId][k]);
    const games = sum(rows.map((r) => r.seeds));
    const losses = sum(rows.map((r) => r.losses));
    const wins = sum(rows.map((r) => r.wins));
    const Tsum = sum(rows.map((r) => r.gameTmedian * r.seeds));
    const burst = sum(rows.map((r) => r.burstPlants));
    return { games, wins, losses, lossRate: P.r4(losses / games), winRate: P.r4(wins / games), Tweighted: P.r2(Tsum / games), burstPlants: burst };
  };

  const SEGMENTS = {
    all_20: LEVEL_KEYS,
    post_1_5: LEVEL_KEYS.slice(LEVEL_KEYS.indexOf('1-5')),
    pepper_window_1_7plus: LEVEL_KEYS.slice(LEVEL_KEYS.indexOf('1-7')),
    cherry_window_1_8plus: LEVEL_KEYS.slice(LEVEL_KEYS.indexOf('1-8')),
  };

  const compareAgg = {};
  for (const seg of Object.keys(SEGMENTS)) {
    const o = {};
    for (const id of ARM_IDS) {
      const lid = ARMS[ARM_IDS.indexOf(id)].id;
      o[lid] = aggOf(id, SEGMENTS[seg]);
    }
    compareAgg[seg] = o;
  }

  console.log('\n[聚合] hard/expert 六臂同难度内对照');
  for (const seg of Object.keys(compareAgg)) {
    const s = compareAgg[seg];
    const armLabels = ARMS.map((a) => a.id);
    console.log(`  ${seg.padEnd(24)} 失守率 ${armLabels.map((l) => `${l}=${s[l].lossRate}(${s[l].losses}/${s[l].games})`).join(' ')} | 加权耗时 ${armLabels.map((l) => `${l}=${s[l].Tweighted}`).join(' ')}`);
  }

  // ---- 判据：同难度内，新卡臂 vs p0 基线 ----
  // 方向：p0失守率 − 新卡臂失守率 > 0 说明新卡降低了失守率（游戏变简单），即过强。
  //       p0加权耗时 − 新卡臂加权耗时 > 0 说明新卡加快了通关，即过强。
  const THV = { lossDropTrigger: 0.10, timeCompressTrigger: 0.15 };
  const verdict = { thresholds: THV, pairs: [], overall: null };

  // 配对：(hard p0 vs burst), (hard p0 vs greedy), (expert p0 vs burst), (expert p0 vs greedy)
  const PAIRS = [
    { p0Id: 'HP', newId: 'HB', diff: 'hard', policy: 'burst' },
    { p0Id: 'HP', newId: 'HG', diff: 'hard', policy: 'greedy' },
    { p0Id: 'EP', newId: 'EB', diff: 'expert', policy: 'burst' },
    { p0Id: 'EP', newId: 'EG', diff: 'expert', policy: 'greedy' },
  ];

  for (const pair of PAIRS) {
    const p0 = compareAgg.all_20[pair.p0Id];
    const nc = compareAgg.all_20[pair.newId];

    // Δ失守率 = p0失守率 − 新卡臂失守率（正数 = 新卡降低了失守率 = 过强）
    const lossRateDrop = P.r4(p0.lossRate - nc.lossRate);
    // Δ耗时 = (p0耗时 − 新卡臂耗时) / p0耗时（正数 = 新卡加快了通关 = 过强）
    const timeCompress = p0.Tweighted > 0
      ? P.r4((p0.Tweighted - nc.Tweighted) / p0.Tweighted)
      : null;

    const triggers = [];
    if (lossRateDrop >= THV.lossDropTrigger) triggers.push(`失守率下降=${(lossRateDrop * 100).toFixed(1)}pp ≥ ${(THV.lossDropTrigger * 100).toFixed(0)}pp`);
    if (timeCompress !== null && timeCompress >= THV.timeCompressTrigger) triggers.push(`时长压缩=${(timeCompress * 100).toFixed(1)}% ≥ ${(THV.timeCompressTrigger * 100).toFixed(0)}%`);

    verdict.pairs.push({
      label: `${pair.diff} ${pair.policy} vs p0`,
      diff: pair.diff, policy: pair.policy,
      p0Arm: pair.p0Id, p0LossRate: p0.lossRate, p0Losses: p0.losses, p0Games: p0.games,
      p0Tweighted: p0.Tweighted,
      newArm: pair.newId, newLossRate: nc.lossRate, newLosses: nc.losses, newGames: nc.games,
      newTweighted: nc.Tweighted, newBurstPlants: nc.burstPlants,
      lossRateDrop, timeCompress,
      triggers,
      tooStrong: triggers.length > 0,
    });
  }

  verdict.overall = {
    anyTriggered: verdict.pairs.some((p) => p.tooStrong),
    pass: !verdict.pairs.some((p) => p.tooStrong),
  };

  console.log('\n[过强判据] 阈值：失守率下降 ≥ 10pp（新卡让 p0 失守率降低 ≥ 10pp）或 通关时长压缩 ≥ 15%（新卡让 p0 加权耗时缩短 ≥ 15%）');
  console.log('  方向：p0 臂失守率 − 新卡臂失守率（正数 = 新卡让游戏变简单 = 过强）');
  for (const p of verdict.pairs) {
    const ld = `${(p.lossRateDrop * 100).toFixed(1)}pp`;
    const tc = p.timeCompress != null ? `${(p.timeCompress * 100).toFixed(1)}%` : 'N/A';
    const sign = p.tooStrong ? '★FAIL 过强' : 'PASS 在带内';
    console.log(`  ${p.label.padEnd(20)} ${p.p0Arm}:失守率=${p.p0LossRate}(${p.p0Losses}/${p.p0Games}) T=${p.p0Tweighted} | ${p.newArm}:失守率=${p.newLossRate}(${p.newLosses}/${p.newGames}) T=${p.newTweighted} 新卡=${p.newBurstPlants} | Δ失守率=${ld} Δ耗时=${tc} ⇒ ${sign}`);
  }

  results.compare = { rows: compareRows, agg: compareAgg };
  results.verdict = verdict;

  if (verdict.overall.pass) {
    console.log('\nO-1 PASS：hard/expert 下新卡相对同难度 p0 基线不过强，可安全封版。');
  } else {
    console.log('\nO-1 FAIL：新卡相对同难度 p0 基线过强。触发臂：');
    for (const p of verdict.pairs) {
      if (p.tooStrong) console.log(`  ${p.label}: ${p.triggers.join('; ')}`);
    }
    console.log('  建议检查 / 调整新卡在高难下的爆发参数。');
  }

  // ---- 可复现性 ----
  const detKey = '2-1', detSeed = SEED_BASE + LEVEL_KEYS.indexOf(detKey) * 10;
  const rA = runLevel(detKey, detSeed, ARMS[0]);
  const rB = runLevel(detKey, detSeed, ARMS[0]);
  const detEqual = JSON.stringify(rA) === JSON.stringify(rB);
  results.determinism = { key: detKey, seed: detSeed, arm: ARMS[0].id, equal: detEqual };
  assert('可复现性：同臂同关同种子逐字节一致', detEqual, detEqual ? `${detKey}#${detSeed} 两次 run 深度相等` : '不一致');

  // ---- 卫生 ----
  const gitPost = await gitStatus();
  if (gitPost.error) {
    results.meta.gitPost = { error: gitPost.error };
  } else {
    const mine = [/v22-balance-harde(\.js|-results\.json)?$/];
    const unexpected = gitPost.lines.filter((l) => !mine.some((re) => re.test(l)));
    results.meta.gitPost = { count: gitPost.lines.length, unexpected };
    assert('卫生：跑后工作树无任务外新增脏文件', unexpected.length === 0, unexpected.join(' | ') || `共 ${gitPost.lines.length} 项`);
  }

  // ---- 清理环境变量 ----
  delete process.env.PVZ_HTML_PATH;
  delete process.env.PVZ_EXPECT_VER;

  results.pass = results.assertions.every((a) => a.pass);
  results.meta.runtimeMs = Date.now() - t0;
  fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
  console.log(`\n产物：${OUT_JSON}`);
  console.log(`${results.pass ? 'V22-HARDE PASS' : 'V22-HARDE FAIL'}  (${results.meta.runtimeMs}ms)`);
  process.exitCode = results.pass ? 0 : 1;
}

main().catch((e) => { console.error('V22-HARDE CRASH:', (e && e.stack) || e); process.exitCode = 2; });