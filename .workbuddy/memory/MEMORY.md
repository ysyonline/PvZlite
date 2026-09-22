# PvZ Lite · 项目长期记忆（精简版；细节以 .workbuddy/memory/ 日志与 production/ 文档为准）

## 铁律
- 纯前端单文件 plants-vs-zombies.html，零依赖零构建仅 PC；规模看 docs/code-map.md 头部（别写死行数）
- code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`；禁同文件并行 Edit；无用户许可不 Write/Edit/commit；冻结产物只读
- 轻量标签须显式 `git push origin <tag>`；N-13 多语言/N-14 移动端冻结至 x.0.0

## 版本线
v1.5（`56b8d25`）→ v1.6.0（定版 `0b969d5`，tag v1.6 ✅）→ **v1.7.0 已发布**（源码权威 `c379872`，发布包 `988b69f`，main=`5c691dd`，tag v1.7.0 已推 ✅）
★ v1.7.0 冻结指纹（LF）：`5ff52d2b…14f6` / 162,685 B / 3289 行（历史指纹在日志）

## 当前状态（09-22 21:2x · Administrator 家庭机）
- **v1.8.0 施工中**（团队 pvz-v18-ede6；总裁决 = production/v1.8-decisions.md）：①同格锁 ✅ ②契约同步 ✅（REG-GRIDLOCK-01 八节 + v17-acc 7/7）③R9-a 底座 ✅（tests/playtests/lib/ 四件，哨兵双域判别力完整）——**均未提交，工作树等用户点头**；排队：R7 采样 → R9-b 标定 → 验收发布
- v1.8 范围：①cabbage/corn 溅射同格锁（melon/icemelon 维持 55px 带零改动）②R9 口径修正 a→b ③R7 新规则采样 ④R8 砍除 ⑤共享 prelude 模块
- 同格定案：`colOf(z2.x)===colOf(pr.x) && 同排`，colOf=floor((x−55)/90)，锚点=pr.x 结算当刻；弹体字段 **splashGrid**；**禁命名 sameCell**（土豆雷撞名）；禁欧氏距离（CELL_H=104）
- R9-a 口径要点：三指标 freezeCoverage/refreshWaste/denialPx 全事件账本零代数假设；哨兵判据锚定确定性事件（A 域刷新恒 0 / B 域每刷新浪费≈T−cd=0.4s），dev/residual 仅信息项（有限窗口边界效应 ±2~5pp 淹没 ~1.1pp 恒等式信号）；溢杀 clamp eff=min(max(hp@结算,0),dmg)，rate 仅真实行程臂

## 门控基线（改源码后必须全绿）
烟雾 29/29 · 回归 **87/87**（v1.8 起 +REG-GRIDLOCK-01）· 总线 56/56 · bench 五场景 PASS；判级异常先看 DC 结构量，不动=噪声复跑

## 环境与命令
- Node 本机：`C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2/node.exe`（裸 node 不在 PATH）；Bash 前缀 export PATH + unset 代理
- 推送（origin=HTTPS github.com/ysyonline/PvZlite.git，GCM 已存 ysyonline）：★先判加速器（bludcloud）死活——7890 返 502/EOF=内核活上游死（人工换节点）；7890 拒连/只剩 FIN_WAIT_2=内核死（TUN 消失，直连可用）。三连诊断：curl -x :7890 / netstat :7890 / Get-Process blud*。代理配方 `git -c http.https://github.com.proxy=http://127.0.0.1:7890 push`；直连配方非永真式。收尾：push main + 显式推 tag → HTTPS 匿名 ls-remote 双确认
- SSH 下 ls-remote 读 ~/.ssh 被沙箱拦 → HTTPS 匿名；换机核验用 `git show <c>:file | sha256sum`（工作区直接算因 CRLF 虚警）；冻结副本 Buffer 直通导出

## 关键坑与方法论（浓缩）
- ★ 用户陈述句先问「要改还是要锁」（v1.8 两轮返工）；口述需求必先核实现状；用户规则>设计常规（R1 判例：数据建议不否决主观体验，冲突以用户拍板为准）
- ★ 平衡脚本计数口径含隐含前提，参数一改即失效（T>cd 后偏差 −28.3%）⇒ 调参同步审口径；契约漂移因脚本跑不了而潜伏 ⇒ 验收脚本需可运行性门控
- ★ CDP 截图前冻结 raf（paused+drawPause）防假同帧；像素判据用主体色系（如 g>r+20&&g>b+20）
- 已推送的不得 amend；提交后必看 `git show --stat`；[ahead]/[gone] 假象以 ls-remote 实测为准
- 复跑 v15/v16/v17-acceptance 会脏工作树（重写 results/png）→ `git checkout --` 还原；受控构造：弹体 x=400 时僵尸放 435（|Δx|=35<42 命中窗）
- Bash 对本机 Edge 子进程 stdout 不回传 → 重定向 >log 再 Read，以 *-results.json 为权威；CARDS cd:6=卡冷却 ≠ p.cd=2.6；命中后同 tick 已递减，断言区间式
- harness：URLSearchParams 已注入；顶层 function 经 sb.<name> 直达、const 不挂；setLevel 键 1-5（屋顶=5），startGame 不重置关卡须显式复位；推帧 g.__updateRaw(dt)；判别力自证 = 旧源复跑必红
- 注释同步连版本标签一起改（grep v1\.x 通扫）；端口：v15/16=9352 · arc=9353 · v17=9354 · v1.8 新脚本=9355+
- 团队：先 TeamCreate 再 spawn；中断后口头进度不可信，接手先实证落盘；「不要动」边界须先请示再动
