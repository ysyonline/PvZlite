/* REG-CARD-04 · 铲除后 plant 数组正确减少（regression-plan §3.3）
 * 铲子选中 + 点同格 → plants.length -1，清空选中，SFX.shovel 被调用。
 */
module.exports = {
  id: 'REG-CARD-04',
  name: '铲除后植物数正确减少（清选中 + SFX.shovel）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.setSun(9999);
    g.selectCard(0);
    g.clickGrid(2, 2);
    assert(g.probe().plants === 1, '前置：种下向日葵', g.probe().plants);

    const sfx = g.sandbox.__SFX;
    let shovel = 0;
    const orig = sfx.shovel;
    sfx.shovel = function () { shovel++; };
    try {
      g.selectShovel();
      assert(g.probe().selected && g.probe().selected.shovel, '前置：已选中铲子');
      g.clickGrid(2, 2);
      const p = g.probe();
      assert(p.plants === 0, '铲除后植物数应为 1-1=0', p.plantsArr);
      assert(p.selected === null, '铲除后应清空选中', p.selected);
      assert(shovel === 1, 'SFX.shovel 应被调用一次', shovel);
    } finally {
      sfx.shovel = orig;
    }
  },
};
