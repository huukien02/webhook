import { FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";
import { adminDb } from "@/lib/firebase-admin";


/** Tạo endpoint mới. Body (tuỳ chọn): { "name": "..." } */
export async function POST(req: Request) {
  let name = "";
  try {
    const json = await req.json();
    if (typeof json?.name === "string") name = json.name.trim().slice(0, 100);
  } catch {
    // body rỗng hoặc không phải JSON → dùng tên mặc định
  }

  const id = nanoid(21);
  await adminDb()
    .collection("endpoints")
    .doc(id)
    .set({
      name: name || `Endpoint ${id.slice(0, 6)}`,
      createdAt: FieldValue.serverTimestamp(),
      requestCount: 0,
    });

  return Response.json({ id }, { status: 201 });
}
