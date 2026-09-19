# 回归测试计划 · PvZ Lite

> **基础设施**：README「无头测试方法」章节 —— `vm.runInContext` + `ctx` Proxy stub + `__probe` / `__api` 探针。所有用例都是 Node.js 单文件脚本，无 npm 依赖、无浏览器。
>
> **原则**：
> 1. 每个用例必须有明确断言（`__probe` 返回值 vs 期望值）；
> 2. 优先跑自动（烟雾清单），手动 Playtest 只做回归之外的事；
> 3. 每个 S0/S1 Bug 修完必须补一个回归用例（见 `bug-taxonomy.md`）。
>
> **文档状态（2026-09-19 同步 · 严守真）**：**门控基线实测 = 烟雾 27 · REG 33 · 总线 56**（以 `tests/harness/cases/` 实际文件为准；上表 §2/§3 的 23/30 为 2026-09-17 陈旧口径，实际已随 SMOKE-024/025/026/027 与 REG-ROOF-01/REG-PULT-01/02 增长）。
> **v1.3-M4 增量（契约 · 待实现）**：本轮**新增** `§8 v1.3-M4 · 5 列 C2 斜坡回归影响` + `§9 新增用例契约（REG-SLOPE-01 / SMOKE-028）`。**实现后门控目标 = 烟雾 28 · REG 34 · 总线 56**（SMOKE-028 进烟雾、REG-SLOPE-01 进回归）。详见 `tests/v13-m4-slope-acceptance.md`。
> 上一轮（2026-09-17）修正：烟雾条数（21→23，新增 SMOKE-022/023 音频补齐契约）、总线条数（47→55，`AUDIO_ROUTES` 由 13 键扩到 21 键）。更早（2026-09-16）：烟雾（17→21）、REG（26→30）、§3.4 预警时长（4s→**2s**）、§3.8 地瓜范围契约（改为实际「仅同排 ±54px」，标注**已裁决的实现偏差**）、§5 脚手架落地状态、§1 目录结构。

---

## 1. 测试目录结构（已实现）

> 下表为 **2026-09-16 实际落地的结构**（V11-01/04/05）。用例实现是 `.js` 模块（不是早期建议的 `.md`），由 `run-smoke.js` / `run-all.js` 直接 `require` 执行。

```
tests/
├── README.md                  # 目录索引（本文件同级）
├── playtest-plan.md           # 手动 Playtest 三轮计划
├── regression-plan.md         # 本文：回归测试计划
├── bug-taxonomy.md            # Bug 分级矩阵
├── harness/                   # 无头测试脚手架（已实现，零 npm 依赖）
│   ├── index.js               # 公共 harness：loadGame / SeededRNG / __probe / __api
│   ├── run-smoke.js           # 一键跑 SMOKE-*.js（23 条）
│   ├── run-all.js             # 一键跑 REG-*.js（默认 30 条）· --all 53 条 · --smoke 23 条
│   ├── verify-bus.js          # 音频总线核验（注入 FakeAudioContext · 55 条）
│   └── cases/                 # 用例实现：一条用例一个 .js 模块
│       ├── SMOKE-001.js … SMOKE-023.js                 # 烟雾 23 条
│       ├── REG-TRAP-01.js … REG-TRAP-06.js             # 陷阱对照 6 条
│       └── REG-{STATE,CARD,WAVE,PLANT,ZOM,SUN,MINE,END}-*.js   # 其余 24 条（REG 合计 30）
├── reports/                   # 测试报告存档（当前：qa-signoff-v1.0.0.md）
└── playtests/                 # 手动 Playtest 报告（round-N-*.md）
```

---

## 2. 烟雾测试清单（Smoke · 23 条，每次改动必跑）

跑法：`node tests/harness/run-smoke.js`（**专用烟雾入口，23 条，基线 23/23 PASS**）；亦可用 `node tests/harness/run-all.js --smoke`。全部 PASS 才允许合并。

| ID | 用例 | 覆盖分支 | 断言方式 |
|---|---|---|---|
| SMOKE-001 | **状态机三态切换** | menu → play → end → menu | `startGame()` 后 `state==='play'`；强推 1 只僵尸进屋后 `state==='end' && won===false` |
| SMOKE-002 | **卡片冷却递减** | `update()` 里 `cardCD[type]` 递减 | 种 1 次豌豆 → `cardCD.pea>0`；tick 5.1s → `cardCD.pea<=0`；期间第 2 次种被拒绝 |
| SMOKE-003 | **阳光不足以种卡** | `sun>=c.cost` 分支的 else | sun=50 时选豌豆（cost=100）→ 点种植格 → 无 plants 增加，`SFX.deny` 被调用 |
| SMOKE-004 | **僵尸进屋 → 游戏结束** | `z.x<GRID_X-40` | 手动 `zombies.push({x:0,...})` + tick 0.1s → `state==='end'` |
| SMOKE-005 | **通关解锁下一关** | 波次清空判定 | 强推全部僵尸到死 + 强制走完波次 → `state==='end' && won===true && unlockedLevel>=2` |
| SMOKE-006 | **卡片 vs 植物冷却分离** | 陷阱 #2 对照 | 种豌豆后 `p.cd≈0`（未攻击时）、`cardCD.pea=5`；两者随时间独立递减 |
| SMOKE-007 | **for...of splice 安全** | 陷阱 #3 对照 | 种坚果 + 手动让僵尸啃死 → 遍历后 `plants` 无残留 `_dying` 项、无迭代器错乱 |
| SMOKE-008 | **主循环异常隔离** | 陷阱 #5 对照 | `zombies.push(null)` + tick → 抛 TypeError 但被 catch，下一帧 `loop` 仍续订（`rafQueue.length` 不为 0） |
| SMOKE-009 | **gt 时钟外置** | 陷阱 #1 对照 | 直接调 `update(1)` 不动 `gt`；用 `__api.tick(1)` 后 `gt===1` |
| SMOKE-010 | **暂停分支** | `if(state==='play'&&!paused)` | paused=true 时 tick 10s → `gt` 不增、`zombies` 位置不变；解除后恢复推进；暂停遮罩渲染零帧异常 |
| SMOKE-011 | **L2 波次平衡契约（削峰固化）** | 关卡配置 | startSun≥150 / 总量≤25 / 单波≤6 / 单波 fast≤2 / interval≥5s / L1 波次不回归 |
| SMOKE-012 | **波次推进清场门槛** | 上一波未清不开新波 | 20s 内 wave 不推进、队列不塞新怪；清空后立即推进；25s 兜底防僵死 |
| SMOKE-013 | **SFX 调用完整性** | 音频调用点 | 静态：所有 `SFX.<key>` 调用点必须有定义；运行：大波预警结束刷怪帧不得抛异常 |
| SMOKE-014 | **开局音效可听性** | 音频初始化 | 上下文创建即预热 1 帧静音 buffer；首次/后续种植、拒用、铲除均启动振荡器 |
| SMOKE-015 | **大波预警横幅生命周期** | 预警 / 波次推进 | 时长 2s（`WARN_TOTAL=2`）；倒计时归零横幅立即消失（转 pending）；清场门槛仍生效；清空后同帧刷怪 |
| SMOKE-016 | **音频未就绪补播** | 音频排程 | suspended 时音效入 `audioQueue` 不丢弃，loop 每帧冲洗；running 后补播 / 立即排程 |
| SMOKE-017 | **超声保活音源** | 音频初始化 / 总线 | 17.5kHz@0.005 常驻振荡器直连 destination（防驱动静音门控吞首音）；参数正确 + 幂等不重复启动 |
| SMOKE-018 | **已占用格子不能覆盖种植** | 种植分支 | 同格重复种植被拒（`deny` + 保留选中），阳光不被浪费 |
| SMOKE-019 | **BGM 生命周期** | `state` / 静音 | play 且未静音 → BGM 播放（env 总线）；menu/end 或静音 → 停 |
| SMOKE-020 | **存档持久化（V11-04）** | localStorage | 静音偏好 `pvz_muted` + 最高分「写入 → 重载 → 读回」全路径 |
| SMOKE-021 | **内嵌版本号（V11-05）** | 源码常量 / 菜单渲染 | 源码 `VERSION` 常量存在 + 启动日志打印 + 菜单渲染无帧异常 |
| SMOKE-022 | **音频补齐 P0（S2）** | B1/B2/B3 音效 | 种植 = 主音 + 落地噪声双层；卡片冷归零当帧恰报一次就绪（转点判定）；阳光掉落（自然 + 向日葵两路径）/ 收集分层与节流 |
| SMOKE-023 | **音频补齐 P1/P2 + 警报 loop（S2）** | B4/B5/B6/B8/B9/B10 + §C | 死亡按类型分层；西瓜 shoot 契约不变且叠 melonThrow；失败叠 loseClimax；菜单点 uiClick；铲子选中/铲空/挖到三分；sirenLoop 随横幅同起同停且窗口内重复 |

---

## 3. 完整回归清单（Regression · 发布前跑）

按 README「已知陷阱」+ 关键分支全覆盖，**共 30 条**（TRAP 6 + STATE 3 + CARD 4 + WAVE 4 + PLANT 4 + ZOM 3 + SUN 2 + MINE 2 + END 2）。

> **跑法（已实现）**：`node tests/harness/run-all.js` —— **默认即跑全部 REG-* 30 条**（基线 30/30 PASS）。加 `--all` 一并跑 SMOKE，共 53 条。下文 §3.1–§3.9 的枚举即为 30 条的权威来源。

### 3.1 陷阱对照（6 条 · 覆盖率 100%）

| ID | 陷阱 | 用例要点 | 断言 |
|---|---|---|---|
| REG-TRAP-01 | `gt` 不在 `update()` 里 | 直接 `update(1)` 不动 `gt`；`__api.tick(1)` 才动 | `gt` 值差 |
| REG-TRAP-02 | 卡片冷却 vs 植物冷却 | 种卡后 `cardCD.type=cd值`，`p.cd=0`（非向日葵初始）；两者不同步递减 | 分别记录并 assert |
| REG-TRAP-03 | `for...of` 里 splice | 让 3 只僵尸同时啃 3 棵坚果到死，检查 `plants` 长度 | 无残留、无迭代异常 |
| REG-TRAP-04 | 改布局忘改点击热区 | 用 `CARD_X0` 计算点击坐标 vs 写死 6 对比 | 命中判定一致 |
| REG-TRAP-05 | RAF 在函数末尾 | 帧内抛异常 → 下一帧仍续订 | `rafQueue.length` 恢复 |
| REG-TRAP-06 | 快捷键绑 canvas → window | 按 `1` 后 `selected.i===0`；先 focus 到按钮再按 → 仍生效 | 状态断言 |

### 3.2 状态机（3 条）

| ID | 用例 | 断言 |
|---|---|---|
| REG-STATE-01 | setState 幂等（同一 state 不重复 log） | 连续 setState('play') 只触发一次 console.log |
| REG-STATE-02 | setState 打印含 gt 与 wave | 匹配正则 `/state (menu\|play\|end) → (menu\|play\|end)/` |
| REG-STATE-03 | requestExit 二次确认 | 首次触发 exitArm=3 且仍为 play；3s 内再次触发 → state='menu' |

### 3.3 卡片 / 种植（4 条）

| ID | 用例 | 断言 |
|---|---|---|
| REG-CARD-01 | 6 种植物全部可种 | 逐一调用种植流程，每颗 `plants` 数量 +1 |
| REG-CARD-02 | 阳光不足时种植被拒 | sun < cost 时 plants 不增，`SFX.deny` 被调用 |
| REG-CARD-03 | 卡片冷却中种植被拒 | cardCD[type]>0 时种植被拒 |
| REG-CARD-04 | 铲除后 plant 数组正确减少 | 铲子选中 + 点格子 → `plants.length -1` |

### 3.4 波次 / 刷怪（4 条）

| ID | 用例 | 断言 |
|---|---|---|
| REG-WAVE-01 | 第一波延迟 12s | `gt<12` 时 wave=0；`gt>=12` 且非 waveActive 时 wave=1 |
| REG-WAVE-02 | 后续波次间隔 16s | 波次切换间隔 = 16s（用 `gt` 差值） |
| REG-WAVE-03 | 大波预警 **2s** 期间不刷怪（源码 `WARN_TOTAL=2`，非 4s） | `warn.active=true` 时 `spawnQueue.length===0` 直到预警结束 |
| REG-WAVE-04 | 大波预警后 wave 才 +1 | 预警结束后同帧 `wave++`，`lastWaveT=gt` |

### 3.5 植物行为（4 条）

| ID | 用例 | 断言 |
|---|---|---|
| REG-PLANT-01 | 向日葵初始 7s 产阳光、之后每 20s | 时间轴断言 sun 数量 |
| REG-PLANT-02 | 豌豆攻击间隔 1.6s / 双发 1.5s / 西瓜 3.2s | 计数子弹数量 vs 时间 |
| REG-PLANT-03 | 豌豆/双发/西瓜仅在有前方僵尸时开火 | `hasZombieAhead=false` 时不发射 |
| REG-PLANT-04 | 西瓜溅射 55 半径、55% 伤害 | 同排多僵尸时伤害减半到非主目标 |

### 3.6 僵尸 / 战斗（3 条）

| ID | 用例 | 断言 |
|---|---|---|
| REG-ZOM-01 | 4 种僵尸血量/速度符合配置（含难度倍数） | 逐类型断言 hp/spd |
| REG-ZOM-02 | 僵尸啃食植物：`target.dur-=65*dt` | 固定 dt 后 `dur` 变化量 |
| REG-ZOM-03 | 僵尸死亡只结算一次分数 | 击杀后 `z.dead=true`，重复触发无二次加分 |

### 3.7 阳光 / 特殊（2 条）

| ID | 用例 | 断言 |
|---|---|---|
| REG-SUN-01 | 阳光 8s 停留后消失 | stayT>8 后 `dead=true` |
| REG-SUN-02 | 阳光点击半径 30px | dx²+dy²<900 内点击收集 |

### 3.8 特殊：地瓜（2 条）

| ID | 用例 | 断言 |
|---|---|---|
| REG-MINE-01 | 8s 武装期（`level.armTime=8`）内僵尸踩过不爆 | `armT>0` 时僵尸走到地瓜格 → 地瓜仍在、僵尸不受伤；走完武装期后引爆 |
| REG-MINE-02 | 武装后引爆 + **同排**范围伤害契约（`sameCell`: 同排 && `dx<CELL_W*0.6`=54） | 触发 boom；同格/同排 `dx<54` 秒杀、同排 `dx=80` 存活且不受伤；**相邻行（dy=CELL_H=104）不受影响** |

> ⚠️ **已裁决的实现偏差 · 地瓜爆炸范围**（用户 **2026-09-16 拍板：保留现状，不改代码行为**）
>
> `plants-vs-zombies.html` **L852-854** 判定逻辑（**一行未动**，即 v1.0.0 已发布行为）：
> ```js
> const sameCell = z.row===p.row && dx<CELL_W*0.6;   // 同排 && dx<54
> const nearCell = dx<CELL_W*0.5 && dy<CELL_H*0.9;   // dx<45 && dy<93.6（保留，不产生额外命中）
> if(sameCell||nearCell){
> ```
> **技术分析（工程侧发现，主理人已独立复核）**：
> - 相邻行 `dy = CELL_H = 104 > 93.6` → **`nearCell` 在跨行时恒为 false，相邻行永远不满足**；
> - 同排时 `dx<45` 已被 `sameCell` 的 `dx<54` **完全包含**，`nearCell` 不带来任何额外命中。
> → **`nearCell` 是死代码。**
>
> **实际契约**：地瓜爆炸**只伤害同排 `dx<54px` 内的僵尸，不波及相邻行**。`REG-MINE-02` 已按此锁定。
>
> **裁决与落地（2026-09-16）**：
> - **保留现状，不改代码行为** —— 仅同排 ±54px 是 v1.0.0 已发布行为，改成跨行 AOE 会动平衡（25 阳光的卡会偏强）。
> - **源码注释已校准**：L840-844 重写为准确表述（含 `nearCell` 为何不产生额外命中的推导），L853 行尾加「保留：当前不产生额外命中，勿改判定逻辑」提示；判定逻辑**一行未动**。
> - **「跨行溅射」已登记为 v1.2 可选增强**，见 `production/v1.1-plan.md` 第六节（已决策偏差）与第七节（后续版本候选）。
>
> 本文档按**实际契约如实记录**，不代表「设计如此」；此处 ⚠ 语义为**已裁决的实现偏差**（**非待决**）。

### 3.9 通关 / 解锁（2 条）

| ID | 用例 | 断言 |
|---|---|---|
| REG-END-01 | 通关解锁下一关 | `unlockedLevel` 递增 |
| REG-END-02 | 通关 L2 后无下一关，显示「已通关全部关卡」 | `won=true && !LEVELS[levelNo+1]` |

---

## 4. 用例模板（人可读规格书 · 实际实现为 `tests/harness/cases/*.js`）

> **现状（2026-09-16）**：实际落地的用例是 **`tests/harness/cases/*.js`** 模块（`module.exports = { id, name, seed, run(ctx) }`，由 `run-smoke.js` / `run-all.js` 直接 `require` 执行），**不是** `.md` 文件。下方 `.md` 模板保留作为「人可读的用例规格书」形态：新用例应先在脑中/评审时用本模板理清步骤与期望，再落成 `.js` 模块。两者 ID 命名规则一致。

每个用例一个 Markdown 文件，命名规则：`<类别>-<序号>-<slug>.md`。例：`SMOKE-02-card-cooldown.md`。

```markdown
# SMOKE-02 · 卡片冷却递减

- **用例 ID**：SMOKE-02
- **优先级**：P0（烟雾）
- **覆盖分支**：`update()` 中 `cardCD[type]` 递减
- **相关陷阱**：陷阱 #2（卡片冷却 vs 植物冷却）
- **关联 Story**：无（核心逻辑）
- **创建日期**：2026-09-15
- **状态**：⚪ 待执行 / 🟢 通过 / 🔴 失败 / ⏸ 跳过

## 前置条件

- 已通过 smoke 前置（`startGame()` 后 `state==='play'`）
- 初始 `sun = 150`（第 1 关）
- 选中豌豆卡（`CARDS[1]`，cost=100, cd=5）

## 步骤

### Step 1：种下第一棵豌豆
```js
// sandbox 追加代码（通过 __api 探针）
__api.selectCard(1);                 // 选中豌豆（索引 1）
__api.clickGrid(0, 0);               // 点 (0,0) 格子
assert.equal(__probe().plants.length, 1);
assert.ok(__probe().cardCD.pea > 0, 'cardCD.pea 应大于 0');
```

### Step 2：立即再次尝试种被拒
```js
const beforeSun = __probe().sun;
__api.clickGrid(1, 0);               // 点 (1,0)
assert.equal(__probe().plants.length, 1, '冷却中不能再种');
assert.equal(__probe().sun, beforeSun, 'sun 未消耗');
```

### Step 3：等待冷却结束
```js
__api.tick(5.1);                     // 快进 5.1 秒
assert.equal(__probe().cardCD.pea, 0, '冷却应归零');
```

### Step 4：再次种植成功
```js
const beforeSun2 = __probe().sun;
__api.clickGrid(2, 0);
assert.equal(__probe().plants.length, 2);
assert.equal(__probe().sun, beforeSun2 - 100);
```

## 期望结果

- Step 1：`plants.length===1` 且 `cardCD.pea===5`
- Step 2：`plants.length===1` 且 sun 未消耗
- Step 3：`cardCD.pea===0`
- Step 4：`plants.length===2` 且 sun 减 100

## 实际结果

| 步骤 | 结果 | 差异 |
|---|---|---|
| Step 1 | _待填_ | _待填_ |
| Step 2 | _待填_ | _待填_ |
| Step 3 | _待填_ | _待填_ |
| Step 4 | _待填_ | _待填_ |

## 备注

- 依赖 `__api.selectCard(i)` / `__api.clickGrid(x,y)` / `__api.tick(dt)` / `__probe()`。若当前 harness 未暴露，需在 `harness/harness.js` 中补齐。
- 陷阱 #2 提醒：`cardCD[type]` 递减在 `update()` 中；`p.cd`（植物自身冷却）独立于 `cardCD`，本用例不验证植物自身冷却。
```

**关键规范**：
- 用例 ID 必须以类别前缀开头（SMOKE- / REG- / REG-TRAP- / REG-STATE- 等）；
- **期望结果**用自然语言列出，便于人 review；
- **实际结果**留空，执行时填写；
- 状态字段用 emoji 标识，方便 `grep 🟢` 统计通过率。

---

## 5. 测试脚手架改进建议

README 现有脚手架曾是"手工搭"版本，能跑通但缺生产级能力。以下是按**收益 / 成本**排序的改进建议 —— **2026-09-16 更新：H1 / H3 / H5 已落地，H2 部分落地，H4 / H6 / H7 仍待办**（状态逐条标注 ⬇）。

### 5.1 短期（**H1 / H3 / H5 已落地**，H2 部分落地）

**H1. 抽出公共 harness 到 `tests/harness/harness.js`** —— ✅ **已落地**（实际文件名 `tests/harness/index.js`）
当前每次测试都要重写 stub。原先的封装建议如下（实际实现已超出建议范围：`__probe`/`__api` 新增 `__VERSION`/`__SFX`/`__consts` 桥，`lastWaveT`/`exitArm`/`waveActive`/`muted`/`highScore` 等探针，`localStorage`/`location` 桩，以及 `SeededRNG`）：
```js
// tests/harness/harness.js
module.exports = function loadGame(htmlPath) {
  const fs = require('fs');
  const vm = require('vm');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

  const ctxStub = new Proxy({}, { /* 现有 Proxy */ });
  const canvasStub = { /* 现有 stub */ };
  const rafQueue = [];
  const sandbox = {
    console, Math, Date, performance:{now:()=>0},
    document:{getElementById:()=>canvasStub},
    window:{},
    canvas: canvasStub,
    requestAnimationFrame:(f)=>{ rafQueue.push(f); return rafQueue.length },
    // ...
  };
  sandbox.globalThis = sandbox;

  // 注入探针
  code += `
    globalThis.__probe = () => ({state, wave, sun, score, gt, plants:plants.length, zombies:zombies.length, ...});
    globalThis.__api = {
      startGame: (why) => startGame(why),
      tick: (dt) => { gt += dt; update(dt); },
      selectCard: (i) => { selected = {i, ...}; },
      clickGrid: (x, y) => onClick({clientX:x, clientY:y, ...}),
      // ...
    };
  `;
  vm.runInContext(code, vm.createContext(sandbox));

  return { sandbox, rafQueue, __probe: sandbox.__probe, __api: sandbox.__api };
};
```

**收益**：减少每用例 30-40 行样板代码。

### 5.2 中期（**H2 部分落地**；H4 待办）

**H2. `run-all.js` 一键跑全部** —— 🟡 **部分落地**
- ✅ 已实现：`tests/harness/run-all.js` 一键跑（默认 REG 30 条 / `--all` 53 条 / `--smoke` 23 条），全绿 `exit 0` 供 CI / pre-commit 门控
- ✅ 已实现：按文件名排序跑（SMOKE 在前，REG 升序）
- ❌ **未实现**：JSON 报告落盘到 `tests/reports/latest.json`（当前仅打印 stdout）。另：实际实现是扫描 `cases/*.js` 模块并 `require`，**不是**从 `.md` 抽 code block

**H3. `--smoke` 模式** —— ✅ **已落地**
- `node tests/harness/run-all.js --smoke`（或专用 `node tests/harness/run-smoke.js`）只跑 SMOKE-* 23 条，实测约 100ms；用于 pre-commit 或保存钩子。

**H4. flaky 检测** —— ❌ **未落地**
- 同一用例连续跑 3 次，结果不一致则标记 flaky，写入 `tests/reports/flaky.json`。
- 现状：`run-all.js` 未实现重复跑，`tests/reports/` 也无 `flaky.json`。当前 53 条用例多次复跑稳定全绿，**暂无已知 flaky 项**，但隔离机制仍待补（一旦出现假失败会污染 CI 信号）。

**H5. 时间可控（RNG 种子）** —— ✅ **已落地**
- `loadGame({seed:N})` 用 `SeededRNG`（mulberry32）覆盖 sandbox 的 `Math.random`，`game.seed(n)` 可运行时重注入；`run-all.js` 为每条用例传 `mod.seed`（默认 `DEFAULT_SEED=1337`），波次生成 / 刷怪可完全复现。

### 5.3 长期（Phase 7+，**均未落地**）

**H6. 覆盖率收集** —— ❌ **未落地**
- 用 `istanbul` 或简单正则统计 `__api` 暴露了哪些函数、`update()` 内哪些分支未被触发。
- 输出到 `tests/reports/coverage.txt`。

**H7. 性能基准（Perf Baseline）** —— ❌ **未落地**
- 用 `performance.now()` 记录每 100 帧耗时，超过阈值报警（如 > 16ms / 100 帧 = 掉帧）。
- 配合 `docs/architecture/perf-profile.md`（工程同学产出）。

### 5.4 现有脚手架短板（明确记录 · 含解决状态）

| # | 短板 | 影响 | 修复优先级 | 状态（2026-09-16） |
|---|---|---|---|---|
| 1 | 每次测试重写 stub | 维护成本、易漏变量 | H1（本 sprint） | ✅ **已解决**（`tests/harness/index.js` 公共 harness） |
| 2 | `Math.random` 不可控 | 波次测试不稳定、flaky | H5（下 sprint） | ✅ **已解决**（`SeededRNG` + `seed`，H5 提前落地） |
| 3 | 无一键跑 | 每次改动需手工挑用例 | H2（下 sprint） | ✅ **已解决**（`run-all.js` / `run-smoke.js`） |
| 4 | 无 flaky 隔离 | 一次假失败污染整个信号 | H4（下 sprint） | ❌ 未解决（当前用例稳定，但机制待补） |
| 5 | 无覆盖率 | 不知道测到哪了 | H6（Phase 7） | ❌ 未解决 |
| 6 | `__probe` 字段有限 | 断言深度受限 | H1 时扩展 | ✅ **已解决**（`__probe`/`__api` 已大幅扩展，含 `*Arr` 深快照） |
| 7 | 音频路径难测 | `window` 未定义导致 try/catch 吞掉 | 保留现状（降级合理） | 🟡 **已缓解**（`verify-bus.js` 注入 FakeAudioContext，55 条核验通过；S2 起 `SMOKE-022/023` 覆盖音效**触发契约**；无头静默降级仍由 `run-smoke` 覆盖） |
| 8 | DOM 事件测试需手动合成 | onClick 依赖 `e.clientX/clientY` | H1 补 `__api.clickAt(x,y)` | ✅ **已解决**（`__api.clickAt(x,y)` / `clickGrid(col,row)`） |

---

## 6. 执行节奏建议

- **每次 commit 前**：跑 `SMOKE-*`（**23 条**，目标 < 5s）→ `node tests/harness/run-smoke.js`
- **每次功能合并前**：跑 SMOKE + 相关 REG-*
- **每次发布前**：跑 `node tests/harness/run-all.js`（**REG 30 条**）+ `verify-bus.js`（总线 55 条）+ 三轮 Playtest
- **修复 Bug 后**：为该 Bug 增加 1 条 `harness/cases/REG-*.js` 用例（见 `bug-taxonomy.md`）

---

## 7. 与 Playtest 的边界

| 类型 | 交给自动化 | 交给 Playtest |
|---|---|---|
| 数值平衡 | ❌ | ✅ Round 1 |
| 教学清晰度 | ❌ | ✅ Round 2 |
| 帧率 / 卡顿 | 部分（H7） | ✅ Round 3 |
| 状态机切换 | ✅ | — |
| 波次 / 刷怪逻辑 | ✅ | — |
| 卡片冷却 | ✅ | — |
| 音效正确性 | 部分（**触发契约**：SMOKE-013/014/016/017/022/023 + verify-bus 路由 55 条；**听感**仍不可测） | ✅ 全轮 |
| UI 视觉 | ❌ | ✅ 全轮 |
| 误操作 / 手感 | ❌ | ✅ Round 1/2 |
| 快捷键冲突 | 部分 | ✅ Round 3 |

---

## 8. v1.3-M4 · 5 列 C2 斜坡回归影响（2026-09-19 · 严守真 · 任务 V13-M4-QA-01）

> **性质**：**测试计划/契约（md only）**。本段只出判定与契约，**不实现用例 `.js`、不改 `plants-vs-zombies.html`**。
> **触发**：屋顶几何由「平」改「左低右高斜坡 + 平台」（路线 **C2 几何连续**），且**斜坡段由 3 列扩到 5 列**——上轮（3 列）的回归判定**作废重判**。
> **上游输入**：`production/v13-m4-slope-eng-assessment.md`（§0–§6 B 档 + §C C2 专项）、`design/assets/m3-rooftop-concept/slope-bc-art-notes.md`。

### 8.0 变更概要（锁定接口 · 四方统一）

| 项 | 锁定值 |
|---|---|
| 路线 | **C2**（几何连续·平滑坡面；`gridToPos/posToGrid` 斜切映射 + 僵尸连续 y） |
| 斜坡段 | **col 0–4（5 列）** |
| 平台段 | **col 5–8（4 列）** |
| 方向 | **左低右高**（屏幕 y 随 x 递减：`y_screen = y_flat − liftX(x)`） |
| 连续 lift | `liftX(x) = H · clamp((x − GRID_X) / (5·CELL_W), 0, 1)`，分母 **450** |
| 幅度 | `H = 60px`（工程侧重算中，**本段据此推导，H 变动时以 `__consts` 实际值为准**） |
| 底边 | 屋面底边视觉统一停 `y=600`（檐板补厚，`#463b2b`） |
| 隔离 | **全部 roof-gated**（`level.roof` 前置；L1–L4 恒 `liftX ≡ 0`） |

**关键几何换算（row = 2，格心）**：`x(c)=55+90c+45=100+90c`；`flatY(r)=80+104r+52=132+104r`（row2 = 340）。

| col | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| 段 | 斜坡 | 斜坡 | 斜坡 | 斜坡 | **斜坡(末列)** | 平台 | 平台 | 平台 | 平台 |
| 格心 x | 100 | 190 | 280 | 370 | **460** | 550 | 640 | 730 | 820 |
| `liftX`(格心) | 6 | 18 | 30 | 42 | **54** | 60 | 60 | 60 | 60 |
| L5 格心 y(row2) | 334 | 322 | 310 | 298 | **286** | 280 | 280 | 280 | 280 |

### 8.1 判定依据（硬事实 · 已实测复核）

1. **`probe()` 快照不含任何实体 y**：`plantsArr` 只吐 `{type,col,row,cd,dur,...}`、`zombiesArr` 只吐 `{type,x,row,hp,spd,...}`（`tests/harness/index.js` L128–134）。⇒ **没有任何现有用例能断言植物/僵尸的 y**。
2. **`clickGrid(col,row)` = `gridToPos` 再由 `onClick` 走 `posToGrid`**（`index.js` L156–158）。**只要两函数用同一个 `liftX`，往返恒等**（闭式证明：`y − GRID_Y + liftX(x) ≡ r·CELL_H + CELL_H/2`，`floor` 回 `r`，**与 liftX 形状无关**）。⇒ 采样列/行不受 lift 影响。
3. **`level.roof` gate**：`liftX` 内以 `level.roof` 前置 ⇒ L1–L4 **逐字节等价今日**（结构性免疫）。
4. **默认关卡 = L1**：`let level=LEVELS[1]`⇒ **未显式 `setLevel(5)` 的用例全部跑 L1**（无 lift）。
5. **★ 5 列与上轮 3 列的差别**：`liftX` 分母由 **270 → 450**。⇒ **col3/col4 的 lift 值改变**：col3 `42`（上轮 60）、col4 `54`（上轮 60 平台常量）。**上轮「col4 = 平台 liftX=60 常量」的判定作废。**

### 8.2 逐用例判定表

> 三档判决：**无感**（断言与实现均不需改）/ **被激活**（上轮判无感、本轮语义改变，需重新推导）/ **需平移+方案**（断言必须改，附方案）。
> 「跑在 L5？」列以实测 `setLevel` 调用为准。

| 用例 | 采样 / 位置 | 跑在 L5？ | 触斜坡 col0–4？ | 判决 | 原因 |
|---|---|---|---|---|---|
| **SMOKE-027 T16** | `clickGrid(4,2)` → **col4（本轮=斜坡）** | ✅ L5 | ✅ col4 | **被激活 → 重推导：仍落 (4,2)、断言不变** | 见 §8.4；断言只读 plants/sun/col/row（**无 y**），互逆保证精确落格 |
| SMOKE-027 T1–T15 / T13 | L5 波次数据 / 解锁链 | ✅ L5 | ❌（纯数据） | **无感** | 不涉几何/网格 |
| SMOKE-027 render 真帧 | L5 真帧（L50–63） | ✅ L5 | — | **无感（守门）** | 只验「不抛」；新绘制须只用 harness 桩已支持原语（禁读 `ctx.canvas.*`） |
| **REG-ROOF-01** | `clickGrid(2,2)` → **col2（斜坡）**；L5 | ✅ L5 | ✅ col2 | **无感** | 断言仅 plants/sun/type/`vx`（**无 y**）；往返恒等 → 精确落 (2,2) |
| REG-ROOF-01 ⑤ | `clickGrid(4,2)`；L2（非 roof） | ❌ L2 | （L2 无 lift） | **无感** | roof gate 关 |
| **REG-END-02** | L5＋`forceWaves`＋**render 真帧**（drawEnd） | ✅ **L5** | ❌（无格/无 y） | **无感（守门）** | ★ 上轮评估漏列的第 3 个 L5 用例；仅断言 state/won/LEVELS[6]＋render 不抛 |
| REG-PULT-01 | 硬编码 `zy=行基线`(L16) row2；僵尸 x=500/520 | ❌ L1 | ❌ | **无感** | L1 lift=0；且断言式与「行基线」同式 |
| REG-PULT-02 | 硬编码 `zy=行基线`(L15) row2；注入弹 x=100 | ❌ L1 | ❌ | **无感** | 纯验重力分支/直线弹 y 恒定，不涉列 lift |
| REG-PLANT-04 | 硬编码 `cellY=行基线`(L14) row0；僵尸 x=400/410 | ❌ L1 | ❌ | **无感** | L1 lift=0 |
| REG-ZOM-03 | 硬编码 `cellY=行基线`(L11) row0；豌豆 x=250/僵尸 300 | ❌ **L1** | （L1） | **无感** | L1 lift=0（即使方案②让 hit 随列，L1 仍恒等） |
| SMOKE-020 | 硬编码 `cellY=行基线`(L28) row0 | ❌ **L1** | （L1） | **无感** | 同 REG-ZOM-03；主测存档 |
| REG-MINE-01 | `clickGrid(1,2)` col1；僵尸 x=`gridToPos(1,2).x` | ❌ L1 | （L1） | **无感** | 命中走 `sameCell`（**x 主判据** `dx<54`）；互逆保证落格 |
| REG-MINE-02 | 地瓜 col1；A/B/C/D 用 `pos.x±40/±80` 与 row1 | ❌ L1 | （L1） | **无感** | 断言全基于 **x 阈值**；D 相邻行 `dy` 在 lift 下**只会更大**（仍 >93.6） |
| REG-ZOM-02 | 坚果 col2；僵尸 x=pos.x+10；只验 `dur-=65` | ❌ L1 | （L1） | **无感** | `updateZombies` 啃食判定**只用 x** |
| REG-TRAP-03 | 坚果 col4（本轮=斜坡）×3 行 | ❌ L1 | （L1） | **无感** | 采样列零 lift（L1）；且用 `gridToPos` 取 x/y |
| SMOKE-007 | 坚果 col4（本轮=斜坡）×3 行 | ❌ L1 | （L1） | **无感** | 同上（for...of 语义） |
| `tests/harness/index.js` L157 | `clickGrid` 用 `gridToPos` | — | 取决于调用方 | **无感** | 互逆即正确 |
| 其余全部 SMOKE/REG（含 REG-CARD-01/02/03、SMOKE-002/014/016/018/022/023、REG-PLANT-01/02/03 等点击 col0–4 者） | 默认 L1（或 L2–L4 非 roof） | ❌ | （无 lift） | **无感（结构性免疫）** | roof gate ⇒ `liftX≡0` ⇒ 逐字节等价今日 |

**受 roof gate 保护的用例群（按实际扫，非照抄）**：除上述 `setLevel(5)` 的 3 条（SMOKE-027 / REG-ROOF-01 / REG-END-02）外，**其余全部用例**跑在 L1–L4（`SMOKE-011→L2`、`SMOKE-024→L2/L3`、`SMOKE-025→L2/L3/L4`、`SMOKE-026→L4`、`REG-ROOF-01⑤→L2` 为非屋顶关）⇒ **lift 恒 0，无需任何平移**。

### 8.3 ★ 判别性分析（决定「哪些列/用例真能抓住 bug」）

**这是本轮最重要的质量发现**——**不是所有斜坡列都能抓到「改错」**：

| 潜在实现 bug | 能抓到的采样列 | 推导 |
|---|---|---|
| **`posToGrid` 漏减 `liftX`**（反解退化回平面） | **仅 `liftX > CELL_H/2 = 52` 的列** ⇒ **col4(54)、col5–8(60)** | 错行条件：`0.5 − liftX/CELL_H < 0`；col0–3（lift 6/18/30/42）**反解仍回原行 ⇒ 不判别** |
| **弹道命中基线 `zy`(L991/L1024/L1073) 未随 lift 抬升** | **col2/col3/col4**（`liftX > 32 − 8 = 24`）⇒ 用 **col4(54) 信号最强** | 误偏量 = `liftX(发射列) + 8`（单个豌豆偏移 8）；`> 32`（命中窗半高）即 miss |

⇒ **结论**：
1. **`REG-ROOF-01`（col2）对「漏 lift」bug 不判别**；现有用例中**唯一**能判别该 bug 的是 **`SMOKE-027 T16`（col4）**——判别覆盖过薄，故 **§9 `REG-SLOPE-01` 必须显式覆盖 col4 + 平台列**。
2. **`SMOKE-028` 必须用 col4**（或 col3）作发射列，才能以最大信号抓住「命中基线未抬升」。

### 8.4 `SMOKE-027` T16 重新推导（重点）

**上轮（3 列）判定**：col4 = 平台，`liftX(460)=60` **常量** ⇒ 「无感」。
**本轮（5 列）**：col4 落入**斜坡**，`liftX(460)=60·405/450 = 54`（**非常量 60**）⇒ **旧判定作废，重新推导**。

`clickGrid(4,2)` 全链路（C2）：

```
gridToPos(4,2): x = 55+4·90+45 = 460
                y = 80+2·104+52 − liftX(460) = 340 − 54 = 286
posToGrid(460,286): col = floor((460−55)/90) = floor(4.5) = 4
                    row = floor((286−80+liftX(460))/104) = floor((206+54)/104)
                        = floor(260/104) = floor(2.5) = 2
                → (4, 2) ✓ 精确
```

**T16 断言逐条复核**：T16③ `plantsArr[0].col===4 && row===2` ⇒ **通过**（精确回 (4,2)）；其余断言（plants/sun/type）**均无 y** ⇒ **通过**。
**判决**：**T16 仍 PASS，无需改断言**；但**语义已从「平台列」变为「斜坡末列」**——它是本轮**唯一**的「漏 lift」自动判别点，**保留且在 §9 补强**。

> ⚠️ **反例警示（供实现期参考）**：若 `posToGrid` 漏减 `liftX`，则 `clickGrid(4,2)` → `(4,1)`，T16 与 §9 REG-SLOPE-01 双双 FAIL。这是本轮最该守的一条线。

### 8.5 「需平移 + 方案」清单

**在守住 `level.roof` gate 的前提下：需平移的用例 = 空集（预期漂移 = 0）**。

**兜底平移方案**（仅在**违反 gate 约定**、把 lift 做成**全局无条件**时才需要——**不推荐**，仅登记备查）：

| 用例 | 采样（若全局 lift 会挂的点） | 兜底改法 |
|---|---|---|
| `REG-ZOM-03` | row0 豌豆/僵尸落 **col2**（lift 30 时 `|zy−pr.y|=38>32`） | 采样列挪到 col0/col1（lift≤18，`|Δ|<32`），或注入 y 改为 `行基线−liftX` |
| `SMOKE-020` | 同 REG-ZOM-03（col2/row0） | 同上 |
| `REG-TRAP-03` / `SMOKE-007` | col4（lift 54 > 52）注入**会因反解漏 lift 而翻行** | 采样列挪 col2，或断言改按 `gridToPos` 实值 |
| `REG-PLANT-04` | col3/col4（`|zy−cellY|` 可能 >32） | 采样列挪 col0/col1 |
| `REG-MINE-01/02` | col1（lift 18）**暂安全**；建议对齐 gate 口径 | 命中主判据是 x，一般不需改 |
| `REG-PULT-01/02` | 自算 `zy=行基线` 与游戏 hit 基线须**同口径** | 若 hit 基线随列抬升，自算 `zy` 需同步 `− liftX(z.x)` |

> **唯一推荐**：**守 gate**（`liftX` 内加 `level.roof` 判定），使上述兜底**永不触发**。这也是 §8.2「结构性免疫」成立的前提。

### 8.6 结论

> **「5 列 C2 斜坡 + roof gate + `gridToPos↔posToGrid` 严格互逆」⇒ 既有用例预期漂移 = 0，无需改任何既有断言。**
> 门控基线（当前 **烟雾 27 · REG 33 · 总线 56**）**预期全绿不变**；SMOKE-027 render 帧与 REG-END-02 drawEnd 帧已内建「L5 render 不抛」守门。
> **唯一必须新增的自动覆盖**：§9 的 `REG-SLOPE-01`（补足 col4 判别）与 `SMOKE-028`（弹道随 lift 抬升）。

---

## 9. 新增用例契约（v1.3-M4 · 契约规格 · 待实现为 `harness/cases/*.js`）

> **本节只给契约与断言口径，不实现 `.js`**（实现属施工阶段）。
> 两条用例的**共同判别前提**见 §8.3：**必须用 col4**（`liftX=54 > CELL_H/2`），否则抓不到「反解漏 lift」的错。

### 9.1 `REG-SLOPE-01` · 屋顶斜坡几何契约（gridToPos↔posToGrid 往返 + lift 口径 + L1–L4 恒等）

- **用例 ID**：REG-SLOPE-01　**优先级**：P1（发布前回归）　**seed**：42
- **覆盖分支**：`gridToPos`/`posToGrid`（C2 斜切映射）、`level.roof` gate
- **关联**：`production/v13-m4-slope-eng-assessment.md` §C.1/§C.5；本文件 §8.3/§8.4
- **目的**：锁「斜切映射自洽」+「老关零感知」两道地基。**本用例是 §8.4「漏 lift」bug 的唯一显式守门。**

**前置**：`const K = g.sandbox.__consts;`（取 `GRID_X/GRID_Y/CELL_W/CELL_H/COLS/ROWS`）。

**Part A · L1–L4 逐字节恒等（结构性免疫的机器证明）**
```js
const FLAT_Y = (r)=> K.GRID_Y + r*K.CELL_H + K.CELL_H/2;
const FLAT_X = (c)=> K.GRID_X + c*K.CELL_W + K.CELL_W/2;
for (const lv of [1,2,3,4]) {
  g.setLevel(lv); g.startGame();
  for (const [c,r] of [[0,0],[2,1],[4,2],[5,3],[8,4]]) {
    const p = g.sandbox.gridToPos(c,r);
    assert(p.x === FLAT_X(c), `L${lv} (${c},${r}) x 应逐字节等于平面基线`);
    assert(p.y === FLAT_Y(r), `L${lv} (${c},${r}) y 应逐字节等于平面基线（liftX≡0）`);  // === 严格相等
    const back = g.sandbox.posToGrid(p.x, p.y);
    assert(back.x===c && back.y===r, `L${lv} (${c},${r}) 往返应精确`);
  }
}
```
> **口径**：用 **`===` 严格相等**（非 `Math.abs<ε`）——「逐字节等价今日」是本轮的**承诺级**断言。

**Part B · L5 全网格往返精确（含斜坡 col0–4 + 平台 col5–8）**
```js
g.setLevel(5); g.startGame();
for (let c=0;c<K.COLS;c++) for (let r=0;r<K.ROWS;r++){
  const p = g.sandbox.gridToPos(c,r);
  const back = g.sandbox.posToGrid(p.x, p.y);
  assert(back.x===c && back.y===r, `L5 (${c},${r}) 往返应精确（斜切映射）`, {p, back});
}
```
> **必含 `c=4` 与 `c=5..8`**（判别列，见 §8.3）。**注意：`posToGrid` 必须用 `gridToPos` 的**原样输出 x**（格心 x）调用**——离格心采样属「点落在斜格内」的正常行为，不在本契约内。

**Part C · L5 lift 口径锁（H-无关的黑盒法：用 L1↔L5 差值还原 lift）**
```js
const lift = (c) => FLAT_Y(2) - g.sandbox.gridToPos(c,2).y;   // L1 无 lift ⇒ 差值 = liftX(格心)
assert(lift(0) >= 0,                        '斜坡段 lift 非负');
for (let c=1;c<=4;c++)
  assert(lift(c) > lift(c-1),               '斜坡 col0–4 lift 严格递增（左低右高）');
for (let c=6;c<=8;c++)
  assert(lift(c) === lift(5),               '平台 col5–8 lift 恒定');
assert(lift(4) < lift(5),                   '斜坡末列 lift < 平台 lift（col4→col5 交界）');
// 若实现暴露 __consts.ROOF_LIFT_H：再核 lift(4) ≈ H·(460−55)/450、lift(5) === H（H 缺省 60）
```
> **口径**：Part C **不硬编码 `H=60`**（H 仍在重算），用 **L1↔L5 差值**黑盒还原 lift；仅当实现暴露 `__consts.ROOF_LIFT_H` 时才核 `H` 真值。**可选强化**：建议实现期在 `harness/index.js` 的 `PROBE_SUFFIX` 暴露 `globalThis.__liftX = liftX;`，使口径从「差值推断」升级为「直取函数」。

**期望结果**：A/B/C 全绿。**任一列（尤其 col4）往返失败 = S1**（点击落格错位，直接破坏「落格直觉」命门）。

---

### 9.2 `SMOKE-028` · L5 弹道在斜坡列命中基线随 `liftX` 抬升

- **用例 ID**：SMOKE-028　**优先级**：P0（烟雾，每次改动必跑）　**seed**：42
- **覆盖分支**：`updatePlant` 发射 y（L969–974 直线 / L990–991 抛物）· `updateProjectiles` 命中基线 `zy`（L1073）
- **关联**：本文件 §8.3；`v13-m4-c2-5col-impl-spec.md` §2.C / §3（BLOCKING B1/B4）；`…-eng-assessment.md` §C.6-R1（**高**风险）
- **一句话**：**这正是为「改完看着挺好、一玩发现打不中」那颗雷设计的**——C2 把台面整体抬高 60px，若命中基线 `zy`(L1073) 不随 `liftX` 抬升，则**每一发直线弹都偏 ≥32px 而必 miss**，而**现有任何用例都捕获不到**。

**几何口径**：`flatY(2)=340`。**采样列取两处并跑循环**（下方 `CASES`）：
- **col6（平台，`liftX=60`）—— 工程侧口径的「现役主力种植位」**（`v13-m4-c2-5col-impl-spec.md` §2.C：平台列偏差 = `8 + 60 = 68px` 为**最大**）；
- **col4（斜坡末列，`liftX=54`）—— 斜坡边界覆盖**（偏差 `8 + 54 = 62px`）。

| 采样列 | 段 | 格心 x | `liftX` | 豌豆发射 y 期望(`flatY−liftX−8`) | 发射点 x | 僵尸 x（须在植物**右侧**） |
|---|---|---|---|---|---|---|
| **6** | 平台（主力位） | 640 | 60 | **272** | 670 | 680 |
| **4** | 斜坡（边界） | 460 | 54 | **278** | 490 | 500 |

**注入方式（隔离式，走真实发射/命中路径，等价 `REG-PULT-01` 手法）**：向 `__plants` 注入 `{type:'pea', col, row:2, cd:0}`（绕过种植校验，与 `REG-TRAP-03`/`SMOKE-007` 同惯例）；`setLevel(5)`→`startGame()`。**僵尸置于植物右侧**（本作常态：僵尸自右向左走近，发射瞬间 `z.x > 植物 x`）。

**Part A · 发射 y 抬升锁（每列一处）**
```js
const CASES = [{col:6, lift:60, zx:680}, {col:4, lift:54, zx:500}];
for (const {col, lift, zx} of CASES) {
  g.setLevel(5); g.startGame();
  g.sandbox.__plants.push({type:'pea', col, row:2, cd:0, dur:750, maxDur:750});
  g.sandbox.__zombies.push({type:'normal', row:2, hp:180, maxHp:180, spd:0, x:zx,
    eating:false, eatAnim:0, walk:0, dead:false});
  // A：发射 y 抬升锁（捕获发射瞬间的弹体 y）
  let pr0=null;
  for (let i=0;i<20 && !pr0;i++){ g.tick(0.01); const a=g.probe().projectilesArr; if(a.length) pr0=a[0]; }
  assert(pr0, `col${col} 应发射 pea 弹`);
  assert(Math.abs(pr0.y - (340 - lift - 8)) < 0.5,
    `col${col} pea 发射 y 应随 liftX 抬升（= 340−${lift}−8 = ${340-lift-8}）`, pr0.y);
  // B：命中锁（核心）
  let hit=false;
  for (let i=0;i<200 && !hit;i++){ g.tick(0.02); if(g.probe().zombiesArr[0].hp < 180) hit=true; }
  assert(hit, `col${col} 坡上弹道应命中同行僵尸（zy 必须随 liftX 抬升；偏 ${lift+8}px≫32 命中窗即 FAIL）`);
  assert(g.probe().zombiesArr[0].hp === 160, `col${col} 命中应扣 pea dmg=20`);
}
```
> **判别逻辑（为何 col4/col6 能抓、col0/col1 抓不到）**：错版 `zy=340`（平面）、`pr.y=340−lift−8` ⇒ `|Δ|=lift+8`。col6=`68`、col4=`62` ⇒ **>32 ⇒ miss（FAIL）**；col0（lift 6）`|Δ|=14<32` **仍 hit ⇒ 抓不到 bug**。故 **col4/col6 是必需采样列**（col6 兼验平台主力位）。
> **Part A 的双向守护**：既抓「发射 y **未**抬升」（assessment §1.5 **方案①**，`pr.y=332`⇒FAIL），也抓工程侧 `…spec.md` §3-**B4** 警示的「误以为要手改、**重复**减 `liftX` ⇒ 双重抬升」（`pr.y=278−54=224`⇒FAIL）。

**Part C · 抛物弹（投手 · 屋顶指定解法）子契约（次要）**
```js
// col6 平台注入 cabbage（cd=0），同行 x=700 僵尸（右侧）；驱动至命中
assert(命中时 zombie.hp === 180-40, 'cabbage 弹在坡上应命中并扣 40（L991 瞄准 + L1073 命中同口径抬升；BLOCKING B2）');
```
> **口径**：cabbage 判别力弱于 pea（抛物可自洽），但它是 L5 的**设计解法**，命中失效应属 S1；作为**次级**断言保留。**若实现漏改 L991（瞄准基线）而改了 L1073** ⇒ 抛物线落在坡下方 ⇒ 应 FAIL（对应 spec §3-B2）。

**α/β 鲁棒性**（spec §2.C 残余行为 / §7-1 待拍板）：本用例**僵尸一律置于植物右侧**⇒ 无论收口取 **α（命中用 `−liftX(z.x)`，地面参考）** 还是 **β（命中用 `−pr.lift0`，发射者参考）**，`|Δ|` 均 ≤ 8 < 32 ⇒ **Part B 都应绿**。**不要**断言「僵尸越过植物到左侧仍命中」——spec 明确其为「直线弹爬不上坡」的物理正确行为（非 bug）。

**期望结果**：Part A/B（+C）全绿。**Part B FAIL ⇒ S1**（屋顶核心玩法「直线弹打不中」失效，spec BLOCKING B1）；**Part A FAIL ⇒ 收口方案漂移或 B4 双重抬升**（对照 §9.4 决定改断言还是改实现）。

### 9.3 关于「并入既有用例 vs 新增」的裁决

| 候选内容 | 裁决 | 理由 |
|---|---|---|
| 往返精确性（Part B） | **新增** `REG-SLOPE-01` | `REG-ROOF-01`（col2）**不判别**「漏 lift」bug；判别点分散会稀释意图，几何契约独立成条更可读 |
| L1–L4 恒等（Part A） | **并入** `REG-SLOPE-01` | 与往返同属「映射层」，共用一个 sandbox 循环成本更低 |
| L5 弹道命中（SMOKE-028） | **新增** | 现**无任何**用例验坡上命中（§8.3 已证）；且属「每次改动必跑」的 P0 生命线 ⇒ **须进烟雾清单**，不能藏进 REG |
| L5 render「不抛」 | **已由** `SMOKE-027` L50–63 / `REG-END-02` 覆盖 | 不重复造帧守卫用例 |

### 9.4 契约对「收口方案」的敏感性（供主理人拍板）

> 术语对照：assessment §1.5 的**方案②** = 工程 spec §2.C 的 **α（地面参考）**；spec §2.C 的 **β（发射者参考）** 是另一变体；assessment 的**方案①**（发射 y 收回行基线）仅见评估文、spec 未采。

| 收口方案 | `REG-SLOPE-01` | `SMOKE-028` Part A（发射 y 抬升） | `SMOKE-028` Part B（命中） |
|---|---|---|---|
| **α = 方案②（命中 `−liftX(z.x)`）· spec §2.C 默认 / team-lead 锁定** | 不变 | **PASS** | **PASS** |
| **β（命中 `−pr.lift0`，偏差恒 8）** | 不变 | **PASS**（发射 y 仍抬升） | **PASS** |
| 方案①（发射 y 收回行基线） | 不变 | **FAIL** ⇒ 需**删 Part A** | PASS |

> ⇒ **Part A 的存在 = 「发射 y 必须随 `gridToPos` 抬升」的机器断言**，同时拦 spec §3-**B4**（双重抬升）。**Part B 在 α/β/方案① 三者下都必须绿**（它守的是「命中」，不是「高度口径」）——这也是 spec §7-1（α/β 待拍板）**不阻塞本用例**的原因。
