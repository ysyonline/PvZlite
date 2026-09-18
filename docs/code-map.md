# 代码地图 · PvZ Lite

> **本文件由脚本生成，请勿手改**：`node tools/gen-code-map.mjs`
> 源文件：`plants-vs-zombies.html`（2278 行 · 68 个顶层函数 · 46 个顶层常量 · 11 个分区）
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
| 基础配置 | L35–L233 | 199 | 32 |
| 音效（WebAudio 实时合成，无外部文件） | L234–L441 | 208 | 18 |
| 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） | L442–L557 | 116 | 5 |
| 主循环 | L558–L598 | 41 | 5 |
| 输入 | L599–L815 | 217 | 7 |
| 游戏控制 | L816–L834 | 19 | 1 |
| 波次 | L835–L898 | 64 | 8 |
| 更新 | L899–L1242 | 344 | 10 |
| 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） | L1243–L1272 | 30 | 6 |
| 渲染 | L1273–L1920 | 648 | 14 |
| D-11 圆角化（蓝图 §6） | L1921–L2275 | 355 | 8 |

## 二、逐区明细

### 基础配置 · L35–L233

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `canvas` | L36–L36 | — |
| 常量 | `COLS` | L37–L37 | — |
| 常量 | `WATER_ROWS` | L38–L38 | — |
| 常量 | `CARD_H` | L39–L39 | — |
| 常量 | `SHOVEL_X` | L40–L40 | — |
| 常量 | `CARD_X0` | L41–L41 | — |
| 常量 | `CABBAGE_VX` | L42–L43 | — |
| 常量 | `VERSION` | L44–L45 | 版本号（KNOWN-ISSUES #6）：源码内嵌版本标识，便于仅凭文件本身判定版本 |
| 常量 | `DIFFS` | L46–L50 | — |
| 常量 | `DIFF` | L51–L55 | — |
| 常量 | `LEVELS` | L56–L142 | 关卡配置 L1 参考原版 PvZ 1-1：只有普通僵尸 + 少量路障 L2 参考原版 1-2：解锁快速僵尸，波次更长 |
| 常量 | `level` | L143–L143 | — |
| 常量 | `levelNo` | L144–L145 | — |
| 常量 | `unlockedLevel` | L146–L159 | 解锁进度持久化（2026-09-16）：localStorage 记录，加 URL 参数 ?level=2 可跳过解锁直进第二关 |
| 函数 | `storageGet` | L160–L162 | 存档读写统一入口（2026-09-16 · KNOWN-ISSUES #9）：隐私模式 / file:// 受限环境下静默降级，绝不抛错中断游戏 |
| 函数 | `storageSet` | L163–L167 | — |
| 常量 | `CARDS` | L168–L180 | 植物卡 |
| 常量 | `state` | L181–L182 | 状态 |
| 常量 | `highScore` | L183–L183 | — |
| 常量 | `plants` | L184–L186 | — |
| 函数 | `setState` | L187–L194 | 状态切换统一入口（带控制台留痕，方便排查“突然退出对局”这类偶现问题） |
| 函数 | `updateBest` | L195–L198 | 历史最高分落盘（仅当刷新纪录时写，减少 localStorage 写入，2026-09-16 #9） |
| 常量 | `toastMsg` | L199–L199 | 屏幕提示条（临时消息） |
| 函数 | `toast` | L200–L200 | — |
| 函数 | `drawToast` | L201–L218 | — |
| 常量 | `exitArm` | L219–L219 | 对局中返回菜单需要二次确认，避免误触/误按丢掉进度 |
| 函数 | `requestExit` | L220–L227 | — |
| 常量 | `R` | L228–L228 | 工具 |
| 常量 | `C` | L229–L229 | — |
| 函数 | `gridToPos` | L230–L230 | — |
| 函数 | `posToGrid` | L231–L231 | — |
| 函数 | `inGrid` | L232–L234 | — |

### 音效（WebAudio 实时合成，无外部文件） · L234–L441

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `audioCtx` | L235–L235 | — |
| 常量 | `audioQueue` | L236–L236 | — |
| 函数 | `ac` | L237–L247 | — |
| 函数 | `scheduleOrDefer` | L248–L251 | 排程守卫：上下文未 running（suspended/interrupted）时，直接排程的事件可能被整段丢弃 （用户反馈 2026-09-1… |
| 函数 | `flushAudioQueue` | L252–L260 | — |
| 函数 | `primeAudio` | L261–L269 | 音频管线预热：上下文刚创建时音频线程尚未就绪，会话首个音效常被整段吞掉 （用户反馈 2026-09-16：开局种植物没声音，之后的音效正常）。 … |
| 函数 | `armAudioUnlock` | L270–L291 | 兜底：任意一次用户手势都尝试恢复音频上下文（部分浏览器创建后仍保持 suspended） |
| 常量 | `BGM` | L292–L301 | + 低音层（sine 根音），C 大调五声，C-G-Am-F 和声进行。 音量按「经 env 总线 0.5 衰减后仍清晰可闻」标定（初版 0.0… |
| 函数 | `updateBGM` | L302–L311 | — |
| 函数 | `bgmTick` | L312–L343 | — |
| 常量 | `AudioBus` | L344–L350 | ---- 音频总线（ADR-004）：4 分组 GainNode + masterGain → destination ---- 分组默认音量：… |
| 常量 | `AUDIO_ROUTES` | L351–L356 | SFX 分组映射（tone/noise 默认走 event；战斗/UI 音效按需显式传分组）。 本表是「规格侧」的权威映射，运行时由各 SFX … |
| 函数 | `initAudioBus` | L357–L389 | — |
| 函数 | `tone` | L390–L394 | 单音：频率、时长、波形、音量、延迟、滑到目标频率 |
| 函数 | `scheduleTone` | L395–L408 | — |
| 函数 | `noise` | L409–L413 | 噪声：用于爆炸/挖掘/啃食。按 dur 就近取预生成 buffer 段（0.1/0.3/0.5s） |
| 函数 | `scheduleNoise` | L414–L436 | — |
| 函数 | `routeBus` | L437–L442 | 取输出总线：group 显式优先（SFX 调用点已标注所属分组）；缺省走 event。 总线未初始化（无头测试 / 降级）时直连 destina… |

### 公共依赖 · Easing 缓动库（F-01/F-03/F-04 引用，feel-impl-skeleton §8） · L442–L557

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `Easing` | L443–L456 | — |
| 常量 | `sfxGate` | L457–L457 | 节流：防止密集事件把音频糊成一团 |
| 函数 | `gate` | L458–L462 | — |
| 常量 | `SFX` | L463–L536 | — |
| 常量 | `SirenLoop` | L537–L558 | 采用「帧驱动」而非 setInterval： · 暂停时 update 不执行 → 警报天然同步暂停（§C.1 的暂停要求零额外代码） · 横幅… |

### 主循环 · L558–L598

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastT` | L559–L559 | — |
| 常量 | `lastDt` | L560–L560 | — |
| 常量 | `frameErr` | L561–L561 | — |
| 函数 | `loop` | L562–L587 | — |
| 函数 | `drawFrameErr` | L588–L599 | — |

### 输入 · L599–L815

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `lastMouseGrid` | L600–L613 | — |
| 函数 | `bindBtn` | L614–L626 | 按钮统一绑定：点完主动 blur，避免按钮保留焦点后被 Space/Enter 二次触发 |
| 函数 | `applyMuteUI` | L627–L642 | 静音按钮外观跟随 muted 状态（启动即按存档恢复，2026-09-16 #9） |
| 函数 | `onClick` | L643–L731 | — |
| 函数 | `onClickMenu` | L732–L749 | — |
| 函数 | `onClickEnd` | L750–L762 | — |
| 函数 | `onKey` | L763–L816 | — |

### 游戏控制 · L816–L834

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `startGame` | L817–L836 | — |

### 波次 · L835–L898

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `spawnQueue` | L837–L837 | 波次生成：用队列逐个放出，不是一次性全刷 |
| 常量 | `spawnTimer` | L838–L838 | — |
| 常量 | `waveInterval` | L839–L839 | — |
| 常量 | `waveActive` | L840–L840 | — |
| 常量 | `waveDrainedT` | L841–L843 | — |
| 常量 | `warn` | L844–L845 | 大波预警：active=横幅显示中，t=剩余秒数，last=已预警过的波次号， pending=倒计时已结束但还在等场上清空（横幅此时已隐藏，只… |
| 函数 | `newWave` | L846–L882 | — |
| 函数 | `processSpawnQueue` | L883–L899 | 从队列中逐个放出僵尸 |

### 更新 · L899–L1242

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `update` | L900–L951 | — |
| 函数 | `updatePlant` | L952–L1016 | — |
| 函数 | `explodeMine` | L1017–L1048 | dy 门槛 CELL_H*0.9=93.6 < 行高 CELL_H=104，相邻行恒不满足；同排时其 dx 门槛 CELL_W*0.5=45 又… |
| 函数 | `hasZombieAhead` | L1049–L1057 | — |
| 函数 | `updateProjectiles` | L1058–L1091 | — |
| 函数 | `updateZombies` | L1092–L1140 | — |
| 函数 | `spawnCorpseParts` | L1141–L1167 | F-02 死亡零件（蓝图 §3）：死亡 = 血雾（保留）+ 零件爆散，§G 粒子上限双保险 |
| 函数 | `killZombie` | L1168–L1176 | — |
| 函数 | `spawnBurst` | L1177–L1182 | — |
| 函数 | `checkWave` | L1183–L1243 | — |

### 屏幕震动（F-04 · B.4，feel-impl-skeleton §1） · L1243–L1272

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `screenShake` | L1244–L1244 | — |
| 常量 | `flashT` | L1245–L1245 | — |
| 常量 | `loseShakeUsed` | L1246–L1247 | — |
| 函数 | `triggerShake` | L1248–L1257 | — |
| 函数 | `triggerFlash` | L1258–L1261 | — |
| 函数 | `getShakeOffset` | L1262–L1273 | — |

### 渲染 · L1273–L1920

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 函数 | `render` | L1274–L1297 | — |
| 常量 | `WARN_TOTAL` | L1298–L1298 | 「一大波僵尸即将来临」预警横幅 |
| 函数 | `drawWaveWarn` | L1299–L1364 | — |
| 函数 | `drawGameWorld` | L1365–L1496 | — |
| 函数 | `drawCorpsePart` | L1497–L1514 | F-02 死亡零件绘制（蓝图 §3）：head 带眼睛，其余为矩形；末 300ms 淡出 |
| 函数 | `drawShovelIcon` | L1515–L1535 | 铲子图标（供铲子槽 / 光标预览复用） |
| 函数 | `drawPlant` | L1536–L1575 | — |
| 函数 | `drawPlantInner` | L1576–L1747 | 原 drawPlant 绘制主体（阴影/各类型/血条），签名改为 (p, x, y) 以支持种植动画缩放平移 |
| 函数 | `drawZombie` | L1748–L1810 | — |
| 函数 | `drawProjectile` | L1811–L1851 | — |
| 函数 | `drawSun` | L1852–L1875 | — |
| 函数 | `drawParticle` | L1876–L1885 | — |
| 函数 | `drawShockwave` | L1886–L1904 | F-03 冲击波环（蓝图 §4）：easeOutCubic 扩散 8→180px，alpha 0.9→0，线宽 3→1.5 e.water（v1… |
| 函数 | `drawBoom` | L1905–L1923 | F-03 火球扩为 450ms 三色段（蓝图 §4）：白心→橙→红橙→透明，前 30% 涨后回缩 |

### D-11 圆角化（蓝图 §6） · L1921–L2275

| 类型 | 名称 | 行号区间 | 说明 |
|---|---|---|---|
| 常量 | `RADIUS` | L1924–L1924 | 统一圆角矩形：现代浏览器 ctx.roundRect 原生支持，退化 arcTo 兼容旧内核。 rr 内不碰 alpha；调用方需半透明时自行 … |
| 函数 | `rr` | L1925–L1937 | — |
| 函数 | `drawCardBar` | L1938–L1987 | — |
| 函数 | `drawCardFace` | L1988–L2075 | — |
| 函数 | `drawStatus` | L2076–L2114 | — |
| 函数 | `drawMenu` | L2115–L2192 | — |
| 函数 | `drawPause` | L2193–L2203 | — |
| 函数 | `drawEnd` | L2204–L2275 | — |

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
