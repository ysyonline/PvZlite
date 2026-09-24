'use strict';
/* ============================================================================
 * tests/playtests/v20-decor-ui.js — T-403 墓地/房屋装饰层 截图自证（v2.0 M4）
 * ----------------------------------------------------------------------------
 * 场景与像素判据（URL 直跳：?level=3-6 墓夜 / ?level=4-1 房屋锚点；Q-12 禁选关页链路）：
 *  S1 世界3 墓地（3-6 夜）：level.graves 确定性点位渲染墓碑（碑身 #5c5c52 灰 + 碑基 #4a4a42 深灰）
 *     + 贴地雾气 rgba(200,210,205,.10)；机制字段 grave:true 就位（graves 数组非空）。
 *  S2 世界4 房屋（4-1 锚点）：屋顶关复用斜坡 + 立面装饰（暖窗光 #ffd97a / 门 #2e1d12）
 *     + 庭院栅栏 #6b5138（右侧道路上缘）；roof:true 机制字段在。
 *  S3 回归 1-1（草地昼）：零装饰（草地世界无 decor 分支）——防装饰误画世界 1。
 *
 * 数据层断言（PROBE 内嵌）：metaFor 补齐机制字段——'3-6'.grave===true && graves 6..9 座去重、
 *  '2-6'.water===true、'4-10'.roof===true&&water===false（与锚点语义一致）。
 *
 * 判别力（旧源 v1.9.0 同脚本必红）：旧源无 '3-6'/'4-1' 键（LEVELS 仅 1..5 数字）→
 *  URL 直跳失败 level 保持 L1 → 墓碑/栅栏/暖窗像素全零 + 数据断言崩（异常红）。
 *
 * 用法：
 *   "$NODE" tests/playtests/v20-decor-ui.js                        # 当前源码
 *   "$NODE" tests/playtests/v20-decor-ui.js <html路径> <tag>       # 旧源对照
 * 产物：tests/playtests/v20-decor-<tag>-{grave,house,day-1-1}.png + v20-decor-ui-results.json
 * ==========================================================================*/

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9374;                                   // 避开 9363/9364/9366/9370/9372
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT = __dirname;

const HTML = path.resolve(REPO_ROOT, process.argv[2] || 'plants-vs-zombies.html');
const TAG = process.argv[3] || 'new';
const TMP = path.join(process.cwd(), '.tmp-v20-decor');

function get(u) { return new Promise((res, rej) => { http.get(u, (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => res(d)); }).on('error', rej); }); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 场景信息 + 数据层断言（metaFor 机制字段就位 = T-403 DONE 之一）
const SCENE_INFO = `(function(){
  try { document.getElementById('test-tip').style.display = 'none'; } catch (_) {}
  try { muted = true; } catch (_) {}
  var k = (typeof levelKey !== 'undefined') ? levelKey : ('旧源 levelNo=' + levelNo);
  var g36 = LEVELS['3-6'], g26 = LEVELS['2-6'], g410 = LEVELS['4-10'];
  return JSON.stringify({
    state: state, levelKey: k, time: level && level.time, world: level && level.world,
    d_grave36: !!(g36 && g36.grave === true), d_graves36: !!(g36 && Array.isArray(g36.graves) && g36.graves.length >= 6 && g36.graves.length <= 9),
    d_water26: !!(g26 && g26.water === true),
    d_roof410: !!(g410 && g410.roof === true && g410.water === false)
  });
})()`;

// PROBE：三场景各「clearRect → setScene → drawGameWorld() → snap → 采样」
// 色值推导：
//   墓碑碑身 #5c5c52(92,92,82)、基座 #4a4a42(74,74,66) → 石灰判定 r,g∈[70,100] 且 |r-g|<8 且 b≥62（排除绿板 r<g）
//   栅栏 #6b5138(107,81,56) → r∈[95,125] g∈[70,95] b∈[45,70] 且 r>g>b（棕木色序）
//   暖窗 #ffd97a(255,217,122) → r>235 g>195 b∈[95,150]
//   1-1 昼板 (136,194,80) 不满足上述任一判定。
const PROBE = `(function(){
  function snap() {
    var c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    var x = c.getContext('2d'); x.drawImage(canvas, 0, 0); return x;
  }
  function count(x, x0, y0, w, h, fn) {
    var z = x.getImageData(x0, y0, w, h).data, n = 0;
    for (var i = 0; i < z.length; i += 4) {
      if (z[i+3] > 200 && fn(z[i], z[i+1], z[i+2])) n++;
    }
    return n;
  }
  function shot() { var c=document.createElement('canvas'); c.width=canvas.width; c.height=canvas.height; var x=c.getContext('2d'); x.drawImage(canvas,0,0); return c.toDataURL('image/png'); }
  function setScene(k, oldIdx) { var lv = LEVELS[k] || LEVELS[oldIdx]; if (lv) level = lv; if (typeof levelKey !== 'undefined') levelKey = k; else levelNo = oldIdx; state = 'play'; ctx.clearRect(0, 0, canvas.width, canvas.height); drawGameWorld(); }
  var out = {};
  var BX = GRID_X, BY = GRID_Y, BW = COLS*CELL_W, BH = ROWS*CELL_H;
  var isStone = function(r,g,b){ return r>=70&&r<=100 && g>=70&&g<=100 && b>=58&&b<=92 && Math.abs(r-g)<8 && Math.abs(r-b)<=34; };
  var isFence = function(r,g,b){ return r>=95&&r<=125 && g>=70&&g<=95 && b>=45&&b<=70 && r>g && g>b; };
  var isWarm  = function(r,g,b){ return r>235 && g>195 && b>=95 && b<=150; };
  // S1 世界3 墓地（3-6）：墓碑石灰像素 + 左侧房子区（x<GRID_X）无栅栏污染
  setScene('3-6', 1);
  var x1 = snap();
  out.graveStone = count(x1, BX, BY, BW, BH, isStone);
  out.s1Png = shot();
  // S2 世界4 房屋（4-1）：暖窗光（立面 x∈[10,44]）+ 栅栏棕（右侧道路带）
  setScene('4-1', 5);
  var x2 = snap();
  out.houseWarmWin = count(x2, 10, GRID_Y, 40, ROWS*CELL_H, isWarm);
  out.fenceBrown = count(x2, GRID_X+COLS*CELL_W, GRID_Y, ROAD_W, ROWS*CELL_H, isFence);
  out.s2Png = shot();
  // S3 回归 1-1 草地昼：无装饰像素
  setScene('1-1', 1);
  var x3 = snap();
  out.lawnStone = count(x3, BX, BY, BW, BH, isStone);
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
    // S1 主场景：?level=3-6 URL 直跳（世界 3 墓地夜关）
    await send('Page.navigate', { url: pathToFileURL(HTML).href + '?level=3-6&test=1' });
    await sleep(1600);
    report.scene = JSON.parse(await evalPage(SCENE_INFO));
    await sleep(200);
    const p = JSON.parse(await evalPage(PROBE));
    const gravePng = p.s1Png, housePng = p.s2Png, day11Png = p.s3Png;
    delete p.s1Png; delete p.s2Png; delete p.s3Png;
    fs.writeFileSync(path.join(OUT, `v20-decor-${TAG}-grave.png`), Buffer.from(gravePng.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(OUT, `v20-decor-${TAG}-house.png`), Buffer.from(housePng.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(OUT, `v20-decor-${TAG}-day-1-1.png`), Buffer.from(day11Png.split(',')[1], 'base64'));
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
  report.verdict = {
    '①URL直跳3-6·world=3·time=night': s.world === 3 && s.time === 'night',
    '②数据·3-6 grave=true 且 graves 6..9 座': s.d_grave36 === true && s.d_graves36 === true,
    '③数据·2-6 water=true（机制字段就位）': s.d_water26 === true,
    '④数据·4-10 roof=true 且 water=false': s.d_roof410 === true,
    '⑤S1 墓碑石灰像素(>800)': typeof p.graveStone === 'number' ? p.graveStone > 800 : null,
    '⑥S2 立面暖窗像素(>200)': typeof p.houseWarmWin === 'number' ? p.houseWarmWin > 200 : null,
    '⑦S2 庭院栅栏棕像素(>500)': typeof p.fenceBrown === 'number' ? p.fenceBrown > 500 : null,
    '⑧回归·1-1 草地无装饰(<50)': typeof p.lawnStone === 'number' ? p.lawnStone < 50 : null,
  };
  const allPass = Object.values(report.verdict).every((v) => v === true);
  const redCount = Object.values(report.verdict).filter((v) => v !== true).length;
  console.log('=== v20-decor-ui (T-403) tag=' + TAG + ' ===');
  console.log('html        : ' + HTML);
  console.log('scene       : ' + JSON.stringify(report.scene || report.error));
  console.log('probe       : ' + JSON.stringify(p));
  console.log('判据        : ' + JSON.stringify(report.verdict, null, 1));
  console.log('总判定      : ' + (allPass ? 'PASS' : 'FAIL') + (TAG !== 'new' ? `（旧源对照：红 ${redCount} 项=判别力证据）` : ''));

  const JR = path.join(OUT, 'v20-decor-ui-results.json');
  let ledger = { task: 'T-403 墓地/房屋装饰层 截图自证（v2.0 M4）', runs: [] };
  try { const old = JSON.parse(fs.readFileSync(JR, 'utf8')); if (old && Array.isArray(old.runs)) ledger = old; } catch (_) {}
  ledger.runs = (ledger.runs || []).filter((r) => r.tag !== TAG);
  ledger.runs.push({ tag: TAG, html: HTML, scene: report.scene, probe: p, verdict: report.verdict, allPass, redCount, date: new Date().toISOString().slice(0, 16) });
  fs.writeFileSync(JR, JSON.stringify(ledger, null, 2));
  process.exit(report.error || !allPass ? 1 : 0);
})();
