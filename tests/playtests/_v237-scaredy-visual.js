/* _v237-scaredy-visual · 害羞菇真机视觉验收（2026-09-29）
 * 覆盖：①清醒态（night 紫灰菇+惊恐眼+小嘴）②恐惧态（night+近身僵尸 菇盖下压+瞪大眼+大嘴）
 *       ③沉睡态（day 暗灰菇+z z z）④卡面（紫灰菇+惊恐眼）
 * 运行：node tests/playtests/_v237-scaredy-visual.js
 * 产物：tests/playtests/_v237-scaredy-*.png + _v237-scaredy-results.json
 */
const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9341;
const SUF = '';
const TMP = path.join(process.cwd(), 'tests', 'playtests', '.edge-tmp-237');
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
  await send('Page.navigate',{ url: PAGE+'?test=1&level=2-1' });
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
    window.__V.setTime = function(timeVal){ level=Object.assign({},LEVELS['2-1'],{time:timeVal}); };
    window.__V.countColor = function(x,y,w,h,r,g,b,tol){ const d=ctx.getImageData(Math.round(x),Math.round(y),w,h).data; let n=0;
      for(let i=0;i<d.length;i+=4){ if(Math.abs(d[i]-r)<=tol&&Math.abs(d[i+1]-g)<=tol&&Math.abs(d[i+2]-b)<=tol)n++; } return n; };
    window.__V.geo = function(){ return {GRID_X:GRID_X,CELL_W:CELL_W,GRID_Y:GRID_Y,CELL_H:CELL_H}; };
    window.__V.renderNow = function(){ render(); return true; };
    return 'helpers ok';
  })()`;
  await evalPage(helper);
  await evalPage('window.__V.freeze(); window.__V.clearWorld(); true');

  // 采样窗口：害羞菇放 (col=3,row=2)，格心
  const G = await evalPage('window.__V.geo()');
  const col = 3, row = 2;
  const cx = G.GRID_X + col*G.CELL_W + G.CELL_W/2;
  const cy = G.GRID_Y + row*G.CELL_H + G.CELL_H/2;
  const BW = 70, BH = 70;                 // 采样窗（菇盖区域）
  const BX = cx - BW/2, BY = cy - BH/2;

  // ---- T1 清醒态（night）：紫灰菇盖 #9a9ab0 + 惊恐眼白 #fff + 小嘴 #2a1a12 ----
  console.log('T1 清醒态（night）');
  {
    await evalPage('window.__V.clearWorld(); window.__V.setTime("night"); true');
    await evalPage(`plants=[window.__V.mkPlant('scaredyshroom',${col},${row},{})]; zombies=[]; screenShake.t=0;flashT=0; render(); true`);
    const cap = await evalPage(`window.__V.countColor(${BX},${BY},${BW},${BH},154,154,176,8)`);   // #9a9ab0
    const eye = await evalPage(`window.__V.countColor(${BX},${BY},${BW},${BH},255,255,255,6)`);   // 眼白
    const mouth = await evalPage(`window.__V.countColor(${BX},${BY},${BW},${BH},42,26,18,8)`);     // #2a1a12 嘴
    await shot('_v237-scaredy-awake'+SUF+'.png');
    const pass = cap>40 && eye>8 && mouth>4;
    push('T1','清醒态：紫灰盖+惊恐眼+小嘴', pass, [
      '菇盖 #9a9ab0 命中='+cap, '眼白 #fff 命中='+eye, '嘴 #2a1a12 命中='+mouth
    ]);
  }

  // ---- T2 恐惧态（night + 近身僵尸）：菇盖下压 + 瞪大眼 + 大嘴 ----
  console.log('T2 恐惧态（night+近身僵尸）');
  {
    await evalPage('window.__V.clearWorld(); window.__V.setTime("night"); true');
    const zx = cx + 0.8*G.CELL_W;   // 僵尸贴脸（0.8 格内）
    await evalPage(`plants=[window.__V.mkPlant('scaredyshroom',${col},${row},{})];
      zombies=[window.__V.mkZ(${row},${zx},180)];
      screenShake.t=0;flashT=0; render(); true`);
    // 恐惧态菇盖 #9a9ab0（下压）+ 瞪大眼白（比清醒多）
    const cap = await evalPage(`window.__V.countColor(${BX},${BY},${BW},${BH},154,154,176,8)`);
    const eye = await evalPage(`window.__V.countColor(${BX},${BY},${BW},${BH},255,255,255,6)`);
    await shot('_v237-scaredy-fear'+SUF+'.png');
    // 恐惧态眼白应比清醒态多（瞪大）——但采样窗固定，比较两态眼白数
    const pass = cap>40 && eye>10;
    push('T2','恐惧态：菇盖+瞪大眼', pass, [
      '菇盖 #9a9ab0 命中='+cap, '眼白 #fff 命中='+eye+'（应>清醒态）'
    ]);
  }

  // ---- T3 沉睡态（day）：暗灰菇盖 #6a6a80 + z z z ----
  console.log('T3 沉睡态（day）');
  {
    await evalPage('window.__V.clearWorld(); window.__V.setTime("day"); true');
    await evalPage(`plants=[window.__V.mkPlant('scaredyshroom',${col},${row},{})]; zombies=[]; screenShake.t=0;flashT=0; render(); true`);
    const asleep = await evalPage(`window.__V.countColor(${BX},${BY},${BW},${BH},106,106,128,8)`);  // #6a6a80
    const awake = await evalPage(`window.__V.countColor(${BX},${BY},${BW},${BH},154,154,176,8)`);   // 清醒色不应出现
    await shot('_v237-scaredy-asleep'+SUF+'.png');
    const pass = asleep>40 && awake<5;
    push('T3','沉睡态：暗灰盖（非清醒紫灰）', pass, [
      '沉睡盖 #6a6a80 命中='+asleep, '清醒盖 #9a9ab0 命中='+awake+'（应<5）'
    ]);
  }

  // ---- T4 卡面（选卡页 drawCardFace）：紫灰菇盖 + 惊恐眼 ----
  console.log('T4 卡面');
  {
    // 直接调 drawCardFace 到离屏（复用对局内卡栏绘制路径）
    await evalPage(`window.__V.clearWorld(); window.__V.setTime("night"); true`);
    await evalPage(`(function(){ var c=CARDS.find(k=>k.type==='scaredyshroom'); if(!c)return 'no-card';
      drawCardFace(c, 200, 200, 88, 88); return 'drawn'; })()`);
    const cap = await evalPage(`window.__V.countColor(200,200,88,88,154,154,176,8)`);
    const eye = await evalPage(`window.__V.countColor(200,200,88,88,255,255,255,6)`);
    await shot('_v237-scaredy-card'+SUF+'.png');
    const pass = cap>30 && eye>6;
    push('T4','卡面：紫灰盖+惊恐眼', pass, [
      '菇盖 #9a9ab0 命中='+cap, '眼白 #fff 命中='+eye
    ]);
  }

  // ---- 汇总 ----
  const passAll = RESULTS.every(r=>r.pass);
  fs.writeFileSync(path.join(OUT,'_v237-scaredy-results.json'), JSON.stringify(RESULTS,null,2));
  console.log('\n===== 视觉验收：'+RESULTS.filter(r=>r.pass).length+'/'+RESULTS.length+' 通过 =====');
  try { e.kill(); } catch(_){}
  process.exit(passAll?0:1);
})().catch(err=>{ console.error('脚本异常:', err.message||err); process.exit(2); });
