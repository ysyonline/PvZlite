/* SMOKE-012 · 波次推进清场门槛（2026-09-16 用户反馈「上一波还有好多就发下一波」修复固化）
 * 规则（checkWave 内）：
 *   - 硬门槛：上一波队列放完（!waveActive）+ 场上僵尸清空（zombies.length===0）才开新波
 *   - 最小喘息：清场太快也要等够 minGap（首波 12s / 最后两波 20s / 其余 16s）
 *   - 兜底：队列放完 25s 仍未清场（极端情况，如僵尸正在啃坚果）→ 放行，防对局僵死
 *
 * 断言：
 *   A. 场上留 1 只僵尸且喘息时间已过 → wave 不推进（核心回归断言）
 *   B. 期间 spawnQueue 保持空、不生成新僵尸
 *   C. 清空场上后再 tick → wave 立即推进（不会因门槛卡死正常节奏）
 *   D. 兜底：场上僵尸永远清不掉（spd=0 定点僵尸）→ 25s 后仍会推进（不僵死）
 */
module.exports = {
  id: 'SMOKE-012',
  name: '波次推进清场门槛（上一波未清不开新波）',
  seed: 42,
  run({ game: g, assert }) {
    const sb = g.sandbox;

    // ================= Part A/B/C：清场门槛 =================
    g.startGame();
    g.setWave(1);
    g.setLastWaveT(-999);                 // 最小喘息时间已远远满足 → 时间不再是限制
    g.forceZombieAt('normal', 2, 700);    // 场上留 1 只活僵尸
    const zx0 = g.probe().zombiesArr[0].x;

    g.tick(5);                            // 跑 5 秒（gt=5 < 兜底 25s）
    let p = g.probe();
    assert(p.wave === 1, 'A: 场上还有僵尸时 wave 不得推进', [p.wave, p.zombies]);
    assert(p.zombies === 1, 'A: 那只僵尸应还在场上', p.zombiesArr);

    g.tick(15);                           // 累计 20 秒，仍不到兜底 25s
    p = g.probe();
    assert(p.wave === 1, 'A: 20 秒内未清场，wave 仍不得推进', [p.wave, p.zombies]);
    assert(p.spawnQueueLen === 0, 'B: 未清场期间不得往队列塞新怪', p.spawnQueueLen);
    assert(p.zombies === 1, 'B: 场上僵尸数应保持 1（无新增）', p.zombiesArr);
    assert(p.zombiesArr[0].x < zx0, 'B: 那只僵尸应仍在正常移动（世界在跑）', [zx0, p.zombiesArr[0].x]);

    // C：清空场上 → 立即推进
    g.killAllZombies();
    g.tick(0.2);
    p = g.probe();
    assert(p.wave === 2, 'C: 清空场上后 wave 应立即推进到 2', [p.wave, p.zombies]);
    assert(p.spawnQueueLen > 0 || p.zombies > 0, 'C: 新一波应已开始生成', p.spawnQueueLen);

    // ================= Part D：兜底不僵死 =================
    g.startGame();
    g.setWave(1);
    g.setLastWaveT(-999);
    // 定点僵尸：spd=0 → 永不清场，也不会进屋结束对局（模拟"卡住"的极端情况）
    sb.__zombies.push({
      type: 'normal', row: 2, hp: 180, maxHp: 180, spd: 0, x: 760,
      eating: false, eatAnim: 0, walk: 0, dead: false,
    });
    g.tick(24);                           // 不到兜底阈值
    assert(g.probe().wave === 1, 'D: 24 秒时（未到 25s 兜底）wave 仍不得推进', g.probe().wave);
    g.tick(2);                            // 越过 25s 兜底
    assert(g.probe().wave >= 2, 'D: 超过兜底时长后应放行（防对局僵死）', g.probe().wave);
  },
};
