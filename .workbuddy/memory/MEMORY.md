# PvZ Lite · 项目长期记忆

## 项目与版本线
- 纯前端**单文件**游戏 `plants-vs-zombies.html`，零依赖零构建，仅 PC；规模以 `docs/code-map.md` 头部为准（别写死行数）
- 硬规则：**code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`**；禁同文件并行 Edit；无用户许可不 Write/Edit/commit；改源码走新版本流程，六处冻结产物只读
- 版本线：v1.0.0→…→v1.3→**v1.4.0 已发（09-21）**：定版刀 `d883d6c`（VERSION L49）→发布包 `56b60fe`（`production/release/v1.4/` 四件套；冻结副本 LF SHA-256 `84dfad99…5553`，3000 行/141,882 字节）→tag `v1.4`=`d883d6c`，main+tag 全推
- ⚠️ `git push --follow-tags` 只推附注标签，轻量标签须显式 `git push origin <tag>`（v1.3/v1.4 惯例=轻量）
- N-13 多语言/N-14 移动端不做（🧊，x.0.0 时确认）

## 当前状态与下一刀（09-21 17:1x 交接）
- **v1.5 五刀施工完工（未提交）**：S1 布局（gh104/y0 470/cw92+绘制命中同步收窄+REG-SLOT-04 补 10 槽右缘断言）/S2 注册发卡（CARDS 12 张+DIFF_AWARD+pvz_diff_clears 键+SMOKE-029 池扩 12+SMOKE-025/027 length 12 平移）/S3 corn（melon 直线分支+splashRatio 0.40）/S4 chill（applyChill 单点+slowK=0.6 同乘 walk/移动/啃食【改拍板：减速影响啃食】+drawZombie tint+REG-CHILL-01）/S5 icemelon（splash55·0.55+chill 全命中+REG-CHILL-02）
- **门控终态**：烟雾 29/29 · 回归 **83/83**（+CHILL×2）· 总线 56/56 · bench PASS；code-map 3168 行/92 函数/62 常量；工作树 13 文件未提交，等用户真机验收后授权提交（推送另授权）
- **★ 新坑位**：①startGame 清 selected 后发 Escape=togglePause 暂停拦截热键（SMOKE-029 修）；②命中后同 tick slowT 已递减，断言区间式（>1.9&&≤2.0）
- **真机验收点**：选卡三行不重叠+10 槽不溢出 / 三新卡可种可打 / 减速僵尸变蓝+移动啃食变慢 / 难度门槛重通发卡

## 门控基线（改源码后必须全绿）
烟雾 `tests/harness/run-smoke.js` **29/29** ｜ 回归 `tests/harness/run-all.js --all` **83/83**（v1.5 起 +REG-CHILL-01/02） ｜ 总线 `tests/harness/verify-bus.js` **56/56** ｜ bench `tests/perf/bench.js` 五场景 PASS（E=L5 屋顶地狱）。判级异常先看 draw call 结构量是否漂移，不动=噪声复跑

## 环境与命令
- Node 绝对路径：`C:\Users\user3667\.workbuddy\binaries\node\versions\22.22.2-3\node.exe`（裸 node 不在 PATH，shim 污染时 unset 也救不了）
- Bash 每命令开头：`export PATH="/usr/bin:/bin:/mingw64/bin:/c/Windows/System32:/c/Windows"; unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY`
- 推送（WorkBuddy 注入 127.0.0.1:5350x 代理劫持 git，须 unset+清 proxy+helper 覆盖 GCM）：
```bash
GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=Never git -c http.proxy= -c https.proxy= \
  -c credential.helper= -c credential.helper='!"C:/Users/user3667/.workbuddy/binaries/PortableGit/versions/1.2.0/mingw64/bin/git-credential-manager.exe"' \
  push -u origin main
```
- github 域走 `127.0.0.1:7890`（Clash 加速器）；**没开加速器 push/ls-remote 全挂**（Connection refused=指纹），先问用户再排查
- 换机：git pull → `git show HEAD:plants-vs-zombies.html | sha256sum` 核验（直接 sha256sum 工作区文件因 CRLF 虚警）；冻结副本导出必须 Buffer 直通（LF 权威口径）

## 关键坑与方法论（防重复摸索）
- push 后 `[ahead N]`/`[gone]` 是假象，以 `git ls-remote origin main` 为准；修复=40 位全哈希 sed 直改 `.git/packed-refs`
- `git add` 别带不存在路径；提交后必看 `git show --stat`（防并行会话卷带）；**已推送的不得 amend**
- 浏览器自动化：Edge headless+CDP（`--remote-debugging-port=9333`），真实点击 `Input.dispatchMouseEvent`；性能结论必须开 GPU 轮；canvas 可 getImageData 像素判读（范例 `tests/playtests/o3-final-verify.js`）
- 画面反馈与代码不符先查旧标签页（未强刷见旧版渲染）
- WebAudio 合成音色天花板：落水声两轮参数方案真机均否，O1/O2 冻结待采样 base64 拍板；SFX 异常包裹层吞错，SMOKE-014 计数是唯一曝光口；命名偏差有意：B1→SFX.plant、B4→SFX.death(type)、melonThrow 独立节流键
- harness ctx 是 Proxy 桩：render 变异须「未定义变量 ReferenceError」写法；桩里 `ctx.canvas` 是函数禁读 width（用 DOM `canvas.width`）；连续铲两格各重选铲子；豌豆=CARDS[1]
- harness 桥接：顶层 function 经 `sb.<name>` 直达；**const 常量不挂、sb.eval 不存在**（断言写死值）；`setLevel(n)` 是 LEVELS 键 1-5（屋顶=5）；用例不推进 update 则 cardCD 不衰减（同卡二次种植被拒，换卡或重置 seed）；`sb.toast=fn` 捕获提示语；`probe().cardCD` 预填充 9 键全 0（断「所有值≤0」）；gameSpeed 不挂桥（经 `sb.btns.fast.onclick` 连点 1→2→4→1）；推 update 用 `g.__updateRaw(dt)`；RAF 帧步进=shift rafQueue+手动时间戳
- 同文件多处 Edit 有并行竞态（编辑后 grep 回验）；CRLF 工作区大段 Edit 易字节差异挂（小步串行 Edit）
- REG-END-02 现锁 `__LEVELS[6]===undefined`（新关上线后再平移）
- 团队协作：先 TeamCreate 再 spawn（name=Agent ID）；子代理中断后口头进度不可信，接手先实证核验落盘状态
