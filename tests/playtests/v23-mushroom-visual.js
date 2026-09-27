// ============================================================================
// v2.3.0 · 四种夜行蘑菇 真机（浏览器/CDP）视觉验收  ·  V23-VISUAL-01 (U7)
// ----------------------------------------------------------------------------
// 运行（新源，默认 plants-vs-zombies.html）：
//   node tests/playtests/v23-mushroom-visual.js
// 运行（旧源对照 · 判别力自证；产物加 .old 后缀）：
//   node tests/playtests/v23-mushroom-visual.js production/release/v2.2.8/artifacts/plants-vs-zombies.v2.2.8.html old
// 只读源码，不修改任何 html；产物（截图 + results json）落 tests/playtests/。
//
// 验证项（对应主理人任务书 U7）：
//   T1 四蘑菇卡面绘制（卡面美术区像素签名 + 各菇盖色值 + 四者互异）
//   T2 「☾ 夜行」角标判别力（蘑菇卡有角标像素 / 非蘑菇卡无 —— 正负双向断言）
//   T3 世界绘制四蘑菇（夜晚关卡 · 各菇盖色值 + 阳光菇成体金环 + 大喷菇烟雾 + 魅惑菇螺旋）
//   T4 白天沉睡视觉（白天 vs 夜晚 同一蘑菇的「植物内部像素差」；GDD v23 §2.2 要求的沉睡姿态）
//   T5 被魅惑僵尸视觉区分（紫色描边 + 头顶螺旋；叠加冰冻/黄油 tint 后仍可辨识；并含真实触发取证）
//   T6 弹体视觉（小喷菇紫孢子弹 / 大喷菇灰烟雾弹）+ 大喷菇穿透（同排多僵尸同时掉血）
//
// 手法（沿用 v22-newplant-visual.js / v221-visual.js 已验证套路）：
//   headless Edge + CDP → 页面内 window.__V.freeze()（替换 requestAnimationFrame + paused=true）
//   冻结主循环 → 直接 render() 手动布景 → Runtime.evaluate 读游戏全局 + getImageData 做像素度量。
//   ★ 冻结是关键：否则 RAF 主循环会在截图前重绘并覆盖手动布景帧（v22 头部已记录此坑）。
//   ★ 坑位：本会话 fs.rmSync 会走 safe-delete shim（genie-trash.exe）并 ETIMEDOUT —— 不做删除，
//     TMP 用固定名（.gitignore 已忽略 .tmp-*），复用 profile 目录无副作用。
//   ★ Edge 子进程 stdout 可能不回传 —— 关键结果一律写入 *-results.json，以 JSON 为权威。
// ============================================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { execFile } = require('child_process');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9378;                                   // 避开 9351/9352/9353/9361/9363/9364/9366/9370/9372/9374/9376
const ARG_HTML = process.argv[2] || 'plants-vs-zombies.html';
const TAG = process.argv[3] || '';
const SUF = TAG ? ('.' + TAG) : '';
const TMP  = path.join(process.cwd(), '.tmp-v23-mushroom-visual' + (TAG ? ('-' + TAG) : ''));
const OUT  = path.join(process.cwd(), 'tests', 'playtests');
const PAGE = 'file:///' + path.resolve(process.cwd(), ARG_HTML).replace(/\\/g, '/');

function get(u){ return new Promise((res,rej)=>{ http.get(u,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d))}).on('error',rej) }); }
const sleep = ms => new Promise(r=>setTimeout(r,ms));

const RESULTS = [];
function push(id,title,pass,notes,sev){ RESULTS.push({id:id,title:title,pass:!!pass,severity:sev||null,detail:(notes||[]).join(' | ')});
  console.log('\n['+id+'] '+(pass?'PASS':'FAIL')+' · '+title); (notes||[]).forEach(n=>console.log('   · '+n)); }

// 源 drawPlantInner / drawCardFace 实测色值（各菇盖主体色）
const CAP = { sunshroom:[138,122,168], puffshroom:[154,106,208], fumeshroom:[122,79,176], hypnoshroom:[176,58,110] }; // #8a7aa8/#9a6ad0/#7a4fb0/#b03a6e

(async () => {
  try { fs.mkdirSync(TMP, { recursive: true }); } catch (_) {}
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
  // 基载夜晚关卡（1-6 · time:'night'）—— T3/T5/T6 需要夜晚（蘑菇清醒）；T4 在页内切 day/night 对比
  await send('Page.navigate',{ url: PAGE+'?test=1&level=1-6' });
  await sleep(1900);

  // ---------------- 页面内助手 ----------------
  const helper = `(function(){
    window.__V = window.__V || {};
    window.__V._drawPause = drawPause;
    window.__V.freeze = function(){
      if(!window.__V._raf){ window.__V._raf = window.requestAnimationFrame; }
      window.requestAnimationFrame = function(){ return 0; };   // ★ 真停 RAF 链（loop 帧尾恒 requestAnimationFrame(loop)）
      state='play'; paused=true; drawPause=function(){}; toastT=0; if(window.warn||typeof warn!=='undefined'){try{warn.active=false}catch(_){}}
      try{muted=true}catch(_){}
      screenShake.t=0;screenShake.dur=0;screenShake.intensity=0; flashT=0;
      sunFallT=1e9; spawnQueue=[]; waveActive=false;
    };
    window.__V.clearWorld = function(){ plants=[];zombies=[];projectiles=[];effects=[];pointDrops=[];spawnQueue=[];waveActive=false; screenShake.t=0; flashT=0; toastT=0; };
    // 构造植物（绕开 spawnPlant 对 CARDS.find 的依赖 ⇒ 旧源对照下不抛错；drawPlantInner 仅读 type/growT/dur/maxDur）
    window.__V.mkPlant = function(type,col,row,opt){
      opt=opt||{};
      return {col:col,row:row,type:type,cd:(opt.cd||0),sunT:(opt.sunT||0),growT:(opt.growT||0),
        armT:0,arming:false,dur:(opt.dur||300),maxDur:(opt.dur||300),
        plantT:620,plantDone:true,dirtDone:true,plantFrom:{x:0,y:0}};
    };
    window.__V.mkZ = function(row,x,hp,type){ return {type:(type||'normal'),row:row,x:x,hp:(hp||180),maxHp:(hp||180),
      spd:0,eating:false,eatAnim:0,walk:0,dead:false,hypno:false,slowT:0,freezeT:0}; };
    window.__V.safeRender = function(){ try{ render(); return null; }catch(err){ return (err&&err.message)?err.message:String(err); } };
    window.__V.setTime = function(timeVal){ level=Object.assign({},LEVELS['1-6'],{time:timeVal}); };
    // ---- 像素工具（全部在页内完成，只回传小结果，规避大数组序列化） ----
    window.__V.grab = function(x,y,w,h){ return ctx.getImageData(Math.round(x),Math.round(y),w,h).data; };
    window.__V.diff = function(a,b,thr){ thr=(thr===undefined)?60:thr; let n=0;
      for(let i=0;i<a.length;i+=4){ const d=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]); if(d>thr)n++; } return n; };
    window.__V.mask = function(a,b,thr){ const m=new Uint8Array(a.length/4);
      for(let i=0,j=0;i<a.length;i+=4,j++){ const d=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]); m[j]=d>thr?1:0; } return m; };
    window.__V.diffMasked = function(a,b,mask,thr){ let n=0;
      for(let i=0,j=0;i<a.length;i+=4,j++){ if(!mask[j])continue; const d=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]); if(d>thr)n++; } return n; };
    window.__V.maskCount = function(m){ let n=0; for(let i=0;i<m.length;i++)n+=m[i]; return n; };
    window.__V.maskSymDiff = function(m1,m2){ let n=0; for(let i=0;i<m1.length;i++) if(m1[i]!==m2[i])n++; return n; };
    // 腐蚀掩码：去掉边界 k 像素（排除抗锯齿边缘随背景变化的泄漏；只留不透明菇体内部）
    window.__V.erode = function(mask,w,h,k){ k=k||1; const out=new Uint8Array(mask.length);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){ const idx=y*w+x; if(!mask[idx])continue; let solid=true;
        for(let dy=-k;dy<=k&&solid;dy++)for(let dx=-k;dx<=k;dx++){ const nx=x+dx, ny=y+dy;
          if(nx<0||ny<0||nx>=w||ny>=h||!mask[ny*w+nx]){ solid=false; break; } }
        out[idx]=solid?1:0; }
      return out; };
    window.__V.stat = function(x,y,w,h){ const d=ctx.getImageData(Math.round(x),Math.round(y),w,h).data; let nz=0,hash=0,uniq={};
      for(let i=0;i<d.length;i+=4){ const v=d[i]*65536+d[i+1]*256+d[i+2]; if(v>0)nz++; hash=((hash*31)+v)>>>0; uniq[d[i]+','+d[i+1]+','+d[i+2]]=1; }
      return {nz:nz,hash:hash,colors:Object.keys(uniq).length}; };
    window.__V.countColor = function(x,y,w,h,r,g,b,tol){ const d=ctx.getImageData(Math.round(x),Math.round(y),w,h).data; let n=0;
      for(let i=0;i<d.length;i+=4){ if(Math.abs(d[i]-r)<=tol&&Math.abs(d[i+1]-g)<=tol&&Math.abs(d[i+2]-b)<=tol)n++; } return n; };
    window.__V.countRGB = function(x,y,w,h,kind){ const d=ctx.getImageData(Math.round(x),Math.round(y),w,h).data; let n=0;
      for(let i=0;i<d.length;i+=4){ const R=d[i],G=d[i+1],B=d[i+2]; let ok=false;
        if(kind==='magenta') ok=(R-G>40&&B-G>20&&R>120);            // #b03a6e 紫红描边 / 螺旋
        else if(kind==='gold') ok=(R>225&&G>175&&B<120);            // 阳光菇成体金黄环
        else if(kind==='gray') ok=(Math.abs(R-G)<16&&Math.abs(G-B)<16&&Math.abs(R-B)<16&&R>70); // 烟雾灰
        else if(kind==='purple') ok=(B>R+15&&R>G+10);               // 小喷菇紫孢子弹
        else if(kind==='pinkish') ok=(R>235&&G>205&&B>220);         // 魅惑菇螺旋亮纹
        if(ok)n++; } return n; };
    window.__V.geo = function(){ return {X0:CARD_X0,W:CARD_W,Y:CARD_Y,H:CARD_H,GRID_X:GRID_X,CELL_W:CELL_W,GRID_Y:GRID_Y,CELL_H:CELL_H}; };
    return 'helpers ok';
  })()`;
  console.log('[helper]', await evalPage(helper));
  await evalPage(`window.__V.freeze(); true`);
  const VER = await evalPage('VERSION');
  const CARDSN = await evalPage('CARDS.length');
  const ENV = await evalPage(`({version:VERSION, cards:CARDS.length,
    hasNocturnal:(typeof isNocturnal==='function'),
    nocturnalTypes:(typeof NOCTURNAL_TYPES!=='undefined')?NOCTURNAL_TYPES.slice():null,
    hasBadge:(typeof NOCTURNAL_BADGE!=='undefined')?NOCTURNAL_BADGE:null,
    level:(typeof level!=='undefined'&&level)?{key:levelKey,time:level.time,world:level.world}:null})`);
  console.log('[env] '+JSON.stringify(ENV));

  // 各测试的原始返回（提升作用域，供末尾 summary 落盘）
  let cardFrame = null, worldRaw = null, sleepTest = null, hypno = null, proj = null;

  // ==========================================================================
  // T1 · 四蘑菇卡面绘制（卡面美术区像素签名 + 各菇盖色值 + 四者互异）
  // ==========================================================================
  let t1 = null;
  try {
    cardFrame = await evalPage(`(function(){
      window.__V.freeze();
      window.__V.clearWorld();
      state='play'; paused=true; sun=9999; selected=null; cardCD={};
      deck=['sunshroom','puffshroom','fumeshroom','hypnoshroom','pea','sunflower']; slots=10;
      const g=window.__V.geo();
      screenShake.t=0; flashT=0; toastT=0; render();
      const out={geo:g, cards:{}};
      const idx={sunshroom:0,puffshroom:1,fumeshroom:2,hypnoshroom:3,pea:4,sunflower:5};
      for(const k in idx){
        const i=idx[k], cx=g.X0+i*g.W;
        out.cards[k]=Object.assign({i:i,cx:cx}, window.__V.stat(cx+4,g.Y+6,80,36));
        // 菇盖色值计数（卡面菇盖基准半径 0.82×capR ⇒ 面积足够）
        const c=(k==='sunshroom')?[138,122,168]:(k==='puffshroom')?[154,106,208]:(k==='fumeshroom')?[122,79,176]:(k==='hypnoshroom')?[176,58,110]:null;
        out.cards[k].cap = c?window.__V.countColor(cx+4,g.Y+6,80,50,c[0],c[1],c[2],8):0;
      }
      out.renderErr=window.__V.safeRender();
      return out;
    })()`);
    console.log('[T1] '+JSON.stringify(cardFrame));
    const C = cardFrame.cards;
    const trio = ['sunshroom','puffshroom','fumeshroom','hypnoshroom'];
    const hashes = new Set(trio.map(t=>C[t].hash));
    const nzOk = trio.every(t=>C[t].nz>0 && C[t].colors>=2);
    const capOk = trio.every(t=>C[t].cap>10);
    const distinct = hashes.size===4;
    t1 = { trio:trio, hashes:hashes.size, nzOk:nzOk, capOk:capOk, distinct:distinct, frame:cardFrame };
    const pass = nzOk && capOk && distinct && !cardFrame.renderErr;
    push('VIS-MUSH-CARD-01','四蘑菇卡面专属绘制（卡面 art 区非空 + 各菇盖色值 + 四者互异）', pass, [
      'art 区（80×36 纯美术区）：'+trio.map(t=>t+' nz='+C[t].nz+' colors='+C[t].colors+' hash='+C[t].hash).join(' · '),
      '菇盖色值命中（源 drawCardFace 实测）：'+trio.map(t=>t+'['+CAP[t].join(',')+']='+C[t].cap).join(' · '),
      '对照（非蘑菇卡）：pea nz='+C.pea.nz+' · sunflower nz='+C.sunflower.nz,
      '四者 art 区互异 hash 数 = '+hashes.size+'/4 ⇒ '+(distinct?'各有专属卡面':'★ 卡面美术像素重复（无专属绘制）'),
      'render 异常: '+(cardFrame.renderErr||'无'),
      '证据图: v23-cardfaces'+SUF+'.png',
    ], pass?null:'Major');
  } catch(err){ push('VIS-MUSH-CARD-01','四蘑菇卡面专属绘制', false, ['异常: '+(err&&err.message||err)], 'Major'); }
  await sleep(120); await shot('v23-cardfaces'+SUF+'.png');

  // ==========================================================================
  // T2 · 「☾ 夜行」角标判别力（正负双向）
  // ==========================================================================
  try {
    const badge = await evalPage(`(function(){
      // 复用 T1 的卡栏布景（同一 deck）；重新渲染确保帧最新
      window.__V.freeze();
      state='play'; paused=true; sun=9999; selected=null; cardCD={};
      deck=['sunshroom','puffshroom','fumeshroom','hypnoshroom','pea','sunflower']; slots=10;
      screenShake.t=0; flashT=0; toastT=0; render();
      const g=window.__V.geo();
      const NB=(typeof NOCTURNAL_BADGE!=='undefined')?NOCTURNAL_BADGE:{w:38,h:13};
      const idx={sunshroom:0,puffshroom:1,fumeshroom:2,hypnoshroom:3,pea:4,sunflower:5};
      const out={badge:{w:NB.w,h:NB.h},items:{}};
      for(const k in idx){
        const i=idx[k], cx=g.X0+i*g.W;
        const bx=cx+g.W-NB.w-2, by=g.Y+g.H-NB.h-2;
        out.items[k]={region:{x:bx,y:by}, text:window.__V.countColor(bx,by,NB.w,NB.h,201,184,255,45)};  // #c9b8ff 角标文字
      }
      return out;
    })()`);
    console.log('[T2] '+JSON.stringify(badge));
    const I = badge.items;
    const mush = ['sunshroom','puffshroom','fumeshroom','hypnoshroom'];
    const ctrl = ['pea','sunflower'];
    const posOk = mush.every(k=>I[k].text>0);
    const negOk = ctrl.every(k=>I[k].text===0);
    const pass = posOk && negOk;
    push('VIS-MUSH-BADGE-01','「☾ 夜行」角标判别力（蘑菇卡有 / 非蘑菇卡无 · 正负双向）', pass, [
      '正向（应有 #c9b8ff 角标文字像素）：'+mush.map(k=>k+'='+I[k].text).join(' · '),
      '负向（应无）：'+ctrl.map(k=>k+'='+I[k].text).join(' · '),
      '角标区域 = 卡右下角 ['+badge.badge.w+'×'+badge.badge.h+']（源码 NOCTURNAL_BADGE 口径，恒在冷却遮罩之上）',
      '判别力：正向全有且负向全无 ⇒ '+(pass?'角标对蘑菇卡具专属性':'★ 判别力不足'),
      '证据图: v23-card-badges'+SUF+'.png',
    ], pass?null:'Major');
  } catch(err){ push('VIS-MUSH-BADGE-01','「☾ 夜行」角标判别力', false, ['异常: '+(err&&err.message||err)], 'Major'); }
  await sleep(120); await shot('v23-card-badges'+SUF+'.png');

  // ==========================================================================
  // T3 · 世界绘制四蘑菇（夜晚关卡）
  // ==========================================================================
  try {
    const world = await evalPage(`(function(){
      window.__V.freeze();
      window.__V.setTime('night');
      window.__V.clearWorld();
      const g=window.__V.geo();
      const col=3,row=2;
      const x=g.GRID_X+col*g.CELL_W+g.CELL_W/2, y=g.GRID_Y+row*g.CELL_H+g.CELL_H/2;
      const BX=x-42, BY=y-58, BW=84, BH=112;
      function frame(plantsArr){ plants=plantsArr; zombies=[]; projectiles=[]; effects=[]; screenShake.t=0; flashT=0; toastT=0; render(); }
      const out={cell:{x:x,y:y,box:{x:BX,y:BY,w:BW,h:BH}}, renderErr:null};
      // 空草坪基线（供烟雾差分）
      frame([]); const emptyBox=window.__V.grab(BX,BY,BW,BH);
      // 逐菇
      const mk=window.__V.mkPlant;
      frame([mk('sunshroom',col,row,{growT:0})]);
      out.sunshroomBabyCap=window.__V.countColor(BX,BY,BW,BH,138,122,168,8);
      out.sunshroomBabyGold=window.__V.countRGB(BX,BY,BW,BH,'gold');
      frame([mk('sunshroom',col,row,{growT:120})]);
      out.sunshroomAdultCap=window.__V.countColor(BX,BY,BW,BH,138,122,168,8);
      out.sunshroomAdultGold=window.__V.countRGB(BX,BY,BW,BH,'gold');
      frame([mk('puffshroom',col,row,{})]);
      out.puffshroomCap=window.__V.countColor(BX,BY,BW,BH,154,106,208,8);
      frame([mk('fumeshroom',col,row,{})]);
      out.fumeshroomCap=window.__V.countColor(BX,BY,BW,BH,122,79,176,8);
      // 烟雾：射程区间（菇体右侧 x+40 起 · FUMESHROOM_RANGE=4 格）与空草坪差分（灰雾 alpha 0.15 ⇒ 阈值调低）
      const SX=x+40, SY=y-60, SW=4*g.CELL_W, SH=90;
      const smokeWith=window.__V.grab(SX,SY,SW,SH);
      frame([]); const smokeEmpty=window.__V.grab(SX,SY,SW,SH);
      out.smokeSpan={x:SX,y:SY,w:SW,h:SH, diff:window.__V.diff(smokeWith,smokeEmpty,10)};
      frame([mk('hypnoshroom',col,row,{})]);
      out.hypnoshroomCap=window.__V.countColor(BX,BY,BW,BH,176,58,110,8);
      out.hypnoshroomSpiral=window.__V.countRGB(BX,BY,BW,BH,'pinkish');
      frame([]);
      out.renderErr=window.__V.safeRender();
      return out;
    })()`);
    console.log('[T3] '+JSON.stringify(world));
    worldRaw = world;
    const babyCap = world.sunshroomBabyCap, adultGold = world.sunshroomAdultGold, babyGold = world.sunshroomBabyGold;
    const pass = babyCap>40 && world.sunshroomAdultCap>40 && world.puffshroomCap>40
      && world.fumeshroomCap>40 && world.hypnoshroomCap>40
      && adultGold>40 && babyGold===0            // 成体金环正/负（幼体无环）
      && world.smokeSpan.diff>100                // 大喷菇烟雾铺开
      && world.hypnoshroomSpiral>10;             // 魅惑菇螺旋纹
    push('VIS-MUSH-WORLD-01','世界绘制四蘑菇（夜 · 菇盖色值 + 阳光菇成体金环 + 大喷菇烟雾 + 魅惑菇螺旋）', pass, [
      '夜晚关卡 1-6（time=night）· 格(3,2) 心 ('+world.cell.x+','+world.cell.y+')',
      '阳光菇 幼体菇盖 #8a7aa8 命中='+babyCap+' · 幼体金环='+babyGold+'（应 0）',
      '阳光菇 成体菇盖 #8a7aa8 命中='+world.sunshroomAdultCap+' · 成体金环(金)='+adultGold+'（growT=120 触发成体 ⇒ 金黄环出现）',
      '小喷菇 菇盖 #9a6ad0 命中='+world.puffshroomCap,
      '大喷菇 菇盖 #7a4fb0 命中='+world.fumeshroomCap+' · 烟雾云区间差分='+world.smokeSpan.diff+'（'+world.smokeSpan.w+'×'+world.smokeSpan.h+' 于菇体右侧 0.55..4 格）',
      '魅惑菇 菇盖 #b03a6e 命中='+world.hypnoshroomCap+' · 螺旋亮纹(pinkish)='+world.hypnoshroomSpiral,
      'render 异常: '+(world.renderErr||'无'),
      '证据图: v23-world-night-all'+SUF+'.png / v23-world-sunshroom-adult'+SUF+'.png / v23-world-fumeshroom-smoke'+SUF+'.png',
    ], pass?null:'Major');
    // 组合截图：四菇同屏（夜）
    await evalPage(`(function(){
      window.__V.freeze(); window.__V.setTime('night'); window.__V.clearWorld();
      const mk=window.__V.mkPlant;
      plants=[ mk('sunshroom',1,2,{growT:120}), mk('puffshroom',3,2,{}), mk('fumeshroom',5,2,{}), mk('hypnoshroom',7,2,{}) ];
      screenShake.t=0; flashT=0; toastT=0; render(); return true; })()`);
    await sleep(120); await shot('v23-world-night-all'+SUF+'.png');
    // 成体阳光菇特写
    await evalPage(`(function(){ window.__V.freeze(); window.__V.setTime('night'); window.__V.clearWorld();
      plants=[window.__V.mkPlant('sunshroom',4,2,{growT:120})]; screenShake.t=0; flashT=0; render(); return true; })()`);
    await sleep(100); await shot('v23-world-sunshroom-adult'+SUF+'.png');
    // 大喷菇烟雾特写
    await evalPage(`(function(){ window.__V.freeze(); window.__V.setTime('night'); window.__V.clearWorld();
      plants=[window.__V.mkPlant('fumeshroom',2,2,{})]; screenShake.t=0; flashT=0; render(); return true; })()`);
    await sleep(100); await shot('v23-world-fumeshroom-smoke'+SUF+'.png');
  } catch(err){ push('VIS-MUSH-WORLD-01','世界绘制四蘑菇', false, ['异常: '+(err&&err.message||err)], 'Major'); }

  // ==========================================================================
  // T4 · 白天沉睡视觉（GDD v23 §2.2 要求的「半闭眼/耷拉姿态」）
  //   判据：同一蘑菇在 day 与 night 的「植物内部像素」差异。差值隔离手法：
  //   内部 = 相对各自背景帧强差异(sum>90)的像素 ⇒ 只取不透明菇体内部（排除抗锯齿边缘随背景变化）。
  //   噪声基线：同状态两次 render 的差分（应 0）。灵敏度对照：同格 puffshroom vs fumeshroom（不同菇体 ⇒ 大差值）。
  // ==========================================================================
  try {
    sleepTest = await evalPage(`(function(){
      window.__V.freeze();
      const g=window.__V.geo();
      const col=3,row=2;
      const x=g.GRID_X+col*g.CELL_W+g.CELL_W/2, y=g.GRID_Y+row*g.CELL_H+g.CELL_H/2;
      const BX=x-46, BY=y-60, BW=92, BH=116;
      const mk=window.__V.mkPlant;
      function renderScene(timeVal, plantsArr){
        window.__V.setTime(timeVal); plants=plantsArr; zombies=[]; projectiles=[]; effects=[];
        screenShake.t=0; flashT=0; toastT=0; render();
        return window.__V.grab(BX,BY,BW,BH);
      }
      const puff=[mk('puffshroom',col,row,{})];
      const dayP   = renderScene('day',   puff);
      const dayB   = renderScene('day',   []);
      const nightP = renderScene('night', puff);
      const nightB = renderScene('night', []);
      // 噪声基线：同状态双 render
      const dayP2  = renderScene('day',   puff);
      const noise  = window.__V.diff(dayP, dayP2, 12);
      // 内部掩码（相对各自背景强差异 ⇒ 不透明菇体）
      const coreDay   = window.__V.mask(dayP,   dayB,   90);
      const coreNight = window.__V.mask(nightP, nightB, 90);
      const coreDayN   = window.__V.maskCount(coreDay);
      const coreNightN = window.__V.maskCount(coreNight);
      // ★ 腐蚀 2px：排除抗锯齿边缘（其颜色随背景 day/night 变化 ⇒ 会污染内部差分）
      const coreDayE   = window.__V.erode(coreDay,   BW, BH, 2);
      const coreNightE = window.__V.erode(coreNight, BW, BH, 2);
      const coreDayEN   = window.__V.maskCount(coreDayE);
      const coreNightEN = window.__V.maskCount(coreNightE);
      const sleepDiff  = window.__V.diffMasked(dayP, nightP, coreDayE, 20);   // 只看白天菇体内部(腐蚀后)：day vs night
      const shapeDelta = window.__V.maskSymDiff(coreDayE, coreNightE);
      // 灵敏度对照：同格不同菇（fumeshroom in day）
      const fumeDay = renderScene('day', [mk('fumeshroom',col,row,{})]);
      const controlDiff = window.__V.diffMasked(dayP, fumeDay, coreDayE, 20);
      // 源码级佐证：drawPlantInner 是否有 昼/夜 分支
      let srcHasBranch=false;
      try{ srcHasBranch=/level\\.time|isNocturnal|asleep/.test(drawPlantInner.toString()); }catch(_){}
      return {coreDay:coreDayN, coreNight:coreNightN, coreDayE:coreDayEN, coreNightE:coreNightEN,
              shapeDelta:shapeDelta, sleepDiff:sleepDiff, controlDiff:controlDiff, noise:noise, srcHasBranch:srcHasBranch};
    })()`);
    console.log('[T4] '+JSON.stringify(sleepTest));
    const pass = sleepTest.sleepDiff > 40;   // 期望：白天沉睡姿态 ⇒ 内部像素差显著
    push('VIS-MUSH-SLEEP-01','白天沉睡视觉（day vs night 菇体内部像素差 · GDD v23 §2.2「半闭眼/耷拉姿态」）', pass, [
      '植物内部像素（相对背景强差异 sum>90）：白天 core='+sleepTest.coreDay+' · 夜晚 core='+sleepTest.coreNight+'；腐蚀2px后（去抗锯齿边缘）白天='+sleepTest.coreDayE+' · 夜晚='+sleepTest.coreNightE+'（形状对称差='+sleepTest.shapeDelta+'）',
      '★ 沉睡姿态像素差 sleepDiff（腐蚀后内部）= '+sleepTest.sleepDiff+'（期望 >40；≈0 ⇒ 白天/夜晚菇体一致 = 无沉睡视觉）',
      '噪声基线（同状态双 render 差分）= '+sleepTest.noise+'（证明差分度量非幻影）',
      '灵敏度对照（同格 puffshroom vs fumeshroom 内部差分）= '+sleepTest.controlDiff+'（≫0 ⇒ 度量对菇体美术差异敏感，故 sleepDiff 的近零结果真实）',
      '源码佐证：drawPlantInner 含昼/夜/夜行分支 = '+sleepTest.srcHasBranch+'（false ⇒ 世界层无沉睡分支）',      'GDD v23 §2.2 明列「表现：沉睡时绘制半闭眼/耷拉姿态（视觉层）」；源码 drawPlantInner 四菇分支无此绘制 ⇒ 白天/夜晚菇体像素一致',
      '玩家影响：世界画面无法分辨蘑菇是否沉睡，仅卡面「☾ 夜行」角标可推断 —— 见交付报告「视觉缺陷」',
      '证据图: v23-sleep-day'+SUF+'.png / v23-sleep-night'+SUF+'.png',
    ], pass?null:'Major');
    // 截图：白天 / 夜晚 同格蘑菇
    await evalPage(`(function(){ window.__V.freeze(); window.__V.setTime('day'); window.__V.clearWorld();
      plants=[window.__V.mkPlant('sunshroom',4,2,{})]; screenShake.t=0; flashT=0; render(); return true; })()`);
    await sleep(100); await shot('v23-sleep-day'+SUF+'.png');
    await evalPage(`(function(){ window.__V.freeze(); window.__V.setTime('night'); window.__V.clearWorld();
      plants=[window.__V.mkPlant('sunshroom',4,2,{})]; screenShake.t=0; flashT=0; render(); return true; })()`);
    await sleep(100); await shot('v23-sleep-night'+SUF+'.png');
  } catch(err){ push('VIS-MUSH-SLEEP-01','白天沉睡视觉', false, ['异常: '+(err&&err.message||err)], 'Major'); }

  // ==========================================================================
  // T5 · 被魅惑僵尸视觉区分 + tint 叠加可读性
  // ==========================================================================
  try {
    hypno = await evalPage(`(function(){
      window.__V.freeze(); window.__V.setTime('night'); window.__V.clearWorld();
      const g=window.__V.geo();
      const row=2; const zx=520, zy=g.GRID_Y+row*g.CELL_H+g.CELL_H/2;
      const BX=zx-30, BY=zy-52, BW=60, BH=96;
      function scene(){ zombies=[Object.assign({}, zBase)]; plants=[]; projectiles=[]; effects=[]; screenShake.t=0; flashT=0; toastT=0; render(); return window.__V.grab(BX,BY,BW,BH); }
      const zBase=window.__V.mkZ(row,zx,180,'normal');
      const out={};
      zBase.hypno=false; zBase.slowT=0; zBase.freezeT=0; scene();
      out.mag_normal=window.__V.countRGB(BX,BY,BW,BH,'magenta');
      zBase.hypno=true;  zBase.slowT=0; zBase.freezeT=0; scene();
      out.mag_hypno=window.__V.countRGB(BX,BY,BW,BH,'magenta');
      zBase.hypno=false; zBase.slowT=2; zBase.freezeT=0; scene();
      out.mag_normal_chill=window.__V.countRGB(BX,BY,BW,BH,'magenta');
      zBase.hypno=true;  zBase.slowT=2; zBase.freezeT=0; scene();
      out.mag_hypno_chill=window.__V.countRGB(BX,BY,BW,BH,'magenta');
      zBase.hypno=false; zBase.slowT=0; zBase.freezeT=2; scene();
      out.mag_normal_butter=window.__V.countRGB(BX,BY,BW,BH,'magenta');
      zBase.hypno=true;  zBase.slowT=0; zBase.freezeT=2; scene();
      out.mag_hypno_butter=window.__V.countRGB(BX,BY,BW,BH,'magenta');
      // 真实触发取证：魅惑菇(夜) + 啃食僵尸 → z.hypno 置真 + 菇 _dying
      window.__V.clearWorld(); window.__V.setTime('night');
      const p=window.__V.mkPlant('hypnoshroom',3,2,{});
      const pRef=p;   // ★ 更新末段可能把 _dying 植物从 plants 摘除，故持引用读 _dying（数组读会得 undefined）
      const pos={x:g.GRID_X+3*g.CELL_W+g.CELL_W/2, y:g.GRID_Y+2*g.CELL_H+g.CELL_H/2};
      plants=[p]; zombies=[window.__V.mkZ(2, pos.x+20, 180, 'normal')];
      let realErr=null;
      try{ if(typeof updateZombies==='function') updateZombies(1/60); }catch(err){ realErr=(err&&err.message)||String(err); }
      out.realHypno=(zombies[0]&&zombies[0].hypno)||false;
      out.realPlantDying=!!(pRef&&pRef._dying);
      out.realPlantsAfter=plants.length;
      out.realErr=realErr;
      // 供截图：真实触发后的魅惑僵尸 + 另一只普通僵尸对比
      window.__V.clearWorld(); window.__V.setTime('night');
      plants=[]; zombies=[ window.__V.mkZ(2,360,180,'normal'), Object.assign(window.__V.mkZ(2,560,180,'normal'),{hypno:true}) ];
      screenShake.t=0; flashT=0; render();
      return out;
    })()`);
    console.log('[T5] '+JSON.stringify(hypno));
    const addOn = hypno.mag_hypno - hypno.mag_normal;
    const chillOk = hypno.mag_hypno_chill - hypno.mag_normal_chill;
    const butterOk = hypno.mag_hypno_butter - hypno.mag_normal_butter;
    const pass = addOn>30 && chillOk>30 && butterOk>30 && hypno.realHypno===true && hypno.realPlantDying===true;
    push('VIS-MUSH-HYPNO-01','被魅惑僵尸视觉区分（紫描边+螺旋 · tint 叠加后仍可辨识 · 含真实触发取证）', pass, [
      '净增紫红像素（hypno=true 相对 false）：无 tint='+addOn+' · +冰冻='+chillOk+' · +黄油='+butterOk+'（均 >30 ⇒ 描边/螺旋可辨识）',
      '明细 magenta 计数：normal='+hypno.mag_normal+' → hypno='+hypno.mag_hypno+' ; chill: '+hypno.mag_normal_chill+'→'+hypno.mag_hypno_chill+' ; butter: '+hypno.mag_normal_butter+'→'+hypno.mag_hypno_butter,
      '真实触发取证（夜 · 魅惑菇(3,2) 被啃）：z.hypno='+hypno.realHypno+' · 魅惑菇 _dying='+hypno.realPlantDying+' · 触发后 plants 数='+hypno.realPlantsAfter+(hypno.realErr?(' · 异常='+hypno.realErr):''),
      '★ 关注点：冰冻冷色 tint / 黄油黄色 tint 均绘制于魅惑描边之前 ⇒ 描边叠加其上不被吞没（主理人特别点名项）',
      '证据图: v23-hypno-zombie'+SUF+'.png / v23-hypno-chill'+SUF+'.png / v23-hypno-butter'+SUF+'.png',
    ], pass?null:'Major');
    // 截图：魅惑僵尸（含普通僵尸对照）
    await sleep(100); await shot('v23-hypno-zombie'+SUF+'.png');
    await evalPage(`(function(){ window.__V.freeze(); window.__V.setTime('night'); window.__V.clearWorld();
      zombies=[ Object.assign(window.__V.mkZ(2,470,180,'normal'),{hypno:true,slowT:2}) ]; plants=[]; screenShake.t=0; flashT=0; render(); return true; })()`);
    await sleep(100); await shot('v23-hypno-chill'+SUF+'.png');
    await evalPage(`(function(){ window.__V.freeze(); window.__V.setTime('night'); window.__V.clearWorld();
      zombies=[ Object.assign(window.__V.mkZ(2,470,180,'normal'),{hypno:true,freezeT:2}) ]; plants=[]; screenShake.t=0; flashT=0; render(); return true; })()`);
    await sleep(100); await shot('v23-hypno-butter'+SUF+'.png');
  } catch(err){ push('VIS-MUSH-HYPNO-01','被魅惑僵尸视觉区分', false, ['异常: '+(err&&err.message||err)], 'Major'); }

  // ==========================================================================
  // T6 · 弹体视觉（puff 紫孢子 / fume 灰烟雾）+ 大喷菇穿透
  // ==========================================================================
  try {
    proj = await evalPage(`(function(){
      window.__V.freeze(); window.__V.setTime('night'); window.__V.clearWorld();
      const g=window.__V.geo();
      const px=300, py=g.GRID_Y+2*g.CELL_H+g.CELL_H/2;
      const BX=px-30, BY=py-30, BW=60, BH=60;
      const out={};
      function sceneProj(pr){ plants=[]; zombies=[]; projectiles=pr?[pr]:[]; effects=[]; screenShake.t=0; flashT=0; toastT=0; render(); return window.__V.grab(BX,BY,BW,BH); }
      // puff 紫孢子弹
      const noP=sceneProj(null);
      const puffPr={x:px,y:py,row:2,type:'puff',vx:340,dead:false};
      const puffF=sceneProj(puffPr);
      out.puffDiff=window.__V.diff(puffF,noP,10);
      out.puffPurplePx=window.__V.countRGB(BX,BY,BW,BH,'purple');
      // fume 灰烟雾弹
      const fumePr={x:px,y:py,row:2,type:'fume',vx:340,pierce:true,hitIds:[],dead:false,rangeMax:4*90,x0:px};
      const fumeF=sceneProj(fumePr);
      out.fumeDiff=window.__V.diff(fumeF,noP,10);
      out.fumeGrayPx=window.__V.countRGB(BX,BY,BW,BH,'gray');
      // 穿透：大喷菇(3,2) + 同排 3 只僵尸 → 全部各掉 20 且弹体存活
      window.__V.clearWorld();
      const p=window.__V.mkPlant('fumeshroom',3,2,{}); plants=[p];
      zombies=[ window.__V.mkZ(2,500,180,'normal'), window.__V.mkZ(2,600,180,'normal'), window.__V.mkZ(2,700,180,'normal') ];
      const hp0=zombies.map(function(z){return z.hp;});
      try{ updatePlant(p,1/60); }catch(err){ out.fireErr=(err&&err.message)||String(err); }
      out.nProjAfterFire=projectiles.length;
      const pr0=projectiles[0];
      out.prPierce=pr0?!!pr0.pierce:null;
      // 步进（覆盖 >4 格）
      try{ for(let k=0;k<75;k++) updateProjectiles(1/60); }catch(err){ out.stepErr=(err&&err.message)||String(err); }
      out.hpLoss=zombies.map(function(z,i){return Math.round((hp0[i]-z.hp)*100)/100;});
      out.projAlive=projectiles.length;
      // 穿透中帧截图（弹体越过第 2 只僵尸时）
      window.__V.clearWorld();
      const p2=window.__V.mkPlant('fumeshroom',2,2,{}); plants=[p2];
      zombies=[ window.__V.mkZ(2,430,180,'normal'), window.__V.mkZ(2,560,180,'normal'), window.__V.mkZ(2,690,180,'normal') ];
      try{ updatePlant(p2,1/60); }catch(_){}
      try{ for(let k=0;k<28;k++) updateProjectiles(1/60); }catch(_){}
      out.renderErr=window.__V.safeRender();
      return out;
    })()`);
    console.log('[T6] '+JSON.stringify(proj));
    const pass = proj.puffDiff>40 && proj.puffPurplePx>20
      && proj.fumeDiff>40 && proj.fumeGrayPx>20
      && proj.nProjAfterFire>=1 && proj.prPierce===true
      && proj.hpLoss.length===3 && proj.hpLoss.every(v=>v>19.5&&v<20.5);
    push('VIS-MUSH-PROJ-01','弹体视觉（puff 紫孢子 / fume 灰烟雾）+ 大喷菇穿透', pass, [
      '小喷菇孢子弹（#d8b8ff→#7a3fb0 紫渐变）：弹体区差分='+proj.puffDiff+' · 紫色像素='+proj.puffPurplePx,
      '大喷菇烟雾弹（灰半透明多团）：弹体区差分='+proj.fumeDiff+' · 灰色像素='+proj.fumeGrayPx,
      '穿透：发射后弹体数='+proj.nProjAfterFire+' · pierce='+proj.prPierce+' · 同排 3 僵尸各掉血='+JSON.stringify(proj.hpLoss)+'（各恰 20 ⇒ 命中不消失且不重复扣血）',
      '穿透步进后存活弹体='+proj.projAlive+(proj.stepErr?(' · 异常='+proj.stepErr):''),
      'render 异常: '+(proj.renderErr||'无'),
      '证据图: v23-proj-puff'+SUF+'.png / v23-proj-fume'+SUF+'.png / v23-fume-pierce'+SUF+'.png',
    ], pass?null:'Major');
    // 截图：弹体特写
    await evalPage(`(function(){ window.__V.freeze(); window.__V.setTime('night'); window.__V.clearWorld();
      const g=window.__V.geo(); const py=g.GRID_Y+2*g.CELL_H+g.CELL_H/2;
      projectiles=[{x:300,y:py,row:2,type:'puff',vx:340,dead:false}];
      plants=[];zombies=[]; screenShake.t=0; flashT=0; render(); return true; })()`);
    await sleep(100); await shot('v23-proj-puff'+SUF+'.png');
    await evalPage(`(function(){ window.__V.freeze(); window.__V.setTime('night'); window.__V.clearWorld();
      const g=window.__V.geo(); const py=g.GRID_Y+2*g.CELL_H+g.CELL_H/2;
      projectiles=[{x:300,y:py,row:2,type:'fume',vx:340,pierce:true,hitIds:[],dead:false}];
      plants=[];zombies=[]; screenShake.t=0; flashT=0; render(); return true; })()`);
    await sleep(100); await shot('v23-proj-fume'+SUF+'.png');
    // 穿透中帧截图
    await evalPage(`(function(){ window.__V.freeze(); window.__V.setTime('night'); window.__V.clearWorld();
      const p=window.__V.mkPlant('fumeshroom',2,2,{}); plants=[p];
      zombies=[ window.__V.mkZ(2,430,180,'normal'), window.__V.mkZ(2,560,180,'normal'), window.__V.mkZ(2,690,180,'normal') ];
      try{ updatePlant(p,1/60); }catch(_){}
      try{ for(let k=0;k<28;k++) updateProjectiles(1/60); }catch(_){}
      screenShake.t=0; flashT=0; render(); return true; })()`);
    await sleep(100); await shot('v23-fume-pierce'+SUF+'.png');
  } catch(err){ push('VIS-MUSH-PROJ-01','弹体视觉 + 大喷菇穿透', false, ['异常: '+(err&&err.message||err)], 'Major'); }

  // ==========================================================================
  // 汇总
  // ==========================================================================
  const allPass = RESULTS.every(r=>r.pass);
  console.log('\n============ v2.3.0 四蘑菇真机视觉验收汇总 ('+(TAG||'new')+') ============');
  for(const r of RESULTS) console.log('  ['+(r.pass?'PASS':'FAIL')+'] '+r.id+' · '+r.title+(r.severity?('  (severity='+r.severity+')'):''));
  console.log('  子项: '+RESULTS.filter(r=>r.pass).length+'/'+RESULTS.length+' 通过');
  console.log('  总判定: '+(allPass?'PASS':'FAIL'));
  const outJson = {
    generated:new Date().toISOString(), target:VER, html:ARG_HTML, tag:(TAG||'new'),
    cards:CARDSN, env:ENV, overall:allPass?'PASS':'FAIL',
    total:RESULTS.length, pass:RESULTS.filter(r=>r.pass).length, fail:RESULTS.filter(r=>!r.pass).length,
    results:RESULTS,
    raw:{ t1:cardFrame, t3:worldRaw, t4:sleepTest, t5:hypno, t6:proj }
  };
  fs.writeFileSync(path.join(OUT,'v23-mushroom-visual-results'+SUF+'.json'), JSON.stringify(outJson, null, 2));
  console.log('  产物: '+path.join(OUT,'v23-mushroom-visual-results'+SUF+'.json'));

  ws.close();
  try{ e.kill() }catch(_){}
  await sleep(400);
  process.exit(allPass?0:1);
})().catch(er=>{ console.error('CRASH', er && er.stack || er.message); process.exit(2); });
