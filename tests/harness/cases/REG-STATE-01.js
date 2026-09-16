/* REG-STATE-01 · setState 幂等（同一 state 不重复 log）（regression-plan §3.2）
 * setState(s): if(s===state)return; —— 重复设同一状态不得重复打印。
 */
module.exports = {
  id: 'REG-STATE-01',
  name: 'setState 幂等（同 state 不重复打印）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();                 // menu → play
    const sb = g.sandbox;
    assert(g.probe().state === 'play');

    const logs = [];
    const orig = console.log;
    console.log = function () { logs.push(Array.prototype.slice.call(arguments).join(' ')); };
    try {
      // 证明捕获有效：真实切换必须打印 1 条
      sb.setState('menu', 'probe-transition');
      const afterReal = logs.length;
      assert(afterReal === 1, '真实状态切换应打印 1 条日志（捕获有效性前置）', logs);

      // 幂等：重复设同一 state 不得再打印
      sb.setState('menu', 'again-1');
      sb.setState('menu', 'again-2');
      assert(logs.length === afterReal, '重复 setState 同 state 不得重复打印', logs);
    } finally {
      console.log = orig;
    }
  },
};
