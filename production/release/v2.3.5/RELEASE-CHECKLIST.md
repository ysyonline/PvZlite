# PvZ Lite v2.3.5 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-30：门控 G1–G5 全绿 + 冻结副本校验 + tag 本地已打）。
> **版本**：v2.3.5 ｜ **发布日期**：2026-09-28 ｜ **产物**：`plants-vs-zombies.html`（单文件，5405 行 / 321,528 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-28（+0800）。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 原开发机 weixufeng。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 98/98 PASS | **98/98 PASS**（SMOKE 29 + REG 69） | ✅ |
| A2 | 音频总线核验 | `node tests/harness/verify-bus.js` | 58/58 PASS | **58/58 PASS** | ✅ |
| A3 | 无头性能基准 | `node tests/perf/bench.js` | — | 本版非里程碑，未跑（--quick 策略） | ⏭️ |
| A4 | 版本定版核对 | 源码 `VERSION` 常量 | `v2.3.5` | **`const VERSION='v2.3.5'`** | ✅ |
| A5 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行数与定版源码一致 | **5405 行** | ✅ |

## B. 功能验收（v2.3.5 难度曲线）

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | 墓碑钻怪波次爬坡（W1/W2 0% → W3/W4 15% → W5 起 30%） | ✅ | `GRAVE_SPAWN_RAMP` 查表 |
| B2 | 2-1~2-3 前三排禁碑 | ✅ | LCG 重掷；实测 0 座 |
| B3 | 奖励调换（2-4 咬碑藤 / 2-5 魅惑菇） | ✅ | `CARD_AWARD` 互换 |
| B4 | 判别力自证（旧源必红） | ✅ | v235-w2-curve 旧源 6 红 |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v2.3.5.html` | ✅ 已导出（`git show v2.3.5:plants-vs-zombies.html`，321,528 字节 LF） |
| C2 | RELEASE-NOTES.md | ✅ 已定稿 |
| C3 | KNOWN-ISSUES.md | ✅ 已定稿 |
| C4 | RELEASE-CHECKLIST.md | ✅ 本文件 |
| C5 | `v2.3.5` 标签 | ✅ 本地已打（轻量标签 @ `8184698`，**未推送**） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至 `production/release/v2.3.4/artifacts/plants-vs-zombies.v2.3.4.html` 冻结副本对外分发。
- 本版增量 = 难度曲线三连改；revert `8184698` 即可回退。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v2.3.5/artifacts/plants-vs-zombies.v2.3.5.html` |
| 导出方式 | `git show v2.3.5:plants-vs-zombies.html` —— 重定向字节直通（LF） |
| 行数 | 5405（LF 口径） |
| 字节数 | **321,528**（LF 口径，冻结副本权威口径；v2.3.4 320,245，+1,283B） |
| LF SHA-256 | `399d9f8e7f7b9fb30131ac73428ddba9aecc3728fba2cc99c0f09f0f3b0a255f` |
| 冻结副本内版本标识 | `const VERSION='v2.3.5'`（grep 核验通过，恰 1 处） |

> 校验命令（LF 权威口径）：
> ```
> git show v2.3.5:plants-vs-zombies.html | sha256sum
> # 期望：399d9f8e7f7b9fb30131ac73428ddba9aecc3728fba2cc99c0f09f0f3b0a255f
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控全量 | ✅（98/98 FULL · 58/58 BUS） |
| G2 判别力自证 | ✅（v235-w2-curve 旧源 6 红） |
| G3 冻结副本 + 完整性 | ✅（§E SHA-256 可复现） |
| G4 标签 | ✅（`v2.3.5` @ `8184698`，本地已打，未推送） |
| G5 发布签字 | ✅ 已授权（用户「tag v2.3.1~v2.3.7 + release 四件套」指令） |

**判定：✅ 全门 PASS——发布完成（tag 未推送）。**

## G. 挂起项（发布后动作）

| # | 项 | 状态 |
|---|---|---|
| 1 | 铲子免费卡不返还 + 世界 2 波数对齐 | ⏳ v2.3.6 计划 |
| 2 | 墓碑重生 / 金币留存钩子 | ⏳ v2.3.7 计划 |

---