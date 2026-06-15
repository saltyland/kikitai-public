import { Bell, ClipboardList, Coins, Home, Search, type LucideIcon } from 'lucide-react';

/** ヘッダー（PC横並びナビ・モバイルメニュー）共通のナビゲーション項目（6項目） */
export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon | null }[] = [
  { href: '/', label: 'ホーム', icon: Home },
  { href: '/search', label: '検索', icon: Search },
  { href: '/manage', label: '作成・管理', icon: ClipboardList },
  { href: '/points', label: 'ポイント', icon: Coins },
  { href: '/profile', label: 'マイページ', icon: null }, // Avatar使用
  { href: '/notifications', label: '通知', icon: Bell },
];
