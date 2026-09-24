'use strict';
/* ============================================================================
 * tests/playtests/v20-fullchain-11.js — T-302 1-1 全链路联调自证（v2.0 M3）
 * ----------------------------------------------------------------------------
 * 全链路（plan §6 T-302，纯 UI 真实点击路径，不走 setLevel 直赋）：
 *   F1 menu →「进入游戏」→ select → 点格 1-1 → deck（Q-18）→「开始」→ play
 *   F2 对局字段兼容：levelKey='1-1'、world/time/startSun/totalWaves、无水行/无屋顶；
 *      种植零改动实证（选卡+格子种下 plants=1、阳光扣费 sun=100）
 *   F3 通关（forceWaves/clearField 既有范式）→ end won=true
 *   F4 发卡：ownedCards 含 'double'（唯一）+ toast「解锁新卡…」
 *   F5 落档：saveCleared=['1-1']、unlocked='1-2'、pvz_progress_v2={v:2,cleared,unlocked}
 *   F6 结算「返回选关」→ select（saveCleared 已含 1-1 = 选关页「已通关」渲染数据源；
 *      暗金+✓ 像素呈现由 T-204 v20-select-draw 已覆盖）
 *   F7 重复通关幂等：再点 1-1 → deck → 开始 → 通关 → ownedCards 仍 1 张、
 *      cleared 仍 1 项、unlocked 仍 '1-2'、无重复发卡 toast
 *
 * 判别力自证：同链路对 v1.9.0 旧源必红（旧源无 select/deck 分屏，F1 即断）。
 * 跑法：node tests/playtests/v20-fullchain-11.js [html路径] [tag]（毫秒级，零 npm 依赖）
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

// 几何（与源码 MENU_BTN/SELECT_GEOM/deck 钮同源；改动须双侧同步）
const MENU_BTN_C = [500, 428];                       // 主菜单「进入游戏」钮中心
const CELL_11 = [180, 228];                          // 选关格 1-1（row0 col0）中心
const DECK_START = [390, 627];                       // 选卡页「开始」钮中心（300..480 × 600..654）
const END_BTN = { x: 390, w: 220, nextY: 410, h: 50, backGap: 62 };

// 通关构造（沿 v20-levelkey-switch §D 范式）
function winTo(g) {
  g.clearField(); g.forceWaves(999); g.clearField();
  for (let i = 0; i < 30; i++) { g.tick(0.1); if (g.probe().state === 'end') break; }
}

// 带独立 localStorage 的装载（断言落盘内容用）
function makeStore() {
  return { _d: {}, getItem(k) { return this._d[k] != null ? this._d[k] : null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } };
}

(async () => {
  console.log(`[T-302] 1-1 全链路联调 (${TAG}) ${HTML}`);
  const store = makeStore();
  const g = loadGame({ htmlPath: HTML, seed: 1001, localStorage: store });

  // ---- F1 menu → select → 点 1-1 → deck → 开始 → play ----
  ok(g.probe().state === 'menu', 'F1.0 初始 menu');
  g.click(MENU_BTN_C[0], MENU_BTN_C[1]);
  ok(g.probe().state === 'select' && g.probe().selTab === 1, 'F1.1 进入游戏 → select（页签 1）');
  g.click(CELL_11[0], CELL_11[1]);
  ok(g.probe().state === 'deck' && g.probe().levelKey === '1-1', 'F1.2 点格 1-1 → deck（Q-18，levelKey=1-1）');
  g.click(DECK_START[0], DECK_START[1]);
  ok(g.probe().state === 'play', 'F1.3 选卡开始 → play');

  // ---- F2 对局字段兼容 + 种植零改动 ----
  const lv = g.sandbox.__level;
  ok(g.probe().levelKey === '1-1' && lv && lv.world === 1 && lv.time === 'day',
    'F2.1 对局=1-1 锚点字段（world=1/time=day）');
  ok(lv.startSun === 150 && lv.totalWaves === 5, 'F2.2 startSun=150/totalWaves=5（旧 L1 数值原样）');
  ok(!lv.water && !lv.roof, 'F2.3 1-1 无水行/无屋顶（lawn 平地，机制字段零误挂）');
  g.selectCard(0); g.clickGrid(2, 3);
  ok(g.probe().plants === 1, 'F2.4 种植零改动：选卡+点格种下 1 株');
  ok(g.probe().sun === 100, 'F2.5 阳光扣费正常（150-50=100）');

  // ---- F3 通关 ----
  winTo(g);
  const p3 = g.probe();
  ok(p3.state === 'end' && p3.won === true, 'F3 1-1 通关进入 end(won=true)');

  // ---- F4 发卡 ----
  const m4 = g.probeMeta();
  ok(m4.ownedCards.filter((t) => t === 'double').length === 1, 'F4.1 通关发 double（卡池恰 1 张）');
  ok(/解锁新卡/.test(g.probe().toastMsg || ''), 'F4.2 toast=解锁新卡…（' + (g.probe().toastMsg || '') + '）');

  // ---- F5 落档 ----
  const p5 = g.probe();
  ok(p5.saveCleared && p5.saveCleared.length === 1 && p5.saveCleared[0] === '1-1', 'F5.1 cleared 集合=[1-1]');
  ok(p5.unlocked === '1-2', 'F5.2 unlocked 推进=1-2（键名形态）');
  const v2 = JSON.parse(store.getItem('pvz_progress_v2') || 'null');
  ok(v2 && v2.v === 2 && Array.isArray(v2.cleared) && v2.cleared.join() === '1-1' && v2.unlocked === '1-2',
    'F5.3 pvz_progress_v2 落盘={v:2,cleared:[1-1],unlocked:1-2}');

  // ---- F6 结算「返回选关」→ select 显示已通（数据源断言）----
  g.click(END_BTN.x + END_BTN.w / 2, END_BTN.nextY + END_BTN.backGap + END_BTN.h / 2);   // hasNext=true → 返回钮 y 472..522
  const p6 = g.probe();
  ok(p6.state === 'select' && p6.saveCleared.indexOf('1-1') >= 0,
    'F6 返回选关 → select（saveCleared 含 1-1 = 格子暗金✓渲染数据源）');

  // ---- F7 重复通关幂等 ----
  g.click(CELL_11[0], CELL_11[1]);
  ok(g.probe().state === 'deck', 'F7.1 已通关格 1-1 仍可点 → deck');
  g.click(DECK_START[0], DECK_START[1]);
  ok(g.probe().state === 'play' && g.probe().levelKey === '1-1', 'F7.2 二次开局 play（1-1）');
  winTo(g);
  ok(g.probe().state === 'end' && g.probe().won === true, 'F7.3 二次通关');
  const m7 = g.probeMeta();
  ok(m7.ownedCards.filter((t) => t === 'double').length === 1, 'F7.4 重复通关不重复发卡（double 仍 1 张）');
  ok(m7.ownedCards.length === 5 && m7.ownedCards.sort().join() === 'double,mine,nut,pea,sunflower',
    'F7.5 卡池=初始 4 张+double 不变（' + m7.ownedCards.length + ' 张）');
  const p7 = g.probe();
  ok(p7.saveCleared && p7.saveCleared.length === 1 && p7.saveCleared[0] === '1-1', 'F7.6 cleared 集合仍=[1-1]（不重复入集）');   // 旧源 saveCleared=null 必红
  ok(p7.unlocked === '1-2', 'F7.7 unlocked 仍=1-2（不越位推进）');
  // ★toast 是覆盖式单槽：无新 toast 时变量残留上一次字符串但 toastT=0（不显示）。
  //   判「无重复发卡」的正判据=无活动 toast（toastT===0），而非变量内容。
  ok(g.probe().toastT === 0, 'F7.8 无活动 toast（发卡 toast 未重弹，toastT=0）');

  console.log(`\n[T-302] ${nPass} pass / ${nFail} fail  (tag=${TAG})`);
  const JR = path.join(__dirname, 'v20-fullchain-11-results.json');
  let ledger = { task: 'T-302 1-1 全链路联调自证（v2.0 M3）', runs: [] };
  try { const old = JSON.parse(fs.readFileSync(JR, 'utf8')); if (old && Array.isArray(old.runs)) ledger = old; } catch (_) {}
  ledger.runs = (ledger.runs || []).filter((r) => r.tag !== TAG);
  ledger.runs.push({ tag: TAG, html: HTML, pass: nPass, fail: nFail, allPass: nFail === 0, date: new Date().toISOString().slice(0, 16) });
  fs.writeFileSync(JR, JSON.stringify(ledger, null, 2));
  process.exit(nFail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
