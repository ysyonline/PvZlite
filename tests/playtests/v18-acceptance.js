'use strict';
/* ============================================================================
 * tests/playtests/v18-acceptance.js — v1.8 真机验收（M4 最后一棒）
 * ----------------------------------------------------------------------------
 * 三路（plan §3 七道门为公共底座）：
 *   A. 七道可运行性门（prelude.bootstrap，gate1-6 硬门）+ gate4 执行计数器收尾核查
 *   B. 同格锁真机验收（Edge headless + CDP，端口 9355+，页面内实测——对应
 *      v1.8-decisions.md「关键契约断言」）：
 *        TB1 版本自证（VERSION=v1.8.0）
 *        TB2 cabbage 端到端：A 直中 20 + B 同格溅 8 且 B.freezeT===0
 *            ★ 同格锁核心：C 同排邻格（|Δx|=25<30 旧带内）0 伤 + 邻排 0 伤
 *        TB3 corn 同格锁：邻格 0 伤（旧规则 6）/ 同格溅 6 / 溅射不定身
 *        TB4 melon/icemelon 无锁跨格照溅 35.75 + icemelon 溅射减速（分级差异锁）
 *        TB5 端到端布局口径：落点格活僵尸必吃溅射（活僵尸同格 B 必掉血 8）+
 *            远格/邻排双隔离 —— R7「n=1 桶 P(≥1)=0 无幻影溅射」真机对偶
 *        TB6 黄油加强回归：命中当刻 freezeT=3.0 · 三停 · 到期恢复 · p≈27%（N=4000）
 *        TB7 视觉证据：cabbage 飞行帧 + 同格溅射命中帧（爆点粒子）
 *   C. R9-a 口径端到端（harness 模式，prelude 权威口径）：三指标受控场景 +
 *      溢杀分栏（direct 非空 + 已知样本 eff=5/ovf=3）+ 哨兵双域判别力 +
 *      v1.7 旧源判别力自证（c379872 复跑，同源 v18-splash-distribution 手法）
 *
 * 运行（node 绝对路径，本机=公司机 user3667 · 目录带 -3 后缀）：
 *   "C:/Users/user3667/.workbuddy/binaries/node/versions/22.22.2-3/node.exe" tests/playtests/v18-acceptance.js
 * Bash 工具对本机 Edge 子进程 stdout 不回传 ⇒ 调用方 `> log 2>&1` 重定向后 Read，
 * 以 v18-acceptance-results.json 为权威。
 * 环境变量：PVZ_EXPECT_VER（缺省 v2.1.0；对照旧版定版源时显式传）· PVZ_HTML_PATH（对照旧源时用）
 * 产物：tests/playtests/v18-acceptance-results.json + v18-*.png（本脚本产物，勿还原）
 * ==========================================================================*/

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile, execSync } = require('child_process');
const { pathToFileURL } = require('url');
const P = require(path.join(__dirname, 'lib', 'prelude.js'));

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9355;                                   // v1.8 建议端口下限（9352/9353/9354 已占用）
const TMP = path.join(process.cwd(), '.tmp-v18-acc');
const OUT = path.join(__dirname);                    // 产物落 tests/playtests/
const OUT_JSON = path.join(OUT, 'v18-acceptance-results.json');
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PAGE = pathToFileURL(path.resolve(REPO_ROOT, 'plants-vs-zombies.html')).href;
const V17_COMMIT = 'c379872';                        // v1.7.0 源码权威提交（判别力对照）

// ---------------- 结果框架 ----------------
const results = {
  meta: {
    task: 'V18-M4 v1.8 真机验收（七道门 + 同格锁契约 + R9-a 口径 + 判别力自证）',
    date: new Date().toISOString().slice(0, 10),
    node: process.version,
    expectVer: process.env.PVZ_EXPECT_VER || 'v2.1.0',
    htmlPath: P.htmlPath(),
    page: PAGE, port: PORT,
    runtimeMs: null,
    preconditions: null,
  },
  harness: null,          // C 路 harness 断言
  realmachine: null,      // B 路真机断言
  selfcheck: null,        // 旧源判别力
  assertions: [],
  pass: false,
};
function assertLocal(name, pass, detail) {
  results.assertions.push({ name, pass: !!pass, detail: detail || '' });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail || ''}`);
  return !!pass;
}

// ---------------- B 路：CDP 客户端 ----------------
function get(u) { return new Promise((res, rej) => { http.get(u, (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => res(d)); }).on('error', rej); }); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runRealMachine() {
  const out = { assertions: [] };
  const okA = (name, pass, detail) => { out.assertions.push({ name, pass: !!pass, detail: detail || '' }); console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail || ''}`); return !!pass; };
  let ok = true;

  fs.rmSync(TMP, { recursive: true, force: true });
  const e = execFile(EDGE, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + TMP,
    '--no-first-run', '--window-size=1200,900', 'about:blank']);
  let tabs = null;
  for (let i = 0; i < 40; i++) { try { tabs = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); break; } catch (_) { await sleep(250); } }
  if (!tabs) throw new Error('CDP not ready on ' + PORT);
  const page = tabs.find((x) => x.type === 'page');
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
  const shot = async (name) => {
    const s = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, name), Buffer.from(s.result.data, 'base64'));
    return name;
  };

  try {
    await send('Page.enable');
    await send('Page.navigate', { url: PAGE + '?test=1&level=1' });
    await sleep(1500);

    // ---- 页面内助手（沿 v17-acceptance 手法；同格锁摆位按 v1.8 几何） ----
    const helper = `(function(){
      window.__h = window.__h || {};
      window.__h._dp = drawPause;
      window.__h.freeze = function(){ state='play'; paused=true; drawPause=function(){}; toastT=0; warn.active=false; try{muted=true}catch(_){} };
      window.__h.restore = function(){ drawPause = window.__h._dp; };
      window.__h.clearWorld = function(){ plants=[];zombies=[];projectiles=[];effects=[];pointDrops=[];spawnQueue=[];waveActive=false; };
      window.__h.snap = function(){ const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const x=c.getContext('2d');x.drawImage(canvas,0,0);return x; };
      window.__h.px = function(sx,sy,sz){ return Array.from(sz.getImageData(sx,sy,1,1).data).slice(0,3).join(','); };
      window.__h.mkZ = function(row,x,hp,spd){ const z={type:'normal',row:row,x:x,hp:hp,maxHp:hp,spd:spd,eating:false,eatAnim:0,walk:0,dead:false}; return z; };
      window.__h.setPlant = function(type,col,row){ const p=spawnPlant(type,col,row,0); p.plantT=620; p.plantDone=true; p.cd=0; return p; };
      // 真机真实弹体（经 updatePlant 射击分支 push）
      window.__h.realPr = function(type,col,row,zx){
        window.__h.clearWorld();
        const p=window.__h.setPlant(type,col,row); plants=[p];
        zombies=[window.__h.mkZ(row, (zx==null?700:zx), 1e9, 0)];
        p.cd=0; updatePlant(p, 1/60);
        return projectiles[projectiles.length-1] || null;
      };
      // 受控命中：弹体摆到落点 x=400（col3=[325,415)），跑一帧 updateProjectiles
      window.__h.hitPair = function(pr, row, ax, bx, cx){
        const flatY=GRID_Y+row*CELL_H+CELL_H/2;
        window.__h.clearWorld();
        pr.x=400; pr.y=flatY;
        const A=window.__h.mkZ(row, ax, 1000, 0);
        const B=window.__h.mkZ(row, bx, 1000, 0);
        const arr=[A,B];
        if(cx!=null)arr.push(window.__h.mkZ(row, cx, 1000, 0));
        zombies=arr; projectiles=[pr];
        updateProjectiles(0.0001);
        const out={A_lost:1000-A.hp, B_lost:1000-B.hp,
                A_freezeT:(A.freezeT==null?0:A.freezeT), B_freezeT:(B.freezeT==null?0:B.freezeT),
                B_slowT:(B.slowT==null?0:B.slowT), hitPointX:pr.x};
        if(cx!=null)out.C_lost=1000-arr[2].hp;
        return out;
      };
      return 'helpers ok';
    })()`;
    console.log('[helper]', await evalPage(helper));

    // ---- TB1 版本自证 ----
    const VER = await evalPage('VERSION');
    const VER_EXP = results.meta.expectVer;
    ok = okA('TB1:验收对象版本自证', String(VER).indexOf(VER_EXP) >= 0, `VERSION=${JSON.stringify(VER)}（期望含 ${VER_EXP}）`);

    // ---- TB2 cabbage 端到端 + 同格锁核心断言 ----
    const TB2 = await evalPage(`(function(){
      window.__h.freeze(); level=LEVELS[1]; levelNo=1; DIFF='normal';
      const row=2;
      // 主臂：落点 400（col3=[325,415)）。A@415(|Δx|=15 直中) · B@390(同格溅射) · C@425(col4 邻格, |Δx|=25<30 旧带内)
      const pr1=window.__h.realPr('cabbage',2,row,700);
      const info1={dmg:pr1&&pr1.dmg, splash:pr1&&pr1.splash, ratio:pr1&&pr1.splashRatio, grid:!!(pr1&&pr1.splashGrid)};
      const hit=window.__h.hitPair(pr1, row, 415, 390, 425);
      // 邻排臂：上/下排同摆落点附近 ⇒ 行隔离
      const pr1b=window.__h.realPr('cabbage',2,row,700);
      const up=window.__h.mkZ(row-1, 400, 1000, 0), dn=window.__h.mkZ(row+1, 400, 1000, 0);
      window.__h.clearWorld(); pr1b.x=400; pr1b.y=GRID_Y+row*CELL_H+CELL_H/2;
      const A2=window.__h.mkZ(row, 415, 1000, 0);
      zombies=[A2,up,dn]; projectiles=[pr1b];
      updateProjectiles(0.0001);
      const adj={A_lost:1000-A2.hp, up_lost:1000-up.hp, dn_lost:1000-dn.hp};
      return {info:info1, hit:hit, adj:adj};
    })()`);
    {
      const h = TB2.hit, a = TB2.adj, inf = TB2.info;
      ok = okA('TB2①:cabbage 弹体字段(dmg20/splash30/ratio0.40/grid=true)',
        inf.dmg === 20 && inf.splash === 30 && Math.abs(inf.ratio - 0.40) < 1e-9 && inf.grid === true,
        `dmg=${inf.dmg} splash=${inf.splash} ratio=${inf.ratio} grid=${inf.grid}`);
      ok = okA('TB2②:A 直中20 + B 同格溅8 且 B.freezeT===0',
        Math.abs(h.A_lost - 20) < 1e-9 && Math.abs(h.B_lost - 8) < 1e-9 && h.B_freezeT === 0,
        `A=${h.A_lost} B=${h.B_lost} B.freezeT=${h.B_freezeT}`);
      ok = okA('TB2③:★同格锁核心 C 同排邻格(旧带 |Δx|=25) 0 伤', h.C_lost === 0, `C@425 掉血=${h.C_lost}（旧规则会溅8）`);
      ok = okA('TB2④:邻排 0 伤（行隔离）', Math.abs(a.A_lost - 20) < 1e-9 && a.up_lost === 0 && a.dn_lost === 0,
        `A=${a.A_lost} up=${a.up_lost} dn=${a.dn_lost}`);
    }

    // ---- TB3 corn 同格锁（邻格 0 / 同格 6）----
    const TB3 = await evalPage(`(function(){
      window.__h.freeze(); level=LEVELS[1]; levelNo=1; DIFF='normal';
      const row=2;
      function run(type, bx){
        const pr=window.__h.realPr('corn',2,row,700);
        const hit=window.__h.hitPair(pr, row, 415, bx);
        return {A_lost:hit.A_lost, B_lost:hit.B_lost, B_freezeT:hit.B_freezeT, grid:!!pr.splashGrid};
      }
      return { adj:run('corn',425), same:run('corn',390) };
    })()`);
    ok = okA('TB3①:corn 邻格 0 伤(旧规则6)+grid=true',
      Math.abs(TB3.adj.A_lost - 15) < 1e-9 && TB3.adj.B_lost === 0 && TB3.adj.grid === true,
      `直中=${TB3.adj.A_lost} 邻格溅射=${TB3.adj.B_lost} grid=${TB3.adj.grid}`);
    ok = okA('TB3②:corn 同格溅 6 且溅射不定身',
      Math.abs(TB3.same.A_lost - 15) < 1e-9 && Math.abs(TB3.same.B_lost - 6) < 1e-9 && TB3.same.B_freezeT === 0,
      `直中=${TB3.same.A_lost} 同格溅=${TB3.same.B_lost} freezeT=${TB3.same.B_freezeT}`);

    // ---- TB4 melon/icemelon 无锁跨格照溅 + icemelon 溅射减速 ----
    const TB4 = await evalPage(`(function(){
      window.__h.freeze(); level=LEVELS[1]; levelNo=1; DIFF='normal';
      const row=2;
      function run(type, bx){
        const pr=window.__h.realPr(type,2,row,700);
        const hit=window.__h.hitPair(pr, row, 415, bx);
        return {A_lost:hit.A_lost, B_lost:hit.B_lost, B_slowT:hit.B_slowT, grid:!!(pr&&pr.splashGrid)};
      }
      return { melon:run('melon',440), ice:run('icemelon',440) };
    })()`);
    ok = okA('TB4①:melon 无锁跨格照溅 35.75',
      Math.abs(TB4.melon.A_lost - 65) < 1e-9 && Math.abs(TB4.melon.B_lost - 35.75) < 1e-9 && TB4.melon.grid === false,
      `直中=${TB4.melon.A_lost} 溅射=${TB4.melon.B_lost} grid=${TB4.melon.grid}`);
    ok = okA('TB4②:icemelon 跨格 35.75 + 溅射减速',
      Math.abs(TB4.ice.A_lost - 65) < 1e-9 && Math.abs(TB4.ice.B_lost - 35.75) < 1e-9 && TB4.ice.B_slowT >= 1.9,
      `直中=${TB4.ice.A_lost} 溅射=${TB4.ice.B_lost} slowT=${TB4.ice.B_slowT}`);

    // ---- TB5 端到端布局口径：同格溅射确定性 + 无幻影溅射 + 远格/邻排双隔离 ----
    // （真机对偶 R7「n=1 桶 P(≥1)=0 无幻影溅射」：直中目标被排除、直中后 break，不会 20+8 双扣）
    const TB5 = await evalPage(`(function(){
      window.__h.freeze(); level=LEVELS[1]; levelNo=1; DIFF='normal';
      const row=2, flatY=GRID_Y+row*CELL_H+CELL_H/2;
      const out={same:0, phantom:0, far:0, trials:12};
      // 臂1「同格溅射确定性」：A@415 承接直中（|Δx|=15<42），B 在落点格 col3=[325,415) 内、
      //   直中窗外（|Δx|≥48>42）⇒ B 不吃直中、必吃同格溅射 8（同格溅射无距离判定，确定性）
      for(let i=0;i<out.trials;i++){
        const pr=window.__h.realPr('cabbage',2,row,700);
        const bx=330 + (i*2)%22;              // 330~352，全落 col3 且全在直中窗外
        window.__h.clearWorld();
        pr.x=400; pr.y=flatY;
        const A=window.__h.mkZ(row, 415, 1000, 0);
        const B=window.__h.mkZ(row, bx, 1000, 0);
        zombies=[A,B]; projectiles=[pr];
        updateProjectiles(0.0001);
        if(1000-A.hp===20 && 1000-B.hp===8) out.same++;
      }
      // 臂2「无幻影溅射」：单一僵尸在直中窗内 ⇒ 直中 20 且 break，不得 20+8 双扣
      for(let i=0;i<out.trials;i++){
        const pr=window.__h.realPr('cabbage',2,row,700);
        const bx=370 + (i*3)%34;              // 370~403，全在直中窗 |Δx|<42 内
        window.__h.clearWorld();
        pr.x=400; pr.y=flatY;
        const B=window.__h.mkZ(row, bx, 1000, 0);
        zombies=[B]; projectiles=[pr];
        updateProjectiles(0.0001);
        if(1000-B.hp===20) out.phantom++;
      }
      // 臂3「远格+邻排双隔离」：col6（|Δx|≥90>30）与邻排 ⇒ 全 0 伤
      for(let i=0;i<out.trials;i++){
        const pr=window.__h.realPr('cabbage',2,row,700);
        const fx=490 + (i*6)%80;
        window.__h.clearWorld();
        pr.x=400; pr.y=flatY;
        const F=window.__h.mkZ(row, fx, 1000, 0);
        const U=window.__h.mkZ(row-1, 400, 1000, 0);
        zombies=[F,U]; projectiles=[pr];
        updateProjectiles(0.0001);
        if(1000-F.hp===0 && 1000-U.hp===0) out.far++;
      }
      return out;
    })()`);
    ok = okA('TB5①:同格溅射确定性(12/12 直中20+溅8，无距离判定)', TB5.same === TB5.trials, `same=${TB5.same}/${TB5.trials}`);
    ok = okA('TB5②:无幻影溅射(直中即 break，12/12 恰 20 不双扣)', TB5.phantom === TB5.trials, `phantom=${TB5.phantom}/${TB5.trials}`);
    ok = okA('TB5③:远格+邻排双隔离(12/12 全 0 伤)', TB5.far === TB5.trials, `far=${TB5.far}/${TB5.trials}`);

    // ---- TB6 黄油加强回归（freezeT 3.0 + 三停 + 恢复 + p≈27%）----
    const TB6 = await evalPage(`(function(){
      window.__h.freeze(); level=LEVELS[1]; levelNo=1; DIFF='normal';
      const row=2, flatY=GRID_Y+row*CELL_H+CELL_H/2; const out={};
      {
        window.__h.clearWorld();
        const z=window.__h.mkZ(row, 435, 1000, 30); zombies=[z];
        projectiles=[{x:400,y:flatY,flatY:flatY,yOff:0,vx:220,dmg:15,row:row,type:'corn',splash:30,splashRatio:0.40,butter:true,dead:false}];
        updateProjectiles(0.0001);
        out.freezeOnHit=(z.freezeT==null?0:z.freezeT);
        updateZombies(1/60); out.freezeAfterTick=(z.freezeT==null?0:z.freezeT);
      }
      {
        window.__h.clearWorld();
        const z=window.__h.mkZ(row, 700, 1000, 60); zombies=[z]; applyFreeze(z);
        const x0=z.x, w0=z.walk; let maxdx=0, maxdw=0;
        for(let i=0;i<120;i++){ updateZombies(1/60); maxdx=Math.max(maxdx,Math.abs(z.x-x0)); maxdw=Math.max(maxdw,Math.abs(z.walk-w0)); }
        out.move={maxdx:maxdx, maxdw:maxdw};
      }
      {
        window.__h.clearWorld();
        const z=window.__h.mkZ(row, 700, 1000, 60); zombies=[z]; applyFreeze(z);
        const x0=z.x;
        for(let i=0;i<200;i++) updateZombies(1/60);
        out.recover={moved:(z.x<x0), freezeT:(z.freezeT==null?0:z.freezeT)};
      }
      {
        window.__h.clearWorld();
        const p=window.__h.setPlant('corn',2,2); plants=[p];
        zombies=[window.__h.mkZ(2, 900, 1e9, 0)];
        const N=4000; let butter=0, missing=0, butterFalse=0;
        for(let i=0;i<N;i++){
          p.cd=0; projectiles=[];
          updatePlant(p, 1/60);
          const pr=projectiles[projectiles.length-1];
          if(!pr){ missing++; continue; }
          if(pr.butter===true) butter++;
          if(pr.butter===false) butterFalse++;
        }
        out.prob={N:N, butter:butter, frac:butter/N, missing:missing, butterFalse:butterFalse};
      }
      return out;
    })()`);
    ok = okA('TB6①:黄油命中当刻 freezeT=3.0',
      TB6.freezeOnHit === 3.0 && TB6.freezeAfterTick > 2.9 && TB6.freezeAfterTick <= 3.0,
      `命中=${TB6.freezeOnHit} 1tick后=${TB6.freezeAfterTick}`);
    ok = okA('TB6②:三停（移动/动画 2s 零位移零动画）', TB6.move.maxdx === 0 && TB6.move.maxdw === 0,
      `maxdx=${TB6.move.maxdx} maxdw=${TB6.move.maxdw}`);
    ok = okA('TB6③:到期恢复（3.33s 后 moved+freezeT=0）', TB6.recover.moved && TB6.recover.freezeT === 0,
      `moved=${TB6.recover.moved} freezeT=${TB6.recover.freezeT}`);
    {
      const pr2 = TB6.prob;
      const inBand = pr2.frac >= 0.24 && pr2.frac <= 0.30;   // N=4000 ⇒ σ≈0.0070，±0.03 ≈ 4.3σ
      ok = okA('TB6④:黄油概率≈27%（N=4000，发射时掷定）',
        inBand && pr2.butterFalse === 0 && pr2.missing === 0,
        `占比=${(pr2.frac * 100).toFixed(2)}% 缺弹=${pr2.missing} 显式false=${pr2.butterFalse}`);
    }

    // ---- TB7 视觉证据 ----
    await evalPage(`(function(){ window.__h.freeze(); level=LEVELS[1]; levelNo=1; DIFF='normal';
      const row=2, flatY=GRID_Y+row*CELL_H+CELL_H/2;
      const pr=window.__h.realPr('cabbage',2,row,650);
      const A=window.__h.mkZ(row, 415, 1000, 0), B=window.__h.mkZ(row, 430, 1000, 0);
      zombies=[A,B]; projectiles=[pr];
      pr.x=380; pr.y=flatY-70; render(); return true; })()`);
    await sleep(200);
    await shot('v18-cabbage-flight.png');
    const TB7 = await evalPage(`(function(){ window.__h.freeze(); level=LEVELS[1]; levelNo=1; DIFF='normal';
      const row=2, flatY=GRID_Y+row*CELL_H+CELL_H/2;
      const pr=window.__h.realPr('cabbage',2,row,700);
      const A=window.__h.mkZ(row, 415, 1000, 0), B=window.__h.mkZ(row, 390, 1000, 0);
      zombies=[A,B]; projectiles=[pr]; pr.x=400; pr.y=flatY;
      updateProjectiles(0.0001);
      render();
      const s=window.__h.snap();
      let burstColor=null;
      for(let dx=-8;dx<=8;dx++){ const c=window.__h.px(400+dx, flatY-10, s); const R=String(c).split(',').map(Number);
        if(R[0]>150 && R[0]>R[2]+40){ burstColor=c; break; } }
      return { burstColor:burstColor, A_lost:1000-A.hp, B_lost:1000-B.hp, effects:effects.length };
    })()`);
    await sleep(200);
    await shot('v18-cabbage-splash.png');
    ok = okA('TB7:溅射视觉证据（飞行帧+命中帧爆点粒子）',
      TB7.A_lost === 20 && TB7.B_lost === 8 && TB7.effects > 0,
      `A=${TB7.A_lost} B=${TB7.B_lost} effects=${TB7.effects} 爆点像素=${JSON.stringify(TB7.burstColor)} → v18-cabbage-flight.png / v18-cabbage-splash.png`);

    await evalPage('window.__h.restore(); true');
  } finally {
    ws.close();
    try { e.kill(); } catch (_) { }
    await sleep(400);
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) { }
  }

  out.pass = out.assertions.every((a) => a.pass);
  return out;
}

// ---------------- C 路：R9-a 口径端到端 + 旧源判别力（harness 模式） ----------------
function runHarnessAndSelfcheck(pre) {
  const out = { assertions: [] };
  const okH = (name, pass, detail) => { out.assertions.push({ name, pass: !!pass, detail: detail || '' }); console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail || ''}`); return !!pass; };
  let ok = true;

  // ---- 三指标受控场景（4 种子聚合，与 prelude-selftest 同款） ----
  console.log('[harness] R9-a 三指标受控场景（1 corn × 1 存活靶, 72s ×4 种子）...');
  const mPerSeed = [];
  for (const seed of P.seeds(7001, 4)) {
    const g2 = P.freshGame(seed);
    const ledger = P.createLedger({ warmupT: 8, classify: P.makeHitClassifier({ direct: [15], splash: [6] }) });
    const z = P.injectZombie(g2, { hp: 180 * P.SURVIVOR_MULT, maxHp: 180 * P.SURVIVOR_MULT });
    P.attachHpProbe(z, (preHp, postHp) => ledger.noteHpWrite(z, ledger.tNow, preHp, postHp));
    P.injectPlant(g2, 'corn', 0);
    P.instrument(g2, { onFreeze: (zz, preT) => ledger.noteFreeze(zz, ledger.tNow, preT) });
    const mm = P.runWindow(g2, {
      ledger, zombies: [z], duration: 72, teleport: P.TELEPORT_X, warmupT: 8,
      p: pre.measured.butterP, T: pre.measured.freezeT, cd: pre.measured.cornCd, nPlants: 1,
    });
    mPerSeed.push(mm);
  }
  const wsum = (k) => mPerSeed.reduce((a, b) => a + b[k], 0);
  const m = {
    freezeCoverage: P.r4(wsum('freezeCoverage') / mPerSeed.length),
    chillFrac: P.r4(wsum('chillFrac') / mPerSeed.length),
    unionFrac: P.r4(wsum('unionFrac') / mPerSeed.length),
    butters: wsum('butters'), refreshEvents: wsum('refreshEvents'),
    refreshWasteTotal: P.r4(wsum('refreshWasteTotal')),
    denialPx: P.r2(wsum('denialPx')),
    overflow: mPerSeed[0].overflow,
  };
  out.metrics = m;
  console.log(`  cov=${m.freezeCoverage} chill=${m.chillFrac} union=${m.unionFrac} butters=${m.butters} refresh=${m.refreshEvents} waste=${m.refreshWasteTotal} denial=${m.denialPx}`);
  ok = okH('R9a①:freezeCoverage 落 20%-40%（v1.7 域锚点≈0.30）', m.freezeCoverage >= 0.20 && m.freezeCoverage <= 0.40, `cov=${m.freezeCoverage}`);
  ok = okH('R9a②:refreshWaste>0（T>cd 域刷新浪费确凿）', m.refreshEvents > 0 && m.refreshWasteTotal > 0, `refresh=${m.refreshEvents} waste=${m.refreshWasteTotal}s`);
  ok = okH('R9a③:denialPx>0 且 frozen/chill 两项可分', m.denialPx > 0, `denial=${m.denialPx}`);
  ok = okH('R9a④:溢杀分栏 direct 非空真（假绿缺陷回归防线）',
    m.overflow.direct.raw > 0 && m.overflow.direct.events > 0, `raw=${m.overflow.direct.raw} events=${m.overflow.direct.events}`);
  ok = okH('R9a⑤:存活靶臂 rate=null（仅真实行程臂上报）',
    m.overflow.mode === 'survivor' && m.overflow.direct.rate == null && m.overflow.splash.rate == null,
    `mode=${m.overflow.mode}`);

  // ---- 溢杀已知样本（mock 注入：hp=5 吃 8 → eff=5/ovf=3）----
  {
    const lk = P.createLedger({ classify: P.makeHitClassifier({ splash: [8] }) });
    const gk = P.freshGame(7001);
    const zk = P.injectZombie(gk, { hp: 5, maxHp: 5, spd: 0 });
    P.attachHpProbe(zk, (a, b) => lk.noteHpWrite(zk, lk.tNow, a, b));
    const wk = lk.noteHpWrite(zk, 1.5, 5, -3);
    const fk = lk.finalize(0, 3, 2.6, 1);
    ok = okH('R9a⑥:已知溢出样本 eff=5/ovf=3/splash 栏归位',
      wk.eff === 5 && wk.overflow === 3 && wk.hitKind === 'splash'
      && fk.overflow.splash.events === 1 && fk.overflow.splash.raw === 8 && fk.overflow.splash.eff === 5,
      `行 eff=${wk.eff} ovf=${wk.overflow} · 栏 raw=${fk.overflow.splash.raw} eff=${fk.overflow.splash.eff}`);
  }

  // ---- 哨兵双域 ----
  console.log('[harness] 口径自检哨兵（双域双跑）...');
  const sent = P.runSentinel({ cd: pre.measured.cornCd, nSeeds: 8, windowT: 72, warmupT: 8 });
  out.sentinel = { A: sent.A.verdict, B: sent.B.verdict, discriminative: sent.discriminative, B_wastePerRefresh: sent.B.wastePerRefresh };
  console.log(`  A(${sent.A.label}): refresh=${sent.A.refreshTotal} → ${sent.A.verdict}`);
  console.log(`  B(${sent.B.label}): refresh=${sent.B.refreshTotal} wastePerRefresh=${sent.B.wastePerRefresh} → ${sent.B.verdict}`);
  ok = okH('哨兵①:v1.6 域刷新浪费恒 0（PASS）', sent.A.wasteTotal === 0 && sent.A.verdict.startsWith('PASS'), sent.A.verdict);
  ok = okH('哨兵②:v1.7 域每刷新浪费≈T*-cd=0.4s', sent.B.wastePerRefresh > 0.25 && sent.B.wastePerRefresh < 0.55, `wastePerRefresh=${sent.B.wastePerRefresh}`);
  ok = okH('哨兵③:v1.7 域判 FAIL（公式前提崩塌）', sent.B.verdict.startsWith('FAIL'), sent.B.verdict);
  ok = okH('哨兵④:双域判别力完整', sent.discriminative === true, sent.conclusion || '');

  // ---- v1.7 旧源判别力自证（同格锁差异必须被咬住） ----
  console.log('[selfcheck] v1.7 旧源（c379872）判别力 ...');
  const oldHtmlPath = path.join(os.tmpdir(), 'pvz-acc-v17-c379872.html');
  let oldReady = false;
  try {
    const code = execSync(`git show ${V17_COMMIT}:plants-vs-zombies.html`, { cwd: REPO_ROOT, encoding: 'utf8' });
    fs.writeFileSync(oldHtmlPath, code);
    oldReady = true;
    console.log(`  旧源已提取 → ${oldHtmlPath} (${code.length} chars)`);
  } catch (e2) {
    console.error(`  旧源提取失败: ${e2.message}`);
  }
  if (oldReady) {
    // 真机同款受控臂搬到 harness：cabbage 落点 400，邻格 C@425（旧带 |Δx|=25<30 会溅 8）
    const runArm = (htmlPath, seed) => {
      const g = P.freshGame(seed, { htmlPath });
      const sb = g.sandbox;
      sb.__plants.length = 0; sb.__zombies.length = 0; sb.__projectiles.length = 0;
      // 邻格受害者 C@425 + 同格 B@390 + 邻排 U@400（行隔离）。
      // ★ 僵尸数组顺序即结算顺序：C 在首位先于 B/C，B@390 与 C@425 均在直中窗外
      //   （|Δx|=10/25<42 ⇒ 不对，两坐标都在 |Δx|<42 直中窗内！真机 TB2 用 A@415 承接直中
      //   并 break ⇒ harness 臂同构：补 A@415 首位承接直中，B/C 只可能吃溅射）
      const mkZ = (o) => Object.assign({ type: 'normal', row: 2, hp: 1000, maxHp: 1000, spd: 0, x: 800, eating: false, eatAnim: 0, walk: 0, dead: false, freezeT: 0, slowT: 0 }, o);
      const A = mkZ({ x: 415 }), B = mkZ({ x: 390 }), C = mkZ({ x: 425 }), U = mkZ({ row: 1, x: 400 });
      sb.__zombies.push(A, B, C, U);
      const card = (sb.__CARDS || []).find((c) => c.type === 'cabbage');
      const p = { type: 'cabbage', col: 2, row: 2, cd: 0, sunT: 0, armT: 0, dur: card ? card.dur : 750, maxDur: card ? card.dur : 750, plantT: 0, plantDone: true, dirtDone: true };
      sb.__plants.push(p);
      // 取真实弹体并摆到落点结算
      let hit = null;
      for (let i = 0; i < 8 && !hit; i++) {
        p.cd = 0; sb.__projectiles.length = 0;
        g.__updateRaw(P.DT);
        const pr = sb.__projectiles[sb.__projectiles.length - 1];
        if (!pr) continue;
        const flatY = sb.__consts.GRID_Y + 2 * sb.__consts.CELL_H + sb.__consts.CELL_H / 2;
        pr.x = 400; pr.y = flatY; pr.yOff = 0;
        sb.__projectiles.length = 0; sb.__projectiles.push(pr);
        sb.__zombies.length = 0; sb.__zombies.push(A, B, C, U);
        A.hp = 1000; B.hp = 1000; C.hp = 1000; U.hp = 1000;
        g.__updateRaw(0.0001);
        hit = { A_lost: 1000 - A.hp, B_lost: 1000 - B.hp, C_lost: 1000 - C.hp, U_lost: 1000 - U.hp };
      }
      return hit;
    };
    const oldHit = runArm(oldHtmlPath, 7211);
    const newHit = runArm(undefined, 7211);   // 缺省 = 当前源码
    out.oldsrc = {
      old: oldHit, new: newHit,
      oldVersion: (() => { try { const g = P.freshGame(7211, { htmlPath: oldHtmlPath }); return g.sandbox.__VERSION; } catch (_) { return 'unknown'; } })(),
    };
    console.log(`  旧源 C@425 邻格掉血=${oldHit && oldHit.C_lost} · 新源 C@425 邻格掉血=${newHit && newHit.C_lost}`);
    ok = okH('自证①:旧源 cabbage 邻格有溅射（带状几何）', oldHit && oldHit.C_lost > 0, `C_lost=${oldHit && oldHit.C_lost}`);
    ok = okH('自证②:新源 cabbage 邻格必须 0 伤（同格锁）', newHit && newHit.C_lost === 0, `C_lost=${newHit && newHit.C_lost}`);
    ok = okH('自证③:新源同格 B 仍溅 8 且直中 A=20（规则不是删溅射）',
      newHit && Math.abs(newHit.B_lost - 8) < 1e-9 && Math.abs(newHit.A_lost - 20) < 1e-9,
      `A_lost=${newHit && newHit.A_lost} B_lost=${newHit && newHit.B_lost}`);
    ok = okH('自证④:邻排两源均 0 伤（行隔离恒成立）', oldHit && newHit && oldHit.U_lost === 0 && newHit.U_lost === 0,
      `old=${oldHit && oldHit.U_lost} new=${newHit && newHit.U_lost}`);
    // melon 路径未动：同种子跨格臂两源同伤 35.75（A@415 承接直中，B@440 跨格吃溅射——对齐真机 TB4 摆位）
    const runMelon = (htmlPath, seed) => {
      const g = P.freshGame(seed, { htmlPath });
      const sb = g.sandbox;
      sb.__plants.length = 0; sb.__zombies.length = 0; sb.__projectiles.length = 0;
      const mkZ = (o) => Object.assign({ type: 'normal', row: 2, hp: 1000, maxHp: 1000, spd: 0, x: 800, eating: false, eatAnim: 0, walk: 0, dead: false, freezeT: 0, slowT: 0 }, o);
      const A = mkZ({ x: 415 }), B = mkZ({ x: 440 });
      sb.__zombies.push(A, B);   // hasZombieAhead 需要僵尸在场；A 首位承接直中
      const card = (sb.__CARDS || []).find((c) => c.type === 'melon');
      const p = { type: 'melon', col: 2, row: 2, cd: 0, sunT: 0, armT: 0, dur: card ? card.dur : 900, maxDur: card ? card.dur : 900, plantT: 0, plantDone: true, dirtDone: true };
      sb.__plants.push(p);
      let hit = null;
      for (let i = 0; i < 8 && !hit; i++) {
        p.cd = 0; sb.__projectiles.length = 0;
        g.__updateRaw(P.DT);
        const pr = sb.__projectiles[sb.__projectiles.length - 1];
        if (!pr) continue;
        const flatY = sb.__consts.GRID_Y + 2 * sb.__consts.CELL_H + sb.__consts.CELL_H / 2;
        pr.x = 400; pr.y = flatY; pr.vy = 0; pr.g = 0; pr.yOff = 0;
        sb.__projectiles.length = 0; sb.__projectiles.push(pr);
        sb.__zombies.length = 0; sb.__zombies.push(A, B);
        A.hp = 1000; B.hp = 1000;
        g.__updateRaw(0.0001);
        hit = { A_lost: 1000 - A.hp, B_lost: 1000 - B.hp };
      }
      return hit;
    };
    const oldMel = runMelon(oldHtmlPath, 7212);
    const newMel = runMelon(undefined, 7212);
    ok = okH('自证⑤:melon 跨格溅射两源同伤 35.75（带未动）',
      oldMel && newMel && Math.abs(oldMel.A_lost - 65) < 1e-9 && Math.abs(newMel.A_lost - 65) < 1e-9
      && Math.abs(oldMel.B_lost - 35.75) < 1e-9 && Math.abs(newMel.B_lost - 35.75) < 1e-9,
      `old: A=${oldMel && oldMel.A_lost}/B=${oldMel && oldMel.B_lost} · new: A=${newMel && newMel.A_lost}/B=${newMel && newMel.B_lost}`);
    try { fs.rmSync(oldHtmlPath, { force: true }); } catch (_) { }
    out.tempCleaned = !fs.existsSync(oldHtmlPath);
    ok = okH('自证⑥:临时旧源已清理', out.tempCleaned, oldHtmlPath);
  } else {
    ok = okH('自证:旧源可用（提取失败=判别力不完整）', false, 'git show 失败');
  }

  out.pass = out.assertions.every((a) => a.pass);
  return out;
}

// ---------------- 主流程 ----------------
(async () => {
  const t0 = Date.now();
  console.log('[bootstrap] 七道前置门（gate1-6 硬门）+ 前提实测 ...');
  const { g, pre, gates } = await P.bootstrap({});
  results.meta.preconditions = pre;
  results.harnessGates = {
    pass: gates.pass, failedGates: gates.failedGates,
    results: gates.results.map((r) => ({ gate: r.gate, name: r.name, pass: r.pass, detail: r.detail })),
  };
  for (const r of gates.results) console.log(`  gate${r.gate} ${r.pass ? 'PASS' : 'FAIL'} ${r.name} — ${r.detail}`);
  let ok = assertLocal('A①:七道前置门全过(gate1-6硬门)', gates.pass, gates.failedGates.join(',') || 'gate7 软门恒过带 warnings');
  ok = assertLocal('A②:前提实测=期望(p0.27/T3.0/cd2.6/splash表/调用点1)', (() => {
    const m = pre.measured;
    return Math.abs(m.butterP - 0.27) <= 1e-6 && P.epsEq(m.freezeT, 3.0) && P.epsEq(m.cornCd, 2.6)
      && m.splash.cabbage.splashGrid === true && m.splash.corn.splashGrid === true
      && m.splash.melon.splashGrid === false && m.splash.melon.splashGrid === false
      && m.applyFreezeCallSites === 1;
  })(), `p=${pre.measured.butterP} T=${pre.measured.freezeT} cd=${pre.measured.cornCd} callsites=${pre.measured.applyFreezeCallSites}`);
  ok = assertLocal('A③:判域=T>cd（overlapWasteExpected）', pre.domain.overlapWasteExpected === true, pre.domain.domainLabel);

  // B 路真机（gate1-6 全绿才进场）
  if (gates.pass) {
    console.log('\n[realmachine] 同格锁真机验收（Edge headless+CDP, 端口 ' + PORT + '）...');
    try {
      results.realmart = await runRealMachine();
      ok = assertLocal('B:同格锁真机验收(TB1-TB7)', results.realmart.pass,
        `${results.realmart.assertions.filter((a) => a.pass).length}/${results.realmart.assertions.length} 子项`);
    } catch (e) {
      results.realmart = { pass: false, assertions: [], crash: e.message };
      ok = assertLocal('B:同格锁真机验收(TB1-TB7)', false, 'CRASH: ' + e.message);
    }
  } else {
    results.realmart = { pass: false, assertions: [], skip: 'gates failed' };
    ok = assertLocal('B:同格锁真机验收(TB1-TB7)', false, 'gate1-6 未全绿，跳过');
  }

  // C 路 harness + 自证
  console.log('\n[harness+selfcheck] R9-a 口径端到端 + 哨兵 + 旧源判别力 ...');
  try {
    results.selfcheck = runHarnessAndSelfcheck(pre);
    ok = assertLocal('C:R9-a 口径+哨兵+判别力自证', results.selfcheck.pass,
      `${results.selfcheck.assertions.filter((a) => a.pass).length}/${results.selfcheck.assertions.length} 子项`);
  } catch (e) {
    results.selfcheck = { pass: false, assertions: [], crash: e.message };
    ok = assertLocal('C:R9-a 口径+哨兵+判别力自证', false, 'CRASH: ' + e.message);
  }

  // ---- 跑后卫生（本任务产物豁免） ----
  try {
    const lines = execSync('git status --porcelain', { cwd: REPO_ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    const mine = [/v18-acceptance(\.js|-results\.json)?$/, /v18-(cabbage|splash|butter)[^/]*\.png$/];
    const others = [/\.workbuddy\//];
    const unexpected = lines.filter((l) => !mine.some((re) => re.test(l)) && !others.some((re) => re.test(l)));
    results.meta.git = { post: { count: lines.length, unexpected, note: '本任务产物: 本脚本/results.json/png；豁免=.workbuddy 会话记账' } };
    ok = assertLocal('卫生:跑后工作树无任务外脏文件', unexpected.length === 0,
      unexpected.join(' | ') || `共 ${lines.length} 项（本任务产物+记账豁免）`);
  } catch (e) { results.meta.git = { error: e.message }; }

  // ---- 汇总 ----
  results.pass = ok && results.assertions.every((a) => a.pass);
  results.meta.runtimeMs = Date.now() - t0;
  fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
  const sub = (x) => x ? `${(x.assertions || []).filter((a) => a.pass).length}/${(x.assertions || []).length}` : '-';
  console.log(`\n================ v1.8 真机验收汇总 ================`);
  console.log(`  A 七道门: ${results.harnessGates.pass ? 'PASS' : 'FAIL ' + results.harnessGates.failedGates.join(',')}`);
  console.log(`  B 真机 TB1-TB7: ${results.realmart && results.realmart.pass ? 'PASS' : 'FAIL'} (${sub(results.realmart)})`);
  console.log(`  C R9-a+哨兵+自证: ${results.selfcheck && results.selfcheck.pass ? 'PASS' : 'FAIL'} (${sub(results.selfcheck)})`);
  console.log(`  总判定: ${results.pass ? 'PASS' : 'FAIL'} → ${OUT_JSON} (${results.meta.runtimeMs}ms)`);
  process.exitCode = results.pass ? 0 : 1;
})().catch((er) => { console.error('V18-ACC CRASH:', er && er.stack || er.message); process.exit(1); });
