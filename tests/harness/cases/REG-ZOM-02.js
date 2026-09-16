/* REG-ZOM-02 · 僵尸啃食：target.dur -= 65*dt（regression-plan §3.6）
 * 僵尸进入啃食范围（0 < z.x-pos.x < CELL_W*0.4）→ eating=true，坚果 dur 每秒减 65。
 */
module.exports = {
  id: 'REG-ZOM-02',
  name: '僵尸啃食植物：dur -= 65*dt',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    const sb = g.sandbox;
    const col = 2, row = 1;
    sb.__plants.push({
      type: 'nut', col, row, dur: 3000, maxDur: 3000, cd: 0, sunT: 0, armT: 8, _dying: false,
    });
    const pos = sb.gridToPos(col, row);
    sb.__zombies.push({
      type: 'normal', row, hp: 180, maxHp: 180, spd: 0, x: pos.x + 10,
      eating: false, eatAnim: 0, walk: 0, dead: false,
    });

    const dur0 = g.probe().plantsArr.find(p => p.type === 'nut').dur;
    for (let i = 0; i < 10; i++) g.tick(0.1);   // 1s
    const p = g.probe();
    assert(p.zombiesArr[0].eating === true, '僵尸应进入啃食状态', p.zombiesArr[0]);
    const dur1 = p.plantsArr.find(x => x.type === 'nut').dur;
    assert(Math.abs((dur0 - dur1) - 65) < 0.5,
      '坚果 dur 应减少 65*1s=65', [dur0, dur1]);
  },
};
