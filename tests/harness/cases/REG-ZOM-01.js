/* REG-ZOM-01 · 4 种僵尸血量/速度符合配置（含难度倍数）（regression-plan §3.6）
 * newWave 展开 spawnQueue 时：hp = STATS[type][0] * DIFFS[DIFF].mult（无抖动）；
 *   spd = STATS[type][1] * DIFFS[DIFF].speed * R(0.92,1.08)（±8% 抖动）。
 * STATS：normal[180,16] cone[340,15] fast[140,45] bucket[560,12]
 */
module.exports = {
  id: 'REG-ZOM-01',
  name: '4 种僵尸 hp/spd 契约（含难度倍数）',
  seed: 42,
  run({ game: g, assert }) {
    const STATS = { normal: [180, 16], cone: [340, 15], fast: [140, 45], bucket: [560, 12] };
    const check = (q, mult, speed, label) => {
      assert(q.length > 0, `${label}：队列应有僵尸`, q);
      for (const e of q) {
        const base = STATS[e.type];
        assert(Math.abs(e.hp - base[0] * mult) < 1e-6,
          `${label}：${e.type} hp 应为 ${base[0]}*${mult}`, e.hp);
        const lo = base[1] * speed * 0.92, hi = base[1] * speed * 1.08;
        assert(e.spd >= lo - 1e-6 && e.spd <= hi + 1e-6,
          `${label}：${e.type} spd 应落在 [${lo.toFixed(2)},${hi.toFixed(2)}]`, e.spd);
      }
    };

    g.startGame();

    // ---- 普通难度：L1 第 3 波（normal*2 + cone*1）----
    g.setDiff('normal');
    g.newWave(3);
    let q = g.probe().spawnQueueArr;
    assert(q.length === 3, 'L1 波3 应有 3 只（2 normal + 1 cone）', q);
    check(q, 1.0, 1.0, 'normal');

    // ---- 困难难度：hp*1.35 / spd*1.15 ----
    g.setDiff('hard');
    g.newWave(3);
    q = g.probe().spawnQueueArr;
    check(q, 1.35, 1.15, 'hard');

    // ---- fast + bucket：用合成波覆盖（关卡表不含 bucket，注入临时波配置）----
    g.setDiff('normal');
    const lv = g.sandbox.__level;
    lv.waves = [{ spawns: [['fast', 1], ['bucket', 1]], interval: 9 }];
    g.newWave(1);
    q = g.probe().spawnQueueArr;
    assert(q.length === 2, '合成波应有 fast + bucket 各 1', q);
    check(q, 1.0, 1.0, 'normal(fast/bucket)');
  },
};
