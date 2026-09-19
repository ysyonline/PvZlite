/* REG-GATE-01 · L1/L2 全波次出怪串行门（V13-M4-FIX-01 v2 · 用户 20:52 口径修订，替代 v1 REG-ROOF-02）
 * 口径（2026-09-19 20:52 用户裁决）：节奏门 gating = levelNo ∈ {1,2}（本仓库 1-based；派单字面 0/1 为
 * 0-based 笔误，按语义落地），**全波次**适用；L3/L4/L5 不适用，出怪节奏逐字节原样。
 * 门规则：上一只入场僵尸活着且距其入场 <10s → 拦下（队列不耗、不算波进度）；死了 → 下一帧立即放行；
 *         ≥10s → 放行兜底防僵死。
 *   - A1 L1 W1 死亡即放行：#1 @0.05 入场，3.05s 仍在（门拦 #2，队列不耗）；杀 #1 → #2 @3.1 立即入场
 *         （判别：原节奏 #2 @10.05 ⇒ 删门必红）。
 *   - A2 L1 W3 精确阈值（big 波，4 只，interval 8）：#1 @0.05 → 门拦到 10.05s 放 #2（原节奏 8.05s，删门必红）；
 *         10.10s #3 仍拦（门重臂成功）。
 *   - A3 L5 旁路（L5 无门）：W2（3 只，interval 9）#2 @9.05s 且 #1 活着入场（9.0<10）⇒ 门误套 L5 必红；
 *         9.55s #3 未放（原 interval=9 节奏原样）。
 *   - A4 L1 反转锁（原 v1「L1 原节奏」断言按新口径反转）：W2 #2 @9.05s 被 #1（活着，9.0<10）拦住 ⇒ 删门必红。
 *   - A5 L2 生效证据（QA 基线对照：L2 FIX 版应异于基线）：W1 #1 @0.05，9.05s 时 #2 仍被拦（基线 @10.05 才放？
 *         否——基线 interval=10 本来就 10.05 放；生效证据 = 门把「队列节奏」接管为「10s 串行」且死亡提前放行，见 A1）。
 * 手法：手动推进状态机（setWave + newWave，同 SMOKE-027 T12）；newWave 会调 SFX.wave ⇒ 用 __SFX 打桩；
 *       时序设计规避大波预警侧效应（next 波非 big / 不越 25s 兜底 / 段内先 tick 再收尾断言）。
 */
module.exports = {
  id: 'REG-GATE-01',
  name: 'L1/L2 全波次出怪串行门（死亡即放行 / 10s 阈值 / L5 旁路 / L1 反转 / L2 生效）',
  seed: 42,
  run({ game: g, assert }) {
    g.sandbox.__SFX.wave = function () {};   // newWave 内 SFX.wave 打桩（无 AudioContext 环境为 no-op 函数表）

    // ---- A1 · L1 W2 死亡即放行（W2 = 2 normal，interval 9；W1 仅 1 只无 #2 可验）----
    g.setLevel(1);
    g.startGame();
    g.setWave(2);
    g.newWave(2);
    let p = g.probe();
    assert(p.spawnQueueLen === 2, 'A1 前置：L1 W2 队列应 2 只', p.spawnQueueLen);
    g.tick(0.05);                                   // 首帧放行 #1（spawnGateZ==null）
    p = g.probe();
    assert(p.zombies === 1 && p.spawnQueueLen === 1, 'A1：#1 应 @0.05s 入场', [p.zombies, p.spawnQueueLen]);
    g.tick(3.0);                                    // gt=3.05：#1 活着且 3.0<10 ⇒ 门拦 #2
    p = g.probe();
    assert(p.zombies === 1 && p.spawnQueueLen === 1 && p.waveActive === true,
      'A1：3.05s 时 #1 活着应拦住 #2（队列不耗、波不推进）', [p.zombies, p.spawnQueueLen, p.waveActive]);
    g.killAllZombies();                             // 杀 #1 → 门下一帧立即开
    g.tick(0.05);                                   // gt=3.1
    p = g.probe();
    assert(p.zombies === 1 && p.spawnQueueLen === 0 && p.waveActive === false,
      'A1（判别）：前一只死亡应立即放行 #2 @3.1s（原节奏需等 9.05s ⇒ 删门必红）',
      [p.zombies, p.spawnQueueLen, p.waveActive]);

    // ---- A2 · L1 W3 精确阈值（big 波 = 2 normal + 1 cone，interval 8 ⇒ 原节奏 #2 @8.05）----
    g.setLevel(1);
    g.startGame();
    g.setWave(3);
    g.newWave(3);
    g.tick(0.05);                                   // #1 @0.05
    p = g.probe();
    assert(p.zombies === 1 && p.spawnQueueLen === 2, 'A2 前置：#1 入场后队列 2', [p.zombies, p.spawnQueueLen]);
    g.tick(8.5);                                    // gt=8.55：原节奏 8.05 已过、门 8.5<10 未满
    p = g.probe();
    assert(p.zombies === 1 && p.spawnQueueLen === 2,
      'A2（判别）：8.55s #1 活着应仍拦 #2（原节奏 8.05s 已放 ⇒ 删门必红）', [p.zombies, p.spawnQueueLen]);
    g.tick(1.45);                                   // gt=10.0：9.95<10 仍拦
    assert(g.probe().zombies === 1, 'A2：10.0s 应仍拦（9.95<10，阈值严格 ≥10）', g.probe().zombies);
    g.tick(0.05);                                   // gt=10.05：≥10 → 放行兜底
    p = g.probe();
    assert(p.zombies === 2 && p.spawnQueueLen === 1,
      'A2：10.05s 应放行 #2（阈值=10.0 非 8/9/11）', [p.zombies, p.spawnQueueLen]);
    g.tick(0.05);                                   // gt=10.1：门已重臂（#2 @10.05，0.05<10）→ #3 必拦
    assert(g.probe().zombies === 2, 'A2：10.1s #3 应被重臂的门拦住（0.05<10）', g.probe().zombies);

    // ---- A3 · L5 旁路（L5 无门；W2 = 3 只，interval 9）----
    g.setLevel(5);
    g.startGame();
    g.setWave(2);
    g.newWave(2);
    g.tick(0.05);                                   // #1 @0.05
    p = g.probe();
    assert(p.zombies === 1, 'A3 前置：L5 W2 #1 应入场', p.zombies);
    g.tick(9.0);                                    // gt=9.05：#1 活着且 9.0<10
    p = g.probe();
    assert(p.zombies === 2,
      'A3（判别）：L5（无门）第二只应按原节奏 @9.05s 且 #1 活着入场（门误套 L5 必红）', p.zombies);
    g.tick(0.5);                                    // gt=9.55：原节奏第三只应未到（spawnTimer=9）
    p = g.probe();
    assert(p.zombies === 2, 'A3：9.55s L5 第三只应未放（原 interval=9 节奏原样）', p.zombies);

    // ---- A4 · L1 反转锁（原「L1 原节奏」按新口径反转：L1 现在被门控）----
    g.setLevel(1);
    g.startGame();
    g.setWave(2);
    g.newWave(2);
    g.tick(0.05);                                   // #1 @0.05
    p = g.probe();
    assert(p.zombies === 1, 'A4 前置：L1 W2 #1 应入场', p.zombies);
    g.tick(9.0);                                    // gt=9.05：#1 活着且 9.0<10
    p = g.probe();
    assert(p.zombies === 1 && p.spawnQueueLen === 1,
      'A4（判别/反转）：L1 被门控——#1 活着时 9.05s 不得放 #2（v1 原断言已反转；删门必红）',
      [p.zombies, p.spawnQueueLen]);

    // ---- A5 · L2 生效证据（QA 基线对照：L2 FIX 版应异于基线）----
    g.setLevel(2);
    g.startGame();
    g.setWave(1);
    g.newWave(1);
    g.tick(0.05);                                   // #1 @0.05
    p = g.probe();
    assert(p.zombies === 1 && p.spawnQueueLen === 1, 'A5 前置：L2 W1 #1 应入场', [p.zombies, p.spawnQueueLen]);
    g.tick(9.0);                                    // gt=9.05：#1 活着且 9.0<10
    p = g.probe();
    assert(p.zombies === 1, 'A5（生效证据）：L2 被门控——9.05s #2 不得提前入场（队列串行接管）', p.zombies);
    g.tick(1.0);                                    // gt=10.05：≥10 → 放行
    p = g.probe();
    assert(p.zombies === 2 && p.spawnQueueLen === 0, 'A5：10.05s 应放行 #2（10s 串行兜底生效）',
      [p.zombies, p.spawnQueueLen]);
  },
};
