/* REG-CLEAR-01 · 通关奖励 worldClear 配置契约（T-105 · Q-13 语义平移；impl-plan T-08 演进）
 * 断言：computeClearReward(worldKey) 只读 saveCleared 集合 + CLEAR_REWARD 配置——
 *   worldClear：通关前该世界已通关键数恰为 9（本关=第 10 关）→ 发 worldClearAmount=300，其余 0
 *   跨世界键隔离：世界 2 的 cleared 不影响世界 1 判定
 *   重复发放防护：该世界已满 10 键 → 0
 *   配置防御：mode 被改坏时静默 0（旧 per10/flat 读法已删除，Q-13 拍板不双轨）
 * 注：saveCleared 经 harness setSaveCleared 注入（T-106 新增 setter）；computeClearReward 纯函数直调。
 */
module.exports = {
  id: 'REG-CLEAR-01',
  name: '通关奖励 worldClear：世界通关判定 + 隔离 + 防重（T-105）',
  seed: 42,
  run({ game: g, assert }) {
    const C = g.sandbox.__consts.POINT_CONFIG.CLEAR_REWARD;

    // ---- 1) 默认 worldClear 读法 ----
    assert(C.mode === 'worldClear', '默认读法应为 worldClear（Q-13 语义平移）', C.mode);
    assert(C.worldClearAmount === 300, 'worldClearAmount 应 =300（Q-5=A）', C.worldClearAmount);

    const w110 = ['1-1','1-2','1-3','1-4','1-5','1-6','1-7','1-8','1-9'];
    g.setSaveCleared([]);
    assert(g.computeClearReward('1-10') === 0, '世界 1 零通关键 → 奖励 0');
    g.setSaveCleared(w110.slice(0, 8));
    assert(g.computeClearReward('1-10') === 0, '世界 1 仅 8 键 → 本关非第 10 关 → 0');
    g.setSaveCleared(w110);
    assert(g.computeClearReward('1-10') === 300, '通关前恰 9 键 → 世界通关 → 发 300');
    g.setSaveCleared(w110.concat('1-10'));
    assert(g.computeClearReward('1-10') === 0, '该世界已满 10 键 → 重复通关不再发（防重）');

    // ---- 2) 跨世界隔离 ----
    const w2 = ['2-1','2-2','2-3','2-4','2-5','2-6','2-7','2-8','2-9'];
    g.setSaveCleared(w2);
    assert(g.computeClearReward('1-10') === 0, '世界 2 满 9 键不影响世界 1 判定（跨世界隔离）');
    assert(g.computeClearReward('2-10') === 300, '世界 2 通关前恰 9 键 → 300（前缀判定）');

    // ---- 3) 配置防御：mode 改坏 → 静默 0 ----
    const savedMode = C.mode;
    C.mode = 'broken';
    g.setSaveCleared(w110);
    assert(g.computeClearReward('1-10') === 0, 'mode 非 worldClear → 静默 0（防御分支）');
    C.mode = savedMode;   // 还原（const 对象字段可变，读法契约即在此）

    // ---- 4) 难度乘算（T-07）：局合计取整口径 ----
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
