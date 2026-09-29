/* REG-ELVIS-01 · 世界 2 波数对齐 + 猫王编排注入契约（v2.3.2 裁决B → v2.3.6 波数对齐改判）
 * 断言三件事：
 *   1. W2 波数对齐（v2.3.6 用户拍板）：2-l 波数 === 1-l 同号锚波数（2-1 五波…2-10 十波），
 *      且 waves.length === totalWaves；ELVIS_WAVES 涉及的四关（2-5/2-7/2-9/2-10）全数覆盖。
 *   2. 猫王注入：ELVIS_WAVES 表按「第 n 波」写入 waves[n-1].elvisGrave（n≤tw 时恒等；
 *      n>tw 时等比压缩兜底），elvisSpawnAt='grave'；四场合计 = 11 只本体（GDD §3.5）。
 *   3. 波表内容契约：spawns 均为已知类型、数量为正；big 波三幕仅校验 tw=10 的关
 *      （v2.3.6 后 2-5/2-7 借 1-5/1-7 波表，big 数随世界 1 锚自洽，不再强求恰 3）。
 * ★ 判别性：回退波数对齐（W2 回归单一模板）⇒ ①必红；删除 materializeLevels 注入段 ⇒ ②全红。
 */
module.exports = {
  id: 'REG-ELVIS-01',
  name: '世界2波数对齐(2-l↔1-l) + 猫王ELVIS_WAVES注入契约（v2.3.6）',
  seed: 42,
  run({ game: g, assert }) {
    const S = g.sandbox;
    const LV = S.__LEVELS;
    const EW = S.__consts.ELVIS_WAVES;
    assert(EW && typeof EW === 'object', '前置：ELVIS_WAVES 应已桥接 harness', EW);

    const KEYS = Object.keys(EW);
    assert(KEYS.length === 4 && ['2-5', '2-7', '2-9', '2-10'].every(k => KEYS.includes(k)),
      '前置：ELVIS_WAVES 应恰覆盖 2-5/2-7/2-9/2-10', KEYS);

    // ---- 1) 波数对齐契约（v2.3.6）：2-l 波数 === 1-l 同号锚波数 ----
    for (let l = 1; l <= 10; l++) {
      const w1 = LV['1-' + l], w2 = LV['2-' + l];
      assert(w2 && w2.waves.length === w1.waves.length && w2.totalWaves === w1.waves.length,
        '2-' + l + ' 波数应与 1-' + l + ' 对齐（=' + w1.waves.length + '）',
        w2 && [w2.totalWaves, w2.waves.length]);
    }

    let grandTotal = 0;
    for (const k of KEYS) {
      const lv = LV[k];
      // ---- 2) 注入契约（n≤tw 恒等；n>tw 等比压缩兜底）----
      const spec = EW[k];
      let levelTotal = 0;
      const touched = new Set();
      for (const n in spec) {
        let idx = +n - 1;
        if (idx >= lv.waves.length) idx = Math.min(lv.waves.length - 1, Math.round((+n - 1) * (lv.waves.length - 1) / 9));
        const wv = lv.waves[idx];
        assert(wv && wv.elvisGrave === spec[n],
          k + ' 波' + n + ' 应注入 elvisGrave=' + spec[n] + '（实际落第 ' + (idx + 1) + ' 波/tw=' + lv.waves.length + '）',
          wv && wv.elvisGrave);
        assert(wv && wv.elvisSpawnAt === 'grave',
          k + ' 波' + n + ' 应有 elvisSpawnAt=grave（墓碑钻出演出标记）',
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

    // ---- 3) 波表内容契约：spawns 合法（big 三幕仅校验 tw=10 的关）----
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
      if (LV[k].waves.length === 10) {
        assert(bigCount === 3, k + '（tw=10）应保持三幕结构（恰 3 个 big 波）', bigCount);
      }
    }
  },
};
