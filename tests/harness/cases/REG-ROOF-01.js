/* REG-ROOF-01 · 屋顶种植校验完整点击路径版（V13 · S1 附A 裁决②：独立回归用例）
 * v1.3 唯一新交互语义，锁「L1–L4 零感知」最高回归风险区。与 SMOKE-027 T16 分工：
 * SMOKE 层=数据契约抽检；本用例=onClick 完整点击路径层（clickGrid 真实走卡片选择→校验→扣款）。
 *   ① 屋顶格无盆点投手（150 费卡同样被拦）→ 拒绝零副作用（不扣费/不进 CD/保留选中）
 *   ② 屋顶格放盆 → 成功；盆上点花盆 → 拒（已占用）
 *   ③ 盆上连种投手 → 成功且投手可开火（cabbage 分支挂上 updatePlant，真实发射验证）
 *   ④ 铲子最上层语义：盆+植物 → 铲植物留盆返 75（150/2）；空盆 → 铲盆返 25
 *   ⑤ 隔离锁：L2 陆地关（非 roof）种植零拦截
 * 写法镜像 SMOKE-025 T16（泳池完整链路同款惯例），每段重选铲子（harness 惯例：铲子用后即清）。
 */
module.exports = {
  id: 'REG-ROOF-01',
  name: '屋顶种植校验完整点击路径（需盆/拒占用/盆上连种/铲子最上层/旧关隔离）',
  seed: 42,
  run({ game: g, assert }) {
    // —— ① 无盆点投手：拒绝零副作用 ——
    g.setLevel(5);
    g.startGame();
    g.setSun(999);
    g.selectCard(8);            // 投手（索引 8）
    g.clickGrid(2, 2);          // 屋顶空格，无盆
    let p = g.probe();
    assert(p.plants === 0 && p.sun === 999 && !(p.cardCD.cabbage > 0) && p.selected && p.selected.type === 'cabbage',
      '① 无盆点投手应拒绝：零副作用且保留选中（E1 含 150 费卡）',
      [p.plants, p.sun, p.cardCD.cabbage, p.selected]);

    // —— ② 放盆成功 → 有盆格拒再放盆 ——
    g.selectCard(7);            // 花盆（索引 7）
    g.clickGrid(2, 2);
    p = g.probe();
    assert(p.plants === 1 && p.sun === 974 && p.plantsArr[0].type === 'planter',
      '② 放盆应成功并扣费 25', [p.plants, p.sun]);
    g.selectCard(7);
    g.clickGrid(2, 2);          // 同格再点花盆 → 拒（已占用）
    p = g.probe();
    assert(p.plants === 1 && p.sun === 974, '② 有盆格拒再放盆（E2）', [p.plants, p.sun]);

    // —— ③ 盆上连种投手 → 成功；且投手真实开火（cabbage 弹发射）——
    g.selectCard(8);
    g.clickGrid(2, 2);
    p = g.probe();
    assert(p.plants === 2 && p.sun === 824,
      '③ 盆上连种投手成功：plants=2 且扣 25+150', [p.plants, p.sun, p.plantsArr]);
    // 注入同行僵尸驱动投手开火（真实 updatePlant 路径发射 cabbage 弹）
    g.sandbox.__zombies.push({ type: 'normal', row: 2, hp: 9999, maxHp: 9999, spd: 0, x: 700, eating: false, eatAnim: 0, walk: 0, dead: false });
    let guard = 0;
    while (g.probe().projectiles === 0 && guard < 300) { g.tick(0.1); guard++; }
    const shots = g.probe().projectilesArr.filter(pr => pr.type === 'cabbage');
    assert(shots.length >= 1, '③ 投手应对同行僵尸发射 cabbage 弹（updatePlant 分支挂通）',
      g.probe().projectilesArr);
    assert(shots[0].vx === 260, '③ cabbage 弹 vx 应 =260（CABBAGE_VX）', shots[0].vx);

    // —— ④ 铲子最上层语义（E4）：盆+植物 → 铲植物留盆，返一半卡价 75 ——
    g.selectShovel();
    g.clickGrid(2, 2);
    p = g.probe();
    assert(p.plants === 1 && p.plantsArr[0].type === 'planter',
      '④ 铲盆+植物：应移植物留盆（最上层语义）', p.plantsArr);
    assert(p.sun === 824 + 75, '④ 铲投手应返一半卡价 +75（150/2）', p.sun);
    // 空盆 → 铲盆返 25（铲子用后即清，重选）
    g.selectShovel();
    g.clickGrid(2, 2);
    p = g.probe();
    assert(p.plants === 0, '④ 空盆可被铲除', p.plants);
    assert(p.sun === 899 + 25, '④ 铲花盆应返 +25（25 保底）', p.sun);

    // —— ⑤ 隔离锁：L2 陆地关（非 roof）种植零拦截 ——
    g.setLevel(2);
    g.startGame();
    g.setSun(999);
    g.selectCard(8);            // 投手直接点普通陆地格（无盆）
    g.clickGrid(4, 2);
    p = g.probe();
    assert(p.plants === 1 && p.plantsArr[0].type === 'cabbage',
      '⑤ L2 陆地关种植不受屋顶需盆校验拦截（roof 轴仅 roof:true 关生效）', p.plantsArr);
  },
};
