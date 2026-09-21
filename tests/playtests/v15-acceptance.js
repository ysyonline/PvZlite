// ============================================================================
// v1.5「新植物三件套」真机验收脚本  ·  V15-ACC-Q1  ·  QA 严守真
// ----------------------------------------------------------------------------
// 运行：Node 直跑（Edge headless=new + CDP + Runtime.evaluate + 像素判读）
//   node tests/playtests/v15-acceptance.js
// 只读 plants-vs-zombies.html，不修改任何源码；产物落 tests/playtests/。
// 验收四项：A 选卡布局 / B 新卡可种可打 / C 减速视觉与手感 / D 难度门槛通关发卡
// ============================================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { execFile } = require('child_process');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9351;                                   // 换空闲端口，避开样板 9337
const TMP  = path.join(process.cwd(), '.tmp-v15-acc');
const OUT  = path.join(process.cwd(), 'tests', 'playtests');
const PAGE = 'file:///D:/code/PvZlite/plants-vs-zombies.html';

function get(u){ return new Promise((res,rej)=>{ http.get(u,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d))}).on('error',rej) }); }
const sleep = ms => new Promise(r=>setTimeout(r,ms));
// 通道级颜色差（逐通道最大绝对差）
const cdist = (a,b)=>{ const A=a.split(',').map(Number),B=b.split(',').map(Number); return Math.max(Math.abs(A[0]-B[0]),Math.abs(A[1]-B[1]),Math.abs(A[2]-B[2])); };
const near  = (a,b,tol=8)=> cdist(a,b)<=tol;
const diff  = (a,b,tol=8)=> cdist(a,b)>tol;

const RESULTS = [];   // {id, title, pass, detail}

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

  // ---- 页面内通用助手（只读，不改源码；drawPause 仅临时置空，避免暂停遮罩污染像素）----
  const helper = `(function(){
    window.__v15 = window.__v15 || {};
    window.__v15._dp = drawPause;
    window.__v15.freeze = function(){ state='play'; paused=true; drawPause=function(){}; toastT=0; warn.active=false; try{muted=true}catch(_){} };
    window.__v15.restore = function(){ drawPause = window.__v15._dp; if(window.__v15._t)clearTimeout(window.__v15._t); };
    window.__v15.clearWorld = function(){ plants=[];zombies=[];projectiles=[];effects=[];pointDrops=[];spawnQueue=[];waveActive=false; };
    window.__v15.snap = function(){ const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const x=c.getContext('2d');x.drawImage(canvas,0,0);return x; };
    window.__v15.px = function(sx,sy,sz){ return Array.from(sz.getImageData(sx,sy,1,1).data).slice(0,3).join(','); };
    window.__v15.mkZ = function(row,x,hp,spd,slowT){ return {type:'normal',row:row,x:x,hp:hp,maxHp:hp,spd:spd,eating:false,eatAnim:0,walk:0,dead:false,slowT:slowT}; };
    return 'helpers ok';
  })()`;
  console.log('[helper]', await evalPage(helper));

  // ==========================================================================
  // A · 选卡界面布局（三行不重叠、与卡槽栏不重叠、10 槽不溢出）
  // ==========================================================================
  const A = await evalPage(`(function(){
    state='deck';
    ownedCards = CARDS.map(c=>c.type);              // 全部 12 张
    slots = 10;
    deck = ['sunflower','pea','nut','mine','double','melon','lilypad','planter','corn','snowpea'];
    render();
    const snap = window.__v15.snap();
    const px = (x,y)=> window.__v15.px(x,y,snap);
    const cardH=100, cardW=150;                     // 源码 drawSelectDeck: fillRect(x,y,150,100)
    const rows = Math.ceil(ownedCards.length/DECK_GRID.cols);
    const rowYs=[]; for(let r=0;r<rows;r++) rowYs.push(DECK_GRID.y0 + r*DECK_GRID.gh);
    const gridBottom = rowYs[rows-1] + cardH;
    const slotTop    = DECK_SLOTS.y0 + 2;           // 槽位描边 y+2
    const slotRightLast = DECK_SLOTS.x0 + (slots-1)*DECK_SLOTS.cw + 2 + 88;   // x+2+88
    const bgAt = y => { const tt=y/680; return [Math.round(42+(74-42)*tt),Math.round(90+(138-90)*tt),Math.round(26+(42-26)*tt)].join(','); };
    const S = (label,x,y)=>({label:label, x:x, y:y, got:px(x,y), bg:bgAt(y)});
    return {
      rows:rows, rowYs:rowYs, gridBottom:gridBottom, slotTop:slotTop,
      slotRightLast:slotRightLast,
      gap_row12: rowYs[1]-(rowYs[0]+cardH),
      gap_row23: rows>2 ? rowYs[2]-(rowYs[1]+cardH) : null,
      gap_grid_slot: slotTop-gridBottom,
      canvasW: canvas.width, canvasH: canvas.height,
      samples: [
        S('row1_card', 145, 200),
        S('gap_row12', 145, 252),
        S('row2_card', 145, 305),
        S('gap_row23', 145, 356),
        S('row3_card', 145, 410),
        S('gap_grid_slot', 145, 465),
        S('slot_border_L', 72, 530),
        S('slot_border_T', 110, 472),
        S('right_margin', 995, 490)
      ]
    };
  })()`);
  await sleep(200);
  await shot('v15-deck-layout.png');

  {
    const g = A.samples;
    let pass = true; const notes = [];
    const gapRow12 = near(g[1].got, g[1].bg, 8);
    const gapRow23 = near(g[3].got, g[3].bg, 8);
    const gapGridSlot = near(g[5].got, g[5].bg, 8);
    const row1card = diff(g[0].got, g[0].bg, 8);
    const row2card = diff(g[2].got, g[2].bg, 8);
    const row3card = diff(g[4].got, g[4].bg, 8);
    const slotDrawn = diff(g[6].got, g[6].bg, 8) || diff(g[7].got, g[7].bg, 8);   // 槽位金色描边(必画)
    const rightClear = near(g[8].got, g[8].bg, 8);
    pass = A.rows===3 && A.gap_row12>0 && A.gap_row23>0 && A.gap_grid_slot>0 &&
           A.slotRightLast<=A.canvasW && gapRow12 && gapRow23 && gapGridSlot &&
           row1card && row2card && row3card && slotDrawn && rightClear;
    notes.push('rows='+A.rows+' rowYs=['+A.rowYs.join(',')+']');
    notes.push('行间隙12='+A.gap_row12+'px 行间隙23='+A.gap_row23+'px 网格→卡槽间隙='+A.gap_grid_slot+'px');
    notes.push('10槽右缘='+A.slotRightLast+' ≤ 画布宽'+A.canvasW+' → '+(A.slotRightLast<=A.canvasW?'不溢出':'溢出'));
    notes.push('行间隙像素 '+g[1].got+' vs 背景 '+g[1].bg+' → '+(gapRow12?'背景(不重叠)':'异常'));
    notes.push('行间隙像素 '+g[3].got+' vs 背景 '+g[3].bg+' → '+(gapRow23?'背景(不重叠)':'异常'));
    notes.push('网格→卡槽间隙像素 '+g[5].got+' vs 背景 '+g[5].bg+' → '+(gapGridSlot?'背景(不重叠)':'异常'));
    notes.push('行1/2/3 卡面像素 '+g[0].got+' / '+g[2].got+' / '+g[4].got+' → 均≠背景 '+(row1card&&row2card&&row3card?'OK':'异常'));
    notes.push('右缘留白(995,490)='+g[8].got+' vs 背景 '+g[8].bg+' → '+(rightClear?'干净(未溢出)':'异常'));
    notes.push('槽位描边像素 左(72,530)='+g[6].got+' 上(110,472)='+g[7].got+' → 槽位栏已绘制 '+(slotDrawn?'OK':'异常'));
    notes.push('断言明细: rows3='+(A.rows===3)+' g12>0='+(A.gap_row12>0)+' g23>0='+(A.gap_row23>0)+' gGS>0='+(A.gap_grid_slot>0)
      +' right<=W='+(A.slotRightLast<=A.canvasW)+' gap12bg='+gapRow12+' gap23bg='+gapRow23+' gapGSbg='+gapGridSlot
      +' card1='+row1card+' card2='+row2card+' card3='+row3card+' slotDrawn='+slotDrawn+' rightClear='+rightClear);
    RESULTS.push({id:'A', title:'选卡界面布局不重叠、不溢出', pass:pass, detail:notes.join(' | ')});
    console.log('\n[A] '+(pass?'PASS':'FAIL'));
    notes.forEach(n=>console.log('   · '+n));
  }

  // ==========================================================================
  // B · 三张新卡：可种植 / 进入射击循环 / 命中掉血 + 机制差异
  // ==========================================================================
  const B = await evalPage(`(function(){
    window.__v15.freeze();
    level=LEVELS[1]; levelNo=1; DIFF='normal';
    const out={};
    const cards=['corn','snowpea','icemelon'];
    for(const ctype of cards){
      window.__v15.clearWorld();
      for(const c of CARDS) cardCD[c.type]=0;
      const cc = CARDS.find(k=>k.type===ctype);
      const g={x:2,y:2};
      const v = canPlant(cc, g);
      const pl = spawnPlant(ctype, 2, 2, 0); pl.plantT=620; pl.plantDone=true; pl.cd=0;
      plants=[pl];
      const zx=600;
      zombies=[window.__v15.mkZ(2, zx, 1000, 0)];
      const hp0=zombies[0].hp;
      let maxProj=0, fired=false, types={};
      let cdAfter=null;
      for(let i=0;i<200;i++){
        updatePlant(plants[0], 1/60);
        if(!fired && projectiles.length>0){ cdAfter=plants[0].cd; }
        updateProjectiles(1/60);
        if(projectiles.length>0) fired=true;
        maxProj=Math.max(maxProj, projectiles.length);
        for(const pr of projectiles) types[pr.type]=true;
        if(zombies[0].hp<hp0) break;
      }
      out[ctype]={
        canPlantOk:v.ok, canPlantMsg:v.msg||null,
        fired:fired, maxProj:maxProj, projTypes:Object.keys(types),
        hpLost:(hp0-zombies[0].hp), cdEngaged:(cdAfter!==null && cdAfter>0), cdAfter:cdAfter,
        cost:cc.cost, cardCd:cc.cd, dur:cc.dur
      };
    }
    return out;
  })()`);
  console.log('\n[B-基础] 种植/射击/掉血');
  {
    const exp={corn:30, snowpea:20, icemelon:65};
    let pass=true; const notes=[];
    for(const k of ['corn','snowpea','icemelon']){
      const r=B[k];
      const ok = r.canPlantOk && r.fired && r.maxProj>=1 && Math.abs(r.hpLost-exp[k])<0.01 && r.cdEngaged;
      if(!ok) pass=false;
      notes.push(k+': 可种='+r.canPlantOk+' 发射='+r.fired+'(maxProj='+r.maxProj+',弹种='+r.projTypes.join('/')+') 单发掉血='+r.hpLost+'(期望'+exp[k]+') cd进入循环='+r.cdEngaged);
    }
    RESULTS.push({id:'B1', title:'三新卡可种·进入射击循环·命中掉血', pass:pass, detail:notes.join(' | ')});
    console.log('   '+(pass?'PASS':'FAIL'));
    notes.forEach(n=>console.log('   · '+n));
  }

  // ---- B2 机制差异：受控单发弹体（精确验溅射系数与减速覆盖）----
  const B2 = await evalPage(`(function(){
    window.__v15.freeze();
    level=LEVELS[1];
    const zy = GRID_Y + 2*CELL_H + CELL_H/2;
    function ctrl(type,dmg,splash,ratio,chill,zBx){
      window.__v15.clearWorld();
      const zA = window.__v15.mkZ(2, 440, 1000, 0);
      zombies=[zA];
      let zB=null;
      if(zBx!=null){ zB=window.__v15.mkZ(2, zBx, 1000, 0); zombies.push(zB); }
      // 弹体停在 zA 左缘 41px 处（<42 即命中），dt 极小使位移可忽略
      projectiles=[{x:399,y:zy,flatY:zy,yOff:0,vx:0,dmg:dmg,row:2,type:type,splash:splash,splashRatio:ratio,chill:chill,dead:false}];
      updateProjectiles(0.0001);
      return {
        zA_lost: 1000-zA.hp, zA_slowT: zA.slowT||0,
        zB_lost: zB?1000-zB.hp:null, zB_slowT: zB?zB.slowT||0:null,
        projLeft: projectiles.length
      };
    }
    return {
      corn:     ctrl('corn',    30, 30, 0.40, false, 425),   // 邻体 zA-15 → 溅射 30px 必中
      icemelon: ctrl('icemelon',65, 55, 0.55, true,  452),   // 邻体 zA+12 → 溅射 55px 必中
      snowpea:  ctrl('snowpea', 20, 0,  0,    true,  null)
    };
  })()`);
  console.log('\n[B-机制] 溅射/减速系数');
  {
    let pass=true; const notes=[];
    // corn: 直中 30，溅射 30*0.40=12，无减速
    const c=B2.corn;
    const cornOk = Math.abs(c.zA_lost-30)<0.01 && Math.abs(c.zB_lost-12)<0.01 && c.zA_slowT===0 && c.zB_slowT===0;
    if(!cornOk) pass=false;
    notes.push('corn 直中='+c.zA_lost+'(期望30) 溅射邻体='+c.zB_lost+'(期望12=30×0.40) 减速='+c.zA_slowT+'/'+c.zB_slowT+'(期望0/0) → '+(cornOk?'OK':'异常'));
    // icemelon: 直中 65，溅射 65*0.55=35.75，全命中减速 2.0
    const im=B2.icemelon;
    const imOk = Math.abs(im.zA_lost-65)<0.01 && Math.abs(im.zB_lost-35.75)<0.01 && im.zA_slowT===2.0 && im.zB_slowT===2.0;
    if(!imOk) pass=false;
    notes.push('icemelon 直中='+im.zA_lost+'(期望65) 溅射邻体='+im.zB_lost+'(期望35.75=65×0.55) 全命中减速='+im.zA_slowT+'/'+im.zB_slowT+'(期望2.0/2.0) → '+(imOk?'OK':'异常'));
    // snowpea: 直中 20，无溅射，减速 2.0
    const sp=B2.snowpea;
    const spOk = Math.abs(sp.zA_lost-20)<0.01 && sp.zB_lost===null && sp.zA_slowT===2.0;
    if(!spOk) pass=false;
    notes.push('snowpea 直中='+sp.zA_lost+'(期望20) 无溅射(zB=null) 减速='+sp.zA_slowT+'(期望2.0) → '+(spOk?'OK':'异常'));
    RESULTS.push({id:'B2', title:'溅射系数与减速覆盖（受控弹体）', pass:pass, detail:notes.join(' | ')});
    console.log('   '+(pass?'PASS':'FAIL'));
    notes.forEach(n=>console.log('   · '+n));
  }

  // ==========================================================================
  // C · 减速视觉与手感
  // ==========================================================================
  // C1 视觉：冰蓝 tint 像素对比（用真实 snowpea 命中触发 applyChill）
  await evalPage(`(function(){
    window.__v15.freeze();
    level=LEVELS[1]; DIFF='normal';
    window.__v15.clearWorld();
    zombies=[window.__v15.mkZ(2, 600, 1000, 0)];
    render();
    return true;
  })()`);
  await sleep(250);
  await shot('v15-chill-before.png');
  const C1 = await evalPage(`(function(){
    const snapB = window.__v15.snap();
    const px = (x,y)=> window.__v15.px(x,y,snapB);
    const before = px(600,360);                       // 僵尸躯干内点（身体 rect -16..16 / -4..38）
    // 真实 snowpea 弹体命中 → applyChill
    const zy = GRID_Y + 2*CELL_H + CELL_H/2;
    projectiles=[{x:565,y:zy,flatY:zy,yOff:0,vx:0,dmg:20,row:2,type:'snowpea',splash:0,chill:true,dead:false}];
    updateProjectiles(0.0001);                        // |600-565|=35<42 → 命中 + applyChill
    const slowT = zombies[0].slowT||0;
    render();
    const snapA = window.__v15.snap();
    const after = window.__v15.px(600,360,snapA);
    return { before:before, after:after, slowT:slowT };
  })()`);
  await sleep(250);
  await shot('v15-chill-after.png');
  console.log('\n[C1] 减速视觉（冰蓝 tint）');
  {
    const changed = diff(C1.before, C1.after, 10);
    const pass = C1.slowT>0 && changed;
    const notes=[];
    notes.push('命中前躯干像素 rgb('+C1.before+') → 命中后 rgb('+C1.after+')  颜色改变='+changed);
    notes.push('命中后 slowT='+C1.slowT.toFixed(3)+'s（>0 表明处减速态）');
    notes.push('证据图: v15-chill-before.png / v15-chill-after.png');
    RESULTS.push({id:'C1', title:'减速视觉·冰蓝 tint 像素前后对比', pass:pass, detail:notes.join(' | ')});
    console.log('   '+(pass?'PASS':'FAIL'));
    notes.forEach(n=>console.log('   · '+n));
  }

  // C2 移动变慢 ×0.6
  const C2 = await evalPage(`(function(){
    window.__v15.freeze();
    level=LEVELS[1];
    function disp(chilled){
      window.__v15.clearWorld();
      zombies=[window.__v15.mkZ(0, 800, 180, 60, chilled?2.0:undefined)];
      const x0=zombies[0].x;
      for(let i=0;i<60;i++) updateZombies(1/60);      // 1.0s（slowT 由 2.0→1.0，全程 >0）
      return x0 - zombies[0].x;
    }
    const dN=disp(false), dC=disp(true);
    return {dN:dN, dC:dC, ratio:dC/dN};
  })()`);
  console.log('\n[C2] 移动变慢');
  {
    const pass = Math.abs(C2.ratio-0.6)<0.02 && Math.abs(C2.dN-60)<0.5;
    const notes=[];
    notes.push('原速 spd=60 推进 1.0s 位移='+C2.dN.toFixed(2)+'px（期望60）');
    notes.push('减速中推进 1.0s 位移='+C2.dC.toFixed(2)+'px（期望36）');
    notes.push('实测比值='+C2.ratio.toFixed(4)+'（期望0.6）');
    RESULTS.push({id:'C2', title:'移动速度 ×0.6', pass:pass, detail:notes.join(' | ')});
    console.log('   '+(pass?'PASS':'FAIL'));
    notes.forEach(n=>console.log('   · '+n));
  }

  // C3 啃食变慢 ×0.6（65→39/s）+ slowT 区间式断言
  const C3 = await evalPage(`(function(){
    window.__v15.freeze();
    level=LEVELS[1];
    function eatRate(chilled){
      window.__v15.clearWorld();
      const p=spawnPlant('nut',2,2,0); p.plantT=620; p.plantDone=true; p.dur=1000; p.maxDur=1000;
      plants=[p];
      const pos=gridToPos(2,2);
      zombies=[window.__v15.mkZ(2, pos.x+20, 1000, 0, chilled?2.0:undefined)];   // x-pos=20 ∈(0,36) → 啃食
      const d0=p.dur;
      for(let i=0;i<60;i++) updateZombies(1/60);        // 1.0s
      return { rate:d0-plants[0].dur, eating:zombies[0].eating };
    }
    const rN=eatRate(false), rC=eatRate(true);
    // 铁律区间断言：applyChill 后同 tick 内 slowT 已被 dt 递减 → 必须区间式
    window.__v15.clearWorld();
    const z=window.__v15.mkZ(0, 800, 180, 0);
    zombies=[z];
    applyChill(z);
    const t0=z.slowT;                                   // 应为 2.0（纯入口写入）
    updateZombies(1/60);
    const t1=z.slowT;                                   // 应为 2.0 - 1/60 ≈ 1.9833
    return { rateNormal:rN.rate, rateChill:rC.rate, ratio:rC.rate/rN.rate,
             slowT_entry:t0, slowT_afterTick:t1,
             eatNormal:rN.eating, eatChill:rC.eating };
  })()`);
  console.log('\n[C3] 啃食变慢 + slowT 区间断言');
  {
    const rateOk = Math.abs(C3.rateNormal-65)<1 && Math.abs(C3.rateChill-39)<1;
    const ratioOk = Math.abs(C3.ratio-0.6)<0.03;
    const rangeOk = C3.slowT_afterTick>1.9 && C3.slowT_afterTick<=2.0;
    const pass = rateOk && ratioOk && rangeOk && C3.eatNormal && C3.eatChill;
    const notes=[];
    notes.push('未减速 dur 衰减='+C3.rateNormal.toFixed(2)+'/s（期望65）');
    notes.push('减速中 dur 衰减='+C3.rateChill.toFixed(2)+'/s（期望39=65×0.6）');
    notes.push('衰减比值='+C3.ratio.toFixed(4)+'（期望0.6）');
    notes.push('slowT 入口值='+C3.slowT_entry.toFixed(4)+'（=2.0）');
    notes.push('经 1 tick 后 slowT='+C3.slowT_afterTick.toFixed(4)+' → 区间断言(1.9,2.0] '+(rangeOk?'通过':'失败（等值断言会误挂）'));
    RESULTS.push({id:'C3', title:'啃食速度 ×0.6 + slowT 区间式断言', pass:pass, detail:notes.join(' | ')});
    console.log('   '+(pass?'PASS':'FAIL'));
    notes.forEach(n=>console.log('   · '+n));
  }

  // C4 不叠加只刷新
  const C4 = await evalPage(`(function(){
    window.__v15.freeze();
    level=LEVELS[1];
    const z=window.__v15.mkZ(0, 800, 180, 0);
    zombies=[z];
    applyChill(z);            const a=z.slowT;   // 2.0
    z.slowT=1.2; applyChill(z); const b=z.slowT; // 刷新回 2.0（非 1.2+2.0）
    applyChill(z); applyChill(z); const c=z.slowT; // 仍 2.0（非 4.0/6.0）
    // 连续命中 + tick 衰减，跟踪最大值，确保永不 >2.0
    window.__v15.clearWorld(); zombies=[z]; z.slowT=0;
    let maxS=0;
    for(let h=0;h<3;h++){ applyChill(z); maxS=Math.max(maxS,z.slowT); for(let i=0;i<10;i++) updateZombies(1/60); }
    return { a:a, b:b, c:c, maxS:maxS };
  })()`);
  console.log('\n[C4] 不叠加只刷新');
  {
    const pass = C4.a===2.0 && C4.b===2.0 && C4.c===2.0 && C4.maxS<=2.0+1e-9;
    const notes=[];
    notes.push('初施减速 slowT='+C4.a+'（期望2.0）');
    notes.push('slowT=1.2 再施加减速 → slowT='+C4.b+'（期望刷新回2.0，非累加3.2）');
    notes.push('连施两次 → slowT='+C4.c+'（期望仍2.0，非4.0）');
    notes.push('连续命中×3 全程 slowT 峰值='+C4.maxS+'（期望≤2.0）');
    RESULTS.push({id:'C4', title:'减速不叠加只刷新（续时）', pass:pass, detail:notes.join(' | ')});
    console.log('   '+(pass?'PASS':'FAIL'));
    notes.forEach(n=>console.log('   · '+n));
  }

  // ==========================================================================
  // D · 难度门槛通关发卡（DIFF_AWARD + pvz_diff_clears 幂等）
  // ==========================================================================
  const D = await evalPage(`(function(){
    function runClear(diff, lv, own, dc){
      window.__v15.freeze();
      DIFF=diff; levelNo=lv; level=LEVELS[lv];
      ownedCards = own.slice();
      diffClears = Object.assign({}, dc);
      pointDrops=[]; runPoints=0; clears=0; deck=[]; slots=SLOT_CONFIG.initialSlots;
      wave=level.totalWaves; waveActive=false; spawnQueue=[]; zombies=[]; plants=[]; projectiles=[];
      warn={active:false,t:0,last:0,pending:false}; spawnGateZ=null; spawnGateT=-1e9; waveDrainedT=0;
      gt=0; lastWaveT=0; sunFallT=5;
      state='play'; paused=false;
      checkWave(0.016);                     // 触发通关块
      const lsRaw = storageGet('pvz_diff_clears');
      let ls={}; try{ ls=lsRaw?JSON.parse(lsRaw):{} }catch(_){ ls={} }
      return {
        owned: ownedCards.slice(), dc: Object.assign({}, diffClears),
        lsKeys: Object.keys(ls), lsRaw: lsRaw
      };
    }
    const cnt=(arr,t)=>arr.filter(x=>x===t).length;
    // ① 未拥有 → 通关发卡 + 记录
    const d1 = runClear('hard', 3, [], {});                                     // corn
    const d2 = runClear('hard', 4, [], {});                                     // snowpea
    const d3 = runClear('expert', 5, [], {});                                   // icemelon
    // ② 已拥有 → 不重复发，但记录仍登记（幂等）
    const d4 = runClear('hard', 3, ['corn'], {});                               // 已拥有，无记录
    const d5 = runClear('hard', 3, ['corn'], {'hard:3':true});                 // 已拥有，已有记录
    return {
      d1:{ hasCorn:d1.owned.includes('corn'), cornCount:cnt(d1.owned,'corn'), rec:d1.dc['hard:3']===true, ls:d1.lsKeys.includes('hard:3') },
      d2:{ hasSnow:d2.owned.includes('snowpea'), snowCount:cnt(d2.owned,'snowpea'), rec:d2.dc['hard:4']===true, ls:d2.lsKeys.includes('hard:4') },
      d3:{ hasIce:d3.owned.includes('icemelon'), iceCount:cnt(d3.owned,'icemelon'), rec:d3.dc['expert:5']===true, ls:d3.lsKeys.includes('expert:5') },
      d4:{ cornCount:cnt(d4.owned,'corn'), rec:d4.dc['hard:3']===true, ls:d4.lsKeys.includes('hard:3') },
      d5:{ cornCount:cnt(d5.owned,'corn'), rec:d5.dc['hard:3']===true, ls:d5.lsKeys.includes('hard:3') }
    };
  })()`);
  console.log('\n[D] 难度门槛通关发卡');
  {
    let pass=true; const notes=[];
    // ① 未拥有 → 发卡 + 记录
    const c1 = D.d1.hasCorn && D.d1.cornCount===1 && D.d1.rec && D.d1.ls;
    if(!c1)pass=false;
    notes.push('hard:3 → corn: 拥有='+D.d1.hasCorn+' 张数='+D.d1.cornCount+' diffClears记录='+D.d1.rec+' localStorage键='+D.d1.ls+' → '+(c1?'OK':'异常'));
    const c2 = D.d2.hasSnow && D.d2.snowCount===1 && D.d2.rec && D.d2.ls;
    if(!c2)pass=false;
    notes.push('hard:4 → snowpea: 拥有='+D.d2.hasSnow+' 张数='+D.d2.snowCount+' 记录='+D.d2.rec+' localStorage键='+D.d2.ls+' → '+(c2?'OK':'异常'));
    const c3 = D.d3.hasIce && D.d3.iceCount===1 && D.d3.rec && D.d3.ls;
    if(!c3)pass=false;
    notes.push('expert:5 → icemelon: 拥有='+D.d3.hasIce+' 张数='+D.d3.iceCount+' 记录='+D.d3.rec+' localStorage键='+D.d3.ls+' → '+(c3?'OK':'异常'));
    // ② 幂等
    const c4 = D.d4.cornCount===1 && D.d4.rec && D.d4.ls;
    if(!c4)pass=false;
    notes.push('已拥有corn再通关(hard:3, 无记录): 张数='+D.d4.cornCount+'(不重复发) 记录补登记='+D.d4.rec+' 键='+D.d4.ls+' → '+(c4?'OK':'异常'));
    const c5 = D.d5.cornCount===1 && D.d5.rec && D.d5.ls;
    if(!c5)pass=false;
    notes.push('已拥有corn+已有记录再通关: 张数='+D.d5.cornCount+' 记录保持='+D.d5.rec+' 键='+D.d5.ls+' → '+(c5?'OK':'异常'));
    RESULTS.push({id:'D', title:'难度门槛通关发卡（含幂等）', pass:pass, detail:notes.join(' | ')});
    console.log('   '+(pass?'PASS':'FAIL'));
    notes.forEach(n=>console.log('   · '+n));
  }

  // ==========================================================================
  // 汇总
  // ==========================================================================
  await evalPage('window.__v15.restore(); true');
  const allPass = RESULTS.every(r=>r.pass);
  console.log('\n================ v1.5 验收汇总 ================');
  for(const r of RESULTS) console.log('  ['+(r.pass?'PASS':'FAIL')+'] '+r.id+' · '+r.title);
  console.log('  总判定: '+(allPass?'PASS':'FAIL'));
  fs.writeFileSync(path.join(OUT,'v15-acceptance-results.json'),
    JSON.stringify({generated:new Date().toISOString(), overall:allPass?'PASS':'FAIL', results:RESULTS}, null, 2));

  ws.close();
  try{ e.kill() }catch(_){}
  await sleep(400);                              // 等 Edge 释放 .tmp 文件锁，避免 EBUSY
  try{ fs.rmSync(TMP,{recursive:true,force:true}) }catch(_){}
  process.exit(allPass?0:1);
})().catch(er=>{ console.error('FAIL', er && er.stack || er.message); process.exit(1); });
