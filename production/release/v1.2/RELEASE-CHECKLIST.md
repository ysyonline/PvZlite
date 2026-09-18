# PvZ Lite v1.2 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-18：用户授权放行（13:24「点头」）+ 标签推送 + 冻结副本入库 → 定稿）。
> **版本**：v1.2.0 ｜ **发布日期**：2026-09-18 ｜ **产物**：`plants-vs-zombies.html`（单文件，2111 行，约 87 KB）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-18，工作目录 `D:\code\zw`，解释器 Node v22.22.2（managed）。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 烟雾测试 | `node tests/harness/run-smoke.js` | 26/26 PASS | **26/26 PASS**（119ms） | ✅ |
| A2 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 56/56 PASS | **56/56 PASS**（199ms） | ✅ |
| A3 | 音频总线核验 | `node tests/harness/verify-bus.js` | 56/56 PASS | **56/56 PASS** | ✅ |
| A4 | 无头性能基准 | `node tests/perf/bench.js` | 四场景 p95 ≤ 5% 预算 | **PASS**：A p95 0.16ms(1%) / B 0.44ms(3%) / C 0.76ms(5%) / **D 0.86ms(5%，L4 末波地狱水景新场景)**；场景 D 1970 draw calls（全口径），较 C +15.6% 与实体增幅线性吻合 | ✅ |
| A5 | 版本定版核对 | 源码 `VERSION` 常量（L43） | `v1.2.0` | **`const VERSION='v1.2.0'`**（实现完成时即定版；SMOKE 用例断言同步） | ✅ |
| A6 | code-map 同步 | `node tools/gen-code-map.mjs` | 与源码一致 | **2111 行 / 45 常量**，已重跑入库 | ✅ |
| A7 | 用例资产一致性 | `tests/harness/cases/` | 烟雾 26 + REG 30 | **56 个用例文件**（SMOKE-001~026 + REG 30 条） | ✅ |

## B. 真机人工验收（M1–M7）

> 记录表：`tests/playtests/v12-acceptance.md`。M1/M2 于 V12-03 完成后当轮通过；M3b/M3c 为 2026-09-18 12:5x 用户复验定案。

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | M1 菜单入口 / M2 URL 直进 | ✅ 通过 | 验收表（V12-03 轮） |
| B2 | M3b 入水反馈 | **功能可用判通过**；3 项体验优化转优化池（O1 噗通 / O2 哗哗哗 / O3 腿部遮挡），用户明确本轮不改 | 验收表 + `v1.2-plan.md` §六 |
| B3 | M3c 4x 跨局保留 | ✅ 三行全过 | 验收表（2026-09-18 复验） |
| B4 | M4 睡莲全链路 | ✅ 通过（V12-03 轮 M4 通过后才有 03b 修复轮） | 验收表 |
| B5 | M5 整局时长 / M7-7.1 真机体感 | ⏳ 发布后跟踪（N-12a） | KNOWN-ISSUES.md |
| B6 | M7-7.2 无头性能专项 | ✅ PASS（bench 场景 D） | `perf-profile.md` §7 |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v1.2.html` | ✅ 已入库（LF 哈希见 §E，只读） |
| C2 | `RELEASE-NOTES.md` 定稿 v1.0 | ✅ |
| C3 | `KNOWN-ISSUES.md` 定稿 v1.0 | ✅ |
| C4 | `RELEASE-CHECKLIST.md`（本文件） | ✅ |
| C5 | `v1.2.0` 标签 | ✅ 打于定版构建并推送远端（`git ls-remote` 核验一致） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至上一下线点 = 恢复 `production/release/v1.1/artifacts/plants-vs-zombies.v1.1.html` 冻结副本对外分发；仓库侧 `git revert` 或以 v1.1.0 标签重建分发链。
- 两处冻结产物（v1.1 / v1.2）均只读，任何热修必须走新版本流程，禁止原地改冻结副本。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v1.2/artifacts/plants-vs-zombies.v1.2.html` |
| 行数 | 2111 |
| 字节数 | 89,296 |
| LF SHA-256 | `ebbfdb34164d50c8473daee8aa01e2edb816443cb5c87b2f2b5e6d0cf264ffb1`（已核验冻结副本与 `git show HEAD:` 输出逐字节一致） |

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 GDD 评审（数值三口径复算） | ✅（V12-01，主理人独立复算一致） |
| G2 架构评审 | ✅ PASS（V12-02） |
| G3 门控全绿 | ✅（A1–A4） |
| G4 真机验收 | ✅ M1/M2/M3c/M4 通过；M3b 功能可用（3 项优化转池）；M5/M7-7.1 发布后跟踪 |
| G5 发布签字 | ✅ **用户 2026-09-18 13:24 授权（「点头」）** |

**判定：✅ GO —— v1.2.0 发布放行。**
