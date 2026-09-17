/* E5 + N4 发布后复核运行器（Edge headless + CDP，零依赖，Node ≥22）
 * 口径：
 *  - E5：Edge 最新稳定版（Blink 引擎真浏览器事件路径）跑一局——
 *    菜单选关 L3 → 地狱 → 开始 → 4× → 真实点击种植 → 强推末波 W7 → 败局收尾。
 *    验证：状态机迁移、零 console error、零帧异常（frameErrT）、截图非空白。
 *  - N4：S1 末波实测 + S2 对齐 bench 场景 C（12 植物 + 25 僵尸含 2 bucket + 3 阳光，
 *    hp×3 受控失真与 bench 一致）4× 采样。量化 = rAF 帧间隔分布（p50/p95/max/jank）
 *    + CDP Performance.getMetrics 增量（ScriptDuration/帧）。
 *  - 局限（随报告披露）：headless 软件光栅（--disable-gpu），GPU/合成路径 ≠ 真机可视；
 *    BeginFrame 60Hz 虚拟 vsync；主机 CPU（i3-10110U）为真机口径。
 */
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const PORT = 9333;
const BASE_URL = 'http://127.0.0.1:8931/plants-vs-zombies.html';
const OUT_JSON = path.resolve('.tmp/e5n4-results.json');
const SHOT_S1 = path.resolve('.tmp/e5-s1-finalwave.png');
const SHOT_S2 = path.resolve('.tmp/e5-s2-sceneC.png');
const REAL_WINDOW_MS = 8000;   // 每场景真实采样时长
const SAMPLE_WAIT_MS = 500;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitDevtools() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return await r.json();
    } catch (e) { /* not up yet */ }
    await sleep(500);
  }
  throw new Error('CDP 端口 10s 内未就绪');
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.events = []; 
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.data||''})`));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('CDP 超时: ' + method)); }
      }, 30000);
    });
  }
  async waitEvent(method, timeoutMs = 15000) {
    const t0 = Date.now();
    let from = this.events.length - 1;
    while (Date.now() - t0 < timeoutMs) {
      const found = this.events.slice(from + 1).find(e => e.method === method);
      if (found) return found;
      await sleep(100);
    }
    return null; // 不阻塞主流程
  }
  consoleErrors() {
    const errs = [];
    for (const e of this.events) {
      if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') {
        errs.push(e.params.args.map(a => a.value ?? a.description ?? a.type).join(' '));
      }
      if (e.method === 'Runtime.exceptionThrown') {
        const d = e.params.exceptionDetails;
        errs.push('EXCEPTION: ' + (d.exception?.description || d.text));
      }
    }
    return errs;
  }
}

async function evaluate(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('evaluate 失败: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}

const clickJs = (gx, gy) => `(function(){
  const c = document.getElementById('canvas');
  const r = c.getBoundingClientRect();
  return { left: r.left + ${gx} * r.width / 1000, top: r.top + ${gy} * r.height / 680 };
})()`;

async function canvasClick(cdp, gx, gy) {
  const pt = await evaluate(cdp, clickJs(gx, gy));
  const x = Math.round(pt.left), y = Math.round(pt.top);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(120);
}

async function domClick(cdp, sel) {
  const pt = await evaluate(cdp, `(function(){
    const el = document.querySelector('${sel}');
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
  })()`);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y, button: 'none' });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
  await sleep(120);
}

async function navigate(cdp, url) {
  await cdp.send('Page.navigate', { url });
  await cdp.waitEvent('Page.loadEventFired', 15000);
  await sleep(700);
}

// 页内帧采样器：挂独立 rAF 钩子记录帧间隔
const SAMPLER = `(function(){
  const frames = [];
  let last = performance.now(), on = true;
  function hook(t){ if(!on) return; frames.push(+(t - last).toFixed(2)); last = t; requestAnimationFrame(hook); }
  requestAnimationFrame(hook);
  window.__stopSample = () => { on = false; return frames; };
  return true;
})()`;

async function startSample(cdp) {
  await evaluate(cdp, SAMPLER);
  return cdp.send('Performance.getMetrics');
}
async function stopSample(cdp, label, metricsBefore) {
  const frames = await evaluate(cdp, 'window.__stopSample()');
  const metricsAfter = await cdp.send('Performance.getMetrics');
  const pick = (ms, n) => ms.find(m => m.name === n)?.value ?? 0;
  const scriptMs = pick(metricsAfter.metrics, 'ScriptDuration') - pick(metricsBefore.metrics, 'ScriptDuration');
  const taskMs = pick(metricsAfter.metrics, 'TaskDuration') - pick(metricsBefore.metrics, 'TaskDuration');
  const heap = pick(metricsAfter.metrics, 'JSHeapUsedSize');
  const arr = frames.slice(1); // 首帧 delta 噪声
  const sorted = [...arr].sort((a, b) => a - b);
  const q = p => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0;
  const jank = arr.filter(d => d > 20).length;
  return {
    label, frames: arr.length,
    p50: q(0.5), p95: q(0.95), p99: q(0.99), max: sorted[sorted.length - 1] ?? 0,
    mean: +(arr.reduce((s, d) => s + d, 0) / (arr.length || 1)).toFixed(2),
    jankOver20ms: jank, jankPct: +(100 * jank / (arr.length || 1)).toFixed(2),
    scriptMsTotal: +scriptMs.toFixed(1), scriptMsPerFrame: +(scriptMs * 1000 / (arr.length || 1)).toFixed(3),
    taskMsTotal: +taskMs.toFixed(1), heapMB: +(heap / 1048576).toFixed(1),
  };
}

async function screenshot(cdp, file) {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
}

// S2 注入（对齐 bench.js setupC：12 植物 + 25 僵尸 hp×3 + 3 阳光，expert 4×，wave=99 冻结波次推进）
const INJECT_S2 = `(function(){
  DIFF = 'expert';
  level = LEVELS[3]; levelNo = 3;
  startGame('S2-stress');
  gameSpeed = 4;
  wave = 99; lastWaveT = gt;   // 冻结波次推进：采样窗内无新波/预警/通关判定
  const DUR = { sunflower:600, pea:750, mine:300, nut:3000, double:750, melon:900 };
  const armT = 8;
  const plants12 = [
    ['sunflower',0,0],['sunflower',1,1],
    ['pea',0,2],['pea',1,2],['pea',2,3],['pea',3,4],
    ['double',2,0],['double',3,1],
    ['melon',1,3],['melon',2,4],
    ['nut',4,2],['mine',0,4]];
  for (const [type,col,row] of plants12) {
    plants.push({ col, row, type, cd:0, sunT: type==='sunflower'?7:0, armT,
      dur: DUR[type], maxDur: DUR[type], plantT:620, plantFrom:{x:0,y:0}, plantDone:true });
  }
  const M = 1.8 * 3;   // expert 1.8 × hp 失真 3（对齐 bench 口径）
  const STATS = { normal:[180,16], cone:[340,15], fast:[140,45], bucket:[560,12] };
  const rows = [
    ['normal','normal','cone','fast','normal'],
    ['cone','fast','normal','cone','fast'],
    ['normal','cone','bucket','normal','fast'],
    ['fast','normal','cone','fast','normal'],
    ['normal','cone','fast','bucket','normal']];
  const xs = [560,620,680,740,845];
  rows.forEach((zr,row) => zr.forEach((t,i) => {
    const st = STATS[t];
    zombies.push({ type:t, row, hp:st[0]*M, maxHp:st[0]*M, spd:0, x:xs[i],
      eating:false, eatAnim:0, walk:0, dead:false });
  }));
  for (let i=0;i<3;i++) effects.push({ kind:'sun', x:150+i*260, y:180, targetY:260+i*40,
    fall:22, value:25, t:0, stayT:0, dead:false });
  return { plants: plants.length, zombies: zombies.length, suns: effects.filter(e=>e.kind==='sun').length,
    diff: DIFF, speed: gameSpeed, levelNo };
})()`;

// S1 末波强推：wave→7（真实波次内容 8 只，hp×3 防中途清场），真实状态机照常跑
const FORCE_W7 = `(function(){
  wave = 6; lastWaveT = gt;
  newWave(7);
  for (const z of zombies) { z.hp *= 3; z.maxHp *= 3; }
  return { wave, queue: spawnQueue.length, zombies: zombies.length };
})()`;

async function main() {
  await waitDevtools();
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = list.find(t => t.type === 'page');
  if (!page) throw new Error('无 page target');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const cdp = new CDP(ws);
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Performance.enable');

  const results = { startedAt: new Date().toISOString(), edge: (await waitDevtools()).Browser, scenarios: {} };

  // ================= S1 · E5 功能验证 + N4 末波实测 =================
  await navigate(cdp, BASE_URL + '?level=3');   // ?level=3 提升解锁，菜单真实点击 L3 仍走选中路径
  results.s1_version = await evaluate(cdp, 'VERSION');
  results.s1_state_initial = await evaluate(cdp, 'state');

  await canvasClick(cdp, 660, 275);   // L3 按钮（bx=590,by=254,140×42 中心）
  results.s1_afterL3Click_levelNo = await evaluate(cdp, 'levelNo');
  await canvasClick(cdp, 640, 368);   // 地狱（bx=570,by=348 中心）
  results.s1_afterDiffClick_DIFF = await evaluate(cdp, 'DIFF');
  await canvasClick(cdp, 500, 510);   // 开始游戏（390-610, 480-540 中心）
  await sleep(300);
  results.s1_afterStart = await evaluate(cdp, `({state, levelNo, wave, gt: +gt.toFixed(1)})`);

  await domClick(cdp, '#fast'); await domClick(cdp, '#fast');   // 1→2→4
  results.s1_gameSpeed = await evaluate(cdp, 'gameSpeed');

  // 真实点击种一株向日葵：选卡 0（CARD_X0=76 中心 125,639）→ 格 (1,0) 中心 (190,132)
  await canvasClick(cdp, 125, 639);
  await canvasClick(cdp, 190, 132);
  await sleep(200);
  results.s1_plantsAfterRealClick = await evaluate(cdp, 'plants.length');

  const fw = await evaluate(cdp, FORCE_W7);
  results.s1_forcedW7 = fw;
  await sleep(400);

  const mBefore = await startSample(cdp);
  await sleep(REAL_WINDOW_MS * 0.75);
  await screenshot(cdp, SHOT_S1);
  await sleep(REAL_WINDOW_MS * 0.25 + SAMPLE_WAIT_MS);
  results.scenarios.S1_L3_finalWave_4x = await stopSample(cdp, 'S1', mBefore);
  results.s1_endState = await evaluate(cdp, `({state, won, wave, zombies: zombies.length, frameErrT: +frameErrT.toFixed(2), frameErr: frameErr ? String(frameErr).slice(0,120) : null})`);

  // ================= S2 · 对齐 bench 场景 C（纯稳态压力） =================
  await navigate(cdp, BASE_URL);
  results.s2_inject = await evaluate(cdp, INJECT_S2);
  await sleep(400);
  const mBefore2 = await startSample(cdp);
  await sleep(REAL_WINDOW_MS * 0.75);
  await screenshot(cdp, SHOT_S2);
  await sleep(REAL_WINDOW_MS * 0.25 + SAMPLE_WAIT_MS);
  results.scenarios.S2_sceneC_bench_4x = await stopSample(cdp, 'S2', mBefore2);
  results.s2_endState = await evaluate(cdp, `({state, plants: plants.length, zombies: zombies.length, frameErrT: +frameErrT.toFixed(2)})`);

  results.consoleErrors = cdp.consoleErrors();
  results.finishedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
  console.log('DONE');
  console.log(JSON.stringify({ scenarios: results.scenarios, consoleErrors: results.consoleErrors, s1: { ver: results.s1_version, start: results.s1_afterStart, speed: results.s1_gameSpeed, plants: results.s1_plantsAfterRealClick, w7: results.s1_forcedW7, end: results.s1_endState }, s2: { inject: results.s2_inject, end: results.s2_endState } }, null, 2));
  try { await cdp.send('Browser.close'); } catch (e) { try { ws.close(); } catch (e2) {} }
}

main().catch(e => { console.error('RUNNER FAILED:', e); process.exit(1); });
