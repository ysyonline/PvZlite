/* REG-ELVIS-01 · 世界 2 真 10 波 + 猫王编排恒等还原（v2.3.2 遗留裁决 B 落地）
 * 断言两件事：
 *   1. W2 模板骨架：ELVIS_WAVES 涉及的四关（2-5/2-7/2-9/2-10）waves.length === totalWaves === 10
 *      （旧源借 1-1 锚仅 5 波 ⇒ 本条必红，判别力锚点）。
 *   2. 猫王注入：ELVIS_WAVES 表按「第 n 波」逐波恒等写入 waves[n-1].elvisGrave，
 *      elvisSpawnAt='grave'；非编排波零残留；四场合计 = 11 只本体（GDD §3.5）。
 * ★ 判别性：回退 WAVE_TEMPLATES[2] 为 5 波借锚 ⇒ ①必红且②压缩错位必红；
 *   删除 materializeLevels 注入段 ⇒ ②全红。旧源复跑必红是本用例的自证口径。
 */
module.exports = {
  id: 'REG-ELVIS-01',
  name: '世界2真10波骨架 + 猫王ELVIS_WAVES恒等注入（v2.3.2 裁决B）',
  seed: 42,
  run({ game: g, assert }) {
    const S = g.sandbox;
    const LV = S.__LEVELS;
    const EW = S.__consts.ELVIS_WAVES;
    assert(EW && typeof EW === 'object', '前置：ELVIS_WAVES 应已桥接 harness', EW);

    const KEYS = Object.keys(EW);
    assert(KEYS.length === 4 && ['2-5', '2-7', '2-9', '2-10'].every(k => KEYS.includes(k)),
      '前置：ELVIS_WAVES 应恰覆盖 2-5/2-7/2-9/2-10', KEYS);

    let grandTotal = 0;
    for (const k of KEYS) {
      const lv = LV[k];
      // ---- 1) 十波骨架契约 ----
      assert(lv && lv.waves.length === 10 && lv.totalWaves === 10,
        k + ' 应为真 10 波（waves.length === totalWaves === 10）',
        lv && [lv.totalWaves, lv.waves.length]);

      // ---- 2) 注入恒等还原契约 ----
      const spec = EW[k];
      let levelTotal = 0;
      const touched = new Set();
      for (const n in spec) {
        const idx = +n - 1;
        const wv = lv.waves[idx];
        assert(wv && wv.elvisGrave === spec[n],
          k + ' 第 ' + n + ' 波应恒等注入 elvisGrave=' + spec[n],
          wv && wv.elvisGrave);
        assert(wv && wv.elvisSpawnAt === 'grave',
          k + ' 第 ' + n + ' 波应有 elvisSpawnAt=grave（墓碑钻出演出标记）',
          wv && wv.elvisSpawnAt);
        levelTotal += spec[n];
        touched.add(idx);
      }
      // 非编排波零残留（不允许压缩错位把 elvisGrave 落到别的波上）
      lv.waves.forEach((wv, i) => {
        if (!touched.has(i)) {
          assert(!(wv && wv.elvisGrave),
            k + ' 第 ' + (i + 1) + ' 波不应有猫王残留', wv && wv.elvisGrave);
        }
      });
      assert(levelTotal === Object.values(spec).reduce((a, b) => a + b, 0),
        k + ' 本体总数应与 ELVIS_WAVES 表一致', levelTotal);
      grandTotal += levelTotal;
    }
    assert(grandTotal === 11, 'W2 全场猫王本体合计应为 11 只（GDD §3.5）', grandTotal);

    // ---- 3) 波表内容契约：十波骨架自洽（spawns 均为已知类型、数量为正、big 波恰 3 幕）----
    const TYPES = new Set(['normal', 'cone', 'fast', 'bucket']);
    for (const k of KEYS) {
      let bigCount = 0;
      for (const [wi, wv] of LV[k].waves.entries()) {
        assert(Array.isArray(wv.spawns) && wv.spawns.length > 0,
          k + ' 第 ' + (wi + 1) + ' 波 spawns 应非空', wv.spawns);
        for (const [t, n] of wv.spawns) {
          assert(TYPES.has(t) && n > 0,
            k + ' 第 ' + (wi + 1) + ' 波出怪类型/数量应合法', [t, n]);
        }
        assert(typeof wv.interval === 'number' && wv.interval > 0,
          k + ' 第 ' + (wi + 1) + ' 波 interval 应为正', wv.interval);
        if (wv.big) bigCount++;
      }
      assert(bigCount === 3, k + ' 应保持三幕结构（恰 3 个 big 波）', bigCount);
    }
  },
};
