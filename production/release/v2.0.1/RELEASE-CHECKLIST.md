# PvZ Lite v2.0.1 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-24：技术门 G1–G3 全绿 + 冻结副本导出三重校验 + 自证双结论 → 发布定稿；G4 已获用户授权）。
> **版本**：v2.0.1 ｜ **发布日期**：2026-09-24 ｜ **产物**：`plants-vs-zombies.html`（单文件，3618 行 / 191,131 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-24 20:3x–20:4x（+0800），源码权威提交 `e62209e`。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 家庭机 Administrator / i5-7500T。
> ⚠️ 本轮 `run-gates.js` 一键入口受**会话级 spawnSync EBUSY** 阻塞（主理人与工程会话均复现；对任意 .exe 恒 EBUSY，复跑无效，异步 spawn 正常）——按其内部清单**逐门直跑等效验证**，结果如下。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 87/87 PASS | **87/87 PASS**（1.2s） | ✅ |
| A2 | 音频总线核验 | `node tests/harness/verify-bus.js` | 56/56 PASS | **56/56 PASS**（启动横幅已显示 v2.0.1） | ✅ |
| A3 | 无头性能基准 | `node tests/perf/bench.js` | 五场景 PASS | **PASS**（帧异常 0）；DC 结构量五场景与 v2.0.0 基线**逐场景一致零漂移**（290/876/1590/1890/2665 中位）；i5-7500T 绝对耗时高于上版 i5-12500 记录 = 环境差异（判级 p95 全场景 ≤ 预算）；已幂等回填 perf-profile §7 | ✅ |
| A4 | 版本定版核对 | 源码 `VERSION` 常量（L61） | `v2.0.1` | **`const VERSION='v2.0.1'`** | ✅ |
| A5 | 版本标签通扫核对 | grep 活文件 | 无 `v2.0.0` 活默认值残留 | 5 处同步：prelude.js L24/L52 · v17-acc L119 · v18-acc L26/L53 · r9a-metric-spec.md L95/L97；SMOKE-021 版本形断言与版本无关（无需改）；历史文档/冻结副本保持原貌；复扫零残留 | ✅ |
| A6 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行号与定版源码一致 | **已重跑**（3618 行 / 20 分区 / 99 函数 / 73 常量，结构零漂移，仅常量区 VERSION 指纹变化属预期） | ✅ |
| A7 | 新自证 | `node tests/playtests/v20-test-unlock.js` | 新源全绿 + 旧源必红 | **A 段 14/14 + B 段旧源 3 红（≥2）**；主理人独立复跑一致 | ✅ |
| A8 | 存量回归（受影响面） | v20-menu-nav / v20-select-draw | 不受 testMode 旁路影响 | **menu-nav 20/20 · select-draw PASS**（零迁移拍板成立） | ✅ |

## B. 真机人工验收

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | 修复语义自证（点击链路） | ✅ | v20-test-unlock 走真实 click listener 链路：test=1 点锁定 1-4 → deck（★）/ 占位 1-7 → toast 拦截仍 select（★）/ 开始 → play + sun=9999 |
| B2 | 判别力自证（旧源必红） | ✅ | v2.0.0 旧源同链路 3 红（点 1-4 不进 deck 等）；占位拦截用例绿 = 占位判定与版本无关（预期绿） |
| B3 | 用户 Go/No-Go | ✅ | 2026-09-24 20:4x 三项拍板（提交推送 / 发布包+tag / EBUSY 记档） |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v2.0.1.html` | ✅ 已导出（`git show e62209e` 重定向字节直通，三重校验见 §E） |
| C2 | RELEASE-NOTES.md | ✅ 已定稿 |
| C3 | KNOWN-ISSUES.md | ✅ 已定稿（含 EBUSY 工具链节） |
| C4 | RELEASE-CHECKLIST.md | ✅ 本文件 |
| C5 | `v2.0.1` 标签 | ⏳ 执行中：轻量标签 @ 发布包提交，`git push origin v2.0.1` **显式推送** |

## D. 回滚方案

- 发布后发现阻断级问题：回退至 `production/release/v2.0/artifacts/plants-vs-zombies.v2.0.html` 冻结副本对外分发；仓库侧以 `v2.0.0` 标签重建分发链。
- 本版回滚粒度极友好：源码增量仅 4 行行内改（3 处测试旁路 + 版本号），无数据/存档/结构变更，直接 revert 即可。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v2.0.1/artifacts/plants-vs-zombies.v2.0.1.html` |
| 导出方式 | `git show e62209e:plants-vs-zombies.html` —— 重定向字节直通（LF，只读；三重校验：sha256sum / `cmp` 工作区逐字节一致 / Node CR 计数 = 0） |
| 行数 | 3618（LF 口径） |
| 字节数 | **191,131**（LF 口径，冻结副本权威口径；v2.0.0 = 190,847，+284B 来自 4 处行内注释扩充） |
| LF SHA-256 | `371d07d026afd79bc075039209f84586ad7fea7a386f77fe0a010e57a9f5eeef` |
| 冻结副本内版本标识 | L61 `const VERSION='v2.0.1';   // v2.0.1 修复：?test=1 解锁定闸（占位关仍不可玩、toast 保留；存档零写语义不变）；v2.0.0 定版见 production/v2.0-plan.md` |
| 历史冻结指纹（只读基线） | v1.8 `889c0cb0…804f` · v1.9 `213929e6…d868` · v2.0.0 `e8cb90b3…edbb0`（190,847 B / 3618 行） |

> 校验命令（LF 权威口径，**勿直接 `sha256sum` 工作区文件**——本版工作区 CR=0 直算一致，但换机 CRLF 环境会虚警）：
> ```
> git show e62209e:plants-vs-zombies.html | sha256sum
> # 期望：371d07d026afd79bc075039209f84586ad7fea7a386f77fe0a010e57a9f5eeef
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控复跑 | ✅（A1–A3；EBUSY 等效直跑） |
| G2 自证 + 回归 | ✅（A7/A8 + B1/B2） |
| G3 冻结副本 + 完整性 | ✅（§E 三重校验） |
| G4 发布签字 | ✅ 用户已授权（推送/打标执行中） |

**判定：✅ 全门 PASS——发布执行。**

## G. 挂起项（发布后动作 · 均须用户授权）

| # | 项 | 状态 |
|---|---|---|
| 1 | R5 弹道手感人工复核 | ⏳ 建议（非阻塞，继承 v1.6） |
| 2 | 世界 2/3/4 真实关卡补全（Q-12 占位） | ⏳ v2.x 计划：锚点波次已预排，填回 waves 即可 |
| 3 | spawnSync EBUSY 会话级异常观察 | ⏳ 已记 KNOWN-ISSUES 工具链节；若下次会话复现再升级排查 |
