'use strict';
/* ============================================================================
 * tests/playtests/v20-end-nav-ui.js — T-301 结算屏导航 UI 截图自证（v2.0 M3）
 * ----------------------------------------------------------------------------
 * 三场景真机渲染 + 像素判据（END_BTN 几何：x 390..610 / nextY 410..460 / backGap=62）：
 *  S1 通关 hasNext 态（won=true, levelKey='1-1'）：下一关金钮 #c9a34a @y410..460 +
 *     返回钮 #8b6f2a @y472..522（含白字）。几何基线（v1.9.0 修复后布局，新旧同绿）。
 *  S2 世界末关 won 态（won=true, levelKey='1-6'）：★判别力红点——新源 hasNext=false
 *     无下一关钮、返回钮上移 @y410..460；旧源（LEVEL_INDEX 全局末位口径）仍画「进入第X关」
 *     金钮 @y410..460 ⇒ ④⑤ 双红。
 *  S3 失败态（won=false）：无下一关钮，返回钮 @y410..460。几何基线（新旧同绿）。
 *     导航语义（返回→select / 占位拦截 / 空格）由 v20-end-nav.js 状态链路覆盖。
 *
 * 用法：
 *   "$NODE" tests/playtests/v20-end-nav-ui.js                        # 当前源码
 *   "$NODE" tests/playtests/v20-end-nav-ui.js <html路径> <tag>       # 旧源对照
 * 产物：tests/playtests/v20-end-<tag>-{win,tail,lose}.png + v20-end-nav-ui-results.json
 * ==========================================================================*/

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9366;                                   // 避开 9363(menu-verify)/9364(select-draw)
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT = __dirname;

const HTML = path.resolve(REPO_ROOT, process.argv[2] || 'plants-vs-zombies.html');
const TAG = process.argv[3] || 'new';
const TMP = path.join(process.cwd(), '.tmp-v20-end-ui');

function get(u) { return new Promise((res, rej) => { http.get(u, (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => res(d)); }).on('error', rej); }); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 场景预置：构造 end 态基础字段（won/levelKey/level 由 PROBE 按场景覆写）。
// level 兼容回退 LEVELS[1]：旧源（数字键）遇 '1-6' 落回旧 L1，drawEnd 不崩、hasNext 判定照旧走旧口径。
const SCENE = `(function(){
  var rep = {};
  try { muted = true; } catch (_) {}
  levelKey = '1-1'; level = LEVELS['1-1'] || LEVELS[1];
  wave = 5; score = 1234; points = 500; highScore = 2000;
  won = true; state = 'end';
  endStats = { run: 60, clear: 300 };
  rep.snapshot = { state: state, won: won, levelKey: levelKey };
  return JSON.stringify(rep);
})()`;

// PROBE：三场景各「赋值 → drawEnd() → 重新快照 → 采样」（★每个场景必须重快照，
// 假同帧教训：首帧快照冻结后所有采样读同一份旧画面 ⇒ 跨场景计数完全相等即此病）。
const PROBE = `(function(){
  function snap() {
    var c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    var x = c.getContext('2d'); x.drawImage(canvas, 0, 0); return x;
  }
  function count(x, x0, y0, w, h, r, g, b, tol) {
    var z = x.getImageData(x0, y0, w, h).data, n = 0;
    for (var i = 0; i < z.length; i += 4) {
      if (Math.abs(z[i]-r) < tol && Math.abs(z[i+1]-g) < tol && Math.abs(z[i+2]-b) < tol) n++;
    }
    return n;
  }
  function shot() { var c=document.createElement('canvas'); c.width=canvas.width; c.height=canvas.height; var x=c.getContext('2d'); x.drawImage(canvas,0,0); return c.toDataURL('image/png'); }
  var out = {};
  // S1 通关 hasNext（'1-1'）
  won = true; levelKey = '1-1'; level = LEVELS['1-1'] || LEVELS[1]; drawEnd();
  var x1 = snap();
  out.s1NextGold  = count(x1, 400, 420, 200, 30, 201, 163, 74, 16);   // 下一关金钮 @y410..460
  out.s1BackBrown = count(x1, 400, 482, 200, 30, 139, 111, 42, 16);   // 返回钮 @y472..522
  out.s1BackText  = count(x1, 460, 486, 80, 22, 255, 255, 255, 20);   // 返回钮白字
  out.s1Png = shot();
  // S2 世界末关 won（'1-10'）→ 新源：无金钮、返回钮上移；旧源：仍画金钮（判别红点）
  levelKey = '1-10'; level = LEVELS['1-10'] || LEVELS[1]; drawEnd();
  var x2 = snap();
  out.s2NextGold  = count(x2, 400, 420, 200, 30, 201, 163, 74, 16);
  out.s2BackBrown = count(x2, 400, 420, 200, 30, 139, 111, 42, 16);   // 返回钮上移位 @y410..460
  out.s2Png = shot();
  // S3 失败态
  won = false; levelKey = '1-1'; level = LEVELS['1-1'] || LEVELS[1]; drawEnd();
  var x3 = snap();
  out.s3NextGold  = count(x3, 400, 420, 200, 30, 201, 163, 74, 16);
  out.s3BackBrown = count(x3, 400, 420, 200, 30, 139, 111, 42, 16);
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
    await send('Page.navigate', { url: pathToFileURL(HTML).href + '?test=1' });
    await sleep(1600);
    report.scene = JSON.parse(await evalPage(SCENE));
    await sleep(400);
    const p = JSON.parse(await evalPage(PROBE));
    const winPng = p.s1Png, tailPng = p.s2Png, losePng = p.s3Png;
    delete p.s1Png; delete p.s2Png; delete p.s3Png;
    fs.writeFileSync(path.join(OUT, `v20-end-${TAG}-win.png`), Buffer.from(winPng.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(OUT, `v20-end-${TAG}-tail.png`), Buffer.from(tailPng.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(OUT, `v20-end-${TAG}-lose.png`), Buffer.from(losePng.split(',')[1], 'base64'));
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
    '①S1 通关态下一关金钮 @y410..460（>200）': typeof p.s1NextGold === 'number' ? p.s1NextGold > 200 : null,
    '②S1 通关态返回钮 @y472..522（>200）': typeof p.s1BackBrown === 'number' ? p.s1BackBrown > 200 : null,
    '③S1 返回钮白字（>30）': typeof p.s1BackText === 'number' ? p.s1BackText > 30 : null,
    '④S2 世界末关无下一关金钮（<10）★判别点': typeof p.s2NextGold === 'number' ? p.s2NextGold < 10 : null,
    '⑤S2 返回钮上移 @y410..460（>200）★判别点': typeof p.s2BackBrown === 'number' ? p.s2BackBrown > 200 : null,
    '⑥S3 失败态无下一关金钮（<10）': typeof p.s3NextGold === 'number' ? p.s3NextGold < 10 : null,
    '⑦S3 返回钮 @y410..460（>200）': typeof p.s3BackBrown === 'number' ? p.s3BackBrown > 200 : null,
  };
  const allPass = Object.values(report.verdict).every((v) => v === true);
  console.log('=== v20-end-nav-ui (T-301) ===');
  console.log('html        : ' + HTML);
  console.log('scene       : ' + JSON.stringify(report.scene || report.error));
  console.log('probe       : ' + JSON.stringify(p));
  console.log('判据        : ' + JSON.stringify(report.verdict));
  console.log('总判定      : ' + (allPass ? 'PASS' : 'FAIL'));

  const JR = path.join(OUT, 'v20-end-nav-ui-results.json');
  let ledger = { task: 'T-301 结算屏导航 UI 截图自证（v2.0 M3）', runs: [] };
  try { const old = JSON.parse(fs.readFileSync(JR, 'utf8')); if (old && Array.isArray(old.runs)) ledger = old; } catch (_) {}
  ledger.runs = (ledger.runs || []).filter((r) => r.tag !== TAG);
  ledger.runs.push({ tag: TAG, html: HTML, probe: p, verdict: report.verdict, allPass, date: new Date().toISOString().slice(0, 16) });
  fs.writeFileSync(JR, JSON.stringify(ledger, null, 2));
  process.exit(report.error || !allPass ? 1 : 0);
})();
