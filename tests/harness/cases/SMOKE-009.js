/* SMOKE-009 · gt 时钟外置（陷阱 #1 对照）
 * 关键不变式：`gt` 只在 loop() 的 play 分支里累加（gt += dt*gameSpeed），
 * 绝不在 update(dt) 内部累加。
 * 无头断言法：
 *   A. 直接调 update(1)（通过 harness 暴露的 __update）→ gt 应不变
 *   B. 走 __api.tick(1)（复刻 loop 的 gt+=dt; update(dt)）→ gt 应 +1
 */
module.exports = {
  id: 'SMOKE-009',
  name: 'gt 时钟外置（update 不动 gt）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    const sb = g.sandbox;
    const gtAfterStart = g.probe().gt;

    // A. 直接调 update —— 若 update 内部偷偷累加 gt，这里就会变。
    // 用 harness 补挂的 __updateRaw（直接调游戏顶层 update，不经过 loop 的 gt+=dt）。
    const gtBeforeUpdate = g.probe().gt;
    g.__updateRaw(1);
    const gtAfterUpdate = g.probe().gt;
    assert(gtAfterUpdate === gtBeforeUpdate,
      '直接调 update(dt) 不应改动 gt（陷阱 #1）',
      [gtBeforeUpdate, gtAfterUpdate]);

    // B. tick(1) 复刻 loop：gt += 1; update(1) → gt 应 +1
    const gtBeforeTick = g.probe().gt;
    g.tick(1);
    const gtAfterTick = g.probe().gt;
    assert(gtAfterTick - gtBeforeTick === 1,
      'tick(1) 应让 gt 精确 +1（外置时钟）',
      [gtBeforeTick, gtAfterTick]);

    // 一致性：A 段没动 gt、B 段 +1，累计差应为 1
    assert(gtAfterTick - gtAfterStart === 1,
      '累计 gt 增量应为 1（仅 tick 贡献）',
      [gtAfterStart, gtAfterTick]);
  },
};
