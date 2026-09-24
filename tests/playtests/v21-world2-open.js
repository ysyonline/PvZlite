'use strict';
/* ============================================================================
 * tests/playtests/v21-world2-open.js — T-204 世界 2 开放全链路自证（v2.1 M2）
 * ----------------------------------------------------------------------------
 * 链路：
 *   A) 表形：金币 number=13（1-7~1-10 + 2-2~2-10）/ PLACEHOLDER=19（世界 3 全 + 世界 4 除 4-1）
 *   B) 金币结算端到端：通关 2-2 → coin=100 + toast + 幂等 + 卡池零污染
 *   C) 选关页让位：2-2 可点进 deck（金币闸开 + 真实波次在位）；3-1 仍拦（恒占位）
 *   D) worldClear 世界 2：铺 2-1..2-9 → 通 2-10 → clear=300 + coin=100 叠加
 *   E) 雾局抽验：URL 直跳 2-6 → play + levelKey=2-6（真雾局）
 *   F) 判别力：同链路对 v2.0.1 旧源必红（旧表 2-2='PLACEHOLDER'）
 *
 * 跑法：node tests/playtests/v21-world2-open.js [html路径] [tag]（毫秒级，零 npm 依赖）
 * ==========================================================================*/
const fs = require('fs');
const path = require('path');
const { loadGame } = require('../harness/index.js');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const HTML = path.resolve(ROOT, process.argv[2] || 'plants-vs-zombies.html');
const TAG = process.argv[3] || 'new';

let nPass = 0, nFail = 0;
function ok(cond, label) {
  if (cond) { nPass++; console.log('  PASS ' + label); }
  else { nFail++; console.log('  FAIL ' + label); }
}
const cellC = (l) => [110 + ((l - 1) % 5) * 160 + 70, 180 + Math.floor((l - 1) / 5) * 124 + 48];
function driveClear(g) { g.forceWaves(99); g.clearField(); g.tick(0.05); }
function makeStore(init) {
  const d = Object.assign({}, init || {});
  return { _d: d, getItem: (k) => (d[k] != null ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}
function gitShow(ref) {
  return new Promise((resolve, reject) => {
    const p = spawn('git', ['show', ref + ':plants-vs-zombies.html'], { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 });
    let out = [], err = '';
    p.stdout.on('data', (d) => out.push(d));
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', (c) => (c === 0 ? resolve(Buffer.concat(out)) : reject(new Error('git show ' + ref + ' exit=' + c + ' ' + err))));
  });
}

(async () => {
  console.log(`[T-204] 世界 2 开放全链路 (${TAG}) ${HTML}`);

  // ---- A 表形 ----
  console.log('\n[A] CARD_AWARD 值域表形（M2 终态）');
  const g0 = loadGame({ htmlPath: HTML });
  const CA = g0.sandbox.__consts.SLOT_CONFIG.CARD_AWARD;
  const keys = Object.keys(CA);
  const nStr = keys.filter((k) => typeof CA[k] === 'string' && CA[k] !== 'PLACEHOLDER').length;
  const nNum = keys.filter((k) => typeof CA[k] === 'number').length;
  const nPh = keys.filter((k) => CA[k] === 'PLACEHOLDER').length;
  ok(keys.length === 40, 'a1 40 键全在');
  ok(nStr === 8, 'a2 真卡 string=8（实际 ' + nStr + '）');
  ok(nNum === 13, 'a3 ★金币 number=13（世界 1 后 4 + 世界 2 九关；实际 ' + nNum + '）');
  ok(nPh === 19, 'a4 PLACEHOLDER=19（世界 3 全 10 + 世界 4 除 4-1 的 9；实际 ' + nPh + '）');
  ok(CA['2-2'] === 100 && CA['2-10'] === 100, 'a5 金币键抽查（2-2/2-10=100）');

  // ---- B 金币结算端到端（2-2）----
  console.log('\n[B] 通关 2-2 金币结算端到端');
  const g = loadGame({ htmlPath: HTML, seed: 301, localStorage: makeStore({}) });
  g.setLevel('2-2'); g.startGame('w2-22');
  driveClear(g);
  const p1 = g.probe();
  ok(p1.state === 'end' && p1.won === true, 'b1 通关 2-2 进 end');
  ok(p1.endStats && p1.endStats.coin === 100, 'b2 ★coin=100（首通）');
  ok(p1.toastMsg === '通关奖励：100 金币' && p1.toastT > 0, 'b3 toast=通关奖励：100 金币');
  g.setLevel('2-2'); g.startGame('w2-22re');
  driveClear(g);
  const p2 = g.probe();
  ok(p2.endStats && p2.endStats.coin === 0, 'b4 重通 coin=0（幂等）');
  ok(p2.ownedCards.length === 4, 'b5 卡池零污染（仍 4 张）');

  // ---- C 选关页让位 ----
  console.log('\n[C] 选关页让位（金币闸开）');
  const g3 = loadGame({ htmlPath: HTML, seed: 302 });
  g3.setStateMenu('c');
  g3.click(500, 428);
  g3.click(400, 106);   // 页签 2
  g3.setUnlocked('2-10');
  let [cx, cy] = cellC(2); g3.click(cx, cy);
  let pc = g3.probe();
  ok(pc.state === 'deck' && pc.levelKey === '2-2', 'c1 ★点 2-2 → deck（世界 2 开放）');
  g3.click(610, 627);   // 返回
  g3.click(600, 106);   // 页签 3
  [cx, cy] = cellC(1); g3.click(cx, cy);
  pc = g3.probe();
  ok(pc.state === 'select' && pc.toastMsg === '该关卡即将开放', 'c2 点 3-1 仍拦（世界 3 恒占位）');

  // ---- D worldClear 世界 2 ----
  console.log('\n[D] worldClear 世界 2（铺 2-1..2-9 → 通 2-10）');
  const g4 = loadGame({ htmlPath: HTML, seed: 303, localStorage: makeStore({}) });
  for (const k of ['2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-7', '2-8', '2-9']) {
    g4.setLevel(k); g4.startGame('d-' + k); driveClear(g4);
  }
  g4.setLevel('2-10'); g4.startGame('d-210'); driveClear(g4);
  const p4 = g4.probe();
  ok(p4.endStats && p4.endStats.clear === 300, 'd1 clear=300（世界 2 worldClear）');
  ok(p4.endStats && p4.endStats.coin === 100, 'd2 ★coin=100 叠加（2-10 金币首通）');

  // ---- E 雾局抽验 ----
  console.log('\n[E] 雾局抽验（?=2-6 直跳）');
  const g5 = loadGame({ htmlPath: HTML, search: '?level=2-6', seed: 304 });
  const p5 = g5.probe();
  ok(p5.levelKey === '2-6', 'e1 直跳 levelKey=2-6（真雾局位）');
  const LV5 = g5.sandbox.__LEVELS['2-6'];
  ok(LV5.time === 'fog' && LV5.totalWaves === 8, 'e2 2-6 time=fog 8 波');

  console.log(`\n[T-204] ${nPass} pass / ${nFail} fail  (tag=${TAG})`);

  // ---- F 旧源判别 ----
  console.log('\n[F] v2.0.1 旧源判别力自证');
  let oldReds = 0;
  try {
    const buf = await gitShow('v2.0.1');
    const tmp = path.join(require('os').tmpdir(), 'v201-w2-src.html');
    fs.writeFileSync(tmp, buf);
    const go = loadGame({ htmlPath: tmp, seed: 301, localStorage: makeStore({}) });
    const CAo = go.sandbox.__consts.SLOT_CONFIG.CARD_AWARD;
    if (typeof CAo['2-2'] !== 'number') { oldReds++; console.log('  RED f1 旧表 2-2 非 number（=' + JSON.stringify(CAo['2-2']) + '）'); }
    go.setLevel('2-2'); go.startGame('f-old'); driveClear(go);
    const po = go.probe();
    if (!(po.endStats && po.endStats.coin === 100)) { oldReds++; console.log('  RED f2 旧源通关 2-2 coin≠100'); }
    if (po.toastMsg !== '通关奖励：100 金币') { oldReds++; console.log('  RED f3 旧源无金币 toast（="' + po.toastMsg + '"）'); }
    try { fs.unlinkSync(tmp); } catch (_) {}
  } catch (e) {
    console.log('  （旧源导出失败，F 段跳过：' + e.message.slice(0, 80) + '）');
  }
  console.log(`\n[F] 旧源判别力：${oldReds} 红（预期≥2）`);
  console.log(`RESULT: ${nFail === 0 && oldReds >= 2 ? 'PASS' : 'FAIL'} —— 新源全绿 + 旧源必红`);

  const JR = path.join(__dirname, 'v21-world2-open-results.json');
  let ledger = { task: 'T-204 世界 2 开放全链路自证（v2.1 M2）', runs: [] };
  try { const old = JSON.parse(fs.readFileSync(JR, 'utf8')); if (old && Array.isArray(old.runs)) ledger = old; } catch (_) {}
  ledger.runs = ledger.runs.filter((r) => r.tag !== TAG);
  ledger.runs.push({ tag: TAG, html: HTML, pass: nPass, fail: nFail, allPass: nFail === 0, oldRed: oldReds, date: new Date().toISOString().slice(0, 16) });
  fs.writeFileSync(JR, JSON.stringify(ledger, null, 2));
  process.exitCode = (nFail === 0 && oldReds >= 2) ? 0 : 1;
})();
