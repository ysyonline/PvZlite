/* REG-MUSH-04 · 魅惑菇（hypnoshroom）+ 魅惑状态机 [V23-U4]
 * ============================================================
 * 设计依据（唯一权威）：design/gdd/v23-night-mushrooms.md
 *   §2 夜行机制：蘑菇类白天（level.time==='day'）沉睡（不产/不攻/不触发），夜晚/浓雾清醒。
 *   §3.4 魅惑菇：cost 75 / 种植 cd 30s / dur 300；触发 = 被僵尸**啃食**（非踩中）：
 *                啃食者转为玩家阵营（z.hypno=true），魅惑菇自身消失；免疫名单（巨人/冰车/投石车）。
 *   §4 僵尸阵营交互：z.hypno=true → 向右行走、不再啃植物，改与敌方僵尸互啃；可被反杀；
 *                    Q-5：被魅惑僵尸击杀敌方**计玩家分**，被反杀**不计分**。
 *
 * 覆盖断言（V23-U4 验收）：
 *   [1] isNocturnal('hypnoshroom') 为真 + 卡定义 name 魅惑菇 / cost 75 / cd 30 / dur 300
 *   [2] 白天（day）沉睡不可魅惑：僵尸啃食魅惑菇不触发（hypno 仍 false），魅惑菇按普通植物被吃（dur↓）
 *   [3] 夜晚（night）：僵尸啃食魅惑菇 → 该僵尸 hypno===true，魅惑菇消失
 *   [4] 被魅惑僵尸向右移动（x 单调增大）
 *   [5] 被魅惑僵尸不再啃食植物（相邻植物 dur 不再下降）
 *   [6] 被魅惑僵尸与敌方僵尸互啃并造成伤害（双方 hp 各按 65/s 下降）
 *   [7] 被魅惑僵尸击杀敌方僵尸 → 玩家分增加（Q-5）
 *   [8] 被魅惑僵尸被反杀 → 不计分（Q-5）
 *   [9] 边界：被魅惑僵尸越出屏幕右缘 → 移出即消失（不计分/不判负）
 *   [10] 免疫名单（Q-2 记位）：'gargantuar' 等被魅惑菇啃食不触发（按普通植物被吃）
 *
 * 运行：node tests/harness/run-all.js（REG-* 收录）或单文件自证 node tests/harness/cases/REG-MUSH-04.js
 * ============================================================ */
'use strict';

const path = require('path');

// GDD §3.4/§4 规格常量（测试侧硬编码以「钉死规格」；源码侧同名字面量见 plants-vs-zombies.html 顶部 v2.3 常量块）
const COST = 75;        // 阳光
const CD = 30;          // 种植冷却（秒）
const DUR = 300;        // 耐久
const BITE_DPS = 65;    // 互啃伤害速率（= 僵尸啃植物 65/s 同口径）
const IMMUNE = 'gargantuar';   // 免疫名单样本（巨人；本作未实装，仅验证守卫分支）

module.exports = {
  id: 'REG-MUSH-04',
  name: '魅惑菇（昼沉睡 / 夜被啃触发魅惑 / 右行·互啃 / Q-5 计分 / 免疫记位）',
  seed: 42,
  run({ game: g, assert }) {
    const sb = g.sandbox;
    const DT = 0.05;                              // 帧步长（秒）
    const CELL_W = sb.__consts.CELL_W;
    const CANVAS_W = sb.__consts.CANVAS_W;
    const hypoPlants = () => sb.__plants.filter(p => p.type === 'hypnoshroom');
    const score = () => g.probe().score;

    // 造一只静止靶（spd 缺省 0 → 不移动，隔离变量）
    const mkZ = (type, row, x, hp, spd) => {
      const z = { type: type || 'normal', row, x, hp, maxHp: hp, spd: spd == null ? 0 : spd,
        eating: false, eatAnim: 0, walk: 0, dead: false };
      sb.__zombies.push(z);
      return z;
    };
    // 新对局 + 隔离自然掉落阳光
    const freshNight = () => {
      g.setLevel('3-3'); g.startGame(); g.setSunFallT(9999);
      assert(sb.__level.time === 'night', '3-3 应为夜晚（night）', sb.__level.time);
    };
    const freshDay = () => {
      g.setLevel('1-1'); g.startGame(); g.setSunFallT(9999);
      assert(sb.__level.time === 'day', '1-1 应为白天（day）', sb.__level.time);
    };

    // ============================================================
    // [1] 夜行判定 + 卡定义
    // ============================================================
    assert(typeof sb.isNocturnal === 'function', 'isNocturnal 应为顶层函数');
    assert(sb.isNocturnal('hypnoshroom') === true, 'hypnoshroom 应为夜行', null);
    const card = sb.__CARDS.find(c => c.type === 'hypnoshroom');
    assert(card, 'CARDS 应含 hypnoshroom 卡', null);
    assert(card.name === '魅惑菇', '魅惑菇 name 应为「魅惑菇」', card);
    assert(card.cost === COST, '魅惑菇 cost 应为 75', card);
    assert(card.cd === CD, '魅惑菇 种植 cd 应为 30', card);
    assert(card.dur === DUR, '魅惑菇 dur 应为 300', card);

    // ============================================================
    // [2] 场景 A：白天（day）沉睡不可魅惑 —— 啃食不触发，按普通植物被吃（dur↓）
    // ============================================================
    freshDay();
    const pA = sb.gridToPos(1, 2);
    sb.__plants.push(sb.spawnPlant('hypnoshroom', 1, 2, 0));
    const zA = mkZ('normal', 2, pA.x + 30, 100000);   // 紧贴魅惑菇右侧 → 会啃食
    for (let i = 0; i < 40; i++) g.__updateRaw(DT);    // 2s
    assert(zA.hypno !== true, '白天沉睡：僵尸啃食魅惑菇不得触发魅惑（hypno 仍 false）', zA.hypno);
    const aPlants = hypoPlants();
    assert(aPlants.length === 1, '白天魅惑菇按普通植物被吃（2s 内未耗尽应仍在场）', aPlants.length);
    assert(aPlants[0].dur < DUR, '白天魅惑菇应被正常啃食（dur 下降）', aPlants[0].dur);

    // ============================================================
    // [3] 场景 B：夜晚啃食 → 触发魅惑（hypno=true，魅惑菇消失）
    // ============================================================
    freshNight();
    const pB = sb.gridToPos(1, 2);
    sb.__plants.push(sb.spawnPlant('hypnoshroom', 1, 2, 0));
    const zB = mkZ('normal', 2, pB.x + 30, 100000);
    for (let i = 0; i < 3; i++) g.__updateRaw(DT);
    assert(zB.hypno === true, '夜晚：僵尸啃食魅惑菇应触发魅惑（hypno===true）', zB.hypno);
    assert(hypoPlants().length === 0, '魅惑触发后魅惑菇自身应消失（_dying 移除路径）', hypoPlants().length);
    assert(!zB.dead && zB.hp > 0, '触发魅惑的僵尸应仍存活', { dead: zB.dead, hp: zB.hp });

    // ============================================================
    // [4]+[5] 场景 C：被魅惑僵尸向右移动（x 单调增大）且不再啃食植物
    // ============================================================
    freshNight();
    const pC = sb.gridToPos(1, 2);
    sb.__plants.push(sb.spawnPlant('hypnoshroom', 1, 2, 0));
    const zC = mkZ('normal', 2, pC.x + 30, 100000, 16);
    g.__updateRaw(DT);
    assert(zC.hypno === true, '场景 C 前置：应已触发魅惑', zC.hypno);
    // 在同一格补一株普通植物（位于僵尸左侧 30px，若僵尸仍「啃植物」必被吃）
    const nut = sb.spawnPlant('nut', 1, 2, 0);
    sb.__plants.push(nut);
    const nutDur0 = nut.dur;
    const xs = [];
    for (let i = 0; i < 20; i++) { g.__updateRaw(DT); xs.push(zC.x); }
    let monotonic = true;
    for (let i = 1; i < xs.length; i++) if (!(xs[i] > xs[i - 1])) monotonic = false;
    assert(monotonic, '被魅惑僵尸应持续向右移动（x 单调增大）', xs);
    assert(zC.x > pC.x + 30, '被魅惑僵尸应已离开初始位置（向右）', zC.x);
    assert(nut.dur === nutDur0, '被魅惑僵尸不得再啃食植物（相邻植物 dur 不变）', { now: nut.dur, was: nutDur0 });

    // ============================================================
    // [6] 场景 D：互啃造成伤害（被魅惑者 ↔ 敌方，双方 hp 各按 65/s 下降）
    // ============================================================
    freshNight();
    const pD = sb.gridToPos(1, 2);
    sb.__plants.push(sb.spawnPlant('hypnoshroom', 1, 2, 0));
    const zD = mkZ('normal', 2, pD.x + 30, 100000);   // 魅惑者
    g.__updateRaw(DT);
    assert(zD.hypno === true, '场景 D 前置：应已触发魅惑', zD.hypno);
    const foe = mkZ('normal', 2, zD.x + 40, 100000);   // 敌方（40px，落入互啃接触范围）
    const hpA0 = zD.hp, hpB0 = foe.hp;
    for (let i = 0; i < 40; i++) g.__updateRaw(DT);     // 2s
    const expDrop = BITE_DPS * 2.0;
    assert(Math.abs((hpB0 - foe.hp) - expDrop) < 1.5, '敌方应被互啃受伤（≈65/s）', { droppped: hpB0 - foe.hp, exp: expDrop });
    assert(Math.abs((hpA0 - zD.hp) - expDrop) < 1.5, '被魅惑者应被反噬受伤（≈65/s）', { droppped: hpA0 - zD.hp, exp: expDrop });
    assert(foe.eating !== true, '被锁定的敌方应停止啃食动作', foe.eating);

    // ============================================================
    // [7] 场景 E：被魅惑僵尸击杀敌方 → 玩家分增加（Q-5）
    // ============================================================
    freshNight();
    const pE = sb.gridToPos(1, 2);
    sb.__plants.push(sb.spawnPlant('hypnoshroom', 1, 2, 0));
    const zE = mkZ('normal', 2, pE.x + 30, 100000);
    g.__updateRaw(DT);
    assert(zE.hypno === true, '场景 E 前置：应已触发魅惑', zE.hypno);
    const foeE = mkZ('normal', 2, zE.x + 40, 20);       // 敌方低血（20）→ 会被击杀
    const sE0 = score();
    for (let i = 0; i < 40 && !foeE.dead; i++) g.__updateRaw(DT);
    assert(foeE.dead, '低血敌方应被魅惑僵尸击杀', { dead: foeE.dead, hp: foeE.hp });
    assert(score() === sE0 + 50, '被魅惑僵尸击杀敌方（normal）应计入玩家分 +50', { before: sE0, after: score() });

    // ============================================================
    // [8] 场景 F：被魅惑僵尸被反杀 → 不计分（Q-5）
    // ============================================================
    freshNight();
    const pF = sb.gridToPos(1, 2);
    sb.__plants.push(sb.spawnPlant('hypnoshroom', 1, 2, 0));
    const zF = mkZ('normal', 2, pF.x + 30, 100000);
    g.__updateRaw(DT);
    assert(zF.hypno === true, '场景 F 前置：应已触发魅惑', zF.hypno);
    zF.hp = 20;                                        // 被魅惑者低血 → 会被反杀
    const foeF = mkZ('normal', 2, zF.x + 40, 100000);
    const sF0 = score();
    for (let i = 0; i < 40 && !zF.dead; i++) g.__updateRaw(DT);
    assert(zF.dead, '低血被魅惑僵尸应被敌方反杀', { dead: zF.dead, hp: zF.hp });
    assert(score() === sF0, '被魅惑僵尸被反杀不得计分', { before: sF0, after: score() });

    // ============================================================
    // [9] 场景 G：边界 —— 被魅惑僵尸越出屏幕右缘即消失（不计分/不判负）
    // ============================================================
    freshNight();
    const sG0 = score();
    const zG = mkZ('normal', 0, CANVAS_W - 5, 100000, 300);
    zG.hypno = true;                                   // 直接构造被魅惑僵尸逼近右缘
    let sawBeyond = false, gone = false;
    for (let i = 0; i < 30; i++) {
      g.__updateRaw(DT);
      if (zG.x > CANVAS_W + 40) sawBeyond = true;
      if (!sb.__zombies.includes(zG)) { gone = true; break; }
    }
    assert(gone, '越出右缘的被魅惑僵尸应被移除（移出即消失）', sb.__zombies.length);
    assert(zG.x > CANVAS_W, '移除前 x 应已越过屏幕右缘', zG.x);
    assert(score() === sG0, '被魅惑僵尸离场不得计分', { before: sG0, after: score(), sawBeyond });

    // ============================================================
    // [10] 场景 H：免疫名单记位（Q-2）—— 'gargantuar' 啃食魅惑菇不触发
    // ============================================================
    freshNight();
    const pH = sb.gridToPos(1, 2);
    sb.__plants.push(sb.spawnPlant('hypnoshroom', 1, 2, 0));
    const zH = mkZ(IMMUNE, 2, pH.x + 30, 100000);
    for (let i = 0; i < 40; i++) g.__updateRaw(DT);
    assert(zH.hypno !== true, '免疫名单僵尸（' + IMMUNE + '）啃食魅惑菇不得触发魅惑', zH.hypno);
    const hPlants = hypoPlants();
    assert(hPlants.length === 1 && hPlants[0].dur < DUR,
      '免疫僵尸应把魅惑菇当普通植物啃食（dur↓）', hPlants.map(p => p.dur));
  },
};

// ---- 单文件自证 CLI：node tests/harness/cases/REG-MUSH-04.js ----
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
