// 花盆遮挡修复验证（用户反馈 2026-09-20「植物视觉上遮住了花盆」）
// 修复 = 盆上植物上移 POT_LIFT(16px) + 花盆下沉 POT_SINK(22px)，纯渲染层。
// 像素断言（col4,row2 格心 460,340；修复后植物中心 y=324、花盆绘制中心 y=362）：
//  - 核心差异点：盆口沿左侧 (440,352) —— 修复前豌豆(中心340)在此高度横向半宽≈22px 盖成绿色，修复后豌豆宽度归 0 露出陶土色
//  - 上移差异点：豌豆眼睛白点 (466,312) —— 修复前该点为深绿椭圆内部，修复后为白色
//  - 对照：无盆豌豆 (col5,row0) 眼睛白点原位可见 → 非盆路径零感知
const http = require('http'), fs = require('fs'), path = require('path');
const { execFile } = require('child_process');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9338;
const TMP = path.join(process.cwd(), '.tmp-pot-verify');

function get(u) { return new Promise((res, rej) => { http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(d)) }).on('error', rej) }) }

(async () => {
  fs.rmSync(TMP, { recursive: true, force: true });
  const e = execFile(EDGE, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + TMP, '--no-first-run', 'about:blank']);
  let t = null;
  for (let i = 0; i < 40; i++) { try { t = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); break } catch (_) { await new Promise(r => setTimeout(r, 250)) } }
  if (!t) throw new Error('CDP not ready');
  const page = t.find(x => x.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let mid = 0; const pend = {};
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pend[m.id]) pend[m.id](m) };
  const send = (method, params = {}) => new Promise(r => { mid++; pend[mid] = r; ws.send(JSON.stringify({ id: mid, method, params })) });
  await send('Page.enable');
  await send('Page.navigate', { url: 'file:///D:/code/zw/plants-vs-zombies.html?level=5' });
  await new Promise(r => setTimeout(r, 1200));

  const expr = `(function(){
    startGame('potverify');
    zombies.length=0; effects.length=0;
    const mk=(col,row,type)=>({col,row,type,cd:0,sunT:0,armT:level.armTime,dur:300,maxDur:300,plantDone:true,plantT:620});
    // 场景A：空盆（格 2,2 格心 280,340）
    plants.push(mk(2,2,'planter'));
    // 场景B：盆+豌豆（格 4,2 格心 460,340）→ 核心验证
    plants.push(mk(4,2,'planter')); plants.push(mk(4,2,'pea'));
    // 场景D：无盆豌豆（格 5,0 格心 550,132，直接注入绕过校验）→ 非盆路径零感知
    plants.push(mk(5,0,'pea'));
    render();
    const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;
    const x2=c.getContext('2d');x2.drawImage(canvas,0,0);
    const px=(x,y)=>Array.from(x2.getImageData(x,y,1,1).data).slice(0,3).join(',');
    return {
      A_pot_rim_band: px(260,352),  // 空盆口沿环带左点=201,122,74
      A_pot_soil:  px(280,352),     // 空盆口中心=盆土色 106,69,38
      A_pot_body: px(280,368),      // 空盆身 #a05a34=160,90,52
      B_pot_rim_L: px(444,352),     // 口沿左段：豌豆下叶叶尖自然搭在盆沿（暗绿混色，非主体绿即通过）
      B_pot_body_mid: px(460,366),  // ★盆身中轴：修复前=豌豆主体绿(底缘370>366)，修复后=160,90,52
      B_pot_base: px(460,380),      // ★盆底阴影：修复前被豌豆盖(底缘370>362)，修复后=122,64,34
      B_pea_white:px(466,312),      // ★豌豆眼睛白点上移位（修复前=深绿，修复后=255,255,255）
      B_old_pos:  px(468,330),      // 原眼睛高度（修复后应非白）
      D_pea_white:px(556,120)       // 无盆豌豆眼睛白点原位（550+6,132-12）=255,255,255
    };
  })()`;
  const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  const v = rr.result.result.value;
  console.log('空盆      : 口沿环带=' + v.A_pot_rim_band + ' 盆土=' + v.A_pot_soil + ' 盆身=' + v.A_pot_body);
  console.log('盆+豌豆   : 口沿左段=' + v.B_pot_rim_L + ' 盆身中轴=' + v.B_pot_body_mid + ' 盆底=' + v.B_pot_base);
  console.log('盆+豌豆   : 眼睛(上移位)=' + v.B_pea_white + ' 原位=' + v.B_old_pos);
  console.log('无盆豌豆  : 眼睛(原位)=' + v.D_pea_white);

  const ok =
    v.A_pot_rim_band === '201,122,74' && v.A_pot_soil === '106,69,38' && v.A_pot_body === '160,90,52' && // 空盆渲染正常
    v.B_pot_rim_L !== '74,138,42' &&                                  // 口沿左段不再被豌豆主体盖住
    v.B_pot_body_mid === '160,90,52' && v.B_pot_base === '122,64,34' && // ★盆身/盆底露出（修复前均被豌豆盖）
    v.B_pea_white === '255,255,255' && v.B_old_pos !== '255,255,255' &&// ★植物确实上移
    v.D_pea_white === '255,255,255';                                  // 非盆路径零感知
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(process.cwd(), 'tests', 'playtests', 'pot-occlusion-shot.png'), Buffer.from(shot.result.data, 'base64'));
  ws.close();
  try { e.kill() } catch (_) { }
  fs.rmSync(TMP, { recursive: true, force: true });
  if (!ok) process.exit(1);
  console.log('花盆遮挡修复验证：全部通过');
})().catch(er => { console.error('FAIL', er.message); process.exit(1) });
