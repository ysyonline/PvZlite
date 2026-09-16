/* REG-TRAP-04 · 陷阱 #4：改布局忘改点击热区（regression-plan §3.1 · KNOWN-ISSUES #3 指定）
 * 契约：卡片栏点击命中判定必须用常量 CARD_X0 推导（onClick: cx = CARD_X0 + i*CARD_W），
 *       而非写死下标。本用例坐标全部由 CARD_X0 / CARD_W 推导——
 *       若命中判定改成任何与 CARD_X0 解耦的硬编码偏移，下列点击将全部脱靶。
 * 反向验证：把 onClick 的 `const cx=CARD_X0+i*CARD_W` 改成 `const cx=170+i*CARD_W`，
 *           本用例必须 FAIL（见交付说明）。
 */
module.exports = {
  id: 'REG-TRAP-04',
  name: '陷阱#4 · 点击热区用 CARD_X0 推导（非写死下标）',
  seed: 42,
  run({ game: g, assert }) {
    const K = g.sandbox.__consts;
    assert(K && typeof K.CARD_X0 === 'number', '应能从 harness 取到布局常量 __consts');
    const cy = K.CARD_Y + K.CARD_H / 2;
    const centerX = (i) => K.CARD_X0 + i * K.CARD_W + K.CARD_W / 2;

    g.startGame();
    assert(g.probe().selected === null, '开局应无选中');

    // ---- 1）用 CARD_X0 推导第 2 张卡（index 1）中心 → 应选中 index 1 ----
    g.clickAt(centerX(1), cy);
    assert(g.probe().selected && g.probe().selected.i === 1,
      'CARD_X0 推导坐标点击第 2 张卡应命中 index 1', g.probe().selected);

    // ---- 2）切换选中第 1 张卡（index 0）----
    g.clickAt(centerX(0), cy);
    assert(g.probe().selected && g.probe().selected.i === 0,
      '推导坐标点击第 1 张卡应命中 index 0', g.probe().selected);

    // ---- 3）点击第 6 张卡（index 5，最后一张）----
    g.clickAt(centerX(5), cy);
    assert(g.probe().selected && g.probe().selected.i === 5,
      '推导坐标点击第 6 张卡应命中 index 5', g.probe().selected);

    // ---- 4）卡片左邻接区（CARD_X0 + i*CARD_W + 1）应命中第 i 张（推导坐标不脱靶）----
    g.clickAt(K.CARD_X0 + 3 * K.CARD_W + 1, cy);
    assert(g.probe().selected && g.probe().selected.i === 3,
      '卡片左邻接点应命中 index 3', g.probe().selected);

    // ---- 4b）相邻卡共享的 1px 边界（闭区间重叠）：靠前的卡优先命中 ----
    // 记录实际契约（区间两端闭区间 → 边界像素归前一张卡），防止无意改动命中顺序。
    g.clickAt(K.CARD_X0 + 3 * K.CARD_W, cy);
    assert(g.probe().selected && g.probe().selected.i === 2,
      '共享边界像素应归前一张卡（index 2，闭区间重叠）', g.probe().selected);

    // ---- 5）铲子槽（x < CARD_X0）应选铲子，而非误选卡片 ----
    g.clickAt(K.SHOVEL_X + 10, cy);
    assert(g.probe().selected && g.probe().selected.shovel === true,
      '铲子槽点击应选中铲子', g.probe().selected);

    // ---- 6）卡片区左侧缝隙（CARD_X0 - 1）不应命中任何卡片 ----
    // 先清掉选中，再点缝隙：若命中判定起点比 CARD_X0 小 1px（写死/漂移），此处会误选 index 0。
    g.clickAt(K.SHOVEL_X + 10, cy);            // 再点一次铲子 → 取消选中
    assert(g.probe().selected === null, '再点铲子应取消选中');
    g.clickAt(K.CARD_X0 - 1, cy);
    assert(g.probe().selected === null,
      '卡片起始位左侧 1px 缝隙不得命中任何卡片（命中起点须 = CARD_X0）', g.probe().selected);
  },
};
