/* REG-TRAP-03 · 陷阱 #3：for...of 里 splice 安全（标记法清理）（regression-plan §3.1）
 * 3 只僵尸同时把 3 棵坚果啃到死：plants 应无残留、无 _dying 遗留、迭代不错乱。
 */
module.exports = {
  id: 'REG-TRAP-03',
  name: '陷阱#3 · for...of splice 安全（3 坚果同死）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    const sb = g.sandbox;
    const col = 4;
    for (let r = 0; r < 3; r++) {
      const pos = sb.gridToPos(col, r);
      sb.__plants.push({
        type: 'nut', col, row: r, x: pos.x, y: pos.y,
        dur: 1, maxDur: 3000, cd: 0, sunT: 0, _dying: false,
      });
    }
    assert(g.probe().plants === 3, '应注入 3 棵坚果', g.probe().plants);

    for (let r = 0; r < 3; r++) {
      const pos = sb.gridToPos(col, r);
      g.forceZombieAt('normal', r, pos.x + 10);   // 在啃食范围内
    }
    g.tick(0.05);   // dur=1 → 65*0.05=3.25 > 1 → 归零 → _dying → 清理

    const p = g.probe();
    assert(p.plantsArr.filter(x => x.type === 'nut').length === 0,
      '被啃死的 3 棵坚果应全部移除', p.plantsArr);
    assert(p.plantsArr.filter(x => x._dying).length === 0,
      'plants 不得残留 _dying 项', p.plantsArr);
    assert(p.zombies === 3, '3 只僵尸仍应在场（迭代未错乱）', p.zombies);
  },
};
