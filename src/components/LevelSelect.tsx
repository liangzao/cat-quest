import { STORY_LEVELS } from '@/game/levels';
import { fmt } from '@/game/balance';
import type { SaveData } from '@/game/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function LevelSelect({
  save, onPick, onBack,
}: {
  save: SaveData;
  onPick: (levelId: string) => void;
  onBack: () => void;
}) {
  const chapters = [1, 2];
  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl p-4">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>← 返回</Button>
        <h2 className="text-2xl font-black">剧情模式</h2>
        <span className="ml-auto rounded-lg border border-fuchsia-500/40 bg-fuchsia-950/70 px-2.5 py-1 text-sm font-bold text-fuchsia-200">
          🏆 {fmt(save.badges)}
        </span>
      </div>
      {chapters.map((ch) => (
        <div key={ch} className="mb-6">
          <h3 className="mb-2 text-sm font-bold text-slate-400">
            {ch === 1 ? '第一章 · 教学之章' : '第二章 · 魔王防线（亿级血量）'}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {STORY_LEVELS.filter((l) => l.chapter === ch).map((l) => {
              const idx = STORY_LEVELS.indexOf(l);
              const prev = idx > 0 ? STORY_LEVELS[idx - 1] : null;
              const unlocked = !prev || !!save.records[prev.id]?.completed;
              const rec = save.records[l.id];
              return (
                <button
                  key={l.id}
                  disabled={!unlocked}
                  onClick={() => onPick(l.id)}
                  className={cn(
                    'rounded-xl border-2 p-3 text-left transition',
                    unlocked
                      ? 'border-slate-600 bg-slate-900/70 hover:scale-[1.02] hover:border-amber-400'
                      : 'border-slate-800 bg-slate-900/40 opacity-40',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{l.id} {l.name}</span>
                    <span>{rec?.completed ? '⭐' : unlocked ? '' : '🔒'}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    城堡 HP {fmt(l.hp)} · {l.maxTurns} 回合
                    {l.shield ? ` · 🛡️${fmt(l.shield)}` : ''}
                    {l.dmgCap ? ` · ⛔${fmt(l.dmgCap)}` : ''}
                    {l.foodScale !== 1 ? ` · 🍖×${l.foodScale}` : ''}
                  </div>
                  {rec?.hpLeft !== undefined && rec.hpLeft < l.hp && !rec.completed && (
                    <div className="mt-1 text-[11px] text-orange-300">🔥 已削弱至 {fmt(rec.hpLeft)}，再冲一次！</div>
                  )}
                  {rec && (rec.bestHit > 0 || rec.bestTotal > 0) && (
                    <div className="mt-1 text-[11px] text-amber-300">
                      最高单发 {fmt(rec.bestHit)} · 单行动最高 {fmt(rec.bestTotal)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
