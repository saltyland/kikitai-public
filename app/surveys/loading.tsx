/** 一覧ページの読み込み中スケルトン（レイアウトシフトを抑える） */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <div className="mb-6 h-7 w-48 animate-pulse rounded-lg bg-slate-100" />
      <div className="grid grid-cols-1 gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card-3d space-y-3 p-5">
            <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 h-24 w-full animate-pulse rounded-lg bg-slate-100" />
          </div>
        ))}
      </div>
    </main>
  );
}
