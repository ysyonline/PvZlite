// simulate.js —— Monte Carlo 数值模拟 v0.1
// 跑法: node simulate.js
// 回答三个问题：
//   1) 可赢性 —— 玩得好的风格能不能守住第60天总攻（存活率≥70% 为 PASS）
//   2) 松弛度 —— 赢的人赢得多勉强（总攻时防御富余量，太高=没张力）
//   3) 策略分歧 —— 三种风格的存活率差距（≥15pp 才说明数值做出了“选择感”）
// 本脚本只读 TUNING.js，不复制数字——两边数字分叉，模拟就白跑。

const TUNING = require('./TUNING.js')

const RUNS = 1000
const jit = (v, pct = 0.15) => v * (1 - pct + Math.random() * pct * 2)

// ———— 状态 ————
function newState() {
  return {
    grain: TUNING.START.GRAIN,
    wood: TUNING.START.WOOD,
    stone: TUNING.START.STONE,
    iron: TUNING.START.IRON,
    pop: TUNING.START.POP,
    fields: Array(TUNING.START.FIELDS).fill('su'), // 'su' 粟 | 'ma' 麻
    towers: 0,
    ballistas: 0,
    wallHP: TUNING.WALL.HP,
    margin: 0, // 总攻时的防御富余（负=缺口）
  }
}

// ———— 生产结算 ————
function produce(s, alloc) {
  const cap = s.fields.length * TUNING.FIELD.WORK_CAP
  const eff = Math.min(alloc.farm, cap) / cap // 耕作效率：人不够则田闲，人多则浪费
  for (const f of s.fields) {
    if (f === 'su') s.grain += TUNING.FIELD.YIELD_SU_GRAIN * eff * jit(1, 0.1)
    else {
      s.grain += TUNING.FIELD.YIELD_MA_GRAIN * eff * jit(1, 0.1)
      s.iron += TUNING.FIELD.YIELD_MA_IRON * eff * jit(1, 0.1)
    }
  }
  s.wood += alloc.wood * TUNING.WORKER.WOOD
  s.stone += alloc.stone * TUNING.WORKER.STONE
  s.iron += alloc.iron * TUNING.WORKER.IRON
  s.grain -= s.pop * TUNING.POP.EAT_PER_TURN
}

// ———— 通用动作 ————
function tryBuild(s, cost) {
  for (const k of Object.keys(cost)) if (s[k] < cost[k]) return false
  for (const k of Object.keys(cost)) s[k] -= cost[k]
  return true
}
function buySettlers(s, keepGrain) {
  let n = 0
  while (s.grain - TUNING.POP.GRAIN_PER_SETTLER >= keepGrain && n < 10) {
    s.grain -= TUNING.POP.GRAIN_PER_SETTLER
    s.pop++
    n++
  }
}
function repair(s) {
  const missing = TUNING.WALL.HP - s.wallHP
  if (missing > 0) {
    const stones = Math.min(s.stone, Math.ceil(missing / TUNING.WALL.REPAIR_HP_PER_STONE))
    s.stone -= stones
    s.wallHP += stones * TUNING.WALL.REPAIR_HP_PER_STONE
  }
}

// ———— 敌情 ————
const defensePower = s =>
  s.towers * TUNING.TOWER.DEF +
  s.ballistas * TUNING.BALLISTA.DEF +
  s.wallHP * TUNING.WALL_DEF_SHARE

function enemyPhase(s, t) {
  const R = TUNING.RAID
  const A = TUNING.ASSAULT
  const idx = R.TURNS.indexOf(t)
  if (idx >= 0) {
    const riders = Math.round(jit(R.RIDERS[idx]))
    const gap = riders * R.ATK_PER_RIDER - defensePower(s)
    if (gap > 0) {
      s.wallHP -= gap * R.WALL_DMG_SHARE
      s.grain = Math.max(0, s.grain - riders * R.GRAIN_STEAL_PER_RIDER)
      // [v0.5] 烧田：惩罚打在生产引擎上——但烧空不赶尽杀绝，至少留1块地让人有翻盘路
      if (s.fields.length > 1 && R.BURN_FIELDS > 0) {
        const burn = Math.min(R.BURN_FIELDS, s.fields.length - 1)
        s.fields.splice(Math.floor(Math.random() * s.fields.length), burn)
      }
    }
  }
  if (t === A.TURN) {
    const riders = Math.round(jit(A.RIDERS))
    s.margin = defensePower(s) - riders * A.ATK_PER_RIDER
    if (s.margin >= 0) return 'clean' // 防线正面扛住
    s.wallHP -= -s.margin * A.WALL_DMG_SHARE // 被撕开口子，看血条够不够厚
    return s.wallHP > 0 ? 'barely' : 'lose'
  }
  return null
}

// ———— 三种纸面玩家风格（模拟的是“风格”，不是最优解）————
// [校准v0.1] 一回合=10天，允许每回合最多3项建造（v0.1首轮单建造导致全员裸防，已修正）
const strategies = {
  // A 均衡流：一半人种田，田够用就转军备，什么都想要但都不极致
  均衡流(s, t) {
    produce(s, {
      farm: Math.round(s.pop * 0.5),
      wood: Math.round(s.pop * 0.3),
      stone: Math.round(s.pop * 0.15),
      iron: Math.round(s.pop * 0.05),
    })
    if (s.fields.length < 4 && t <= 3)
      while (s.fields.length < 4 && tryBuild(s, { wood: TUNING.FIELD.COST_WOOD })) s.fields.push('su')
    let builds = 3
    while (builds-- > 0) {
      if (s.towers < 5 && tryBuild(s, { wood: TUNING.TOWER.COST_WOOD, iron: TUNING.TOWER.COST_IRON })) s.towers++
      else if (s.ballistas < 2 && tryBuild(s, { wood: TUNING.BALLISTA.COST_WOOD, iron: TUNING.BALLISTA.COST_IRON })) s.ballistas++
      else break
    }
    buySettlers(s, 200)
    repair(s)
  },
  // B 农业流：前3回合疯狂开田攒粮换人口，后2回合才暴起造防
  农业流(s, t) {
    if (t <= 3) {
      produce(s, { farm: Math.round(s.pop * 0.7), wood: Math.round(s.pop * 0.25), stone: 0, iron: 0 })
      while (s.fields.length < 6 && tryBuild(s, { wood: TUNING.FIELD.COST_WOOD }))
        s.fields.push(s.fields.length % 2 === 0 ? 'ma' : 'su') // 混种，保证一点铁来源
    } else {
      produce(s, {
        farm: Math.round(s.pop * 0.4),
        wood: Math.round(s.pop * 0.4),
        stone: Math.round(s.pop * 0.1),
        iron: Math.round(s.pop * 0.1),
      })
      let builds = 3
      while (builds-- > 0) {
        if (s.towers < 6 && tryBuild(s, { wood: TUNING.TOWER.COST_WOOD, iron: TUNING.TOWER.COST_IRON })) s.towers++
        else if (s.ballistas < 3 && tryBuild(s, { wood: TUNING.BALLISTA.COST_WOOD, iron: TUNING.BALLISTA.COST_IRON })) s.ballistas++
        else break
      }
    }
    buySettlers(s, 150)
    repair(s)
  },
  // C 军备流：田只保底不扩张，木头全变箭塔
  军备流(s, t) {
    produce(s, {
      farm: Math.min(Math.round(s.pop * 0.4), s.fields.length * TUNING.FIELD.WORK_CAP),
      wood: Math.round(s.pop * 0.4),
      stone: Math.round(s.pop * 0.1),
      iron: Math.round(s.pop * 0.1),
    })
    let builds = 3
    while (builds-- > 0) {
      if (s.towers < 8 && tryBuild(s, { wood: TUNING.TOWER.COST_WOOD, iron: TUNING.TOWER.COST_IRON })) s.towers++
      else if (s.ballistas < 3 && tryBuild(s, { wood: TUNING.BALLISTA.COST_WOOD, iron: TUNING.BALLISTA.COST_IRON })) s.ballistas++
      else if (s.fields.length < 3 && tryBuild(s, { wood: TUNING.FIELD.COST_WOOD })) s.fields.push('su')
      else break
    }
    buySettlers(s, 100) // [校准v0.4] 军备流也招人：真玩家有粮盈余就会扩人口，不招是脚本失真
    repair(s)
  },
  // D 裸墙对照组：纯种田零防御——验证“不设防=必死”，不参与风格排名
  裸墙(s, t) {
    produce(s, {
      farm: Math.min(Math.round(s.pop * 0.7), s.fields.length * TUNING.FIELD.WORK_CAP),
      wood: Math.round(s.pop * 0.2),
      stone: Math.round(s.pop * 0.05),
      iron: 0,
    })
    while (s.fields.length < 6 && tryBuild(s, { wood: TUNING.FIELD.COST_WOOD }))
      s.fields.push(s.fields.length % 2 === 0 ? 'ma' : 'su')
    buySettlers(s, 150)
    repair(s)
  },
}

// ———— 单局 ————
function run(name) {
  const s = newState()
  for (let t = 1; t <= TUNING.TOTAL_TURNS; t++) {
    strategies[name](s, t)
    const r = enemyPhase(s, t)
    if (t === TUNING.ASSAULT.TURN) return { result: r, s }
    if (s.wallHP <= 0) return { result: 'lose', s } // 袭扰把墙磨塌也算输
  }
  return { result: 'lose', s }
}

// ———— Monte Carlo ————
const report = {}
for (const name of Object.keys(strategies)) {
  let clean = 0, barely = 0, lose = 0, marginSum = 0, wallSum = 0
  for (let i = 0; i < RUNS; i++) {
    const { result, s } = run(name)
    if (result === 'clean') clean++
    else if (result === 'barely') barely++
    else lose++
    marginSum += s.margin
    if (result !== 'lose') wallSum += Math.max(0, s.wallHP)
  }
  const survival = ((clean + barely) / RUNS) * 100
  report[name] = {
    survival,
    cleanPct: (clean / RUNS) * 100,
    barelyPct: (barely / RUNS) * 100,
    losePct: (lose / RUNS) * 100,
    avgMargin: marginSum / RUNS,
    avgWallLeft: wallSum / Math.max(1, clean + barely),
  }
}

console.log(`=== 长城守城 v${TUNING.VERSION} · Monte Carlo ×${RUNS} ===`)
console.log('风格\t存活%\t正面扛住%\t惨胜%\t城破%\t总攻防御富余\t存活者平均剩余墙耐久')
for (const [name, r] of Object.entries(report)) {
  console.log(
    `${name}\t${r.survival.toFixed(1)}\t${r.cleanPct.toFixed(1)}\t\t${r.barelyPct.toFixed(1)}\t${r.losePct.toFixed(1)}\t${Math.round(r.avgMargin)}\t\t${Math.round(r.avgWallLeft)}`
  )
}

// ———— 三指标判读（裸墙是对照组，不参与风格排名）————
const entries = Object.entries(report).filter(([n]) => n !== '裸墙')
const best = entries.reduce((a, b) => (b[1].survival > a[1].survival ? b : a))
const worst = entries.reduce((a, b) => (b[1].survival < a[1].survival ? b : a))
const spread = best[1].survival - worst[1].survival
const naked = report['裸墙']

console.log('\n—— 四指标判读 ——')
console.log(
  `可赢性  : ${best[1].survival >= 70 ? 'PASS' : 'FAIL'}（最好风格「${best[0]}」存活率 ${best[1].survival.toFixed(1)}%，目标 ≥70%）`
)
console.log(
  `松弛度  : 最好风格总攻平均富余 ${Math.round(best[1].avgMargin)} 点防御。${
    best[1].avgMargin > 500 ? '太高——玩家会睡着，建议加压敌情' : best[1].avgMargin > 0 ? '偏松，可接受' : '贴脸赢，张力合适'
  }`
)
console.log(
  `策略分歧: ${spread.toFixed(1)}pp（${best[0]} ${best[1].survival.toFixed(0)}% vs ${worst[0]} ${worst[1].survival.toFixed(0)}%）。${
    spread >= 15 ? 'PASS——数值做出了风格差异' : 'FAIL——三种玩法没区别，调 TUNING'
  }`
)
console.log(
  `裸墙测试: ${naked.survival === 0 ? 'PASS' : 'FAIL'}（零防御存活率 ${naked.survival.toFixed(1)}%，必须为 0——否则防御投资无意义）`
)
