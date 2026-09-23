# PvZ Lite v1.9 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-23：技术门 G1–G3 全绿 + 冻结副本导出校验 + 真机验收定版复跑 PASS → 发布定稿；G4 推送/打标已获用户一次性授权）。
> **版本**：v1.9.0 ｜ **发布日期**：2026-09-23 ｜ **产物**：`plants-vs-zombies.html`（单文件，3289 行 / 164,063 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-23 14:1x–14:2x（+0800），定版刀 `7d5daf6` + 回填刀 `8963ff1` 之后（源码内容与定版刀一致）。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 公司机 user3667 / i5-12500。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 烟雾测试 | `node tests/harness/run-smoke.js` | 29/29 PASS | **29/29 PASS**（141ms） | ✅ |
| A2 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 87/87 PASS | **87/87 PASS**（412ms，含 `REG-GRIDLOCK-01`） | ✅ |
| A3 | 音频总线核验 | `node tests/harness/verify-bus.js` | 56/56 PASS | **56/56 PASS**（幂等安全 / 路由完整 / 隔离生效） | ✅ |
| A4 | 无头性能基准 | `node tests/perf/bench.js` | 五场景 PASS | **PASS**（帧异常 0）；draw calls 全口径中位 **290 / 876 / 1590 / 1890 / 2635** —— 与 v1.6–v1.8 基线**逐场景一致** ⇒ **零渲染结构漂移**。已回填 `docs/architecture/perf-profile.md` §7（`8963ff1`） | ✅ |
| A5 | 版本定版核对 | 源码 `VERSION` 常量（L52） | `v1.9.0` | **`const VERSION='v1.9.0'`**（`v1.9.0-wip`→`v1.9.0`，定版刀 `7d5daf6`） | ✅ |
| A6 | 版本标签通扫核对 | grep 活文件 | 无 `v1.9.0-wip` 残留 | `plants-vs-zombies.html` / `lib/prelude.js`（缺省+注释） / `v17-acceptance.js` / `v18-acceptance.js`（缺省+注释） / `lib/r9a-metric-spec.md` 共 5 文件 9 处全部同步；`v16-acceptance.js` 缺省 `'1.6'` 为设计保留历史行为（v1.7 惯例）；历史记录（plan/decisions/报告）**保持原貌**；grep 复核 EXIT=1 零残留 | ✅ |
| A7 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行号与定版源码一致 | **已重跑，零 diff**（3289 行 → 19 分区 / 94 函数 / 63 常量，结构未漂移） | ✅ |
| A8 | 真机验收定版复跑 | `node tests/playtests/v18-acceptance.js`（日志出库，守卫生门） | 全 PASS | **总判定 PASS**：A 七道门 + B **17/17** + C **16/16**（34.2s）；版本自证对新缺省 v1.9.0 通过 ⇒ **活默认值改后实测可运行**（定版刀制度要求） | ✅ |
| A9 | 契约回归 | `node tests/playtests/v17-acceptance.js` + `run-all.js`（含 REG-GRIDLOCK-01） | 全绿 | v17 **7/7 PASS**（R-A 黄油定身 + 27% 掷定）· REG-GRIDLOCK-01 八节全绿（同格锁契约**零放宽**） | ✅ |
| A10 | UI 修复回归 | `node tests/playtests/ui-end-verify.js` | 三判据全 true | **全 true**：①按钮不压行384（按钮色<50）②彩带环已除（命中=0）③黄字可见（168>0） | ✅ |

> 注：A4 为本机 i5-12500 口径（v1.6–v1.8 基线同为该机）；bench 为无头乐观下限，draw call 结构量可信。首轮 A8 因日志写在 `tests/` 内触发卫生门 FAIL（任务外脏文件），日志移出仓库后复跑 PASS——卫生门工作正常，判据未放宽。

## B. 真机人工验收

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | v1.9 源码级变更真机回归（`v18-acceptance.js` A/B/C 三路） | ✅ **PASS** | 结算屏 UI 几何由 `ui-end-verify.js` 像素判据专责覆盖（A10）；同格锁/R9-a 口径与 v1.8 共享管线，A/B/C 全 PASS ⇒ 修复未伤及测量链 |
| B2 | UI 修复判据（`ui-end-verify.js`） | ✅ **PASS** | ①按钮色 <50（不压「历史最高分」行）②彩带环命中=0 ③行384 黄字 168>0；判别力自证已于修复刀留存（旧源：按钮色 2601 / 环 26 / 黄字 34） |
| B3 | R10/R11 判别力自证（v1.9 周期已做） | ✅ | R10：旧源 v1.7.0 same=5,cross=2 vs 新源 same=17,cross=0；R11：32 配对零结局翻转 + treat 局回归校验同种子复现 |
| B4 | 用户 Go/No-Go | ✅ Go | 2026-09-23 用户拍板「启动定版刀 + 一次性授权全流程」 |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v1.9.html` | ✅ 已导出（2026-09-23，`git show 8963ff1` Node Buffer 直通逐字节，LF 口径，双口径核验一致） |
| C2 | `RELEASE-NOTES.md` 定稿 v1.0 | ✅ |
| C3 | `KNOWN-ISSUES.md` 定稿 v1.0（含优化池核对固定节） | ✅ |
| C4 | `RELEASE-CHECKLIST.md`（本文件） | ✅ |
| C5 | `v1.9.0` 标签 | ✅ 已获授权：**轻量标签** `v1.9.0` @ 发布包提交，`git push origin v1.9.0` **显式推送**（`--follow-tags` 推不动轻量标签的坑按惯例规避） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至上一下线点 = 恢复 `production/release/v1.8/artifacts/plants-vs-zombies.v1.8.html` 冻结副本对外分发；仓库侧以 `v1.8.0` 标签（发布包 `20d33e1`）重建分发链。
- 本版回滚粒度友好：源码级变更仅结算屏 UI——回退 = 恢复 `drawEnd` / `onClickEnd` 原坐标（或删除 `END_BTN` 引用恢复旧字面量）；玩法数值层**零回滚风险**（本版未触数值）。
- 冻结产物（v1.0.0–v1.9）均只读，任何热修必须走新版本流程，禁止原地改冻结副本。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v1.9/artifacts/plants-vs-zombies.v1.9.html` |
| 导出方式 | `git show 8963ff1:plants-vs-zombies.html` —— **Node Buffer 直通**导出（LF，只读；未经文本读写，杜绝 CRLF 转换污染；对象库级校验，导出零失真） |
| 行数 | 3289（LF 口径） |
| 字节数 | **164,063**（LF 口径，冻结副本权威口径） |
| LF SHA-256 | `213929e6e82cd4b84e7de4173935c6e214e30a465778c280b5cca23fb5b4d868`（与 `git show 8963ff1:plants-vs-zombies.html \| sha256sum` 输出**逐字节一致**；导出文件 `Buffer.compare(blob, disk)===0`、`hasCR=false`） |
| 冻结副本内版本标识 | L52 `const VERSION='v1.9.0';   // v1.9 定版（收口+测量版：结算屏 UI 修复 + R10/R11 测量 + GRID 口径采纳；见 production/v1.9-plan.md）` |
| 历史冻结指纹（只读基线） | v1.5 `4dcf8921…de2e0` · v1.6 `4c386eae…db0989` · v1.7 `5ff52d2b…14f6`（162,685 B / 3289 行）· v1.8 `889c0cb0…804f`（163,493 B / 3291 行） |

> 校验命令（LF 权威口径，**勿直接 `sha256sum` 工作区文件**，会因 CRLF 虚警）：
> ```
> git show 8963ff1:plants-vs-zombies.html | sha256sum
> # 期望：213929e6e82cd4b84e7de4173935c6e214e30a465778c280b5cca23fb5b4d868
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控复跑 | ✅（A1–A4；bench 回填与 code-map 重跑零漂移，`8963ff1`） |
| G2 真机验收 | ✅（A8/A9/A10 全 PASS + B4 用户 Go） |
| G3 冻结副本 + 完整性 | ✅（§E，双口径一致 + 无 CR） |
| G4 发布签字 | ✅ 用户 2026-09-23 一次性授权（定版→验收→发布→归档→tag+push） |

**判定：✅ 技术门 PASS——内容定稿；推送/打标按授权执行。**

## G. 挂起项（发布后动作 · 均须用户授权）

| # | 项 | 状态 |
|---|---|---|
| 1 | `v1.9.0` 轻量标签 + main 推送远端 | ✅ 已授权执行完成：tag v1.9.0 @ `c893120` 显式推送；ls-remote 双确认（main=`ac7f206` / tag=`c893120`）；远端冻结副本 blob=`213929e6…d868` 与本地一致 |
| 2 | **R7 脚本修复**（`v18-splash-distribution.js` 读 `e.w.kind` 复跑必红） | ✅ **已修复（2026-09-23 14:4x 用户拍板）**：两处旧读法改双键口径（`hitKind` 分桶）；39 臂复跑 R7 PASS（32 断言全过 / unknown=0），关键数值与 v1.8 定版报告逐数对齐，同种子可复现性跨版本保持 |
| 3 | R5 弹道手感人工复核 | ⏳ 建议（非阻塞，继承 v1.6） |
| 4 | 整局 playthrough / 非 Chromium 浏览器 | ⏳ 已披露（继承 v1.5–v1.8，均非阻塞） |
| 5 | **v2.0.0 冻结复核预告** | ⏳ v1.9.0 为 v2 前最后一个次版本——N-13 多语言 / N-14 移动端冻结复核是 v2.0.0 **必过项**（v1.9-plan §3/§7） |
