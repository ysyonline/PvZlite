#!/usr/bin/env node
/* ============================================================
 * PvZ Lite · 四门控一键批量入口（v2.0.0 起用）
 * ------------------------------------------------
 * 背景（2026-09-23 用户要求）：批量验证必须节流，只在里程碑收尾
 * （T-106/T-206/T-303/T-405/T-503）跑一次，且一条命令跑完，
 * 禁止逐个散跑四个门控脚本浪费资源与时间。
 *
 * 跑法（Node 直接执行）：
 *   node tests/harness/run-gates.js            # 四门控全跑
 *   node tests/harness/run-gates.js --quick    # 跳过 bench（约省 30-60s）
 *
 * 内容：
 *   1. run-all.js --all   → SMOKE 29 + REG 58 = 87/87
 *   2. verify-bus.js      → 音频总线 56/56
 *   3. perf/bench.js      → 五场景 PASS（--quick 跳过）
 *
 * 行为：
 *   - 汇总四门控结果，全绿 exit 0，任一 FAIL exit 1
 *   - bench 会回填 docs/architecture/perf-profile.md（幂等覆盖，预期内）
 *   - 除 bench 的 perf-profile 回填外不写任何文件
 * ============================================================ */

'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const NODE = process.execPath;
const HARNESS = __dirname;
const BENCH = path.join(HARNESS, '..', 'perf', 'bench.js');

const QUICK = process.argv.slice(2).includes('--quick');

const gates = [
  { id: 'FULL', desc: 'SMOKE 29 + REG 58（run-all.js --all）', args: [path.join(HARNESS, 'run-all.js'), '--all'], cwd: HARNESS },
  { id: 'BUS', desc: '音频总线 56/56（verify-bus.js）', args: [path.join(HARNESS, 'verify-bus.js')], cwd: HARNESS },
];
if (!QUICK) {
  gates.push({ id: 'BENCH', desc: 'bench 五场景（perf/bench.js，回填 perf-profile）', args: [BENCH], cwd: path.dirname(BENCH) });
}

console.log('════════════════════════════════════════════════════');
console.log(' PvZ Lite · 四门控一键批量' + (QUICK ? '（--quick，跳过 bench）' : ''));
console.log('════════════════════════════════════════════════════');

const results = [];
const t0 = Date.now();

for (const g of gates) {
  const start = Date.now();
  process.stdout.write(` ▶ ${g.id}  ${g.desc} ... `);
  const r = spawnSync(NODE, g.args, { cwd: g.cwd, encoding: 'utf8', timeout: 300000 });
  const ms = Date.now() - start;
  const ok = r.status === 0;
  results.push({ id: g.id, ok, ms });

  // 摘要：取脚本输出的关键行（结果/门控/判级行），避免整屏刷
  const out = (r.stdout || '') + (r.stderr || '');
  const keyLines = out.split('\n').filter(l =>
    /结果:|门控:|PASS|FAIL|判级|已回填/.test(l) && !/✅/.test(l)
  ).slice(0, 4);
  console.log(ok ? `✅ (${ms}ms)` : `❌ exit=${r.status} (${ms}ms)`);
  for (const l of keyLines) console.log('   │ ' + l.trim());
  if (r.error) console.log('   │ 启动失败: ' + r.error.message);
}

const totalMs = Date.now() - t0;
const failed = results.filter(r => !r.ok);

console.log('────────────────────────────────────────────────────');
console.log(` 各门控: ${results.map(r => `${r.id} ${r.ok ? '✅' : '❌'}`).join('  ·  ')}  ·  总耗时 ${totalMs}ms`);
console.log(' 批量门控: ' + (failed.length === 0 ? 'PASS（全绿）' : `FAIL（${failed.map(f => f.id).join('/')} 阻塞）`));
console.log('════════════════════════════════════════════════════');

process.exitCode = failed.length === 0 ? 0 : 1;
