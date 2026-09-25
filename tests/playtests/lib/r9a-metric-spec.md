# R9-a 测量口径定义（v1.8 权威版）

> 归属：`tests/playtests/lib/prelude.js`（口径的代码级实现）· 权威依据：`production/v1.8-plan.md` §2 R9 + D-1 定稿增补 B（冲突时后者最高权威）
> 本文取代 v16 旧口径的测量权威地位；旧口径仅存档于 `v16-butter-balance.js` L447-467（nerfModel，反面教材）。

## 1. 为什么旧口径失效（教训）

旧 `nerfModel` 是代数投影 `min(1, p×T/cadence)`，隐含前提「每枚黄油独立贡献 T 时长」：

- **v1.6 域（T=2.5 < cd=2.6）**：每枚黄油命中时上一枚必已过期 ⇒ 前提成立，投影≈实测。
- **v1.7 域（T=3.0 > cd=2.6）**：连发黄油可在仍冻结时命中（概率 ≈ T−cd 后仍冻结的占比），剩余 freezeT 被整段丢弃 ⇒ 投影系统性**高估**实测（方向相反即翻车：调参者会以为加强无效）。

恒等式（v1.7 域严格成立）：

```
投影 − 实测 = Σ(刷新事件时的剩余 freezeT) / 窗口
```

实测验证锚点：v1.7 域每刷新浪费恰好 T−cd = 0.4s（马尔可夫 renewal 可证），投影−实测 ≈ 1.1pp。

**结论：测量一律走直接事件账本（零代数假设）；代数投影只作双轨对照上报，且仅在 T≤cd 域允许进入结论。**

## 2. 三指标权威定义

均由 prelude 事件账本直接产出，适用域 = 任意 p/T/cd 组合。

### 2.1 freezeCoverage（冻结覆盖率）

```
freezeCoverage = 冻结帧数 / 计量窗口帧数
```

- 冻结判定：`z.freezeT > 0`，取 **tick 前**读数（与源码 L1628-1638 移动门控同语义）。
- 计量窗口：排除 warmup 预热段；僵尸死亡后停止计入分母。
- 附属：`chillFrac`（slowT>0 且非冻结）、`unionFrac`（冻结∪chill）。
- 适用域：任何参数域成立（帧计数，无代数假设）。

### 2.2 refreshWaste（刷新浪费）

```
refreshWaste = Σ(刷新事件时的剩余 freezeT)
```

- **刷新事件**：applyFreeze 被调用瞬间，`preT = z.freezeT（调用前读数）> 0`。
- 每事件浪费额 = 该次 preT（被整段丢弃的定身时长）。
- 附属字段：
  - `wastePerButter` = Σ浪费 / applyFreeze 调用数（权威黄油计数=调用次数，含刷新式续冻）；
  - `legacyButters`（跨 0 计数）/`resetEvents`（freezeT 帧间不降反升）双轨交叉校验，与 v16 思路同源；
  - `naiveProjection`：`{formula, value, deviation(=投影−实测), wasteShare(=Σ浪费/窗口), identityResidual}` 双轨上报，恒等式残差应≈0（账本 vs 代数互证）。
- 适用域：任何参数域；T≤cd 域数学上恒 0（可作账本自检）。

### 2.3 denialPx（否认位移）

```
denialPx = Σ(被剥夺的僵尸行程 px)
```

- 每走路帧：名义行程 = `spd × dt`；冻结帧全额剥夺（+spd·dt）、chill 帧剥夺 40%（+spd·dt×0.4）、自由帧 0。
- **排除项**（防归因污染）：啃食帧（位移本为 0，归因于啃食目标而非控制）、teleport 回传帧（位移非物理，按 x 右跳识别）。
- 附属：`denialBreakdown = {frozenPx, chillPx}`。
- 适用域：任何参数域；可被 R8 聚合为「每阳光否认位移」（造价/否认位移）。

## 3. 溢杀 clamp（D-1 终稿口径补丁 · 口径冻结）

```
有效伤害 eff = min( max(当前hp, 0), 本弹伤害 )
溢出        = 本弹伤害 − eff
```

- 「当前hp」= **逐弹结算瞬间**读数（hp 访问器拦截写入瞬间取 pre），非窗口末。
- 下界 0 防溅射受害者负 hp 时序坑（源码 L1594 只结算直中者，死亡走下一帧 filter ⇒ 同帧可重复计伤、hp 可为负）。
- 直中与溅射**统一同式**；分类按伤害值精确匹配（浮点 eps=1e-6；直中优先，歧义标 unknown）。
- **溢杀率拆两栏**：`overflow.direct` / `overflow.splash`（直中溢杀与溅射调参无关，分栏防误读）。
- **适用域**：溢杀率仅真实行程臂（有死亡）定义上报；存活靶臂（hp×200 无死亡）clamp 恒等，维持 raw 分布（`overflow.mode` 标注）。
- 边界情形：
  - 溅射受害者当帧 hp<0：max(·,0) 先钳底，eff=0，全额计溢出；
  - 同帧重复计伤：按对象引用逐弹记录，互不吞并；
  - 死亡下帧 filter：死亡判定以 `dead` 标志为准，`deadT` 记入账本。

## 4. 口径自检哨兵（双域，D-1 增补 B-8 定稿）

旧线性式 `p·n·T/cd` 的**域判定双跑**（参数覆写：p* 走受控随机门、T* 走 applyFreeze 包装覆写）：

| 域 | 参数 | 期望判定 | 判据 |
|---|---|---|---|
| v1.6 域 | p*=0.25, T*=2.5 ≤ cd=2.6 | **PASS** | 刷新浪费事件恒 0（确定性）且每种子黄油可达 |
| v1.7 域 | p*=0.27, T*=3.0 > cd=2.6 | **必须 FAIL** | 刷新事件 ≥3 且每黄油浪费 >0.05s 且投影−实测 >+0.3pp |

**双域断言齐备才判哨兵有判别力**（单域 FAIL 不足：可能另一域也失效）。判别力锚在「刷新浪费事件的有无」（确定性事件计数），不锚覆盖率小样本残差（±2pp 噪声会淹没 ~1.1pp 的理论偏差）。

## 5. 前提声明机制（注释升级为机器校验）

脚本启动实测源码常量 → 动态判域 → 写入 `results.meta.preconditions`（数据）：

| 实测项 | 方法 | 期望（v2.2.0 定版；测量常量未动） |
|---|---|---|
| VERSION | 沙箱 `__VERSION` | `2.2.0`（env `PVZ_EXPECT_VER` 参数化） |
| 黄油 p | 受控 Math.random 二分（每次开火首次随机调用=掷定） | 0.27 ±1e-6 |
| 定身 T | 对假僵尸调 applyFreeze 读 freezeT | 3.0 |
| corn 开火 cd | 强制开火后读 p.cd | 2.6（≠CARDS.cd=6 种植卡冷却） |
| splash 表 | 逐类型强制开火读弹体 | cabbage/corn 30·0.40·**grid=true**（同格锁）；melon/icemelon 55·0.55·grid=false |
| applyFreeze 调用点 | 源码文本快照 | 1 处（仅直中 L1580；溅射不调用） |

动态判域：`T≤cd ⇒ 投影分支启用`；`T>cd ⇒ 投影分支禁用并标记 overlapWasteExpected=true`。
实测与期望不符 ⇒ gate5 FAIL「源码漂移」。

**隐含前提（11 条中与本模块耦合的 5 条）**：
1. applyFreeze 是黄油唯一入口（溅射不调用）——调用点计数校验；
2. freezeT 帧递减语义恒定——canary 行为学佐证；
3. chill/freeze 并存状态机不变——canary 实测 chill 位移 ×0.6；
4. 顶层 function 沙箱桥可用（applyFreeze 若改 const 箭头函数桥即失效）——gate6 前置自检；
5. 投影对照仅在 T≤cd 域启用——preconditions.domain 数据化判定。

## 6. 与 v16 旧口径差异表

| 维度 | v16 旧口径 | v1.8 R9-a 权威口径 |
|---|---|---|
| 覆盖率 | frozenT/t（帧计数） | 同左（保留），但补 warmup 排除 + 死亡停止计分母 + chill/union 附属 |
| 黄油计数 | 跨 0 计次（旧）→ applyFreeze 调用次数（v1.7 改造） | 调用次数为准；legacy/resetEvents 降为交叉校验轨 |
| 浪费 | 无（投影隐含吞掉） | refreshWaste 逐事件直测 + naiveProjection 双轨 + 恒等式残差 |
| 投影 | nerfModel 直接进结论 | 仅对照；T>cd 域禁入结论（preconditions.domain 禁用标记） |
| 位移 | netDisp（净位移，混入击杀/进屋效应） | denialPx（逐帧归因：冻结全额/chill 0.4/自由 0；排除啃食与 teleport） |
| 溢杀 | 无 | eff=min(max(hp@瞬间,0),dmg)，直中/溅射分栏，仅真实行程臂报率 |
| 前提 | 注释声明 | 机器校验（gate5 实测漂移即 FAIL）+ preconditions 数据落档 |
| 哨兵 | 无 | 双域断言（v1.6 域 PASS + v1.7 域 FAIL）齐备才判有判别力 |

## 7. 复用指引（R7 / R9-b / v18-acceptance）

```js
const P = require('./lib/prelude.js');
const { g, pre, gates } = await P.bootstrap();          // 七道门（FAIL 即中止）
const ledger = P.createLedger({ warmupT: 8, classify: P.makeHitClassifier({ direct: [15, 65], splash: [6, 35.75] }) });
P.attachHpProbe(z, (preHp, postHp) => ledger.noteHpWrite(z, ledger.tNow, preHp, postHp));
const cnt = P.instrument(g, { onFreeze: (zz, preT) => ledger.noteFreeze(zz, ledger.tNow, preT) });
const m = P.runWindow(g, { ledger, zombies: [z], duration: 90, teleport: 300, p: pre.measured.butterP, T: pre.measured.freezeT, cd: pre.measured.cornCd, nPlants: 1 });
// m.freezeCoverage / m.refreshWasteTotal / m.denialPx / m.overflow.* 即权威口径读数
```

- 溅射受害者/多目标场景：把所有僵尸引用喂 `runWindow` 的 `zombies` 数组，账本按引用记账。
- 溅射分类表 `makeHitClassifier` 的 direct/splash 值从 `pre.measured` 推导（勿硬编码）。
- R7 溢杀臂：teleport 传 null（真实行程），`overflow.mode` 自动转 real 并给出两栏溢杀率。
