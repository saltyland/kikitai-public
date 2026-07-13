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
            「非公開」に設定した属性は、あなたのプロフィールページで他の一般ユーザーに
            表示されなくなります。ただし、下記のとおり、あなたが回答したアンケートの作成者には、
            回答内容の分析のために属性が開示されます（公開・非公開の設定にかかわらず）。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-800">
            2. アンケート作成者に開示される情報（匿名性について）
          </h2>
          <p>
            本サービスの回答は<span className="font-medium">完全な匿名ではありません</span>。
            あなたがアンケートに回答すると、そのアンケートの作成者は結果画面・ダウンロードデータ上で
            次の情報を閲覧できます。回答前に、その調査に協力してよいかご判断ください。
          </p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>各回答の内容（選択・自由記述）と回答日時</li>
            <li>
              回答者の属性（年齢・性別・職業・学年・専攻・所属・分野）。
              <span className="font-medium">プロフィールで「非公開」に設定した属性も含みます。</span>
            </li>
            <li>
              回答とアカウントを結びつける内部の識別子。作成者はこれを通じて、
              同一回答者の判別や、公開プロフィール（ニックネーム等）との照合が可能です。
            </li>
          </ul>
          <p>
            なお、パスワード・メールアドレス・認証情報が作成者に渡ることはありません。
            共有リンクからのゲスト回答（ログインなし）では属性・アカウント識別子は収集されません。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-800">3. 回答品質の評価と外部 AI への送信</h2>
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
          <h2 className="text-base font-bold text-slate-800">4. ユーザー識別情報の取り扱い（外部 AI）</h2>
          <p>
            外部 AI サービスへの送信データには、ユーザーを直接識別できる情報（ユーザーID・
            メールアドレス・ニックネーム・IPアドレスなど）は含めません。
            評価結果はキキタイのサーバー内でのみユーザーアカウントと紐付けられます。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-800">5. データの保持と削除</h2>
          <p>
            回答データはアンケート作成者が設定した保持期間を過ぎると自動的に削除されます
            （デフォルト2年、最長5年）。アカウントを退会した場合は、
            関連するデータを速やかに削除します。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-800">6. お問い合わせ</h2>
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
