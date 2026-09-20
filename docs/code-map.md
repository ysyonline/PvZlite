# 代码地图 · PvZ Lite

> **本文件由脚本生成，请勿手改**：`node tools/gen-code-map.mjs`
> 源文件：`plants-vs-zombies.html`（2507 行 · 69 个顶层函数 · 54 个顶层常量 · 11 个分区）
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
| 基础配置 | L35–L257 | 223 | 37 |
| 音效（WebAudio 实时合成，无外部文件） | L258–L465 | 208 | 18 |
| 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） | L466–L581 | 116 | 5 |
| 主循环 | L582–L622 | 41 | 5 |
| 输入 | L623–L849 | 227 | 7 |
| 游戏控制 | L850–L870 | 21 | 1 |
| 波次 | L871–L948 | 78 | 10 |
| 更新 | L949–L1300 | 352 | 10 |
| 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） | L1301–L1330 | 30 | 6 |
| 渲染 | L1331–L2131 | 801 | 16 |
| D-11 圆角化（蓝图 §6） | L2132–L2504 | 373 | 8 |

## 二、逐区明细

### 基础配置 · L35–L257

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
| 常量 | `unlockedLevel` | L151–L165 | 解锁进度持久化（2026-09-16）：localStorage 记录，加 URL 参数 ?level=2 可跳过解锁直进第二关 |
| 常量 | `testMode` | L166–L171 | 测试模式（2026-09-20 用户需求）：URL 带 ?test=1 开启——阳光锁 9999 无限种植物，方便验收测试 仅本地娱乐/测试用，… |
| 函数 | `storageGet` | L172–L174 | 存档读写统一入口（2026-09-16 · KNOWN-ISSUES #9）：隐私模式 / file:// 受限环境下静默降级，绝不抛错中断游戏 |
| 函数 | `storageSet` | L175–L179 | — |
| 常量 | `CARDS` | L180–L192 | 植物卡 |
| 常量 | `state` | L193–L194 | 状态 |
| 常量 | `highScore` | L195–L195 | — |
| 常量 | `plants` | L196–L198 | — |
| 函数 | `setState` | L199–L206 | 状态切换统一入口（带控制台留痕，方便排查“突然退出对局”这类偶现问题） |
| 函数 | `updateBest` | L207–L210 | 历史最高分落盘（仅当刷新纪录时写，减少 localStorage 写入，2026-09-16 #9） |
| 常量 | `toastMsg` | L211–L211 | 屏幕提示条（临时消息） |
| 函数 | `toast` | L212–L212 | — |
| 函数 | `drawToast` | L213–L230 | — |
| 常量 | `exitArm` | L231–L231 | 对局中返回菜单需要二次确认，避免误触/误按丢掉进度 |
| 函数 | `requestExit` | L232–L239 | — |
| 常量 | `R` | L240–L240 | 工具 |
| 常量 | `C` | L241–L243 | — |
| 函数 | `liftX` | L244–L247 | v1.3-M4 C2 屋顶抬升函数：返回该 x 处的抬升量（≥0 = 向上 = 屏幕 y 减小）。 ★ 单点 gate：!level.roof … |
| 函数 | `gridToPos` | L248–L251 | — |
| 函数 | `posToGrid` | L252–L255 | — |
| 函数 | `inGrid` | L256–L258 | — |

### 音效（WebAudio 实时合成，无外部文件） · L258–L465

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `audioCtx` | L259–L259 | — |
| 常量 | `audioQueue` | L260–L260 | — |
| 函数 | `ac` | L261–L271 | — |
| 函数 | `scheduleOrDefer` | L272–L275 | 排程守卫：上下文未 running（suspended/interrupted）时，直接排程的事件可能被整段丢弃 （用户反馈 2026-09-1… |
| 函数 | `flushAudioQueue` | L276–L284 | — |
| 函数 | `primeAudio` | L285–L293 | 音频管线预热：上下文刚创建时音频线程尚未就绪，会话首个音效常被整段吞掉 （用户反馈 2026-09-16：开局种植物没声音，之后的音效正常）。 … |
| 函数 | `armAudioUnlock` | L294–L315 | 兜底：任意一次用户手势都尝试恢复音频上下文（部分浏览器创建后仍保持 suspended） |
| 常量 | `BGM` | L316–L325 | + 低音层（sine 根音），C 大调五声，C-G-Am-F 和声进行。 音量按「经 env 总线 0.5 衰减后仍清晰可闻」标定（初版 0.0… |
| 函数 | `updateBGM` | L326–L335 | — |
| 函数 | `bgmTick` | L336–L367 | — |
| 常量 | `AudioBus` | L368–L374 | ---- 音频总线（ADR-004）：4 分组 GainNode + masterGain → destination ---- 分组默认音量：… |
| 常量 | `AUDIO_ROUTES` | L375–L380 | SFX 分组映射（tone/noise 默认走 event；战斗/UI 音效按需显式传分组）。 本表是「规格侧」的权威映射，运行时由各 SFX … |
| 函数 | `initAudioBus` | L381–L413 | — |
| 函数 | `tone` | L414–L418 | 单音：频率、时长、波形、音量、延迟、滑到目标频率 |
| 函数 | `scheduleTone` | L419–L432 | — |
| 函数 | `noise` | L433–L437 | 噪声：用于爆炸/挖掘/啃食。按 dur 就近取预生成 buffer 段（0.1/0.3/0.5s） |
| 函数 | `scheduleNoise` | L438–L460 | — |
| 函数 | `routeBus` | L461–L466 | 取输出总线：group 显式优先（SFX 调用点已标注所属分组）；缺省走 event。 总线未初始化（无头测试 / 降级）时直连 destina… |

### 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） · L466–L581

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `Easing` | L467–L480 | — |
| 常量 | `sfxGate` | L481–L481 | 节流：防止密集事件把音频糊成一团 |
| 函数 | `gate` | L482–L486 | — |
| 常量 | `SFX` | L487–L560 | — |
| 常量 | `SirenLoop` | L561–L582 | 采用「帧驱动」而非 setInterval： · 暂停时 update 不执行 → 警报天然同步暂停（§C.1 的暂停要求零额外代码） · 横幅… |

### 主循环 · L582–L622

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastT` | L583–L583 | — |
| 常量 | `lastDt` | L584–L584 | — |
| 常量 | `frameErr` | L585–L585 | — |
| 函数 | `loop` | L586–L611 | — |
| 函数 | `drawFrameErr` | L612–L623 | — |

### 输入 · L623–L849

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastMouseGrid` | L624–L637 | — |
| 函数 | `bindBtn` | L638–L650 | 按钮统一绑定：点完主动 blur，避免按钮保留焦点后被 Space/Enter 二次触发 |
| 函数 | `applyMuteUI` | L651–L666 | 静音按钮外观跟随 muted 状态（启动即按存档恢复，2026-09-16 #9） |
| 函数 | `onClick` | L667–L765 | — |
| 函数 | `onClickMenu` | L766–L783 | — |
| 函数 | `onClickEnd` | L784–L796 | — |
| 函数 | `onKey` | L797–L850 | — |

### 游戏控制 · L850–L870

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `startGame` | L851–L872 | — |

### 波次 · L871–L948

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `spawnQueue` | L873–L873 | 波次生成：用队列逐个放出，不是一次性全刷 |
| 常量 | `spawnTimer` | L874–L874 | — |
| 常量 | `waveInterval` | L875–L875 | — |
| 常量 | `waveActive` | L876–L876 | — |
| 常量 | `waveDrainedT` | L877–L880 | — |
| 常量 | `spawnGateZ` | L881–L881 | v1.3-M4 FIX-01 v2（口径修订 2026-09-19 20:52）：L1/L2（levelNo 1–2，1-based）全波次出怪… |
| 常量 | `spawnGateT` | L882–L884 | — |
| 常量 | `warn` | L885–L886 | 大波预警：active=横幅显示中，t=剩余秒数，last=已预警过的波次号， pending=倒计时已结束但还在等场上清空（横幅此时已隐藏，只… |
| 函数 | `newWave` | L887–L923 | — |
| 函数 | `processSpawnQueue` | L924–L949 | 从队列中逐个放出僵尸 |

### 更新 · L949–L1300

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `update` | L950–L1002 | — |
| 函数 | `updatePlant` | L1003–L1070 | — |
| 函数 | `explodeMine` | L1071–L1102 | dy 门槛 CELL_H*0.9=93.6 < 行高 CELL_H=104，相邻行恒不满足；同排时其 dx 门槛 CELL_W*0.5=45 又… |
| 函数 | `hasZombieAhead` | L1103–L1111 | — |
| 函数 | `updateProjectiles` | L1112–L1149 | — |
| 函数 | `updateZombies` | L1150–L1198 | — |
| 函数 | `spawnCorpseParts` | L1199–L1225 | F-02 死亡零件（蓝图 §3）：死亡 = 血雾（保留）+ 零件爆散，§G 粒子上限双保险 |
| 函数 | `killZombie` | L1226–L1234 | — |
| 函数 | `spawnBurst` | L1235–L1240 | — |
| 函数 | `checkWave` | L1241–L1301 | — |

### 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） · L1301–L1330

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `screenShake` | L1302–L1302 | — |
| 常量 | `flashT` | L1303–L1303 | — |
| 常量 | `loseShakeUsed` | L1304–L1305 | — |
| 函数 | `triggerShake` | L1306–L1315 | — |
| 函数 | `triggerFlash` | L1316–L1319 | — |
| 函数 | `getShakeOffset` | L1320–L1331 | — |

### 渲染 · L1331–L2131

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `render` | L1332–L1355 | — |
| 常量 | `WARN_TOTAL` | L1356–L1356 | 「一大波僵尸即将来临」预警横幅 |
| 函数 | `drawWaveWarn` | L1357–L1422 | — |
| 函数 | `drawGameWorld` | L1423–L1680 | — |
| 函数 | `drawCorpsePart` | L1681–L1698 | F-02 死亡零件绘制（蓝图 §3）：head 带眼睛，其余为矩形；末 300ms 淡出 |
| 函数 | `drawShovelIcon` | L1699–L1723 | 铲子图标（供铲子槽 / 光标预览复用） |
| 常量 | `POT_LIFT` | L1724–L1724 | 花盆自身下沉 POT_SINK px 落到格底——错位后盆口沿/盆身/盆底全部可见，植物底缘正好立在盆口，还原"种在盆里"的层次。 几何：豌豆底… |
| 常量 | `onPot` | L1725–L1726 | — |
| 函数 | `drawPlant` | L1727–L1769 | — |
| 函数 | `drawPlantInner` | L1770–L1958 | 原 drawPlant 绘制主体（阴影/各类型/血条），签名改为 (p, x, y) 以支持种植动画缩放平移 |
| 函数 | `drawZombie` | L1959–L2021 | — |
| 函数 | `drawProjectile` | L2022–L2062 | — |
| 函数 | `drawSun` | L2063–L2086 | — |
| 函数 | `drawParticle` | L2087–L2096 | — |
| 函数 | `drawShockwave` | L2097–L2115 | F-03 冲击波环（蓝图 §4）：easeOutCubic 扩散 8→180px，alpha 0.9→0，线宽 3→1.5 e.water（v1… |
| 函数 | `drawBoom` | L2116–L2134 | F-03 火球扩为 450ms 三色段（蓝图 §4）：白心→橙→红橙→透明，前 30% 涨后回缩 |

### D-11 圆角化（蓝图 §6） · L2132–L2504

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `RADIUS` | L2135–L2135 | 统一圆角矩形：现代浏览器 ctx.roundRect 原生支持，退化 arcTo 兼容旧内核。 rr 内不碰 alpha；调用方需半透明时自行 … |
| 函数 | `rr` | L2136–L2148 | — |
| 函数 | `drawCardBar` | L2149–L2198 | — |
| 函数 | `drawCardFace` | L2199–L2298 | — |
| 函数 | `drawStatus` | L2299–L2343 | — |
| 函数 | `drawMenu` | L2344–L2421 | — |
| 函数 | `drawPause` | L2422–L2432 | — |
| 函数 | `drawEnd` | L2433–L2504 | — |

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
