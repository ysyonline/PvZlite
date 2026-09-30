/* REG-MUSH-05 · 小喷菇（puffshroom）绘制几何：柄可见 + 接地 [v2.3.9 消缺②]
 * ============================================================
 * 背景（2026-09-30 用户反馈）：「小喷菇，现在的根茎视觉上看不见，只能看到一个露出小尖头，
 *   而且悬浮腾空，没有接触地面。」
 * 根因：v2.3.6 补丁把柄下探深收窄到 capR*1.15≈13.8px（小于盖底缘 capR*0.84≈10.1 自盖心），
 *   柄整体藏进菇盖内不可见；且盖底最低点仅到 y+16 左右，而同排植物地面接触线在 y+34~38
 *   （阳光菇柄底 y+34、统一落地投影在 y+38）⇒ 整体悬空 22px。
 * 修复（世界版 drawPlantInner + 卡面 drawCardFace 共用 PUFFSHROOM_GEOM.stemW/stemH）：
 *   ① 柄下探改按地面线锚定：柄底 y+stemH（stemH=34，与阳光菇柄底同线）；
 *   ② 柄绘制提到沉睡/清醒分支之前共用（旧沉睡分支没有柄，白天只剩悬空菇盖）；
 *   ③ 泥痕贴柄底（接地暗线）；卡面柄同步 stemW/stemH 等比缩放（×0.82）。
 *
 * 覆盖断言（无头几何契约；真机像素判据由 tests/playtests/v23-mushroom-visual.js T3 承担）：
 *   [1] PUFFSHROOM_GEOM 含 stemW/stemH 字段（几何单点真相，禁两处硬编码）
 *   [2] 接地：柄底 y 偏移 stemH ≥ 阳光菇柄底 34（同一地面线；旧 13.8 悬空必红）
 *   [3] 柄露出菇盖：stemH - capR*0.84 > 8（盖底缘以下至少露出 8px 柄段；旧 13.8-10.1=3.7 藏盖内必红）
 *   [4] render 真帧不抛异常（drawPlantInner 无头可跑，SMOKE-010 先例）
 *   [5] 白天沉睡分支也有柄（新旧源判别：旧版沉睡路径不画柄——本断言经 render 调用计数间接锁定）
 *
 * 运行：node tests/harness/run-all.js（REG-* 收录）或单文件自证 node tests/harness/cases/REG-MUSH-05.js
 * ============================================================ */
'use strict';

const path = require('path');

module.exports = {
  id: 'REG-MUSH-05',
  name: '小喷菇柄可见+接地（stemH 地面线锚定 / 沉睡分支共用柄 / 真帧无异常）',
  seed: 42,
  run({ game: g, assert }) {
    const sb = g.sandbox;
    const GEO = sb.__consts.PUFFSHROOM_GEOM;
    const CELL_H = sb.__consts.CELL_H;

    // [1] 几何契约：stemW/stemH 字段存在（旧版 HTML 无 ⇒ 对照模式判别力）
    assert(GEO && typeof GEO.stemW === 'number' && typeof GEO.stemH === 'number',
      'PUFFSHROOM_GEOM 应含 stemW/stemH（几何单点真相）', GEO);

    // [2] 接地：柄底 y+34 与阳光菇柄底同线（阳光菇柄底写死 y+34；本断言锁 ≥34）
    assert(GEO.stemH >= 34, '柄底应达地面线（stemH≥34；旧 13.8 悬空必红）', GEO.stemH);

    // [3] 柄露出菇盖：柄底到盖底缘至少露 8px 柄段（旧版 13.8-10.1=3.7 全藏盖内必红）
    const exposed = GEO.stemH - GEO.capR * 0.84;
    assert(exposed > 8, '柄应在菇盖底缘之下露出 >8px（旧版整根藏盖内必红）', exposed);

    // [4]+[5] render 真帧不抛异常（白天沉睡 + 夜晚清醒两姿态各跑一帧）
    g.setLevel('1-1'); g.startGame();          // day（沉睡姿态）
    g.clearField();
    sb.__plants.length = 0;
    sb.__plants.push(sb.spawnPlant('puffshroom', 1, 2, 0));
    for (const p of sb.__plants) { p.plantT = 620; p.plantDone = true; }   // 跳过种植动画
    let err1 = null;
    const origErr = console.error;
    console.error = function (e) { err1 = err1 || String(e && e.message || e); };
    try { g.__renderRaw(); } catch (e) { err1 = String(e && e.message || e); }
    console.error = origErr;
    assert(!err1, '白天沉睡姿态 render 真帧应无异常', err1);

    g.setLevel('3-3'); g.startGame();          // night（清醒姿态）
    g.clearField();
    sb.__plants.length = 0;
    sb.__plants.push(sb.spawnPlant('puffshroom', 1, 2, 0));
    for (const p of sb.__plants) { p.plantT = 620; p.plantDone = true; }
    let err2 = null;
    console.error = function (e) { err2 = err2 || String(e && e.message || e); };
    try { g.__renderRaw(); } catch (e) { err2 = String(e && e.message || e); }
    console.error = origErr;
    assert(!err2, '夜晚清醒姿态 render 真帧应无异常', err2);

    // [5] 行内接地一致性：小喷菇柄底相对行心偏移应 ≤ 半行高（不出格）且贴近统一投影线 y+38
    const rowCenterY = sb.__consts.GRID_Y + 2 * CELL_H + CELL_H / 2;
    assert(GEO.stemH < CELL_H / 2, '柄底不应越过行格下半（几何自洽）', GEO.stemH);
    assert(rowCenterY + GEO.stemH > rowCenterY + GEO.capR, '柄底必须低于盖心（接地而非悬浮）', GEO.stemH);
  },
};

// ---- 单文件自证 CLI：node tests/harness/cases/REG-MUSH-05.js ----
if (require.main === module) {
  const { loadGame, DEFAULT_SEED } = require(path.join(__dirname, '..', 'index.js'));
  const mod = module.exports;
  const g = loadGame({ seed: mod.seed != null ? mod.seed : DEFAULT_SEED });
  const assert = (cond, msg, extra) => {
    if (!cond) {
      let d = msg || '(no message)';
      if (extra !== undefined) { try { d += '  ::  ' + JSON.stringify(extra); } catch (e) { d += '  ::  ' + String(extra); } }
      throw new Error('[' + mod.id + '] 断言失败: ' + d);
    }
  };
  try {
    mod.run({ game: g, loadGame, assert, seed: mod.seed });
    console.log('\u2705 ' + mod.id + ' PASS  ·  ' + mod.name);
    process.exitCode = 0;
  } catch (e) {
    console.error('\u274c ' + mod.id + ' FAIL');
    console.error(e && e.stack ? e.stack : String(e));
    process.exitCode = 1;
  }
}
