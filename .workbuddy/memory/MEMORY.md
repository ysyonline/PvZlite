# PvZ Lite · 项目长期记忆

## 项目与版本线
- 纯前端**单文件**游戏 `plants-vs-zombies.html`，零依赖零构建，仅 PC；规模以 `docs/code-map.md` 头部为准（别写死行数）
- 硬规则：**code-map 定位 → 只读目标区块 → 精确编辑 → 重跑 `node tools/gen-code-map.mjs`**；禁同文件并行 Edit；无用户许可不 Write/Edit/commit；改源码走新版本流程，**七处冻结产物**（v1.0.0/v1.1/v1.2/v1.2.1/v1.3/v1.4/v1.5）只读
- 版本线：v1.0.0→…→v1.3→v1.4.0（定版刀 `d883d6c`，tag `v1.4`）→**v1.5.0 已发（09-21，已推送闭环）**：定版刀 `56b8d25`（VERSION L49=`v1.5.0`，源码 diff 精确 1 行）→发布包 `c722c05`（四件套 + perf §7.1）→闭环回填 `2f1f646`→记忆 `1fc9e1e`；冻结副本 `production/release/v1.5/artifacts/plants-vs-zombies.v1.5.html`（LF SHA-256 `4dcf8921…de2e0`，3168 行/153,230 字节）；tag `v1.5`=`56b8d25`（轻量），main+tag 全推 ✅
- ⚠️ `git push --follow-tags` 只推附注标签，轻量标签须显式 `git push origin <tag>`（v1.3/v1.4 惯例=轻量）
- N-13 多语言/N-14 移动端不做（🧊，x.0.0 时确认）

## 当前状态与下一刀（09-21 23:5x · 交接归档，新会话从这里接）
- **v1.5.0 已发布**；R2 平衡评审已完成（PASS/NOTE，`production/v15-trio-balance-review.md` v1.1，本轮入库）；本地=远端（见交接刀）
- **★ 下一刀 = v1.6.0-wip 施工（用户已拍板，详见 2026-09-21.md 23:3x 节）**，三刀切分：
  1. **刀① bug1 抖动冻结**：地瓜炸死最后怪时 triggerShake 与 setState('end') 同帧，震动衰减在 update()（L1284）而 end 态不跑 update（L749）→ 结算屏永久抖动；修法=震动/闪光衰减两行挪 loop() 无条件段（同源修复失败进屋/回菜单冻结）
  2. **刀② bug2 斜坡直射规则**：拍板=斜坡上直射植物（pea/double/snowpea）开火但子弹滚落本格（出生即落自身格消失，保留动作音效）；投掷类不受影响；⚠️ SMOKE-028 坡上命中断言须翻转改写
  3. **刀③ corn 重做（需求变更）**：100 阳/单发 15/2.6s 不变/25% 黄油定身 2.5s（完全静止：移动+啃食双停，freeze 字段与 chill 40% 区分）/溅射保留（15×40%=6）/弹体双形态（黄油=白色奶酪块、普通=玉米粒）；⚠️ 推翻 balance-review「不调参」结论
- **v1.6 门控预估**：烟雾 29（SMOKE-028 改写）/ 回归 83+1（新增 corn 定身用例）/ 总线 56 / bench；流程=三刀各自门控全绿→提交→VERSION v1.6.0-wip→真机验收→定版
- **换机核验指纹（v1.5.0 定版，LF 口径）**：`git show 56b8d25:plants-vs-zombies.html | sha256sum` = `4dcf8921374d389c0ef30a63c74e891fd0856b6d99730f321f60e6a6893de2e0` / 153,230 字节
- **★ 新坑位**：①startGame 清 selected 后发 Escape=togglePause 拦截热键（SMOKE-029 修）②命中后同 tick slowT 已递减，断言须区间式（>1.9&&≤2.0）③**复跑 `tests/playtests/v15-acceptance.js` 会重写 results.json 与 chill-after.png**（截图有渲染抖动）→ 会脏工作树，跑完记得 `git checkout --` 还原

## 门控基线（改源码后必须全绿）
烟雾 `tests/harness/run-smoke.js` **29/29** ｜ 回归 `tests/harness/run-all.js --all` **83/83**（v1.5 起 +REG-CHILL-01/02） ｜ 总线 `tests/harness/verify-bus.js` **56/56** ｜ bench `tests/perf/bench.js` 五场景 PASS（E=L5 屋顶地狱）。判级异常先看 draw call 结构量是否漂移，不动=噪声复跑

## 环境与命令
- Node 绝对路径（**三机不同，先确认自己在哪台**）：
  · 前开发机 `C:\Users\user3667\.workbuddy\binaries\node\versions\22.22.2-3\node.exe`
  · 家庭电脑（Administrator）`C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2/node.exe`
  · 原开发机（weixufeng，i3-10110U）`C:\Users\weixufeng\.workbuddy\binaries\node\versions\22.22.2-3\node.exe`
  （裸 `node` 不在 PATH，shim 污染时 unset 也救不了）
- Bash 每命令开头：`export PATH="/usr/bin:/bin:/mingw64/bin:/c/Windows/System32:/c/Windows"; unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY`
- **推送（两套配方，先试 SSH）**：
  · **本机已配 SSH（推荐）**：`~/.ssh/id_rsa.pub` 已加到 GitHub，`origin` = `git@github.com:ysyonline/PvZlite.git`，直接 `GIT_TERMINAL_PROMPT=0 git push origin main` 即可（`ssh -T git@github.com` 应回 `Hi ysyonline!`）
  · 前机 HTTPS 配方（依赖 GCM 里已存账号，本机不可用）：unset proxy + `-c credential.helper='!"<PortableGit>/…/git-credential-manager.exe"'` 覆盖
  · **换机后凭据不随行**：GCM 无账号 + SSH key 未注册 = 必失败（`could not read Username` / `Permission denied (publickey)`），须重新建认证
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
