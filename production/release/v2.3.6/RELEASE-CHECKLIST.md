# PvZ Lite v2.3.6 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-30：门控 G1–G5 全绿 + 冻结副本校验 + tag 本地已打）。
> **版本**：v2.3.6 ｜ **发布日期**：2026-09-29 ｜ **产物**：`plants-vs-zombies.html`（单文件，5397 行 / 320,995 字节[LF 口径，冻结副本权威口径]）

> ⚠️ **版本边界**：本版 tag `v2.3.6` @ `712de43` 仅含「铲子免费卡不返还 + 世界 2 波数对齐」。2026-09-29 后续改动（W2 初始阳光 50 / 四项视觉调整 / 西瓜溅射修复 / 双 UI bug 修复）被并入 v2.3.7 提交，见 v2.3.7 发行说明。

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-29（+0800）。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 原开发机 weixufeng。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 98/98 PASS | **98/98 PASS**（SMOKE 29 + REG 69） | ✅ |
| A2 | 音频总线核验 | `node tests/harness/verify-bus.js` | 58/58 PASS | **58/58 PASS** | ✅ |
| A3 | 无头性能基准 | `node tests/perf/bench.js` | — | 本版非里程碑，未跑（--quick 策略） | ⏭️ |
| A4 | 版本定版核对 | 源码 `VERSION` 常量 | `v2.3.6` | **`const VERSION='v2.3.6'`** | ✅ |
| A5 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行数与定版源码一致 | **5397 行** | ✅ |

## B. 功能验收（v2.3.6 经济与波数）

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | 铲子免费卡不返还（小喷菇 cost=0） | ✅ | `refund` 逻辑；堵「种-铲」漏洞 |
| B2 | 世界 2 波数 2-l ↔ 1-l 位对齐 | ✅ | `metaFor` 按 l 引 1-l 锚；REG-ELVIS-01 |
| B3 | 猫王 ELVIS_WAVES 零改动自适应 | ✅ | 2-5/2-7/2-9/2-10 恒等/压缩 |
| B4 | 判别力自证（旧源必红） | ✅ | REG-ELVIS-01 波数契约；v235/v234 复跑全绿 |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v2.3.6.html` | ✅ 已导出（`git show v2.3.6:plants-vs-zombies.html`，320,995 字节 LF） |
| C2 | RELEASE-NOTES.md | ✅ 已定稿 |
| C3 | KNOWN-ISSUES.md | ✅ 已定稿 |
| C4 | RELEASE-CHECKLIST.md | ✅ 本文件 |
| C5 | `v2.3.6` 标签 | ✅ 本地已打（轻量标签 @ `712de43`，**未推送**） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至 `production/release/v2.3.5/artifacts/plants-vs-zombies.v2.3.5.html` 冻结副本对外分发。
- 本版增量 = 铲子免费卡不返还 + 波数对齐；revert `712de43` 即可回退。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v2.3.6/artifacts/plants-vs-zombies.v2.3.6.html` |
| 导出方式 | `git show v2.3.6:plants-vs-zombies.html` —— 重定向字节直通（LF） |
| 行数 | 5397（LF 口径） |
| 字节数 | **320,995**（LF 口径，冻结副本权威口径；v2.3.5 321,528，-533B） |
| LF SHA-256 | `30864860e063178b278e1ddf3024450993db6dd541278bc444dd1bb08f401224` |
| 冻结副本内版本标识 | `const VERSION='v2.3.6'`（grep 核验通过，恰 1 处） |

> 校验命令（LF 权威口径）：
> ```
> git show v2.3.6:plants-vs-zombies.html | sha256sum
> # 期望：30864860e063178b278e1ddf3024450993db6dd541278bc444dd1bb08f401224
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控全量 | ✅（98/98 FULL · 58/58 BUS） |
| G2 判别力自证 | ✅（REG-ELVIS-01 + v235/v234 复跑） |
| G3 冻结副本 + 完整性 | ✅（§E SHA-256 可复现） |
| G4 标签 | ✅（`v2.3.6` @ `712de43`，本地已打，未推送） |
| G5 发布签字 | ✅ 已授权（用户「tag v2.3.1~v2.3.7 + release 四件套」指令） |

**判定：✅ 全门 PASS——发布完成（tag 未推送）。**

## G. 挂起项（发布后动作）

| # | 项 | 状态 |
|---|---|---|
| 1 | W2 初始阳光 50 / 四项视觉调整 / 西瓜溅射 / 双 UI bug（已并入 v2.3.7 提交） | ⏳ v2.3.7 发行说明覆盖 |
| 2 | 害羞菇 + 墓碑重生 | ⏳ v2.3.7 计划 |

---