/* REG-CLEAR-01 · 通关奖励双读法配置切换契约（impl-plan T-08）
 * 断言：computeClearReward 只读 CLEAR_REWARD.mode——
 *   per10：clears 自增后逢 10（10/20/30…）发 per10Amount，其余 0
 *   flat ：每关都发 flatAmount
 *   改 mode 即切换，逻辑零改动（用户 Q-C 读法①默认）。
 * 注：computeClearReward/clears 经 harness setter 驱动（顶层 let 桥）。
 */
module.exports = {
  id: 'REG-CLEAR-01',
  name: '通关奖励双读法：mode 配置切换零改逻辑（T-08）',
  seed: 42,
  run({ game: g, assert }) {
    const C = g.sandbox.__consts.POINT_CONFIG.CLEAR_REWARD;

    // ---- 1) 默认 per10 读法 ----
    assert(C.mode === 'per10', '默认读法应为 per10（读法①）', C.mode);
    g.setClears(9);
    assert(g.computeClearReward() === 0, 'clears=9 未满 10 → 奖励 0');
    g.setClears(10);
    assert(g.computeClearReward() === 300, 'clears=10 → 发 per10Amount=300');
    g.setClears(11);
    assert(g.computeClearReward() === 0, 'clears=11 → 奖励 0');
    g.setClears(20);
    assert(g.computeClearReward() === 300, 'clears=20 → 再发 300');
    g.setClears(19);
    assert(g.computeClearReward() === 0, 'clears=19 → 奖励 0');
    g.setClears(0);
    assert(g.computeClearReward() === 0, 'clears=0（首关前）→ 奖励 0（防开局白送）');

    // ---- 2) flat 读法：仅改配置 mode ----
    const savedMode = C.mode;
    C.mode = 'flat';
    g.setClears(1);
    assert(g.computeClearReward() === 30, 'flat 模式 clears=1 → 发 flatAmount=30');
    g.setClears(7);
    assert(g.computeClearReward() === 30, 'flat 模式每关都发 30');
    g.setClears(10);
    assert(g.computeClearReward() === 30, 'flat 模式与逢 10 无关');
    C.mode = savedMode;   // 还原（const 对象字段可变，读法契约即在此）

    // ---- 3) 难度乘算（T-07）：局合计取整口径 ----
    // settlePointsRaw(collected, clearReward) = round((collected+reward)*mult)
    g.setDiff('normal');
    assert(g.settlePointsRaw(235, 0) === 235, 'normal mult=1.0 → 原值');
    g.setDiff('hard');
    assert(g.settlePointsRaw(235, 0) === Math.round(235 * 1.35), 'hard mult=1.35 → 317', g.settlePointsRaw(235, 0));
    assert(g.settlePointsRaw(100, 300) === Math.round(400 * 1.35), 'hard 合计乘算 (100+300)*1.35=540');
    g.setDiff('expert');
    assert(g.settlePointsRaw(235, 0) === Math.round(235 * 1.8), 'expert mult=1.8 → 423');
    // 取整位置：合计后一次取整（非 per-drop）
    assert(g.settlePointsRaw(1, 0) === Math.round(1 * 1.8) && g.settlePointsRaw(1, 0) === 2,
      '取整在合计后（round(1*1.8)=2）');
    // 负例：非每 drop 取整——(0.5+0.5) 合计乘算 ≠ per-drop 两次取整之和
    assert(g.settlePointsRaw(3, 0) === 5, 'round(3*1.8)=5（若 per-drop 取整会得不同结果）');
    g.setDiff('normal');
  },
};
