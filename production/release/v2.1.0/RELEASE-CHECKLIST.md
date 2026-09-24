# PvZ Lite v2.1.0 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（技术门 G1–G3 全绿 + 冻结副本导出三重校验 + 自证双结论 → 发布定稿；G4 已获用户授权「四件套 + 本地 tag」）。
> **版本**：v2.1.0 ｜ **发布日期**：2026-09-24 ｜ **产物**：`plants-vs-zombies.html`（单文件，3944 行 / 213,599 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-24（+0800），源码权威提交 `b4dab8f`。解释器 Node v22.22.2（managed，绝对路径调用）。
> ⚠️ 本轮 `run-gates.js` 一键入口受**会话级 spawnSync EBUSY** 阻塞（子进程未启动，非用例失败；对任意 .exe 恒 EBUSY，复跑无效，异步 spawn 正常）——按其内部清单**逐门直跑等效验证**，结果如下。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 87/87 PASS | **87/87 PASS**（1.5s） | ✅ |
| A2 | 音频总线核验 | `node tests/harness/verify-bus.js` | 56/56 PASS | **56/56 PASS** | ✅ |
| A3 | 无头性能基准 | `node tests/perf/bench.js` | 五场景 PASS | **PASS**（帧异常 0）；bench 令 `perf-profile.md` §7 自动段刷新（gate 设计内幂等回填，未入本发布提交） | ✅ |
| A4 | 版本定版核对 | 源码 `VERSION` 常量（L62） | `v2.1.0` | **`const VERSION='v2.1.0'`**；启动横幅实测 `[PvZ] PvZ Lite v2.1.0 已启动`，`__VERSION=v2.1.0` | ✅ |
| A5 | 版本标签通扫核对 | grep 活文件 `2\.0\.1` | 无 `v2.0.1` 活默认值残留 | **6 处同步**：prelude.js L24/L52 · v17-acc L119 · v18-acc L26/L53 · r9a-metric-spec.md L95/L97；**历史叙述与 git tag 引用保留**（release/v2.0.1 包、代码沿革注释、`gitShow('v2.0.1')` tag 参照、历史 results/report）；复扫零残留 | ✅ |
| A6 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行号与定版源码一致 | **已重跑**（3944 行 / 20 分区 / 99 函数 / 73 常量） | ✅ |
| A7 | 新自证（奖励预览行） | `node tests/playtests/v21-select-reward.js` | 新源全绿 + 旧源必红 | **新源 PASS**（真卡 78 / 金币 124 / 占位 0 / 锁定 82 金像素）+ **v2.0.1 旧源 FAIL（合法红）** | ✅ |
| A8 | 难度画像 | `node tests/playtests/v21-curve-profile.js` | 四类离群判定全空 | **T-301 PASS**（92 局）；过难/偏难/过易/超载 + 稳定失守 **全 ∅** | ✅ |
| A9 | 存量回归（受影响面） | v20-select-draw / v20-menu-nav / v21-world2-open / v20-harness-compat / v20-level-registry | 全绿 | **select-draw PASS · menu-nav 21/0 · world2-open PASS · harness-compat PASS · level-registry PASS** | ✅ |

## B. 真机人工验收

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | 选关页奖励预览行（三态） | ✅ | 用户目视验收 `tests/playtests/v21-select-reward-new.png`（真卡+金币格）与 `-new-ph.png`（占位格）通过 |
| B2 | 难度曲线报告 | ✅ | 团队复核 `production/v21-curve-profile-report.md`（1-3~1-5 塌陷修补 + 2-4 放软结论属实） |
| B3 | 用户 Go/No-Go | ✅ | 用户授权「四件套 + 本地 tag；推送前再确认」 |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.html` | ✅ 已导出（`git show b4dab8f` 重定向字节直通，三重校验见 §E） |
| C2 | RELEASE-NOTES.md | ✅ 已定稿 |
| C3 | KNOWN-ISSUES.md | ✅ 已定稿（含 EBUSY / CDP tmp / 锚点缺键三节） |
| C4 | RELEASE-CHECKLIST.md | ✅ 本文件 |
| C5 | `v2.1.0` 标签 | ✅ 本地轻量标签 @ 发布包提交（**未推送**，推送待用户单独授权） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至 `production/release/v2.0.1/artifacts/plants-vs-zombies.v2.0.1.html` 冻结副本对外分发；仓库侧以 `v2.0.1` 标签重建分发链。
- 回滚性：v2.1.0 变更集中在**数据层**（`_ANCHORS` 波次 + `CARD_AWARD` 值域 + 选关页一行绘制）+ VERSION——机制代码零改动，存档结构/解锁拓扑零改动 → **revert 数据即回退，存档兼容**。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v2.1.0/artifacts/plants-vs-zombies.html` |
| 导出方式 | `git show b4dab8f:plants-vs-zombies.html` —— 重定向字节直通（LF，只读；三重校验：sha256 / `cmp` git 对象逐字节一致 / CR 计数 = 0） |
| 行数 | 3944（LF 口径） |
| 字节数 | **213,599**（LF 口径；v2.0.1 = 191,131，+22,468B 来自 14 关手写 waves + 1-3~1-5 补写 + 奖励预览行 + 注释） |
| LF SHA-256 | `38a335df8527a75ca7259c56f409f2f12800d604efbc8e67368c4fae27531a3b` |
| 冻结副本内版本标识（副本内行号） | L62 `const VERSION='v2.1.0';   // v2.1.0 内容填充版：世界 1/2 共 20 关开放…` |
| 历史冻结指纹（只读基线） | v1.8 `889c0cb0…804f` · v1.9 `213929e6…d868` · v2.0.0 `e8cb90b3…edbb0` · v2.0.1 `371d07d0…5eeef`（191,131 B / 3618 行） |

> 校验命令（LF 权威口径，**勿直接 `sha256sum` 工作区文件**——换机 CRLF 环境会虚警）：
> ```
> git show b4dab8f:plants-vs-zombies.html | sha256sum
> # 期望：38a335df8527a75ca7259c56f409f2f12800d604efbc8e67368c4fae27531a3b
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控复跑 | ✅（A1–A3；EBUSY 等效直跑） |
| G2 自证 + 回归 | ✅（A7/A8/A9 + B1/B2） |
| G3 冻结副本 + 完整性 | ✅（§E 三重校验） |
| G4 发布签字 | ✅ 用户已授权（四件套 + 本地 tag；推送待授权） |

**判定：✅ 全门 PASS——发布执行（本地）。**

## G. 挂起项（发布后动作 · 均须用户授权）

| # | 项 | 状态 |
|---|---|---|
| 1 | `git push`（提交 + tag `v2.1.0`） | ⏳ 待用户单独授权（本任务**未推送任何东西**） |
| 2 | 世界 3（墓地）/ 世界 4（房屋）真实关卡补全（Q-12 / X-2） | ⏳ v2.x：锚点波次已预排，填回 waves 即可；墓碑机制（X-3）随世界 3 开放实装 |
| 3 | 经济受限专项 playtest（失误型玩家 / 睡莲税资金压力） | ⏳ 建议（非阻塞，画像报告 §6.C） |
| 4 | spawnSync EBUSY 会话级异常观察 | ⏳ 已记 KNOWN-ISSUES；若下次会话复现再升级排查 |
