/* REG-BGM-01 · 暂停时 BGM 必须停止（2026-09-20 用户反馈：已暂停游戏，背景音乐还在放）
 * 背景：暂停是独立布尔 paused（按钮/空格/Esc 三处切换），不切 state；
 *   updateBGM 的 want 条件原为 state==='play'&&!muted，未含 paused，
 *   且三处切换点无人调用 updateBGM → 暂停后 setInterval 继续排音符，BGM 照响。
 * 修复：want 补 !paused；三处切换收敛为 togglePause()（内含 updateBGM 同步）。
 * 断言：
 *   1. play 且未暂停：BGM.on = true（起播前置）
 *   2. togglePause 暂停：BGM.on = false
 *   3. togglePause 恢复：BGM.on = true（自动续上）
 *   4. setPaused(true)（程序化路径）：BGM.on = false
 *   5. 菜单里 togglePause 是 no-op（不得误触发/改状态）
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
  id: 'REG-BGM-01',
  name: '暂停时 BGM 停止 / 恢复续上 / 菜单 no-op',
  seed: 42,
  run({ game: g, assert }) {
    g.sandbox.window.AudioContext = function () { return makeSilentCtx(); };

    // ---- 1) play 且未暂停：BGM 起播 ----
    g.startGame('reg-bgm-01');
    assert(g.probe().state === 'play', '前置：已进入 play');
    assert(g.probe().bgmOn === true, 'play 未暂停时 BGM 应播放');

    // ---- 2) 暂停（真实 togglePause 路径）：BGM 停止 ----
    g.togglePause('test');
    assert(g.probe().paused === true, 'togglePause 后应处于暂停');
    assert(g.probe().bgmOn === false, '暂停后 BGM 应立即停止');

    // ---- 3) 恢复：BGM 自动续上 ----
    g.togglePause('test');
    assert(g.probe().paused === false, '再次 togglePause 应取消暂停');
    assert(g.probe().bgmOn === true, '恢复后 BGM 应自动续上');

    // ---- 4) 程序化 setPaused 路径同样同步 ----
    g.setPaused(true);
    assert(g.probe().paused === true && g.probe().bgmOn === false, 'setPaused(true) 后 BGM 应停止');

    // ---- 5) 菜单里 togglePause 是 no-op ----
    g.setPaused(false);
    g.setStateMenu('reg-bgm-01');
    assert(g.probe().state === 'menu' && g.probe().bgmOn === false, '前置：回菜单且 BGM 停止');
    g.togglePause('test');
    assert(g.probe().state === 'menu', '菜单里 togglePause 不得切换状态');
    assert(g.probe().paused === false, '菜单里 togglePause 不得置 paused');
  },
};
