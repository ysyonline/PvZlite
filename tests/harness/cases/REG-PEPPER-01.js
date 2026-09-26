/* REG-PEPPER-01 · 航椒（pepper）同排全清秒杀 —— 机制级回归（V22 刀1 · v2.2.5 消缺改版）
 * ------------------------------------------------------------------
 * 被测契约（源码 updatePlant 'pepper' 分支 + explodePepper；GDD §2）：
 *   ① 膨胀期（v2.2.5 新增）：种植后 arming=true，armT 从 0 推进，armT≥ONE_SHOT_ARM_TIME(1.2s)
 *      才武装（arming=false）。膨胀期内不可被踩中触发、不可被啃食（updateZombies 目标判定跳过）；
 *   ② 触发判据（武装后）：同排 && |z.x - pos.x| < CELL_W*0.55（CELL_W=90 ⇒ **实测阈值 49.5px**）；
 *   ③ 引爆范围：**同排全部**僵尸，不限数量、不限列（含身后与他列），无差别 killZombie；
 *   ④ 不参与耐久结算：铁桶 560 / hard×1.35 / expert×1.80 下一碰即死（对齐 v2.1.1 地雷口径）；
 *   ⑤ 他排僵尸不受影响（跨行 = 否）；
 *   ⑥ 一次性：引爆后 p._dying，下一帧移除。
 *
 * ★ 口径注意（易踩坑）：「dx=80 存活」指的是**不触发引爆**（场上只有它时航椒不炸）；
 *   一旦被同排其它僵尸触发，同排 dx=80 的那只一样被清（③ 全排）。故「范围外存活」
 *   必须放在**他排**断言，或放在「只有它一只」的触发判据子场景中断言。
 *
 * ★ v2.2.5 消缺改版：原「种下当帧触发」契约改为「膨胀 1.2s 后武装才可触发」。
 *   测试内 place() 走真实路径（selectCard→clickGrid）⇒ spawnPlant 置 arming=true，
 *   所有触发场景前须先 tick 过膨胀期（arm(1.2) 辅助函数）。
 */
module.exports = {
  id: 'REG-PEPPER-01',
  name: '航椒：膨胀1.2s武装 / 同排±49.5px触发 / 全排无差别秒杀(铁桶+hard+expert) / 一次性',
  seed: 42,
  run({ game: g, assert }) {
    const sb = g.sandbox;
    const K = sb.__consts;
    const COL_X = (c) => K.GRID_X + c * K.CELL_W + K.CELL_W / 2;
    const THRESHOLD_EXPECT = K.CELL_W * 0.55;    // 49.5
    const ARM_TIME = K.ONE_SHOT_ARM_TIME;        // 1.2

    function place(type, col, row, dur) {
      const CARDS = sb.__CARDS || [];
      const idx = CARDS.findIndex((c) => c.type === type);
      if (idx >= 0) {
        g.selectCard(idx);
        g.clickGrid(col, row);
        const arr = sb.__plants;
        return arr[arr.length - 1];
      }
      const p = { type, col, row, cd: 0, sunT: 0, armT: 0, dur, maxDur: dur,
        arming: false,   // v2.2.5：注入兜底直接视为已武装（真实路径由 spawnPlant 置 arming:true）
        plantT: 620, plantDone: true, dirtDone: true };
      sb.__plants.push(p);
      return p;
    }
    const mkZ = (row, x, type, hp) => ({
      type: type || 'normal', row, hp: hp || 180, maxHp: hp || 180, spd: 0, x,
      eating: false, eatAnim: 0, walk: 0, dead: false,
    });
    function fresh(diff) {
      g.startGame();
      g.setDiff(diff || 'normal');
      g.setSun(9999);
      g.clearField();
    }
    /** 推进膨胀期至武装完成（真实路径 place 后调用）。 */
    function arm() {
      for (let i = 0; i < 30; i++) g.tick(0.05);   // 1.5s > 1.2s ⇒ 武装完成
    }

    // ================= S1 · 膨胀期：种下后 1.2s 内不可触发、不可被啃食 =================
    fresh();
    place('pepper', 1, 2, 300);
    let p = g.probe();
    assert(p.plants === 1 && p.plantsArr[0].type === 'pepper', 'S1 前置：航椒已种下', p.plantsArr);
    assert(p.plantsArr[0].arming === true, 'S1 种下即进入膨胀期（arming=true）', p.plantsArr[0].arming);

    const X0 = COL_X(1);                         // =190
    sb.__zombies.push(mkZ(2, X0));               // 同格 dx=0（膨胀期内踩上）
    for (let i = 0; i < 10; i++) g.tick(0.05);   // 0.5s < 1.2s（仍在膨胀期）
    p = g.probe();
    assert(p.plants === 1, 'S1 膨胀期内（0.5s<1.2s）僵尸踩上不得引爆', p.plantsArr);
    assert(p.zombies === 1 && p.zombiesArr[0].hp === 180, 'S1 膨胀期内僵尸存活且 hp 不变', p.zombiesArr);
    assert(p.plantsArr[0].dur === 300, 'S1 膨胀期内不可被啃食（dur 不变）', p.plantsArr[0].dur);
    assert(p.plantsArr[0].arming === true, 'S1 0.5s 时仍处于膨胀期', p.plantsArr[0].arming);

    for (let i = 0; i < 15; i++) g.tick(0.05);   // 累计 1.25s > 1.2s ⇒ 武装完成
    p = g.probe();
    // 时序注意：同格僵尸在场 ⇒ 武装完成的第一帧即引爆，此时植物已消失，
    // 不得再读 plantsArr[0].arming（undefined），武装完成态由 S1b 无僵尸场景验证。
    assert(p.plants === 0, 'S1 武装完成后同格僵尸触发引爆消失', p.plantsArr);
    assert(p.zombies === 0, 'S1 引爆应秒杀同格僵尸', p.zombiesArr);

    // ================= S1b · 武装完成态：无触发体时 arming 翻转为 false =================
    fresh();
    place('pepper', 1, 2, 300);
    arm();
    p = g.probe();
    assert(p.plants === 1, 'S1b 无触发体时武装后航椒仍在场', p.plantsArr);
    assert(p.plantsArr[0].arming === false, 'S1b 膨胀期后武装完成（arming=false）', p.plantsArr[0].arming);

    // ================= S2 · 触发判据（武装后）：二分实测阈值（锁 49.5px） =================
    function explodesAtDx(dx) {
      fresh();
      place('pepper', 1, 2, 300);
      arm();                                     // 先过膨胀期
      sb.__zombies.push(mkZ(2, X0 + dx));
      g.tick(0.016);
      return g.probe().plants === 0;
    }
    assert(explodesAtDx(0) === true, 'S2 dx=0 应触发引爆');
    assert(explodesAtDx(90) === false, 'S2 dx=90（一整格）不应触发引爆');
    let lo = 0, hi = 90;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (explodesAtDx(mid)) lo = mid; else hi = mid;
    }
    const measured = (lo + hi) / 2;
    assert(Math.abs(measured - THRESHOLD_EXPECT) < 0.05,
      'S2 触发阈值二分实测应 = CELL_W*0.55 = 49.5px', { measured, expect: THRESHOLD_EXPECT });

    // 边界两侧单点复核（判据为严格小于）
    assert(explodesAtDx(49.0) === true, 'S2 dx=49.0（<49.5）应触发引爆');
    assert(explodesAtDx(50.0) === false, 'S2 dx=50.0（>49.5）不应触发引爆');
    // 绝对值语义：身后同样触发
    fresh();
    place('pepper', 1, 2, 300);
    arm();
    sb.__zombies.push(mkZ(2, X0 - 44));
    g.tick(0.016);
    assert(g.probe().plants === 0, 'S2 触发判据取 |dx|（身后 dx=-44 同样引爆）', g.probe().plantsArr);
    // 场上只有 dx=80 的僵尸 ⇒ 不触发，僵尸存活且 hp 不变
    fresh();
    place('pepper', 1, 2, 300);
    arm();
    sb.__zombies.push(mkZ(2, X0 + 80));
    for (let i = 0; i < 20; i++) g.tick(0.05);   // 1.0s
    p = g.probe();
    assert(p.plants === 1, 'S2 仅有 dx=80 僵尸时航椒不得引爆（范围外）', p.plantsArr);
    assert(p.zombies === 1 && p.zombiesArr[0].hp === 180, 'S2 范围外僵尸存活且 hp 不变', p.zombiesArr);

    // ================= S3 · 引爆后同排全部秒杀（不限数量/列）+ 他排不受影响 =================
    fresh();
    place('pepper', 1, 2, 300);
    arm();
    [60, X0, 400, 700, 880].forEach((x) => sb.__zombies.push(mkZ(2, x)));   // 同排 5 只（含身后 x=60）
    sb.__zombies.push(mkZ(1, X0 + 80));          // 他排（dx=80）⇒ 必须存活
    sb.__zombies.push(mkZ(3, X0));               // 他排同列 ⇒ 必须存活
    g.tick(0.016);
    p = g.probe();
    assert(p.plants === 0, 'S3 航椒应已引爆消失', p.plantsArr);
    assert(p.zombies === 2, 'S3 同排 5 只应被全清，仅他排 2 只存活',
      p.zombiesArr.map((z) => ({ row: z.row, x: z.x })));
    assert(!p.zombiesArr.some((z) => z.row === 2), 'S3 同排不得有幸存者（不限数量与列）', p.zombiesArr);
    assert(p.zombiesArr.every((z) => z.hp === 180), 'S3 他排僵尸不得受伤（跨行=否）', p.zombiesArr);
    assert(p.score >= 250, 'S3 5 次击杀应结算 ≥250 分', p.score);

    // ================= S4 · 无差别秒杀：铁桶 560 / hard×1.35 / expert×1.80 =================
    // --- S4a：普通难度，铁桶 560（旧 DMG 结算口径下 560>500 杀不死）---
    fresh('normal');
    place('pepper', 1, 2, 300);
    arm();
    sb.__zombies.push(mkZ(2, X0, 'bucket', 560));
    sb.__zombies.push(mkZ(2, X0 + 300, 'bucket', 560));
    g.tick(0.016);
    p = g.probe();
    assert(p.plants === 0, 'S4a 航椒应已引爆', p.plantsArr);
    assert(p.zombies === 0, 'S4a 铁桶(560HP)应被无差别秒杀（不走耐久结算）', p.zombiesArr);

    // --- S4b：hard ×1.35（normal 243 / bucket 756）---
    fresh('hard');
    place('pepper', 1, 2, 300);
    arm();
    sb.__zombies.push(mkZ(2, X0, 'normal', 243));
    sb.__zombies.push(mkZ(2, X0 + 40, 'bucket', 756));
    sb.__zombies.push(mkZ(2, X0 + 300, 'bucket', 756));   // 同排远处 ⇒ 同样被清
    sb.__zombies.push(mkZ(1, X0, 'bucket', 756));          // 他排 ⇒ 必须存活且 hp 不变
    g.tick(0.016);
    p = g.probe();
    assert(p.plants === 0, 'S4b hard：航椒应已引爆', p.plantsArr);
    assert(p.zombies === 1 && p.zombiesArr[0].row === 1,
      'S4b hard：同排 normal(243)/bucket(756)×2 应全被秒杀', p.zombiesArr);
    assert(p.zombiesArr[0].hp === 756, 'S4b hard：他排 bucket(756) 不得受伤', p.zombiesArr[0]);

    // --- S4c：expert ×1.80（normal 324 / bucket 1008）---
    fresh('expert');
    place('pepper', 1, 2, 300);
    arm();
    sb.__zombies.push(mkZ(2, X0, 'normal', 324));
    sb.__zombies.push(mkZ(2, X0 + 200, 'bucket', 1008));
    g.tick(0.016);
    p = g.probe();
    assert(p.plants === 0, 'S4c expert：航椒应已引爆', p.plantsArr);
    assert(p.zombies === 0, 'S4c expert：normal(324)/bucket(1008) 应被无差别秒杀', p.zombiesArr);

    // ================= S5 · 一次性：引爆后不复活、不二次触发 =================
    fresh();
    place('pepper', 1, 2, 300);
    arm();
    sb.__zombies.push(mkZ(2, X0));
    g.tick(0.016);
    assert(g.probe().plants === 0, 'S5 前置：已引爆消失');
    sb.__zombies.push(mkZ(2, X0));
    for (let i = 0; i < 20; i++) g.tick(0.05);   // 1.0s
    p = g.probe();
    assert(p.plants === 0, 'S5 一次性：不得复活/二次引爆', p.plantsArr);
    assert(p.zombies === 1, 'S5 消失后不再产生击杀（新僵尸存活）', p.zombiesArr);
  },
};
