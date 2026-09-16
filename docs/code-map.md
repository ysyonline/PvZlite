# 代码地图 · PvZ Lite

> **本文件由脚本生成，请勿手改**：`node tools/gen-code-map.mjs`
> 源文件：`plants-vs-zombies.html`（1784 行 · 62 个顶层函数 · 41 个顶层常量 · 11 个分区）
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
| 音效（WebAudio 实时合成，无外部文件） | L157–L297 | 141 | 16 |
| 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） | L298–L352 | 55 | 4 |
| 主循环 | L353–L391 | 39 | 5 |
| 输入 | L392–L581 | 190 | 6 |
| 游戏控制 | L582–L598 | 17 | 1 |
| 波次 | L599–L662 | 64 | 8 |
| 更新 | L663–L949 | 287 | 10 |
| 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） | L950–L979 | 30 | 6 |
| 渲染 | L980–L1467 | 488 | 14 |
| D-11 圆角化（蓝图 §6） | L1468–L1780 | 313 | 8 |

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

### 音效（WebAudio 实时合成，无外部文件） · L157–L297

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `audioCtx` | L158–L158 | — |
| 常量 | `audioResumeTries` | L159–L159 | — |
| 常量 | `audioQueue` | L160–L160 | — |
| 函数 | `ac` | L161–L171 | — |
| 函数 | `scheduleOrDefer` | L172–L175 | 排程守卫：上下文未 running（suspended/interrupted）时，直接排程的事件可能被整段丢弃 （用户反馈 2026-09-1… |
| 函数 | `flushAudioQueue` | L176–L184 | — |
| 函数 | `primeAudio` | L185–L193 | 音频管线预热：上下文刚创建时音频线程尚未就绪，会话首个音效常被整段吞掉 （用户反馈 2026-09-16：开局种植物没声音，之后的音效正常）。 … |
| 函数 | `armAudioUnlock` | L194–L212 | 兜底：任意一次用户手势都尝试恢复音频上下文（部分浏览器创建后仍保持 suspended） |
| 常量 | `AudioBus` | L213–L217 | ---- 音频总线（ADR-004）：4 分组 GainNode + masterGain → destination ---- 分组默认音量：… |
| 常量 | `AUDIO_ROUTES` | L218–L222 | SFX 分组映射（tone/noise 默认走 event；战斗/UI 音效按需显式传分组） |
| 函数 | `initAudioBus` | L223–L245 | — |
| 函数 | `tone` | L246–L250 | 单音：频率、时长、波形、音量、延迟、滑到目标频率 |
| 函数 | `scheduleTone` | L251–L264 | — |
| 函数 | `noise` | L265–L269 | 噪声：用于爆炸/挖掘/啃食。按 dur 就近取预生成 buffer 段（0.1/0.3/0.5s） |
| 函数 | `scheduleNoise` | L270–L292 | — |
| 函数 | `routeBus` | L293–L298 | 取输出总线：group 显式优先（SFX 调用点已标注所属分组）；缺省走 event。 总线未初始化（无头测试 / 降级）时直连 destina… |

### 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） · L298–L352

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `Easing` | L299–L312 | — |
| 常量 | `sfxGate` | L313–L313 | 节流：防止密集事件把音频糊成一团 |
| 函数 | `gate` | L314–L318 | — |
| 常量 | `SFX` | L319–L353 | — |

### 主循环 · L353–L391

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastT` | L354–L354 | — |
| 常量 | `lastDt` | L355–L355 | — |
| 常量 | `frameErr` | L356–L356 | — |
| 函数 | `loop` | L357–L380 | — |
| 函数 | `drawFrameErr` | L381–L392 | — |

### 输入 · L392–L581

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastMouseGrid` | L393–L406 | — |
| 函数 | `bindBtn` | L407–L429 | 按钮统一绑定：点完主动 blur，避免按钮保留焦点后被 Space/Enter 二次触发 |
| 函数 | `onClick` | L430–L499 | — |
| 函数 | `onClickMenu` | L500–L517 | — |
| 函数 | `onClickEnd` | L518–L530 | — |
| 函数 | `onKey` | L531–L582 | — |

### 游戏控制 · L582–L598

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `startGame` | L583–L600 | — |

### 波次 · L599–L662

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `spawnQueue` | L601–L601 | 波次生成：用队列逐个放出，不是一次性全刷 |
| 常量 | `spawnTimer` | L602–L602 | — |
| 常量 | `waveInterval` | L603–L603 | — |
| 常量 | `waveActive` | L604–L604 | — |
| 常量 | `waveDrainedT` | L605–L607 | — |
| 常量 | `warn` | L608–L609 | 大波预警：active=横幅显示中，t=剩余秒数，last=已预警过的波次号， pending=倒计时已结束但还在等场上清空（横幅此时已隐藏，只… |
| 函数 | `newWave` | L610–L646 | — |
| 函数 | `processSpawnQueue` | L647–L663 | 从队列中逐个放出僵尸 |

### 更新 · L663–L949

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `update` | L664–L711 | — |
| 函数 | `updatePlant` | L712–L748 | — |
| 函数 | `explodeMine` | L749–L780 | 地瓜爆炸：秒杀本格僵尸 + 轻微波及相邻行近距离目标 |
| 函数 | `hasZombieAhead` | L781–L789 | — |
| 函数 | `updateProjectiles` | L790–L817 | — |
| 函数 | `updateZombies` | L818–L850 | — |
| 函数 | `spawnCorpseParts` | L851–L877 | F-02 死亡零件（蓝图 §3）：死亡 = 血雾（保留）+ 零件爆散，§G 粒子上限双保险 |
| 函数 | `killZombie` | L878–L886 | — |
| 函数 | `spawnBurst` | L887–L892 | — |
| 函数 | `checkWave` | L893–L950 | — |

### 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） · L950–L979

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `screenShake` | L951–L951 | — |
| 常量 | `flashT` | L952–L952 | — |
| 常量 | `loseShakeUsed` | L953–L954 | — |
| 函数 | `triggerShake` | L955–L964 | — |
| 函数 | `triggerFlash` | L965–L968 | — |
| 函数 | `getShakeOffset` | L969–L980 | — |

### 渲染 · L980–L1467

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `render` | L981–L1004 | — |
| 常量 | `WARN_TOTAL` | L1005–L1005 | 「一大波僵尸即将来临」预警横幅 |
| 函数 | `drawWaveWarn` | L1006–L1071 | — |
| 函数 | `drawGameWorld` | L1072–L1138 | — |
| 函数 | `drawCorpsePart` | L1139–L1156 | F-02 死亡零件绘制（蓝图 §3）：head 带眼睛，其余为矩形；末 300ms 淡出 |
| 函数 | `drawShovelIcon` | L1157–L1177 | 铲子图标（供铲子槽 / 光标预览复用） |
| 函数 | `drawPlant` | L1178–L1217 | — |
| 函数 | `drawPlantInner` | L1218–L1332 | 原 drawPlant 绘制主体（阴影/各类型/血条），签名改为 (p, x, y) 以支持种植动画缩放平移 |
| 函数 | `drawZombie` | L1333–L1379 | — |
| 函数 | `drawProjectile` | L1380–L1404 | — |
| 函数 | `drawSun` | L1405–L1428 | — |
| 函数 | `drawParticle` | L1429–L1437 | — |
| 函数 | `drawShockwave` | L1438–L1451 | F-03 冲击波环（蓝图 §4）：easeOutCubic 扩散 8→180px，alpha 0.9→0，线宽 3→1.5 |
| 函数 | `drawBoom` | L1452–L1470 | F-03 火球扩为 450ms 三色段（蓝图 §4）：白心→橙→红橙→透明，前 30% 涨后回缩 |

### D-11 圆角化（蓝图 §6） · L1468–L1780

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `RADIUS` | L1471–L1471 | 统一圆角矩形：现代浏览器 ctx.roundRect 原生支持，退化 arcTo 兼容旧内核。 rr 内不碰 alpha；调用方需半透明时自行 … |
| 函数 | `rr` | L1472–L1484 | — |
| 函数 | `drawCardBar` | L1485–L1534 | — |
| 函数 | `drawCardFace` | L1535–L1587 | — |
| 函数 | `drawStatus` | L1588–L1633 | — |
| 函数 | `drawMenu` | L1634–L1702 | — |
| 函数 | `drawPause` | L1703–L1713 | — |
| 函数 | `drawEnd` | L1714–L1780 | — |

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
