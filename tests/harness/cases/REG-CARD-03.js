/* REG-CARD-03 · 卡片冷却中种植被拒（regression-plan §3.3）
 * cardCD[type]>0 时再种被拒；冷却归零后可再种。
 */
module.exports = {
  id: 'REG-CARD-03',
  name: '卡片冷却中种植被拒（归零后可再种）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.setSun(9999);

    g.selectCard(1);                // 豌豆 cd=5
    g.clickGrid(0, 0);
    let p = g.probe();
    assert(p.plants === 1 && p.cardCD.pea > 0, '前置：种下豌豆且进入冷却', p.cardCD);

    // 冷却中再种（换空格）→ 拒绝
    g.setSun(9999);
    g.selectCard(1);
    g.clickGrid(1, 0);
    p = g.probe();
    assert(p.plants === 1, '冷却中不得再种', p.plants);
    assert(p.sun === 9999, '冷却中被拒不得扣阳光', p.sun);

    // 冷却结束 → 可再种
    g.tick(5.1);
    assert(g.probe().cardCD.pea <= 0, '5.1s 后冷却应归零', g.probe().cardCD.pea);
    g.setSun(9999);
    g.selectCard(1);
    g.clickGrid(1, 0);
    assert(g.probe().plants === 2, '冷却结束后应可再种', g.probe().plants);
  },
};
