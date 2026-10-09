// ── 猫猫勇者 · 核心类型（v4：星级点数制，局内抽卡）────────────────────

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

/** 各分栏上场数量上限 */
export const SLOT_LIMIT: Record<CatType, number> = {
  vanguard: 4,
  partner: 6,
  support: 4,
};

/**
 * 猫猫词条（行动效果）。数值为 1 级基准：★数已折算在内
 * （如号角猫 2★：全体加成 0.1/级 → 1 级 = +10%，5 级 = +50%）。
 * 升级只提升等级，全部词条按等级线性成长。
 */
export type CatEffect =
  | { kind: 'strike'; dmg: number; times: number }          // 造成 times 次 dmg 伤害（×等级）
  | { kind: 'repeatBelow'; count: number; times: number }   // 使行动顺序靠后的 count 只猫猫效果额外生效 times 次（×等级）
  | { kind: 'allCatBuff'; pct: number }                     // 使所有猫猫的加成提高 pct（×等级）
  | { kind: 'allExtraBuff'; pct: number }                   // 使所有猫猫的额外数值加成效果提高 pct（×等级）
  | { kind: 'heroIncFlat'; value: number }                  // 主角提高数值 +x（×等级）
  | { kind: 'heroIncPct'; pct: number }                     // 主角提高百分比 +y（×等级）
  | { kind: 'heroExtraFlat'; value: number }                // 主角额外数值 +x（×等级）
  | { kind: 'heroExtraPct'; pct: number }                   // 主角额外百分比 +y（×等级）
  | { kind: 'heroTotalFlat'; value: number }                // 主角总数值 +x（×等级）
  | { kind: 'heroTotalPct'; pct: number }                   // 主角总百分比 +y（×等级）
  | { kind: 'heroTIncFlat'; value: number }                 // 主角总提高数值 +x（×等级）
  | { kind: 'heroTIncPct'; pct: number }                    // 主角总提高百分比 +y（×等级）
  | { kind: 'heroTExtraFlat'; value: number }               // 主角总额外数值 +x（×等级）
  | { kind: 'heroTExtraPct'; pct: number }                  // 主角总额外百分比 +y（×等级）
  | { kind: 'heroTAllFlat'; value: number }                 // 主角总数值乘区 +x（对全部数值乘区，×等级）
  | { kind: 'heroTAllPct'; pct: number }                    // 主角总百分比乘区 +y（对全部百分比乘区，×等级）
  | { kind: 'echo'; pct: number; times: number }            // 使主角本行动造成的伤害再造成 pct 的 times 次（×等级）
  | { kind: 'heroHits'; value: number }                     // 主角次数乘区 +x（×等级）
  | { kind: 'diamondBonus'; pct: number };                  // 本次行动获得的钻石 +pct（×等级）

/** 猫猫特性（特殊情况）。 */
export type CatTrait =
  | { kind: 'free' }                  // 不消耗猫粮
  | { kind: 'apPlus'; value: number } // 行动时为本回合提供 value 点行动值
  | { kind: 'doubleFirst' }           // 每回合首次行动时效果翻倍
  | { kind: 'cheap' };                // 猫粮消耗 -1

export interface CatDef {
  id: string;
  name: string;
  emoji: string;
  type: CatType;
  rarity: 1 | 2 | 3; // ★数 = 效果点数
  effects: CatEffect[];
  traits: CatTrait[];
  desc: string;
}

/** 猫猫实例：抽卡获得；同名卡上场自动合成升级（1~5 级） */
export interface CatInstance {
  uid: string;
  defId: string;
  level: number; // 1~5
}

/** 布阵：数组顺序 = 展示从上到下（也是行动顺序）。 */
export interface Placement {
  support: CatInstance[];
  partner: CatInstance[];
  vanguard: CatInstance[];
}

export const emptyPlacement = (): Placement => ({ support: [], partner: [], vanguard: [] });

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
  kind: 'hit' | 'echo' | 'vanguard' | 'heal' | 'info' | 'crit' | 'diamond';
  big?: boolean;
}

export interface BattleState {
  level: LevelDef;
  placement: Placement;
  hand: CatInstance[];            // 手牌：抽到的猫猫在此，点击上场/出售
  fortressHp: number;
  fortressMax: number;
  turn: number;
  ap: number;
  apMax: number;
  apBonus: number;
  food: number;
  foodMax: number;                // 猫粮上限：每回合开始时回满一次
  diamonds: number;               // 💎 关卡内钻石（胜负都清空）
  diamondEarned: number;          // 本关累计获得（结算展示用）
  turnActed: Record<string, number>; // uid -> 本回合已行动次数（特性用）
  lastHit: HitBreakdown | null;
  lastTotal: number;
  lastOrder: string[];            // 上一行动按顺序出手的猫猫 uid（动画用）
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
  hpLeft?: number; // 未通关退出时保留的堡垒剩余血量（再进入时续打）
}

export interface SaveData {
  records: Record<string, LevelRecord>;
  endless: { stage: number; bestHit: number; bestDmgPerCat: number };
  storyCleared: boolean;
  badges: number;           // 🏆 勇者徽章（局外资源，仅胜利获得：可兑换开局钻石）
  foodUpgrade: number;      // 猫粮上限升级次数
}
