export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function formatTime(d: Date | null): string {
  if (!d) return "…";
  return d.toLocaleString("vi-VN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatClock(d: Date | null): string {
  if (!d) return "…";
  return d.toLocaleTimeString("vi-VN", { hour12: false });
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Hôm nay", "Hôm qua" hoặc ngày dd/mm/yyyy */
export function formatDay(d: Date | null): string {
  if (!d) return "Đang ghi…";
  const now = new Date();
  if (sameDay(d, now)) return "Hôm nay";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function webhookUrl(origin: string, endpointId: string): string {
  return `${origin}/api/hooks/${endpointId}`;
}

export const METHOD_COLORS: Record<string, string> = {
  GET: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  POST: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  PUT: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  PATCH: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  DELETE: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};
