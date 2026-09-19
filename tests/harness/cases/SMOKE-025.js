/* SMOKE-025 · 第四关「泳池」波次平衡契约 + 水轴行为（2026-09-18 V12 · 依据 design/gdd/level-4.md §8.1 固化）
 * 锁定 L4 配置契约（GDD §8.1 T1–T16）：
 *   - T1  totalWaves === waves.length === 8（通关判定依赖一致性）
 *   - T2  逐波求和总量 = 38（精确锁）
 *   - T3  类型构成 normal=16 / cone=10 / fast=8 / bucket=4（且无未知类型拼写）
 *   - T4  startSun = 150（独立断言，便于 GDD §9.4 熔断回调 150→100 时单点改）
 *   - T5  单波峰值 ≤ 8
 *   - T6  单波 fast 峰值 ≤ 2
 *   - T7  两幕结构锁：单波 bucket ≤2 且全关 =4 且 W1–W5 bucket =0
 *   - T8  minInterval ≥ 6
 *   - T9  big 恰好 3 个，且位置为 W3/W6/W8
 *   - T10 单调性：逐波只数仅允许 W5 一处回落（W4 5→W5 4）
 *   - T11 回归锁：L1=5波13只、L2 ≤25、L3=33（SMOKE-024 原样另跑，此处只做轻量互证）
 *   - T12 行为法抽检：newWave(1) 后 9.5s 内 ≤1 只、20s 内 ≤2 只（L4 W1 与 L3 同参数）
 *   - T13 解锁链：通关 L3 → unlockedLevel ≥4（真实 forceWaves 路径）
 *   - T14 水域数据锁：__consts.WATER_ROWS deep-equal [1,3] 且值域 ⊂ [0,ROWS)
 *   - T15 睡莲卡契约：CARDS.length=7 / CARDS[6].type='lilypad' / cost=25 / cd=5
 *   - T16 种植校验行为法（E1/E2/E3 + E4 铲子 A 案）：
 *       ① 水格无垫点豌豆 → 拒绝零副作用（plants=0，sun 不变，cardCD.pea 不进 CD）
 *       ② 陆地点睡莲 → 拒绝零副作用
 *       ③ 水格点睡莲 → plants=1 且扣费
 *       ④ 垫上连种豌豆 → plants=2 且两次扣费（E3 同帧时序契约）
 *       ⑤ 铲垫+植物 → 先移植物留垫（E4 A 案：铲子作用于最上层实体）
 *   - 附加（render 层，硬规则 3）：切 L4 后用真帧跑 render（覆盖水面渐变分支），
 *       console.error 监视网确认无帧异常（SMOKE-024 手法原样）。
 * 注意：勿锁绝对 hp（难度倍率会乘上去，GDD §8.3）；断言走 g.sandbox.__LEVELS[4]。
 */
module.exports = {
  id: 'SMOKE-025',
  name: 'L4 泳池契约（波次平衡 + 水轴校验）',
  seed: 42,
  run({ game: g, assert }) {
    const p0 = g.probe();
    assert(p0.unlockedLevel >= 1, '初始 unlockedLevel 应 >=1', p0.unlockedLevel);

    // ---- T13 解锁链（走真实通关路径至 L3 通关，参考 SMOKE-011/024）----
    g.startGame();                       // L1（默认关）
    g.forceWaves(5);
    g.clearField();
    g.tick(0.1);
    let p = g.probe();
    assert(p.unlockedLevel >= 2, 'T13 通关 L1 后应解锁 L2', p.unlockedLevel);

    g.setLevel(2);
    g.startGame();
    g.forceWaves(6);
    g.clearField();
    g.tick(0.1);
    p = g.probe();
    assert(p.unlockedLevel >= 3, 'T13 通关 L2 后应解锁 L3', p.unlockedLevel);

    g.setLevel(3);
    g.startGame();
    g.forceWaves(7);
    g.clearField();
    g.tick(0.1);
    p = g.probe();
    assert(p.unlockedLevel >= 4, 'T13 通关 L3 后应解锁 L4（泳池）', p.unlockedLevel);

    // ---- T11 轻量回归锁（L3 全量断言由 SMOKE-024 原样保留）----
    assert(g.sandbox.__LEVELS[3].waves.length === 7, 'T11 L3 仍为 7 波（不回归）');
    assert(g.sandbox.__LEVELS[1].waves.length === 5, 'T11 L1 仍为 5 波');
    assert(g.sandbox.__LEVELS[2].waves.length === 6, 'T11 L2 仍为 6 波');

    // ---- 切到第四关，运行时校验 T4 ----
    g.setLevel(4);
    g.startGame();
    p = g.probe();
    assert(p.levelNo === 4, '应处于第四关', p.levelNo);
    assert(p.sun === 150, 'T4 开局阳光应 =150（运行时）', p.sun);

    // ---- 附加：render 层真帧验证（硬规则 3）----
    // 水面渐变 + 相位波纹分支在 drawGameWorld 内，只有真 loop 帧才会执行。
    const frameErrs = [];
    const origErr = console.error;
    console.error = function () {
      frameErrs.push(Array.prototype.slice.call(arguments).map(String).join(' '));
    };
    try {
      const f = g.rafQueue.shift();
      assert(f, '切 L4 后 rafQueue 应有待跑帧', g.rafQueue.length);
      f(16.7);   // 真帧：update + render（含水面渲染分支）
    } finally {
      console.error = origErr;
    }
    assert(frameErrs.length === 0, 'L4 水面渲染帧不得抛异常（console.error 监视网）', frameErrs);

    // ---- 读 L4 波次表做契约断言（sandbox 桥接 LEVELS）----
    const lv4 = g.sandbox.__LEVELS[4];
    assert(lv4.totalWaves === 8 && lv4.waves.length === 8,
      'T1 totalWaves 应 === waves.length === 8', [lv4.totalWaves, lv4.waves.length]);
    assert(lv4.startSun === 150, 'T4 startSun 应 =150（LEVELS 数据）', lv4.startSun);
    assert(!lv4.dusk && !lv4.night, 'L4 泳池为白天：无 dusk/night 滤镜', { dusk: lv4.dusk, night: lv4.night });
    assert(lv4.water === true, 'L4 应 water:true（水域开关；L1–L3 无此字段即全陆地零感知）', lv4.water);

    let total = 0, maxWaveSize = 0, minInterval = Infinity, maxFast = 0, maxBucket = 0;
    const typeSum = { normal: 0, cone: 0, fast: 0, bucket: 0 };
    const sizes = [], bigIdx = [], bucketPerWave = [];
    lv4.waves.forEach((w, i) => {
      let size = 0, fast = 0, bucket = 0;
      for (const [type, cnt] of w.spawns) {
        assert(typeSum[type] !== undefined, 'T3 第 ' + (i + 1) + ' 波含未知僵尸类型（波表拼写错）', type);
        typeSum[type] += cnt;
        size += cnt;
        if (type === 'fast') fast += cnt;
        if (type === 'bucket') bucket += cnt;
      }
      total += size;
      sizes.push(size);
      bucketPerWave.push(bucket);
      if (w.big) bigIdx.push(i);
      maxWaveSize = Math.max(maxWaveSize, size);
      maxFast = Math.max(maxFast, fast);
      maxBucket = Math.max(maxBucket, bucket);
      minInterval = Math.min(minInterval, w.interval);
    });
    assert(total === 38, 'T2 总量应精确 =38', total);
    assert(typeSum.normal === 16, 'T3 normal 应 =16', typeSum.normal);
    assert(typeSum.cone === 10, 'T3 cone 应 =10', typeSum.cone);
    assert(typeSum.fast === 8, 'T3 fast 应 =8', typeSum.fast);
    assert(typeSum.bucket === 4, 'T3 bucket 应 =4', typeSum.bucket);
    assert(maxWaveSize <= 8, 'T5 单波峰值应 ≤8', maxWaveSize);
    assert(maxFast <= 2, 'T6 单波 fast 峰值应 ≤2', maxFast);
    assert(maxBucket <= 2, 'T7 单波 bucket 峰值应 ≤2（W8 双桶）', maxBucket);
    assert(typeSum.bucket === bucketPerWave.reduce((a, b) => a + b, 0), 'T7 全关 bucket 合计自洽');
    for (let i = 0; i < 5; i++) {
      assert(bucketPerWave[i] === 0, 'T7 两幕结构锁：W' + (i + 1) + ' bucket 必须 =0（W1–W5 无桶）', bucketPerWave[i]);
    }
    assert(minInterval >= 6, 'T8 minInterval 应 ≥6', minInterval);
    assert(bigIdx.length === 3, 'T9 big 应恰好 3 个（W3/W6/W8）', bigIdx);
    assert(bigIdx[0] === 2 && bigIdx[1] === 5 && bigIdx[2] === 7,
      'T9 三处大波应为 W3/W6/W8', bigIdx);

    // T10 单调性：只允许 W5 一处回落（W4 5→W5 4），其余逐波不降
    const drops = [];
    for (let i = 1; i < sizes.length; i++) if (sizes[i] < sizes[i - 1]) drops.push(i);
    assert(drops.length === 1 && drops[0] === 4, 'T10 逐波只数仅允许 W5 一处回落（5→4）', { sizes, drops });

    // ---- T14 水域数据锁 ----
    const wr = g.sandbox.__consts.WATER_ROWS;
    assert(Array.isArray(wr) && wr.length === 2 && wr[0] === 1 && wr[1] === 3,
      'T14 WATER_ROWS 应 deep-equal [1,3]', wr);
    for (const r of wr) {
      assert(Number.isInteger(r) && r >= 0 && r < g.sandbox.__consts.ROWS,
        'T14 水行值域应 ⊂ [0,ROWS)', r);
    }

    // ---- T15 卡契约（V13 平移：全局 9 张，睡莲稳居 6，新两卡在尾部）----
    const cards = g.sandbox.__CARDS;
    assert(cards.length === 9, 'T15 卡片总数应 =9（L4 七张+花盆+投手；V13-S1 §3.5-A 平移）', cards.length);
    const lp = cards[6];
    assert(lp && lp.type === 'lilypad', 'T15 CARDS[6] 应为睡莲', lp && lp.type);
    assert(lp.cost === 25, 'T15 睡莲 cost 应 =25', lp.cost);
    assert(lp.cd === 5, 'T15 睡莲 cd 应 =5（拍板项③）', lp.cd);
    const pl = cards[7];
    assert(pl && pl.type === 'planter' && pl.cost === 25 && pl.cd === 5,
      'T15 CARDS[7] 应为花盆（cost25/cd5/无攻击）', pl);
    const cb = cards[8];
    assert(cb && cb.type === 'cabbage' && cb.cost === 100 && cb.cd === 3.0,
      'T15 CARDS[8] 应为投手（cost100/cd3.0）', cb);

    // ---- T12 行为法抽检：L4 W1（2 normal，interval 10，与 L3 同参数）----
    g.setWave(0);
    g.setLastWaveT(g.probe().gt);
    g.newWave(1);
    for (let i = 0; i < 95; i++) { g.tick(0.1); }   // 9.5 秒
    assert(g.probe().zombies <= 1, 'T12 interval=10 的波 9.5s 内最多 1 只（刷怪下限契约生效）', g.probe().zombies);
    for (let i = 0; i < 15; i++) { g.tick(0.1); }   // 再 1.5 秒 → 累计 11s
    assert(g.probe().zombies <= 2, 'T12 20s 内第二只应放出（队列耗尽）', g.probe().zombies);

    // ---- T16 种植校验行为法（E1/E2/E3 + E4 铲子 A 案）----
    g.setLevel(4);
    g.startGame();
    g.setSun(999);
    // ① 水格 (4,1) 无垫点豌豆（卡 2，索引 1）→ 拒绝零副作用
    g.selectCard(1);
    g.clickGrid(4, 1);
    p = g.probe();
    assert(p.plants === 0 && p.sun === 999 && !(p.cardCD.pea > 0) && p.selected && p.selected.type === 'pea',
      'T16① 水格无垫拒种：零副作用且保留选中（E1）', [p.plants, p.sun, p.cardCD.pea, p.selected]);
    // ② 陆格 (4,0) 点睡莲（卡 7，索引 6）→ 拒绝零副作用
    g.selectCard(6);
    g.clickGrid(4, 0);
    p = g.probe();
    assert(p.plants === 0 && p.sun === 999 && !(p.cardCD.lilypad > 0),
      'T16② 陆地拒种睡莲：零副作用（E2）', [p.plants, p.sun, p.cardCD.lilypad]);
    // ③ 水格 (4,1) 点睡莲 → 成功铺垫
    g.clickGrid(4, 1);
    p = g.probe();
    assert(p.plants === 1 && p.sun === 974,
      'T16③ 水格铺垫成功并扣费 25', [p.plants, p.sun]);
    assert(p.plantsArr[0].type === 'lilypad' && p.plantsArr[0].col === 4 && p.plantsArr[0].row === 1,
      'T16③ 垫为真实植物实体（甲案数据形态）', p.plantsArr[0]);
    // ③b L1–L3 陆地关回归锁：同一格位种植不受水轴校验影响
    g.setLevel(1);
    g.startGame();
    g.setSun(999);
    g.selectCard(1);
    g.clickGrid(4, 1);   // L1 下 (4,1) 是普通陆地格
    p = g.probe();
    assert(p.plants === 1, 'T16③b L1 陆地关水行格位种植不受拦截（水轴仅 water:true 关生效）', p.plants);
    // ④ 回 L4：同格连种豌豆（E3 同帧时序契约）→ plants=2 且扣费
    g.setLevel(4);
    g.startGame();
    g.setSun(999);
    g.selectCard(6);
    g.clickGrid(4, 1);   // 铺垫
    g.selectCard(1);
    g.clickGrid(4, 1);   // 垫上种豌豆
    p = g.probe();
    assert(p.plants === 2 && p.sun === 874,
      'T16④ 垫上连种成功：plants=2 且两次扣费（E3）', [p.plants, p.sun]);
    // ⑤ E4 铲子 A 案+返还（2026-09-18 真机反馈修订）：垫+植物 → 铲最上层（豌豆留垫）+ 返一半卡价
    g.selectShovel();
    g.clickGrid(4, 1);
    p = g.probe();
    assert(p.plants === 1 && p.plantsArr[0].type === 'lilypad',
      'T16⑤ 铲垫+植物：移植物留垫（E4 A 案）', p.plantsArr);
    assert(p.sun === 874 + 50, 'T16⑤a 铲豌豆应返一半卡价 +50（100/2）', p.sun);
    // ⑤b 仅空垫 → 铲垫（铲子用后即清，须重选——SMOKE-018 同款惯例）+ 返 25
    g.selectShovel();
    g.clickGrid(4, 1);
    p = g.probe();
    assert(p.plants === 0, 'T16⑤b 空垫可被铲除（A 案语义完整）', p.plants);
    assert(p.sun === 924 + 25, 'T16⑤b-a 铲睡莲应返一半卡价 +25（25 向上取整保底）', p.sun);
    // ⑤c 陆地格铲子行为不回归
    g.selectCard(1);
    g.clickGrid(4, 0);
    g.selectShovel();
    g.clickGrid(4, 0);
    p = g.probe();
    assert(p.plants === 0, 'T16⑤c 陆地格铲除行为不回归');
  },
};
