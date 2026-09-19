/* REG-PULT-02 · 弹道分支隔离：cabbage 受重力 / pea·melon y 恒定（V13 · S1 §3.3）
 * 目的：锁「直线弹零影响」生命线——保老 REG（REG-PLANT-02/04、REG-ZOM-03、SMOKE-010/020）免疫的物理前提。
 *   ① cabbage 弹（vy=-100, g=500）经 0.1s 后 y 必须变化（重力分支生效）。
 *   ② pea 弹经 0.1s 后 y 必须恒定（<1e-9；直线弹无 vy/g 字段，不可被无条件积分污染成 NaN）。
 *   ③ melon 弹同理恒定。
 * 直接注入弹体（隔离弹道逻辑），probe().projectilesArr 深快照读 y。
 */
module.exports = {
  id: 'REG-PULT-02',
  name: '弹道分支隔离：cabbage 重力生效 / 直线弹 y 恒定',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    const K = g.sandbox.__consts, R = 2;
    const zy = K.GRID_Y + R * K.CELL_H + K.CELL_H / 2;

    // —— ① cabbage：y 应随重力变化 ——
    g.sandbox.__projectiles.push({ x: 100, y: zy, vx: 260, vy: -100, g: 500, dmg: 40, row: R, type: 'cabbage', splash: 0, dead: false });
    const yc0 = g.probe().projectilesArr.find(p => p.type === 'cabbage').y;
    g.tick(0.1);
    const yc1 = g.probe().projectilesArr.find(p => p.type === 'cabbage');
    assert(yc1 && Math.abs(yc1.y - yc0) > 1e-6, '① cabbage 弹 y 应随重力变化（vy/g 生效）', yc1 && yc1.y);
    // 清场隔离（下组注入不受残留弹干扰）
    g.sandbox.__projectiles.splice(0, g.sandbox.__projectiles.length);

    // —— ② pea：y 恒定（直线弹零影响生命线）——
    g.sandbox.__projectiles.push({ x: 100, y: zy, vx: 340, dmg: 20, row: R, type: 'pea', splash: 0, dead: false });
    const yp0 = g.probe().projectilesArr.find(p => p.type === 'pea').y;
    g.tick(0.1);
    const yp1 = g.probe().projectilesArr.find(p => p.type === 'pea');
    assert(yp1 && Math.abs(yp1.y - yp0) < 1e-9, '② pea 弹 y 应恒定（直线弹零影响生命线）', yp1 && yp1.y);
    g.sandbox.__projectiles.splice(0, g.sandbox.__projectiles.length);

    // —— ③ melon：同样恒定 ——
    g.sandbox.__projectiles.push({ x: 100, y: zy, vx: 220, dmg: 65, row: R, type: 'melon', splash: 55, dead: false });
    const ym0 = g.probe().projectilesArr.find(p => p.type === 'melon').y;
    g.tick(0.1);
    const ym1 = g.probe().projectilesArr.find(p => p.type === 'melon');
    assert(ym1 && Math.abs(ym1.y - ym0) < 1e-9, '③ melon 弹 y 应恒定', ym1 && ym1.y);
  },
};
