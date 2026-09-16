/* SMOKE-020 · 存档持久化（V11-04 · KNOWN-ISSUES #9）
 * 覆盖「写入 → 重载 → 读回」全路径：
 *   - 静音偏好：键 pvz_muted（'1'/'0'），启动即恢复、切换即落盘
 *   - 最高分：键 pvz_highscore，结算（state→end）时刷新
 *   - 兜底：localStorage 抛错（隐私模式 / file:// 受限）时加载与游玩均不得中断
 * 手法：向 loadGame 注入一份共享 store 的 localStorage 桩，实现跨"会话"（多次 loadGame）读回。
 */
module.exports = {
  id: 'SMOKE-020',
  name: '存档持久化（静音偏好 + 最高分：写入→重载→读回）',
  seed: 42,
  run({ game, assert, loadGame }) {
    const store = {};
    const mockLS = {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    };

    // ================= 会话 A：写入 =================
    const a = loadGame({ seed: 42, localStorage: mockLS });
    assert(a.probe().muted === false, '首次启动默认不静音', a.probe().muted);
    assert(a.probe().highScore === 0, '首次启动最高分应为 0', a.probe().highScore);

    // 击杀 1 只普通僵尸 → 50 分
    a.startGame();
    const K = a.sandbox.__consts;
    const cellY = K.GRID_Y + K.CELL_H / 2;
    a.sandbox.__zombies.push({
      type: 'normal', row: 0, hp: 20, maxHp: 20, spd: 0, x: 300,
      eating: false, eatAnim: 0, walk: 0, dead: false,
    });
    a.sandbox.__projectiles.push({
      x: 250, y: cellY, vx: 340, dmg: 20, row: 0, type: 'pea', splash: 0, dead: false,
    });
    let guard = 0;
    while (a.probe().zombies > 0 && guard < 200) { a.tick(0.02); guard++; }
    assert(a.probe().score === 50, '前置：应得 50 分', a.probe().score);

    // 通关 → 结算 → 落盘最高分
    a.forceWaves(5);
    a.clearField();
    a.tick(0.1);
    assert(a.probe().state === 'end', '前置：应已结算', a.probe().state);
    assert(store.pvz_highscore === '50', '结算应把最高分写盘 pvz_highscore', store.pvz_highscore);

    // 点静音按钮 → 落盘静音偏好
    a.sandbox.btns.mute.onclick({ preventDefault() {} });
    assert(a.probe().muted === true, '点静音按钮应置 muted=true', a.probe().muted);
    assert(store.pvz_muted === '1', '静音偏好应写盘 pvz_muted=1', store.pvz_muted);

    // ================= 会话 B：重载 → 读回 =================
    const b = loadGame({ seed: 42, localStorage: mockLS });
    assert(b.probe().muted === true, '重载后应恢复静音偏好', b.probe().muted);
    assert(b.probe().highScore === 50, '重载后应读回最高分 50', b.probe().highScore);
    assert(b.sandbox.btns.mute.textContent === '🔇 静音',
      '启动即按存档恢复静音按钮外观', b.sandbox.btns.mute.textContent);

    b.sandbox.btns.mute.onclick({ preventDefault() {} });
    assert(b.probe().muted === false && store.pvz_muted === '0',
      '取消静音应写盘 pvz_muted=0', store.pvz_muted);

    // ================= 会话 C：localStorage 抛错 → 静默降级 =================
    const throwing = {
      getItem() { throw new Error('SecurityError'); },
      setItem() { throw new Error('SecurityError'); },
    };
    let c;
    try { c = loadGame({ seed: 42, localStorage: throwing }); }
    catch (e) { assert(false, 'localStorage 读抛错不得阻断加载', e && e.message); }
    assert(c.probe().muted === false, '读失败应降级为默认不静音', c.probe().muted);
    assert(c.probe().highScore === 0, '读失败应降级为最高分 0', c.probe().highScore);

    c.startGame();
    let threw = null;
    try { c.sandbox.btns.mute.onclick({ preventDefault() {} }); }
    catch (e) { threw = e; }
    assert(!threw, 'localStorage 写抛错不得由按钮冒泡（try/catch 兜底）', threw && threw.message);
    assert(c.probe().muted === true, '写失败但内存静音态应照常切换', c.probe().muted);
  },
};
