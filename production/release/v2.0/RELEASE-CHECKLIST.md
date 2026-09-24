# PvZ Lite v2.0.0 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-24：技术门 G1–G3 全绿 + 冻结副本导出校验 + v20 全系列 PASS → 发布定稿；G4 推送/打标待用户授权）。
> **版本**：v2.0.0 ｜ **发布日期**：2026-09-24 ｜ **产物**：`plants-vs-zombies.html`（单文件，3618 行 / 190,847 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-24 15:5x（+0800），定版刀 `90b7b62` + 回填刀 `b22debe` 之后（源码内容与定版刀一致）。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 公司机 user3667 / i5-12500。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 烟雾测试 | `node tests/harness/run-smoke.js` | 29/29 PASS | **29/29 PASS** | ✅ |
| A2 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 87/87 PASS | **87/87 PASS** | ✅ |
| A3 | 音频总线核验 | `node tests/harness/verify-bus.js` | 56/56 PASS | **56/56 PASS**（幂等安全 / 路由完整 / 隔离生效） | ✅ |
| A4 | 无头性能基准 | `node tests/perf/bench.js` | 五场景 PASS | **PASS**（帧异常 0）；draw calls 全口径中位 **290 / 876 / 1590 / 1890 / 2665** —— A–D 与 v1.9 基线逐场景一致，E 场景 +30（T-403 房屋装饰预期披露，非漂移）。已回填 `docs/architecture/perf-profile.md` §7（`b22debe`） | ✅ |
| A5 | 版本定版核对 | 源码 `VERSION` 常量（L61） | `v2.0.0` | **`const VERSION='v2.0.0'`**（`v1.9.0`→`v2.0.0`，定版刀 `90b7b62`） | ✅ |
| A6 | 版本标签通扫核对 | grep 活文件 | 无 `v1.9.0` 活默认值残留 | `plants-vs-zombies.html`（L61）/ `lib/prelude.js`（缺省+注释）/ `v17-acceptance.js` / `v18-acceptance.js`（缺省+注释）/ `lib/r9a-metric-spec.md` 共 5 文件 9 处全部同步；`v16-acceptance.js` 缺省 `'1.6'` 为设计保留历史行为（v1.7 惯例）；历史记录（plan/decisions/报告）**保持原貌**；grep 复核 EXIT=1 零残留 | ✅ |
| A7 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行号与定版源码一致 | **已重跑，零手改 diff**（3618 行 → 20 分区 / 99 函数 / 73 常量，结构未漂移；diff 纯行号位移 +97） | ✅ |
| A8 | 真机验收（v20 全系列） | `tests/playtests/v20-*.js` | 13 脚本全 PASS | **13 脚本全 PASS**：daynight 6/6 · fog 7/7 · decor 8/8 · reward-ui 8/8 · levelkey-switch 24/24 · end-nav 19/19 · end-nav-ui 7/7 · menu-nav 20/20 · save-migration 38/38 · fullchain 24/24 · reward-award 25/25 · harness-compat 21/21 · level-registry 33/33（含旧源判别力自证全过） | ✅ |
| A9 | 版本自证（历史脚本） | `v17/v18-acceptance.js` 版本段 | 版本自证 PASS | **版本自证 PASS**（`VERSION="v2.0.0"` 期望含 v2.0.0）——后续段因 v1.9 字段退役 FAIL 为**预期**（R-3：历史脚本保持原貌，v2.0 验收由 v20-* 承担） | ✅ |

> 注：A4 为本机 i5-12500 口径（v1.6–v1.9 基线同为该机）；bench 为无头乐观下限，draw call 结构量可信。A8 各脚本复跑产生的 results/json/png 脏产物已 checkout 还原（bench 回填 perf-profile 属预期）。

## B. 真机人工验收

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | v2.0 源码级变更真机回归（v20 全系列） | ✅ **PASS** | 13 脚本全 PASS（见 A8），含旧源判别力自证（旧源 v1.9.0 语义红） |
| B2 | 视觉五态截图归档 | ✅ | `production/release/v2.0/m4-evidence/`（01-day / 02-night / 03-fog / 04-graveyard / 05-house） |
| B3 | 判别力自证（旧源必红） | ✅ | 各 v20 脚本旧源对照均语义红（如 reward-ui 7 项 / fog 4 项 / decor 7 项 / daynight 2 项） |
| B4 | 用户 Go/No-Go | ⏳ **待授权** | 推送/打标需用户单独授权 |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v2.0.html` | ✅ 已导出（2026-09-24，`git show b22debe` Node Buffer 直通逐字节，LF 口径，双口径核验一致） |
| C2 | RELEASE-NOTES.md | ✅ 已定稿 |
| C3 | KNOWN-ISSUES.md | ✅ 已定稿（含 N-13/N-14 v2.0 复核结论） |
| C4 | RELEASE-CHECKLIST.md | ✅ 本文件 |
| C5 | `v2.0.0` 标签 | ⏳ **待授权**：轻量标签 `v2.0.0` @ 发布包提交，`git push origin v2.0.0` **显式推送**（`--follow-tags` 推不动轻量标签的坑按惯例规避） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至上一下线点 = 恢复 `production/release/v1.9/artifacts/plants-vs-zombies.v1.9.html` 冻结副本对外分发；仓库侧以 `v1.9.0` 标签（源码权威 `8963ff1`）重建分发链。
- 本版回滚粒度友好：源码级变更集中在数据层（`LEVELS` 键位 / `pvz_progress_v2` 存档）——回退 = 恢复旧键位 + 旧存档键；**旧键保留不删**（迁移幂等，回滚 v1.9 无损读档）；玩法数值层**零回滚风险**（本版未触数值）。
- 冻结产物（v1.0.0–v2.0）均只读，任何热修必须走新版本流程，禁止原地改冻结副本。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v2.0/artifacts/plants-vs-zombies.v2.0.html` |
| 导出方式 | `git show b22debe:plants-vs-zombies.html` —— **Node Buffer 直通**导出（LF，只读；未经文本读写，杜绝 CRLF 转换污染；对象库级校验，导出零失真） |
| 行数 | 3618（LF 口径） |
| 字节数 | **190,847**（LF 口径，冻结副本权威口径） |
| LF SHA-256 | `e8cb90b357e8359fdb029281ae81bf37fd93014926c661904dfae957f83edbb0`（与 `git show b22debe:plants-vs-zombies.html \| sha256sum` 输出**逐字节一致**；导出文件 `Buffer.compare(blob, disk)===0`、`hasCR=false`） |
| 冻结副本内版本标识 | L61 `const VERSION='v2.0.0';   // v2.0 定版（数据层换键+存档v2+主菜单/选关+结算导航+主题/昼夜/浓雾视觉；见 production/v2.0-plan.md）` |
| 历史冻结指纹（只读基线） | v1.5 `4dcf8921…de2e0` · v1.6 `4c386eae…db0989` · v1.7 `5ff52d2b…14f6`（162,685 B / 3289 行）· v1.8 `889c0cb0…804f`（163,493 B / 3291 行）· v1.9 `213929e6…d868`（164,063 B / 3289 行） |

> 校验命令（LF 权威口径，**勿直接 `sha256sum` 工作区文件**，会因 CRLF 虚警）：
> ```
> git show b22debe:plants-vs-zombies.html | sha256sum
> # 期望：e8cb90b357e8359fdb029281ae81bf37fd93014926c661904dfae957f83edbb0
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控复跑 | ✅（A1–A4；bench 回填与 code-map 重跑零漂移，`b22debe`） |
| G2 真机验收 | ✅（A8 全 PASS + B1/B2/B3） |
| G3 冻结副本 + 完整性 | ✅（§E，双口径一致 + 无 CR） |
| G4 发布签字 | ⏳ **待用户授权**（推送/打标） |

**判定：✅ 技术门 PASS——内容定稿；推送/打标待用户授权后执行。**

## G. 挂起项（发布后动作 · 均须用户授权）

| # | 项 | 状态 |
|---|---|---|
| 1 | `v2.0.0` 轻量标签 + main 推送远端 | ⏳ 待授权：tag v2.0.0 @ 发布包提交显式推送；ls-remote 双确认（main / tag）；远端冻结副本 blob 与本地逐字节一致 |
| 2 | R5 弹道手感人工复核 | ⏳ 建议（非阻塞，继承 v1.6） |
| 3 | 整局 playthrough / 非 Chromium 浏览器 | ⏳ 已披露（继承 v1.5–v1.8，均非阻塞） |
| 4 | 世界 2/3/4 真实关卡补全（本期全占位，Q-12） | ⏳ v2.x 计划：锚点波次已预排，填回 waves 即可 |