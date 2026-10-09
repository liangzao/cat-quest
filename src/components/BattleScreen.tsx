import { useEffect, useRef, useState } from 'react';
import { CAT_MAP, catCost } from '@/game/cats';
import { fmt, RUN_GACHA_COST, SUMMON_LIMIT, victoryReward } from '@/game/balance';
import { createBattle, endTurn, resolveAction, summonRunCat } from '@/game/engine';
import { playBgm, playSfx, restoreMute, setMuted, isMuted } from '@/game/audio';
import type { BattleState, CatInstance, LevelDef, Placement } from '@/game/types';
import { Button } from '@/components/ui/button';
import { rollColor } from './CatCard';
import { cn } from '@/lib/utils';

export interface RunResult {
  win: boolean;
  bestHit: number;
  bestTotal: number;
  totalDealt: number;
  turnsLeft: number;
  diamondEarned: number;
  summonedCount: number;
}

function StackCol({
  title, color, cats, heroUnder, food,
}: {
  title: string;
  color: string;
  cats: CatInstance[];
  heroUnder?: boolean;
  food: number;
}) {
  return (
    <div className="flex min-h-48 flex-1 flex-col rounded-xl border border-slate-700 bg-slate-900/50 p-2">
      <div className={cn('mb-2 rounded bg-gradient-to-r px-1 py-0.5 text-center text-xs font-black text-black', color)}>
        {title}
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        {cats.map((inst) => {
          const def = CAT_MAP[inst.defId];
          const cost = def.traits.some((t) => t.kind === 'free') ? 0 : catCost(def);
          const starving = cost > food;
          return (
            <div
              key={inst.uid}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800/80 px-2 py-1.5 text-sm',
                starving && 'opacity-45',
              )}
            >
              <span className="text-xl">{def.emoji}</span>
              <span className="flex-1 truncate font-bold">{def.name}</span>
              <span className="text-[10px] font-bold text-sky-300">Lv.{inst.level}</span>
              <span className={cn('text-[10px]', inst.roll >= 1.2 ? 'text-fuchsia-300' : 'text-slate-400')}>
                {Math.round(inst.roll * 100)}%
              </span>
              <span className="text-[11px] text-slate-400">{cost === 0 ? '免费' : `🍖${cost}`}</span>
            </div>
          );
        })}
        {heroUnder && (
          <div className="mt-auto flex items-center gap-2 rounded-lg border-2 border-amber-400 bg-amber-950/60 p-1.5">
            <img src={import.meta.env.BASE_URL + "assets/hero-cat.png"} alt="勇者猫" className="h-12 w-12 object-contain drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
            <div className="flex-1">
              <div className="font-black text-amber-300">勇者</div>
              <div className="text-[11px] text-slate-400">基础攻击 1</div>
            </div>
          </div>
        )}
        {cats.length === 0 && !heroUnder && (
          <div className="flex flex-1 items-center justify-center text-xs text-slate-600">（空）</div>
        )}
      </div>
      <div className="mt-1 text-center text-[10px] text-slate-500">
        {title.includes('先锋') ? '▲ 从上到下行动（最先）' : title.includes('伙伴') ? '▲ 主角随伙伴后出手' : title === '援军' ? '▼ 最后行动 · 不耗粮' : '▼ 最后行动'}
      </div>
    </div>
  );
}

function ZonePanel({ st }: { st: BattleState }) {
  const h = st.lastHit;
  if (!h) return null;
  const rows: { label: string; v: string; cls: string }[] = [
    { label: '基础攻击', v: `${h.base}`, cls: 'text-slate-300' },
    { label: '提高数值（含总提高/总数值）', v: `+${fmt(h.IF)}`, cls: 'text-sky-300' },
    { label: '提高百分比', v: `+${fmtPct(h.IP)}`, cls: 'text-sky-300' },
    { label: '额外数值（含总额外/总数值）', v: `+${fmt(h.EF)}`, cls: 'text-emerald-300' },
    { label: '额外百分比', v: `+${fmtPct(h.EP)}`, cls: 'text-emerald-300' },
    { label: '总数值', v: `+${fmt(h.TF)}`, cls: 'text-violet-300' },
    { label: '总百分比', v: `+${fmtPct(h.TP)}`, cls: 'text-fuchsia-300' },
    { label: '攻击次数', v: `×${h.hits}`, cls: 'text-amber-300' },
  ];
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-2.5 text-xs">
      <div className="mb-1 text-sm font-bold text-slate-300">📊 上一击乘区拆解</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-2">
            <span className="truncate text-slate-400">{r.label}</span>
            <span className={cn('font-mono font-bold', r.cls)}>{r.v}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 rounded bg-slate-950/70 p-2 font-mono text-xs leading-relaxed text-slate-300">
        (({h.base}+{fmt(h.IF)})×{(1 + h.IP).toFixed(2)} + {fmt(h.EF)}×{(1 + h.EP).toFixed(2)} + {fmt(h.TF)}) × {(1 + h.TP).toFixed(2)} × {h.hits}次
        = <span className="text-xl font-black text-yellow-300">{fmt(h.total)}</span>
      </div>
    </div>
  );
}

function fmtPct(p: number): string {
  if (p >= 100) return `${Math.round(p)}`;
  return `${Math.round(p * 100)}%`;
}

export function BattleScreen({
  level, placement, foodCap, startDiamonds = 0, onExit, onRetreat, onNext,
}: {
  level: LevelDef;
  placement: Placement;
  foodCap: number;
  startDiamonds?: number;
  onExit: (result: RunResult) => void;
  onRetreat: () => void;
  onNext?: () => void;
}) {
  const [st, setSt] = useState<BattleState>(() => createBattle(level, placement, foodCap, startDiamonds));
  const [flash, setFlash] = useState(0);
  const [muted, setMutedState] = useState(isMuted());
  const [showSummon, setShowSummon] = useState(false);
  const [lastPull, setLastPull] = useState<CatInstance | null>(null);
  const reported = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    restoreMute();
    setMutedState(isMuted());
    const unlock = () => playBgm();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [st.log]);

  useEffect(() => {
    if (st.over && !reported.current) {
      reported.current = true;
      playSfx(st.over === 'win' ? 'win' : 'click');
      onExit({
        win: st.over === 'win',
        bestHit: st.bestHit,
        bestTotal: st.bestAction,
        totalDealt: st.totalDealt,
        turnsLeft: Math.max(0, level.maxTurns - st.turn),
        diamondEarned: st.diamondEarned,
        summonedCount: st.summoned.length,
      });
    }
  }, [st.over]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = () => {
    if (st.over) return;
    playSfx('hit');
    setFlash((f) => f + 1);
    setSt((s) => resolveAction(s));
  };

  const summon = () => {
    if (st.over) return;
    const r = summonRunCat(st);
    if (!r) return;
    playSfx('gacha');
    setLastPull(r.inst);
    setSt(r.st);
  };

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    setMutedState(m);
  };

  const hpPct = (st.fortressHp / st.fortressMax) * 100;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-2.5 p-2 sm:p-3">
      {/* 堡垒：城堡大图 + 大字号血量 */}
      <div
        key={flash}
        className={cn('relative overflow-hidden rounded-2xl border-2 border-red-900 fortress-hit-wrap', flash > 0 && 'fortress-hit')}
      >
        <img src={import.meta.env.BASE_URL + "assets/castle.jpg"} alt="魔王城堡" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        <div className="relative p-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-sm font-black text-red-200">🏰 {level.name}</div>
              {level.shield ? <div className="mt-0.5 text-xs font-bold text-sky-300">🛡️ 每次行动吸收 {fmt(level.shield)}</div> : null}
              {level.dmgCap ? <div className="mt-0.5 text-xs font-bold text-orange-300">⛔ 每次行动限伤 {fmt(level.dmgCap)}</div> : null}
            </div>
            <div className="text-right">
              <div className="text-3xl font-black leading-none text-yellow-200 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                {fmt(st.fortressHp)}
              </div>
              <div className="mt-0.5 text-xs font-bold text-slate-300">/ {fmt(st.fortressMax)}</div>
            </div>
          </div>
          <div className="mt-2 h-5 overflow-hidden rounded-full border border-slate-600 bg-slate-900/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 transition-all duration-500"
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 资源行：大字号 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl bg-slate-900/70 px-4 py-2.5 text-base">
        <span className="text-lg">⏳ <b className="text-amber-300">{st.turn}</b><span className="text-slate-400">/{level.maxTurns}</span> 回合</span>
        <span className="flex items-center gap-1 text-lg">
          ⚡
          {Array.from({ length: st.ap }).map((_, i) => <span key={i} className="text-xl text-yellow-300">●</span>)}
          {Array.from({ length: Math.max(0, st.apMax + st.apBonus - st.ap) }).map((_, i) => <span key={i} className="text-xl text-slate-700">○</span>)}
        </span>
        <span className="text-lg">🍖 <b className="text-orange-300">{st.food}</b><span className="text-sm text-slate-400">/{foodCap}</span></span>
        <span className="text-lg" title="关卡钻石：召唤援军用，胜负都清空">💎 <b className="text-cyan-300">{fmt(st.diamonds)}</b></span>
        {st.summoned.length > 0 && <span className="text-sm text-violet-300">援军 ×{st.summoned.length}</span>}
        {st.refundPool > 0 && <span className="text-sm text-emerald-300">（存粮 +{st.refundPool}）</span>}
        <span className="ml-auto text-sm text-slate-400">最高单发 <b className="text-yellow-300">{fmt(st.bestHit)}</b></span>
        <button onClick={toggleMute} className="rounded-lg bg-slate-700 px-2 py-0.5 text-sm hover:bg-slate-500">
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* 战场 */}
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          {st.floats.map((f) => (
            <span
              key={f.id}
              className={cn(
                'float-num absolute font-black',
                f.kind === 'hit' ? (f.big ? 'big-num text-yellow-300' : 'text-3xl text-yellow-200') : '',
                f.kind === 'echo' && 'text-xl text-violet-300',
                f.kind === 'vanguard' && 'text-base text-orange-300',
                f.kind === 'info' && 'text-xs text-sky-300',
              )}
              style={{ left: `${f.x}%`, top: `${f.y}%` }}
            >
              {f.text}
            </span>
          ))}
        </div>

        <div className="flex gap-2.5">
          <StackCol title="支援猫猫" color="from-violet-400 to-purple-500" cats={st.placement.support} food={st.food} />
          <StackCol title="伙伴猫猫" color="from-sky-400 to-blue-500" cats={st.placement.partner} heroUnder food={st.food} />
          <StackCol title="先锋猫猫" color="from-orange-400 to-red-500" cats={[...st.placement.vanguard, ...st.spawned]} food={st.food} />
          <StackCol title="援军" color="from-fuchsia-400 to-pink-500" cats={st.summoned} food={st.food} />
        </div>
      </div>

      {/* 操作区 */}
      <div className="flex items-center gap-2">
        <Button
          onClick={act}
          disabled={!!st.over}
          className="h-16 flex-1 bg-gradient-to-r from-amber-500 to-red-600 text-2xl font-black text-black hover:from-amber-400 hover:to-red-500"
        >
          ⚔️ 攻击！
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowSummon(true)}
          disabled={!!st.over}
          className="h-16 border-fuchsia-500/50 bg-fuchsia-950/40 px-4 text-base font-bold text-fuchsia-200 hover:bg-fuchsia-900/60"
        >
          🎰 召唤<br /><span className="text-xs font-normal">💎{RUN_GACHA_COST}</span>
        </Button>
        <Button variant="outline" className="h-16 px-4 text-base" onClick={() => setSt((s) => endTurn(s))} disabled={!!st.over}>
          结束回合
        </Button>
        <Button variant="outline" className="h-16 px-4 text-base" onClick={onRetreat} disabled={!!st.over}>
          🏕️ 撤回整队
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <ZonePanel st={st} />
        <div ref={logRef} className="max-h-44 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/60 p-2 text-xs leading-relaxed text-slate-300">
          {st.log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>

      {/* 局内召唤弹窗 */}
      {showSummon && !st.over && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setShowSummon(false)}>
          <div className="w-full max-w-sm rounded-2xl border-2 border-fuchsia-500/50 bg-slate-900 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-fuchsia-300">🎰 召唤援军</h3>
              <button onClick={() => setShowSummon(false)} className="rounded-lg bg-slate-700 px-2 py-0.5 text-sm hover:bg-slate-500">✕</button>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              消耗 <b className="text-cyan-300">{RUN_GACHA_COST}💎 关卡钻石</b> 召唤一只临时猫猫立即参战（等级=队伍平均等级，<b className="text-cyan-300">不消耗猫粮</b>，援军最后行动，最多 {SUMMON_LIMIT} 只）。
              援军与钻石<b className="text-amber-300">无论胜负都会清空</b>。
            </p>
            {lastPull && (
              <div className="mx-auto mt-3 w-40 rounded-xl border border-slate-600 bg-slate-800/70 p-3 text-center">
                <div className="text-4xl">{CAT_MAP[lastPull.defId].emoji}</div>
                <div className="mt-1 text-sm font-bold">{CAT_MAP[lastPull.defId].name}</div>
                <div className={cn('text-xs font-bold', rollColor(lastPull.roll))}>个体值 {Math.round(lastPull.roll * 100)}%</div>
                <div className="mt-1 text-[10px] text-slate-500">{CAT_MAP[lastPull.defId].desc}</div>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              <Button
                className="flex-1 bg-gradient-to-r from-fuchsia-600 to-purple-700 font-black"
                disabled={st.diamonds < RUN_GACHA_COST}
                onClick={summon}
              >
                召唤 ×1（{RUN_GACHA_COST}💎）
              </Button>
              <span className="text-sm font-bold text-cyan-300">💎{fmt(st.diamonds)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 结算 */}
      {st.over && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border-2 border-slate-600 bg-slate-900 p-6 text-center">
            {st.over === 'win' ? (
              <img src={import.meta.env.BASE_URL + "assets/princess-cat.png"} alt="公主猫" className="mx-auto h-36 object-contain drop-shadow-[0_0_24px_rgba(232,121,249,0.6)]" />
            ) : (
              <div className="text-6xl">💀</div>
            )}
            <h3 className="mt-2 text-2xl font-black">
              {st.over === 'win' ? '堡垒击破，公主得救！' : '挑战失败……'}
            </h3>
            <div className="mt-3 space-y-1 text-sm text-slate-300">
              <div>总伤害 <b className="text-yellow-300">{fmt(st.totalDealt)}</b> · 最高单发 <b className="text-yellow-300">{fmt(st.bestHit)}</b> · 最高单行动 <b className="text-yellow-300">{fmt(st.bestAction)}</b></div>
              {st.over === 'win' ? (
                <div className="text-base">获得 <b className="text-fuchsia-300">🏆{fmt(victoryReward(level.chapter, Math.max(0, level.maxTurns - st.turn)))} 勇者徽章</b>
                  <span className="text-xs text-slate-400">（剩余回合越多越多）</span></div>
              ) : (
                <div className="text-xs text-slate-400">胜利才能获得 🏆 勇者徽章，再试一次！</div>
              )}
              <div className="text-xs text-slate-400">
                本关获得 💎{fmt(st.diamondEarned)}、援军 ×{st.summoned.length} —— 关卡内资源已清空
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {st.over === 'win' && onNext && (
                <Button className="bg-gradient-to-r from-amber-500 to-orange-600 font-black text-black" onClick={onNext}>
                  ⬇ 下一层
                </Button>
              )}
              <Button variant="outline" onClick={onRetreat}>
                🏕️ 回基地抽卡 / 整队
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
