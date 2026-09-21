/* REG-SLOT-04 · 选卡界面契约：两排布局（验收变更 2026-09-21）
 * 断言：state='deck' 真实点击路径——
 *   1. 上排待选：点未选卡 → 加入 deck（落盘）；点已选卡 → 拒绝（移除走下排卡槽栏）
 *   2. 上限 slots：连点未选卡到 6 张后第 7 张被拒
 *   3. 下排卡槽栏：点实卡 → 移除；点空槽 → 拒绝
 *   4. deck < slots（不满）时「开始对局」可用 → 进 play；空卡组不可开局
 * 坐标由 DECK_GRID/DECK_SLOTS 常量推导（源码读取，防写死）。
 */
module.exports = {
  id: 'REG-SLOT-04',
  name: '选卡界面：两排布局/上限/移除/不满开局（验收变更）',
  seed: 42,
  run({ game: g, assert }) {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'plants-vs-zombies.html'), 'utf8');
    // DECK_GRID / DECK_SLOTS 常量推导（静态锁：防布局漂移后用例坐标失效静默通过）
    const m = src.match(/const DECK_GRID=\{x0:(\d+),y0:(\d+),gw:(\d+),gh:(\d+),cols:(\d+)\}/);
    assert(m, '源码应定义 DECK_GRID 常量', m && m[0]);
    const X0 = +m[1], Y0 = +m[2], GW = +m[3], GH = +m[4], COLS = +m[5];
    const cellCenter = (i) => [X0 + (i % COLS) * GW + 75, Y0 + Math.floor(i / COLS) * GH + 50];
    const ms = src.match(/const DECK_SLOTS=\{x0:(\d+),y0:(\d+),cw:(\d+),ch:(\d+)\}/);
    assert(ms, '源码应定义 DECK_SLOTS 常量', ms && ms[0]);
    const SX0 = +ms[1], SY0 = +ms[2], CW = +ms[3];
    const slotCenter = (s) => [SX0 + s * CW + 49, SY0 + 60];

    // 前置：补卡池到 7 张；deck 3 张（新默认）
    g.setOwnedCards(['sunflower', 'nut', 'pea', 'mine', 'double', 'cabbage', 'lilypad']);
    g.setDeck(['sunflower', 'pea', 'nut']);

    const sb = g.sandbox;
    // ---- 1) 上排待选：点未选卡 → 入 deck ----
    const before = g.probeMeta().deck.length;   // 3
    const [cx5, cy5] = cellCenter(4);           // 第 5 张卡（double）
    sb.onClickDeck(cx5, cy5);
    let mMeta = g.probeMeta();
    assert(mMeta.deck.length === before + 1 && mMeta.deck.includes('double'),
      '点未选卡应入 deck（4 张）', mMeta.deck);
    // 点已选卡（上排）→ 拒绝（两排语义：上排只加入，移除走下排）
    sb.onClickDeck(cx5, cy5);
    mMeta = g.probeMeta();
    assert(mMeta.deck.length === before + 1 && mMeta.deck.includes('double'),
      '上排点已选卡应拒绝（不移除，deck 保持 4 张）', mMeta.deck);

    // ---- 2) 上限 6（slots 默认）：连点未选卡到 6 张 → 第 7 张被拒 ----
    g.setDeck(['sunflower', 'pea', 'nut']);   // 3 张，槽 6 → 可再加 3
    const ids = [3, 4, 5, 6];                 // mine/double/cabbage/lilypad
    for (let k = 0; k < 3; k++) {
      const [x, y] = cellCenter(ids[k]);
      sb.onClickDeck(x, y);
    }
    mMeta = g.probeMeta();
    assert(mMeta.deck.length === 6, '3+3 应恰好到 6 槽上限', mMeta.deck);
    const [x6, y6] = cellCenter(ids[3]);
    sb.onClickDeck(x6, y6);
    mMeta = g.probeMeta();
    assert(mMeta.deck.length === 6 && !mMeta.deck.includes('lilypad'),
      '第 7 张应被拒（超 slots）', mMeta.deck);

    // ---- 3) 下排卡槽栏：点实卡移除 / 点空槽拒绝 ----
    g.setDeck(['sunflower', 'pea']);          // 2 张 → 槽 0=sunflower 1=pea 2=空
    const [rx, ry] = slotCenter(1);           // 点第 2 槽实卡（pea）
    sb.onClickDeck(rx, ry);
    mMeta = g.probeMeta();
    assert(mMeta.deck.length === 1 && mMeta.deck.join(',') === 'sunflower',
      '下排点实卡应移除（deck 剩 1 张）', mMeta.deck);
    const [ex, ey] = slotCenter(3);           // 第 4 槽（空）
    sb.onClickDeck(ex, ey);
    mMeta = g.probeMeta();
    assert(mMeta.deck.length === 1, '下排点空槽应拒绝（deck 不变）', mMeta.deck);

    // ---- 4) 不满开局合法：deck=1 → 开始按钮（y600 新坐标）→ play ----
    assert(/fillRect\(300,600,180,54\)/.test(src), '选卡界面开始按钮坐标应匹配（静态锁 y600）');
    sb.onClickDeck(390, 627);
    const p = g.probe();
    assert(p.state === 'play', 'deck=1（<6 槽）开始按钮应可用并进 play', p.state);

    // ---- 5) 空卡组不可开局（≥1 张约束）----
    g.setStateMenu();
    g.setDeck([]);
    sb.onClickDeck(390, 627);
    assert(g.probe().state === 'menu', '空卡组点开始不得进 play', g.probe().state);
  },
};
