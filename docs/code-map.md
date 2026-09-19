# 代码地图 · PvZ Lite

> **本文件由脚本生成，请勿手改**：`node tools/gen-code-map.mjs`
> 源文件：`plants-vs-zombies.html`（2345 行 · 68 个顶层函数 · 47 个顶层常量 · 11 个分区）
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
| 基础配置 | L35–L235 | 201 | 33 |
| 音效（WebAudio 实时合成，无外部文件） | L236–L443 | 208 | 18 |
| 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） | L444–L559 | 116 | 5 |
| 主循环 | L560–L600 | 41 | 5 |
| 输入 | L601–L817 | 217 | 7 |
| 游戏控制 | L818–L836 | 19 | 1 |
| 波次 | L837–L900 | 64 | 8 |
| 更新 | L901–L1244 | 344 | 10 |
| 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） | L1245–L1274 | 30 | 6 |
| 渲染 | L1275–L1987 | 713 | 14 |
| D-11 圆角化（蓝图 §6） | L1988–L2342 | 355 | 8 |

## 二、逐区明细

### 基础配置 · L35–L235

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
| 常量 | `VERSION` | L46–L47 | 版本号（KNOWN-ISSUES #6）：源码内嵌版本标识，便于仅凭文件本身判定版本 |
| 常量 | `DIFFS` | L48–L52 | — |
| 常量 | `DIFF` | L53–L57 | — |
| 常量 | `LEVELS` | L58–L144 | 关卡配置 L1 参考原版 PvZ 1-1：只有普通僵尸 + 少量路障 L2 参考原版 1-2：解锁快速僵尸，波次更长 |
| 常量 | `level` | L145–L145 | — |
| 常量 | `levelNo` | L146–L147 | — |
| 常量 | `unlockedLevel` | L148–L161 | 解锁进度持久化（2026-09-16）：localStorage 记录，加 URL 参数 ?level=2 可跳过解锁直进第二关 |
| 函数 | `storageGet` | L162–L164 | 存档读写统一入口（2026-09-16 · KNOWN-ISSUES #9）：隐私模式 / file:// 受限环境下静默降级，绝不抛错中断游戏 |
| 函数 | `storageSet` | L165–L169 | — |
| 常量 | `CARDS` | L170–L182 | 植物卡 |
| 常量 | `state` | L183–L184 | 状态 |
| 常量 | `highScore` | L185–L185 | — |
| 常量 | `plants` | L186–L188 | — |
| 函数 | `setState` | L189–L196 | 状态切换统一入口（带控制台留痕，方便排查“突然退出对局”这类偶现问题） |
| 函数 | `updateBest` | L197–L200 | 历史最高分落盘（仅当刷新纪录时写，减少 localStorage 写入，2026-09-16 #9） |
| 常量 | `toastMsg` | L201–L201 | 屏幕提示条（临时消息） |
| 函数 | `toast` | L202–L202 | — |
| 函数 | `drawToast` | L203–L220 | — |
| 常量 | `exitArm` | L221–L221 | 对局中返回菜单需要二次确认，避免误触/误按丢掉进度 |
| 函数 | `requestExit` | L222–L229 | — |
| 常量 | `R` | L230–L230 | 工具 |
| 常量 | `C` | L231–L231 | — |
| 函数 | `gridToPos` | L232–L232 | — |
| 函数 | `posToGrid` | L233–L233 | — |
| 函数 | `inGrid` | L234–L236 | — |

### 音效（WebAudio 实时合成，无外部文件） · L236–L443

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `audioCtx` | L237–L237 | — |
| 常量 | `audioQueue` | L238–L238 | — |
| 函数 | `ac` | L239–L249 | — |
| 函数 | `scheduleOrDefer` | L250–L253 | 排程守卫：上下文未 running（suspended/interrupted）时，直接排程的事件可能被整段丢弃 （用户反馈 2026-09-1… |
| 函数 | `flushAudioQueue` | L254–L262 | — |
| 函数 | `primeAudio` | L263–L271 | 音频管线预热：上下文刚创建时音频线程尚未就绪，会话首个音效常被整段吞掉 （用户反馈 2026-09-16：开局种植物没声音，之后的音效正常）。 … |
| 函数 | `armAudioUnlock` | L272–L293 | 兜底：任意一次用户手势都尝试恢复音频上下文（部分浏览器创建后仍保持 suspended） |
| 常量 | `BGM` | L294–L303 | + 低音层（sine 根音），C 大调五声，C-G-Am-F 和声进行。 音量按「经 env 总线 0.5 衰减后仍清晰可闻」标定（初版 0.0… |
| 函数 | `updateBGM` | L304–L313 | — |
| 函数 | `bgmTick` | L314–L345 | — |
| 常量 | `AudioBus` | L346–L352 | ---- 音频总线（ADR-004）：4 分组 GainNode + masterGain → destination ---- 分组默认音量：… |
| 常量 | `AUDIO_ROUTES` | L353–L358 | SFX 分组映射（tone/noise 默认走 event；战斗/UI 音效按需显式传分组）。 本表是「规格侧」的权威映射，运行时由各 SFX … |
| 函数 | `initAudioBus` | L359–L391 | — |
| 函数 | `tone` | L392–L396 | 单音：频率、时长、波形、音量、延迟、滑到目标频率 |
| 函数 | `scheduleTone` | L397–L410 | — |
| 函数 | `noise` | L411–L415 | 噪声：用于爆炸/挖掘/啃食。按 dur 就近取预生成 buffer 段（0.1/0.3/0.5s） |
| 函数 | `scheduleNoise` | L416–L438 | — |
| 函数 | `routeBus` | L439–L444 | 取输出总线：group 显式优先（SFX 调用点已标注所属分组）；缺省走 event。 总线未初始化（无头测试 / 降级）时直连 destina… |

### 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） · L444–L559

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `Easing` | L445–L458 | — |
| 常量 | `sfxGate` | L459–L459 | 节流：防止密集事件把音频糊成一团 |
| 函数 | `gate` | L460–L464 | — |
| 常量 | `SFX` | L465–L538 | — |
| 常量 | `SirenLoop` | L539–L560 | 采用「帧驱动」而非 setInterval： · 暂停时 update 不执行 → 警报天然同步暂停（§C.1 的暂停要求零额外代码） · 横幅… |

### 主循环 · L560–L600

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastT` | L561–L561 | — |
| 常量 | `lastDt` | L562–L562 | — |
| 常量 | `frameErr` | L563–L563 | — |
| 函数 | `loop` | L564–L589 | — |
| 函数 | `drawFrameErr` | L590–L601 | — |

### 输入 · L601–L817

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastMouseGrid` | L602–L615 | — |
| 函数 | `bindBtn` | L616–L628 | 按钮统一绑定：点完主动 blur，避免按钮保留焦点后被 Space/Enter 二次触发 |
| 函数 | `applyMuteUI` | L629–L644 | 静音按钮外观跟随 muted 状态（启动即按存档恢复，2026-09-16 #9） |
| 函数 | `onClick` | L645–L733 | — |
| 函数 | `onClickMenu` | L734–L751 | — |
| 函数 | `onClickEnd` | L752–L764 | — |
| 函数 | `onKey` | L765–L818 | — |

### 游戏控制 · L818–L836

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `startGame` | L819–L838 | — |

### 波次 · L837–L900

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `spawnQueue` | L839–L839 | 波次生成：用队列逐个放出，不是一次性全刷 |
| 常量 | `spawnTimer` | L840–L840 | — |
| 常量 | `waveInterval` | L841–L841 | — |
| 常量 | `waveActive` | L842–L842 | — |
| 常量 | `waveDrainedT` | L843–L845 | — |
| 常量 | `warn` | L846–L847 | 大波预警：active=横幅显示中，t=剩余秒数，last=已预警过的波次号， pending=倒计时已结束但还在等场上清空（横幅此时已隐藏，只… |
| 函数 | `newWave` | L848–L884 | — |
| 函数 | `processSpawnQueue` | L885–L901 | 从队列中逐个放出僵尸 |

### 更新 · L901–L1244

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `update` | L902–L953 | — |
| 函数 | `updatePlant` | L954–L1018 | — |
| 函数 | `explodeMine` | L1019–L1050 | dy 门槛 CELL_H*0.9=93.6 < 行高 CELL_H=104，相邻行恒不满足；同排时其 dx 门槛 CELL_W*0.5=45 又… |
| 函数 | `hasZombieAhead` | L1051–L1059 | — |
| 函数 | `updateProjectiles` | L1060–L1093 | — |
| 函数 | `updateZombies` | L1094–L1142 | — |
| 函数 | `spawnCorpseParts` | L1143–L1169 | F-02 死亡零件（蓝图 §3）：死亡 = 血雾（保留）+ 零件爆散，§G 粒子上限双保险 |
| 函数 | `killZombie` | L1170–L1178 | — |
| 函数 | `spawnBurst` | L1179–L1184 | — |
| 函数 | `checkWave` | L1185–L1245 | — |

### 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） · L1245–L1274

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `screenShake` | L1246–L1246 | — |
| 常量 | `flashT` | L1247–L1247 | — |
| 常量 | `loseShakeUsed` | L1248–L1249 | — |
| 函数 | `triggerShake` | L1250–L1259 | — |
| 函数 | `triggerFlash` | L1260–L1263 | — |
| 函数 | `getShakeOffset` | L1264–L1275 | — |

### 渲染 · L1275–L1987

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `render` | L1276–L1299 | — |
| 常量 | `WARN_TOTAL` | L1300–L1300 | 「一大波僵尸即将来临」预警横幅 |
| 函数 | `drawWaveWarn` | L1301–L1366 | — |
| 函数 | `drawGameWorld` | L1367–L1563 | — |
| 函数 | `drawCorpsePart` | L1564–L1581 | F-02 死亡零件绘制（蓝图 §3）：head 带眼睛，其余为矩形；末 300ms 淡出 |
| 函数 | `drawShovelIcon` | L1582–L1602 | 铲子图标（供铲子槽 / 光标预览复用） |
| 函数 | `drawPlant` | L1603–L1642 | — |
| 函数 | `drawPlantInner` | L1643–L1814 | 原 drawPlant 绘制主体（阴影/各类型/血条），签名改为 (p, x, y) 以支持种植动画缩放平移 |
| 函数 | `drawZombie` | L1815–L1877 | — |
| 函数 | `drawProjectile` | L1878–L1918 | — |
| 函数 | `drawSun` | L1919–L1942 | — |
| 函数 | `drawParticle` | L1943–L1952 | — |
| 函数 | `drawShockwave` | L1953–L1971 | F-03 冲击波环（蓝图 §4）：easeOutCubic 扩散 8→180px，alpha 0.9→0，线宽 3→1.5 e.water（v1… |
| 函数 | `drawBoom` | L1972–L1990 | F-03 火球扩为 450ms 三色段（蓝图 §4）：白心→橙→红橙→透明，前 30% 涨后回缩 |

### D-11 圆角化（蓝图 §6） · L1988–L2342

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `RADIUS` | L1991–L1991 | 统一圆角矩形：现代浏览器 ctx.roundRect 原生支持，退化 arcTo 兼容旧内核。 rr 内不碰 alpha；调用方需半透明时自行 … |
| 函数 | `rr` | L1992–L2004 | — |
| 函数 | `drawCardBar` | L2005–L2054 | — |
| 函数 | `drawCardFace` | L2055–L2142 | — |
| 函数 | `drawStatus` | L2143–L2181 | — |
| 函数 | `drawMenu` | L2182–L2259 | — |
| 函数 | `drawPause` | L2260–L2270 | — |
| 函数 | `drawEnd` | L2271–L2342 | — |

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
