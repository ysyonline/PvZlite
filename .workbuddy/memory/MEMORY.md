# PvZ Lite · 项目长期记忆（精简版；细节以 .workbuddy/memory/ 日志与 production/ 文档为准）

## 铁律
- 纯前端单文件 plants-vs-zombies.html，零依赖零构建仅 PC；规模看 docs/code-map.md 头部（别写死行数）
- code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`；禁同文件并行 Edit；无用户许可不 Write/Edit/commit；冻结产物只读
- 轻量标签须显式 `git push origin <tag>`；N-13 多语言/N-14 移动端冻结至 x.0.0

## 版本线
v1.5（`56b8d25`）→ v1.6.0（定版 `0b969d5`，tag v1.6 ✅）→ v1.7.0（源码权威 `c379872`，发布包 `988b69f`，tag v1.7.0 已推 ✅）→ v1.8.0（源码权威 `c10f4a1`，发布包 `20d33e1`，tag v1.8.0 已推 ✅）→ **v1.9.0 已发布·收口+测量版**（源码权威 `8963ff1`=定版刀 `7d5daf6`+bench 回填，发布包 `c893120` 四件套+冻结副本，tag v1.9.0 @ `c893120` 推送见签字归档）；v2.0.0 前最后次版本，N-13/N-14 复核为 v2 必过项
★ 冻结指纹（LF）：v1.7.0 `5ff52d2b…14f6` / 162,685 B / 3289 行 · v1.8.0 `889c0cb0…804f` / 163,493 B / 3291 行 · **v1.9.0 `213929e6…d868` / 164,063 B / 3289 行**（历史在日志）

## 当前状态（09-23 15:0x · 公司机 user3667 · **v1.9.0 全链路闭环并已推送，下一版=v2.0.0 立项**）
- **v1.9.0 发布签字归档（用户 14:0x 一次性授权全流程，15:0x 完成）**：推送 `e23aab3..e433087`（4 笔：定版刀 `7d5daf6`/bench 回填 `8963ff1`/发布包 `c893120`/memory `e433087`）；**轻量标签 v1.9.0 @ `c893120` 已显式推送**；ls-remote 双确认：`refs/heads/main=e433087`=本地 HEAD · `refs/tags/v1.9.0=c893120`；fetch 后无 ahead/behind；**远端冻结副本与源码 blob 均=`213929e6…d868` 与本地逐字节一致**（无 CRLF 污染）；源码 L52=`v1.9.0`
- **定版指纹**：LF SHA-256 `213929e6e82cd4b84e7de4173935c6e214e30a465778c280b5cca23fb5b4d868` / 164,063 B / 3,289 行；冻结副本 Node Buffer 直通导出（Buffer.compare=0/hasCR=false）
- **遗留待办**：①R7 脚本 `v18-splash-distribution.js` 读 `e.w.kind` 复跑必红（v1.9 KNOWN-ISSUES 新登记，待拍板修）②R5 弹道手感人工复核维持建议 ③**v2.0.0 立项时 N-13/N-14 冻结复核必过**
- **v1.9 周期三闭环**：结算屏 UI 修复 `ebf352f`（END_BTN 常量+删 26 环）· GRID 采纳 `9cc06f7`（T>cd 正式口径，2.1pp 超差事实保留）· R10 `df4b0e1`（自然堆叠机会率 1.2–4.3%，P(≥1|n≥2) 同格锁确定性保持）/R11 `72ecef6`（利用率上界 81.8/71.5/64.3% vs clamp≈0，32 对零结局翻转）
- **v1.8.0 全链路闭环并已推送**：定版刀 `c10f4a1` → 验收件 `eb961db` → 发布包 `20d33e1` → memory `282a826` → 签字归档 `0dc9faf`；tag v1.8.0 @ `20d33e1` 已推；远端冻结副本 blob=`889c0cb0…804f` 逐字节一致
- **v1.8.0 全链路闭环并已推送**：定版刀 `c10f4a1`（L49→v1.8.0 + 版本标签通扫 4 处活默认值 + code-map/bench 复核）→ 验收件 `eb961db` → 发布包 `20d33e1`（四件套 + 冻结副本）→ memory `282a826` → 发布签字归档 `0dc9faf`；**远端 main=`0dc9faf` 双确认 + 轻量标签 v1.8.0 @ `20d33e1` 已推**；远端冻结副本 blob = `889c0cb0…804f` 与本地逐字节一致；源码 L49 = `v1.8.0`
- **结算屏 UI 修复已提交（用户 10:3x 授权；版本 = 并入下一版 v1.9.0）**：`ebf352f`——按钮组 380→410 脱离「历史最高分」行（新增共享常量 `END_BTN`，drawEnd 绘制 / onClickEnd 命中共用）+ 删 26 个彩带环；四门控全绿 + 旧源判别力自证（按钮色 2601→23 / 环 26→0 / 黄字 34→168）；产物 `tests/playtests/ui-end-verify.js` 四件；**L49 已于立项刀 `f986124` 切 `v1.9.0-wip`**
- v1.8 范围全部闭环：①cabbage/corn 溅射同格锁 ✅ ②契约同步 ✅（REG-GRIDLOCK-01 八节）③R9-a 底座 ✅ ④R7 采样 ✅ ⑤R9-b 标定 ✅ ⑥prelude 假绿修复 ✅ ⑦R8 砍除 ✅
- 同格定案：`colOf(z2.x)===colOf(pr.x) && 同排`，colOf=floor((x−55)/90)，锚点=pr.x 结算当刻；弹体字段 **splashGrid**；**禁命名 sameCell**（土豆雷撞名）；禁欧氏距离（CELL_H=104）
- R9-a 口径要点：三指标 freezeCoverage/refreshWaste/denialPx 全事件账本零代数假设；哨兵判据锚定确定性事件（A 域刷新恒 0 / B 域每刷新浪费≈T−cd=0.4s）；溢杀 clamp eff=min(max(hp@结算,0),dmg)，rate 仅真实行程臂
- **GRID 投影式已裁决采纳**（Q-2=A，`9cc06f7`：T>cd 域正式口径，maxAbs 2.1pp 超差事实保留）；**R7/R9-b 结论细节见 production/v18-r7-report.md 与 design/butter-balance-calibration-v18.md**
- 同格锁契约 = 底线：REG-GRIDLOCK-01 + v17-acc 7/7，禁放宽

## 门控基线（改源码后必须全绿）
烟雾 29/29（`run-smoke.js`）· 全量 **87/87**（`run-all.js --all` = SMOKE 29 + REG 58；**纯 REG 单跑 `run-all.js` = 58/58**——口语「回归 87」指前者，勿误判脚本失效）· 总线 56/56 · bench 五场景 PASS；判级异常先看 DC 结构量，不动=噪声复跑
**★ 批量验证节流（2026-09-23 用户令）**：任务单元收尾**不跑批量门控**；只在里程碑收尾（T-106/T-206/T-303/T-405/T-503）用 `node tests/harness/run-gates.js` 一键跑完（FULL+BUS+BENCH ≈2s，--quick 跳 bench），禁逐个散跑；单元自证只跑自带 v20-*.js 专项脚本；bench 回填 perf-profile 属预期脏 → 无实质漂移即 checkout 还原；本机 Node 路径带 `-3` 后缀（`versions/22.22.2-3/node.exe`）

## 环境与命令
- Node 本机：`C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2/node.exe`（裸 node 不在 PATH）；Bash 前缀 export PATH + unset 代理
- ★ 推送（本机 Administrator 家庭机 origin=**SSH** git@github.com:ysyonline/PvZlite.git，**SSH 直推可用**）：`GIT_SSH_COMMAND="ssh -o BatchMode=yes -o ConnectTimeout=15" git push origin main`；核验 `git ls-remote origin refs/heads/main`（偶发段错误，重试即过）。HTTPS+GCM 通路被沙箱拦 ~/.ssh 且用户拒 ⇒ 本机别走。前开发机经验（加速器判活判死/代理配方）仍适用于公司机；轻量标签显式 `git push origin <tag>`
- **公司机 user3667（HTTPS 直连可用）**：origin=HTTPS + GCM 凭据，ls-remote/push 秒回（09-23 实测，无代理/SSH 需求）；**换机先 `git remote -v` + `ls-remote` 判通路再推**
- 换机核验用 `git show <c>:file | sha256sum`（工作区直接算因 CRLF 虚警）；冻结副本 Buffer 直通导出

## 关键坑与方法论（浓缩）
- ★ 用户陈述句先问「要改还是要锁」（v1.8 两轮返工）；口述需求必先核实现状；用户规则>设计常规（R1 判例：数据建议不否决主观体验，冲突以用户拍板为准）
- ★ 平衡脚本计数口径含隐含前提，参数一改即失效（T>cd 后偏差 −28.3%）⇒ 调参同步审口径；契约漂移因脚本跑不了而潜伏 ⇒ 验收脚本需可运行性门控
- ★ CDP 截图前冻结 raf（paused+drawPause）防假同帧；像素判据用主体色系（如 g>r+20&&g>b+20）
- 已推送的不得 amend；提交后必看 `git show --stat`；[ahead]/[gone] 假象以 ls-remote 实测为准（`[gone]` 先查 `refs/remotes/` 是否为空 ⇒ 空则 `git fetch origin` 即恢复）
- ★ **行尾污染（CRLF，09-23 实测踩中）**：本机 `core.autocrlf=true`（系统级）⇒ git 检出的文件磁盘为 CRLF；项目惯用的 `git add -c core.autocrlf=false` **绕过 CRLF→LF 规范化** ⇒ 整文件 CRLF 入库（`git show --stat` 假报 6580 行 + blob 指纹从 `889c0cb0` 变 `11509011`）。**提交前确认「磁盘行尾 == 仓库既有行尾」，不一致先规范化磁盘**；判据三连 = `git show --stat` 行数 vs `git diff --numstat` / `git show HEAD:file | wc -c` + CR 计数 / `git show :file`（index 版）。**已由 `.gitattributes`（`* text=auto eol=lf`，`f20057e`）根除**——属性优先级高于 `core.autocrlf`，不再依赖提交命令写法；skill: `git-lineending-blob-pollution`
- 复跑 v15/v16/v17-acceptance 会脏工作树（重写 results/png）→ `git checkout --` 还原；受控构造：弹体 x=400 时僵尸放 435（|Δx|=35<42 命中窗）
- Bash 对本机 Edge 子进程 stdout 不回传 → 重定向 >log 再 Read，以 *-results.json 为权威；CARDS cd:6=卡冷却 ≠ p.cd=2.6；命中后同 tick 已递减，断言区间式
- harness：URLSearchParams 已注入；顶层 function 经 sb.<name> 直达、const 不挂；setLevel 键 1-5（屋顶=5），startGame 不重置关卡须显式复位；推帧 g.__updateRaw(dt)；判别力自证 = 旧源复跑必红
- 注释同步连版本标签一起改（grep v1\.x 通扫）；端口：v15/16=9352 · arc=9353 · v17=9354 · v1.8 新脚本=9355+
- ★ **定版刀 = 版本标签通扫**（不止改 L49）：验收脚本/规格文档的**活默认值**（如 `PVZ_EXPECT_VER` 缺省）不同步 ⇒ 定版后复跑假红（`indexOf` 判定必不匹配）；历史记录（plan/decisions/报告）**保持原貌**；改后须**实测验证可运行**。顺序 = **先提交定版刀再跑验收**（否则「跑后工作树卫生」项必红）
- ★ 假绿两形态须封死：①恒等式空真（0=0 恒真）②分类值覆盖键（对象字面量重复键）⇒ 自检断言用**非零正样本** + 独立验证器；口径换用必须换并集公式（互斥 vs 重叠）
- ★ **UI 几何禁两处硬编码**：同一矩形在绘制（drawEnd）与命中（onClickEnd）各自写死坐标 ⇒ 必漂移（结算屏「按钮压字」即此因，v1.9.0 修复）⇒ 抽共享常量；改 UI 后必须**真机截图 + 像素判据自证**（按钮色数 / 装饰环采样 / 文字像素数）**并做旧源对照**（旧源必红）；页面内构造结算态用 `levelNo/level/wave` 等顶层变量直赋，**harness 的 setLevel/setUnlocked 只是包装，源码无同名函数**
- 团队：先 TeamCreate 再 spawn；中断后口头进度不可信，接手先实证落盘；「不要动」边界须先请示再动

## ★ 任务拆分硬规则（2026-09-23 用户要求，已入用户级长期记忆）
- 大版本/大需求**禁止半天级大任务**：拆为任务单元，每单元 **0.5～1.5h**、独立 DONE 判据、一刀一提交、收尾即落盘
- 里程碑只做分组；计划里每单元写明内容/DONE 判据/预估/顺序依赖；首任务优先纯只读盘点类（v2.0.0 的 T-101 即此范式）

## 测量侧沉淀（v1.8 · 细节见 production/v18-r7-report.md 与 design/butter-balance-calibration-v18.md）
- R7：同格堆叠条件 P(≥1|n≥2) 四类全 1.0（确定性）；浪费率全低 ≤10%（画像预警：溢杀口径系统性低估战略浪费）；旧源判别力完整（跨格伤 22→0 / melon 逐字节不变）
- R9-b：三候选式无一过 ±2pp（F-A maxAbs 3.0pp）；GRID 修正式全表最优 2.1pp 作建议；**T≤cd / T>cd 两域硬边界**（线性式仅 T≤cd 域解析精确）+ F-B 淘汰
- prelude：noteHpWrite 重复 kind 键已修（hitKind 并存）+ survivor rate 硬门控 + selftest 非零正样本断言 + 独立验证器 13/13；指纹口径剔 date/runtimeMs/gitHead/gitClean + htmlPath 小写归一 + git 计数归一
