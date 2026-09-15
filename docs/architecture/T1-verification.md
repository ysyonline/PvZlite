# T1 · 音频总线重构 核验报告

- 任务：P6.5-T1（总线 + ADR-004 + noise 预生成 + D-14 等宽字）
- 核验人：主理人（游承峰）· 2026-09-15
- 基线 commit：`efa9cab`

---

## 背景

工程总监（程基岩）在 T1 上三次跑满轮次上限被截断（40/30/30）。**总线代码本身在第一次被截断前已写进 `plants-vs-zombies.html`**，但：
- `verify-bus.js`（他留下的核验脚本，30 条断言）依赖的 `probeBus`/`__noise`/`__routeBus` 探针**没挂到 harness 的 `__api`**，导致脚本崩在第 1 个断言（`g.probeBus is not a function`）。
- ADR-004 / T1-verification 文档未产出。

主理人直接接手：补 harness 探针 + 补两份文档 + 重跑核验。**未改动游戏 html**（核验确认其已完整且语法干净）。

---

## 核验结果

### 1. 游戏代码健康度（`node --check` 抽 `<script>`）

| 项 | 结果 |
|---|---|
| `plants-vs-zombies.html`（1448 行）语法 | ✅ `node --check` 通过，无 SyntaxError |
| `AudioBus`（4 分组 + master）结构 | ✅ 完整（L157-160） |
| `initAudioBus` 幂等 | ✅ 同 ctx 只建一次（L168） |
| noise 缓冲预生成 3 档（0.1/0.3/0.5s） | ✅ L181-187，`createBuffer` 仅初始化 3 次 |
| `noise(dur)` 就近取预生成 buffer 复用 | ✅ L210-217，不再每帧新建 buffer |
| 13 音效按 `AUDIO_ROUTES` 路由 | ✅ plant/sun/shovel/deny=ui；shoot/hit/death/boom/chomp=battle；wave/siren/win/lose=event |
| 静音走 `masterGain.gain=0` 主闸 | ✅ L336-337，不再业务层短路 |

### 2. 修复项（主理人）

| 文件 | 改动 |
|---|---|
| `tests/harness/index.js` | `PROBE_SUFFIX` 补挂 `probeBus` / `__noise` / `__routeBus` / `__sfxGate` 探针（verify-bus.js 依赖） |
| `docs/architecture/ADR-004-webaudio-bus-architecture.md` | 新增（4 分组总线 + masterGain + noise 预生成决策，3 备选否决，4 条复审信号） |
| `docs/architecture/T1-verification.md` | 本文件 |

### 3. 核验脚本结论

- `node tests/harness/verify-bus.js` → **30/30 PASS**（幂等 / 路由完整 / 静音主闸 / 异常隔离 / 静默降级 全通过）。
- `node tests/harness/run-smoke.js` → 烟雾用例全绿（含 H5 RNG 种子复现）。

---

## 门控判定

**PASS** — 总线重构幂等安全、路由完整、静默降级正常、主循环异常隔离未破坏。无阻塞 bug，html 无需修正。

## 遗留 / 下一 sprint

- `muted` 偏好持久化（localStorage）：audio-guide §G 待审批项，Phase 6.5 不强制，留 Phase 7 或后续。
- BGM 方案 C（仅 4s 大波警报紧张 loop）：总线已就绪挂载点，实施留 Phase 6.5 音频 P0+P1 音效落地时一起。
