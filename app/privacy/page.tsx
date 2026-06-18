// TODO（法務確定前ドラフト）: 本文は法務レビュー未了。本番公開前に正式版に差し替えること。

import Link from 'next/link';
import Logo from '@/components/Logo';

export const metadata = {
  title: 'プライバシーポリシー｜キキタイ',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/" aria-label="キキタイ トップ" className="inline-block">
        <Logo className="text-brand-600" />
      </Link>
      <h1 className="mt-8 text-2xl font-extrabold text-slate-800">プライバシーポリシー</h1>

      <div className="card-3d mt-6 space-y-6 p-6 text-sm leading-relaxed text-slate-600">
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          このページは現在ドラフト版です。正式なプライバシーポリシーの公開までしばらくお待ちください。
        </p>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-800">1. 収集する情報</h2>
          <p>
            キキタイでは、アカウント登録時のメールアドレス、
            プロフィール情報（ニックネーム・所属機関・研究分野・年齢・性別・職業・学年・専攻など）、
            およびアンケートへの回答データを収集します。
          </p>
          <p>
            プロフィール属性は項目ごとに「公開・非公開」を選択できます。
            非公開に設定した属性はマッチング配信にのみ使用し、他のユーザーには表示されません。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-800">2. 回答品質の評価と外部 AI への送信</h2>
          <p>
            送信された回答は、回答品質を評価するために外部 AI サービス（Google Gemini 等）に
            送信される場合があります。その際、以下のプライバシー保護措置を講じます。
          </p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>
              <span className="font-medium">脱識別処理（サニタイズ）を実施：</span>
              回答内容はユーザーID・属性情報・IPアドレス・認証トークンを含まない形式に
              変換したうえで送信します。設問文・選択肢ラベル・回答テキスト・選択値のみを渡します。
            </li>
            <li>
              <span className="font-medium">テキスト中の個人情報を自動除去：</span>
              自由記述の回答テキストに含まれるメールアドレス・電話番号・学籍番号等の連番ID・URLは、
              外部送信前にプレースホルダー（<code>[EMAIL]</code> 等）に置換します。
            </li>
            <li>
              <span className="font-medium">機微な調査は外部送信しません：</span>
              アンケート作成者が「機微調査（センシティブな個人情報に関わる調査）」と
              設定したアンケートの回答は、外部 AI に送信せずルールベースの評価のみを行います。
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-800">3. ユーザー識別情報の取り扱い</h2>
          <p>
            外部 AI サービスへの送信データには、ユーザーを直接識別できる情報（ユーザーID・
            メールアドレス・ニックネーム・IPアドレスなど）は含めません。
            評価結果はキキタイのサーバー内でのみユーザーアカウントと紐付けられます。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-800">4. データの保持と削除</h2>
          <p>
            回答データはアンケート作成者が設定した保持期間を過ぎると自動的に削除されます
            （デフォルト2年、最長5年）。アカウントを退会した場合は、
            関連するデータを速やかに削除します。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-800">5. お問い合わせ</h2>
          <p>
            個人情報の取り扱いに関するお問い合わせは、サービス内のお問い合わせフォームから
            ご連絡ください。
          </p>
        </section>

        <p className="text-slate-400">最終更新：ドラフト（法務確定前）</p>
      </div>

      <p className="mt-6 text-sm">
        <Link href="/" className="font-bold text-brand-600 hover:underline">
          ← トップへ戻る
        </Link>
      </p>
    </main>
  );
}
