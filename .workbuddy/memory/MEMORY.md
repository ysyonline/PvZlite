# PvZ Lite · 项目长期记忆（精简版；细节以 .workbuddy/memory/ 日志与 production/ 文档为准）

## 铁律
- 纯前端单文件 plants-vs-zombies.html，零依赖零构建仅 PC；规模看 docs/code-map.md 头部（别写死行数）
- code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`；禁同文件并行 Edit；无用户许可不 Write/Edit/commit；冻结产物只读
- 轻量标签须显式 `git push origin <tag>`；N-13 多语言/N-14 移动端冻结至 x.0.0

## 版本线
v1.5（`56b8d25`）→ v1.6.0（定版 `0b969d5`，tag v1.6 ✅）→ **v1.7.0 已发布**（源码权威 `c379872`，发布包 `988b69f`，main=`5c691dd`，tag v1.7.0 已推 ✅）
★ v1.7.0 冻结指纹（LF）：`5ff52d2b…14f6` / 162,685 B / 3289 行（历史指纹在日志）

## 当前状态（09-22 22:2x · Administrator 家庭机 · 已推送归档）
- **v1.8 前半程闭环已推送 ✅**：提交链 `6821894`（feat：同格锁源码+契约同步+REG-GRIDLOCK-01）→ `f844e41`（test：lib/ 四件 R9-a 底座）→ `874b110`/`2ba0094`（memory 归档）；**远端 main=2ba0094 双确认，工作树干净**；源码 L49 仍 `v1.8.0-wip`（未定版）；总裁决 = production/v1.8-decisions.md
- v1.8 范围：①cabbage/corn 溅射同格锁 ✅ ②契约同步 ✅（REG-GRIDLOCK-01 八节 + v17-acc 7/7）③R9-a 底座 ✅（tests/playtests/lib/，哨兵双域判别力完整）④R8 砍除；**待做：R7 采样（用 prelude，makeHitClassifier 值从 preconditions.measured 推导勿硬编码）→ R9-b 理论标定 → v18-acceptance + 定版发布**（真机端口 9355+）
- 同格定案：`colOf(z2.x)===colOf(pr.x) && 同排`，colOf=floor((x−55)/90)，锚点=pr.x 结算当刻；弹体字段 **splashGrid**；**禁命名 sameCell**（土豆雷撞名）；禁欧氏距离（CELL_H=104）
- R9-a 口径要点：三指标 freezeCoverage/refreshWaste/denialPx 全事件账本零代数假设；哨兵判据锚定确定性事件（A 域刷新恒 0 / B 域每刷新浪费≈T−cd=0.4s），dev/residual 仅信息项（有限窗口边界效应 ±2~5pp 淹没 ~1.1pp 恒等式信号）；溢杀 clamp eff=min(max(hp@结算,0),dmg)，rate 仅真实行程臂
- 同格锁契约 = 底线：REG-GRIDLOCK-01（回归 87/87）+ v17-acc 7/7，禁放宽

## 门控基线（改源码后必须全绿）
烟雾 29/29 · 回归 **87/87**（v1.8 起 +REG-GRIDLOCK-01）· 总线 56/56 · bench 五场景 PASS；判级异常先看 DC 结构量，不动=噪声复跑

## 环境与命令
- Node 本机：`C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2/node.exe`（裸 node 不在 PATH）；Bash 前缀 export PATH + unset 代理
- ★ 推送（本机 Administrator 家庭机 origin=**SSH** git@github.com:ysyonline/PvZlite.git，**SSH 直推可用**）：`GIT_SSH_COMMAND="ssh -o BatchMode=yes -o ConnectTimeout=15" git push origin main`；核验 `git ls-remote origin refs/heads/main`（偶发段错误，重试即过）。HTTPS+GCM 通路被沙箱拦 ~/.ssh 且用户拒 ⇒ 本机别走。前开发机经验（加速器判活判死/代理配方）仍适用于公司机；轻量标签显式 `git push origin <tag>`
- 换机核验用 `git show <c>:file | sha256sum`（工作区直接算因 CRLF 虚警）；冻结副本 Buffer 直通导出

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
