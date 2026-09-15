/* ============================================================
 * PvZ Lite · 烟雾测试一键入口
 * ------------------------------------------------
 * 跑法（Node 直接执行）：
 *   node tests/harness/run-smoke.js
 *
 * 行为：
 *   1. 扫描 tests/harness/cases/SMOKE-*.js（按文件名升序）
 *   2. 每个用例：全新 loadGame + 独立 sandbox（互不污染）
 *   3. 输出 PASS/FAIL + 每条耗时(ms) + 失败详情
 *   4. 全绿 exit 0；有 FAIL exit 1（可供 CI / pre-commit 门控）
 *
 * 用例文件约定：导出 module.exports = { id, name, seed, run(ctx) }
 *   ctx = { game, loadGame, assert, seeded }
 *   assert(cond, msg, extra) 不通过即抛 Error，run() 内捕获记为 FAIL
 * ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');
const { loadGame, SeededRNG, DEFAULT_SEED } = require('./index.js');

const CASES_DIR = path.join(__dirname, 'cases');

// 收集 SMOKE-*.js（按文件名排序，SMOKE-001 → SMOKE-010）
function collectCases() {
  const files = fs.readdirSync(CASES_DIR)
    .filter(f => /^SMOKE-\d{3}\.js$/.test(f))
    .sort();
  return files.map(f => ({ file: f, mod: require(path.join(CASES_DIR, f)) }));
}

// 轻量断言：失败即抛，带上下文
function makeAssert(caseId) {
  return function assert(cond, msg, extra) {
    if (!cond) {
      let detail = msg || '(no message)';
      if (extra !== undefined) {
        try { detail += '  ::  ' + JSON.stringify(extra); } catch (e) { detail += '  ::  ' + String(extra); }
      }
      throw new Error(`[${caseId}] 断言失败: ${detail}`);
    }
  };
}

function runAll() {
  const cases = collectCases();
  const results = [];
  const t0 = Date.now();

  for (const { file, mod } of cases) {
    const start = Date.now();
    let verdict = 'PASS';
    let detail = '';
    try {
      // 每用例全新 game（确定性种子来自用例声明，缺省 DEFAULT_SEED）
      const seed = mod.seed != null ? mod.seed : DEFAULT_SEED;
      const game = loadGame({ seed });
      const assert = makeAssert(mod.id || file);
      const ctx = { game, loadGame, assert, seed, seeded: (n) => game.seed(n) };
      mod.run(ctx);
    } catch (e) {
      verdict = 'FAIL';
      detail = e && e.stack ? e.stack.split('\n').slice(0, 6).join('\n') : String(e);
    }
    const ms = Date.now() - start;
    results.push({ id: mod.id || file, name: mod.name || file, file, verdict, ms, detail });
  }

  const totalMs = Date.now() - t0;
  const passed = results.filter(r => r.verdict === 'PASS').length;
  const failed = results.length - passed;

  // ---- 输出 ----
  console.log('');
  console.log('════════════════════════════════════════════════════');
  console.log(' PvZ Lite · SMOKE 烟雾测试（' + results.length + ' 条，目标 < 5s）');
  console.log('════════════════════════════════════════════════════');
  for (const r of results) {
    const mark = r.verdict === 'PASS' ? '✅' : '❌';
    console.log(` ${mark} ${r.id}  ${r.name}  (${r.ms}ms)`);
    if (r.verdict === 'FAIL') {
      console.log('   └─ ' + r.detail.split('\n').join('\n     '));
    }
  }
  console.log('────────────────────────────────────────────────────');
  const ok = failed === 0;
  console.log(` 结果: ${passed}/${results.length} PASS${failed ? ` · ${failed} FAIL` : ''}  ·  总耗时 ${totalMs}ms`);
  console.log(' 门控: ' + (ok ? 'PASS（全绿，允许 commit）' : 'FAIL（有阻塞项，未达 QA）'));
  console.log('════════════════════════════════════════════════════');

  process.exitCode = ok ? 0 : 1;
  return { results, totalMs, ok };
}

if (require.main === module) {
  runAll();
}

module.exports = { runAll, collectCases };
