# 代码地图 · PvZ Lite

> **本文件由脚本生成，请勿手改**：`node tools/gen-code-map.mjs`
> 源文件：`plants-vs-zombies.html`（1844 行 · 64 个顶层函数 · 41 个顶层常量 · 11 个分区）
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
| 基础配置 | L35–L157 | 123 | 25 |
| 音效（WebAudio 实时合成，无外部文件） | L158–L362 | 205 | 18 |
| 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） | L363–L417 | 55 | 4 |
| 主循环 | L418–L458 | 41 | 5 |
| 输入 | L459–L651 | 193 | 6 |
| 游戏控制 | L652–L669 | 18 | 1 |
| 波次 | L670–L733 | 64 | 8 |
| 更新 | L734–L1020 | 287 | 10 |
| 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） | L1021–L1050 | 30 | 6 |
| 渲染 | L1051–L1538 | 488 | 14 |
| D-11 圆角化（蓝图 §6） | L1539–L1840 | 302 | 8 |

## 二、逐区明细

### 基础配置 · L35–L157

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
| 函数 | `setState` | L116–L122 | 状态切换统一入口（带控制台留痕，方便排查“突然退出对局”这类偶现问题） |
| 常量 | `toastMsg` | L123–L123 | 屏幕提示条（临时消息） |
| 函数 | `toast` | L124–L124 | — |
| 函数 | `drawToast` | L125–L142 | — |
| 常量 | `exitArm` | L143–L143 | 对局中返回菜单需要二次确认，避免误触/误按丢掉进度 |
| 函数 | `requestExit` | L144–L151 | — |
| 常量 | `R` | L152–L152 | 工具 |
| 常量 | `C` | L153–L153 | — |
| 函数 | `gridToPos` | L154–L154 | — |
| 函数 | `posToGrid` | L155–L155 | — |
| 函数 | `inGrid` | L156–L158 | — |

### 音效（WebAudio 实时合成，无外部文件） · L158–L362

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `audioCtx` | L159–L159 | — |
| 常量 | `audioQueue` | L160–L160 | — |
| 函数 | `ac` | L161–L171 | — |
| 函数 | `scheduleOrDefer` | L172–L175 | 排程守卫：上下文未 running（suspended/interrupted）时，直接排程的事件可能被整段丢弃 （用户反馈 2026-09-1… |
| 函数 | `flushAudioQueue` | L176–L184 | — |
| 函数 | `primeAudio` | L185–L193 | 音频管线预热：上下文刚创建时音频线程尚未就绪，会话首个音效常被整段吞掉 （用户反馈 2026-09-16：开局种植物没声音，之后的音效正常）。 … |
| 函数 | `armAudioUnlock` | L194–L215 | 兜底：任意一次用户手势都尝试恢复音频上下文（部分浏览器创建后仍保持 suspended） |
| 常量 | `BGM` | L216–L225 | + 低音层（sine 根音），C 大调五声，C-G-Am-F 和声进行。 音量按「经 env 总线 0.5 衰减后仍清晰可闻」标定（初版 0.0… |
| 函数 | `updateBGM` | L226–L235 | — |
| 函数 | `bgmTick` | L236–L267 | — |
| 常量 | `AudioBus` | L268–L272 | ---- 音频总线（ADR-004）：4 分组 GainNode + masterGain → destination ---- 分组默认音量：… |
| 常量 | `AUDIO_ROUTES` | L273–L277 | SFX 分组映射（tone/noise 默认走 event；战斗/UI 音效按需显式传分组） |
| 函数 | `initAudioBus` | L278–L310 | — |
| 函数 | `tone` | L311–L315 | 单音：频率、时长、波形、音量、延迟、滑到目标频率 |
| 函数 | `scheduleTone` | L316–L329 | — |
| 函数 | `noise` | L330–L334 | 噪声：用于爆炸/挖掘/啃食。按 dur 就近取预生成 buffer 段（0.1/0.3/0.5s） |
| 函数 | `scheduleNoise` | L335–L357 | — |
| 函数 | `routeBus` | L358–L363 | 取输出总线：group 显式优先（SFX 调用点已标注所属分组）；缺省走 event。 总线未初始化（无头测试 / 降级）时直连 destina… |

### 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） · L363–L417

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `Easing` | L364–L377 | — |
| 常量 | `sfxGate` | L378–L378 | 节流：防止密集事件把音频糊成一团 |
| 函数 | `gate` | L379–L383 | — |
| 常量 | `SFX` | L384–L418 | — |

### 主循环 · L418–L458

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastT` | L419–L419 | — |
| 常量 | `lastDt` | L420–L420 | — |
| 常量 | `frameErr` | L421–L421 | — |
| 函数 | `loop` | L422–L447 | — |
| 函数 | `drawFrameErr` | L448–L459 | — |

### 输入 · L459–L651

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastMouseGrid` | L460–L473 | — |
| 函数 | `bindBtn` | L474–L497 | 按钮统一绑定：点完主动 blur，避免按钮保留焦点后被 Space/Enter 二次触发 |
| 函数 | `onClick` | L498–L569 | — |
| 函数 | `onClickMenu` | L570–L587 | — |
| 函数 | `onClickEnd` | L588–L600 | — |
| 函数 | `onKey` | L601–L652 | — |

### 游戏控制 · L652–L669

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `startGame` | L653–L671 | — |

### 波次 · L670–L733

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `spawnQueue` | L672–L672 | 波次生成：用队列逐个放出，不是一次性全刷 |
| 常量 | `spawnTimer` | L673–L673 | — |
| 常量 | `waveInterval` | L674–L674 | — |
| 常量 | `waveActive` | L675–L675 | — |
| 常量 | `waveDrainedT` | L676–L678 | — |
| 常量 | `warn` | L679–L680 | 大波预警：active=横幅显示中，t=剩余秒数，last=已预警过的波次号， pending=倒计时已结束但还在等场上清空（横幅此时已隐藏，只… |
| 函数 | `newWave` | L681–L717 | — |
| 函数 | `processSpawnQueue` | L718–L734 | 从队列中逐个放出僵尸 |

### 更新 · L734–L1020

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `update` | L735–L782 | — |
| 函数 | `updatePlant` | L783–L819 | — |
| 函数 | `explodeMine` | L820–L851 | 地瓜爆炸：秒杀本格僵尸 + 轻微波及相邻行近距离目标 |
| 函数 | `hasZombieAhead` | L852–L860 | — |
| 函数 | `updateProjectiles` | L861–L888 | — |
| 函数 | `updateZombies` | L889–L921 | — |
| 函数 | `spawnCorpseParts` | L922–L948 | F-02 死亡零件（蓝图 §3）：死亡 = 血雾（保留）+ 零件爆散，§G 粒子上限双保险 |
| 函数 | `killZombie` | L949–L957 | — |
| 函数 | `spawnBurst` | L958–L963 | — |
| 函数 | `checkWave` | L964–L1021 | — |

### 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） · L1021–L1050

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `screenShake` | L1022–L1022 | — |
| 常量 | `flashT` | L1023–L1023 | — |
| 常量 | `loseShakeUsed` | L1024–L1025 | — |
| 函数 | `triggerShake` | L1026–L1035 | — |
| 函数 | `triggerFlash` | L1036–L1039 | — |
| 函数 | `getShakeOffset` | L1040–L1051 | — |

### 渲染 · L1051–L1538

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `render` | L1052–L1075 | — |
| 常量 | `WARN_TOTAL` | L1076–L1076 | 「一大波僵尸即将来临」预警横幅 |
| 函数 | `drawWaveWarn` | L1077–L1142 | — |
| 函数 | `drawGameWorld` | L1143–L1209 | — |
| 函数 | `drawCorpsePart` | L1210–L1227 | F-02 死亡零件绘制（蓝图 §3）：head 带眼睛，其余为矩形；末 300ms 淡出 |
| 函数 | `drawShovelIcon` | L1228–L1248 | 铲子图标（供铲子槽 / 光标预览复用） |
| 函数 | `drawPlant` | L1249–L1288 | — |
| 函数 | `drawPlantInner` | L1289–L1403 | 原 drawPlant 绘制主体（阴影/各类型/血条），签名改为 (p, x, y) 以支持种植动画缩放平移 |
| 函数 | `drawZombie` | L1404–L1450 | — |
| 函数 | `drawProjectile` | L1451–L1475 | — |
| 函数 | `drawSun` | L1476–L1499 | — |
| 函数 | `drawParticle` | L1500–L1508 | — |
| 函数 | `drawShockwave` | L1509–L1522 | F-03 冲击波环（蓝图 §4）：easeOutCubic 扩散 8→180px，alpha 0.9→0，线宽 3→1.5 |
| 函数 | `drawBoom` | L1523–L1541 | F-03 火球扩为 450ms 三色段（蓝图 §4）：白心→橙→红橙→透明，前 30% 涨后回缩 |

### D-11 圆角化（蓝图 §6） · L1539–L1840

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `RADIUS` | L1542–L1542 | 统一圆角矩形：现代浏览器 ctx.roundRect 原生支持，退化 arcTo 兼容旧内核。 rr 内不碰 alpha；调用方需半透明时自行 … |
| 函数 | `rr` | L1543–L1555 | — |
| 函数 | `drawCardBar` | L1556–L1605 | — |
| 函数 | `drawCardFace` | L1606–L1658 | — |
| 函数 | `drawStatus` | L1659–L1693 | — |
| 函数 | `drawMenu` | L1694–L1762 | — |
| 函数 | `drawPause` | L1763–L1773 | — |
| 函数 | `drawEnd` | L1774–L1840 | — |

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
