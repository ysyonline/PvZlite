/* _v238-gravebuster-chew · 咬碑藤往下啃食墓碑动画真机视觉验收（2026-09-30）
 * 覆盖：咬碑藤绿色主体随咀嚼进度 _prog（chewT/GRAVEBUSTER_CHEW）从碑顶下移到碑底，
 *       位移量 ≈ GRAVEBUSTER_GEOM.down（34px）。验证三档 chewT（0 / 2.0 / 4.0）主体 y 单调下移。
 * 运行：node tests/playtests/_v238-gravebuster-chew.js
 * 产物：tests/playtests/_v238-gb-chew-*.png + _v238-gb-chew-results.json
 */
const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9342;
const SUF = '';
const TMP = path.join(process.cwd(), 'tests', 'playtests', '.edge-tmp-238');
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
    window.__V.mkGB = function(col,row,chewT){
      return {col:col,row:row,type:'gravebuster',cd:0,sunT:0,growT:0,chewT:chewT,
        armT:0,arming:false,dur:300,maxDur:300,
        plantT:620,plantDone:true,dirtDone:true,plantFrom:{x:0,y:0}};
    };
    window.__V.geo = function(){ return {GRID_X:GRID_X,CELL_W:CELL_W,GRID_Y:GRID_Y,CELL_H:CELL_H,down:GRAVEBUSTER_GEOM.down,chew:GRAVEBUSTER_CHEW}; };
    window.__V.renderNow = function(){ render(); return true; };
    // 检测指定 y 行上绿色主体像素数（#7cc04a 渐变主色，容差放宽）
    window.__V.greenAtRow = function(x,y,w,h){ const d=ctx.getImageData(Math.round(x),Math.round(y),w,h).data; let n=0;
      for(let i=0;i<d.length;i+=4){ const rr=d[i],gg=d[i+1],bb=d[i+2];
        if(gg>110 && gg>rr+30 && gg>bb+40) n++; } return n; };
    return 'helpers ok';
  })()`;
  await evalPage(helper);
  await evalPage('window.__V.freeze(); window.__V.clearWorld(); true');

  const G = await evalPage('window.__V.geo()');
  const col = 3, row = 2;
  const cx = G.GRID_X + col*G.CELL_W + G.CELL_W/2;
  const cy = G.GRID_Y + row*G.CELL_H + G.CELL_H/2;
  const W = 50;                       // 检测窗宽（咬碑藤主体直径 ~36px）
  const BX = cx - W/2;

  // 咬碑藤主体中心 y = cy - 8 + _prog*down（_nod 忽略，取整档）
  // 三档 chewT：0（碑顶）、2.0（半程）、4.0（碑底）
  const CHEW = G.chew;
  const DOWN = G.down;
  const y0 = cy - 8;                  // chewT=0 主体中心 y
  const yMid = cy - 8 + 0.5*DOWN;     // chewT=2.0（半程）
  const yEnd = cy - 8 + DOWN;         // chewT=4.0（碑底）

  // 检测函数：在给定中心 y 上下 ±6px 带内统计绿色像素
  const greenAt = async (centerY) => {
    const band = 12;
    const yTop = centerY - band/2, yBot = centerY + band/2;
    return await evalPage(`window.__V.greenAtRow(${BX},${yTop},${W},${band})`);
  };

  // ---- T1 chewT=0：主体在碑顶（y0 带绿色多，yEnd 带绿色少）----
  console.log('T1 chewT=0（碑顶）');
  {
    await evalPage('window.__V.clearWorld(); true');
    await evalPage(`plants=[window.__V.mkGB(${col},${row},0)]; zombies=[]; screenShake.t=0;flashT=0; render(); true`);
    const gTop = await greenAt(y0);
    const gBot = await greenAt(yEnd);
    await shot('_v238-gb-chew-0'+SUF+'.png');
    const pass = gTop > 20 && gBot < gTop*0.6;
    push('T1','chewT=0 主体在碑顶（顶部绿多、底部绿少）', pass, [
      '顶部(y='+Math.round(y0)+') 绿='+gTop, '底部(y='+Math.round(yEnd)+') 绿='+gBot
    ]);
  }

  // ---- T2 chewT=2.0：主体在半程（yMid 带绿色多）----
  console.log('T2 chewT=2.0（半程）');
  {
    await evalPage('window.__V.clearWorld(); true');
    await evalPage(`plants=[window.__V.mkGB(${col},${row},2.0)]; zombies=[]; screenShake.t=0;flashT=0; render(); true`);
    const gMid = await greenAt(yMid);
    const gTop = await greenAt(y0);
    const gBot = await greenAt(yEnd);
    await shot('_v238-gb-chew-2'+SUF+'.png');
    // 半程：主体应明显离开碑顶（y0 绿少），且 yMid 带绿多
    const pass = gMid > 20 && gTop < gMid*0.6;
    push('T2','chewT=2.0 主体下移到半程（顶部绿少、半程绿多）', pass, [
      '顶部绿='+gTop, '半程(y='+Math.round(yMid)+') 绿='+gMid, '底部绿='+gBot
    ]);
  }

  // ---- T3 chewT=4.0：主体在碑底（yEnd 带绿色多，y0 带绿色少）----
  console.log('T3 chewT=4.0（碑底）');
  {
    await evalPage('window.__V.clearWorld(); true');
    await evalPage(`plants=[window.__V.mkGB(${col},${row},4.0)]; zombies=[]; screenShake.t=0;flashT=0; render(); true`);
    const gBot = await greenAt(yEnd);
    const gTop = await greenAt(y0);
    const gMid = await greenAt(yMid);
    await shot('_v238-gb-chew-4'+SUF+'.png');
    const pass = gBot > 20 && gTop < gBot*0.6;
    push('T3','chewT=4.0 主体下移到碑底（顶部绿少、底部绿多）', pass, [
      '顶部绿='+gTop, '半程绿='+gMid, '底部(y='+Math.round(yEnd)+') 绿='+gBot
    ]);
  }

  // ---- T4 单调下移：三档主体中心 y 应严格递增（顶部绿递减）----
  console.log('T4 单调下移');
  {
    const gTop0 = await greenAt(y0);
    const gTop2 = await greenAt(y0);   // 复用 T2 顶部绿（同 y0 带）
    // 用三档顶部绿递减验证：chewT 越大，顶部带绿色越少（主体离开碑顶）
    // 重新采样三档顶部绿
    await evalPage('window.__V.clearWorld(); true');
    await evalPage(`plants=[window.__V.mkGB(${col},${row},0)]; zombies=[]; render(); true`);
    const t0 = await greenAt(y0);
    await evalPage('window.__V.clearWorld(); true');
    await evalPage(`plants=[window.__V.mkGB(${col},${row},2.0)]; zombies=[]; render(); true`);
    const t2 = await greenAt(y0);
    await evalPage('window.__V.clearWorld(); true');
    await evalPage(`plants=[window.__V.mkGB(${col},${row},4.0)]; zombies=[]; render(); true`);
    const t4 = await greenAt(y0);
    const pass = t0 > t2 && t2 > t4;
    push('T4','三档顶部绿严格递减（主体随进度持续下移）', pass, [
      'chew0 顶绿='+t0, 'chew2 顶绿='+t2, 'chew4 顶绿='+t4
    ]);
  }

  // 汇总
  const passed = RESULTS.filter(r=>r.pass).length;
  fs.writeFileSync(path.join(OUT,'_v238-gb-chew-results'+SUF+'.json'), JSON.stringify({passed,total:RESULTS.length,results:RESULTS},null,2));
  console.log('\n════════ 咬碑藤啃食动画视觉验收：'+passed+'/'+RESULTS.length+' PASS ════════');
  ws.close(); e.kill();
  process.exit(passed===RESULTS.length?0:1);
})().catch(e=>{ console.error('FATAL',e); process.exit(2); });
