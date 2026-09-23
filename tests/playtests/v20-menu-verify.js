'use strict';
/* ============================================================================
 * tests/playtests/v20-menu-verify.js — T-203 主菜单重绘自证（v2.0 M2）
 * ----------------------------------------------------------------------------
 * 判据（新源必绿 / v1.9.0 旧源必红 = 判别力自证）：
 * ① 进入游戏钮落位：menu 态采样 y=428 行（MENU_BTN 中心行）x∈[400,600) 的
 *    按钮填充色 #8b6f2a 像素数 —— 新源 >120（240×56 钮贯穿该行）；
 *    旧源该行是提示文字/绿底（旧开始钮在 480..540）⇒ <60 必红。
 * ② 点击进 select：页面内调 onClickMenu(500,428) 后 state==='select' 且
 *    全屏占位底色 #1a2a12 占比 >0.9 —— 旧源该点无命中态，仍 menu 绿底 ⇒ 必红。
 * ③ 记录项（非判据）：右下角版本角标文本、副标语行黄字（#c9a34a）存在性。
 *
 * 用法：
 *   "$NODE" tests/playtests/v20-menu-verify.js                          # 当前源码
 *   "$NODE" tests/playtests/v20-menu-verify.js <html路径> <tag>          # 旧源对照
 * 旧源对照示例：
 *   "$NODE" tests/playtests/v20-menu-verify.js production/release/v1.9/artifacts/plants-vs-zombies.v1.9.html old-v190
 * 产物：tests/playtests/v20-menu-<tag>.png + v20-menu-verify-results.json（追加式账本）
 * ==========================================================================*/

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9363;                                   // 避开 9355（卫生门）/9361（ui-end-verify）
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT = __dirname;

const HTML = path.resolve(REPO_ROOT, process.argv[2] || 'plants-vs-zombies.html');
const TAG = process.argv[3] || 'new';
const PNG = `v20-menu-${TAG}.png`;
const TMP = path.join(process.cwd(), '.tmp-v20-menu');

function get(u) { return new Promise((res, rej) => { http.get(u, (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => res(d)); }).on('error', rej); }); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 探针 1：menu 态采样（截图 + 像素判据原始数） ----
const PROBE_MENU = `(function(){
  var c = document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  var x = c.getContext('2d');
  x.drawImage(canvas, 0, 0);
  // ① MENU_BTN 中心行 y=428 × x 400..600：按钮填充色 #8b6f2a=(139,111,42)
  var z = x.getImageData(400, 428, 200, 1).data;
  var btn = 0;
  for (var i = 0; i < z.length; i += 4) {
    if (Math.abs(z[i]-139) < 14 && Math.abs(z[i+1]-111) < 14 && Math.abs(z[i+2]-42) < 14) btn++;
  }
  // ③ 副标语行 y=196 黄字 #c9a34a=(201,163,74)（两代菜单均有，作记录）
  var z2 = x.getImageData(350, 190, 300, 12).data;
  var sub = 0;
  for (var j = 0; j < z2.length; j += 4) {
    if (Math.abs(z2[j]-201) < 16 && Math.abs(z2[j+1]-163) < 16 && Math.abs(z2[j+2]-74) < 16) sub++;
  }
  return JSON.stringify({ state: state, btnFillOnRow428: btn, subtitleGold: sub,
    png: c.toDataURL('image/png') });
})()`;

// ---- 探针 2：点击进入游戏钮后（select 选关页） ----
// T-206 更新：②b 原判据=T-202 临时占位底色 #1a2a12 占比>0.9；T-204 落地正式选关页（世界主题渐变）后
// 该像素前提过期。改为结构判据：页签行 4 页签底色命中（绿 #2a5a1a 或金 #c9a34a）≥3 + 返回钮存在。
const PROBE_SELECT = `(function(){
  var c = document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  var x = c.getContext('2d');
  x.drawImage(canvas, 0, 0);
  function count(x0, y0, w, h, r, g, b, tol) {
    var z = x.getImageData(x0, y0, w, h).data, n = 0;
    for (var i = 0; i < z.length; i += 4) {
      if (Math.abs(z[i]-r) < tol && Math.abs(z[i+1]-g) < tol && Math.abs(z[i+2]-b) < tol) n++;
    }
    return n;
  }
  var tabs = 0;
  for (var w = 0; w < 4; w++) {
    var cx = 104 + w * 200 + 96;
    var hit = count(cx-3, 106-3, 6, 6, 42, 90, 26, 16) + count(cx-3, 106-3, 6, 6, 201, 163, 74, 16);
    if (hit > 4) tabs++;
  }
  var back = count(390+8, 430+8, 204, 34, 139, 111, 42, 16);
  return JSON.stringify({ state: state, selTabHits: tabs, backBtnPx: back,
    png: c.toDataURL('image/png') });
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
    await send('Page.navigate', { url: pathToFileURL(HTML).href + '?test=1' });
    await sleep(1600);
    await evalPage('(function(){ try{muted=true}catch(_){} return String(typeof onClickMenu)+":"+VERSION })()');
    const m1 = JSON.parse(await evalPage(PROBE_MENU));
    const buf1 = Buffer.from(m1.png.split(',')[1], 'base64');
    delete m1.png;
    fs.writeFileSync(path.join(OUT, PNG), buf1);
    report.menu = m1; report.pngBytes = buf1.length;
    // 点击进入游戏钮中心（页面内直调 onClickMenu；真实链路断言在 T-205 v20-menu-nav）
    report.click = JSON.parse(await evalPage(
      '(function(){ onClickMenu(500,428); return JSON.stringify({ state: state }) })()'));
    await sleep(300);
    const m2 = JSON.parse(await evalPage(PROBE_SELECT));
    const buf2 = Buffer.from(m2.png.split(',')[1], 'base64');
    delete m2.png;
    fs.writeFileSync(path.join(OUT, PNG.replace('.png', '-select.png')), buf2);
    report.select = m2;
  } catch (err) {
    report.error = String(err && err.message || err);
    console.error('FAIL  ' + report.error);
  } finally {
    try { ws.close(); } catch (_) {}
    try { e.kill(); } catch (_) {}
  }

  const m = report.menu || {}, s = report.select || {}, ck = report.click || {};
  report.verdict = {
    '①进入游戏钮落位（行428按钮色 > 120）': typeof m.btnFillOnRow428 === 'number' ? m.btnFillOnRow428 > 120 : null,
    '②点击后进 select（state===select）': s.state === 'select',
    '②b select 选关页结构（页签命中 ≥3）': typeof s.selTabHits === 'number' ? s.selTabHits >= 3 : null,
    '②c select 返回钮落位（>200）': typeof s.backBtnPx === 'number' ? s.backBtnPx > 200 : null,
  };
  const allPass = Object.values(report.verdict).every((v) => v === true);
  console.log('=== v20-menu-verify (T-203/T-206) ===');
  console.log('html        : ' + HTML);
  console.log('menu 态     : state=' + m.state + '  ①行428按钮色=' + m.btnFillOnRow428 + '  ③副标语黄字=' + m.subtitleGold);
  console.log('点击(500,428): ' + JSON.stringify(ck) + '  → state=' + s.state + '  ②b页签命中=' + s.selTabHits + '  ②c返回钮=' + s.backBtnPx);
  console.log('判据        : ' + JSON.stringify(report.verdict));
  console.log('总判定      : ' + (allPass ? 'PASS' : 'FAIL') + '   产物: ' + PNG + ' / ' + PNG.replace('.png', '-select.png'));

  // 追加式证据账本：同一源重复跑覆盖该源记录
  const JR = path.join(OUT, 'v20-menu-verify-results.json');
  let ledger = { task: 'T-203 主菜单重绘自证（v2.0 M2）', runs: [] };
  try { const old = JSON.parse(fs.readFileSync(JR, 'utf8')); if (old && Array.isArray(old.runs)) ledger = old; } catch (_) {}
  ledger.runs = (ledger.runs || []).filter((r) => r.tag !== TAG);
  ledger.runs.push({ tag: TAG, html: HTML, png: PNG, probe: { menu: m, click: ck, select: s }, verdict: report.verdict, allPass, date: new Date().toISOString().slice(0, 16) });
  fs.writeFileSync(JR, JSON.stringify(ledger, null, 2));
  process.exit(report.error || !allPass ? 1 : 0);
})();
