// 难度校准模拟：零兑换（不消耗徽章换开局钻石）情况下，自动玩家能否通关、是否无脑
import { STORY_LEVELS, endlessLevel } from '../src/game/levels';
import { createBattle, resolveAction, summonRunCat } from '../src/game/engine';
import { foodCap, RUN_GACHA_COST, powerMult } from '../src/game/balance';
import { CAT_MAP } from '../src/game/cats';
import type { CatInstance, LevelDef, Placement } from '../src/game/types';

let uid = 1;
const mk = (defId: string, level: number, roll = 1): CatInstance => ({ uid: `s${uid++}`, defId, level, roll });

// 各关卡检查点：玩家「不兑换钻石、但正常用徽章抽卡/升级」的合理进度（新经济：升级 12·L^1.5，胜利 ~165/195🏆）
const STATES: Record<string, { foodUp: number; cats: CatInstance[] }> = {
  '1-1': { foodUp: 0, cats: [mk('knight', 1), mk('bard', 1), mk('spark', 1)] },
  '1-2': { foodUp: 0, cats: [mk('knight', 2), mk('bard', 2), mk('spark', 2), mk('echo', 1), mk('blade', 1)] },
  '1-3': { foodUp: 0, cats: [mk('knight', 3), mk('bard', 3), mk('spark', 3), mk('echo', 2), mk('blade', 2), mk('alchemist', 1), mk('drummer', 1)] },
  '1-4': { foodUp: 1, cats: [mk('knight', 4), mk('bard', 4), mk('spark', 4), mk('echo', 3), mk('blade', 3), mk('alchemist', 2), mk('drummer', 2), mk('monk', 2), mk('twin', 1)] },
  '1-5': { foodUp: 1, cats: [mk('knight', 5), mk('bard', 5), mk('spark', 4), mk('echo', 4), mk('blade', 4), mk('alchemist', 3), mk('drummer', 3), mk('monk', 3), mk('twin', 2)] },
  '2-1': { foodUp: 2, cats: [mk('knight', 7), mk('bard', 7), mk('spark', 6), mk('echo', 6), mk('blade', 6), mk('alchemist', 5), mk('drummer', 5), mk('monk', 5), mk('twin', 4), mk('shadow', 2), mk('sage', 1), mk('chorus', 1)] },
  '2-2': { foodUp: 3, cats: [mk('knight', 9), mk('bard', 9), mk('spark', 8), mk('echo', 8), mk('blade', 8), mk('alchemist', 7), mk('drummer', 7), mk('monk', 7), mk('twin', 6), mk('shadow', 4), mk('sage', 2), mk('chorus', 2), mk('berserker', 1), mk('rune', 1)] },
  '2-3': { foodUp: 3, cats: [mk('knight', 10), mk('bard', 10), mk('spark', 9), mk('echo', 9), mk('blade', 9), mk('alchemist', 8), mk('drummer', 8), mk('monk', 8), mk('twin', 7), mk('shadow', 5), mk('sage', 3), mk('chorus', 3), mk('berserker', 2), mk('rune', 2)] },
  '2-4': { foodUp: 4, cats: [mk('knight', 12), mk('bard', 12), mk('spark', 11), mk('echo', 11), mk('blade', 11), mk('alchemist', 10), mk('drummer', 10), mk('monk', 10), mk('twin', 9), mk('shadow', 7), mk('sage', 5), mk('chorus', 5), mk('berserker', 4), mk('rune', 3), mk('prophet', 1), mk('bless', 1)] },
  '2-5': { foodUp: 5, cats: [mk('knight', 14), mk('bard', 14), mk('spark', 13), mk('echo', 13), mk('blade', 13), mk('alchemist', 12), mk('drummer', 12), mk('monk', 12), mk('twin', 11), mk('shadow', 9), mk('sage', 7), mk('chorus', 7), mk('berserker', 6), mk('rune', 5), mk('prophet', 3), mk('bless', 3), mk('catalyst', 2)] },
};

// 练度不足对照组：等级整体 -4、无稀有猫——后期关卡应当打不过（证明不无脑）
const WEAK_STATES: Record<string, { foodUp: number; cats: CatInstance[] }> = Object.fromEntries(
  Object.entries(STATES).map(([k, v]) => [k, {
    foodUp: Math.max(0, v.foodUp - 2),
    cats: v.cats.filter((c) => CAT_MAP[c.defId].rarity < 3).map((c) => ({ ...c, level: Math.max(1, c.level - 4) })),
  }]),
);

// 简易强度评分：稀有度 + 词条数值总量 × 养成倍率
function score(c: CatInstance): number {
  const def = CAT_MAP[c.defId];
  const pm = powerMult(c.level, c.roll);
  let v = def.rarity * 10;
  for (const e of def.effects) {
    v += ('dmg' in e ? e.dmg * (e.times ?? 1) : 0) + ('value' in e ? e.value : 0) + ('pct' in e ? e.pct * 25 : 0)
      + ('flat' in e ? e.flat : 0) + ('count' in e ? e.count * 2 : 0) + ('times' in e ? e.times * 8 : 0);
    // 乘区型词条对总伤害是乘法放大，额外加权
    if (e.kind === 'heroHits') v += 25;
    if (e.kind === 'echo') v += 15;
    if (e.kind === 'heroTAllFlat' || e.kind === 'heroTAllPct') v += 15;
  }
  for (const t of def.traits) v += (t.kind === 'free' ? 6 : t.kind === 'apPlus' ? 8 : 3);
  return v * pm;
}

// 各列内部排序优先级（越靠前越先行动）：理解游戏机制的玩法
const ORDER_PRI: Record<string, number> = {
  // 先锋：鼓手/增幅先动，输出后动
  drummer: 0, banner: 1, rune: 2, spark: 3, blade: 4, cheetah: 5,
  // 伙伴：数值垫基础 → 百分比放大 → 额外/次数 → 总乘区
  knight: 0, monk: 1, bard: 2, berserker: 3, shadow: 4, twin: 5, sage: 6,
  // 支援：乘区手先动，回响随后，炼金猫最后（避免吞掉别人的猫粮）
  catalyst: 0, bless: 1, chorus: 2, echo: 3, prophet: 4, alchemist: 5,
};

// 模拟「会玩的人类」：按乘区理解选猫、排序，并把队伍总粮耗控制在猫粮预算内
function humanPlace(cats: CatInstance[], budget: number): Placement {
  const sorted = [...cats].sort((a, b) => score(b) - score(a));
  const p: Placement = { support: [], partner: [], vanguard: [] };
  const cost = (c: CatInstance) => {
    const def = CAT_MAP[c.defId];
    return def.traits.some((t) => t.kind === 'free') ? 0 : Math.max(0, def.cost - (def.traits.some((t) => t.kind === 'cheap') ? 1 : 0));
  };
  let left = budget;
  const lim = (t: string) => (t === 'vanguard' ? 2 : t === 'support' ? 3 : 6);
  // 第一遍：免费猫全收（不占粮）
  for (const c of sorted) {
    const t = CAT_MAP[c.defId].type;
    if (cost(c) === 0 && p[t].length < lim(t)) p[t].push(c);
  }
  // 第二遍：按评分 greedy 填剩余猫粮预算
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

function simLevel(level: LevelDef, state: { foodUp: number; cats: CatInstance[] }, runs: number) {
  let wins = 0, sumDealt = 0, sumPulls = 0, noPullWins = 0;
  for (let i = 0; i < runs; i++) {
    const cap = Math.round(foodCap(state.foodUp) * level.foodScale);
    let st = createBattle(level, humanPlace(state.cats, cap), cap, 0); // 零兑换开局
    let pulls = 0;
    while (!st.over) {
      while (st.diamonds >= RUN_GACHA_COST) {
        const r = summonRunCat(st);
        if (!r) break;
        st = r.st; pulls++;
      }
      st = resolveAction(st);
    }
    sumDealt += st.totalDealt;
    sumPulls += pulls;
    if (st.over === 'win') {
      wins++;
      if (pulls === 0) noPullWins++;
    }
  }
  return { wins, runs, avgDealt: sumDealt / runs, avgPulls: sumPulls / runs, noPullWins };
}

const fmtN = (n: number) => n >= 1e8 ? (n / 1e8).toFixed(2) + '亿' : n >= 1e4 ? (n / 1e4).toFixed(1) + '万' : n.toFixed(0);

console.log('== 正常进度（零兑换） ==');
console.log('关卡     胜率    平均伤害/城堡HP         平均召唤  零召唤通关');
for (const lv of STORY_LEVELS) {
  const st = STATES[lv.id];
  const r = simLevel(lv, st, 30);
  console.log(
    `${lv.id} ${lv.name.padEnd(6)} ${String(Math.round((r.wins / r.runs) * 100)).padStart(4)}%  ${(fmtN(r.avgDealt) + '/' + fmtN(lv.hp)).padEnd(18)}  ${String(r.avgPulls.toFixed(1)).padStart(5)}次  ${r.noPullWins}/${r.runs}`
  );
}
console.log('\n== 练度不足对照组（等级-4、无稀有猫）——后期应当失败 ==');
for (const lv of STORY_LEVELS.slice(4)) {
  const st = WEAK_STATES[lv.id];
  const r = simLevel(lv, st, 30);
  console.log(`${lv.id} ${lv.name.padEnd(6)} 胜率 ${Math.round((r.wins / r.runs) * 100)}%`);
}
console.log('\n无尽模式抽样（正常进度）：');
for (const s of [2, 6, 12, 20]) {
  const lv = endlessLevel(s);
  const state = STATES[s <= 3 ? '2-1' : s <= 8 ? '2-3' : s <= 14 ? '2-5' : '2-5'];
  const r = simLevel(lv, state, 30);
  console.log(`  第${String(s).padStart(2)}层 HP${fmtN(lv.hp)}: 胜率${Math.round((r.wins / r.runs) * 100)}% 平均${r.avgPulls.toFixed(1)}次召唤`);
}
