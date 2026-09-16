/* SMOKE-013 · SFX 调用完整性（防「调用了未定义的音效」导致帧异常）
 * 背景：2026-09-16 发现 SFX.bigWaveImpact() 被调用但 SFX 表未定义 →
 *   每次大波真正刷怪那一帧抛 TypeError，被 loop 整帧 try/catch 吞掉 →
 *   玩家看到底部红色报错条 + 丢一帧（静默降级掩盖了 bug）。
 * 本用例做两层防护：
 *   1) 静态：源码里所有 SFX.<key> 调用点，必须在 SFX 对象字面量里定义
 *   2) 运行：真跑「大波预警倒计时结束 → 刷怪」分支，断言不抛异常且 wave 正常推进
 */
const fs = require('fs');
const path = require('path');

function readGameSource() {
  // 默认读正式游戏文件；PVZ_HTML_PATH 可用于对照验证（拿旧版本文件跑同一用例）
  const p = process.env.PVZ_HTML_PATH
    || path.resolve(__dirname, '..', '..', '..', 'plants-vs-zombies.html');
  return fs.readFileSync(p, 'utf8');
}

module.exports = {
  id: 'SMOKE-013',
  name: 'SFX 调用完整性（未定义音效 = 帧异常）',
  seed: 42,
  run({ game: g, assert }) {
    // ---------- 1) 静态：调用键 ⊆ 定义键 ----------
    const src = readGameSource();
    const sfxBlock = src.slice(src.indexOf('const SFX={'), src.indexOf('// 统一包一层'));
    assert(sfxBlock.length > 0, '应能定位 SFX 定义块');

    const defined = new Set(
      (sfxBlock.match(/^\s{2}([a-zA-Z][a-zA-Z0-9]*)\s*\(/gm) || [])
        .map(s => s.trim().replace(/\s*\($/, ''))
    );
    const called = new Set(
      (src.match(/SFX\.[a-zA-Z][a-zA-Z0-9]*/g) || []).map(s => s.slice(4))
    );
    assert(defined.size >= 12, '应解析出 SFX 定义键（≥12）', defined.size);

    const missing = [...called].filter(k => !defined.has(k));
    assert(missing.length === 0, 'SFX 调用键必须全部有定义（缺失会每帧抛异常）', missing);

    // ---------- 2) 运行：大波预警结束 → 刷怪 分支不得抛异常 ----------
    g.startGame();
    const lv = g.sandbox.__LEVELS[1];
    const bigIdx = lv.waves.findIndex(w => w.big);           // L1 第 5 波
    assert(bigIdx >= 0, 'L1 应存在大波配置');
    g.setWave(bigIdx);                                       // 已放完前置波
    g.setLastWaveT(-999);                                    // 预警最早触发时间满足
    g.tick(0.1);
    assert(g.probe().warnActive === true, '应进入大波预警', g.probe().warnActive);

    let threw = null;
    try {
      for (let i = 0; i < 40; i++) g.tick(0.1);              // 推完 3s 预警 → 刷怪那一帧
    } catch (e) {
      threw = e;
    }
    assert(!threw, '大波刷怪帧不得抛异常（SFX 未定义会在此暴露）', threw && threw.message);
    const p = g.probe();
    assert(p.wave === bigIdx + 1, '预警结束后 wave 应推进到大波', [p.wave, bigIdx + 1]);
    assert(p.warnActive === false, '预警应已关闭', p.warnActive);
    assert(p.spawnQueueLen > 0 || p.zombies > 0, '大波应已开始生成', [p.spawnQueueLen, p.zombies]);
  },
};
