/* REG-END-02 · 通关最后一关后无下一关（显示「已通关全部关卡」）（regression-plan §3.9）
 * 断言：won=true && !LEVELS[末位+1]；并以真 loop 帧驱动 drawEnd 的「已通关全部关卡」分支，
 *       监视 console.error 确认 render 层无帧异常。
 * 2026-09-17 V11-08：L3 上线后最后一关由 L2 → L3，断言目标同步平移（原意不变：锁最后一关分支）。
 * 2026-09-18 V12：L4 上线后最后一关由 L3 → L4，断言目标同步平移（原意不变）。
 * 2026-09-19 V13：L5 上线后最后一关由 L4 → L5，断言目标同步平移（原意不变；S1 §3.5-B）。
 * 2026-09-23 v2.0 T-102/Q-15：末位关改锚 '4-10'（40 键体系真正末位，materializeLevels 确定性展开供表）；
 *   LEVELS[6] 边界断言平移为 LEVELS['4-11']===undefined。
 */
module.exports = {
  id: 'REG-END-02',
  name: '通关最后一关后无下一关（render 分支无帧异常）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.setUnlocked('4-10');
    g.setLevel('4-10');
    g.startGame();
    assert(g.probe().levelKey === '4-10', '前置：应处于末位关 4-10（v2 体系最后一关）', g.probe().levelKey);

    g.forceWaves(9);              // '4-10' 由世界 4 模板展开：9 波（同 '4-1' 锚点全长）
    g.clearField();
    g.tick(0.1);

    const p = g.probe();
    assert(p.state === 'end' && p.won === true, '通关最后一关后应 won', [p.state, p.won]);
    assert(p.levelKey === '4-10', 'levelKey 应保持 4-10', p.levelKey);
    assert(g.sandbox.__LEVELS['4-11'] === undefined, '最后一关之后应无下一关（LEVELS["4-11"] 未定义）');

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
