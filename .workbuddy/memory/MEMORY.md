# PvZ Lite · 项目长期记忆

## 项目与版本线
- 纯前端**单文件**游戏 `plants-vs-zombies.html`，零依赖零构建，仅 PC；规模以 `docs/code-map.md` 头部为准（别写死行数）
- 硬规则：**code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`**；禁同文件并行 Edit；无用户许可不 Write/Edit/commit；改源码走新版本流程，**七处冻结产物**（v1.0.0/v1.1/v1.2/v1.2.1/v1.3/v1.4/v1.5）只读
- 版本线：v1.0.0→…→v1.3→v1.4.0（定版刀 `d883d6c`，tag `v1.4`）→**v1.5.0 已发（09-21，已推送闭环）**：定版刀 `56b8d25`（VERSION L49=`v1.5.0`，源码 diff 精确 1 行）→发布包 `c722c05`（四件套 + perf §7.1）→闭环回填 `2f1f646`→记忆 `1fc9e1e`；冻结副本 `production/release/v1.5/artifacts/plants-vs-zombies.v1.5.html`（LF SHA-256 `4dcf8921…de2e0`，3168 行/153,230 字节）；tag `v1.5`=`56b8d25`（轻量），main+tag 全推 ✅
- ⚠️ `git push --follow-tags` 只推附注标签，轻量标签须显式 `git push origin <tag>`（v1.3/v1.4 惯例=轻量）
- N-13 多语言/N-14 移动端不做（🧊，x.0.0 时确认）

## 当前状态与下一刀（09-22 07:3x · **v1.6.0-wip 五刀已落地并推送**；下一刀 = 定版发布）
- **v1.5.0 已发布**；R2 平衡评审 PASS/NOTE（`production/v15-trio-balance-review.md` v1.1）
- **v1.6.0-wip 四刀已落地**（团队 `pvz-v16-build` 前三刀 + `pvz-v16-corn` 第4刀；engineering-lead 改源码 / quality-lead 改测试 / 主理人逐段核验）：
  ①**bug1** 震动+闪光衰减迁 `loop()` 无条件段（覆盖 menu/play/end 三态；原在 `update()` 仅 play 态跑 ⇒ 结算屏永久抖动）
  ②**bug2** 斜坡列直射（**唯一口径 `level.roof && p.col<ROOF_COLS`，禁用 `liftX>0`**——平台列 liftX 亦=60 会误伤）保留开火动作/音效但弹体撞壁消失（三判据：坡面相交 yOff×7.5 · 坡顶折角 xt=505 · **最小飞行 30px**；`continue` 短路命中）；投掷类免疫；平台列照常命中
  ③**corn** 100 阳 / 单发 15 / 2.6s / 溅射 6 + **25% 黄油弹（发射时掷定）→ 命中完全定身 2.5s**（移动/啃食/walk 三停，与 chill `slowT` 独立并存；**仅直中定身**=用户拍板）；弹体双形态（黄油=白奶酪块）+ 头顶黄油渍
  ④**第4刀 · 投掷类真抛物**（用户令"玉米投手做成和卷心菜投手一样，投掷类不是直射"）：corn/**melon/icemelon** 迁出直线贴坡弹道，与 cabbage 共用新顶层解算器 **`fireArcProjectile()` @L1365**（复用 `CABBAGE_VX=260/CABBAGE_G=500`，零新常量）；**★红线：抛物积分判定改字段 `pr.vy!==undefined`（积分 L1539 / 越界 L1563），禁用 type 白名单**（三处注入式弹体无 vy/g ⇒ 白名单致 NaN 崩）；绘制加 `atan2(vy,vx)` 倾角；**音效口径主理人拍板 = 仅 `SFX.melonThrow`、零 `SFX.shoot`**（与 cabbage 同制；若要回退只需加回 3 行）
  ⑤**第5刀 · 测试模式全卡池 + 零写存档守卫**（用户令「测试模式下把所有的植物都放出来给我选择，我现在选择不到西瓜」）：`loadMeta()` 之后（L343-349）`if(testMode){ ownedCards=CARDS.map(c=>c.type); slots=SLOT_CONFIG.maxSlots; }` —— 卡池全开 **12 种**（含西瓜/玉米/冰冻射手/冰冻西瓜）+ 槽位 **10**；**★槽位 10 = 布局硬上限**（游戏内卡栏 10 卡 992px<1000、11 卡 1084 溢出；选卡下排 10 槽 990≤1000；待选网格 5×3=15 格容 12 张 ⇒ 可见 12 种、一次最多带 10 种）；**★存档零写口径**：`saveMeta()` 首行 `if(testMode)return;`（整体覆盖 6 键）+ `pvz_unlocked`(L1912) / `pvz_highscore`(L367，内存态 `highScore` 仍刷新) / `pvz_muted`(L831) 三处独立守卫 ⇒ 测试模式为**纯沙盒**，通关/静音一律不落盘；HUD 角标补「全卡池 · 10槽」
- **门控全绿（主理人亲手复跑）**：烟雾 **29/29** · 回归含 SMOKE **86/86**（v1.6 起 +REG-FREEZE-01 / +REG-THROW-01 / +REG-TESTMODE-01）· 总线 **56/56** · bench **PASS**（E 屋顶 p95 1.42ms，无回退）；源码 3168→**3289 行**
- **★ 09-22 终态（本机 = 原开发机 weixufeng）**：v1.6.0-wip **已提交**（`0026a4e` 升版刀 → `34d280a` 三刀真机验收 → `cda19a8` 记忆 → **`2d1aa6b` 第4刀源码+测试** → **`b40e351` 第5刀测试模式全卡池 + 零写存档守卫**）；VERSION=`v1.6.0-wip`；**前三刀**真机验收 **PASS 14/14**（`tests/playtests/v16-acceptance.{js,md}` + `-results.json` + 5 截图；quality-lead 执行、主理人独立抽验"未改断言凑 PASS"）；**★ 第4刀目前只有自动化门控，尚无真机验收**（屋顶看玉米/西瓜弧线手感这一项未做）④ **★ 下一刀 = 定版发布**（照 v1.5 四件套：定版刀 VERSION→`v1.6.0` → 发布包三件套 → 冻结副本 LF 口径 → tag `v1.6`（轻量，显式推）→ 推送）；**建议定版前补一轮第4刀真机手法验收**
- **换机核验指纹（v1.6.0-wip 五刀后 = 当前最新，LF 口径）**：`git show b40e351:plants-vs-zombies.html | sha256sum` = `ed39b6f16fc86e00c944e56a81561f1f1e684b18ca3176cb731d255aef2e749d` / **162,618 字节** / **3289 行**
- **换机核验指纹（v1.6.0-wip 四刀后，LF 口径）**：`git show 2d1aa6b:plants-vs-zombies.html | sha256sum` = `b52b60492859be239fa207af55d503bf2beb5e454e41ca00e7c421d2364842df` / **161,656 字节** / **3282 行**
- **换机核验指纹（v1.6.0-wip 三刀后，LF 口径）**：`git show 34d280a:plants-vs-zombies.html | sha256sum` = `3846d495e0a3cd41e6b22223865b557f545c39d8fd666e062fbd951eeccff165` / 159,007 字节 / 3235 行
- **换机核验指纹（v1.5.0 定版，LF 口径）**：`git show 56b8d25:plants-vs-zombies.html | sha256sum` = `4dcf8921374d389c0ef30a63c74e891fd0856b6d99730f321f60e6a6893de2e0` / 153,230 字节
- **★ 新坑位**：①startGame 清 selected 后发 Escape=togglePause 拦截热键（SMOKE-029 修）②命中后同 tick slowT 已递减，断言须区间式（>1.9&&≤2.0）③**复跑 `tests/playtests/v15-acceptance.js` 会重写 results.json 与 chill-after.png**（截图有渲染抖动）→ 会脏工作树，跑完记得 `git checkout --` 还原
- **★ 09-22 新增坑位**：①**本地 tag 只到 v1.3 —— v1.4/v1.5 标签丢失**（提交 `d883d6c`/`56b8d25` 均在库，`packed-refs` 与 loose 两处皆无）⇒ 网络恢复后 `git fetch --tags` 补齐 ②**v16 验收脚本受控构造**：弹体 x=400 时僵尸须放 x=435（`|Δx|=35 < 42` 命中窗 L1539）；放 452 会恒 miss 造成**假挂**（首轮 C3/C5 即此因，非源码缺陷）③Bash 工具对**本机 Edge 子进程 stdout 不回传**（Edge 继承管道致读取端不收 EOF）⇒ 重定向 `> log 2>&1` 再 Read，以 `*-results.json` 为权威 ④`CARDS` 表 `cd:6`=卡片冷却，与 `p.cd=2.6`（射击间隔，L1385）是**两个字段**，勿混
- **★ 第4刀坑位**：①**测试判别力自证手法（强烈推荐复用）**：`PVZ_HTML_PATH=<旧版文件路径> node tests/harness/run-all.js --all` 复跑**改后**用例 ⇒ 旧版必红才算「有判别力」（本轮三红：SMOKE-023/REG-THROW-01/REG-PLANT-02）②**`setLevel(5)` 会残留在同一 game 上**（`startGame` **不重置关卡**）⇒ 同一用例内后续 Part 若按非屋顶关预期种植会因"屋顶需盆"**假红**，setup 须显式 `setLevel(1)` 复位 ③**SMOKE-028 Part F（越坡命中）在旧版亦 PASS**（旧版贴坡直线同样能命中）⇒ 它只是**覆盖扩展**、不是第 4 刀的判别器；真判别器是 **REG-THROW-01 §1 的 `vy/g` 断言**。日后要让 Part F 自证抛物，须断言**轨迹形态**（y 先升后降），不能仅凭 hp 下降 ④`SFX.melonThrow` 带独立 sfxGate 节流（`gate('melonThrow',0.13)` 在**函数体内**）⇒ 打桩须**整体替换该函数**才能绕过节流、使计数=真实发射数 ⑤抽公用解算器改动既有投掷类时，等价性自证必须比对**全字段 + 投影数组本身（移除时序）+ 僵尸 hp（命中时刻）**，只比坐标不足
- **★ 第5刀坑位**：①**harness 与浏览器不同构**——vm 沙箱**不含 `URLSearchParams`** ⇒ `loadGame({search:'?test=1'})` **不激活测试模式**（游戏内 `new URLSearchParams` 抛错被 try 吞 ⇒ `testMode` 恒 false）、`?level=N` 同样静默失效（**这正是历史回归用例全部绕道 `setLevel()` 的真正原因**）。已在 `tests/harness/index.js` 注入 Node 内建 `URLSearchParams` 修复；`bench.js` 的独立加载器 `benchLoadGame` 仍未注入（它不用 search，可另行处理）②**隔离类需求应「整体零写」而非逐键守卫**——第5刀逐键守了 cards/slots 后，自证阶段才发现 `pvz_diff_clears`（后果=**永久吞掉难度门槛发卡**）/`pvz_unlocked`/`pvz_highscore`/`pvz_muted` 相继漏守，最终改 `saveMeta()` 首行 `if(testMode)return;` 一处收口。**新增任何存档键时，务必回头检查 testMode 守卫**③**断言防空转两招（可复用）**——预置 `pvz_highscore` 低值 + 前置断言 `score>1`，确保 `updateBest` 写入分支**真被走到**（否则守卫未被验证=假绿）；再用「普通模式对照**必须**落盘」排除「分支本身跑不到所以看起来零写」的伪证 ④**槽位上限是布局约束、不是数值约束**——游戏内卡栏 10 卡 992px<1000、11 卡 1084 溢出；选卡下排 10 槽 990≤1000。**提升槽位前先算宽度**

## 门控基线（改源码后必须全绿）
烟雾 `tests/harness/run-smoke.js` **29/29** ｜ 回归 `tests/harness/run-all.js --all` **86/86**（v1.5 起 +REG-CHILL-01/02；v1.6 起 +REG-FREEZE-01 / +REG-THROW-01 / +REG-TESTMODE-01） ｜ 总线 `tests/harness/verify-bus.js` **56/56** ｜ bench `tests/perf/bench.js` 五场景 PASS（E=L5 屋顶地狱）。判级异常先看 draw call 结构量是否漂移，不动=噪声复跑

## 环境与命令
- Node 绝对路径（**三机不同，先确认自己在哪台**）：
  · 前开发机 `C:\Users\user3667\.workbuddy\binaries\node\versions\22.22.2-3\node.exe`
  · 家庭电脑（Administrator）`C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2/node.exe`
  · 原开发机（weixufeng，i3-10110U）`C:\Users\weixufeng\.workbuddy\binaries\node\versions\22.22.2-3\node.exe`
  （裸 `node` 不在 PATH，shim 污染时 unset 也救不了）
- Bash 每命令开头：`export PATH="/usr/bin:/bin:/mingw64/bin:/c/Windows/System32:/c/Windows"; unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY`
- **推送（本机 origin = HTTPS，凭据走 GCM 已存账号）**：
  · **★ 首选配方（09-22 实测成功）**：`GIT_TERMINAL_PROMPT=0 git -c "http.https://github.com.proxy=" push origin main` —— 绕过 `~/.gitconfig` 里漂移的 `http.https://github.com.proxy=http://127.0.0.1:7892` 走直连（实测 `cda19a8..2d1aa6b` 成功）。**site-specific key 必须写全**，写 `-c http.proxy=` 覆盖不到、无效
  · 直连不通时才开 Clash 加速器（端口 **7892**，非 7890）；未开时指纹 = `Failed to connect to github.com:443 over proxy 127.0.0.1`
  · 备用：unset proxy + `-c credential.helper='!"<PortableGit>/…/git-credential-manager.exe"'` 显式指定 GCM
  · **换机后凭据不随行**：GCM 无账号 + SSH key 未注册 = 必失败（`could not read Username` / `Permission denied (publickey)`），须重新建认证
  · SSH 方案本机不可用（走 relay 报 `errno=10061`，`ssh -T git@github.com` 不通）
- github 域走 `127.0.0.1:7890`（Clash 加速器，env 里 HTTP(S)_PROXY）；`unset` 后直连也可达；**没开加速器且直连不通=Connection refused 指纹**，先问用户再排查
- **★ 沙箱红线**：SSH remote 下 `git ls-remote` 会读 `~/.ssh`，**会被沙箱拦截**（blocked paths = `~/.ssh/*`）——远端核验改用 HTTPS 匿名 ls-remote（公开仓库），或直接读 push 输出，**别反复重试**
- 换机：git pull → `git show <定版刀>:plants-vs-zombies.html | sha256sum` 核验（直接 sha256sum 工作区文件因 CRLF 虚警）；冻结副本导出必须 Buffer 直通（LF 权威口径）

## 关键坑与方法论（防重复摸索）
- push 后 `[ahead N]`/`[gone]` 是假象，以远端实测为准（**SSH remote 下 ls-remote 被沙箱拦，改用 HTTPS 匿名 ls-remote 或读 push 输出**）；修复=40 位全哈希 sed 直改 `.git/packed-refs`
- `git add` 别带不存在路径；提交后必看 `git show --stat`（防并行会话卷带）；**已推送的不得 amend**
- 浏览器自动化：Edge headless+CDP（`--remote-debugging-port=9333`），真实点击 `Input.dispatchMouseEvent`；性能结论必须开 GPU 轮；canvas 可 getImageData 像素判读（范例 `tests/playtests/o3-final-verify.js`）
- 画面反馈与代码不符先查旧标签页（未强刷见旧版渲染）
- WebAudio 合成音色天花板：落水声两轮参数方案真机均否，O1/O2 冻结待采样 base64 拍板；SFX 异常包裹层吞错，SMOKE-014 计数是唯一曝光口；命名偏差有意：B1→SFX.plant、B4→SFX.death(type)、melonThrow 独立节流键
- harness ctx 是 Proxy 桩：render 变异须「未定义变量 ReferenceError」写法；桩里 `ctx.canvas` 是函数禁读 width（用 DOM `canvas.width`）；连续铲两格各重选铲子；豌豆=CARDS[1]
- harness 桥接：顶层 function 经 `sb.<name>` 直达；**const 常量不挂、sb.eval 不存在**（断言写死值）；`setLevel(n)` 是 LEVELS 键 1-5（屋顶=5）；用例不推进 update 则 cardCD 不衰减（同卡二次种植被拒，换卡或重置 seed）；`sb.toast=fn` 捕获提示语；`probe().cardCD` 预填充 9 键全 0（断「所有值≤0」）；gameSpeed 不挂桥（经 `sb.btns.fast.onclick` 连点 1→2→4→1）；推 update 用 `g.__updateRaw(dt)`；RAF 帧步进=shift rafQueue+手动时间戳
- 同文件多处 Edit 有并行竞态（编辑后 grep 回验）；CRLF 工作区大段 Edit 易字节差异挂（小步串行 Edit）
- REG-END-02 现锁 `__LEVELS[6]===undefined`（新关上线后再平移）
- 团队协作：先 TeamCreate 再 spawn（name=Agent ID）；子代理中断后口头进度不可信，接手先实证核验落盘状态
