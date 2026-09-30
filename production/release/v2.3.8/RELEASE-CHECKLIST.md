# PvZ Lite v2.3.8 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-30：门控 G1–G5 全绿 + 冻结副本校验 + tag 已打已推送）。
> **版本**：v2.3.8 ｜ **发布日期**：2026-09-30 ｜ **产物**：`plants-vs-zombies.html`（单文件，5679 行 / 344,497 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-30（+0800）。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 公司机 user3667（gitconfig 7890 代理）。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 103/103 PASS | **103/103 PASS**（SMOKE 29 + REG 74） | ✅ |
| A2 | 音频总线核验 | `node tests/harness/verify-bus.js` | 58/58 PASS | **58/58 PASS** | ✅ |
| A3 | 无头性能基准 | `node tests/perf/bench.js` | — | 本版非里程碑，未跑（--quick 策略） | ⏭️ |
| A4 | 版本定版核对 | 源码 `VERSION` 常量 | `v2.3.8` | **`const VERSION='v2.3.8'`** | ✅ |
| A5 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行数与定版源码一致 | **5679 行** | ✅ |

## B. 功能验收（v2.3.8 三项手感修复）

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | 猫王召唤改正版机制（首召铺满 4 / 死亡补召 ~3s / 满员不计时） | ✅ | REG-ELVIS-02 |
| B2 | 小喷菇柄改矩形（等宽，非倒三角） | ✅ | 视觉核验 |
| B3 | 铁桶僵尸血量回调正版 1225（旧 560 仅正版 46%） | ✅ | REG-ZOM-01 + README 同步 |
| B4 | 判别力自证（旧源必红） | ✅ | REG-ELVIS-02 旧源必红 |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v2.3.8.html` | ✅ 已导出（`git show v2.3.8:plants-vs-zombies.html`，344,497 字节 LF） |
| C2 | RELEASE-NOTES.md | ✅ 已定稿 |
| C3 | KNOWN-ISSUES.md | ✅ 已定稿 |
| C4 | RELEASE-CHECKLIST.md | ✅ 本文件 |
| C5 | `v2.3.8` 标签 | ✅ 本地已打（轻量标签 @ `b5f6974`，**已推送**） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至 `production/release/v2.3.7/artifacts/plants-vs-zombies.v2.3.7.html` 冻结副本对外分发。
- 本版增量 = 猫王召唤改正版 + 小喷菇柄矩形 + 铁桶血量 1225；revert `b5f6974` 施工链即可回退。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v2.3.8/artifacts/plants-vs-zombies.v2.3.8.html` |
| 导出方式 | `git show v2.3.8:plants-vs-zombies.html` —— 重定向字节直通（LF） |
| 行数 | 5679（LF 口径） |
| 字节数 | **344,497**（LF 口径，冻结副本权威口径；v2.3.7 342,507，+1,990B） |
| LF SHA-256 | `b5c6f4ba7339f17e87fdf65df680b60c41e0ffaa9c91cf7d314aef98b01d6c43` |
| 冻结副本内版本标识 | `const VERSION='v2.3.8'`（grep 核验通过，恰 1 处） |

> 校验命令（LF 权威口径）：
> ```
> git show v2.3.8:plants-vs-zombies.html | sha256sum
> # 期望：b5c6f4ba7339f17e87fdf65df680b60c41e0ffaa9c91cf7d314aef98b01d6c43
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控全量 | ✅（103/103 FULL · 58/58 BUS） |
| G2 判别力自证 | ✅（REG-ELVIS-02 旧源必红） |
| G3 冻结副本 + 完整性 | ✅（§E SHA-256 可复现） |
| G4 标签 | ✅（`v2.3.8` @ `b5f6974`，已打已推送） |
| G5 发布签字 | ✅ 已授权（用户「发版继续」指令） |

**判定：✅ 全门 PASS——发布完成（tag 已推送）。**

## G. 挂起项（发布后动作）

| # | 项 | 状态 |
|---|---|---|
| 1 | 金币留存钩子 | ⏳ 待排期（v2.4.0） |
| 2 | v2.3.9 / v2.3.10 四件套补齐 + tag 推送 | ⏳ 本批进行中 |
| 3 | 世界 2 后 6 关手感实测反馈 | ⏳ 待用户 |

---