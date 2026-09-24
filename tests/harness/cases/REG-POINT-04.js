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
    g.setLevel('1-10');
    g.startGame();
    g.setDiff('normal');
    // 前置：击杀 2 只铁桶 → 2 金币(3) 在场未捡 → runPoints 仍 0
    g.forceZombieAt('bucket', 0, 500);
    g.forceZombieAt('bucket', 1, 520);
    g.killAllZombies();
    let m = g.probeMeta();
    assert(m.runPoints === 0 && m.pointDrops.length === 2,
      '前置：2 金币在场未捡（runPoints=0）', m);
    // 前置：saveCleared 预置世界 1 前 9 关 → 本次通关 '1-10' 即世界第 10 关 → worldClear 触发 300
    g.setSaveCleared(['1-1','1-2','1-3','1-4','1-5','1-6','1-7','1-8','1-9']);
    // 通关
    g.forceWaves(99);
    g.clearField();
    g.tick(0.05);
    const p = g.probe();
    assert(p.state === 'end' && p.won === true, '前置：应已通关', { s: p.state, w: p.won });
    m = g.probeMeta();
    // 断言：sweep 2*3=6 + 收集 0 = run 6；奖励 300（worldClear）+100（v2.1 T-104：1-10 金币关首通叠加）；normal mult=1 → total 406
    assert(p.endStats && p.endStats.run === 6, 'sweep 应入账（2 金币=6 分）', p.endStats);
    assert(p.endStats.clear === 300, '世界 1 通关前恰 9 键 → 应发 worldClear 奖励 300', p.endStats.clear);
    assert(p.endStats.coin === 100, 'v2.1：1-10 金币关首通 → coin=100（与 worldClear 分立叠加）', p.endStats.coin);
    assert(p.endStats.total === 406, 'total=round((6+300+100)*1.0)=406', p.endStats.total);
    assert(m.points === 406, 'points 应入账 406', m.points);
    assert(m.runPoints === 0, '结算后 runPoints 归零', m.runPoints);
    assert(m.clears === 1, 'clears 应自增到 1（meta 计数器语义不变）', m.clears);
    assert(m.pointDrops.length === 0, 'sweep 后场上掉落应清空', m.pointDrops.length);

    // 持久化
    const g2 = loadGame({ seed: 42, localStorage: store });
    const m2 = g2.probeMeta();
    assert(m2.points === 406 && m2.clears === 1, 'points/clears 应落盘', { p: m2.points, c: m2.clears });
    const prog = JSON.parse(store.getItem('pvz_progress_v2'));
    assert(prog && prog.v === 2 && prog.cleared.length === 10 && prog.cleared.indexOf('1-10') >= 0,
      'pvz_progress_v2 应落盘且 cleared 含本关（10 键）', prog && prog.cleared);

    // hard 难度乘算抽查：6 收集 + 0 奖励（世界 1 已满 10 键 → 重复通关不再发 worldClear）
    g2.setDiff('hard');
    g2.setLevel('1-10');
    g2.startGame();
    g2.forceZombieAt('fast', 0, 500);   // 银 2
    g2.killAllZombies();
    g2.forceWaves(99); g2.clearField(); g2.tick(0.05);
    const p2 = g2.probe();
    // run=2, clear=0（防重发）, coin=0（v2.1 金币首通幂等，重通零发）→ round(2*1.35)=3
    assert(p2.endStats.total === 3, 'hard：round(2*1.35)=3（worldClear/金币均防重发）', p2.endStats);
    assert(g2.probeMeta().points === 406 + 3, '累计 points=406+3=409', g2.probeMeta().points);
  },
};
