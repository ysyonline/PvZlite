/* REG-TRAP-02 · 陷阱 #2：卡片冷却(cardCD) 与植物冷却(p.cd) 分离（regression-plan §3.1）
 * 种下豌豆后：cardCD.pea=5（卡片冷却），p.cd≈0（未攻击时植物自身冷却）。
 * 两者随时间独立递减。
 */
module.exports = {
  id: 'REG-TRAP-02',
  name: '陷阱#2 · 卡片冷却 vs 植物冷却分离',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.selectCard(1);        // 豌豆 cost100 cd5
    g.clickGrid(0, 0);
    let p = g.probe();
    let pea = p.plantsArr.find(x => x.type === 'pea');
    assert(pea, '场上应有豌豆', p.plantsArr);
    assert(pea.cd <= 0, '未攻击时植物 cd 应 ≈0（陷阱 #2 对照）', pea);
    assert(p.cardCD.pea > 0, '种下后 cardCD.pea 应 >0', p.cardCD);

    g.tick(1);
    p = g.probe();
    pea = p.plantsArr.find(x => x.type === 'pea');
    assert(pea.cd <= 0, '无僵尸未开火，植物 cd 仍应 ≈0', pea);
    assert(p.cardCD.pea > 0 && p.cardCD.pea < 5,
      'cardCD.pea 应独立递减（5 → <5）', [5, p.cardCD.pea]);
  },
};
