"use client";

import { removeEndpointId } from "./local-endpoints";

/**
 * Hỏi xác nhận rồi xoá hẳn endpoint (cả request) trên server.
 * Trả về true nếu đã xoá, false nếu người dùng huỷ. Lỗi thì ném Error.
 */
export async function confirmAndDeleteEndpoint(id: string, name: string): Promise<boolean> {
  const ok = confirm(
    `Xoá endpoint "${name}"?\n\n` +
      "• Toàn bộ request đã bắt sẽ bị xoá vĩnh viễn.\n" +
      "• URL webhook sẽ ngừng hoạt động (trả 404).\n\n" +
      "Không thể hoàn tác.",
  );
  if (!ok) return false;

  const res = await fetch(`/api/endpoints/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
  removeEndpointId(id);
  return true;
}
