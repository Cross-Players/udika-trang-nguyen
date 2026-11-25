# Hướng dẫn MC – tính năng mới V14

## Dạng câu hỏi
Khi soạn câu, chọn **Dạng câu** trong khung "Chọn một câu để sửa":
- **Trắc nghiệm (2–4 đáp án):** gồm cả câu Đúng/Sai. Ô đáp án có 4 màu kèm hình: ▲ đỏ, ◆ lam, ● vàng, ■ lục.
- **Gõ câu trả lời:** mỗi dòng ghi một cách viết được chấp nhận. Mặc định chấp nhận gõ không dấu, không phân biệt chữ hoa/thường và dấu câu.
- **Sắp xếp thứ tự:** ghi 3–4 mục **theo đúng thứ tự**. Máy tự xáo trộn trên điện thoại, sĩ tử chạm lần lượt theo thứ tự.
- **Thăm dò ý kiến:** không tính điểm. Màn LED hiện biểu đồ trực tiếp.
- **Thanh trượt:** nhập nhỏ nhất, lớn nhất, bước nhảy, đáp án và sai số cho phép (±). Đúng tuyệt đối được điểm cao hơn gần đúng.
- **Đám mây từ:** không tính điểm. Câu trả lời giống nhau được gộp lại, từ phản cảm tự ẩn.
- **Giải thích:** ghi chú này hiện sau khi công bố.
- **Ảnh / video:** tải tệp lên (ảnh tối đa 8 MB; video MP4/WEBM tối đa 60 MB) hoặc dán link https / YouTube. Video chiếu trên màn LED; điện thoại chỉ hiện ảnh.

Nhập từ Excel: thêm cột **Dạng** (gõ đáp án / sắp xếp / thăm dò / thanh trượt / đám mây từ) và cột **Giải thích**. Cách ghi từng dạng:
- **Gõ đáp án:** ghi các cách viết vào cột Đáp án, cách nhau bằng `|`.
- **Thanh trượt:** A = nhỏ nhất, B = lớn nhất, C = bước, D = sai số, Đáp án = giá trị đúng.

Với Word, thêm dòng `Dạng: …`; câu thanh trượt ghi thêm `Khoảng: 1000 - 1100`, `Sai số: 5`.

## Thiết lập phòng
- **Tự công bố đáp án** (bật sẵn): khi mọi sĩ tử đang kết nối đã nộp, máy tự công bố sau 1,5 giây. Hết giờ cũng tự công bố.
- **Thưởng chuỗi:** câu đúng liên tiếp được +100 điểm mỗi câu, tối đa +500. Câu thăm dò và đám mây từ không làm đứt chuỗi.
- **Khoá phòng:** không nhận người mới. Người đã vào vẫn vào lại được.
- **Chơi theo đội:** mỗi dòng ghi một tên đội (2–8 đội). Điểm đội là **điểm trung bình** của các thành viên.
- **Tự làm bài (giao bài về nhà):** chọn hình thức "Tự làm bài", đặt hạn nộp rồi bấm MỞ BÀI. Mỗi sĩ tử tự bấm làm từng câu (có đồng hồ riêng), xem ngay đáp án đúng. Khi đóng bài, máy xướng danh Tam khôi.

## Quản lý sĩ tử
- Hệ thống tự chặn tên phản cảm và tên trùng.
- **Mời rời phòng:** sĩ tử có thể vào lại.
- **Mời rời + chặn tên:** tên đó không vào lại được. Có thể bỏ chặn trong danh sách bên dưới.

## Kho đề
- Bấm **Lưu bộ đề hiện tại vào kho** để dùng lại ở phòng khác hoặc buổi sau.
- **Nạp (thay bộ đề):** thay toàn bộ đề và đặt lại điểm.
- **Thêm vào bộ đề:** giữ nguyên điểm.
- Bộ đề của MC chỉ người tạo và Admin thấy. Admin bật "Dùng chung" ở trang /admin thì mọi MC đều dùng được.

## Mã QR
Mã QR được tạo ngay trong app, không cần Internet. QR hiện trên màn MC và màn LED (khung "Cổng ghi danh").
