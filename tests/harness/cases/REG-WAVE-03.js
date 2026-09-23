/* REG-WAVE-03 · 大波预警期间不刷怪（regression-plan §3.4）
 * warn.active=true 期间：横幅显示中，wave 不推进、不往 spawnQueue 塞怪；
 *   预警结束（WARN_TOTAL=2s）后由 warn.pending 分支才正式刷怪。
 * 注：regression-plan §3.4 写「预警 4s」，实际常量 WARN_TOTAL=2s（4→3→2 两次缩短），
 *     本用例按实际 2s 实现。
 */
module.exports = {
  id: 'REG-WAVE-03',
  name: '大波预警期间不刷怪（wave/spawnQueue 冻结）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    const lv = g.sandbox.__LEVELS['1-1'];   // T-102 换键：旧 L1 → '1-1'
    const bigIdx = lv.waves.findIndex(w => w.big);
    assert(bigIdx >= 0, 'L1 应存在大波配置');

    g.setWave(bigIdx);
    g.setLastWaveT(-999);           // 最小喘息已满足
    g.tick(0.1);
    let p = g.probe();
    assert(p.warnActive === true, '应进入大波预警（横幅显示中）', p.warnActive);
    assert(p.wave === bigIdx, '预警启动时 wave 不应推进', p.wave);

    // 预警进行中（1.5s < 2s）：不得刷怪
    for (let i = 0; i < 15; i++) g.tick(0.1);
    p = g.probe();
    assert(p.warnActive === true, '1.5s 时预警仍在进行', p.warnActive);
    assert(p.wave === bigIdx, '预警期间 wave 不得推进', [p.wave, bigIdx]);
    assert(p.spawnQueueLen === 0, '预警期间不得往队列塞怪', p.spawnQueueLen);
    assert(p.zombies === 0, '预警期间不得生成僵尸', p.zombies);

    // 推过 2s 预警 → 正式刷怪
    for (let i = 0; i < 15; i++) g.tick(0.1);
    p = g.probe();
    assert(p.warnActive === false, '预警应结束（横幅消失）', p.warnActive);
    assert(p.wave === bigIdx + 1, '预警结束后应刷出大波', [p.wave, bigIdx + 1]);
    assert(p.spawnQueueLen > 0 || p.zombies > 0, '大波应已开始生成', [p.spawnQueueLen, p.zombies]);
  },
};
