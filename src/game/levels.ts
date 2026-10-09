import type { LevelDef } from './types';

export const HERO_BASE_ATK = 1;
export const HERO_BASE_AP = 3;

export const STORY_LEVELS: LevelDef[] = [
  // ── 第一章：教学 ──
  {
    id: '1-1', chapter: 1, index: 1, name: '勇者初征', hp: 30, maxTurns: 3, foodScale: 1,
    story: '公主被魔王抓走了！先砸开第一道城门。把猫猫放进伙伴栏，让 1 点攻击的主角打出不可思议的伤害。',
    tutorial: [
      '猫猫分三类：支援、伙伴、先锋，行动顺序为 先锋 → 伙伴+主角 → 支援。',
      '伙伴猫猫会强化主角的数值乘区；乘区之间是相乘，叠起来就是天文数字。',
      '每次主角攻击消耗 1 点行动值，行动值用完回合结束。',
    ],
  },
  {
    id: '1-2', chapter: 1, index: 2, name: '猫猫小队', hp: 250, maxTurns: 3, foodScale: 1,
    story: '守军多了起来。试试叠多只伙伴猫猫——提高数值与提高百分比会乘算，越叠越爆炸。',
    tutorial: ['战斗造成的伤害会转化为魔力结晶，用于抽卡和强化猫猫。', '同一种猫猫可以有不同个体值，数值越高的越稀有。'],
  },
  {
    id: '1-3', chapter: 1, index: 3, name: '先锋集结', hp: 350, maxTurns: 3, foodScale: 1,
    story: '先锋猫猫在主角出手前先行进攻，还能让后面的猫猫额外生效。注意先锋栏里越靠上越先行动。',
    tutorial: ['先锋猫猫按「从上到下」的顺序依次行动。', '鼓手猫能让之后行动的猫猫效果额外生效——把它放在叠层最下方，让伙伴吃到鼓声。'],
  },
  {
    id: '1-4', chapter: 1, index: 4, name: '支援之力', hp: 2200, maxTurns: 3, foodScale: 1,
    story: '支援猫猫在主角出手后行动：回响主角的伤害。先打一个大数字，再让它回荡！',
    tutorial: ['回响猫会按主角本次伤害的百分比追加伤害。', '炼金猫能把用不完的猫粮存到下一次行动。'],
  },
  {
    id: '1-5', chapter: 1, index: 5, name: '教学毕业考', hp: 6000, maxTurns: 4, foodScale: 1,
    story: '堡垒大门就在前方。综合运用三类猫猫，打出你的第一个大数字吧！战斗中赚的 💎 可以召唤援军。',
  },

  // ── 第二章：魔王防线（十万~亿级血量，1 点攻击堆出天文数字）──
  {
    id: '2-1', chapter: 2, index: 1, name: '坚固城门', hp: 25000, maxTurns: 4, foodScale: 1,
    shield: 300,
    story: '第二章的城墙厚得离谱——六十万耐久！城门法阵每次行动吸收 6000 点伤害。召唤援军、叠好乘区，一击破阵！',
  },
  {
    id: '2-2', chapter: 2, index: 2, name: '贫瘠之地', hp: 70000, maxTurns: 4, foodScale: 0.7,
    story: '荒原上猫粮稀缺（上限打了 7 折）。带上不耗粮的猫猫和炼金猫，精打细算。',
  },
  {
    id: '2-3', chapter: 2, index: 3, name: '魔王近卫', hp: 350000, maxTurns: 5, foodScale: 1,
    dmgCap: 120000,
    story: '近卫队布下了限伤结界：每次行动最多 60 万伤害。平均分配输出，别浪费大数字！',
  },
  {
    id: '2-4', chapter: 2, index: 4, name: '孤军奇袭', hp: 1200000, maxTurns: 4, foodScale: 1.15,
    story: '魔王削弱了你们的补给线？不——这是他设下的赌局：没有机关，纯拼阵容理解。猫粮上限 +15%。',
  },
  {
    id: '2-5', chapter: 2, index: 5, name: '魔王堡垒', hp: 1800000, maxTurns: 5, foodScale: 1.25,
    shield: 40000,
    story: '最终决战！一亿五千万耐久的魔王堡垒，护盾每次行动吸收 300 万。基础攻击 1 点的勇者，能叠出弑神的数字吗？',
  },
];

export function getLevel(id: string): LevelDef | undefined {
  return STORY_LEVELS.find((l) => l.id === id);
}

// ── 无尽模式 ──
export interface EndlessDef extends LevelDef {
  stage: number;
}

export function endlessLevel(stage: number): EndlessDef {
  const hp = Math.round(3000 * Math.pow(3.5, stage - 1));
  const shield = stage >= 5 ? Math.round(2000 * Math.pow(1.8, stage - 5)) : undefined;
  return {
    id: `endless-${stage}`, chapter: 0, index: stage, stage,
    name: `无尽 · 第 ${stage} 层`,
    story: `魔王无限增殖的堡垒，第 ${stage} 层。用更少的猫猫打出更高的单发伤害！`,
    hp, maxTurns: 5, foodScale: 1.1,
    shield,
  };
}
