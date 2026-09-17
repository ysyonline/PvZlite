/* SMOKE-024 · 第三关「月夜草坪」波次平衡契约（2026-09-17 V11-08 · 依据 design/gdd/level-3.md §8 固化）
 * 锁定 L3 配置契约（GDD §8.1 T1–T10 / T12 / T13）：
 *   - T1  totalWaves === waves.length === 7（通关判定依赖一致性）
 *   - T2  逐波求和总量 = 33（精确锁，不给区间）
 *   - T3  类型构成 normal=15 / cone=8 / fast=8 / bucket=2（且无未知类型拼写）
 *   - T4  startSun = 100（独立断言，便于 GDD §9.4 熔断回调时单点改）
 *   - T5  单波峰值 ≤ 8
 *   - T6  单波 fast 峰值 ≤ 2
 *   - T7  单波 bucket 峰值 ≤ 1 且全关 = 2
 *   - T8  minInterval ≥ 6
 *   - T9  big 恰好 3 个，且首大波在 W3（W3/W5/W7）
 *   - T10 单调性：逐波只数仅允许 W5 一处回落（W4 5→W5 4）
 *   - T12 行为法抽检：newWave(1) 后 9.5s 内 ≤1 只、20s 内 ≤2 只（interval=10，SMOKE-011 手法）
 *   - T13 解锁链：通 L1 → ≥2；通 L2 → ≥3（走 startGame+forceWaves+clearField 真实路径；
 *       ?level=3 URL 直进 harness 不测）
 *   - 附加：L3 night 滤镜开关在位且不与 dusk 混用；L2 dusk 暖色滤镜不回归
 *   - 附加（render 层，硬规则 3）：切 L3 后用 __stepFrame 跑一帧真 loop（经 render，
 *       覆盖 level.night 渐变分支），console.error 监视网确认无帧异常——逻辑层烟雾
 *       抓不到 render bug（S0 lastDt 冻结教训），render 改动必带真帧。
 * 注意：勿锁绝对 hp（难度倍率会乘上去，GDD §8.3）；断言走 g.sandbox.__LEVELS[3]。
 * 选关路径：g.setLevel(n)（harness 内闭包直改，与菜单选关同款赋值路径）。
 */
module.exports = {
  id: 'SMOKE-024',
  name: 'L3 波次平衡契约（月夜草坪固化）',
  seed: 42,
  run({ game: g, assert }) {
    const p0 = g.probe();
    assert(p0.unlockedLevel >= 1, '初始 unlockedLevel 应 >=1', p0.unlockedLevel);

    // ---- T13 解锁链（走真实通关路径，参考 SMOKE-011）----
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

    // 切到第三关（菜单选关同款赋值路径），开局即校验 T4 走的是运行时路径
    g.setLevel(3);
    g.startGame();
    p = g.probe();
    assert(p.levelNo === 3, '应处于第三关', p.levelNo);
    assert(p.sun === 100, 'T4 开局阳光应 =100（运行时）', p.sun);

    // ---- 附加：render 层真帧验证（硬规则 3）----
    // night 渐变分支在 drawGameWorld 内，只有真 loop 帧才会执行。
    // console.error 监视网 + __stepFrame 消费一帧真 loop（update + render 全链路），
    // 帧内任何异常都会被 loop 的 try/catch 记入 frameErr 并 console.error。
    const frameErrs = [];
    const origErr = console.error;
    console.error = function () {
      frameErrs.push(Array.prototype.slice.call(arguments).map(String).join(' '));
    };
    try {
      const f = g.rafQueue.shift();
      assert(f, '切 L3 后 rafQueue 应有待跑帧', g.rafQueue.length);
      f(16.7);   // 真帧：update + render（含 level.night 渐变分支）
    } finally {
      console.error = origErr;
    }
    assert(frameErrs.length === 0, 'L3 night 渲染帧不得抛异常（console.error 监视网）', frameErrs);

    // ---- 读 L3 波次表做契约断言（sandbox 桥接 LEVELS）----
    const lv3 = g.sandbox.__LEVELS[3];
    assert(lv3.totalWaves === 7 && lv3.waves.length === 7,
      'T1 totalWaves 应 === waves.length === 7', [lv3.totalWaves, lv3.waves.length]);
    assert(lv3.startSun === 100, 'T4 startSun 应 =100（LEVELS 数据）', lv3.startSun);

    let total = 0, maxWaveSize = 0, minInterval = Infinity, maxFast = 0, maxBucket = 0;
    const typeSum = { normal: 0, cone: 0, fast: 0, bucket: 0 };
    const sizes = [], bigIdx = [];
    lv3.waves.forEach((w, i) => {
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
      if (w.big) bigIdx.push(i);
      maxWaveSize = Math.max(maxWaveSize, size);
      maxFast = Math.max(maxFast, fast);
      maxBucket = Math.max(maxBucket, bucket);
      minInterval = Math.min(minInterval, w.interval);
    });
    assert(total === 33, 'T2 总量应精确 =33', total);
    assert(typeSum.normal === 15, 'T3 normal 应 =15', typeSum.normal);
    assert(typeSum.cone === 8, 'T3 cone 应 =8', typeSum.cone);
    assert(typeSum.fast === 8, 'T3 fast 应 =8', typeSum.fast);
    assert(typeSum.bucket === 2, 'T3 bucket 应 =2', typeSum.bucket);
    assert(maxWaveSize <= 8, 'T5 单波峰值应 ≤8', maxWaveSize);
    assert(maxFast <= 2, 'T6 单波 fast 峰值应 ≤2', maxFast);
    assert(maxBucket <= 1, 'T7 单波 bucket 峰值应 ≤1', maxBucket);
    assert(minInterval >= 6, 'T8 minInterval 应 ≥6', minInterval);
    assert(bigIdx.length === 3, 'T9 big 应恰好 3 个（W3/W5/W7）', bigIdx);
    assert(bigIdx[0] === 2 && bigIdx[1] === 4 && bigIdx[2] === 6,
      'T9 首大波应在 W3，且三处为 W3/W5/W7', bigIdx);

    // T10 单调性：只允许 W5 一处回落（W4 5→W5 4），其余逐波不降
    const drops = [];
    for (let i = 1; i < sizes.length; i++) if (sizes[i] < sizes[i - 1]) drops.push(i);
    assert(drops.length === 1 && drops[0] === 4, 'T10 逐波只数仅允许 W5 一处回落（5→4）', { sizes, drops });

    // 附加：滤镜开关——L3 走 night 冷蓝，不与 dusk 混用；L2 dusk 不回归
    assert(lv3.night === true && !lv3.dusk, 'L3 应 night:true 且无 dusk（冷蓝月夜）', { night: lv3.night, dusk: lv3.dusk });
    assert(g.sandbox.__LEVELS[2].dusk === true, 'L2 dusk 暖色滤镜不回归', g.sandbox.__LEVELS[2].dusk);

    // ---- T12 行为法抽检：L3 W1（2 normal，interval 10）----
    g.setWave(0);
    g.setLastWaveT(g.probe().gt);
    g.newWave(1);           // L3 第 1 波：2 只 normal，interval 10
    for (let i = 0; i < 95; i++) { g.tick(0.1); }   // 9.5 秒
    assert(g.probe().zombies <= 1, 'T12 interval=10 的波 9.5s 内最多 1 只（刷怪下限契约生效）', g.probe().zombies);
    for (let i = 0; i < 15; i++) { g.tick(0.1); }   // 再 1.5 秒 → 累计 11s
    assert(g.probe().zombies <= 2, 'T12 20s 内第二只应放出（队列耗尽）', g.probe().zombies);
  },
};
