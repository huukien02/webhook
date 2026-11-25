"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { clientDb } from "@/lib/firebase-client";
import { addEndpointId, loadEndpointIds, removeEndpointId } from "@/lib/local-endpoints";
import { HelpDialog } from "@/components/HelpDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { confirmAndDeleteEndpoint } from "@/lib/delete-endpoint";

interface Row {
  id: string;
  name: string;
  requestCount: number;
  missing: boolean;
}

async function loadRows(): Promise<Row[]> {
  const ids = loadEndpointIds();
  return Promise.all(
    ids.map(async (id): Promise<Row> => {
      try {
        const snap = await getDoc(doc(clientDb, "endpoints", id));
        if (!snap.exists()) return { id, name: id, requestCount: 0, missing: true };
        const d = snap.data();
        return { id, name: d.name ?? id, requestCount: d.requestCount ?? 0, missing: false };
      } catch {
        return { id, name: id, requestCount: 0, missing: true };
      }
    }),
  );
}

export default function Home() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refresh() {
    setRows(await loadRows());
  }

  useEffect(() => {
    let cancelled = false;
    loadRows().then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { id } = await res.json();
      addEndpointId(id);
      setName("");
      await refresh();
    } catch (err) {
      setError(`Không tạo được endpoint: ${(err as Error).message}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Webhook Inspector</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Tạo một endpoint, đưa URL cho bất kỳ dịch vụ nào, mọi request gửi tới sẽ hiện realtime.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <HelpDialog />
          <ThemeToggle />
        </div>
      </div>

      <form onSubmit={create} className="mt-8 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên endpoint (tuỳ chọn)"
          className="flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {creating ? "Đang tạo…" : "Tạo endpoint"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

      <section className="mt-10">
        <h2 className="text-sm font-medium text-zinc-500">Endpoint của bạn</h2>
        {rows === null ? (
          <p className="mt-3 text-sm text-zinc-500">Đang tải…</p>
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Chưa có endpoint nào.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/5 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/15">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
                {r.missing ? (
                  <span className="text-sm text-zinc-400 line-through">{r.name}</span>
                ) : (
                  <Link href={`/e/${r.id}`} className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{r.name}</div>
                    <div className="truncate font-mono text-xs text-zinc-500">/api/hooks/{r.id}</div>
                  </Link>
                )}
                <div className="flex shrink-0 items-center gap-3">
                  {!r.missing && (
                    <span className="text-xs text-zinc-500">{r.requestCount} request</span>
                  )}
                  {!r.missing && (
                    <button
                      type="button"
                      disabled={deletingId === r.id}
                      onClick={async () => {
                        setDeletingId(r.id);
                        setError(null);
                        try {
                          if (await confirmAndDeleteEndpoint(r.id, r.name)) await refresh();
                        } catch (err) {
                          setError(`Xoá thất bại: ${(err as Error).message}`);
                        } finally {
                          setDeletingId(null);
                        }
                      }}
                      className="rounded-md border border-rose-500/30 px-2 py-0.5 text-xs text-rose-600 hover:bg-rose-500/10 disabled:opacity-40"
                      title="Xoá hẳn endpoint và toàn bộ request"
                    >
                      {deletingId === r.id ? "Đang xoá…" : "Xoá"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      removeEndpointId(r.id);
                      refresh();
                    }}
                    className="text-xs text-zinc-400 hover:text-rose-600"
                    title="Ẩn khỏi danh sách trên trình duyệt này"
                  >
                    Ẩn
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
