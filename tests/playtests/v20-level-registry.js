/* ============================================================
 * v20-level-registry · T-102 关卡注册表自检
 * ------------------------------------------------------------
 * 验证 plants-vs-zombies.html 的 v2.0 数据层（production/v2.0-plan.md §3.1-3.3）：
 *   A) 40 键唯一有序：LEVEL_INDEX 长度/格式/无重复/与 Object.keys(LEVELS) 全等、
 *      世界 1..4 关 1..10 且按 w 升序 l 升序严格递增
 *   B) 40 键字段契约（盘点 §④-5）：startSun>0 / armTime>0 / totalWaves≥1 /
 *      waves.length===totalWaves / time∈{'day','night','fog'} / world∈1..4 / lawn 双元素色板；
 *      5 锚点关语义断言（1-6 night:true 无 dusk、2-1 water:true、4-1 roof:true+water:false、
 *      昼锚点无 night、1-2 无 dusk=Q-11 退役）+ 占位关推导抽查 + legacyKey 严格上界 5
 *   C) 锚点波次逐字全等：`git show 8963ff1:plants-vs-zombies.html`（v1.9.0 权威源）导出
 *      系统临时目录 → loadGame({htmlPath}) 加载旧源（__isV2()===false，__LEVELS=旧数字键表）→
 *      旧 1..5 vs 新 '1-1'/'1-2'/'1-6'/'2-1'/'4-1' 的 waves/totalWaves/startSun/armTime/lawn
 *      JSON 逐波全等。跑完删临时文件。
 *   D) 两次 boot 快照全等（materializeLevels 纯函数，不同 seed 双载）+
 *      __WORLD_THEMES/__LEVEL_INDEX 桥非 null 且内容正确（T-104a 桥自动激活实证）
 *   E) 判别力自证（项目铁律：旧源必红）：同一 40 键断言组跑旧 8963ff1 源 __LEVELS
 *      ⇒ 必红（旧表 5 个数字键，无 time/world 契约）。
 *
 * 双重结论（新绿 + 旧红）任一不成立 ⇒ exit 1。
 *
 * 跑法：node tests/playtests/v20-level-registry.js（毫秒级，零 npm 依赖）
 * 规划出处：production/v2.0-plan.md §3.1（WORLD_THEMES/LEVELS/LEVEL_INDEX 字面量规格）/
 *           §3.2（三层结构与 materializeLevels）/ §3.3（锚点映射）/ §3.5（legacyKey shim）/
 *           §6 T-102（DONE 判据）
 * 盘点依据：tests/playtests/v20-impact-inventory.md §④-5（40 键 materializeLevels 升级契约）
 * ============================================================ */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadGame } = require('../harness/index.js');

const ROOT = path.resolve(__dirname, '..', '..');
const OLD_COMMIT = '8963ff1';                                   // v1.9.0 权威源 commit
const ANCHOR = { 1: '1-1', 2: '1-2', 3: '1-6', 4: '2-1', 5: '4-1' };   // plan §3.3
const KEY_RE = /^[1-4]-(10|[1-9])$/;

// ---- 主断言器（playtests 惯例：console 汇总 + 计数）----
let nPass = 0, nFail = 0;
function ok(cond, label) {
  if (cond) { nPass++; console.log('  PASS ' + label); }
  else { nFail++; console.log('  FAIL ' + label); }
}

function quietLoad(opts) {
  // 屏蔽沙箱 console 噪音；本脚本只读表，不 startGame
  const orig = console.log;
  console.log = function () {};
  try {
    return loadGame(Object.assign({ seed: 424242 }, opts || {}));
  } finally {
    console.log = orig;
  }
}

/* ------------------------------------------------------------
 * 40 键核心断言组（新源 §A/§B 与旧源 §E 共用同一组 ⇒ 判别力字面成立）
 * 返回 { pass:[], fail:[] } 标签列表，不打日志不计数——由调用方处置。
 * ---------------------------------------------------------- */
function coreChecks(levels, index) {
  const pass = [], fail = [];
  const chk = (cond, label) => (cond ? pass : fail).push(label);
  const ks = Object.keys(levels);
  const idx = (index && index.length) ? index : ks;   // 旧源 __LEVEL_INDEX===null → 退化 keys

  // 1. 40 键唯一有序
  chk(idx.length === 40, 'LEVEL_INDEX.length===40');
  chk(ks.length === 40, 'Object.keys(LEVELS).length===40');
  chk(ks.every(function (k) { return KEY_RE.test(k); }), '全部键匹配 /^[1-4]-(10|[1-9])$/');
  chk(new Set(ks).size === 40, '无重复键');
  chk(JSON.stringify(ks) === JSON.stringify(idx), 'LEVEL_INDEX 与 Object.keys(LEVELS) 全等且同序');
  let ordered = true, pw = 0, pl = 0;
  for (let i = 0; i < ks.length; i++) {
    const k = ks[i];
    if (!KEY_RE.test(k)) { ordered = false; break; }
    const w = +k.charAt(0), l = +k.slice(2);
    if (w < 1 || w > 4 || l < 1 || l > 10) { ordered = false; break; }
    if (w < pw || (w === pw && l <= pl)) { ordered = false; break; }   // 严格递增（防 '1-10' 字典序陷阱）
    pw = w; pl = l;
  }
  chk(ordered, '键序 = w 升序 l 升序严格递增');

  // 2. 字段契约（盘点 §④-5）
  let fieldOk = true, badKey = '';
  for (let i = 0; i < ks.length; i++) {
    const k = ks[i], L = levels[k];
    if (!(L
      && typeof L.startSun === 'number' && L.startSun > 0
      && typeof L.armTime === 'number' && L.armTime > 0
      && typeof L.totalWaves === 'number' && L.totalWaves >= 1
      && Array.isArray(L.waves) && L.waves.length === L.totalWaves
      && (L.time === 'day' || L.time === 'night' || L.time === 'fog')
      && typeof L.world === 'number' && L.world >= 1 && L.world <= 4
      && Array.isArray(L.lawn) && L.lawn.length === 2
      && typeof L.lawn[0] === 'string' && typeof L.lawn[1] === 'string')) {
      fieldOk = false; badKey = k; break;
    }
  }
  chk(fieldOk, '40 键字段契约（startSun/armTime/totalWaves/waves.length/time/world/lawn 双色板）' + (badKey ? ' · 首个违规键: ' + badKey : ''));
  return { pass: pass, fail: fail };
}

/* ------------------------------------------------------------
 * §A+§B 新源（工作树）· 40 键契约
 * ---------------------------------------------------------- */
console.log('\n[A/B] 新源 40 键唯一有序 + 字段契约');
const g = quietLoad();
const LV = g.sandbox.__LEVELS;
const IDX = g.sandbox.__LEVEL_INDEX;
const core = coreChecks(LV, IDX);
core.pass.forEach(function (l) { nPass++; console.log('  PASS ' + l); });
core.fail.forEach(function (l) { nFail++; console.log('  FAIL ' + l); });

// 锚点关语义断言（§B 专属）
ok(LV['1-6'].night === true, 'b1 "1-6" night===true（渲染分支依赖保留）');
ok(!('dusk' in LV['1-2']), 'b2 "1-2" 无 dusk 键（Q-11 退役）');
ok(!('dusk' in LV['1-1']) && !('dusk' in LV['1-6']), 'b3 "1-1"/"1-6" 无 dusk 键');
ok(LV['2-1'].water === true, 'b4 "2-1" water===true（WATER_ROWS 机制字段保留）');
ok(LV['4-1'].roof === true && LV['4-1'].water === false, 'b5 "4-1" roof===true 且 water===false（互斥显式声明）');
ok(!('night' in LV['1-1']) && !('night' in LV['1-2']) && !('night' in LV['2-1']) && !('night' in LV['4-1']),
   'b6 昼锚点四关（1-1/1-2/2-1/4-1）无 night 键');
ok(LV['1-1'].time === 'day' && LV['1-2'].time === 'day' && LV['1-6'].time === 'night'
   && LV['2-1'].time === 'day' && LV['4-1'].time === 'day', 'b7 锚点 time 值符合 Q-6a 昼夜结构');
ok(LV['1-1'].world === 1 && LV['1-2'].world === 1 && LV['1-6'].world === 1
   && LV['2-1'].world === 2 && LV['4-1'].world === 4, 'b8 锚点 world 字段（1/1/1/2/4）');
// 占位关推导抽查（35 键不做全量，抽查三段边界 + 世界 3 半区边界）
ok(LV['2-2'].time === 'day' && LV['2-3'].time === 'night' && LV['2-5'].time === 'night'
   && LV['2-6'].time === 'fog' && LV['2-10'].time === 'fog', 'b9 泳池三段 time 推导（2-2昼/2-3·2-5夜/2-6·2-10浓雾）');
ok(LV['3-5'].time === 'day' && LV['3-6'].time === 'night' && LV['4-5'].time === 'day' && LV['4-6'].time === 'night',
   'b10 世界 3/4 前 5 昼后 5 夜推导');
ok(Array.isArray(LV['1-3'].lawn) && LV['1-3'].lawn.length === 2 && LV['1-3'].startSun > 0 && LV['1-3'].armTime > 0
   && LV['1-3'].totalWaves >= 1 && LV['1-3'].waves.length === LV['1-3'].totalWaves,
   'b11 占位关（"1-3"）字段齐备（materializeLevels 展开生效）');
ok(LV['1-3'].name === '1-3 草地 · 白天' && LV['2-6'].name === '2-6 泳池 · 浓雾' && LV['4-10'].name === '4-10 房屋 · 夜晚',
   'b12 占位关 name 推导（世界简称 + 昼夜标注）');
// 深拷贝实证：占位实例 waves 与模板源（锚点 waves）不得共享引用
ok(LV['1-2'].waves !== LV['1-3'].waves && LV['4-1'].waves !== LV['4-2'].waves,
   'b13 实例 waves 无共享引用（深拷贝契约）');
// legacyKey shim（§3.5）
const lk = g.sandbox.legacyKey;
ok(typeof lk === 'function' && lk(1) === '1-1' && lk(3) === '1-3' && lk(5) === '1-5'
   && lk(6) === null && lk(0) === null && lk(-1) === null && lk(40) === null,
   'b14 legacyKey：1..5→\'1-n\'，0/6/40/-1 严格拒绝（上界 5 不放宽）');

/* ------------------------------------------------------------
 * §C 锚点波次逐字全等（vs 8963ff1 权威源）
 * ---------------------------------------------------------- */
console.log('\n[C] 锚点波次逐字全等（旧 8963ff1 vs 新锚点键）');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'v20-old-src-'));
// Windows 瞬态坑（2026-09-23 实测）：node 子进程调 git show 偶发 0xC0000005 访问冲突
// （status=3221225477，重跑即愈，shell 直跑不复现）——重试一次兜底，防 T-106 批量门控误红。
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
const tmpHtml = path.join(tmpDir, 'plants-vs-zombies.html');
fs.writeFileSync(tmpHtml, oldSrc);
const gOld = quietLoad({ htmlPath: tmpHtml });
const oldLV = gOld.sandbox.__LEVELS;
ok(gOld.sandbox.__isV2() === false, 'c0 旧源 __isV2()===false（harness 正确走 v1 分支）');
for (let n = 1; n <= 5; n++) {
  const k = ANCHOR[n];
  const o = oldLV[n], w = LV[k];
  const same = !!o && !!w
    && JSON.stringify(o.waves) === JSON.stringify(w.waves)
    && o.totalWaves === w.totalWaves
    && o.startSun === w.startSun
    && o.armTime === w.armTime
    && JSON.stringify(o.lawn) === JSON.stringify(w.lawn);   // lawn 原样保留 ⇒ 渲染零漂移
  ok(same, 'c' + n + ' 旧 L' + n + ' → "' + k + '" waves/totalWaves/startSun/armTime/lawn 逐波全等');
}
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* 清理失败忽略 */ }

/* ------------------------------------------------------------
 * §D 两次 boot 快照全等 + T-104a 桥激活实证
 * ---------------------------------------------------------- */
console.log('\n[D] materializeLevels 确定性 + 兼容层桥激活');
const g1 = quietLoad({ seed: 1 });
const g2 = quietLoad({ seed: 999999 });
ok(JSON.stringify(g1.sandbox.__LEVELS) === JSON.stringify(g2.sandbox.__LEVELS),
   'd1 两次 boot __LEVELS 快照 JSON 全等（不同 seed，纯函数确定性）');
const WT = g.sandbox.__WORLD_THEMES;
ok(WT != null && WT[1] && WT[2] && WT[3] && WT[4], 'd2 __WORLD_THEMES 桥非 null 且 4 世界齐（T-104a 桥自动激活）');
ok(WT[1].key === 'grass' && WT[2].key === 'pool' && WT[3].key === 'grave' && WT[4].key === 'house',
   'd3 WORLD_THEMES key 字段（grass/pool/grave/house）');
ok(WT[1].dayLawn[0] === '#88c250' && JSON.stringify(WT[1].nightLawn) === JSON.stringify(['#6f9f5e', '#628f52']),
   'd4 世界 1 昼板=旧 L1 色值、夜板=旧 L3 色值（§3.1 平移）');
ok(Array.isArray(IDX) && IDX.length === 40 && IDX[0] === '1-1' && IDX[1] === '1-2' && IDX[39] === '4-10',
   'd5 __LEVEL_INDEX 桥 40 键、首 1-1 / 末 4-10');
ok(g.sandbox.__isV2() === true, 'd6 新源 __isV2()===true（双世界识别正确）');

/* ------------------------------------------------------------
 * §E 判别力自证（项目铁律：旧源必红）
 * ---------------------------------------------------------- */
console.log('\n[E] 判别力自证：同一 40 键断言组跑旧 8963ff1 源 ⇒ 必红');
const oldCore = coreChecks(oldLV, gOld.sandbox.__LEVEL_INDEX);   // 旧 __LEVEL_INDEX===null → 退化 keys
console.log('  旧源同组断言 FAIL 数: ' + oldCore.fail.length + '（须>0）· PASS 数: ' + oldCore.pass.length);
oldCore.fail.forEach(function (l) { console.log('    (预期红) ' + l); });
// 独立计数器：判别断言自身不得失误
let nOldPass = 0, nOldMiss = 0;
const okOld = (cond, label) => {
  if (cond) { nOldPass++; console.log('  PASS ' + label); }
  else { nOldMiss++; console.log('  FAIL ' + label); }
};
okOld(oldCore.fail.length > 0, 'e1 同组断言在旧源上非全绿（判别成立）');
okOld(typeof oldLV['1-1'] === 'undefined', 'e2 旧源无 "1-1" 字符串键（5 数字键表）');
okOld(Object.keys(oldLV).length !== 40, 'e3 旧源非 40 键（=' + Object.keys(oldLV).length + '）');

/* ------------------------------------------------------------
 * 汇总
 * ---------------------------------------------------------- */
const newGreen = (nFail === 0);
const oldRed = (nOldPass >= 3 && nOldMiss === 0);
console.log('\n========== T-102 关卡注册表自检汇总 ==========');
console.log('[新源] 40 键契约全绿: ' + (newGreen ? 'YES (' + nPass + ' PASS / 0 FAIL)' : 'NO (' + nFail + ' FAIL)'));
console.log('[旧源] 必红判别成立: ' + (oldRed ? 'YES (' + nOldPass + '/3 判别断言命中)' : 'NO（判别力不足）'));
if (newGreen && oldRed) {
  console.log('RESULT: PASS —— 新源全绿 + 旧源必红，双重结论成立');
  process.exit(0);
} else {
  console.log('RESULT: FAIL');
  process.exit(1);
}
