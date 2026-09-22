# PvZ Lite · 项目长期记忆

## 项目与版本线
- 纯前端**单文件**游戏 `plants-vs-zombies.html`，零依赖零构建，仅 PC；规模以 `docs/code-map.md` 头部为准（别写死行数）
- 硬规则：**code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`**；禁同文件并行 Edit；无用户许可不 Write/Edit/commit；改源码走新版本流程，**冻结产物**（v1.0.0/v1.1/v1.2/v1.2.1/v1.3/v1.4/v1.5/v1.6/v1.7）只读
- 版本线：v1.0.0→…→v1.4.0（`d883d6c`）→ v1.5.0（09-21，`56b8d25`，tag `v1.5`）→ v1.6.0（09-22，定版刀 `0b969d5`，发布包 `3d10b99`，tag `v1.6` 已推 ✅）→ **v1.7.0 已定版（09-22，**源码权威提交 `c379872`**，发布包 `988b69f`，tag `v1.7.0` 已打；⏳ 待用户授权推送）**
- v1.7 两需求（设计拍板 Q-1~Q-4 全采纳）：**R-A** 黄油 25%→**27%**、定身 2.5s→**3.0s**（口径不变：发射时掷定 / 仅直中 / 与 chill 独立并存）· **R-B** cabbage 补 `splash:30,splashRatio:0.40`（溅射 8）—— **corn/melon/icemelon 的溅射 v1.5/v1.6 已具备且天然构成「小/大」两级，唯一实现增量即 cabbage 一行**，`fireArcProjectile` 透传与溅射循环零改动；另修 **3 项测试基建缺陷**（真机脚本 PAGE 硬编码 `PvZlite` → cwd 推导 / `v16-acceptance` C2 恒假判据 → `tagged===butter` / env 参数化 `PVZ_EXPECT_VER`）
- v1.6 五刀：①bug1 震动衰减迁 `loop()` 无条件段（结算屏永久抖动修复）②bug2 斜坡列直射撞壁（唯一口径 `level.roof && col<ROOF_COLS`，禁 `liftX>0`；三判据：坡面相交/xt=505/最小飞行 30px；投掷类免疫）③corn 黄油重做（100 阳/15 伤/25% 黄油弹→完全定身 2.5s 三停，仅直中，与 chill 独立并存）④投掷类真抛物（公用解算器 `fireArcProjectile()`，**红线：积分判定 `pr.vy!==undefined` 字段式，禁 type 白名单**；音效仅 `SFX.melonThrow`）⑤测试模式全卡池 12 + 槽位 10（布局硬上限：10 卡 992px<1000）+ **存档整体零写**（`saveMeta` 首行 `if(testMode)return` + unlocked/highscore/muted 三处独立守卫）
- ⚠️ `git push --follow-tags` 只推附注标签，轻量标签须显式 `git push origin <tag>`；N-13 多语言/N-14 移动端不做（🧊，x.0.0 时确认）

## 当前状态（09-22 15:3x · 本机 = 前开发机 user3667 / i5-12500）
- **v1.7.0 已定版：本地已提交、未推送**。提交链 `5803334`（feat：R-A+R-B+**定版刀**）→ `e2c3fdf`（test：D-3 数据 + v17 真机）→ `c379872`（chore：注释版本标签同步 = **源码权威提交**）→ `988b69f`（release：发布包四件套）
- **★ v1.7.0 冻结副本指纹（当前权威，LF 口径）**：`git show c379872:plants-vs-zombies.html | sha256sum` = `5ff52d2b3de907195f851eb90e4dd9d60540327daf35f569cc3403e1e8fd14f6` / **162,685 字节 / 3289 行**（Buffer 直通导出；`hasCR=false`；双口径核验一致）
- 历史指纹：v1.6 `0b969d5`=`4c386eae…db0989`/162,594 B；五刀 wip `b40e351`=`ed39b6f1…e749d`/162,618 B；四刀 `2d1aa6b`=`b52b6049…42df`/161,656 B/3282 行；三刀 `34d280a`=`3846d495…f165`/159,007 B/3235 行；v1.5 `56b8d25`=`4dcf8921…de2e0`/153,230 B
- **验收（v1.7）**：`v17-acceptance.js`（端口 9354）**PASS 7/7**——cabbage 同排 A 直中 20 + B 溅射 **8** 且 `B.freezeT=0`（溅射不定身口径守住）、对照臂（>30px）0 掉血；corn/melon/icemelon 溅射 **6/35.75/35.75 未变**；黄油命中当刻 `freezeT=3.0` + 三停 + 3.33s 恢复；N=4000 概率 26.32%。`v16-acceptance.js`（PORT=9352）**PASS 14/14**（需 `PVZ_EXPECT_VER=1.7`；C2 修复后转绿）。**判别力自证**：旧源（`b0bf23a`）复跑 **85/86**，红灯 `REG-FREEZE-01 §1 :: 2.45`
- **D-3 平衡数据**：定身覆盖率 **25.83%→31.19%**（+20.8% 相对；**低于设计稿投影 +26~30%**，根因 = 投影未刻画 `T>cd` 刷新重叠浪费）；地狱 bucket home 20/20 · 击杀 0/20 不变；corn DPS 5.66 未动；**多 corn 臂（设计稿标注唯一未测风险点）→ 关闭**：1/2/3 株 frozenFrac 33.1/56.0/60.9%，**timeout 全 0** ⇒ 非锁死
- **门控全绿（定版刀后主理人亲手复跑两轮）**：烟雾 29/29 · 回归 **86/86** · 总线 56/56 · bench PASS（E p50 0.44 / p95 0.80ms；**DC 290/876/1590/1890/2635**——A–D 与 v1.6 基线逐场景一致 ⇒ 零渲染结构漂移）；`perf-profile.md` 跑后已还原
- **⏳ 唯一待办 = 推送（需用户单独授权）**：`git push origin main` + `git push origin v1.7.0`（**轻量标签须显式推**）→ HTTPS 匿名 ls-remote 双确认；推前先 curl 探测 Clash **7890/7892**

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
- **v1.7 方法论三条（已写入 KNOWN-ISSUES，值得复用）**：①**「用户口述需求」必先核实源码现状**——R-B 差点被当新功能重做，实际只差 cabbage 一行 ②**平衡脚本的计数口径含隐含前提，参数一改即失效**：旧口径依赖「射速 2.6s > 定身 2.5s」，T→3.0s 后偏差 **−28.3%**，会给出**方向相反**的结论 ⇒ 调参必须同步审查测量口径 ③**测试契约漂移会因脚本「跑不了」而长期潜伏**（`v16` C2 恒假自第4刀起存在，因 PAGE 路径失效从未暴露）⇒ 验收脚本自身需要**可运行性门控**；本地绝对路径一律不得硬编码（`PvZlite` 是**远端仓库名**，本地目录是 `zw`）
- **★ 注释同步不只是改数字**：数值改了**版本标签**也要跟着改——v1.7 定版核 diff 时发现 L1578/L1610 的值已改 `3.0s` 而前缀仍写「v1.6」（v1.6 实为 2.5s，见 v1.6 RELEASE-NOTES 刀③），会误导后续考古；`grep -n "v1\.6"` 通扫一次即可发现
- **判例（R1）**：v1.6 曾以量化数据得出「黄油强度建议维持 25%/2.5s」，v1.7 被**玩家主观反馈推翻**并实施加强 ⇒ **数据建议不否决主观体验，二者冲突时以用户拍板为准**
- 真机脚本端口分配：`v15`/`v16-acceptance` = **9352** · `v16-throw-arc-visual` = **9353** · `v17-acceptance` = **9354**
