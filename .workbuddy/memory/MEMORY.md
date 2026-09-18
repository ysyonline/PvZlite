# PvZ Lite · 项目长期记忆

## 项目速览
- 纯前端**单文件**游戏：`plants-vs-zombies.html`（近 2000 行，规模一律以 `docs/code-map.md` 头部为准，别写死行数），零依赖零构建，双击即玩，仅 PC 浏览器
- 七阶段工作室流程推进，产物分放 `design/` `docs/architecture/` `production/` `tests/`
- 改代码硬规则：**先查 `docs/code-map.md` 定位 → 只读目标区块 → 精确编辑**，禁止全文通读；改完重跑 `node tools/gen-code-map.mjs`
- 版本线：**v1.0.0 已封存**（commit `f6c81a5` / tag `v1.0.0`，发布包在 `production/release/v1.0.0/`，基线副本哈希 `713a9441…b1030deb` **不得改动**；标签已在远端）；**v1.1 已正式收官（2026-09-17 22:32）**：S1-S4 ✅ → `v1.1.0` 标签 `fc7b982` 已推远端 → **发布后跟踪四项全部闭环（T6 于 2026-09-18 05:4x 定案收官）**：N4/#8 量化复核 ✅、E5 Edge ✅、N2 README ✅、T6 双样本定案 ✅（样本 #2 3:00 时点第 5 波，判 PASS 项满足；CONCERNS→豁免→事后验证通过，历史不改写；报告 `round-2-report.md` v3 第十二节）。分发件 = 冻结副本（LF 哈希 `29bc5a36…9de7d6f1`，81,091 字节）
- **v1.2 进行中（2026-09-18 开工）· 方案 A「泳池」**：Phase 1-2 完成（GDD `design/gdd/level-4.md` v1.1 + 架构 `docs/architecture/v1.2-pool-terrain.md` + 总规划 `production/v1.2-plan.md`，已提交 `57bed4e`）。**V12-03 实现已完成（2026-09-18 10:1x-11:xx，六项拍板全按推荐通过后施工）**：源码 1985→2076 行（+91），WATER_ROWS=[1,3] + LEVELS[4]（8波38只 water:true）+ CARDS[6] lilypad 25费5s + 啃食倒序 + E4 铲子 A 案 + 水面渲染 + SMOKE-025（25 条烟雾）+ REG-END-02 平移 LEVELS[5]。**实现期发现架构文档两处漏洞已修正（须回写 v1.2-pool-terrain.md）**：①水轴校验原案全局生效会误拦 L1-L3（修 = `water:true` 关卡门控三处：校验/水面渲染/僵尸半浸）②插入代码未拒「有垫再点睡莲」（修 = 占用检查带 lilypad 条件）。**V12-03b 真机反馈修复轮（10:0x-10:3x，M1/M2 验收通过后 5 项全修）**：4x 失效根因 = startGame 重置 gameSpeed（修 = 声明处 `let gameSpeed=1` 定基，startGame 不重置、档位跨局保留，SMOKE-026 锁契约）+ 半浸 0.55→0.78 加腰线亮带 + 铲除返卡价一半向下取 25 倍数保底 25 + toast（偏离 GDD「无返还」）+ 入水水花粒子/涟漪（shockwave 新 water 字段）+ SFX.splash 入水声（偏离 GDD §7.1 零新音频，路由 battle，verify-bus 56 断言）。**修复后四道门控全绿：烟雾 26/26 · 回归 --all 56/56 · 总线 56/56 · bench PASS**；code-map 已重跑（**2111 行**/45 常量）；验收表 `tests/playtests/v12-acceptance.md` 升级（新增 M3b 入水反馈/M3c 4x 章节）。**工作树 12 文件未提交待用户授权**；待办：M3b/M3c 真机复验 → 提交推送
- **远端**：`origin` = https://github.com/ysyonline/PvZlite（public）。本地分支已由 `master` 改名为 **`main`**（对齐远端默认分支）；`v1.0.0`/`v1.1.0`/`v1.2.0` 标签均已推。**推送必须用 helper 覆盖**（见下「推送命令」），否则会挂在 PortableGit 的 `helper-selector` 上。**v1.1 已定版**：`v1.1.0` 标签打在 `fc7b982` 并已推远端（22:1x，ls-remote 权威核验一致）。**push 后引用核验坑（本机确定性复现）**：推送成功后 `git status -sb` 可能显示 `[ahead N]`/`[gone]`——**推送本身成功**，真伪以 `git ls-remote origin main` 为准；修复引用 = 直接 `sed` 改 `.git/packed-refs` 里 `refs/remotes/origin/main` 行为远端真实完整哈希（**必须用 `git ls-remote` 拿到的完整 40 位哈希，短哈希补零会写坏**），改完 `git status -sb` 即同步
- **🎉 v1.2.0 已定版发布（2026-09-18 13:24 用户授权「点头」，13:3x 落地）**：commit `1398186` / tag `v1.2.0`（tag 对象 `265f72d`）均已推远端；发布包 `production/release/v1.2/`（RELEASE-NOTES/KNOWN-ISSUES/RELEASE-CHECKLIST 三件套定稿 v1.0 + artifacts 冻结副本 **2111 行 / 89,296 字节 / LF SHA-256 `ebbfdb34…4ffb1`，只读**）；README 已同步四关口径。**线上最新版 = v1.2.0（四关七植物）**。遗留三项全不阻塞：①M5 真机整局 + M7-7.1 体感（用户游玩回传）②软验收 3 项 ③优化池 O1-O3（入水声改噗通/游动哗哗哗/腿部遮挡，`v1.2-plan.md` §六，下次迭代）

## ★ 新会话接手入口（开场必做，别重新摸索）
1. 读**日期最新**的那份 `.workbuddy/memory/YYYY-MM-DD.md` 末尾的「📌 新会话接手指南」（当前是 **`2026-09-18.md` 13:4x 归档版**，文件内更早节仅作历史参考，**以末尾那份为准**）
2. **当前状态 = v1.2.0 已定版发布并推远端，工作树全净，无挂起动作**——待办三项全不阻塞（M5 真机 / 软验收 / 优化池 O1-O3），用户提下次迭代时从优化池或新方向立项
   - **E5/N4 复核方法沉淀（2026-09-17 23:30 实证）**：浏览器自动化走 **Edge headless + CDP**（`--remote-debugging-port=9333` + Node 22 内置 WebSocket/fetch，零依赖），不必装 agent-browser/Chromium（本机 agent-browser 未装且 ~500MB）。要点：① PowerShell 起 Edge 子进程会随会话结束被清理，**必须在同一 bash 命令内启动+跑 runner**；② 真实点击用 `Input.dispatchMouseEvent`，坐标按 `getBoundingClientRect` 从画布逻辑坐标(1000×680)换算；③ 帧采样 = 页内 rAF 钩子 + `Performance.getMetrics` 增量；④ **`--disable-gpu` 会让 p95 虚涨到 33ms（软渲染 jank 13.7%），开 GPU 后 0.57%——性能结论必须用 GPU 轮**；⑤ 菜单按钮坐标：L3(660,275)/地狱(640,368)/开始(500,510)，向日葵卡(125,639)+格(190,132)
3. **v1.2.0 为线上版本基线**：改源码须走新版本流程，不得直接改后覆盖分发；三处 `production/release/v1.0.0|v1.1|v1.2/` 冻结产物只读
4. 若要动代码前，先跑四道门控（下表）确认起点是绿的
5. 需要团队协作时：先 `TeamCreate`，再 spawn 对应成员（`quality-lead` / `release-ops-lead` / `engineering-lead` 等 Agent ID）
6. **换电脑开工**：clone `https://github.com/ysyonline/PvZlite.git` 后核对源码哈希——**必须用 `git show HEAD:plants-vs-zombies.html | sha256sum`（或 `tr -d '\r'` 去 CR 后再算）**，Windows `autocrlf=true` 下直接 `sha256sum` 文件必然虚警（多 1985 个 `\r`）；详见 `2026-09-17.md` 末尾指南第五/七节
7. **push 后引用核验坑（本机确定性复现）**：push 成功但 `status -sb` 显示 `[ahead N]`/`[gone]` 时，用 `git ls-remote origin main` 取完整哈希 sed 直改 `.git/packed-refs` 的 origin/main 行；packed-refs 必须保持字典序（heads → remotes → tags）
8. **bench 回填是幂等正常现象**：重跑 `tests/perf/bench.js` 会重写 `docs/architecture/perf-profile.md` §7，工作区出现该文件 `M` 属预期，非源码改动；源码冻结口径 = git 对象哈希（LF）

## 测试资产真实状态（2026-09-18 v1.2 定版核实）
- **三个可执行门控全部存在且全绿**：
  | 门控 | 命令 | 基线 |
  |---|---|---|
  | 烟雾 | `tests/harness/run-smoke.js` | **26/26**（v1.2 新增 SMOKE-025/026） |
  | 回归 | `tests/harness/run-all.js` | **30/30**（`--all` = 56/56） |
  | 音频总线 | `tests/harness/verify-bus.js` | **56/56**（+splash 路由） |
  | bench | `tests/perf/bench.js` | **四场景 PASS**（v1.2 新增场景 D = L4 末波地狱水景） |
- Node 绝对路径：`C:\Users\user3667\.workbuddy\binaries\node\versions\22.22.2-3\node.exe`（**目录名带 `-3` 后缀**，旧记的 `22.22.2` 已不存在）
- Bash 易被 shim 污染：命令开头统一 `export PATH="/usr/bin:/bin:/mingw64/bin:/c/Windows/System32:/c/Windows"; unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY`

## 工具环境约定
- **调度专家团成员必须两步走**：① 主理人先 `TeamCreate` 建团队 ② 再用 Agent 工具传 `name` + `subagent_type`（成员 Agent ID，如 `release-ops-lead`，禁止用中文花名）。**跳过 TeamCreate 会报 `No active team found`**
- 成员产出回传给 main/team-lead 后由主理人汇编；成员之间禁止直连
- 无用户许可不 Write/Edit 文件、不 git commit
- **禁止对同一文件并行发多个 Edit**：并发写入互相覆盖，部分改动静默丢失（工具仍各自报"成功"）。改完必须 `grep -n` 逐条核对落点
- **`git add` 别带不存在的路径**：任一 pathspec 不匹配（如已删除的文件）会让**整个 add 失败**，其它文件一起漏加；配 `2>/dev/null` 时连报错都看不到 → 提交信息与内容不符。**提交后必看一次 `git show --stat`**。补救：未推送的提交可 `git commit --amend`（已推送的不要 amend）
- 仓库已有 `.gitignore`（忽略 `.tmp/`、`.mutcheck/`、`node_modules/`、`dist/`、`build/` 等）；变异测试仍用 `.mutcheck/`，已被忽略不会误提交

## 推送命令（必须照抄，否则挂死）
PortableGit 系统配置里有 `credential.helper = helper-selector`，它在无终端时会弹图形框、**永久挂起**（比 GCM 先执行）。必须用命令行覆盖 helper 列表：

```bash
export PATH="/usr/bin:/bin:/mingw64/bin:/c/Windows/System32:/c/Windows"; unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY
cd /d/code/zw
GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=Never git -c credential.helper= \
  -c credential.helper='!"C:/Users/user3667/.workbuddy/binaries/PortableGit/versions/1.2.0/mingw64/bin/git-credential-manager.exe"' \
  push -u origin main
```
- `credential.helper=`（空值）作用是**清空** helper 列表，再只挂 GCM；**不要**去改全局/系统配置
- GitHub 凭据已存在 GCM（`username=ysyonline`），无需重新授权；直连与 7890 代理两条通道都通，推送无需配代理
- 无鉴权操作（`ls-remote`/`fetch` 公开仓库）不受影响，不需要覆盖

## 音频层历史结论（防重复排障）
- 「开局无声」根因是 **USB 声卡驱动的静音功率门控**：数字静音保活无效，必须**真实非零样本**。解法 = `initAudioBus` 起常驻 17.5kHz@0.005 振荡器**直连 destination**（不走 master），SMOKE-017 守护
- 合成 BGM 可闻性按「总线衰减后 × 设备频响」标定，不能只看节点音量数值
- 诊断页 `tools/audio-diag*.html` 5 个保留复用
- **v1.1 S2 已补齐 B1–B10 + `sirenLoop`**：规格 `design/audio-guide.md`（§I 是「以代码为准」的实现状态节，§I.4 是验收记录），触发契约由 `SMOKE-022/023` 锁定。**2026-09-17 用户真机听感验收通过**（P0 三项可闻、警报 loop 不吵），已提交 `c38662b`
  - 命名偏差（有意）：B1 并入 `SFX.plant`、B4 用 `SFX.death(type)` 参数分派、B5 `melonThrow` 独立节流键（与 shoot 共用会互相吞）
  - 警报 loop 用**帧驱动 `SirenLoop`**（非 setInterval）：暂停天然同步停、横幅结束当帧 stop、无头可测
  - 未实现（有意）：§D.3 预警期 battleGain 降 0.7

## S3 第三关结论（2026-09-17，防重复摸索）
- **「月夜草坪」已实现未提交**：7 波 33 只（normal15/cone8/fast8/bucket2），big=W3/W5/W7，startSun=100，night 冷蓝滤镜；契约由 `SMOKE-024`（26 断言，含 render 真帧验证）锁定
- **bucket 零成本红利**：铁桶僵尸全链路（STATS/绘制/尸体/音效/计分）早已就绪但 L1/L2 未配，新关配上即得新单位，零新代码——后续加内容先查现成能力
- **REG-END-02 已有意平移**：原断言「LEVELS[3]===undefined」，L3 上线后改为锁 `LEVELS[4]===undefined`（setLevel(3)+forceWaves(7)），属设计变更后过时假设修正，非弱化；**v1.2 L4 上线后再平移至锁 `LEVELS[5]===undefined`**（方案已备：v1.2-pool-terrain.md §5.1）
- **harness ctx 是 Proxy 桩**：改 ctx 方法名的变异测不出（调用被容错吞）；render 变异必须用「未定义变量 ReferenceError」类写法。render 断言套路：console.error 监视网 + `rafQueue.shift()` 手动消费真帧
- GDD 正文数值必须逐波复算互证（L4 GDD 已按此执行，三口径互证通过）；日志详见 `2026-09-17.md` 末尾 S3 节

## T6 双样本方法论（2026-09-18 沉淀）
- 单值样本可定案：判定只依赖一个观测点（3:00 时点波次）时，核心值到手即可闭合；但**缺项必须披露、不外推其它结论**（样本 #2 仅回传 1 值，记录表其余栏位维持空白 + 表内披露）
- 双样本矛盾时的解读顺序：先查"个体差异 vs 系统缺陷"（#1 未过线 + #2 大幅过线 → 个体节奏差异），勿据单样本调难度
- 历史判定不改写原则：豁免后的事后验证通过 → 记录为"豁免被数据支持"，不追溯改判
