import type { QuestionAggregate } from '@/lib/types/database';
import {
  numericStats,
  numericValuesFromAggregate,
  topChoice,
} from '@/lib/domain/statistics';

/**
 * 統計解析モード（Proプラン限定）。
 * スケール設問は平均・中央値・標準偏差などの基礎統計、選択式は最頻選択肢・回答数を表示する。
 */
export default function ResultStats({ aggregates }: { aggregates: QuestionAggregate[] }) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
        統計解析モード（Proプラン）— 数値設問の基礎統計量を表示しています。
      </div>

      {aggregates.map((agg, i) => {
        const values = numericValuesFromAggregate(agg);
        const stats = values ? numericStats(values) : null;
        const top = topChoice(agg);
        const responded =
          Object.values(agg.optionCounts).reduce((a, b) => a + b, 0) || agg.textAnswers.length;

        return (
          <section key={agg.question.id} className="rounded-xl bg-white border border-zinc-200 p-5 shadow-sm">
            <p className="mb-3 font-medium text-zinc-800">
              <span className="text-amber-600 mr-1">Q{i + 1}.</span>
              {agg.question.text}
            </p>

            {stats ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                <Stat label="回答数 (n)" value={String(stats.n)} />
                <Stat label="平均" value={stats.mean.toFixed(2)} />
                <Stat label="中央値" value={stats.median.toFixed(2)} />
                <Stat label="標準偏差" value={stats.sd.toFixed(2)} />
                <Stat label="最小" value={String(stats.min)} />
                <Stat label="最大" value={String(stats.max)} />
                <Stat label="最頻値" value={String(stats.mode)} />
                <Stat label="範囲" value={String(stats.max - stats.min)} />
              </dl>
            ) : agg.question.options.length > 0 ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                <Stat label="回答数" value={String(responded)} />
                <Stat label="選択肢数" value={String(agg.question.options.length)} />
                {top && <Stat label="最多回答" value={`${top.text}（${top.count}）`} />}
              </dl>
            ) : (
              <p className="text-sm text-zinc-400">
                自由記述・日付・グリッドは統計対象外です（回答数：{responded}件）。
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-50 px-3 py-2">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="font-bold text-zinc-800">{value}</dd>
    </div>
  );
}
