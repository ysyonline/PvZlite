/* REG-PLANT-01 · 向日葵产阳光节奏（v2.2.8 日夜有别）
 * 白天 7s 首产、之后每 20s（保持既有手感基线）；
 * 夜晚 7s 首产、之后每 24s（对齐原版 PvZ 向日葵周期，且夜晚天空不掉阳光 ⇒ 综合变慢）。
 * 判定用植物自身 sunT 的重置作为权威时间轴。
 * 自然掉落用 setSunFallT(大值) 隔离，避免污染计数。
 */
module.exports = {
  id: 'REG-PLANT-01',
  name: '向日葵产阳光节奏：白天 7s/20s · 夜晚 7s/24s',
  seed: 42,
  run({ game: g, assert }) {
    const sb = g.sandbox;
    const K = sb.__consts;
    const FIRST = K.SUNFLOWER_FIRST;     // 7
    const DAY = K.SUNFLOWER_DAY;          // 20
    const NIGHT = K.SUNFLOWER_NIGHT;      // 24

    /** 种一棵向日葵在 (col, row)，隔离自然掉落，返回 probe。 */
    function plantSunflower(col, row, fallT) {
      g.setSunFallT(fallT || 9999);
      g.setSun(9999);
      g.selectCard(0);            // CARDS[0] = sunflower
      g.clickGrid(col, row);
      return g.probe();
    }

    // ================= S1 · 白天 7s 首产 + 20s 周期 =================
    g.startGame();
    let p = plantSunflower(0, 2, 9999);
    assert(p.plants === 1, 'S1 前置：向日葵已种（白天 1-1）', p.plants);
    assert(Math.abs(p.plantsArr[0].sunT - FIRST) < 1e-6,
      'S1 sunT 初始=' + FIRST, p.plantsArr[0].sunT);

    const resets = [];
    let prev = p.plantsArr[0].sunT;
    for (let i = 0; i < 700; i++) {            // 35s @0.05
      g.tick(0.05);
      const cur = g.probe().plantsArr[0].sunT;
      if (cur > prev + 5) {                    // sunT 跳升=产出
        resets.push(g.probe().gt);
      }
      prev = cur;
    }

    assert(resets.length === 2,
      'S1 白天 35s 内应恰好产 2 次阳光（' + FIRST + 's + ' + DAY + 's）', resets.length);
    assert(Math.abs(resets[0] - FIRST) < 0.2, 'S1 首产 ≈' + FIRST + 's', resets[0]);
    assert(Math.abs(resets[1] - (FIRST + DAY)) < 0.3,
      'S1 第二次 ≈' + (FIRST + DAY) + 's', resets[1]);

    // ================= S2 · 夜晚 24s 间隔 =================
    g.setLevel('1-6');   // 草地 · 夜晚
    g.startGame();
    p = plantSunflower(0, 2, 9999);
    assert(p.plants === 1, 'S2 前置：向日葵已种（夜晚 1-6）', p.plants);
    assert(p.plantsArr[0].sunT === FIRST, 'S2 sunT 初始=' + FIRST, p.plantsArr[0].sunT);

    // 清空 effects 便于计数
    sb.__effects.length = 0;

    // 推进到 7s → 首产
    for (let i = 0; i < 140; i++) g.tick(0.05);   // 7s
    p = g.probe();
    assert(p.plants === 1, 'S2 7s 后向日葵仍存在', p.plants);
    assert(p.plantsArr[0].sunT > 10, 'S2 首产完成后 sunT 重置（>10 判跳升）', p.plantsArr[0].sunT);
    // 首产后 sunT 应 = NIGHT（24），但只验证 >10 避四舍五入
    assert(Math.abs(p.plantsArr[0].sunT - NIGHT) < 0.5,
      'S2 夜晚首产后 sunT 应重置为 ' + NIGHT + 's', p.plantsArr[0].sunT);

    // ================= S3 · 夜晚天空不掉阳光 =================
    g.setLevel('1-6');
    g.startGame();
    // sunFallT=0.05 ⇒ 第一帧就触发，但夜晚不应产生阳光
    g.setSunFallT(0.05);
    g.setSun(9999);
    // 不种向日葵，只推进 0.1s 看 checkWave 的分支
    sb.__effects.length = 0;
    for (let i = 0; i < 20; i++) g.tick(0.05);   // 1s
    p = g.probe();
    const sunCount3 = p.effectsArr.filter(e => e.kind === 'sun').length;
    assert(sunCount3 === 0,
      'S3 夜晚 1s 内不应有天空阳光（sunFallT 触发但夜晚守卫跳过）', sunCount3);

    // 对照：白天应该掉
    g.setLevel('1-1');   // 切回白天
    g.startGame();
    g.setSunFallT(0.05);
    g.setSun(9999);
    sb.__effects.length = 0;
    for (let i = 0; i < 200; i++) g.tick(0.05);   // 10s（白天 7-11s 间隔，至少一次）
    p = g.probe();
    const sunCountDay = p.effectsArr.filter(e => e.kind === 'sun').length;
    assert(sunCountDay >= 1,
      'S3 对照：白天 10s 内应有天空阳光（≥1 次）', sunCountDay);
  },
};