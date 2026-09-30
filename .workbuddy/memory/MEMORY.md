# PvZ Lite · 项目长期记忆（稳定事实；在途任务态见 .workbuddy/checkpoints/，细节查日志与 design/ production/）

## 铁律
- 纯前端单文件 plants-vs-zombies.html，零依赖零构建仅 PC；规模以 `docs/code-map.md` 头部为准（别写死行数）
- code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`；禁同文件并行 Edit；无用户许可不 Write/Edit/commit；冻结产物只读
- 轻量标签须显式 `git push origin <tag>`；已推送不得 amend；N-13 多语言 / N-14 移动端冻结至 v3.0 复核
- 用户陈述句先问「要改还是要锁」；用户规则 > 设计常规
- **发版/修 bug 不得清用户记录**（2026-09-26 用户明令）：凡涉及存档/记忆改写先确认；游戏进度类问题优先排查预览源漂移根因

## 当前状态
- **HEAD=main `bd2877d`（已推送）**；工作区干净。v2.3.7 一揽子（`68776ae`，39 文件）：①西瓜溅射修复（REG-SPLASH-01）②W2 初始阳光 50（REG-SUN2-01）③四项视觉调整（v236-visual-check 4/4）④铲子免费卡不返还+W2 波数对齐（`712de43` 已含）⑤⑥⑦大喷菇白圈删+小喷菇柄残截修 ⑧**害羞菇新增**（scaredyshroom：cost25/全行 20 单发/3×3 恐惧缩头即时判定/三姿态绘制，冒烟 17/17+视觉 4/4）⑨**墓碑重生**（graveRespawn：倒数 2 波各随机补 1~2 座新碑，仅 c4~c8 无植物格，可咬碑藤清除可钻怪，REG-GRAVE-02 判别力✓）⑩**三处修复**（2026-09-30）：害羞菇改发 2-2（阳光菇 1-10 已有，2-6 恢复金币关 100）；僵尸只在墓碑处出现（processSpawnQueue 放出前校验 _graveAlive，墓碑已清退化右缘，REG-GRAVE-03 判别力✓）；咬碑藤往下啃食动画（GRAVEBUSTER_GEOM.down=34，主体随 _prog 下移，视觉 _v238 4/4）。门控 FULL 102/102·BUS 58/58。**历史 playtest 已清理**（`bd2877d`）：删 v21-world2-open.js（v2.1 M2 过时，被 REG-META-02/REG-POINT-04 覆盖）+ 删 v23-world-fumeshroom-smoke*.png（v2.3.6 删烟雾）；v23-mushroom-visual.js 同步 v2.3.6/v2.3.7（T3 删烟雾断言+幼体金环<30、T4 色差门控改 5×5 窗口容差6、T7 雾关 2-6→3-6、T8 卡数 19→21），10/10 PASS。任务④墓碑重生已完结
- **门控基线：FULL 102/102（SMOKE 29+REG 73）· BUS 58/58 · BENCH PASS**；新增 case 必补基线数（run-gates.js 注释+desc 同步）
- 历史版本指纹（v2.2.x~v2.3.6 各版 commit/tag/release 四件套）→ `git tag` + 日志 + README 版本史；细节不复述
- **候选入口（下一开窗点）**：①世界 2 后 6 关（2-5~2-10）已可玩（40 关全开放）；②金币留存钩子；③tag 打点 + release 四件套（若旭峰要补）
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
