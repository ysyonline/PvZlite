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
| **`regression-plan.md`** | 无头回归测试计划（烟雾 16 条 + 完整 26 条） | 工程同学、QA | 每次改动 / 每次发布前 |
| **`bug-taxonomy.md`** | Bug 分级矩阵（S0-S3 / 7 类 / SLA） | 全员 | 发现 Bug 时定级、SLA 判定 |
| **`cases/`** | 单个用例文件（`.md`），从 `regression-plan.md` 展开 | QA | 编写 / 维护单条用例 |
| **`harness/`** | 无头测试脚手架（`index.js` + `run-smoke.js`） | 工程同学 | 执行回归测试 |
| **`harness/cases/SMOKE-001~009`** | 烟雾用例：状态机 / 冷却 / 阳光 / 进屋 / 通关 / 冷却分离 / splice 安全 / RAF 隔离 / gt 外置 | 工程同学、QA | commit 前门控 |
| **`harness/cases/SMOKE-010`** | 暂停分支：paused 翻转（空格/按钮/Esc）+ 暂停期世界冻结（gt/僵尸/子弹/植物）+ 解除恢复推进 + 暂停遮罩渲染零帧异常 | 工程同学、QA | commit 前门控 |
| **`harness/cases/SMOKE-011`** | L2 波次平衡契约：startSun≥150 / 总量≤25 / 单波≤6 / 单波 fast≤2 / interval≥5s / L1 5波13只不回归 / 刷怪下限行为学验证 | 工程同学、QA | 改动关卡配置后 |
| **`harness/cases/SMOKE-012`** | 波次推进清场门槛：上一波未清空不得开新波（20s 内 wave 不推进 / 队列不塞新怪）+ 清空后立即推进 + 25s 兜底防僵死 | 工程同学、QA | 改动波次推进逻辑后 |
| **`harness/cases/SMOKE-013`** | SFX 调用完整性：①静态——所有 `SFX.<key>` 调用点必须有定义 ②运行——大波预警结束刷怪帧不得抛异常 | 工程同学、QA | 新增/改动音效调用后 |
| **`harness/cases/SMOKE-014`** | 开局音效可听性：上下文创建即预热 1 帧静音 buffer + 首次种植/后续种植/拒用/铲除均启动振荡器 | 工程同学、QA | 改动音频初始化或 SFX 后 |
| **`harness/cases/SMOKE-015`** | 大波预警横幅生命周期：时长 2s + 倒计时归零横幅立即消失（转 pending）+ 清场门槛仍生效 + 清空后同帧刷怪 | 工程同学、QA | 改动预警/波次推进后 |
| **`harness/cases/SMOKE-016`** | 音频未就绪补播：suspended 时音效入 audioQueue 不丢弃，loop 每帧冲洗，running 后补播；running 后立即排程 | 工程同学、QA | 改动音频排程后 |
| **`playtests/`** | Playtest 每轮执行后的报告（`round-N-*.md`）与执行包（`round-N-execution-pack.md`） | 主理人、代测者 | Playtest 执行前后 |
| **`reports/`** | 自动化测试输出（`latest.json` / `flaky.json`） | 工程同学 | CI 或本地跑完后 |
| **`bugs/`** | 单个 Bug 报告（`BUG-NNN-*.md`） | 全员 | 发现 Bug 时 |

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
   （16 条，< 5s）    （26 条）         （3 轮）
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

1. **每次 commit 前** → 跑 `SMOKE-*`（16 条）
   - 命令：`node tests/harness/run-smoke.js`（基线 10/10 PASS）
   - 全绿才允许 commit

2. **每次 Phase 结束前** → 跑完整回归（26 条）
   - 命令：`node tests/harness/run-all.js`
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
1. 跑 `SMOKE-*`（16 条，< 5s）
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
3. 若 S0/S1：加一条 `cases/REG-*.md` 回归用例
4. 通知主理人

### "我改完了，怎么确认没回归？"
1. 跑对应分类的 REG-*
2. 跑一遍 SMOKE-*
3. 若改动涉及波次 / 卡片 / 状态机，跑 Playtest Round 1

---

## 与项目其他目录的关系

```
D:/code/zw/
├── plants-vs-zombies.html    # 游戏本体（~1200 行）
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
