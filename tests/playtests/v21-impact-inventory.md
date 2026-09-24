# v2.1 占位契约影响盘点（T-101 · 纯只读）

> **任务**：v2.1-plan S-1~S-4（1-7~1-10/2-2~2-10 真实波次 + CARD_AWARD 值域扩展金币化）对源码与测试资产的冲击面盘点。
> **方法**：grep 全量消费点（PLACEHOLDER/占位/1-7~1-10/WAVE_TEMPLATES/快照）+ 逐文件读源核验。
> **盘点时间**：2026-09-24 21:3x（家庭机）。首任务铁律=纯只读，零改动。

---

## 一、源码消费点（7 处）

| # | 位置 | 现状 | v2.1 冲击 | 定性 |
|---|---|---|---|---|
| 1 | L1271 onClickSelect 占位拦截 | `placeholder→toast+deny` | 金币关自动非占位 → 拦截让位 | **自动让位** |
| 2 | L1318 onClickEnd 占位拦截 | 同上（下一关） | 同上 | **自动让位** |
| 3 | L3443-3444 drawSelect 灰格 | `placeholder→#4a4a42+敬请期待` | 金币关走可玩/锁定/通关态 | **自动让位** |
| 4 | L2083-2089 通关发卡 | `aw!=='PLACEHOLDER'→发卡` | 值域加 number → 须类型分叉 | **须改（T-104 核心）** |
| 5 | L436-442 poolFromProgress | `aw&&aw!=='PLACEHOLDER'&&!pool.includes(aw)→push` | ★**暗雷**：数字 100 truthy、≠'PLACEHOLDER'、not in pool → **数字被 push 进卡池**（ownedCards 混入 100） | **须改（T-104 必修）**：加 `typeof aw==='string'` 守卫 |
| 6 | L2094-2105 DIFF_AWARD 难度奖 | 表键 'hard:w-l' 独立表 | 本期不动 | 无影响 |
| 7 | L456-463 computeClearReward + L475-492 settleRun | worldClear 300（通关前 9 键判定） | 见 §三 实现优化 | **通道复用（见三）** |

## 二、测试资产逐条清单

### A. 须迁移（断言绑「1-x=占位」现状，T-104/落表后必红）

| # | 文件 | 断言 | 迁移方案 |
|---|---|---|---|
| A1 | v20-test-unlock.js U5/U5b/U5c | 点占位 1-7 → toast 拦截 | 改钉 3-1（世界 3 恒占位）；B 段旧源判别打印同步（用例 5 语义仍绿） |
| A2 | v20-menu-nav.js N4/N4b | 点占位 1-7 → toast | 改 3-1；★先切页签 3 点格再切回页签 1（T-206 selTab 污染教训） |
| A3 | v20-select-draw.js ③/③b | 格 1-7 灰调像素 `#4a4a42` | 改 3-x 格像素断言（setup 的 saveCleared/unlocked 构造同步） |
| A4 | v20-end-nav.js E3 系 | 1-6 通关 → 下一关 **1-7 占位拦截** | ★T-104 后点下一关会**直接开 1-7 真局**（unlocked 已到 1-7+波次已落）→ 断言必红。改钉 4-1 锚点链：通关 4-1（URL 直跳）→ 下一关 4-2 占位拦截（E3 语义完整保留：占位拦截先于解锁检查） |
| A5 | v20-reward-ui.js S3 | `?level=1-7` PLACEHOLDER 短路（aw7==='PLACEHOLDER'） | 改 `?level=3-1`；断言 aw7→aw31 同语义 |
| A6 | v20-reward-award.js a3/a4 | PLACEHOLDER 计数=32、抽查 1-7/4-10 | 计数改 **18**（32−14）；抽查改 3-1/4-10 |
| A7 | v20-reward-award.js §B b4-b6 | 1-7 通关无卡不发 | 改 3-1 通关无卡（PLACEHOLDER 短路语义保留） |
| A8 | REG-SLOT-03（harness REG） | L52-57 '1-7' 占位通关无卡 | 改 '3-1'；L62 卡池 10 张断言不受金币影响（见 §三 规约） |
| A9 | v20-reward-award.js §D d3 | 铺 1-1..1-9 通关（现=占位模板局） | 落表后变真局（波数多耗时长）；断言只看 saveCleared/endStats.clear → 若金币**不混入 endStats.clear** 则仍绿；驱动耗时上升属可接受（见 §三 规约①） |

### B. 自动让位/无影响（落表+金币化后仍绿，无需动）

| # | 文件 | 依据 |
|---|---|---|
| B1 | SMOKE-023 B8 | 只点锁定 1-4（deny）与可玩 1-1（uiClick），无占位断言 |
| B2 | v20-level-registry.js 全部 | §B 锚点断言只锁 5 锚（不动）；b9 泳池三段 time 推导——锚点显式写 time 同值仍绿；b11-b13 占位抽查键=1-3/1-2/4-2（1-3 本期仍推导、4-2 恒占位）；§C 旧源逐字全等只对 5 锚；§D 确定性快照=纯函数不变 |
| B3 | v20-fullchain-11.js | 链路止于 1-1 通关发卡落档，无 1-7 环节 |
| B4 | v20-fog-ui.js | ?level=2-6 直跳断言 time:'fog'——锚点显式 time:'fog' 同值绿（头注释「世界 2 全占位」表述陈旧，顺手更新） |
| B5 | v20-save-migration.js / v20-harness-compat.js / v20-state-select.js / v20-menu-verify.js / v20-daynight-ui.js / v20-decor-ui.js / v20-end-nav-ui.js / v20-levelkey-switch.js | 无占位值断言（levelkey-switch L171 教训注释引 4-2 恒占位仍成立） |
| B6 | REG-CLEAR-01 / REG-SLOT-01 等 harness REG | worldClear 纯函数直写 saveCleared 构造，与占位/金币无耦合（金币不混入 endStats.clear 前提下） |
| B7 | SMOKE-021 | VERSION 形如 v+数字，版本无关（v2.1.0 定版刀另走 T-302 通扫） |

## 三、T-104 实现规约（盘点产出，两处修正+一处优化）

1. **★金币别混入 `endStats.clear`**（规约）：`clear` 字段语义=worldClear 专用（REG-CLEAR-01/v20-reward-award §D 断言口径）。金币走独立变量（如 endStats.coin 或并入 clear 需全量迁移断言——**不取**，独立字段零迁移）。
2. **★poolFromProgress 必须加 `typeof aw==='string'`**（§一 #5 暗雷）——否则旧档迁移/重载时卡池混入数字 100。
3. **实现优化（通道复用，替代原「toast+points 直发」草案）**：金币发放并入 settleRun 时序——`computeClearReward` 同款「通关前快照」判首通（saveCleared 入集**之前**调用，首通判定天然干净，无需新存档字段/已领标记）；与 worldClear 一同进 `settlePointsRaw` 乘 DIFFS.mult（难度激励统一口径）；结算屏既有「通关奖励」行（L3573）自动显示。**优于 Q-2 拍板的纯 toast 方案**：判重/显示/乘算/落盘全复用既有管道，新增代码量最小。与 Q-2 精神不冲突（结算屏行是既有能力非新增 UI）——采纳此通道，向用户报备。
4. **判重口径**：`saveCleared.includes(levelKey)` 于入集前快照（settleRun 内 computeClearReward 同时点）——首通发、重通零发，幂等语义与发卡/worldClear 完全对齐。
5. **REG-SLOT-03/REG-SLOT-01 的卡池 10 张断言**：金币关通关不改 ownedCards（typeof 守卫后）→ 仍绿，仅注释语义迁移。

## 四、安全序重申（Q-12 前车之鉴）

**先 waves（T-102/103）后金币化（T-104）**：T-102/103 落 _ANCHORS 但 CARD_AWARD 仍 PLACEHOLDER → 占位闸仍拦（选关点不进、URL 直跳可玩真波次）；T-104 才放行。反序=选关页放出无真实波次关（若先金币化后落表，金币关无 _ANCHORS 条目 → metaFor 模板局被放出）。

## 五、行数预算复核

14 锚点条目 × ~13 行（含 waves 注释）≈ +190 行；T-104 分叉+守卫 ≈ +15 行；合计 3618 → ~3820 行，单文件红线无虞（plan §6 预估一致）。
