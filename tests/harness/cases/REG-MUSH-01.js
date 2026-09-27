/* REG-MUSH-01 · 夜行机制（nocturnal）+ 阳光菇（sunshroom）[V23-U1]
 * ============================================================
 * 设计依据（唯一权威）：design/gdd/v23-night-mushrooms.md
 *   §2 夜行机制：蘑菇类白天（level.time==='day'）沉睡（不产/不攻/不触发），夜晚/浓雾清醒。
 *   §3.1 阳光菇：cost 25 / 种植 cd 7.5 / dur 300；夜晚首产 6s、之后每 24s；
 *                种植 120s 后成体，幼体产小阳光 15、成体产大阳光 25；成长不重置产阳光周期。
 *
 * 覆盖断言（V23-U1 验收）：
 *   [1] isNocturnal 判定（四类蘑菇一次写全：sunshroom/puffshroom/fumeshroom/hypnoshroom 为真；其余为假）
 *   [2] 阳光菇卡定义 cost 25 / cd 7.5 / dur 300
 *   [3] 白天（day）不产阳光（沉睡）：连续推帧 10s 零产出，且不计时（sunT 保持首产初值、growT 保持 0）
 *   [4] 夜晚首产 6s、产量 15（幼体）；周期 24s
 *   [5] 种植 120s 成体后产量转 25，且产阳光周期不被重置（成体后首个产出仍落在「上一次 +24s」节点 126s）
 *
 * 运行：node tests/harness/run-all.js（REG-* 收录）或单文件自证 node tests/harness/cases/REG-MUSH-01.js
 * ============================================================ */
'use strict';

const path = require('path');

// GDD §3.1 规格常量（测试侧硬编码以「钉死规格」；源码侧同名字面量见 plants-vs-zombies.html 顶部 v2.3 常量块）
const FIRST = 6;         // 夜晚首产（秒）
const INTERVAL = 24;     // 产阳光周期（秒）
const GROW = 120;        // 成体所需成长时长（秒）
const V_BABY = 15;       // 幼体产量（小阳光）
const V_ADULT = 25;      // 成体产量（大阳光）

module.exports = {
  id: 'REG-MUSH-01',
  name: '夜行机制 + 阳光菇（白天沉睡 / 首产6s / 周期24s / 120s成长）',
  seed: 42,
  run({ game: g, assert }) {
    const sb = g.sandbox;
    const DT = 0.05;                                   // 帧步长（秒）
    const suns = () => g.probe().effectsArr.filter(e => e.kind === 'sun');
    const plant = () => sb.__plants[0];

    // ---- [1] isNocturnal：四类蘑菇一次写全 ----
    assert(typeof sb.isNocturnal === 'function', 'isNocturnal 应为顶层函数');
    assert(sb.isNocturnal('sunshroom') === true, 'sunshroom 应为夜行');
    assert(sb.isNocturnal('puffshroom') === true, 'puffshroom 应为夜行');
    assert(sb.isNocturnal('fumeshroom') === true, 'fumeshroom 应为夜行');
    assert(sb.isNocturnal('hypnoshroom') === true, 'hypnoshroom 应为夜行');
    assert(sb.isNocturnal('sunflower') === false, 'sunflower 不应为夜行');
    assert(sb.isNocturnal('pea') === false, 'pea 不应为夜行');

    // ---- [2] 阳光菇卡定义（cost 25 / cd 7.5 / dur 300）----
    const card = sb.__CARDS.find(c => c.type === 'sunshroom');
    assert(card, 'CARDS 应含 sunshroom 卡');
    assert(card.cost === 25, '阳光菇 cost 应为 25', card);
    assert(card.cd === 7.5, '阳光菇 种植 cd 应为 7.5', card);
    assert(card.dur === 300, '阳光菇 dur 应为 300', card);
    assert(card.name === '阳光菇', '阳光菇 name 应为「阳光菇」', card);

    // ============================================================
    // 场景 A：白天（day）沉睡 —— 不产阳光 + 不计时
    // ============================================================
    g.setLevel('1-1');
    g.startGame();
    g.setSunFallT(9999);                                // 隔离自然掉落阳光
    assert(sb.__level.time === 'day', '1-1 应为白天（day）', sb.__level.time);
    sb.__plants.push(sb.spawnPlant('sunshroom', 0, 2, 0));
    assert(plant().sunT === FIRST, '阳光菇种植初值 sunT 应为 6（首产计时）', plant().sunT);
    assert((plant().growT || 0) === 0, '阳光菇种植初值 growT 应为 0', plant().growT);

    for (let i = 0; i < 200; i++) g.__updateRaw(DT);    // 白天推进 10s
    assert(suns().length === 0, '白天沉睡：不得产出任何阳光', suns());
    assert(plant().sunT === FIRST, '白天沉睡不计时：sunT 应保持 6（未被扣减）', plant().sunT);
    assert((plant().growT || 0) === 0, '白天沉睡不计时：growT 应保持 0', plant().growT);

    // ============================================================
    // 场景 B：夜晚（night）—— 首产 6s / 周期 24s / 120s 成长
    // ============================================================
    g.setLevel('1-6');
    g.startGame();
    g.setSunFallT(9999);
    assert(sb.__level.time === 'night', '1-6 应为夜晚（night）', sb.__level.time);
    sb.__plants.push(sb.spawnPlant('sunshroom', 3, 2, 0));

    // 连续推帧 130s；以「sunT 由 ~0 被重置为 24」判定产出瞬间（对效果存活期不敏感，最稳）
    const prods = [];                                    // {t, value, growT}
    let t = 0, prevSunT = plant().sunT;
    for (let i = 0; i < 2600; i++) {                     // 2600 * 0.05 = 130s
      g.__updateRaw(DT);
      t += DT;
      const cur = plant().sunT;
      if (cur > prevSunT + 1) {                          // sunT 由 ~0 跳回 24 ⇒ 本帧发生一次产出
        const live = suns();
        prods.push({
          t: +t.toFixed(3),
          value: live.length ? live[live.length - 1].value : null,   // 最新（末尾）的阳光即本次产出
          growT: +plant().growT.toFixed(3),
        });
      }
      prevSunT = cur;
    }

    // [4] 首产 + 周期 + 幼体产量
    assert(prods.length === 6, '夜晚 130s 内应产出 6 次（6/30/54/78/102/126s）', prods);
    assert(Math.abs(prods[0].t - FIRST) <= 0.12, '夜晚首产时刻应≈6s', prods[0]);
    for (let i = 1; i < prods.length; i++) {
      const gap = +(prods[i].t - prods[i - 1].t).toFixed(3);
      assert(Math.abs(gap - INTERVAL) <= 0.12, '产阳光周期应≈24s', { i, gap, prods });
    }
    for (let i = 0; i < 5; i++) {
      assert(prods[i].value === V_BABY, '幼体（growT<120）产量应为 15', prods[i]);
      assert(prods[i].growT < GROW, '第 ' + (i + 1) + ' 次产出应在成体前（growT<120）', prods[i]);
    }

    // [5] 120s 成长 → 产量转 25；且成长不重置产阳光周期（第 6 次产出仍落在 102+24=126s）
    assert(prods[5].value === V_ADULT, '成体（growT≥120）产量应转为 25', prods[5]);
    assert(prods[5].growT >= GROW, '第 6 次产出时应已成体（growT≥120）', prods[5]);
    assert(Math.abs(prods[5].t - 126) <= 0.12,
      '成体不重置产阳光周期：第 6 次产出应≈126s（=102+24），而非成长点 120s 重启的 144s', prods[5]);
    assert(Math.abs(prods[4].t - 102) <= 0.12, '第 5 次产出应≈102s（成体前最后一次幼体产出）', prods[4]);
  },
};

// ---- 单文件自证 CLI：node tests/harness/cases/REG-MUSH-01.js ----
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
