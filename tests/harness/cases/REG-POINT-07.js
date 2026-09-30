/* REG-POINT-07 · 金币留存钩子：重通关减半奖励（v2.4）
 * 断言：
 *   1. 首通金币关 coin=100、replayCoin=0（正常首通）
 *   2. 重通同一金币关 coin=0、replayCoin=round(100*0.5)=50（减半）
 *   3. replayCoin 并入 total 乘难度系数（统一口径）
 *   4. 非金币关（string 真卡关）重通不发 replayCoin（replayCoin=0）
 *   5. worldClear 重通不发（首通已发、cleared 满 10 → computeClearReward 返回 0）
 *   6. replyVRatio 常量自证：RETAIN_COIN_RATIO=0.5
 */
module.exports = {
  id: 'REG-POINT-07',
  name: '金币留存钩子：首通 coin=100 + 重通 replayCoin=50（减半，v2.4）',
  seed: 42,
  run({ loadGame, assert }) {
    const store = (function () {
      const m = {};
      return {
        getItem: k => (k in m ? m[k] : null),
        setItem: (k, v) => { m[k] = String(v); },
      };
    })();

    // ---- 1) 常量自证 ----
    const g0 = loadGame({ seed: 42 });
    const R = g0.sandbox.__consts.RETAIN_COIN_RATIO;
    assert(R === 0.5, 'RETAIN_COIN_RATIO 应 = 0.5（原版 PvZ 重玩行为口径）', R);

    // ---- 2) 首通 3-1（金币关=100）→ coin=100 / replayCoin=0 ----
    const g = loadGame({ seed: 42, localStorage: store });
    g.setDiff('normal');
    g.setLevel('3-1');
    g.setSaveCleared([]);
    g.startGame();
    g.forceWaves(99); g.clearField(); g.tick(0.05);
    const p1 = g.probe();
    assert(p1.state === 'end' && p1.won === true, '首通 3-1 应已通关', { s: p1.state, w: p1.won });
    assert(p1.endStats.coin === 100, '首通 → coin=100（金币关首通全量）', p1.endStats.coin);
    assert(p1.endStats.replayCoin === 0, '首通 → replayCoin=0（非重通）', p1.endStats.replayCoin);
    assert(p1.endStats.total === 100, 'total=round((0+0+100)*1.0)=100', p1.endStats.total);
    const m1 = g.probeMeta();
    assert(m1.points === 100, 'points 入账 100', m1.points);

    // ---- 3) 重通 3-1 → coin=0 / replayCoin=50（减半）----
    g.startGame();
    g.forceWaves(99); g.clearField(); g.tick(0.05);
    const p2 = g.probe();
    assert(p2.state === 'end' && p2.won === true, '重通 3-1 应已通关');
    assert(p2.endStats.coin === 0, '重通 → coin=0（首通判定幂等）', p2.endStats.coin);
    assert(p2.endStats.replayCoin === 50, '重通 → replayCoin=round(100*0.5)=50', p2.endStats.replayCoin);
    assert(p2.endStats.total === 50, 'total=round((0+0+50)*1.0)=50', p2.endStats.total);
    const m2 = g.probeMeta();
    assert(m2.points === 150, 'points 入账 100+50=150', m2.points);

    // ---- 4) 重通 1-1（string 真卡关=double）→ replayCoin=0 ----
    const g2 = loadGame({ seed: 42 });
    g2.setDiff('normal');
    g2.setLevel('1-1');
    g2.setSaveCleared(['1-1']);   // 已首通
    g2.setOwnedCards(['double']); // 卡已拥有
    g2.startGame();
    g2.forceWaves(99); g2.clearField(); g2.tick(0.05);
    const p3 = g2.probe();
    assert(p3.state === 'end' && p3.won === true, '重通 1-1（string 真卡关）应已通关');
    assert(p3.endStats.coin === 0, 'string 关 → coin=0', p3.endStats.coin);
    assert(p3.endStats.replayCoin === 0, 'string 关重通 → replayCoin=0（仅 number 金币关才发）', p3.endStats.replayCoin);
    assert(p3.endStats.total === 0, 'string 关重通 total=0', p3.endStats.total);

    // ---- 5) 重通 2-10（世界末关，已首通全部 10 关）→ worldClear 不发 + 金币重通减半 ----
    const g3 = loadGame({ seed: 42 });
    g3.setDiff('normal');
    // 世界 2 全 10 关已通（已首通完毕）
    g3.setSaveCleared(['2-1','2-2','2-3','2-4','2-5','2-6','2-7','2-8','2-9','2-10']);
    g3.setLevel('2-10');
    g3.setOwnedCards([]);   // 无卡污染
    g3.startGame();
    g3.forceWaves(99); g3.clearField(); g3.tick(0.05);
    const p4 = g3.probe();
    assert(p4.state === 'end' && p4.won === true, '重通 2-10 应已通关');
    assert(p4.endStats.clear === 0, '世界已满 10 键 → worldClear 不发（首通已发）', p4.endStats.clear);
    assert(p4.endStats.coin === 0, '重通 → coin=0', p4.endStats.coin);
    assert(p4.endStats.replayCoin === 50, '重通 2-10 → replayCoin=round(100*0.5)=50', p4.endStats.replayCoin);
    assert(p4.endStats.total === 50, 'total=50（无 worldClear + replayCoin 50）', p4.endStats.total);

    // ---- 6) 难度乘算：hard 模式重通 3-2（金币关 100×1.35×0.5=67.5→68）----
    const g4 = loadGame({ seed: 42 });
    g4.setDiff('hard');
    g4.setLevel('3-2');
    g4.setSaveCleared(['3-1','3-2']);   // 3-2 已首通
    g4.startGame();
    g4.forceWaves(99); g4.clearField(); g4.tick(0.05);
    const p5 = g4.probe();
    assert(p5.endStats.replayCoin === 50, 'hard replayCoin=round(100*0.5)=50（replayCoin 不经乘算，进 total 才乘）', p5.endStats.replayCoin);
    assert(p5.endStats.total === 68, 'hard total=round(50*1.35)=68', p5.endStats.total);
  },
};