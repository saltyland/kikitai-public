import Link from 'next/link';
import Logo from '@/components/Logo';

/**
 * 全ページ共通のフッター。法務リンク（利用規約・プライバシーポリシー・運営者情報）を
 * 必ず置き、研究データ・個人属性を扱うサービスとしての信頼感を担保する。
 * ルートレイアウトの末尾に1つだけ置く（各ページ側には footer を置かない）。
 */
export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-brand-100/70 bg-white/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <Logo className="text-brand-600" />
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
          <Link href="/terms" className="hover:text-brand-600">
            利用規約
          </Link>
          <Link href="/privacy" className="hover:text-brand-600">
            プライバシーポリシー
          </Link>
          <Link href="/operator" className="hover:text-brand-600">
            運営者情報
          </Link>
        </nav>
        <p className="text-xs text-slate-400">© {year} キキタイ</p>
      </div>
    </footer>
  );
}
