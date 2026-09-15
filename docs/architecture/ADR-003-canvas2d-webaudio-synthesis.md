# ADR-003 · Canvas 2D + WebAudio 合成音效

- **状态**：Accepted（Phase 6 复盘确认）
- **日期**：2026-09-15
- **决策者**：程基岩（engineering-lead），主理人游承峰备案
- **相关 README**：`README.md` L5「技术栈」；`README.md` L96–L112「加一种植物 / 加一种僵尸」；`README.md` L168「已知陷阱 · 第 6 条」

## 上下文（Context）

需要为 PvZ Lite 选定两个基础层组件：

1. **图形渲染后端**：Canvas 2D / Canvas 3D (WebGL) / DOM + CSS / SVG / PixiJS 等。
2. **音频后端**：WebAudio 合成（OscillatorNode / BufferSource + 滤波） / 采样音频文件（mp3 / ogg / wav）。

约束（承接 ADR-001）：

- 零依赖、零构建、零外部资产。
- 单 HTML 文件，双击即玩。
- 无头测试环境无浏览器、无用户手势 → 音频必须优雅降级（silence OK）。
- 目标平台仅 PC 浏览器。

## 决策（Decision）

**采用 Canvas 2D 作渲染后端 + WebAudio 实时合成音效**。

### 图形：Canvas 2D
- 单一 `<canvas id="canvas" width="1000" height="680">` 承载全部绘制。
- 所有几何用 `ctx.beginPath/ellipse/arc/fill/stroke` 组合；不使用任何外部图片、字体、图标库。
- 阴影、渐变、粒子、动画全部通过 Canvas 2D API 组合。
- 文本用系统字体（`"Microsoft YaHei"`, `"PingFang SC"`, `Impact` 等），不加载 woff2。

### 音频：WebAudio 实时合成
- `ac()` 惰性创建 `AudioContext`，在**首次用户手势**（点开始 / 点静音）时才 `resume()`，符合浏览器自动播放策略。
- 全部音效通过 `tone()`（Oscillator + Gain + 可选 exponentialRamp）与 `noise()`（BufferSource + BiquadFilter）两个基础函数合成。
- 12 种音效（plant / sun / shovel / shoot / hit / death / boom / chomp / wave / siren / win / lose / deny）都是这两个基础函数的参数化组合。
- `sfxGate` 节流表：`shoot` 0.13s / `hit` 0.06s / `death` 0.07s / `chomp` 0.42s，防止密集事件把音频糊成一团。
- 所有 `SFX[k]` 用 try/catch 包裹，任何音频异常都不影响主循环（`plants-vs-zombies.html` L219–L223）。
- 无头测试环境无 `window.AudioContext` → `ac()` 返回 null → `tone()` / `noise()` 静默返回（README L168）。

## 备选方案（Alternatives Considered）

### 图形

#### A. WebGL / Three.js
- 优点：GPU 加速、支持大规模粒子。
- **否决理由**：
  1. 引入 Three.js ≈ 600KB 库，违反零依赖。
  2. 2D 塔防场景的实体数（≤ 60 植物 + 60 僵尸 + 100 粒子 = ~220 物体）离 WebGL 阈值差 100 倍。
  3. Canvas 2D 已能维持 60fps（估算 ~1500 draw calls/帧，见 `perf-profile.md`）。
  4. 无头测试的 ctx Proxy stub 是 Canvas 2D 原生 API，WebGL API 需要重写 stub。

#### B. DOM + CSS 元素
- 优点：原生支持 CSS 动画、事件、无障碍；文本自然可访问。
- **否决理由**：
  1. 每个植物/僵尸/子弹是一个 DOM 节点，大波时 60 个僵尸 = 60 个 DOM 节点 + 阴影 + 血条 = ~200 DOM 节点，浏览器合成器压力大。
  2. CSS transform 动画与游戏逻辑的 `dt` 时钟天然冲突（CSS 无 `gameSpeed` 概念）。
  3. Canvas 单张位图 vs DOM 大量节点，前者更稳定。

#### C. SVG
- 优点：可缩放、可编辑、天然矢量。
- **否决理由**：
  1. SVG 修改一次触发 reflow/repaint 一整棵子树，动画性能远差于 Canvas。
  2. 大波时 DOM/SVG 节点规模同 B，同样问题。
  3. 无头测试需 jsdom，复杂度上升。

### 音频

#### A. mp3 / ogg 采样音效文件
- 优点：音质高、可精细调音、可跨设备一致。
- **否决理由**：
  1. 引入 12+ 音频文件，违反"零外部资产"（ADR-001 后果 · 1）。
  2. 需要 Base64 内嵌 → 每文件 5–30KB → 总 HTML 体积膨胀 200KB+。
  3. 需要处理 preload、缓存、CORS 策略。
  4. 浏览器自动播放策略对 `<audio>` 更严格。

#### B. Howler.js / Tone.js 库
- 优点：抽象音频 API，兼容性好。
- **否决理由**：
  1. Howler.js ~40KB，Tone.js ~200KB；违反零依赖。
  2. 本项目的音频需求（12 种短音效、单通道、无和弦）用原生 WebAudio 已足。
  3. 库抽象层让"读一眼懂一个 tone 调用"这类可读性丢失。

#### C. 无音频
- 优点：最简单。
- **否决理由**：
  1. PvZ 的核心反馈是"豌豆击中僵尸"、"爆米花大波"，无音效会让节奏感塌陷。
  2. 音效本身是内容的一部分，用户 README L203 明确列为功能。

## 后果（Consequences）

### 正面
1. **零依赖 + 零资产**：整个 HTML 就是全部；离线可玩；无 CDN 依赖。
2. **无头测试优雅降级**：`window.AudioContext` 未定义时 `ac()` 返回 null，`tone()` 静默返回，测试环境不抛错。
3. **可控且可预测**：所有音效都是纯函数参数化，无采样对齐问题；改一个频率就能改一个音色。
4. **体积可控**：整个游戏 HTML 约 60KB（未压缩），比任何含音频文件的方案都小。
5. **调试友好**：`tone()` 参数写在 `SFX` 表里，一眼能看懂每段音效的形状。

### 负面
1. **音质受限于合成**：无法表达真实乐器的复杂谐波；对音乐发烧友无吸引力。
2. **首次合成有延迟**：`noise()` 的 BufferSource 每次触发都 `createBuffer` + 循环填充，密集音效下有 CPU 尖峰（见 `perf-profile.md` §3.5）。
3. **多音冲突**：`siren` 一次触发 7 个 tone，密集时会有 60+ 个 Oscillator 并发；`sfxGate` 只能部分缓解。
4. **无头测试无音频回归**：无法自动验证"音效确实响了"，只能人工听。
5. **浏览器策略依赖**：某些浏览器在 iframe / cross-origin 场景下 AudioContext 可能无法 resume，游戏静默。

## 触发复审的信号（Future Revisit Triggers）

- 音效种类 > 30，或需要循环 BGM。
- 需要多通道音频（立体声、混响、EQ）。
- 目标平台扩展到移动端（触屏 + 音频交互冲突）。
- 目标平台扩展到 iOS Safari（AudioContext 生命周期策略最严）。
- 实体数 > 1000 且 Canvas 2D 帧率低于 30fps。

## 相关 README 段落引用

- `README.md` L5：技术栈声明（"原生 HTML + Canvas 2D + WebAudio 合成音效"）
- `README.md` L96–L112：加一种植物 / 加一种僵尸（"drawPlant / drawZombie 是新增画法的入口"）
- `README.md` L168：已知陷阱第 6 条（"window 在 sandbox 里未定义 → 音频静默降级"）
- `README.md` L203：变更记录（"新增 WebAudio 音效"）
