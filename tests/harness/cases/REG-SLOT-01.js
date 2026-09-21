/* REG-SLOT-01 · 卡池/卡组状态契约：初始 6 槽 + 卡组可不选满即合法（impl-plan T-09）
 * 断言策略：经真实 loadMeta 装载路径断言初始态；defaultDeck 钳制；startGame 对
 *   deck.length < slots 无约束（对局不因不满而拒开）。
 * 注：startGame 不校验 deck（选卡界面的「开始」允许不满 = Q-A 拍板），此为
 *   「合法性在 UI 层而非对局层」的结构性保障。
 */
module.exports = {
  id: 'REG-SLOT-01',
  name: '卡组状态：初始 6 槽 / deck=4 默认 / 不满开局合法（T-09）',
  seed: 42,
  run({ game: g, assert }) {
    // ---- 1) 初始态契约（全新 sandbox 默认走首启迁移）----
    const m = g.probeMeta();
    assert(m.slots === 6, '初始槽数应为 6', m.slots);
    assert(m.ownedCards.length === 4, '初始卡池应为 4 张', m.ownedCards);
    assert(m.deck.length === 4 && m.deck.length <= m.slots,
      '默认 deck 应为 4 张且 ≤ 槽数', m.deck);
    assert(m.deck.join(',') === m.ownedCards.join(','),
      '默认 deck = 卡池前 min(slots, 4) 张（保序）', m.deck);

    // ---- 2) deck 不满开局合法：deck.length(4) < slots(6) → startGame 正常进 play ----
    g.startGame();
    const p = g.probe();
    assert(p.state === 'play', 'deck=4 < slots=6 时 startGame 应正常进入 play', p.state);
    assert(p.deck.length === 4, '对局内 deck 保持 4 张不变', p.deck);

    // ---- 3) defaultDeck 钳制（真实函数路径）----
    g.setOwnedCards(['sunflower', 'nut', 'pea', 'mine', 'double', 'cabbage', 'melon', 'lilypad', 'planter']);
    g.setSlots(6);
    const clamped = g.defaultDeck();
    assert(clamped.length === 6, 'defaultDeck 应钳到 min(slots=6, 9)=6', clamped.length);
    assert(clamped[0] === 'sunflower' && clamped[5] === 'cabbage',
      'defaultDeck 保序截断', clamped);
    g.setDeck(['sunflower', 'pea']);
    assert(g.inDeck('sunflower') === true && g.inDeck('pea') === true, 'inDeck 命中已选卡');
    assert(g.inDeck('melon') === false, 'inDeck 不命中未选卡');
    assert(g.inDeck('fake') === false, 'inDeck 不命中不存在的卡');
  },
};
