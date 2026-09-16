/* REG-SUN-01 · 阳光落地停留 8s 后消失（regression-plan §3.7）
 * effects 里 kind==='sun'：落到 targetY 后 stayT 累加，>8s → dead=true 并被 filter 清除。
 */
module.exports = {
  id: 'REG-SUN-01',
  name: '阳光停留 8s 后消失',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    g.setSunFallT(9999);            // 隔离自然掉落
    g.sandbox.__effects.push({
      kind: 'sun', x: 300, y: 299, value: 25, fall: 22, t: 0, stayT: 0, targetY: 300, dead: false,
    });

    for (let i = 0; i < 140; i++) g.tick(0.05);   // gt=7.0 < 8s
    assert(g.probe().effectsArr.filter(e => e.kind === 'sun').length === 1,
      '7s 时阳光应仍在（未到 8s 停留上限）', g.probe().effectsArr);

    for (let i = 0; i < 25; i++) g.tick(0.05);    // gt=8.25 > 8s
    assert(g.probe().effectsArr.filter(e => e.kind === 'sun').length === 0,
      '停留超过 8s 后阳光应消失', g.probe().effectsArr);
  },
};
