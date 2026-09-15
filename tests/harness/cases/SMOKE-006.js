/* SMOKE-006 · 卡片 vs 植物冷却分离（陷阱 #2 对照）
 * cardCD.pea 与 p.cd 是两个东西，随时间独立递减。
 */
module.exports = {
  id: 'SMOKE-006',
  name: '卡片冷却 vs 植物冷却分离',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    // 种 1 棵豌豆（未攻击 → p.cd≈0，cardCD.pea=5）
    g.selectCard(1);
    g.clickGrid(0, 0);
    const p = g.probe();
    const peaPlant = p.plantsArr.find(x => x.type === 'pea');
    assert(peaPlant, '场上应有豌豆', p.plantsArr);
    assert(peaPlant.cd <= 0, '未攻击时 p.cd 应 ≈0（陷阱 #2 对照）', peaPlant);
    assert(p.cardCD.pea > 0, 'cardCD.pea 应为 5s', p.cardCD);

    // 两者随时间独立递减：tick 1s 后 p.cd 仍 ≈0（无僵尸未开火），cardCD.pea 减少 1s
    g.tick(1);
    const p2 = g.probe();
    const peaPlant2 = p2.plantsArr.find(x => x.type === 'pea');
    assert(peaPlant2.cd <= 0, '无僵尸未开火时 p.cd 仍应 ≈0', peaPlant2);
    assert(p2.cardCD.pea > 0 && p2.cardCD.pea < p.cardCD.pea,
      'cardCD.pea 应独立递减（5→<5）', [p.cardCD.pea, p2.cardCD.pea]);
  },
};
