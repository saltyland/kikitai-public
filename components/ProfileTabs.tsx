'use client';

import { useState, type ReactNode } from 'react';

type TabKey = 'followingUsers' | 'followingTopics';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'followingUsers', label: 'フォロー中ユーザー' },
  { key: 'followingTopics', label: 'フォロー中トピック' },
];

/** /profile の「その他」内タブ切替（フォロー中ユーザー／フォロー中トピック） */
export default function ProfileTabs({
  followingUsersTab,
  followingTopicsTab,
}: {
  followingUsersTab: ReactNode;
  followingTopicsTab: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('followingUsers');

  const content: Record<TabKey, ReactNode> = {
    followingUsers: followingUsersTab,
    followingTopics: followingTopicsTab,
  };

  return (
    <div>
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
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
