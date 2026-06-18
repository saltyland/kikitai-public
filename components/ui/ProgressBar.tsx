/** 進捗率(%)を表示する共通プログレスバー */
export default function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-brand-500 transition-all"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
