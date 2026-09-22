# PvZ Lite · 项目长期记忆

## 项目与版本线
- 纯前端**单文件**游戏 `plants-vs-zombies.html`，零依赖零构建，仅 PC；规模以 `docs/code-map.md` 头部为准（别写死行数）
- 硬规则：**code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`**；禁同文件并行 Edit；无用户许可不 Write/Edit/commit；改源码走新版本流程，**冻结产物**（v1.0.0/v1.1/v1.2/v1.2.1/v1.3/v1.4/v1.5/v1.6）只读
- 版本线：v1.0.0→…→v1.4.0（`d883d6c`）→ v1.5.0（09-21，`56b8d25`，tag `v1.5`）→ **v1.6.0 已发布（09-22，定版刀 `0b969d5`，发布包 `3d10b99`，main=`5904ce8`，tag `v1.6` 已推、远端双确认 ✅）**
- v1.6 五刀：①bug1 震动衰减迁 `loop()` 无条件段（结算屏永久抖动修复）②bug2 斜坡列直射撞壁（唯一口径 `level.roof && col<ROOF_COLS`，禁 `liftX>0`；三判据：坡面相交/xt=505/最小飞行 30px；投掷类免疫）③corn 黄油重做（100 阳/15 伤/25% 黄油弹→完全定身 2.5s 三停，仅直中，与 chill 独立并存）④投掷类真抛物（公用解算器 `fireArcProjectile()`，**红线：积分判定 `pr.vy!==undefined` 字段式，禁 type 白名单**；音效仅 `SFX.melonThrow`）⑤测试模式全卡池 12 + 槽位 10（布局硬上限：10 卡 992px<1000）+ **存档整体零写**（`saveMeta` 首行 `if(testMode)return` + unlocked/highscore/muted 三处独立守卫）
- ⚠️ `git push --follow-tags` 只推附注标签，轻量标签须显式 `git push origin <tag>`；N-13 多语言/N-14 移动端不做（🧊，x.0.0 时确认）

## 当前状态（09-22 09:5x · 本机 = 前开发机 user3667 / i5-12500）
- **v1.6.0 发布包已建**：`production/release/v1.6/` 四件套（RELEASE-NOTES 93 行 / CHECKLIST 84 行 / KNOWN-ISSUES 52 行 / artifacts 冻结副本）+ 第4刀真机视觉验收 V16-ACC-Q2 三产物
- **★ v1.6.0 冻结副本指纹（当前权威，LF 口径）**：`git show 0b969d5:plants-vs-zombies.html | sha256sum` = `4c386eaed52e0cf0a556bd2e9c11bff639a9020acd352cd7d9bec0dd64db0989` / **162,594 字节 / 3289 行**（Buffer 直通导出，双口径核验一致）
- 历史指纹：五刀 wip `b40e351`=`ed39b6f1…e749d`/162,618 B；四刀 `2d1aa6b`=`b52b6049…42df`/161,656 B/3282 行；三刀 `34d280a`=`3846d495…f165`/159,007 B/3235 行；v1.5 `56b8d25`=`4dcf8921…de2e0`/153,230 B
- **验收**：三刀真机 V16-ACC-Q1 **PASS 14/14**；第4刀视觉补课 V16-ACC-Q2 **PASS 5/5**（`tests/playtests/v16-throw-arc-visual.js`：四投掷类 y 先升后降 154px + vy 变号 + 命中；melon 三帧截图 md5 互异 + 绿主体像素实证）
- **门控全绿（本机 i5-12500 复跑）**：烟雾 29/29 · 回归 **86/86**（v1.6 起 +REG-FREEZE-01/+REG-THROW-01/+REG-TESTMODE-01）· 总线 56/56 · bench PASS（E p95 0.94ms；**DC 2627 与 v1.5 逐场景一致 ⇒ 零渲染结构漂移**）；perf-profile §7 已回填 i5-12500 口径
- **⏳ 下一动作**：①~~推送闭环~~ ✅ 已完成（09-22 授权，main=`5904ce8` + tag `v1.6` 远端双确认）②可选：R1 黄油强度人工复核、README 增补 `?test=1` 说明

## 门控基线（改源码后必须全绿）
烟雾 `tests/harness/run-smoke.js` **29/29** ｜ 回归 `tests/harness/run-all.js --all` **86/86** ｜ 总线 `tests/harness/verify-bus.js` **56/56** ｜ bench `tests/perf/bench.js` 五场景 PASS（E=L5 屋顶地狱）。判级异常先看 draw call 结构量是否漂移，不动=噪声复跑

## 环境与命令
- Node 绝对路径（**三机不同，先确认自己在哪台**）：
  · 前开发机 `C:\Users\user3667\.workbuddy\binaries\node\versions\22.22.2-3\node.exe`
  · 家庭电脑（Administrator）`C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2/node.exe`
  · 原开发机（weixufeng，i3-10110U）`C:\Users\weixufeng\.workbuddy\binaries\node\versions\22.22.2-3\node.exe`
  （裸 `node` 不在 PATH，shim 污染时 unset 也救不了）
- Bash 每命令开头：`export PATH="/usr/bin:/bin:/mingw64/bin:/c/Windows/System32:/c/Windows"; unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY`
- **推送（本机 origin = HTTPS，凭据走 GCM 已存账号）**：
  · 直连配方 `-c "http.https://github.com.proxy="` **不是永真式**（09-22 下午失效：读操作 ls-remote 直连通、写操作 push 连挂 `HTTP 302 curl 22`）⇒ **「读通写不通」先探测 Clash 端口**（7892 可能已关、7890 可能开着），哪个通走哪个：`-c "http.https://github.com.proxy=http://127.0.0.1:7890" push`（09-22 一把成功）
  · 直连不通时才开 Clash 加速器；历史端口 **7892**，也实测过 **7890**，两端口都 curl 探测一下再决策
  · 备用：`-c credential.helper= -c credential.helper='!"<PortableGit>/…/git-credential-manager.exe"'` 显式指定 GCM
  · **换机后凭据不随行**：GCM 无账号 + SSH key 未注册 = 必失败，须重新建认证；SSH 方案本机不可用（relay `errno=10061`）
- **★ 沙箱红线**：SSH remote 下 `git ls-remote` 读 `~/.ssh` 会被拦——远端核验用 HTTPS 匿名 ls-remote（公开仓库）或读 push 输出
- 换机：git pull → `git show <定版刀>:plants-vs-zombies.html | sha256sum` 核验（直接 sha256sum 工作区文件因 CRLF 虚警）；冻结副本导出必须 Buffer 直通（LF 权威口径）

## 关键坑与方法论（防重复摸索）
- **★ CDP 截图假同帧（09-22 V16-ACC-Q2 实证）**：真机截图前必须**冻结游戏 raf 主循环**（`paused=true + drawPause` 空转），否则 evaluate 里 render() 的帧被主循环覆盖 ⇒ 多帧 md5 全同。最小 data-URL 实验证明 CDP 截图本身忠实反映 canvas 变化，别误判成 CDP 去重
- **★ 弹体像素判据用主体色系**（如西瓜绿 `g>r+20 && g>b+20`），"非背景色"误命中僵尸/草皮
- push 后 `[ahead N]`/`[gone]` 是假象，以远端实测为准；`git add` 别带不存在路径；提交后必看 `git show --stat`（防并行会话卷带）；**已推送的不得 amend**
- 复跑 `tests/playtests/v15-acceptance.js` / `v16-acceptance.js` 会重写 results.json 与 png（截图有渲染抖动）→ 脏工作树，跑完 `git checkout --` 还原
- **v16 验收脚本受控构造**：弹体 x=400 时僵尸须放 x=435（`|Δx|=35 < 42` 命中窗）；放 452 恒 miss = **假挂**
- Bash 工具对本机 Edge 子进程 stdout 不回传（不收 EOF）⇒ 重定向 `> log 2>&1` 再 Read，以 `*-results.json` 为权威
- `CARDS` 表 `cd:6`=卡片冷却 ≠ `p.cd=2.6`（射击间隔）；命中后同 tick slowT 已递减，断言须区间式
- **第4刀坑位**：①测试判别力自证：`PVZ_HTML_PATH=<旧版> run-all.js --all` 复跑改后用例，旧版必红才算有判别力 ②`setLevel(5)` 残留（`startGame` 不重置关卡），setup 须显式 `setLevel(1)` 复位 ③`SFX.melonThrow` 节流 gate 在函数体内，打桩须整体替换 ④抽公用解算器的等价性自证须比**全字段+投影数组+僵尸 hp**
- **第5刀坑位**：①vm 沙箱缺 `URLSearchParams`（已修注入；`bench.js` 独立加载器仍未注入，不用 search 无影响）②隔离类需求优先「整体零写」而非逐键守卫（逐键必漏）③防空转两招：预置低分+前置断言确保写入分支真被走到；普通模式对照排除伪证 ④槽位上限是布局约束，提升前先算宽度
- 浏览器自动化：Edge headless+CDP，真实点击 `Input.dispatchMouseEvent`；canvas 可 getImageData 像素判读
- harness ctx 是 Proxy 桩：render 变异须「未定义变量 ReferenceError」写法；桥接：顶层 function 经 `sb.<name>` 直达，**const 常量不挂**；`setLevel(n)` 键 1-5（屋顶=5）；推 update 用 `g.__updateRaw(dt)`
- 同文件多处 Edit 有并行竞态（编辑后 grep 回验）；CRLF 工作区大段 Edit 易挂（小步串行 Edit）
- REG-END-02 现锁 `__LEVELS[6]===undefined`（新关上线后再平移）
- 团队协作：先 TeamCreate 再 spawn；子代理中断后口头进度不可信，接手先实证核验落盘状态；主理人划的「不要动」边界须先请示再动
