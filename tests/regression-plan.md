# 回归测试计划 · PvZ Lite

> **基础设施**：README「无头测试方法」章节 —— `vm.runInContext` + `ctx` Proxy stub + `__probe` / `__api` 探针。所有用例都是 Node.js 单文件脚本，无 npm 依赖、无浏览器。
>
> **原则**：
> 1. 每个用例必须有明确断言（`__probe` 返回值 vs 期望值）；
> 2. 优先跑自动（烟雾清单），手动 Playtest 只做回归之外的事；
> 3. 每个 S0/S1 Bug 修完必须补一个回归用例（见 `bug-taxonomy.md`）。
>
> **文档状态（2026-09-17 同步）**：烟雾 **23 条** · REG **30 条** · 总线 **55 条**（数字以 `tests/harness/cases/` 实际文件为准）。本轮已修正：烟雾条数（21→23，新增 SMOKE-022/023 音频补齐契约）、总线条数（47→55，`AUDIO_ROUTES` 由 13 键扩到 21 键）。上一轮（2026-09-16）修正：烟雾条数（17→21）、REG 条数（26→30）、§3.4 预警时长（4s→**2s**）、§3.8 地瓜范围契约（改为实际「仅同排 ±54px」，并标注为**已裁决的实现偏差**）、§5 脚手架落地状态、§1 目录结构改为实际结构。

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
