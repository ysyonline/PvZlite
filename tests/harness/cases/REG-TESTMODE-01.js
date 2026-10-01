/* REG-TESTMODE-01 · v1.6 第5刀「测试模式全卡池」契约（V16-QA-5 / V16-QA-5b 口径收紧）
 * ------------------------------------------------------------
 * ★ 用户裁决（V16-QA-5b）：「测试模式彻底不写任何存档键」——测试模式为纯沙盒。
 * 被测源码（plants-vs-zombies.html，行号随版本漂移，以 grep 为准）四条写路径均已守卫：
 *   1. saveMeta()        L334-342：函数首行 `if(testMode)return;`（整体守卫，覆盖
 *                        points/slots/cards/deck/clears/diff_clears + v2.4.1 起
 *                        consumables/upgrades 共八键）
 *   2. updateBest()      L366-368：`if(!testMode)storageSet('pvz_highscore',...)`（内存态 highScore 照常刷新）
 *   3. checkWave 通关块  L1912：`if(!testMode)storageSet('pvz_unlocked',...)`（不推进真实解锁进度）
 *   4. 静音按钮 handler  L831：`if(!testMode)storageSet('pvz_muted',...)`（内存态 muted / UI / BGM 不变）
 *   测试模式装载    L343-349：loadMeta 后 `if(testMode){ ownedCards=CARDS 全集; slots=maxSlots; }`（仅内存态）
 * 依赖修复：tests/harness/index.js 已向 vm 沙箱注入 URLSearchParams（V16-QA-5），否则 ?test=1 恒失效。
 *
 * 断言分层（口径收紧后）：
 *   §1 测试模式卡池/槽位：19 种全开（含 melon/corn/snowpea/icemelon/squash/pepper/cherry + v2.3 四蘑菇）+ 槽位拉满 10
 *   §2 ★ 存档隔离（本用例最重要一段）：
 *       2a【零键】空 store + test 模式：通关一局（+静音按钮路径，覆盖全部四条写路径）⇒ store 零键
 *       2b【全键原值】预置完整 10 键真实存档 + test 模式通关 + 静音 ⇒ 全部字节级保持原值
 *       2c【W3 判别性】test 模式通 DIFF_AWARD 难度门槛关（hard:3）⇒ 不落盘 pvz_diff_clears
 *                      （+ 普通模式同场景对照：应落盘且含 hard:3）——证明测试模式不会永久吞掉
 *                       正常模式的发卡机会
 *   §3 反例对照（普通模式，不传 search）：卡池无 melon、槽位 6，通关 + 静音 ⇒ 存档键照常写入
 *       （证明守卫只对测试模式生效，没有把正常路径一起关掉）
 *   §4 布局边界一致性（v2.3.0 U6 起为真断言）：调 __consts.deckGridLayout 做真实几何校验——
 *       自适应容量 ≥ 待选卡数(19)、上排网格底缘严格 < 下排卡槽栏顶缘（不重叠）、下排 10 槽右缘 ≤ CANVAS_W；
 *       + 普通模式(≤15)回归：仍 3 行且卡高不变（视觉不劣化）。
 *
 * 覆盖 updateBest 写入分支的前置：通关前先击杀 1 只普通僵尸（score+50），使 score>highScore 条件成立，
 *   否则 updateBest 内层 storageSet 根本不会被调用，无法验证其守卫。
 *
 * §4 说明（v2.3.0 U6 升级为真断言）：选卡界面走 ctx 绘制，loadGame 的 ctx 桩吞掉所有 draw 调用、
 *   不暴露计数代理 ⇒ 像素级渲染断言不可行。但 v2.3.0 U6 已把上排网格几何抽为纯函数 deckGridLayout(n)
 *   并挂 __consts 桥 ⇒ §4 改为调该函数做「真几何断言」：容量/不重叠用实际几何常量交叉校验，
 *   draw 与 hit 同源同一函数（源码 drawSelectDeck / onClickDeck 均只调它 + deckCardRect），
 *   不再写死 cols=5 / width=150。下方下排仍交叉校验 CARD_X0/CARD_W/CANVAS_W 做防漂移。
 */
module.exports = {
  id: 'REG-TESTMODE-01',
  name: '测试模式：全卡池 21 + 10 槽 + 零写存档守卫（V16 QA-5b 收紧；v2.3.7 池扩 21；v2.4.2 键清单 13）',
  seed: 42,
  run({ loadGame, assert }) {
    // ---- 共享工具 ----
    // v2.4.1 积分商城：saveMeta 增写 pvz_consumables / pvz_upgrades（键清单 10 → 12）
    // v2.4.2 P1 皮肤：saveMeta 增写 pvz_skins（键清单 12 → 13）
    // T-103：解锁进度迁 pvz_progress_v2（旧 pvz_unlocked 只读不写）→ 清单随之平移
    const KEY_LIST = ['pvz_points', 'pvz_slots', 'pvz_cards', 'pvz_deck', 'pvz_clears',
      'pvz_diff_clears', 'pvz_highscore', 'pvz_progress_v2', 'pvz_progress_v3', 'pvz_muted',
      'pvz_consumables', 'pvz_upgrades', 'pvz_skins'];
    function mktStore(seedMap) {
      const m = seedMap ? Object.assign({}, seedMap) : {};
      return {
        m,
        store: { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } },
      };
    }
    // 通关一局（真实路径）：先造一次击杀拿分（覆盖 updateBest 写入分支），再推完波次 + 清场触发通关
    function clearRun(g, opts) {
      opts = opts || {};
      g.setDiff(opts.diff || 'normal');
      g.setLevel(opts.level || 1);
      g.startGame();
      g.forceZombieAt('normal', 2, 400);   // normal 击杀 → score +50（>0）
      g.killAllZombies();
      g.tick(0.02);                        // update 过滤死体
      g.forceWaves(99);                    // 推完所有波（队列已生成）
      g.clearField();                      // 清场 + 清队列
      g.tick(0.05);                        // checkWave 通关分支 → settleRun/saveMeta/发卡/解锁
    }
    // 覆盖静音按钮写路径（点两次：开→关，回到初值，路径被走两遍）
    function toggleMuteTwice(g) {
      const btn = g.sandbox.btns && g.sandbox.btns.mute;
      assert(btn && typeof btn.onclick === 'function', '前置：mute 按钮 handler 应存在');
      const ev = { preventDefault() {} };
      btn.onclick(ev);
      btn.onclick(ev);
    }

    // ================= §1 测试模式卡池 + 槽位 =================
    const g1 = loadGame({ seed: 42, search: '?test=1' });
    const m1 = g1.probeMeta();
    const cardTypes = g1.sandbox.__CARDS.map(c => c.type);
    assert(cardTypes.length === 21, '§1 v2.3.7 池扩 21：卡池应 21 种（15 + 五蘑菇 + gravebuster）', cardTypes.length);
    assert(m1.ownedCards.length === 21, '§1 v2.3.7 池扩 21：测试模式 ownedCards 应 = 21（CARDS 全集）', m1.ownedCards);
    for (const t of ['melon', 'corn', 'snowpea', 'icemelon', 'squash', 'pepper', 'cherry',
      'sunshroom', 'puffshroom', 'fumeshroom', 'hypnoshroom', 'scaredyshroom', 'gravebuster']) {   // v2.3.7 池扩 21：补害羞菇
      assert(m1.ownedCards.includes(t), '§1 测试模式卡池应包含 ' + t, m1.ownedCards);
    }
    assert(m1.ownedCards.join(',') === cardTypes.join(','),
      '§1 ownedCards 应与 CARDS 的顺序/内容完全一致', { owned: m1.ownedCards, cards: cardTypes });
    const sc = g1.sandbox.__consts.SLOT_CONFIG;
    assert(sc && sc.maxSlots === 10, '§1 SLOT_CONFIG.maxSlots 应 = 10', sc && sc.maxSlots);
    assert(m1.slots === 10, '§1 测试模式 slots 应 = 10', m1.slots);
    assert(m1.slots === sc.maxSlots, '§1 slots 应 = SLOT_CONFIG.maxSlots（拉满）', m1.slots);

    // ================= §2a 存档隔离：空 store ⇒ 零键 =================
    const A = mktStore();
    const ga = loadGame({ seed: 42, localStorage: A.store, search: '?test=1' });
    const ma0 = ga.probeMeta();
    assert(ma0.ownedCards.length === 21 && ma0.slots === 10,
      '§2a 前置：测试模式应在装载期临时全开（v2.3.7 池扩 21）', { owned: ma0.ownedCards.length, slots: ma0.slots });
    clearRun(ga, { level: 1 });
    const pa = ga.probe();
    assert(pa.state === 'end' && pa.won === true,
      '§2a 前置：L1 应已通关（结算路径已触发 saveMeta）', { state: pa.state, won: pa.won });
    assert(pa.score > 0,
      '§2a 前置：本局应含击杀得分（>0），以覆盖 updateBest 的写入分支', pa.score);
    toggleMuteTwice(ga);
    // ★ 核心：四条写路径全部被走过，store 必须零键
    assert(Object.keys(A.m).length === 0,
      '§2a 测试模式通关 + 切静音后不得写任何存档键（store 应零键）', A.m);
    for (const k of KEY_LIST) {
      assert(A.store.getItem(k) === null, '§2a ' + k + ' 不应落盘', A.store.getItem(k));
    }

    // ================= §2b 存档隔离：预置完整 10 键 ⇒ 原值不变 =================
    const ORIG = {
      pvz_points: '777',
      pvz_slots: '8',
      pvz_cards: JSON.stringify(['sunflower', 'pea', 'melon']),
      pvz_deck: JSON.stringify(['pea', 'sunflower']),
      pvz_clears: '13',
      pvz_diff_clears: JSON.stringify({ 'hard:3': true }),
      pvz_highscore: '1',           // 低值以让本局 score(50) > highScore ⇒ 覆盖 updateBest 写入分支
      pvz_unlocked: '4',
      pvz_progress_v3: JSON.stringify({v:3,diff:{normal:{cleared:[],unlocked:'1-1'},hard:{cleared:[],unlocked:'1-1'},expert:{cleared:[],unlocked:'1-1'}},cardSeen:[]}),
      pvz_muted: '1',
    };
    const B = mktStore(ORIG);
    const gb = loadGame({ seed: 42, localStorage: B.store, search: '?test=1' });
    const mb0 = gb.probeMeta();
    assert(mb0.ownedCards.length === 21 && mb0.slots === 10,
      '§2b 前置：测试模式应在真实存档之上临时全开（21/10；v2.3.7 池扩 21）', { owned: mb0.ownedCards.length, slots: mb0.slots });
    clearRun(gb, { level: 1 });
    const pb = gb.probe();
    assert(pb.state === 'end' && pb.won === true,
      '§2b 前置：L1 应已通关', { state: pb.state, won: pb.won });
    assert(pb.score > 1,
      '§2b 前置：本局得分应 > 预置 highScore(1)，覆盖 updateBest 写入分支', pb.score);
    toggleMuteTwice(gb);
    // ★ 核心：全键保持原值（预置键字节级不变；ORIG 未预置的键保持缺失——测试模式不得新增）
    for (const k of KEY_LIST) {
      const expected = (k in ORIG) ? ORIG[k] : null;
      assert(B.store.getItem(k) === expected,
        '§2b 真实存档 ' + k + ' 必须保持原值/缺失', { now: B.store.getItem(k), orig: expected });
    }
    // 计数 = 预置键数（ORIG 未预置 consumables/upgrades/skins，test 模式 saveMeta 整体守卫 ⇒ 不得新增）
    assert(Object.keys(B.m).length === Object.keys(ORIG).length,
      '§2b 不应新增/丢失任何键（仍为预置 10 键）', Object.keys(B.m));

    // ================= §2c W3 判别性：测试模式不吞发卡机会 =================
    // 原缺陷：测试模式通 hard:1-6（旧 hard:3，Q-14 锚点键）会把 pvz_diff_clears 标为「已领 corn」，
    // 正常模式重通不再补发。
    const D = mktStore();
    const gc = loadGame({ seed: 42, localStorage: D.store, search: '?test=1' });
    clearRun(gc, { level: 3, diff: 'hard' });   // setLevel(3)→'1-6'；命中 DIFF_AWARD['hard:1-6']='corn' 登记分支
    const pc = gc.probe();
    assert(pc.state === 'end' && pc.won === true,
      '§2c 前置：test 模式应已通 1-6（旧 L3）', { state: pc.state, won: pc.won });
    assert(D.store.getItem('pvz_diff_clears') === null,
      '§2c 测试模式通难度门槛关不得落盘 pvz_diff_clears（否则正常模式重通不再补发）',
      D.store.getItem('pvz_diff_clears'));
    assert(Object.keys(D.m).length === 0, '§2c 测试模式整局后 store 应仍零键', D.m);
    // 对照：同场景普通模式必须落盘且含 hard:1-6（证明该分支真实可达、非空转）
    const E = mktStore();
    const ge = loadGame({ seed: 42, localStorage: E.store });   // 普通模式
    clearRun(ge, { level: 3, diff: 'hard' });
    const pe = ge.probe();
    assert(pe.state === 'end' && pe.won === true, '§2c 对照：普通模式应已通 1-6', { state: pe.state });
    const dcE = E.store.getItem('pvz_diff_clears');
    assert(dcE !== null, '§2c 对照：普通模式通 hard:1-6 应落盘 pvz_diff_clears', dcE);
    assert(JSON.parse(dcE)['hard:1-6'] === true,
      '§2c 对照：落盘记录应含 hard:1-6（Q-14 锚点键；与测试模式零写形成判别）', dcE);

    // ================= §3 反例对照：普通模式守卫不生效（键照常写入） =================
    const C = mktStore();
    const gn = loadGame({ seed: 42, localStorage: C.store });   // 不传 search ⇒ testMode=false
    const mn = gn.probeMeta();
    assert(mn.ownedCards.length === 4, '§3 普通模式卡池应为首启 4 张', mn.ownedCards);
    assert(!mn.ownedCards.includes('melon'), '§3 普通模式不得含未获得卡 melon（测试模式专属）', mn.ownedCards);
    assert(mn.slots === 6, '§3 普通模式槽位应为初始 6', mn.slots);
    clearRun(gn, { level: 1 });
    const pn = gn.probe();
    assert(pn.state === 'end' && pn.won === true, '§3 前置：普通模式 L1 应已通关', { state: pn.state });
    toggleMuteTwice(gn);
    // 守卫只对测试模式生效 ⇒ 普通模式全部 13 键照常写入
    for (const k of KEY_LIST) {
      assert(C.store.getItem(k) !== null, '§3 普通模式 ' + k + ' 应照常写入', C.store.getItem(k));
    }
    assert(Object.keys(C.m).length === KEY_LIST.length,
      '§3 普通模式应恰好 13 键（10 旧键 + v2.4.1 consumables/upgrades + v2.4.2 skins）', Object.keys(C.m));
    // 语义抽样
    assert(C.store.getItem('pvz_slots') === '6', '§3 落盘槽位应 = 6', C.store.getItem('pvz_slots'));
    const cards3 = JSON.parse(C.store.getItem('pvz_cards'));
    assert(cards3.includes('double') && !cards3.includes('melon'),
      '§3 落盘卡池应含通关发的 double、不含 melon', cards3);
    // T-103：解锁进度落 pvz_progress_v2（通关 '1-1' → cleared 含 '1-1'、unlocked 推进 '1-2'）
    const prog3 = JSON.parse(C.store.getItem('pvz_progress_v2'));
    assert(prog3 && prog3.v === 2 && prog3.cleared.indexOf('1-1') >= 0 && prog3.unlocked === '1-2',
      '§3 落盘 v2 进度应含 cleared 1-1 且 unlocked 推进 1-2', prog3);
    assert(C.store.getItem('pvz_unlocked') === null,
      '§3 旧 pvz_unlocked 键不应再写（T-103：只读迁移源，不回写）', C.store.getItem('pvz_unlocked'));
    assert(+C.store.getItem('pvz_highscore') > 0, '§3 落盘最高分应 > 0（本局有击杀）', C.store.getItem('pvz_highscore'));
    assert(['0', '1'].includes(C.store.getItem('pvz_muted')), '§3 落盘静音偏好应为 0/1', C.store.getItem('pvz_muted'));

    // ================= §4 布局边界一致性（v2.3.0 U6：自适应网格真断言） =================
    const K = g1.sandbox.__consts;
    const layout = K.deckGridLayout;                 // ★ 桥接的纯函数（draw/hit 同源几何源）
    const SLOTS = K.DECK_SLOTS;
    assert(typeof layout === 'function', '§4 __consts.deckGridLayout 应挂桥可调用（draw/hit 同源）');
    assert(SLOTS && typeof SLOTS.y0 === 'number', '§4 __consts.DECK_SLOTS 应挂桥（下排卡槽栏几何）');
    const N = m1.ownedCards.length;                  // 20
    const L = layout(N);
    // 4a 自适应容量：cols × rows ≥ 实际待选卡数（旧硬上限 5×3=15 的退化断言已废弃）
    assert(L.cols * L.rows >= N,
      '§4 上排自适应网格容量 ' + (L.cols * L.rows) + ' 应 ≥ 待选卡数 ' + N,
      { cols: L.cols, rows: L.rows, cap: L.cols * L.rows, n: N });
    assert(L.rows >= Math.ceil(N / L.cols),
      '§4 行数应 = ceil(n/cols) 自适应', { rows: L.rows, need: Math.ceil(N / L.cols) });
    // 4b ★ 不重叠：上排网格底缘严格 < 下排卡槽栏顶缘（真实几何常量交叉校验，非写死）
    assert(L.bottom < SLOTS.y0,
      '§4 上排网格底缘应严格 < 下排卡槽栏顶缘（不重叠）',
      { bottom: L.bottom, slotTop: SLOTS.y0 });
    // 4c 卡片尺寸仍可操作（点击热区 ≥ 可操作下限；且不超过原 100）
    assert(L.ch >= 28 && L.ch <= 100,
      '§4 卡高应在 [28,100]（压缩后仍可点击，普通模式不放大）', L.ch);
    // 4d 下排 10 槽右缘 ≤ CANVAS_W（保留断言）
    const edge = SLOTS.x0 + m1.slots * SLOTS.cw;             // 70 + 10×92 = 990
    assert(edge <= K.CANVAS_W,
      '§4 下排 ' + m1.slots + ' 槽卡栏右缘 ' + edge + ' 应 ≤ canvas 宽 ' + K.CANVAS_W + ' 不溢出', edge);
    const barEdge = K.CARD_X0 + m1.slots * K.CARD_W;         // 76 + 10×88 = 956（全桥接常量，防漂移）
    assert(barEdge <= K.CANVAS_W,
      '§4 对局内底栏 ' + m1.slots + ' 槽右缘 ' + barEdge + ' 应 ≤ ' + K.CANVAS_W, barEdge);
    assert(m1.slots <= sc.maxSlots, '§4 slots 不得超过 SLOT_CONFIG.maxSlots', { slots: m1.slots, max: sc.maxSlots });
    // 4e 普通模式回归：≤15 张应仍 3 行、卡高维持 100（视觉不劣化），且底缘不重叠
    const L15 = layout(15);
    assert(L15.rows === 3 && L15.ch === 100,
      '§4 普通模式 ≤15 张应 3 行且卡高维持 100（视觉不劣化）', { rows: L15.rows, ch: L15.ch });
    assert(L15.bottom < SLOTS.y0,
      '§4 普通模式上排底缘也应 < 下排顶缘（不重叠）', { bottom: L15.bottom, slotTop: SLOTS.y0 });
    const L4 = layout(4);
    assert(L4.rows === 1 && L4.ch === 100,
      '§4 普通模式初始 4 张应 1 行且卡高 100', { rows: L4.rows, ch: L4.ch });
    // 4f ★ draw/hit 同源实证（点击类断言）：21 张时点末行卡（index N-1=20）应命中并入 deck。
    //    坐标由桥接 deckCardRect 推导（与源码 draw/hit 同一几何源），此前 15 格硬上限下此行不可命中。
    const rectFn = K.deckCardRect;
    assert(typeof rectFn === 'function', '§4 __consts.deckCardRect 应挂桥可调用');
    const sb1 = g1.sandbox;
    g1.setSlots(10);
    g1.setDeck([]);                                  // 清空待选，便于观察加入
    const R18 = rectFn(L, N - 1);                    // 末张 = 末行末列
    assert(R18.y + R18.h <= L.bottom, '§4 末行卡底缘应 ≤ 网格底缘', { cardBottom: R18.y + R18.h, bottom: L.bottom });
    sb1.onClickDeck(R18.x + R18.w / 2, R18.y + R18.h / 2);
    let dk = g1.probeMeta().deck;
    assert(dk.length === 1 && dk[0] === m1.ownedCards[N - 1],
      '§4 末行卡（index N-1）点击应命中并入 deck（draw/hit 同源实证）',
      { click: [R18.x + R18.w / 2, R18.y + R18.h / 2], rect: R18, deck: dk });
    // 负控：上排底缘下方空档（bottom, slotTop 之间）不得命中上排任何卡
    sb1.onClickDeck(R18.x + R18.w / 2, L.bottom + 4);
    assert(g1.probeMeta().deck.length === 1,
      '§4 空档（上排底缘下方）点击不得误命中上排卡', g1.probeMeta().deck);
  },
};
