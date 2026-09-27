# 代码地图 · PvZ Lite

> **本文件由脚本生成，请勿手改**：`node tools/gen-code-map.mjs`
> 源文件：`plants-vs-zombies.html`（4784 行 · 107 个顶层函数 · 90 个顶层常量 · 22 个分区）
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
| v2.3 夜行蘑菇（nocturnal · GDD v23 §2/§3） | L72–L115 | 44 | 13 |
| v1.4 配置表（T-01 · v1.4-impl-plan §1） | L116–L178 | 63 | 4 |
| v2.0 关卡数据层（T-102 · production/v2.0-plan.md §3.1-3.3） | L179–L764 | 586 | 19 |
| v1.4 元进度存档（T-02 · 积分/卡槽/卡池/卡组/通关计数） | L765–L847 | 83 | 6 |
| v1.4 结算（T-07 难度乘算 / T-08 通关奖励） | L848–L867 | 20 | 2 |
| v1.4 结算入口（T-06 · 胜利 sweep / 失败部分结算） | L868–L992 | 125 | 21 |
| 音效（WebAudio 实时合成，无外部文件） | L993–L1201 | 209 | 18 |
| 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） | L1202–L1323 | 122 | 5 |
| 主循环 | L1324–L1375 | 52 | 5 |
| 输入 | L1376–L1426 | 51 | 4 |
| 种植校验规则表（P1-A · code-review-todo 2026-09-20） | L1427–L1592 | 166 | 4 |
| v2.2.6 存档导出/导入（背景：预览源随端口漂移 → localStorage 按 origin 隔离 → 进度"被清"） | L1593–L1641 | 49 | 2 |
| v1.4 卡槽解锁（T-11 · 验收变更 2026-09-21：面板/商城入口下线，buySlot 逻辑保留备解冻） | L1642–L1878 | 237 | 8 |
| 游戏控制 | L1879–L1902 | 24 | 1 |
| 波次 | L1903–L1980 | 78 | 10 |
| 更新 | L1981–L2050 | 70 | 1 |
| v1.6 第4刀：投掷类公用抛物解算器（D1） | L2051–L2639 | 589 | 13 |
| v1.4 积分掉落物（T-04 · 独立数组，绕开 effects 500 守卫） | L2640–L2854 | 215 | 9 |
| 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） | L2855–L2884 | 30 | 6 |
| 渲染 | L2885–L4142 | 1258 | 18 |
| D-11 圆角化（蓝图 §6） | L4143–L4781 | 639 | 11 |

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

### v2.3 夜行蘑菇（nocturnal · GDD v23 §2/§3） · L72–L115

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `NOCTURNAL_TYPES` | L76–L76 | 夜行机制（§2.1）：蘑菇类植物白天（level.time==='day'）**沉睡**（不产出/不攻击/不触发）， 夜晚（'night'）与浓… |
| 函数 | `isNocturnal` | L77–L80 | — |
| 常量 | `SUNSHROOM_FIRST` | L81–L82 | 阳光菇（sunshroom）参数（§3.1）：cost 25 / 种植 cd 7.5s / dur 300； 夜晚首产 6s、之后每 24s（与… |
| 常量 | `SUNSHROOM_GEOM` | L83–L86 | 阳光菇绘制几何（世界版 drawPlantInner + 卡面版 drawCardFace 共用，禁止两处硬编码）：幼体/成体菇盖半径 |
| 常量 | `PUFFSHROOM_DMG` | L87–L88 | 小喷菇（puffshroom）参数（§3.2）：cost 0 / 种植 cd 7.5s / dur 300；单发 20 / 间隔 1.4s / … |
| 常量 | `PUFFSHROOM_GEOM` | L89–L94 | 小喷菇绘制几何（世界版 drawPlantInner + 卡面版 drawCardFace 共用，禁止两处硬编码）：菇盖半径 |
| 常量 | `FUMESHROOM_DMG` | L95–L97 | 弹体**穿透**（type:'fume'，pierce:true）：命中后不消失，对本行射程内每个僵尸各结算一次 20； 去重状态挂弹体侧（pr… |
| 常量 | `FUMESHROOM_GEOM` | L98–L99 | 大喷菇绘制几何（世界版 drawPlantInner + 卡面版 drawCardFace 共用，禁两处硬编码）： capR=菇盖半径（成体尺感… |
| 常量 | `NOCTURNAL_BADGE` | L100–L109 | 卡面「☾ 夜行」角标几何（drawCardBar 绘制；沿 END_BTN/MENU_BTN 惯例抽常量，封死硬编码漂移） |
| 常量 | `HYPNOSHROOM_IMMUNE` | L110–L110 | ★ 魅惑状态机（§4）：被魅惑僵尸向右行走、不再啃植物，改与敌方僵尸互啃；可被敌方反杀。 互啃伤害速率：取「僵尸啃植物 65/s」**同口径**… |
| 常量 | `HYPNOSHROOM_BITE_DPS` | L111–L111 | — |
| 常量 | `HYPNOSHROOM_ENGAGE` | L112–L113 | — |
| 常量 | `HYPNOSHROOM_GEOM` | L114–L118 | 魅惑菇绘制几何（世界版 drawPlantInner + 卡面版 drawCardFace 共用，禁两处硬编码）：菇盖半径 + 催眠螺旋半径 |

### v1.4 配置表（T-01 · v1.4-impl-plan §1） · L116–L178

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `POINT_CONFIG` | L119–L144 | 硬编码禁令落点：阶位/怪→阶/槽价/发卡序列/通关奖励规则全部数据注册式收拢在此。 未来新增地图或积分获取渠道 → 只往表里加数据，逻辑零改动（… |
| 常量 | `SLOT_CONFIG` | L145–L171 | — |
| 常量 | `DIFFS` | L172–L176 | — |
| 常量 | `DIFF` | L177–L186 | — |

### v2.0 关卡数据层（T-102 · production/v2.0-plan.md §3.1-3.3） · L179–L764

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `WORLD_THEMES` | L187–L199 | 昼夜结构（Q-6a）：草/墓/房=前 5 昼后 5 夜；泳池三段=2-1~2-2 昼、2-3~2-5 夜、2-6~2-10 浓雾夜。 time … |
| 常量 | `_ANCHORS` | L200–L586 | ---- 锚点关字面量（§3.2 层①）：waves/totalWaves/startSun/armTime/lawn 自旧表逐字平移；机制字段… |
| 常量 | `WAVE_TEMPLATES` | L587–L596 | 波数取锚点全长（不截取，保证 40 键波数曲线与锚点难度锚同构）；spawnMult/intervalMult 为 昼夜微调参数位（Q-6：夜 … |
| 函数 | `materializeLevels` | L597–L642 | 对无显式 waves 的键：world/time/name/lawn 按键位+昼夜结构推导，startSun/armTime 取所在世界 锚点默… |
| 常量 | `LEVELS` | L643–L643 | ★ const 引用稳定（harness __LEVELS 桥与大量既有用例依赖 const 语义，不得改 let/函数包裹） |
| 常量 | `LEVEL_INDEX` | L644–L644 | — |
| 函数 | `keyOrd` | L645–L647 | — |
| 函数 | `legacyKey` | L648–L652 | 数字键兼容 shim（§3.5）：n∈1..5 → '1-'+n，否则 null；严格上界 5（旧 ?level=6 被拒语义不许放宽）。 仅限… |
| 常量 | `ANCHOR_BUTTONS` | L653–L653 | 菜单 5 钮锚点布局（T-104b C-1）：固定五关键序，与 harness __ANCHOR 表同源同序（'1-1'/'1-2'/'1-6'… |
| 常量 | `level` | L654–L654 | — |
| 常量 | `levelKey` | L655–L657 | — |
| 常量 | `unlocked` | L658–L661 | 解锁进度持久化（Q-16 键名形态 · T-103）：运行期主变量=unlocked（最高解锁键）；存档走 v2 键（下方 boot 读档块）。… |
| 常量 | `diffProgress` | L662–L662 | v2.3 消缺：per-difficulty 关卡进度（普通/困难/地狱独立 saveCleared + unlocked） 声明须在 boot… |
| 函数 | `saveDiffProgress` | L663–L670 | — |
| 常量 | `testMode` | L671–L678 | 测试模式（2026-09-20 用户需求）：URL 带 ?test=1 开启——阳光锁 9999 无限种植物 + 卡池全开（CARDS 全部 1… |
| 常量 | `saveCleared` | L679–L730 | cleared=已通关键数组（集合语义，重复通关不重复 push）；unlocked=最高解锁键；cardSeen 本期占位空数组（预留无消费）… |
| 函数 | `storageGet` | L731–L733 | 存档读写统一入口（2026-09-16 · KNOWN-ISSUES #9）：隐私模式 / file:// 受限环境下静默降级，绝不抛错中断游戏 |
| 函数 | `storageSet` | L734–L738 | — |
| 常量 | `CARDS` | L739–L771 | 植物卡 |

### v1.4 元进度存档（T-02 · 积分/卡槽/卡池/卡组/通关计数） · L765–L847

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `points` | L772–L774 | 存量卡池推导仍走旧口径：poolFromProgress 按 unlocked 序位等价展开（T-105 切 cleared 集合 + 新表）。… |
| 常量 | `diffClears` | L775–L775 | v1.5 决议2：per-difficulty 通关记录（'难度:关号' → true）；无历史记录=存量玩家重通领取（patch note 披… |
| 函数 | `loadMeta` | L776–L828 | — |
| 函数 | `poolFromProgress` | L829–L841 | （'w-l' 真键直查）。旧数字序位展开退役。 旧档迁移等价性：N=2/3 与旧推导等价；N=5 已知差异——v2.0 序列重排（1-3 mel… |
| 函数 | `defaultDeck` | L842–L846 | — |
| 函数 | `inDeck` | L847–L853 | — |

### v1.4 结算（T-07 难度乘算 / T-08 通关奖励） · L848–L867

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `computeClearReward` | L854–L864 | 纯函数（无副作用，只读 saveCleared/settleRun 传入的通关前快照语义由调用点保证）； 本期世界 1 无法凑满 10 键（35… |
| 函数 | `settlePointsRaw` | L865–L875 | 局合计取整口径（T-07）：(击杀收集合计 + 通关奖励) × DIFFS[DIFF].mult → Math.round 一次。 不做 per… |

### v1.4 结算入口（T-06 · 胜利 sweep / 失败部分结算） · L868–L992

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `endStats` | L876–L876 | 「通关前快照」（saveCleared 入集之前），首通发、重通零发（幂等，无需新存档字段）； 与 worldClear 一并进 settleP… |
| 函数 | `settleRun` | L877–L897 | — |
| 函数 | `saveMeta` | L898–L921 | — |
| 常量 | `state` | L922–L923 | 状态 |
| 常量 | `highScore` | L924–L924 | — |
| 常量 | `plants` | L925–L927 | — |
| 函数 | `setState` | L928–L936 | 状态切换统一入口（带控制台留痕，方便排查“突然退出对局”这类偶现问题） |
| 函数 | `updateBest` | L937–L940 | 历史最高分落盘（仅当刷新纪录时写，减少 localStorage 写入，2026-09-16 #9） |
| 常量 | `toastMsg` | L941–L942 | 屏幕提示条（临时消息） |
| 常量 | `giftAnim` | L943–L943 | v2.2.4 通关奖励植物淡入状态——end 态绘制前触发，奖励植物淡入展示（约 1s 淡入到 alpha 0.85） |
| 函数 | `triggerGiftAnim` | L944–L946 | — |
| 函数 | `toast` | L947–L947 | — |
| 函数 | `drawToast` | L948–L965 | — |
| 常量 | `exitArm` | L966–L966 | 对局中返回菜单需要二次确认，避免误触/误按丢掉进度 |
| 函数 | `requestExit` | L967–L974 | — |
| 常量 | `R` | L975–L975 | 工具 |
| 常量 | `C` | L976–L978 | — |
| 函数 | `liftX` | L979–L982 | v1.3-M4 C2 屋顶抬升函数：返回该 x 处的抬升量（≥0 = 向上 = 屏幕 y 减小）。 ★ 单点 gate：!level.roof … |
| 函数 | `gridToPos` | L983–L986 | — |
| 函数 | `posToGrid` | L987–L990 | — |
| 函数 | `inGrid` | L991–L993 | — |

### 音效（WebAudio 实时合成，无外部文件） · L993–L1201

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `audioCtx` | L994–L994 | — |
| 常量 | `audioQueue` | L995–L995 | — |
| 函数 | `ac` | L996–L1006 | — |
| 函数 | `scheduleOrDefer` | L1007–L1010 | 排程守卫：上下文未 running（suspended/interrupted）时，直接排程的事件可能被整段丢弃 （用户反馈 2026-09-1… |
| 函数 | `flushAudioQueue` | L1011–L1019 | — |
| 函数 | `primeAudio` | L1020–L1028 | 音频管线预热：上下文刚创建时音频线程尚未就绪，会话首个音效常被整段吞掉 （用户反馈 2026-09-16：开局种植物没声音，之后的音效正常）。 … |
| 函数 | `armAudioUnlock` | L1029–L1050 | 兜底：任意一次用户手势都尝试恢复音频上下文（部分浏览器创建后仍保持 suspended） |
| 常量 | `BGM` | L1051–L1060 | + 低音层（sine 根音），C 大调五声，C-G-Am-F 和声进行。 音量按「经 env 总线 0.5 衰减后仍清晰可闻」标定（初版 0.0… |
| 函数 | `updateBGM` | L1061–L1070 | — |
| 函数 | `bgmTick` | L1071–L1102 | — |
| 常量 | `AudioBus` | L1103–L1109 | ---- 音频总线（ADR-004）：4 分组 GainNode + masterGain → destination ---- 分组默认音量：… |
| 常量 | `AUDIO_ROUTES` | L1110–L1116 | SFX 分组映射（tone/noise 默认走 event；战斗/UI 音效按需显式传分组）。 本表是「规格侧」的权威映射，运行时由各 SFX … |
| 函数 | `initAudioBus` | L1117–L1149 | — |
| 函数 | `tone` | L1150–L1154 | 单音：频率、时长、波形、音量、延迟、滑到目标频率 |
| 函数 | `scheduleTone` | L1155–L1168 | — |
| 函数 | `noise` | L1169–L1173 | 噪声：用于爆炸/挖掘/啃食。按 dur 就近取预生成 buffer 段（0.1/0.3/0.5s） |
| 函数 | `scheduleNoise` | L1174–L1196 | — |
| 函数 | `routeBus` | L1197–L1202 | 取输出总线：group 显式优先（SFX 调用点已标注所属分组）；缺省走 event。 总线未初始化（无头测试 / 降级）时直连 destina… |

### 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） · L1202–L1323

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `Easing` | L1203–L1218 | — |
| 常量 | `sfxGate` | L1219–L1219 | 节流：防止密集事件把音频糊成一团 |
| 函数 | `gate` | L1220–L1224 | — |
| 常量 | `SFX` | L1225–L1302 | — |
| 常量 | `SirenLoop` | L1303–L1324 | 采用「帧驱动」而非 setInterval： · 暂停时 update 不执行 → 警报天然同步暂停（§C.1 的暂停要求零额外代码） · 横幅… |

### 主循环 · L1324–L1375

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastT` | L1325–L1325 | — |
| 常量 | `lastDt` | L1326–L1326 | — |
| 常量 | `frameErr` | L1327–L1327 | — |
| 函数 | `loop` | L1328–L1364 | — |
| 函数 | `drawFrameErr` | L1365–L1376 | — |

### 输入 · L1376–L1426

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastMouseGrid` | L1377–L1390 | — |
| 函数 | `bindBtn` | L1391–L1396 | 按钮统一绑定：点完主动 blur，避免按钮保留焦点后被 Space/Enter 二次触发 |
| 函数 | `togglePause` | L1397–L1410 | 暂停切换统一入口：三处触发（按钮/空格/Esc）收敛到此，切换后同步 BGM 起停 （2026-09-20 用户反馈：暂停后 BGM 还在放——… |
| 函数 | `applyMuteUI` | L1411–L1435 | 静音按钮外观跟随 muted 状态（启动即按存档恢复，2026-09-16 #9） |

### 种植校验规则表（P1-A · code-review-todo 2026-09-20） · L1427–L1592

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `canPlant` | L1436–L1455 | ③垫/盆不算占用（垫上/盆上可连种）；同载体重叠（垫上铺垫/盆上放盆）与普通重复种植算占用。 ④水轴是单条强约束「水域关+水行」双条件放行（v1… |
| 函数 | `spawnPlant` | L1456–L1473 | 旧对象兜底（drawPlant L1748 区 plantT===undefined）保留不删——harness 注入的测试对象 仍是旧 sch… |
| 函数 | `onClick` | L1474–L1579 | — |
| 函数 | `onClickMenu` | L1580–L1595 | — |

### v2.2.6 存档导出/导入（背景：预览源随端口漂移 → localStorage 按 origin 隔离 → 进度"被清"） · L1593–L1641

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `exportSave` | L1596–L1615 | 导出：收集全部 pvz_* 键为一份 JSON 文本复制到剪贴板（clipboard 受限时降级 prompt 手选复制）。 导入：粘贴 JSO… |
| 函数 | `importSave` | L1616–L1642 | — |

### v1.4 卡槽解锁（T-11 · 验收变更 2026-09-21：面板/商城入口下线，buySlot 逻辑保留备解冻） · L1642–L1878

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `buySlot` | L1643–L1652 | — |
| 常量 | `DECK_GRID` | L1653–L1653 | v1.4 T-10 选卡界面（state='deck'，验收变更 2026-09-21：两排布局）： 上排 = 当前可选植物（ownedCard… |
| 常量 | `DECK_SLOTS` | L1654–L1654 | — |
| 函数 | `drawSelectDeck` | L1655–L1734 | — |
| 函数 | `onClickSelect` | L1735–L1777 | — |
| 函数 | `onClickDeck` | L1778–L1804 | — |
| 函数 | `onClickEnd` | L1805–L1823 | — |
| 函数 | `onKey` | L1824–L1879 | — |

### 游戏控制 · L1879–L1902

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `startGame` | L1880–L1904 | — |

### 波次 · L1903–L1980

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `spawnQueue` | L1905–L1905 | 波次生成：用队列逐个放出，不是一次性全刷 |
| 常量 | `spawnTimer` | L1906–L1906 | — |
| 常量 | `waveInterval` | L1907–L1907 | — |
| 常量 | `waveActive` | L1908–L1908 | — |
| 常量 | `waveDrainedT` | L1909–L1912 | — |
| 常量 | `spawnGateZ` | L1913–L1913 | v1.3-M4 FIX-01 v2（口径修订 2026-09-19 20:52）：教学关（'1-1'/'1-2'；T-104b 前为数字关号 1… |
| 常量 | `spawnGateT` | L1914–L1916 | — |
| 常量 | `warn` | L1917–L1918 | 大波预警：active=横幅显示中，t=剩余秒数，last=已预警过的波次号， pending=倒计时已结束但还在等场上清空（横幅此时已隐藏，只… |
| 函数 | `newWave` | L1919–L1955 | — |
| 函数 | `processSpawnQueue` | L1956–L1981 | 从队列中逐个放出僵尸 |

### 更新 · L1981–L2050

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `update` | L1982–L2060 | — |

### v1.6 第4刀：投掷类公用抛物解算器（D1） · L2051–L2639

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `fireArcProjectile` | L2061–L2083 | spec = {dmg, type, splash, splashRatio?, splashGrid?, chill?, butter?}：附… |
| 函数 | `updatePlant` | L2084–L2278 | — |
| 函数 | `explodeMine` | L2279–L2309 | ★ v2.1.1 消缺：原 `z.hp-=DMG(500); if(z.hp<=0)kill` 做耐久结算，导致铁桶(560)与高难度 （har… |
| 函数 | `explodePepper` | L2310–L2334 | v2.2 航椒爆炸：同排全清秒杀（无差别，不限数量/列） |
| 函数 | `explodeCherry` | L2335–L2361 | v2.2 樱桃爆炸：3×3 格跨行秒杀（本作首个跨行秒杀） |
| 函数 | `hasZombieAhead` | L2362–L2372 | — |
| 函数 | `hasZombieInRange` | L2373–L2381 | v2.3 小喷菇射程判定（§3.2）：本行僵尸进入 cells 格内（含边界）才返回真。 口径基准 = 植物格心 pos.x（同 hasZomb… |
| 函数 | `updateProjectiles` | L2382–L2463 | — |
| 函数 | `applyChill` | L2464–L2471 | v1.5 S4 chill 施加单点入口：slowT 刷新续时（40%·2.0s 铁律锁定在调用侧系数与这里 2.0）。 不叠加语义：已减速只把… |
| 函数 | `applyFreeze` | L2472–L2476 | v1.7 corn 黄油定身单点入口：freezeT 置满 3.0s（v1.6 引入；完全定身，移动+啃食双停）。 与 chill（slowT·… |
| 函数 | `updateZombies` | L2477–L2596 | — |
| 函数 | `spawnCorpseParts` | L2597–L2623 | F-02 死亡零件（蓝图 §3）：死亡 = 血雾（保留）+ 零件爆散，§G 粒子上限双保险 |
| 函数 | `killZombie` | L2624–L2645 | — |

### v1.4 积分掉落物（T-04 · 独立数组，绕开 effects 500 守卫） · L2640–L2854

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `pointDrops` | L2646–L2646 | 2026-09-21 验收增强：死亡爆币特效（装饰层）——真币（pointDrops）数据契约不动， 视觉上「爆出一堆钱币 + 光」：真币堆叠成… |
| 函数 | `spawnPointDrop` | L2647–L2656 | — |
| 函数 | `updatePointDrops` | L2657–L2664 | — |
| 函数 | `drawPointDrops` | L2665–L2687 | — |
| 函数 | `drawCoin` | L2688–L2710 | 单枚钱币绘制（真币与装饰币共用）：椭圆币身+描边+高光+币面「¤」+可选自转翻转（squash） |
| 函数 | `hexA` | L2711–L2717 | #rrggbb → rgba(r,g,b,a)（特效层透明度用；阶色均为 6 位 hex 字面量） |
| 函数 | `spawnDeathCoinFx` | L2718–L2743 | 死亡爆币特效入口（killZombie 调用）：金光 + 装饰飞币（effects 层，吃 500 守卫优雅降级） 验收修正（2026-09-2… |
| 函数 | `spawnBurst` | L2744–L2749 | — |
| 函数 | `checkWave` | L2750–L2855 | — |

### 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） · L2855–L2884

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `screenShake` | L2856–L2856 | — |
| 常量 | `flashT` | L2857–L2857 | — |
| 常量 | `loseShakeUsed` | L2858–L2859 | — |
| 函数 | `triggerShake` | L2860–L2869 | — |
| 函数 | `triggerFlash` | L2870–L2873 | — |
| 函数 | `getShakeOffset` | L2874–L2885 | — |

### 渲染 · L2885–L4142

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `render` | L2886–L2912 | — |
| 常量 | `WARN_TOTAL` | L2913–L2913 | 「一大波僵尸即将来临」预警横幅 |
| 函数 | `drawWaveWarn` | L2914–L2979 | — |
| 函数 | `drawGameWorld` | L2980–L3305 | — |
| 函数 | `drawCorpsePart` | L3306–L3323 | F-02 死亡零件绘制（蓝图 §3）：head 带眼睛，其余为矩形；末 300ms 淡出 |
| 函数 | `drawShovelIcon` | L3324–L3348 | 铲子图标（供铲子槽 / 光标预览复用） |
| 常量 | `POT_LIFT` | L3349–L3349 | 花盆自身下沉 POT_SINK px 落到格底——错位后盆口沿/盆身/盆底全部可见，植物底缘正好立在盆口，还原"种在盆里"的层次。 几何：豌豆底… |
| 常量 | `onPot` | L3350–L3351 | — |
| 函数 | `drawPlant` | L3352–L3404 | — |
| 函数 | `drawPlantInner` | L3405–L3828 | 原 drawPlant 绘制主体（阴影/各类型/血条），签名改为 (p, x, y) 以支持种植动画缩放平移 |
| 函数 | `drawZombie` | L3829–L3912 | — |
| 函数 | `drawProjectile` | L3913–L4043 | — |
| 函数 | `drawSun` | L4044–L4067 | — |
| 函数 | `drawParticle` | L4068–L4077 | — |
| 函数 | `drawShockwave` | L4078–L4096 | F-03 冲击波环（蓝图 §4）：easeOutCubic 扩散 8→180px，alpha 0.9→0，线宽 3→1.5 e.water（v1… |
| 函数 | `drawBoom` | L4097–L4117 | F-03 火球扩为 450ms 三色段（蓝图 §4）：白心→橙→红橙→透明，前 30% 涨后回缩 |
| 函数 | `drawCoinFx` | L4118–L4124 | 死亡爆币·装饰飞币（2026-09-21 验收）：自转翻转 + 末 0.3s 淡出（alpha 须在绘制前设） |
| 函数 | `drawCoinFlash` | L4125–L4145 | 死亡爆币·爆点金光：径向渐变（白心→阶色→透明）炸开，easeOut 半径扩张 |

### D-11 圆角化（蓝图 §6） · L4143–L4781

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `RADIUS` | L4146–L4146 | 统一圆角矩形：现代浏览器 ctx.roundRect 原生支持，退化 arcTo 兼容旧内核。 rr 内不碰 alpha；调用方需半透明时自行 … |
| 函数 | `rr` | L4147–L4159 | — |
| 函数 | `drawCardBar` | L4160–L4226 | — |
| 函数 | `drawCardFace` | L4227–L4466 | — |
| 函数 | `drawStatus` | L4467–L4517 | — |
| 常量 | `selTab` | L4518–L4518 | ---- v2.0 M2 T-204：选关页（state='select'）---- 页签需运行态（当前页 + 每世界页签文案差异），非纯常量：… |
| 常量 | `SEL_TAB_TIME` | L4519–L4519 | — |
| 函数 | `drawSelect` | L4520–L4621 | — |
| 函数 | `drawMenu` | L4622–L4674 | — |
| 函数 | `drawPause` | L4675–L4687 | — |
| 函数 | `drawEnd` | L4688–L4781 | （T-10 实装见 DECK_GRID 区，L1023 起） |

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
