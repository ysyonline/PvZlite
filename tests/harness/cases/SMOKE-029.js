/* SMOKE-029 · v1.4 十槽卡栏布局 + deck 点击命中（impl-plan T-14 / T-16）
 * 断言：
 *   1. CARD_W=88 静态锁定；10 卡右缘 76+880=956 ≤ 1000（76=CARD_X0；布局校验）
 *   2. deck 满 10 张（slots=10）时点击第 1/5/10 卡全部命中对应槽位
 *   3. 热键 1..0 上界语义：deck[9] 可经热键选中（'9' 键 → index 8；第 10 卡无热键，D-4 冻结）
 *   4. deck 4 张（默认）时第 5-9 卡位置点击/热键无效（空槽忽略）
 */
module.exports = {
  id: 'SMOKE-029',
  name: 'v1.4 十槽卡栏布局 + deck 命中（T-14）',
  seed: 42,
  run({ game: g, assert }) {
    const K = g.sandbox.__consts;
    // ---- 1) 布局校验 ----
    assert(K.CARD_W === 88, 'CARD_W 应为 88（98→88）', K.CARD_W);
    const rightEdge = K.CARD_X0 + 10 * K.CARD_W;   // 76+880=956
    assert(rightEdge <= 1000, '10 卡右缘 ' + rightEdge + ' 应 ≤1000 不溢出', rightEdge);
    // SLOT_CONFIG.CARD_W 与实际常量一致（配置契约）
    assert(K.SLOT_CONFIG && K.SLOT_CONFIG.CARD_W === K.CARD_W,
      'SLOT_CONFIG.CARD_W 应与布局常量一致', K.SLOT_CONFIG && K.SLOT_CONFIG.CARD_W);

    const cy = K.CARD_Y + K.CARD_H / 2;
    const centerX = (i) => K.CARD_X0 + i * K.CARD_W + K.CARD_W / 2;
    const nine = ['sunflower', 'nut', 'pea', 'mine', 'double', 'melon', 'lilypad', 'planter', 'cabbage'];

    // ---- 2) 10 槽满配：9 张池 + 1 空位（卡池只有 9 种——第 10 槽留空验证空位不渲染不响应）----
    g.setSlots(10);
    g.setOwnedCards(nine);
    g.setDeck(nine);   // deck=9 张 < 10 槽（第 10 槽空）
    g.startGame();
    // 点第 1 卡（sunflower）
    g.clickAt(centerX(0), cy);
    let p = g.probe();
    assert(p.selected && p.selected.i === 0 && p.selected.type === 'sunflower',
      '第 1 卡点击应命中 index 0（type 解析 sunflower）', p.selected);
    // 点第 9 卡（cabbage，index 8）
    g.clickAt(centerX(8), cy);
    p = g.probe();
    assert(p.selected && p.selected.i === 8 && p.selected.type === 'cabbage',
      '第 9 卡点击应命中 index 8（cabbage）', p.selected);
    // 第 10 槽空位点击 → 无选中（保留原选中或 null）
    g.clickAt(centerX(9), cy);
    p = g.probe();
    assert(p.selected === null || p.selected.i === 8,
      '空槽（index 9）点击不得误选', p.selected);

    // ---- 3) 热键：'9' → index 8（cabbage）；空位热键忽略 ----
    g.keydown('Escape');   // 清选中（play 态 Esc 语义）
    g.keydown('9');
    p = g.probe();
    assert(p.selected && p.selected.i === 8 && p.selected.type === 'cabbage',
      "热键 9 应选中 index 8（deck[8]=cabbage）", p.selected);
    g.keydown('Escape');

    // ---- 4) 默认 4 张：第 5 卡位置点击/热键无效 ----
    g.setDeck(['sunflower', 'nut', 'pea', 'mine']);   // 还原默认 deck（§2 的 setDeck 仅注入内存态）
    g.startGame();
    assert(g.probeMeta().deck.length === 4, '前置：deck 应为默认 4 张', g.probeMeta().deck);
    g.clickAt(centerX(4), cy);
    p = g.probe();
    assert(p.selected === null, '默认 deck=4 时第 5 卡位置点击应无效', p.selected);
    g.keydown('5');
    p = g.probe();
    assert(p.selected === null, "热键 5 在 deck=4 时应无效（空槽忽略）", p.selected);
    g.keydown('1');
    p = g.probe();
    assert(p.selected && p.selected.i === 0 && p.selected.type === 'sunflower',
      '热键 1 应选中 deck[0]=sunflower', p.selected);
  },
};
