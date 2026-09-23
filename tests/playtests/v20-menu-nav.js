'use strict';
/* ============================================================================
 * tests/playtests/v20-menu-nav.js — T-205 选关页命中全链路自证（v2.0 M2）
 * ----------------------------------------------------------------------------
 * 链路（Q-18 / Q-17 / Q-3）：menu →select→ 页签切换 → 难度切换 → 点 1-1 → deck
 *   → 选卡返回回 select → 再点 1-1 → deck → 选卡开始 → play；占位 1-7 点击 → toast；
 *   锁定 1-4 点击 → 拒绝仍 select；deck 返回钮回 select（不再回 menu）。
 *
 * 驱动方式：harness loadGame + g.click(x,y)（真实 click listener 链路，非直调函数）。
 * 判别力自证：同链路对 v1.9.0 旧源必红（旧源 onClickMenu 无 select 通道）。
 *
 * 跑法：node tests/playtests/v20-menu-nav.js [html路径] [tag]（毫秒级，零 npm 依赖）
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
const G = { TAB: { x0: 104, y: 84, w: 192, h: 44, gap: 8 }, DIFF: { x0: 296, y: 139, w: 120, h: 30, gap: 24 }, CELL: { x0: 110, y: 180, w: 140, h: 96, colGap: 20, rowGap: 28 }, BACK: { x: 390, y: 430, w: 220, h: 50 } };
const tabC = (w) => [G.TAB.x0 + (w - 1) * (G.TAB.w + G.TAB.gap) + G.TAB.w / 2, G.TAB.y + G.TAB.h / 2];
const difC = (i) => [G.DIFF.x0 + i * (G.DIFF.w + G.DIFF.gap) + G.DIFF.w / 2, G.DIFF.y + G.DIFF.h / 2];
const cellC = (l) => [G.CELL.x0 + ((l - 1) % 5) * (G.CELL.w + G.CELL.colGap) + G.CELL.w / 2, G.CELL.y + Math.floor((l - 1) / 5) * (G.CELL.h + G.CELL.rowGap) + G.CELL.h / 2];
const backC = () => [G.BACK.x + G.BACK.w / 2, G.BACK.y + G.BACK.h / 2];

(async () => {  console.log(`[T-205] 选关页命中全链路 (${TAG}) ${HTML}`);
  const g = loadGame({ htmlPath: HTML });   // ★ loadGame 签名=({htmlPath})，位置参数会被静默忽略（判别力警报教训）
  const sb = g.sandbox;
  ok(g.probe().state === 'menu', 'N0 初始 menu');

  // ① menu → select（点击进入游戏钮 MENU_BTN 中心 500,428）
  g.click(500, 428);
  ok(g.probe().state === 'select', 'N1 点「进入游戏」→ select');
  ok(g.probe().selTab === 1, 'N1b 进页 selTab 缺省=levelKey 世界 1');

  // ② 页签切换 → 世界 3 → selTab=3；背景随页签（不采样像素，状态断言）
  let [cx, cy] = tabC(3); g.click(cx, cy);
  ok(g.probe().selTab === 3, 'N2 点页签 3 → selTab=3');
  // ③ 难度切换 → expert
  [cx, cy] = difC(2); g.click(cx, cy);
  ok(g.probe().DIFF === 'expert', 'N3 点地狱钮 → DIFF=expert');
  // ③b 切回 normal + 页签 1（后续用例基准）
  [cx, cy] = difC(0); g.click(cx, cy);
  ok(g.probe().DIFF === 'normal', 'N3b 切回普通');
  [cx, cy] = tabC(1); g.click(cx, cy);
  ok(g.probe().selTab === 1, 'N3c 切回世界 1');

  // ④ 占位格 1-7 点击 → toast 拦截仍 select（Q-3=A）
  [cx, cy] = cellC(7); g.click(cx, cy);
  ok(g.probe().state === 'select', 'N4 点占位 1-7 → 不进局仍 select');
  ok(g.probe().toastMsg === '该关卡即将开放', 'N4b toast=该关卡即将开放');

  // ⑤ 锁定格 1-4（unlocked=1-1 缺省）→ 拒绝仍 select
  [cx, cy] = cellC(4); g.click(cx, cy);
  ok(g.probe().state === 'select', 'N5 点锁定 1-4 → 拒绝仍 select');

  // ⑥ 点 1-1 → deck 选卡（Q-18）
  [cx, cy] = cellC(1); g.click(cx, cy);
  ok(g.probe().state === 'deck', 'N6 点 1-1 → deck');
  ok(g.probe().levelKey === '1-1', 'N6b levelKey 已指向 1-1');
  // ⑦ deck 选卡返回 → 回 select（不再回 menu）
  g.click(610, 627);
  ok(g.probe().state === 'select', 'N7 deck 返回钮 → select（Q-18 回程）');
  // ⑧ 再点 1-1 → deck → 选卡开始 → play
  [cx, cy] = cellC(1); g.click(cx, cy);
  ok(g.probe().state === 'deck', 'N8 再点 1-1 → deck');
  g.click(390, 627);   // 「开始」钮中心（300..480 × 600..654）
  const p8 = g.probe();
  ok(p8.state === 'play', 'N8b 选卡开始 → play');
  ok(p8.levelKey === '1-1', 'N8c 对局关卡=1-1');
  ok(p8.wave === 0 && p8.zombies === 0, 'N8d 对局初始态干净');

  // ⑨ Esc 退出对局 → 回 menu（旧链路不受影响）；再进 select 页签记忆
  //    （Esc 走 keydown，harness 有 keydown 注入；但退出确认链路需两击，这里直接验证 setState 通道即可——旧回归属 T-206 批量）
  // ⑩ 返回钮：select → menu
  // 重新进 select（play→menu 走 setStateMenu）
  g.setStateMenu('N10 准备');
  g.click(500, 428);
  ok(g.probe().state === 'select', 'N10 重进 select');
  sb.setState && null;   // selTab 为 let 不挂沙箱：经真实 UI 通道切换——点页签 2
  let [cx2, cy2] = tabC(2); g.click(cx2, cy2);
  ok(g.probe().selTab === 2, 'N10-prep 页签切到 2');
  const [bx, by] = backC(); g.click(bx, by);
  ok(g.probe().state === 'menu', 'N10b 返回钮 → menu');

  console.log(`\n[T-205] ${nPass} pass / ${nFail} fail  (tag=${TAG})`);
  // 追加式账本
  const JR = path.join(__dirname, 'v20-menu-nav-results.json');
  let ledger = { task: 'T-205 选关页命中全链路自证（v2.0 M2）', runs: [] };
  try { const old = JSON.parse(fs.readFileSync(JR, 'utf8')); if (old && Array.isArray(old.runs)) ledger = old; } catch (_) {}
  ledger.runs = (ledger.runs || []).filter((r) => r.tag !== TAG);
  ledger.runs.push({ tag: TAG, html: HTML, pass: nPass, fail: nFail, allPass: nFail === 0, date: new Date().toISOString().slice(0, 16) });
  fs.writeFileSync(JR, JSON.stringify(ledger, null, 2));
  process.exit(nFail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
