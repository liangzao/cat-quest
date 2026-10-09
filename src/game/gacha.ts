import { CATS } from './cats';
import { GACHA_WEIGHTS, rollValue } from './balance';
import type { CatInstance } from './types';

let gachaUid = 1;
const newUid = () => `g${Date.now().toString(36)}-${gachaUid++}`;

/** 单抽：按稀有度权重随机一只猫猫，带随机个体值 */
export function pullOne(): { inst: CatInstance; rarity: 1 | 2 | 3 } {
  const total = GACHA_WEIGHTS.reduce((s, w) => s + w.w, 0);
  let r = Math.random() * total;
  let rarity: 1 | 2 | 3 = 1;
  for (const w of GACHA_WEIGHTS) {
    if (r < w.w) { rarity = w.rarity as 1 | 2 | 3; break; }
    r -= w.w;
  }
  const pool = CATS.filter((c) => c.rarity === rarity);
  const def = pool[Math.floor(Math.random() * pool.length)];
  return { inst: { uid: newUid(), defId: def.id, level: 1, roll: rollValue() }, rarity };
}

export function pullMany(count: number) {
  return Array.from({ length: count }, () => pullOne());
}
