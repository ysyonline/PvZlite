/* REG-PLANT-07 · 种植动画时间轴归 update（2026-09-20 code-review-todo P2-A）
 * 背景：plantT 推进原在 drawPlant（渲染侧变异，读 lastDt 不含 gameSpeed）——
 *   ①4x 倍速下动画不加速（逻辑加速表现原速）②暂停时动画照播完（update 停 render 恒跑）。
 * 修复：推进挪 updatePlant（update 链路吃 sdt=dt*gameSpeed 且受 !paused 门控）；
 *   尘土触发（P0 语义）一并挪入；drawPlant 退化为纯读插值。
 * 断言清单（锁两个行为收益 + 一个不变量）：
 *   1. 倍速加速：gameSpeed=4 时 2 帧（0.05s/帧）plantT 应推进 ≥ 0.05*4*1000*2 - 容差
 *      （旧实现读 lastDt 只推 100ms，必挂）
 *   2. 暂停冻结：暂停后走 RAF 真帧，plantT 深快照不变（旧 render 恒跑会继续推进）
 *   3. 渲染纯读不变量：drawPlant 调用后 plantT/plantDone/dirtDone 三字段不变
 *      （P0×P2-A 接缝预案的收口：渲染层回归「只读不写」）
 *   4. 旧对象兼容：plantT===undefined 的注入对象 drawPlant 后不炸且视为已落地
 *   5. RAF 真帧端到端：真实 loop 驱动下动画播完 plantDone=true（update 链路贯通）
 * 坑位备忘：
 *   - performance.now 桩恒 0 → 帧步进用 rafQueue shift + 手动传增时间戳（SMOKE-010 同款）
 *   - loop 在 startGame 后 rafQueue 恒持 1 帧（自续订）
 */
module.exports = {
  id: 'REG-PLANT-07',
  name: '种植动画时间轴归 update：倍速加速 + 暂停冻结 + 渲染纯读（P2-A 锁定）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    const sb = g.sandbox;

    // ---- 布置：豌豆(0,3) 真实种植路径，刚种下 plantT=0 ----
    g.setSun(9999);
    g.selectCard(1);
    g.clickGrid(0, 3);
    const p = sb.__plants[0];
    assert(p && p.plantT === 0 && p.plantDone === false,
      '前置：豌豆已种下且 plantT=0', p && [p.plantT, p.plantDone]);

    // ---- 1) 倍速加速：4x 下 updatePlant 推进 ×4 ----
    g.setLevel(1); g.startGame(); g.setSun(9999);
    g.selectCard(1); g.clickGrid(0, 3);
    const p4 = sb.__plants.find(function (q) { return q.type === 'pea'; });
    assert(p4 && p4.plantT === 0, '前置：4x 段豌豆已种下', p4 && p4.plantT);
    // gameSpeed 由 loop 读取；走真实按钮路径设档（bindBtn fast：1→2→4→1 循环）。
    // gameSpeed 是顶层 let 不挂桥读不到——用确定性连点：本段起点必为 1x
    //（新载入 gameSpeed=1，前段未动过档位），两击到 4x；段末一击回 1x。
    let now = 1000;
    const clickFast = (n) => { for (let i = 0; i < n; i++) sb.btns.fast.onclick({ preventDefault() {} }); };
    clickFast(2);           // 1→2→4
    for (let i = 0; i < 2; i++) {
      now += 50;
      const f = g.rafQueue.shift();
      assert(f, 'rafQueue 应有帧（自续订）');
      f(now);
    }
    // sdt = 0.05*4 = 0.2s/帧 → 2 帧 plantT 预期 400ms（旧实现读 lastDt=0.05 仅 100ms）
    assert(p4.plantT >= 380 && p4.plantT <= 420,
      '4x 倍速 2 帧后 plantT 应 ≈400ms（0.05s×4×2×1000；旧实现仅 100 必挂）', p4.plantT);
    clickFast(1);           // 4→1 归位（后续段全部 1x）

    // ---- 2) 暂停冻结：暂停后真帧推进，plantT 不变 ----
    g.setLevel(1); g.startGame(); g.setSun(9999);
    g.selectCard(1); g.clickGrid(0, 3);
    const pp = sb.__plants.find(function (q) { return q.type === 'pea'; });
    now += 50; now += 50;   // 先推 2 帧让动画动起来（1x，plantT→100）
    let f = g.rafQueue.shift(); f(now);
    now += 50; f = g.rafQueue.shift(); f(now);
    const frozen = JSON.parse(JSON.stringify({ plantT: pp.plantT, plantDone: pp.plantDone, dirtDone: !!pp.dirtDone }));
    g.setPaused(true);
    for (let i = 0; i < 8; i++) { now += 50; const fr = g.rafQueue.shift(); fr(now); }
    assert(pp.plantT === frozen.plantT && pp.plantDone === frozen.plantDone,
      '暂停 8 帧后 plantT/plantDone 应精确不变（update 被 loop 守卫短路；旧 render 恒跑会推完）',
      { frozen: frozen, now: { plantT: pp.plantT, plantDone: pp.plantDone } });
    g.setPaused(false);
    // 恢复后继续推进至播完（动画状态机健康）
    for (let i = 0; i < 14 && !pp.plantDone; i++) { now += 50; const fr = g.rafQueue.shift(); fr(now); }
    assert(pp.plantDone === true, '解除暂停后动画应播完（plantDone=true）', pp.plantDone);

    // ---- 3) 渲染纯读不变量：drawPlant 调用前后动画字段零变化 ----
    g.setLevel(1); g.startGame(); g.setSun(9999);
    g.selectCard(1); g.clickGrid(0, 3);
    const pr = sb.__plants.find(function (q) { return q.type === 'pea'; });
    g.__updateRaw(0.1);       // 推到 plantT=100（动画中段）；__updateRaw 是 harness 已有桥
    const before = JSON.stringify({ plantT: pr.plantT, plantDone: pr.plantDone, dirtDone: !!pr.dirtDone });
    sb.drawPlant(pr);         // 无 dtRef 调用（真实 render 路径签名）
    sb.drawPlant(pr, 0.05);   // 带 dtRef 调用（兼容签名）——均不得改状态
    const after = JSON.stringify({ plantT: pr.plantT, plantDone: pr.plantDone, dirtDone: !!pr.dirtDone });
    assert(before === after, 'drawPlant（带/不带 dtRef）调用后动画字段必须零变化（渲染纯读）',
      { before: before, after: after });

    // ---- 4) 旧对象兼容：plantT===undefined 注入对象不炸、视为已落地 ----
    const legacy = { type: 'pea', col: 1, row: 1, cd: 0, sunT: 0, armT: 8, dur: 750, maxDur: 750 };
    sb.__plants.push(legacy);
    let threw = false;
    try { sb.drawPlant(legacy); } catch (e) { threw = true; }
    assert(!threw && legacy.plantT === 620 && legacy.plantDone === true,
      '旧 schema 对象 drawPlant 应兜底为已落地且不抛', threw && [legacy.plantT, legacy.plantDone]);
    sb.__plants.pop();

    // ---- 5) RAF 真帧端到端：update 链路把动画推完 ----
    g.setLevel(1); g.startGame(); g.setSun(9999);
    g.selectCard(1); g.clickGrid(0, 3);
    const pe = sb.__plants.find(function (q) { return q.type === 'pea'; });
    for (let i = 0; i < 16 && !pe.plantDone; i++) { now += 50; const fr = g.rafQueue.shift(); fr(now); }
    assert(pe.plantDone === true && pe.plantT === 620,
      '真帧驱动 ≤16 帧（800ms）内动画应播完且 plantT 钳位 620', [pe.plantT, pe.plantDone]);
  },
};
