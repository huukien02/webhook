"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CopyButton } from "./CopyButton";

const noopSubscribe = () => () => {};

function Code({ children }: { children: string }) {
  return (
    <div className="relative mt-2">
      <pre className="overflow-auto rounded-md bg-black/[.05] p-3 pr-20 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all dark:bg-white/[.07]">
        {children}
      </pre>
      <div className="absolute top-2 right-2">
        <CopyButton text={children} />
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-2 text-sm leading-relaxed">
        <h3 className="font-semibold">{title}</h3>
        {children}
      </div>
    </section>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-black/[.06] px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/[.1]">
      {children}
    </code>
  );
}

export function HelpDialog({ endpointId }: { endpointId?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const hookUrl = `${origin}/api/hooks/${endpointId ?? "<endpointId>"}`;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
      >
        ? Hướng dẫn
      </button>

      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false); // bấm ra ngoài để đóng
        }}
        className="m-auto max-h-[85vh] w-[min(720px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-black/10 bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/60 dark:border-white/15"
      >
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/10">
            <h2 className="text-lg font-semibold">Hướng dẫn sử dụng Webhook Inspector</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng"
              className="rounded-md px-2 py-1 text-zinc-500 hover:bg-black/5 hover:text-current dark:hover:bg-white/10"
            >
              ✕
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-6 overflow-auto px-6 py-5">
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Webhook Inspector cho bạn một URL công khai. Đưa URL đó cho bất kỳ dịch vụ nào (cổng thanh
              toán, GitHub, Shopify, hệ thống nội bộ…). Mọi request gửi tới đều được lưu lại nguyên vẹn
              (method, headers, query, body) và hiện ngay trên màn hình, không cần tải lại trang.
            </p>

            <Section n={1} title="Tạo endpoint">
              <p>
                Ở trang chủ, nhập tên dễ nhớ (ví dụ <Kbd>Thanh toán MoMo</Kbd>) rồi bấm{" "}
                <b>Tạo endpoint</b>. Mỗi endpoint có một ID ngẫu nhiên 21 ký tự và một URL riêng. Nên tạo
                mỗi dịch vụ một endpoint để dễ phân biệt.
              </p>
            </Section>

            <Section n={2} title="Lấy URL webhook">
              <p>
                Bấm vào endpoint để mở trang chi tiết, rồi bấm <b>Copy URL</b> ở góc trên. URL có dạng:
              </p>
              <Code>{hookUrl}</Code>
            </Section>

            <Section n={3} title="Đăng ký URL với dịch vụ gửi webhook">
              <p>
                Vào phần cài đặt webhook của dịch vụ (thường tên là <i>Webhooks</i>,{" "}
                <i>Callback URL</i>, <i>IPN URL</i> hoặc <i>Notification URL</i>), dán URL vừa copy và
                lưu lại. Nếu dịch vụ có nút <i>Send test</i>, bấm thử để kiểm tra.
              </p>
              <p className="text-zinc-600 dark:text-zinc-400">
                Lưu ý: URL <Kbd>localhost</Kbd> chỉ dùng được trên máy bạn. Dịch vụ bên ngoài cần URL
                công khai (bản đã deploy lên Vercel, hoặc tunnel như{" "}
                <Kbd>npx cloudflared tunnel --url http://localhost:3000</Kbd>).
              </p>
            </Section>

            <Section n={4} title="Gửi thử bằng tay">
              <p>Không cần chờ dịch vụ thật, bạn có thể tự gửi bằng terminal:</p>
              <p className="text-xs font-medium text-zinc-500">JSON</p>
              <Code>{`curl -X POST "${hookUrl}" -H "Content-Type: application/json" -d "{\\"event\\":\\"order.paid\\",\\"amount\\":100000}"`}</Code>
              <p className="text-xs font-medium text-zinc-500">Form (x-www-form-urlencoded)</p>
              <Code>{`curl -X POST "${hookUrl}" -d "orderId=123&status=success"`}</Code>
              <p className="text-xs font-medium text-zinc-500">GET kèm query</p>
              <Code>{`curl "${hookUrl}?orderId=123&status=success"`}</Code>
              <p>Hoặc dùng Postman / Insomnia: chọn method, dán URL, nhập body rồi gửi.</p>
            </Section>

            <Section n={5} title="Xem chi tiết request">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <b>Cột trái:</b> danh sách request mới nhất ở trên cùng (tối đa 100), gồm method, IP,
                  thời gian, kích thước, content-type.
                </li>
                <li>
                  <b>Tab Body:</b> JSON được định dạng đẹp, form hiện dạng bảng (bấm <i>Dạng thô</i> để
                  xem chuỗi gốc), dữ liệu nhị phân hiện dạng base64. Có nút <b>Copy</b>.
                </li>
                <li>
                  <b>Tab Headers:</b> toàn bộ header bên gửi đính kèm (thường có chữ ký, event type,
                  delivery ID…).
                </li>
                <li>
                  <b>Tab Query:</b> các tham số trên URL (sau dấu <Kbd>?</Kbd>).
                </li>
              </ul>
            </Section>

            <Section n={6} title="Phản hồi trả về cho bên gửi">
              <p>
                Mọi request hợp lệ đều nhận <Kbd>HTTP 200</Kbd> với body{" "}
                <Kbd>{`{"ok":true,"id":"..."}`}</Kbd>, nên bên gửi coi như đã giao thành công và không
                gửi lại.
              </p>
              <table className="w-full text-xs">
                <tbody className="[&_td]:border-b [&_td]:border-black/5 [&_td]:py-1.5 dark:[&_td]:border-white/10">
                  <tr>
                    <td className="w-24 font-mono">200</td>
                    <td>Đã nhận và lưu</td>
                  </tr>
                  <tr>
                    <td className="font-mono">404</td>
                    <td>Sai endpointId (endpoint không tồn tại)</td>
                  </tr>
                  <tr>
                    <td className="font-mono">413</td>
                    <td>Body quá lớn (trên ~4,5 MB)</td>
                  </tr>
                  <tr>
                    <td className="font-mono">405</td>
                    <td>Method không hỗ trợ (chỉ nhận GET, POST, PUT, PATCH, DELETE)</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section n={7} title="Quản lý dữ liệu">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <b>Xoá request:</b> ở trang chi tiết, xoá mọi request đã bắt nhưng giữ endpoint và URL để
                  test tiếp.
                </li>
                <li>
                  <b>Xoá endpoint:</b> nút đỏ ở trang chi tiết hoặc nút <i>Xoá</i> ở trang chủ. Dùng khi đã
                  test xong: xoá vĩnh viễn endpoint cùng toàn bộ request, URL webhook sẽ trả{" "}
                  <Kbd>404</Kbd>. Không thể hoàn tác.
                </li>
                <li>
                  <b>Tự xoá:</b> request được giữ khoảng 7 ngày rồi tự xoá (nếu đã bật TTL trên Firestore).
                </li>
                <li>
                  <b>Ẩn:</b> ở trang chủ chỉ ẩn endpoint khỏi danh sách trên trình duyệt này, endpoint vẫn
                  hoạt động.
                </li>
                <li>
                  Danh sách endpoint lưu trong trình duyệt. Đổi máy hoặc xoá dữ liệu trình duyệt thì mở lại
                  bằng đường dẫn <Kbd>/e/&lt;endpointId&gt;</Kbd>, endpoint sẽ tự thêm vào danh sách.
                </li>
              </ul>
            </Section>

            <Section n={8} title="Giới hạn & lưu ý">
              <ul className="list-disc space-y-1 pl-5">
                <li>Body trên 500 KB chỉ lưu phần đầu (có cảnh báo màu vàng).</li>
                <li>
                  Không có đăng nhập: ai biết endpointId đều xem và xoá được request. Không chia sẻ đường dẫn
                  nếu dữ liệu nhạy cảm (thông tin thanh toán, token…).
                </li>
                <li>
                  Một số dịch vụ yêu cầu xác thực URL bằng challenge trước khi gửi webhook (Slack, Meta /
                  WhatsApp, Zoom). Các dịch vụ này sẽ báo URL không hợp lệ vì endpoint luôn trả{" "}
                  <Kbd>{`{"ok":true}`}</Kbd>.
                </li>
                <li>Webhook Inspector chỉ ghi nhận, không kiểm tra chữ ký và không xử lý nghiệp vụ.</li>
              </ul>
            </Section>

            <Section n={9} title="Không thấy request hiện lên?">
              <ul className="list-disc space-y-1 pl-5">
                <li>Kiểm tra URL đã dán đúng, đủ cả endpointId.</li>
                <li>Dịch vụ bên ngoài không gọi được localhost, cần URL công khai.</li>
                <li>Xem log/lịch sử gửi webhook bên phía dịch vụ: nếu nhận 404 là sai ID.</li>
                <li>Thanh báo lỗi màu đỏ trên trang chi tiết thường do quyền đọc Firestore (rules).</li>
              </ul>
            </Section>
          </div>

          <footer className="flex justify-end border-t border-black/10 px-6 py-3 dark:border-white/10">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-foreground px-4 py-1.5 text-sm font-medium text-background"
            >
              Đã hiểu
            </button>
          </footer>
        </div>
      </dialog>
    </>
  );
}
