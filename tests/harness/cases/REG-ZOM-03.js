/* REG-ZOM-03 · 僵尸死亡只结算一次分数（regression-plan §3.6）
 * killZombie 置 z.dead=true 并加分；调用点用 `if(z.hp<=0&&!z.dead)` 守卫，重复触发不得二次加分。
 */
module.exports = {
  id: 'REG-ZOM-03',
  name: '僵尸死亡只结算一次分数',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    const K = g.sandbox.__consts;
    const cellY = K.GRID_Y + 0 * K.CELL_H + K.CELL_H / 2;

    // 一颗豌豆（dmg20）击杀 hp=20 的普通僵尸 → 恰好 +50
    g.sandbox.__zombies.push({
      type: 'normal', row: 0, hp: 20, maxHp: 20, spd: 0, x: 300,
      eating: false, eatAnim: 0, walk: 0, dead: false,
    });
    g.sandbox.__projectiles.push({
      x: 250, y: cellY, vx: 340, dmg: 20, row: 0, type: 'pea', splash: 0, dead: false,
    });

    const s0 = g.probe().score;
    let guard = 0;
    while (g.probe().zombies > 0 && guard < 200) { g.tick(0.02); guard++; }
    let p = g.probe();
    assert(p.zombies === 0, '僵尸应被击杀并离场', p.zombiesArr);
    assert(p.score - s0 === 50, '击杀 1 只普通僵尸应恰好 +50', p.score - s0);

    // 已死僵尸（dead=true）再跑一帧：不得二次加分
    g.sandbox.__zombies.push({
      type: 'normal', row: 0, hp: 0, maxHp: 20, spd: 0, x: 300,
      eating: false, eatAnim: 0, walk: 0, dead: true,
    });
    const s1 = g.probe().score;
    g.tick(0.05);
    assert(g.probe().score === s1, 'dead=true 的僵尸不得二次结算分数', [s1, g.probe().score]);
  },
};
