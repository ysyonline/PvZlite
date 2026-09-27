// ============================================================================
// v2.3.0 · 四种夜行蘑菇 真机（浏览器/CDP）视觉验收  ·  V23-VISUAL-01 (U7→U9)
// ----------------------------------------------------------------------------
// 运行（新源，默认 plants-vs-zombies.html）：
//   node tests/playtests/v23-mushroom-visual.js
// 运行（U8 之前对照 · 判别力自证；产物加 .u8pre 后缀）：
//   node tests/playtests/v23-mushroom-visual.js <tmp>/plants-70c7462.html u8pre
// 运行（v2.2.8 旧源对照；产物加 .old 后缀）：
//   node tests/playtests/v23-mushroom-visual.js production/release/v2.2.8/artifacts/plants-vs-zombies.v2.2.8.html old
// 只读源码，不修改任何 html；产物（截图 + results json）落 tests/playtests/。
//
// 验证项（U7 建立 · U9 升级 T4 + 新增 T7/T8）：
//   T1 四蘑菇卡面绘制（卡面美术区像素签名 + 各菇盖色值 + 四者互异）
//   T2 「☾ 夜行」角标判别力（蘑菇卡有角标像素 / 非蘑菇卡无 —— 正负双向断言）
//   T3 世界绘制四蘑菇（夜晚关卡 · 各菇盖色值 + 阳光菇成体金环 + 大喷菇烟雾 + 魅惑菇螺旋）
//   T4 ★U9 升级：四蘑菇白天沉睡姿态「真断言」（day 命中沉睡色且不命中清醒色 / night 反之；
//       + 盖下移压扁几何路由 + zzz/半闭眼特征路由；四菇逐个断言，不再只测 sunlight 单菇像素差）
//   T5 被魅惑僵尸视觉区分（紫色描边 + 头顶螺旋；叠加冰冻/黄油 tint 后仍可辨识；并含真实触发取证）
//   T6 弹体视觉（小喷菇紫孢子弹 / 大喷菇灰烟雾弹）+ 大喷菇穿透（同排多僵尸同时掉血）
//   T7 ★U9 新增：fog 浓雾关（2-6）四蘑菇可读性（可见边缘列原始主色命中 + 雾核区衰减色命中）
//   T8 ★U9 新增：19 张卡栏满配观感（选卡界面 19 卡可见/无重叠/无越界 + 「☾ 夜行」角标可辨）
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
    window.__V.setLevel = function(k){ levelKey=k; level=LEVELS[k]; };
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
    // ---- U9 新增像素工具 ----
    window.__V.px = function(x,y){ const d=ctx.getImageData(Math.round(x),Math.round(y),1,1).data; return [d[0],d[1],d[2],d[3]]; };
    // 命中主色的像素包围盒（供沉睡/清醒盖几何对比：minY/maxY 反映下沉+压扁）
    window.__V.colorBBox = function(x,y,w,h,r,g,b,tol){ const d=ctx.getImageData(Math.round(x),Math.round(y),w,h).data;
      let n=0,minX=1e9,minY=1e9,maxX=-1,maxY=-1;
      for(let i=0;i<d.length;i+=4){ if(Math.abs(d[i]-r)<=tol&&Math.abs(d[i+1]-g)<=tol&&Math.abs(d[i+2]-b)<=tol){
        const p=i/4, px=p%w, py=(p/w)|0; n++; if(px<minX)minX=px; if(px>maxX)maxX=px; if(py<minY)minY=py; if(py>maxY)maxY=py; } }
      return {count:n, minX:(n?minX:-1), minY:(n?minY:-1), maxX:(n?maxX:-1), maxY:(n?maxY:-1),
              h:(n?(maxY-minY+1):0), w:(n?(maxX-minX+1):0)}; };
    // 亮像素计数（三通道均 > thr）——用于睡眠符号「z z z」/半闭眼浅色线条特征
    window.__V.lightCount = function(x,y,w,h,thr){ thr=(thr===undefined)?185:thr; const d=ctx.getImageData(Math.round(x),Math.round(y),w,h).data; let n=0;
      for(let i=0;i<d.length;i+=4){ if(d[i]>thr&&d[i+1]>thr&&d[i+2]>thr)n++; } return n; };
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
  let cardFrame = null, worldRaw = null, sleepTest = null, hypno = null, proj = null, t7 = null, t8a = null, t8b = null;

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
  // T4 · ★U9 升级：四蘑菇白天沉睡姿态「真断言」（GDD v23 §2.2「半闭眼/耷拉姿态」）
  //   三路判据（门控两路 · ③ 作佐证）：
  //     ② 主色色差（门控）：day 命中 MUSHROOM_SLEEP_CAP 沉睡色、且不命中清醒盖主色；night 反之。
  //        采样点 = 清醒盖中心 (x, y+capdy) 与沉睡盖中心 (x, y+capdy+capDroop=5)（capdy 见源码 drawPlantInner）。
  //     ① 几何（门控）：命中主色的像素包围盒 —— day(沉睡) 相对 night(清醒) 盖顶下沉 + 盖高压扁。
  //     ③ 特征（佐证）：睡眠符号「z z z」浅色线条（三通道 >185）在清醒盖顶上方带内 day>0 且 night≈0。
  //   四菇逐个断言（不再只测单菇像素差）。
  // ==========================================================================
  try {
    sleepTest = await evalPage(`(function(){
      window.__V.freeze();
      const g=window.__V.geo();
      const MUSH=['sunshroom','puffshroom','fumeshroom','hypnoshroom'];
      // 源码 drawPlantInner 实测：清醒盖中心 dy；清醒/沉睡盖主色（MUSHROOM_SLEEP_CAP）
      const CAPDY ={sunshroom:2,puffshroom:6,fumeshroom:-2,hypnoshroom:4};
      const AWAKE ={sunshroom:[138,122,168],puffshroom:[154,106,208],fumeshroom:[122,79,176],hypnoshroom:[176,58,110]}; // #8a7aa8/#9a6ad0/#7a4fb0/#b03a6e
      const ASLEEP={sunshroom:[93,81,120],  puffshroom:[107,74,148], fumeshroom:[80,54,121],  hypnoshroom:[124,41,80]};  // #5d5178/#6b4a94/#503679/#7c2950
      const col=3,row=2;
      const x=g.GRID_X+col*g.CELL_W+g.CELL_W/2, y=g.GRID_Y+row*g.CELL_H+g.CELL_H/2;
      const BX=x-42,BY=y-64,BW=84,BH=124;
      function scene(timeVal,type){
        window.__V.setTime(timeVal);
        plants=type?[window.__V.mkPlant(type,col,row,{growT:0})]:[];
        zombies=[];projectiles=[];effects=[];screenShake.t=0;flashT=0;toastT=0;render();
      }
      const out={cell:{x:x,y:y}, srcHasBranch:false, mush:{}};
      try{ out.srcHasBranch=/MUSHROOM_SLEEP_CAP|MUSHROOM_SLEEP_GEOM/.test(drawPlantInner.toString()); }catch(_){}
      for(const t of MUSH){
        const capy=CAPDY[t], ay=y+capy, sy=ay+5;    // capDroop=5
        const A=AWAKE[t], S=ASLEEP[t];
        const r={capy:capy, awakePt:[x,ay], asleepPt:[x,sy], awakeColor:A, asleepColor:S};
        // ---- night（清醒）先渲染：取清醒盖顶，作为「盖上方带」基准（避免把清醒盖浅色斑点误判为 zzz）----
        scene('night',t);
        r.night_awakeHit  = window.__V.countColor(x-1,ay-1,3,3,A[0],A[1],A[2],10);  // 期望 >0
        r.night_asleepHit = window.__V.countColor(x-1,sy-1,3,3,S[0],S[1],S[2],10);  // 期望 0
        r.night_pxAwake   = window.__V.px(x,ay);
        r.night_pxAsleep  = window.__V.px(x,sy);
        r.night_cap       = window.__V.colorBBox(BX,BY,BW,BH,A[0],A[1],A[2],8);
        const capTopAbs = (r.night_cap.count? (BY + r.night_cap.minY) : (y-40));
        r.bandY = capTopAbs - 24;
        r.night_zzzLight  = window.__V.lightCount(x-26, r.bandY, 52, 23, 185);
        // ---- day（沉睡）----
        scene('day',t);
        r.day_awakeHit   = window.__V.countColor(x-1,ay-1,3,3,A[0],A[1],A[2],10);   // 期望 0
        r.day_asleepHit  = window.__V.countColor(x-1,sy-1,3,3,S[0],S[1],S[2],10);   // 期望 >0
        r.day_pxAwake    = window.__V.px(x,ay);
        r.day_pxAsleep   = window.__V.px(x,sy);
        r.day_cap        = window.__V.colorBBox(BX,BY,BW,BH,S[0],S[1],S[2],8);
        r.day_zzzLight   = window.__V.lightCount(x-26, r.bandY, 52, 23, 185);
        // 派生
        r.day_droop   = (r.day_cap.count&&r.night_cap.count)?(r.day_cap.minY - r.night_cap.minY):null;   // 盖顶下沉 px
        r.squashRatio = (r.night_cap.h)?(r.day_cap.h / r.night_cap.h):null;                               // 压扁比
        out.mush[t]=r;
      }
      return out;
    })()`);
    console.log('[T4] '+JSON.stringify(sleepTest));
    const M=['sunshroom','puffshroom','fumeshroom','hypnoshroom'];
    const near=(px,c,tol)=>{ tol=tol||4; return Math.abs(px[0]-c[0])<=tol&&Math.abs(px[1]-c[1])<=tol&&Math.abs(px[2]-c[2])<=tol; };
    const per={}; let pass=true;
    for(const t of M){ const r=sleepTest.mush[t];
      // 色差门控用「精确中心像素」（容差 4，抗锯齿不侵入内部填充）：positive 需命中、negative 需不命中
      const colorOk = !near(r.day_pxAwake, r.awakeColor) && near(r.day_pxAsleep, r.asleepColor)
                   && near(r.night_pxAwake, r.awakeColor) && !near(r.night_pxAsleep, r.asleepColor);
      r.colorOk=colorOk;
      const geoOk   = r.day_droop!=null && r.day_droop>=3 && r.squashRatio!=null && r.squashRatio<=0.85;
      const ok = colorOk && geoOk; per[t]=ok; if(!ok)pass=false; }
    const notes=[];
    for(const t of M){ const r=sleepTest.mush[t];
      notes.push((per[t]?'✓ ':'✗ ')+t+'｜色差 day[醒点='+r.day_pxAwake.slice(0,3).join(',')+' 睡点='+r.day_pxAsleep.slice(0,3).join(',')+'] night[醒点='+r.night_pxAwake.slice(0,3).join(',')+' 睡点='+r.night_pxAsleep.slice(0,3).join(',')+']（期望 day:≠'+r.awakeColor.join(',')+' & ='+r.asleepColor.join(',')+'；night 反之）'
        +'｜几何 盖顶下沉='+(r.day_droop==null?'-':r.day_droop)+'px 压扁比='+(r.squashRatio==null?'-':r.squashRatio.toFixed(3))
        +'｜特征 zzz亮线 day='+r.day_zzzLight+'/night='+r.night_zzzLight
        +'｜3×3窗口命中(佐证) 清醒色 day/night='+r.day_awakeHit+'/'+r.night_awakeHit+' 沉睡色 day/night='+r.day_asleepHit+'/'+r.night_asleepHit); }
    push('VIS-MUSH-SLEEP-01','四蘑菇白天沉睡姿态真断言（day 命中沉睡色且不命中清醒色 · night 反之 · 盖下沉压扁几何 · zzz 特征佐证）', pass, notes.concat([
      '门控判据（四菇逐个）：colorOk = 精确中心像素 day醒点≠清醒色 且 day睡点=沉睡色 且 night醒点=清醒色 且 night睡点≠沉睡色（容差 4）；geoOk = 盖顶下沉≥3px 且 压扁比≤0.85',
      '几何期望：下沉 5+capR×(0.84-0.60)≈9~10px；压扁比 ≈0.60/0.84=0.714（capSquash/capClean 0.60 vs 0.84；实测 0.50~0.54 系主色 bbox 被盖沿暗色椭圆截断，双向一致可比）',
      '取样几何：草坪关 格(3,2) 心 ('+sleepTest.cell.x+','+sleepTest.cell.y+')（x=100+90·col，y=132+104·row）',
      '注：3×3 窗口（容差 10）作佐证——大喷菇「3×3 沉睡色 night=6」系其清醒盖沿 #573380 与沉睡盖主色 #503679 仅差 7、落入窗口松散容差所致；门控用精确中心像素（容差 4）无误判',
      '魅惑菇无「半闭眼」为设计例外（盖面纹样为催眠螺旋，源码 drawMushroomZzz 单用）——其沉睡态仍以「zzz + 压扁变暗」可判',
      '源码佐证：drawPlantInner 含沉睡分支常量 = '+sleepTest.srcHasBranch,
      '证据图: v23-sleep-4mush-day'+SUF+'.png / v23-sleep-4mush-night'+SUF+'.png / v23-sleep-day'+SUF+'.png / v23-sleep-night'+SUF+'.png',
    ]), pass?null:'Major');
    // 截图：四菇同屏 · day（沉睡）/ night（清醒）对照
    await evalPage(`(function(){ window.__V.freeze(); window.__V.setTime('day'); window.__V.clearWorld();
      const mk=window.__V.mkPlant;
      plants=[mk('sunshroom',1,2,{growT:0}),mk('puffshroom',3,2,{}),mk('fumeshroom',5,2,{}),mk('hypnoshroom',7,2,{})];
      screenShake.t=0;flashT=0;toastT=0;render(); return true; })()`);
    await sleep(120); await shot('v23-sleep-4mush-day'+SUF+'.png');
    await evalPage(`(function(){ window.__V.freeze(); window.__V.setTime('night'); window.__V.clearWorld();
      const mk=window.__V.mkPlant;
      plants=[mk('sunshroom',1,2,{growT:0}),mk('puffshroom',3,2,{}),mk('fumeshroom',5,2,{}),mk('hypnoshroom',7,2,{})];
      screenShake.t=0;flashT=0;toastT=0;render(); return true; })()`);
    await sleep(120); await shot('v23-sleep-4mush-night'+SUF+'.png');
    // 单菇特写（sunshroom）
    await evalPage(`(function(){ window.__V.freeze(); window.__V.setTime('day'); window.__V.clearWorld();
      plants=[window.__V.mkPlant('sunshroom',4,2,{})]; screenShake.t=0;flashT=0;render(); return true; })()`);
    await sleep(100); await shot('v23-sleep-day'+SUF+'.png');
    await evalPage(`(function(){ window.__V.freeze(); window.__V.setTime('night'); window.__V.clearWorld();
      plants=[window.__V.mkPlant('sunshroom',4,2,{})]; screenShake.t=0;flashT=0;render(); return true; })()`);
    await sleep(100); await shot('v23-sleep-night'+SUF+'.png');
  } catch(err){ push('VIS-MUSH-SLEEP-01','四蘑菇白天沉睡姿态真断言', false, ['异常: '+(err&&err.message||err)], 'Major'); }

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
  // T7 · ★U9 新增：fog 浓雾关（2-6）四蘑菇可读性
  //   浓雾遮罩（源码 T-402）：主带 alpha 0.80 白雾覆盖 x∈[FX0,FX1]=[100,820]，
  //   仅 col0 左半列（x<100）+ col8 右半列（x>820）清晰可见（两末端 30px 柔和过渡）。
  //   判据：① 可见边缘列（col0/col8）原始菇盖主色命中 >0（玩家可辨识）；
  //         ② 雾核区（col4）原始主色被雾吞（≈0）但「雾混色」命中 >0 ⇒ 菇体确已绘制（非缺失），仅被雾叠加遮蔽。
  // ==========================================================================
  try {
    t7 = await evalPage(`(function(){
      window.__V.freeze();
      window.__V.setLevel('2-6');   // 真·浓雾关（world2 pool · time=fog）
      const g=window.__V.geo();
      const MUSH=['sunshroom','puffshroom','fumeshroom','hypnoshroom'];
      const CAP={sunshroom:[138,122,168],puffshroom:[154,106,208],fumeshroom:[122,79,176],hypnoshroom:[176,58,110]};
      const row=2;   // 世界2 水域行 WATER_ROWS=[1,3] ⇒ row2=旱地草坪
      const out={level:levelKey, time:level.time, world:level.world,
                 waterRows:(typeof WATER_ROWS!=='undefined')?WATER_ROWS.slice():null,
                 fog:{FX0:g.GRID_X+g.CELL_W/2, FX1:g.GRID_X+9*g.CELL_W-g.CELL_W/2}, mush:{}};
      function renderAt(col,type){
        const x=g.GRID_X+col*g.CELL_W+g.CELL_W/2, y=g.GRID_Y+row*g.CELL_H+g.CELL_H/2;
        plants=type?[window.__V.mkPlant(type,col,row,{growT:0})]:[];
        zombies=[];projectiles=[];effects=[];screenShake.t=0;flashT=0;toastT=0;render();
        return {x:x,y:y};
      }
      const ALPHA=0.80, FC=[235,240,245];   // 雾主带：rgba(235,240,245,0.80)（源码 T-402）
      for(const t of MUSH){
        const c=CAP[t];
        const blend=[Math.round((1-ALPHA)*c[0]+ALPHA*FC[0]),Math.round((1-ALPHA)*c[1]+ALPHA*FC[1]),Math.round((1-ALPHA)*c[2]+ALPHA*FC[2])];
        const r={blendedColor:blend};
        const spots=[['edgeL',0],['core',4],['edgeR',8]];
        for(let s=0;s<spots.length;s++){
          const name=spots[s][0], col=spots[s][1];
          const p=renderAt(col,t);
          const BX=p.x-40,BY=p.y-60,BW=80,BH=120;
          r[name]={x:p.x, rawCap:window.__V.countColor(BX,BY,BW,BH,c[0],c[1],c[2],10),
                   blendCap:window.__V.countColor(BX,BY,BW,BH,blend[0],blend[1],blend[2],16)};
        }
        out.mush[t]=r;
      }
      // 组合截图：四菇沿岸分布（col0/2/4/6 · row2）
      const mk=window.__V.mkPlant;
      plants=[mk('sunshroom',0,2,{growT:0}),mk('puffshroom',2,2,{}),mk('fumeshroom',4,2,{}),mk('hypnoshroom',6,2,{})];
      zombies=[];projectiles=[];effects=[];screenShake.t=0;flashT=0;toastT=0;
      out.renderErr=window.__V.safeRender();
      return out;
    })()`);
    console.log('[T7] '+JSON.stringify(t7));
    await sleep(120); await shot('v23-fog-mushrooms'+SUF+'.png');
    const M7=['sunshroom','puffshroom','fumeshroom','hypnoshroom'];
    const edgeOk = M7.every(t=>t7.mush[t].edgeL.rawCap>0 && t7.mush[t].edgeR.rawCap>0);
    const coreDrawn = M7.every(t=>t7.mush[t].core.blendCap>0);
    const coreRaw = M7.reduce((a,t)=>a+t7.mush[t].core.rawCap,0);
    const pass = edgeOk && coreDrawn;
    push('VIS-MUSH-FOG-01','fog 浓雾关（2-6）四蘑菇可读性（可见边缘列主色命中 · 雾核区衰减色命中⇒确已绘制）', pass, [
      '关卡 '+t7.level+'（world'+t7.world+' · time='+t7.time+' · 水域行='+JSON.stringify(t7.waterRows)+'）· 采样行 row2（旱地）',
      '雾带几何：主带 x∈['+t7.fog.FX0+','+t7.fog.FX1+'] alpha0.80（源码 T-402）⇒ 边缘列 col0/col8 可见、col1..7 被遮蔽',
      M7.map(t=>t+'｜边缘L 原始主色='+t7.mush[t].edgeL.rawCap+' 边缘R='+t7.mush[t].edgeR.rawCap+'｜雾核 原始主色='+t7.mush[t].core.rawCap+' 雾混色('+t7.mush[t].blendedColor.join(',')+')='+t7.mush[t].core.blendCap).join('  ||  '),
      '可见边缘列判定：四菇 col0/col8 原始主色命中均 >0 ⇒ '+(edgeOk?'清晰可辨':'★ 边缘列也不可辨（缺陷）'),
      '雾核区判定：四菇 col4 雾混色命中均 >0（合计原始主色='+coreRaw+'） ⇒ '+(coreDrawn?'菇体已绘制、仅被雾叠加遮蔽（符合 T-402 设计）':'★ 菇体缺失（缺陷）'),
      '证据图: v23-fog-mushrooms'+SUF+'.png',
    ], pass?null:'Major');
  } catch(err){ push('VIS-MUSH-FOG-01','fog 浓雾关四蘑菇可读性', false, ['异常: '+(err&&err.message||err)], 'Major'); }

  // ==========================================================================
  // T8 · ★U9 新增：19 张卡栏满配观感（选卡界面 + 对局内满配卡栏角标）
  //   T8-1 选卡界面（state='deck'）19 张待选卡：全部可见 / 两两不重叠 / 不出画布 / 不压下方卡槽栏（U6 自适应网格）
  //   T8-2 「☾ 夜行」角标：对局内满配卡栏四菇卡可辨 + 选卡界面是否承载角标
  // ==========================================================================
  try {
    t8a = await evalPage(`(function(){
      window.__V.freeze();
      state='deck';
      try{ ownedCards=CARDS.map(c=>c.type); }catch(_){}
      try{ deck=ownedCards.slice(0,10); }catch(_){}
      sun=9999; points=0; selected=null; cardCD={};
      screenShake.t=0;flashT=0;toastT=0;
      const out={ownedN:ownedCards.length, canvas:{w:canvas.width,h:canvas.height},
                 slotsY0:(typeof DECK_SLOTS!=='undefined')?DECK_SLOTS.y0:null, rects:[], layout:null};
      try{ out.layout=(typeof deckGridLayout==='function')?deckGridLayout(ownedCards.length):null; }catch(_){}
      if(out.layout){ for(let i=0;i<ownedCards.length;i++){ const R=deckCardRect(out.layout,i); out.rects.push({i:i,type:ownedCards[i],x:R.x,y:R.y,w:R.w,h:R.h}); } }
      const rs=out.rects; let overlap=0,oob=0,below=0;
      for(let i=0;i<rs.length;i++){ const a=rs[i];
        if(a.x<0||a.y<0||a.x+a.w>canvas.width||a.y+a.h>canvas.height)oob++;
        if(out.slotsY0!=null&&a.y+a.h>out.slotsY0)below++;
        for(let j=i+1;j<rs.length;j++){ const b=rs[j]; if(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)overlap++; } }
      out.overlap=overlap; out.oob=oob; out.belowSlots=below;
      // 选卡界面是否承载「☾ 夜行」角标：在蘑菇卡右下角「角标位」矩形内查 #c9b8ff（紧容差，避免误报）
      const NB=(typeof NOCTURNAL_BADGE!=='undefined')?NOCTURNAL_BADGE:{w:38,h:13};
      out.badge={w:NB.w,h:NB.h,mush:{}};
      const MM=['sunshroom','puffshroom','fumeshroom','hypnoshroom'];
      for(const t of MM){ const rc=rs.filter(function(x){return x.type===t;})[0];
        if(!rc){ out.badge.mush[t]={found:false}; continue; }
        const bx=rc.x+rc.w-NB.w-2, by=rc.y+rc.h-NB.h-2;
        out.badge.mush[t]={found:true, bx:bx, by:by, text:window.__V.countColor(bx,by,NB.w,NB.h,201,184,255,28)};
      }
      // 每卡「实际可见内容」：与同行背景（x=5 同 y 背景色，选卡页仅竖向渐变）差异像素数（>0 ⇒ 卡确已绘制）
      for(let i=0;i<rs.length;i++){ const a=rs[i]; const bg=window.__V.px(5, a.y+2);
        const d=ctx.getImageData(Math.round(a.x),Math.round(a.y),a.w,a.h).data; let n=0;
        for(let k=0;k<d.length;k+=4){ if(Math.abs(d[k]-bg[0])+Math.abs(d[k+1]-bg[1])+Math.abs(d[k+2]-bg[2])>30)n++; }
        a.content=n; }
      out.minContent=rs.reduce(function(m,a){return Math.min(m,a.content);}, 1e9);
      out.renderErr=window.__V.safeRender();
      return out;
    })()`);
    console.log('[T8a] '+JSON.stringify(t8a));
    await sleep(120); await shot('v23-select-19'+SUF+'.png');
    const rs=t8a.rects||[];
    const layoutOk = rs.length===19 && t8a.overlap===0 && t8a.oob===0 && t8a.belowSlots===0 && t8a.minContent>200 && !t8a.renderErr;
    push('VIS-MUSH-SELECT-01','19 张卡栏满配（选卡界面）：全部可见 · 无重叠 · 无越界 · 不压槽栏（U6 自适应网格）', layoutOk, [
      '待选卡数 = '+t8a.ownedN+' · 网格布局 cols='+((t8a.layout&&t8a.layout.cols))+',rows='+((t8a.layout&&t8a.layout.rows))+',卡高ch='+((t8a.layout&&t8a.layout.ch))+',底缘bottom='+((t8a.layout&&t8a.layout.bottom))+'（上限 槽栏y0='+t8a.slotsY0+'）',
      '两两重叠对='+t8a.overlap+' · 越画布='+t8a.oob+' · 压槽栏='+t8a.belowSlots+'（均应 0）',
      '每卡实际内容像素（与同行背景差异，应>200）最小='+t8a.minContent+' ⇒ '+(t8a.minContent>200?'19 卡均确已绘制':'★ 有卡未绘制'),
      '19 卡矩形样例：首'+JSON.stringify(rs[0])+' · 末'+JSON.stringify(rs[18]),
      'render 异常: '+(t8a.renderErr||'无'),
      '证据图: v23-select-19'+SUF+'.png',
    ], layoutOk?null:'Major');

    t8b = await evalPage(`(function(){
      window.__V.freeze();
      state='play'; paused=true; sun=9999; selected=null; cardCD={};
      if(typeof slots!=='undefined') slots=10;
      window.__V.setLevel('1-6'); window.__V.clearWorld();
      deck=['sunshroom','puffshroom','fumeshroom','hypnoshroom','pea','sunflower','nut','mine','melon','corn'];
      screenShake.t=0;flashT=0;toastT=0; render();
      const NB=(typeof NOCTURNAL_BADGE!=='undefined')?NOCTURNAL_BADGE:{w:38,h:13};
      const out={slots:(typeof slots!=='undefined')?slots:null, deckN:deck.length, CARD_X0:CARD_X0, CARD_W:CARD_W, CARD_Y:CARD_Y, CARD_H:CARD_H, badge:{w:NB.w,h:NB.h}, items:{}};
      const M=['sunshroom','puffshroom','fumeshroom','hypnoshroom'];
      for(const t of M){ const i=deck.indexOf(t);
        if(i<0){ out.items[t]={i:-1,text:-1}; continue; }
        const cx=CARD_X0+i*CARD_W, bx=cx+CARD_W-NB.w-2, by=CARD_Y+CARD_H-NB.h-2;
        out.items[t]={i:i,cx:cx,text:window.__V.countColor(bx,by,NB.w,NB.h,201,184,255,45)}; }
      out.renderErr=window.__V.safeRender();
      return out;
    })()`);
    console.log('[T8b] '+JSON.stringify(t8b));
    await sleep(120); await shot('v23-cardbar-full'+SUF+'.png');
    const M=['sunshroom','puffshroom','fumeshroom','hypnoshroom'];
    const barOk = M.every(t=>t8b.items[t] && t8b.items[t].text>0);
    push('VIS-MUSH-BADGE-02','「☾ 夜行」角标可辨识（对局内满配卡栏 10/10 含四菇）', barOk, [
      '对局内卡栏（deck='+t8b.deckN+'/'+t8b.slots+' 含四菇）：角标文字色 #c9b8ff 命中 '+M.map(t=>t+'='+(t8b.items[t]?t8b.items[t].text:'-')).join(' · ')+'（角标 38×13 于卡右下角，恒在冷却遮罩之上）',
      '⇒ '+(barOk?'四菇角标在满配卡栏均清晰可辨':'★ 不可辨'),
      '证据图: v23-cardbar-full'+SUF+'.png',
    ], barOk?null:'Minor');
    // 选卡界面 19 张满配下的角标（任务书 T8 第二断言）
    const selDetail = M.map(t=>t+'='+((t8a.badge&&t8a.badge.mush[t]&&t8a.badge.mush[t].found)?t8a.badge.mush[t].text:'NA'));
    const selBadgeOk = M.every(t=>t8a.badge&&t8a.badge.mush[t]&&t8a.badge.mush[t].found&&t8a.badge.mush[t].text>0);
    push('VIS-MUSH-BADGE-03','19 张满配选卡界面「☾ 夜行」角标可辨识', selBadgeOk, [
      '选卡界面 19 卡：四菇卡右下角「角标位」（38×13）内 #c9b8ff 紧容差命中 '+selDetail.join(' · '),
      '⇒ '+(selBadgeOk?'角标出现、可辨':'★ 发现（DEF-V23-VIS-02 · Minor）：选卡界面（drawSelectDeck）未绘制「☾ 夜行」角标'),
      selBadgeOk?'':'依据：源码 NOCTURNAL_BADGE 唯一消费点为 drawCardBar（L4360–4370）；drawSelectDeck 上排待选网格无角标分支。GDD v23 §2.2「卡面右下角标注「☾ 夜行」提示」在选卡界面未复现；对局内卡栏已具备（见 VIS-MUSH-BADGE-02）。属 v2.3 既有覆盖面（非 U6/U8 回归）——请用户/工程裁示是否补绘',
      '证据图: v23-select-19'+SUF+'.png',
    ], selBadgeOk?null:'Minor');
  } catch(err){ push('VIS-MUSH-BADGE-02','「☾ 夜行」角标满配可辨识', false, ['异常: '+(err&&err.message||err)], 'Minor'); }

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
    raw:{ t1:cardFrame, t3:worldRaw, t4:sleepTest, t5:hypno, t6:proj, t7:t7, t8a:t8a, t8b:t8b }
  };
  fs.writeFileSync(path.join(OUT,'v23-mushroom-visual-results'+SUF+'.json'), JSON.stringify(outJson, null, 2));
  console.log('  产物: '+path.join(OUT,'v23-mushroom-visual-results'+SUF+'.json'));

  ws.close();
  try{ e.kill() }catch(_){}
  await sleep(400);
  process.exit(allPass?0:1);
})().catch(er=>{ console.error('CRASH', er && er.stack || er.message); process.exit(2); });
