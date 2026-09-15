/* ============================================================
 * T1 核验脚本 · 总线幂等性 + 路由完整性 + 静默降级 + 主循环隔离
 * ------------------------------------------------
 * 跑法：
 *   node tests/harness/verify-bus.js
 *
 * 与 run-smoke.js 的区别：
 *   run-smoke 用真实 sandbox（window.AudioContext=undefined），验证的是"无头静默降级"。
 *   本脚本在加载后注入一个 FakeAudioContext，验证的是"真有 bus 时路由/幂等/静音是否如预期"。
 *   两者结合覆盖 T1 核验的全部关键断言。
 * ============================================================ */

'use strict';

const path = require('path');
const { loadGame } = require('./index.js');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name + (extra ? '  ::  ' + JSON.stringify(extra) : '')); }
}

// ---- FakeAudioContext：最小可测总线桩 ----
function makeFakeCtx() {
  let createdBufferCount = 0;
  const createdGains = [];
  const createdBufferSources = [];
  let dest = { /* destination stub */ };

  function makeGain() {
    const g = {
      _val: 1,
      gain: { value: 1 },
      _connectedTo: [],
      connect(node) { this._connectedTo.push(node); },
    };
    return g;
  }

  const ctx = {
    destination: dest,
    sampleRate: 44100,
    state: 'running',
    resume() { return Promise.resolve(); },
    createGain() { const g = makeGain(); createdGains.push(g); return g; },
    createBuffer(ch, len, rate) {
      createdBufferCount++;
      // 返回带 getChannelData 的桩，initAudioBus 会调它填充 noise
      return {
        sampleRate: rate,
        _data: new Float32Array(len),
        getChannelData() { return this._data; },
      };
    },
    createBufferSource() {
      const s = {
        buffer: null,
        _connectedTo: [],
        connect(node) { this._connectedTo.push(node); },
        start() {}, stop() {},
      };
      createdBufferSources.push(s);
      return s;
    },
    createOscillator() {
      return {
        type: 'sine',
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        _connectedTo: [],
        connect(node) { this._connectedTo.push(node); },
        start() {}, stop() {},
      };
    },
    createBiquadFilter() {
      return {
        type: 'lowpass', frequency: { value: 0 },
        _connectedTo: [],
        connect(node) { this._connectedTo.push(node); },
      };
    },
    // 测试钩子
    __createdBufferCount: () => createdBufferCount,
    __createdGains: createdGains,
    __createdBufferSources: createdBufferSources,
    __makeGain: makeGain,
  };
  return ctx;
}

function setup() {
  const game = loadGame({ seed: 42 });
  // 注入 fake window 的 AudioContext + 覆盖 game 的 ac() 让它走 fake ctx
  const fake = makeFakeCtx();
  game.sandbox.window.AudioContext = function FakeAudioContext() { return fake; };
  // 强制 game 的 audioCtx 指向 fake，跳过惰性创建路径
  // （harness 暴露 sandbox 顶层 let 不挂 global，这里通过 sandbox 直接写不生效，
  //  改用 ac() 自身逻辑：让 window.AudioContext 存在后调用 ac() 会走 create）
  return { game, fake };
}

function main() {
  const { game: g, fake } = setup();

  // ===== 1. 触发 ac() → initAudioBus 建一次 =====
  g.startGame(); // startGame 内部调 ac() → new FakeAudioContext → initAudioBus(fake)

  // 1.1 幂等：initAudioBus 对同一 ctx 只建一次
  const buses = g.probeBus();
  check('AudioBus.ctx 已绑定到 fake 上下文', buses.ctx === fake, { got: String(buses.ctx) });
  check('masterGain 已创建并连到 destination', buses.master && buses.master._connectedTo.includes(fake.destination),
    { connected: buses.master && buses.master._connectedTo.length });

  // 1.2 4 个分组 bus 都在、且都连到 masterGain
  const groups = ['battle', 'event', 'ui', 'env'];
  for (const gr of groups) {
    check('bus[' + gr + '] 存在', !!buses.buses[gr]);
    if (buses.buses[gr]) {
      check('bus[' + gr + '] 连到 masterGain', buses.buses[gr]._connectedTo.includes(buses.master));
    }
  }

  // 1.3 分组默认音量正确
  check('levels.battle=1.0', buses.buses.battle && buses.buses.battle.gain.value === 1.0);
  check('levels.event=0.9', buses.buses.event && buses.buses.event.gain.value === 0.9);
  check('levels.ui=0.6', buses.buses.ui && buses.buses.ui.gain.value === 0.6);
  check('levels.env=0.5', buses.buses.env && buses.buses.env.gain.value === 0.5);

  // 1.4 noise 缓冲预生成（0.1/0.3/0.5s 三档），createBuffer 仅在初始化调用
  const noiseKeys = Object.keys(buses.noiseBufs || {});
  check('noiseBufs 预生成 3 档 (0.1/0.3/0.5)', noiseKeys.length === 3, noiseKeys);
  check('noiseBufs["0.1"] 存在', buses.noiseBufs['0.1'] != null);
  check('noiseBufs["0.3"] 存在', buses.noiseBufs['0.3'] != null);
  check('noiseBufs["0.5"] 存在', buses.noiseBufs['0.5'] != null);
  const bufCountAfterInit = fake.__createdBufferCount();
  check('初始化后 createBuffer 仅 3 次（= 3 档 noise）', bufCountAfterInit === 3, { bufCountAfterInit });

  // ===== 2. 路由完整性：13 音效按 AUDIO_ROUTES 落到正确 bus =====
  // 直接调底层 noise()，验证 createBufferSource 复用预生成 buffer（不再 createBuffer）。
  // 注意：noise/routeBus 是游戏顶层函数声明，宿主须走 g.__noise / g.__routeBus 探针
  //（PROBE_SUFFIX 已挂 globalThis.__noiseRef/__routeBusRef 桥），不能读 g.sandbox.__noise。
  const noiseFn = g.__noise;
  check('__noise 探针可用（游戏顶层 noise 函数已桥接）', typeof noiseFn === 'function');
  if (noiseFn) {
    const srcsBefore = fake.__createdBufferSources.length;
    const bufsBefore = fake.__createdBufferCount();
    noiseFn(0.17, { vol: 0.2, lp: 900, group: 'ui' });
    const srcsAfter = fake.__createdBufferSources.length;
    const bufsAfter = fake.__createdBufferCount();
    check('noise() 触发后 createBufferSource +1（复用，不新建 buffer）', srcsAfter === srcsBefore + 1,
      { srcsBefore, srcsAfter });
    check('noise() 触发后 createBuffer 不增加（确认未每帧新建）', bufsAfter === bufsBefore,
      { bufsBefore, bufsAfter });
  }

  // 验证 routeBus 行为：group 缺省走 event
  const routeFn = g.__routeBus;
  check('__routeBus 探针可用（游戏顶层 routeBus 函数已桥接）', typeof routeFn === 'function');
  const evBus = buses.buses.event;
  if (routeFn) check('routeBus(c, undefined) → event bus', routeFn(fake, undefined) === evBus);
  check('routeBus(c, "ui") → ui bus', routeFn(fake, 'ui') === buses.buses.ui);
  check('routeBus(c, "battle") → battle bus', routeFn(fake, 'battle') === buses.buses.battle);
  // 未知 group 应回退 event
  check('routeBus(c, "unknown") → event bus（回退）', routeFn(fake, 'unknown') === evBus);

  // 验证 13 个 SFX 的 group 标注与 AUDIO_ROUTES 一致（静态核对）
  const routes = g.probeBus().routes;
  const expect = {
    plant: 'ui', sun: 'ui', shovel: 'ui', deny: 'ui',
    shoot: 'battle', hit: 'battle', death: 'battle', boom: 'battle', chomp: 'battle',
    wave: 'event', siren: 'event', win: 'event', lose: 'event'
  };
  for (const k in expect) {
    check('AUDIO_ROUTES.' + k + ' = ' + expect[k], routes[k] === expect[k], { got: routes[k] });
  }

  // ===== 3. muted 切换走 masterGain.gain（而非业务层短路）=====
  // muted 是游戏顶层 let（宿主 sandbox 读不到），其值经 probeBus 或 mute 按钮行为间接验证：
  // 点静音按钮 → masterGain.gain 应变 0；再点 → 回 1。
  const muteBtn = g.sandbox.btns ? g.sandbox.btns.mute : null;
  check('mute 按钮 stub 存在', !!muteBtn);
  const handler = muteBtn && muteBtn.onclick;
  check('mute 按钮有 onclick handler', typeof handler === 'function');
  const ev = { preventDefault() {} };
  handler(ev); // 点静音 → muted=true → masterGain.gain=0
  check('点静音后 masterGain.gain=0（主闸关闭）', buses.master.gain.value === 0,
    { gain: buses.master.gain.value });
  // 再点一次取消静音 → masterGain.gain=1
  handler(ev);
  check('取消静音后 masterGain.gain=1（主闸打开）', buses.master.gain.value === 1,
    { gain: buses.master.gain.value });

  // ===== 4. 异常隔离：push null 不崩 =====
  // 在主循环 step 时塞 null zombie，验证 try/catch 兜住、循环续订。
  // zombies 是游戏顶层 let，宿主经 __zombies getter 桥接访问（startGame 重赋值也实时生效）。
  g.forceZombieAt('normal', 0, 100);
  g.sandbox.__zombies.push(null);
  // 用 __stepFrame 真跑一帧 loop（loop 内整帧 try/catch 兜异常 + RAF 续订）。
  // 注意：不能用 g.tick —— tick 直接裸调 update(dt)，不经 loop 的 try/catch，
  // null 会炸到宿主；真实游戏里异常是被 loop() 兜住的（SMOKE-008 已验证隔离）。
  let loopSurvived = true;
  try {
    g.__stepFrame();
  } catch (e) {
    loopSurvived = false;
  }
  check('含 null zombie 时帧循环不崩（异常被 loop 整帧 try/catch 隔离）', loopSurvived);

  // ===== 5. 静默降级（无 AudioContext 时）=====
  const g2 = loadGame({ seed: 7 });
  // window.AudioContext 保持 undefined（默认）
  g2.startGame();
  let silentOk = true;
  try {
    g2.tick(2); // 触发 SFX 调用路径，ac() 返回 null，tone/noise 静默返回
  } catch (e) {
    silentOk = false;
  }
  check('无 AudioContext 时音频静默降级（tick 不崩）', silentOk);

  // ===== 汇总 =====
  console.log('────────────────────────────────────────');
  console.log('  T1 核验：' + pass + '/' + (pass + fail) + ' PASS' + (fail ? ' · ' + fail + ' FAIL' : ''));
  console.log('  门控：' + (fail === 0 ? 'PASS（幂等安全 / 路由完整 / 隔离生效）' : 'FAIL（发现阻塞 bug）'));
  console.log('────────────────────────────────────────');
  process.exitCode = fail === 0 ? 0 : 1;
}

main();
