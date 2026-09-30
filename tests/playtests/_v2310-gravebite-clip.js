/* _v2310-gravebite-clip · 咬碑藤啃碑「碑体逐渐消失」真机视觉验收（2026-09-30 v2.3.10 消缺）
 * 用户反馈：咬碑藤吃墓碑时碑穿模——主体往下啃，但碑纹丝不动（完整碑身叠在绿色主体后）。
 * 期望效果：碑随咀嚼进度从碑顶开始一点点消失（clip 裁剪），到 chewT≈CHEW 时碑身几乎全无。
 * 探针口径（_diag-grave-colors 实测标定）：
 *   碑身 #5c5c52=(92,92,82)、基座 #4a4a42=(74,74,66) → 中性灰判别 |r-g|≤10 && b<r && 55<r<115；
 *   草皮雾后 (76,92,83) g-r=16 排除；绿主体 #7cc04a/#4a8a2a g-r≫10 排除；牙白 r>115 排除。
 *   检测带（drawWorldDecor 口径）：yb=GRID_Y+row*CELL_H+CELL_H-14；十字架碑顶 yb-34、圆顶弧顶 yb-38。
 * 判别性：旧 v2.3.9 源碑不感知 chewT ⇒ T2/T3/T4 必红。
 * 运行：node tests/playtests/_v2310-gravebite-clip.js
 * 产物：tests/playtests/_v2310-gbclip-*.png + _v2310-gbclip-results.json
 */
const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9343;
const TMP = path.join(process.cwd(), 'tests', 'playtests', '.edge-tmp-2310');
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
    // 碑格上放咬碑藤：chewT 档位由调用方给定
    window.__V.mkGB = function(col,row,chewT){
      return {col:col,row:row,type:'gravebuster',cd:0,sunT:0,growT:0,chewT:chewT,
        armT:0,arming:false,dur:300,maxDur:300,
        plantT:620,plantDone:true,dirtDone:true,plantFrom:{x:0,y:0}};
    };
    window.__V.geo = function(){ return {GRID_X:GRID_X,CELL_W:CELL_W,GRID_Y:GRID_Y,CELL_H:CELL_H,chew:GRAVEBUSTER_CHEW,
      stoneH:GRAVEBUSTER_GEOM.stoneH,stoneHArched:GRAVEBUSTER_GEOM.stoneHArched}; };
    window.__V.renderNow = function(){ render(); return true; };
    // 「碑系灰」像素：中性灰判别（标定见文件头）；裂纹/咬痕暗线少量挖除灰属啃食方向，不影响判据
    window.__V.grayAt = function(x,y,w,h){ const d=ctx.getImageData(Math.round(x),Math.round(y),w,h).data; let n=0;
      for(let i=0;i<d.length;i+=4){ const rr=d[i],gg=d[i+1],bb=d[i+2];
        if(Math.abs(rr-gg)<=10 && bb<rr && rr>55 && rr<115) n++; } return n; };
    return 'helpers ok';
  })()`;
  await evalPage(helper);
  await evalPage('window.__V.freeze(); window.__V.clearWorld(); true');

  const G = await evalPage('window.__V.geo()');
  // 用 2-1 第一座墓碑（i=0 十字架型）的真实点位（drawWorldDecor 只画 level.graves 里的碑）
  const grave0 = await evalPage('level.graves[0]');
  const col = grave0[0], row = grave0[1];
  const cx = G.GRID_X + col*G.CELL_W + G.CELL_W/2;
  const yb = G.GRID_Y + row*G.CELL_H + G.CELL_H - 14;   // 碑基座底缘 y（drawWorldDecor 口径）
  // 旧源无 GRAVEBUSTER_GEOM.stoneH（v2.3.10 新增）→ geo() 返回 undefined → 检测带高 0 ⇒ 此处直接失败为预期外的环境错，改走缺省兜底
  const STONE_H_FIX = G.stoneH || 34, STONE_ARCH_FIX = G.stoneHArched || 38;
  const STONE_H = STONE_H_FIX;                           // 十字架碑身总高（=34，碑顶 yb-34）
  const W = 44;                                          // 检测窗宽（碑宽 32 + 余量；避开相邻碑）
  const topBand   = { x: cx-W/2, y: yb-STONE_H,   w: W, h: STONE_H/2-2 };  // 上半碑身（yb-34..yb-19）
  const botBand   = { x: cx-W/2, y: yb-STONE_H/2, w: W, h: STONE_H/2-2 };  // 下半碑身（yb-17..yb-2）
  const wholeBand = { x: cx-W/2, y: yb-STONE_H,   w: W, h: STONE_H-2   };  // 全碑（yb-34..yb-2）

  const grayTop  = () => evalPage(`window.__V.grayAt(${topBand.x|0},${topBand.y|0},${topBand.w|0},${topBand.h|0})`);
  const grayBot  = () => evalPage(`window.__V.grayAt(${botBand.x|0},${botBand.y|0},${botBand.w|0},${botBand.h|0})`);
  const grayAll  = () => evalPage(`window.__V.grayAt(${wholeBand.x|0},${wholeBand.y|0},${wholeBand.w|0},${wholeBand.h|0})`);
  const setup = async (chewT) => {
    await evalPage('window.__V.clearWorld(); true');
    await evalPage(`plants=[window.__V.mkGB(${col},${row},${chewT})]; zombies=[]; screenShake.t=0;flashT=0; render(); true`);
  };

  // ---- T0 基线：无咬碑藤时碑完整（探针有效性：上半碑灰充足）----
  console.log('T0 基线：碑完整');
  {
    await evalPage('window.__V.clearWorld(); plants=[]; zombies=[]; render(); true');
    const g0 = await grayTop();
    await shot('_v2310-gbclip-base.png');
    push('T0','基线：无咬碑藤时上半碑灰像素充足（探针有效）', g0 > 80, ['上半碑灰='+g0]);
  }

  // ---- T1 chewT=0：碑完整（咬碑藤刚种下，主体在碑顶）----
  console.log('T1 chewT=0：碑完整');
  {
    await setup(0);
    const g0 = await grayTop();
    const gAll = await grayAll();
    await shot('_v2310-gbclip-0.png');
    push('T1','chewT=0 碑完整（上半碑灰≈基线 80%+）', g0 > 80, ['上半碑灰='+g0, '全碑灰='+gAll]);
  }

  // ---- T2 chewT=2.0（半程）：上半碑应几乎无灰（被啃掉），下半碑灰多 ----
  console.log('T2 chewT=2.0：上半碑被啃掉');
  {
    await setup(2.0);
    const g0 = await grayTop();
    const g1 = await grayBot();
    await shot('_v2310-gbclip-2.png');
    // 旧源：碑不动 → 上半碑灰多（FAIL）；新源：碑顶被 clip → 上半碑灰≈0，只剩绿主体（绿不算灰）
    push('T2','chewT=2.0 上半碑已消失（灰≈0），下半碑保留（灰多）', g0 < g1*0.35 && g1 > 80,
      ['上半碑灰='+g0, '下半碑灰='+g1]);
  }

  // ---- T3 chewT=3.6（近尾声）：全碑灰所剩无几 ----
  console.log('T3 chewT=3.6：碑身几乎全无');
  {
    await setup(3.6);
    const gAll = await grayAll();
    await evalPage('window.__V.clearWorld(); plants=[]; render(); true');
    const gRef = await grayAll();          // 同窗基线（碑完整）
    await setup(3.6);                      // 复位到啃食帧再截图
    await shot('_v2310-gbclip-36.png');
    push('T3','chewT=3.6 全碑灰 < 完整基线 25%（碑身几乎啃完）', gAll < gRef*0.25,
      ['chew3.6 全碑灰='+gAll, '完整基线灰='+gRef]);
  }

  // ---- T4 圆顶碑型（i%2===1）：同机制 ----
  console.log('T4 圆顶碑型同机制');
  {
    const gi = await evalPage('(function(){for(let i=0;i<level.graves.length;i++){if(i%2===1)return i}return -1})()');
    if (gi < 0) { push('T4','圆顶碑型同机制', false, ['2-1 无 i%2===1 的碑（跳过条件不满足）']); }
    else {
      const [gc1, gr1] = await evalPage(`level.graves[${gi}]`);
      const cx1 = G.GRID_X + gc1*G.CELL_W + G.CELL_W/2;
      const yb1 = G.GRID_Y + gr1*G.CELL_H + G.CELL_H - 14;
      const w1 = 44, h1 = STONE_ARCH_FIX - 2;              // 圆顶碑身总高（=38，弧顶 yb-38）
      await evalPage(`window.__V.clearWorld(); plants=[]; render(); true`);
      const gRef = await evalPage(`window.__V.grayAt(${(cx1-w1/2)|0},${(yb1-h1)|0},${w1},${h1})`);
      await evalPage(`plants=[window.__V.mkGB(${gc1},${gr1},3.6)]; zombies=[]; render(); true`);
      const gEat = await evalPage(`window.__V.grayAt(${(cx1-w1/2)|0},${(yb1-h1)|0},${w1},${h1})`);
      await shot('_v2310-gbclip-dome.png');
      push('T4','圆顶碑型 chewT=3.6 全碑灰 < 完整基线 25%', gEat < gRef*0.25,
        ['基线全碑灰='+gRef, 'chew3.6 全碑灰='+gEat]);
    }
  }

  // 汇总
  const passed = RESULTS.filter(r=>r.pass).length;
  fs.writeFileSync(path.join(OUT,'_v2310-gbclip-results.json'), JSON.stringify({passed,total:RESULTS.length,results:RESULTS},null,2));
  console.log('\n════════ 咬碑藤啃碑「碑体消失」视觉验收：'+passed+'/'+RESULTS.length+' PASS ════════');
  ws.close(); e.kill();
  process.exit(passed===RESULTS.length?0:1);
})().catch(e=>{ console.error('FATAL',e); process.exit(2); });
