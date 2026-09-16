/* REG-PLANT-02 · 攻击间隔：豌豆 1.6s / 双发 1.5s / 西瓜 3.2s（regression-plan §3.5）
 * 用 SFX.shoot 打桩计数开火时刻（每次开火调用一次，且间隔远大于其 0.13s 节流）。
 * 目标僵尸 hp 极高且 spd=0，保证始终"前方有僵尸"且不被击杀，专注测节奏。
 */
module.exports = {
  id: 'REG-PLANT-02',
  name: '攻击间隔契约（豌豆1.6 / 双发1.5 / 西瓜3.2）',
  seed: 42,
  run({ game: g, assert }) {
    const sfx = g.sandbox.__SFX;
    const orig = sfx.shoot;
    let shots = [];
    sfx.shoot = function () { shots.push(g.probe().gt); };
    try {
      const measure = (cardIdx, seconds) => {
        g.startGame();
        g.setSun(9999);
        g.selectCard(cardIdx);
        g.clickGrid(0, 0);
        g.sandbox.__zombies.push({
          type: 'bucket', row: 0, hp: 999999, maxHp: 999999, spd: 0, x: 800,
          eating: false, eatAnim: 0, walk: 0, dead: false,
        });
        shots = [];
        const steps = Math.round(seconds / 0.05);
        for (let i = 0; i < steps; i++) g.tick(0.05);
        return shots.slice();
      };

      const deltas = (arr) => {
        const d = [];
        for (let i = 1; i < arr.length; i++) d.push(arr[i] - arr[i - 1]);
        return d;
      };

      // 豌豆：间隔 1.6s
      let s = measure(1, 10);
      assert(s.length >= 3, '豌豆 10s 内应开火 ≥3 次', s);
      deltas(s).forEach((dv, i) => assert(Math.abs(dv - 1.6) < 0.11,
        `豌豆第 ${i + 1} 次间隔应 ≈1.6s`, dv));

      // 双发：间隔 1.5s
      s = measure(4, 10);
      assert(s.length >= 3, '双发 10s 内应开火 ≥3 次', s);
      deltas(s).forEach((dv, i) => assert(Math.abs(dv - 1.5) < 0.11,
        `双发第 ${i + 1} 次间隔应 ≈1.5s`, dv));

      // 西瓜：间隔 3.2s
      s = measure(5, 10);
      assert(s.length >= 2, '西瓜 10s 内应开火 ≥2 次', s);
      deltas(s).forEach((dv, i) => assert(Math.abs(dv - 3.2) < 0.11,
        `西瓜第 ${i + 1} 次间隔应 ≈3.2s`, dv));
    } finally {
      sfx.shoot = orig;
    }
  },
};
