/* REG-PEPPER-01 · 航椒（pepper）同排全清秒杀 —— 机制级回归（V22 刀1）
 * ------------------------------------------------------------------
 * 被测契约（源码 L2024-2029 updatePlant 'pepper' 分支 + L2078 explodePepper；GDD §2）：
 *   ① armT=0（即种即生效）：种下当帧即处于可触发态，无武装倒计时；
 *   ② 触发判据：同排 && |z.x - pos.x| < CELL_W*0.55（CELL_W=90 ⇒ **实测阈值 49.5px**）；
 *      ⚠ GDD §2.3 标注「≈54px」与代码不符（0.55×90=49.5；54 是地雷**杀伤**半径 0.6×90）。
 *      本用例用二分实测锁定 49.5，只记录不改代码（Minor，见 v22-qa-report.md）。
 *   ③ 引爆范围：**同排全部**僵尸，不限数量、不限列（含身后与他列），无差别 killZombie；
 *   ④ 不参与耐久结算：铁桶 560 / hard×1.35 / expert×1.80 下一碰即死（对齐 v2.1.1 地雷口径）；
 *   ⑤ 他排僵尸不受影响（跨行 = 否）；
 *   ⑥ 一次性：引爆后 p._dying，下一帧移除。
 *
 * ★ 口径注意（易踩坑）：「dx=80 存活」指的是**不触发引爆**（场上只有它时航椒不炸）；
 *   一旦被同排其它僵尸触发，同排 dx=80 的那只一样被清（③ 全排）。故「范围外存活」
 *   必须放在**他排**断言，或放在「只有它一只」的触发判据子场景中断言。
 *
 * ★ 旧源判别力（必红）：v2.1.0（a3ca5f6）无 pepper 卡片 ⇒ place() 走注入兜底 ⇒
 *   updatePlant 无 pepper 分支 ⇒ 永不引爆 ⇒ ①「种下当帧触发」与 ③「全排秒杀」全判红。
 *   （实测红值见 production/v22-qa-report.md §D1）
 */
module.exports = {
  id: 'REG-PEPPER-01',
  name: '航椒：armT=0 / 同排±49.5px 触发 / 全排无差别秒杀(铁桶+hard+expert) / 一次性',
  seed: 42,
  run({ game: g, assert }) {
    const sb = g.sandbox;
    const K = sb.__consts;
    const COL_X = (c) => K.GRID_X + c * K.CELL_W + K.CELL_W / 2;
    const THRESHOLD_EXPECT = K.CELL_W * 0.55;    // 49.5

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

    // ================= S1 · armT=0：种下当帧即可触发 =================
    fresh();
    place('pepper', 1, 2, 300);
    let p = g.probe();
    assert(p.plants === 1 && p.plantsArr[0].type === 'pepper', 'S1 前置：航椒已种下', p.plantsArr);
    assert(p.plantsArr[0].armT === 0, 'S1 armT 应为 0（即种即生效，无武装等待）', p.plantsArr[0].armT);

    const X0 = COL_X(1);                         // =190
    sb.__zombies.push(mkZ(2, X0));               // 同格 dx=0
    g.tick(0.016);
    p = g.probe();
    assert(p.plants === 0, 'S1 种下当帧（无武装倒计时）即应引爆消失', p.plantsArr);
    assert(p.zombies === 0, 'S1 引爆应秒杀同格僵尸', p.zombiesArr);

    // ================= S2 · 触发判据：二分实测阈值（锁 49.5px） =================
    function explodesAtDx(dx) {
      fresh();
      place('pepper', 1, 2, 300);
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
    sb.__zombies.push(mkZ(2, X0 - 44));
    g.tick(0.016);
    assert(g.probe().plants === 0, 'S2 触发判据取 |dx|（身后 dx=-44 同样引爆）', g.probe().plantsArr);
    // 场上只有 dx=80 的僵尸 ⇒ 不触发，僵尸存活且 hp 不变
    fresh();
    place('pepper', 1, 2, 300);
    sb.__zombies.push(mkZ(2, X0 + 80));
    for (let i = 0; i < 20; i++) g.tick(0.05);   // 1.0s
    p = g.probe();
    assert(p.plants === 1, 'S2 仅有 dx=80 僵尸时航椒不得引爆（范围外）', p.plantsArr);
    assert(p.zombies === 1 && p.zombiesArr[0].hp === 180, 'S2 范围外僵尸存活且 hp 不变', p.zombiesArr);

    // ================= S3 · 引爆后同排全部秒杀（不限数量/列）+ 他排不受影响 =================
    fresh();
    place('pepper', 1, 2, 300);
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
    sb.__zombies.push(mkZ(2, X0, 'bucket', 560));
    sb.__zombies.push(mkZ(2, X0 + 300, 'bucket', 560));
    g.tick(0.016);
    p = g.probe();
    assert(p.plants === 0, 'S4a 航椒应已引爆', p.plantsArr);
    assert(p.zombies === 0, 'S4a 铁桶(560HP)应被无差别秒杀（不走耐久结算）', p.zombiesArr);

    // --- S4b：hard ×1.35（normal 243 / bucket 756）---
    fresh('hard');
    place('pepper', 1, 2, 300);
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
    sb.__zombies.push(mkZ(2, X0, 'normal', 324));
    sb.__zombies.push(mkZ(2, X0 + 200, 'bucket', 1008));
    g.tick(0.016);
    p = g.probe();
    assert(p.plants === 0, 'S4c expert：航椒应已引爆', p.plantsArr);
    assert(p.zombies === 0, 'S4c expert：normal(324)/bucket(1008) 应被无差别秒杀', p.zombiesArr);

    // ================= S5 · 一次性：引爆后不复活、不二次触发 =================
    fresh();
    place('pepper', 1, 2, 300);
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
