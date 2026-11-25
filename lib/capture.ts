import "server-only";
import type { BodyEncoding, CapturedRequest } from "./types";

/** Giới hạn body lưu vào Firestore (doc tối đa 1 MB, chừa chỗ cho headers). */
export const MAX_STORED_BODY_BYTES = 500 * 1024;
/** Body lớn hơn mức này bị từ chối với 413. */
export const MAX_ACCEPTED_BODY_BYTES = 5 * 1024 * 1024;

const TEXT_TYPES = [
  "json",
  "xml",
  "x-www-form-urlencoded",
  "javascript",
  "graphql",
  "yaml",
  "csv",
];

function isTextContentType(ct: string): boolean {
  if (!ct) return true; // không khai báo → thử như text
  const lower = ct.toLowerCase();
  return lower.startsWith("text/") || TEXT_TYPES.some((t) => lower.includes(t));
}

function decodeUtf8Strict(buf: Buffer): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return null;
  }
}

export function captureRequest(req: Request, raw: Buffer): CapturedRequest {
  const url = new URL(req.url);

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const query: Record<string, string | string[]> = {};
  for (const key of new Set(url.searchParams.keys())) {
    const all = url.searchParams.getAll(key);
    query[key] = all.length === 1 ? all[0] : all;
  }

  const contentType = headers["content-type"] ?? "";
  const bodySize = raw.length;
  const truncated = bodySize > MAX_STORED_BODY_BYTES;
  const slice = truncated ? raw.subarray(0, MAX_STORED_BODY_BYTES) : raw;

  let body = "";
  let bodyEncoding: BodyEncoding = "utf8";
  if (slice.length > 0) {
    const text = isTextContentType(contentType) ? decodeUtf8Strict(slice) : null;
    if (text !== null) {
      body = text;
    } else {
      body = slice.toString("base64");
      bodyEncoding = "base64";
    }
  }

  const ip =
    headers["x-forwarded-for"]?.split(",")[0].trim() ||
    headers["x-real-ip"] ||
    "";

  return {
    method: req.method,
    path: url.pathname,
    query,
    headers,
    contentType,
    body,
    bodyEncoding,
    bodySize,
    truncated,
    ip,
  };
}
