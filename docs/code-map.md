# 代码地图 · PvZ Lite

> **本文件由脚本生成，请勿手改**：`node tools/gen-code-map.mjs`
> 源文件：`plants-vs-zombies.html`（1959 行 · 68 个顶层函数 · 44 个顶层常量 · 11 个分区）
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
| 基础配置 | L35–L173 | 139 | 30 |
| 音效（WebAudio 实时合成，无外部文件） | L174–L380 | 207 | 18 |
| 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） | L381–L489 | 109 | 5 |
| 主循环 | L490–L530 | 41 | 5 |
| 输入 | L531–L735 | 205 | 7 |
| 游戏控制 | L736–L754 | 19 | 1 |
| 波次 | L755–L818 | 64 | 8 |
| 更新 | L819–L1118 | 300 | 10 |
| 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） | L1119–L1148 | 30 | 6 |
| 渲染 | L1149–L1636 | 488 | 14 |
| D-11 圆角化（蓝图 §6） | L1637–L1956 | 320 | 8 |

## 二、逐区明细

### 基础配置 · L35–L173

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `canvas` | L36–L36 | — |
| 常量 | `COLS` | L37–L37 | — |
| 常量 | `CARD_H` | L38–L38 | — |
| 常量 | `SHOVEL_X` | L39–L39 | — |
| 常量 | `CARD_X0` | L40–L41 | — |
| 常量 | `VERSION` | L42–L43 | 版本号（KNOWN-ISSUES #6）：源码内嵌版本标识，便于仅凭文件本身判定版本 |
| 常量 | `DIFFS` | L44–L48 | — |
| 常量 | `DIFF` | L49–L53 | — |
| 常量 | `LEVELS` | L54–L85 | 关卡配置 L1 参考原版 PvZ 1-1：只有普通僵尸 + 少量路障 L2 参考原版 1-2：解锁快速僵尸，波次更长 |
| 常量 | `level` | L86–L86 | — |
| 常量 | `levelNo` | L87–L88 | — |
| 常量 | `unlockedLevel` | L89–L102 | 解锁进度持久化（2026-09-16）：localStorage 记录，加 URL 参数 ?level=2 可跳过解锁直进第二关 |
| 函数 | `storageGet` | L103–L105 | 存档读写统一入口（2026-09-16 · KNOWN-ISSUES #9）：隐私模式 / file:// 受限环境下静默降级，绝不抛错中断游戏 |
| 函数 | `storageSet` | L106–L110 | — |
| 常量 | `CARDS` | L111–L120 | 植物卡 |
| 常量 | `state` | L121–L122 | 状态 |
| 常量 | `highScore` | L123–L123 | — |
| 常量 | `plants` | L124–L126 | — |
| 函数 | `setState` | L127–L134 | 状态切换统一入口（带控制台留痕，方便排查“突然退出对局”这类偶现问题） |
| 函数 | `updateBest` | L135–L138 | 历史最高分落盘（仅当刷新纪录时写，减少 localStorage 写入，2026-09-16 #9） |
| 常量 | `toastMsg` | L139–L139 | 屏幕提示条（临时消息） |
| 函数 | `toast` | L140–L140 | — |
| 函数 | `drawToast` | L141–L158 | — |
| 常量 | `exitArm` | L159–L159 | 对局中返回菜单需要二次确认，避免误触/误按丢掉进度 |
| 函数 | `requestExit` | L160–L167 | — |
| 常量 | `R` | L168–L168 | 工具 |
| 常量 | `C` | L169–L169 | — |
| 函数 | `gridToPos` | L170–L170 | — |
| 函数 | `posToGrid` | L171–L171 | — |
| 函数 | `inGrid` | L172–L174 | — |

### 音效（WebAudio 实时合成，无外部文件） · L174–L380

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `audioCtx` | L175–L175 | — |
| 常量 | `audioQueue` | L176–L176 | — |
| 函数 | `ac` | L177–L187 | — |
| 函数 | `scheduleOrDefer` | L188–L191 | 排程守卫：上下文未 running（suspended/interrupted）时，直接排程的事件可能被整段丢弃 （用户反馈 2026-09-1… |
| 函数 | `flushAudioQueue` | L192–L200 | — |
| 函数 | `primeAudio` | L201–L209 | 音频管线预热：上下文刚创建时音频线程尚未就绪，会话首个音效常被整段吞掉 （用户反馈 2026-09-16：开局种植物没声音，之后的音效正常）。 … |
| 函数 | `armAudioUnlock` | L210–L231 | 兜底：任意一次用户手势都尝试恢复音频上下文（部分浏览器创建后仍保持 suspended） |
| 常量 | `BGM` | L232–L241 | + 低音层（sine 根音），C 大调五声，C-G-Am-F 和声进行。 音量按「经 env 总线 0.5 衰减后仍清晰可闻」标定（初版 0.0… |
| 函数 | `updateBGM` | L242–L251 | — |
| 函数 | `bgmTick` | L252–L283 | — |
| 常量 | `AudioBus` | L284–L290 | ---- 音频总线（ADR-004）：4 分组 GainNode + masterGain → destination ---- 分组默认音量：… |
| 常量 | `AUDIO_ROUTES` | L291–L295 | SFX 分组映射（tone/noise 默认走 event；战斗/UI 音效按需显式传分组）。 本表是「规格侧」的权威映射，运行时由各 SFX … |
| 函数 | `initAudioBus` | L296–L328 | — |
| 函数 | `tone` | L329–L333 | 单音：频率、时长、波形、音量、延迟、滑到目标频率 |
| 函数 | `scheduleTone` | L334–L347 | — |
| 函数 | `noise` | L348–L352 | 噪声：用于爆炸/挖掘/啃食。按 dur 就近取预生成 buffer 段（0.1/0.3/0.5s） |
| 函数 | `scheduleNoise` | L353–L375 | — |
| 函数 | `routeBus` | L376–L381 | 取输出总线：group 显式优先（SFX 调用点已标注所属分组）；缺省走 event。 总线未初始化（无头测试 / 降级）时直连 destina… |

### 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） · L381–L489

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `Easing` | L382–L395 | — |
| 常量 | `sfxGate` | L396–L396 | 节流：防止密集事件把音频糊成一团 |
| 函数 | `gate` | L397–L401 | — |
| 常量 | `SFX` | L402–L468 | — |
| 常量 | `SirenLoop` | L469–L490 | 采用「帧驱动」而非 setInterval： · 暂停时 update 不执行 → 警报天然同步暂停（§C.1 的暂停要求零额外代码） · 横幅… |

### 主循环 · L490–L530

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastT` | L491–L491 | — |
| 常量 | `lastDt` | L492–L492 | — |
| 常量 | `frameErr` | L493–L493 | — |
| 函数 | `loop` | L494–L519 | — |
| 函数 | `drawFrameErr` | L520–L531 | — |

### 输入 · L531–L735

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastMouseGrid` | L532–L545 | — |
| 函数 | `bindBtn` | L546–L558 | 按钮统一绑定：点完主动 blur，避免按钮保留焦点后被 Space/Enter 二次触发 |
| 函数 | `applyMuteUI` | L559–L574 | 静音按钮外观跟随 muted 状态（启动即按存档恢复，2026-09-16 #9） |
| 函数 | `onClick` | L575–L651 | — |
| 函数 | `onClickMenu` | L652–L669 | — |
| 函数 | `onClickEnd` | L670–L682 | — |
| 函数 | `onKey` | L683–L736 | — |

### 游戏控制 · L736–L754

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `startGame` | L737–L756 | — |

### 波次 · L755–L818

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `spawnQueue` | L757–L757 | 波次生成：用队列逐个放出，不是一次性全刷 |
| 常量 | `spawnTimer` | L758–L758 | — |
| 常量 | `waveInterval` | L759–L759 | — |
| 常量 | `waveActive` | L760–L760 | — |
| 常量 | `waveDrainedT` | L761–L763 | — |
| 常量 | `warn` | L764–L765 | 大波预警：active=横幅显示中，t=剩余秒数，last=已预警过的波次号， pending=倒计时已结束但还在等场上清空（横幅此时已隐藏，只… |
| 函数 | `newWave` | L766–L802 | — |
| 函数 | `processSpawnQueue` | L803–L819 | 从队列中逐个放出僵尸 |

### 更新 · L819–L1118

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `update` | L820–L871 | — |
| 函数 | `updatePlant` | L872–L914 | — |
| 函数 | `explodeMine` | L915–L946 | dy 门槛 CELL_H*0.9=93.6 < 行高 CELL_H=104，相邻行恒不满足；同排时其 dx 门槛 CELL_W*0.5=45 又… |
| 函数 | `hasZombieAhead` | L947–L955 | — |
| 函数 | `updateProjectiles` | L956–L983 | — |
| 函数 | `updateZombies` | L984–L1016 | — |
| 函数 | `spawnCorpseParts` | L1017–L1043 | F-02 死亡零件（蓝图 §3）：死亡 = 血雾（保留）+ 零件爆散，§G 粒子上限双保险 |
| 函数 | `killZombie` | L1044–L1052 | — |
| 函数 | `spawnBurst` | L1053–L1058 | — |
| 函数 | `checkWave` | L1059–L1119 | — |

### 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） · L1119–L1148

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `screenShake` | L1120–L1120 | — |
| 常量 | `flashT` | L1121–L1121 | — |
| 常量 | `loseShakeUsed` | L1122–L1123 | — |
| 函数 | `triggerShake` | L1124–L1133 | — |
| 函数 | `triggerFlash` | L1134–L1137 | — |
| 函数 | `getShakeOffset` | L1138–L1149 | — |

### 渲染 · L1149–L1636

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `render` | L1150–L1173 | — |
| 常量 | `WARN_TOTAL` | L1174–L1174 | 「一大波僵尸即将来临」预警横幅 |
| 函数 | `drawWaveWarn` | L1175–L1240 | — |
| 函数 | `drawGameWorld` | L1241–L1307 | — |
| 函数 | `drawCorpsePart` | L1308–L1325 | F-02 死亡零件绘制（蓝图 §3）：head 带眼睛，其余为矩形；末 300ms 淡出 |
| 函数 | `drawShovelIcon` | L1326–L1346 | 铲子图标（供铲子槽 / 光标预览复用） |
| 函数 | `drawPlant` | L1347–L1386 | — |
| 函数 | `drawPlantInner` | L1387–L1501 | 原 drawPlant 绘制主体（阴影/各类型/血条），签名改为 (p, x, y) 以支持种植动画缩放平移 |
| 函数 | `drawZombie` | L1502–L1548 | — |
| 函数 | `drawProjectile` | L1549–L1573 | — |
| 函数 | `drawSun` | L1574–L1597 | — |
| 函数 | `drawParticle` | L1598–L1606 | — |
| 函数 | `drawShockwave` | L1607–L1620 | F-03 冲击波环（蓝图 §4）：easeOutCubic 扩散 8→180px，alpha 0.9→0，线宽 3→1.5 |
| 函数 | `drawBoom` | L1621–L1639 | F-03 火球扩为 450ms 三色段（蓝图 §4）：白心→橙→红橙→透明，前 30% 涨后回缩 |

### D-11 圆角化（蓝图 §6） · L1637–L1956

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `RADIUS` | L1640–L1640 | 统一圆角矩形：现代浏览器 ctx.roundRect 原生支持，退化 arcTo 兼容旧内核。 rr 内不碰 alpha；调用方需半透明时自行 … |
| 函数 | `rr` | L1641–L1653 | — |
| 函数 | `drawCardBar` | L1654–L1703 | — |
| 函数 | `drawCardFace` | L1704–L1756 | — |
| 函数 | `drawStatus` | L1757–L1795 | — |
| 函数 | `drawMenu` | L1796–L1873 | — |
| 函数 | `drawPause` | L1874–L1884 | — |
| 函数 | `drawEnd` | L1885–L1956 | — |

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
