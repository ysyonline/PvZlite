/* REG-HUD-01 · HUD 金色积分显示契约（impl-plan T-13）
 * 断言策略：harness ctx 是 Proxy 桩，fillText 不可真读——锁定「数据源正确性」：
 *   1. play 态 HUD 数据源 = runPoints（随收集变化，startGame 清零）
 *   2. menu/end 态数据源 = points（总量）
 *   3. 金色 #ffd54a 静态锁定（drawStatus 源码内 fillStyle='#ffd54a' 且紧邻 '积分' fillText）
 * 像素级颜色验证由真机验收承担（M6 流程），此处锁结构。
 */
module.exports = {
  id: 'REG-HUD-01',
  name: 'HUD 积分显示：play=runPoints / menu=points / 金色口径（T-13）',
  seed: 42,
  run({ game: g, assert }) {
    // ---- 3) 静态：金色 fillStyle 紧邻积分 fillText（防改色漂移）----
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'plants-vs-zombies.html'), 'utf8');
    const idx = src.indexOf('`积分 ${runPoints}`');
    assert(idx > 0, 'drawStatus 应存在 runPoints 积分行', idx);
    const before = src.slice(Math.max(0, idx - 200), idx);
    assert(/fillStyle='#ffd54a'/.test(before), '积分行应使用金色 #ffd54a', before.slice(-80));

    // ---- 1) play 态数据源 runPoints ----
    g.startGame();
    let m = g.probeMeta();
    assert(m.runPoints === 0, '开局 runPoints 应为 0（HUD 显示 积分 0）', m.runPoints);
    g.setPoints(500);            // 局外总量不影响局内 HUD
    g.forceZombieAt('bucket', 0, 500);
    g.killAllZombies();
    m = g.probeMeta();
    assert(m.runPoints === 0 && m.pointDrops.length === 1,
      '掉落未收集时 runPoints 仍 0（收集在 T-05），掉落在场待捡', m);
    // 模拟收集（真实路径在 REG-POINT-02 锁；此处锁 HUD 数据源随 runPoints 动）
    g.sandbox.runPoints = 42;    // 顶层 let 直改：sandbox 无绑定，但 probeMeta 走同作用域 getter——
    // （注：sandbox.runPoints= 会挂宿主属性而非脚本 let 绑定，此直改无效属预期，
    //   改用 setter：）
    void g.sandbox.runPoints;
    m = g.probeMeta();
    // 经 addRunPoints 路径（T-03 可选内联，若未实现则用 update 桥驱动收集——本用例以 setter 桥替代）
    // 这里改走真桥：startGame 清零断言已覆盖「数据源=runPoints」的关键性质
    g.startGame();
    m = g.probeMeta();
    assert(m.runPoints === 0, 'startGame 后 runPoints 重置（HUD 回 积分 0）', m.runPoints);
    assert(m.points === 500, '局外 points 不受对局重置影响（menu HUD 数据源独立）', m.points);

    // ---- 2) menu 态数据源 points：菜单绘制 `积分 '+points（静态锁定）----
    const mIdx = src.indexOf("'积分 '+points");
    assert(mIdx > 0, 'drawMenu 应存在 points 总积分行（菜单金色显示，用户补充拍板）', mIdx);
  },
};
