# PvZ Lite v2.3.4 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-30：门控 G1–G5 全绿 + 冻结副本校验 + tag 本地已打）。
> **版本**：v2.3.4 ｜ **发布日期**：2026-09-28 ｜ **产物**：`plants-vs-zombies.html`（单文件，5400 行 / 320,245 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-28（+0800）。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 原开发机 weixufeng。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 98/98 PASS | **98/98 PASS**（SMOKE 29 + REG 69） | ✅ |
| A2 | 音频总线核验 | `node tests/harness/verify-bus.js` | 58/58 PASS | **58/58 PASS** | ✅ |
| A3 | 无头性能基准 | `node tests/perf/bench.js` | — | 本版非里程碑，未跑（--quick 策略） | ⏭️ |
| A4 | 版本定版核对 | 源码 `VERSION` 常量 | `v2.3.4` | **`const VERSION='v2.3.4'`** | ✅ |
| A5 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行数与定版源码一致 | **5400 行** | ✅ |

## B. 功能验收（v2.3.4 暗夜墓地）

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | 世界 2 全 10 关改黑夜 | ✅ | `deriveTime` 世界 2 返回 night；全链跟随 |
| B2 | 2-1~2-4 四蘑菇发下即清醒 | ✅ | 世界 2 全黑后蘑菇清醒 |
| B3 | 1-10 奖励改阳光菇 | ✅ | `CARD_AWARD['1-10']`=sunshroom |
| B4 | 判别力自证（旧源必红） | ✅ | v234-w2-night 旧源 5 红 |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v2.3.4.html` | ✅ 已导出（`git show v2.3.4:plants-vs-zombies.html`，320,245 字节 LF） |
| C2 | RELEASE-NOTES.md | ✅ 已定稿 |
| C3 | KNOWN-ISSUES.md | ✅ 已定稿 |
| C4 | RELEASE-CHECKLIST.md | ✅ 本文件 |
| C5 | `v2.3.4` 标签 | ✅ 本地已打（轻量标签 @ `2bd466a`，**未推送**） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至 `production/release/v2.3.3/artifacts/plants-vs-zombies.v2.3.3.html` 冻结副本对外分发。
- 本版增量 = 世界 2 全黑夜 + 1-10 奖励改阳光菇；revert `2bd466a` 即可回退。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v2.3.4/artifacts/plants-vs-zombies.v2.3.4.html` |
| 导出方式 | `git show v2.3.4:plants-vs-zombies.html` —— 重定向字节直通（LF） |
| 行数 | 5400（LF 口径） |
| 字节数 | **320,245**（LF 口径，冻结副本权威口径；v2.3.3 319,656，+589B） |
| LF SHA-256 | `bc0dc0c4086887c6828b76b587ef1a6b80120cf07d499d8bc1beae92fb77cd46` |
| 冻结副本内版本标识 | `const VERSION='v2.3.4'`（grep 核验通过，恰 1 处） |

> 校验命令（LF 权威口径）：
> ```
> git show v2.3.4:plants-vs-zombies.html | sha256sum
> # 期望：bc0dc0c4086887c6828b76b587ef1a6b80120cf07d499d8bc1beae92fb77cd46
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控全量 | ✅（98/98 FULL · 58/58 BUS） |
| G2 判别力自证 | ✅（v234-w2-night 旧源 5 红） |
| G3 冻结副本 + 完整性 | ✅（§E SHA-256 可复现） |
| G4 标签 | ✅（`v2.3.4` @ `2bd466a`，本地已打，未推送） |
| G5 发布签字 | ✅ 已授权（用户「tag v2.3.1~v2.3.7 + release 四件套」指令） |

**判定：✅ 全门 PASS——发布完成（tag 未推送）。**

## G. 挂起项（发布后动作）

| # | 项 | 状态 |
|---|---|---|
| 1 | 世界 2 难度曲线（碑怪爬坡/禁碑/奖励调换） | ⏳ v2.3.5 计划 |
| 2 | 墓碑重生 / 金币留存钩子 | ⏳ v2.3.7 计划 |

---