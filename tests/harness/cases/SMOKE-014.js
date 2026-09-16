/* SMOKE-014 · 开局音效可听性（会话首个音效不能被吞）
 * 背景：用户反馈「游戏刚开始时种植植物没有音效」（2026-09-16）。
 *   代码路径本身没问题（已确认种植会创建并启动振荡器），根因在浏览器音频层：
 *   上下文刚创建时音频线程尚未就绪，会话首批音效被整段丢弃。
 *   修复 = ①创建上下文即播 1 帧静音 buffer 预热管线 ②tone/noise 加 8ms 前瞻
 *          ③任意首次用户手势都尝试 resume（armAudioUnlock）
 * 本用例注入 FakeAudioContext，断言"从启动 → 首次种植 → 常规交互"全程真的在产生音频事件。
 */
function makeFakeCtx() {
  const rec = { oscStarted: 0, bufStarted: 0, resumed: 0 };
  const node = () => ({ connect() {}, disconnect() {} });
  const ctx = {
    destination: node(),
    sampleRate: 44100,
    state: 'running',
    resume() { rec.resumed++; return Promise.resolve(); },
    createGain() {
      const n = node();
      n.gain = { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} };
      return n;
    },
    createOscillator() {
      const o = node();
      o.frequency = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} };
      o.start = () => { rec.oscStarted++; };
      o.stop = () => {};
      return o;
    },
    createBufferSource() {
      const s = node();
      s.start = () => { rec.bufStarted++; };
      s.stop = () => {};
      return s;
    },
    createBuffer(ch, len, rate) {
      return { sampleRate: rate, _d: new Float32Array(len), getChannelData() { return this._d; } };
    },
    createBiquadFilter() { const f = node(); f.frequency = { value: 0 }; return f; },
  };
  return { ctx, rec };
}

module.exports = {
  id: 'SMOKE-014',
  name: '开局音效可听性（预热 + 首音不丢）',
  seed: 42,
  run({ game: g, assert }) {
    const { ctx, rec } = makeFakeCtx();
    g.sandbox.window.AudioContext = function () { return ctx; };   // 注入可观测的假上下文

    // ---- 1) 开局：上下文创建 + 管线预热 ----
    g.startGame('harness-audio');
    assert(rec.bufStarted === 1, 'startGame 后应已播 1 帧静音 buffer（音频管线预热）', rec.bufStarted);
    assert(rec.oscStarted === 0, 'startGame 本身不应发出可听音（只有预热静音）', rec.oscStarted);

    // ---- 2) 首次种植必须发声（用户报告的核心场景）----
    g.setSun(9999);
    g.selectCard(0);                 // 向日葵（cost 50）
    g.clickGrid(0, 2);
    assert(g.probe().plants === 1, '前置：向日葵应已种下', g.probe().plants);
    assert(rec.oscStarted >= 1, '开局第一次种植必须启动振荡器（SFX.plant 真的发音）', rec.oscStarted);

    // ---- 3) 后续种植继续发声 ----
    const afterPlant1 = rec.oscStarted;
    g.selectCard(1);                 // 豌豆（cost 100）
    g.clickGrid(1, 2);
    assert(g.probe().plants === 2, '前置：豌豆应已种下', g.probe().plants);
    assert(rec.oscStarted > afterPlant1, '第二次种植应继续发声', [afterPlant1, rec.oscStarted]);

    // ---- 4) 常规交互分支也发声（阳光不足 → deny）----
    const afterPlant2 = rec.oscStarted;
    g.setSun(0);
    g.selectCard(1);
    g.clickGrid(3, 2);
    assert(rec.oscStarted > afterPlant2, '阳光不足拒用应发声（SFX.deny）', [afterPlant2, rec.oscStarted]);

    // ---- 5) 铲除发声 ----
    const afterDeny = rec.oscStarted;
    g.selectShovel();
    g.clickGrid(0, 2);
    assert(rec.oscStarted > afterDeny, '铲除植物应发声（SFX.shovel）', [afterDeny, rec.oscStarted]);
  },
};
