# Kế hoạch triển khai Webhook Inspector

**Stack:** Vercel + Next.js (App Router, TypeScript) + Cloud Firestore
**Không dùng:** Firebase Cloud Functions, backend NestJS riêng
**Mục tiêu:** Có một URL công khai để **bắt và xem mọi webhook gửi tới**, không cần biết bên nào gửi, không xác thực chữ ký, không xử lý nghiệp vụ.

---

## 1. Kiến trúc

```
Bất kỳ dịch vụ nào
   │  GET/POST/PUT/PATCH/DELETE https://<app>.vercel.app/api/hooks/{endpointId}
   ▼
Vercel – Next.js Route Handler (runtime: nodejs)
   │  1. Đọc method, headers, query, raw body
   │  2. Ghi vào Firestore bằng firebase-admin
   │  3. Trả 200 ngay
   ▼
Cloud Firestore
   │  endpoints/{endpointId}/requests/{requestId}
   ▼
Next.js Dashboard
      Firebase Web SDK → onSnapshot() → hiển thị realtime
```

Nguyên tắc:
- Request nào đến cũng lưu nguyên trạng, không parse theo nhà cung cấp.
- Chỉ server ghi dữ liệu (Admin SDK). Client chỉ đọc.
- Vercel function và Firestore đặt cùng khu vực (ví dụ Firestore `asia-southeast1` + Vercel `sin1`).

---

## 2. Mô hình dữ liệu Firestore

### `endpoints/{endpointId}`
| Field | Kiểu | Ghi chú |
|---|---|---|
| `ownerUid` | string | UID người tạo |
| `name` | string | Tên hiển thị |
| `createdAt` | timestamp | |
| `requestCount` | number | `FieldValue.increment(1)` |

> `endpointId` là chuỗi ngẫu nhiên khó đoán (nanoid 21 ký tự), vì URL công khai.

### `endpoints/{endpointId}/requests/{requestId}`
| Field | Kiểu | Ghi chú |
|---|---|---|
| `method` | string | |
| `query` | map | |
| `headers` | map | Giữ nguyên toàn bộ |
| `contentType` | string | |
| `body` | string | UTF-8 nếu là text, base64 nếu nhị phân |
| `bodyEncoding` | `"utf8"` \| `"base64"` | |
| `bodySize` | number | Byte |
| `truncated` | boolean | `true` nếu body > ~500 KB (Firestore giới hạn 1 MB/doc) |
| `ip` | string | Từ `x-forwarded-for` |
| `receivedAt` | timestamp | `FieldValue.serverTimestamp()` |
| `expireAt` | timestamp | Cho TTL policy, tự xoá sau N ngày |

---

## 3. Cấu trúc thư mục

```
webhook/
├─ app/
│  ├─ api/
│  │  ├─ hooks/[endpointId]/route.ts     # Bắt webhook (mọi method)
│  │  └─ endpoints/route.ts              # Tạo endpoint
│  ├─ page.tsx                           # Danh sách endpoint + nút tạo mới
│  ├─ e/[endpointId]/page.tsx            # Inspector realtime
│  └─ layout.tsx
├─ components/
│  ├─ RequestList.tsx
│  └─ RequestDetail.tsx                  # Headers / Query / Body
├─ lib/
│  ├─ firebase-admin.ts                  # Server only
│  ├─ firebase-client.ts                 # Client
│  └─ capture.ts                         # Request → document
├─ firestore.rules
├─ .env.local.example
└─ PLAN.md
```

---

## 4. Các bước triển khai

### Bước 0 — Chuẩn bị (0.5 ngày)
- [ ] Tạo Firebase project, bật Firestore (Native mode), chọn region.
- [ ] Bật Firebase Authentication (Google) — hoặc bỏ qua nếu chỉ dùng cá nhân (xem mục 5).
- [ ] Tạo Service Account, lấy `project_id`, `client_email`, `private_key`.
- [ ] `npx create-next-app@latest` (TypeScript, App Router, Tailwind).
- [ ] Cài `firebase`, `firebase-admin`, `nanoid`.
- [ ] `.env.local`:
  ```
  FIREBASE_PROJECT_ID=
  FIREBASE_CLIENT_EMAIL=
  FIREBASE_PRIVATE_KEY=
  NEXT_PUBLIC_FIREBASE_API_KEY=
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=
  NEXT_PUBLIC_FIREBASE_APP_ID=
  ```
- [ ] Kết nối repo với Vercel, khai báo env.

### Bước 1 — API bắt webhook (0.5 ngày)
`app/api/hooks/[endpointId]/route.ts`:
- [ ] `export const runtime = "nodejs"`, `export const dynamic = "force-dynamic"`.
- [ ] Một hàm `handle()` export cho `GET, POST, PUT, PATCH, DELETE`.
- [ ] Đọc body: `Buffer.from(await req.arrayBuffer())`.
- [ ] Endpoint không tồn tại → `404`.
- [ ] `lib/capture.ts`: chuyển headers/query thành object; body là text hợp lệ → `utf8`, ngược lại → `base64`; cắt nếu quá lớn.
- [ ] Ghi bằng batch: tạo request + tăng `requestCount`.
- [ ] Trả `200 {"ok":true}`.

**Xong khi:** `curl -X POST .../api/hooks/<id> -H "Content-Type: application/json" -d '{"a":1}'` tạo được document.

### Bước 2 — Dashboard realtime (1 ngày)
- [ ] Trang chủ: danh sách endpoint, nút "Tạo endpoint" (gọi `POST /api/endpoints`).
- [ ] Trang `/e/[endpointId]`:
  - URL webhook + nút Copy.
  - `onSnapshot(query(requestsRef, orderBy("receivedAt","desc"), limit(100)))`, huỷ listener khi unmount.
  - Cột trái: danh sách (method, thời gian, content-type, kích thước). Request mới hiện lên đầu.
  - Cột phải: tabs **Headers / Query / Body**. Body JSON thì pretty-print, form-urlencoded thì hiện dạng bảng, còn lại hiện text thô; có nút Copy.
- [ ] Nút "Xoá tất cả" (API route, xoá theo batch 500).

**Xong khi:** gửi webhook → dòng mới hiện trên dashboard trong < 1s, không cần reload.

### Bước 3 — Rules, TTL, deploy (0.5 ngày)
- [ ] Deploy `firestore.rules` (mục 5).
- [ ] Bật TTL policy cho field `expireAt` trên collection group `requests` (ví dụ 7 ngày).
- [ ] Deploy production lên Vercel, test với một webhook thật bất kỳ.

---

## 5. Firestore Security Rules

**Có đăng nhập (nhiều người dùng):**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /endpoints/{endpointId} {
      allow read: if request.auth != null && resource.data.ownerUid == request.auth.uid;
      allow write: if false;
      match /requests/{requestId} {
        allow read: if request.auth != null &&
          get(/databases/$(db)/documents/endpoints/$(endpointId)).data.ownerUid == request.auth.uid;
        allow write: if false;
      }
    }
  }
}
```

**Dùng cá nhân, không đăng nhập:** cho phép `read` nếu biết `endpointId` (ID ngẫu nhiên, khó đoán), vẫn chặn `write` và chặn `list` trên collection `endpoints`:
```
match /endpoints/{endpointId} {
  allow get: if true;
  allow list, write: if false;
  match /requests/{requestId} {
    allow read: if true;
    allow write: if false;
  }
}
```

---

## 6. Lưu ý kỹ thuật

| Vấn đề | Cách xử lý |
|---|---|
| Firestore doc tối đa 1 MB | Cắt body, lưu `bodySize` + `truncated` |
| Body nhị phân | Lưu base64 |
| `FIREBASE_PRIVATE_KEY` lỗi xuống dòng trên Vercel | `.replace(/\\n/g, "\n")` khi khởi tạo |
| Cold start | Khởi tạo Admin SDK dạng singleton |
| Chi phí đọc do onSnapshot | `limit(100)` + TTL xoá dữ liệu cũ |
| URL công khai bị spam | ID dài ngẫu nhiên, giới hạn kích thước body |

---

## 7. Ước lượng

| Bước | Thời gian |
|---|---|
| 0. Chuẩn bị | 0.5 ngày |
| 1. API bắt webhook | 0.5 ngày |
| 2. Dashboard realtime | 1 ngày |
| 3. Rules, TTL, deploy | 0.5 ngày |
| **Tổng** | **~2.5 ngày** |

---

## 8. Nghiệm thu
- [ ] Tạo endpoint, có URL công khai.
- [ ] Gửi request bất kỳ method/content-type → lưu đủ headers, query, body.
- [ ] Dashboard hiện request mới realtime.
- [ ] Xem chi tiết và copy được body.
- [ ] Request cũ tự xoá theo TTL.
