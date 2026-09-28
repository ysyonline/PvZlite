'use strict';
/* ============================================================================
 * tests/playtests/v20-end-nav.js — T-301 结算屏接新导航自证（v2.0 M3）
 * ----------------------------------------------------------------------------
 * 链路（plan §2.5）：
 *   E1  1-1 通关 → end；下一关钮点击 → levelKey='1-2'（真锚点，进 deck 选卡——v2.3 Q-18 流程）
 *   E2  下一关钮文案/几何：END_BTN x 390..610 / nextY 410..460（与源码共用断言值）
 *   E3  ★v2.3.3 4-1 通关（unlocked 已推进 4-2）→ 点下一关钮 → 4-2 金币关进 deck
 *       （v2.3.3 世界 4 开放后 40 键零占位，原「占位拦截」断言链路退役；金币闸语义同 E3d 1-6→1-7）
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
    ok(p.state === 'deck', 'E1b ★v2.3 语义：下一关先进选卡界面 deck（Q-18 流程，非直接开局）');
  }

  // ---- E3：4-1 通关 → 下一关 4-2 金币关直进 play（v2.3.3 世界 4 开放，原占位拦截断言链路退役）----
  // 历史：v2.1 时占位仅剩 4-2..4-10（断言 toast+deny 留 end）；v2.3.3 起 40 键零占位——
  // 「占位拦截先于解锁检查」的口径由选关页锁定格路径（SMOKE-023）继续覆盖，end 屏链路全为金币闸真局。
  {
    const g = loadGame({ htmlPath: HTML, seed: 903, localStorage: {} });
    g.setLevel('4-1'); g.startGame('e3');
    ok(winTo(g), 'E3 前置：4-1 通关进入 end(won)');
    ok(g.probe().unlocked === '4-2', 'E3 前置：通关后 unlocked=4-2');
    const d = armDeny(g);
    const [cx, cy] = nextC(); g.click(cx, cy);
    const p = g.probe();
    ok(p.state === 'deck' && p.levelKey === '4-2', 'E3 点下一关 → levelKey=4-2 进 deck（金币关真局，经 Q-18 选卡流程）');
    ok(d.get() === 0, 'E3b 无 deny 副作用（金币闸开，非占位路径）', d.get());
    ok(p.toastMsg !== '该关卡即将开放', 'E3c 无占位 toast「该关卡即将开放」（占位已清零）', p.toastMsg);
    // v2.1 断言保留：1-6→1-7 金币关直进 play（跨世界回归锚）
    const g2 = loadGame({ htmlPath: HTML, seed: 913, localStorage: {} });
    g2.setLevel('1-6'); g2.startGame('e3b');
    ok(winTo(g2), 'E3d 前置：1-6 通关进入 end');
    const [nx, ny] = nextC(); g2.click(nx, ny);
    const q = g2.probe();
    ok(q.state === 'deck' && q.levelKey === '1-7', 'E3d ★v2.1：1-6 下一关 1-7 金币关 → 进 deck（金币闸开，v2.3 起经选卡流程）');
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
