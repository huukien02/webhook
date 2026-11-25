import { adminDb } from "@/lib/firebase-admin";


type Ctx = { params: Promise<{ endpointId: string }> };

/** Xoá toàn bộ request đã bắt của một endpoint. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { endpointId } = await ctx.params;
  const db = adminDb();
  const endpointRef = db.collection("endpoints").doc(endpointId);

  if (!(await endpointRef.get()).exists) {
    return Response.json({ ok: false, error: "endpoint not found" }, { status: 404 });
  }

  const col = endpointRef.collection("requests");
  let deleted = 0;
  while (true) {
    const snap = await col.limit(500).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
  }
  await endpointRef.update({ requestCount: 0 });

  return Response.json({ ok: true, deleted });
}
