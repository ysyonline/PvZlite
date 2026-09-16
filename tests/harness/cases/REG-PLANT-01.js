/* REG-PLANT-01 · 向日葵首发 7s、之后每 20s 产阳光（regression-plan §3.5）
 * 判定用植物自身 sunT 的重置（7 → 20）作为权威时间轴，并断言每次产出都生成阳光特效。
 * 自然掉落用 setSunFallT(大值) 隔离，避免污染计数。
 */
module.exports = {
  id: 'REG-PLANT-01',
  name: '向日葵产阳光节奏（7s 首发 / 每 20s）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.setSunFallT(9999);            // 隔离自然阳光掉落
    g.setSun(9999);
    g.selectCard(0);
    g.clickGrid(0, 2);

    const p0 = g.probe();
    assert(p0.plants === 1, '前置：向日葵已种下', p0.plants);
    assert(Math.abs(p0.plantsArr[0].sunT - 7) < 1e-6,
      '向日葵初始 sunT 应为 7s', p0.plantsArr[0].sunT);

    // 检测 sunT 向上重置（产出）→ 记录发生时 gt 与当场阳光特效数
    const resets = [];
    let prev = p0.plantsArr[0].sunT;
    for (let i = 0; i < 700; i++) {            // 35s @0.05
      g.tick(0.05);
      const p = g.probe();
      const cur = p.plantsArr[0].sunT;
      if (cur > prev + 5) {
        resets.push({ gt: p.gt, suns: p.effectsArr.filter(e => e.kind === 'sun').length });
      }
      prev = cur;
    }

    assert(resets.length === 2, '35s 内应恰好产 2 次阳光（7s + 20s）', resets);
    assert(Math.abs(resets[0].gt - 7) < 0.2, '首次产阳光应在 7s 左右', resets[0].gt);
    assert(Math.abs(resets[1].gt - 27) < 0.3, '第二次应在 +20s（≈27s）', resets[1].gt);
    assert(resets[0].suns >= 1 && resets[1].suns >= 1,
      '每次产出都应生成阳光特效', resets);
  },
};
