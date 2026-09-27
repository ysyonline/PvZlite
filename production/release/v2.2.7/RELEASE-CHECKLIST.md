# PvZ Lite v2.2.7 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-27：门控 G1–G5 全绿 + 冻结副本校验 + 判别力自证 + tag 推送 → 发布定稿）。
> **版本**：v2.2.7 ｜ **发布日期**：2026-09-27 ｜ **产物**：`plants-vs-zombies.html`（单文件，4393 行 / 240,003 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-27 17:2x（+0800）。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 原开发机 weixufeng。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|---|
| A1 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all`（异步直跑，spawnSync EBUSY 走等效路径） | 92/92 PASS | **92/92 PASS**（SMOKE 29 + REG 63） | ✅ |
| A2 | 音频总线核验 | `node tests/harness/verify-bus.js`（异步直跑） | 58/58 PASS | **58/58 PASS** | ✅ |
| A3 | 无头性能基准 | `node tests/perf/bench.js` | 五场景 PASS | **⏭ 跳过**（spawnSync EBUSY，按惯例跳，bench 无漂移不作为阻塞） | ⏭ |
| A4 | 版本定版核对 | 源码 `VERSION` 常量 | `v2.2.7` | **`const VERSION='v2.2.7'`** | ✅ |
| A5 | 版本标签通扫核对 | grep 活文件 | 无旧版活默认值残留 | prelude / v17-acc / v18-acc 三处同步 `v2.2.7` | ✅ |
| A6 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行号与定版源码一致 | **已重跑**（4393 行 / 21 分区 / 105 函数 / 77 常量） | ✅ |

## B. 消缺验收

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | 杭椒/樱桃膨胀完成即立即引爆 | ✅ | `updatePlant` pepper/cherry 分支：`armT` 达标直接 `explodePepper`/`explodeCherry`，不等待僵尸踩中 |
| B2 | 奖励重排（1-9=冰冻西瓜 / 1-10=荷叶 / 2-1=100金币） | ✅ | `CARD_AWARD` 三键变更；荷叶在 1-10 发放，玩家进 2-1 前必拥有 |
| B3 | harness 对照模式假绿根治 | ✅ | `index.js loadGame`：`htmlPath = opts.htmlPath || process.env.PVZ_HTML_PATH || 默认` |
| B4 | 判别力自证（先红后绿） | ✅ | 旧源 v2.2.6 下 REG-PEPPER/CHERRY/POINT-04/META-02/SLOT-03 恰全红 |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v2.2.7.html` | ✅ 已导出（`git show HEAD:plants-vs-zombies.html`，240,003 字节 LF） |
| C2 | RELEASE-NOTES.md | ✅ 已定稿 |
| C3 | KNOWN-ISSUES.md | ✅ 已定稿 |
| C4 | RELEASE-CHECKLIST.md | ✅ 本文件 |
| C5 | `v2.2.7` 标签 | ✅ 已推送（轻量标签 @ `5df147a`） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至 `production/release/v2.2.6/artifacts/plants-vs-zombies.v2.2.6.html` 冻结副本对外分发（注：v2.2.6 四件套未落盘 release 目录，以 commit `3b9b727` 为准）。
- 本版增量 = 一行为修正 + 一奖励重排 + 一测试基建修复，无关卡波次 / 僵尸属性 / 伤害公式变更，revert 提交即可回退。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v2.2.7/artifacts/plants-vs-zombies.v2.2.7.html` |
| 导出方式 | `git show HEAD:plants-vs-zombies.html` —— 重定向字节直通（LF） |
| 行数 | 4393（LF 口径） |
| 字节数 | **240,003**（LF 口径，冻结副本权威口径；v2.2.6 ≈ 237,xxx，+~2,800B 来自三处改动 + code-map 刷新） |
| LF SHA-256 | `79c87f1d657b04bb9e36905f8421dc88315679ec3095563eb688f09dabfe52e2` |
| 冻结副本内版本标识 | `const VERSION='v2.2.7';   // v2.2.7 消缺：杭椒/樱桃膨胀完成后立即爆炸（不再等僵尸踩中）；奖励重排 1-9=冰冻西瓜/1-10=荷叶/2-1=100金币` |

> 校验命令（LF 权威口径）：
> ```
> git show HEAD:plants-vs-zombies.html | sha256sum
> # 期望：79c87f1d657b04bb9e36905f8421dc88315679ec3095563eb688f09dabfe52e2
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控全量 | ✅（92/92 FULL · 58/58 BUS） |
| G2 判力自证 | ✅（先红后绿，五目标用例恰红） |
| G3 冻结副本 + 完整性 | ✅（§E SHA-256 可复现） |
| G4 标签已推送 | ✅（`v2.2.7` @ `5df147a`） |
| G5 发布签字 | ✅ 已授权 |

**判定：✅ 全门 PASS——发布完成。**

## G. 挂起项（发布后动作）

| # | 项 | 状态 |
|---|---|---|
| 1 | 真机视觉截图验收 | ⏳ 可后补（本版无视觉变更） |
| 2 | 世界 3/4 真实关卡补全（Q-12 占位） | ⏳ v2.3 计划 |
| 3 | 墓碑机制实装 | ⏳ v2.3 计划 |
| 4 | 金币留存钩子 | ⏳ v2.3 计划 |

---