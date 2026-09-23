// ============================================================================
// v1.7 真机验收脚本  ·  V17-D5  ·  QA 严守真
// ----------------------------------------------------------------------------
// 运行：Node 直跑（Edge headless=new + CDP + Runtime.evaluate + 像素判读）
//   "C:\Users\user3667\.workbuddy\binaries\node\versions\22.22.2-3\node.exe" tests/playtests/v17-acceptance.js
// 只读 plants-vs-zombies.html，不修改任何源码；产物落 tests/playtests/。
// ★ Bash 工具对本机 Edge 子进程 stdout 不回传 ⇒ 一律 `> log 2>&1` 重定向后 Read，
//   以 v17-acceptance-results.json 为权威。端口用 9354（避开 9352/9353）。
// 验收两刀：
//   R-B  cabbage 溅射（v1.7 新机制 + v1.8 同格锁，必测）：splash 30px·40% ⇒ 溅射伤害 8；
//        v1.8 同格锁：cabbage/corn 溅射仅落点同一格 ⇒ 同格 B 掉血 8 且 freezeT===0（溅射不定身）；
//        同排邻格 C（|Δx|=25<30 旧带内）⇒ 0 伤（同格锁核心断言）；邻排 D ⇒ 0 伤；
//        对照臂 更远邻格 ⇒ 0 伤；corn 同格溅 6；melon/icemelon 无同格锁跨格照溅（35.75）。
//   R-A  黄油加强复核：命中当刻 freezeT===3.0 · 三停（x/walk/dur）· 到期恢复 · 概率 ≈27%（N≥2000）。
// 运行会写出 v17-acceptance-results.json 与 v17-*.png（本脚本产物，勿还原）。
// ============================================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9354;                                   // 避开 v15 9351 / v16 9352
const TMP  = path.join(process.cwd(), '.tmp-v17-acc');
const OUT  = path.join(process.cwd(), 'tests', 'playtests');
// ★ 路径从 __dirname 推导（v16 脚本硬编码 file:///D:/code/PvZlite/... 在本机已失效）
const PAGE = pathToFileURL(path.resolve(__dirname, '..', '..', 'plants-vs-zombies.html')).href;

function get(u){ return new Promise((res,rej)=>{ http.get(u,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d))}).on('error',rej) }); }
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const cdist = (a,b)=>{ const A=String(a).split(',').map(Number),B=String(b).split(',').map(Number); return Math.max(Math.abs(A[0]-B[0]),Math.abs(A[1]-B[1]),Math.abs(A[2]-B[2])); };
const near  = (a,b,tol=8)=> cdist(a,b)<=tol;
const diff  = (a,b,tol=8)=> cdist(a,b)>tol;
const rgb   = (s)=> String(s).split(',').map(Number);

const RESULTS = [];   // {id, title, pass, detail}
function push(id,title,pass,notes){ RESULTS.push({id:id,title:title,pass:!!pass,detail:(notes||[]).join(' | ')});
  console.log('\n['+id+'] '+(pass?'PASS':'FAIL')+' · '+title); (notes||[]).forEach(n=>console.log('   · '+n)); }

(async () => {
  fs.rmSync(TMP, { recursive: true, force: true });
  const e = execFile(EDGE, ['--headless=new','--remote-debugging-port='+PORT,'--user-data-dir='+TMP,
                            '--no-first-run','--window-size=1200,900','about:blank']);
  let t = null;
  for (let i=0;i<40;i++){ try{ t=JSON.parse(await get('http://127.0.0.1:'+PORT+'/json/list')); break }catch(_){ await sleep(250) } }
  if(!t) throw new Error('CDP not ready');
  const page = t.find(x=>x.type==='page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r=>ws.onopen=r);
  let mid=0; const pend={};
  ws.onmessage = ev => { const m=JSON.parse(ev.data); if(m.id&&pend[m.id]) pend[m.id](m); };
  const send = (method,params={}) => new Promise(r=>{ mid++; pend[mid]=r; ws.send(JSON.stringify({id:mid,method,params})) });
  const evalPage = async (code) => {
    const r = await send('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true});
    if (r.result && r.result.exceptionDetails){
      const ex = r.result.exceptionDetails;
      throw new Error('page exception: '+((ex.exception&&ex.exception.description)||JSON.stringify(ex)));
    }
    return r.result.result.value;
  };
  const shot = async (name) => {
    const s = await send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(OUT,name), Buffer.from(s.result.data,'base64'));
    return name;
  };

  await send('Page.enable');
  await send('Page.navigate',{ url: PAGE+'?test=1&level=1' });
  await sleep(1500);

  // ---- 页面内通用助手（只读；drawPause 仅临时置空，避免暂停遮罩污染像素）----
  const helper = `(function(){
    window.__h = window.__h || {};
    window.__h._dp = drawPause;
    window.__h.freeze = function(){ state='play'; paused=true; drawPause=function(){}; toastT=0; warn.active=false; try{muted=true}catch(_){} };
    window.__h.restore = function(){ drawPause = window.__h._dp; };
    window.__h.clearWorld = function(){ plants=[];zombies=[];projectiles=[];effects=[];pointDrops=[];spawnQueue=[];waveActive=false; };
    window.__h.snap = function(){ const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const x=c.getContext('2d');x.drawImage(canvas,0,0);return x; };
    window.__h.px = function(sx,sy,sz){ return Array.from(sz.getImageData(sx,sy,1,1).data).slice(0,3).join(','); };
    window.__h.gridMaxDiff = function(a,b,step){ step=step||24; let m=0;
      for(let y=4;y<canvas.height;y+=step){ for(let x=4;x<canvas.width;x+=step){
        const A=a.getImageData(x,y,1,1).data, B=b.getImageData(x,y,1,1).data;
        m=Math.max(m,Math.abs(A[0]-B[0]),Math.abs(A[1]-B[1]),Math.abs(A[2]-B[2])); } } return m; };
    window.__h.mkZ = function(row,x,hp,spd,slowT){ const z={type:'normal',row:row,x:x,hp:hp,maxHp:hp,spd:spd,eating:false,eatAnim:0,walk:0,dead:false}; if(slowT!=null)z.slowT=slowT; return z; };
    window.__h.setPlant = function(type,col,row){ const p=spawnPlant(type,col,row,0); p.plantT=620; p.plantDone=true; p.cd=0; return p; };
    // 真机取真实弹体（经 updatePlant 射击分支 push）：返回 projectiles 末枚
    window.__h.realPr = function(type,col,row,zx){
      window.__h.clearWorld();
      const p=window.__h.setPlant(type,col,row); plants=[p];
      zombies=[window.__h.mkZ(row, (zx==null?700:zx), 1e9, 0)];
      p.cd=0; updatePlant(p, 1/60);
      return projectiles[projectiles.length-1] || null;
    };
    // 受控命中：把真实弹体摆到命中点，构造同排 A/B(/C) 僵尸，跑一帧 updateProjectiles
    // 同格锁摆位（v1.8）：落点 pr.x=400 ∈ col3=[325,415)；B=390 同格；C=425/500 邻格
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

  // ==========================================================================
  // env · 版本自证（确保验收对象是 v1.8 施工源码）
  // ==========================================================================
  const VER = await evalPage('VERSION');
  const VER_EXP = process.env.PVZ_EXPECT_VER || 'v1.8.0';   // 参数化：定版后跟当前源码；对照旧源时 PVZ_EXPECT_VER=v1.7.0
  push('env','验收对象版本自证', String(VER).indexOf(VER_EXP)>=0, [
    'VERSION='+JSON.stringify(VER)+'（期望含 '+VER_EXP+'）',
    '源码 L49 常量（只读）· PAGE='+PAGE
  ]);

  // ==========================================================================
  // R-B · cabbage 溅射（本版新机制）
  // ==========================================================================
  // ---- R-B-1 · 源码字段：cabbage 弹体带 splash 30 / splashRatio 0.40 / dmg 20 ----
  const RB1 = await evalPage(`(function(){
    window.__h.freeze(); level=LEVELS[1]; levelNo=1; DIFF='normal';
    const card=CARDS.find(c=>c.type==='cabbage');
    const pr=window.__h.realPr('cabbage',2,2,700);
    const p=plants[0];
    return { cost:card.cost, cardCd:card.cd,
             dmg:pr&&pr.dmg, splash:pr&&pr.splash, ratio:pr&&pr.splashRatio,
             hasRatio: !!(pr&&('splashRatio' in pr)),
             splashDmg:(pr&&pr.splashRatio!=null)?+(pr.dmg*pr.splashRatio).toFixed(4):null,
             pCdAfterFire:p&&p.cd, type:pr&&pr.type };
  })()`);
  {
    const pass = RB1.cost===100 && RB1.dmg===20 && RB1.splash===30 && Math.abs(RB1.ratio-0.40)<1e-9
              && RB1.hasRatio && Math.abs(RB1.splashDmg-8)<1e-9 && Math.abs(RB1.pCdAfterFire-2.0)<1e-9 && RB1.type==='cabbage';
    push('R-B-1','cabbage 弹体源码字段：dmg 20 / splash 30px / splashRatio 0.40（溅射伤害 8）· 攻击间隔 2.0s', pass, [
      '卡面 cost='+RB1.cost+'(期望100) 种植cd='+RB1.cardCd,
      '真机实弹（updatePlant 射击分支）type='+RB1.type+' dmg='+RB1.dmg+'(期望20)',
      'splash='+RB1.splash+'px(期望30) · splashRatio='+RB1.ratio+'(期望0.40，字段存在='+RB1.hasRatio+')',
      '溅射伤害 = dmg×ratio = '+RB1.splashDmg+'(期望8=20×0.40) · 首次开火后植物 cd='+RB1.pCdAfterFire+'(期望2.0)',
      '源事实：L1457 `{dmg:20,type:\'cabbage\',splash:30,splashRatio:0.40}`（v1.7 R-B 唯一源码增量）'
    ]);
  }

  // ---- R-B-2 · 端到端：A 直中(20) + B 同格溅射(8) 且 B.freezeT===0（溅射不定身）----
  // ---- ★ v1.8 同格锁核心断言：C 同排邻格（|Δx|=25<30 旧带内）0 伤 + D 邻排 0 伤 ----
  // ---- R-B-3 · 对照臂：更远邻格 ⇒ 0 伤 ----
  const RB2 = await evalPage(`(function(){
    window.__h.freeze(); level=LEVELS[1]; levelNo=1; DIFF='normal';
    const row=2;
    // 主臂：落点 pr.x=400（col3=[325,415)）。A@415(|Δx|=15 直中) · B@390(|Δx|=10 同格溅射)
    //        C@425(col4 邻格，|Δx|=25<30 旧带内 ⇒ 旧规则会溅 8，新规则必须 0 伤)
    const pr1=window.__h.realPr('cabbage',2,row,700);
    const hit=window.__h.hitPair(pr1, row, 415, 390, 425);
    // 邻排臂：上下排（row1/row3）僵尸同摆落点附近 ⇒ 无论几何距离多近都不被溅及（行隔离）
    const pr1b=window.__h.realPr('cabbage',2,row,700);
    const up=window.__h.mkZ(row-1, 400, 1000, 0), dn=window.__h.mkZ(row+1, 400, 1000, 0);
    window.__h.clearWorld(); pr1b.x=400; pr1b.y=GRID_Y+row*CELL_H+CELL_H/2;
    const A2=window.__h.mkZ(row, 415, 1000, 0);
    zombies=[A2,up,dn]; projectiles=[pr1b];
    updateProjectiles(0.0001);
    const adj={A_lost:1000-A2.hp, up_lost:1000-up.hp, dn_lost:1000-dn.hp};
    // 对照臂：更远邻格（col5=[505,595)，|Δx|=85>42 且 >30）⇒ 全隔离
    const pr2=window.__h.realPr('cabbage',2,row,700);
    const ctrl=window.__h.hitPair(pr2, row, 415, 390, 500);
    return {hit:hit, adj:adj, ctrl:ctrl, splash:pr1.splash};
  })()`);
  {
    const h=RB2.hit, a=RB2.adj, c=RB2.ctrl;
    const c1 = Math.abs(h.A_lost-20)<1e-9;
    const c2 = Math.abs(h.B_lost-8)<1e-9;                    // 20×0.40（B@390 与落点 400 同格 col3）
    const c3 = h.B_freezeT===0;                              // 溅射不定身
    const c4 = Math.abs(a.A_lost-20)<1e-9 && Math.abs(a.up_lost-0)<1e-9 && Math.abs(a.dn_lost-0)<1e-9;   // 邻排 0 伤
    const c5 = Math.abs(c.A_lost-20)<1e-9 && Math.abs(c.B_lost-8)<1e-9;   // 对照臂 B@390 仍同格溅 8（保底）
    const c6 = Math.abs(c.C_lost-0)<1e-9;                    // C@500(col5 邻格) 0 伤
    const pass = c1 && c2 && c3 && c4 && c5 && c6;
    push('R-B-2','cabbage 溅射端到端+同格锁：A 直中(20) + B 同格溅射(8) 且 B.freezeT===0；C 同排邻格(旧带 |Δx|=25<30) 0 伤；邻排 0 伤；对照臂远邻格 0 伤', pass, [
      '落点 x=400（col3=[325,415)）：A@415(|Δx|=15<42 直中) · B@390(|Δx|=10 同格溅射) · C@425(col4 邻格，|Δx|=25<30 旧带内)',
      '主臂：A 掉血='+(+h.A_lost).toFixed(1)+'(期望20 直中) · B 掉血='+(+h.B_lost).toFixed(1)+'(期望8=20×0.40 同格) → '+(c1&&c2?'OK':'异常'),
      '★ 同格锁核心：C(邻格) 掉血='+h.C_lost+'(期望0，旧规则会溅8 ⇒ 此处 0 才证明锁生效) → '+(h.C_lost===0?'锁生效':'异常'),
      'B.freezeT='+h.B_freezeT+'(期望0，口径：溅射不施加控制) · A.freezeT='+h.A_freezeT+'(cabbage 无控制，期望0) → '+(c3?'OK':'异常'),
      '邻排臂：A@415 掉血='+(+a.A_lost).toFixed(1)+'(期望20) · 上排@400 掉血='+a.up_lost+' · 下排@400 掉血='+a.dn_lost+'(均期望0，行隔离) → '+(c4?'OK':'异常'),
      '对照臂：A@415 直中='+(+c.A_lost).toFixed(1)+'(期望20) · B@390 同格='+(+c.B_lost).toFixed(1)+'(期望8) · C@500(col5 邻格 |Δx|=85)='+c.C_lost+'(期望0) → '+(c5&&c6?'OK':'异常'),
      '源事实：updateProjectiles L1588 `if(pr.splashGrid){colOf(z2.x)!==colOf(pr.x)⇒continue}`（v1.8 同格锁）；直中框 |z.x-pr.x|<42 保证 A 先结算并 break'
    ]);
  }

  // ---- R-B-4 · corn 同格溅 6 / melon·icemelon 无锁跨格照溅 35.75 + icemelon 溅射减速 ----
  const RB4 = await evalPage(`(function(){
    window.__h.freeze(); level=LEVELS[1]; levelNo=1; DIFF='normal';
    const row=2;
    function run(type, bx, ax){
      const pr=window.__h.realPr(type,2,row,700);
      const info={type:type, dmg:pr&&pr.dmg, splash:pr&&pr.splash, ratio:pr&&pr.splashRatio,
                  hasChill:!!(pr&&pr.chill), hasButter:!!(pr&&pr.butter), grid:!!(pr&&pr.splashGrid)};
      const hit=window.__h.hitPair(pr, row, (ax==null?415:ax), bx);
      return Object.assign(info, {A_lost:hit.A_lost, B_lost:hit.B_lost, B_freezeT:hit.B_freezeT, B_slowT:hit.B_slowT});
    }
    return {
      corn:     run('corn',     425),   // |Δx|=25<30 且同格(col3=[325,415)? 不！425∈col4 邻格) ⇒ 同格锁下 0 伤对照
      cornSame: run('corn',     390),   // B@390 同格(col3) ⇒ 溅 6=15×0.40
      melon:    run('melon',    440),   // |Δx|=40<55(溅射)· melon 无 splashGrid ⇒ 跨格照溅 35.75
      icemelon: run('icemelon', 440)    // |Δx|=40<55(溅射)· icemelon 无 splashGrid ⇒ 跨格照溅 35.75
    };
  })()`);
  {
    let pass=true; const notes=[];
    const c0 = Math.abs(RB4.corn.A_lost-15)<1e-9 && Math.abs(RB4.corn.B_lost-0)<1e-9 && RB4.corn.grid===true;   // 同格锁：邻格 0 伤
    if(!c0) pass=false;
    notes.push('corn 同格锁对照（B@425 邻格）：直中='+(+RB4.corn.A_lost).toFixed(1)+'(期望15) · 邻格溅射='+RB4.corn.B_lost+'(期望0，旧规则 6) · splashGrid='+RB4.corn.grid+'(期望true) → '+(c0?'锁生效':'异常'));
    const c1 = Math.abs(RB4.cornSame.A_lost-15)<1e-9 && Math.abs(RB4.cornSame.B_lost-6)<1e-9 && RB4.cornSame.splash===30 && Math.abs(RB4.cornSame.ratio-0.40)<1e-9;
    if(!c1) pass=false;
    notes.push('corn 同格（B@390）：直中='+(+RB4.cornSame.A_lost).toFixed(1)+'(期望15) · 同格溅射='+(+RB4.cornSame.B_lost).toFixed(1)+'(期望6=15×0.40) splash='+RB4.cornSame.splash+'/ratio='+RB4.cornSame.ratio+' → '+(c1?'未变':'异常'));
    const c2 = Math.abs(RB4.melon.A_lost-65)<1e-9 && Math.abs(RB4.melon.B_lost-35.75)<1e-9 && RB4.melon.splash===55 && Math.abs(RB4.melon.ratio-0.55)<1e-9 && RB4.melon.grid===false;
    if(!c2) pass=false;
    notes.push('melon 跨格对照（B@440 落点400跨入col4）：直中='+(+RB4.melon.A_lost).toFixed(1)+'(期望65) · 溅射='+(+RB4.melon.B_lost).toFixed(2)+'(期望35.75=65×0.55) splash='+RB4.melon.splash+'/ratio='+RB4.melon.ratio+' · splashGrid='+RB4.melon.grid+'(期望false) → '+(c2?'未变':'异常'));
    const c3 = Math.abs(RB4.icemelon.A_lost-65)<1e-9 && Math.abs(RB4.icemelon.B_lost-35.75)<1e-9 && RB4.icemelon.splash===55 && Math.abs(RB4.icemelon.ratio-0.55)<1e-9 && RB4.icemelon.grid===false;
    const c4 = RB4.icemelon.B_slowT>=1.9;                    // 溅射也施加 chill（v1.5 决议1 全命中减速）
    if(!(c3&&c4)) pass=false;
    notes.push('icemelon 跨格：直中='+(+RB4.icemelon.A_lost).toFixed(1)+'(期望65) · 溅射='+(+RB4.icemelon.B_lost).toFixed(2)+'(期望35.75) splash='+RB4.icemelon.splash+'/ratio='+RB4.icemelon.ratio+' · splashGrid='+RB4.icemelon.grid+'(期望false) → '+(c3?'未变':'异常'));
    notes.push('icemelon 溅射邻体 B slowT='+(+(RB4.icemelon.B_slowT||0)).toFixed(3)+'(期望≈2.0，溅射也减速) → '+(c4?'OK':'异常'));
    notes.push('corn 同格溅射 B@390 freezeT='+RB4.cornSame.B_freezeT+'(期望0，溅射不定身) → '+(RB4.cornSame.B_freezeT===0?'OK':'异常'));
    push('R-B-4','溅射分级：corn 同格锁（邻格0/同格6）· melon/icemelon 无锁跨格照溅 35.75 · icemelon 溅射邻体仍减速', pass, notes);
  }

  // ---- R-B 视觉证据：cabbage 弹体飞行帧 + 溅射命中帧 ----
  await evalPage(`(function(){ window.__h.freeze(); level=LEVELS[1]; levelNo=1; DIFF='normal';
    const row=2, flatY=GRID_Y+row*CELL_H+CELL_H/2;
    const pr=window.__h.realPr('cabbage',2,row,650);
    const A=window.__h.mkZ(row, 415, 1000, 0), B=window.__h.mkZ(row, 430, 1000, 0);
    zombies=[A,B]; projectiles=[pr];
    // 弹体摆到命中点上方飞行中（未命中）→ 飞行帧
    pr.x=380; pr.y=flatY-70; render(); return true; })()`);
  await sleep(200);
  await shot('v17-cabbage-flight.png');
  const RB_vis = await evalPage(`(function(){ window.__h.freeze(); level=LEVELS[1]; levelNo=1; DIFF='normal';
    const row=2, flatY=GRID_Y+row*CELL_H+CELL_H/2;
    const pr=window.__h.realPr('cabbage',2,row,700);
    const A=window.__h.mkZ(row, 415, 1000, 0), B=window.__h.mkZ(row, 390, 1000, 0);
    zombies=[A,B]; projectiles=[pr]; pr.x=400; pr.y=flatY;
    updateProjectiles(0.0001);            // 触发直中+溅射+spawnBurst
    render();
    const s=window.__h.snap();
    // 命中点附近橙色爆点像素（主体色系：r 明显高于 b）
    let burstColor=null;
    for(let dx=-8;dx<=8;dx++){ const c=window.__h.px(400+dx, flatY-10, s); const R=String(c).split(',').map(Number);
      if(R[0]>150 && R[0]>R[2]+40){ burstColor=c; break; } }
    return { burstColor:burstColor, A_lost:1000-A.hp, B_lost:1000-B.hp, effects:effects.length };
  })()`);
  await sleep(200);
  await shot('v17-cabbage-splash.png');
  {
    const pass = RB_vis.A_lost===20 && RB_vis.B_lost===8 && RB_vis.effects>0;
    push('R-B-5','cabbage 溅射视觉证据：飞行帧 + 命中帧（含爆点粒子）', pass, [
      '飞行帧: v17-cabbage-flight.png · 命中帧: v17-cabbage-splash.png',
      '命中帧（B@390 同格摆位）：A 掉血='+RB_vis.A_lost+'(期望20) B 掉血='+RB_vis.B_lost+'(期望8 同格溅射) · effects(爆点粒子)='+RB_vis.effects+'(期望>0)',
      '命中点附近橙色爆点像素采样='+JSON.stringify(RB_vis.burstColor)+'（spawnBurst(pr.x,zy,\'orange\',14)）'
    ]);
  }

  // ==========================================================================
  // R-A · 黄油加强复核（27% / 3.0s）
  // ==========================================================================
  // ---- R-A-1 · 命中当刻 freezeT===3.0；1 tick 后 ∈ (2.9,3.0] ----
  // ---- R-A-2 · 三停：移动/动画/walk 与 啃食目标 dur 完全停 ----
  // ---- R-A-3 · 到期恢复（3.33s > 3.0s 后恢复移动、freezeT 归零）----
  const RA1 = await evalPage(`(function(){
    window.__h.freeze(); level=LEVELS[1]; levelNo=1; DIFF='normal';
    const row=2, flatY=GRID_Y+row*CELL_H+CELL_H/2; const out={};
    // 命中：freezeT 立即=3.0
    {
      window.__h.clearWorld();
      const z=window.__h.mkZ(row, 435, 1000, 30); zombies=[z];
      projectiles=[{x:400,y:flatY,flatY:flatY,yOff:0,vx:220,dmg:15,row:row,type:'corn',splash:30,splashRatio:0.40,butter:true,dead:false}];
      updateProjectiles(0.0001);
      out.freezeOnHit=(z.freezeT==null?0:z.freezeT); out.hitLost=1000-z.hp;
      updateZombies(1/60); out.freezeAfterTick=(z.freezeT==null?0:z.freezeT);
    }
    // 三停① 移动/动画
    {
      window.__h.clearWorld();
      const z=window.__h.mkZ(row, 700, 1000, 60); zombies=[z]; applyFreeze(z);
      const x0=z.x, w0=z.walk; let maxdx=0, maxdw=0;
      for(let i=0;i<120;i++){ updateZombies(1/60); maxdx=Math.max(maxdx,Math.abs(z.x-x0)); maxdw=Math.max(maxdw,Math.abs(z.walk-w0)); }
      out.move={maxdx:maxdx, maxdw:maxdw};
    }
    // 三停② 啃食
    {
      window.__h.clearWorld();
      const pl=window.__h.setPlant('nut',2,2); pl.dur=1000; pl.maxDur=1000; plants=[pl];
      const pos=gridToPos(2,2);
      const z=window.__h.mkZ(2, pos.x+20, 1000, 0); z.eating=true; zombies=[z]; applyFreeze(z);
      const d0=pl.dur;
      for(let i=0;i<120;i++) updateZombies(1/60);
      out.eat={durLost:d0-plants[0].dur, eating:!!(zombies[0]&&zombies[0].eating), durLeft:plants[0].dur};
    }
    // 到期恢复
    {
      window.__h.clearWorld();
      const z=window.__h.mkZ(row, 700, 1000, 60); zombies=[z]; applyFreeze(z);
      const x0=z.x;
      for(let i=0;i<200;i++) updateZombies(1/60);   // 3.33s > 3.0s
      out.recover={x0:x0, x1:z.x, moved:(z.x<x0), freezeT:(z.freezeT==null?0:z.freezeT)};
    }
    return out;
  })()`);
  {
    let pass=true; const notes=[];
    const c0 = RA1.freezeOnHit===3.0 && RA1.freezeAfterTick>2.9 && RA1.freezeAfterTick<=3.0;
    if(!c0) pass=false;
    notes.push('黄油命中：freezeT 命中当刻='+RA1.freezeOnHit+'(期望3.0) · 僵尸掉血='+(+RA1.hitLost).toFixed(1)+' · 经 1 tick='+(+RA1.freezeAfterTick).toFixed(4)+'（区间 (2.9,3.0]）→ '+(c0?'OK':'异常'));
    const c1 = RA1.move.maxdx===0 && RA1.move.maxdw===0;
    if(!c1) pass=false;
    notes.push('三停① 移动/动画：2.0s 内 x 位移峰值='+RA1.move.maxdx+' · walk 增量峰值='+RA1.move.maxdw+'(均期望0) → '+(c1?'完全静止':'异常'));
    const c2 = RA1.eat.durLost===0 && RA1.eat.eating===false;
    if(!c2) pass=false;
    notes.push('三停② 啃食：2.0s 内目标 dur 衰减='+RA1.eat.durLost+'(期望0) · 剩余 dur='+RA1.eat.durLeft+' · eating='+RA1.eat.eating+'(期望 false) → '+(c2?'完全停啃':'异常'));
    const c3 = RA1.recover.moved && RA1.recover.freezeT===0;
    if(!c3) pass=false;
    notes.push('到期恢复：3.33s(>3.0s) 后 位移 '+(+RA1.recover.x0).toFixed(1)+'→'+(+RA1.recover.x1).toFixed(1)+' moved='+RA1.recover.moved+' freezeT='+RA1.recover.freezeT+' → '+(c3?'恢复原速':'异常'));
    push('R-A-1','黄油命中完全定身 3.0s：命中当刻 freezeT===3.0 · 三停（移动/动画/啃食）+ 到期恢复', pass, notes);
  }

  // ---- R-A-2 · 概率统计 ≈27%（N=4000，发射时掷定）----
  const RA2 = await evalPage(`(function(){
    window.__h.freeze(); level=LEVELS[1]; levelNo=1; DIFF='normal';
    window.__h.clearWorld();
    const p=window.__h.setPlant('corn',2,2); plants=[p];
    zombies=[window.__h.mkZ(2, 900, 1e9, 0)];
    const N=4000; let butter=0, tagged=0, missing=0, nonBool=0, butterFalse=0;
    for(let i=0;i<N;i++){
      p.cd=0; projectiles=[];
      updatePlant(p, 1/60);
      const pr=projectiles[projectiles.length-1];
      if(!pr){ missing++; continue; }
      if(typeof pr.butter==='boolean') tagged++; else nonBool++;
      if(pr.butter===true) butter++;
      if(pr.butter===false) butterFalse++;
    }
    return {N:N, butter:butter, frac:butter/N, tagged:tagged, missing:missing, nonBool:nonBool, butterFalse:butterFalse};
  })()`);
  {
    const inBand = RA2.frac>=0.24 && RA2.frac<=0.30;      // 期望 0.27；N=4000 ⇒ σ≈0.0070，±0.03 约 4.3σ
    // ★ 口径校正（QA 2026-09-22）：源码 fireArcProjectile L1389 = 「字段存在性语义」
    //   `if(spec.butter)pr.butter=true;` ⇒ 仅黄油弹携带 butter 字段；普通弹**无该字段**（undefined）。
    //   故正确判据 =「带 boolean 字段弹数 === 黄油弹数」且「butter===false 恒 0」，而非旧
    //   v16-acceptance C2 的「tagged===N && nonBool===0」（该判据与源码矛盾，取不到绿，见报告 §4）。
    const flagContract = RA2.tagged===RA2.butter && RA2.butterFalse===0 && RA2.missing===0 && RA2.nonBool===(RA2.N-RA2.butter);
    const pass = inBand && flagContract;
    push('R-A-2','27% 黄油弹：发射瞬间即掷定（发射时带 butter 标记 + 概率≈27%）', pass, [
      '发射 '+RA2.N+' 次：黄油='+RA2.butter+' 占比='+(RA2.frac*100).toFixed(2)+'%（期望 27%，接受区间 24%–30%）→ '+(inBand?'符合':'异常'),
      '发射瞬间（未跑 updateProjectiles）：黄油弹='+RA2.butter+' 均 butter===true · 普通弹无 butter 字段='+RA2.nonBool+'（期望 '+(RA2.N-RA2.butter)+'）· 显式 false='+RA2.butterFalse+'(期望0，字段存在性语义) · 缺弹='+RA2.missing,
      '判据：带 boolean 字段弹数('+RA2.tagged+') === 黄油弹数('+RA2.butter+') 且 false 恒 0 ⇒ 掷定确在发射时（非命中时）→ '+(flagContract?'OK':'异常'),
      '源事实：updatePlant L1471 `const butter=Math.random()<0.27;` → fireArcProjectile L1389 `if(spec.butter)pr.butter=true;`'
    ]);
  }

  // ==========================================================================
  // 汇总
  // ==========================================================================
  await evalPage('window.__h.restore(); true');
  const allPass = RESULTS.every(r=>r.pass);
  console.log('\n================ v1.8 同格锁·真机验收汇总 ================');
  for(const r of RESULTS) console.log('  ['+(r.pass?'PASS':'FAIL')+'] '+r.id+' · '+r.title);
  console.log('  子项: '+RESULTS.filter(r=>r.pass).length+'/'+RESULTS.length+' 通过');
  console.log('  总判定: '+(allPass?'PASS':'FAIL'));
  fs.writeFileSync(path.join(OUT,'v17-acceptance-results.json'),
    JSON.stringify({generated:new Date().toISOString(), target:VER, page:PAGE, overall:allPass?'PASS':'FAIL', results:RESULTS}, null, 2));

  ws.close();
  try{ e.kill() }catch(_){}
  await sleep(400);
  try{ fs.rmSync(TMP,{recursive:true,force:true}) }catch(_){}
  process.exit(allPass?0:1);
})().catch(er=>{ console.error('FAIL', er && er.stack || er.message); process.exit(1); });
