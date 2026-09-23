'use strict';
/* ============================================================================
 * tests/playtests/ui-end-verify.js — 结算屏 UI 修复自证
 * （用户 2026-09-23 反馈两个问题；改前必红 / 改后必绿 = 判别力自证）
 * ----------------------------------------------------------------------------
 * ① 按钮遮挡：旧 drawEnd 用 fillRect(390,380,220,50) 画「进入第X关」，
 *    压住 y=384 的「历史最高分」行（文字中心 384 落在按钮 380..430 内）。
 *    判据：采样行区 y∈[376,392) × x∈[400,600) 内的**按钮色**像素数
 *          （#c9a34a 填充 / #3a1a0a 描边）—— 改前 >1000，改后 = 0。
 * ② 标题装饰环：26 个彩带方块沿椭圆 (cx±250, 220±105) 环绕「通关！」，
 *    下方弧段压住关卡名 / 积分行（i=6/7 两点落在 y≈324，与积分行 324..340 重叠）。
 *    判据：环上 26 个采样点的**彩带色**命中数（#ffce3a / #7ee06a）—— 改前 >5，改后 = 0。
 * ③ 正向可见：y=384 行的黄色文字像素数（#ffce3a）—— 改后应显著 > 改前
 *    （改前文字被按钮压掉大半，只剩上沿几条）。
 * 另：色判容差刻意取 <12，使 #ffd54a(255,213,74)（积分行常规色）不误命中 #ffce3a(255,206,58)。
 *
 * 用法（node 绝对路径，本机 = 公司机 user3667）：
 *   N="C:/Users/user3667/.workbuddy/binaries/node/versions/22.22.2-3/node.exe"
 *   "$N" tests/playtests/ui-end-verify.js                      # 当前源码 → ui-end-after.png
 *   "$N" tests/playtests/ui-end-verify.js <html路径> <出图名>    # 旧源对照
 * 旧源对照示例：
 *   git show v1.8.0:plants-vs-zombies.html > /tmp/old-v180.html
 *   "$N" tests/playtests/ui-end-verify.js .tmp-old/v180.html ui-end-before.png
 * 产物：tests/playtests/<出图名> + ui-end-verify-results.json（本脚本产物，勿还原）
 * ==========================================================================*/

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9361;                                   // 避开卫生建议口 9355 及历史占用口
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT = __dirname;

const HTML = path.resolve(REPO_ROOT, process.argv[2] || 'plants-vs-zombies.html');
const PNG = process.argv[3] || 'ui-end-after.png';
const TMP = path.join(process.cwd(), '.tmp-ui-end');

function get(u) { return new Promise((res, rej) => { http.get(u, (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => res(d)); }).on('error', rej); }); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 页面内探针：构造第四关通关态并采样 ----
const SETUP = `(function(){
  var rep = {};
  try {
    muted = true;                       // 静音，避免截图期音频干扰
  } catch (_) {}
  unlockedLevel = 5;
  levelNo = 4; level = LEVELS[4];       // 第四关 → 有下一关 ⇒ hasNext 分支（用户截图场景）
  DIFF = 'hard';                        // 「难度 困难」与用户截图一致
  startGame();
  rep.afterStart = { state: state, levelNo: levelNo, name: level.name };
  // 推平到「最后一波已放完 + 队列空 + 场上无僵尸」⇒ 下一帧 checkWave 判通关
  // （等价 harness forceWaves 收尾；harness 的 setLevel/setUnlocked/setWave 只是这几行的包装）
  wave = level.totalWaves;
  spawnQueue.length = 0;
  zombies.length = 0;
  projectiles.length = 0;
  waveActive = false;
  lastWaveT = gt - 999;                 // 最小喘息必然满足
  screenShake.t = 0;                    // 防抖动偏移污染像素判据
  return JSON.stringify(rep);
})()`;

const PROBE = `(function(){
  var c = document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  var x = c.getContext('2d');
  x.drawImage(canvas, 0, 0);
  var cx = canvas.width / 2;

  // ① 按钮色像素：采样「历史最高分」行区（y 376..392 × x 400..600）
  var z = x.getImageData(400, 376, 200, 16).data;
  var btn = 0;
  for (var i = 0; i < z.length; i += 4) {
    var r = z[i], g = z[i+1], b = z[i+2];
    var isFill   = Math.abs(r-201) < 14 && Math.abs(g-163) < 14 && Math.abs(b-74) < 14;  // #c9a34a
    var isFill2  = Math.abs(r-139) < 14 && Math.abs(g-111) < 14 && Math.abs(b-42) < 14;  // #8b6f2a
    var isBorder = Math.abs(r-58)  < 12 && Math.abs(g-26)  < 12 && Math.abs(b-10) < 12;  // #3a1a0a
    if (isFill || isFill2 || isBorder) btn++;
  }

  // ③ 该行黄色文字像素（#ffce3a，容差刻意收紧排除 #ffd54a）
  var txt = 0;
  for (var j = 0; j < z.length; j += 4) {
    if (Math.abs(z[j]-255) < 12 && Math.abs(z[j+1]-206) < 12 && Math.abs(z[j+2]-58) < 12) txt++;
  }

  // ② 彩带环 26 采样点命中
  var ring = 0, pts = [];
  for (var k = 0; k < 26; k++) {
    var a = k / 26 * Math.PI * 2;
    var px = Math.round(cx + Math.cos(a) * 250), py = Math.round(220 + Math.sin(a) * 105);
    if (px < 1 || py < 1 || px >= c.width - 1 || py >= c.height - 1) continue;
    var d = x.getImageData(px, py, 1, 1).data;
    var isY = Math.abs(d[0]-255) < 12 && Math.abs(d[1]-206) < 12 && Math.abs(d[2]-58) < 12;
    var isG = Math.abs(d[0]-126) < 22 && Math.abs(d[1]-224) < 22 && Math.abs(d[2]-106) < 22;
    if (isY || isG) { ring++; if (pts.length < 5) pts.push([px, py, d[0]+','+d[1]+','+d[2]]); }
  }

  return JSON.stringify({
    btnColorInRow384: btn,
    yellowTextInRow384: txt,
    ribbonHit: ring,
    ribbonPtsSample: pts,
    state: state, won: won, levelNo: levelNo,
    hasNext: !!(won && LEVELS[levelNo + 1]),
    canvas: [c.width, c.height],
    png: c.toDataURL('image/png')
  });
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

  let report = { meta: { html: HTML, png: PNG, date: new Date().toISOString().slice(0, 10) } };
  try {
    await send('Page.enable');
    await send('Page.navigate', { url: pathToFileURL(HTML).href + '?test=1&level=1' });
    await sleep(1600);
    report.setup = JSON.parse(await evalPage(SETUP));
    await sleep(600);                           // 若干真帧 → checkWave 判通关 → drawEnd 渲染
    const raw = JSON.parse(await evalPage(PROBE));
    const buf = Buffer.from(raw.png.split(',')[1], 'base64');
    delete raw.png;
    fs.writeFileSync(path.join(OUT, PNG), buf);
    report.probe = raw;
    report.pngBytes = buf.length;
    report.images = { png: PNG, bytes: buf.length };
  } catch (err) {
    report.error = String(err && err.message || err);
    console.error('FAIL  ' + report.error);
  } finally {
    try { ws.close(); } catch (_) {}
    try { e.kill(); } catch (_) {}
  }

  const p = report.probe || {};
  report.verdict = {
    '①按钮不压行384（按钮色 < 50）': typeof p.btnColorInRow384 === 'number' ? p.btnColorInRow384 < 50 : null,
    '②彩带环已除（命中 = 0）': p.ribbonHit === 0,
    '③黄字可见（> 0）': typeof p.yellowTextInRow384 === 'number' && p.yellowTextInRow384 > 0,
  };
  console.log('=== ui-end-verify ===');
  console.log('html        : ' + HTML);
  console.log('setup       : ' + JSON.stringify(report.setup || report.error));
  console.log('state/won   : ' + p.state + ' / ' + p.won + '  levelNo=' + p.levelNo + '  hasNext=' + p.hasNext);
  console.log('① 按钮色@行384 : ' + p.btnColorInRow384 + '   （改前 2601 / 改后 23）');
  console.log('② 彩带环命中   : ' + p.ribbonHit + '   （改前 26/26 / 改后 0）' + (p.ribbonPtsSample && p.ribbonPtsSample.length ? '  样本=' + JSON.stringify(p.ribbonPtsSample) : ''));
  console.log('③ 黄字@行384   : ' + p.yellowTextInRow384 + '   （改前 34 / 改后 168）');
  console.log('判据        : ' + JSON.stringify(report.verdict));
  console.log('产物        : ' + PNG + ' (' + (report.pngBytes || 0) + ' B)');

  // 追加式证据账本：同一源重复跑则覆盖该源记录（改前/改后两源并存可对比）
  const JR = path.join(OUT, 'ui-end-verify-results.json');
  let ledger = { task: '结算屏 UI 修复自证（v1.9.0 · 用户 2026-09-23 反馈）', runs: [] };
  try { const old = JSON.parse(fs.readFileSync(JR, 'utf8')); if (old && Array.isArray(old.runs)) ledger = old; } catch (_) {}
  const srcTag = /v180|v1\.8\.0/i.test(HTML) ? '旧源 v1.8.0（修前）' : '当前源码（修后）';
  ledger.runs = (ledger.runs || []).filter((r) => r.source !== srcTag);
  ledger.runs.push({
    source: srcTag, html: HTML, png: PNG, pngBytes: report.pngBytes || 0,
    probe: p, verdict: report.verdict, date: new Date().toISOString().slice(0, 16),
  });
  fs.writeFileSync(JR, JSON.stringify(ledger, null, 2));
  process.exit(report.error ? 1 : 0);
})();
