'use strict';
/* ============================================================================
 * tests/playtests/v20-fog-ui.js — T-402 浓雾遮罩层 截图自证（v2.0 M4）
 * ----------------------------------------------------------------------------
 * 场景与像素判据（规格：time:'fog' 白色浓雾，仅见最左列前半列+最右列半列，端部柔和过渡）：
 *  S1 ★主场景 ?level=2-6 URL 直跳（禁选关页链路——Q-12 世界 2 全占位格）：
 *     泳池雾夜关，棋盘中段被白雾带覆盖（x∈[100,820] = col0 右半起至 col8 左半止），
 *     两端 30px 线性柔和过渡；左半列/右半列可见区保持泳池夜色。
 *  S2 1-1 昼回归：无雾（白雾像素 ≈0）——防雾画到非 fog 关。
 *  S3 2-1 泳池昼回归：无雾——防「按 world===2 误触发」（必须 time==='fog' 驱动）。
 *
 * 判别力（旧源 v1.9.0 冻结副本同脚本复跑必红）：
 *  - 旧源无 '2-6' 键（LEVELS 仅 1..5）→ URL 直跳失败 level 保持 1-1（昼）→ ①②③全红；
 *  - 旧源 time 值域无 'fog'，任何场景都不可能画出雾带。
 *
 * 用法：
 *   "$NODE" tests/playtests/v20-fog-ui.js                        # 当前源码
 *   "$NODE" tests/playtests/v20-fog-ui.js <html路径> <tag>       # 旧源对照
 * 产物：tests/playtests/v20-fog-<tag>-{2-6,day-1-1,day-2-1}.png + v20-fog-ui-results.json
 * ==========================================================================*/

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9372;                                   // 避开 9363/9364/9366/9370
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT = __dirname;

const HTML = path.resolve(REPO_ROOT, process.argv[2] || 'plants-vs-zombies.html');
const TAG = process.argv[3] || 'new';
const TMP = path.join(process.cwd(), '.tmp-v20-fog');

function get(u) { return new Promise((res, rej) => { http.get(u, (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => res(d)); }).on('error', rej); }); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 主场景信息：?level=2-6 直跳后只读不写（验证 URL 通路本身命中雾关）；仅设 state='play' 渲染棋盘。
// test=1 沙盒模式（不落盘）。旧源（v1.9.0）无 levelKey（T-104 引入）→ 回退读 levelNo 数字键；
// 旧源 ?level=2-6 非数字被拒 → levelNo 保持 1 → 判据①语义红（非异常红）。
const SCENE_INFO = `(function(){
  try { document.getElementById('test-tip').style.display = 'none'; } catch (_) {}
  try { muted = true; } catch (_) {}
  state = 'play';
  var k = (typeof levelKey !== 'undefined') ? levelKey : ('旧源 levelNo=' + levelNo);
  var t = level && (level.time || (levelNo >= 3 ? 'night' : 'day'));
  return JSON.stringify({ state: state, levelKey: k, time: t, world: level && level.world });
})()`;

// PROBE：主场景（已由 URL 直跳载入）采样 → setScene 切 1-1 / 2-1 回归场景采样。
// 色值推导（泳池雾夜 2-6，反锯齿忽略）：
//   底 = 泳池夜板 #4a7f5a(74,127,90)/#3f6f4d(63,111,77)/水 #3f7fae 系 叠 T-401 夜滤镜
//       → under r∈[56,74] g∈[96,127] b∈[77,126]
//   雾 α=0.80 rgba(235,240,245)：主段 ≈ (201,215,216) → 白雾判定 r>185&&g>200&&b>200
//   过渡带 α=0.27..0.73（x∈[108,122]）→ r≈111..172（介于无雾侧 ~65 与主段 ~201 之间=柔和非硬边）
//   1-1 昼板 (136,194,80) / 2-1 泳池昼水色均不满足白雾判定。
const PROBE = `(function(){
  function snap() {
    var c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    var x = c.getContext('2d'); x.drawImage(canvas, 0, 0); return x;
  }
  function stats(x, x0, y0, w, h) {
    var z = x.getImageData(x0, y0, w, h).data, n = z.length / 4;
    var white = 0, dark = 0, rSum = 0;
    for (var i = 0; i < z.length; i += 4) {
      var r = z[i], g = z[i+1], b = z[i+2];
      if (z[i+3] > 200) {
        if (r > 185 && g > 200 && b > 200) white++;
        if (g < 130) dark++;
        rSum += r;
      } else { n--; }
    }
    return { white: white, dark: dark, rAvg: n ? rSum / n : 0, n: n };
  }
  function shot() { var c=document.createElement('canvas'); c.width=canvas.width; c.height=canvas.height; var x=c.getContext('2d'); x.drawImage(canvas,0,0); return c.toDataURL('image/png'); }
  function setScene(k, oldIdx) { var lv = LEVELS[k] || LEVELS[oldIdx]; if (lv) level = lv; if (typeof levelKey !== 'undefined') levelKey = k; else levelNo = oldIdx; state = 'play'; ctx.clearRect(0, 0, canvas.width, canvas.height); drawGameWorld(); }
  var out = {};
  var Y0 = GRID_Y + 5, YH = ROWS*CELL_H - 10;
  var FX0 = GRID_X + CELL_W/2, FX1 = GRID_X + COLS*CELL_W - CELL_W/2;   // 雾带实体边界 100/820
  // S1 主场景（URL 直跳 2-6）：主段 / 左半列 / 右半列 / 过渡带
  var x1 = snap();
  var mid = stats(x1, GRID_X+150, Y0, 520, YH);            // x∈[205,725] 雾带主段（避开过渡区）
  var left = stats(x1, GRID_X+2, Y0, CELL_W/2-7, YH);      // x∈[57,93]  col0 前半列可见区
  var right = stats(x1, FX1+7, Y0, CELL_W/2-7, YH);        // x∈[827,863] col8 右半可见区
  var fadeM = stats(x1, 108, Y0, 14, YH);                  // x∈[108,122] 左端过渡带中段
  out.mainMidWhite = mid.white / (520*YH);
  out.mainLeftWhite = left.white / ((CELL_W/2-7)*YH);
  out.mainLeftDark = left.dark / ((CELL_W/2-7)*YH);
  out.mainRightWhite = right.white / ((CELL_W/2-7)*YH);
  out.fadeMidRAvg = fadeM.rAvg;
  out.leftEdgeRAvg = stats(x1, GRID_X+2, Y0, 20, YH).rAvg; // 无雾侧基线
  out.s1Png = shot();
  // S2 1-1 昼回归：无雾
  setScene('1-1', 1);
  var x2 = snap();
  var d1 = stats(x2, GRID_X+150, Y0, 520, YH);
  out.day11White = d1.white / (520*YH);
  out.s2Png = shot();
  // S3 2-1 泳池昼回归：无雾（地形同世界 2，防 world 级误触发）
  setScene('2-1', 4);
  var x3 = snap();
  var d2 = stats(x3, GRID_X+150, Y0, 520, YH);
  out.day21White = d2.white / (520*YH);
  out.s3Png = shot();
  // 恢复主场景（保持页面状态一致，便于事后人工检视）；旧源恢复数字键 4（≈2-1 场景位）
  if (typeof levelKey !== 'undefined') { setScene('2-6', null); } else { setScene('2-6', 4); }
  return JSON.stringify(out);
})()`;

(async () => {
  fs.rmSync(TMP, { recursive: true, force: true });
  const e = execFile(EDGE, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + TMP,
    '--no-first-run', '--window-size=1200,900', 'about:blank']);
  let tabs = null;
  for (let i = 0; i < 40; i++) { try { tabs = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); break; } catch (_) { await sleep(250); } }
  if (!tabs) { console.error('CDP not ready on ' + PORT); process.exit(2); }
  const page = tabs.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.onopen = r);
  let mid = 0; const pend = {};
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend[m.id]) pend[m.id](m); };
  const send = (method, params = {}) => new Promise((r) => { mid++; pend[mid] = r; ws.send(JSON.stringify({ id: mid, method, params })); });
  const evalPage = async (code) => {
    const r = await send('Runtime.evaluate', { expression: code, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) {
      const ex = r.result.exceptionDetails;
      throw new Error('page exception: ' + ((ex.exception && ex.exception.description) || JSON.stringify(ex)));
    }
    return r.result.result.value;
  };

  let report = { meta: { html: HTML, tag: TAG, date: new Date().toISOString().slice(0, 10) } };
  try {
    await send('Page.enable');
    // ★验收通路：?level=2-6 URL 直跳（Q-12 禁选关页链路）+ test=1 沙盒不落盘
    await send('Page.navigate', { url: pathToFileURL(HTML).href + '?level=2-6&test=1' });
    await sleep(1600);
    report.scene = JSON.parse(await evalPage(SCENE_INFO));
    await sleep(200);
    const p = JSON.parse(await evalPage(PROBE));
    const fogPng = p.s1Png, day11Png = p.s2Png, day21Png = p.s3Png;
    delete p.s1Png; delete p.s2Png; delete p.s3Png;
    fs.writeFileSync(path.join(OUT, `v20-fog-${TAG}-2-6.png`), Buffer.from(fogPng.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(OUT, `v20-fog-${TAG}-day-1-1.png`), Buffer.from(day11Png.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(OUT, `v20-fog-${TAG}-day-2-1.png`), Buffer.from(day21Png.split(',')[1], 'base64'));
    report.probe = p;
  } catch (err) {
    report.error = String(err && err.message || err);
    console.error('FAIL  ' + report.error);
  } finally {
    try { ws.close(); } catch (_) {}
    try { e.kill(); } catch (_) {}
  }

  const p = report.probe || {};
  const s = report.scene || {};
  const thr = 30;   // 过渡带须显著高于无雾侧基线（柔和非硬边）
  report.verdict = {
    '①URL直跳2-6命中·time=fog': s.levelKey === '2-6' && s.time === 'fog',
    '②雾带主段白雾覆盖(>0.55)': typeof p.mainMidWhite === 'number' ? p.mainMidWhite > 0.55 : null,
    '③左半列可见·无雾(<0.02)且夜色(>0.5)': typeof p.mainLeftWhite === 'number' && typeof p.mainLeftDark === 'number' ? p.mainLeftWhite < 0.02 && p.mainLeftDark > 0.5 : null,
    '④右半列可见·无雾(<0.02)': typeof p.mainRightWhite === 'number' ? p.mainRightWhite < 0.02 : null,
    '⑤端部柔和过渡·中带r∈[100,190]且>无雾侧+30': typeof p.fadeMidRAvg === 'number' && typeof p.leftEdgeRAvg === 'number' ? p.fadeMidRAvg > 100 && p.fadeMidRAvg < 190 && p.fadeMidRAvg > p.leftEdgeRAvg + thr : null,
    '⑥回归·1-1昼无雾(<0.10)': typeof p.day11White === 'number' ? p.day11White < 0.10 : null,
    '⑦回归·2-1泳池昼无雾(<0.10)★防world级误触发': typeof p.day21White === 'number' ? p.day21White < 0.10 : null,
  };
  const allPass = Object.values(report.verdict).every((v) => v === true);
  const redCount = Object.values(report.verdict).filter((v) => v !== true).length;
  console.log('=== v20-fog-ui (T-402) tag=' + TAG + ' ===');
  console.log('html        : ' + HTML);
  console.log('scene       : ' + JSON.stringify(report.scene || report.error));
  console.log('probe       : ' + JSON.stringify(p));
  console.log('判据        : ' + JSON.stringify(report.verdict, null, 1));
  console.log('总判定      : ' + (allPass ? 'PASS' : 'FAIL') + (TAG !== 'new' ? `（旧源对照：红 ${redCount} 项=判别力证据）` : ''));

  const JR = path.join(OUT, 'v20-fog-ui-results.json');
  let ledger = { task: 'T-402 浓雾遮罩层 截图自证（v2.0 M4）', runs: [] };
  try { const old = JSON.parse(fs.readFileSync(JR, 'utf8')); if (old && Array.isArray(old.runs)) ledger = old; } catch (_) {}
  ledger.runs = (ledger.runs || []).filter((r) => r.tag !== TAG);
  ledger.runs.push({ tag: TAG, html: HTML, scene: report.scene, probe: p, verdict: report.verdict, allPass, redCount, date: new Date().toISOString().slice(0, 16) });
  fs.writeFileSync(JR, JSON.stringify(ledger, null, 2));
  process.exit(report.error || !allPass ? 1 : 0);
})();
