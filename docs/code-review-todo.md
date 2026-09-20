# 代码评审待办 · 种植链路专项（2026-09-20）

> **评审人**：Diana（设计系统架构师，受托做代码质量把控）
> **复核**：主理人（2026-09-20 17:0x，对照 main=`b9a6ad4` 源码逐条验证——全部承重事实成立；两处计数更正 + 三点补充已并入下文，汇总见文末附录 A）
> **评审范围**：`plants-vs-zombies.html` 种植链路——onClick(L650-747) / drawPlant(L1562-1601) / drawPlantInner(L1605-1793) / updatePlant(L971-1029) / loop(L565-604)
> **基线**：main = `b9a6ad4`（v1.3 验收反馈三连修 + 产物归档，四门控全绿）
> **结论**：**架构不动**（单文件零构建是产品承诺，见 ADR-001；2342 行 / 11 分区在健康范围）。以下为局部优化项，按优先级排序，研发照单执行即可。

---

## 背景一句话

本文件 2342 行、68 个顶层函数，工程纪律（门控体系 / 决策注释 / 健壮性兜底）是一流的。问题集中在**种植链路的三个局部热点**：概念散落、渲染侧变异状态、校验规则链膨胀。改一次"植物落地"要同时理解 3 处代码——这就是历史上改落地动画耗时半天的根源。

---

## P0 · 修真 bug：落地尘土是死代码

**位置**：`drawPlant` L1592-1599

**现象**：落地尘土（8 粒 `#8b6528` 粒子，蓝图 §2 的 E 段设计）**从未生效过**。

**成因**（证据链）：
- 动画进行中（`plantT < 620`）每帧走 L1589 的 `return`；
- 跳出动画分支时 `plantT` 已 `>= 620`；
- 而尘土判定（L1592）要求 `plantT ∈ [220, 280)` —— **恒为假**。

**修法建议**：把尘土判定移进动画分支内部，以 t 跨越 0.35（A→C 交界）为触发点，替换现有的 ms 窗口判定：

```js
// 在 t < 0.35 分支结束后、缩放段开始前：
if (t >= 0.35 && !p.dirtDone) {
  p.dirtDone = true;
  if (effects.length < 500) { /* 原 8 粒子 push 逻辑原样搬入 */ }
}
```

**⚠️ 主理人复核修正——落点位置**：动画分支实际是 `if (t < 0.35){…} else if (t < 0.78){…} else if (t < 1){…}` 的 **if/else-if 链**，t≥0.35 时不会进第一个分支，所以上面的代码**不能按字面插在"0.35 分支结束后"**（否则 else-if 短路永不执行）。正确落点：插在**整个 else-if 链结束之后、`ctx.save()` 之前**（L1583-1584 之间）——此时 t 已算出，两种进入路径（t 恰跨 0.35 / 更晚）都能触发，语义正是"到达 A→C 交界即喷一次"。

**⚠️ 复核补充——盆格尘土位置**：尘土 spawn 的 y 坐标 `pos.y+18` 未加 `POT_LIFT` 偏移，屋顶盆上种植时尘土会喷在盆底格心而非盆口。真机验收时顺带看一眼：视觉可接受则不动，违和则在 push 前 `pos.y -= lift`（此时 lift 变量在作用域内，零成本）。

**验收**：
- 真机种植一株，A→C 交界处肉眼可见尘土喷出；
- 四门控复跑：烟雾 27/27 · 回归 60/60 · 总线 56/56 · bench 五场景 PASS；
- 若 harness 可注入帧步进，补一条 REG 断言锁「种下后 t 跨 0.35 时 effects 出现 kind=particle」。

---

## P1-A · `canPlant(card, grid)` 规则表重构

**位置**：`onClick` L719-732（五连 if 校验链）

**问题**：
- 占用检查 / 睡莲水轴 / 水格需垫 / 禁盆 / 屋顶需盆 / 盆格禁重，**6 条规则挤在 6 行超长 if 里**（复核更正：原文「五连 if/5 行」漏计"盆格禁重"条，结论不受影响）；
- 09-20 当天睡莲（`a08788c`）和花盆两起越界 bug，**都是同一条链漏写逆向约束**——睡莲能种地上、花盆能放非屋顶关；
- 每新增一种地形组合（新植物线可能再加），这条链就再长一节，下一个 bug 已在排队。

**修法建议**：提炼纯函数，规则数组化，双向约束写在同一处：

```js
function canPlant(card, g){
  // 规则表顺序 ≠ 行为：睡莲先于盆校验（L5 出水轴拒绝语义而非「先放花盆」），重构必须保持
  const rules = [
    [c => isOccupied(g, c),      '这格已经有植物了'],
    [c => c.type==='lilypad' && !(level.water && WATER_ROWS.includes(g.y)), '睡莲只能种在水里'],
    [c => level.water && WATER_ROWS.includes(g.y) && c.type!=='lilypad' && !hasPad(g), '水格需要先铺睡莲'],
    [c => !level.roof && c.type==='planter', '花盆只能放屋顶'],
    [c => level.roof && c.type!=='planter' && !hasPot(g), '先放花盆'],
    [c => level.roof && c.type==='planter' && isOccupied(g, c), '这格已经有植物了'],  // 复核补：第 6 条盆格禁重
  ];
  for (const [violated, msg] of rules) if (violated(card)) return {ok:false, msg};
  return {ok:true};
}
```

- onClick 种植段收敛为：`const v = canPlant(c, g); if(!v.ok){SFX.deny();toast(v.msg,1.4);return}`；
- **关键约束**：重构后行为必须与现状逐条等价（包括拒绝顺序、零副作用语义——校验在扣款前）；用现有 SMOKE-025 T15 / SMOKE-027 T17/T18 断言做回归锚点，建议再补「规则表顺序 ≠ 行为」的说明注释。

**验收**：四门控全绿 + 睡莲/花盆越界旧断言原样通过（不允许顺手改基线）。

---

## P1-B · `spawnPlant()` 工厂收拢植物对象 schema

**位置**：`onClick` L736-739（内联建档）

**问题**：
- 植物对象的字段在 onClick 里内联 push，而 `plantT / plantDone / dirtDone` 等字段又在 drawPlant 里**运行时补挂**（L1565 的 `plantT===undefined` 兜底就是症状）；
- 新植物线（玉米投手/冰冻射手/冰冻西瓜）每株都可能引入新字段，散养会继续恶化；改字段名要全文搜索，无单点真相。

**修法建议**：

```js
function spawnPlant(type, g, cardSlotIdx){
  const c = CARDS.find(k => k.type === type);
  return {
    col: g.x, row: g.y, type, cd: 0,
    sunT: type==='sunflower' ? 7 : 0,
    armT: level.armTime, dur: c.dur, maxDur: c.dur,
    // F-01 种植动画
    plantT: 0, plantDone: false,
    plantFrom: { x: CARD_X0 + cardSlotIdx*CARD_W, y: CARD_Y + CARD_H/2 },
    dirtDone: false,        // 显式初始化，消灭 draw 侧 undefined 兜底
  };
}
// onClick 内：plants.push(spawnPlant(c.type, g, selected.i))
```

- drawPlant L1565 的旧对象兜底**保留不删**（对局中铲除重种无此问题，但 harness 注入的测试对象可能仍是旧 schema）；
- 新字段一律只加在工厂里，禁止调用点内联补。

**验收**：四门控全绿；REG-END-02 等既有断言不动。

---

## P2-A · 种植动画时间轴移入 update()

**位置**：`drawPlant` L1567（`p.plantT += lastDt * 1000`）

**问题**：渲染函数在改游戏状态（渲染侧变异），且读的是 `lastDt` 而非 `sdt`，导致：
- 4x 倍速下落地动画不加速（逻辑加速、表现原速，感受割裂）；
- 暂停时动画照常播完（update 停了 render 还在跑）——是否算 bug 取决于设计意图，**若"暂停冻结一切"是预期，这就是行为偏差**。

**修法建议**：`update(dt)` 遍历 plants 时推进 `p.plantT += dt*1000`；drawPlant 退化为纯读（用当前 plantT 插值，不再自增）。
**注意**：该项涉及 update/render 边界挪动，正是架构 README §1「渲染层永远只读、不写」不变量的回归——建议**捆进新植物线 S1 一起做**，避免单独为一处表现问题走一轮独立发版。

**⚠️ 复核补充——P0×P2-A 接缝**：P0 修复会在 draw 侧新增 dirtDone 标记 + effects.push 变异，P2-A 又要重构同一区域的推进逻辑——两刀共用种植链路。缓解：P0 附带的 REG 断言（种下后 t 跨 0.35 时 effects 出现 kind=particle）**写法上别绑死"draw 侧触发"实现细节**，只断言"状态推进到 t≥0.35 后粒子已产生"——这条断言在 P2-A 挪边界后依然成立，正好当 P2-A 的安全网。测试接缝已验证可行：`drawPlant(p, dtRef)` 的 dtRef 参数可注入帧步进，SMOKE-010 已证明 harness 能驱动 drawPlant。

**验收**：4x 速种植动画全程加速；暂停时动画冻结；四门控全绿。

---

## P2-B · per-type 分支链观察项（暂不动）

**位置**：`drawPlantInner` L1605-1793（9 类植物 if 链）、`updatePlant` L971-1029

**现状**：新植物三连发后 9 类 → 12 类，每类约 40-60 行绘制代码，函数会逼近 400 行。
**决策**：**现在不动**。分支链在 12 类以内尚可维护，提前抽注册表（`PLANT_RENDERERS[type] = fn`）属于过度设计。触发条件：**新植物线合入后若 drawPlantInner 超 450 行或新增类型时频繁合并冲突，再立重构项**。

---

## 执行排期（已与项目负责人对齐的口径）

| 项 | 时机 | 理由 |
|---|---|---|
| P0 尘土 bug | **随时，尽快** | 真 bug，5 分钟手术，独立小刀 + 门控即收 |
| P1-A canPlant | 捆新植物线 S1 | S1 本来就要动校验（新植物地形属性），一次门控两件事 |
| P1-B spawnPlant | 捆新植物线 S1 | 同上，地基先行，三株新植物直接受益 |
| P2-A 动画时间轴 | 捆新植物线 S1（可选） | 表现一致性改进，无功能风险 |
| P2-B 分支注册表 | 观察项 | 触发条件见上文，现阶段不动 |

## 研发执行红线（项目既有约定，重申）

1. 改源码走**新版本流程**，不得覆盖 `production/release/` 下任何分发件；
2. 施工遵循 code-map 定位 → 只读目标区块 → 精确 Edit → **重跑 `node tools/gen-code-map.mjs`**；
3. 任何源码改动后四门控必须全绿：烟雾 27/27 · 回归 60/60 · 总线 56/56 · bench 五场景 PASS；
4. 禁止同文件并行 Edit；已推送的提交不 amend。

---

## 附录 A · 主理人复核记录（2026-09-20 17:0x）

对照 main=`b9a6ad4` 源码逐条验证，**评审全部承重事实成立**，可以照单执行。

### 事实核验明细

| 项 | 核验点 | 结果 |
|---|---|---|
| P0 | 动画分支每帧 L1589 `return`，跳出时 `plantT>=620`，尘土判定 `[220,280)` 恒假 | ✅ 死代码确证 |
| P1-A | onClick L719-732 校验链实为 **6 条规则 6 行**（占用/睡莲水轴/水格需垫/禁盆/屋顶需盆/盆格禁重）；已回填第 6 条进规则表 | ✅ 成立（计数更正 ±1，结论不变） |
| P1-B | L736-739 内联建档 + L1565 draw 侧 `plantT===undefined` 运行时补挂；tests 注入对象（bench.js L256 / pot-occlusion-verify.js L34 / e5n4-runner.mjs L183）均自带 `plantT:620,plantDone:true` | ✅ 成立，**"旧对象兜底保留不删"判断正确** |
| P2-A | L1567 读 `lastDt`（未乘 gameSpeed）→ 4x 速动画不加速；loop L580-584 update 受 `!paused` 门控而 render 恒跑 → 暂停动画照播 | ✅ 成立，两个行为偏差都是真的 |
| P2-B | drawPlantInner 实际 L1605-1792（188 行），9 类；3 新植物后估 320-370 行 | ✅ 450 触发线留量合理 |
| 基线 | HEAD=`b9a6ad4`、2342 行、68 顶层函数 | ✅ 与文档口径一致；全文行号引用偏差均 ≤1 行 |

### 三点补充（已并入正文对应节）

1. **P0 落点修正**（见 P0 节）：尘土触发须插在 else-if 链之后 `ctx.save()` 之前，不能按原字面插在 0.35 分支内（else-if 短路会吞掉）；另补盆格尘土 `POT_LIFT` 偏移观察点。
2. **P1-A 规则表补全**（见 P1-A 节）：示例代码补第 6 条"盆格禁重"，重构后 6 条规则与现状逐条等价。
3. **P0×P2-A 接缝**（见 P2-A 节）：REG 断言写成实现无关（断状态推进后果，不断触发侧），P0 的断言即可复用为 P2-A 的安全网；dtRef 帧步进注入可行性已由 SMOKE-010 验证。

### 排期裁决（维持 Diana 口径）

- **P0 随时尽快**：真 bug、独立小刀、四门控即收——下一刀就是它；
- **P1-A / P1-B / P2-A 捆新植物线 S1**：一次门控两件事，地基先行；
- **P2-B 挂观察**：触发条件 = drawPlantInner 超 450 行或新植物合并冲突频发。
