# Kịch bản thử thực địa với điện thoại thật (50–100 máy)

**Vì sao cần:** kiểm thử tự động đã giả lập điện thoại (màn 320–390 px, cảm ứng, mạng 3G chậm) và 6.000 kết nối bằng script. Nhưng script không thay được những thứ chỉ có ở máy thật:
- trình duyệt cũ, bàn phím tiếng Việt (Telex/VNI, Laban Key, Gboard);
- tiết kiệm pin khóa màn hình, chuyển ứng dụng;
- Wi-Fi hội trường quá tải, 4G yếu;
- loa LED, máy chiếu.

Buổi thử này **chưa được làm**. Cần ban tổ chức làm trước sự kiện thật ít nhất 3 ngày.

## 1. Chuẩn bị

| Hạng mục | Yêu cầu |
|---|---|
| Người tham gia | 50–100 người, mỗi người một máy của chính họ (không dùng máy mượn đã cài sẵn) |
| Máy | Ghi lại tỉ lệ thực tế. Tối thiểu nên có: ≥10 iPhone (iOS 15 trở lên, có 1–2 máy iOS cũ nhất có thể), ≥10 Android giá rẻ (RAM ≤3 GB), Samsung, Xiaomi/Oppo/Vivo, 2–3 máy tính bảng |
| Mạng | Thử 2 lượt: (A) **Wi-Fi của địa điểm** thật, (B) **4G** (tắt Wi-Fi) |
| Máy chủ | Đúng bản sẽ dùng thật, có tên miền + HTTPS (không dùng địa chỉ IP/localhost) |
| Màn hình | Màn LED/máy chiếu thật, loa thật, máy MC thật |
| Ghi nhận | 1 người quan sát cho 10 máy, cầm phiếu ở mục 5; quay video màn LED |
| Bộ đề thử | 12 câu: 4 trắc nghiệm, 1 trắc nghiệm **4 ảnh**, 1 chọn nhiều, 1 gõ chữ (có dấu), 1 nhập số, 1 sắp xếp, 1 câu có **video**, 1 câu có **âm thanh**, 1 khảo sát |

**Công cụ có sẵn (V15):** trước buổi thử, mọi người mở `/kiem-tra?pin=<mã phòng>` (link ngay dưới nút "Vào trường thi"). Trang tự đo kết nối, độ trễ (trung vị 8 lần), lệch đồng hồ, lưu tạm, màn hình, giữ màn sáng; người dùng tự thử âm thanh và gõ tiếng Việt; cảnh báo khi mở trong Zalo/Facebook/TikTok. Màn MC hiện tổng hợp **🩺 Kiểm tra máy**, bấm để tải CSV từng máy (hệ điều hành, trình duyệt, độ trễ, kết quả) – dùng thay phần lớn phiếu ở mục 5. Thử cả hai cách chạy: qua Internet (tên miền + HTTPS) và **mạng nội bộ** (`npm run lan`, không Internet).

## 2. Trình tự (khoảng 45 phút mỗi lượt mạng)

1. **Vào phòng (5 phút).** Chiếu QR lớn trên LED.
   - Mọi người quét QR bằng camera mặc định của máy và nhập họ tên **có dấu**.
   - Ghi thời gian từ lúc quét tới lúc vào được bảng ghi danh.
   - Ghi những máy không quét được.
2. **Duyệt tên (3 phút).** MC bật "Theo danh sách", với danh sách 30 người.
   - 30 người trong danh sách nhập **mã dự thi**; những người còn lại chờ MC duyệt.
   - Ghi xem có ai bị kẹt ở màn "đang chờ" sau khi đã được duyệt không.
3. **Chạy 12 câu.**
   - Với mỗi câu, quan sát ghi lại: chữ có bị vỡ dấu không; ảnh có hiện không; nút có bấm trúng không; thông báo "đã nộp" có hiện không.
   - **Câu gõ chữ:** yêu cầu gõ có dấu bằng bộ gõ quen dùng.
   - **Câu sắp xếp:** yêu cầu một nửa dùng kéo thả bằng ngón tay, một nửa dùng ▲▼.
4. **Tình huống khó** (trong lúc câu 5–8 đang chạy):
   - 10 người **khóa màn hình 20 giây** rồi mở lại.
   - 10 người **chuyển sang Zalo/Facebook** rồi quay lại.
   - 5 người **bật chế độ máy bay 15 giây** rồi tắt.
   - 5 người **tải lại trang**.
   - Tất cả phải tự vào lại, giữ điểm và nộp tiếp được.
5. **Vinh danh.** Xướng danh, phim vinh danh trên LED, tiếng trống ra loa thật.
6. **Đối chiếu.** Tải báo cáo CSV. So từng người: số câu đã bấm trên máy (người chơi tự khai trên phiếu) với số câu máy chủ ghi nhận.

## 3. Tiêu chí đạt

| Mã | Tiêu chí | Ngưỡng đạt |
|---|---|---|
| F1 | Vào phòng bằng QR | ≥98% máy vào được trong 60 giây; không máy nào lỗi font |
| F2 | Tiếng Việt | 0 trường hợp vỡ dấu ở tên, câu hỏi, đáp án; gõ Telex/VNI vào ô gõ chữ đúng |
| F3 | Không mất bài | 100% lần bấm có thông báo "đã nộp" khớp với báo cáo CSV |
| F4 | Vào lại sau gián đoạn | 100% máy ở bước 4 tự vào lại, giữ điểm, trong ≤10 giây sau khi có mạng |
| F5 | Độ trễ công bố | Đáp án hiện trên ≥95% máy trong ≤2 giây sau khi MC bấm công bố |
| F6 | Ảnh & media | Ảnh câu và ảnh phương án hiện trên 100% máy; video/âm thanh phát trên LED, có tiếng |
| F7 | Kéo thả sắp xếp | ≥90% người dùng kéo thả được mà không cần hướng dẫn thêm; vuốt cuộn trang không làm đổi thứ tự |
| F8 | Duyệt tên | Người được duyệt vào thẳng trong ≤3 giây; người ngoài danh sách bị chặn đúng chế độ |
| F9 | Pin & nhiệt | Sau 45 phút, không máy nào tụt quá 15% pin vì trang thi; không máy nóng bất thường |

Không đạt tiêu chí nào thì ghi rõ: **máy, hệ điều hành, trình duyệt, mạng, thời điểm, ảnh chụp/video**. Gửi kèm tệp `test/last-failures.log` nếu chạy lại kiểm thử tự động.

## 4. Thu thập kỹ thuật

- Trên máy chủ, ghi lại `GET /health` mỗi 10 giây (RAM, số kết nối) trong suốt buổi thử.
- Lưu nhật ký máy chủ và tệp báo cáo CSV.
- Với máy gặp lỗi:
  - Android: nối USB, mở `chrome://inspect` → Console và chụp lỗi.
  - iPhone: dùng Safari trên Mac → Develop.

## 5. Phiếu ghi cho người quan sát (mỗi dòng một máy)

| STT | Hãng / đời máy | Hệ điều hành | Trình duyệt | Mạng | Vào phòng (giây) | Lỗi font | Mất bài | Vào lại OK | Kéo thả OK | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | Wi-Fi / 4G | | Có / Không | | | | |

## 6. Sau buổi thử

Gửi lại 3 thứ: phiếu ở mục 5, tệp CSV báo cáo, và video màn LED. Lỗi tìm được sẽ được sửa và bổ sung thành kiểm thử tự động, để không tái diễn.
