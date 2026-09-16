/* REG-MINE-01 · 地瓜 8s 武装期内踩过不爆（regression-plan §3.8）
 * level.armTime=8：armT>0 期间 updatePlant 只递减 armT，不触发 boom；
 *   僵尸踩在地瓜格上也不得受伤。
 */
module.exports = {
  id: 'REG-MINE-01',
  name: '地瓜武装期内(8s)踩过不爆',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.setSun(9999);
    g.selectCard(2);                 // 地瓜 cost25
    g.clickGrid(1, 2);

    let p = g.probe();
    assert(p.plants === 1 && p.plantsArr[0].type === 'mine', '前置：地瓜已种下', p.plantsArr);
    assert(Math.abs(p.plantsArr[0].armT - 8) < 1e-6, '地瓜初始 armT 应为 8s', p.plantsArr[0].armT);

    // 僵尸踩到地瓜格（武装期内）
    const pos = g.sandbox.gridToPos(1, 2);
    g.sandbox.__zombies.push({
      type: 'normal', row: 2, hp: 180, maxHp: 180, spd: 0, x: pos.x,
      eating: false, eatAnim: 0, walk: 0, dead: false,
    });

    for (let i = 0; i < 40; i++) g.tick(0.1);   // 4s（<8s 武装期）
    p = g.probe();
    assert(p.plants === 1, '武装期内踩过不得引爆（地瓜仍在）', p.plantsArr);
    assert(p.zombiesArr[0].hp === 180, '武装期内僵尸不得受伤', p.zombiesArr[0].hp);

    // 走完武装期 → 引爆
    for (let i = 0; i < 50; i++) g.tick(0.1);   // 累计 9s
    p = g.probe();
    assert(p.plants === 0, '武装期结束后应引爆（地瓜消失）', p.plantsArr);
    assert(p.zombies === 0, '引爆应秒杀本格僵尸', p.zombiesArr);
  },
};
