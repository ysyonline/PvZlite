# v1.3-M4 · 第 5 关屋顶「5 列连续坡面（C2）」· 设计定稿与交接

> 状态：**设计阶段完成 · 待实施**
> 日期：2026-09-19
> 主理人：游承峰（game-development-studio-team-lead）
> 用途：**本文件是实施阶段（新会话）的唯一入口**。所有细节以本文索引的权威文档为准，本文不重复其内容。

---

## 0. 一句话

第 5 关屋顶从「平的」改为**左低右高的连续斜坡 + 右侧水平平台**（对齐《植物大战僵尸》原版屋顶），走 **C2 几何路线**（破除 `gridToPos` 平面假设）。核心改动 **≈ +40~65 行**，**回归零漂移**。

**本轮未改任何实现代码** —— `plants-vs-zombies.html` 保持 M3 状态。

---

## 1. 用户拍板结论（不可自行变更）

| 项 | 结论 | 备注 |
|---|---|---|
| 路线 | **C2 · 几何连续平滑坡面** | 格子平行四边形 + 僵尸沿坡连续行走 |
| 斜坡范围 | **col 0–4（5 列）**；平台 col 5–8（4 列） | 用户由 3 列改为 5 列 |
| 方向 | **左低右高**（col0 最低 → col4 最高） | 用户确认「没反」 |
| 抬升总量 `H` | **60px** | 主理人裁决：尊重用户「默认」+ 工程建议留余量；**硬上限 66** |
| 城垛高 | **12px** | 源码 `MERLON_H=12` 现值；美术草图 14 仅示意 |
| 弹道语义 | **α（随地面列抬升）** | 工程 / QA / 主理人三方一致 |
| 补天空块 | **不需要** | C2「向上抬升」模型下天空带天然覆盖（已纠正任务书旧假设） |

---

## 2. 参数接口（权威 · 四方统一）

```js
// 主口径（单点 gate）
liftX(x) = ROOF_LIFT_H * clamp((x - GRID_X) / (ROOF_COLS * CELL_W), 0, 1)
//   ROOF_COLS   = 5        （斜坡列数）
//   ROOF_LIFT_H = 60       （总抬升 px）
//   liftX 内部 gate：if (!level.roof) return 0
```

- 斜坡横跨 `x ∈ [55, 505]`；每列增量 **12px**（列边界累计 0/12/24/36/48/60）
- 坡角 ≈ **7.6°**
- **逻辑层**：`gridToPos` 格心 `y = GRID_Y + row*CELL_H + CELL_H/2 − liftX(x)`
- **绘制层**：檐板色 `#463b2b` 把平台底（540）→ 600 补成屋面厚度，**视觉底边沿停在 y=600**
- **闭式反解**：先 `col = ⌊(x − GRID_X) / CELL_W⌋`，再 `row = ⌊(y − GRID_Y + liftX(x)) / CELL_H⌋`
- **两函数必须共用同一 `liftX`**（互逆的充要条件）
- ⚠️ **禁止**：发射 y **不得**再手减 `liftX` —— `gridToPos` 已自动抬升，重复相减会双重抬升反而 miss

---

## 3. 权威文档索引

| 主题 | 文件 | 权威性 |
|---|---|---|
| 架构决策：为什么破除平面假设 | `docs/architecture/ADR-005-roof-5col-continuous-slope.md` | **决策权威** |
| 逐块施工单 + BLOCKING 清单 + 行数 | `production/v13-m4-c2-5col-impl-spec.md` | **实施权威** |
| 可行域推导（H 上下限 / 5 vs 3 列） | `production/v13-m4-slope-eng-assessment.md` §D | 参数依据 |
| B/C 评估、400+ 澄清、C1/C2 分叉 | 同上 §0–§6 / §C | 背景 |
| 美术规格定稿（几何 + 配色 + 补偿三件套） | `design/assets/m3-rooftop-concept/slope-c2-art-spec.md` | **视觉权威** |
| 美术效果图（5 列 C2 定稿） | `design/assets/m3-rooftop-concept/slope-c2-5col-preview.html` / `slope-c2-5col.png` | 视觉基准 |
| GDD 斜坡地形规格 | `design/gdd/level-5.md` §3.6 | 设计权威 |
| 测试契约 + 验收标准 | `tests/regression-plan.md` §8/§9 · `tests/v13-m4-slope-acceptance.md` | **验收权威** |
| 抛物弹道（注意其顶部勘误条） | `docs/architecture/v1.3-roof-projectile.md` | 需先读勘误 |

---

## 4. 实施要点（细节以施工规格为准）

### 4.1 必改 · BLOCKING

1. **映射层**：`gridToPos` / `posToGrid`（L232–233）→ 加 `liftX` + 闭式反解
2. **弹道命中基线（最高危）**：
   - L1073（命中主管线）、L991（cabbage 瞄准）、L1024（地瓜判据）→ 一律 `− liftX(...)`
   - ⚠️ **漏改 ⇒ L5 平台列直线弹纵向偏差 ≥ 68px > 命中窗 32px ⇒ 全体 MISS**，**且现有用例无一能捕获**
3. **实体 y 连续**：`drawZombie`（L1816）等实体 y → `− liftX(z.x)`（连续，非阶梯）

### 4.2 绘制层重做

- 棋盘格（L1400）、瓦带 / 竖缝、城垛（**5 斜段 + 4 平段**）、檐口、预览框（L1535）、檐板补厚
- **弃用 `ROOF_SLOPE=0.18`**（M3 的旋转带口径与 C2 的逐 x 抬升口径不同），皮肤重写为 shear 口径
- **补偿三件套**（美术 · 纯绘制）：① 斜坡段每行内增补一条半缝 ② 加强沿坡明暗 ③ 屋脊压条斜段 8→10px 加粗 —— 用于抵消 7.6° 的偏缓读数

### 4.3 禁止项

- 不得手减发射 y 的 `liftX`（双重抬升）
- 不得改布局常量（`GRID_X/GRID_Y/CELL_*`）
- 不得触碰 L1–L4 任何路径（`liftX` 单点 gate 保证）

### 4.4 实施后

- 重跑 `node tools/gen-code-map.mjs` 刷新 `docs/code-map.md` 行号

---

## 5. 验收

**自动化门控**：预期 **28 / 34 / 56**（较基线 27/60/56 增 2 条烟雾与回归条目 —— 以 `tests/v13-m4-slope-acceptance.md` 口径为准）

**两条新用例必须通过其「对抗性自检」**（这是它们有效性的证明，不是可选项）：
| 用例 | 作用 | 对抗性自检 |
|---|---|---|
| `REG-SLOPE-01` | 斜坡几何契约（往返精确 + L1–L4 逐字节恒等） | **去掉 `posToGrid` 的 `+liftX` 后必须变红** |
| `SMOKE-028` | L5 坡上弹道命中（col6 平台 + col4 斜坡双列） | **让 `zy` 不抬升后必须变红** |

**真机复验**：`tests/v13-m4-slope-acceptance.md` 的 M1–M8。
其中 **M1（L5 全场 y 平移 60px 后的手感）与 M3（斜坡段落格直觉）为一票否决**。

---

## 6. 回退

全部改动收口于 `liftX` 单点 gate 与 `level.roof` 分支；回退 = 反向施工规格 §6 列出的 5 处独立块，零连带。

---

## 7. 已知未决 / 回退阀

| 项 | 现状 | 回退阀 |
|---|---|---|
| H 值 | 定稿 60 | 真机若仍觉「平」→ 单常量提到 66（硬上限） |
| 弹道 α 语义 | 设计侧定 α | 若真机发现 α 影响老关手感 → 施工规格 §7-1 的 β 备选 |
| 城垛贴顶 | H=60 下顶部余量 8px | 若 H 上调则余量同步收紧，需重算 |

---

## 8. 本轮（设计阶段）交付清单

- **新增**：`docs/architecture/ADR-005-roof-5col-continuous-slope.md`（架构决策）
- **新增**：`production/v13-m4-c2-5col-impl-spec.md`（施工规格）
- **新增**：`production/v13-m4-slope-eng-assessment.md`（B/C 评估 + 可行域）
- **新增**：`production/v13-m4-handoff.md`（本文件）
- **新增**：`design/assets/m3-rooftop-concept/slope-c2-art-spec.md` + `slope-c2-5col-preview.html` + `slope-c2-5col.png`（美术定稿）
- **新增**：`design/assets/m3-rooftop-concept/slope-bc-*`（3 列 B/C 历史对照）
- **新增**：`tests/v13-m4-slope-acceptance.md`（验收标准草案）
- **改判**：`design/gdd/level-5.md`（v1.3-M4；拍板项 ④ → C2；新增 §3.6）
- **勘误**：`design/gdd/roof-process.md`（原「C 档否决」加勘误块 + 就地标注）
- **勘误**：`production/v13-m3-visual-impl-spec.md`（§2.1① / §11-C12 红线已被 ADR-005 推翻）
- **勘误**：`docs/architecture/v1.3-roof-projectile.md`（`zy` 列无关定性作废）
- **勘误**：`design/assets/m3-rooftop-concept/m3-v2-implementation-notes.md`（「不动 gridToPos」前提被推翻）

---

*设计阶段完 —— 实施请从 §4 与施工规格 §2/§3 起手；验收请以 §5 与 `tests/v13-m4-slope-acceptance.md` 为准。*
