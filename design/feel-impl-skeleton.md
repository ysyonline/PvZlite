# PvZ Lite · P0 手感七项实施骨架

- 作者：林绘澄（art-director · Phase 6.5 T3）
- 状态：v1 · 2026-09-15
- 目标工程：`plants-vs-zombies.html`（单文件 Canvas 2D）
- 定位：**工程可直接贴进游戏的代码骨架**（插入位置 + 函数签名 + 关键代码片段 + 音效对齐点 + 测试对齐点）
- 交接对象：程基岩（Step 3 实施）· 路远行（验收断言）· 阮和鸣（音效对齐）

## 0. 使用说明（务必先读）

1. **行号已漂移**：本骨架基于 T1 音频总线重构后的工程现状。T1 已落地 `initAudioBus` / `routeBus` / `AudioBus`，导致全局行号整体下移。**所有"插入位置"以函数名为准，行号仅为当前参考**。实施时先 Grep 函数名定位，再按片段贴入。
2. **实施顺序固定**：F-04 屏幕震动是**所有后续手感的前置基础设施**，必须最先落地。顺序 = 本文档 §1→§7。
3. **三条硬约束（§G 验收清单）**：
   - 所有新增绘制调用必须 `ctx.save()` / `ctx.restore()` 包裹（防 alpha 泄漏）。
   - 粒子单帧上限 500：`effects.length > 500` 时不再生成新零件/粒子（与 audio 节流对齐）。
   - 屏幕震动单次幅度 ≤ 6px（失败进屋特例 8px，仅一次性）。
4. **不要改玩法逻辑**，只增绘制/状态字段。`plants`/`effects` 新增字段均为可增量注入。
5. **D-14（§7）已随 T1 落地**（`drawStatus` L1270 已改 `Consolas,monospace`），本文档只列**验收断言**，不重复实现。

## 参考行号速查（T1 后，以函数名为准）

| 函数 | 参考行 | 备注 |
|---|---|---|
| `onClick` | L345 | `plants.push` 在 L401 |
| `update` | L569 | effects 循环处 |
| `explodeMine` | L641 | `SFX.boom()` 在 L641 内 |
| `killZombie` | L730 | `z.dead=true` 后插入 |
| `checkWave` | L744 | `warn.active=true` 在 L744 内 |
| `render` | L786 | 开头包裹震动 |
| `drawWaveWarn` | L799 | 加 vignette + 最后1秒 |
| `drawPlant` | L927 | 开头加种植时间轴 |
| `drawBoom` | L1148 | 改 3 色段火球 |
| `drawStatus` | L1264 | D-14 已落地 L1270 |
| `routeBus` | L230 | T1 新增，音效路由 |

---

## §1 F-04 屏幕震动（B.4）· 前置基础设施 · 最先实施

**为什么放最前**：F-01/F-02/F-03/F-06 的戏剧反馈都依赖"屏幕震一下"，`triggerShake` 是共享入口。先落它，后面各项只需在触发点加一行调用。

### 插入位置

新增模块级状态 + 两个函数，放在 `render()`（参考 L786）**上方**：
```js
// ============ 屏幕震动（F-04 · B.4） ============
let screenShake = { t: 0, dur: 0, intensity: 0, seed: 0 };
let flashT = 0, flashColor = '#fff';   // 闪光层，F-03/F-06 共用

function triggerShake(intensity, duration_ms){
  // §G 约束：单次幅度 ≤ 6px（失败进屋特例允许 8px，见下注）
  screenShake.t = duration_ms / 1000;
  screenShake.dur = duration_ms / 1000;
  screenShake.intensity = Math.min(intensity, 6);   // clamp 到 6
  screenShake.seed = Math.random() * 1000;
}

function triggerFlash(color, duration_s){
  flashColor = color; flashT = duration_s;
}

function getShakeOffset(){
  if (screenShake.t <= 0) return { x: 0, y: 0 };
  const k = 1 - screenShake.t / screenShake.dur;      // 0→1
  const decay = (1 - k) * (1 - k);                     // 二次衰减
  const t = performance.now() / 1000 + screenShake.seed;
  return {
    x: Math.sin(t * 55) * screenShake.intensity * decay,
    y: Math.cos(t * 47) * screenShake.intensity * decay * 0.7,
  };
}
```
> 失败进屋 8px 特例：`triggerShake` 内临时放行 `intensity===8 && 仅一次`，或用独立常量 `triggerLoseShake()`。工程侧二选一即可，骨架默认 clamp 6。

### 在 render() 开头应用（改 render，参考 L786）

原 `render()` 首行是 `ctx.clearRect(...)`。改为：
```js
function render(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const off = getShakeOffset();
  if (screenShake.t > 0) screenShake.t -= 1/60;   // 或用 update 里递减（推荐放 update）
  ctx.save();
  ctx.translate(off.x, off.y);
  if(state==='menu'){drawMenu();ctx.restore();return}
  drawGameWorld();
  if(state==='end'){drawEnd();ctx.restore();return}
  drawCardBar();
  drawStatus();
  if(warn.active)drawWaveWarn();
  if(paused)drawPause();
  ctx.restore();   // 世界层结束
  // 闪光层（restore 之后画，不随震动偏移）
  if (flashT > 0){
    flashT -= 1/60;
    ctx.save();
    ctx.globalAlpha = 0.4 * Math.max(0, flashT / 0.08);
    ctx.fillStyle = flashColor;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.restore();
  }
}
```
> 更稳妥：把 `screenShake.t -= dt` 与 `flashT -= dt` 放进 `update(dt)`（L569），避免帧率耦合。`render` 只读 `getShakeOffset()`。

### 4 个触发点（对应 art-handoff B.4 表）

| 场景 | 触发点（函数为准） | 调用 |
|---|---|---|
| 爆炸 | `explodeMine`（L641） | `triggerShake(6,300); triggerFlash('#fff',0.08);` |
| 大波预警启动 | `checkWave` `warn.active=true`（L744 内） | `triggerShake(3,500); triggerFlash('rgba(255,30,30,0.35)',0.3);` |
| 大波预警结束刷怪 | `checkWave` `warn.t<=0` 分支（L744 内） | `triggerShake(5,400); triggerFlash('rgba(255,30,30,0.2)',0.15);` |
| 进屋失败 | `updateZombies` `z.x<GRID_X-40`（L698 内） | `triggerShake(8,400);` |
| 通关 | `checkWave` `setState('end','通关')`（L744 内） | `triggerShake(2,600);` |

### 音效对齐点（audio-guide §E）
- 爆炸：`SFX.boom`（battle 分组，L641 内已调）与 `triggerShake(6,300)` **同一行相邻**，保证视听同步。
- 大波预警：`SFX.siren` / `SFX.sirenLoop`（event 分组）与 `triggerShake(3,500)` 相邻；预警结束 `SFX.bigWaveImpact` 与 `triggerShake(5,400)` 相邻。
- 进屋失败：`SFX.lose` / `SFX.lose.climax`（event）与 `triggerShake(8,400)` 相邻。
- 通关：`SFX.win`（event）与 `triggerShake(2,600)` 相邻。

### 测试对齐点（regression-plan）
- 属渲染层，无对应 REG-* 数值断言。验收走 SMOKE 通用冒烟 + 手动 Playtest。
- 可加烟雾项：`triggerShake` 后 `getShakeOffset()` 返回有限 x/y 且 ≤ 6px；`flashT` 自然归零。

### 独立可测接口
- `triggerShake(amp, dur)` / `getShakeOffset()` / `triggerFlash(color, dur)` 三个纯函数，单测可直接调用、断言偏移与衰减。

---

## §2 F-01 种植动画（B.1）

**触发点**：`onClick`（L345）内 `plants.push(...)`（L401）之后立即注入动画字段。

### 数据结构注入（改 L401 的 push 对象）
```js
plants.push({
  col:g.x, row:g.y, type:c.type,
  cd:0, sunT:c.type==='sunflower'?7:0, armT:level.armTime,
  dur:c.dur, maxDur:c.dur,
  // F-01 新增：
  plantT:0,                          // 0→620 累积
  plantFrom:{ x: CARD_X0+selected.i*CARD_W, y: CARD_Y+CARD_H/2 },  // 卡片槽中心
  plantDone:false,
});
```
> `selected.i` 此刻还未置 null（push 在 `selected=null` 之前），可安全取卡片槽坐标。

### drawPlant 开头加 620ms 时间轴（改 L927 `drawPlant(p)` 首行）
```js
function drawPlant(p){
  if (p.plantT === undefined){ p.plantT=0; p.plantDone=true; }   // 旧存档/旧对象兜底
  if (!p.plantDone && p.plantT < 620){
    p.plantT += dtRef;                       // 需传 dt；见下注
    const t = Math.min(1, p.plantT / 620);
    const pos = gridToPos(p.col, p.row);
    let x=pos.x, y=pos.y, s=1;
    if (t < 0.35){                              // A · 飞向格子
      const k = easeInOut(t / 0.35);
      x = p.plantFrom.x + (pos.x - p.plantFrom.x)*k;
      y = p.plantFrom.y + (pos.y - p.plantFrom.y)*k - Math.sin(k*Math.PI)*80;
      s = 0.6 + 0.4*k;
    } else if (t < 0.78){                        // C · 缩放过冲
      s = 1.0 + Math.sin((t-0.35)/0.43*Math.PI*2)*0.15*(1-(t-0.35)/0.43);
      y = pos.y - Math.max(0,(0.55-t)/0.2*8);
    } else if (t < 1){                            // E · 落定微抖
      s = 1.0;
      y = pos.y + Math.sin(t*20)*2*(1-t);
    }
    ctx.save();
    ctx.translate(x,y); ctx.scale(s,s); ctx.translate(-x,-y);
    drawPlantInner(p, x, y);      // 原绘制主体拆成 inner（传入 x,y 以支持缩放平移）
    ctx.restore();
    if (p.plantT >= 620) p.plantDone = true;
    return;
  }
  // 落地尘土（一次性，A→B 交界处 220-280ms 喷 6-10 粒 #8b6528）
  if (p.plantT >= 220 && !p.dirtDone && p.plantT < 280){
    p.dirtDone = true;
    if (effects.length < 500){
      const pos = gridToPos(p.col,p.row);
      for(let i=0;i<8;i++) effects.push({kind:'particle',x:pos.x,y:pos.y+18,
        vx:R(-30,30),vy:R(-80,-40),life:R(0.3,0.5),color:'#8b6528',size:R(2,4),dead:false});
    }
  }
  drawPlantInner(p, gridToPos(p.col,p.row).x, gridToPos(p.col,p.row).y);
}
```
> 注：`drawPlantInner` 即把现有 `drawPlant` 主体（阴影/各类型绘制）原样搬入，改为 `(p, x, y)` 签名，内部用传入的 `x,y` 替代原来局部 `gridToPos`。`dtRef` 由 `update` 调用时传入（把 `drawPlant(p)` 在 render 循环处改为 `drawPlant(p, dt)` 或直接读全局 `lastDt`）。
> **§G 约束**：整段包在 `ctx.save()/ctx.restore()`；尘土生成前先 `effects.length<500` 守卫。

### 音效对齐点（audio-guide §E）
- 种植成功：`SFX.plant`（ui 分组，L402）保持不变。
- 落地"噗"：`SFX.plant.settle`（B1 · P0）—— audio 侧在 `SFX.plant` 内叠 `noise(0.06,{vol:0.09,lp:600,hp:100,delay:0.05})`。**无需美术代码改动**，对齐点仅记录：尘土粒子喷出的 220ms 时刻 ≈ settle 音效 delay 0.05s 之后的听感，工程无需额外同步。

### 测试对齐点（regression-plan）
- 种植成功路径：REG-CARD-01（6 种植物全可种，plants+1）、REG-CARD-04（铲除后减少）。
- 不影响数值回归（plantT 是纯视觉字段）。验收断言：`plants[0].plantT` 随 tick 递增到 620 后 `plantDone===true`。

---

## §3 F-02 僵尸死亡掉零件（B.2）

**触发点**：`killZombie(z)`（L730）内 `z.dead=true` 之后立即 `spawnCorpseParts(z)`。

### 新增函数（放在 killZombie 上方）
```js
function spawnCorpseParts(z){
  if (effects.length > 500) return;              // §G 粒子上限保护
  const y = GRID_Y + z.row*CELL_H + CELL_H/2;
  const skin = z.type==='bucket' ? '#4a5a5a' : '#5a6a4a';
  const parts = [
    {shape:'head',   off:[0,-18],  size:[18],        color:'#c5d0a0', w:R(-3,3)},
    {shape:'body-l', off:[-8,10],  size:[12,20],     color:skin,     w:R(-2,2)},
    {shape:'body-r', off:[8,10],   size:[12,20],     color:skin,     w:R(-2,2)},
    {shape:'legs',   off:[0,25],   size:[20,14],     color:'#3a2a1a', w:R(-1.5,1.5)},
    {shape:'arm',    off:[-16,12], size:[8,18],      color:'#c5d0a0', w:R(-3,3)},
  ];
  if (z.type==='cone')   parts.push({shape:'cone',   off:[0,-30], size:[28,22],  color:'#d97b2a', w:R(-2.5,2.5)});
  if (z.type==='bucket') parts.push({shape:'bucket', off:[0,-40], size:[32,12],  color:'#b0b0b0', w:R(-2,2)});
  for (const p of parts){
    if (effects.length > 500) break;             // 双保险
    effects.push({
      kind:'corpse-part',
      x:z.x + p.off[0], y: y + p.off[1],
      vx:R(-120,120), vy:R(-260,-140),
      rot:0, omega:p.w,
      life:R(0.9,1.4), maxLife:R(0.9,1.4),
      shape:p.shape, color:p.color, size:p.size,
      dead:false,
    });
  }
}
```
在 `killZombie` 内 `spawnBurst(z.x,y,'#c94',18);`（血雾层，**保留**）后追加：
```js
spawnCorpseParts(z);   // 死亡 = 血雾 + 6 块零件 + death 音效
```

### update effects 循环加 corpse-part 分支（改 L569 `update`）
```js
else if (e.kind === 'corpse-part'){
  e.vy += 900 * dt;             // 比阳光粒子重，体现"尸体"厚重感
  e.x  += e.vx * dt;
  e.y  += e.vy * dt;
  e.rot += e.omega * dt;
  e.life -= dt;
  if (e.life <= 0) e.dead = true;
}
```

### 绘制函数（新增）
```js
function drawCorpsePart(e){
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.rot);
  ctx.globalAlpha = Math.max(0, Math.min(1, e.life / 0.3));   // 末 300ms 淡出
  ctx.fillStyle = e.color;
  if (e.shape === 'head'){
    ctx.beginPath(); ctx.arc(0,0,e.size[0],0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-5,-2,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(5,-2,2,0,Math.PI*2); ctx.fill();
  } else {
    ctx.fillRect(-e.size[0]/2, -e.size[1]/2, e.size[0], e.size[1]);
  }
  ctx.restore();
}
```
在 `drawGameWorld` / render 的 effects 绘制循环里，对 `e.kind==='corpse-part'` 调 `drawCorpsePart(e)`（放在 particle/boom 同层，按 z 轴顺序：零件在僵尸层）。

### 音效对齐点（audio-guide §E）
- 普通死亡：`SFX.death`（battle，L738 已调）与 `spawnCorpseParts(z)` **同一函数内相邻**。
- 分层死亡（B4 · P1）：按 `z.type` 分派——cone 加 `SFX.death.cone`（纸板中频叠层）、bucket 加 `SFX.death.bucket`（金属叮当）。工程在 `killZombie` 内 `if(z.type==='cone')SFX.death.cone(); else if(z.type==='bucket')SFX.death.bucket();`。**待总线核验**：这些子音效需走 `routeBus(...,'battle')`（见 §6 标注）。

### 测试对齐点（regression-plan）
- **REG-ZOM-03**：僵尸死亡只结算一次分数——断言 `z.dead` 幂等（重复 `killZombie` 不二次加分、不二次 `spawnCorpseParts`）。
- 可加：`zombies` 内一只 `hp<=0` 触发后，`effects` 中 `corpse-part` 数量 ≤ 7 且 `effects.length ≤ 500`。

---

## §4 F-03 爆炸冲击波（B.3）

**触发点**：`explodeMine(p,pos)`（L641，当前唯一爆炸来源；未来樱桃炸弹复用）。

### 触发点改造（改 L641 `explodeMine` 末尾）
原末尾（L608-611 参考区）：
```js
effects.push({kind:'boom',x:pos.x,y:pos.y,life:0.35,dead:false});
spawnBurst(pos.x,pos.y,'#ffb830',26);
spawnBurst(pos.x,pos.y,'#ff6a00',18);
SFX.boom();
```
改为：
```js
// 层 2 · 冲击波环
if (effects.length < 500)
  effects.push({kind:'shockwave',x:pos.x,y:pos.y,life:0.38,maxLife:0.38,rStart:8,rEnd:180,dead:false});
// 层 3 · 火球（现有 boom，扩为 450ms 三色段）
effects.push({kind:'boom',x:pos.x,y:pos.y,life:0.45,dead:false});
// 层 4 · 粒子（改 24+20+8，初速更猛）
if (effects.length < 500){
  spawnBurst(pos.x,pos.y,'#ffb830',24);
  spawnBurst(pos.x,pos.y,'#ff6a00',20);
  for(let i=0;i<8;i++) effects.push({kind:'particle',x:pos.x,y:pos.y,vx:R(-180,180),vy:R(-260,-60),life:R(0.6,0.9),color:'#fff8a0',size:R(2,4),dead:false});
}
// 层 1 · 闪光 + 层 5 · 屏幕震动（与 SFX.boom 同行，视听同步）
triggerFlash('#fff', 0.08);
triggerShake(6, 300);
SFX.boom();
```

### update effects 循环加 shockwave 分支（改 L569 `update`）
```js
else if (e.kind === 'shockwave'){ e.life -= dt; if (e.life <= 0) e.dead = true; }
else if (e.kind === 'boom'){      e.life -= dt; if (e.life <= 0) e.dead = true; }
```

### 新增 drawShockwave
```js
function drawShockwave(e){
  const k = 1 - e.life / e.maxLife;                 // 0→1
  const r = e.rStart + (e.rEnd - e.rStart) * easeOutCubic(k);
  const alpha = 0.9 * (1 - k);
  ctx.save();
  ctx.strokeStyle = `rgba(255,220,180,${alpha})`;
  ctx.lineWidth = 3 * (1 - k * 0.5);                // 3px → 1.5px
  ctx.beginPath();
  ctx.arc(e.x, e.y, r, 0, Math.PI*2);
  ctx.stroke();
  ctx.restore();
}
```

### 改造 drawBoom（改 L1148，扩为 450ms 三色段）
```js
function drawBoom(e){
  const k = Math.max(0, e.life / 0.45);
  const tn = 1 - k;
  const r = tn < 0.3 ? 40*easeOutCubic(tn/0.3) : 40*(1 - 0.35*(tn-0.3));
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 2);
  const g = ctx.createRadialGradient(e.x, e.y, 4, e.x, e.y, r);
  g.addColorStop(0,   '#fffde0');
  g.addColorStop(0.3, '#ffb830');
  g.addColorStop(0.7, '#ff6a00');
  g.addColorStop(1,   'rgba(255,80,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
```

### 时间轴（art-handoff B.3）
```
Flash(80ms) · ShockRing(380ms) · Fireball(450ms) · Particles(600-900ms) · Shake(300ms)
```

### 音效对齐点（audio-guide §E）
- **核心对齐**：`SFX.boom`（battle 分组）与 `triggerShake(6,300)` **同一行**（art-handoff §F 明确要求"爆炸 = SFX.boom() + triggerShake(6,300) 在同一行"）。
- 闪光层 80ms 白闪与 boom 主音（95→32Hz 低频下沉）同步起始。

### 测试对齐点（regression-plan）
- **REG-MINE-02**：武装后引爆 + 邻近行 0.9 格内伤害——断言触发 boom 且相邻格僵尸 hp 减少。
- 可加：`explodeMine` 后 `effects` 中 `shockwave` 数量 === 1，`effects.length ≤ 500`。

---

## §5 F-06 大波预警增强（B.6）

**触发点**：`checkWave`（L744）内 `warn.active=true`（预警启动）与 `warn.t<=0`（预警结束刷怪）两处。

### 触发点（改 L744 `checkWave`）
```js
// 预警启动分支（原 nextCfg.big && warn.last!==next）
warn.last=next; warn.active=true; warn.t=4;
SFX.siren();
triggerShake(3, 500);
triggerFlash('rgba(255,30,30,0.35)', 0.3);
```
```js
// 预警结束刷怪分支（原 warn.t<=0）
warn.active=false; lastWaveT=gt; wave++;
newWave(wave);
SFX.bigWaveImpact();      // 收束冲击音（audio B7 · P1）
triggerShake(5, 400);
triggerFlash('rgba(255,30,30,0.2)', 0.15);
```

### drawWaveWarn 增强（改 L799）
```js
function drawWaveWarn(){
  const remaining = Math.max(0, warn.t);
  const inFinal1 = remaining < 1.0;                    // 最后 1 秒视觉增强区
  const pulseSpeed = inFinal1 ? 22 : 11;                // 脉冲频率加倍
  const pulse = 0.5 + 0.5 * Math.sin(gt * pulseSpeed);
  // ...（现有全屏压暗/横幅/标题/副标题/倒计时进度条 保留）...
  // 最后 1 秒：边缘渐红 vignette
  if (inFinal1){
    ctx.save();
    const v = ctx.createRadialGradient(canvas.width/2,canvas.height/2,300,
                                       canvas.width/2,canvas.height/2,700);
    v.addColorStop(0,'rgba(0,0,0,0)');
    v.addColorStop(1,`rgba(120,0,0,${0.4+0.2*pulse})`);
    ctx.fillStyle = v;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.restore();
  }
  // 最后 1 秒：倒计时数字放大 + 等宽（D-14 同源）
  if (inFinal1){
    ctx.save();
    ctx.font = 'bold 32px Consolas, monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle = `rgb(255,${Math.round(100+50*pulse)},${Math.round(100+50*pulse)})`;
    ctx.fillText(remaining.toFixed(1), canvas.width/2, 380);
    ctx.restore();
  }
  // 每 500ms 轻微震动（前 3 秒）/ 每 200ms 加强震动（最后 1 秒）
  // 用 warn.t 模运算在 render 层周期性调 triggerShake，避免与业务帧耦合
  if (!inFinal1 && (warn.t*1000)%500 < 16) triggerShake(1.5, 150);
  if (inFinal1 && (warn.t*1000)%200 < 16)  triggerShake(2, 100);
}
```
> 震动周期用 `warn.t`（游戏时钟）而非 `performance.now()`，保证暂停时不震、与游戏节奏一致。

### 音效对齐点（audio-guide §E）
- `SFX.siren`（event，预警启动）+ `triggerShake(3,500)`。
- `SFX.sirenLoop`（C 方案 · P1）：预警 4 秒持续 loop，每 1.3s 一轮；**warn.active=false 时必须 clearInterval + 200ms 淡出**（audio-guide §C.1 明确要求）。
- `SFX.bigWaveImpact`（event · P1，预警结束）+ `triggerShake(5,400)`。

### 测试对齐点（regression-plan）
- **REG-WAVE-03**：大波预警 4s 期间不刷怪（`warn.active=true` 时 `spawnQueue.length===0` 直到预警结束）。
- **REG-WAVE-04**：预警结束后同帧 `wave++`、`lastWaveT=gt`。
- 可加：`warn.t<1` 时 `drawWaveWarn` 触发 vignette（渲染断言，Playtest 验收）。

---

## §6 D-11 圆角化 roundRect 封装（A.3）

**现状**：Canvas 内部所有矩形直角（`fillRect`/`strokeRect`），与 CSS `#canvas{border-radius:6px}`、按钮 3px 圆角冲突。

### 新增 helper（放在 render 区之前）
```js
// 统一圆角矩形。现代浏览器（Chrome99/FF113/Safari16+）ctx.roundRect 原生支持，
// 退化 Path2D+arcTo 兼容旧内核。
const RADIUS = { sm:4, md:8, lg:12 };
function rr(x, y, w, h, r=RADIUS.md){
  ctx.beginPath();
  if (ctx.roundRect){ ctx.roundRect(x, y, w, h, r); }
  else {
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y,   x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x,   y+h, r);
    ctx.arcTo(x,   y+h, x,   y,   r);
    ctx.arcTo(x,   y,   x+w, y,   r);
    ctx.closePath();
  }
}
```

### 替换点（以函数名为准）
- **卡片槽 / 铲子槽**：`drawCardBar`（L1162）内 `ctx.fillRect(SHOVEL_X,CARD_Y,...)` + `strokeRect` → `rr(SHOVEL_X,CARD_Y,SHOVEL_W,CARD_H,RADIUS.md); ctx.fill(); ctx.stroke();`；卡片循环 `fillRect(cx,CARD_Y,...)`+`strokeRect` 同理。
- **HUD 面板**：`drawStatus`（L1264）内 `ctx.fillRect(6,4,120,44)` / `fillRect(134,4,250,44)` 半透明黑底 → `rr(6,4,120,44,RADIUS.md); ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fill();`。
- **大波横幅进度条**：`drawWaveWarn`（L799）内 `fillRect(bx,by,bw,5)` → `rr(bx,by,bw,5,2)`。

> **§G 约束**：`rr` 内不碰 alpha；调用方如需半透明，`ctx.save()` 设 `globalAlpha` 再 `fill`，`restore()` 收尾。所有替换保持 fill/stroke 顺序不变，避免描边被填充覆盖。

### 音效对齐点
- 无（纯视觉基线，不涉及 SFX）。

### 测试对齐点
- 无 REG 数值断言；走 Playtest 视觉回归（卡片/HUD 圆角与 CSS 一致，无直角突变）。

### 待总线核验标注
- 无（不涉及音频）。

---

## §7 D-14 HUD 数字等宽字（A.6）· 已随 T1 落地，仅列验收断言

**现状**：T1 总线重构时已把 `drawStatus`（L1264）的数字字体改为 `Consolas,monospace`——参考 L1270 `ctx.font='bold 20px Consolas,monospace'`。本任务**不重复实现**，只固化验收断言。

### 验收断言（交 quality-lead）
- [ ] `drawStatus` 中所有**数字**绘制（阳光计数 L1270、分数、波次 `${wave}`、卡片冷却倒计时 `L1205`）使用 `Consolas, monospace` 字体栈，**不得**残留 `sans-serif` 数字。
- [ ] 卡片栏冷却倒计时 `drawCardBar` L1205 `ctx.font='bold 20px Consolas,monospace'` 与 HUD 同源。
- [ ] 数字滚动（若后续做 F-05 阳光 HUD 数字翻滚）滚动过程中**宽度不跳动**（等宽特性）。
- [ ] 标题/中文文本（`bold 76px Impact`、菜单 48px 等）**保持**非等宽（A.6 区分：仅数字等宽，标题用 Impact/雅黑）。

### 音效 / 测试对齐点
- 无 SFX；无 REG 数值断言。走 Playtest 视觉回归 + 代码 grep（`rg "sans-serif" drawStatus` 应无数字命中）。

### 行号漂移提示
- D-14 相关行号已随 T1 漂移，"以函数名 `drawStatus` / `drawCardBar` 为准"。

---

## §8 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用）

骨架多处引用 `easeInOut` / `easeOutCubic` / `easeOutBounce`。实施时**封装到模块级 `Easing` 对象**（art-handoff B 章规格），放在 `routeBus`（L230）之后的工具区：
```js
const Easing = {
  linear:      t => t,
  easeOut:     t => 1 - Math.pow(1 - t, 2),
  easeOutCubic:t => 1 - Math.pow(1 - t, 3),
  easeInOut:   t => t<0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2,
  easeOutBounce:t => {
    const n1=7.5625, d1=2.75;
    if (t<1/d1) return n1*t*t;
    if (t<2/d1) return n1*(t-=1.5/d1)*t + 0.75;
    if (t<2.5/d1)return n1*(t-=2.25/d1)*t + 0.9375;
    return n1*(t-=2.625/d1)*t + 0.984375;
  },
};
// 骨架内 `easeInOut`/`easeOutCubic` 即 `Easing.easeInOut` 等，贴入时替换为 Easing.*
```

---

## §9 实施 checklist（程基岩 Step 3 对照）

| 顺序 | 项 | 插入点（函数为准） | 依赖 | 待总线核验 |
|---|---|---|---|---|
| 1 | F-04 震动 | `render`(L786) 上方 + `update`(L569) 递减 | Easing §8 | 无 |
| 2 | F-01 种植 | `onClick`(L345,L401) + `drawPlant`(L927) | F-04 | 无 |
| 3 | F-02 死亡零件 | `killZombie`(L730) + `update` effects + `drawCorpsePart` | F-04 | `death.cone/.bucket` 走 battle 总线 |
| 4 | F-03 爆炸 | `explodeMine`(L641) + `drawBoom`(L1148) + `drawShockwave` | F-04 | 无 |
| 5 | F-06 大波 | `checkWave`(L744) + `drawWaveWarn`(L799) | F-04 | `sirenLoop` 淡出对齐 |
| 6 | D-11 圆角 | `rr` helper + `drawCardBar`/`drawStatus`/`drawWaveWarn` | 无 | 无 |
| 7 | D-14 等宽 | 已落地，仅验收 | T1 完成 | 已核验 L1270 |

**总约束复核**：✅ 所有新增绘制 `save/restore`；✅ 粒子 ≤ 500 守卫；✅ 震动 ≤ 6px（失败特例 8px 一次性）；✅ F-04 独立可测。
