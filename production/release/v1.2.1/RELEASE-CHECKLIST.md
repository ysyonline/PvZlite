# PvZ Lite v1.2.1 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-19：用户授权发布（06:09）+ 冻结副本入库 + 标签建立 → 定稿）。
> **版本**：v1.2.1 ｜ **发布日期**：2026-09-19 ｜ **产物**：`plants-vs-zombies.html`（单文件，2121 行）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-19 06:1x，独立 worktree `D:\code\pvz121-verify`（detached `f5d660d`，与发布源逐字节同源），解释器 Node v22.22.2（managed）。**用该提交自带的 v1.2.1 时代测试基线**（26 烟雾 + 30 REG，无 v1.3 新断言污染）。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 烟雾测试 | `node tests/harness/run-smoke.js` | 26/26 PASS | **26/26 PASS**（326ms） | ✅ |
| A2 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 56/56 PASS | **56/56 PASS**（533ms） | ✅ |
| A3 | 音频总线核验 | `node tests/harness/verify-bus.js` | 56/56 PASS | **56/56 PASS** | ✅ |
| A4 | 无头性能基准 | `node tests/perf/bench.js` | 四场景 PASS | **PASS**：A p50 0.26ms / B 0.55ms / C 0.92ms / **D 0.97ms（p95 1.86ms, 11% 预算）** | ✅ |
| A5 | 版本定版核对 | 源码 `VERSION` 常量（L43） | `v1.2.1` | **`const VERSION='v1.2.1'`** | ✅ |
| A6 | 源码考古核对 | `f5d660d` 内容指纹 | 2121 行 / 含 O3 / 零 roof | **2121 行**；`grep -c "roof"` = **0**；O3 标记存在 | ✅ |

> 注：A1–A4 门控数字与 v1.2.0 发布包完全一致（26/56/56），符合「补丁版仅动 O3 渲染分支、零机制变更」的预期。

## B. 真机人工验收

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | O3 真机复验 | ✅ 通过（2026-09-18 用户确认「水里看不见腿」修复） | v1.2.1 归档记忆 + `tests/playtests/o3-final-verify.js` 像素级验证 |
| B2 | 其余 M 项 | ✅ 全部继承 v1.2.0 结论（v1.2.1 未触碰对应代码路径） | `production/release/v1.2/RELEASE-CHECKLIST.md` §B |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v1.2.1.html` | ✅ 已入库（`git show f5d660d:plants-vs-zombies.html` 逐字节导出，LF，只读） |
| C2 | `RELEASE-NOTES.md` 定稿 v1.0 | ✅ |
| C3 | `KNOWN-ISSUES.md` 定稿 v1.0（含优化池核对固定节） | ✅ |
| C4 | `RELEASE-CHECKLIST.md`（本文件） | ✅ |
| C5 | `v1.2.1` 标签 | ✅ 打于 `f5d660d`（推送远端另行授权后执行，见 §G 挂起项） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至上一下线点 = 恢复 `production/release/v1.2/artifacts/plants-vs-zombies.v1.2.html` 冻结副本对外分发；仓库侧以 `v1.2.0` 标签重建分发链。
- 四处冻结产物（v1.0.0 / v1.1 / v1.2 / v1.2.1）均只读，任何热修必须走新版本流程，禁止原地改冻结副本。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v1.2.1/artifacts/plants-vs-zombies.v1.2.1.html` |
| 行数 | 2121（LF） |
| 字节数 | 92,048（LF 口径） |
| LF SHA-256 | `4df26326994aac227036bb497fc728f4a6ad47e051cecba4cabb7923a364ec87`（与 `git show f5d660d:` 输出逐字节一致，已核验） |
| 工作区 CRLF SHA-256（参考） | `8040b10f6a4426cf5e5379c3ef6f672108c86e20d1604f0b453d50a43bd7aab4`（autocrlf 检出态；换电脑核验请用 `git show HEAD:f5d660d 对应提交 | sha256sum` 的 LF 口径） |

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控复跑（v1.2.1 时代基线） | ✅（A1–A4，独立 worktree 干净树） |
| G2 真机验收 | ✅ O3 已闭环；其余继承 v1.2.0 |
| G3 冻结副本 + 完整性 | ✅（§E） |
| G4 发布签字 | ✅ **用户 2026-09-19 06:09 授权（「发 v1.2.1 正式版」）** |

**判定：✅ GO —— v1.2.1 发布放行。**

## G. 挂起项（发布后动作）

| # | 项 | 状态 |
|---|---|---|
| 1 | `v1.2.1` 标签 + main 推送远端 | ⏳ 待用户单独授权（本地已就绪：tag 锚定 `f5d660d`，main=`e7a6a1e`） |
| 2 | GitHub Release（如需挂发行附件） | ⏳ 未排期；冻结副本已入库，可随时补 |
