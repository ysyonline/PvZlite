# PvZ Lite · 项目长期记忆

## 项目与版本线
- 纯前端**单文件**游戏 `plants-vs-zombies.html`，零依赖零构建，双击即玩，仅 PC；规模一律以 `docs/code-map.md` 头部为准（别写死行数）
- 硬规则：**code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`**；禁止同文件并行 Edit；无用户许可不 Write/Edit/commit
- 版本线：v1.0.0 / v1.1.0 / v1.2.0（tag `265f72d`/commit `1398186` 已推远端）/ **v1.2.1 已发**（tag `f5d660d` 已推，发布包 `production/release/v1.2.1/`）；三处发布包 `production/release/v1.0.0|v1.1|v1.2/` 冻结只读
- 改源码须走新版本流程，不得覆盖分发件；v1.2 发布后跟踪已全闭环（M5 ≈4min/地狱≈7min、M7-7.1、软验收不空/顺/能）

## 当前状态（2026-09-19 13:5x 更新）
- **远端最新**：origin/main=`e736c62`（M5 投手数值对齐刀，已推）· v1.2.1 tag=`f5d660d`；工作树：M3 视觉资产未跟踪待提交（`design/assets/m3-rooftop-concept/`〔图×2+说明〕+ `production/v13-m3-visual-impl-spec.md` + `.workbuddy/tmp-png-sample.js`，等授权）
- **v1.2.1 正式版已发**：tag 锚定 `f5d660d`；发布包 `production/release/v1.2.1/`（三件套+冻结副本）
- **★ git 推送姿势更新（用户开加速器后）**：shell 里 WorkBuddy 注入 `http_proxy=127.0.0.1:53505` 会劫持 git——必须 `unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY` 且加 `-c http.proxy= -c https.proxy=` 直连；完整命令见 `2026-09-19.md` 归档节
- **v1.3 屋顶关：M3 视觉返工全链路就绪（开工在即）**。M1✅M2✅M4✅M5✅M6✅（M7 门控/M8 性能机器验证全绿）；M3 流程：概念图 → v2「系统可实现版」效果图**过审**（用户「通过，推进落地」）→ 工程《施工规格》472 行交付 `production/v13-m3-visual-impl-spec.md`（§11 十二项默认建议，用户无异议）；**用户拍板：本会话不开工、归档、新会话开工**；源码零改动
- **M5 投手数值已三刀对齐原版 PvZ**（`e736c62`）：**100 阳光/40 伤害/3.0s 射速**（旧 150/30/2.0；dps 13.3，豌豆 12.5）；测试同步 SMOKE-025/027 + REG-PULT-01/02 + REG-ROOF-01 全绿（27/60/56/bench PASS）；铲投手返还随 cost 变 50（动态公式 cost/2 取整 25 倍数）
- **下一步（新会话开场即行）**：① **M3 施工开工**——按规格分批（批A 天空+城垛 ≈+22 行 → 真机验收 → 批B 斜缝+光渐变 ≈+13 行 → 验收；每批 `gen-code-map` + 四门控）；② M3 闭环后 **v1.3 定版**（VERSION 改 v1.3 → 四门控 → tag+发布包，过优化池核对固定节）。详见 `2026-09-19.md` 接手指南（13:5x 归档版）
- 优化池 O1/O2/O4 🧊 冻结继承不变；N-13/N-14 冻结不变
- **V13-S2 已完成**：四道门控全绿——烟雾 27/27 · 回归 --all 60/60（27 S+33 R）· 总线 56/56 · bench 五场景 PASS。
- **屋顶线核心定案不变**：卡数=9（planter@7/cabbage@8）、roof:true&&water:false 互斥、CARDS 只 append、CABBAGE_VX=260/G=500。菜单关卡按钮已扩 5（190 基准右缘 970<1000）
- **M3 视觉方案核心（已定稿，规格 §3）**：「倾斜」=纯绘制层 4 手段——①天空带+地平线 ②屋脊城垛〔现城垛画反在底部，需上移〕③斜向砖缝〔核心；手动端点剪切+clip，`ROOF_SLOPE=0.15` 正号右倾〕④对角光渐变；≈+35 行核心、零触碰 gridToPos/弹道/种植；红线：全隔离 `if(level.roof)`、禁 `ctx.filter`、禁读 `ctx.canvas.width`（桩里是函数，用 DOM `canvas.width`）
- **施工坑（已修）**：注入式多段测试每段结束必须清场（REG-PULT-01 静止目标替移动目标挡弹教训）；盆上种豌豆=125 非 175（费用按所种卡算）；**同文件多处 Edit 有并行竞态（REG-ROOF-01 ③ 段静默未落盘，回归 59/60 暴露）——编辑后必须 grep/Read 回验**
- **GDD/文档**：`design/gdd/level-5.md` + `docs/architecture/v1.3-roof-projectile.md` + `production/v1.3-plan.md` + `production/v13-s1-foundation-review.md` + `production/v13-m3-visual-impl-spec.md`（M3 施工规格 · 新）（接手必读）
- **屋顶线历史**：S1 地基与护栏（G1/G2 双门 PASS）→ S2 全量实现（2278 行；SMOKE-027/REG-PULT-01/02/REG-ROOF-01 全绿）均已归档；详见 `2026-09-19.md`
- **优化池 O1/O2/O4 全部 🧊 冻结，捆绑同批解决**（用户 21:21 拍板：版本尚不稳定）：O1 入水噗通 + O2 哗哗哗（合成路线已否，候选=采样 base64/物理建模）+ O4 僵尸 AI 贴图（乙案）——三项共享「资产内嵌」决策，版本稳定后一次拍板统一做。O4 提示词首版已备好 `design/assets/o4-zombie-prompts.md`，解冻即用（登记源 `v1.2-plan §六/§七`，冻结态已回写 §八 P4）
- **★ 发版检查新增固定节（用户 16:26 拍板「以防忘记」）**：每次定版发布，RELEASE-CHECKLIST 在 Go/No-Go 前必须加「优化池核对」节，逐项核对 O1-O4 + N-13/N-14 冻结项，给出「已处理/不处理+理由」；**登记源 = `v1.2-plan §八`**（P1-P5 表），发布包内放快照
- N-13 多语言 / N-14 移动端：**不做、优先级最低**，大版本时确认（🧊 冻结）

## 门控基线（改源码后必须全绿）
| 门控 | 命令 | 基线 |
|---|---|---|
| 烟雾 | `tests/harness/run-smoke.js` | 27/27 |
| 回归 | `tests/harness/run-all.js --all` | 60/60（默认 REG 33/33） |
| 音频总线 | `tests/harness/verify-bus.js` | 56/56（v1.3 零新键维持） |
| bench | `tests/perf/bench.js` | 五场景 PASS（D=L4 水景地狱 · E=L5 屋顶地狱；E 历史口径 perf-profile §7=0.90/1.94，施工后以本机复跑为准） |

## 环境与命令
- Node（本机）：`C:\Users\weixufeng\.workbuddy\binaries\node\versions\22.22.2-3\node.exe`（带 `-3` 后缀；旧机路径结构同，用户名为 user3667）
- Bash 每命令开头：`export PATH="/usr/bin:/bin:/mingw64/bin:/c/Windows/System32:/c/Windows"; unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY`
- 推送（加速器直连 + helper 覆盖，完整命令见 `2026-09-19.md` 归档节）：
```bash
GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=Never git -c http.proxy= -c https.proxy= \
  -c credential.helper= -c credential.helper='!"C:/Users/weixufeng/.workbuddy/binaries/PortableGit/versions/1.2.0/mingw64/bin/git-credential-manager.exe"' \
  push -u origin main
```

## 关键坑与方法论（防重复摸索）
- **push 后 `[ahead N]`/`[gone]` 是假象**：以 `git ls-remote origin main` 为准；修复 = 拿完整 40 位哈希 sed 直改 `.git/packed-refs` 的 origin/main 行（短哈希补零会写坏）
- `git add` 别带不存在路径（整体失败）；提交后必看 `git show --stat`；已推送的不要 amend
- 换电脑哈希核验：`git show HEAD:plants-vs-zombies.html | sha256sum`（直接 sha256sum 文件会因 autocrlf 虚警）
- 浏览器自动化：**Edge headless + CDP**（`--remote-debugging-port=9333`，Node 22 内置 WebSocket），别装 agent-browser；真实点击 `Input.dispatchMouseEvent`；**性能结论必须开 GPU 轮**（`--disable-gpu` 假象 jank 13.7%）；**像素级视觉验证**：页内 `<canvas>` 可 `getImageData` 采样判读（范例 `tests/playtests/o3-final-verify.js`）；辅助工具 `.workbuddy/tmp-png-sample.js`（PNG 色相网格/区域均值/剖面采样，判读构图）
- **WebAudio 合成音色天花板（O1/O2 冻结教训）**：噗通/哗哗哗两次参数方案（v1.2 噪声型 / v1.2.1 低频 tone+noise）真机均被否——落水声这类瞬态质感，参数合成难以逼真，换方案再启（预录采样 base64 需先拍板零依赖取舍）
- **SFX 异常包裹层会吞合成错误**——SMOKE-014 计数断言是唯一曝光口（`opt._wadePad` ReferenceError 教训：解构签名函数内别引用外层名）
- **画面反馈与代码不符时先查旧标签页**：单文件游戏改动后用户若未强刷，看到的是旧版渲染（O3「见腿」误报成因之一）
- 音频：USB 声卡静音功率门控 → `initAudioBus` 常驻 17.5kHz@0.005 振荡器直连 destination（SMOKE-017 守护）；v1.2 `SFX.splash`（noise+tone 520→170，路由 battle，gate 0.3s）
- SFX 命名偏差（有意）：B1→`SFX.plant`、B4→`SFX.death(type)`、`melonThrow` 独立节流键
- harness ctx 是 Proxy 桩：render 变异须「未定义变量 ReferenceError」写法；连续铲两格各重选铲子；豌豆是 CARDS[1]；**M3 施工注意：桩里 `ctx.canvas` 是函数，禁读 `ctx.canvas.width`（用 DOM `canvas.width`）**
- REG-END-02 现锁 `LEVELS[6]===undefined`（S2 已平移；下个新关上线后再平移）
- 新内容先查现成能力（bucket 零成本红利）；bench 回填 perf-profile §7 幂等正常
- T6 方法论：单值样本可定案但缺项必须披露；双样本矛盾先查个体差异 vs 系统缺陷
- 团队协作：先 `TeamCreate` 再 spawn（`name` 用 Agent ID 如 `engineering-lead`）
