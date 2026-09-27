# PvZ Lite · 项目长期记忆（稳定事实；在途任务态见 .workbuddy/checkpoints/，细节查日志与 design/ production/）

## 铁律
- 纯前端单文件 plants-vs-zombies.html，零依赖零构建仅 PC；规模以 `docs/code-map.md` 头部为准（别写死行数）
- code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`；禁同文件并行 Edit；无用户许可不 Write/Edit/commit；冻结产物只读
- 轻量标签须显式 `git push origin <tag>`；已推送不得 amend；N-13 多语言 / N-14 移动端冻结至 v3.0 复核
- 用户陈述句先问「要改还是要锁」；用户规则 > 设计常规
- **发版/修 bug 不得清用户记录**（2026-09-26 用户明令）：凡涉及存档/记忆改写先确认；游戏进度类问题优先排查预览源漂移根因

## 当前状态
- **v2.3.0 夜行蘑菇已发布**（2026-09-28）：四蘑菇（阳光菇/小喷菇/大喷菇/魅惑菇）+ 夜行机制（isNocturnal 复用 night||fog 口径，白天沉睡即时 return）+ 魅惑状态机（z.hypno，被啃触发）。施工 U1–U11 共 12 commit（`acb3df9`→`de5b7e3`），tag `v2.3.0` @ `de5b7e3` 已推送，release 四件套落盘 `production/release/v2.3.0/`（冻结副本 282,459B · SHA256 `d2f16d48...d1d6`）。发卡方案 A 已拍板（3-1~3-4），**解锁落点待 v2.3.1 世界 3 开放时实装，本版四蘑菇仅测试模式可玩**。门控 FULL 96/96（SMOKE 29+REG 67，新增 REG-MUSH-01~04）· BUS 58/58 · BENCH PASS。真机视觉验收 10/10 + 旧源 0/6 判别力✓；DEF-VIS-01/02 已修复关闭
- **v2.2.8 消缺版已归档**（2026-09-27）：功能 commit `919447e` + 定版刀 `2da4410`，tag `v2.2.8` 已推送。①向日葵日夜间隔有别（白天 20s/夜晚 24s，SUNFLOWER_FIRST=7/DAY=20/NIGHT=24，epsilon `sunT<1e-9` 防浮点假零）②夜晚/浓雾天空不掉阳光（checkWave `level.time==='day'` 守卫）。REG-PLANT-01 重写日夜双场景。门控 FULL 92/92 · BUS 58/58。release 四件套已落盘 `production/release/v2.2.8/`（冻结副本 240,803B · SHA256 `90f5ff26...ba20`）。视觉验收判跳过（本版无视觉变更）
- **v2.2.7 消缺版已发布**（2026-09-27）：commit `5df147a`，tag `v2.2.7` 已推送。①杭椒/樱桃膨胀动画完成即立即引爆（不再等僵尸踩中，armT 达标瞬间 explode）②奖励重排 1-9=冰冻西瓜/1-10=荷叶/2-1=100金币 ③harness loadGame 兜底继承 PVZ_HTML_PATH（根治对照模式假绿）。门控 FULL 92/92 · BUS 58/58 · 判别力旧源 5/5 恰红。release 四件套已落盘 `production/release/v2.2.7/`（冻结副本 240,003B · SHA256 `79c87f1d...52e2`）。真机视觉验收判定跳过（本版无视觉变更）
- **v2.2.6 存档导出/导入已发布**（2026-09-26）：tag `v2.2.6` 已推送，commit `3b9b727`。主菜单加「导出/导入存档」钮（JSON 打包/粘贴恢复+自动备份 pvz_backup_last），治预览源漂移致进度"被清"。门控 FULL 92/92 · BUS 58/58 · REG-SAVE-01 判别力✓
- **v2.2.5 消缺版已发布**（2026-09-26）：tag `v2.2.5` 已推送，commit `3772b43`。三 bug：①冰冻射手补 snowpea 绘制分支（原只剩影子）②航椒/樱桃 1.2s 膨胀武装期（arming，期内不可啃食/触发+膨胀动画）③倭瓜一格内触发 + 嗯/嘣音效（squashSpot/squashSlam）
- **v2.2.4 奖励展示简化**（commit `c6ee0a7`）：礼盒特效移除，奖励植物淡入。v2.2.3 礼盒 P1 随之推翻，判别力脚本 v222/v223 退役
- v2.2.1~v2.2.2 细节见当日日志；历史版本指纹 → `git tag` + 日志为准
- **v2.3.1 候选入口（下一开窗点）**：①蘑菇发卡落点实装（3-1 小喷菇/3-2 阳光菇/3-3 大喷菇/3-4 魅惑菇，方案 A 已拍板）②世界 3（墓地）/ 世界 4（房屋）开放 · 墓碑机制实装 · 金币留存钩子；③tag v2.3.0 + release 四件套（若旭峰要补）
- **有在途任务时**先读 `.workbuddy/checkpoints/`（本文件不复述在途细节）；**当前无在途任务**

## 会话生命周期（2026-09-25 定）
- **开窗口**：工作区选 `D:\code\PvZlite`（通用时间戳工作区读不到本项目记忆与 checkpoint）
- **开局三件事**：读本文件 → 读 `checkpoints/` 最新文件 → `git status`，再动手
- **进行中**：0.5~1.5h 一任务单元、一刀一提交；每 10~15 次工具调用更新 checkpoint
- **收尾**：任务完结后把 checkpoint 有价值部分并入日志/本文件，然后**删除 checkpoint**（回收条件写在 checkpoint 顶部）

## 门控（里程碑才跑，任务单元收尾不跑）
- `node tests/harness/run-gates.js` = FULL+BUS+BENCH（≈2s，`--quick` 跳 bench）；单元自证只跑自带 `v20-*.js`
- 基线随版本变（v2.3.0 起：SMOKE 29 / REG 67 / BUS 58 / BENCH PASS）；判级异常先看 DC 结构量，不动=噪声复跑
- bench 回填脏 perf-profile 属预期 → 无漂移 checkout 还原

## 环境与命令
- Bash 每命令开头：`export PATH="/usr/bin:/bin:/mingw64/bin:/c/Windows/System32:/c/Windows"; unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY`
- **三机 Node/推送通路不同，换机先 `git remote -v` + `ls-remote` 判定**：
  · 本机 weixufeng：Node 走 managed 绝对路径；origin=**SSH（2026-09-25 起）**，裸 `git push`；网络不通 → 不检测不换端口，确认加速器（bludcloud 127.0.0.1:7892）
  · 家庭机 Administrator：Node `C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2-3/node.exe`；SSH 直推 `GIT_SSH_COMMAND="ssh -o BatchMode=yes" git push`；HTTPS+GCM 被沙箱拦，勿走 `~/.ssh`
  · 公司机 user3667：HTTPS+GCM 直连；★会话注入 ALL_PROXY 致 `over proxy 127.0.0.1` 挂连 → `unset ALL_PROXY all_proxy` + `git -c http.proxy= -c https.proxy= push`
- 换机核验：`git show <c>:plants-vs-zombies.html | sha256sum`（工作区直算因 CRLF 虚警）

## 关键坑（仍在生效的）
- **git commit 输出假象（2026-09-27 本机实测两连）**：`git add && git commit` 后输出 "nothing to commit, working tree clean"，但 commit 实际已创建——判定以 `git log --oneline -3` + `git show --stat HEAD` 复核为准，勿按输出误判重做
- spawnSync EBUSY：同步 spawn 对 .exe 恒挂（异步正常），勿重试；run-gates 受阻 → 按其源码清单逐门直跑等效
- 中断恢复先看状态再续（tag 可能已打）；已推送才禁 amend
- 行尾：`.gitattributes`(eol=lf) 已根除 CRLF；判据以 node 精确 CR 计数为准（od 误报）
- 定版刀 = 版本标签通扫（含验收脚本活默认值 PVZ_EXPECT_VER）；顺序 = 先提交定版刀再跑验收
- UI 几何禁两处硬编码（draw/hit 抽共享常量）；改 UI 后真机截图 + 像素判据 + 旧源对照
- 判别力自证：**旧源复跑必红**，先红后绿才算数（曾有位置参数被忽略致旧源假绿）
- 锚点缺键静默模板化：不报错、关卡可玩但内容=模板关 → 改锚点必断言 waves ≠ 模板关
- harness：URLSearchParams 已注入；顶层 function 经 `sb.<name>` 直达、const 不挂；推帧 `g.__updateRaw(dt)`；Edge 子进程 stdout 不回传 → 重定向后 Read，`*-results.json` 为权威；`CARDS cd`=卡冷却 ≠ `p.cd`=射击间隔
- harness sandbox **无 localStorage/navigator**：测存档功能须 `loadGame({localStorage: shim})` 注入；源码侧对 localStorage/navigator 用 typeof 守卫
- case 内自调 `loadGame` 对照模式假绿已根治（v2.2.7）：`index.js loadGame` 里 `htmlPath = opts.htmlPath || process.env.PVZ_HTML_PATH || 默认`，后续 case 无需逐个透传（历史坑：SMOKE-021/REG-SAVE-01/REG-POINT-04 栽过假红/假绿）
- 新增实体状态字段必同步 probe 快照白名单（v2.2.5 arming 栽过：TypeError undefined）
- [ahead]/[gone] 假象以 `ls-remote` 实测；提交后必看 `git show --stat` 防卷带

## 任务拆分硬规则（2026-09-23）
大版本禁半天级大任务：拆 0.5~1.5h 单元、独立 DONE 判据、一刀一提交、收尾落盘；里程碑只分组；首任务 = 纯只读盘点

## 测量侧沉淀
同格锁契约、GRID 修正式、指纹口径等见 `production/v18-r7-report.md` 与 `design/butter-balance-calibration-v18.md`（本文件不复制）
