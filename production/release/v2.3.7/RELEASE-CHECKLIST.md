# PvZ Lite v2.3.7 · 发布检查清单（Release Checklist）

> **文档状态：定稿 v1.0**（2026-09-30：门控 G1–G5 全绿 + 冻结副本校验 + tag 本地已打）。
> **版本**：v2.3.7 ｜ **发布日期**：2026-09-30 ｜ **产物**：`plants-vs-zombies.html`（单文件，5658 行 / 342,507 字节[LF 口径，冻结副本权威口径]）

---

## A. 质量门控实测结果记录

> 实测时间 2026-09-29/30（+0800）。解释器 Node v22.22.2（managed，绝对路径调用）。本机 = 原开发机 weixufeng。

| # | 门控项 | 命令 / 依据 | 期望 | 实测 | 结果 |
|---|---|---|---|---|---|
| A1 | 全量（烟雾 + REG） | `node tests/harness/run-all.js --all` | 102/102 PASS | **102/102 PASS**（SMOKE 29 + REG 73） | ✅ |
| A2 | 音频总线核验 | `node tests/harness/verify-bus.js` | 58/58 PASS | **58/58 PASS** | ✅ |
| A3 | 无头性能基准 | `node tests/perf/bench.js` | — | 本版非里程碑，未跑（--quick 策略） | ⏭️ |
| A4 | 版本定版核对 | 源码 `VERSION` 常量 | `v2.3.7` | **`const VERSION='v2.3.7'`** | ✅ |
| A5 | code-map 刷新 | `node tools/gen-code-map.mjs` | 行数与定版源码一致 | **5658 行** | ✅ |

## B. 功能验收（v2.3.7 害羞菇）

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| B1 | 害羞菇（cost 25 / 20 伤 1.4s / 全行 / 3×3 恐惧缩头） | ✅ | 无头冒烟 17/17 + 真机视觉 4/4 |
| B2 | 害羞菇发卡 2-2（2-6 恢复金币关） | ✅ | `CARD_AWARD`；REG-META-02/REG-POINT-04 |
| B3 | 墓碑重生（倒数 2 波各 1~2 座，c4~c8 无植物格） | ✅ | REG-GRAVE-02 |
| B4 | 僵尸只在墓碑处出现（墓碑已清退化右缘） | ✅ | REG-GRAVE-03 |
| B5 | 咬碑藤往下啃食动画 | ✅ | 真机 `_v238-gravebuster-chew.js` 4/4 |
| B6 | W2 初始阳光 50 | ✅ | REG-SUN2-01 |
| B7 | 四项视觉调整（火烧带/小喷菇矮/阳光菇虹彩/魅惑菇蓝） | ✅ | `v236-visual-check.js` 4/4 |
| B8 | 西瓜溅射修复 | ✅ | REG-SPLASH-01 真机开火路径 |
| B9 | 双 UI bug 修复（大喷菇白圈/小喷菇柄残截） | ✅ | 一次性 Edge CDP 像素脚本 |
| B10 | 判别力自证（旧源必红） | ✅ | REG-GRAVE-02/03、REG-SUN2-01、REG-SPLASH-01、视觉旧源 0/4 |

## C. 发布产物

| # | 项 | 状态 |
|---|---|---|
| C1 | 冻结副本 `artifacts/plants-vs-zombies.v2.3.7.html` | ✅ 已导出（`git show v2.3.7:plants-vs-zombies.html`，342,507 字节 LF） |
| C2 | RELEASE-NOTES.md | ✅ 已定稿 |
| C3 | KNOWN-ISSUES.md | ✅ 已定稿 |
| C4 | RELEASE-CHECKLIST.md | ✅ 本文件 |
| C5 | `v2.3.7` 标签 | ✅ 本地已打（轻量标签 @ `bd2877d`，**未推送**） |

## D. 回滚方案

- 发布后发现阻断级问题：回退至 `production/release/v2.3.6/artifacts/plants-vs-zombies.v2.3.6.html` 冻结副本对外分发。
- 本版增量 = 害羞菇 + 墓碑重生 + 三处修复 + 并入项；revert `68776ae`→`bd2877d` 施工链即可回退。

## E. 文件完整性

| 项 | 值 |
|---|---|
| 冻结副本 | `production/release/v2.3.7/artifacts/plants-vs-zombies.v2.3.7.html` |
| 导出方式 | `git show v2.3.7:plants-vs-zombies.html` —— 重定向字节直通（LF） |
| 行数 | 5658（LF 口径） |
| 字节数 | **342,507**（LF 口径，冻结副本权威口径；v2.3.6 320,995，+21,512B） |
| LF SHA-256 | `64972567becf25d756ab115f9ff9146e181b3df74f89f11229d40dc44007835f` |
| 冻结副本内版本标识 | `const VERSION='v2.3.7'`（grep 核验通过，恰 1 处） |

> 校验命令（LF 权威口径）：
> ```
> git show v2.3.7:plants-vs-zombies.html | sha256sum
> # 期望：64972567becf25d756ab115f9ff9146e181b3df74f89f11229d40dc44007835f
> ```

## F. Go / No-Go 汇总

| 门 | 结论 |
|---|---|
| G1 门控全量 | ✅（102/102 FULL · 58/58 BUS） |
| G2 判别力自证 | ✅（REG-GRAVE-02/03、REG-SUN2-01、REG-SPLASH-01 + 视觉旧源 0/4） |
| G3 冻结副本 + 完整性 | ✅（§E SHA-256 可复现） |
| G4 标签 | ✅（`v2.3.7` @ `bd2877d`，本地已打，未推送） |
| G5 发布签字 | ✅ 已授权（用户「tag v2.3.1~v2.3.7 + release 四件套」指令） |

**判定：✅ 全门 PASS——发布完成（tag 未推送）。**

## G. 挂起项（发布后动作）

| # | 项 | 状态 |
|---|---|---|
| 1 | 金币留存钩子 | ⏳ 待排期 |
| 2 | 世界 2 后 6 关手感实测反馈 | ⏳ 待用户 |
| 3 | tag 推送（v2.3.1~v2.3.7） | ⏳ 用户下令后显式推送 |

---