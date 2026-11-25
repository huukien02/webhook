# Webhook Inspector

Tạo một URL công khai, đưa cho bất kỳ dịch vụ nào. Mọi request gửi tới (method, headers, query, body) được lưu vào Firestore và hiện realtime trên dashboard.

Stack: Next.js 16 (App Router) trên Vercel + Cloud Firestore. Kế hoạch chi tiết: [PLAN.md](PLAN.md).

## Cấu trúc

| Đường dẫn | Vai trò |
|---|---|
| `app/api/hooks/[endpointId]/route.ts` | URL nhận webhook (GET/POST/PUT/PATCH/DELETE), lưu request, trả `200 {"ok":true}` |
| `app/api/endpoints/route.ts` | `POST` tạo endpoint mới |
| `app/api/endpoints/[endpointId]/requests/route.ts` | `DELETE` xoá toàn bộ request của endpoint |
| `app/page.tsx` | Trang chủ: tạo endpoint, danh sách endpoint (lưu trong localStorage) |
| `app/e/[endpointId]/page.tsx` + `components/EndpointInspector.tsx` | Inspector realtime (`onSnapshot`) |
| `lib/capture.ts` | Chuyển request thành document (text → UTF-8, nhị phân → base64, cắt body > 500 KB) |
| `firestore.rules` | Client chỉ đọc khi biết endpointId, không ghi được |

## Cài đặt

### 1. Firebase
1. Tạo project tại <https://console.firebase.google.com>.
2. **Build → Firestore Database → Create database** (Native mode, region gần Vercel, ví dụ `asia-southeast1`).
3. **Project settings → General → Your apps → Web app**: lấy `apiKey`, `authDomain`, `projectId`, `appId`.
4. **Project settings → Service accounts → Generate new private key**: tải file JSON, lấy `project_id`, `client_email`, `private_key`.
5. Deploy rules:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use --add          # chọn project vừa tạo
   firebase deploy --only firestore:rules
   ```
6. (Khuyến nghị) Bật TTL để tự xoá request cũ: **Firestore → TTL → Create policy**, collection group `requests`, field `expireAt`.

### 2. Chạy local
```bash
cp .env.local.example .env.local   # điền các giá trị ở bước 1
npm install
npm run dev
```
Mở <http://localhost:3000>, tạo endpoint, rồi gửi thử:
```bash
curl -X POST "http://localhost:3000/api/hooks/<endpointId>" \
  -H "Content-Type: application/json" \
  -d '{"hello":"world"}'
```

### 3. Deploy lên Vercel
1. Push code lên GitHub, import repo trên <https://vercel.com/new>.
2. **Settings → Environment Variables**: thêm toàn bộ biến trong `.env.local`. `FIREBASE_PRIVATE_KEY` dán nguyên chuỗi có `\n`.
3. (Tuỳ chọn) **Settings → Functions → Region** chọn `sin1` cho gần Firestore.
4. Deploy, rồi đưa `https://<app>.vercel.app/api/hooks/<endpointId>` cho dịch vụ cần bắt webhook.

## Lưu ý
- Bản này **không đăng nhập**: ai có endpointId (21 ký tự ngẫu nhiên) thì xem và xoá được request của endpoint đó. Đừng chia sẻ URL dashboard nếu payload nhạy cảm.
- Request lớn hơn 5 MB bị từ chối (`413`); body lớn hơn 500 KB chỉ lưu phần đầu.
- Dịch vụ yêu cầu bước xác thực URL bằng challenge (Slack, Meta, Zoom) sẽ không chấp nhận URL này vì endpoint luôn trả `{"ok":true}`.
