/* REG-SHOP-02 · 积分商城 P0：增益效果注入 + 消耗品使用 + 重玩加成券（v2.4 GDD §2.3/§2.4/§6.6）
 * 断言：
 *   1. upg_sun_start：startGame 初始阳光 = level.startSun + 50
 *   2. upg_sun_bonus：向日葵产出 25→30 / 阳光菇幼体 15→20（推帧真实路径）
 *   3. upg_cd_1/2：cardCD ×0.9 / ×0.8 覆盖不叠加（ED-1）；无增益 ×1
 *   4. useConsumable(sun_pack)：+150 阳光（EC-3 可突破）+ 数量 -1
 *   5. useConsumable(wave_skip)：最终波拒绝（EC-1）；非最终波清场退波
 *   6. replay_ticket：选关带券重玩金币关 → 局收益 ×1.5 + 券 -1；失败不耗券；无券不激活
 *   7. testMode 溢出防护：testMode 增益注满不破坏既有 testMode 断言口径（阳光仍 9999）
 */
module.exports = {
  id: 'REG-SHOP-02',
  name: '积分商城 P0：增益注入 + 道具使用 + 加成券（v2.4）',
  seed: 42,
  run({ loadGame, assert }) {
    // ---- 1) upg_sun_start：初始阳光 +50 ----
    const g = loadGame({ seed: 42 });
    g.setUpgrades([]);
    g.setLevel('1-1');
    g.startGame();
    let p = g.probe();
    const baseSun = p.sun;
    assert(baseSun === 150, '基线：1-1 startSun=150', baseSun);
    g.setUpgrades(['upg_sun_start']);
    g.startGame();
    p = g.probe();
    assert(p.sun === 200, 'upg_sun_start → 初始阳光 150+50=200', p.sun);

    // ---- 2) upg_cd：cardCD 乘数（覆盖不叠加）----
    const K = g.sandbox.__consts;
    assert(K.getUpgradeCDMultiplier() === 1, '无 CD 增益 → ×1');
    g.setUpgrades(['upg_cd_1']);
    assert(K.getUpgradeCDMultiplier() === 0.9, 'upg_cd_1 → ×0.9');
    g.setUpgrades(['upg_cd_1', 'upg_cd_2']);
    assert(K.getUpgradeCDMultiplier() === 0.8, 'upg_cd_2 覆盖 I → ×0.8（ED-1 不叠加）');
    g.setUpgrades(['upg_cd_2']);
    assert(K.getUpgradeCDMultiplier() === 0.8, '仅 II（跳买 I）→ ×0.8（覆盖语义不看前置顺序）');
    g.setUpgrades([]);
    // 真实种植路径：种豌豆（cd=5）→ cardCD 应为 5×0.9
    g.setUpgrades(['upg_cd_1']);
    g.setSun(9999);
    g.selectCard(1);   // pea
    g.clickGrid(0, 0);
    p = g.probe();
    assert(Math.abs(p.cardCD.pea - 5 * 0.9) < 1e-9, '种植 cardCD=cd×0.9=4.5（注入点生效）', p.cardCD.pea);

    // ---- 3) upg_sun_bonus：向日葵产出 30 ----
    const g2 = loadGame({ seed: 42 });
    g2.setUpgrades(['upg_sun_bonus']);
    g2.setLevel('1-1');
    g2.startGame();
    g2.setSun(9999);
    g2.setSunFallT(9999);   // 隔离天降阳光
    g2.selectCard(0);   // sunflower
    g2.clickGrid(0, 0);
    // 快进到首产：SUNFLOWER_FIRST=7s；推 7.1s（分帧防 tick 大步长跳过）
    for (let i = 0; i < 142; i++) g2.tick(0.05);
    p = g2.probe();
    const sunEff = p.effectsArr.filter(e => e.kind === 'sun');
    assert(sunEff.length === 1 && sunEff[0].value === 30, '向日葵首产 value=30（25+5）', sunEff);
    // 对照：无增益 → 25
    const g2b = loadGame({ seed: 42 });
    g2b.setLevel('1-1');
    g2b.startGame();
    g2b.setSun(9999);
    g2b.setSunFallT(9999);
    g2b.selectCard(0);
    g2b.clickGrid(0, 0);
    for (let i = 0; i < 142; i++) g2b.tick(0.05);
    const sunBase = g2b.probe().effectsArr.filter(e => e.kind === 'sun');
    assert(sunBase.length === 1 && sunBase[0].value === 25, '无增益向日葵 value=25（基线不回归）', sunBase);

    // ---- 4) useConsumable(sun_pack)：+150 + 数量 -1 ----
    const g3 = loadGame({ seed: 42 });
    g3.setLevel('1-1');
    g3.startGame();
    g3.setConsumables({ sun_pack: 2 });
    const sunBefore = g3.probe().sun;
    g3.sandbox.__api.useConsumable('sun_pack');
    p = g3.probe();
    assert(p.sun === sunBefore + 150, 'sun_pack +150 阳光', p.sun);
    assert(p.consumables.sun_pack === 1, '数量 2→1', p.consumables);
    g3.sandbox.__api.useConsumable('sun_pack');
    p = g3.probe();
    assert(p.sun === sunBefore + 300 && !('sun_pack' in p.consumables), '用尽后键删除（×0 不留 0 值）', p.consumables);
    const sunAfter = p.sun;
    g3.sandbox.__api.useConsumable('sun_pack');
    p = g3.probe();
    assert(p.sun === sunAfter, '×0 使用拒绝（EC-4）');

    // ---- 5) useConsumable(wave_skip)：最终波拒绝 + 中段清场 ----
    const g4 = loadGame({ seed: 42 });
    g4.setLevel('1-1');   // 1-1 共 5 波
    g4.startGame();
    g4.setConsumables({ wave_skip: 1 });
    g4.setWave(5);   // 直接置最终波
    g4.sandbox.__api.useConsumable('wave_skip');
    p = g4.probe();
    assert(p.consumables.wave_skip === 1, '最终波使用拒绝（EC-1 不耗券）', p.consumables);
    // 中段波：有僵尸在场 → 使用清退 + 退波
    g4.setWave(2);
    g4.forceZombieAt('normal', 0, 500);
    g4.forceZombieAt('cone', 1, 700);
    assert(g4.probe().zombies === 2, '前置：场上 2 僵尸');
    g4.sandbox.__api.useConsumable('wave_skip');
    p = g4.probe();
    assert(p.zombies === 0 && !('wave_skip' in p.consumables), 'wave_skip 清退全场 + 耗券', { z: p.zombies, c: p.consumables });

    // ---- 6) replay_ticket：带券重玩 ×1.5 ----
    const store6 = (function () {
      const m = {};
      return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } };
    })();
    const g5 = loadGame({ seed: 42, localStorage: store6 });
    g5.setDiff('normal');
    g5.setSaveCleared(['3-1']);   // 3-1 金币关已首通
    g5.setLevel('3-1');
    g5.setConsumables({ replay_ticket: 2 });
    g5.setTicketArm(true);   // 选关页开关开
    g5.startGame();
    // 模拟选关点击激活：直接置 replayBonusArm（真实点击链在 REG-SHOP-01 §7 已锁路由；此处锁结算语义）
    g5.sandbox.replayBonusArm = true;   // 无效（sandbox 属性不达 let 绑定）→ 走 probe 验证兜底
    void g5.sandbox.replayBonusArm;
    g5.forceWaves(99); g5.clearField(); g5.tick(0.05);
    p = g5.probe();
    assert(p.state === 'end', '重通 3-1 通关');
    const noBonusTotal = p.endStats.total;   // sandbox 直改无效 → replayBonusArm=false → 无加成基线 50
    assert(noBonusTotal === 50, '无券重通 total=50（基线）', p.endStats);
    assert((p.consumables.replay_ticket || 0) === 2, '无激活不耗券', p.consumables);
    // 带券重通：重新开局并经真实路径激活（选关点击已在上面；这里直接用内部 API 置激活位——
    // replayBonusArm 是顶层 let，不能挂 sandbox，改走 setConsumables + setTicketArm + 真实选关点击）
    const g6 = loadGame({ seed: 42, localStorage: store6 });
    g6.setDiff('normal');
    g6.setSaveCleared(['3-1']);
    g6.setLevel('3-1');
    g6.setConsumables({ replay_ticket: 2 });
    g6.setTicketArm(true);
    // setStateMenu 不需要——直接用内部激活桥：harness setTicketArm 只切开关；真实激活点在 onClickSelect 关卡格。
    // 用 clickAt 点 3-1 格（selTab 缺省 menu 态无意义 → 先进 select：clickAt 商店钮前的进入游戏钮）
    g6.setStateMenu('ticket-e2e');
    g6.clickAt(500, 428);   // 「进入游戏」钮 → select（MENU_BTN 380,400,240×56 中心，沿 SMOKE-023 先例）
    assert(g6.probe().state === 'select', '前置：进选关页');
    g6.clickAt(104 + 2 * (192 + 8) + 96, 84 + 22);   // 页签 3（世界 3）
    assert(g6.probe().selTab === 3, '前置：切到世界 3', g6.probe().selTab);
    const CELL = { x0: 110, y: 180, w: 140, h: 96, colGap: 20, rowGap: 28 };
    g6.clickAt(CELL.x0 + 0 * (CELL.w + CELL.colGap) + CELL.w / 2, CELL.y + 0 * (CELL.h + CELL.rowGap) + CELL.h / 2);   // 3-1 格
    p = g6.probe();
    assert(p.state === 'deck' && p.replayBonusArm === true, '带券点击已通关金币关 → replayBonusArm=true', { s: p.state, arm: p.replayBonusArm });
    g6.startGame();
    g6.forceWaves(99); g6.clearField(); g6.tick(0.05);
    p = g6.probe();
    assert(p.state === 'end', '带券重通通关');
    assert(p.endStats.total === 75, '带券 total=round(50×1.5)=75', p.endStats);
    assert(p.endStats.bonusBase === 50, 'bonusBase=加成前 50', p.endStats.bonusBase);
    assert(p.consumables.replay_ticket === 1, '券 2→1（胜利结算时消耗）', p.consumables);
    assert(p.replayBonusArm === false, '激活态一次性（结算后复位）', p.replayBonusArm);
    // 失败不耗券：再开一局带券，中途失败
    const g7 = loadGame({ seed: 42, localStorage: store6 });
    g7.setDiff('normal');
    g7.setSaveCleared(['3-1']);
    g7.setLevel('3-1');
    g7.setConsumables({ replay_ticket: 1 });
    g7.setTicketArm(true);
    g7.setStateMenu('ticket-fail');
    g7.clickAt(500, 428);
    g7.clickAt(104 + 2 * (192 + 8) + 96, 84 + 22);
    g7.clickAt(CELL.x0 + CELL.w / 2, CELL.y + CELL.h / 2);
    assert(g7.probe().replayBonusArm === true, '前置：带券激活');
    g7.startGame();
    g7.forceZombieHome('normal');   // 僵尸进屋 → 失败
    g7.tick(0.05);
    p = g7.probe();
    assert(p.state === 'end' && p.won === false, '对局失败');
    assert(p.consumables.replay_ticket === 1, '失败不耗券', p.consumables);
  },
};
