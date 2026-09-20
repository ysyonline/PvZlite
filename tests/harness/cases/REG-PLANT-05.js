/* REG-PLANT-05 · 落地尘土触发（2026-09-20 code-review-todo P0 修复锁定）
 * 背景：落地尘土（8 粒 #8b6528 粒子，蓝图 §2 E 段）原判定写死 plantT∈[220,280)ms，
 *   但该判定位于动画分支之外——动画中每帧提前 return，跳出时 plantT 已 >=620，
 *   窗口恒为假 = 死代码，尘土从未生效。
 * 修复：触发点移入动画分支（else-if 链之后、ctx.save() 之前），以 t 跨越 0.35
 *   （A→C 交界，视觉落地瞬间）为一次性触发（p.dirtDone 标记）。
 *   盆格 y 补 -lift（盆上种植尘土喷在盆口而非盆底格心）。
 * 断言写法约束（code-review-todo §P2-A 接缝）：实现无关——只断言"状态推进到
 *   t>=0.35 后粒子已产生"，不绑死 draw 侧触发；P2-A 把时间轴挪进 update() 后本用例仍应成立。
 * 断言清单：
 *   1. 真实种植路径建档后，t<0.35 阶段无尘土粒子
 *   2. t 跨 0.35 的首帧：effects 出现 kind='particle' 恰 8 粒（#8b6528）
 *   3. 继续推进到动画结束：粒子总数仍为 8（一次性，不重复喷）
 *   4. 动画结束后再推进多帧：不再新增粒子（dirtDone 一次性语义）
 *   5. 屋顶花盆上种植：粒子 y ≈ 盆口（格心 y - POT_LIFT + 18）
 * 坑位备忘：
 *   - harness ctx 是 Proxy 桩：drawPlant 无头可跑（SMOKE-010 先例），粒子走 __effects getter
 *   - dtRef 帧步进注入：直接调 sandbox 顶层 drawPlant(p, dt)（PROBE_SUFFIX 同作用域函数，
 *     经 globalThis 桥可达）；不用 RAF 真帧，避免 update 侧干扰（本用例只锁尘土语义）
 *   - 豌豆是 CARDS[1]；种植走 g.clickGrid 真实路径（selected 用后即清）
 */
module.exports = {
  id: 'REG-PLANT-05',
  name: '落地尘土 t 跨 0.35 一次性触发（P0 死代码修复锁定）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    const sb = g.sandbox;
    const effects = () => sb.__effects;

    // ---- 布置：豌豆(0,3) 真实种植路径 ----
    g.setSun(9999);
    g.selectCard(1);        // pea（CARDS[1]）
    g.clickGrid(0, 3);
    const p = sb.__plants[0];
    assert(p, '前置：豌豆应已种下');
    assert(p.plantT === 0 && p.plantDone === false,
      '前置：新档案 plantT=0 / plantDone=false', [p.plantT, p.plantDone]);
    assert(effects().length === 0, '前置：种下瞬间无特效');

    // sandbox 顶层函数桥（PROBE_SUFFIX 同作用域，挂 globalThis 可达）
    const drawPlant = sb.drawPlant;
    const gridToPos = sb.gridToPos;
    assert(typeof drawPlant === 'function' && typeof gridToPos === 'function',
      '前置：drawPlant / gridToPos 应经 sandbox 可达');
    const POT_LIFT = (sb.__consts && typeof sb.__consts.CARD_X0 === 'number')
      ? (function () {           // PROBE_SUFFIX 未桥 POT_LIFT：用例内经 eval 桥取（同 vm 作用域）
          return sb.eval ? sb.eval('POT_LIFT') : 16;
        })()
      : 16;
    assert(POT_LIFT === 16, '前置：POT_LIFT 应为 16（若源码改值请同步）', POT_LIFT);

    const particles = () => effects().filter(function (e) { return e.kind === 'particle'; });

    // ---- 1) t<0.35（plantT<217ms）：无尘土 ----
    drawPlant(p, 0.1);      // plantT → 100ms，t≈0.161
    assert(particles().length === 0, 't<0.35 阶段不应有尘土粒子', particles().length);

    // ---- 2) 跨 0.35 首帧（plantT 100→300ms，t≈0.484）：恰喷 8 粒 ----
    drawPlant(p, 0.2);
    let parts = particles();
    assert(parts.length === 8, 't 跨 0.35 首帧应恰喷 8 粒尘土', parts.length);
    assert(parts.every(function (e) { return e.color === '#8b6528'; }),
      '尘土粒子颜色应为 #8b6528');
    const pos = gridToPos(0, 3);
    const yOK = parts.every(function (e) {
      return Math.abs(e.y - (pos.y + 18)) < 6;
    });
    assert(yOK, '平地尘土 y 应 ≈ 格心+18', [pos.y, parts.map(function (e) { return e.y; })]);

    // ---- 3) 推进至动画结束（plantT 300→650ms）：粒子仍 8（一次性）----
    drawPlant(p, 0.35);
    assert(p.plantDone === true, '650ms 后动画应已播完', p.plantT);
    assert(particles().length === 8, '动画结束粒子应仍为 8（不重复喷）', particles().length);

    // ---- 4) 动画结束后再推进多帧：不再新增 ----
    drawPlant(p, 0.05);
    drawPlant(p, 0.05);
    assert(particles().length === 8, '动画结束后不应再喷粒子', particles().length);

    // ---- 5) 屋顶盆格：尘土 y 对齐盆口（-lift 偏移）----
    g.setLevel(5);          // L5 屋顶关（LEVELS 键 5，roof:true）
    g.setSun(9999);
    g.selectCard(7);        // planter（v1.3 卡数=9：planter@7）
    g.clickGrid(2, 3);      // 先放花盆
    const pot = sb.__plants.find(function (q) { return q.type === 'planter'; });
    assert(pot, '前置：花盆应已种下');
    // 注意：不选 pea——第一段已挂 cardCD.pea=5 且本用例不推进 update（冷却不衰减），会被拒。
    g.selectCard(0);        // sunflower（CARDS[0]，本用例未用过，无冷却）
    g.clickGrid(2, 3);
    const sf = sb.__plants.find(function (q) { return q.type === 'sunflower' && q.col === 2 && q.row === 3; });
    assert(sf, '前置：盆上向日葵应已种下');
    assert(typeof sb.POT_LIFT === 'number' || POT_LIFT === 16, '前置：POT_LIFT 常量应可达');
    drawPlant(sf, 0.1);
    drawPlant(sf, 0.2);     // 跨 0.35，喷尘土
    const potPos = gridToPos(2, 3);
    const potParts = particles().slice(-8);
    assert(potParts.length === 8 && potParts.every(function (e) { return e.kind === 'particle'; }),
      '前置：盆上种植应再喷 8 粒', potParts.length);
    const potYOK = potParts.every(function (e) {
      return Math.abs(e.y - (potPos.y - POT_LIFT + 18)) < 6;
    });
    assert(potYOK, '盆格尘土 y 应 ≈ 盆口（格心 - POT_LIFT + 18）',
      [potPos.y, potParts.map(function (e) { return e.y; })]);
  },
};
