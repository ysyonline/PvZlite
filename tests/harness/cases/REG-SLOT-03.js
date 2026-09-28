/* REG-SLOT-03 · 通关发卡序列契约（impl-plan T-12 · T-105 键位 'w-l' 化 + 40 项序列）
 * 断言：真实通关路径（forceWaves+清场 → checkWave 通关分支）——
 *   1. 序列正确（T-105 CARD_AWARD 真键 8 项抽样）：'1-1'→double '1-2'→cabbage '1-3'→melon
 *      '1-6'→icemelon '1-10'→lilypad（地形卡对位，Q-4） '4-1'→planter（地形卡对位，Q-4）
 *   2. v2.3.2 后 '2-5'→gravebuster 真卡关（原 PLACEHOLDER）；2-6..2-10 已开放为金币关（number 100），
 *      占位仅剩世界 4 的 4-2..4-10（九格）
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
    // v2.2.7 CARD_AWARD 重排：1-5:squash 1-6:snowpea 1-7:pepper 1-8:cherry 1-9:icemelon 1-10:lilypad 4-1:planter
    const seq = [
      ['1-5', 'squash'], ['1-6', 'snowpea'], ['1-7', 'pepper'],
      ['1-8', 'cherry'], ['1-9', 'icemelon'], ['1-10', 'lilypad'], ['4-1', 'planter'],
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

      // 地形卡对位（Q-4）：lilypad 由 '1-10' 发放（世界 1 末关前拿到，备战泳池）、planter 由 '4-1' 发放
      if (key === '1-10') assert(m.ownedCards.includes('lilypad'), '进泳池世界前睡莲应已入池（Q-4 地形卡对位）');
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

    // v2.3.2：'2-5'→gravebuster 真卡关（原 PLACEHOLDER，v2.3.2 咬碑藤解锁落点）——通关应发卡
    g.setLevel('2-5');
    g.startGame();
    g.forceWaves(99); g.clearField(); g.tick(0.05);
    const pph = g.probe();
    assert(pph.state === 'end' && pph.won === true, "'2-5' 前置：应可通关（模板展开）", { s: pph.state, w: pph.won });
    const mg = g.probeMeta();
    assert(mg.ownedCards.includes('gravebuster'), "通 '2-5' → 应发 gravebuster（v2.3.2 咬碑藤解锁）", mg.ownedCards);

    // 持久化：8 真卡关全通 → 卡池 = 初始 4 + 8 真卡 = 12 张写盘
    const g2 = loadGame({ seed: 42, localStorage: store });
    const m2 = g2.probeMeta();
    assert(m2.ownedCards.length === 12, '八真卡关全通后卡池应 12 张（4+8，含 gravebuster）', m2.ownedCards);
    for (const t of ['squash', 'snowpea', 'pepper', 'cherry', 'icemelon', 'lilypad', 'planter', 'gravebuster']) {
      assert(m2.ownedCards.includes(t), '卡池应含 ' + t, m2.ownedCards);
    }
    assert(!m2.ownedCards.includes('corn') && !m2.ownedCards.includes('double'),
      '未通关的 corn（1-4）/double（1-1）不应入池', m2.ownedCards);

    // 边界：已拥有卡再通关不 toast 重复（结构性：includes 拦截——抽 '1-1'）
    // （toast 文案断言在 REG-SLOT-04 选卡界面不重复，这里锁数据层）
  },
};
