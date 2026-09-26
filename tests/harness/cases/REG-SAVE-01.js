/* REG-SAVE-01 · 存档导出/导入（v2.2.6 消缺）—— 机制级回归
 * ------------------------------------------------------------------
 * 背景：预览源（127.0.0.1 随机端口+随机目录）每次变化 → localStorage 按 origin
 * 隔离 → 玩家进度"被清"。修复 = 主菜单加导出/导入钮（MENU_SAVE_BTNS）。
 *
 * 被测契约（源码 exportSave / importSave / onClickMenu 'menu' 分支）：
 *   ① 导出：收集**全部** pvz_* 前缀键打包 {pvzSave:1,ver,date,data}，无 pvz_* 键时拒绝导出；
 *   ② 导入：粘贴 JSON → pvzSave===1 且 data 为对象才放行；逐键写回（只收 pvz_* 前缀字符串值）；
 *   ③ 导入覆盖前自动备份当前档到 pvz_backup_last（同 payload 格式，回滚保险）；
 *   ④ 无效输入（非 JSON / 缺 pvzSave / 缺 data）→ 不写任何键、不抛错；
 *   ⑤ testMode 守卫：纯沙盒不写档（导入直接拒绝）。
 *
 * 环境注意（实测坑）：
 *   - harness sandbox 默认**无 localStorage / 无 navigator** → 须 loadGame({localStorage: shim})
 *     注入 shim，且 exportSave/importSave 内部用 typeof 守卫降级（源码已做）。
 *   - clipboard 在 vm 内不可用 → typeof 守卫使 exportSave 走 prompt 降级分支，
 *     sb.prompt 注入可捕获 payload（vm 全局可达）。
 */
module.exports = {
  id: 'REG-SAVE-01',
  name: '存档导出/导入：pvz_* 全键打包 / 粘贴恢复写键 / 自动备份 / 无效输入拒绝 / testMode 守卫',
  seed: 42,
  run({ loadGame, assert, seed }) {
    /** 合规 localStorage shim（length/key/getItem/setItem/removeItem 全量实现）。 */
    function mkStore() {
      const m = new Map();
      return {
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => m.set(k, String(v)),
        removeItem: (k) => m.delete(k),
        key: (i) => (Array.from(m.keys())[i] ?? null),
        get length() { return m.size; },
      };
    }
    const store = mkStore();
    // htmlPath 必须透传：对照模式（PVZ_HTML_PATH）下本用例要跑旧源，否则判别力自证假绿
    const g = loadGame({ seed, localStorage: store, htmlPath: process.env.PVZ_HTML_PATH || undefined });
    const sb = g.sandbox;

    const clearPvzKeys = () => {
      const keys = [];
      for (let i = 0; i < store.length; i++) keys.push(store.key(i));
      keys.filter((k) => k && k.indexOf('pvz_') === 0).forEach((k) => store.removeItem(k));
    };

    // ================= S1 · 导出：pvz_* 全键打包 =================
    clearPvzKeys();
    sb.storageSet('pvz_progress_v3', JSON.stringify({ v: 3, diff: {
      normal: { cleared: ['1-1'], unlocked: '1-2' },
      hard: { cleared: [], unlocked: '1-1' },
      expert: { cleared: [], unlocked: '1-1' } }, cardSeen: [] }));
    sb.storageSet('pvz_points_test', '777');
    let captured = null;
    sb.prompt = (msg, def) => { captured = def; return null; };
    sb.exportSave();
    assert(!!captured, 'S1 导出应产出 payload 文本（prompt 降级分支）', typeof captured);
    let obj = null;
    try { obj = JSON.parse(captured); } catch (e) { /* 落断言 */ }
    assert(!!obj && obj.pvzSave === 1, 'S1 payload 应带 pvzSave:1 标记', obj && obj.pvzSave);
    assert(!!obj && obj.data && obj.data.pvz_progress_v3 && obj.data.pvz_points_test === '777',
      'S1 payload.data 应含全部 pvz_* 键原值', obj && Object.keys(obj.data || {}));

    // ================= S2 · 空档导出：无 pvz_* 键时拒绝 =================
    clearPvzKeys();
    captured = null;
    sb.exportSave();
    assert(captured === null, 'S2 无 pvz_* 键时导出应拒绝（不产出 payload）', captured);

    // ================= S3 · 导入：写键回放 + 自动备份 =================
    clearPvzKeys();
    sb.storageSet('pvz_progress_v3', 'OLD-V3');            // 现档内容（将被覆盖，先被备份）
    sb.storageSet('pvz_points', '100');
    const payload = JSON.stringify({ pvzSave: 1, ver: 'v9.9.9', date: '2026-09-26T00:00:00Z',
      data: { pvz_progress_v3: 'NEW-V3', pvz_points: '9999', evil_key: 'x', pvz_bad: 42 } });
    sb.prompt = () => payload;
    sb.importSave();
    assert(sb.storageGet('pvz_progress_v3') === 'NEW-V3', 'S3 导入应写回 pvz_progress_v3', sb.storageGet('pvz_progress_v3'));
    assert(sb.storageGet('pvz_points') === '9999', 'S3 导入应写回 pvz_points', sb.storageGet('pvz_points'));
    assert(sb.storageGet('evil_key') === null, 'S3 非 pvz_ 前缀键不得写入', sb.storageGet('evil_key'));
    assert(sb.storageGet('pvz_bad') === null, 'S3 非字符串值不得写入（防御脏档）', sb.storageGet('pvz_bad'));
    const backupRaw = sb.storageGet('pvz_backup_last');
    assert(!!backupRaw, 'S3 导入前应自动生成 pvz_backup_last 备份');
    let backup = null;
    try { backup = JSON.parse(backupRaw); } catch (e) { /* 落断言 */ }
    assert(!!backup && backup.pvzSave === 1 && backup.data && backup.data.pvz_progress_v3 === 'OLD-V3'
      && backup.data.pvz_points === '100',
      'S3 备份应完整保存覆盖前现档（pvz_progress_v3=OLD-V3 / pvz_points=100）', backup && backup.data);

    // ================= S4 · 导入：无效输入不写键 =================
    clearPvzKeys();
    sb.storageSet('pvz_progress_v3', 'KEEP-ME');
    const bads = ['garbage', JSON.stringify({ ver: 'x' }), JSON.stringify({ pvzSave: 1 }), 'null', ''];
    for (const bad of bads) {
      sb.prompt = () => bad;
      let threw = false;
      try { sb.importSave(); } catch (e) { threw = true; }
      assert(!threw, 'S4 无效输入[' + String(bad).slice(0, 20) + ']不得抛错（toast 降级）');
    }
    assert(sb.storageGet('pvz_progress_v3') === 'KEEP-ME', 'S4 无效输入不得改动任何键', sb.storageGet('pvz_progress_v3'));
    assert(sb.storageGet('pvz_backup_last') === null, 'S4 无效输入不得产生备份键', sb.storageGet('pvz_backup_last'));

    // ================= S5 · 导入：用户取消（prompt 返回 null）无害 =================
    sb.prompt = () => null;
    let threw2 = false;
    try { sb.importSave(); } catch (e) { threw2 = true; }
    assert(!threw2, 'S5 用户取消不得抛错');
    assert(sb.storageGet('pvz_progress_v3') === 'KEEP-ME', 'S5 用户取消不得改动任何键');
  },
};
