# PvZ Lite v1.8 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-23：技术门 G1–G3 全绿 + 冻结副本导出校验 + v18 真机验收 PASS → 发布定稿；G4 推送/打标待用户授权）。
> **版本**：v1.8.0 ｜ **发布日期**：2026-09-23 ｜ **产物**：`plants-vs-zombies.html`（单文件，3291 行 / 163,493 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-23 10:0x（+0800），定版刀 `c10f4a1` 之后工作树（源码内容与 `c10f4a1` 一致）。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 公司机 user3667 / i5-12500。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 烟雾测试 | `node tests/harness/run-smoke.js` | 29/29 PASS | **29/29 PASS**（171ms） | ✅ |
| A2 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 87/87 PASS | **87/87 PASS**（513ms，含新增 `REG-GRIDLOCK-01`） | ✅ |
| A3 | 音频总线核验 | `node tests/harness/verify-bus.js` | 56/56 PASS | **56/56 PASS**（零新 SFX 键，符合设计预期） | ✅ |
| A4 | 无头性能基准 | `node tests/perf/bench.js` | 五场景 PASS | **PASS**：A 0.05/0.11 · B 0.14/0.36 · C 0.27/0.65 · D 0.32/0.76 · E 0.54/1.06ms（p50/p95，帧异常 0）；draw calls 全口径中位 **290 / 876 / 1590 / 1890 / 2635** —— 与 v1.6 / v1.7 基线**逐场景一致** ⇒ **零渲染结构漂移**。已回填 `docs/architecture/perf-profile.md` §7 | ✅ |
| A5 | 版本定版核对 | 源码 `VERSION` 常量（L49） | `v1.8.0` | **`const VERSION='v1.8.0'`**（`v1.8.0-wip`→`v1.8.0`，定版刀 `c10f4a1`） | ✅ |
| A6 | 源码考古核对 | 定版提交内容指纹 | v1.8 同格锁标识符在位 | `splashGrid:true`（cabbage L1459 / corn L1474）· `if(spec.splashGrid)pr.splashGrid=true;`（L1389）· 判定双分支 `pr.splashGrid`（L1588）· `updatePlant` 数值（cabbage 20/2.0 · corn 15/2.6/0.27）**零改动** | ✅ |
| A7 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行号与定版源码一致 | **已重跑**（3291 行源码 → 19 分区 / 94 函数 / 62 常量，与 HEAD **零差异**：结构未漂移，仅 L49 内容变） | ✅ |
| A8 | 真机验收脚本 | `node tests/playtests/v18-acceptance.js` | 全 PASS | **PASS**：A 七道门 + B **17/17** + C **16/16**（13.5s） | ✅ |
| A9 | 契约回归（同格锁） | `node tests/harness/run-all.js`（含 `REG-GRIDLOCK-01`） | 全绿 | **`REG-GRIDLOCK-01` 八节全绿**（同格溅 8/6 + 不定身 / ★邻格 0 / 邻排 0 / melon·icemelon 跨格 + 减速 / 格边 ±2px 硬分界 / 老弹体兼容 / 发射侧字段存在性） | ✅ |

> 注：A4 为本机 i5-12500 口径（v1.6 / v1.7 基线同为该机）。bench 为无头乐观下限（不做光栅化/文本布局），draw call 结构量可信。无头口径局限照旧披露。本版帧耗时列较 v1.7 略高（机器负载波动），p95 仍占 1%–6% 帧预算。

## B. 真机人工验收

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | v1.8 真机验收（`v18-acceptance.js` · 端口 9355） | ✅ **PASS**（A 七道门 + B 17/17 + C 16/16） | Edge headless=new + CDP；三路结构。**B 同格锁核心**：★ C@425 同排邻格（`\|Δx\|=25 < 30` 旧带内）**0 伤** · A 直中 20 + B 同格溅 8 且 `B.freezeT=0` · 邻排 0 伤 · corn 邻格 0 伤 / 同格溅 6 不定身 · melon·icemelon 跨格照溅 35.75（icemelon 溅射减速）· 同格溅射确定性 12/12 · 黄油 N=4000 占比 26.15% / `freezeT=3.0` 三停 / 到期恢复 · 视觉证据两帧（爆点像素 190,193,148） |
| B2 | R9-a 口径端到端（`v18-acceptance.js` C 路） | ✅ **PASS 16/16** | 三指标受控场景 cov=0.3555 / refreshWaste=2.6166s / denialPx=1456.54；**溢杀分栏 direct 非空真**（raw=420，防假绿缺陷回归防线）；哨兵双域判别力完整（v1.6 域 PASS + v1.7 域 FAIL，B 域 wastePerRefresh=0.426≈T*−cd）；已知样本 eff=5/ovf=3 归位 |
| B3 | **判别力自证**（防凑绿） | ✅ | `git show c379872:plants-vs-zombies.html` 取 v1.7 旧源 → ① `REG-GRIDLOCK-01` 首红（§3 邻格位，旧带状几何必溅）② v18 自证臂：cabbage 邻格 **8 → 0**、melon 两源同 35.75 **逐字节不变** ⇒ 同格锁断言具**真实判别力** |
| B4 | 用户 Go/No-Go | ✅ Go | 2026-09-23 用户指令执行定版刀（v1.8 最后一棒） |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v1.8.html` | ✅ 已导出（2026-09-23，`git show c10f4a1` Node Buffer 直通逐字节，LF 口径，双口径核验一致） |
| C2 | `RELEASE-NOTES.md` 定稿 v1.0 | ✅ |
| C3 | `KNOWN-ISSUES.md` 定稿 v1.0（含优化池核对固定节） | ✅ |
| C4 | `RELEASE-CHECKLIST.md`（本文件） | ✅ |
| C5 | `v1.8.0` 标签 | ⏳ 待用户授权：**轻量标签** `v1.8.0` @ 发布包提交，须 `git push origin v1.8.0` **显式推送**（`--follow-tags` 推不动轻量标签的坑按惯例规避） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至上一下线点 = 恢复 `production/release/v1.7/artifacts/plants-vs-zombies.v1.7.html` 冻结副本对外分发；仓库侧以 `v1.7.0` 标签（发布包 `988b69f`）重建分发链。
- 本版回滚粒度友好：同格锁 = **新增字段 + 双分支判定**，回退 = 移除 `fireArcProjectile` 的 `splashGrid` 透传（L1389）+ cabbage / corn 调用点两处标记（L1459 / L1474）即回到 v1.7 带状几何；`updatePlant` 全部数值与 `fireArcProjectile` 弹道解算**未动**（数值层零回滚风险）。
- 冻结产物（v1.0.0 / v1.1 / v1.2 / v1.2.1 / v1.3 / v1.4 / v1.5 / v1.6 / v1.7 / v1.8）均只读，任何热修必须走新版本流程，禁止原地改冻结副本。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v1.8/artifacts/plants-vs-zombies.v1.8.html` |
| 导出方式 | `git show c10f4a1:plants-vs-zombies.html` —— **Node Buffer 直通**导出（LF，只读；未经文本读写，杜绝 CRLF 转换污染；对象库级校验，导出零失真） |
| 行数 | 3291（LF 口径） |
| 字节数 | **163,493**（LF 口径，冻结副本权威口径） |
| LF SHA-256 | `889c0cb066145620de6b96064dced3ff34c8897ebaeeebfc54a2458a6f08804f`（与 `git show c10f4a1:plants-vs-zombies.html \| sha256sum` 输出**逐字节一致**，已核验；导出文件 `sha256` 亦一致，且 `hasCR=false`、`Buffer.compare(blob, disk)===0`） |
| 冻结副本内版本标识 | L49 `const VERSION='v1.8.0';   // v1.8 定版（溅射同格锁 cabbage/corn · REG-GRIDLOCK-01 契约 · R7/R9-a/R9-b 测量；见 production/v1.8-plan.md 与 v1.8-decisions.md）` |
| 历史冻结指纹（只读基线） | v1.0.0 `713a9441…b1030deb` · v1.1 `29bc5a36…9de7d6f1` · v1.5 `4dcf8921…de2e0` · v1.6 `4c386eae…db0989` · v1.7 `5ff52d2b…14f6`（162,685 B / 3289 行） |

> 校验命令（LF 权威口径，**勿直接 `sha256sum` 工作区文件**，会因 CRLF 虚警）：
> ```
> git show c10f4a1:plants-vs-zombies.html | sha256sum
> # 期望：889c0cb066145620de6b96064dced3ff34c8897ebaeeebfc54a2458a6f08804f
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控复跑 | ✅（A1–A4；bench 回填与 code-map 重跑已随定版刀 `c10f4a1` 提交） |
| G2 真机验收 | ✅（B1 A/B/C 全 PASS + B3 判别力自证，B4 用户 Go） |
| G3 冻结副本 + 完整性 | ✅（§E，双口径一致 + 无 CR） |
| G4 发布签字 | ⏳ **推送 / 打标待用户单独授权**（v1.5 / v1.6 / v1.7 治理惯例保留） |

**判定：✅ 技术门 PASS——内容定稿；远端推送动作待授权。**

## G. 挂起项（发布后动作 · 均须用户授权）

| # | 项 | 状态 |
|---|---|---|
| 1 | `v1.8.0` 轻量标签 + main 推送远端 | ⏳ 待授权。推送前先探测通路（公司机 = PortableGit `helper-selector` 抢跑 GCM 的坑已有隔离配方；直连 / 代理按端口探测结果选）；`git push origin v1.8.0` 显式推标签；推后 `git ls-remote` 双确认 |
| 2 | **GRID 投影式是否采纳进正式口径** | ⏳ **待用户拍板**（技术侧建议采纳：全表最优 χ²=8.05 / R²=0.9875 + 零拟合参数 + 两域退化自洽；maxAbs 2.1pp 未过 2pp 判据，故以「建议 + 超差标注」身份进文档） |
| 3 | R8 多 corn 实战布防 | ⏳ 已砍除（用户裁决），M6 受控基线留档，未来可低成本重启 |
| 4 | 真实对局同格堆叠频率 playtest 采样 | ⏳ 建议（非阻塞）——R7 为受控注入采样，真实对局堆叠频率未采集 |
| 5 | 整局 playthrough / 非 Chromium 浏览器 | ⏳ 已披露（继承 v1.5–v1.7，均非阻塞） |
| 6 | 溅射「有效 DPS」叙事口径 | ⏳ 建议（非阻塞）——R7 画像预警：溢杀口径系统性低估战略浪费，未来叙事宜用有效 DPS 口径而非命中率 |
