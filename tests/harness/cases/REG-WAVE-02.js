/* REG-WAVE-02 · 后续波次间隔 16s（regression-plan §3.4）
 * 中间波（非首波、非最后两波）minGap=16：场上清空后须等够 16s 才开下一波。
 * 取 L1（totalWaves=5）：wave=2 时 minGap=16（wave>=totalWaves-2=3 才是 20）。
 */
module.exports = {
  id: 'REG-WAVE-02',
  name: '后续波次最小喘息 16s',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.setWave(2);
    g.setLastWaveT(0);
    g.clearField();                 // 场上清空 + 队列空 + waveActive=false

    for (let i = 0; i < 158; i++) g.tick(0.1);   // gt=15.8 < 16
    let p = g.probe();
    assert(p.wave === 2, 'gt<16 不得推进波次', [p.wave, p.gt]);
    assert(Math.abs(p.gt - 15.8) < 1e-6, '前置：gt 应 ≈15.8', p.gt);

    for (let i = 0; i < 5; i++) g.tick(0.1);     // gt=16.3 >= 16
    p = g.probe();
    assert(p.wave === 3, 'gt>=16 且清场 → 推进到下一波', [p.wave, p.gt]);
  },
};
