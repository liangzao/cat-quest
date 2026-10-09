// ── 数值格式化：中文单位 ─────────────────────────────────────────
export function fmt(n: number): string {
  if (!isFinite(n)) return '∞';
  const neg = n < 0;
  const abs = Math.abs(n);
  let s: string;
  if (abs < 10000) s = String(Math.round(abs));
  else if (abs < 1e8) s = trim(abs / 1e4) + '万';
  else if (abs < 1e12) s = trim(abs / 1e8) + '亿';
  else if (abs < 1e16) s = trim(abs / 1e12) + '万亿';
  else s = abs.toExponential(2);
  return (neg ? '-' : '') + s;
}

function trim(v: number): string {
  return v >= 100 ? String(Math.round(v)) : v.toFixed(1).replace(/\.0$/, '');
}

// ── 养成数值 ─────────────────────────────────────────────────────
/** 效果强度倍率：个体值 × 等级成长（0.55/级，指数成长的爽感来源） */
export const powerMult = (level: number, roll: number) => roll * (1 + 0.55 * (level - 1));
/** 次数类倍率（攻击次数/额外生效次数）：温和成长 */
export const utilMult = (level: number, roll: number) => 1 + 0.18 * (level - 1) + (roll - 1) * 0.5;

/** 猫猫升级费用（从 level 升到 level+1） */
export const upgradeCost = (level: number) => Math.round(12 * Math.pow(level, 1.5));

/** 收藏召唤费用（🏆 勇者徽章，局外资源） */
export const GACHA_COST = 250;

/** 局内召唤费用（💎 关卡钻石，胜负都清空） */
export const RUN_GACHA_COST = 100;

/** 每关援军数量上限 */
export const SUMMON_LIMIT = 8;

/** 关卡内钻石获取：每次行动基础 + 按伤害（每 200 伤害 +1） */
export const DIAMOND_BASE = 15;
export const DIAMOND_DIV = 100;

/** 🏆 → 💎 兑换比例（1 徽章 = 4 开局钻石） */
export const EXCHANGE_RATE = 4;
/** 兑换档位（徽章数） */
export const EXCHANGE_PACKS = [25, 100, 400];

/** 猫粮上限：基础 + 升级 */
export const foodCap = (upLevel: number) => 12 + upLevel * 3;
export const foodUpgradeCost = (upLevel: number) => Math.round(300 * Math.pow(2, upLevel));
export const MAX_FOOD_UPGRADE = 12;

/** 胜利奖励（🏆）：基础 + 章节加成 + 剩余回合加成 */
export function victoryReward(chapter: number, turnsLeft: number): number {
  return 100 + chapter * 40 + Math.max(0, turnsLeft) * 15;
}

/** 抽卡稀有度权重 */
export const GACHA_WEIGHTS = [
  { rarity: 1, w: 62 },
  { rarity: 2, w: 30 },
  { rarity: 3, w: 8 },
];

/** 随机个体值 0.85 ~ 1.25 */
export const rollValue = () => Math.round((0.85 + Math.random() * 0.4) * 100) / 100;
