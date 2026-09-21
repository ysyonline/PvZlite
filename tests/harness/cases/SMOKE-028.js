/* SMOKE-028 · L5 屋顶坡壁弹道语义（v1.6 语义翻转 · 直射 vs 投掷分道）· 2026-09-22 V16-QA-1
 * ============================================================================
 * ★ v1.6 语义变更（本用例为唯一「坡上直射命中」覆盖，故随翻转改写）
 * ----------------------------------------------------------------------------
 *   旧（v1.3-M4 / v1.5）：「坡上直线弹贴坡飞行、可命中」——Part A/B/D 断言豌豆在坡上命中扣血。
 *   新（v1.6）           ：「斜坡列直射弹被本格斜壁挡下」——见下契约（与工程侧共用同一份）。
 *
 *   契约（v1.6，以主理人契约为准）：
 *     · 斜坡列 = level.roof && col < ROOF_COLS（col0–4）。
 *     · 斜坡列上的【直射植物】pea / double / snowpea **仍然开火**（cd 重置、音效照常），
 *       但弹体「砸在本格斜壁上随即消失」：不飞行越格、**不命中任何僵尸**。
 *     · 【投掷类】cabbage / melon / corn / icemelon **不受影响**（照常命中）。
 *     · 【平台列】col5–8 上的直射**必须照常命中**（关键判别点）。
 *   ★ 陷阱：liftX() 在平台列 col5–8 也返回 60 ⇒ 判定必须按「列号 < ROOF_COLS」，
 *     绝不可按 liftX>0（那会把平台列一起误伤）。
 * ============================================================================
 * 依据：主理人 V16-QA-1 契约（v1.6 三刀之②屋顶斜坡直射规则变更）。
 * 用例结构（Part A–E）：
 *   - Part A（col4 斜坡末列 · 原「发射 y 抬升」翻转）：直射仍开火（cd 被重置），但不产生
 *            越格飞行弹体（pea 不进入命中窗）。
 *   - Part B（col4 斜坡 · 原「命中 180→160」翻转）：僵尸 hp **保持 180 不变**（不命中）。
 *   - Part C（col6 平台 · 投掷 cabbage）：**保持绿** —— 投掷类不受影响，命中扣 20（180→160）。
 *   - Part D（原「跨坡贴坡命中」翻转）：斜坡列（col0 / col1）直射发射后不命中，hp 保持 180。
 *   - Part E（★ 关键判别 · 新增）：**平台列** col5 / col6 / col8 豌豆**照常命中** 180→160。
 *
 * ★ 判别性硬指标（若把斜坡判定误写成 liftX>0 ⇒ 会误伤平台列）：
 *     · 误用 liftX>0：斜坡列与平台列 lift 均 >0（col0 起已 >0）⇒ 全场直射被禁 ⇒ **Part E 必红**。
 *     · 误写 col<=ROOF_COLS（边界 off-by-one，把平台首列 col5 当斜坡）⇒ **Part E 的 col5 必红**。
 *     · 若删除「开火动作保留」⇒ Part A / Part D 的 cd>0 断言必红。
 *     · 若回归旧语义（坡上可命中）⇒ Part B / Part D 的 hp==180 断言必红。
 * 屋顶需盆：L5 所有屋顶格种植须先放花盆（卡 7），再种豌豆（卡 1）/投手（卡 8）。
 * 时钟：统一走 g.__updateRaw(0.05)（不累 gt ⇒ 隔离波次刷怪，纯弹道/开火观测）。
 */
module.exports = {
  id: 'SMOKE-028',
  name: 'L5 屋顶坡壁弹道语义（v1.6 翻转：斜坡直射挡壁 / 平台照常命中 / 投掷免疫）',
  seed: 42,
  run({ game: g, assert }) {
    const S = g.sandbox;
    const { GRID_X, GRID_Y, CELL_W, CELL_H, COLS } = S.__consts;
    const ROOF_COLS = 5;                                   // 源码顶层 const（不挂 global，无法桥接）；与契约一致
    // ★ liftX 受 roof gate 约束（if(!level.roof)return 0）⇒ 分界前置断言必须放在 setLevel(5) 生效之后
    //   （见下方 Part A 开头的 setupRoof(4,1) 之后再取自证）。默认关非 roof ⇒ 此处取 liftX 恒 0。

    const pushStaticZombie = (x) => {
      const z = { type: 'normal', row: 2, hp: 180, maxHp: 180, spd: 0, x,
        eating: false, eatAnim: 0, walk: 0, dead: false };
      S.__zombies.push(z);
      return z;
    };
    // 屋顶种植前置：先花盆（卡7）再目标植物（cardIdx）
    const setupRoof = (col, cardIdx) => {
      g.setLevel(5); g.startGame(); g.setSun(9999);
      g.selectCard(7); g.clickGrid(col, 2);           // 花盆
      g.selectCard(cardIdx); g.clickGrid(col, 2);     // 主植物
      const p = g.probe();
      assert(p.plants === 2, '前置：col' + col + ' 应放盆+植物=2', p.plants);
    };
    const runDt = (s) => { for (let i = 0; i < Math.round(s / 0.05); i++) g.__updateRaw(0.05); };

    // ---- Part A + Part B：斜坡末列 col4（直射：照常开火 / 弹体挡壁不命中）----
    //   原 Part A（发射 y 抬升）与 Part B（命中 180→160）语义已翻转，合并为本组：
    //   A：开火动作仍发生（cd 被重置 >0）——产品意图「保留开火」不可丢；
    //   A：不产生越格飞行弹体——采样 4s 内任何 pea 弹体均不进入僵尸命中窗；
    //   B：僵尸 hp 严格保持 180（直射不命中）。
    setupRoof(4, 1);                                  // 卡1 = 豌豆（此处 setLevel(5) 生效，liftX 随后可用）

    // 前置：确认斜坡/平台分界落在 ROOF_COLS（须在 setLevel(5) 生效后取 liftX——roof gate 否则恒 0）
    const liftMax = S.liftX(GRID_X + COLS * CELL_W);  // 平台封顶抬升（=ROOF_LIFT_H）
    assert(S.liftX(GRID_X + (ROOF_COLS - 1) * CELL_W + CELL_W / 2) < liftMax - 1e-9,
      '前置：col' + (ROOF_COLS - 1) + ' 应为斜坡列（lift < 平台封顶）',
      [S.liftX(GRID_X + (ROOF_COLS - 1) * CELL_W + CELL_W / 2), liftMax]);
    assert(Math.abs(S.liftX(GRID_X + ROOF_COLS * CELL_W + CELL_W / 2) - liftMax) < 1e-9,
      '前置：col' + ROOF_COLS + ' 应为平台列（lift == 平台封顶）',
      [S.liftX(GRID_X + ROOF_COLS * CELL_W + CELL_W / 2), liftMax]);

    const zAB = pushStaticZombie(760);
    const peaPlant = () => g.probe().plantsArr.find(p => p.type === 'pea');
    g.__updateRaw(0.05);                              // 首帧：cd 0→发射→重置 1.6
    assert(peaPlant() && peaPlant().cd > 0,
      'Part A：斜坡 col4 豌豆应「照常开火」（cd 被重置，>0）——保留开火动作',
      peaPlant());
    let maxPeaX = -Infinity;
    for (let i = 0; i < 80; i++) {                    // 4s
      for (const pr of g.probe().projectilesArr) if (pr.type === 'pea') maxPeaX = Math.max(maxPeaX, pr.x);
      g.__updateRaw(0.05);
    }
    assert(maxPeaX < zAB.x - 42,
      'Part A：斜坡列 pea 不得飞行至命中窗（弹体砸本格斜壁随即消失·不飞行越格）',
      { maxPeaX, zHitWindowLeft: zAB.x - 42, zombieX: zAB.x });
    assert(zAB.hp === 180,
      'Part B：斜坡 col4 直射不得命中（僵尸 hp 严格保持 180）', zAB.hp);

    // ---- Part C：平台 col6 抛物投手 cabbage —— 投掷类不受影响，保持绿 ----
    setupRoof(6, 8);                                  // 卡8 = 投手 cabbage
    const zC = pushStaticZombie(760);
    let guard = 0;
    while (!g.probe().projectilesArr.some(pr => pr.type === 'cabbage') && guard < 200) {
      g.__updateRaw(0.05); guard++;
    }
    assert(g.probe().projectilesArr.some(pr => pr.type === 'cabbage'),
      'Part C：col6 投手应发射 cabbage 弹', g.probe().projectilesArr);
    guard = 0;
    while (zC.hp === 180 && guard < 400) { g.__updateRaw(0.05); guard++; }
    assert(zC.hp === 160,
      'Part C：平台 cabbage 应命中扣 20（180→160；v13-04 投手 dmg20；投掷类不受坡壁影响）', zC.hp);

    // ---- Part D（原跨坡贴坡命中 · 翻转）：斜坡列直射一律不命中 ----
    //   D1 col0 斜坡底 → 平台 col8 僵尸（x=760）；D2 col1 斜坡 → col4 斜坡高位（x=435）。
    //   新语义：发射者在斜坡列 ⇒ 弹体挡壁 ⇒ 无论目标在平台还是斜坡均不命中；开火动作仍发生。
    const slopeShots = [
      { plantCol: 0, zx: 760, label: 'col0 斜坡底 → col8 平台目标' },
      { plantCol: 1, zx: 435, label: 'col1 斜坡 → col4 斜坡高位目标' },
    ];
    for (const cs of slopeShots) {
      setupRoof(cs.plantCol, 1);
      const zD = pushStaticZombie(cs.zx);
      g.__updateRaw(0.05);
      const pp = g.probe().plantsArr.find(p => p.type === 'pea');
      assert(pp && pp.cd > 0, 'Part D（' + cs.label + '）：斜坡直射应照常开火（cd>0）', pp);
      runDt(4);
      assert(zD.hp === 180,
        'Part D（' + cs.label + '）：斜坡列直射不得命中（hp 严格保持 180）', zD.hp);
    }

    // ---- Part E（★ 关键判别 · 新增）：平台列直射照常命中 180→160 ----
    //   col5 为首个平台列（守 off-by-one：col<=ROOF_COLS 误判）、col6 常规平台、col8 平台末列。
    //   ★ 若把斜坡判定误写成 liftX>0（平台 lift 亦 >0）⇒ 三列全 miss ⇒ 本组必红。
    const platformShots = [
      { col: 5, zx: 700, label: 'col5 平台首列' },
      { col: 6, zx: 760, label: 'col6 平台' },
      { col: 8, zx: 900, label: 'col8 平台末列' },
    ];
    for (const ps of platformShots) {
      setupRoof(ps.col, 1);
      const zE = pushStaticZombie(ps.zx);
      let sawFlight = false, guardE = 0;
      // dt=0.02：平台末列 col8 弹体在 0.05s 步长下「发射→命中」可能同一 tick 内完成 ⇒ 采样不到；
      // 用小步长保证命中前至少可观测一帧飞行弹体（作为「确有飞行弹体」的命中前提证据）。
      while (zE.hp === 180 && guardE < 300) {
        if (g.probe().projectilesArr.some(pr => pr.type === 'pea')) sawFlight = true;
        g.__updateRaw(0.02); guardE++;
      }
      assert(sawFlight,
        'Part E（' + ps.label + '）：平台列豌豆应产生飞行弹体（命中前提）', g.probe().projectilesArr);
      assert(zE.hp === 160,
        'Part E（' + ps.label + '）：平台列直射应照常命中扣 20（180→160）', zE.hp);
    }
  },
};
