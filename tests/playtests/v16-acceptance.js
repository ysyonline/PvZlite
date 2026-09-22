// ============================================================================
// v1.6「三刀」真机验收脚本  ·  V16-QA-01  ·  QA 严守真
// ----------------------------------------------------------------------------
// 运行：Node 直跑（Edge headless=new + CDP + Runtime.evaluate + 像素判读）
//   node tests/playtests/v16-acceptance.js
// 只读 plants-vs-zombies.html，不修改任何源码；产物落 tests/playtests/。
// 验收三刀：
//   bug1  震动/闪光衰减迁位（loop 无条件段；menu/play/end 三态须衰减至 0）
//   bug2  斜坡列直射规则（level.roof && col<ROOF_COLS ⇒ 撞壁消失·不命中；投掷类免疫；平台列照常）
//   corn  黄油重做（100/15/2.6s/溅射30·40%；27% 发射时掷定；命中完全定身 3.0s；仅直中定身）
// 运行会重写 v16-acceptance-results.json 与 v16-*.png —— 属预期行为。
// ============================================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { execFile } = require('child_process');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9352;                                   // 换空闲端口，避开 v15 样板 9351
const TMP  = path.join(process.cwd(), '.tmp-v16-acc');
const OUT  = path.join(process.cwd(), 'tests', 'playtests');
const PAGE = 'file:///' + process.cwd().replace(/\\/g, '/') + '/plants-vs-zombies.html';

function get(u){ return new Promise((res,rej)=>{ http.get(u,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d))}).on('error',rej) }); }
const sleep = ms => new Promise(r=>setTimeout(r,ms));
// 通道级颜色差（逐通道最大绝对差）
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
    window.__v16 = window.__v16 || {};
    window.__v16._dp = drawPause;
    window.__v16.freeze = function(){ state='play'; paused=true; drawPause=function(){}; toastT=0; warn.active=false; try{muted=true}catch(_){} };
    window.__v16.restore = function(){ drawPause = window.__v16._dp; };
    window.__v16.clearWorld = function(){ plants=[];zombies=[];projectiles=[];effects=[];pointDrops=[];spawnQueue=[];waveActive=false; };
    window.__v16.snap = function(){ const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const x=c.getContext('2d');x.drawImage(canvas,0,0);return x; };
    window.__v16.px = function(sx,sy,sz){ return Array.from(sz.getImageData(sx,sy,1,1).data).slice(0,3).join(','); };
    // 整屏网格最大通道差（帧差量化：>0=画面在动；0=完全静止）
    window.__v16.gridMaxDiff = function(a,b,step){ step=step||24; let m=0;
      for(let y=4;y<canvas.height;y+=step){ for(let x=4;x<canvas.width;x+=step){
        const A=a.getImageData(x,y,1,1).data, B=b.getImageData(x,y,1,1).data;
        m=Math.max(m,Math.abs(A[0]-B[0]),Math.abs(A[1]-B[1]),Math.abs(A[2]-B[2])); } } return m; };
    window.__v16.storeSnap = function(tag){ window.__v16['_s'+tag] = window.__v16.snap(); };
    window.__v16.diffStored = function(tag){ return window.__v16.gridMaxDiff(window.__v16['_s'+tag], window.__v16.snap()); };
    window.__v16.mkZ = function(row,x,hp,spd,slowT){ const z={type:'normal',row:row,x:x,hp:hp,maxHp:hp,spd:spd,eating:false,eatAnim:0,walk:0,dead:false}; if(slowT!=null)z.slowT=slowT; return z; };
    window.__v16.setPlant = function(type,col,row){ const p=spawnPlant(type,col,row,0); p.plantT=620; p.plantDone=true; p.cd=0; return p; };
    return 'helpers ok';
  })()`;
  console.log('[helper]', await evalPage(helper));

  // ==========================================================================
  // env · 版本自证（确保验收对象是目标版本源码；默认 v1.6，可经 PVZ_EXPECT_VER 覆盖）
  // ==========================================================================
  const EXPECT_VER = process.env.PVZ_EXPECT_VER || '1.6';   // 缺省保持历史行为（v1.6 自证可复现）
  const VER = await evalPage('VERSION');
  push('env','验收对象版本自证', String(VER).indexOf(EXPECT_VER)>=0, [
    'VERSION='+JSON.stringify(VER)+'（期望含 '+EXPECT_VER+'，可经 PVZ_EXPECT_VER 覆盖）',
    '源码 L49 常量（只读）'
  ]);

  // ==========================================================================
  // bug1 · 震动/闪光衰减迁位（loop 无条件段，须覆盖 menu/play/end 三态）
  // ==========================================================================
  async function decayRun(stName){
    await evalPage(`(function(){ window.__v16.freeze(); level=LEVELS[1]; DIFF='normal'; window.__v16.clearWorld();
      state='${stName}'; screenShake.t=0; flashT=0; triggerShake(6,300); triggerFlash('#fff',1.0); return true; })()`);
    const series=[];
    for(let i=0;i<60;i++){
      const s = await evalPage(`(function(){ const o=getShakeOffset(); return {t:screenShake.t, f:flashT, m:Math.hypot(o.x,o.y)}; })()`);
      series.push(s);
      if(s.t<=0 && s.f<=0) break;
      await sleep(50);
    }
    return series;
  }
  function analyzeSeries(series){
    let mono=true;
    for(let i=1;i<series.length;i++){
      if(series[i].t > series[i-1].t + 1e-6) mono=false;
      if(series[i].f > series[i-1].f + 1e-6) mono=false;
    }
    const first=series[0], last=series[series.length-1];
    const startPos = first.t>0 && first.f>0;
    const reachedZero = last.t<=0 && last.f<=0;
    const magZero = Math.abs(last.m)<=1e-9;
    const declined = series.length>=3;
    return {mono:mono, startPos:startPos, reachedZero:reachedZero, magZero:magZero, declined:declined,
            n:series.length, firstT:first.t, firstF:first.f, lastT:last.t, lastF:last.f, lastM:last.m};
  }
  const D_menu = analyzeSeries(await decayRun('menu'));
  const D_play = analyzeSeries(await decayRun('play'));
  const D_end  = analyzeSeries(await decayRun('end'));
  {
    let pass=true; const notes=[];
    for(const [st,D] of [['menu',D_menu],['play',D_play],['end',D_end]]){
      const ok = D.mono && D.startPos && D.reachedZero && D.magZero && D.declined;
      if(!ok) pass=false;
      notes.push(st+': 采样 '+D.n+' 帧 · 起(shake='+D.firstT.toFixed(3)+',flash='+D.firstF.toFixed(3)+') → 末(shake='+D.lastT.toFixed(3)+',flash='+D.lastF.toFixed(3)+') · 单调不增='+D.mono+' 衰减至0='+D.reachedZero+' 偏移幅值0='+D.magZero+' → '+(ok?'OK':'异常'));
    }
    notes.push('源事实：loop() 无条件段 L752–753 `if(screenShake.t>0)screenShake.t-=dt; if(flashT>0)flashT-=dt;`（update() 仅 play 态跑 ⇒ 迁位前 end 态永不衰减=bug1）');
    push('B1a','震动/闪光计时器 menu/play/end 三态单调衰减至 0（迁位生效）', pass, notes);
  }

  // ---- bug1-b · play 态闪光照度像素衰减（真机像素证据）----
  await evalPage(`(function(){ window.__v16.freeze(); level=LEVELS[1]; DIFF='normal'; window.__v16.clearWorld();
    flashT=0; screenShake.t=0; state='play'; render(); return true; })()`);
  const F_base = await evalPage(`(function(){ const s=window.__v16.snap(); return window.__v16.px(500,300,s); })()`);
  const F_brt  = await evalPage(`(function(){ triggerFlash('#fff',0.5); render(); const s=window.__v16.snap(); return {px:window.__v16.px(500,300,s), f:flashT}; })()`);
  await sleep(950);
  const F_aft  = await evalPage(`(function(){ render(); const s=window.__v16.snap(); return {px:window.__v16.px(500,300,s), f:flashT}; })()`);
  {
    const brightened = diff(F_base, F_brt.px, 30);
    const restored   = near(F_aft.px, F_base, 6) && F_aft.f<=0;
    const pass = brightened && restored && F_brt.f>0;
    push('B1b','play 态闪光照度像素：触发即增亮、随时间衰减回原样', pass, [
      '触发前像素 rgb('+F_base+')',
      '闪光置入后 flashT='+F_brt.f.toFixed(3)+'s 像素 rgb('+F_brt.px+')（渲染时 globalAlpha=0.4·max(0,flashT/0.08) 上限 1）→ 显著增亮='+brightened,
      '0.95s 后 flashT='+F_aft.f.toFixed(3)+'s 像素 rgb('+F_aft.px+') → 复原(≤6 通道差)='+restored
    ]);
  }

  // ---- bug1-c · end 态结算屏不再永久抖动（抖动期帧差≠0；衰减后帧差=0）----
  await evalPage(`(function(){ window.__v16.freeze(); level=LEVELS[1]; DIFF='normal'; window.__v16.clearWorld();
    won=false; wave=5; endStats={run:0,clear:0,total:0}; state='end'; screenShake.t=0; flashT=0; triggerShake(6,300); return true; })()`);
  await sleep(30);
  await shot('v16-bug1-end-shake.png');
  await evalPage(`(function(){ window.__v16.storeSnap('A'); return true; })()`);
  await sleep(50);
  const shakeDiff = await evalPage(`(function(){ return window.__v16.diffStored('A'); })()`);
  let settled=false;
  for(let i=0;i<40;i++){ const tt=await evalPage('screenShake.t'); if(tt<=0){ settled=true; break; } await sleep(50); }
  await evalPage(`(function(){ screenShake.t=0; render(); window.__v16.storeSnap('B'); return true; })()`);
  await sleep(60);
  const settleDiff = await evalPage(`(function(){ return window.__v16.diffStored('B'); })()`);
  await shot('v16-bug1-end-settled.png');
  {
    const pass = settled && shakeDiff>0 && settleDiff===0;
    push('B1c','end 态结算屏：抖动期帧差≠0、衰减至 0 后帧差=0（不再永久抖动）', pass, [
      '结算屏（state=end + 空世界，drawEnd 静态无动画）触发 triggerShake(6,300)',
      '抖动期 50ms 间隔帧差（整屏网格最大通道差）='+shakeDiff+' → '+(shakeDiff>0?'画面在抖（偏移随 performance.now 变化）':'异常：静止'),
      'screenShake.t 衰减至 0：'+settled,
      '衰减后 50ms 间隔帧差='+settleDiff+'（期望 0，画面完全静止）',
      '证据图: v16-bug1-end-shake.png / v16-bug1-end-settled.png'
    ]);
  }

  // ==========================================================================
  // bug2 · 斜坡列直射规则（level.roof && col<ROOF_COLS=5）
  // ==========================================================================
  // ---- bug2-a · slopeWall 标记矩阵（斜坡列 vs 平台列；严禁用 liftX>0 判定）----
  const B2A = await evalPage(`(function(){
    window.__v16.freeze(); level=LEVELS[5]; levelNo=5; DIFF='normal';
    function fire(type,col,row){
      window.__v16.clearWorld();
      const p=window.__v16.setPlant(type,col,row); plants=[p];
      zombies=[window.__v16.mkZ(row, gridToPos(col,row).x+300, 1000, 0)];
      updatePlant(p, 1/60);
      return projectiles.map(pr=>({type:pr.type, hasSW:('slopeWall' in pr), slopeWall:(pr.slopeWall===undefined?null:pr.slopeWall), xt:pr.xt, x0:pr.x0, lift0:pr.lift0}));
    }
    const out={};
    out.pea_slope     = fire('pea',1,2);
    out.pea_plat      = fire('pea',6,2);
    out.snowpea_slope = fire('snowpea',1,2);
    out.snowpea_plat  = fire('snowpea',6,2);
    out.double_slope  = fire('double',1,2);
    out.corn_slope    = fire('corn',1,2);
    out.melon_slope   = fire('melon',1,2);
    out.icemelon_slope= fire('icemelon',1,2);
    out.cabbage_slope = fire('cabbage',1,2);
    out.lift_platCol6 = liftX(gridToPos(6,2).x);   // 平台列自身 liftX（=60>0，证明不能用 liftX>0 判斜）
    out.lift_slopeCol1= liftX(gridToPos(1,2).x);
    out.xt_expect     = GRID_X+ROOF_COLS*CELL_W;   // 505
    return out;
  })()`);
  {
    const sw=(arr)=> arr.length>0 && arr.every(p=>p.slopeWall===true);
    const nsw=(arr)=> arr.length>0 && arr.every(p=>p.slopeWall===false);
    const immune=(arr)=> arr.length>0 && arr.every(p=>p.slopeWall!==true);   // 投掷类：无 slopeWall 字段（undefined）
    let pass=true; const notes=[];
    const c1 = sw(B2A.pea_slope) && nsw(B2A.pea_plat);
    const c2 = sw(B2A.snowpea_slope) && nsw(B2A.snowpea_plat);
    const c3 = sw(B2A.double_slope) && B2A.double_slope.length===2;
    const c4 = immune(B2A.corn_slope) && immune(B2A.melon_slope) && immune(B2A.icemelon_slope) && immune(B2A.cabbage_slope);
    const c5 = Math.abs(B2A.xt_expect-505)<1e-9;
    if(!(c1&&c2&&c3&&c4&&c5)) pass=false;
    notes.push('直射·斜坡列 col1: pea='+JSON.stringify(B2A.pea_slope.map(p=>p.slopeWall))+' snowpea='+JSON.stringify(B2A.snowpea_slope.map(p=>p.slopeWall))+' double='+JSON.stringify(B2A.double_slope.map(p=>p.slopeWall))+' → '+(c1&&c2&&c3?'全 slopeWall=true':'异常'));
    notes.push('直射·平台列 col6: pea='+JSON.stringify(B2A.pea_plat.map(p=>p.slopeWall))+' snowpea='+JSON.stringify(B2A.snowpea_plat.map(p=>p.slopeWall))+' → '+(nsw(B2A.pea_plat)&&nsw(B2A.snowpea_plat)?'全 slopeWall=false（照常命中）':'异常'));
    notes.push('投掷类·斜坡列 col1: corn='+JSON.stringify(B2A.corn_slope.map(p=>p.slopeWall))+' melon='+JSON.stringify(B2A.melon_slope.map(p=>p.slopeWall))+' icemelon='+JSON.stringify(B2A.icemelon_slope.map(p=>p.slopeWall))+' cabbage='+JSON.stringify(B2A.cabbage_slope.map(p=>p.slopeWall))+' → '+(c4?'均无 slopeWall=true（免疫）':'异常'));
    notes.push('★反例证据：平台列 col6 自身 liftX='+(+B2A.lift_platCol6).toFixed(2)+' >0 且 > 斜坡列 col1 liftX='+(+B2A.lift_slopeCol1).toFixed(2)+' ⇒ 若用 liftX>0 判斜会误伤平台列（源码口径 level.roof&&col<ROOF_COLS 正确）');
    notes.push('折角立面 xt=GRID_X+ROOF_COLS*CELL_W='+B2A.xt_expect+'（期望 505）→ '+(c5?'OK':'异常'));
    push('B2a','slopeWall 标记矩阵：斜坡直射=true / 平台直射=false / 投掷类免疫', pass, notes);
  }

  // ---- bug2-b · 斜坡列直射弹撞壁消失·不命中任何僵尸（含对照）----
  const B2B = await evalPage(`(function(){
    window.__v16.freeze(); level=LEVELS[5]; levelNo=5; DIFF='normal';
    function scenario(type,col,zx){
      window.__v16.clearWorld();
      const p=window.__v16.setPlant(type,col,2); plants=[p];
      const z=window.__v16.mkZ(2, zx, 1000, 0); zombies=[z];
      const hp0=z.hp; let fired=false, maxProj=0, minGap=1e9;
      for(let i=0;i<360;i++){                    // 6.0s
        updatePlant(p, 1/60);
        updateProjectiles(1/60);
        if(projectiles.length>0){ fired=true; maxProj=Math.max(maxProj, projectiles.length);
          for(const pr of projectiles) minGap=Math.min(minGap, Math.abs(z.x-pr.x)); }
      }
      return {fired:fired, maxProj:maxProj, hpLost:hp0-z.hp, minGap:(minGap===1e9?null:minGap), projLeft:projectiles.length};
    }
    return {
      slopePea:   scenario('pea',1,400),
      platPea:    scenario('pea',6,800),
      slopeCorn:  scenario('corn',1,400),
      slopeMelon: scenario('melon',1,400)
    };
  })()`);
  {
    let pass=true; const notes=[];
    const s=B2B.slopePea, pl=B2B.platPea;
    // 斜坡 pea：开火、弹体消失、僵尸毫发无损、全程未接近命中窗口(|Δx|<42)
    const c1 = s.fired && s.hpLost===0 && s.projLeft===0 && (s.minGap===null || s.minGap>42);
    if(!c1) pass=false;
    notes.push('斜坡列 pea(col1)→僵尸x=400: 开火='+s.fired+'(峰值弹数'+s.maxProj+') 僵尸掉血='+s.hpLost+'(期望0) 残余弹='+s.projLeft+' 最小|Δx|='+(s.minGap===null?'—':(+s.minGap).toFixed(1))+'px(>42 命中窗) → '+(c1?'撞壁消失·未命中':'异常'));
    // 平台 pea：照常命中
    const c2 = pl.fired && pl.hpLost>=20;
    if(!c2) pass=false;
    notes.push('平台列 pea(col6)→僵尸x=800: 开火='+pl.fired+' 僵尸掉血='+(+pl.hpLost).toFixed(1)+'(期望≥20) → '+(c2?'照常命中':'异常'));
    // 投掷类免疫
    const c3 = B2B.slopeCorn.fired && B2B.slopeCorn.hpLost>0;
    const c4 = B2B.slopeMelon.fired && B2B.slopeMelon.hpLost>0;
    if(!(c3&&c4)) pass=false;
    notes.push('斜坡列 corn(col1)→僵尸x=400: 掉血='+(+B2B.slopeCorn.hpLost).toFixed(1)+'(期望>0，免疫) → '+(c3?'命中':'异常'));
    notes.push('斜坡列 melon(col1)→僵尸x=400: 掉血='+(+B2B.slopeMelon.hpLost).toFixed(1)+'(期望>0，免疫) → '+(c4?'命中':'异常'));
    notes.push('三判据红线：撞壁弹在 updateProjectiles 内 `continue` 短路，全程跳过僵尸命中判定 ⇒ 上表斜坡 pea 掉血恒 0');
    push('B2b','斜坡列直射弹撞壁消失·不命中任何僵尸（对照平台列命中 / 投掷类免疫）', pass, notes);
  }

  // ---- bug2-c · 保留开火动作与音效（斜坡列直射仍进入射击循环 + SFX.shoot 计数）----
  const B2C = await evalPage(`(function(){
    window.__v16.freeze(); level=LEVELS[5]; levelNo=5; DIFF='normal';
    let shots=0; const _shoot=SFX.shoot; SFX.shoot=function(){ shots++; return _shoot.apply(this,arguments); };
    window.__v16.clearWorld();
    const p=window.__v16.setPlant('pea',1,2); plants=[p];
    zombies=[window.__v16.mkZ(2, 400, 1000, 0)];
    let fired=false, cdAfterFire=null;
    for(let i=0;i<150;i++){                    // 2.5s → 至少 1 次开火
      updatePlant(p, 1/60); updateProjectiles(1/60);
      if(projectiles.length>0){ fired=true; if(cdAfterFire===null) cdAfterFire=p.cd; }
    }
    SFX.shoot=_shoot;
    return {shots:shots, fired:fired, cdAfterFire:cdAfterFire, cdEngaged:(cdAfterFire!==null&&cdAfterFire>0)};
  })()`);
  {
    const pass = B2C.fired && B2C.shots>0 && B2C.cdEngaged;
    push('B2c','斜坡列直射保留开火动作与音效（进入射击循环 + SFX.shoot 计数>0）', pass, [
      '斜坡列 pea(col1) 2.5s 内：开火='+B2C.fired+' · SFX.shoot 调用='+B2C.shots+' 次 · 首次开火后植物 cd='+(B2C.cdAfterFire===null?'—':(+B2C.cdAfterFire).toFixed(3))+'s(>0 进入循环)',
      '源事实：updatePlant 直射分支仍 push 弹体并调 SFX.shoot()，仅弹体带 slopeWall 标记（撞壁在 updateProjectiles 生效）'
    ]);
  }

  // ---- bug2-d · 撞壁三判据（① 坡面相交 ② 折角立面 xt=505 ③ 最小飞行 30px）----
  const B2D = await evalPage(`(function(){
    window.__v16.freeze(); level=LEVELS[5]; levelNo=5; DIFF='normal';
    const row=2, flatY=GRID_Y+row*CELL_H+CELL_H/2, XT=GRID_X+ROOF_COLS*CELL_W;
    function run(pr, maxSteps){
      pr.dead=false; projectiles=[pr];
      let deathX=null, deathReason=null, diedBelow30=false;
      for(let i=0;i<maxSteps;i++){
        if(pr.dead) break;
        updateProjectiles(1/240);
        if(pr.dead){
          deathX=pr.x; const dx=pr.x-pr.x0;
          if(dx<30) diedBelow30=true;
          deathReason = (pr.x>=pr.xt)?'xt':((liftX(pr.x)-pr.lift0>=pr.yOff)?'slope':'?');
        }
      }
      return {dead:pr.dead, deathX:deathX, deathDX:(deathX===null?null:deathX-pr.x0), deathReason:deathReason, diedBelow30:diedBelow30, finalX:pr.x};
    }
    function mk(x0,yOff){ const lo=liftX(x0);
      return {x:x0, y:flatY-lo-yOff, flatY:flatY, yOff:yOff, vx:200, dmg:0, row:row, type:'pea', splash:0,
              dead:false, slopeWall:true, x0:x0, xt:XT, lift0:lo}; }
    const out={};
    out.xt = XT;
    out.slopeHit  = run(mk(200, 8), 4000);        // ① 坡面相交（liftX 追上固定 y）
    out.floorHit  = run(mk(490, 9999), 4000);     // ③ yOff 极大 ⇒ 只可能由 ② xt 触发；验证 30px 下限
    return out;
  })()`);
  {
    let pass=true; const notes=[];
    const c1 = Math.abs(B2D.xt-505)<1e-9;
    // ① 坡面相交：deathReason='slope'，且满足 30px 下限
    const s=B2D.slopeHit;
    const c2 = s.dead && s.deathReason==='slope' && s.diedBelow30===false && s.deathDX>=30;
    // ③ 最小飞行 30px：yOff 极大时 xt 是唯一触发源，撞点应贴在 30px 下限（>15px 折角处）
    const f=B2D.floorHit;
    const c3 = f.dead && f.deathReason==='xt' && f.diedBelow30===false && f.deathDX>=30 && f.deathDX<32;
    if(!(c1&&c2&&c3)) pass=false;
    notes.push('② 折角立面 xt=GRID_X+ROOF_COLS*CELL_W='+B2D.xt+'（期望 505）→ '+(c1?'OK':'异常'));
    notes.push('① 坡面相交 (x0=200,yOff=8): 撞点 x='+(s.deathX===null?'—':(+s.deathX).toFixed(2))+' Δx='+(s.deathDX===null?'—':(+s.deathDX).toFixed(2))+' 判据='+s.deathReason+' dx<30 误触='+s.diedBelow30+' → '+(c2?'符合（坡面追上固定 y 弹体）':'异常'));
    notes.push('③ 最小飞行 30px (x0=490,yOff=9999 ⇒ 仅 xt 可触发): 撞点 x='+(f.deathX===null?'—':(+f.deathX).toFixed(2))+' Δx='+(f.deathDX===null?'—':(+f.deathDX).toFixed(2))+' 判据='+f.deathReason+' dx<30 误触='+f.diedBelow30);
    notes.push('   → 折角 xt=505 于 Δx=15 处本可触发，但被 `pr.x-pr.x0>=30` 下限拦截；实测撞点 Δx='+(f.deathDX===null?'—':(+f.deathDX).toFixed(2))+'px 贴 30px 下限 ⇒ 30px 最小飞行生效');
    push('B2d','撞壁三判据：① 坡面相交 ② 折角立面 xt=505 ③ 最小飞行 30px', pass, notes);
  }

  // bug2 视觉证据：斜坡列开火场景一帧
  await evalPage(`(function(){ window.__v16.freeze(); level=LEVELS[5]; levelNo=5; DIFF='normal'; window.__v16.clearWorld();
    const p=window.__v16.setPlant('pea',1,2); plants=[p];
    zombies=[window.__v16.mkZ(2, 400, 1000, 0)];
    for(let i=0;i<4;i++){ updatePlant(p,1/60); updateProjectiles(1/60); }   // 让弹体在坡面飞行中
    render(); return true; })()`);
  await sleep(200);
  await shot('v16-bug2-roof-slope.png');

  // ==========================================================================
  // corn · 黄油重做
  // ==========================================================================
  // ---- corn-a · 数值（cost100 / 单发15 / 间隔2.6s / 溅射30·40%）----
  const CA = await evalPage(`(function(){
    window.__v16.freeze(); level=LEVELS[1]; levelNo=1; DIFF='normal';
    const card=CARDS.find(c=>c.type==='corn');
    window.__v16.clearWorld();
    const p=window.__v16.setPlant('corn',2,2); plants=[p];
    zombies=[window.__v16.mkZ(2, 700, 1000, 0)];
    updatePlant(p, 1/60);
    const pr=projectiles.find(x=>x.type==='corn');
    return {cost:card.cost, cardCd:card.cd, dur:card.dur,
            prDmg:pr&&pr.dmg, prSplash:pr&&pr.splash, prRatio:pr&&pr.splashRatio, pCdAfterFire:p.cd,
            splashDmg: (pr&&pr.splashRatio!=null)?+(pr.dmg*pr.splashRatio).toFixed(4):null};
  })()`);
  {
    const pass = CA.cost===100 && CA.prDmg===15 && Math.abs(CA.pCdAfterFire-2.6)<1e-9 && CA.prSplash===30 && Math.abs(CA.prRatio-0.40)<1e-9;
    push('C1','corn 数值：cost 100 / 单发 15 / 间隔 2.6s / 溅射 30px·40%（溅射伤害 6）', pass, [
      '卡面 cost='+CA.cost+'(期望100) cd='+CA.cardCd+' dur='+CA.dur,
      '实弹 dmg='+CA.prDmg+'(期望15) · 首次开火后植物 cd='+CA.pCdAfterFire+'(期望2.6)',
      '溅射 splash='+CA.prSplash+'px(期望30) ratio='+CA.prRatio+'(期望0.40) ⇒ 溅射伤害 15×0.40='+CA.splashDmg+'(期望6)'
    ]);
  }

  // ---- corn-b · 27% 黄油概率（发射时掷定）----
  const CB = await evalPage(`(function(){
    window.__v16.freeze(); level=LEVELS[1]; levelNo=1; DIFF='normal';
    window.__v16.clearWorld();
    const p=window.__v16.setPlant('corn',2,2); plants=[p];
    zombies=[window.__v16.mkZ(2, 900, 1e9, 0)];
    const N=4000; let butter=0, tagged=0, missing=0, nonBool=0;
    for(let i=0;i<N;i++){
      p.cd=0; projectiles=[];
      updatePlant(p, 1/60);                       // 发射瞬间（未跑 updateProjectiles）
      const pr=projectiles[projectiles.length-1];
      if(!pr){ missing++; continue; }
      if(typeof pr.butter==='boolean') tagged++; else nonBool++;
      if(pr.butter===true) butter++;
    }
    return {N:N, butter:butter, frac:butter/N, tagged:tagged, missing:missing, nonBool:nonBool};
  })()`);
  {
    const inBand = CB.frac>=0.24 && CB.frac<=0.30;      // 期望 0.27；N=4000 ⇒ σ≈0.0070，±0.03 约 4.3σ
    const emissionTagged = CB.tagged===CB.butter && CB.missing===0;   // 字段存在性语义：普通弹无 butter 字段（undefined）⇒ 带 boolean 标记数 == 黄油数
    const pass = inBand && emissionTagged;
    push('C2','27% 黄油弹：统计逼近 + 发射瞬间即带 butter 标记（发射时掷定）', pass, [
      '发射 '+CB.N+' 次：黄油='+CB.butter+' 占比='+(CB.frac*100).toFixed(2)+'%（期望 27%，接受区间 24%–30%）→ '+(inBand?'符合':'异常'),
      '发射瞬间（未跑 updateProjectiles）黄油弹即带 boolean true 标记：tagged/butter='+CB.tagged+'/'+CB.butter+'（普通弹无该字段 = '+CB.nonBool+' 个，符合字段存在性语义）；缺弹体='+CB.missing+' → '+(emissionTagged?'发射时掷定':'异常'),
      '源事实：updatePlant 内 `const butter=Math.random()<0.27;` 随 push 写入弹体 ⇒ 命中时不再掷骰'
    ]);
  }

  // ---- corn-c · 黄油命中完全定身 3.0s（三停：x / walk / dur）+ 到期恢复 ----
  const CC = await evalPage(`(function(){
    window.__v16.freeze(); level=LEVELS[1]; DIFF='normal';
    const row=2, flatY=GRID_Y+row*CELL_H+CELL_H/2; const out={};
    // 命中：freezeT 立即=3.0
    {
      window.__v16.clearWorld();
      const z=window.__v16.mkZ(row, 435, 1000, 30); zombies=[z];   // 受控直中：|Δx|=35<42 命中窗（弹体 x=400）
      projectiles=[{x:400,y:flatY-16,flatY:flatY,yOff:16,vx:220,dmg:15,row:row,type:'corn',splash:30,splashRatio:0.40,butter:true,dead:false}];
      updateProjectiles(0.0001);
      out.freezeOnHit = (z.freezeT==null?0:z.freezeT); out.hitLost = 1000-z.hp;
      // 区间式：经 1 tick updateZombies 后
      updateZombies(1/60); out.freezeAfterTick = (z.freezeT==null?0:z.freezeT);
    }
    // 三停① 移动：x 与 walk 严格不变
    {
      window.__v16.clearWorld();
      const z=window.__v16.mkZ(row, 700, 1000, 60); zombies=[z]; applyFreeze(z);
      const x0=z.x, w0=z.walk; let maxdx=0, maxdw=0;
      for(let i=0;i<120;i++){ updateZombies(1/60); maxdx=Math.max(maxdx,Math.abs(z.x-x0)); maxdw=Math.max(maxdw,Math.abs(z.walk-w0)); }
      out.move={x0:x0, x1:z.x, maxdx:maxdx, maxdw:maxdw, freezeT:(z.freezeT==null?0:z.freezeT)};
    }
    // 三停② 啃食：目标 dur 完全不减
    {
      window.__v16.clearWorld();
      const pl=window.__v16.setPlant('nut',2,2); pl.dur=1000; pl.maxDur=1000; plants=[pl];
      const pos=gridToPos(2,2);
      const z=window.__v16.mkZ(2, pos.x+20, 1000, 0); z.eating=true; zombies=[z]; applyFreeze(z);
      const d0=pl.dur;
      for(let i=0;i<120;i++) updateZombies(1/60);
      out.eat={durLost:d0-plants[0].dur, eating:!!(zombies[0]&&zombies[0].eating), durLeft:plants[0].dur};
    }
    // 到期恢复
    {
      window.__v16.clearWorld();
      const z=window.__v16.mkZ(row, 700, 1000, 60); zombies=[z]; applyFreeze(z);
      const x0=z.x;
      for(let i=0;i<200;i++) updateZombies(1/60);   // 3.33s > 3.0s
      out.recover={x0:x0, x1:z.x, moved:(z.x<x0), freezeT:(z.freezeT==null?0:z.freezeT)};
    }
    return out;
  })()`);
  {
    let pass=true; const notes=[];
    const c0 = CC.freezeOnHit===3.0 && CC.freezeAfterTick>2.9 && CC.freezeAfterTick<=3.0;
    if(!c0) pass=false;
    notes.push('黄油命中：freezeT 命中当刻='+CC.freezeOnHit+'(期望3.0) · 僵尸掉血='+(+CC.hitLost).toFixed(1)+' · 经 1 tick='+(+CC.freezeAfterTick).toFixed(4)+'（区间 (2.9,3.0]）→ '+(c0?'OK':'异常'));
    const c1 = CC.move.maxdx===0 && CC.move.maxdw===0;
    if(!c1) pass=false;
    notes.push('三停① 移动/动画：2.0s 内 x 位移峰值='+CC.move.maxdx+' · walk 增量峰值='+CC.move.maxdw+'(均期望0) → '+(c1?'完全静止':'异常'));
    const c2 = CC.eat.durLost===0 && CC.eat.eating===false;
    if(!c2) pass=false;
    notes.push('三停② 啃食：2.0s 内目标 dur 衰减='+CC.eat.durLost+'(期望0，对照 chill 的 ×0.6) · 剩余 dur='+CC.eat.durLeft+' · eating='+CC.eat.eating+'(期望 false) → '+(c2?'完全停啃':'异常'));
    const c3 = CC.recover.moved && CC.recover.freezeT===0;
    if(!c3) pass=false;
    notes.push('到期恢复：3.33s(>3.0s) 后 位移 '+(+CC.recover.x0).toFixed(1)+'→'+(+CC.recover.x1).toFixed(1)+' moved='+CC.recover.moved+' freezeT='+CC.recover.freezeT+' → '+(c3?'恢复原速':'异常'));
    push('C3','黄油命中完全定身 3.0s：移动/啃食/动画三停 + 到期恢复', pass, notes);
  }

  // ---- corn-d · 与 chill 独立并存（slowT × freezeT 互不覆盖、各自计时）----
  const CD = await evalPage(`(function(){
    window.__v16.freeze(); level=LEVELS[1]; DIFF='normal'; const out={};
    {
      const z=window.__v16.mkZ(0, 800, 1000, 60); zombies=[z];
      applyChill(z); applyFreeze(z);
      out.A={slowT:z.slowT, freezeT:z.freezeT};
      const x0=z.x; for(let i=0;i<60;i++) updateZombies(1/60);   // 1.0s
      out.A_after={slowT:z.slowT, freezeT:z.freezeT, stopped:(z.x===x0)};
    }
    {
      const z=window.__v16.mkZ(0, 800, 1000, 60); zombies=[z];
      applyFreeze(z); applyChill(z);
      out.B={slowT:z.slowT, freezeT:z.freezeT};
    }
    return out;
  })()`);
  {
    const both = CD.A.slowT===2.0 && CD.A.freezeT===3.0 && CD.B.slowT===2.0 && CD.B.freezeT===3.0;
    const independentTick = Math.abs(CD.A_after.slowT-1.0)<0.02 && Math.abs(CD.A_after.freezeT-2.0)<0.02;
    const frozenPriority = CD.A_after.stopped===true;
    const pass = both && independentTick && frozenPriority;
    push('C4','freezeT 与 chill slowT 独立并存（互不覆盖、各自计时、冻结优先）', pass, [
      'chill→freeze 顺序：slowT='+CD.A.slowT+' freezeT='+CD.A.freezeT+'；freeze→chill 顺序：slowT='+CD.B.slowT+' freezeT='+CD.B.freezeT+'（两字段均保留，期望 slowT=2.0/freezeT=3.0）',
      '并存 1.0s 后：slowT='+(+CD.A_after.slowT).toFixed(4)+'(期望≈1.0) freezeT='+(+CD.A_after.freezeT).toFixed(4)+'(期望≈2.0) ⇒ 各自独立递减 → '+(independentTick?'OK':'异常'),
      '并存期僵尸完全静止（冻结优先，非 ×0.6 叠乘）='+frozenPriority
    ]);
  }

  // ---- corn-e · 裁决：仅直中施加定身，溅射不施加（+ 普通玉米不冻结）----
  const CE = await evalPage(`(function(){
    window.__v16.freeze(); level=LEVELS[1]; DIFF='normal';
    const row=2, flatY=GRID_Y+row*CELL_H+CELL_H/2; const out={};
    {
      window.__v16.clearWorld();
      const zA=window.__v16.mkZ(row, 435, 1000, 0);   // 直中 (|Δx|=35<42)
      const zB=window.__v16.mkZ(row, 415, 1000, 0);   // 溅射 (|Δx|=15<30)
      zombies=[zA,zB];
      projectiles=[{x:400,y:flatY-16,flatY:flatY,yOff:16,vx:220,dmg:15,row:row,type:'corn',splash:30,splashRatio:0.40,butter:true,dead:false}];
      updateProjectiles(0.0001);
      out.A={lost:1000-zA.hp, freezeT:(zA.freezeT==null?0:zA.freezeT)};
      out.B={lost:1000-zB.hp, freezeT:(zB.freezeT==null?0:zB.freezeT)};
    }
    {
      window.__v16.clearWorld();
      const zC=window.__v16.mkZ(row, 435, 1000, 0); zombies=[zC];   // 受控直中：|Δx|=35<42 命中窗（弹体 x=400）
      projectiles=[{x:400,y:flatY-16,flatY:flatY,yOff:16,vx:220,dmg:15,row:row,type:'corn',splash:30,splashRatio:0.40,butter:false,dead:false}];
      updateProjectiles(0.0001);
      out.normal={lost:1000-zC.hp, freezeT:(zC.freezeT==null?0:zC.freezeT)};
    }
    return out;
  })()`);
  {
    let pass=true; const notes=[];
    const c1 = Math.abs(CE.A.lost-15)<1e-9 && CE.A.freezeT===3.0;
    const c2 = Math.abs(CE.B.lost-6)<1e-9 && CE.B.freezeT===0;
    const c3 = Math.abs(CE.normal.lost-15)<1e-9 && CE.normal.freezeT===0;
    if(!(c1&&c2&&c3)) pass=false;
    notes.push('黄油直中 A：掉血='+(+CE.A.lost).toFixed(1)+'(期望15) freezeT='+CE.A.freezeT+'(期望3.0) → '+(c1?'定身':'异常'));
    notes.push('溅射邻体 B：掉血='+(+CE.B.lost).toFixed(1)+'(期望6=15×0.40) freezeT='+CE.B.freezeT+'(期望0，裁决：溅射不施加定身) → '+(c2?'不施加':'异常'));
    notes.push('对照·普通玉米粒(butter=false)直中：掉血='+(+CE.normal.lost).toFixed(1)+'(期望15) freezeT='+CE.normal.freezeT+'(期望0，不产生定身) → '+(c3?'OK':'异常'));
    push('C5','裁决落地：仅黄油直中施加定身，溅射不施加；普通玉米不冻结', pass, notes);
  }

  // ---- corn-f · 表现层像素（黄油弹白奶酪块双形态 + 命中后头顶黄油渍，与 chill 并存）----
  // 黄油弹弹体
  await evalPage(`(function(){ window.__v16.freeze(); level=LEVELS[1]; DIFF='normal'; window.__v16.clearWorld();
    projectiles=[{x:300,y:300,flatY:300,yOff:0,vx:0,row:2,type:'corn',dmg:15,splash:30,splashRatio:0.40,butter:true,dead:false}];
    render(); return true; })()`);
  await sleep(200);
  await shot('v16-corn-butter-shot.png');
  const PF_b = await evalPage(`(function(){ const s=window.__v16.snap(); return {c:window.__v16.px(300,300,s), tl:window.__v16.px(295,295,s)}; })()`);
  const PF_n = await evalPage(`(function(){ window.__v16.clearWorld();
    projectiles=[{x:300,y:300,flatY:300,yOff:0,vx:0,row:2,type:'corn',dmg:15,splash:30,splashRatio:0.40,butter:false,dead:false}];
    render(); const s=window.__v16.snap(); return {c:window.__v16.px(300,300,s), tl:window.__v16.px(295,295,s)}; })()`);
  // 黄油渍（僵尸头顶）
  await evalPage(`(function(){ window.__v16.freeze(); level=LEVELS[1]; DIFF='normal'; window.__v16.clearWorld();
    zombies=[window.__v16.mkZ(2, 600, 1000, 0)]; render(); return true; })()`);
  await sleep(200);
  const PS_base = await evalPage(`(function(){ const s=window.__v16.snap(); return {stain:window.__v16.px(594,302,s), body:window.__v16.px(600,350,s)}; })()`);
  const PS_frz = await evalPage(`(function(){ zombies[0].freezeT=3.0; render(); const s=window.__v16.snap(); return {stain:window.__v16.px(594,302,s), body:window.__v16.px(600,350,s)}; })()`);
  await sleep(150);
  await shot('v16-corn-butter-stain.png');
  const PS_combo = await evalPage(`(function(){ zombies[0].freezeT=3.0; zombies[0].slowT=2.0; render(); const s=window.__v16.snap(); return {stain:window.__v16.px(594,302,s), body:window.__v16.px(600,350,s)}; })()`);
  {
    let pass=true; const notes=[];
    // 黄油弹：白/淡黄奶酪块（高亮度），且明显区别于普通玉米粒（暗黄）
    const bt=rgb(PF_b.tl), nt=rgb(PF_n.tl), bc=rgb(PF_b.c), nc=rgb(PF_n.c);
    const butterBright = bt[0]>200 && bt[1]>200 && bt[2]>140;
    const blockVsGrain = diff(PF_b.tl, PF_n.tl, 20) && diff(PF_b.c, PF_n.c, 15);
    if(!(butterBright && blockVsGrain)) pass=false;
    notes.push('黄油弹(白奶酪块) 取样 角(295,295)=rgb('+PF_b.tl+') 心(300,300)=rgb('+PF_b.c+') · 高亮(全通道>200/140)='+butterBright);
    notes.push('普通玉米粒 同点 角=rgb('+PF_n.tl+') 心=rgb('+PF_n.c+') ⇒ 双形态显著区分(角差'+cdist(PF_b.tl,PF_n.tl)+'/心差'+cdist(PF_b.c,PF_n.c)+')='+blockVsGrain);
    // 黄油渍：头顶出现淡黄渍 #efe08a 区
    const st=rgb(PS_frz.stain), sb=rgb(PS_base.stain);
    const stainAppears = diff(PS_base.stain, PS_frz.stain, 20);
    const stainYellow = st[0]>190 && st[1]>170 && st[2]>90 && st[2]<st[1] && st[2]<st[0];
    if(!(stainAppears && stainYellow)) pass=false;
    notes.push('黄油渍(头顶 z.x-6, zy-38)：无定身 rgb('+PS_base.stain+') → 定身 rgb('+PS_frz.stain+') 出现='+stainAppears+' 淡黄料判(>190/170/90 且 B 最低)='+stainYellow);
    // 与 chill 并存
    const bodyTint = diff(PS_base.body, PS_combo.body, 10);
    const stainKeep = near(PS_frz.stain, PS_combo.stain, 6);
    if(!(bodyTint && stainKeep)) pass=false;
    notes.push('与 chill 并存：躯干像素 冷暖 tint 变化='+bodyTint+'（基 rgb('+PS_base.body+') → 并存 rgb('+PS_combo.body+')）· 黄油渍保留(≤6 通道差)='+stainKeep);
    notes.push('证据图: v16-corn-butter-shot.png / v16-corn-butter-stain.png');
    push('C6','表现层像素：黄油弹白奶酪块 + 命中后头顶黄油渍（与 chill 并存）', pass, notes);
  }

  // ==========================================================================
  // 汇总
  // ==========================================================================
  await evalPage('window.__v16.restore(); true');
  const allPass = RESULTS.every(r=>r.pass);
  console.log('\n================ v1.6 三刀真机验收汇总 ================');
  for(const r of RESULTS) console.log('  ['+(r.pass?'PASS':'FAIL')+'] '+r.id+' · '+r.title);
  console.log('  子项: '+RESULTS.filter(r=>r.pass).length+'/'+RESULTS.length+' 通过');
  console.log('  总判定: '+(allPass?'PASS':'FAIL'));
  fs.writeFileSync(path.join(OUT,'v16-acceptance-results.json'),
    JSON.stringify({generated:new Date().toISOString(), target:VER, overall:allPass?'PASS':'FAIL', results:RESULTS}, null, 2));

  ws.close();
  try{ e.kill() }catch(_){}
  await sleep(400);                              // 等 Edge 释放 .tmp 文件锁，避免 EBUSY
  try{ fs.rmSync(TMP,{recursive:true,force:true}) }catch(_){}
  process.exit(allPass?0:1);
})().catch(er=>{ console.error('FAIL', er && er.stack || er.message); process.exit(1); });
