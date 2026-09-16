/* REG-WAVE-01 · 第一波延迟 12s（regression-plan §3.4）
 * checkWave：wave===0 时 minGap=12。gt<12 → wave=0；gt>=12 且非 waveActive 且场上清空 → wave=1。
 */
module.exports = {
  id: 'REG-WAVE-01',
  name: '第一波延迟 12s（gt<12 不开波）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    let p = g.probe();
    assert(p.wave === 0 && p.gt === 0, '开局 wave=0, gt=0', [p.wave, p.gt]);

    for (let i = 0; i < 119; i++) g.tick(0.1);   // gt≈11.9
    p = g.probe();
    assert(p.wave === 0, 'gt<12 时 wave 必须保持 0', [p.wave, p.gt]);
    assert(p.gt > 11.8 && p.gt < 12, '前置：gt 应逼近 12', p.gt);

    for (let i = 0; i < 3; i++) g.tick(0.1);     // gt≈12.2
    p = g.probe();
    assert(p.wave === 1, 'gt>=12 且场上清空 → 开第 1 波', [p.wave, p.gt]);
  },
};
