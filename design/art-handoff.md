# PvZ Lite · 美术与手感 Handoff

- 作者：林绘澄（art-director · Phase 6）
- 状态：v1 · 2026-09-15
- 适用范围：`plants-vs-zombies.html`（1401 行，Canvas 2D 单文件，1000×680）
- 定位：**PC 浏览器 · Lean 打磨**（不引入移动端 / 桌面端 / 引擎）
- 交接对象：engineering-lead（实施）、quality-lead（验收）、audio-director（音效对齐）

---

## 目录

- A. 视觉身份（Visual Identity Nine-Section）
  - A.1 视觉锚点
  - A.2 色彩体系
  - A.3 造型语言
  - A.4 光照与阴影
  - A.5 材质 / 纹理策略
  - A.6 排版与字体
  - A.7 图标语言
  - A.8 视觉层级
  - A.9 视觉缺陷清单
- B. 手感动画规格（Feel & Juice）
  - B.1 种植动画
  - B.2 僵尸死亡掉零件
  - B.3 爆炸冲击波
  - B.4 屏幕震动
  - B.5 阳光收集
  - B.6 大波预警视觉
- C. 可访问性分级
- D. 资产清单（硬编码登记表）

---

## A. 视觉身份（Visual Identity Nine-Section）

### A.1 视觉锚点（一句话）

> **"手绘卡通阳光草坪，方块像素化僵尸从右侧压来 —— 卡通治愈 vs 卡通诡异。"**

**支撑关键词**：手绘卡通（hand-drawn cartoon）· 高饱和暖色（sunlit green / honey gold）· 扁平 2D（no 3D perspective）· 圆融几何（soft geometry）· 微表情（whimsical facial features）

**参考坐标系**：
- PvZ 原版 1.0 的草坪白天场景（配色饱和度 -15%）
- 迪士尼早期 2D 动画的"胖椭圆人体"简化法
- *不参考*：PvZ 2、塔防类硬核写实、暗黑风格

**在代码中的落点**：
- 草坪棋盘 `#88c250/#77b042`（`drawGameWorld` L795）
- 向日葵 `#ffce3a` 花瓣 + `#5a3a1a` 盘心（`drawPlant` L887）
- 僵尸绿灰 `#5a6a4a` + 死皮色 `#c5d0a0`（`drawZombie` L1006、L1009）

### A.2 色彩体系

**色域总原则**：**暖黄绿主导 + 冷灰点缀**。整盘色温偏暖（~5800K），黄昏关偏红橙（~3500K）。饱和度中高，避免接近纯饱和。

#### 主色（Primary）

| Token | 值 | 用途 | 当前代码位置 |
|---|---|---|---|
| `--lawn-lit` | `#88c250` | 草坪亮格（L1） | `LEVELS[1].lawn[0]` L57 |
| `--lawn-shade` | `#77b042` | 草坪暗格（L1） | `LEVELS[1].lawn[1]` L57 |
| `--lawn-dusk-lit` | `#7fb04a` | 黄昏草坪亮格 | `LEVELS[2].lawn[0]` L71 |
| `--lawn-dusk-shade` | `#6e9c3d` | 黄昏草坪暗格 | `LEVELS[2].lawn[1]` L71 |
| `--sun-gold` | `#ffce3a` | 阳光、卡片造价数字、HUD 强调 | L124, L1151, L1266 |
| `--soil-deep` | `#3a2418` | 房子墙、卡片槽边框、大标题阴影 | L820, L1116, L1279 |
| `--zombie-skin` | `#c5d0a0` | 僵尸皮肤 | L1009 |

#### 辅色（Secondary）

| Token | 值 | 用途 |
|---|---|---|
| `--wood-mid` | `#8b6528` | 坚果、木柄、卡片底色 |
| `--wood-light` | `#c9a34a` | 卡片/按钮/进度条高亮 |
| `--grass-leaf` | `#4a8a2a` | 豌豆/双发茎叶主色 |
| `--grass-leaf-lit` | `#6aa43a` | 豌豆/双发茎叶高光 |
| `--melon-deep` | `#3a8a1a` | 西瓜主体 |
| `--mine-magenta` | `#a0446a` | 地瓜粉紫（**关键色盲差异化**） |
| `--cone-orange` | `#d97b2a` | 路障僵尸锥帽 |
| `--bucket-steel` | `#b0b0b0` | 铁桶僵尸铁皮 |
| `--fast-red` | `#c04040` | 快速僵尸红腰带 |

#### 点缀 / 警示色（Accent）

| Token | 值 | 用途 |
|---|---|---|
| `--danger-red` | `#f63` | 血条低血、铲子误选提示 |
| `--heal-green` | `#3b3` / `#4a4` | 血条正常段 |
| `--warn-red` | `rgb(255,80,50)` | 大波预警描边（`drawWaveWarn` L767） |
| `--warn-red-deep` | `rgba(140,0,0,α)` | 大波预警全屏压暗 |
| `--toast-border` | `#ffd54a` | Toast 边框 |
| `--ui-cream` | `#e8dcc0` | 未选中文字 |
| `--ui-muted` | `#c8b98a` | HUD 次要文字 |

#### 色域范围（HSL 约束，用于代码审查）

- 草坪绿：**H 60–140, S 35–65%, L 45–70%**
- 阳光金：**H 45–55, S 85–100%, L 55–70%**
- 土壤褐：**H 25–40, S 40–65%, L 12–35%**
- 僵尸皮：**H 60–80, S 15–35%, L 65–78%**（低饱和冷绿灰）
- **禁止**：纯 R/G/B 单通道满值；纯黑 `#000`（除眼睛、文本，其余用 `#1a1005` 或 `#241810`）
- **禁止**：紫色系 `#6a00a0` 附近（会与地瓜 `#a0446a` 冲突）

### A.3 造型语言

#### 几何基础

| 元素类型 | 几何 | 备注 |
|---|---|---|
| 植物身体 | 竖向椭圆（`ellipse`）为主 | 高/宽比 1.1–1.5:1 |
| 植物叶片 | 扁椭圆（`ellipse` 旋转） | 10–14 px 长轴 |
| 僵尸身体 | 圆角矩形（`fillRect` + 后续圆角化） | 目前**未圆角**，见缺陷 D-11 |
| 僵尸头 | 正圆（`arc`） | r=18 |
| 子弹 | 正圆 + 径向渐变 | r=9（pea）/ r=14（melon） |
| 阳光 | 正圆 + 8 条放射线 | r=18 + 放射 r=20~26 |
| 卡片槽 / 按钮 | 矩形（**待圆角化**） | 目前**全部直角**，见缺陷 D-12 |
| HUD 面板 | 半透明黑矩形 | 建议改 6px 圆角与页面 `<canvas>` `border-radius:6` 对齐 |

#### 圆角半径（Radius Tokens）

目前代码**只有 CSS 有圆角**（`#canvas{border-radius:6px}`、按钮 `border-radius:3px`），**Canvas 内部所有矩形都是直角**。建议统一：

| Token | 值 | 用途 |
|---|---|---|
| `--radius-sm` | 4px | 卡片内小元素、进度条 |
| `--radius-md` | 8px | 卡片槽、HUD 面板、Toast |
| `--radius-lg` | 12px | 按钮（菜单、结束页） |
| `--radius-full` | 50% | 圆形按钮（未来的加速、静音按钮） |

**实施建议**：新增 `ctx.roundRect` 封装（现代浏览器已原生支持，2023 起 Chrome 99 / Firefox 113 / Safari 16 支持，本项目目标是 PC 浏览器，可放心使用），或退化到 `Path2D` + arcTo。

#### 描边策略

- **卡通主体**（植物、僵尸、卡片、按钮）：**2 px 深褐描边 `#3a1a0a`**（已用于菜单按钮 L1280，未用于卡片槽，见缺陷 D-12）
- **HUD 面板**：**无描边**，仅靠半透明黑色底 + 内边距
- **警示描边**（铲子误选、种植预览）：**2–3 px**，红色（误选）或白色（普通预览）
- **大波预警描边**：**3 px 亮红 `rgba(255,80,50,α)`**，α 随脉冲 0.5–1.0
- **标题外描边**（"一大波僵尸即将来临！"）：**7 px 深褐**（L773），符合"卡通贴纸字"审美
- **禁止**：白色描边（会与卡片白框冲突）、超过 3 px 的粗描边用于小元素（≤24px 尺寸）

### A.4 光照与阴影

#### 当前实现

- **光源方向**：所有阴影/高光都在**"上方偏左"** → 光源假设：**左上 45° 顶光**
- **平面阴影**：所有实体脚下都有 `ellipse` 椭圆阴影（`drawPlant` L883、`drawZombie` L1004、`drawProjectile` L1046、L1055）
- **径向渐变**：用于阳光（L1074）、豌豆子弹（L1048）、西瓜子弹（L1057）、爆炸（L1106）
- **线性渐变**：用于黄昏滤镜（L804）、大波预警横幅（L760）、菜单背景（L1253）
- **无**：真实 shadowBlur（Canvas 2D `ctx.shadowBlur`）**从未使用**

#### 改进方向

| 现状 | 建议 | 优先级 |
|---|---|---|
| 阴影只是半透明椭圆，未跟随光源方向偏移 | 阴影偏移 `+4, +6` px，与光源方向一致 | P2 |
| 植物阴影统一 `rgba(0,0,0,0.2)`，未区分受光面 | 黄昏关阴影 alpha 降到 0.15，色调偏紫 | P3 |
| 爆炸无闪光层 | 爆炸首帧加 200 ms 白色闪光全屏 alpha 0.25 | P1（见 B.3） |
| 子弹无拖尾 | pea 加 3 层透明度衰减拖尾，melon 加 2 层 | P2（见 B.10 补充） |
| 全屏无色调滤镜 | 黄昏关在结束 30% 时叠加 `rgba(255,120,60,0.08)` 后处理 | P3 |

**性能注意**：`ctx.shadowBlur` 在现代浏览器仍慢（比手动椭圆阴影慢 3–5×），**保持手动阴影方案**。

### A.5 材质 / 纹理策略

**项目约束**：零依赖单文件，Canvas 2D 程序化绘制。**不使用位图纹理**。

#### 当前纹理化手段

| 手段 | 用途 | 位置 |
|---|---|---|
| 径向渐变 | 阳光、爆炸、豌豆、西瓜 | L1074, L1106, L1048, L1057 |
| 线性渐变 | 菜单背景、黄昏滤镜、大波横幅 | L1253, L804, L760 |
| 棋盘格 | 草坪明暗格 | L797-801 |
| 重复小图形 | 西瓜斑点、向日葵花瓣 | L938-941, L888-891 |
| 半透明叠加 | 影子、Toast、Pause、End 遮罩 | 全局 |

#### 建议新增（**不引入文件**）

- **程序化噪点**（用于土壤、金属）：在 `init` 时生成 128×128 的 noise Canvas，用 `ctx.createPattern()` 复用。示例：
  ```js
  const noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = noiseCanvas.height = 128;
  const nctx = noiseCanvas.getContext('2d');
  const img = nctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 220 + (Math.random() * 35 | 0);
    img.data[i] = img.data[i+1] = img.data[i+2] = v;
    img.data[i+3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  const soilPattern = ctx.createPattern(noiseCanvas, 'repeat');
  ```
- **铁桶反光扫过**（bucket zombie）：在铁桶顶部加 4 px 宽的白色高光带，随 `z.walk` 缓慢横向移动。**P3 可选**。

#### 禁止

- **不使用** `ctx.filter`（Firefox/Chrome 不一致，Safari 需降级）
- **不引入** SVG / PNG / base64 位图（违背零依赖）
- **不生成** 60+ 次 `createPattern` / `createLinearGradient` 每帧（渐变对象应缓存到模块级）

### A.6 排版与字体

#### 字体栈

| 用途 | 当前 | 建议 |
|---|---|---|
| 正文 | `"Microsoft YaHei","PingFang SC",sans-serif` | 保持，PC 浏览器覆盖率高 |
| 标题（大字） | `"Impact","Microsoft YaHei",sans-serif` | 保持，Impact 是 Windows 标配，缺失时退到雅黑 |
| **数字（HUD / 卡片造价 / 波次）** | 混用 `sans-serif` 与 雅黑 | **统一为 `"Consolas","Menlo",monospace`**（等宽，避免数字跳动） |
| 错误日志 | `"Consolas",monospace` | 保持 |

#### 字号 / 字重 Token

| Token | 值 | 用途 |
|---|---|---|
| `--fs-display` | `bold 76px` | 菜单标题 |
| `--fs-title-xl` | `bold 68–72px` | 结束页标题 |
| `--fs-title-l` | `bold 48px` | 大波横幅、暂停标题 |
| `--fs-title-m` | `bold 26px` | 菜单"开始游戏" |
| `--fs-h1` | `bold 20px` | 关卡 / 难度按钮文字 |
| `--fs-h2` | `bold 16px` | 卡片槽标签 |
| `--fs-body` | `14px` | 卡片名、辅助说明 |
| `--fs-caption` | `12px` | HUD 次要、卡片造价 |
| `--fs-hud-num` | `bold 20px monospace` | HUD 阳光数字 |
| `--fs-hud-huge-num` | `bold 48px monospace` | 未来：分数爆炸数字 |

#### 排版规则

- **中文与数字之间加空格**：`波次 ${wave}` 保持（L1232）
- **数字使用等宽字体**：HUD 阳光、卡片冷却倒计时、大波倒计时 —— **这是最容易实现的高性价比优化**
- **`textAlign` 与 `textBaseline` 必须成对设置**（当前代码偶有漏设，见缺陷 D-16）
- **禁用** `letter-spacing`（Canvas 2D 无此属性，勿引入 CSS 混用）

### A.7 图标语言

#### 现有图标

| 图标 | 用途 | 位置 | 类型 |
|---|---|---|---|
| 🌞 | HUD 阳光前缀（DOM） | HTML L24 | Unicode emoji |
| ⏸ / ⏩ / 🔊 / 🔇 / 🔄 | 底部控制按钮（DOM） | HTML L26-29 | Unicode emoji |
| 🔒 | 锁定关卡图标 | 菜单 Canvas L1283 | Unicode emoji |
| 🎉 | 通关庆祝 | 结束页 L1392 | Unicode emoji |
| 铲子 | 铲子槽图标 | `drawShovelIcon` L859 | Canvas 手绘 |
| 各种植物/僵尸 | 卡片面 + 场上 | `drawCardFace`/`drawPlant`/`drawZombie` | Canvas 手绘 |

#### 风格统一性问题（缺陷 D-15）

- **DOM emoji 与 Canvas 手绘图标风格割裂**：emoji 由操作系统渲染，风格随系统（Windows Segoe UI Emoji vs macOS Apple Color Emoji 差异明显）
- **建议**：Phase 7 起把关键图标（铲子、锁、暂停/加速/静音/重来）全部改成 Canvas 手绘，DOM 只留文字。短期方案：给 `<button>` 加 `font-family:'Segoe UI Emoji','Apple Color Emoji',sans-serif`，至少让两平台一致退化。

#### 图标网格（Icon Grid）

- **基础网格**：24×24 逻辑像素（对应画布约 1.5× 显示）
- **安全区**：内容占 20×20，边距 2
- **线宽**：1.5–2 px（`drawShovelIcon` 目前混合 3–5 px，偏粗，见缺陷 D-17）
- **对齐**：所有图标围绕中心 `(12, 12)` 居中

### A.8 视觉层级

画布 1000×680，从上到下共 **6 层**：

| 层 | Y 范围 | 内容 | 绘制函数 |
|---|---|---|---|
| 远景（Sky） | 0–80 | 天空 / 房子墙、菜单背景 | `drawGameWorld` L819-829 / `drawMenu` |
| 中景-地形（Ground） | 80–600 | 草坪棋盘 + 右侧道路 | `drawGameWorld` L797-818 |
| 中景-实体（Entities） | 80–600 | 植物、僵尸、子弹、阳光、粒子、爆炸 | `drawPlant`, `drawZombie`, `drawProjectile`, `drawSun`, `drawParticle`, `drawBoom` |
| 前景 HUD（Bottom Bar） | 600–678 | 卡片栏 + 铲子槽 | `drawCardBar` L1115 |
| 前景 HUD（Top） | 0–58 | 阳光计数、波次分数、按键提示 | `drawStatus` L1217 |
| 顶层覆写（Overlay） | 全屏 | Toast、大波横幅、暂停遮罩、结束页 | `drawToast`, `drawWaveWarn`, `drawPause`, `drawEnd` |

**层级铁律**（实施时严格遵守）：
1. **Z 轴顺序**：草坪 → 影子 → 实体（按 Y 排序）→ 子弹 → 粒子 → 阳光 → 爆炸 → HUD → Overlay
2. **僵尸与植物**：目前**未按 Y 排序**（`plants` 先画、`zombies` 后画，L845-847），意味着**同一行僵尸永远在植物前**，跨行时可能遮挡错位。建议按 `y` 从大到小排序再画（Y 大者画在前）。
3. **alpha 衰减顺序**：`ctx.save()` 内设置 alpha，`ctx.restore()` 结束，**避免污染后续绘制**（当前大部分正确，但 `drawParticle` L1094 手动 save/restore 是对的样板）。
4. **暂停 / 结束 遮罩**必须 alpha 0.55–0.7（L1322, L1333），不可更低（否则读不清）。

### A.9 视觉缺陷清单

**共 18 项**。按优先级 P0（严重 / 影响可读性）→ P1（影响手感）→ P2（影响品质）→ P3（可选打磨）分类。

| ID | 严重度 | 位置（函数·行号） | 缺陷 | 建议 |
|---|---|---|---|---|
| D-01 | P1 | `drawPlant` L880-995 | 植物**无待机动画**（idle），种下即静止不动 | 见 B.9 idle 动画 |
| D-02 | P1 | `killZombie` L683 | 死亡只喷一次 `spawnBurst`，**无尸体分块 / 淡出**，僵尸瞬间消失 | 见 B.2 |
| D-03 | P1 | `drawBoom` L1101 | 爆炸仅单圈径向渐变，**无冲击波环 / 首帧闪光 / 屏幕震动** | 见 B.3, B.4 |
| D-04 | P1 | `drawSun` L1069 | 阳光从顶部直线坠落，**收集时直接消失**，无吸引轨迹 / 缩放爆散 | 见 B.5 |
| D-05 | P1 | `drawWaveWarn` L752 | 大波预警只有红色横幅，**无屏幕震动 / 全屏红脉冲 / 倒计时最后 1 秒增强** | 见 B.6 |
| D-06 | P2 | `drawZombie` L997 | 僵尸行走只有整体 rotate 微摆（`wob=Math.sin(z.walk)*0.06`），**无手臂摆动 / 脚部动画**，走路像滑行 | 见 B.8 |
| D-07 | P2 | `drawZombie` L1015-1018 | 啃食时**嘴动幅度只有 2–4 px**，无身体抽搐 / 前倾 | 见 B.8 |
| D-08 | P2 | `drawProjectile` L1044 | 子弹**无拖尾 / 无运动模糊** | pea 加 3 层拖尾、melon 加 2 层 |
| D-09 | P2 | `drawCardBar` L1134-1161 | 卡片选中**无抬起弹跳**，无阴影，视觉反馈弱 | 见 B.7 |
| D-10 | P2 | `drawCardBar` L1154-1160 | 卡片冷却**只有数字倒计时**，无环形进度条 / 半透明遮罩扫过 | 遮罩从下往上扫 |
| D-11 | P2 | 全局 | **Canvas 内所有矩形都是直角**（`fillRect` 未用 `roundRect`），与 CSS 圆角冲突 | 全项目 `roundRect` |
| D-12 | P2 | `drawCardBar` L1123-1127 | 卡片槽 / 铲子槽**无 `#3a1a0a` 卡通描边**（菜单按钮有，游戏内没有），风格不统一 | 补 2 px 描边 |
| D-13 | P2 | `drawGameWorld` L845-847 | 植物和僵尸**未按 Y 排序**渲染，跨行遮挡可能错位 | 按 y 从大到小排序 |
| D-14 | P3 | `drawStatus` L1223, L1232 | HUD 数字**未使用等宽字体**，数字跳动（`ctx.font='bold 20px sans-serif'`） | 换 Consolas |
| D-15 | P2 | 全局 | **DOM emoji 图标**与 Canvas 手绘图标风格割裂（见 A.7） | 后期统一为 Canvas 手绘 |
| D-16 | P3 | `drawStatus` 多处 | `textAlign` / `textBaseline` 漏设（L1223 未设 `textBaseline` 时依赖上一状态） | 每次 `fillText` 前强制成对设置 |
| D-17 | P3 | `drawShovelIcon` L863-877 | 铲子图标**线宽混合 3–5 px**，与其他 2 px 图标不协调 | 统一 2 px |
| D-18 | P3 | `drawMenu` L1252-1318 | 菜单背景**只有静态横条纹**，无粒子 / 无飘叶 / 无呼吸 | 加 3–5 片飘叶 |

---

## B. 手感动画规格（Feel & Juice）

**总原则**：所有动画时长**用 ms 表达**、缓动函数**用 CSS 命名**（`cubic-bezier` 直接可移植到 JS 插值）、参数**给具体数值**不给形容词。

**共享缓动函数库**（实施时封装到 `Easing` 对象）：

```js
const Easing = {
  linear:      t => t,
  easeOut:     t => 1 - Math.pow(1 - t, 2),
  easeOutCubic:t => 1 - Math.pow(1 - t, 3),
  easeOutBack: t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),  // 弹性过冲
  easeOutBounce:t => { // 弹跳
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1/d1) return n1*t*t;
    if (t < 2/d1) return n1*(t-=1.5/d1)*t + 0.75;
    if (t < 2.5/d1) return n1*(t-=2.25/d1)*t + 0.9375;
    return n1*(t-=2.625/d1)*t + 0.984375;
  },
  easeInQuad:  t => t * t,
  easeInOut:   t => t<0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2,
  easeOutElastic:t => { // 弹簧
    const c4 = (2*Math.PI)/3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2,-10*t)*Math.sin((t*10-0.75)*c4) + 1;
  },
};
```

### B.1 种植动画（Plant Drop-in）

**触发点**：`onClick` L352-355 中 `plants.push(...)` 之后。

**当前问题**：植物瞬间出现在格子中心，无任何反馈。

#### 时间轴（总时长 620 ms）

| 阶段 | 时间窗口 | 动作 | 缓动 |
|---|---|---|---|
| A · 卡片飞向格子 | 0–220 ms | 卡片图标从卡片槽位置（`cx=CARD_X0+i*CARD_W`, `y=CARD_Y+CARD_H/2`）飞向目标格中心 | `easeInOut` |
| B · 落地弹跳 | 220–340 ms | 从空中降到 `targetY+6px`（略低于目标）后向上弹 8 px | `easeOutBounce` |
| C · 缩放过冲 | 220–480 ms | 缩放曲线 `0.6 → 1.15 → 0.9 → 1.0` | 4 段 `easeOutBack` |
| D · 落地尘土 | 220–280 ms | 目标脚下喷 6–10 粒 `#8b6528` 粒子，`vy=-40~ -80`，`vx=-30~30` | linear + gravity 400 |
| E · 落定 | 480–620 ms | 微抖动衰减（振幅 2px→0），结束 | `easeOutCubic` |

#### 缩放曲线（scale 关键帧）

```
t(ms):  0    220   260   340   420   480   620
scale:  0.6   1.0   1.15   0.9    1.05   1.0    1.0
```

#### 数据结构改造

```js
// plants.push 前加：
{
  col, row, type, cd, sunT, armT, dur, maxDur,
  // 新增：
  plantT: 0,          // 从 0 到 620 累积
  plantFrom: {x: cx, y: CARD_Y + CARD_H/2},  // 卡片槽位置
  plantDone: false,
}
```

在 `drawPlant` 开头：
```js
if (p.plantT < 620) {
  p.plantT += dt * 1000;
  const t = Math.min(1, p.plantT / 620);
  const pos = gridToPos(p.col, p.row);
  let x = pos.x, y = pos.y, s = 1;
  if (t < 0.35) {
    // A 阶段：飞向格子
    const k = Easing.easeInOut(t / 0.35);
    x = p.plantFrom.x + (pos.x - p.plantFrom.x) * k;
    y = p.plantFrom.y + (pos.y - p.plantFrom.y) * k - Math.sin(k * Math.PI) * 80; // 抛物弧
    s = 0.6 + 0.4 * k;
  } else if (t < 0.78) {
    // C 阶段：缩放过冲
    s = 1.0 + Math.sin((t - 0.35) / 0.43 * Math.PI * 2) * 0.15 * (1 - (t - 0.35) / 0.43);
    y = pos.y - Math.max(0, (0.55 - t) / 0.2 * 8); // 落地反弹
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.translate(-x, -y);
  // 继续原有绘制（把 x, y 换成 0, 0 也可，或在此包一层）
  drawPlantInner(p);
  ctx.restore();
  return;
}
```

**性能注意**：`plantT` 只增不改，动画结束后 `p.plantDone = true`，之后走原路径，**不影响热路径**。

### B.2 僵尸死亡掉零件（Zombie Death Ragdoll）

**触发点**：`killZombie` L683 内部，在 `z.dead = true` 之后立即执行。

**当前问题**：僵尸从 `zombies` 数组里被 `filter` 移除后立刻消失，只有 18 粒红色粒子。

#### 规格

**零件定义**（**共 6 块**）：

| 块 | 局部位置（相对僵尸中心） | 尺寸 | 颜色 | 旋转初速度 |
|---|---|---|---|---|
| 头（head） | `(0, -18)` | r=18 圆 | `#c5d0a0` | ±180° /s |
| 身体左（body-l） | `(-8, 10)` | 12×20 矩形 | `#5a6a4a`（bucket 用 `#4a5a5a`） | ±120° /s |
| 身体右（body-r） | `(8, 10)` | 12×20 矩形 | 同上 | ±120° /s |
| 腿（legs） | `(0, 25)` | 20×14 矩形 | `#3a2a1a` | ±90° /s |
| 手臂（arm） | `(-16, 12)` | 8×18 矩形 | `#c5d0a0` | ±200° /s |
| 特殊件（hat） | 见下 | 各类型 | 各类型 | ±150° /s |

**特殊件**：
- normal：无（用 6 块即可）
- cone：加"路障锥" `(0, -30)` 三角，`#d97b2a`
- bucket：加"铁皮桶" `(0, -40)` 矩形 32×12，`#b0b0b0`
- fast：无额外（红色腰带留在 body-r 上）

#### 运动参数

- **初速度**：`vx ∈ [-120, 120]` px/s（左右随机），`vy ∈ [-260, -140]` px/s（向上抛出）
- **重力**：`gravity = 900 px/s²`（比阳光粒子重，体现"尸体"厚重感）
- **角速度**：各块独立随机，`ω ∈ [-3π, 3π]` rad/s（约 ±160°/s）
- **寿命**：`life = 900–1400 ms`（每块独立），到期后 alpha 淡出（`life < 300 ms` 时 alpha = `life/300`）
- **总数上限**：`effects.length > 500` 时不再生成新零件（防卡死，与 audio-director 的节流策略对齐）

#### 数据结构

```js
// effects 新增 kind
{
  kind: 'corpse-part',
  x, y,               // 初始位置
  vx, vy,             // 初速度
  rot,                // 当前旋转角
  omega,              // 角速度
  life,               // 剩余寿命（秒）
  maxLife,
  shape: 'head'|'body-l'|'body-r'|'legs'|'arm'|'cone'|'bucket',
  color: '#c5d0a0',
  size: [w, h] or r,  // 尺寸
  dead: false,
}
```

#### 绘制代码框架

```js
function drawCorpsePart(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.rot);
  ctx.globalAlpha = Math.max(0, Math.min(1, e.life / 0.3));  // 最后 300 ms 淡出
  ctx.fillStyle = e.color;
  if (e.shape === 'head') {
    ctx.beginPath(); ctx.arc(0, 0, e.size[0], 0, Math.PI*2); ctx.fill();
    // 眼睛（简化）
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-5, -2, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -2, 2, 0, Math.PI*2); ctx.fill();
  } else {
    ctx.fillRect(-e.size[0]/2, -e.size[1]/2, e.size[0], e.size[1]);
  }
  ctx.restore();
}
```

#### 更新逻辑

在 `update(dt)` 的 effects 循环里：
```js
else if (e.kind === 'corpse-part') {
  e.vy += 900 * dt;
  e.x  += e.vx * dt;
  e.y  += e.vy * dt;
  e.rot += e.omega * dt;
  e.life -= dt;
  if (e.life <= 0) e.dead = true;
}
```

#### 保留红色喷溅

原 `spawnBurst(z.x, y, '#c94', 18)` **保留**，作为"血雾"层。死亡 = 血雾 + 6 块零件 + 死亡音效。

### B.3 爆炸冲击波（Explosion Shockwave）

**触发点**：`explodeMine` L594（当前唯一爆炸来源），未来支持樱桃炸弹时复用。

**当前问题**：只有一个径向渐变圈（`drawBoom` L1101），持续 350 ms，视觉单薄。

#### 三层爆炸结构

| 层 | 元素 | 半径 | 时长 | 效果 |
|---|---|---|---|---|
| 1 · 闪光（Flash） | 全屏白 | 全屏 | 80 ms | alpha 0.4→0，缓动 `easeOutQuad` |
| 2 · 冲击波环（Shockwave Ring） | 描边圆 | 8 → 180 px | 380 ms | 2 px 白描边，alpha 0.9→0 |
| 3 · 火球（Fireball） | 径向渐变球 | 0 → 80 → 54 px | 450 ms | 现有 `drawBoom`，扩为 3 色段 |
| 4 · 粒子（Particles） | 火花点 | — | 600–900 ms | 现有 26+18 粒，改为 40 粒 |
| 5 · 屏幕震动 | 全局偏移 | ±6 px | 300 ms | 见 B.4 |

#### 时间轴

```
t(ms): 0    80    200   300   450   600   900
Flash: ███
ShockRing: ██████████████████████
Fireball:  ████████████████████████████████
Particles: ████████████████████████████████████████████
ScreenShake: ████████████████
```

#### 规格参数

**冲击波环（新增 `kind: 'shockwave'`）**：
```js
{
  kind: 'shockwave',
  x, y,
  life: 0.38,       // 380 ms
  maxLife: 0.38,
  rStart: 8,
  rEnd: 180,
  dead: false,
}
```
绘制：
```js
function drawShockwave(e) {
  const k = 1 - e.life / e.maxLife;  // 0→1
  const r = e.rStart + (e.rEnd - e.rStart) * Easing.easeOutCubic(k);
  const alpha = 0.9 * (1 - k);
  ctx.save();
  ctx.strokeStyle = `rgba(255, 220, 180, ${alpha})`;
  ctx.lineWidth = 3 * (1 - k * 0.5);   // 3 px → 1.5 px
  ctx.beginPath();
  ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
```

**闪光层（新增 `kind: 'flash'` 或用一个 `flashT` 变量）**：
```js
// 用全局变量简单实现
let flashT = 0, flashColor = '#fff';
// 触发时：flashT = 0.08; flashColor = '#fff';
// 每帧：flashT -= dt;
// 绘制：
if (flashT > 0) {
  const alpha = 0.4 * (flashT / 0.08);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
```

**火球（改造现有 `drawBoom`）**：
```js
function drawBoom(e) {
  const k = Math.max(0, e.life / 0.45);  // 总 450 ms
  const tNorm = 1 - k;  // 0→1
  const r = tNorm < 0.3 ? 40 * Easing.easeOutCubic(tNorm / 0.3) : 40 * (1 - 0.35 * (tNorm - 0.3));
  // 或者更简单：r = 40 * (1 - Math.pow(tNorm - 0.3, 2)) clamp
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 2);
  const g = ctx.createRadialGradient(e.x, e.y, 4, e.x, e.y, r);
  g.addColorStop(0, '#fffde0');        // 中心偏白
  g.addColorStop(0.3, '#ffb830');      // 中橙
  g.addColorStop(0.7, '#ff6a00');      // 深橙
  g.addColorStop(1, 'rgba(255, 80, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
```

**粒子**：`spawnBurst(x, y, '#ffb830', 26)` + `spawnBurst(x, y, '#ff6a00', 18)` → 改为 `spawnBurst(..., 24)` + `spawnBurst(..., 20)` + 增加一层 `spawnBurst(x, y, '#fff8a0', 8)`（火花）。粒子初速度改为 `vx ∈ [-180, 180]`, `vy ∈ [-260, -60]`（更猛烈）。

### B.4 屏幕震动（Screen Shake）

**触发场景**：
| 场景 | 触发点 | 强度 | 时长 |
|---|---|---|---|
| 爆炸（地瓜 / 樱桃） | `explodeMine` L611 | 强度 6 px | 300 ms |
| 大波预警启动 | `checkWave` L723 | 强度 3 px | 500 ms |
| 通关 | `checkWave` L734 | 强度 2 px | 600 ms |
| 僵尸进屋失败 | `updateZombies` L673 | 强度 8 px | 400 ms |

**不触发**：普通击杀、种植、阳光收集（避免高频抖动让人晕）。

#### 实现

```js
let screenShake = { t: 0, dur: 0, intensity: 0, seed: 0 };

function triggerShake(intensity, duration_ms) {
  screenShake.t = duration_ms / 1000;
  screenShake.dur = duration_ms / 1000;
  screenShake.intensity = intensity;
  screenShake.seed = Math.random() * 1000;
}

// 每帧调用（在 render 开头）
function getShakeOffset() {
  if (screenShake.t <= 0) return { x: 0, y: 0 };
  const k = 1 - screenShake.t / screenShake.dur;  // 0→1
  const decay = (1 - k) * (1 - k);  // 二次衰减
  const t = performance.now() / 1000 + screenShake.seed;
  return {
    x: Math.sin(t * 55) * screenShake.intensity * decay,
    y: Math.cos(t * 47) * screenShake.intensity * decay * 0.7,
  };
}
```

**在 `render()` 开头应用**：
```js
function render() {
  const off = getShakeOffset();
  ctx.save();
  ctx.translate(off.x, off.y);
  // ... 原有绘制 ...
  ctx.restore();
  // Toast / Pause / End 遮罩不震（在 restore 后画）
}
```

**衰减方式**：**二次衰减** `decay = (1-k)²`（不是线性、不是 cubic），因为线性感觉"生硬停止"，二次更接近"撞击后震动自然衰减"。

**像素级范围**：
- 强度 2 px：±2 px 抖动
- 强度 3 px：±3 px 抖动
- 强度 6 px：±6 px 抖动（**这是最大**，超过就眩晕）
- 强度 8 px：±8 px（**仅在失败瞬间**，一次性）

### B.5 阳光收集（Sun Collection Feedback）

**触发点**：`onClick` L328-331 中 `sun += ef.value; ef.dead = true` 之前。

**当前问题**：点击阳光后阳光立即消失，没有任何吸引效果，与 HUD 数字无视觉连接。

#### 两种方案（择一）

**方案 A · 缩放爆散（推荐，简单）**：
- 持续 180 ms
- 阳光从 r=18 缩放到 r=28（放大到 1.55×），同时 alpha 从 1 衰减到 0
- 8 条放射线加粗到 5 px，同步衰减
- 同时向 HUD 阳光计数器方向射 3 条黄色粒子（初速度朝向 HUD，速度 300 px/s）
- 结束：阳光消失，HUD 数字从 N 变到 N+value（用数字滚动）

**方案 B · 吸力轨迹（更有戏剧性）**：
- 持续 400 ms
- 阳光沿贝塞尔曲线飞向 HUD 阳光计数器（`(56, 26)`）
- 控制点：`(midX, -40)`（抛物弧向上）
- 途中缩放从 1.0 → 0.5
- 到达后 HUD 数字从 N 变到 N+value（数字翻滚）
- 8 条放射线在飞行的最后 100 ms 爆散

**推荐**：**方案 A**，实施成本更低，手感足够。方案 B 可作为 Phase 7 增强。

#### HUD 数字翻滚

在方案 A 的粒子到达 HUD 后（约 200 ms），HUD 数字从 N 滚到 N+value：
```js
// 在 drawStatus 前：
let sunDisplay = sun;
let sunRollT = 0, sunRollFrom = 0;
// 触发：sunRollFrom = sun; sunRollT = 0.3; sun += value;
// 每帧：if (sunRollT > 0) { sunRollT -= dt; sunDisplay = sunRollFrom + (sun - sunRollFrom) * (1 - sunRollT / 0.3); }
// 绘制：ctx.fillText(Math.floor(sunDisplay), 56, 26);
```

### B.6 大波预警视觉（Big Wave Warning）

**触发点**：`checkWave` L718-723（预警启动）、L707-715（预警结束）。

**当前问题**：只有 4 秒横幅 + 红闪氛围（`drawWaveWarn`），无屏幕震动，无倒计时最后 1 秒的视觉增强。

#### 分层增强

**T+0 ms（预警启动瞬间）**：
- 触发 `triggerShake(3, 500)`（见 B.4）
- 全屏红脉冲：`flashT = 0.3`（但 `flashColor` 改为 `rgba(255, 30, 30, 0.35)`），持续 300 ms
- 现有横幅 + 报警音（保持）

**T+0 到 T+3000 ms（前 3 秒）**：
- 保持现有：全屏红色氛围压暗（`rgba(140,0,0,α)`，α 随脉冲 0.10–0.20）
- 保持现有：横幅底色渐变 + 上下描边 + 标题 + 副标题 + 倒计时进度条
- 每 500 ms 触发一次**屏幕轻微震动**：`triggerShake(1.5, 150)`

**T+3000 到 T+4000 ms（最后 1 秒，视觉增强区）**：
- 全屏红脉冲频率加倍：脉冲周期从 ~1 秒变到 ~0.4 秒
- 横幅文字颜色从 `rgb(200-255, 60-140, 40)` 变到**纯亮红 `rgb(255, 100, 100)`**
- 倒计时数字用等宽字体 + 放大到 `bold 32px monospace`（原为 13px）
- 每 200 ms 触发一次 `triggerShake(2, 100)`
- 边缘渐红 vignette：`ctx.createRadialGradient` 从中心透明 → 边缘 `rgba(120, 0, 0, 0.4)`
- 报警音频率提高（交给 audio-director）

**T+4000 ms（预警结束，正式刷怪）**：
- `triggerShake(5, 400)`（大波冲击感）
- 触发 `flashT = 0.15`（红色），持续 150 ms
- 现有 `newWave()` 逻辑

#### 代码框架

```js
function drawWaveWarn() {
  const remaining = Math.max(0, warn.t);
  const inFinal1 = remaining < 1.0;   // 最后 1 秒
  const pulseSpeed = inFinal1 ? 22 : 11;   // 频率加倍
  const pulse = 0.5 + 0.5 * Math.sin(gt * pulseSpeed);
  // ... 现有代码 ...
  // 增加：vignette
  if (inFinal1) {
    const v = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 300,
                                       canvas.width/2, canvas.height/2, 700);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, `rgba(120, 0, 0, ${0.4 + 0.2 * pulse})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  // 倒计时数字放大
  if (inFinal1) {
    ctx.font = 'bold 32px Consolas, monospace';
    ctx.fillStyle = `rgb(255, ${Math.round(100 + 50*pulse)}, ${Math.round(100 + 50*pulse)})`;
    // 绘制大倒计时
  }
}
```

### B.7 卡片交互反馈（Card Feedback）

**触发点**：`onClick` L317-320（选卡）、L351（种植扣阳光）。

**当前问题**：卡片点击后仅边框颜色变化（`#1a0f08` → `#ffd54a`），无弹跳、无阴影、无抬起感。

#### 规格

**卡片选中抬起**（`selected.i === i` 时）：
- 卡片 `y` 位置从 `CARD_Y` 减 6 px（视觉上抬起 6 px）
- 卡片下方增加 `shadowOffset`：在卡片底部画一条 2 px 高的深色条 `rgba(0,0,0,0.4)`（模拟抬起阴影）
- 卡片边框加粗：2 px → 3 px
- 卡片整体微缩放 1.0 → 1.05，缓动 `easeOutBack` 200 ms
- 卡片顶部增加一条 3 px 高的黄色高光条 `#ffd54a`

**卡片冷却结束瞬间**：
- 卡片边框闪黄 3 次（每次 100 ms，间隔 80 ms）
- 触发 `SFX.sun()`（可选，与 audio-director 对齐）

**卡片阳光不足灰化**：
- 保持现有 `globalAlpha = 0.35`
- 但 `drawCardFace` 内容也应用 alpha（当前已应用，OK）

#### 代码骨架

```js
// 卡片状态：cardPopT[type]（选中时刻的毫秒数），cardReadyFlashT[type]
// 每帧更新后：
// 绘制时：
for (let i = 0; i < CARDS.length; i++) {
  const c = CARDS[i], cx = CARD_X0 + i * CARD_W;
  const sel = selected && selected.i === i;
  let yOff = 0, scale = 1;
  if (sel) {
    yOff = -6;
    scale = 1.05;
  }
  ctx.save();
  ctx.translate(cx + CARD_W/2, CARD_Y + CARD_H/2 + yOff);
  ctx.scale(scale, scale);
  ctx.translate(-(cx + CARD_W/2), -(CARD_Y + CARD_H/2));
  // 原有绘制代码...
  ctx.restore();
}
```

### B.8 僵尸行走 / 啃食动画（Zombie Walk & Eat）

**触发点**：`updateZombies` L651-681（行走 / 啃食切换）。

**当前问题**：整体 `rotate(wob)` 微摆，手臂不动，走路像滑行。

#### 行走动画（正常移动）

| 部位 | 动作 | 参数 |
|---|---|---|
| 身体 | 整体上下小幅偏移 | `yOff = Math.sin(z.walk * 2) * 2` px |
| 手臂左 | 上下摆动 | `armOff = Math.sin(z.walk * 2) * 4` px |
| 手臂右 | 反向摆动 | `armOff = -Math.sin(z.walk * 2) * 4` px |
| 头 | 略左右倾斜 | `headTilt = Math.sin(z.walk) * 0.05` rad（现有整体 rotate 已部分体现，保留） |
| 腿 | 前踏后抬（简易） | 前腿 `xOff = Math.sin(z.walk * 2) * 3` px，后腿反向 |
| 身体 | 现有 `wob = sin(walk) * 0.06` 保留 | 与手臂协同产生"歪斜僵尸"感 |

**参数**：`z.walk` 增量速度 `dt * 8`（现有）→ 保持。行走周期约 `2π / 8 ≈ 0.785 s`（≈ 1.27 步/秒），符合正常僵尸节奏。

#### 啃食动画（`z.eating === true`）

| 部位 | 动作 | 参数 |
|---|---|---|
| 身体 | 前倾（向左倾斜） | `rotate(-0.1)` rad 保持 200 ms 后进入稳定 |
| 手臂 | 上下夹动 | `armOff = Math.sin(z.eatAnim * 15) * 3` px（高频夹动） |
| 嘴 | 张嘴幅度加倍 | `mouthOpen = 3 + Math.sin(z.eatAnim * 15) * 3`（现有为 `sin(walk * 2) * 2 + 3`） |
| 头部 | 前后小幅抽动 | `headOff = Math.sin(z.eatAnim * 15) * 2` px |
| 身体 | 轻微抖动 | `bodyJitter = Math.random() * 1.5` px（每帧随机） |

**参数**：`z.eatAnim += dt`（现有）→ 保持。频率 15 Hz 是"咀嚼"感。

#### 代码骨架（在 `drawZombie` 内）

```js
const walking = !z.eating;
const wobPhase = z.walk * 2;
const wob = Math.sin(z.walk) * 0.06;
const bodyYOff = Math.sin(wobPhase) * (walking ? 2 : 0.5);
const armSwing = walking ? Math.sin(wobPhase) * 4 : Math.sin(z.eatAnim * 15) * 3;
const headTilt = z.eating ? -0.1 + Math.sin(z.eatAnim * 15) * 0.05 : wob;

ctx.save();
ctx.translate(x, y + bodyYOff);
ctx.rotate(headTilt);
// 阴影（不随身体偏移，画在 translate 前）
ctx.fillStyle = 'rgba(0,0,0,0.3)';
ctx.beginPath(); ctx.ellipse(0, 42 - bodyYOff, 26, 6, 0, 0, Math.PI*2); ctx.fill();
// ... 其余身体、头、嘴 ...
// 手臂
ctx.fillStyle = '#c5d0a0';
ctx.fillRect(-24, 10 + armSwing, 10, 22);
ctx.fillRect(14, 10 - armSwing, 10, 22);
ctx.restore();
```

### B.9 植物待机动画（Plant Idle）—— **补充章节**

**当前问题**：所有植物种下后完全静止（D-01）。

#### 各植物 idle 规格

| 植物 | 动画 | 参数 |
|---|---|---|
| 向日葵 | 花盘左右缓慢摇摆 | `rotate = sin(gt * 1.2 + p.id * 0.5) * 0.06` rad |
| 豌豆 / 双发 | 整体轻微上下呼吸 | `scaleY = 1 + sin(gt * 2 + p.id) * 0.02` |
| 坚果 | 无（**不动才符合"肉盾"人设**） | — |
| 西瓜 | 花盘左右摇摆（与向日葵同频不同相） | `rotate = sin(gt * 1.5 + p.id) * 0.05` rad |
| 地瓜（武装） | 待爆光环脉动 | 现有 `rgba(255,90,0,0.35)` 圆的 alpha 改成 `0.25 + 0.15 * sin(gt * 4)` |

**性能**：所有 idle 动画**只需读 `gt` 与 `p.id`（索引即可）**，不需新增状态字段。

#### 实现骨架

在 `drawPlant` 内每个 `if (p.type === 'sunflower')` 分支前：
```js
if (p.type === 'sunflower') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(gt * 1.2 + p.idx * 0.5) * 0.06);
  ctx.translate(-x, -y);
  // ... 原有绘制 ...
  ctx.restore();
}
```

（`p.idx` = 该植物在 plants 数组中的索引，绘制循环时 `plants.forEach((p, idx) => ...)` 传入）

### B.10 子弹拖尾（Projectile Trail）—— **补充章节**

**触发点**：`drawProjectile` L1044。

**规格**：

| 子弹 | 拖尾层数 | 长度（帧延迟） | 透明度衰减 | 缩放衰减 |
|---|---|---|---|---|
| pea | 3 层 | 30, 60, 90 px 后置 | 0.5, 0.3, 0.15 | 0.9, 0.75, 0.6 |
| melon | 2 层 | 40, 80 px 后置 | 0.4, 0.2 | 0.85, 0.65 |

**实现**：
```js
function drawProjectile(pr) {
  // 拖尾（先画）
  for (let i = 2; i >= 1; i--) {
    const dx = -i * (pr.type === 'melon' ? 40 : 30);
    const alpha = pr.type === 'melon' ? (i === 1 ? 0.4 : 0.2) : (i === 1 ? 0.5 : 0.3);
    const scale = pr.type === 'melon' ? (i === 1 ? 0.85 : 0.65) : (i === 1 ? 0.9 : 0.75);
    ctx.save();
    ctx.globalAlpha = alpha;
    const r = (pr.type === 'melon' ? 14 : 9) * scale;
    ctx.fillStyle = pr.type === 'melon' ? '#3a8a1a' : '#6aa43a';
    ctx.beginPath(); ctx.arc(pr.x + dx, pr.y, r, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  // 主体（原有代码）
  if (pr.type === 'pea') { /* ... */ }
  else if (pr.type === 'melon') { /* ... */ }
}
```

**注意**：拖尾在**主体之前**画，保证主体在最上层。

### B.11 手感规格条目汇总

| ID | 条目 | 总时长 | 涉及代码位置 | 优先级 |
|---|---|---|---|---|
| F-01 | 种植动画（飞向+落地+弹跳） | 620 ms | `onClick` L354, `drawPlant` | P0 |
| F-02 | 僵尸死亡掉零件（6 块 ragdoll） | 900–1400 ms | `killZombie` L683 | P0 |
| F-03 | 爆炸冲击波（闪光+环+火球+粒子） | 450 ms + 500 ms 粒子 | `explodeMine` L594, `drawBoom` L1101 | P0 |
| F-04 | 屏幕震动（4 场景） | 150–600 ms | 新增 `getShakeOffset` 在 `render` 中 | P0 |
| F-05 | 阳光收集反馈（爆散 + HUD 滚动） | 200 ms + 300 ms | `onClick` L330, `drawSun` L1069, `drawStatus` L1223 | P1 |
| F-06 | 大波预警增强（震动 + 红脉冲 + 最后 1 秒） | 4000 ms 全程 | `drawWaveWarn` L752, `checkWave` L723 | P0 |
| F-07 | 卡片交互反馈（抬起 + 冷却闪） | 200 ms | `drawCardBar` L1134 | P1 |
| F-08 | 僵尸行走 / 啃食动画 | 持续 | `drawZombie` L997, `updateZombies` | P1 |
| F-09 | 植物待机动画（idle） | 持续 | `drawPlant` L880 | P1 |
| F-10 | 子弹拖尾 | 持续 | `drawProjectile` L1044 | P2 |
| F-11 | 卡片冷却结束闪光 | 380 ms | `drawCardBar` | P2 |
| F-12 | 通关屏幕震动 + 白光闪 | 600 ms + 200 ms | `checkWave` L734, `drawEnd` L1332 | P2 |

**总条目：12 项**，其中 P0 五项（F-01, F-02, F-03, F-04, F-06）是 Phase 6 交付硬要求，P1 五项是强烈建议，P2 两项是打磨。

---

## C. 可访问性分级

### C.1 项目定位

- **分级**：**Basic**（基础级）
- **依据**：
  - 目标平台：仅 PC 浏览器（Chrome / Edge / Firefox 现代版）
  - 团队规模：单人项目，无专职 QA
  - 评审强度：Lean
  - 项目阶段：Phase 6 打磨，非发布版
- **对比分级**：Basic < Standard < Comprehensive < Exemplary
- **不追求**：W3C WCAG 2.1 AA、Full Keyboard Navigation、Screen Reader Support、High Contrast UI Theme、Text Resize

### C.2 特性矩阵

| 特性 | 状态 | 说明 |
|---|---|---|
| 色盲友好（红绿色盲） | ✅ 已支持（间接） | 见 C.3 |
| 色盲友好（蓝黄色盲） | ⚠️ 部分支持 | 见 C.3 |
| 色弱模式 | ❌ 未支持 | 见 C.4 |
| 减动效模式（`prefers-reduced-motion`） | ❌ 未支持 | 见 C.5 |
| 高对比度 | ❌ 未支持 | 见 C.6 |
| 屏幕阅读器 | ❌ 基本无法支持 | 见 C.7 |
| 键盘操作 | ✅ 已支持 | 见 C.8 |
| 颜色区分（非仅颜色） | ⚠️ 部分 | 见 C.9 |
| 文本缩放 | ❌ 不适用 | Canvas 无原生文本缩放 |
| 字幕 | ✅ 已支持（Toast） | 大波预警、死亡提示均用视觉横幅，非纯音频 |
| 音效独立开关 | ✅ 已支持 | `M` 或 🔊 按钮 |

### C.3 色盲友好（红绿色盲）

**现状分析**：
- 红绿色盲（deuteranopia，约 5% 男性）**主要影响**：
  - 草坪（绿）与黄昏滤镜（橙）→ 会看到两种不同深浅的黄色，**可区分**
  - 豌豆（绿）与僵尸（灰绿）→ 可能混淆，但**位置差异**（一个在格子，一个在行走）弥补
  - 血条（`#3b3` 绿 / `#f63` 橙红）→ 会看到两种棕色，**难区分**
- 蓝黄色盲（tritanopia，约 0.01% 人群）**影响极小**

**已提供的视觉补偿**（无需改动即有效）：
1. **植物 vs 僵尸位置差异**：植物永远在格子中心，僵尸永远在行走 —— 位置差异本身就是强区分
2. **卡片 vs 场上差异**：卡片有深棕边框，场上实体无
3. **数值提示**：血条百分比、僵尸类型（normal/cone/fast/bucket）**通过外形区分**（桶 vs 锥 vs 腰带 vs 裸身）
4. **僵尸 4 种类型**：完全通过**额外物体**（锥帽 / 铁皮 / 腰带）区分，不依赖颜色 —— **色盲友好**

**建议改动（低成本高收益）**：
- 血条颜色改为**中性灰 → 黄色 → 红色**三级（避免红/绿对照）：
  ```js
  // 原：k>0.5?'#3b3':'#f63'
  // 改：
  const hpColor = k > 0.7 ? '#4ade80' : k > 0.35 ? '#fbbf24' : '#ef4444';
  // 或更严格：k > 0.5 ? '#fbbf24' : '#ef4444'（完全避免绿色）
  ```
- 卡片造价文字颜色改为**白色 + 黄色底**而非纯黄色（黄色对比度低）

### C.4 色弱模式

**当前状态**：❌ 无

**建议方案**：
- 提供 URL 参数 `?contrast=high` 触发高对比度模式
- 高对比度模式下：
  - 草坪对比度提高：`#88c250` → `#7fb040`，`#77b042` → `#5a8a2a`
  - 僵尸皮肤提高饱和度：`#c5d0a0` → `#d8e0b8`
  - 卡片选中边框加粗 2 px → 4 px
  - 血条宽度 4 px → 6 px
- **暂不实现**（Phase 6 不做，记入 Phase 7 待办）

### C.5 减动效模式（`prefers-reduced-motion`）

**当前状态**：❌ 无

**建议方案**：
```js
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

如果 `prefersReducedMotion === true`：
- **禁用**：屏幕震动（B.4）、爆炸闪光（B.3 层 1）、大波预警红脉冲（B.6）
- **保留**：种植动画、僵尸死亡掉零件（信息性，不是装饰）、子弹拖尾
- **简化**：僵尸行走摆幅减半（`wob = sin * 0.03`）
- **保留**：所有关键 UI 反馈（Toast、卡片选中边框）

**实施成本**：约 20 行代码，一处 `if (prefersReducedMotion)` 判断。**建议实施**（低成本高收益）。

### C.6 高对比度

**当前状态**：❌ 无

**建议**：
- URL 参数 `?contrast=high` 触发
- 触发后：
  - 草坪两色对比度增强（见 C.4）
  - 血条宽度和高度翻倍
  - 卡片选中边框从黄色 `#ffd54a` 改为**亮黄 `#ffeb3b` + 外发光**
  - Toast 边框从 2 px 改为 3 px
- **Phase 6 不做**，与 C.4 一并纳入 Phase 7 待办

### C.7 屏幕阅读器（Screen Reader Support）

**当前状态**：❌ 基本无法支持

**限制原因**：
1. **游戏主视觉在 Canvas 内**：Canvas 2D 内容**不暴露到 DOM**，屏幕阅读器（NVDA / JAWS / VoiceOver）**无法读取**任何 canvas 内容
2. **HUD 在 canvas 内**：阳光、分数、波次都在 canvas 上，屏幕阅读器读不到
3. **底部控制按钮在 DOM 内**：`#pause` / `#fast` / `#mute` / `#reset` 可读，但**游戏核心内容不可读**
4. **状态切换通过音效**：大波预警、僵尸死亡靠音效和视觉横幅，屏幕阅读器无法通过 ARIA live region 播报

**部分支持方案**（若坚持实现）：
- 在 canvas 外添加 `<div aria-live="polite" id="a11y-announce" class="sr-only">` 元素，用 JS 定时把游戏状态推入
- 关键事件（新波次、大波预警、通关、失败）通过 `announcer.textContent = ...` 播报
- **不推荐实施**：投入产出比极低，游戏本身不适合屏幕阅读器

**结论**：明确**不支持屏幕阅读器**。项目 README 应说明"本项目为视觉/听觉游戏，不适用于屏幕阅读器"。

### C.8 键盘操作（已支持，记录现状）

| 按键 | 功能 | 状态 |
|---|---|---|
| `1`–`6` | 选卡 | ✅ |
| `X` | 铲子 | ✅ |
| `Space` | 开始 / 暂停 / 结束返回 | ✅ |
| `F` | 加速切换 | ✅ |
| `M` | 静音切换 | ✅ |
| `R` | 返回菜单 | ✅ |
| `Esc` | 取消选择 / 暂停 | ✅ |

**注意**：**种植仍需鼠标点击**（键盘只能选卡，不能指定格子）。完整的键盘种植（方向键 + Enter）**未实现**，也不推荐实现（Phase 7+）。

### C.9 非颜色区分（Redundant Encoding）

**原则**：任何区分都**不应仅依赖颜色**。

**现状审查**：
| 内容 | 区分方式 | 是否仅靠颜色 |
|---|---|---|
| 草坪亮格 / 暗格 | 颜色 + 棋盘格 | 否（棋盘格模式） |
| 4 种僵尸类型 | 额外物体（锥 / 桶 / 腰带） | 否 ✅ |
| 卡片是否可用 | 透明度 + 边框色 | 否（透明度） |
| 卡片选中 | 边框色 + 加粗 | 否 ✅ |
| 血条状态 | 颜色 + 宽度（比例） | 否 ✅ |
| 大波预警 | 红闪 + 文字 + 进度条 | 否 ✅ |
| 铲子误选 | 红色边框 + 文字提示 | 否 ✅ |

**结论**：整体区分策略良好，符合"非仅颜色"原则。

### C.10 Basic 级可访问性特性总数

**已实现**：4 项（键盘操作、色盲部分友好、Toast 字幕、音效开关）
**建议低成本实现**：1 项（`prefers-reduced-motion`）
**明确不支持**：屏幕阅读器
**Phase 7 待办**：高对比度模式（`?contrast=high`）

---

## D. 资产清单（Asset Inventory）

项目为**零依赖、纯 Canvas 程序化绘制**，无外部位图 / 字体文件。所有"资产"均为**代码硬编码常量**，本清单用于日后统一替换（如迁移到 CSS 变量或配置对象）。

### D.1 颜色常量清单

**共 46 个唯一颜色值**（含透明）：

| ID | 值 | 类型 | 出现次数 | 位置（函数） |
|---|---|---|---|---|
| C-01 | `#1a1005` | HTML 背景 | 1 | CSS L9 |
| C-02 | `#7fbf4a` | Canvas CSS 背景 | 1 | CSS L12 |
| C-03 | `#241810` | 底部控制栏背景 | 1 | CSS L13 |
| C-04 | `#c8b98a` | HUD 次要文字 | 1 | CSS L13 |
| C-05 | `#ffd54a` | HUD 强调 | 1 | CSS L14 |
| C-06 | `#3a2a1a` | 按钮背景 | 1 | CSS L15 |
| C-07 | `#5a3a2a` | 按钮边框 / hover | 1 | CSS L15 |
| C-08 | `#8b6f2a` | 按钮高亮 | 1 | CSS L17 |
| C-09 | `#c9a34a` | 按钮高亮边框 | 1 | CSS L17 |
| C-10 | `#88c250` | L1 草坪亮格 | 1 | `LEVELS[1].lawn` |
| C-11 | `#77b042` | L1 草坪暗格 | 1 | `LEVELS[1].lawn` |
| C-12 | `#7fb04a` | L2 草坪亮格 | 1 | `LEVELS[2].lawn` |
| C-13 | `#6e9c3d` | L2 草坪暗格 | 1 | `LEVELS[2].lawn` |
| C-14 | `#5a3a22` | 房子墙 / 道路 | 2 | `drawGameWorld` |
| C-15 | `#6a4228` | 道路纹理 | 2 | `drawGameWorld` |
| C-16 | `#3a2418` | 房子外墙 / 标题阴影 / 描边 | 4 | 多处 |
| C-17 | `#8b6f4a` | 房子木板 | 1 | `drawGameWorld` |
| C-18 | `#c9a34a` | 房子门 / 菜单选中 | 3 | 多处 |
| C-19 | `#ffce3a` | 阳光金 / 卡片造价 / 标题 | 5 | 多处 |
| C-20 | `#ffcb30` | 卡片造价（变体） | 1 | `drawCardBar` |
| C-21 | `#5a3a1a` | 卡片栏背景 | 1 | `drawCardBar` |
| C-22 | `#2a1a0a` | 卡片槽底 / 菜单按钮未选 | 3 | 多处 |
| C-23 | `#6a4a20` | 卡片选中底 / 菜单锁底 | 2 | 多处 |
| C-24 | `#1a0f08` | 卡片未选中边框 | 1 | `drawCardBar` |
| C-25 | `#3a1a0a` | 菜单按钮边框 / 标题深阴影 | 4 | 多处 |
| C-26 | `#e8dcc0` | 未选中文本 | 2 | 多处 |
| C-27 | `#c9a34a` | Toast 边框 | 1 | `drawToast` |
| C-28 | `#8b5a2a` | 铲子木柄 / 向日葵盘心 | 2 | `drawShovelIcon`, `drawPlant` |
| C-29 | `#8b6528` | 坚果 / 铲子粒子 / 土 | 4 | 多处 |
| C-30 | `#b8bec4` | 铲头银 | 1 | `drawShovelIcon` |
| C-31 | `#8f959b` | 铲头暗边 | 1 | `drawShovelIcon` |
| C-32 | `#5a3a1a` | 坚果裂纹 | 1 | `drawPlant` |
| C-33 | `#3a1a0a` | 坚果深裂纹 | 1 | `drawPlant` |
| C-34 | `#4a8a2a` | 豌豆 / 双发主体 | 2 | `drawPlant` |
| C-35 | `#6aa43a` | 豌豆 / 双发高光 | 3 | `drawPlant` |
| C-36 | `#3a7a1a` | 豌豆茎叶 | 1 | `drawPlant` |
| C-37 | `#3a8a1a` | 西瓜主体 | 2 | `drawPlant`, `drawProjectile` |
| C-38 | `#2a6a0a` | 西瓜斑点 | 1 | `drawPlant` |
| C-39 | `#1e5a10` | 西瓜 / 瓜子深绿 | 3 | 多处 |
| C-40 | `#1a4a08` | 瓜子斑 | 1 | `drawProjectile` |
| C-41 | `#6a4a24` | 土堆暗 | 2 | `drawPlant`, `drawCardFace` |
| C-42 | `#5a3a1a` | 土堆点 | 1 | `drawPlant` |
| C-43 | `#a0446a` | 地瓜粉紫 | 2 | `drawPlant`, `drawCardFace` |
| C-44 | `#c25a86` | 地瓜高光 | 2 | `drawPlant`, `drawCardFace` |
| C-45 | `#aef06a` | 豌豆子弹亮 | 1 | `drawProjectile` |
| C-46 | `#5bc030` | 西瓜子弹亮 | 1 | `drawProjectile` |
| C-47 | `#4a5a5a` | 铁桶僵尸身体 | 1 | `drawZombie` |
| C-48 | `#5a6a4a` | 普通僵尸身体 | 1 | `drawZombie` |
| C-49 | `#c5d0a0` | 僵尸皮肤 | 3 | `drawZombie` |
| C-50 | `#d97b2a` | 路障锥 | 1 | `drawZombie` |
| C-51 | `#b0b0b0` | 铁桶主体 | 1 | `drawZombie` |
| C-52 | `#808080` | 铁桶暗边 | 1 | `drawZombie` |
| C-53 | `#c04040` | 快速僵尸腰带 | 1 | `drawZombie` |
| C-54 | `#600` | 僵尸嘴 | 1 | `drawZombie` |
| C-55 | `#600000` | 大波警示深红 | 1 | `drawWaveWarn` |
| C-56 | `#ff6a3a` | 大波进度条 | 1 | `drawWaveWarn` |
| C-57 | `#ff6a00` | 爆炸深橙 | 2 | `explodeMine`, `drawBoom` |
| C-58 | `#ffb830` | 爆炸橙 | 2 | `spawnBurst`, `drawBoom` |
| C-59 | `#fff8c0` | 爆炸中心亮 | 1 | `drawBoom` |
| C-60 | `#fff8a0` | 阳光核心 | 1 | `drawSun` |
| C-61 | `#ffb830` | 阳光外环 | 1 | `drawSun` |
| C-62 | `#ffcb30` | 阳光放射 | 1 | `drawSun` |
| C-63 | `#2a5a1a` | 菜单深绿 | 3 | `drawMenu` |
| C-64 | `#7ee06a` | 通关绿色 | 1 | `drawEnd` |
| C-65 | `#f87171` | 结束红色 | 1 | `drawEnd` |
| C-66 | `#8a7a4a` | HUD 灰金 | 1 | `drawStatus` |
| C-67 | `#3b3` | 血条正常（简写） | 1 | `drawPlant`, `drawZombie` |
| C-68 | `#f63` | 血条低血（简写） | 1 | `drawPlant`, `drawZombie` |
| C-69 | `#4a4` | 僵尸血条正常（简写） | 1 | `drawZombie` |
| C-70 | `#c94` | 死亡粒子（简写） | 1 | `killZombie` |
| C-71 | `#8b5a2a` | 铲子粒子 | 1 | `onClick` |
| C-72 | `#ff6a00` | 爆炸粒子 | 1 | `explodeMine` |
| C-73 | `#ffb830` | 爆炸粒子 | 1 | `explodeMine` |

**注**：实际唯一值约 46 个（去掉重复如 `#c9a34a`、`#ffb830` 等多处使用）。

### D.2 字体常量清单

| ID | 字体 | 用途 | 位置 |
|---|---|---|---|
| F-01 | `"Microsoft YaHei","PingFang SC",sans-serif` | 页面 CSS 全局 | CSS L10 |
| F-02 | `"Microsoft YaHei"` | Canvas 正文 / 标题 | 20+ 处 |
| F-03 | `"Impact","Microsoft YaHei",sans-serif` | 大标题 | `drawMenu`, `drawEnd` |
| F-04 | `sans-serif` | 卡片造价 / HUD 数字 / 阳光数字 | `drawCardBar`, `drawStatus`, `drawSun` |
| F-05 | `Consolas,monospace` | 错误日志 | `drawFrameErr` |

**建议统一**：
- **F-04 全部改为 `Consolas, monospace`**（HUD 数字等宽，防跳动）
- **F-03 保持**（Impact 是标题专用）
- 引入 JS 常量：`const FONT_UI = '"Microsoft YaHei", sans-serif'; const FONT_NUM = 'Consolas, monospace';`

### D.3 尺寸常量清单

**Canvas 与网格**（已定义为 `const`，L37-40）：

| 常量 | 值 | 用途 |
|---|---|---|
| `COLS` | 9 | 列数 |
| `ROWS` | 5 | 行数 |
| `CELL_W` | 90 | 单元宽度 |
| `CELL_H` | 104 | 单元高度 |
| `GRID_X` | 55 | 网格起点 X |
| `GRID_Y` | 80 | 网格起点 Y |
| `ROAD_W` | 90 | 右侧道路宽度 |
| `CARD_H` | 78 | 卡片高 |
| `CARD_W` | 98 | 卡片宽 |
| `CARD_GAP` | 4 | 卡片间隙（未使用，实际用 CARD_W 直接累加） |
| `CARD_Y` | 600 | 卡片栏起点 Y（`680 - 78 - 2`） |
| `SHOVEL_X` | 6 | 铲子槽起点 X |
| `SHOVEL_W` | 62 | 铲子槽宽 |
| `CARD_X0` | 76 | 卡片栏起点 X（`SHOVEL_X + SHOVEL_W + 8`） |

**实体尺寸**（散落在 `drawPlant` / `drawZombie` / `drawSun` 等函数内，硬编码）：

| 元素 | 尺寸 | 位置 |
|---|---|---|
| 植物脚下阴影 | `ellipse(26, 7)` | L884 |
| 向日葵花瓣 | `ellipse(10, 5)` r=16 | L890 |
| 向日葵盘心 | r=14 / r=10 | L892-893 |
| 向日葵眼 | r=3 / r=1.5 | L895-899 |
| 坚果主体 | `ellipse(28, 34)` | L903 |
| 坚果眼 | r=3 / r=1.5 | L907-911 |
| 豌豆主体 | `ellipse(24, 28)` | L914 |
| 豌豆头 | `ellipse(18, 18)` | L916 |
| 豌豆叶片 | `ellipse(10, 5)` | L918-919 |
| 豌豆眼 | r=4 / r=2 | L921-923 |
| 双发副头 | `ellipse(14, 14)` | L928 |
| 西瓜主体 | r=26 | L936 |
| 西瓜斑点 | `ellipse(8, 3)` r=14 | L940 |
| 西瓜高光 | `ellipse(6, 4)` | L943 |
| 土堆 | `ellipse(30, 17)` / `ellipse(25, 13)` | L948-950 |
| 地瓜露出 | `ellipse(19, 15)` / `ellipse(10, 6.5)` | L954-956 |
| 地瓜眼 | r=3.6 / r=1.8 | L959-963 |
| 待爆光环 | r=26 | L966 |
| 埋土点 | r=3 / r=2.5 / r=2 | L970-972 |
| 武装进度环 | r=20 | L977 |
| 坚果血条 | 48×4 | L984 |
| 僵尸脚下阴影 | `ellipse(26, 6)` | L1004 |
| 僵尸身体 | 32×42 矩形 | L1007 |
| 僵尸头 | r=18 | L1010 |
| 僵尸眼 | r=3 | L1013-1014 |
| 僵尸嘴 | 28×4 | L1018 |
| 路障锥 | 三角 28×22 | L1022 |
| 铁桶 | 32×12 / 36×3 | L1025-1027 |
| 快速腰带 | 36×10 | L1030 |
| 僵尸手臂 | 10×22 | L1034-1035 |
| 僵尸血条 | 48×4 | L1039 |
| 豌豆子弹阴影 | `ellipse(8, 3)` | L1047 |
| 豌豆子弹 | r=9 径向渐变 r=2→10 | L1048-1051 |
| 豌豆子弹高光 | r=2.5 | L1053 |
| 西瓜子弹阴影 | `ellipse(12, 4)` | L1056 |
| 西瓜子弹 | r=14 径向渐变 r=4→15 | L1057-1060 |
| 西瓜子弹斑 | r=1.8 距 7 | L1064 |
| 阳光外圈 | r=26 alpha 0.3 | L1073 |
| 阳光核心 | r=18 径向渐变 r=2→18 | L1074-1077 |
| 阳光放射线 | r=20→26 | L1082-1084 |
| 阳光数字 | 14px bold | L1087 |
| 爆炸半径 | 8→54（衰减） | L1103 |
| HUD 阳光框 | 120×44 | L1220 |
| HUD 波次框 | 250×44 | L1228 |
| 卡片名 | 12px | L1148 |
| 卡片造价 | 14px bold | L1152 |
| 卡片冷却数字 | 20px bold | L1158 |
| Toast 高度 | 34px | L121 |
| 大波横幅标题 | 48px bold | L772 |
| 大波横幅副标题 | 15px bold | L779 |
| 大波倒计时条 | 320×5 | L786 |
| 菜单标题 | 76px bold Impact | L1263-1266 |
| 菜单按钮（关卡） | 140×42 | L1277-1278 |
| 菜单按钮（难度） | 140×40 | L1296-1297 |
| 菜单按钮（开始） | 220×60 | L1309-1310 |
| 结束页标题 | 72px bold Impact | L1349 |
| 结束页按钮 | 220×50 | L1372-1375, L1381-1384 |

### D.4 音效常量（供 audio-director 参考，仅作交叉引用）

**已在代码中定义，本节不重复展开**，仅记录 12 个音效名：
`plant, sun, shovel, shoot, hit, death, boom, chomp, wave, siren, win, lose, deny`（L196-218）

### D.5 资产清单汇总

| 类别 | 数量 |
|---|---|
| 唯一颜色值 | 46（含 HTML/CSS 10 + Canvas 36） |
| 字体栈 | 5 |
| 布局尺寸常量 | 14（已 `const`） |
| 实体硬编码尺寸 | 55+（散落于绘制函数） |
| 音效 | 12 |
| 外部文件依赖 | **0** |

---

## E. 实施优先级与推荐顺序

给 engineering-lead 的实施建议：

### P0 · Phase 6 硬要求（5 项手感 + 2 项视觉基线）

1. **F-04 屏幕震动**（B.4）—— 所有 P0 手感的前置基础设施，先做
2. **F-01 种植动画**（B.1）—— 玩家最高频操作，反馈最强烈
3. **F-02 僵尸死亡掉零件**（B.2）—— 击杀核心反馈
4. **F-03 爆炸冲击波**（B.3）—— 视觉最戏剧性
5. **F-06 大波预警增强**（B.6）—— 波次节奏感的锚点
6. **D-11 圆角化**（A.3）—— 全局视觉统一，`roundRect` 封装
7. **D-14 HUD 数字等宽**（A.6）—— 一行代码，立刻提升质感

### P1 · Phase 6 强烈建议（5 项）

8. **F-05 阳光收集反馈**（B.5 方案 A）
9. **F-07 卡片交互反馈**（B.7）
10. **F-08 僵尸行走/啃食动画**（B.8）
11. **F-09 植物待机动画**（B.9）
12. **C-5 `prefers-reduced-motion`**（C.5）

### P2 · Phase 6 可选打磨

13. **F-10 子弹拖尾**（B.10）
14. **F-11 卡片冷却闪**（B.7 补）
15. **F-12 通关闪白 + 震动**（B.4 已支持）
16. **D-12 卡片描边补**（A.3）
17. **D-08 阴影偏移**（A.4）
18. **D-13 植物/僵尸 Y 排序**（A.8）

### 预计工程量

| 优先级 | 条目数 | 预计改动行数 | 预计耗时（人时） |
|---|---|---|---|
| P0 | 7 | ~150–200 | 4–6 |
| P1 | 5 | ~120–160 | 3–5 |
| P2 | 6 | ~100–150 | 2–4 |
| **合计** | **18** | **~370–510** | **9–15** |

---

## F. 与 audio-director 的协作接口

- **F-04 屏幕震动**：震动触发点必须与 audio-director 的音效触发点对齐（如爆炸 = `SFX.boom()` + `triggerShake(6, 300)` 在同一行）
- **F-02 僵尸死亡零件**：`SFX.death()` 与 `spawnCorpseParts(z)` 同步调用
- **F-06 大波预警**：`SFX.siren()` 触发时立即 `triggerShake(3, 500)` + `flashT = 0.3, flashColor='red'`
- **节流策略对齐**：`sfxGate`（音频节流）与 `screenShake` 节流用同一 tick 逻辑

---

## G. 与 quality-lead 的验收清单

quality-lead 在 Phase 6 验收时请对照：

- [ ] **A.9 视觉缺陷 18 项** 中 P0/P1 项已修复（D-01 ~ D-07, D-09 ~ D-12）
- [ ] **B.11 手感规格 12 项** 中 P0 五项（F-01, F-02, F-03, F-04, F-06）已实施
- [ ] **C.5 减动效模式** 已实现（`prefers-reduced-motion`）
- [ ] 所有新增动画时长**≤ 500 ms**（除死亡掉零件最长 1400 ms，属信息性动画）
- [ ] 屏幕震动**单次幅度 ≤ 6 px**（避免眩晕）
- [ ] 粒子总数**单帧上限 500**（防卡死）
- [ ] 所有新增绘制调用**用 `ctx.save()` / `ctx.restore()` 包裹**（防 alpha 泄漏）
- [ ] **无头测试**（README 描述的方法）通过

---

## H. 待补充 / 未定项（Phase 7 建议）

- **高对比度模式**（`?contrast=high` URL 参数，见 C.4 / C.6）
- **移动端触屏适配**（README 待办第 7 条，本项目明确不做）
- **存档系统**（`localStorage` 记忆静音、难度、通关状态 —— 与可访问性偏好绑定）
- **图标风格统一**（把 DOM emoji 全部替换为 Canvas 手绘，见 A.7）
- **纹理化土壤 / 铁桶**（程序化 noise pattern，见 A.5）

---

*文档结束。任何与本文冲突的视觉决策，以本文为准。任何建议改代码的地方，本文只写规格，不改代码，交 engineering-lead 实施。*
