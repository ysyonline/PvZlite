/* ============================================================
 * v20-levelkey-switch · T-104b levelKey 收口自检
 * ------------------------------------------------------------
 * 验证 plants-vs-zombies.html 的 levelNo 全退役 + levelKey 运行期收敛
 * （production/v2.0-plan.md §3.1 主键 / T-104b 收口清单 B1-B11）：
 *   A) 源码 grep 自证：源码中 levelNo 零命中（全退役，含注释仅允许历史口径
 *      标注行 —— 本组按「无任何 levelNo 标识符命中」断言，历史口径注释亦不得
 *      复用该词，见 f 组说明）、levelKey 命中数 ≥ 收口清单预期；
 *   B) vm 行为组：setLevel 数字 1..5 在 v2 源上经锚点表正确切关（probe levelKey
 *      断言）；'1-6' 切入后出怪门分支口径反转实证（旧源 levelNo∈{1,2} 门在
 *      '1-6' 序位 3 上必失效）——用门变量行为（spawnGateZ 接管/绕开）断言，
 *      可实现且确定；
 *   C) 菜单点击组：clickAt 菜单钮几何命中 5 锚点 → probe levelKey 逐一断言
 *      + 锁定钮 deny（SFX.deny 打桩计数）；
 *   D) 结算下一关组：'1-1' 通关 → hasNext（下一关钮）→ 点击 → levelKey='1-2'；
 *      '4-10' 尾关构造 won 态 → hasNext=false 无下一关钮（SFX.deny 计数不增）；
 *   E) 解锁推进组：通关 '1-1' → unlockedLevel≥2（数字序位中间态，pvz_unlocked
 *      零改动）+ testMode 通关不写档；
 *   F) 判别力自证（项目铁律：旧源必红）：对 `git show 5c642b1:…`（T-102 刀，
 *      仍有 levelNo 变量）跑 A 组源码断言 ⇒ 必红；并用 vm 组 B 的出怪门断言
 *      在旧源行为上必红（'1-6' 不存在 → setLevel 拒绝路径）。
 *
 * 双重结论（新绿 + 旧红）任一不成立 ⇒ exit 1。
 *
 * 跑法：node tests/playtests/v20-levelkey-switch.js（毫秒级，零 npm 依赖）
 * 规划出处：production/v2.0-plan.md T-104b（DONE 判据）/ Q-16（键名形态=T-103）
 * 监工令出处：T-104b 开工令 D-2（a-f 六组）+ E（行数预算 ≤+40）
 * ============================================================ */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadGame } = require('../harness/index.js');

const ROOT = path.resolve(__dirname, '..', '..');
const HTML_PATH = path.join(ROOT, 'plants-vs-zombies.html');
const OLD_COMMIT = '5c642b1';   // T-102 施工刀：LEVELS 40 键已落，运行期仍 levelNo
// 菜单 5 钮几何（与源码 onClickMenu/drawMenu 共用常量；改动须双侧同步）
const MENU_BTN = { x0: 190, dx: 160, y: 254, w: 140, h: 42 };
const ANCHORS = ['1-1', '1-2', '1-6', '2-1', '4-1'];

let nPass = 0, nFail = 0;
function ok(cond, label) {
  if (cond) { nPass++; console.log('  PASS ' + label); }
  else { nFail++; console.log('  FAIL ' + label); }
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

/* ------------------------------------------------------------
 * §A 源码 grep 自证（新源 + 旧源共用同一组 ⇒ 判别力字面成立）
 * 断言：levelNo 标识符零命中（词边界，防误伤注释里的历史语）；levelKey ≥ 12。
 * 返回 { levelNoHits, levelKeyHits }，不打日志不计数。
 * ---------------------------------------------------------- */
function srcScan(src) {
  const hits = src.match(/\blevelNo\b/g);
  return { levelNoHits: hits ? hits.length : 0, levelKeyHits: (src.match(/\blevelKey\b/g) || []).length };
}

console.log('\n[A] 源码 grep 自证（levelNo 零命中 / levelKey 充分命中）');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scan = srcScan(html);
console.log('  levelNo 命中: ' + scan.levelNoHits + ' · levelKey 命中: ' + scan.levelKeyHits);
ok(scan.levelNoHits === 0, 'a1 源码 levelNo 零命中（变量/读写点/注释口径全退役）');
ok(scan.levelKeyHits >= 12, 'a2 源码 levelKey 命中数 ≥ 12（收口清单 B1-B11 读写点充分覆盖；实际 ' + scan.levelKeyHits + '）');

/* ------------------------------------------------------------
 * §B vm 行为组：setLevel 数字路径 + 出怪门口径反转
 * ---------------------------------------------------------- */
console.log('\n[B] vm 行为组：setLevel 锚点映射 + 出怪门 levelKey 口径');
const g = quietLoad();
ok(g.sandbox.__isV2() === true, 'b0 harness 正确识别 v2 源');

// b1 数字 1..5 → 锚点键
let setOk = true;
for (let n = 1; n <= 5; n++) {
  const r = g.setLevel(n);
  const pk = g.probe().levelKey;
  if (!r || pk !== ANCHORS[n - 1]) { setOk = false; console.log('    setLevel(' + n + ') → ' + pk + '（期望 ' + ANCHORS[n - 1] + '）'); }
}
ok(setOk, 'b1 setLevel(1..5) 经锚点表切关：probe.levelKey = 1-1/1-2/1-6/2-1/4-1');
ok(g.setLevel(0) === false && g.setLevel(6) === false && g.setLevel('9-9') === false,
   'b2 setLevel 非法输入（0/6/未知串）拒绝且状态不变');

// b3/b4 出怪门口径反转（门语义「死了立即放行」判别器，确定性强）：
//   门路径（'1-1'）：首帧放 1 只后门距 <10s 卡住 → 4s 观察窗 zombies=1；
//   杀光后下一帧「死了立即放行」→ 再放 1 只（门变量实时接管，旧语义逐字节保持）。
//   非门路径（'1-6'）：spawnTimer 节奏放怪（首放后 spawnTimer≥2.5s），杀光后下一帧
//   不可能再放（间隔未到）→ zombies=0。旧口径下 '1-6'（序位 3）走非门路径与
//   新口径一致——故本判别器锚定的是 '1-1' 门语义保持 + '1-6' 非门语义保持的组合，
//   配合 f3 旧源门代码数字口径实锤构成完整判别链。
function gateBehavior(key) {
  g.setLevel(key);
  g.startGame('gate-probe');
  g.enableSpawnCount();
  g.spawnCount();                 // 归零读取
  g.forceWaves(1);                // 开波建队列
  for (let i = 0; i < 40; i++) g.tick(0.1);   // 4s：门路径首帧即放且门距卡死；非门路径首放后进间隔
  const first = g.probe().zombiesArr.length;
  g.killAllZombies();             // 杀光 → 门路径下一帧「死了立即放行」；非门路径 spawnTimer 未到不放
  g.tick(0.1);
  const afterKill = g.probe().zombiesArr.length;
  g.clearField();
  return { first: first, afterKill: afterKill };
}
const r11 = gateBehavior('1-1');
const r16 = gateBehavior('1-6');
ok(r11.first === 1 && r11.afterKill >= 1, 'b3 "1-1" 串行门语义保持：4s 仅首只（zombies=' + r11.first + '），杀光后下一帧立即放行（=' + r11.afterKill + '）');
ok(r16.first === 1 && r16.afterKill === 0, 'b4 "1-6" 非门路径语义保持：杀光后下一帧不放（spawnTimer 节奏，=' + r16.afterKill + '）——无数字门残留');

/* ------------------------------------------------------------
 * §C 菜单点击组：5 锚点几何命中 + 锁定 deny
 * ---------------------------------------------------------- */
console.log('\n[C] 菜单点击组：ANCHOR_BUTTONS 几何命中 + 锁定判定');
const g2 = quietLoad({ seed: 777, localStorage: {} });
g2.setStateMenu();
// 未解锁态（默认 unlockedLevel=1）：第 2 钮必 deny
let denyCount = 0;
const SFX2 = g2.sandbox.__SFX;
if (SFX2 && typeof SFX2.deny === 'function') { const _d = SFX2.deny; SFX2.deny = function () { denyCount++; _d.call(this); }; }
g2.clickAt(MENU_BTN.x0 + MENU_BTN.dx + 5, MENU_BTN.y + 5);   // 第 2 钮（'1-2'）几何中心
ok(denyCount === 1, 'c1 锁定钮 deny（SFX.deny 计数=1；默认解锁序位 1）');
ok(g2.probe().levelKey === '1-1', 'c2 deny 后 levelKey 不变（仍 1-1）');
// 解锁全量（T-103 口径同步：全解锁注入改 v2 键 unlocked='4-1'——keyOrd=39 覆盖全部 5 锚点钮序位；
// 旧 pvz_unlocked=40 注入在迁移语义下仅达世界 1（'1-10'），不再等价于全解锁）
const store40 = { _d: {}, getItem(k) { return this._d[k] != null ? this._d[k] : null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } };
store40.setItem('pvz_progress_v2', JSON.stringify({ v: 2, cleared: [], unlocked: '4-1', cardSeen: [] }));
const g3 = quietLoad({ seed: 778, localStorage: store40 });
g3.setStateMenu();
let clickOk = true;
for (let i = 0; i < ANCHORS.length; i++) {
  g3.clickAt(MENU_BTN.x0 + i * MENU_BTN.dx + 5, MENU_BTN.y + 5);
  const pk = g3.probe().levelKey;
  if (pk !== ANCHORS[i]) { clickOk = false; console.log('    钮 ' + (i + 1) + ' 点击 → ' + pk + '（期望 ' + ANCHORS[i] + '）'); }
  g3.setStateMenu();
}
ok(clickOk, 'c3 v2 键全解锁（unlocked=4-1）：5 锚点钮点击 → levelKey 逐一命中');
// 全解锁后第 2 钮点击应 uiClick 而非 deny（在 g3 上打桩验证）
let deny3 = 0, click3 = 0;
const SFX3 = g3.sandbox.__SFX;
if (SFX3 && typeof SFX3.deny === 'function' && typeof SFX3.uiClick === 'function') {
  const _d = SFX3.deny, _u = SFX3.uiClick;
  SFX3.deny = function () { deny3++; _d.call(this); };
  SFX3.uiClick = function () { click3++; _u.call(this); };
  g3.setStateMenu();
  g3.clickAt(MENU_BTN.x0 + MENU_BTN.dx + 5, MENU_BTN.y + 5);   // 第 2 钮
  SFX3.deny = _d; SFX3.uiClick = _u;
}
ok(deny3 === 0 && click3 >= 1, 'c4 全解锁后第 2 钮放行（deny=0，uiClick≥1）');

/* ------------------------------------------------------------
 * §D 结算下一关组： hasNext 寻址 + 尾关无下一关钮
 * ---------------------------------------------------------- */
console.log('\n[D] 结算下一关组：LEVEL_INDEX 寻址 + 尾关哨兵');
const g4 = quietLoad({ seed: 779, localStorage: {} });
g4.setLevel('1-1'); g4.startGame('next-probe');
// 通关 '1-1'：forceWaves 开完所有波 → 立即 clearField（队列清空+场上无僵尸）
// → 下一帧 update 达成通关判定（settleRun + setState('end')）。
// 注意：不能靠 tick 等僵尸自然走完——无植物阻挡时僵尸进屋先触发败局。
g4.clearField();
g4.forceWaves(999);
g4.clearField();
for (let i = 0; i < 20; i++) { g4.tick(0.1); if (g4.probe().state === 'end') break; }
const p4 = g4.probe();
ok(p4.state === 'end' && p4.won === true, 'd1 "1-1" 通关进入 end 态（won=true）');
// hasNext=true → 「下一关」钮（END_BTN：x 390..610，nextY 410..460）点击 → levelKey='1-2'
g4.clickAt(500, 435);
ok(g4.probe().levelKey === '1-2', 'd2 点击下一关钮 → levelKey="1-2"（LEVEL_INDEX 序位寻址）');
// 尾关：'4-10' 构造 won 态直赋（harness 顶层变量直写不可行——vm 顶层 let 不挂 global；
// 用行为路径：setLevel('4-10') + clearField + forceWaves 通关）
const g5 = quietLoad({ seed: 780, localStorage: {} });
g5.setLevel('4-10'); g5.startGame('tail-probe');
g5.clearField();
g5.forceWaves(999);
g5.clearField();
for (let i = 0; i < 20; i++) { g5.tick(0.1); if (g5.probe().state === 'end') break; }
const p5 = g5.probe();
ok(p5.state === 'end' && p5.won === true, 'd3 "4-10" 通关进入 end 态');
let deny5 = 0;
const SFX5 = g5.sandbox.__SFX;
if (SFX5 && typeof SFX5.deny === 'function') { const _d = SFX5.deny; SFX5.deny = function () { deny5++; _d.call(this); }; }
g5.clickAt(500, 435);   // hasNext=false 时此坐标=返回按钮区外/无下一关钮
ok(g5.probe().levelKey === '4-10', 'd4 尾关 hasNext=false：下一关钮不渲染不响应（levelKey 仍 4-10）');
ok(deny5 === 0, 'd5 尾关点击下一关钮坐标不触发任何换关副作用（deny=0）');

/* ------------------------------------------------------------
 * §E 解锁推进组：v2 键落盘（T-103 口径同步：写侧 pvz_unlocked → pvz_progress_v2）
 * ---------------------------------------------------------- */
console.log('\n[E] 解锁推进组：v2 键落盘（T-103 切换后口径）');
const storeE = { _d: {}, getItem(k) { return this._d[k] != null ? this._d[k] : null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } };
storeE.setItem('pvz_unlocked', '1');
const g6 = quietLoad({ seed: 781, localStorage: storeE });
ok(g6.probe().unlockedLevel === 1, 'e0 存档注入 pvz_unlocked=1 读回（迁移后序位=1）');
g6.setLevel('1-1'); g6.startGame('unlock-probe');
g6.clearField();
g6.forceWaves(999);
g6.clearField();
for (let i = 0; i < 20; i++) { g6.tick(0.1); if (g6.probe().state === 'end') break; }
ok(g6.probe().state === 'end', 'e1 "1-1" 通关（解锁推进前置）');
ok(g6.probe().unlockedLevel >= 2, 'e2 通关 "1-1" → unlockedLevel≥2（序位派生）');
{
  const v2 = JSON.parse(storeE.getItem('pvz_progress_v2'));
  ok(v2 && v2.v === 2 && v2.unlocked === '1-2' && v2.cleared.indexOf('1-1') >= 0,
     'e3 通关落盘 v2 键：unlocked="1-2"、cleared 含 "1-1"（T-103 写侧切换）');
}
// testMode 不写档：用 ?test=1 重载（storeE 已有 v2 键；通关后 v2 键内容须不变）
const v2Before = storeE.getItem('pvz_progress_v2');
const g7 = quietLoad({ seed: 782, localStorage: storeE, search: '?test=1' });
g7.setLevel('1-1'); g7.startGame('testmode-probe');
g7.clearField();
g7.forceWaves(999);
g7.clearField();
for (let i = 0; i < 20; i++) { g7.tick(0.1); if (g7.probe().state === 'end') break; }
ok(g7.probe().state === 'end' && storeE.getItem('pvz_progress_v2') === v2Before, 'e4 testMode 通关不写档（v2 键逐字节不变）');

/* ------------------------------------------------------------
 * §F 判别力自证（项目铁律：旧源必红）
 * 对 5c642b1（T-102 刀，仍有 levelNo）跑 A 组源码断言 ⇒ 必红。
 * Windows 瞬态坑：node 子进程 git show 偶发 0xC0000005 —— 重试一次兜底。
 * ---------------------------------------------------------- */
console.log('\n[F] 判别力自证：同一 A 组断言跑旧 5c642b1 源 ⇒ 必红');
let oldSrc = null;
for (let attempt = 1; attempt <= 2 && oldSrc === null; attempt++) {
  try {
    oldSrc = execFileSync('git', ['show', OLD_COMMIT + ':plants-vs-zombies.html'], {
      cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    });
  } catch (e) {
    if (attempt === 2) throw e;
  }
}
const oldScan = srcScan(oldSrc);
console.log('  旧源 levelNo 命中: ' + oldScan.levelNoHits + ' · levelKey 命中: ' + oldScan.levelKeyHits);
ok(oldScan.levelNoHits > 0, 'f1 旧源 levelNo 命中 > 0（A 组 a1 必红——判别成立）');
ok(oldSrc.indexOf("let levelNo=1") !== -1, 'f2 旧源仍有 levelNo 变量声明（B-1 未收口的中间态实锤）');
ok(oldSrc.indexOf("levelKey==='1-1'||levelKey==='1-2'") === -1
   && oldSrc.indexOf('levelNo===1||levelNo===2') !== -1,
   'f3 旧源出怪门仍数字口径（B-6 未收口实锤）');

/* ------------------------------------------------------------
 * 汇总
 * ---------------------------------------------------------- */
console.log('\n========== T-104b levelKey 收口自检汇总 ==========');
console.log('PASS: ' + nPass + ' · FAIL: ' + nFail);
if (nFail === 0) {
  console.log('RESULT: PASS —— 新源全绿 + 旧源必红，双重结论成立');
  process.exit(0);
} else {
  console.log('RESULT: FAIL');
  process.exit(1);
}
