/* REG-FREEZE-01 · v1.6 corn 黄油定身：25% 黄油命中 ⇒ 完全定身 2.5s（移动+啃食双停）· 2026-09-22 V16-QA-1
 * ============================================================================
 * 契约（v1.6，与工程侧共用同一份）：
 *   · corn 弹体有 25% 概率为「黄油弹（butter）」；命中僵尸 ⇒ **完全定身 2.5s**（移动 + 啃食 **双停**）。
 *   · 与 chill（slowT · 40% 减速 · 2.0s）**独立并存**（互不覆盖）。
 *   · 定身结束（>2.5s）⇒ 恢复原速（不残留）。
 *   · 对照：普通玉米粒命中 **不产生** freezeT。
 *   · corn v1.6 数值：cost 100 / 单发 15 / 间隔 2.6s（v1.5 基线 150/30/2.6s·溅射40%）。
 *
 * ★ 可复现姿势（本用例刻意「不猜内部字段」——只驱动真实玉米、在原始僵尸对象上观测 z.freezeT）：
 *   1) 随机可控：harness 的 loadGame({seed}) 已用 mulberry32 覆盖 sandbox 的 Math.random
 *      ⇒ 25% 分支**确定性可复现**。每个场景用 `findFreeze()` 扫描 seed 1..120，取「首个在该
 *      场景下出现定身」的种子（窗口 10 发 ≈26s，P(10 发无黄油)=0.75^10≈5.6%，120 种子下几乎必现）。
 *   2) 全流程不注入 `butter` 标记、不依赖 `applyFreeze` 命名：种真实 corn（卡9，onClick 按 type
 *      解析，无需 deck 成员）向静止/移动/啃食僵尸开火，逐帧轮询原始 `S.__zombies` 上的 `z.freezeT`。
 *      若工程实现为单点 applyFreeze（顶层 function），命中恰触发该单点，本用例行为等价。
 *      各场景**独立扫种子**（不跨场景复用同一发序假设）⇒ 对「发射时 vs 命中时掷 25%」两种实现均稳。
 *   3) 时钟走 `g.__updateRaw(0.05)`（不累 gt ⇒ 隔离波次刷怪，纯定身观测）。
 * 断言：§1 黄油命中 freezeT≈2.5（区间式，命中同帧可能已递减）；
 *       §2 定身期内僵尸 x 严格不变；§3 定身期内啃食目标 dur 完全不减（对照 chill ×0.6）；
 *       §3.5 freezeT 与 slowT 独立并存；§4 定身结束恢复移动；
 *       §5 普通玉米粒命中不产生 freezeT；§6 corn 数值 cost=100 / dmg=15（卡面 + 实弹）。
 * ============================================================================
 * 依据：主理人 V16-QA-1 契约（v1.6 三刀之③corn 黄油重做）。
 */
module.exports = {
  id: 'REG-FREEZE-01',
  name: 'corn 黄油定身：25% 黄油命中完全定身 2.5s（移动+啃食双停 / 独立并存 / 到期恢复）',
  seed: 42,
  run({ game: g, assert }) {
    const S = g.sandbox;
    const K = S.__consts;

    const mkZ = (x, row, opts) => {
      opts = opts || {};
      const z = { type: 'normal', row: row, hp: opts.hp != null ? opts.hp : 180,
        maxHp: opts.hp != null ? opts.hp : 180, spd: opts.spd != null ? opts.spd : 0,
        x: x, eating: !!opts.eating, eatAnim: 0, walk: 0, dead: false };
      S.__zombies.push(z);
      return z;
    };
    // 种真实 corn（卡9）：需先全新开局（startGame 复位 cardCD/实体），sun 拉满
    const plantCorn = (col, row) => {
      g.setSun(9999);
      g.selectCard(9);
      g.clickGrid(col, row);
      const p = S.__plants.find(pp => pp.type === 'corn');
      assert(p, '前置：corn 应已种下', S.__plants.map(pp => pp.type));
      return p;
    };
    const runDt = (s) => { for (let i = 0; i < Math.round(s / 0.05); i++) g.__updateRaw(0.05); };
    const waitFreeze = (z, maxFrames) => {
      for (let i = 0; i < maxFrames; i++) {
        if (z.freezeT && z.freezeT > 0) return { froze: true, freezeT: z.freezeT, frames: i };
        g.__updateRaw(0.05);
      }
      return { froze: false, freezeT: 0, frames: maxFrames };
    };
    // 扫种子直到「本场景出现黄油定身」；返回冻结当刻上下文（z 为活的原始引用）
    const findFreeze = (label, build, windowShots) => {
      const win = Math.ceil(windowShots * 2.6 / 0.05) + 60;
      for (let s = 1; s <= 120; s++) {
        g.seed(s);
        g.startGame(label);
        const ctx = build();
        const r = waitFreeze(ctx.z, win);
        if (r.froze) return { seed: s, z: ctx.z, plant: ctx.plant, freezeT: r.freezeT };
      }
      return null;
    };

    // ═══ §1 黄油命中 ⇒ freezeT≈2.5（区间式：命中同帧可能已按 dt 递减）═══
    // ═══ §0 隐式：25% 分支确定性可复现（否则 findFreeze 返回 null）═══
    const F1 = findFreeze('freeze-f1', () => { plantCorn(1, 2); return { z: mkZ(400, 2, { hp: 1e6 }) }; }, 10);
    assert(F1, '§0/§1：25% 黄油分支应在 seed 1..120 内确定性可复现命中（契约 25%）', null);
    assert(F1.freezeT > 2.4 && F1.freezeT <= 2.5,
      '§1：黄油命中后 freezeT≈2.5（区间式 >2.4 && <=2.5）', F1.freezeT);

    // ═══ §2 定身期内「移动」完全停止 + §3.5 chill 独立并存 ═══
    const F2 = findFreeze('freeze-move', () => { plantCorn(1, 2); return { z: mkZ(760, 2, { hp: 1e6, spd: 16 }) }; }, 10);
    assert(F2, '§2：移动场景应能复现黄油定身', null);
    const zM = F2.z;
    assert(F2.freezeT > 2.4 && F2.freezeT <= 2.5, '§2：定身起始 freezeT≈2.5', F2.freezeT);
    const xFrozen = zM.x;
    const walkFrozen = zM.walk;                       // 完全定身 ⇒ walk 动画亦不推进（源码 `if(!frozen)z.walk+=...`）
    for (let i = 0; i < 40; i++) {                    // 2.0s（<2.5s 定身窗）
      g.__updateRaw(0.05);
      assert(zM.x === xFrozen, '§2：定身期内僵尸 x 严格不变（移动全停）', { i: i, x: zM.x, xFrozen: xFrozen });
      assert(zM.walk === walkFrozen, '§2b：定身期内僵尸 walk 动画不推进（完全静止）', { i: i, walk: zM.walk, walkFrozen: walkFrozen });
    }
    // §3.5 chill 独立并存：定身中施加 slowT，两字段共存、互不清除，仍以定身优先
    S.__applyChill(zM);
    assert(zM.freezeT > 0 && zM.slowT > 0,
      '§3.5：freezeT 与 slowT 应独立并存（互不覆盖）', { freezeT: zM.freezeT, slowT: zM.slowT });
    g.__updateRaw(0.05);
    assert(zM.x === xFrozen, '§3.5：并存时仍以定身优先（x 严格不动）', zM.x);

    // ═══ §4 定身结束（>2.5s）恢复移动 ═══
    runDt(0.8);                                       // 累计 >2.5s
    assert(zM.x < xFrozen, '§4：定身结束后僵尸应恢复移动', { x: zM.x, xFrozen: xFrozen });

    // ═══ §3 定身期内「啃食」目标 dur 完全不减（对照 chill 的 ×0.6）═══
    const F3 = findFreeze('freeze-eat', () => {
      const plant = plantCorn(1, 2);
      plant.dur = 1e6; plant.maxDur = 1e6;            // 拉满 dur：保证黄油命中前不被啃空（隔离定身观测）
      const biteX = K.GRID_X + 1 * K.CELL_W + K.CELL_W / 2 + 30;   // z.x-pos.x=30 ∈ (0,36) 咬合位
      return { z: mkZ(biteX, 2, { hp: 1e6, spd: 0, eating: true }), plant: plant };
    }, 10);
    assert(F3, '§3：啃食场景应能复现黄油定身', null);
    const durFrozen = F3.plant.dur;
    for (let i = 0; i < 40; i++) {                    // 2.0s（<2.5s 定身窗）
      g.__updateRaw(0.05);
      assert(F3.plant.dur === durFrozen,
        '§3：定身期内啃食目标 dur 完全不减（对照 chill 的 ×0.6）',
        { i: i, dur: F3.plant.dur, durFrozen: durFrozen });
    }
    assert(F3.plant.dur > 0, '§3：定身期内目标不应被啃空', F3.plant.dur);

    // ═══ §5 对照：普通玉米粒命中不产生 freezeT（注入普通 corn 弹体）═══
    // 假设（契约口径）：黄油在**发射时**掷定并标记在弹体上（「弹体有 25% 概率为黄油弹」）；
    //   ⇒ 无黄油标记的普通 corn 弹体命中恒不产生 freezeT。若工程改为「命中时掷 25%」，本组需同步调整。
    g.seed(42);
    g.startGame('freeze-normal');
    g.setSun(9999);
    const zN = mkZ(360, 2, { hp: 180 });
    const cellY = K.GRID_Y + 2 * K.CELL_H + K.CELL_H / 2;    // L1 行2 平面基线
    S.__projectiles.push({ x: 300, y: cellY - 16, flatY: cellY, yOff: 16, vx: 220, dmg: 15,
      row: 2, type: 'corn', splash: 30, splashRatio: 0.40, dead: false });
    let guard = 0;
    while (zN.hp === 180 && guard < 200) { g.__updateRaw(0.05); guard++; }
    assert(zN.hp < 180, '§5 前置：普通玉米粒应命中扣血', zN.hp);
    assert(!(zN.freezeT > 0), '§5：普通玉米粒命中不得产生 freezeT（对照黄油）', zN.freezeT);

    // ═══ §6 corn v1.6 数值：卡面 cost=100 + 实弹 dmg=15 ═══
    const cornCard = (S.__CARDS || []).find(c => c.type === 'corn');
    assert(cornCard && cornCard.cost === 100,
      '§6：corn 阳光消耗应为 100（v1.6 重做，v1.5 基线 150）', cornCard && cornCard.cost);
    g.seed(42);
    g.startGame('freeze-cfg');
    plantCorn(1, 2);
    mkZ(400, 2, { hp: 1e6 });
    let realDmg = null;
    for (let i = 0; i < 80 && realDmg == null; i++) {
      const pr = g.probe().projectilesArr.find(p => p.type === 'corn');
      if (pr) realDmg = pr.dmg;
      else g.__updateRaw(0.05);
    }
    assert(realDmg === 15, '§6：corn 单发伤害应为 15（v1.6 重做，v1.5 基线 30）', realDmg);
  },
};
