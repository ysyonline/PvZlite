# ADR-001 · 单文件零构建架构

- **状态**：Accepted（Phase 6 复盘确认）
- **日期**：2026-09-15
- **决策者**：程基岩（engineering-lead），主理人游承峰备案
- **相关 README**：`README.md` L1–L8「技术栈 / 入口文件」；`README.md` L126–L145「无头测试方法」

## 上下文（Context）

PvZ Lite 是一个教学 + 玩具级的横版塔防小品。项目目标：

1. 双击 `plants-vs-zombies.html` 就能玩，任何 PC 浏览器都行（Edge / Chrome / Firefox / Safari 桌面版）。
2. 单人开发，无 CI/CD，无仓库，无发行渠道。
3. 全代码 < 1500 行、单文件；未来任何改动都能在 10 分钟内读到底。
4. 有可复用的「无头测试脚手架」——sandbox + ctx Proxy stub + `vm.runInContext` + `__probe`/`__api` 探针。
5. 无外部资产：不用图片、不用 mp3、不用图标字体，全靠 Canvas 2D 与 WebAudio 合成。

在这个上下文下，需要选定一个"交付形态"的技术架构。

## 决策（Decision）

**采用单 HTML 文件 + 零依赖 + 零构建**。所有 CSS、JS、音频合成、测试桩都内嵌在 `plants-vs-zombies.html` 中：

- CSS 走 `<style>` 内联（约 20 行）。
- JS 走 `<script>` 内联（约 1400 行），无模块化。
- 无 `package.json`、无 `node_modules`、无 lockfile、无 bundler。
- 无头测试用 Node.js 直接 `vm.runInContext` 跑同一份 `<script>` 抽取内容，无编译环节。

## 备选方案（Alternatives Considered）

### A. Vite + ES Modules + TypeScript
- 优点：现代工具链、HMR、静态检查、tree-shaking。
- **否决理由**：
  1. 引入 `npm install` 与 lockfile 后，"双击 HTML 即玩" 破功；发布版需要 `vite build` 产出 dist。
  2. 对 1200 行代码来说，模块拆分带来的维护成本 > 收益（模块边界还没长出来）。
  3. TypeScript 的价值主要在于大团队接口契约，本项目只有 1 名开发者。
  4. 无头测试脚手架需要重写（Vite 的 dev server 不等同于直接跑 HTML）。

### B. PixiJS / Phaser 等游戏引擎
- 优点：内置场景管理、资产加载、音频管理、物理、粒子系统。
- **否决理由**：
  1. 引擎最小体积 300KB+，浏览器首屏加载变慢；与"零依赖"目标冲突。
  2. Phaser 的 Scene 生命周期模型与本项目的 `setState` + `loop()` 模型语义不同，迁移等于重写。
  3. PvZ Lite 每帧 draw call ≤ 2000，Canvas 2D 原生足以覆盖，用不上 GPU 加速。
  4. 引擎抽象层让"读一眼看懂一个函数"这类可读性优势丢失。

### C. 纯 Canvas + 外部脚本文件（多文件、无构建）
- 优点：拆分成 `core.js`、`render.js`、`audio.js` 等，单文件不再膨胀。
- **否决理由**：
  1. 浏览器直接跑多 JS 文件仍可用（`<script src>`），但一旦想改路径或加新文件，用户需要复制 N 个文件才能玩——发布体验退化为"目录下载"。
  2. 无头测试从"读 1 个 HTML"变成"读 N 个 JS"，脚手架复杂度上升。
  3. 本项目当前行数（≈ 1400）尚在单文件可维护阈值内，拆分收益未兑现。

### D. 打包进 Electron / Tauri 桌面壳
- 优点：本地体验稳定，规避浏览器策略差异。
- **否决理由**：
  1. 与"零依赖"目标正面冲突。
  2. 引入 ~100MB 的运行时；对玩具级游戏是巨大过投。
  3. 目标平台仅 PC 浏览器（README L1）已明确排除。

## 后果（Consequences）

### 正面
1. **零门槛**：双击即玩；无 `npm install`、无 node 版本对齐、无构建配置漂移。
2. **零漂移**：不存在"我本地能跑你那边跑不了"这类环境问题（同一份 HTML 字节 = 同一行为）。
3. **测试复用**：无头测试直接抽取 `<script>` 内容跑在 `vm.runInContext` 里，同一份代码即被运行时和测试覆盖。
4. **可维护性天花板**：单人 1400 行，任何位置都能 F3 全局搜到；跨文件 import 依赖关系不存在。
5. **发布简单**：单文件 diff、单文件回滚、单文件部署到任意静态托管。

### 负面
1. **无模块边界**：所有函数共享同一作用域，隐式耦合；例如 `CARD_X0`、`cardCD`、`CARDS`、`onClick`、`drawCardBar` 都在同一平级作用域内互相引用。未来若行数翻 3 倍，作用域会显著膨胀。
2. **无静态类型 / 无 lint**：拼写错误只能靠运行期暴露（已用整帧 try/catch 兜底）。
3. **无热更新**：改一行需刷新页面；对开发迭代速度有小影响。
4. **无打包产物**：不能直接投到 CDNs 或 npm publish；若日后要分发，需另设打包步骤。
5. **无 tree-shaking**：所有代码全部常驻；对 1.4MB 以内 HTML 无感，但会限制未来规模上限。

## 触发复审的信号（Future Revisit Triggers）

以下任一条件满足时，应重新评审本 ADR：

- 代码行数 > 5000，或需引入第 2 名开发者。
- 需要引入外部资产（音频文件、图片、字体文件）> 5 个。
- 目标平台扩展到移动端 Web（需 PWA 壳、manifest、service worker）。
- 需要发布到 npm 或 CDN 作为可复用组件。

## 相关 README 段落引用

- `README.md` L1–L8：技术栈声明
- `README.md` L126–L145：无头测试方法（依赖单 `<script>` 结构）
- `README.md` L172–L182：已知陷阱（依赖单一作用域可 F3 全局搜）
