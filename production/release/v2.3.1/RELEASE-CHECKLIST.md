# PvZ Lite v2.3.1 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-30：门控 G1–G5 全绿 + 冻结副本校验 + tag 本地已打）。
> **版本**：v2.3.1 ｜ **发布日期**：2026-09-28 ｜ **产物**：`plants-vs-zombies.html`（单文件，4981 行 / 284,630 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-28（+0800）。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 原开发机 weixufeng。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 97/97 PASS | **97/97 PASS**（SMOKE 29 + REG 68） | ✅ |
| A2 | 音频总线核验 | `node tests/harness/verify-bus.js` | 58/58 PASS | **58/58 PASS** | ✅ |
| A3 | 无头性能基准 | `node tests/perf/bench.js` | 五场景 PASS | **PASS** | ✅ |
| A4 | 版本定版核对 | 源码 `VERSION` 常量 | `v2.3.1` | **`const VERSION='v2.3.1'`** | ✅ |
| A5 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行数与定版源码一致 | **4981 行** | ✅ |

## B. 功能验收（v2.3.1 墓碑机制）

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | 蘑菇发卡落点（3-1 小喷/3-2 阳光/3-3 大喷/3-4 魅惑） | ✅ | `CARD_AWARD` 四键替换；占位 19→15 |
| B2 | 世界 2/3 互换（墓地↔泳池） | ✅ | 纯机械互换，grep 无遗留 '2-1'~'2-10' 键引用 |
| B3 | 墓碑占格挡种植 | ✅ | `onGrave` 规则首条；REG-GRAVE-01 |
| B4 | 波次钻怪（30% 概率加权池） | ✅ | `GRAVE_SPAWN_PCT`/`GRAVE_SPAWN_POOL`；REG-GRAVE-01 |
| B5 | 碑位出怪 | ✅ | `processSpawnQueue` `_graveCol` 识别；REG-GRAVE-01 |
| B6 | 判别力自证（旧源必红） | ✅ | REG-GRAVE-01 删 `onGrave`+钻怪块复跑必红 |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v2.3.1.html` | ✅ 已导出（`git show v2.3.1:plants-vs-zombies.html`，284,630 字节 LF） |
| C2 | RELEASE-NOTES.md | ✅ 已定稿 |
| C3 | KNOWN-ISSUES.md | ✅ 已定稿 |
| C4 | RELEASE-CHECKLIST.md | ✅ 本文件 |
| C5 | `v2.3.1` 标签 | ✅ 本地已打（轻量标签 @ `b16ddf7`，**未推送**） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至 `production/release/v2.3.0/artifacts/plants-vs-zombies.v2.3.0.html` 冻结副本对外分发。
- 本版增量 = 蘑菇发卡落点 + 世界互换 + 墓碑机制；revert `a2d5edf`→`b16ddf7` 施工链即可回退。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v2.3.1/artifacts/plants-vs-zombies.v2.3.1.html` |
| 导出方式 | `git show v2.3.1:plants-vs-zombies.html` —— 重定向字节直通（LF） |
| 行数 | 4981（LF 口径） |
| 字节数 | **284,630**（LF 口径，冻结副本权威口径；v2.3.0 282,459，+2,171B） |
| LF SHA-256 | `179c94b812da70c4bdb70549b460ef1b23a300ed1accbcb712f711ad73a36c3c` |
| 冻结副本内版本标识 | `const VERSION='v2.3.1'`（grep 核验通过，恰 1 处） |

> 校验命令（LF 权威口径）：
> ```
> git show v2.3.1:plants-vs-zombies.html | sha256sum
> # 期望：179c94b812da70c4bdb70549b460ef1b23a300ed1accbcb712f711ad73a36c3c
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控全量 | ✅（97/97 FULL · 58/58 BUS · BENCH PASS） |
| G2 判别力自证 | ✅（REG-GRAVE-01 旧源必红） |
| G3 冻结副本 + 完整性 | ✅（§E SHA-256 可复现） |
| G4 标签 | ✅（`v2.3.1` @ `b16ddf7`，本地已打，未推送） |
| G5 发布签字 | ✅ 已授权（用户「tag v2.3.1~v2.3.7 + release 四件套」指令） |

**判定：✅ 全门 PASS——发布完成（tag 未推送）。**

## G. 挂起项（发布后动作）

| # | 项 | 状态 |
|---|---|---|
| 1 | 世界 2 后 6 关（2-5~2-10）开放 | ⏳ v2.3.2 计划 |
| 2 | 咬碑藤（清碑手段）实装 | ⏳ v2.3.2 计划 |
| 3 | 世界 4（房屋）真实关卡补全（Q-12 占位） | ⏳ v2.3.3 计划 |
| 4 | 墓碑机制清碑手段（咬碑藤） | ⏳ v2.3.2 计划 |

---