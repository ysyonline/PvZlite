#!/usr/bin/env node
/**
 * 代码地图生成器 · tools/gen-code-map.mjs
 *
 * 目的：把单文件游戏 `plants-vs-zombies.html` 的结构（分区 / 函数 / 顶层常量 → 行号区间）
 *      导出成 `docs/code-map.md`，让"改代码"先查表定位，避免每次都全文读取（省 token 的核心手段）。
 *
 * 用法：node tools/gen-code-map.mjs
 *      行号为 HTML 文件内绝对行号，与 Grep / Read 结果直接对齐，可直接用于 Read(offset, limit)。
 *
 * 注意：这是纯读取工具，不修改游戏文件。改完代码重跑一次即可刷新行号。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'plants-vs-zombies.html');
const OUT = path.join(ROOT, 'docs', 'code-map.md');

const raw = fs.readFileSync(SRC, 'utf8');
const lines = raw.split(/\r?\n/);
// 报告用总行数：raw 末尾通常带换行符（如 `</html>\n`），split 会多产出一个尾部空串元素，
// 直接取 lines.length 会 off-by-one。仅修正「报告的总数」这一处；
// 数组下标语义（i+1 / byStart[i].start 等）保持原样——尾部空串位于最后，不影响任何真实行的下标。
const totalLines = raw.endsWith('\n') ? lines.length - 1 : lines.length;

// 只解析 <script> 块内的顶层声明（HTML/CSS 不参与）
const scriptStart = lines.findIndex(l => /<script>/.test(l));
const scriptEnd = lines.findIndex(l => /<\/script>/.test(l));
if (scriptStart < 0 || scriptEnd < 0) {
  console.error('未能在 HTML 中定位 <script> 块');
  process.exit(1);
}

const isTopLevel = (l) => l.length > 0 && !/^[\s}]/.test(l);

/** 取声明上方紧邻的注释作为说明（单个 `//` 行或块注释结尾） */
function descAbove(i) {
  const buf = [];
  for (let k = i - 1; k >= 0 && buf.length < 3; k--) {
    const prev = lines[k].trim();
    if (prev.startsWith('//')) {
      const t = prev.replace(/^\/\/\s?/, '');
      if (/^=+\s*.+?\s*=+$/.test(t)) break;   // 分区标题不算说明
      buf.unshift(t);
    }
    else if (prev === '' && buf.length === 0) continue;
    else break;
  }
  const s = buf.join(' ').replace(/\s+/g, ' ').trim();
  return s.length > 72 ? s.slice(0, 72) + '…' : s;
}

const sections = [];
const entries = [];

for (let i = scriptStart; i <= scriptEnd; i++) {
  const line = lines[i];

  const sec = line.match(/^\/\/\s*=+\s*(.+?)\s*=+\s*$/);
  if (sec) {
    sections.push({ name: sec[1], start: i + 1, desc: '' });
    continue;
  }
  if (!isTopLevel(line)) continue;

  const fn = line.match(/^function\s+([A-Za-z_$][\w$]*)\s*\(/);
  const dec = line.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/);

  if (fn) entries.push({ kind: 'fn', name: fn[1], start: i + 1, desc: descAbove(i) });
  else if (dec) entries.push({ kind: 'const', name: dec[1], start: i + 1, desc: descAbove(i) });
}

// 区间 = 到下一条顶层声明的上一行；分区同理
const byStart = [...entries].sort((a, b) => a.start - b.start);
for (let i = 0; i < byStart.length; i++) {
  byStart[i].end = i + 1 < byStart.length ? byStart[i + 1].start - 1 : scriptEnd;
}
for (let i = 0; i < sections.length; i++) {
  const nextSec = sections[i + 1];
  sections[i].end = (nextSec ? nextSec.start : scriptEnd + 1) - 1;
  sections[i].members = byStart.filter(e => e.start > sections[i].start && e.start <= sections[i].end);
}

const fnCount = entries.filter(e => e.kind === 'fn').length;
const constCount = entries.filter(e => e.kind === 'const').length;
const msg = (s) => `\`${s}\``;

const out = [];
out.push('# 代码地图 · PvZ Lite');
out.push('');
out.push('> **本文件由脚本生成，请勿手改**：`node tools/gen-code-map.mjs`');
out.push(`> 源文件：\`plants-vs-zombies.html\`（${totalLines} 行 · ${fnCount} 个顶层函数 · ${constCount} 个顶层常量 · ${sections.length} 个分区）`);
out.push('> 行号为 HTML 文件内**绝对行号**，可直接喂给 `Read(offset, limit)` 或作为 `Grep` 结果的交叉验证。');
out.push('');
out.push('## 使用规则（省 token 的硬约定）');
out.push('');
out.push('1. **先查表，再 Grep**：知道要改哪个功能 → 在本表定位区块 → 只读该区块，禁止 `Read` 全文。');
out.push('2. **改动只带上下文**：用精确 `Edit`（带唯一前后文），不要为了"看清结构"读整段。');
out.push('3. **改完重跑本脚本**：`node tools/gen-code-map.mjs`，行号即刷新（行号会因插入而漂移）。');
out.push('4. **委托成员施工时给出区块范围**：把"改 X，位于 L≈a-b"写进任务描述，避免成员自行全文搜索。');
out.push('5. 结构性改动（拆分/合并/大搬家）前，先读本表判定影响面。');
out.push('');
out.push('## 一、分区总览');
out.push('');
out.push('| 区块 | 行号区间 | 行数 | 顶层成员数 |');
out.push('|---|---|---|---|');
for (const s of sections) {
  out.push(`| ${s.name} | L${s.start}–L${s.end} | ${s.end - s.start + 1} | ${(s.members || []).length} |`);
}
out.push('');
out.push('## 二、逐区明细');
out.push('');
for (const s of sections) {
  out.push(`### ${s.name} · L${s.start}–L${s.end}`);
  out.push('');
  if (!s.members || s.members.length === 0) {
    out.push('_（无顶层声明，纯逻辑/样式区）_');
    out.push('');
    continue;
  }
  out.push('| 类型 | 名称 | 行号区间 | 说明 |');
  out.push('|---|---|---|---|');
  for (const m of s.members) {
    out.push(`| ${m.kind === 'fn' ? '函数' : '常量'} | ${msg(m.name)} | L${m.start}–L${m.end} | ${m.desc || '—'} |`);
  }
  out.push('');
}
out.push('## 三、高频改动速查（人工维护区）');
out.push('');
out.push('| 想改什么 | 去哪 | 备注 |');
out.push('|---|---|---|');
out.push('| 关卡数值（波次/阳光/僵尸数） | `LEVELS` | 改完跑 SMOKE-011 契约测试 |');
out.push('| 难度倍率（血/速） | `DIFFS` | 与 `STATS` 相乘 |');
out.push('| 僵尸基础属性 | `newWave` 内 `STATS` | hp/spd 基准值 |');
out.push('| 植物卡片（费用/冷却） | `CARDS` | 卡片栏顺序 = 卡片索引 |');
out.push('| 音效合成 | `SFX` | 新增音效后跑 SMOKE-013（调用键必须有定义） |');
out.push('| 屏幕震动 | `triggerShake` / `getShakeOffset` | 上限 6px；结束画面不震（用户偏好） |');
out.push('| 波次推进规则 | `checkWave` | 清场门槛 + 最小喘息 + 25s 兜底，改完跑 SMOKE-012 |');
out.push('| 刷怪节奏 | `processSpawnQueue` | 间隔下限 2.5s |');
out.push('| 主循环/帧异常隔离 | `loop` | gt 外置；异常整帧隔离 |');
out.push('| 渲染入口与震动包裹 | `render` | 新增绘制必须 save/restore |');
out.push('| 大波预警 | `drawWaveWarn` | 时长常量 `WARN_TOTAL` |');
out.push('| 解锁进度存档 | `unlockedLevel` 附近 | localStorage 键 `pvz_unlocked`；URL `?level=N` 直进 |');
out.push('');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.join('\n'), 'utf8');
console.log(`已生成 ${path.relative(ROOT, OUT)}：${totalLines} 行源码 → ${sections.length} 分区 / ${fnCount} 函数 / ${constCount} 常量`);
