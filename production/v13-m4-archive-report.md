# v1.3-M4 屋顶斜坡 · 发布归档报告

- **归档人**：路远行（release-ops-lead）
- **日期**：2026-09-19
- **分支**：`main`（本地 commit，**未 push / 未 tag**）
- **归档前基线 HEAD**：`e736c62`（`balance(v1.3): 投手数值对齐原版 PvZ`）
- **归档范围**：v1.3-M3 屋顶皮肤实现（代码/生成物/规格/资产）+ v1.3-M4「5 列 C2 连续斜坡」设计阶段文档（GDD/ADR/工程规格/测试契约/一致性收口）
- **提交方式**：逐路径 `git add`（**未使用 `git add .`**）；中文 message 以 UTF-8 文件经 `git commit -F` 写入（规避终端中文乱码）

---

## 一、提交记录（本地 main，按时间顺序）

| # | commit | 摘要 | 范围 | 文件数 | 行数 |
|---|---|---|---|---|---|
| 1 | `682e418` | `chore: 忽略浏览器持久化 profile 与 WorkBuddy 临时产物` | .gitignore | 1 | +12 |
| 2 | `d7ad657` | `feat(v1.3-m3): 屋顶皮肤改斜置平面——旋转瓦带+屋脊城垛+檐沟灰化+檐口楔形` | M3 代码 + 生成物 | 2 | +227 / −159 |
| 3 | `a9a1589` | `chore(perf): 屋顶皮肤后 bench 重基线（场景E draw calls 2133→2429，判级 PASS）` | perf 基线 | 1 | +31 / −6 |
| 4 | `f397a57` | `docs(v1.3-m3): 屋顶皮肤实现规格 + 概念美术资产` | M3 规格 + 资产 | 10 | +1562 |
| 5 | `52e6e15` | `docs(v1.3-m4): 5 列 C2 连续斜坡设计阶段定稿——ADR-005 + 工程规格 + 可行域评估 + 测试契约` | M4 设计阶段新增 | 5 | +1410 |
| 6 | `9d9b36e` | `docs(v1.3-m4): 斜坡设计一致性收口——GDD/规划/架构/测试契约同步` | M4 收口 | 8 | +418 / −22 |
| 7 | （本报告所在 commit） | `docs(memory): v1.3-M3/M4 归档——接手指南 + 发布归档报告` | memory + 本报告 | 3 | — |

### 各 commit 具体路径

**#1 `682e418`** — `.gitignore`

**#2 `d7ad657`**
- `plants-vs-zombies.html`
- `docs/code-map.md`（`node tools/gen-code-map.mjs` 重生成）

**#3 `a9a1589`**
- `docs/architecture/perf-profile.md`（§7 自动段回填 + 新增 §7.1 人工口径说明）

**#4 `f397a57`**
- `production/v13-m3-visual-impl-spec.md`
- `design/assets/m3-rooftop-concept/`（9 个文件：2 概念 PNG、`slope-bc-compare.png`、`slope-c2-5col.png`、`m3-v2-implementation-notes.md`、`slope-bc-art-notes.md`、`slope-c2-art-spec.md`、`slope-bc-preview.html`、`slope-c2-5col-preview.html`）

**#5 `52e6e15`**
- `docs/architecture/ADR-005-roof-5col-continuous-slope.md`
- `production/v13-m4-c2-5col-impl-spec.md`
- `production/v13-m4-slope-eng-assessment.md`
- `production/v13-m4-handoff.md`
- `tests/v13-m4-slope-acceptance.md`

**#6 `9d9b36e`**
- `design/gdd/level-5.md`、`design/gdd/level-3.md`、`design/gdd/roof-process.md`
- `docs/architecture/v1.3-roof-projectile.md`
- `production/v1.3-plan.md`、`production/v13-s1-foundation-review.md`
- `tests/README.md`、`tests/regression-plan.md`

**#7（本 commit）**
- `.workbuddy/memory/2026-09-19.md`、`.workbuddy/memory/MEMORY.md`
- `production/v13-m4-archive-report.md`（本报告）

---

## 二、未提交项及原因

均为本地调试/工具产物，**不应入库**，已由 #1 的 `.gitignore` 规则排除：

| 项 | 原因 |
|---|---|
| `.tmp-m3-verify/`、`.tmp-ref-sample/` | 浏览器**持久化 profile**，数千文件（含 Cookies / Login Data / History 等），绝不可入库 |
| `.workbuddy/tmp-m3-verify.js`、`tmp-png-sample.js`、`tmp-ref-sample.js`、`tmp-seam-probe.js` | 一次性探针脚本 |
| `.workbuddy/m3-batch-b-frame.png`、`.workbuddy/preview-m3-e.html` | 临时截图 / 预览页 |
| `.tmp-plan-*` / `.tmp-msg*` / `.tmp-commit-*` | 本轮盘点与提交过程产生的临时文件（含本报告撰写用的 message 文件） |

> 说明：上述两个 profile 目录**未执行删除**（用户环境安全层会拦截删除操作），仅通过 `.gitignore` 排除，确保 `git status` 干净、不会被误 `add`。如需清理磁盘占用，请由用户手动删除。

---

## 三、性能基线（bench 复跑）与噪声记录

- **复跑命令**：`node tests/perf/bench.js`（Node v22.22.2 · win32 x64 · i3-10110U ×4 · seed=20260918）
- **复跑时间**：2026-09-19 10:08 UTC
- **判级**：**PASS**（全场景 p95 ≤ 16.67ms 且 p50 ≤ 8ms）

| 场景 | p50 | p95 | max | mean | p95预算比 | draw 全口径 | draw 估算口径 |
|---|---|---|---|---|---|---|---|
| A L1 空场 | 0.35 | 0.88 | 3.06 | 0.42 | 5% | 435 | 299 |
| B L1 中期 | 0.85 | 1.89 | 15.31 | 1.10 | 11% | 995 | 687 |
| C L3 末波 | 1.35 | 3.40 | 12.10 | 1.72 | 20% | 1708 | 1188 |
| D L4 地狱水景 | 2.13 | 6.75 | 18.01 | 2.90 | 40% | 2008 | 1344 |
| E L5 屋顶 | 2.29 | 6.27 | 14.88 | 2.95 | 38% | 2429 | 1424 |

**基线可信度记录（要点，详版见 `docs/architecture/perf-profile.md §7.1`）**：
1. **绝对帧耗时不可比**：本次全场景 p95 较 HEAD 整体上移约 2–3 倍，且**含完全没有屋顶代码路径的 A 场景**（0.41 → 0.88 ms）⇒ 指向**本机负载 / 状态差异**（原跑 03:10、本次 10:08），**非 M3 回归**。本版帧耗时数字仅代表本次机器状态。
2. **draw calls 是可口径**（不受负载影响，跨时可比）：
   - **M3 唯一可归因信号**：场景 E `2133 → 2429`（+296，≈ +14%），与新增屋顶皮肤绘制（旋转瓦带 + 城垛 + 檐口）量级吻合。
   - **未外溢证据**：A–D 的 draw calls 与 HEAD **逐值一致**（435 / 995 / 1708 / 2008）⇒ M3 代码**未外溢到 L1–L4**，回归面干净。
3. **噪声误判已排除**：本基线取代的上一版曾出现 `PASS → CONCERNS`（场景 D p95 `41.81 ms` / max `263.70 ms` / 全表 max `263.70 ms`），该次已由本次干净复跑验证为**重跑时机器负载噪声**，非真实回归。
4. **结论**：跨时 / 跨机对比请以 **draw calls 与相对量级**为准，**不要直接比绝对帧耗时**。

---

## 四、源码噪声剥除记录

- **问题**：`plants-vs-zombies.html` 中被外部工具注入了 **18 处 `data-page-node-id="…"` 属性**（分布在 14 行，均位于文档骨架：`<html>`/`<head>`/`<meta>`/`<body>`/`#wrap`/`#canvas`/`#bar`/`#stat` 内 4 个 `<b>`/`.ctrl`/4 个 `<button>`），**HEAD 版本为 0 处**，无任何功能语义。
- **处置**：由 engineering-lead 执行**仅删该属性、不夹带任何其他改动**；
- **复核（路远行独立验证，非引用工程侧结论）**：
  - `data-page-node-id` 计数 = **0**（ripgrep 与 node 双路径）
  - 行数 **2346**（删属性为行内操作，行数不变）；字节 **106386**
  - 交叉核对：单属性含前导空格恰 **43 字符** × 18 = **774 B**，与工程的 −774 B 一致 ⇒ 确系纯删属性、无夹带
  - `git diff` 该文件现为**纯 M3 改动**（首 hunk 从 `ROOF_SLOPE` 常量起）
- **生成物同步**：`docs/code-map.md` 已按剥属性后源码重跑（**2345 行 · 68 函数 · 47 常量 · 11 分区**）。

---

## 五、复核与门控小结

- 提交前对 `plants-vs-zombies.html` / `docs/code-map.md` 完成独立复核（见 §四）。
- 归档期间工作区路径清单经确认稳定（策划/美术/工程/QA 四方收口均已完成），提交按批准方案逐路径执行，无 `git add .`。
- **未执行高影响动作**：本次未 `push`、未 `tag`、未 `rebase`、未 `reset`。

---

## 六、后续待办（不在本轮范围）

1. **推送 / 打 tag**：需**用户单独授权**后方可执行。
2. **v1.3-M4 C2 斜坡实现阶段**：按 `production/v13-m4-c2-5col-impl-spec.md` + `ADR-005` 施工，验收依 `tests/v13-m4-slope-acceptance.md`（门控目标 烟雾 28 · REG 34 · 总线 56）。
3. **`docs/architecture/perf-profile.md §7.1` 维护**：若将来重新基线，请一并更新该节（其中已声明）。

---

*本报告由 release-ops-lead（路远行）生成，作为 v1.3-M3/M4 归档的发布记录。*
