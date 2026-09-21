/* REG-POINT-04 · 胜利结算契约：sweep + 通关奖励 + 难度乘算 + 落盘（impl-plan T-06/T-07/T-08 集成）
 * 断言：真实通关路径（forceWaves+clearField）——
 *   1. 场上未捡掉落 sweep 入账（R-2 胜利瞬间币损修复）
 *   2. clears 自增；per10 读法下逢 10 发 300
 *   3. total = round((收集+sweep+奖励)*mult) 一次取整
 *   4. points 落盘（写盘→重载回读）；runPoints 归零
 */
module.exports = {
  id: 'REG-POINT-04',
  name: '胜利结算：sweep 入账 + 奖励 + 乘算 + 落盘（T-06 集成）',
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
    g.setLevel(1);
    g.startGame();
    g.setDiff('normal');
    // 前置：击杀 2 只铁桶 → 2 金币(3) 在场未捡 → runPoints 仍 0
    g.forceZombieAt('bucket', 0, 500);
    g.forceZombieAt('bucket', 1, 520);
    g.killAllZombies();
    let m = g.probeMeta();
    assert(m.runPoints === 0 && m.pointDrops.length === 2,
      '前置：2 金币在场未捡（runPoints=0）', m);
    // 前置：clears=9 → 本次通关 clears=10 → per10 触发 300
    g.setClears(9);
    // 通关
    g.forceWaves(99);
    g.clearField();
    g.tick(0.05);
    const p = g.probe();
    assert(p.state === 'end' && p.won === true, '前置：应已通关', { s: p.state, w: p.won });
    m = g.probeMeta();
    // 断言：sweep 2*3=6 + 收集 0 = run 6；奖励 300；normal mult=1 → total 306
    assert(p.endStats && p.endStats.run === 6, 'sweep 应入账（2 金币=6 分）', p.endStats);
    assert(p.endStats.clear === 300, 'clears 9→10 应发 per10 奖励 300', p.endStats.clear);
    assert(p.endStats.total === 306, 'total=round((6+300)*1.0)=306', p.endStats.total);
    assert(m.points === 306, 'points 应入账 306', m.points);
    assert(m.runPoints === 0, '结算后 runPoints 归零', m.runPoints);
    assert(m.clears === 10, 'clears 应自增到 10', m.clears);
    assert(m.pointDrops.length === 0, 'sweep 后场上掉落应清空', m.pointDrops.length);

    // 持久化
    const g2 = loadGame({ seed: 42, localStorage: store });
    const m2 = g2.probeMeta();
    assert(m2.points === 306 && m2.clears === 10, 'points/clears 应落盘', { p: m2.points, c: m2.clears });

    // hard 难度乘算抽查：6 收集 + 0 奖励（clears=10 再通关=20 才发）
    g2.setDiff('hard');
    g2.setLevel(1);
    g2.startGame();
    g2.forceZombieAt('fast', 0, 500);   // 银 2
    g2.killAllZombies();
    g2.forceWaves(99); g2.clearField(); g2.tick(0.05);
    const p2 = g2.probe();
    // run=2, clear=0（clears 11 不逢10）→ round(2*1.35)=3
    assert(p2.endStats.total === 3, 'hard：round(2*1.35)=3', p2.endStats);
    assert(g2.probeMeta().points === 306 + 3, '累计 points=306+3=309', g2.probeMeta().points);
  },
};
