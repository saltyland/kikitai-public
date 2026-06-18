import { LoadingScreen } from '@/components/ui/Spinner';

/**
 * 全ルート共通のローディング表示。
 * ページ遷移・データ取得の待ち時間に自動で表示され、画面が固まったように見えるのを防ぐ
 * （GitHub issue #8「ロード画面でクルクル表示したい」/ #9「ロードが遅い」体感対策）。
 */
export default function Loading() {
  return <LoadingScreen />;
}
