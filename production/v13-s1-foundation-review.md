# V13-S1 地基与护栏 · 数据契约 + 卡数裁决 + 回归加固规格（评审定稿）

> 评审人：程基岩（engineering-lead）
> 依据基线：v1.2.1（2121 行）；只读施工，未改任何源码/测试/GDD/架构。
> 参考：`production/v1.3-plan.md`、`design/gdd/level-5.md`(v1.1)、`docs/architecture/v1.3-roof-projectile.md`、`docs/code-map.md`、`tests/harness/index.js`、`tests/harness/cases/SMOKE-025.js`、`tests/harness/cases/REG-END-02.js`、`tests/harness/cases/REG-PLANT-04.js`（注入风格基准）、`plants-vs-zombies.html` 源码行号（L 指绝对行号）。
> 主理人汇编注（2026-09-18 23:4x）：本文为 V13-S1 权威规格。两项主理人裁决已附：①卡数裁决照准「9」②门控计数拍板 REG-ROOF-01 为独立回归用例（回归 56→59）。依本裁决的 GDD/架构勘误已由 V13-S1b 执行（见文末附录勘误清单）。

---

## 0. 一句话裁决（先给结论）

- **卡数 = 9**（L4 七张 + 花盆 + 投手，事实为 7+2=9）。GDD §1.1/§3.0/§5.1/§8.1-T15 与架构 §3.2/§4.2 中的「7→8 / 卡片总数=8」**全部为 off-by-one 笔误**，由 V13-S1b（主理人执行，裁决依据=本文）统一勘误为「7→9 / 卡片总数=9」。
- **9 张布局余量充足、无需改布局代码**：实 canvas 宽 1000（`<canvas width="1000" height="680">`，L22），`CARD_X0=76`、`CARD_W=98`（stride，drawCardBar L1822 用 `CARD_X0+i*CARD_W` 无 gap）；9 张右缘 = 76 + 9×98 = **958 < 1000**，底部右侧留 **42px** 空白卡条底。**drawStatus HUD 在顶部 y=8/26/44（L1948/1951/1955），卡栏在底部 `CARD_Y=680-78-2=600` 起**——二者分处画布两端，垂直零重叠，故 42px 仅为底部右侧空白底条，**不挤占 HUD**。结论：9 张按现状零布局改动落地，无需压缩卡宽/换基准。
- **数据契约、CARDS append 硬约束、常量声明位置、SMOKE-027/REG-PULT 规格**全部在下方定死。

---

## ① 数据契约定稿

### 1.1 `roof:true` 开关 vs terrain 枚举 —— 维持独立布尔开关

**结论：维持独立 `roof:true` 布尔字段，不引入 terrain 枚举。**

- 屋顶与泳池在语义上都是「关卡级地形开关」：`LEVELS[4].water===true`、`LEVELS[5].roof===true && water===false`。二者互斥且每关最多一种，与现有 `water:true` 单布尔模式完全同构，无需为两种地形发明 enum。
- 引入 enum 会强迫 L1–L4 也重写地形描述，扩大改动面、破坏既有回归——与「屋顶关对 L1–L4 零感知」原则冲突。
- 字段语义写死（实现侧须遵守）：
  - `LEVELS[5]` 显式 `roof:true` 且显式 `water:false`（GDD §4.1 已给）。
  - 屋顶全 5 行需盆，无行级区分（比泳池 `WATER_ROWS=[1,3]` 更简单），不存在「同一行屋顶/非屋顶混排」。
- **水逻辑隔离断言（写进 SMOKE-027，作为回归护栏）**：
  - `assert(lv5.roof===true && lv5.water===false)` —— 地形互斥锁。
  - onClick 屋顶分支必须写成 `if(level.roof && ...)`（对照 L687 既有 `if(level.water && ...)`），**两套分支以 `level.water` / `level.roof` 各自前置**，互不可达：roof 关 `level.water` 恒 false → 水轴 `WATER_ROWS` 逻辑对其零触发。
  - 镜像 SMOKE-025 T16③b：SMOKE-027 须含「L1–L4（roof 未定义/false）陆地格种植不受屋顶需盆校验拦截」行为断言，证明隔离成立。

### 1.2 `CARDS` append 硬约束 + 最终索引定案

- **硬约束：planter、cabbage 只能 append 到 `CARDS` 尾部（L147–L155 之后），绝不可插在中间。** 维持 L1–L4 前 7 张索引不变，REG-CARD-01（`['sunflower','pea','mine','nut','double','melon']` 索引 0–5）、SMOKE-025 T16③（选索引 6 睡莲）、REG-PLANT-02（`measure(4)` 双发 / `measure(5)` 西瓜）全部免改。
- **最终索引定案（9 张）：**

  | idx | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
  |---|---|---|---|---|---|---|---|---|---|
  | type | sunflower | pea | mine | nut | double | melon | lilypad | **planter** | **cabbage** |

  lilypad 稳居 6；planter=7、cabbage=8（架构 §3.2 曾误写成「cards[6]=planter、cards[7]=cabbage」，按本裁决纠正为 7/8）。

### 1.3 常量定稿（声明位置）

- `CABBAGE_VX = 260`、`CABBAGE_G = 500` 在 **基础配置常量区（code-map L35–L210）** 声明，与 `CARD_X0`/`SHOVEL_X` 组同区。
- **具体落点建议**：紧邻 `CARD_X0`（L41–L42）之后新增一行（或置于 `CARDS`（L147）之前），例如：
  `const CABBAGE_VX=260, CABBAGE_G=500;  // v1.3 屋顶投手抛物物理常量（仅在 type==='cabbage' 弹生效）`
- 理由：`updateProjectiles` 重力分支与 `updatePlant` 解算都引用这两个值；置于顶层 const 区，code-map 可归位、且对直线弹零影响（仅在 cabbage 分支读取）。值以 GDD §3.4 / 架构 §2.1 锁定，Playtest 校参时只调 `g/vx` 不调结构（CONCERN② 非阻塞）。

### 1.4 planter / cabbage 卡数据终稿

```js
{type:'planter', name:'花盆', cost:25,  cd:5,   dur:300},   // L147 之后追加，索引 7
{type:'cabbage', name:'投手', cost:150, cd:2.0, dur:750}    // 索引 8
```

| 字段 | planter | cabbage | 出处 |
|---|---|---|---|
| type | `'planter'` | `'cabbage'` | GDD §3.1/§3.2 |
| name | `'花盆'` | `'投手'` | GDD §3.3/§3.2 |
| cost | 25 | 150 | GDD §3.3/§3.2（25 倍数，铲返口径）|
| cd | 5 | 2.0 | GDD §3.3/§3.2 |
| dur | 300（建议，与睡莲同级）| 750（建议）| 架构 §4.2；规格不锁绝对值，实现侧常量为准 |
| 攻击 | 无（占位实体）| 抛物线单目标 30dmg | GDD §3.1/§3.2 |

> 注：`dur` 实现侧可微调，但 SMOKE/REG 不锁绝对 dur（与现有 REG 不锁 hp 同口径），仅锁 type/name/cost/cd 与「planter 无攻击」语义。

---

## ② 卡数矛盾裁决 + 四项落地定案

### 2.1 裁决

**卡数 = 9。** 依据：物理事实是 L4 七张 + 花盆 + 投手 = 9；GDD「+花盆 +投手」字面即两张新卡；所有「7→8 / 总数=8」是同一 off-by-one 笔误（7+2=9 非 8）。主理人倾向 9 与本文一致。GDD/架构中所有「8」笔误由 V13-S1b 勘误。

### 2.2 四项落地定案

**① SMOKE-025 T15 断言值（卡数断言含裁决值）**
- 现状（SMOKE-025.js L149–154）：`assert(cards.length === 7, ...)`；`cards[6].type==='lilypad'`、`cost===25`、`cd===5`。
- 裁定后：`cards.length === **9**`（CARDS 全局 append 后总长），保留 `cards[6]==='lilypad'`（cost25/cd5），**新增** `cards[7].type==='planter'`（cost25/cd5/无攻击）、`cards[8].type==='cabbage'`（cost150/cd2.0）。
- 该测试仍为 L4 契约（不破坏 L4 七张可用 + 睡莲在 6），仅补「全局现 9 张且新两卡在尾部」。

**② onKey 热键上界**
- 现状（L744）：`if(k>='1'&&k<='7')`。
- 裁定后：`if(k>='1'&&k<='9')`（1 处）。无测试直接锁热键（SMOKE 无热键契约），由 M4 人工验收兜底（与 V12 同款）。

**③ drawCardBar 布局余量验算（行级证据）**
- 常量：`SHOVEL_X=6`、`SHOVEL_W=62`、`CARD_X0=SHOVEL_X+SHOVEL_W+8 = **76**`（L40–41）；`CARD_W=98`（L39，drawCardBar L1823 作 stride，无 gap）。
- 右缘 = `CARD_X0 + n*CARD_W`：7张=76+686=**762**；8张=76+784=**860**；**9张=76+882=958**；10张=1056（溢出）。
- canvas 宽 = **1000**（L22 `<canvas width="1000">`）。9 张右缘 958 → 右侧留 **42px**。
- 重叠判定：`drawStatus`（L1919–1957）在**顶部** y=8/26/44 画速度/「1-7选卡」/最高分（x=990 右对齐）；`drawCardBar`（L1803–1851）卡栏在**底部** `CARD_Y=680-78-2=600` 起（卡占 y≈600–678）。二者垂直零重叠，42px 只是底部右侧空白卡条底。**结论：9 张无需任何布局/卡宽改动即可落地，不挤占 HUD。**
- 备选（仅未来若出现第 10 卡才需）：压缩 `CARD_W` 至 96 → 9×96+76=940（余 60px）；但**当前 9 张不需**，且不得违反「CARDS 只能 append 不能插队」——压缩卡宽属渲染参数，与 CARDS 顺序契约无关，可独立调整。

**④ 菜单文案处数与目标文案（grep 源码确认，L 为绝对行号）**
- 「7 植物」：**1 处** → L1975 `PvZ Lite · 7 植物 · 4 僵尸 · 铲子 · 音效` → 改为 `9 植物`。
- 「1-7 选卡」：**2 处** → L1951 `1-7选卡  X铲子...`（无空格，HUD）+ L2012 `1-7 选卡 · X 铲子...`（有空格，菜单）→ 均改为 `1-9选卡` / `1-9 选卡`。
- 合计 **3 处**文案 + **1 处** onKey（L744）需随裁决同步改。M4 人工验收文案改「9 张 / 1-9 选卡」。

---

## ③ 回归加固规格

### 3.1 SMOKE-027 断言表（L5 屋顶平衡契约）

**新增用例 `SMOKE-027`**，`run({game:g,assert})` 内读 `g.sandbox.__LEVELS[5]`。数值逐条与 GDD §8.1（v1.1）核对，**仅 T15「卡片总数」由 GDD 误写的 8 纠正为 9**，其余与 GDD 完全一致、无出入。

| # | 断言 | 期望 | GDD 出处 | 备注 |
|---|---|---|---|---|
| T1 | `lv5.totalWaves === lv5.waves.length` | **9** | §8.1-T1 | 通关判定依赖 |
| T2 | 逐波求和总量 | **42** | §8.1-T2 | 精确锁（见下核对）|
| T3 | 类型构成 | normal=**18**, cone=**11**, fast=**9**, bucket=**4** | §8.1-T3 | 本文独立复算与 GDD §4.2 一致 ✓ |
| T4 | `lv5.startSun` | **200** | §8.1-T4 | 独立断言便于熔断回调（§9.4）|
| T5 | 单波峰值 | **≤ 8** | §8.1-T5 | W9=8 |
| T6 | 单波 fast 峰值 | **≤ 2** | §8.1-T6 | 留作完整契约 |
| T7 | 单波 bucket ≤2 且全关=4 且 W1–W5 bucket=0 | 两幕结构锁 | §8.1-T7 | 防抄错波表 |
| T8 | `minInterval` | **≥ 6** | §8.1-T8 | W6–W9=6 |
| T9 | big 数量=3 且位置 W3/W6/W9 | `bigIdx=[2,5,8]` | §8.1-T9 | 注意索引：W3=2/W6=5/W9=8 |
| T10 | 单调性：逐波只数非降 | [2,3,4,4,4,5,6,6,8] 全非降 | §8.1-T10 | L5 严格非降，比 L4 宽松 |
| T11 | 回归锁：L4=38 波表原样保留；L1=5/L2≤25/L3=33（由 SMOKE-024/025 拥有，本文只声明不回归）| — | §8.1-T11 | — |
| T12 | 行为法：`newWave(1)` 后 9.5s 内 ≤1 只、20s 内 ≤2 只 | 刷怪下限生效 | §8.1-T12 | 复用 SMOKE-025 T12 写法 |
| T13 | 解锁链：通 L4 → `unlockedLevel≥5`；`?level=5` 直进 `probe().levelNo===5` | — | §8.1-T13 | 走真实 forceWaves/setUnlocked 路径 |
| T14 | 地形数据锁：`lv5.roof===true && lv5.water===false` | 互斥 | §8.1-T14 | **水逻辑隔离主锁**（见 ①.1）|
| **T15** | 花盆/投手契约：`CARDS` 含 planter(cost25/无攻击)、cabbage(cost150)；**卡片总数 = 9** | — | §8.1-T15（原文误写 8，**此处勘误为 9**）| 与 SMOKE-025 平移后口径一致 |
| T16 | 屋顶种植校验行为法（镜像 SMOKE-025 T16，但针对 roof）：无盆格拒种（零副作用）/ 有盆格拒再放盆 / 盆上种成功 / 铲子最上层；**外加 L1–L4 陆地关不受屋顶需盆拦截（隔离锁）** | — | §8.1-T16 / E1–E3 | 直接锁「roof 关对旧关零感知」；完整点击路径版独立成 `REG-ROOF-01`（主理人已拍板，见文末裁决②）|

**T2/T3 独立核对（本文复算，与 GDD §4.2 同值）：**
- 逐波只数：2+3+4+4+4+5+6+6+8 = **42** ✓
- normal：2+2+2+3+0+2+2+2+3 = **18** ✓；cone：0+1+0+1+2+1+2+2+2 = **11** ✓；fast：0+0+2+0+2+1+1+2+1 = **9** ✓；bucket：0+0+0+0+0+1+1+0+2 = **4** ✓
- 单波峰值 W9=8 ✓；fast 峰值 W3/W5/W8=2 ✓；bucket 峰值 W6/W7/W9=2 且 W1–W5=0 ✓；minInterval=6 ✓；big=[2,5,8] ✓。

> **无数值出入**：除 T15 卡片总数（GDD 误写 8 → 实为 9）外，SMOKE-027 所有期望值与 GDD §8.1 一字不差。T15 偏差已在 ②.2① 与 V13-S1b 勘误清单标注。

### 3.2 REG-PULT-01（抛物命中算法行为法 · 预测提前量必测）

**目的**：锁「投手真的打得中」——静止命中 + 移动目标接近必中（GDD §3.4 / 架构 §2.3 CONCERN① 闭环）。

**注入与断言（遵循 REG-PLANT-04 `g.sandbox.__projectiles.push` / `__zombies.push` 风格，几何取 `g.sandbox.__consts`）：**

```js
const K = g.sandbox.__consts;
const R = 2;
const zy = K.GRID_Y + R*K.CELL_H + K.CELL_H/2;       // 行基线（= 投手发射 y）
const spawnX = K.GRID_X + 30;                          // 植物格右缘（任取一列）

// —— 静止目标（eating 视为静止，spd 写 0）——
const Zx = 500;
const sz = {type:'normal',row:R,hp:180,maxHp:180,spd:0,x:Zx,eating:true,eatAnim:0,walk:0,dead:false};
g.sandbox.__zombies.push(sz);
const d = Math.max(50, Zx - spawnX), t = d/260;
const vy0s = (zy - zy - 0.5*500*t*t)/t;                // 同格基线 → 首项为 0
g.sandbox.__projectiles.push({x:spawnX,y:zy,vx:260,vy:vy0s,g:500,dmg:30,row:R,type:'cabbage',splash:0,dead:false});
let guard=0; while(g.probe().projectiles>0 && guard<600){ g.tick(0.01); guard++; }
assert(Math.abs(sz.hp - (180-30))<1e-6, 'REG-PULT-01① 静止目标注入 cabbage 弹应命中扣 30', sz.hp);

// —— 移动目标（spd=16 normal，预测提前量解算）——
const Zx2 = 520;
const mz = {type:'normal',row:R,hp:180,maxHp:180,spd:16,x:Zx2,eating:false,eatAnim:0,walk:0,dead:false};
g.sandbox.__zombies.push(mz);
const d0=Math.max(50,Zx2-spawnX), t0=d0/260;
const lead=Zx2 - 16*t0;                                // 预测飞行后位置
const d2=Math.max(50,lead-spawnX), t2=d2/260;
const vy0m=(zy - zy - 0.5*500*t2*t2)/t2;
g.sandbox.__projectiles.push({x:spawnX,y:zy,vx:260,vy:vy0m,g:500,dmg:30,row:R,type:'cabbage',splash:0,dead:false});
guard=0; while(g.probe().projectiles>0 && guard<900){ g.tick(0.01); guard++; }
assert(Math.abs(mz.hp - (180-30))<1e-6, 'REG-PULT-01② 移动目标按预测提前量发射应命中扣 30（接近必中）', mz.hp);
```

**要点**：用**对象引用 `sz`/`mz`** 读 hp（移动僵尸 x 会变，不可按 x 定位）；命中后 `mz.hp` 直接判定。`spawnX` 取发射格右缘即可，无需真实种投手（直接注入弹，隔离弹道逻辑）。`0.5*500*t*t` 即 `0.5*CABBAGE_G*t*t`，实现侧应引用常量而非字面量。

### 3.3 REG-PULT-02（弹道分支隔离 · 锁「直线弹零影响」生命线）

```js
const K=g.sandbox.__consts, R=2;
const zy=K.GRID_Y+R*K.CELL_H+K.CELL_H/2;
// cabbage：y 应随重力变化
g.sandbox.__projectiles.push({x:100,y:zy,vx:260,vy:-100,g:500,dmg:30,row:R,type:'cabbage',splash:0,dead:false});
const yc0=g.probe().projectilesArr.find(p=>p.type==='cabbage').y;
g.tick(0.1);
const yc1=g.probe().projectilesArr.find(p=>p.type==='cabbage');
assert(yc1 && Math.abs(yc1.y-yc0)>1e-6, 'REG-PULT-02① cabbage 弹 y 应随重力变化（vy/g 生效）', yc1&&yc1.y);
// pea：y 恒定（直线弹零影响）
g.sandbox.__projectiles.push({x:100,y:zy,vx:340,dmg:20,row:R,type:'pea',splash:0,dead:false});
const yp0=g.probe().projectilesArr.find(p=>p.type==='pea').y;
g.tick(0.1);
const yp1=g.probe().projectilesArr.find(p=>p.type==='pea');
assert(yp1 && Math.abs(yp1.y-yp0)<1e-9, 'REG-PULT-02② pea 弹 y 应恒定（直线弹零影响生命线）', yp1&&yp1.y);
// melon：同样恒定
g.sandbox.__projectiles.push({x:100,y:zy,vx:220,dmg:65,row:R,type:'melon',splash:55,dead:false});
const ym0=g.probe().projectilesArr.find(p=>p.type==='melon').y;
g.tick(0.1);
const ym1=g.probe().projectilesArr.find(p=>p.type==='melon');
assert(ym1 && Math.abs(ym1.y-ym0)<1e-9, 'REG-PULT-02③ melon 弹 y 应恒定', ym1&&ym1.y);
```

**要点**：直接锁「直线弹 y 恒不变」——这是保老 REG（REG-PLANT-02/04、REG-ZOM-03、SMOKE-010/020）免疫的物理前提。配合实现红线（下文 ④.3）形成双保险。

### 3.4 harness 桥需求清单（对照 `__CARDS` / `__consts.WATER_ROWS` 模式）

**结论：REG-PULT-01/02 不需要在 `tests/harness/index.js` 新增任何桥。**
- 现有 `PROBE_SUFFIX` 已暴露 `__projectiles`、`__zombies`（getter 实时取活引用，L81–84）与 `__consts`（含 `GRID_Y/CELL_H/ROWS/COLS`，L97–103）。
- 注入写法与既有 REG-PLANT-04（L22 `__projectiles.push`）、REG-ZOM-03（L18 `__projectiles.push`）、REG-MINE-01（L21 `__zombies.push`）**完全一致**，直接 `g.sandbox.__projectiles.push({...})` / `g.sandbox.__zombies.push({...})` 即可。
- 几何常量 `zy` 用 `__consts.GRID_Y + R*CELL_H + CELL_H/2` 现算，无需新桥。
- **可选（非强制）**：若未来 C 档再加「西瓜投手/玉米」需批量注入，可加 `injectProjectile(obj)` 便捷桥（`__api` 内 `projectiles.push(obj)`），但本次不要求、不阻塞。

### 3.5 平移清单（S2 改源码时逐条执行）

**A. SMOKE-025 T15（卡数断言，含裁决值 9）**
| 项 | 改动前（L149–154）| 改动后 |
|---|---|---|
| 总长 | `assert(cards.length === 7, ...)` | `assert(cards.length === 9, ...)` |
| 睡莲 | `cards[6].type==='lilypad'` / cost25 / cd5 | **保留不变** |
| 花盆 | （无）| 新增 `cards[7].type==='planter'` / cost25 / cd5 / 无攻击 |
| 投手 | （无）| 新增 `cards[8].type==='cabbage'` / cost150 / cd2.0 |
> 该测试仍锚定 L4 契约；仅补「全局现 9 张 + 新两卡在尾部」，不破坏 L4 七张可用。

**B. REG-END-02（setLevel/forceWaves/锁 LEVELS）**
| 项 | 改动前 | 改动后 |
|---|---|---|
| 解锁上限 | `g.setUnlocked(4)`（L13）| `g.setUnlocked(5)` |
| 选关 | `g.setLevel(4)`（L14）| `g.setLevel(5)` |
| 前置断言 | `levelNo === 4`（L16, L24）| `levelNo === 5` |
| 推波数 | `g.forceWaves(8)`（L18，L4 totalWaves=8）| `g.forceWaves(9)`（L5 totalWaves=9）|
| 末关锁 | `assert(__LEVELS[5] === undefined)`（L25）| `assert(__LEVELS[6] === undefined)` |
| 注释头 | 「L4 上线后最后一关由 L3 → L4」| 「L5 上线后最后一关由 L4 → L5」|
> drawEnd 真帧 `console.error` 监视网（L28–38）原样保留——锁「已通关全部关卡」分支无帧异常。

---

## ④ S2 六步施工顺序 + 红线清单（仿 V12-03：数据→校验→行为→渲染→测试→收尾）

> 原则：**测试先行但不落红态**——测试骨架与实现同批提交、提交前总线全绿（不制造 red 态）。六步每步附红线。

**Step 1 · 数据层**
- 做：`LEVELS[5]` 波次表（GDD §4.1，~70 行纯数据，`roof:true`/`water:false`/`startSun:200`/`totalWaves:9`）；`CARDS` 尾部 append planter(7)/cabbage(8)；基础配置区新增 `const CABBAGE_VX=260, CABBAGE_G=500;`。
- 红线：① CARDS **只 append 不插队**（索引 7/8 锁死，前 7 张不变）；② `roof`/`water` 互斥字段写死；③ 常量值锁 260/500，不得内联魔数。

**Step 2 · 校验层（屋顶需盆）**
- 做：onClick（L620–705）新增 `if(level.roof && c.type!=='planter' && !plants.some(p=>同格&&type==='planter'))→deny('先放花盆')`（零副作用）；有盆格点 planter→拒（已占用）；复用既有铲子最上层（L665–681 已通用）。
- 红线：① 水逻辑隔离——屋顶分支以 `level.roof` 前置，绝不触碰 `level.water`/`WATER_ROWS` 路径（L1–L4 零感知）；② 拒绝路径零副作用（不扣阳光、不进 CD、不消耗选中态），与泳池 E1/E2 同款；③ 全 5 行需盆、无行级范围分支（比泳池更简）。

**Step 3 · 行为层（弹道 + 投手攻击）**
- 做：`updatePlant`（L926–968）新增 `else if(p.type==='cabbage')` 分支——`hasZombieAhead` 门控、`cd=2.0`、`firstZombieX` 取目标、按 §3.4 预测提前量解算 `vy0`、`projectiles.push({x:pos.x+30,y:pos.y,vx:CABBAGE_VX,vy:vy0,g:CABBAGE_G,dmg:30,row,type:'cabbage',splash:0,dead})`、`SFX.melonThrow()`（**不调 `SFX.shoot()`**）；`updateProjectiles`（L1010–1037）在 L1013 之后插重力分支 + 下落越界分支。
- **红线（第一生命线）**：① 重力分支**必须 `if(pr.type==='cabbage')` 前置**，**绝不可无条件 `pr.y+=pr.vy*dt`**（会让直线弹 y 变 NaN 崩盘）；② cabbage 只碰自己对象，pea/double/melon 对象字面量（L941–946）**不新增 `vy/g` 字段**；③ 命中双窗口 `|zy-pr.y|<32 && |z.x-pr.x|<42`（L1015–1016）一字不改复用；④ 越界 `pr.x>canvas.width+40 || (type==='cabbage'&&pr.y>canvas.height+40)` 对直线弹恒等价于原式。

**Step 4 · 渲染层**
- 做：`drawProjectile`（L1692–1716）新增 `else if(pr.type==='cabbage')` 弧线绘制；`drawPlantInner`（L1492–1628）新增 `planter` 占位分支（陶土圆台）；屋顶皮肤 `drawGameWorld`（L1311–1412）砖纹/城垛（不破坏 `gridToPos` 平面假设 **〔⚠️ 已推翻（V13-M4-ENG-01/02，2026-09-19）：用户拍板 C2 ⇒ 屋顶皮肤改 `liftX(x)` 斜切口径、并破 `gridToPos` 平面假设；见 `docs/architecture/ADR-005-roof-5col-continuous-slope.md` + `production/v13-m4-c2-5col-impl-spec.md`。本条其余 Step 1–3 结论不变。/ 程基岩〕**）；`drawCardFace`（L1853–1918）planter/cabbage 卡面；`onKey`（L744）`k<='9'`；菜单/HUD 文案 3 处（L1951/L1975/L2012）→「1-9 选卡 / 9 植物」。
- 红线：① pea/melon 既有绘制分支**一字不改**；② 屋顶皮肤不遮大波横幅（E11，渲染顺序既有）；③ 卡面分支不挤压（9 张布局已验算 958<1000，零改动）；④ `CARD_Y` 等坐标常量不写死下标。

**Step 5 · 测试层**
- 做：新增 `SMOKE-027`（§3.1 全表，含 T14 地形互斥锁 + T16 roof 行为抽检）；新增 `REG-PULT-01`（§3.2）、`REG-PULT-02`（§3.3）、`REG-ROOF-01`（屋顶种植校验完整点击路径版：无盆拒种/有盆拒盆/盆上种成功/铲子最上层/L1 陆地关隔离锁，主理人拍板为独立回归用例）；平移 `SMOKE-025` T15、平移 `REG-END-02`（§3.5）。
- 红线：① **测试与实现同批全绿**，禁止把测试先落红态再回头修实现；② 骨架可先写、但 S2 收尾前必须全绿；③ 新增用例不锁绝对 hp/dur（难度倍率/实现常量会乘上去，GDD §8.3 口径）；④ 静态 `SMOKE-023`（SFX 调用键⊆定义键）对投手复用 `melonThrow` 天然通过（零新键）。

**Step 6 · 收尾层**
- 做：`node tools/gen-code-map.mjs` 重跑刷新行号；四门控全绿——烟雾 26→**27**（SMOKE-027）、回归 56→**59**（REG-PULT-01/02 + REG-ROOF-01，主理人已拍板）、总线 56/56（零新键）、bench 四→**五**场景（+场景 E：L5 屋顶末波）；人工 M 清单（M1–M8）。
- 红线：① `verify-bus` **56/56 维持**（投手复用 `melonThrow`、花盆复用 `plant`，零新 SFX 键，架构 §4.5 已证）；② 老回归 56 条**不可破**（直线弹零影响由 Step3 红线 + REG-PULT-02 双保险保证）。

---

## 附 A：主理人裁决（汇编时定案）

| # | 裁决点 | 结论 | 依据 |
|---|---|---|---|
| ① | 卡数矛盾 | **=9**，照准程基岩裁决；GDD/架构「7→8 / 总数=8」全部为 off-by-one 笔误，V13-S1b 勘误 | 本文 §2.1（7+2=9 物理事实 + 布局验算 958<1000）|
| ② | 门控计数口径 | **回归 56→59**：REG-PULT-01/02 + **REG-ROOF-01 独立回归用例**（屋顶种植校验完整点击路径版）。理由：种植校验是 v1.3 唯一新交互语义、「L1–L4 零感知」是最高回归风险区，值得专属 REG 锁；SMOKE-027 T16 保留行为抽检（轻量），与 REG-ROOF-01 分工=数据契约层 vs 点击路径层 | 本文 §0「门控计数注」两案对比 + v1.3-plan §六原估 +3 |

## 附 B：V13-S1b 勘误清单（已执行，落点与内容）

1. **GDD §1.1**、**§3.0**、**§5.1**、**§8.1 T15**、**§8.2 M4** 中「8 / 7→8 / 热键 8」统一改为 **9 / 7→9 / 热键 9**。理由：L4 七张 + 花盆 + 投手 = 9，事实 7+2=9。
2. **GDD 头部版本注升 v1.1→v1.2**（勘误记录入档）。
3. **架构 §0/§3.2/§4.2**：「卡数 7→8」→「7→9」；「cards[6]=planter、cards[7]=cabbage」→「planter@7、cabbage@8」；布局验算同步 9 张 958<1000 余 42px。
4. 其余 GDD §8.1 T1–T17 数值经本文独立复算**与 GDD 完全一致、无出入**，未改写。

—— V13-S1 评审完 · 主理人汇编归档 ——
