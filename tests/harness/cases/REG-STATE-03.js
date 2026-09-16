/* REG-STATE-03 · requestExit 二次确认（regression-plan §3.2）
 * 规则：state==='play' && gt>=1.5 时首次触发 → exitArm=3 且仍 play；再次触发 → 返回 menu。
 *       gt<1.5（开局误触）→ 直接返回 menu。
 */
module.exports = {
  id: 'REG-STATE-03',
  name: 'requestExit 二次确认（首触发待命，二次确认返回）',
  seed: 42,
  run({ game: g, assert }) {
    const sb = g.sandbox;

    // ---- A. gt<1.5：直接返回菜单（防开局误触）----
    g.startGame();
    assert(g.probe().gt < 1.5, '开局 gt 应 <1.5');
    sb.requestExit('测试误触');
    assert(g.probe().state === 'menu', 'gt<1.5 触发应直接返回菜单', g.probe().state);
    assert(g.probe().exitArm === 0, '直接返回时 exitArm 应清零');

    // ---- B. gt>=1.5：二次确认 ----
    g.startGame();
    g.tick(2);                         // gt=2
    let p = g.probe();
    assert(p.state === 'play' && p.gt >= 1.5, '前置：gt>=1.5 且在 play', [p.state, p.gt]);

    sb.requestExit('R 键');
    p = g.probe();
    assert(p.state === 'play', '首次触发应仍为 play（待确认）', p.state);
    assert(p.exitArm === 3, '首次触发应置 exitArm=3', p.exitArm);

    sb.requestExit('R 键');
    p = g.probe();
    assert(p.state === 'menu', '3s 内二次触发应返回 menu', p.state);
    assert(p.exitArm === 0, '确认返回后 exitArm 应清零', p.exitArm);
  },
};
