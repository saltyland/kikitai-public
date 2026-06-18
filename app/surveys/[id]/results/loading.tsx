/** 結果ページの読み込み中スケルトン */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
      <div className="mt-3 h-7 w-2/3 animate-pulse rounded-lg bg-slate-100" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card-3d space-y-3 p-5">
            <div className="h-5 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </main>
  );
}
