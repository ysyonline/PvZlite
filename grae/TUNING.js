// TUNING.js —— 长城守城 · 全游戏唯一数字来源 v0.5-paper（模拟校准版）
// 纪律：
//   1) demo 与模拟脚本只从这里读数，代码里不允许出现第二个数字；
//   2) 每个数字必须带 rationale，未经 playtest / 模拟验证的一律标 [PLACEHOLDER]；
//   3) 改手感只改这里，改完跑 `node simulate.js` 验证数学，再刷新 demo 看手感。

const TUNING = {
  VERSION: '0.5-paper',

  // —— 时间结构 ——
  TURN_DAYS: 10,        // 一回合=10天：6回合一局，目标单局≤15分钟（中度策略节奏）
  TOTAL_TURNS: 6,

  // —— 初始资源 [PLACEHOLDER·待模拟] ——
  START: {
    GRAIN: 300,   // 够约3回合口粮（30人×2/回合），余量给开局第一个决策留余地
    WOOD: 300,    // 够 1箭塔+1田+半座民居：开局就得做取舍
    STONE: 150,
    IRON: 40,
    FIELDS: 2,
    POP: 30,
  },

  // —— 人口与粮食闭环 ——
  POP: {
    EAT_PER_TURN: 2,       // 每人每回合吃2粮 [PLACEHOLDER]：让粮是硬约束但不至于开局就饿
    GRAIN_PER_SETTLER: 20, // 招1居民=20粮：农业流的生命线——种田盈余→人口→更多工人
    // 民居/房屋系统模拟v0.1未启用（纸面版把住房成本折叠进招人粮价），demo阶段再开
    HOUSE_COST_WOOD: 60,
    POP_PER_HOUSE: 5,
  },

  // —— 生产 [PLACEHOLDER] ——
  FIELD: {
    COST_WOOD: 40,          // 开田造价 ≈ 一回合伐木结余：扩张节奏约1田/回合
    WORK_CAP: 4,            // 每田至多4人，超编无效：逼玩家开新田而不是往一块田堆人
    YIELD_SU_GRAIN: 120,    // 粟田满员每回合产粮：主粮，喂人口循环
    YIELD_MA_GRAIN: 40,     // 麻田产粮少
    YIELD_MA_IRON: 12,      // 麻田产铁（经济作物换军费）：铁是弩炮瓶颈，农业流的自救口
  },
  WORKER: {
    WOOD: 8,    // 伐木工每人每回合 [PLACEHOLDER]
    STONE: 5,   // 采石工
    IRON: 5,    // 采矿工 [校准v0.1] 3→5：铁瓶颈太死会卡住军备流上限，摸不到弩炮
  },

  // —— 城防 [PLACEHOLDER·核心待模拟验证] ——
  WALL: {
    HP: 600,                // 城墙耐久：是血条也是盾（按 WALL_DEF_SHARE 折算防御）
    REPAIR_HP_PER_STONE: 8, // 1石修8耐久：修城是持续税，采矿人力不能全挪去种田
  },
  TOWER:    { COST_WOOD: 60, COST_IRON: 10, DEF: 100 }, // 箭塔：便宜量大的基础防御
  BALLISTA: { COST_WOOD: 40, COST_IRON: 30, DEF: 260 }, // 弩炮：吃铁的高级防御
  WALL_DEF_SHARE: 0.25,   // 耐久→防御力的折算系数

  // —— 敌情 [PLACEHOLDER·第一优先验证对象] ——
  RAID: {
    TURNS: [2, 3, 4],
    RIDERS: [25, 40, 60],         // 游骑规模逐次升级
    ATK_PER_RIDER: 10,            // 袭扰性强：单骑威胁高但总量小
    GRAIN_STEAL_PER_RIDER: 2,     // 防不住就抢粮：逼农业流也要关心墙
    BURN_FIELDS: 1,               // [v0.5] 防不住再烧1块田（下回合停产）：惩罚打在生产引擎上而非库存——"修墙护田"从此有看得见的回报，开田时机变成风险决策
    WALL_DMG_SHARE: 0.2,          // 攻防差值→城墙损伤的转化率
  },
  ASSAULT: {
    TURN: 6,
    RIDERS: 430,          // 总攻atk≈1720 [校准v0.4] 380→430：让缺口逼近“墙血+修墙”的兜底上限，防御不足的风格开始真死
    ATK_PER_RIDER: 4,     // 总攻是消耗战：单骑威胁低靠数量堆
    WALL_DMG_SHARE: 1.0,  // [校准v0.3] 0.4→1.0：防御差多少、墙就掉多少血——600血墙最多扛600缺口，裸墙必死
  },
}

// 浏览器与 Node 双端共用：demo <script> 直接引入，模拟脚本 require
if (typeof module !== 'undefined') module.exports = TUNING
