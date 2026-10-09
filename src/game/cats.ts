import type { CatDef, CatEffect, CatTrait, CatType } from './types';

const eff = (e: CatEffect) => e;
const tr = (t: CatTrait) => t;

/**
 * 数值为 1 级基准（★数已折算：★1=1 点、★2=2 点、★3=3 点），
 * 升级后全部词条按等级线性成长。同名卡上场自动合成升级。
 */
export const CATS: CatDef[] = [
  // ── 先锋猫猫：主角行动前依次行动，多为直接伤害与全队增幅 ──
  {
    id: 'spark', name: '火花猫', emoji: '🔥', type: 'vanguard', rarity: 1,
    effects: [eff({ kind: 'strike', dmg: 1, times: 1 })],
    traits: [],
    desc: '1★ · 造成 1 次 1 点伤害（升级数值翻倍、次数×等级）。可靠的输出手。',
  },
  {
    id: 'blade', name: '利刃猫', emoji: '⚔️', type: 'vanguard', rarity: 1,
    effects: [eff({ kind: 'strike', dmg: 2, times: 1 })],
    traits: [],
    desc: '1★ · 造成 1 次 2 点伤害（升级翻倍）。单次更重。',
  },
  {
    id: 'drummer', name: '鼓手猫', emoji: '🥁', type: 'vanguard', rarity: 2,
    effects: [eff({ kind: 'repeatBelow', count: 2, times: 1 })],
    traits: [tr({ kind: 'apPlus', value: 1 })],
    desc: '2★ · 使之后行动的 2 只猫猫效果额外生效 1 次（升级翻倍）；行动时为主角 +1 行动值。',
  },
  {
    id: 'banner', name: '号角猫', emoji: '📯', type: 'vanguard', rarity: 2,
    effects: [eff({ kind: 'allCatBuff', pct: 0.15 })],
    traits: [],
    desc: '2★ · 使所有猫猫的加成提高 15%（升级翻倍）。猫猫越多收益越高。',
  },
  {
    id: 'rune', name: '秘纹猫', emoji: '🔮', type: 'vanguard', rarity: 2,
    effects: [eff({ kind: 'allExtraBuff', pct: 0.15 })],
    traits: [tr({ kind: 'free' })],
    desc: '2★ · 使所有猫猫的额外数值加成效果提高 15%（升级翻倍）；不消耗猫粮。',
  },
  {
    id: 'cheetah', name: '影豹猫', emoji: '🐆', type: 'vanguard', rarity: 3,
    effects: [eff({ kind: 'strike', dmg: 1, times: 2 })],
    traits: [tr({ kind: 'free' })],
    desc: '3★ · 造成 2 次 1 点伤害（升级翻倍）；不消耗猫粮。',
  },

  // ── 伙伴猫猫：主角行动时依次行动，强化主角的乘区 ──
  {
    id: 'knight', name: '骑士猫', emoji: '🛡️', type: 'partner', rarity: 1,
    effects: [eff({ kind: 'heroIncFlat', value: 2 })],
    traits: [],
    desc: '1★ · 主角提高数值 +2（升级翻倍）。',
  },
  {
    id: 'monk', name: '武僧猫', emoji: '🥋', type: 'partner', rarity: 1,
    effects: [eff({ kind: 'heroIncFlat', value: 2 })],
    traits: [tr({ kind: 'cheap' })],
    desc: '1★ · 主角提高数值 +2（升级翻倍）；猫粮消耗 -1。',
  },
  {
    id: 'bard', name: '吟游猫', emoji: '🎻', type: 'partner', rarity: 1,
    effects: [eff({ kind: 'heroIncPct', pct: 0.2 })],
    traits: [],
    desc: '1★ · 主角提高百分比 +20%（升级翻倍）。叠基础攻击的乘区。',
  },
  {
    id: 'berserker', name: '狂战猫', emoji: '🪓', type: 'partner', rarity: 2,
    effects: [eff({ kind: 'heroExtraFlat', value: 4 })],
    traits: [tr({ kind: 'doubleFirst' })],
    desc: '2★ · 主角额外数值 +4（升级翻倍）；每回合首次行动效果翻倍。',
  },
  {
    id: 'shadow', name: '影袭猫', emoji: '🗡️', type: 'partner', rarity: 2,
    effects: [eff({ kind: 'heroExtraPct', pct: 0.4 })],
    traits: [],
    desc: '2★ · 主角额外百分比 +40%（升级翻倍）。独立乘区，越叠越疼。',
  },
  {
    id: 'sage', name: '贤者猫', emoji: '🧙', type: 'partner', rarity: 3,
    effects: [eff({ kind: 'heroTotalPct', pct: 0.6 })],
    traits: [tr({ kind: 'apPlus', value: 1 })],
    desc: '3★ · 主角总百分比 +60%（升级翻倍）；行动时为主角 +1 行动值。',
  },
  {
    id: 'twin', name: '双子猫', emoji: '👯', type: 'partner', rarity: 2,
    effects: [eff({ kind: 'heroHits', value: 1 })],
    traits: [],
    desc: '2★ · 主角本行动攻击次数 +1（升级翻倍）。让每一层增幅都翻倍兑现。',
  },

  // ── 支援猫猫：主角行动后行动，回响与后勤 ──
  {
    id: 'echo', name: '回响猫', emoji: '🎵', type: 'support', rarity: 1,
    effects: [eff({ kind: 'echo', pct: 0.15, times: 1 })],
    traits: [],
    desc: '1★ · 主角本行动造成的伤害再造成 15% 的 1 次（升级翻倍）。',
  },
  {
    id: 'chorus', name: '合奏猫', emoji: '🎶', type: 'support', rarity: 2,
    effects: [eff({ kind: 'echo', pct: 0.15, times: 2 })],
    traits: [],
    desc: '2★ · 主角本行动造成的伤害再造成 15% 的 2 次（升级翻倍）。',
  },
  {
    id: 'alchemist', name: '炼金猫', emoji: '⚗️', type: 'support', rarity: 1,
    effects: [eff({ kind: 'diamondBonus', pct: 0.25 })],
    traits: [],
    desc: '1★ · 本次行动获得的钻石 +25%（升级翻倍）。发家致富靠炼金。',
  },
  {
    id: 'bless', name: '祝福猫', emoji: '🕊️', type: 'support', rarity: 2,
    effects: [eff({ kind: 'heroTAllFlat', value: 3 }), eff({ kind: 'heroTotalPct', pct: 0.3 })],
    traits: [],
    desc: '2★ · 主角总数值乘区 +3、总百分比 +30%（升级翻倍）。双总乘区手。',
  },
  {
    id: 'catalyst', name: '催化猫', emoji: '🧪', type: 'support', rarity: 2,
    effects: [eff({ kind: 'heroTIncFlat', value: 3 }), eff({ kind: 'heroTIncPct', pct: 0.3 })],
    traits: [],
    desc: '2★ · 主角总提高数值 +3、总提高百分比 +30%（升级翻倍）。喂饱提高乘区。',
  },
  {
    id: 'prophet', name: '预言猫', emoji: '🔭', type: 'support', rarity: 3,
    effects: [eff({ kind: 'echo', pct: 0.3, times: 2 })],
    traits: [tr({ kind: 'free' })],
    desc: '3★ · 主角本行动造成的伤害再造成 30% 的 2 次（升级翻倍）；不消耗猫粮。',
  },
];

export const CAT_MAP: Record<string, CatDef> = Object.fromEntries(CATS.map((c) => [c.id, c]));

/** 猫猫立绘（AI 生成的猫猫元素图，透明背景） */
export const catImg = (defId: string) => `${import.meta.env.BASE_URL}assets/cats/${defId}.png`;

/** 猫粮消耗 = ★数（cheap -1，free 0），与等级无关 */
export function catCost(def: CatDef): number {
  let c = def.rarity;
  if (def.traits.some((t) => t.kind === 'cheap')) c -= 1;
  return Math.max(0, c);
}

const star = (r: number) => '★'.repeat(r);

export function describeEffect(e: CatEffect, level = 1): string {
  const pm = Math.pow(2, level - 1); // 数值倍率：每级翻倍
  const lm = level;                  // 次数倍率：线性
  switch (e.kind) {
    case 'strike': return `造成 ${e.times * lm} 次 ${e.dmg * pm} 点伤害`;
    case 'repeatBelow': return `之后 ${e.count * lm} 只猫猫效果额外生效 ${e.times * lm} 次`;
    case 'allCatBuff': return `所有猫猫的加成提高 ${Math.round(e.pct * pm * 100)}%`;
    case 'allExtraBuff': return `所有猫猫的额外数值加成效果提高 ${Math.round(e.pct * pm * 100)}%`;
    case 'heroIncFlat': return `主角提高数值 +${e.value * pm}`;
    case 'heroIncPct': return `主角提高百分比 +${Math.round(e.pct * pm * 100)}%`;
    case 'heroExtraFlat': return `主角额外数值 +${e.value * pm}`;
    case 'heroExtraPct': return `主角额外百分比 +${Math.round(e.pct * pm * 100)}%`;
    case 'heroTotalFlat': return `主角总数值 +${e.value * pm}`;
    case 'heroTotalPct': return `主角总百分比 +${Math.round(e.pct * pm * 100)}%`;
    case 'heroTIncFlat': return `主角总提高数值 +${e.value * pm}`;
    case 'heroTIncPct': return `主角总提高百分比 +${Math.round(e.pct * pm * 100)}%`;
    case 'heroTExtraFlat': return `主角总额外数值 +${e.value * pm}`;
    case 'heroTExtraPct': return `主角总额外百分比 +${Math.round(e.pct * pm * 100)}%`;
    case 'heroTAllFlat': return `主角总数值乘区 +${e.value * pm}（作用于所有数值乘区）`;
    case 'heroTAllPct': return `主角总百分比乘区 +${Math.round(e.pct * pm * 100)}%`;
    case 'echo': return `主角本行动伤害再造成 ${Math.round(e.pct * pm * 100)}% 的 ${e.times * lm} 次`;
    case 'heroHits': return `主角攻击次数 +${e.value * lm}（次数乘区）`;
    case 'diamondBonus': return `本次行动获得的钻石 +${Math.round(e.pct * pm * 100)}%`;
  }
}

export function describeTrait(t: CatTrait): string {
  switch (t.kind) {
    case 'free': return '不消耗猫粮';
    case 'apPlus': return `行动时主角行动值 +${t.value}`;
    case 'doubleFirst': return '每回合首次行动效果翻倍';
    case 'cheap': return '猫粮消耗 -1';
  }
}

export { star };

export type { CatType };
