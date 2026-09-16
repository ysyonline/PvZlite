/* REG-CARD-02 · 阳光不足时种植被拒（regression-plan §3.3）
 * sun < cost → 不新增植物、不扣阳光、SFX.deny 被调用。
 * SFX 是顶层 const 对象，经 harness 的 __SFX 桥接后可打桩计数。
 */
module.exports = {
  id: 'REG-CARD-02',
  name: '阳光不足时种植被拒（SFX.deny）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();
    const sfx = g.sandbox.__SFX;
    assert(sfx && typeof sfx.deny === 'function', '应能经 __SFX 访问音效表');
    let deny = 0;
    const origDeny = sfx.deny;
    sfx.deny = function () { deny++; };
    try {
      g.setSun(50);                   // 豌豆 cost=100
      g.selectCard(1);
      g.clickGrid(0, 0);
      const p = g.probe();
      assert(p.plants === 0, '阳光不足不得种下植物', p.plants);
      assert(p.sun === 50, '被拒的种植不得扣阳光', p.sun);
      assert(deny === 1, 'SFX.deny 应被调用一次', deny);
    } finally {
      sfx.deny = origDeny;
    }
  },
};
