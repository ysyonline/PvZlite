/* REG-SUN2-01 · 世界 2 初始阳光契约（2026-09-29 用户拍板：对齐原版 PvZ 夜关开局 50）
 * 原版口径（wiki.gg Sun 词条）：原版 PvZ 全部普通关开局 50 阳光（够种 1 向日葵或 2 阳光菇），
 *   夜间/浓雾关同样 50 起步，区别仅在无天空掉落。本作世界 2（2-1~2-10，全程黑夜）此前
 *   从 1-1 昼段锚回退继承 startSun=150，偏多；v2.3.6+ 改为常量 W2_START_SUN=50 统一覆盖。
 *
 * 判别力：旧源（改动前）无 W2_START_SUN 且 2-x startSun=150 → ①②③必红；数据层④校验
 *   常量存在性（旧源 __consts 无此键 → null 必红）。
 * 用例内容：
 *   ① 常量契约：__consts.W2_START_SUN === 50
 *   ② 数据契约：LEVELS['2-1'..'2-10'] startSun 全 === 50（40 键逐键扫，锚点让位原则下 2-x 全为推导关）
 *   ③ 运行时契约：setLevel('2-1') → startGame → probe().sun === 50（真实开局路径）
 *   ④ 波次表零扰动：2-l waves/totalWaves 与世界 1 同号锚 1-l 全等（本次只动阳光不动波次）
 *   ⑤ 其他世界零漂移：'1-1'=150 / '1-6'=100 / '3-1'=150 / '4-1'=200 不回归
 */
module.exports = {
  id: 'REG-SUN2-01',
  name: '世界 2 初始阳光 =50（原版夜关口径）',
  seed: 42,
  run({ game: g, assert }) {
    const LV = g.sandbox.__LEVELS;
    const C = g.sandbox.__consts;

    // ---- ① 常量契约 ----
    assert(C.W2_START_SUN === 50, '① W2_START_SUN 常量应 =50', C.W2_START_SUN);

    // ---- ② 数据契约：40 键逐键扫世界 2 ----
    const w2Keys = Object.keys(LV).filter(k => /^2-(?:[1-9]|10)$/.test(k));
    assert(w2Keys.length === 10, '② 前置：世界 2 应恰 10 键', w2Keys);
    const bad = w2Keys.filter(k => LV[k].startSun !== 50);
    assert(bad.length === 0, '② 2-1~2-10 startSun 应全 =50（首个违规键: ' + (bad[0] || '无') + '）',
      bad.map(k => k + '=' + LV[k].startSun));

    // ---- ③ 运行时契约：真实开局路径 ----
    g.setLevel('2-1');
    g.startGame();
    let p = g.probe();
    assert(p.levelKey === '2-1', '③ 前置：应处于 2-1', p.levelKey);
    assert(p.sun === 50, '③ 2-1 开局运行时阳光应 =50', p.sun);

    // ---- ④ 波次零扰动：2-l ↔ 1-l 同号锚，剥离猫王注入字段（elvisGrave/elvisSpawnAt）后逐波全等 ----
    // 2-5/2-7/2-9/2-10 有 ELVIS_WAVES 注入（v2.3.2 既有机制），JSON 全等会误红，故剥离后比对核心三键
    const strip = w => ({ spawns: w.spawns, interval: w.interval, big: !!w.big });
    for (let l = 1; l <= 10; l++) {
      const a = LV['2-' + l], b = LV['1-' + l];
      const ja = JSON.stringify({ t: a.totalWaves, w: a.waves.map(strip) });
      const jb = JSON.stringify({ t: b.totalWaves, w: b.waves.map(strip) });
      assert(ja === jb, '④ 2-' + l + ' 波次核心键应与 1-' + l + ' 全等（只动阳光不动波次）',
        l === 1 ? { '2-1': ja, '1-1': jb } : l);
    }

    // ---- ⑤ 其他世界零漂移 ----
    assert(LV['1-1'].startSun === 150, '⑤ 1-1 startSun 应仍 =150', LV['1-1'].startSun);
    assert(LV['1-6'].startSun === 100, '⑤ 1-6 startSun 应仍 =100', LV['1-6'].startSun);
    assert(LV['3-1'].startSun === 150, '⑤ 3-1 startSun 应仍 =150', LV['3-1'].startSun);
    assert(LV['4-1'].startSun === 200, '⑤ 4-1 startSun 应仍 =200', LV['4-1'].startSun);
  },
};
