/* v233-w4-open-ui · v2.3.3 世界 4 后 9 关开放真机验收（Edge CDP，仿 v232-w2-open-ui 通路）
 * 用法：node tests/playtests/v233-w4-open-ui.js [html路径] [tag]
 *   （argv[2] 传旧源副本 → 判别力复跑，必须红）
 * 断言：
 *   S1 '4-2' 金币关首通（普通模式）：coin=100 / cleared+=4-2 / unlocked→'4-3' / 无 PLACEHOLDER 泄漏 + 截图
 *   S2 配置表+物化结构：CARD_AWARD 4-2..4-10 全 100、4-1 仍发花盆；LEVELS['4-2'] 昼段/屋顶/9 波/无墓碑无猫王
 *   S3 '4-10' 末关：worldClear=300 + 金币 100 同发 → total=400 + 截图
 * 判别力：旧源（'4-2'/'4-10'='PLACEHOLDER'）S1 coin=0 / S3 coin=0 / S2 coins=false → 必红
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9379;                                   // 避开既有 9376/9377/9378 等
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT = __dirname;

const HTML = path.resolve(REPO_ROOT, process.argv[2] || 'plants-vs-zombies.html');
const TAG = process.argv[3] || 'new';
const TMP = path.join(process.cwd(), '.tmp-v233-w4open');

const get = (u) => new Promise((res, rej) => { http.get(u, (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => res(d)); }).on('error', rej); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 通用通关注入：直跳 key → 强推通关 → 读结算/进度/奖励
function winExpr(key, preCleared) {
  return `(function(){
  try {
    muted = true;
    if (typeof saveCleared === 'undefined') { saveCleared = []; }
    if (typeof unlocked === 'undefined') { unlocked = '1-1'; }
    ${preCleared ? `saveCleared = ${JSON.stringify(preCleared)};` : ''}
    level = LEVELS['${key}'];
    levelKey = '${key}';
    startGame('V233-${key}');
    wave = level.totalWaves; waveActive = false; spawnQueue.length = 0; zombies.length = 0;
    var clearedBefore = saveCleared.slice();
    update(0.05);
    var st = { k: levelKey, state: state, won: won, cleared: saveCleared.slice(), unlocked: unlocked,
      toastMsg: String(toastMsg || ''), toastT: toastT,
      endStats: endStats ? { run: endStats.run, clear: endStats.clear, coin: endStats.coin, total: endStats.total } : null };
    if (state === 'end' && typeof drawEnd === 'function') drawEnd();
    var c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
    var x = c.getContext('2d'); x.drawImage(canvas, 0, 0); st.png = c.toDataURL('image/png');
    return JSON.stringify(st);
  } catch (e) { return JSON.stringify({ err: String(e) }); }
})()`;
}

// S2：表契约 + 物化结构（只读，不改局内态）
const S2_STRUCT = `(function(){
  try {
    var CA = SLOT_CONFIG.CARD_AWARD;
    var w4keys = ['4-2','4-3','4-4','4-5','4-6','4-7','4-8','4-9','4-10'];
    var coins = w4keys.every(function(k){ return typeof CA[k] === 'number' && CA[k] === 100; });
    var lv = LEVELS['4-2'];
    var lv10 = LEVELS['4-10'];
    return JSON.stringify({
      coins: coins, aw42: CA['4-2'], aw410: CA['4-10'], aw41: CA['4-1'],
      lv42: lv ? { world: lv.world, time: lv.time, totalWaves: lv.totalWaves,
                   roof: !!lv.roof, water: !!lv.water,
                   graves: lv.graves ? lv.graves.length : 0,
                   elvisWaves: lv.waves.filter(function(w){ return w.elvisGrave; }).length } : null,
      lv410: lv10 ? { time: lv10.time, totalWaves: lv10.totalWaves } : null
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
    // S1：?level=4-2 直跳（普通模式，金币首通判据）
    await send('Page.navigate', { url: pathToFileURL(HTML).href + '?level=4-2' });
    await sleep(1600);
    report.s1 = JSON.parse(await evalPage(winExpr('4-2')));
    if (report.s1.png) { savePng(`v233-w4open-${TAG}-s1-42.png`, report.s1.png); delete report.s1.png; }
    // S2：表契约 + 结构（同页只读）
    report.s2 = JSON.parse(await evalPage(S2_STRUCT));
    // S3：?level=4-10 直跳（末关 worldClear+金币同发；注入 4-1..4-9 满前置——worldClear 判据=通关前恰 9 键）
    await send('Page.navigate', { url: pathToFileURL(HTML).href + '?level=4-10' });
    await sleep(1600);
    report.s3 = JSON.parse(await evalPage(winExpr('4-10', ['4-1','4-2','4-3','4-4','4-5','4-6','4-7','4-8','4-9'])));
    if (report.s3.png) { savePng(`v233-w4open-${TAG}-s3-410.png`, report.s3.png); delete report.s3.png; }
  } catch (err) {
    report.error = String(err && err.message || err);
    console.error('FAIL  ' + report.error);
  } finally {
    try { ws.close(); } catch (_) {}
    try { e.kill(); } catch (_) {}
  }

  const s1 = report.s1 || {}, s2 = report.s2 || {}, s3 = report.s3 || {};
  const has = (arr, k) => Array.isArray(arr) && arr.indexOf(k) >= 0;
  report.verdict = {
    '①4-2金币首通：coin=100·total=100·通关': !!s1.won && s1.endStats && s1.endStats.coin === 100 && s1.endStats.total === 100,
    '②4-2推进：cleared+=4-2·unlocked→4-3·无PLACEHOLDER泄漏': has(s1.cleared, '4-2') && s1.unlocked === '4-3' && s1.toastMsg.indexOf('PLACEHOLDER') < 0,
    '③表契约：4-2..4-10全100·4-1仍发花盆': s2.coins === true && s2.aw41 === 'planter',
    '④4-2物化：昼段·9波·屋顶·无墓碑·无猫王波': !!s2.lv42 && s2.lv42.world === 4 && s2.lv42.time === 'day'
      && s2.lv42.totalWaves === 9 && s2.lv42.roof === true && s2.lv42.graves === 0 && s2.lv42.elvisWaves === 0,
    '⑤4-10末关：worldClear=300+金币100同发·total=400': !!s3.won && s3.endStats && s3.endStats.clear === 300 && s3.endStats.coin === 100 && s3.endStats.total === 400,
  };
  const allPass = Object.values(report.verdict).every((v) => v === true);
  console.log('=== v233-w4-open-ui tag=' + TAG + ' ===');
  console.log('html    : ' + HTML);
  console.log('s1      : ' + JSON.stringify(report.s1));
  console.log('s2      : ' + JSON.stringify(report.s2));
  console.log('s3      : ' + JSON.stringify(report.s3));
  for (const k of Object.keys(report.verdict)) console.log((report.verdict[k] ? '  ✅ ' : '  ❌ ') + k);
  console.log(allPass ? '判定: PASS（全绿）' : '判定: FAIL（' + Object.values(report.verdict).filter((v) => v !== true).length + ' 红）');
  fs.writeFileSync(path.join(OUT, `v233-w4open-${TAG}-results.json`), JSON.stringify(report, null, 2));
  process.exit(allPass ? 0 : 1);
})();
