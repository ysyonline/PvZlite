# PvZ Lite · 项目长期记忆

## 项目与版本线
- 纯前端**单文件**游戏 `plants-vs-zombies.html`，零依赖零构建，双击即玩，仅 PC；规模一律以 `docs/code-map.md` 头部为准（别写死行数）
- 硬规则：**code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`**；禁止同文件并行 Edit；无用户许可不 Write/Edit/commit
- 版本线：v1.0.0 / v1.1.0 / v1.2.0 / **v1.2.1 已提交推送**（`6da6b2c` 功能刀 + `8e611d2` 记忆刀，2026-09-18 17:0x 远端核验一致，**tag v1.2.1 未打**）；三处发布包 `production/release/v1.0.0|v1.1|v1.2/` 冻结只读
- 改源码须走新版本流程，不得覆盖分发件；v1.2 发布后跟踪已全闭环（M5 ≈4min/地狱≈7min、M7-7.1、软验收不空/顺/能）

## 当前状态（2026-09-20 09:1x 验收反馈小改版）
- **两机分叉已 merge 闭环**：远端 8 提交（v1.2.1 发布包 + v1.3 屋顶线 S1/S2 + 投手数值对齐 `e736c62`）合入本地；冲突仅落在记忆两文件（源码/测试/发布包零冲突）。**v1.2.1 正式版已发**：tag `v1.2.1`=`f5d660d`（本地远端均有），发布包 `production/release/v1.2.1/` 四件套在库
- **v1.3 屋顶线：立项 + S1 + S2 实现全部完成并在 main**。定案：卡数=9（planter@7/cabbage@8）、`roof:true && water:false` 布尔互斥、CARDS 只 append、CABBAGE_VX=260/CABBAGE_G=500、菜单关卡按钮已扩 5（190 基准右缘 970<1000）
- **★ 投手最终定案（v1.3 验收反馈轮）**：**dmg 20 / cd 2.0 / cost 100**（dps 10.0 = 豌豆 0.8×，单发与豌豆相同；用户拒绝 cost 120 方案）。设计裁决全文 `design/gdd/v13-04-cabbage-rebalance.md`（766 行）。**投手 cd 有 2 个落点必须同步**：CARDS.cd（卡面）+ updatePlant 内 `p.cd=`（实际射击间隔）
- **★ 已验证项（v1.3 验收反馈轮）**：①投手降级 ✅ ②阳光点击半径 30→40px（`<900`→`<1600`）✅ ③向日葵根茎（世界+卡面）✅；四门控全绿 + 像素级客观验证通过
- **下一步 = v1.3 人工验收 M1-M6 视觉项**（M7/M8 已代跑全绿，报告 `tests/v13-m7-m8-report.md`）；待办：①GDD §3.2/§3.5/§2.1/§8.1 条款回写（文策渊已给修订文本）②M3「屋顶不倾斜」美工效果图流程 09-19 挂起至今未启动
- **新植物待独立评审**：玉米投手 / 冰冻射手 / 冰冻西瓜（用户 09:0x 提出，本轮未做）。⚠️ **卡栏 1000px 最多容 9 张**（9 张右缘 958，每张 98px，第 10 张溢出）→ 加卡必须重做卡栏布局+热键上界+门控基线
- **施工坑（已修）**：注入式多段测试每段结束必须清场（REG-PULT-01 静止目标替移动目标挡弹）；盆上种豌豆=125 非 175（费用按所种卡算）
- **优化池 O1/O2/O4 全部 🧊 冻结，捆绑同批解决**（用户 21:21 拍板：版本尚不稳定）：O1 入水噗通 + O2 哗哗哗（合成路线已否，候选=采样 base64/物理建模）+ O4 僵尸 AI 贴图（乙案）——共享「资产内嵌」决策，版本稳定后一次拍板统一做。O4 提示词首版已备好 `design/assets/o4-zombie-prompts.md`，解冻即用（登记源 `v1.2-plan §六/§七`，冻结态已回写 §八 P4）
- **★ 发版检查固定节**：每次定版发布，RELEASE-CHECKLIST 在 Go/No-Go 前必须加「优化池核对」节，逐项核对 O1-O4 + N-13/N-14，给出「已处理/不处理+理由」；登记源 = `v1.2-plan §八`（P1-P5 表），发布包内放快照
- N-13 多语言 / N-14 移动端：**不做、优先级最低**，大版本时确认（🧊 冻结）
- 详见 `2026-09-18.md` 末尾「📌 新会话接手指南」+ `2026-09-19.md` + `2026-09-20.md`

## 📌 下班交接（2026-09-20 23:0x，换电脑/新会话续干从这里读）

- **本地=远端，工作树干净，无挂起改动**（基点以 `git log --oneline -1` 实测为准；交接文档不写自身哈希，免自引用死循环）。今晚（21:5x-23:0x）三线闭环：①屋顶接缝透绿修复 + 楔形剪影删除（`6aec97b`+`b7e7e93`，像素级验证 8 采样零绿底）②**暂停停 BGM 修复**（`togglePause` 统一入口 + want 补 `!paused`，源码随 `b7e7e93` 入库 + 测试件 `9213bb3` REG-BGM-01，回归基线升 **64/64**）③bench 干净复跑去噪（`bc71a37`，E p95 3.25ms/20% 确证前轮 258ms 尖峰=负载噪声）
- **⚠️ 双教训（本节自带）**：①并行会话卷带——两会话同时施工时，另一会话 `git add` 整文件会把本会话未提交改动**顺带卷入其提交**（BGM 源码进了 `b7e7e93` 而其提交说明未提），提交前 `git show HEAD --stat` 核对内容与说明相符，发现卷带立即在后续提交留痕；②**已推送的提交不得 amend**——本次交接文档改哈希走了 amend+force-push（`036a4e4`→`da65e1f`），违反铁规侥幸无损，正确姿势是追加修正提交
- **下一刀 = P0 修尘土死代码**（`docs/code-review-todo.md` P0 节照单执行，drawPlant 区块）；P1-A/P1-B/P2-A 捆新植物线 S1，P2-B 挂观察
  - **✅ P0 已完成（2026-09-20 23:2x，提交 `5c3c51f`）**：尘土触发移入动画分支（t 跨 0.35 一次性触发 + 盆格 y 补 -lift）；新增 REG-PLANT-05（断言实现无关=P2-A 安全网）；四门控全绿（回归基线 64→**65/65**）；code-map 2506 行；**已推送 + 用户真机验收尘土可见 ✅（远端=本地=`5c3c51f`）**
- **下一刀（更新）= P1-A/P1-B/P2-A 捆新植物线 S1**（canPlant 规则表 / spawnPlant 工厂 / 动画时间轴挪 update）；P2-B 挂观察
- **新植物独立评审**（玉米投手/冰冻射手/冰冻西瓜）用户已开新会话在做；v1.3 剩余（GDD 回写/M1-M6 视觉验收/M3 美工图）已分配他人
- 换机操作：`git pull`（记得先开加速器）→ 读 `2026-09-20.md` 22:2x 节 → 干活

## 门控基线（改源码后必须全绿）
| 门控 | 命令 | 基线 |
|---|---|---|
| 烟雾 | `tests/harness/run-smoke.js` | 28/28（09-20 二分合并起含 SMOKE-028） |
| 回归 | `tests/harness/run-all.js --all` | 65/65（09-20 深夜起含 REG-PLANT-05 尘土触发，前置为 64 含 REG-BGM-01） |
| 音频总线 | `tests/harness/verify-bus.js` | 56/56（v1.3 零新键维持） |
| bench | `tests/perf/bench.js` | 五场景 PASS（D=L4 水景地狱 · E=L5 屋顶地狱；09-20 本机 i3-10110U 复跑全场景 p95 0.29–3.9ms PASS） |

## 环境与命令
- Node 绝对路径：`C:\Users\weixufeng\.workbuddy\binaries\node\versions\22.22.2-3\node.exe`（带 `-3` 后缀；旧机同结构，用户名 `user3667`；bash 裸 `node` 不在 PATH）
- Bash 每命令开头：`export PATH="/usr/bin:/bin:/mingw64/bin:/c/Windows/System32:/c/Windows"; unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY`
- 推送（加速器直连 + helper 覆盖，完整命令见 `2026-09-19.md` 归档节；★ WorkBuddy 会往 shell 注入 `http_proxy=127.0.0.1:5350x` 劫持 git，必须 unset 全部代理变量 + `-c http.proxy= -c https.proxy=` 直连）：
```bash
GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=Never git -c http.proxy= -c https.proxy= \
  -c credential.helper= -c credential.helper='!"C:/Users/weixufeng/.workbuddy/binaries/PortableGit/versions/1.2.0/mingw64/bin/git-credential-manager.exe"' \
  push -u origin main
```
- **网络前置（2026-09-18 实测）**：github 域在 `~/.gitconfig` 配了 `http.https://github.com.proxy=127.0.0.1:7890`（Clash 系加速器）。**加速器没开时 push/ls-remote 全挂**——TCP 443 通但 TLS 握手被重置，ssh.github.com:443 也被掐；**先问用户「加速器开了吗」再排查**。加速器开了直接用上面的 helper 覆盖命令即可（不用清 URL 域代理）；`7890 不通` = `Connection refused` 是加速器没开的指纹

## 关键坑与方法论（防重复摸索）
- **push 后 `[ahead N]`/`[gone]` 是假象**：以 `git ls-remote origin main` 为准；修复 = 拿完整 40 位哈希 sed 直改 `.git/packed-refs` 的 origin/main 行（短哈希补零会写坏）
- `git add` 别带不存在路径（整体失败）；提交后必看 `git show --stat`；已推送的不要 amend
- 换电脑哈希核验：`git show HEAD:plants-vs-zombies.html | sha256sum`（直接 sha256sum 文件会因 autocrlf 虚警）
- 浏览器自动化：**Edge headless + CDP**（`--remote-debugging-port=9333`，Node 22 内置 WebSocket），别装 agent-browser；真实点击 `Input.dispatchMouseEvent`；**性能结论必须开 GPU 轮**（`--disable-gpu` 假象 jank 13.7%）；**像素级视觉验证**：页内 `<canvas>` 可 `getImageData` 采样判读（范例 `tests/playtests/o3-final-verify.js`）
- **WebAudio 合成音色天花板（O1/O2 冻结教训）**：噗通/哗哗哗两次参数方案（v1.2 噪声型 / v1.2.1 低频 tone+noise）真机均被否——落水声这类瞬态质感，参数合成难以逼真，换方案再启（预录采样 base64 需先拍板零依赖取舍）
- **SFX 异常包裹层会吞合成错误**——SMOKE-014 计数断言是唯一曝光口（`opt._wadePad` ReferenceError 教训：解构签名函数内别引用外层名）
- **画面反馈与代码不符时先查旧标签页**：单文件游戏改动后用户若未强刷，看到的是旧版渲染（O3「见腿」误报成因之一）
- 音频：USB 声卡静音功率门控 → `initAudioBus` 常驻 17.5kHz@0.005 振荡器直连 destination（SMOKE-017 守护）；v1.2 `SFX.splash`（noise+tone 520→170，路由 battle，gate 0.3s）
- SFX 命名偏差（有意）：B1→`SFX.plant`、B4→`SFX.death(type)`、`melonThrow` 独立节流键
- harness ctx 是 Proxy 桩：render 变异须「未定义变量 ReferenceError」写法；连续铲两格各重选铲子；豌豆是 CARDS[1]；**桩里 `ctx.canvas` 是函数，禁读 `ctx.canvas.width`（用 DOM `canvas.width`）**；像素级判读辅助工具 `.workbuddy/tmp-png-sample.js`
- **harness 桥接口径（REG-PLANT-05 实证）**：顶层 function 声明（drawPlant/gridToPos）经 `sb.<name>` 直达；**const 常量不挂**（POT_LIFT 需 sb.eval 或写死断言值）；`setLevel(n)` 是 LEVELS **键**（1-5）非索引，屋顶=5；用例内不推进 update 则 cardCD 不衰减，同卡二次种植会被拒（换卡或 g.seed 重置）
- REG-END-02 现锁 `__LEVELS[6]===undefined`（S2 已平移；下个新关上线后再平移）
- 新内容先查现成能力（bucket 零成本红利）；bench 回填 perf-profile §7 幂等正常
- T6 方法论：单值样本可定案但缺项必须披露；双样本矛盾先查个体差异 vs 系统缺陷
- 团队协作：先 `TeamCreate` 再 spawn（`name` 用 Agent ID 如 `engineering-lead`）
- **派子代理前先固化「落盘状态核实」习惯**：子代理被会话中断后其口头进度不可信，接手时先 `git tag -l` / `ls 发布目录` / `git status` 实证核验再决定重跑范围（v1.2.1 发布中断教训：表面上"执行中"，实际零持久产出）
- **同文件多处 Edit 有并行竞态**（REG-ROOF-01 ③ 段静默未落盘，回归 59/60 暴露）——编辑后必须 grep/Read 回验
- **M3/M4 屋顶施工已落库（本机 09-20 前线）**：M3 视觉=斜置平面（旋转瓦带+屋脊城垛+檐沟，`production/v13-m3-visual-impl-spec.md`）+ M4 连续坡面 C2（`ROOF_COLS`/`ROOF_LIFT_H`/`liftX`，贴坡弹道，SMOKE-028+REG-SLOPE-01+REG-GATE-01）；施工报告与截图证据见 git log `89bb309`/`d7ad657` 等 13 提交
