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

// ── 局内经济（💎 关卡钻石，胜负都清空）──────────────────────────
/** 抽卡费用 */
export const DRAW_COST = 80;
/** 出售猫猫获得钻石 */
export const SELL_PRICE = 40;
/** 开局手牌数量 */
export const START_HAND = 3;
/** 猫猫等级上限（同名卡合成升级） */
export const MAX_LEVEL = 5;

/** 每次行动固定获得的钻石（≥1 张抽卡） */
export const DIAMOND_BASE = 150;
/** 伤害奖励：每 dealt/DIAMOND_DIV 点伤害 +1 钻石 */
export const DIAMOND_DIV = 5;

/** 🏆 → 💎 兑换比例（1 徽章 = 4 开局钻石） */
export const EXCHANGE_RATE = 4;
/** 兑换档位（徽章数） */
export const EXCHANGE_PACKS = [25, 100, 400];

/** 猫粮上限：基础 20 + 每级 +4 */
export const foodCap = (upLevel: number) => 20 + upLevel * 4;
export const foodUpgradeCost = (upLevel: number) => Math.round(300 * Math.pow(2, upLevel));
export const MAX_FOOD_UPGRADE = 12;

/** 胜利奖励（🏆）：基础 + 章节加成 + 剩余回合加成 */
export function victoryReward(chapter: number, turnsLeft: number): number {
  return 100 + chapter * 40 + Math.max(0, turnsLeft) * 15;
}

/** 抽卡稀有度权重（★1 / ★2 / ★3） */
export const GACHA_WEIGHTS = [
  { rarity: 1, w: 70 },
  { rarity: 2, w: 25 },
  { rarity: 3, w: 5 },
];
