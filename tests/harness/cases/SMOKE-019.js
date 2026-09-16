/* SMOKE-019 · BGM 生命周期（play 起 / menu·end 停 / 静音停）
 * 背景：用户反馈「没有背景音乐」（2026-09-16）。
 *   新增 WebAudio 合成 BGM：state==='play' 且未静音时播放（env 总线），
 *   setState 统一入口驱动 updateBGM()，loop 每帧兜底重试（覆盖上下文晚就绪）。
 * 断言：
 *   1. menu 阶段（上下文未创建）BGM 不启动
 *   2. startGame（play）后 BGM.on = true
 *   3. 返回 menu 后 BGM 停止
 *   4. 再进 play 恢复，静音后停止
 */
function makeSilentCtx() {
  const node = () => ({ connect() {}, disconnect() {} });
  return {
    destination: node(),
    sampleRate: 44100,
    state: 'running',
    resume() { return Promise.resolve(); },
    createGain() {
      const n = node();
      n.gain = { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} };
      return n;
    },
    createOscillator() {
      const o = node();
      o.frequency = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} };
      o.start = () => {}; o.stop = () => {};
      return o;
    },
    createBufferSource() { const s = node(); s.start = () => {}; s.stop = () => {}; return s; },
    createBuffer(ch, len, rate) { return { sampleRate: rate, _d: new Float32Array(len), getChannelData() { return this._d; } }; },
    createBiquadFilter() { const f = node(); f.frequency = { value: 0 }; return f; },
  };
}

module.exports = {
  id: 'SMOKE-019',
  name: 'BGM 生命周期（play 起 / menu 停 / 静音停）',
  seed: 42,
  run({ game: g, assert }) {
    g.sandbox.window.AudioContext = function () { return makeSilentCtx(); };

    // ---- 1) menu：上下文未创建，BGM 不启动 ----
    assert(g.probe().state === 'menu', '前置：初始在 menu');
    assert(g.probe().bgmOn === false, 'menu 且无上下文时 BGM 不得启动');

    // ---- 2) startGame → play：BGM 启动（startGame 内 ac() 创建 running 上下文）----
    g.startGame('harness-bgm');
    assert(g.probe().bgmOn === true, '进入 play 后 BGM 应启动');

    // ---- 3) 返回 menu：BGM 停止 ----
    g.setStateMenu('bgm-test');
    assert(g.probe().state === 'menu', '前置：已回到 menu', g.probe().state);
    assert(g.probe().bgmOn === false, '回到 menu 后 BGM 应停止');

    // ---- 4) 再进 play 恢复；静音后停止 ----
    g.startGame('harness-bgm2');
    assert(g.probe().bgmOn === true, '重新进入 play 后 BGM 应恢复');
    g.setMuted(true);
    assert(g.probe().bgmOn === false, '静音后 BGM 应停止');
    g.setMuted(false);
    assert(g.probe().bgmOn === true, '取消静音（play 中）BGM 应自动续上');
  },
};
