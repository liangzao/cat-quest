import { useMemo, useState } from 'react';
import { CAT_MAP } from '@/game/cats';
import { EXCHANGE_PACKS, EXCHANGE_RATE, foodCap, foodUpgradeCost, fmt, MAX_FOOD_UPGRADE, upgradeCost } from '@/game/balance';
import type { CatType, LevelDef, Placement, SaveData } from '@/game/types';
import { CAT_TYPE_LABEL } from '@/game/types';
import { CatCard } from './CatCard';
import { GachaModal } from './GachaModal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const COLS: { type: CatType; hint: string; actionHint: string }[] = [
  { type: 'support', hint: '第 1 列', actionHint: '最后行动：回响与后勤' },
  { type: 'partner', hint: '第 2 列', actionHint: '与主角同时：强化主角乘区' },
  { type: 'vanguard', hint: '第 3 列', actionHint: '最先行动：先攻与全队增幅' },
];

const MAX_LEVEL = 80;

export function SetupScreen({
  level, save, onBack, onChange, onStart,
}: {
  level: LevelDef;
  save: SaveData;
  onBack: () => void;
  onChange: (fn: (s: SaveData) => SaveData) => void;
  onStart: (p: Placement, startDiamonds: number, badgeCost: number) => void;
}) {
  const initial = save.lastFormation ?? { support: [], partner: [], vanguard: [] };
  const [placement, setPlacement] = useState<Placement>(initial);
  const [sel, setSel] = useState<string | null>(null); // uid
  const [showGacha, setShowGacha] = useState(false);
  // 预定兑换：开局时扣除徽章、带入关卡钻石（💎 胜负都清空）
  const [exchange, setExchange] = useState(0); // 已预定的徽章数
  const startDiamonds = exchange * EXCHANGE_RATE;

  const placedUids = useMemo(
    () => new Set([...placement.support, ...placement.partner, ...placement.vanguard].map((i) => i.uid)),
    [placement],
  );
  const avail = save.collection.filter((c) => !placedUids.has(c.uid));
  const placedCount = placedUids.size;
  const selInst = sel ? save.collection.find((c) => c.uid === sel) : null;
  const selDef = selInst ? CAT_MAP[selInst.defId] : null;
  const cap = Math.round(foodCap(save.foodUpgrade) * level.foodScale);
  const upCost = foodUpgradeCost(save.foodUpgrade);

  const setP = (p: Placement) => {
    setPlacement(p);
    onChange((s) => ({ ...s, lastFormation: p }));
  };

  const place = (type: CatType) => {
    if (!sel) return;
    const inst = avail.find((a) => a.uid === sel);
    if (!inst) return;
    setP({ ...placement, [type]: [...placement[type], inst] });
    setSel(null);
  };

  const unplace = (type: CatType, uid: string) => {
    setP({ ...placement, [type]: placement[type].filter((a) => a.uid !== uid) });
    if (sel === uid) setSel(null);
  };

  const move = (type: CatType, idx: number, dir: -1 | 1) => {
    const arr = [...placement[type]];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    setP({ ...placement, [type]: arr });
  };

  const orderOf = (type: CatType, uid: string): number => {
    let n = 1;
    for (const t of ['vanguard', 'partner', 'support'] as CatType[]) {
      for (const inst of placement[t]) {
        if (t === type && inst.uid === uid) return n;
        n++;
      }
    }
    return n;
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl p-3 pb-32">
      {/* 顶栏 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>← 返回</Button>
        <h2 className="text-xl font-black">{level.name}</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-lg bg-fuchsia-950/70 border border-fuchsia-500/40 px-2.5 py-1 font-bold text-fuchsia-200" title="勇者徽章：胜利获得，用于召唤/强化/升上限/兑换开局钻石">
            🏆 {fmt(save.badges)}
          </span>
          <button
            onClick={() => save.foodUpgrade < MAX_FOOD_UPGRADE && onChange((s) =>
              s.badges >= upCost ? { ...s, badges: s.badges - upCost, foodUpgrade: s.foodUpgrade + 1 } : s,
            )}
            className="rounded-lg border border-orange-500/40 bg-orange-950/70 px-2.5 py-1 font-bold text-orange-200 hover:border-orange-300"
            title={save.foodUpgrade < MAX_FOOD_UPGRADE ? `升级猫粮上限：${fmt(upCost)}🏆` : '已满级'}
          >
            🍖 上限 {cap}{save.foodUpgrade < MAX_FOOD_UPGRADE && <span className="ml-1 text-xs font-normal">↑{fmt(upCost)}🏆</span>}
          </button>
          <Button size="sm" className="bg-gradient-to-r from-fuchsia-600 to-purple-700 font-bold" onClick={() => setShowGacha(true)}>
            🎰 召唤
          </Button>
        </div>
      </div>

      {/* 兑换行：🏆 → 开局💎（💎 胜负都清空） */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-3 py-2 text-sm">
        <span className="font-bold text-cyan-200">💱 兑换开局钻石</span>
        <span className="text-xs text-slate-400">1🏆 = {EXCHANGE_RATE}💎 · 仅本关有效，胜负都清空</span>
        {EXCHANGE_PACKS.map((pack) => (
          <button
            key={pack}
            disabled={save.badges - exchange < pack}
            onClick={() => setExchange(exchange + pack)}
            className={cn(
              'rounded-lg border px-2 py-1 text-xs font-bold transition',
              save.badges - exchange >= pack
                ? 'border-cyan-400/60 bg-cyan-900/50 text-cyan-100 hover:bg-cyan-700/60'
                : 'border-slate-700 bg-slate-900/60 text-slate-600',
            )}
          >
            +{pack * EXCHANGE_RATE}💎（{pack}🏆）
          </button>
        ))}
        {exchange > 0 && (
          <>
            <span className="rounded-lg bg-cyan-900/60 px-2 py-1 text-xs font-bold text-cyan-100">
              开局携带 💎{fmt(startDiamonds)}（共 {exchange}🏆）
            </span>
            <button onClick={() => setExchange(0)} className="rounded-lg bg-slate-700 px-2 py-1 text-xs hover:bg-slate-500">
              重置
            </button>
          </>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-slate-900/60 px-3 py-2 text-sm">
        <span className="text-base">🏰 城堡 <b className="text-red-300">{fmt(level.hp)}</b></span>
        <span className="text-base">⏳ <b className="text-amber-300">{level.maxTurns}</b> 回合</span>
        <span className="text-base">⚔️ 主角攻击 <b className="text-sky-300">1</b></span>
        {level.shield ? <span className="text-base">🛡️ 每行动吸收 <b className="text-sky-300">{fmt(level.shield)}</b></span> : null}
        {level.dmgCap ? <span className="text-base">⛔ 每行动限伤 <b className="text-orange-300">{fmt(level.dmgCap)}</b></span> : null}
      </div>

      {level.story && <p className="mb-3 rounded-lg bg-slate-900/60 p-2 text-xs text-slate-300">{level.story}</p>}
      <div className="mb-3 rounded-lg border border-cyan-500/25 bg-cyan-950/20 p-2 text-xs text-cyan-200">
        💎 战斗中每次行动都能获得关卡钻石，可召唤仅本关有效的援军猫猫；💎 与援军无论胜负都会清空。
        胜利可获得 🏆 勇者徽章（永久），可在此兑换开局钻石——不兑换也能通关，但会更有挑战！
      </div>
      {level.tutorial && (
        <div className="mb-3 space-y-1 rounded-lg border border-amber-500/30 bg-amber-950/30 p-2 text-xs text-amber-200">
          {level.tutorial.map((t, i) => <div key={i}>💡 {t}</div>)}
        </div>
      )}

      {/* 布阵三列 */}
      <div className="grid grid-cols-3 gap-2">
        {COLS.map(({ type, hint, actionHint }) => (
          <div key={type} className="rounded-xl border-2 border-slate-700 bg-slate-900/50 p-2">
            <div className="mb-2 text-center">
              <div className="text-xs font-bold text-slate-300">{CAT_TYPE_LABEL[type]}</div>
              <div className="text-[10px] text-slate-500">{hint} · {actionHint}</div>
            </div>
            <div className="space-y-1.5">
              {placement[type].map((inst, idx) => {
                const def = CAT_MAP[inst.defId];
                return (
                  <div key={inst.uid} className="relative">
                    <CatCard def={def} inst={inst} size="sm" selected={sel === inst.uid}
                      onClick={() => unplace(type, inst.uid)} order={orderOf(type, inst.uid)} />
                    <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col gap-0.5">
                      <button className="rounded bg-slate-700 px-1 text-[10px] leading-3 hover:bg-slate-500" onClick={(e) => { e.stopPropagation(); move(type, idx, -1); }}>↑</button>
                      <button className="rounded bg-slate-700 px-1 text-[10px] leading-3 hover:bg-slate-500" onClick={(e) => { e.stopPropagation(); move(type, idx, 1); }}>↓</button>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => place(type)}
                className={cn(
                  'flex h-10 w-full items-center justify-center rounded-xl border-2 border-dashed text-lg transition',
                  sel ? 'border-yellow-400 bg-yellow-400/10 text-yellow-300' : 'border-slate-700 text-slate-600',
                )}
              >
                {sel ? '⬇ 放到这里' : '＋'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 选中猫猫详情 / 强化 */}
      {selInst && selDef && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-950/40 p-2 text-sm">
          <span className="text-2xl">{selDef.emoji}</span>
          <div>
            <div className="font-bold">{selDef.name} <span className="text-xs text-slate-400">Lv.{selInst.level} · 个体值 {Math.round(selInst.roll * 100)}%</span></div>
            <div className="text-[11px] text-slate-400">
              效果倍率 ×{(selInst.roll * (1 + 0.45 * (selInst.level - 1))).toFixed(1)}
            </div>
          </div>
          <Button
            size="sm" className="ml-auto bg-gradient-to-r from-sky-600 to-blue-700 font-bold"
            disabled={selInst.level >= MAX_LEVEL || save.badges < upgradeCost(selInst.level)}
            onClick={() => onChange((s) => ({
              ...s,
              badges: s.badges - upgradeCost(selInst.level),
              collection: s.collection.map((c) => c.uid === selInst.uid ? { ...c, level: c.level + 1 } : c),
            }))}
          >
            {selInst.level >= MAX_LEVEL ? '已满级' : `⬆ 强化 Lv.${selInst.level + 1}（${fmt(upgradeCost(selInst.level))}🏆）`}
          </Button>
        </div>
      )}

      {/* 收藏 */}
      <div className="mt-4">
        <div className="mb-1 text-xs font-bold text-slate-400">
          我的猫猫（{avail.length} 只可用 · 共 {save.collection.length} 只）— 点选后放入对应列，再点一次查看强化
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {avail.map((inst) => {
            const def = CAT_MAP[inst.defId];
            return (
              <CatCard key={inst.uid} def={def} inst={inst}
                selected={sel === inst.uid}
                onClick={() => setSel(sel === inst.uid ? null : inst.uid)} />
            );
          })}
        </div>
      </div>

      {/* 底部开始按钮 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-700 bg-slate-950/90 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="text-xs text-slate-400">
            已上阵 {placedCount} 只 · 每行动猫粮 <b className="text-orange-300">{cap}</b>
            {startDiamonds > 0 && <> · 开局 <b className="text-cyan-300">💎{fmt(startDiamonds)}</b></>}
          </div>
          <Button
            className="ml-auto h-12 bg-gradient-to-r from-amber-500 to-orange-600 px-8 text-lg font-black text-black hover:from-amber-400 hover:to-orange-500"
            disabled={placedCount === 0}
            onClick={() => onStart(placement, startDiamonds, exchange)}
          >
            ⚔️ 开始挑战{exchange > 0 && `（兑 💎${fmt(startDiamonds)}）`}
          </Button>
        </div>
      </div>

      {showGacha && <GachaModal save={save} onChange={onChange} onClose={() => setShowGacha(false)} />}
    </div>
  );
}
