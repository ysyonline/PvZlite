'use strict';
/* ============================================================================
 * tests/playtests/v20-test-unlock.js — T-603 ?test=1 解锁定闸自证（v2.0.1）
 * ----------------------------------------------------------------------------
 * v2.0.1 语义（用户拍板）：test=1 只解「锁定」闸；占位 toast 保留（占位关永远
 * 不可玩，Q-3/Q-12 决策）。源码三处 !testMode&& 前置（onClickSelect 解锁检查 /
 * onClickEnd 下一关 / drawSelect locked 视觉）+ VERSION v2.0.1。
 *
 * 链路（真实点击，不直调）：
 *   menu → select → 点锁定 1-4（unlocked 缺省 1-1）→ deck（核心：解锁定闸）
 *   → deck 返回 → 点占位 1-7 → 仍 select + toast 活动（核心：占位 toast 保留）
 *   → 再点锁定 1-4 → deck（回归）→ 开始 → play + sun=9999（testMode 特征）。
 *
 * toast 判据（T-302 沉淀）：无新提示时 toastMsg 残留旧串但 toastT=0 ⇒ 正判据
 *   toastT>0；toastMsg 仅辅助。
 *
 * 判别力自证（B 段 · 项目铁律）：git show v2.0.0:plants-vs-zombies.html 导出
 *   临时文件（git show 偶发段错误 3221225477，复跑即过），search 仍 ?test=1，
 *   用例 3（点 1-4 → deck）与用例 7（sun=9999）必红（旧源无解锁旁路，
 *   点 1-4 被拒停在 select）——至少 2 红。
 *
 * 跑法：node tests/playtests/v20-test-unlock.js [html路径] [tag]
 * 产物：tests/playtests/v20-test-unlock-results.json（追加式账本）
 * ==========================================================================*/
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
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
const cellC = (l) => [G.CELL.x0 + ((l - 1) % 5) * (G.CELL.w + G.CELL.colGap) + G.CELL.w / 2, G.CELL.y + Math.floor((l - 1) / 5) * (G.CELL.h + G.CELL.rowGap) + G.CELL.h / 2];

// v2.0.0 旧源基线：tag（本地缺 tag 时导入即失败并明示）；导出走异步 spawn
// （本机经验：Node spawnSync 对任意 .exe 偶发 EBUSY/段错误 3221225477，异步 spawn 稳定）
const V200_TAG = 'v2.0.0';

/** 异步 spawn git show（stdout 全量收集；非 0 退出码 reject） */
function gitShow(rev, relPath) {
  return new Promise((resolve, reject) => {
    const p = spawn('git', ['show', rev + ':' + relPath], { cwd: ROOT });
    let out = [], err = '';
    p.stdout.on('data', (d) => out.push(d));
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', (c) => (c === 0 ? resolve(Buffer.concat(out).toString('utf8')) : reject(new Error('git show exit ' + c + ': ' + err.trim()))));
  });
}

/** 压掉游戏 [PvZ] console 输出（loadGame 沙箱直用宿主 console，防止打断断言清单） */
function fresh(htmlPath) {
  const orig = console.log;
  console.log = function () {};
  try {
    return loadGame({ htmlPath: htmlPath, search: '?test=1' });   // ★ T-603 全链路 test=1
  } finally {
    console.log = orig;
  }
}

/** 同一用例链路跑一遍；cnt=计数器对象 {pass,fail}；返回 {t3,t5,t6,t7} 各环节布尔 */
function runChain(htmlPath, cnt, quiet) {
  const p = (cond, label) => {
    if (cond) cnt.pass++;
    else cnt.fail++;
    if (!quiet) console.log('  ' + (cond ? 'PASS ' : 'FAIL ') + label);
  };
  const g = fresh(htmlPath);
  const r = {};
  // 1 初始 menu
  const b1 = g.probe().state === 'menu';
  p(b1, 'U1 初始 state=menu');
  // 2 进选关页
  g.click(500, 428);
  const b2 = g.probe().state === 'select' && g.probe().selTab === 1;
  p(g.probe().state === 'select', 'U2 点「进入游戏」→ select');
  p(g.probe().selTab === 1, 'U2b selTab=1');
  // 3 核心：test=1 点锁定关 1-4（unlocked 缺省 '1-1'）→ 应进 deck
  let [cx, cy] = cellC(4); g.click(cx, cy);
  const p3 = g.probe();
  r.t3 = p3.state === 'deck' && p3.levelKey === '1-4';
  p(p3.state === 'deck', 'U3 ★test=1 点锁定 1-4 → deck（解锁定闸）');
  p(p3.levelKey === '1-4', 'U3b levelKey=1-4');
  // 4 deck 返回钮 → select
  g.click(610, 627);
  const b4 = g.probe().state === 'select';
  p(b4, 'U4 deck 返回钮 → select');
  // 5 核心：占位 1-7 → 仍 select + toast 活动（占位判定与 testMode 无关）
  ;[cx, cy] = cellC(7); g.click(cx, cy);
  const p5 = g.probe();
  r.t5 = p5.state === 'select' && p5.toastT > 0 && p5.toastMsg === '该关卡即将开放';
  p(p5.state === 'select', 'U5 ★点占位 1-7 → 不进局仍 select（占位拦截保留）');
  p(p5.toastMsg === '该关卡即将开放', 'U5b toastMsg=该关卡即将开放');
  p(p5.toastT > 0, 'U5c toastT>0（提示活动；T-302 正判据）');
  // 6 回归：占位点击后再点锁定 1-4 → 仍能进 deck
  ;[cx, cy] = cellC(4); g.click(cx, cy);
  const p6 = g.probe();
  r.t6 = p6.state === 'deck' && p6.levelKey === '1-4';
  p(p6.state === 'deck', 'U6 占位点击后再点 1-4 → deck（回归）');
  p(p6.levelKey === '1-4', 'U6b levelKey=1-4');
  // 7 加固：开始钮 → play + sun=9999（testMode 特征）
  g.click(390, 627);
  const p7 = g.probe();
  r.t7 = p7.state === 'play' && p7.levelKey === '1-4' && p7.sun === 9999;
  p(p7.state === 'play', 'U7 开始 → play');
  p(p7.levelKey === '1-4', 'U7b 对局关卡=1-4');
  p(p7.sun === 9999, 'U7c sun=9999（testMode 特征）');
  return r;
}

(async () => {
  console.log(`[T-603] ?test=1 解锁定闸自证 (A:${TAG}) ${HTML}`);
  // ---------------- A 段：当前源全链路 ----------------
  const cntA = { pass: 0, fail: 0 };
  const resA = runChain(HTML, cntA, false);
  nPass += cntA.pass; nFail += cntA.fail;
  console.log(`\n[A] 新源: ${cntA.pass} pass / ${cntA.fail} fail`);

  // ---------------- B 段：v2.0.0 旧源判别力自证（同链路必红≥2） ----------------
  console.log(`\n[B] v2.0.0 旧源判别力自证（${V200_TAG}，search 仍 ?test=1）`);
  const tmp = path.join(os.tmpdir(), 'pvz-v200-' + Date.now() + '.html');
  let oldOk = false;
  let cntB = { pass: 0, fail: 0 };
  let resB = null;
  try {
    // 异步 spawn 导出旧源（spawnSync EBUSY 教训；最多 3 次重试兜偶发失败）
    let src = null;
    for (let i = 0; i < 3 && src === null; i++) {
      try { src = await gitShow(V200_TAG, 'plants-vs-zombies.html'); }
      catch (e) { /* 重试 */ }
    }
    if (src === null) throw new Error('git show v2.0.0 连续 3 次失败');
    fs.writeFileSync(tmp, src);
    oldOk = true;
  } catch (e) {
    console.log('  SKIP 旧源导出失败: ' + e.message);
  }
  let nRed = 0;
  if (oldOk) {
    // B 段对每环节断「新语义应成立」：旧源上核心环节必红（旧源点 1-4 被拒停 select）
    try {
      resB = runChain(tmp, cntB, true);
    } catch (e) {
      console.log('  WARN 旧源链路异常: ' + e.message);
    }
    if (resB) {
      // 各环节打印红绿（true=旧源上意外绿=判别力缺失；false=红=判别命中）
      console.log('  ' + (resB.t3 ? 'UNEXPECTED-GREEN' : 'RED') + ' 用例3 点锁定1-4→deck（预期红）');
      console.log('  ' + (resB.t5 ? 'UNEXPECTED-GREEN' : 'RED') + ' 用例5 占位1-7→toast（预期绿：占位拦截与版本无关）');
      console.log('  ' + (resB.t6 ? 'UNEXPECTED-GREEN' : 'RED') + ' 用例6 再点1-4→deck（预期红）');
      console.log('  ' + (resB.t7 ? 'UNEXPECTED-GREEN' : 'RED') + ' 用例7 开始→play+sun9999（预期红）');
      nRed = (resB.t3 ? 0 : 1) + (resB.t5 ? 0 : 0) + (resB.t6 ? 0 : 1) + (resB.t7 ? 0 : 1);
    }
    console.log(`\n[B] 旧源判别力：${nRed} 红（预期≥2）`);
    try { fs.rmSync(tmp, { force: true }); } catch (e) { /* 忽略 */ }
  }

  const verdict = nFail === 0 && nRed >= 2;
  console.log(`\n[T-603] ${nPass} pass / ${nFail} fail  (tag=${TAG} · 旧源判别 ${nRed} 红 ≥2)`);
  console.log('RESULT: ' + (verdict ? 'PASS —— 新源全绿 + 旧源必红' : 'FAIL'));

  // 追加式账本（同 v20-menu-nav-results.json 格式）
  const JR = path.join(__dirname, 'v20-test-unlock-results.json');
  let ledger = { task: 'T-603 ?test=1 解锁定闸自证（v2.0.1）', runs: [] };
  try { const old = JSON.parse(fs.readFileSync(JR, 'utf8')); if (old && Array.isArray(old.runs)) ledger = old; } catch (_) {}
  ledger.runs = (ledger.runs || []).filter((r) => r.tag !== TAG);
  ledger.runs.push({ tag: TAG, html: HTML, pass: nPass, fail: nFail, oldRed: nRed, allPass: verdict, date: new Date().toISOString().slice(0, 16) });
  fs.writeFileSync(JR, JSON.stringify(ledger, null, 2));
  process.exit(verdict ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
