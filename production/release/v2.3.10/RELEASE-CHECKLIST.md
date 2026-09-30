# PvZ Lite v2.3.10 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-30：门控 G1–G5 全绿 + 冻结副本校验 + tag 已打）。
> **版本**：v2.3.10 ｜ **发布日期**：2026-09-30 ｜ **产物**：`plants-vs-zombies.html`（单文件，5730 行 / 350,421 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-30（+0800）。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 公司机 user3667（gitconfig 7890 代理）。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 104/104 PASS | **104/104 PASS**（SMOKE 29 + REG 75） | ✅ |
| A2 | 音频总线核验 | `node tests/harness/verify-bus.js` | 58/58 PASS | **58/58 PASS** | ✅ |
| A3 | 无头性能基准 | `node tests/perf/bench.js` | — | 本版非里程碑，未跑（--quick 策略） | ⏭️ |
| A4 | 版本定版核对 | 源码 `VERSION` 常量 | `v2.3.10` | **`const VERSION='v2.3.10'`** | ✅ |
| A5 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行数与定版源码一致 | **5730 行** | ✅ |
| A6 | 蘑菇视觉测试 | `node tests/playtests/v23-mushroom-visual.js` | 10/10 PASS | **10/10 PASS** | ✅ |
| A7 | 墓碑啃食测试 | `node tests/playtests/_v238-gravebuster-chew.js` | 4/4 PASS | **4/4 PASS** | ✅ |
| A8 | 墓碑 clip 视觉测试 | `node tests/playtests/_v2310-gravebite-clip.js` | 5/5 PASS | **5/5 PASS** | ✅ |

## B. 功能验收（v2.3.10 咬碑藤啃碑穿模消缺）

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | 碑体随进度自碑顶 clip 逐渐消失（一点点往下吃） | ✅ | `_v2310-gravebite-clip.js` 5/5 |
| B2 | 裁切缘咬痕齿线（阴影不裁） | ✅ | 视觉核验 |
| B3 | 裂纹钳制在剩余碑体内 | ✅ | 视觉核验 |
| B4 | 判别力自证（旧源必红） | ✅ | `_v2310-gravebite-clip.js` 旧源 2/5（T2/T3/T4 全红） |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v2.3.10.html` | ✅ 已导出（`git show v2.3.10:plants-vs-zombies.html`，350,421 字节 LF） |
| C2 | RELEASE-NOTES.md | ✅ 已定稿 |
| C3 | KNOWN-ISSUES.md | ✅ 已定稿 |
| C4 | RELEASE-CHECKLIST.md | ✅ 本文件 |
| C5 | `v2.3.10` 标签 | ✅ 本地已打（轻量标签 @ `b51cc75`，本批推送） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至 `production/release/v2.3.9/artifacts/plants-vs-zombies.v2.3.9.html` 冻结副本对外分发。
- 本版增量 = 咬碑藤啃碑穿模消缺；revert `b51cc75` 施工链即可回退。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v2.3.10/artifacts/plants-vs-zombies.v2.3.10.html` |
| 导出方式 | `git show v2.3.10:plants-vs-zombies.html` —— 重定向字节直通（LF） |
| 行数 | 5730（LF 口径） |
| 字节数 | **350,421**（LF 口径，冻结副本权威口径；v2.3.9 347,299，+3,122B） |
| LF SHA-256 | `b30b5f11d1eed73d17fc04c7af27b9c7a264618704ab02fcd06ec46e4effaba0` |
| 冻结副本内版本标识 | `const VERSION='v2.3.10'`（grep 核验通过，恰 1 处） |

> 校验命令（LF 权威口径）：
> ```
> git show v2.3.10:plants-vs-zombies.html | sha256sum
> # 期望：b30b5f11d1eed73d17fc04c7af27b9c7a264618704ab02fcd06ec46e4effaba0
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控全量 | ✅（104/104 FULL · 58/58 BUS · v23 10/10 · _v238 4/4 · _v2310 5/5） |
| G2 判别力自证 | ✅（`_v2310-gravebite-clip.js` 旧源 2/5，T2/T3/T4 全红） |
| G3 冻结副本 + 完整性 | ✅（§E SHA-256 可复现） |
| G4 标签 | ✅（`v2.3.10` @ `b51cc75`，本批已打） |
| G5 发布签字 | ✅ 已授权（用户「发版继续」指令） |

**判定：✅ 全门 PASS——发布完成（tag 本批推送）。**

## G. 挂起项（发布后动作）

| # | 项 | 状态 |
|---|---|---|
| 1 | 金币留存钩子 | ⏳ 待排期（v2.4.0） |
| 2 | 世界 2 后 6 关手感实测反馈 | ⏳ 待用户 |
| 3 | GDD level-3/level-4 平衡数值复核 | ⏳ 待排期 |

---