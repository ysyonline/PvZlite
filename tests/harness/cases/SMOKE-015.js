/* SMOKE-015 · 大波预警横幅生命周期（倒计时结束即消失）
 * 背景：用户反馈「倒计时结束，提示板块不消失，还要等约 2s 才消失」（2026-09-16）。
 *   根因：把「横幅显示」和「等待刷怪时机」混在同一个 warn.active 标志里 ——
 *   清场门槛要求场上清空才刷怪，于是横幅被迫延长到那一刻。
 *   修复：拆出 warn.pending —— active 只管横幅（倒计时归零立即隐藏），
 *        pending 负责等待清场（或 25s 兜底）后真正刷怪。同时预警时长 4s→3s→2s。
 * 断言：
 *   1. 预警启动：warnActive=true，时长 = 2s（WARN_TOTAL）
 *   2. 倒计时归零 → warnActive 立即 false（横幅消失），转 warnPending=true
 *   3. pending 期间场上仍有僵尸 → wave 不推进（清场门槛仍生效）
 *   4. 场上清空 → 同帧刷怪：wave 推进 + pending 归 false
 */
module.exports = {
  id: 'SMOKE-015',
  name: '大波预警横幅生命周期（倒计时结束即消失）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    const lv = g.sandbox.__LEVELS[1];
    const bigIdx = lv.waves.findIndex(w => w.big);
    assert(bigIdx >= 0, 'L1 应存在大波配置');

    g.setWave(bigIdx);        // 前置波已放完
    g.setLastWaveT(-999);     // 最小喘息时间已满足
    g.tick(0.1);

    let p = g.probe();
    assert(p.warnActive === true, '应进入大波预警（横幅显示中）', p.warnActive);
    assert(Math.abs(p.warnT - 2) < 0.15, '预警时长应为 2s（WARN_TOTAL=2）', p.warnT);

    // ---- 推进到倒计时归零（2s + 余量），场上无僵尸 ----
    for (let i = 0; i < 25; i++) g.tick(0.1);
    p = g.probe();
    assert(p.warnActive === false, '倒计时结束 → 横幅必须立即消失（不再等待清场）', p.warnActive);
    assert(p.wave === bigIdx + 1, '场上已清空 → 同帧应刷出大波', [p.wave, bigIdx + 1]);
    assert(p.warnPending === false, '刷怪后 pending 应复位', p.warnPending);
    assert(p.spawnQueueLen > 0 || p.zombies > 0, '大波应已开始生成', [p.spawnQueueLen, p.zombies]);

    // ---- 对照场景：场上仍有僵尸时，横幅照样按时消失，但刷怪延后 ----
    g.startGame();
    g.setWave(bigIdx);
    g.setLastWaveT(-999);
    g.forceZombieAt('normal', 2, 700);      // 场上留 1 只活僵尸
    g.tick(0.1);
    p = g.probe();
    assert(p.warnActive === true, '对照：应进入大波预警', p.warnActive);

    for (let i = 0; i < 25; i++) g.tick(0.1);   // 走过 2s 倒计时
    p = g.probe();
    assert(p.warnActive === false, '对照：倒计时结束 → 横幅立即消失（与清场无关）', p.warnActive);
    assert(p.warnPending === true, '对照：转为等待刷怪时机', p.warnPending);
    assert(p.wave === bigIdx, '对照：场上未清空 → wave 不得推进（清场门槛仍生效）', [p.wave, bigIdx]);

    // 清空场上 → 立即刷怪
    g.killAllZombies();
    g.tick(0.2);
    p = g.probe();
    assert(p.wave === bigIdx + 1, '对照：清空后应刷出大波', [p.wave, bigIdx + 1]);
    assert(p.warnPending === false, '对照：刷怪后 pending 归 false', p.warnPending);
  },
};
