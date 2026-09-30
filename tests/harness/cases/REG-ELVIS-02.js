/* REG-ELVIS-02 · 猫王召唤正版机制（v2.3.8 用户拍板）
 * 背景：v2.3.2 猫王召唤原为「周期召唤」，且 `_first` 时间比较 bug（summonT 归零后 0<12 恒真）
 *   ⇒ 实际间隔恒 3s 而非设计 9s ⇒ 召唤频率过高（用户反馈）。
 * v2.3.8 改正版机制：首召一次性铺满 SUMMON_CAP=4，之后**伴舞死亡才逐只补召**（约 ELVIS_INTERVAL/只），
 *   满员不累计（正版不主动周期召唤）。
 * 断言：
 *   1. 常量契约：CAP=4 / COUNT=1 / INTERVAL.normal=3.0。
 *   2. 首召：入场 ELVIS_FIRST_SUMMON 后一次性铺满 4 只，且 _firstSummoned=true。
 *   3. 满员不累计：铺满后继续推 3s，伴舞数保持 4（不主动周期召唤）。
 *   4. 补召：杀死 1 只伴舞后，<3s 不补，~3s 补 1 只回 cap。
 *   5. 补召落位：新补伴舞落在本体当前列（baseCol 由 elvis.x 实时反推）。
 * ★ 判别性：回退周期召唤（旧 `_first` bug）⇒ ③必红（满员仍会 3s 一召）；改回 COUNT=3 ⇒ ①必红。
 */
module.exports = {
  id: 'REG-ELVIS-02',
  name: '猫王召唤正版机制（首召铺满+死亡补召）v2.3.8',
  seed: 42,
  run({ game: g, assert }) {
    const S = g.sandbox;
    const C = S.__consts;
    assert(C.ELVIS_SUMMON_CAP === 4, '常量：ELVIS_SUMMON_CAP 应为 4', C.ELVIS_SUMMON_CAP);
    assert(C.ELVIS_SUMMON_COUNT === 1, '常量：ELVIS_SUMMON_COUNT 应为 1', C.ELVIS_SUMMON_COUNT);
    assert(C.ELVIS_INTERVAL.normal === 3.0, '常量：ELVIS_INTERVAL.normal 应为 3.0', C.ELVIS_INTERVAL);

    g.startGame();
    g.setDiff('normal');
    const uid = 999001;
    const elvis = {
      type: 'elvis', row: 2, x: 55 + 4 * 90 + 45, hp: 900, maxHp: 900, spd: 14,  // col4 格心
      summonT: 0, summonDisabled: false, _firstSummoned: false,
      eating: false, eatAnim: 0, walk: 0, dead: false, uid,
      emergeT: 0, crumble: 0,
    };
    S.__zombies.push(elvis);

    const backupsOf = () => S.__zombies.filter(z => z.type === 'backup' && z.ownerId === uid && !z.dead && !(z.crumble > 0)).length;

    // ---- 1) 首召：推 6s 应铺满 4 只 ----
    for (let i = 0; i < 60; i++) g.tick(0.1);
    assert(backupsOf() === 4, '首召应铺满 SUMMON_CAP=4', backupsOf());
    assert(elvis._firstSummoned === true, '首召后 _firstSummoned=true', elvis._firstSummoned);

    // ---- 2) 满员不累计：再推 3s 保持 4 ----
    for (let i = 0; i < 30; i++) g.tick(0.1);
    assert(backupsOf() === 4, '满员时不主动补召（保持 4）', backupsOf());

    // ---- 3) 补召：杀 1 只，<3s 不补，~3s 补回 4 ----
    const victim = S.__zombies.find(z => z.type === 'backup' && z.ownerId === uid && !z.dead);
    assert(!!victim, '前置：有可杀伴舞');
    victim.hp = 0; victim.dead = true;
    for (let i = 0; i < 10; i++) g.tick(0.1);   // 1s
    assert(backupsOf() === 3, '死亡后 <3s 不应立即补召（仍 3）', backupsOf());
    for (let i = 0; i < 25; i++) g.tick(0.1);   // 再 2.5s，累计 3.5s
    assert(backupsOf() === 4, '死亡后 ~3s 应补 1 只回 cap=4', backupsOf());

    // ---- 4) 补召落位：落在本体当前列（baseCol 实时反推；僵尸会行走故只验 ≥1）----
    const newB = S.__zombies.filter(z => z.type === 'backup' && z.ownerId === uid && !z.dead);
    const hostCol = Math.round((elvis.x - 55) / 90);
    const hostX = 55 + hostCol * 90 + 45;
    const nearHost = newB.filter(z => Math.abs(z.x - hostX) < 45).length;
    assert(nearHost >= 1, '补召伴舞应落在本体当前列', { nearHost, total: newB.length });
  },
};
