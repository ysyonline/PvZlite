/* REG-SLOT-02 · 卡槽购买契约：扣积分 + 顺序解锁 + 上限 10（impl-plan T-11）
 * 断言：buySlot 真实路径——积分足够扣价解锁、不足拒绝、达 10 槽后拒买、
 *   只能按序买（跳格拒绝）、持久化（写盘→重载回读）。
 */
module.exports = {
  id: 'REG-SLOT-02',
  name: '卡槽购买：扣分/顺序/上限/持久化（T-11）',
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

    // ---- 1) 积分不足拒绝 ----
    g.setPoints(599); g.setSlots(6);
    g.buySlot();
    let m = g.probeMeta();
    assert(m.slots === 6 && m.points === 599, '积分 599 < 600 → 拒买不变', m);

    // ---- 2) 恰好足够：扣 600 解锁第 7 槽 ----
    g.setPoints(600);
    g.buySlot();
    m = g.probeMeta();
    assert(m.slots === 7 && m.points === 0, '600 分买第 7 槽 → slots=7 points=0', m);

    // ---- 3) 顺序解锁：跳格拒绝（slots=7 时只能买 8，格子 9/10 点了无效）----
    g.setPoints(5000); g.setSlots(7);
    g.buySlot();   // 买第 8 槽（1200）
    m = g.probeMeta();
    assert(m.slots === 8 && m.points === 3800, '第 8 槽扣 1200', m);

    // ---- 4) 持久化：写盘 → 重载回读 ----
    g.saveMeta();
    const g2 = loadGame({ seed: 42, localStorage: store });
    m = g2.probeMeta();
    assert(m.slots === 8 && m.points === 3800, 'slots/points 持久化闭环', m);

    // ---- 5) 上限 10：达上限后 buySlot 拒绝（无第 11 槽）----
    g2.setPoints(99999); g2.setSlots(10);
    const before = g2.probeMeta();
    g2.buySlot();
    m = g2.probeMeta();
    assert(m.slots === 10 && m.points === before.points, '已 10 槽 → 拒买且不扣分', m);

    // ---- 6) 顶格价目：全买完 7→10 总扣 6400 ----
    const g3 = loadGame({ seed: 42, localStorage: store });
    g3.setPoints(6400); g3.setSlots(6);
    g3.buySlot(); g3.buySlot(); g3.buySlot(); g3.buySlot();
    m = g3.probeMeta();
    assert(m.slots === 10 && m.points === 0, '6400 分应恰好买满 7-10 槽（总 6400）', m);
  },
};
