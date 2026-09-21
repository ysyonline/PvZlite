/* REG-CHILL-01 · v1.5 S4 chill 状态机：施加 / 数值 / 到期恢复（决议1 slow 三铁律 + 17:0x 改拍板）
 * 断言：
 *   1. 施加 → z.slowT=2.0；移动速度 ×0.6（spd=16 定值，1s 位移 ≈9.6px）
 *   2. 啃食速度 ×0.6（改拍板：65/s → 39/s，1s 内 dur 减 ≈39）
 *   3. 不叠加只刷新：二次施加 slowT 重回 2.0（续时），非叠加第二层
 *   4. 到期恢复：slowT 归零后回到全速（区间式断言，不锁具体帧数）
 * 坑位：僵尸/植物注入走 sb.__zombies / sb.__plants（getter 实时桥，REG-PLANT-04 同款）；
 *   推 update 用 g.__updateRaw(dt)（不累加 gt）；applyChill 走 __applyChill 桥。
 */
module.exports = {
  id: 'REG-CHILL-01',
  name: 'chill 状态机：施加×0.6 双作用/刷新续时/到期恢复（v1.5 S4）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame('chill-test');

    const mkZ = (x) => {
      const z = { type:'normal', row:2, hp:99999, maxHp:99999, spd:16,
        x, eating:false, eatAnim:0, walk:0, dead:false };
      g.sandbox.__zombies.push(z);
      return z;
    };
    const runDt = (s) => { for(let i=0;i<Math.round(s/0.05);i++) g.__updateRaw(0.05); };

    // ---- 1) 施加：slowT=2.0 → 移动 ×0.6 + slowT 按 dt 递减 ----
    const z1 = mkZ(600);
    const x0 = z1.x;
    g.sandbox.__applyChill(z1);
    assert(z1.slowT === 2.0, 'applyChill 应置 slowT=2.0（铁律 2s）', z1.slowT);
    runDt(1.0);
    assert(z1.slowT > 0.9 && z1.slowT <= 1.05,
      '减速中 slowT 应按 dt 递减（1s 后余 ~1.0，区间式）', z1.slowT);
    assert(Math.abs(z1.x - x0) <= 16 * 0.6 * 1.05 && Math.abs(z1.x - x0) >= 16 * 0.6 * 0.95,
      '移动速度应 ×0.6（1s 位移 ≈9.6px）', z1.x - x0);

    // ---- 2) 啃食 ×0.6（改拍板 2026-09-21 17:0x）----
    g.setSun(9999);
    g.selectCard(1);                      // 豌豆（索引 1）
    g.clickGrid(6, 2);
    assert(g.probe().plants === 1, '前置：豌豆应已种下', g.probe().plants);
    const plant = g.sandbox.__plants[0];
    const dur0 = plant.dur;
    const z2 = mkZ(0);
    g.sandbox.__applyChill(z2);
    z2.x = g.sandbox.gridToPos(6, 2).x + 30;   // 咬合位：z.x-pos.x ∈ (0, 0.4*CELL_W)
    runDt(1.0);
    const bitten = dur0 - plant.dur;
    assert(bitten > 65 * 0.6 * 0.9 && bitten < 65 * 0.6 * 1.1,
      '啃食速度应 ×0.6（1s 掉血 ≈39，非 65）', bitten);

    // ---- 3) 不叠加只刷新 ----
    const tBefore = z2.slowT;             // 啃 1s 后余 ~1.0
    g.sandbox.__applyChill(z2);
    assert(z2.slowT === 2.0 && z2.slowT > tBefore,
      '二次施加应刷新回 2.0（续时，不叠加第二层）', { before: tBefore, after: z2.slowT });

    // ---- 4) 到期恢复（区间式，不锁帧数）----
    const z3 = mkZ(600);
    z3.slowT = 0.3;
    const x30 = z3.x;
    runDt(0.5);                           // 0.3s 减速 + 0.2s 恢复
    assert(z3.slowT === 0, '到期 slowT 应归零（不残留负值）', z3.slowT);
    const segSlow = 16 * 0.6 * 0.3, segFast = 16 * 0.2;
    assert(z3.x < x30 && Math.abs((x30 - z3.x) - (segSlow + segFast)) < 16 * 0.05,
      '到期后应恢复全速（0.3s 慢 + 0.2s 快 ≈16px）', x30 - z3.x);
  },
};
