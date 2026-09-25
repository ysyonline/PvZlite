# PvZ Lite · 项目长期记忆（稳定事实；在途任务态见 .workbuddy/checkpoints/，细节查日志与 design/ production/）

## 铁律
- 纯前端单文件 plants-vs-zombies.html，零依赖零构建仅 PC；规模以 `docs/code-map.md` 头部为准（别写死行数）
- code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`；禁同文件并行 Edit；无用户许可不 Write/Edit/commit；冻结产物只读
- 轻量标签须显式 `git push origin <tag>`；已推送不得 amend；N-13 多语言 / N-14 移动端冻结至 v3.0 复核
- 用户陈述句先问「要改还是要锁」；用户规则 > 设计常规

## 当前状态
- **v2.2.0 已封版发布**：tag 已推送，release 包四件套齐全；QA 门闭环；冻结产物 `production/release/v2.2.0/artifacts/plants-vs-zombies.v2.2.0.html`
- **有在途任务时**先读 `.workbuddy/checkpoints/`（本文件不复述在途细节）；**当前无在途任务**——v2.2.0 封版后 checkpoint 已回收，目录为空
- v2.3 候选入口（下一开窗点）：世界 3（墓地）/ 世界 4（房屋）开放 · 墓碑机制实装 · 金币留存钩子；详见当日日志终态段
- 历史版本线与指纹（v1.5~v2.1.1 的 hash、字节、行号）不在此留存 → `git tag` + 日志为准

## 会话生命周期（2026-09-25 定）
- **开窗口**：工作区选 `D:\code\PvZlite`（通用时间戳工作区读不到本项目记忆与 checkpoint）
- **开局三件事**：读本文件 → 读 `checkpoints/` 最新文件 → `git status`，再动手
- **进行中**：0.5~1.5h 一任务单元、一刀一提交；每 10~15 次工具调用更新 checkpoint
- **收尾**：任务完结后把 checkpoint 有价值部分并入日志/本文件，然后**删除 checkpoint**（回收条件写在 checkpoint 顶部）

## 门控（里程碑才跑，任务单元收尾不跑）
- `node tests/harness/run-gates.js` = FULL+BUS+BENCH（≈2s，`--quick` 跳 bench）；单元自证只跑自带 `v20-*.js`
- 基线随版本变（v2.2 起：SMOKE 29 / REG 62 / BUS 56 / BENCH PASS）；判级异常先看 DC 结构量，不动=噪声复跑
- bench 回填脏 perf-profile 属预期 → 无漂移 checkout 还原

## 环境与命令
- Bash 每命令开头：`export PATH="/usr/bin:/bin:/mingw64/bin:/c/Windows/System32:/c/Windows"; unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY`
- **三机 Node/推送通路不同，换机先 `git remote -v` + `ls-remote` 判定**：
  · 本机 weixufeng：Node 走 managed 绝对路径；origin=**SSH（2026-09-25 起）**，裸 `git push`；网络不通 → 不检测不换端口，确认加速器（bludcloud 127.0.0.1:7892）
  · 家庭机 Administrator：Node `C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2-3/node.exe`；SSH 直推 `GIT_SSH_COMMAND="ssh -o BatchMode=yes" git push`；HTTPS+GCM 被沙箱拦，勿走 `~/.ssh`
  · 公司机 user3667：HTTPS+GCM 直连；★会话注入 ALL_PROXY 致 `over proxy 127.0.0.1` 挂连 → `unset ALL_PROXY all_proxy` + `git -c http.proxy= -c https.proxy= push`
- 换机核验：`git show <c>:plants-vs-zombies.html | sha256sum`（工作区直算因 CRLF 虚警）

## 关键坑（仍在生效的）
- spawnSync EBUSY：同步 spawn 对 .exe 恒挂（异步正常），勿重试；run-gates 受阻 → 按其源码清单逐门直跑等效
- 中断恢复先看状态再续（tag 可能已打）；已推送才禁 amend
- 行尾：`.gitattributes`(eol=lf) 已根除 CRLF；判据以 node 精确 CR 计数为准（od 误报）
- 定版刀 = 版本标签通扫（含验收脚本活默认值 PVZ_EXPECT_VER）；顺序 = 先提交定版刀再跑验收
- UI 几何禁两处硬编码（draw/hit 抽共享常量）；改 UI 后真机截图 + 像素判据 + 旧源对照
- 判别力自证：**旧源复跑必红**，先红后绿才算数（曾有位置参数被忽略致旧源假绿）
- 锚点缺键静默模板化：不报错、关卡可玩但内容=模板关 → 改锚点必断言 waves ≠ 模板关
- harness：URLSearchParams 已注入；顶层 function 经 `sb.<name>` 直达、const 不挂；推帧 `g.__updateRaw(dt)`；Edge 子进程 stdout 不回传 → 重定向后 Read，`*-results.json` 为权威；`CARDS cd`=卡冷却 ≠ `p.cd`=射击间隔
- [ahead]/[gone] 假象以 `ls-remote` 实测；提交后必看 `git show --stat` 防卷带

## 任务拆分硬规则（2026-09-23）
大版本禁半天级大任务：拆 0.5~1.5h 单元、独立 DONE 判据、一刀一提交、收尾落盘；里程碑只分组；首任务 = 纯只读盘点

## 测量侧沉淀
同格锁契约、GRID 修正式、指纹口径等见 `production/v18-r7-report.md` 与 `design/butter-balance-calibration-v18.md`（本文件不复制）
