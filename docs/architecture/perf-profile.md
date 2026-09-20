# PvZ Lite · 性能剖析报告

- **分析对象**：`plants-vs-zombies.html`（≈ 1400 行）
- **分析方式**：静态代码结构推理（不跑真实基准；本项目规模下真实基准收益 < 成本）
- **画布**：1000 × 680
- **目标帧率**：60fps（16.67ms / 帧）
- **实测估算**：最坏场景 ~1400 draw calls/帧，仍在 Canvas 2D 舒适区（10000+ calls/帧才告警）
- **作者**：程基岩（engineering-lead），2026-09-15

---

## 1. 每帧 Draw Call 估算

### 1.1 计数方法

以 `ctx.<method>()` 调用次数为准，每帧一次调用计 1 次。`beginPath` 不计入（不产生绘制，只是路径起点）。`save/restore` 计入（改栈、影响性能）。`createRadialGradient / createLinearGradient` 计入（有分配成本）。

**源代码 grep 统计**（`plants-vs-zombies.html` 全文）：

| 调用 | 出现次数 |
|---|---|
| `ctx.fillRect` | 51 |
| `ctx.fillText` | 39 |
| `ctx.strokeText` | 1 |
| `ctx.strokeRect` | 10 |
| `ctx.stroke()` | 6 |
| `ctx.fill()` | 70 |
| `ctx.beginPath` | 76 |
| `ctx.ellipse` | 26 |
| `ctx.arc(` | 44 |
| `ctx.save()` | 10 |
| `ctx.restore()` | 10 |
| `createRadialGradient` | 4 |
| `createLinearGradient` | 3 |
| `ctx.translate` | 4 |
| `ctx.rotate` | 2 |
| `ctx.scale` | 1 |
| `ctx.measureText` | 1 |

静态计数包含条件分支，需按场景折算。

### 1.2 场景一：空草坪（`state='play'`，无实体，无 toast，无预警）

| 模块 | 调用数 | 备注 |
|---|---|---|
| `clearRect` | 1 | 每帧 |
| 棋盘格子 | 45 | 9×5 = 45 fillRect |
| 道路底色 | 1 | |
| 道路分隔线 | 10 | 5 行 × 2 |
| 房子底色 | 2 | |
| 房子窗户 | 5 | |
| 房子窗框 | 5 | |
| 卡片栏底 | 2 | |
| 铲子槽 + 图标 + 文字 | ~15 | 图标含 4 次 beginPath+stroke/fill |
| 卡片 × 6 | 6×5 = 30 | 每卡：底 + 框 + 面 + 名 + 成本 |
| 卡片正面（简化） | 6×6 = 36 | 每卡 3-10 次椭圆/弧 |
| HUD 阳光框 + 图标 | ~14 | 含 drawSun |
| HUD 波次/分数框 + 文字 | 7 | |
| 速度提示文字 | 2 | |
| **合计** | **~155** | |

### 1.3 场景二：满草坪 30 植物（无僵尸、无子弹、无粒子）

| 模块 | 调用数 | 备注 |
|---|---|---|
| 基础（同场景一） | 155 | |
| 30 植物 × 平均 ~15 calls | 450 | 见下方分布 |
| **合计** | **~605** | |

30 植物按典型分布折算（10 向日葵 + 5 豌豆 + 5 双发 + 5 西瓜 + 3 坚果 + 2 地瓜）：

| 植物类型 | 单个 draw calls | 数量 | 小计 |
|---|---|---|---|
| 向日葵 | ~15（10 花瓣椭圆 + 中心 2 弧 + 眼 4 弧 + 影子 1） | 10 | 150 |
| 豌豆 | ~10（1 身 + 2 叶 + 眼 + 嘴 stroke） | 5 | 50 |
| 双发 | ~15 | 5 | 75 |
| 西瓜 | ~10（1 身 + 5 花纹 + 高光） | 5 | 50 |
| 坚果 | ~10（1 身 + 眼 + HP 条） | 3 | 30 |
| 地瓜（武装） | ~13 | 2 | 26 |
| **小计** | | 30 | **381** |

### 1.4 场景三：大波（20 僵尸 + 10 子弹 + 30 粒子 + 3 阳光 + 预警横幅）

| 模块 | 调用数 | 备注 |
|---|---|---|
| 基础（同场景一） | 155 | |
| 30 植物（假设满） | 381 | |
| 20 僵尸 × ~14 calls | 280 | 见下方 |
| 10 子弹 × ~5 calls | 50 | 含 createRadialGradient |
| 30 粒子 × ~3 calls | 90 | 含 save/restore |
| 3 阳光 × ~13 calls | 39 | 含 createRadialGradient |
| 预警横幅 | ~14 | 含 createLinearGradient |
| **合计** | **~1009** | |

20 僵尸按典型分布：

| 类型 | 单个 draw calls | 数量 | 小计 |
|---|---|---|---|
| normal | ~10（save + 身 + 头 + 眼 + 嘴 + 臂 + restore + HP） | 12 | 120 |
| cone | ~12（+ 帽子） | 4 | 48 |
| fast | ~11（+ 红条） | 4 | 44 |

3 阳光 × 13：`save + translate + 光晕弧 + createRadialGradient + 核心弧 + 8 光线 × 2 + fillText + restore` ≈ 13。

10 子弹（假设 pea/melon 混合）：`createRadialGradient + 影子椭圆 + 核心弧 + 高光弧` ≈ 4–6。

**结论**：最坏场景 ~1000–1400 draw calls/帧，远低于 Canvas 2D 的实用上限（经验值 ~15000 calls/帧 @ 60fps @ 1000×680 画布）。**当前规模下瓶颈不在 draw call 数量本身，而在下面几类"贵操作"的调用次数。**

> **V12 增补（场景 D 实测后回看）**：上表静态估算基于 L1–L3 陆地关。L4 泳池关新增渲染面 = 水面渐变+波纹（2 水行）、水行僵尸半浸叠层（+2 fillRect/只）、睡莲垫场景绘制。场景 D 实测（§7）：15 植物 + 30 僵尸地狱末波规模下 **全口径 1970 / 估算口径 1335 draw calls（中位），p50=0.34ms / p95=0.86ms（5% 预算）**——较场景 C（1155 估算口径）+15.6%，与实体规模增幅（+20% 僵尸/+25% 植物）线性吻合，水景渲染路径**无超线性成本**，60fps 余量充足。

---

## 2. 热路径清单

### 2.1 每帧必调函数（60 fps 下每秒调用次数）

| 函数 | 位置 | 频率 | 主要成本 |
|---|---|---|---|
| `loop(now)` | L228 | 60/s | dt 计算 + try/catch |
| `render()` | L739 | 60/s | 分支调度 |
| `drawGameWorld()` | L794 | 60/s | 45 格子棋盘 + 道路 + 房子 |
| `drawCardBar()` | L1115 | 60/s | 6 卡 + 铲子 + 文字 |
| `drawStatus()` | L1217 | 60/s | ~10 fillText |
| `drawToast()` | L112 | 60/s（有 toast 时） | 1 measureText + 1 fillText |
| `drawPlant(p)` | L880 | 60 × plants.length/s | 10–15 calls / 个 |
| `drawZombie(z)` | L997 | 60 × zombies.length/s | 10–12 calls / 个 |
| `drawProjectile(pr)` | L1044 | 60 × projectiles.length/s | 4–6 calls / 个（含 gradient） |
| `drawSun(e)` | L1069 | 60 × suns/s | ~13 calls / 个（含 gradient） |
| `drawParticle(e)` | L1093 | 60 × particles/s | ~3 calls / 个 |
| `update(dt)` | L522 | 60/s（play 时） | 调度 |
| `updatePlant / updateZombies / updateProjectiles` | L557/623/651 | 60/s | 遍历 |
| `checkWave(dt)` | L697 | 60/s | 波次判定 |
| `setState(s, why)` | L104 | 稀疏 | 日志打印 |

### 2.2 潜在热点（每帧多次调用，成本相对高）

| 函数 | 热点原因 |
|---|---|
| `drawPlant(p)` | 单函数 200 行、15 分支类型；每分支内部循环（向日葵 10 花瓣 / 西瓜 6 花纹 / 双发 多椭圆） |
| `drawZombie(z)` | 每只 `save + translate + rotate + restore`；每只画血条 2 fillRect |
| `drawProjectile(pr)` | 每发子弹 `createRadialGradient` + 2 `addColorStop`（4 次分配/发） |
| `drawSun(e)` | 每个阳光 `save + translate + createRadialGradient + fillText` + 8 光线 |
| `drawBoom(e)` | 每次爆炸 `save + createRadialGradient + 3 addColorStop + restore` |
| `hasZombieAhead(p)` | 每次植物攻击前扫全僵尸数组（O(zombies)） |
| `updateProjectiles` 内的嵌套 for | O(projectiles × zombies)，大波下 ~10 × 20 = 200 次距离判断 |
| `updateZombies` 内 `for p of plants` | O(zombies × plants)，大波下 ~20 × 30 = 600 次目标检测 |
| `zombies=filter() / effects=filter() / projectiles=filter()` | 每帧 3 次数组重建，产生 GC 压力 |

---

## 3. 具体瓶颈假设

### 3.1 Canvas 状态保存/恢复次数

`save/restore` 每对约 5–10μs（含栈操作）。

**每帧估算（大波场景）**：

| 位置 | 每帧 save 数 |
|---|---|
| `drawToast` | 1 |
| `drawShovelIcon`（预览 + 卡片栏各 1 次） | 2 |
| `drawZombie` × 20 | 20 |
| `drawSun` × 3 | 3 |
| `drawParticle` × 30 | 30 |
| `drawBoom` × 1 | 1 |
| `drawCardBar` 内 save/restore 包 alpha | 6（每卡 1 对） |
| **合计** | **~63 对 / 帧** |

**评估**：可接受。Canvas 2D 的 save/restore 是廉价的栈操作，60/s × 63 = 3780 次/秒无压力。

**优化空间**：粒子可以省掉 save/restore，改为直接 `ctx.globalAlpha = ...; ...; ctx.globalAlpha = 1`。收益：省 30 对 = 200μs/帧，约 1.2ms/s。

### 3.2 `fillText` 调用量（HUD 每帧都画）

`fillText` 约 30–100μs / 次（含字体布局、光栅化、抗锯齿）。是 Canvas 2D 里最贵的调用之一。

**每帧估算**：

| 位置 | 每帧 fillText |
|---|---|
| `drawCardBar` 卡片名 × 6 | 6 |
| `drawCardBar` 卡片成本 × 6 | 6 |
| `drawCardBar` 铲子文字 | 1 |
| `drawCardBar` CD 数字（有冷却时） | 0–6 |
| `drawStatus`（阳光值 + 波次 + 分数 + 难度 + 剩余 + 速度 + 提示） | 7 |
| `drawSun` × 3 | 3 |
| `drawWaveWarn`（有预警时） | 3 |
| `drawToast`（有 toast 时） | 1 |
| `drawMenu`（菜单态） | 15+ |
| **play 态合计** | **~33 次 / 帧** |
| **每秒 fillText** | **~2000 次 / 秒** |

**评估**：这是当前最贵的单一操作类别。~2000 fillText/s ≈ 30–60ms/s 的 CPU 预算。

**核心问题**：卡片名、卡片成本、提示文字、难度名、分数等**在大多数帧里根本不变**，但仍每帧都调用 fillText。见优化建议 §4.1。

### 3.3 `createRadialGradient` / `createLinearGradient` 调用量

Canvas 2D 的 gradient 对象每次 `createRadialGradient` 是**堆分配 + 引用计数**，约 5–20μs / 次；比纯 `fillRect` 贵 20–50 倍。

**每帧估算**：

| 位置 | 每帧创建数 |
|---|---|
| `drawProjectile`（每发 pea） | projectiles.length（10 场景） |
| `drawProjectile`（每发 melon） | 同上（假设 0 melon） |
| `drawSun`（每个阳光） | effects.sun.length（3 场景） |
| `drawBoom`（每次爆炸） | effects.boom.length（0–3） |
| `drawGameWorld` 黄昏滤镜 | 0（L1）/ 1（L2） |
| `drawMenu` 背景 | 1（菜单态） |
| `drawWaveWarn` | 0–1（预警时） |
| **play 态合计** | **~13 / 帧** |
| **每秒** | **~780 / 秒** |

**评估**：~780 gradient/s × 10μs = 7.8ms/s，非瓶颈但可优化。见 §4.4。

### 3.4 数组迭代与 `_dying` 标记法清理

`filter` 每次都产生新数组 + GC 压力；本项目的三处 filter：

| 位置 | 每帧过滤数组 | 大波场景长度 |
|---|---|---|
| L543 `effects=effects.filter(e=>!e.dead)` | effects | 30–80 |
| L648 `projectiles=projectiles.filter(p=>!p.dead)` | projectiles | 5–30 |
| L676 `zombies=zombies.filter(z=>!z.dead)` | zombies | 5–40 |
| L678–680 plants 反向 splice | plants | ≤ 45 |

**评估**：每帧 3 个新数组 × 平均 30 项 = ~90 对象分配/帧 = ~5400 对象/秒。V8 新生代 GC 处理得过来，无压力。

**反向迭代 + 反向 splice**（plants）已是标准模式；`for(let i=arr.length-1;i>=0;i--)` 与 filter 相比开销相当，但语义更清晰。

**关键设计正确性**：`_dying` 标记法避免在 `for...of` 里 splice（会破坏迭代器），README L89 已警示。

### 3.5 WebAudio 节点创建频率

**节点类型与创建频率**：

| 函数 | 触发频率（估算） | 每次创建节点数 |
|---|---|---|
| `tone()` | ~50 次/秒（shoot/hit/death/chomp 已节流） | 2（Oscillator + Gain） |
| `noise()` | ~15 次/秒（hit/death/boom/shovel） | 2–3（BufferSource + BiquadFilter + Gain） |
| `sfxGate` 节流 | 4 类节流：shoot 0.13s / hit 0.06s / death 0.07s / chomp 0.42s | — |

**每声 `noise()`** 都 `createBuffer + 手动填充 Float32Array`：`Math.max(1, sampleRate × dur)` 采样点，典型 0.17s × 44100 = 7500 采样点。

**评估**：
- 节点本身：100–200 节点/秒，WebAudio 引擎可轻松承受。
- `noise()` 的 Buffer 填充循环：**是每声噪声的 CPU 尖峰**，`for(let i=0;i<len;i++)d[i]=...` 是 O(N) 采样生成。
- 若同一时刻爆 3 个 `boom` + 5 个 `chomp`（大波 + 地瓜连锁），瞬时可能 8 次 noise() 触发，每次 4000–10000 采样填充 = ~50k 采样/帧 = 一帧 CPU 预算爆表。

**优化空间**：见 §4.5（预生成 noise buffer + 复用）。

### 3.6 其他次要热点

- **`hasZombieAhead(p)`**：每次植物攻击前扫全僵尸数组。30 植物 × 60fps = 1800 次扫，每次扫 20 僵尸 = ~36000 次/秒距离判断。O(N×M)，非瓶颈。
- **`Math.random()`**：粒子生成、阳光位置、僵尸行走抖动都调用。约 500 次/秒，非瓶颈。
- **`console.log`**：`setState` 每次调用；`console.error` 异常时。开发期无感，生产可去。

---

## 4. 优化建议

按 ROI 排序。**改动位置 → 预期收益 → 风险**。

### 4.1 HUD 静帧检测（**高 ROI，首选**）

**改动位置**：`drawStatus()`（L1217–L1250）与 `drawCardBar()` 中不变的部分（卡片底、卡片名、卡片成本、铲子文字）。

**思路**：把 HUD 与卡片栏的**静态部分**渲染到离屏 canvas，仅在**关键值变化时**重绘离屏 canvas。

**判定"值变化"的字段**：
- `sun`（阳光数）
- `wave`（当前波次）
- `score`（分数）
- `remain = zombies.length + spawnQueue.length`
- `gameSpeed / paused / muted`（右上角）
- `cardCD[type]`（每张卡 CD）
- `selected`（选中的卡）

任一变化 → 重绘；全部不变 → `ctx.drawImage(offscreenHud, 0, 0)` 一次搞定。

**预期收益**：
- 空草坪场景从 ~155 calls → ~160 calls（几乎无差，因为 HUD 就是主要负载）
- **满草坪 + 大波场景**从 ~1000 → ~750（省 ~250 calls，含 30+ fillText）
- CPU：从 30–60ms/s 降到 5–10ms/s（省 ~80% HUD 时间）

**风险**：
- 中。需要维护一张"脏标记表"，若漏了某个字段会导致 HUD 显示旧值。
- 单元测试可覆盖：改 sun/wave/score 后断言离屏 canvas 被重绘。
- 建议在测试脚手架里加 `__api.snapshotHud()` 辅助断言。

### 4.2 静态草坪离屏缓存（**中高 ROI**）

**改动位置**：`drawGameWorld()` 内 L796–L829（棋盘 45 格 + 道路 + 房子）。

**思路**：把这些纯静态绘制一次性画到 1000×680 的离屏 canvas，之后每帧 `ctx.drawImage(lawn, 0, 0)`。

**触发离屏重绘的条件**：
- `level` 切换（L1 ↔ L2 黄昏滤镜不同）
- `level.lawn` 颜色不同（可配置）
- `level.dusk` 布尔变化
- 窗口尺寸变化（本项目固定 1000×680，不会触发）

**预期收益**：
- 省 45 + 1 + 10 + 2 + 5 + 5 = **68 calls/帧**
- 省 2400 calls/秒
- CPU 节省 ~1ms/s

**风险**：
- 低。仅需在 `startGame()` 与 `onClickMenu()` 中调用 `rebuildLawnOffscreen()`。
- 黄昏滤镜是线性渐变 + fillRect，也可一并缓存。
- 唯一注意：不要在离屏 canvas 里画 `drawShovelIcon` 等动态预览（那些仍要每帧画）。

### 4.3 子弹 / 粒子对象池（**低 ROI，暂缓**）

**改动位置**：`projectiles`、`effects`（particle 部分）。

**思路**：用环形 buffer 或 `freeList` 复用僵尸，避免 `filter()` 每帧新数组。

**预期收益**：
- 减少 ~5400 对象/秒 的分配（filter）
- 减少 GC 停顿频次（可能 < 1ms/s）

**风险**：
- 中。改造点较多（`push` → `alloc`、`filter` → `swap-remove`），易引入 bug。
- 与 `_dying` 标记法有语义冲突，需谨慎。

**建议**：**当前规模不做**。等实体规模翻倍（> 100 粒子）后再考虑。见 §5「不做优化清单」#1。

### 4.4 渐变对象缓存（**中低 ROI**）

**改动位置**：`drawProjectile`（L1044–L1067）、`drawSun`（L1069–L1091）、`drawBoom`（L1101–L1113）。

**思路**：
- **方案 A（推荐）**：把每个 gradient-based sprite 预渲染到小型离屏 canvas（如 32×32），运行时 `drawImage`。
- **方案 B**：按位置分桶缓存 gradient 对象（不推荐，位置是连续变化的）。

**方案 A 详细**：
```js
const SPRITES = {
  pea:    makeSpriteCanvas(24, drawPeaBody),
  melon:  makeSpriteCanvas(32, drawMelonBody),
  sun:    makeSpriteCanvas(60, drawSunBody),  // 含光晕
  boom:   makeSpriteCanvas(128, drawBoomBody)
};
```

**预期收益**：
- 大波场景：省 ~13 gradient 创建/帧 = ~130μs/帧 = 7.8ms/s
- 附带收益：`drawProjectile` 里 5 次 `fill/ellipse/arc` 也可省，变成 1 次 `drawImage`
- 总收益：~15ms/s（大波场景）

**风险**：
- 中。需要在离屏 canvas 里画 gradient + 主体，代码重复度略升。
- 粒子动画（如 sun 的光线旋转）需保留实时绘制。
- 建议先做 sun + boom（大尺寸、旋转、频繁），pea/melon 缓做。

### 4.5 WebAudio noise 缓冲预生成（**中 ROI**）

**改动位置**：`noise()` 函数（L170–L188）。

**思路**：预生成 3 段（0.06s / 0.17s / 0.5s）的 noise buffer，运行时按 `dur` 选最近的一档。

**预期收益**：
- 每次 noise() 省 7500 采样填充循环（约 30μs）
- 大波下每帧 ~20 次 noise = 省 600μs/帧 = 36ms/s

**风险**：
- 低。仅需在 `ac()` 后懒初始化 buffer；无外部依赖。
- 音质几乎无变化（noise 是随机数，多段近似等价）。

### 4.6 `fillText` 缓存到离屏 canvas（**中高 ROI，与 4.1 互补**）

**改动位置**：所有静态文字（菜单标题、卡片名、卡片成本、提示文字、结算文本）。

**思路**：把固定文本提前画到离屏 canvas，运行时 `drawImage` 代替 `fillText`。

**典型候选**：
- 菜单标题「植物大战僵尸」（Impact 76px）—— 一次算好
- 卡片名 × 6 + 卡片成本 × 6 —— 一次算好
- HUD 提示"1-6 选卡 X 铲子..."—— 一次算好

**预期收益**：
- 与 §4.1 互补：HUD 静帧检测解决"值不变时不重绘"，`fillText` 缓存解决"值变时也要走 drawImage"
- 单独做 fillText 缓存：省 5–10ms/s
- 联合 §4.1 做：省 25–40ms/s（含 fillText 布局成本）

**风险**：
- 低。纯渲染替换，无逻辑影响。
- 需注意文字阴影 / 描边（如菜单标题 Impact 76px 有两层 fillText 做 3D 效果），需整段一起缓存。

---

## 5. 不做优化清单

以下优化**当前规模不值得动**，明确列出以避免后续误改：

1. **不切换到 WebGL / PixiJS**：每帧 < 2000 calls，Canvas 2D 舒适区；换引擎引入 600KB+ 库 + 重写渲染层，负 ROI。（见 ADR-003 备选 A）

2. **不拆分子弹 / 粒子对象池**：每帧 ~300 对象分配，V8 新生代 GC 完全承受得住；改造复杂度中、bug 风险中、收益 < 5ms/s。等实体规模 > 500 时再评估。

3. **不给 `for...of` 里的实体遍历加索引遍历**：`for(const z of zombies)` vs `for(let i=0;i<zombies.length;i++)` 在 V8 里已无显著差异（现代 JIT 都能识别数组迭代协议）；改动风险大、收益 < 0.5ms/s。

4. **不为 `drawZombie` 加 sprite 化改造**：单个僵尸 10–12 calls，20 僵尸 = 200 calls，远低于阈值；改 sprite 会让"僵尸种类扩展"成本上升（新增 kind 需要重画 sprite），维护成本大于收益。

5. **不给 `hasZombieAhead` 加空间分区**：30 植物 × 20 僵尸 = 600 距离判断/次 × 60 = 36000/s，仍是微不足道；引入网格分区会让新植物 / 新僵尸的接入成本翻倍。

6. **不合并 `cardCD` 与 `p.cd`**：README L89 明确警示这是"两个东西"，合并会引入语义混淆（卡片栏 CD 是 UI 层，`p.cd` 是实体层）。

7. **不启用 Canvas 3D 变换（`setTransform` 组合）**：本项目只用平移+旋转+缩放，`save/translate/rotate/restore` 组合已足够；`setTransform` 会绕过栈，调试时难以追踪。

8. **不缓存"未命中"的 fillText**（例如分数变化的数字）：这类文字变化频繁，缓存命中率低，反而多一套脏标记维护成本。见 §4.1 的"值变化"字段清单。

9. **不改 `console.log` 为条件日志**：`setState` 的日志对调试"突然退出"问题至关重要（README L73）；生产可考虑加 `VERBOSE` 开关，但功能未验证前不动。

10. **不引入外部字体**：Canvas 2D 用系统字体（`Microsoft YaHei` / `Impact`）已足够；引入 woff2 违反零外部资产（ADR-001）。

11. **不预生成菜单背景**：菜单每帧只跑一次 drawMenu，且菜单态 draw calls ≈ 60，远低于阈值；引入离屏缓存反增维护成本。

12. **不给 `drawSun` 加"光线动画"的离屏缓存**：sun 的光线随 `e.t` 旋转，属于动态绘制；缓存主体 + 每帧重画光线是折中方案，但收益 < 2ms/s，不划算。

---

## 6. 优先级总结

按 ROI 排序，若真要动，只做前 2 项即可：

| 排名 | 优化 | 预期 CPU 节省 | 复杂度 | 风险 |
|---|---|---|---|---|
| 1 | **§4.1 HUD 静帧检测** | 25–40 ms/s | 中 | 中 |
| 2 | **§4.2 静态草坪离屏缓存** | 5–8 ms/s | 低 | 低 |
| 3 | **§4.6 fillText 缓存到离屏 canvas** | 15–25 ms/s（与 4.1 部分重叠） | 中 | 低 |
| 4 | **§4.5 noise 缓冲预生成** | 20–40 ms/s | 低 | 低 |
| 5 | **§4.4 渐变对象 sprite 缓存** | 10–15 ms/s | 中 | 中 |
| 6 | **§4.3 子弹/粒子对象池** | 1–5 ms/s | 高 | 高（暂缓） |

**当前建议**：不启动任何优化。以上 CPU 节省总计 < 150ms/s，占比 < 2% 单核 CPU 时间，用户感知不到差异。**若用户明确要求"打磨手感"（README L189），先做 §4.1 + §4.2**，可感知的流畅度提升约 5–10%。

<!-- PERF-BENCH:AUTO:START -->

---

## 7. 实测基准（无头 · 本段由 `node tests/perf/bench.js` 自动生成，请勿手改）

- **测试日期**：2026-09-20 23:10 UTC　·　**任务**：V11-11（KNOWN-ISSUES #8 回填）· 作者：程基岩
- **环境**：Node v22.22.2 · win32 x64 · Intel(R) Core(TM) i3-10110U CPU @ 2.10GHz × 4
- **方法**：复用 harness 无头加载套路（抽 `<script>` + vm sandbox + 同一份探针后缀），
  ctx 换成计数代理（每个方法调用计 1 次 draw call，口径与 §1.1 一致）；
  每帧 = 消费 rafQueue 真 loop handler（update + render 全链路），dt 恒定 16.7ms；
  `process.hrtime.bigint()` 包帧计时。每场景 100 帧预热 + 600 帧采样，seed=20260918。
- **场景口径**（A–C 对齐 §1.2–§1.4；D 为 V12 新增，v1.2-plan S3/M7 专项）：
  - A · L1 空场：开局无实体（自然阳光照常）；
  - B · L1 中期：6 植物 + 10 僵尸逼近；
  - C · L3 末波：night 滤镜，12 植物 + 25 僵尸（含 2 bucket）+ 3 阳光，子弹与战斗粒子由植物真实开火产生。
  - D · L4 末波（地狱难度）：水景渲染 + night 滤镜口径，15 植物（含 2 睡莲垫）+ 30 僵尸（含 2 bucket，
    地狱 hp 1008）+ 3 阳光；类型构成对齐 L4 W8 双桶压轴（GDD E10）。注入僵尸含已入水位（触发 splashed/涟漪稳态）。
- **受控失真（为稳态采样，全部披露）**：注入僵尸 hp×3（推迟死亡判定，不影响
  update/draw 路径）；阳光 stayT 周期归零、战斗粒子不足 10 补足（对抗自然消亡）；
  模拟时长 ≈11.7s < 首波门槛 12s，采样窗内无波次/预警干扰。

| 场景 | p50 (ms) | p95 (ms) | max (ms) | mean (ms) | p95 预算占比 | draw calls 全口径(中位) | draw calls 估算口径(中位) | 静态估算 | 估算口径偏差 |
|---|---|---|---|---|---|---|---|---|---|
| A · L1 空场（开局无实体） | 0.11 | 0.27 | 0.98 | 0.15 | 2% | 448 | 304 | 155 | +96.1% |
| B · L1 中期（6 植物 + 10 僵尸） | 0.27 | 0.59 | 1.49 | 0.35 | 4% | 1034 | 702 | 605 | +16.0% |
| C · L3 末波（12 植物 + 25 僵尸含 bucket） | 0.50 | 0.98 | 3.31 | 0.60 | 6% | 1747 | 1203 | 1009 | +19.2% |
| D · L4 末波地狱（15 植物 + 30 僵尸含双桶，水景） | 0.54 | 1.18 | 2.89 | 0.67 | 7% | 2047 | 1359 | — | —（新场景无估算） |
| E · L5 末波地狱（15 植物 + 30 僵尸含双桶，屋顶） | 0.86 | 1.85 | 4.38 | 1.06 | 11% | 2778 | 1460 | — | —（新场景无估算） |

**判级（无头口径）**：PASS。

**方法局限**：无头计数 ctx 不做光栅化/文本布局/抗锯齿，GPU 与排版成本为 0，
帧耗时是「JS 逻辑 + 调用编排」的乐观下限（**无头计数 ≠ 真机 DevTools 实测**，
真机复核留待发布后）。draw call 给出双口径：「全口径」含 beginPath/moveTo 等纯
路径构建；「估算口径」对齐 §1.1（剔除纯路径构建），与静态估算直接可比。

<!-- PERF-BENCH:AUTO:END -->
