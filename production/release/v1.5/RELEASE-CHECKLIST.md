# PvZ Lite v1.5 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-21：技术门 G1–G3 全绿 + 冻结副本导出校验 + 真机验收 8/8 PASS + 用户 Go → 发布定稿）。
> **版本**：v1.5.0 ｜ **发布日期**：2026-09-21 ｜ **产物**：`plants-vs-zombies.html`（单文件，3168 行 / 153,230 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-21 20:2x（+0800），工作树（定版刀 `56b8d25` 提交后），解释器 Node v22.22.2（managed，绝对路径调用）。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 烟雾测试 | `node tests/harness/run-smoke.js` | 29/29 PASS | **29/29 PASS**（371ms） | ✅ |
| A2 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 83/83 PASS | **83/83 PASS**（907ms） | ✅ |
| A3 | 音频总线核验 | `node tests/harness/verify-bus.js` | 56/56 PASS | **56/56 PASS**（v1.5 零新键，v1.5 无新增音效路由） | ✅ |
| A4 | 无头性能基准 | `node tests/perf/bench.js` | 五场景 PASS | **PASS**：A p50 0.11/p95 0.27 · B 0.31/0.73 · C 0.54/1.93 · D 0.64/2.82 · E 1.05/3.68ms（帧异常 0；draw calls 全口径中位 290/876/1589/1889/2620） | ✅ |
| A5 | 版本定版核对 | 源码 `VERSION` 常量（L49） | `v1.5.0` | **`const VERSION='v1.5.0'`**（`v1.5.0-wip`→`v1.5.0`，已终核） | ✅ |
| A6 | 源码考古核对 | 定版提交内容指纹 | v1.5 标识符在位 | `CARDS` 12 张（L223 起）· `DIFF_AWARD`（L91）· `applyChill`（L1541–1544）· `pvz_diff_clears`（L242/L340）· `DECK_GRID gh104`（L1003）· `DECK_SLOTS cw92`（L1004）指纹全在位 | ✅ |
| A7 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行号与定版源码一致 | **已重跑**（3168 行源码 → 18 分区 / 92 函数 / 62 常量；定版刀仅改 1 行注释、未增删行，**行号无漂移**，`docs/code-map.md` 内容零变化） | ✅ |
| A8 | 真机验收脚本复跑（可选） | `node tests/playtests/v15-acceptance.js` | 8/8 PASS | 见 §B（V15-ACC-Q1 机读结果 `v15-acceptance-results.json`，`overall: PASS`，A/B1/B2/C1/C2/C3/C4/D 8 子项全绿） | ✅ |

> 注：A4 bench 分场景数据为本机（低配机 i5-7500T × 4）复核口径，详见 `docs/architecture/perf-profile.md` §7.1；无头口径局限（不做光栅化/文本布局）照旧披露，真机 DevTools 复核留待发布后。

## B. 真机人工验收

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | v1.5 真机验收（自动化，V15-ACC-Q1 · 质量组） | ✅ **PASS 8/8** | Edge headless=new + CDP + `getImageData` 像素判读；子项 A（选卡布局不重叠/不溢出）· B1（三新卡可种·射击循环·掉血 30/20/65）· B2（溅射 0.40/0.55 + 减速覆盖）· C1（冰蓝 tint 像素前后）· C2（移动 ×0.6，比值 0.6000）· C3（啃食 ×0.6，比值 0.6000）· C4（不叠加只刷新）· D（难度门槛发卡含幂等） |
| B2 | 用户 Go/No-Go | ✅ Go | 2026-09-21「直接走定版流程」 |

> 验收报告 `tests/playtests/v15-acceptance.md`、机读结果 `tests/playtests/v15-acceptance-results.json`（`overall: PASS`）已随本发布包纳入版本管理。

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v1.5.html` | ✅ 已导出（2026-09-21，`git show 56b8d25` Buffer 直通逐字节，LF 口径，对象库级校验） |
| C2 | `RELEASE-NOTES.md` 定稿 v1.0 | ✅ |
| C3 | `KNOWN-ISSUES.md` 定稿 v1.0（含优化池核对固定节） | ✅ |
| C4 | `RELEASE-CHECKLIST.md`（本文件） | ✅ |
| C5 | `v1.5` 标签 | ⏳ **待打**于 `56b8d25`（**须用户单独授权**；v1.5 惯例为**轻量标签** `v1.5`，推送须显式 `git push origin v1.5`，`--follow-tags` 推不上去） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至上一下线点 = 恢复 `production/release/v1.4/artifacts/plants-vs-zombies.v1.4.html` 冻结副本对外分发；仓库侧以 `v1.4` 标签（`d883d6c`）重建分发链。
- 冻结产物（v1.0.0 / v1.1 / v1.2 / v1.2.1 / v1.3 / v1.4 / v1.5）均只读，任何热修必须走新版本流程，禁止原地改冻结副本。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v1.5/artifacts/plants-vs-zombies.v1.5.html` |
| 导出方式 | `git show 56b8d25:plants-vs-zombies.html` —— **Node Buffer 直通**导出（LF，只读；未经文本读写，杜绝 CRLF 转换污染；对象库级校验，导出零失真） |
| 行数 | 3168（LF 口径） |
| 字节数 | 153,230（LF 口径，冻结副本权威口径） |
| LF SHA-256 | `4dcf8921374d389c0ef30a63c74e891fd0856b6d99730f321f60e6a6893de2e0`（与 `git show 56b8d25:plants-vs-zombies.html \| sha256sum` 输出**逐字节一致**，已核验） |
| 工作区 CRLF SHA-256（参考） | `972270b7c463380dd7ac545aa412f7f6e020b508c79dbaf17fe7921614bf2877`（autocrlf 检出态，3168 行 / 156,398 字节；换电脑核验请用 `git show 56b8d25:plants-vs-zombies.html \| sha256sum` 的 LF 口径） |
| 冻结副本内版本标识 | L49 `const VERSION='v1.5.0';   // v1.5 新植物三件套（已定版）` |

> 校验命令（LF 权威口径，**勿直接 `sha256sum` 工作区文件**，会因 CRLF 虚警）：
> ```
> git show 56b8d25:plants-vs-zombies.html | sha256sum
> # 期望：4dcf8921374d389c0ef30a63c74e891fd0856b6d99730f321f60e6a6893de2e0
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控复跑 | ✅（A1–A4，定版刀提交后干净树） |
| G2 真机验收 | ✅（B1 验收 8/8 PASS，B2 用户 Go） |
| G3 冻结副本 + 完整性 | ✅（§E） |
| G4 发布签字 | ✅ **用户 Go（2026-09-21「直接走定版流程」）** |

**判定：✅ PASS——四门全绿，发布放行。**

## G. 挂起项（发布后动作 · 均须用户授权）

| # | 项 | 状态 |
|---|---|---|
| 1 | `v1.5` 轻量标签 + main 推送远端 | ⏳ **待用户单独授权**（禁止擅自 push；标签为轻量 `v1.5`，须显式 `git push origin v1.5`） |
| 2 | GitHub Release（如需挂发行附件） | ⏳ 未排期；冻结副本已入库，可随时补 |
| 3 | R1 人工 Playtest 复核（减速手感是否可感知/是否拖沓） | ⏳ 建议跟进（非阻塞） |
| 4 | R2 新卡数值平衡检查（icemelon 300 性价比 / corn 溅射是否被 snowpea 支配） | ⏳ 建议移交文策渊（非阻塞） |
| 5 | 积分商城解冻（卡槽解锁消费入口） | 🧊 冻结中（继承 v1.4）；解冻需用户拍板 |
