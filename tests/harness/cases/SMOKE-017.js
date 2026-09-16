/* SMOKE-017 · 超声保活音源（防驱动静音门控吞首音）
 * 背景：用户持续反馈「开局点阳光/种植无声」（2026-09-16），经三层诊断页二分定位：
 *   可闻长音预热 K=5/5、静音保活 L=4/5、17.5kHz 超声保活 M=5/5 且不可闻。
 *   结论：音频驱动对数字静音做功率门控，管线空闲后唤醒过渡期会吞掉开头一段音频；
 *   只有真实非零样本流动才能撑住设备。根因不是自动播放策略、不是排程时机、不是音量。
 * 修复：initAudioBus 时启动 17.5kHz@0.005 常驻振荡器直连 destination（不走 master，
 *   静音主闸归零也不切断保活样本流），人耳不可闻。
 * 断言：
 *   1. 上下文创建后 AudioBus.keepAlive 置位
 *   2. 保活振荡器参数正确：freq=17500，经 gain=0.005 直连 destination
 *   3. initAudioBus 幂等：重复 startGame 不重复启动保活音源
 */
function makeKeepAliveCtx() {
  const rec = { oscStarts: [], bufStarted: 0, dest: { $isDest: true } };
  const ctx = {
    destination: rec.dest,
    sampleRate: 44100,
    state: 'running',
    resume() { return Promise.resolve(); },
    createGain() {
      const n = {
        connectedTo: null,
        connect(t) { n.connectedTo = t; },
        disconnect() {},
        gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
      };
      return n;
    },
    createOscillator() {
      const o = {
        connectedTo: null,
        connect(t) { o.connectedTo = t; },
        disconnect() {},
        frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        start() {
          // 快照：振荡器频率 → 所接增益节点值 → 增益节点的下游（应为 destination）
          rec.oscStarts.push({
            freq: o.frequency.value,
            gain: o.connectedTo ? o.connectedTo.gain.value : null,
            dest: o.connectedTo && o.connectedTo.connectedTo,
          });
        },
        stop() {},
      };
      return o;
    },
    createBufferSource() {
      const s = { connect() {}, disconnect() {}, start() { rec.bufStarted++; }, stop() {} };
      return s;
    },
    createBuffer(ch, len, rate) {
      return { sampleRate: rate, _d: new Float32Array(len), getChannelData() { return this._d; } };
    },
    createBiquadFilter() { return { connect() {}, disconnect() {}, frequency: { value: 0 } }; },
  };
  return { ctx, rec };
}

module.exports = {
  id: 'SMOKE-017',
  name: '超声保活音源（17.5kHz 直连 destination，防静音门控）',
  seed: 42,
  run({ game: g, assert }) {
    const { ctx, rec } = makeKeepAliveCtx();
    g.sandbox.window.AudioContext = function () { return ctx; };

    g.startGame('harness-keepalive');

    // ---- 1) 保活标志置位 ----
    assert(g.probe().audioKeepAlive === true, '上下文创建后 AudioBus.keepAlive 应置位');

    // ---- 2) 保活振荡器参数：17.5kHz @ 0.005 直连 destination ----
    assert(rec.oscStarts.length === 1, '保活振荡器应恰好启动 1 个', rec.oscStarts.length);
    const ka = rec.oscStarts[0];
    assert(ka && ka.freq === 17500, '保活振荡器频率应为 17500Hz（人耳不可闻）', ka && ka.freq);
    assert(ka && ka.gain === 0.005, '保活增益应为 0.005（不可闻量级）', ka && ka.gain);
    assert(ka && ka.dest === ctx.destination, '保活链路应直连 destination（静音主闸不得切断保活）');

    // ---- 3) primeAudio 预热 buffer 仍在（与保活互补，各司其职）----
    assert(rec.bufStarted === 1, '预热静音 buffer 仍应启动 1 帧', rec.bufStarted);

    // ---- 4) initAudioBus 幂等：重复 startGame 不重复启动保活音源 ----
    g.startGame('harness-keepalive-again');
    assert(rec.oscStarts.length === 1, '同一上下文重复初始化不得重复启动保活音源', rec.oscStarts.length);
  },
};
