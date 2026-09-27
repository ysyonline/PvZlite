# PvZ Lite v2.3.0 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-28：门控 G1–G6 全绿 + 冻结副本校验 + tag 推送 → 发布定稿）。
> **版本**：v2.3.0 ｜ **发布日期**：2026-09-28 ｜ **产物**：`plants-vs-zombies.html`（单文件，4949 行 / 282,459 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-28 02:25（+0800）。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 原开发机 weixufeng。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all`（spawnSync EBUSY 走异步直跑） | 96/96 PASS | **96/96 PASS**（SMOKE 29 + REG 67，1272ms） | ✅ |
| A2 | 音频总线核验 | `node tests/harness/verify-bus.js` | 58/58 PASS | **58/58 PASS** | ✅ |
| A3 | 无头性能基准 | `node tests/perf/bench.js` | 五场景 PASS | **PASS**（场景 E p50 0.77ms / p95 1.60ms / max 20.83ms，帧异常 0；回填 perf-profile 后已 checkout 还原） | ✅ |
| A4 | 版本定版核对 | 源码 `VERSION` 常量 | `v2.3.0` | **`const VERSION='v2.3.0'`**（定版刀 `ea9925b`） | ✅ |
| A5 | 版本标签通扫核对 | grep 活文件 | 无旧版活默认值残留 | prelude / v17-acc / v18-acc 三处同步 `v2.3.0`；无 `PVZ_EXPECT_VER \|\| 'v2.2'` 残留 | ✅ |
| A6 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行数与定版源码一致 | **发布前幂等复跑无 diff**（4949 行 / 22 分区 / 112 函数 / 96 常量） | ✅ |

## B. 功能验收（v2.3.0 四蘑菇）

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | 夜行机制（白天沉睡/夜晚活跃，fog 归夜间） | ✅ | `isNocturnal()` 复用 `_isNight` 口径，即时判定；REG-MUSH-01 |
| B2 | 阳光菇（25 · 首产 6s/24s · 15→120s 成体 25） | ✅ | 成长不重置计时；REG-MUSH-01 |
| B3 | 小喷菇（0 · 20 伤 1.4s · 3 格 · puff 弹体） | ✅ | REG-MUSH-02 |
| B4 | 大喷菇（75 · 20 伤 1.4s · 4 格 · 穿透） | ✅ | 弹体侧 `pr.hitIds` 去重；REG-MUSH-03 |
| B5 | 魅惑菇 + 魅惑状态机（被啃触发/hypno/spd 反向/互啃 65/s/Q-5 计分/Q-2 免疫记位） | ✅ | REG-MUSH-04；probe 白名单已同步 `hypno` |
| B6 | 选卡网格自适应（19 卡不重叠，draw/hit 同源） | ✅ | `deckGridLayout`/`deckCardRect` 唯一几何源；REG-TESTMODE-01 §4 真断言 |
| B7 | 判别力自证（旧源必红） | ✅ | 真机视觉验收旧源（v2.2.8 冻结副本）**0/6 全红**；U10 前对照 9/10 唯 BADGE-03 红（先红后绿） |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v2.3.0.html` | ✅ 已导出（`git show v2.3.0:plants-vs-zombies.html`，282,459 字节 LF） |
| C2 | RELEASE-NOTES.md | ✅ 已定稿 |
| C3 | KNOWN-ISSUES.md | ✅ 已定稿 |
| C4 | RELEASE-CHECKLIST.md | ✅ 本文件 |
| C5 | `v2.3.0` 标签 | ✅ 已推送（轻量标签 @ `de5b7e3`，显式 `git push origin v2.3.0`，`ls-remote` 核验） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至 `production/release/v2.2.8/artifacts/plants-vs-zombies.v2.2.8.html` 冻结副本对外分发。
- 本版增量 = 四蘑菇 + 夜行机制 + 魅惑状态机 + 卡池/网格连带，无关卡波次 / 僵尸基础属性 / 伤害公式变更；revert `acb3df9`→`de5b7e3` 施工链即可回退（U8 沉睡绘制为纯新增分支，回退无副作用）。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v2.3.0/artifacts/plants-vs-zombies.v2.3.0.html` |
| 导出方式 | `git show v2.3.0:plants-vs-zombies.html` —— 重定向字节直通（LF） |
| 行数 | 4949（LF 口径） |
| 字节数 | **282,459**（LF 口径，冻结副本权威口径；v2.2.8 240,803，+41,656B 来自四蘑菇 + 夜行机制 + 沉睡绘制 116 行 + 角标 + 网格重构 + README） |
| LF SHA-256 | `d2f16d488ea3659fb4aaa08a34b733f1fbb91a719c534c4fd956628a8526d1d6` |
| 冻结副本内版本标识 | `const VERSION='v2.3.0'`（grep 核验通过，恰 1 处） |

> 校验命令（LF 权威口径）：
> ```
> git show v2.3.0:plants-vs-zombies.html | sha256sum
> # 期望：d2f16d488ea3659fb4aaa08a34b733f1fbb91a719c534c4fd956628a8526d1d6
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控全量 | ✅（96/96 FULL · 58/58 BUS · BENCH PASS） |
| G2 判别力自证 | ✅（真机旧源 0/6 全红 + BADGE-03 先红后绿） |
| G3 冻结副本 + 完整性 | ✅（§E SHA-256 可复现） |
| G4 标签已推送 | ✅（`v2.3.0` @ `de5b7e3`） |
| G5 发布签字 | ✅ 已授权（用户「打 tag v2.3.0 + release 四件套」指令 + tag 已推） |
| G6 真机视觉验收 | ✅ 10/10 PASS（本版有视觉变更，已做——区别于 v2.2.7/v2.2.8 的跳过） |

**判定：✅ 全门 PASS——发布完成。**

## G. 挂起项（发布后动作）

| # | 项 | 状态 |
|---|---|---|
| 1 | 四蘑菇发卡落点实装（方案 A：3-1 小喷菇 / 3-2 阳光菇 / 3-3 大喷菇 / 3-4 魅惑菇） | ⏳ v2.3.1 计划（世界 3 开放时） |
| 2 | 世界 3（墓地）/ 世界 4（房屋）真实关卡补全（Q-12 占位） | ⏳ v2.3.1 计划 |
| 3 | 墓碑机制实装 | ⏳ v2.3.1 计划 |
| 4 | 金币留存钩子 | ⏳ v2.3.1 计划 |
| 5 | Q-2 免疫名单实装（`HYPNOSHROOM_IMMUNE` 已记位） | ⏳ 出现免疫对象时 |

---
