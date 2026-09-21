/* REG-POINT-01 · 击杀掉落生成契约：tier 映射 + 坐标偏移 + 绕开 effects 守卫（impl-plan T-04）
 * 断言清单：
 *   1. 四类型僵尸击杀 → 掉落 tier/value 正确（普铜1/快银2/路银2/桶金3）
 *   2. 坐标偏移在 ±DROP_OFFSET(12) 内
 *   3. 灌爆 effects(>500) 后击杀 → 掉落仍生成（Q7 拍板：积分掉落不允许被上限丢弃）
 *   4. 掉落物不混入 effects 数组（独立 pointDrops）
 * 坑位备忘：killZombie 经 __api.killAllZombies 真实路径触发。
 */
module.exports = {
  id: 'REG-POINT-01',
  name: '积分掉落生成：tier 映射 / 偏移半径 / 绕守卫（T-04）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    const C = g.sandbox.__consts.POINT_CONFIG;

    // ---- 1) 四类型 tier 映射 ----
    const cases = [
      ['normal', 'bronze', 1],
      ['fast', 'silver', 2],
      ['cone', 'silver', 2],
      ['bucket', 'gold', 3],
    ];
    for (const [type, tier, value] of cases) {
      g.startGame();   // 每类型独立对局，pointDrops 随 startGame 复位（reset 串）
      assert(g.probeMeta().pointDrops.length === 0, type + '：前置开局掉落应为空');
      g.forceZombieAt(type, 0, 500);
      g.killAllZombies();
      const drops = g.probeMeta().pointDrops;
      assert(drops.length === 1, type + '：击杀应生成 1 个掉落', drops.length);
      assert(drops[0].tier === tier && drops[0].value === value,
        type + '：应为 ' + tier + '(值' + value + ')', drops[0]);
      // ---- 2) 坐标偏移：僵尸 (500, 行0) 爆点 y=GRID_Y+CELL_H/2，偏移 ≤12 ----
      const baseY = 80 + 104 / 2;   // GRID_Y + CELL_H/2
      assert(Math.abs(drops[0].x - 500) <= C.DROP_OFFSET,
        type + '：x 偏移应在 ±' + C.DROP_OFFSET, drops[0].x);
      assert(Math.abs(drops[0].y - baseY) <= C.DROP_OFFSET,
        type + '：y 偏移应在 ±' + C.DROP_OFFSET, drops[0].y);
      // ---- 4) 独立数组：effects 里不应有积分掉落物 ----
      const p = g.probe();
      assert(p.effectsArr.every(e => e.kind !== 'pointdrop'),
        type + '：掉落物不得进入 effects（独立数组绕守卫）', p.effectsArr.length);
    }

    // ---- 3) 灌爆 effects 后击杀仍生成掉落（守卫绕开实证）----
    g.startGame();
    // 灌 600 个死粒子把 effects 推过 500 上限
    const sb = g.sandbox;
    for (let i = 0; i < 600; i++) {
      sb.__api && 0;   // no-op（保持风格一致）
      g.tick(0);       // 不必要但无害
      break;
    }
    // 直接用沙盒内 spawnBurst 灌粒子（顶层 function 声明可经 __api 外的桥？不能——
    // 用真实路径：一次性 spawnBurst 经 __api 未暴露，改用 40 只僵尸同帧击杀更真实：
    g.startGame();
    for (let i = 0; i < 40; i++) g.forceZombieAt('bucket', i % 5, 300 + i * 15);
    // 先灌爆 effects：连续触发 60 次冲击波（每个 boom/shockwave 都过 effects）
    for (let i = 0; i < 40; i++) {
      g.forceZombieAt('normal', 4, 700 + i);   // 堆在右侧不推进
    }
    // effects 灌爆：种 8 株向日葵不现实——直接用 harness 桥向 effects 塞粒子
    // （effects 是 getter 桥，push 真实生效）
    const effectsRef = g.sandbox.__effects;
    for (let i = 0; i < 520; i++) effectsRef.push({ kind: 'particle', x: 0, y: 0, vx: 0, vy: 0, life: 999, color: '#000', size: 1, dead: false });
    assert(effectsRef.length > 500, '前置：effects 已灌爆（>500）', effectsRef.length);
    // 击杀全部 80 只 → 80 个掉落必须全部生成（若掉落走 effects+守卫会丢光）
    g.killAllZombies();
    const drops2 = g.probeMeta().pointDrops;
    assert(drops2.length === 80, 'effects 灌爆下击杀 80 只应生成 80 掉落（Q7 不丢弃）', drops2.length);
    assert(drops2.every(d => d.tier === 'gold' || d.tier === 'bronze'),
      '掉落 tier 应与怪型匹配（bucket=gold / normal=bronze）', drops2[0]);
  },
};
