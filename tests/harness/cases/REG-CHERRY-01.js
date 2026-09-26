/* REG-CHERRY-01 · 樱桃（cherry）3×3 格跨行秒杀 —— 机制级回归（V22 刀1 · v2.2.5 消缺改版）
 * ------------------------------------------------------------------
 * 被测契约（源码 updatePlant 'cherry' 分支 + explodeCherry；GDD §3）：
 *   ① 膨胀期（v2.2.5 新增）：种植后 arming=true，armT 从 0 推进，armT≥ONE_SHOT_ARM_TIME(1.2s)
 *      才武装（arming=false）。膨胀期内不可被踩中触发、不可被啃食；
 *   ② 触发（武装后）：同排 && |z.x - pos.x| < CELL_W*0.55（49.5px）——与地雷/航椒同判据；
 *   ③ 命中：colOf(z.x)=floor((z.x-GRID_X)/CELL_W)，dc=|colOf(z.x)-p.col|、dr=|z.row-p.row|，
 *      dc<=1 && dr<=1 ⇒ killZombie（**本作第一个跨行秒杀**，GDD §3.2/§7.3）；
 *   ④ 棋盘边缘：col=0/8、row=0/4 时 3×3 自然截断，不报错、不补偿（GDD §3.2）；
 *   ⑤ 相邻行同列（dr=1,dc=0）僵尸**不触发**引爆（触发只认同排），但被引爆后会被命中；
 *   ⑥ 一次性：引爆后 p._dying，下一帧移除。
 *
 * 常量（实测自 __consts）：GRID_X=55 / CELL_W=90 / GRID_Y=80 / CELL_H=104 / COLS=9 / ROWS=5
 *   列心 x = GRID_X + col*CELL_W + CELL_W/2 = 100 + 90*col
 *
 * ★ v2.2.5 消缺改版：原「种下当帧触发」契约改为「膨胀 1.2s 后武装才可触发」。
 *   测试内 place() 走真实路径（selectCard→clickGrid）⇒ spawnPlant 置 arming=true，
 *   所有触发场景前须先 tick 过膨胀期（arm(1.2) 辅助函数）。
 */
module.exports = {
  id: 'REG-CHERRY-01',
  name: '樱桃：膨胀1.2s武装 / 3×3格判定(dc<=1&&dr<=1) / 跨行秒杀 / 棋盘边缘截断 / 同排触发 / 一次性',
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
        arming: false,   // v2.2.5：注入兜底直接视为已武装（真实路径由 spawnPlant 置 arming:true）
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
    /** 推进膨胀期至武装完成（真实路径 place 后调用）。 */
    function arm() {
      for (let i = 0; i < 30; i++) g.tick(0.05);   // 1.5s > 1.2s ⇒ 武装完成
    }
    /** 按 (col,row) 投放僵尸（用列心 x 保证 colOf 命中）。 */
    const at = (col, row) => sb.__zombies.push(mkZ(row, COL_X(col)));
    const aliveSet = (arr) => arr.map((z) => colOf(z.x) + ',' + z.row).sort().join(' ');

    // ================= S1 · 膨胀期守卫 + 3×3 判定 + 跨行秒杀 =================
    // 时序注意：9 只触发范围内僵尸在膨胀期内放好 ⇒ arm() 推满后**第一帧即引爆**，
    // 故引爆后不得再读 plantsArr[0]（已消失），武装完成态由 S1b 无僵尸场景单独验证。
    fresh();
    place('cherry', 4, 2, 300);
    let p = g.probe();
    assert(p.plants === 1 && p.plantsArr[0].type === 'cherry', 'S1 前置：樱桃已种下', p.plantsArr);
    assert(p.plantsArr[0].arming === true, 'S1 前置：樱桃种下即进入膨胀期（arming=true）', p.plantsArr[0].arming);

    // 3×3 内 9 只（cols 3..5 × rows 1..3），含中心触发体
    [[3, 1], [4, 1], [5, 1], [3, 2], [4, 2], [5, 2], [3, 3], [4, 3], [5, 3]].forEach(([c, r]) => at(c, r));
    // 范围外 5 只：(2,2)dc=2 / (6,2)dc=2 / (4,0)dr=2 / (4,4)dr=2 / (2,0)dc=2&dr=2
    [[2, 2], [6, 2], [4, 0], [4, 4], [2, 0]].forEach(([c, r]) => at(c, r));
    assert(g.probe().zombies === 14, 'S1 前置：14 只僵尸已投放');

    for (let i = 0; i < 10; i++) g.tick(0.05);   // 0.5s < 1.2s（仍在膨胀期）
    p = g.probe();
    assert(p.plants === 1, 'S1 膨胀期内（0.5s<1.2s）僵尸踩上不得引爆', p.plantsArr);
    assert(p.zombies === 14 && p.zombiesArr.every((z) => z.hp === 180),
      'S1 膨胀期内僵尸存活且 hp 不变', p.zombiesArr);

    arm();                                       // 过膨胀期 ⇒ 武装完成 ⇒ 第一帧引爆
    p = g.probe();
    assert(p.plants === 0, 'S1 武装完成同帧引爆消失（3×3 内有触发体）', p.plantsArr);
    assert(p.zombies === 5, 'S1 3×3 内 9 只应全被秒杀，仅范围外 5 只存活', aliveSet(p.zombiesArr));
    assert(aliveSet(p.zombiesArr) === ['2,2', '6,2', '4,0', '4,4', '2,0'].sort().join(' '),
      'S1 幸存者应恰为 dc=2 / dr=2 的五只（3×3 边界正确）', aliveSet(p.zombiesArr));
    assert(p.zombiesArr.every((z) => z.hp === 180), 'S1 范围外僵尸不得受伤', p.zombiesArr);
    // 跨行：rows 1 与 3（dr=1）应被清空 —— 本作第一个跨行秒杀的硬证据
    assert(!p.zombiesArr.some((z) => z.row === 1), 'S1 跨行秒杀：row=1（dr=1）应被清空', aliveSet(p.zombiesArr));
    assert(!p.zombiesArr.some((z) => z.row === 3), 'S1 跨行秒杀：row=3（dr=1）应被清空', aliveSet(p.zombiesArr));
    assert(p.score >= 450, 'S1 9 次击杀应结算 ≥450 分', p.score);

    // ================= S1b · 武装完成态：无触发体时 arming 翻转为 false =================
    fresh();
    place('cherry', 4, 2, 300);
    arm();
    p = g.probe();
    assert(p.plants === 1, 'S1b 无触发体时武装后樱桃仍在场', p.plantsArr);
    assert(p.plantsArr[0].arming === false, 'S1b 膨胀期后武装完成（arming=false）', p.plantsArr[0].arming);

    // ================= S2 · 触发只认同排：相邻行同列不引爆 =================
    fresh();
    place('cherry', 4, 2, 300);
    arm();
    at(4, 1);                                    // dr=1, dc=0，但**异排** ⇒ 不得触发
    at(4, 3);
    for (let i = 0; i < 20; i++) g.tick(0.05);   // 1.0s
    p = g.probe();
    assert(p.plants === 1, 'S2 相邻行同列的僵尸不得触发引爆（触发只认同排）', p.plantsArr);
    assert(p.zombies === 2 && p.zombiesArr.every((z) => z.hp === 180),
      'S2 未引爆前任何僵尸不得受伤', p.zombiesArr);
    // 补一只同排触发体 ⇒ 立即引爆，且相邻行那两只被 3×3 命中
    at(4, 2);
    g.tick(0.016);
    p = g.probe();
    assert(p.plants === 0, 'S2 同排僵尸出现后应立即引爆', p.plantsArr);
    assert(p.zombies === 0, 'S2 引爆后 3×3 内的相邻行僵尸一并被秒杀', p.zombiesArr);

    // ================= S3 · 棋盘边缘：col=0 / row=0（左上） =================
    fresh();
    place('cherry', 0, 0, 300);
    arm();
    at(0, 0);                                    // 触发体（同排同格）
    at(1, 0);                                    // dc=1,dr=0 ⇒ 命中
    at(0, 1);                                    // dc=0,dr=1 ⇒ 命中
    at(1, 1);                                    // dc=1,dr=1 ⇒ 命中
    at(2, 0);                                    // dc=2 ⇒ 存活
    at(0, 2);                                    // dr=2 ⇒ 存活
    g.tick(0.016);
    p = g.probe();
    assert(p.plants === 0, 'S3 左上角樱桃应已引爆（无异常、无越界报错）', p.plantsArr);
    assert(p.zombies === 2 && aliveSet(p.zombiesArr) === ['2,0', '0,2'].sort().join(' '),
      'S3 左上 3×3 应自然截断为 cols{0,1}×rows{0,1}，仅 (2,0)/(0,2) 存活', aliveSet(p.zombiesArr));

    // ================= S4 · 棋盘边缘：col=8 / row=4（右下） =================
    fresh();
    place('cherry', 8, 4, 300);
    arm();
    assert(colOf(COL_X(8)) === 8, 'S4 前置：colOf(col8 列心)=8', colOf(COL_X(8)));
    at(8, 4);                                    // 触发体
    at(7, 4);                                    // dc=1,dr=0 ⇒ 命中
    at(8, 3);                                    // dc=0,dr=1 ⇒ 命中
    at(7, 3);                                    // dc=1,dr=1 ⇒ 命中
    at(6, 4);                                    // dc=2 ⇒ 存活
    at(8, 2);                                    // dr=2 ⇒ 存活
    g.tick(0.016);
    p = g.probe();
    assert(p.plants === 0, 'S4 右下角樱桃应已引爆（无异常、无越界报错）', p.plantsArr);
    assert(p.zombies === 2 && aliveSet(p.zombiesArr) === ['6,4', '8,2'].sort().join(' '),
      'S4 右下 3×3 应自然截断为 cols{7,8}×rows{3,4}，仅 (6,4)/(8,2) 存活', aliveSet(p.zombiesArr));

    // ================= S5 · 一次性：引爆后不复活、不二次触发 =================
    fresh();
    place('cherry', 4, 2, 300);
    arm();
    at(4, 2);
    g.tick(0.016);
    assert(g.probe().plants === 0, 'S5 前置：已引爆消失');
    at(4, 2);
    at(4, 1);
    for (let i = 0; i < 20; i++) g.tick(0.05);   // 1.0s
    p = g.probe();
    assert(p.plants === 0, 'S5 一次性：不得复活/二次引爆', p.plantsArr);
    assert(p.zombies === 2 && p.zombiesArr.every((z) => z.hp === 180),
      'S5 消失后不再产生击杀（新投放僵尸存活且 hp 不变）', p.zombiesArr);
  },
};
