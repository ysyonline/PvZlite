/* REG-CARD-01 · 6 种植物全部可种（regression-plan §3.3）
 * 每张卡走真实种植流程（选卡 → 点空格），植物数逐一 +1。
 */
module.exports = {
  id: 'REG-CARD-01',
  name: '6 种植物全部可种',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.setSun(9999);
    const types = ['sunflower', 'pea', 'mine', 'nut', 'double', 'melon'];

    for (let i = 0; i < types.length; i++) {
      g.selectCard(i);
      g.clickGrid(i, 0);              // 不同列，互不占用
      const p = g.probe();
      assert(p.plants === i + 1,
        `第 ${i + 1} 张卡(${types[i]})应种下`, p.plantsArr.map(x => x.type));
    }
    const got = g.probe().plantsArr.map(x => x.type);
    assert(got.join(',') === types.join(','), '6 种植物应全部种下且顺序正确', got);
  },
};
