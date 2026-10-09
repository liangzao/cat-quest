// 难度校准模拟（v4 新经济）：零兑换（不消耗徽章换开局钻石）情况下，
// 模拟玩家在局内抽卡/合成/排阵，检验能否通关、是否无脑。
import { STORY_LEVELS, endlessLevel } from '../src/game/levels';
import { createBattle, drawCard, placeCard, resolveAction } from '../src/game/engine';
import { drawHand } from '../src/game/gacha';
import { foodCap, START_HAND } from '../src/game/balance';
import type { BattleState, LevelDef } from '../src/game/types';

interface BotOpts {
  maxDrawsPerBattle: number;  // 整场最多抽卡次数（弱 bot 限制抽卡）
  placeChance: number;        // 每张手牌上场的概率（弱 bot 会漏放）
}

/** 模拟一局：抽→摆→打的循环 */
function runBattle(level: LevelDef, cap: number, opts: BotOpts): { win: boolean; dealt: number; bestHit: number; draws: number } {
  let st: BattleState = createBattle(level, cap, { initialHand: drawHand(START_HAND) });
  let draws = 0;
  let guard = 0;
  while (!st.over && guard++ < 500) {
    // 1) 抽卡（只要够钱且在限制内）
    while (draws < opts.maxDrawsPerBattle && st.diamonds >= 80 && !st.over) {
      st = drawCard(st);
      draws++;
    }
    // 2) 摆牌
    for (const inst of [...st.hand]) {
      if (Math.random() <= opts.placeChance) st = placeCard(st, inst.uid);
    }
    // 3) 攻击（ap 用完后引擎自动结束回合）
    const before = st.turn * 100 + st.ap;
    st = resolveAction(st);
    const after = st.turn * 100 + st.ap;
    if (after === before && !st.over) break; // 防御：无进展
  }
  return { win: st.over === 'win', dealt: st.totalDealt, bestHit: st.bestHit, draws };
}

function simLevel(level: LevelDef, foodUp: number, opts: BotOpts, runs: number) {
  const cap = Math.round(foodCap(foodUp) * level.foodScale);
  let wins = 0, sumDealt = 0, sumHit = 0, sumDraws = 0;
  for (let i = 0; i < runs; i++) {
    const r = runBattle(level, cap, opts);
    if (r.win) wins++;
    sumDealt += r.dealt;
    sumHit += r.bestHit;
    sumDraws += r.draws;
  }
  return { winRate: wins / runs, avgDealt: sumDealt / runs, avgHit: sumHit / runs, avgDraws: sumDraws / runs };
}

const NORMAL: BotOpts = { maxDrawsPerBattle: 999, placeChance: 1 };
const WEAK: BotOpts = { maxDrawsPerBattle: 4, placeChance: 0.5 };

// 各关卡的猫粮升级进度（仅靠胜利徽章买猫粮升级：300·2^n，胜利 165~255🏆）
const FOOD_UP: Record<string, number> = {
  '1-1': 0, '1-2': 0, '1-3': 0, '1-4': 1, '1-5': 1,
  '2-1': 1, '2-2': 2, '2-3': 2, '2-4': 3, '2-5': 3,
};

const fmtN = (n: number) => n >= 1e8 ? (n / 1e8).toFixed(2) + '亿' : n >= 1e4 ? (n / 1e4).toFixed(1) + '万' : n.toFixed(0);
const RUNS = 200;

console.log('== 正常玩家（零兑换、局内抽卡拉满）==');
console.log('关卡   胜率    平均总伤/城堡HP           平均单发      平均抽卡');
for (const lv of STORY_LEVELS) {
  const r = simLevel(lv, FOOD_UP[lv.id], NORMAL, RUNS);
  console.log(
    `${lv.id} ${lv.name.padEnd(6)} ${String(Math.round(r.winRate * 100)).padStart(4)}%  ` +
    `${(fmtN(r.avgDealt) + ' / ' + fmtN(lv.hp)).padEnd(20)}  ${fmtN(r.avgHit).padStart(8)}  ${r.avgDraws.toFixed(1)}次`
  );
}

console.log('\n== 弱对照组（整场只抽4次、一半牌不上场）——后期应当失败 ==');
for (const lv of STORY_LEVELS) {
  const r = simLevel(lv, FOOD_UP[lv.id], WEAK, RUNS);
  console.log(`${lv.id} ${lv.name.padEnd(6)} 胜率 ${String(Math.round(r.winRate * 100)).padStart(4)}%  平均总伤 ${fmtN(r.avgDealt)} / ${fmtN(lv.hp)}`);
}

console.log('\n== 无尽模式抽样（猫粮升级=3）==');
for (const s of [2, 4, 6, 9, 13, 18, 25]) {
  const lv = endlessLevel(s);
  const r = simLevel(lv, 3, NORMAL, 100);
  console.log(`  第${String(s).padStart(2)}层 HP ${fmtN(lv.hp).padStart(8)}: 胜率 ${String(Math.round(r.winRate * 100)).padStart(3)}%  平均单发 ${fmtN(r.avgHit)}`);
}
