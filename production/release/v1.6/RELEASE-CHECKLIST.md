# PvZ Lite v1.6 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-22：技术门 G1–G3 全绿 + 冻结副本导出校验 + 两轮真机验收 PASS → 发布定稿；G4 推送/打标待用户授权）。
> **版本**：v1.6.0 ｜ **发布日期**：2026-09-22 ｜ **产物**：`plants-vs-zombies.html`（单文件，3289 行 / 162,594 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-22 09:1x（+0800），定版刀 `0b969d5` 提交前工作树（源码内容与定版刀一致，仅 VERSION 注释行差异已在 A5 单独复跑烟雾覆盖），解释器 Node v22.22.2（managed，绝对路径调用）。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 烟雾测试 | `node tests/harness/run-smoke.js` | 29/29 PASS | **29/29 PASS**（187ms；定版刀后复跑 155ms） | ✅ |
| A2 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 86/86 PASS | **86/86 PASS**（385ms；v1.6 起 +REG-FREEZE-01 / +REG-THROW-01 / +REG-TESTMODE-01） | ✅ |
| A3 | 音频总线核验 | `node tests/harness/verify-bus.js` | 56/56 PASS | **56/56 PASS** | ✅ |
| A4 | 无头性能基准 | `node tests/perf/bench.js` | 五场景 PASS | **PASS**：A p50 0.05/p95 0.10 · B 0.13/0.25 · C 0.25/0.53 · D 0.32/0.71 · E 0.49/0.94ms（帧异常 0；draw calls 全口径中位 290/876/1590/1890/2627——与 v1.5 完全一致，本刀零渲染结构漂移）。本机 i5-12500 口径，已回填 `docs/architecture/perf-profile.md` §7 | ✅ |
| A5 | 版本定版核对 | 源码 `VERSION` 常量（L49） | `v1.6.0` | **`const VERSION='v1.6.0'`**（`v1.6.0-wip`→`v1.6.0`，定版刀 `0b969d5`） | ✅ |
| A6 | 源码考古核对 | 定版提交内容指纹 | v1.6 五刀标识符在位 | `fireArcProjectile`（L1372）· `CABBAGE_VX=260, CABBAGE_G=500`（L42）· `pr.vy!==undefined` 积分判定（L1546/L1570）· `atan2` 倾角（L2695 等 5 处）· `slopeWall` 三判据 · `applyFreeze`/`freezeT=2.5` · `saveMeta` 首行 testMode 守卫 · `pvz_unlocked`/`pvz_highscore`/`pvz_muted` 独立守卫指纹全在位 | ✅ |
| A7 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行号与定版源码一致 | **已重跑**（3289 行源码 → 19 分区 / 94 函数 / 62 常量） | ✅ |
| A8 | 真机验收脚本（V16-ACC-Q1/Q2） | `node tests/playtests/v16-acceptance.js` / `v16-throw-arc-visual.js` | 全 PASS | Q1 **14/14 PASS**（09-22 换机前已跑，results.json 在库）+ Q2 **5/5 PASS**（本机定版前补课，见 §B） | ✅ |

> 注：A4 为本机 i5-12500 复核口径（原 09-21 基线为 i3-10110U / i5-7500T 低配机）；draw call 结构量与 v1.5 基线**完全一致**（290/876/1590/1890/2627），证明 v1.6 五刀零渲染结构漂移。无头口径局限照旧披露。

## B. 真机人工验收

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | v1.6 三刀真机验收（V16-ACC-Q1 · 质量组） | ✅ **PASS 14/14** | Edge headless=new + CDP + 像素判读。A1–A3 bug1 三态衰减至 0 / B2a slopeWall 标记矩阵（含平台列 liftX 反例证据）/ B2b 撞壁不命中+对照 / B2c 投掷类免疫 / B2d 撞壁三判据（xt=505、最小飞行 30px）/ C1 corn 数值 / C2 黄油 25% / C3 定身 2.5s 三停+恢复 / C4 与 chill 独立并存 / C5 仅直中定身 / C6 黄油弹+黄油渍像素。主理人独立抽验「未改断言凑 PASS」 |
| B2 | v1.6 第4刀真机视觉验收（V16-ACC-Q2 · 定版前补课） | ✅ **PASS 5/5** | 填补「第4刀只有自动化门控、无真机验收」缺口：corn/melon/icemelon/cabbage 四弹真机弹道采样各 169 点，y 先升后降（顶点上升 154.4px / 下落 94.3px）+ 上升段 vy 恒<0 / 下落段恒>0 + 命中；西瓜弹三帧（上升/顶点/下落）截图 + 顶点帧弹体邻域绿色主体像素实证（Δ=(2,14.3)，口径内）。脚本 `tests/playtests/v16-throw-arc-visual.js` + 3 截图 + results.json |
| B3 | 用户 Go/No-Go | ✅ Go | 2026-09-22「继续」（按记忆既定路线执行定版） |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v1.6.html` | ✅ 已导出（2026-09-22，`git show 0b969d5` Node Buffer 直通逐字节，LF 口径，对象库级校验） |
| C2 | `RELEASE-NOTES.md` 定稿 v1.0 | ✅ |
| C3 | `KNOWN-ISSUES.md` 定稿 v1.0（含优化池核对固定节） | ✅ |
| C4 | `RELEASE-CHECKLIST.md`（本文件） | ✅ |
| C5 | `v1.6` 标签 | ⏳ 待用户授权：**轻量标签** `v1.6` @ `0b969d5`（= 定版刀），须 `git push origin v1.6` **显式推送**（`--follow-tags` 推不动轻量标签的坑按惯例规避） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至上一下线点 = 恢复 `production/release/v1.5/artifacts/plants-vs-zombies.v1.5.html` 冻结副本对外分发；仓库侧以 `v1.5` 标签（`56b8d25`）重建分发链。
- 冻结产物（v1.0.0 / v1.1 / v1.2 / v1.2.1 / v1.3 / v1.4 / v1.5 / v1.6）均只读，任何热修必须走新版本流程，禁止原地改冻结副本。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v1.6/artifacts/plants-vs-zombies.v1.6.html` |
| 导出方式 | `git show 0b969d5:plants-vs-zombies.html` —— **Node Buffer 直通**导出（LF，只读；未经文本读写，杜绝 CRLF 转换污染；对象库级校验，导出零失真） |
| 行数 | 3289（LF 口径） |
| 字节数 | 162,594（LF 口径，冻结副本权威口径） |
| LF SHA-256 | `4c386eaed52e0cf0a556bd2e9c11bff639a9020acd352cd7d9bec0dd64db0989`（与 `git show 0b969d5:plants-vs-zombies.html \| sha256sum` 输出**逐字节一致**，已核验） |
| 冻结副本内版本标识 | L49 `const VERSION='v1.6.0';   // v1.6 五刀定版（…）` |

> 校验命令（LF 权威口径，**勿直接 `sha256sum` 工作区文件**，会因 CRLF 虚警）：
> ```
> git show 0b969d5:plants-vs-zombies.html | sha256sum
> # 期望：4c386eaed52e0cf0a556bd2e9c11bff639a9020acd352cd7d9bec0dd64db0989
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控复跑 | ✅（A1–A4；bench 回填与 code-map 重跑已随定版刀提交） |
| G2 真机验收 | ✅（B1 14/14 + B2 5/5 PASS，B3 用户 Go） |
| G3 冻结副本 + 完整性 | ✅（§E） |
| G4 发布签字 | ⏳ **推送 / 打标待用户单独授权**（v1.5 治理惯例保留） |

**判定：✅ 技术门 PASS——内容定稿；远端推送动作待授权。**

## G. 挂起项（发布后动作 · 均须用户授权）

| # | 项 | 状态 |
|---|---|---|
| 1 | `v1.6` 轻量标签 + main 推送远端 | ⏳ 待授权。推送配方（09-22 实测有效）：`GIT_TERMINAL_PROMPT=0 git -c "http.https://github.com.proxy=" push origin main` 直连（绕过 ~/.gitconfig 漂移代理；**site-specific key 必须写全**）+ `git push origin v1.6` 显式推标签；推后 HTTPS 匿名 `git ls-remote` 双确认 |
| 2 | 本地 tag 缺失补齐 | ⚠️ 本机 `git fetch --tags` 可顺带补齐 v1.4（本次 pull 已带回 v1.5；v1.4 视远端情况确认） |
| 3 | R2 遗留：corn 黄油 2.5s 定身强度平衡复查 | ⏳ 建议（非阻塞）——黄油重做后 corn 100 阳 + 控制定位，强度曲线建议移交文策渊 |
| 4 | 测试模式文档化 | ⏳ 建议在 README 增补 `?test=1` 参数说明（非阻塞） |
| 5 | `bench.js` 独立加载器 `benchLoadGame` 未注入 `URLSearchParams` | 📌 已知（它不用 search，暂无影响）；后续如需 bench 读 URL 参数须先补注入 |
