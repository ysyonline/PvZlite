# PvZ Lite v2.2.0 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-25：技术门 G1–G3 全绿 + 冻结副本三重校验 + 机制自证双结论 + 平衡画像三档全过 → 发布定稿；G5 待用户授权）。
> **版本**：v2.2.0 ｜ **发布日期**：2026-09-25 ｜ **产物**：`plants-vs-zombies.html`（单文件，4170 行 / 226,174 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-25 23:0x（+0800）。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 原开发机 weixufeng。
> ⚠️ 本轮 `run-gates.js` 一键入口受**会话级 spawnSync EBUSY** 阻塞（对任意 .exe 恒 EBUSY，复跑无效，异步 spawn 正常）——按其内部清单**逐门直跑等效验证**，结果如下。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 91/91 PASS | **91/91 PASS**（SMOKE 29 + REG 62；0.9s） | ✅ |
| A2 | 音频总线核验 | `node tests/harness/verify-bus.js` | 56/56 PASS | **56/56 PASS** | ✅ |
| A3 | 无头性能基准 | `node tests/perf/bench.js` | 五场景 PASS | **PASS**（判级无头口径）；DC 结构量五场景对齐；已幂等回填 perf-profile 后 **checkout 还原**（纯机器噪声） | ✅ |
| A4 | 版本定版核对 | 源码 `VERSION` 常量（L62） | `v2.2.0` | **`const VERSION='v2.2.0'`** | ✅ |
| A5 | 版本标签通扫核对 | grep 活文件 | 无 `v2.1.1` 活默认值残留 | 7 处同步：prelude.js L24/L52 · v17-acc L119 · v18-acc L26/L53 · r9a-metric-spec.md L95/L97；历史文档/冻结副本保持原貌；复扫零残留 | ✅ |
| A6 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行号与定版源码一致 | **已重跑**（4170 行 / 20 分区 / 101 函数 / 73 常量，结构零漂移） | ✅ |
| A7 | 机制自证（三用例） | REG-SQUASH-01 / PEPPER-01 / CHERRY-01 | 新源全绿 + 旧源必红 | **新源 PASS + v2.1.1 旧源判别必红** | ✅ |
| A8 | 真机视觉 | `tests/playtests/v22-newplant-visual.js` | 7/7 | **7/7 PASS · overall=PASS**（QA 门 `e7c8279` 复验） | ✅ |
| A9 | 平衡画像（三档） | normal 480 局 + hard/expert 720 局 | 新卡不过强 | **PASS**（失守率最大降 4.2pp < 10pp 触发线） | ✅ |

## B. 真机人工验收

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | 三新卡机制语义（点击链路） | ✅ | REG 三用例走真实 harness 链路：窝瓜跳击单体秒杀 / 航椒同排全清 / 樱桃 3×3 跨行秒杀 |
| B2 | 判别力自证（旧源必红） | ✅ | v2.1.1 旧源同用例必红（无卡片 → 无分支 → 永不引爆） |
| B3 | 卡面专属美术 | ✅ | VIS-CARD-01：art 区（80×36）三卡互异 hash = 3/3 |
| B4 | 用户 Go/No-Go | ⏳ | 待用户授权（发布拍板） |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v2.2.0.html` | ✅ 已导出（`git show HEAD` 重定向字节直通，三重校验见 §E） |
| C2 | RELEASE-NOTES.md | ✅ 已定稿 |
| C3 | KNOWN-ISSUES.md | ✅ 已定稿 |
| C4 | RELEASE-CHECKLIST.md | ✅ 本文件 |
| C5 | `v2.2.0` 标签 | ⏳ 执行中：轻量标签 @ 发布包提交，`git push origin v2.2.0` **显式推送**（待用户授权） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至 `production/release/v2.1.1/artifacts/plants-vs-zombies.v2.1.1.html` 冻结副本对外分发；仓库侧以 `v2.1.1` 标签重建分发链。
- 本版回滚粒度友好：源码增量 = 三新卡 + 发卡重排 + 三处缺陷修复 + 定版，**无关卡波次 / 存档 / 解锁拓扑变更**，revert 提交即可回退。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v2.2.0/artifacts/plants-vs-zombies.v2.2.0.html` |
| 导出方式 | `git show HEAD:plants-vs-zombies.html` —— 重定向字节直通（LF，只读；三重校验：sha256sum / `cmp` 工作区逐字节一致 / Node CR 计数 = 0） |
| 行数 | 4170（LF 口径） |
| 字节数 | **226,174**（LF 口径，冻结副本权威口径；v2.1.1 = 214,001，+12,173B 来自三新卡机制/卡面/爆炸特效 + 发卡重排 + 注释） |
| LF SHA-256 | `0d676c47400e326f38cab03f895e10e857896c28d972b60831f1a6707215d22b` |
| 冻结副本内版本标识 | L62 `const VERSION='v2.2.0';   // v2.2.0：三新植物——窝瓜(squash)/航椒(pepper)/樱桃(cherry)，均即种即生效(armT=0)，发卡序列重排` |
| 历史冻结指纹（只读基线） | v2.0.1 `371d07d0…5eeef`（191,131 B / 3618 行）· v2.1.0 `38a335df…1a3b`（213,599 B / 3944 行）· v2.1.1 `c982b19f…1d108`（214,001 B / 3945 行） |

> 校验命令（LF 权威口径，**勿直接 `sha256sum` 工作区文件**——换机 CRLF 环境会虚警）：
> ```
> git show HEAD:plants-vs-zombies.html | sha256sum
> # 期望：0d676c47400e326f38cab03f895e10e857896c28d972b60831f1a6707215d22b
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控复跑 | ✅（A1–A3；EBUSY 等效直跑） |
| G2 机制自证 + 回归 | ✅（A7 + B1/B2） |
| G3 真机视觉 + 平衡画像 | ✅（A8 + A9） |
| G4 冻结副本 + 完整性 | ✅（§E 三重校验） |
| G5 发布签字 | ⏳ 待用户授权（推送/打标执行中） |

**判定：✅ 全门 PASS——发布执行（待用户 G5 授权）。**

## G. 挂起项（发布后动作 · 均须用户授权）

| # | 项 | 状态 |
|---|---|---|
| 1 | R5 弹道手感人工复核 | ⏳ 建议（非阻塞，继承 v1.6） |
| 2 | 世界 3/4 真实关卡补全（Q-12 占位） | ⏳ v2.3 计划 |
| 3 | 墓碑机制实装 | ⏳ v2.3 计划（grave 字段预留） |
| 4 | 金币留存钩子（SLOT_PRICE 缺口） | ⏳ v2.3 计划 |
| 5 | spawnSync EBUSY 会话级异常观察 | ⏳ 已记 KNOWN-ISSUES 工具链节 |
| 6 | R2 整局 playthrough | ⏳ 已披露（继承） |