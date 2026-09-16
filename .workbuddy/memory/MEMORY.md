# PvZ Lite · 项目长期记忆

## 项目速览
- 纯前端**单文件**游戏：`plants-vs-zombies.html`（约 1840 行），零依赖零构建，双击即玩，仅 PC 浏览器
- 七阶段工作室流程推进，产物分放 `design/` `docs/architecture/` `production/` `tests/`
- 改代码硬规则：**先查 `docs/code-map.md` 定位 → 只读目标区块 → 精确编辑**，禁止全文通读；改完重跑 `node tools/gen-code-map.mjs`

## 测试资产真实状态（重要，2026-09-16 核实）
- **可执行门控只有两个**：烟雾 19 条（`tests/harness/run-smoke.js`）+ 音频总线 47 条（`tests/harness/verify-bus.js`）
- **`tests/harness/run-all.js` 不存在**；`regression-plan.md` 第 3 节所列 26 条 REG-* 用例**从未实现为代码**（只有计划文档）
- Node 用绝对路径：`C:\Users\user3667\.workbuddy\binaries\node\versions\22.22.2\node.exe`
- 文档口径不一致（待整改）：`tests/README.md` 写「烟雾 17 条」（实际 19）、`regression-plan.md` 写「≤10 条」、`production/phase6-handoff.md` 写「10 条」

## 工具环境约定
- **调度专家团成员必须两步走**：① 主理人先 `TeamCreate` 建团队 ② 再用 Agent 工具传 `name` + `subagent_type`（成员 Agent ID，如 `release-ops-lead`，禁止用中文花名）。**跳过 TeamCreate 会报 `No active team found`**
- 成员产出回传给 main/team-lead 后由主理人汇编；成员之间禁止直连
- 无用户许可不 Write/Edit 文件、不 git commit

## 音频层历史结论（防重复排障）
- 「开局无声」根因是 **USB 声卡驱动的静音功率门控**：数字静音保活无效，必须**真实非零样本**。解法 = `initAudioBus` 起常驻 17.5kHz@0.005 振荡器**直连 destination**（不走 master），SMOKE-017 守护
- 合成 BGM 可闻性按「总线衰减后 × 设备频响」标定，不能只看节点音量数值
- 诊断页 `tools/audio-diag*.html` 5 个保留复用
