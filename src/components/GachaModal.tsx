import { useState } from 'react';
import { pullMany } from '@/game/gacha';
import { GACHA_COST } from '@/game/balance';
import { CAT_MAP } from '@/game/cats';
import { playSfx } from '@/game/audio';
import type { CatInstance, SaveData } from '@/game/types';
import { Button } from '@/components/ui/button';
import { rollColor } from './CatCard';
import { cn } from '@/lib/utils';

interface Result {
  inst: CatInstance;
  rarity: number;
}

export function GachaModal({
  save, onChange, onClose,
}: {
  save: SaveData;
  onChange: (fn: (s: SaveData) => SaveData) => void;
  onClose: () => void;
}) {
  const [results, setResults] = useState<Result[] | null>(null);
  const [shaking, setShaking] = useState(false);

  const doPull = (n: 1 | 10) => {
    const cost = GACHA_COST * n;
    if (save.badges < cost) return;
    playSfx('gacha');
    setShaking(true);
    setTimeout(() => setShaking(false), 600);
    const pulls = pullMany(n);
    onChange((s) => ({ ...s, badges: s.badges - cost, collection: [...s.collection, ...pulls.map((p) => p.inst)] }));
    setResults(pulls);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border-2 border-fuchsia-500/50 bg-slate-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-fuchsia-300">🎰 猫猫召唤</h3>
          <button onClick={onClose} className="rounded-lg bg-slate-700 px-2 py-0.5 text-sm hover:bg-slate-500">✕</button>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          消耗勇者徽章召唤魔法猫猫。个体值 85%~125% 随机，同名猫猫也有强弱之分！
        </p>

        <div className={cn('mx-auto my-3 w-40 text-center', shaking && 'gacha-shake')}>
          <img src={import.meta.env.BASE_URL + "assets/gacha.png" alt="猫猫扭蛋" className="w-40 h-40 object-contain drop-shadow-[0_0_20px_rgba(232,121,249,0.5)]" />
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1 bg-gradient-to-r from-fuchsia-600 to-purple-700 font-black"
            disabled={save.badges < GACHA_COST}
            onClick={() => doPull(1)}
          >
            召唤 ×1（{GACHA_COST}🏆）
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 font-black text-black"
            disabled={save.badges < GACHA_COST * 10}
            onClick={() => doPull(10)}
          >
            召唤 ×10（{GACHA_COST * 10}🏆）
          </Button>
        </div>
        <div className="mt-1 text-center text-xs text-slate-400">当前徽章：{save.badges}🏆</div>

        {results && (
          <div className="mt-3 grid max-h-56 grid-cols-5 gap-1.5 overflow-y-auto">
            {results.map((r, i) => {
              const def = CAT_MAP[r.inst.defId];
              return (
                <div
                  key={i}
                  className={cn(
                    'rounded-lg border p-1 text-center',
                    r.rarity === 3 ? 'border-fuchsia-400 bg-fuchsia-950/50' : r.rarity === 2 ? 'border-amber-400/70 bg-amber-950/30' : 'border-slate-600 bg-slate-800/60',
                  )}
                >
                  <div className="text-2xl">{def.emoji}</div>
                  <div className="truncate text-[10px] font-bold">{def.name}</div>
                  <div className={cn('text-[10px] font-bold', rollColor(r.inst.roll))}>{Math.round(r.inst.roll * 100)}%</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
