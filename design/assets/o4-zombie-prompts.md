# O4 僵尸形象精细化 · AI 生图提示词（首版 v1）

- 日期：2026-09-18 · 依据：`production/v1.2-plan.md` §七 硬约束清单
- 分工：旭峰拿下方提示词喂给 AI 生图工具（免费额度）→ 回传原图 → WorkBuddy 四步评估（透明通道/尺寸/水印核验 → 与现有 UI 并排配色目检 → 帧间一致性〔若多帧〕→ 通过/重出结论）→ 通过后 base64 内嵌
- **首版只出 1 张：普通僵尸（normal），单帧站立姿势，验画风用**。风格满意后再出其余 3 类

## 一、生成前必读（硬约束核对表）

| # | 约束 | 说明 |
|---|---|---|
| 1 | 透明背景 PNG | 工具不支持透明底 → 改**纯白底**出图（勿用绿底，与肤色/衣服撞色），回传后我程序抠图 |
| 2 | 面朝左 | 僵尸向左行进，游戏代码无翻转逻辑，图必须原生朝左 |
| 3 | 全身居中不裁边 | 肢体完整，角色占画面约 80% |
| 4 | 出图分辨率最大档 | ≥1024×1024 优先（内嵌时缩到 256 内，大图缩图无损细节） |
| 5 | 禁文字禁水印 | 负向词里已带，出图后仍需肉眼确认 |
| 6 | 同批同模型 | 4 类僵尸用**同一工具同一模型**连续生成，只换装备句，锁画风 |
| 7 | 头身比 | PvZ 特征 = 头大身小（chibi 感），提示词已带 |

## 二、主提示词 · 英文版（Midjourney / SD / DALL-E 等）

`{装备句}` 处按第三节替换；首版用 normal。

```
2D game character sprite of a cartoon zombie, hand-drawn illustration style,
clean dark outlines, soft cel shading, humorous and goofy not scary,
slightly oversized head chibi proportions, pale sage-green skin,
{装备句}
tattered olive-green suit jacket with torn sleeves, dark brown trousers,
mouth open showing dark red mouth, dull wide eyes with tiny pupils,
both arms stretched forward, classic shamble standing pose,
full body, three-quarter side view, FACING LEFT,
single character centered, isolated on fully transparent background,
no shadow, no ground, no scenery, no text, no watermark, sharp details
```

**Negative prompt**（支持负向词的工具必填）：

```
background, scenery, grass, ground, floor, shadow, text, watermark, signature,
logo, border, frame, realistic, photorealistic, 3D render, horror, gore, blood,
extra limbs, deformed hands, cropped, cut off, blurry, multiple characters
```

## 三、四类僵尸 · 装备句（同骨架只换这一段）

| 类型 | 英文装备句 | 中文装备句 |
|---|---|---|
| **normal**（首版） | `messy short dark hair patches,` | 头顶几撮凌乱深色短发 |
| **cone** | `wearing a bright orange traffic cone as a hat, tilted slightly,` | 头上歪戴一顶亮橙色交通路障锥 |
| **bucket** | `wearing a dented gray metal bucket as a helmet covering the top of his head,` | 头顶扣着一顶有凹痕的灰色金属铁桶当头盔 |
| **fast** | `wearing a red athletic sleeveless shirt and red sweatband, lean build,` | 穿红色无袖运动背心、绑红色汗带，身材精瘦 |

## 四、主提示词 · 中文版（即梦 / 豆包等中文模型）

```
卡通僵尸游戏角色立绘，手绘插画风格，干净的深色描边，柔和赛璐璐上色，
幽默憨傻不恐怖，头大身小的Q版比例，灰绿色苍白皮肤，
{中文装备句，见上表}
破烂的橄榄绿西装外套袖子撕裂，深棕色裤子，
张嘴露出暗红色口腔，呆滞的大眼睛小瞳孔，
双臂向前平伸，经典僵尸站立姿势，
全身，四分之三侧面，面朝左侧，
单个角色居中，纯透明背景，
无阴影无地面无场景，无文字无水印，细节清晰
```

## 五、回传清单

生图后回传时请附上：
1. **原始 PNG 文件**（勿截图，截图会丢透明通道）
2. 生成工具名 + 所用模型（便于下批复现同款画风）
3. 若同批出了多类，全部打包回传

收到后我跑四步评估并给结论（通过 → 进入内嵌施工；重出 → 附修订后的提示词）。

## 六、评估基线（WorkBuddy 侧存档）

- 现游戏实色参照：肤色 `#c5d0a0` / 衣服 `#5a6a4a` / 裤 `#3a2a1a` / cone `#d97b2a` / bucket `#b0b0b0` / fast 红 `#c04040`；草坪 `#88c250`-`#77b042` 暖绿
- 运行时规格：逻辑 96×128 格，身体全高 ≈88px，头半径 ≈18px；水行裁切线在腰 y=16（贴图需保证腰线以上完整可读）
- 内嵌施工量预估：base64 + drawZombie 改 drawImage + walk 相位映射帧索引，约 +40~80 行，四道门控照跑
