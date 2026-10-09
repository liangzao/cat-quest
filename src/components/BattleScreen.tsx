import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, DragEvent } from 'react';
import { CAT_MAP, catCost, describeEffect, describeTrait, star } from '@/game/cats';
import { fmt, DRAW_COST, SELL_PRICE, START_HAND, victoryReward } from '@/game/balance';
import { createBattle, drawCard, dropCard, endTurn, placeCard, resolveAction, sellCard, unplaceCard } from '@/game/engine';
import { drawHand } from '@/game/gacha';
import { playBgm, playSfx, restoreMute, setMuted, isMuted } from '@/game/audio';
import type { BattleState, CatInstance, CatType, LevelDef } from '@/game/types';
import { CAT_TYPE_COLOR, CAT_TYPE_LABEL, SLOT_LIMIT } from '@/game/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface RunResult {
  win: boolean;
  retreated?: boolean;
  hpLeft: number;
  bestHit: number;
  bestTotal: number;
  totalDealt: number;
  turnsLeft: number;
  diamondEarned: number;
}

const COLS: { type: CatType; hint: string }[] = [
  { type: 'support', hint: '▼ 最后行动：回响与后勤' },
  { type: 'partner', hint: '主角随伙伴后出手' },
  { type: 'vanguard', hint: '▲ 从上到下行动（最先）' },
];

const DND_MIME = 'text/cat-uid';
const getDragUid = (e: DragEvent) => e.dataTransfer.getData(DND_MIME) || null;

/** 城堡场景：随输出逐渐破损坍塌，击破后公主获救 */
function CastleScene({ st }: { st: BattleState }) {
  const pct = st.fortressMax > 0 ? st.fortressHp / st.fortressMax : 0;
  const broken = st.over === 'win';
  const style: CSSProperties = broken
    ? { transform: 'rotate(14deg) translateY(36%) scaleY(0.5)', filter: 'brightness(.35) grayscale(.9)' }
    : pct > 0.66
      ? {}
      : pct > 0.33
        ? { transform: 'rotate(-2deg) translateY(3%)', filter: 'brightness(.85) saturate(.85)' }
        : { transform: 'rotate(4deg) translateY(10%)', filter: 'brightness(.55) saturate(.6)' };
  return (
    <div className="relative h-44 shrink-0 overflow-hidden rounded-xl border border-red-900 bg-slate-950 lg:h-auto lg:w-64">
      <img
        src={import.meta.env.BASE_URL + "assets/castle.jpg"}
        alt="魔王城堡"
        className="absolute inset-0 h-full w-full object-cover transition-all duration-1000"
        style={style}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
      {!broken && pct <= 0.33 && (
        <div className="absolute inset-x-0 bottom-1 flex animate-pulse justify-center gap-2 text-2xl">🔥 💥 🔥</div>
      )}
      {!broken && pct <= 0.66 && pct > 0.33 && (
        <div className="absolute inset-x-0 bottom-1 flex animate-pulse justify-center gap-2 text-xl">💨 🌫️</div>
      )}
      {broken && (
        <>
          <img
            src={import.meta.env.BASE_URL + "assets/princess-cat.png"}
            alt="公主猫"
            className="absolute bottom-0 left-1/2 h-24 -translate-x-1/2 animate-bounce object-contain drop-shadow-[0_0_18px_rgba(232,121,249,0.8)]"
          />
          <div className="absolute inset-x-0 top-2 animate-pulse text-center text-lg font-black text-yellow-300 drop-shadow">
            ✨ 公主得救！✨
          </div>
        </>
      )}
    </div>
  );
}

/** 悬停/长按悬浮卡：显示猫猫当前等级的具体数值 */
function CatTip({ inst, open }: { inst: CatInstance; open?: boolean }) {
  const def = CAT_MAP[inst.defId];
  const cost = def.traits.some((t) => t.kind === 'free') ? 0 : catCost(def);
  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2 rounded-xl border border-slate-500 bg-slate-950/95 p-2.5 text-left shadow-2xl',
        open ? 'block' : 'hidden group-hover:block',
      )}
    >      <div className="flex items-center gap-1.5">
        <span className="text-2xl">{def.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black">{def.name}</div>
          <div className="text-[10px] text-amber-300">{star(def.rarity)} · {CAT_TYPE_LABEL[def.type]} · {cost === 0 ? '不耗粮' : `🍖${cost}`}</div>
        </div>
        <span className="rounded bg-sky-900 px-1.5 py-0.5 text-[10px] font-bold text-sky-200">Lv.{inst.level}</span>
      </div>
      <div className="mt-1.5 space-y-0.5 border-t border-slate-700 pt-1.5">
        {def.effects.map((e, i) => (
          <div key={i} className="text-[11px] leading-snug text-slate-200">✦ {describeEffect(e, inst.level)}</div>
        ))}
        {def.traits.map((t, i) => (
          <div key={i} className="text-[11px] leading-snug text-fuchsia-300">❖ {describeTrait(t)}</div>
        ))}
      </div>
      <div className="mt-1 border-t border-slate-800 pt-1 text-[10px] leading-snug text-slate-400">{def.desc}</div>
    </div>
  );
}

/** 初始资源面板里的猫猫卡：悬停/长按查看数值 */
function ModalCat({ inst }: { inst: CatInstance }) {
  const def = CAT_MAP[inst.defId];
  const tip = useLongTip();
  return (
    <button
      onClick={tip.click(() => {})}
      {...tip.touch}
      className="group relative w-24 rounded-xl border border-slate-600 bg-slate-800/80 p-2 text-center transition hover:scale-[1.04]"
    >
      <CatTip inst={inst} open={tip.tipOpen} />
      <div className="text-3xl">{def.emoji}</div>
      <div className="mt-1 text-xs font-bold">{def.name}</div>
      <div className="text-[10px] text-amber-300">{star(def.rarity)} · {CAT_TYPE_LABEL[def.type]}</div>
    </button>
  );
}

/** 长按 400ms 打开悬浮卡（手机端无悬停）；悬浮卡打开时再点一下只关闭、不触发卡片点击 */
function useLongTip() {
  const [tipOpen, setTipOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const start = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTipOpen(true), 400);
  };
  const cancel = () => window.clearTimeout(timer.current);
  const click = (fn: () => void) => () => {
    if (tipOpen) { setTipOpen(false); return; }
    fn();
  };
  const touch = { onTouchStart: start, onTouchEnd: cancel, onTouchMove: cancel };
  return { tipOpen, touch, click, close: () => setTipOpen(false) };
}

function HandCard({ inst, selected, onClick, canDrag }: { inst: CatInstance; selected: boolean; onClick: () => void; canDrag?: boolean }) {
  const def = CAT_MAP[inst.defId];
  const tip = useLongTip();
  return (
    <button
      onClick={tip.click(onClick)}
      {...tip.touch}
      draggable={canDrag}
      onDragStart={(e) => { e.dataTransfer.setData(DND_MIME, inst.uid); e.dataTransfer.effectAllowed = 'move'; }}
      className={cn(
        'group relative w-24 shrink-0 rounded-xl border-2 bg-slate-900/90 p-1.5 text-left transition-all sm:w-28',
        def.rarity === 2 ? 'border-amber-400/70' : def.rarity === 3 ? 'border-fuchsia-400/80 shadow-[0_0_12px_rgba(232,121,249,0.35)]' : 'border-slate-500/70',
        selected && 'ring-4 ring-yellow-300 scale-105',
        canDrag && 'cursor-grab active:cursor-grabbing',
        onClick && 'cursor-pointer hover:scale-[1.04] active:scale-95',
      )}
    >
      <CatTip inst={inst} open={tip.tipOpen} />
      <div className={cn('absolute inset-x-0 top-0 h-1 rounded-t-lg bg-gradient-to-r', CAT_TYPE_COLOR[def.type])} />
      <div className="flex items-center gap-1">
        <span className="text-xl leading-none">{def.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-bold leading-tight">{def.name}</div>
          <div className="text-[9px] text-slate-400">{star(def.rarity)} · {CAT_TYPE_LABEL[def.type].slice(0, 2)}</div>
        </div>
      </div>
      {inst.level > 1 && (
        <div className="absolute -right-1 -top-1 rounded-full bg-sky-600 px-1 text-[9px] font-black text-white">Lv.{inst.level}</div>
      )}
    </button>
  );
}

function FieldCat({
  inst, st, hl, onUnplace, canDrag, dropOver, onCatDragOver, onCatDrop,
}: {
  inst: CatInstance;
  st: BattleState;
  hl: boolean;
  onUnplace: () => void;
  canDrag?: boolean;
  dropOver?: boolean;
  onCatDragOver?: (e: DragEvent) => void;
  onCatDrop?: (e: DragEvent) => void;
}) {
  const def = CAT_MAP[inst.defId];
  const cost = def.traits.some((t) => t.kind === 'free') ? 0 : catCost(def);
  const starving = cost > st.food;
  const tip = useLongTip();
  return (
    <button
      onClick={tip.click(onUnplace)}
      {...tip.touch}
      title="点击撤回手牌；可拖动调整顺序"
      draggable={canDrag}
      onDragStart={(e) => { e.dataTransfer.setData(DND_MIME, inst.uid); e.dataTransfer.effectAllowed = 'move'; }}
      onDragOver={onCatDragOver}
      onDrop={onCatDrop}
      className={cn(
        'group relative flex items-center gap-1.5 rounded-lg border bg-slate-800/80 px-2 py-1.5 text-sm text-left transition-all',
        hl ? 'border-yellow-300 ring-2 ring-yellow-300 scale-105 bg-slate-700' : 'border-slate-600',
        dropOver && 'border-sky-300 ring-2 ring-sky-300',
        canDrag && 'cursor-grab active:cursor-grabbing',
        starving && !hl && 'opacity-45',
      )}
    >
      <CatTip inst={inst} open={tip.tipOpen} />
      <span className={cn('text-xl', hl && 'animate-bounce')}>{def.emoji}</span>
      <span className="flex-1 truncate font-bold">{def.name}</span>
      {inst.level > 1 && <span className="rounded bg-sky-900/80 px-1 text-[10px] font-bold text-sky-300">Lv.{inst.level}</span>}
      <span className="text-[11px] text-slate-400">{cost === 0 ? '免费' : `🍖${cost}`}</span>
    </button>
  );
}

function StackCol({
  type, st, highlightUid, onUnplace, onDrop,
}: {
  type: CatType;
  st: BattleState;
  highlightUid: string | null;
  onUnplace: (uid: string) => void;
  onDrop: (uid: string, toType: CatType, toIndex: number) => void;
}) {
  const cats = st.placement[type];
  const limit = SLOT_LIMIT[type];
  const heroUnder = type === 'partner';
  const [colOver, setColOver] = useState(false);
  const [catOver, setCatOver] = useState<string | null>(null);
  const clearOver = () => { setColOver(false); setCatOver(null); };
  return (
    <div
      className={cn(
        'flex min-h-56 flex-1 flex-col rounded-xl border bg-slate-900/50 p-2 transition-colors',
        colOver ? 'border-sky-400 border-2' : 'border-slate-700',
      )}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
      onDragEnter={() => setColOver(true)}
      onDragLeave={clearOver}
      onDrop={(e) => {
        e.preventDefault();
        const uid = getDragUid(e);
        clearOver();
        if (uid) onDrop(uid, type, st.placement[type].length);
      }}
    >
      <div className={cn('mb-2 flex items-center justify-center gap-1 rounded bg-gradient-to-r px-1 py-0.5 text-xs font-black text-black', CAT_TYPE_COLOR[type])}>
        {CAT_TYPE_LABEL[type]}
        <span className="rounded bg-black/40 px-1 text-[10px]">{cats.length}/{limit}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        {cats.map((inst, idx) => (
          <FieldCat
            key={inst.uid}
            inst={inst}
            st={st}
            hl={highlightUid === inst.uid}
            onUnplace={() => onUnplace(inst.uid)}
            canDrag={!st.over}
            dropOver={catOver === inst.uid}
            onCatDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setCatOver(inst.uid); }}
            onCatDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const uid = getDragUid(e);
              clearOver();
              if (uid && uid !== inst.uid) onDrop(uid, type, idx);
            }}
          />
        ))}
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
          <div className="flex flex-1 items-center justify-center text-xs text-slate-600">（点击手牌「上场」）</div>
        )}
      </div>
      <div className="mt-1 text-center text-[10px] text-slate-500">{COLS.find((c) => c.type === type)!.hint}</div>
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
  level, foodCap, startDiamonds = 0, hpLeft, onFinish,
}: {
  level: LevelDef;
  foodCap: number;
  startDiamonds?: number;
  hpLeft?: number;
  onFinish: (result: RunResult) => void;
}) {
  const [st, setSt] = useState<BattleState>(() =>
    createBattle(level, foodCap, { startDiamonds, initialHand: drawHand(START_HAND), hpLeft }));
  const [flash, setFlash] = useState(0);
  const [muted, setMutedState] = useState(isMuted());
  const [sel, setSel] = useState<string | null>(null); // 选中的手牌 uid
  const [started, setStarted] = useState(false);       // 初始资源展示阶段
  const [busy, setBusy] = useState(false);             // 攻击/结束回合冷却（含动画）
  const [highlightUid, setHighlightUid] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    restoreMute();
    setMutedState(isMuted());
    const unlock = () => playBgm();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      timers.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [st.log]);

  const finish = (win: boolean, retreated = false) => {
    onFinish({
      win, retreated,
      hpLeft: st.fortressHp,
      bestHit: st.bestHit,
      bestTotal: st.bestAction,
      totalDealt: st.totalDealt,
      turnsLeft: Math.max(0, level.maxTurns - st.turn),
      diamondEarned: st.diamondEarned,
    });
  };

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    setMutedState(m);
  };

  /** 按行动顺序依次亮起猫猫卡，期间锁定按钮（≥1 秒，防误触） */
  const playOrderAnimation = (order: string[]) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const step = 150;
    order.forEach((uid, i) => {
      timers.current.push(window.setTimeout(() => setHighlightUid(uid), i * step));
    });
    const total = Math.max(1000, order.length * step + 400);
    timers.current.push(window.setTimeout(() => { setHighlightUid(null); setBusy(false); }, total));
  };

  const act = () => {
    if (st.over || busy) return;
    playSfx('hit');
    setFlash((f) => f + 1);
    setBusy(true);
    setSel(null);
    setSt((s) => {
      const next = resolveAction(s);
      playOrderAnimation(next.lastOrder);
      return next;
    });
  };

  const endTurnClick = () => {
    if (st.over || busy) return;
    setBusy(true);
    timers.current.push(window.setTimeout(() => setBusy(false), 1000));
    setSt((s) => endTurn(s));
  };

  const retreat = () => {
    if (st.over) return;
    finish(false, true);
  };

  /** 拖拽落点：手牌→栏、跨栏移动、栏内重排（引擎统一校验类型/栏满/合成） */
  const handleDrop = (uid: string, toType: CatType, toIndex: number) => {
    if (st.over) return;
    setSel(null);
    setSt((s) => dropCard(s, uid, toType, toIndex));
  };

  // 胜利后延迟弹出结算，先看城堡坍塌、公主获救
  const [showEndModal, setShowEndModal] = useState(false);
  useEffect(() => {
    if (!st.over) { setShowEndModal(false); return; }
    if (st.over === 'win') {
      const t = window.setTimeout(() => setShowEndModal(true), 1800);
      return () => window.clearTimeout(t);
    }
    setShowEndModal(true);
  }, [st.over]);

  const selInst = sel ? st.hand.find((c) => c.uid === sel) : null;
  const selDef = selInst ? CAT_MAP[selInst.defId] : null;
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
        <span className="text-lg" title="猫粮每回合开始回满一次；勇者每行动一次扣除出手猫猫的猫粮">🍖 <b className="text-orange-300">{st.food}</b><span className="text-sm text-slate-400">/{foodCap}</span></span>
        <span className="text-lg" title="关卡钻石：抽卡/出售用，胜负都清空">💎 <b className="text-cyan-300">{fmt(st.diamonds)}</b></span>
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
                f.kind === 'diamond' && 'text-lg text-cyan-300',
                f.kind === 'info' && 'text-xs text-sky-300',
              )}
              style={{ left: `${f.x}%`, top: `${f.y}%` }}
            >
              {f.text}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-2.5 lg:flex-row">
          <CastleScene st={st} />
          <div className="flex flex-1 gap-2.5">
            <StackCol type="support" st={st} highlightUid={highlightUid} onUnplace={(uid) => setSt((s) => unplaceCard(s, 'support', uid))} onDrop={handleDrop} />
            <StackCol type="partner" st={st} highlightUid={highlightUid} onUnplace={(uid) => setSt((s) => unplaceCard(s, 'partner', uid))} onDrop={handleDrop} />
            <StackCol type="vanguard" st={st} highlightUid={highlightUid} onUnplace={(uid) => setSt((s) => unplaceCard(s, 'vanguard', uid))} onDrop={handleDrop} />
          </div>
        </div>
      </div>

      {/* 手牌区 */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-2">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">🃏 手牌（{st.hand.length}）— 拖动卡片上阵/调序（手机端点选后按「放入」）</span>
          {selInst && selDef && (
            <span className="ml-auto flex items-center gap-1.5">
              <Button
                size="sm"
                className="h-7 bg-gradient-to-r from-sky-600 to-blue-700 px-3 text-xs font-bold"
                onClick={() => { setSt((s) => placeCard(s, selInst.uid)); setSel(null); }}
              >
                ⬆ 放入{CAT_TYPE_LABEL[selDef.type]}
              </Button>
              <Button
                size="sm" variant="outline"
                className="h-7 border-amber-500/50 px-3 text-xs font-bold text-amber-300"
                onClick={() => { setSt((s) => sellCard(s, selInst.uid)); setSel(null); }}
              >
                💰 出售 +{SELL_PRICE}
              </Button>
            </span>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {st.hand.map((inst) => (
            <HandCard key={inst.uid} inst={inst} selected={sel === inst.uid} canDrag={!st.over} onClick={() => setSel(sel === inst.uid ? null : inst.uid)} />
          ))}
          {st.hand.length === 0 && <div className="flex h-20 flex-1 items-center justify-center text-xs text-slate-600">（手牌为空，抽卡获得猫猫）</div>}
        </div>
      </div>

      {/* 操作区 */}
      <div className="flex items-center gap-2">
        <Button
          onClick={act}
          disabled={!!st.over || busy || !started}
          className="h-16 flex-1 bg-gradient-to-r from-amber-500 to-red-600 text-2xl font-black text-black hover:from-amber-400 hover:to-red-500"
        >
          {busy ? '…' : '⚔️ 攻击！'}
        </Button>
        <Button
          variant="outline"
          onClick={() => { playSfx('gacha'); setSt((s) => drawCard(s)); }}
          disabled={!!st.over || busy || !started || st.diamonds < DRAW_COST}
          className="h-16 border-fuchsia-500/50 bg-fuchsia-950/40 px-4 text-base font-bold text-fuchsia-200 hover:bg-fuchsia-900/60"
        >
          🎴 抽卡<br /><span className="text-xs font-normal">💎{DRAW_COST}</span>
        </Button>
        <Button variant="outline" className="h-16 px-4 text-base" onClick={endTurnClick} disabled={!!st.over || busy || !started}>
          结束回合
        </Button>
        <Button variant="outline" className="h-16 px-4 text-base" onClick={retreat} disabled={!!st.over || !started} title="撤回整队：本关获得的猫猫与钻石清空，但堡垒已受的伤害会保留">
          🏕️ 撤回
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <ZonePanel st={st} />
        <div ref={logRef} className="max-h-44 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/60 p-2 text-xs leading-relaxed text-slate-300">
          {st.log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>

      {/* 初始资源展示阶段 */}
      {!started && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border-2 border-amber-500/50 bg-slate-900 p-5 text-center">
            <h3 className="text-xl font-black text-amber-300">🎒 局内初始资源</h3>
            <p className="mt-1 text-xs text-slate-400">
              本关开始时随机发放 3 张猫猫卡{startDiamonds > 0 && `，并带入兑换的 💎${fmt(startDiamonds)}`}
              {hpLeft !== undefined && hpLeft < level.hp && <>；堡垒已被削弱至 <b className="text-orange-300">{fmt(hpLeft)}</b></>}。
              猫猫与钻石仅本关有效，胜负都清空。
            </p>
            <div className="mt-3 flex justify-center gap-2">
              {st.hand.map((inst) => <ModalCat key={inst.uid} inst={inst} />)}
            </div>
            {startDiamonds > 0 && (
              <div className="mt-2 text-sm font-bold text-cyan-300">💎 开局钻石 {fmt(startDiamonds)}</div>
            )}
            <Button
              className="mt-4 w-full bg-gradient-to-r from-amber-500 to-orange-600 text-lg font-black text-black hover:from-amber-400 hover:to-orange-500"
              onClick={() => { playSfx('click'); setStarted(true); }}
            >
              ⚔️ 排好阵容，开始进攻！
            </Button>
          </div>
        </div>
      )}

      {/* 结算 */}
      {st.over && started && showEndModal && (
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
                <div className="text-xs text-orange-200">堡垒还剩 <b>{fmt(st.fortressHp)}</b> —— 已造成的伤害会保留，调整阵容再冲一次！</div>
              )}
              <div className="text-xs text-slate-400">
                本关累计获得 💎{fmt(st.diamondEarned)} —— 关卡内资源已清空
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-600 font-black text-black"
                onClick={() => finish(st.over === 'win')}
              >
                {st.over === 'win' ? '🎉 领取奖励，继续' : '💪 返回准备，再次挑战'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
