import { CATS } from './cats';
import { GACHA_WEIGHTS } from './balance';
import type { CatInstance } from './types';

let gachaUid = 1;
const newUid = () => `g${Date.now().toString(36)}-${gachaUid++}`;

/** 单抽：先随机类型（三类均分），再按稀有度权重（★1:70 / ★2:25 / ★3:5）抽该类型下的猫猫，1 级 */
export function drawOne(): { inst: CatInstance; rarity: 1 | 2 | 3 } {
  const types: ('vanguard' | 'partner' | 'support')[] = ['vanguard', 'partner', 'support'];
  const type = types[Math.floor(Math.random() * types.length)];
  const total = GACHA_WEIGHTS.reduce((s, w) => s + w.w, 0);
  let r = Math.random() * total;
  let rarity: 1 | 2 | 3 = 1;
  for (const w of GACHA_WEIGHTS) {
    if (r < w.w) { rarity = w.rarity as 1 | 2 | 3; break; }
    r -= w.w;
  }
  let pool = CATS.filter((c) => c.type === type && c.rarity === rarity);
  if (!pool.length) pool = CATS.filter((c) => c.type === type);
  const def = pool[Math.floor(Math.random() * pool.length)];
  return { inst: { uid: newUid(), defId: def.id, level: 1 }, rarity };
}

/** 开局手牌：连抽 n 张 */
export function drawHand(n: number): CatInstance[] {
  return Array.from({ length: n }, () => drawOne().inst);
}
