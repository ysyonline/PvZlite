# PvZ Lite v1.7 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-22：技术门 G1–G3 全绿 + 冻结副本导出校验 + 两轮真机验收 PASS → 发布定稿；G4 推送/打标待用户授权）。
> **版本**：v1.7.0 ｜ **发布日期**：2026-09-22 ｜ **产物**：`plants-vs-zombies.html`（单文件，3289 行 / 162,685 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-22 15:2x（+0800），定版刀 `5803334` + 注释标签同步 `c379872` 之后工作树（源码内容与 `c379872` 一致）。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 前开发机 user3667 / i5-12500。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 烟雾测试 | `node tests/harness/run-smoke.js` | 29/29 PASS | **29/29 PASS**（143ms） | ✅ |
| A2 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 86/86 PASS | **86/86 PASS**（357ms） | ✅ |
| A3 | 音频总线核验 | `node tests/harness/verify-bus.js` | 56/56 PASS | **56/56 PASS**（零新 SFX 键，符合设计预期） | ✅ |
| A4 | 无头性能基准 | `node tests/perf/bench.js` | 五场景 PASS | **PASS**：A 0.05/0.10 · B 0.13/0.29 · C 0.22/0.47 · D 0.29/0.57 · E 0.44/0.80ms（p50/p95，帧异常 0）；draw calls 全口径中位 **290 / 876 / 1590 / 1890 / 2635** —— A–D 与 v1.6 基线**逐场景一致**，E=2635（Δ+8，落在该场景 min2449–max2903 噪声带内且确定性复现）⇒ **零渲染结构漂移**。已回填 `docs/architecture/perf-profile.md` §7 | ✅ |
| A5 | 版本定版核对 | 源码 `VERSION` 常量（L49） | `v1.7.0` | **`const VERSION='v1.7.0'`**（`v1.7.0-wip`→`v1.7.0`，定版刀 `5803334`） | ✅ |
| A6 | 源码考古核对 | 定版提交内容指纹 | v1.7 两需求标识符在位 | `splash:30,splashRatio:0.40`（cabbage L1457 / corn L1472）· `Math.random()<0.27`（L1471）· `if(pr.butter)applyFreeze(z)`（L1578）· `z.freezeT=3.0`（L1615）· `applyFreeze` 入口注释（L1610）· `fireArcProjectile` 与溅射循环**零改动**指纹全在位 | ✅ |
| A7 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行号与定版源码一致 | **已重跑**（3289 行源码 → 19 分区 / 94 函数 / 62 常量） | ✅ |
| A8 | 真机验收脚本 | `node tests/playtests/v17-acceptance.js` / `PVZ_EXPECT_VER=1.7 node tests/playtests/v16-acceptance.js` | 全 PASS | v17 **7/7 PASS**（09-22 本机）+ v16 **14/14 PASS**（09-22 本机，C2/env 修复后） | ✅ |

> 注：A4 为本机 i5-12500 口径（v1.6 基线同为该机）。bench 为无头乐观下限（不做光栅化/文本布局），draw call 结构量可信。无头口径局限照旧披露。

## B. 真机人工验收

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | v1.7 新需求真机验收（`v17-acceptance.js` · 端口 9354） | ✅ **PASS 7/7** | Edge headless=new + CDP + 像素判读；PAGE 由 `__dirname` 推导（规避 v16 硬编码失效）；截图前**冻结 raf 主循环**（防 CDP 假同帧）。R-B-1 cabbage 实弹 dmg20/splash30/ratio0.40 · R-B-2 同排 A 直中 20 + B 溅射 **8** 且 **B.freezeT=0** + 对照臂（>30px）掉血 **0** · R-B-4 corn/melon/icemelon 溅射 **6/35.75/35.75 未变**（icemelon 溅射邻体仍减速）· R-B-5 飞行/爆点两帧截图 md5 相异 · R-A-1 命中当刻 `freezeT=3.0` + 三停 + 3.33s 到期恢复 · R-A-2 N=4000 概率 26.32%（区间 24–30%） |
| B2 | 回归真机验收（`v16-acceptance.js`） | ✅ **PASS 14/14** | `PVZ_EXPECT_VER=1.7` 下 env 转绿；**C2 由 FAIL 转绿**（`tagged/butter=1046/1046`，普通弹无该字段 2954 个 ⇒ 符合字段存在性语义；概率带 0.24–0.30 **未放宽**）；C1/C3/C4/C5/C6 与 B1a–B2d 保持 PASS；跑后已 `git checkout` 还原 results.json 与 v16-*.png |
| B3 | **判别力自证**（防凑绿） | ✅ | `git show b0bf23a:plants-vs-zombies.html` 取旧源 → `PVZ_HTML_PATH=<旧源> node tests/harness/run-all.js --all` ⇒ **85/86**，红灯 `REG-FREEZE-01 §1 :: 2.45`（旧 2.5s 实现下命中即断）⇒ 3.0s 断言具**真实判别力**，无「绿灯假象」 |
| B4 | 用户 Go/No-Go | ✅ Go | 2026-09-22 用户选择执行定版发布（选项 1） |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v1.7.html` | ✅ 已导出（2026-09-22，`git show c379872` Node Buffer 直通逐字节，LF 口径，双口径核验一致） |
| C2 | `RELEASE-NOTES.md` 定稿 v1.0 | ✅ |
| C3 | `KNOWN-ISSUES.md` 定稿 v1.0（含优化池核对固定节） | ✅ |
| C4 | `RELEASE-CHECKLIST.md`（本文件） | ✅ |
| C5 | `v1.7.0` 标签 | ⏳ 待用户授权：**轻量标签** `v1.7.0` @ 发布包提交，须 `git push origin v1.7.0` **显式推送**（`--follow-tags` 推不动轻量标签的坑按惯例规避） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至上一下线点 = 恢复 `production/release/v1.6/artifacts/plants-vs-zombies.v1.6.html` 冻结副本对外分发；仓库侧以 `v1.6` 标签（`0b969d5`）重建分发链。
- 本版回滚粒度友好：R-A 为 2 处数值（`0.27`→`0.25` / `3.0`→`2.5`）、R-B 为 1 处字段（cabbage `splash:30,splashRatio:0.40` → `splash:0`），均可 3 行内回退。
- 冻结产物（v1.0.0 / v1.1 / v1.2 / v1.2.1 / v1.3 / v1.4 / v1.5 / v1.6 / v1.7）均只读，任何热修必须走新版本流程，禁止原地改冻结副本。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v1.7/artifacts/plants-vs-zombies.v1.7.html` |
| 导出方式 | `git show c379872:plants-vs-zombies.html` —— **Node Buffer 直通**导出（LF，只读；未经文本读写，杜绝 CRLF 转换污染；对象库级校验，导出零失真） |
| 行数 | 3289（LF 口径） |
| 字节数 | **162,685**（LF 口径，冻结副本权威口径） |
| LF SHA-256 | `5ff52d2b3de907195f851eb90e4dd9d60540327daf35f569cc3403e1e8fd14f6`（与 `git show c379872:plants-vs-zombies.html \| sha256sum` 输出**逐字节一致**，已核验；导出文件 `sha256` 亦一致，且 `hasCR=false`、`Buffer.compare(blob, disk)===0`） |
| 冻结副本内版本标识 | L49 `const VERSION='v1.7.0';   // v1.7 定版（R-A 黄油加强 27%/3.0s · R-B 投掷类溅射分级；见 production/v1.7-plan.md）` |
| 历史冻结指纹（只读基线） | v1.0.0 `713a9441…b1030deb` · v1.1 `29bc5a36…9de7d6f1` · v1.5 `4dcf8921…de2e0` · v1.6 `4c386eae…db0989` |

> 校验命令（LF 权威口径，**勿直接 `sha256sum` 工作区文件**，会因 CRLF 虚警）：
> ```
> git show c379872:plants-vs-zombies.html | sha256sum
> # 期望：5ff52d2b3de907195f851eb90e4dd9d60540327daf35f569cc3403e1e8fd14f6
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控复跑 | ✅（A1–A4；bench 回填与 code-map 重跑已随定版刀提交） |
| G2 真机验收 | ✅（B1 7/7 + B2 14/14 + B3 判别力自证，B4 用户 Go） |
| G3 冻结副本 + 完整性 | ✅（§E，双口径一致 + 无 CR） |
| G4 发布签字 | ⏳ **推送 / 打标待用户单独授权**（v1.5 / v1.6 治理惯例保留） |

**判定：✅ 技术门 PASS——内容定稿；远端推送动作待授权。**

## G. 挂起项（发布后动作 · 均须用户授权）

| # | 项 | 状态 |
|---|---|---|
| 1 | `v1.7.0` 轻量标签 + main 推送远端 | ⏳ 待授权。**推送前先探测 Clash 端口**（09-22 教训：「读通写不通 / HTTP 302」时先 curl 探测 **7890** 与 **7892**，哪个通走 `-c "http.https://github.com.proxy=http://127.0.0.1:<port>"`；直连配方 `-c "http.https://github.com.proxy="` **不是永真式**）+ `git push origin v1.7.0` 显式推标签；推后 HTTPS 匿名 `git ls-remote` 双确认 |
| 2 | 溅射同排堆叠「命中数分布」playtest 采样 | ⏳ 建议（非阻塞）——真机仅受控两只僵尸边界验证；真实对局堆叠频率未采样 |
| 3 | 跨排 + 输出接力的多 corn 实战布防 | ⏳ 建议（非阻塞）——M6 为受控桶测，未做实战布防 |
| 4 | D-3 平衡模型补正 | ⏳ 建议（非阻塞）——设计稿投影 +26~30% 未刻画「T > cd 后刷新重叠浪费」，实测 +20.8%；后续做同类参数调整时应把该效应写进口径 |
| 5 | 整局 playthrough / 非 Chromium 浏览器 | ⏳ 已披露（继承 v1.5/v1.6，均非阻塞） |
