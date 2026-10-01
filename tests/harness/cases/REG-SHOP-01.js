/* REG-SHOP-01 · 积分商城 P0：商店框架 + 购买管道 + 存档三新键（v2.4 GDD §2/§3/§4）
 * 断言：
 *   1. 配置表自证：CONSUMABLE_CATALOG 三品价格/上限、UPGRADE_CATALOG 四项价格/前置链
 *   2. loadMeta 默认值：旧档无三新键 → consumables={} upgrades=[] 无感迁移（ED-3）
 *   3. buyUpgrade：扣分 + 激活 + 落盘；前置未满足拒绝（Q-4 阶梯）；积分不足拒绝
 *   4. buyConsumable：扣分 + 数量 +1 + 落盘；持有上限拦截（EC-4 反向）；积分不足拒绝
 *   5. buySlot 商店路径：解锁第 7 槽（600）+ slots 递增（复用既有逻辑零改动）
 *   6. saveMeta 三新键落盘 + loadMeta 回读等价（写入 → 重载 → 读回）
 *   7. onClickShop 路由：页签切换 + Esc 外返回钮回 menu（Q-8）
 *   8. testMode：全键不落盘（ED-2 守卫）
 *   9. ★ v2.4.1 消缺防回归：三页签真渲染无 NaN——drawShop() 执行后 ctx 日志中
 *      fillRect/strokeRect/fillText 的数值参数必须全有限（2026-10-01 真机缺陷：
 *      SHOP_GEOM.CARD 定义键 y 与消费键 y0 错位 → NaN → 三页签商品卡全空白，
 *      无头门控因 ctx 桩吞调用未报错而漏放；本条断言 + drawLog 能力即为堵此洞）
 */
module.exports = {
  id: 'REG-SHOP-01',
  name: '积分商城 P0：配置表 + 购买管道 + 存档三新键（v2.4）',
  seed: 42,
  run({ loadGame, assert }) {
    const mkStore = (function () {
      const m = {};
      return {
        getItem: k => (k in m ? m[k] : null),
        setItem: (k, v) => { m[k] = String(v); },
        _dump: () => JSON.parse(JSON.stringify(m)),
      };
    })();

    // ---- 1) 配置表自证（GDD §2.3.2/§2.4.2 定稿价格）----
    const g0 = loadGame({ seed: 42 });
    const K = g0.sandbox.__consts;
    assert(K.CONSUMABLE_CATALOG && K.CONSUMABLE_CATALOG.sun_pack.price === 50, 'sun_pack 定价 50');
    assert(K.CONSUMABLE_CATALOG.wave_skip.price === 100 && K.CONSUMABLE_CATALOG.wave_skip.max === 5, 'wave_skip 定价 100 / 上限 5');
    assert(K.CONSUMABLE_CATALOG.replay_ticket.price === 80 && K.CONSUMABLE_CATALOG.replay_ticket.max === 99, 'replay_ticket 定价 80 / 上限 99');
    assert(K.CONSUMABLE_CATALOG.sun_pack.usableInBattle === true, 'sun_pack 可对战使用');
    assert(K.CONSUMABLE_CATALOG.replay_ticket.usableInBattle === false, 'replay_ticket 仅选关使用（Q-1）');
    const upg = K.UPGRADE_CATALOG;
    assert(upg.length === 4, 'MVP 四增益');
    const byId = {}; upg.forEach(u => byId[u.id] = u);
    assert(byId.upg_sun_start.price === 500 && byId.upg_sun_bonus.price === 1200, '阳光链定价 500/1200');
    assert(byId.upg_cd_1.price === 800 && byId.upg_cd_2.price === 1500, 'CD 链定价 800/1500');
    assert(byId.upg_sun_bonus.req === 'upg_sun_start' && byId.upg_cd_2.req === 'upg_cd_1', 'Q-4 前置阶梯');
    assert(K.SHOP_BTN && K.SHOP_BTN.w === 240, 'SHOP_BTN 几何常量存在');

    // ---- 2) loadMeta 默认值（ED-3 无感迁移）----
    const g = loadGame({ seed: 42, localStorage: mkStore });
    let p = g.probe();
    assert(Array.isArray(p.upgrades) && p.upgrades.length === 0, '旧档无 pvz_upgrades → upgrades=[]', p.upgrades);
    assert(p.consumables && Object.keys(p.consumables).length === 0, '旧档无 pvz_consumables → {}', p.consumables);

    // ---- 3) buyUpgrade：前置 + 扣分 + 激活 ----
    g.setPoints(1000);
    // 前置未满足：直接买 upg_sun_bonus（req=upg_sun_start）应被拒
    g.sandbox.__api.buyUpgrade('upg_sun_bonus');
    p = g.probe();
    assert(p.upgrades.length === 0, '前置未满足 → 不激活（Q-4）', p.upgrades);
    assert(p.points === 1000, '前置拒绝不扣分', p.points);
    // 正常买 upg_sun_start
    g.sandbox.__api.buyUpgrade('upg_sun_start');
    p = g.probe();
    assert(p.upgrades.includes('upg_sun_start'), 'upg_sun_start 激活');
    assert(p.points === 500, '扣 500 分', p.points);
    // 重复购买拒绝
    g.sandbox.__api.buyUpgrade('upg_sun_start');
    p = g.probe();
    assert(p.upgrades.length === 1 && p.points === 500, '重复购买拒绝（不扣分）');
    // 买前置后再买 upg_sun_bonus：1000-500=500 < 1200 → 积分不足拒绝
    g.sandbox.__api.buyUpgrade('upg_sun_bonus');
    p = g.probe();
    assert(!p.upgrades.includes('upg_sun_bonus') && p.points === 500, '积分不足拒绝（EA-1）');

    // ---- 4) buyConsumable：扣分 + 数量 + 上限 ----
    g.setPoints(300);
    g.sandbox.__api.buyConsumable('sun_pack');
    p = g.probe();
    assert(p.consumables.sun_pack === 1 && p.points === 250, '买 1 sun_pack → ×1 / -50', { c: p.consumables, pt: p.points });
    g.setConsumables({ sun_pack: 10 });   // 直接注满（跳过 10 连买）
    g.setPoints(100);
    g.sandbox.__api.buyConsumable('sun_pack');
    p = g.probe();
    assert(p.consumables.sun_pack === 10 && p.points === 100, '持有=max 拒买（不扣分）', p.consumables);

    // ---- 5) buySlot 商店路径（复用既有逻辑）----
    g.setPoints(600);
    const slots0 = g.probe().slots;
    assert(slots0 === 6, '默认 6 槽');
    g.buySlot();
    p = g.probe();
    assert(p.slots === 7 && p.points === 0, 'buySlot → 第 7 槽 / 扣 600', { s: p.slots, pt: p.points });

    // ---- 6) 落盘 + 回读等价 ----
    g.setPoints(999);
    g.setConsumables({ sun_pack: 3, wave_skip: 1 });
    g.setUpgrades(['upg_sun_start', 'upg_cd_1']);
    g.saveMetaNow();
    const dumped = mkStore._dump();
    assert(dumped.pvz_consumables === JSON.stringify({ sun_pack: 3, wave_skip: 1 }), 'pvz_consumables 落盘', dumped.pvz_consumables);
    assert(dumped.pvz_upgrades === JSON.stringify(['upg_sun_start', 'upg_cd_1']), 'pvz_upgrades 落盘', dumped.pvz_upgrades);
    assert(JSON.parse(dumped.pvz_points) === 999, 'pvz_points 落盘');
    // 重载读回（共享 store）
    const g2 = loadGame({ seed: 42, localStorage: mkStore });
    const p2 = g2.probe();
    assert(p2.consumables.sun_pack === 3 && p2.consumables.wave_skip === 1, '重载 → 消耗品读回等价', p2.consumables);
    assert(p2.upgrades.join(',') === 'upg_sun_start,upg_cd_1', '重载 → 增益读回等价', p2.upgrades);
    assert(p2.points === 999, '重载 → 积分读回等价', p2.points);
    assert(p2.slots === 7, '重载 → 槽位读回等价', p2.slots);

    // ---- 7) onClickShop 路由 + 返回钮 ----
    g2.setStateMenu('shop-test');
    const SB = K.SHOP_BTN;
    g2.clickAt(SB.x + SB.w / 2, SB.y + SB.h / 2);   // 主菜单商店钮
    assert(g2.probe().state === 'shop', '点商店钮 → state=shop', g2.probe().state);
    assert(g2.probe().shopTab === 'upgrades', '进商店页签缺省=upgrades');
    const T = K.SHOP_GEOM.TAB;
    g2.clickAt(T.x0 + 1 * (T.w + T.gap) + T.w / 2, T.y + T.h / 2);   // 第 2 页签=消耗品
    assert(g2.probe().shopTab === 'consumables', '页签切换 → consumables', g2.probe().shopTab);
    const B = K.SHOP_GEOM.BACK;
    g2.clickAt(B.x + B.w / 2, B.y + B.h / 2);   // 返回主菜单（Q-8）
    assert(g2.probe().state === 'menu', '返回钮 → state=menu（Q-8）', g2.probe().state);

    // ---- 8) testMode：内存态注满 + 不落盘（ED-2）----
    const gm = loadGame({ seed: 42, search: '?test=1', localStorage: mkStore });
    const pm = gm.probe();
    assert(pm.upgrades.length === 4, 'testMode 增益全激活（内存态）', pm.upgrades);
    assert(pm.consumables.sun_pack === 10, 'testMode 消耗品注满（内存态）');
    gm.setPoints(12345);
    gm.saveMetaNow();
    const dumped2 = mkStore._dump();
    assert(JSON.parse(dumped2.pvz_points) === 999, 'testMode saveMeta 不落盘（积分仍是主档 999）', dumped2.pvz_points);

    // ---- 9) ★ v2.4.1 消缺防回归：三页签渲染无 NaN（几何键错位类缺陷）----
    // 背景：SHOP_GEOM.CARD 曾定义 y 键而消费侧读 y0 → undefined → NaN → 商品卡整页空白。
    // 手法：驱动真实 render()（推 RAF 帧），逐页签检查绘制日志中数值参数全有限。
    const DL = g2.sandbox.__drawLog;
    assert(Array.isArray(DL), '§9 __drawLog 应挂桥（harness 诊断能力）');
    // 静态自证：SHOP_GEOM.CARD 键位完整性（x0/y0 成对；防未来重构再错位）
    const CD = K.SHOP_GEOM.CARD;
    assert(typeof CD.x0 === 'number' && typeof CD.y0 === 'number',
      '§9 SHOP_GEOM.CARD 应含 x0/y0 数值键（消费侧 G.CARD.y0/x0）', CD);
    // 动态自证：重进商店，遍历三页签各真实渲染，日志不得含非有限数值
    const rr = g2.__renderRaw;
    assert(typeof rr === 'function', '§9 __renderRaw 应挂桥（无头真帧渲染）');
    g2.setStateMenu('shop-nan-test');
    g2.clickAt(SB.x + SB.w / 2, SB.y + SB.h / 2);   // → shop
    assert(g2.probe().state === 'shop', '§9 前置：进入商店');
    const DL0 = DL.length;   // 基线：此前累计日志长度（增量检查用）
    const tabs = ['upgrades', 'consumables', 'slots'];
    for (let idx = 0; idx < tabs.length; idx++) {
      // 切页签（第 idx 个页签中心）
      g2.clickAt(T.x0 + idx * (T.w + T.gap) + T.w / 2, T.y + T.h / 2);
      assert(g2.probe().shopTab === tabs[idx], '§9 切到页签 ' + tabs[idx], g2.probe().shopTab);
      rr();   // 真帧渲染当前页签
    }
    const since = DL.slice(DL0);
    assert(since.length > 0, '§9 商店页应产生绘制调用（日志非空）', since.length);
    const badCalls = since.filter(c => c.slice(1).some(v => typeof v === 'number' && !Number.isFinite(v)));
    assert(badCalls.length === 0,
      '§9 三页签绘制参数必须全有限（NaN/undefined → 商品卡空白，2026-10-01 真机缺陷回归锁）',
      badCalls.slice(0, 3));
    // 卡底真实绘制自证：三页签各自应至少画出 3 张商品卡底（fillRect x,y,240,170——日志格式 [method,x,y,w,h]）
    const cardFills = since.filter(c => c[0] === 'fillRect' && c[3] === 240 && c[4] === 170);
    assert(cardFills.length >= 9,
      '§9 三页签累计应 ≥9 次商品卡底 fillRect(240×170)（3 页签 × ≥3 卡）', cardFills.length);
  },
};
