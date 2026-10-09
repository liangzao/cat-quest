import { catCost, catImg, describeEffect, describeTrait, star } from '@/game/cats';
import { CAT_TYPE_COLOR, CAT_TYPE_LABEL } from '@/game/types';
import type { CatDef, CatInstance } from '@/game/types';
import { cn } from '@/lib/utils';

const RARITY_STYLE = [
  '',
  'border-slate-500/60',
  'border-amber-400/70 shadow-[0_0_10px_rgba(250,204,21,0.25)]',
  'border-fuchsia-400/80 shadow-[0_0_14px_rgba(232,121,249,0.4)]',
];

export function CatCard({
  def, inst, selected, dimmed, onClick, size = 'md', order,
}: {
  def: CatDef;
  inst?: CatInstance;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
  order?: number;
}) {
  const level = inst?.level ?? 1;
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative text-left rounded-xl border-2 bg-slate-900/80 backdrop-blur transition-all',
        RARITY_STYLE[def.rarity],
        selected && 'ring-4 ring-yellow-300 scale-105',
        dimmed && 'opacity-40 grayscale',
        size === 'sm' ? 'p-1.5 w-full' : 'p-2 w-full',
        onClick && 'cursor-pointer hover:scale-[1.03] active:scale-95',
      )}
    >
      <div className={cn('absolute inset-x-0 top-0 h-1 rounded-t-lg bg-gradient-to-r', CAT_TYPE_COLOR[def.type])} />
      <div className="flex items-center gap-1.5">
        <img
          src={catImg(def.id)}
          alt={def.name}
          className={cn('shrink-0 rounded-full bg-slate-800/70 object-contain', size === 'sm' ? 'h-8 w-8' : 'h-11 w-11')}
        />
        <div className="min-w-0 flex-1">
          <div className={cn('font-bold truncate', size === 'sm' ? 'text-xs' : 'text-sm')}>{def.name}</div>
          <div className="text-[10px] text-amber-300">{star(def.rarity)}</div>
          <div className="text-[10px] text-slate-400">
            {CAT_TYPE_LABEL[def.type]} · 🍖{catCost(def)}
          </div>
        </div>
        {inst && (
          <div className="text-right text-[10px] leading-tight">
            <div className="font-bold text-sky-300">Lv.{inst.level}</div>
          </div>
        )}
        {order !== undefined && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-black text-slate-900">
            {order}
          </span>
        )}
      </div>
      {size === 'md' && (
        <div className="mt-1 space-y-0.5">
          {def.effects.map((e, i) => (
            <div key={i} className="text-[11px] leading-tight text-slate-300">✦ {describeEffect(e, level)}</div>
          ))}
          {def.traits.map((t, i) => (
            <div key={i} className="text-[11px] leading-tight text-fuchsia-300">❖ {describeTrait(t)}</div>
          ))}
          {inst && inst.level > 1 && (
            <div className="text-[10px] text-sky-400">数值已按 Lv.{inst.level} 计算</div>
          )}
        </div>
      )}
    </button>
  );
}
