/* REG-SUN-02 · 阳光点击半径 40px（regression-plan §3.7）
 * onClick 收集判定：dx*dx+dy*dy < 1600（半径 40px，严格小于）。
 * 半径 30→40（v1.3 真机反馈：阳光视觉最大 26px，30px 判定贴边难点击）。
 */
module.exports = {
  id: 'REG-SUN-02',
  name: '阳光点击收集半径 40px（严格 <1600）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.setSunFallT(9999);

    // ---- 半径内（dx=20,dy=15 → 625<1600）→ 收集 ----
    g.sandbox.__effects.push({
      kind: 'sun', x: 300, y: 300, value: 25, fall: 22, t: 0, stayT: 0, targetY: 300, dead: false,
    });
    const s0 = g.probe().sun;
    g.clickAt(320, 315);
    let p = g.probe();
    assert(p.sun === s0 + 25, '半径内点击应 +25 阳光', [s0, p.sun]);
    const collected = p.effectsArr.find(e => e.kind === 'sun');
    assert(collected && collected.dead === true, '被收集的阳光应标记 dead', collected);

    // ---- 半径外（dx=45 → 2025>1600）→ 不收集 ----
    g.sandbox.__effects.push({
      kind: 'sun', x: 500, y: 300, value: 25, fall: 22, t: 0, stayT: 0, targetY: 300, dead: false,
    });
    const s1 = g.probe().sun;
    g.clickAt(545, 300);
    assert(g.probe().sun === s1, '半径外点击不得收集', [s1, g.probe().sun]);

    // ---- 恰好 40px（dx=40 → 1600 不 <1600）→ 不收集 ----
    g.clickAt(540, 300);   // 距 x=500 的太阳 dx=40
    assert(g.probe().sun === s1, '恰 40px 边界不得收集（严格 <1600）', [s1, g.probe().sun]);

    // ---- 39px（dx=39 → 1521<1600）→ 收集 ----
    g.clickAt(539, 300);
    assert(g.probe().sun === s1 + 25, '39px 内应收集', [s1, g.probe().sun]);
  },
};
