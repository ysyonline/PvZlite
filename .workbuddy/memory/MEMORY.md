# PvZ Lite · 项目长期记忆（精简版；细节查 .workbuddy/memory/ 日志、production/ 与 design/ 文档）

## 铁律
- 纯前端单文件 plants-vs-zombies.html，零依赖零构建仅 PC；规模看 docs/code-map.md 头部（别写死行数）
- code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`；禁同文件并行 Edit；无用户许可不 Write/Edit/commit；冻结产物只读
- 轻量标签须显式 `git push origin <tag>`；已推送不得 amend；N-13 多语言/N-14 移动端冻结至 v2.0 复核

## 版本线与指纹
v1.5 → v1.6.0（tag v1.6）→ v1.7.0（`5ff52d2b…14f6`/162,685B/3289行）→ v1.8.0（`889c0cb0…804f`/163,493B/3291行）→ **v1.9.0 已发·全链路闭环**（源码权威 `8963ff1`，发布包 `c893120`，tag v1.9.0 已推；LF SHA-256 `213929e6…d868`/164,063B/3289行）→ **v2.0.0 已发·全链路闭环（09-24）**（源码权威 `b22debe`，发布包 `2a8c38e`，tag v2.0.0@`4846dcc` 已推；LF SHA-256 `e8cb90b3…edbb0`/190,847B/3618 行）→ **v2.0.1 已发·全链路闭环（09-24 晚班·家庭机）**（源码权威 `e62209e`，发布包 `8480668`，tag v2.0.1@`8480668` 已推；LF SHA-256 `371d07d0…5eeef`/191,131B/3618 行）
- v2.0 已落地：T-101 只读盘点 / T-102 关卡注册表换键（WORLD_THEMES 4 世界+5 锚点、materializeLevels 40 键、legacyKey shim）/ T-104b levelNo 退役+锚点数组驱动 / T-103+T-105 存档v2（pvz_progress_v2 cleared 集合+五态幂等迁移）+奖励表（CARD_AWARD 40 键、CLEAR_REWARD per10→worldClear）/ **T-106 M1 收尾门控 ✅（`db3c985`，原开发机 23:0x）：16 个数字键门控用例断言迁移 + REG-CLEAR/SLOT/POINT/META/TESTMODE 契约重写（worldClear/新发卡序列/pvz_progress_v2 九键/hard:1-6）+ harness 补 computeClearReward(worldKey) 透传与 setSaveCleared + bench levelKey 寻址 + v20-harness-compat 复核基线改版（[A]对 v2 源/[B]钉 v1.9.0 冻结 c893120 配对）；四门控+v20 五脚本全绿。M1 闭环** → **M2 进行中（09-24 原开发机）：T-201 MENU_BTN/SELECT_GEOM 共享几何（code-map 欠账补刷 3443 行）+ T-202 state 增 select（v20-state-select 11/11）+ T-203 主菜单重绘（纯静态 Q-1=A；v20-menu-verify CDP 9363 新旧源判别 PASS）✅ 四刀本地未推送（30966bc/b51c6dd/c5da641/d41a8cf）；第五批拍板 Q-17 难度入口=选关页顶部 / Q-18 点关后先进 deck；源码 3394 行；下一单元 T-204 选关页绘制（旧菜单操作提示文案须由选关页承接）** → **T-204 选关页绘制 ✅（`03f85f6`，09-24 06:2x）：drawSelect 四页签/难度行/40 格三态（可玩绿·已通关暗金✓·锁定暗·占位灰敬请期待，CARD_AWARD 真卡判定与可玩性解耦）/返回钮；selTab 进页=levelKey 世界钳 1..4；v20-select-draw 六判据 PASS+旧源语义必红；源码 3482 行/73 常量；5 刀未推送；下一单元 T-205 选关页命中（页签/难度/点关→deck→开局/占位 toast/返回，v20-menu-nav.js）** → **T-205 选关页命中 ✅（`38fb9df`，09-24 06:5x）：onClickSelect 四分支（占位 toast/锁定 deny/可玩→deck Q-18/返回 menu）+deck 回程改 select；harness probe 增 selTab/toastMsg；v20-menu-nav 20 判据 PASS；★判别力警报=loadGame 位置参数被静默忽略致旧源假绿，改({htmlPath})后 15 红——跨源对照首跑必须先验旧源红；源码 3516 行；下一单元 T-206 M2 收尾门控（run-gates 批量+v20 五脚本+截图归档）** → **T-206 M2 终门 ✅（`9433181`，09-24 07:0x）→ M2 里程碑闭环：SMOKE-023 B8 契约迁移（旧菜单四钮直点关退役→Q-17/Q-18 链路：菜单钮→select 页签 uiClick/重复点不发声/锁定 deny/可玩格 uiClick 进 deck；教训=页签测试污染世界上下文，格子断言前必须切回页签 1）+menu-verify 结构判据改版+png 三截图归档；四门控全绿（FULL 87/87·BUS 56/56·BENCH PASS）；bench 回填=机器噪声（i3 低配）draw calls 一致无漂移已还原；CRLF 警告甄别=node 精确 CR 计数为准（od 误报）；源码 3516 行未动** → **M3 进行中（09-24 公司机）：pull 同步 M2（`d863808`）后 T-301 结算屏接新导航 ✅（`a1b2f1c`+`aa716fa`）：下一关同世界 w-(l+1)+世界末关隐藏+占位拦截先于解锁检查（Q-12 防模板局直开）+返回/空格回 select；SMOKE-001 契约迁移 end→select；顺手迁 v20-levelkey-switch §C 陈旧断言（HEAD 即红的 M2 漏迁，c4 selTab 污染再现）；v20-end-nav 19/19 旧源 8 红+v20-end-nav-ui CDP 9366 七判据旧源 S2 双红；源码 3521 行；2 刀本地未推送；下一单元 T-302 1-1 全链路联调** → **T-302 全链路联调 ✅（`6ed84de`，09-24 11:1x）：v20-fullchain-11 24 判据全绿（纯真实点击路径 menu→select→1-1→deck→play→通关→发卡→落档→重通幂等），源码 3521 行零改动=联调验证刀（T-101~T-301 框架天然贯通）；harness probe 补 toastT 桥；★toast 覆盖式单槽陷阱=无新提示时变量残留旧串但 toastT=0，正判据 toastT===0；旧源 16 红判别力；FULL 87/87 复绿；4 刀本地未推送；下一单元 T-303 M3 收尾门控** → **T-303 M3 终门 ✅（`5a25bf5`，09-24 11:2x）→ M3 里程碑闭环：run-gates 四门控全绿（FULL 87·BUS 56·BENCH PASS 2660ms）；bench DC 结构量五场景逐一对齐零漂移；源码 3521 行；6 刀未推送；下一里程碑 M4：T-401 昼夜色板查表化**
- **M4+M5 全闭环 → v2.0.0 发布（09-24 公司机）**：T-401 昼夜色板查表化+Q-11 dusk 退役 / T-402 浓雾遮罩（验收必走 `?level=2-6` 直跳，禁选关页链路）/ T-403 墓房装饰+metaFor 机制字段（grave/water/roof/graves LCG）/ T-404 奖励真机联调（reward-ui 8/8）/ T-405 M4 终门（v20 11 脚本+五态截图）/ T-501 冻结复核（N-13/N-14 维持冻结至 v3.0.0）/ T-502 版本标签通扫 / T-503 全量回归 / T-504 发布+tag 推送。★公司机推送新坑=会话注入 ALL_PROXY/all_proxy 须一并 unset + `git -c http.proxy= -c https.proxy= push`
- **v2.0.1 已发（09-24 晚班·家庭机，T-601~T-606 全闭环）**：test=1 只解「锁定」闸·占位 toast 保留——3 处 `!testMode` 前置（onClickSelect L1272 / onClickEnd L1319 / drawSelect L3441 locked 视觉）+ VERSION L61；自证 v20-test-unlock.js A 段 14/14 + 旧源 3 红（harness `loadGame({search:'?test=1'})` 走既有 location 桩零改动）；定版通扫 5 处（prelude L24/L52、v17-acc L119、v18-acc L26/L53、r9a-spec L95/L97）；门控全绿（FULL 87·BUS 56·BENCH PASS，DC 零漂移）；★新坑=会话级 spawnSync EBUSY（对任意 .exe 恒挂，异步 spawn 正常；run-gates 一键入口受阻→逐门直跑等效；git show 导出→bash 重定向或异步封装）；补丁版发布包粒度对齐 v1.2.1 先例；EBUSY 已记 v2.0.1 KNOWN-ISSUES 工具链节
- 遗留：R5 弹道手感人工复核
- **v2.1.0 施工中·M1+M2 已闭环（09-24 晚班，T-101~T-205 十刀全绿）**：内容填充版——世界 1 收尾（1-7~1-10 真波次）+ 世界 2 全 10 关开放（泳池昼/夜/雾）+ 金币体系（CARD_AWARD 三态：8 真卡/13 金币 100/19 占位；settleRun 通关前快照判首通幂等+乘 DIFFS.mult+endStats.coin 独立字段；poolFromProgress typeof 守卫防数字入卡池）；源码 3618→3884 行；可玩 6→20 关；门控全绿（FULL 87·BUS 56·BENCH PASS+v20 全系列+v21 三专项）；★安全序铁律=先 waves 后金币化；★新坑=CDP 跑前清 .tmp-v20-*、波次表 grep "==='x'?" 清恒真病灶、EBUSY env 通道 PVZ_OLD_HTML/PVZ_OLD_HARNESS；**v2.1.0 已发·全链路闭环（09-25 凌晨，原开发机 weixufeng）**：内容填充版——世界 1 收尾（1-7~1-10）+ ★**1-3/1-4/1-5 模板占位修补**（`_ANCHORS` 缺键→世界模板静默补齐致 waves 与 1-1 逐字节同；补写后 threat 5480/6300/6980、世界 1 曲线恢复严格单调）+ 世界 2 全 10 关开放（泳池昼/夜/雾；2-4 首波放软失守率 37.5%→12.5%）+ 金币体系（CARD_AWARD 三态 8 真卡/13 金币/19 占位、通关 100 金币幂等、worldClear 300）+ 选关页奖励预览行（Q-3）；可玩 6→20 关；源码 3618→3944 行；提交链 `556876f`/`b4dab8f`/`a3ca5f6`，**tag v2.1.0@a3ca5f6 已推**；LF SHA-256 `38a335df…1a3b`/213,599B/3944 行；**M3 全程机制代码零改动**（仅 _ANCHORS +3 条目 + 2-4 首波 −1 fast + 奖励行 +13 行 + VERSION）；★新坑=**锚点缺键静默模板化**（不报错、关卡可玩但内容=模板关，唯难度画像可发现 ⇒ 改锚点必断言 waves≠模板关）+ 派单「目标数值/操作方案」须二选一 + bot 读数异常先怀疑校准（贪婪策略 80 局全败）；★原开发机推送配方复核有效=`git -c "http.https://github.com.proxy=" push`（默认走 127.0.0.1 代理不通，绕代理直连可）；规划 production/v2.1-plan.md 全 ✅；**v2.1.1 消缺补丁已提交未推送（09-25，`5eeab99`）**：地瓜爆炸无差别秒杀——explodeMine 去掉 DMG=500 耐久结算，命中即 killZombie（铁桶 560/hard×1.35/expert×1.80 下 HP>500 炸不死缺陷）；新增 REG-MINE-03 锁定高HP秒杀+旧源必红判别力；VERSION→v2.1.1+定版刀通扫；门控 FULL 88/88·BUS 56/56·BENCH PASS；★run-gates spawnSync EBUSY 原开发机也中招→逐门直跑等效；v2.2 候选=世界 3/4 开放 + 墓碑机制 + 金币留存钩子

## 门控（里程碑才跑，任务单元收尾不跑）
`node tests/harness/run-gates.js` 一键 FULL+BUS+BENCH（≈2s，--quick 跳 bench）：烟雾 29/29 · 全量 87/87（SMOKE29+REG58；纯 REG 单跑 run-all.js=58/58）· 总线 56/56 · bench 五场景 PASS。判级异常先看 DC 结构量，不动=噪声复跑。单元自证只跑自带 v20-*.js。bench 回填脏 perf-profile 属预期→无漂移 checkout 还原。

## 环境与命令
- Bash 每命令开头：`export PATH="/usr/bin:/bin:/mingw64/bin:/c/Windows/System32:/c/Windows"; unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY`
- **三机 Node/推送通路不同，换机先 `git remote -v`+`ls-remote` 判定**：
  · 原开发机 weixufeng：Node `C:\Users\weixufeng\.workbuddy\binaries\node\versions\22.22.2-3\node.exe`；origin=HTTPS，推送配方 `git -c "http.https://github.com.proxy=" push`（绕漂移的 7892 代理）；直连不通开加速器
  · 家庭机 Administrator：Node `C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2-3/node.exe`（★实际目录带 -3 后缀，勿写死 22.22.2）；origin=SSH 直推 `GIT_SSH_COMMAND="ssh -o BatchMode=yes" git push`；HTTPS+GCM 被沙箱拦 ~/.ssh 勿走
  · 公司机 user3667：HTTPS+GCM 直连秒回；★09-24 新坑：WorkBuddy 会话注入的 ALL_PROXY/all_proxy 会让 git 报 `over proxy 127.0.0.1` 挂连（git config 查无代理），配方=`unset ALL_PROXY all_proxy` + `git -c http.proxy= -c https.proxy= push`
- 换机核验：`git show <c>:plants-vs-zombies.html | sha256sum`（工作区直算因 CRLF 虚警）；冻结副本 Node Buffer 直通导出

## 关键坑（浓缩）
- ★ 会话级 spawnSync EBUSY（家庭机 09-24 首遇）：同步 spawn 对任意 .exe 恒挂复跑无效，异步 spawn 正常；先切异步验证定性，勿重试；run-gates 受阻→按其源码清单逐门直跑等效
- ★ 中断恢复（跳闸/会话断）先查状态再续跑：上条命令可能部分成功（如 tag 已打），续跑报 already exists 时 rev-parse+ls-remote 判指向，指向正确直接续，已推送才禁 amend
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
