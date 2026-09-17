# PvZ Lite · 项目长期记忆

## 项目速览
- 纯前端**单文件**游戏：`plants-vs-zombies.html`（近 2000 行，规模一律以 `docs/code-map.md` 头部为准，别写死行数），零依赖零构建，双击即玩，仅 PC 浏览器
- 七阶段工作室流程推进，产物分放 `design/` `docs/architecture/` `production/` `tests/`
- 改代码硬规则：**先查 `docs/code-map.md` 定位 → 只读目标区块 → 精确编辑**，禁止全文通读；改完重跑 `node tools/gen-code-map.mjs`
- 版本线：**v1.0.0 已封存**（commit `f6c81a5` / tag `v1.0.0`，发布包在 `production/release/v1.0.0/`，基线副本哈希 `713a9441…b1030deb` **不得改动**；标签已在远端）；**v1.1 进行中**（S1 ✅ / S2 ✅ / S3 ✅ / **S4 机器侧完成**：V11-10 执行包 ✅ · V11-11 性能基准 PASS ✅ · V11-12 发布包草案 v2 ✅——**实机 Playtest + 版本定版 + 冻结三件套待用户**，详见 `2026-09-17.md` 346 行起 S4 节）
- **远端**：`origin` = https://github.com/ysyonline/PvZlite（public）。本地分支已由 `master` 改名为 **`main`**（对齐远端默认分支）；`v1.0.0` 标签已推。**推送必须用 helper 覆盖**（见下「推送命令」），否则会挂在 PortableGit 的 `helper-selector` 上。**S3 4 提交已推送（2026-09-17 16:28），本地与远端同步于 `e6345d3`**。小坑：推送后本地 origin/main 引用可能短暂 `[gone]`，fetch 一次即恢复，推送本身是成功的

## ★ 新会话接手入口（开场必做，别重新摸索）
1. 读**日期最新**的那份 `.workbuddy/memory/YYYY-MM-DD.md` 末尾的「📌 新会话接手指南」（当前是 `2026-09-17.md` **L269 起的 16:30 S3 完结版**，开头有「⓪ S4 开工入口」节）——里面是开工入口 / 状态速览 / 测试基线 / 硬规则 / 变异配方 / 推送命令 / 下一步 / 教训
2. 读 `production/v1.1-plan.md` 确认当前冲刺与剩余项（当前任务 = S4：V11-10 Playtest / V11-11 性能基准 / V11-12 发布包）
3. 开工前先跑一遍三件套门控（下表），确认起点是绿的，再动代码

## 测试资产真实状态（重要，2026-09-17 S3 后核实）
- **三个可执行门控全部存在且全绿**：
  | 门控 | 命令 | 基线 |
  |---|---|---|
  | 烟雾 | `tests/harness/run-smoke.js` | **24/24**（S3 新增 SMOKE-024） |
  | 回归 | `tests/harness/run-all.js` | **30/30**（`--all` = 54/54） |
  | 音频总线 | `tests/harness/verify-bus.js` | **55/55** |
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
- **REG-END-02 已有意平移**：原断言「LEVELS[3]===undefined」，L3 上线后改为锁 `LEVELS[4]===undefined`（setLevel(3)+forceWaves(7)），属设计变更后过时假设修正，非弱化
- **harness ctx 是 Proxy 桩**：改 ctx 方法名的变异测不出（调用被容错吞）；render 变异必须用「未定义变量 ReferenceError」类写法。render 断言套路：console.error 监视网 + `rafQueue.shift()` 手动消费真帧
- GDD 正文数值必须逐波复算互证（本次又见"34 vs 实际33"笔误）；日 志 详 见 `2026-09-17.md` 末尾 S3 节
