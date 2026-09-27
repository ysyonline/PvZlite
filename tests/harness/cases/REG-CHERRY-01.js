/* REG-CHERRY-01 · 樱桃（cherry）3×3 格跨行秒杀 —— 机制级回归（V22 刀1 · v2.2.7 消缺改版）
 * ------------------------------------------------------------------
 * 被测契约（源码 updatePlant 'cherry' 分支 + explodeCherry；GDD §3）：
 *   ① 膨胀期（v2.2.5 新增）：种植后 arming=true，armT 从 0 推进，armT≥ONE_SHOT_ARM_TIME(1.2s)
 *      才武装（arming=false）。膨胀期内不可被啃食；
 *   ② ★ v2.2.7 改版：膨胀动画完成即**立即引爆**（不再等待僵尸踩中，有无僵尸均爆）；
 *   ③ 命中：colOf(z.x)=floor((z.x-GRID_X)/CELL_W)，dc=|colOf(z.x)-p.col|、dr=|z.row-p.row|，
 *      dc<=1 && dr<=1 ⇒ killZombie（**本作第一个跨行秒杀**，GDD §3.2/§7.3）；
 *   ④ 棋盘边缘：col=0/8、row=0/4 时 3×3 自然截断，不报错、不补偿（GDD §3.2）；
 *   ⑤ 一次性：引爆后 p._dying，下一帧移除。
 *
 * 常量（实测自 __consts）：GRID_X=55 / CELL_W=90 / GRID_Y=80 / CELL_H=104 / COLS=9 / ROWS=5
 *   列心 x = GRID_X + col*CELL_W + CELL_W/2 = 100 + 90*col
 *
 * ★ v2.2.7 消缺改版：原「膨胀 1.2s 后武装 + 踩中才触发」改为「膨胀 1.2s 后立即自爆」。
 */
module.exports = {
  id: 'REG-CHERRY-01',
  name: '樱桃：膨胀1.2s / 膨胀完成立即自爆 / 3×3格判定(dc<=1&&dr<=1) / 跨行秒杀 / 棋盘边缘截断 / 一次性',
  seed: 42,
  run({ game: g, assert }) {
    const sb = g.sandbox;
    const K = sb.__consts;
    const COL_X = (c) => K.GRID_X + c * K.CELL_W + K.CELL_W / 2;   // 100 + 90*col
    const colOf = (x) => Math.floor((x - K.GRID_X) / K.CELL_W);

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
        arming: false,   // 注入兜底直接视为已武装（真实路径由 spawnPlant 置 arming:true）
        plantT: 620, plantDone: true, dirtDone: true };
      sb.__plants.push(p);
      return p;
    }
    const mkZ = (row, x, type, hp) => ({
      type: type || 'normal', row, hp: hp || 180, maxHp: hp || 180, spd: 0, x,
      eating: false, eatAnim: 0, walk: 0, dead: false,
    });
    function fresh() {
      g.startGame();
      g.setDiff('normal');
      g.setSun(9999);
      g.clearField();
    }
    /** 按 (col,row) 投放僵尸（用列心 x 保证 colOf 命中）。 */
    const at = (col, row) => sb.__zombies.push(mkZ(row, COL_X(col)));
    const aliveSet = (arr) => arr.map((z) => colOf(z.x) + ',' + z.row).sort().join(' ');

    // ================= S1 · 膨胀期守卫 + 膨胀完成自爆 + 3×3 判定 + 跨行秒杀 =================
    fresh();
    place('cherry', 4, 2, 300);
    let p = g.probe();
    assert(p.plants === 1 && p.plantsArr[0].type === 'cherry', 'S1 前置：樱桃已种下', p.plantsArr);
    assert(p.plantsArr[0].arming === true, 'S1 前置：樱桃种下即进入膨胀期（arming=true）', p.plantsArr[0].arming);

    // 3×3 内 9 只（cols 3..5 × rows 1..3），在膨胀期内放好——炸弹自爆时会全清
    [[3, 1], [4, 1], [5, 1], [3, 2], [4, 2], [5, 2], [3, 3], [4, 3], [5, 3]].forEach(([c, r]) => at(c, r));
    // 范围外 5 只：(2,2)dc=2 / (6,2)dc=2 / (4,0)dr=2 / (4,4)dr=2 / (2,0)dc=2&dr=2
    [[2, 2], [6, 2], [4, 0], [4, 4], [2, 0]].forEach(([c, r]) => at(c, r));
    assert(g.probe().zombies === 14, 'S1 前置：14 只僵尸已投放');

    for (let i = 0; i < 10; i++) g.tick(0.05);   // 0.5s < 1.2s（仍在膨胀期）
    p = g.probe();
    assert(p.plants === 1, 'S1 膨胀期内（0.5s<1.2s）不得引爆', p.plantsArr);
    assert(p.zombies === 14 && p.zombiesArr.every((z) => z.hp === 180),
      'S1 膨胀期内僵尸存活且 hp 不变', p.zombiesArr);

    // 过膨胀期 ⇒ 自爆（v2.2.7 核心）
    for (let i = 0; i < 20; i++) g.tick(0.05);   // 累计 1.5s > 1.2s ⇒ 膨胀完成即自爆
    p = g.probe();
    assert(p.plants === 0, 'S1 ★膨胀完成立即自爆消失（3×3 内有僵尸）', p.plantsArr);
    assert(p.zombies === 5, 'S1 3×3 内 9 只应全被秒杀，仅范围外 5 只存活', aliveSet(p.zombiesArr));
    assert(aliveSet(p.zombiesArr) === ['2,2', '6,2', '4,0', '4,4', '2,0'].sort().join(' '),
      'S1 幸存者应恰为 dc=2 / dr=2 的五只（3×3 边界正确）', aliveSet(p.zombiesArr));
    assert(p.zombiesArr.every((z) => z.hp === 180), 'S1 范围外僵尸不得受伤', p.zombiesArr);
    assert(!p.zombiesArr.some((z) => z.row === 1), 'S1 跨行秒杀：row=1（dr=1）应被清空', aliveSet(p.zombiesArr));
    assert(!p.zombiesArr.some((z) => z.row === 3), 'S1 跨行秒杀：row=3（dr=1）应被清空', aliveSet(p.zombiesArr));
    assert(p.score >= 450, 'S1 9 次击杀应结算 ≥450 分', p.score);

    // ================= S2 · 无僵尸也自爆 =================
    fresh();
    place('cherry', 4, 2, 300);
    for (let i = 0; i < 30; i++) g.tick(0.05);   // 1.5s > 1.2s
    p = g.probe();
    assert(p.plants === 0, 'S2 ★膨胀完成后无僵尸也自爆消失', p.plantsArr);
    assert(p.zombies === 0, 'S2 无僵尸场景：自爆不产生额外击杀', p.zombiesArr);

    // ================= S3 · 棋盘边缘：col=0 / row=0（左上） =================
    fresh();
    place('cherry', 0, 0, 300);
    at(0, 0); at(1, 0); at(0, 1); at(1, 1);     // dc/dr ≤1 ⇒ 命中
    at(2, 0); at(0, 2);                            // dc=2 / dr=2 ⇒ 存活
    for (let i = 0; i < 30; i++) g.tick(0.05);
    p = g.probe();
    assert(p.plants === 0, 'S3 左上角樱桃应已自爆（无异常、无越界报错）', p.plantsArr);
    assert(p.zombies === 2 && aliveSet(p.zombiesArr) === ['2,0', '0,2'].sort().join(' '),
      'S3 左上 3×3 应自然截断为 cols{0,1}×rows{0,1}，仅 (2,0)/(0,2) 存活', aliveSet(p.zombiesArr));

    // ================= S4 · 棋盘边缘：col=8 / row=4（右下） =================
    fresh();
    place('cherry', 8, 4, 300);
    assert(colOf(COL_X(8)) === 8, 'S4 前置：colOf(col8 列心)=8', colOf(COL_X(8)));
    at(8, 4); at(7, 4); at(8, 3); at(7, 3);     // dc/dr ≤1 ⇒ 命中
    at(6, 4); at(8, 2);                            // dc=2 / dr=2 ⇒ 存活
    for (let i = 0; i < 30; i++) g.tick(0.05);
    p = g.probe();
    assert(p.plants === 0, 'S4 右下角樱桃应已自爆（无异常、无越界报错）', p.plantsArr);
    assert(p.zombies === 2 && aliveSet(p.zombiesArr) === ['6,4', '8,2'].sort().join(' '),
      'S4 右下 3×3 应自然截断为 cols{7,8}×rows{3,4}，仅 (6,4)/(8,2) 存活', aliveSet(p.zombiesArr));

    // ================= S5 · 一次性：引爆后不复活、不二次触发 =================
    fresh();
    place('cherry', 4, 2, 300);
    for (let i = 0; i < 30; i++) g.tick(0.05);   // 过膨胀期 ⇒ 自爆
    assert(g.probe().plants === 0, 'S5 前置：已自爆消失');
    at(4, 2);
    at(4, 1);
    for (let i = 0; i < 20; i++) g.tick(0.05);   // 1.0s
    p = g.probe();
    assert(p.plants === 0, 'S5 一次性：不得复活/二次引爆', p.plantsArr);
    assert(p.zombies === 2 && p.zombiesArr.every((z) => z.hp === 180),
      'S5 消失后不再产生击杀（新投放僵尸存活且 hp 不变）', p.zombiesArr);
  },
};