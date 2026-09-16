/* SMOKE-018 · 已占用格子不能覆盖种植
 * 背景：用户反馈「植物可以覆盖在已经有植物的上面」（2026-09-16）。
 *   种植分支只查阳光+冷却，未查格子占用 → 同格重复种植浪费阳光。
 * 修复：种植前 plants.some(col,row) 占用检查，命中则 deny + toast，保留选中。
 * 断言：
 *   1. 空格种植成功
 *   2. 同格再种被拒绝（植物数不变，不扣阳光）
 *   3. 拒绝后选中保留（可改点别的空格）
 *   4. 换空格仍能正常种（拒绝不影响后续种植）
 *   5. 铲除后同格可再种
 */
module.exports = {
  id: 'SMOKE-018',
  name: '已占用格子不能覆盖种植（deny + 保留选中）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame('harness-occupy');
    g.setSun(9999);

    // ---- 1) 空格种植成功 ----
    g.selectCard(0);                          // 向日葵 cost 50
    g.clickGrid(0, 2);
    let p = g.probe();
    assert(p.plants === 1, '前置：空格种植成功', p.plants);

    // ---- 2) 同格再种被拒绝：不新增、不扣阳光 ----
    const sunBefore = p.sun;
    g.selectCard(1);                          // 豌豆 cost 100
    g.clickGrid(0, 2);
    p = g.probe();
    assert(p.plants === 1, '同格再种不得新增植物', p.plants);
    assert(p.sun === sunBefore, '被拒绝的种植不得扣阳光', [sunBefore, p.sun]);

    // ---- 3) 拒绝后选中保留（修复行为：不 clear selected）----
    g.clickGrid(1, 2);                        // 直接点另一格（无需再选卡）
    p = g.probe();
    assert(p.plants === 2, '拒绝后选中保留：点空格应直接种下', p.plants);

    // ---- 4) 铲除后同格可再种 ----
    g.selectShovel();
    g.clickGrid(0, 2);                        // 铲掉 (0,2)
    p = g.probe();
    assert(p.plants === 1, '前置：铲除成功', p.plants);
    g.tick(10);                               // 走完卡片冷却（向日葵 cd ~7.5s）
    g.selectCard(0);
    g.clickGrid(0, 2);
    p = g.probe();
    assert(p.plants === 2, '铲除后同格可再种', p.plants);
  },
};
