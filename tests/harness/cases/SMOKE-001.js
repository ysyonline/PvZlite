/* SMOKE-001 · 状态机切换（menu → play → end → select）
 * 2026-09-24 v2.0 T-301 契约迁移：结算「返回选关」目标 menu→select（plan §2.5，
 * 选关页为关卡中枢）；M1 后 menu 态无关卡入口，select 才承接导航（沿 SMOKE-023 B8 先例）。
 */
module.exports = {
  id: 'SMOKE-001',
  name: '状态机切换 menu→play→end→select',
  seed: 42,
  run({ game: g, assert }) {
    const p0 = g.probe();
    assert(p0.state === 'menu', '初始应为 menu', p0.state);

    // menu → play
    g.startGame();
    assert(g.probe().state === 'play', 'startGame 后应为 play', g.probe().state);

    // play → end（强推 1 只僵尸进屋）
    g.forceZombieHome('normal');
    g.tick(0.1);
    const p1 = g.probe();
    assert(p1.state === 'end', '僵尸进屋后应为 end', p1.state);
    assert(p1.won === false, '进屋失败时 won 应为 false', p1.won);

    // end → select（走「返回选关」点击，T-301：目标 menu→select）
    g.click(500, 415);   // 返回按钮 y=390..440
    assert(g.probe().state === 'select', '点击返回后应为 select', g.probe().state);
  },
};
