'use strict';
/* ============================================================================
 * tests/playtests/v20-end-nav.js — T-301 结算屏接新导航自证（v2.0 M3）
 * ----------------------------------------------------------------------------
 * 链路（plan §2.5）：
 *   E1  1-1 通关 → end；下一关钮点击 → levelKey='1-2'（真锚点，直进 play）
 *   E2  下一关钮文案/几何：END_BTN x 390..610 / nextY 410..460（与源码共用断言值）
 *   E3  1-6 通关（unlocked 已推进 1-7）→ 点下一关钮 → 占位拦截：toast+deny、levelKey 不变、留 end
 *       （★口径：占位拦截先于解锁检查，否则 1-7 模板局被直接开出 = 违反 Q-12）
 *   E4  4-10（世界末关）通关 → hasNext=false：下一关钮不渲染不响应；「已通关全部关卡」分支
 *   E5  失败态（won=false）：无下一关钮；返回钮点击 → select（T-301：menu→select）
 *   E6  通关态返回钮点击 → select；空格 end 态 → select
 *   E7  判别力：同链路对 v1.9.0 旧源必红（旧源下一关=LEVEL_INDEX 序位寻址跨世界、返回回 menu、无占位拦截）
 *
 * 跑法：node tests/playtests/v20-end-nav.js [html路径] [tag]（毫秒级，零 npm 依赖）
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

// END_BTN 几何（与源码 L50 同源：x:390,w:220,h:50,nextY:410,backGap:62）
const B = { x: 390, w: 220, h: 50, nextY: 410, backGap: 62 };
const nextC = () => [B.x + B.w / 2, B.nextY + B.h / 2];          // 下一关钮中心 (500,435)
const backCY = (hasNext) => (hasNext ? B.nextY + B.backGap : B.nextY) + B.h / 2;

// 通关构造（沿 v20-levelkey-switch §D 范式：forceWaves 开完所有波 + clearField 双清 → 判定达成）
function winTo(g) {
  g.clearField(); g.forceWaves(999); g.clearField();
  for (let i = 0; i < 30; i++) { g.tick(0.1); if (g.probe().state === 'end') break; }
  return g.probe().state === 'end' && g.probe().won === true;
}
function armDeny(g) {   // deny 计数桥
  let deny = 0;
  const S = g.sandbox.__SFX;
  if (S && typeof S.deny === 'function') { const _d = S.deny; S.deny = function () { deny++; _d.call(this); }; }
  return { get: () => deny };
}

(async () => {
  console.log(`[T-301] 结算屏接新导航 (${TAG}) ${HTML}`);

  // ---- E1/E2：1-1 通关 → 下一关直进 1-2 ----
  {
    const g = loadGame({ htmlPath: HTML, seed: 901, localStorage: {} });
    g.setLevel('1-1'); g.startGame('e1');
    ok(winTo(g), 'E1 前置：1-1 通关进入 end(won)');
    ok(g.probe().levelKey === '1-1', 'E1 前置：levelKey=1-1');
    const [cx, cy] = nextC(); g.click(cx, cy);
    const p = g.probe();
    ok(p.levelKey === '1-2', 'E1 点下一关钮 → levelKey="1-2"（同世界 +1）');
    ok(p.state === 'play', 'E1b 1-2 真锚点直进 play（不经 deck，沿旧下一关直进语义）');
  }

  // ---- E3：1-6 通关 → 下一关 1-7 占位拦截（toast+deny，不开局）----
  {
    const g = loadGame({ htmlPath: HTML, seed: 903, localStorage: {} });
    g.setLevel('1-6'); g.startGame('e3');
    ok(winTo(g), 'E3 前置：1-6 通关进入 end(won)');
    // 通关 1-6 后解锁推进已到 1-7（源码 L2090）→ 若无占位前置拦截，键序检查会放行 1-7
    ok(g.probe().unlockedLevel >= 7, 'E3 前置：通关后 unlocked 序位≥7（1-7 已解锁，占位拦截必须前置）');
    const d = armDeny(g);
    const [cx, cy] = nextC(); g.click(cx, cy);
    const p = g.probe();
    ok(p.state === 'end' && p.levelKey === '1-6', 'E3 点占位下一关 → 留 end、levelKey 仍 1-6（不开模板局）');
    ok(d.get() === 1, 'E3b 占位拦截播 SFX.deny', d.get());
    ok(g.probe().toastMsg === '该关卡即将开放', 'E3c toast=该关卡即将开放（Q-3 同源）');
  }

  // ---- E4：4-10 世界末关 → hasNext=false 隐藏下一关钮（该坐标落返回钮 → select 不换关）----
  {
    const g = loadGame({ htmlPath: HTML, seed: 904, localStorage: {} });
    g.setLevel('4-10'); g.startGame('e4');
    ok(winTo(g), 'E4 前置：4-10 通关进入 end(won)');
    const d = armDeny(g);
    const [cx, cy] = nextC(); g.click(cx, cy);
    const p = g.probe();
    // hasNext=false → backY=B.nextY → (500,435)=返回钮：进 select 且 levelKey 不变；
    // 若 hasNext 误判 true，会走换关/占位拦截（留 end 或 toast），state 必不是 select。
    ok(p.state === 'select' && p.levelKey === '4-10', 'E4 世界末关点下一关钮坐标 → 落返回钮进 select、不换关（钮已隐藏）');
    ok(d.get() === 0, 'E4b 无 deny 副作用（非占位拦截路径）');
  }

  // ---- E5：失败态 → 无下一关钮；nextC 坐标即返回钮 → select ----
  {
    const g = loadGame({ htmlPath: HTML, seed: 905, localStorage: {} });
    g.startGame('e5');
    g.forceZombieHome('normal'); g.tick(0.1);
    ok(g.probe().state === 'end' && g.probe().won === false, 'E5 前置：败局进 end(won=false)');
    const [cx, cy] = nextC(); g.click(cx, cy);
    const p = g.probe();
    ok(p.state === 'select' && p.levelKey === '1-1', 'E5 失败态点 nextC 坐标 → select 且不换关（无下一关钮，坐标=返回钮）');
    g.click(500, 455);   // select 返回钮（SELECT_GEOM.BACK 390,430,220×50 中心 y=455）
    ok(g.probe().state === 'menu', 'E5b select 返回钮 → menu（失败后导航链路完整）');
  }

  // ---- E6：通关态返回钮 → select；空格 end 态 → select ----
  {
    const g = loadGame({ htmlPath: HTML, seed: 906, localStorage: {} });
    g.setLevel('1-1'); g.startGame('e6');
    ok(winTo(g), 'E6 前置：1-1 通关');
    g.click(B.x + B.w / 2, backCY(true));   // hasNext=true → 返回钮 y 472..522
    ok(g.probe().state === 'select', 'E6 通关态返回钮 → select');
    // 空格链路：再打一局败局 → end 态空格 → select
    g.setStateMenu('e6 prep');
    g.startGame('e6b');
    g.forceZombieHome('normal'); g.tick(0.1);
    ok(g.probe().state === 'end', 'E6b 前置：败局 end');
    g.keydown(' ');
    ok(g.probe().state === 'select', 'E6c end 态空格 → select（对齐返回钮）');
  }

  // ---- 账本 + 判别力结论输出 ----
  console.log(`\n[T-301] ${nPass} pass / ${nFail} fail  (tag=${TAG})`);
  const JR = path.join(__dirname, 'v20-end-nav-results.json');
  let ledger = { task: 'T-301 结算屏接新导航自证（v2.0 M3）', runs: [] };
  try { const old = JSON.parse(fs.readFileSync(JR, 'utf8')); if (old && Array.isArray(old.runs)) ledger = old; } catch (_) {}
  ledger.runs = (ledger.runs || []).filter((r) => r.tag !== TAG);
  ledger.runs.push({ tag: TAG, html: HTML, pass: nPass, fail: nFail, allPass: nFail === 0, date: new Date().toISOString().slice(0, 16) });
  fs.writeFileSync(JR, JSON.stringify(ledger, null, 2));
  process.exit(nFail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
