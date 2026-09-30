/* ============================================================
 * 害羞菇（scaredyshroom）无头冒烟自测（v2.3.7 新增）
 * ------------------------------------------------------------
 * 只验逻辑（harness ctx 为 Proxy stub，无像素）：
 *   T1 配置注册：CARDS 含 scaredyshroom，cost=25，cd=7.5
 *   T2 清醒攻击（night）：前方有僵尸 → 发射 puff 弹（dmg 20）
 *   T3 恐惧：3×3 内有僵尸 → 不攻击（cd 不重置、无新弹）
 *   T4 恐惧恢复：僵尸移出 3×3 → 恢复攻击
 *   T5 白天沉睡（day）：不攻击
 *   T6 恐惧判定横向边界：±1.5 格内才算（僵尸在 2 格外不恐惧）
 * 绘制验证走真机 Edge CDP（另见 v237-scaredy-visual.js，未建）。
 * 用法：node _v237-scaredy-smoke.js
 * ============================================================ */
'use strict';
const path = require('path');
const { loadGame } = require('../harness/index.js');

const HTML = path.join(__dirname, '..', '..', 'plants-vs-zombies.html');
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS ' + msg); }
  else { fail++; console.log('  FAIL ' + msg); }
}

async function main() {
  const game = loadGame({ htmlPath: HTML, seed: 20260929 });
  game.startGame();
  // 顶层 const 不挂 globalThis：sb 直达顶层 function（spawnPlant/isScaredyAfraid），K 走 __consts 桥（常量）
  const sb = game.sandbox;
  const K = sb.__consts || {};

  // ---- T1 配置注册 ----
  console.log('T1 配置注册');
  {
    const cards = game.sandbox.__CARDS;
    const c = cards.find(k => k.type === 'scaredyshroom');
    ok(!!c, 'CARDS 含 scaredyshroom');
    ok(c && c.cost === 25, 'cost=25（实际 ' + (c && c.cost) + '）');
    ok(c && c.cd === 7.5, 'cd=7.5（实际 ' + (c && c.cd) + '）');
    ok(c && c.dur === 300, 'dur=300（实际 ' + (c && c.dur) + '）');
    ok(Array.isArray(K.NOCTURNAL_TYPES) && K.NOCTURNAL_TYPES.indexOf('scaredyshroom') >= 0, 'NOCTURNAL_TYPES 含 scaredyshroom');
    ok(K.SCAREDYSHROOM_DMG === 20, 'SCAREDYSHROOM_DMG=20（实际 ' + K.SCAREDYSHROOM_DMG + '）');
    ok(K.SCAREDYSHROOM_INTERVAL === 1.4, 'SCAREDYSHROOM_INTERVAL=1.4（实际 ' + K.SCAREDYSHROOM_INTERVAL + '）');
  }

  // 统一测试环境：2-1 夜关
  game.setLevel('2-1');
  game.clearField();
  // 彻底清场（clearField 只清僵尸/队列，plants/projectiles 需手动清）
  function resetField() {
    sb.__plants.length = 0;
    sb.__projectiles.length = 0;
    sb.__zombies.length = 0;
  }

  // ---- T2 清醒攻击（night）：前方僵尸 → 发射 puff ----
  console.log('T2 清醒攻击（night）');
  {
    resetField();
    const p = sb.spawnPlant('scaredyshroom', 2, 2, 0);
    sb.__plants.push(p);
    // 僵尸在 5 格外（不恐惧、有目标）
    sb.__zombies.push({ type: 'normal', x: K.GRID_X + 5.2 * K.CELL_W, row: 2, hp: 180, spd: 16, eating: false, dead: false, hypno: false, crumble: 0, emergeT: 0 });
    game.tick(0.05);                 // 第一帧
    p.cd = 0;                        // 清冷却确保可发射
    const before = sb.__projectiles.length;
    game.tick(1.5);                  // 1.5s 超间隔
    const after = sb.__projectiles.length;
    ok(after > before, '发射了弹（before=' + before + ' after=' + after + '）');
    if (after > before) {
      const pr = sb.__projectiles[after - 1];
      ok(pr.type === 'puff', '弹体 type=puff（实际 ' + pr.type + '）');
      ok(pr.dmg === 20, '弹体 dmg=20（实际 ' + pr.dmg + '）');
      ok(pr.row === 2, '弹体 row=2（实际 ' + pr.row + '）');
    }
  }

  // ---- T3 恐惧：3×3 内有僵尸 → 不攻击 ----
  console.log('T3 恐惧（3×3 内有僵尸）');
  {
    resetField();
    const p = sb.spawnPlant('scaredyshroom', 2, 2, 0);
    sb.__plants.push(p);
    // 僵尸紧贴（0.8 格内）⇒ 恐惧
    sb.__zombies.push({ type: 'normal', x: K.GRID_X + 2.8 * K.CELL_W, row: 2, hp: 180, spd: 16, eating: false, dead: false, hypno: false, crumble: 0, emergeT: 0 });
    p.cd = 0;
    const before = sb.__projectiles.length;
    game.tick(2.0);                  // 2s 无攻击
    const after = sb.__projectiles.length;
    ok(after === before, '恐惧时不发射（before=' + before + ' after=' + after + '）');
  }

  // ---- T4 恐惧恢复：僵尸移出 3×3 → 恢复攻击 ----
  console.log('T4 恐惧恢复');
  {
    resetField();
    const p = sb.spawnPlant('scaredyshroom', 2, 2, 0);
    sb.__plants.push(p);
    const z = { type: 'normal', x: K.GRID_X + 2.8 * K.CELL_W, row: 2, hp: 180, spd: 16, eating: false, dead: false, hypno: false, crumble: 0, emergeT: 0 };
    sb.__zombies.push(z);
    p.cd = 0;
    game.tick(0.5);                  // 恐惧期
    const before = sb.__projectiles.length;
    z.x = K.GRID_X + 5.5 * K.CELL_W;  // 移出 3×3
    p.cd = 0;
    game.tick(1.5);                  // 应恢复攻击
    const after = sb.__projectiles.length;
    ok(after > before, '僵尸离开 3×3 后恢复攻击（before=' + before + ' after=' + after + '）');
  }

  // ---- T5 白天沉睡（day）：不攻击 ----
  console.log('T5 白天沉睡（day）');
  {
    game.setLevel('1-1');            // 白天关
    resetField();
    const p = sb.spawnPlant('scaredyshroom', 2, 2, 0);
    sb.__plants.push(p);
    sb.__zombies.push({ type: 'normal', x: K.GRID_X + 5.2 * K.CELL_W, row: 2, hp: 180, spd: 16, eating: false, dead: false, hypno: false, crumble: 0, emergeT: 0 });
    p.cd = 0;
    const before = sb.__projectiles.length;
    game.tick(2.0);
    const after = sb.__projectiles.length;
    ok(after === before, '白天沉睡不发射（before=' + before + ' after=' + after + '）');
  }

  // ---- T6 恐惧判定横向边界：±1.5 格 ----
  console.log('T6 恐惧横向边界（±1.5 格）');
  {
    game.setLevel('2-1');
    // 边界内（1.4 格）→ 恐惧（僵尸 x 相对格心偏移 1.4 格：GRID_X+(col+1.4)*CELL_W+CELL_W/2）
    resetField();
    const p1 = sb.spawnPlant('scaredyshroom', 2, 2, 0);
    sb.__plants.push(p1);
    const z1 = { type: 'normal', x: K.GRID_X + (2 + 1.4) * K.CELL_W + K.CELL_W / 2, row: 2, hp: 180, spd: 16, eating: false, dead: false, hypno: false, crumble: 0, emergeT: 0 };
    sb.__zombies.push(z1);
    ok(sb.isScaredyAfraid(p1) === true, '1.4 格内恐惧=true（实际 ' + sb.isScaredyAfraid(p1) + '）');
    // 边界外（1.6 格）→ 不恐惧（移除 z1，仅留 z2）
    sb.__zombies.length = 0;
    const z2 = { type: 'normal', x: K.GRID_X + (2 + 1.6) * K.CELL_W + K.CELL_W / 2, row: 2, hp: 180, spd: 16, eating: false, dead: false, hypno: false, crumble: 0, emergeT: 0 };
    sb.__zombies.push(z2);
    ok(sb.isScaredyAfraid(p1) === false, '1.6 格外恐惧=false（实际 ' + sb.isScaredyAfraid(p1) + '）');
    // 相邻行（row 差 1）贴脸 → 恐惧
    sb.__zombies.length = 0;
    const z3 = { type: 'normal', x: K.GRID_X + 2.8 * K.CELL_W + K.CELL_W / 2, row: 1, hp: 180, spd: 16, eating: false, dead: false, hypno: false, crumble: 0, emergeT: 0 };
    sb.__zombies.push(z3);
    ok(sb.isScaredyAfraid(p1) === true, '相邻行贴脸恐惧=true（实际 ' + sb.isScaredyAfraid(p1) + '）');
  }

  console.log('\n===== 结果：' + pass + ' 通过 / ' + fail + ' 失败 =====');
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('脚本异常:', e); process.exit(2); });
