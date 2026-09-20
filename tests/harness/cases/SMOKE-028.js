/* SMOKE-028 · L5 屋顶 C2 坡上弹道命中（平台 col6 + 斜坡末列 col4 双列 + 跨坡贴坡 Part D）· 2026-09-19 V13-M4
 * 依据：production/v13-m4-c2-5col-impl-spec.md §2.C/§3（B1–B3 弹道基线抬升）、
 *       production/v13-m4-fix-01.md（V13-M4 FIX-01 直线弹贴坡）、
 *       tests/v13-m4-slope-acceptance.md §2.2（本用例为本轮唯一「坡上命中」覆盖，现状零覆盖）。
 * 语义（α · 地面参考 · 定稿 ADR-005）：gridToPos 已自动抬升发射 y（不改），命中基线 zy 随僵尸地面列抬升。
 *   - Part A：发射 y 抬升 —— col6 pr.y≈272（flatY2−60−8）、col4 pr.y≈278（flatY2−54−8）。
 *             双向守护：既拦「未抬升」（assessment 方案①），也拦 spec §3-B4「重复手减 liftX ⇒ 双重抬升」。
 *   - Part B（核心）：命中扣血 180→160 —— 僵尸置植物「右侧」⇒ 无论 α/β 均应绿；漏改 L1088 则平台列偏差
 *             |zy−pr.y| = 68 > 命中窗 32 ⇒ 全 miss ⇒ 本 Part 变红。
 *   - Part C（次级）：col6 抛物投手 cabbage 命中扣 20（v13-04 投手最终定案 dmg 20，对应 spec §3-B2 cabbage 瞄准基线）。
 *   - Part D（FIX-01 跨坡贴坡）：斜坡底 col0→平台 col8、斜坡 col1→col4 高位 —— 旧恒定 y 偏差 52/46>32 必 miss，
 *             新贴坡（每帧 pr.y=flatY−liftX(pr.x)−yOff）偏差 ≤16 必命中；含「命中 x 邻域偏差 ≤16px」验证线。
 * ★ 判别性硬指标（自检见 production/v13-m4-impl-report.md）：故意让 zy 不抬升（还原 L1088）⇒ Part B 必红；
 *   故意删 updateProjectiles 贴坡重算 ⇒ Part D 必红。
 * 屋顶需盆：所有屋顶格种植必须先放花盆（卡 7），再种豌豆（卡 1）/投手（卡 8）。
 */
module.exports = {
  id: 'SMOKE-028',
  name: 'L5 屋顶 C2 坡上弹道命中（平台 col6 + 斜坡 col4 双列）',
  seed: 42,
  run({ game: g, assert }) {
    const S = g.sandbox;
    const { GRID_Y, CELL_H } = S.__consts;
    const flatY2 = GRID_Y + 2 * CELL_H + CELL_H / 2;      // row2 平面基线 = 340
    const pushStaticZombie = (x) => S.__zombies.push({
      type: 'normal', row: 2, hp: 180, maxHp: 180, spd: 0, x,
      eating: false, eatAnim: 0, walk: 0, dead: false,
    });

    // ---- Part A + Part B：平台 col6（liftX=60）+ 斜坡末列 col4（liftX=54）并跑 ----
    const samples = [{ col: 6, expY: 272 }, { col: 4, expY: 278 }];
    for (const s of samples) {
      g.setLevel(5);
      g.startGame();
      g.setSun(9999);
      g.selectCard(7); g.clickGrid(s.col, 2);   // 花盆（屋顶种植前置）
      g.selectCard(1); g.clickGrid(s.col, 2);   // 豌豆
      let p = g.probe();
      assert(p.plants === 2, 'SMOKE-028 前置：col' + s.col + ' 应放盆+豌豆=2 植物', p.plants);

      pushStaticZombie(760);                    // 僵尸置于植物右侧（同行）⇒ α/β 均应命中

      // Part A：发射抬升（FIX-01 贴坡不变量版）——
      //   ① 不变量：|pr.y − (flat − liftX(pr.x) − yOff)| ≤ 2.5px（上限 = 单个 0.05s tick 的 x 推进在斜坡上的 y 滞后
      //      ≈0.05*340*(60/450)+ε ≈ 2.3px；平台段恒 0）。任意采样 tick 均应成立；断「恒定 y」旧口径反而与贴坡矛盾。
      //   ② 绝对窗：(flat−62−8−3, flat−52−8+3) —— 拦「未抬升」（恒 y≈flat−8=332）与 B4「重复手减 liftX」（≈212/226）。
      let guard = 0;
      while (g.probe().projectiles === 0 && guard < 100) { g.tick(0.05); guard++; }
      const shot = g.probe().projectilesArr.filter(pr => pr.type === 'pea')[0];
      assert(shot, 'SMOKE-028 Part A：col' + s.col + ' 豌豆应已发射', g.probe().projectilesArr);
      assert(Math.abs(shot.y - (flatY2 - S.liftX(shot.x) - 8)) <= 2.5,
        'SMOKE-028 Part A①：col' + s.col + ' 贴坡不变量 pr.y==flat−liftX(pr.x)−8（±单tick滞后）',
        { y: shot.y, x: shot.x, lift: S.liftX(shot.x), flatY2 });
      assert(shot.y > flatY2 - 62 - 8 - 3 && shot.y < flatY2 - 52 - 8 + 3,
        'SMOKE-028 Part A②：col' + s.col + ' 发射 y 应在贴坡窗（≈272–278；拦未抬升 332 与 B4 双重抬升）', shot.y);

      // Part B（核心）：命中扣血 180→160
      guard = 0;
      while (g.probe().zombiesArr[0].hp === 180 && guard < 200) { g.tick(0.05); guard++; }
      assert(g.probe().zombiesArr[0].hp === 160,
        'SMOKE-028 Part B：col' + s.col + ' 坡上豌豆应命中扣 20（180→160）', g.probe().zombiesArr[0].hp);
    }

    // ---- Part C：抛物投手 cabbage 命中扣 40（平台 col6）----
    g.setLevel(5);
    g.startGame();
    g.setSun(9999);
    g.selectCard(7); g.clickGrid(6, 2);   // 花盆
    g.selectCard(8); g.clickGrid(6, 2);   // 投手 cabbage
    let p = g.probe();
    assert(p.plants === 2, 'SMOKE-028 前置：col6 应放盆+投手=2 植物', p.plants);

    pushStaticZombie(760);
    let guard = 0;
    while (g.probe().projectilesArr.filter(pr => pr.type === 'cabbage').length === 0 && guard < 200) {
      g.tick(0.05); guard++;
    }
    assert(g.probe().projectilesArr.some(pr => pr.type === 'cabbage'),
      'SMOKE-028 Part C：col6 投手应发射 cabbage 弹', g.probe().projectilesArr);
    guard = 0;
    while (g.probe().zombiesArr[0].hp === 180 && guard < 400) { g.tick(0.05); guard++; }
    assert(g.probe().zombiesArr[0].hp === 160,
      'SMOKE-028 Part C：cabbage 应命中扣 20（180→160；v13-04 投手最终定案 dmg20）', g.probe().zombiesArr[0].hp);

    // ---- Part D（V13-M4 FIX-01 · 跨坡贴坡命中）----
    // 语义：直线弹每帧 pr.y=flatY−liftX(pr.x)−yOff ⇒ 命中窗 |zy−pr.y|=|liftX(z.x)−liftX(pr.x)|+yOff ≤ yOff+Δlift。
    //   D1 斜坡底 col0（lift=0）→ 平台 col8 僵尸（x=755，lift=60，zy=280）：旧恒定 y=332 偏差 52>32 必 miss；
    //      新贴坡 y=272 偏差 8 必命中（180→160）。
    //   D2 斜坡 col1（lift=0）→ 斜坡高位 col4 僵尸（x=435，lift=54，zy=286）：旧 y=332 偏差 46>32 必 miss；
    //      新贴坡命中窗内偏差 ≤14.3 ≤16 必命中。
    // ★ 几何约束说明：hasZombieAhead 只对植物右侧僵尸开火且直线弹只向右飞，僵尸自右入场向左行，
    //   「平台植物→其左侧斜坡僵尸」场景植物不开火、几何不可构造；跨坡判别以其镜像（低打高）承载，
    //   同一份贴坡代码对两向对称生效（见 production/v13-m4-fix-01-report.md §2）。
    // ★ 判别性硬指标：还原为恒定 y（删 updateProjectiles 贴坡重算）⇒ D1/D2 必红（hp 停 180）。
    const crossSlope = [
      { plantCol: 0, zx: 755, label: 'col0 斜坡底 → col8 平台' },
      { plantCol: 1, zx: 435, label: 'col1 斜坡 → col4 斜坡高位' },
    ];
    for (const cs of crossSlope) {
      g.setLevel(5);
      g.startGame();
      g.setSun(9999);
      g.selectCard(7); g.clickGrid(cs.plantCol, 2);   // 花盆
      g.selectCard(1); g.clickGrid(cs.plantCol, 2);   // 豌豆
      const p0 = g.probe();
      assert(p0.plants === 2, 'Part D 前置：col' + cs.plantCol + ' 应放盆+豌豆=2 植物', p0.plants);

      pushStaticZombie(cs.zx);
      let maxDev = 0, hit = false;
      for (let i = 0; i < 200 && !hit; i++) {
        // 命中前采样飞行偏差（含 ≤16 验证线）：只统计已进入命中 x 邻域（±100px）的 pea
        const zs = g.probe().zombiesArr[0];
        for (const pr of g.probe().projectilesArr) {
          if (pr.type !== 'pea') continue;
          if (Math.abs(pr.x - zs.x) < 40) {
            // dev = |zy(z.x) − pr.y|（zy = flatY2 − liftX(z.x)，与命中判定同口径）
            maxDev = Math.max(maxDev, Math.abs((flatY2 - S.liftX(zs.x)) - pr.y));
          }
        }
        g.tick(0.05);
        hit = g.probe().zombiesArr.length === 0 || g.probe().zombiesArr[0].hp < 180;
      }
      assert(hit, 'Part D（' + cs.label + '）：贴坡 pea 应命中（hp 180→160 或僵尸消失）',
        g.probe().zombiesArr);
      if (!hit) continue;
      const hp = g.probe().zombiesArr.length === 0 ? 0 : g.probe().zombiesArr[0].hp;
      assert(hp === 160 || hp === 0, 'Part D（' + cs.label + '）：命中扣血口径 20（180→160；僵尸 hp≤0 视为整段击杀）', hp);
      assert(maxDev <= 16, 'Part D（' + cs.label + '）：命中 x 邻域飞行偏差应 ≤16px（贴坡验证线）', maxDev);
    }
  },
};
