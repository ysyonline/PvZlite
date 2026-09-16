# 代码地图 · PvZ Lite

> **本文件由脚本生成，请勿手改**：`node tools/gen-code-map.mjs`
> 源文件：`plants-vs-zombies.html`（1716 行 · 56 个顶层函数 · 39 个顶层常量 · 11 个分区）
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
| 基础配置 | L35–L156 | 122 | 25 |
| 音效（WebAudio 实时合成，无外部文件） | L157–L246 | 90 | 8 |
| 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） | L247–L301 | 55 | 4 |
| 主循环 | L302–L339 | 38 | 5 |
| 输入 | L340–L529 | 190 | 6 |
| 游戏控制 | L530–L545 | 16 | 1 |
| 波次 | L546–L608 | 63 | 8 |
| 更新 | L609–L892 | 284 | 10 |
| 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） | L893–L922 | 30 | 6 |
| 渲染 | L923–L1410 | 488 | 14 |
| D-11 圆角化（蓝图 §6） | L1411–L1712 | 302 | 8 |

## 二、逐区明细

### 基础配置 · L35–L156

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `canvas` | L36–L36 | — |
| 常量 | `COLS` | L37–L37 | — |
| 常量 | `CARD_H` | L38–L38 | — |
| 常量 | `SHOVEL_X` | L39–L39 | — |
| 常量 | `CARD_X0` | L40–L41 | — |
| 常量 | `DIFFS` | L42–L46 | — |
| 常量 | `DIFF` | L47–L51 | — |
| 常量 | `LEVELS` | L52–L83 | 关卡配置 L1 参考原版 PvZ 1-1：只有普通僵尸 + 少量路障 L2 参考原版 1-2：解锁快速僵尸，波次更长 |
| 常量 | `level` | L84–L84 | — |
| 常量 | `levelNo` | L85–L86 | — |
| 常量 | `unlockedLevel` | L87–L100 | 解锁进度持久化（2026-09-16）：localStorage 记录，加 URL 参数 ?level=2 可跳过解锁直进第二关 |
| 常量 | `CARDS` | L101–L110 | 植物卡 |
| 常量 | `state` | L111–L112 | 状态 |
| 常量 | `plants` | L113–L115 | — |
| 函数 | `setState` | L116–L121 | 状态切换统一入口（带控制台留痕，方便排查“突然退出对局”这类偶现问题） |
| 常量 | `toastMsg` | L122–L122 | 屏幕提示条（临时消息） |
| 函数 | `toast` | L123–L123 | — |
| 函数 | `drawToast` | L124–L141 | — |
| 常量 | `exitArm` | L142–L142 | 对局中返回菜单需要二次确认，避免误触/误按丢掉进度 |
| 函数 | `requestExit` | L143–L150 | — |
| 常量 | `R` | L151–L151 | 工具 |
| 常量 | `C` | L152–L152 | — |
| 函数 | `gridToPos` | L153–L153 | — |
| 函数 | `posToGrid` | L154–L154 | — |
| 函数 | `inGrid` | L155–L157 | — |

### 音效（WebAudio 实时合成，无外部文件） · L157–L246

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `audioCtx` | L158–L158 | — |
| 函数 | `ac` | L159–L168 | — |
| 常量 | `AudioBus` | L169–L173 | ---- 音频总线（ADR-004）：4 分组 GainNode + masterGain → destination ---- 分组默认音量：… |
| 常量 | `AUDIO_ROUTES` | L174–L178 | SFX 分组映射（tone/noise 默认走 event；战斗/UI 音效按需显式传分组） |
| 函数 | `initAudioBus` | L179–L201 | — |
| 函数 | `tone` | L202–L216 | 单音：频率、时长、波形、音量、延迟、滑到目标频率 |
| 函数 | `noise` | L217–L241 | 噪声：用于爆炸/挖掘/啃食。按 dur 就近取预生成 buffer 段（0.1/0.3/0.5s） |
| 函数 | `routeBus` | L242–L247 | 取输出总线：group 显式优先（SFX 调用点已标注所属分组）；缺省走 event。 总线未初始化（无头测试 / 降级）时直连 destina… |

### 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） · L247–L301

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `Easing` | L248–L261 | — |
| 常量 | `sfxGate` | L262–L262 | 节流：防止密集事件把音频糊成一团 |
| 函数 | `gate` | L263–L267 | — |
| 常量 | `SFX` | L268–L302 | — |

### 主循环 · L302–L339

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastT` | L303–L303 | — |
| 常量 | `lastDt` | L304–L304 | — |
| 常量 | `frameErr` | L305–L305 | — |
| 函数 | `loop` | L306–L328 | — |
| 函数 | `drawFrameErr` | L329–L340 | — |

### 输入 · L340–L529

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastMouseGrid` | L341–L354 | — |
| 函数 | `bindBtn` | L355–L377 | 按钮统一绑定：点完主动 blur，避免按钮保留焦点后被 Space/Enter 二次触发 |
| 函数 | `onClick` | L378–L447 | — |
| 函数 | `onClickMenu` | L448–L465 | — |
| 函数 | `onClickEnd` | L466–L478 | — |
| 函数 | `onKey` | L479–L530 | — |

### 游戏控制 · L530–L545

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `startGame` | L531–L547 | — |

### 波次 · L546–L608

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `spawnQueue` | L548–L548 | 波次生成：用队列逐个放出，不是一次性全刷 |
| 常量 | `spawnTimer` | L549–L549 | — |
| 常量 | `waveInterval` | L550–L550 | — |
| 常量 | `waveActive` | L551–L551 | — |
| 常量 | `waveDrainedT` | L552–L553 | — |
| 常量 | `warn` | L554–L555 | 大波预警：active=横幅显示中，t=剩余秒数，last=已预警过的波次号 |
| 函数 | `newWave` | L556–L592 | — |
| 函数 | `processSpawnQueue` | L593–L609 | 从队列中逐个放出僵尸 |

### 更新 · L609–L892

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `update` | L610–L657 | — |
| 函数 | `updatePlant` | L658–L694 | — |
| 函数 | `explodeMine` | L695–L726 | 地瓜爆炸：秒杀本格僵尸 + 轻微波及相邻行近距离目标 |
| 函数 | `hasZombieAhead` | L727–L735 | — |
| 函数 | `updateProjectiles` | L736–L763 | — |
| 函数 | `updateZombies` | L764–L796 | — |
| 函数 | `spawnCorpseParts` | L797–L823 | F-02 死亡零件（蓝图 §3）：死亡 = 血雾（保留）+ 零件爆散，§G 粒子上限双保险 |
| 函数 | `killZombie` | L824–L832 | — |
| 函数 | `spawnBurst` | L833–L838 | — |
| 函数 | `checkWave` | L839–L893 | — |

### 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） · L893–L922

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `screenShake` | L894–L894 | — |
| 常量 | `flashT` | L895–L895 | — |
| 常量 | `loseShakeUsed` | L896–L897 | — |
| 函数 | `triggerShake` | L898–L907 | — |
| 函数 | `triggerFlash` | L908–L911 | — |
| 函数 | `getShakeOffset` | L912–L923 | — |

### 渲染 · L923–L1410

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `render` | L924–L947 | — |
| 常量 | `WARN_TOTAL` | L948–L948 | 「一大波僵尸即将来临」预警横幅 |
| 函数 | `drawWaveWarn` | L949–L1014 | — |
| 函数 | `drawGameWorld` | L1015–L1081 | — |
| 函数 | `drawCorpsePart` | L1082–L1099 | F-02 死亡零件绘制（蓝图 §3）：head 带眼睛，其余为矩形；末 300ms 淡出 |
| 函数 | `drawShovelIcon` | L1100–L1120 | 铲子图标（供铲子槽 / 光标预览复用） |
| 函数 | `drawPlant` | L1121–L1160 | — |
| 函数 | `drawPlantInner` | L1161–L1275 | 原 drawPlant 绘制主体（阴影/各类型/血条），签名改为 (p, x, y) 以支持种植动画缩放平移 |
| 函数 | `drawZombie` | L1276–L1322 | — |
| 函数 | `drawProjectile` | L1323–L1347 | — |
| 函数 | `drawSun` | L1348–L1371 | — |
| 函数 | `drawParticle` | L1372–L1380 | — |
| 函数 | `drawShockwave` | L1381–L1394 | F-03 冲击波环（蓝图 §4）：easeOutCubic 扩散 8→180px，alpha 0.9→0，线宽 3→1.5 |
| 函数 | `drawBoom` | L1395–L1413 | F-03 火球扩为 450ms 三色段（蓝图 §4）：白心→橙→红橙→透明，前 30% 涨后回缩 |

### D-11 圆角化（蓝图 §6） · L1411–L1712

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `RADIUS` | L1414–L1414 | 统一圆角矩形：现代浏览器 ctx.roundRect 原生支持，退化 arcTo 兼容旧内核。 rr 内不碰 alpha；调用方需半透明时自行 … |
| 函数 | `rr` | L1415–L1427 | — |
| 函数 | `drawCardBar` | L1428–L1477 | — |
| 函数 | `drawCardFace` | L1478–L1530 | — |
| 函数 | `drawStatus` | L1531–L1565 | — |
| 函数 | `drawMenu` | L1566–L1634 | — |
| 函数 | `drawPause` | L1635–L1645 | — |
| 函数 | `drawEnd` | L1646–L1712 | — |

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
