# UDIKA KHOA BẢNG – “AI LÀ TRẠNG NGUYÊN?” · V15

Gameshow tri thức thời gian thực cho sự kiện, trường học và team building. Phong cách tương tự Kahoot, sân khấu theo chủ đề khoa cử Việt Nam.

| Trang | Dành cho |
|---|---|
| `/` | Trang chủ: nhập mã phòng 6 số → ghi danh |
| `/join?pin=…` | Sĩ tử trả lời trên điện thoại |
| `/host?pin=…` | MC điều khiển (đăng nhập bằng mã phòng + tài khoản MC) |
| `/led?pin=…` | Màn LED / máy chiếu (`?clean=1` để vào thẳng chế độ sân khấu, `&label=LED trái` để đặt tên) |
| `/admin` | Admin UDIKA: tạo phòng, cấp MC, kho đề, tải báo cáo |

## Có gì trong V15

- **Bán cho khách tự vận hành.**
  - UDIKA cấp tài khoản khách ở `/admin`, kèm gói: số phòng cùng lúc, số sĩ tử mỗi phòng, hạn dùng.
  - Khách tự tạo phòng, cấp và thu hồi MC, dùng kho đề riêng, tải báo cáo, lưu trữ phòng ở `/khach`.
  - Máy chủ kiểm mọi hạn mức; dữ liệu giữa các khách tách biệt.
  - Hướng dẫn cho khách: `HUONG_DAN_KHACH_TU_VAN_HANH.md`.
  - **Thanh toán tự động**: khách chọn gói → mã **VietQR** (chuyển khoản; SePay/Casso báo có → tự gia hạn), hoặc **VNPAY**, **MoMo**. Admin xác nhận tay khi khách chuyển sai nội dung. Khách **tự đăng ký** (dùng thử) và **tự đổi mật khẩu**.
- **Chương trình liên hoàn** (team building nhiều hoạt động): đội, hoạt động có hệ số, **trọng tài chấm trên điện thoại** (`/trongtai`), sửa điểm phải ghi lý do, khoá điểm, nhập điểm đội từ phòng quiz, **bảng tổng trên LED** (`/bangdiem?ma=…`), báo cáo CSV.
- **Chạy mạng nội bộ (LAN)** không cần Internet: `npm run lan`. **Trang tự kiểm tra máy** `/kiem-tra` (mạng, độ trễ, âm thanh, gõ tiếng Việt, trình duyệt trong Zalo/Facebook) – kết quả về màn MC.
- **Màn LED tải lại trang giữa phim vinh danh thì chạy tiếp đúng chỗ**, không chiếu lại từ đầu.

- **Giao diện "Trạng nguyên dân gian"** (`public/dan-gian.css`): nền sơn mài + mặt trống đồng chìm, khung gỗ sơn son thếp vàng, diềm răng cưa, thẻ giấy dó, nút vàng lá, ô đáp án kiểu tranh khắc gỗ – giữ nguyên bố cục và thao tác.
- **10 hình thức trả lời** (đợt 6, xem `HUONG_DAN_HINH_THUC_TRA_LOI.md`): thêm **Điền ô chữ**, **Ghép cặp**, **Đúng – Sai**, **Chọn hình ảnh** riêng; trắc nghiệm tới 6 phương án, sắp xếp tới 8 mục; ước lượng **càng gần càng nhiều điểm**; bình chọn **giữ kín tới khi MC công bố**; **MC duyệt tay** câu viết; cơ chế điểm **riêng từng câu** (×3, điểm tối đa, tốc độ / cố định, không thưởng chuỗi, **câu quyết định khi bằng điểm**, giữ bảng xếp hạng, hiệu ứng **vượt hạng**); **👁 Xem trước** câu hỏi trên điện thoại & LED trước khi lưu; 11 câu mẫu trò chơi. Bộ đề cũ không đổi.
- **Dạng câu hỏi**
  - Trắc nghiệm một đáp án, gồm Đúng/Sai.
  - **Chọn nhiều đáp án**, có nút Nộp. Chấm "đủ và đúng tập", hoặc bật chấm một phần.
  - Gõ đáp án chữ: mặc định giữ dấu tiếng Việt; tuỳ chọn không dấu, hoa/thường, dấu câu.
  - **Nhập số**: có đơn vị và sai số; chuỗi mơ hồ như `1,000` bị từ chối.
  - Sắp xếp 3–6 mục bằng nút ▲▼, bàn phím, hoặc **kéo thả bằng chuột / ngón tay**.
  - Khảo sát một hoặc nhiều lựa chọn; thanh trượt; đám mây từ.
- **Media**
  - Ảnh câu hỏi (chạm để phóng to), **phương án là ảnh** (lưới 2×2 trên điện thoại).
  - Khung **chèn ảnh** ngay dưới câu hỏi: chọn tệp, kéo thả, dán Ctrl+V.
  - **Nhập luôn ảnh có sẵn trong Word/Excel** (có tệp mẫu).
  - Video MP4/WEBM, YouTube, **âm thanh MP3/M4A/OGG/WAV**.
  - Chọn đoạn phát và nơi phát (chỉ LED, hoặc LED + điện thoại).
  - Mặc định **phát xong trên LED mới mở lượt trả lời**.
- **Luật điểm** (công bố trước khi thi)
  - Chế độ Tốc độ hoặc **Chính xác**; chế độ **Tự tin** (cược ±50/75/100); hệ số ×0, ×1, ×2.
  - Thưởng chuỗi; luật đồng hạng; điều kiện được vinh danh.
- **Vận hành**
  - Một luồng thống nhất: Mở câu → (phát clip) → Khoá & công bố → Tổng kết chặng / Xướng danh → Câu tiếp.
  - Gia hạn không làm đổi thang điểm.
  - Mỗi sĩ tử thấy hạng riêng. Lịch sử kỳ thi được lưu trước khi đặt lại.
  - Bản nháp đề có kiểm tra phiên bản; khoá bộ đề đã duyệt; nút kiểm tra đề trước khi chạy.
  - **Ghi danh có kiểm soát**: duyệt tên, danh sách dự kiến (mã dự thi + họ tên), chỉ nhận người trong danh sách, không nhận người vào muộn.
  - **Chơi thử một mình với đối thủ ảo** (`/practice`) – điểm không tính vào kỳ thi.
- **Màn LED**
  - Báo cho MC trạng thái thật: có tiếng hay bị trình duyệt chặn, phim đã tải bao nhiêu %. Từng lệnh được LED xác nhận.
  - Tải sẵn phim, thử tiếng, tổng duyệt vinh danh với tên mẫu.
  - Chế độ sân khấu; QR cỡ lớn khi chờ sĩ tử.
  - Phòng đông: 60 sĩ tử có tên ở sân trước (người mới vào / người dẫn đầu) + "biển sĩ tử" mỗi người một bóng phía sau.
- **Giao diện** điện thoại, MC, LED cùng tông xanh ngọc – ngà – vàng với trang chủ.
- **Không mất bài**
  - Đáp án được ghi nhật ký trước khi báo "đã nhận"; mỗi bài gắn mã câu và mã kỳ thi.
  - Gửi lại không bị tính trùng.
  - Khởi động lại máy chủ vẫn giữ câu đang mở và bù thời gian.
- **Chống lộ đề & công bằng**
  - Điện thoại/LED không nhận đáp án trước khi công bố; bài tự làm giữ kín kết quả tới khi đóng bài; chống bot ghi danh dồn dập.
  - MC tự mở bảng điểm và xướng danh; luật điểm theo từng vòng; báo cáo ghi rõ lý do lỡ câu (không trả lời / mất kết nối / gửi trễ).
- **Quy mô**
  - Mỗi phòng tối đa **6.000** người.
  - `router.js` chia phòng cho nhiều tiến trình hoặc nhiều máy để mở rộng ngang. Xem `KIEN_TRUC_MO_RONG_1_TRIEU.md`.
- **Font** tự lưu trữ, đủ dấu tiếng Việt (Montserrat, Lora); không phụ thuộc Google Fonts.

## Triển khai trên VPS (Docker + Caddy)

```bash
cp .env.example .env          # đặt ADMIN_PASSWORD (≥12 ký tự), SESSION_SECRET (≥24 ký tự), DATABASE_URL (khuyến nghị)
sudo cp deploy/sysctl-udika.conf /etc/sysctl.d/99-udika.conf && sudo sysctl --system
docker compose -f docker-compose.portable.yml up -d --build  # máy chủ bất kỳ: Caddy tự cấp HTTPS (xem đầu tệp)
# docker compose up -d --build   # chỉ dùng trên VPS gdata (mạng ragre_default có sẵn Caddy)
curl -s https://<tên-miền>/health
```

Cấu hình Caddy mẫu nằm ở `deploy/Caddyfile.example`. Caddy phải giữ được WebSocket lâu: xem `stream_timeout`.

### Biến môi trường

| Biến | Ý nghĩa | Mặc định |
|---|---|---|
| `ADMIN_PASSWORD`, `SESSION_SECRET` | **Bắt buộc** | – |
| `DATABASE_URL` (`DATABASE_SSL=require`) | PostgreSQL: lưu bền ảnh chụp và nhật ký ghi trước | file JSON |
| `REQUIRE_DATABASE=1` | Không cho chạy nếu thiếu PostgreSQL (nhận 1/true/yes/on; giá trị lạ bị từ chối) | tắt |
| `LOCAL_WORKERS` | Số tiến trình `server.js` do `router.js` khởi chạy | số nhân CPU |
| `NODES` | Danh sách nút khi chạy nhiều máy, ví dụ `http://10.0.0.11:4000,…` | – |
| `MAX_PLAYERS` / `MAX_ROOMS` / `MAX_ONLINE` | Giới hạn mỗi phòng / số phòng / số điện thoại mỗi tiến trình | 6000 / 30 / 15000 |
| `RECONNECT_RESERVE` | Số chỗ trong `MAX_ONLINE` dành riêng cho người đã ghi danh vào lại (người mới chỉ vào tới `MAX_ONLINE − RECONNECT_RESERVE`) | 5% của `MAX_ONLINE` |
| `BOT_JOINS` | Chống bot: số người MỚI tối đa / 10 giây / một địa chỉ mạng / một phòng trước khi chuyển sang chờ duyệt | 60 |
| `DATA_FILE`, `MEDIA_DIR` | Nơi lưu dữ liệu và ảnh/âm thanh tải lên | `data/` |
| `TRUST_PROXY=0` | Tắt việc đọc IP thật từ `X-Forwarded-For` | bật khi kết nối đến từ địa chỉ nội bộ |
| `CLUSTER_MAX_ONLINE` / `CLUSTER_RESERVE` | (đặt cho `router.js`) Trần số điện thoại **chung cả cụm** / chỗ dành người vào lại. Bộ định tuyến báo số liệu cho từng nút 2 giây/lần (có chữ ký); mất tin quá 15 giây thì nút quay về giới hạn riêng `MAX_ONLINE` | tắt / 5% |
| `SELF_SIGNUP=1`, `TRIAL_DAYS` | Khách tự đăng ký trên `/khach` và được dùng thử | tắt / 7 |
| `PUBLIC_URL` | Địa chỉ công khai (https://…) để cổng thanh toán gọi lại | theo yêu cầu |
| `PAY_BANK_BIN`, `PAY_ACCOUNT_NO`, `PAY_ACCOUNT_NAME`, `PAY_BANK_NAME` | Tài khoản nhận tiền → in mã **VietQR** cho từng đơn | tắt |
| `PAY_WEBHOOK_KEY` | Khoá webhook báo có của **SePay** (`Authorization: Apikey …`) hoặc **Casso** (`secure-token`) → tự gia hạn gói | tắt |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL` | Cổng **VNPAY** 2.1.0 (IPN: `/api/pay/vnpay/ipn`) | tắt |
| `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`, `MOMO_ENDPOINT` | Cổng **MoMo** v2 (IPN: `/api/pay/momo/ipn`) | tắt |
| `LAN_MODE=1`, `LAN_PUBLIC_PORT` | Chế độ mạng nội bộ (tự đặt khi chạy `npm run lan`) | tắt |

Khoá thanh toán chỉ đặt bằng biến môi trường – không bao giờ ghi trong mã nguồn.

### Chạy mạng nội bộ tại hội trường (không cần Internet)

```bash
npm run lan     # in địa chỉ LAN + mã QR ngay trên màn hình; tự tạo mật khẩu Admin lần đầu (data/lan-secrets.json)
```
Máy chủ, máy MC, máy chiếu LED và điện thoại vào **cùng một Wi-Fi**. Bộ phát phải tắt "cách ly máy khách"; tường lửa cho phép cổng 3000.
Màn MC/LED mở bằng `localhost` vẫn in QR theo địa chỉ LAN. Chỉ câu hỏi dùng link YouTube/ảnh trên mạng mới cần Internet.

### Docker + PostgreSQL cùng một máy

`docker compose -f docker-compose.postgres.yml up -d --build` (xem chú thích đầu tệp). CI dựng ảnh này, tắt đột ngột container rồi kiểm phòng còn nguyên.

Chạy không cần Docker: `npm install && npm start` (một tiến trình) hoặc `npm run start:cluster` (nhiều tiến trình).

## Kiểm thử

```bash
npm run test:all:nhanh   # 45 bộ chức năng/giao diện; bộ nào thất bại tự chạy lại và được ghi "chập chờn" nếu chỉ đạt sau khi chạy lại
npm run test:nghiemthu   # NGHIỆM THU: đủ 47 bộ (gồm hành trình khách 1 tiến trình & cụm 3 tiến trình, thanh toán, liên hoàn, PostgreSQL thật, LAN, diễn tập có sự cố, 2 bộ tải), mỗi bộ chạy đúng 1 lần, thiếu thư viện = KHÔNG ĐẠT → KET_QUA_NGHIEM_THU.txt
npm run test:all         # thêm bài tải 3.000 người/phòng và nhiều phòng
npm run test:ondinh      # đo độ ổn định: 18 bộ lõi × 5 vòng + 3 buổi diễn tập có sự cố (kill -9, rớt mạng, gửi trễ) đối soát từng bài
npm run test:load6000    # 6.000 người trong 1 phòng
npm run test:loadrouter  # 18.000 kết nối, 5 phòng, qua 2 bộ định tuyến và 2 tiến trình
```

Kết quả nằm trong các tệp `KET_QUA_KIEM_THU_*.txt`. Báo cáo nghiệm thu: `BAO_CAO_NGHIEM_THU_V15.md`. Hướng dẫn MC: `HUONG_DAN_TINH_NANG_V15.md`. Thử thực địa với điện thoại thật: `KIEM_THU_THUC_DIA_DIEN_THOAI.md`. Đối chiếu báo cáo kiểm định độc lập: mục 6c của báo cáo nghiệm thu, nhật ký trước/sau trong `bang_chung_kiem_dinh/`. Đề xuất gói dịch vụ & hỗ trợ: `DE_XUAT_GOI_DICH_VU_VA_HO_TRO.md`.
