import { useMemo, useState } from 'react';
import { STORY_LEVELS } from '@/game/levels';
import { fmt } from '@/game/balance';
import type { SaveData } from '@/game/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Defense {
  fortify: number; // 加固城墙：每点 +2% HP
  shield: number;  // 吸收护盾：每点 = 每次行动吸收 12，共 5 次行动
  cap: number;     // 限伤结界：每点 -2% 每次行动伤害上限
  weaken: number;  // 反魔领域：每点 -1% 勇者总伤害
}

const COST: Record<keyof Defense, { max: number; per: string; desc: string; emoji: string }> = {
  fortify: { max: 40, per: '每点 +2% 堡垒耐久', desc: '加厚城墙，硬吃勇者的爆发', emoji: '🧱' },
  shield: { max: 30, per: '每点 行动护盾+12（共5次行动）', desc: '每次行动先吸收一波伤害', emoji: '🛡️' },
  cap: { max: 30, per: '每点 行动限伤-2%', desc: '压制勇者每次行动的输出上限', emoji: '⛔' },
  weaken: { max: 50, per: '每点 勇者总伤害-1%', desc: '诅咒领域，全方位削弱勇者', emoji: '💀' },
};

export function DemonMode({
  save, onBack,
}: {
  save: SaveData;
  onBack: () => void;
}) {
  const doneLevels = STORY_LEVELS.filter((l) => save.records[l.id]?.completed);
  const [levelId, setLevelId] = useState(doneLevels[doneLevels.length - 1]?.id ?? '2-5');
  const [def, setDef] = useState<Defense>({ fortify: 0, shield: 0, cap: 0, weaken: 0 });
  const [result, setResult] = useState<'win' | 'lose' | null>(null);

  const level = STORY_LEVELS.find((l) => l.id === levelId)!;
  const heroTotal = save.records[levelId]?.bestTotal || Math.round(level.hp * 0.7);
  const heroHit = save.records[levelId]?.bestHit || Math.round(heroTotal * 0.4);

  const spent = def.fortify + def.shield + def.cap + def.weaken;
  const budget = 100;

  const sim = useMemo(() => {
    const actions = level.maxTurns * 3;
    let dmg = heroTotal * (1 - def.weaken * 0.01);
    const perAction = dmg / actions;
    let cap = perAction * (1 - def.cap * 0.02);
    let total = 0;
    let absorbed = 0;
    for (let i = 0; i < actions; i++) {
      let d = Math.min(perAction, cap);
      const ab = Math.min(def.shield * 12, d);
      d -= ab;
      absorbed += ab;
      total += d;
    }
    const hp = level.hp * 0.55 * (1 + def.fortify * 0.02);
    return { total, absorbed, hp, survive: total < hp };
  }, [def, heroTotal, level]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl p-4 pb-24">
      <div className="mb-3 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>← 返回</Button>
        <h2 className="text-2xl font-black text-red-400">😈 魔王模式</h2>
      </div>
      <p className="mb-3 rounded-lg border border-red-900 bg-red-950/30 p-2 text-xs text-red-200">
        勇者将要攻打 {level.id}「{level.name}」。他此前在此关造成的最高总伤害为 <b>{fmt(heroTotal)}</b>（单发最高 {fmt(heroHit)}）。
        用有限的预算布下防御，让堡垒在他打满全部行动后依然矗立！
      </p>

      <div className="mb-3">
        <div className="mb-1 text-xs font-bold text-slate-400">选择要抵御的勇者战绩</div>
        <div className="flex flex-wrap gap-1.5">
          {doneLevels.map((l) => (
            <button
              key={l.id}
              onClick={() => { setLevelId(l.id); setResult(null); }}
              className={cn(
                'rounded-lg border px-2 py-1 text-xs',
                l.id === levelId ? 'border-red-400 bg-red-950/60 text-red-200' : 'border-slate-700 bg-slate-900/60 text-slate-400',
              )}
            >
              {l.id} {l.name} · 总伤{save.records[l.id] ? fmt(save.records[l.id].bestTotal) : '-'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between text-sm">
        <span>防御预算：<b className={spent > budget ? 'text-red-400' : 'text-amber-300'}>{spent}</b> / {budget}</span>
        <Button size="sm" variant="ghost" onClick={() => { setDef({ fortify: 0, shield: 0, cap: 0, weaken: 0 }); setResult(null); }}>重置</Button>
      </div>

      <div className="space-y-2">
        {(Object.keys(COST) as (keyof Defense)[]).map((k) => (
          <div key={k} className="rounded-xl border border-slate-700 bg-slate-900/60 p-2.5">
            <div className="flex items-center gap-2 text-sm">
              <span>{COST[k].emoji}</span>
              <span className="font-bold">{k === 'fortify' ? '加固城墙' : k === 'shield' ? '吸收护盾' : k === 'cap' ? '限伤结界' : '反魔领域'}</span>
              <span className="ml-auto font-mono text-amber-300">{def[k]}</span>
              <div className="flex gap-1">
                <button className="h-6 w-6 rounded bg-slate-700 hover:bg-slate-500" onClick={() => setDef({ ...def, [k]: Math.max(0, def[k] - 5) })}>-5</button>
                <button className="h-6 w-6 rounded bg-slate-700 hover:bg-slate-500" onClick={() => setDef({ ...def, [k]: Math.max(0, def[k] - 1) })}>-</button>
                <button className="h-6 w-6 rounded bg-slate-700 hover:bg-slate-500" onClick={() => setDef({ ...def, [k]: Math.min(COST[k].max, def[k] + 1) })}>+</button>
                <button className="h-6 w-9 rounded bg-slate-700 hover:bg-slate-500" onClick={() => setDef({ ...def, [k]: Math.min(COST[k].max, def[k] + 5) })}>+5</button>
              </div>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">{COST[k].per} · {COST[k].desc}</div>
            <div className="mt-1 h-1.5 rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-red-500" style={{ width: `${(def[k] / COST[k].max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <Button
        className="mt-4 w-full bg-gradient-to-r from-red-700 to-red-900 font-black"
        disabled={spent > budget || !!result}
        onClick={() => setResult(sim.survive ? 'win' : 'lose')}
      >
        🏰 启动防御，迎接勇者
      </Button>

      {result && (
        <div className={cn('mt-3 rounded-xl border-2 p-3 text-sm', result === 'win' ? 'border-red-400 bg-red-950/50' : 'border-slate-600 bg-slate-900/70')}>
          <div className="text-lg font-black">{result === 'win' ? '😈 防御成功！勇者铩羽而归' : '😭 堡垒被攻破……魔王颜面尽失'}</div>
          <div className="mt-1 text-xs text-slate-300">
            勇者总输出（结算后）约 <b>{fmt(Math.round(sim.total))}</b>（其中护盾吸收 {fmt(Math.round(sim.absorbed))}）·
            堡垒有效耐久 <b>{fmt(Math.round(sim.hp))}</b>
          </div>
          {result === 'win'
            ? <div className="mt-1 text-xs text-red-200">剩余耐久 {fmt(Math.round(sim.hp - sim.total))}！公主继续睡大觉。</div>
            : <div className="mt-1 text-xs text-slate-400">差 {fmt(Math.round(sim.total - sim.hp))} 点伤害没挡住，再调整一下防御分配吧。</div>}
        </div>
      )}
    </div>
  );
}
