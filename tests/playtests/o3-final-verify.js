// O3 终验：水面遮挡三态验证（水面区裁切 / 路面段不裁 / 陆行对照）
const http = require('http'), fs = require('fs'), path = require('path');
const { execFile } = require('child_process');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9337;
const TMP = path.join(process.cwd(), '.tmp-o3-final');

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
  await send('Page.navigate', { url: 'file:///D:/code/zw/plants-vs-zombies.html?level=4' });
  await new Promise(r => setTimeout(r, 1200));

  const expr = `(function(){
    startGame('o3final');
    zombies.length=0;
    // A 水面区水行僵尸（应裁切）：x=445，row=1 水行，zy=236 腿区 y=258
    zombies.push({type:'normal',row:1,x:445,hp:180,maxHp:180,spd:0,eating:false,eatAnim:0,walk:0,dead:false});
    // B 路面段水行僵尸（不应裁切）：x=920（>GRID_X+COLS*CELL_W=865），row=3 水行，zy=444 腿区 y=466
    zombies.push({type:'normal',row:3,x:920,hp:180,maxHp:180,spd:0,eating:false,eatAnim:0,walk:0,dead:false});
    // C 陆行对照（不应裁切）：x=445, row=0, zy=132 腿区 y=154
    zombies.push({type:'normal',row:0,x:445,hp:180,maxHp:180,spd:0,eating:false,eatAnim:0,walk:0,dead:false});
    render();
    const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;
    const x2=c.getContext('2d');x2.drawImage(canvas,0,0);
    const px=(x,y)=>Array.from(x2.getImageData(x,y,1,1).data).slice(0,3).join(',');
    return {
      A_waterZone_body: px(445,240), A_waterZone_leg: px(445,258),
      B_road_body: px(920,448), B_road_leg: px(920,466),
      C_land_body: px(445,136), C_land_leg: px(445,154)
    };
  })()`;
  const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  const v = rr.result.result.value;
  const body = '90,106,74', water = '68,136,184';
  const aClip = v.A_waterZone_leg === v.A_waterZone_body.replace('90,106,74', '90,106,74') && v.A_waterZone_leg.startsWith('6') && v.A_waterZone_leg !== body;
  const bKeep = v.B_road_leg === body;
  const cKeep = v.C_land_leg === body;
  console.log('A 水面区水行: 身体=' + v.A_waterZone_body + ' 腿区=' + v.A_waterZone_leg + ' → ' + (v.A_waterZone_leg !== body ? '✅ 被水面遮住' : '❌ 腿仍可见'));
  console.log('B 路面段水行: 身体=' + v.B_road_body + ' 腿区=' + v.B_road_leg + ' → ' + (v.B_road_leg === body ? '✅ 路面完整不裁' : '❌ 误裁'));
  console.log('C 陆行对照  : 身体=' + v.C_land_body + ' 腿区=' + v.C_land_leg + ' → ' + (v.C_land_leg === body ? '✅ 完整' : '❌ 异常'));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(process.cwd(), 'tests', 'playtests', 'o3-zombie-shot.png'), Buffer.from(shot.result.data, 'base64'));
  ws.close();
  try { e.kill() } catch (_) { }
  fs.rmSync(TMP, { recursive: true, force: true });
  if (!(v.A_waterZone_leg !== body && bKeep && cKeep)) process.exit(1);
  console.log('O3 三态验证全部通过');
})().catch(er => { console.error('FAIL', er.message); process.exit(1) });
