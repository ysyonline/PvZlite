# 回归测试计划 · PvZ Lite

> **基础设施**：README「无头测试方法」章节 —— `vm.runInContext` + `ctx` Proxy stub + `__probe` / `__api` 探针。所有用例都是 Node.js 单文件脚本，无 npm 依赖、无浏览器。
>
> **原则**：
> 1. 每个用例必须有明确断言（`__probe` 返回值 vs 期望值）；
> 2. 优先跑自动（烟雾清单），手动 Playtest 只做回归之外的事；
> 3. 每个 S0/S1 Bug 修完必须补一个回归用例（见 `bug-taxonomy.md`）。

---

## 1. 测试目录结构（建议）

```
tests/
├── README.md                  # 目录索引（本文件同级）
├── playtest-plan.md           # 手动 Playtest 三轮计划
├── regression-plan.md         # 本文：回归测试计划
├── bug-taxonomy.md            # Bug 分级矩阵
├── cases/                     # 每个用例一个 .md 文件，便于 review
│   ├── SMOKE-01-state-machine.md
│   ├── SMOKE-02-card-cooldown.md
│   ├── ...
│   ├── REG-01-trap-gt-external.md
│   ├── REG-02-trap-raf-loop.md
│   └── ...
├── harness/                   # 无头运行器脚手架（可选，见第 5 节）
│   ├── harness.js             # vm.runInContext 封装
│   └── run-all.js             # 一键跑全部用例
└── playtests/                 # 手动 Playtest 报告存放处
    └── round-N-*.md
```

---

## 2. 烟雾测试清单（Smoke · ≤ 10 条，每次改动必跑）

跑法：`node tests/harness/run-all.js --smoke`，全部 PASS 才允许合并。

| ID | 用例 | 覆盖分支 | 断言方式 |
|---|---|---|---|
| SMOKE-01 | **状态机三态切换** | menu → play → end → menu | `__api.startGame()` 后 `__probe().state==='play'`；强推 1 只僵尸进屋后 `state==='end' && won===false` |
| SMOKE-02 | **卡片冷却递减** | `update()` 里 `cardCD[type]` 递减 | 种 1 次豌豆 → `cardCD.pea>0`；tick 5.1s → `cardCD.pea<=0`；期间第 2 次种被拒绝 |
| SMOKE-03 | **阳光不足以种卡** | `sun>=c.cost` 分支的 else | sun=50 时选豌豆（cost=100）→ 点种植格 → 无 plants 增加，`SFX.deny` 被调用 |
| SMOKE-04 | **僵尸进屋 → 游戏结束** | `z.x<GRID_X-40` | 手动 `zombies.push({x:0,...})` + tick 0.1s → `state==='end'` |
| SMOKE-05 | **通关解锁下一关** | `wave>=totalWaves && !waveActive && spawnQueue.length===0 && zombies.length===0` | 强推全部僵尸到死 + 强制走完 5 波 → `state==='end' && won===true && unlockedLevel>=2` |
| SMOKE-06 | **卡片 vs 植物冷却分离** | 陷阱 #2 对照 | 种豌豆后 `p.cd≈0`（未攻击时）、`cardCD.pea=5`；两者随时间独立递减 |
| SMOKE-07 | **for...of splice 安全** | 陷阱 #3 对照 | 种坚果 + 手动让僵尸啃死 → 遍历后 `plants` 无残留 `_dying` 项、无迭代器错乱 |
| SMOKE-08 | **主循环异常隔离** | 陷阱 #5 对照 | `zombies.push(null)` + tick → 抛 TypeError 但被 catch，下一帧 `loop` 仍续订（`rafQueue.length` 不为 0） |
| SMOKE-09 | **gt 时钟外置** | 陷阱 #1 对照 | 直接调 `update(1)` 不动 `gt`；用 `__api.tick(1)` 后 `gt===1` |
| SMOKE-10 | **暂停不推进** | `if(state==='play'&&!paused)` | paused=true 时 tick 10s → `gt` 不增、`zombies` 位置不变 |

---

## 3. 完整回归清单（Regression · 发布前跑）

按 README「已知陷阱」+ 关键分支全覆盖，共 **26 条**。

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
| REG-WAVE-03 | 大波预警 4s 期间不刷怪 | `warn.active=true` 时 `spawnQueue.length===0` 直到预警结束 |
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
| REG-MINE-01 | 8s 武装期内僵尸踩过不爆 | `armT>0` 时僵尸走到地瓜位置 → 不触发 boom |
| REG-MINE-02 | 武装后引爆 + 邻近行 0.9 格内伤害 | 触发 boom、相邻格僵尸 hp 减少 |

### 3.9 通关 / 解锁（2 条）

| ID | 用例 | 断言 |
|---|---|---|
| REG-END-01 | 通关解锁下一关 | `unlockedLevel` 递增 |
| REG-END-02 | 通关 L2 后无下一关，显示「已通关全部关卡」 | `won=true && !LEVELS[levelNo+1]` |

---

## 4. 用例模板（`tests/cases/*.md`）

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

README 现有脚手架是"手工搭"版本，能跑通但缺生产级能力。以下是按**收益 / 成本**排序的改进建议：

### 5.1 短期（本 sprint 可落地，成本 ≤ 半天）

**H1. 抽出公共 harness 到 `tests/harness/harness.js`**
当前每次测试都要重写 stub。建议封装：
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

### 5.2 中期（下一个 sprint）

**H2. `run-all.js` 一键跑全部**
- 扫描 `tests/cases/*.md`，抽出 code block 里的 js
- 按优先级顺序跑（SMOKE → REG-TRAP → REG-*）
- 输出 JSON 报告到 `tests/reports/latest.json`，含每条用例 PASS/FAIL

**H3. `--smoke` 模式**
- 只跑 SMOKE-*，目标 < 5 秒；用于 pre-commit 或保存钩子。

**H4. flaky 检测**
- 同一用例连续跑 3 次，结果不一致则标记 flaky，写入 `tests/reports/flaky.json`。

**H5. 时间可控（RNG 种子）**
- `Math.random` 目前完全随机，导致波次生成、阳光掉落位置不可复现。
- 建议增加 `__api.seed(n)` 覆盖 `Math.random`，让测试可复现。

### 5.3 长期（Phase 7+）

**H6. 覆盖率收集**
- 用 `istanbul` 或简单正则统计 `__api` 暴露了哪些函数、`update()` 内哪些分支未被触发。
- 输出到 `tests/reports/coverage.txt`。

**H7. 性能基准（Perf Baseline）**
- 用 `performance.now()` 记录每 100 帧耗时，超过阈值报警（如 > 16ms / 100 帧 = 掉帧）。
- 配合 `docs/architecture/perf-profile.md`（工程同学产出）。

### 5.4 现有脚手架短板（明确记录）

| # | 短板 | 影响 | 修复优先级 |
|---|---|---|---|
| 1 | 每次测试重写 stub | 维护成本、易漏变量 | H1（本 sprint） |
| 2 | `Math.random` 不可控 | 波次测试不稳定、flaky | H5（下 sprint） |
| 3 | 无一键跑 | 每次改动需手工挑用例 | H2（下 sprint） |
| 4 | 无 flaky 隔离 | 一次假失败污染整个信号 | H4（下 sprint） |
| 5 | 无覆盖率 | 不知道测到哪了 | H6（Phase 7） |
| 6 | `__probe` 字段有限 | 断言深度受限 | H1 时扩展 |
| 7 | 音频路径难测 | `window` 未定义导致 try/catch 吞掉 | 保留现状（降级合理） |
| 8 | DOM 事件测试需手动合成 | onClick 依赖 `e.clientX/clientY` | H1 补 `__api.clickAt(x,y)` |

---

## 6. 执行节奏建议

- **每次 commit 前**：跑 `SMOKE-*`（10 条，目标 < 5s）
- **每次功能合并前**：跑 SMOKE + 相关 REG-*
- **每次发布前**：跑全部回归 + 三轮 Playtest
- **修复 Bug 后**：为该 Bug 增加 1 条 REG-* 用例（见 `bug-taxonomy.md`）

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
| 音效正确性 | ❌（WebAudio 无头不可测） | ✅ 全轮 |
| UI 视觉 | ❌ | ✅ 全轮 |
| 误操作 / 手感 | ❌ | ✅ Round 1/2 |
| 快捷键冲突 | 部分 | ✅ Round 3 |
