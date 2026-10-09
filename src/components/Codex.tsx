import { CATS } from '@/game/cats';
import type { CatType } from '@/game/types';
import { CAT_TYPE_LABEL } from '@/game/types';
import { CatCard } from './CatCard';
import { Button } from '@/components/ui/button';

export function Codex({ onBack }: { onBack: () => void }) {
  const types: CatType[] = ['vanguard', 'partner', 'support'];
  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl p-4">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>← 返回</Button>
        <h2 className="text-2xl font-black">📖 猫猫图鉴</h2>
      </div>
      {types.map((t) => (
        <div key={t} className="mb-5">
          <h3 className="mb-2 text-sm font-bold text-slate-400">
            {CAT_TYPE_LABEL[t]}（{t === 'vanguard' ? '主角行动前依次行动，多为先攻与全队增幅' : t === 'partner' ? '主角行动时依次行动，强化主角乘区' : '主角行动后行动，回响与后勤'}）
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {CATS.filter((c) => c.type === t).map((c) => <CatCard key={c.id} def={c} />)}
          </div>
        </div>
      ))}
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-xs leading-relaxed text-slate-300">
        <b className="text-slate-100">📐 数值乘区规则（还原设计文档）</b><br />
        乘区分为 <b>提高 / 额外 / 总</b> 三个分区与 <b>数值 / 百分比</b> 两个大类；同区同类的数值相加，
        分区与大类层层乘算：<br />
        <span className="font-mono text-amber-200">
          单发 =（（基础 + 提高数值×次数）×（1+提高百分比）+ 额外数值×（1+额外百分比）+ 总数值）×（1+总百分比）
        </span><br />
        「总提高」类词条会把数值加进每一个提高乘区，「总数值 / 总百分比」则作用到所有数值 / 百分比乘区——
        这也是大数字的来源：乘区之间是相乘，不是相加！
      </div>
    </div>
  );
}
