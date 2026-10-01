# PvZ Lite · 项目长期记忆（稳定事实；在途任务态见 .workbuddy/checkpoints/，细节查日志与 design/ production/）

## 铁律
- 纯前端单文件 plants-vs-zombies.html，零依赖零构建仅 PC；规模以 `docs/code-map.md` 头部为准（别写死行数）
- code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`；禁同文件并行 Edit；无用户许可不 Write/Edit/commit；冻结产物只读
- 轻量标签须显式 `git push origin <tag>`；已推送不得 amend；N-13 多语言 / N-14 移动端冻结至 v3.0 复核
- 用户陈述句先问「要改还是要锁」；用户规则 > 设计常规
- **发版/修 bug 不得清用户记录**（2026-09-26 用户明令）：凡涉及存档/记忆改写先确认；游戏进度类问题优先排查预览源漂移根因

## 当前状态
- **HEAD=main（`9fd9aaa` 已推送，与 origin/main 一致；tags v2.3.8/9/10 已全部推送）**。**v2.3.10 消缺**（2026-09-30 下午，用户反馈）：**咬碑藤啃碑穿模**（「应该是一点点往下吃，碑一点点消失」）——v2.3.7 动画只移主体，drawWorldDecor 碑体不感知 chewT；修复=碑体随进度自碑顶 clip 裁剪消失+裁切缘咬痕齿线（阴影不裁）+ GRAVEBUSTER_GEOM 增 stoneH:34/stoneHArched:38 共用碑身总高 + 裂纹钳制在剩余碑体内（起点 max(y+2+_down, 碑底-_gbH+_prog·_gbH)，_lenMax<8 消失，碑型按 findIndex i%2 与 drawWorldDecor 同口径）。真机视觉 `_v2310-gravebite-clip.js` 5/5（旧 v2.3.9 源 2/5 T2/T3/T4 全红）；探针=碑系中性灰 |r-g|≤10 && b<r && 55<r<115（⚠️ 写像素判据前先用 _diag 脚本采样真实色值——首版 mx-mn<26 把草皮全算灰判据失效）。**⚠️ 探针兜底：旧源缺新常量 → geo() undefined → getImageData 崩，||34/||38 兜底**。门控 FULL 104/104·BUS 58/58·v23-mushroom-visual 10/10·_v238 4/4 无外溢
- **v2.3.9（`cbf4935`+`260027c` 本地）两处消缺**：①魅惑僵尸互啃观感修复——逻辑层本无啃食植物路径（注入式复现无法红，REG-MUSH-04 已锁），真因=互啃双方 eating=false+同款 chomp 音效被误读；修复=eating=true 张嘴互殴+火花粒子 ②小喷菇柄可见+接地——PUFFSHROOM_GEOM 增 stemW/stemH:34 地面线锚定+柄绘制提共用+卡面同步；REG-MUSH-05 新增。**⚠️ 消缺方法论**：用户报「A 在做 B」先注入式逻辑复现，无法红=观感问题修观感；本次碑穿模=真视觉缺陷（clip 前），两法互补
- **v2.3.8 快照（2026-09-30，tag=b5f6974 已推送）**：①猫王召唤改正版机制（首召铺满 SUMMON_CAP=4，之后伴舞死亡才逐只补召 ~3s/只；修复旧 `_first` 时间比较 bug；REG-ELVIS-02）②小喷菇柄改矩形 ③铁桶血量回调正版 1225（GDD level-3/level-4 平衡数值已过时待复核）。v2.3.7 一揽子（`68776ae`）：害羞菇新增+改发 2-2、墓碑重生（REG-GRAVE-02）、僵尸只在墓碑处出现（REG-GRAVE-03）、咬碑藤往下啃食动画、西瓜溅射修复（REG-SPLASH-01）、W2 初始阳光 50、铲子免费卡不返还+W2 波数对齐
- **门控基线：FULL 107/107（SMOKE 29+REG 78，含 REG-SHOP-01/02 §9 真帧渲染断言）· BUS 58/58 · BENCH PASS**；新增 case 必补基线数（run-gates.js 注释+desc 同步）。**⚠️ saveMeta 加新键必须同步 REG-TESTMODE-01 键清单**（v2.4.1 踩坑：NINE_KEYS→KEY_LIST 10→12；§2b 计数断言用「预置键数」而非 KEY_LIST.length——test 模式不落盘新键）
- **⚠️ v2.4.1 商店空白消缺教训（`74cc31f`）**：SHOP_GEOM.CARD 定义键 y 与消费键 y0 错位 → NaN → 三页签商品卡全空白；**无头门控漏放根因=ctx 桩吞绘制调用 + 用例走函数直调没走真渲染**。已堵：harness `__drawLog` + REG-SHOP-01 §9 真帧断言（数值参数全有限 + 卡底计数）。**Canvas 游戏新增页面必须有真帧渲染断言**；几何常量键名 x0/y0 成对声明（防再次单边改名）。真机复验工具链（agent-browser）：open+eval 同链 && 连发（跨命令守护进程丢页面）、双 RAF 后再采样像素（点击帧下一帧才画）
- **tag v2.3.1~v2.3.10 已全部推送**（10 个轻量 tag）；`production/release/v2.3.1~v2.3.7/` 四件套已落盘推送（SHA256 已核验）；**v2.3.8/v2.3.9/v2.3.10 四件套已补齐落盘并推送**（提交 `9fd9aaa`，SHA256 已核验）。**⚠️ 版本边界事实**：v2.3.6 tag（`712de43`）仅含「铲子免费卡不返还+波数对齐」；W2 初始阳光50/四项视觉/西瓜溅射/双UI bug 被并入 v2.3.7 提交 `68776ae`，归入 v2.3.7 发行说明
- **候选入口（下一开窗点）**：①金币留存钩子（v2.4.0）；②世界 2 手感实测复测（魅惑互啃/小喷菇柄/咬碑藤穿模）；③bucket 1225 平衡复核
- **有在途任务时**先读 `.workbuddy/checkpoints/`（本文件不复述在途细节）；**当前无在途任务**

## 会话生命周期（2026-09-25 定）
- **开窗口**：工作区选 `D:\code\PvZlite`（通用时间戳工作区读不到本项目记忆与 checkpoint）
- **开局三件事**：读本文件 → 读 `checkpoints/` 最新文件 → `git status`，再动手
- **进行中**：0.5~1.5h 一任务单元、一刀一提交；每 10~15 次工具调用更新 checkpoint
- **收尾**：任务完结后把 checkpoint 有价值部分并入日志/本文件，然后**删除 checkpoint**（回收条件写在 checkpoint 顶部）

## 门控（里程碑才跑，任务单元收尾不跑）
- `node tests/harness/run-gates.js` = FULL+BUS+BENCH（≈2s，`--quick` 跳 bench）；单元自证只跑自带 `v20-*.js`
- 判级异常先看 DC 结构量，不动=噪声复跑；bench 回填脏 perf-profile 属预期 → 无漂移 checkout 还原

## 环境与命令
- Bash 每命令开头：`export PATH="/usr/bin:/bin:/mingw64/bin:/c/Windows/System32:/c/Windows"; unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY`
- **三机 Node/推送通路不同，换机先 `git remote -v` + `ls-remote` 判定**：
  · 本机 weixufeng：Node 走 managed 绝对路径；origin=**SSH（2026-09-25 起）**，裸 `git push`；网络不通 → 确认加速器（bludcloud 127.0.0.1:7892）
  · 家庭机 Administrator：Node `C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2-3/node.exe`；SSH 直推 `GIT_SSH_COMMAND="ssh -o BatchMode=yes" git push`
  · 公司机 user3667：gitconfig 配了 `http.https://github.com.proxy=127.0.0.1:7890`，URL 级配置 `-c` 清不掉；正确姿势=unset 代理环境变量后**裸 `git push`**（走 gitconfig 7890）；显式走代理=`git -c http.proxy=http://127.0.0.1:7890 ...`
- 换机核验：`git show <c>:plants-vs-zombies.html | sha256sum`（工作区直算因 CRLF 虚警）

## 关键坑（仍在生效的）
- **SIGTERM 打断 git 操作可丢 refs/pack（2026-09-29 实测）**：shell 抖动 SIGTERM 打断 stash ⇒ `.git/refs/` 整目录+2 .pack 丢失（fetch 报 unresolved deltas 真凶=pack/ 残留 tmp_pack_*）。恢复三板斧：①packed-refs/reflog 完好可手工重建 refs；②7890 代理裸 clone 裸仓再 **cp pack 回灌**（fetch 直灌本地会再踩 tmp_pack）；③收尾 `git fsck`。**git 中断后必须 fsck+status 复核**
- **git commit 输出假象**：输出 "nothing to commit" 但 commit 实际已创建——以 `git log -3` + `git show --stat HEAD` 为准
- spawnSync EBUSY：同步 spawn 对 .exe 恒挂（异步正常），勿重试；run-gates 受阻 → 逐门直跑等效
- 中断恢复先看状态再续（tag 可能已打）；已推送才禁 amend
- 行尾：`.gitattributes`(eol=lf) 已根除 CRLF；判据以 node 精确 CR 计数为准
- 定版刀 = 版本标签通扫（含 PVZ_EXPECT_VER）；顺序 = 先提交定版刀再跑验收
- UI 几何禁两处硬编码（draw/hit 抽共享常量）；改 UI 后真机截图 + 像素判据 + 旧源对照
- 判别力自证：**旧源复跑必红**，先红后绿才算数；溅射类 bug 注意——注入式摆弹会绕过几何/锚点偏差（REG-SPLASH-01 教训：必须真机开火路径）
- 锚点缺键静默模板化：改锚点必断言 waves ≠ 模板关
- harness：顶层 function 经 `sb.<name>` 直达、const 不挂；推帧 `g.__updateRaw(dt)`；Edge 子进程 stdout 不回传 → 重定向后 Read；`CARDS cd`=卡冷却 ≠ `p.cd`=射击间隔；sandbox 无 localStorage/navigator（须 shim 注入）
- 新增实体状态字段必同步 probe 快照白名单
- [ahead]/[gone] 假象以 `ls-remote` 实测；提交后必看 `git show --stat` 防卷带

## 任务拆分硬规则（2026-09-23）
大版本禁半天级大任务：拆 0.5~1.5h 单元、独立 DONE 判据、一刀一提交、收尾落盘；里程碑只分组；首任务 = 纯只读盘点

## 测量侧沉淀
同格锁契约、GRID 修正式、指纹口径等见 `production/v18-r7-report.md` 与 `design/butter-balance-calibration-v18.md`（本文件不复制）
