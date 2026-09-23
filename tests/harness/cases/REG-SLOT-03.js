/* REG-SLOT-03 · 通关发卡序列契约（impl-plan T-12 · T-105 键位 'w-l' 化 + 40 项序列）
 * 断言：真实通关路径（forceWaves+清场 → checkWave 通关分支）——
 *   1. 序列正确（T-105 CARD_AWARD 真键 8 项抽样）：'1-1'→double '1-2'→cabbage '1-3'→melon
 *      '1-6'→icemelon '2-1'→lilypad（地形卡对位，Q-4） '4-1'→planter（地形卡对位，Q-4）
 *   2. PLACEHOLDER 名额跳过不发不报错（抽 '1-7'）
 *   3. 重复通关不重复加
 *   4. 发卡落盘（saveMeta 在分支内）
 */
module.exports = {
  id: 'REG-SLOT-03',
  name: '通关发卡：序列正确 + 占位跳过 + 不重复 + 落盘（T-105）',
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
    const seq = [
      ['1-1', 'double'], ['1-2', 'cabbage'], ['1-3', 'melon'],
      ['1-6', 'icemelon'], ['2-1', 'lilypad'], ['4-1', 'planter'],
    ];

    for (const [key, card] of seq) {
      g.setLevel(key);
      g.startGame();
      g.forceWaves(99);           // 推完所有波（队列已生成，wave>=totalWaves）
      g.clearField();             // 清场 → 下一帧 checkWave 通关分支触发
      g.tick(0.05);
      let p = g.probe();
      assert(p.state === 'end' && p.won === true, key + ' 前置：应已通关', { s: p.state, w: p.won });
      const m = g.probeMeta();
      assert(m.ownedCards.includes(card), '通 ' + key + ' → 应发 ' + card, m.ownedCards);

      // 地形卡对位（Q-4）：lilypad 由 '2-1' 发放、planter 由 '4-1' 发放
      if (key === '2-1') assert(m.ownedCards.includes('lilypad'), '进泳池世界前睡莲应已入池（Q-4 地形卡对位）');
      if (key === '4-1') assert(m.ownedCards.includes('planter'), '进房屋世界前花盆应已入池（Q-4 地形卡对位）');

      // 重复通关不重复加
      const cnt = m.ownedCards.filter(t => t === card).length;
      assert(cnt === 1, key + ' 卡「' + card + '」不应重复入池', m.ownedCards);
      g.startGame();              // 再打一遍同关
      g.forceWaves(99); g.clearField(); g.tick(0.05);
      const m2 = g.probeMeta();
      assert(m2.ownedCards.filter(t => t === card).length === 1,
        '重复通 ' + key + ' 不重复发卡', m2.ownedCards);
    }

    // 边界：PLACEHOLDER 名额（'1-7'）通关 → 不发卡不报错、不重复入池
    g.setLevel('1-7');
    g.startGame();
    g.forceWaves(99); g.clearField(); g.tick(0.05);
    const pph = g.probe();
    assert(pph.state === 'end' && pph.won === true, "'1-7' 前置：占位关应可通关（模板展开）", { s: pph.state, w: pph.won });

    // 持久化：6 真卡关全通 → 卡池 = 初始 4 + 6 真卡 = 10 张写盘
    const g2 = loadGame({ seed: 42, localStorage: store });
    const m2 = g2.probeMeta();
    assert(m2.ownedCards.length === 10, '六真卡关全通后卡池应 10 张（4+6）', m2.ownedCards);
    for (const t of ['double', 'cabbage', 'melon', 'icemelon', 'lilypad', 'planter']) {
      assert(m2.ownedCards.includes(t), '卡池应含 ' + t, m2.ownedCards);
    }
    assert(!m2.ownedCards.includes('snowpea') && !m2.ownedCards.includes('corn'),
      '未通关的 snowpea（1-5）/corn（1-4）不应入池', m2.ownedCards);

    // 边界：已拥有卡再通关不 toast 重复（结构性：includes 拦截——抽 '1-1'）
    // （toast 文案断言在 REG-SLOT-04 选卡界面不重复，这里锁数据层）
  },
};
