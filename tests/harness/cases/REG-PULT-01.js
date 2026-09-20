/* REG-PULT-01 · 抛物命中算法行为法：静止命中 + 移动目标预测提前量必中（V13 · S1 §3.2）
 * 目的：锁「投手真的打得中」（GDD §3.4 / 架构 §2.3 CONCERN① 闭环）。
 *   ① 静止目标（spd=0, eating=true）：按 §3.4 解算 vy0 后注入 cabbage 弹，命中应扣 40。
 *   ② 移动目标（spd=16 normal）：按「预测提前量」解算（lead = 目标x − spd·t0）后发射，命中应扣 40。
 * 写法遵循 REG-PLANT-04 注入风格：__projectiles.push / __zombies.push，几何取 __consts；
 * 用对象引用读 hp（移动僵尸 x 会变，不可按 x 定位）。解算式与游戏 updatePlant cabbage 分支一致。
 */
module.exports = {
  id: 'REG-PULT-01',
  name: '抛物命中：静止必中 + 移动目标预测提前量必中',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    const K = g.sandbox.__consts;
    const R = 2;
    const zy = K.GRID_Y + R * K.CELL_H + K.CELL_H / 2;   // 行基线（= 投手发射 y，同格基线首项为 0）
    const spawnX = K.GRID_X + 30;                          // 发射点 = 植物格右缘
    const VX = 260, GG = 500;                              // 与 CABBAGE_VX / CABBAGE_G 一致（实现锁定值）

    // —— ① 静止目标（eating 视为静止，spd 写 0）——
    const Zx = 500;
    const sz = { type: 'normal', row: R, hp: 180, maxHp: 180, spd: 0, x: Zx, eating: true, eatAnim: 0, walk: 0, dead: false };
    g.sandbox.__zombies.push(sz);
    const d = Math.max(50, Zx - spawnX), t = d / VX;
    const vy0s = (zy - zy - 0.5 * GG * t * t) / t;
    g.sandbox.__projectiles.push({ x: spawnX, y: zy, vx: VX, vy: vy0s, g: GG, dmg: 40, row: R, type: 'cabbage', splash: 0, dead: false });
    let guard = 0;
    while (g.probe().projectiles > 0 && guard < 600) { g.tick(0.01); guard++; }
    assert(Math.abs(sz.hp - (180 - 40)) < 1e-6, '① 静止目标注入 cabbage 弹应命中扣 40', sz.hp);
    // 移除①的静止目标：其 x=500 恰在②的飞行走廊内（±42 窗），不移除会替死挡弹（实测教训）
    g.sandbox.__zombies.splice(g.sandbox.__zombies.indexOf(sz), 1);

    // —— ② 移动目标（spd=16 normal，预测提前量解算）——
    const Zx2 = 520;
    const mz = { type: 'normal', row: R, hp: 180, maxHp: 180, spd: 16, x: Zx2, eating: false, eatAnim: 0, walk: 0, dead: false };
    g.sandbox.__zombies.push(mz);
    const d0 = Math.max(50, Zx2 - spawnX), t0 = d0 / VX;
    const lead = Zx2 - 16 * t0;                            // 预测飞行后位置（提前量修正）
    const d2 = Math.max(50, lead - spawnX), t2 = d2 / VX;
    const vy0m = (zy - zy - 0.5 * GG * t2 * t2) / t2;
    g.sandbox.__projectiles.push({ x: spawnX, y: zy, vx: VX, vy: vy0m, g: GG, dmg: 40, row: R, type: 'cabbage', splash: 0, dead: false });
    guard = 0;
    while (g.probe().projectiles > 0 && guard < 900) { g.tick(0.01); guard++; }
    assert(Math.abs(mz.hp - (180 - 40)) < 1e-6, '② 移动目标按预测提前量发射应命中扣 40（接近必中）', [mz.hp, mz.x]);
  },
};
