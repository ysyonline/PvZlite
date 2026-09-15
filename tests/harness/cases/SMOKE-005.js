/* SMOKE-005 · 通关解锁下一关
 * 条件：wave >= totalWaves && !waveActive && spawnQueue.length===0 && zombies.length===0
 */
module.exports = {
  id: 'SMOKE-005',
  name: '通关解锁下一关',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    // 强制走完 5 波 + 清空场上
    g.forceWaves(5);
    g.clearField();
    g.tick(0.1);
    const p = g.probe();
    assert(p.state === 'end', '通关后 state 应为 end', p.state);
    assert(p.won === true, '通关时 won 应为 true', p.won);
    assert(p.wave >= 5, 'wave 应到达 totalWaves=5', p.wave);
    assert(p.unlockedLevel >= 2, '通关后 unlockedLevel 应 >=2', p.unlockedLevel);
  },
};
