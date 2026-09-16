/* REG-PLANT-03 · 豌豆/双发/西瓜仅在有前方僵尸时开火（regression-plan §3.5）
 * hasZombieAhead：同排且 z.x > pos.x-10 才开火。无僵尸 / 僵尸在身后 → 不开火。
 */
module.exports = {
  id: 'REG-PLANT-03',
  name: '射手仅在有前方僵尸时开火',
  seed: 42,
  run({ game: g, assert }) {
    const sfx = g.sandbox.__SFX;
    const orig = sfx.shoot;
    let shots = 0;
    sfx.shoot = function () { shots++; };
    try {
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
          shots = 0;
          for (let i = 0; i < 40; i++) g.tick(0.05);   // 2s
          if (mode === 'ahead') {
            assert(shots >= 1, `${cols[idx]}：前方有僵尸应开火`, shots);
          } else {
            assert(shots === 0, `${cols[idx]}：${mode}（无前方僵尸）不得开火`, shots);
          }
        }
      }
    } finally {
      sfx.shoot = orig;
    }
  },
};
