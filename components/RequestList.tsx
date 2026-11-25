"use client";

import { Fragment, useMemo } from "react";
import type { StoredRequest } from "@/lib/types";
import { formatBytes, formatClock, formatDay, METHOD_COLORS } from "@/lib/format";
import { describeRequest } from "@/lib/describe";

export function RequestList({
  requests,
  selectedId,
  onSelect,
}: {
  requests: StoredRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const rows = useMemo(
    () => requests.map((r) => ({ r, s: describeRequest(r), day: formatDay(r.receivedAt) })),
    [requests],
  );

  if (requests.length === 0) {
    return (
      <p className="p-6 text-sm text-zinc-500">
        Chưa có request nào. Gửi webhook tới URL ở trên, request sẽ hiện ở đây ngay lập tức.
      </p>
    );
  }

  return (
    <ul>
      {rows.map(({ r, s, day }, i) => {
        const selected = r.id === selectedId;
        const showDay = i === 0 || rows[i - 1].day !== day;
        return (
          <Fragment key={r.id}>
            {showDay && (
              <li className="sticky top-0 z-10 border-b border-black/5 bg-background/95 px-4 py-1.5 text-[11px] font-medium tracking-wide text-zinc-500 uppercase backdrop-blur dark:border-white/10">
                {day}
              </li>
            )}
            <li>
              <button
                type="button"
                onClick={() => onSelect(r.id)}
                className={`grid w-full grid-cols-[3.75rem_1fr_auto] items-center gap-x-3 gap-y-0.5 border-b border-l-2 border-b-black/5 px-3 py-2 text-left dark:border-b-white/10 ${
                  selected
                    ? "border-l-foreground bg-black/[.05] dark:bg-white/[.08]"
                    : "border-l-transparent hover:bg-black/[.03] dark:hover:bg-white/[.04]"
                }`}
              >
                <span
                  className={`row-span-2 justify-self-start rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                    METHOD_COLORS[r.method] ?? "bg-zinc-500/15"
                  }`}
                >
                  {r.method}
                </span>

                <span className="flex min-w-0 items-center gap-1.5">
                  <span className={`truncate text-sm ${s.known ? "font-semibold" : "font-medium"}`}>
                    {s.source}
                  </span>
                </span>
                <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                  {formatClock(r.receivedAt)}
                </span>

                <span className="min-w-0 truncate text-xs text-zinc-500">
                  {s.event ? (
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">{s.event}</span>
                  ) : (
                    <span className="italic">không có tên sự kiện</span>
                  )}
                </span>
                <span className="text-[11px] whitespace-nowrap text-zinc-500">
                  {s.kind} · {formatBytes(r.bodySize)}
                </span>
              </button>
            </li>
          </Fragment>
        );
      })}
    </ul>
  );
}
