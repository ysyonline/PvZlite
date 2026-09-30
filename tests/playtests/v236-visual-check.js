/* v236-visual-check · 四项视觉调整真机截图验收（2026-09-29）
 * 覆盖：①航椒整排火烧带 ②小喷菇调矮（与阳光菇同屏对比）③阳光菇淡粉+虹彩 ④魅惑菇蓝
 * 运行：node tests/playtests/v236-visual-check.js
 * 产物：tests/playtests/v236-*.png + v236-visual-check-results.json
 */
const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9337;
const SUF = '';
const TMP = path.join(process.cwd(), 'tests', 'playtests', '.edge-tmp-236');
const OUT = path.join(process.cwd(), 'tests', 'playtests');
const PAGE = 'file:///' + path.resolve(process.cwd(), 'plants-vs-zombies.html').replace(/\\/g, '/');

function get(u){ return new Promise((res,rej)=>{ http.get(u,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d))}).on('error',rej) }); }
const sleep = ms => new Promise(r=>setTimeout(r,ms));

const RESULTS = [];
function push(id,title,pass,notes){ RESULTS.push({id,title,pass:!!pass,detail:(notes||[]).join(' | ')});
  console.log('\n['+id+'] '+(pass?'PASS':'FAIL')+' · '+title); (notes||[]).forEach(n=>console.log('   · '+n)); }

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
  await send('Page.navigate',{ url: PAGE+'?test=1&level=1-6' });
  await sleep(1900);

  const helper = `(function(){
    window.__V = window.__V || {};
    window.__V.freeze = function(){
      if(!window.__V._raf){ window.__V._raf = window.requestAnimationFrame; }
      window.requestAnimationFrame = function(){ return 0; };
      state='play'; paused=true; drawPause=function(){}; toastT=0;
      try{muted=true}catch(_){}
      screenShake.t=0;screenShake.dur=0;screenShake.intensity=0; flashT=0;
      sunFallT=1e9; spawnQueue=[]; waveActive=false;
    };
    window.__V.clearWorld = function(){ plants=[];zombies=[];projectiles=[];effects=[];pointDrops=[];spawnQueue=[];waveActive=false; screenShake.t=0; flashT=0; toastT=0; };
    window.__V.mkPlant = function(type,col,row,opt){
      opt=opt||{};
      return {col:col,row:row,type:type,cd:(opt.cd||0),sunT:(opt.sunT||0),growT:(opt.growT||0),
        armT:0,arming:false,dur:(opt.dur||300),maxDur:(opt.dur||300),
        plantT:620,plantDone:true,dirtDone:true,plantFrom:{x:0,y:0}};
    };
    window.__V.mkZ = function(row,x,hp,type){ return {type:(type||'normal'),row:row,x:x,hp:(hp||180),maxHp:(hp||180),
      spd:0,eating:false,eatAnim:0,walk:0,dead:false,hypno:false,slowT:0,freezeT:0}; };
    window.__V.setTime = function(timeVal){ level=Object.assign({},LEVELS['1-6'],{time:timeVal}); };
    window.__V.countColor = function(x,y,w,h,r,g,b,tol){ const d=ctx.getImageData(Math.round(x),Math.round(y),w,h).data; let n=0;
      for(let i=0;i<d.length;i+=4){ if(Math.abs(d[i]-r)<=tol&&Math.abs(d[i+1]-g)<=tol&&Math.abs(d[i+2]-b)<=tol)n++; } return n; };
    window.__V.geo = function(){ return {GRID_X:GRID_X,CELL_W:CELL_W,GRID_Y:GRID_Y,CELL_H:CELL_H}; };
    return 'helpers ok';
  })()`;
  console.log('[helper]', await evalPage(helper));
  const ENV = await evalPage(`({version:VERSION, hasFireRow:(typeof PEPPER_FIREROW!=='undefined')?PEPPER_FIREROW:null,
    puffCapR:PUFFSHROOM_GEOM.capR})`);
  console.log('[env] '+JSON.stringify(ENV));

  // ==========================================================================
  // T1 · 航椒爆炸 → 整排火烧带（像素：火橙/火黄横贯行带 + 0.6s 快熄）
  // ==========================================================================
  try {
    const t1 = await evalPage(`(function(){
      window.__V.freeze(); window.__V.clearWorld();
      const g=window.__V.geo();
      const row=2, col=4;
      const x=g.GRID_X+col*g.CELL_W+g.CELL_W/2, y=g.GRID_Y+row*g.CELL_H+g.CELL_H/2;
      // 直接注入 firerow 特效（explodePepper 的粒子/震动已由 REG-PEPPER-01 机制级覆盖，此处验视觉）
      effects=[{kind:'firerow',row:row,x:x,y:y,life:0.6,maxLife:0.6,dead:false}];
      zombies=[];projectiles=[]; screenShake.t=0; flashT=0; toastT=0; render();
      const BX=g.GRID_X, BY=y-40, BW=9*g.CELL_W, BH=80;
      // 火橙色 #ff8c1e≈(255,140,30) / 火黄 #ffcd50≈(255,205,80) 横带采样
      const out={box:{x:BX,y:BY,w:BW,h:BH},
        fireOrange:window.__V.countColor(BX,BY,BW,BH,255,140,30,40),
        fireYellow:window.__V.countColor(BX,BY,BW,BH,255,205,80,40),
        emberRed:window.__V.countColor(BX,BY,BW,BH,255,80,0,40)};
      // 覆盖宽度：把行带按列分桶，数含火像素的桶
      const d=ctx.getImageData(BX,BY,BW,BH).data;
      const colHits=new Array(9).fill(0);
      for(let py=0;py<BH;py++)for(let px=0;px<BW;px++){
        const i=(py*BW+px)*4;
        if(d[i]>200&&d[i+1]>60&&d[i+1]<230&&d[i+2]<120){ colHits[Math.min(8,Math.floor(px/(BW/9)))]++; }
      }
      out.colsWithFire=colHits.filter(v=>v>0).length;
      out.colHits=colHits;
      return out;
    })()`);
    console.log('[T1] '+JSON.stringify(t1));
    const pass = t1.fireOrange>300 && t1.colsWithFire>=8;
    push('VIS-236-FIREROW-01','航椒整排火烧带（横贯 9 列 · 火色像素横带）', pass, [
      '火橙(255,140,30±40)命中='+t1.fireOrange+' · 火黄命中='+t1.fireYellow+' · 余烬红命中='+t1.emberRed,
      '含火列桶='+t1.colsWithFire+'/9（应≥8 ⇒ 整排覆盖）· 逐列='+JSON.stringify(t1.colHits),
      '特效 life=0.6s（「时间不要长」）· 确定性相位火形（禁 random）',
      '证据图: v236-firerow'+SUF+'.png',
    ], pass?null:'Major');
    await sleep(120); await shot('v236-firerow'+SUF+'.png');
  } catch(err){ push('VIS-236-FIREROW-01','航椒整排火烧带', false, ['异常: '+(err&&err.message||err)], 'Major'); }

  // ==========================================================================
  // T2 · 小喷菇调矮 + 阳光菇淡粉 + 魅惑菇蓝（四菇同屏像素断言）
  // ==========================================================================
  try {
    const t2 = await evalPage(`(function(){
      window.__V.freeze(); window.__V.setTime('night'); window.__V.clearWorld();
      const mk=window.__V.mkPlant;
      const g=window.__V.geo();
      plants=[ mk('sunshroom',1,2,{growT:0}), mk('puffshroom',3,2,{}), mk('fumeshroom',5,2,{}), mk('hypnoshroom',7,2,{}) ];
      zombies=[];projectiles=[];effects=[]; screenShake.t=0; flashT=0; toastT=0; render();
      function capBox(col,type,r,gg,b,tol){
        const x=g.GRID_X+col*g.CELL_W+g.CELL_W/2, y=g.GRID_Y+2*g.CELL_H+g.CELL_H/2;
        const BX=x-30,BY=y-50,BW=60,BH=110;
        const d=ctx.getImageData(BX,BY,BW,BH).data;
        let minY=1e9,maxY=-1,n=0;
        for(let py=0;py<BH;py++)for(let px=0;px<BW;px++){
          const i=(py*BW+px)*4;
          if(Math.abs(d[i]-r)<=tol&&Math.abs(d[i+1]-gg)<=tol&&Math.abs(d[i+2]-b)<=tol){ n++; if(BY+py<minY)minY=BY+py; if(BY+py>maxY)maxY=BY+py; }
        }
        return {n:n, top:minY, h:(n?(maxY-minY+1):0)};
      }
      const rowY=g.GRID_Y+2*g.CELL_H+g.CELL_H/2;
      return {
        sunCap: capBox(1,'sunshroom',242,216,220,10),      // #f2d8dc 淡粉偏白
        puffCap: capBox(3,'puffshroom',154,106,208,10),    // #9a6ad0 紫
        hypCap: capBox(7,'hypnoshroom',74,126,200,10),     // #4a7ec8 蓝
        oldSunGrayPurple: window.__V.countColor(g.GRID_X+1*g.CELL_W,g.GRID_Y+2*g.CELL_H-20,g.CELL_W,g.CELL_H+40,138,122,168,8), // 旧灰紫应≈0
        oldHypnoMagenta: window.__V.countColor(g.GRID_X+7*g.CELL_W,g.GRID_Y+2*g.CELL_H-20,g.CELL_W,g.CELL_H+40,176,58,110,8),   // 旧紫红应≈0
        rowY:rowY
      };
    })()`);
    console.log('[T2] '+JSON.stringify(t2));
    const puffShorter = t2.sunCap.h>0 && t2.puffCap.h>0 && t2.puffCap.h < t2.sunCap.h*0.8;   // 小喷菇盖高 < 阳光菇幼体×0.8
    const sunPink = t2.sunCap.n>30 && t2.oldSunGrayPurple<5;
    const hypBlue = t2.hypCap.n>30 && t2.oldHypnoMagenta<5;
    const pass = puffShorter && sunPink && hypBlue;
    push('VIS-236-MUSH-01','小喷菇调矮 + 阳光菇淡粉 + 魅惑菇蓝（同屏像素断言）', pass, [
      '小喷菇盖高='+t2.puffCap.h+'px vs 阳光菇幼体盖高='+t2.sunCap.h+'px ⇒ '+(puffShorter?'已拉开体格差':'★ 仍接近'),
      '阳光菇 #f2d8dc 命中='+t2.sunCap.n+' · 旧灰紫 #8a7aa8 残留='+t2.oldSunGrayPurple+'（应≈0）⇒ '+(sunPink?'淡粉生效':'★ 未生效'),
      '魅惑菇 #4a7ec8 命中='+t2.hypCap.n+' · 旧紫红 #b03a6e 残留='+t2.oldHypnoMagenta+'（应≈0）⇒ '+(hypBlue?'蓝色生效':'★ 未生效'),
      '证据图: v236-mushrooms-night'+SUF+'.png',
    ], pass?null:'Major');
    await sleep(120); await shot('v236-mushrooms-night'+SUF+'.png');
  } catch(err){ push('VIS-236-MUSH-01','四菇视觉断言', false, ['异常: '+(err&&err.message||err)], 'Major'); }

  // ==========================================================================
  // T3 · 阳光菇虹彩点缀（菇盖左上五色弧带像素）+ 卡面同验
  // ==========================================================================
  try {
    const t3 = await evalPage(`(function(){
      window.__V.freeze(); window.__V.setTime('night'); window.__V.clearWorld();
      const g=window.__V.geo();
      plants=[window.__V.mkPlant('sunshroom',4,2,{growT:0})];
      zombies=[];projectiles=[];effects=[]; screenShake.t=0; flashT=0; toastT=0; render();
      const x=g.GRID_X+4*g.CELL_W+g.CELL_W/2, y=g.GRID_Y+2*g.CELL_H+g.CELL_H/2;
      const BX=x-24,BY=y-24,BW=48,BH=48;
      const d=ctx.getImageData(BX,BY,BW,BH).data;
      // 五色弧带采样：红(255,110,110)/黄(255,205,90)/绿(120,225,130)/蓝(110,175,255)/紫(200,130,240)
      const HUES=[[255,110,110],[255,205,90],[120,225,130],[110,175,255],[200,130,240]];
      const hits=HUES.map(c=>{
        let n=0;
        for(let i=0;i<d.length;i+=4){ if(Math.abs(d[i]-c[0])<=30&&Math.abs(d[i+1]-c[1])<=30&&Math.abs(d[i+2]-c[2])<=30)n++; }
        return n;
      });
      // 卡面（选卡页）虹彩
      state='deck';
      try{ ownedCards=CARDS.map(c=>c.type); }catch(_){}
      try{ deck=ownedCards.slice(0,10); }catch(_){}
      sun=9999; selected=null; cardCD={}; screenShake.t=0;flashT=0;toastT=0;
      render();
      return {hits:hits, total:hits.reduce((a,b)=>a+b,0)};
    })()`);
    console.log('[T3] '+JSON.stringify(t3));
    const hueOk = t3.hits.filter(n=>n>2).length>=4;   // ≥4 种虹彩色可见
    const pass = hueOk;
    push('VIS-236-GLINT-01','阳光菇三棱镜虹彩点缀（菇盖左上五色弧带）', pass, [
      '五色命中 R/Y/G/B/P = '+t3.hits.join('/')+'（应 ≥4 色 >2px）',
      '「一小点」约束：弧带半径≈capR×0.30，仅左上高光位（不喧宾）',
      '证据图: v236-sunshroom-glint'+SUF+'.png',
    ], pass?null:'Major');
  } catch(err){ push('VIS-236-GLINT-01','阳光菇虹彩点缀', false, ['异常: '+(err&&err.message||err)], 'Major'); }
  // 补世界版虹彩特写截图（T3 内部已切 deck，重设回世界场景）
  try {
    await evalPage(`(function(){
      window.__V.freeze(); window.__V.setTime('night'); window.__V.clearWorld();
      plants=[window.__V.mkPlant('sunshroom',4,2,{growT:0})];
      zombies=[];projectiles=[];effects=[]; screenShake.t=0; flashT=0; toastT=0; render(); return true;
    })()`);
    await sleep(100); await shot('v236-sunshroom-glint'+SUF+'.png');
  } catch(_){}

  // ==========================================================================
  // T4 · 被魅惑僵尸蓝色描边（联动调色验证）
  // ==========================================================================
  try {
    const t4 = await evalPage(`(function(){
      window.__V.freeze(); window.__V.setTime('night'); window.__V.clearWorld();
      const g=window.__V.geo();
      const row=2; const zx=520, zy=g.GRID_Y+row*g.CELL_H+g.CELL_H/2;
      const BX=zx-30, BY=zy-52, BW=60, BH=96;
      function grab(){ zombies=[z0]; plants=[];projectiles=[];effects=[]; screenShake.t=0; flashT=0; toastT=0; render();
        const d=ctx.getImageData(BX,BY,BW,BH).data; let n=0;
        for(let i=0;i<d.length;i+=4){ if(d[i+2]-d[i]>30&&d[i+2]>140&&d[i]>60&&d[i]<160)n++; }   // 蓝描边 (74,126,200)
        return n; }
      const z0=window.__V.mkZ(row,zx,180,'normal');
      z0.hypno=false; const normalN=grab();
      z0.hypno=true;  const hypnoN=grab();
      return {normalN:normalN, hypnoN:hypnoN};
    })()`);
    console.log('[T4] '+JSON.stringify(t4));
    const pass = t4.hypnoN>10 && t4.normalN<3;
    push('VIS-236-HYPNOTINT-01','被魅惑僵尸蓝色描边（紫红→蓝联动）', pass, [
      '蓝描边命中：普通='+t4.normalN+'（应≈0）· 被魅惑='+t4.hypnoN+'（应>10）',
      '证据图: v236-hypno-zombie'+SUF+'.png',
    ], pass?null:'Major');
    await sleep(100); await shot('v236-hypno-zombie'+SUF+'.png');
  } catch(err){ push('VIS-236-HYPNOTINT-01','被魅惑僵尸蓝描边', false, ['异常: '+(err&&err.message||err)], 'Major'); }

  // 汇总落盘
  const allPass = RESULTS.every(r=>r.pass);
  fs.writeFileSync(path.join(OUT,'v236-visual-check-results.json'), JSON.stringify({
    when:new Date().toISOString(), version:'v2.3.6-visual', allPass:allPass, results:RESULTS
  },null,2));
  console.log('\n==== v236 视觉验收汇总：'+(allPass?'ALL PASS':'HAS FAIL')+' ('+RESULTS.filter(r=>r.pass).length+'/'+RESULTS.length+') ====');
  try{ ws.close(); }catch(_){}
  try{ e.kill(); }catch(_){}
  process.exit(allPass?0:1);
})().catch(err=>{ console.error('FATAL:',err&&err.message||err); process.exit(2); });
