'use strict';
/* ============================================================================
 * tests/playtests/v235-w2-curve.js — v2.3.5 世界 2 难度曲线三连改自证
 * ----------------------------------------------------------------------------
 * 背景（2026-09-28 用户手感实测四条反馈，三条落地）：
 *   ① 墓碑钻怪波次爬坡（方案 A）：GRAVE_SPAWN_RAMP——W1~W2 0% / W3~W4 15% / W5 起 30%
 *      （改前 W1 就全额 30%，防御未成型即被碑怪夹击，难度断崖）
 *   ② 墓碑位置约束：2-1~2-3 前三排（col 0~2）禁碑（重掷不计数，确定性保持）——
 *      咬碑藤 2-4 才发放，前三关前三排被碑挡死且无清碑手段
 *   ③ 奖励调换：CARD_AWARD 2-4='gravebuster' / 2-5='hypnoshroom'（清碑刚需前移 +
 *      魅惑菇与猫王首秀同关）
 * 断言：
 *   S1 爬坡契约：RAMP 表值域 + W1/W2 钻怪恒不发生（60 试 × 2 波全零）+ W3 可发生
 *   S2 位置约束：2-1~2-3 全部 graves 均无 col<3 点位；2-4/2-5 不受约束；总座数仍 6~9
 *   S3 奖励调换：CARD_AWARD['2-4']==='gravebuster' && ['2-5']==='hypnoshroom'
 *   S4 判别力：argv[2] 传旧源副本 → S1/S2/S3 必红（旧源无 RAMP/无位置约束/旧卡位）
 *
 * 跑法：node tests/playtests/v235-w2-curve.js [html路径] [tag]
 * ==========================================================================*/
const fs = require('fs');
const path = require('path');
const { loadGame } = require('../harness/index.js');

const ROOT = path.resolve(__dirname, '..', '..');
const HTML = path.resolve(ROOT, process.argv[2] || 'plants-vs-zombies.html');
const TAG = process.argv[3] || 'new';

let nPass = 0, nFail = 0;
function ok(cond, label) {
  if (cond) { nPass++; console.log('  PASS ' + label); }
  else { nFail++; console.log('  FAIL ' + label); }
}

const g = loadGame({ htmlPath: HTML, seed: 4235, localStorage: {} });
const LV = g.sandbox.__LEVELS;
const CONSTS = g.sandbox.__consts;

// ---- S1：爬坡契约 ----
console.log('[S1] 墓碑钻怪波次爬坡（GRAVE_SPAWN_RAMP）');
const ramp = CONSTS.GRAVE_SPAWN_RAMP;
ok(ramp && ramp[1] === 0 && ramp[2] === 0 && ramp[3] === 0.15 && ramp[4] === 0.15,
  'S1a RAMP 表值：W1/W2=0、W3/W4=0.15（W5 起回落 GRAVE_SPAWN_PCT）');
ok(CONSTS.GRAVE_SPAWN_PCT === 0.30, 'S1b 全额档 GRAVE_SPAWN_PCT 仍 0.30');

// W1/W2 钻怪恒不发生：60 试 × 2 波，队列长必等于 base 数
g.setLevel('2-1');
g.startGame();
let rampLeak = false;
for (let t = 0; t < 60 && !rampLeak; t++) {
  for (const w of [1, 2]) {
    g.sandbox.newWave(w);
    const qLen = g.probe().spawnQueueArr.length;
    const base = LV['2-1'].waves[w - 1].spawns.reduce((x, s) => x + s[1], 0);
    if (qLen > base) { rampLeak = true; break; }
  }
}
ok(!rampLeak, 'S1c W1/W2 钻怪恒不发生（60 试 × 2 波队列无溢出）');

// W3 可发生：60 试内至少 1 次溢出（15% × 6 碑 → 单试概率 ≈ 1-(0.85)^6 ≈ 62%）
let w3Hit = false;
for (let t = 0; t < 60 && !w3Hit; t++) {
  g.sandbox.newWave(3);
  const qLen = g.probe().spawnQueueArr.length;
  const base = LV['2-1'].waves[2].spawns.reduce((x, s) => x + s[1], 0);
  if (qLen > base) w3Hit = true;
}
ok(w3Hit, 'S1d W3 钻怪可发生（60 试内观察到队列溢出）');

// ---- S2：位置约束 ----
console.log('[S2] 2-1~2-3 前三排禁碑');
for (const k of ['2-1', '2-2', '2-3']) {
  const lv = LV[k];
  const front = lv.graves.filter(x => x[0] < 3);
  ok(lv.graves.length >= 6 && lv.graves.length <= 9 && front.length === 0,
    'S2 ' + k + '：' + lv.graves.length + ' 座且前三排 0 座（实测 ' + front.length + '）');
}
for (const k of ['2-4', '2-5']) {
  const lv = LV[k];
  ok(lv.graves.length >= 6 && lv.graves.length <= 9,
    'S2 ' + k + '：不受约束仍 6~9 座（' + lv.graves.length + '）');
}

// ---- S3：奖励调换 ----
console.log('[S3] CARD_AWARD 2-4/2-5 调换');
const CA = (function () {   // SLOT_CONFIG 在 sandbox 闭包内，经卡池管道反查：
  return null;              // 占位——真断言走 S3a/S3b 的卡池路径
})();
// S3a：通关 2-4 应发 gravebuster（走真实通关管道）
g.setLevel('2-4');
g.startGame();
g.forceWaves(99); g.clearField(); g.tick(0.05);
const m4 = g.probeMeta();
ok(m4.ownedCards.includes('gravebuster'), 'S3a 通 2-4 → 发 gravebuster');
// S3b：通关 2-5 应发 hypnoshroom
g.setLevel('2-5');
g.startGame();
g.forceWaves(99); g.clearField(); g.tick(0.05);
const m5 = g.probeMeta();
ok(m5.ownedCards.includes('hypnoshroom') && !m5.ownedCards.includes('gravebuster') === false,
  'S3b 通 2-5 → 发 hypnoshroom（gravebuster 已在池不冲突）');

// ---- 结果 ----
console.log('[' + path.basename(__filename) + '] ' + nPass + ' pass / ' + nFail + ' fail  (tag=' + TAG + ')');
process.exit(nFail > 0 ? 1 : 0);
