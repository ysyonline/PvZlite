'use strict';
/* ============================================================================
 * tests/playtests/lib/prelude.js — v1.8 共享测量底座（口径权威实现）
 * ----------------------------------------------------------------------------
 * 【供 R7 / R9-b / v18-acceptance 复用】（v1.8-plan §3 公共项 Q-5=A 裁决落地）
 *
 * 职责：
 *   1. 七道可运行性前置门（gate1-7；FAIL 即中止并指名哪道门；gate7 为软门=提醒）
 *   2. 六件套：freshGame / injectZombie / injectPlant / instrument / 账本 / agg
 *   3. R9-a 三指标权威口径（直接事件账本，零代数假设）：
 *        freezeCoverage / refreshWaste / denialPx
 *   4. 溢杀 clamp（D-1 终稿口径补丁 · 口径冻结）：eff = min(max(hp@结算瞬间,0), dmg)
 *      ——hp 事件账本带 kind='hp' 事件标记 + hitKind='direct'/'splash'/'unknown' 分类，
 *      finalize 按 kind 过滤、按 hitKind 分栏（2026-09-22 修复重复键假绿缺陷）
 *   5. 口径自检哨兵（双域）：旧线性式 p·n·T/cd 在 v1.6 域 PASS、v1.7 域必须 FAIL
 *   6. 前提声明机制：启动实测源码常量 → 动态判域 → results.meta.preconditions（数据）
 *
 * 权威依据：production/v1.8-plan.md §2 R9 + D-1 定稿增补 B（冲突时后者最高权威）
 * 反面教材：tests/playtests/v16-butter-balance.js L447-467 nerfModel（代数投影
 *   min(1,p×T/cadence) 隐含 cd>T 前提；T=3.0>cd=2.6 后刷新重叠浪费使口径静默失效）
 *
 * 跑法（裸 node 不在 PATH，用绝对路径）：
 *   "C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2/node.exe" <脚本>
 * 环境变量：PVZ_HTML_PATH 覆盖被测源码；PVZ_EXPECT_VER 覆盖期望版本（缺省 1.8.0-wip）
 *
 * 【隐含前提（机器校验于 measurePreconditions，勿只写注释）】
 *   ①applyFreeze 是黄油唯一入口（溅射不调用，源码 L1580 裁决）——以「applyFreeze(
 *     调用点计数==1」文本快照校验 ②freezeT 帧递减语义恒定 ③chill/freeze 并存状态
 *   机不变 ④顶层 function 沙箱桥可用（applyFreeze 若改 const 箭头函数桥即失效，
 *   gate6 前置自检）⑤投影对照仅在 T≤cd 域启用（preconditions.domain 判定）
 * ==========================================================================*/

const fs = require('fs');
const path = require('path');
const net = require('net');
const { execSync } = require('child_process');
const { loadGame, SeededRNG } = require(path.join(__dirname, '..', '..', 'harness', 'index.js'));

// ---------------- 常量口径（与源码对齐的【期望值】；实测值一律启动时从活源码读） ----------------
const DT = 1 / 60;
const ROW = 2;
const START_X = 800;
const HOME_X = 15;            // GRID_X(55) − 40，源码 L1675
const TELEPORT_X = 300;
const SURVIVOR_MULT = 200;    // 存活靶 hp 倍率
const BASE = { normal: [180, 16], cone: [340, 15], fast: [140, 45], bucket: [560, 12] };
const DIFF_EXPERT = { mult: 1.8, speed: 1.3 };

// 期望常量快照（v1.8 同格锁后：cabbage/corn 数值不变、几何改落点同格 → 以 splashGrid 字段核对）
const EXPECT = {
  // 源码实际常量带 v 前缀（L49 `VERSION='v1.8.0'`）；比较时两侧归一化剥前缀，env 可给任意写法
  get VERSION() { return process.env.PVZ_EXPECT_VER || 'v1.8.0'; },
  butterP: 0.27,            // 源码 L1473 Math.random()<0.27
  freezeT: 3.0,             // 源码 L1617 z.freezeT=3.0
  cornCd: 2.6,              // 源码 L1472 p.cd=2.6（开火间隔，≠CARDS.cd=6 种植卡冷却）
  pTol: 1e-6,               // 黄油概率二分实测精度
  constTol: 1e-9,           // freezeT/cd 精确匹配容差
  splash: {                 // 表值 30/0.40/55/0.55 不变；grid=同格锁语义标记
    cabbage: { splash: 30, ratio: 0.40, grid: true },
    corn:    { splash: 30, ratio: 0.40, grid: true },
    melon:   { splash: 55, ratio: 0.55, grid: false },   // 55px 跨格带维持
    icemelon:{ splash: 55, ratio: 0.55, grid: false },
  },
  applyFreezeCallSites: 1,  // 调用点计数（当前 1 处 = L1580 直中；同入前提）
  hygienePort: 9355,        // 运行卫生建议端口下限
};

// ---------------- 工具（自 v16 平移） ----------------
const r2 = (v) => Math.round(v * 100) / 100;
const r4 = (v) => Math.round(v * 10000) / 10000;
function agg(arr) {
  const n = arr.length;
  if (!n) return { n: 0, mean: 0, std: 0, min: 0, median: 0, max: 0 };
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n);
  const s = arr.slice().sort((a, b) => a - b);
  return { n, mean: r4(mean), std: r4(std), min: r4(s[0]), median: r4(s[(n - 1) >> 1]), max: r4(s[n - 1]) };
}
function seeds(base, count) { return Array.from({ length: count }, (_, i) => base + i); }
const epsEq = (a, b, eps) => Math.abs(a - b) <= (eps == null ? EXPECT.constTol : eps);
const normVer = (v) => String(v == null ? '' : v).trim().replace(/^v/i, '');

// ---------------- 六件套 1/2/3：freshGame / injectZombie / injectPlant ----------------
/** 场景隔离开局：loadGame→setLevel(1)（startGame 不重置关卡，须显式复位）→startGame→forceWaves(5)→clearField */
function freshGame(seed, opts) {
  const g = loadGame({ seed, htmlPath: opts && opts.htmlPath || (process.env.PVZ_HTML_PATH || undefined) });
  g.setLevel(1);
  g.startGame('prelude');
  g.forceWaves(5);   // wave=totalWaves ⇒ checkWave 自动推进恒关闭
  g.clearField();    // 清 forceWaves 残留 spawnQueue，waveActive=false
  return g;
}

/** 注入僵尸（字段对齐 newWave 结构；不经 R(0.92,1.08) 抖动）。返回实体引用（账本按引用记账）。 */
function injectZombie(g, o) {
  const z = Object.assign({
    type: 'normal', row: ROW, hp: 180, maxHp: 180, spd: 16, x: START_X,
    eating: false, eatAnim: 0, walk: 0, dead: false, freezeT: 0, slowT: 0, splashed: false,
  }, o);
  g.sandbox.__zombies.push(z);
  return z;
}

/** 注入植物（dur 按 __CARDS 表取值；cd=0 起手即可开火）。 */
function injectPlant(g, type, col) {
  const card = (g.sandbox.__CARDS || []).find((c) => c.type === type);
  const p = {
    type, col, row: ROW, cd: 0, sunT: 0, armT: 0,
    dur: card ? card.dur : 900, maxDur: card ? card.dur : 900,
    plantT: 0, plantDone: true, dirtDone: true,
  };
  g.sandbox.__plants.push(p);
  return p;
}

// ---------------- 六件套 5：账本（按对象引用记账；死亡以 dead 标志为准） ----------------
/**
 * 事件账本：R9-a 三指标的唯一数据来源（零代数假设）。
 * - 冻结事件：由包装后的 applyFreeze 上报（noteFreeze），preT=调用瞬间剩余 freezeT；
 *   preT>0 即「刷新事件」，其 preT 就是本次被浪费的定身时长（refreshWaste 逐事件）。
 * - 伤害事件：由 hp 访问器拦截（attachHpProbe），pre=逐弹结算瞬间读数 → clamp 用；
 *   直中/溅射分类由 makeHitClassifier 按伤害值精确匹配（eps=1e-6，浮点安全）。
 * - 帧状态：runWindow 每帧喂 frame()；冻结判定用 tick 前 freezeT（与源码 L1628-1638
 *   移动门控同语义）；teleport 帧/啃食帧不计否认位移（位移被剥夺须归因于控制而非场景）。
 */
function createLedger(opts) {
  opts = opts || {};
  const recs = new Map();          // z 引用 → 记录（对象引用记账，不按下标）
  const events = [];               // 全局事件流水（freeze/hp）
  const classify = opts.classify || null;
  const api = {
    recs, events, warmupT: opts.warmupT || 0, tNow: 0, deaths: 0,

    rec(z) {
      let r = recs.get(z);
      if (!r) {
        r = { ref: z, type: z.type, frames: 0, frozenFrames: 0, chillFrames: 0, unionFrames: 0,
          denialPx: 0, frozenPx: 0, chillPx: 0, dead: false, deadT: null,
          freezeEvents: [], hpWrites: [], legacyButters: 0, resetEvents: 0, prevFreezeT: null };
        recs.set(z, r);
      }
      return r;
    },

    /** applyFreeze 包装器上报；preT = 调用瞬间剩余 freezeT（刷新浪费的直接读数） */
    noteFreeze(z, t, preT) {
      const r = api.rec(z);
      const isRefresh = preT > 1e-9;
      const counted = t >= api.warmupT;
      const ev = { kind: 'freeze', t: r4(t), preT: r4(preT), isRefresh, waste: isRefresh ? preT : 0, counted };
      r.freezeEvents.push(ev);
      events.push(ev);
      return ev;
    },

    /** hp 访问器上报；pre = 本弹结算瞬间读数（clamp 口径的「当前hp」）。
     *  hitKind = 直中/溅射分类（makeHitClassifier 按伤害值精确匹配）；kind = 事件标记 'hp'
     *  （两者必须并存：freeze 事件同住 events 流水，finalize 靠 kind 过滤、靠 hitKind 分栏。
     *   历史缺陷：单键 kind 让分类值覆盖事件标记 → finalize 全跳过 → overflow 栏恒 0 假绿，
     *   2026-09-22 由 qa-r7 上报、主理人 mock 复现坐实后修复。） */
    noteHpWrite(z, t, pre, post) {
      const r = api.rec(z);
      const delta = pre - post;
      const hitKind = classify ? classify(delta) : 'unknown';
      const eff = Math.min(Math.max(pre, 0), delta);   // 口径冻结：eff = min(max(hp@瞬间,0), dmg)
      const ovf = delta - eff;
      const w = { kind: 'hp', t: r4(t), pre: r4(pre), post: r4(post), delta: r4(delta), hitKind, eff: r4(eff), overflow: r4(ovf) };
      r.hpWrites.push(w);
      events.push(w);
      return w;
    },

    /** 每帧喂状态快照（pre= tick 前、post= tick 后）；moved: 'walk'|'teleport' */
    frame(z, t, pre, post, moved) {
      const r = api.rec(z);
      if (pre.dead && !r.dead) { r.dead = true; r.deadT = r4(t); api.deaths++; }
      if (r.dead) return;                             // 死亡下帧起不再计入分母
      // 跨 0 / 重置交叉校验（v16 legacy 双轨思路保留；prevFreezeT=上一帧 post ≡ 本帧 pre）
      if (r.prevFreezeT != null) {
        if (r.prevFreezeT <= 1e-9 && post.freezeT > 1e-9) r.legacyButters++;
        if (post.freezeT > r.prevFreezeT + 1e-9) r.resetEvents++;
      }
      r.prevFreezeT = post.freezeT || 0;
      const frozen = pre.freezeT > 1e-9;              // 与源码移动门控同语义（tick 前判定）
      const chilled = !frozen && (pre.slowT > 1e-9);
      if (t >= api.warmupT) {
        r.frames++;
        if (frozen) r.frozenFrames++;
        if (chilled) r.chillFrames++;
        if (frozen || chilled) r.unionFrames++;
        // denialPx：被剥夺行程 = 名义行程 − 实际行程；冻结=全额、chill=×0.6 → 剥夺 0.4、自由=0。
        // 仅统计走路帧（啃食帧位移为 0 归因于啃食而非控制；teleport 帧位移非物理）。
        if (!pre.eating && moved !== 'teleport') {
          const nominal = (z.spd || 0) * DT;
          if (frozen) { r.denialPx += nominal; r.frozenPx += nominal; }
          else if (chilled) { const d = nominal * 0.4; r.denialPx += d; r.chillPx += d; }
        }
      }
      if (post.dead) { r.dead = true; r.deadT = r4(t); api.deaths++; }   // 本帧内死亡：帧已计入
    },

    /** 收尾聚合：三指标 + clamp 分栏 + naiveProjection 双轨 */
    finalize(p, T, cd, nPlants) {
      const perZombie = [];
      let frames = 0, frozen = 0, chill = 0, union = 0, denialPx = 0, frozenPx = 0, chillPx = 0;
      let butters = 0, refreshEvents = 0, wasteTotal = 0, legacyButters = 0, resetEvents = 0;
      for (const r of recs.values()) {
        frames += r.frames; frozen += r.frozenFrames; chill += r.chillFrames; union += r.unionFrames;
        denialPx += r.denialPx; frozenPx += r.frozenPx; chillPx += r.chillPx;
        legacyButters += r.legacyButters; resetEvents += r.resetEvents;
        for (const e of r.freezeEvents) {
          if (!e.counted) continue;
          butters++;
          if (e.isRefresh) { refreshEvents++; wasteTotal += e.waste; }
        }
        perZombie.push({
          type: r.type, frames: r.frames, dead: r.dead, deadT: r.deadT,
          freezeCoverage: r.frames ? r4(r.frozenFrames / r.frames) : 0,
          chillFrac: r.frames ? r4(r.chillFrames / r.frames) : 0,
          unionFrac: r.frames ? r4(r.unionFrames / r.frames) : 0,
          denialPx: r2(r.denialPx), butters: r.freezeEvents.filter((e) => e.counted).length,
          refreshEvents: r.freezeEvents.filter((e) => e.counted && e.isRefresh).length,
          legacyButters: r.legacyButters, resetEvents: r.resetEvents,
          hpWrites: r.hpWrites.length,
        });
      }
      const measuredT = frames * DT;
      const ovfCol = () => ({ raw: 0, eff: 0, ovf: 0, events: 0, ovfEvents: 0, rate: null });
      const overflow = { mode: api.deaths > 0 ? 'real' : 'survivor', direct: ovfCol(), splash: ovfCol(), unknown: ovfCol() };
      for (const e of events) {
        if (e.kind !== 'hp') continue;
        const col = overflow[e.hitKind] || overflow.unknown;
        col.raw += e.delta; col.eff += e.eff; col.ovf += e.overflow; col.events++;
        if (e.overflow > 1e-9) col.ovfEvents++;
      }
      for (const k of ['direct', 'splash', 'unknown']) {
        const col = overflow[k];
        col.raw = r2(col.raw); col.eff = r2(col.eff); col.ovf = r2(col.ovf);
        // 溢杀率 = 溢出/名义；存活靶臂（mode=survivor）clamp 恒等 rate 无意义恒 0 —— 统一置 null（仅真实行程臂上报）
        col.rate = (col.raw > 0 && overflow.mode === 'real') ? r4(col.ovf / col.raw) : null;
      }
      if (overflow.mode === 'survivor') {   // 口径：存活靶臂 clamp 恒等，溢杀率不上报（维持 raw）
        overflow.note = '存活靶臂：无死亡，rate 不定义（仅真实行程臂上报溢杀率）；raw 分布保留';
      }
      // naiveProjection 双轨（对照用；域前提见 preconditions.domain——T>cd 时该分支仅作对照不作结论）
      const pred = Math.min(1, (p * (nPlants || 1) * T) / cd);
      const coverage = frames ? frozen / frames : 0;
      const wasteShare = measuredT > 0 ? wasteTotal / measuredT : 0;
      return {
        t: r2(measuredT), frames,
        freezeCoverage: r4(coverage),
        chillFrac: frames ? r4(chill / frames) : 0,
        unionFrac: frames ? r4(union / frames) : 0,
        denialPx: r2(denialPx),
        denialBreakdown: { frozenPx: r2(frozenPx), chillPx: r2(chillPx) },
        butters, refreshEvents, refreshWasteTotal: r4(wasteTotal),
        wastePerButter: butters ? r4(wasteTotal / butters) : 0,
        legacyButters, resetEvents,
        naiveProjection: {
          formula: 'min(1, p·n·T/cd)', p, T, cd, n: nPlants || 1,
          value: r4(pred), deviation: r4(pred - coverage),      // 投影 − 实测
          wasteShare: r4(wasteShare),                            // Σ(刷新剩余)/窗口
          identityResidual: r4(pred - coverage - wasteShare),    // 恒等式核对（应≈0）
        },
        overflow,
        perZombie,
      };
    },
  };
  return api;
}

/** hp 访问器探针：拦截对 z.hp 的每次写入（=逐弹结算）。同一实体只允许挂一次。 */
function attachHpProbe(z, onWrite) {
  const desc = Object.getOwnPropertyDescriptor(z, 'hp');
  if (desc && desc.get) return false;   // 已挂
  let hp = z.hp;
  Object.defineProperty(z, 'hp', {
    configurable: true,
    get() { return hp; },
    set(v) { const pre = hp; hp = v; onWrite(pre, v); },
  });
  return true;
}

/** 直中/溅射分类器：按伤害值精确匹配（eps=1e-6）。direct 优先；同值歧义时标 unknown。 */
function makeHitClassifier(table) {
  const near = (arr, v) => (arr || []).some((x) => Math.abs(x - v) < 1e-6);
  return function classify(delta) {
    if (near(table && table.direct, delta)) return 'direct';
    if (near(table && table.splash, delta)) return 'splash';
    return 'unknown';
  };
}

// ---------------- 六件套 4：instrument（SFX 计数 + applyFreeze 包装链） ----------------
/**
 * 包装计数：melonThrow/shoot（发射数）+ applyFreeze（黄油权威计数，含刷新式续冻）。
 * opts.onFreeze(z, preT) 在每次 applyFreeze 时回调（账本挂点）；
 * opts.overrideT 非空时在原语义后覆写 z.freezeT=T（哨兵双域参数覆写专用）。
 */
function instrument(g, opts) {
  opts = opts || {};
  const c = { melonThrow: 0, shoot: 0, freezeCalls: 0 };
  const S = g.sandbox.__SFX;
  S.melonThrow = function () { c.melonThrow++; };
  S.shoot = function () { c.shoot++; };
  const orig = g.sandbox.applyFreeze;
  if (typeof orig === 'function') {
    g.sandbox.applyFreeze = function (z) {
      const preT = z.freezeT || 0;
      c.freezeCalls++;
      if (opts.onFreeze) opts.onFreeze(z, preT);
      const r = orig(z);
      if (opts.overrideT != null) z.freezeT = opts.overrideT;
      return r;
    };
  }
  return c;
}

// ---------------- 六件套 6：主模拟窗口（推帧用 g.__updateRaw(dt)） ----------------
/**
 * 逐帧推 update 并喂账本。opts：{g, zombies:[引用], duration, teleport(300=存活靶回传|null),
 * warmupT(预热不计量), ledger, hitTable}。teleport 帧以 x 回跳识别并豁免位移归因。
 */
function runWindow(g, opts) {
  const steps = Math.ceil(opts.duration / DT);
  const ledger = opts.ledger;
  const zombies = opts.zombies;
  const snap = (z) => ({ x: z.x, freezeT: z.freezeT || 0, slowT: z.slowT || 0, eating: !!z.eating, dead: !!z.dead });
  for (let i = 0; i < steps; i++) {
    const t = i * DT;
    const pre = zombies.map(snap);
    g.__updateRaw(DT);
    const tPost = t + DT;
    ledger.tNow = tPost;
    const post = zombies.map(snap);
    for (let k = 0; k < zombies.length; k++) {
      const moved = post[k].x > pre[k].x + 1 ? 'teleport' : 'walk';   // 唯一右移来源=回传
      ledger.frame(zombies[k], tPost, pre[k], post[k], moved);
    }
    if (opts.teleport != null) {
      for (const z of zombies) if (!z.dead && z.x < opts.teleport) z.x = START_X;   // freezeT/slowT 不清零
    }
  }
  return ledger.finalize(opts.p, opts.T, opts.cd, opts.nPlants);
}

// ---------------- 前提声明机制：启动实测源码常量 → 动态判域 ----------------
function htmlPath() {
  return process.env.PVZ_HTML_PATH || path.resolve(__dirname, '..', '..', '..', 'plants-vs-zombies.html');
}

/** 黄油概率 p 的行为学精测：受控 Math.random 二分（每次开火的首次随机调用=黄油掷定）。 */
function measureButterP(g, plant) {
  const sb = g.sandbox;
  let probeVal = 0.5, firstCall = false;
  const origRandom = sb.Math.random;
  sb.Math.random = function () {
    if (firstCall) { firstCall = false; return probeVal; }   // 本 tick 首个随机调用=开火掷定
    return 0.5;                                              // 后续调用（阳光 R(7,11) 等）给无关值
  };
  let lo = 0, hi = 1;
  try {
    for (let i = 0; i < 42; i++) {
      const mid = (lo + hi) / 2;
      probeVal = mid; firstCall = true;
      plant.cd = 0;
      sb.__projectiles.length = 0;
      g.__updateRaw(DT);
      const pr = sb.__projectiles[0];
      if (pr && pr.butter) lo = mid; else hi = mid;          // butter ⇔ probeVal < p
    }
  } finally {
    sb.Math.random = origRandom;
    sb.__projectiles.length = 0;
  }
  return (lo + hi) / 2;
}

/** 强制单发射击并读弹体字段（splash 表 / splashRatio / splashGrid 同格锁标记）。 */
function forceFire(g, plant) {
  const sb = g.sandbox;
  plant.cd = 0;
  sb.__projectiles.length = 0;
  g.__updateRaw(DT);
  const pr = sb.__projectiles[0] || null;
  sb.__projectiles.length = 0;
  return pr;
}

/**
 * 实测全部前提并判域。产出 results.meta.preconditions（数据，非注释）。
 * 实测与期望不符由 gate5 判 FAIL「源码漂移」——这里只负责如实读数。
 */
function measurePreconditions(g) {
  const sb = g.sandbox;
  const pre = { htmlPath: htmlPath(), version: sb.__VERSION, measured: {}, expected: {}, domain: {}, assumptions: {} };
  pre.measured.version = sb.__VERSION;
  const fakeZ = injectZombie(g, { hp: 1e9, maxHp: 1e9 });

  // ① freezeT：对假僵尸调 applyFreeze 读 T（同时验证沙箱桥可用）
  sb.applyFreeze(fakeZ);
  pre.measured.freezeT = fakeZ.freezeT;

  // ② corn 强制开火：读开火间隔 cd + 黄油概率 p（二分精测）
  sb.__plants.length = 0;
  sb.__zombies.length = 0;
  const zFar = injectZombie(g, { hp: 1e9, maxHp: 1e9 });   // hasZombieAhead 靶（远端，不受溅射/直中影响）
  const corn = injectPlant(g, 'corn', 0);
  const prCorn = forceFire(g, corn);
  pre.measured.cornCd = corn.cd;                            // 开火后立即读 p.cd
  pre.measured.butterP = measureButterP(g, corn);
  pre.measured.cornProjectile = prCorn ? {
    dmg: prCorn.dmg, splash: prCorn.splash, splashRatio: prCorn.splashRatio == null ? null : prCorn.splashRatio,
    splashGrid: !!prCorn.splashGrid, butter: !!prCorn.butter, type: prCorn.type,
  } : null;

  // ③ splash 表：逐类型强制开火读弹体字段（同格锁后 cabbage/corn 应带 splashGrid=true、数值不变）
  pre.measured.splash = {};
  for (const type of ['cabbage', 'melon', 'icemelon']) {
    sb.__plants.length = 0;
    const pl = injectPlant(g, type, 0);
    const pr = forceFire(g, pl);
    pre.measured.splash[type] = pr ? {
      dmg: pr.dmg, splash: pr.splash, splashRatio: pr.splashRatio == null ? null : pr.splashRatio,
      splashGrid: !!pr.splashGrid, chill: !!pr.chill,
    } : null;
  }
  pre.measured.splash.corn = pre.measured.cornProjectile;

  // ④ applyFreeze 调用点文本快照（期望仅直中 1 处；>1 说明溅射开始调定身=前提①崩塌）
  try {
    const code = (fs.readFileSync(htmlPath(), 'utf8').match(/<script>([\s\S]*?)<\/script>/) || ['', ''])[1];
    const calls = (code.match(/applyFreeze\s*\(/g) || []).length;
    const defs = (code.match(/function\s+applyFreeze\s*\(/g) || []).length;
    pre.measured.applyFreezeCallSites = calls - defs;
  } catch (e) { pre.measured.applyFreezeCallSites = null; }

  // ⑤ 动态判域（D-1 增补：T≤cd ⇒ 投影有效；T>cd ⇒ 投影分支禁用并标记 overlapWasteExpected）
  const T = pre.measured.freezeT, cd = pre.measured.cornCd;
  pre.domain = {
    T, cd, T_le_cd: T <= cd,
    domainLabel: T <= cd ? 'v1.6-like(T<=cd)' : 'v1.7-like(T>cd)',
    overlapWasteExpected: T > cd,
    projectionBranchEnabled: T <= cd,
  };

  // ⑥ 期望值对照表（gate5 用）
  pre.expected = {
    version: EXPECT.VERSION, butterP: EXPECT.butterP, freezeT: EXPECT.freezeT, cornCd: EXPECT.cornCd,
    splash: EXPECT.splash, applyFreezeCallSites: EXPECT.applyFreezeCallSites,
  };

  // ⑦ 隐含前提逐条快照（数据化）
  pre.assumptions = {
    a1_applyFreezeSingleEntry: pre.measured.applyFreezeCallSites === EXPECT.applyFreezeCallSites,
    a2_freezeTFrameDecay: true,        // 状态机语义由 gate3 canary（冻结期 x 静止）行为学佐证
    a3_chillFreezeCoexist: true,       // gate3 canary（chill ×0.6 位移实测）佐证
    a4_topLevelFnBridge: typeof sb.applyFreeze === 'function' && typeof g.__updateRaw === 'function',
    a5_projectionOnlyWhenTleCd: pre.domain.projectionBranchEnabled,
  };
  return pre;
}

// ---------------- 执行计数器绑定（gate4；收尾查达标，防假绿/假红） ----------------
function createExpectations() {
  const map = new Map();
  return {
    expect(name, min, desc) { map.set(name, { name, min, actual: 0, desc: desc || '' }); },
    inc(name, n) { const e = map.get(name); if (e) e.actual += (n || 1); },
    snapshot() { return Array.from(map.values()).map((e) => ({ name: e.name, min: e.min, actual: e.actual, desc: e.desc })); },
    verify() {
      const unmet = Array.from(map.values()).filter((e) => e.actual < e.min)
        .map((e) => ({ name: e.name, min: e.min, actual: e.actual, desc: e.desc }));
      return { pass: unmet.length === 0, unmet };
    },
  };
}

// ---------------- 七道门 ----------------
function checkPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '127.0.0.1');
  });
}

/**
 * 七道前置门。g=启动用游戏实例；pre=measurePreconditions 产出。
 * gate1-6 硬门（FAIL 即中止并指名哪道门）；gate7 软门（提醒，恒 PASS 只带 warnings）。
 */
async function runGates(g, pre, opts) {
  opts = opts || {};
  const results = [];
  const add = (gate, name, pass, detail, warnings) => results.push({ gate, name, pass: !!pass, detail, warnings: warnings || [] });

  // ① 版本自证（实测源码 VERSION vs env 参数化期望；两侧剥 v 前缀归一化）
  {
    const expectVer = normVer((opts.expectVersion != null) ? opts.expectVersion : EXPECT.VERSION);
    const gotVer = normVer(pre.version);
    const pass = gotVer === expectVer;
    add(1, '版本自证', pass, pass ? `__VERSION=${pre.version} 与期望一致` : `版本漂移：实测 ${pre.version} ≠ 期望 ${expectVer}（PVZ_EXPECT_VER 可参数化）`);
  }
  // ② 环境就绪探针（harness 沙箱）
  {
    let pass = true; const why = [];
    try {
      const p = g.probe();
      if (!p || p.state !== 'play') { pass = false; why.push(`probe().state=${p && p.state} ≠ play`); }
    } catch (e) { pass = false; why.push('probe() 抛错: ' + e.message); }
    if (typeof g.__updateRaw !== 'function') { pass = false; why.push('__updateRaw 缺失'); }
    if (typeof g.sandbox.Math.random !== 'function') { pass = false; why.push('Math.random 注入点缺失'); }
    if (!Array.isArray(g.sandbox.__zombies) || !Array.isArray(g.sandbox.__plants)) { pass = false; why.push('__zombies/__plants 桥缺失'); }
    add(2, '环境就绪', pass, pass ? 'probe/state/__updateRaw/实体桥 就绪' : why.join('; '));
  }
  // ③ 判据可达性 Canary（冻结可达+定身位移=0 + chill ×0.6 位移实测）
  {
    let pass = true; const why = [];
    try {
      const sb = g.sandbox;
      sb.__plants.length = 0; sb.__zombies.length = 0; sb.__projectiles.length = 0;
      const origRandom = sb.Math.random;
      sb.Math.random = () => 0;   // 受控：黄油必中
      try {
        const z = injectZombie(g, { hp: 1e9, maxHp: 1e9 });
        injectPlant(g, 'corn', 0);
        let hit = false;
        for (let i = 0; i < 400 && !hit; i++) { g.__updateRaw(DT); if (z.freezeT > 0) hit = true; }   // ≤6.7s 内黄油必须可达
        if (!hit) { pass = false; why.push('400 帧内未见冻结（判据不可达）'); }
        const x0 = z.x;
        for (let i = 0; i < 30; i++) g.__updateRaw(DT);
        if (Math.abs(z.x - x0) > 1e-6) { pass = false; why.push(`冻结期位移 ${r4(z.x - x0)} ≠ 0（三停语义破坏）`); }
        if (Math.abs(z.freezeT - EXPECT.freezeT) > 1e-6 && z.freezeT <= 0) { pass = false; why.push('freezeT 读数异常'); }
      } finally { sb.Math.random = origRandom; }
      // chill ×0.6：applyChill 后每帧行程 = spd·0.6·dt
      const z2 = injectZombie(g, { hp: 1e9, maxHp: 1e9 });
      const chillFn = sb.applyChill || sb.__applyChill;
      if (typeof chillFn !== 'function') { pass = false; why.push('applyChill 桥缺失'); }
      else {
        chillFn(z2);
        const xa = z2.x; g.__updateRaw(DT);
        const disp = xa - z2.x;
        const want = z2.spd * 0.6 * DT;
        if (Math.abs(disp - want) > 1e-6) { pass = false; why.push(`chill 位移 ${r4(disp)} ≠ 期望 ${r4(want)}（×0.6 状态机漂移）`); }
      }
    } catch (e) { pass = false; why.push('canary 异常: ' + e.message); }
    add(3, '判据可达性Canary', pass, pass ? '冻结可达+定身停走+chill×0.6 位移全实测通过' : why.join('; '));
  }
  // ④ 执行计数器绑定（此处绑定机制自检；达标核查在收尾 expectations.verify()）
  {
    const ex = createExpectations();
    ex.expect('__gate4.selftest', 1, 'gate4 机制自检');
    ex.inc('__gate4.selftest');
    const v = ex.verify();
    add(4, '执行计数器绑定', v.pass, v.pass ? '计数器绑定机制可用（各判据 expectedExecutions 收尾核查）' : '机制自检失败');
  }
  // ⑤ 常量快照核对（活源码实测 vs 期望；漂移即 FAIL「源码漂移」）
  {
    const m = pre.measured, e = pre.expected;
    const rows = [];
    let pass = true;
    const chk = (label, ok, meas, exp) => { if (!ok) pass = false; rows.push(`${label}: 实测 ${meas} / 期望 ${exp} ${ok ? 'OK' : 'MISMATCH'}`); };
    chk('version', normVer(m.version) === normVer(e.version), m.version, e.version);
    chk('butterP', Math.abs(m.butterP - e.butterP) <= EXPECT.pTol, m.butterP, e.butterP);
    chk('freezeT', epsEq(m.freezeT, e.freezeT), m.freezeT, e.freezeT);
    chk('cornCd', epsEq(m.cornCd, e.cornCd), m.cornCd, e.cornCd);
    for (const t of ['cabbage', 'corn', 'melon', 'icemelon']) {
      const mm = m.splash[t], ee = e.splash[t];
      const ok = mm && epsEq(mm.splash, ee.splash) && mm.splashRatio != null && epsEq(mm.splashRatio, ee.ratio, 1e-9) && mm.splashGrid === ee.grid;
      chk(`splash.${t}`, !!ok, mm ? `${mm.splash}·${mm.splashRatio}·grid=${mm.splashGrid}` : 'null', `${ee.splash}·${ee.ratio}·grid=${ee.grid}`);
    }
    chk('applyFreezeCallSites', m.applyFreezeCallSites === e.applyFreezeCallSites, m.applyFreezeCallSites, e.applyFreezeCallSites);
    add(5, '常量快照', pass, pass ? '黄油 p/T/cd/splash 表/调用点 全部与活源码一致（含同格锁 grid 标记）' : `源码漂移 → ${rows.filter((x) => x.includes('MISMATCH')).join('; ')}`, rows);
  }
  // ⑥ 沙箱能力自检（applyFreeze 可包装 / __updateRaw 存在 / mulberry32 种子注入确定性）
  {
    let pass = true; const why = [];
    const sb = g.sandbox;
    if (typeof sb.applyFreeze !== 'function') { pass = false; why.push('applyFreeze 桥缺失（若改 const 箭头函数即此结局）'); }
    else {
      const orig = sb.applyFreeze;
      let wrapped = false;
      try {
        sb.applyFreeze = function (z) { wrapped = true; return orig(z); };
        const fz = { dead: false, freezeT: 0 };
        sb.applyFreeze(fz);
        if (!wrapped || fz.freezeT !== EXPECT.freezeT) { pass = false; why.push('包装后调用链断裂'); }
      } finally { sb.applyFreeze = orig; }
    }
    if (typeof g.__updateRaw !== 'function') { pass = false; why.push('__updateRaw 缺失'); }
    if (!sb.__rng || typeof sb.__rng.peek !== 'function') { pass = false; why.push('__rng(mulberry32) 缺失'); }
    else {
      // 同种子确定性：两个独立 loadGame(同 seed) 的 RNG 预读序列必须逐字节一致
      const gA = loadGame({ seed: 4242, htmlPath: pre.htmlPath });
      const gB = loadGame({ seed: 4242, htmlPath: pre.htmlPath });
      const seqA = JSON.stringify(gA.sandbox.__rng.peek(5));
      const seqB = JSON.stringify(gB.sandbox.__rng.peek(5));
      if (seqA !== seqB) { pass = false; why.push(`同种子 RNG 序列不一致 A=${seqA} B=${seqB}`); }
    }
    add(6, '沙箱能力', pass, pass ? 'applyFreeze 可包装 / __updateRaw / mulberry32 同种子序列一致' : why.join('; '));
  }
  // ⑦ 运行卫生（软门：端口预检建议 9355+ / git status 提醒 / 跑后产物清单提示）
  {
    const warnings = [];
    const portFree = await checkPortFree(EXPECT.hygienePort);
    if (!portFree) warnings.push(`端口 ${EXPECT.hygienePort} 已占用（真机/CDP 场景请换 ${EXPECT.hygienePort}+ 空闲口）`);
    let gitLines = null;
    try {
      const repoRoot = path.resolve(__dirname, '..', '..', '..');
      gitLines = execSync('git status --porcelain', { cwd: repoRoot, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    } catch (e) { warnings.push('git status 不可用: ' + e.message); }
    if (gitLines && gitLines.length) warnings.push(`git 工作树不干净（${gitLines.length} 项）——跑后请按产物清单核对，勿 git checkout 混入未预期回滚`);
    warnings.push('跑后产物：prelude-selftest-results.json（lib/ 同目录）；对照产物清单确认无多余写入');
    add(7, '运行卫生', true, `端口${EXPECT.hygienePort}${portFree ? '空闲' : '占用'}；git${gitLines ? ` ${gitLines.length} 项未提交` : ' 不可用'}`, warnings);
  }

  const hardFails = results.filter((r) => r.gate <= 6 && !r.pass);
  return { results, pass: hardFails.length === 0, failedGates: hardFails.map((r) => `gate${r.gate}:${r.name}`), hardFails };
}

/** 一步式启动：开局 → 实测前提 → 七道门。返回 {g, pre, gates}；g 仅作门检用，场景请另开 freshGame。 */
async function bootstrap(opts) {
  opts = opts || {};
  const g = freshGame(opts.gateSeed != null ? opts.gateSeed : 909, opts);
  let pre = null, gates = null;
  try {
    pre = measurePreconditions(g);
  } catch (e) {
    gates = { results: [{ gate: 0, name: 'precondition-crash', pass: false, detail: e.message }], pass: false, failedGates: ['precondition-crash'] };
    return { g, pre, gates };
  }
  gates = await runGates(g, pre, opts);
  return { g, pre, gates };
}

// ---------------- R9-a 口径自检哨兵（双域；D-1 增补 B-8 定稿） ----------------
/**
 * 旧线性式 p·n·T/cd 的域判定双跑：
 *   v1.6 域（参数覆写 p*=0.25 / T*=2.5 ≤ cd）→ 刷新浪费事件数学上不可能 ⇒ 公式前提成立 ⇒ PASS
 *   v1.7 域（p*=0.27 / T*=3.0 > cd）        → 刷新浪费必然出现 ⇒ 公式系统性高估 ⇒ 必须 FAIL
 * 判别力锚在【刷新浪费事件的有无】（确定性事件计数），不锚在覆盖率小样本残差（噪声±2pp 会淹没 ~1.1pp 的理论偏差）。
 * 参数覆写实现：p* 经受控 Math.random 门（每次调用以 p* 概率返回 0/0.5）；T* 经 applyFreeze 包装覆写。
 */
function runSentinel(opts) {
  opts = opts || {};
  const cd = opts.cd;
  const windowT = opts.windowT || 72;
  const warmupT = opts.warmupT != null ? opts.warmupT : 8;
  const nSeeds = opts.nSeeds || 8;

  function domainRun(label, pStar, TStar, seedBase) {
    const perSeed = [];
    for (const seed of seeds(seedBase, nSeeds)) {
      const g = freshGame(seed, opts);
      const sb = g.sandbox;
      // p* 覆写：黄油掷定消费 1 次随机调用 → 以 p* 概率给 0（<0.27 ⇒ butter）否则 0.5（≥0.27 ⇒ 非黄油）
      const rng2 = SeededRNG((seed * 7919 + 13) >>> 0).random;
      sb.Math.random = () => (rng2() < pStar ? 0 : 0.5);
      const ledger = createLedger({ warmupT });
      const z = injectZombie(g, { hp: 180 * SURVIVOR_MULT, maxHp: 180 * SURVIVOR_MULT });
      injectPlant(g, 'corn', 0);
      instrument(g, { overrideT: TStar, onFreeze: (zz, preT) => ledger.noteFreeze(zz, ledger.tNow + 0, preT) });
      const m = runWindow(g, { ledger, zombies: [z], duration: windowT, teleport: TELEPORT_X, warmupT, p: pStar, T: TStar, cd, nPlants: 1 });
      perSeed.push({
        seed, butters: m.butters, refreshEvents: m.refreshEvents, wasteTotal: m.refreshWasteTotal,
        coverage: m.freezeCoverage, pred: m.naiveProjection.value, deviation: m.naiveProjection.deviation,
        wasteShare: m.naiveProjection.wasteShare, identityResidual: m.naiveProjection.identityResidual,
      });
    }
    const tot = (k) => perSeed.reduce((a, b) => a + b[k], 0);
    const butters = tot('butters'), refreshes = tot('refreshEvents'), waste = tot('wasteTotal');
    const covAgg = agg(perSeed.map((x) => x.coverage));
    const devAgg = agg(perSeed.map((x) => x.deviation));
    const idResAgg = agg(perSeed.map((x) => Math.abs(x.identityResidual)));
    return {
      label, pStar, TStar, cd, seeds: seedBase, nSeeds, windowT, warmupT,
      perSeed,
      buttersTotal: butters, refreshTotal: refreshes, wasteTotal: r4(waste),
      wastePerButter: butters ? r4(waste / butters) : 0,
      wastePerRefresh: refreshes ? r4(waste / refreshes) : 0,   // 锚点：v1.7 域应 ≈ T*−cd（马尔可夫 renewal）
      predMean: r4((pStar * TStar) / cd),
      covAgg, devAgg, identityAbsResAgg: idResAgg,
    };
  }

  const A = domainRun('v1.6-like(T*=2.5<=cd)', 0.25, 2.5, opts.seedA != null ? opts.seedA : 6301);
  const B = domainRun('v1.7-like(T*=3.0>cd)', 0.27, 3.0, opts.seedB != null ? opts.seedB : 6201);

  // A 域判定：刷新浪费必须恒 0（确定性）且每种子都有黄油（可达性）且投影在 loose 带内一致
  const A_pass = A.wasteTotal === 0 && A.perSeed.every((s) => s.butters > 0) && Math.abs(A.devAgg.mean) <= 0.05;
  // B 域判定：旧公式必须 FAIL = 刷新浪费事件确凿（确定性：T*>cd 时刷新必然发生）+ 每刷新浪费 ≈ T*−cd 锚点。
  //   判据锚定确定性事件而非 dev 符号：稳态恒等式 投影−实测=浪费份额(≈1.1pp) 在有限窗口会被边界效应
  //   （预热前冻结尾巴 +2~5pp / 窗口末截断）淹没，dev 符号不是鲁棒判据（D-1 B-8 只要求域判定）。
  const B_formulaFAIL = B.refreshTotal >= 3 && B.wasteTotal > 0
    && B.wastePerRefresh > 0.25 && B.wastePerRefresh < 0.55;   // 锚点 T*−cd=0.4s ±0.15
  const discriminative = A_pass && B_formulaFAIL;
  return {
    A: { ...A, verdict: A_pass ? 'PASS(线性式前提成立)' : 'FAIL(意外出现刷新浪费/黄油不可达)' },
    B: { ...B, verdict: B_formulaFAIL ? 'FAIL(线性式系统性高估,如预期)' : 'PASS(公式意外成立→哨兵无判别力)' },
    identityCheck: {
      note: '恒等式 投影−实测 = Σ(刷新剩余)/窗口 为稳态结论；有限窗口下边界效应（预热前冻结尾巴泄入计量窗、窗口末截断）量级 ±2~5pp > 信号 ~1.1pp ⇒ dev/residual 仅作信息项，不作哨兵判据',
      B_absResidualMean: B.identityAbsResAgg.mean,
      B_wastePerRefresh: B.wastePerRefresh,
      B_refreshTotal: B.refreshTotal,
      soft: B.identityAbsResAgg.mean <= 0.02 ? 'OK' : 'INFO(边界效应主导,见 note)',
    },
    discriminative,
    conclusion: discriminative
      ? '哨兵双域判别力完整：v1.6 域 PASS + v1.7 域 FAIL 齐备'
      : '哨兵判别力不完整（单域结果不足以证明判别力）',
  };
}

module.exports = {
  // 常量/工具
  DT, ROW, START_X, HOME_X, TELEPORT_X, SURVIVOR_MULT, BASE, DIFF_EXPERT, EXPECT,
  r2, r4, agg, seeds, epsEq,
  // 六件套
  freshGame, injectZombie, injectPlant, instrument, createLedger, attachHpProbe, makeHitClassifier, runWindow,
  // 前提/门/哨兵
  measurePreconditions, createExpectations, runGates, bootstrap, runSentinel, htmlPath,
};
