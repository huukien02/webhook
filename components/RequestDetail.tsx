"use client";

import { useMemo, useState } from "react";
import type { StoredRequest } from "@/lib/types";
import { formatBytes, formatTime, METHOD_COLORS } from "@/lib/format";
import { describeRequest, displayIp } from "@/lib/describe";
import { CopyButton } from "./CopyButton";

type Tab = "body" | "headers" | "query";

function KeyValueTable({ data }: { data: Record<string, string | string[]> }) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return <p className="text-sm text-zinc-500">Trống</p>;
  return (
    <table className="w-full text-sm">
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k} className="border-b border-black/5 align-top dark:border-white/10">
            <td className="w-1/3 py-1.5 pr-4 font-mono text-xs text-zinc-500 break-all">{k}</td>
            <td className="py-1.5 font-mono text-xs break-all">
              {Array.isArray(v) ? v.join(", ") : v}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function prettyBody(r: StoredRequest): { text: string; kind: string; form?: Record<string, string | string[]> } {
  if (!r.body) return { text: "", kind: "empty" };
  if (r.bodyEncoding === "base64") return { text: r.body, kind: "base64" };

  const ct = r.contentType.toLowerCase();
  const trimmed = r.body.trim();
  if (ct.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return { text: JSON.stringify(JSON.parse(r.body), null, 2), kind: "json" };
    } catch {
      // không phải JSON hợp lệ → hiện thô
    }
  }
  if (ct.includes("x-www-form-urlencoded")) {
    const params = new URLSearchParams(r.body);
    const form: Record<string, string | string[]> = {};
    for (const key of new Set(params.keys())) {
      const all = params.getAll(key);
      form[key] = all.length === 1 ? all[0] : all;
    }
    return { text: r.body, kind: "form", form };
  }
  return { text: r.body, kind: "text" };
}

export function RequestDetail({ request }: { request: StoredRequest }) {
  const [tab, setTab] = useState<Tab>("body");
  const [showRaw, setShowRaw] = useState(false);
  const body = useMemo(() => prettyBody(request), [request]);
  const summary = useMemo(() => describeRequest(request), [request]);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "body", label: "Body" },
    { id: "headers", label: "Headers", count: Object.keys(request.headers).length },
    { id: "query", label: "Query", count: Object.keys(request.query).length },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-black/10 p-4 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${
              METHOD_COLORS[request.method] ?? "bg-zinc-500/15"
            }`}
          >
            {request.method}
          </span>
          <span className="text-base font-semibold">{summary.source}</span>
          {summary.event && (
            <span className="rounded bg-black/[.05] px-1.5 py-0.5 font-mono text-xs dark:bg-white/[.08]">
              {summary.event}
            </span>
          )}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs sm:grid-cols-[auto_1fr_auto_1fr]">
          <dt className="text-zinc-500">Thời gian</dt>
          <dd className="font-mono">{formatTime(request.receivedAt)}</dd>
          <dt className="text-zinc-500">IP gửi</dt>
          <dd className="font-mono">{displayIp(request.ip)}</dd>
          <dt className="text-zinc-500">Kiểu body</dt>
          <dd>
            {summary.kind} · {formatBytes(request.bodySize)}
          </dd>
          <dt className="text-zinc-500">Content-Type</dt>
          <dd className="font-mono break-all">{request.contentType || "—"}</dd>
          <dt className="text-zinc-500">User-Agent</dt>
          <dd className="font-mono break-all sm:col-span-3">{request.headers["user-agent"] || "—"}</dd>
          <dt className="text-zinc-500">Request ID</dt>
          <dd className="font-mono sm:col-span-3">{request.id}</dd>
        </dl>
        <p className="text-[11px] text-zinc-400">
          Nguồn gửi được đoán từ header / User-Agent, không xác thực chữ ký.
        </p>
      </div>

      <div className="flex gap-1 border-b border-black/10 px-4 dark:border-white/10">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              tab === t.id
                ? "border-current font-medium"
                : "border-transparent text-zinc-500 hover:text-current"
            }`}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1 text-xs text-zinc-400">{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {tab === "headers" && <KeyValueTable data={request.headers} />}
        {tab === "query" && <KeyValueTable data={request.query} />}
        {tab === "body" && (
          <div className="space-y-3">
            {request.truncated && (
              <p className="rounded-md bg-amber-500/15 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                Body quá lớn ({formatBytes(request.bodySize)}), chỉ lưu phần đầu.
              </p>
            )}
            {body.kind === "empty" ? (
              <p className="text-sm text-zinc-500">Không có body</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-zinc-500">
                    {body.kind === "base64" ? "Dữ liệu nhị phân (base64)" : body.kind.toUpperCase()}
                  </span>
                  <div className="flex gap-2">
                    {body.kind === "form" && (
                      <button
                        type="button"
                        onClick={() => setShowRaw((v) => !v)}
                        className="rounded-md border border-black/10 px-2.5 py-1 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                      >
                        {showRaw ? "Dạng bảng" : "Dạng thô"}
                      </button>
                    )}
                    <CopyButton text={body.text} />
                  </div>
                </div>
                {body.kind === "form" && !showRaw && body.form ? (
                  <KeyValueTable data={body.form} />
                ) : (
                  <pre className="overflow-auto rounded-md bg-black/[.04] p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all dark:bg-white/[.06]">
                    {body.text}
                  </pre>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
