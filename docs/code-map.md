# 代码地图 · PvZ Lite

> **本文件由脚本生成，请勿手改**：`node tools/gen-code-map.mjs`
> 源文件：`plants-vs-zombies.html`（5405 行 · 117 个顶层函数 · 118 个顶层常量 · 26 个分区）
> 行号为 HTML 文件内**绝对行号**，可直接喂给 `Read(offset, limit)` 或作为 `Grep` 结果的交叉验证。

## 使用规则（省 token 的硬约定）

1. **先查表，再 Grep**：知道要改哪个功能 → 在本表定位区块 → 只读该区块，禁止 `Read` 全文。
2. **改动只带上下文**：用精确 `Edit`（带唯一前后文），不要为了"看清结构"读整段。
3. **改完重跑本脚本**：`node tools/gen-code-map.mjs`，行号即刷新（行号会因插入而漂移）。
4. **委托成员施工时给出区块范围**：把"改 X，位于 L≈a-b"写进任务描述，避免成员自行全文搜索。
5. 结构性改动（拆分/合并/大搬家）前，先读本表判定影响面。

## 一、分区总览

| 区块 | 行号区间 | 行数 | 顶层成员数 |
|---|---|---|---|
| 基础配置 | L35–L71 | 37 | 17 |
| v2.3 夜行蘑菇（nocturnal · GDD v23 §2/§3） | L72–L232 | 161 | 36 |
| v1.4 配置表（T-01 · v1.4-impl-plan §1） | L233–L309 | 77 | 7 |
| v2.0 关卡数据层（T-102 · production/v2.0-plan.md §3.1-3.3） | L310–L935 | 626 | 20 |
| v1.4 元进度存档（T-02 · 积分/卡槽/卡池/卡组/通关计数） | L936–L1018 | 83 | 6 |
| v1.4 结算（T-07 难度乘算 / T-08 通关奖励） | L1019–L1039 | 21 | 2 |
| v1.4 结算入口（T-06 · 胜利 sweep / 失败部分结算） | L1040–L1164 | 125 | 21 |
| 音效（WebAudio 实时合成，无外部文件） | L1165–L1373 | 209 | 18 |
| 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） | L1374–L1495 | 122 | 5 |
| 主循环 | L1496–L1547 | 52 | 5 |
| 输入 | L1548–L1598 | 51 | 4 |
| 种植校验规则表（P1-A · code-review-todo 2026-09-20） | L1599–L1785 | 187 | 5 |
| v2.2.6 存档导出/导入（背景：预览源随端口漂移 → localStorage 按 origin 隔离 → 进度"被清"） | L1786–L1834 | 49 | 2 |
| v1.4 卡槽解锁（T-11 · 验收变更 2026-09-21：面板/商城入口下线，buySlot 逻辑保留备解冻） | L1835–L2107 | 273 | 13 |
| 游戏控制 | L2108–L2135 | 28 | 1 |
| 波次 | L2136–L2272 | 137 | 12 |
| 更新 | L2273–L2347 | 75 | 1 |
| v1.6 第4刀：投掷类公用抛物解算器（D1） | L2348–L2811 | 464 | 10 |
| = | L2812–L2817 | 6 | 0 |
| = | L2818–L2843 | 26 | 1 |
| = | L2844–L2847 | 4 | 0 |
| = | L2848–L3079 | 232 | 4 |
| v1.4 积分掉落物（T-04 · 独立数组，绕开 effects 500 守卫） | L3080–L3294 | 215 | 9 |
| 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） | L3295–L3324 | 30 | 6 |
| 渲染 | L3325–L4744 | 1420 | 19 |
| D-11 圆角化（蓝图 §6） | L4745–L5402 | 658 | 11 |

## 二、逐区明细

### 基础配置 · L35–L71

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `canvas` | L36–L36 | — |
| 常量 | `COLS` | L37–L37 | — |
| 常量 | `WATER_ROWS` | L38–L38 | — |
| 常量 | `CARD_H` | L39–L39 | — |
| 常量 | `SHOVEL_X` | L40–L40 | — |
| 常量 | `CARD_X0` | L41–L41 | — |
| 常量 | `CABBAGE_VX` | L42–L43 | — |
| 常量 | `ROOF_SLOPE` | L44–L45 | v1.3-M3 屋顶倾斜度：斜砖缝全局剪切斜率（正=砖缝"右倾"/上端点偏右；符号翻转即镜像左倾）·仅视觉 · Playtest 可调 |
| 常量 | `ROOF_COLS` | L46–L46 | v1.3-M4 屋顶连续斜坡（C2）：仅 level.roof 生效；左 5 列抬升（col0..4）、右 4 列为水平平台 |
| 常量 | `ROOF_LIFT_H` | L47–L49 | — |
| 常量 | `END_BTN` | L50–L52 | 结算屏按钮几何（v1.9.0 UI 修复）：drawEnd 绘制与 onClickEnd 命中共用，封死两处硬编码漂移。 原两处各自写死 380… |
| 常量 | `MENU_BTN` | L53–L55 | v2.0 M2 主菜单/选关页共享几何（T-201，沿 END_BTN 惯例）：绘制（draw）与命中（onClick）只准共用此处常量，禁两处… |
| 常量 | `MENU_SAVE_BTNS` | L56–L56 | v2.2.6 存档导出/导入钮：预览源（127.0.0.1 随机端口）每次变化致 localStorage 隔离、进度"被清"—— 导出=全部 … |
| 常量 | `SELECT_GEOM` | L57–L64 | — |
| 常量 | `VERSION` | L65–L66 | 版本号（KNOWN-ISSUES #6）：源码内嵌版本标识，便于仅凭文件本身判定版本 |
| 常量 | `ONE_SHOT_ARM_TIME` | L67–L69 | v2.2.7 消缺：航椒/樱桃一次性炸弹的膨胀武装时长（秒）。种植后先膨胀（arming），膨胀动画完成即立即引爆。 |
| 常量 | `SUNFLOWER_FIRST` | L70–L75 | v2.2.8 消缺：向日葵产阳光间隔（秒）。原版 PvZ 首产 7s、之后每 24s；本作日夜有别—— 白天 20s（保持既有手感基线），夜晚 … |

### v2.3 夜行蘑菇（nocturnal · GDD v23 §2/§3） · L72–L232

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `NOCTURNAL_TYPES` | L76–L76 | 夜行机制（§2.1）：蘑菇类植物白天（level.time==='day'）**沉睡**（不产出/不攻击/不触发）， 夜晚（'night'）与浓… |
| 函数 | `isNocturnal` | L77–L80 | — |
| 常量 | `SUNSHROOM_FIRST` | L81–L82 | 阳光菇（sunshroom）参数（§3.1）：cost 25 / 种植 cd 7.5s / dur 300； 夜晚首产 6s、之后每 24s（与… |
| 常量 | `SUNSHROOM_GEOM` | L83–L86 | 阳光菇绘制几何（世界版 drawPlantInner + 卡面版 drawCardFace 共用，禁止两处硬编码）：幼体/成体菇盖半径 |
| 常量 | `PUFFSHROOM_DMG` | L87–L88 | 小喷菇（puffshroom）参数（§3.2）：cost 0 / 种植 cd 7.5s / dur 300；单发 20 / 间隔 1.4s / … |
| 常量 | `PUFFSHROOM_GEOM` | L89–L94 | 小喷菇绘制几何（世界版 drawPlantInner + 卡面版 drawCardFace 共用，禁止两处硬编码）：菇盖半径 |
| 常量 | `FUMESHROOM_DMG` | L95–L97 | 弹体**穿透**（type:'fume'，pierce:true）：命中后不消失，对本行射程内每个僵尸各结算一次 20； 去重状态挂弹体侧（pr… |
| 常量 | `FUMESHROOM_GEOM` | L98–L100 | 大喷菇绘制几何（世界版 drawPlantInner + 卡面版 drawCardFace 共用，禁两处硬编码）： capR=菇盖半径（成体尺感… |
| 常量 | `NOCTURNAL_BADGE` | L101–L110 | 卡面「☾ 夜行」角标几何 + 配色（v2.3.0 U10：drawNocturnalBadge 单点收拢，选卡页与对局内卡栏共用； 沿 END_… |
| 常量 | `HYPNOSHROOM_IMMUNE` | L111–L111 | ★ 魅惑状态机（§4）：被魅惑僵尸向右行走、不再啃植物，改与敌方僵尸互啃；可被敌方反杀。 互啃伤害速率：取「僵尸啃植物 65/s」**同口径**… |
| 常量 | `HYPNOSHROOM_BITE_DPS` | L112–L112 | — |
| 常量 | `HYPNOSHROOM_ENGAGE` | L113–L114 | — |
| 常量 | `HYPNOSHROOM_GEOM` | L115–L120 | 魅惑菇绘制几何（世界版 drawPlantInner + 卡面版 drawCardFace 共用，禁两处硬编码）：菇盖半径 + 催眠螺旋半径 |
| 常量 | `GRAVE_SPAWN_PCT` | L121–L121 | 墓碑双职责：①占格挡种植（canPlant onGrave 首条拦截）②每波开始按墓碑数量概率「钻出」额外僵尸。 每波每座墓碑独立触发：按波次爬… |
| 常量 | `GRAVE_SPAWN_RAMP` | L122–L122 | — |
| 常量 | `GRAVE_SPAWN_POOL` | L123–L128 | — |
| 常量 | `ZOMBIE_BASE` | L129–L141 | 现提纯为 ZOMBIE_BASE：newWave 内 `const STATS=ZOMBIE_BASE;` 别名保持下游零改动， summonB… |
| 常量 | `GRAVEBUSTER_CHEW` | L142–L142 | 咀嚼全程走 updatePlant 的 dt 累加（禁定时器铁律）。 ★ 咀嚼时长 4.0s **短于**被啃死时间 dur300/65=4.6… |
| 常量 | `GRAVEBUSTER_CHIP` | L143–L143 | — |
| 常量 | `GRAVEBUSTER_CHIP_COLOR` | L144–L146 | — |
| 常量 | `GRAVEBUSTER_FX` | L147–L148 | 「+25」飘字（GDD §2.3 收获反馈；替代 v2.3.2 首轮的「返还 25 阳光」toast——阳光是局内唯一资源， 返还 ⇒ 后续碑免… |
| 常量 | `GRAVEBUSTER_GEOM` | L149–L150 | 绘制几何（世界版 drawPlantInner + 卡面版 drawCardFace 共用，禁两处硬编码；沿 END_BTN / *_GEOM … |
| 常量 | `ELVIS_FIRST_SUMMON` | L151–L151 | ---- v2.3.2 猫王僵尸 elvis / 伴舞 backup（GDD v2.3.2 §3）---- |
| 常量 | `ELVIS_INTERVAL` | L152–L152 | — |
| 常量 | `ELVIS_SUMMON_COUNT` | L153–L153 | — |
| 常量 | `ELVIS_SUMMON_CAP` | L154–L154 | — |
| 常量 | `ELVIS_CAP` | L155–L155 | — |
| 常量 | `BACKUP_EMERGE` | L156–L156 | — |
| 常量 | `BACKUP_CRUMBLE` | L157–L160 | — |
| 常量 | `ELVIS_WAVES` | L161–L167 | 波次注入编排（GDD §3.5）：**不进 GRAVE_SPAWN_POOL**——该池是「每碑独立 30% 判定」， 9 碑×30%≈2.7 … |
| 常量 | `MUSHROOM_SLEEP_GEOM` | L168–L180 | ★ 仅 level.time 为 night/fog 时 asleep=false ⇒ drawPlantInner 走下方 else「原清醒路… |
| 常量 | `MUSHROOM_SLEEP_CAP` | L181–L186 | 各蘑菇沉睡态菇盖主色（明度低于清醒主色，形成稳定色差 → U9 像素判据锚点） |
| 常量 | `MUSHROOM_SLEEP_LINE` | L187–L188 | — |
| 函数 | `drawMushroomZzz` | L189–L202 | v2.3-U8 沉睡姿态通用绘制：半闭眼（横向细线×2）+ 睡眠符号「z z z」（几何笔画，不依赖字体） |
| 函数 | `drawMushroomAsleepFace` | L203–L218 | — |
| 函数 | `drawNocturnalBadge` | L219–L235 | · 入参 = 卡片矩形 (x,y,w,h)；角标锚定卡片右下角内缩 2px；几何走 NOCTURNAL_BADGE（38×13，禁硬编码）。 ·… |

### v1.4 配置表（T-01 · v1.4-impl-plan §1） · L233–L309

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `POINT_CONFIG` | L236–L265 | 硬编码禁令落点：阶位/怪→阶/槽价/发卡序列/通关奖励规则全部数据注册式收拢在此。 未来新增地图或积分获取渠道 → 只往表里加数据，逻辑零改动（… |
| 常量 | `GRAVE_CLEAR_SCORE` | L266–L266 | ★ 单点真相：清碑奖励 / 猫王 / 伴舞三处计分必须引这里，**禁止**在调用点散写字面量 （历史坑：首轮把 elvis 200 / back… |
| 常量 | `ELVIS_SCORE` | L267–L267 | — |
| 常量 | `BACKUP_SCORE` | L268–L268 | — |
| 常量 | `SLOT_CONFIG` | L269–L302 | — |
| 常量 | `DIFFS` | L303–L307 | — |
| 常量 | `DIFF` | L308–L317 | — |

### v2.0 关卡数据层（T-102 · production/v2.0-plan.md §3.1-3.3） · L310–L935

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `WORLD_THEMES` | L318–L330 | 昼夜结构（Q-6a）：草/墓/房=前 5 昼后 5 夜；泳池三段=3-1~3-2 昼、3-3~3-5 夜、3-6~3-10 浓雾夜。 time … |
| 常量 | `_ANCHORS` | L331–L712 | ---- 锚点关字面量（§3.2 层①）：waves/totalWaves/startSun/armTime/lawn 自旧表逐字平移；机制字段… |
| 常量 | `WAVE_TEMPLATES` | L713–L736 | 波数取锚点全长（不截取，保证 40 键波数曲线与锚点难度锚同构）；spawnMult/intervalMult 为 昼夜微调参数位（Q-6：夜 … |
| 函数 | `materializeLevels` | L737–L807 | 对无显式 waves 的键：world/time/name/lawn 按键位+昼夜结构推导，startSun/armTime 取所在世界 锚点默… |
| 常量 | `LEVELS` | L808–L810 | ★ const 引用稳定（harness __LEVELS 桥与大量既有用例依赖 const 语义，不得改 let/函数包裹） |
| 常量 | `GRAVES_MASTER` | L811–L812 | v2.3.2 P-K2：墓碑母表（boot 期深拷贝快照，任何时刻只读）——每局从它克隆， 防止「清碑」（removeGrave → level… |
| 常量 | `LEVEL_INDEX` | L813–L813 | — |
| 函数 | `keyOrd` | L814–L816 | — |
| 函数 | `legacyKey` | L817–L821 | 数字键兼容 shim（§3.5）：n∈1..5 → '1-'+n，否则 null；严格上界 5（旧 ?level=6 被拒语义不许放宽）。 仅限… |
| 常量 | `ANCHOR_BUTTONS` | L822–L822 | 菜单 5 钮锚点布局（T-104b C-1）：固定五关键序，与 harness __ANCHOR 表同源同序（'1-1'/'1-2'/'1-6'… |
| 常量 | `level` | L823–L823 | — |
| 常量 | `levelKey` | L824–L826 | — |
| 常量 | `unlocked` | L827–L830 | 解锁进度持久化（Q-16 键名形态 · T-103）：运行期主变量=unlocked（最高解锁键）；存档走 v2 键（下方 boot 读档块）。… |
| 常量 | `diffProgress` | L831–L831 | v2.3 消缺：per-difficulty 关卡进度（普通/困难/地狱独立 saveCleared + unlocked） 声明须在 boot… |
| 函数 | `saveDiffProgress` | L832–L839 | — |
| 常量 | `testMode` | L840–L847 | 测试模式（2026-09-20 用户需求）：URL 带 ?test=1 开启——阳光锁 9999 无限种植物 + 卡池全开（CARDS 全部 1… |
| 常量 | `saveCleared` | L848–L899 | cleared=已通关键数组（集合语义，重复通关不重复 push）；unlocked=最高解锁键；cardSeen 本期占位空数组（预留无消费）… |
| 函数 | `storageGet` | L900–L902 | 存档读写统一入口（2026-09-16 · KNOWN-ISSUES #9）：隐私模式 / file:// 受限环境下静默降级，绝不抛错中断游戏 |
| 函数 | `storageSet` | L903–L907 | — |
| 常量 | `CARDS` | L908–L942 | 植物卡 |

### v1.4 元进度存档（T-02 · 积分/卡槽/卡池/卡组/通关计数） · L936–L1018

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `points` | L943–L945 | 存量卡池推导仍走旧口径：poolFromProgress 按 unlocked 序位等价展开（T-105 切 cleared 集合 + 新表）。… |
| 常量 | `diffClears` | L946–L946 | v1.5 决议2：per-difficulty 通关记录（'难度:关号' → true）；无历史记录=存量玩家重通领取（patch note 披… |
| 函数 | `loadMeta` | L947–L999 | — |
| 函数 | `poolFromProgress` | L1000–L1012 | （'w-l' 真键直查）。旧数字序位展开退役。 旧档迁移等价性：N=2/3 与旧推导等价；N=5 已知差异——v2.0 序列重排（1-3 mel… |
| 函数 | `defaultDeck` | L1013–L1017 | — |
| 函数 | `inDeck` | L1018–L1025 | — |

### v1.4 结算（T-07 难度乘算 / T-08 通关奖励） · L1019–L1039

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `computeClearReward` | L1026–L1036 | v1.x 期世界 1 无法凑满 10 键（当时 35 占位关不可玩）实际不可触发，纯函数级测试验证（plan §4.2）； v2.3.3 起 4… |
| 函数 | `settlePointsRaw` | L1037–L1047 | 局合计取整口径（T-07）：(击杀收集合计 + 通关奖励) × DIFFS[DIFF].mult → Math.round 一次。 不做 per… |

### v1.4 结算入口（T-06 · 胜利 sweep / 失败部分结算） · L1040–L1164

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `endStats` | L1048–L1048 | 「通关前快照」（saveCleared 入集之前），首通发、重通零发（幂等，无需新存档字段）； 与 worldClear 一并进 settleP… |
| 函数 | `settleRun` | L1049–L1069 | — |
| 函数 | `saveMeta` | L1070–L1093 | — |
| 常量 | `state` | L1094–L1095 | 状态 |
| 常量 | `highScore` | L1096–L1096 | — |
| 常量 | `plants` | L1097–L1099 | — |
| 函数 | `setState` | L1100–L1108 | 状态切换统一入口（带控制台留痕，方便排查“突然退出对局”这类偶现问题） |
| 函数 | `updateBest` | L1109–L1112 | 历史最高分落盘（仅当刷新纪录时写，减少 localStorage 写入，2026-09-16 #9） |
| 常量 | `toastMsg` | L1113–L1114 | 屏幕提示条（临时消息） |
| 常量 | `giftAnim` | L1115–L1115 | v2.2.4 通关奖励植物淡入状态——end 态绘制前触发，奖励植物淡入展示（约 1s 淡入到 alpha 0.85） |
| 函数 | `triggerGiftAnim` | L1116–L1118 | — |
| 函数 | `toast` | L1119–L1119 | — |
| 函数 | `drawToast` | L1120–L1137 | — |
| 常量 | `exitArm` | L1138–L1138 | 对局中返回菜单需要二次确认，避免误触/误按丢掉进度 |
| 函数 | `requestExit` | L1139–L1146 | — |
| 常量 | `R` | L1147–L1147 | 工具 |
| 常量 | `C` | L1148–L1150 | — |
| 函数 | `liftX` | L1151–L1154 | v1.3-M4 C2 屋顶抬升函数：返回该 x 处的抬升量（≥0 = 向上 = 屏幕 y 减小）。 ★ 单点 gate：!level.roof … |
| 函数 | `gridToPos` | L1155–L1158 | — |
| 函数 | `posToGrid` | L1159–L1162 | — |
| 函数 | `inGrid` | L1163–L1165 | — |

### 音效（WebAudio 实时合成，无外部文件） · L1165–L1373

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `audioCtx` | L1166–L1166 | — |
| 常量 | `audioQueue` | L1167–L1167 | — |
| 函数 | `ac` | L1168–L1178 | — |
| 函数 | `scheduleOrDefer` | L1179–L1182 | 排程守卫：上下文未 running（suspended/interrupted）时，直接排程的事件可能被整段丢弃 （用户反馈 2026-09-1… |
| 函数 | `flushAudioQueue` | L1183–L1191 | — |
| 函数 | `primeAudio` | L1192–L1200 | 音频管线预热：上下文刚创建时音频线程尚未就绪，会话首个音效常被整段吞掉 （用户反馈 2026-09-16：开局种植物没声音，之后的音效正常）。 … |
| 函数 | `armAudioUnlock` | L1201–L1222 | 兜底：任意一次用户手势都尝试恢复音频上下文（部分浏览器创建后仍保持 suspended） |
| 常量 | `BGM` | L1223–L1232 | + 低音层（sine 根音），C 大调五声，C-G-Am-F 和声进行。 音量按「经 env 总线 0.5 衰减后仍清晰可闻」标定（初版 0.0… |
| 函数 | `updateBGM` | L1233–L1242 | — |
| 函数 | `bgmTick` | L1243–L1274 | — |
| 常量 | `AudioBus` | L1275–L1281 | ---- 音频总线（ADR-004）：4 分组 GainNode + masterGain → destination ---- 分组默认音量：… |
| 常量 | `AUDIO_ROUTES` | L1282–L1288 | SFX 分组映射（tone/noise 默认走 event；战斗/UI 音效按需显式传分组）。 本表是「规格侧」的权威映射，运行时由各 SFX … |
| 函数 | `initAudioBus` | L1289–L1321 | — |
| 函数 | `tone` | L1322–L1326 | 单音：频率、时长、波形、音量、延迟、滑到目标频率 |
| 函数 | `scheduleTone` | L1327–L1340 | — |
| 函数 | `noise` | L1341–L1345 | 噪声：用于爆炸/挖掘/啃食。按 dur 就近取预生成 buffer 段（0.1/0.3/0.5s） |
| 函数 | `scheduleNoise` | L1346–L1368 | — |
| 函数 | `routeBus` | L1369–L1374 | 取输出总线：group 显式优先（SFX 调用点已标注所属分组）；缺省走 event。 总线未初始化（无头测试 / 降级）时直连 destina… |

### 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） · L1374–L1495

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `Easing` | L1375–L1390 | — |
| 常量 | `sfxGate` | L1391–L1391 | 节流：防止密集事件把音频糊成一团 |
| 函数 | `gate` | L1392–L1396 | — |
| 常量 | `SFX` | L1397–L1474 | — |
| 常量 | `SirenLoop` | L1475–L1496 | 采用「帧驱动」而非 setInterval： · 暂停时 update 不执行 → 警报天然同步暂停（§C.1 的暂停要求零额外代码） · 横幅… |

### 主循环 · L1496–L1547

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastT` | L1497–L1497 | — |
| 常量 | `lastDt` | L1498–L1498 | — |
| 常量 | `frameErr` | L1499–L1499 | — |
| 函数 | `loop` | L1500–L1536 | — |
| 函数 | `drawFrameErr` | L1537–L1548 | — |

### 输入 · L1548–L1598

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastMouseGrid` | L1549–L1562 | — |
| 函数 | `bindBtn` | L1563–L1568 | 按钮统一绑定：点完主动 blur，避免按钮保留焦点后被 Space/Enter 二次触发 |
| 函数 | `togglePause` | L1569–L1582 | 暂停切换统一入口：三处触发（按钮/空格/Esc）收敛到此，切换后同步 BGM 起停 （2026-09-20 用户反馈：暂停后 BGM 还在放——… |
| 函数 | `applyMuteUI` | L1583–L1600 | 静音按钮外观跟随 muted 状态（启动即按存档恢复，2026-09-16 #9） |

### 种植校验规则表（P1-A · code-review-todo 2026-09-20） · L1599–L1785

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `removeGrave` | L1601–L1615 | v2.3.2：清除墓碑的唯一写入点（配合 GRAVES_MASTER 母表，禁止在其它地方直接改 level.graves） |
| 函数 | `canPlant` | L1616–L1642 | ③垫/盆不算占用（垫上/盆上可连种）；同载体重叠（垫上铺垫/盆上放盆）与普通重复种植算占用。 ④水轴是单条强约束「水域关+水行」双条件放行（v1… |
| 函数 | `spawnPlant` | L1643–L1665 | 旧对象兜底（drawPlant L1748 区 plantT===undefined）保留不删——harness 注入的测试对象 仍是旧 sch… |
| 函数 | `onClick` | L1666–L1772 | — |
| 函数 | `onClickMenu` | L1773–L1788 | — |

### v2.2.6 存档导出/导入（背景：预览源随端口漂移 → localStorage 按 origin 隔离 → 进度"被清"） · L1786–L1834

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `exportSave` | L1789–L1808 | 导出：收集全部 pvz_* 键为一份 JSON 文本复制到剪贴板（clipboard 受限时降级 prompt 手选复制）。 导入：粘贴 JSO… |
| 函数 | `importSave` | L1809–L1835 | — |

### v1.4 卡槽解锁（T-11 · 验收变更 2026-09-21：面板/商城入口下线，buySlot 逻辑保留备解冻） · L1835–L2107

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `buySlot` | L1836–L1847 | — |
| 常量 | `DECK_GRID` | L1848–L1848 | 默认卡组 = 向日葵/豌豆/坚果 3 张（用户实测反馈拍板），允许不满开局（≥1 张）。 v2.3.0 U6：上排待选网格改为「按卡数自适应行数… |
| 常量 | `DECK_SLOTS` | L1849–L1849 | — |
| 常量 | `DECK_GRID_CW` | L1850–L1850 | — |
| 常量 | `DECK_GRID_GAP` | L1851–L1851 | — |
| 常量 | `DECK_GRID_SAFE` | L1852–L1856 | — |
| 函数 | `deckGridLayout` | L1857–L1871 | 本函数是上排网格唯一几何源，drawSelectDeck 与 onClickDeck 都只调它 + deckCardRect。 行数 = cei… |
| 函数 | `deckCardRect` | L1872–L1875 | 第 i 张卡在网格中的矩形（draw/hit 同源；禁止任何一处再写死 x0/gw/150/100） |
| 函数 | `drawSelectDeck` | L1876–L1962 | — |
| 函数 | `onClickSelect` | L1963–L2005 | — |
| 函数 | `onClickDeck` | L2006–L2033 | — |
| 函数 | `onClickEnd` | L2034–L2052 | — |
| 函数 | `onKey` | L2053–L2108 | — |

### 游戏控制 · L2108–L2135

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `startGame` | L2109–L2137 | — |

### 波次 · L2136–L2272

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `spawnQueue` | L2138–L2138 | 波次生成：用队列逐个放出，不是一次性全刷 |
| 常量 | `spawnTimer` | L2139–L2139 | — |
| 常量 | `waveInterval` | L2140–L2140 | — |
| 常量 | `waveActive` | L2141–L2141 | — |
| 常量 | `waveDrainedT` | L2142–L2145 | — |
| 常量 | `spawnGateZ` | L2146–L2146 | v1.3-M4 FIX-01 v2（口径修订 2026-09-19 20:52）：教学关（'1-1'/'1-2'；T-104b 前为数字关号 1… |
| 常量 | `spawnGateT` | L2147–L2149 | — |
| 常量 | `warn` | L2150–L2151 | 大波预警：active=横幅显示中，t=剩余秒数，last=已预警过的波次号， pending=倒计时已结束但还在等场上清空（横幅此时已隐藏，只… |
| 函数 | `newWave` | L2152–L2227 | — |
| 常量 | `_nextZombieUid` | L2228–L2229 | 从队列中逐个放出僵尸 v2.3.2：僵尸 uid 发号器（全局单调自增）。新僵尸统一在此取号 ⇒ ownerId 关联唯一且跨波不重号。 |
| 函数 | `countElvis` | L2230–L2234 | v2.3.2：猫王本体计数（ELVIS_CAP 用）：场上未死亡的本体数，伴舞不计数。 |
| 函数 | `processSpawnQueue` | L2235–L2273 | — |

### 更新 · L2273–L2347

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `update` | L2274–L2357 | — |

### v1.6 第4刀：投掷类公用抛物解算器（D1） · L2348–L2811

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `fireArcProjectile` | L2358–L2380 | spec = {dmg, type, splash, splashRatio?, splashGrid?, chill?, butter?}：附… |
| 函数 | `updatePlant` | L2381–L2610 | — |
| 函数 | `explodeMine` | L2611–L2642 | ★ v2.1.1 消缺：原 `z.hp-=DMG(500); if(z.hp<=0)kill` 做耐久结算，导致铁桶(560)与高难度 （har… |
| 函数 | `explodePepper` | L2643–L2667 | v2.2 航椒爆炸：同排全清秒杀（无差别，不限数量/列） |
| 函数 | `explodeCherry` | L2668–L2694 | v2.2 樱桃爆炸：3×3 格跨行秒杀（本作首个跨行秒杀） |
| 函数 | `hasZombieAhead` | L2695–L2705 | — |
| 函数 | `hasZombieInRange` | L2706–L2714 | v2.3 小喷菇射程判定（§3.2）：本行僵尸进入 cells 格内（含边界）才返回真。 口径基准 = 植物格心 pos.x（同 hasZomb… |
| 函数 | `updateProjectiles` | L2715–L2798 | — |
| 函数 | `applyChill` | L2799–L2806 | v1.5 S4 chill 施加单点入口：slowT 刷新续时（40%·2.0s 铁律锁定在调用侧系数与这里 2.0）。 不叠加语义：已减速只把… |
| 函数 | `applyFreeze` | L2807–L2818 | v1.7 corn 黄油定身单点入口：freezeT 置满 3.0s（v1.6 引入；完全定身，移动+啃食双停）。 与 chill（slowT·… |

### = · L2812–L2817

_（无顶层声明，纯逻辑/样式区）_

### = · L2818–L2843

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `summonBackup` | L2819–L2848 | — |

### = · L2844–L2847

_（无顶层声明，纯逻辑/样式区）_

### = · L2848–L3079

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `scatterBackups` | L2849–L2858 | — |
| 函数 | `updateZombies` | L2859–L3023 | — |
| 函数 | `spawnCorpseParts` | L3024–L3058 | F-02 死亡零件（蓝图 §3）：死亡 = 血雾（保留）+ 零件爆散，§G 粒子上限双保险 |
| 函数 | `killZombie` | L3059–L3085 | — |

### v1.4 积分掉落物（T-04 · 独立数组，绕开 effects 500 守卫） · L3080–L3294

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `pointDrops` | L3086–L3086 | 2026-09-21 验收增强：死亡爆币特效（装饰层）——真币（pointDrops）数据契约不动， 视觉上「爆出一堆钱币 + 光」：真币堆叠成… |
| 函数 | `spawnPointDrop` | L3087–L3096 | — |
| 函数 | `updatePointDrops` | L3097–L3104 | — |
| 函数 | `drawPointDrops` | L3105–L3127 | — |
| 函数 | `drawCoin` | L3128–L3150 | 单枚钱币绘制（真币与装饰币共用）：椭圆币身+描边+高光+币面「¤」+可选自转翻转（squash） |
| 函数 | `hexA` | L3151–L3157 | #rrggbb → rgba(r,g,b,a)（特效层透明度用；阶色均为 6 位 hex 字面量） |
| 函数 | `spawnDeathCoinFx` | L3158–L3183 | 死亡爆币特效入口（killZombie 调用）：金光 + 装饰飞币（effects 层，吃 500 守卫优雅降级） 验收修正（2026-09-2… |
| 函数 | `spawnBurst` | L3184–L3189 | — |
| 函数 | `checkWave` | L3190–L3295 | — |

### 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） · L3295–L3324

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `screenShake` | L3296–L3296 | — |
| 常量 | `flashT` | L3297–L3297 | — |
| 常量 | `loseShakeUsed` | L3298–L3299 | — |
| 函数 | `triggerShake` | L3300–L3309 | — |
| 函数 | `triggerFlash` | L3310–L3313 | — |
| 函数 | `getShakeOffset` | L3314–L3325 | — |

### 渲染 · L3325–L4744

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `render` | L3326–L3352 | — |
| 常量 | `WARN_TOTAL` | L3353–L3353 | 「一大波僵尸即将来临」预警横幅 |
| 函数 | `drawWaveWarn` | L3354–L3419 | — |
| 函数 | `drawGameWorld` | L3420–L3746 | — |
| 函数 | `drawCorpsePart` | L3747–L3764 | F-02 死亡零件绘制（蓝图 §3）：head 带眼睛，其余为矩形；末 300ms 淡出 |
| 函数 | `drawShovelIcon` | L3765–L3789 | 铲子图标（供铲子槽 / 光标预览复用） |
| 常量 | `POT_LIFT` | L3790–L3790 | 花盆自身下沉 POT_SINK px 落到格底——错位后盆口沿/盆身/盆底全部可见，植物底缘正好立在盆口，还原"种在盆里"的层次。 几何：豌豆底… |
| 常量 | `onPot` | L3791–L3792 | — |
| 函数 | `drawPlant` | L3793–L3845 | — |
| 函数 | `drawPlantInner` | L3846–L4372 | 原 drawPlant 绘制主体（阴影/各类型/血条），签名改为 (p, x, y) 以支持种植动画缩放平移 |
| 函数 | `drawZombie` | L4373–L4501 | — |
| 函数 | `drawProjectile` | L4502–L4632 | — |
| 函数 | `drawSun` | L4633–L4656 | — |
| 函数 | `drawParticle` | L4657–L4666 | — |
| 函数 | `drawFloatScore` | L4667–L4679 | v2.3.2 §2.3：清碑积分飘字「+25」——上升 28px + 淡出（几何/色值/字体全走 GRAVEBUSTER_FX，禁散写）。 y … |
| 函数 | `drawShockwave` | L4680–L4698 | F-03 冲击波环（蓝图 §4）：easeOutCubic 扩散 8→180px，alpha 0.9→0，线宽 3→1.5 e.water（v1… |
| 函数 | `drawBoom` | L4699–L4719 | F-03 火球扩为 450ms 三色段（蓝图 §4）：白心→橙→红橙→透明，前 30% 涨后回缩 |
| 函数 | `drawCoinFx` | L4720–L4726 | 死亡爆币·装饰飞币（2026-09-21 验收）：自转翻转 + 末 0.3s 淡出（alpha 须在绘制前设） |
| 函数 | `drawCoinFlash` | L4727–L4747 | 死亡爆币·爆点金光：径向渐变（白心→阶色→透明）炸开，easeOut 半径扩张 |

### D-11 圆角化（蓝图 §6） · L4745–L5402

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `RADIUS` | L4748–L4748 | 统一圆角矩形：现代浏览器 ctx.roundRect 原生支持，退化 arcTo 兼容旧内核。 rr 内不碰 alpha；调用方需半透明时自行 … |
| 函数 | `rr` | L4749–L4761 | — |
| 函数 | `drawCardBar` | L4762–L4821 | — |
| 函数 | `drawCardFace` | L4822–L5087 | — |
| 函数 | `drawStatus` | L5088–L5138 | — |
| 常量 | `selTab` | L5139–L5139 | ---- v2.0 M2 T-204：选关页（state='select'）---- 页签需运行态（当前页 + 每世界页签文案差异），非纯常量：… |
| 常量 | `SEL_TAB_TIME` | L5140–L5140 | — |
| 函数 | `drawSelect` | L5141–L5242 | — |
| 函数 | `drawMenu` | L5243–L5295 | — |
| 函数 | `drawPause` | L5296–L5308 | — |
| 函数 | `drawEnd` | L5309–L5402 | （T-10 实装见 DECK_GRID 区，L1023 起） |

## 三、高频改动速查（人工维护区）

| 想改什么 | 去哪 | 备注 |
|---|---|---|
| 关卡数值（波次/阳光/僵尸数） | `LEVELS` | 改完跑 SMOKE-011 契约测试 |
| 难度倍率（血/速） | `DIFFS` | 与 `STATS` 相乘 |
| 僵尸基础属性 | `newWave` 内 `STATS` | hp/spd 基准值 |
| 植物卡片（费用/冷却） | `CARDS` | 卡片栏顺序 = 卡片索引 |
| 音效合成 | `SFX` | 新增音效后跑 SMOKE-013（调用键必须有定义） |
| 屏幕震动 | `triggerShake` / `getShakeOffset` | 上限 6px；结束画面不震（用户偏好） |
| 波次推进规则 | `checkWave` | 清场门槛 + 最小喘息 + 25s 兜底，改完跑 SMOKE-012 |
| 刷怪节奏 | `processSpawnQueue` | 间隔下限 2.5s |
| 主循环/帧异常隔离 | `loop` | gt 外置；异常整帧隔离 |
| 渲染入口与震动包裹 | `render` | 新增绘制必须 save/restore |
| 大波预警 | `drawWaveWarn` | 时长常量 `WARN_TOTAL` |
| 解锁进度存档 | `unlockedLevel` 附近 | localStorage 键 `pvz_unlocked`；URL `?level=N` 直进 |
