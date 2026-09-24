'use strict';
/* ============================================================================
 * tests/playtests/v20-reward-ui.js — T-404 奖励端到端联调 真机自证（v2.0 M4）
 * ----------------------------------------------------------------------------
 * 真机（CDP headless Edge）非 test 模式端到端——奖励链路全状态断言：
 *  S1 ★通关 1-1 发卡链：startGame → 强制通关判定态 → update 触发 win 分支
 *     → CARD_AWARD['1-1']='double' 入 ownedCards + toast「解锁新卡」+ settleRun
 *     → saveCleared 含 '1-1' / unlocked 推 '1-2' / pvz_progress_v2 落档回读一致；
 *     结算 endStats.total === run+clear。截图 end 屏存档。
 *  S2 幂等重通：再进再胜 → 卡不重复发（ownedCards 数量不变）+ toastT===0。
 *  S3 ★占位关跳过链：?level=1-7 URL 直跳（Q-12 占位关唯一进入通路）→ 通关
 *     → CARD_AWARD['1-7']==='PLACEHOLDER' 显式短路：不发卡、无 toast（无字面量
 *      'PLACEHOLDER' 泄漏）、无崩溃；进度照常推进 cleared+=1-7 / unlocked→'1-8'。
 *     本场景顺带验证 S1 落档 → 本页 boot 回读 的持久化往返。
 *  S4 波次锚点预排结构（boot 物化后 LEVELS 实测，非源码静态）：
 *     1-1 未改（5 波/首波 normal×1/末波 big）；1-2 旧 L2 锚（6 波/24 僵/fast 共 4/
 *     大波 2/startSun 150）；1-6 旧 L3 锚（7 波/33 僵/15·8·8·2/night/startSun 100）。
 *
 * 判别力（旧源 v1.9.0 冻结副本同脚本复跑必红）：
 *  - 旧源 LEVELS 数字键 → LEVELS['1-1']/'1-2'/'1-6'/'1-7' 全 undefined → S3/S4 全红；
 *  - 旧源无 pvz_progress_v2 键（写 pvz_unlocked）→ ②⑤ 落档判据红；
 *  - 旧源 ?level=1-7 非法被拒 → 页面键 'no:1' ≠ '1-7' → ④ 红。
 *
 * 用法：
 *   "$NODE" tests/playtests/v20-reward-ui.js                        # 当前源码
 *   "$NODE" tests/playtests/v20-reward-ui.js <html路径> <tag>       # 旧源对照
 * 产物：tests/playtests/v20-reward-<tag>-{s1-win,s2-placeholder}.png
 *      + v20-reward-ui-results.json
 * ==========================================================================*/

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9376;                                   // 避开 9363/9364/9366/9370/9372/9374
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT = __dirname;

const HTML = path.resolve(REPO_ROOT, process.argv[2] || 'plants-vs-zombies.html');
const TAG = process.argv[3] || 'new';
const TMP = path.join(process.cwd(), '.tmp-v20-reward');

function get(u) { return new Promise((res, rej) => { http.get(u, (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => res(d)); }).on('error', rej); }); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// S1：非 test 模式（test=1 卡池全开会吞发卡——发卡判据必须在普通模式下跑）。
// ★旧源兼容 shim（v1.9.0 无 saveCleared/unlocked/pvz_progress_v2，用 clears/unlockedLevel/pvz_unlocked）：
//   注入 saveCleared 数组 + unlocked 串，让旧源流程能跑通，在「业务语义」上红（而非异常红）。
//   旧源 CARD_AWARD 数字键 {1:'double',...} → ?level=1-1 通关发 double（① 部分绿），
//   但 cleared/unlocked/pvz_progress_v2 全缺 → ②③④⑤ 语义红；⑥⑦⑧ LEVELS['1-1'] 等 undefined → 红。
const S1_WIN = `(function(){
  try {
    muted = true;
    if (typeof saveCleared === 'undefined') { saveCleared = []; }
    if (typeof unlocked === 'undefined') { unlocked = '1-' + (typeof unlockedLevel !== 'undefined' ? unlockedLevel : 1); }
    if (typeof levelKey !== 'undefined') { levelKey = '1-1'; } else { levelNo = 1; }
    level = LEVELS['1-1'] || LEVELS[1];
    startGame('T404-S1');
    wave = level.totalWaves; waveActive = false; spawnQueue.length = 0; zombies.length = 0;
    var before = ownedCards.length; var had = ownedCards.indexOf('double') >= 0;
    update(0.016);
    var ls = null;
    try { var s = localStorage.getItem('pvz_progress_v2'); ls = s ? JSON.parse(s) : null; } catch (e) { ls = 'ERR'; }
    var st = { state: state, won: won, before: before, after: ownedCards.length, added: (!had && ownedCards.length === before + 1 && ownedCards.indexOf('double') >= 0),
      toastMsg: toastMsg, toastT: toastT, cleared: saveCleared.slice(), unlocked: unlocked,
      endStats: { run: endStats.run, clear: endStats.clear, total: endStats.total }, ls: ls };
    if (state === 'end' && typeof drawEnd === 'function') drawEnd();
    var c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
    var x = c.getContext('2d'); x.drawImage(canvas, 0, 0); st.png = c.toDataURL('image/png');
    return JSON.stringify(st);
  } catch (e) { return JSON.stringify({ err: String(e) }); }
})()`;

// S2：幂等重通——不换页直接再进再胜（档已有 '1-1' + 卡已拥有）。
const S2_IDEMPOTENT = `(function(){
  try {
    if (typeof saveCleared === 'undefined') { saveCleared = []; }
    if (typeof unlocked === 'undefined') { unlocked = '1-' + (typeof unlockedLevel !== 'undefined' ? unlockedLevel : 1); }
    startGame('T404-S1b');
    var n0 = ownedCards.length;
    wave = level.totalWaves; waveActive = false; spawnQueue.length = 0; zombies.length = 0;
    update(0.016);
    return JSON.stringify({ state: state, won: won, n0: n0, n1: ownedCards.length, toastT: toastT, cleared: saveCleared.slice() });
  } catch (e) { return JSON.stringify({ err: String(e) }); }
})()`;

// S3：?level=1-7 直跳（新导航导航由脚本外层 Page.navigate 完成）→ 通关 → PLACEHOLDER 短路。
const S3_PLACEHOLDER = `(function(){
  try {
    muted = true;
    if (typeof saveCleared === 'undefined') { saveCleared = []; }
    if (typeof unlocked === 'undefined') { unlocked = '1-' + (typeof unlockedLevel !== 'undefined' ? unlockedLevel : 1); }
    var k = (typeof levelKey !== 'undefined') ? levelKey : ('no:' + levelNo);
    startGame('T404-S3');
    var n0 = ownedCards.length;
    wave = level.totalWaves; waveActive = false; spawnQueue.length = 0; zombies.length = 0;
    update(0.016);
    var ls = null;
    try { var s = localStorage.getItem('pvz_progress_v2'); ls = s ? JSON.parse(s) : null; } catch (e) { ls = 'ERR'; }
    var st = { k: k, state: state, won: won, n0: n0, n1: ownedCards.length, toastT: toastT, toastMsg: toastMsg,
      cleared: saveCleared.slice(), unlocked: unlocked, aw7: (typeof SLOT_CONFIG !== 'undefined' && SLOT_CONFIG.CARD_AWARD) ? (SLOT_CONFIG.CARD_AWARD['3-1'] || null) : null, ls: ls };
    if (state === 'end' && typeof drawEnd === 'function') drawEnd();
    var c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
    var x = c.getContext('2d'); x.drawImage(canvas, 0, 0); st.png = c.toDataURL('image/png');
    return JSON.stringify(st);
  } catch (e) { return JSON.stringify({ err: String(e) }); }
})()`;

// S4：boot 物化后 LEVELS 实测——锚点波次结构（1-1 未改 / 1-2 旧 L2 锚 / 1-6 旧 L3 锚）。
const S4_STRUCTURE = `(function(){
  try {
    function comp(lv) { if (!lv || !lv.waves) return null; var n = {}, t = 0;
      for (var i = 0; i < lv.waves.length; i++) { var w = lv.waves[i];
        for (var j = 0; j < w.spawns.length; j++) { var s = w.spawns[j]; n[s[0]] = (n[s[0]] || 0) + s[1]; t += s[1]; } }
      return { n: n, t: t }; }
    var a = LEVELS['1-1'], b = LEVELS['1-2'], c = LEVELS['1-6'];
    return JSON.stringify({
      a: a ? { totalWaves: a.totalWaves, len: a.waves.length, startSun: a.startSun,
               first: a.waves[0] && a.waves[0].spawns, lastBig: !!a.waves[a.waves.length - 1].big } : null,
      b: b ? { world: b.world, totalWaves: b.totalWaves, startSun: b.startSun, comp: comp(b),
               big: b.waves.filter(function (w) { return w.big; }).length } : null,
      c: c ? { world: c.world, time: c.time, night: !!c.night, totalWaves: c.totalWaves, startSun: c.startSun, comp: comp(c) } : null
    });
  } catch (e) { return JSON.stringify({ err: String(e) }); }
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
  const savePng = (name, dataUrl) => fs.writeFileSync(path.join(OUT, name), Buffer.from(dataUrl.split(',')[1], 'base64'));
  try {
    await send('Page.enable');
    // ★S1 通路：?level=1-1 直跳 + 无 test 参数（发卡判据必须普通模式）
    await send('Page.navigate', { url: pathToFileURL(HTML).href + '?level=1-1' });
    await sleep(1600);
    report.s1 = JSON.parse(await evalPage(S1_WIN));
    if (report.s1.png) { savePng(`v20-reward-${TAG}-s1-win.png`, report.s1.png); delete report.s1.png; }
    report.s2 = JSON.parse(await evalPage(S2_IDEMPOTENT));
    // ★S3 通路：?level=3-1 直跳（v2.1 T-205 迁移：1-7 已金币化可玩，恒占位钉世界 3；同 profile——顺带验证 S1 落档 → boot 回读往返）
    await send('Page.navigate', { url: pathToFileURL(HTML).href + '?level=3-1' });
    await sleep(1600);
    report.s3 = JSON.parse(await evalPage(S3_PLACEHOLDER));
    if (report.s3.png) { savePng(`v20-reward-${TAG}-s2-placeholder.png`, report.s3.png); delete report.s3.png; }
    report.s4 = JSON.parse(await evalPage(S4_STRUCTURE));
  } catch (err) {
    report.error = String(err && err.message || err);
    console.error('FAIL  ' + report.error);
  } finally {
    try { ws.close(); } catch (_) {}
    try { e.kill(); } catch (_) {}
  }

  const s1 = report.s1 || {}, s2 = report.s2 || {}, s3 = report.s3 || {}, s4 = report.s4 || {};
  const has = (arr, k) => Array.isArray(arr) && arr.indexOf(k) >= 0;
  const lsOk = (ls, key, next) => ls && ls !== 'ERR' && ls.v === 2 && has(ls.cleared, key) && ls.unlocked === next;
  report.verdict = {
    '①通关1-1发卡：double入卡+toast解锁新卡+endStats自洽': !!s1.won && s1.added === true && String(s1.toastMsg || '').indexOf('解锁新卡') >= 0 && s1.toastT > 0
      && s1.endStats && s1.endStats.total === s1.endStats.run + s1.endStats.clear,
    '②通关1-1落档：cleared+=1-1·unlocked→1-2·pvz_progress_v2回读一致': has(s1.cleared, '1-1') && s1.unlocked === '1-2' && lsOk(s1.ls, '1-1', '1-2'),
    '③幂等重通：卡不重复发且无新toast': !!s2.won && s2.n0 === s2.n1 && s2.toastT === 0 && has(s2.cleared, '1-1') && (s2.cleared || []).filter((k) => k === '1-1').length === 1,
    '④占位关3-1：PLACEHOLDER短路不发卡无toast无字面量': s3.k === '3-1' && !!s3.won && s3.n0 === s3.n1 && s3.toastT === 0 && String(s3.toastMsg || '').indexOf('PLACEHOLDER') < 0 && s3.aw7 === 'PLACEHOLDER',
    '⑤占位关3-1推进：cleared+=3-1·unlocked→3-2·落档回读(含1-1往返)': has(s3.cleared, '3-1') && s3.unlocked === '3-2' && lsOk(s3.ls, '3-1', '3-2') && s3.ls && has(s3.ls.cleared, '1-1'),
    '⑥锚点1-1未改：5波·首波normal×1·末波big·startSun150': !!s4.a && s4.a.totalWaves === 5 && s4.a.len === 5 && s4.a.startSun === 150
      && JSON.stringify(s4.a.first) === JSON.stringify([['normal', 1]]) && s4.a.lastBig === true,
    '⑦锚点1-2预排(旧L2)：6波·24僵·normal15/fast5/cone4·大波2·startSun150': !!s4.b && s4.b.world === 1 && s4.b.totalWaves === 6 && s4.b.startSun === 150
      && s4.b.comp && s4.b.comp.t === 24 && s4.b.comp.n.normal === 15 && s4.b.comp.n.fast === 5 && s4.b.comp.n.cone === 4 && s4.b.big === 2,
    '⑧锚点1-6预排(旧L3)：7波·33僵·15/8/8/2·night·startSun100': !!s4.c && s4.c.world === 1 && s4.c.time === 'night' && s4.c.night === true
      && s4.c.totalWaves === 7 && s4.c.startSun === 100 && s4.c.comp && s4.c.comp.t === 33
      && s4.c.comp.n.normal === 15 && s4.c.comp.n.cone === 8 && s4.c.comp.n.fast === 8 && s4.c.comp.n.bucket === 2,
  };
  const allPass = Object.values(report.verdict).every((v) => v === true);
  const redCount = Object.values(report.verdict).filter((v) => v !== true).length;
  console.log('=== v20-reward-ui (T-404) tag=' + TAG + ' ===');
  console.log('html        : ' + HTML);
  console.log('s1          : ' + JSON.stringify(report.s1 || report.error));
  console.log('s2          : ' + JSON.stringify(report.s2));
  console.log('s3          : ' + JSON.stringify(report.s3));
  console.log('s4          : ' + JSON.stringify(report.s4));
  console.log('判据        : ' + JSON.stringify(report.verdict, null, 1));
  console.log('总判定      : ' + (allPass ? 'PASS' : 'FAIL') + (TAG !== 'new' ? `（旧源对照：红 ${redCount} 项=判别力证据）` : ''));

  const JR = path.join(OUT, 'v20-reward-ui-results.json');
  let ledger = { task: 'T-404 奖励端到端联调 真机自证（v2.0 M4）', runs: [] };
  try { const old = JSON.parse(fs.readFileSync(JR, 'utf8')); if (old && Array.isArray(old.runs)) ledger = old; } catch (_) {}
  ledger.runs = (ledger.runs || []).filter((r) => r.tag !== TAG);
  ledger.runs.push({ tag: TAG, html: HTML, s1: report.s1, s2: report.s2, s3: report.s3, s4: report.s4, verdict: report.verdict, allPass, redCount, date: new Date().toISOString().slice(0, 16) });
  fs.writeFileSync(JR, JSON.stringify(ledger, null, 2));
  process.exit(report.error || !allPass ? 1 : 0);
})();
