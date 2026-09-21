/* REG-META-01 · v1.4 元进度存档初始化与存量迁移（impl-plan T-02）
 * 断言策略：loadMeta 在脚本装载时即执行（顶层调用），三种存量场景覆盖：
 *   1. 全新玩家（无任何键）→ 6 槽 / 初始 4 卡 / deck=前 4 / points=0 / clears=0
 *   2. 存量玩家（仅 pvz_unlocked）→ 卡池按解锁进度推导（unlocked=3 → 6 张含 double+cabbage）
 *      槽数恒 6（不按进度放大），points=0，不补发（用户 O-2=A 拍板）
 *   3. 脏数据防御 → pvz_cards 带非法 type 被过滤；pvz_deck 含未拥有卡被钳制；slots 越界回 6
 * 坑位备忘：localStorage 桩须在 loadGame({localStorage}) 注入，loadMeta 装载期即消费；
 *   harness 桥（顶层 let 不挂 globalThis）走 __meta getter 桥（v1.4 新增）。
 */
module.exports = {
  id: 'REG-META-01',
  name: '元进度存档：首启迁移 + 存量推导 + 脏数据钳制（T-02）',
  seed: 42,
  run({ loadGame, assert }) {
    // ---- 场景 1：全新玩家（零存档）----
    const store1 = (function () {
      const m = {};
      return {
        getItem: k => (k in m ? m[k] : null),
        setItem: (k, v) => { m[k] = String(v); },
      };
    })();
    const g1 = loadGame({ seed: 42, localStorage: store1 });
    let m = g1.probeMeta();
    assert(m.slots === 6, '首启槽数应为 6（initialSlots）', m.slots);
    assert(m.points === 0 && m.clears === 0, '首启积分/通关计数应为 0', { points: m.points, clears: m.clears });
    assert(m.ownedCards.length === 4 &&
      m.ownedCards.join(',') === 'sunflower,nut,pea,mine',
      '首启卡池应为初始 4 张', m.ownedCards);
    assert(m.deck.length === 3 && m.deck.join(',') === 'sunflower,pea,nut',
      '首启 deck 应为默认 3 张（向日葵/豌豆/坚果；验收变更 2026-09-21）', m.deck);

    // ---- 场景 2：存量玩家（仅 pvz_unlocked=3，历史版本无新键）----
    const store2 = (function () {
      const m = { pvz_unlocked: '3', pvz_highscore: '1200' };
      return {
        getItem: k => (k in m ? m[k] : null),
        setItem: (k, v) => { m[k] = String(v); },
      };
    })();
    const g2 = loadGame({ seed: 42, localStorage: store2 });
    m = g2.probeMeta();
    assert(m.ownedCards.length === 6, 'unlocked=3 存量玩家卡池应 = 初始4 + L1双发 + L2投手 = 6 张', m.ownedCards);
    assert(m.ownedCards.includes('double') && m.ownedCards.includes('cabbage'),
      '存量推导应含 double 与 cabbage（发卡序列 1..unlocked-1）', m.ownedCards);
    assert(!m.ownedCards.includes('lilypad'), 'unlocked=3 尚未通 L2 后的 L3，睡莲不应入池（发卡在通关 L3 时）', m.ownedCards);
    assert(m.slots === 6, '存量迁移槽数恒 6（不按进度放大）', m.slots);
    assert(m.points === 0, '存量迁移不补发积分（O-2=A）', m.points);

    // ---- 场景 3：全通关存量（unlocked=5 → 9 张全量）----
    const store3 = (function () {
      const m = { pvz_unlocked: '5' };
      return {
        getItem: k => (k in m ? m[k] : null),
        setItem: (k, v) => { m[k] = String(v); },
      };
    })();
    const g3 = loadGame({ seed: 42, localStorage: store3 });
    m = g3.probeMeta();
    // ★ 推导下界（有意）：pvz_unlocked 表达不了「已通 L5」（R-1 同源缺口——L5 通关永不写
    //   unlock），故 unlocked=5 只推到 8 张；melon 缺口由 v1.4 运行时再通 L5 补发（CARD_AWARD）。
    assert(m.ownedCards.length === 8,
      'unlocked=5 存量玩家卡池应推导 8 张（L5 西瓜因 unlock 缺口推不出，运行时补发）', m.ownedCards);
    assert(!m.ownedCards.includes('melon'), 'melon 不在推导池（unlock 数据无法证明已通 L5）', m.ownedCards);
    // ★ 默认卡组（验收变更 2026-09-21）：固定 3 张=向日葵/豌豆/坚果（与卡池 8 张无关），
    //   不再是「卡池前 N 张截断」——老玩家 deck 若含存档则按存档，仅 deck 为空时落默认 3 张。
    assert(m.deck.length === 3 && m.deck.join(',') === 'sunflower,pea,nut',
      'unlocked=5 存量玩家 deck（无存档）应落默认 3 张', m.deck);

    // ---- 场景 4：脏数据防御 ----
    const store4 = (function () {
      const m = {
        pvz_points: '55', pvz_clears: '7', pvz_slots: '99',          // 槽数越界
        pvz_cards: JSON.stringify(['sunflower', 'fake_card', 'pea', 'sunflower']), // 非法+重复
        pvz_deck: JSON.stringify(['pea', 'double', 'fake_card']),     // 未拥有卡
      };
      return {
        getItem: k => (k in m ? m[k] : null),
        setItem: (k, v) => { m[k] = String(v); },
      };
    })();
    const g4 = loadGame({ seed: 42, localStorage: store4 });
    m = g4.probeMeta();
    assert(m.slots === 6, '槽越界（99>max）应回落 initialSlots=6', m.slots);
    assert(m.points === 55 && m.clears === 7, '合法 points/clears 应正常读回', { points: m.points, clears: m.clears });
    assert(m.ownedCards.join(',') === 'sunflower,pea',
      '卡池应过滤非法 type 且去重（保序）', m.ownedCards);
    assert(m.deck.join(',') === 'pea', 'deck 应钳掉未拥有卡（fake_card）', m.deck);

    // ---- 场景 5：localStorage 异常静默降级（不抛错）----
    const badStore = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    const g5 = loadGame({ seed: 42, localStorage: badStore });
    m = g5.probeMeta();
    assert(m.slots === 6 && m.points === 0 && m.ownedCards.length === 4,
      '存储异常时应静默降级为首启默认值', m);
  },
};
