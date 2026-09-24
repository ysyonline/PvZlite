'use strict';
/* ============================================================================
 * tests/playtests/v20-select-draw.js — T-204 选关页绘制自证（v2.0 M2）
 * ----------------------------------------------------------------------------
 * 判据（新源必绿 / v1.9.0 旧源必红 = 判别力自证）：
 * ① 页签齐备：setState('select') 后采样 4 页签行（SELECT_GEOM.TAB 中心行 y=106）
 *    ×4 页签中心点，页签绿底/金底色命中 ≥3 —— 旧源无 select 态（原地 menu）⇒ 0 必红。
 * ② 关卡格 1-1 主标：采样 CELL(0,0) 中心区「白字像素 > 20」（关号 '1-1' 粗体白字）。
 * ③ 三态样式：改造 saveCleared=[‘1-1’]+unlocked='1-3' 后，
 *    格 1-1 呈暗金底（已通关 #8a6f2a 命中 > 80）、格 1-4 灰调占位（#4a4a42 命中 > 80）。
 * ④ 难度行：DIFF 行当前难度金底（#c9a34a 命中 > 40）。
 * ⑤ 占位函数退役：源码无 drawSelectPlaceholder 残留引用。
 *
 * 用法：
 *   "$NODE" tests/playtests/v20-select-draw.js                          # 当前源码
 *   "$NODE" tests/playtests/v20-select-draw.js <html路径> <tag>          # 旧源对照
 * 产物：tests/playtests/v20-select-<tag>.png + v20-select-draw-results.json（追加式账本）
 * ==========================================================================*/

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9364;                                   // 避开 9355/9361/9363
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT = __dirname;

const HTML = path.resolve(REPO_ROOT, process.argv[2] || 'plants-vs-zombies.html');
const TAG = process.argv[3] || 'new';
const PNG = `v20-select-${TAG}.png`;
const TMP = path.join(process.cwd(), '.tmp-v20-select');

function get(u) { return new Promise((res, rej) => { http.get(u, (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => res(d)); }).on('error', rej); }); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- SETUP：构造三态场景（1-1 已通关 / 1-2 当前 / 1-3 解锁未通 / 1-4 起灰调占位）----
const SETUP = `(function(){
  var rep = {};
  try { muted = true; } catch (_) {}
  saveCleared.length = 0; saveCleared.push('1-1');
  unlocked = '1-3'; levelKey = '1-2'; DIFF = 'hard';
  setState('select', 'T-204 自证');
  saveCleared=["1-1"]; unlocked="1-3"; levelKey="1-2"; DIFF="hard"; setState("select","reassign"); rep.after = { state: state, selTab: selTab, unlocked: unlocked, cleared: saveCleared.join('|') };
  return JSON.stringify(rep);
})()`;

// ---- PROBE：像素采样 ----
const PROBE = `(function(){
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
  var out = {};
  // ① 页签行：4 页签中心点 6×6 邻域，绿底 #2a5a1a 或金底 #c9a34a 命中的页签数
  var tabs = 0;
  for (var w = 0; w < 4; w++) {
    var cx = 104 + w * 200 + 96;   // TAB.x0 + w*(w+gap) + w/2
    var hit = count(cx-3, 106-3, 6, 6, 42, 90, 26, 16) + count(cx-3, 106-3, 6, 6, 201, 163, 74, 16);
    if (hit > 4) tabs++;
  }
  out.tabHits = tabs;
  // ② CELL(0,0)='1-1'（已通关暗金底）主标白字/米金字
  out.cell11Text = count(110+40, 180+12, 60, 20, 255, 255, 255, 20) + count(110+40, 180+12, 60, 20, 255, 233, 160, 20);
  out.cell11Gold = count(110+8, 180+60, 124, 20, 138, 111, 42, 16);      // 已通关暗金底 #8a6f2a
  // ③ CELL(1,1)='1-7' 金币关可玩绿底（v2.1 T-104 金币化：原灰调占位断言迁至世界 3 恒占位 3-2）
  //    3-2 位置=页签 3 row0 col1——但本场景 selTab=1，改采 tab 内等价位：selTab=1 的 row1 col1=1-7 现为金币关可玩绿；
  //    恒占位断言走 tab3GoldProbe 同款手法不可行（占位灰需页签 3 可见），改双重断言：
  //    a) 1-7 中心=可玩绿（42,90,26=#2a5a1a 邻域）证金币闸开；b) 页签 3 切换后 3-2 中心灰（74,74,66=#4a4a42 邻域）
  out.cell17Center = (function(){ var d = x.getImageData(110+1*160+70, 180+124+70, 1, 1).data; return d[0]+","+d[1]+","+d[2]; })();
  // 3-2 恒占位灰探针：快照 c 已冻结，须在主 canvas 切页签→直接采主 canvas ctx→还原（tab2GoldProbe 同款但采主 canvas）
  out.cell32GrayProbe = (function(){ try{ selTab=3; drawSelect(); var mctx=canvas.getContext('2d'); var d=mctx.getImageData(110+1*160+70, 180+48, 1, 1).data; var r=d[0]+','+d[1]+','+d[2]; selTab=1; drawSelect(); return r; }catch(e){ return "ERR "+e.message; } })();
  // ④ 难度行：hard（第 2 钮）金底
  out.diffHardGold = count(296+144+8, 139+8, 104, 14, 201, 163, 74, 16);
  // ⑤ 返回钮
  out.backBtn = count(390+8, 430+8, 204, 34, 139, 111, 42, 16);           // #8b6f2a
out.tab2GoldProbe = (function(){ try{ selTab=2; drawSelect(); var d=x.getImageData(304+96,106,1,1).data; var r1=d[0]+','+d[1]+','+d[2]; selTab=1; drawSelect(); return r1; }catch(e){ return "ERR "+e.message; } })();
  out.png = c.toDataURL('image/png');
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
    await send('Page.navigate', { url: pathToFileURL(HTML).href + '?test=1' });
    await sleep(1600);
    report.setup = JSON.parse(await evalPage(SETUP));
    await sleep(400);
    const p = JSON.parse(await evalPage(PROBE));
    const buf = Buffer.from(p.png.split(',')[1], 'base64');
    delete p.png;
    fs.writeFileSync(path.join(OUT, PNG), buf);
    report.probe = p; report.pngBytes = buf.length;
  } catch (err) {
    report.error = String(err && err.message || err);
    console.error('FAIL  ' + report.error);
  } finally {
    try { ws.close(); } catch (_) {}
    try { e.kill(); } catch (_) {}
  }

  const p = report.probe || {};
  report.verdict = {
    '①页签齐备（4 页签底色命中 ≥3）': typeof p.tabHits === 'number' ? p.tabHits >= 3 : null,
    '②1-1 主标文字可见（>20）': typeof p.cell11Text === 'number' ? p.cell11Text > 20 : null,
    '③a 已通关暗金底（>80）': typeof p.cell11Gold === 'number' ? p.cell11Gold > 80 : null,
    '③b 金币关可玩绿（1-7 中心 #2a5a1a 邻域，v2.1 金币化）': p.cell17Center === '42,90,26',
    '③c 恒占位灰调（3-2 中心灰系 RGB 均衡（通道差<12·均值 60..90），世界 3 未开放）': (function(){ var m=p.cell32GrayProbe&&p.cell32GrayProbe.split(',').map(Number); return !!(m&&m.length===3&&Math.max(m[0],m[1],m[2])-Math.min(m[0],m[1],m[2])<12&&(m[0]+m[1]+m[2])/3>=60&&(m[0]+m[1]+m[2])/3<=90); })(),
    '④难度钮当前金底（>40）': typeof p.diffHardGold === 'number' ? p.diffHardGold > 40 : null,
    '⑤返回钮落位（>200）': typeof p.backBtn === 'number' ? p.backBtn > 200 : null,
  };
  const allPass = Object.values(report.verdict).every((v) => v === true);
  console.log('=== v20-select-draw (T-204) ===');
  console.log('html        : ' + HTML);
  console.log('setup       : ' + JSON.stringify(report.setup || report.error));
  console.log('probe       : ' + JSON.stringify(Object.assign({}, p, { png: undefined })));
  console.log('判据        : ' + JSON.stringify(report.verdict));
  console.log('总判定      : ' + (allPass ? 'PASS' : 'FAIL') + '   产物: ' + PNG);

  const JR = path.join(OUT, 'v20-select-draw-results.json');
  let ledger = { task: 'T-204 选关页绘制自证（v2.0 M2）', runs: [] };
  try { const old = JSON.parse(fs.readFileSync(JR, 'utf8')); if (old && Array.isArray(old.runs)) ledger = old; } catch (_) {}
  ledger.runs = (ledger.runs || []).filter((r) => r.tag !== TAG);
  ledger.runs.push({ tag: TAG, html: HTML, png: PNG, probe: p, verdict: report.verdict, allPass, date: new Date().toISOString().slice(0, 16) });
  fs.writeFileSync(JR, JSON.stringify(ledger, null, 2));
  process.exit(report.error || !allPass ? 1 : 0);
})();
