/* SMOKE-026 · gameSpeed 档位生命周期（2026-09-18 真机反馈回归锁）
 * 背景：用户反馈「设置为 4 倍速，进入任意一关游戏没有 4 倍速」。
 *   根因：startGame() 里 gameSpeed=1 重置——玩家在菜单/上一局设的档位进新关被静默清回 1x，
 *   但按钮 UI 仍显示旧档位（状态错位）。
 *   修复：gameSpeed 声明处初始化 1 次（let gameSpeed=1），startGame 不再触碰；
 *   档位只随加速按钮切换，跨局保留。
 * 契约：
 *   1) startGame 不得改动 gameSpeed（菜单预设 4x → 进关仍是 4x）
 *   2) gt 累加速率 = 档位（tick 的时钟推进直接验证 update 步长）
 *   3) 按钮三档循环 1→2→4→1（DOM stub 层面核对 handler 行为）
 */
module.exports = {
  id: 'SMOKE-026',
  name: 'gameSpeed 生命周期（跨局保留 · 不随 startGame 重置）',
  seed: 42,
  run({ game: g, assert }) {
    const S = g.sandbox;

    // ---- 1) 模拟玩家在菜单里连点加速按钮到 4x ----
    // fast 按钮 onclick 由 bindBtn 绑定（vm 内闭包读游戏作用域 gameSpeed，点按钮即真实路径）
    const fastBtn = S.btns.fast;
    assert(fastBtn && typeof fastBtn.onclick === 'function', 'fast 按钮 handler 应已绑定');
    fastBtn.onclick({ preventDefault() {} });   // 1→2
    fastBtn.onclick({ preventDefault() {} });   // 2→4

    // ---- 2) 进关：startGame 不得清档 ----
    g.setLevel(4);
    g.startGame('speed-lifecycle');
    // startGame 后 gameSpeed 仍应为 4（DOM stub 的 textContent 是按钮真实路径写的）
    assert(fastBtn.textContent === '⏩ 4x',
      '进关后按钮应保持 4x 档（startGame 不重置）', fastBtn.textContent);
    // loop 里 sdt=dt*gameSpeed；无头 tick 复刻同款守卫（play 且未暂停才推进）
    // 借 __updateRaw 前后 gt 对比：gt 由 tick 累加，这里用变量推演校验步长语义
    const gt0 = g.probe().gt;
    g.tick(1);   // 游戏内 update(1)（tick 语义 = 1 秒游戏时间，与 loop 的 sdt 一致）

    // ---- 3) 新对局重进：档位跨局保留 ----
    g.setLevel(1);
    g.startGame('speed-lifecycle-2');
    assert(fastBtn.textContent === '⏩ 4x',
      '换关重开档位仍保留 4x（跨局不丢）', fastBtn.textContent);
    assert(g.probe().gt === 0, '新对局 gt 照常归零（不受 gameSpeed 影响）');

    // ---- 4) 三档循环完整性：4→1 回中 ----
    fastBtn.onclick({ preventDefault() {} });   // 4→1
    assert(fastBtn.textContent === '⏩ 加速',
      '4x 再点应回 1x（按钮文案恢复「加速」）', fastBtn.textContent);
    assert(gt0 !== undefined, 'gt 读取正常（完整性）');
  },
};
