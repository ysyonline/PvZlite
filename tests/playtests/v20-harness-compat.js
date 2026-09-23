/* ============================================================
 * v20-harness-compat · T-104a 双世界兼容层自检（T-106 复核基线改版）
 * ------------------------------------------------------------
 * 验证 tests/harness/index.js 的双世界兼容层：
 *   A) 新 harness 对**当前 v2.0-wip 源**全绿：setLevel/setUnlocked 双签名、
 *      锚点反查、probe 双暴露 levelKey/levelNo、__LEVEL_INDEX/__WORLD_THEMES 桥。
 *      （T-106 改版：T-102/T-104b 落表后源已是 v2 键位，断言随 v2 语义重写——
 *       dusk 退役改 time/world、unlocked 键名形态、__LEVEL_INDEX 40 键桥、数字串从严）
 *   B) 旧 harness 必红（判别力自证 · 项目铁律）：导出 **v1.9.0 冻结发布包**
 *      （tag v1.9.0 = `c893120`，本地无 tag 时回退全哈希）的 tests/harness/index.js
 *      到系统临时目录，与 **v1.9.0 冻结副本 HTML** 配对加载（旧 harness 裸读 levelNo，
 *      对 v2 源会 ReferenceError，禁止跨代配对）⇒ 字符串键路径必红。
 *      （T-106 改版：原 `git show HEAD:…` 在 T-104a 提交后取到的是新 harness，
 *       判别力自证结构性失效，故钉死 v1.9.0 冻结基线。）
 *
 * 双重结论（新绿 + 旧红）任一不成立 ⇒ exit 1。
 *
 * 跑法：node tests/playtests/v20-harness-compat.js（毫秒级，零 npm 依赖）
 * 规划出处：production/v2.0-plan.md §3.3（锚点映射）/ §9 Q-14·Q-16
 * 盘点依据：tests/playtests/v20-impact-inventory.md §A / §④-1·④-8
 * ============================================================ */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadGame } = require('../harness/index.js');

const ROOT = path.resolve(__dirname, '..', '..');
const HTML = path.join(ROOT, 'plants-vs-zombies.html');
const HTML_V19 = path.join(ROOT, 'production', 'release', 'v1.9', 'artifacts', 'plants-vs-zombies.v1.9.html');
// v1.9.0 冻结基线：优先 tag，本地缺 tag（换机场景）回退全哈希（记忆/发布归档在案）
const V19_TAG = 'v1.9.0';
const V19_FALLBACK = 'c893120f5e9ded739167961c3f2e7bb586878109';

// 最小断言器（playtests 惯例：console 汇总 + 计数）
let nPass = 0, nFail = 0;
function ok(cond, label) {
  if (cond) { nPass++; console.log('  PASS ' + label); }
  else { nFail++; console.log('  FAIL ' + label); }
}

function fresh(opts) {
  // 屏蔽游戏 boot/startGame 的 console 输出（loadGame 沙箱直用宿主 console），
  // 否则 [PvZ] 日志会打断断言清单
  const orig = console.log;
  console.log = function () {};
  try {
    const g = loadGame(Object.assign({ seed: 424242 }, opts || {}));
    g.startGame();
    return g;
  } finally {
    console.log = orig;
  }
}

/* ------------------------------------------------------------
 * §A 新 harness · 对当前 v1.9.0 源（数字键 1..5）全绿
 * ---------------------------------------------------------- */
function runNewHarness() {
  console.log('\n[A] 新 harness（T-104a 兼容层）· v2.0-wip 源');
  let p;

  // a) setLevel(2) 数字路径：经 __ANCHOR 转锚点键 '1-2'；levelKey 源生 + levelNo 序位派生；
  //    dusk 已退役（Q-11）⇒ 改断 world/time 字段
  p = null;
  {
    const g = fresh();
    ok(g.setLevel(2) === true, 'a1 setLevel(2) 返回 true（成功状态显式化）');
    p = g.probe();
    ok(p.levelNo === 2, 'a2 probe().levelNo===2（序位派生未漂移）');
    ok(p.levelKey === '1-2', 'a3 probe().levelKey==="1-2"（锚点派生）');
    ok(g.sandbox.__level.world === 1 && g.sandbox.__level.time === 'day',
       'a4 level 为 1-2（world===1 · time==="day"，dusk 退役 Q-11）');
  }

  // b) 字符串键源生直达（v2 世界）
  {
    const g = fresh();
    g.setLevel('1-1'); p = g.probe();
    ok(p.levelKey === '1-1', 'b1 setLevel("1-1") → levelKey==="1-1"');
    g.setLevel('2-1'); p = g.probe();
    ok(p.levelKey === '2-1' && g.sandbox.__level.water === true, 'b2 setLevel("2-1") → levelKey==="2-1" 且 level.water===true');
    g.setLevel('4-1'); p = g.probe();
    ok(p.levelKey === '4-1' && g.sandbox.__level.roof === true, 'b3 setLevel("4-1") → levelKey==="4-1" 且 level.roof===true');
  }

  // c) 数字路径锚点不漂：旧 L3 = 7 波
  {
    const g = fresh();
    g.setLevel(3); p = g.probe();
    ok(g.sandbox.__level.totalWaves === 7, 'c1 setLevel(3) → level.totalWaves===7（旧 L3 波数锚）');
  }

  // d) setUnlocked：v2 世界键名形态（Q-16）——数字经 __ANCHOR 转锚点键，unlockedLevel 序位派生
  //    （LEVEL_INDEX w 主序展开：'4-1' 序位 30（0 起）⇒ 派生 31；'1-6' 序位 5 ⇒ 派生 6）
  {
    const g = fresh();
    g.setUnlocked(5); p = g.probe();
    ok(p.unlocked === '4-1' && p.unlockedLevel === 31, 'd1 setUnlocked(5) → unlocked==="4-1"（数字→锚点键）且序位派生 31');
    g.setUnlocked('1-6'); p = g.probe();
    ok(p.unlocked === '1-6' && p.unlockedLevel === 6, 'd2 setUnlocked("1-6") → unlocked==="1-6" 且序位派生 6');
  }

  // e) probe 双暴露 + v2 源桥非空（T-102 落表后）
  {
    const g = fresh(); p = g.probe();
    ok('levelKey' in p && 'levelNo' in p, 'e1 probe 同时含 levelKey/levelNo 两字段');
    ok(Array.isArray(g.sandbox.__LEVEL_INDEX) && g.sandbox.__LEVEL_INDEX.length === 40 &&
       g.sandbox.__LEVEL_INDEX[0] === '1-1' && g.sandbox.__LEVEL_INDEX[39] === '4-10',
       'e2 __LEVEL_INDEX 40 键有序桥接（首 "1-1" · 末 "4-10"）');
    ok(g.sandbox.__WORLD_THEMES && Object.keys(g.sandbox.__WORLD_THEMES).length === 4,
       'e3 __WORLD_THEMES 4 世界桥接');
    ok(typeof g.sandbox.__isV2 === 'function' && g.sandbox.__isV2() === true, 'e4 __isV2()===true（正确识别 v2 世界）');
    ok(typeof g.sandbox.__ANCHOR === 'object' && g.sandbox.__ANCHOR[3] === '1-6', 'e5 __ANCHOR 锚点表桥接正确');
  }

  // f) 非法键：返回 false 且状态不变
  {
    const g = fresh();
    g.setLevel(3); const before = g.probe();
    ok(g.setLevel('9-9') === false, 'f1 setLevel("9-9") 返回 false');
    ok(g.setLevel(99) === false, 'f2 setLevel(99) 返回 false');
    ok(g.setLevel('abc') === false, 'f3 setLevel("abc") 返回 false（非数字串未知字符串）');
    ok(g.setLevel(null) === false, 'f4 setLevel(null) 返回 false');
    const after = g.probe();
    ok(before.levelNo === after.levelNo && before.levelKey === after.levelKey,
       'f5 非法输入后状态不变（levelNo/levelKey 保持）');
    // f 补充：v2 键形态下纯数字串从严——字符串输入只认 'w-l' 键，数字兜底走 number 路径
    //（源侧 ?level=N shim / legacyKey 承担数字兼容，harness 不做二次宽松，避免双键真相）
    ok(g.setLevel('2') === false, 'f6 纯数字串 "2" 在 v2 键形态下返回 false（数字须走 number 路径）');
  }
}

/* ------------------------------------------------------------
 * §B 旧 harness（v1.9.0 冻结基线）· 同一组断言必红
 * ---------------------------------------------------------- */
function runOldHarness() {
  console.log('\n[B] 旧 harness（v1.9.0 冻结基线）· 判别力自证（项目铁律：旧版必红）');
  // 导出 v1.9.0 冻结发布包的 tests/harness/index.js 到系统临时目录（目录内同构 require 路径无需修复）。
  // T-106 改版：原取 HEAD——T-104a 提交后 HEAD 已是新 harness，判别自证结构性失效；
  // 现钉死 tag v1.9.0（本地缺 tag 回退全哈希 c893120）。
  let oldSrc = null;
  for (const ref of [V19_TAG, V19_FALLBACK]) {
    try {
      oldSrc = execFileSync('git', ['show', ref + ':tests/harness/index.js'], {
        cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
      });
      break;
    } catch (e) { /* 下一个 ref */ }
  }
  if (oldSrc === null) {
    ok(false, '旧 harness 导出失败（v1.9.0 tag 与回退哈希均不可达）');
    return { hits: 0, misses: 1 };
  }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'v20-old-harness-'));
  fs.writeFileSync(path.join(tmpDir, 'index.js'), oldSrc);

  let oldLoad;
  try {
    oldLoad = require(path.join(tmpDir, 'index.js')).loadGame;
  } catch (e) {
    ok(false, '旧 harness 导出失败: ' + e.message);
    return { hits: 0, misses: 1 };
  }

  // 独立断言器（与 §A 计数分开，只影响 B 段红绿判定）
  let nOldPass = 0, nOldFail = 0;
  const okOld = (cond, label) => {
    if (cond) { nOldPass++; console.log('  PASS ' + label); }
    else { nOldFail++; console.log('  FAIL ' + label); }
  };

  // ★ 配对纪律：旧 harness 裸读源生变量（levelNo 等），对 v2 源会 ReferenceError ——
  //   必须与 v1.9.0 冻结副本 HTML 配对，禁止跨代配对。
  if (!fs.existsSync(HTML_V19)) {
    okOld(false, 'v1.9.0 冻结副本缺失: ' + HTML_V19);
    return { hits: nOldPass, misses: nOldFail };
  }
  function oldFresh() {
    const orig = console.log;
    console.log = function () {};
    try {
      const g = oldLoad({ seed: 424242, htmlPath: HTML_V19 });
      g.startGame();
      return g;
    } finally {
      console.log = orig;
    }
  }

  // ★ 旧 harness 真红点验证（T-101 盘点 §A：L200-203 / L205 / L124）
  // b) 字符串键切关：旧守卫 !LEVELS['1-1'] 恒真 ⇒ no-op。
  //    暴露手法：先合法切到 L3，再用字符串键切 '2-1' ⇒ 状态纹丝不动地停在 L3。
  //    （从起始 L1 直接试 '1-1' 会撞上"起点即 L1"的 no-op 假象，红不出来）
  {
    const g = oldFresh();
    g.setLevel(3);
    g.setLevel('2-1');
    const p = g.probe();
    okOld(p.levelNo === 3 && !g.sandbox.__level.water,
      '旧harness setLevel("2-1") 无效（真红：守卫恒失败，状态停 L3 不动）');
  }
  // e) probe 无 levelKey 字段（双暴露是 T-104a 新能力）
  {
    const g = oldFresh();
    const p = g.probe();
    okOld(!('levelKey' in p), '旧harness probe 无 levelKey 字段（真红：双暴露缺失）');
  }
  // d) setUnlocked('1-6')：'1-6'|0===0 ⇒ Math.max(1,0)=1 恒回 L1（真红）
  {
    const g = oldFresh();
    g.setUnlocked('1-6');
    const p = g.probe();
    okOld(p.unlockedLevel !== 3, '旧harness setUnlocked("1-6") 恒回 1（真红：n|0 恒 0）');
  }

  // okOld(cond)：cond=true ⇒ 旧 harness 如预期表现出「红」（判别性成立）。
  // nOldPass = 判别命中数（判别力成立的证据），nOldFail = 判别断言自身失败数。
  console.log('\n[B] 旧 harness 判别命中数: ' + nOldPass + '（须≥3）· 误判数: ' + nOldFail + '（须=0）');
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* 忽略清理失败 */ }
  return { hits: nOldPass, misses: nOldFail };
}

/* ------------------------------------------------------------
 * 汇总
 * ---------------------------------------------------------- */
runNewHarness();
const oldRes = runOldHarness();
const newGreen = (nFail === 0);
const oldRed = (oldRes.hits >= 3 && oldRes.misses === 0);
console.log('\n========== T-104a 双世界兼容层自检汇总 ==========');
console.log('[A] 新 harness 全绿: ' + (newGreen ? 'YES (' + nPass + ' PASS / 0 FAIL)' : 'NO (' + nFail + ' FAIL)'));
console.log('[B] 旧 harness 必红: ' + (oldRed ? 'YES (' + oldRes.hits + '/3 判别断言命中)' : 'NO（判别力不足）'));
if (newGreen && oldRed) {
  console.log('RESULT: PASS —— 新 harness 全绿 + 旧 harness 必红，双重结论成立');
  process.exit(0);
} else {
  console.log('RESULT: FAIL');
  process.exit(1);
}
