# PvZ Lite · 主架构

- **单文件**：`plants-vs-zombies.html`（≈ 1400 行 JS）
- **技术栈**：原生 HTML + Canvas 2D + WebAudio 合成音效（详见 ADR-001 / ADR-003）
- **零依赖、零构建、零外部资产**：双击 HTML 即玩
- **目标平台**：PC 浏览器（桌面 Chrome / Edge / Firefox / Safari）
- **主循环**：`requestAnimationFrame(loop)` 单循环 + 整帧 try/catch 异常隔离（详见 ADR-002）

---

## 1. 总体架构图

```
                        ┌──────────────────────────────────────┐
                        │        plants-vs-zombies.html        │
                        │        (single file, zero-dep)       │
                        └──────────────┬───────────────────────┘
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       │                               │                               │
┌──────▼───────┐              ┌────────▼────────┐              ┌───────▼────────┐
│   <style>    │              │    <canvas>     │              │    <div bar>   │
│  CSS 内联     │              │  1000 × 680     │              │  状态文本+按钮  │
│  ~20 行      │              │  Canvas 2D 后端  │              │  pause/fast/  │
│  布局/样式    │              │  渲染唯一出口    │              │  mute/reset    │
└──────────────┘              └────────┬────────┘              └───────┬────────┘
                                       │                               │
                          ┌────────────▼───────────────────────────────▼─────┐
                          │               <script> 主程序 (~1400 行)          │
                          └────────────┬─────────────────────────────────────┘
                                       │
              ┌────────────────────────┼───────────────────────────┐
              │                        │                           │
     ┌────────▼────────┐    ┌──────────▼────────┐    ┌────────────▼────────┐
     │   配置层 Config  │    │    时钟 & 状态机   │    │     输入层 Input     │
     │                 │    │                   │    │                     │
     │ COLS/ROWS/CELL_*│    │ loop(now)         │    │ onClick(x,y)        │
     │ DIFFS           │    │   └─ gt += sdt    │    │ onKey(e)            │
     │ LEVELS[1..2]    │    │   └─ update(sdt)  │    │ bindBtn(id, fn)     │
     │ CARDS[0..5]     │    │   └─ render()     │    │                     │
     │ STATS (in newW) │    │ setState(s, why)  │    │                     │
     └────────┬────────┘    └────────┬──────────┘    └──────────┬──────────┘
              │                      │                          │
              └──────────────┬───────┴──────────────────────────┘
                             │
              ┌──────────────▼──────────────────────┐
              │          实体层 Entities             │
              │                                     │
              │  plants[]  ·  zombies[]             │
              │  projectiles[]  ·  effects[]        │
              │                                     │
              │  plants:  向日葵/豌豆/双发/西瓜/      │
              │           坚果/地瓜（6 类）           │
              │  zombies: normal/cone/fast/bucket   │
              │  projectiles: pea/melon + splash    │
              │  effects: sun/particle/boom         │
              └──────────────┬──────────────────────┘
                             │
              ┌──────────────┼───────────────┐
              │              │               │
     ┌────────▼───────┐ ┌───▼──────┐ ┌──────▼────────┐
     │  更新层 Update │ │ 渲染层     │ │  音频层 Audio  │
     │               │ │ Render    │ │               │
     │ update(dt)    │ │ render()  │ │ ac() 惰性上下文│
     │  ├─ updatePlant│ │  ├─draw- │ │ tone() 合成     │
     │  ├─ update-   │ │  │  World │ │ noise() 噪声   │
     │  │  Project-  │ │  ├─draw- │ │ sfxGate 节流    │
     │  │  ions      │ │  │  Card │ │ SFX 表 12 种   │
     │  ├─ update-   │ │  ├─draw- │ │ try/catch 兜底 │
     │  │  Zombies   │ │  │  Status│ └───────────────┘
     │  ├─ checkWave │ │  ├─draw- │
     │  ├─process-   │ │  │  Wave │
     │  │  SpawnQueue│ │  └─draw- │
     │  └─ filter()  │ │     End  │
     └───────────────┘ └──────────┘
                             │
              ┌──────────────▼──────────────────────┐
              │     元层 Meta（异常/暂停/退出）       │
              │                                     │
              │  frameErr/frameErrT 整帧异常隔离     │
              │  toast/toastT 临时消息                │
              │  exitArm 二次确认退出                 │
              │  paused/gameSpeed 加速/暂停           │
              │  warn 大波预警 4s                     │
              └─────────────────────────────────────┘
```

### 三层数据流

```
输入 → 更新 → 渲染 → 显示
  │       │       │
  │       │       └─── render() 读实体状态 + 时钟 gt 画一帧
  │       └────────── update(dt) 改实体状态；被 setState/setPaused 事件驱动
  └────────────────── onClick / onKey 改 selected / paused / state
```

**关键约束**：渲染层永远只读、不写；更新层永远只写、不读 Canvas；输入层永远只改状态标志位，不直接触碰实体数组。

---

## 2. 模块清单

单文件架构下"模块"以**逻辑分层**划分（见架构图）。以 `plants-vs-zombies.html` 行号区间标注。

### 2.1 配置层 Config（L35–L96）
| 常量 | 值 | 说明 |
|---|---|---|
| `COLS / ROWS` | 9 / 5 | 草坪网格 |
| `CELL_W / CELL_H` | 90 / 104 | 格子像素 |
| `GRID_X / GRID_Y` | 55 / 80 | 网格原点 |
| `ROAD_W` | 90 | 右侧道路宽 |
| `CARD_H / CARD_W / CARD_GAP` | 78 / 98 / 4 | 卡片栏 |
| `CARD_Y` | `680-CARD_H-2 = 600` | 卡片栏 y |
| `SHOVEL_X / SHOVEL_W` | 6 / 62 | 铲子槽 |
| `CARD_X0` | `6+62+8 = 76` | 卡片栏起始 x |
| `DIFFS` | 3 档 | 普通 / 困难 / 地狱 |
| `LEVELS` | 2 关 | L1 白天 / L2 黄昏 |
| `CARDS` | 6 张 | sunflower/pea/mine/nut/double/melon |

**规则**：所有跨函数使用的坐标 / 尺寸 / 数量必须走常量，禁止写死。见 README L122「卡片栏右移时命中判定必须同步改」—— `CARD_X0` 是唯一事实源。

### 2.2 状态层 State（L99–L111）
- `state`：`'menu' | 'play' | 'end'`，只能通过 `setState(s, why)` 修改。
- `sun / score / wave / lastWaveT / sunFallT`：对局计数器。
- `selected`：当前选中的卡片或铲子。
- `paused / gameSpeed / won`：控制位。
- `gt`：游戏逻辑时钟（秒）。**外置于 `loop()`**，见 ADR-002。
- `plants / zombies / projectiles / effects`：四类实体数组。
- `cardCD`：卡片栏冷却表（与 `p.cd` 是两个东西，见 README L89）。
- `toastMsg / toastT / exitArm`：UI 元层。

### 2.3 主循环 & 状态机（L225–L260）
- `loop(now)`：RAF 入口；`dt = min(0.05, (now-lastT)/1000)`；整帧 try/catch。
- `setState(s, why)`：状态切换唯一入口，带控制台日志。
- `drawFrameErr()`：底部 26px 红色异常条，`frameErrT` 5s 后消失。

### 2.4 输入层 Input（L262–L444）
- `onClick`：分区域命中（菜单 / 结算 / 卡片栏 / 阳光 / 格子）；坐标归一化。
- `onKey`：绑 `window`（不是 canvas，见 README L181）；`1-6` / `X` / `Space` / `F` / `M` / `R` / `Esc`。
- `bindBtn(id, fn)`：按钮点完主动 blur，防 Space 二次触发。
- `onClickMenu / onClickEnd`：菜单与结算子路由。

### 2.5 更新层 Update（L522–L736）
- `update(dt)` 主入口，顺序：effects → cardCD → plants → spawnQueue → projectiles → zombies → checkWave。
- `updatePlant` 分类型处理：sunflower 产阳光、pea/double/melon 攻击、mine 埋雷→引爆。
- `updateProjectiles` 反向迭代，命中检测 O(N·M)。
- `updateZombies` 遍历僵尸 + 遍历植物 → 寻找可吃目标；死亡用 `_dying` 标记法 + 反向 splice（**绝不在 for...of 里 splice**，见 README L89）。
- `checkWave` 处理波次推进、大波预警、通关判定。

### 2.6 渲染层 Render（L738–L1394）
- `render()` 主入口，分 `menu / play / end` 三态。
- 子函数：`drawMenu / drawGameWorld / drawCardBar / drawStatus / drawWaveWarn / drawPause / drawEnd / drawToast`。
- 实体绘制：`drawPlant / drawZombie / drawProjectile / drawSun / drawParticle / drawBoom / drawShovelIcon / drawCardFace`。

### 2.7 音频层 Audio（L145–L223）
- `ac()` 惰性 AudioContext 上下文。
- `tone(freq, dur, opts)`：Oscillator + Gain + 可选 exponentialRamp。
- `noise(dur, opts)`：BufferSource + BiquadFilter（低通 / 高通可选）。
- `sfxGate`：节流表，防密集事件糊音。
- `SFX` 表 12 种音效，全用 try/catch 包裹。

### 2.8 元层 Meta
- `frameErr/frameErrT`：整帧异常捕获。
- `toast(toastMsg, toastT)`：临时消息条。
- `requestExit(byWhat)`：对局中二次确认退出。
- `warn`：大波预警状态机。
- `sfxGate`：音效节流表。

---

## 3. 依赖关系

```
                 ┌────────────┐
                 │  DOM / CSS │ (布局、按钮)
                 └─────┬──────┘
                       │ 事件
              ┌────────▼────────┐
              │   Input 层      │
              └────────┬────────┘
                       │ 改 selected / state / paused
              ┌────────▼────────┐
              │   State 层       │◀── setState(s, why)
              └──┬──────────┬───┘
                 │          │
       ┌─────────▼──┐   ┌──▼──────────┐
       │ Update 层  │   │  Audio 层    │
       └────┬───────┘   └─────────────┘
            │ 改 entities
            │
       ┌────▼───────┐
       │ Entities   │
       └────┬───────┘
            │ 读
       ┌────▼───────┐
       │ Render 层  │── 读 gt / state / warn / paused
       └────┬───────┘
            │
       ┌────▼───────┐
       │  Canvas 2D │ (浏览器内置)
       └────────────┘
```

**核心依赖不变量**：
1. `Update` 与 `Render` 不互相调用；两者只通过 `entities` + `gt` 通信。
2. `Input` 只改 `selected / state / paused / gameSpeed` 等状态位，不直接 push/splice 实体数组。
3. `Audio` 不读任何游戏状态，只被动接收 `SFX.xxx()` 调用。
4. 所有 `setState` 调用必须走 `setState(s, why)`，禁止直接 `state = 'xxx'`（README L72）。

---

## 4. ADR 交叉引用

| ADR | 决策 | 影响的模块 |
|---|---|---|
| **ADR-001** · 单文件零构建 | 单 HTML + 零依赖 + 零构建 | 全项目形态；`Config` 与 `State` 共享同一作用域 |
| **ADR-002** · RAF 主循环 + `gt` 外置时钟 | `loop()` 内累加 `gt`；整帧 try/catch；`sdt = dt × gameSpeed` | `State.gt`、`Update.update()`、无头测试 `__api.tick()` |
| **ADR-003** · Canvas 2D + WebAudio 合成 | 单 canvas + 无外部资产；`ac()` 惰性 + try/catch 降级 | `Render` 层全部；`Audio` 层全部 |

---

## 5. 与 README 的对应关系

| README 章节 | 对应本文档位置 |
|---|---|
| L66–L94 「架构要点」 | §1 架构图 + §2.2 状态层 + §2.3 主循环 |
| L126–L145 「无头测试方法」 | ADR-001 后果 · 3；ADR-002 后果 · 4 |
| L172–L182 「已知陷阱」 | ADR-002 后果 · 2；§2.1 Config 规则 |
| L184–L195 「待办 / 可扩展方向」 | 各 ADR 的「触发复审信号」 |
| L199–L205 「变更记录」 | 各 ADR 的历史决策依据 |

---

## 6. 性能概览

详见 `perf-profile.md`。摘要：

| 场景 | draw calls / 帧 | 主瓶颈 |
|---|---|---|
| 空草坪 | ~150 | HUD 每帧重画 |
| 满草坪 30 植物 | ~700 | `fillText` + 卡片栏 |
| 大波 20 僵尸 + 10 子弹 + 30 粒子 | ~1400 | `save/restore` + `createRadialGradient` |

**结论**：所有场景距 60fps 上限仍有 10 倍以上余量；**当前规模不值得**做重优化，仅 HUD 静帧检测与静态草坪离屏缓存有实际 ROI。
