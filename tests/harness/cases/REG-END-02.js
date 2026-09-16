/* REG-END-02 · 通关 L2 后无下一关（显示「已通关全部关卡」）（regression-plan §3.9）
 * 断言：won=true && !LEVELS[levelNo+1]；并以真 loop 帧驱动 drawEnd 的「已通关全部关卡」分支，
 *       监视 console.error 确认 render 层无帧异常。
 */
module.exports = {
  id: 'REG-END-02',
  name: '通关 L2 后无下一关（render 分支无帧异常）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.setUnlocked(2);
    g.setLevel(2);
    g.startGame();
    assert(g.probe().levelNo === 2, '前置：应处于第二关', g.probe().levelNo);

    g.forceWaves(6);              // L2 totalWaves=6
    g.clearField();
    g.tick(0.1);

    const p = g.probe();
    assert(p.state === 'end' && p.won === true, '通关 L2 后应 won', [p.state, p.won]);
    assert(p.levelNo === 2, 'levelNo 应保持 2', p.levelNo);
    assert(g.sandbox.__LEVELS[3] === undefined, 'L2 之后应无下一关（LEVELS[3] 未定义）');

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
