/* REG-META-02 · 元进度存档写入→重载→回读全路径（impl-plan T-02）
 * 断言策略：跑真实游戏内 saveMeta（经 sb 桥直调），再以同一 store 新开 loadGame
 *   （loadMeta 装载期消费）验证持久化闭环。
 *   附加：SLOT_CONFIG/POINT_CONFIG 配置表契约（T-01 验收标准）。
 */
module.exports = {
  id: 'REG-META-02',
  name: '元进度存档写入→重载回读 + 配置表契约（T-01/T-02）',
  seed: 42,
  run({ loadGame, assert }) {
    // ---- 1) 配置表契约（T-01 验收）----
    const g0 = loadGame({ seed: 42 });
    const C = g0.sandbox.__consts;
    assert(C.POINT_CONFIG && C.POINT_CONFIG.TIER.gold.value === 3,
      'POINT_CONFIG.TIER.gold.value 应为 3', C.POINT_CONFIG && C.POINT_CONFIG.TIER);
    assert(C.POINT_CONFIG.TIER.bronze.value === 1 && C.POINT_CONFIG.TIER.silver.value === 2,
      '铜=1 / 银=2 阶位契约', C.POINT_CONFIG.TIER);
    assert(C.POINT_CONFIG.ZOMBIE_TIER_MAP.normal === 'bronze' &&
      C.POINT_CONFIG.ZOMBIE_TIER_MAP.fast === 'silver' &&
      C.POINT_CONFIG.ZOMBIE_TIER_MAP.cone === 'silver' &&
      C.POINT_CONFIG.ZOMBIE_TIER_MAP.bucket === 'gold',
      '怪→阶映射契约（普铜/快银/路银/桶金）', C.POINT_CONFIG.ZOMBIE_TIER_MAP);
    assert(C.POINT_CONFIG.DROP_OFFSET === 12, '掉落偏移半径应为 12px', C.POINT_CONFIG.DROP_OFFSET);
    assert(C.POINT_CONFIG.CLEAR_REWARD.mode === 'per10' &&
      C.POINT_CONFIG.CLEAR_REWARD.per10Amount === 300 && C.POINT_CONFIG.CLEAR_REWARD.flatAmount === 30,
      '通关奖励双读法默认 per10（读法①）', C.POINT_CONFIG.CLEAR_REWARD);
    assert(C.SLOT_CONFIG.SLOT_PRICE[7] === 600 && C.SLOT_CONFIG.SLOT_PRICE[8] === 1200 &&
      C.SLOT_CONFIG.SLOT_PRICE[9] === 1900 && C.SLOT_CONFIG.SLOT_PRICE[10] === 2700,
      '槽价 600/1200/1900/2700（Q1 终版，总 6400）', C.SLOT_CONFIG.SLOT_PRICE);
    assert(C.SLOT_CONFIG.CARD_AWARD[5] === 'melon' && C.SLOT_CONFIG.CARD_AWARD[3] === 'lilypad' &&
      C.SLOT_CONFIG.CARD_AWARD[4] === 'planter',
      '发卡序列契约（L3 睡莲 / L4 花盆 / L5 西瓜）', C.SLOT_CONFIG.CARD_AWARD);
    assert(C.SLOT_CONFIG.initialSlots === 6 && C.SLOT_CONFIG.maxSlots === 10,
      '槽位 6→10 契约', { i: C.SLOT_CONFIG.initialSlots, m: C.SLOT_CONFIG.maxSlots });

    // ---- 2) 写入 → 重载 → 回读闭环 ----
    const store = (function () {
      const m = {};
      return {
        getItem: k => (k in m ? m[k] : null),
        setItem: (k, v) => { m[k] = String(v); },
      };
    })();
    const g1 = loadGame({ seed: 42, localStorage: store });
    // ★ 顶层 let 不挂 vm globalThis（老坑）：直接 sb.points= 只是挂宿主属性，
    //   碰不到脚本内的 let 绑定——必须走 __api setter（同作用域）。
    g1.setPoints(123); g1.setClears(2); g1.setSlots(7);
    g1.setOwnedCards(['sunflower', 'nut', 'pea', 'mine', 'double', 'cabbage', 'lilypad']);
    g1.setDeck(['sunflower', 'nut', 'pea', 'mine', 'lilypad']);
    g1.saveMeta();

    const g2 = loadGame({ seed: 42, localStorage: store });
    const m = g2.probeMeta();
    assert(m.points === 123 && m.clears === 2, 'points/clears 写读闭环', { p: m.points, c: m.clears });
    assert(m.slots === 7, 'slots 写读闭环（含第 7 槽购买态）', m.slots);
    assert(m.ownedCards.length === 7 && m.ownedCards.includes('lilypad'),
      'ownedCards 写读闭环', m.ownedCards);
    assert(m.deck.join(',') === 'sunflower,nut,pea,mine,lilypad',
      'deck 写读闭环（保序）', m.deck);
  },
};
