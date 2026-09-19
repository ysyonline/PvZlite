# L5 屋顶 · C2 连续坡面 + 5 列 · 施工规格（Spec-only）

> 作者：程基岩（engineering-lead） · 任务 **V13-M4-ENG-01** · 2026-09-19
> 性质：**施工规格（Spec-only，零实现）**。本文件 **未改 `plants-vs-zombies.html`、未改任何测试/配置**。
> 承接：`v13-m4-slope-eng-assessment.md` §0–§6（B 档）与 §C（C 档 C1/C2）。
> 用户已拍板：**路线 = C2（几何连续平滑坡面）**；**斜坡 = 左 5 列（col0–4）**；**H = 60px**（`left low / right high`）。
> 输入：`design/assets/m3-rooftop-concept/slope-bc-art-notes.md`（美术几何：底锚 y=600、向上抬升、檐板 `#463b2b`、左低右高）。
> 行号口径：**源码现值实测复核**（非引用 code-map）；实现后须重跑 `tools/gen-code-map.mjs`。

---

## §0 一句话结论（TL;DR）

1. **C2 + 5 列成立**，核心语句净增 **≈ +43~71 行**（含注释 ≈ +65~98），单文件小改量级。**（V13-M4-ENG-02 收口：H=60 · 城垛12 · 弹道 α · 补偿三件套已并入 §2.E）**
2. **★ 唯一 BLOCKING 项 = 弹道命中基线必须同步抬升**（L1073，及 L991 cabbage 瞄准、L1024 地瓜判据）。**发射 y 已由 `gridToPos` 自动抬升，不需要手改**；但**命中基线未自动抬升**，若不手改，**L5 平台列发射的直线弹纵向偏移 = `8 + liftX(植物列)` ≥ 68px > 命中窗 32px ⇒ 全体 miss**（60px ≫ 32px）。**现有用例无一能捕获**（探针不吐 y、无用例验坡上命中）。
3. **天空无需额外补块**（纠正任务书假设）：现有全宽天空带（L1370–1396，0–90）已足够——爬升的屋面自然「左侧露天空多、右侧露天空少」，恰是左低右高读感。**无绿底裂缝**（见 §2.E 论证）。
4. **`ROOF_SLOPE=0.18` 在 C2 弃用**：M3 的「旋转带」口径与本档「逐 x 抬升」口径不同，**瓦带/竖缝必须重写**为 `flatY − liftX(x)`（否则缝↔格错位）。
5. **回归零漂移**：`liftX` 单点 `level.roof` gate ⇒ L1–L4 恒 0、逐字节等价今日；`gridToPos↔posToGrid` 闭式互逆 ⇒ `REG-ROOF-01 clickGrid(2,2)` 仍精确落 (2,2)。
6. **回退粒度**：① 常量+`liftX` ② `gridToPos/posToGrid` ③ 弹道基线 ④ 实体 y ⑤ 屋顶绘制块——**五块各自独立可回退**。

---

## §1 定稿公式（C2 · 5 列 · H=60）

### 1.1 新常量（基础配置区，L44 `ROOF_SLOPE` 之后追加）

```js
// v1.3-M4 屋顶连续斜坡（C2）：仅 level.roof 生效；左 5 列抬升、右 4 列为水平平台
const ROOF_COLS=5;        // 斜坡占列数（col0..ROOF_COLS-1）；水平跨度 = 5*CELL_W = 450px
const ROOF_LIFT_H=60;     // 台面总抬升 px（平台相对 col0 的抬升量）。H=60 定稿；硬上限 68（城垛12口径，见评估 §D）
```

> `ROOF_SLOPE=0.18`（L44）**保留但弃用**（C2 不引用）；可在实现时加注「C2 弃用，保留给历史 M3 皮肤」或直接删除（回退更干净）——归实现期定夺（见 §7）。

### 1.2 抬升函数 `liftX`（放在 `gridToPos` 之前，L232 之上）

```js
function liftX(x){                                     // ≥0 = 向上 = 屏幕 y 减小
  if(!level.roof) return 0;                            // ★ 单点 gate：L1–L4 恒 0 ⇒ 逐字节等价今日
  return ROOF_LIFT_H * Math.max(0, Math.min(1, (x-GRID_X)/(ROOF_COLS*CELL_W)));
}
```
- 关键值（实测代入）：`x=55→0 · 145→12 · 235→24 · 325→36 · 415→48 · 505→60 · ≥505→60`。
- **越界安全**：`clamp` 使 `x<55` 回 0、`x>505` 封顶 60，**无 NaN**（对比 B 档逐列数组需越界守卫，此处 clamp 天然兜住 col=-1/col=9）。

### 1.3 `gridToPos` / `posToGrid`（L232–233，唯一核心）

**现状**：
```js
232: function gridToPos(col,row){return{x:GRID_X+col*CELL_W+CELL_W/2,y:GRID_Y+row*CELL_H+CELL_H/2}}
233: function posToGrid(x,y){return{x:Math.floor((x-GRID_X)/CELL_W),y:Math.floor((y-GRID_Y)/CELL_H)}}
```
**改为**：
```js
function gridToPos(col,row){
  const x=GRID_X+col*CELL_W+CELL_W/2;
  return { x, y:GRID_Y+row*CELL_H+CELL_H/2 - liftX(x) };      // 用「格心 x」求抬升
}
function posToGrid(x,y){
  const col=Math.floor((x-GRID_X)/CELL_W);                    // ★ 先由「点击 x」定 col
  return { x:col, y:Math.floor((y-GRID_Y+liftX(x))/CELL_H) }; // ★ 再 +liftX 反解 row（符号：+）
}
```
**互逆证明（闭式·无迭代）**：
- `posToGrid(gridToPos(c,r))`：x 不变 → `col=⌊(c+0.5)⌋=c` ✓；`y−GRID_Y+liftX(x)` 恰好 = `r·CELL_H+CELL_H/2`，`⌊·/CELL_H⌋=r`（因 `CELL_H/2<CELL_H`）✓。
- **与 liftX 的具体形状无关**，只要两函数用**同一个 liftX**。
- 反解语义 = 「点所在的视觉平行四边形格」⇒ 落格直觉正确（美术命门）。

---

## §2 逐块施工单（按文件区）

### A. 常量 —— L44 后追加（§1.1）· **新增 +2**

### B. `liftX` + `gridToPos/posToGrid` —— §1.2/§1.3 · **+5~7（含函数体与注释）**

### C. ★ 弹道基线抬升（**BLOCKING 级**）—— L969–974 / L990–991 / L1024 / L1073

> **这是 C2 与 B 的**关键差别**，也是本轮唯一 BLOCKING 项。** 必须先讲清现状语义（源码实测）：

**现状三处基线**：
- **发射 y**：`L969/970/972/974` 直线弹 = `pos.y-14 / -4 / -16 / -8`；`L990` cabbage `sy=pos.y`。`pos = gridToPos(...)` ⇒ **`pos.y` 已被 §1.3 自动抬升，无需手改**。
- **命中 y**：`L1073` `const zy=GRID_Y+z.row*CELL_H+CELL_H/2;` —— **列无关，不随 liftX；不会自动抬升**。
- **cabbage 瞄准 y**：`L991` `const zy=GRID_Y+p.row*CELL_H+CELL_H/2;`（解 `vy0` 用）—— 同上，不自动抬升。
- **地瓜判据 y**：`L1024` `const zy=GRID_Y+z.row*CELL_H+CELL_H/2;`（`explodeMine` 的 `dy`）—— 同上。

**为什么是 BLOCKING（定量）**：
- 直线弹发射后 **`pr.y` 恒定**（只有 `pr.x` 变，见 `updateProjectiles` L1069）。命中判据是 `|zy − pr.y| < 32`（L1074）。
- 抬升后：`pr.y = (平台行基线 − liftX(植物格心)) − 8`；`zy = 平台行基线`（**未抬**）。
- ⇒ 纵向偏差 = `|zy − pr.y| = |8 + liftX(植物格心)|`。植物在 col5+（平台，lift=60）时 = **68 > 32 ⇒ MISS**；即便 col3（lift=42）也 = 50 > 32 ⇒ MISS。
- **后果**：**L5 平台列（现役主力种植位）射出的直线弹全体打不中**——玩法崩。**但现有用例不验「坡上命中」，故门控仍全绿、静默上线**。

**修法（3 处，必须同步）**：
```js
// L1073（updateProjectiles 命中基线）——用僵尸实际 x
const zy=GRID_Y+z.row*CELL_H+CELL_H/2 - liftX(z.x);

// L1024（explodeMine dy 判据）——与命中口径一致
const zy=GRID_Y+z.row*CELL_H+CELL_H/2 - liftX(z.x);

// L991（cabbage 瞄准基线）——瞄准目标地面（target 已在同分支内求得）
const zy=GRID_Y+p.row*CELL_H+CELL_H/2 - liftX(target.x);
```
**发射 y（L969–974 / L990）**：**不改**（`pos.y` 已抬升）。**但必须真机/单测复核**（见 §3 复核项）。

**弹道语义 = α（地面参考 / 弹道随地面列抬升）—— 定稿（V13-M4-ENG-02 收口）**：
- **采用 α**：命中基线 `zy = flatY − liftX(z.x)`（**随僵尸地面列抬升**）。**三方一致**（engineering-lead 本侧建议 · QA「方案②」 · 主理人裁决）。
- **★ 与测试的绑定**：`SMOKE-028` **Part A** 断言的命中基线 **`y≈278`** —— 即本 α 口径下 row2·平台（flat 340 − liftX 60 ≈ 280）的命中基线值。**α 口径即 SMOKE-028 Part A 的口径**；两者必须同步（改 α 则 Part A 必改）。
- **修后行为**：偏差 = `|8 + liftX(植物格心) − liftX(僵尸 x)|`；僵尸在植物**右侧**（常态）⇒ 偏差 ≤ 8 ⇒ **必中** ✓；僵尸越过植物到**左侧** ⇒ 可 >32 ⇒ miss（**物理正确，与 GDD「抛物是屋顶解法」叙事一致**，交真机/Playtest）。
- **β（发射者参考 / 玩法逐字节等价今日）—— 已否决**（保留备案）：记 `pr.lift0 = liftX(植物格心)`、命中用 `− pr.lift0`，偏差恒 8，但弹与坡上僵尸有 ≤60px 视觉错位。**不采用**（α 更自洽、且与 QA 契约一致）。

> 一句话：**BLOCKING = L1073（+L1024/L991）命中基线必须 `−liftX`（α 定稿口径）；不改则 L5 直线弹全废且无测试兜。**

### D. 实体 y（僵尸/尸体）—— L1816 / L1173 / L1145 · **+3~4（核心）**

```js
// L1816 drawZombie：改为「连续」（用 z.x，消灭 12px 电梯感）
const x=z.x, y=GRID_Y+z.row*CELL_H+CELL_H/2 - liftX(z.x);

// L1173 killZombie：爆点 y
const y=GRID_Y+z.row*CELL_H+CELL_H/2 - liftX(z.x);

// L1145 spawnCorpseParts：死亡零件基准 y
const y = GRID_Y + z.row*CELL_H + CELL_H/2 - liftX(z.x);
```
> 僵尸 y **从不落盘**（每次由 `z.row` 现算），故改绘制点即全链路跟随，**probe 不吐 y ⇒ 零回归**。

### E. 绘制层（`drawGameWorld`）

> **口径统一**：把现有 M3 皮肤里**每一个「平面 y」替换为 `平面 y − liftX(x)`**；把 clip 矩形**上沿抬到 `GRID_Y − ROOF_LIFT_H`**（否则抬升部被裁掉）。

| 块 | 行号 | C2 动作 | 净增 |
|---|---|---|---|
| **天空带+白云+护罩** | L1370–1396 | **不动**（见下方论证：无需补块） | +0 |
| **棋盘 45 格** | L1399–1403 | 斜坡列改**平行四边形 path**；平台/老关仍 `fillRect`（y 抬 `liftX(格心)`） | +5~8 |
| 泳池水面 | L1405–1428 | 不动（water=false） | 0 |
| **屋顶皮肤（带/缝/clip）** | L1434–1463 | **重写为 shear 口径**：clip 上沿抬 `−ROOF_LIFT_H`；行带与竖缝一律 `flatY − liftX(x)` | +8~14 |
| 方向光渐变 | L1464–1469 | clip 到斜轮廓后罩（同上抬升） | +1~3 |
| **屋脊城垛** | L1470–1478 | 改**平行四边形**沿斜顶边；**压条斜段 8→10px**（补偿③） | +4~7 |
| **▲补偿① 斜坡半缝** | 皮肤缝循环（L1449–1462） | 斜坡段**每行内增补一条半缝** ⇒ 斜缝条数 **×2**（补偿 H=60 偏缓） | +2~4 |
| **▲补偿② 沿坡明暗** | 方向光渐变（L1464–1469） | **左上更亮 / 右下更暗**，强化坡向读感 | +1~2 |
| **檐板填充 `#463b2b`** | 新插（roof 分支内） | 斜底边 → y=600 的屋面厚度 | +5~8 |
| ④b 檐口楔 | L1519–1532 | 与斜轮廓对齐；`#7a6a4c` 楔可保留或并入檐板 | +0~3 |
| **预览框** | L1535 | 斜切（`y = GRID_Y+row*CELL_H − liftX(预览 x)`） | +1~2 |

> **★ 补偿三件套（H 定稿 = 60，纯绘制 · 不涉逻辑）**：因 5 列同 H 比 3 列偏缓（每列 12px / 坡角 7.6°），美术侧「偏缓」担忧用三项**纯绘制补偿**缓解，全部落在 roof 绘制分支内、零逻辑引用：
> ① **斜坡段每行内增补一条半缝**（斜缝条数 ×2 · 加密度）； ② **加强沿坡明暗**（左上更亮 / 右下更暗 · 加坡向）； ③ **屋脊压条斜段 8→10px 加粗**（加轮廓）。
> **回退阀**：真机验收若仍觉平 ⇒ 单常量 `ROOF_LIFT_H` 提到 **66**（= 本侧给的硬上限，城垛 12 口径下实为 **68**，取 66 留 2px 余量）。**回退阀只改 1 个常量，不动结构。**

**棋盘（L1399–1403）改法**：
```js
for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
  const x=GRID_X+c*CELL_W, y=GRID_Y+r*CELL_H;
  ctx.fillStyle=((c+r)%2===0)?lawn[0]:lawn[1];
  if(level.roof && c<ROOF_COLS){                          // C2：斜坡列 → 平行四边形
    const x1=x+CELL_W, yb=y+CELL_H;
    ctx.beginPath();
    ctx.moveTo(x, y-liftX(x));      ctx.lineTo(x1, y-liftX(x1));
    ctx.lineTo(x1,yb-liftX(x1));    ctx.lineTo(x, yb-liftX(x));
    ctx.closePath(); ctx.fill();
  }else{
    ctx.fillRect(x, y-liftX(x+CELL_W/2), CELL_W, CELL_H); // 老关 liftX=0 → 原式等价；平台=常数 60
  }
}
```
> 老关（`!level.roof`）走 else，`liftX=0` ⇒ `fillRect(x,y,90,104)` **逐字节等价今日**。

**檐板填充（新块）**：
```js
// 檐板 #463b2b：斜底边→固定 y=600 的屋面厚度（底锚 600，不破下沿）
const yB=GRID_Y+ROWS*CELL_H, xEnd=GRID_X+COLS*CELL_W, xPlat=GRID_X+ROOF_COLS*CELL_W;
ctx.fillStyle='#463b2b';
ctx.beginPath();
ctx.moveTo(GRID_X, yB);                 // (55,600)
ctx.lineTo(xPlat,  yB-liftX(xPlat));    // (505,540)
ctx.lineTo(xEnd,   yB-liftX(xEnd));     // (865,540)
ctx.lineTo(xEnd,   yB);                 // (865,600)
ctx.closePath(); ctx.fill();
```

**城垛平行四边形**：
```js
const MERLON_W=CELL_W*0.5, MERLON_H=12;   // 45×12（**定稿 = 源码现值 L1471 `MERLON_H=12`**；美术草图的 14 仅示意口径）
ctx.fillStyle='#6a5a44';
for(let c=0;c<COLS;c++){
  const x0=GRID_X+c*CELL_W, x1=x0+MERLON_W;
  const yT0=GRID_Y-liftX(x0), yT1=GRID_Y-liftX(x1);
  ctx.beginPath();
  ctx.moveTo(x0,yT0); ctx.lineTo(x1,yT1);
  ctx.lineTo(x1,yT1-MERLON_H); ctx.lineTo(x0,yT0-MERLON_H);
  ctx.closePath(); ctx.fill();
}
```

**★「天空无需补块」论证（纠正任务书假设）**：
- 现有天空 = `fillRect(0,0,canvas.width,90)` **全宽**（L1376）。棋盘/皮肤随后覆盖其下半部。
- 抬升后：col0 顶边 80→68（左→右），平台顶边 20。**抬升部上方（0..顶边）透出的正是全宽天空**。
- ⇒ **左侧露天空多（0–80）、右侧露天空少（0–20）**，恰是「左低右高」的正确读感；**无 CSS 绿底裂缝**（天空全宽覆盖至 90，屋面只在 ≥顶边处覆盖）。
- 结论：**「斜坡列上方补天空块」为不必要项**（任务书此假设基于 B 档「向下偏移」模型；C2 向上抬升自然消解）。**若实现后发现任何 1px 缝，再补一块 `fillRect(斜坡 x 区间, 0, …, 顶边)` 即可（备选，非默认）。**

---

## §3 BLOCKING 级清单（上线前必查）

| # | 项 | 位置 | 判据 | 不做的后果 |
|---|---|---|---|---|
| **B1** | **弹道命中基线 `−liftX(z.x)`** | L1073 | 手改 | **L5 平台列直线弹全 miss**（68>32），无测试兜 |
| **B2** | cabbage 瞄准基线 `−liftX(target.x)` | L991 | 手改 | 投手抛物线落点偏 60px（打不中/入地） |
| **B3** | 地瓜判据 `−liftX(z.x)` | L1024 | 手改 | `dy` 偏移（nearCell 惰性分支，影响小，但求一致） |
| **B4** | **⛔ 禁止项：发射 y 不得再手减 `liftX`** | L969–974/L990 | **禁止改动** | 发射 y 已由 `gridToPos` **自动抬升**；若照抄「emission y all −liftX」的旧表述再手减一次 ⇒ **双重抬升** ⇒ 偏差 = `8 + 2·liftX` ⇒ 同样 **全 miss** |

> ### ⛔ B4 · 易踩坑 / 禁止项（红线）
> **发射 y（`L969/970/972/974` 直线弹、`L990` cabbage `sy=pos.y`）= 由 `gridToPos` 自动抬升，禁止再手减 `liftX`。**
> - 依据：`pos = gridToPos(p.col,p.row)`（L956）⇒ `pos.y` **已含 `−liftX`**。再减 = **双重抬升** ⇒ 偏差 `8 + 2·liftX`（平台列 = 128px）⇒ **全 miss**。
> - **本文早期/任务书曾写「L969–974 emission y all `−liftX`」——那是错误表述（已由 engineering-lead 纠正），实施者勿照抄。**
> - 需要手改的**只有命中侧**：L1073 / L991 / L1024（B1–B3）。
> - 复核对齐：B1（命中基线）与 B4（发射基线）必须落在**同一行基线 + 同一 `liftX` 口径**上，两侧**只减一次**。

> **真机复核 B1/B4**：L5 于平台列（col5–8）种豌豆，令普通僵尸自右进入——**必须命中扣血**。**强烈建议实现时新增一条轻量断言/真机卡点**（现状无任何用例覆盖坡上命中，见 §4）。

---

## §4 回归影响（复核 §C.5 · 结论不变）

- **L1–L4 结构性免疫**：`liftX` 内 `if(!level.roof)return 0` ⇒ `gridToPos/posToGrid/弹道/实体 y` **逐字节等价今日**（含点击 col0–2 的 20+ 用例）。
- **唯二 L5 用例**（`REG-ROOF-01`、`SMOKE-027`）**不读 y**：
  - `REG-ROOF-01` `clickGrid(2,2)`：`gridToPos(2,2)`→x=280、`y=340−liftX(280)=340−30=310`；`posToGrid(280,310)`→col=⌊225/90⌋=2、row=⌊(310−80+30)/104⌋=⌊260/104⌋=2 ⇒ **(2,2)** ✓。
  - `SMOKE-027` T16 `clickGrid(4,2)`：平台 lift=60，`gridToPos(4,2)`→x=460、y=340−54=286，反解回 (4,2) ✓；断言只读 plants/sun/col/row。
- **`REG-PULT-01/02`、`SMOKE-020`、`REG-ZOM-03`**（§2.2 上轮"理论暴露点"）**跑 L1 ⇒ liftX≡0 ⇒ 无感**。
- **门控预期全绿不变**：烟雾 27 / 回归 60 / 总线 56（零新 SFX 键、零数据）。
- ⚠️ **诚实边界**：**回归零漂移 ≠ 玩法零变化**——B1 修后「坡上直线弹」语义与今日不同（上坡可中、越顶可能漏），**门控测不出**，须真机 + Playtest 覆盖。

---

## §5 行数估算（沿用口径：核心语句 vs 含注释落地）

| 分项 | 落点 | 核心净增 |
|---|---|---|
| 常量 `ROOF_COLS/ROOF_LIFT_H` | L44 后 | +2 |
| `liftX`（含 gate） | L232 前 | +3~5 |
| `gridToPos/posToGrid` | L232–233 | +3~5 |
| **弹道基线（B1–B3）** | L991/L1024/L1073 | +3~4 |
| 实体 y | L1816/L1173/L1145 | +3~4 |
| 棋盘平行四边形 | L1399–1403 | +5~8 |
| 屋顶皮肤 shear 重写（带/缝/clip/渐变） | L1434–1469 | +9~17 |
| 城垛平行四边形（含压条斜段 8→10） | L1470–1478 | +4~7 |
| ▲补偿三件套（半缝/明暗/压条加粗） | L1449–1478 | +3~6 |
| 檐板填充 `#463b2b` | 新插 | +5~8 |
| ④b 楔对齐 + 预览斜切 | L1519–1535 | +1~5 |
| **C2+5列 核心语句净增** | — | **≈ +43 ~ +71** |
| **含注释落地** | — | **≈ +65 ~ +98** |

**对照**：B 档核心 +26~46（评估 §3.2）；3 列 C2 核心 +53~86（评估 §C.4）。**5 列 C2 与 3 列几乎同价**（公式同形、列数不增语句），差异只在「皮肤重写」的数值（斜坡跨度 270→450px，代码量几乎不变）。

---

## §6 回退（五块独立，无需 git）

1. **常量+`liftX`**：删 `ROOF_COLS/ROOF_LIFT_H` + `liftX`（1 段）。
2. **映射**：`gridToPos/posToGrid` 还原 2 行原式。
3. **弹道基线**：L991/L1024/L1073 还原 3 行原式（**回退后 L5 直线弹复现"全 miss"**——与今日一致，非新增事故）。
4. **实体 y**：L1816/L1173/L1145 还原 3 行。
5. **屋顶绘制块**：棋盘 else 支 + 皮肤重写 + 檐板 + 城垛 + 预览 还原。

每块可单独回退 ⇒ 支持分批真机验收：**先「映射+棋盘+实体」（看斜不斜）→ 再「皮肤重写」（看像不像）→ 再「弹道基线」（补玩法）**。

---

## §7 裁决落定 / 剩余待定（V13-M4-ENG-02 收口）

**已由主理人裁决定稿（本轮落定）**：

| # | 事项 | 定稿 | 依据 |
|---|---|---|---|
| 1 | **弹道语义** | **α（地面参考）** — 三方一致；**绑定 `SMOKE-028` Part A `y≈278`** | V13-M4-ENG-02 裁决① |
| 2 | **H 总量** | **60**（非 66）；「偏缓」用**补偿三件套**缓解；**回退阀 = 单常量提到 66** | 裁决② |
| 3 | **城垛高** | **12**（源码 `MERLON_H=12` L1471 现值）；美术 14 仅示意 ⇒ **顶部余量 = 8px**、硬上限 **68** | 裁决③ |
| 4 | **发射 y 手减 `liftX`** | **⛔ 禁止**（B4 红线 · 双重抬升反而 miss） | 裁决④ |

**剩余待定（非阻塞）**：

| # | 事项 | 本侧建议 | 归属 |
|---|---|---|---|
| 5 | `ROOF_SLOPE=0.18` 删除 vs 保留加「C2 弃用」注 | 保留加注（最小 diff） | 实现期 |
| 6 | ④b 檐口楔 `#7a6a4c` 保留 vs 并入檐板 `#463b2b` | 保留（与檐板分层，读感更立体） | 美术 |
| 7 | 是否新增「L5 坡上命中」轻量断言（现状零覆盖） | **建议加** | QA |

---

*本规格不含任何代码改动。实现按「先映射+棋盘+实体 → 再皮肤重写 → 再弹道基线」分批；实现后须重跑 `tools/gen-code-map.mjs` 并复跑四道门控（27/60/56 + bench 场景 E）。BLOCKING 项（§3）未闭环前不得判定 L5 完成。*