// ============================================================================
// v2.2.3 礼盒 P1 打磨 · 判别力自证 —— 【已退役 v2.2.4】
// ----------------------------------------------------------------------------
// ★ 2026-09-26 v2.2.4 起：礼盒动画整体移除，通关奖励改为植物淡入展示。
//   本脚本验证的"盖子弹跳/四角星粒子/闪光环"已不存在，判据失效。
//   保留脚本本体作为 v2.2.3 P1 判别力历史记录；运行直接跳过。
// 历史说明：
//   验证三个 P1 特性真实生效（对齐美术规格 gift-box-animation-spec §8）：
//   D1 盖子弹跳（FEAT-LID-BOUNCE）· D2 四角星粒子（FEAT-STAR-PARTICLES）
//   D3 闪光环（FEAT-GLOW-RING）——旧源三项差分 ≈0 FAIL，新源全超阈值 PASS（先红后绿）。
// 运行：node tests/playtests/v223-gift-p1-discrim.js [html]
// ============================================================================
console.log('[v223] 已退役（v2.2.4 起礼盒动画移除，P1 判据失效）——跳过');
process.exit(0);
// ========== 以下为历史实现（v2.2.3 P1 判别力，保留存档） ==========
const http = require('http'), fs = require('fs'), path = require('path');
const { execFile } = require('child_process');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9373;
const TMP  = path.join(process.cwd(), '.tmp-v223-p1');
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

  // 冻结环境
  await evalPage(`(function(){
    window.__V = window.__V || {};
    window.__V._raf = window.requestAnimationFrame;
    window.requestAnimationFrame = function(){ return 0; };
    state='play'; paused=true; drawPause=function(){}; toastT=0;
    try{muted=true}catch(_){}
    screenShake.t=0;screenShake.dur=0;flashT=0;
    plants=[];zombies=[];projectiles=[];effects=[];pointDrops=[];spawnQueue=[];waveActive=false;
    window.__V.grab = function(x,y,w,h){
      return ctx.getImageData(x,y,w,h).data.slice();
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
      return Array.from(window.__V.grab(${x},${y},${w},${h}));
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

  // D1 盖子弹跳：t=0.95（飞起后悬停）vs t=1.25（落地弹跳期）
  const d1a = await grab(0.95, 470, 185, 120, 50);
  const d1b = await grab(1.25, 470, 185, 120, 50);
  const D1 = diffCount(d1a, d1b);

  // D2 四角星粒子：t=0.95（第一波 12 星进行中）vs t=2.5（展示态已消散）
  const d2a = await grab(0.95, 330, 260, 140, 120);
  const d2b = await grab(2.5, 330, 260, 140, 120);
  const D2 = diffCount(d2a, d2b);

  // D3 闪光环：t=0.70（闪光扩散中）vs t=0.90（已消散）
  const d3a = await grab(0.70, 620, 250, 100, 100);
  const d3b = await grab(0.90, 620, 250, 100, 100);
  const D3 = diffCount(d3a, d3b);

  console.log('D1 盖子弹跳差分（t=0.95 vs 1.25）: '+D1+' 像素');
  console.log('D2 四角星粒子差分（t=0.95 vs 2.5）: '+D2+' 像素');
  console.log('D3 闪光环差分（t=0.70 vs 0.90）: '+D3+' 像素');

  // 判据（阈值取宽松——动画内容在移动即算生效）
  const pass = D1 > 50 && D2 > 100 && D3 > 50;
  console.log('\n=== P1 判别力结论: '+(pass?'PASS (盖子弹跳/四角星/闪光环均生效)':'FAIL (有特性未生效)')+' ===');
  try { e.kill(); } catch (_) {}
  process.exit(pass ? 0 : 1);
})();
