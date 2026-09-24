/* SMOKE-027 · 第五关「屋顶」波次平衡契约 + 屋顶轴行为（2026-09-19 V13 · 依据 design/gdd/level-5.md §8.1（v1.2 勘误后）+ production/v13-s1-foundation-review.md §3.1 固化）
 * 锁定 L5 配置契约（规格 T1–T16；T15 卡片总数已按主理人裁决勘误为 9）：
 *   - T1  totalWaves === waves.length === 9（通关判定依赖一致性）
 *   - T2  逐波求和总量 = 42（精确锁）
 *   - T3  类型构成 normal=18 / cone=11 / fast=9 / bucket=4（且无未知类型拼写）
 *   - T4  startSun = 200（独立断言，便于 GDD §9.4 熔断回调 200→175/225 时单点改）
 *   - T5  单波峰值 ≤ 8
 *   - T6  单波 fast 峰值 ≤ 2
 *   - T7  两幕结构锁：单波 bucket ≤2 且全关 =4 且 W1–W5 bucket =0
 *   - T8  minInterval ≥ 6
 *   - T9  big 恰好 3 个，且位置为 W3/W6/W9（索引 2/5/8）
 *   - T10 单调性：逐波只数全非降（[2,3,4,4,4,5,6,6,8]，比 L4 宽松）
 *   - T11 回归锁：L4=8 波原样（全量由 SMOKE-025 拥有，此处轻量互证）
 *   - T12 行为法抽检：newWave(1) 后 9.5s 内 ≤1 只、20s 内 ≤2 只（L5 W1 与 L4 同参数）
 *   - T13 解锁链：通关 L4 → unlockedLevel ≥5；?level=5 直进 probe().levelNo===5
 *   - T14 地形数据锁：lv5.roof===true && lv5.water===false（terrain 互斥主锁）
 *   - T15 卡契约：CARDS 总数=9 / [7]=planter(cost25/cd5/无攻击) / [8]=cabbage(cost100/cd2.0) / [6]=lilypad 保留
 *   - T16 种植校验行为法（镜像 SMOKE-025 T16 但针对 roof）：
 *       ① 屋顶格无盆点豌豆 → 拒绝零副作用（E1）
 *       ② 有盆格点花盆 → 拒绝（已占用，E2 对应）
 *       ③ 屋顶格点花盆 → 成功放盆并扣费
 *       ③b L1 陆地关同格位种植不受屋顶需盆校验拦截（隔离锁，镜像 SMOKE-025 T16③b）
 *       ④ 盆上连种豌豆 → 成功（E3 同帧时序契约）
 *   - T17 睡莲水轴越界锁（2026-09-20 用户反馈「荷叶能种地上和盆上」回归锁）：
 *       ⑤ L1 陆地关点睡莲 → 拒绝零副作用（旧 level.water 前置短路放行的洞）
 *       ⑥ L5 屋顶水行号(4,1)无盆点睡莲 → 拒绝（WATER_ROWS=[1,3] 全局常量误命中的洞）
 *       ⑦ L5 屋顶水行号先放盆再点睡莲 → 拒绝且盆保留（盆上睡莲复合洞）
 *   - T18 花盆屋顶越界锁（2026-09-20 用户反馈「花盆只能放屋顶」回归锁）：
 *       ⑨ L1 陆地关点花盆 → 拒绝零副作用（旧校验只管屋顶需盆、没管非屋顶禁盆的洞）
 *       ⑩ L4 水域关点花盆 → 拒绝（屋顶轴与水轴互斥隔离锁）
 * 注意：勿锁绝对 hp/dur（难度倍率/实现常量会乘上去，GDD §8.3 口径）；断言走 g.sandbox.__LEVELS[5]。
 * 完整点击路径版种植校验独立成 REG-ROOF-01（主理人拍板：SMOKE 本节为轻量行为抽检）。
 */
module.exports = {
  id: 'SMOKE-027',
  name: 'L5 屋顶契约（波次平衡 + 屋顶轴校验）',
  seed: 42,
  run({ game: g, assert }) {
    // ---- T13 解锁链（走真实通关路径至 L4 通关）----
    g.startGame();
    g.setUnlocked(4);
    g.setLevel(4);
    g.startGame();
    g.forceWaves(8);
    g.clearField();
    g.tick(0.1);
    let p = g.probe();
    assert(p.unlockedLevel >= 5, 'T13 通关 L4 后应解锁 L5（屋顶）', p.unlockedLevel);

    // ---- ?level=5 直进 ----
    const g5 = g.sandbox;   // 复用本 sandbox 无法改 location，直进断言改由 setLevel 路径验证（E7 真实 URL 路径由人工 M2 覆盖）
    g.setLevel(5);
    g.startGame();
    p = g.probe();
    assert(p.levelKey === '4-1', 'T13 setLevel(5) 直进应为第五关（v2 键 4-1，旧 L5 屋顶锚）', p.levelKey);

    // ---- 附加：render 层真帧验证（硬规则 3；覆盖屋顶砖纹/城垛渲染分支）----
    const frameErrs = [];
    const origErr = console.error;
    console.error = function () {
      frameErrs.push(Array.prototype.slice.call(arguments).map(String).join(' '));
    };
    try {
      const f = g.rafQueue.shift();
      assert(f, '切 L5 后 rafQueue 应有待跑帧', g.rafQueue.length);
      f(16.7);   // 真帧：update + render（含屋顶皮肤渲染分支）
    } finally {
      console.error = origErr;
    }
    assert(frameErrs.length === 0, 'L5 屋顶渲染帧不得抛异常（console.error 监视网）', frameErrs);

    // ---- 读 L5 波次表做契约断言 ----
    const lv5 = g.sandbox.__LEVELS['4-1'];   // T-102 换键：旧 L5 → '4-1'（屋顶锚，Q-9 迁世界 4）
    assert(lv5.totalWaves === 9 && lv5.waves.length === 9,
      'T1 totalWaves 应 === waves.length === 9', [lv5.totalWaves, lv5.waves.length]);
    assert(lv5.startSun === 200, 'T4 startSun 应 =200（LEVELS 数据）', lv5.startSun);
    assert(!lv5.dusk && !lv5.night, 'L5 屋顶为白天：无 dusk/night 滤镜', { dusk: lv5.dusk, night: lv5.night });

    // ---- T14 地形数据锁（互斥主锁）----
    assert(lv5.roof === true && lv5.water === false,
      'T14 地形锁：roof===true 且 water===false（互斥）', { roof: lv5.roof, water: lv5.water });

    let total = 0, maxWaveSize = 0, minInterval = Infinity, maxFast = 0, maxBucket = 0;
    const typeSum = { normal: 0, cone: 0, fast: 0, bucket: 0 };
    const sizes = [], bigIdx = [], bucketPerWave = [];
    lv5.waves.forEach((w, i) => {
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
    assert(total === 42, 'T2 总量应精确 =42', total);
    assert(typeSum.normal === 18, 'T3 normal 应 =18', typeSum.normal);
    assert(typeSum.cone === 11, 'T3 cone 应 =11', typeSum.cone);
    assert(typeSum.fast === 9, 'T3 fast 应 =9', typeSum.fast);
    assert(typeSum.bucket === 4, 'T3 bucket 应 =4', typeSum.bucket);
    assert(maxWaveSize <= 8, 'T5 单波峰值应 ≤8（W9）', maxWaveSize);
    assert(maxFast <= 2, 'T6 单波 fast 峰值应 ≤2', maxFast);
    assert(maxBucket <= 2, 'T7 单波 bucket 峰值应 ≤2（W9 双桶）', maxBucket);
    assert(typeSum.bucket === bucketPerWave.reduce((a, b) => a + b, 0), 'T7 全关 bucket 合计自洽');
    for (let i = 0; i < 5; i++) {
      assert(bucketPerWave[i] === 0, 'T7 两幕结构锁：W' + (i + 1) + ' bucket 必须 =0（W1–W5 无桶）', bucketPerWave[i]);
    }
    assert(minInterval >= 6, 'T8 minInterval 应 ≥6', minInterval);
    assert(bigIdx.length === 3, 'T9 big 应恰好 3 个（W3/W6/W9）', bigIdx);
    assert(bigIdx[0] === 2 && bigIdx[1] === 5 && bigIdx[2] === 8,
      'T9 三处大波应为 W3/W6/W9（索引 2/5/8）', bigIdx);

    // T10 单调性：L5 严格非降（[2,3,4,4,4,5,6,6,8]）
    for (let i = 1; i < sizes.length; i++) {
      assert(sizes[i] >= sizes[i - 1], 'T10 逐波只数应非降', { sizes, at: i });
    }

    // ---- T11 轻量回归锁（L4 全量断言由 SMOKE-025 原样拥有）----
    assert(g.sandbox.__LEVELS['2-1'].waves.length === 8, 'T11 L4（2-1）仍为 8 波（不回归）');
    assert(g.sandbox.__LEVELS['2-1'].water === true, 'T11 泳池开关不回归');
    assert(g.sandbox.__LEVELS['1-1'].waves.length === 5, 'T11 L1（1-1）仍为 5 波');

    // ---- T15 卡契约（v2.2 扩池：15 张，planter@7 / cabbage@8 不回归，squash/pepper/cherry@12-14）----
    const cards = g.sandbox.__CARDS;
    assert(cards.length === 15, 'T15 卡片总数应 =15（v2.2 新三卡 squash/pepper/cherry）', cards.length);
    const lp = cards[6];
    assert(lp && lp.type === 'lilypad' && lp.cost === 25 && lp.cd === 5, 'T15 睡莲稳居索引 6 不回归', lp && lp.type);
    const pl = cards[7];
    assert(pl && pl.type === 'planter', 'T15 CARDS[7] 应为花盆', pl && pl.type);
    assert(pl.cost === 25, 'T15 花盆 cost 应 =25', pl.cost);
    assert(pl.cd === 5, 'T15 花盆 cd 应 =5', pl.cd);
    const cb = cards[8];
    assert(cb && cb.type === 'cabbage', 'T15 CARDS[8] 应为投手', cb && cb.type);
    assert(cb.cost === 100, 'T15 投手 cost 应 =100（对齐原版 PvZ）', cb.cost);
    assert(cb.cd === 2.0, 'T15 投手 cd 应 =2.0（dps 10.0 不支配；V13-04 设计裁决）', cb.cd);

    // ---- T12 行为法抽检：L5 W1（2 normal，interval 10，与 L4 W1 同参数）----
    g.setWave(0);
    g.setLastWaveT(g.probe().gt);
    g.newWave(1);
    for (let i = 0; i < 95; i++) { g.tick(0.1); }   // 9.5 秒
    assert(g.probe().zombies <= 1, 'T12 interval=10 的波 9.5s 内最多 1 只（刷怪下限契约生效）', g.probe().zombies);
    for (let i = 0; i < 15; i++) { g.tick(0.1); }   // 再 1.5 秒 → 累计 11s
    assert(g.probe().zombies <= 2, 'T12 20s 内第二只应放出（队列耗尽）', g.probe().zombies);

    // ---- T16 种植校验行为法（E1/E2 + 放盆 + 隔离锁 + 盆上连种）----
    g.setLevel(5);
    g.startGame();
    g.setSun(999);
    // ① 屋顶格 (4,2) 无盆点豌豆（卡索引 1）→ 拒绝零副作用且保留选中
    g.selectCard(1);
    g.clickGrid(4, 2);
    p = g.probe();
    assert(p.plants === 0 && p.sun === 999 && !(p.cardCD.pea > 0) && p.selected && p.selected.type === 'pea',
      'T16① 屋顶无盆拒种：零副作用且保留选中（E1）', [p.plants, p.sun, p.cardCD.pea, p.selected]);
    // ③ 屋顶格点花盆（卡索引 7）→ 成功放盆
    g.selectCard(7);
    g.clickGrid(4, 2);
    p = g.probe();
    assert(p.plants === 1 && p.sun === 974, 'T16③ 屋顶放盆成功并扣费 25', [p.plants, p.sun]);
    assert(p.plantsArr[0].type === 'planter' && p.plantsArr[0].col === 4 && p.plantsArr[0].row === 2,
      'T16③ 盆为真实植物实体（睡莲式甲案数据形态）', p.plantsArr[0]);
    // ② 有盆格点花盆 → 拒绝（已占用）
    g.selectCard(7);
    g.clickGrid(4, 2);
    p = g.probe();
    assert(p.plants === 1 && p.sun === 974, 'T16② 有盆格拒再放盆（E2 同构）', [p.plants, p.sun]);
    // ③b L1 陆地关隔离锁：同格位种植不受屋顶需盆校验拦截（roof 轴仅 roof:true 关生效）
    g.setLevel(1);
    g.startGame();
    g.setSun(999);
    g.selectCard(1);
    g.clickGrid(4, 2);   // L1 下 (4,2) 是普通陆地格
    p = g.probe();
    assert(p.plants === 1, 'T16③b L1 陆地关种植不受屋顶校验拦截（roof 轴隔离锁）', p.plants);
    // ④ 回 L5：盆上连种豌豆（E3 同帧时序契约）→ plants=2 且扣费
    g.setLevel(5);
    g.startGame();
    g.setSun(999);
    g.selectCard(7);
    g.clickGrid(4, 2);   // 放盆
    g.selectCard(1);
    g.clickGrid(4, 2);   // 盆上种豌豆
    p = g.probe();
    assert(p.plants === 2 && p.sun === 874,
      'T16④ 盆上连种成功：plants=2 且扣 25+100=125（E3）', [p.plants, p.sun]);

    // ---- T17 睡莲水轴越界锁（2026-09-20 修复回归；睡莲卡索引 6）----
    // ⑤ L1 陆地关点睡莲 → 拒绝零副作用（旧代码 level.water 前置使校验在非水域关整条短路）
    g.setLevel(1);
    g.startGame();
    g.setSun(999);
    g.selectCard(6);
    g.clickGrid(4, 2);
    p = g.probe();
    assert(p.plants === 0 && p.sun === 999 && !(p.cardCD.lilypad > 0) && p.selected && p.selected.type === 'lilypad',
      'T17⑤ 陆地关拒种睡莲：零副作用且保留选中', [p.plants, p.sun, p.cardCD.lilypad, p.selected]);
    // ⑥ L5 屋顶行 1（全局 WATER_ROWS=[1,3] 误命中）无盆点睡莲 → 拒绝
    g.setLevel(5);
    g.startGame();
    g.setSun(999);
    g.selectCard(6);
    g.clickGrid(4, 1);
    p = g.probe();
    assert(p.plants === 0 && p.sun === 999,
      'T17⑥ 屋顶水行号格拒种睡莲（WATER_ROWS 全局常量不越界生效）', [p.plants, p.sun]);
    // ⑦ L5 屋顶行 1 先放盆再点睡莲 → 拒绝且盆保留（盆上睡莲复合洞）
    g.selectCard(7);
    g.clickGrid(4, 1);   // 放盆成功
    p = g.probe();
    assert(p.plants === 1 && p.sun === 974, 'T17⑦-a 屋顶行 1 放盆本身应成功', [p.plants, p.sun]);
    g.selectCard(6);
    g.clickGrid(4, 1);   // 盆上点睡莲 → 水轴锁拦截
    p = g.probe();
    assert(p.plants === 1 && p.sun === 974 && p.plantsArr[0].type === 'planter',
      'T17⑦-b 盆上拒种睡莲：盆保留不被替换', [p.plants, p.sun, p.plantsArr[0] && p.plantsArr[0].type]);
    // ⑧ L4 水域关正路不回归：水格点睡莲仍成功（修复不得误伤水轴正路径）
    g.setLevel(4);
    g.startGame();
    g.setSun(999);
    g.selectCard(6);
    g.clickGrid(4, 1);
    p = g.probe();
    assert(p.plants === 1 && p.plantsArr[0].type === 'lilypad' && p.sun === 974,
      'T17⑧ L4 水格铺睡莲正路径不回归', [p.plants, p.sun]);

    // ---- T18 花盆屋顶越界锁（2026-09-20 修复回归；花盆卡索引 7）----
    // ⑨ L1 陆地关点花盆 → 拒绝零副作用
    g.setLevel(1);
    g.startGame();
    g.setSun(999);
    g.selectCard(7);
    g.clickGrid(4, 2);
    p = g.probe();
    assert(p.plants === 0 && p.sun === 999 && !(p.cardCD.planter > 0) && p.selected && p.selected.type === 'planter',
      'T18⑨ 陆地关拒放花盆：零副作用且保留选中', [p.plants, p.sun, p.cardCD.planter, p.selected]);
    // ⑩ L4 水域关点花盆 → 拒绝（roof/water 轴互斥）
    g.setLevel(4);
    g.startGame();
    g.setSun(999);
    g.selectCard(7);
    g.clickGrid(4, 0);
    p = g.probe();
    assert(p.plants === 0 && p.sun === 999,
      'T18⑩ 水域关拒放花盆（roof 轴仅 roof:true 关生效）', [p.plants, p.sun]);
  },
};
