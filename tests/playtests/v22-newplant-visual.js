// ============================================================================
// v2.2 刀1 · 三新一次性植物 真机（浏览器/CDP）视觉与行为验证  ·  V22-QA-02
// ----------------------------------------------------------------------------
// 运行：node tests/playtests/v22-newplant-visual.js
// 只读 plants-vs-zombies.html，不修改任何源码；产物（截图 + json）落 tests/playtests/。
//
// 验证项（对应主理人任务书 D2）：
//   T1 窝瓜跳跃三阶段动画（压缩 0–0.15s / 起飞 0.15–0.45s / 下落 0.45–0.6s）+ 抛物线几何
//   T2 一次性植物血条排除（squash/pepper/cherry/mine 不画血条；pea/nut 画）
//   T3 航椒全排火焰波（粒子向两侧扩散 + 冲击波 + 火球 + 全排清场 + 他排不受影响）
//   T4 樱桃 3×3 冲击波（跨行秒杀 + 冲击波环 + 边缘不越界）
//   T5 三新卡面绘制（卡栏像素签名）
//
// 手法（沿用 v16-throw-arc-visual.js 已验证套路）：
//   headless Edge + CDP → 页面内 `paused=true; drawPause=function(){}` 冻结主循环 →
//   直接调 updatePlant/render 手动步进 → Runtime.evaluate 读游戏全局 + getImageData 做像素度量。
//   ★ 冻结是关键：否则 RAF 主循环会在截图前重绘并覆盖布景帧。
//   ★ 像素差分的噪声基线：同状态连续两次 render 的差分（T1 内自测）。
// ============================================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { execFile } = require('child_process');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9361;                                   // 避开 9351(v15)/9352(v16)/9353(v16-arc)
const TMP  = path.join(process.cwd(), '.tmp-v22-visual');
const OUT  = path.join(process.cwd(), 'tests', 'playtests');
const PAGE = 'file:///' + process.cwd().replace(/\\/g, '/') + '/plants-vs-zombies.html';

function get(u){ return new Promise((res,rej)=>{ http.get(u,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d))}).on('error',rej) }); }
const sleep = ms => new Promise(r=>setTimeout(r,ms));

const RESULTS = [];
function push(id,title,pass,notes,sev){ RESULTS.push({id:id,title:title,pass:!!pass,severity:sev||null,detail:(notes||[]).join(' | ')});
  console.log('\n['+id+'] '+(pass?'PASS':'FAIL')+' · '+title); (notes||[]).forEach(n=>console.log('   · '+n)); }

(async () => {
  // ★ 坑位：本会话 fs.rmSync 会走 safe-delete shim（genie-trash.exe）并 ETIMEDOUT —— 不做删除，
  //   TMP 用固定名（.gitignore 已忽略 .tmp-*），复用 profile 目录无副作用。
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
  await send('Page.navigate',{ url: PAGE+'?test=1&level=1-1' });
  await sleep(1800);

  // ---------------- 页面内助手 ----------------
  const helper = `(function(){
    window.__V = window.__V || {};
    window.__V._drawPause = drawPause;          // 保存原 drawPause（真机主循环复现用）
    window.__V.freeze = function(){
      // ★ 真正停掉 RAF 链：loop() 每帧末尾都会 requestAnimationFrame(loop)，即使 paused=true
      //   也会持续 render() 覆盖手动布景帧（首版踩坑：像素度量出现跨帧竞态/非确定色数）。
      if(!window.__V._raf){ window.__V._raf = window.requestAnimationFrame; }
      window.requestAnimationFrame = function(){ return 0; };
      state='play'; paused=true; drawPause=function(){}; toastT=0; warn.active=false;
      try{muted=true}catch(_){}
      screenShake.t=0;screenShake.dur=0;screenShake.intensity=0; flashT=0;
      sunFallT=1e9; spawnQueue=[]; waveActive=false;
    };
    window.__V.unfreeze = function(){
      if(window.__V._raf) window.requestAnimationFrame = window.__V._raf;
      lastT = performance.now();          // 防 dt 突跳（loop 首帧 dt=clamp(now-lastT)）
      paused=false;
    };
    window.__V.clearWorld = function(){ plants=[];zombies=[];projectiles=[];effects=[];pointDrops=[];spawnQueue=[];waveActive=false; screenShake.t=0; flashT=0; };
    window.__V.mkZ = function(row,x,hp,spd){ return {type:'normal',row:row,x:x,hp:hp||180,maxHp:hp||180,spd:spd||0,eating:false,eatAnim:0,walk:0,dead:false}; };
    window.__V.mkZB = function(row,x,hp){ const z=window.__V.mkZ(row,x,hp,0); z.type='bucket'; return z; };
    window.__V.setPlant = function(type,col,row){ const p=spawnPlant(type,col,row,0); p.plantT=620; p.plantDone=true; p.dirtDone=true; p.cd=0; return p; };
    // 安全 render：捕获渲染期异常（不中断脚本，交给宿主判 FAIL）
    window.__V.safeRender = function(){
      try{ render(); return null; }
      catch(err){ return (err && err.message) ? err.message : String(err); }
    };
    // 像素抓取（差分度量区：草坪中部 y170..520，避开 row0 与 HUD/卡栏）
    window.__V.RG = {x:0,y:170,w:1000,h:350};
    window.__V.grab = function(){ const r=window.__V.RG; return ctx.getImageData(r.x,r.y,r.w,r.h).data.slice(); };
    window.__V.diff = function(base){
      const d=window.__V.grab(); let n=0,sx=0,sy=0,minY=1e9,maxY=-1e9;
      for(let i=0;i<d.length;i+=4){
        const dr=d[i]-base[i], dg=d[i+1]-base[i+1], db=d[i+2]-base[i+2];
        if(Math.abs(dr)+Math.abs(dg)+Math.abs(db)>60){
          const p=i/4, x=p%1000, y=window.__V.RG.y+((p/1000)|0);
          n++; sx+=x; sy+=y; if(y<minY)minY=y; if(y>maxY)maxY=y;
        }
      }
      return {n:n, cx:n?+(sx/n).toFixed(1):0, cy:n?+(sy/n).toFixed(1):0, minY:n?minY:null, maxY:n?maxY:null};
    };
    return 'helpers ok';
  })()`;
  console.log('[helper]', await evalPage(helper));
  await evalPage(`window.__V.freeze(); true`);
  const VER = await evalPage('VERSION');
  const CARDSN = await evalPage('CARDS.length');
  console.log('[env] VERSION='+JSON.stringify(VER)+' CARDS='+CARDSN);

  // ==========================================================================
  // T1 · 窝瓜跳跃三阶段 + 抛物线几何（确定性逐帧布景 + 像素差分）
  // ==========================================================================
  const JUMP_TS = [0.03, 0.10, 0.20, 0.30, 0.45, 0.58];    // 覆盖 压缩/起飞/下落 三段
  const noise = await evalPage(`(function(){
    window.__V.clearWorld(); render(); const a=window.__V.grab(); render();
    return window.__V.diff(a);
  })()`);
  console.log('[noise] 同状态双 render 差分 n='+noise.n+'（噪声基线，应≈0）');

  const jr = await evalPage(`(function(){
    window.__V.clearWorld();
    const p = window.__V.setPlant('squash',1,2);
    render(); const base = window.__V.grab();       // 基线：空草坪
    plants=[p];
    zombies=[window.__V.mkZ(2,490,180,0)];          // 真实目标（供 updatePlant 锁定）
    updatePlant(p, 1/60);                     // 触发起跳：jumping=true, jumpT=0, jumpTarget=z
    const meta = {jumping:!!p.jumping, jumpFromX:p.jumpFromX, jumpFromY:p.jumpFromY,
                  targetX:p.jumpTarget?p.jumpTarget.x:null};
    // ★ 锁定后移走目标僵尸：它会与落点（x=490）的窝瓜重叠，遮挡导致末帧差分像素锐减（假信号）。
    //   jumpTarget 是引用，移除 zombies 中的实体不影响 drawPlant 的落点插值。
    zombies=[];
    const out=[];
    const ts = ${JSON.stringify(JUMP_TS)};
    for(const t of ts){
      p.jumping=true; p.jumpT=t;
      screenShake.t=0; flashT=0;
      render();
      out.push(Object.assign({t:t}, window.__V.diff(base)));
    }
    return {meta:meta, samples:out};
  })()`);
  console.log('[jump] meta='+JSON.stringify(jr.meta));
  jr.samples.forEach(s=>console.log('   t='+s.t+'  n='+s.n+'  cx='+s.cx+'  cy='+s.cy+'  y∈['+s.minY+','+s.maxY+']'));

  {
    const S = jr.samples;
    const ok = S.length===6 && S.every(s=>s.n>200);
    const cx0 = S[0].cx, cxN = S[S.length-1].cx;
    const cy0 = S[0].cy;
    const cyMin = Math.min(...S.map(s=>s.cy));
    const iMin  = S.map(s=>s.cy).indexOf(cyMin);
    const cyEnd = S[S.length-1].cy;
    const nCompress = S[0].n, nOpen = S[3].n;    // t=0.03(压缩 js≈0.78) vs t=0.30(展开 js=1.0)
    const mono = S.every((s,i)=> i===0 || s.cx >= S[i-1].cx - 2);
    const notes = [
      '噪声基线 n='+noise.n+'（同状态双 render 差分，证明差分度量非幻影）',
      '起跳元数据 jumping='+jr.meta.jumping+' from=('+jr.meta.jumpFromX+','+jr.meta.jumpFromY+') target.x='+jr.meta.targetX,
      '质心 x：'+S.map(s=>s.cx).join(' → ')+'（期望 190 → 490，单调递增='+mono+'）',
      '质心 y：'+S.map(s=>s.cy).join(' → ')+'（抛物线：顶点 idx='+iMin+' · 升空 '+(cy0-cyMin).toFixed(1)+'px · 回落 '+(cyEnd-cyMin).toFixed(1)+'px）',
      '三阶段缩放：压缩帧 n='+nCompress+' vs 展开帧 n='+nOpen+'（比值 '+(nCompress/nOpen).toFixed(2)+'，期望 <0.85 ⇒ 压缩段可见）',
      '证据图: v22-squash-jump-compress.png / -rise.png / -fall.png',
    ];
    const pass = ok && mono && (cxN-cx0) > 240 && (cy0-cyMin) > 40 && (cyEnd-cyMin) > 25
                 && (nCompress/nOpen) < 0.85;
    push('VIS-SQUASH-01','窝瓜跳跃三阶段动画 + 抛物线几何（真机像素）', pass, notes, pass?null:'Major');
  }
  // 三阶段截图（复用同一确定性布景）
  for (const [tv,name] of [[0.05,'v22-squash-jump-compress.png'],[0.30,'v22-squash-jump-rise.png'],[0.56,'v22-squash-jump-fall.png']]) {
    await evalPage(`(function(){
      window.__V.clearWorld();
      const p=window.__V.setPlant('squash',1,2); plants=[p];
      zombies=[window.__V.mkZ(2,490,180,0)];
      updatePlant(p,1/60); p.jumping=true; p.jumpT=${tv}; screenShake.t=0; flashT=0; render();
      return true;
    })()`);
    await sleep(120); await shot(name);
  }

  // ==========================================================================
  // T2 · 一次性植物血条排除
  // ==========================================================================
  const hp = await evalPage(`(function(){
    window.__V.clearWorld();
    const spec=[['pea',1,1],['nut',3,1],['mine',5,1],['squash',7,1],['pepper',1,3],['cherry',3,3]];
    plants = spec.map(function(s){ return window.__V.setPlant(s[0],s[1],s[2]); });
    plants.forEach(function(p){ p.dur = p.maxDur*0.5; });      // 全部压到 50% ⇒ 非一次性植物必画血条
    screenShake.t=0; flashT=0; render();
    const out={};
    spec.forEach(function(s){
      const pos=gridToPos(s[1],s[2]);
      const d=ctx.getImageData(Math.round(pos.x-24), Math.round(pos.y-42), 48, 4).data;
      let black=0,grn=0,red=0,samples=[];
      for(let i=0;i<d.length;i+=4){
        const R=d[i],G=d[i+1],B=d[i+2];
        if(R<=16&&G<=16&&B<=16) black++;
        else if(Math.abs(R-51)<=14&&Math.abs(G-187)<=14&&Math.abs(B-51)<=14) grn++;
        else if(Math.abs(R-255)<=14&&Math.abs(G-102)<=14&&Math.abs(B-51)<=14) red++;
        if(samples.length<3) samples.push(R+','+G+','+B);
      }
      out[s[0]]={black:black,green:grn,red:red,sample:samples.join(' / ')};
    });
    return out;
  })()`);
  console.log('[hpbar] '+JSON.stringify(hp));
  {
    const ONCE = ['mine','squash','pepper','cherry'];
    const bar = (t)=>hp[t].black + hp[t].green + hp[t].red;
    const ctlOk = bar('pea')>=60 && bar('nut')>=60;
    const onceClean = ONCE.every(t=>bar(t)===0);
    const notes = [
      '对照（50% 耐久，应画血条）：pea black='+hp.pea.black+' green='+hp.pea.green+' · nut black='+hp.nut.black+' green='+hp.nut.green,
      '一次性（应无血条）：'+ONCE.map(t=>t+'='+bar(t)).join(' · '),
      '血条矩形 = [格心x-24, 格心y-42, 48×4]（源码 drawPlantInner 末尾 fillRect 口径）',
      '证据图: v22-hpbar-exclusion.png',
    ];
    push('VIS-HPBAR-01','一次性植物不画血条（squash/pepper/cherry/mine）· 对照 pea/nut 画', ctlOk&&onceClean, notes, (ctlOk&&onceClean)?null:'Minor');
  }
  await shot('v22-hpbar-exclusion.png');

  // ==========================================================================
  // T3 · 航椒全排火焰波
  // ==========================================================================
  const pep = await evalPage(`(function(){
    window.__V.clearWorld();
    plants=[window.__V.setPlant('pepper',1,2)];
    zombies=[ window.__V.mkZ(2,190,180,0), window.__V.mkZ(2,400,180,0), window.__V.mkZB(2,700,560),
              window.__V.mkZ(2,850,180,0), window.__V.mkZ(3,190,180,0) ];
    const before = zombies.length;
    screenShake.t=0; flashT=0; window.__V.safeRender();
    updatePlant(plants[0], 1/60);                       // 引爆
    const parts = effects.filter(function(e){return e.kind==='particle';});
    const fire  = parts.filter(function(e){return e.color==='#ff6a00'||e.color==='#ffb830';});
    const sw    = effects.filter(function(e){return e.kind==='shockwave';});
    const boom  = effects.filter(function(e){return e.kind==='boom';});
    const r = {
      before:before,
      // ★ 不调 updateZombies ⇒ _dying 植物未被 splice；一次性判据读 _dying 标记（与源码清理口径一致）
      plantsAfter:plants.length, plantDying: !!(plants[0] && plants[0]._dying),
      row2Alive: zombies.filter(function(z){return !z.dead&&z.row===2;}).length,
      row3Alive: zombies.filter(function(z){return !z.dead&&z.row===3;}).length,
      parts:parts.length, fire:fire.length,
      spreadR: fire.filter(function(e){return e.vx>0;}).length,
      spreadL: fire.filter(function(e){return e.vx<0;}).length,
      shockwave: sw.map(function(e){return {rStart:e.rStart,rEnd:e.rEnd,life:e.life};}),
      boom:boom.length, flashColor:flashColor, flashT:+flashT.toFixed(3),
      shake:{t:+screenShake.t.toFixed(3), intensity:screenShake.intensity},
    };
    r.renderErr = window.__V.safeRender();               // 爆炸帧供截图（捕获渲染异常）
    return r;
  })()`);
  console.log('[pepper] '+JSON.stringify(pep));
  await sleep(120); await shot('v22-pepper-flamewave.png');
  {
    const pass = pep.plantDying===true && pep.row2Alive===0 && pep.row3Alive===1
      && pep.fire>=30 && pep.spreadR>0 && pep.spreadL>0
      && pep.shockwave.length===1 && pep.shockwave[0].rEnd===200
      && pep.boom===1 && pep.flashColor==='#ff6a00';
    // 注：爆炸帧 render 异常（createRadialGradient r1<0）单独由 VIS-BOOM-01 判 Critical，
    //     此处只判「火焰波行为契约」本身，避免同一根因重复计入两条判据。
    const notes = [
      '一次性：plants[0]._dying='+pep.plantDying+'（不调 updateZombies ⇒ 未 splice，属预期）',
      '同排 4 只（含铁桶 560）→ 清零：row2 存活='+pep.row2Alive+'；他排 row3 存活='+pep.row3Alive+'（跨行=否）',
      '★ 爆炸帧 render 异常：'+(pep.renderErr||'无')+'（见 VIS-BOOM-01 根因分析）',
      '火焰粒子：fire='+pep.fire+'/parts='+pep.parts+'（源码 30 枚，色 #ff6a00/#ffb830）',
      '双向扩散：vx>0='+pep.spreadR+' · vx<0='+pep.spreadL+'（全排火焰波向两侧喷涌）',
      '冲击波环 rStart→rEnd = '+JSON.stringify(pep.shockwave)+' · 火球 boom='+pep.boom,
      '闪光 flashColor='+pep.flashColor+' t='+pep.flashT+' · 震屏 intensity='+pep.shake.intensity+'（请求 7 → 源码 §G clamp 6）',
      '证据图: v22-pepper-flamewave.png',
    ];
    push('VIS-PEPPER-01','航椒全排火焰波（同排清场 + 双向粒子 + 冲击波 + 闪光）', pass, notes, pass?null:'Major');
  }

  // ==========================================================================
  // T4 · 樱桃 3×3 冲击波 + 跨行秒杀
  // ==========================================================================
  const che = await evalPage(`(function(){
    window.__V.clearWorld();
    plants=[window.__V.setPlant('cherry',4,2)];
    const inCells=[[3,1],[4,1],[5,1],[3,2],[4,2],[5,2],[3,3],[4,3],[5,3]];
    const outCells=[[2,2],[6,2],[4,0],[4,4]];
    const CX=function(c){return GRID_X+c*CELL_W+CELL_W/2;};
    zombies = inCells.concat(outCells).map(function(s){ return window.__V.mkZ(s[1],CX(s[0]),180,0); });
    screenShake.t=0; flashT=0; window.__V.safeRender();
    updatePlant(plants[0], 1/60);                        // 引爆
    const parts = effects.filter(function(e){return e.kind==='particle';});
    const sw    = effects.filter(function(e){return e.kind==='shockwave';});
    const colOf=function(x){return Math.floor((x-GRID_X)/CELL_W);};
    const alive = zombies.filter(function(z){return !z.dead;}).map(function(z){return colOf(z.x)+','+z.row;}).sort();
    const r = {
      plantsAfter:plants.length, plantDying: !!(plants[0] && plants[0]._dying), aliveCount:alive.length, alive:alive,
      parts:parts.length, shockwave:sw.map(function(e){return {rStart:e.rStart,rEnd:e.rEnd};}),
      flashColor:flashColor, shake:{t:+screenShake.t.toFixed(3), intensity:screenShake.intensity},
    };
    r.renderErr = window.__V.safeRender();
    return r;
  })()`);
  console.log('[cherry] '+JSON.stringify(che));
  await sleep(120); await shot('v22-cherry-shockwave.png');
  {
    const want = ['2,2','4,0','4,4','6,2'].sort().join(',');
    const pass = che.plantDying===true && che.aliveCount===4 && che.alive.join(',')===want
      && che.shockwave.length===1 && che.shockwave[0].rEnd===135
      && che.flashColor==='#f44' && !che.renderErr;
    const notes = [
      '一次性：plants[0]._dying='+che.plantDying,
      '3×3 内 9 只（rows 1/2/3 × cols 3/4/5）→ 清零；幸存='+che.alive.join(' ')+'（期望恰为 dc=2 / dr=2 四只）',
      '★ 跨行秒杀成立：row1 与 row3（dr=1）被清空 —— 本作第一个跨行秒杀的真机证据',
      '冲击波环 rStart→rEnd = '+JSON.stringify(che.shockwave)+'（源码 rEnd=135，覆盖 3×3 对角线）',
      '粒子='+che.parts+' · 闪光='+che.flashColor+' · 震屏 intensity='+che.shake.intensity+'（请求 8：首次吃「失败进屋特写」名额放行为 8，之后 clamp 6 —— 见 VIS-SHAKE-01）',
      '证据图: v22-cherry-shockwave.png',
    ];
    push('VIS-CHERRY-01','樱桃 3×3 冲击波 + 跨行秒杀（真机）', pass, notes, pass?null:'Major');
  }

  // ==========================================================================
  // T5 · 三新卡面绘制（卡栏像素签名）
  // ==========================================================================
  const card = await evalPage(`(function(){
    window.__V.clearWorld();
    deck=['squash','pepper','cherry','mine','pea']; slots=10; cardCD={}; sun=9999; selected=null;
    screenShake.t=0; flashT=0; render();
    // ★ 采样区分两层：
    //   art   = (cx+4, CARD_Y+6, 80, 36) —— 纯卡面美术区（上段；避开底部公共绿底椭圆与卡名文字）
    //   full  = (cx+4, CARD_Y+6, 80, 50) —— drawCardFace 整个画布区（含公共底椭圆 + 卡名文字上缘）
    //   卡名文字以 baseline=CARD_Y+CARD_H-20=658 绘制 ⇒ 字形上缘（约 y646+）会侵入 full 区，
    //   故「卡面美术是否专属」必须以 art 区判定，full 区会被卡名文字干扰（首版即踩此坑）。
    function sig(i){
      const cx=CARD_X0+i*CARD_W;
      function stat(x,y,w,h){
        const d=ctx.getImageData(x,y,w,h).data;
        let sum=0, nz=0, hsh=0, uniq={};
        for(let k=0;k<d.length;k+=4){
          const v=d[k]*65536+d[k+1]*256+d[k+2];
          sum+=v; if(v>0)nz++; hsh=((hsh*31)+v)>>>0;
          uniq[d[k]+','+d[k+1]+','+d[k+2]]=1;
        }
        return {sum:sum, nz:nz, hash:hsh, colors:Object.keys(uniq).length};
      }
      return { art: stat(cx+4, CARD_Y+6, 80, 36), full: stat(cx+4, CARD_Y+6, 80, 50) };
    }
    return {squash:sig(0), pepper:sig(1), cherry:sig(2), mine:sig(3), pea:sig(4)};
  })()`);
  console.log('[cards] '+JSON.stringify(card));
  await sleep(120); await shot('v22-cardfaces.png');
  {
    const trio = ['squash','pepper','cherry'];
    const artNz = trio.map(t=>card[t].art.nz);
    const artColors = trio.map(t=>card[t].art.colors);
    const distinct = new Set(trio.map(t=>card[t].art.hash)).size;
    // ★ 期望：三新卡各有**专属卡面美术**（art 区像素非空且三者互异）。
    //   实测（见下）：drawCardFace 的 if/else 链终止于 cabbage，squash/pepper/cherry 无分支 ⇒
    //   art 区三者像素完全一致（只剩卡片底色）⇒ 判 FAIL（Major，仅报告不修，改码由 engineering-lead 派单）。
    const pass = artNz.every(n=>n>0) && distinct===3 && artColors.every(c=>c>=2);
    const notes = [
      'art 区（80×36 纯美术区）：'+trio.map((t,i)=>t+' nz='+artNz[i]+' colors='+artColors[i]+' hash='+card[t].art.hash).join(' · '),
      '对照（应有专属卡面）：mine nz='+card.mine.art.nz+' colors='+card.mine.art.colors+' · pea nz='+card.pea.art.nz+' colors='+card.pea.art.colors,
      '三者 art 区互异 hash 数 = '+distinct+'/3 ⇒ '+(distinct===3?'各有专属卡面':'★ 三者卡面美术像素完全一致（无专属绘制）'),
      'full 区（80×50，含卡名文字上缘）：'+trio.map(t=>t+' hash='+card[t].full.hash).join(' · ')+' —— 该区差异来自卡名文字，不可作为卡面美术判据（首版踩坑已修正）',
      '源码核对：drawCardFace 的 if/else 链终止于 cabbage；squash/pepper/cherry（与 snowpea）无分支 ⇒ 三者卡面仅余公共绿底椭圆 #8ab44a，玩家只能靠卡名文字区分',
      '证据图: v22-cardfaces.png',
    ];
    push('VIS-CARD-01','三新卡面专属美术绘制（卡栏 art 区像素互异）', pass, notes, pass?null:'Major');
  }

  // ==========================================================================
  // T6 · 真机主循环复现：爆炸特效渲染是否触发帧异常（loop 的 try/catch 会捕获并弹红条）
  //   ★ 勘测动机：T3 手工 render 时捕获到 DOMException（createRadialGradient r1<0）。
  //     源码 drawBoom: k=max(0, e.life/0.45) ⇒ life>0.45 时 k>1 ⇒ tn=1-k<0 ⇒ r<0 ⇒ 抛异常。
  //     地雷 boom life=0.45（k=1,t=0,r=0 安全）；航椒 boom life=**0.5** ⇒ k=1.111 ⇒ r<0 ⇒ 必抛。
  //   本项放开主循环（paused=false）真实跑帧，读 frameErr/frameErrT 判定玩家可见影响。
  // ==========================================================================
  const realLoop = {};
  for (const type of ['mine','pepper','cherry','squash']) {
    await evalPage(`(function(){
      window.__V.clearWorld();
      window.__V.unfreeze();            // 恢复 RAF + 重置 lastT
      drawPause = window.__V._drawPause;
      // 走真实开局路径（setState('play')），不用 state 直改 —— 保证波次/阳光/存档守卫均为真实语义
      // （页面经 ?level=1-1 载入，level 已是 1-1；setLevel 非页面全局，属 harness API）
      startGame('v22-realloop-${type}');
      paused=false; muted=true; sunFallT=1e9; spawnQueue=[]; waveActive=false;
      frameErr=null; frameErrT=0;
      const p = window.__V.setPlant('${type}',1,2);
      plants=[p];
      zombies=[ window.__V.mkZ(2,190,180,0), window.__V.mkZ(2,420,180,0), window.__V.mkZ(3,190,180,0) ];
      return true;
    })()`);
    await sleep(1200);                                    // 真实 RAF 跑 ~1.2s（>0.6s 跳跃 / 爆炸当帧）
    realLoop[type] = await evalPage(`({frameErr: frameErr ? (frameErr.message||String(frameErr)) : null,
                                       frameErrT:+frameErrT.toFixed(2),
                                       plants: plants.length,
                                       alive: zombies.filter(function(z){return !z.dead;}).length})`);
    console.log('[realloop] '+type+' → '+JSON.stringify(realLoop[type]));
    if (type === 'pepper') await shot('v22-pepper-frame-error-banner.png');
    await evalPage(`window.__V.freeze(); true`);          // 重新冻结，供后续项
  }
  {
    const pepErr  = realLoop.pepper.frameErr;
    const ctlOk   = !realLoop.mine.frameErr && !realLoop.cherry.frameErr && !realLoop.squash.frameErr;
    // 期望：三者引爆均**不**产生帧异常（地雷 life=0.45 安全 / 樱桃无 boom 特效 / 窝瓜无 boom 特效）
    const pass = !pepErr && ctlOk;
    const notes = [
      '真机主循环（paused=false，RAF 实跑 1.2s）逐类型读 loop() 的 frameErr 捕获：',
      '  mine   → '+(realLoop.mine.frameErr   || '无异常')+' · frameErrT='+realLoop.mine.frameErrT,
      '  pepper → '+(realLoop.pepper.frameErr || '无异常')+' · frameErrT='+realLoop.pepper.frameErrT,
      '  cherry → '+(realLoop.cherry.frameErr || '无异常')+' · frameErrT='+realLoop.cherry.frameErrT,
      '  squash → '+(realLoop.squash.frameErr || '无异常')+' · frameErrT='+realLoop.squash.frameErrT,
      '根因：drawBoom 用固定分母 0.45 归一 e.life；explodePepper 推 life=0.5 ⇒ k=1.111 ⇒ tn=-0.111 ⇒ r<0 ⇒ createRadialGradient 抛 IndexSizeError',
      '影响：loop() 的 try/catch 吞掉异常（不卡死），但帧渲染中断 + 屏幕底部弹 5s 红色「捕获到帧异常」横幅（frameErrT=5）',
      '证据图: v22-pepper-frame-error-banner.png',
    ];
    push('VIS-BOOM-01','爆炸特效渲染零帧异常（地雷/航椒/樱桃/窝瓜 真机主循环）', pass, notes, pass?null:'Critical');
  }

  // ==========================================================================
  // T7 · 樱桃 triggerShake(8) 与「失败进屋 8px 特例名额」冲突（triggerShake 的 loseShakeUsed 一次性闸门）
  //   源码：intensity===8 && !loseShakeUsed ⇒ 放行并**永久置位** loseShakeUsed；否则 clamp 到 6。
  //   explodeCherry 请求 8 ⇒ 首次樱桃爆炸吃掉该名额 ⇒ 后续所有樱桃爆炸恒为 6px（手感不一致），
  //   且「失败进屋 8px 特写」这一保留语义被樱桃抢占（当前失败进屋实际只用 3，故未暴露为可见缺陷）。
  // ==========================================================================
  const shake = await evalPage(`(function(){
    window.__V.freeze(); window.__V.clearWorld();
    loseShakeUsed=false; screenShake.t=0;
    const seq=[];
    const p=window.__V.setPlant('cherry',1,2); plants=[p];
    zombies=[window.__V.mkZ(2,190,180,0)];
    updatePlant(p,1/60);
    seq.push({when:'首次樱桃爆炸', intensity:screenShake.intensity, loseShakeUsed:loseShakeUsed});
    // 第二次樱桃爆炸（全新一株）
    screenShake.t=0;
    const p2=window.__V.setPlant('cherry',1,2); plants=[p2];
    zombies=[window.__V.mkZ(2,190,180,0)];
    updatePlant(p2,1/60);
    seq.push({when:'第二次樱桃爆炸', intensity:screenShake.intensity, loseShakeUsed:loseShakeUsed});
    // 地雷对照（请求 6）
    screenShake.t=0;
    const p3=window.__V.setPlant('mine',1,2); plants=[p3]; p3.armT=0;
    zombies=[window.__V.mkZ(2,190,180,0)];
    updatePlant(p3,1/60);
    seq.push({when:'地雷引爆(请求6)', intensity:screenShake.intensity, loseShakeUsed:loseShakeUsed});
    // 航椒对照（请求 7 → clamp 6）
    screenShake.t=0;
    const p4=window.__V.setPlant('pepper',1,2); plants=[p4];
    zombies=[window.__V.mkZ(2,190,180,0)];
    updatePlant(p4,1/60);
    seq.push({when:'航椒引爆(请求7)', intensity:screenShake.intensity, loseShakeUsed:loseShakeUsed});
    window.__V.clearWorld();
    return seq;
  })()`);
  console.log('[shake] '+JSON.stringify(shake));
  {
    const first = shake[0].intensity, second = shake[1].intensity;
    const pass = first === second;                 // 期望：同种植物每次爆炸强度一致
    const notes = [
      shake.map(s=>'  '+s.when+' → intensity='+s.intensity+'（loseShakeUsed='+s.loseShakeUsed+'）').join('\n   '),
      '源码：triggerShake 的 `if(intensity===8 && !loseShakeUsed){loseShakeUsed=true} else {intensity=Math.min(intensity,6)}`',
      'GDD §3.5 写「强震屏(8,400)」；源码 §G 约束单次 ≤6px，8 为「失败进屋特写」保留的一次性闸门',
      '实测：首次樱桃='+first+' · 第二次樱桃='+second+' ⇒ '+(pass?'一致':'★ 不一致：首次爆炸吃掉名额后永久退化为 6px'),
    ];
    push('VIS-SHAKE-01','樱桃爆炸震屏强度一致性（8px 名额是否被自身吃掉）', pass, notes, pass?null:'Minor');
  }

  // ==========================================================================
  // 汇总
  // ==========================================================================
  const allPass = RESULTS.every(r=>r.pass);
  console.log('\n============ v2.2 刀1 真机视觉/行为验收汇总 ============');
  for(const r of RESULTS) console.log('  ['+(r.pass?'PASS':'FAIL')+'] '+r.id+' · '+r.title+(r.severity?('  (severity='+r.severity+')'):''));
  console.log('  子项: '+RESULTS.filter(r=>r.pass).length+'/'+RESULTS.length+' 通过');
  console.log('  总判定: '+(allPass?'PASS':'FAIL'));
  fs.writeFileSync(path.join(OUT,'v22-newplant-visual-results.json'),
    JSON.stringify({generated:new Date().toISOString(), target:VER, cards:CARDSN, overall:allPass?'PASS':'FAIL', results:RESULTS, raw:{noise:noise, jump:jr, hpbar:hp, pepper:pep, cherry:che, cards:card, realLoop:realLoop}}, null, 2));
  console.log('  产物: '+path.join(OUT,'v22-newplant-visual-results.json'));

  ws.close();
  try{ e.kill() }catch(_){}
  await sleep(400);
  process.exit(allPass?0:1);
})().catch(er=>{ console.error('CRASH', er && er.stack || er.message); process.exit(2); });
