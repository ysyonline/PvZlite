/* ============================================================
 * v20-state-select · T-202 state 增 select 态自检
 * ------------------------------------------------------------
 * 验证（production/v2.0-plan.md §6 M2 / T-202 DONE 判据）：
 *   1) state 枚举注释含 select；render 有 select 分流（drawSelectPlaceholder）；
 *      setState('select') 可 set 进、可 set 出（harness 内推帧无异常）。
 *   2) setState 钩子兼容：审计留痕（console [PvZ] state）与 BGM 开关
 *      （updateBGM 仅认 state==='play'，select 天然落「停止」分支）零改动——
 *      此处断言 updateBGM 源码仍只认 play（防未来引入枚举分支遗漏）。
 *   3) 旧 menu/play/end 三态行为零变化：本脚本仅断言 select 通道新增，
 *      三态回归由 T-206 里程碑 run-gates 批量覆盖（节流规则 §6）。
 *
 * 跑法：node tests/playtests/v20-state-select.js（毫秒级，零 npm 依赖）
 * 说明：setState 无枚举白名单校验，旧源 set 'select' 也能进（不崩在 set），
 *       故本任务无「旧源必红」判据；渲染不崩的真机判据随 T-204 截图归档。
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadGame } = require('../harness/index.js');

const ROOT = path.resolve(__dirname, '..', '..');
const HTML = path.join(ROOT, 'plants-vs-zombies.html');

let nPass = 0, nFail = 0;
function ok(cond, label) {
  if (cond) { nPass++; console.log('  PASS ' + label); }
  else { nFail++; console.log('  FAIL ' + label); }
}

(async () => {
  console.log('[T-202] state 增 select 态自检');

  // ── 1) 源码静态断言：枚举注释 + render 分流 + 选关页函数存在（T-204 起为正式 drawSelect，占位函数已退役）──
  const src = fs.readFileSync(HTML, 'utf8');
  ok(/let state='menu';\s*\/\/ menu \| select \| play \| end/.test(src), 'S1 state 枚举注释含 select');
  ok(/if\(state==='select'\)\{drawSelect\(\);ctx\.restore\(\);return\}/.test(src), 'S2 render 有 select 分流（先于 drawGameWorld）');
  ok(/function drawSelect\(\)/.test(src), 'S3 drawSelect（选关页）已定义');
  // 分流次序：select 分支行号必须早于 drawGameWorld 调用行（防未来重排落回对局渲染）
  const iSelect = src.indexOf("state==='select'){drawSelect();ctx.restore();return}");
  const iWorld = src.indexOf('drawGameWorld();', iSelect > -1 ? iSelect : 0);
  ok(iSelect > -1 && iWorld > iSelect, 'S4 select 分流在 drawGameWorld 之前');

  // ── 2) 运行期断言：select 可 set 进出 + 推帧无异常 ──
  const g = await loadGame(HTML);
  const sbSetState = g.sandbox.setState;   // 顶层 function 经 sandbox 直达（harness README 惯例）
  ok(typeof sbSetState === 'function' && g.probe().state === 'menu', 'R1 harness 加载，初始态 menu');
  sbSetState('select', 'T-202 自检');
  ok(g.probe().state === 'select', 'R2 setState("select") 进入 select');
  let threw = null;
  try { for (let i = 0; i < 30; i++) g.__updateRaw(1 / 60); } catch (e) { threw = e; }
  ok(!threw, 'R3 select 态推 30 帧无异常' + (threw ? '（' + threw.message + '）' : ''));
  sbSetState('menu', 'T-202 返回');
  ok(g.probe().state === 'menu', 'R4 setState("menu") 退出 select');
  threw = null;
  try { for (let i = 0; i < 5; i++) g.__updateRaw(1 / 60); } catch (e) { threw = e; }
  ok(!threw, 'R5 回 menu 推 5 帧无异常');

  // ── 3) setState/updateBGM 钩子零改动自证（防枚举分支引入遗漏）──
  ok(/const want=\(state==='play'&&!paused&&!muted\)/.test(src), 'R6 updateBGM 仍仅认 play（select 天然停止 BGM）');
  ok(/if\(s==='end'\)updateBest\(\)/.test(src), 'R7 setState 钩子仍仅 end 触发 updateBest（select 不刷最高分）');

  console.log(`\n[T-202] ${nPass} pass / ${nFail} fail`);
  process.exit(nFail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
