// 屋顶接缝透绿修复验证（用户反馈 2026-09-20「接壤处没填充相应区域的颜色，给人感觉歪了」）
// 修复 = 棋盘格前先整块铺「屋面剪影底衬」#7a6a50（屋脊轮廓→y=600），格缝/坡台交界/坡底交界
// 经抗锯齿拼合露出的都是砖瓦棕而非画布 CSS 绿底 #7fbf4a。
// 像素断言（L5 屋顶，startGame 后空场）：
//  - 接缝采样带：坡台交界 x=505 两侧各 1px（y 取坡上行带中部）与坡底 y=600 檐板交界——
//    修复前这些点可能采到绿底（124,191,74 附近），修复后必须是砖瓦系（R>G 且偏棕）。
//  - 对照点：格心处棋盘两色正常（#8a7a5a / #6e5f45）。
const http = require('http'), fs = require('fs'), path = require('path');
const { execFile } = require('child_process');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9339;
const TMP = path.join(process.cwd(), '.tmp-roofseam-verify');

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
  await send('Page.navigate', { url: 'file:///' + process.cwd().replace(/\\/g, '/') + '/plants-vs-zombies.html?level=5' });
  await new Promise(r => setTimeout(r, 1200));

  const expr = `(function(){
    startGame('roofseam');
    zombies.length=0; effects.length=0; projectiles.length=0;
    render();
    const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;
    const x2=c.getContext('2d');x2.drawImage(canvas,0,0);
    const px=(x,y)=>Array.from(x2.getImageData(x,y,1,1).data).slice(0,3).join(',');
    // 绿底指纹：G 明显高于 R（#7fbf4a = 127,191,74）
    const isGreen = s => { const [r,g,b]=s.split(',').map(Number); return g>r+30 && g>b+60; };
    // 沿坡台交界 x=505 竖扫 5 点（row1/2/3 行带中部）+ 坡内竖缝 x=415/425 + 坡底交界 y=598~602
    const seams = {
      col45_r1: px(505,150), col45_r2: px(505,254), col45_r3: px(505,358),
      slope_mid_r1: px(415,150), slope_mid_r2: px(425,254),
      base_L: px(300,599), base_M: px(500,601), base_R: px(700,600)
    };
    const greenHits = Object.entries(seams).filter(([k,v])=>isGreen(v)).map(([k,v])=>k+'='+v);
    return {
      seams,
      greenHits,
      cellA: px(100,132),   // col0,row0 格心（棋盘色1 #8a7a5a 系）
      cellB: px(190,132)    // col1,row0 格心（棋盘色2 #6e5f45 系）
    };
  })()`;
  const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  const v = rr.result.result.value;
  console.log('坡台交界 x=505 : r1=' + v.seams.col45_r1 + ' r2=' + v.seams.col45_r2 + ' r3=' + v.seams.col45_r3);
  console.log('坡内竖缝       : r1=' + v.seams.slope_mid_r1 + ' r2=' + v.seams.slope_mid_r2);
  console.log('坡底交界 y≈600 : L=' + v.seams.base_L + ' M=' + v.seams.base_M + ' R=' + v.seams.base_R);
  console.log('格心对照       : A=' + v.cellA + ' B=' + v.cellB);
  console.log('绿底命中       : ' + (v.greenHits.length ? v.greenHits.join(' | ') : '无'));

  const [ar, ag] = v.cellA.split(',').map(Number);
  const [br, bg] = v.cellB.split(',').map(Number);
  const ok =
    v.greenHits.length === 0 &&          // ★所有接缝点零绿底
    ag > ar && ar > 90 &&                // 格心A=暖棕（R 高）
    bg < br && br > 80;                  // 格心B=深棕
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(process.cwd(), 'tests', 'playtests', 'roof-seam-shot.png'), Buffer.from(shot.result.data, 'base64'));
  ws.close();
  try { e.kill() } catch (_) { }
  // CrashpadMetrics-active.pma 可能被 Edge 残余进程短暂占用（EPERM）——延迟重试一次，仍失败不影响验证结论
  try { fs.rmSync(TMP, { recursive: true, force: true }) } catch (_) { setTimeout(() => { try { fs.rmSync(TMP, { recursive: true, force: true }) } catch (_) { } }, 1500) }
  if (!ok) process.exit(1);
  console.log('屋顶接缝透绿修复验证：全部通过');
})().catch(er => { console.error('FAIL', er.message); process.exit(1) });
