# ADR-004 · WebAudio 总线架构

- 状态：**Accepted**（Phase 6.5 · T1）
- 日期：2026-09-15
- 决策人：程基岩（engineering-lead），主理人汇编
- 关联：`ADR-003-canvas2d-webaudio-synthesis.md`、`design/audio-guide.md` §D.1

---

## 上下文（Context）

`ADR-003` 只决策了"用 WebAudio **实时合成**音效，不用采样文件"，但**没有**决策声音节点如何组织——当前实现是 `tone()`/`noise()` 生成的 osc/noise 直连 `ctx.destination`（零分组、零总线）。

音频总监（阮和鸣）在 `design/audio-guide.md` §D.1 指出的问题：

| 问题 | 后果 |
|---|---|
| 所有音效直连 `destination` | 无法做**分组音量**（战斗/UI/事件各自调） |
| 无主闸（master gain） | 静音只能靠业务层 `if(muted)return` 短路，未来加 BGM 无法一键静音 |
| BGM 方案 C 依赖淡入淡出 | 无总线则 BGM 接入无挂载点 |
| `noise()` 每帧 `createBuffer` + O(N) 填充 | perf-profile §4.5 指出每帧 ~13 次 `createRadialGradient` 同级热路径，noise 填充是隐藏开销 |

因此需要在 ADR-003 之上补一层"声音怎么组织"的决策。

---

## 决策（Decision）

采用 **4 分组总线 + masterGain 主闸 + noise 缓冲预生成** 三层结构：

```
osc / noiseSource / BGM
    │  (按 SFX 事件路由到分组)
    ▼
┌──────────┬──────────┬──────────┬──────────┐
│ battle   │ event    │ ui       │ env      │   ← 4 分组 GainNode
│  gain=1.0│  gain=0.9│  gain=0.6│  gain=0.5 │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┘
     └──────────┴──────────┴──────────┘
                        ▼
                 masterGain（主闸）
                 gain = muted ? 0 : 1
                        ▼
                   ctx.destination
```

1. **`AudioBus`**：`{ ctx, master, buses:{battle,event,ui,env}, noiseBufs:{}, levels:{...} }`，`initAudioBus(c)` 幂等（同一 `AudioContext` 只建一次）。
2. **分组路由**：`AUDIO_ROUTES` 静态映射表（`SFX` 调用点已按音效性质标注分组，`tone()`/`noise()` 末参 `group` 决定连哪个 bus；缺省回退 `event`）。
3. **主闸静音**：`muted` 切换只改 `masterGain.gain = muted ? 0 : 1`，**不再**走业务层 `if(muted)return` 短路——保证未来 BGM/分通道音频都能被一键静音。
4. **noise 缓冲预生成**：初始化时一次性 `createBuffer` 3 档（0.1/0.3/0.5s）填充到 `AudioBus.noiseBufs`；`noise(dur)` 改为**就近取一档预生成 buffer** + `createBufferSource` 复用，**不再每帧新建 buffer**。对应 perf-profile §4.5 优化建议 #3。

---

## 备选方案（Alternatives）

### A. 单分组总线（所有音效走一个 bus）
**否决**。无法做分组音量（战斗声与 UI 声不能独立调），违背 audio-guide 的 4 分组混音策略。

### B. 直连 destination（现状）
**否决**。BGM 方案 C 落不了地（无 BGM 挂载点）、无法分组调音量、静音只能业务层短路（BGM 加进来后短路不干净）。

### C. per-voice gain（每个 osc 单独一个 gain，无 bus）
**否决**。每声源一个 GainNode，密集战斗时节点数爆炸（30 僵尸同屏 = 几十个 osc 各挂 gain），GC 压力反而更大，且仍无分组语义。

---

## 后果（Consequences）

**正面**
- BGM 方案 C（audio-guide §C 推荐）有了标准挂载点（挂到 `env` 或独立 `music` bus）
- 分组音量可调（`AudioBus.levels` 暴露，未来可做设置页）
- 静音语义干净（主闸），BGM/分通道一键静默
- noise 缓冲预生成消除每帧 `createBuffer` 热路径（perf-profile §4.5 建议 #3，估省 20-40ms/s）

**负面**
- 多 5 个常驻 `GainNode`（4 分组 + 1 master），初始化时建一次，常态无 GC 压力
- `SFX` 每个调用点需正确标注 `group`（漏标回退 `event`，语义近似但不精确）——已用 `AUDIO_ROUTES` 静态表统一标注，降低出错面
- 维护 `AUDIO_ROUTES` 分组映射表（新增音效要定分组）

---

## 触发复审信号（Revisit Triggers）

出现以下任一情况时，重评审本 ADR：

1. **音效种类 > 40 个**：静态 `AUDIO_ROUTES` 表开始难维护，考虑改为"按命名前缀自动路由"或数据驱动。
2. **需要 3D 空间音频 / 定位**：`PannerNode`/`ChannelMergerNode` 需进总线，当前扁平 4 分组不够。
3. **多轨 BGM / 动态音乐层**：需要独立 `music` bus + 叠层淡入淡出，当前 4 分组需扩展。
4. **切换渲染引擎或音频引擎**（Phaser/Tone.js/Web Audio 之外）：本 ADR 基于原生 WebAudio 扁平总线，换引擎则整体重做。
