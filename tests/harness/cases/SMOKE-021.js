/* SMOKE-021 · 内嵌版本号（V11-05 · KNOWN-ISSUES #6）
 * 覆盖：
 *   1) 源码内嵌 VERSION 常量（静态）
 *   2) 启动时 console.log 输出版本号（捕获 loadGame 期间的日志）
 *   3) 菜单页绘制 VERSION（静态：drawMenu 内有 fillText(VERSION)）
 *   4) 真 loop 帧（menu 态，含版本小字绘制）→ console.error 监视网零帧异常
 *      （render 层改动不会被逻辑层烟雾测试抓到，故此处用真帧 + 日志网兜底，参考 SMOKE-010）
 */
const fs = require('fs');
const path = require('path');

function readGameSource() {
  const p = process.env.PVZ_HTML_PATH
    || path.resolve(__dirname, '..', '..', '..', 'plants-vs-zombies.html');
  return fs.readFileSync(p, 'utf8');
}

module.exports = {
  id: 'SMOKE-021',
  name: '内嵌版本号（源码常量 + 启动日志 + 菜单渲染无帧异常）',
  seed: 42,
  run({ loadGame, assert }) {
    // ---- 1) 静态：VERSION 常量存在且形如 v* ----
    const src = readGameSource();
    const m = src.match(/const VERSION\s*=\s*'([^']+)'/);
    assert(m && m[1], '源码应内嵌 `const VERSION=\'...\'`', m && m[0]);
    const version = m[1];
    assert(/^v\d/.test(version), 'VERSION 应以 v+数字 开头', version);

    // ---- 3) 静态：菜单渲染确有使用 VERSION ----
    assert(/ctx\.fillText\(VERSION/.test(src),
      'drawMenu 应绘制 VERSION（页面角落小字）');

    // ---- 2) 启动日志：捕获 loadGame 期间的 console.log ----
    const logs = [];
    const origLog = console.log;
    let g;
    console.log = function () { logs.push(Array.prototype.slice.call(arguments).join(' ')); };
    try {
      g = loadGame({ seed: 42 });
    } finally {
      console.log = origLog;
    }
    assert(logs.some(l => l.includes(version)),
      '启动应 console.log 输出版本号', logs);
    assert(g.sandbox.__VERSION === version,
      'sandbox VERSION 桥应等于源码常量', g.sandbox.__VERSION);

    // ---- 4) 真 loop 帧（menu 态）→ 零帧异常 ----
    assert(g.probe().state === 'menu', '前置：应处于 menu 态', g.probe().state);
    const errs = [];
    const origErr = console.error;
    console.error = function () { errs.push(Array.prototype.slice.call(arguments).map(String).join(' ')); };
    try {
      const f = g.rafQueue.shift();
      assert(f, 'rafQueue 应有待跑帧（loop 自续订中）');
      f(16.7);                       // 跑一帧真 loop → drawMenu（含版本小字）
    } finally {
      console.error = origErr;
    }
    assert(errs.length === 0, 'menu 渲染（含版本小字）不得抛帧异常', errs);
  },
};
