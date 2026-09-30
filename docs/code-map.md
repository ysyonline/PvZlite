# 代码地图 · PvZ Lite

> **本文件由脚本生成，请勿手改**：`node tools/gen-code-map.mjs`
> 源文件：`plants-vs-zombies.html`（5679 行 · 121 个顶层函数 · 125 个顶层常量 · 26 个分区）
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
| 基础配置 | L35–L76 | 42 | 18 |
| v2.3 夜行蘑菇（nocturnal · GDD v23 §2/§3） | L77–L278 | 202 | 43 |
| v1.4 配置表（T-01 · v1.4-impl-plan §1） | L279–L358 | 80 | 7 |
| v2.0 关卡数据层（T-102 · production/v2.0-plan.md §3.1-3.3） | L359–L976 | 618 | 20 |
| v1.4 元进度存档（T-02 · 积分/卡槽/卡池/卡组/通关计数） | L977–L1059 | 83 | 6 |
| v1.4 结算（T-07 难度乘算 / T-08 通关奖励） | L1060–L1080 | 21 | 2 |
| v1.4 结算入口（T-06 · 胜利 sweep / 失败部分结算） | L1081–L1205 | 125 | 21 |
| 音效（WebAudio 实时合成，无外部文件） | L1206–L1414 | 209 | 18 |
| 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） | L1415–L1536 | 122 | 5 |
| 主循环 | L1537–L1588 | 52 | 5 |
| 输入 | L1589–L1639 | 51 | 4 |
| 种植校验规则表（P1-A · code-review-todo 2026-09-20） | L1640–L1827 | 188 | 5 |
| v2.2.6 存档导出/导入（背景：预览源随端口漂移 → localStorage 按 origin 隔离 → 进度"被清"） | L1828–L1876 | 49 | 2 |
| v1.4 卡槽解锁（T-11 · 验收变更 2026-09-21：面板/商城入口下线，buySlot 逻辑保留备解冻） | L1877–L2149 | 273 | 13 |
| 游戏控制 | L2150–L2177 | 28 | 1 |
| 波次 | L2178–L2344 | 167 | 13 |
| 更新 | L2345–L2422 | 78 | 1 |
| v1.6 第4刀：投掷类公用抛物解算器（D1） | L2423–L2921 | 499 | 11 |
| = | L2922–L2928 | 7 | 0 |
| = | L2929–L2957 | 29 | 1 |
| = | L2958–L2961 | 4 | 0 |
| = | L2962–L3210 | 249 | 4 |
| v1.4 积分掉落物（T-04 · 独立数组，绕开 effects 500 守卫） | L3211–L3425 | 215 | 9 |
| 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） | L3426–L3455 | 30 | 6 |
| 渲染 | L3456–L4991 | 1536 | 20 |
| D-11 圆角化（蓝图 §6） | L4992–L5676 | 685 | 11 |

## 二、逐区明细

### 基础配置 · L35–L76

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
| 常量 | `ONE_SHOT_ARM_TIME` | L67–L71 | v2.2.7 消缺：航椒/樱桃一次性炸弹的膨胀武装时长（秒）。种植后先膨胀（arming），膨胀动画完成即立即引爆。 |
| 常量 | `PEPPER_FIREROW` | L72–L74 | life 0.6s 快燃快熄（比 boom 0.5s 略长半拍作余韵）；segments=火舌数横贯 9 列；halfH=火舌基准半高 （px；… |
| 常量 | `SUNFLOWER_FIRST` | L75–L80 | v2.2.8 消缺：向日葵产阳光间隔（秒）。原版 PvZ 首产 7s、之后每 24s；本作日夜有别—— 白天 20s（保持既有手感基线），夜晚 … |

### v2.3 夜行蘑菇（nocturnal · GDD v23 §2/§3） · L77–L278

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `NOCTURNAL_TYPES` | L81–L81 | 夜行机制（§2.1）：蘑菇类植物白天（level.time==='day'）**沉睡**（不产出/不攻击/不触发）， 夜晚（'night'）与浓… |
| 函数 | `isNocturnal` | L82–L85 | — |
| 常量 | `SUNSHROOM_FIRST` | L86–L87 | 阳光菇（sunshroom）参数（§3.1）：cost 25 / 种植 cd 7.5s / dur 300； 夜晚首产 6s、之后每 24s（与… |
| 常量 | `SUNSHROOM_GEOM` | L88–L91 | 阳光菇绘制几何（世界版 drawPlantInner + 卡面版 drawCardFace 共用，禁止两处硬编码）：幼体/成体菇盖半径 |
| 常量 | `PUFFSHROOM_DMG` | L92–L94 | 小喷菇（puffshroom）参数（§3.2）：cost 0 / 种植 cd 7.5s / dur 300；单发 20 / 间隔 1.4s / … |
| 常量 | `PUFFSHROOM_GEOM` | L95–L100 | 小喷菇绘制几何（世界版 drawPlantInner + 卡面版 drawCardFace 共用，禁止两处硬编码）：菇盖半径 v2.3.6（20… |
| 常量 | `FUMESHROOM_DMG` | L101–L103 | 弹体**穿透**（type:'fume'，pierce:true）：命中后不消失，对本行射程内每个僵尸各结算一次 20； 去重状态挂弹体侧（pr… |
| 常量 | `FUMESHROOM_GEOM` | L104–L110 | 大喷菇绘制几何（世界版 drawPlantInner + 卡面版 drawCardFace 共用，禁两处硬编码）： capR=菇盖半径（成体尺感… |
| 常量 | `SCAREDYSHROOM_DMG` | L111–L113 | 恐惧判定**即时**（同 isNocturnal 范式，不新增 asleep 状态字段 ⇒ probe 快照白名单零改动）。 ★ 射程=全行（同… |
| 常量 | `SCAREDYSHROOM_GEOM` | L114–L116 | 害羞菇绘制几何（世界版 drawPlantInner + 卡面版 drawCardFace 共用，禁两处硬编码）：菇盖半径 尺感介于小喷菇(12… |
| 常量 | `NOCTURNAL_BADGE` | L117–L126 | 卡面「☾ 夜行」角标几何 + 配色（v2.3.0 U10：drawNocturnalBadge 单点收拢，选卡页与对局内卡栏共用； 沿 END_… |
| 常量 | `HYPNOSHROOM_IMMUNE` | L127–L127 | ★ 魅惑状态机（§4）：被魅惑僵尸向右行走、不再啃植物，改与敌方僵尸互啃；可被敌方反杀。 互啃伤害速率：取「僵尸啃植物 65/s」**同口径**… |
| 常量 | `HYPNOSHROOM_BITE_DPS` | L128–L128 | — |
| 常量 | `HYPNOSHROOM_ENGAGE` | L129–L130 | — |
| 常量 | `HYPNOSHROOM_GEOM` | L131–L136 | 魅惑菇绘制几何（世界版 drawPlantInner + 卡面版 drawCardFace 共用，禁两处硬编码）：菇盖半径 + 催眠螺旋半径 |
| 常量 | `GRAVE_SPAWN_PCT` | L137–L137 | 墓碑双职责：①占格挡种植（canPlant onGrave 首条拦截）②每波开始按墓碑数量概率「钻出」额外僵尸。 每波每座墓碑独立触发：按波次爬… |
| 常量 | `GRAVE_SPAWN_RAMP` | L138–L138 | — |
| 常量 | `GRAVE_SPAWN_POOL` | L139–L142 | — |
| 常量 | `GRAVE_RESPAWN_WAVES` | L143–L143 | v2.3.7 墓碑重生（2026-09-29 用户拍板方案）：墓碑被吃光后，倒数 2 波开始时从地面随机生成新碑。 触发：wave>=total… |
| 常量 | `GRAVE_RESPAWN_MIN` | L144–L144 | — |
| 常量 | `GRAVE_RESPAWN_COL_MIN` | L145–L145 | — |
| 常量 | `W2_START_SUN` | L146–L151 | — |
| 常量 | `ZOMBIE_BASE` | L152–L164 | 现提纯为 ZOMBIE_BASE：newWave 内 `const STATS=ZOMBIE_BASE;` 别名保持下游零改动， summonB… |
| 常量 | `GRAVEBUSTER_CHEW` | L165–L165 | 咀嚼全程走 updatePlant 的 dt 累加（禁定时器铁律）。 ★ 咀嚼时长 4.0s **短于**被啃死时间 dur300/65=4.6… |
| 常量 | `GRAVEBUSTER_CHIP` | L166–L166 | — |
| 常量 | `GRAVEBUSTER_CHIP_COLOR` | L167–L169 | — |
| 常量 | `GRAVEBUSTER_FX` | L170–L172 | 「+25」飘字（GDD §2.3 收获反馈；替代 v2.3.2 首轮的「返还 25 阳光」toast——阳光是局内唯一资源， 返还 ⇒ 后续碑免… |
| 常量 | `GRAVEBUSTER_GEOM` | L173–L174 | 绘制几何（世界版 drawPlantInner + 卡面版 drawCardFace 共用，禁两处硬编码；沿 END_BTN / *_GEOM … |
| 常量 | `ELVIS_FIRST_SUMMON` | L175–L175 | ---- v2.3.2 猫王僵尸 elvis / 伴舞 backup（GDD v2.3.2 §3）---- |
| 常量 | `ELVIS_INTERVAL` | L176–L176 | — |
| 常量 | `ELVIS_SUMMON_COUNT` | L177–L177 | — |
| 常量 | `ELVIS_SUMMON_CAP` | L178–L178 | — |
| 常量 | `ELVIS_CAP` | L179–L179 | — |
| 常量 | `BACKUP_EMERGE` | L180–L180 | — |
| 常量 | `BACKUP_CRUMBLE` | L181–L184 | — |
| 常量 | `ELVIS_WAVES` | L185–L191 | 波次注入编排（GDD §3.5）：**不进 GRAVE_SPAWN_POOL**——该池是「每碑独立 30% 判定」， 9 碑×30%≈2.7 … |
| 常量 | `MUSHROOM_SLEEP_GEOM` | L192–L208 | ★ 仅 level.time 为 night/fog 时 asleep=false ⇒ drawPlantInner 走下方 else「原清醒路… |
| 常量 | `MUSHROOM_SLEEP_CAP` | L209–L215 | sunshroom 清醒 #f2d8dc → 沉睡 #b898a0（通道差 58/64/60 达标） puffshroom 清醒 #9a6ad0… |
| 常量 | `MUSHROOM_SLEEP_LINE` | L216–L217 | — |
| 函数 | `drawMushroomZzz` | L218–L231 | v2.3-U8 沉睡姿态通用绘制：半闭眼（横向细线×2）+ 睡眠符号「z z z」（几何笔画，不依赖字体） |
| 函数 | `drawMushroomAsleepFace` | L232–L244 | — |
| 函数 | `drawPrismaticGlint` | L245–L264 | v2.3.6 阳光菇「三棱镜折射」虹彩点缀（2026-09-29 用户需求：菇头带一小点五彩颜色）： 菇盖左上 1/4 弧上叠一小段五色弧带（红… |
| 函数 | `drawNocturnalBadge` | L265–L281 | · 入参 = 卡片矩形 (x,y,w,h)；角标锚定卡片右下角内缩 2px；几何走 NOCTURNAL_BADGE（38×13，禁硬编码）。 ·… |

### v1.4 配置表（T-01 · v1.4-impl-plan §1） · L279–L358

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `POINT_CONFIG` | L282–L311 | 硬编码禁令落点：阶位/怪→阶/槽价/发卡序列/通关奖励规则全部数据注册式收拢在此。 未来新增地图或积分获取渠道 → 只往表里加数据，逻辑零改动（… |
| 常量 | `GRAVE_CLEAR_SCORE` | L312–L312 | ★ 单点真相：清碑奖励 / 猫王 / 伴舞三处计分必须引这里，**禁止**在调用点散写字面量 （历史坑：首轮把 elvis 200 / back… |
| 常量 | `ELVIS_SCORE` | L313–L313 | — |
| 常量 | `BACKUP_SCORE` | L314–L314 | — |
| 常量 | `SLOT_CONFIG` | L315–L351 | — |
| 常量 | `DIFFS` | L352–L356 | — |
| 常量 | `DIFF` | L357–L366 | — |

### v2.0 关卡数据层（T-102 · production/v2.0-plan.md §3.1-3.3） · L359–L976

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `WORLD_THEMES` | L367–L379 | 昼夜结构（Q-6a）：草/墓/房=前 5 昼后 5 夜；泳池三段=3-1~3-2 昼、3-3~3-5 夜、3-6~3-10 浓雾夜。 time … |
| 常量 | `_ANCHORS` | L380–L764 | ---- 锚点关字面量（§3.2 层①）：waves/totalWaves/startSun/armTime/lawn 自旧表逐字平移；机制字段… |
| 常量 | `WAVE_TEMPLATES` | L765–L775 | v2.3.6 波数对齐（用户拍板）：世界 2 波数按关号位对齐世界 1——2-l ↔ 1-l（2-1 五波对齐 1-1、 2-10 十波对齐 1… |
| 函数 | `materializeLevels` | L776–L847 | 锚点默认值，waves 从 WAVE_TEMPLATES[world] **JSON 深拷贝**补齐（世界 2 例外：v2.3.6 按 l 取 … |
| 常量 | `LEVELS` | L848–L850 | ★ const 引用稳定（harness __LEVELS 桥与大量既有用例依赖 const 语义，不得改 let/函数包裹） |
| 常量 | `GRAVES_MASTER` | L851–L852 | v2.3.2 P-K2：墓碑母表（boot 期深拷贝快照，任何时刻只读）——每局从它克隆， 防止「清碑」（removeGrave → level… |
| 常量 | `LEVEL_INDEX` | L853–L853 | — |
| 函数 | `keyOrd` | L854–L856 | — |
| 函数 | `legacyKey` | L857–L861 | 数字键兼容 shim（§3.5）：n∈1..5 → '1-'+n，否则 null；严格上界 5（旧 ?level=6 被拒语义不许放宽）。 仅限… |
| 常量 | `ANCHOR_BUTTONS` | L862–L862 | 菜单 5 钮锚点布局（T-104b C-1）：固定五关键序，与 harness __ANCHOR 表同源同序（'1-1'/'1-2'/'1-6'… |
| 常量 | `level` | L863–L863 | — |
| 常量 | `levelKey` | L864–L866 | — |
| 常量 | `unlocked` | L867–L870 | 解锁进度持久化（Q-16 键名形态 · T-103）：运行期主变量=unlocked（最高解锁键）；存档走 v2 键（下方 boot 读档块）。… |
| 常量 | `diffProgress` | L871–L871 | v2.3 消缺：per-difficulty 关卡进度（普通/困难/地狱独立 saveCleared + unlocked） 声明须在 boot… |
| 函数 | `saveDiffProgress` | L872–L879 | — |
| 常量 | `testMode` | L880–L887 | 测试模式（2026-09-20 用户需求）：URL 带 ?test=1 开启——阳光锁 9999 无限种植物 + 卡池全开（CARDS 全部 1… |
| 常量 | `saveCleared` | L888–L939 | cleared=已通关键数组（集合语义，重复通关不重复 push）；unlocked=最高解锁键；cardSeen 本期占位空数组（预留无消费）… |
| 函数 | `storageGet` | L940–L942 | 存档读写统一入口（2026-09-16 · KNOWN-ISSUES #9）：隐私模式 / file:// 受限环境下静默降级，绝不抛错中断游戏 |
| 函数 | `storageSet` | L943–L947 | — |
| 常量 | `CARDS` | L948–L983 | 植物卡 |

### v1.4 元进度存档（T-02 · 积分/卡槽/卡池/卡组/通关计数） · L977–L1059

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `points` | L984–L986 | 存量卡池推导仍走旧口径：poolFromProgress 按 unlocked 序位等价展开（T-105 切 cleared 集合 + 新表）。… |
| 常量 | `diffClears` | L987–L987 | v1.5 决议2：per-difficulty 通关记录（'难度:关号' → true）；无历史记录=存量玩家重通领取（patch note 披… |
| 函数 | `loadMeta` | L988–L1040 | — |
| 函数 | `poolFromProgress` | L1041–L1053 | （'w-l' 真键直查）。旧数字序位展开退役。 旧档迁移等价性：N=2/3 与旧推导等价；N=5 已知差异——v2.0 序列重排（1-3 mel… |
| 函数 | `defaultDeck` | L1054–L1058 | — |
| 函数 | `inDeck` | L1059–L1066 | — |

### v1.4 结算（T-07 难度乘算 / T-08 通关奖励） · L1060–L1080

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `computeClearReward` | L1067–L1077 | v1.x 期世界 1 无法凑满 10 键（当时 35 占位关不可玩）实际不可触发，纯函数级测试验证（plan §4.2）； v2.3.3 起 4… |
| 函数 | `settlePointsRaw` | L1078–L1088 | 局合计取整口径（T-07）：(击杀收集合计 + 通关奖励) × DIFFS[DIFF].mult → Math.round 一次。 不做 per… |

### v1.4 结算入口（T-06 · 胜利 sweep / 失败部分结算） · L1081–L1205

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `endStats` | L1089–L1089 | 「通关前快照」（saveCleared 入集之前），首通发、重通零发（幂等，无需新存档字段）； 与 worldClear 一并进 settleP… |
| 函数 | `settleRun` | L1090–L1110 | — |
| 函数 | `saveMeta` | L1111–L1134 | — |
| 常量 | `state` | L1135–L1136 | 状态 |
| 常量 | `highScore` | L1137–L1137 | — |
| 常量 | `plants` | L1138–L1140 | — |
| 函数 | `setState` | L1141–L1149 | 状态切换统一入口（带控制台留痕，方便排查“突然退出对局”这类偶现问题） |
| 函数 | `updateBest` | L1150–L1153 | 历史最高分落盘（仅当刷新纪录时写，减少 localStorage 写入，2026-09-16 #9） |
| 常量 | `toastMsg` | L1154–L1155 | 屏幕提示条（临时消息） |
| 常量 | `giftAnim` | L1156–L1156 | v2.2.4 通关奖励植物淡入状态——end 态绘制前触发，奖励植物淡入展示（约 1s 淡入到 alpha 0.85） |
| 函数 | `triggerGiftAnim` | L1157–L1159 | — |
| 函数 | `toast` | L1160–L1160 | — |
| 函数 | `drawToast` | L1161–L1178 | — |
| 常量 | `exitArm` | L1179–L1179 | 对局中返回菜单需要二次确认，避免误触/误按丢掉进度 |
| 函数 | `requestExit` | L1180–L1187 | — |
| 常量 | `R` | L1188–L1188 | 工具 |
| 常量 | `C` | L1189–L1191 | — |
| 函数 | `liftX` | L1192–L1195 | v1.3-M4 C2 屋顶抬升函数：返回该 x 处的抬升量（≥0 = 向上 = 屏幕 y 减小）。 ★ 单点 gate：!level.roof … |
| 函数 | `gridToPos` | L1196–L1199 | — |
| 函数 | `posToGrid` | L1200–L1203 | — |
| 函数 | `inGrid` | L1204–L1206 | — |

### 音效（WebAudio 实时合成，无外部文件） · L1206–L1414

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `audioCtx` | L1207–L1207 | — |
| 常量 | `audioQueue` | L1208–L1208 | — |
| 函数 | `ac` | L1209–L1219 | — |
| 函数 | `scheduleOrDefer` | L1220–L1223 | 排程守卫：上下文未 running（suspended/interrupted）时，直接排程的事件可能被整段丢弃 （用户反馈 2026-09-1… |
| 函数 | `flushAudioQueue` | L1224–L1232 | — |
| 函数 | `primeAudio` | L1233–L1241 | 音频管线预热：上下文刚创建时音频线程尚未就绪，会话首个音效常被整段吞掉 （用户反馈 2026-09-16：开局种植物没声音，之后的音效正常）。 … |
| 函数 | `armAudioUnlock` | L1242–L1263 | 兜底：任意一次用户手势都尝试恢复音频上下文（部分浏览器创建后仍保持 suspended） |
| 常量 | `BGM` | L1264–L1273 | + 低音层（sine 根音），C 大调五声，C-G-Am-F 和声进行。 音量按「经 env 总线 0.5 衰减后仍清晰可闻」标定（初版 0.0… |
| 函数 | `updateBGM` | L1274–L1283 | — |
| 函数 | `bgmTick` | L1284–L1315 | — |
| 常量 | `AudioBus` | L1316–L1322 | ---- 音频总线（ADR-004）：4 分组 GainNode + masterGain → destination ---- 分组默认音量：… |
| 常量 | `AUDIO_ROUTES` | L1323–L1329 | SFX 分组映射（tone/noise 默认走 event；战斗/UI 音效按需显式传分组）。 本表是「规格侧」的权威映射，运行时由各 SFX … |
| 函数 | `initAudioBus` | L1330–L1362 | — |
| 函数 | `tone` | L1363–L1367 | 单音：频率、时长、波形、音量、延迟、滑到目标频率 |
| 函数 | `scheduleTone` | L1368–L1381 | — |
| 函数 | `noise` | L1382–L1386 | 噪声：用于爆炸/挖掘/啃食。按 dur 就近取预生成 buffer 段（0.1/0.3/0.5s） |
| 函数 | `scheduleNoise` | L1387–L1409 | — |
| 函数 | `routeBus` | L1410–L1415 | 取输出总线：group 显式优先（SFX 调用点已标注所属分组）；缺省走 event。 总线未初始化（无头测试 / 降级）时直连 destina… |

### 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） · L1415–L1536

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `Easing` | L1416–L1431 | — |
| 常量 | `sfxGate` | L1432–L1432 | 节流：防止密集事件把音频糊成一团 |
| 函数 | `gate` | L1433–L1437 | — |
| 常量 | `SFX` | L1438–L1515 | — |
| 常量 | `SirenLoop` | L1516–L1537 | 采用「帧驱动」而非 setInterval： · 暂停时 update 不执行 → 警报天然同步暂停（§C.1 的暂停要求零额外代码） · 横幅… |

### 主循环 · L1537–L1588

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastT` | L1538–L1538 | — |
| 常量 | `lastDt` | L1539–L1539 | — |
| 常量 | `frameErr` | L1540–L1540 | — |
| 函数 | `loop` | L1541–L1577 | — |
| 函数 | `drawFrameErr` | L1578–L1589 | — |

### 输入 · L1589–L1639

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastMouseGrid` | L1590–L1603 | — |
| 函数 | `bindBtn` | L1604–L1609 | 按钮统一绑定：点完主动 blur，避免按钮保留焦点后被 Space/Enter 二次触发 |
| 函数 | `togglePause` | L1610–L1623 | 暂停切换统一入口：三处触发（按钮/空格/Esc）收敛到此，切换后同步 BGM 起停 （2026-09-20 用户反馈：暂停后 BGM 还在放——… |
| 函数 | `applyMuteUI` | L1624–L1641 | 静音按钮外观跟随 muted 状态（启动即按存档恢复，2026-09-16 #9） |

### 种植校验规则表（P1-A · code-review-todo 2026-09-20） · L1640–L1827

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `removeGrave` | L1642–L1656 | v2.3.2：清除墓碑的唯一写入点（配合 GRAVES_MASTER 母表，禁止在其它地方直接改 level.graves） |
| 函数 | `canPlant` | L1657–L1683 | ③垫/盆不算占用（垫上/盆上可连种）；同载体重叠（垫上铺垫/盆上放盆）与普通重复种植算占用。 ④水轴是单条强约束「水域关+水行」双条件放行（v1… |
| 函数 | `spawnPlant` | L1684–L1706 | 旧对象兜底（drawPlant L1748 区 plantT===undefined）保留不删——harness 注入的测试对象 仍是旧 sch… |
| 函数 | `onClick` | L1707–L1814 | — |
| 函数 | `onClickMenu` | L1815–L1830 | — |

### v2.2.6 存档导出/导入（背景：预览源随端口漂移 → localStorage 按 origin 隔离 → 进度"被清"） · L1828–L1876

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `exportSave` | L1831–L1850 | 导出：收集全部 pvz_* 键为一份 JSON 文本复制到剪贴板（clipboard 受限时降级 prompt 手选复制）。 导入：粘贴 JSO… |
| 函数 | `importSave` | L1851–L1877 | — |

### v1.4 卡槽解锁（T-11 · 验收变更 2026-09-21：面板/商城入口下线，buySlot 逻辑保留备解冻） · L1877–L2149

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `buySlot` | L1878–L1889 | — |
| 常量 | `DECK_GRID` | L1890–L1890 | 默认卡组 = 向日葵/豌豆/坚果 3 张（用户实测反馈拍板），允许不满开局（≥1 张）。 v2.3.0 U6：上排待选网格改为「按卡数自适应行数… |
| 常量 | `DECK_SLOTS` | L1891–L1891 | — |
| 常量 | `DECK_GRID_CW` | L1892–L1892 | — |
| 常量 | `DECK_GRID_GAP` | L1893–L1893 | — |
| 常量 | `DECK_GRID_SAFE` | L1894–L1898 | — |
| 函数 | `deckGridLayout` | L1899–L1913 | 本函数是上排网格唯一几何源，drawSelectDeck 与 onClickDeck 都只调它 + deckCardRect。 行数 = cei… |
| 函数 | `deckCardRect` | L1914–L1917 | 第 i 张卡在网格中的矩形（draw/hit 同源；禁止任何一处再写死 x0/gw/150/100） |
| 函数 | `drawSelectDeck` | L1918–L2004 | — |
| 函数 | `onClickSelect` | L2005–L2047 | — |
| 函数 | `onClickDeck` | L2048–L2075 | — |
| 函数 | `onClickEnd` | L2076–L2094 | — |
| 函数 | `onKey` | L2095–L2150 | — |

### 游戏控制 · L2150–L2177

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `startGame` | L2151–L2179 | — |

### 波次 · L2178–L2344

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `spawnQueue` | L2180–L2180 | 波次生成：用队列逐个放出，不是一次性全刷 |
| 常量 | `spawnTimer` | L2181–L2181 | — |
| 常量 | `waveInterval` | L2182–L2182 | — |
| 常量 | `waveActive` | L2183–L2183 | — |
| 常量 | `waveDrainedT` | L2184–L2187 | — |
| 常量 | `spawnGateZ` | L2188–L2188 | v1.3-M4 FIX-01 v2（口径修订 2026-09-19 20:52）：教学关（'1-1'/'1-2'；T-104b 前为数字关号 1… |
| 常量 | `spawnGateT` | L2189–L2191 | — |
| 常量 | `warn` | L2192–L2197 | 大波预警：active=横幅显示中，t=剩余秒数，last=已预警过的波次号， pending=倒计时已结束但还在等场上清空（横幅此时已隐藏，只… |
| 函数 | `graveRespawn` | L2198–L2213 | 落点约束：仅 c4~c8 列（排除 c0~c3），且该格无植物、无已有墓碑。新碑与初始碑同构—— 可被墓碑吞噬者清除（removeGrave 唯… |
| 函数 | `newWave` | L2214–L2291 | — |
| 常量 | `_nextZombieUid` | L2292–L2293 | 从队列中逐个放出僵尸 v2.3.2：僵尸 uid 发号器（全局单调自增）。新僵尸统一在此取号 ⇒ ownerId 关联唯一且跨波不重号。 |
| 函数 | `countElvis` | L2294–L2298 | v2.3.2：猫王本体计数（ELVIS_CAP 用）：场上未死亡的本体数，伴舞不计数。 |
| 函数 | `processSpawnQueue` | L2299–L2345 | — |

### 更新 · L2345–L2422

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `update` | L2346–L2432 | — |

### v1.6 第4刀：投掷类公用抛物解算器（D1） · L2423–L2921

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `fireArcProjectile` | L2433–L2455 | spec = {dmg, type, splash, splashRatio?, splashGrid?, chill?, butter?}：附… |
| 函数 | `updatePlant` | L2456–L2700 | — |
| 函数 | `explodeMine` | L2701–L2732 | ★ v2.1.1 消缺：原 `z.hp-=DMG(500); if(z.hp<=0)kill` 做耐久结算，导致铁桶(560)与高难度 （har… |
| 函数 | `explodePepper` | L2733–L2760 | v2.2 航椒爆炸：同排全清秒杀（无差别，不限数量/列） |
| 函数 | `explodeCherry` | L2761–L2787 | v2.2 樱桃爆炸：3×3 格跨行秒杀（本作首个跨行秒杀） |
| 函数 | `hasZombieAhead` | L2788–L2798 | — |
| 函数 | `hasZombieInRange` | L2799–L2810 | v2.3 小喷菇射程判定（§3.2）：本行僵尸进入 cells 格内（含边界）才返回真。 口径基准 = 植物格心 pos.x（同 hasZomb… |
| 函数 | `isScaredyAfraid` | L2811–L2819 | v2.3 害羞菇恐惧判定（§3.5）：本格 3×3 范围内有僵尸 → 返回真（缩头躲起来，不攻击）。 口径：横向 |z.x−pos.x| ≤ S… |
| 函数 | `updateProjectiles` | L2820–L2908 | — |
| 函数 | `applyChill` | L2909–L2916 | v1.5 S4 chill 施加单点入口：slowT 刷新续时（40%·2.0s 铁律锁定在调用侧系数与这里 2.0）。 不叠加语义：已减速只把… |
| 函数 | `applyFreeze` | L2917–L2929 | v1.7 corn 黄油定身单点入口：freezeT 置满 3.0s（v1.6 引入；完全定身，移动+啃食双停）。 与 chill（slowT·… |

### = · L2922–L2928

_（无顶层声明，纯逻辑/样式区）_

### = · L2929–L2957

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `summonBackup` | L2930–L2962 | — |

### = · L2958–L2961

_（无顶层声明，纯逻辑/样式区）_

### = · L2962–L3210

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `scatterBackups` | L2963–L2972 | — |
| 函数 | `updateZombies` | L2973–L3154 | — |
| 函数 | `spawnCorpseParts` | L3155–L3189 | F-02 死亡零件（蓝图 §3）：死亡 = 血雾（保留）+ 零件爆散，§G 粒子上限双保险 |
| 函数 | `killZombie` | L3190–L3216 | — |

### v1.4 积分掉落物（T-04 · 独立数组，绕开 effects 500 守卫） · L3211–L3425

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `pointDrops` | L3217–L3217 | 2026-09-21 验收增强：死亡爆币特效（装饰层）——真币（pointDrops）数据契约不动， 视觉上「爆出一堆钱币 + 光」：真币堆叠成… |
| 函数 | `spawnPointDrop` | L3218–L3227 | — |
| 函数 | `updatePointDrops` | L3228–L3235 | — |
| 函数 | `drawPointDrops` | L3236–L3258 | — |
| 函数 | `drawCoin` | L3259–L3281 | 单枚钱币绘制（真币与装饰币共用）：椭圆币身+描边+高光+币面「¤」+可选自转翻转（squash） |
| 函数 | `hexA` | L3282–L3288 | #rrggbb → rgba(r,g,b,a)（特效层透明度用；阶色均为 6 位 hex 字面量） |
| 函数 | `spawnDeathCoinFx` | L3289–L3314 | 死亡爆币特效入口（killZombie 调用）：金光 + 装饰飞币（effects 层，吃 500 守卫优雅降级） 验收修正（2026-09-2… |
| 函数 | `spawnBurst` | L3315–L3320 | — |
| 函数 | `checkWave` | L3321–L3426 | — |

### 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） · L3426–L3455

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `screenShake` | L3427–L3427 | — |
| 常量 | `flashT` | L3428–L3428 | — |
| 常量 | `loseShakeUsed` | L3429–L3430 | — |
| 函数 | `triggerShake` | L3431–L3440 | — |
| 函数 | `triggerFlash` | L3441–L3444 | — |
| 函数 | `getShakeOffset` | L3445–L3456 | — |

### 渲染 · L3456–L4991

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `render` | L3457–L3483 | — |
| 常量 | `WARN_TOTAL` | L3484–L3484 | 「一大波僵尸即将来临」预警横幅 |
| 函数 | `drawWaveWarn` | L3485–L3550 | — |
| 函数 | `drawGameWorld` | L3551–L3878 | — |
| 函数 | `drawCorpsePart` | L3879–L3896 | F-02 死亡零件绘制（蓝图 §3）：head 带眼睛，其余为矩形；末 300ms 淡出 |
| 函数 | `drawShovelIcon` | L3897–L3921 | 铲子图标（供铲子槽 / 光标预览复用） |
| 常量 | `POT_LIFT` | L3922–L3922 | 花盆自身下沉 POT_SINK px 落到格底——错位后盆口沿/盆身/盆底全部可见，植物底缘正好立在盆口，还原"种在盆里"的层次。 几何：豌豆底… |
| 常量 | `onPot` | L3923–L3924 | — |
| 函数 | `drawPlant` | L3925–L3977 | — |
| 函数 | `drawPlantInner` | L3978–L4570 | 原 drawPlant 绘制主体（阴影/各类型/血条），签名改为 (p, x, y) 以支持种植动画缩放平移 |
| 函数 | `drawZombie` | L4571–L4700 | — |
| 函数 | `drawProjectile` | L4701–L4831 | — |
| 函数 | `drawSun` | L4832–L4855 | — |
| 函数 | `drawParticle` | L4856–L4865 | — |
| 函数 | `drawFloatScore` | L4866–L4878 | v2.3.2 §2.3：清碑积分飘字「+25」——上升 28px + 淡出（几何/色值/字体全走 GRAVEBUSTER_FX，禁散写）。 y … |
| 函数 | `drawShockwave` | L4879–L4897 | F-03 冲击波环（蓝图 §4）：easeOutCubic 扩散 8→180px，alpha 0.9→0，线宽 3→1.5 e.water（v1… |
| 函数 | `drawBoom` | L4898–L4920 | F-03 火球扩为 450ms 三色段（蓝图 §4）：白心→橙→红橙→透明，前 30% 涨后回缩 |
| 函数 | `drawFireRow` | L4921–L4966 | v2.3.6 航椒整排火烧带（2026-09-29 用户需求）：横贯本行的火烧，0.6s 快燃快熄。 双层结构：层1 = 波状上缘连续火基带（整… |
| 函数 | `drawCoinFx` | L4967–L4973 | 死亡爆币·装饰飞币（2026-09-21 验收）：自转翻转 + 末 0.3s 淡出（alpha 须在绘制前设） |
| 函数 | `drawCoinFlash` | L4974–L4994 | 死亡爆币·爆点金光：径向渐变（白心→阶色→透明）炸开，easeOut 半径扩张 |

### D-11 圆角化（蓝图 §6） · L4992–L5676

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `RADIUS` | L4995–L4995 | 统一圆角矩形：现代浏览器 ctx.roundRect 原生支持，退化 arcTo 兼容旧内核。 rr 内不碰 alpha；调用方需半透明时自行 … |
| 函数 | `rr` | L4996–L5008 | — |
| 函数 | `drawCardBar` | L5009–L5068 | — |
| 函数 | `drawCardFace` | L5069–L5361 | — |
| 函数 | `drawStatus` | L5362–L5412 | — |
| 常量 | `selTab` | L5413–L5413 | ---- v2.0 M2 T-204：选关页（state='select'）---- 页签需运行态（当前页 + 每世界页签文案差异），非纯常量：… |
| 常量 | `SEL_TAB_TIME` | L5414–L5414 | — |
| 函数 | `drawSelect` | L5415–L5516 | — |
| 函数 | `drawMenu` | L5517–L5569 | — |
| 函数 | `drawPause` | L5570–L5582 | — |
| 函数 | `drawEnd` | L5583–L5676 | （T-10 实装见 DECK_GRID 区，L1023 起） |

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
