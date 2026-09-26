/* REG-SQUASH-01 · 窝瓜（squash）跳跃状态机 —— 机制级回归（V22 刀1 · v2.2.5 消缺改版）
 * ------------------------------------------------------------------
 * 被测契约（源码 updatePlant 'squash' 分支 + GDD §4）：
 *   ① 目标选择：同排 && pos.x < z.x < pos.x + CELL_W（**距离一格内**，v2.2.5 消缺）的
 *      **最左**（x 最小）僵尸；身后与他排一律忽略；
 *   ② 跳跃时长 0.6s：jumpT 每帧累加 dt，prog=jumpT/0.6，prog>=1 才落地结算；
 *   ③ 落地单体秒杀：if(!p.jumpTarget.dead) killZombie(jumpTarget) → p._dying=true；
 *   ④ 目标中途死亡守卫：落地时目标已 dead 则不结算，但窝瓜仍消失；
 *   ⑤ 无前方一格内僵尸 → 保持待机（jumping 恒假、不掉耐久）；
 *   ⑥ 一次性：秒杀后自身 _dying，下一帧被 plants.splice 移除。
 *
 * ★ v2.2.5 消缺改版：原「前方任意距离（z.x>pos.x）即触发」改为「距离一格内
 *   （z.x-pos.x<CELL_W=90）才触发」。S1 的僵尸距离相应收近（一格内），并新增
 *   「一格外不触发」断言（S4）。
 */
module.exports = {
  id: 'REG-SQUASH-01',
  name: '窝瓜：一格内最近锁定 / 0.6s 抛物线 / 单体秒杀 / 目标中途死亡守卫 / 一格外待机',
  seed: 42,
  run({ game: g, assert }) {
    const sb = g.sandbox;
    const K = sb.__consts;                       // GRID_X=55 / CELL_W=90 / GRID_Y=80 / CELL_H=104
    const COL_X = (c) => K.GRID_X + c * K.CELL_W + K.CELL_W / 2;   // 列心 x（=gridToPos(col,row).x）

    /** 种植：卡片在位走真实路径 selectCard→clickGrid；旧源卡片缺失则注入同构实体兜底。 */
    function place(type, col, row, dur) {
      const CARDS = sb.__CARDS || [];
      const idx = CARDS.findIndex((c) => c.type === type);
      if (idx >= 0) {
        g.selectCard(idx);
        g.clickGrid(col, row);
        const arr = sb.__plants;
        return arr[arr.length - 1];
      }
      const p = { type, col, row, cd: 0, sunT: 0, armT: 0, dur, maxDur: dur,
        arming: false,   // v2.2.5：注入兜底直接视为已武装
        plantT: 620, plantDone: true, dirtDone: true };
      sb.__plants.push(p);
      return p;
    }
    const mkZ = (row, x, type, hp) => ({
      type: type || 'normal', row, hp: hp || 180, maxHp: hp || 180, spd: 0, x,
      eating: false, eatAnim: 0, walk: 0, dead: false,
    });
    /** 新开一局并清场（隔离波次/实体，避免场景互污染）。 */
    function fresh() {
      g.startGame();
      g.setSun(9999);
      g.clearField();
    }
    const findZ = (x) => sb.__zombies.find((z) => z && Math.abs(z.x - x) < 1e-6);

    // ================= S1 · 目标选择 = 同排前方一格内最近（x 最小） =================
    fresh();
    place('squash', 1, 2, 400);
    let p = g.probe();
    assert(p.plants === 1 && p.plantsArr[0].type === 'squash', 'S1 前置：窝瓜已种下', p.plantsArr);
    assert(p.plantsArr[0].armT === 0, 'S1 前置：窝瓜 armT=0（即种即生效）', p.plantsArr[0].armT);

    const X0 = COL_X(1);                         // =190
    sb.__zombies.push(mkZ(2, X0 + 70));          // A 一格内（应被锁定，最近）
    sb.__zombies.push(mkZ(2, X0 + 30));          // B 一格内更近（应被锁定）
    sb.__zombies.push(mkZ(2, X0 + 150));         // C 一格外（>90px，不得触发）
    sb.__zombies.push(mkZ(2, X0 - 100));         // D 身后（不得锁定）
    sb.__zombies.push(mkZ(1, X0 + 30));          // E 他排（不得锁定）
    g.tick(0.016);

    let sp = sb.__plants[0];
    assert(!!sp && sp.jumping === true, 'S1 有前方一格内目标时应立即起跳（jumping=true）',
      { jumping: sp && sp.jumping, type: sp && sp.type });
    assert(!!sp.jumpTarget && sp.jumpTarget.x === X0 + 30,
      'S1 应锁定同排前方一格内最近（x 最小）目标 B(x=220)，而非更远的 A/C', {
        got: sp.jumpTarget && sp.jumpTarget.x, want: X0 + 30,
      });
    assert(sp.jumpFromX === X0, 'S1 起跳点应记录为自身格心 x', { got: sp.jumpFromX, want: X0 });

    for (let i = 0; i < 45; i++) g.tick(0.016);  // 0.72s > 0.6s ⇒ 落地
    p = g.probe();
    assert(p.plants === 0, 'S1 落地后窝瓜一次性消失（plants=0）', p.plantsArr);
    assert(p.zombies === 4, 'S1 单体秒杀：仅最近目标 B 被杀，A/C/D/E 存活',
      p.zombiesArr.map((z) => ({ row: z.row, x: z.x })));
    assert(!p.zombiesArr.some((z) => z.x === X0 + 30 && z.row === 2), 'S1 目标 B 应已死亡', p.zombiesArr);
    assert(p.zombiesArr.some((z) => z.x === X0 - 100 && z.row === 2), 'S1 身后僵尸 D 不得被杀（非前方）', p.zombiesArr);
    assert(p.zombiesArr.some((z) => z.row === 1), 'S1 他排僵尸 E 不得被杀（单体·同排）', p.zombiesArr);
    assert(p.score >= 50, 'S1 秒杀应结算 1 次击杀分（≥50）', p.score);

    // ================= S2 · 0.6s 抛物线时长（落地前不结算） =================
    fresh();
    place('squash', 1, 2, 400);
    sb.__zombies.push(mkZ(2, COL_X(1) + 60));    // 一格内（<90px）
    g.tick(0.1);                                 // 起跳帧：jumping=true, jumpT=0
    sp = sb.__plants[0];
    assert(sp && sp.jumping === true && sp.jumpT === 0, 'S2 起跳当帧 jumpT 归零', { jumpT: sp && sp.jumpT });

    for (let i = 0; i < 5; i++) g.tick(0.1);     // 累计 6 帧 ⇒ jumpT=0.5
    sp = sb.__plants[0];
    assert(!!sp && Math.abs(sp.jumpT - 0.5) < 1e-6, 'S2 6×0.1s 后 jumpT 应 = 0.5', sp && sp.jumpT);
    p = g.probe();
    assert(p.plants === 1, 'S2 jumpT=0.5（<0.6）时不得落地（窝瓜仍在）', p.plantsArr);
    assert(p.zombies === 1 && p.zombiesArr[0].hp === 180,
      'S2 落地前不得结算秒杀（目标存活且 hp 不变）', p.zombiesArr);

    g.tick(0.1);                                 // jumpT=0.6 ⇒ prog>=1 ⇒ 落地
    p = g.probe();
    assert(p.plants === 0, 'S2 jumpT=0.6 应落地并消失（0.6s 时长契约）', p.plantsArr);
    assert(p.zombies === 0, 'S2 落地应秒杀目标', p.zombiesArr);

    // ================= S3 · 目标中途死亡守卫 =================
    fresh();
    place('squash', 1, 2, 400);
    sb.__zombies.push(mkZ(2, X0 + 50));          // A 一格内（锁定）
    sb.__zombies.push(mkZ(2, X0 + 600));         // B 远（应存活）
    g.tick(0.016);
    sp = sb.__plants[0];
    assert(!!sp && sp.jumpTarget && sp.jumpTarget.x === X0 + 50, 'S3 前置：已锁定 A', sp && sp.jumpTarget && sp.jumpTarget.x);

    const zA = findZ(X0 + 50);
    assert(!!zA, 'S3 前置：取到目标 A 的引用');
    sb.killZombie(zA);                           // 跳跃途中目标被外力击杀
    for (let i = 0; i < 45; i++) g.tick(0.016);  // 走完 0.6s 落地
    p = g.probe();
    assert(p.plants === 0, 'S3 目标中途死亡：窝瓜仍应消失（一次性）', p.plantsArr);
    assert(p.zombies === 1 && p.zombiesArr[0].x === X0 + 600,
      'S3 落地守卫：目标已 dead ⇒ 不再结算，远处 B 存活', p.zombiesArr);
    assert(p.zombiesArr[0].hp === 180, 'S3 B 不应受伤', p.zombiesArr[0]);

    // ================= S4 · 一格外 / 无前方僵尸 → 待机（不跳、不掉耐久） =================
    fresh();
    place('squash', 1, 2, 400);
    sb.__zombies.push(mkZ(2, X0 + 120));         // 一格外（>90px）⇒ 不得触发（v2.2.5 消缺）
    sb.__zombies.push(mkZ(2, X0 - 100));         // 身后
    sb.__zombies.push(mkZ(2, X0));               // 恰好同格（z.x <= pos.x ⇒ 不算前方）
    sb.__zombies.push(mkZ(1, X0 + 30));          // 他排
    sb.__zombies.push(mkZ(3, X0 + 30));          // 他排
    for (let i = 0; i < 20; i++) g.tick(0.05);   // 1.0s
    sp = sb.__plants[0];
    p = g.probe();
    assert(p.plants === 1, 'S4 一格外/无前方僵尸时窝瓜不得消失（待机）', p.plantsArr);
    assert(!(sp && sp.jumping === true), 'S4 一格外/无前方僵尸时 jumping 恒假（等僵尸，GDD §4.4）',
      { jumping: sp && sp.jumping });
    assert(sp && sp.dur === 400, 'S4 待机期间不掉耐久（无僵尸啃食路径）', sp && sp.dur);
    assert(p.zombies === 5, 'S4 待机期间不得误杀任何僵尸', p.zombiesArr);
  },
};
