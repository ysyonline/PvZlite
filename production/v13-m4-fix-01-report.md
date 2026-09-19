# V13-M4-FIX-01 施工报告 · 直线弹贴坡 + L1/L2 全波次出怪串行门（**v2 口径修订版**）

- **任务**：V13-M4-FIX-01（Task #3，owner=engineering-lead/程基岩）
- **v2 修订说明**：本报告原为「L5 前三波门」口径（v1）。用户 **2026-09-19 20:52 变更节奏门口径**（team-lead 20:53 追单），v2 已按新口径全部返工并复验：**串行门 gating 由 `level.roof && wave 1–3` 改为 `levelNo ∈ {1,2}`（全波次）**；L3/L4/L5 不适用。Fix 1（贴坡弹道）不受口径变更影响，v1 内容原样有效。
- **日期**：2026-09-19（v1 当日完成；v2 同日返工）
- **依据**：主理人派单 + 20:52 口径变更 + 返工单；`production/v13-m4-impl-report.md`（ENG-03 基线）
- **源文件**：`plants-vs-zombies.html`（2408 → **2430 行**；code-map 已刷新：2430 行 / 69 函数 / 51 常量）
- **红线遵守**：cabbage 抛物分支零触碰；L3/L4/L5 出怪路径零触碰（gating 短路）；无 git commit

---

## 1. 逐项改动清单（实测行号 · v2 · 2430 行版口径）

> 全程 Grep 重定位，未沿用派单行号。

| # | 块 | 实测行号 | 改动 |
|---|---|---|---|
| F1a | `updatePlant` 直线弹发射（pea/double/melon 四条 `push`） | L1000–L1007 | 发射时快照 `flatY`（行平面基线，不含 lift）+ `yOff`（发射偏移）；4 条 push 原坐标字段**逐字节原样**，仅追加 2 个字段 |
| F1b | `updateProjectiles` 贴坡重算 | L1098–L1104 | cabbage 分支原样前置（红线）；其后追加 `else if(pr.flatY!==undefined)` 每帧 `pr.y=pr.flatY-liftX(pr.x)-pr.yOff` |
| F2a | 串行门状态声明（**已改名**） | L862–L864 | `spawnGateZ`（最近入场僵尸引用）/`spawnGateT`（入场 gt 时刻）；v1 的 `roofGateZ/T` 已随口径一并改名（牵连仅 3 处） |
| F2b | `startGame` 复位 | L840 | `spawnGateZ=null;spawnGateT=-1e9`（防跨局残留） |
| F2c | `processSpawnQueue` 串行门（**v2 gating**） | L906–L931 | `if(levelNo===1\|\|levelNo===2)` 走门分支（**全波次，无 wave 范围限制**）；else 原路径（`spawnTimer` 逻辑逐字节原样） |

净变化：`+22 行源码`（含注释）。

### 1.1 ⚠ 口径落地声明：`levelNo` 为 1-based，按语义执行（**需主理人知悉**）

派单字面 `levelNo===0||levelNo===1` 为 0-based 笔误：本仓库 `levelNo` 1-based（`LEVELS[1]`=第 1 关，`probe().levelNo===5` 即第五关；`setLevel(0)` 为 no-op）。按「前 2 关 L1/L2」语义落地为 **`levelNo===1||levelNo===2`**。已核对：注释中显式标注「1-based」防后续误读；若有异议请明示（一行可改）。

## 2. Fix 1 · 直线弹贴坡（数学口径，v1 原样有效）

- **贴坡不变量**：直线弹任意时刻 `pr.y ≡ flatY − liftX(pr.x) − yOff`。发射帧退化为原值 ⇒ 发射 y 与 ENG-03 完全一致，无跳变。
- **命中窗效果**：`|zy(z.x) − pr.y| = |liftX(z.x) − liftX(pr.x)| + yOff ≤ Δlift + yOff`。最坏采样偏差 ≈ `yOff(8) + 4.5 + 2.3 ≈ 14.8`，实测 ≤16（验证线达成）。
- **L1–L4 恒等**：`liftX≡0` ⇒ 每帧重算结果 = 原恒定值；发射 push 原字段未动。全量 3× 全绿佐证。
- **cabbage 红线**：抛物积分分支逐字节未动；Part C（cabbage 180→140）继续绿。
- **镜像场景偏差（v1 §2.1，主理人已认可，不再展开）**：派单字面「col6→col1/col2」几何不可构造（直线弹只向右飞 + `hasZombieAhead` 只对右侧开火），Part D 以镜像低打高（col0→col8 / col1→col4）承载判别，公式两向对称。

## 3. Fix 2 · L1/L2 全波次出怪串行门（v2）

- **规则**（gating=`levelNo∈{1,2}`，**全波次**）：
  - 门关（拦下）：`spawnGateZ` 活着且 `gt−spawnGateT < 10` ⇒ 本帧 return，**队列不耗、不算波进度**；
  - 门开（放行）：无前一只 / 前一只已死（killZombie 置 `dead`，引用仍可判活）/ 距入场 ≥10s（兜底防僵死）；
  - **死了立即放行**：门内不走 `spawnTimer`，每帧直查门状态 ⇒ 前一只死亡后下一帧即放行。
- **L3/L4/L5 保真**：else 分支 `spawnTimer` 逻辑逐字节原样（REG-GATE-01 A3 判别锁定 L5 旁路）。
- **串行节奏通用现象（原 v1 §5-2，主理人已认可，保留数据）**：门内每只最长占 10s ⇒ 4 只波（如 L5 W3——但 L5 现已无门；L1/L2 无 4 只波，最大 3 只 ⇒ 最坏 ~20s 放完，对比原 ~8–11s）。「降低并发」即目标；`checkWave` 场清空硬门槛 + 25s 兜底自然兜住，不僵死（REG-WAVE/SMOKE-012 全绿）。
- **v2 波及面审计**（本次返工实测）：新口径下既有用例零破坏——
  - SMOKE-011（L2 抽检）：上界断言（9.5s≤1 只 / 20s≤2 只）在门控下 #2@10.05s 仍双绿；
  - SMOKE-027 T12（L5 抽检）：L5 无门后回到基线节奏，复跑绿（返工单第 3 点确认项）；
  - REG-WAVE-01/02/03/04（L1 波间推进）：波推进断言均在 newWave 首帧前结束（首帧即放 #1，无门滞留），全绿；
  - SMOKE-012（L1 清场门槛）：Part C 断言的「新一波开始生成」由首帧放行满足，全绿；
  - REG-PLANT-01（L1 35s 长跑）：W1 @12s 首帧放 1 只，35s 内到不了向日葵，产阳光计数不受扰，全绿。

## 4. 测试证据（v2）

### 4.1 用例改动/新增

| 用例 | 内容 | 判别点 |
|---|---|---|
| SMOKE-028 扩展（v1 原样） | Part A 贴坡不变量 + 绝对窗；Part D 跨坡必命中 + ≤16px 采样线 | 删贴坡 ⇒ A①/D 红；双重抬升 ⇒ A① 红 |
| **REG-GATE-01**（新增，替代 v1 REG-ROOF-02，已按返工单改名+注册表自动同步） | A1 L1 W2 死亡即放行（#2 @3.1s vs 原节奏 9.05s）；A2 L1 W3 精确阈值（big 波原节奏 8.05s，门拦到 10.05s；9.95/10.0 逐帧拦 ⇒ 阈值=10.0；10.1s 重臂再拦 #3）；A3 L5 旁路（W2 @9.05s 原节奏 + 9.55s 未放第三只）；A4 L1 反转锁（#1 活着时 9.05s 不放，**v1 的「L1 原节奏」断言已反转**）；A5 L2 生效证据（9.05s 拦 / 10.05s 放） | 删门 ⇒ A1/A2/A4/A5 红；门误套 L5 ⇒ A3 红 |

- 用例改名说明：harness 按文件名自动发现+排序（`run-all.js collectCases`），删除 `REG-ROOF-02.js`、新建 `REG-GATE-01.js` 即完成「改名+注册表同步」，无中心注册表需手改。
- v1 用例编写时踩的两处波表笔误（L1 W1 实为 1 只、W3 原节奏 8.05s 非 3.05s）已在首轮运行暴露并修正——最终版全部以 `LEVELS[1]` 波表实测值为准。

### 4.2 判别性自检（临时变体 · `PVZ_HTML_PATH` 对照；变体经 Node 脚本以 UTF-8 构建，已清理）

| 变体 | 腐蚀点 | 结果 |
|---|---|---|
| A | 删 L1104 贴坡重算 | SMOKE-028 **红**：A① col4 `y=278, lift=60, 期望 272` ✅ |
| B | `liftX(pr.x)*2` 双重抬升 | SMOKE-028 **红**：A① col6 `y=212=340−120−8` ✅ |
| C | 门条件改 `if(false)`（锚点=新 gating） | REG-GATE-01 **红**：A1判别 `[0,1,true]`（L1 #2 未放行）✅ ——按返工单要求「删门破坏现在应使 L1 用例变红」 |

### 4.3 门控实测（真实源码 · v2）

| 门控 | 命令 | 目标 | **实测** |
|---|---|---|---|
| 烟雾 | `node tests/harness/run-smoke.js` | 28/28 | ✅ **28/28 PASS**（3×） |
| 全量 | `node tests/harness/run-all.js --all` | 63/63（62 + REG-GATE-01） | ✅ **63/63 PASS**（3×） |
| 总线 | `node tests/harness/verify-bus.js` | 56/56 | ✅ **56/56 PASS**（零音频改动） |
| bench | `node tests/perf/bench.js` | 五场景 PASS | ✅ **PASS**（场景 E p50 **0.85ms**(5%) / p95 **1.59ms**(10%)；perf-profile §7 已自动回填） |

稳定性：烟雾/全量各 3 次结果完全一致（seed 42），零抖动。

### 4.4 QA 基线对照预期（返工单第 4 点，供 quality-lead 复核）

- **L1/L2 FIX 版应异于基线**（生效证据）：A1（死亡即放行 @3.1s）、A2（门拦到 10.05s）、A4（9.05s 拦）、A5（L2 同验）——基线代码上这些时刻均为原 `interval` 节奏，判别变体 C 已实证方向正确；
- **L3/L4/L5 应与基线一致**（零漂移证据）：gating 短路 + else 原路径逐字节原样；REG-WAVE/SMOKE-011(0.1s 级时序)/SMOKE-024/025/027 全绿；L5 出怪行为与 ENG-03 基线无任何差异。

## 5. 遗留与风险

1. **levelNo 1-based 语义落地（§1.1）**：与派单字面 `0/1` 不同，需主理人追认（默认视为笔误已修正）。
2. **门内串行节奏变化（§3）**：L1/L2 全波次串行，波放完时长拉长（3 只波最坏 ~20s）——即「教学关降并发」本意；SMOKE-011 契约（总量/峰值/interval）未动，仅节奏变密→疏。如用户嫌慢，`10` 常量单点可调，**未擅动**。
3. W3（big）预警横幅出现时机不受影响（预警走 `checkWave`，REG-WAVE-03/04 绿）；门只作用于「队列→场上」的放出节奏。
4. 既有瑕疵不变：画布右缘绿条（ENG-03 已登记）；檐沟抬升（ENG-03 越规格项）原样保留待裁决。

## 6. 交付物清单（v2）

| 交付物 | 路径 | 状态 |
|---|---|---|
| Fix 1 + Fix 2（v2 gating）源码 | `plants-vs-zombies.html`（2408→2430 行，+22） | ✅ |
| SMOKE-028 扩展（v1 原样） | `tests/harness/cases/SMOKE-028.js` | ✅ |
| REG-GATE-01（新；v1 REG-ROOF-02 已删除） | `tests/harness/cases/REG-GATE-01.js` | ✅ |
| code-map 刷新 | `docs/code-map.md`（2430 行 / 69 函数 / 51 常量） | ✅ |
| bench 回填 | `docs/architecture/perf-profile.md` §7 | ✅（自动） |
| 本报告（v2 修订版，就地更新） | `production/v13-m4-fix-01-report.md` | ✅ |
| git commit | — | ❌ 遵令未提交 |

---

*FIX-01 v2 施工完成。最终 gating 原文：`if(levelNo===1||levelNo===2){ … }`（全波次，无 wave 限制；1-based 语义落地）。四门控 28/63×3/56 + bench PASS；三条判别自检全红（删门变体使 L1 用例 REG-GATE-01 变红，符合返工要求）。待主理人追认 levelNo 口径；发布放行由用户人工审批。*
