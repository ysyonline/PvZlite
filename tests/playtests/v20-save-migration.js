/* ============================================================
 * v20-save-migration · T-103 存档 v2 + 旧档迁移自检
 * ------------------------------------------------------------
 * 验证 plants-vs-zombies.html 的 v2 存档结构 + 旧档单向幂等迁移
 * （production/v2.0-plan.md §3.4 / §8.1 验收单 / Q-2·Q-14·Q-16 拍板）：
 *   A) 五态旧档迁移：pvz_unlocked=N（N=1..5）+ 缺档 → cleared/unlocked 逐项断言；
 *   B) 迁移幂等 + 旧键保留：同一 store 二次 loadGame 不二次写；pvz_unlocked 原值仍在；
 *   C) testMode 零落盘：迁移与通关双路径均不写任何键（纯沙盒铁律），内存态照常推进；
 *   D) Q-14 复合键迁移：'hard:3'→'hard:1-6' 读侧迁移 + 旧串合并保留 + 端到端
 *      （'1-6' hard 通关发 corn 不重复）+ 未知键直通；
 *   E) probe 双暴露：unlockedLevel=序位派生、unlocked=键名直读、saveCleared 集合桥；
 *   F) 判别力自证（项目铁律：旧源必红）：对 `git show ad9ca6c:plants-vs-zombies.html`
 *      （T-102 刀，无 v2 存档/无键名解锁）跑同组源码断言 ⇒ 必红。
 *
 * 双重结论（新绿 + 旧红）任一不成立 ⇒ exit 1。
 *
 * 跑法：node tests/playtests/v20-save-migration.js（毫秒级，零 npm 依赖）
 * 规划出处：production/v2.0-plan.md §3.4（v2 结构与迁移规则）/ §8.1（本验收单）/
 *           Q-16（键名形态）/ Q-14（diff_clears 复合键）
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadGame } = require('../harness/index.js');

const ROOT = path.resolve(__dirname, '..', '..');
const OLD_COMMIT = 'ad9ca6c';   // T-102 施工刀：levelKey 收口前夜，无 v2 存档、unlockedLevel 数字语义

let nPass = 0, nFail = 0;
function ok(cond, label) {
  if (cond) { nPass++; console.log('  PASS ' + label); }
  else { nFail++; console.log('  FAIL ' + label); }
}

// 最小 localStorage 桩（带注入初值；_d 直读供「不写任何键」全键断言）
function makeStore(init) {
  const d = Object.assign({}, init || {});
  return {
    _d: d,
    getItem: function (k) { return d[k] != null ? d[k] : null; },
    setItem: function (k, v) { d[k] = String(v); },
    removeItem: function (k) { delete d[k]; },
  };
}

function quietLoad(opts) {
  const orig = console.log;
  console.log = function () {};
  try {
    return loadGame(Object.assign({ seed: 424242 }, opts || {}));
  } finally {
    console.log = orig;
  }
}

// 通关驱动（T-104b 实证稳态路径：forceWaves 后清场 → 胜利判定当帧达成，无僵尸漂移）
function driveClear(g) {
  g.clearField();
  g.forceWaves(999);
  g.clearField();
  for (let i = 0; i < 20; i++) { g.tick(0.1); if (g.probe().state === 'end') break; }
}

/* ------------------------------------------------------------
 * §A 五态旧档迁移（N=1..5 + 缺档）
 * ---------------------------------------------------------- */
console.log('\n[A] 五态旧档迁移（pvz_unlocked=N → cleared/unlocked）');
const expect = {
  1: { cleared: [], unlocked: '1-1' },
  2: { cleared: ['1-1'], unlocked: '1-2' },
  3: { cleared: ['1-1', '1-2'], unlocked: '1-3' },
  4: { cleared: ['1-1', '1-2', '1-3'], unlocked: '1-4' },
  5: { cleared: ['1-1', '1-2', '1-3', '1-4'], unlocked: '1-5' },
};
for (let n = 1; n <= 5; n++) {
  const store = makeStore({ pvz_unlocked: String(n) });
  const g = quietLoad({ seed: 100 + n, localStorage: store });
  const p = g.probe();
  ok(p.unlocked === expect[n].unlocked, 'a' + n + '1 N=' + n + ' → probe.unlocked==="' + expect[n].unlocked + '"（实际 ' + p.unlocked + '）');
  ok(JSON.stringify(p.saveCleared) === JSON.stringify(expect[n].cleared),
     'a' + n + '2 N=' + n + ' → cleared=' + JSON.stringify(expect[n].cleared) + '（实际 ' + JSON.stringify(p.saveCleared) + '）');
  ok(JSON.stringify(JSON.parse(store.getItem('pvz_progress_v2'))) ===
     JSON.stringify({ v: 2, cleared: expect[n].cleared, unlocked: expect[n].unlocked, cardSeen: [] }),
     'a' + n + '3 N=' + n + ' → v2 键落盘内容精确全等（v/cleared/unlocked/cardSeen）');
}
{
  // 缺档 → 全新档：不迁移不写 v2 键
  const store = makeStore({});
  const g = quietLoad({ seed: 200, localStorage: store });
  const p = g.probe();
  ok(p.unlocked === '1-1' && p.saveCleared.length === 0, 'a6 缺档 → 全新档（unlocked=1-1，cleared=[]）');
  ok(store.getItem('pvz_progress_v2') === null, 'a7 缺档 → boot 不写 v2 键（无迁移可做）');
}

/* ------------------------------------------------------------
 * §B 迁移幂等 + 旧键保留
 * ---------------------------------------------------------- */
console.log('\n[B] 迁移幂等 + 旧键保留');
{
  const store = makeStore({ pvz_unlocked: '3' });
  quietLoad({ seed: 300, localStorage: store });
  const v2First = store.getItem('pvz_progress_v2');
  ok(store.getItem('pvz_unlocked') === '3', 'b1 旧键 pvz_unlocked 保留且值不变（回滚 v1.9 无损）');
  quietLoad({ seed: 301, localStorage: store });   // 二次 loadGame：v2 键已在 → 直读不重写
  ok(store.getItem('pvz_progress_v2') === v2First, 'b2 二次 loadGame v2 键逐字节不变（幂等，无二次迁移重写）');
  const p2 = quietLoad({ seed: 302, localStorage: store }).probe();
  ok(p2.unlocked === '1-3' && JSON.stringify(p2.saveCleared) === JSON.stringify(['1-1', '1-2']),
     'b3 二次读档从 v2 键直读（unlocked=1-3，cleared 等价）');
}

/* ------------------------------------------------------------
 * §C testMode 零落盘（迁移路径 + 通关路径）
 * ---------------------------------------------------------- */
console.log('\n[C] testMode 零落盘（纯沙盒铁律）');
{
  const store = makeStore({ pvz_unlocked: '3' });
  const g = quietLoad({ seed: 400, localStorage: store, search: '?test=1' });
  ok(store.getItem('pvz_progress_v2') === null, 'c1 testMode boot 迁移不写 v2 键（旧键保留可回滚）');
  const p = g.probe();
  ok(p.unlocked === '1-3', 'c2 testMode 内存态迁移照常（unlocked=1-3，probe 可断言）');
  g.setLevel('1-1'); g.startGame('testmode-clear');
  driveClear(g);
  const pc = g.probe();
  ok(pc.state === 'end' && pc.saveCleared.indexOf('1-1') >= 0,
     'c3 testMode 通关内存态推进照常（cleared 含 1-1）');
  ok(pc.unlocked === '1-3', 'c3b 通关 1-1 不回退 unlocked（迁移已至 1-3，键序取大=1-3）');
  ok(Object.keys(store._d).length === 1 && store._d['pvz_unlocked'] === '3',
     'c4 testMode 通关后全 store 仅剩注入键——零落盘（不写任何键）');
}

/* ------------------------------------------------------------
 * §D Q-14 复合键迁移（读侧 + 端到端 + 未知键直通）
 * ---------------------------------------------------------- */
console.log('\n[D] Q-14 pvz_diff_clears 复合键（数字 → 锚点键）');
{
  const store = makeStore({ pvz_unlocked: '4', pvz_diff_clears: JSON.stringify({ 'hard:3': true, 'expert:5': true, 'weird:9': true }) });
  const g = quietLoad({ seed: 500, localStorage: store });
  g.saveMeta();   // 触发合并落盘（diffClears 新键 + diffClearsLegacy 旧串）
  const dc = JSON.parse(store.getItem('pvz_diff_clears'));
  ok(dc['hard:1-6'] === true, 'd1 旧 hard:3 → hard:1-6 运行期新键形态');
  ok(dc['expert:4-1'] === true, 'd2 旧 expert:5 → expert:4-1（锚点反查）');
  ok(dc['hard:3'] === true && dc['expert:5'] === true, 'd3 旧串合并保留（回滚 v1.9 可读）');
  ok(dc['weird:9'] === true, 'd4 未知键直通不丢数据');
  // 端到端：hard 难度通关 '1-6'（dk='hard:1-6'）→ 发 corn；重复通关不重复发（幂等）
  const g2 = quietLoad({ seed: 501, localStorage: makeStore({ pvz_unlocked: '4', pvz_diff_clears: JSON.stringify({ 'hard:3': true }) }) });
  g2.setDiff('hard'); g2.setLevel('1-6'); g2.startGame('q14-clear');
  driveClear(g2);
  const p2 = g2.probe();
  ok(p2.state === 'end' && p2.ownedCards.indexOf('corn') >= 0, 'd5 hard 通关 1-6 → 发 corn（新键 DIFF_AWARD 命中）');
  g2.setOwnedCards(p2.ownedCards.slice());
  // 重复通关：corn 已拥有 → 只补登记不发卡
  g2.setLevel('1-6'); g2.startGame('q14-reclear');
  driveClear(g2);
  const p3 = g2.probe();
  ok(p3.ownedCards.filter(function (t) { return t === 'corn'; }).length === 1, 'd6 重复通关 corn 不重复发（幂等）');
}

/* ------------------------------------------------------------
 * §E probe 双暴露（unlockedLevel 序位派生 / unlocked 键名）
 * ---------------------------------------------------------- */
console.log('\n[E] probe 双暴露（Q-16 键名形态落地）');
{
  const store = makeStore({ pvz_unlocked: '3' });
  const g = quietLoad({ seed: 600, localStorage: store });
  const p = g.probe();
  ok(p.unlockedLevel === 3 && p.unlocked === '1-3', 'e1 probe.unlockedLevel===3（序位派生）且 probe.unlocked==="1-3"（键名直读）');
  ok(g.sandbox.__isV2() === true, 'e2 harness 正确识别 v2 源');
}

/* ------------------------------------------------------------
 * §F 判别力自证（项目铁律：旧源必红）
 * 对 ad9ca6c（T-102 刀：无 v2 存档、unlockedLevel 数字语义、dk 数字复合键）
 * 跑 A 组同源断言 ⇒ 必红。
 * ---------------------------------------------------------- */
console.log('\n[F] 判别力自证：同一源码断言跑旧 ad9ca6c 源 ⇒ 必红');
// v2.1 T-105：旧源获取双通道——env PVZ_OLD_HTML 预导出优先（调用方 bash `git show > tmp` 后指路，
//   会话级 spawnSync EBUSY 环境配方），execFileSync git show 兜底（重试一次沿袭 T-102 惯例）。
let oldSrc = null;
if (process.env.PVZ_OLD_HTML && fs.existsSync(process.env.PVZ_OLD_HTML)) {
  oldSrc = fs.readFileSync(process.env.PVZ_OLD_HTML, 'utf8');
}
for (let attempt = 1; attempt <= 2 && oldSrc === null; attempt++) {
  try {
    oldSrc = execFileSync('git', ['show', OLD_COMMIT + ':plants-vs-zombies.html'], {
      cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    });
  } catch (e) {
    if (attempt === 2) {
      // 双通道全失败：f1-f5 记红并明示（不静默假绿）
      console.log('  （旧源导出失败：EBUSY 环境请 bash 预导出后 PVZ_OLD_HTML=<path> 再跑；f1-f5 记红）');
    }
  }
}
ok(oldSrc && oldSrc.indexOf("let unlockedLevel=1") !== -1, 'f1 旧源仍有 unlockedLevel 数字变量声明（Q-16 未切换实锤）');
ok(oldSrc && oldSrc.indexOf("storageSet('pvz_unlocked'") !== -1, 'f2 旧源通关写侧仍写旧键 pvz_unlocked（v2 写侧缺失实锤）');
ok(oldSrc && oldSrc.indexOf('pvz_progress_v2') === -1, 'f3 旧源无 v2 存档结构（迁移体系缺失实锤）');
ok(oldSrc && oldSrc.indexOf("DIFF+':'+levelNo") !== -1, 'f4 旧源 dk 复合键仍数字形态（DIFF+\':\'+levelNo，Q-14 未迁移实锤）');
ok(oldSrc && oldSrc.indexOf("DIFF_AWARD:{'hard:3'") !== -1, 'f5 旧源 DIFF_AWARD 表键仍数字（锚点键未切换实锤）');

/* ------------------------------------------------------------
 * 汇总
 * ---------------------------------------------------------- */
console.log('\n========== T-103 存档迁移自检汇总 ==========');
console.log('PASS: ' + nPass + ' · FAIL: ' + nFail);
if (nFail === 0) {
  console.log('RESULT: PASS —— 新源全绿 + 旧源必红，双重结论成立');
  process.exit(0);
} else {
  console.log('RESULT: FAIL');
  process.exit(1);
}
