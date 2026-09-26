// ============================================================================
// v2.2.4 奖励植物淡入 · 判别力自证
// ----------------------------------------------------------------------------
// 验证 v2.2.4 变更真实生效（用户 2026-09-26 拍板：去掉礼盒特效，奖励植物淡淡出现）：
//   D1 植物淡入：t=0.1s（alpha≈0.085 近透明）vs t=1.0s（alpha≈0.85 落定）
//      植物本体区域应有显著差分（淡入 = 透明度变化 → 与底色混合不同）
//   D2 无礼盒残留：结算屏奖励区不应出现礼盒的棕色盒体/金色绑带
//      → 检查奖励植物区域在 t=0.5 时颜色是否以植物色为主（无 #8b6528 木色大块）
// 判别力设计（先红后绿）：
//   - 旧源（v2.2.3 礼盒版）：D1 区域是盒子+粒子，不是纯淡入 → 差分特征不同；
//     D2 会出现大量 #8b6528 盒体棕色 → FAIL
//   - 新源（v2.2.4）：D1 植物本体 alpha 变化差分显著；D2 无盒体棕色 → PASS
// 抓取区域：
//   D1 植物本体区：x∈[440,560] y∈[310,400]（drawCardFace(-60,-40,120,80) 中心 500,355 → 卡面 x440..560 y315..395）
//   D2 盒体可能区：x∈[430,570] y∈[295,415]（旧礼盒盒体 140×120 区域）统计 #8b6528 色像素
// 运行：node tests/playtests/v224-gift-fade-discrim.js [html]
// ============================================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { execFile } = require('child_process');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9374;
const TMP  = path.join(process.cwd(), '.tmp-v224-fade');
const HTML = process.argv[2] || 'plants-vs-zombies.html';
const PAGE = 'file:///' + process.cwd().replace(/\\/g, '/') + '/' + HTML;

function get(u){ return new Promise((res,rej)=>{ http.get(u,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d))}).on('error',rej) }); }
const sleep = ms => new Promise(r=>setTimeout(r,ms));

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
      throw new Error('page exception: '+((r.result.exceptionDetails.exception&&r.result.exceptionDetails.exception.description)||JSON.stringify(r.result.exceptionDetails)));
    }
    return r.result.result.value;
  };

  await send('Page.enable');
  await send('Page.navigate',{ url: PAGE+'?test=1&level=1-1' });
  await sleep(1800);

  await evalPage(`(function(){
    window.__V = window.__V || {};
    window.__V._raf = window.requestAnimationFrame;
    window.requestAnimationFrame = function(){ return 0; };
    state='play'; paused=true; drawPause=function(){}; toastT=0;
    try{muted=true}catch(_){}
    screenShake.t=0;screenShake.dur=0;flashT=0;
    plants=[];zombies=[];projectiles=[];effects=[];pointDrops=[];spawnQueue=[];waveActive=false;
    window.__V.grab = function(x,y,w,h){
      const d=ctx.getImageData(x,y,w,h).data;
      return Array.from(d);
    };
    return true;
  })()`);

  const grab = async (tval, x, y, w, h) => {
    return evalPage(`(function(){
      won=true; state='end'; level={name:'1-1',totalWaves:1,world:1};
      points=350; highScore=1200; DIFF='normal'; score=120;
      giftAnim={active:true,t:${tval},card:{type:'pea',name:'豌豆射手'}};
      screenShake.t=0; flashT=0; toastT=0;
      render();
      return window.__V.grab(${x},${y},${w},${h});
    })()`);
  };
  const diffCount = (A,B) => {
    let n=0;
    for (let i=0;i<A.length;i+=4){
      const dr=A[i]-B[i], dg=A[i+1]-B[i+1], db=A[i+2]-B[i+2];
      if (Math.abs(dr)+Math.abs(dg)+Math.abs(db) > 40) n++;
    }
    return n;
  };
  // 统计近似 #8b6528（盒体木棕）像素数
  const brownCount = (A) => {
    let n=0;
    for (let i=0;i<A.length;i+=4){
      const r=A[i],g=A[i+1],b=A[i+2];
      if (Math.abs(r-0x8b)<30 && Math.abs(g-0x65)<30 && Math.abs(b-0x28)<30) n++;
    }
    return n;
  };

  // D1 植物淡入：t=0.1（近透明）vs t=1.0（落定 alpha 0.85）
  const d1a = await grab(0.1, 440, 310, 120, 85);
  const d1b = await grab(1.0, 440, 310, 120, 85);
  const D1 = diffCount(d1a, d1b);

  // D2 无礼盒残留：t=0.5 时盒体区应无棕色大块（植物淡入中，背景是黑色遮罩）
  const d2  = await grab(0.5, 430, 295, 140, 120);
  const D2  = brownCount(d2);

  console.log('D1 植物淡入差分（t=0.1 vs 1.0）: '+D1+' 像素');
  console.log('D2 盒体棕色像素（t=0.5, 应≈0）: '+D2+' 像素');

  const pass = D1 > 200 && D2 < 500;
  console.log('\n=== v2.2.4 判别力结论: '+(pass?'PASS (植物淡入生效, 无礼盒残留)':'FAIL (淡入未生效或有礼盒残留)')+' ===');
  try { e.kill(); } catch (_) {}
  process.exit(pass ? 0 : 1);
})();
