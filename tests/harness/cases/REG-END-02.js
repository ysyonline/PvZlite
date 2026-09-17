/* REG-END-02 · 通关最后一关后无下一关（显示「已通关全部关卡」）（regression-plan §3.9）
 * 断言：won=true && !LEVELS[levelNo+1]；并以真 loop 帧驱动 drawEnd 的「已通关全部关卡」分支，
 *       监视 console.error 确认 render 层无帧异常。
 * 2026-09-17 V11-08：L3 上线后最后一关由 L2 → L3，断言目标同步平移（原意不变：锁最后一关分支）。
 */
module.exports = {
  id: 'REG-END-02',
  name: '通关最后一关后无下一关（render 分支无帧异常）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.setUnlocked(3);
    g.setLevel(3);
    g.startGame();
    assert(g.probe().levelNo === 3, '前置：应处于第三关（当前最后一关）', g.probe().levelNo);

    g.forceWaves(7);              // L3 totalWaves=7
    g.clearField();
    g.tick(0.1);

    const p = g.probe();
    assert(p.state === 'end' && p.won === true, '通关最后一关后应 won', [p.state, p.won]);
    assert(p.levelNo === 3, 'levelNo 应保持 3', p.levelNo);
    assert(g.sandbox.__LEVELS[4] === undefined, '最后一关之后应无下一关（LEVELS[4] 未定义）');

    // 真 loop 帧执行 drawEnd（含「已通关全部关卡」分支）→ 不得抛帧异常
    const errs = [];
    const orig = console.error;
    console.error = function () { errs.push(Array.prototype.slice.call(arguments).map(String).join(' ')); };
    try {
      const f = g.rafQueue.shift();
      assert(f, 'rafQueue 应有待跑帧');
      f(16.7);
    } finally {
      console.error = orig;
    }
    assert(errs.length === 0, 'drawEnd 渲染不得抛帧异常', errs);
  },
};
