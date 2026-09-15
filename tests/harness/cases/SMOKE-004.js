/* SMOKE-004 · 僵尸进屋 → 游戏结束（z.x < GRID_X-40） */
module.exports = {
  id: 'SMOKE-004',
  name: '僵尸进屋触发游戏结束',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    // 强推一只僵尸到屋前（x=GRID_X-40）
    g.forceZombieHome('normal');
    g.tick(0.1);
    const p = g.probe();
    assert(p.state === 'end', '僵尸进屋后 state 应为 end', p.state);
    assert(p.won === false, '失败时 won 应为 false', p.won);
    assert(p.zombies >= 1, '进屋僵尸应仍在场上（未立即清理）', p.zombies);
  },
};
