# Bắt đầu nhanh cho khách tự vận hành – UDIKA Khoa Bảng

Tài liệu này dành cho **đơn vị mua gói** (doanh nghiệp, trường học) và tự tổ chức thi, không cần UDIKA ngồi cùng.

## Ai làm gì

| Vai trò | Ai cấp | Làm được gì |
|---|---|---|
| **UDIKA (Admin tổng)** | – | Cấp tài khoản khách; đặt gói (số phòng cùng lúc, số sĩ tử mỗi phòng, hạn dùng); gia hạn, khoá, cấp lại mật khẩu |
| **Chủ tài khoản khách** | UDIKA | Đăng nhập `/khach`; tạo phòng; cấp, đổi và thu hồi MC; tự điều khiển mọi phòng của mình; quản lý kho đề của đơn vị; tải báo cáo; lưu trữ và xoá phòng |
| **MC** | Chủ tài khoản khách | Đăng nhập `/host` bằng mã phòng, tên MC và mật khẩu; chỉ điều khiển **đúng phòng đó** |
| **Màn LED** | – | Mở `/led?pin=<mã phòng>` trên máy chiếu. MC phải **ghép đôi** màn này làm màn chính |
| **Sĩ tử** | – | Quét QR hoặc mở `/join?pin=<mã phòng>` trên điện thoại |

Mỗi phòng có **một** tài khoản MC. Cần hai MC thay nhau thì dùng chung tài khoản đó, hoặc chủ tài khoản khách tự điều khiển.

## 5 bước cho một buổi thi

1. **Đăng nhập** `https://<tên miền>/khach` bằng tên đăng nhập và mật khẩu UDIKA gửi. Ô trên cùng cho biết:
   - số phòng đang dùng / tối đa;
   - số sĩ tử tối đa mỗi phòng;
   - hạn dùng.
2. **Tạo phòng.** Nhập tên sự kiện, tên MC và mật khẩu MC (từ 10 ký tự). Trang hiện:
   - **mã phòng**;
   - link cho MC, link màn LED, link sĩ tử.

   Gửi MC: mã phòng, tên MC và mật khẩu.
3. **Soạn đề.** Ở màn MC (`/host`), soạn đề hoặc nhập từ Word/Excel theo mẫu trên trang. Bấm **Lưu vào kho đề** để dùng lại cho các phòng sau của đơn vị. Kho đề của đơn vị bạn **chỉ đơn vị bạn thấy**.
4. **Trước giờ diễn 30 phút:**
   - Nhờ sĩ tử mở **`/kiem-tra?pin=<mã phòng>`** (có link ngay dưới nút "Vào trường thi"). Trang thử mạng, độ trễ, âm thanh, gõ tiếng Việt và cảnh báo khi mở trong Zalo/Facebook. Màn MC hiện **🩺 Kiểm tra máy: N máy · ⚠ x**; bấm vào để tải bảng chi tiết từng máy.
   - Mở màn LED trên máy chiếu và bấm vào màn LED một lần để bật tiếng.
   - Ở màn MC, mục **Màn LED**: bấm **đặt làm màn chính** cho đúng màn trên sân khấu. Chưa ghép đôi thì clip chiếu xong **không tự mở lượt trả lời**; MC sẽ được báo và bấm **MỞ LƯỢT TRẢ LỜI NGAY**.
   - Bấm **🔎 Kiểm tra chương trình trước giờ diễn**.
   - Muốn diễn tập, bật **Tổng duyệt**. Kết quả tổng duyệt được lưu riêng, có nhãn. Khi tắt Tổng duyệt, kỳ thi thật bắt đầu lại từ 0 điểm.
5. **Sau buổi thi:**
   - Tải **Báo cáo CSV** ở `/khach`.
   - Khi không dùng phòng nữa, bấm **Lưu trữ & xoá**. Phòng đóng lại và trả lại một chỗ trong hạn mức số phòng. Kết quả các kỳ thi chuyển sang mục **Lưu trữ** và vẫn tải CSV được. Không xoá được phòng đang mở câu hỏi.

## Hạn mức của gói (máy chủ tự kiểm)

| Khi nào | Phần mềm làm gì |
|---|---|
| Tạo quá số phòng cùng lúc | Từ chối, báo "Gói của bạn cho tối đa N phòng". Lưu trữ & xoá phòng cũ thì tạo tiếp được |
| Phòng đã đủ số sĩ tử theo gói | Người vào sau bị từ chối, báo "đã đủ số người tối đa theo gói dịch vụ" |
| **Hết hạn** | Không tạo phòng mới, không mở màn điều khiển mới. **Vẫn** xem và tải báo cáo, lưu trữ, dọn phòng. UDIKA gia hạn thì dùng lại ngay |
| **Bị khoá** (UDIKA khoá) | MC và chủ tài khoản đang điều khiển bị ngắt; không điều khiển được. Vẫn tải được báo cáo cũ |

Gia hạn: tự làm ở `/khach` mục **💳 Gia hạn / nâng gói** (xem phần *Thanh toán* bên dưới). Gói được gia hạn ngay khi tiền về.

## Đổi / thu hồi MC

Ở `/khach`, bấm **Đổi / thu hồi MC** rồi đặt tên và mật khẩu MC mới. MC cũ **bị ngắt khỏi màn điều khiển ngay** và mất quyền với phòng lẫn kho đề.

**Tự đổi mật khẩu** ở mục **🔑 Đổi mật khẩu tài khoản khách** cuối trang `/khach` (nhập mật khẩu cũ + mật khẩu mới từ 10 ký tự). Mọi máy khác đang đăng nhập bằng tài khoản này bị đăng xuất ngay. Quên mật khẩu: liên hệ UDIKA cấp lại.

## Dữ liệu của đơn vị bạn

- Các khách **không thấy** phòng, đề, kho đề, báo cáo hay lưu trữ của nhau, kể cả khi hai bên đặt MC trùng tên (ví dụ cùng là "mc").
- Bộ đề có nhãn **UDIKA** trong kho đề là bộ mẫu UDIKA chia sẻ cho mọi khách.
- Lịch sử mỗi kỳ thi giữ nguyên:
  - đề, từng phương án, đáp án đúng, sai số;
  - luật điểm lúc thi.

  Sau này có sửa đề, vẫn biết lúc thi phương án "A" là gì.

## Thanh toán – tự gia hạn gói

1. Ở `/khach`, mục **💳 Gia hạn / nâng gói**, bấm **Chọn gói**. Trang tạo **đơn** có mã dạng `UDxxxxxxx`.
2. Trả tiền bằng một trong các cách UDIKA đã bật:
   - **Chuyển khoản VietQR**: quét mã bằng ứng dụng ngân hàng. Số tiền và **nội dung chuyển khoản (mã đơn)** điền sẵn – đừng sửa nội dung.
   - **VNPAY** hoặc **MoMo**: bấm nút tương ứng, trả trên trang của cổng thanh toán, rồi được đưa về `/khach`.
3. Trang tự đổi sang **✅ Đã thanh toán** khi tiền về (chuyển khoản thường vài giây đến vài phút). Hạn dùng được **cộng thêm** từ ngày hết hạn cũ (hoặc từ hôm nay nếu đã hết hạn); hạn mức theo gói mới.

| Tình huống | Phần mềm làm gì |
|---|---|
| Chuyển **thiếu** tiền | Ghi nhận số đã nhận, đơn vẫn chờ; chuyển nốt phần còn lại thì đơn hoàn tất |
| Chuyển **sai nội dung** / quên mã đơn | Tiền vẫn vào tài khoản UDIKA nhưng không tự khớp đơn. Báo UDIKA mã giao dịch ngân hàng; Admin bấm **Xác nhận đã nhận tiền** |
| Ngân hàng / cổng báo **trùng** một giao dịch | Chỉ tính một lần |
| Trả cho đơn **đã huỷ** | Không gia hạn; giao dịch được ghi lại để UDIKA hoàn tiền |

Đơn vị mới (nếu UDIKA bật đăng ký): mở `/khach`, điền khung **Đăng ký** → **ĐĂNG KÝ**, được dùng thử ngay rồi mua gói như trên.

**Cho UDIKA (cài đặt):** đặt biến môi trường – không ghi khoá vào mã nguồn:
`PAY_BANK_BIN` (mã BIN ngân hàng, ví dụ 970436 Vietcombank), `PAY_ACCOUNT_NO`, `PAY_ACCOUNT_NAME`, `PAY_BANK_NAME`; `PAY_WEBHOOK_KEY` rồi khai báo webhook ở SePay (`https://<tên miền>/api/pay/bank-webhook`, kiểu xác thực *Apikey*) hoặc Casso (*secure-token*);
`VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL` (IPN: `/api/pay/vnpay/ipn`); `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`, `MOMO_ENDPOINT` (IPN: `/api/pay/momo/ipn`); `PUBLIC_URL=https://<tên miền>`; `SELF_SIGNUP=1`, `TRIAL_DAYS=7` nếu cho khách tự đăng ký.
Trước khi bán thật: chạy thử bằng tài khoản **sandbox** của VNPAY/MoMo và một lần chuyển khoản thật nhỏ qua SePay/Casso – phần mềm mới chỉ được kiểm theo tài liệu kỹ thuật của các bên, chưa nối tài khoản thật.

## Chương trình liên hoàn (team building nhiều hoạt động)

1. Ở `/khach`, mục **🏁 Chương trình liên hoàn**: đặt tên → **Tạo**. Trang quản lý `/chuongtrinh` mở ra.
2. **Đội**: gõ mỗi dòng một tên đội → **Lưu danh sách đội**.
3. **Hoạt động**: đặt tên, chọn loại:
   - **Quiz Khoa bảng**: điền mã phòng quiz; sau khi thi, bấm **⬇ Lấy điểm đội từ phòng**;
   - **Trọng tài chấm**: thang điểm (ví dụ 0–10), nhiều trọng tài thì lấy **trung bình** hoặc **cộng tổng**.
   Mỗi hoạt động có **hệ số** (ví dụ kéo co ×2, tiết mục ×10).
4. **Trọng tài**: tạo tên đăng nhập + mật khẩu và chọn hoạt động được chấm. Gửi trọng tài: trang `/trongtai`, **mã chương trình** (6 ký tự), tên đăng nhập, mật khẩu. Trọng tài chấm trên điện thoại; **sửa điểm đã gửi phải ghi lý do**, mọi lần sửa nằm trong nhật ký.
5. **Màn LED**: mở `/bangdiem?ma=<mã chương trình>` – bảng tổng tự cập nhật 3 giây/lần. Muốn giữ bí mật trước giờ công bố: bấm **🙈 Giữ kín bảng điểm** (bấm **👁 Công bố bảng điểm lên LED** khi tới giờ).
6. Kết thúc: **🔒 Khoá điểm (chốt kết quả)** – không ai sửa được nữa → **⬇ Báo cáo CSV**.

## Chạy tại hội trường không có Internet (mạng nội bộ – LAN)

1. Máy tính làm máy chủ (Windows/macOS/Linux có Node.js 22): mở thư mục phần mềm, chạy `npm run lan`.
2. Màn hình in **địa chỉ** (ví dụ `http://192.168.1.10:3000`), **mã QR** và **mật khẩu Admin** (tạo một lần, lưu ở `data/lan-secrets.json`).
3. Máy MC, máy chiếu LED và điện thoại sĩ tử vào **cùng một Wi-Fi** với máy chủ.
4. Lưu ý: bộ phát **tắt "cách ly máy khách" (AP/client isolation)**; tường lửa cho phép cổng 3000 (Windows hỏi lần đầu → chọn *Cho phép*, mạng *Riêng tư*); đặt IP cố định cho máy chủ để QR in sẵn không đổi; bộ phát gia đình chỉ chịu khoảng 30–60 máy – hội trường đông cần bộ phát chuyên dụng.
5. Không có Internet thì **câu hỏi dùng link YouTube / ảnh trên mạng không chạy** – tải ảnh/âm thanh/phim lên máy chủ. Phông chữ, QR, phim vinh danh, tiếng trống đều nằm sẵn trong máy.
