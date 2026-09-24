# PvZ Lite v2.1.1 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-25：技术门 G1–G3 全绿 + 冻结副本导出三重校验 + 自证双结论 → 发布定稿；G4 已获用户授权）。
> **版本**：v2.1.1 ｜ **发布日期**：2026-09-25 ｜ **产物**：`plants-vs-zombies.html`（单文件，3945 行 / 214,001 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-25 06:0x（+0800），源码权威提交 `5eeab99`。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 原开发机 weixufeng / i3-10110U。
> ⚠️ 本轮 `run-gates.js` 一键入口受**会话级 spawnSync EBUSY** 阻塞（对任意 .exe 恒 EBUSY，复跑无效，异步 spawn 正常）——按其内部清单**逐门直跑等效验证**，结果如下。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 88/88 PASS | **88/88 PASS**（SMOKE 29 + REG 59，新增 REG-MINE-03；0.8s） | ✅ |
| A2 | 音频总线核验 | `node tests/harness/verify-bus.js` | 56/56 PASS | **56/56 PASS** | ✅ |
| A3 | 无头性能基准 | `node tests/perf/bench.js` | 五场景 PASS | **PASS**（判级无头口径）；DC 结构量五场景与 v2.1.0 基线**逐场景一致零漂移**（290/876/1590/1890/2665 中位）；i3-10110U 绝对耗时高于 v2.1.0 的 i5-7500T 记录 = 环境差异（判级 p95 全场景 ≤ 预算）；已幂等回填 perf-profile §7 后 **checkout 还原**（纯机器噪声，DC 零漂移） | ✅ |
| A4 | 版本定版核对 | 源码 `VERSION` 常量（L62） | `v2.1.1` | **`const VERSION='v2.1.1'`** | ✅ |
| A5 | 版本标签通扫核对 | grep 活文件 | 无 `v2.1.0` 活默认值残留 | 5 处同步：prelude.js L24/L52 · v17-acc L119 · v18-acc L26/L53 · r9a-metric-spec.md L95/L97；SMOKE-021 版本形断言与版本无关（无需改）；历史文档/冻结副本保持原貌；复扫零残留 | ✅ |
| A6 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行号与定版源码一致 | **已重跑**（3945 行 / 20 分区 / 99 函数 / 73 常量，结构零漂移） | ✅ |
| A7 | 新自证 | `node tests/harness/run-all.js`（REG-MINE-03） | 新源全绿 + 旧源必红 | **新源 PASS + v2.1.0 旧源判别必红**（铁桶剩 60 血 `hp:60`，证明旧缺陷真实存在） | ✅ |
| A8 | 存量回归（受影响面） | REG-MINE-01 / REG-MINE-02 | 范围判定未动 | **MINE-01（武装期踩过不爆）/ MINE-02（同排范围契约）保持绿** | ✅ |

## B. 真机人工验收

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | 修复语义自证（点击链路） | ✅ | REG-MINE-03 走真实 harness 链路：普通难度铁桶 560 同格被秒杀；hard 下 normal 243 / bucket 756 被秒杀、范围外 dx=80 存活 |
| B2 | 判别力自证（旧源必红） | ✅ | v2.1.0 旧源同用例必红（铁桶剩 60 血），证明旧缺陷真实存在 |
| B3 | 用户 Go/No-Go | ✅ | 2026-09-25 消缺补丁发布拍板 |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v2.1.1.html` | ✅ 已导出（`git show 5eeab99` 重定向字节直通，三重校验见 §E） |
| C2 | RELEASE-NOTES.md | ✅ 已定稿 |
| C3 | KNOWN-ISSUES.md | ✅ 已定稿（含 EBUSY 工具链节） |
| C4 | RELEASE-CHECKLIST.md | ✅ 本文件 |
| C5 | `v2.1.1` 标签 | ⏳ 执行中：轻量标签 @ 发布包提交，`git push origin v2.1.1` **显式推送** |

## D. 回滚方案

- 发布后发现阻断级问题：回退至 `production/release/v2.1.0/artifacts/plants-vs-zombies.v2.1.0.html` 冻结副本对外分发；仓库侧以 `v2.1.0` 标签重建分发链。
- 本版回滚粒度极友好：源码增量仅 explodeMine 伤害结算改秒杀 + 版本号 + 注释（+1 行），无数据/存档/结构变更，直接 revert 即可。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v2.1.1/artifacts/plants-vs-zombies.v2.1.1.html` |
| 导出方式 | `git show 5eeab99:plants-vs-zombies.html` —— 重定向字节直通（LF，只读；三重校验：sha256sum / `cmp` 工作区逐字节一致 / Node CR 计数 = 0） |
| 行数 | 3945（LF 口径） |
| 字节数 | **214,001**（LF 口径，冻结副本权威口径；v2.1.0 = 213,599，+402B 来自注释扩充 + VERSION 行） |
| LF SHA-256 | `c982b19f47dc596af3fead18d5ab3efa51eb4c5678581416d5b8c980efb1d108` |
| 冻结副本内版本标识 | L62 `const VERSION='v2.1.1';   // v2.1.1 消缺补丁：地瓜爆炸无差别秒杀（去掉 DMG=500 耐久结算，铁桶/高难度僵尸一碰即死）；v2.1.0 内容填充版见 production/release/v2.1.0/` |
| 历史冻结指纹（只读基线） | v2.0.1 `371d07d0…5eeef`（191,131 B / 3618 行）· v2.1.0 `38a335df…1a3b`（213,599 B / 3944 行） |

> 校验命令（LF 权威口径，**勿直接 `sha256sum` 工作区文件**——换机 CRLF 环境会虚警）：
> ```
> git show 5eeab99:plants-vs-zombies.html | sha256sum
> # 期望：c982b19f47dc596af3fead18d5ab3efa51eb4c5678581416d5b8c980efb1d108
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
| 2 | 世界 3/4 真实关卡补全（Q-12 占位） | ⏳ v2.x 计划：锚点波次已预排，填回 waves 即可 |
| 3 | spawnSync EBUSY 会话级异常观察 | ⏳ 已记 KNOWN-ISSUES 工具链节；若下次会话复现再升级排查 |