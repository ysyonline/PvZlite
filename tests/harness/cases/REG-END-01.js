/* REG-END-01 · 通关解锁下一关（regression-plan §3.9）
 * 清光最后一波 + 队列空 + 场上空 → state=end, won=true, unlockedLevel 递增。
 */
module.exports = {
  id: 'REG-END-01',
  name: '通关 L1 解锁 L2',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.setUnlocked(1);
    g.forceWaves(5);
    g.clearField();
    g.tick(0.1);
    const p = g.probe();
    assert(p.state === 'end', '通关后 state 应为 end', p.state);
    assert(p.won === true, '通关时 won 应为 true', p.won);
    assert(p.wave >= 5, 'wave 应到达 totalWaves=5', p.wave);
    assert(p.unlockedLevel >= 2, '通关 L1 后应解锁 L2', p.unlockedLevel);
  },
};
