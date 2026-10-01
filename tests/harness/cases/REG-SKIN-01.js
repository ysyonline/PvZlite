/* REG-SKIN-01 · v2.4.2 P1 皮肤系统：配置表 + 存档读写 + testMode 守卫（GDD v24-coin-shop §2.2）
 * 断言：
 *   §1 配置表自证：SKIN_CATALOG 8 款，字段完整（id/plantType/name/desc/price/tier/req/palette/effect）
 *                    价格 200/250/400/450/500/800；tier 枚举 common/rare/epic；
 *                    req 枚举 null/world2/world3/world4；palette 含颜色键
 *   §2 loadMeta 默认值：旧档无 pvz_skins → ownedSkins=[] equippedSkins={}（EB-2 无感迁移）
 *   §3 读写等价：注入 ownedSkins + equippedSkins → saveMeta → 重载 → 读回位值一致（含 EA-1 脏 equipped 含无效映射过滤）
 *   §4 脏数据容错：非 JSON / null / 非对象 / 未知 skin id → 全部退化到默认值，不抛错
 *   §5 testMode：ownedSkins 全 8 款（内存态注满）+ saveMeta 不写 pvz_skins 键（EB-5）
 *   §6 REG-TESTMODE-01 键清单校验：pvz_skins 应入 KEY_LIST（10→13，本用例旁证不重复跑）
 */
module.exports = {
  id: 'REG-SKIN-01',
  name: 'P1 皮肤系统：SKIN_CATALOG 配置表 + 存档读写 + testMode 守卫（v2.4.2）',
  seed: 42,
  run({ loadGame, assert }) {
    const makeStore = (seedMap) => {
      const m = seedMap ? Object.assign({}, seedMap) : {};
      return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _dump: () => JSON.parse(JSON.stringify(m)) };
    };

    // ---- §1 配置表自证 ----
    const g0 = loadGame({ seed: 42 });
    const K = g0.sandbox.__consts;
    const cat = K.SKIN_CATALOG;
    assert(cat && Array.isArray(cat) && cat.length === 8, '§1 SKIN_CATALOG 应存在且含 8 款皮肤', cat && cat.length);
    const byId = {}; const tiers = {}; const reqs = {};
    cat.forEach(s => {
      byId[s.id] = s;
      tiers[s.tier] = true;
      reqs[s.req] = true;
    });
    // 价格 + 稀有度（GDD §2.2.3）
    assert(byId.pea_gold && byId.pea_gold.price === 200 && byId.pea_gold.tier === 'common', '§1 pea_gold price=200 tier=common', byId.pea_gold);
    assert(byId.pea_shadow && byId.pea_shadow.price === 400 && byId.pea_shadow.tier === 'rare', '§1 pea_shadow price=400 tier=rare');
    assert(byId.sunflower_honey && byId.sunflower_honey.price === 200, '§1 sunflower_honey price=200');
    assert(byId.nut_iron && byId.nut_iron.price === 250, '§1 nut_iron price=250');
    assert(byId.melon_jade && byId.melon_jade.price === 500, '§1 melon_jade price=500');
    assert(byId.cherry_phantom && byId.cherry_phantom.price === 450, '§1 cherry_phantom price=450');
    assert(byId.snowpea_aurora && byId.snowpea_aurora.price === 800 && byId.snowpea_aurora.tier === 'epic', '§1 snowpea_aurora price=800 tier=epic');
    assert(byId.cabbage_autumn && byId.cabbage_autumn.price === 200, '§1 cabbage_autumn price=200');
    // tier 枚举完整性
    assert(tiers.common && tiers.rare && tiers.epic && Object.keys(tiers).length === 3, '§1 tier 枚举={common,rare,epic}', tiers);
    // req 枚举（null + world2/world3/world4）
    assert(reqs.null !== undefined || reqs['null'] !== undefined, '§1 req 含 null（无条件）', reqs);
    assert(reqs.world2 && reqs.world3 && reqs.world4, '§1 req 含 world2/world3/world4', reqs);
    // palette 字段完整性（每款至少含 2 个颜色键）
    cat.forEach(s => {
      const p = s.palette;
      assert(p && typeof p === 'object' && Object.keys(p).length >= 2, '§1 palette 应含 ≥2 颜色键: ' + s.id, p);
    });
    // effect 枚举（null / ghost / snow / leaf）
    const effects = {};
    cat.forEach(s => { effects[s.effect] = true; });
    assert(effects.null && effects.ghost && effects.snow && effects.leaf && Object.keys(effects).length === 4, '§1 effect 枚举={null,ghost,snow,leaf}', effects);
    // plantType 全映射到真实 CARDS（识脸法：本作 20 种植物含全部 7 个皮肤宿主——pea/sunflower/nut/melon/cherry/snowpea/cabbage）
    const PLANT_TYPE_SET = new Set(cat.map(s => s.plantType));
    assert(PLANT_TYPE_SET.size === 7, '§1 皮肤宿主=7 种植物（pea×2+其他 5 款 5 种）', [...PLANT_TYPE_SET]);
    assert(PLANT_TYPE_SET.has('pea') && PLANT_TYPE_SET.has('sunflower') && PLANT_TYPE_SET.has('nut'), '§1 涵盖 pea/sunflower/nut');
    assert(PLANT_TYPE_SET.has('melon') && PLANT_TYPE_SET.has('cherry') && PLANT_TYPE_SET.has('snowpea') && PLANT_TYPE_SET.has('cabbage'), '§1 涵盖 melon/cherry/snowpea/cabbage');

    // ---- §2 loadMeta 默认值（EB-2 无感迁移）----
    const store2 = makeStore();
    const g2 = loadGame({ seed: 42, localStorage: store2 });
    const p2 = g2.probe();
    assert(Array.isArray(p2.ownedSkins) && p2.ownedSkins.length === 0, '§2 旧档无 pvz_skins → ownedSkins=[]', p2.ownedSkins);
    assert(p2.equippedSkins && typeof p2.equippedSkins === 'object' && Object.keys(p2.equippedSkins).length === 0, '§2 旧档无 pvz_skins → equippedSkins={}', p2.equippedSkins);

    // ---- §3 读写等价（注入 → saveMeta → 重载 → 读回）----
    const store3 = makeStore();
    // 预置基础存档（points/slots/cards 必须有，否则 loadMeta 会重置 ownedCards/deck 从而影响皮肤装备验证）
    const baseCards = ['pea', 'sunflower', 'nut', 'melon', 'cherry', 'snowpea', 'cabbage', 'mine'];
    store3.setItem('pvz_points', '5000');
    store3.setItem('pvz_slots', '10');
    store3.setItem('pvz_cards', JSON.stringify(baseCards));
    store3.setItem('pvz_deck', JSON.stringify(baseCards.slice(0, 6)));
    // 预置 pvz_skins：拥有 3 款 + 装备 2 个（pea→pea_gold, nut→nut_iron）
    store3.setItem('pvz_skins', JSON.stringify({
      owned: ['pea_gold', 'nut_iron', 'cabbage_autumn'],
      equipped: { pea: 'pea_gold', nut: 'nut_iron', melon: 'melon_jade' }  // melon_jade 未拥有 → 应被合法性过滤掉
    }));
    const g3 = loadGame({ seed: 42, localStorage: store3 });
    const p3 = g3.probe();
    assert(p3.ownedSkins.includes('pea_gold') && p3.ownedSkins.includes('nut_iron') && p3.ownedSkins.includes('cabbage_autumn'),
      '§3 读回 owned 3 款', p3.ownedSkins);
    assert(p3.ownedSkins.length === 3, '§3 owned 去重后应 =3', p3.ownedSkins.length);
    // equipped：只有 pea_gold / nut_iron 有效（melon_jade 未拥有 → 过滤）
    assert(p3.equippedSkins.pea === 'pea_gold' && p3.equippedSkins.nut === 'nut_iron', '§3 equipped pea/nut 读回', p3.equippedSkins);
    assert(!p3.equippedSkins.melon, '§3 equipped melon_jade 未拥有应被过滤', p3.equippedSkins);
    assert(Object.keys(p3.equippedSkins).length === 2, '§3 equipped 应仅 2 项有效', Object.keys(p3.equippedSkins));
    // 手工注入新装备（sunflower→sunflower_honey），saveMeta 再重载验证等价
    // ★ 通过 __api.setEquippedSkins 直触 VM 内词法变量（sandbox.equippedSkins 不走通——let 不挂 globalThis）
    // ★ 装备合法性要求 skin 已拥有（EB-1），故同步把 sunflower_honey 加进 owned
    g3.sandbox.__api.setOwnedSkins(['pea_gold', 'nut_iron', 'cabbage_autumn', 'sunflower_honey']);
    g3.sandbox.__api.setEquippedSkins({ pea: 'pea_gold', nut: 'nut_iron', sunflower: 'sunflower_honey' });
    const p3b = g3.probe();
    assert(p3b.equippedSkins.sunflower === 'sunflower_honey', '§3 注入 sunflower→sunflower_honey 内存态', p3b.equippedSkins);
    g3.sandbox.__api.saveMetaNow();
    // 重载（共享 store）
    const g3c = loadGame({ seed: 42, localStorage: store3 });
    const p3c = g3c.probe();
    assert(p3c.equippedSkins.sunflower === 'sunflower_honey', '§3 重载后 sunflower→sunflower_honey 保留', p3c.equippedSkins);
    // owned 含新增
    assert(p3c.ownedSkins.length === 4, '§3 重载后 owned =4（+sunflower_honey）', p3c.ownedSkins);

    // ---- §4 脏数据容错 ----
    // 4a: 非 JSON
    const store4a = makeStore();
    store4a.setItem('pvz_skins', 'not-json{');
    const g4a = loadGame({ seed: 42, localStorage: store4a });
    const p4a = g4a.probe();
    assert(p4a.ownedSkins.length === 0 && Object.keys(p4a.equippedSkins).length === 0, '§4a 非 JSON → 默认值');

    // 4b: JSON 但非对象（数组）
    const store4b = makeStore();
    store4b.setItem('pvz_skins', '["owned"]');
    const g4b = loadGame({ seed: 42, localStorage: store4b });
    const p4b = g4b.probe();
    assert(p4b.ownedSkins.length === 0 && Object.keys(p4b.equippedSkins).length === 0, '§4b 数组 JSON → 默认值');

    // 4c: owned 含非法 id
    const store4c = makeStore();
    store4c.setItem('pvz_skins', JSON.stringify({ owned: ['pea_gold', 'fake_skin', 'bogus'], equipped: {} }));
    const g4c = loadGame({ seed: 42, localStorage: store4c });
    const p4c = g4c.probe();
    assert(p4c.ownedSkins.length === 1 && p4c.ownedSkins[0] === 'pea_gold', '§4c 脏 owned → 只留真实 id', p4c.ownedSkins);

    // 4d: equipped 含不存在的植物类型
    const store4d = makeStore({ pvz_cards: JSON.stringify(baseCards) });
    store4d.setItem('pvz_skins', JSON.stringify({ owned: ['pea_gold', 'nut_iron'], equipped: { pea: 'pea_gold', fakeplant: 'bogus' } }));
    const g4d = loadGame({ seed: 42, localStorage: store4d });
    const p4d = g4d.probe();
    assert(p4d.equippedSkins.pea === 'pea_gold', '§4d 合法装备保留', p4d.equippedSkins);
    assert(!p4d.equippedSkins.fakeplant, '§4d 非法植物类型 → 过滤', p4d.equippedSkins);

    // ---- §5 testMode（不可直接在同一个 test 里改 search——loadGame 会重新 eval）----
    const store5 = makeStore();
    store5.setItem('pvz_points', '7777');
    const g5 = loadGame({ seed: 42, search: '?test=1', localStorage: store5 });
    const p5 = g5.probe();
    assert(p5.ownedSkins.length === 8, '§5 testMode ownedSkins 全 8 款（内存态）', p5.ownedSkins);
    assert(Object.keys(p5.equippedSkins).length === 0, '§5 testMode 不自动装备', p5.equippedSkins);
    // 写档零落盘
    g5.sandbox.__api.saveMetaNow();
    const d5 = store5._dump();
    assert(!('pvz_skins' in d5), '§5 testMode saveMeta 不写 pvz_skins（EB-5）', Object.keys(d5));
    assert(d5.pvz_points === '7777', '§5 testMode 积分不变（不写档）', d5.pvz_points);

    // ---- §6 键清单旁证：pvz_skins 应已落盘（§3 共享 store）----
    const d3 = store3._dump();
    assert('pvz_skins' in d3 && d3.pvz_skins.indexOf('sunflower_honey') !== -1, '§6 pvz_skins 落地见证', d3.pvz_skins);
  },
};