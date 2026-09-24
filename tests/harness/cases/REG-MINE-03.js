/* REG-MINE-03 · 地瓜爆炸无差别秒杀（v2.1.1 消缺）
 * 缺陷：explodeMine 原用 DMG=500 做耐久结算（z.hp-=500; if(z.hp<=0)kill），
 *   导致 HP>500 的僵尸炸不死——铁桶(560)、hard 难度(×1.35)下 normal(243)/bucket(756)、
 *   expert(×1.80) 下几乎全部僵尸。用户拍板：武装后僵尸碰到就死、不存在耐久结算。
 * 本用例锁定：命中范围内任何 HP 的僵尸一律被 killZombie（无差别秒杀）。
 */
module.exports = {
  id: 'REG-MINE-03',
  name: '地瓜爆炸无差别秒杀（高HP/高难度）',
  seed: 42,
  run({ game: g, assert }) {
    // ---- 场景 A：普通难度，铁桶(560) 同格 → 应被秒杀（旧 DMG=500 杀不死）----
    g.startGame();
    g.setSun(9999);
    g.selectCard(2);                 // 地瓜 cost25
    g.clickGrid(1, 2);
    assert(g.probe().plants === 1, '前置：地瓜已种下', g.probe().plantsArr);

    const pos = g.sandbox.gridToPos(1, 2);
    g.sandbox.__zombies.push({
      type: 'bucket', row: 2, hp: 560, maxHp: 560, spd: 0, x: pos.x,
      eating: false, eatAnim: 0, walk: 0, dead: false,
    });
    g.sandbox.__plants[0].armT = 0;   // 直接结束武装期 → 下一帧引爆
    g.tick(0.1);

    let p = g.probe();
    assert(p.plants === 0, 'A：地瓜应已引爆', p.plantsArr);
    assert(p.zombies === 0, 'A：铁桶(560HP)应被无差别秒杀', p.zombiesArr);

    // ---- 场景 B：hard 难度(×1.35)，normal(243) + bucket(756) 同排 → 全秒杀 ----
    g.startGame();
    g.setDiff('hard');
    g.setSun(9999);
    g.selectCard(2);
    g.clickGrid(1, 2);
    assert(g.probe().plants === 1, 'B：前置地瓜已种下', g.probe().plantsArr);

    const posB = g.sandbox.gridToPos(1, 2);
    const mk = (type, hp, x) => ({
      type, row: 2, hp, maxHp: hp, spd: 0, x,
      eating: false, eatAnim: 0, walk: 0, dead: false,
    });
    g.sandbox.__zombies.push(mk('normal', 243, posB.x));       // hard×1.35 normal=243
    g.sandbox.__zombies.push(mk('bucket', 756, posB.x + 40));  // hard×1.35 bucket=756
    g.sandbox.__zombies.push(mk('bucket', 756, posB.x + 80));  // 同排 dx=80 → 范围外存活
    g.sandbox.__plants[0].armT = 0;
    g.tick(0.1);

    p = g.probe();
    assert(p.plants === 0, 'B：地瓜应已引爆', p.plantsArr);
    const row2 = p.zombiesArr.filter(z => z.row === 2);
    assert(row2.length === 1 && row2[0].x === posB.x + 80,
      'B：hard 下 normal(243)/bucket(756) 应被秒杀，仅 dx=80 的 bucket 存活', row2);
    assert(row2[0].hp === 756, 'B：范围外 bucket 不应受伤', row2[0]);
  },
};