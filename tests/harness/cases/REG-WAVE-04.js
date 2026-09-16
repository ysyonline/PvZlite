/* REG-WAVE-04 · 预警后同帧 wave++ 且 lastWaveT=gt（regression-plan §3.4）
 * warn.pending 分支：场上清空 → lastWaveT=gt; wave++; newWave(wave)。
 */
module.exports = {
  id: 'REG-WAVE-04',
  name: '预警结束后同帧推进 wave 并刷新 lastWaveT',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    const lv = g.sandbox.__LEVELS[1];
    const bigIdx = lv.waves.findIndex(w => w.big);

    g.setWave(bigIdx);
    g.setLastWaveT(-999);
    g.tick(0.1);
    assert(g.probe().warnActive === true, '应进入大波预警');

    // 跑到 wave 推进那一帧
    let guard = 0;
    while (g.probe().wave === bigIdx && guard < 100) { g.tick(0.1); guard++; }
    const p = g.probe();
    assert(p.wave === bigIdx + 1, '预警结束后 wave 应推进', [p.wave, bigIdx + 1]);
    assert(p.warnActive === false && p.warnPending === false,
      '推进后 warn.active / warn.pending 均应复位', [p.warnActive, p.warnPending]);
    assert(Math.abs(p.lastWaveT - p.gt) < 1e-9,
      '推进同帧 lastWaveT 应精确等于 gt', [p.lastWaveT, p.gt]);
  },
};
