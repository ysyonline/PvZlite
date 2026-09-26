# PvZ Lite v2.2.1 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-26：技术门 G1–G4 全绿 + 冻结副本校验 + 消缺三 bug 自证 → 发布定稿；G5 待用户授权）。
> **版本**：v2.2.1 ｜ **发布日期**：2026-09-26 ｜ **产物**：`plants-vs-zombies.html`（单文件，4350 行 / 234,825 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-26 08:3x（+0800）。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 原开发机 weixufeng。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 91/91 PASS | **91/91 PASS**（SMOKE 29 + REG 62） | ✅ |
| A2 | 音频总线核验 | `node tests/harness/verify-bus.js` | 56/56 PASS | **56/56 PASS** | ✅ |
| A3 | 无头性能基准 | `node tests/perf/bench.js` | 五场景 PASS | **PASS**（判级无头口径） | ✅ |
| A4 | 版本定版核对 | 源码 `VERSION` 常量（L62） | `v2.2.1` | **`const VERSION='v2.2.1'`** | ✅ |
| A5 | 版本标签通扫核对 | grep 活文件 | 无 `v2.2.0` 活默认值残留 | prelude / v17-acc / v18-acc 三处同步；历史文档/画像脚本/记录保持原貌；复扫零残留 | ✅ |
| A6 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行号与定版源码一致 | **已重跑**（4350 行 / 20 分区 / 103 函数 / 77 常量） | ✅ |

## B. 消缺验收

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | 三难度关卡进度独立 | ✅ | 存档键 `pvz_progress_v3` + per-difficulty `diffProgress`；难度切换时进度交换落盘 |
| B2 | 结算屏精简 + 礼盒动画 | ✅ | 删四行中间信息 + 礼盒开箱动画（工程初版，视觉规格待美术） |
| B3 | 下一关进选卡界面 | ✅ | `onClickEnd` 改 `setState('deck')`；候选池取三难度 cleared 合集 |
| B4 | 用户 Go/No-Go | ⏳ | 待用户授权 |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v2.2.1.html` | ✅ 已导出（`git show HEAD` 重定向字节直通，`cmp` 逐字节一致，见 §E） |
| C2 | RELEASE-NOTES.md | ✅ 已定稿 |
| C3 | KNOWN-ISSUES.md | ✅ 已定稿 |
| C4 | RELEASE-CHECKLIST.md | ✅ 本文件 |
| C5 | `v2.2.1` 标签 | ✅ 已推送（轻量标签 @ `04f3090`） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至 `production/release/v2.2.0/artifacts/plants-vs-zombies.v2.2.0.html` 冻结副本对外分发。
- 本版增量 = 三缺陷修复 + 礼盒动画，无关卡波次 / 僵尸属性 / 伤害公式变更，revert 提交即可回退。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v2.2.1/artifacts/plants-vs-zombies.v2.2.1.html` |
| 导出方式 | `git show HEAD:plants-vs-zombies.html` —— 重定向字节直通（LF，`cmp` 工作区逐字节一致） |
| 行数 | 4350（LF 口径） |
| 字节数 | **234,825**（LF 口径，冻结副本权威口径；v2.2.0 = 226,174，+8,651B 来自三缺陷修复 + 礼盒动画 + code-map 刷新） |
| LF SHA-256 | `ccee73a35eaea59b0d3fe33854e223bcb54107ba02e373578e4cd88598889575` |
| 冻结副本内版本标识 | L62 `const VERSION='v2.2.1';   // v2.2.1 消缺版：三难度关卡状态独立(存档键 pvz_progress_v3) · 结算屏精简+礼盒开箱动画 · 下一关改走选卡界面` |

> 校验命令（LF 权威口径）：
> ```
> git show HEAD:plants-vs-zombies.html | sha256sum
> # 期望：ccee73a35eaea59b0d3fe33854e223bcb54107ba02e373578e4cd88598889575
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控复跑 | ✅（A1–A3） |
| G2 消缺自证 | ✅（B1–B3） |
| G3 冻结副本 + 完整性 | ✅（§E `cmp` 逐字节一致） |
| G4 标签已推送 | ✅（`v2.2.1` @ `04f3090`） |
| G5 发布签字 | ⏳ 待用户授权 |

**判定：✅ 全门 PASS——发布执行（待用户 G5 授权）。**

## G. 挂起项（发布后动作 · 均须用户授权）

| # | 项 | 状态 |
|---|---|---|
| 1 | 礼盒动画视觉规格（交美术） | ⏳ 进行中（art-director 已调度） |
| 2 | 真机截图验收 | ⏳ 待办 |
| 3 | 礼盒动画按美术规格重绘 | ⏳ 待规格落盘 |
| 4 | 世界 3/4 真实关卡补全（Q-12 占位） | ⏳ v2.3 计划 |
| 5 | 墓碑机制实装 | ⏳ v2.3 计划 |
| 6 | 金币留存钩子 | ⏳ v2.3 计划 |