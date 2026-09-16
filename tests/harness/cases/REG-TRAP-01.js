/* REG-TRAP-01 · 陷阱 #1：gt 时钟外置（回归 · regression-plan §3.1）
 * 不变式：`gt` 只在 loop() 的 play 分支累加（gt += dt*gameSpeed），绝不在 update(dt) 内累加。
 * 断言：直接 update(1) 不动 gt；tick(1) 精确 +1。
 */
module.exports = {
  id: 'REG-TRAP-01',
  name: '陷阱#1 · gt 时钟外置',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    const gt0 = g.probe().gt;
    g.__updateRaw(1);
    assert(g.probe().gt === gt0, '直接 update(1) 不得改动 gt（陷阱 #1）', [gt0, g.probe().gt]);
    g.tick(1);
    assert(g.probe().gt - gt0 === 1, 'tick(1) 应让 gt 精确 +1', [gt0, g.probe().gt]);
  },
};
