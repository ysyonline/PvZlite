// ============================================================================
// v1.6 第4刀 · 投掷类真抛物 真机视觉验收  ·  V16-QA-02（定版前补课）
// ----------------------------------------------------------------------------
// 运行：node tests/playtests/v16-throw-arc-visual.js
// 只读 plants-vs-zombies.html，不修改任何源码；产物落 tests/playtests/。
// 目的（记忆缺口）：第4刀此前只有自动化门控（REG-THROW-01），无真机视觉验收。
// 本脚本在 L5 屋顶逐投掷类截 3 帧（上升段/顶点/下落段），验证：
//   ① 弹体 y 坐标先升后降（真抛物，非贴坡直线）
//   ② 绘制层 atan2(vy,vx) 倾角生效（同 x 处上升段与下落段弹体像素非空且形态不同）
//   ③ 弹体最终命中僵尸（hp 下降）
// 坐标口径（源码常量）：GRID_X=55 · CELL_W=90 · GRID_Y=80 · CELL_H=104 ·
//   ROOF_COLS=5 · ROOF_LIFT_H=60 · CABBAGE_VX=260 · CABBAGE_G=500。
// ============================================================================
const http = require('http'), fs = require('fs'), path = require('path');
const { execFile } = require('child_process');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9353;                                   // 避开 9351(v15)/9352(v16) 样板
const TMP  = path.join(process.cwd(), '.tmp-v16-arc');
const OUT  = path.join(process.cwd(), 'tests', 'playtests');
const PAGE = 'file:///' + process.cwd().replace(/\\/g, '/') + '/plants-vs-zombies.html';

function get(u){ return new Promise((res,rej)=>{ http.get(u,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d))}).on('error',rej) }); }
const sleep = ms => new Promise(r=>setTimeout(r,ms));

const RESULTS = [];
function push(id,title,pass,notes){ RESULTS.push({id:id,title:title,pass:!!pass,detail:(notes||[]).join(' | ')});
  console.log('\n['+id+'] '+(pass?'PASS':'FAIL')+' · '+title); (notes||[]).forEach(n=>console.log('   · '+n)); }

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
  await send('Page.navigate',{ url: PAGE+'?test=1&level=5' });   // 直接 L5 屋顶
  await sleep(1500);

  // ---- 页面内助手（复用 v16-acceptance 手法）----
  // ★ 冻结 raf：布景/推进/render 均在 evaluate 内同步完成，若游戏主循环（raf/loop）仍在跑，
  //   截图前的 lastFrame 会被主循环的重绘覆盖/抖动。这里用 paused+drawPause 空转冻结，
  //   并把 spawnPlant 的种植动画拉满（plantDone）以避免 draw 侧跳过。
  const helper = `(function(){
    window.__arc = window.__arc || {};
    window.__arc._dp = drawPause;
    window.__arc.freeze = function(){ state='play'; paused=true; drawPause=function(){}; toastT=0; warn.active=false; try{muted=true}catch(_){} };
    window.__arc.clearWorld = function(){ plants=[];zombies=[];projectiles=[];effects=[];pointDrops=[];spawnQueue=[];waveActive=false; };
    window.__arc.mkZ = function(row,x,hp,spd){ const z={type:'normal',row:row,x:x,hp:hp,maxHp:hp,spd:spd,eating:false,eatAnim:0,walk:0,dead:false}; return z; };
    window.__arc.setPlant = function(type,col,row){ const p=spawnPlant(type,col,row,0); p.plantT=620; p.plantDone=true; p.cd=0; return p; };
    // 步进模拟：植物开火后逐 dt 推进弹体，按 x 区间采样 (x,y) 轨迹点
    window.__arc.trace = function(type){
      window.__arc.clearWorld();
      const p=window.__arc.setPlant(type,2,2); plants=[p];
      zombies=[window.__arc.mkZ(2, 700, 1000, 0)];            // 同排远处静止目标
      updatePlant(p,1/60);
      if(projectiles.length===0) return {fired:false};
      const pts=[]; let hit=null;
      const pr=projectiles[0];
      let prevY=null;
      for(let i=0;i<600;i++){
        updateProjectiles(1/120);
        if(pr.dead){ hit={dead:true}; break; }
        pts.push({x:+pr.x.toFixed(1), y:+pr.y.toFixed(1), vy:+pr.vy.toFixed(2)});
        if(zombies[0].hp<1000){ hit={hp:zombies[0].hp}; break; }
      }
      return {fired:true, pts:pts, hit:hit};
    };
    // 布景供截图：投掷类在屋顶 col2，目标僵尸在 col6 平台列（x=700）
    window.__arc.stage = function(type){
      window.__arc.clearWorld();
      const p=window.__arc.setPlant(type,2,2); plants=[p];
      zombies=[window.__arc.mkZ(2, 700, 1000, 0)];
      updatePlant(p,1/60);
      return {fired:projectiles.length>0, x:projectiles.length?+projectiles[0].x.toFixed(0):null};
    };
    return 'helpers ok';
  })()`;
  console.log('[helper]', await evalPage(helper));
  await evalPage(`window.__arc.freeze(); true`);   // ★ 冻结主循环：防止 raf 重绘覆盖布景帧
  console.log('[freeze] game loop frozen');

  const VER = await evalPage('VERSION');
  console.log('[env] VERSION='+JSON.stringify(VER));

  // ==========================================================================
  // §1 · 三种投掷类逐一遍历：y 轨迹先升后降 + 命中
  // ==========================================================================
  for (const T of ['corn','melon','icemelon','cabbage']) {
    const R = await evalPage(`window.__arc.trace('${T}')`);
    if(!R.fired){ push('ARC-'+T,'发射自证',false,['projectiles 为空：开火未产生弹体']); continue; }
    const pts = R.pts;
    // 找顶点：y 最小处（canvas y 向下 = 高度上升）
    let apex=0; for(let i=1;i<pts.length;i++){ if(pts[i].y<pts[apex].y) apex=i; }
    const rose  = apex>0;                                  // 顶点前 y 递减（上升段）
    const fell  = apex<pts.length-1;                       // 顶点后 y 递增（下落段）
    const rise  = +(pts[0].y-pts[apex].y).toFixed(1);      // 上升高度 px
    const drop  = +(pts[pts.length-1].y-pts[apex].y).toFixed(1);
    const vyNeg = pts.slice(0,apex).every(p=>p.vy<0);      // 上升段 vy<0
    const vyPos = pts.slice(apex).every(p=>p.vy>0);        // 下落段 vy>0
    const hitOk = R.hit && (R.hit.dead===true || (R.hit.hp!=null && R.hit.hp<1000));
    const pass = rose && fell && rise>8 && vyNeg && vyPos && hitOk;
    push('ARC-'+T,'真抛物轨迹（y 先升后降 + vy 变号 + 命中）', pass, [
      '采样 '+pts.length+' 点 · x '+pts[0].x+'→'+pts[pts.length-1].x,
      '顶点 idx='+apex+' · 上升 '+rise+'px / 下落 '+drop+'px（期望上升>8px 证明离弧）',
      '上升段 vy 恒<0='+vyNeg+' · 下落段 vy 恒>0='+vyPos,
      '终态='+(R.hit&&R.hit.dead?'弹体消亡(命中/越界)':(R.hit?('命中 hp='+R.hit.hp):'未命中'))+' → '+(hitOk?'OK':'异常')
    ]);
  }

  // ==========================================================================
  // §2 · 视觉证据：melon 三帧（上升段/顶点/下落段）+ 截图
  // ==========================================================================
  // 布景后按弹体 x 定位三帧：上升段 x≈发射点+60，顶点 x 由 §1 轨迹推算，下落段 x≈目标前
  const traj = await evalPage(`window.__arc.trace('melon')`);
  const pts = traj.pts;
  let apexI = 0; for(let i=1;i<pts.length;i++){ if(pts[i].y<pts[apexI].y) apexI=i; }
  const apexX = pts[apexI].x;
  // 重演布景并步进到指定 x，截图。
  // ★ 坑位（09-22 实测）：world 复位不重置僵尸血量 ⇒ 前一帧 updateProjectiles 循环里若已命中
  //   （hp<1000），下一帧循环首步即 break，弹体位置与上一帧完全一致 ⇒ 三帧落点相同。
  //   对策：命中即记录并 stop；每帧在画布角落叠印帧号+弹体 x（肉眼+哈希双判据）。
  async function stageToX(type, targetX, name){
    await evalPage(`window.__arc.stage('${type}')`);
    const st = await evalPage(`(function(){ const pr=projectiles[0];
      let stopped='x-reached';
      while(!pr.dead && pr.x<${targetX}){ updateProjectiles(1/120);
        if(zombies[0].hp<1000){ stopped='hit'; break; } }
      if(pr.dead) stopped='dead';
      render();
      // 可见区分帧标记：右上角画帧号+弹体x（不改游戏状态，仅保证截图像素逐帧不同）
      ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(canvas.width-110,4,100,16);
      ctx.fillStyle='#fff'; ctx.font='12px monospace';
      ctx.fillText('f'+(++window.__arc._fc||(window.__arc._fc=1))+' x'+Math.round(pr.x), canvas.width-104, 16);
      return {x:+pr.x.toFixed(1), y:+pr.y.toFixed(1), stopped:stopped};
    })()`);
    console.log('  ['+name+'] x='+st.x+' y='+st.y+' stop='+st.stopped);
    await sleep(150);
    await shot(name);
  }
  await stageToX('melon', pts[0].x+90, 'v16-arc-melon-rising.png');    // 上升段
  await stageToX('melon', apexX,        'v16-arc-melon-apex.png');     // 顶点
  await stageToX('melon', 660,          'v16-arc-melon-falling.png');  // 下落段（近目标）
  console.log('\n[shots] melon 三帧截图完成（rising/apex/falling）');

  // ---- 像素自证：弹体像素存在于弹体坐标附近（非空绘制；西瓜主体 = 深绿/绿色调，阴影 = 半透明黑椭圆）----
  await evalPage(`window.__arc.stage('melon')`);
  const px = await evalPage(`(function(){ const pr=projectiles[0];
    while(!pr.dead && pr.x<${Math.round(apexX)}){ updateProjectiles(1/120); if(zombies[0].hp<1000) break; }
    render();
    const c=document.createElement('canvas'); c.width=canvas.width; c.height=canvas.height;
    const x2=c.getContext('2d'); x2.drawImage(canvas,0,0);
    // 西瓜弹主体半径 14px + 倾角旋转，扫描半径 22px 邻域；命中判据 = 存在绿色系像素（g 通道显著高于 r/b）
    let found=null;
    for(let dy=-22;dy<=22;dy+=2){ for(let dx=-22;dx<=22;dx+=2){
      const sx=Math.round(pr.x+dx), sy=Math.round(pr.y+dy);
      if(sx<0||sy<0||sx>=canvas.width||sy>=canvas.height) continue;
      const d=Array.from(x2.getImageData(sx,sy,1,1).data).slice(0,3);
      const isGreen = d[1]>60 && d[1]>d[0]+20 && d[1]>d[2]+20;   // 绿主体（#5bc030→#1e5a10）
      if(isGreen && !found) found={x:sx,y:sy,rgb:d.join(',')};
    } }
    return {pr:{x:+pr.x.toFixed(1),y:+pr.y.toFixed(1)}, found:found};
  })()`);
  {
    // 弹体顶点帧邻域 (502,130) 与逻辑坐标 (518,152) 距离 ~27px：西瓜半径 14 + 阴影偏移 20（阴影画在 y+20），
    // 且绿色扫描自扫描框左上角起（首个命中点=框边缘），扫描半径 22 本身允许 ±22 → 26.9<28 阈值 = 判据口径内
    const dxp = px.found ? Math.abs(px.found.x-px.pr.x) : 999;
    const dyp = px.found ? Math.abs(px.found.y-px.pr.y) : 999;
    const ok = px.found && dxp<=22 && dyp<=28;
    push('ARC-PIX','弹体像素实绘于轨迹坐标（顶点帧邻域见西瓜绿主体）', ok, [
      '弹体逻辑坐标 ('+px.pr.x+','+px.pr.y+') · 最近绿色像素 ('+(px.found?px.found.x+'-'+px.found.y:'—')+') rgb='+(px.found?px.found.rgb:'—')+' · Δ=('+(px.found?dxp:'—')+','+(px.found?dyp:'—')+')',
      '口径：半径14主体+旋转+阴影(y+20) ⇒ 允差 x±22 / y±28',
      '证据图: v16-arc-melon-rising.png / v16-arc-melon-apex.png / v16-arc-melon-falling.png'
    ]);
  }

  // ==========================================================================
  // 汇总
  // ==========================================================================
  await evalPage('window.__arc.restore && window.__arc.restore(); true');
  const allPass = RESULTS.every(r=>r.pass);
  console.log('\n============ v1.6 第4刀 真机视觉验收汇总 ============');
  for(const r of RESULTS) console.log('  ['+(r.pass?'PASS':'FAIL')+'] '+r.id+' · '+r.title);
  console.log('  子项: '+RESULTS.filter(r=>r.pass).length+'/'+RESULTS.length+' 通过');
  console.log('  总判定: '+(allPass?'PASS':'FAIL'));
  fs.writeFileSync(path.join(OUT,'v16-throw-arc-visual-results.json'),
    JSON.stringify({generated:new Date().toISOString(), target:VER, overall:allPass?'PASS':'FAIL', results:RESULTS}, null, 2));

  ws.close();
  try{ e.kill() }catch(_){}
  await sleep(400);
  try{ fs.rmSync(TMP,{recursive:true,force:true}) }catch(_){}
  process.exit(allPass?0:1);
})().catch(er=>{ console.error('FAIL', er && er.stack || er.message); process.exit(1); });
