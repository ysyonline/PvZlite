/* REG-PLANT-03 · 豌豆/双发/西瓜仅在有前方僵尸时开火（regression-plan §3.5）
 * hasZombieAhead：同排且 z.x > pos.x-10 才开火。无僵尸 / 僵尸在身后 → 不开火。
 * v1.6 第4刀：西瓜改真抛物投掷 ⇒ 开火不再调 SFX.shoot（改调 melonThrow）。
 *   探针升级：主判据 = 「弹体计数」（每 tick 扫描 __projectiles 新增弹体对象）；音效计数为辅助
 *   （stub SFX.shoot + SFX.melonThrow 合并计数，打桩整体替换函数 ⇒ 绕过 sfxGate）。
 *   语义等价：原来验「有前方僵尸才开火」，换探针后仍在验同一件事（ahead⇒开火 / none|behind⇒不开火）。
 */
module.exports = {
  id: 'REG-PLANT-03',
  name: '射手仅在有前方僵尸时开火',
  seed: 42,
  run({ game: g, assert }) {
    const sfx = g.sandbox.__SFX;
    const cols = { 1: 'pea', 4: 'double', 5: 'melon' };
    for (const idx of [1, 4, 5]) {
      for (const mode of ['none', 'behind', 'ahead']) {
        g.startGame();
        g.setSun(9999);
        g.selectCard(idx);
        g.clickGrid(0, 0);
        const pos = g.sandbox.gridToPos(0, 0);
        if (mode === 'behind') {
          g.sandbox.__zombies.push({
            type: 'normal', row: 0, hp: 180, maxHp: 180, spd: 0, x: pos.x - 40,
            eating: false, eatAnim: 0, walk: 0, dead: false,
          });
        } else if (mode === 'ahead') {
          g.sandbox.__zombies.push({
            type: 'normal', row: 0, hp: 999999, maxHp: 999999, spd: 0, x: pos.x + 200,
            eating: false, eatAnim: 0, walk: 0, dead: false,
          });
        }
        const S = g.sandbox;
        let sfxFires = 0;
        const origShoot = sfx.shoot, origMelon = sfx.melonThrow;
        sfx.shoot = function () { sfxFires++; };
        sfx.melonThrow = function () { sfxFires++; };
        const seen = new Set();
        let projFires = 0;
        try {
          for (let i = 0; i < 40; i++) {   // 2s
            g.tick(0.05);
            for (const pr of S.__projectiles) { if (!seen.has(pr)) { seen.add(pr); projFires++; } }
          }
        } finally {
          sfx.shoot = origShoot;
          sfx.melonThrow = origMelon;
        }
        if (mode === 'ahead') {
          assert(projFires >= 1, `${cols[idx]}：前方有僵尸应开火（产生弹体）`, projFires);
          assert(sfxFires >= 1, `${cols[idx]}：前方有僵尸应触发开火音效（探针交叉校验）`, sfxFires);
        } else {
          assert(projFires === 0, `${cols[idx]}：${mode}（无前方僵尸）不得开火（零弹体）`, projFires);
          assert(sfxFires === 0, `${cols[idx]}：${mode}（无前方僵尸）不得触发开火音效`, sfxFires);
        }
      }
    }
  },
};
