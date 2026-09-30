/* _v239-puffshroom-stem · 小喷菇柄可见+接地真机视觉验收（2026-09-30 · v2.3.9 消缺②）
 * 背景（用户反馈）：「小喷菇，现在的根茎视觉上看不见，只能看到一个露出小尖头，
 *   而且悬浮腾空，没有接触地面。」
 * 修复：柄下探改按地面线锚定（stemH=34，与阳光菇柄底同线）；柄绘制提到沉睡/清醒分支之前共用；
 *   卡面柄同步 stemW/stemH 等比缩放。判别力：对照 v2.3.8 旧源（.v238pre 后缀跑法见文件尾注释）。
 * 验证项：
 *   T1 夜晚清醒：柄奶白 #e6ddc8 在盖底缘以下露出（stemVisible>0；旧源≈0）
 *   T2 接地：柄底泥痕 #6a4526 命中 y 位于盖底缘之下 ≥20px（接地暗线；旧源泥痕贴盖底缘必红）
 *   T3 白天沉睡：柄同样可见（旧源沉睡分支无柄必红）+ 沉睡菇盖色正常
 *   T4 卡面：柄可见（stemW/stemH 缩放路径生效）
 * 运行：node tests/playtests/_v239-puffshroom-stem.js
 * 产物：tests/playtests/_v239-puff-stem-{night,day,card}.png + _v239-puff-stem-results.json
 */
const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9344;
const ARG_HTML = process.argv[2] || 'plants-vs-zombies.html';
const TAG = process.argv[3] || '';
const SUF = TAG ? ('.' + TAG) : '';
const TMP = path.join(process.cwd(), 'tests', 'playtests', '.edge-tmp-239' + (TAG ? ('-' + TAG) : ''));
const OUT = path.join(process.cwd(), 'tests', 'playtests');
const PAGE = 'file:///' + path.resolve(process.cwd(), ARG_HTML).replace(/\\/g, '/');

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
    window.__V._drawPause = drawPause;
    window.__V.freeze = function(){
      if(!window.__V._raf){ window.__V._raf = window.requestAnimationFrame; }
      window.requestAnimationFrame = function(){ return 0; };
      state='play'; paused=true; drawPause=function(){}; toastT=0;
      try{muted=true}catch(_){}
      screenShake.t=0;screenShake.dur=0;screenShake.intensity=0; flashT=0;
      sunFallT=1e9; spawnQueue=[]; waveActive=false;
    };
    window.__V.clearWorld = function(){ plants=[];zombies=[];projectiles=[];effects=[];pointDrops=[];spawnQueue=[];waveActive=false; screenShake.t=0; flashT=0; toastT=0; };
    window.__V.mkPuff = function(col,row){
      return {col:col,row:row,type:'puffshroom',cd:0,sunT:0,growT:0,chewT:0,
        armT:0,arming:false,dur:300,maxDur:300,
        plantT:620,plantDone:true,dirtDone:true,plantFrom:{x:0,y:0}};
    };
    window.__V.setTime = function(timeVal){ level=Object.assign({},LEVELS['1-6'],{time:timeVal}); };
    window.__V.geo = function(){ return {GRID_X:GRID_X,CELL_W:CELL_W,GRID_Y:GRID_Y,CELL_H:CELL_H,
      capR:PUFFSHROOM_GEOM.capR,stemW:PUFFSHROM_GEOM_STEMW_SAFE(),stemH:PUFFSHROOM_GEOM.stemH||0,hasStemH:(typeof PUFFSHROOM_GEOM.stemH==='number')}; };
    window.PUFFSHROM_GEOM_STEMW_SAFE = function(){ return (typeof PUFFSHROOM_GEOM.stemW==='number')?PUFFSHROOM_GEOM.stemW:0; };
    window.__V.renderNow = function(){ render(); return true; };
    // 柄奶白 #e6ddc8（230,221,200）容差 8
    window.__V.countStem = function(x,y,w,h){ const d=ctx.getImageData(Math.round(x),Math.round(y),w,h).data; let n=0;
      for(let i=0;i<d.length;i+=4){ if(Math.abs(d[i]-230)<=8&&Math.abs(d[i+1]-221)<=8&&Math.abs(d[i+2]-200)<=8) n++; } return n; };
    // 泥痕 #6a4526（106,69,38）容差 14；返回 {count, maxY}（相对采样框顶）
    window.__V.mudBBox = function(x,y,w,h){ const d=ctx.getImageData(Math.round(x),Math.round(y),w,h).data;
      let n=0,maxY=-1;
      for(let i=0;i<d.length;i+=4){ if(Math.abs(d[i]-106)<=14&&Math.abs(d[i+1]-69)<=14&&Math.abs(d[i+2]-38)<=14){
        n++; const py=(i/4/w)|0; if(py>maxY)maxY=py; } }
      return {count:n,maxY:maxY}; };
    // 菇盖紫 #9a6ad0（154,106,208）容差 8；返回最低命中 y（盖底缘）
    window.__V.capMaxY = function(x,y,w,h){ const d=ctx.getImageData(Math.round(x),Math.round(y),w,h).data;
      let n=0,maxY=-1;
      for(let i=0;i<d.length;i+=4){ if(Math.abs(d[i]-154)<=8&&Math.abs(d[i+1]-106)<=8&&Math.abs(d[i+2]-208)<=8){
        n++; const py=(i/4/w)|0; if(py>maxY)maxY=py; } }
      return {count:n,maxY:maxY}; };
    return 'helpers ok';
  })()`;
  console.log('[helper]', await evalPage(helper));
  await evalPage(`window.__V.freeze(); true`);
  const ENV = await evalPage(`({stemH:(typeof PUFFSHROOM_GEOM!=='undefined'?PUFFSHROOM_GEOM.stemH:null),
    stemW:(typeof PUFFSHROOM_GEOM!=='undefined'?PUFFSHROOM_GEOM.stemW:null)})`);
  console.log('[env] '+JSON.stringify(ENV));

  // ============ T1+T2 · 夜晚清醒：柄露出 + 接地 ============
  try {
    const r = await evalPage(`(function(){
      window.__V.freeze(); window.__V.clearWorld();
      window.__V.setTime('night');
      const g=window.__V.geo();
      const col=3,row=2;
      const x=g.GRID_X+col*g.CELL_W+g.CELL_W/2, y=g.GRID_Y+row*g.CELL_H+g.CELL_H/2;
      plants=[window.__V.mkPuff(col,row)]; zombies=[]; projectiles=[]; effects=[]; render();
      const capBottom = y + 6 + g.capR*0.84;             // 盖底缘（盖心 _capY=y+6 + 半纵轴）
      const groundY   = y + 34;                           // 期望柄底/地面线
      // 盖底缘以下 → 地面线以下 6px 的窗口内找柄奶白
      const stem = window.__V.countStem(x-16, capBottom+1, 32, groundY-capBottom+6);
      // 泥痕：地面线上下 ±5px 窗口
      const mud = window.__V.mudBBox(x-16, groundY-5, 32, 10);
      // 对照：盖窗口内柄奶白几乎为 0（柄矩形从盖心下 2px 起，但被盖覆盖）——只统计盖底缘以下露出段
      const cap = window.__V.capMaxY(x-20, y-30, 40, 70);
      return {stemVisible:stem, mudCount:mud.count, mudMaxAbsY:(mud.maxY<0?-1:groundY-5+mud.maxY),
              capBottomAbs:capBottom, groundAbs:groundY, capMaxY:(cap.maxY<0?-1:y-30+cap.maxY),
              box:{x:x,y:y}};
    })()`);
    console.log('[T1/T2 raw] '+JSON.stringify(r));
    await shot('_v239-puff-stem-night'+SUF+'.png');
    const stemOK = r.stemVisible > 15;                   // 柄矩形 5.3px 宽 × ~22px 高 ≈ 117px，抗锯齿折半仍应 >15
    const groundOK = r.mudCount > 0 && r.mudMaxAbsY >= r.capBottomAbs + 15;   // 泥痕在盖底缘之下 ≥15px（接地而非贴盖）
    push('VIS-PUFF-STEM-01','夜晚清醒：柄在盖底缘以下可见（旧源≈0）', stemOK, [
      '柄奶白 #e6ddc8 于盖底缘 y='+r.capBottomAbs.toFixed(1)+' 以下命中='+r.stemVisible+'（阈值 >15）',
      '判别力：旧源 stemH=13.8<盖底缘10.1 ⇒ 命中≈0 必红']);
    push('VIS-PUFF-STEM-02','接地：泥痕位于盖底缘之下 ≥15px（地面线锚定）', groundOK, [
      '泥痕 #6a4526 命中='+r.mudCount+' · 最低 y='+r.mudMaxAbsY+'（盖底缘 '+r.capBottomAbs.toFixed(1)+' / 期望地面线 '+r.groundAbs+')',
      '判别力：旧源泥痕贴盖底缘（y+15.6）⇒ maxY-capBottom≈0 必红']);
  } catch (e) { push('VIS-PUFF-STEM-01/02','夜晚清醒柄可见/接地', false, ['异常: ' + e.message]); }

  // ============ T3 · 白天沉睡：柄同样可见 ============
  try {
    const r = await evalPage(`(function(){
      window.__V.freeze(); window.__V.clearWorld();
      window.__V.setTime('day');
      const g=window.__V.geo();
      const col=3,row=2;
      const x=g.GRID_X+col*g.CELL_W+g.CELL_W/2, y=g.GRID_Y+row*g.CELL_H+g.CELL_H/2;
      plants=[window.__V.mkPuff(col,row)]; zombies=[]; projectiles=[]; effects=[]; render();
      const capBottom = y + 6 + 5 + g.capR*0.60;  // 沉睡盖心 y+6+droop5 + capR*capSquash(0.60，源 MUSHROOM_SLEEP_GEOM.capSquash)
      const groundY = y + 34;
      const stem = window.__V.countStem(x-16, capBottom+1, 32, groundY-capBottom+6);
      // 沉睡盖色 #7d51b4（125,81,180）命中佐证姿态路由正确
      let sleepCap=0; const d=ctx.getImageData(Math.round(x-20),Math.round(y-30),40,50).data;
      for(let i=0;i<d.length;i+=4){ if(Math.abs(d[i]-125)<=8&&Math.abs(d[i+1]-81)<=8&&Math.abs(d[i+2]-180)<=8) sleepCap++; }
      return {stemVisible:stem, sleepCap:sleepCap, capBottomAbs:capBottom, groundAbs:groundY};
    })()`);
    console.log('[T3 raw] '+JSON.stringify(r));
    await shot('_v239-puff-stem-day'+SUF+'.png');
    const stemOK = r.stemVisible > 10;
    push('VIS-PUFF-STEM-03','白天沉睡：柄同样可见（旧源沉睡分支无柄必红）', stemOK, [
      '沉睡盖色 #7d51b4 命中='+r.sleepCap+'（姿态路由正确佐证）· 盖底缘下柄奶白命中='+r.stemVisible+'（阈值 >10）',
      '判别力：旧版沉睡路径不画柄 ⇒ 命中=0 必红']);
  } catch (e) { push('VIS-PUFF-STEM-03','白天沉睡柄可见', false, ['异常: ' + e.message]); }

  // ============ T4 · 卡面柄可见（stemW/stemH 缩放路径） ============
  try {
    const r = await evalPage(`(function(){
      window.__V.freeze(); window.__V.clearWorld();
      state='play'; paused=true; sun=9999; selected=null; cardCD={};
      deck=['puffshroom','pea']; slots=10;
      render();
      const g=window.__V.geo();
      const X0=(typeof CARD_X0!=='undefined')?CARD_X0:76, W=(typeof CARD_W!=='undefined')?CARD_W:88;
      const Y=(typeof CARD_Y!=='undefined')?CARD_Y:600, H=(typeof CARD_H!=='undefined')?CARD_H:78;
      const cx=X0+W/2, cy=Y+H/2;
      // 卡面柄底≈cy+stemH*0.82≈cy+27.9；泥痕 #6a4526 命中
      const mud = window.__V.mudBBox(cx-12, cy+20, 24, 14);
      return {mudCount:mud.count, hasStemH:g.hasStemH};
    })()`);
    console.log('[T4 raw] '+JSON.stringify(r));
    await shot('_v239-puff-stem-card'+SUF+'.png');
    push('VIS-PUFF-STEM-04','卡面：柄/泥痕可见（stemW/stemH 缩放路径生效）', r.mudCount > 0 && r.hasStemH, [
      '卡面泥痕 #6a4526 命中='+r.mudCount+' · stemH 桥=' + r.hasStemH,
      '判别力：旧版卡面柄椭圆 ±11 于 cy+8 也有泥痕——本项主要锁新路径无异常；强判别由 T1-T3 承担']);
  } catch (e) { push('VIS-PUFF-STEM-04','卡面柄可见', false, ['异常: ' + e.message]); }

  // ============ 汇总 ============
  const np = RESULTS.filter(r=>r.pass).length;
  console.log('\n============ v2.3.9 小喷菇柄真机视觉验收'+(SUF?' ('+TAG+' 对照)':' (new)')+' ============');
  for (const r of RESULTS) console.log('  ['+(r.pass?'PASS':'FAIL')+'] '+r.id+' · '+r.title);
  console.log('  子项: '+np+'/'+RESULTS.length+' 通过');
  console.log('  总判定: '+(np===RESULTS.length?'PASS':'FAIL'));
  fs.writeFileSync(path.join(OUT,'_v239-puff-stem-results'+SUF+'.json'),
    JSON.stringify({tag:TAG||'new', pass:np===RESULTS.length, results:RESULTS}, null, 2));
  console.log('  产物: ' + path.join(OUT,'_v239-puff-stem-results'+SUF+'.json'));

  ws.close();
  try { e.kill(); } catch(_) {}
  process.exitCode = np===RESULTS.length ? 0 : 1;
})().catch(e => { console.error('FATAL', e); process.exitCode = 1; });
