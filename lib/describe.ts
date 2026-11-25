import type { StoredRequest } from "./types";

/**
 * Đoán nguồn gửi và tóm tắt request để hiển thị trong danh sách.
 * Chỉ dựa vào header / User-Agent / body, KHÔNG xác thực — bên gửi có thể giả mạo.
 */
export interface RequestSummary {
  /** Tên nguồn gửi, ví dụ "GitHub", "Stripe", "curl", "partner.com" */
  source: string;
  /** Nguồn được nhận diện từ dấu hiệu rõ ràng (header riêng của dịch vụ) */
  known: boolean;
  /** Sự kiện / mô tả ngắn, ví dụ "push", "payment.succeeded" */
  event: string | null;
  /** Kiểu body rút gọn: JSON, Form, XML, Text, PNG… */
  kind: string;
}

const HEADER_SOURCES: { header: string; name: string; eventHeader?: string }[] = [
  { header: "x-github-event", name: "GitHub", eventHeader: "x-github-event" },
  { header: "x-gitlab-event", name: "GitLab", eventHeader: "x-gitlab-event" },
  { header: "x-event-key", name: "Bitbucket", eventHeader: "x-event-key" },
  { header: "stripe-signature", name: "Stripe" },
  { header: "x-shopify-topic", name: "Shopify", eventHeader: "x-shopify-topic" },
  { header: "x-slack-signature", name: "Slack" },
  { header: "x-twilio-signature", name: "Twilio" },
  { header: "x-paypal-transmission-id", name: "PayPal", eventHeader: "x-paypal-event-type" },
  { header: "x-wc-webhook-source", name: "WooCommerce", eventHeader: "x-wc-webhook-topic" },
  { header: "x-zm-signature", name: "Zoom" },
  { header: "linear-signature", name: "Linear", eventHeader: "linear-event" },
  { header: "x-hub-signature-256", name: "Meta" },
  { header: "svix-id", name: "Svix" },
  { header: "webhook-id", name: "Standard Webhooks" },
  { header: "x-goog-channel-id", name: "Google", eventHeader: "x-goog-resource-state" },
];

const UA_SOURCES: [RegExp, string][] = [
  [/GitHub-Hookshot/i, "GitHub"],
  [/Stripe/i, "Stripe"],
  [/Shopify/i, "Shopify"],
  [/Slackbot/i, "Slack"],
  [/TwilioProxy/i, "Twilio"],
  [/facebookexternalua|facebookplatform/i, "Meta"],
  [/PostmanRuntime/i, "Postman"],
  [/insomnia/i, "Insomnia"],
  [/^curl\//i, "curl"],
  [/^Wget/i, "Wget"],
  [/python-requests|aiohttp|httpx/i, "Python"],
  [/^node|undici|axios|node-fetch/i, "Node.js"],
  [/^Go-http-client/i, "Go"],
  [/okhttp|Java\//i, "Java"],
  [/Mozilla\//i, "Trình duyệt"],
];

const EVENT_KEYS = ["type", "event", "eventType", "event_type", "topic", "action", "status", "resultCode"];

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host || null;
  } catch {
    return null;
  }
}

function bodyKind(r: StoredRequest): string {
  const ct = r.contentType.toLowerCase();
  if (!r.bodySize) return "Trống";
  if (ct.includes("json")) return "JSON";
  if (ct.includes("x-www-form-urlencoded")) return "Form";
  if (ct.includes("multipart/form-data")) return "Multipart";
  if (ct.includes("xml")) return "XML";
  if (ct.startsWith("text/")) return "Text";
  if (ct.startsWith("image/")) return ct.slice(6).split(/[;+]/)[0].toUpperCase();
  if (r.bodyEncoding === "base64") return "Nhị phân";
  return "Text";
}

function eventFromBody(r: StoredRequest): string | null {
  if (!r.body || r.bodyEncoding !== "utf8") return null;
  const ct = r.contentType.toLowerCase();
  const trimmed = r.body.trimStart();

  if (ct.includes("json") || trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(r.body);
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        for (const k of EVENT_KEYS) {
          const v = obj[k];
          if (typeof v === "string" && v) return v;
        }
        if (typeof obj.event?.type === "string") return obj.event.type; // Slack
        if (typeof obj.object === "string") return obj.object; // Meta
      }
    } catch {
      // bỏ qua
    }
  }

  if (ct.includes("x-www-form-urlencoded")) {
    const p = new URLSearchParams(r.body);
    for (const k of EVENT_KEYS) {
      const v = p.get(k);
      if (v) return `${k}=${v}`;
    }
  }

  if (ct.includes("xml")) {
    const m = r.body.match(/<(event|type|topic)>([^<]{1,60})<\/\1>/i);
    if (m) return m[2];
  }
  return null;
}

function sourceFromQueryOrBody(r: StoredRequest): string | null {
  const q = r.query;
  if (Object.keys(q).some((k) => k.startsWith("vnp_"))) return "VNPay";
  if (r.bodyEncoding === "utf8" && r.body) {
    if (/partnerCode=MOMO|"partnerCode"\s*:\s*"MOMO/i.test(r.body)) return "MoMo";
    if (/vnp_TxnRef/.test(r.body)) return "VNPay";
    if (/"app_trans_id"|app_trans_id=/.test(r.body)) return "ZaloPay";
  }
  return null;
}

export function describeRequest(r: StoredRequest): RequestSummary {
  const h = r.headers;
  const kind = bodyKind(r);
  let event: string | null = null;

  for (const s of HEADER_SOURCES) {
    if (h[s.header]) {
      // GitHub cũng gửi x-hub-signature-256, nên Meta chỉ khớp khi không có x-github-event
      if (s.name === "Meta" && h["x-github-event"]) continue;
      event = (s.eventHeader && h[s.eventHeader]) || eventFromBody(r);
      return { source: s.name, known: true, event, kind };
    }
  }

  event = h["x-event-type"] || h["x-event"] || h["x-webhook-event"] || eventFromBody(r);

  const fromPayload = sourceFromQueryOrBody(r);
  if (fromPayload) return { source: fromPayload, known: true, event, kind };

  const ua = h["user-agent"] ?? "";
  for (const [re, name] of UA_SOURCES) {
    if (re.test(ua)) {
      const host = name === "Trình duyệt" ? hostOf(h["origin"] ?? h["referer"]) : null;
      return { source: host ?? name, known: false, event, kind };
    }
  }

  const host = hostOf(h["origin"] ?? h["referer"]);
  if (host) return { source: host, known: false, event, kind };
  if (ua) return { source: ua.split(/[\s/]/)[0].slice(0, 30), known: false, event, kind };
  return { source: "Không rõ", known: false, event, kind };
}

export function displayIp(ip: string): string {
  if (!ip) return "—";
  if (ip === "::1" || ip === "127.0.0.1" || ip === "::ffff:127.0.0.1") return "localhost";
  return ip.replace(/^::ffff:/, "");
}
