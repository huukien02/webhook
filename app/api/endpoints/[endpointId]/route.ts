import { adminDb } from "@/lib/firebase-admin";

type Ctx = { params: Promise<{ endpointId: string }> };

/** Xoá hẳn endpoint cùng toàn bộ request đã bắt. URL webhook sẽ trả 404 sau khi xoá. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { endpointId } = await ctx.params;
  const db = adminDb();
  const endpointRef = db.collection("endpoints").doc(endpointId);

  if (!(await endpointRef.get()).exists) {
    return Response.json({ ok: false, error: "endpoint not found" }, { status: 404 });
  }

  // Xoá document cùng mọi sub-collection (requests)
  await db.recursiveDelete(endpointRef);

  return Response.json({ ok: true });
}
