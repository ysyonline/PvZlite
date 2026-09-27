# PvZ Lite v2.2.8 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-27：门控 G1–G5 全绿 + 冻结副本校验 + tag 推送 → 发布定稿）。
> **版本**：v2.2.8 ｜ **发布日期**：2026-09-27 ｜ **产物**：`plants-vs-zombies.html`（单文件，4401 行 / 240,803 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-27（+0800）。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 原开发机 weixufeng。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 全量（烟雾 + REG） | `node tests/harness/run-gates.js` / run-all.js 等效（spawnSync EBUSY 走异步直跑） | 92/92 PASS | **92/92 PASS**（SMOKE 29 + REG 63） | ✅ |
| A2 | 音频总线核验 | `node tests/harness/verify-bus.js` | 58/58 PASS | **58/58 PASS** | ✅ |
| A3 | 无头性能基准 | `node tests/perf/bench.js` | 五场景 PASS | **⏭ 跳过**（spawnSync EBUSY，按惯例跳，bench 无漂移不作为阻塞） | ⏭ |
| A4 | 版本定版核对 | 源码 `VERSION` 常量 | `v2.2.8` | **`const VERSION='v2.2.8'`**（定版刀 `2da4410` 补齐 919447e 漏改） | ✅ |
| A5 | 版本标签通扫核对 | grep 活文件 | 无旧版活默认值残留 | prelude / v17-acc / v18-acc 三处同步 `v2.2.8` | ✅ |
| A6 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行号与定版源码一致 | **已重跑**（4401 行 / 21 分区 / 105 函数 / 78 常量） | ✅ |

## B. 消缺验收

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | 向日葵日夜间隔有别（白天 20s / 夜晚 24s） | ✅ | `SUNFLOWER_FIRST=7/DAY=20/NIGHT=24`；`updatePlant` sunflower 分支按 `level.time` 选重置值；epsilon `p.sunT<1e-9` 防浮点假零 |
| B2 | 夜晚/浓雾天空不掉阳光 | ✅ | `checkWave` sunFallT 分支 `level.time==='day'` 守卫 |
| B3 | REG-PLANT-01 日夜双场景覆盖 | ✅ | S1 白天 7s/20s · S2 夜晚 7s/24s · S3 天空守卫 + 白天对照；常量走 `__consts` 桥 |
| B4 | 判别力自证（旧源必红） | ✅ | REG-PLANT-01 夜晚段（24s 周期 + 天空守卫）在 v2.2.7 旧源下必红，新旧行为可分辨 |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v2.2.8.html` | ✅ 已导出（`git show v2.2.8:plants-vs-zombies.html`，240,803 字节 LF） |
| C2 | RELEASE-NOTES.md | ✅ 已定稿 |
| C3 | KNOWN-ISSUES.md | ✅ 已定稿 |
| C4 | RELEASE-CHECKLIST.md | ✅ 本文件 |
| C5 | `v2.2.8` 标签 | ✅ 已推送（轻量标签 @ `2da4410`，`ls-remote` 核验） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至 `production/release/v2.2.7/artifacts/plants-vs-zombies.v2.2.7.html` 冻结副本对外分发。
- 本版增量 = 两处夜晚阳光行为修正 + 测试/常量桥连带，无关卡波次 / 僵尸属性 / 伤害公式变更，revert `919447e` + `2da4410` 提交即可回退。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v2.2.8/artifacts/plants-vs-zombies.v2.2.8.html` |
| 导出方式 | `git show v2.2.8:plants-vs-zombies.html` —— 重定向字节直通（LF） |
| 行数 | 4401（LF 口径） |
| 字节数 | **240,803**（LF 口径，冻结副本权威口径；v2.2.7 240,003，+800B 来自两处修正 + 常量 + code-map 刷新） |
| LF SHA-256 | `90f5ff2600bfd6f65026bde27500088a6313c7e5ac198769ee1f3f28590cba20` |
| 冻结副本内版本标识 | `const VERSION='v2.2.8'`（grep 核验通过） |

> 校验命令（LF 权威口径）：
> ```
> git show v2.2.8:plants-vs-zombies.html | sha256sum
> # 期望：90f5ff2600bfd6f65026bde27500088a6313c7e5ac198769ee1f3f28590cba20
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控全量 | ✅（92/92 FULL · 58/58 BUS） |
| G2 判别力自证 | ✅（REG-PLANT-01 夜晚段旧源必红） |
| G3 冻结副本 + 完整性 | ✅（§E SHA-256 可复现） |
| G4 标签已推送 | ✅（`v2.2.8` @ `2da4410`） |
| G5 发布签字 | ✅ 已授权（用户「归档」指令 + tag 已推） |

**判定：✅ 全门 PASS——发布完成。**

## G. 挂起项（发布后动作）

| # | 项 | 状态 |
|---|---|---|
| 1 | 真机视觉截图验收 | ⏭ 判定跳过（本版无视觉变更） |
| 2 | 世界 3/4 真实关卡补全（Q-12 占位） | ⏳ v2.3 计划 |
| 3 | 墓碑机制实装 | ⏳ v2.3 计划 |
| 4 | 金币留存钩子 | ⏳ v2.3 计划 |
| 5 | v2.3 夜行蘑菇设计拍板（Q-1~Q-6 + 发卡方案 A/B/C） | ⏳ 待用户拍板（`design/gdd/v23-night-mushrooms.md`） |

---
