/* REG-SUN-02 · 阳光点击半径 30px（regression-plan §3.7）
 * onClick 收集判定：dx*dx+dy*dy < 900（半径 30px，严格小于）。
 */
module.exports = {
  id: 'REG-SUN-02',
  name: '阳光点击收集半径 30px（严格 <900）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.setSunFallT(9999);

    // ---- 半径内（dx=20,dy=15 → 625<900）→ 收集 ----
    g.sandbox.__effects.push({
      kind: 'sun', x: 300, y: 300, value: 25, fall: 22, t: 0, stayT: 0, targetY: 300, dead: false,
    });
    const s0 = g.probe().sun;
    g.clickAt(320, 315);
    let p = g.probe();
    assert(p.sun === s0 + 25, '半径内点击应 +25 阳光', [s0, p.sun]);
    const collected = p.effectsArr.find(e => e.kind === 'sun');
    assert(collected && collected.dead === true, '被收集的阳光应标记 dead', collected);

    // ---- 半径外（dx=40 → 1600>900）→ 不收集 ----
    g.sandbox.__effects.push({
      kind: 'sun', x: 500, y: 300, value: 25, fall: 22, t: 0, stayT: 0, targetY: 300, dead: false,
    });
    const s1 = g.probe().sun;
    g.clickAt(540, 300);
    assert(g.probe().sun === s1, '半径外点击不得收集', [s1, g.probe().sun]);

    // ---- 恰好 30px（dx=30 → 900 不 <900）→ 不收集 ----
    g.clickAt(530, 300);   // 距 x=500 的太阳 dx=30
    assert(g.probe().sun === s1, '恰 30px 边界不得收集（严格 <900）', [s1, g.probe().sun]);

    // ---- 29px（dx=29 → 841<900）→ 收集 ----
    g.clickAt(529, 300);
    assert(g.probe().sun === s1 + 25, '29px 内应收集', [s1, g.probe().sun]);
  },
};
