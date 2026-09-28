/* REG-POINT-04 · 胜利结算契约：sweep + 通关奖励 + 难度乘算 + 落盘（impl-plan T-06/T-07/T-08 集成 · T-105 平移）
 * 断言：真实通关路径（forceWaves+clearField）——
 *   1. 场上未捡掉落 sweep 入账（R-2 胜利瞬间币损修复）
 *   2. worldClear 读法：通关前该世界 cleared 恰 9 键（本关=第 10 关）→ 发 300；重复通关不再发
 *   3. total = round((收集+sweep+奖励)*mult) 一次取整
 *   4. points/clears/cleared 落盘（写盘→重载回读）；runPoints 归零
 */
module.exports = {
  id: 'REG-POINT-04',
  name: '胜利结算：sweep 入账 + 世界通关奖励 + 乘算 + 落盘（T-105 集成）',
  seed: 42,
  run({ loadGame, assert }) {
    const store = (function () {
      const m = {};
      return {
        getItem: k => (k in m ? m[k] : null),
        setItem: (k, v) => { m[k] = String(v); },
      };
    })();
    const g = loadGame({ seed: 42, localStorage: store });
    // v2.2.7 CARD_AWARD 重排：1-9=icemelon（真卡）→非金币关，通 3-1 才拿 100 金币
    g.setLevel('3-1');
    g.startGame();
    g.setDiff('normal');
    // 前置：击杀 2 只铁桶 → 2 金币(3) 在场未捡 → runPoints 仍 0
    g.forceZombieAt('bucket', 0, 500);
    g.forceZombieAt('bucket', 1, 520);
    g.killAllZombies();
    let m = g.probeMeta();
    assert(m.runPoints === 0 && m.pointDrops.length === 2,
      '前置：2 金币在场未捡（runPoints=0）', m);
    // 前置：saveCleared 空 → 3-1 非世界末关，不触发 worldClear；3-1 是金币关(100)
    g.setSaveCleared([]);
    // 通关
    g.forceWaves(99);
    g.clearField();
    g.tick(0.05);
    const p = g.probe();
    assert(p.state === 'end' && p.won === true, '前置：应已通关', { s: p.state, w: p.won });
    m = g.probeMeta();
    // 断言：sweep 2*3=6 + 收集 0 = run 6；奖励 0（非世界末关）+100（3-1 金币关首通）；normal mult=1 → total 106
    assert(p.endStats && p.endStats.run === 6, 'sweep 应入账（2 金币=6 分）', p.endStats);
    assert(p.endStats.clear === 0, '3-1 非世界末关 → worldClear 不应触发', p.endStats.clear);
    assert(p.endStats.coin === 100, 'v2.2.7：3-1 金币关首通 → coin=100', p.endStats.coin);
    assert(p.endStats.total === 106, 'total=round((6+0+100)*1.0)=106（3-1 金币关）', p.endStats.total);
    assert(m.points === 106, 'points 应入账 106', m.points);
    assert(m.runPoints === 0, '结算后 runPoints 归零', m.runPoints);
    assert(m.clears === 1, 'clears 应自增到 1', m.clears);
    assert(m.pointDrops.length === 0, 'sweep 后场上掉落应清空', m.pointDrops.length);

    // 持久化
    const g2 = loadGame({ seed: 42, localStorage: store });
    const m2 = g2.probeMeta();
    assert(m2.points === 106 && m2.clears === 1, 'points/clears 应落盘', { p: m2.points, c: m2.clears });
    const prog = JSON.parse(store.getItem('pvz_progress_v2'));
    assert(prog && prog.v === 2 && prog.cleared.length === 1 && prog.cleared.indexOf('3-1') >= 0,
      'pvz_progress_v2 应落盘且 cleared 含本关（1 键）', prog && prog.cleared);

    // hard 难度乘算抽查：1-10 通关 → 已 setSaveCleared 1-1~1-9（9键），1-10 为第 10 关 → worldClear=300；
    //   1-10=sunshroom 真卡非金币关（v2.3.4 改判，原 lilypad），coin=0 → round((2+300)*1.35)=408
    g2.setSaveCleared(['1-1','1-2','1-3','1-4','1-5','1-6','1-7','1-8','1-9']);
    g2.setDiff('hard');
    g2.setLevel('1-10');
    g2.startGame();
    g2.forceZombieAt('fast', 0, 500);   // 银 2
    g2.killAllZombies();
    g2.forceWaves(99); g2.clearField(); g2.tick(0.05);
    const p2 = g2.probe();
    // run=2, clear=300（worldClear，第10关）, coin=0（1-10=sunshroom 真卡关）→ round((2+300)*1.35)=408
    assert(p2.endStats.total === 408, 'hard：round((2+300)*1.35)=408（worldClear 触发，真卡关无金币）', p2.endStats);
    assert(g2.probeMeta().points === 106 + 408, '累计 points=106+408=514', g2.probeMeta().points);

    // ---- v2.3.2 世界 2 后 6 关开放：'2-6' 金币关首通 + 重复通关幂等 + '2-10' 末关 worldClear+金币同发 ----
    //   （判别力：旧源 '2-6'/'2-10' 为 'PLACEHOLDER' → coin=0，本段必红）
    const store3 = (function () {
      const m = {};
      return {
        getItem: k => (k in m ? m[k] : null),
        setItem: (k, v) => { m[k] = String(v); },
      };
    })();
    const g3 = loadGame({ seed: 42, localStorage: store3 });
    g3.setDiff('normal');
    g3.setLevel('2-6');
    g3.startGame();
    g3.setSaveCleared([]);                 // 首通口径；2-6 非世界末关 → worldClear 不触发
    g3.forceWaves(99); g3.clearField(); g3.tick(0.05);
    const p3 = g3.probe();
    assert(p3.state === 'end' && p3.won === true, "'2-6' 前置：应已通关（金币关开放后可玩）", { s: p3.state, w: p3.won });
    assert(p3.endStats.run === 0 && p3.endStats.clear === 0 && p3.endStats.coin === 100,
      "'2-6' 金币关首通 → coin=100 / clear=0（夜段墓地关，v2.3.2 开放）", p3.endStats);
    assert(p3.endStats.total === 100, "'2-6' total=round((0+0+100)*1.0)=100", p3.endStats.total);
    // 幂等：重复通关不再发金币
    g3.startGame();
    g3.forceWaves(99); g3.clearField(); g3.tick(0.05);
    const p3b = g3.probe();
    assert(p3b.endStats.coin === 0, "'2-6' 重复通关 coin=0（首通快照幂等）", p3b.endStats);
    // '2-10' 末关：cleared 恰 9 键（2-1..2-9）→ worldClear=300 + 金币 100 同发 → total=400
    g3.setSaveCleared(['2-1','2-2','2-3','2-4','2-5','2-6','2-7','2-8','2-9']);
    g3.setLevel('2-10');
    g3.startGame();
    g3.forceWaves(99); g3.clearField(); g3.tick(0.05);
    const p3c = g3.probe();
    assert(p3c.endStats.clear === 300 && p3c.endStats.coin === 100,
      "'2-10' 末关 worldClear=300 + 金币 100 同发（v2.3.2 开放后）", p3c.endStats);
    assert(p3c.endStats.total === 400, "'2-10' total=round((0+300+100)*1.0)=400", p3c.endStats.total);
  },
};
