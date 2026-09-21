/* REG-CHILL-02 · v1.5 S5 icemelon：溅射 55px·55% + 全命中减速（直中+溅及都施加 chill）
 * 手法：REG-PLANT-04 同款子弹注入法（三静止僵尸：主目标 400 / 溅及 410 / 溅射圈外 470）。
 * 期望：主 -65 且 slowT=2.0；副 -35.75 且 slowT=2.0；圈外僵尸不掉血不减速。
 */
module.exports = {
  id: 'REG-CHILL-02',
  name: 'icemelon 溅射+全命中减速（v1.5 S5）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame('icemelon-test');
    const K = g.sandbox.__consts;
    const cellY = K.GRID_Y + 0 * K.CELL_H + K.CELL_H / 2;

    const mk = (x) => {
      const z = { type:'normal', row:0, hp:180, maxHp:180, spd:0, x,
        eating:false, eatAnim:0, walk:0, dead:false };
      g.sandbox.__zombies.push(z);
      return z;
    };
    mk(400); mk(410); mk(470);   // 圈外 470：|470-350.x命中点| ≥ 55 边界外
    g.sandbox.__projectiles.push({
      x: 350, y: cellY, vx: 220, dmg: 65, row: 0, type: 'icemelon', splash: 55, splashRatio: 0.55, chill: true, dead: false,
    });

    let guard = 0;
    while (g.probe().projectiles > 0 && guard < 300) { g.tick(0.01); guard++; }
    assert(g.probe().projectiles === 0, '冰瓜弹应已命中并清除', guard);

    const zs = g.probe().zombiesArr;
    const primary = zs.find(z => z.x === 400);
    const splash = zs.find(z => z.x === 410);
    const outer = zs.find(z => z.x === 470);
    assert(Math.abs(primary.hp - (180 - 65)) < 1e-6, '主目标应扣满 65', primary.hp);
    assert(Math.abs(splash.hp - (180 - 65 * 0.55)) < 1e-6, '溅及目标应扣 65*0.55=35.75', splash.hp);
    assert(Math.abs(outer.hp - 180) < 1e-6, '溅射圈外目标不掉血', outer.hp);
    // 全命中减速：直中+溅及都 slowT≈2.0（区间式：命中后同 tick 已开始递减，不锁帧数）
    const st = (x) => g.sandbox.__zombies.find(z => z.x === x).slowT;
    assert(st(400) > 1.9 && st(400) <= 2.0, '主目标应被减速（slowT≈2.0）', st(400));
    assert(st(410) > 1.9 && st(410) <= 2.0, '溅及目标应被减速（slowT≈2.0）', st(410));
    assert(!outer.slowT, '溅射圈外目标不应被减速', outer.slowT);
  },
};
