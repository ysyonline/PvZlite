# PvZ Lite v2.2.0 · 发行说明（Release Notes）

> **文档状态：定稿 v1.0**（v2.2.0 发布包 · 2026-09-25）。版本已定版（源码 `VERSION='v2.2.0'`），门控等效复跑全绿（见 RELEASE-CHECKLIST §A），机制级回归三用例全含旧源判别力。
> v2.2.0 为 **「三新一次性秒杀植物内容版」**：三张卡（窝瓜 / 航椒 / 樱桃）均已实装、armT=0 即种即生效，**零新怪物、零新地形**。

---

## 一、版本信息

| 项 | 内容 |
|---|---|---|
| **版本号** | **v2.2.0**（源码 `VERSION` 常量 `v2.2.0`，L62） |
| **发布日期** | 2026-09-25（门控全绿 + 机制自证双结论 + 定版闭环） |
| **上一版本** | v2.1.1（2026-09-25，tag `v2.1.1` = 源码权威 `5eeab99`） |
| **产物** | `plants-vs-zombies.html`（单文件，**4170 行 / 226,174 字节**[LF 口径，冻结副本权威口径]） |
| **源码权威提交** | 定版提交（`git show HEAD:plants-vs-zombies.html` 逐字节即冻结副本） |
| **技术栈** | 原生 HTML + Canvas 2D + WebAudio 实时合成音效 |
| **外部依赖** | **无**（零依赖、零构建、无网络请求、无外部资源） |
| **目标平台** | **仅 PC 浏览器**（Chrome / Edge），窗口 ≥ 1200 × 800 |
| **发行语言** | 简体中文（多语言 N-13 维持冻结至 v3.0.0） |
| **版本性质** | 内容版本：**新增 3 张卡 + 发卡序列重组**；关卡波次（_ANCHORS）/ 僵尸属性 / 伤害公式 / 存档结构（`pvz_progress_v2`）**零改动** |

### 运行方式

双击 `plants-vs-zombies.html`（`file://` 协议）或拖入浏览器窗口即可。测试模式：URL 加 `?test=1`（阳光锁定 9999 · 全 15 卡可选 · 10 槽 · 纯沙盒不写任何存档 · 可点选关页锁定关直接预览）。

---

## 二、本版变更（相对 v2.1.1）

### 2.1 三新一次性秒杀植物（armT=0 即种即生效）

| 卡 | type | cost | 种植 CD | armT | 机制 |
|---|---|---|---|---|---|
| **窝瓜** | squash | 50 | 15s | 0 | 即种即跳向同排前方最近僵尸，贴脸单体秒杀后消失 |
| **航椒** | pepper | 125 | 25s | 0 | 同排踩中触发（49.5px 判定），引爆**同排全部僵尸**（无差别秒杀，不限数量/列） |
| **樱桃** | cherry | 150 | 30s | 0 | 同排踩中触发，**3×3 格跨行秒杀**（本作首个跨行秒杀，`dc≤1 && dr≤1`） |

> **设计分层**：armT=0 即种即生效，与地雷（armT=8s）形成「更贵但即时 vs 更便宜但有延迟」的清晰分层。三新卡秒杀口径对齐 v2.1.1 地雷无差别秒杀（无视僵尸防御、任何难度一碰即死）。详见 `design/gdd/v22-new-plants.md`。

### 2.2 发卡序列重组（CARD_AWARD + DIFF_AWARD）

世界 1 后半段重排（原发卡序列 snowpea 1-5 / icemelon 1-6 → 1-10 被拆入三张新卡）：

| 1-5 | 1-6 | 1-7 | 1-8 | 1-9 | 1-10 |
|---|---|---|---|---|---|
| squash | snowpea | pepper | cherry | 100（金币） | icemelon |

DIFF_AWARD 新增 3 项：`hard:1-7:pepper` / `hard:1-8:cherry` / `expert:2-1:squash`。

### 2.3 QA 门——三缺陷修复（提交 `e7c8279`）

| ID | 级别 | 缺陷 | 修复 |
|---|---|---|---|
| **BUG-01** | Major | `drawCardFace` if/else 链终止于 cabbage → squat/pepper/cherry（含 snowpea）无专属卡面，落公共绿底兜底，pepper/cherry art 区哈希相同 | 补 squash/pepper/cherry/snowpea 四个卡面分支（+57 行，与 drawPlantInner 同构） |
| **BUG-02** | Minor | `explodeCherry` 请求 `triggerShake(8,400)` 抢占「失败进屋」一次性 8px 名额，致后续樱桃与航椒永久 clamp 6px | 改 `triggerShake(6,400)`，8px 名额保留给失败进屋特写 |
| **BUG-03** | Major | `drawBoom` 用固定分母 0.45 归一、只夹下界，航椒 life=0.5 使 k=1.111 半径转负，`createRadialGradient` 抛 IndexSizeError | `k=Math.max(0,Math.min(1,e.life/0.45))` 双侧夹紧 + r 加 `Math.max(0,·)` 兜底 |

### 2.4 工程

| # | 变更 | 说明 |
|---|---|---|
| 1 | 机制级 REG 三用例 | REG-SQUASH-01 / REG-PEPPER-01 / REG-CHERRY-01（均含旧源判别力——v2.1.1 旧源必红） |
| 2 | 真机视觉验收 | `v22-newplant-visual.js` **7/7**：窝瓜跳跃抛物线 / 血条排除 / 航椒全排火焰波 / 樱桃 3×3 跨行秒杀 / 三卡互异 hash / 爆炸零帧异常 / 震屏一致性 |
| 3 | 平衡画像（三档全过） | normal 480 局 + hard/expert 720 局 = **1200 局**。结论：**新卡不过强**（失守率最大下降 4.2pp，远未触 10pp 触发线）；反向发现新卡定价偏冷（应急流 0 购买）→ 危机工具定位成立 |
| 4 | code-map | 3944 → **4170 行**（20 分区 / 101 函数 / 73 常量） |

**零其他变更声明**：关卡波次表（`_ANCHORS`）/ 阳光经济（自然掉落 R(7,11)+向日葵 20s）/ 冷却 / 伤害（其余植物）/ 僵尸属性 / 存档结构（`pvz_progress_v2`）/ 解锁拓扑（keyOrd 线性）/ testMode 纯沙盒零写守卫，与 v2.1.1 完全一致；无新怪、无新关卡、无新地形。

---

## 三、继承 v2.1.x 的内容

v2.1.0 全部内容（世界 1/2 共 20 关开放 · 金币体系 · 选关页奖励预览行 · 关卡注册表 `w-l` 换键 · 存档 v2 五态幂等迁移 · 主菜单/选关四页签界面 · 结算导航 · 昼夜色板/浓雾/墓地房屋视觉）+ v2.1.1 的地瓜无差别秒杀消缺补丁。详见 `production/release/v2.1.0/RELEASE-NOTES.md` 与 `production/release/v2.1.1/RELEASE-NOTES.md`。

---

## 四、验收状态

| 门 | 结论 |
|---|---|
| G1 门控复跑（定版后） | ✅ 全量 **91/91**（SMOKE 29 + REG 62）· 总线 **56/56** · bench **PASS**（run-gates 一键入口受会话级 spawnSync EBUSY 阻塞，逐门直跑等效验证，见 RELEASE-CHECKLIST §A 注） |
| G2 机制自证（新源绿 + 旧源红） | ✅ REG-SQUASH-01 / REG-PEPPER-01 / REG-CHERRY-01 三用例新源全绿 + **v2.1.1 旧源判别必红**（无卡片 → 无分支 → 永不引爆） |
| G3 真机视觉 | ✅ `v22-newplant-visual.js` 7/7 PASS（primary hash 3/3 · shake 6/6 · frameErr null · squash 抛物线单调 · pepper 同排全清 · cherry 跨行秒杀） |
| G3b 平衡画像 | ✅ normal 480 局 + hard/expert 720 局 = 1200 局 THREE-DIFF 全维 PASS（新卡不过强） |
| G4 冻结副本 | ✅ `artifacts/plants-vs-zombies.v2.2.0.html`（`git show HEAD` 导出，LF，`cmp` 逐字节一致，CR=0，三重校验通过） |
| G5 发布签字 | ⏳ 待用户授权（推送 + 打 tag） |

### 本版已知局限（诚实披露，均非阻塞）

- 世界 3（墓地）/ 世界 4（房屋）除锚点外仍全占位（Q-12）；墓碑机制字段预留未实装
- 金币留存钩子未做（v2.1 全通仅 2000/6400 ≈ 31%）
- 未做整局人工 playthrough；仅覆盖 Edge / Chromium 系
- hard/expert 下 P0 防线失守率偏高（56.7%/90.8%）——这是难度曲线议题，非本版阻塞
- 三新卡定价偏冷（应急流 0 购买）——危机工具定位可接受

---

## 五、本版提交链

| commit | 内容 |
|---|---|
| `8e57951` | `feat(v2.2)`: 三新一次性植物——航椒/樱桃/窝瓜（armT=0 即种即生效，秒杀）· CARD_AWARD 重排 + DIFF_AWARD×3 · VERSION→v2.2.0 |
| `e7c8279` | `chore(v2.2)`: QA 门收口——三缺陷修复（drawCardFace 补四卡面 + triggerShake 8→6 + drawBoom 双侧夹紧）+ 机制级回归 REG×3 + 平衡画像 480 局 + GDD 同步 |
| `6071447` | `docs(memory)`: V22 QA 门收工归档 + 换机交接 |
| `c7c6357` | `docs(v2.2)`: 归档 O-1 平衡补跑结论 + v2.2-plan.md 起（封版前） |
| — | `chore(v2.2)`: R-1 定版通扫（活默认值 v2.1.1→v2.2.0 7 处 + code-map 重刷）· R-2 全量门控（FULL 91/91 · BUS 56/56 · BENCH PASS） |
| — | `release(v2.2.0)`: 发布包四件套（本文件 + RELEASE-CHECKLIST + KNOWN-ISSUES + 冻结副本） |