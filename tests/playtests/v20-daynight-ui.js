'use strict';
/* ============================================================================
 * tests/playtests/v20-daynight-ui.js — T-401 昼夜色板查表化 截图自证（v2.0 M4）
 * ----------------------------------------------------------------------------
 * 三场景真机渲染 + 像素判据（time 查 WORLD_THEMES / dusk 退役 / night 切 time 驱动）：
 *  S1 1-1 昼基线（time:'day'）：bright green 草地棋盘 + 无滤镜覆盖 → 色板 #88c250/#77b042 像素计数。
 *  S2 1-6 夜基线（time:'night'）：dark green 草地 + 冷蓝渐变滤镜 → 夜板+蓝罩像素判据。
 *  ★判别力红点 S3 1-2 旧 L2（dusk 退役归昼 Q-11）：新源=纯昼板无滤镜；
 *     旧源（v1.9.0）仍有 level.dusk 暖橙紫渐变 → 棋盘区域暖色像素计数为新源零/旧源 >0。
 *
 * 用法：
 *   "$NODE" tests/playtests/v20-daynight-ui.js                        # 当前源码
 *   "$NODE" tests/playtests/v20-daynight-ui.js <html路径> <tag>       # 旧源对照
 * 产物：tests/playtests/v20-daynight-<tag>-{day,night,dusk}.png + v20-daynight-ui-results.json
 * ==========================================================================*/

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9370;                                   // 避开 9363/9364/9366
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT = __dirname;

const HTML = path.resolve(REPO_ROOT, process.argv[2] || 'plants-vs-zombies.html');
const TAG = process.argv[3] || 'new';
const TMP = path.join(process.cwd(), '.tmp-v20-daynight');

function get(u) { return new Promise((res, rej) => { http.get(u, (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => res(d)); }).on('error', rej); }); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 场景预置：test=1 沙盒模式，直设 levelKey/level/state 渲染棋盘无需 deck 流程。
// 兼容旧源（v1.9.0 数字键 LEVELS[1..5]）：LEVELS['1-1'] 回退 LEVELS[1]。
const SCENE = `(function(){
  try { document.getElementById('test-tip').style.display = 'none'; } catch (_) {}
  try { muted = true; } catch (_) {}
  var lvl = LEVELS['1-1'] || LEVELS[1];
  levelKey = '1-1'; level = lvl; state = 'play';
  return JSON.stringify({ state: state, levelKey: levelKey, hasLevel: !!level });
})()`;

// PROBE：三场景各「clearRect → 设 levelKey/level → drawGameWorld() → snap → 采样」
// 色值推导（世界1草地，反锯齿忽略）：
//   昼板 #88c250(136,194,80)/#77b042(119,176,66) → g=176..194（亮绿）
//   夜板 #6f9f5e(111,159,94)/#628f52(98,143,82) 叠冷蓝 rgba(40,60,140,.14~.30)
//       → g 压到 129..159（暗绿；夜板 g 本身 143..159 已 <昼板）
//   旧源 dusk rgba(255,150,60,.28) → r 推到 ~163、b 仍低 ~70
// 差分判据（g 通道为昼夜本质差异）：g>165=昼、g<=160=夜、r>150&&b<95=暖色（dusk 残留）
const PROBE = `(function(){
  function snap() {
    var c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    var x = c.getContext('2d'); x.drawImage(canvas, 0, 0); return x;
  }
  function countPix(x, x0, y0, w, h, fn) {
    var z = x.getImageData(x0, y0, w, h).data, n = 0;
    for (var i = 0; i < z.length; i += 4) {
      if (z[i+3] > 200 && fn(z[i], z[i+1], z[i+2])) n++;
    }
    return n;
  }
  function shot() { var c=document.createElement('canvas'); c.width=canvas.width; c.height=canvas.height; var x=c.getContext('2d'); x.drawImage(canvas,0,0); return c.toDataURL('image/png'); }
  function setScene(k, oldIdx) { levelKey = k; level = LEVELS[k] || LEVELS[oldIdx]; state = 'play'; ctx.clearRect(0, 0, canvas.width, canvas.height); drawGameWorld(); }
  var out = {};
  var BX = GRID_X + 10, BY = GRID_Y + 10, BW = COLS*CELL_W - 20, BH = ROWS*CELL_H - 20;
  var isDay = function(r,g,b) { return g > 165; };                 // 昼：亮绿（g 高）
  var isNight = function(r,g,b) { return g >= 100 && g <= 160; };  // 夜：暗绿（g 中）
  var isWarm = function(r,g,b) { return r > 150 && b < 95; };      // dusk 暖色残留

  // S1 1-1 昼基线（time:'day'）
  setScene('1-1', 1);
  var x1 = snap();
  out.s1Day = countPix(x1, BX, BY, BW, BH, isDay);
  out.s1Warm = countPix(x1, BX, BY, BW, BH, isWarm);
  out.s1Png = shot();

  // S2 1-6 夜基线（time:'night'）
  setScene('1-6', 3);
  var x2 = snap();
  out.s2Night = countPix(x2, BX, BY, BW, BH, isNight);
  out.s2Day = countPix(x2, BX, BY, BW, BH, isDay);
  out.s2Png = shot();

  // ★S3 判别力红点：1-2（旧 L2，dusk 退役归昼 Q-11）
  setScene('1-2', 2);
  var x3 = snap();
  out.s3Day = countPix(x3, BX, BY, BW, BH, isDay);
  out.s3Warm = countPix(x3, BX, BY, BW, BH, isWarm);
  out.s3Png = shot();

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
    // test=1 沙盒模式直进，skip deck 流程
    await send('Page.navigate', { url: pathToFileURL(HTML).href + '?test=1' });
    await sleep(1600);
    report.scene = JSON.parse(await evalPage(SCENE));
    await sleep(200);
    const p = JSON.parse(await evalPage(PROBE));
    const dayPng = p.s1Png, nightPng = p.s2Png, duskPng = p.s3Png;
    delete p.s1Png; delete p.s2Png; delete p.s3Png;
    fs.writeFileSync(path.join(OUT, `v20-daynight-${TAG}-day.png`), Buffer.from(dayPng.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(OUT, `v20-daynight-${TAG}-night.png`), Buffer.from(nightPng.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(OUT, `v20-daynight-${TAG}-dusk.png`), Buffer.from(duskPng.split(',')[1], 'base64'));
    report.probe = p;
  } catch (err) {
    report.error = String(err && err.message || err);
    console.error('FAIL  ' + report.error);
  } finally {
    try { ws.close(); } catch (_) {}
    try { e.kill(); } catch (_) {}
  }

  const p = report.probe || {};
  report.verdict = {
    '①S1 1-1 昼基线g亮绿（>100000）': typeof p.s1Day === 'number' ? p.s1Day > 100000 : null,
    '②S1 1-1 无暖色滤镜残留（<100）': typeof p.s1Warm === 'number' ? p.s1Warm < 100 : null,
    '③S2 1-6 夜基线g暗绿（>50000）': typeof p.s2Night === 'number' ? p.s2Night > 50000 : null,
    '④S2 1-6 夜态昼g大幅回落（<s1Day*0.5）': typeof p.s2Day === 'number' && typeof p.s1Day === 'number' ? p.s2Day < p.s1Day * 0.5 : null,
    '⑤S3 1-2 dusk退役归昼·昼g（>100000）': typeof p.s3Day === 'number' ? p.s3Day > 100000 : null,
    '⑥S3 1-2 无暖色滤镜残留 ★判别点（<100）': typeof p.s3Warm === 'number' ? p.s3Warm < 100 : null,
  };
  const allPass = Object.values(report.verdict).every((v) => v === true);
  console.log('=== v20-daynight-ui (T-401) ===');
  console.log('html        : ' + HTML);
  console.log('scene       : ' + JSON.stringify(report.scene || report.error));
  console.log('probe       : ' + JSON.stringify(p));
  console.log('判据        : ' + JSON.stringify(report.verdict));
  console.log('总判定      : ' + (allPass ? 'PASS' : 'FAIL'));

  const JR = path.join(OUT, 'v20-daynight-ui-results.json');
  let ledger = { task: 'T-401 昼夜色板查表化 截图自证（v2.0 M4）', runs: [] };
  try { const old = JSON.parse(fs.readFileSync(JR, 'utf8')); if (old && Array.isArray(old.runs)) ledger = old; } catch (_) {}
  ledger.runs = (ledger.runs || []).filter((r) => r.tag !== TAG);
  ledger.runs.push({ tag: TAG, html: HTML, probe: p, verdict: report.verdict, allPass, date: new Date().toISOString().slice(0, 16) });
  fs.writeFileSync(JR, JSON.stringify(ledger, null, 2));
  process.exit(report.error || !allPass ? 1 : 0);
})();