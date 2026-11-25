"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";
import { clientDb } from "@/lib/firebase-client";
import { addEndpointId } from "@/lib/local-endpoints";
import { webhookUrl } from "@/lib/format";
import { confirmAndDeleteEndpoint } from "@/lib/delete-endpoint";
import type { EndpointDoc, StoredRequest } from "@/lib/types";
import { CopyButton } from "@/components/CopyButton";
import { HelpDialog } from "@/components/HelpDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RequestList } from "@/components/RequestList";
import { RequestDetail } from "@/components/RequestDetail";

const PAGE_SIZE = 100;

export function EndpointInspector() {
  const { endpointId } = useParams<{ endpointId: string }>();
  const [endpoint, setEndpoint] = useState<EndpointDoc | null | undefined>(undefined);
  const [requests, setRequests] = useState<StoredRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const url = webhookUrl(origin, endpointId);

  // Thông tin endpoint
  useEffect(() => {
    return onSnapshot(
      doc(clientDb, "endpoints", endpointId),
      (snap) => {
        if (!snap.exists()) {
          setEndpoint(null);
          return;
        }
        const d = snap.data();
        setEndpoint({
          name: d.name,
          requestCount: d.requestCount ?? 0,
          createdAt: (d.createdAt as Timestamp | null)?.toDate() ?? null,
        });
        addEndpointId(endpointId);
      },
      (err) => setError(err.message),
    );
  }, [endpointId]);

  // Danh sách request realtime
  useEffect(() => {
    const q = query(
      collection(clientDb, "endpoints", endpointId, "requests"),
      orderBy("receivedAt", "desc"),
      limit(PAGE_SIZE),
    );
    return onSnapshot(
      q,
      { includeMetadataChanges: false },
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data({ serverTimestamps: "estimate" });
          return {
            ...(data as Omit<StoredRequest, "id" | "receivedAt">),
            id: d.id,
            receivedAt: (data.receivedAt as Timestamp | null)?.toDate() ?? null,
          };
        });
        setRequests(list);
        setSelectedId((cur) => (cur && list.some((r) => r.id === cur) ? cur : list[0]?.id ?? null));
      },
      (err) => setError(err.message),
    );
  }, [endpointId]);

  const selected = useMemo(
    () => requests.find((r) => r.id === selectedId) ?? null,
    [requests, selectedId],
  );

  async function clearAll() {
    if (!confirm("Xoá tất cả request của endpoint này?")) return;
    setClearing(true);
    try {
      const res = await fetch(`/api/endpoints/${endpointId}/requests`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      setError(`Xoá thất bại: ${(err as Error).message}`);
    } finally {
      setClearing(false);
    }
  }

  async function deleteEndpoint() {
    setDeleting(true);
    setError(null);
    try {
      if (await confirmAndDeleteEndpoint(endpointId, endpoint?.name ?? endpointId)) {
        router.push("/");
        return;
      }
    } catch (err) {
      setError(`Xoá endpoint thất bại: ${(err as Error).message}`);
    }
    setDeleting(false);
  }

  if (endpoint === null) {
    if (deleting) return null; // đang chuyển về trang chủ sau khi xoá
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm">Không tìm thấy endpoint.</p>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          ← Về trang chủ
        </Link>
      </main>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
        <Link href="/" className="text-sm text-zinc-500 hover:text-current">
          ←
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">{endpoint?.name ?? "…"}</h1>
          <p className="text-xs text-zinc-500">{endpoint?.requestCount ?? 0} request đã nhận</p>
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <code className="truncate rounded-md bg-black/[.05] px-2 py-1 font-mono text-xs dark:bg-white/[.08]">
            {url}
          </code>
          <CopyButton text={url} label="Copy URL" />
          <HelpDialog endpointId={endpointId} />
          <ThemeToggle />
          <button
            type="button"
            onClick={clearAll}
            disabled={clearing || requests.length === 0}
            className="shrink-0 rounded-md border border-rose-500/30 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-500/10 disabled:opacity-40"
          >
            {clearing ? "Đang xoá…" : "Xoá request"}
          </button>
          <button
            type="button"
            onClick={deleteEndpoint}
            disabled={deleting || !endpoint}
            title="Xoá hẳn endpoint và toàn bộ request (dùng khi đã test xong)"
            className="shrink-0 rounded-md bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-40"
          >
            {deleting ? "Đang xoá…" : "Xoá endpoint"}
          </button>
        </div>
      </header>

      {error && (
        <p className="border-b border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-600">{error}</p>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[320px_1fr]">
        <aside className="min-h-0 overflow-auto border-r border-black/10 dark:border-white/10">
          <RequestList requests={requests} selectedId={selectedId} onSelect={setSelectedId} />
        </aside>
        <section className="min-h-0">
          {selected ? (
            <RequestDetail key={selected.id} request={selected} />
          ) : (
            <div className="p-6 text-sm text-zinc-500">
              <p>Gửi thử bằng lệnh:</p>
              <pre className="mt-2 overflow-auto rounded-md bg-black/[.04] p-3 font-mono text-xs dark:bg-white/[.06]">
                {`curl -X POST "${url}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"hello":"world"}'`}
              </pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
