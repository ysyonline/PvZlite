# ADR-002 · RAF 主循环 + `gt` 外置时钟

- **状态**：Accepted（Phase 6 复盘确认）
- **日期**：2026-09-15
- **决策者**：程基岩（engineering-lead），主理人游承峰备案
- **相关 README**：`README.md` L84–L90「关键设计」；`README.md` L159「踩过的坑 · 第 1 条」；`README.md` L180「已知陷阱 · 第 5 条」

## 上下文（Context）

主循环是整个游戏的引擎，需要同时满足：

1. **暂停语义**：`paused=true` 时冻结一切逻辑与视觉演化（时间也冻住），但 `render()` 仍然要出图（显示"已暂停"覆盖层）。
2. **加速语义**：`gameSpeed ∈ {1, 2, 4}` 需让逻辑按 N 倍推进，但视觉仍然按真实帧率刷新。
3. **异常隔离**：任意一帧抛异常都不能让 RAF 停止续订（否则游戏永久卡死，见 README L180）。
4. **可无头测试**：需要在 Node 环境下手动 tick N 帧跑逻辑，不用真跑 RAF。
5. **状态切换可观测**：`setState(s, why)` 需在控制台留痕。

在这些约束下，选择主循环骨架与时钟归属。

## 决策（Decision）

**采用 `requestAnimationFrame(loop)` 单循环骨架 + `gt` 在游戏时钟外置于 `loop()` 内累加**。伪代码：

```js
function loop(now){
  const dt = Math.min(0.05, (now - lastT) / 1000);  // 帧率下限保护
  lastT = now;
  try {
    if (exitArm > 0) exitArm -= dt;
    if (toastT > 0) toastT -= dt;
    if (frameErrT > 0) frameErrT -= dt;
    if (state === 'play' && !paused) {
      const sdt = dt * gameSpeed;
      gt += sdt;            // ← 时钟只在 loop() 里推进
      update(sdt);
    }
    render();               // render 永远跑，保证暂停时也出图
    drawToast();
    if (frameErrT > 0) drawFrameErr();
  } catch (err) {
    frameErr = err; frameErrT = 5;
    console.error('[PvZ] 帧异常，已隔离：', err);
  }
  requestAnimationFrame(loop);   // ← 必须在 try/catch 之外，兜住异常
}
```

关键约定：

- `gt` 是**逻辑秒**，只在 `state==='play' && !paused` 时累加；暂停时不涨，切回后无缝续接。
- `dt` 是**真实秒**，任何非游戏语义的计时器（`toastT`、`exitArm`、`frameErrT`）都读 `dt`，不受 `gameSpeed` 影响——避免"加速 4x 时暂停按钮提示一闪而过"这种体验退化。
- `update()` 只吃逻辑秒 `sdt`，绝不感知真实时间。
- `render()` 无论 `paused` / `state` 都跑；这是"暂停时仍出图"的实现前提。
- 整帧 `try/catch` 兜底，异常写入 `frameErr` 供 `drawFrameErr()` 在屏幕底部显示。

## 备选方案（Alternatives Considered）

### A. `setInterval(update, 16)` + 独立 render
- 优点：逻辑与渲染解耦，可分别调频。
- **否决理由**：
  1. `setInterval` 在后台标签页会被节流到 1s 一次，切换回来 `dt` 会爆。
  2. 无法自然跟渲染帧同步，会出现逻辑与画面错位（例如僵尸走过子弹）。
  3. 无法通过浏览器原生暂停标签页时暂停逻辑。
  4. `gameSpeed` 需要人为控制 interval，逻辑与加速耦合。

### B. `gt` 在 `update(dt)` 内累加
- 优点：`update` 自洽，读代码只需看一个函数。
- **否决理由**：
  1. **暂停语义无法表达**：`paused` 时不调 `update`，`gt` 停止；但"暂停 5 秒后恢复，第一波僵尸倒计时要按原节奏"——需要人为补齐。
  2. **加速语义需 hack**：`update` 需要知道 `gameSpeed`，逻辑函数被加速耦合污染。
  3. **无头测试陷阱**：README L159 明确记录——"必须自己补 `gt += dt`（时钟在主循环里），否则波次永不触发，测试假通过"。这是历史血泪教训，反向证明 ADR 决策的正确性。
  4. `drawToast()` 等辅助循环无法自然拿到 `gt`，会出现"暂停时 toast 仍在跳字"的 bug。

### C. `setTimeout` 自调度主循环
- 优点：可调帧率上限，避免后台烧 CPU。
- **否决理由**：
  1. 语义上是 `setInterval` 变种，同样受后台节流影响。
  2. 无法与浏览器合成器垂直同步，掉帧时 dt 抖动大。
  3. 无头测试需 mock setTimeout，脚手架复杂度上升。

### D. 双时钟（逻辑秒 `gt` + 视觉秒 `vt`）
- 优点：视觉动画（如粒子飘、闪烁）可用真实时间，不受 `gameSpeed` 影响，观感更自然。
- **否决理由**：
  1. 引入两个时钟会让每个 update 函数都要决定"读哪个"，认知负担翻倍。
  2. 目前所有粒子/爆炸生命周期都用 `sdt`，观感与逻辑一致，无收益。
  3. 若真需要视觉秒，可在具体函数里局部实现（如 `Math.sin(gt * 0.5)` 里手动乘系数），无需全局双时钟。

## 后果（Consequences）

### 正面
1. **暂停即冻结**：`paused=true` 时 `gt` 不涨，所有基于 `gt` 的逻辑（波次计时、僵尸行走、粒子寿命）都冻结，恢复无缝续接。
2. **加速自然实现**：`sdt = dt * gameSpeed` 一行搞定，`update` 完全无感。
3. **异常隔离稳定**：整帧 try/catch 兜住，`requestAnimationFrame(loop)` 一定被续订。
4. **测试友好**：无头测试只需 `tick(dt) { gt += dt; update(dt) }` 手动推进，见 README L152–L153 的 `__api.tick`。
5. **可观测性**：`setState` 打日志、`frameErr` 落屏、`gt` 值随 `setState` 一起打印，偶现"突然退出"问题可追溯。

### 负面
1. **测试脚手架有隐性约定**：所有无头测试都必须自己补 `gt += dt`；忘了就会假通过（README L159 已警示）。
2. **`dt` 与 `sdt` 双变量**：新增逻辑时必须判断"这个是游戏逻辑还是元游戏 UI"，判断错了会出现"加速 4x 时暂停按钮提示一闪而过"这类隐性 bug。
3. **视觉动画绑定逻辑时钟**：粒子飘动、爆炸闪光都用 `sdt`，加速时会"看起来更快"。若未来做纯视觉特效（如背景雪花），需另建局部时钟。
4. **单循环串行**：无法拆分渲染线程与逻辑线程。当前规模（< 2000 draw calls/帧）不需要，但扩展到大世界时会卡。

## 触发复审的信号（Future Revisit Triggers）

- 需要视觉动画与逻辑脱钩（如背景音乐视觉化、鼠标粒子跟手）。
- 逻辑单帧耗时 > 8ms（当前估算 2–5ms，见 `perf-profile.md` §2）。
- 需要多线程 Web Worker 分担物理计算。
- 需要在后台标签页维持一定逻辑速率。

## 相关 README 段落引用

- `README.md` L84–L90：关键设计（时钟外置、阳光可点击、僵尸逐个生成等）
- `README.md` L159：踩过的坑第 1 条（`gt` 不在 `update()`）
- `README.md` L160：踩过的坑第 2 条（无头测试要先消费首帧 rafQueue）
- `README.md` L161：踩过的坑第 3 条（异常隔离可用 `zombies.push(null)` 触发）
- `README.md` L180：已知陷阱第 5 条（`requestAnimationFrame` 在函数末尾）
