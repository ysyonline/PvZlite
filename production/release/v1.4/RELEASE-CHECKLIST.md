# PvZ Lite v1.4 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-21：技术门 G1–G3 全绿 + 冻结副本导出校验 + 用户验收 Go → 发布定稿）。
> **版本**：v1.4.0 ｜ **发布日期**：2026-09-21 ｜ **产物**：`plants-vs-zombies.html`（单文件，3000 行 / 141,882 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-21 16:1x–16:2x，工作树（定版刀 `d883d6c` 提交后），解释器 Node v22.22.2（managed，绝对路径调用）。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 烟雾测试 | `node tests/harness/run-smoke.js` | 29/29 PASS | **29/29 PASS**（184ms） | ✅ |
| A2 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 81/81 PASS | **81/81 PASS**（390ms，含 REG-POINT-06 爆币特效链） | ✅ |
| A3 | 音频总线核验 | `node tests/harness/verify-bus.js` | 56/56 PASS | **56/56 PASS**（v1.4 零新键，收集音复用 cardReady） | ✅ |
| A4 | 无头性能基准 | `node tests/perf/bench.js` | 五场景 PASS | **PASS**：A p50 0.05/p95 0.10 · B 0.13/0.26 · C 0.23/0.50 · D 0.27/0.54 · E p50 0.43/p95 0.77ms（E=屋顶地狱 DC 2620 全口径，p95 占 5% 预算） | ✅ |
| A5 | 版本定版核对 | 源码 `VERSION` 常量（L49） | `v1.4.0` | **`const VERSION='v1.4.0'`**（已终核） | ✅ |
| A6 | 源码考古核对 | 定版提交内容指纹 | 3000 行 / v1.4 标识符在位 | 3000 行；`POINT_CONFIG`/`SLOT_CONFIG`/`DEATH_COIN_FX`/`settleRun`/`DECK_SLOTS`/`pointDrops`/`drawCoin` 指纹合计 42 处命中，全在位 | ✅ |

> 注：A4 bench 分场景数据为 perf-profile §7 幂等回填随定版刀入库的口径；无头口径局限（不做光栅化/文本布局）照旧披露，真机 DevTools 复核留待发布后。

## B. 真机人工验收

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | v1.4 验收三轮真机 | ✅ 完成 | ①菜单精简 + 开始即选卡两排布局（14:0x 拍板 `0fc463b`）；②死亡爆币特效（15:1x 拍板 `f3c47fd`）；③恒金色修正（16:0x 拍板 `96b6b12`）——均真机确认后提交 |
| B2 | 用户 Go/No-Go | ✅ Go | 2026-09-21 16:1x「已验收，走定版」 |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v1.4.html` | ✅ 已导出（2026-09-21，`git show d883d6c` 逐字节，对象库级校验） |
| C2 | `RELEASE-NOTES.md` 定稿 v1.0 | ✅ |
| C3 | `KNOWN-ISSUES.md` 定稿 v1.0（含优化池核对固定节） | ✅ |
| C4 | `RELEASE-CHECKLIST.md`（本文件） | ✅ |
| C5 | `v1.4` 标签 | ⏳ 待打于 `d883d6c`（推送远端随本次定版一并执行，见 §G） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至上一下线点 = 恢复 `production/release/v1.3/artifacts/plants-vs-zombies.v1.3.html` 冻结副本对外分发；仓库侧以 `v1.3` 标签（`51344fca`）重建分发链。
- 冻结产物（v1.0.0 / v1.1 / v1.2 / v1.2.1 / v1.3 / v1.4）均只读，任何热修必须走新版本流程，禁止原地改冻结副本。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v1.4/artifacts/plants-vs-zombies.v1.4.html` |
| 导出方式 | `git show d883d6c:plants-vs-zombies.html` 逐字节导出（LF，只读；对象库级校验，导出零失真） |
| 行数 | 3000（LF 口径） |
| 字节数 | 141,882（LF 口径，冻结副本权威口径） |
| LF SHA-256 | `84dfad993fa60908921433c0be606810c32abd240bdbc35110b204aa322d5553`（与 `git show d883d6c:` 输出逐字节一致，已核验） |
| 工作区 CRLF SHA-256（参考） | `3043c7e4d99860cff1b6a98751f251d58918849e452e6aa540d4f7bb80ca2e24`（autocrlf 检出态，3000 行 / 144,882 字节；换电脑核验请用 `git show d883d6c:plants-vs-zombies.html \| sha256sum` 的 LF 口径） |

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控复跑 | ✅（A1–A4，定版刀提交后干净树） |
| G2 真机验收 | ✅（B1–B2，验收三轮 + 用户 Go） |
| G3 冻结副本 + 完整性 | ✅（§E） |
| G4 发布签字 | ✅ **用户 Go（2026-09-21 16:1x）** |

**判定：✅ PASS——四门全绿，发布放行。**

## G. 挂起项（发布后动作）

| # | 项 | 状态 |
|---|---|---|
| 1 | `v1.4` 标签 + main 推送远端 | ⏳ 随本次定版执行（用户已授权推送） |
| 2 | GitHub Release（如需挂发行附件） | ⏳ 未排期；冻结副本已入库，可随时补 |
| 3 | 积分商城解冻（卡槽解锁消费入口） | 🧊 冻结中；buySlot 逻辑保留，解冻需用户拍板 |
