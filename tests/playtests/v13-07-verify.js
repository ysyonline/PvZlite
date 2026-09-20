// V13-07 落地感验证：pea/melon/cabbage 茎位采样（y+30 应为茎绿，y+34 泥痕区，茎外对照草地）
const http = require('http'), fs = require('fs'), path = require('path');
const { execFile } = require('child_process');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9339;
const TMP = path.join(process.cwd(), '.tmp-v13-07-verify');

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
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pend[mid]) {} if (m.id && pend[m.id]) pend[m.id](m) };
  const send = (method, params = {}) => new Promise(r => { mid++; pend[mid] = r; ws.send(JSON.stringify({ id: mid, method, params })) });
  await send('Page.enable');
  await send('Page.navigate', { url: 'file:///D:/code/zw/plants-vs-zombies.html?level=1' });
  await new Promise(r => setTimeout(r, 1200));

  const expr = `(function(){
    startGame('v1307');
    zombies.length=0; effects.length=0; plants.length=0;
    const types=['pea','melon','cabbage'];
    types.forEach((tp,i)=>plants.push({col:i,row:1,type:tp,cd:0,sunT:7,armT:0,dur:750,maxDur:750,dead:false}));
    render();
    const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;
    const x2=c.getContext('2d');x2.drawImage(canvas,0,0);
    const px=(x,y)=>Array.from(x2.getImageData(x,y,1,1).data).slice(0,3);
    const hex=r=>'#'+r.map(v=>v.toString(16).padStart(2,'0')).join('');
    const gx=col=>GRID_X+col*CELL_W+CELL_W/2, gy=row=>GRID_Y+row*CELL_H+CELL_H/2;
    const out={};
    // pea: col0 → 茎中心 y+30 / y+34；对照茎外 (x+20, y+34) 应无茎绿
    out.pea_y30 = hex(px(gx(0), gy(1)+30));
    out.pea_y34 = hex(px(gx(0), gy(1)+34));
    out.pea_out = hex(px(gx(0)+20, gy(1)+34));
    // melon: col1 → 藤中心 y+32；对照 (x+20,y+34)
    out.melon_y32 = hex(px(gx(1), gy(1)+32));
    out.melon_y34 = hex(px(gx(1), gy(1)+34));
    out.melon_out = hex(px(gx(1)+20, gy(1)+34));
    // cabbage: col2 → 茎中心 y+30 / y+34；对照 (x+20,y+34)
    out.cab_y30 = hex(px(gx(2), gy(1)+30));
    out.cab_y34 = hex(px(gx(2), gy(1)+34));
    out.cab_out = hex(px(gx(2)+20, gy(1)+34));
    // 底色参考：空格草地 (col3,row1)
    plants[2].dead=true; plants[1].dead=true; plants[0].dead=true; plants.length=0;
    out.grass_ref = (plants.length===0)?'cleared':'not';
    return out;
  })()`;
  const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  const v = rr.result && rr.result.result && rr.result.result.value;
  // 再采一次纯草地参照
  const expr2 = `(function(){ render();
    const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;
    const x2=c.getContext('2d');x2.drawImage(canvas,0,0);
    const px=(x,y)=>Array.from(x2.getImageData(x,y,1,1).data).slice(0,3);
    const hex=r=>'#'+r.map(v=>v.toString(16).padStart(2,'0')).join('');
    return hex(px(GRID_X+3*CELL_W+CELL_W/2, GRID_Y+1*CELL_H+CELL_H/2+34));
  })()`;
  const rr2 = await send('Runtime.evaluate', { expression: expr2, returnByValue: true });
  v.grass_ref = rr2.result.result.value;
  console.log(JSON.stringify(v, null, 2));
  try { ws.close(); } catch (_) {}
  try { e.kill(); } catch (_) {}
  fs.rmSync(TMP, { recursive: true, force: true });
})().catch(err => { console.error('ERR', err.message); process.exit(1); });
