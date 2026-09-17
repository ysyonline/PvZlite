/* SMOKE-016 · 音频未就绪补播（suspended → deferred → flushed）
 * 背景：用户二次反馈「开局点阳光/种植仍无声」（2026-09-16）。
 *   直接把音效排进未 running 的 AudioContext，事件可能被整段丢弃。
 *   修复：tone/noise 走 scheduleOrDefer —— 未就绪时入 audioQueue，
 *   loop 每帧 flushAudioQueue()，running 后补播。
 * 断言：
 *   1. 上下文 suspended 时种植：振荡器不启动，音效进补播队列
 *   2. 手动把 fake 上下文切到 running 并跑一帧 loop：振荡器启动（补播成功），队列清空
 *   3. 暂停 / 菜单状态下也能冲洗（loop 无条件冲洗）
 */
function makeSuspendedCtx() {
  const rec = { oscStarted: 0, bufStarted: 0 };
  const node = () => ({ connect() {}, disconnect() {} });
  const ctx = {
    destination: node(),
    sampleRate: 44100,
    state: 'suspended',                     // 关键：以挂起态起步
    // 注意：resume() 不自动转 running —— 保持挂起，由测试手动切 ctx.state 验证补播
    resume() { this._resumed = true; return Promise.resolve(); },
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
  id: 'SMOKE-016',
  name: '音频未就绪补播（suspended 挂起 → running 冲洗）',
  seed: 42,
  run({ game: g, assert }) {
    const { ctx, rec } = makeSuspendedCtx();
    g.sandbox.window.AudioContext = function () { return ctx; };

    g.startGame('harness-defer');
    g.setSunFallT(999);                      // 推远自然阳光掉落：B3 落地后掉落会发声，须隔离环境音
    assert(rec.bufStarted === 1, '预热 buffer 仍应启动（primeAudio 不走 defer）', rec.bufStarted);
    const base = rec.oscStarted;             // 保活振荡器在 initAudioBus 时启动，后续断言用差值
    assert(base === 1, '前置：保活振荡器已启动（基线）', base);

    // ---- 1) suspended 状态下种植：不丢、进队列 ----
    g.setSun(9999);
    g.selectCard(0);
    g.clickGrid(0, 2);
    let p = g.probe();
    assert(p.plants === 1, '前置：向日葵已种下', p.plants);
    assert(rec.oscStarted === base, 'suspended 时振荡器不得直接启动（会被丢弃）', rec.oscStarted);
    // 注：S2 起 SFX.plant = 主音 tone + 落地 noise 两层，故每次种植入队 2 项。
    // 此处只断言「入队且单调增长」（不锁定层数），避免每次加叠层都要改断言。
    const q1 = p.audioQueueLen;
    assert(q1 > 0, '种植音效应进入补播队列（不丢事件）', q1);

    // ---- 2) 再点阳光（也挂起入队）----
    g.selectCard(1);
    g.clickGrid(1, 2);
    p = g.probe();
    assert(p.audioQueueLen > q1, '第二个音效也应入队（队列单调增长）', [q1, p.audioQueueLen]);
    assert(rec.oscStarted === base, '仍不得直接启动', rec.oscStarted);

    // ---- 3) 上下文转 running + 跑一帧真 loop → 补播 ----
    ctx.state = 'running';
    const f = g.rafQueue.shift();
    assert(f, 'loop 应已自续订（rafQueue 有帧）');
    f(16.7);                                 // 跑一帧（flushAudioQueue 在 try 首行）
    p = g.probe();
    assert(p.audioQueueLen === 0, 'running 后队列应被冲洗清空', p.audioQueueLen);
    assert(rec.oscStarted === base + 2, '两个挂起的种植主音应全部补播', rec.oscStarted);
    assert(rec.bufStarted === 3, '两个种植落地噪声也应补播（预热 1 + 落地 2）', rec.bufStarted);

    // ---- 4) running 后的新音效立即排程（不再入队）----
    g.selectCard(2);                          // 地瓜
    g.clickGrid(2, 2);
    p = g.probe();
    assert(p.audioQueueLen === 0, 'running 状态下音效应立即排程（不入队）', p.audioQueueLen);
    assert(rec.oscStarted === base + 3, '地瓜种植音效应直接发声', rec.oscStarted);
  },
};
