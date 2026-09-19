# M3 返工 v2 ·「系统可实现版」效果图 · 实现映射说明

> 作者：林绘澄（art-director） · 2026-09-19 · 任务 V13-M3-ART-02
> 产出物：`design/assets/m3-rooftop-concept/2D_side_view_cartoon_tower_def_2026-09-19T05-29-33.png`
> 目的：给用户（旭峰）评审「倾斜屋面 + 天空」方向；**本轮不写代码**，本文只做「图 → Canvas 2D 原语」的可行性映射，为程基岩后续工程评估留接口。
> 前置约束：单文件 Canvas 2D、零位图、`gridToPos` 平面假设**不可破坏**（GDD level-5.md 拍板项④「轻视觉」；roof-process.md §2.4 判定真实 per-row 抬升 = C 档，否决）。 ← ⚠️ **【已推翻 · v1.3-M4】本句前提作废**（用户拍板改走 C2 几何斜坡）——以 `slope-c2-art-spec.md` 为准，详见紧邻下方勘误块。

---

> ## ⚠️ 勘误（v1.3-M4 · 2026-09-19 · 林绘澄回填）—— 本文部分结论**已被推翻，仅供追溯**
>
> **本文下方 §1「倾斜 = 纯绘制层错觉、不动 `gridToPos`」与 §4「红线声明：`gridToPos` / `posToGrid` 一字不改」已被用户拍板推翻。**
> 用户验收后决定改走 **C2 = 几何连续平滑坡面**（真实逐列 Y 抬升 + 平行四边形格子），即本文当初判定「不建议 / 落回 C 档」的那条路。
> **本条勘误并直接覆盖上方 L6**「前置约束：… `gridToPos` 平面假设不可破坏（拍板项④轻视觉 / roof-process §2.4 否决）」**整句**（该句已在原处加 ⚠️ 标记）。
>
> **生效定义以以下两份为准（本文不作施工依据）：**
> - `slope-c2-art-spec.md`（**v1.3-M4 美术规格定稿**：C2 / 斜坡 **col 0–4（5 列）** / 平台 col 5–8 / `liftX(x)=H·clamp((x−55)/450,0,1)` / H=60 / 左低右高）；
> - `slope-c2-5col-preview.html`、`slope-c2-5col.png`（配对效果图）。
>
> **本文仍然有效的部分**：§2 图→Canvas 原语可行性映射、§3 配色 Token、§5 天空占比口径（≈13% / 0–90px）、§6 ImageGen 复现 prompt —— 这些与 C2 不冲突，可继续引用。
>
> 保留原文不改写，以维持「为何当初判轻视觉」的决策链可追溯。

---

## 0. 一句话结论

用户要的「倾斜感」**不需要**动 `gridToPos`、不需要 per-row Y 偏移。
**倾斜 = 纯绘制层错觉**，由 4 个廉价手段叠加：①天空+地平线 ②屋脊城垛 ③斜向砖缝（剪切）④屋面斜边剪影 + 方向光渐变。
全部落在 `drawGameWorld` 与一个新增的「天空带」绘制块内，**约 50–90 行绘制改动，零触碰 种植校验 / 弹道 / gridToPos**。

---

## 1. 核心问题：倾斜感靠什么实现？

按「叠加顺序 = 视觉权重」排列。**①②③ 是必选**（缺任一都还是会读成平面）：

| # | 手段 | 原理 | 可行性 | 落点 |
|---|---|---|---|---|
| ① | **天空带 + 地平线** | 在网格上方画一条蓝到浅蓝的线性渐变 + 白云。有「天」才有「在屋顶上」的参照系。 | **轻** | `drawGameWorld` 开头，覆盖 y≈0–90 |
| ② | **屋脊城垛** | 沿网格**顶缘**（y=GRID_Y）画一排 merlon 矩形剪影，压在天空上。把「平铺砖面」变成「有女儿墙的屋面」。 | **轻** | `drawGameWorld` roof 分支 |
| ③ | **斜向砖缝（剪切）★核心** | 现有竖缝是**纯垂直错缝**→ 读作砖墙/地面。改为**斜缝**：缝的两端点做水平剪切（`x_top = x + (yTop-y0)*slope`，`slope≈0.12~0.18`），砖块变平行四边形 → 读作斜屋面。 | **中** | 改现有 L1404–1420 循环 |
| ④ | **屋面斜边剪影 + 方向光渐变** | 网格外侧补画斜边三角（左/右檐口），让整体轮廓成斜面而非矩形；整块屋面叠一层斜向 linearGradient（远亮近暗）强化"面朝上受光"。 | **轻–中** | `drawGameWorld` roof 分支 |

> **为什么不是「per-row 逐行抬高」？** —— 那会让 `gridToPos`/`posToGrid`、弹道 y-window（`zy=GRID_Y+row*CELL_H+…`）、僵尸行进 y 全部改为变常量，牵动 150–250 行 + 大量 REG 重写（roof-process.md §2.4）。**视觉收益 ≠ 成本**，本方案用「装饰层剪切」白拿同样的读感。

---

## 2. 逐要素映射表（图 → Canvas 原语 → 可行性）

| 图中要素 | 对应 Canvas 2D 原语 | 可行性 | 现有代码基础 |
|---|---|---|---|
| 蓝天竖直渐变 | `createLinearGradient(0,0,0,90)`，`#cfe8f2→#8fc0dd` | 轻 | 新增（现顶部 80px 裸露 CSS 绿底 `#7fbf4a`，需覆盖） |
| 扁平白云 | 2–3 组 `arc`/`ellipse` 白团（可缓漂） | 轻 | 新增；参照 `drawMenu` 静态条纹思路 |
| 屋脊城垛（merlon） | `fillRect` 循环（宽≈CELL_W/2，隔一格）+ 深灰棕 | 轻 | **改造**：现 L1422–1427 城垛画在**底部**，方向反了，应上移到屋脊 y=GRID_Y |
| 屋面底色 / 9×5 棋盘 | 现有 `lawn` 两色 `fillRect` 棋盘（`#8a7a5a`/`#6e5f45`） | 已实现 | `drawGameWorld` L1368–1372 |
| 斜向瓦缝（平行四边形砖） | `beginPath/moveTo/lineTo + stroke`，端点水平剪切 | 中 | **改造**现有竖缝 L1409–1420 |
| 横向砖缝（含远光提亮） | `stroke` 横线 + 上缘 1px 浅色 `fillRect` | 轻 | 现 L1402–1407 已有横缝，加一条高光即可 |
| 屋面斜边剪影（左/右檐口斜坡） | `beginPath` 三角/梯形 `fill`（砖色） | 中 | 新增 |
| 方向光渐变（斜向受光） | `createLinearGradient`（对角）+ `rgba` 叠加 | 轻 | 新增；参照黄昏/月夜滤镜写法 L1430–1446 |
| 瓦楞弧纹（可选，替代纯直线缝） | 每格底缘 `arc` 半圆 | 中 | 可选，与「斜缝」二选一或叠加 |
| 花盆 planter | 现有 `planter` 分支（陶土梯形 + 椭圆口沿） | 已实现 | `drawPlantInner` L1602–1619 |
| 植物（卷心菜/向日葵/豌豆） | 现有 `drawPlantInner` 各 type 分支 | 已实现 | L1620–1694 |
| 僵尸（普通/路障…） | 现有 `drawZombie` | 已实现 | L1748+ |
| 底部卡片栏 | 现有 `drawCardBar` | 已实现 | — |
| 右侧「道路/檐沟」 | 现有 `ROAD_W` 条带改色（砖色 → 灰棕檐沟色） | 轻 | `drawGameWorld` L1447–1454 |

**可行性汇总：轻 7 项 · 中 4 项 · 已实现 5 项 · 重 0 项。**
→ 图里**没有任何一个视觉**需要写不出来的原语（无 `shadowBlur`、无 `ctx.filter`、无位图），全部是 `fillRect / path / arc / linear&radialGradient / globalAlpha`。

---

## 3. 配色 Token（对齐 art-handoff.md A.2）

| 用途 | 值 | 说明 |
|---|---|---|
| 天空亮（顶） | `#cfe8f2` | 新增；白云感 |
| 天空主 | `#8fc0dd` | 新增；地平线附近 |
| 屋面亮瓦格 | `#8a7a5a` | 沿用 `LEVELS[5].lawn[0]`（不新增） |
| 屋面暗瓦格 | `#6e5f45` | 沿用 `LEVELS[5].lawn[1]` |
| 砖缝（现有） | `rgba(0,0,0,0.14 / 0.10)` | 可保持，斜缝后观感更强 |
| 城垛剪影 | `#6a5a44`（或沿用现有 `rgba(0,0,0,0.18)` 加深） | 顶部需可辨于天空 |
| 檐沟 / 右条带 | `#5a5248`（灰棕） | 由现有道路 `#5a3a22` 微调 |
| 方向光叠层 | `rgba(255,240,210,0.10)` → `rgba(40,20,0,0.18)` | 新增；对角 |

> 色域检查：屋面褐落在 A.2「土壤褐 H25–40」带内；天空蓝为**本关新增色相**（前三关无此色），不与任何现有 token 冲突，无「禁紫 / 禁纯 RGB」违规。

---

## 4. 与 `gridToPos` 的关系（红线声明）

- ✅ 格子填充仍是**轴对齐 `fillRect`**，`gridToPos/posToGrid` **一字不改** → 种植、铲除、弹道命中、僵尸行进全部零感知。
- ✅ 倾斜只作用在**装饰层**（斜砖缝、屋面斜边、渐变、天空、城垛）—— 装饰与格子轻微不重合在**本作几何色块画风下可接受**（棋盘明暗本身很淡，肉眼不会去对齐砖缝与格子）。
- ⚠️ **唯一风险**：若用户要求「砖缝与格子严丝合缝的透视」（真梯形），则必须动 `gridToPos` → 落回 C 档，**不建议**。建议维持本方案。

---

## 5. 待用户 / 工程确认（遗留项）

1. **天空占比**：概念图天空 ≈20–25% 高（136–170px）；但游戏网格固定从 `y=80` 起，**可用天空仅 ≈80–90px（≈13%）**。
   - 建议：维持天空 0–90px（不侵占网格，零玩法影响）——本效果图即此口径。
   - 若用户坚持更多天空：需把「屋脊 + 城垛」带**下压进网格顶部若干像素**，或缩小 `GRID_Y`；前者仅视觉可（城垛盖住 row0 顶缘），后者动布局常量需程基岩评估。**请用户拍板取舍。**
2. **倾角方向**：本效果图屋面**向远处（上）倾斜、砖缝统一右倾**。若用户想左倾 / 更陡，`slope` 一个常量即可翻转，Playtest 可调。
3. **实现手法**：斜缝有两条路——③手动剪切端点（直观、可控） vs `ctx.transform(1,0,slope,1,0,0)` 整体斜切（更省行）。**建议交程基岩在「性能 + 可读性」间定夺**（本作禁 `ctx.filter`，transform 是允许的原语）。

---

## 6. 复现用 Prompt（ImageGen 原文）

```
2D side-view cartoon tower-defense video game level background, flat vector cartoon art like a simple HTML5 canvas game, clean thick outlines, flat color blocks with simple gradients, warm limited palette, landscape orientation. Absolutely NO photorealism, NO 3D render, NO realistic lighting or complex texture.

Scene: a tilted rooftop terrace of a house, seen straight-on as the playable game field.

SKY (top ~20%): bright cheerful blue sky, flat vertical gradient from pale sky-blue at the top to medium blue, a few simple flat white fluffy clouds.

THE ROOF (lower ~80%): a large warm-brown tiled roof surface that is clearly SLOPED. The roof recedes upward like an inclined plane: rows of ceramic roof tiles are arranged in parallel diagonal bands that climb toward the top and lean, so the surface obviously reads as a slanted tilted roof sloping away from the viewer — NOT a flat floor. Tile colors: warm terracotta brown (#8a684d) with darker brown (#6e5f45) alternating rows, simple flat scalloped / brick tile shapes separated by darker grout lines. A soft diagonal shading gradient (lighter near the far top edge, darker near the bottom) reinforces the slope and direction of light.

BATTLEMENT: along the top edge of the roof, silhouetted against the sky, runs a crenellated battlement parapet — a row of rectangular castle merlons, grey-brown.

PLAYFIELD: on the roof surface, a clear 9-column by 5-row grid of square planting cells. Some cells hold a simple flat terracotta flower pot (planter). A few cells hold simple flat cartoon plants: a green cabbage ball with leaves, a yellow sunflower with a smiling face, a green peashooter. On the right side, 2-3 simple flat cartoon zombies (grey-green skin, simple rounded shapes) walk toward the left.

BOTTOM: a simple horizontal HUD card bar with a row of small flat brown card rectangles, like a real running game.

Cohesive simple cartoon style drawn with basic geometric shapes, circles and rectangles and simple gradients, reproducing a real 2D canvas game screenshot.
```

- 生成参数：`size=1536x1024`（≈1.5:1，最接近画布 1000×680 的 1.47:1）、`quality=high`、`output_dir=D:\code\PvZlite\design\assets\m3-rooftop-concept\`
- 说明：ImageGen 出的是「氛围参照」，其瓷砖透视比 Canvas 能画的略「厚」；实现时**只取其调性与坡度读感**，落地按 §1 的 4 手段简化还原。

---

*本文只写规格，不改任何代码。落地可行性最终以程基岩评估 + 用户视觉验收为准。*
