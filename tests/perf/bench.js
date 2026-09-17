/* ============================================================
 * PvZ Lite · 无头性能基准（V11-11 · KNOWN-ISSUES #8 实测回填）
 * ------------------------------------------------------------
 * 跑法（Node ≥ 18，零依赖）：
 *   node tests/perf/bench.js
 *
 * 目标：
 *   1. 把 perf-profile.md 的静态 draw call 估算（155/605/1009）换成
 *      可复现的无头实测：p50 / p95 / max / mean 帧耗时 + 每帧预算占比。
 *   2. 用「计数 ctx 代理」统计每帧真实 ctx 方法调用数（draw calls），
 *      与静态估算对比给偏差。
 *
 * 方法：
 *   - 按 tests/harness/index.js 的既有无头套路加载游戏（抽 <script> +
 *     vm sandbox + 追加同一份 PROBE_SUFFIX 探针，见下方 benchLoadGame），
 *     进入 state='play'。不复用 loadGame() 的原因是其 ctxStub 在闭包内
 *     创建、无法从外部替换成计数代理；硬规则又禁止改 harness 文件，
 *     故按同套路复制加载器（探针代码直接从 harness 源提取，保证一致）。
 *   - 每帧 = 消费 rafQueue 里的真 loop handler（update + render 全链路，
 *     与 SMOKE-024 render 层验证同款手法）。传入递增时间戳，步长恒定
 *     16.7ms（60fps）；直接传常量会导致第二帧起 dt=0、游戏时间冻结。
 *   - 计时：process.hrtime.bigint() 包住帧 handler（update + draw 耗时）。
 *
 * 与真实浏览器的偏差（务必与报告一起读）：
 *   - ctx 是计数代理，不做光栅化/文本布局/抗锯齿，GPU 侧成本为 0；
 *     fillText 等贵操作只计调用数不计真实成本 →
 *     【无头帧耗时偏乐观（下限），draw call 数与调用结构可信】。
 *     真机 DevTools Performance 复核留待发布后（KNOWN-ISSUES #8 后半）。
 *
 * 采样场景（对齐 perf-profile.md §1.2-1.4 静态估算口径）：
 *   A · L1 空场        ：开局无植物无僵尸（自然阳光掉落照常，属真实开局）
 *   B · L1 中期        ：6 植物 + 10 僵尸逼近（每行 2 只：normal/cone/fast 混编）
 *   C · L3 末波（W7 规模）：night 滤镜，12 植物 + 25 僵尸（含 2 bucket）
 *                          + 3 阳光；子弹/战斗粒子由植物真实开火产生
 *
 * 受控失真（为稳态采样所做，报告中全部披露）：
 *   - 注入僵尸 hp×3：否则采样窗（≈11.7s 模拟时长）内前排僵尸会被植物
 *     打死、实体规模衰减；hp 不影响 update/draw 路径，仅推迟死亡判定。
 *   - 阳光 stayT 周期归零、战斗粒子不足 10 补到 10：对抗自然消亡，
 *     维持稳态实体规模（effects 对象字段与游戏真实生成一致）。
 *   - 注入植物走 startGame 后直接 push（字段与游戏 onClick 的
 *     plants.push 一致，plantDone=true 跳过 620ms 飞入动画）。
 *
 * 波次隔离：模拟时长 = 700 帧 × 16.7ms ≈ 11.7s < 首波硬门槛 12s
 *   （checkWave：wave===0 时 minGap=12），采样窗内无波次/预警干扰。
 *
 * 判级（无头口径）：
 *   PASS     三场景 p95 ≤ 16.67ms 且 p50 ≤ 8ms（半预算余量）
 *   CONCERNS p50 ≤ 预算但 p95 超预算，或 p50 > 8ms（需真机复核归因）
 *   FAIL     有场景 p50 > 16.67ms（无头都超预算，真机必炸）
 * ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');

// ---------------- 参数 ----------------
const SEED = 20260918;          // 固定种子，结果可复现
const WARMUP = 100;             // 预热帧（JIT + 实体就位），不计入统计
const FRAMES = 600;             // 采样帧（≥600）
const DT = 16.7;                // 每帧模拟时间步长 ms（60fps）
const BUDGET_MS = 16.67;        // 60fps 帧预算
const HALF_BUDGET_MS = 8.0;

// 植物耐久（对齐 plants-vs-zombies.html CARDS 表；注入植物用）
const PLANT_DUR = { sunflower: 600, pea: 750, mine: 300, nut: 3000, double: 750, melon: 900 };

// ---------------- 计数 ctx 代理 ----------------
// 复刻 harness ctx stub 的返回值语义（渐变对象/measureText/getLineDash），
// 并把每个方法调用计数（draw call 口径与静态估算 §1.1 一致：方法调用计 1，
// 属性赋值不计）。beginPath 不产生绘制但计入，便于与 §1.1 的 grep 表对表。
function makeMeterCtx() {
  const counts = Object.create(null);
  // 静态估算 §1.1 的计数口径：beginPath 不计入，moveTo/lineTo 等纯路径构建
  // 调用也不在其 grep 表内。为与估算公平对表，额外提供「估算口径」计数
  //（剔除纯路径构建，保留 arc/ellipse——估算表明确计它们）。
  const PATH_ONLY = new Set(['beginPath', 'moveTo', 'lineTo', 'closePath', 'quadraticCurveTo', 'bezierCurveTo', 'arcTo', 'rect']);
  return {
    counts,
    reset() { for (const k in counts) delete counts[k]; },
    get count() {
      let n = 0;
      for (const k in counts) n += counts[k];
      return n;
    },
    get estCount() {
      let n = 0;
      for (const k in counts) if (!PATH_ONLY.has(k)) n += counts[k];
      return n;
    },
    proxy: new Proxy(Object.create(null), {
      get(t, k) {
        if (k in t) return t[k];
        const name = String(k);
        if (name === 'canvas') return { width: 1000, height: 680 };
        return function (...args) {
          counts[name] = (counts[name] || 0) + 1;
          if (name === 'createLinearGradient' || name === 'createRadialGradient') {
            return { addColorStop() {}, addColorStop2() {} };
          }
          if (name === 'measureText') return { width: 0 };
          if (name === 'getLineDash') return [];
          return undefined;
        };
      },
      set(t, k, v) { t[k] = v; return true; },
    }),
  };
}
function topOf(countsObj, n) {
  return Object.keys(countsObj)
    .map(k => [k, countsObj[k]])
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

// ---------------- 统计工具 ----------------
function pct(sorted, q) {
  // nearest-rank：p = sorted[ceil(q*n)-1]
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1));
  return sorted[idx];
}
function frameStats(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = arr.reduce((s, x) => s + x, 0);
  return { p50: pct(sorted, 0.50), p95: pct(sorted, 0.95), max: sorted[sorted.length - 1], mean: sum / arr.length };
}
const fmtMs = x => x.toFixed(2);
const pctBudget = x => ((x / BUDGET_MS) * 100).toFixed(0) + '%';

// ---------------- 加载器（harness 同套路，ctx 换计数代理） ----------------
const METER = makeMeterCtx();

// PROBE_SUFFIX 从 harness/index.js 源文本提取（不复制大段探针，保证探针行为
// 与 harness 完全一致；require harness 模块只定义函数不跑用例，但为稳妥直接
// 读源码正则提取，连模块加载都不发生）。
function extractProbeSuffix() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'harness', 'index.js'), 'utf8');
  const m = src.match(/const PROBE_SUFFIX = `([\s\S]*?)`;\s*\n/);
  if (!m) throw new Error('未能从 tests/harness/index.js 提取 PROBE_SUFFIX（harness 加载套路变了？同步本文件）');
  return m[1];
}

function benchLoadGame(opts) {
  opts = opts || {};
  const htmlPath = path.resolve(__dirname, '..', '..', 'plants-vs-zombies.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('未能在 HTML 中定位 <script> 块: ' + htmlPath);
  let code = m[1] + extractProbeSuffix();

  // 与 harness 的唯一差异：计数代理
  const ctxStub = METER.proxy;

  const listeners = {};
  const winListeners = {};
  const buttons = {};
  function makeBtn(id) {
    if (!buttons[id]) {
      buttons[id] = {
        id,
        classList: { add() {}, remove() {}, toggle() {} },
        style: {}, textContent: '',
        onclick: null, blur() {}, focus() {}, addEventListener() {},
      };
    }
    return buttons[id];
  }
  const canvasStub = {
    width: 1000, height: 680, style: {},
    getContext: () => ctxStub,
    addEventListener: (k, f) => { listeners[k] = f; },
    focus() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 680 }),
  };

  // SeededRNG · mulberry32（与 harness 相同算法，内联——硬规则要求公共辅助内联）
  let s = SEED >>> 0;
  const seededRandom = function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const mathStub = Object.assign(Object.create(Math), { random: seededRandom });

  const rafQueue = [];
  const errSink = opts.onConsoleError || (() => {});
  const sandbox = {
    console: {
      log() {}, warn() {},                            // 静音 setState 留痕，防污染基准输出
      error(...a) { errSink(a.map(String).join(' ')); }, // 帧异常监视网（loop 的 try/catch 走这里）
    },
    Math: mathStub,
    Date,
    performance: { now: () => 0 },                    // 仅 loop 初始化 lastT 用
    document: { getElementById: id => (id === 'canvas' ? canvasStub : makeBtn(id)) },
    window: {
      addEventListener: (k, f) => { winListeners[k] = f; },
      AudioContext: undefined,                        // 无头静默音频：ac() 返回 null，tone/noise 直接 return
      webkitAudioContext: undefined,
      setInterval: () => 0,
      clearInterval: () => {},
    },
    canvas: canvasStub,
    requestAnimationFrame: f => { rafQueue.push(f); return rafQueue.length; },
  };
  sandbox.globalThis = sandbox;
  sandbox.listeners = listeners;
  sandbox.winListeners = winListeners;
  sandbox.rafQueue = rafQueue;
  sandbox.btns = buttons;
  sandbox.location = { search: opts.search || '' };

  const ctx = vm.createContext(sandbox);
  vm.runInContext(code, ctx, { filename: 'pvz-lite.bench.js' });

  const api = sandbox.__api;
  return {
    sandbox,
    rafQueue,
    probe: sandbox.__probe,
    startGame: api.startGame.bind(api),
    setLevel: api.setLevel.bind(api),
    setSun: api.setSun.bind(api),
    forceZombieAt: api.forceZombieAt.bind(api),
  };
}

// ---------------- 实体注入 ----------------
function injectPlants(game, list) {
  const plants = game.sandbox.__plants;
  const armTime = game.sandbox.__LEVELS[game.probe().levelNo].armTime;
  for (const [type, col, row] of list) {
    // 字段对齐游戏 onClick 的 plants.push；plantDone=true 跳过飞入动画
    plants.push({
      col, row, type, cd: 0,
      sunT: type === 'sunflower' ? 7 : 0,
      armT: armTime,
      dur: PLANT_DUR[type], maxDur: PLANT_DUR[type],
      plantT: 620, plantFrom: { x: 0, y: 0 }, plantDone: true,
    });
  }
}
function inflateZombieHp(game, factor) {
  for (const z of game.sandbox.__zombies) { if (z) { z.hp *= factor; z.maxHp *= factor; } }
}
function injectSuns(game, n) {
  const fx = game.sandbox.__effects;
  for (let i = 0; i < n; i++) {
    fx.push({ kind: 'sun', x: 150 + i * 260, y: 180, targetY: 260 + i * 40,
      fall: 22, value: 25, t: 0, stayT: 0, dead: false });
  }
}
// 稳态维持：阳光不消失（stayT 归零）、战斗粒子不足 10 补足
//（字段对齐游戏 spawnBurst / 向日葵产阳光的 effects.push 产物）
function topUpEffects(game) {
  const fx = game.sandbox.__effects;
  if (!Array.isArray(fx)) return;
  let suns = 0, parts = 0;
  for (const e of fx) {
    if (!e || e.dead) continue;
    if (e.kind === 'sun') { e.stayT = 0; suns++; }
    else if (e.kind === 'particle') parts++;
  }
  if (suns < 2) {
    fx.push({ kind: 'sun', x: 200 + Math.random() * 600, y: 220, targetY: 300,
      fall: 22, value: 25, t: 0, stayT: 0, dead: false });
  }
  for (let i = parts; i < 10; i++) {
    fx.push({ kind: 'particle', x: 300 + Math.random() * 500, y: 250 + Math.random() * 250,
      vx: (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 40,
      life: 0.45, color: '#aef06a', size: 3, dead: false });
  }
}

// ---------------- 场景搭建 ----------------
// A · L1 空场：什么都不做（自然阳光掉落照常，属真实开局状态）
function setupA() { /* 空场 */ }

// B · L1 中期：6 植物（2 向日葵 + 2 豌豆 + 1 地瓜 + 1 坚果）+ 10 僵尸逼近
//（每行 2 只：normal/cone/fast 混编；豌豆真实开火 → 子弹/命中粒子自然产生）
function setupB(game) {
  game.setSun(9999);   // 免阳光经济变量（注入植物不代表真实消费路径）
  injectPlants(game, [
    ['sunflower', 0, 0], ['sunflower', 1, 0],
    ['pea', 0, 2], ['pea', 1, 2],
    ['mine', 2, 4], ['nut', 1, 3],
  ]);
  const rows = ['normal', 'cone', 'fast', 'normal', 'cone'];
  rows.forEach((t, row) => {
    game.forceZombieAt(t, row, 800);
    game.forceZombieAt(t, row, 850);
  });
  inflateZombieHp(game, 3);
}

// C · L3 末波（W7 规模）：12 植物 + 25 僵尸（含 2 bucket）+ 3 阳光 + night 滤镜
function setupC(game) {
  game.setLevel(3);
  game.startGame('bench-L3');
  game.setSun(9999);
  // 12 植物：2 向日葵 + 4 豌豆 + 2 双发 + 2 西瓜 + 1 坚果 + 1 地瓜
  injectPlants(game, [
    ['sunflower', 0, 0], ['sunflower', 1, 1],
    ['pea', 0, 2], ['pea', 1, 2], ['pea', 2, 3], ['pea', 3, 4],
    ['double', 2, 0], ['double', 3, 1],
    ['melon', 1, 3], ['melon', 2, 4],
    ['nut', 4, 2], ['mine', 0, 4],
  ]);
  // 25 僵尸 = 5 行 × 5，构成对齐 L3 W6+W7 类型占比（normal/cone/fast 为主 + 2 bucket）
  const rows = [
    ['normal', 'normal', 'cone', 'fast', 'normal'],
    ['cone', 'fast', 'normal', 'cone', 'fast'],
    ['normal', 'cone', 'bucket', 'normal', 'fast'],
    ['fast', 'normal', 'cone', 'fast', 'normal'],
    ['normal', 'cone', 'fast', 'bucket', 'normal'],
  ];
  const xs = [560, 620, 680, 740, 845];
  rows.forEach((zr, row) => zr.forEach((t, i) => game.forceZombieAt(t, row, xs[i])));
  inflateZombieHp(game, 3);
  injectSuns(game, 3);
}

// ---------------- 场景执行 ----------------
function runScenario(name, desc, setup) {
  const frameErrors = [];
  const game = benchLoadGame({ onConsoleError: a => frameErrors.push(a) });

  game.startGame();
  setup(game);

  // 帧驱动：递增时间戳（恒定值会导致第二帧起 dt=0、游戏时间冻结）
  let simNow = 0;
  function stepFrame() {
    const f = game.rafQueue.shift();
    if (!f) throw new Error('[' + name + '] rafQueue 为空：主循环未续订（帧异常被吞？）');
    simNow += DT;
    const t0 = process.hrtime.bigint();
    f(simNow);
    const t1 = process.hrtime.bigint();
    return Number(t1 - t0) / 1e6;
  }

  for (let i = 0; i < WARMUP; i++) stepFrame();   // 预热，不计入统计

  // 开表采样
  METER.reset();
  const agg = Object.create(null);                 // 跨帧聚合 ctx 方法计数
  const times = new Array(FRAMES);
  const dcalls = new Array(FRAMES);                // 全口径（含纯路径构建）
  const dcest = new Array(FRAMES);                 // 估算口径（对齐 §1.1，剔除纯路径构建）
  const needsTopUp = name !== 'A';
  for (let i = 0; i < FRAMES; i++) {
    if (needsTopUp && i % 60 === 0) topUpEffects(game);
    times[i] = stepFrame();
    dcalls[i] = METER.count;
    dcest[i] = METER.estCount;
    for (const k in METER.counts) agg[k] = (agg[k] || 0) + METER.counts[k];
    METER.reset();
  }

  const p = game.probe();
  const st = frameStats(times);
  const dcSorted = [...dcalls].sort((a, b) => a - b);
  const dcEstSorted = [...dcest].sort((a, b) => a - b);
  return {
    name, desc, st,
    dc: { median: pct(dcSorted, 0.50), min: dcSorted[0], max: dcSorted[dcSorted.length - 1] },
    dcEst: { median: pct(dcEstSorted, 0.50), min: dcEstSorted[0], max: dcEstSorted[dcEstSorted.length - 1] },
    topMethods: topOf(agg, 10),
    entityEnd: { plants: p.plants, zombies: p.zombies, projectiles: p.projectiles, effects: p.effects },
    frameErrorCount: frameErrors.length,
    frameErrors: frameErrors.slice(0, 5),
  };
}

// ---------------- 报告 ----------------
const EST = { A: 155, B: 605, C: 1009 };   // perf-profile.md §1.2-1.4 静态估算
function deviate(measured, est) {
  const d = ((measured - est) / est) * 100;
  return (d >= 0 ? '+' : '') + d.toFixed(1) + '%';
}

function judge(results) {
  let verdict = 'PASS';
  for (const r of results) {
    if (r.st.p50 > BUDGET_MS) return 'FAIL';
    if (r.st.p95 > BUDGET_MS || r.st.p50 > HALF_BUDGET_MS) verdict = 'CONCERNS';
  }
  return verdict;
}

function buildReport(results) {
  const dateStr = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const cpu = os.cpus()[0] ? os.cpus()[0].model.trim() : 'unknown CPU';
  const env = 'Node ' + process.version + ' · ' + os.platform() + ' ' + os.arch() + ' · ' + cpu + ' × ' + os.cpus().length;
  const L = [];
  const P = s => L.push(s);

  P('════════════════════════════════════════════════════════');
  P(' PvZ Lite · 无头性能基准实测（tests/perf/bench.js）');
  P('════════════════════════════════════════════════════════');
  P(' 测试日期 : ' + dateStr);
  P(' 运行环境 : ' + env);
  P(' 方法     : harness 无头加载（vm + 计数 ctx 代理），真 loop 帧消费，dt=16.7ms');
  P(' 采样     : 每场景 ' + WARMUP + ' 帧预热 + ' + FRAMES + ' 帧采样 · seed=' + SEED);
  P(' 预算     : 16.67ms/帧（60fps）');
  P('────────────────────────────────────────────────────────');
  for (const r of results) {
    P(' 场景 ' + r.name + ' · ' + r.desc);
    P('   帧耗时  p50 ' + fmtMs(r.st.p50) + 'ms (' + pctBudget(r.st.p50) + ' 预算) · ' +
      'p95 ' + fmtMs(r.st.p95) + 'ms (' + pctBudget(r.st.p95) + ') · ' +
      'max ' + fmtMs(r.st.max) + 'ms · mean ' + fmtMs(r.st.mean) + 'ms');
    P('   draw calls(帧中位) 全口径 ' + r.dc.median + ' [min ' + r.dc.min + ' / max ' + r.dc.max + ']' +
      ' · 估算口径(§1.1) ' + r.dcEst.median + ' [min ' + r.dcEst.min + ' / max ' + r.dcEst.max + ']');
    P('   vs 静态估算 ' + EST[r.name] + ' ：估算口径偏差 ' + deviate(r.dcEst.median, EST[r.name]) +
      '（全口径偏差 ' + deviate(r.dc.median, EST[r.name]) + '，仅参考）');
    P('   实体终态 : 植物 ' + r.entityEnd.plants + ' · 僵尸 ' + r.entityEnd.zombies +
      ' · 子弹 ' + r.entityEnd.projectiles + ' · 特效 ' + r.entityEnd.effects);
    P('   帧异常   : ' + r.frameErrorCount + (r.frameErrorCount ? '  ' + JSON.stringify(r.frameErrors) : ''));
    P('   ctx 方法 Top10 : ' + r.topMethods.map(([k, v]) => k + '×' + v).join('  '));
    P('────────────────────────────────────────────────────────');
  }
  P(' 判级（无头口径）: ' + judge(results));
  P(' 局限     : 无头计数 ctx 不做光栅化/文本布局，帧耗时为「JS 逻辑 + 调用编排」');
  P('            的乐观下限；draw call 数量与结构可信。真机 DevTools 复核留待发布后。');
  P('════════════════════════════════════════════════════════');
  return { text: L.join('\n'), verdict: judge(results), dateStr, env };
}

// ---------------- 追加写入 perf-profile.md（幂等） ----------------
const MD_START = '<!-- PERF-BENCH:AUTO:START -->';
const MD_END = '<!-- PERF-BENCH:AUTO:END -->';

function appendToPerfProfile(results, rep) {
  const mdPath = path.resolve(__dirname, '..', '..', 'docs', 'architecture', 'perf-profile.md');
  let doc = fs.readFileSync(mdPath, 'utf8');

  // 幂等：剥掉上一次自动生成的段落（标记之间），再追加新段
  const si = doc.indexOf(MD_START);
  if (si !== -1) {
    const ei = doc.indexOf(MD_END);
    if (ei === -1) throw new Error('perf-profile.md 存在 START 标记但缺 END 标记，请手工检查');
    doc = doc.slice(0, si) + doc.slice(ei + MD_END.length);
  }
  doc = doc.replace(/\s*$/, '\n');

  const L = [];
  const push = s => L.push(s);
  push('');
  push(MD_START);
  push('');
  push('---');
  push('');
  push('## 7. 实测基准（无头 · 本段由 `node tests/perf/bench.js` 自动生成，请勿手改）');
  push('');
  push('- **测试日期**：' + rep.dateStr + '　·　**任务**：V11-11（KNOWN-ISSUES #8 回填）· 作者：程基岩');
  push('- **环境**：' + rep.env);
  push('- **方法**：复用 harness 无头加载套路（抽 `<script>` + vm sandbox + 同一份探针后缀），');
  push('  ctx 换成计数代理（每个方法调用计 1 次 draw call，口径与 §1.1 一致）；');
  push('  每帧 = 消费 rafQueue 真 loop handler（update + render 全链路），dt 恒定 16.7ms；');
  push('  `process.hrtime.bigint()` 包帧计时。每场景 ' + WARMUP + ' 帧预热 + ' + FRAMES + ' 帧采样，seed=' + SEED + '。');
  push('- **场景口径**（对齐 §1.2–§1.4）：');
  push('  - A · L1 空场：开局无实体（自然阳光照常）；');
  push('  - B · L1 中期：6 植物 + 10 僵尸逼近；');
  push('  - C · L3 末波：night 滤镜，12 植物 + 25 僵尸（含 2 bucket）+ 3 阳光，子弹与战斗粒子由植物真实开火产生。');
  push('- **受控失真（为稳态采样，全部披露）**：注入僵尸 hp×3（推迟死亡判定，不影响');
  push('  update/draw 路径）；阳光 stayT 周期归零、战斗粒子不足 10 补足（对抗自然消亡）；');
  push('  模拟时长 ≈11.7s < 首波门槛 12s，采样窗内无波次/预警干扰。');
  push('');
  push('| 场景 | p50 (ms) | p95 (ms) | max (ms) | mean (ms) | p95 预算占比 | draw calls 全口径(中位) | draw calls 估算口径(中位) | 静态估算 | 估算口径偏差 |');
  push('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    push('| ' + r.name + ' · ' + r.desc + ' | ' + fmtMs(r.st.p50) + ' | ' + fmtMs(r.st.p95) + ' | ' +
      fmtMs(r.st.max) + ' | ' + fmtMs(r.st.mean) + ' | ' + pctBudget(r.st.p95) + ' | ' +
      r.dc.median + ' | ' + r.dcEst.median + ' | ' + EST[r.name] + ' | ' + deviate(r.dcEst.median, EST[r.name]) + ' |');
  }
  push('');
  push('**判级（无头口径）**：' + rep.verdict + '。');
  push('');
  push('**方法局限**：无头计数 ctx 不做光栅化/文本布局/抗锯齿，GPU 与排版成本为 0，');
  push('帧耗时是「JS 逻辑 + 调用编排」的乐观下限（**无头计数 ≠ 真机 DevTools 实测**，');
  push('真机复核留待发布后）。draw call 给出双口径：「全口径」含 beginPath/moveTo 等纯');
  push('路径构建；「估算口径」对齐 §1.1（剔除纯路径构建），与静态估算直接可比。');
  push('');
  push(MD_END);
  push('');

  doc += L.join('\n');
  fs.writeFileSync(mdPath, doc, 'utf8');
  return mdPath;
}

// ---------------- 主流程 ----------------
function main() {
  const results = [
    runScenario('A', 'L1 空场（开局无实体）', setupA),
    runScenario('B', 'L1 中期（6 植物 + 10 僵尸）', setupB),
    runScenario('C', 'L3 末波（12 植物 + 25 僵尸含 bucket）', setupC),
  ];
  const rep = buildReport(results);
  console.log(rep.text);

  const mdPath = appendToPerfProfile(results, rep);
  console.log('\n已回填: ' + mdPath + '（§7 实测基准段，幂等覆盖旧自动段）');
  console.log('判级: ' + rep.verdict);
  process.exitCode = rep.verdict === 'FAIL' ? 1 : 0;
}

main();
