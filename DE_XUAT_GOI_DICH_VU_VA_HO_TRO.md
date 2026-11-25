# Đề xuất: gói dịch vụ rõ ràng và quy trình hỗ trợ sự cố

Hai mục trong phản ánh về Kahoot không thuộc phần mềm:
- khó hiểu gói đã mua, nhầm chu kỳ thanh toán;
- hỗ trợ trả lời chưa đúng câu hỏi.

Với UDIKA, hai mục này nằm ở **cách bán và cách vận hành**. Dưới đây là đề xuất để ban tổ chức cân nhắc.

**Phần đã có trong phần mềm:** tài khoản khách tự vận hành (`/khach`). Gói gồm ba con số **do máy chủ kiểm**:
- số phòng cùng lúc;
- số sĩ tử mỗi phòng;
- hạn dùng.

UDIKA đặt và gia hạn gói ở `/admin` → **Tài khoản khách tự vận hành**. Hướng dẫn cho khách: `HUONG_DAN_KHACH_TU_VAN_HANH.md`.

**Phần chưa có:** thanh toán tự động, hoá đơn, tự gia hạn. Gói ghi trên trang bán hàng phải **khớp đúng** ba con số đặt trong `/admin`.

## 1. Mỗi gói ghi rõ trên một trang, trước khi khách trả tiền

| Mục phải ghi | Ví dụ cách ghi |
|---|---|
| Tổng tiền | "Tổng: 12.000.000 đ cho 1 sự kiện" (không ghi kiểu "từ 1 triệu/tháng") |
| Thời hạn sử dụng | "Dùng từ 08:00 ngày 10/12 đến 23:59 ngày 12/12" hoặc "12 tháng, KHÔNG tự gia hạn" |
| Số người mỗi phòng, số phòng chạy cùng lúc | "1 phòng tối đa 2.000 người; tối đa 3 phòng cùng lúc" (chỉ ghi con số đã thử thực địa) |
| Số tài khoản MC / kỹ thuật | "Mỗi phòng 1 tài khoản MC (chủ tài khoản khách cũng điều khiển được) + 1 kỹ thuật LED". Phần mềm cấp **một** tài khoản MC cho mỗi phòng – không ghi "2 MC" như hai tài khoản riêng |
| Media | Có/không: ảnh, video tải lên, âm thanh, YouTube (YouTube cần Internet tại địa điểm) |
| Màn LED, phim vinh danh | Số màn LED; có/không phim rước Trạng nguyên |
| Hỗ trợ | Hỗ trợ trực tiếp tại sự kiện hay từ xa; giờ hỗ trợ; số điện thoại trực |
| Gia hạn | Ghi rõ có tự gia hạn không. Nên mặc định **không** tự gia hạn |

**Nguyên tắc:** chức năng nào cần mua thêm thì phải nằm ngay trong bảng trên. Không để khách phát hiện ra lúc đang chuẩn bị chương trình.

## 2. Quy trình hỗ trợ khi đang diễn

1. **Trước giờ diễn 30 phút:**
   - MC bấm **🔎 Kiểm tra chương trình trước giờ diễn**.
   - Kỹ thuật bấm vào màn LED một lần để bật tiếng, bấm **⬇ Tải sẵn phim** và **🔊 Thử tiếng LED**.
   - Chọn **★ màn LED chính**.
2. **Người trực:** mỗi sự kiện có **một người chịu trách nhiệm kỹ thuật**, có tên và số điện thoại, nghe máy trong suốt chương trình.
3. **Kịch bản sự cố có sẵn** (MC đọc được ngay):
   - Clip không phát được → bấm vào LED để bật tiếng, hoặc **⏩ MỞ LƯỢT TRẢ LỜI NGAY**.
   - Màn LED mất kết nối → mở lại `/led?pin=…&clean=1` trên máy dự phòng; kỳ thi vẫn chạy.
   - Máy chủ khởi động lại → bài đã xác nhận được giữ, câu đang mở được cộng bù thời gian.
   - Người chơi tranh cãi "đã bấm mà không được tính" → tải báo cáo CSV. Báo cáo ghi rõ: không trả lời, mất kết nối, hay gửi trễ bao nhiêu giây.
4. **Sau sự kiện:**
   - Gửi khách báo cáo CSV, lịch sử kỳ thi (có bài nộp từng câu) và ghi chú sự cố nếu có.
   - Mỗi lỗi kỹ thuật được ghi lại và bổ sung thành bài kiểm thử tự động.

## 3. Không quảng cáo điều chưa chứng minh

- **Quy mô.** Kahoot Event Max ghi 2.000 người/phiên, bản premium tới 5.000. UDIKA mới thử tải bằng script (6.000/phòng), **chưa thử với điện thoại thật**. Chỉ công bố con số đã thử thực địa.
- **Không tính tốc độ.** Không quảng bá "có chế độ không tính tốc độ" là điểm khác biệt, vì Kahoot đã có Accuracy.
- **Điểm khác biệt nên nhấn:**
  - bản sắc Khoa bảng Việt Nam;
  - MC chủ động mở bảng điểm và xướng danh;
  - luật điểm theo từng vòng, công bố trước;
  - báo cáo đủ chứng cứ để phân xử khi trao giải.
