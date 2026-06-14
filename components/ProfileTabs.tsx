'use client';

import { useState, type ReactNode } from 'react';

type TabKey = 'profile' | 'followingUsers' | 'followingTopics' | 'notifications';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'profile', label: 'プロフィール' },
  { key: 'followingUsers', label: 'フォロー中ユーザー' },
  { key: 'followingTopics', label: 'フォロー中トピック' },
  { key: 'notifications', label: '通知設定' },
];

/** /profile のタブ切替（プロフィール／フォロー中ユーザー／フォロー中トピック／通知設定） */
export default function ProfileTabs({
  profileTab,
  followingUsersTab,
  followingTopicsTab,
  notificationsTab,
}: {
  profileTab: ReactNode;
  followingUsersTab: ReactNode;
  followingTopicsTab: ReactNode;
  notificationsTab: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  const content: Record<TabKey, ReactNode> = {
    profile: profileTab,
    followingUsers: followingUsersTab,
    followingTopics: followingTopicsTab,
    notifications: notificationsTab,
  };

  return (
    <div>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={
              activeTab === tab.key
                ? 'shrink-0 border-b-2 border-brand-600 px-3 py-2 text-sm font-bold text-brand-600'
                : 'shrink-0 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-700'
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
      {content[activeTab]}
    </div>
  );
}
