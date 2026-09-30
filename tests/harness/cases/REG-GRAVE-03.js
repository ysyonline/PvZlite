/* REG-GRAVE-03 · 墓碑被吃后钻怪退化右缘（v2.3.7 · 2026-09-30 用户 2-6 实测反馈）
 * 僵尸只能在墓碑处出现：newWave 生成带 _graveCol 的钻怪队列时墓碑尚在，但到 processSpawnQueue
 * 实际放出时（间隔 ≥2.5s）墓碑可能已被咬碑藤吃掉 ⇒ 该格已无墓碑的僵尸应退化屏幕右缘入场
 * （演出降级、功能不降级，与 elvis 同款），杜绝「没有墓碑的地方也爬出僵尸」。
 * 断言：
 *   1. 墓碑全吃后，newWave 放出的所有僵尸 x 均 ≥ 右缘（canvas.width-40）——无一从墓碑列钻出。
 *   2. 对照：墓碑仍在时，钻怪僵尸可从墓碑列钻出（x < 右缘）——证明退化逻辑只在墓碑消失时触发。
 * ★ 判别性：删除 processSpawnQueue 的 _graveAlive 校验 ⇒ 墓碑全吃后仍有僵尸从墓碑列钻出必红。
 */
module.exports = {
  id: 'REG-GRAVE-03',
  name: '墓碑被吃后钻怪退化右缘（僵尸只在墓碑处出现）',
  seed: 7,
  run({ game: g, assert }) {
    const S = g.sandbox;
    const { COLS, CELL_W, GRID_X, CANVAS_W } = S.__consts;
    const rightEdge = CANVAS_W - 40;

    // ---- 1) 墓碑全吃 → 全部退化右缘 ----
    g.setLevel('2-1');
    g.startGame();
    S.__SFX.wave = function () {};   // newWave 内 SFX.wave 打桩
    S.newWave(5);                     // W5 钻怪概率 30% 全额（墓碑多时大概率有钻怪）
    const qBefore = g.probe().spawnQueueArr.length;
    assert(qBefore > 0, '前置：newWave(5) 应生成队列', qBefore);
    // 吃掉所有墓碑
    const graves = S.__level.graves.map(gg => [gg[0], gg[1]]);
    for (const [c, r] of graves) S.removeGrave(c, r);
    // 放出所有僵尸（大 dt 让 spawnTimer 快速耗尽，一次放一只）
    let guard = 0;
    while (g.probe().spawnQueueArr.length > 0 && guard++ < 300) {
      S.processSpawnQueue(3.0);
    }
    const zs1 = g.probe().zombiesArr;
    assert(zs1.length > 0, '墓碑全吃后应仍有僵尸放出（base 僵尸不受影响）', zs1.length);
    let allRight = true;
    for (const z of zs1) if (z.x < rightEdge) { allRight = false; break; }
    assert(allRight, '墓碑全吃后所有僵尸应退化右缘（无一从墓碑列钻出）', zs1.map(z => Math.round(z.x)));

    // ---- 2) 对照：墓碑仍在 → 钻怪可从墓碑列钻出 ----
    g.setLevel('2-1');
    g.startGame();
    S.__SFX.wave = function () {};
    // 反复 newWave 直到观察到墓碑钻怪（队列溢出 base 数，REG-GRAVE-01 §3 手法）
    let spawnedFromGrave = false, trials = 0;
    while (trials++ < 60 && !spawnedFromGrave) {
      S.newWave(5);
      // 用大 dt 让 spawnTimer 快速耗尽，一次放一只；killZombie 清僵尸但不清 spawnQueue
      let g2 = 0;
      while (g.probe().spawnQueueArr.length > 0 && g2++ < 200 && !spawnedFromGrave) {
        S.processSpawnQueue(3.0);
        const pz = g.probe().zombiesArr;
        for (const z of pz) {
          if (z.x < rightEdge) { spawnedFromGrave = true; break; }   // 墓碑列钻出（x < 右缘）
          S.killZombie(z);
        }
      }
      // 清场（含 spawnQueue）准备下一轮
      g.clearField();
    }
    assert(spawnedFromGrave,
      '对照：墓碑仍在时钻怪应从墓碑列钻出（x < 右缘）——证明退化只在墓碑消失时触发', { trials });
  },
};