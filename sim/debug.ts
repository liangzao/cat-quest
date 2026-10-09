import { getLevel } from '../src/game/levels';
import { createBattle, resolveAction, summonRunCat } from '../src/game/engine';
import { foodCap, RUN_GACHA_COST } from '../src/game/balance';
import { CAT_MAP } from '../src/game/cats';
import type { CatInstance } from '../src/game/types';

let uid = 1;
const mk = (defId: string, level: number, roll = 1): CatInstance => ({ uid: `d${uid++}`, defId, level, roll });

const cats = [mk('knight', 12), mk('bard', 12), mk('spark', 11), mk('echo', 11), mk('blade', 11), mk('alchemist', 10), mk('drummer', 10), mk('monk', 10), mk('twin', 9), mk('shadow', 7), mk('sage', 5), mk('chorus', 5), mk('berserker', 4), mk('rune', 3), mk('prophet', 1), mk('bless', 1)];

// 与 sim 相同的评分与布阵
import { powerMult } from '../src/game/balance';
function score(c: CatInstance): number {
  const def = CAT_MAP[c.defId];
  const pm = powerMult(c.level, c.roll);
  let v = def.rarity * 10;
  for (const e of def.effects) {
    v += ('dmg' in e ? e.dmg * (e.times ?? 1) : 0) + ('value' in e ? e.value : 0) + ('pct' in e ? e.pct * 25 : 0)
      + ('flat' in e ? e.flat : 0) + ('count' in e ? e.count * 2 : 0) + ('times' in e ? e.times * 8 : 0);
    if (e.kind === 'heroHits') v += 25;
    if (e.kind === 'echo') v += 15;
    if (e.kind === 'heroTAllFlat' || e.kind === 'heroTAllPct') v += 15;
  }
  for (const t of def.traits) v += (t.kind === 'free' ? 6 : t.kind === 'apPlus' ? 8 : 3);
  return v * pm;
}
const ORDER_PRI: Record<string, number> = {
  drummer: 0, banner: 1, rune: 2, spark: 3, blade: 4, cheetah: 5,
  knight: 0, monk: 1, bard: 2, berserker: 3, shadow: 4, twin: 5, sage: 6,
  catalyst: 0, bless: 1, chorus: 2, echo: 3, prophet: 4, alchemist: 5,
};
function humanPlace(cs: CatInstance[], budget: number) {
  const sorted = [...cs].sort((a, b) => score(b) - score(a));
  const p: { support: CatInstance[]; partner: CatInstance[]; vanguard: CatInstance[] } = { support: [], partner: [], vanguard: [] };
  const cost = (c: CatInstance) => {
    const def = CAT_MAP[c.defId];
    return def.traits.some((t) => t.kind === 'free') ? 0 : Math.max(0, def.cost - (def.traits.some((t) => t.kind === 'cheap') ? 1 : 0));
  };
  let left = budget;
  const lim = (t: string) => (t === 'vanguard' ? 2 : t === 'support' ? 3 : 6);
  for (const c of sorted) {
    const t = CAT_MAP[c.defId].type;
    if (cost(c) === 0 && p[t].length < lim(t)) p[t].push(c);
  }
  for (const c of sorted) {
    const t = CAT_MAP[c.defId].type;
    if (p[t].includes(c) || p[t].length >= lim(t)) continue;
    if (cost(c) > left) continue;
    p[t].push(c);
    left -= cost(c);
  }
  for (const t of ['support', 'partner', 'vanguard'] as const) {
    p[t].sort((a, b) => (ORDER_PRI[a.defId] ?? 9) - (ORDER_PRI[b.defId] ?? 9));
  }
  return p;
}

const level = getLevel('2-4')!;
const placement = humanPlace(cats, 28);
console.log('布阵:');
for (const t of ['vanguard', 'partner', 'support'] as const) {
  console.log(` ${t}: ${placement[t].map((c) => `${CAT_MAP[c.defId].name}Lv${c.level}`).join(', ')}`);
}
let st = createBattle(level, placement, foodCap(4), 0);
let act = 0;
while (!st.over && act < 40) {
  while (st.diamonds >= RUN_GACHA_COST) {
    const r = summonRunCat(st);
    if (!r) break;
    st = r.st;
  }
  st = resolveAction(st);
  act++;
  console.log(`行动${act} 回合${st.turn} 伤害=${st.lastTotal} 累计=${st.totalDealt} 💎=${st.diamonds} 援军=${st.summoned.length} | ${st.log[st.log.length - 1]}`);
}
console.log('结果:', st.over, '总伤害', st.totalDealt);
