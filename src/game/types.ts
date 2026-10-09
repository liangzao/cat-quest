// ── 猫猫勇者 · 核心类型 ─────────────────────────────────────────────

export type CatType = 'vanguard' | 'partner' | 'support';

export const CAT_TYPE_LABEL: Record<CatType, string> = {
  vanguard: '先锋猫猫',
  partner: '伙伴猫猫',
  support: '支援猫猫',
};

export const CAT_TYPE_COLOR: Record<CatType, string> = {
  vanguard: 'from-orange-500 to-red-500',
  partner: 'from-sky-500 to-blue-600',
  support: 'from-violet-500 to-purple-600',
};

/** 猫猫词条（行动效果）。x 取 1~3，y 取 10% 的整数倍（存小数，0.2 = 20%）。 */
export type CatEffect =
  | { kind: 'strike'; dmg: number; times: number }          // 造成 times 次 dmg 伤害
  | { kind: 'repeatBelow'; count: number; times: number }   // 使行动顺序靠后的 count 只猫猫效果额外生效 times 次
  | { kind: 'allCatBuff'; pct: number }                     // 使所有猫猫的加成提高 pct
  | { kind: 'allExtraBuff'; pct: number }                   // 使所有猫猫的额外数值加成效果提高 pct
  | { kind: 'dmgBelow'; count: number; flat: number }       // 使行动顺序靠后的 count 只猫猫造成的伤害提高 flat 点
  | { kind: 'heroIncFlat'; value: number }                  // 主角提高数值 +x
  | { kind: 'heroIncPct'; pct: number }                     // 主角提高百分比 +y
  | { kind: 'heroExtraFlat'; value: number }                // 主角额外数值 +x
  | { kind: 'heroExtraPct'; pct: number }                   // 主角额外百分比 +y
  | { kind: 'heroTotalFlat'; value: number }                // 主角总数值 +x
  | { kind: 'heroTotalPct'; pct: number }                   // 主角总百分比 +y
  | { kind: 'heroTIncFlat'; value: number }                 // 主角总提高数值 +x
  | { kind: 'heroTIncPct'; pct: number }                    // 主角总提高百分比 +y
  | { kind: 'heroTExtraFlat'; value: number }               // 主角总额外数值 +x
  | { kind: 'heroTExtraPct'; pct: number }                  // 主角总额外百分比 +y
  | { kind: 'heroTAllFlat'; value: number }                 // 主角总数值乘区 +x（对全部数值乘区）
  | { kind: 'heroTAllPct'; pct: number }                    // 主角总百分比乘区 +y（对全部百分比乘区）
  | { kind: 'echo'; pct: number; times: number }            // 使主角本行动造成的伤害再造成 pct 的 times 次
  | { kind: 'heroHits'; value: number }                     // 主角次数乘区 +x（本行动攻击次数）
  | { kind: 'foodRefund'; min: number; max: number };       // 消耗剩余猫粮，返还 min%~max%

/** 猫猫特性（特殊情况）。 */
export type CatTrait =
  | { kind: 'free' }                  // 不消耗猫粮
  | { kind: 'apPlus'; value: number } // 行动时为本回合提供 value 点行动值上限
  | { kind: 'spawn' }                 // 行动时在先锋猫猫最下方获得一只无特性的随机先锋猫猫
  | { kind: 'doubleFirst' }           // 每回合首次行动时效果翻倍
  | { kind: 'cheap' };                // 猫粮消耗 -1

export interface CatDef {
  id: string;
  name: string;
  emoji: string;
  type: CatType;
  cost: number; // 魔法猫粮消耗
  rarity: 1 | 2 | 3;
  effects: CatEffect[];
  traits: CatTrait[];
  desc: string;
}

/** 猫猫实例：抽卡获得，带随机个体值与养成等级 */
export interface CatInstance {
  uid: string;
  defId: string;
  level: number;  // 1 起
  roll: number;   // 个体值 0.85 ~ 1.25
}

/** 布阵：每种猫猫一叠，数组顺序 = 展示从上到下（也是行动顺序）。 */
export interface Placement {
  support: CatInstance[];
  partner: CatInstance[];
  vanguard: CatInstance[];
}

// ── 数值乘区 ────────────────────────────────────────────────────────

export interface Zones {
  incFlat: number;    // 提高数值
  incPct: number;     // 提高百分比
  extraFlat: number;  // 额外数值
  extraPct: number;   // 额外百分比
  totalFlat: number;  // 总数值
  totalPct: number;   // 总百分比
  tIncFlat: number;   // 总提高数值
  tIncPct: number;    // 总提高百分比
  tExtraFlat: number; // 总额外数值
  tExtraPct: number;  // 总额外百分比
  tAllFlat: number;   // 总数值乘区（作用到所有数值乘区）
  tAllPct: number;    // 总百分比乘区（作用到所有百分比乘区）
}

export const emptyZones = (): Zones => ({
  incFlat: 0, incPct: 0, extraFlat: 0, extraPct: 0, totalFlat: 0, totalPct: 0,
  tIncFlat: 0, tIncPct: 0, tExtraFlat: 0, tExtraPct: 0, tAllFlat: 0, tAllPct: 0,
});

export interface HitBreakdown {
  base: number;
  IF: number; IP: number; EF: number; EP: number; TF: number; TP: number;
  perHit: number;
  hits: number;
  total: number;
}

// ── 关卡 ────────────────────────────────────────────────────────────

export interface LevelDef {
  id: string;
  chapter: number;
  index: number;
  name: string;
  story: string;
  hp: number;
  maxTurns: number;
  foodScale: number;   // 猫粮上限倍率（<1 表示饥荒关卡）
  shield?: number;     // 机关：每次行动吸收 shield 点伤害
  dmgCap?: number;     // 机关：每次行动伤害上限
  tutorial?: string[]; // 教学提示
}

export interface FloatingDmg {
  id: number;
  text: string;
  x: number; // 0~100 百分比
  y: number;
  kind: 'hit' | 'echo' | 'vanguard' | 'heal' | 'info' | 'crit';
  big?: boolean;
}

export interface BattleState {
  level: LevelDef;
  placement: Placement;
  fortressHp: number;
  fortressMax: number;
  turn: number;
  ap: number;
  apMax: number;
  apBonus: number;
  food: number;
  foodMax: number; // 每次行动补给猫粮上限
  refundPool: number;
  diamonds: number;               // 💎 关卡内钻石（胜负都清空）
  diamondEarned: number;          // 本关累计获得（结算展示用）
  summoned: CatInstance[];        // 局内召唤的援军猫猫（胜负都清空）
  spawned: CatInstance[];          // spawn 特性生成的猫猫（roll=1, level=1）
  turnActed: Record<string, number>; // uid -> 本回合已行动次数（特性用）
  lastHit: HitBreakdown | null;
  lastTotal: number;
  floats: FloatingDmg[];
  log: string[];
  over: 'win' | 'lose' | null;
  bestHit: number;
  bestAction: number;
  totalDealt: number;
  floatSeq: number;
}

// ── 存档 ────────────────────────────────────────────────────────────

export interface LevelRecord {
  bestHit: number;
  bestTotal: number;
  completed: boolean;
}

export interface SaveData {
  records: Record<string, LevelRecord>;
  endless: { stage: number; bestHit: number; bestDmgPerCat: number };
  storyCleared: boolean;
  collection: CatInstance[]; // 玩家拥有的猫猫（含重复，永久）
  badges: number;           // 🏆 勇者徽章（局外资源，仅胜利获得：抽卡/强化/升上限/兑换开局钻石）
  foodUpgrade: number;       // 猫粮上限升级次数
  lastFormation?: Placement; // 上次布阵
}
