# v1.7 真机验收报告 · R-B cabbage 溅射 + R-A 黄油加强

- **产出**：quality-lead（严守真）· 2026-09-22 · 任务 V17-D5
- **脚本**：`tests/playtests/v17-acceptance.js`（Edge headless=new + CDP + Runtime.evaluate + 像素判读）
- **结果数据**：`tests/playtests/v17-acceptance-results.json`（`overall: PASS`）
- **证据图**：`tests/playtests/v17-cabbage-flight.png` / `v17-cabbage-splash.png`
- **被测源码**：`plants-vs-zombies.html` v1.7.0-wip（`VERSION` 自证）
- **跑法**（Bash 工具不回传 Edge 子进程 stdout ⇒ 重定向后读 JSON 为准）：
  ```
  "C:\Users\user3667\.workbuddy\binaries\node\versions\22.22.2-3\node.exe" tests/playtests/v17-acceptance.js > log 2>&1
  ```

## 总判定：**7/7 PASS**

| 项 | 断言 | 实测 | 判定 |
|---|---|---|---|
| env | VERSION 含 `1.7` | `v1.7.0-wip` | PASS |
| **R-B-1** | cabbage 真机实弹（`updatePlant` 射击分支）：dmg 20 / splash 30px / splashRatio 0.40 / 溅射伤害 8 / 开火后 cd 2.0 | dmg=20 · splash=30 · ratio=0.40 · 8.0 · cd=2.0 | PASS |
| **R-B-2** | 同排受控两僵尸：A 直中(20) + B 溅射(**8=20×0.40**) 且 **B.freezeT===0**；对照臂 B 距命中点 >30px ⇒ **不掉血** | A=20 · B=8 · B.freezeT=0 · ctrl A=20/B=0 | PASS |
| **R-B-4** | corn / melon / icemelon 溅射数值**未变**：6 / 35.75 / 35.75；icemelon 溅射邻体仍减速 | 6 / 35.75 / 35.75 · B.slowT=2.0 | PASS |
| **R-B-5** | 视觉证据：飞行帧 + 命中帧（爆点粒子 effects=14） | 两图 md5 相异 | PASS |
| **R-A-1** | 黄油命中当刻 `freezeT===3.0`（1 tick 后 2.9833∈(2.9,3.0]）· 三停（x/walk 峰值=0；啃食目标 dur 衰减=0）· 3.33s 到期恢复 | 全中 | PASS |
| **R-A-2** | 概率 N=4000 ⇒ 26.32%（区间 24–30%）· 发射瞬间即带 butter 标记（见下口径说明） | 1053/4000 | PASS |

## R-B 受控构造口径（复现关键）

- **命中点**：取真机 cabbage 弹体（`fireArcProjectile` 产出，自带 `splash:30,splashRatio:0.40`），摆到 `pr.x=400, pr.y=flatY`。
- **直中框** = `|z.x-pr.x|<42`（L1574）；**溅射带** = 同排 `|z2.x-pr.x|<pr.splash`（L1585）；直中先结算并 `break`（L1595）。
- **A 直中** × 阵内先序：`zombies=[A,B]`，A@415(|Δx|=15) 先结算；B@425(|Δx|=25<30) 仅吃溅射。
- **对照臂**：B@445(|Δx|=45>42 且 >30) ⇒ 既非直中亦非溅射 ⇒ 掉血 0。
- 口径：**溅射不施加控制**（cabbage 无控制；corn 溅射不定身；icemelon 溅射仍减速 = v1.5 决议1 全命中减速）。

## ⚠️ 口径校正说明（R-A-2 · 与源码对齐）

源码 `fireArcProjectile` L1389 = **字段存在性语义**：`if(spec.butter)pr.butter=true;`
⇒ **仅黄油弹携带 `butter` 字段，普通弹无该字段（undefined）**。
故 R-A-2 判据采用：**「带 boolean 字段弹数 === 黄油弹数」且「`butter===false` 恒为 0」**，
而非前作 `v16-acceptance` C2 的「tagged===N && nonBool===0」——后者与源码矛盾、**恒不取绿**（且该脚本因 PAGE 路径失效而从未暴露）。**本次未放宽概率阈值（24–30% 不变），只校正了矛盾子判据**。

## 复现要点（避坑）

1. **PAGE 从 `__dirname` 推导**（`pathToFileURL(resolve(__dirname,'..','..','plants-vs-zombies.html'))`）；前作 v16 硬编码 `file:///D:/code/PvZlite/...` 在本机已失效。
2. **端口 9354**（避 9352/9353）。
3. **截图前冻结 raf 主循环**（`state='play'; paused=true; drawPause=function(){}`），否则多帧 md5 同帧；命中帧爆点粒子因 `effects` 随 update 冻结而持久可见。
4. 断言只读、不改源码；运行写 `v17-acceptance-results.json` 与 `v17-*.png`（本脚本产物，勿还原）。

—— 严守真 · V17-D5 真机验收完 ——
