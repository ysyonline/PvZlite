/* SMOKE-003 · 阳光不足以种卡（sun >= c.cost 的 else 分支 → SFX.deny） */
module.exports = {
  id: 'SMOKE-003',
  name: '阳光不足以种卡',
  seed: 11,
  run({ game: g, assert }) {
    g.startGame();
    // 把 sun 压到 50，低于豌豆 cost=100
    g.setSun(50);
    const beforePlants = g.probe().plants;
    const beforeSun = g.probe().sun;

    g.selectCard(1);          // 豌豆
    g.clickGrid(0, 0);

    assert(g.probe().plants === beforePlants, '阳光不足时不应新增 plant', g.probe().plants);
    assert(g.probe().sun === beforeSun, '阳光不足时 sun 不应被消耗', g.probe().sun);
    // SFX.deny 走 try/catch 静默（无头），但种植被拒是核心断言。
    // 若 T1 audio 总线落地（AudioBus.deny 计数），可在此加 SFX.deny 计数断言 —— 现状不依赖。
  },
};
