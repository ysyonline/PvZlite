# 代码地图 · PvZ Lite

> **本文件由脚本生成，请勿手改**：`node tools/gen-code-map.mjs`
> 源文件：`plants-vs-zombies.html`（4350 行 · 103 个顶层函数 · 77 个顶层常量 · 20 个分区）
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
| 基础配置 | L35–L63 | 29 | 14 |
| v1.4 配置表（T-01 · v1.4-impl-plan §1） | L64–L125 | 62 | 4 |
| v2.0 关卡数据层（T-102 · production/v2.0-plan.md §3.1-3.3） | L126–L706 | 581 | 19 |
| v1.4 元进度存档（T-02 · 积分/卡槽/卡池/卡组/通关计数） | L707–L789 | 83 | 6 |
| v1.4 结算（T-07 难度乘算 / T-08 通关奖励） | L790–L809 | 20 | 2 |
| v1.4 结算入口（T-06 · 胜利 sweep / 失败部分结算） | L810–L936 | 127 | 23 |
| 音效（WebAudio 实时合成，无外部文件） | L937–L1144 | 208 | 18 |
| 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） | L1145–L1260 | 116 | 5 |
| 主循环 | L1261–L1307 | 47 | 5 |
| 输入 | L1308–L1358 | 51 | 4 |
| 种植校验规则表（P1-A · code-review-todo 2026-09-20） | L1359–L1511 | 153 | 4 |
| v1.4 卡槽解锁（T-11 · 验收变更 2026-09-21：面板/商城入口下线，buySlot 逻辑保留备解冻） | L1512–L1748 | 237 | 8 |
| 游戏控制 | L1749–L1772 | 24 | 1 |
| 波次 | L1773–L1850 | 78 | 10 |
| 更新 | L1851–L1920 | 70 | 1 |
| v1.6 第4刀：投掷类公用抛物解算器（D1） | L1921–L2377 | 457 | 12 |
| v1.4 积分掉落物（T-04 · 独立数组，绕开 effects 500 守卫） | L2378–L2588 | 211 | 9 |
| 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） | L2589–L2618 | 30 | 6 |
| 渲染 | L2619–L3693 | 1075 | 18 |
| D-11 圆角化（蓝图 §6） | L3694–L4347 | 654 | 11 |

## 二、逐区明细

### 基础配置 · L35–L63

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
| 常量 | `MENU_BTN` | L53–L53 | v2.0 M2 主菜单/选关页共享几何（T-201，沿 END_BTN 惯例）：绘制（draw）与命中（onClick）只准共用此处常量，禁两处… |
| 常量 | `SELECT_GEOM` | L54–L61 | — |
| 常量 | `VERSION` | L62–L66 | 版本号（KNOWN-ISSUES #6）：源码内嵌版本标识，便于仅凭文件本身判定版本 |

### v1.4 配置表（T-01 · v1.4-impl-plan §1） · L64–L125

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `POINT_CONFIG` | L67–L92 | 硬编码禁令落点：阶位/怪→阶/槽价/发卡序列/通关奖励规则全部数据注册式收拢在此。 未来新增地图或积分获取渠道 → 只往表里加数据，逻辑零改动（… |
| 常量 | `SLOT_CONFIG` | L93–L118 | — |
| 常量 | `DIFFS` | L119–L123 | — |
| 常量 | `DIFF` | L124–L133 | — |

### v2.0 关卡数据层（T-102 · production/v2.0-plan.md §3.1-3.3） · L126–L706

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `WORLD_THEMES` | L134–L146 | 昼夜结构（Q-6a）：草/墓/房=前 5 昼后 5 夜；泳池三段=2-1~2-2 昼、2-3~2-5 夜、2-6~2-10 浓雾夜。 time … |
| 常量 | `_ANCHORS` | L147–L533 | ---- 锚点关字面量（§3.2 层①）：waves/totalWaves/startSun/armTime/lawn 自旧表逐字平移；机制字段… |
| 常量 | `WAVE_TEMPLATES` | L534–L543 | 波数取锚点全长（不截取，保证 40 键波数曲线与锚点难度锚同构）；spawnMult/intervalMult 为 昼夜微调参数位（Q-6：夜 … |
| 函数 | `materializeLevels` | L544–L589 | 对无显式 waves 的键：world/time/name/lawn 按键位+昼夜结构推导，startSun/armTime 取所在世界 锚点默… |
| 常量 | `LEVELS` | L590–L590 | ★ const 引用稳定（harness __LEVELS 桥与大量既有用例依赖 const 语义，不得改 let/函数包裹） |
| 常量 | `LEVEL_INDEX` | L591–L591 | — |
| 函数 | `keyOrd` | L592–L594 | — |
| 函数 | `legacyKey` | L595–L599 | 数字键兼容 shim（§3.5）：n∈1..5 → '1-'+n，否则 null；严格上界 5（旧 ?level=6 被拒语义不许放宽）。 仅限… |
| 常量 | `ANCHOR_BUTTONS` | L600–L600 | 菜单 5 钮锚点布局（T-104b C-1）：固定五关键序，与 harness __ANCHOR 表同源同序（'1-1'/'1-2'/'1-6'… |
| 常量 | `level` | L601–L601 | — |
| 常量 | `levelKey` | L602–L604 | — |
| 常量 | `unlocked` | L605–L608 | 解锁进度持久化（Q-16 键名形态 · T-103）：运行期主变量=unlocked（最高解锁键）；存档走 v2 键（下方 boot 读档块）。… |
| 常量 | `diffProgress` | L609–L609 | v2.3 消缺：per-difficulty 关卡进度（普通/困难/地狱独立 saveCleared + unlocked） 声明须在 boot… |
| 函数 | `saveDiffProgress` | L610–L617 | — |
| 常量 | `testMode` | L618–L625 | 测试模式（2026-09-20 用户需求）：URL 带 ?test=1 开启——阳光锁 9999 无限种植物 + 卡池全开（CARDS 全部 1… |
| 常量 | `saveCleared` | L626–L677 | cleared=已通关键数组（集合语义，重复通关不重复 push）；unlocked=最高解锁键；cardSeen 本期占位空数组（预留无消费）… |
| 函数 | `storageGet` | L678–L680 | 存档读写统一入口（2026-09-16 · KNOWN-ISSUES #9）：隐私模式 / file:// 受限环境下静默降级，绝不抛错中断游戏 |
| 函数 | `storageSet` | L681–L685 | — |
| 常量 | `CARDS` | L686–L713 | 植物卡 |

### v1.4 元进度存档（T-02 · 积分/卡槽/卡池/卡组/通关计数） · L707–L789

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `points` | L714–L716 | 存量卡池推导仍走旧口径：poolFromProgress 按 unlocked 序位等价展开（T-105 切 cleared 集合 + 新表）。… |
| 常量 | `diffClears` | L717–L717 | v1.5 决议2：per-difficulty 通关记录（'难度:关号' → true）；无历史记录=存量玩家重通领取（patch note 披… |
| 函数 | `loadMeta` | L718–L770 | — |
| 函数 | `poolFromProgress` | L771–L783 | （'w-l' 真键直查）。旧数字序位展开退役。 旧档迁移等价性：N=2/3 与旧推导等价；N=5 已知差异——v2.0 序列重排（1-3 mel… |
| 函数 | `defaultDeck` | L784–L788 | — |
| 函数 | `inDeck` | L789–L795 | — |

### v1.4 结算（T-07 难度乘算 / T-08 通关奖励） · L790–L809

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `computeClearReward` | L796–L806 | 纯函数（无副作用，只读 saveCleared/settleRun 传入的通关前快照语义由调用点保证）； 本期世界 1 无法凑满 10 键（35… |
| 函数 | `settlePointsRaw` | L807–L817 | 局合计取整口径（T-07）：(击杀收集合计 + 通关奖励) × DIFFS[DIFF].mult → Math.round 一次。 不做 per… |

### v1.4 结算入口（T-06 · 胜利 sweep / 失败部分结算） · L810–L936

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `endStats` | L818–L818 | 「通关前快照」（saveCleared 入集之前），首通发、重通零发（幂等，无需新存档字段）； 与 worldClear 一并进 settleP… |
| 函数 | `settleRun` | L819–L839 | — |
| 函数 | `saveMeta` | L840–L863 | — |
| 常量 | `state` | L864–L865 | 状态 |
| 常量 | `highScore` | L866–L866 | — |
| 常量 | `plants` | L867–L869 | — |
| 函数 | `setState` | L870–L878 | 状态切换统一入口（带控制台留痕，方便排查“突然退出对局”这类偶现问题） |
| 函数 | `updateBest` | L879–L882 | 历史最高分落盘（仅当刷新纪录时写，减少 localStorage 写入，2026-09-16 #9） |
| 常量 | `toastMsg` | L883–L884 | 屏幕提示条（临时消息） |
| 常量 | `giftAnim` | L885–L885 | v2.3 消缺：通关奖励礼盒动画状态——end 态绘制前触发，礼盒打开→植物浮现 |
| 常量 | `GIFT_OPEN_TIME` | L886–L886 | — |
| 常量 | `GIFT_REVEAL_TIME` | L887–L887 | — |
| 函数 | `triggerGiftAnim` | L888–L890 | — |
| 函数 | `toast` | L891–L891 | — |
| 函数 | `drawToast` | L892–L909 | — |
| 常量 | `exitArm` | L910–L910 | 对局中返回菜单需要二次确认，避免误触/误按丢掉进度 |
| 函数 | `requestExit` | L911–L918 | — |
| 常量 | `R` | L919–L919 | 工具 |
| 常量 | `C` | L920–L922 | — |
| 函数 | `liftX` | L923–L926 | v1.3-M4 C2 屋顶抬升函数：返回该 x 处的抬升量（≥0 = 向上 = 屏幕 y 减小）。 ★ 单点 gate：!level.roof … |
| 函数 | `gridToPos` | L927–L930 | — |
| 函数 | `posToGrid` | L931–L934 | — |
| 函数 | `inGrid` | L935–L937 | — |

### 音效（WebAudio 实时合成，无外部文件） · L937–L1144

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `audioCtx` | L938–L938 | — |
| 常量 | `audioQueue` | L939–L939 | — |
| 函数 | `ac` | L940–L950 | — |
| 函数 | `scheduleOrDefer` | L951–L954 | 排程守卫：上下文未 running（suspended/interrupted）时，直接排程的事件可能被整段丢弃 （用户反馈 2026-09-1… |
| 函数 | `flushAudioQueue` | L955–L963 | — |
| 函数 | `primeAudio` | L964–L972 | 音频管线预热：上下文刚创建时音频线程尚未就绪，会话首个音效常被整段吞掉 （用户反馈 2026-09-16：开局种植物没声音，之后的音效正常）。 … |
| 函数 | `armAudioUnlock` | L973–L994 | 兜底：任意一次用户手势都尝试恢复音频上下文（部分浏览器创建后仍保持 suspended） |
| 常量 | `BGM` | L995–L1004 | + 低音层（sine 根音），C 大调五声，C-G-Am-F 和声进行。 音量按「经 env 总线 0.5 衰减后仍清晰可闻」标定（初版 0.0… |
| 函数 | `updateBGM` | L1005–L1014 | — |
| 函数 | `bgmTick` | L1015–L1046 | — |
| 常量 | `AudioBus` | L1047–L1053 | ---- 音频总线（ADR-004）：4 分组 GainNode + masterGain → destination ---- 分组默认音量：… |
| 常量 | `AUDIO_ROUTES` | L1054–L1059 | SFX 分组映射（tone/noise 默认走 event；战斗/UI 音效按需显式传分组）。 本表是「规格侧」的权威映射，运行时由各 SFX … |
| 函数 | `initAudioBus` | L1060–L1092 | — |
| 函数 | `tone` | L1093–L1097 | 单音：频率、时长、波形、音量、延迟、滑到目标频率 |
| 函数 | `scheduleTone` | L1098–L1111 | — |
| 函数 | `noise` | L1112–L1116 | 噪声：用于爆炸/挖掘/啃食。按 dur 就近取预生成 buffer 段（0.1/0.3/0.5s） |
| 函数 | `scheduleNoise` | L1117–L1139 | — |
| 函数 | `routeBus` | L1140–L1145 | 取输出总线：group 显式优先（SFX 调用点已标注所属分组）；缺省走 event。 总线未初始化（无头测试 / 降级）时直连 destina… |

### 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） · L1145–L1260

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `Easing` | L1146–L1159 | — |
| 常量 | `sfxGate` | L1160–L1160 | 节流：防止密集事件把音频糊成一团 |
| 函数 | `gate` | L1161–L1165 | — |
| 常量 | `SFX` | L1166–L1239 | — |
| 常量 | `SirenLoop` | L1240–L1261 | 采用「帧驱动」而非 setInterval： · 暂停时 update 不执行 → 警报天然同步暂停（§C.1 的暂停要求零额外代码） · 横幅… |

### 主循环 · L1261–L1307

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastT` | L1262–L1262 | — |
| 常量 | `lastDt` | L1263–L1263 | — |
| 常量 | `frameErr` | L1264–L1264 | — |
| 函数 | `loop` | L1265–L1296 | — |
| 函数 | `drawFrameErr` | L1297–L1308 | — |

### 输入 · L1308–L1358

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastMouseGrid` | L1309–L1322 | — |
| 函数 | `bindBtn` | L1323–L1328 | 按钮统一绑定：点完主动 blur，避免按钮保留焦点后被 Space/Enter 二次触发 |
| 函数 | `togglePause` | L1329–L1342 | 暂停切换统一入口：三处触发（按钮/空格/Esc）收敛到此，切换后同步 BGM 起停 （2026-09-20 用户反馈：暂停后 BGM 还在放——… |
| 函数 | `applyMuteUI` | L1343–L1367 | 静音按钮外观跟随 muted 状态（启动即按存档恢复，2026-09-16 #9） |

### 种植校验规则表（P1-A · code-review-todo 2026-09-20） · L1359–L1511

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `canPlant` | L1368–L1387 | ③垫/盆不算占用（垫上/盆上可连种）；同载体重叠（垫上铺垫/盆上放盆）与普通重复种植算占用。 ④水轴是单条强约束「水域关+水行」双条件放行（v1… |
| 函数 | `spawnPlant` | L1388–L1399 | 旧对象兜底（drawPlant L1748 区 plantT===undefined）保留不删——harness 注入的测试对象 仍是旧 sch… |
| 函数 | `onClick` | L1400–L1505 | — |
| 函数 | `onClickMenu` | L1506–L1512 | — |

### v1.4 卡槽解锁（T-11 · 验收变更 2026-09-21：面板/商城入口下线，buySlot 逻辑保留备解冻） · L1512–L1748

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `buySlot` | L1513–L1522 | — |
| 常量 | `DECK_GRID` | L1523–L1523 | v1.4 T-10 选卡界面（state='deck'，验收变更 2026-09-21：两排布局）： 上排 = 当前可选植物（ownedCard… |
| 常量 | `DECK_SLOTS` | L1524–L1524 | — |
| 函数 | `drawSelectDeck` | L1525–L1604 | — |
| 函数 | `onClickSelect` | L1605–L1647 | — |
| 函数 | `onClickDeck` | L1648–L1674 | — |
| 函数 | `onClickEnd` | L1675–L1693 | — |
| 函数 | `onKey` | L1694–L1749 | — |

### 游戏控制 · L1749–L1772

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `startGame` | L1750–L1774 | — |

### 波次 · L1773–L1850

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `spawnQueue` | L1775–L1775 | 波次生成：用队列逐个放出，不是一次性全刷 |
| 常量 | `spawnTimer` | L1776–L1776 | — |
| 常量 | `waveInterval` | L1777–L1777 | — |
| 常量 | `waveActive` | L1778–L1778 | — |
| 常量 | `waveDrainedT` | L1779–L1782 | — |
| 常量 | `spawnGateZ` | L1783–L1783 | v1.3-M4 FIX-01 v2（口径修订 2026-09-19 20:52）：教学关（'1-1'/'1-2'；T-104b 前为数字关号 1… |
| 常量 | `spawnGateT` | L1784–L1786 | — |
| 常量 | `warn` | L1787–L1788 | 大波预警：active=横幅显示中，t=剩余秒数，last=已预警过的波次号， pending=倒计时已结束但还在等场上清空（横幅此时已隐藏，只… |
| 函数 | `newWave` | L1789–L1825 | — |
| 函数 | `processSpawnQueue` | L1826–L1851 | 从队列中逐个放出僵尸 |

### 更新 · L1851–L1920

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `update` | L1852–L1930 | — |

### v1.6 第4刀：投掷类公用抛物解算器（D1） · L1921–L2377

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `fireArcProjectile` | L1931–L1953 | spec = {dmg, type, splash, splashRatio?, splashGrid?, chill?, butter?}：附… |
| 函数 | `updatePlant` | L1954–L2100 | — |
| 函数 | `explodeMine` | L2101–L2131 | ★ v2.1.1 消缺：原 `z.hp-=DMG(500); if(z.hp<=0)kill` 做耐久结算，导致铁桶(560)与高难度 （har… |
| 函数 | `explodePepper` | L2132–L2156 | v2.2 航椒爆炸：同排全清秒杀（无差别，不限数量/列） |
| 函数 | `explodeCherry` | L2157–L2183 | v2.2 樱桃爆炸：3×3 格跨行秒杀（本作首个跨行秒杀） |
| 函数 | `hasZombieAhead` | L2184–L2192 | — |
| 函数 | `updateProjectiles` | L2193–L2258 | — |
| 函数 | `applyChill` | L2259–L2266 | v1.5 S4 chill 施加单点入口：slowT 刷新续时（40%·2.0s 铁律锁定在调用侧系数与这里 2.0）。 不叠加语义：已减速只把… |
| 函数 | `applyFreeze` | L2267–L2271 | v1.7 corn 黄油定身单点入口：freezeT 置满 3.0s（v1.6 引入；完全定身，移动+啃食双停）。 与 chill（slowT·… |
| 函数 | `updateZombies` | L2272–L2337 | — |
| 函数 | `spawnCorpseParts` | L2338–L2364 | F-02 死亡零件（蓝图 §3）：死亡 = 血雾（保留）+ 零件爆散，§G 粒子上限双保险 |
| 函数 | `killZombie` | L2365–L2383 | — |

### v1.4 积分掉落物（T-04 · 独立数组，绕开 effects 500 守卫） · L2378–L2588

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `pointDrops` | L2384–L2384 | 2026-09-21 验收增强：死亡爆币特效（装饰层）——真币（pointDrops）数据契约不动， 视觉上「爆出一堆钱币 + 光」：真币堆叠成… |
| 函数 | `spawnPointDrop` | L2385–L2394 | — |
| 函数 | `updatePointDrops` | L2395–L2402 | — |
| 函数 | `drawPointDrops` | L2403–L2425 | — |
| 函数 | `drawCoin` | L2426–L2448 | 单枚钱币绘制（真币与装饰币共用）：椭圆币身+描边+高光+币面「¤」+可选自转翻转（squash） |
| 函数 | `hexA` | L2449–L2455 | #rrggbb → rgba(r,g,b,a)（特效层透明度用；阶色均为 6 位 hex 字面量） |
| 函数 | `spawnDeathCoinFx` | L2456–L2481 | 死亡爆币特效入口（killZombie 调用）：金光 + 装饰飞币（effects 层，吃 500 守卫优雅降级） 验收修正（2026-09-2… |
| 函数 | `spawnBurst` | L2482–L2487 | — |
| 函数 | `checkWave` | L2488–L2589 | — |

### 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） · L2589–L2618

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `screenShake` | L2590–L2590 | — |
| 常量 | `flashT` | L2591–L2591 | — |
| 常量 | `loseShakeUsed` | L2592–L2593 | — |
| 函数 | `triggerShake` | L2594–L2603 | — |
| 函数 | `triggerFlash` | L2604–L2607 | — |
| 函数 | `getShakeOffset` | L2608–L2619 | — |

### 渲染 · L2619–L3693

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `render` | L2620–L2646 | — |
| 常量 | `WARN_TOTAL` | L2647–L2647 | 「一大波僵尸即将来临」预警横幅 |
| 函数 | `drawWaveWarn` | L2648–L2713 | — |
| 函数 | `drawGameWorld` | L2714–L3039 | — |
| 函数 | `drawCorpsePart` | L3040–L3057 | F-02 死亡零件绘制（蓝图 §3）：head 带眼睛，其余为矩形；末 300ms 淡出 |
| 函数 | `drawShovelIcon` | L3058–L3082 | 铲子图标（供铲子槽 / 光标预览复用） |
| 常量 | `POT_LIFT` | L3083–L3083 | 花盆自身下沉 POT_SINK px 落到格底——错位后盆口沿/盆身/盆底全部可见，植物底缘正好立在盆口，还原"种在盆里"的层次。 几何：豌豆底… |
| 常量 | `onPot` | L3084–L3085 | — |
| 函数 | `drawPlant` | L3086–L3138 | — |
| 函数 | `drawPlantInner` | L3139–L3408 | 原 drawPlant 绘制主体（阴影/各类型/血条），签名改为 (p, x, y) 以支持种植动画缩放平移 |
| 函数 | `drawZombie` | L3409–L3483 | — |
| 函数 | `drawProjectile` | L3484–L3594 | — |
| 函数 | `drawSun` | L3595–L3618 | — |
| 函数 | `drawParticle` | L3619–L3628 | — |
| 函数 | `drawShockwave` | L3629–L3647 | F-03 冲击波环（蓝图 §4）：easeOutCubic 扩散 8→180px，alpha 0.9→0，线宽 3→1.5 e.water（v1… |
| 函数 | `drawBoom` | L3648–L3668 | F-03 火球扩为 450ms 三色段（蓝图 §4）：白心→橙→红橙→透明，前 30% 涨后回缩 |
| 函数 | `drawCoinFx` | L3669–L3675 | 死亡爆币·装饰飞币（2026-09-21 验收）：自转翻转 + 末 0.3s 淡出（alpha 须在绘制前设） |
| 函数 | `drawCoinFlash` | L3676–L3696 | 死亡爆币·爆点金光：径向渐变（白心→阶色→透明）炸开，easeOut 半径扩张 |

### D-11 圆角化（蓝图 §6） · L3694–L4347

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `RADIUS` | L3697–L3697 | 统一圆角矩形：现代浏览器 ctx.roundRect 原生支持，退化 arcTo 兼容旧内核。 rr 内不碰 alpha；调用方需半透明时自行 … |
| 函数 | `rr` | L3698–L3710 | — |
| 函数 | `drawCardBar` | L3711–L3764 | — |
| 函数 | `drawCardFace` | L3765–L3944 | — |
| 函数 | `drawStatus` | L3945–L3995 | — |
| 常量 | `selTab` | L3996–L3996 | ---- v2.0 M2 T-204：选关页（state='select'）---- 页签需运行态（当前页 + 每世界页签文案差异），非纯常量：… |
| 常量 | `SEL_TAB_TIME` | L3997–L3997 | — |
| 函数 | `drawSelect` | L3998–L4099 | — |
| 函数 | `drawMenu` | L4100–L4140 | — |
| 函数 | `drawPause` | L4141–L4153 | — |
| 函数 | `drawEnd` | L4154–L4347 | （T-10 实装见 DECK_GRID 区，L1023 起） |

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
