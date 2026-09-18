# PvZ Lite · 项目长期记忆

## 项目与版本线
- 纯前端**单文件**游戏 `plants-vs-zombies.html`，零依赖零构建，双击即玩，仅 PC；规模一律以 `docs/code-map.md` 头部为准（别写死行数）
- 硬规则：**code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`**；禁止同文件并行 Edit；无用户许可不 Write/Edit/commit
- 版本线：v1.0.0 / v1.1.0 / v1.2.0 / **v1.2.1 已提交推送**（`6da6b2c` 功能刀 + `8e611d2` 记忆刀，2026-09-18 17:0x 远端核验一致，**tag v1.2.1 未打**）；三处发布包 `production/release/v1.0.0|v1.1|v1.2/` 冻结只读
- 改源码须走新版本流程，不得覆盖分发件；v1.2 发布后跟踪已全闭环（M5 ≈4min/地狱≈7min、M7-7.1、软验收不空/顺/能）

## 当前状态（2026-09-18 17:40 归档，换机交接版）
- **已闭环**：v1.2.1 两刀提交并推送成功（`6da6b2c` 功能刀 8 文件 / `8e611d2` 记忆刀 2 文件，`git ls-remote` 核验 `84e9b6d..8e611d2`），工作树全净；O3 真机复核通过，四道门控全绿
- **唯一挂起动作 = v1.2.1 正式版发布未完成**：用户已拍板「发正式版」（发布包四件套 + RELEASE-NOTES + tag），release-ops-lead 被会话中断，**零持久产出**（`production/release/v1.2.1/` 不存在、tag 本地远端均无）。新会话接手直接重跑发布流程即可，步骤见 `2026-09-18.md` 末尾指南
- **发布四步**：①复跑四道门控（Node 绝对路径）②建 `production/release/v1.2.1/` 四件套（artifacts 冻结副本 / RELEASE-NOTES / KNOWN-ISSUES / RELEASE-CHECKLIST——**首次执行 §八优化池核对节**：P1(O1)/P2(O2) 冻结不处理、P3(O3) 已处理、P4(O4) 待启动、P5(N-13/N-14) 非大版本）③`git tag -a v1.2.1` 于 HEAD 并推远端核验 ④发布包文件 commit 须再请示用户
- **O1/O2 音效 🧊 冻结**：换方案候选 = 预录采样 base64 / 物理建模（`v1.2-plan §六`）；**O4 僵尸形象精细化**待启动（乙案 · AI 生成资产，分工与硬约束在 `v1.2-plan §七`，用户说「出 O4 提示词」即开始）；两者共享「资产内嵌」决策
- **★ 发版检查固定节**：每次定版发布，RELEASE-CHECKLIST 在 Go/No-Go 前必须过「优化池核对」节；登记源 = `v1.2-plan §八`（P1-P5 表）
- N-13 多语言 / N-14 移动端：**不做、优先级最低**，大版本时确认（🧊 冻结）
- 详见当日 `2026-09-18.md` 末尾「📌 新会话接手指南」

## 门控基线（改源码后必须全绿）
| 门控 | 命令 | 基线 |
|---|---|---|
| 烟雾 | `tests/harness/run-smoke.js` | 26/26 |
| 回归 | `tests/harness/run-all.js --all` | 56/56（默认 30/30） |
| 音频总线 | `tests/harness/verify-bus.js` | 56/56（v1.2.1 O2 回退后与 v1.2.0 持平） |
| bench | `tests/perf/bench.js` | 四场景 PASS（D=L4 地狱水景） |

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
