/** Khung giả hiện ngay khi bấm vào endpoint, trong lúc trang chi tiết đang tải. */
export function InspectorSkeleton() {
  const bar = "animate-pulse rounded bg-black/[.07] dark:bg-white/[.08]";
  return (
    <div className="flex h-screen flex-col" aria-busy="true" aria-label="Đang tải">
      <header className="flex items-center gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
        <div className={`${bar} h-4 w-4`} />
        <div className="space-y-1.5">
          <div className={`${bar} h-4 w-40`} />
          <div className={`${bar} h-3 w-24`} />
        </div>
        <div className={`${bar} ml-auto h-7 w-[28rem] max-w-[50%]`} />
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[320px_1fr]">
        <aside className="space-y-4 border-r border-black/10 p-4 dark:border-white/10">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-1.5">
              <div className={`${bar} h-4 w-24`} />
              <div className={`${bar} h-3 w-full`} />
            </div>
          ))}
        </aside>
        <section className="space-y-3 p-4">
          <div className={`${bar} h-5 w-64`} />
          <div className={`${bar} h-3 w-96 max-w-full`} />
          <div className={`${bar} mt-6 h-48 w-full`} />
        </section>
      </div>
    </div>
  );
}
