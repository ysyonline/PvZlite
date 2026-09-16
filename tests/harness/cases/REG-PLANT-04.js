/* REG-PLANT-04 · 西瓜溅射 55 半径 / 55% 伤害（regression-plan §3.5）
 * updateProjectiles：主目标命中扣满伤害；同排其它僵尸若 |z2.x-pr.x|<splash 则扣 dmg*0.55。
 * 直接注入一颗西瓜子弹（x=350, vx=220, dmg=65, splash=55），两个静止僵尸：
 *   主目标 x=400，副目标 x=410（命中瞬间 |410-358.x|<55 → 被溅射）。
 * 期望：主 -65，副 -35.75。
 */
module.exports = {
  id: 'REG-PLANT-04',
  name: '西瓜溅射 55 半径 / 55% 伤害',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    const K = g.sandbox.__consts;
    const cellY = K.GRID_Y + 0 * K.CELL_H + K.CELL_H / 2;

    const mk = (x) => ({
      type: 'normal', row: 0, hp: 180, maxHp: 180, spd: 0, x,
      eating: false, eatAnim: 0, walk: 0, dead: false,
    });
    g.sandbox.__zombies.push(mk(400));   // 主目标（先入数组）
    g.sandbox.__zombies.push(mk(410));   // 副目标
    g.sandbox.__projectiles.push({
      x: 350, y: cellY, vx: 220, dmg: 65, row: 0, type: 'melon', splash: 55, dead: false,
    });

    let guard = 0;
    while (g.probe().projectiles > 0 && guard < 300) { g.tick(0.01); guard++; }
    assert(g.probe().projectiles === 0, '西瓜子弹应已命中并清除', guard);

    const zs = g.probe().zombiesArr;
    const primary = zs.find(z => z.x === 400);
    const splash = zs.find(z => z.x === 410);
    assert(primary && Math.abs(primary.hp - (180 - 65)) < 1e-6,
      '主目标应扣满 65', primary && primary.hp);
    assert(splash && Math.abs(splash.hp - (180 - 65 * 0.55)) < 1e-6,
      '副目标应扣 65*0.55=35.75', splash && splash.hp);
  },
};
