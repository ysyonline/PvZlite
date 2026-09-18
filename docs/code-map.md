# 代码地图 · PvZ Lite

> **本文件由脚本生成，请勿手改**：`node tools/gen-code-map.mjs`
> 源文件：`plants-vs-zombies.html`（2121 行 · 68 个顶层函数 · 45 个顶层常量 · 11 个分区）
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
| 基础配置 | L35–L210 | 176 | 31 |
| 音效（WebAudio 实时合成，无外部文件） | L211–L418 | 208 | 18 |
| 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） | L419–L534 | 116 | 5 |
| 主循环 | L535–L575 | 41 | 5 |
| 输入 | L576–L789 | 214 | 7 |
| 游戏控制 | L790–L808 | 19 | 1 |
| 波次 | L809–L872 | 64 | 8 |
| 更新 | L873–L1188 | 316 | 10 |
| 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） | L1189–L1218 | 30 | 6 |
| 渲染 | L1219–L1785 | 567 | 14 |
| D-11 圆角化（蓝图 §6） | L1786–L2118 | 333 | 8 |

## 二、逐区明细

### 基础配置 · L35–L210

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `canvas` | L36–L36 | — |
| 常量 | `COLS` | L37–L37 | — |
| 常量 | `WATER_ROWS` | L38–L38 | — |
| 常量 | `CARD_H` | L39–L39 | — |
| 常量 | `SHOVEL_X` | L40–L40 | — |
| 常量 | `CARD_X0` | L41–L42 | — |
| 常量 | `VERSION` | L43–L44 | 版本号（KNOWN-ISSUES #6）：源码内嵌版本标识，便于仅凭文件本身判定版本 |
| 常量 | `DIFFS` | L45–L49 | — |
| 常量 | `DIFF` | L50–L54 | — |
| 常量 | `LEVELS` | L55–L121 | 关卡配置 L1 参考原版 PvZ 1-1：只有普通僵尸 + 少量路障 L2 参考原版 1-2：解锁快速僵尸，波次更长 |
| 常量 | `level` | L122–L122 | — |
| 常量 | `levelNo` | L123–L124 | — |
| 常量 | `unlockedLevel` | L125–L138 | 解锁进度持久化（2026-09-16）：localStorage 记录，加 URL 参数 ?level=2 可跳过解锁直进第二关 |
| 函数 | `storageGet` | L139–L141 | 存档读写统一入口（2026-09-16 · KNOWN-ISSUES #9）：隐私模式 / file:// 受限环境下静默降级，绝不抛错中断游戏 |
| 函数 | `storageSet` | L142–L146 | — |
| 常量 | `CARDS` | L147–L157 | 植物卡 |
| 常量 | `state` | L158–L159 | 状态 |
| 常量 | `highScore` | L160–L160 | — |
| 常量 | `plants` | L161–L163 | — |
| 函数 | `setState` | L164–L171 | 状态切换统一入口（带控制台留痕，方便排查“突然退出对局”这类偶现问题） |
| 函数 | `updateBest` | L172–L175 | 历史最高分落盘（仅当刷新纪录时写，减少 localStorage 写入，2026-09-16 #9） |
| 常量 | `toastMsg` | L176–L176 | 屏幕提示条（临时消息） |
| 函数 | `toast` | L177–L177 | — |
| 函数 | `drawToast` | L178–L195 | — |
| 常量 | `exitArm` | L196–L196 | 对局中返回菜单需要二次确认，避免误触/误按丢掉进度 |
| 函数 | `requestExit` | L197–L204 | — |
| 常量 | `R` | L205–L205 | 工具 |
| 常量 | `C` | L206–L206 | — |
| 函数 | `gridToPos` | L207–L207 | — |
| 函数 | `posToGrid` | L208–L208 | — |
| 函数 | `inGrid` | L209–L211 | — |

### 音效（WebAudio 实时合成，无外部文件） · L211–L418

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `audioCtx` | L212–L212 | — |
| 常量 | `audioQueue` | L213–L213 | — |
| 函数 | `ac` | L214–L224 | — |
| 函数 | `scheduleOrDefer` | L225–L228 | 排程守卫：上下文未 running（suspended/interrupted）时，直接排程的事件可能被整段丢弃 （用户反馈 2026-09-1… |
| 函数 | `flushAudioQueue` | L229–L237 | — |
| 函数 | `primeAudio` | L238–L246 | 音频管线预热：上下文刚创建时音频线程尚未就绪，会话首个音效常被整段吞掉 （用户反馈 2026-09-16：开局种植物没声音，之后的音效正常）。 … |
| 函数 | `armAudioUnlock` | L247–L268 | 兜底：任意一次用户手势都尝试恢复音频上下文（部分浏览器创建后仍保持 suspended） |
| 常量 | `BGM` | L269–L278 | + 低音层（sine 根音），C 大调五声，C-G-Am-F 和声进行。 音量按「经 env 总线 0.5 衰减后仍清晰可闻」标定（初版 0.0… |
| 函数 | `updateBGM` | L279–L288 | — |
| 函数 | `bgmTick` | L289–L320 | — |
| 常量 | `AudioBus` | L321–L327 | ---- 音频总线（ADR-004）：4 分组 GainNode + masterGain → destination ---- 分组默认音量：… |
| 常量 | `AUDIO_ROUTES` | L328–L333 | SFX 分组映射（tone/noise 默认走 event；战斗/UI 音效按需显式传分组）。 本表是「规格侧」的权威映射，运行时由各 SFX … |
| 函数 | `initAudioBus` | L334–L366 | — |
| 函数 | `tone` | L367–L371 | 单音：频率、时长、波形、音量、延迟、滑到目标频率 |
| 函数 | `scheduleTone` | L372–L385 | — |
| 函数 | `noise` | L386–L390 | 噪声：用于爆炸/挖掘/啃食。按 dur 就近取预生成 buffer 段（0.1/0.3/0.5s） |
| 函数 | `scheduleNoise` | L391–L413 | — |
| 函数 | `routeBus` | L414–L419 | 取输出总线：group 显式优先（SFX 调用点已标注所属分组）；缺省走 event。 总线未初始化（无头测试 / 降级）时直连 destina… |

### 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） · L419–L534

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `Easing` | L420–L433 | — |
| 常量 | `sfxGate` | L434–L434 | 节流：防止密集事件把音频糊成一团 |
| 函数 | `gate` | L435–L439 | — |
| 常量 | `SFX` | L440–L513 | — |
| 常量 | `SirenLoop` | L514–L535 | 采用「帧驱动」而非 setInterval： · 暂停时 update 不执行 → 警报天然同步暂停（§C.1 的暂停要求零额外代码） · 横幅… |

### 主循环 · L535–L575

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastT` | L536–L536 | — |
| 常量 | `lastDt` | L537–L537 | — |
| 常量 | `frameErr` | L538–L538 | — |
| 函数 | `loop` | L539–L564 | — |
| 函数 | `drawFrameErr` | L565–L576 | — |

### 输入 · L576–L789

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastMouseGrid` | L577–L590 | — |
| 函数 | `bindBtn` | L591–L603 | 按钮统一绑定：点完主动 blur，避免按钮保留焦点后被 Space/Enter 二次触发 |
| 函数 | `applyMuteUI` | L604–L619 | 静音按钮外观跟随 muted 状态（启动即按存档恢复，2026-09-16 #9） |
| 函数 | `onClick` | L620–L705 | — |
| 函数 | `onClickMenu` | L706–L723 | — |
| 函数 | `onClickEnd` | L724–L736 | — |
| 函数 | `onKey` | L737–L790 | — |

### 游戏控制 · L790–L808

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `startGame` | L791–L810 | — |

### 波次 · L809–L872

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `spawnQueue` | L811–L811 | 波次生成：用队列逐个放出，不是一次性全刷 |
| 常量 | `spawnTimer` | L812–L812 | — |
| 常量 | `waveInterval` | L813–L813 | — |
| 常量 | `waveActive` | L814–L814 | — |
| 常量 | `waveDrainedT` | L815–L817 | — |
| 常量 | `warn` | L818–L819 | 大波预警：active=横幅显示中，t=剩余秒数，last=已预警过的波次号， pending=倒计时已结束但还在等场上清空（横幅此时已隐藏，只… |
| 函数 | `newWave` | L820–L856 | — |
| 函数 | `processSpawnQueue` | L857–L873 | 从队列中逐个放出僵尸 |

### 更新 · L873–L1188

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `update` | L874–L925 | — |
| 函数 | `updatePlant` | L926–L968 | — |
| 函数 | `explodeMine` | L969–L1000 | dy 门槛 CELL_H*0.9=93.6 < 行高 CELL_H=104，相邻行恒不满足；同排时其 dx 门槛 CELL_W*0.5=45 又… |
| 函数 | `hasZombieAhead` | L1001–L1009 | — |
| 函数 | `updateProjectiles` | L1010–L1037 | — |
| 函数 | `updateZombies` | L1038–L1086 | — |
| 函数 | `spawnCorpseParts` | L1087–L1113 | F-02 死亡零件（蓝图 §3）：死亡 = 血雾（保留）+ 零件爆散，§G 粒子上限双保险 |
| 函数 | `killZombie` | L1114–L1122 | — |
| 函数 | `spawnBurst` | L1123–L1128 | — |
| 函数 | `checkWave` | L1129–L1189 | — |

### 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） · L1189–L1218

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `screenShake` | L1190–L1190 | — |
| 常量 | `flashT` | L1191–L1191 | — |
| 常量 | `loseShakeUsed` | L1192–L1193 | — |
| 函数 | `triggerShake` | L1194–L1203 | — |
| 函数 | `triggerFlash` | L1204–L1207 | — |
| 函数 | `getShakeOffset` | L1208–L1219 | — |

### 渲染 · L1219–L1785

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `render` | L1220–L1243 | — |
| 常量 | `WARN_TOTAL` | L1244–L1244 | 「一大波僵尸即将来临」预警横幅 |
| 函数 | `drawWaveWarn` | L1245–L1310 | — |
| 函数 | `drawGameWorld` | L1311–L1412 | — |
| 函数 | `drawCorpsePart` | L1413–L1430 | F-02 死亡零件绘制（蓝图 §3）：head 带眼睛，其余为矩形；末 300ms 淡出 |
| 函数 | `drawShovelIcon` | L1431–L1451 | 铲子图标（供铲子槽 / 光标预览复用） |
| 函数 | `drawPlant` | L1452–L1491 | — |
| 函数 | `drawPlantInner` | L1492–L1628 | 原 drawPlant 绘制主体（阴影/各类型/血条），签名改为 (p, x, y) 以支持种植动画缩放平移 |
| 函数 | `drawZombie` | L1629–L1691 | — |
| 函数 | `drawProjectile` | L1692–L1716 | — |
| 函数 | `drawSun` | L1717–L1740 | — |
| 函数 | `drawParticle` | L1741–L1750 | — |
| 函数 | `drawShockwave` | L1751–L1769 | F-03 冲击波环（蓝图 §4）：easeOutCubic 扩散 8→180px，alpha 0.9→0，线宽 3→1.5 e.water（v1… |
| 函数 | `drawBoom` | L1770–L1788 | F-03 火球扩为 450ms 三色段（蓝图 §4）：白心→橙→红橙→透明，前 30% 涨后回缩 |

### D-11 圆角化（蓝图 §6） · L1786–L2118

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `RADIUS` | L1789–L1789 | 统一圆角矩形：现代浏览器 ctx.roundRect 原生支持，退化 arcTo 兼容旧内核。 rr 内不碰 alpha；调用方需半透明时自行 … |
| 函数 | `rr` | L1790–L1802 | — |
| 函数 | `drawCardBar` | L1803–L1852 | — |
| 函数 | `drawCardFace` | L1853–L1918 | — |
| 函数 | `drawStatus` | L1919–L1957 | — |
| 函数 | `drawMenu` | L1958–L2035 | — |
| 函数 | `drawPause` | L2036–L2046 | — |
| 函数 | `drawEnd` | L2047–L2118 | — |

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
