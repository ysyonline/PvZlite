/* REG-SKIN-03 · v2.4.2 P1 皮肤系统：drawPlantSkin 函数自证 + 路由判别力（GDD §2.2.5）
 * 断言：
 *   §1 drawPlantSkin 挂全局可调用，8 个皮肤 id 各返回 true（自证不退化到默认绘制）
 *   §2 未知 skinId → 返回 false（外层 fallback 走默认绘制）
 *   §3 drawPlantSkin 产生绘制调用（fillRect/arc/strokeRect 至少 3 条——若非空的返回 true）
 *   §4 cherry_phantom 设置 globalAlpha < 1（半透明特效判据）
 *   §5 cherry_phantom restore 后 globalAlpha 复位为 1
 */
module.exports = {
  id: 'REG-SKIN-03',
  name: 'P1 皮肤系统：drawPlantSkin 8 款自证 + 判别力（v2.4.2）',
  seed: 42,
  run({ loadGame, assert }) {
    const g = loadGame({ seed: 42 });
    const api = g.sandbox.__api;
    const DL = g.sandbox.__drawLog;
    assert(Array.isArray(DL), '§1 前置：__drawLog 挂桥');

    const fn = g.sandbox.__api.__drawPlantSkin;
    assert(typeof fn === 'function', '§1 drawPlantSkin 应挂桥可调用');

    const SKIN_IDS = ['pea_gold','pea_shadow','sunflower_honey','nut_iron','melon_jade','cherry_phantom','snowpea_aurora','cabbage_autumn'];
    const fakePlant = { type: 'pea', col: 3, row: 2, dur: 100, maxDur: 100 };

    // ---- §1 所有 8 款返回 true ----
    for (const sid of SKIN_IDS) {
      const DL0 = DL.length;
      const ret = fn(fakePlant, 400, 300, sid);
      assert(ret === true, '§1 drawPlantSkin("'+sid+'") 应返回 true', ret);
      const nCalls = DL.length - DL0;
      assert(nCalls >= 3, '§1 "'+sid+'" 应产生 ≥3 条绘制调用（皮肤非空绘制）', nCalls);
    }

    // ---- §2 未知 id → false ----
    const DL2 = DL.length;
    const ret2 = fn(fakePlant, 400, 300, 'bogus_skin');
    assert(ret2 === false, '§2 未知 skinId 应返回 false（外部 fallback）', ret2);
    assert(DL.length === DL2, '§2 未知 skinId 不产生绘制调用', { before: DL2, after: DL.length });

    // ---- §3 校验 skin_id 与 plantType 不匹配时仍然绘制（商店买的皮肤就能装备，不管植物） ----
    // 用 'pea_gold' 皮肤画 type='sunflower' 的植物——皮肤只读 id 不走 switch case 的分支匹配，实际是纯绘制。
    // 此断言锁住「皮肤绘制不检查 plantType」这个设计事实（防止某人后来加 type 守卫导致装备后不画）。
    const fakeSun = { type: 'sunflower', col: 3, row: 2, dur: 100, maxDur: 100 };
    const DL3 = DL.length;
    const ret3 = fn(fakeSun, 400, 300, 'pea_gold');
    assert(ret3 === true, '§3 pea_gold 皮肤仍返回 true（即使 plant.type≠pea）', ret3);
    assert(DL.length > DL3, '§3 皮肤绘制不阻塞非匹配植物类型', DL.length - DL3);

    // ---- §4 cherry_phantom 半透明特效判据 ----
    const DL4 = DL.length;
    fn(fakePlant, 400, 300, 'cherry_phantom');
    const since4 = DL.slice(DL4);
    const alphaSets = since4.filter(c => c[0] === 'setGlobalAlpha');
    assert(alphaSets.length >= 1, '§4 cherry_phantom 应设置 globalAlpha', alphaSets);
    const lastAlpha = alphaSets[alphaSets.length - 1][1];
    assert(typeof lastAlpha === 'number' && lastAlpha < 1, '§4 cherry_phantom 应设 globalAlpha < 1（半透明）', lastAlpha);
    // save/restore 成对（幽灵尾光走 save/translate/rotate/restore 特效路径，save 次数 ≥ restore 次数）
    const saves = since4.filter(c => c[0] === 'save').length;
    const restores = since4.filter(c => c[0] === 'restore').length;
    assert(saves >= 1 && restores >= 1 && saves === restores, '§5 cherry_phantom save/restore 应成对', { saves, restores });
  },
};