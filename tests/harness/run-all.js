/* ============================================================
 * PvZ Lite · 回归测试一键入口
 * ------------------------------------------------
 * 跑法（Node 直接执行）：
 *   node tests/harness/run-all.js            # 只跑 REG-*（发布前回归）
 *   node tests/harness/run-all.js --all      # 跑 SMOKE-* + REG-*（完整）
 *   node tests/harness/run-all.js --smoke    # 只跑 SMOKE-*
 *
 * 行为：
 *   1. 扫描 tests/harness/cases/ 下的 SMOKE-*.js / REG-*.js
 *   2. 每个用例：全新 loadGame + 独立 sandbox（互不污染）
 *   3. 输出 PASS/FAIL + 每条耗时(ms) + 失败详情 + 总耗时
 *   4. 全绿 exit 0；有 FAIL exit 1（可供 CI / pre-commit 门控）
 *
 * 环境变量：
 *   PVZ_HTML_PATH  覆盖源文件路径（对照验证用：拿旧版本文件跑同一用例）
 *
 * 用例文件约定：导出 module.exports = { id, name, seed, run(ctx) }
 *   ctx = { game, loadGame, assert, seed, seeded }
 * ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');
const { loadGame, SeededRNG, DEFAULT_SEED } = require('./index.js');

const CASES_DIR = path.join(__dirname, 'cases');

// 收集用例：默认 REG-*；--all 含 SMOKE-*；--smoke 仅 SMOKE-*
function collectCases(mode) {
  const files = fs.readdirSync(CASES_DIR).filter(f => {
    if (mode === 'smoke') return /^SMOKE-\d{3}\.js$/.test(f);
    if (mode === 'all') return /^(SMOKE|REG)-[A-Z0-9-]+\.js$/.test(f);
    return /^REG-[A-Z0-9-]+\.js$/.test(f);
  });
  // SMOKE 在前，REG 按文件名升序
  files.sort((a, b) => {
    const ra = a.startsWith('SMOKE') ? 0 : 1;
    const rb = b.startsWith('SMOKE') ? 0 : 1;
    return ra - rb || a.localeCompare(b);
  });
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

function runAll(mode) {
  const cases = collectCases(mode);
  const results = [];
  const t0 = Date.now();

  for (const { file, mod } of cases) {
    const start = Date.now();
    let verdict = 'PASS';
    let detail = '';
    try {
      const seed = mod.seed != null ? mod.seed : DEFAULT_SEED;
      const game = loadGame({ seed, htmlPath: process.env.PVZ_HTML_PATH || undefined });
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

  const title = mode === 'smoke' ? 'SMOKE' : mode === 'all' ? 'SMOKE + REG' : 'REG';
  console.log('');
  console.log('════════════════════════════════════════════════════');
  console.log(` PvZ Lite · ${title} 回归用例（${results.length} 条）`);
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
  console.log(' 门控: ' + (ok ? 'PASS（全绿）' : 'FAIL（有阻塞项）'));
  console.log('════════════════════════════════════════════════════');

  process.exitCode = ok ? 0 : 1;
  return { results, totalMs, ok };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const mode = argv.includes('--all') ? 'all' : argv.includes('--smoke') ? 'smoke' : 'reg';
  runAll(mode);
}

module.exports = { runAll, collectCases };
