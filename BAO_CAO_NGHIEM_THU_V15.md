# UDIKA Khoa Bảng V15 – Báo cáo nghiệm thu

**Ngày:** 25/11/2026.
**Đầu vào:**
- Báo cáo *“Lỗi bổ sung và lộ trình cạnh tranh”*, bản cập nhật có mục 5.1–5.12.
- Danh sách thiếu sót so với Kahoot.
- Yêu cầu trang chủ mới.
- Yêu cầu quy mô: **mỗi phòng tối đa 6.000 người, tổng 1.000.000 người**.

**Cách đọc:**
- **ĐÃ SỬA** / **ĐÃ LÀM**: đã có bài kiểm thử tự động chạy và đạt. Tên tệp kiểm thử ghi kèm.
- **LUẬT – CẦN CHỦ SẢN PHẨM DUYỆT**: hệ thống đã cho cấu hình và đặt sẵn một mặc định. Mặc định này là đề xuất, chủ sản phẩm có thể đổi.
- **CHƯA LÀM / CHƯA KIỂM THỬ**: ghi rõ, không tính là đạt.

## 1. Lỗi trong báo cáo bổ sung

| Mã | Kết quả | Cách sửa | Kiểm thử |
|---|---|---|---|
| L01 | ĐÃ SỬA | Tách hạn nộp khỏi thang điểm: cộng giờ chỉ kéo dài hạn nộp, thang tốc độ giữ thời gian gốc của câu. Trả lời trong phần cộng thêm được mức tối thiểu 300. Đo được: người trả lời sớm (≈1 giây) 883 điểm > người trả lời sau khi cộng giờ (≈2,5 giây) 706 điểm | `test-v15-core.js`, `test-time-v5.js` |
| L02 | ĐÃ SỬA | Không xoá `<` `>` nữa; chỉ bỏ ký tự điều khiển. Mọi nơi hiển thị đều escape. Đã thử chuỗi chèn thẻ `<img onerror>`: không chạy trên điện thoại, LED hay màn MC | `test-v15-core.js`, `test_v15_ui.py` |
| L03 | ĐÃ SỬA | Nhập đề không còn tự cắt. Câu vượt giới hạn, phương án trùng nhau, hoặc quá 4 (sắp xếp: 6) phương án đều bị **báo lỗi ngay tại câu**, giữ nguyên văn để sửa. Phương án chỉ khác dấu thì cảnh báo. Ảnh nhúng trong Word được cảnh báo là chưa nhập | `test-v15-core.js` (dữ liệu 425/328/328 ký tự) |
| L04 | ĐÃ SỬA | JSON nhập vào là **bản nháp riêng** (`draft`), không bị dữ liệu trực tiếp ghi đè. Khi áp dụng có kiểm tra `baseVer`: bộ đề trên máy chủ đã đổi thì từ chối. Bản nháp chỉ được xoá khi nhận `bank_saved` | `test-v15-core.js` |
| L05 | ĐÃ SỬA | Bản xem trước nhập Word/Excel giữ tới khi máy chủ xác nhận. Nếu bị từ chối, lý do hiện ngay bên cạnh bản đang sửa | `test_v15_ui.py` |
| L06 | ĐÃ SỬA | Một luồng duy nhất: Mở câu → (phát clip) → Khoá & công bố đáp án → Tổng kết chặng / Xướng danh → Câu tiếp. Nút MC bật theo `actions` do máy chủ tính (cùng quy tắc nhận lệnh). Bấm công bố hai lần không gây lỗi | `test-v15-core.js`, `test_ceremony_v4.py`, `test-questions-v5.js` |
| L07 | ĐÃ SỬA | Một trạng thái âm thanh chung điều khiển hiệu ứng, phim, video và âm thanh câu hỏi. Khi trình duyệt chặn tiếng: LED hiện nút bật tiếng, MC thấy "trình duyệt chặn tiếng". **Kiểm thử bằng chính sách tự phát thông thường** (`document-user-activation-required`) | `test_v15_ui.py` |
| L08 | ĐÃ SỬA | Chỉ nhận avatar trong danh sách cho phép. Avatar cũ bị cắt dở được khôi phục khi đọc lại dữ liệu | `test-v15-core.js`, `test_led_qr.py` |
| L09 | ĐÃ SỬA | Ô văn bản bắt đầu bằng `= + - @`, Tab, CR (kể cả sau khoảng trắng hoặc dạng toàn khổ) được thêm `'` phía trước. Ô số giữ là số. Áp dụng cho báo cáo MC, xuất Admin và lịch sử | `test-v15-core.js` |

## 2. Vận hành và luật chơi (mục 4)

| Mục | Kết quả |
|---|---|
| 4.1 Hạng cá nhân | ĐÃ LÀM. Sau mỗi lần công bố, mọi điện thoại hiện: “Bạn xếp hạng 137/2.000 — đúng 18/20 câu — 15.640 điểm”. Bảng xếp hạng hiện đúng đồng hạng |
| 4.2 LED xác nhận lệnh | ĐÃ LÀM. LED gửi trạng thái: sẵn sàng, tiếng bật / tắt / bị chặn, phim chưa tải / đang tải x% / xong / lỗi, chế độ sân khấu. Mỗi lệnh có mã `cid`; MC thấy “đã gửi tới N LED” và từng LED trả lời đã làm được hay không (kèm lý do) |
| 4.3 Tải trước, tổng duyệt | ĐÃ LÀM. Có các nút **Tải sẵn phim vinh danh** (báo %), **Thử tiếng LED**, **Tổng duyệt vinh danh** với tên mẫu có nhãn “TỔNG DUYỆT”. Có cờ **buổi tổng duyệt** ghi vào lịch sử và báo cáo |
| 4.4 Đồng điểm và điều kiện vinh danh | LUẬT – CẦN DUYỆT. Mặc định: điểm → số câu đúng → tổng thời gian trả lời đúng; bằng cả ba thì **đồng hạng** (ví dụ “Đồng Trạng nguyên”). Tuỳ chọn khác: chỉ xét điểm và số câu đúng. **Thời điểm ghi danh không bao giờ quyết định hạng.** Vinh danh khi ≥ 1 câu đúng và ≥ 1 điểm (MC chỉnh được). Luật hiện trên màn MC và ghi trong báo cáo CSV |
| 4.5 Lịch sử kỳ thi | ĐÃ LÀM. Trước mọi lần xoá điểm (làm lại, thay đề, đổi chế độ, mở lại bài tự làm), bảng kết quả được lưu vào lịch sử phòng: 20 lần gần nhất, tối đa 5.000 dòng mỗi lần. Xem và tải CSV trên màn MC. Audit sửa điểm thủ công: chưa có chức năng sửa điểm nên chưa áp dụng |
| 4.6 Kiểm soát người tham gia | ĐÃ LÀM. Từ V14: khoá phòng, mời ra, chặn tên, chia đội, lọc tên phản cảm, một người – một phiên. **Mới:** 4 chế độ ghi danh (Mở · Duyệt tên · Theo danh sách · Chỉ danh sách); hàng chờ duyệt với nút Duyệt / Từ chối / Từ chối + chặn / Duyệt tất cả, người được duyệt vào thẳng không phải nhập lại; danh sách dự kiến dán từ Excel (Mã dự thi, Họ tên), nhận cả mã hoặc họ tên gõ không dấu, tên hiển thị lấy theo danh sách, mỗi dòng chỉ một thiết bị; MC thấy ai chưa vào; mã dự thi chỉ MC và báo cáo CSV thấy, không lên LED; luật **không nhận người vào muộn** sau câu 1 (người đã ghi danh vẫn vào lại). Thiết lập giữ nguyên sau khởi động lại. Hàng chờ duyệt chỉ nằm trong bộ nhớ: máy chủ khởi động lại thì điện thoại đang chờ tự gửi lại | `test_entry_control.py` (13 mục) |
| 4.7 LED sạch và tiếp cận | ĐÃ LÀM: chế độ sân khấu (`?clean=1`, phím F, vùng an toàn `?safe=3`). Điện thoại: `aria-live`, đưa tiêu điểm về câu mới, nhãn cho nút và ảnh, thao tác bàn phím, giảm chuyển động |

## 3. Câu hỏi và media (mục 5)

| Ca | Kết quả | Kiểm thử |
|---|---|---|
| Q01 bộ đề V13 | ĐẠT. 15 câu `{stage,q,a,c,t}` giữ nguyên nội dung, đáp án, chặng, thời gian; có mã câu ổn định | `test-v15-core.js` |
| Q02 xuất / nhập | ĐẠT. JSON có `schemaVersion: 15`; xuất rồi nhập lại giữ mọi trường | `test-v15-core.js` |
| Q03 xáo trộn, phương án ảnh | ĐẠT. Chấm theo **mã** phương án; LED và điện thoại cùng thứ tự | `test-v15-core.js`, `test_v15_ui.py` |
| Q04 chọn nhiều | ĐẠT. Đủ và đúng tập mới đúng; đổi lựa chọn trước khi Nộp; rỗng, trùng, mã lạ bị từ chối; không nộp lần hai. **Chấm một phần** (tuỳ chọn) = (số chọn đúng − số chọn sai) / số đáp án đúng, không nhỏ hơn 0 | cả hai |
| Q05 sắp xếp | ĐẠT. Nút ▲▼, phím mũi tên, **kéo thả bằng chuột (tay cầm ⠿) và bằng ngón tay** (chạm giữ ~0,2 giây rồi kéo; vuốt nhanh vẫn cuộn trang, không đổi thứ tự); thiếu hoặc lặp mục bị từ chối | cả hai, `test_order_drag.py` |
| Q06 gõ chữ | ĐẠT. Mặc định **giữ dấu**, không phân biệt hoa/thường, gộp khoảng trắng, bỏ dấu câu đầu/cuối; không nộp khi bộ gõ đang ghép chữ. Tuỳ chọn: không dấu, phân biệt hoa/thường, bỏ mọi dấu câu | cả hai |
| Q07 nhập số | ĐẠT. Dấu thập phân `,` hoặc `.`; **từ chối** chuỗi mơ hồ (`1,000`), biểu thức, chữ, và cho nhập lại; có đơn vị; sai số tuyệt đối | cả hai |
| Q08 ảnh | ĐẠT phần chính: ảnh giữ tỉ lệ, chạm để phóng to, mô tả cho trình đọc màn hình, nút **Kiểm tra đề** báo tệp media hỏng. Chưa thử trên nhiều cỡ máy thật | `test_v15_ui.py` |
| Q09 video / âm thanh | ĐẠT phần chính: mặc định **phát xong trên LED → máy chủ mở lượt trả lời**; đoạn bắt đầu/kết thúc; báo bị chặn tiếng; MC có nút mở ngay khi LED lỗi. YouTube nhận tín hiệu kết thúc qua `postMessage` nhưng **chưa thử với mạng thật** | `test-v15-core.js`, `test_v15_ui.py` |
| Q10 trễ, trùng, mất mạng, khởi động lại | ĐẠT (từ V14, chạy lại) | `test-v14-reliability.js`, `test_v14_net_ui.py` |
| Q11 khảo sát | ĐẠT. Một hoặc nhiều lựa chọn; mẫu số = số người nộp; ghi rõ tổng có thể vượt 100%; không cộng điểm | `test-v15-core.js` |
| Q12 tải hỗn hợp, thiết bị thật | MỘT PHẦN. Thử tải bằng script tới 6.000/phòng và 18.000 tổng; **chưa thử thiết bị thật, chưa thử bộ đề hỗn hợp media ở quy mô lớn** | xem mục 5 |

**Học từ Kahoot:**
- ĐÃ LÀM: chế độ **Chính xác** (không tính tốc độ), chế độ **Tự tin** (đúng +50/75/100, sai trừ tương ứng, tổng không âm), hệ số điểm ×0/×1/×2, áp dụng thời gian cho tất cả câu (đã có), QR lớn trên LED.
- ĐÃ LÀM: **chơi thử một mình với đối thủ ảo** (`/practice`, kiểu Kahoot Solo): 5/10/20 đối thủ 🤖, 3 mức khó, phản hồi đúng/sai + đáp án ngay, bảng xếp hạng có dòng của mình và "Tăng N hạng", ôn lại và làm lại câu sai. Điểm chỉ lưu trên máy người chơi. Chỉ dùng bộ mẫu và bộ đề Admin bật "Chơi thử công khai" (bộ kín không lộ đáp án) – `test_practice.py` (9 mục).
- **Chưa làm:** xem trước song song màn MC và màn sĩ tử khi soạn đề, chơi không cần điện thoại.

## 4. Trang chủ và font

- **Trang chủ:**
  - Màu xanh ngọc, kem ngà, vàng; ảnh cổng trường thi là ảnh minh hoạ tách riêng.
  - Ô mã phòng 6 số; báo lỗi khi thiếu số, khi không có phòng, khi phòng đã khoá; có trạng thái “đang kiểm tra” và báo mất mạng.
  - MC hoặc Admin đã đăng nhập thì nút góc trên trỏ đúng trang của mình.
  - Đạt ở 4 cỡ màn hình (`test_home_ui.py`, 16 mục).
- **Font tự lưu trữ:**
  - Montserrat và Lora (SIL OFL), đã cắt gọn còn Latin và tiếng Việt; đủ 146 chữ có dấu.
  - Không gọi Google Fonts nên chạy được cả trong mạng nội bộ.
  - Kiểm tra dấu chữ hoa không bị cắt trong tiêu đề nhũ vàng (`test_fonts.py`, 12 mục).
- **QR cỡ lớn trên LED khi chờ sĩ tử:**
  - Camera đọc được kể cả khi ảnh thu nhỏ còn 25%.
  - MC bật/tắt được; lựa chọn giữ nguyên sau khi khởi động lại (`test_led_qr.py`).

## 5. Quy mô

**Mặc định:** `MAX_PLAYERS=6000` mỗi phòng.

**Thay đổi để chịu tải:**
- Gói trạng thái gửi điện thoại không còn kèm danh sách tên người chơi.
- Bảng xếp hạng chỉ tính lại khi điểm đổi.
- Lấy IP thật sau proxy, để giới hạn tần suất không chặn nhầm cả hội trường.
- Thêm `router.js` chia phòng cho nhiều tiến trình hoặc nhiều máy.

**Số đo trên máy thử 2 nhân, 8 GB RAM:**

| Bài thử | Kết quả |
|---|---|
| 1 phòng 6.000 người | 6.000/6.000, 0 sai lệch, công bố p95 ≤ 376 ms, RAM 182 MB |
| 18.000 kết nối, 5 phòng, 2 router, 2 nút, 10.662 lượt mất mạng rồi vào lại | 54.000/54.000 bài, 0 sai lệch |
| **36.000 kết nối: 6 phòng × 6.000**, 3 nút, 4 router | **108.000/108.000 bài lưu, 0 sai lệch**, 21.679 lượt mất mạng rồi vào lại, p95 0,65–1,7 giây (CPU dùng chung với công cụ thử) |
| Thử 50.000 kết nối | Không hoàn thành: công cụ phát tải hết RAM trên máy thử. 32.000 kết nối còn lại 0 sai lệch nhưng ~3% bài quá giờ. **Không tính là đạt** |
| Tắt đột ngột 1 nút | Tự khởi động lại, giữ điểm, các phòng khác không ảnh hưởng (`test-router.js`) |

**1.000.000 người:** đây là kiến trúc và định cỡ (`KIEN_TRUC_MO_RONG_1_TRIEU.md`), **chưa đo**. Cần thử tải trên hạ tầng thật theo mục 5 của tài liệu đó trước khi công bố.

## 6. Kiểm thử tự động

Lệnh `node test/run-all.js` chạy **32 bộ kiểm thử** (30 bộ chức năng, giao diện, độ tin cậy + 2 bộ tải). Bộ nào thất bại được tự chạy lại tối đa 2 lần. Bộ chỉ đạt sau khi chạy lại bị ghi là **CHẬP CHỜN**, kèm lỗi lần đầu.

Trong quá trình làm, runner đã bắt được hai lỗi kịch bản kiểm thử (đợi tin nhắn sau khi tin đã đến). Đây là lỗi của kịch bản, không phải của ứng dụng; đã sửa, rồi chạy lại 5/5 lần đều đạt. Kết quả lần chạy cuối nằm trong `KET_QUA_KIEM_THU_TONG.txt`.

## 6b. Bổ sung đợt 2 (25/11/2026)

| Hạng mục | Kết quả | Kiểm thử |
|---|---|---|
| Chèn ảnh trong trình soạn | ĐÃ LÀM. Khung "THÊM ẢNH CHO CÂU HỎI" ngay dưới ô câu hỏi: bấm chọn tệp, kéo thả, hoặc dán (Ctrl+V); dán khi đang ở ô phương án thì thành ảnh phương án | `test_import_images.py` |
| Nhập ảnh có sẵn trong Word/Excel | ĐÃ LÀM. Word: ảnh dưới dòng câu hỏi → ảnh câu hỏi, ảnh ở dòng/ô phương án → ảnh phương án (cả dạng đoạn văn và dạng bảng). Excel: ảnh nổi đặt trong ô câu hỏi/cột "Ảnh"/ô phương án. Ảnh không xác định được vị trí → cảnh báo, không nhập bừa. Có tệp mẫu `mau-de-thi-co-anh.docx`, `mau-cau-hoi-co-anh.xlsx`. Ảnh "đặt trong ô" kiểu mới của Excel 365 chưa đọc được – có cảnh báo | `test_import_images.py` (9 mục) |
| Phòng đông trên LED | ĐÃ LÀM. Màn không đủ chỗ vẽ 1.000 nhân vật có tên (mỗi người chỉ còn ~45 px). Nay: **60 nhân vật có tên** ở sân trước (trước giờ thi: người mới vào; sau công bố: 60 người dẫn đầu, hạng 1–3 có huy chương; trong lúc làm câu danh sách đứng yên để không lộ ai đúng/sai) + **"biển sĩ tử"** phía sau: mỗi người còn lại một bóng, tối đa 1.500 bóng; phòng 6.000 người ghi rõ "mỗi bóng = 4 người" | `test_led_crowd.py` (1.000 kết nối thật) |
| Tông xanh ngọc cho điện thoại, MC, LED | ĐÃ LÀM. Đầu trang, nút, khung, đồng hồ, thẻ đổi sang xanh ngọc – ngà – vàng như trang chủ. Tranh sân thi giữ chất liệu gỗ/tre/đất. Trên điện thoại thật bỏ khung "máy" để dùng hết màn hình; phương án bằng ảnh xếp **lưới 2×2** | `test_theme_mobile.py` |
| Điện thoại nhỏ & mạng chậm (giả lập) | ĐÃ LÀM phần giả lập: màn 320 px không tràn ngang (trang chủ, ghi danh, chơi thử); mạng 3G giả lập (trễ 400 ms, 750 kbit/s) vào phòng ≈4 giây, chạm đáp án được máy chủ xác nhận | `test_theme_mobile.py` |
| Thiết bị thật | **CHƯA KIỂM THỬ** – tôi không có điện thoại thật. Đã viết kịch bản thử thực địa 50–100 máy: `KIEM_THU_THUC_DIA_DIEN_THOAI.md` | – |

**Chạy lại toàn bộ nhiều lần để bắt lỗi chập chờn.** Runner nay lưu toàn văn lỗi vào `test/last-failures.log`. Kết quả:
- **Một lỗi thật của ứng dụng (đã sửa):** sau khi bấm LƯU CÂU, nếu mạng chậm mà MC đã bấm "➕ Thêm câu" và bắt đầu gõ câu mới, màn soạn bị kéo về câu vừa lưu, làm mất phần đang gõ. Nay chỉ quay về câu vừa lưu khi MC chưa chuyển sang câu khác.
- **Bốn lỗi của kịch bản kiểm thử (đã sửa):**
  - đếm ảnh trước khi ảnh tải xong;
  - trùng cổng 18961 giữa hai bộ kiểm thử;
  - bấm nút "Vào" đúng lúc trang LED tự vào lại;
  - công bố đáp án trước khi máy chủ xác nhận đã nhận bài.
- Các bộ liên quan chạy lặp 5–10 lần đều đạt. Lần chạy tổng cuối: **28/28 bộ đạt ngay lần đầu**, không bộ nào phải chạy lại (`KET_QUA_KIEM_THU_TONG.txt`).

## 6c. Đợt 3 – Sửa theo "Báo cáo kiểm định độc lập V15" (25/11/2026)

**Cách làm.** Mỗi lỗi trong báo cáo kiểm định được viết thành một ca kiểm thử tái hiện đúng điều kiện đã nêu (`test/test-audit-v15.js`, `test/test_led_media_audit.py`, `test/test_led_stage_clean.py`).
- Chạy trên **bản V15 trước khi sửa**: 15/16 ca thất bại, đúng như báo cáo.
- Chạy trên **bản sửa**: 17/17 ca đạt.
- Nhật ký cả hai lần nằm trong thư mục `bang_chung_kiem_dinh/`.

Ca duy nhất đã đạt ngay ở bản cũ là "gói dữ liệu khi câu đang chạy không chứa đáp án" (LO_DE_1). Ca này được giữ lại làm kiểm thử hồi quy.

| Mã | Lỗi trong báo cáo kiểm định | Đã sửa thế nào | Bản cũ | Bản sửa |
|---|---|---|---|---|
| QF02 | Câu gõ chữ: "5" được chấm đúng khi đáp án "-5"; đáp án "<" không nộp được | Chỉ bỏ dấu kết câu ở cuối và ngoặc/nháy bao quanh; **không bao giờ** bỏ dấu có nghĩa `- + < > = % / ^ °`. Đáp án chỉ gồm ký hiệu vẫn nộp và chấm được. Đáp án mà người chơi không thể nộp bị **báo lỗi khi lưu đề**. Chế độ chơi thử dùng đúng cùng luật | ❌ | ✅ |
| QF01 | Câu nhập số: đáp án 1.000.000.000.000, sai số 0, nhập lệch 100 vẫn đúng | So sánh **thập phân chính xác** (số nguyên lớn, 9 chữ số thập phân). Không còn cộng "sai số máy" theo độ lớn đáp án. Thanh trượt dùng cùng cách | ❌ | ✅ |
| QF03 | JSON đề: thừa lựa chọn bị cắt, dạng lạ thành trắc nghiệm, media hỏng bị bỏ | Báo lỗi cụ thể: số lựa chọn thực tế so với tối đa; dạng câu chưa hỗ trợ (kèm danh sách dạng hỗ trợ); địa chỉ media/ảnh không hợp lệ. Không cắt, không đổi, không bỏ âm thầm | ❌ | ✅ |
| QF04 | CSV/Excel: câu sắp xếp mất cột E/F; dạng "matching" thành trắc nghiệm; cột Video bị bỏ | Đọc đủ cột A–F (và dòng E., F. trong Word). Dạng lạ bị báo lỗi. Cột **Video/Âm thanh/YouTube** được nhập thành media. Cột không thuộc mẫu được **cảnh báo** trước khi Áp dụng | ❌ | ✅ |
| QF05 | Báo cáo câu sắp xếp 6 mục ghi A→A→B→C→D | Nhãn tạo từ đúng số mục: A→B→C→D→E→F | ❌ | ✅ |
| C02 | Lộ kết quả trước công bố qua mức tự tin (cf), điểm đội, số câu đúng của đội | Mọi số liệu công khai trong lúc câu chưa công bố (điểm, số đúng, chuỗi, mức tự tin, điểm và hạng đội, thứ tự nhân vật trên sân LED) đều tính như **trước** câu đó. Bỏ thuộc tính `cf` khai báo lặp | ❌ | ✅ |
| C01 | Lỗi ghi nhật ký + ảnh chụp đồng thời + khởi động lại → bài đã bị từ chối thành bài có điểm | Ảnh chụp **không chứa** bài/ghi danh đang chờ ghi. Mốc `lastSeq` = mốc mà mọi bản ghi trước đó đã xong (tách khỏi số thứ tự đã cấp). Khi khôi phục, bài `_pending` trong ảnh chụp cũ bị **loại**, không còn bị coi là đã nộp. Ca thuận: bài đã xác nhận vẫn còn sau kill -9 | ❌ | ✅ |
| C04 | Phiên toàn câu sai / chỉ khảo sát không được lưu lịch sử | Lưu mọi phiên có bài nộp. Lưu thêm **bài nộp từng câu** và bản đề lúc đó (CSV lịch sử có cột từng câu). Chi tiết từng bài giữ cho 3 phiên gần nhất; số dòng tối đa bằng sức chứa phòng (6.000) | ❌ | ✅ |
| C06 | Khoá đề vẫn đổi được thời gian | Đổi thời gian một câu, tất cả câu, hoặc mở câu kèm thời gian khác đều bị chặn khi khoá. Đổi thời gian là sửa đề nên tăng phiên bản đề | ❌ | ✅ |
| C07 | Hai MC cùng sửa: sửa theo vị trí làm đè nhầm câu | Sửa/xoá theo **mã câu ổn định** kèm nội dung lúc mở. Câu đã bị xoá hoặc vừa bị MC khác sửa → báo xung đột, không ghi đè. Thao tác không kèm mã câu chỉ được nhận khi chắc chắn bộ đề chưa đổi | ❌ | ✅ |
| C03 | `REQUIRE_DATABASE=1` không có tác dụng | Nhận 1/true/yes/on và 0/false/no/off. Giá trị lạ → dừng với thông báo rõ. Thiếu `DATABASE_URL` khi bắt buộc → dừng (exit 1) | ❌ | ✅ |
| C05 | Người vào lại vượt giới hạn trực tuyến | Giới hạn cứng `MAX_ONLINE` áp dụng cho **mọi** đường vào, có thông báo rõ. Có chỗ dự phòng `RECONNECT_RESERVE` (mặc định 5%) dành cho người đã ghi danh vào lại; người mới chỉ vào khi còn chỗ ngoài phần dự phòng. `/health` báo `online`, `onlineLimit`, `reconnectReserve`. **Lưu ý:** giới hạn vẫn tính theo từng tiến trình, chưa phải quota chung cả cụm | ❌ | ✅ |
| 7.1 | Câu âm thanh phát ở chế độ tắt tiếng vẫn tự mở lượt | Đoạn phát có lúc bị tắt tiếng thì **không** mở lượt: MC nhận cảnh báo "KHÔNG CÓ TIẾNG"; bấm vào LED → phát lại từ đầu có tiếng rồi mới mở. Câu video được chọn "không cần tiếng". Đã thử bằng chính sách tự phát mô phỏng đúng trình duyệt | ❌ | ✅ |
| 7.2 | ACK của LED chưa chứng minh phát thật; một LED bất kỳ mở lượt cho cả phòng | Tải sẵn phim = tải xong **và giải mã được** (nạp thử vào thẻ video). Lệnh phát phim chỉ báo thành công khi phim thực sự chạy (thời gian tăng); có ghi rõ phát có tiếng hay tắt tiếng. MC chọn **★ màn LED chính** và chỉ màn chính được mở lượt. Mất màn chính giữa lúc phát → MC được báo ngay | ❌ | ✅ |
| 7.3 | YouTube không theo nút tắt tiếng; chế độ sân khấu để tổng kết/bảng vàng dưới mép màn hình | YouTube nhận lệnh mute/unMute theo trạng thái tiếng chung. Chế độ sân khấu: tổng kết chặng phủ trọn khung 1920×1080. Bảng vàng Tam khôi mở bằng nút MC hoặc phím B. Thanh điều khiển phim ẩn với khán giả | ❌ | ✅ |

**Thêm theo yêu cầu "không được lộ đề, hack đáp án":**
- **LO_DE_1:** khi câu đang chạy, điện thoại và LED không nhận đáp án đúng, danh sách đáp án chấp nhận, giá trị số/sai số, giải thích hay bộ đề (kiểm cả 6 dạng câu). Câu sắp xếp luôn gửi thứ tự đã xáo.
- **LO_DE_2:** chế độ **tự làm bài** mặc định **giữ kín** đúng/sai, điểm, đáp án và bảng xếp hạng tới khi MC đóng bài, để người làm trước không chuyền đáp án cho người làm sau. MC tắt được khi chỉ luyện tập.
- **LO_DE_3:** bộ chơi thử công khai là **bộ riêng** (`practice_sample.json`, 12 câu khoa cử có giải thích), 0 câu trùng bộ đề mặc định của phòng thi. MC được cảnh báo khi bộ đề có câu trùng bộ đang công khai.
- **BOT:** quá 60 người mới trong 10 giây từ cùng một địa chỉ mạng vào cùng phòng → người tiếp theo vào hàng chờ duyệt, MC được báo. Ngưỡng chỉnh bằng `BOT_JOINS`; Wi-Fi chung của hội trường vẫn vào được nhờ nút "Duyệt tất cả". Một kết nối gửi quá 40 tin/giây bị ngắt.

**Còn lại sau đợt này (chưa làm, không tính đạt):**
- LED tải lại trang giữa lúc chiếu phim chưa khôi phục đúng vị trí phát, tạm dừng và tốc độ.
- Giới hạn trực tuyến chưa phải quota chung toàn cụm.
- Tổng duyệt chưa tách thành phiên dữ liệu độc lập.
- Xem trước song song màn MC, LED và điện thoại chưa có.
- Kiểm thử thiết bị thật, Wi-Fi hội trường, HTTPS và PostgreSQL thật chưa làm (xem `KIEM_THU_THUC_DIA_DIEN_THOAI.md`).

## 6d. Cải tiến từ phản ánh người dùng Kahoot (`test/test_kahoot_feedback.py`)

| Phản ánh | UDIKA làm gì | Kiểm thử |
|---|---|---|
| Mạng chậm làm lỡ câu, khó phân xử khi trao giải | Báo cáo ghi rõ cho từng người, từng câu: "có kết nối, không trả lời" / "mất kết nối lúc câu đóng" / "mất kết nối giữa câu" / "có gửi nhưng tới máy chủ TRỄ x giây – không tính" | A |
| MC muốn tự quyết lúc hiện bảng điểm và xướng danh | Tuỳ chọn **"MC tự mở bảng điểm & xướng danh"**: bảng xếp hạng, thứ hạng, điểm đội, tổng kết chặng và bảng vàng được giữ ở máy chủ cho tới khi MC bấm **HIỆN BẢNG ĐIỂM / XƯỚNG DANH TAM KHÔI** (phim vinh quy cũng chờ) | B |
| Tính theo tốc độ không hợp mọi vòng | **Luật điểm theo từng vòng (chặng)**: Tốc độ hoặc Chính xác; hiện trên LED, điện thoại, màn MC và đầu báo cáo | C |
| Mất bản nháp khi soạn đề | Tự lưu nháp soạn câu và nháp bộ đề JSON trên máy MC. Tải lại trang thì "Khôi phục nháp"; chỉ xoá khi máy chủ báo đã lưu. Dòng trạng thái ghi rõ "nháp trên máy này" hay "đã lưu lên máy chủ" | D |
| Không biết trước clip nào phát được | **Kiểm tra chương trình trước giờ diễn**: từng câu có media được nạp thử (giải mã thật); kèm câu nào cần tiếng, tình trạng từng màn LED (tiếng, phim, màn chính) và phương án dự phòng | E |
| Gói giá, chu kỳ thanh toán, hỗ trợ sự cố | Không phải tính năng phần mềm – xem đề xuất trong `DE_XUAT_GOI_DICH_VU_VA_HO_TRO.md` | – |

## 6e. Đợt 4 – Rà soát sẵn sàng thương mại + tài khoản khách tự vận hành

Kiểm thử: `test/test-release-v15.js`, `test/test-khach-v15.js`, `test/test_khach_ui.py`, ca cụm trong `test/test-router.js`.

Bằng chứng trong `bang_chung_kiem_dinh/`:
- `thuong_mai_truoc_khi_sua.log`: bản cũ, thất bại từng ca;
- `thuong_mai_sau_khi_sua.log`: bản mới;
- `khach_truoc_khi_sua.log` và `khach_sau_khi_sua.log`;
- `KET_QUA_NGHIEM_THU.txt` ở thư mục gốc.

### Lỗi trong rà soát thương mại

| Mã | Lỗi | Đã sửa |
|---|---|---|
| F01 | Bài nộp ngay trước khi MC "làm lại kỳ thi" vẫn được báo "đã nhận" vào kỳ mới; kill -9 rồi khởi động lại thì điểm cũ sống lại | Nhật ký ghi kèm mã kỳ thi và mã câu. Lúc xác nhận, máy chủ kiểm lại mã kỳ thi, sai thì từ chối. Khi phát lại nhật ký, bản ghi khác mã kỳ thi bị bỏ qua. (Đổi bộ đề lúc câu đang chạy đã bị chặn từ trước, nên ca này không xảy ra.) |
| F02 | Kho đề gắn theo **tên** MC: hai khách cùng đặt MC là "mc" thấy đề của nhau; đổi mật khẩu MC nhưng phiên cũ vẫn vào kho đề | Kho đề gắn với **chủ sở hữu bất biến**: `t:<mã khách>` hoặc `room:<mã phòng>`. Mọi đường kho đề kiểm phiên còn hiệu lực theo phiên bản mật khẩu. Bộ đề cũ (chủ = tên MC) chỉ Admin thấy |
| F03 | Kết nối "chỉ xem" bất kỳ (ai biết mã phòng cũng mở được), hoặc màn tự khai trùng id LED chính, có thể mở lượt trả lời sau clip | **Ghép đôi**: máy chủ cấp mã kết nối cho từng kết nối. MC bấm "đặt làm màn chính", máy chủ gửi **token bí mật** cho đúng màn đó. Chưa ghép đôi thì chỉ màn mở từ máy đã đăng nhập MC/Admin/chủ khách được tin. Màn chưa ghép đôi báo hết clip thì không mở lượt và MC được báo. Màn chính tải lại trang thì dùng lại token. Mã màn LED lưu theo từng thẻ trình duyệt (UI-03) |
| F04 | Khoá bộ đề nhưng vẫn thay được qua HTTP hoặc nạp từ kho đề | Kiểm khoá ngay trong `applyBank`/`appendQuestions`, nên mọi đường thay đề đều bị chặn; HTTP trả 409 |
| F05 | Tự công bố đóng câu khi người vừa vào chưa trả lời | Người mới vào giữa câu làm huỷ lịch đóng. Hẹn giờ kiểm lại câu và kỳ thi trước khi đóng. Tắt tự công bố thì huỷ lịch đang chờ |
| F07 | Lưu thất bại mà không báo; tệp dữ liệu hỏng có thể bị ghi đè | Tạo phòng mà không lưu được thì trả 503 (không trả 201). `/health` báo 503 kèm lỗi. Tệp hỏng được giữ thành `rooms.json.corrupt-…`. Admin xác nhận đã xử lý tại `/api/health/ack` |
| 5.4 | Tổng duyệt chỉ là cờ | Bật hoặc tắt tổng duyệt thì lưu kỳ đang có vào lịch sử, có nhãn, rồi mở **kỳ thi mới** (mã mới, 0 điểm) |
| 5.5 | Lịch sử chỉ lưu nội dung câu: đổi đề rồi thì không biết lúc thi "A" là gì | Lịch sử đóng băng toàn bộ đề: phương án, đáp án, sai số, đơn vị, luật điểm từng vòng, chế độ Tự tin, thưởng chuỗi, cách xếp hạng. CSV lịch sử có thêm phần "ĐỀ THI LÚC THI" |
| 5.6 | Không xoá được phòng cũ, hết hạn mức số phòng | **Lưu trữ & xoá** (Admin hoặc chủ khách; MC không được; không xoá khi đang mở câu). Kết quả chuyển vào mục Lưu trữ (`/api/archive`), vẫn tải CSV được |
| UI-01 | Thanh trượt làm tròn theo k·bước tính từ 0, không từ min (min 0,1, bước 0,2 thì ra 0,2, 0,4…) | Bám lưới `min + k·bước`, làm tròn theo số chữ số thập phân của bước. Máy chủ từ chối giá trị lệch lưới. Lúc soạn, đáp án lệch lưới khi sai số = 0 bị chặn |
| UI-02 | Điện thoại và LED chỉ hiện 4 chữ số thập phân trong khi máy chủ chấm tới 9 | Hiện tới 9 chữ số thập phân |
| R1 | Ảnh Docker thiếu `practice_sample.json` | Đã chép vào ảnh. Ca `DONG_GOI` tự kiểm mọi tệp máy chủ đọc lúc chạy. Trang chơi thử có thông báo khi chưa có bộ đề |
| R2 | `test_led_media_audit.py` đọc sai mã câu | Sửa thành `room.q.qid` và ghép đôi LED trước khi thử |
| R5 | Phiên bản không ghim; bỏ qua bộ kiểm thử vì thiếu thư viện vẫn tính đạt | Ghim `node:22.12.0-alpine` và `pg 8.16.3`, `engines: node >=22`. Thêm `requirements-test.txt` và CI `.github/workflows/kiem-thu.yml`. Thêm `node test/run-all.js --nghiem-thu`: không bỏ qua, không chạy lại. Đường dẫn Chrome cấu hình được bằng `CHROME_PATH` |
| R6 | docker-compose chỉ chạy được trên VPS gdata | Thêm `docker-compose.portable.yml` (Caddy tự cấp HTTPS) kèm hướng dẫn quyền thư mục dữ liệu. Bản cũ ghi rõ là bản riêng cho VPS gdata |
| R7 | Tài liệu lệch | Cập nhật số bộ kiểm thử trong README. `HUONG_DAN_POSTGRES_RENDER.md` ghi rõ là tài liệu cũ (V3.1) |

### Tài khoản khách tự vận hành (mới)

- **UDIKA (Admin)** cấp tài khoản khách ở `/admin`. Gói gồm ba con số:
  - số phòng cùng lúc;
  - số sĩ tử mỗi phòng;
  - hạn dùng.

  Admin cũng gia hạn, đổi gói, khoá và cấp lại mật khẩu ở đây.
- **Khách** dùng `/khach` để:
  - tạo phòng kèm MC;
  - đổi hoặc thu hồi MC (MC cũ bị ngắt ngay);
  - tự điều khiển phòng của mình;
  - dùng kho đề riêng;
  - tải báo cáo;
  - lưu trữ và xoá phòng.
- **Máy chủ kiểm mọi hạn mức.** Dữ liệu giữa các khách tách biệt hoàn toàn, kể cả khi MC trùng tên.
- **Hết hạn:** không tạo phòng và không mở màn điều khiển mới; vẫn tải báo cáo, xem lưu trữ, dọn phòng.
- **Bị khoá:** người đang điều khiển bị ngắt; vẫn tải báo cáo cũ.
- **Chạy nhiều nút (`router.js`):**
  - Sổ tài khoản khách nằm ở nút 0. Router chép sang các nút khác mỗi 5 giây và ngay sau mỗi lần Admin sửa.
  - Hạn mức số phòng tính trên toàn cụm.
  - MC ở nút khác dùng kho đề qua danh tính do router ký. Mọi thông tin chuyển giữa các nút đều ký HMAC bằng `SESSION_SECRET`.
- **Hướng dẫn cho khách:** `HUONG_DAN_KHACH_TU_VAN_HANH.md`.

### Tự rà soát độ ổn định (rút kinh nghiệm Kahoot)

Phản ánh hay gặp với Kahoot:
- "trả lời rồi mà không được tính";
- mạng chậm bị chấm sai;
- bấm nhầm hai lần là nhảy câu;
- sập máy chủ là mất điểm.

Phần dưới kiểm các tình huống đó **tự động**, rồi đối soát bằng số liệu, không chỉ nhìn bằng mắt.

**1. Diễn tập một buổi thi có sự cố** (`test/test-dien-tap-on-dinh.js`, đã có trong `run-all`).

Kịch bản:
- 300 sĩ tử, 12 câu nhiều dạng.
- Sĩ tử gửi bài cả lúc sát giờ; khoảng 5% gửi trễ, khoảng 6% bấm gửi hai lần, khoảng 8% rớt mạng giữa câu rồi vào lại.
- MC bấm trùng MỞ CÂU, CÔNG BỐ, CÂU KẾ TIẾP, và đổi luật điểm giữa câu.
- Giữa câu 7, máy chủ bị **kill -9**.

Cuối buổi, đối soát **từng bài** với báo cáo CSV của máy chủ, theo 8 điều kiện:
1. Không mất bài nào đã báo "đã nhận".
2. Không tính bài trễ hoặc bài bị từ chối.
3. Bấm gửi hai lần chỉ tính một lần.
4. Tổng điểm bằng tổng điểm các câu; số câu đúng bằng số dấu ✔.
5. Chấm đúng/sai khớp đáp án.
6. Hạng xếp đúng thứ tự.
7. Báo cáo đủ người.
8. Máy chủ khoẻ và nhật ký không có lỗi chương trình.

**Kiểm chứng bài thử bắt được lỗi thật.** Làm hỏng có chủ đích một bản sao máy chủ: cho máy chủ báo "đã nhận" mà không ghi nhật ký. Bài diễn tập **báo KHÔNG ĐẠT** ngay, chỉ đúng từng sĩ tử bị mất bài ở câu 7 sau khi sập.

**2. Đo độ ổn định** (`node test/do-on-dinh.js 5 3`, kết quả ghi trong `KET_QUA_DO_ON_DINH.txt`).

- 13 bộ kiểm thử lõi, mỗi bộ chạy **5 vòng**; mỗi lần chạy đúng một lần, không chạy lại.
- Thêm **3 buổi diễn tập**, mỗi buổi một kịch bản ngẫu nhiên khác nhau.

Lần đo đầu (bản lưu: `bang_chung_kiem_dinh/do_on_dinh_vong1_truoc_khi_sua_test.txt`):
- 12/13 bộ ổn định 5/5.
- Bộ "độ tin cậy" đạt 4/5. Nguyên nhân là **lỗi của bài kiểm thử**, không phải của sản phẩm: bài thử chỉ bắt đầu chờ gói trạng thái *sau* khi nhận gói "joined", trong khi máy chủ có thể gửi gói trạng thái trước. Điện thoại thật xử lý được cả hai thứ tự.
- Bộ "tính năng V14" có cùng kiểu lỗi chờ hụt; lỗi này lộ ra ở lần chạy nghiệm thu đầu.
- Đã sửa cả hai bài thử, rồi chạy lại mỗi bộ 10 lần: đạt 10/10.
- Đo lại toàn bộ sau khi sửa: **13/13 bộ lõi ổn định 5/5**, 3/3 buổi diễn tập đạt (xem `KET_QUA_DO_ON_DINH.txt`).
- 3/3 buổi diễn tập đạt. Mỗi buổi đối soát khoảng 3.300 bài nộp, khoảng 3.120 bài đã báo nhận; **0 bài mất, 0 bài tính nhầm**.

**3. Nghiệm thu nghiêm ngặt** (`node test/run-all.js --nghiem-thu`, kết quả ghi trong `KET_QUA_NGHIEM_THU.txt`).
- **36/36 bộ đạt**, gồm diễn tập và 2 bộ tải.
- Mỗi bộ chạy đúng một lần, không chạy lại, không bỏ qua.

**4. Chặn thao tác nhầm của MC.** Bật/tắt Tổng duyệt nay đặt lại điểm, nên màn MC hỏi xác nhận trước và nói rõ điều gì sẽ xảy ra.

Các thao tác bị máy chủ từ chối:
- bấm MỞ CÂU lần hai;
- bấm CÂU KẾ TIẾP khi chưa công bố;
- đổi luật điểm giữa câu.

Bấm CÔNG BỐ hai lần không gây hại.

### Chưa làm / chưa kiểm được

> Cập nhật chiều 25/11: thanh toán tự động, khách tự đổi mật khẩu, PostgreSQL thật đã làm/kiểm ở **mục 6g**; phần còn lại xem 6g.

- **Thanh toán tự động**, hoá đơn, tự gia hạn: chưa có. UDIKA gia hạn bằng tay.
- Khách **chưa tự đổi được mật khẩu** của mình; Admin cấp lại.
- **Cụm nhiều nút:** hai yêu cầu tạo phòng gửi cùng lúc có thể vượt hạn mức số phòng thêm 1. Kiểm "đã đủ số sĩ tử" là theo từng phòng nên không bị ảnh hưởng.
- **Chưa dựng thử ảnh Docker** ở đây (máy không có Docker). CI có bước `docker build` nhưng chưa chạy.
- **Chưa tạo `package-lock.json`**: máy này không có mạng tới npm. Cần chạy `npm install` trên máy có mạng rồi commit tệp khoá.
- **Chưa thử** PostgreSQL thật, điện thoại thật, Wi-Fi hội trường.

## 6f. Rà soát lại toàn bộ trên bản giải nén sạch (25/11, trưa)

Bản rà soát là gói `UDIKA_KHOA_BANG_V15.zip` mà khách gửi lại, trùng khớp từng byte với bản đã bàn giao (SHA-256 `ab2f1a33…`). Gói được giải nén vào thư mục mới, chạy `node test/run-all.js --nghiem-thu` như trên một máy mới. Sau đó đối chiếu lại các yêu cầu từ hôm qua tới nay.

**Lỗi tìm thấy và đã sửa**

| # | Lỗi | Loại | Đã sửa |
|---|---|---|---|
| 1 | Bài kiểm "chống lộ đề" thỉnh thoảng báo sai. Mã câu ngẫu nhiên kiểu `3708…` chứa chuỗi `37` trùng với đáp án mẫu. Lần chạy trên bản sạch gặp đúng trường hợp này: 35/36 đạt. | Lỗi của bài kiểm thử, sản phẩm không lộ đề | So khớp số đứng riêng và bỏ qua mã câu. Chạy lại 12 lần: 12/12 đạt |
| 2 | MC "đặt làm màn chính" thì máy chủ gửi token cho LED **trước** khi lưu. Máy chủ sập ngay sau đó thì mất ghép đôi, LED không mở lượt được nữa. | Lỗi thật, có từ bản sáng nay | Token chỉ gửi **sau khi đã lưu bền**. Có bài thử: ghép đôi → kill -9 → khởi động lại → LED vẫn mở lượt được |
| 3 | Sửa đề (thay bộ đề, thêm, sửa, xoá câu) được báo "đã lưu" **trước** khi ghi bền. Màn MC xoá bản nháp ngay lúc nhận báo. Nếu sập máy hoặc lỗi đĩa đúng lúc đó, phần sửa mất cả trên máy chủ lẫn bản nháp. Đổi MC, sửa tài khoản khách và lưu kho đề cũng trả "OK" trước khi ghi. | Lỗi thật, đúng loại "tự lưu" mà người dùng Kahoot phàn nàn | Chỉ báo "đã lưu" sau khi ghi bền. Ghi thất bại thì báo lỗi rõ, màn MC **giữ bản nháp**; các API trả 503. Ca kiểm thử nằm trong F07 |
| 4 | Bản demo: lệnh "làm lại kỳ thi" có thể gây lỗi chương trình, vì demo thiếu hàm ghi lý do lỡ câu | Lỗi riêng bản demo | Bổ sung. Đã thử trên trình duyệt: sửa đề, làm lại, câu kế đều không lỗi |

**Kiểm thử mới thêm**
- `test/test_hanh_trinh_khach.py` thao tác hoàn toàn bằng giao diện:
  1. Admin cấp tài khoản khách.
  2. Khách tạo phòng ở `/khach` và mở màn MC.
  3. Mở màn LED trên máy khác, MC bấm ghép đôi.
  4. 3 điện thoại ghi danh qua `/join`.
  5. Câu có âm thanh: phát xong mới mở lượt, rồi sĩ tử trả lời và MC công bố.
  6. Xướng danh: LED vinh danh đúng tên thật người đứng đầu.
  7. Khách tải báo cáo.
  8. Bật Tổng duyệt, có hộp xác nhận; bấm Huỷ thì không đổi gì.
  9. Lưu trữ và xoá phòng.

  Bài thử chạy hai cấu hình: một tiến trình, và **cụm 3 tiến trình qua router.js**, trong đó phòng của khách cố ý nằm ở nút khác nút 0.
- **Thanh trượt:** thử lại trên giao diện điện thoại đúng ca F06 trong báo cáo (min 1, bước 2, đáp án 5), thêm ca min âm với bước 0,5 và ca biên phải. Cả 3 ca: giá trị chọn, giá trị hiển thị và giá trị gửi đi trùng nhau, được chấm đúng. Đáp án 0,00001 hiện đúng `0,00001` trên điện thoại và LED.

**Kết quả sau khi sửa**
- Nghiệm thu nghiêm ngặt: **38/38 bộ đạt** (`KET_QUA_NGHIEM_THU.txt`). Lần chạy trên bản sạch trước khi sửa (35/36) lưu tại `bang_chung_kiem_dinh/nghiem_thu_ban_giai_nen_sach_truoc_sua.txt`.
- Đo độ ổn định lại sau khi sửa: 13/13 bộ lõi đạt 3/3 vòng, buổi diễn tập có sự cố đạt (`KET_QUA_DO_ON_DINH.txt`).

**Yêu cầu chưa làm hoặc chưa kiểm được** (nêu rõ để không hiểu là đã xong)

> Cập nhật chiều 25/11: các mục dưới đã được làm ở **mục 6g**, trừ phần ghi "vẫn chưa kiểm được" trong bảng 6g.
- **Thử thực địa** với điện thoại thật, Wi-Fi hội trường, **PostgreSQL thật**, **dựng ảnh Docker**: máy làm việc không có các điều kiện này. Kịch bản thử nằm ở `KIEM_THU_THUC_DIA_DIEN_THOAI.md`; CI có bước dựng Docker.
- **Chưa có thanh toán tự động.** Khách chưa tự đổi được mật khẩu của mình.
- **Lộ trình giai đoạn 3–4** (lộ trình cạnh tranh mục 7): bảng điểm liên hoàn nhiều hoạt động, vai trọng tài, mẫu chương trình cho agency, chạy LAN.
- **Giới hạn kết nối** `MAX_ONLINE` mới tính theo từng tiến trình, chưa có hạn mức chung cho cả cụm.
- **LED tải lại trang giữa lúc chiếu phim vinh danh:** phim chạy lại từ đầu, chưa nhớ vị trí đang chiếu.
- **Âm thanh:** cảnh vinh danh chỉ dùng bản thu "Đánh Trống Múa Lân" của khách. Tiếng hiệu lệnh trong lúc thi (mở câu, đếm ngược, công bố) vẫn là âm thanh do phần mềm tạo ra.

## 6g. Đợt 5 – Bổ sung các việc còn mở (25/11, chiều)

Yêu cầu: làm nốt và kiểm các mục còn ghi "chưa làm / chưa kiểm được" ở 6e–6f. Bảng dưới ghi rõ **đã làm**, **đã kiểm bằng gì**, và phần **vẫn chưa kiểm được** ở máy làm việc.

| # | Việc | Đã làm | Kiểm thử | Vẫn chưa kiểm được |
|---|---|---|---|---|
| 1 | Thử với **PostgreSQL thật** | Bài thử dựng PostgreSQL 16.15 thật (initdb tạm) rồi chạy `server.js` trên đó. Kết quả: tạo bảng; kill -9 rồi chạy lại vẫn còn phòng, sĩ tử, điểm, bộ đề, tài khoản khách; CSDL **sập giữa chừng** thì MC **không** được báo "đã lưu" và `/health` trả 503; CSDL sống lại thì máy chủ tự lưu tiếp. Thêm `docker-compose.postgres.yml` và bước CI dựng ảnh kèm PostgreSQL, kill -9 container rồi kiểm phòng | `test/test-postgres-that.js` | Máy làm việc không tải được gói npm `pg`, nên câu SQL chạy qua `psql` thật (`test/_pgshim`) và **tầng giao thức của gói `pg`** chưa được chạy. CI chạy bằng gói thật (`PG_REAL=1`) |
| 1 | **Điện thoại thật, Wi-Fi hội trường** | Trang tự kiểm tra máy `/kiem-tra` (link ngay dưới nút "Vào trường thi") đo: kết nối thời gian thực, độ trễ (trung vị 8 lần, dao động), lệch giờ, lưu tạm, màn hình, giữ màn sáng. Người dùng tự thử âm thanh và gõ tiếng Việt (so theo chuẩn NFC, nhận cả chữ dạng tổ hợp). Trang cảnh báo khi mở trong Zalo, Facebook hay TikTok. Kết quả gửi về MC: màn MC hiện "🩺 Kiểm tra máy: N máy · ⚠ x" và tải được CSV từng máy | `test/test_lan_kiemtra_v15.py` (giả lập Android Chrome và iPhone trong Zalo) | **Chưa thử trên máy thật**, vì máy làm việc không có điện thoại hay Wi-Fi. Công cụ đã sẵn để thử thực địa (`KIEM_THU_THUC_DIA_DIEN_THOAI.md`) |
| 1 | **Dựng ảnh Docker** | Dockerfile đã sao chép thêm `pay.js` và `events.js`; ca DONG_GOI kiểm mọi tệp máy chủ cần đều có trong ảnh. CI có 2 bước dựng ảnh | Ca DONG_GOI trong `test/test-release-v15.js` | **Chưa dựng được ở máy làm việc**: mạng chặn kho ảnh Docker nên không tải được `node:22-alpine` và `postgres:16-alpine` |
| 2 | **Thanh toán tự động** | Bảng giá và đơn hàng. **VietQR** chuẩn EMVCo, kèm mã đơn và số tiền. Webhook báo có của **SePay/Casso** tự gia hạn gói. **VNPAY 2.1.0** và **MoMo v2** (IPN có kiểm chữ ký). Chống tính trùng một giao dịch, cộng dồn khi chuyển thiếu, ghi lại khoản trả cho đơn đã huỷ. Admin xác nhận tay khi khách chuyển sai nội dung. Khách tự đăng ký dùng thử | `test/test-thanh-toan.js` (9 ca); `test/test_thanh_toan_lien_hoan_ui.py` **giải mã ảnh QR trên màn hình** (CRC, số tiền, tài khoản, mã đơn đều đúng); webhook → trang khách tự đổi "Đã thanh toán"; Admin xác nhận tay trên giao diện | **Chưa nối tài khoản thật** của ngân hàng, SePay/Casso, VNPAY, MoMo. Đã kiểm theo tài liệu kỹ thuật, dùng máy giả lập. Trước khi bán: chạy sandbox và một lần chuyển khoản thật nhỏ. Chưa xuất hoá đơn điện tử |
| 2 | **Khách tự đổi mật khẩu** | Mục 🔑 ở `/khach`. Đổi xong, mật khẩu cũ hết dùng và mọi máy khác bị đăng xuất | Ca trong `test-thanh-toan.js` + giao diện | – |
| 3 | **Bảng điểm nhiều hoạt động + vai trọng tài** | Chương trình liên hoàn gồm đội, hoạt động có hệ số, hoạt động "quiz" (lấy điểm đội từ phòng thi, kể cả khi phòng nằm ở nút khác của cụm) và hoạt động "chấm". Trọng tài chấm trên điện thoại (`/trongtai`); sửa điểm phải ghi lý do và có nhật ký. Chủ khách khoá điểm hoặc giữ kín bảng. Màn LED `/bangdiem` tự cập nhật. Có báo cáo CSV | `test/test-lien-hoan.js` (6 ca), ca cụm trong `test/test-router.js`, giao diện điện thoại 390 px trong `test_thanh_toan_lien_hoan_ui.py` | – |
| 3 | **Chạy mạng nội bộ (LAN)** | `npm run lan`: chạy không cần Internet; tự tạo mật khẩu Admin và khoá phiên (tệp quyền 600, khởi động lại vẫn dùng lại); in địa chỉ LAN và **mã QR ngay trên dòng lệnh**. Đã giải mã thử mã QR này bằng OpenCV. Mở màn MC/LED bằng `localhost` thì QR vẫn in địa chỉ LAN. Trang Admin có thẻ LAN. Có hướng dẫn bộ phát (tắt cách ly máy khách), tường lửa, IP cố định | `test/test_lan_kiemtra_v15.py`: chặn **mọi** yêu cầu ra Internet; Admin, MC, LED, trang vào thi, trang kiểm tra không gửi yêu cầu nào ra ngoài | Chưa thử trên bộ phát Wi-Fi thật |
| 4 | **LED tải lại trang giữa phim vinh danh** | Màn LED chính báo vị trí 2 giây/lần, gồm: thời điểm phim, tạm dừng, tốc độ; với hoạt cảnh thì cảnh, vị trí đoàn rước, camera. Màn vừa vào nhận vị trí cộng thời gian đã trôi rồi **chạy tiếp**. Đang tạm dừng thì vẫn dừng đúng chỗ. MC bấm "phát lại" thì không nhảy về chỗ cũ. Màn lạ chưa ghép đôi gửi vị trí giả thì bị bỏ qua. **Sửa kèm một lỗi cũ**: MC bấm tạm dừng ngay lúc phim vừa phát (lệnh phát bị huỷ giữa chừng) thì phim tự phát lại ở chế độ tắt tiếng; nay giữ đúng trạng thái dừng | `test/test_led_resume_v15.py` (phim mp4 + hoạt cảnh, tải lại 5 lần); `test_vinhdanh_3d_v13.py`, `test-vq-control-v8.js` vẫn đạt | – |
| 5 | **Giới hạn kết nối chung cả cụm** | `CLUSTER_MAX_ONLINE` / `CLUSTER_RESERVE` ở `router.js`. Bộ định tuyến báo cho từng nút số người ở các nút khác (ký, 2 giây/lần). Người mới bị chặn khi **tổng cụm** chạm trần; người đã ghi danh mất mạng vẫn vào lại được nhờ chỗ dự phòng. `/health` của bộ định tuyến báo tổng. Bộ định tuyến mất tin quá 15 giây thì mỗi nút quay về giới hạn riêng | `test/test-gioi-han-cum.js` (3 tiến trình, trần 6) | Trong 2 giây giữa hai lần đồng bộ, các nút khác vẫn có thể nhận thêm người, nên tổng có thể vượt trần một ít. Nên đặt trần thấp hơn sức chịu thật |
| 6 | **Đẩy lên GitHub** | Thử lại: vẫn lỗi 403 vì ứng dụng Claude GitHub chưa được cài cho tổ chức Cross-Players. Đã thêm `tools/day_len_github.sh` / `.bat` để đẩy nhánh `udika-v15` từ máy của anh/chị từ tệp `udika-v15.bundle`. Kịch bản chỉ tạo hoặc cập nhật nhánh `udika-v15`, không đụng `main`, không ghi đè | Đã chạy thử kịch bản với một kho giả lập | Cần anh/chị chạy kịch bản, hoặc cài ứng dụng Claude GitHub cho tổ chức |

**Kết quả:** nghiệm thu nghiêm ngặt **45/45 bộ đạt**. Mỗi bộ chạy đúng một lần, không chạy lại, không bỏ qua; xem `KET_QUA_NGHIEM_THU.txt`. Đo độ ổn định (`test/do-on-dinh.js 3 3`, thêm 4 bộ mới vào nhóm lõi): **17/17 bộ lõi đạt 3/3 vòng**, **3/3 buổi diễn tập có sự cố đạt**; xem `KET_QUA_DO_ON_DINH.txt`. Lỗi duy nhất gặp trong lúc làm thuộc phần mới: màn LED mở bằng `localhost` ở bản chạy thường cũng đổi QR sang địa chỉ LAN. Đã sửa: chỉ đổi khi chạy chế độ LAN. Bộ `test_v14_ui.py` phát hiện lỗi này.

## 6h. Đợt 6 – Bổ sung 10 hình thức trả lời câu hỏi (25/11, chiều)

Yêu cầu: giữ nguyên giao diện, màu sắc, bố cục, luật mặc định; chỉ thêm hình thức trả lời và cơ chế tương tác; dùng chung hệ thống điểm / thời gian / đồng bộ; tương thích ngược dữ liệu cũ. Làm và kiểm theo 3 giai đoạn. Hướng dẫn chi tiết: `HUONG_DAN_HINH_THUC_TRA_LOI.md`.

**Rà trước khi sửa:**
- **Đã có sẵn:** trắc nghiệm 2–4 phương án, chọn nhiều, gõ chữ, nhập số, sắp xếp 3–6 mục, khảo sát, thanh trượt, ảnh làm phương án, ×0/×1/×2, thưởng chuỗi, Tốc độ/Chính xác theo vòng, giữ bảng điểm, số người đã trả lời, thống kê tỷ lệ, thời gian riêng từng câu, ghi chú giải thích.
- **Thiếu, đã bổ sung** gồm các phần trong bảng dưới.

| Giai đoạn | Đã làm | Kiểm thử |
|---|---|---|
| 1 | **Trắc nghiệm 2–6 phương án**: ô E/F dùng 2 màu mới cùng tông, hình ★ ⬟. **Chọn nhiều 2–6 phương án**. **Đúng – Sai**: chọn riêng trong ô Dạng câu, ô ✔/✘ trên điện thoại. **Viết câu trả lời + MC duyệt tay**: chấp nhận hoặc bỏ chấp nhận một cách viết cho mọi người, có ghi nhật ký. **Bình chọn giữ kín tới khi MC công bố**: LED, điện thoại và cả gói cập nhật nhỏ đều không lộ số. **Chọn hình ảnh**: chọn riêng trong ô Dạng câu, một hoặc nhiều ảnh đúng | `test/test-dang-cau-moi.js`, `test/test_dang_cau_moi_ui.py` |
| 2 | **Điền ô chữ**: tự tạo ô theo từ khoá, MC bấm ô để đặt chữ gợi ý, có dấu hoặc không dấu, chữ cùng một từ không bị tách dòng, gõ thiếu chữ được nhắc ngay trên máy. **Sắp xếp 3–8 mục**. **Ước lượng con số càng gần càng nhiều điểm**: 50–100% trong khoảng sai số. **Ghép cặp 3–6 cặp**: chạm trái rồi phải, sửa được, chấm theo số cặp đúng, không dùng thư viện kéo nối | như trên |
| 3 | Cơ chế riêng từng câu: **×3**, **điểm tối đa** 100–5000, **tốc độ / điểm cố định**, **không thưởng chuỗi**, **câu quyết định khi bằng điểm** (không cộng tổng, chỉ xếp hạng khi bằng điểm), **không tự hiện bảng xếp hạng**, **hiệu ứng vượt hạng** (▲ trên LED, "🚀 vượt lên … hạng" trên điện thoại, có thể tắt từng câu; tôn trọng chế độ giảm chuyển động). **👁 Xem trước** câu đang soạn trên giao diện điện thoại & LED thật. Ảnh **tự ẩn sau N giây** cho trò ghi nhớ. **11 câu mẫu trò chơi** dựng bằng các dạng cốt lõi. **Nhập Excel/CSV/Word** cho dạng mới | như trên + ca nhập CSV |

**Tương thích ngược**
- Dữ liệu cũ không cần chuyển đổi; mọi trường mới đều không bắt buộc.
- Trước khi sửa, đã chụp bộ đề sau chuẩn hoá của `questions.json`, bộ chơi thử và 10 câu đủ 8 dạng cũ (`test/fixtures/de_cu_chuan_hoa_truoc_dot6.json`). Sau khi sửa, kết quả so khớp **giống hệt từng trường**.
- Công thức điểm của câu cũ giữ nguyên. Các bộ kiểm thử điểm cũ vẫn đạt, không đổi số liệu.
- Báo cáo CSV của câu cũ in như trước; chỉ câu có tuỳ chọn mới mới ghi thêm.

**Chỉnh 2 bài kiểm thử cũ (do giới hạn thay đổi theo yêu cầu, không phải do lỗi)**
- `test-audit-v15.js` QF03/QF04: "5 lựa chọn bị báo lỗi" đổi thành "7 lựa chọn bị báo lỗi" và "sắp xếp 9 mục bị báo lỗi". Nguyên tắc **vượt giới hạn thì báo lỗi, không tự cắt** vẫn giữ.
- `test-v14-features.js`: thông báo "3–6 mục" đổi thành "3–8 mục".
- Dạng "Ghép cặp" trong CSV trước đây bị báo "chưa hỗ trợ". Nay dạng này được nhận; nếu sai dạng thì báo lỗi rõ. Dạng lạ khác vẫn báo "chưa hỗ trợ".

**Lỗi tự phát hiện trong lúc làm (đã sửa trước khi bàn giao)**
- Ghép cặp: chạm lại vào mục bên trái đang được tự chọn sẽ **bỏ chọn**, khiến cú chạm tiếp theo bị báo "chạm mục bên trái trước". Nay chạm mục bên trái luôn là chọn.
- LED hiện "CÂU 5/10 · undefined" với dạng câu mới. Đã thêm tên dạng; bài thử giao diện kiểm mọi câu không còn chữ undefined/null.
- Khung xem trước nằm sau đoạn mã của trang, gây lỗi JavaScript trên màn MC. Bộ kiểm thử giao diện cũ phát hiện; đã chuyển khung lên trước.

**Kết quả:** nghiệm thu nghiêm ngặt **47/47 bộ đạt** (`KET_QUA_NGHIEM_THU.txt`). Đo ổn định: **18/18 bộ lõi đạt 3/3 vòng** (gồm bộ dạng câu mới), **3/3 buổi diễn tập có sự cố đạt** (`KET_QUA_DO_ON_DINH.txt`). Ảnh chụp giao diện: `bang_chung_kiem_dinh/dot6_hinh_thuc_tra_loi/`.

**Chưa làm / giới hạn**
- **Ghép cặp** chỉ nhận chữ và emoji, chưa nhận ảnh cho từng vế.
- **Duyệt tay** chỉ áp dụng cho dạng Viết câu trả lời, khi thi trực tiếp (chưa áp dụng cho bài tự làm). Duyệt tay không tính lại chuỗi đúng liên tiếp.
- **Hiệu ứng vượt hạng** so với lần công bố trước mà màn LED/điện thoại đó đã thấy. Màn vừa mở hoặc vừa tải lại sẽ không hiện ▲ ở lần công bố đầu.
- Chưa thử trên điện thoại thật: gõ tiếng Việt bằng Laban Key/Gboard thật cho ô chữ, chạm ghép cặp trên màn nhỏ. Đã thử trên Chromium giả lập 390 px.

## 6i. Giao diện "Trạng nguyên dân gian" (25/11, chiều)

Yêu cầu: giao diện ấn tượng, đúng chất Trạng nguyên dân gian. Anh/chị đã chọn làm **cả 4 khu vực** (điện thoại, LED, trang chủ, MC/quản trị) theo hướng **giữ bố cục, đổi chất liệu**.

**Đã làm:** thêm một lớp chất liệu riêng, `public/dan-gian.css`, nạp sau CSS cũ. Không sửa cấu trúc HTML, vị trí nút hay luồng thao tác; bỏ dòng `<link>` tới tệp này là trở về giao diện cũ.
- **Nền:** sơn mài xanh lục điểm bụi vàng, với **mặt trống đồng** chìm phía sau gồm ngôi sao 14 cánh, các vành răng cưa, vòng tròn có chấm và chim Lạc. Hoạ tiết được vẽ mới bằng hình học (`public/assets/dangian/trong-dong.svg`), không dùng chữ Hán hay ảnh có bản quyền.
- **Thanh đầu trang:** dải **diềm** răng cưa và vòng tròn chấm giữa, nền sơn son.
- **Khối nội dung tối** (bảng vàng, khung MC, thẻ quản trị): **khung gỗ sơn son thếp vàng**, có góc khung thếp vàng; tiêu đề chữ có chân, màu **thếp vàng**.
- **Thẻ sáng** (câu hỏi trên điện thoại, ô ghi danh, thẻ vào thi ở trang chủ, chơi thử): nền **giấy dó** có sợi giấy, viền kép thếp vàng.
- **Nút:** nút chính **vàng lá**, có độ nổi khi bấm; nút thường bằng gỗ sơn son viền vàng; nhãn "SĨ TỬ DỰ THI" thành **con dấu son**.
- **Ô đáp án:** kiểu **tranh in khắc gỗ**, với viền mực, hạt giấy, ấn nổi và biểu tượng trong vòng tròn giấy. Màu nhận diện của từng ô giữ nguyên.
- **Đồng hồ:** đặt trên mặt trống đồng.
- **Màn LED:** sân khấu đặt trong **khung gỗ sơn son thếp vàng**; tranh bên trong giữ nguyên.
- Bản demo một trang nhúng sẵn các hoạ tiết nên chạy được không cần mạng.

**Kiểm thử:** nghiệm thu nghiêm ngặt **47/47 bộ đạt** sau khi đổi; không có lỗi JavaScript. Ảnh trước/sau nằm trong `bang_chung_kiem_dinh/giao_dien_dan_gian/` (`ss_*.png` là ảnh ghép trước/sau).
- Đã sửa 1 bài kiểm thử theo thiết kế mới: `test_theme_mobile.py` trước kiểm "khung sân thi xanh ngọc", nay kiểm khung **sơn son**.
- Phát hiện và sửa một lỗi do viền dày hơn: trên màn 320 px, ảnh trong lưới 2×2 hẹp còn 139 px (yêu cầu ≥140). Đã giảm viền riêng cho ô ảnh.

**Giới hạn**
- Chưa có phông chữ thư pháp Việt: máy làm việc không tải được phông mới. Tiêu đề dùng phông có chân sẵn có (Lora), tô thếp vàng.
- Biểu tượng emoji đứng trước tiêu đề thếp vàng cũng bị tô vàng thành hình bóng; tôi để như vậy vì nhìn giống hoạ tiết thếp.
- Chưa xem trên màn LED và điện thoại thật; chỉ xem trên Chromium.

## 7. Còn lại và giới hạn

- **Ảnh "đặt trong ô" (Place in Cell) của Excel 365** chưa đọc được; dùng ảnh nổi như tệp mẫu.
- **Giai đoạn 3–4 của lộ trình**: đã làm bảng điểm nhiều hoạt động, trọng tài và chạy LAN (mục 6g). **Chưa làm**: dự án/mẫu chương trình dùng lại cho agency.
- **Chưa thử** trình duyệt và điện thoại thật ở quy mô lớn, Wi-Fi tại địa điểm, TLS, PostgreSQL thật **dưới tải lớn** (đã chạy chức năng trên PostgreSQL 16 thật – mục 6g). Kịch bản thử: `KIEM_THU_THUC_DIA_DIEN_THOAI.md`, công cụ `/kiem-tra`.
- **Cổng thanh toán** chưa nối tài khoản thật (mục 6g).
