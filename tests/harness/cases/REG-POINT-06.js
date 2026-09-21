/* REG-POINT-06 · 死亡爆币特效契约（2026-09-21 用户验收：怪死爆一堆钱币+光）
 * 断言清单：
 *   1. 击杀生成 coin-flash（爆点金光）×1 + coin（装饰飞币）×DEATH_COIN_FX.decorCount
 *   2. 特效恒金色（2026-09-21 16:0x 验收修正：所有怪死都爆一堆金币，不随阶位变色；
 *      阶位差异只在地面真币面值/颜色）
 *   3. tick 推进后特效按寿命消亡（flash 0.35s / coin ≤ life 上限 0.92s 后全灭）
 *   4. effects 灌爆（>500）时击杀 → 特效优雅降级（不生成），真币 pointDrops 照常生成
 *   5. 真币契约不变：1 怪 1 币、value/tier 映射不受特效影响
 * 坑位备忘：killZombie 经 __api.killAllZombies 真实路径触发；effects 经 __effects getter push 真实生效。
 */
module.exports = {
  id: 'REG-POINT-06',
  name: '死亡爆币特效：金光/飞币/降级/真币不变（验收 2026-09-21）',
  seed: 42,
  run({ game: g, assert }) {
    const C = g.sandbox.__consts.POINT_CONFIG;
    const FX = C.DEATH_COIN_FX;

    // ---- 1+2) 击杀生成特效，恒金色（普通怪也是一堆金币）----
    g.startGame();
    g.forceZombieAt('bucket', 0, 500);
    g.killAllZombies();
    let fx = g.probe().effectsArr.filter(e => e.kind === 'coin-flash');
    let coins = g.probe().effectsArr.filter(e => e.kind === 'coin');
    assert(fx.length === 1, '击杀应生成 1 个爆点金光（coin-flash）', fx.length);
    assert(coins.length === FX.decorCount,
      '击杀应生成 ' + FX.decorCount + ' 枚装饰飞币（coin）', coins.length);
    assert(fx[0].color === C.TIER.gold.color,
      '金光应恒金色（铁桶）', fx[0].color);
    assert(coins.every(c => c.color === C.TIER.gold.color),
      '飞币应恒金色（铁桶）', coins[0] && coins[0].color);

    // ---- 3) tick 推进后特效按寿命消亡 ----
    // flash 寿命 0.35s：推 0.4s 后应全灭
    g.tick(0.4);
    fx = g.probe().effectsArr.filter(e => e.kind === 'coin-flash');
    assert(fx.length === 0, '金光 0.35s 寿命到点应消亡', fx.length);
    // coin 寿命上限 = life(0.8)×1.15 = 0.92s：再推 0.6s（累计 1.0s）应全灭
    g.tick(0.6);
    coins = g.probe().effectsArr.filter(e => e.kind === 'coin');
    assert(coins.length === 0, '装饰飞币寿命到点应全部消亡', coins.length);

    // ---- 5) 真币契约不变：1 怪 1 币、tier/value 正确（与特效共存）----
    g.startGame();
    g.forceZombieAt('normal', 2, 400);
    g.killAllZombies();
    let m = g.probeMeta();
    assert(m.pointDrops.length === 1 && m.pointDrops[0].tier === 'bronze' && m.pointDrops[0].value === 1,
      '真币契约：普通怪仍 1 铜币（值 1）', m.pointDrops);
    fx = g.probe().effectsArr.filter(e => e.kind === 'coin-flash');
    assert(fx.length === 1 && fx[0].color === C.TIER.gold.color,
      '普通怪爆币也应变金色（恒金币视觉，验收 16:0x 修正）', fx[0]);

    // ---- 4) effects 灌爆：特效降级不生成，真币照常（Q7 契约不被特效破坏）----
    g.startGame();
    const effectsRef = g.sandbox.__effects;
    for (let i = 0; i < 520; i++) effectsRef.push({ kind: 'particle', x: 0, y: 0, vx: 0, vy: 0, life: 999, color: '#000', size: 1, dead: false });
    assert(effectsRef.length > 500, '前置：effects 已灌爆（>500）', effectsRef.length);
    g.forceZombieAt('bucket', 1, 500);
    g.killAllZombies();
    fx = g.probe().effectsArr.filter(e => e.kind === 'coin-flash' || e.kind === 'coin');
    assert(fx.length === 0, 'effects 灌爆时爆币特效应优雅降级（零生成）', fx.length);
    m = g.probeMeta();
    assert(m.pointDrops.length === 1 && m.pointDrops[0].tier === 'gold' && m.pointDrops[0].value === 3,
      '灌爆下真币仍照常生成（金 3）——独立数组契约未被特效破坏', m.pointDrops);
  },
};
