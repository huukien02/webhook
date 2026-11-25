import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { captureRequest, MAX_ACCEPTED_BODY_BYTES } from "@/lib/capture";


const RETENTION_DAYS = Number(process.env.REQUEST_RETENTION_DAYS ?? 7);

type Ctx = { params: Promise<{ endpointId: string }> };

async function handle(req: Request, ctx: Ctx): Promise<Response> {
  const { endpointId } = await ctx.params;

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_ACCEPTED_BODY_BYTES) {
    return Response.json({ ok: false, error: "payload too large" }, { status: 413 });
  }

  const db = adminDb();
  const endpointRef = db.collection("endpoints").doc(endpointId);
  const endpoint = await endpointRef.get();
  if (!endpoint.exists) {
    return Response.json({ ok: false, error: "endpoint not found" }, { status: 404 });
  }

  const raw = Buffer.from(await req.arrayBuffer());
  if (raw.length > MAX_ACCEPTED_BODY_BYTES) {
    return Response.json({ ok: false, error: "payload too large" }, { status: 413 });
  }

  const captured = captureRequest(req, raw);
  const expireAt = Timestamp.fromMillis(Date.now() + RETENTION_DAYS * 86_400_000);

  const requestRef = endpointRef.collection("requests").doc();
  const batch = db.batch();
  batch.set(requestRef, {
    ...captured,
    receivedAt: FieldValue.serverTimestamp(),
    expireAt,
  });
  batch.update(endpointRef, { requestCount: FieldValue.increment(1) });
  await batch.commit();

  return Response.json({ ok: true, id: requestRef.id });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
