/* SMOKE-001 · 状态机三态切换（menu → play → end → menu） */
module.exports = {
  id: 'SMOKE-001',
  name: '状态机三态切换 menu→play→end→menu',
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

    // end → menu（走「返回菜单」点击）
    g.click(500, 415);   // 返回按钮 y=390..440
    assert(g.probe().state === 'menu', '点击返回后应为 menu', g.probe().state);
  },
};
