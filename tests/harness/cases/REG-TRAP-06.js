/* REG-TRAP-06 · 陷阱 #6：快捷键绑 window 而非 canvas（regression-plan §3.1 · KNOWN-ISSUES #3 指定）
 * 契约：`window.addEventListener('keydown', onKey)`；canvas 上不得注册 keydown。
 * 场景：先让某按钮获得焦点（模拟用户点过暂停/加速后焦点落在按钮上），再派发按键，
 *       快捷键仍须生效（历史上绑 canvas 时焦点一跑到按钮快捷键就全失效）。
 * 反向验证：把 `window.addEventListener('keydown',onKey)` 改成 canvas 版，本用例必须 FAIL。
 */
module.exports = {
  id: 'REG-TRAP-06',
  name: '陷阱#6 · 快捷键绑 window（焦点在按钮上仍生效）',
  seed: 42,
  run({ game: g, assert }) {
    const winL = g.sandbox.winListeners;
    const canvasL = g.sandbox.listeners;

    // ---- 1）绑定目标断言 ----
    assert(typeof winL.keydown === 'function',
      '快捷键必须注册在 window（winListeners.keydown 应为函数）');
    assert(canvasL.keydown === undefined,
      '快捷键不得注册在 canvas（陷阱 #6 根因）', Object.keys(canvasL));

    g.startGame();
    const pauseBtn = g.sandbox.btns && g.sandbox.btns.pause;
    assert(pauseBtn, 'pause 按钮 stub 应存在');

    // ---- 2）焦点在按钮上，从 window 派发 '1' → 选中第 1 张卡 ----
    pauseBtn.focus();
    let prevented = 0;
    winL.keydown({ key: '1', target: pauseBtn, preventDefault() { prevented++; } });
    assert(g.probe().selected && g.probe().selected.i === 0,
      '焦点在按钮上时按 1 仍应选中 index 0', g.probe().selected);
    assert(prevented === 1, '数字快捷键应 preventDefault', prevented);

    // ---- 3）再按同键 → 取消选中 ----
    winL.keydown({ key: '1', target: pauseBtn, preventDefault() {} });
    assert(g.probe().selected === null, '再按同键应取消选中', g.probe().selected);

    // ---- 4）X 铲子快捷键同样生效 ----
    winL.keydown({ key: 'x', target: pauseBtn, preventDefault() {} });
    assert(g.probe().selected && g.probe().selected.shovel === true,
      'X 应选中铲子', g.probe().selected);

    // ---- 5）可编辑元素不劫持（守卫仍在）----
    winL.keydown({ key: '1', target: { tagName: 'INPUT' }, preventDefault() {} });
    assert(g.probe().selected && g.probe().selected.shovel === true,
      'INPUT 目标应被守卫跳过（选中不变）', g.probe().selected);
  },
};
