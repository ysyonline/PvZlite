/* REG-END-02 · 通关最后一关后无下一关（显示「已通关全部关卡」）（regression-plan §3.9）
 * 断言：won=true && !LEVELS[levelNo+1]；并以真 loop 帧驱动 drawEnd 的「已通关全部关卡」分支，
 *       监视 console.error 确认 render 层无帧异常。
 * 2026-09-17 V11-08：L3 上线后最后一关由 L2 → L3，断言目标同步平移（原意不变：锁最后一关分支）。
 * 2026-09-18 V12：L4 上线后最后一关由 L3 → L4，断言目标同步平移（原意不变）。
 */
module.exports = {
  id: 'REG-END-02',
  name: '通关最后一关后无下一关（render 分支无帧异常）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.setUnlocked(4);
    g.setLevel(4);
    g.startGame();
    assert(g.probe().levelNo === 4, '前置：应处于第四关（当前最后一关）', g.probe().levelNo);

    g.forceWaves(8);              // L4 totalWaves=8
    g.clearField();
    g.tick(0.1);

    const p = g.probe();
    assert(p.state === 'end' && p.won === true, '通关最后一关后应 won', [p.state, p.won]);
    assert(p.levelNo === 4, 'levelNo 应保持 4', p.levelNo);
    assert(g.sandbox.__LEVELS[5] === undefined, '最后一关之后应无下一关（LEVELS[5] 未定义）');

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
