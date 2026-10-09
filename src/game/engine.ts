import { CAT_MAP, VANGUARD_POOL, catCost } from './cats';
import { DIAMOND_BASE, DIAMOND_DIV, RUN_GACHA_COST, SUMMON_LIMIT, powerMult, utilMult } from './balance';
import { pullOne } from './gacha';
import { HERO_BASE_AP, HERO_BASE_ATK } from './levels';
import type {
  BattleState, CatEffect, CatInstance, FloatingDmg, HitBreakdown, LevelDef, Placement, Zones,
} from './types';
import { emptyZones } from './types';

let uidSeq = 1;
export const newUid = () => `u${uidSeq++}`;

export function makeInstances(defIds: string[]): CatInstance[] {
  return defIds.map((defId) => ({ uid: newUid(), defId, level: 1, roll: 1 }));
}

export function createBattle(level: LevelDef, placement: Placement, foodCap: number, startDiamonds = 0): BattleState {
  return {
    level, placement,
    fortressHp: level.hp, fortressMax: level.hp,
    turn: 1, ap: HERO_BASE_AP, apMax: HERO_BASE_AP, apBonus: 0,
    food: foodCap, foodMax: foodCap, refundPool: 0,
    diamonds: startDiamonds, diamondEarned: 0,
    summoned: [],
    spawned: [], turnActed: {},
    lastHit: null, lastTotal: 0,
    floats: [], log: [`🏰 ${level.name}：堡垒 HP ${level.hp}，限 ${level.maxTurns} 回合击破！`],
    over: null, bestHit: 0, bestAction: 0, totalDealt: 0, floatSeq: 0,
  };
}

/** 局内召唤援军：消耗 💎 关卡钻石，临时猫猫立即加入战斗（胜负都清空）。
 *  援军等级 = 已上阵猫猫的平均等级（向上取整），上限 SUMMON_LIMIT 只。 */
export function summonRunCat(prev: BattleState): { st: BattleState; inst: CatInstance } | null {
  if (prev.over || prev.diamonds < RUN_GACHA_COST || prev.summoned.length >= SUMMON_LIMIT) return null;
  const placed = [...prev.placement.vanguard, ...prev.placement.partner, ...prev.placement.support];
  const avgLevel = placed.length
    ? Math.max(1, Math.round(placed.reduce((s, c) => s + c.level, 0) / placed.length))
    : 1;
  const inst = pullOne().inst;
  inst.level = avgLevel;
  const def = CAT_MAP[inst.defId];
  const st: BattleState = {
    ...prev,
    diamonds: prev.diamonds - RUN_GACHA_COST,
    summoned: [...prev.summoned, inst],
    log: [...prev.log, `🎰 消耗 ${RUN_GACHA_COST}💎 召唤援军：${def.emoji}${def.name} Lv.${inst.level}（个体值 ${Math.round(inst.roll * 100)}%，仅本关有效）`].slice(-80),
  };
  return { st, inst };
}

/**
 * 乘区公式（忠实还原设计文档）：
 *   提高区：(基础 + 提高数值 + 总提高数值 + 总数值) × (1 + 提高百分比 + 总提高百分比 + 总百分比)
 *   额外区：额外数值 × (1 + 额外百分比 + 总额外百分比 + 总百分比)
 *   总计：  (提高区 + 额外区 + 总数值) × (1 + 总百分比)
 *   最后 × 次数乘区
 */
export function computeHit(z: Zones, base: number, hits: number): HitBreakdown {
  const IF = z.incFlat + z.tIncFlat + z.tAllFlat;
  const IP = z.incPct + z.tIncPct + z.tAllPct;
  const EF = z.extraFlat + z.tExtraFlat + z.tAllFlat;
  const EP = z.extraPct + z.tExtraPct + z.tAllPct;
  const TF = z.totalFlat + z.tAllFlat;
  const TP = z.totalPct + z.tAllPct;
  const incPart = (base + IF) * (1 + IP);
  const extraPart = EF * (1 + EP);
  const perHit = (incPart + extraPart + TF) * (1 + TP);
  return { base, IF, IP, EF, EP, TF, TP, perHit, hits, total: Math.round(perHit * hits) };
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

interface Pend {
  repeat: number;
  flat: number;
}

/** 执行一次主角攻击（消耗 1 行动值）：先锋→伙伴→主角→支援 依次结算。 */
export function resolveAction(prev: BattleState): BattleState {
  if (prev.over) return prev;
  const st: BattleState = {
    ...prev,
    turnActed: { ...prev.turnActed },
    floats: [...prev.floats],
    log: [...prev.log],
    spawned: [...prev.spawned],
  };

  const order: { inst: CatInstance; isSupport: boolean; isSummon: boolean }[] = [
    ...prev.placement.vanguard, ...prev.spawned,
  ].map((inst) => ({ inst, isSupport: false, isSummon: false }))
    .concat(prev.placement.partner.map((inst) => ({ inst, isSupport: false, isSummon: false })))
    .concat(prev.placement.support.map((inst) => ({ inst, isSupport: true, isSummon: false })))
    .concat(prev.summoned.map((inst) => ({ inst, isSupport: false, isSummon: true }))); // 援军最后行动、不耗粮

  const zones = emptyZones();
  let catBuffPct = 0;   // 所有猫猫的加成提高
  let extraBuffPct = 0; // 猫猫额外数值加成效果提高
  const flatBuff: Record<string, number> = {}; // uid -> 伤害提高（点）
  const pendingByIndex = new Map<number, Pend>();
  let heroHitsBonus = 0;
  const dmgQueue: { text: string; amount: number }[] = [];
  const echoQueue: { text: string; amount: number }[] = [];
  const logLines: string[] = [];

  // ── 每次行动补给猫粮（含炼金猫存粮）──
  let food = st.foodMax + st.refundPool;
  if (st.refundPool > 0) logLines.push(`🍖 存粮到账：本次行动猫粮 ${food}`);
  st.refundPool = 0;
  let ap = st.ap;
  const acted = new Set<string>();

  // pm: 词条数值倍率（个体值×等级）；um: 次数类倍率（温和）
  const applyZoneEffect = (e: CatEffect, pm: number, em: number) => {
    switch (e.kind) {
      case 'heroIncFlat': zones.incFlat += e.value * pm; break;
      case 'heroIncPct': zones.incPct += e.pct * pm; break;
      case 'heroExtraFlat': zones.extraFlat += e.value * pm * em; break;
      case 'heroExtraPct': zones.extraPct += e.pct * pm * em; break;
      case 'heroTotalFlat': zones.totalFlat += e.value * pm; break;
      case 'heroTotalPct': zones.totalPct += e.pct * pm; break;
      case 'heroTIncFlat': zones.tIncFlat += e.value * pm; break;
      case 'heroTIncPct': zones.tIncPct += e.pct * pm; break;
      case 'heroTExtraFlat': zones.tExtraFlat += e.value * pm * em; break;
      case 'heroTExtraPct': zones.tExtraPct += e.pct * pm * em; break;
      case 'heroTAllFlat': zones.tAllFlat += e.value * pm; break;
      case 'heroTAllPct': zones.tAllPct += e.pct * pm; break;
    }
  };

  // ── 投喂并依序行动：先锋 → 伙伴 → 支援（主角在伙伴之后出手）──
  for (let idx = 0; idx < order.length; idx++) {
    const { inst, isSupport, isSummon } = order[idx];
    const def = CAT_MAP[inst.defId];
    const pm = powerMult(inst.level, inst.roll);
    const um = utilMult(inst.level, inst.roll);
    const pend = pendingByIndex.get(idx);
    const flatB = (flatBuff[inst.uid] ?? 0) + (pend?.flat ?? 0);
    if (flatB) flatBuff[inst.uid] = flatB;
    const extraRepeat = pend?.repeat ?? 0;

    // 援军是魔法召唤物，不消耗猫粮
    const cost = (isSummon || def.traits.some((t) => t.kind === 'free')) ? 0 : catCost(def);
    if (food < cost) {
      logLines.push(`🍖 猫粮不足，${def.emoji}${def.name} 跳过了行动`);
      continue;
    }
    food -= cost;
    acted.add(inst.uid);
    st.turnActed[inst.uid] = (st.turnActed[inst.uid] ?? 0) + 1;

    let times = 1 + extraRepeat;
    if (def.traits.some((t) => t.kind === 'doubleFirst') && st.turnActed[inst.uid] === 1) {
      times *= 2;
      logLines.push(`💫 ${def.emoji}${def.name} 本回合首次行动，效果翻倍！`);
    }

    const m = isSupport ? 1 : 1 + catBuffPct;   // 支援不受其它猫猫影响
    const em = isSupport ? 1 : 1 + extraBuffPct;

    for (let i = 0; i < times; i++) {
      for (const e of def.effects) {
        switch (e.kind) {
          case 'strike': {
            const t = Math.max(1, Math.round(e.times * um));
            const per = (e.dmg * pm + (flatBuff[inst.uid] ?? 0)) * m;
            dmgQueue.push({ text: `${def.emoji} ${Math.round(per * t)}`, amount: Math.round(per * t) });
            break;
          }
          case 'repeatBelow': {
            const c = Math.max(1, Math.round(e.count * um));
            let cc = c;
            for (let j = idx + 1; j < order.length && cc > 0; j++, cc--) {
              const cur = pendingByIndex.get(j) ?? { repeat: 0, flat: 0 };
              cur.repeat += Math.max(1, Math.round(e.times * um));
              pendingByIndex.set(j, cur);
            }
            logLines.push(`🥁 鼓声隆隆：之后 ${c} 只猫猫额外生效 ${Math.max(1, Math.round(e.times * um))} 次`);
            break;
          }
          case 'dmgBelow': {
            const c = Math.max(1, Math.round(e.count * um));
            let cc = c;
            for (let j = idx + 1; j < order.length && cc > 0; j++, cc--) {
              const cur = pendingByIndex.get(j) ?? { repeat: 0, flat: 0 };
              cur.flat += e.flat * pm * m;
              pendingByIndex.set(j, cur);
            }
            break;
          }
          case 'allCatBuff': catBuffPct += e.pct * pm; logLines.push(`📯 全体猫猫加成 +${fmtPct(e.pct * pm)}`); break;
          case 'allExtraBuff': extraBuffPct += e.pct * pm; logLines.push(`🔮 额外加成效果 +${fmtPct(e.pct * pm)}`); break;
          case 'foodRefund': {
            const pct = rnd(e.min, e.max);
            const back = Math.round(food * pct);
            st.refundPool += back;
            logLines.push(`⚗️ 炼金猫炼成 ${back} 份猫粮（${Math.round(pct * 100)}%）存入下一次行动`);
            food = 0;
            break;
          }
          case 'echo': break; // 支援回响在主角出手后统一结算
          case 'heroHits': heroHitsBonus += Math.max(1, Math.round(e.value * um)); break;
          default:
            applyZoneEffect(e, pm * m, em);
        }
      }
    }

    // 特性：行动值 / 召唤
    for (const t of def.traits) {
      if (t.kind === 'apPlus') {
        st.apBonus += t.value;
        st.ap = Math.min(st.apMax + st.apBonus, st.ap + t.value);
        logLines.push(`⚡ ${def.emoji}${def.name} 为本回合 +${t.value} 行动值上限`);
      }
      if (t.kind === 'spawn') {
        const pick = VANGUARD_POOL[Math.floor(Math.random() * VANGUARD_POOL.length)];
        st.spawned.push({ uid: newUid(), defId: pick.id, level: inst.level, roll: inst.roll });
        logLines.push(`✨ ${def.name} 召唤了 ${pick.emoji}${pick.name}！`);
      }
    }
  }

  // ── 主角攻击 ──
  const hit = computeHit(zones, HERO_BASE_ATK, 1 + heroHitsBonus);
  st.lastHit = hit;

  let actionDmg = hit.total + dmgQueue.reduce((s, q) => s + q.amount, 0);

  // ── 支援回响：按主角本次原始伤害的一定百分比追加 ──
  for (let idx = 0; idx < order.length; idx++) {
    const { inst, isSupport } = order[idx];
    if (!isSupport || !acted.has(inst.uid)) continue;
    const def = CAT_MAP[inst.defId];
    const pm = powerMult(inst.level, inst.roll);
    const pend = pendingByIndex.get(idx);
    let times = 1 + (pend?.repeat ?? 0);
    if (def.traits.some((t) => t.kind === 'doubleFirst') && st.turnActed[inst.uid] === 1) times *= 2;
    for (const e of def.effects) {
      if (e.kind === 'echo') {
        // 回响：百分比吃养成倍率，次数为词条固定值 × 额外生效次数
        const amount = Math.round(hit.total * e.pct * pm) * e.times * times;
        actionDmg += amount;
        echoQueue.push({ text: `${def.emoji} 回响 ${amount}`, amount });
      }
    }
  }

  // ── 关卡机关（对整个行动结算一次）──
  let dealt = actionDmg;
  if (st.level.shield && dealt > 0) {
    const absorbed = Math.min(st.level.shield, dealt);
    dealt -= absorbed;
    logLines.push(`🛡️ 堡垒护盾吸收了 ${absorbed} 点`);
  }
  if (st.level.dmgCap !== undefined && dealt > st.level.dmgCap) {
    logLines.push(`⛔ 限伤结界触发：${dealt} → ${st.level.dmgCap}`);
    dealt = st.level.dmgCap;
  }

  st.food = food;
  st.ap = Math.max(0, ap - 1);
  st.fortressHp = Math.max(0, st.fortressHp - dealt);
  st.lastTotal = dealt;
  st.totalDealt += dealt;
  st.bestHit = Math.max(st.bestHit, hit.total);
  st.bestAction = Math.max(st.bestAction, dealt);

  // ── 关卡内钻石：每次行动基础产出 + 按伤害产出（胜负都清空）──
  const gain = DIAMOND_BASE + Math.floor(dealt / DIAMOND_DIV);
  st.diamonds += gain;
  st.diamondEarned += gain;

  // ── 飘字 ──
  let seq = st.floatSeq;
  const floats: FloatingDmg[] = dmgQueue.map((q) => ({
    id: seq++, text: q.text, x: 10 + Math.random() * 80, y: 28 + Math.random() * 12, kind: 'vanguard',
  }));
  floats.push({ id: seq++, text: `${hit.total}!`, x: 35 + Math.random() * 30, y: 34 + Math.random() * 8, kind: 'hit', big: hit.total >= 100000 });
  for (const q of echoQueue) {
    floats.push({ id: seq++, text: q.text, x: 25 + Math.random() * 50, y: 48 + Math.random() * 8, kind: 'echo' });
  }
  st.floatSeq = seq;
  st.floats = [...st.floats, ...floats].slice(-40);
  st.log = [...st.log, ...logLines, `⚔️ 本次行动 ${dealt} 伤害（主角单发 ${hit.total}）· 💎+${gain}`].slice(-80);

  if (st.fortressHp <= 0) {
    st.over = 'win';
    st.log.push(`🏰 堡垒击破！救出公主！`);
  } else if (st.ap <= 0) {
    return endTurn(st);
  }
  return st;
}

function fmtPct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

export function endTurn(prev: BattleState): BattleState {
  if (prev.over) return prev;
  const turn = prev.turn + 1;
  if (turn > prev.level.maxTurns) {
    return { ...prev, over: 'lose', log: [...prev.log, '💀 回合耗尽，堡垒仍未击破……挑战失败'].slice(-80) };
  }
  return {
    ...prev, turn, ap: prev.apMax, apBonus: 0, turnActed: {},
    log: [...prev.log, `— 第 ${turn} 回合开始 —`].slice(-80),
  };
}
