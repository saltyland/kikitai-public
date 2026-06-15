'use client';

import { useState, useTransition } from 'react';
import { updateNotificationSettingAction } from '@/app/actions/profile';
import { isNotificationEnabled, TOGGLEABLE_NOTIFICATION_TYPES } from '@/lib/domain/notifications';
import type { NotificationSettings, NotificationType } from '@/lib/types/database';

/** 通知設定タブ：種別ごとの通知ON/OFFを切り替える */
export default function NotificationSettingsTab({
  settings,
}: {
  settings: NotificationSettings;
}) {
  const [values, setValues] = useState<Record<NotificationType, boolean>>(() =>
    Object.fromEntries(
      TOGGLEABLE_NOTIFICATION_TYPES.map(({ type }) => [type, isNotificationEnabled(settings, type)])
    ) as Record<NotificationType, boolean>
  );
  const [isPending, startTransition] = useTransition();

  const toggle = (type: NotificationType) => {
    const next = !values[type];
    setValues((prev) => ({ ...prev, [type]: next }));
    startTransition(async () => {
      try {
        await updateNotificationSettingAction(type, next);
      } catch {
        setValues((prev) => ({ ...prev, [type]: !next }));
      }
    });
  };

  return (
    <div className="card-3d divide-y divide-slate-100 p-2">
      {TOGGLEABLE_NOTIFICATION_TYPES.map(({ type, label }) => (
        <label
          key={type}
          className="flex cursor-pointer items-center justify-between gap-4 p-4 text-sm"
        >
          <span className="text-slate-700">{label}</span>
          <input
            type="checkbox"
            role="switch"
            aria-checked={values[type]}
            checked={values[type]}
            disabled={isPending}
            onChange={() => toggle(type)}
            className="h-5 w-5 accent-brand-600"
          />
        </label>
      ))}
    </div>
  );
}
