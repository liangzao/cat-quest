import { useState } from 'react';
import { EXCHANGE_PACKS, EXCHANGE_RATE, foodCap, foodUpgradeCost, fmt, MAX_FOOD_UPGRADE } from '@/game/balance';
import type { LevelDef, SaveData } from '@/game/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** 关卡准备：查看关卡情报，可消耗 🏆 兑换本关开局 💎（胜负都清空），然后开始挑战 */
export function SetupScreen({
  level, save, onBack, onChange, onStart,
}: {
  level: LevelDef;
  save: SaveData;
  onBack: () => void;
  onChange: (fn: (s: SaveData) => SaveData) => void;
  onStart: (startDiamonds: number, badgeCost: number) => void;
}) {
  // 预定兑换：开局时扣除徽章、带入关卡钻石
  const [exchange, setExchange] = useState(0);
  const startDiamonds = exchange * EXCHANGE_RATE;
  const cap = Math.round(foodCap(save.foodUpgrade) * level.foodScale);
  const upCost = foodUpgradeCost(save.foodUpgrade);
  const hpLeft = save.records[level.id]?.hpLeft;
  const canAffordUp = save.badges - exchange >= upCost;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col p-4 pb-10">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>← 返回</Button>
        <h2 className="text-xl font-black">{level.name}</h2>
        <span className="ml-auto rounded-lg border border-fuchsia-500/40 bg-fuchsia-950/70 px-2.5 py-1 text-sm font-bold text-fuchsia-200" title="勇者徽章：胜利获得的永久资源">
          🏆 {fmt(save.badges)}
        </span>
      </div>

      {/* 关卡情报 */}
      <div className="mb-3 rounded-2xl border-2 border-red-900 bg-slate-900/60 p-4">
        <div className="flex items-end justify-between">
          <div className="text-lg font-black text-red-200">🏰 {level.id} · {level.name}</div>
          <div className="text-right">
            {hpLeft !== undefined && hpLeft < level.hp ? (
              <>
                <div className="text-2xl font-black leading-none text-orange-300">{fmt(hpLeft)}</div>
                <div className="mt-0.5 text-xs text-slate-400">/ {fmt(level.hp)}（上次已削弱）</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-black leading-none text-yellow-200">{fmt(level.hp)}</div>
                <div className="mt-0.5 text-xs text-slate-400">城堡耐久</div>
              </>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>⏳ <b className="text-amber-300">{level.maxTurns}</b> 回合</span>
          <span>⚔️ 主角攻击 <b className="text-sky-300">1</b></span>
          <span>🍖 每回合 <b className="text-orange-300">{cap}</b> 猫粮</span>
          {level.shield ? <span>🛡️ 每行动吸收 <b className="text-sky-300">{fmt(level.shield)}</b></span> : null}
          {level.dmgCap ? <span>⛔ 每行动限伤 <b className="text-orange-300">{fmt(level.dmgCap)}</b></span> : null}
        </div>
        {level.story && <p className="mt-2 rounded-lg bg-slate-950/60 p-2 text-xs leading-relaxed text-slate-300">{level.story}</p>}
      </div>

      {/* 玩法说明 */}
      <div className="mb-3 rounded-lg border border-cyan-500/25 bg-cyan-950/20 p-2.5 text-xs leading-relaxed text-cyan-200">
        💎 <b>关卡内经济</b>：每发动一次攻击，固定获得 150💎 + 伤害奖励钻石（每 5 点伤害 +1💎），炼金猫还能再加成。
        钻石用来抽猫猫（80💎/次）——同名猫猫上场自动<b>合成升级</b>，不要的猫可以出售（+40💎）。
        💎 与猫猫无论胜负都清空；只有胜利能获得永久的 🏆 徽章。
      </div>
      {level.tutorial && (
        <div className="mb-3 space-y-1 rounded-lg border border-amber-500/30 bg-amber-950/30 p-2 text-xs text-amber-200">
          {level.tutorial.map((t, i) => <div key={i}>💡 {t}</div>)}
        </div>
      )}

      {/* 兑换 + 猫粮升级 */}
      <div className="mb-3 rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold text-cyan-200">💱 兑换开局钻石</span>
          <span className="text-xs text-slate-400">1🏆 = {EXCHANGE_RATE}💎 · 仅本关有效，胜负都清空 · 不兑换也能通关</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {EXCHANGE_PACKS.map((pack) => (
            <button
              key={pack}
              disabled={save.badges - exchange < pack}
              onClick={() => setExchange(exchange + pack)}
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-xs font-bold transition',
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
      </div>

      <button
        onClick={() => save.foodUpgrade < MAX_FOOD_UPGRADE && canAffordUp && onChange((s) =>
          s.badges - exchange >= upCost ? { ...s, badges: s.badges - upCost, foodUpgrade: s.foodUpgrade + 1 } : s,
        )}
        className={cn(
          'mb-6 rounded-xl border px-3 py-2.5 text-left text-sm transition',
          save.foodUpgrade < MAX_FOOD_UPGRADE && canAffordUp
            ? 'border-orange-500/40 bg-orange-950/50 text-orange-200 hover:border-orange-300'
            : 'border-slate-700 bg-slate-900/50 text-slate-500',
        )}
        title={save.foodUpgrade < MAX_FOOD_UPGRADE ? (canAffordUp ? `升级猫粮上限：${fmt(upCost)}🏆` : `奖杯不足：需要 ${fmt(upCost)}🏆`) : '已满级'}
      >
        🍖 猫粮上限 <b>{foodCap(save.foodUpgrade)}</b>
        {save.foodUpgrade < MAX_FOOD_UPGRADE && (
          <span className="ml-2 text-xs">
            → {foodCap(save.foodUpgrade + 1)}（{fmt(upCost)}🏆 升级，永久生效）{!canAffordUp && ' · 奖杯不足'}
          </span>
        )}
      </button>

      <Button
        className="mt-auto h-14 bg-gradient-to-r from-amber-500 to-orange-600 text-xl font-black text-black hover:from-amber-400 hover:to-orange-500"
        onClick={() => onStart(startDiamonds, exchange)}
      >
        ⚔️ 进入关卡{exchange > 0 && `（带 💎${fmt(startDiamonds)}）`}
      </Button>
    </div>
  );
}
