# Hướng dẫn MC – các chức năng mới của V15

## Trước giờ diễn

1. Mở màn LED: `/led?pin=<mã>&label=LED%20chính`. Trên máy chiếu, bấm **🖥 Chế độ sân khấu** (hoặc phím **F**). Nếu cần chừa viền, thêm `&safe=3`.
2. **Bấm một lần vào màn LED.** Trình duyệt chỉ cho phát tiếng sau khi có người bấm. Trên màn MC, mục **🖥 Màn LED** phải hiện “🔊 có tiếng”. Nếu hiện “🔇 TRÌNH DUYỆT CHẶN TIẾNG” thì bấm lại vào LED.
3. Trong khung hoạt cảnh vinh danh, lần lượt bấm:
   - **⬇ Tải sẵn phim vinh danh**: đợi tới “phim đã tải 100%”.
   - **🔊 Thử tiếng LED**: LED phát trống thử và trả lời “đã phát tiếng trống thử”.
   - **🎬 Tổng duyệt vinh danh**: LED chiếu phim với tên mẫu “Nguyễn Văn Mẫu”, có nhãn TỔNG DUYỆT. Xem xong bấm **✖ Thoát tổng duyệt**.
4. Mở **⚖️ Luật điểm, xếp hạng & vinh danh**, chọn và **công bố trước** với người chơi (có thể đặt **luật riêng cho từng vòng**: ví dụ Lớp thầy đồ "Chính xác", Thi Đình "Tốc độ"):
   - **Tốc độ**: đúng được 300–1.000 điểm tuỳ thời gian. Hoặc **Chính xác**: mỗi câu đúng 1.000 điểm.
   - **Chế độ Tự tin** (tuỳ chọn): người chơi chọn “💪 Chắc chắn”; đúng +50 / +75 / +100 theo chuỗi, sai bị trừ tương ứng.
   - **Đồng điểm**: xét thêm thời gian, hoặc cho đồng hạng.
   - **Điều kiện vinh danh**: số câu đúng tối thiểu và điểm tối thiểu.
5. Bấm **🔎 Kiểm tra chương trình trước giờ diễn** (trong khung Luật điểm). Bảng kết quả liệt kê:
   - từng câu có media: tải và giải mã được không (✅/❌), câu âm thanh "phát xong CÓ TIẾNG mới mở lượt";
   - YouTube cần Internet;
   - tình trạng từng màn LED: có tiếng hay bị chặn, phim đã tải chưa, màn chính;
   - phương án dự phòng cho mỗi câu.
   Ở dòng "Màn LED", bấm **đặt làm màn chính** cho màn trên sân khấu. Màn chiếu mở trên máy khác (chưa đăng nhập MC) phải được ghép đôi như vậy, kể cả khi chỉ có một màn. Chỉ màn chính đã ghép đôi mới tự mở lượt trả lời sau khi phát clip. Màn chưa ghép đôi có nhãn "chưa ghép đôi"; nếu nó phát hết clip, MC được báo và bấm **MỞ LƯỢT TRẢ LỜI NGAY**. Màn chính tải lại trang vẫn giữ quyền.
6. Bộ đề đã duyệt thì bật **🔐 Khoá bộ đề** để tránh sửa nhầm trong lúc diễn.

## Trong lúc thi

**Thứ tự nút luôn là:** **▶ MỞ CÂU HỎI → 🔒 KHOÁ BÀI & CÔNG BỐ ĐÁP ÁN → ⏭ (Câu tiếp theo / Tổng kết chặng / Xướng danh chung cuộc)**. Nút nào chưa dùng được sẽ tự mờ đi.

- **Câu có video hoặc âm thanh** (mặc định “phát xong mới mở lượt trả lời”):
  - LED phát nội dung; điện thoại hiện “Clip đang phát…”.
  - Khi LED phát xong, máy chủ tự mở lượt trả lời và đồng hồ chung bắt đầu chạy.
  - Nếu LED không phát được, bấm **⏩ MỞ LƯỢT TRẢ LỜI NGAY**.
- **+10 / +30 giây** chỉ kéo dài thời gian nộp bài, không đổi điểm của người đã nộp. Người nộp trong phần thời gian cộng thêm nhận mức điểm tốc độ tối thiểu.
- Khi công bố, mọi điện thoại hiện đáp án và dòng hạng riêng, ví dụ “Bạn xếp hạng 137/2.000 — đúng 18/20 câu”.
- Sau câu cuối mỗi chặng, nút ⏭ đổi thành **TỔNG KẾT CHẶNG**. Sau câu cuối cùng, nút đổi thành **XƯỚNG DANH CHUNG CUỘC**.
- Cần cho người đến muộn quét mã: bấm **📱 Chiếu QR lớn lên LED**.

## Soạn câu hỏi

| Dạng | Cách soạn |
|---|---|
| Trắc nghiệm một đáp án | 2–4 phương án; nút nhanh Đúng/Sai |
| Chọn nhiều đáp án | Đánh dấu các đáp án đúng. Có thể bật **chấm một phần** = (chọn đúng − chọn sai) / số đáp án đúng; câu chấm một phần không tính là “câu đúng” |
| Gõ đáp án chữ | Mỗi dòng một cách viết được chấp nhận. Mặc định **giữ dấu tiếng Việt**; tuỳ chọn chấp nhận không dấu, phân biệt hoa/thường, bỏ mọi dấu câu |
| Nhập đáp án số | Giá trị đúng, sai số ±, đơn vị. Người chơi dùng `,` hoặc `.` làm dấu thập phân; chuỗi mơ hồ như `1,000` sẽ bị yêu cầu nhập lại |
| Sắp xếp | 3–6 mục, ghi theo đúng thứ tự. Người chơi đổi chỗ bằng ▲▼, phím mũi tên, hoặc **kéo thả**: trên máy tính kéo tay cầm ⠿; trên điện thoại chạm giữ một mục khoảng nửa giây rồi kéo (vuốt nhanh thì vẫn là cuộn trang). Có thể bật chấm một phần |
| Khảo sát | Một hoặc nhiều lựa chọn; không tính điểm |
| Phương án bằng ảnh | Bấm **🖼 Thêm ảnh** ở từng phương án, hoặc đặt con trỏ vào ô phương án rồi dán ảnh (Ctrl+V); phương án có thể chỉ có ảnh. Trên điện thoại 4 phương án ảnh xếp lưới 2×2 |
| Media của câu | Ảnh, video tải lên, YouTube, âm thanh MP3/M4A/OGG/WAV. Chọn đoạn phát, nơi phát (**chỉ LED** hoặc **LED + điện thoại**) và “phát xong mới mở lượt trả lời”. Với ảnh, viết mô tả cho người khiếm thị và **không ghi đáp án vào mô tả** |
| Hệ số điểm | ×1, ×2 (câu quan trọng), ×0 (câu khởi động) |

## Chèn ảnh

**Ảnh cho câu hỏi** – ngay dưới ô nội dung câu hỏi có khung **🖼 THÊM ẢNH CHO CÂU HỎI**. Ba cách:
1. Bấm vào khung rồi chọn tệp (JPG, PNG, GIF, WEBP).
2. Kéo tệp ảnh từ máy thả vào khung.
3. Chụp/sao chép ảnh rồi bấm **Ctrl+V** khi đang soạn câu. Nếu con trỏ đang ở ô phương án, ảnh thành ảnh của phương án đó.

Ảnh hiện to ngay trong khung; bấm **Đổi ảnh** hoặc **Bỏ ảnh** khi cần. Nhớ bấm **LƯU CÂU**.

**Ảnh có sẵn trong Word/Excel** – không cần tải ảnh riêng:
- **Word:** chèn ảnh ở dòng ngay dưới câu hỏi → ảnh câu hỏi. Chèn ảnh ngay trong dòng `A. …` (hoặc dòng ngay sau) → ảnh phương án. Dạng bảng: ảnh trong ô câu hỏi hoặc ô phương án.
- **Excel:** chèn ảnh nổi (Insert → Pictures) đặt **nằm trong** ô câu hỏi, cột "Ảnh" hoặc ô phương án.
- Xem mẫu: **🖼 Mẫu Word có ảnh** và **🖼 Mẫu Excel có ảnh** trong khung nhập đề.
- Bản xem trước hiện hình thu nhỏ từng ảnh. Ảnh không xác định được thuộc câu nào sẽ được báo, không nhập bừa. Ảnh kiểu "đặt trong ô" (Place in Cell) của Excel 365 chưa đọc được – hãy dùng ảnh nổi.

## Ghi danh, duyệt tên, danh sách dự kiến

Trong **👥 QUẢN LÝ SĨ TỬ → 🛂 Ghi danh & duyệt tên**:

| Chế độ "Ai được vào" | Dùng khi |
|---|---|
| Mở | Sự kiện công khai, ai có mã phòng cũng vào ngay (mặc định) |
| Duyệt tên | Muốn xem tên trước – mọi người chờ MC bấm **✔ Duyệt** |
| Theo danh sách | Có danh sách khách mời; người trong danh sách vào ngay, người ngoài chờ duyệt |
| Chỉ danh sách | Thi chính thức; người ngoài danh sách không vào được |

- **Danh sách dự kiến:** mở **📋 Danh sách người dự kiến**, dán từ Excel 2 cột *Mã dự thi, Họ tên* (mã không bắt buộc) → **💾 Lưu danh sách**. Người chơi nhập họ tên (gõ không dấu cũng được) **hoặc** mã ở ô "Có mã dự thi…". Tên hiện trên LED lấy đúng theo danh sách. Mã chỉ MC và báo cáo thấy.
- Mỗi dòng danh sách chỉ dùng trên **một** thiết bị. Nếu ai đó báo "đã vào trên thiết bị khác", tìm tên/mã trong danh sách sĩ tử và **Mời rời phòng** thiết bị kia.
- Dòng "x/y đã vào" và danh sách **chưa vào** giúp điểm danh trước giờ thi.
- Người đang chờ duyệt: **✔ Duyệt**, **✖ Từ chối**, **⛔ Từ chối + chặn tên**, hoặc **Duyệt tất cả**. Người được duyệt vào thẳng, không phải nhập lại.
- **Vào muộn → Không nhận người mới khi đã mở câu 1**: từ câu 1 trở đi không nhận người mới; người đã ghi danh mất mạng vẫn vào lại bình thường.

## Phòng đông trên màn LED

Màn LED vẽ tối đa **60 sĩ tử có tên** ở sân trước: trước giờ thi là người mới vào (ai vừa quét QR sẽ thấy mình), sau mỗi lần công bố là **60 người dẫn đầu**. Những người còn lại hiện thành "biển sĩ tử" phía sau – mỗi người một bóng; phòng trên 1.500 người thì một bóng đại diện nhiều người và màn ghi rõ tỷ lệ.

## Chơi thử một mình

Người chơi chưa có mã phòng bấm **🎮 Chơi thử một mình với đối thủ ảo** ở trang chủ (`/practice`). Mặc định dùng bộ đề mẫu. Muốn cho chơi thử bộ đề của mình: Admin bật **Chơi thử công khai** cho bộ đề đó trong kho (đáp án bộ đề sẽ công khai cho người chơi thử, nên đừng bật cho đề thi thật).

## Nhập đề và bản nháp

- **Nhập Word/Excel/CSV:**
  - Câu quá dài hoặc có phương án trùng nhau sẽ **không được nhập**. Hệ thống báo đúng câu để sửa trong tệp và **không tự cắt**.
  - Các cột mới: **Dạng** (chọn nhiều / nhập số / …), **Điểm** (x2, x0), **Ảnh** và **Ảnh A–D** (đường dẫn https), **Sai số**, **Đơn vị**.
  - Đáp án cho câu chọn nhiều ghi dạng `A, C`. Câu nhập số ghi dạng `12,5 ±0,5 kg`.
- Bản xem trước chỉ mất đi khi máy chủ báo đã lưu. Nếu máy chủ từ chối, lý do hiện ngay bên dưới để sửa.
- **⬆ Nhập JSON** mở thành **bản nháp**, chưa thay bộ đề đang dùng. Khi bấm **♻ Áp dụng**: nếu bộ đề trên máy chủ đã đổi kể từ lúc mở bản nháp, hệ thống chặn để tránh ghi đè.

## MC giữ bảng điểm để dẫn dắt

Bật **🎤 MC tự mở bảng điểm & xướng danh** (mục Tuỳ chọn):
- Sau **KHOÁ BÀI & CÔNG BỐ ĐÁP ÁN**, điện thoại thấy đáp án và điểm của chính mình, nhưng **bảng xếp hạng, thứ hạng, điểm đội chưa được gửi** tới ai. Dữ liệu này giữ ở máy chủ, không chỉ ẩn trên màn hình.
- Bấm **📜 HIỆN BẢNG ĐIỂM** để chiếu bảng điểm. Sau mỗi chặng thì bấm **📜 HIỆN BẢNG VÀNG CHẶNG**.
- Sau câu cuối, màn LED hiện "Quan trường chuẩn bị xướng danh…". Phát trống, dẫn cảm xúc, rồi bấm **🏆 XƯỚNG DANH TAM KHÔI**: bảng vàng và phim vinh quy mới bắt đầu.
- Ở chế độ sân khấu, bảng vàng Tam khôi bật/tắt bằng nút **📜 Bật/tắt bảng vàng** trong khung hoạt cảnh (hoặc phím **B** trên máy LED).

## Câu có âm thanh / video

- **Câu âm thanh** chỉ mở lượt trả lời khi màn LED đã phát **có tiếng** trọn đoạn.
  - Nếu trình duyệt chặn tiếng, LED phát tắt tiếng, **không mở lượt**, và MC nhận cảnh báo.
  - Kỹ thuật bấm vào nút trên LED → đoạn được phát lại từ đầu có tiếng → xong mới mở.
  - Hoặc MC bấm **⏩ MỞ LƯỢT TRẢ LỜI NGAY** nếu chấp nhận.
- **Video** cũng mặc định cần tiếng. Clip chỉ minh hoạ hình ảnh thì đánh dấu "Clip không cần nghe tiếng".
- Màn LED chính mất kết nối giữa lúc phát → MC được báo ngay.

## Chống lộ đề

- Điện thoại và LED chỉ nhận câu đang mở, không bao giờ nhận đáp án trước khi công bố.
- **Bài tự làm** mặc định giữ kín đúng/sai, điểm và đáp án tới khi đóng bài. Tắt "🔒 Giữ kín…" chỉ khi luyện tập.
- Nếu màn MC báo **⚠ CHỐNG LỘ ĐỀ** (bộ đề có câu trùng bộ đang công khai ở chế độ chơi thử): đừng dùng cho thi có giải.
- Có quá nhiều người mới ghi danh dồn dập từ cùng một mạng → người mới vào hàng chờ duyệt, MC được báo. Nếu đó là Wi-Fi chung của hội trường, bấm **Duyệt tất cả**.

## Soạn đề không sợ mất

- Đang soạn câu thì nội dung được **tự lưu nháp trên máy này**. Dòng trạng thái ghi rõ "Nháp tự lưu … CHƯA lưu lên máy chủ".
- Lỡ tải lại trang: mở lại câu đó (hoặc ➕ Thêm câu ở cùng chặng) → bấm **↩ Khôi phục nháp**.
- Bản nháp bộ đề JSON cũng được giữ sau khi tải lại trang.

## Sau buổi thi

- **📊 Tải báo cáo kết quả**: đầu tệp ghi luật đã áp dụng (kể cả luật riêng từng vòng). Ô tên được bảo vệ, Excel không chạy thành công thức.
- Ô trống trong báo cáo ghi rõ lý do: **có kết nối nhưng không trả lời**, **mất kết nối lúc câu đóng**, **mất kết nối giữa câu**, hoặc **có gửi nhưng tới máy chủ trễ x giây – không tính**. Dùng để phân xử khi có khiếu nại.
- **🗂 Lịch sử kỳ thi**: mỗi lần làm lại hoặc thay đề, kết quả cũ được lưu tự động; tải lại được dạng CSV.
