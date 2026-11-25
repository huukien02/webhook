export type BodyEncoding = "utf8" | "base64";

export interface CapturedRequest {
  method: string;
  path: string;
  query: Record<string, string | string[]>;
  headers: Record<string, string>;
  contentType: string;
  body: string;
  bodyEncoding: BodyEncoding;
  bodySize: number;
  truncated: boolean;
  ip: string;
}

/** Request như client đọc được từ Firestore. */
export interface StoredRequest extends CapturedRequest {
  id: string;
  receivedAt: Date | null;
}

export interface EndpointDoc {
  name: string;
  createdAt: Date | null;
  requestCount: number;
}
