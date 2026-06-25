import type { PointLot, PointsSummary } from '@/lib/types/database';

/** ポイント付与理由コード → 日本語ラベル（新理由はここに足すだけでよい） */
const REASON_LABELS: Record<string, string> = {
  signup: '新規登録ボーナス',
  profile_complete: 'プロフィール記入ボーナス',
  answer_reward: 'アンケート回答報酬',
  author_refund: '高品質回答の還元（設問者）',
};

const reasonLabel = (reason: string) => REASON_LABELS[reason] ?? reason;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ja-JP');

/**
 * ポイント残高サマリ＋保有ポイントの内訳（取引履歴）。
 * 消費はFIFOでロットが削減されるため、ここに並ぶのは「現在有効な付与」の一覧。
 */
export default function PointsSummaryCard({
  summary,
  lots,
}: {
  summary: PointsSummary;
  lots: PointLot[];
}) {
  return (
    <section className="card-3d rounded-2xl bg-white p-5">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-500">ポイント残高</h2>
          <p className="mt-1 text-3xl font-bold text-brand-600">
            {summary.available}
            <span className="ml-1 text-base font-semibold text-slate-400">pt</span>
          </p>
        </div>
      </div>

      {summary.expiringSoon.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          ⚠ まもなく失効：
          {summary.expiringSoon.map((e, i) => (
            <span key={i} className="ml-1">
              {e.amount}pt（{fmtDate(e.expires_at)}まで）
            </span>
          ))}
        </div>
      )}

      <h3 className="mt-5 mb-2 text-sm font-semibold text-slate-600">保有ポイントの内訳</h3>
      {lots.length === 0 ? (
        <p className="text-sm text-slate-400">有効なポイントはありません</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="py-2 pr-3 font-medium">付与日</th>
                <th className="py-2 pr-3 font-medium">理由</th>
                <th className="py-2 pr-3 font-medium text-right">残量</th>
                <th className="py-2 font-medium">有効期限</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => (
                <tr key={lot.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 pr-3 text-slate-500">{fmtDate(lot.granted_at)}</td>
                  <td className="py-2 pr-3 text-slate-700">{reasonLabel(lot.reason)}</td>
                  <td className="py-2 pr-3 text-right font-semibold text-brand-600">
                    +{lot.amount}pt
                  </td>
                  <td className="py-2 text-slate-500">{fmtDate(lot.expires_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-400">
        ポイントは自分のアンケートに回答が届くたびに、その品質に応じて古い付与分から順に消費され、付与から180日で失効します。
      </p>
    </section>
  );
}
