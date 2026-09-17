/* SMOKE-022 · 音频 P0 三项补齐契约（B1 种植落地 / B2 卡片就绪 / B3 阳光分层）
 * 依据 design/audio-guide.md §B.1（P0 三项，玩家每次交互都会听到）：
 *   B1 种植落地：原只有上滑主音，补一层落地"噗"噪声 → 每次种植应为「1 振荡器 + 1 噪声源」
 *   B2 卡片就绪：cardCD 由 >0 降到 0 的当帧发声（原先卡片由灰转彩完全无声，玩家常错过）
 *   B3 阳光分层：掉落（sunDrop，高频轻柔）与收集（sun，双音叮 + 节流）拆开
 * 断言策略：B1/B3 用可观测 fake 上下文数「振荡器 / 噪声源」；B2/B8 类纯控制流用 __SFX 打桩计数。
 */
function makeCountingCtx() {
  const rec = { oscStarted: 0, bufStarted: 0 };
  const node = () => ({ connect() {}, disconnect() {} });
  const ctx = {
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
  id: 'SMOKE-022',
  name: '音频补齐 P0（B1 种植落地 / B2 卡片就绪 / B3 阳光分层）',
  seed: 42,
  run({ game: g, assert }) {
    const { ctx, rec } = makeCountingCtx();
    g.sandbox.window.AudioContext = function () { return ctx; };
    const sfx = g.sandbox.__SFX;
    assert(sfx && typeof sfx.cardReady === 'function', 'B2 音效应已在 SFX 表定义（cardReady）');
    assert(typeof sfx.sunDrop === 'function', 'B3 音效应已在 SFX 表定义（sunDrop）');

    g.startGame('harness-p0');
    g.setSunFallT(999);                 // 隔离自然阳光掉落，B1/B2 段不被环境音干扰

    // ---------- B1 种植落地：主音 + 落地噪声双层 ----------
    g.setSun(9999);
    const o0 = rec.oscStarted, b0 = rec.bufStarted;
    g.selectCard(0);                    // 向日葵
    g.clickGrid(0, 2);
    assert(g.probe().plants === 1, '前置：向日葵已种下', g.probe().plants);
    assert(rec.oscStarted === o0 + 1, 'B1 种植主音应发声（1 个振荡器）', [o0, rec.oscStarted]);
    assert(rec.bufStarted === b0 + 1, 'B1 种植落地噪声应发声（1 个噪声源，原实现缺失）', [b0, rec.bufStarted]);

    // ---------- B2 卡片冷却就绪：归零当帧恰好报一次 ----------
    const origReady = sfx.cardReady;
    let ready = [];
    sfx.cardReady = function (t) { ready.push(t); };
    try {
      // 向日葵 cd=5s。推进 6.5s：冷却应在 5s 处归零并报一次
      for (let i = 0; i < 130; i++) g.tick(0.05);
      assert(ready.length === 1, 'B2 卡片冷却结束应恰好报一次就绪（不能每帧重复响）', ready);
      assert(ready[0] === 'sunflower', 'B2 就绪应带卡片类型（供每卡独立节流）', ready[0]);
      assert(g.probe().cardCD.sunflower === 0, '前置：冷却确已归零', g.probe().cardCD.sunflower);
      // 归零后继续推进：不得重复报（转点判定，不是「<=0 就响」）
      for (let i = 0; i < 40; i++) g.tick(0.05);
      assert(ready.length === 1, 'B2 冷却归零后不得持续重复报就绪', ready.length);
    } finally {
      sfx.cardReady = origReady;
    }

    // ---------- B3 阳光掉落：自然掉落 + 向日葵产阳光，两条路径都应发声 ----------
    const origDrop = sfx.sunDrop;
    let drop = 0;
    sfx.sunDrop = function () { drop++; };
    try {
      g.setSunFallT(0.01);              // 路径 1：自然掉落
      g.tick(0.05);
      assert(drop === 1, 'B3 自然阳光掉落应发提示音（checkWave 路径）', drop);

      g.setSunFallT(999);               // 抑制自然掉落，隔离出向日葵路径
      const beforePlants = g.probe().plants;
      g.selectCard(0);
      g.clickGrid(5, 4);
      assert(g.probe().plants === beforePlants + 1, '前置：第二棵向日葵已种下', g.probe().plants);
      for (let i = 0; i < 160; i++) g.tick(0.05);   // 8s > 向日葵 7s 产阳光周期
      assert(drop === 2, 'B3 向日葵产阳光也应发提示音（updatePlant 路径）', drop);
    } finally {
      sfx.sunDrop = origDrop;
    }

    // ---------- B3 阳光收集：收集发声 + 收集音节流 ----------
    const suns = g.probe().effectsArr.filter(e => e.kind === 'sun' && !e.dead);
    assert(suns.length > 0, '前置：场上应有可收集阳光', suns.length);
    const beforeSun = g.probe().sun;
    g.clickAt(suns[0].x, suns[0].y);
    assert(g.probe().sun === beforeSun + 25, '前置：点击应收集 +25 阳光', [beforeSun, g.probe().sun]);

    g.tick(0.2);                        // 越过收集音的 0.08s 节流窗口（上面点击已设置 gate）
    const o1 = rec.oscStarted;
    sfx.sun(); sfx.sun();               // 同帧连点两次：收集音为双音（2 振荡器），第二次应被 gate 节流
    assert(rec.oscStarted === o1 + 2, 'B3 收集音应为双音且第二次被节流（gate sunCollect）', [o1, rec.oscStarted]);
  },
};
