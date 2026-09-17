# tests/ · PvZ Lite 测试目录索引

> **本目录是质量保障中心**：手动 Playtest、自动化回归、Bug 分类规范全部在这里。
>
> **原则**：每个文档单一职责；新增文件时同步更新本索引；删除文件时同步清理链接。

---

## 文件清单

| 文件 | 用途 | 谁用 | 何时用 |
|---|---|---|---|
| **`README.md`** | 本文件，目录索引与使用顺序 | 所有人 | 首次接触测试目录时 |
| **`playtest-plan.md`** | 3 轮手动 Playtest 计划（可玩性 / 上手 / 压力） | 主理人、亲友代测者 | Phase 6 发布前跑 |
| **`regression-plan.md`** | 无头回归测试计划（烟雾 23 条 + REG 30 条 · 合计 53 条） | 工程同学、QA | 每次改动 / 每次发布前 |
| **`bug-taxonomy.md`** | Bug 分级矩阵（S0-S3 / 7 类 / SLA） | 全员 | 发现 Bug 时定级、SLA 判定 |
| **`harness/`** | 无头测试脚手架（`index.js` 公共 harness + `run-smoke.js` + `run-all.js` + `verify-bus.js`） | 工程同学 | 执行回归测试 |
| **`harness/cases/*.js`** | 用例实现：一条用例一个 `.js` 模块（`module.exports = { id, name, seed, run }`），从 `regression-plan.md` 展开 | QA、工程同学 | 编写 / 维护单条用例 |
| **`harness/cases/SMOKE-001~023`** | **烟雾用例组（共 23 条）**：001~009 覆盖状态机 / 冷却 / 阳光 / 进屋 / 通关 / 冷却分离 / splice 安全 / RAF 隔离 / gt 外置；010~023 逐条见下表 | 工程同学、QA | commit 前门控 |
| **`harness/cases/SMOKE-010`** | 暂停分支：paused 翻转（空格/按钮/Esc）+ 暂停期世界冻结（gt/僵尸/子弹/植物）+ 解除恢复推进 + 暂停遮罩渲染零帧异常 | 工程同学、QA | commit 前门控 |
| **`harness/cases/SMOKE-011`** | L2 波次平衡契约：startSun≥150 / 总量≤25 / 单波≤6 / 单波 fast≤2 / interval≥5s / L1 5波13只不回归 / 刷怪下限行为学验证 | 工程同学、QA | 改动关卡配置后 |
| **`harness/cases/SMOKE-012`** | 波次推进清场门槛：上一波未清空不得开新波（20s 内 wave 不推进 / 队列不塞新怪）+ 清空后立即推进 + 25s 兜底防僵死 | 工程同学、QA | 改动波次推进逻辑后 |
| **`harness/cases/SMOKE-013`** | SFX 调用完整性：①静态——所有 `SFX.<key>` 调用点必须有定义 ②运行——大波预警结束刷怪帧不得抛异常 | 工程同学、QA | 新增/改动音效调用后 |
| **`harness/cases/SMOKE-014`** | 开局音效可听性：上下文创建即预热 1 帧静音 buffer + 首次种植/后续种植/拒用/铲除均启动振荡器 | 工程同学、QA | 改动音频初始化或 SFX 后 |
| **`harness/cases/SMOKE-015`** | 大波预警横幅生命周期：时长 2s + 倒计时归零横幅立即消失（转 pending）+ 清场门槛仍生效 + 清空后同帧刷怪 | 工程同学、QA | 改动预警/波次推进后 |
| **`harness/cases/SMOKE-016`** | 音频未就绪补播：suspended 时音效入 audioQueue 不丢弃，loop 每帧冲洗，running 后补播；running 后立即排程 | 工程同学、QA | 改动音频排程后 |
| **`harness/cases/SMOKE-017`** | 超声保活音源：17.5kHz@0.005 常驻振荡器直连 destination（防驱动静音门控吞首音），参数正确 + 幂等不重复启动 | 工程同学、QA | 改动音频初始化/总线后 |
| **`harness/cases/SMOKE-018`** | 已占用格子不能覆盖种植：同格重复种植被拒（deny + 保留选中），不浪费阳光 | 工程同学、QA | 改动种植分支后 |
| **`harness/cases/SMOKE-019`** | BGM 生命周期：`state==='play'` 且未静音时起播（env 总线），menu/end 或静音时停 | 工程同学、QA | 改动音频/BGM 后 |
| **`harness/cases/SMOKE-020`** | 存档持久化（V11-04）：静音偏好 `pvz_muted` + 最高分「写入 → 重载 → 读回」全路径 | 工程同学、QA | 改动存档逻辑后 |
| **`harness/cases/SMOKE-021`** | 内嵌版本号（V11-05）：源码 `VERSION` 常量 + 启动日志 + 菜单渲染无帧异常 | 工程同学、QA | 改动版本号/菜单渲染后 |
| **`harness/cases/SMOKE-022`** | 音频补齐 P0（S2）：B1 种植落地噪声叠层 + B2 卡片冷却归零当帧报就绪（转点判定，不重复响）+ B3 阳光掉落/收集分层与节流 | 工程同学、QA | 改动种植/卡片冷却/阳光音效后 |
| **`harness/cases/SMOKE-023`** | 音频补齐 P1/P2 + 警报 loop（S2）：B4 死亡按类型分层 + B5 西瓜抛掷叠层（shoot 契约不变）+ B6 失败收束 + B8 菜单点击语义纠偏 + B9/B10 铲子选中与铲空 + §C sirenLoop 随横幅同起同停且窗口内重复 | 工程同学、QA | 改动战斗/菜单/铲子/预警音效后 |
| **`harness/cases/REG-*.js`** | 完整回归用例 **30 条**（TRAP 6 / STATE 3 / CARD 4 / WAVE 4 / PLANT 4 / ZOM 3 / SUN 2 / MINE 2 / END 2） | 工程同学、QA | 每次发布前 |
| **`harness/run-all.js`** | 一键运行器：**默认跑 REG 30 条**；`--all` 跑 SMOKE+REG 53 条；`--smoke` 只跑烟雾 23 条；`PVZ_HTML_PATH` 覆盖源文件 | 工程同学 | 门控 / 发布前 |
| **`playtests/`** | Playtest 每轮执行后的报告（`round-N-*.md`）与执行包（`round-N-execution-pack.md`） | 主理人、代测者 | Playtest 执行前后 |
| **`reports/`** | 测试报告存档（当前：`qa-signoff-v1.0.0.md`）。注：`run-all.js` 目前只打印到 stdout，`latest.json`/`flaky.json` 尚未落地（见 `regression-plan.md` §5.2 H2 / H4） | 工程同学、QA | 跑完 / 签收后 |
| **`bugs/`**（首次报 Bug 时创建，当前目录尚未创建） | 单个 Bug 报告（`BUG-NNN-*.md`） | 全员 | 发现 Bug 时 |

---

## 使用顺序（Phase 6 发布流程）

```
┌─────────────────────────────────────────────────────────┐
│  Phase 6 每次准备发布                                     │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   ① 跑烟雾            ② 跑回归           ③ 跑 Playtest
   （23 条，< 5s）    （REG 30 条）     （3 轮）
   regression-plan     regression-plan   playtest-plan
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
                   ④ 汇总 Bug 分级
                    bug-taxonomy
                          │
                          ▼
              ⑤ 主理人决定：发布 / 延后
```

### 详细步骤

1. **每次 commit 前** → 跑 `SMOKE-*`（23 条）
   - 命令：`node tests/harness/run-smoke.js`（基线 23/23 PASS）
   - 全绿才允许 commit

2. **每次 Phase 结束前 / 发布前** → 三件套全绿：烟雾 23 + REG 30 + 音频总线 55
   - 烟雾 23 条：`node tests/harness/run-smoke.js`
   - REG 30 条：`node tests/harness/run-all.js`（**默认即跑 REG-*，30/30 PASS**）
   - SMOKE + REG 53 条（可选一次性）：`node tests/harness/run-all.js --all`
   - 音频总线 55 条：`node tests/harness/verify-bus.js`
   - 失败项按 `bug-taxonomy.md` 定级

3. **发布候选时** → 三轮 Playtest
   - Round 1（可玩性）：作者自评 + 1 位有经验玩家
   - Round 2（上手）：1-2 位新手亲友
   - Round 3（压力）：作者 + 1 位硬核玩家
   - 报告存 `tests/playtests/round-N-*.md`

4. **发现 Bug 时** → 用 `bug-taxonomy.md` 定级 + 建 `bugs/BUG-NNN-*.md`
   - S0 立即修
   - S1 本 sprint 修 + 加 REG 用例
   - S2 下 sprint 修
   - S3 有空修

---

## 前置依赖

- **Node.js ≥ 18**（用 `vm` 模块做无头测试）
- **无 npm 依赖**（README 现有脚手架已验证可用）
- **一个支持 ES2020 的浏览器**（仅手动 Playtest 用）

---

## 常见任务速查

### "我要改一个数值，怎么验证？"
1. 跑 `SMOKE-*`（23 条，< 5s）
2. 跑对应分类的 REG-*（例如改僵尸数值就 `REG-ZOM-*`）
3. 若改动可能影响平衡，跑 Playtest Round 1 T1/T4

### "我要发布 Phase 6，需要做什么？"
1. 全部 SMOKE-* 绿
2. 全部 REG-* 绿
3. 三轮 Playtest 全部 PASS（或只有 CONCERNS）
4. `bugs/` 目录中无 S0/S1 未关闭 Bug
5. 主理人签字

### "我发现一个 Bug，怎么报？"
1. 打开 `bug-taxonomy.md` 定严重度
2. 从模板复制生成 `bugs/BUG-NNN-<slug>.md`
3. 若 S0/S1：加一条 `harness/cases/REG-*.js` 回归用例
4. 通知主理人

### "我改完了，怎么确认没回归？"
1. 跑对应分类的 REG-*
2. 跑一遍 SMOKE-*
3. 若改动涉及波次 / 卡片 / 状态机，跑 Playtest Round 1

---

## 与项目其他目录的关系

```
D:/code/zw/
├── plants-vs-zombies.html    # 游戏本体（规模/分区见 docs/code-map.md，由 node tools/gen-code-map.mjs 自动生成）
├── README.md                 # 项目根 README，含无头测试方法章节
├── tests/                    # ← 本目录
├── design/                   # 美术、音频、GDD（Phase 6 其他产出）
├── docs/
│   └── architecture/         # ADR + 性能剖析（工程同学产出）
└── production/               # 生产计划（Phase 6 主理人产出）
```

- **根 README 的「无头测试方法」章节** 是本目录 `harness/` 的原型参考。
- **design/、docs/architecture/** 与测试无关，但 Phase 6 全部完成后，主理人应统一验收。

---

## 版本记录

| 日期 | 变更 | 作者 |
|---|---|---|
| 2026-09-15 | 初始创建：3 份计划 + 本索引 | 严守真（QA） |
| 2026-09-16 | 口径同步：烟雾 17→**21** 条、完整 26→**REG 30 条**（合计 51）；补齐 SMOKE-018~021 / REG-* / run-all.js 条目；`cases/`→`harness/cases/*.js`；发布流程改为「烟雾 21 + REG 30 + 总线 47」三件套；地瓜范围契约更正为仅同排 ±54px（**已裁决·保留现状**）；行数改为不写死，以 `docs/code-map.md` 为准 | 严守真（QA） |
| 2026-09-17 | S2 音频补齐同步：烟雾 21→**23** 条（新增 SMOKE-022/023）、合计 51→**53**、总线 47→**55**（AUDIO_ROUTES 由 13 键扩到 21 键）；发布流程三件套改为「烟雾 23 + REG 30 + 总线 55」；SMOKE-016 断言改为基线差值式（B1 落地叠层使单次种植入队 2 项） | 严守真（QA） |
