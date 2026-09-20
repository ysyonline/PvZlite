# PvZ Lite · 项目长期记忆

## 项目与版本线
- 纯前端**单文件**游戏 `plants-vs-zombies.html`，零依赖零构建，双击即玩，仅 PC；规模一律以 `docs/code-map.md` 头部为准（别写死行数）
- 硬规则：**code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`**；禁止同文件并行 Edit；无用户许可不 Write/Edit/commit
- 版本线：v1.0.0 / v1.1.0 / v1.2.0 / **v1.2.1 已提交推送**（`6da6b2c` 功能刀 + `8e611d2` 记忆刀，2026-09-18 17:0x 远端核验一致，**tag v1.2.1 未打**）；三处发布包 `production/release/v1.0.0|v1.1|v1.2/` 冻结只读
- 改源码须走新版本流程，不得覆盖分发件；v1.2 发布后跟踪已全闭环（M5 ≈4min/地狱≈7min、M7-7.1、软验收不空/顺/能）

## 当前状态（2026-09-20 08:5x 换机合并版）
- **两机分叉已 merge 闭环**：远端 8 提交（v1.2.1 发布包 + v1.3 屋顶线 S1/S2 + 投手数值对齐 `e736c62`）合入本地；冲突仅落在记忆两文件（源码/测试/发布包零冲突）。**v1.2.1 正式版已发**：tag `v1.2.1`=`f5d660d`（本地远端均有），发布包 `production/release/v1.2.1/` 四件套在库
- **v1.3 屋顶线：立项 + S1 + S2 实现全部完成并在 main**。定案：卡数=9（planter@7/cabbage@8）、`roof:true && water:false` 布尔互斥、CARDS 只 append、CABBAGE_VX=260/CABBAGE_G=500、菜单关卡按钮已扩 5（190 基准右缘 970<1000）
- **投手数值已按原版 PvZ 对齐（`e736c62`，v1.3 真机验收 M5 反馈）**：cost 150→100 / dmg 30→40 / cd 2.0→3.0
- **下一步 = v1.3 人工验收 M1-M8**（真机过 `?level=5`、投手弧线、9 卡视觉）→ 定版 v1.3
- **施工坑（已修）**：注入式多段测试每段结束必须清场（REG-PULT-01 静止目标替移动目标挡弹）；盆上种豌豆=125 非 175（费用按所种卡算）
- **优化池 O1/O2/O4 全部 🧊 冻结，捆绑同批解决**（用户 21:21 拍板：版本尚不稳定）：O1 入水噗通 + O2 哗哗哗（合成路线已否，候选=采样 base64/物理建模）+ O4 僵尸 AI 贴图（乙案）——共享「资产内嵌」决策，版本稳定后一次拍板统一做。O4 提示词首版已备好 `design/assets/o4-zombie-prompts.md`，解冻即用（登记源 `v1.2-plan §六/§七`，冻结态已回写 §八 P4）
- **★ 发版检查固定节**：每次定版发布，RELEASE-CHECKLIST 在 Go/No-Go 前必须加「优化池核对」节，逐项核对 O1-O4 + N-13/N-14，给出「已处理/不处理+理由」；登记源 = `v1.2-plan §八`（P1-P5 表），发布包内放快照
- N-13 多语言 / N-14 移动端：**不做、优先级最低**，大版本时确认（🧊 冻结）
- 详见 `2026-09-18.md` 末尾「📌 新会话接手指南」+ `2026-09-19.md`

## 门控基线（改源码后必须全绿）
| 门控 | 命令 | 基线 |
|---|---|---|
| 烟雾 | `tests/harness/run-smoke.js` | 27/27 |
| 回归 | `tests/harness/run-all.js --all` | 60/60（默认 REG 33/33） |
| 音频总线 | `tests/harness/verify-bus.js` | 56/56（v1.3 零新键维持） |
| bench | `tests/perf/bench.js` | 五场景 PASS（D=L4 水景地狱 · E=L5 屋顶地狱） |

## 环境与命令
- Node 绝对路径：`C:\Users\user3667\.workbuddy\binaries\node\versions\22.22.2-3\node.exe`（带 `-3` 后缀；bash 裸 `node` 不在 PATH）
- Bash 每命令开头：`export PATH="/usr/bin:/bin:/mingw64/bin:/c/Windows/System32:/c/Windows"; unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY`
- 推送（helper 覆盖，否则挂死）：
```bash
GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=Never git -c credential.helper= \
  -c credential.helper='!"C:/Users/user3667/.workbuddy/binaries/PortableGit/versions/1.2.0/mingw64/bin/git-credential-manager.exe"' \
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
- harness ctx 是 Proxy 桩：render 变异须「未定义变量 ReferenceError」写法；连续铲两格各重选铲子；豌豆是 CARDS[1]
- REG-END-02 现锁 `LEVELS[5]===undefined`（下个新关上线后再平移）
- 新内容先查现成能力（bucket 零成本红利）；bench 回填 perf-profile §7 幂等正常
- T6 方法论：单值样本可定案但缺项必须披露；双样本矛盾先查个体差异 vs 系统缺陷
- 团队协作：先 `TeamCreate` 再 spawn（`name` 用 Agent ID 如 `engineering-lead`）
- **派子代理前先固化「落盘状态核实」习惯**：子代理被会话中断后其口头进度不可信，接手时先 `git tag -l` / `ls 发布目录` / `git status` 实证核验再决定重跑范围（v1.2.1 发布中断教训：表面上"执行中"，实际零持久产出）
