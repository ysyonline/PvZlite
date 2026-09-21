/* REG-POINT-05 · 失败结算契约：只算已收集（impl-plan T-06）
 * 断言：僵尸进屋失败路径——
 *   1. 已点击收集的 runPoints 入账（×难度乘算）
 *   2. 场上未捡掉落作废（Q6 拍板），不清零已收集
 *   3. clears 不自增（失败不算通关）；无通关奖励
 *   4. 落盘
 */
module.exports = {
  id: 'REG-POINT-05',
  name: '失败结算：已收集入账 / 未收集作废 / clears 不增（T-06）',
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
    // 前置：clears=9（若失败误自增到 10 会发奖——失败必须不触发）
    g.setClears(9);
    // 收集 1 只铁桶金币（3 分）→ 击杀 2 只：1 只点收、1 只不收
    g.forceZombieAt('bucket', 0, 500);
    g.forceZombieAt('normal', 1, 520);
    g.killAllZombies();
    let drops = g.probeMeta().pointDrops;
    assert(drops.length === 2, '前置：2 掉落在场', drops.length);
    g.clickAt(drops[0].x, drops[0].y);   // 收金币（3）
    let m = g.probeMeta();
    assert(m.runPoints === 3 && m.pointDrops.length === 1, '前置：已收 3 分、1 掉落未收', m);

    // 失败：僵尸进屋
    g.forceZombieHome();
    g.tick(0.05);
    const p = g.probe();
    assert(p.state === 'end' && p.won === false, '前置：应已失败', { s: p.state, w: p.won });

    m = g.probeMeta();
    // total = round(3*1.0)=3；未收的铜 1 作废
    assert(p.endStats.run === 3, '失败只结算已收集（3）', p.endStats.run);
    assert(p.endStats.clear === 0, '失败无通关奖励', p.endStats.clear);
    assert(p.endStats.total === 3, 'total=round(3*1.0)=3', p.endStats.total);
    assert(m.points === 3, 'points 入账 3', m.points);
    assert(m.clears === 9, '失败 clears 不得自增（仍 9，若误增到 10 会错发奖）', m.clears);

    // 落盘
    const g2 = loadGame({ seed: 42, localStorage: store });
    const m2 = g2.probeMeta();
    assert(m2.points === 3 && m2.clears === 9, '失败结算应落盘', { p: m2.points, c: m2.clears });

    // 追加：失败后 clear 奖励不发且 clears 不动——再失败一次仍 0
    g2.startGame();
    g2.forceZombieHome();
    g2.tick(0.05);
    assert(g2.probeMeta().clears === 9, '二连失败 clears 仍 9', g2.probeMeta().clears);
  },
};
