# PvZ Lite v1.1 · 发布后跟踪复核报告（E5 + N4/#8 + 附带 N2）

- **执行日期**：2026-09-17 23:30–23:40（GMT+8）
- **执行方式**：Edge headless（真 Blink 引擎）+ Chrome DevTools Protocol（CDP）自动化——**真实 DOM 加载 + 真实鼠标事件路径**（`Input.dispatchMouseEvent`），非注入状态机的模拟点击；量化采样用页内 rAF 钩子 + CDP Performance.getMetrics
- **执行者**：主理人（机器侧自动执行）；报告撰写与判级：主理人，待用户确认
- **复核目标**（= v1.1 收官时用户拍板的「发布后跟踪四项」中的三项）：
  - **E5**：Edge 浏览器跑一局（RELEASE-CHECKLIST E 节遗留未验证项）
  - **N4 / #8 残留**：L3 地狱 4× 末波量化帧率（KNOWN-ISSUES N4；附带完成 #8「真机 DevTools 复核」的自动化等价形态）
  - **N2**：README 教学示例改名（纯文档项，本会话已顺手完成，见 §4）

---

## 1. 结论速览

| 项 | 判定 | 核心证据 |
|---|---|---|
| **E5 Edge** | **✅ PASS** | Edg/153.0.4234.32 真实点击完整流程：菜单→选 L3→地狱→开局→4×→种植→强推 W7→败局结算，状态机迁移全部正确，**全程 0 console error / 0 exception / 0 帧异常（frameErrT=0）**，截图画面完整 |
| **N4 量化** | **✅ PASS（headless 自动化口径）** | S2 压力场景（对齐 bench 场景 C：12 植物+25 僵尸含 2 bucket，expert 4×）：**530 帧中 p50=16.7ms、p95=18.5ms、max=20.6ms，仅 3 帧 >20ms（0.57%）**——近乎满 60fps；JS 每帧 ~2.5ms，与无头基准 §7（p95 0.47ms JS-only）量级自洽 |
| N2 README | ✅ 已完成 | 教学示例改 `4:{ name:'第四关 · 示例关卡' }` 中性名 + 注明「示例数据，非实际关卡」 |

**#8 残留（真机 DevTools Performance 复核）**：本次以「Edge headless + rAF 帧间隔采样 + CDP Performance.getMetrics」完成**自动化等价复核**。若要严格意义的「真机可视窗口 DevTools 面板人工复核」，仍可再做一次（见 §5 局限）；但量化结论已具备，**建议据此闭合 N4 与 #8 残留**。

---

## 2. 环境与证据链

| 项 | 值 |
|---|---|
| 浏览器 | Microsoft Edge **153.0.4234.32**（headless=new） |
| 分发对象 | `plants-vs-zombies.html`（v1.1.0 冻结母本，本地静态服务器 `127.0.0.1:8931`，HTTP 200） |
| 页面版本自证 | 页内 `VERSION === 'v1.1.0'`（CDP Runtime.evaluate 读取） |
| 主机 | i3-10110U（与 §7 无头基准同机）· Windows · 2 轮（`--disable-gpu` 软渲染轮 + GPU 轮） |
| 采样 | 页内独立 rAF 钩子记录帧间隔；每场景 ~8s 真实时间（≈520 帧窗口） |
| 证据文件 | `tests/e5n4-evidence-backup/`：`e5n4-results-gpu.json`（GPU 轮全量数据）/ `e5n4-stdout-gpu.txt` / `e5n4-stdout-swring.txt`（软渲染轮对照）/ 两张场景截图 PNG / `e5n4-runner.mjs`（可复现运行器） |

## 3. S1 · E5 功能流程（真实点击路径）

逐步 CDP 鼠标事件（像素坐标按 `getBoundingClientRect` 从画布逻辑坐标换算）：

| 步骤 | 操作 | 游戏内验证（CDP 回读） |
|---|---|---|
| 1 | 加载 `?level=3`（解锁） | `state='menu'`，VERSION v1.1.0 |
| 2 | 点击 L3 按钮（画布 660,275） | `levelNo=3` ✅（菜单命中判定正确） |
| 3 | 点击「地狱」难度（640,368） | `DIFF='expert'` ✅ |
| 4 | 点击「开始游戏」（500,510） | `state='play'`, gt 走表 ✅ |
| 5 | 点击加速按钮 ×2（DOM 事件） | `gameSpeed=4` ✅ |
| 6 | 点击向日葵卡片 + 草坪格（1,0） | `plants.length=1` ✅（种植点击路径真实生效） |
| 7 | 强推第 7 波（newWave(7)，hp×3 防提前清场） | 队列 8 只，真实波次状态机 |
| 8 | 采样 ~8s 后 | 自然推进到败局：`state='end'`, won=false, **frameErrT=0, frameErr=null** |
| 9 | 全程 console 监视网 | **0 error / 0 exception** ✅ |
| 10 | 截图 | `e5-s1-finalwave.png`（74.5KB，画面完整非空白） |

**判级：PASS**。Blink 引擎下完整对局流程状态机迁移全部正确、无任何报错与帧异常，与 Chrome（E4，S3 实机验收）行为一致。

## 4. S2 · N4 量化（bench 场景 C 对齐 + 4× 压力）

**场景构造**（页内执行，对齐 `tests/perf/bench.js` setupC 口径）：L3 night · expert（mult 1.8）· gameSpeed=4 · 12 植物 · 25 僵尸（normal15/cone8/fast8/bucket2 构成，hp×3 受控失真与 bench 一致）· 3 阳光；`wave=99` 冻结波次推进（采样窗内无新波/预警干扰，与 bench「模拟时长 < 12s 首波门槛」同目的）。

**两轮对照**（识别渲染路径影响）：

| 轮次 | 场景 | 帧 | p50 | p95 | max | >20ms | JS ms/帧 |
|---|---|---|---|---|---|---|---|
| **GPU 轮（定版口径）** | S1 真实对局 W7 4× | 523 | 16.7 | 16.8 | 21.4 | 1 (0.19%) | ~1.1 |
| **GPU 轮（定版口径）** | **S2 场景C 4× 压力** | **530** | **16.7** | **18.5** | **20.6** | **3 (0.57%)** | **~2.5** |
| 软渲染轮（--disable-gpu） | S2 场景C 4× 压力 | 461 | 16.7 | 33.3 | 33.4 | 63 (13.7%) | ~2.4 |

- **归因**：软渲染轮的 p95=33.3（恰 2 个 vsync 周期）完全由 `--disable-gpu` 软件光栅造成——两轮 JS 每帧耗时几乎相同（~2.4 vs ~2.5ms），GPU 轮 jank 立降到 0.57%。**游戏 JS 逻辑本身远未构成瓶颈**。
- **量级自洽**：本机真浏览器 JS ~2.5ms/帧（含真实 fillText 布局与调用编排）与 §7 无头基准 p95 0.47ms（JS-only 乐观下限）的关系符合「无头 ≠ 真机、但同量级偏乐观」的预期；真实瓶颈余量充足（16.7ms 预算用了 ~15%）。
- **heapMB**：1.4–2.6MB 量级，无泄漏迹象（短窗采样，仅参考）。

**判级：PASS（headless 自动化口径）**。「L3 地狱 4× 末波帧率达标」由「口述无异常」升级为**量化证据**：最坏压力场景 p95 帧间隔 18.5ms、99.4% 帧落在 20ms 内。

## 5. 方法局限（据实披露）

1. **headless 非可视窗口**：BeginFrame 由虚拟 vsync 驱动、无真实显示器合成路径。帧间隔分布可信（渲染主管线真实跑），但与「真人眼看到的卡顿」存在理论差异。若需最严格口径，可再补一次可视窗口 DevTools 人工 profile（预计 10 分钟用户操作）。
2. **采样窗 ≈8s/场景**：足够覆盖稳态压力与末波，但非全程局统计。
3. **E5 音频**：headless 下 AudioContext 静默，音频层未在 Edge 实测（S2 听感验收已在 Chrome 真机完成；Edge 与 Chrome 同内核音频栈，风险极低）。
4. **CRLF/哈希未涉**：本次仅加载本地服务器上的工作区文件（与冻结母本同源，前已核验 LF 哈希一致）。

## 6. 文档同步状态（本报告落档后）

| 文档 | 动作 |
|---|---|
| `production/release/v1.1/KNOWN-ISSUES.md` | #8 残留、N4 状态更新为「已闭合（发布后复核，自动化口径）」+ 指向本报告 |
| `production/release/v1.1/RELEASE-CHECKLIST.md` | E5 更新为 ✅ 已验证（指向本报告）；C14 同步 |
| `tests/playtests/round-3-report.md` | T10 量化数据补注（引用本报告） |
| `README.md` | N2 示例改名 ✅（本会话已完成，见下） |

> 分发件（冻结副本）不受影响——本轮全部为文档与 tests/ 证据，源码零改动。

### N2 改名内容（已完成）

- `README.md` L106-107：示例键 `3:` → `4:`，名称「第三关 · 泳池」→「**第四关 · 示例关卡**」，加注释「示例数据：演示『加第四关』的写法，非实际关卡」
- L120：菜单循环提示补「加到第四关则改 `i<=4` 并调 `bx` 基准——L3 上线时即如此改过」
- L194：待办 #2「第三关（泳池/屋顶）」改为已完成态（v1.1 S3 月夜草坪已上线），泳池/屋顶移为后续地形方向

---

## 7. 复现方式

```bash
# 1) 起本地静态服务器（托管 Python）
"C:/Users/weixufeng/.workbuddy/binaries/python/versions/3.13.12/python.exe" -m http.server 8931 --bind 127.0.0.1 &

# 2) 起 Edge headless + CDP
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new \
  --remote-debugging-port=9333 --user-data-dir=<临时目录> about:blank &

# 3) 跑运行器（零依赖，Node ≥22，内置 WebSocket/fetch）
node tests/e5n4-evidence-backup/e5n4-runner.mjs
```

---

*报告完 · 主理人汇编 2026-09-17 23:45 · 源码零改动，全部为发布后跟踪与文档同步*
