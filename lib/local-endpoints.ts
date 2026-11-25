"use client";

/**
 * Bản cá nhân không đăng nhập: danh sách endpoint đã tạo được lưu trong
 * localStorage của trình duyệt. Ai có endpointId thì xem được request.
 */
const KEY = "webhook-inspector:endpoints";

export function loadEndpointIds(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveEndpointIds(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids));
}

export function addEndpointId(id: string) {
  const ids = loadEndpointIds().filter((x) => x !== id);
  saveEndpointIds([id, ...ids]);
}

export function removeEndpointId(id: string) {
  saveEndpointIds(loadEndpointIds().filter((x) => x !== id));
}
