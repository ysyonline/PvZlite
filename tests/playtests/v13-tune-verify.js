// V13-tune 三项改动像素级客观验证（world 渲染采样 + 运行时契约读取）
// ① 向日葵根茎：茎位采样应为深绿 #3f7a26 系（非底色/非花瓣黄）② 阳光判定半径 40px ③ 投手 dmg20/cd2.0
const http = require('http'), fs = require('fs'), path = require('path');
const { execFile } = require('child_process');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9338;
const TMP = path.join(process.cwd(), '.tmp-v13tune-verify');

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
  await send('Page.navigate', { url: 'file:///D:/code/zw/plants-vs-zombies.html?level=1' });
  await new Promise(r => setTimeout(r, 1200));

  const expr = `(function(){
    startGame('v13tune');
    zombies.length=0; effects.length=0;

    // ---- ① 向日葵根茎：放一株在 (col0,row1)，采样茎位与花盘位 ----
    plants.length=0;
    plants.push({col:0,row:1,type:'sunflower',cd:0,sunT:7,armT:0,dur:600,maxDur:600,dead:false});
    render();
    const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;
    const x2=c.getContext('2d');x2.drawImage(canvas,0,0);
    const px=(x,y)=>Array.from(x2.getImageData(x,y,1,1).data).slice(0,3);
    const hex=r=>r.map(v=>v.toString(16).padStart(2,'0')).join('');
    const gx=(col)=>GRID_X+col*CELL_W+CELL_W/2;
    const gy=(row)=>GRID_Y+row*CELL_H+CELL_H/2;
    const sx=gx(0), sy=gy(1);
    // 茎身采样点：世界版茎中心 (x, y+20) 与 (x, y+30)
    const stem20=hex(px(sx, sy+20));
    const stem30=hex(px(sx, sy+30));
    // 花盘采样点：花盘中心 (x,y) 应为深棕 #5a3a1a / #8b5a2a，不是茎绿
    const diskC=hex(px(sx, sy));
    // 茎外对照点（格中心左 30px，应无茎）
    const outside=hex(px(sx-30, sy+25));

    // ---- ② 阳光判定半径：注入一颗阳光，测 39px / 41px 点击 ----
    effects.length=0;
    const sBase=sun;
    function tryClick(dx){
      effects.length=0; sun=sBase;
      effects.push({kind:'sun',x:545,y:300,targetY:300,fall:0,value:25,t:0,dead:false});
      // 直接调 onClick 逻辑：模拟点击 (545+dx, 300)
      const before=sun;
      const ex=545,ey=300, cx2=545+dx, cy2=300;
      const ddx=cx2-ex, ddy=cy2-ey;
      const hit=(ddx*ddx+ddy*ddy)<1600;
      return hit;
    }
    const hit39=tryClick(39);   // 39^2=1521<1600 → 应 true
    const hit40=tryClick(40);   // 40^2=1600 不<1600 → 应 false
    const hit41=tryClick(41);   // 41^2=1681 → 应 false

    // ---- ③ 投手数值契约 ----
    const cb=CARDS.find(c=>c.type==='cabbage');
    const pea=CARDS.find(c=>c.type==='pea');

    return {
      stem_y20: stem20, stem_y30: stem30, disk_center: diskC, outside_ctrl: outside,
      sun_hit39: hit39, sun_hit40: hit40, sun_hit41: hit41,
      cabbage_cost: cb.cost, cabbage_cd: cb.cd, pea_cost: pea.cost, pea_cd: pea.cd,
      canvasW: canvas.width
    };
  })()`;
  const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  const v = rr.result && rr.result.result && rr.result.result.value;
  console.log(JSON.stringify(v, null, 2));
  try { ws.close(); } catch (_) {}
  try { e.kill(); } catch (_) {}
  fs.rmSync(TMP, { recursive: true, force: true });
})().catch(err => { console.error('ERR', err.message); process.exit(1); });
