/* REG-SPLASH-01 · 西瓜带状溅射爆点锚=直中目标（v2.3.6 bugfix 回归）
 * ============================================================================
 * 背景（2026-09-29 用户报告「西瓜溅射伤害好像没有实现」，实测坐实）：
 *   直中判定窗 |z.x-pr.x|<42 使弹体提前 ~37-40px 爆炸（帧步进 vx*dt≈2.6px），
 *   旧实现溅射带锚「弹体结算当刻 pr.x」⇒ 锚点系统性偏左，55px 带实测只覆盖
 *   直中目标身后 ~18px ⇒ 身后 20px 的僵尸都溅不到（真机开火掉 0 血）。
 * 修复：带状溅射（melon/icemelon，无 splashGrid）爆点锚改为**直中目标 z.x**
 *   （西瓜砸在僵尸身上 ⇒ 爆点=目标身上，前/后对称各 55px）。
 *   splashGrid 弹（cabbage/corn）维持 pr.x 锚不动（v1.8 已批准契约）。
 * 手法：真机开火路径（种真西瓜 → fireArcProjectile 真弹体 → 自然命中结算）——
 *   现有溅射用例（REG-PLANT-04/REG-CHILL-02/REG-GRIDLOCK-01）全部注入式摆弹，
 *   pr.x 手工摆位绕过了锚点偏差，正是本 bug 的测试盲区，故本例必须走真开火。
 * 摆位（row2，发射点 sx≈220）：直中 A@470；身后 B@520（+50px，带内应溅）；
 *   身后远 C@600（+130px，带外不溅）；发射点后方 D@170（<sx-10 不可被瞄准，带外不溅）。
 * 判别力：旧源（pr.x 锚）B 掉 0 血必红；修复源 B 掉 35.75 绿。
 * ============================================================================
 */
module.exports = {
  id: 'REG-SPLASH-01',
  name: '西瓜溅射爆点锚=直中目标（真机开火：身后 50px 溅 35.75 / 带外 0 伤）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.setSun(9999);
    const S = g.sandbox;
    g.selectCard(5);            // 西瓜卡
    g.clickGrid(1, 2);          // 种在 col1,row2（发射点 sx = 格右缘 ≈220）

    const mk = (x) => ({ type: 'normal', row: 2, hp: 1000, maxHp: 1000, spd: 0, x,
      eating: false, eatAnim: 0, walk: 0, dead: false });
    S.__zombies.length = 0;
    S.__projectiles.length = 0;
    const A = mk(470);          // 直中目标（最左 ⇒ 抛物目标必选它）
    const B = mk(520);          // 身后 +50px（|520-470|=50 < 55 ⇒ 应溅 35.75）
    const C = mk(600);          // 身后 +130px（带外 ⇒ 0 伤）
    const D = mk(170);          // 发射点后方（x<sx-10 不可被瞄准 ⇒ 0 伤）
    for (const z of [A, B, C, D]) S.__zombies.push(z);

    let fired = false, guard = 0;
    while (guard < 300) {       // ≤3s：等开火→飞行→命中消失
      g.__updateRaw(0.01);
      guard++;
      if (!fired && g.probe().projectiles > 0) fired = true;
      if (fired && g.probe().projectiles === 0) break;
    }
    assert(fired, '前置：西瓜应已开火产生弹体', fired);
    assert(g.probe().projectiles === 0, '前置：弹体应已命中并清除', guard);

    const zs = S.__zombies;
    assert(Math.abs(A.hp - (1000 - 65)) < 1e-6, '直中目标 A@470 应扣满 65', A.hp);
    assert(Math.abs(B.hp - (1000 - 65 * 0.55)) < 1e-6,
      '★核心：身后 50px 的 B@520 应溅 65*0.55=35.75（旧 pr.x 锚掉 0 必红）', B.hp);
    assert(C.hp === 1000, '带外 C@600（+130px）不溅', C.hp);
    assert(D.hp === 1000, '发射点后方 D@170 不溅', D.hp);
  },
};
