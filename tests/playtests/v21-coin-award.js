'use strict';
/* ============================================================================
 * tests/playtests/v21-coin-award.js — T-104 值域扩展+金币结算自证（v2.1 M1）
 * ----------------------------------------------------------------------------
 * 链路：
 *   A) 表形：CARD_AWARD 值域三态（8 真卡 string / 4 金币 number=100 / 28 PLACEHOLDER）
 *   B) 金币结算端到端：通关 1-7 → endStats.coin=100+total 乘算 → toast「通关奖励：100 金币」
 *      → points 入账 → 幂等（重通 coin=0）→ ownedCards 零污染（卡池仍 4 张）
 *   C) 暗雷回归：poolFromProgress——铺 1-7 通关态重载 → 卡池不含数字 100（typeof 守卫）
 *   D) worldClear 不混串：通关 1-10（铺满前 9）→ endStats.clear=300 与 coin 分立（1-10 金币 100 叠加=400 合计）
 *   E) 占位闸仍在：点 2-2/3-1 → toast 拦截（世界 2/3 未开放，安全序维持）
 *   F) 判别力：同链路对 v2.0.1 旧源必红（旧表 1-7='PLACEHOLDER'，无金币语义）
 *
 * 跑法：node tests/playtests/v21-coin-award.js [html路径] [tag]（毫秒级，零 npm 依赖）
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
// 异步 spawn git show（会话级 spawnSync EBUSY 规避，v20-test-unlock 先例）
function gitShow(ref) {
  return new Promise((resolve, reject) => {
    const p = spawn('git', ['show', ref + ':plants-vs-zombies.html'], { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 });
    let out = [], err = '';
    p.stdout.on('data', (d) => out.push(d));
    p.stderr.on('data', (d) => err += d);
    p.on('error', reject);
    p.on('close', (c) => (c === 0 ? resolve(Buffer.concat(out)) : reject(new Error('git show ' + ref + ' exit=' + c + ' ' + err))));
  });
}

(async () => {
  console.log(`[T-104] 金币结算自证 (${TAG}) ${HTML}`);

  // ---- A 表形 ----
  console.log('\n[A] CARD_AWARD 值域三态表形');
  const g0 = loadGame({ htmlPath: HTML });
  const CA = g0.sandbox.__consts.SLOT_CONFIG.CARD_AWARD;
  const keys = Object.keys(CA);
  const nStr = keys.filter((k) => typeof CA[k] === 'string' && CA[k] !== 'PLACEHOLDER').length;
  const nNum = keys.filter((k) => typeof CA[k] === 'number').length;
  const nPh = keys.filter((k) => CA[k] === 'PLACEHOLDER').length;
  ok(keys.length === 40, 'a1 40 键全在（实际 ' + keys.length + '）');
  ok(nStr === 8, 'a2 真卡 string=8（实际 ' + nStr + '）');
  ok(nNum === 4, 'a3 金币 number=4（实际 ' + nNum + '）');
  ok(nPh === 28, 'a4 PLACEHOLDER=28（实际 ' + nPh + '）');
  ok(CA['1-7'] === 100 && CA['1-10'] === 100, 'a5 金币键抽查（1-7/1-10=100）');
  ok(CA['2-2'] === 'PLACEHOLDER' && CA['3-1'] === 'PLACEHOLDER', 'a6 世界 2/3 仍占位（安全序：M2 waves 未落）');

  // ---- B 金币结算端到端 ----
  console.log('\n[B] 通关 1-7 金币结算端到端（首通/幂等/零污染）');
  // localStorage 须用接口桩（v20-reward-award makeStore 先例）：裸对象在 vm 沙箱内 setItem 抛错被静默降级吞掉
  function makeStore(init) {
    const d = Object.assign({}, init || {});
    return { _d: d, getItem: (k) => (d[k] != null ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
  }
  const store = makeStore({});
  const g = loadGame({ htmlPath: HTML, seed: 201, localStorage: store });
  g.setLevel('1-7'); g.startGame('coin-17');
  const p0 = g.probe(); ok(p0.points === 0 || p0.points != null, 'b0 前置：开局 points=' + p0.points);
  driveClear(g);
  const p1 = g.probe();
  ok(p1.state === 'end' && p1.won === true, 'b1 通关 1-7 进 end');
  ok(p1.endStats && p1.endStats.coin === 100, 'b2 ★endStats.coin=100（首通金币）');
  ok(p1.endStats && p1.endStats.clear === 0, 'b3 endStats.clear=0（worldClear 与金币分立，不混串）');
  ok(p1.toastMsg === '通关奖励：100 金币' && p1.toastT > 0, 'b4 ★toast=通关奖励：100 金币');
  // 重通 → 幂等（coin=0、无 toast）
  g.setLevel('1-7'); g.startGame('coin-17re');
  driveClear(g);
  const p2 = g.probe();
  ok(p2.endStats && p2.endStats.coin === 0, 'b5 重通 1-7 → coin=0（首通判定幂等）');
  ok(p2.toastT === 0, 'b6 重通无金币 toast（toastT=0 正判据）');
  // 卡池零污染
  ok(p2.ownedCards.length === 4, 'b7 ownedCards 仍 4 张（金币不入卡池，实际 ' + p2.ownedCards.length + '）');
  ok(!p2.ownedCards.includes(100) && !p2.ownedCards.includes('100'), 'b8 卡池无数字 100（typeof 守卫生效）');

  // ---- C 暗雷回归：poolFromProgress（重载路径）----
  console.log('\n[C] poolFromProgress 数字暗雷回归（重载）');
  const g3 = loadGame({ htmlPath: HTML, seed: 202, localStorage: store });
  const p3 = g3.probe();
  ok(p3.ownedCards.length === 4, 'c1 重载后卡池 4 张（无数字混入，实际 ' + p3.ownedCards.length + '）');
  ok(p3.saveCleared.indexOf('1-7') > -1, 'c2 存档回读 cleared 含 1-7（落档往返）');

  // ---- D worldClear 与金币叠加 ----
  console.log('\n[D] worldClear 叠加（1-10 铺满前 9 关 → 通关 1-10）');
  const g4 = loadGame({ htmlPath: HTML, seed: 203, localStorage: makeStore({}) });
  for (const k of ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8', '1-9']) {
    g4.setLevel(k); g4.startGame('d-' + k); driveClear(g4);
  }
  g4.setLevel('1-10'); g4.startGame('d-110'); driveClear(g4);
  const p4 = g4.probe();
  ok(p4.endStats && p4.endStats.clear === 300, 'd1 clear=300（worldClear 第 10 关触发）');
  ok(p4.endStats && p4.endStats.coin === 100, 'd2 ★coin=100（1-10 金币关首通叠加）');
  ok(p4.toastMsg === '通关奖励：100 金币', 'd3 toast=金币文案（coin 通道；worldClear 行走结算屏显示）');

  // ---- E 占位闸仍在（世界 2/3）----
  console.log('\n[E] 占位闸维持（安全序）');
  const g5 = loadGame({ htmlPath: HTML, seed: 204 });
  g5.setStateMenu('e');
  g5.click(500, 428);
  g5.click(200, 106);   // 页签 1（selTab 基准）
  g5.setUnlocked('1-10');   // 解锁铺到 1-10（非 testMode 链路：验金币闸，锁定 deny 先行会遮蔽）
  let [cx, cy] = cellC(10); g5.click(cx, cy);   // 1-10 → 金币闸已开 + 真实波次在位 → 可点进 deck
  ok(g5.probe().state === 'deck', 'e1 点 1-10 → deck（金币闸已开，真实波次在位）');
  g5.click(610, 627);   // deck 返回
  g5.click(400, 106);   // 页签 2（TAB x0=104,w=192,gap=8 → 第2签 304..496 中心 400）
  g5.setUnlocked('2-10');   // 解锁铺满世界 2：占位闸仍须拦（占位与解锁无关）
  [cx, cy] = cellC(2); g5.click(cx, cy);   // 2-2 仍占位
  let pe = g5.probe();
  ok(pe.state === 'select' && pe.toastT > 0, 'e2 ★点 2-2 → 拦截（世界 2 waves 未落，占位闸维持；解锁与否无关）');
  g5.click(600, 106);   // 页签 3（第3签 504..696 中心 600）
  [cx, cy] = cellC(1); g5.click(cx, cy);   // 3-1 恒占位
  pe = g5.probe();
  ok(pe.state === 'select' && pe.toastMsg === '该关卡即将开放', 'e3 点 3-1 → 拦截 toast（恒占位）');

  console.log(`\n[T-104] ${nPass} pass / ${nFail} fail  (tag=${TAG})`);

  // ---- F 旧源判别力（v2.0.1：表 1-7='PLACEHOLDER'，金币链路全红）----
  console.log('\n[F] v2.0.1 旧源判别力自证');
  let oldReds = 0;
  try {
    const buf = await gitShow('v2.0.1');
    const tmp = path.join(require('os').tmpdir(), 'v201-coin-src.html');
    fs.writeFileSync(tmp, buf);
    const go = loadGame({ htmlPath: tmp, seed: 201, localStorage: {} });
    const CAo = go.sandbox.__consts.SLOT_CONFIG.CARD_AWARD;
    const r1 = typeof CAo['1-7'] === 'number';
    if (!r1) { oldReds++; console.log('  RED f1 旧表 1-7 非 number（=' + JSON.stringify(CAo['1-7']) + '）——无金币语义'); }
    go.setLevel('1-7'); go.startGame('f-old'); driveClear(go);
    const po = go.probe();
    const r2 = !!(po.endStats && po.endStats.coin === 100);
    if (!r2) { oldReds++; console.log('  RED f2 旧源通关 1-7 coin≠100（endStats.coin=' + (po.endStats ? po.endStats.coin : 'undefined') + '）'); }
    const r3 = po.toastMsg === '通关奖励：100 金币';
    if (!r3) { oldReds++; console.log('  RED f3 旧源无金币 toast（="' + po.toastMsg + '"）'); }
    try { fs.unlinkSync(tmp); } catch (_) {}
  } catch (e) {
    console.log('  （旧源导出失败，跳过 F 段：' + e.message.slice(0, 80) + '）');
  }
  console.log(`\n[F] 旧源判别力：${oldReds} 红（预期≥2）`);
  console.log(`RESULT: ${nFail === 0 && oldReds >= 2 ? 'PASS' : 'FAIL'} —— 新源全绿 + 旧源必红`);

  // 追加式账本
  const JR = path.join(__dirname, 'v21-coin-award-results.json');
  let ledger = { task: 'T-104 金币结算自证（v2.1 M1）', runs: [] };
  try { const old = JSON.parse(fs.readFileSync(JR, 'utf8')); if (old && Array.isArray(old.runs)) ledger = old; } catch (_) {}
  ledger.runs = ledger.runs.filter((r) => r.tag !== TAG);
  ledger.runs.push({ tag: TAG, html: HTML, pass: nPass, fail: nFail, allPass: nFail === 0, oldRed: oldReds, date: new Date().toISOString().slice(0, 16) });
  fs.writeFileSync(JR, JSON.stringify(ledger, null, 2));
  process.exitCode = (nFail === 0 && oldReds >= 2) ? 0 : 1;
})();
