# 代码地图 · PvZ Lite

> **本文件由脚本生成，请勿手改**：`node tools/gen-code-map.mjs`
> 源文件：`plants-vs-zombies.html`（2430 行 · 69 个顶层函数 · 51 个顶层常量 · 11 个分区）
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
| 基础配置 | L35–L250 | 216 | 36 |
| 音效（WebAudio 实时合成，无外部文件） | L251–L458 | 208 | 18 |
| 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） | L459–L574 | 116 | 5 |
| 主循环 | L575–L615 | 41 | 5 |
| 输入 | L616–L832 | 217 | 7 |
| 游戏控制 | L833–L852 | 20 | 1 |
| 波次 | L853–L930 | 78 | 10 |
| 更新 | L931–L1281 | 351 | 10 |
| 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） | L1282–L1311 | 30 | 6 |
| 渲染 | L1312–L2072 | 761 | 14 |
| D-11 圆角化（蓝图 §6） | L2073–L2427 | 355 | 8 |

## 二、逐区明细

### 基础配置 · L35–L250

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
| 常量 | `ROOF_LIFT_H` | L47–L48 | — |
| 常量 | `VERSION` | L49–L50 | 版本号（KNOWN-ISSUES #6）：源码内嵌版本标识，便于仅凭文件本身判定版本 |
| 常量 | `DIFFS` | L51–L55 | — |
| 常量 | `DIFF` | L56–L60 | — |
| 常量 | `LEVELS` | L61–L147 | 关卡配置 L1 参考原版 PvZ 1-1：只有普通僵尸 + 少量路障 L2 参考原版 1-2：解锁快速僵尸，波次更长 |
| 常量 | `level` | L148–L148 | — |
| 常量 | `levelNo` | L149–L150 | — |
| 常量 | `unlockedLevel` | L151–L164 | 解锁进度持久化（2026-09-16）：localStorage 记录，加 URL 参数 ?level=2 可跳过解锁直进第二关 |
| 函数 | `storageGet` | L165–L167 | 存档读写统一入口（2026-09-16 · KNOWN-ISSUES #9）：隐私模式 / file:// 受限环境下静默降级，绝不抛错中断游戏 |
| 函数 | `storageSet` | L168–L172 | — |
| 常量 | `CARDS` | L173–L185 | 植物卡 |
| 常量 | `state` | L186–L187 | 状态 |
| 常量 | `highScore` | L188–L188 | — |
| 常量 | `plants` | L189–L191 | — |
| 函数 | `setState` | L192–L199 | 状态切换统一入口（带控制台留痕，方便排查“突然退出对局”这类偶现问题） |
| 函数 | `updateBest` | L200–L203 | 历史最高分落盘（仅当刷新纪录时写，减少 localStorage 写入，2026-09-16 #9） |
| 常量 | `toastMsg` | L204–L204 | 屏幕提示条（临时消息） |
| 函数 | `toast` | L205–L205 | — |
| 函数 | `drawToast` | L206–L223 | — |
| 常量 | `exitArm` | L224–L224 | 对局中返回菜单需要二次确认，避免误触/误按丢掉进度 |
| 函数 | `requestExit` | L225–L232 | — |
| 常量 | `R` | L233–L233 | 工具 |
| 常量 | `C` | L234–L236 | — |
| 函数 | `liftX` | L237–L240 | v1.3-M4 C2 屋顶抬升函数：返回该 x 处的抬升量（≥0 = 向上 = 屏幕 y 减小）。 ★ 单点 gate：!level.roof … |
| 函数 | `gridToPos` | L241–L244 | — |
| 函数 | `posToGrid` | L245–L248 | — |
| 函数 | `inGrid` | L249–L251 | — |

### 音效（WebAudio 实时合成，无外部文件） · L251–L458

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `audioCtx` | L252–L252 | — |
| 常量 | `audioQueue` | L253–L253 | — |
| 函数 | `ac` | L254–L264 | — |
| 函数 | `scheduleOrDefer` | L265–L268 | 排程守卫：上下文未 running（suspended/interrupted）时，直接排程的事件可能被整段丢弃 （用户反馈 2026-09-1… |
| 函数 | `flushAudioQueue` | L269–L277 | — |
| 函数 | `primeAudio` | L278–L286 | 音频管线预热：上下文刚创建时音频线程尚未就绪，会话首个音效常被整段吞掉 （用户反馈 2026-09-16：开局种植物没声音，之后的音效正常）。 … |
| 函数 | `armAudioUnlock` | L287–L308 | 兜底：任意一次用户手势都尝试恢复音频上下文（部分浏览器创建后仍保持 suspended） |
| 常量 | `BGM` | L309–L318 | + 低音层（sine 根音），C 大调五声，C-G-Am-F 和声进行。 音量按「经 env 总线 0.5 衰减后仍清晰可闻」标定（初版 0.0… |
| 函数 | `updateBGM` | L319–L328 | — |
| 函数 | `bgmTick` | L329–L360 | — |
| 常量 | `AudioBus` | L361–L367 | ---- 音频总线（ADR-004）：4 分组 GainNode + masterGain → destination ---- 分组默认音量：… |
| 常量 | `AUDIO_ROUTES` | L368–L373 | SFX 分组映射（tone/noise 默认走 event；战斗/UI 音效按需显式传分组）。 本表是「规格侧」的权威映射，运行时由各 SFX … |
| 函数 | `initAudioBus` | L374–L406 | — |
| 函数 | `tone` | L407–L411 | 单音：频率、时长、波形、音量、延迟、滑到目标频率 |
| 函数 | `scheduleTone` | L412–L425 | — |
| 函数 | `noise` | L426–L430 | 噪声：用于爆炸/挖掘/啃食。按 dur 就近取预生成 buffer 段（0.1/0.3/0.5s） |
| 函数 | `scheduleNoise` | L431–L453 | — |
| 函数 | `routeBus` | L454–L459 | 取输出总线：group 显式优先（SFX 调用点已标注所属分组）；缺省走 event。 总线未初始化（无头测试 / 降级）时直连 destina… |

### 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） · L459–L574

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `Easing` | L460–L473 | — |
| 常量 | `sfxGate` | L474–L474 | 节流：防止密集事件把音频糊成一团 |
| 函数 | `gate` | L475–L479 | — |
| 常量 | `SFX` | L480–L553 | — |
| 常量 | `SirenLoop` | L554–L575 | 采用「帧驱动」而非 setInterval： · 暂停时 update 不执行 → 警报天然同步暂停（§C.1 的暂停要求零额外代码） · 横幅… |

### 主循环 · L575–L615

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastT` | L576–L576 | — |
| 常量 | `lastDt` | L577–L577 | — |
| 常量 | `frameErr` | L578–L578 | — |
| 函数 | `loop` | L579–L604 | — |
| 函数 | `drawFrameErr` | L605–L616 | — |

### 输入 · L616–L832

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastMouseGrid` | L617–L630 | — |
| 函数 | `bindBtn` | L631–L643 | 按钮统一绑定：点完主动 blur，避免按钮保留焦点后被 Space/Enter 二次触发 |
| 函数 | `applyMuteUI` | L644–L659 | 静音按钮外观跟随 muted 状态（启动即按存档恢复，2026-09-16 #9） |
| 函数 | `onClick` | L660–L748 | — |
| 函数 | `onClickMenu` | L749–L766 | — |
| 函数 | `onClickEnd` | L767–L779 | — |
| 函数 | `onKey` | L780–L833 | — |

### 游戏控制 · L833–L852

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `startGame` | L834–L854 | — |

### 波次 · L853–L930

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `spawnQueue` | L855–L855 | 波次生成：用队列逐个放出，不是一次性全刷 |
| 常量 | `spawnTimer` | L856–L856 | — |
| 常量 | `waveInterval` | L857–L857 | — |
| 常量 | `waveActive` | L858–L858 | — |
| 常量 | `waveDrainedT` | L859–L862 | — |
| 常量 | `spawnGateZ` | L863–L863 | v1.3-M4 FIX-01 v2（口径修订 2026-09-19 20:52）：L1/L2（levelNo 1–2，1-based）全波次出怪… |
| 常量 | `spawnGateT` | L864–L866 | — |
| 常量 | `warn` | L867–L868 | 大波预警：active=横幅显示中，t=剩余秒数，last=已预警过的波次号， pending=倒计时已结束但还在等场上清空（横幅此时已隐藏，只… |
| 函数 | `newWave` | L869–L905 | — |
| 函数 | `processSpawnQueue` | L906–L931 | 从队列中逐个放出僵尸 |

### 更新 · L931–L1281

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `update` | L932–L983 | — |
| 函数 | `updatePlant` | L984–L1051 | — |
| 函数 | `explodeMine` | L1052–L1083 | dy 门槛 CELL_H*0.9=93.6 < 行高 CELL_H=104，相邻行恒不满足；同排时其 dx 门槛 CELL_W*0.5=45 又… |
| 函数 | `hasZombieAhead` | L1084–L1092 | — |
| 函数 | `updateProjectiles` | L1093–L1130 | — |
| 函数 | `updateZombies` | L1131–L1179 | — |
| 函数 | `spawnCorpseParts` | L1180–L1206 | F-02 死亡零件（蓝图 §3）：死亡 = 血雾（保留）+ 零件爆散，§G 粒子上限双保险 |
| 函数 | `killZombie` | L1207–L1215 | — |
| 函数 | `spawnBurst` | L1216–L1221 | — |
| 函数 | `checkWave` | L1222–L1282 | — |

### 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） · L1282–L1311

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `screenShake` | L1283–L1283 | — |
| 常量 | `flashT` | L1284–L1284 | — |
| 常量 | `loseShakeUsed` | L1285–L1286 | — |
| 函数 | `triggerShake` | L1287–L1296 | — |
| 函数 | `triggerFlash` | L1297–L1300 | — |
| 函数 | `getShakeOffset` | L1301–L1312 | — |

### 渲染 · L1312–L2072

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `render` | L1313–L1336 | — |
| 常量 | `WARN_TOTAL` | L1337–L1337 | 「一大波僵尸即将来临」预警横幅 |
| 函数 | `drawWaveWarn` | L1338–L1403 | — |
| 函数 | `drawGameWorld` | L1404–L1648 | — |
| 函数 | `drawCorpsePart` | L1649–L1666 | F-02 死亡零件绘制（蓝图 §3）：head 带眼睛，其余为矩形；末 300ms 淡出 |
| 函数 | `drawShovelIcon` | L1667–L1687 | 铲子图标（供铲子槽 / 光标预览复用） |
| 函数 | `drawPlant` | L1688–L1727 | — |
| 函数 | `drawPlantInner` | L1728–L1899 | 原 drawPlant 绘制主体（阴影/各类型/血条），签名改为 (p, x, y) 以支持种植动画缩放平移 |
| 函数 | `drawZombie` | L1900–L1962 | — |
| 函数 | `drawProjectile` | L1963–L2003 | — |
| 函数 | `drawSun` | L2004–L2027 | — |
| 函数 | `drawParticle` | L2028–L2037 | — |
| 函数 | `drawShockwave` | L2038–L2056 | F-03 冲击波环（蓝图 §4）：easeOutCubic 扩散 8→180px，alpha 0.9→0，线宽 3→1.5 e.water（v1… |
| 函数 | `drawBoom` | L2057–L2075 | F-03 火球扩为 450ms 三色段（蓝图 §4）：白心→橙→红橙→透明，前 30% 涨后回缩 |

### D-11 圆角化（蓝图 §6） · L2073–L2427

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `RADIUS` | L2076–L2076 | 统一圆角矩形：现代浏览器 ctx.roundRect 原生支持，退化 arcTo 兼容旧内核。 rr 内不碰 alpha；调用方需半透明时自行 … |
| 函数 | `rr` | L2077–L2089 | — |
| 函数 | `drawCardBar` | L2090–L2139 | — |
| 函数 | `drawCardFace` | L2140–L2227 | — |
| 函数 | `drawStatus` | L2228–L2266 | — |
| 函数 | `drawMenu` | L2267–L2344 | — |
| 函数 | `drawPause` | L2345–L2355 | — |
| 函数 | `drawEnd` | L2356–L2427 | — |

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
