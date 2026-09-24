'use strict';
/* ============================================================================
 * tests/playtests/v21-select-reward.js — T-302a 选关页奖励预览行自证（v2.1 Q-3=B）
 * ----------------------------------------------------------------------------
 * 判据（新源必绿 / v2.0.1 旧源必红 = 判别力自证）：
 *   ① 真卡格（1-1='double'）第三行奖励带出现金色文字（奖励行渲染）。
 *   ② 金币格（1-7=100）第三行奖励带出现金色文字。
 *   ③ 占位格（3-2 tab3）第三行奖励带【无】金色像素（不显示）。
 *   ④ 与可玩性解耦：锁定格（unlocked=1-2 时的 1-3='melon'）仍显示奖励行。
 *   ⑤ 判别力：真卡/金币格奖励带金像素 > 占位格（差异确凿），旧源两者皆 0 ⇒ 必红。
 *
 * 像素采样：奖励带 = 格内 [bx+20, by+62, w-40, 20]（位于时长相 by+46 之下、格底 by+96 之上，
 *   避开边框描边与 ✓/▶ 角标）。金色参考 #ffd54a（drawSelect 奖励行着色）。
 *
 * 用法：
 *   "$NODE" tests/playtests/v21-select-reward.js                       # 当前源码（tag=new）
 *   "$NODE" tests/playtests/v21-select-reward.js <html路径> <tag>       # 旧源对照
 * 产物：tests/playtests/v21-select-reward-<tag>.png（页签1：真卡+金币格）
 *       tests/playtests/v21-select-reward-<tag>-ph.png（页签3：占位格）
 *       tests/playtests/v21-select-reward-results.json（追加式账本）
 * ==========================================================================*/

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9365;                                   // 避开 9355/9361/9363/9364
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT = __dirname;

const HTML = path.resolve(REPO_ROOT, process.argv[2] || 'plants-vs-zombies.html');
const TAG = process.argv[3] || 'new';
const PNG = `v21-select-reward-${TAG}.png`;
const PNG_PH = `v21-select-reward-${TAG}-ph.png`;
const TMP = path.join(process.cwd(), '.tmp-v21-reward');

function get(u) { return new Promise((res, rej) => { http.get(u, (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => res(d)); }).on('error', rej); }); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- SETUP：干净可玩场景（unlocked=2-10 ⇒ 世界 1 全格可玩绿底；cleared=[]）+ 页签 1 ----
const SETUP = `(function(){
  var rep = {};
  try { muted = true; } catch (_) {}
  saveCleared = []; unlocked = '2-10'; levelKey = '1-1'; DIFF = 'normal'; selTab = 1;
  setState('select', 'T-302a 自证');
  rep.after = { state: state, selTab: selTab, unlocked: unlocked, cleared: saveCleared.join('|') };
  return JSON.stringify(rep);
})()`;

// ---- PROBE：奖励带像素采样 + 截图 ----
const PROBE = `(function(){
  var c = document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  var x = c.getContext('2d');
  x.drawImage(canvas, 0, 0);                 // 冻结页签 1 快照
  var mctx = canvas.getContext('2d');         // 主 canvas 实时 ctx（切页签/改态后重绘须采这里）
  var C = { x0:110, y:180, w:140, h:96, colGap:20, rowGap:28 };
  function cellXY(row, col) { return { bx: C.x0 + col * (C.w + C.colGap), by: C.y + row * (C.h + C.rowGap) }; }
  // 奖励带 = 格内 [bx+20, by+62, w-40, 20]；金色 #ffd54a = (255,213,74)
  function goldFrom(ctx2, bx, by) {
    var z = ctx2.getImageData(bx+20, by+62, C.w-40, 20).data, n = 0;
    for (var i = 0; i < z.length; i += 4) {
      if (Math.abs(z[i]-255) < 45 && Math.abs(z[i+1]-213) < 45 && Math.abs(z[i+2]-74) < 45) n++;
    }
    return n;
  }
  var out = {};
  var p1 = cellXY(0, 0), p7 = cellXY(1, 1);
  // ① 真卡格 1-1（row0 col0, award='double' → 卡名「双发」）——页签 1 冻结快照
  out.cardRewardGold = goldFrom(x, p1.bx, p1.by);
  // ② 金币格 1-7（row1 col1, award=100 → 「100 金币」）——页签 1 冻结快照
  out.coinRewardGold = goldFrom(x, p7.bx, p7.by);
  // ③ 占位格 3-2（页签 3, row0 col1）：切页签→主 canvas 实时采样→还原（占位无奖励行）
  out.phRewardGold = (function(){ try{ selTab=3; drawSelect(); var v=goldFrom(mctx, p7.bx, 180); selTab=1; drawSelect(); return v; }catch(e){ return 'ERR '+e.message; } })();
  // ④ 锁定格 1-3（row0 col2, award='melon' → 卡名「西瓜」）：unlocked=1-2 ⇒ 锁定；解耦仍应显示奖励
  out.lockedRewardGold = (function(){ try{ unlocked='1-2'; drawSelect(); var v=goldFrom(mctx, C.x0+2*(C.w+C.colGap), 180); unlocked='2-10'; drawSelect(); return v; }catch(e){ return 'ERR '+e.message; } })();
  // 主图（页签 1：含真卡 + 金币格）
  out.png = c.toDataURL('image/png');
  // 占位图（页签 3）——重绘后另存（读主 canvas 实时像素）
  try { selTab = 3; drawSelect();
    var c2 = document.createElement('canvas'); c2.width = canvas.width; c2.height = canvas.height;
    c2.getContext('2d').drawImage(canvas, 0, 0); out.pngPh = c2.toDataURL('image/png');
    selTab = 1; drawSelect();
  } catch (e) { out.pngPh = ''; }
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
    report.pngBytes = buf.length;
    if (p.pngPh) { const b2 = Buffer.from(p.pngPh.split(',')[1], 'base64'); fs.writeFileSync(path.join(OUT, PNG_PH), b2); report.pngPhBytes = b2.length; }
    delete p.pngPh;
    report.probe = p;
  } catch (err) {
    report.error = String(err && err.message || err);
    console.error('FAIL  ' + report.error);
  } finally {
    try { ws.close(); } catch (_) {}
    try { e.kill(); } catch (_) {}
  }

  const p = report.probe || {};
  const num = (v) => (typeof v === 'number' ? v : -1);
  report.verdict = {
    '①真卡格 1-1 奖励行渲染（金色像素 > 5）': num(p.cardRewardGold) > 5,
    '②金币格 1-7 奖励行渲染（金色像素 > 5）': num(p.coinRewardGold) > 5,
    '③占位格 3-2 无奖励行（金色像素 == 0）': p.phRewardGold === 0,
    '④锁定格 1-3 仍显示奖励（金色像素 > 5，与可玩性解耦）': num(p.lockedRewardGold) > 5,
    '⑤判别力：真卡/金币带 > 占位带（差异确凿）': num(p.cardRewardGold) > num(p.phRewardGold) && num(p.coinRewardGold) > num(p.phRewardGold),
  };
  const allPass = Object.values(report.verdict).every((v) => v === true);
  console.log('=== v21-select-reward (T-302a) ===');
  console.log('html   : ' + HTML);
  console.log('setup  : ' + JSON.stringify(report.setup || report.error));
  console.log('probe  : ' + JSON.stringify(p));
  console.log('判据   : ' + JSON.stringify(report.verdict));
  console.log('总判定 : ' + (allPass ? 'PASS' : 'FAIL') + '   产物: ' + PNG + (report.pngPhBytes ? ' + ' + PNG_PH : ''));

  const JR = path.join(OUT, 'v21-select-reward-results.json');
  let ledger = { task: 'T-302a 选关页奖励预览行自证（v2.1 Q-3=B）', runs: [] };
  try { const old = JSON.parse(fs.readFileSync(JR, 'utf8')); if (old && Array.isArray(old.runs)) ledger = old; } catch (_) {}
  ledger.runs = (ledger.runs || []).filter((r) => r.tag !== TAG);
  ledger.runs.push({ tag: TAG, html: HTML, png: PNG, pngPh: report.pngPhBytes ? PNG_PH : null, probe: p, verdict: report.verdict, allPass, date: new Date().toISOString().slice(0, 16) });
  fs.writeFileSync(JR, JSON.stringify(ledger, null, 2));
  process.exit(report.error || !allPass ? 1 : 0);
})();
