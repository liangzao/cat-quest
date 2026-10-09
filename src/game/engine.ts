import { CAT_MAP, catCost } from './cats';
import { DIAMOND_BASE, DIAMOND_DIV, DRAW_COST, MAX_LEVEL, SELL_PRICE } from './balance';
import { drawOne } from './gacha';
import { HERO_BASE_AP, HERO_BASE_ATK } from './levels';
import type {
  BattleState, CatEffect, CatInstance, CatType, FloatingDmg, HitBreakdown, LevelDef, Placement, Zones,
} from './types';
import { emptyPlacement, emptyZones, SLOT_LIMIT } from './types';

let uidSeq = 1;
export const newUid = () => `u${uidSeq++}`;

export interface BattleOptions {
  startDiamonds?: number; // 🏆 兑换带入的开局钻石
  initialHand?: CatInstance[]; // 开局手牌
  hpLeft?: number;          // 上次未通关退出时保留的堡垒血量
}

export function createBattle(level: LevelDef, foodCap: number, opts: BattleOptions = {}): BattleState {
  const hp = opts.hpLeft ?? level.hp;
  return {
    level, placement: emptyPlacement(),
    hand: opts.initialHand ?? [],
    fortressHp: hp, fortressMax: level.hp,
    turn: 1, ap: HERO_BASE_AP, apMax: HERO_BASE_AP, apBonus: 0,
    food: foodCap, foodMax: foodCap,
    diamonds: opts.startDiamonds ?? 0, diamondEarned: 0,
    turnActed: {},
    lastHit: null, lastTotal: 0, lastOrder: [],
    floats: [],
    log: hp < level.hp
      ? [`🏰 ${level.name}：堡垒剩余 HP ${hp}（上次进攻的战果已保留），限 ${level.maxTurns} 回合击破！`]
      : [`🏰 ${level.name}：堡垒 HP ${level.hp}，限 ${level.maxTurns} 回合击破！`],
    over: null, bestHit: 0, bestAction: 0, totalDealt: 0, floatSeq: 0,
  };
}

// ── 局内操作：上场（自动合成）/ 撤回 / 出售 / 抽卡 ─────────────────

/** 手牌猫猫上场：只能放进与自身类型一致的分栏；栏内已有同名卡则自动合成升级。 */
export function placeCard(prev: BattleState, uid: string): BattleState {
  if (prev.over) return prev;
  const inst = prev.hand.find((c) => c.uid === uid);
  if (!inst) return prev;
  const def = CAT_MAP[inst.defId];
  const type = def.type;
  const col = prev.placement[type];
  const log: string[] = [];

  // 同名合成
  const existing = col.find((c) => c.defId === inst.defId);
  if (existing) {
    if (existing.level >= MAX_LEVEL) {
      // 已满级：自动出售
      return {
        ...prev,
        hand: prev.hand.filter((c) => c.uid !== uid),
        diamonds: prev.diamonds + SELL_PRICE,
        log: [...prev.log, `💰 ${def.emoji}${def.name} 已满 Lv.${MAX_LEVEL}，自动出售 +${SELL_PRICE}💎`].slice(-80),
      };
    }
    const placement: Placement = {
      ...prev.placement,
      [type]: col.map((c) => (c.uid === existing.uid ? { ...c, level: c.level + 1 } : c)),
    };
    log.push(`✨ 合成！${def.emoji}${def.name} 升到 Lv.${existing.level + 1}`);
    return { ...prev, placement, hand: prev.hand.filter((c) => c.uid !== uid), log: [...prev.log, ...log].slice(-80) };
  }

  if (col.length >= SLOT_LIMIT[type]) {
    return { ...prev, log: [...prev.log, `⛔ ${type === 'vanguard' ? '先锋' : type === 'partner' ? '伙伴' : '支援'}栏已满（上限 ${SLOT_LIMIT[type]} 只）`].slice(-80) };
  }
  const placement: Placement = { ...prev.placement, [type]: [...col, inst] };
  log.push(`⬆ ${def.emoji}${def.name} 加入${type === 'vanguard' ? '先锋' : type === 'partner' ? '伙伴' : '支援'}栏`);
  return { ...prev, placement, hand: prev.hand.filter((c) => c.uid !== uid), log: [...prev.log, ...log].slice(-80) };
}

/** 场上的猫撤回手牌 */
export function unplaceCard(prev: BattleState, type: CatType, uid: string): BattleState {
  if (prev.over) return prev;
  const inst = prev.placement[type].find((c) => c.uid === uid);
  if (!inst) return prev;
  const def = CAT_MAP[inst.defId];
  return {
    ...prev,
    placement: { ...prev.placement, [type]: prev.placement[type].filter((c) => c.uid !== uid) },
    hand: [...prev.hand, inst],
    log: [...prev.log, `⬇ ${def.emoji}${def.name} 撤回手牌`].slice(-80),
  };
}

/** 出售手牌猫猫换钻石 */
export function sellCard(prev: BattleState, uid: string): BattleState {
  if (prev.over) return prev;
  const inst = prev.hand.find((c) => c.uid === uid);
  if (!inst) return prev;
  const def = CAT_MAP[inst.defId];
  return {
    ...prev,
    hand: prev.hand.filter((c) => c.uid !== uid),
    diamonds: prev.diamonds + SELL_PRICE,
    log: [...prev.log, `💰 出售 ${def.emoji}${def.name} +${SELL_PRICE}💎`].slice(-80),
  };
}

/** 消耗钻石抽卡，进手牌 */
export function drawCard(prev: BattleState): BattleState {
  if (prev.over || prev.diamonds < DRAW_COST) return prev;
  const { inst } = drawOne();
  const def = CAT_MAP[inst.defId];
  return {
    ...prev,
    diamonds: prev.diamonds - DRAW_COST,
    hand: [...prev.hand, inst],
    log: [...prev.log, `🎴 消耗 ${DRAW_COST}💎 抽卡：${'★'.repeat(def.rarity)} ${def.emoji}${def.name}`].slice(-80),
  };
}

// ── 战斗结算 ────────────────────────────────────────────────────────

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

interface Pend {
  repeat: number;
}

/**
 * 执行一次主角攻击（消耗 1 行动值）：先锋 → 伙伴+主角 → 支援 依次结算。
 * 猫粮每回合开始时回满一次；勇者每行动一次，扣除在场出手的猫猫的猫粮。
 */
export function resolveAction(prev: BattleState): BattleState {
  if (prev.over) return prev;
  const st: BattleState = {
    ...prev,
    turnActed: { ...prev.turnActed },
    floats: [...prev.floats],
    log: [...prev.log],
  };

  const order: { inst: CatInstance; isSupport: boolean }[] = [
    ...prev.placement.vanguard,
    ...prev.placement.partner,
    ...prev.placement.support,
  ].map((inst, i) => ({ inst, isSupport: i >= prev.placement.vanguard.length + prev.placement.partner.length }));

  const zones = emptyZones();
  let catBuffPct = 0;   // 所有猫猫的加成提高
  let extraBuffPct = 0; // 猫猫额外数值加成效果提高
  const pendingByIndex = new Map<number, Pend>();
  let heroHitsBonus = 0;
  let diamondPct = 0;   // 炼金猫：本次行动钻石加成
  const dmgQueue: { text: string; amount: number }[] = [];
  const echoQueue: { text: string; amount: number }[] = [];
  const logLines: string[] = [];
  const actedOrder: string[] = []; // 按行动顺序记录出手的猫猫（动画用）

  let food = st.food;
  const acted = new Set<string>();

  // 词条数值倍率：每升 1 级翻倍（合成升级的质变）；次数类按等级线性
  const applyZoneEffect = (e: CatEffect, mult: number, em: number) => {
    switch (e.kind) {
      case 'heroIncFlat': zones.incFlat += e.value * mult; break;
      case 'heroIncPct': zones.incPct += e.pct * mult; break;
      case 'heroExtraFlat': zones.extraFlat += e.value * mult * em; break;
      case 'heroExtraPct': zones.extraPct += e.pct * mult * em; break;
      case 'heroTotalFlat': zones.totalFlat += e.value * mult; break;
      case 'heroTotalPct': zones.totalPct += e.pct * mult; break;
      case 'heroTIncFlat': zones.tIncFlat += e.value * mult; break;
      case 'heroTIncPct': zones.tIncPct += e.pct * mult; break;
      case 'heroTExtraFlat': zones.tExtraFlat += e.value * mult * em; break;
      case 'heroTExtraPct': zones.tExtraPct += e.pct * mult * em; break;
      case 'heroTAllFlat': zones.tAllFlat += e.value * mult; break;
      case 'heroTAllPct': zones.tAllPct += e.pct * mult; break;
      case 'diamondBonus': diamondPct += e.pct * mult; break;
    }
  };

  // ── 依序行动：先锋 → 伙伴 → 支援（主角在伙伴之后出手）──
  for (let idx = 0; idx < order.length; idx++) {
    const { inst, isSupport } = order[idx];
    const def = CAT_MAP[inst.defId];
    const pm = Math.pow(2, inst.level - 1); // 数值倍率：每级翻倍
    const lm = inst.level;                  // 次数倍率：线性
    const pend = pendingByIndex.get(idx);
    const extraRepeat = pend?.repeat ?? 0;

    // 勇者每行动一次都要扣除对应猫猫的猫粮；吃不起就跳过
    const cost = def.traits.some((t) => t.kind === 'free') ? 0 : catCost(def);
    if (food < cost) {
      logLines.push(`🍖 猫粮不足，${def.emoji}${def.name} 跳过了行动`);
      continue;
    }
    food -= cost;
    acted.add(inst.uid);
    actedOrder.push(inst.uid);
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
            const t = e.times * lm;
            const per = e.dmg * pm * m;
            dmgQueue.push({ text: `${def.emoji} ${Math.round(per * t)}`, amount: Math.round(per * t) });
            break;
          }
          case 'repeatBelow': {
            const c = e.count * lm;
            const rt = e.times * lm;
            let cc = c;
            for (let j = idx + 1; j < order.length && cc > 0; j++, cc--) {
              const cur = pendingByIndex.get(j) ?? { repeat: 0 };
              cur.repeat += rt;
              pendingByIndex.set(j, cur);
            }
            logLines.push(`🥁 鼓声隆隆：之后 ${c} 只猫猫额外生效 ${rt} 次`);
            break;
          }
          case 'allCatBuff': catBuffPct += e.pct * pm; logLines.push(`📯 全体猫猫加成 +${fmtPct(e.pct * pm)}`); break;
          case 'allExtraBuff': extraBuffPct += e.pct * pm; logLines.push(`🔮 额外加成效果 +${fmtPct(e.pct * pm)}`); break;
          case 'echo': break; // 支援回响在主角出手后统一结算
          case 'heroHits': heroHitsBonus += e.value * lm; break;
          default:
            applyZoneEffect(e, pm * m, em);
        }
      }
    }

    // 特性：行动值
    for (const t of def.traits) {
      if (t.kind === 'apPlus') {
        st.apBonus += t.value;
        st.ap = Math.min(st.apMax + st.apBonus, st.ap + t.value);
        logLines.push(`⚡ ${def.emoji}${def.name} 为本回合 +${t.value} 行动值`);
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
    const pm = Math.pow(2, inst.level - 1);
    const lm = inst.level;
    const pend = pendingByIndex.get(idx);
    let times = 1 + (pend?.repeat ?? 0);
    if (def.traits.some((t) => t.kind === 'doubleFirst') && st.turnActed[inst.uid] === 1) times *= 2;
    for (const e of def.effects) {
      if (e.kind === 'echo') {
        const amount = Math.round(hit.total * (e.pct * pm)) * (e.times * lm) * times;
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
  st.ap = Math.max(0, st.ap - 1);
  st.lastOrder = actedOrder;
  st.fortressHp = Math.max(0, st.fortressHp - dealt);
  st.lastTotal = dealt;
  st.totalDealt += dealt;
  st.bestHit = Math.max(st.bestHit, hit.total);
  st.bestAction = Math.max(st.bestAction, dealt);

  // ── 关卡内钻石：固定 100 + 伤害奖励（dealt/100）+ 猫猫加成 ──
  const base = DIAMOND_BASE + Math.floor(dealt / DIAMOND_DIV);
  const gain = Math.round(base * (1 + diamondPct));
  st.diamonds += gain;
  st.diamondEarned += gain;
  if (diamondPct > 0) logLines.push(`⚗️ 炼金加成：钻石 ${base} → ${gain}`);

  // ── 飘字 ──
  let seq = st.floatSeq;
  const floats: FloatingDmg[] = dmgQueue.map((q) => ({
    id: seq++, text: q.text, x: 10 + Math.random() * 80, y: 28 + Math.random() * 12, kind: 'vanguard',
  }));
  floats.push({ id: seq++, text: `${hit.total}!`, x: 35 + Math.random() * 30, y: 34 + Math.random() * 8, kind: 'hit', big: hit.total >= 100000 });
  for (const q of echoQueue) {
    floats.push({ id: seq++, text: q.text, x: 25 + Math.random() * 50, y: 48 + Math.random() * 8, kind: 'echo' });
  }
  floats.push({ id: seq++, text: `💎+${gain}`, x: 40 + Math.random() * 20, y: 62 + Math.random() * 8, kind: 'diamond' });
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

/** 回合结束：猫粮回满一次，进入下一回合 */
export function endTurn(prev: BattleState): BattleState {
  if (prev.over) return prev;
  const turn = prev.turn + 1;
  if (turn > prev.level.maxTurns) {
    return { ...prev, over: 'lose', log: [...prev.log, '💀 回合耗尽，堡垒仍未击破……挑战失败'].slice(-80) };
  }
  return {
    ...prev, turn, ap: prev.apMax, apBonus: 0, turnActed: {},
    food: prev.foodMax,
    log: [...prev.log, `— 第 ${turn} 回合开始 · 🍖 猫粮回满 —`].slice(-80),
  };
}
