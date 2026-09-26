// ============================================================================
// v2.2.2 礼盒重绘 P0 · 呼吸动画判别力自证
// ----------------------------------------------------------------------------
// 验证 B-01 修复是否真正生效：闭合态下 pulse 呼吸缩放应随 t 变化改变盒子尺寸。
// 判别力设计：闭合态 t∈[0,0.6]，pulse=1+sin(t*5)*0.03
//   - 旧源（pulse 未应用）：闭合态两帧盒子本体区域像素差分 ≈ 0
//   - 新源（pulse 已应用）：两帧盒子本体区域像素差分 > 阈值（盒子边缘随 t 移动）
// 抓取区域：盒子本体 x∈[430,570] y∈[295,415]（盒子中心 500,355，140×120）
//   —— 避开文字区（文字在 y≈421，盒子下沿 415 之上）
// 两帧 t 取值：t=0.05（pulse≈1.007，接近 1.0） vs t=0.32（pulse≈1.03，最大）
// 运行：node tests/playtests/v222-breath-discrim.js
// ============================================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { execFile } = require('child_process');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9372;
const TMP  = path.join(process.cwd(), '.tmp-v222-breath');
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

  // 冻结 + 无礼盒泄露保证
  await evalPage(`(function(){
    window.__V = window.__V || {};
    window.__V._raf = window.requestAnimationFrame;
    window.requestAnimationFrame = function(){ return 0; };
    state='play'; paused=true; drawPause=function(){}; toastT=0;
    try{muted=true}catch(_){}
    screenShake.t=0;screenShake.dur=0;flashT=0;
    plants=[];zombies=[];projectiles=[];effects=[];pointDrops=[];spawnQueue=[];waveActive=false;
    window.__V.grabBox = function(){
      return ctx.getImageData(430,295,140,120).data.slice();  // 盒子本体区 x430..570 y295..415
    };
    return true;
  })()`);

  const grab = async (tval) => {
    return evalPage(`(function(){
      won=true; state='end'; level={name:'1-1',totalWaves:1,world:1};
      points=350; highScore=1200; DIFF='normal'; score=120;
      giftAnim={active:true,t:${tval},card:{type:'pea',name:'豌豆射手'}};
      screenShake.t=0; flashT=0; toastT=0;
      render();
      return Array.from(window.__V.grabBox());
    })()`);
  };

  const A = await grab(0.05);
  const B = await grab(0.32);
  // 像素差分（逐像素 RGB 差之和 > 阈值判为不同）
  let diffN = 0;
  for (let i=0;i<A.length;i+=4){
    const dr=A[i]-B[i], dg=A[i+1]-B[i+1], db=A[i+2]-B[i+2];
    if (Math.abs(dr)+Math.abs(dg)+Math.abs(db) > 40) diffN++;
  }
  const total = A.length/4;
  const ratio = diffN/total;

  console.log('盒子本体区像素总数: '+total);
  console.log('t=0.05 vs t=0.32 差分像素: '+diffN+'（占比 '+ (ratio*100).toFixed(2) +'%）');
  console.log('pulse(t=0.05)='+(1+Math.sin(0.05*5)*0.03).toFixed(4)+'  pulse(t=0.32)='+(1+Math.sin(0.32*5)*0.03).toFixed(4));

  // 判据：呼吸生效 → 盒子边缘随 t 移动 → 差分像素应 > 200（边缘约 2px × 周长约 100px ≈ 数百像素）
  const PASS = diffN > 200;
  console.log('\n=== 判别力结论: '+(PASS?'PASS (呼吸动画生效)':'FAIL (呼吸动画未生效)')+' ===');
  try { e.kill(); } catch (_) {}
  process.exit(PASS ? 0 : 1);
})();
