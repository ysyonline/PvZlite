/* ============================================================
 * PvZ Lite · 无头测试公共 harness
 * ------------------------------------------------
 * 把 README「无头测试方法」升级为可复用模块。
 * 零 npm 依赖，仅用 Node 内置 fs / vm。
 *
 * 用法（在 tests/harness/ 下的任何脚本里）：
 *   const { loadGame, SeededRNG } = require('./index.js');
 *   const game = loadGame({ seed: 12345 });
 *   game.startGame();            // __api.startGame()
 *   game.seed(42);              // 注入固定种子 RNG
 *   game.tick(12);              // gt += 12; update(12)
 *   const snap = game.probe();  // 当前状态快照
 *   game.click(55, 80);         // 模拟点击 canvas (x,y)
 *   game.keydown('1');          // 模拟按键
 *   game.spawnCount();          // 真实刷怪数（processSpawnQueue 包装法）
 *
 * 设计要点：
 *   - loadGame() 抽 <script>、造 ctx Proxy stub、vm sandbox、挂 __probe/__api
 *   - gt 外置时钟：README 坑 #1，无头测试必须自己补 gt += dt
 *   - SeededRNG：mulberry32，可注入 game 的 Math.random，波次/刷怪可复现
 *   - click/keydown 直接调 listeners.click / winListeners.keydown（README 坑已验证）
 *   - 函数包装统计刷怪数：README 坑 #4（processSpawnQueue 包装法）
 * ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ------------------------------------------------------------
// SeededRNG · mulberry32
// ------------------------------------------------------------
// 确定性 32 位 PRNG，固定种子可完全复现序列。
// 注入方式：loadGame({seed:N}) 会用 SeededRNG(N) 覆盖 sandbox 的
// Math.random。游戏里唯一的随机源是 Math.random（共 4 处调用），
// 无需改游戏代码。
function SeededRNG(seed) {
  let s = seed >>> 0;
  function random() {
    // mulberry32
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    random,                       // () => [0,1)
    seed: () => s,
    // 预读 n 个随机数（调试 / 断言固定序列）
    peek(n) {
      const out = [];
      const cur = s;
      for (let i = 0; i < n; i++) {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        out.push(((t ^ (t >>> 14)) >>> 0) / 4294967296);
      }
      s = cur;
      return out;
    },
  };
}

// 一个"看似随机但可控"的默认种子（不指定 seed 时用它，仍确定性）
const DEFAULT_SEED = 1337;

// ------------------------------------------------------------
// 探针追加脚本（注入到 <script> 末尾）
// 顶层 let/const 不挂 global，必须同一作用域追加（README 坑 #4）
// ------------------------------------------------------------
const PROBE_SUFFIX = `
;(function(){
  // 顶层 let 变量桥接（README：顶层 let/const 不挂 global，宿主读不到）。
  // 注意 startGame() 会 plants=[];zombies=[]; 重赋值引用，故不能用一次性 = 赋值桥接
  //（会拿到死引用），改用 Object.defineProperty getter 实时取当前引用。
  Object.defineProperty(globalThis,'__plants',{get:function(){return plants;},configurable:true});
  Object.defineProperty(globalThis,'__zombies',{get:function(){return zombies;},configurable:true});
  // projectiles / effects 同样会被整体重赋值（filter），必须 getter 实时取
  Object.defineProperty(globalThis,'__projectiles',{get:function(){return projectiles;},configurable:true});
  Object.defineProperty(globalThis,'__effects',{get:function(){return effects;},configurable:true});
  // LEVELS/level 桥（关卡平衡契约测试用；LEVELS 是 const 引用稳定，直接桥即可）
  globalThis.__LEVELS = LEVELS;
  Object.defineProperty(globalThis,'__level',{get:function(){return level;},configurable:true});
  // SFX 表（const 对象，顶层 const 不挂 globalThis，必须显式桥；供用例打桩 SFX.deny/shoot 等）
  globalThis.__SFX = SFX;
  // VERSION 常量桥（顶层 const 不挂 globalThis；V11-05 版本号用例断言用）
  globalThis.__VERSION = (typeof VERSION !== 'undefined') ? VERSION : null;
  // 布局常量桥（TRAP-04 点击热区用例：用 CARD_X0 推导坐标，验证命中判定不写死下标）
  globalThis.__consts = {
    CARD_X0, CARD_W, CARD_H, CARD_Y, SHOVEL_X, SHOVEL_W,
    GRID_X, GRID_Y, CELL_W, CELL_H, COLS, ROWS,
    CANVAS_W: canvas.width, CANVAS_H: canvas.height
  };
  // 状态快照（断言用）
  globalThis.__probe = function(){
    return {
      state, wave, sun, score, gt,
      paused, won, levelNo, unlockedLevel,
      lastWaveT, exitArm, waveActive,
      muted, highScore,
      selected: selected ? {i:selected.i, shovel:!!selected.shovel, type:selected.type} : null,
      DIFF,
      cardCD: JSON.parse(JSON.stringify(cardCD||{})),
      plants: plants.length,
      zombies: zombies.length,
      projectiles: projectiles.length,
      effects: effects.length,
      spawnQueueLen: spawnQueue.length,
      warnActive: warn.active,
      warnPending: warn.pending,
      warnT: warn.t,
      audioQueueLen: audioQueue.length,
      audioKeepAlive: typeof AudioBus !== 'undefined' && AudioBus.keepAlive,
      bgmOn: typeof BGM !== 'undefined' ? BGM.on : false,
      // 深快照，便于断言具体实体（zombies 可能含测试注入的 null，须过滤）
      plantsArr: plants.map(function(p){return {type:p.type,col:p.col,row:p.row,cd:p.cd,dur:p.dur,sunT:p.sunT,armT:p.armT,maxDur:p.maxDur,_dying:!!p._dying};}),
      zombiesArr: zombies.filter(function(z){return z;}).map(function(z){return {type:z.type,x:z.x,row:z.row,hp:z.hp,spd:z.spd,eating:!!z.eating,dead:!!z.dead};}),
      // 波次队列深快照（REG-ZOM-01 断言 hp/spd 与难度倍数）
      spawnQueueArr: spawnQueue.map(function(z){return {type:z.type,row:z.row,hp:z.hp,maxHp:z.maxHp,spd:z.spd};}),
      // 子弹 / 特效深快照（REG-PLANT-* / REG-SUN-* / REG-MINE-* 断言）
      projectilesArr: projectiles.map(function(p){return {type:p.type,x:p.x,y:p.y,row:p.row,vx:p.vx,dmg:p.dmg,splash:p.splash,dead:!!p.dead};}),
      effectsArr: effects.map(function(e){return {kind:e.kind,x:e.x,y:e.y,value:e.value,dead:!!e.dead,stayT:e.stayT||0,t:e.t||0,targetY:e.targetY,life:e.life||0};}),
    };
  };

  // 可操作 API
  globalThis.__api = {
    // 直接调 startGame，等价点「开始游戏」
    startGame: function(why){ startGame(why||'harness'); },
    // 外置时钟：gt 在 RAF loop() 里累加（且仅当 state==='play'&&!paused），
    // 无头测试必须自己补（README 坑 #1）。这里同步该守卫，忠实复刻 loop() 行为：
    // 暂停时 tick 既不动 gt 也不调 update —— 这正是 SMOKE-10 要验证的。
    tick: function(dt){
      if(state==='play' && !paused){ gt += dt; update(dt); }
    },
    // 选卡（索引 0-5）
    selectCard: function(i){
      var c = CARDS[i]; if(!c) return;
      selected = (selected && selected.i===i) ? null : {i:i,type:c.type,name:c.name,cost:c.cost};
    },
    // 铲子
    selectShovel: function(){ selected = (selected && selected.shovel) ? null : {shovel:true}; },
    // 点种植格（col,row）
    clickGrid: function(col,row){
      var pos = gridToPos(col,row);
      onClick({clientX:pos.x, clientY:pos.y});
    },
    // 直接对 canvas 像素坐标点击（走 onClick 完整逻辑）
    clickAt: function(x,y){ onClick({clientX:x, clientY:y}); },
    // 暂停开关
    setPaused: function(v){ paused = !!v; },
    // 直接改 sun（测试阳光不足等分支）
    setSun: function(v){ sun = v; },
    // 直接改难度
    setDiff: function(d){ DIFF = d; },
    // 直接改自然阳光掉落计时（推远可隔离自然掉落，专测向日葵产阳光）
    setSunFallT: function(t){ sunFallT = t; },
    // 直接切关（选关测试/平衡契约用，等价菜单选关的赋值路径）
    setLevel: function(n){
      if(!LEVELS[n]) return;
      levelNo = n; level = LEVELS[n];
    },
    // 直接改解锁进度（免通关直进高关卡）
    setUnlocked: function(n){ unlockedLevel = Math.max(1, n|0); },
    // 强推一只僵尸到屋（x=0 → 下一帧 end）
    forceZombieHome: function(type){
      var row = Math.floor(Math.random()*ROWS);
      var st = {normal:[180,16],cone:[340,15],fast:[140,45],bucket:[560,12]}[type||'normal'];
      zombies.push({type:type||'normal',row:row,hp:st[0],maxHp:st[0],spd:st[1],x:GRID_X-40,
        eating:false,eatAnim:0,walk:0,dead:false});
    },
    // 强推一只僵尸到指定位置
    forceZombieAt: function(type,row,x){
      var st = {normal:[180,16],cone:[340,15],fast:[140,45],bucket:[560,12]}[type||'normal'];
      zombies.push({type:type||'normal',row:row,hp:st[0],maxHp:st[0],spd:st[1],x:x,
        eating:false,eatAnim:0,walk:0,dead:false});
    },
    // 杀死某行所有僵尸（用于快速通关）
    killAllZombies: function(){ for(var i=0;i<zombies.length;i++){ if(!zombies[i].dead) killZombie(zombies[i]); } },
    // 清空场上实体 + 队列（测试通关分支用）
    clearField: function(){
      for(var i=0;i<zombies.length;i++){ if(!zombies[i].dead) killZombie(zombies[i]); }
      spawnQueue = []; waveActive = false;
    },
    // 强制走完 N 波（直接推进 wave + lastWaveT，跳过实际等待）
    forceWaves: function(n){
      for(var w=wave; w<Math.min(level.totalWaves, wave+n); w++){
        lastWaveT = gt; wave++;
        newWave(wave);
      }
    },
    // 直接设 wave / lastWaveT（手动推进状态机）
    setWave: function(w){ wave = w; },
    setLastWaveT: function(t){ lastWaveT = t; },
    // 直接调 newWave(n) 生成第 n 波队列（n 从 1 起）
    newWave: function(n){ newWave(n); },
    // 回菜单（走真实 setState 路径，驱动 BGM 停止）
    setStateMenu: function(why){ setState('menu', why||'harness'); },
    // 切静音（复刻 mute 按钮主闸逻辑 + updateBGM 同步）
    setMuted: function(v){
      muted = !!v;
      if(AudioBus.ctx) AudioBus.master.gain.value = muted?0:1;
      updateBGM();
    },
    // 暴露 processSpawnQueue 包装计数（README 坑 #4）
    _wrapSpawnCount: function(){
      if(globalThis.__spawnCounting) return;
      var _o = processSpawnQueue;
      globalThis.__spawnCount = 0;
      globalThis.__spawnCounting = true;
      processSpawnQueue = function(dt){
        var b = spawnQueue.length;
        _o(dt);
        globalThis.__spawnCount += (b - spawnQueue.length);
      };
    },
    spawnCount: function(){ return globalThis.__spawnCount||0; },
    // ---- T1 音频总线探针（verify-bus.js 依赖）----
    probeBus: function(){
      return {
        ctx: AudioBus.ctx,
        master: AudioBus.master,
        buses: AudioBus.buses,
        noiseBufs: AudioBus.noiseBufs,
        levels: AudioBus.levels,
        routes: AUDIO_ROUTES
      };
    },
    // 直接取底层 noise / routeBus / sfxGate / update，供 verify-bus.js 与 SMOKE 用例断言。
    // 这些是游戏顶层自由变量（function 声明），PROBE_SUFFIX 同作用域可直接引用；
    // 但对象字面量里的引用需在 IIFE 内先行挂 globalThis 桥，跨 vm 边界才可读。
    __noise: (globalThis.__noiseRef = (typeof noise === 'function' ? noise : null)),
    __routeBus: (globalThis.__routeBusRef = (typeof routeBus === 'function' ? routeBus : null)),
    __sfxGate: (globalThis.__sfxGateRef = (typeof sfxGate !== 'undefined' ? sfxGate : null)),
    // 直接调用游戏顶层 update(dt)（不累加 gt），供 SMOKE-009 验证 gt 外置时钟
    __updateRaw: (globalThis.__updateRef = (typeof update === 'function' ? update : null)),
    // 取单帧 handler 并消费（shift rafQueue 顶 + 调用），供 SMOKE-008 验证异常隔离后 RAF 续订。
    // rafQueue 由 IIFE 内 globalThis.rafQueueRef 桥接（Node 模块变量未自动挂 globalThis）。
    __stepFrame: function(){
      var q = globalThis.rafQueueRef;
      if(!q || !q.length) return null;
      var h = q.shift();
      h(0);
      return h;
    }
  };
})();
`;

// ------------------------------------------------------------
// loadGame · 主入口
// ------------------------------------------------------------
function loadGame(opts) {
  opts = opts || {};
  const htmlPath = opts.htmlPath || path.resolve(__dirname, '..', '..', 'plants-vs-zombies.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('未能在 HTML 中定位 <script> 块: ' + htmlPath);
  let code = m[1];

  // ---- ctx Proxy stub：吞掉所有绘制调用（README） ----
  const ctxStub = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : function () {
      const s = String(k);
      if (s === 'createLinearGradient' || s === 'createRadialGradient') {
        return { addColorStop() {}, addColorStop2() {} };
      }
      if (s === 'measureText') return { width: 0 };
      if (s === 'getLineDash') return [];
      return undefined;
    }),
    set: (t, k, v) => { t[k] = v; return true; },
  });

  // ---- DOM 监听器 ----
  const listeners = {};       // canvas.addEventListener
  const winListeners = {};    // window.addEventListener
  // 按钮元素 stub（bindBtn 用）
  const buttons = {};
  function makeBtn(id) {
    if (!buttons[id]) {
      buttons[id] = {
        id,
        classList: { add() {}, remove() {}, toggle() {} },
        style: {},
        textContent: '',
        onclick: null,
        blur() {}, focus() {},
        addEventListener() {},
      };
    }
    return buttons[id];
  }

  const canvasStub = {
    width: 1000,
    height: 680,
    style: {},
    getContext: () => ctxStub,
    addEventListener: (k, f) => { listeners[k] = f; },
    focus() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 680 }),
  };

  // ---- Math.random 注入（SeededRNG） ----
  let rng;
  if (opts.seed != null || opts.seeded) {
    rng = SeededRNG(opts.seed != null ? opts.seed : DEFAULT_SEED);
  }
  const mathStub = rng
    ? Object.assign(Object.create(Math), { random: rng.random.bind(rng) })
    : Math;

  // ---- sandbox ----
  const sandbox = {
    console,
    Math: mathStub,
    Date,
    performance: { now: () => 0 },
    document: { getElementById: (id) => (id === 'canvas' ? canvasStub : makeBtn(id)) },
    window: {
      addEventListener: (k, f) => { winListeners[k] = f; },
      AudioContext: undefined,
      webkitAudioContext: undefined,
      // BGM 时间轴自续用的定时器（vm 沙箱无内置 setInterval）：捕获但不驱动，
      // 无头测试只断言 BGM.on 标志，不实际跑时间轴
      setInterval: () => 0,
      clearInterval: () => {},
    },
    canvas: canvasStub,
    requestAnimationFrame: (f) => { rafQueue.push(f); return rafQueue.length; },
  };
  // README 坑：必须显式挂外部变量 + globalThis 自指
  const rafQueue = [];
  sandbox.globalThis = sandbox;
  sandbox.listeners = listeners;
  sandbox.winListeners = winListeners;
  sandbox.rafQueue = rafQueue;
  sandbox.btns = buttons;
  // 存档注入（V11-04 持久化用例）：可传一份共享 store 以实现「写入 → 重载 → 读回」
  if (opts.localStorage) sandbox.localStorage = opts.localStorage;
  // location 桩：让 URLSearchParams(location.search) 不抛 ReferenceError（与真实浏览器一致）
  sandbox.location = { search: opts.search || '' };
  // 把 RNG 也暴露出来供测试直接调用
  if (rng) sandbox.__rng = rng;

  // ---- 追加探针 + API，跑进 vm 上下文 ----
  code = code + PROBE_SUFFIX;
  const ctx = vm.createContext(sandbox);
  vm.runInContext(code, ctx, { filename: 'pvs-lite.js' });

  // ---- 包装刷怪计数（README 坑 #4） ----
  // 通过 __api 暴露；case 里主动调 game.enableSpawnCount() 开启
  // 这里默认不启用，避免影响正常流程

  const api = sandbox.__api;
  const probe = sandbox.__probe;

  return {
    sandbox,
    rafQueue,
    // ---- 核心 API（便捷别名） ----
    probe,                  // game.probe()
    startGame: api.startGame.bind(api),
    tick: api.tick.bind(api),
    selectCard: api.selectCard.bind(api),
    selectShovel: api.selectShovel.bind(api),
    clickGrid: api.clickGrid.bind(api),
    clickAt: api.clickAt.bind(api),
    setPaused: api.setPaused.bind(api),
    setSun: api.setSun.bind(api),
    setDiff: api.setDiff.bind(api),
    setSunFallT: api.setSunFallT.bind(api),
    setLevel: api.setLevel.bind(api),
    setUnlocked: api.setUnlocked.bind(api),
    forceZombieHome: api.forceZombieHome.bind(api),
    forceZombieAt: api.forceZombieAt.bind(api),
    killAllZombies: api.killAllZombies.bind(api),
    clearField: api.clearField.bind(api),
    forceWaves: api.forceWaves.bind(api),
    setWave: api.setWave.bind(api),
    setLastWaveT: api.setLastWaveT.bind(api),
    newWave: api.newWave.bind(api),
    setStateMenu: api.setStateMenu.bind(api),
    setMuted: api.setMuted.bind(api),
    // ---- T1 音频总线探针（verify-bus.js 依赖）----
    probeBus: api.probeBus ? api.probeBus.bind(api) : null,
    __noise: api.__noise ? api.__noise : null,
    __routeBus: api.__routeBus ? api.__routeBus : null,
    __updateRaw: api.__updateRaw ? api.__updateRaw.bind(api) : null,
    __stepFrame: api.__stepFrame ? api.__stepFrame.bind(api) : null,
    // ---- 模拟输入（直接调 listener，比构造 DOM 事件省事，README 坑已验证） ----
    click: (x, y) => {
      const f = listeners.click;
      if (!f) throw new Error('canvas click listener 未注册（需先跑过 init）');
      f({ clientX: x, clientY: y, target: canvasStub });
    },
    keydown: (key) => {
      const f = winListeners.keydown;
      if (!f) throw new Error('window keydown listener 未注册');
      // 构造最小事件：key 小写，target 非可编辑
      f({ key: key, target: {}, preventDefault() {} });
    },
    // ---- 刷怪计数（README 坑 #4：processSpawnQueue 包装法） ----
    enableSpawnCount() { api._wrapSpawnCount(); },
    spawnCount: () => api.spawnCount(),
    // ---- RNG 控制 ----
    seed(n) {
      // 重新注入一个固定种子 RNG（替换 Math.random）
      const r = SeededRNG(n);
      sandbox.Math.random = r.random.bind(r);
      sandbox.__rng = r;
      return r;
    },
    // ---- 异常隔离测试辅助（README 坑 #3） ----
    pushNullZombie() {
      // 让 update() 天然抛 TypeError
      api.forceZombieAt('normal', 0, -9999);
      // 注入 null
      const arr = sandbox.zombies;
      if (arr && typeof arr.push === 'function') arr.push(null);
    },
    // ---- 主循环 step（消费 rafQueue 里那一帧，README 坑 #2） ----
    step() {
      // 消费当前 rafQueue 里的下一帧
      const f = rafQueue.shift();
      if (f) f(performance.now());
      return f;
    },
  };
}

module.exports = { loadGame, SeededRNG, DEFAULT_SEED };

// CLI 自测：node index.js → 跑一次最小冒烟（startGame + tick 12s + 断言 wave）
if (require.main === module) {
  const g = loadGame({ seed: 12345 });
  g.startGame();
  g.tick(12); // 第一波延迟 12s
  const p = g.probe();
  console.log('state', p.state, 'wave', p.wave, 'gt', p.gt.toFixed(1), 'zombies', p.zombies);
  if (p.state !== 'play') throw new Error('expected play, got ' + p.state);
  if (p.wave < 1) throw new Error('expected wave>=1 after 12s, got ' + p.wave);
  console.log('OK: harness smoke self-test passed');
}
