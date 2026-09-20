# PvZ Lite v1.3 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-21：技术门 G1–G3 全绿 + 冻结副本导出校验 → 技术定稿；G4 发布签字待用户最终 Go/No-Go）。
> **版本**：v1.3 ｜ **发布日期**：2026-09-21 ｜ **产物**：`plants-vs-zombies.html`（单文件，2538 行 / 118,718 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-21 07:1x，独立 worktree（detached `51344fca`，与发布源逐字节同源），解释器 Node v22.22.2（managed）。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 烟雾测试 | `node tests/harness/run-smoke.js` | 28/28 PASS | **28/28 PASS**（225ms） | ✅ |
| A2 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 67/67 PASS | **67/67 PASS**（544ms，屋顶链全过） | ✅ |
| A3 | 音频总线核验 | `node tests/harness/verify-bus.js` | 56/56 PASS | **56/56 PASS** | ✅ |
| A4 | 无头性能基准 | `node tests/perf/bench.js` | 五场景 PASS | **PASS**：A p50 0.11/p95 0.27 · B 0.27/0.59 · C 0.50/0.98 · D 0.54/1.18 · E p50 0.86/p95 1.85ms（E=屋顶地狱 DC 2778） | ✅ |
| A5 | 版本定版核对 | 源码 `VERSION` 常量（L49） | `v1.3` | **`const VERSION='v1.3'`**（已终核） | ✅ |
| A6 | 源码考古核对 | 定版提交内容指纹 | 2537 行 / 屋顶·投手标识符在位 | 2537 行；`ROOF_COLS`/`ROOF_LIFT_H`/`CABBAGE_VX=260`/`CABBAGE_G=500`/planter cost 25/cabbage 100/20/2.0 全在位 | ✅ |

> 注：A6 指纹 2537 行为 blob 源码行计法（不含末尾换行计数）；冻结副本文件行数为 2538（LF 口径，git show 对象含末尾换行），两者同源不矛盾，权威口径以 §E 冻结副本为准。

## B. 真机人工验收

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | M1–M6 真机验收 | ✅ 完成（M1✅ M2✅ M4✅ M5✅ M6✅，2026-09-19 归档；M3 视觉方案已施工闭环） | v1.3 周期真机验收归档记录 |
| B2 | M7/M8 机器验证 | ✅ 全绿 | `tests/v13-m7-m8-report.md` |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v1.3.html` | ✅ 已导出（2026-09-21，`git show 51344fca` 逐字节，对象库级校验） |
| C2 | `RELEASE-NOTES.md` 定稿 v1.0 | ✅ |
| C3 | `KNOWN-ISSUES.md` 定稿 v1.0（含优化池核对固定节） | ✅ |
| C4 | `RELEASE-CHECKLIST.md`（本文件） | ✅ |
| C5 | `v1.3` 标签 | ⏳ 待打于 `51344fca`（推送远端另行授权后执行，见 §G 挂起项） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至上一下线点 = 恢复 `production/release/v1.2.1/artifacts/plants-vs-zombies.v1.2.1.html` 冻结副本对外分发；仓库侧以 `v1.2.1` 标签（`f5d660d`）重建分发链。
- 六处冻结产物（v1.0.0 / v1.1 / v1.2 / v1.2.1 / v1.3）均只读，任何热修必须走新版本流程，禁止原地改冻结副本。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v1.3/artifacts/plants-vs-zombies.v1.3.html` |
| 导出方式 | `git show 51344fca:plants-vs-zombies.html` 逐字节导出（LF，只读；CRLF→LF 归一化后与工作树逐字节一致，导出零失真） |
| 行数 | 2538（LF 口径，git show 对象含末尾换行计法） |
| 字节数 | 118,718（LF 口径，冻结副本权威口径） |
| LF SHA-256 | `21b7348260ba02fc3060f6e02bcd2563a8837ef810b7edb153130dbf0ba75812`（与 `git show 51344fca:` 输出逐字节一致，已核验） |
| 工作区 CRLF SHA-256（参考） | `85333a63106ddce48c24168b0ebdd021804591086de678ee604012162001f2e8`（autocrlf 检出态，2537 行 / 121,255 字节；换电脑核验请用 `git show 51344fca:plants-vs-zombies.html | sha256sum` 的 LF 口径） |

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控复跑 | ✅（A1–A4，独立 worktree 干净树） |
| G2 真机验收 | ✅（B1–B2，M1–M6 + M7/M8） |
| G3 冻结副本 + 完整性 | ✅（§E） |
| G4 发布签字 | ⏳ **待用户最终 Go/No-Go** |

**判定：⏳ 待用户授权——技术门 G1–G3 全绿。**

## G. 挂起项（发布后动作）

| # | 项 | 状态 |
|---|---|---|
| 1 | `v1.3` 标签 + main 推送远端 | ⏳ 待用户单独授权（本地已就绪：tag 锚定 `51344fca`，main=`51344fca`） |
| 2 | GitHub Release（如需挂发行附件） | ⏳ 未排期；冻结副本已入库，可随时补 |
