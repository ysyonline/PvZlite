/* SMOKE-023 · 音频 P1/P2 补齐 + 大波警报 loop 生命周期
 * 依据 design/audio-guide.md §B.2/§B.3 与 §C（方案 C：仅警报紧张 loop）：
 *   B4 死亡分层   —— killZombie 按 z.type 分派（normal/cone/bucket 叠加层不同）
 *   B5 西瓜抛掷   —— 西瓜开火同时给 shoot（机制音）+ melonThrow（重量感），两者独立节流
 *   B6 失败强化   —— 僵尸进屋在 SFX.lose 之后叠 loseClimax（关键一击）
 *   B8 菜单点击   —— 菜单按钮改用 uiClick，不再误用阳光叮
 *   B9/B10 铲子   —— 选铲子发声；铲空与挖到区分
 *   §C sirenLoop  —— 预警窗口内重复警报轮次（原一次性三连只占窗口前 2/3），随横幅同起同停；
 *                    帧驱动设计 → 暂停时随 update 一起停，无 setInterval 拖尾
 */
module.exports = {
  id: 'SMOKE-023',
  name: '音频补齐 P1/P2 + 警报 loop 生命周期',
  seed: 42,
  run({ game: g, assert }) {
    const sfx = g.sandbox.__SFX;
    const C = g.sandbox.__consts;

    // ---------- B4 僵尸死亡分层：按类型传入分派参数 ----------
    g.startGame('harness-p1');
    const seen = [];
    const origDeath = sfx.death;
    sfx.death = function (t) { seen.push(t); };
    try {
      g.forceZombieAt('normal', 0, 500);
      g.forceZombieAt('cone', 1, 500);
      g.forceZombieAt('bucket', 2, 500);
      g.killAllZombies();
      assert(seen.length === 3, 'B4 三只僵尸应各触发一次死亡音', seen);
      assert(seen.indexOf('cone') >= 0, 'B4 路障类型应传入 SFX.death（叠纸板层）', seen);
      assert(seen.indexOf('bucket') >= 0, 'B4 铁桶类型应传入 SFX.death（叠金属层）', seen);
      assert(seen.indexOf('normal') >= 0, 'B4 普通类型应传入 SFX.death', seen);
    } finally {
      sfx.death = origDeath;
    }

    // ---------- B5 西瓜抛掷（v1.6 第4刀）：真抛物投掷 ⇒ melonThrow ×1、shoot ×0，且产生抛物弹体 ----------
    //   v1.6 语义变更：西瓜由「直线贴坡」迁到「真抛物投掷」，与 cabbage 同制——开火仅调
    //   SFX.melonThrow（发射"呼"声），不再调 SFX.shoot（直射枪口音）。
    //   主判据 = 弹体计数（弹体存在性）；音效计数为辅助：打桩整体替换 SFX.melonThrow，
    //   函数体内 sfxGate 节流被绕过 ⇒ 计数忠实等于真实发射数。
    g.startGame('harness-melon');
    g.setSun(9999);
    g.selectCard(5);                      // 西瓜（每 3.2s 一发）
    g.clickGrid(0, 0);
    g.sandbox.__zombies.push({
      type: 'bucket', row: 0, hp: 999999, maxHp: 999999, spd: 0, x: 800,
      eating: false, eatAnim: 0, walk: 0, dead: false,
    });
    let shots = 0, melons = 0;
    const origShoot = sfx.shoot, origMelon = sfx.melonThrow;
    sfx.shoot = function () { shots++; };
    sfx.melonThrow = function () { melons++; };
    try {
      g.tick(0.2);
      const melonProjs = g.probe().projectilesArr.filter(pr => pr.type === 'melon' && !pr.dead);
      assert(melonProjs.length === 1,
        'B5 西瓜开火应产生 1 颗抛物弹体（主判据：弹体计数）', melonProjs);
      assert(melons === 1,
        'B5 西瓜开火应调用 SFX.melonThrow 恰一次（投掷"呼"声）', melons);
      assert(shots === 0,
        'B5 西瓜改真抛物后不得再调 SFX.shoot（直射枪口音）', shots);
    } finally {
      sfx.shoot = origShoot;
      sfx.melonThrow = origMelon;
    }

    // ---------- B6 失败强化：进屋时 lose + loseClimax ----------
    g.startGame('harness-lose');
    let lose = 0, climax = 0;
    const origLose = sfx.lose, origClimax = sfx.loseClimax;
    sfx.lose = function () { lose++; };
    sfx.loseClimax = function () { climax++; };
    try {
      g.forceZombieHome('normal');
      g.tick(0.1);
      assert(g.probe().state === 'end', '前置：僵尸进屋应对局结束', g.probe().state);
      assert(lose === 1, 'B6 进屋应播 SFX.lose', lose);
      assert(climax === 1, 'B6 进屋应叠 SFX.loseClimax（关键一击）', climax);
    } finally {
      sfx.lose = origLose;
      sfx.loseClimax = origClimax;
    }

    // ---------- B8 UI 点击：uiClick / deny（v2.0 M2 契约迁移：Q-17/Q-18 链路）----------
    //   T-203 主菜单重绘 + T-204/T-205 选关页拆分后，菜单四钮直点关卡链路退役；
    //   uiClick/deny 的触发面迁到：菜单钮 → 选关页（页签/难度/可玩格 uiClick；锁定/占位 deny）。
    //   几何与源码 SELECT_GEOM/MENU_BTN 同源（禁两处硬编码 → 断言值随源码同步审）。
    g.setStateMenu('harness-menu');
    let ui = 0, deny = 0;
    const origUi = sfx.uiClick, origDeny = sfx.deny;
    sfx.uiClick = function () { ui++; };
    sfx.deny = function () { deny++; };
    try {
      g.clickAt(500, 428);                // 主菜单「进入游戏」钮（MENU_BTN 380,400,240×56 中心）→ uiClick 进 select
      assert(ui === 1, 'B8 点「进入游戏」应播 SFX.uiClick', ui);
      assert(g.probe().state === 'select', '前置：应已进选关页', g.probe().state);
      assert(deny === 0, 'B8 正常进入不应报 deny', deny);

      g.clickAt(800, 106);                // 页签 4 中心（TAB x0=104,w=192,gap=8 → 第4签 704..896，y 84..128）→ 切签 uiClick
      assert(ui === 2, 'B8 点页签应播 SFX.uiClick', ui);
      g.clickAt(800, 106);                // 再点同签（已在 selTab=4）→ 不重复发声
      assert(ui === 2, 'B8 重复点同页签不应重复发声', ui);
      g.clickAt(200, 106);                // 页签 1 中心（104..296）→ 切回世界 1（后续格子断言基准）
      assert(ui === 3, 'B8 切回页签 1 应播 SFX.uiClick', ui);

      g.clickAt(660, 228);                // 锁定格 1-4（CELL col3: 590..730 中心 660，row0 中心 y=228）→ deny 拒绝
      assert(deny === 1, 'B8 点击未解锁关卡应报 deny', deny);
      assert(g.probe().state === 'select', 'B8 拒绝后仍留选关页', g.probe().state);

      g.clickAt(180, 228);                // 可玩格 1-1（col0: 110..250 中心 180）→ uiClick 进 deck
      assert(ui === 4, 'B8 点击可玩关卡格应播 SFX.uiClick 进 deck', ui);
      assert(g.probe().state === 'deck', 'B8 点关后应进 deck（Q-18）', g.probe().state);
    } finally {
      sfx.uiClick = origUi;
      sfx.deny = origDeny;
    }

    // ---------- B9/B10 铲子：选中提示 / 铲空 vs 挖到 ----------
    g.startGame('harness-shovel');
    g.setSun(9999);
    let arm = 0, empty = 0, dug = 0;
    const origArm = sfx.shovelArm, origEmpty = sfx.shovelEmpty, origShovel = sfx.shovel;
    sfx.shovelArm = function () { arm++; };
    sfx.shovelEmpty = function () { empty++; };
    sfx.shovel = function () { dug++; };
    try {
      g.clickAt(C.SHOVEL_X + 10, C.CARD_Y + 10);   // 点铲子槽 → 进入铲子模式
      assert(arm === 1, 'B9 选中铲子应发声（shovelArm）', arm);
      g.clickGrid(4, 4);                           // 空格子 → 铲空
      assert(empty === 1, 'B10 铲空应发声（shovelEmpty）', empty);
      assert(dug === 0, 'B10 铲空不得误报"挖到"音', dug);

      g.selectCard(0); g.clickGrid(4, 4);          // 先种一棵
      g.clickAt(C.SHOVEL_X + 10, C.CARD_Y + 10);   // 再进铲子模式（arm=2）
      g.clickGrid(4, 4);                           // 挖到植物
      assert(dug === 1, 'B10 挖到植物应发声（shovel）', dug);
      assert(empty === 1, 'B10 挖到不得误报"铲空"音', empty);
      assert(g.probe().plants === 0, '前置：植物已被铲除', g.probe().plants);
    } finally {
      sfx.shovelArm = origArm;
      sfx.shovelEmpty = origEmpty;
      sfx.shovel = origShovel;
    }

    // ---------- §C 大波警报 loop：随横幅同起、窗口内重复、结束即停 ----------
    g.startGame('harness-sirenloop');
    const lv = g.sandbox.__LEVELS['1-1'];   // T-102 换键：旧 L1 → '1-1'
    const bigIdx = lv.waves.findIndex(w => w.big);
    assert(bigIdx >= 0, 'L1 应存在大波配置');

    let sirens = 0;
    const origSiren = sfx.siren;
    sfx.siren = function () { sirens++; };
    try {
      assert(g.probe().sirenLoopOn === false, '前置：开局警报 loop 应为关闭');
      g.setWave(bigIdx);
      g.setLastWaveT(-999);
      g.tick(0.1);
      assert(g.probe().warnActive === true, '前置：应进入大波预警', g.probe().warnActive);
      assert(g.probe().sirenLoopOn === true, '§C 警报 loop 应随横幅启动', g.probe().sirenLoopOn);
      assert(sirens === 1, '§C 首轮警报应立即响', sirens);

      let guard = 0;
      while (g.probe().warnActive && guard < 60) { g.tick(0.1); guard++; }
      assert(g.probe().warnActive === false, '前置：横幅应已结束');
      assert(g.probe().sirenLoopOn === false, '§C 横幅结束当帧警报 loop 应停止', g.probe().sirenLoopOn);
      // WARN_TOTAL=2s / INTERVAL=0.62s → 窗口内约 4 轮；断言"确实在重复"而非一次性
      assert(sirens >= 3, '§C 2 秒窗口内警报应重复 ≥3 轮（原一次性三连仅覆盖窗口前段）', sirens);
    } finally {
      sfx.siren = origSiren;
    }
  },
};
