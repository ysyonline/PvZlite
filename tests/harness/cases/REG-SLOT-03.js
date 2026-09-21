/* REG-SLOT-03 · 通关发卡序列契约（impl-plan T-12）
 * 断言：真实通关路径（forceWaves+清场 → checkWave 通关分支）——
 *   1. 通 L1 → ownedCards 含 double（+积分/关推进不受影响）
 *   2. 序列正确：L1→double L2→cabbage L3→lilypad L4→planter L5→melon（载具先于对应关）
 *   3. 重复通关不重复加
 *   4. 发卡落盘（saveMeta 在分支内）
 */
module.exports = {
  id: 'REG-SLOT-03',
  name: '通关发卡：序列正确 + 不重复 + 落盘（T-12）',
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
    const seq = [[1, 'double'], [2, 'cabbage'], [3, 'lilypad'], [4, 'planter'], [5, 'melon']];

    for (const [lv, card] of seq) {
      g.setLevel(lv);
      g.startGame();
      g.forceWaves(99);           // 推完所有波（队列已生成，wave>=totalWaves）
      g.clearField();             // 清场 → 下一帧 checkWave 通关分支触发
      g.tick(0.05);
      let p = g.probe();
      assert(p.state === 'end' && p.won === true, 'L' + lv + ' 前置：应已通关', { s: p.state, w: p.won });
      const m = g.probeMeta();
      assert(m.ownedCards.includes(card), '通 L' + lv + ' → 应发 ' + card, m.ownedCards);

      // 载具先于对应关：通 L3 后（含水关 L4 前）睡莲已在池
      if (lv === 3) assert(m.ownedCards.includes('lilypad'), '进 L4 前睡莲应已入池（Q5 载具经发卡）');
      if (lv === 4) assert(m.ownedCards.includes('planter'), '进 L5 前花盆应已入池（Q5 载具经发卡）');

      // 重复通关不重复加
      const cnt = m.ownedCards.filter(t => t === card).length;
      assert(cnt === 1, 'L' + lv + ' 卡「' + card + '」不应重复入池', m.ownedCards);
      g.startGame();              // 再打一遍同关
      g.forceWaves(99); g.clearField(); g.tick(0.05);
      const m2 = g.probeMeta();
      assert(m2.ownedCards.filter(t => t === card).length === 1,
        '重复通 L' + lv + ' 不重复发卡', m2.ownedCards);
    }

    // 持久化：五关全通 → 卡池 9 张写盘
    const g2 = loadGame({ seed: 42, localStorage: store });
    const m2 = g2.probeMeta();
    assert(m2.ownedCards.length === 9, '五关全通后卡池应 9 张', m2.ownedCards);

    // 边界：已拥有卡再通关不 toast 重复（结构性：includes 拦截——抽 L1）
    // （toast 文案断言在 REG-SLOT-04 选卡界面不重复，这里锁数据层）
  },
};
