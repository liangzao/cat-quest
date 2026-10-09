import type { CatDef, CatEffect, CatTrait, CatType } from './types';

const eff = (e: CatEffect) => e;
const tr = (t: CatTrait) => t;

export const CATS: CatDef[] = [
  // ── 先锋猫猫：主角行动前依次行动，多为直接伤害与全队增幅 ──
  {
    id: 'spark', name: '火花猫', emoji: '🔥', type: 'vanguard', cost: 2, rarity: 1,
    effects: [eff({ kind: 'strike', dmg: 3, times: 3 })],
    traits: [],
    desc: '行动时造成 3 次 3 点伤害。可靠的输出手。',
  },
  {
    id: 'blade', name: '利刃猫', emoji: '⚔️', type: 'vanguard', cost: 2, rarity: 1,
    effects: [eff({ kind: 'strike', dmg: 5, times: 2 })],
    traits: [],
    desc: '行动时造成 2 次 5 点伤害。单次更重。',
  },
  {
    id: 'drummer', name: '鼓手猫', emoji: '🥁', type: 'vanguard', cost: 2, rarity: 2,
    effects: [eff({ kind: 'repeatBelow', count: 2, times: 1 })],
    traits: [tr({ kind: 'apPlus', value: 1 })],
    desc: '使之后行动的 2 只猫猫效果额外生效 1 次；行动时为主角 +1 行动值。',
  },
  {
    id: 'banner', name: '号角猫', emoji: '📯', type: 'vanguard', cost: 3, rarity: 2,
    effects: [eff({ kind: 'allCatBuff', pct: 0.25 })],
    traits: [],
    desc: '使所有猫猫的加成提高 25%。猫猫越多收益越高。',
  },
  {
    id: 'rune', name: '秘纹猫', emoji: '🔮', type: 'vanguard', cost: 3, rarity: 2,
    effects: [eff({ kind: 'allExtraBuff', pct: 0.3 })],
    traits: [tr({ kind: 'free' })],
    desc: '使所有猫猫的额外数值加成效果提高 30%；不消耗猫粮。',
  },
  {
    id: 'cheetah', name: '影豹猫', emoji: '🐆', type: 'vanguard', cost: 3, rarity: 3,
    effects: [eff({ kind: 'strike', dmg: 3, times: 4 })],
    traits: [tr({ kind: 'free' })],
    desc: '造成 4 次 3 点伤害；不消耗猫粮。',
  },

  // ── 伙伴猫猫：主角行动时依次行动，强化主角的乘区 ──
  {
    id: 'knight', name: '骑士猫', emoji: '🛡️', type: 'partner', cost: 2, rarity: 1,
    effects: [eff({ kind: 'heroIncFlat', value: 4 })],
    traits: [],
    desc: '主角提高数值 +4。',
  },
  {
    id: 'monk', name: '武僧猫', emoji: '🥋', type: 'partner', cost: 3, rarity: 1,
    effects: [eff({ kind: 'heroIncFlat', value: 5 })],
    traits: [tr({ kind: 'cheap' })],
    desc: '主角提高数值 +5；猫粮消耗 -1。',
  },
  {
    id: 'bard', name: '吟游猫', emoji: '🎻', type: 'partner', cost: 2, rarity: 1,
    effects: [eff({ kind: 'heroIncPct', pct: 0.6 })],
    traits: [],
    desc: '主角提高百分比 +60%。叠基础攻击的乘区。',
  },
  {
    id: 'berserker', name: '狂战猫', emoji: '🪓', type: 'partner', cost: 3, rarity: 2,
    effects: [eff({ kind: 'heroExtraFlat', value: 6 })],
    traits: [tr({ kind: 'doubleFirst' })],
    desc: '主角额外数值 +6；每回合首次行动效果翻倍。',
  },
  {
    id: 'shadow', name: '影袭猫', emoji: '🗡️', type: 'partner', cost: 3, rarity: 2,
    effects: [eff({ kind: 'heroExtraPct', pct: 0.25 })],
    traits: [],
    desc: '主角额外百分比 +25%。独立乘区，越叠越疼。',
  },
  {
    id: 'sage', name: '贤者猫', emoji: '🧙', type: 'partner', cost: 3, rarity: 3,
    effects: [eff({ kind: 'heroTotalPct', pct: 0.35 })],
    traits: [tr({ kind: 'apPlus', value: 1 })],
    desc: '主角总百分比 +35%；行动时为主角 +1 行动值。',
  },
  {
    id: 'twin', name: '双子猫', emoji: '👯', type: 'partner', cost: 2, rarity: 2,
    effects: [eff({ kind: 'heroHits', value: 1 })],
    traits: [],
    desc: '主角本行动攻击次数 +1（次数乘区）。让每一层增幅都翻倍兑现。',
  },

  // ── 支援猫猫：主角行动后行动，回响与后勤 ──
  {
    id: 'echo', name: '回响猫', emoji: '🎵', type: 'support', cost: 2, rarity: 1,
    effects: [eff({ kind: 'echo', pct: 0.5, times: 1 })],
    traits: [],
    desc: '主角本行动造成的伤害再造成 50% 的 1 次。',
  },
  {
    id: 'chorus', name: '合奏猫', emoji: '🎶', type: 'support', cost: 3, rarity: 2,
    effects: [eff({ kind: 'echo', pct: 0.5, times: 2 })],
    traits: [],
    desc: '主角本行动造成的伤害再造成 50% 的 2 次。',
  },
  {
    id: 'alchemist', name: '炼金猫', emoji: '⚗️', type: 'support', cost: 1, rarity: 1,
    effects: [eff({ kind: 'foodRefund', min: 0.8, max: 1.5 })],
    traits: [],
    desc: '行动后消耗剩余猫粮，并返还 80%~150% 到下一回合。',
  },
  {
    id: 'bless', name: '祝福猫', emoji: '🕊️', type: 'support', cost: 3, rarity: 2,
    effects: [eff({ kind: 'heroTAllFlat', value: 3 }), eff({ kind: 'heroTotalPct', pct: 0.2 })],
    traits: [],
    desc: '主角总数值乘区 +3、总百分比 +20%。双总乘区手。',
  },
  {
    id: 'catalyst', name: '催化猫', emoji: '🧪', type: 'support', cost: 3, rarity: 2,
    effects: [eff({ kind: 'heroTIncFlat', value: 4 }), eff({ kind: 'heroTIncPct', pct: 0.25 })],
    traits: [],
    desc: '主角总提高数值 +4、总提高百分比 +25%。喂饱提高乘区。',
  },
  {
    id: 'prophet', name: '预言猫', emoji: '🔭', type: 'support', cost: 3, rarity: 3,
    effects: [eff({ kind: 'echo', pct: 1.0, times: 1 })],
    traits: [tr({ kind: 'free' })],
    desc: '主角本行动造成的伤害再造成 100% 的 1 次；不消耗猫粮。',
  },
];

export const CAT_MAP: Record<string, CatDef> = Object.fromEntries(CATS.map((c) => [c.id, c]));

export const VANGUARD_POOL = CATS.filter((c) => c.type === 'vanguard');

export function describeEffect(e: CatEffect): string {
  switch (e.kind) {
    case 'strike': return `造成 ${e.times} 次 ${e.dmg} 点伤害`;
    case 'repeatBelow': return `之后 ${e.count} 只猫猫效果额外生效 ${e.times} 次`;
    case 'allCatBuff': return `所有猫猫的加成提高 ${e.pct * 100}%`;
    case 'allExtraBuff': return `所有猫猫的额外数值加成效果提高 ${e.pct * 100}%`;
    case 'dmgBelow': return `之后 ${e.count} 只猫猫造成的伤害提高 ${e.flat} 点`;
    case 'heroIncFlat': return `主角提高数值 +${e.value}`;
    case 'heroIncPct': return `主角提高百分比 +${e.pct * 100}%`;
    case 'heroExtraFlat': return `主角额外数值 +${e.value}`;
    case 'heroExtraPct': return `主角额外百分比 +${e.pct * 100}%`;
    case 'heroTotalFlat': return `主角总数值 +${e.value}`;
    case 'heroTotalPct': return `主角总百分比 +${e.pct * 100}%`;
    case 'heroTIncFlat': return `主角总提高数值 +${e.value}`;
    case 'heroTIncPct': return `主角总提高百分比 +${e.pct * 100}%`;
    case 'heroTExtraFlat': return `主角总额外数值 +${e.value}`;
    case 'heroTExtraPct': return `主角总额外百分比 +${e.pct * 100}%`;
    case 'heroTAllFlat': return `主角总数值乘区 +${e.value}（作用于所有数值乘区）`;
    case 'heroTAllPct': return `主角总百分比乘区 +${e.pct * 100}%`;
    case 'echo': return `主角本行动伤害再造成 ${e.pct * 100}% 的 ${e.times} 次`;
    case 'heroHits': return `主角攻击次数 +${e.value}（次数乘区）`;
    case 'foodRefund': return `消耗剩余猫粮，返还 ${e.min * 100}%~${e.max * 100}%`;
  }
}

export function describeTrait(t: CatTrait): string {
  switch (t.kind) {
    case 'free': return '不消耗猫粮';
    case 'apPlus': return `行动时主角行动值 +${t.value}`;
    case 'spawn': return '行动时在先锋猫猫最下方召唤一只随机先锋猫猫（无特性）';
    case 'doubleFirst': return '每回合首次行动效果翻倍';
    case 'cheap': return '猫粮消耗 -1';
  }
}

export function catCost(def: CatDef): number {
  let c = def.cost;
  if (def.traits.some((t) => t.kind === 'cheap')) c -= 1;
  return Math.max(0, c);
}

export type { CatType };
