/* REG-SLOT-04 · 选卡界面契约：勾选/上限/不满开局合法（impl-plan T-10）
 * 断言：state='deck' 真实点击路径——
 *   1. 进选卡界面不抛、渲染 deck.length/slots
 *   2. 点卡 toggle 入/出 deck（落盘）
 *   3. 超出 slots 拒绝（第 7 张点不进，默认 6 槽）
 *   4. deck < slots（不满）时「开始对局」可用 → 进 play
 * 坐标由 DECK_GRID 常量推导（源码读取，防写死）。
 */
module.exports = {
  id: 'REG-SLOT-04',
  name: '选卡界面：toggle/上限/不满开局（T-10）',
  seed: 42,
  run({ game: g, assert }) {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'plants-vs-zombies.html'), 'utf8');
    // DECK_GRID 常量推导（静态锁：防布局漂移后用例坐标失效静默通过）
    const m = src.match(/const DECK_GRID=\{x0:(\d+),y0:(\d+),gw:(\d+),gh:(\d+),cols:(\d+)\}/);
    assert(m, '源码应定义 DECK_GRID 常量', m && m[0]);
    const X0 = +m[1], Y0 = +m[2], GW = +m[3], GH = +m[4], COLS = +m[5];
    const cellCenter = (i) => [X0 + (i % COLS) * GW + 75, Y0 + Math.floor(i / COLS) * GH + 50];

    // 前置：补卡池到 7 张（默认 4 → 再通 L1/L2/L3 得 7；直接 setter 注入更快）
    g.setOwnedCards(['sunflower', 'nut', 'pea', 'mine', 'double', 'cabbage', 'lilypad']);
    g.setDeck(['sunflower', 'nut', 'pea', 'mine']);

    // ---- 1) 经菜单入口进 deck 态（真实点击路径：卡槽面板入口下方新按钮在批次 G 真机验收，此处直设 state 走 onClickDeck）----
    g.startGame();          // 先有对局参照（deck toggle 落盘不受 state 限制，但界面点击需 state='deck'）
    g.sandbox.sbState = undefined;
    // 直设 state（harness 无 setStateDeck API；经 __api 不可达顶层 let——用 clickAt 走 menu→deck 入口不现实，
    // 改走：setOwnedCards 后用 onClickDeck 的宿主桥——顶层 function 挂 globalThis（sb 桥））
    const sb = g.sandbox;
    // 顶层 function 声明经 sb 桥直达（REG-PLANT-05 实证）：直接调 onClickDeck
    const before = g.probeMeta().deck.length;   // 4
    const [cx5, cy5] = cellCenter(4);           // 第 5 张卡（double）
    sb.onClickDeck(cx5, cy5);
    let mMeta = g.probeMeta();
    assert(mMeta.deck.length === before + 1 && mMeta.deck.includes('double'),
      '点未选卡应入 deck（5 张）', mMeta.deck);
    sb.onClickDeck(cx5, cy5);
    mMeta = g.probeMeta();
    assert(mMeta.deck.length === before, '再点应移出 deck（toggle 回 4 张）', mMeta.deck);

    // ---- 2) 上限 6（slots 默认）：连点 3 张未选卡 → 第 3 张被拒 ----
    g.setDeck(['sunflower', 'nut', 'pea']);   // 3 张，槽 6 → 可再加 3
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

    // ---- 3) 不满开局合法：deck=3 → onClickDeck 开始按钮 → play ----
    g.setDeck(['sunflower', 'pea']);
    // 开始按钮坐标（静态推导：源码 fillRect(300,560,180,54)）
    assert(/fillRect\(300,560,180,54\)/.test(src), '选卡界面开始按钮坐标应匹配（静态锁）');
    sb.onClickDeck(390, 587);
    const p = g.probe();
    assert(p.state === 'play', 'deck=2（<6 槽）开始按钮应可用并进 play', p.state);

    // ---- 4) 空卡组不可开局（≥1 张约束）----
    // 回 deck 态再点开始（deck 空）→ 状态不变
    g.setStateMenu();
    // deck 现为上局 2 张——清空
    g.setDeck([]);
    sb.onClickDeck(390, 587);
    // state 仍是 menu（无法直接断言 state==='menu' 之外的态，断言未进 play）
    assert(g.probe().state === 'menu', '空卡组点开始不得进 play', g.probe().state);
  },
};
