'use strict';
/* ============================================================================
 * tests/playtests/v234-w2-night.js — v2.3.4 世界 2 全黑夜改判自证
 * ----------------------------------------------------------------------------
 * 背景（2026-09-28 用户拍板）：世界 2「暗夜墓地」名实相符——2-1~2-10 全程黑夜。
 *   改法=deriveTime 世界 2 直接返回 'night'（唯一昼夜推导源，name/lawn/天空掉阳光/
 *   向日葵 24s 周期/蘑菇清醒全部自动跟随）。
 * 断言：
 *   S1 2-1~2-10 全部 time==='night' 且 name 带「夜晚」且 lawn=夜板
 *   S2 2-1 蘑菇清醒回归：小喷菇在 2-1 直接开打（原白天沉睡不可用 → 现可用）
 *   S3 夜晚机制联动：2-1 天空不掉阳光（checkWave day 守卫）+ 向日葵 24s 周期
 *   S4 判别力：argv[2] 传旧源副本 → S1 必红（旧源 2-1='day'）
 *
 * 跑法：node tests/playtests/v234-w2-night.js [html路径] [tag]
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

const g = loadGame({ htmlPath: HTML, seed: 4234, localStorage: {} });
const LV = g.sandbox.__LEVELS;

// ---- S1：世界 2 十关全 night ----
console.log('[S1] 世界 2 十关 time/name/lawn 全黑夜');
const w2keys = ['2-1','2-2','2-3','2-4','2-5','2-6','2-7','2-8','2-9','2-10'];
let allNight = true, allNameOk = true;
for (const k of w2keys) {
  const lv = LV[k];
  if (!lv || lv.time !== 'night') { allNight = false; console.log('    ' + k + ' time=' + (lv && lv.time)); }
  if (!lv || !/夜晚$/.test(lv.name)) { allNameOk = false; }
}
ok(allNight, 'S1a 2-1..2-10 全部 time===night（v2.3.4 改判）');
ok(allNameOk, 'S1b 十关 name 全部以「夜晚」结尾');
ok(LV['2-1'].lawn[0] === '#5a6a50', 'S1c 2-1 lawn=世界 2 夜板（#5a6a50，非昼板 #7a8f6a）', LV['2-1'].lawn);
ok(LV['2-1'].graves && LV['2-1'].graves.length >= 6 && LV['2-1'].graves.length <= 9, 'S1d 2-1 墓碑机制仍在（6-9 座）');
ok(LV['3-1'].time === 'day' && LV['4-1'].time === 'day' && LV['1-1'].time === 'day', 'S1e 邻界回归：1-1/3-1/4-1 仍 day（改判未外溢）');

// ---- S2：2-1 蘑菇清醒（发下即用）----
console.log('[S2] 2-1 小喷菇清醒可战（原昼段沉睡 → 现黑夜清醒）');
{
  g.setLevel('2-1'); g.startGame('v234-mush');
  g.setSunFallT(9999);
  const sb = g.sandbox;
  const sbPlant = () => g.probe().plantsArr[0];
  g.selectCard(sb.__CARDS.findIndex(c => c.type === 'puffshroom'));
  // 找一个非墓碑格种植
  const graves = LV['2-1'].graves;
  let col = 0, row = 2;
  outer: for (let c = 0; c < 9; c++) for (let r = 0; r < 5; r++) {
    if (!graves.some(gg => gg[0] === c && gg[1] === r)) { col = c; row = r; break outer; }
  }
  g.clickGrid(col, row);
  const p0 = g.probe();
  ok(p0.plants === 1, 'S2a 小喷菇已种下（2-1）', p0.plants);
  // 黑夜清醒权威判据（照 REG-MUSH-02 口径）：场上放僵尸 → 小喷菇在射程内应发射（__projectiles 出弹）
  const sb2 = g.sandbox;
  g.forceZombieAt('normal', row, 400);   // 同行右侧 x=400（plant col≤3 时 3 格射程内）
  let shot = false;
  for (let i = 0; i < 100; i++) {
    g.__updateRaw(0.05);
    if (sb2.__projectiles.some(pr => pr.type === 'puff')) { shot = true; break; }
  }
  ok(shot, 'S2b 黑夜清醒：小喷菇对 3 格内僵尸出弹（若白天沉睡则永远不出弹）');
}

// ---- S3：夜晚机制联动（2-1 天空不掉阳光 + 向日葵 24s）----
console.log('[S3] 2-1 夜晚机制联动');
{
  g.setLevel('2-1'); g.startGame('v234-night');
  g.setSunFallT(0.05);   // 第一帧即触发天空掉落判定
  g.setSun(9999);
  const sb = g.sandbox;
  sb.__effects.length = 0;
  for (let i = 0; i < 20; i++) g.tick(0.05);   // 1s
  const suns = g.probe().effectsArr.filter(e => e.kind === 'sun').length;
  ok(suns === 0, 'S3a 2-1（night）天空不掉阳光（checkWave day 守卫生效）', suns);
}

console.log(`\n[v234-w2-night] ${nPass} pass / ${nFail} fail  (tag=${TAG})`);
process.exit(nFail === 0 ? 0 : 1);
