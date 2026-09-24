# 植物大战僵尸 · PvZ Lite

纯前端单文件游戏，**零依赖、零构建**。双击 `plants-vs-zombies.html` 即可运行（也可直接拖进浏览器）。

- 技术栈：原生 HTML + Canvas 2D + WebAudio 合成音效
- 入口文件：`plants-vs-zombies.html`（全部代码都在里面；**规模/分区以 `docs/code-map.md` 为权威**，该文件由 `node tools/gen-code-map.mjs` 自动生成，行数不写死、随代码自动刷新）
- 画布尺寸：1000 × 680（`GRID_X=55, GRID_Y=80, CELL_W=90, CELL_H=104`，9 列 × 5 行草坪）

---

## 操作方式

| 操作 | 按键 / 鼠标 |
|---|---|
| 选卡 | 点卡片，或按 `1`–`7` |
| 种植 | 选卡后点草坪格子 |
| 收集阳光 | 点阳光 |
| 铲子 | 点左侧铲子槽，或按 `X`，再点要铲掉的植物（**返还一半卡价**，保底 25） |
| 暂停 / 继续 | `空格` 或点「⏸ 暂停」 |
| 取消选择 | `Esc` |
| 加速（1x/2x/4x） | `F` 或点「⏩」（档位跨局保留） |
| 静音切换 | `M` 或点「🔊」 |
| 返回菜单 | `R` 或点「🔄 重来」——**对局中需二次确认** |

---

## 内容一览

**7 种植物**

| 卡片 | 造价 | 卡片CD | 作用 |
|---|---|---|---|
| 向日葵 | 50 | 5s | 每 20s 产 25 阳光（种下后 7s 产第一颗） |
| 豌豆 | 100 | 5s | 20 dmg / 1.6s |
| 地瓜 | 25 | 20s | 埋雷 8s 武装 → 僵尸踩到爆炸，无差别秒杀（任何僵尸/任何难度一碰即死）+ 自毁 |
| 坚果 | 50 | 20s | 3000 耐久肉盾 |
| 双发 | 200 | 6s | 双发 18 dmg，合计 36 / 1.5s |
| 西瓜 | 175 | 8s | 65 dmg + 55 半径溅射，每 3.2s |
| 睡莲 | 25 | 5s | 水行地基：只能种在水行，垫上可再种其它植物（第四关起） |

**4 种僵尸**（速度为 px/s，已对齐原版节奏）

| 类型 | 血量 | 速度 | 分数 |
|---|---|---|---|
| 普通 normal | 180 | 16 | 50 |
| 路障 cone | 340 | 15 | 100 |
| 快速 fast | 140 | 45 | 80 |
| 铁桶 bucket | 560 | 12 | 150 |

**关卡**

| | 第一关 · 白天草坪 | 第二关 · 黄昏草坪 | 第三关 · 月夜草坪 | 第四关 · 泳池 |
|---|---|---|---|---|
| 初始阳光 | 150 | 150 | 100 | 150 |
| 波数 / 僵尸总数 | 5 波 / 13 只 | 6 波 / 24 只 | 7 波 / 33 只 | 8 波 / 38 只 |
| 僵尸种类 | 普通、路障 | 普通、路障、**快速** | 普通、路障、快速、**铁桶**（全员上阵） | 全员 + **水行战场** |
| 大波预警 | 第 5 波 | 第 4、6 波 | 第 3、5、7 波 | 第 3、6、8 波 |
| 草坪 | 纯绿 | 绿色 + 黄昏暖橙滤镜 | 夜绿 + 冷蓝月夜滤镜 | 绿植 + **2 水行（第 2/4 行）+ 水面波纹** |

- **水行规则（第四关）**：水行格必须先铺睡莲（25 费）才能种其它植物；僵尸入水有水花/涟漪/音效；垫被啃穿则其上植物陪葬
- 通关第 N 关后解锁第 N+1 关（`unlockedLevel`）
- 大波（`big:true`）触发前先播 2 秒「一大波僵尸即将来临！」横幅 + 警报音，**这 2 秒不刷怪**

**难度**：普通 / 困难 / 地狱，只影响僵尸血量（×1.0 / ×1.35 / ×1.80）和速度（×1.0 / ×1.15 / ×1.30）

### 测试模式（`?test=1`）

在地址后面加 `?test=1` 打开游戏即进入测试模式（例：`plants-vs-zombies.html?test=1`），右上角显示橙色「🧪 测试模式」角标。用途：调试、体验奖励卡、检查渲染——**非正常对局**。

| 行为 | 说明 |
|---|---|
| 阳光锁定 9999 | 种植物扣掉的下一帧立即回满 |
| 全卡池 12 种 | 无需通关/难度门槛，全部植物可直接选（含西瓜、玉米、冰冻西瓜等奖励卡） |
| 槽位拉满 10 | 卡栏一次最多带 10 张（**布局硬上限**：11 卡超画布宽度溢出） |
| 存档整体零写入 | `localStorage` 全部键（解锁进度/最高分/静音/积分统计/难度领卡记录等）一律不落盘——真实存档**绝无污染**，内存态 UI 照常显示 |

> 另一个可用参数：`?level=N`（N=1–5）直接进入指定关卡（测试模式下同样不写存档）。

---

## 架构要点

### 状态机
```
menu → play → end
```
- `state` 只能通过 **`setState(s, why)`** 修改（禁止直接赋值）
- 每次切换会在控制台打印 `[PvZ] state play → end (僵尸进屋) gt=63.2 wave=3`
- 排查"突然退出对局"这类偶现问题，看这行日志即可定位路径

### 四类实体，统一在 `update(dt)` 推进
```
plants[]       植物
zombies[]      僵尸
projectiles[]  子弹
effects[]      阳光 / 粒子 / 爆炸（kind: 'sun' | 'particle' | 'boom'）
```

### 关键设计
- **游戏时钟 `gt` 在 RAF 主循环 `loop()` 里累加，不在 `update()` 里** —— 这是最容易踩的坑
- **阳光是"可点击收集的实体"**，带 `targetY`，落到草坪指定 y 停住，停留 8s 后消失
- **僵尸逐个生成**，不是整波瞬刷：`newWave()` 只填 `spawnQueue`，`processSpawnQueue()` 按 `interval` 逐个放出
- **卡片冷却 `cardCD[type]` 与植物自身冷却 `p.cd` 是两个东西**，前者在 `update()` 里统一递减
- **植物死亡用 `_dying` 标记 + 统一清理**，绝不在 `for...of` 里 splice（会破坏迭代器）
- **主循环整帧 try/catch**：任意一帧抛异常都不会中断 `requestAnimationFrame` 续订（否则游戏永久卡死）

### 状态机注意：大波预警
`warn={active, t, last}`。检测到下一波是 `big` 且 `warn.last !== next` 时，进入预警（2 秒，`WARN_TOTAL`），**期间 `wave` 不推进、不刷怪**。

---

## 怎么改配置

> **先查代码地图**：`docs/code-map.md`（脚本生成，含分区/函数 → 行号区间 + 高频改动速查表）。
> 单文件规模见 `docs/code-map.md`（**不写死行数**，避免随代码漂移），**改动一律「先查表定位 → 只读目标区块 → 精确编辑」**，不要全文通读（省 token 且不易改错行）。
> 改完代码后重跑 `node tools/gen-code-map.mjs` 刷新行号。

**加/改一个关卡**：改 `LEVELS` 对象

```js
5:{                                // 示例数据：演示「加第五关」的写法，非实际关卡
  name:'第五关 · 示例关卡',
  startSun:100,
  armTime:8,
  lawn:['#8ec2a0','#7db090'],      // 草坪两色（可选，默认绿色）
  dusk:true,                       // 加黄昏滤镜（可选）
  totalWaves:6,                    // 必须与 waves.length 一致
  waves:[
    {spawns:[['normal',2]], interval:9},
    {spawns:[['normal',3],['fast',1]], interval:7, big:true},   // big = 大波预警
    // ...
  ]
}
```
改完记得同步菜单里的关卡按钮循环（`drawMenu` 与 `onClickMenu` 里的上界与 `bx` 基准，当前为 `i<=4`、`bx=190+(i-1)*160`——v1.2 四关口径；加到第五关则改 `i<=5` 并调 `bx` 基准，L3→L4 上线时即如此改过）。水域关另需 `water:true` 标志 + `WATER_ROWS` 常量（见 `plants-vs-zombies.html` L38/L108）。

**加一种植物**：`CARDS` 加条目 → `drawPlant()` 加画法 → `drawCardFace()` 加卡面 → 若有无特殊逻辑则在 `updatePlant()` 加分支。

**加一种僵尸**：`newWave()` 里的 `STATS` 加血量速度 → `drawZombie()` 加画法 → 关卡 `spawns` 里引用。

**改 UI 布局必读**：卡片栏右移时，`onClick` 里的命中判定必须同步改（用 `CARD_X0`，不是写死的 `6`）；菜单按钮的 y 坐标要在 `drawMenu` 和 `onClickMenu` 两处同时改。**这是本项目最容易出错的地方。**

---

## 无头测试方法（无需浏览器）

这套方法已验证可用，改完逻辑建议跑一遍回归。

```js
// 1) 抽出 <script> 内容
const m = html.match(/<script>([\s\S]*?)<\/script>/);
fs.writeFileSync('_check.js', m[1]);

// 2) 造 stub：ctx 用 Proxy 吞掉所有绘制调用
const ctxStub = new Proxy({}, {
  get:(t,k) => k in t ? t[k] : function(){ return String(k).startsWith('create') ? {addColorStop(){}} : undefined },
  set:(t,k,v) => { t[k]=v; return true }
});
const listeners = {}, winListeners = {};
const canvasStub = { width:1000, height:680, getContext:()=>ctxStub,
  addEventListener:(k,f)=>listeners[k]=f, focus(){}, 
  getBoundingClientRect:()=>({left:0,top:0,width:1000,height:680}) };

// 3) sandbox 必须显式挂上外部变量，否则追加代码里引用不到
sandbox.globalThis = sandbox;
sandbox.listeners = listeners;
sandbox.winListeners = winListeners;
sandbox.btns = btns;

// 4) 往脚本尾部追加探针（顶层 let/const 不挂 global，必须在同一作用域追加）
code += `globalThis.__probe = () => ({state, wave, sun, plants:plants.length, ...});
         globalThis.__api = { startGame, tick(dt){ gt+=dt; update(dt) }, ... };`;
vm.runInContext(code, sandbox);
```

### 踩过的坑

1. **必须自己补 `gt += dt`**（时钟在主循环里），否则波次永不触发，测试假通过
2. **测主循环时先 `step()` 消费掉脚本末尾已注册的那一帧**，别把 rafQueue 清空，否则后续全部假失败
3. **测异常隔离**：往 `zombies` 里 push `null` 就能让 `update()` 天然抛 TypeError，不用打桩
4. **统计真实刷怪数**：包装函数声明（函数声明绑定可变）
   ```js
   const _o = processSpawnQueue;
   processSpawnQueue = function(dt){ const b=spawnQueue.length; _o(dt); spawned += b-spawnQueue.length };
   ```
5. **别用"每帧采样 queue 内容"统计僵尸数** —— 同一只僵尸每帧都被数到，数字虚高几十倍
6. `window` 在 sandbox 里未定义 → `ac()` 里 `new (window.AudioContext||…)` 抛 ReferenceError 但被 try/catch 吞掉 → 音频静默降级，正好可用

---

## 已知陷阱（改代码前先看）

| 陷阱 | 说明 |
|---|---|
| `gt` 不在 `update()` 里 | 无头测试必须自己补 |
| 卡片冷却 vs 植物冷却 | `cardCD[type]` 是卡片栏、`p.cd` 是攻击间隔，共用一个名字极易搞混 |
| `for...of` 里 splice | 必须用 `_dying` 标记法，否则迭代器错乱 |
| 改布局忘改点击热区 | 见上文「怎么改配置」最后一段 |
| `requestAnimationFrame` 在函数末尾 | 一旦前面抛异常，循环永久停止（已用整帧 try/catch 兜住） |
| 快捷键绑 canvas | 按钮抢焦点后快捷键全失效（现已改绑 `window`） |

---

## 待办 / 可扩展方向

用户尚未选定，按推荐顺序：

1. ~~**手感打磨**~~ —— ✅ 已完成（2026-09-16，F-01~F-06 + D-11/D-14，见 `design/feel-impl-skeleton.md`）
2. ~~**第三关**~~ —— ✅ 已完成（v1.1 S3）：「月夜草坪」（`LEVELS[3]`，night 冷蓝滤镜）。~~后续地形方向：泳池~~ → ✅ **泳池已上线（v1.2）**；再后续：屋顶（斜坡、花盆）
3. ~~**localStorage 存档**~~ —— ✅ 已完成（v1.1 S1）：解锁进度 `pvz_unlocked`、静音偏好 `pvz_muted`、最高分 `pvz_highscore` 均持久化，读写统一走 `storageGet/storageSet` 并带 try/catch 降级
4. **更多植物** —— 樱桃炸弹、寒冰射手、大喷菇、三叶草
5. **更多僵尸** —— 旗帜僵尸（预警）、气球僵尸（飞行）、撑杆跳（跳过植物）、矿工（地下）
6. ~~**铲子退还部分阳光**~~ —— ✅ 已完成（v1.2）：返还一半卡价（向下取 25 倍数、保底 25），全关卡生效
7. **移动端触屏支持**
8. ~~**音效补齐**~~ —— ✅ 已完成（v1.1 S2，2026-09-17）：`design/audio-guide.md` B1–B10 全部落地（种植落地、卡片就绪、阳光分层、死亡分层、西瓜抛掷、失败强化、大波收束、菜单点击、铲子提示/铲空）+ §C 大波警报紧张 loop；规格与实现的偏差见该文件 §I

---

## 变更记录（2026-09-15）

- 从零实现：网格、6 植物、4 僵尸、阳光经济、卡片冷却、波次系统
- 修复：阳光掉出屏幕、僵尸速度过快、僵尸节奏过密、**卡片冷却永不递减导致无法重复种植**
- 新增：地瓜（土豆雷机制）、第一关、第二关（快速僵尸）、铲子、WebAudio 音效、大波预警
- v1.1 S3（2026-09-17）：第三关「月夜草坪」（7 波 33 只、铁桶登场、3 大波、冷蓝夜幕滤镜），新增 SMOKE-024 契约测试
- v1.2（2026-09-18）：第四关「泳池」——行级水域 `WATER_ROWS=[1,3]`、睡莲地基卡（第 7 卡）、水面波纹渲染、僵尸半浸与入水水花/音效；铲除返还一半卡价；4x 倍速跨局保留修复；门控升级至烟雾 26 + 全量 56 + 总线 56，bench 增设 L4 末波地狱场景；新增 SMOKE-025/026
- 加固：主循环异常隔离、快捷键改绑 window、按钮失焦、R/重来二次确认、`setState()` 日志留痕
