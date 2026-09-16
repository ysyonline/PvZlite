/* SMOKE-010 · 暂停分支（P6.5-T5 补建）
 * 触发方式（以 plants-vs-zombies.html 实际代码为准，三条路径都是 paused=!paused）：
 *   - 空格：onKey k===' ' → state==='play' 时翻转（L482-488）
 *   - Esc：无选中时翻转（L504-509）
 *   - 按钮：bindBtn('pause', ...) 翻转（L341）
 * 主循环守卫（L296-300）：paused 时整段跳过 `gt+=sdt; update(sdt)`（世界冻结），
 *   但 render() 照常执行 → if(paused)drawPause()（L850）画暂停遮罩。
 *
 * 断言清单：
 *   1. 空格触发 → paused 翻转 true；暂停按钮再触发 → 翻转 false；Esc 亦可翻转
 *   2. 暂停期间真跑 3 帧（真 loop 帧，50ms/帧）：
 *      gt 精确不增、僵尸 x/hp 不变、子弹存在且不命中（update 被短路）、
 *      植物 cd/dur 深快照不变
 *   3. 解除暂停后真跑 3 帧：gt 精确 +0.15、僵尸恢复左移、子弹恢复推进并命中
 *      （hp -20、projectiles 清零）、植物 cd 恢复递减
 *   4. 暂停遮罩绘制不抛异常：临时替换 console.error 捕获 loop 的帧异常上报
 *      （真帧异常唯一外显就是这条日志），全程 0 条
 *
 * 发现的暂停逻辑问题：无。本用例的帧异常网曾抓到 render 层一个与暂停无关的真 bug
 *（lastDt ReferenceError，引入于 P6.5-T4 §2 F-01），已由主理人收口修复
 *（loop 每帧刷新全局 lastDt，见本体 L287/L292），此处隔离行保留作为回归兼容层。
 *
 * 坑位备忘：
 *   - performance.now 桩恒 0 → harness 的 step()/__stepFrame() 的 dt 恒 0，推不动世界；
 *     故本用例直接 shift rafQueue 顶帧并传递增时间戳（__stepFrame 同款写法，仅 now 可控）
 *   - loop 每帧末尾自续订（异常也续订），rafQueue 恒保持 1 帧
 *   - probe 未桥接 projectiles 的 x，用行为学证明子弹冻结：
 *     僵尸放在命中倒计时 ~3 帧处，暂停期间"没命中"即子弹没动的强证据
 */
module.exports = {
  id: 'SMOKE-010',
  name: '暂停分支（世界冻结 + 遮罩渲染 + 恢复推进）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    const sb = g.sandbox;

    assert(g.probe().paused === false, 'startGame 后 paused 应为 false', g.probe().paused);

    // ---- 布置：豌豆(0,3) + 僵尸(行3, x=250)，命中倒计时约 3 帧 ----
    g.setSun(9999);
    g.selectCard(1);        // pea（cost 100）
    g.clickGrid(0, 3);      // 走真实种植路径，selected 用后即清
    g.forceZombieAt('normal', 3, 250);

    // ---- BUG 修复后的回归兼容层（原 P6.5-T5 隔离，2026-09-16 主理人已修 lastDt）----
    // 修复前：drawGameWorld 调 drawPlant(p) 不传 dtRef → 兜底 lastDt 未定义 → render 每帧炸。
    // 修复后：loop 每帧刷新全局 lastDt，动画正常播放。此行保留兼容（对已播完的植物是幂等操作），
    // 保证本用例聚焦暂停逻辑，不依赖动画进度。
    for (const pl of sb.__plants) pl.plantDone = true;

    assert(g.probe().plants === 1, '前置：豌豆应已种下', g.probe().plants);
    assert(g.probe().zombies === 1, '前置：僵尸应已在场', g.probe().zombies);

    // ---- 帧异常监视：loop() 捕获帧异常后唯一外显是 console.error ----
    const frameErrs = [];
    const origConsoleError = console.error;
    console.error = function () {
      frameErrs.push(Array.prototype.slice.call(arguments).map(String).join(' '));
    };

    try {
      // ---- 受控真帧驱动：50ms/帧 → loop 内 dt=Math.min(0.05,…)=0.05s ----
      const DT = 50;
      let now = 0;
      const runFrames = (n) => {
        for (let i = 0; i < n; i++) {
          now += DT;
          const f = g.rafQueue.shift();
          assert(f, 'rafQueue 应有帧待跑（loop 自续订中）');
          f(now);
        }
      };

      // ---- 阶段 A：未暂停基线（同时验证帧驱动本身有效）----
      runFrames(2);
      let p = g.probe();
      const gtA = p.gt, zxA = p.zombiesArr[0].x;
      assert(Math.abs(gtA - 0.1) < 1e-6, '基线 2 帧后 gt 应 ≈0.1（帧驱动有效）', gtA);
      assert(zxA < 249.2 && zxA > 248, '基线期僵尸应左移至 ≈248.4', zxA);
      assert(p.projectiles === 1, '基线期豌豆应已开火（1 颗子弹在飞）', p.projectiles);
      const hpA = p.zombiesArr[0].hp;
      assert(hpA === 180, '基线 2 帧内子弹尚未命中（gap≈84>42）', hpA);

      // ---- 断言 1：空格触发暂停 ----
      g.keydown(' ');
      p = g.probe();
      assert(p.paused === true, '空格应翻转 paused → true', p.paused);

      // ---- 断言 2：暂停期间真跑 3 帧，世界冻结 ----
      const snapPause = {
        gt: p.gt, zx: p.zombiesArr[0].x, hp: p.zombiesArr[0].hp,
        proj: p.projectiles, plant0: JSON.parse(JSON.stringify(p.plantsArr[0])),
      };
      runFrames(3);           // 若 update 未被短路：gap 84.4-3×17.8≈31<42，必命中
      p = g.probe();
      assert(p.gt === snapPause.gt, '暂停期间 gt 不增（loop 守卫短路）',
        [snapPause.gt, p.gt]);
      assert(p.zombiesArr[0].x === snapPause.zx, '暂停期间僵尸 x 不变',
        [snapPause.zx, p.zombiesArr[0].x]);
      assert(p.zombiesArr[0].hp === snapPause.hp, '暂停期间僵尸 hp 不变（子弹未命中）',
        [snapPause.hp, p.zombiesArr[0].hp]);
      assert(p.projectiles === snapPause.proj, '暂停期间子弹不推进、不命中、不清除',
        [snapPause.proj, p.projectiles]);
      assert(JSON.stringify(p.plantsArr[0]) === JSON.stringify(snapPause.plant0),
        '暂停期间植物属性（cd/dur/armT 等）深快照不变',
        [snapPause.plant0, p.plantsArr[0]]);

      // ---- 断言 4 前置：暂停 3 帧 render 已含 drawPause 遮罩，暂不判定，末尾统一查帧异常 ----

      // ---- 断言 1b：暂停按钮解除 ----
      const pauseBtn = sb.btns && sb.btns.pause;
      assert(pauseBtn && typeof pauseBtn.onclick === 'function',
        'pause 按钮 stub 应已绑定 onclick（bindBtn）');
      pauseBtn.onclick({ preventDefault() {} });
      p = g.probe();
      assert(p.paused === false, '点「暂停」按钮应翻转 paused → false', p.paused);

      // ---- 断言 3：解除后真跑 3 帧，世界恢复推进（子弹第 3 帧命中）----
      p = g.probe();
      const snapResume = {
        gt: p.gt, zx: p.zombiesArr[0].x, hp: p.zombiesArr[0].hp,
        cd: p.plantsArr[0].cd,
      };
      runFrames(3);
      p = g.probe();
      assert(Math.abs(p.gt - snapResume.gt - 0.15) < 1e-6,
        '解除暂停后 3 帧 gt 应精确 +0.15（恢复累加）', [snapResume.gt, p.gt]);
      assert(p.zombiesArr[0].x < snapResume.zx, '解除后僵尸恢复左移',
        [snapResume.zx, p.zombiesArr[0].x]);
      assert(p.projectiles === 0, '解除后子弹恢复推进并在第 3 帧命中（清除）',
        p.projectiles);
      assert(p.zombiesArr[0].hp === snapResume.hp - 20,
        '命中应扣 hp -20（豌豆 dmg=20）', [snapResume.hp, p.zombiesArr[0].hp]);
      assert(Math.abs(p.plantsArr[0].cd - (snapResume.cd - 0.15)) < 1e-6,
        '解除后植物 cd 恢复递减（-0.15）', [snapResume.cd, p.plantsArr[0].cd]);
      assert(p.state === 'play', '全程 state 应保持 play', p.state);

      // ---- 断言 1c：Esc 亦可翻转（无选中时）----
      g.keydown('escape');
      assert(g.probe().paused === true, 'Esc 应翻转 paused → true（无选中）');
      g.keydown('escape');
      assert(g.probe().paused === false, 'Esc 再按应翻转 paused → false');

      // ---- 断言 4：全部真帧（含暂停遮罩 drawPause）零帧异常 ----
      assert(frameErrs.length === 0,
        'render 层（含 drawPause 暂停遮罩）不应抛任何帧异常', frameErrs);
    } finally {
      console.error = origConsoleError;
    }
  },
};
