import { useEffect, useState } from 'react';
import { fmt, foodCap } from '@/game/balance';
import { playBgm } from '@/game/audio';
import type { SaveData } from '@/game/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function MainMenu({
  save, onStory, onEndless, onDemon, onCodex, onReset,
}: {
  save: SaveData;
  onStory: () => void;
  onEndless: () => void;
  onDemon: () => void;
  onCodex: () => void;
  onReset: () => void;
}) {
  const [resetStep, setResetStep] = useState(0);
  const tutorialDone = ['1-1', '1-2', '1-3', '1-4', '1-5'].every((id) => save.records[id]?.completed);

  useEffect(() => {
    const unlock = () => playBgm();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 overflow-hidden p-4">
      <img src={import.meta.env.BASE_URL + "assets/castle.jpg"} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950" />

      <div className="relative text-center">
        <img src={import.meta.env.BASE_URL + "assets/hero-cat.png"} alt="勇者猫" className="mx-auto h-44 w-44 object-contain drop-shadow-[0_0_30px_rgba(250,204,21,0.45)] animate-[heroBob_3s_ease-in-out_infinite]" />
        <h1 className="mt-2 bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-300 bg-clip-text text-5xl font-black text-transparent drop-shadow">
          猫猫勇者
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          公主被魔王抓走了！指挥魔法猫猫叠满乘区，用 1 点攻击轰开亿万耐久的魔王堡垒。
        </p>
        <div className="mt-2 flex justify-center gap-2 text-sm">
          <span className="rounded-lg border border-fuchsia-500/40 bg-fuchsia-950/70 px-2.5 py-1 font-bold text-fuchsia-200">🏆 {fmt(save.badges)}</span>
          <span className="rounded-lg border border-orange-500/40 bg-orange-950/70 px-2.5 py-1 font-bold text-orange-200">🍖 上限 {fmt(foodCap(save.foodUpgrade))}</span>
        </div>
      </div>

      <div className="relative grid w-full gap-3 sm:grid-cols-3">
        <Card className="cursor-pointer border-amber-500/40 bg-slate-900/80 p-4 text-center transition hover:scale-[1.03] hover:border-amber-400" onClick={onStory}>
          <div className="text-4xl">📖</div>
          <div className="mt-1 font-bold">剧情模式</div>
          <div className="mt-1 text-xs text-slate-400">两章十关 · 最终堡垒 120 万亿耐久</div>
        </Card>
        <Card
          className={`p-4 text-center transition ${tutorialDone ? 'cursor-pointer bg-slate-900/80 hover:scale-[1.03] hover:border-purple-400' : 'opacity-50'}`}
          onClick={tutorialDone ? onEndless : undefined}
        >
          <div className="text-4xl">♾️</div>
          <div className="mt-1 font-bold">无尽模式</div>
          <div className="mt-1 text-xs text-slate-400">
            {tutorialDone ? `已探索至第 ${save.endless.stage} 层 · 最高单发 ${fmt(save.endless.bestHit)}` : '通关第一章教学后解锁'}
          </div>
        </Card>
        <Card
          className={`p-4 text-center transition ${save.storyCleared ? 'cursor-pointer bg-slate-900/80 hover:scale-[1.03] hover:border-red-400' : 'opacity-50'}`}
          onClick={save.storyCleared ? onDemon : undefined}
        >
          <div className="text-4xl">😈</div>
          <div className="mt-1 font-bold">隐藏模式</div>
          <div className="mt-1 text-slate-400 text-xs">
            {save.storyCleared ? '扮演魔王，布防迎击勇者' : '通关剧情模式后解锁'}
          </div>
        </Card>
      </div>

      <div className="relative flex gap-2">
        <Button variant="outline" size="sm" onClick={onCodex}>📖 猫猫图鉴</Button>
        {resetStep === 0 ? (
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-400 hover:border-red-500 hover:text-red-300" onClick={() => setResetStep(1)}>
            🗑️ 清除档案
          </Button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/60 bg-red-950/50 px-2 py-1">
            <span className="text-xs text-red-200">
              {resetStep === 1 && '第 1/3 次确认：将清空关卡进度、无尽层数、猫粮升级，只保留 🏆 奖杯。'}
              {resetStep === 2 && '第 2/3 次确认：清除后不可恢复，真的要继续吗？'}
              {resetStep === 3 && '最后确认（3/3）：按下即立刻清除全部游玩痕迹！'}
            </span>
            <button
              className="rounded bg-red-700 px-2 py-0.5 text-xs font-bold text-white hover:bg-red-500"
              onClick={() => {
                if (resetStep < 3) setResetStep(resetStep + 1);
                else { onReset(); setResetStep(0); }
              }}
            >
              {resetStep < 3 ? '确认' : '清除！'}
            </button>
            <button className="rounded bg-slate-700 px-2 py-0.5 text-xs hover:bg-slate-500" onClick={() => setResetStep(0)}>
              取消
            </button>
          </div>
        )}
      </div>
      <p className="relative text-center text-xs leading-relaxed text-slate-500">
        行动顺序：先锋猫猫 → 伙伴猫猫 + 主角 → 支援猫猫<br />
        提高 / 额外 / 总 × 数值 / 百分比 乘区层层相乘 —— 伤害即货币，抽卡变强，再叠出弑神一击！
      </p>
    </div>
  );
}
