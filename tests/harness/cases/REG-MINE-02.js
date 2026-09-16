/* REG-MINE-02 · 武装后引爆 + 伤害范围契约（regression-plan §3.8）
 * explodeMine：
 *   sameCell = 同排 && dx < CELL_W*0.6(54)
 *   nearCell = dx < CELL_W*0.5(45) && dy < CELL_H*0.9(93.6)
 * 结论（以代码为准）：
 *   - 同格 / 同排 dx<54 的僵尸被秒杀；
 *   - 同排 dx=80 不受影响；
 *   - 相邻行（dy=CELL_H=104 > 93.6）不受影响 —— 注：regression-plan §3.8「邻近行 0.9 格内伤害」
 *     与代码注释「轻微波及相邻行」均不成立（nearCell 在跨行时恒 false），此处锁定实际契约。
 */
module.exports = {
  id: 'REG-MINE-02',
  name: '地瓜引爆 + 同排范围伤害契约',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.setSun(9999);
    g.selectCard(2);
    g.clickGrid(1, 2);
    assert(g.probe().plants === 1, '前置：地瓜已种下', g.probe().plantsArr);

    const pos = g.sandbox.gridToPos(1, 2);
    const mk = (row, x) => ({
      type: 'normal', row, hp: 180, maxHp: 180, spd: 0, x,
      eating: false, eatAnim: 0, walk: 0, dead: false,
    });
    g.sandbox.__zombies.push(mk(2, pos.x));        // A 同格（dx=0）
    g.sandbox.__zombies.push(mk(2, pos.x + 40));   // B 同排 dx=40 <54 → 秒杀
    g.sandbox.__zombies.push(mk(2, pos.x + 80));   // C 同排 dx=80 → 不受影响
    g.sandbox.__zombies.push(mk(1, pos.x));        // D 相邻行 → 不受影响

    // 直接结束武装期 → 下一帧引爆
    g.sandbox.__plants[0].armT = 0;
    g.tick(0.1);

    const p = g.probe();
    assert(p.plants === 0, '地瓜应已引爆消失', p.plantsArr);
    // 按行区分（A 与 D 的 x 相同）：第 2 排只应剩 C（dx=80 不受影响）
    const row2 = p.zombiesArr.filter(z => z.row === 2);
    assert(row2.length === 1 && row2[0].x === pos.x + 80,
      'A（同格）/B（同排 dx=40）应被秒杀，仅 C（dx=80）存活', row2);
    assert(row2[0].hp === 180, 'C（同排 dx=80）不应受伤', row2[0]);
    const d = p.zombiesArr.find(z => z.row === 1);
    assert(d && d.hp === 180, 'D（相邻行）不应受伤（nearCell 跨行恒 false）', d);
    assert(p.score >= 100, '击杀 A/B 应结算 2*50 分', p.score);
  },
};
