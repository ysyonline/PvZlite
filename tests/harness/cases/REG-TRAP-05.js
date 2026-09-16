/* REG-TRAP-05 · 陷阱 #5：RAF 续订在函数末尾（regression-plan §3.1）
 * loop() 整帧 try/catch：帧内抛异常被吞，末尾 requestAnimationFrame(loop) 仍续订 → 不卡死。
 */
module.exports = {
  id: 'REG-TRAP-05',
  name: '陷阱#5 · 帧异常后 RAF 仍续订',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.sandbox.__zombies.push(null);   // updateZombies 读 z.dead → TypeError

    assert(g.rafQueue.length >= 1, '初始 rafQueue 应有一帧待跑', g.rafQueue.length);
    g.__stepFrame();                  // 跑一帧 loop：内部抛错被 catch，末尾仍续订
    assert(g.rafQueue.length >= 1,
      '异常帧后 RAF 必须仍续订（否则游戏卡死）', g.rafQueue.length);
    assert(g.probe().state === 'play', '帧异常被隔离后 state 仍应为 play', g.probe().state);
  },
};
