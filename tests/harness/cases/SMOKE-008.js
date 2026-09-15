/* SMOKE-008 · 主循环异常隔离（陷阱 #5 对照）
 * loop() 用 try/catch 包整帧：帧内抛异常被吞掉，末尾 requestAnimationFrame(loop)
 * 仍续订，游戏不会卡死。无头断言法：
 *   1. 往 zombies 塞一个 null（updateZombies 里 z.dead 读 null → TypeError）
 *   2. 手动消费一帧（loop）→ 内部抛错被 catch
 *   3. 断言 rafQueue 里仍有下一帧待跑（说明异常被隔离、RAF 已续订）
 * 关键：必须用 harness.step() 真正"跑一帧 loop"，而不是 tick（tick 只走 update 不经过 RAF 续订分支）。
 */
module.exports = {
  id: 'SMOKE-008',
  name: '主循环异常隔离（RAF 仍续订）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    const sb = g.sandbox;

    // 注入异常源：zombies 里塞 null（顶层 let 宿主侧须经 g.sandbox.__zombies 桥接）
    sb.__zombies.push(null);

    // 用 __stepFrame 消费当前 rafQueue 顶并跑一帧 loop（harness 已补挂该探针）。
    // 脚本末尾已注册一帧 requestAnimationFrame(loop)，故初始 rafQueue 有 1 帧。
    assert(g.rafQueue.length >= 1, '初始 rafQueue 应已有一帧待跑（loop 自续订中）', g.rafQueue.length);
    g.__stepFrame();   // 消费顶帧：内部 update 读 null 抛 TypeError，被 loop 的 try/catch 吞掉

    // 异常被隔离后，loop 末尾仍 requestAnimationFrame(loop) → rafQueue 长度不塌
    assert(g.rafQueue.length >= 1,
      '异常帧后 RAF 应仍续订（rafQueue 非 0，否则游戏会卡死）', g.rafQueue.length);
    // 状态不应因该异常跳到 end（end 仅由僵尸进屋/通关触发，null 异常只记 frameErr）
    assert(g.probe().state === 'play', '帧异常被隔离后 state 仍应为 play', g.probe().state);
  },
};
