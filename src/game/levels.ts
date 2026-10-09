import type { LevelDef } from './types';

export const HERO_BASE_ATK = 1;
export const HERO_BASE_AP = 3;

export const STORY_LEVELS: LevelDef[] = [
  // ── 第一章：教学 ──
  {
    id: '1-1', chapter: 1, index: 1, name: '勇者初征', hp: 30, maxTurns: 3, foodScale: 1,
    story: '公主被魔王抓走了！先砸开第一道城门。把猫猫放进对应的伙伴栏/先锋栏/支援栏，让 1 点攻击的主角打出不可思议的伤害。',
    tutorial: [
      '猫猫分三类：先锋、伙伴、支援，行动顺序为 先锋 → 伙伴+主角 → 支援。猫猫只能放进对应类型的栏位。',
      '每次攻击后猫粮都会回满；勇者每行动一次，出手的猫猫都会吃掉自己的猫粮，吃不起就跳过。',
      '每次行动固定获得 180💎 + 伤害奖励钻石（每 5 点伤害再 +1），一次攻击就够抽一张卡；同名猫上场自动合成升级。',
    ],
  },
  {
    id: '1-2', chapter: 1, index: 2, name: '猫猫小队', hp: 180, maxTurns: 3, foodScale: 1,
    story: '守军多了起来。试试叠多只伙伴猫猫——提高数值与提高百分比会乘算，越叠越爆炸。',
    tutorial: ['抽到的猫不喜欢？出售可以换 40💎。', '上场顺序就是行动顺序：先上场的猫先行动。想调整顺序，撤回手牌后按新顺序重新上场。'],
  },
  {
    id: '1-3', chapter: 1, index: 3, name: '先锋集结', hp: 240, maxTurns: 3, foodScale: 1,
    story: '先锋猫猫在主角出手前先行进攻，还能让后面的猫猫额外生效。注意先锋栏里越靠上越先行动。',
    tutorial: ['先锋猫猫按「从上到下」的顺序依次行动。', '鼓手猫能让之后行动的猫猫效果额外生效——把它放在叠层最上方，让全队吃到鼓声。'],
  },
  {
    id: '1-4', chapter: 1, index: 4, name: '支援之力', hp: 500, maxTurns: 3, foodScale: 1,
    story: '支援猫猫在主角出手后行动：回响主角的伤害。先打一个大数字，再让它回荡！',
    tutorial: ['回响猫会按主角本次伤害的百分比追加伤害。', '炼金猫能提高每次行动获得的钻石——攻击越痛，钻石越多。'],
  },
  {
    id: '1-5', chapter: 1, index: 5, name: '教学毕业考', hp: 1500, maxTurns: 4, foodScale: 1,
    story: '堡垒大门就在前方。综合运用三类猫猫，打出你的第一个大数字吧！',
  },

  // ── 第二章：魔王防线（亿级血量，1 点攻击堆出天文数字）──
  {
    id: '2-1', chapter: 2, index: 1, name: '坚固城门', hp: 12000, maxTurns: 7, foodScale: 1,
    shield: 100,
    story: '第二章的城墙厚得离谱，城门法阵每次行动都会吸收一波伤害。抽卡合成、叠好乘区，一击破阵！',
  },
  {
    id: '2-2', chapter: 2, index: 2, name: '贫瘠之地', hp: 30000, maxTurns: 7, foodScale: 0.7,
    story: '荒原上猫粮稀缺（上限打了 7 折）。带上不耗粮的猫猫，精打细算每一次行动。',
  },
  {
    id: '2-3', chapter: 2, index: 3, name: '魔王近卫', hp: 40000, maxTurns: 7, foodScale: 1,
    dmgCap: 30000,
    story: '近卫队布下了限伤结界：每次行动伤害有上限。平均分配输出，别浪费大数字！',
  },
  {
    id: '2-4', chapter: 2, index: 4, name: '孤军奇袭', hp: 450000, maxTurns: 7, foodScale: 1.15,
    story: '魔王的赌局：没有机关，纯拼阵容理解。猫粮上限 +15%，全力输出！',
  },
  {
    id: '2-5', chapter: 2, index: 5, name: '魔王堡垒', hp: 1000000, maxTurns: 8, foodScale: 1.25,
    shield: 8000,
    story: '最终决战！亿万耐久的魔王堡垒矗立在面前。基础攻击 1 点的勇者，能叠出弑神的数字吗？',
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
  const hp = Math.round(3000 * Math.pow(2.8, stage - 1));
  const shield = stage >= 5 ? Math.round(2000 * Math.pow(1.8, stage - 5)) : undefined;
  return {
    id: `endless-${stage}`, chapter: 0, index: stage, stage,
    name: `无尽 · 第 ${stage} 层`,
    story: `魔王无限增殖的堡垒，第 ${stage} 层。用 1 点攻击叠出更高的单发伤害！`,
    hp, maxTurns: 6, foodScale: 1.1,
    shield,
  };
}
