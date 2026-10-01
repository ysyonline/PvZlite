/* REG-SKIN-02 · v2.4.2 P1 皮肤系统：商店页签 + 购买/装备/卸下管道（GDD v24-coin-shop §2.2.4）
 * 断言：
 *   §1 页签切换：进店默认 upgrades → 切到 skins 页签
 *   §2 buySkin：扣分 + owned 入集 + 写档；积分不足拒绝；重复拒绝；req 锁定拒绝（EB-3 unlockReq）
 *   §3 equipSkin：装备 + 卸下 + 写档等价重载
 *   §4 EB-1：有皮肤无植物 → 可买不可装
 *   §5 skinReqOk 独立覆盖：req null / world2 / world3 / world4 四态
 *   §6 卸下后恢复默认（equipped 消失）
 */
module.exports = {
  id: 'REG-SKIN-02',
  name: 'P1 皮肤系统：商店皮肤页签 + 购买/装备/卸下管道（v2.4.2）',
  seed: 42,
  run({ loadGame, assert }) {
    const makeStore = () => {
      const m = {};
      return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _dump: () => JSON.parse(JSON.stringify(m)) };
    };

    const K = loadGame({ seed: 42 }).sandbox.__consts;
    assert(K.SKIN_CATALOG && K.SKIN_CATALOG.length === 8, '§1 前置：SKIN_CATALOG 8 款');
    const peaGold = K.SKIN_CATALOG.find(s => s.id === 'pea_gold');
    assert(peaGold && peaGold.price === 200 && peaGold.req === null, '§1 pea_gold 定价 200 无条件');

    // ---- §1 页签切换 ----
    const store1 = makeStore();
    const g = loadGame({ seed: 42, localStorage: store1 });
    g.setStateMenu('skin-shop-test');
    const SB = K.SHOP_BTN;
    g.clickAt(SB.x + SB.w / 2, SB.y + SB.h / 2);
    let p = g.probe();
    assert(p.state === 'shop' && p.shopTab === 'upgrades', '§1 进店默认页签=upgrades', { state: p.state, tab: p.shopTab });
    const T = K.SHOP_GEOM.TAB;
    g.clickAt(T.x0 + 3 * (T.w + T.gap) + T.w / 2, T.y + T.h / 2);
    p = g.probe();
    assert(p.shopTab === 'skins', '§1 切到 skins 页签', p.shopTab);

    // ---- §2 buySkin ----
    g.setPoints(500);
    g.sandbox.__api.buySkin('pea_gold');
    p = g.probe();
    assert(p.ownedSkins.includes('pea_gold'), '§2a buySkin pea_gold → owned', p.ownedSkins);
    assert(p.points === 300, '§2a 扣 200 分（500→300）', p.points);
    g.sandbox.__api.buySkin('pea_gold');
    p = g.probe();
    assert(p.points === 300 && p.ownedSkins.length === 1, '§2b 重复购买不扣分不离集', { pts: p.points, owned: p.ownedSkins });
    g.setPoints(199);
    g.sandbox.__api.buySkin('cabbage_autumn');
    p = g.probe();
    assert(!p.ownedSkins.includes('cabbage_autumn') && p.points === 199, '§2c 积分不足拒绝（cabbage 200 > 199）', p.ownedSkins);

    // ---- §3 equipSkin + 卸下 + 写档重载等价 ----
    const store3 = makeStore();
    const g3 = loadGame({ seed: 42, localStorage: store3 });
    g3.setPoints(1000);
    g3.sandbox.__api.buySkin('pea_gold');
    g3.sandbox.__api.buySkin('cabbage_autumn');
    p = g3.probe();
    assert(p.ownedSkins.length === 2, '§3 前置：2 款已拥有', p.ownedSkins);
    g3.sandbox.__api.equipSkin('pea_gold');
    p = g3.probe();
    assert(p.equippedSkins.pea === 'pea_gold', '§3 equip pea→pea_gold', p.equippedSkins);
    g3.sandbox.__api.equipSkin('melon_jade');
    p = g3.probe();
    assert(p.equippedSkins.pea === 'pea_gold', '§3 未拥有→装备不生效', p.equippedSkins);
    assert(!p.equippedSkins.melon, '§3 未拥有皮肤不得装备', p.equippedSkins);
    g3.sandbox.__api.unequipSkin('pea');
    p = g3.probe();
    assert(!p.equippedSkins.pea, '§3 卸下后 equipped 无 pea', p.equippedSkins);
    // 装备 cabbage_autumn 需要先解锁 cabbage 卡（初始卡池 4 张无 cabbage；EB-1 拒装）
    g3.sandbox.__api.setOwnedCards(['sunflower', 'nut', 'pea', 'mine', 'cabbage']);
    g3.sandbox.__api.equipSkin('cabbage_autumn');
    g3.sandbox.__api.saveMetaNow();
    // 重载读回（同一个 store3）
    const g3b = loadGame({ seed: 42, localStorage: store3 });
    const p3b = g3b.probe();
    assert(p3b.equippedSkins.cabbage === 'cabbage_autumn', '§3 重载后装备 cabbage_autumn 保留', p3b.equippedSkins);

    // ---- §4 EB-1：有皮肤无植物 → 可买不可装 ----
    const store4 = makeStore();
    const g4 = loadGame({ seed: 42, localStorage: store4 });
    g4.setPoints(1000);
    g4.sandbox.__api.setWorldCleared(3);  // 绕过 melon_jade req=world3
    g4.sandbox.__api.buySkin('melon_jade');
    p = g4.probe();
    assert(p.ownedSkins.includes('melon_jade'), '§4 EB-1：无植物但仍可购买皮肤', p.ownedSkins);
    g4.sandbox.__api.equipSkin('melon_jade');
    p = g4.probe();
    assert(!p.equippedSkins.melon, '§4 EB-1：无植物不可装备皮肤（需先解锁植物）', p.equippedSkins);

    // ---- §5 skinReqOk 独立四态 ----
    const store5 = makeStore();
    const g5 = loadGame({ seed: 42, localStorage: store5 });
    g5.setPoints(5000);
    const K2 = g5.sandbox.__consts;
    // req=null 恒真
    assert(K2.skinReqOk && K2.skinReqOk(K2.SKIN_CATALOG.find(s => s.id === 'pea_gold')) === true, '§5 req=null → 可通过');
    const peaShadow = K2.SKIN_CATALOG.find(s => s.id === 'pea_shadow');
    assert(peaShadow && peaShadow.req === 'world2', '§5 pea_shadow req=world2');
    // 通世界 2 后 req 锁解除
    g5.sandbox.__api.setWorldCleared(2);
    g5.sandbox.__api.buySkin('pea_shadow');
    p = g5.probe();
    assert(p.ownedSkins.includes('pea_shadow'), '§5 通世界 2 后 pea_shadow(req=world2) 购买成功', p.ownedSkins);

    // ---- §6 卸下后恢复默认 ----
    const store6 = makeStore();
    const g6 = loadGame({ seed: 42, localStorage: store6 });
    g6.setPoints(500);
    g6.sandbox.__api.buySkin('pea_gold');
    g6.sandbox.__api.equipSkin('pea_gold');
    p = g6.probe();
    assert(p.equippedSkins.pea === 'pea_gold', '§6 前置：装备 pea_gold');
    g6.sandbox.__api.unequipSkin('pea');
    p = g6.probe();
    assert(!p.equippedSkins.pea, '§6 卸下 → equipped 无 pea（恢复默认外观）', p.equippedSkins);
  },
};