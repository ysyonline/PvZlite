/* REG-PLANT-06 · canPlant 规则表重构锁定（2026-09-20 code-review-todo P1-A）
 * 背景：onClick 内 6 条种植校验 if 链收拢为纯函数 canPlant（规则数组化，双向约束同处）。
 *   历史上睡莲（a08788c）与花盆两起越界 bug 都是这条链漏写逆向约束；重构最大风险是
 *   「规则表顺序 ≠ 行为」——某条被挪动后拒绝语义漂移（如 L5 种睡莲报「先放花盆」而非「水轴」）。
 * 断言策略：toast 文案经 sb.toast 覆盖捕获（顶层 function 声明挂 vm globalThis，可写），
 *   直接锁每条规则的拒绝语义 + 顺序；伴随断言零副作用（sun/cd/selected 不变）。
 *   放行路径走真实点击（垫上/盆上连种）。
 * 断言清单：
 *   1. 顺序锁：L5 屋顶空格点睡莲 → '睡莲只能种在水里'（水轴先于盆校验，v1.3 定案语义）
 *   2. 睡莲双向：L1 陆地拒 / L4 水行放行 / L4 陆行拒 / L5 盆上拒
 *   3. 花盆双向：L1 陆地拒（'花盆只能放屋顶'）/ L4 水域拒 / L5 放行 / L5 盆上放盆拒（占用）
 *   4. 屋顶需盆：L5 空格点豌豆 → '先放花盆'
 *   5. 水格需垫：L4 水行无垫点豌豆 → '水格需要先铺睡莲'
 *   6. 占用：L1 普通格重种 → '这格已经有植物了'（垫/盆不算占用的连种放行由 SMOKE-025 T16④ / SMOKE-027 T16④ 锁）
 *   7. 拒绝零副作用：sun/cd/selected 三不变（扣款前拦截）
 * 坑位备忘：
 *   - toast 捕获须在每次断言前清空；SFX.deny 也一并覆盖计数（可选）
 *   - 用例内不推进 update → cardCD 不衰减，同卡二次种植会被拒（跨段换卡或 setLevel+startGame 重置）
 */
module.exports = {
  id: 'REG-PLANT-06',
  name: 'canPlant 规则表：顺序语义 + 双向约束 + 零副作用（P1-A 重构锁定）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    const sb = g.sandbox;

    // ---- toast 捕获桩（顶层 function 声明挂 vm globalThis，直接覆盖）----
    const toasts = [];
    sb.toast = function (msg) { toasts.push(msg); };
    const lastToast = () => toasts[toasts.length - 1];
    const clearToasts = () => { toasts.length = 0; };

    const rejectCase = (level, cardIdx, col, row, wantMsg, label) => {
      g.setLevel(level);
      g.startGame();
      g.setSun(999);
      clearToasts();
      g.selectCard(cardIdx);
      g.clickGrid(col, row);
      const p = g.probe();
      assert(lastToast() === wantMsg, label + '：拒绝文案应为「' + wantMsg + '」', lastToast());
      const allCdZero = Object.keys(p.cardCD).every(function (k) { return !(p.cardCD[k] > 0); });
      assert(p.sun === 999 && allCdZero && p.selected && p.plants === 0,
        label + '：零副作用（sun/CD/selected 不变，未种植）',
        { sun: p.sun, cd: p.cardCD, sel: p.selected, plants: p.plants });
    };

    // ---- 1) 顺序锁（重构最易破项）：L5 屋顶空格点睡莲，水轴语义优先于盆校验 ----
    rejectCase(5, 6, 4, 2, '睡莲只能种在水里', '顺序锁 L5 空格种睡莲');

    // ---- 2) 睡莲双向约束 ----
    rejectCase(1, 6, 4, 2, '睡莲只能种在水里', 'L1 陆地拒睡莲');
    rejectCase(4, 6, 4, 0, '睡莲只能种在水里', 'L4 陆行拒睡莲');   // 行 0 非水行
    rejectCase(5, 6, 4, 1, '睡莲只能种在水里', 'L5 盆上有无皆拒睡莲');

    // ---- 3) 花盆双向约束 ----
    rejectCase(1, 7, 4, 2, '花盆只能放屋顶', 'L1 陆地拒花盆');
    rejectCase(4, 7, 4, 0, '花盆只能放屋顶', 'L4 水域拒花盆');

    // ---- 4) 屋顶需盆 ----
    rejectCase(5, 1, 4, 2, '先放花盆', 'L5 无盆种豌豆');

    // ---- 5) 水格需垫 ----
    rejectCase(4, 1, 4, 1, '水格需要先铺睡莲', 'L4 水格无垫种豌豆');

    // ---- 6) 占用（普通格重种；垫/盆连种放行由 SMOKE-025/027 T16④ 锁，此处不重复）----
    g.setLevel(1); g.startGame(); g.setSun(999);
    g.selectCard(0); g.clickGrid(2, 2);          // 向日葵占格成功：999-50=949
    let p = g.probe();
    assert(p.plants === 1 && p.sun === 949, '占位前置：向日葵应已落格（sun 949）',
      { plants: p.plants, sun: p.sun });
    clearToasts();
    g.selectCard(1);                              // 换豌豆（避开向日葵 CD）
    g.clickGrid(2, 2);
    p = g.probe();
    assert(lastToast() === '这格已经有植物了', '占用拒绝文案应为「这格已经有植物了」', lastToast());
    assert(p.sun === 949 && p.plants === 1, '占用拒绝零副作用（豌豆 100 未扣，sun 仍 949）',
      { sun: p.sun, plants: p.plants });
    assert(Object.keys(p.cardCD).every(function (k) { return !(p.cardCD[k] > 0) || k === 'sunflower'; }),
      '占用拒绝不进新卡 CD（仅首株向日葵 CD 可非零）', p.cardCD);

    // ---- 7) 放行路径抽检：L5 放盆→盆上种豌豆（规则表全通过 + 扣费路径）----
    g.setLevel(5); g.startGame(); g.setSun(999);
    clearToasts();
    g.selectCard(7); g.clickGrid(4, 2);           // 放盆
    p = g.probe();
    assert(p.plants === 1 && p.sun === 974 && toasts.length === 0,
      'L5 放盆应放行（无 toast）', { plants: p.plants, sun: p.sun, toasts });
    g.selectCard(1); g.clickGrid(4, 2);           // 盆上种豌豆
    p = g.probe();
    assert(p.plants === 2 && p.sun === 874 && toasts.length === 0,
      'L5 盆上连种应放行（无 toast）', { plants: p.plants, sun: p.sun, toasts });
  },
};
