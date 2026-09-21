/* REG-PLANT-02 · 攻击间隔：豌豆 1.6s / 双发 1.5s / 西瓜 3.2s（regression-plan §3.5）
 * v1.6 第4刀：西瓜改真抛物投掷 ⇒ 开火不再调 SFX.shoot（改调 SFX.melonThrow）。
 *   探针升级：主判据 = 「弹体计数」——每 tick 扫描 __projectiles 新增弹体对象（按对象身份去重）；
 *   同一 tick 多发（double 单次开火推 2 颗 pea 弹）只记一次，故开火时刻序列仍为每次开火一格。
 *   音效计数为辅助/交叉校验：stub SFX.shoot + SFX.melonThrow 合并计数（打桩整体替换函数 ⇒ 绕过
 *   内部 sfxGate 节流 ⇒ 计数=真实调用数），断言与开火次数一致（探针口径交叉校验）。
 * 目标僵尸 hp 极高且 spd=0，保证始终"前方有僵尸"且不被击杀，专注测节奏。
 */
module.exports = {
  id: 'REG-PLANT-02',
  name: '攻击间隔契约（豌豆1.6 / 双发1.5 / 西瓜3.2）',
  seed: 42,
  run({ game: g, assert }) {
    const sfx = g.sandbox.__SFX;

    // 开火探测：返回 { times: 每次开火的 gt 序列, sfx: 音效调用数 }
    const measure = (cardIdx, seconds) => {
      g.startGame();
      g.setSun(9999);
      g.selectCard(cardIdx);
      g.clickGrid(0, 0);
      g.sandbox.__zombies.push({
        type: 'bucket', row: 0, hp: 999999, maxHp: 999999, spd: 0, x: 800,
        eating: false, eatAnim: 0, walk: 0, dead: false,
      });
      const S = g.sandbox;
      let sfxFires = 0;
      const origShoot = sfx.shoot, origMelon = sfx.melonThrow;
      sfx.shoot = function () { sfxFires++; };
      sfx.melonThrow = function () { sfxFires++; };
      const seen = new Set();
      const times = [];
      try {
        const steps = Math.round(seconds / 0.05);
        for (let i = 0; i < steps; i++) {
          g.tick(0.05);
          let spawned = false;
          for (const pr of S.__projectiles) { if (!seen.has(pr)) { seen.add(pr); spawned = true; } }
          if (spawned) times.push(g.probe().gt);   // 该 tick 有新弹体 ⇒ 有一次开火
        }
      } finally {
        sfx.shoot = origShoot;
        sfx.melonThrow = origMelon;
      }
      return { times, sfx: sfxFires };
    };

    const deltas = (arr) => {
      const d = [];
      for (let i = 1; i < arr.length; i++) d.push(arr[i] - arr[i - 1]);
      return d;
    };

    // 豌豆：间隔 1.6s
    let m = measure(1, 10);
    assert(m.times.length >= 3, '豌豆 10s 内应开火 ≥3 次', m.times);
    assert(m.sfx === m.times.length, '豌豆开火次数应与开火音效数一致（弹体/音效探针交叉校验）', [m.sfx, m.times.length]);
    deltas(m.times).forEach((dv, i) => assert(Math.abs(dv - 1.6) < 0.11,
      `豌豆第 ${i + 1} 次间隔应 ≈1.6s`, dv));

    // 双发：间隔 1.5s
    m = measure(4, 10);
    assert(m.times.length >= 3, '双发 10s 内应开火 ≥3 次', m.times);
    assert(m.sfx === m.times.length, '双发开火次数应与开火音效数一致（同 tick 双弹只记一次开火）', [m.sfx, m.times.length]);
    deltas(m.times).forEach((dv, i) => assert(Math.abs(dv - 1.5) < 0.11,
      `双发第 ${i + 1} 次间隔应 ≈1.5s`, dv));

    // 西瓜：间隔 3.2s（v1.6 真抛物，开火音效走 melonThrow，不再走 shoot）
    m = measure(5, 10);
    assert(m.times.length >= 2, '西瓜 10s 内应开火 ≥2 次', m.times);
    assert(m.sfx === m.times.length, '西瓜开火次数应与 melonThrow 调用数一致', [m.sfx, m.times.length]);
    deltas(m.times).forEach((dv, i) => assert(Math.abs(dv - 3.2) < 0.11,
      `西瓜第 ${i + 1} 次间隔应 ≈3.2s`, dv));
  },
};
