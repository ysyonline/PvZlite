/* REG-THROW-01 · v1.6 第4刀：投掷类真抛物弹道全覆盖（cabbage/melon/corn/icemelon）
 * ============================================================================
 * 锁定「投掷类统一走真抛物抛射 + 越坡命中 + 黄油弹同物理 + 老注入式弹体不被 NaN 打崩 + 音效口径」。
 * 依据：v1.6 第4刀（corn/melon/icemelon 从「直线贴坡」迁移到「真抛物投掷」，复用 cabbage 抛物解算器
 *       fireArcProjectile，物理常量 CABBAGE_VX=260 / CABBAGE_G=500；抛物分支判定 = 字段存在性 pr.vy）。
 *   §1 四类真实开火弹体均带 vy/g，且 vx===260 / g===500
 *      （★ CABBAGE_VX/CABBAGE_G 是顶层 const，不挂桥接 ⇒ 断言写死 260/500）。
 *   §2 抛物弹在斜坡列越坡命中（投掷类通关屋顶斜坡的设计定位）+ 同列直射被坡壁挡下的对照。
 *   §3 黄油弹（corn butter=true）同样走抛物：带 vy/g，抛物飞行后可命中（与普通玉米粒共用同一物理）。
 *   §4 ★ 防线：老注入式「无 vy/g」弹体（corn/melon/icemelon）不被抛物分支污染成 NaN
 *      （保护 REG-PLANT-04 / REG-CHILL-02 / REG-FREEZE-01 三处注入式用例——它们注入的弹体无 vy/g）。
 *   §5 音效口径：四类投掷发射时 SFX.melonThrow 各恰一次、SFX.shoot 零次（与 cabbage 同制）。
 *
 * 时钟：弹道观测走 g.__updateRaw(dt)（不累 gt，隔离波次刷怪）；开火计数走「弹体对象身份去重」
 *       （每 tick 扫描 __projectiles 新增对象，同 tick 多发只记一次）。
 * 音效打桩：整体替换 SFX.melonThrow / SFX.shoot（替换后函数体内 sfxGate 节流被绕过 ⇒ 计数=真实调用数）。
 * ============================================================================
 */
module.exports = {
  id: 'REG-THROW-01',
  name: '投掷类真抛物弹道全覆盖（vy/g · 越坡 · 黄油 · NaN 防线 · 音效口径）',
  seed: 42,
  run({ game: g, loadGame, assert }) {
    const S = g.sandbox;
    const throwers = [
      { card: 8,  type: 'cabbage',  dmg: 20 },
      { card: 5,  type: 'melon',    dmg: 65 },
      { card: 9,  type: 'corn',     dmg: 15 },
      { card: 11, type: 'icemelon', dmg: 65 },
    ];
    const mkZ = (row, x, hp) => ({
      type: 'normal', row, hp, maxHp: hp, spd: 0, x,
      eating: false, eatAnim: 0, walk: 0, dead: false,
    });

    // ---- §1 四类真实开火弹体均带 vy/g，vx===260 / g===500 ----
    for (const th of throwers) {
      g.startGame(); g.setSun(9999);
      g.selectCard(th.card); g.clickGrid(0, 0);
      S.__zombies.push(mkZ(0, 800, 999999));
      g.__updateRaw(0.05);                          // 单帧 → 首弹发射
      const pr = S.__projectiles.find(p => p.type === th.type);
      assert(pr, '§1 ' + th.type + ' 真实开火应产生弹体', S.__projectiles.map(p => p.type));
      assert(pr.vy !== undefined && Number.isFinite(pr.vy),
        '§1 ' + th.type + ' 弹体应带有限 vy（真抛物）', pr.vy);
      assert(pr.g === 500,
        '§1 ' + th.type + ' 弹体 g 应 ===500（CABBAGE_G）', pr.g);
      assert(pr.vx === 260,
        '§1 ' + th.type + ' 弹体 vx 应 ===260（CABBAGE_VX）', pr.vx);
    }

    // ---- §2 斜坡列抛物越坡命中 + 同列直射被挡对照 ----
    //   屋顶需盆：先放花盆（卡7），再种投手/射手。
    const roofSetup = (col, card) => {
      g.setLevel(5); g.startGame(); g.setSun(9999);
      g.selectCard(7); g.clickGrid(col, 2);         // 花盆
      g.selectCard(card); g.clickGrid(col, 2);      // 主植物
    };
    // col2（斜坡列，col<ROOF_COLS=5）种 cabbage → 越坡命中 180→160
    roofSetup(2, 8);
    const z2 = mkZ(2, 500, 180); S.__zombies.push(z2);
    let guard = 0;
    while (z2.hp === 180 && guard < 600) { g.__updateRaw(0.05); guard++; }
    assert(z2.hp === 160,
      '§2 斜坡 col2 抛物 cabbage 应越坡命中扣 20（180→160）', z2.hp);
    // 对照：同列直射豌豆被坡壁挡下 → hp 严格保持 180（判别力来自弹道，非其他因素）
    roofSetup(2, 1);
    const z2p = mkZ(2, 500, 180); S.__zombies.push(z2p);
    for (let i = 0; i < 80; i++) g.__updateRaw(0.05);   // 4s
    assert(z2p.hp === 180,
      '§2 对照：斜坡 col2 直射豌豆应被坡壁挡下、hp 保持 180（投掷越坡 vs 直射挡壁）', z2p.hp);

    // ---- §3 黄油弹同样走抛物 ----
    //   seed=7：corn 首次开火即掷定为黄油弹（butter=true，发射时掷定）。断言黄油弹仍带 vy/g，
    //   且抛物飞行后可命中（180→165 = 主伤 15），与普通玉米粒共用同一物理。
    const gb = loadGame({ seed: 7 });
    const Sb = gb.sandbox;
    gb.startGame(); gb.setSun(9999);
    gb.selectCard(9); gb.clickGrid(0, 0);
    const zb = { type: 'normal', row: 0, hp: 180, maxHp: 180, spd: 0, x: 800, eating: false, eatAnim: 0, walk: 0, dead: false };
    Sb.__zombies.push(zb);
    gb.tick(0.05);
    const bp = Sb.__projectiles.find(p => p.type === 'corn');
    assert(bp && bp.butter === true,
      '§3 seed=7 前置：corn 首弹应为黄油弹（butter=true）', bp && bp.butter);
    assert(bp.vy !== undefined && Number.isFinite(bp.vy) && bp.g === 500,
      '§3 黄油弹应仍带 vy/g（抛物物理，与普通玉米粒同制）', { vy: bp.vy, g: bp.g });
    let gb2 = 0;
    while (zb.hp === 180 && gb2 < 600) { gb.tick(0.05); gb2++; }
    assert(zb.hp === 165,
      '§3 黄油弹抛物飞行后应命中扣 15（180→165）', zb.hp);

    // ---- §4 ★ 防线：老注入式无 vy/g 弹体不被 NaN 打崩 ----
    //   ★ §2 的 setLevel(5) 会在本 game 上残留（startGame 不重置关卡）⇒ 先回 L1，避免屋顶需盆
    //     导致后续 §5 种植被拒（无植物 ⇒ 无开火 ⇒ melonThrow 计数为 0 的假红）。
    g.setLevel(1); g.startGame();
    const K = S.__consts, R = 4;
    const zy = K.GRID_Y + R * K.CELL_H + K.CELL_H / 2;
    for (const t of ['corn', 'melon', 'icemelon']) {
      S.__projectiles.push({ x: 100, y: zy, vx: 220, dmg: 15, row: R, type: t, splash: 30, dead: false });
    }
    for (let i = 0; i < 20; i++) g.__updateRaw(0.05);   // 1s（弹体仍在场）
    const legacy = S.__projectiles.filter(p => ['corn', 'melon', 'icemelon'].includes(p.type));
    assert(legacy.length === 3,
      '§4 前置：三颗注入式无 vy/g 弹体应仍在场（未越界）', legacy.length);
    for (const p of legacy) {
      assert(Number.isFinite(p.y),
        '§4 注入式无 vy/g 弹体 y 不得变 NaN（直线弹零影响生命线）', { type: p.type, y: p.y });
      assert(Math.abs(p.y - zy) < 1e-9,
        '§4 注入式无 vy/g 弹体 y 应恒定（无 vy ⇒ 回落原路径，逐帧等价）', { type: p.type, y: p.y });
    }

    // ---- §5 音效口径：四类投掷各恰一次 melonThrow、零 shoot ----
    for (const th of throwers) {
      g.startGame(); g.setSun(9999);
      g.selectCard(th.card); g.clickGrid(0, 0);
      S.__zombies.push(mkZ(0, 800, 999999));
      let melonThrow = 0, shoot = 0;
      const oM = S.__SFX.melonThrow, oS = S.__SFX.shoot;
      S.__SFX.melonThrow = function () { melonThrow++; };
      S.__SFX.shoot = function () { shoot++; };
      try {
        g.__updateRaw(0.05);                        // 单帧 → 一次开火
      } finally {
        S.__SFX.melonThrow = oM; S.__SFX.shoot = oS;
      }
      assert(melonThrow === 1,
        '§5 ' + th.type + ' 开火应恰调用 SFX.melonThrow ×1（投掷"呼"声）', melonThrow);
      assert(shoot === 0,
        '§5 ' + th.type + ' 开火不得调 SFX.shoot（直射枪口音已废）', shoot);
    }
  },
};
