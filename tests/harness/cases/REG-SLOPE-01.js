/* REG-SLOPE-01 · L5 屋顶 C2 坡面几何契约（L1–L4 逐字节恒等 + L5 全 45 格往返 + lift 单调/平台恒定）· 2026-09-19 V13-M4
 * 依据：production/v13-m4-c2-5col-impl-spec.md §1.3（gridToPos/posToGrid 闭式互逆）、
 *       docs/architecture/ADR-005-roof-5col-continuous-slope.md、tests/v13-m4-slope-acceptance.md §2.1。
 *   - Part A：L1–L4 非 roof ⇒ liftX 恒 0 ⇒ gridToPos/posToGrid 与平面公式逐字节 `===`（无容差）。
 *   - Part B：L5 全 45 格网格往返精确（含 col4 斜坡末列 / col5 平台首列判别）。
 *   - Part C：liftX 单调非降 + 平台段恒定 + 越界 clamp（H-无关：只验形状，不锁 H=60）。
 * ★ 判别性硬指标（自检见 production/v13-m4-impl-report.md）：去掉 posToGrid 的 `+liftX` ⇒ Part B 必红
 *   （col4：y=286 会被反解成 row1；col5/col6 同理）。若去掉仍绿 ⇒ 用例无效，须换采样列。
 * 通过 sandbox 直取游戏顶层 function（gridToPos/posToGrid/liftX 为脚本顶层声明，挂在 vm global 上）。
 */
module.exports = {
  id: 'REG-SLOPE-01',
  name: 'L5 屋顶 C2 坡面几何契约（L1–L4 恒等 + L5 全 45 格往返 + lift 单调/平台恒定）',
  seed: 42,
  run({ game: g, assert }) {
    const S = g.sandbox;
    const { GRID_X, GRID_Y, CELL_W, CELL_H, COLS, ROWS } = S.__consts;
    const gp = S.gridToPos, pg = S.posToGrid, lf = S.liftX;
    assert(typeof gp === 'function' && typeof pg === 'function' && typeof lf === 'function',
      'REG-SLOPE-01 前置：sandbox 应可直取 gridToPos/posToGrid/liftX', [typeof gp, typeof pg, typeof lf]);

    // ---- Part A：L1–L4 逐字节 === 恒等（非 roof ⇒ liftX≡0 ⇒ 平面公式原样）----
    for (const n of [1, 2, 3, 4]) {
      g.setLevel(n);
      assert(lf(GRID_X) === 0 && lf(GRID_X + 2 * CELL_W) === 0 && lf(GRID_X + COLS * CELL_W) === 0,
        'A：L' + n + ' 非 roof 关 liftX 应恒 ===0', [lf(GRID_X), lf(GRID_X + 2 * CELL_W), lf(GRID_X + COLS * CELL_W)]);
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const fx = GRID_X + c * CELL_W + CELL_W / 2;
        const fy = GRID_Y + r * CELL_H + CELL_H / 2;
        const pos = gp(c, r);
        assert(pos.x === fx && pos.y === fy,
          'A：L' + n + ' gridToPos(' + c + ',' + r + ') 应逐字节 == 平面公式', [pos, { x: fx, y: fy }]);
        const back = pg(fx, fy);
        assert(back.x === c && back.y === r,
          'A：L' + n + ' posToGrid 平面反解应 == (' + c + ',' + r + ')', back);
      }
    }

    // ---- Part B：L5 全 45 格往返精确（含 col4/col5 判别列）----
    g.setLevel(5);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const pos = gp(c, r);
      const back = pg(pos.x, pos.y);
      assert(back.x === c && back.y === r,
        'B：L5 gridToPos↔posToGrid 往返应精确 == (' + c + ',' + r + ')', [pos, back]);
    }
    // 判别列 col4（斜坡末列）vs col5（平台首列）：抬升量应不同（否则说明斜坡未生效或平台未封顶）
    assert(lf(gp(4, 2).x) < lf(gp(5, 2).x),
      'B：判别列 lift 应满足 col4（斜坡）< col5（平台）', [lf(gp(4, 2).x), lf(gp(5, 2).x)]);
    // 平台段（col5–8）：抬升量恒定
    assert(Math.abs(lf(gp(5, 2).x) - lf(gp(8, 2).x)) < 1e-9,
      'B：平台列 col5–col8 lift 应恒定', [lf(gp(5, 2).x), lf(gp(8, 2).x)]);

    // ---- Part C：liftX 单调非降 / 平台恒定 / 越界 clamp（H-无关）----
    const xs = [];
    for (let x = GRID_X; x <= GRID_X + COLS * CELL_W; x += 5) xs.push(x);
    for (let i = 1; i < xs.length; i++) {
      assert(lf(xs[i]) >= lf(xs[i - 1]),
        'C：liftX 应单调非降', { xPrev: xs[i - 1], yPrev: lf(xs[i - 1]), x: xs[i], y: lf(xs[i]) });
    }
    assert(lf(GRID_X) === 0, 'C：liftX(GRID_X) 应 ===0', lf(GRID_X));
    const xPlat = GRID_X + 5 * CELL_W;                     // 平台首列边界 x=505
    assert(lf(xPlat) > 0, 'C：平台升量应 >0', lf(xPlat));
    for (let x = xPlat; x <= GRID_X + COLS * CELL_W; x += 7) {
      assert(Math.abs(lf(x) - lf(xPlat)) < 1e-9, 'C：平台段 liftX 应恒定', [x, lf(x), lf(xPlat)]);
    }
    assert(lf(GRID_X - 50) === 0 && Math.abs(lf(GRID_X + COLS * CELL_W + 50) - lf(xPlat)) < 1e-9,
      'C：越界 clamp（左侧回 0 / 右侧封顶）', [lf(GRID_X - 50), lf(GRID_X + COLS * CELL_W + 50), lf(xPlat)]);
  },
};
