# PvZ Lite · 项目长期记忆（精简版；细节查 .workbuddy/memory/ 日志、production/ 与 design/ 文档）

## 铁律
- 纯前端单文件 plants-vs-zombies.html，零依赖零构建仅 PC；规模看 docs/code-map.md 头部（别写死行数）
- code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`；禁同文件并行 Edit；无用户许可不 Write/Edit/commit；冻结产物只读
- 轻量标签须显式 `git push origin <tag>`；已推送不得 amend；N-13 多语言/N-14 移动端冻结至 v2.0 复核

## 版本线与指纹
v1.5 → v1.6.0（tag v1.6）→ v1.7.0（`5ff52d2b…14f6`/162,685B/3289行）→ v1.8.0（`889c0cb0…804f`/163,493B/3291行）→ **v1.9.0 已发·全链路闭环**（源码权威 `8963ff1`，发布包 `c893120`，tag v1.9.0 已推；LF SHA-256 `213929e6…d868`/164,063B/3289行）→ **v2.0.0 开发中**
- v2.0 已落地：T-101 只读盘点 / T-102 关卡注册表换键（WORLD_THEMES 4 世界+5 锚点、materializeLevels 40 键、legacyKey shim）/ T-104b levelNo 退役+锚点数组驱动 / T-103+T-105 存档v2（pvz_progress_v2 cleared 集合+五态幂等迁移）+奖励表（CARD_AWARD 40 键、CLEAR_REWARD per10→worldClear）/ **T-106 M1 收尾门控 ✅（`db3c985`，原开发机 23:0x）：16 个数字键门控用例断言迁移 + REG-CLEAR/SLOT/POINT/META/TESTMODE 契约重写（worldClear/新发卡序列/pvz_progress_v2 九键/hard:1-6）+ harness 补 computeClearReward(worldKey) 透传与 setSaveCleared + bench levelKey 寻址 + v20-harness-compat 复核基线改版（[A]对 v2 源/[B]钉 v1.9.0 冻结 c893120 配对）；四门控+v20 五脚本全绿。M1 闭环，下一里程碑 M2（T-201 共享几何常量）**
- 遗留：R7 脚本 `v18-splash-distribution.js` 读 `e.w.kind` 复跑必红（待拍板）；R5 弹道手感人工复核

## 门控（里程碑才跑，任务单元收尾不跑）
`node tests/harness/run-gates.js` 一键 FULL+BUS+BENCH（≈2s，--quick 跳 bench）：烟雾 29/29 · 全量 87/87（SMOKE29+REG58；纯 REG 单跑 run-all.js=58/58）· 总线 56/56 · bench 五场景 PASS。判级异常先看 DC 结构量，不动=噪声复跑。单元自证只跑自带 v20-*.js。bench 回填脏 perf-profile 属预期→无漂移 checkout 还原。

## 环境与命令
- Bash 每命令开头：`export PATH="/usr/bin:/bin:/mingw64/bin:/c/Windows/System32:/c/Windows"; unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY`
- **三机 Node/推送通路不同，换机先 `git remote -v`+`ls-remote` 判定**：
  · 原开发机 weixufeng：Node `C:\Users\weixufeng\.workbuddy\binaries\node\versions\22.22.2-3\node.exe`；origin=HTTPS，推送配方 `git -c "http.https://github.com.proxy=" push`（绕漂移的 7892 代理）；直连不通开加速器
  · 家庭机 Administrator：Node `C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2/node.exe`；origin=SSH 直推 `GIT_SSH_COMMAND="ssh -o BatchMode=yes" git push`；HTTPS+GCM 被沙箱拦 ~/.ssh 勿走
  · 公司机 user3667：HTTPS+GCM 直连秒回
- 换机核验：`git show <c>:plants-vs-zombies.html | sha256sum`（工作区直算因 CRLF 虚警）；冻结副本 Node Buffer 直通导出

## 关键坑（浓缩）
- ★ 行尾：`.gitattributes`（eol=lf）已根除 CRLF 污染；历史判据=git show --stat 行数 vs diff --numstat vs index 版 CR 计数
- ★ 定版刀=版本标签通扫（验收脚本/规格的活默认值如 PVZ_EXPECT_VER 也要改），历史文档保持原貌；顺序=先提交定版刀再跑验收
- ★ UI 几何禁两处硬编码（draw 与 hit 抽共享常量）；改 UI 后真机截图+像素判据+旧源对照
- ★ 用户陈述句先问「要改还是要锁」；用户规则>设计常规；平衡脚本口径随参数同步审
- 复跑 v15~v17-acceptance 脏工作树（重写 results/png）→ checkout 还原；弹体 x=400 时僵尸放 435（|Δx|=35<42 命中窗）
- harness：URLSearchParams 已注入；顶层 function 经 sb.<name> 直达、const 不挂；setLevel 键 1-5（屋顶=5），startGame 不重置关卡；推帧 g.__updateRaw(dt)；判别力自证=旧源复跑必红；Edge 子进程 stdout 不回传→重定向后 Read，以 *-results.json 为权威；CARDS cd=卡冷却 ≠ p.cd=射击间隔
- [ahead]/[gone] 假象以 ls-remote 实测；提交后必看 git show --stat 防卷带

## 任务拆分硬规则（2026-09-23）
大版本禁半天级大任务：拆 0.5~1.5h 任务单元，独立 DONE 判据、一刀一提交、收尾落盘；里程碑只分组；首任务=纯只读盘点

## 测量侧沉淀（v1.8，详见 production/v18-r7-report.md 与 design/butter-balance-calibration-v18.md）
同格锁契约=`colOf(z2.x)===colOf(pr.x) && 同排`（colOf=floor((x−55)/90)，锚点=pr.x 结算当刻），弹体字段 splashGrid，禁 sameCell 命名/欧氏距离；GRID 修正式采纳（T>cd 域 2.1pp）；R7 同格堆叠确定性 P=1.0；R9-b T≤cd/T>cd 两域硬边界；prelude 指纹剔易变量+selftest 非零正样本
