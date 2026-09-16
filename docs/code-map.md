# 代码地图 · PvZ Lite

> **本文件由脚本生成，请勿手改**：`node tools/gen-code-map.mjs`
> 源文件：`plants-vs-zombies.html`（1782 行 · 62 个顶层函数 · 40 个顶层常量 · 11 个分区）
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
| 音效（WebAudio 实时合成，无外部文件） | L157–L306 | 150 | 15 |
| 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） | L307–L361 | 55 | 4 |
| 主循环 | L362–L400 | 39 | 5 |
| 输入 | L401–L590 | 190 | 6 |
| 游戏控制 | L591–L607 | 17 | 1 |
| 波次 | L608–L671 | 64 | 8 |
| 更新 | L672–L958 | 287 | 10 |
| 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） | L959–L988 | 30 | 6 |
| 渲染 | L989–L1476 | 488 | 14 |
| D-11 圆角化（蓝图 §6） | L1477–L1778 | 302 | 8 |

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

### 音效（WebAudio 实时合成，无外部文件） · L157–L306

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `audioCtx` | L158–L158 | — |
| 常量 | `audioQueue` | L159–L159 | — |
| 函数 | `ac` | L160–L170 | — |
| 函数 | `scheduleOrDefer` | L171–L174 | 排程守卫：上下文未 running（suspended/interrupted）时，直接排程的事件可能被整段丢弃 （用户反馈 2026-09-1… |
| 函数 | `flushAudioQueue` | L175–L183 | — |
| 函数 | `primeAudio` | L184–L192 | 音频管线预热：上下文刚创建时音频线程尚未就绪，会话首个音效常被整段吞掉 （用户反馈 2026-09-16：开局种植物没声音，之后的音效正常）。 … |
| 函数 | `armAudioUnlock` | L193–L211 | 兜底：任意一次用户手势都尝试恢复音频上下文（部分浏览器创建后仍保持 suspended） |
| 常量 | `AudioBus` | L212–L216 | ---- 音频总线（ADR-004）：4 分组 GainNode + masterGain → destination ---- 分组默认音量：… |
| 常量 | `AUDIO_ROUTES` | L217–L221 | SFX 分组映射（tone/noise 默认走 event；战斗/UI 音效按需显式传分组） |
| 函数 | `initAudioBus` | L222–L254 | — |
| 函数 | `tone` | L255–L259 | 单音：频率、时长、波形、音量、延迟、滑到目标频率 |
| 函数 | `scheduleTone` | L260–L273 | — |
| 函数 | `noise` | L274–L278 | 噪声：用于爆炸/挖掘/啃食。按 dur 就近取预生成 buffer 段（0.1/0.3/0.5s） |
| 函数 | `scheduleNoise` | L279–L301 | — |
| 函数 | `routeBus` | L302–L307 | 取输出总线：group 显式优先（SFX 调用点已标注所属分组）；缺省走 event。 总线未初始化（无头测试 / 降级）时直连 destina… |

### 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） · L307–L361

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `Easing` | L308–L321 | — |
| 常量 | `sfxGate` | L322–L322 | 节流：防止密集事件把音频糊成一团 |
| 函数 | `gate` | L323–L327 | — |
| 常量 | `SFX` | L328–L362 | — |

### 主循环 · L362–L400

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastT` | L363–L363 | — |
| 常量 | `lastDt` | L364–L364 | — |
| 常量 | `frameErr` | L365–L365 | — |
| 函数 | `loop` | L366–L389 | — |
| 函数 | `drawFrameErr` | L390–L401 | — |

### 输入 · L401–L590

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastMouseGrid` | L402–L415 | — |
| 函数 | `bindBtn` | L416–L438 | 按钮统一绑定：点完主动 blur，避免按钮保留焦点后被 Space/Enter 二次触发 |
| 函数 | `onClick` | L439–L508 | — |
| 函数 | `onClickMenu` | L509–L526 | — |
| 函数 | `onClickEnd` | L527–L539 | — |
| 函数 | `onKey` | L540–L591 | — |

### 游戏控制 · L591–L607

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `startGame` | L592–L609 | — |

### 波次 · L608–L671

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `spawnQueue` | L610–L610 | 波次生成：用队列逐个放出，不是一次性全刷 |
| 常量 | `spawnTimer` | L611–L611 | — |
| 常量 | `waveInterval` | L612–L612 | — |
| 常量 | `waveActive` | L613–L613 | — |
| 常量 | `waveDrainedT` | L614–L616 | — |
| 常量 | `warn` | L617–L618 | 大波预警：active=横幅显示中，t=剩余秒数，last=已预警过的波次号， pending=倒计时已结束但还在等场上清空（横幅此时已隐藏，只… |
| 函数 | `newWave` | L619–L655 | — |
| 函数 | `processSpawnQueue` | L656–L672 | 从队列中逐个放出僵尸 |

### 更新 · L672–L958

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `update` | L673–L720 | — |
| 函数 | `updatePlant` | L721–L757 | — |
| 函数 | `explodeMine` | L758–L789 | 地瓜爆炸：秒杀本格僵尸 + 轻微波及相邻行近距离目标 |
| 函数 | `hasZombieAhead` | L790–L798 | — |
| 函数 | `updateProjectiles` | L799–L826 | — |
| 函数 | `updateZombies` | L827–L859 | — |
| 函数 | `spawnCorpseParts` | L860–L886 | F-02 死亡零件（蓝图 §3）：死亡 = 血雾（保留）+ 零件爆散，§G 粒子上限双保险 |
| 函数 | `killZombie` | L887–L895 | — |
| 函数 | `spawnBurst` | L896–L901 | — |
| 函数 | `checkWave` | L902–L959 | — |

### 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） · L959–L988

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `screenShake` | L960–L960 | — |
| 常量 | `flashT` | L961–L961 | — |
| 常量 | `loseShakeUsed` | L962–L963 | — |
| 函数 | `triggerShake` | L964–L973 | — |
| 函数 | `triggerFlash` | L974–L977 | — |
| 函数 | `getShakeOffset` | L978–L989 | — |

### 渲染 · L989–L1476

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `render` | L990–L1013 | — |
| 常量 | `WARN_TOTAL` | L1014–L1014 | 「一大波僵尸即将来临」预警横幅 |
| 函数 | `drawWaveWarn` | L1015–L1080 | — |
| 函数 | `drawGameWorld` | L1081–L1147 | — |
| 函数 | `drawCorpsePart` | L1148–L1165 | F-02 死亡零件绘制（蓝图 §3）：head 带眼睛，其余为矩形；末 300ms 淡出 |
| 函数 | `drawShovelIcon` | L1166–L1186 | 铲子图标（供铲子槽 / 光标预览复用） |
| 函数 | `drawPlant` | L1187–L1226 | — |
| 函数 | `drawPlantInner` | L1227–L1341 | 原 drawPlant 绘制主体（阴影/各类型/血条），签名改为 (p, x, y) 以支持种植动画缩放平移 |
| 函数 | `drawZombie` | L1342–L1388 | — |
| 函数 | `drawProjectile` | L1389–L1413 | — |
| 函数 | `drawSun` | L1414–L1437 | — |
| 函数 | `drawParticle` | L1438–L1446 | — |
| 函数 | `drawShockwave` | L1447–L1460 | F-03 冲击波环（蓝图 §4）：easeOutCubic 扩散 8→180px，alpha 0.9→0，线宽 3→1.5 |
| 函数 | `drawBoom` | L1461–L1479 | F-03 火球扩为 450ms 三色段（蓝图 §4）：白心→橙→红橙→透明，前 30% 涨后回缩 |

### D-11 圆角化（蓝图 §6） · L1477–L1778

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `RADIUS` | L1480–L1480 | 统一圆角矩形：现代浏览器 ctx.roundRect 原生支持，退化 arcTo 兼容旧内核。 rr 内不碰 alpha；调用方需半透明时自行 … |
| 函数 | `rr` | L1481–L1493 | — |
| 函数 | `drawCardBar` | L1494–L1543 | — |
| 函数 | `drawCardFace` | L1544–L1596 | — |
| 函数 | `drawStatus` | L1597–L1631 | — |
| 函数 | `drawMenu` | L1632–L1700 | — |
| 函数 | `drawPause` | L1701–L1711 | — |
| 函数 | `drawEnd` | L1712–L1778 | — |

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
