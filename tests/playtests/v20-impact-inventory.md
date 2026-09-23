# v2.0.0 键位迁移 · tests/ 影响面盘点（T-101）

> 生成于 v1.9.0 工作树快照 · 供 T-102（LEVELS 换键）与 T-104（运行期键位切换）确定施工范围
> 对应规划风险项 **R-3（旧验收脚本绑数字键）**。纯静态盘点，未运行任何门控脚本，未修改任何现有文件。

---

## ① 盘点方法（grep 模式 × 原始命中计数）

扫描范围：`tests/` 全目录（根、harness/、harness/cases/、playtests/、playtests/lib/、perf/、e5n4-evidence-backup/、reports/；.js/.md/.json/.txt/.mjs 全覆盖）。

| grep 模式 | 命中文件数 | 命中行数(约) | 说明 |
|---|---|---|---|
| `LEVELS` | 18 | 66 | 含 `__LEVELS` 沙盒桥、setLevel 守卫、md 文档引用 |
| `levelNo` | 21 | 57 | 含 json/txt 证据快照（历史记录） |
| `level=` (URL 参数) | 27 | 55 | 多数在 md 手册/playtest 执行包 |
| `setLevel\|setUnlocked\|currentLevel\|levelKey\|LEVEL_INDEX` | 24 | 74 | 以 setLevel 为主；`currentLevel`/`levelKey`/`LEVEL_INDEX` **全库零命中** |
| `unlockedLevel` | 9 | 18 | harness 桥 + 解锁链断言（SMOKE-024/025/027 等） |
| `LEVELS[6]` 终局边界 | 3 | 3 | REG-END-02 断言 + 2 处 md 记录 |
| 字符串键样本 `'1-1'`/`"1-1"`/`'2-1'` 等 | **0** | 0 | 符合预期：当前体系纯数字键 |
| `LEVEL_NO`（playtests 常量） | 2 | 2 | v19 两个 playtest 脚本 |
| `pvz_unlocked` / `pvz_diff_clears` | 9 | 24 | 存档键；`pvz_diff_clears` 含 `hard:3` 复合键内嵌关卡号 |
| `'hard:3'` 类复合键 | 4 | 15 | v15-acceptance / REG-TESTMODE-01 及证据文件 |

噪音排除：`level`/`wave` 裸词未统计（噪音过大）；`unlockLevel` 类误命中剔除；json/png/txt 为历史证据快照原则不动。

---

## ② 逐条清单（三分类：断言过时 / 逻辑回归 / 无影响）

### A. harness 基础设施（门控关键路径，T-104 单点收口处）

| # | 文件:行号 | 片段摘要 | 分类 | 处置建议 |
|---|---|---|---|---|
| A1 | harness/index.js:200-203 | `setLevel(n){ if(!LEVELS[n]) return; levelNo=n; level=LEVELS[n]; }` | **逻辑回归** | T-104 核心：签名改 `setLevel(key)`，守卫按字符串键判存在性；`levelNo=n` 赋值随运行期变量迁移消失 |
| A2 | harness/index.js:205 | `setUnlocked(n){ unlockedLevel=Math.max(1,n\|0); }` | **逻辑回归** | `n\|0` 对字符串键恒 0 → `Math.max(1,0)=1` 恒回 L1（**真红**）。签名改键名，去数字强转 |
| A3 | harness/index.js:124（__probe） | 快照字段 `levelNo, unlockedLevel` | **逻辑回归** | `levelNo` 变量消失 → probe 改 `levelKey`；建议双暴露（见④-4） |
| A4 | harness/index.js:88 | `globalThis.__LEVELS = LEVELS;` 桥 | 逻辑回归(依赖) | 桥保留，但下游全部按**数字下标**读它（见 B 组）——桥须桥 materializeLevels 展开后的新表，下游 ~15 处数字下标跟着改 |
| A5 | run-smoke.js / run-all.js | 全文 | 无影响 | 纯编排器（readdirSync+require），零键位引用，无需改动 |
| A6 | harness/verify-bus.js | — | 无影响 | 音频总线校验，键位无关 |

### B. 门控用例（进 run-smoke / run-all，改后须全绿）

| # | 文件 | 行号 | 片段摘要 | 分类 | 处置建议 |
|---|---|---|---|---|---|
| B1 | REG-END-02.js | 14/15/17/25/26 | `setUnlocked(5)+setLevel(5)`；`probe().levelNo===5`×2；`__LEVELS[6]===undefined` | **断言过时+逻辑回归** | ⚠️ 全库唯一"前提崩塌"级风险，见④-3：末位关语义变（L5→'4-1' 不再是末位），须改锚 '4-10' 或键列表末位语义 |
| B2 | REG-END-01.js | 10, 18 | `setUnlocked(1)`；`unlockedLevel>=2`（通关 L1 解锁 L2） | **断言过时** | 通关 '1-1' 解锁 '1-2'：断言改键名比较（形态随 v2 解锁数据格式定） |
| B3 | SMOKE-005.js | 18 | `unlockedLevel>=2` | **断言过时** | 同 B2 |
| B4 | REG-GATE-01.js | 2-3, 26/47/68/84/98 | 注释口径 `levelNo∈{1,2}`；`setLevel(1/2/5)`×5 处 | **断言过时** | 测试意图不变（L1/L2 有门、L5 旁路），纯参数替换：`setLevel('1-1')/('1-2')/('4-1')`；注释口径同步改 |
| B5 | REG-SLOPE-01.js | 23-24, 40 | `for n of [1,2,3,4] setLevel(n)`（非屋顶遍历）；`setLevel(5)` | **逻辑回归+断言过时** | 遍历集合是"非屋顶关"语义，新键集合≠'1-1'..'1-4'（L3→'1-6'、L4→'2-1'），需按新表 roof 标志重定遍历键集合；L5→'4-1' |
| B6 | REG-SLOT-03.js | 21-25/35-36/41/48-51 | `seq=[[1,'double'],[2,'cabbage'],[3,'lilypad'],[4,'planter'],[5,'melon']]` 参数化通关发卡；"五关全通卡池 9 张" | **断言过时+逻辑回归** | 发卡锚点关改键名（'1-1'/'1-2'/'1-6'/'2-1'/'4-1'）；"五关全通→9张"前提失效——40 关下卡池推导规则由 T-102 定，建议升级为 materializeLevels 表驱动契约 |
| B7 | SMOKE-011.js | 10/18/26/29/32/35/56 | `setLevel(2)`；`probe().levelNo===2`；`unlockedLevel>=1/2`；`__LEVELS[2]`/`__LEVELS[1]` 波次表契约 | **断言过时+逻辑回归** | L2→'1-2'；数字下标读法改 `__LEVELS['1-2']` |
| B8 | SMOKE-024.js | 15/29/37/39/45/48/51/73/118 | 解锁链 L1→L2→L3；`setLevel(2/3)`；`probe().levelNo===3`；`__LEVELS[3].startSun===100`；`__LEVELS[2].dusk===true` | **断言过时+逻辑回归** | L2→'1-2'、L3→'1-6'；下标改键名 |
| B9 | SMOKE-025.js | 34/42/44/50/52/58/61-63/66/89/92/172/195/203 | 解锁链 L1→L4 四段；`setLevel(1/2/3/4)`×6；`__LEVELS[1/2/3]` 波数(5/6/7)契约；`__LEVELS[4]` startSun=150 | **断言过时+逻辑回归** | L4→'2-1'；⚠️ 波数契约只对 5 个迁移锚点关成立，建议升级为 40 键 materializeLevels 契约（见④-5） |
| B10 | SMOKE-026.js | 27, 38 | `setLevel(4)` / `setLevel(1)` | **断言过时** | → '2-1' / '1-1' |
| B11 | SMOKE-027.js | 15/41/42/48/50-55/73/76/127-129/155/177/185/198/207/226/237/246 | 解锁链 L4→L5；`setUnlocked(4)`；`setLevel(4/5)`×10；`probe().levelNo===5`；`__LEVELS[5].startSun=200`；`__LEVELS[4]` 8波/water | **断言过时+逻辑回归** | 键位引用最密单文件（17 处）：L4→'2-1'、L5→'4-1'、`setUnlocked('2-1')`、下标改键名 |
| B12 | SMOKE-028.js | 42(注释)/53/66 | `setLevel(5)` 屋顶路径 + roof gate 注释 | **断言过时** | → '4-1'；liftX 断言本体走 `level.roof` 属性，键位无关 |
| B13 | REG-ROOF-01.js | 17, 68 | `setLevel(5)`；`setLevel(2)`（旧关隔离段） | **断言过时** | → '4-1' / '1-2' |
| B14 | REG-PLANT-05.js | 84 | `setLevel(5)`（注释：LEVELS 键 5，roof:true） | **断言过时** | → '4-1' |
| B15 | REG-PLANT-06.js | 35, 68, 84 | `rejectCase(level,…)` 参数化 `setLevel(level)`（调用处传 1 与 5） | **断言过时** | 调用处改 '1-1' / '4-1'；canPlant 规则本体走 level 属性，键位无关 |
| B16 | REG-PLANT-07.js | 35/57/75/96 | `setLevel(1)`×4 | **断言过时** | → '1-1' |
| B17 | REG-THROW-01.js | 55, 94(注释)/96 | `setLevel(5)`；回位 `setLevel(1)` | **断言过时** | → '4-1' / '1-1' |
| B18 | REG-GRIDLOCK-01.js | 42 | `setLevel(1)` | **断言过时** | → '1-1' |
| B19 | REG-POINT-04.js | 21, 56 | `setLevel(1)`×2 | **断言过时** | → '1-1' |
| B20 | REG-POINT-05.js | 21 | `setLevel(1)` | **断言过时** | → '1-1' |
| B21 | REG-TESTMODE-01.js | 40/52/113/115/123/142/146-159 | `setLevel(opts.level\|\|1)`；存档注入 `pvz_unlocked:'4'`；`pvz_diff_clears:{"hard:3":true}`；`clearRun(gc,{level:3,diff:'hard'})`；`hard:3` 断言×4 | **断言过时+存档键语义变化** | 缺省改 '1-1'；`level:3`→`level:'1-6'`；`hard:3` 复合键 v2 格式未定（建议 `hard:'1-6'` 或 `hard:1-6`），须定旧档迁移规则并补兼容用例（见④-7） |
| B22 | REG-META-01.js | 4/33-35/52/60 | `pvz_unlocked:'3'`/`'5'` 注入；`unlocked=3→6张卡池` 推导断言；注释"L5 通关永不写"缺口 | **断言过时** | 注入值与推导断言随 v2 `pvz_unlocked` 格式定稿同步改 |
| B23 | REG-WAVE/STATE/CARD/TRAP-01..06/PLANT-01..04/ZOM/MINE/SUN/BGM/CHILL×2/FREEZE/CLEAR/HUD/POINT-01/02/06/SLOT-01/02/04/META-02/PULT-01/02、SMOKE-001~004/006-010/012/013/015-023/029 | — | 全模式零命中 | 无影响 | 未引用键位体系（SMOKE-023 的"菜单点击"是 SFX 打桩断言，不涉及关卡键；REG-PLANT-06:18 注释中 setLevel 仅述机制） |

### C. playtests 独立脚本（不进门控）

| # | 文件 | 行号 | 片段摘要 | 分类 | 处置建议 |
|---|---|---|---|---|---|
| C1 | playtests/lib/prelude.js | 84-87 | `freshGame(): setLevel(1)→startGame→forceWaves(5)→clearField` | **逻辑回归** | `setLevel('1-1')`；**v15-v19 全部 acceptance 的公共底座，最先改**；改后复跑 prelude-selftest.js |
| C2 | v15-acceptance.js | 55, 150/202/254/294/320/364/395, 390-443 | `?test=1&level=1` 导航；`LEVELS[1]`×6+`LEVELS[lv]` 参数化；`levelNo=lv` **闭包直改**；`runClear(diff,lv)` 传 3/4/5；`hard:3`/`hard:4`/`expert:5` 复合键×9 | **断言过时+逻辑回归** | URL 走数字 shim 保留；`LEVELS['1-1']`；闭包直改 `levelNo` 在变量消失后失效→改 `levelKey`；复合键随 v2 格式 |
| C3 | v16-acceptance.js | 62, 101/141/159/405/464/493/528/538, 188/232/276/299/342, 355/377 | `?test=1&level=1`；`LEVELS[1]`×10；`LEVELS[5]+levelNo=5`×5；`LEVELS[1]+levelNo=1`×2 | **断言过时+逻辑回归** | 24 处内联 evalPage 同构替换：`LEVELS['4-1']`、`levelKey='4-1'`；量大但同构可 batch |
| C4 | v17-acceptance.js | 67, 130/156/197/234/243/275/333 | `?test=1&level=1`；`LEVELS[1]+levelNo=1`×7（全 L1 场景） | **断言过时+逻辑回归** | 全部同构替换 |
| C5 | v18-acceptance.js | 108, 158/189/207/226/273/330/338 | `?test=1&level=1`；`LEVELS[1]+levelNo=1`×7 | **断言过时+逻辑回归** | 同 C4 |
| C6 | v16-butter-balance.js | 27(注释)/94 | `setLevel(1)` | **断言过时** | → '1-1' |
| C7 | v19-r10-natural-stacking.js | 54/98/256/301, 393 | `LEVEL_NO=3` 常量；`setLevel(LEVEL_NO)`；`__LEVELS[LEVEL_NO]`；`setLevel(1)` | **断言过时** | `LEVEL_NO='1-6'`；⚠️ 选 L3 理由（7波/无水无屋顶）在新 '1-6' 关上须等 T-102 落表后重核 |
| C8 | v19-r11-effective-dps.js | 49/74/230 | `LEVEL_NO=3`；`setLevel(LEVEL_NO)`；`levelNo:LEVEL_NO` 输出元数据 | **断言过时** | 同 C7 |
| C9 | ui-end-verify.js | 51-52/55/109-110/141/169 | `unlockedLevel=5`；`levelNo=4; level=LEVELS[4]` 闭包直改；`LEVELS[levelNo+1]` **算术寻址** | **断言过时+逻辑回归** | 算术寻址在字符串键下 NaN 寻址**真红**→改 LEVEL_INDEX 取下一键；`LEVELS['2-1']` |
| C10 | o3-final-verify.js | 23 | `navigate ?level=4` | 断言过时(URL 字面量) | 数字 shim 下仍有效；建议同步补双格式 `?level=2-1` 用法 |
| C11 | v13-tune-verify.js / v13-07-verify.js | 24 / 23 | `?level=1` 导航 | 断言过时(URL 字面量) | shim 下无需强制改 |
| C12 | pot-occlusion-verify.js / roof-seam-verify.js / v16-throw-arc-visual.js | 28 / 29 / 58 | `?level=5` 屋顶视觉验证 | 断言过时(URL 字面量) | shim 保留则语义成立（5→'4-1' 屋顶）；可选改双格式 |
| C13 | v18-splash-distribution / v18-r9b-calibration / v18-prelude-overflow-fix / prelude-selftest | — | 零直接命中 | 无影响(被动跟随) | prelude 改后复跑确认 |
| C14 | e5n4-evidence-backup/e5n4-runner.mjs | 169/202/228-238 | `LEVELS[3]; levelNo=3`；`?level=3` 导航 | 逻辑回归+历史证据双重身份 | **建议不改**，加头注"v1 体系归档，改造后才能复跑" |
| C15 | 各 *.json / *-stdout*.txt / *.png（results/证据快照） | — | `levelNo:3/4` 等证据值 | 无影响(历史证据) | 不动 |

### D. 根目录 md / perf

| # | 文件 | 行号 | 片段摘要 | 分类 | 处置建议 |
|---|---|---|---|---|---|
| D1 | perf/bench.js | 40/243/253/320/350/383 | `setLevel(3/4/5)` 三场景；`__LEVELS[probe().levelNo].armTime` 数字寻址 | **逻辑回归** | probe 字段改后寻址失效→`__LEVELS[probe().levelKey]`；场景字面量→'1-6'/'2-1'/'4-1' |
| D2 | tests/README.md | 18/40/161-162 | harness 用法契约文档（URLSearchParams 修坑史、pvz_unlocked 说明、API 段落） | **活性文档** | **唯一随施工必须更新的 md**：setLevel/setUnlocked 新签名、probe 字段名、?level 双格式 |
| D3 | regression-plan.md | 174/413/419/428/442/522/536/578/584 | REG 用例规格源头：REG-END-02 边界规格、默认关约定、L5 用例清单、样板代码 | **半活文档（规格源头）** | 只增不改：T-102 后追加 v2 增补章节；历史基线保留原貌 |
| D4 | playtest-plan.md | 16/146 | 手动用例规格：`?level=2` 指南、T8 边界分支 `LEVELS[levelNo+1]` 规格 | **半活文档（规格源头）** | 同 D3，追加 v2 章节 |
| D5 | v12/v13/v15/v16/v17/v18-acceptance.md、v13-m7-m8-report、v13-m4-slope-acceptance、e5n4-post-release-report、qa-signoff-v1.0.0、bug-taxonomy | — | 历史验收/报告记录 | 无影响(历史记录) | 不回改 |
| D6 | playtests/round-1/2/3-execution-pack.md + report/notes | — | 手动 playtest 手册（?level=2/3 指南、T8 迁移说明等） | 无影响(历史手册) | 不回改；**v2.0.0 playtest 执行包须新写**（双格式 URL + 4 世界采样关） |

### E. 活性文档专项核查结论

- tests/ 下**没有**任何被脚本 `fs.readFileSync` 读取的 .md，不存在"活默认值 md"。
- 3 份**规格源头型半活文档**（内容是活断言的规格出处，施工时必须读、只增不改）：`regression-plan.md`、`playtest-plan.md`。
- 1 份**随施工必须更新的活文档**：`tests/README.md`（harness API 契约）。
- `e5n4-evidence-backup/` 整体视为只读归档。

---

## ③ 汇总统计

### 三分类计数（按文件 × 最高处置档计，跨类不重复）

| 分类 | 门控用例(harness/cases) | 基础设施 | playtests | perf/其他 | 合计 |
|---|---|---|---|---|---|
| **断言过时**（改断言/字面量） | 17 文件 | 0 | 6 文件 | 0 | **23 文件** |
| **逻辑回归**（改逻辑/机制） | 7 文件（含与断言过时重叠） | 2 文件（index.js、bench.js） | 5 文件（prelude、v15/v16/v17/v18-acceptance、ui-end-verify） | 0 | **14 文件** |
| **无影响** | ~50 个用例文件零键位命中 | run-smoke/run-all/verify-bus | 证据 json/png/txt + 历史 md | 历史 md 报告 | 大量（不逐条） |

注：门控用例中"断言过时+逻辑回归"双档文件有 7 个（REG-END-02、REG-SLOPE-01、REG-SLOT-03、SMOKE-011、SMOKE-024、SMOKE-025、SMOKE-027），分别计入两行。

### 受影响门控脚本清单

- **进 run-smoke（SMOKE-* 29 项中 7 个受影响）**：SMOKE-005、SMOKE-011、SMOKE-024、SMOKE-025、SMOKE-026、SMOKE-027、SMOKE-028
- **进 run-all REG 门（REG-* 58 项中 15 个受影响）**：REG-END-01、REG-END-02、REG-GATE-01、REG-SLOPE-01、REG-SLOT-03、REG-PLANT-05、REG-PLANT-06、REG-PLANT-07、REG-THROW-01、REG-GRIDLOCK-01、REG-POINT-04、REG-POINT-05、REG-ROOF-01、REG-TESTMODE-01、REG-META-01
- **独立 playtests（不进门控）**：prelude.js（底座，优先改）+ v15/v16/v17/v18-acceptance、ui-end-verify、o3-final-verify、v13-tune/v13-07-verify、pot-occlusion、roof-seam、v16-throw-arc-visual、v19-r10、v19-r11、v16-butter-balance ≈ 14 个脚本

### T-102 / T-104 改动面预估

**T-104（运行期键位切换，机制层，先行施工）**：

| 目标 | 文件:位置 | 动作 |
|---|---|---|
| setLevel/setUnlocked 签名 | harness/index.js L200-205 | 字符串键守卫；去 `n\|0` 强转（+可选数字 shim：1..5→迁锚点键） |
| probe 字段 | harness/index.js L124 | `levelNo`→`levelKey`（建议双暴露过渡） |
| `__LEVELS` 桥 | harness/index.js L88 | 桥 materializeLevels 展开表 |
| bench 寻址 | perf/bench.js L253 | `__LEVELS[probe().levelNo].armTime`→levelKey 寻址 |
| 存档键格式对齐 | REG-TESTMODE-01、REG-META-01、v15-acceptance | `pvz_unlocked`/`pvz_diff_clears` v2 格式 + 旧档兼容用例 |
| 活文档 | tests/README.md | API 签名/probe 字段/?level 双格式说明 |

**T-102（LEVELS 换键，断言层，依赖 T-104 机制或同 PR 串行）**：
- 门控断言迁移：**22 个门控文件**（7 SMOKE + 15 REG，B 组详单）
- playtest 迁移：prelude 底座 + 14 个独立脚本
- 契约重写点（非纯替换，6 处）：REG-END-02（末位关语义）、SMOKE-025（40 键契约升级机会）、REG-SLOT-03（发卡序列表驱动）、REG-SLOPE-01（非屋顶键集合）、ui-end-verify（算术寻址）、REG-GATE-01（口径注释）

**总量预估**：门控 22 + 基础设施 2 + playtest ~15 + 活文档 1 ≈ **40 个文件、约 180±30 处编辑点**；其中约 60 处是"闭包直改 levelNo / 数字下标读表 / 算术寻址"式逻辑改点（真红风险），其余为字面量替换（假红/假绿风险）。

---

## ④ 对 T-102/T-104 的结论建议

1. **harness/index.js 是单点收口，先建兼容层**：setLevel/setUnlocked/probe 三处机制改点集中在 index.js L88/L124/L200-205。建议 T-104 提供过渡兼容：`setLevel` 接受字符串键（新）+ 数字 1..5 shim（映射迁锚点键）；probe 双暴露 `levelKey`（主）+ `levelNo`（派生序号）。兼容层先行，22 个门控文件断言迁移即可分批推进、不必一次全绿。
2. **两类失效模式要区分处置**：
   - 字面量类（假红/假绿）：`__LEVELS[n]` 数字下标在字符串键表下读到 undefined → 数据契约用例（SMOKE-011/024/025/027 波次表）**真红**（TypeError）或断言假绿；`?level=N` URL 有数字 shim 则安全。
   - 逻辑类（真红/失效）：`setUnlocked(n|0)` 字符串强转恒 0 → 解锁恒回 1（真红）；`LEVELS[levelNo+1]` 算术寻址 NaN（真红）；闭包直改 `levelNo` 变量消失（脚本崩）。**逻辑类优先处置**。
3. **REG-END-02 是全库唯一"前提崩塌"级风险**：旧 L5 = 最后一关；新体系 L5 迁锚 '4-1' 后**不是末位关**（后面还有 '4-2'..'4-10'）。直接字面量替换会让"通关最后一关无下一关"的用例前提崩塌。处置：改锚新体系真正末位 '4-10'（或 LEVEL_INDEX 末位键语义）。⚠️ '4-10' 是 v2 新内容关，**波次表数据依赖 T-102 落表时序，需主理人裁决供表方与时点**。
4. **解锁链断言（B2/B3/B7/B8/B9/B11）须等 v2 解锁数据格式定稿**：`unlockedLevel>=N` 数值比较在键名体系下无意义。建议 T-104 定稿 unlockedLevel→"键集合或最高解锁键"的形态后再写断言；数字 shim 期间可维持旧断言。
5. **SMOKE-025 是契约升级机会**：现有 L1=5 波/L2=6 波/L3=7 波/L4=8 波契约只对 5 个迁移锚点关成立。建议 T-102 时升级为全 40 键 materializeLevels 契约（键唯一、恰 40 键、世界号∈1..4、关序号∈1..10、波数≥1），5 锚点关历史波数契约保留在锚点键上。
6. **prelude.js 最先改**：它是 v15-v19 全部 acceptance 的公共底座（freshGame 单点），改后必须复跑 prelude-selftest.js。
7. **存档复合键 `pvz_diff_clears` 的 `hard:3` 内嵌关卡号**：v2 须定新格式（建议 `hard:1-6`）+ 旧档迁移规则（`hard:3`→`hard:1-6`），并补读旧档兼容用例（REG-TESTMODE-01 §2c、v15 D 组）。`pvz_unlocked` 同理。
8. **施工顺序建议**：T-104 harness 兼容层（index.js+README）→ T-102 LEVELS 表+锚点迁移（门控断言分批全绿）→ playtest 底座+脚本（prelude → acceptance 系）→ 存档兼容用例 → v2 验收手册新写（round-*-v2 执行包，URL 双格式 + 4 世界采样）。
9. **量大但同构**：v16/v17/v18-acceptance 三脚本合计 ~30 处 `LEVELS[1]+levelNo=1` 同构字面量可 batch 替换；REG 组 15 文件上下文各异，逐文件改完即跑单用例冒烟，勿攒大批。

---

*本文档为 T-101 唯一写操作产物；未修改/删除任何现有文件，未运行门控与 git 命令。*
