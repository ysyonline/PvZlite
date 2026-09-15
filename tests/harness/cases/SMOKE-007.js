/* SMOKE-007 · for...of splice 安全（陷阱 #3 对照）
 * 植物死亡用标记法（p._dying=true）+ 反向 for 清理，而非在 for...of 里 splice。
 * 用例：直接向 __plants 桥接数组注入 3 棵坚果对象（不走选卡种植——坚果卡片 CD=20s，
 * 无法连种 3 棵，且本用例测的是"死亡清理"不是"种植"）→ 3 只僵尸各自啃对应行 →
 * tick 让坚果 dur 归零被吃 → 遍历完成后应剩 0 棵坚果、无 _dying 残留、
 * 无迭代器错乱（zombies 数组长度仍 = 3 只）。
 */
module.exports = {
  id: 'SMOKE-007',
  name: 'for...of splice 安全（植物死亡标记法）',
  seed: 42,
  run({ game: g, assert }) {
    g.startGame();

    // 直接向 plants 注入 3 棵坚果（宿主侧经 PROBE_SUFFIX 桥接的 __plants 访问，
    // README：顶层 let/const 不挂 global，须显式桥接）。
    // 对象结构与游戏 onClick 种下的坚果一致：type/col/row/dur/maxDur...
    const arr = g.sandbox.__plants;
    const col = 4;
    for (let r = 0; r < 3; r++) {
      const pos = g.sandbox.gridToPos(col, r);
      arr.push({
        type: 'nut', col: col, row: r, x: pos.x, y: pos.y,
        dur: 3000, maxDur: 3000, cd: 0, sunT: 0, _dying: false,
      });
    }
    assert(g.probe().plants === 3, '应注入 3 棵坚果', g.probe().plants);

    // 把 3 棵坚果的 dur 压到 1（模拟即将被啃死）
    for (const p of arr) { p.dur = 1; }

    // 3 只僵尸各对应 1 行，放在坚果格内（让 updateZombies 判定为正在啃食）
    for (let r = 0; r < 3; r++) {
      const pos = g.sandbox.gridToPos(col, r);
      g.forceZombieAt('normal', r, pos.x + 10);
    }

    // tick 让啃食发生（每帧 target.dur -= 65*dt；dur=1 → 0.016s 内归零 → _dying → 清理）
    g.tick(0.05);

    const p = g.probe();
    const nutsLeft = p.plantsArr.filter(x => x.type === 'nut').length;
    assert(nutsLeft === 0, '被啃到 dur<=0 的 3 棵坚果应全部被移除', p.plantsArr);
    const dyingLeft = p.plantsArr.filter(x => x._dying).length;
    assert(dyingLeft === 0, 'plants 不应残留 _dying 项（遍历后应已扫尾）', p.plantsArr);
    assert(p.zombies === 3, '3 只僵尸仍应在场上（for...of 错乱会漏迭代）', p.zombies);
  },
};
