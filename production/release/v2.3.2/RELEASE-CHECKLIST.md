# PvZ Lite v2.3.2 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-30：门控 G1–G5 全绿 + 冻结副本校验 + tag 本地已打）。
> **版本**：v2.3.2 ｜ **发布日期**：2026-09-28 ｜ **产物**：`plants-vs-zombies.html`（单文件，5397 行 / 319,393 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-28（+0800）。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 原开发机 weixufeng。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 98/98 PASS | **98/98 PASS**（SMOKE 29 + REG 69） | ✅ |
| A2 | 音频总线核验 | `node tests/harness/verify-bus.js` | 58/58 PASS | **58/58 PASS** | ✅ |
| A3 | 无头性能基准 | `node tests/perf/bench.js` | — | 本版非里程碑，未跑（--quick 策略） | ⏭️ |
| A4 | 版本定版核对 | 源码 `VERSION` 常量 | `v2.3.2` | **`const VERSION='v2.3.2'`** | ✅ |
| A5 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行数与定版源码一致 | **5397 行** | ✅ |

## B. 功能验收（v2.3.2 清碑手段）

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | 咬碑藤（cost 75 / cd 7.5 / 咀嚼 4.0s / +25 不返阳光 / 受击冻结） | ✅ | 数值与 GDD 一致；REG 覆盖 |
| B2 | 猫王 elvis + 伴舞 backup（900/14 · 300 分 · 三难度间隔） | ✅ | `ELVIS_WAVES` 编排；REG-ELVIS-01 |
| B3 | W2 补真 10 波骨架（三幕 big 对齐） | ✅ | REG-ELVIS-01 10 波契约 |
| B4 | 世界 2 后 6 关金币关开放（2-6~2-10 各 100） | ✅ | 真机 5/5 + 门控 2-6/2-10 首通幂等 |
| B5 | 世界 1 后五关改昼（1-6~1-10） | ✅ | 真机 1-6 昼板 + 天空掉阳光 |
| B6 | 判别力自证（旧源必红） | ✅ | REG-ELVIS-01 恰红；真机旧源 3 红 |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v2.3.2.html` | ✅ 已导出（`git show v2.3.2:plants-vs-zombies.html`，319,393 字节 LF） |
| C2 | RELEASE-NOTES.md | ✅ 已定稿 |
| C3 | KNOWN-ISSUES.md | ✅ 已定稿 |
| C4 | RELEASE-CHECKLIST.md | ✅ 本文件 |
| C5 | `v2.3.2` 标签 | ✅ 本地已打（轻量标签 @ `f2f40e9`，**未推送**） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至 `production/release/v2.3.1/artifacts/plants-vs-zombies.v2.3.1.html` 冻结副本对外分发。
- 本版增量 = 咬碑藤 + 猫王 + W2 十波 + W2 后 6 关 + W1 改昼；revert `3d6ac05`→`f2f40e9` 施工链即可回退。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v2.3.2/artifacts/plants-vs-zombies.v2.3.2.html` |
| 导出方式 | `git show v2.3.2:plants-vs-zombies.html` —— 重定向字节直通（LF） |
| 行数 | 5397（LF 口径） |
| 字节数 | **319,393**（LF 口径，冻结副本权威口径；v2.3.1 284,630，+34,763B） |
| LF SHA-256 | `341aeaecdd5341fd5b318e057323383d999c61e777b7ec8ff8af6a3731903c3b` |
| 冻结副本内版本标识 | `const VERSION='v2.3.2'`（grep 核验通过，恰 1 处） |

> 校验命令（LF 权威口径）：
> ```
> git show v2.3.2:plants-vs-zombies.html | sha256sum
> # 期望：341aeaecdd5341fd5b318e057323383d999c61e777b7ec8ff8af6a3731903c3b
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控全量 | ✅（98/98 FULL · 58/58 BUS） |
| G2 判别力自证 | ✅（REG-ELVIS-01 恰红 + 真机旧源 3 红） |
| G3 冻结副本 + 完整性 | ✅（§E SHA-256 可复现） |
| G4 标签 | ✅（`v2.3.2` @ `f2f40e9`，本地已打，未推送） |
| G5 发布签字 | ✅ 已授权（用户「tag v2.3.1~v2.3.7 + release 四件套」指令） |

**判定：✅ 全门 PASS——发布完成（tag 未推送）。**

## G. 挂起项（发布后动作）

| # | 项 | 状态 |
|---|---|---|
| 1 | 世界 4（房屋）真实关卡补全（Q-12 占位） | ⏳ v2.3.3 计划 |
| 2 | 世界 2 全 10 关改黑夜（用户需求） | ⏳ v2.3.4 计划 |
| 3 | 墓碑重生 / 金币留存钩子 | ⏳ v2.3.7 计划 |

---