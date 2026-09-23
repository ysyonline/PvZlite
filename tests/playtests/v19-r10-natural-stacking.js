'use strict';
/* ============================================================================
 * tests/playtests/v19-r10-natural-stacking.js — R10 自然对局同格堆叠频率采样（v1.9）
 * ----------------------------------------------------------------------------
 * 任务：production/v1.9-plan.md §2 R10（用户裁决 Q-1=B）。R7 为受控注入采样
 *       （紧堆叠簇 +16px 步进，P(≥1|n≥2) 四类全 1.0 是几何确定性结论）；本脚本补
 *       「从受控到自然」的画像：真实波次推进（newWave/checkWave 原样）+ 真实种植
 *       路径（selectCard→clickGrid→onClick→canPlant→扣费→cardCD→spawnPlant）+
 *       自然出怪（串行门/timer 路径、R(0.92,1.08) 速度抖动、行随机），观测每次
 *       溅射弹着点的落点格活僵尸数 nStack 分布，回答：自然对局中同格堆叠到底
 *       多频繁（stackOpportunity）、堆叠时同格锁是否仍然 P(≥1)=1.0、以及自然
 *       溢杀率画像（真实死亡口径，供 R11 溅射价值分析引用）。纯测量，源码零改动。
 *
 * 【脚本头部四条隐含前提声明（机器校验=bootstrap gate5 + 本脚本 assertion）】
 * ①orange 爆点 = 溅射弹着点标记（源码 L1596，每弹至多一次；butter 弹亦带 splash
 *   表故同计，与 R7 同一桥机制）；spawnBurst 沙箱桥可包装（runOnce 内实测）。
 * ②nStack 与溅射判定同刻同口径：快照在 spawnBurst 时点 = 溅射循环之后、killZombie
 *   之前（源码序：直中 hp 写 → 溅射 hp 写 ×n → spawnBurst → killZombie）⇒ 快照
 *   的 dead 标志与溅射循环 z2.dead 判定同帧同态；colOf 同源 __consts
 *   （colOf(x)=floor((x−GRID_X)/CELL_W)）。
 * ③自然对局 = 真实波次 + 真实种植 + 自然出怪；阳光由 ?test=1 锁 9999（阳光经济
 *   不在本测量口径内，testMode 纯沙盒不写档）；卡牌经 selectCard(CARDS 下标) 旁路
 *   deck 组合（deck 是元进度语义非战斗语义）；种植仍受 canPlant/扣费/cardCD 全约束。
 * ④L3（月夜草坪）无 water/roof（runOnce 内实测断言）⇒ liftX≡0 ⇒ 弹着点行号可由
 *   zy 精确反解 row=round((zy−GRID_Y−CELL_H/2)/CELL_H)；僵尸同排判定 z.row 直读。
 *
 * 【与 R7 的关键机制差异】真实波次推进必须走 g.tick(dt)（harness 外置时钟：gt 累加
 *   守卫与 loop() 同构，checkWave 的 minGap/兜底全靠 gt）——__updateRaw 不推 gt，
 *   若用之 wave 恒 0 永不开波。R7 用 forceWaves 锁推进故无此问题。
 *
 * 跑法（harness 模式，node 直跑，无需 CDP/端口）：
 *   "C:/Users/user3667/.workbuddy/binaries/node/versions/22.22.2-3/node.exe" \
 *     tests/playtests/v19-r10-natural-stacking.js
 * 固定种子逐字节可复现（同命令跑两遍，除 meta.runtimeMs 外全等；bot 只读 probe
 *   不消费随机数，包装原样转发不改变 R() 调用次序）。
 * 环境变量：PVZ_HTML_PATH 覆盖被测源码（判别力自证对 v1.7 旧源复跑走临时提取件）。
 *
 * 口径权威：tests/playtests/lib/r9a-metric-spec.md §3（溢杀 clamp，冻结）。
 * 产出：tests/playtests/v19-r10-natural-stacking-results.json + production/v19-r10-report.md
 * 纪律：本任务只新增文件、不改任何既有文件；禁 commit / 禁 push（分刀提交归 Task#5）。
 * ==========================================================================*/

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { loadGame } = require(path.join(__dirname, '..', 'harness', 'index.js'));
const P = require(path.join(__dirname, 'lib', 'prelude.js'));

const OUT_JSON = path.join(__dirname, 'v19-r10-natural-stacking-results.json');
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const V17_COMMIT = 'c379872';
const DT = P.DT;
const LEVEL_NO = 3;          // L3 月夜：7 波、fast/cone/bucket 齐备、无水无屋顶（前提④）
const MAX_T = 480;           // 单跑硬顶（正常通关 ~200-280s；超时记 timeout 仍有效）
const BOT_DT = 0.25;         // bot 决策节拍（读 probe → 至多一次种植尝试）
const SEEDS_PER_ARM = 8;
const SEED_BASE = 8101;      // 避开 R7 段 6101+ / 哨兵段 6201/6301 / 旧占用 7101
const SC_SEEDS = [8131, 8132]; // 旧源判别力自证种子段

const r2 = P.r2, r4 = P.r4;
const median = (arr) => { if (!arr || !arr.length) return null; const s = arr.slice().sort((a, b) => a - b); return s[(s.length - 1) >> 1]; };

// ---------------- 臂定义（植物类型 × 防线布局；cols = 逐行种植目标列，col-major 填充） ----------------
const ARMS = [
  { id: 'nat-L3-cabbage-c0123', type: 'cabbage', cols: [0, 1, 2, 3] },   // 同格锁小杯系：20 株·2s 卡冷
  { id: 'nat-L3-corn-c0123',    type: 'corn',    cols: [0, 1, 2, 3] },   // 同格锁玉米系：黄油定身改堆叠画像
  { id: 'nat-L3-melon-c012',    type: 'melon',   cols: [0, 1, 2] },      // 带状对照：55px 跨格带仍生效
];
ARMS.forEach((a, i) => { a.seeds = P.seeds(SEED_BASE + i * 10, SEEDS_PER_ARM); });

// ---------------- 本地溢杀聚合（口径=r9a-metric-spec §3 冻结；不用 m.overflow.*，
// prelude finalize 的 overflow 分栏不可用——就地按 hitKind 聚合）。
// 【读法锚定现行 prelude（09-22 修复后）】hp 事件 kind='hp'（事件标记）+ hitKind=分类
// （direct/splash/unknown）。R7 旧脚本读 e.w.kind 恰好依赖修复前「重复 kind 键被分类值
// 覆盖」的缺陷 ⇒ 对现行 prelude 是潜在回归（全部落 unknown）；本脚本读 hitKind。 ----------------
function localOverflow(ledger, mode) {
  const col = () => ({ raw: 0, eff: 0, ovf: 0, events: 0, ovfEvents: 0, rate: null });
  const ov = { mode, direct: col(), splash: col(), unknown: col() };
  for (const e of ledger.events) {
    if (typeof e.kind !== 'string' || e.delta == null) continue;   // 只吃伤害类事件
    const k = (typeof e.hitKind === 'string') ? e.hitKind : (e.kind === 'hp' ? 'unknown' : e.kind);
    const c = ov[k] || ov.unknown;
    c.raw += e.delta; c.eff += e.eff; c.ovf += e.overflow; c.events++;
    if (e.overflow > 1e-9) c.ovfEvents++;
  }
  for (const k of ['direct', 'splash', 'unknown']) {
    const c = ov[k];
    c.raw = r2(c.raw); c.eff = r2(c.eff); c.ovf = r2(c.ovf);
    c.rate = c.raw > 0 ? r4(c.ovf / c.raw) : null;
  }
  return ov;
}

// ---------------- 自然对局开局：?test=1（阳光锁+纯沙盒）→ setLevel(3) → startGame ----------------
function bootNatural(seed, htmlPath) {
  const g = loadGame({ seed, search: '?test=1', htmlPath: htmlPath || undefined });
  g.setLevel(LEVEL_NO);
  g.startGame('r10');
  return g;
}

// ---------------- 单臂单种子：真实对局全程推演 + 逐弹着点归因 ----------------
function runOnce(arm, seed, ctx, htmlPath) {
  const g = bootNatural(seed, htmlPath);
  const sb = g.sandbox;
  const K = sb.__consts;
  const colOf = (x) => Math.floor((x - K.GRID_X) / K.CELL_W);
  const rowOfY = (y) => Math.round((y - (K.GRID_Y + K.CELL_H / 2)) / K.CELL_H);
  const lvl = sb.__level;
  if (lvl.roof || lvl.water) throw new Error('前提④崩塌：L3 须无 roof/water（liftX≡0），实测 roof=' + !!lvl.roof + ' water=' + !!lvl.water);

  const ledger = P.createLedger({ warmupT: 0, classify: P.makeHitClassifier(ctx.classifierTable) });
  const timeline = [];
  const probed = new Set();
  let deaths = 0;

  const inst = P.instrument(g, { onFreeze: (z, preT) => ledger.noteFreeze(z, ledger.tNow, preT) });
  // 死亡计数走 killZombie 沙箱桥包装（帧扫描不可靠：killZombie 置 dead 后同帧被 filter
  // 移出数组，逐帧扫描 __zombies 只能看到极少数死亡实体——首跑 deaths=24/应有 ~700 的根因）
  const origKill = sb.killZombie;
  if (typeof origKill !== 'function') throw new Error('killZombie 沙箱桥缺失（死亡计数依赖）');
  sb.killZombie = function (z) { deaths++; return origKill(z); };

  // 弹着点标记（前提①）：orange 爆点 = 溅射弹着点；同帧僵尸快照供 nStack（前提②时点）
  const origBurst = sb.spawnBurst;
  if (typeof origBurst !== 'function') throw new Error('spawnBurst 沙箱桥缺失（前提①崩塌）');
  sb.spawnBurst = function (x, y, color, n) {
    if (color === 'orange') {
      const row = rowOfY(y);
      timeline.push({
        kind: 'impact', x, y, row, t: ledger.tNow,
        zs: sb.__zombies.filter(Boolean).map((z) => ({ x: z.x, row: z.row, dead: !!z.dead, hp: z.hp })),
      });
    }
    return origBurst(x, y, color, n);
  };

  const cardIdx = sb.__CARDS.findIndex((c) => c.type === arm.type);
  if (cardIdx < 0) throw new Error('CARDS 缺卡: ' + arm.type);
  g.enableSpawnCount();

  // 真实波次推进的帧循环（g.tick：gt 外置时钟 + state/paused 守卫，与 loop() 同构）
  let tNow = 0, botNext = 0, outcome = null, endProbe = null, botPlants = 0;
  const stepsMax = Math.ceil(MAX_T / DT);
  for (let i = 0; i < stepsMax; i++) {
    g.tick(DT);
    tNow += DT; ledger.tNow = tNow;
    for (const z of sb.__zombies) {
      if (!z) continue;
      if (!probed.has(z)) {           // 自然出怪逐帧扫描挂 hp 探针（入场帧不可能被击中，零漏记）
        probed.add(z);
        P.attachHpProbe(z, (preHp, postHp) => {
          const w = ledger.noteHpWrite(z, ledger.tNow, preHp, postHp);
          timeline.push({ kind: 'hp', w, zx: z.x, zcol: colOf(z.x), zrow: z.row });
        });
      }
    }
    if (tNow >= botNext) {
      botNext += BOT_DT;
      const p = g.probe();
      if (p.state !== 'play') { outcome = p.won ? 'win' : 'lose'; endProbe = p; break; }
      // bot：col-major 扫描（前排列优先），首个空格尝试种植；受 cardCD/canPlant/扣费 真实约束
      const occ = new Set(p.plantsArr.map((q) => q.col + ',' + q.row));
      outer:
      for (const col of arm.cols) {
        for (let row = 0; row < 5; row++) {
          if (!occ.has(col + ',' + row)) {
            const cd = p.cardCD[arm.type] || 0;
            if (cd <= 0 && p.sun > 0) {
              const sel = p.selected;
              if (!sel || sel.type !== arm.type) g.selectCard(cardIdx);   // 已选中同卡不重选（toggle 语义）
              g.clickGrid(col, row);
              botPlants++;
            }
            break outer;   // 每 tick 至多一次尝试
          }
        }
      }
    }
  }
  if (!outcome) { endProbe = g.probe(); outcome = endProbe.state === 'play' ? 'timeout' : (endProbe.won ? 'win' : 'lose'); }
  sb.spawnBurst = origBurst;
  sb.killZombie = origKill;

  // ---- 逐弹着点归因（源码序：hp 写 → spawnBurst ⇒ hp 事件归属后一个弹着点，R7 同款） ----
  const impacts = [];
  let cur = { direct: [], splash: [], unknown: [] };   // 逐弹累积桶（弹着点切分时整体重赋值，须 let）
  let unknownTotal = 0;
  for (const e of timeline) {
    if (e.kind === 'impact') {
      const icol = colOf(e.x);
      const dtypes = [...new Set(cur.direct.map((s) => s.w.delta))];
      impacts.push({
        t: r4(e.t), x: r4(e.x), icol, row: e.row,
        type: dtypes.length === 1 ? (ctx.dmgToType[dtypes[0]] || `dmg${dtypes[0]}`) : (dtypes.length ? 'mixed' : 'none'),
        nStack: e.zs.filter((z) => !z.dead && z.row === e.row && colOf(z.x) === icol).length,
        hasDirect: cur.direct.length > 0,
        v: cur.splash.length,
        vCross: cur.splash.filter((s) => s.zcol !== icol).length,
        victims: cur.splash.map((s) => ({ zx: r4(s.zx), col: s.zcol, cross: s.zcol !== icol, dmg: s.w.delta, eff: s.w.eff, ovf: s.w.overflow })),
        unknown: cur.unknown.length,
      });
      unknownTotal += cur.unknown.length;
      cur = { direct: [], splash: [], unknown: [] };
    } else {
      // 现行 prelude：kind='hp'（事件标记）+ hitKind=分类（R7 旧读法 e.w.kind 依赖修复前缺陷，勿复制）
      const b = e.w.hitKind === 'direct' ? 'direct' : e.w.hitKind === 'splash' ? 'splash' : 'unknown';
      if (b === 'unknown') unknownTotal++; else cur[b].push(e);
    }
  }
  unknownTotal += cur.unknown.length;   // 收尾残留（理论 0：每个直接伤害弹必有橙爆点）

  // ---- 逐种子聚合 ----
  const nStackDist = { 0: 0, 1: 0, 2: 0, 3: 0, '4+': 0 };
  for (const im of impacts) { const k = im.nStack >= 4 ? '4+' : String(im.nStack); nStackDist[k]++; }
  const stackImps = impacts.filter((i) => i.nStack >= 2);
  const v0stack = stackImps.filter((i) => i.v === 0).length;
  const victimsTotal = impacts.reduce((a, i) => a + i.v, 0);
  const vCross = impacts.reduce((a, i) => a + i.vCross, 0);
  const ov = localOverflow(ledger, 'real');
  const sum = (f) => impacts.reduce((a, i) => a + f(i), 0);

  return {
    seed, outcome, waves: endProbe ? endProbe.wave : null, gameT: r2(tNow),
    spawns: g.spawnCount(), botPlants, deaths, zombiesLeftAtEnd: endProbe ? endProbe.zombies : null,
    fired: inst.melonThrow, hits: impacts.length, firedMinusHits: inst.melonThrow - impacts.length, butterCalls: inst.freezeCalls,
    impactsNoDirect: impacts.filter((i) => !i.hasDirect).length,
    unknownEvents: unknownTotal,
    nStackDist,
    stackImpacts: stackImps.length,
    v0GivenStack: v0stack,
    stackOpportunity: impacts.length ? r4(stackImps.length / impacts.length) : null,
    victimsTotal, vCross,
    v0: impacts.filter((i) => i.v === 0).length,
    pGe1GivenStack: stackImps.length ? r4(1 - v0stack / stackImps.length) : null,
    splashOvfFromImpacts: r4(sum((i) => i.victims.reduce((a, v) => a + v.ovf, 0))),
    splashRawFromImpacts: r4(sum((i) => i.victims.reduce((a, v) => a + v.dmg, 0))),
    overflow: {
      splash: { raw: ov.splash.raw, eff: ov.splash.eff, ovf: ov.splash.ovf, rate: ov.splash.rate },
      direct: { raw: ov.direct.raw, eff: ov.direct.eff, ovf: ov.direct.ovf, rate: ov.direct.rate },
    },
    sampleImpacts: impacts.slice(0, 3),
  };
}

// ---------------- 主流程 ----------------
async function main() {
  const t0 = Date.now();
  const results = {
    meta: {
      task: 'V19 R10 自然对局同格堆叠频率采样（真实波次+真实种植+自然出怪；v1.9-plan §2 R10，Q-1=B）',
      date: new Date().toISOString().slice(0, 10),
      node: process.version,
      htmlPath: P.htmlPath(),
      levelNo: LEVEL_NO, maxT: MAX_T, botDt: BOT_DT, dt: DT,
      seedRule: `每臂 ${SEEDS_PER_ARM} 种子；第 i 臂基址 ${SEED_BASE}+10i；旧源自证段 ${SC_SEEDS.join('/')}`,
      botNote: 'bot=col-major 空格填充（每 0.25s 至多一试），只读 probe 不消费随机数；种植走 selectCard→clickGrid 真实路径（canPlant/扣费/cardCD 全约束）；?test=1 阳光锁 9999',
      nStackSemantics: 'nStack=弹着点格内在弹结算当刻的同排活僵尸数（含直中目标；快照时点=溅射循环后/killZombie 前，与 z2.dead 判定同帧同态）；victim 候选恒排除直中目标本体（z2===z）',
      preconditionHeader: [
        '①orange 爆点=溅射弹着点标记（L1596，每弹至多一次；butter 弹亦带 splash 表同计）',
        '②nStack 与溅射判定同刻同口径（colOf 同源 __consts；快照=溅射循环后/killZombie 前）',
        '③自然对局=真实波次+真实种植+自然出怪；?test=1 阳光锁；deck 经 CARDS 下标旁路（元进度非战斗语义）',
        '④L3 无 water/roof（liftX≡0）⇒ 弹着点行号由 zy 精确反解（runOnce 实测断言）',
      ],
      runtimeMs: null,
      git: {},
    },
    preconditions: null,
    gates: null,
    arms: {},
    selfcheck: {},
    verdicts: {},
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
    results.meta.git.pre = { count: lines.length, lines, note: 'v1.9 在途刀（立项刀+GRID 文档）与 .workbuddy 记账为预期在途项' };
    console.log(`[hygiene] git status pre: ${lines.length} 项`);
  } catch (e) { results.meta.git.pre = { error: e.message }; }

  // ---- 七道门 bootstrap（新源）----
  console.log('[bootstrap] 七道前置门 + 前提实测 ...');
  const { g: gBoot, pre, gates } = await P.bootstrap({});
  results.preconditions = pre;
  results.gates = { pass: gates.pass, failedGates: gates.failedGates, results: gates.results.map((r) => ({ gate: r.gate, name: r.name, pass: r.pass, detail: r.detail })) };
  for (const r of gates.results) console.log(`  gate${r.gate} ${r.pass ? 'PASS' : 'FAIL'} ${r.name} — ${r.detail}`);
  let ok = assert('七道前置门全过(gate1-6硬门)', gates.pass, gates.failedGates.join(',') || 'gate7 软门恒过');
  ok = assert('前提①:spawnBurst 沙箱桥存在(弹着点标记依赖)', typeof gBoot.sandbox.spawnBurst === 'function', typeof gBoot.sandbox.spawnBurst);
  const K = gBoot.sandbox.__consts;
  ok = assert('前提②:GRID 常量与 colOf 同源', K.GRID_X === 55 && K.CELL_W === 90, `GRID_X=${K.GRID_X} CELL_W=${K.CELL_W}`);
  const mL3 = gBoot.sandbox.__LEVELS[LEVEL_NO];
  ok = assert('前提④:关卡常量在案(L3 无 water/roof)', !!mL3 && !mL3.water && !mL3.roof && mL3.totalWaves === 7,
    `L3 water=${!!(mL3 && mL3.water)} roof=${!!(mL3 && mL3.roof)} waves=${mL3 && mL3.totalWaves}`);

  const mSplash = pre.measured.splash;
  const classifierTable = {
    direct: [mSplash.cabbage.dmg, mSplash.melon.dmg, mSplash.corn.dmg],
    splash: [mSplash.cabbage.dmg * mSplash.cabbage.splashRatio, mSplash.melon.dmg * mSplash.melon.splashRatio, mSplash.corn.dmg * mSplash.corn.splashRatio],
  };
  const dmgToType = {};
  for (const t of ['cabbage', 'corn', 'melon']) dmgToType[mSplash[t].dmg] = t;
  const ctxNew = { measured: pre.measured, classifierTable, dmgToType };

  // ---- 判别力自证准备：提取 v1.7 旧源到系统 temp（同格锁前的带状几何） ----
  const oldHtmlPath = path.join(os.tmpdir(), 'pvz-r10-v17-c379872.html');
  let oldReady = false;
  try {
    const code = execSync(`git show ${V17_COMMIT}:plants-vs-zombies.html`, { cwd: REPO_ROOT, encoding: 'utf8' });
    fs.writeFileSync(oldHtmlPath, code);
    oldReady = true;
    console.log(`[selfcheck] v1.7 旧源已提取 → ${oldHtmlPath} (${code.length} chars)`);
  } catch (e) { console.error(`[selfcheck] 旧源提取失败: ${e.message}`); }

  // ---- 跑矩阵（3 臂 × 8 种子自然对局） ----
  const expectations = P.createExpectations();
  expectations.expect('impacts.all', 200, '全部新源臂橙爆点弹着事件总数');
  expectations.expect('deaths.all', 40, '新源臂真实死亡总数（自然对局有效性；单臂全波约 15-30 只）');
  expectations.expect('stack.impacts', 8, 'nStack≥2 堆叠机会弹着总数（现象存在性）');

  const armResults = {};
  for (const arm of ARMS) {
    const perSeed = [];
    for (const seed of arm.seeds) {
      const r = runOnce(arm, seed, ctxNew);
      perSeed.push(r);
      expectations.inc('impacts.all', r.hits);
      expectations.inc('deaths.all', r.deaths);
      expectations.inc('stack.impacts', r.stackImpacts);
    }
    const tot = (f) => perSeed.reduce((a, b) => a + f(b), 0);
    const mergeDist = (key) => perSeed.reduce((a, r) => a + r.nStackDist[key], 0);
    const nStackDist = { 0: mergeDist('0'), 1: mergeDist('1'), 2: mergeDist('2'), 3: mergeDist('3'), '4+': mergeDist('4+') };
    const impactsAll = tot((r) => r.hits);
    const stackImpacts = tot((r) => r.stackImpacts);
    const splashRaw = r2(tot((r) => r.overflow.splash.raw)), splashOvf = r2(tot((r) => r.overflow.splash.ovf));
    const directRaw = r2(tot((r) => r.overflow.direct.raw)), directOvf = r2(tot((r) => r.overflow.direct.ovf));
    armResults[arm.id] = {
      id: arm.id, type: arm.type, cols: arm.cols, seeds: arm.seeds, perSeed,
      agg: {
        impacts: impactsAll,
        fired: tot((r) => r.fired), firedMinusHits: tot((r) => r.firedMinusHits),
    nStackDist,
    stackImpacts,
    stackOpportunity: impactsAll ? r4(stackImpacts / impactsAll) : null,
        wins: perSeed.filter((r) => r.outcome === 'win').length,
        loses: perSeed.filter((r) => r.outcome === 'lose').length,
        timeouts: perSeed.filter((r) => r.outcome === 'timeout').length,
        wavesMedian: median(perSeed.map((r) => r.waves)),
        gameTMedian: median(perSeed.map((r) => r.gameT)),
        deaths: tot((r) => r.deaths), spawns: tot((r) => r.spawns), botPlants: tot((r) => r.botPlants),
        butterCalls: tot((r) => r.butterCalls),
        impactsNoDirect: tot((r) => r.impactsNoDirect), unknownEvents: tot((r) => r.unknownEvents),
        victimsTotal: tot((r) => r.victimsTotal), vCross: tot((r) => r.vCross),
        overflow: {
          splash: { raw: splashRaw, ovf: splashOvf, rate: splashRaw > 0 ? r4(splashOvf / splashRaw) : null },
          direct: { raw: directRaw, ovf: directOvf, rate: directRaw > 0 ? r4(directOvf / directRaw) : null },
        },
      },
    };
    // 臂级 P(≥1|n≥2)：v0GivenStack（nStack≥2 且 v=0 的弹着数）逐种子池化（不能平均比值）
    const poolStack = perSeed.reduce((a, r) => { a.imp += r.stackImpacts; a.v0 += r.v0GivenStack; return a; }, { imp: 0, v0: 0 });
    armResults[arm.id].agg.pGe1GivenStack = poolStack.imp ? r4(1 - poolStack.v0 / poolStack.imp) : null;
    const a = armResults[arm.id].agg;
    console.log(`[${arm.id}] impacts=${a.impacts} dist={0:${a.nStackDist[0]},1:${a.nStackDist[1]},2:${a.nStackDist[2]},3:${a.nStackDist[3]},4+:${a.nStackDist['4+']}} stackOp=${a.stackOpportunity} P(ge1|stack)=${a.pGe1GivenStack} vCross=${a.vCross} splashRate=${a.overflow.splash.rate} wins=${a.wins}/8 wavesMed=${a.wavesMedian}`);
    results.arms[arm.id] = armResults[arm.id];
  }

  // ---- 判别力自证：v1.7 旧源统计法（每臂 2 种子，60s 窗 + teleport 回传存活靶） ----
  // 【为何不用自然对局自证】自然堆叠机会率 ~1-4% ⇒ 2 种子的堆叠弹样本 <3，旧源跨格溅射
  //   在小样本下凑不出事件（首跑实证 vCross=0/0 与 0/2）⇒ 采用统计法（R7 探针已验证）：
  //   紧堆叠摆位 [800, 816]（同排、跨格 16px）+ 60s 窗口 + teleport=300 回传 ⇒ 两目标
  //   均为存活靶（hp×200，全程不吃 killZombie 中断归因），单窗即得 ~5-17 次弹着点样本。
  //   【六轮几何解剖锚定的形态判据】抛物弹越顶飞行：直中目标=最左者（x>pos.x−10），
  //   弹着点≈直中目标 x−49（提前量），溅射带=弹着点 ±30px ⇒ 弹着点落 col8 且 5px/帧
  //   跨界抖动 ⇒ 旧源带状几何下同格/跨格两种受害都会自然出现（跨格需 >0 即带状证据）；
  //   新源同格锁（splashGrid）⇒ vCross 恒 0。
  //   【分类器陷阱】melon 溅射伤 35.75 > 阈值 10，阈值分类器必误判 ⇒ 必须用
  //   makeHitClassifier 伤害表精确匹配（direct/splash 全用实测表值推导）。
  console.log('[selfcheck] v1.7 旧源判别力（统计法：60s+teleport+[800,816]）...');
  const sc = results.selfcheck;
  if (oldReady) {
    const gOld = loadGame({ seed: 1, htmlPath: oldHtmlPath });
    gOld.setLevel(1); gOld.startGame('r10sc'); gOld.forceWaves(5); gOld.clearField();
    const oldPre = P.measurePreconditions(gOld);
    sc.oldPreconditions = { version: oldPre.measured.version, cabbageGrid: oldPre.measured.splash.cabbage.splashGrid };
    console.log(`[selfcheck] 旧源前提: version=${oldPre.measured.version} cabbage.grid=${oldPre.measured.splash.cabbage.splashGrid}（期望 false=带状）`);
    const oldTable = {
      direct: [oldPre.measured.splash.cabbage.dmg, oldPre.measured.splash.melon.dmg, oldPre.measured.splash.corn.dmg],
      splash: [oldPre.measured.splash.cabbage.dmg * oldPre.measured.splash.cabbage.splashRatio, oldPre.measured.splash.melon.dmg * oldPre.measured.splash.melon.splashRatio, oldPre.measured.splash.corn.dmg * oldPre.measured.splash.corn.splashRatio],
    };
    const classifyOld = P.makeHitClassifier(oldTable);

    // 统计法单跑：单株 cabbage（col0/row2）× 紧堆叠双靶 [800, 816]，60s + 回传。
    // 归因：hp 事件挂 pend 队列，spawnBurst(orange) 时点 flush ⇒ 「hp 归属后一弹着点」（源码序同款）。
    const runStat = (html, seed, table) => {
      const g = P.freshGame(seed, { htmlPath: html });
      const sb = g.sandbox;
      const K = sb.__consts;
      const colOf = (x) => Math.floor((x - K.GRID_X) / K.CELL_W);
      const classify = P.makeHitClassifier(table);
      const SURV = 180 * P.SURVIVOR_MULT;
      const zA = P.injectZombie(g, { x: 800, hp: SURV, maxHp: SURV });
      const zB = P.injectZombie(g, { x: 816, hp: SURV, maxHp: SURV });
      const zs = [zA, zB];
      const pend = [];                 // 待归属 hp 事件（splash 才计受害）
      const impacts = [];              // 每弹着点：{icol, vSame, vCross}
      const origB = sb.spawnBurst;
      sb.spawnBurst = function (x, y, c, n) {
        if (c === 'orange') {
          const icol = colOf(x);
          impacts.push({
            icol,
            vSame: pend.filter((e) => e.hitKind === 'splash' && e.zcol === icol).length,
            vCross: pend.filter((e) => e.hitKind === 'splash' && e.zcol !== icol).length,
          });
          pend.length = 0;
        }
        return origB(x, y, c, n);
      };
      for (const z of zs) P.attachHpProbe(z, (pre, post) => {
        const w = { delta: pre - post, hitKind: classify(pre - post), zcol: colOf(z.x) };
        if (w.hitKind === 'splash') pend.push(w);
      });
      P.injectPlant(g, 'cabbage', 0);
      P.runWindow(g, { ledger: P.createLedger({ classify: P.makeHitClassifier(table) }), zombies: zs, duration: 60, teleport: P.TELEPORT_X, p: 0, T: 0, cd: 1, nPlants: 1 });
      sb.spawnBurst = origB;
      const vSame = impacts.reduce((a, i) => a + i.vSame, 0);
      const vCross = impacts.reduce((a, i) => a + i.vCross, 0);
      return { seed, impactsNo: impacts.length, vSame, vCross };
    };

    // 旧源（带状几何）：vCross>0 即带状证据（跨格受害自然出现）；vSame>0 佐证样本有效性
    sc.oldRuns = SC_SEEDS.map((s) => runStat(oldHtmlPath, s, oldTable));
    sc.discriminative = sc.oldRuns.every((r) => r.vSame > 0 && r.vCross > 0);
    ok = assert('自证:旧源 cabbage 带状(同格+跨格双溅)', sc.discriminative,
      sc.oldRuns.map((r) => `seed${r.seed}:imps=${r.impactsNo} same=${r.vSame},cross=${r.vCross}`).join(' '));

    // 新源（同格锁）：同款场景 vCross 恒 0；vSame≥1 佐证同格溅射正常工作
    const newTable = ctxNew.classifierTable;
    const classifyNew = P.makeHitClassifier(newTable);
    sc.newRuns = SC_SEEDS.map((s) => runStat(undefined, s, newTable));   // undefined = 现行源码
    sc.newLocked = sc.newRuns.every((r) => r.vSame > 0 && r.vCross === 0);
    ok = assert('自证:新源 cabbage 只溅同格(同格锁)', sc.newLocked,
      sc.newRuns.map((r) => `seed${r.seed}:imps=${r.impactsNo} same=${r.vSame},cross=${r.vCross}`).join(' '));
    sc.pairComplete = true;
  } else {
    sc.pairComplete = false;
    ok = assert('自证:旧源臂完成', false, '旧源提取失败，判别力自证不完整');
  }
  try { if (fs.existsSync(oldHtmlPath)) fs.rmSync(oldHtmlPath); } catch (e) { /* best effort */ }
  sc.tempCleaned = !fs.existsSync(oldHtmlPath);

  // ---- 收尾：expectations 核查 ----
  const expVerdict = expectations.verify();
  results.expectations = { snapshot: expectations.snapshot(), ...expVerdict };
  ok = assert('执行计数器达标(gate4 收尾)', expVerdict.pass, expVerdict.unmet.map((u) => `${u.name}:${u.actual}<${u.min}`).join('; ') || '全部达标');

  // ================= 验收断言 =================
  console.log('[verdicts] 验收 ①~⑤ ...');
  const newArms = ARMS.map((a) => armResults[a.id]);
  results.verdicts.stackPortrait = {
    semantics: 'stackOpportunity = P(弹着点格 nStack≥2)（自然对局堆叠机会率，R7 受控采样无此量）；P(≥1|n≥2) = 堆叠机会下溅射至少命中 1 受害者的条件概率',
    perArm: Object.fromEntries(newArms.map((a) => [a.id, {
      impacts: a.agg.impacts, nStackDist: a.agg.nStackDist,
      stackOpportunity: a.agg.stackOpportunity, pGe1GivenStack: a.agg.pGe1GivenStack,
      vCross: a.agg.vCross, splashRate: a.agg.overflow.splash.rate,
    }])),
  };
  ok = assert('验收①:nStack 分布+机会率落档(3 臂齐备)', newArms.every((a) => a.agg.impacts > 0 && a.agg.stackOpportunity != null && a.agg.pGe1GivenStack != null),
    newArms.map((a) => `${a.id}:op=${a.agg.stackOpportunity}`).join(' '));

  // 验收②：同格锁自然路径回归——cabbage/corn 臂 P(≥1|n≥2) 必须 =1.0（几何确定性在真实路径下保持）
  const lockArms = newArms.filter((a) => a.type === 'cabbage' || a.type === 'corn');
  ok = assert('验收②:同格锁自然路径 P(≥1|n≥2)=1.0(cabbage/corn)', lockArms.every((a) => a.agg.stackImpacts > 0 && a.agg.pGe1GivenStack === 1),
    lockArms.map((a) => `${a.id}:${a.agg.pGe1GivenStack}(stack=${a.agg.stackImpacts})`).join(' '));

  // 验收③：同格锁契约分布级——新源 cabbage/corn 全部种子 vCross=0（旧源自证臂除外，上面已判）
  const lockViolations = lockArms.flatMap((a) => a.perSeed.filter((r) => r.vCross > 0).map((r) => `${a.id}#seed${r.seed}`));
  ok = assert('验收③:同格锁契约(cabbage/corn 全种子跨格受害者=0)', lockViolations.length === 0, lockViolations.join(',') || `${lockArms.length} 臂 × ${SEEDS_PER_ARM} 种子全 0`);

  // 验收④：自然溢杀画像（真实死亡口径）落档 + 画像预警随附
  const wasteTier = (rate) => rate == null ? 'N/A' : rate <= 0.10 ? '低(≤10%)' : rate <= 0.30 ? '中(10–30%)' : '高(>30%)';
  results.verdicts.waste = {
    portraitWarning: '画像预警（R7 已立案，自然口径同样适用）：堆叠僵尸先被直中打残再吃溅射，「同批将死」的冗余伤害不进溢杀分母 ⇒ 溢杀率系统性低估战略浪费；供 R11 有效 DPS 口径分析引用，不返工。',
    perArm: Object.fromEntries(newArms.map((a) => [a.id, {
      splashRate: a.agg.overflow.splash.rate, tier: wasteTier(a.agg.overflow.splash.rate),
      directRate: a.agg.overflow.direct.rate, deaths: a.agg.deaths,
    }])),
  };
  ok = assert('验收④:自然溢杀画像落档(真实死亡口径)', newArms.every((a) => a.agg.overflow.splash.rate != null && a.agg.deaths > 0),
    newArms.map((a) => `${a.id}:${(a.agg.overflow.splash.rate * 100).toFixed(1)}%(${wasteTier(a.agg.overflow.splash.rate)})`).join(' '));

  // 验收⑤：对局有效性——bot 防线必须撑到末段波次（否则采样偏早期、堆叠画像失真）
  ok = assert('验收⑤:对局有效性(wavesMedian≥5 且 winRate≥1/2)', newArms.every((a) => a.agg.wavesMedian >= 5 && a.agg.wins >= 4),
    newArms.map((a) => `${a.id}:wavesMed=${a.agg.wavesMedian} win=${a.agg.wins}/8`).join(' '));

  // 管线健全性
  const allSeeds = newArms.flatMap((a) => a.perSeed);
  ok = assert('管线:全部伤害事件可分类(unknown=0)', allSeeds.every((r) => r.unknownEvents === 0), `unknown 总数=${allSeeds.reduce((a, b) => a + b.unknownEvents, 0)}`);
  ok = assert('管线:每弹着点均有直中事件', allSeeds.every((r) => r.impactsNoDirect === 0), `无直中弹着=${allSeeds.reduce((a, b) => a + b.impactsNoDirect, 0)}`);
  ok = assert('管线:fired>=hits(空射=直中目标先死/弹飞出界)', allSeeds.every((r) => r.fired >= r.hits), `fired<hits 种子=${allSeeds.filter((r) => r.fired < r.hits).map((r) => `${r.seed}:${r.fired}/${r.hits}`).join(',') || '无'}；空射合计=${allSeeds.reduce((a, b) => a + b.firedMinusHits, 0)}`);
  ok = assert('口径:自然对局真实死亡(deaths>0 全臂)', allSeeds.every((r) => r.deaths > 0), `死亡合计=${allSeeds.reduce((a, b) => a + b.deaths, 0)}（killZombie 桥计数）`);
  ok = assert('防线建成(全臂 botPlants>=20 即 col-major 目标格数)', newArms.every((a) => a.agg.botPlants >= 20), newArms.map((a) => `${a.id}:${a.agg.botPlants}`).join(' '));

  // ---- 跑后卫生 ----
  try {
    const lines = execSync('git status --porcelain', { cwd: REPO_ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    const mine = [/v19-r10-natural-stacking(\.js|-results\.json)?$/, /v19-r10-report\.md$/, /r10-.*\.log$/];
    const others = [
      /\.workbuddy\//,
      /plants-vs-zombies\.html$/,            // v1.9 立项刀（在途待提交）
      /lib\/prelude\.js$/, /v17-acceptance\.js$/, /v18-acceptance\.js$/,   // 版本标签通扫（在途）
      /r9a-metric-spec\.md$/,                // 期望表（在途）
      /butter-balance-calibration-v18\.md$/, // GRID 口径采纳（在途）
      /KNOWN-ISSUES\.md$/,                   // GRID 悬置行裁决（在途）
      /v1\.9-plan\.md$/,                     // 草案/定稿（Task#5）
    ];
    const unexpected = lines.filter((l) => !mine.some((re) => re.test(l)) && !others.some((re) => re.test(l)));
    results.meta.git.post = {
      count: lines.length, unexpected,
      exempted: lines.filter((l) => others.some((re) => re.test(l))),
      note: '本任务产物: 脚本/results.json/report 三件；豁免=v1.9 在途刀五文件+草案+会话记账',
    };
    ok = assert('卫生:跑后工作树无任务外脏文件', unexpected.length === 0, unexpected.join(' | ') || `共 ${lines.length} 项（本任务三件 + 在途刀豁免）`);
  } catch (e) { results.meta.git.post = { error: e.message }; }

  // ---- 汇总 ----
  results.pass = results.assertions.every((a) => a.pass) && results.gates.pass && expVerdict.pass;
  results.meta.runtimeMs = Date.now() - t0;
  fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
  console.log(`\n矩阵完成度: ${Object.keys(results.arms).length}/${ARMS.length} 臂 × ${SEEDS_PER_ARM} 种子（+旧源自证 ${SC_SEEDS.length} 种子）`);
  console.log(`堆叠机会率(自然): ${newArms.map((a) => `${a.type}=${a.agg.stackOpportunity}`).join(' / ')}`);
  console.log(`P(≥1|n≥2): ${newArms.map((a) => `${a.type}=${a.agg.pGe1GivenStack}`).join(' / ')}`);
  console.log(`自然溢杀率: ${newArms.map((a) => `${a.type}=${a.agg.overflow.splash.rate}`).join(' / ')}`);
  console.log(`判别力自证: ${sc.discriminative ? '完整' : '不完整'}`);
  console.log(`${results.pass ? 'R10 PASS' : 'R10 FAIL'} → ${OUT_JSON} (${results.meta.runtimeMs}ms)`);
  process.exitCode = results.pass ? 0 : 1;
}

main().catch((e) => {
  console.error('R10 CRASH:', e && e.stack || e);
  process.exitCode = 2;
});
