/* SMOKE-002 · 卡片冷却递减（update() 里 cardCD[type] 递减） */
module.exports = {
  id: 'SMOKE-002',
  name: '卡片冷却递减',
  seed: 7,
  run({ game: g, assert }) {
    g.startGame();
    // 种 1 次豌豆 → cardCD.pea 应 > 0
    g.selectCard(1);
    g.clickGrid(0, 0);
    assert(g.probe().cardCD.pea > 0, '种豌豆后 cardCD.pea 应 > 0', g.probe().cardCD);

    // 立即再次尝试种 → 冷却中拒绝（plants 不增、sun 不耗）
    const beforePlants = g.probe().plants;
    const beforeSun = g.probe().sun;
    g.selectCard(1);
    g.clickGrid(1, 0);
    assert(g.probe().plants === beforePlants, '冷却中第 2 次种被拒绝', g.probe().plants);
    assert(g.probe().sun === beforeSun, '冷却中 sun 未消耗', g.probe().sun);

    // tick 5.1s（cd=5）→ cardCD.pea 归零
    g.tick(5.1);
    assert(g.probe().cardCD.pea <= 0, '5.1s 后 cardCD.pea 应归零', g.probe().cardCD.pea);

    // 冷却结束后补 sun 再种成功
    g.setSun(200);
    g.selectCard(1);
    g.clickGrid(1, 0);
    assert(g.probe().plants === beforePlants + 1, '冷却结束后可再种', g.probe().plants);
  },
};
