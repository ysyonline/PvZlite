/* REG-POINT-02 · 点击收集契约：阳光优先 + 独立收集（impl-plan T-05）
 * 断言清单：
 *   1. 掉落物点击收集 → runPoints 增对应阶位值，掉落消亡
 *   2. 同点阳光+掉落重叠 → 点击先收阳光（sun 增、掉落不动）
 *   3. 点掉落附近 30px 外 → 不收
 *   4. SFX 计数（零新键约束的旁证：cardReady 被调用）
 * 坑位备忘：阳光点击走 effects 判定圆 40px；掉落判定圆 30px——同点重叠测试用
 *   精确同坐标注入。
 */
module.exports = {
  id: 'REG-POINT-02',
  name: '点击收集：阳光优先 / 阶位分入账 / 半径 30（T-05）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.setSunFallT(999);   // 隔离自然掉落（防止干扰阳光重叠断言）
    const sfx = g.sandbox.__SFX;
    let cardReady = 0;
    const origCR = sfx.cardReady;
    sfx.cardReady = function () { cardReady++; };

    try {
      // ---- 1) 基础收集：击杀铁桶 → 金币(3) → 点中 → runPoints+3 ----
      g.forceZombieAt('bucket', 0, 500);
      g.killAllZombies();
      let drops = g.probeMeta().pointDrops;
      assert(drops.length === 1, '前置：1 个掉落', drops.length);
      const d0 = drops[0];
      g.clickAt(d0.x, d0.y);
      let m = g.probeMeta();
      assert(m.runPoints === 3, '点击收金币 → runPoints+3', m.runPoints);
      assert(m.pointDrops.length === 0, '收掉的掉落应消亡', m.pointDrops.length);
      assert(cardReady === 1, '收集音效应触发一次（cardReady 复用键）', cardReady);

      // ---- 2) 半径边界：30px 判定圆 ----
      g.forceZombieAt('normal', 1, 500);
      g.killAllZombies();
      drops = g.probeMeta().pointDrops;
      const d1 = drops[0];
      g.clickAt(d1.x + 29, d1.y);        // 29px 内 → 收
      m = g.probeMeta();
      assert(m.runPoints === 4, '29px 处点击应收（半径 30）', m.runPoints);
      g.forceZombieAt('normal', 2, 500);
      g.killAllZombies();
      drops = g.probeMeta().pointDrops;
      const d2 = drops[0];
      g.clickAt(d2.x + 31, d2.y);        // 31px 外 → 不收
      m = g.probeMeta();
      assert(m.runPoints === 4 && m.pointDrops.length === 1,
        '31px 处点击不应收（30px 判定圆外）', { rp: m.runPoints, n: m.pointDrops.length });

      // ---- 3) 阳光优先：同坐标注入阳光 + 掉落 → 点中只收阳光 ----
      const effectsRef = g.sandbox.__effects;
      const dy3 = drops[0];
      effectsRef.push({ kind: 'sun', x: dy3.x, y: dy3.y, targetY: dy3.y, fall: 0, value: 25, t: 0, dead: false, stayT: 0 });
      const sunBefore = g.probe().sun;
      g.clickAt(dy3.x, dy3.y);
      m = g.probeMeta();
      const p = g.probe();
      assert(p.sun === sunBefore + 25, '同点重叠：应先收阳光（+25）', p.sun - sunBefore);
      assert(m.pointDrops.length === 1 && m.pointDrops[0].x === dy3.x,
        '同点重叠：掉落应保留（阳光优先 return）', m.pointDrops.length);
      assert(m.runPoints === 4, '同点重叠：runPoints 不变（掉落未收）', m.runPoints);
      // 再点一次（阳光已死）→ 收掉落（场景 3 的掉落是 31px 边界测试遗留的 normal=铜 1）
      g.clickAt(dy3.x, dy3.y);
      m = g.probeMeta();
      assert(m.runPoints === 5 && m.pointDrops.length === 0,
        '二次点击应收掉落（normal 铜 1 → rp 4+1=5）', { rp: m.runPoints, n: m.pointDrops.length });
    } finally {
      sfx.cardReady = origCR;
    }
  },
};
