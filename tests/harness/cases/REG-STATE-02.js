/* REG-STATE-02 · setState 打印含 gt 与 wave（regression-plan §3.2）
 * 日志格式：`[PvZ] state <from> → <to>(  (why) )  gt=<n> wave=<n>`
 */
module.exports = {
  id: 'REG-STATE-02',
  name: 'setState 日志含状态流向 + gt + wave',
  seed: 42,
  run({ game: g, assert }) {
    const sb = g.sandbox;
    const logs = [];
    const orig = console.log;
    console.log = function () { logs.push(Array.prototype.slice.call(arguments).join(' ')); };
    try {
      g.startGame();                 // menu → play
      g.tick(3);                     // gt=3, wave 视情况
      sb.setState('menu', 'to-menu');
      sb.setState('play', 'back');
    } finally {
      console.log = orig;
    }
    const joined = logs.join('\n');
    assert(/state (menu|play|end) → (menu|play|end)/.test(joined),
      '日志应含 `state X → Y` 流向', joined);
    assert(/gt=\d/.test(joined), '日志应含 gt 数值', joined);
    assert(/wave=\d/.test(joined), '日志应含 wave 数值', joined);
  },
};
