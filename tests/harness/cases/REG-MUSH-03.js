/* REG-MUSH-03 · 大喷菇（fumeshroom）+ 穿透弹体 [V23-U3]
 * ============================================================
 * 设计依据（唯一权威）：design/gdd/v23-night-mushrooms.md
 *   §2 夜行机制：蘑菇类白天（level.time==='day'）沉睡（不产/不攻/不触发），夜晚/浓雾清醒。
 *   §3.3 大喷菇：cost 75 / 种植 cd 7.5s / dur 300；单发 20 / 间隔 1.4s / 射程 4 格；
 *                弹道=直线烟雾（同 pea 直线，非抛物），**穿透**：命中后不消失，
 *                对本行射程内每个僵尸各结算一次 20；同一僵尸不得被同一发弹体重复扣血。
 *   Q-3 拍板：伤害取原版 20（不用重制版 35）。
 *
 * 覆盖断言（V23-U3 验收）：
 *   [1] isNocturnal('fumeshroom') 为真 + 卡定义 name 大喷菇 / cost 75 / cd 7.5 / dur 300
 *   [2] 白天（day）沉睡：本行射程内有僵尸仍不发射、不计时（cd 保持 0）
 *   [3] 夜晚（night）单发 20 伤害（弹体 dmg=20；命中一次恰好 -20）
 *   [4] 夜晚发射间隔 ≈1.4s（12s 窗口多次发射，相邻间隔全部 ≈1.4）
 *   [5] 射程边界：4.1 格外不发射；3.5 格内发射；恰好 4.0 格（含边界）发射
 *   [6] 穿透：同排 3 个僵尸进入射程后，被**同一发**烟雾弹各扣 20（全部掉血；只发射 1 发）
 *   [7] 不重复扣血：单个僵尸在弹体整个飞行期间（多帧处于命中窗）恰好只被扣一次 20
 *   [8] 弹体穿透后仍存活（命中不消失），直到超出射程上限（4 格）才消失
 *
 * 运行：node tests/harness/run-all.js（REG-* 收录）或单文件自证 node tests/harness/cases/REG-MUSH-03.js
 * ============================================================ */
'use strict';

const path = require('path');

// GDD §3.3 规格常量（测试侧硬编码以「钉死规格」；源码侧同名字面量见 plants-vs-zombies.html 顶部 v2.3 常量块）
const DMG = 20;        // 单发伤害（Q-3：原版 20）
const INTERVAL = 1.4;  // 发射间隔（秒）
const RANGE = 4;       // 射程（格）

module.exports = {
  id: 'REG-MUSH-03',
  name: '大喷菇（白天沉睡 / 夜晚20dmg·1.4s / 射程4格 / 穿透·不重复扣血）',
  seed: 42,
  run({ game: g, assert }) {
    const sb = g.sandbox;
    const DT = 0.05;                              // 帧步长（秒）
    const CELL_W = sb.__consts.CELL_W;
    const fume = () => sb.__plants.filter(p => p.type === 'fumeshroom')[0];

    // 造一只静止靶（spd:0 → 不移动、不啃食，隔离攻击变量）
    const mkZ = (row, x, hp) => {
      const z = { type: 'normal', row, hp, maxHp: hp, spd: 0, x,
        eating: false, eatAnim: 0, walk: 0, dead: false };
      sb.__zombies.push(z);
      return z;
    };
    // 新对局 + 隔离自然掉落阳光（夜晚本不掉，白天掉；统一隔离保证可复现）
    const freshNight = () => {
      g.setLevel('1-6'); g.startGame(); g.setSunFallT(9999);
      assert(sb.__level.time === 'night', '1-6 应为夜晚（night）', sb.__level.time);
    };

    // ============================================================
    // [1] 夜行判定 + 卡定义
    // ============================================================
    assert(typeof sb.isNocturnal === 'function', 'isNocturnal 应为顶层函数');
    assert(sb.isNocturnal('fumeshroom') === true, 'fumeshroom 应为夜行');
    const card = sb.__CARDS.find(c => c.type === 'fumeshroom');
    assert(card, 'CARDS 应含 fumeshroom 卡');
    assert(card.name === '大喷菇', '大喷菇 name 应为「大喷菇」', card);
    assert(card.cost === 75, '大喷菇 cost 应为 75', card);
    assert(card.cd === 7.5, '大喷菇 种植 cd 应为 7.5', card);
    assert(card.dur === 300, '大喷菇 dur 应为 300', card);

    // ============================================================
    // [2] 场景 A：白天（day）沉睡 —— 本行射程内有僵尸仍不发射、不计时
    // ============================================================
    g.setLevel('1-1');
    g.startGame();
    g.setSunFallT(9999);
    assert(sb.__level.time === 'day', '1-1 应为白天（day）', sb.__level.time);
    const pA = sb.gridToPos(1, 2);
    sb.__plants.push(sb.spawnPlant('fumeshroom', 1, 2, 0));
    const zA = mkZ(2, pA.x + 2 * CELL_W, 100000);   // 射程内（若醒着必发射）
    assert(fume().cd === 0, '大喷菇种植初值 cd 应为 0', fume().cd);
    let firesA = 0;
    const seenA = new Set();
    for (let i = 0; i < 100; i++) {                  // 5s
      g.__updateRaw(DT);
      for (const pr of sb.__projectiles) if (!seenA.has(pr)) { seenA.add(pr); firesA++; }
    }
    assert(firesA === 0, '白天沉睡：不得发射任何弹体', firesA);
    assert(zA.hp === 100000, '白天沉睡：僵尸不应掉血', zA.hp);
    assert(fume().cd === 0, '白天沉睡不计时：cd 应保持 0（未被扣减/未置冷却）', fume().cd);

    // ============================================================
    // [3] 场景 B：夜晚单发 20 伤害（一次命中恰好 -20）
    // ============================================================
    freshNight();
    const pB = sb.gridToPos(1, 2);
    sb.__plants.push(sb.spawnPlant('fumeshroom', 1, 2, 0));
    const zB = mkZ(2, pB.x + 2 * CELL_W, 1000);      // 射程内靶（HP 充裕，仅观察首发）
    // 推进直到出现 fume 弹体
    let fired = false;
    for (let i = 0; i < 10 && !fired; i++) {
      g.__updateRaw(DT);
      if (sb.__projectiles.some(pr => pr.type === 'fume')) fired = true;
    }
    assert(fired, '夜晚应发射 fume 弹体', fired);
    const pr0 = sb.__projectiles.find(pr => pr.type === 'fume');
    assert(pr0.dmg === DMG, '弹体 dmg 应为 20', pr0.dmg);
    assert(pr0.pierce === true, '弹体应带 pierce:true（穿透标记）', pr0.pierce);
    // 推进到首发弹体消失（约 1.06s < 1.4s，期间不会再发射）
    let guard = 0;
    while (sb.__projectiles.some(pr => pr.type === 'fume') && guard < 60) { g.__updateRaw(DT); guard++; }
    assert(!sb.__projectiles.some(pr => pr.type === 'fume'), '弹体应已清除', guard);
    assert(Math.abs(zB.hp - (1000 - DMG)) < 1e-6, '命中一次应恰好 -20', zB.hp);

    // ============================================================
    // [4] 场景 C：夜晚发射间隔 ≈1.4s
    // ============================================================
    freshNight();
    const pC = sb.gridToPos(1, 2);
    sb.__plants.push(sb.spawnPlant('fumeshroom', 1, 2, 0));
    mkZ(2, pC.x + 2 * CELL_W, 1000000);              // 高 HP 静止靶，撑满窗口
    const fireTimes = [];
    let tt = 0, prevCd = fume().cd;
    for (let i = 0; i < 240; i++) {                  // 240 * 0.05 = 12s
      g.__updateRaw(DT);
      tt += DT;
      const cur = fume().cd;
      if (cur > prevCd + 0.5) fireTimes.push(+tt.toFixed(3));   // cd 由 ~0 跳回 1.4 ⇒ 本帧发射
      prevCd = cur;
    }
    assert(fireTimes.length >= 8, '夜晚 12s 内应发射 ≥8 次（间隔 1.4s）', fireTimes);
    for (let i = 1; i < fireTimes.length; i++) {
      const gp = +(fireTimes[i] - fireTimes[i - 1]).toFixed(3);
      assert(Math.abs(gp - INTERVAL) <= 0.06, '发射间隔应≈1.4s', { i, gp, fireTimes });
    }

    // ============================================================
    // [5] 场景 D：射程边界（4 格）
    // ============================================================
    // (a) 4.1 格外 → 不发射
    freshNight();
    const pD = sb.gridToPos(1, 2);
    sb.__plants.push(sb.spawnPlant('fumeshroom', 1, 2, 0));
    const zFar = mkZ(2, pD.x + 4.1 * CELL_W, 100000);
    const seenD = new Set();
    let firesFar = 0;
    for (let i = 0; i < 60; i++) {                   // 3s
      g.__updateRaw(DT);
      for (const pr of sb.__projectiles) if (!seenD.has(pr)) { seenD.add(pr); firesFar++; }
    }
    assert(firesFar === 0, '4.1 格外不应发射', firesFar);
    assert(zFar.hp === 100000, '4.1 格外僵尸不掉血', zFar.hp);
    // (b) 移入 3.5 格内 → 发射
    zFar.x = pD.x + 3.5 * CELL_W;
    let firesNear = 0;
    for (let i = 0; i < 60; i++) {
      g.__updateRaw(DT);
      for (const pr of sb.__projectiles) if (!seenD.has(pr)) { seenD.add(pr); firesNear++; }
    }
    assert(firesNear >= 1, '4 格内应发射', firesNear);
    // (c) 恰好 4.0 格（含边界）→ 发射
    freshNight();
    const pD2 = sb.gridToPos(1, 2);
    sb.__plants.push(sb.spawnPlant('fumeshroom', 1, 2, 0));
    mkZ(2, pD2.x + RANGE * CELL_W, 100000);
    const seenD2 = new Set();
    let firesExact = 0;
    for (let i = 0; i < 30; i++) {                   // 1.5s
      g.__updateRaw(DT);
      for (const pr of sb.__projectiles) if (!seenD2.has(pr)) { seenD2.add(pr); firesExact++; }
    }
    assert(firesExact >= 1, '恰好 4.0 格（射程边界，含）应发射', firesExact);

    // ============================================================
    // [6] 场景 E：穿透 —— 同一发烟雾弹对同排 3 个僵尸各扣 20
    //     （运行窗口 < 1.4s 的下一发，确保仅 1 发弹体 → 三僵尸各被同一发命中）
    // ============================================================
    freshNight();
    const pE = sb.gridToPos(1, 2);
    sb.__plants.push(sb.spawnPlant('fumeshroom', 1, 2, 0));
    const zE1 = mkZ(2, pE.x + 1.5 * CELL_W, 100000);
    const zE2 = mkZ(2, pE.x + 2.5 * CELL_W, 100000);
    const zE3 = mkZ(2, pE.x + 3.5 * CELL_W, 100000);
    const seenE = new Set();
    let firedE = 0;
    for (let i = 0; i < 40; i++) {                   // 上限 2s；首发消失即停（< 1.4s 不会出第二发）
      g.__updateRaw(DT);
      for (const pr of sb.__projectiles) if (pr.type === 'fume' && !seenE.has(pr)) { seenE.add(pr); firedE++; }
      if (firedE >= 1 && !sb.__projectiles.some(pr => pr.type === 'fume')) break;
    }
    assert(firedE === 1, '本轮应只发射 1 发烟雾弹（隔离单发以证"同一发"穿透）', firedE);
    assert(zE1.hp === 100000 - DMG, '近靶应被扣 20', 100000 - zE1.hp);
    assert(zE2.hp === 100000 - DMG, '中靶应被同一发扣 20', 100000 - zE2.hp);
    assert(zE3.hp === 100000 - DMG, '远靶应被同一发扣 20（穿透不消失）', 100000 - zE3.hp);

    // ============================================================
    // [7] 场景 F：不重复扣血 —— 单僵尸在整个飞行期（多帧在命中窗内）恰好 -20
    // ============================================================
    freshNight();
    const pF = sb.gridToPos(1, 2);
    sb.__plants.push(sb.spawnPlant('fumeshroom', 1, 2, 0));
    const zF = mkZ(2, pF.x + 2.5 * CELL_W, 100000);
    let prF = null;
    for (let i = 0; i < 10 && !prF; i++) { g.__updateRaw(DT); prF = sb.__projectiles.find(pr => pr.type === 'fume') || null; }
    assert(prF, '应先产生 fume 弹体', prF);
    fume().cd = 9999;                                // 阻止再次发射，隔离单发
    let hitSeenF = false, survivedF = false, maxXF = -Infinity;
    for (let i = 0; i < 60; i++) {
      g.__updateRaw(DT);
      if (!hitSeenF && zF.hp < 100000) hitSeenF = true;
      const alive = sb.__projectiles.includes(prF);
      if (alive) maxXF = Math.max(maxXF, prF.x);
      if (hitSeenF && alive) survivedF = true;
      if (hitSeenF && !alive) break;
    }
    assert(hitSeenF, '弹体应命中僵尸', hitSeenF);
    assert(zF.hp === 100000 - DMG, '单个僵尸在整个飞行期恰好只被扣一次 20（hitIds 去重）', 100000 - zF.hp);
    assert(survivedF, '穿透弹命中后应继续存活（不消失）', survivedF);

    // ============================================================
    // [8] 场景 G：射程上限 —— 弹体飞越 4 格后消失
    // ============================================================
    assert(!sb.__projectiles.includes(prF), '弹体应已达射程上限并消失', sb.__projectiles.length);
    const spawnX = pF.x + 30;                        // 弹体发射点（= pos.x+30，同 pea 直线弹）
    assert(maxXF - spawnX <= RANGE * CELL_W + 1e-6,
      '弹体不得飞越 4 格（rangeMax 上限）', { maxXF, spawnX, travelled: maxXF - spawnX, limit: RANGE * CELL_W });
  },
};

// ---- 单文件自证 CLI：node tests/harness/cases/REG-MUSH-03.js ----
if (require.main === module) {
  const { loadGame, DEFAULT_SEED } = require(path.join(__dirname, '..', 'index.js'));
  const mod = module.exports;
  const g = loadGame({ seed: mod.seed != null ? mod.seed : DEFAULT_SEED });
  const assert = (cond, msg, extra) => {
    if (!cond) {
      let d = msg || '(no message)';
      if (extra !== undefined) { try { d += '  ::  ' + JSON.stringify(extra); } catch (e) { d += '  ::  ' + String(extra); } }
      throw new Error('[' + mod.id + '] 断言失败: ' + d);
    }
  };
  try {
    mod.run({ game: g, loadGame, assert, seed: mod.seed });
    console.log('\u2705 ' + mod.id + ' PASS  ·  ' + mod.name);
    process.exitCode = 0;
  } catch (e) {
    console.error('\u274c ' + mod.id + ' FAIL');
    console.error(e && e.stack ? e.stack : String(e));
    process.exitCode = 1;
  }
}
