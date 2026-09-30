/* REG-GRAVE-02 · 墓碑重生机制契约（v2.3.7 · 2026-09-29 用户拍板）
 * 墓碑被吃光后，倒数 2 波开始时从地面随机生成 1~2 座新碑。
 * 断言四件事：
 *   1. 触发窗口：仅倒数 GRAVE_RESPAWN_WAVES 波（wave >= totalWaves-GRAVE_RESPAWN_WAVES+1）触发；
 *      非倒数波（如 W1）调用 graveRespawn 零新增。
 *   2. 落点约束：新碑列 ⊂ [GRAVE_RESPAWN_COL_MIN, COLS)（排除 c0~c3）、行 ⊂ [0,ROWS)、
 *      与已有植物/墓碑格不重叠（去重）。
 *   3. 数量：单次触发新增 1~2 座（GRAVE_RESPAWN_MIN~MAX）。
 *   4. 与既有机制兼容：新碑可被 removeGrave 清除（唯一写入点）；newWave 墓碑钻怪循环遍历
 *      level.graves ⇒ 新碑当波即可参与钻怪判定（不触碰 GRAVES_MASTER，母表只记初始点位）。
 *   5. 非世界 2（无 graves）不重生：level.graves 为 null 时调用零副作用。
 * ★ 判别性：删除 newWave 内 graveRespawn(n) 调用 ⇒ 倒数波 graves 长度不再增长必红；
 *   删除落点约束（col<4 放行）⇒ 出现 c0~c3 新碑必红。
 */
module.exports = {
  id: 'REG-GRAVE-02',
  name: '墓碑重生：倒数2波随机生成新碑（v2.3.7）',
  seed: 7,
  run({ game: g, assert }) {
    const S = g.sandbox;
    const LV = S.__LEVELS;
    const gr = S.graveRespawn;
    const rm = S.removeGrave;
    const { COLS, ROWS } = S.__consts;
    const C = S.__consts;
    assert(gr && typeof gr === 'function', 'graveRespawn 应可直达（顶层 function）');
    assert(C.GRAVE_RESPAWN_WAVES === 2, 'GRAVE_RESPAWN_WAVES 应为 2（倒数 2 波）', C.GRAVE_RESPAWN_WAVES);
    assert(C.GRAVE_RESPAWN_MIN === 1 && C.GRAVE_RESPAWN_MAX === 2,
      'GRAVE_RESPAWN_MIN/MAX 应为 1/2（每波随机 1~2 座）', [C.GRAVE_RESPAWN_MIN, C.GRAVE_RESPAWN_MAX]);
    assert(C.GRAVE_RESPAWN_COL_MIN === 4, 'GRAVE_RESPAWN_COL_MIN 应为 4（排除 c0~c3）', C.GRAVE_RESPAWN_COL_MIN);

    // ---- 1) 触发窗口 + 数量 + 落点约束 ----
    // 用 2-10（世界 2 夜关，graves 存在，totalWaves 由模板决定）做宿主
    g.setLevel('2-10');
    g.startGame();
    const totalWaves = S.__level.totalWaves;
    assert(totalWaves >= 2, '前置：2-10 totalWaves 应 ≥2', totalWaves);

    // 非倒数波：W1 调用 → 零新增
    const before1 = S.__level.graves.length;
    gr(1);
    assert(S.__level.graves.length === before1,
      '非倒数波（W1）调用 graveRespawn 应零新增', [before1, S.__level.graves.length]);

    // 倒数第 2 波：wave = totalWaves-1 触发
    const before2 = S.__level.graves.length;
    const added2 = gr(totalWaves - 1);
    assert(added2 >= C.GRAVE_RESPAWN_MIN && added2 <= C.GRAVE_RESPAWN_MAX,
      '倒数第 2 波应新增 1~2 座', added2);
    assert(S.__level.graves.length === before2 + added2,
      '倒数第 2 波后 graves 长度应 +added2', [before2, S.__level.graves.length]);

    // 最后一波：wave = totalWaves 触发
    const before3 = S.__level.graves.length;
    const added3 = gr(totalWaves);
    assert(added3 >= C.GRAVE_RESPAWN_MIN && added3 <= C.GRAVE_RESPAWN_MAX,
      '最后一波应新增 1~2 座', added3);
    assert(S.__level.graves.length === before3 + added3,
      '最后一波后 graves 长度应 +added3', [before3, S.__level.graves.length]);

    // ---- 2) 落点约束（仅对「新增」墓碑断言；初始碑可落 c0~c3，约束只约束重生新碑）----
    // 收集本局全部墓碑，校验行值域 + 去重；列约束只对 before2 之后新增的碑断言
    const graves = S.__level.graves;
    const seen = new Set();
    let rowViolation = false, dup = false;
    for (const [gc, grr] of graves) {
      if (!(grr >= 0 && grr < ROWS)) rowViolation = true;
      const key = gc + ',' + grr;
      if (seen.has(key)) dup = true;
      seen.add(key);
    }
    assert(!rowViolation, '全部墓碑行应 ⊂ [0,ROWS)', graves);
    assert(!dup, '墓碑点位应去重（新碑不与已有碑/植物重叠）', graves);
    // 新增碑（before2 起）列约束
    const newGraves = graves.slice(before2);   // 倒数第 2 波起新增的碑
    assert(newGraves.length >= 1, '应有新碑可测', newGraves.length);
    let colViolation = false;
    for (const [gc] of newGraves) if (gc < C.GRAVE_RESPAWN_COL_MIN) colViolation = true;
    assert(!colViolation, '新增墓碑列应 ≥ GRAVE_RESPAWN_COL_MIN（无 c0~c3 新碑）', newGraves);

    // ---- 3) 与 removeGrave 兼容：新碑可被清除 ----
    const [nc, nr] = newGraves[0];
    const rmRes = rm(nc, nr);
    assert(rmRes === true, '新碑应可被 removeGrave 清除', rmRes);
    assert(!S.__level.graves.some(gg => gg[0] === nc && gg[1] === nr),
      '清除后新碑应从 level.graves 移除', [nc, nr]);

    // ---- 4) newWave 集成：倒数波 newWave 会先补新碑（graves 增长）----
    // 重置一局，直接 newWave(totalWaves-1)（倒数第 2 波），断言 graves 长度增长
    g.setLevel('2-10');
    g.startGame();
    const baseGraves = S.__level.graves.length;
    // 打桩 SFX.wave（无 AudioContext 环境为 no-op 表，REG-GATE-01 同款手法）
    S.__SFX.wave = function () {};
    S.newWave(totalWaves - 1);
    const afterWave = S.__level.graves.length;
    assert(afterWave > baseGraves,
      'newWave(倒数第2波) 应先补新碑（graves 长度增长）', [baseGraves, afterWave]);

    // ---- 5) 非世界 2（无 graves）零副作用 ----
    g.setLevel('1-1');
    g.startGame();
    const noGrave = S.__level.graves;
    assert(noGrave === null || noGrave === undefined, '前置：1-1 应无 graves', noGrave);
    const ret1 = gr(1), ret2 = gr(5);
    assert(ret1 === undefined && ret2 === undefined,
      '非世界 2 调用 graveRespawn 应零副作用（返回 undefined）', [ret1, ret2]);
  },
};
