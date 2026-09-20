# PvZ Lite · 项目长期记忆

## 项目与版本线
- 纯前端**单文件**游戏 `plants-vs-zombies.html`，零依赖零构建，双击即玩，仅 PC；规模一律以 `docs/code-map.md` 头部为准（别写死行数）
- 硬规则：**code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`**；禁止同文件并行 Edit；无用户许可不 Write/Edit/commit
- 版本线：v1.0.0 / v1.1.0 / v1.2.0 / v1.2.1 / **★ v1.3 正式版已发（2026-09-21 07:2x）**——定版刀 `51344fca`（VERSION L49）→ 发布包 `4559cc9`（`production/release/v1.3/` 四件套，冻结副本 LF SHA-256 `21b73482…5812`）→ tag `v1.3`=`51344fca`（远端 tag 对象 `ed70c01`）→ main+tag 已推，ls-remote 双确认，本地=远端工作树净。**屋顶关周期收官**
- 改源码须走新版本流程，不得覆盖分发件（五处冻结产物只读）

## 当前状态（2026-09-21 07:3x · v1.3 发布后）
- **v1.3 已发布内容**：屋顶 L5（斜置瓦带+坡面几何 liftX）、花盆 planter（25 阳光，roof/water 布尔互斥）、卷心菜投手 cabbage（**100/20/2.0，dps 10.0**，V13-04 定案）、卡栏 9 卡、种植链路重构四刀（REG-PLANT-05/06/07）、暂停停 BGM 修复（REG-BGM-01）
- **GDD 已对齐源码**：`design/gdd/level-5.md` v1.3-M5 回写完毕（11 处+T17 勘误），方案 C 口径，120 费字样零活值；数值沿革唯一权威=源码 L189
- **★ 换行口径坑（发布导出必读）**：工作区是 CRLF 检出态、git blob 本体是 LF，字节差=行数；**发布指纹以冻结副本 LF 为权威**；导出冻结副本必须 Buffer 直通（execSync buffer + writeFileSync buffer），`git show >` 重定向+utf8 读回有换行转换风险；CRLF→LF 归一化比对可验证零失真
- **下一步候选**：①新植物三件套（玉米投手/冰冻射手/冰冻西瓜）独立评审（另一会话进行中）——⚠️ 卡栏 1000px 最多容 9 张，加第 10 张必须重做卡栏布局+热键上界+门控基线 ②优化池 O1/O2/O4 解冻决策（版本已稳定 v1.3，可启动「资产内嵌」同批拍板）③GitHub Release 挂附件（可选未排期）
- N-13 多语言 / N-14 移动端：**不做、优先级最低**，大版本（x.0.0）时确认（🧊 冻结）
- 详见 `2026-09-21.md`（v1.3 发布全程）+ `2026-09-20.md` + `2026-09-19.md`

## 📌 下班交接（2026-09-20 23:0x，换电脑/新会话续干从这里读）

- **本地=远端，工作树干净，无挂起改动**（基点以 `git log --oneline -1` 实测为准；交接文档不写自身哈希，免自引用死循环）。今晚（21:5x-23:0x）三线闭环：①屋顶接缝透绿修复 + 楔形剪影删除（`6aec97b`+`b7e7e93`，像素级验证 8 采样零绿底）②**暂停停 BGM 修复**（`togglePause` 统一入口 + want 补 `!paused`，源码随 `b7e7e93` 入库 + 测试件 `9213bb3` REG-BGM-01，回归基线升 **64/64**）③bench 干净复跑去噪（`bc71a37`，E p95 3.25ms/20% 确证前轮 258ms 尖峰=负载噪声）
- **⚠️ 双教训（本节自带）**：①并行会话卷带——两会话同时施工时，另一会话 `git add` 整文件会把本会话未提交改动**顺带卷入其提交**（BGM 源码进了 `b7e7e93` 而其提交说明未提），提交前 `git show HEAD --stat` 核对内容与说明相符，发现卷带立即在后续提交留痕；②**已推送的提交不得 amend**——本次交接文档改哈希走了 amend+force-push（`036a4e4`→`da65e1f`），违反铁规侥幸无损，正确姿势是追加修正提交
- **下一刀 = P0 修尘土死代码**（`docs/code-review-todo.md` P0 节照单执行，drawPlant 区块）；P1-A/P1-B/P2-A 捆新植物线 S1，P2-B 挂观察
  - **✅ P0 已完成（2026-09-20 23:2x，提交 `5c3c51f`）**：尘土触发移入动画分支（t 跨 0.35 一次性触发 + 盆格 y 补 -lift）；新增 REG-PLANT-05（断言实现无关=P2-A 安全网）；四门控全绿（回归基线 64→**65/65**）；code-map 2506 行；**已推送 + 用户真机验收尘土可见 ✅（远端=本地=`5c3c51f`）**
- **下一刀（更新）= P1-A/P1-B/P2-A 捆新植物线 S1**（canPlant 规则表 / spawnPlant 工厂 / 动画时间轴挪 update）；P2-B 挂观察
  - **✅ P1-A 已完成（2026-09-20 23:4x，提交 `82c7775`，未推送）**：canPlant 规则表纯函数落输入分区（6 规则数组化）；锚点 SMOKE-025 T16 / SMOKE-027 T16-T18 原样通过；新增 REG-PLANT-06（toast 文案捕获锁语义+顺序，回归基线 65→**66/66**）；code-map 2520 行/71 函数
  - **✅ P1-B 已完成（2026-09-20 23:5x，提交 `2fb1d02`，未推送）**：spawnPlant 工厂收拢建档 schema，dirtDone 显式初始化进工厂；旧对象兜底保留（harness 注入对象仍旧 schema）；code-map 2533 行/72 函数
  - **✅ P2-A 已完成（2026-09-21 00:1x，提交 `3be1a32`，未推送）**：plantT 推进挪 updatePlant（4x 加速+暂停冻结），尘土触发随迁（220ms=620*0.35），drawPlant 退化纯读——渲染层「只读不写」不变量回归；REG-PLANT-05 仅换驱动函数零改断言（接缝预案兑现）；新增 REG-PLANT-07（回归基线 66→**67/67**）。**code-review-todo 四刀全清（P0/P1-A/P1-B/P2-A），P2-B 挂观察；累计未推送 3 提交：82c7775+2fb1d02+3be1a32**
- **新植物独立评审**（玉米投手/冰冻射手/冰冻西瓜）用户已开新会话在做；v1.3 剩余（GDD 回写/M1-M6 视觉验收/M3 美工图）已分配他人
- 换机操作：`git pull`（记得先开加速器）→ 读 `2026-09-20.md` 22:2x 节 → 干活

## 门控基线（改源码后必须全绿）
| 门控 | 命令 | 基线 |
|---|---|---|
| 烟雾 | `tests/harness/run-smoke.js` | 28/28（09-20 二分合并起含 SMOKE-028） |
| 回归 | `tests/harness/run-all.js --all` | 67/67（09-21 凌晨起含 REG-PLANT-07 动画时间轴，前置 66 含 REG-PLANT-06） |
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
- **toast 文案可捕获（REG-PLANT-06 实证）**：`sb.toast=fn` 覆盖即拦全部提示语，适合锁校验语义；`probe().cardCD` v1.3 起是**预填充 9 键全 0**，「键数为 0」断言必挂，要断「所有值 ≤0」
- **harness 桥接二批（REG-PLANT-07 实证）**：`sb.eval` 不存在（vm sandbox 无此方法）；gameSpeed 顶层 let 不挂桥，只能经 `sb.btns.fast.onclick` 连点设定（1→2→4→1 循环）；推 update 用现成桥 `g.__updateRaw(dt)`；RAF 帧步进 = shift rafQueue + 手动传增时间戳（SMOKE-010 同款）
- REG-END-02 现锁 `__LEVELS[6]===undefined`（S2 已平移；下个新关上线后再平移）
- 新内容先查现成能力（bucket 零成本红利）；bench 回填 perf-profile §7 幂等正常
- T6 方法论：单值样本可定案但缺项必须披露；双样本矛盾先查个体差异 vs 系统缺陷
- 团队协作：先 `TeamCreate` 再 spawn（`name` 用 Agent ID 如 `engineering-lead`）
- **派子代理前先固化「落盘状态核实」习惯**：子代理被会话中断后其口头进度不可信，接手时先 `git tag -l` / `ls 发布目录` / `git status` 实证核验再决定重跑范围（v1.2.1 发布中断教训：表面上"执行中"，实际零持久产出）
- **同文件多处 Edit 有并行竞态**（REG-ROOF-01 ③ 段静默未落盘，回归 59/60 暴露）——编辑后必须 grep/Read 回验
- **M3/M4 屋顶施工已落库（本机 09-20 前线）**：M3 视觉=斜置平面（旋转瓦带+屋脊城垛+檐沟，`production/v13-m3-visual-impl-spec.md`）+ M4 连续坡面 C2（`ROOF_COLS`/`ROOF_LIFT_H`/`liftX`，贴坡弹道，SMOKE-028+REG-SLOPE-01+REG-GATE-01）；施工报告与截图证据见 git log `89bb309`/`d7ad657` 等 13 提交
