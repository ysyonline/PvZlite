/* REG-GRIDLOCK-01 · v1.8 溅射同格锁契约（cabbage/corn）· 2026-09-22 V18-Q2
 * ============================================================================
 * 契约（v1.8-decisions.md「关键契约断言」）：
 *   · 卷心菜/玉米：溅射仅限落点同一格（行[已有]+列新增 splashGrid 锁）；同格溅到数值不变（菜8/玉6）。
 *   · 同排但相邻格的僵尸（即使距离 <30px）必须 0 伤 ← 新规则核心断言。
 *   · 邻排（上下排）僵尸必须 0 伤（行隔离，本契约首次显式断言）。
 *   · 西瓜/冰瓜：同排跨格僵尸（55px 带内）照常掉血 35.75（锁「西瓜溅更宽」分级差异）。
 *   · 溅射不定身口径不变（同格溅及者 freezeT===0）。
 *   · 格边边界：僵尸摆格边 ±2px 内侧/外侧，溅与不溅严格按 colOf 分界。
 *   · 注入式老弹体（无 splashGrid 字段）走旧带状几何，行为不变（向后兼容）。
 *
 * 可复现姿势（确定性，零真机）：harness loadGame 沙箱注入弹体+僵尸，单帧 __updateRaw 结算。
 *   colOf(x) = Math.floor((x-GRID_X)/CELL_W)，GRID_X=55 / CELL_W=90。
 *   落点锚定 pr.x=400 ∈ col3=[325,415)；同格 B=390；邻格 C=425(col4)/500(col5)；格边=415/416。
 *   直中框 |z.x-pr.x|<42 保证 A@415 先结算并 break（z.hp-=dmg 后弹体即亡）。
 * 断言：§1 cabbage 同格溅 8 + 不定身；§2 corn 同格溅 6 + 不定身；
 *       §3 同排邻格 0 伤（|Δx|=25<30 旧带内）；§4 邻排 0 伤；
 *       §5 melon/icemelon 跨格 35.75 + 溅及减速；§6 格边边界 ±2px（spd=0 静态僵尸）；
 *       §7 注入式无 splashGrid 老弹体走旧带状（向后兼容）；§8 splashGrid 字段存在性（发射侧标记）。
 * 判别力：v1.8 同格锁在旧源（c379872 带状几何）上 §1/§2/§3/§6 必红——B/C 摆位按旧带必溅。
 * ============================================================================
 */
module.exports = {
  id: 'REG-GRIDLOCK-01',
  name: 'v1.8 溅射同格锁：cabbage/corn 仅落点同格溅（邻格0/邻排0/格边分界）· melon 跨格照溅 · 老弹体兼容',
  seed: 42,
  run({ game: g, assert }) {
    const S = g.sandbox;
    const K = S.__consts;
    const GRID_X = K.GRID_X, CELL_W = K.CELL_W, GRID_Y = K.GRID_Y, CELL_H = K.CELL_H;
    const colOf = (x) => Math.floor((x - GRID_X) / CELL_W);
    const rowFlatY = (row) => GRID_Y + row * CELL_H + CELL_H / 2;

    const mkZ = (row, x, hp) => ({
      type: 'normal', row, hp, maxHp: hp, spd: 0, x,
      eating: false, eatAnim: 0, walk: 0, dead: false,
    });
    // 受控结算：弹体摆 (400, row 平面)，僵尸全 spd=0，单帧极小 dt（弹体 vx 位移可忽略）
    const settle = (row, zList, pr) => {
      g.startGame('gridlock');
      g.setSun(9999);
      g.setLevel(1);
      S.__zombies.length = 0;
      S.__projectiles.length = 0;
      for (const z of zList) S.__zombies.push(z);
      pr.x = 400; pr.y = rowFlatY(row); pr.row = row; pr.dead = false;
      S.__projectiles.push(pr);
      g.__updateRaw(0.0001);
      return zList.map((z) => 1000 - z.hp);   // 各僵尸掉血量（初始 hp=1000）
    };
    const mkPr = (type, dmg, splash, extra) => Object.assign(
      { x: 400, y: 0, vx: 220, dmg, row: 0, type, splash, dead: false }, extra || {});

    // ---- §0 前置：常量自证（摆位推导依赖） ----
    assert(GRID_X === 55 && CELL_W === 90, '§0 前置：GRID_X=55 / CELL_W=90（摆位几何依赖）', { GRID_X, CELL_W });
    assert(colOf(400) === 3 && colOf(390) === 3 && colOf(425) === 4,
      '§0 前置：落点 400∈col3 · B@390 同格 · C@425 邻格', { c400: colOf(400), c390: colOf(390), c425: colOf(425) });

    // ---- §1 cabbage 同格溅 8（20×0.40）+ 溅射不定身 ----
    {
      const A = mkZ(2, 415, 1000), B = mkZ(2, 390, 1000);
      const lost = settle(2, [A, B], mkPr('cabbage', 20, 30, { splashRatio: 0.40, splashGrid: true }));
      assert(Math.abs(lost[0] - 20) < 1e-9, '§1 前置：A@415 直中掉 20', lost[0]);
      assert(Math.abs(lost[1] - 8) < 1e-9,
        '§1：cabbage 同格溅射 = 8（20×0.40，B@390 与落点 400 同格 col3）', lost[1]);
      assert(!(B.freezeT > 0), '§1b：同格溅及者 B.freezeT===0（溅射不定身口径不变）', B.freezeT);
    }

    // ---- §2 corn 同格溅 6（15×0.40）+ 不定身 ----
    {
      const A = mkZ(2, 415, 1000), B = mkZ(2, 390, 1000);
      const lost = settle(2, [A, B], mkPr('corn', 15, 30, { splashRatio: 0.40, splashGrid: true }));
      assert(Math.abs(lost[0] - 15) < 1e-9, '§2 前置：A@415 直中掉 15', lost[0]);
      assert(Math.abs(lost[1] - 6) < 1e-9,
        '§2：corn 同格溅射 = 6（15×0.40，同格 col3）', lost[1]);
      assert(!(B.freezeT > 0), '§2b：同格溅及者 B.freezeT===0（溅射不定身）', B.freezeT);
    }

    // ---- §3 ★ 同排邻格 0 伤（|Δx|=25<30 旧带内 ⇒ 旧规则必溅 8，新规则必须 0）----
    {
      const A = mkZ(2, 415, 1000), C = mkZ(2, 425, 1000), C2 = mkZ(2, 500, 1000);
      const lost = settle(2, [A, C, C2], mkPr('cabbage', 20, 30, { splashRatio: 0.40, splashGrid: true }));
      assert(Math.abs(lost[0] - 20) < 1e-9, '§3 前置：A@415 直中掉 20', lost[0]);
      assert(lost[1] === 0,
        '§3 ★核心：C@425 同排邻格（col4，|Δx|=25<30 旧带内）必须 0 伤（同格锁）', lost[1]);
      assert(lost[2] === 0, '§3b：C2@500 更远邻格（col5）0 伤', lost[2]);
    }

    // ---- §4 邻排 0 伤（上下排僵尸不被溅及，行隔离首次显式断言）----
    {
      const A = mkZ(2, 415, 1000), U = mkZ(1, 400, 1000), D = mkZ(3, 400, 1000);
      const lost = settle(2, [A, U, D], mkPr('cabbage', 20, 30, { splashRatio: 0.40, splashGrid: true }));
      assert(Math.abs(lost[0] - 20) < 1e-9, '§4 前置：A@415 直中掉 20', lost[0]);
      assert(lost[1] === 0, '§4a：上排（row1）僵尸@同列 0 伤（行隔离）', lost[1]);
      assert(lost[2] === 0, '§4b：下排（row3）僵尸@同列 0 伤（行隔离）', lost[2]);
    }

    // ---- §5 melon/icemelon 无锁跨格照溅 35.75（分级差异锚点）+ 溅及减速 ----
    {
      const A = mkZ(2, 415, 1000), B = mkZ(2, 440, 1000);
      const lost = settle(2, [A, B], mkPr('melon', 65, 55, { splashRatio: 0.55 }));
      assert(Math.abs(lost[0] - 65) < 1e-9, '§5 前置：melon A@415 直中掉 65', lost[0]);
      assert(Math.abs(lost[1] - 35.75) < 1e-9,
        '§5：melon 跨格（B@440∈col4，|Δx|=40<55 带）照溅 35.75=65×0.55（西瓜溅更宽）', lost[1]);
      assert(!(A.splashGrid || false), '§5b：melon 弹体不得带 splashGrid 字段（分级标记）', A.splashGrid);
      const U = mkZ(2, 415, 1000), B2 = mkZ(2, 440, 1000);
      const lost2 = settle(2, [U, B2], mkPr('icemelon', 65, 55, { splashRatio: 0.55, chill: true }));
      assert(Math.abs(lost2[1] - 35.75) < 1e-9, '§5c：icemelon 跨格照溅 35.75', lost2[1]);
      assert(B2.slowT >= 1.9, '§5d：icemelon 溅及邻体减速（slowT≈2.0）', B2.slowT);
    }

    // ---- §6 格边边界（僵尸 spd=0 摆格边 ±2px 内/外侧）----
    //   col3=[325,415) col4=[415,505)：413/414 同格应溅，416/417 邻格不得溅。
    {
      const inner = mkZ(2, 413, 1000), edgeIn = mkZ(2, 414, 1000),
            edgeOut = mkZ(2, 416, 1000), outer = mkZ(2, 417, 1000);
      const A = mkZ(2, 415, 1000);   // 直中锚（先结算 break）
      // 分三臂：413+414 内侧臂 / 416+417 外侧臂（A@415 固定直中锚）
      const l1 = settle(2, [mkZ(2, 415, 1000), inner], mkPr('cabbage', 20, 30, { splashRatio: 0.40, splashGrid: true }));
      assert(Math.abs(l1[1] - 8) < 1e-9, '§6a：x=413（格边内侧 2px，col3）同格溅 8', l1[1]);
      const l2 = settle(2, [mkZ(2, 415, 1000), edgeIn], mkPr('cabbage', 20, 30, { splashRatio: 0.40, splashGrid: true }));
      assert(Math.abs(l2[1] - 8) < 1e-9, '§6b：x=414（格边内侧 1px，col3）同格溅 8', l2[1]);
      const l3 = settle(2, [mkZ(2, 415, 1000), edgeOut], mkPr('cabbage', 20, 30, { splashRatio: 0.40, splashGrid: true }));
      assert(l3[1] === 0, '§6c ★：x=416（格边外侧 1px，col4）必须 0 伤（colOf 硬分界）', l3[1]);
      const l4 = settle(2, [mkZ(2, 415, 1000), outer], mkPr('cabbage', 20, 30, { splashRatio: 0.40, splashGrid: true }));
      assert(l4[1] === 0, '§6d：x=417（格边外侧 2px）0 伤', l4[1]);
    }

    // ---- §7 向后兼容：注入式老弹体（无 splashGrid）走旧带状几何 ----
    //   无 splashGrid ⇒ 走 |Δx|<splash 带：跨格 |Δx|=25（425 vs 400）应溅 8。
    //   （工程内不存在此路径——四类投手发射均带/不带 splashGrid 由类型定；此节锁「字段缺失兜底=旧行为」。）
    {
      const A = mkZ(2, 415, 1000), C = mkZ(2, 425, 1000);
      const lost = settle(2, [A, C], mkPr('cabbage', 20, 30, { splashRatio: 0.40 }));
      assert(Math.abs(lost[0] - 20) < 1e-9, '§7 前置：老弹体 A@415 直中掉 20', lost[0]);
      assert(Math.abs(lost[1] - 8) < 1e-9,
        '§7：无 splashGrid 老弹体跨格 |Δx|=25 照溅 8（旧带状兜底，向后兼容）', lost[1]);
    }

    // ---- §8 发射侧：cabbage/corn 真实开火弹体带 splashGrid；melon/icemelon 不带 ----
    {
      for (const th of [
        { card: 8, type: 'cabbage' }, { card: 9, type: 'corn' },
      ]) {
        g.startGame(); g.setSun(9999);
        g.selectCard(th.card); g.clickGrid(0, 0);
        S.__zombies.push(mkZ(0, 800, 999999));
        g.__updateRaw(0.05);
        const pr = S.__projectiles.find((p) => p.type === th.type);
        assert(pr, '§8 前置：' + th.type + ' 真实开火应产生弹体', S.__projectiles.map((p) => p.type));
        assert(pr.splashGrid === true, '§8：' + th.type + ' 真实弹体应带 splashGrid=true（同格锁标记）', pr.splashGrid);
      }
      for (const th of [
        { card: 5, type: 'melon' }, { card: 11, type: 'icemelon' },
      ]) {
        g.startGame(); g.setSun(9999);
        g.selectCard(th.card); g.clickGrid(0, 0);
        S.__zombies.push(mkZ(0, 800, 999999));
        g.__updateRaw(0.05);
        const pr = S.__projectiles.find((p) => p.type === th.type);
        assert(pr, '§8 前置：' + th.type + ' 真实开火应产生弹体', S.__projectiles.map((p) => p.type));
        assert(!pr.splashGrid, '§8：' + th.type + ' 真实弹体不得带 splashGrid（走旧带状）', pr.splashGrid);
      }
    }
  },
};
