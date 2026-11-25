# UDIKA Khoa Bảng V14: báo cáo sửa lỗi và tiêu chí nghiệm thu

Báo cáo này đối chiếu từng mục trong báo cáo kiểm định "3.000 người" với phần đã sửa trong V14 và bài kiểm thử tương ứng. Tất cả kết quả dưới đây là **số đo thật**, chạy trên một máy chủ Node (2 nhân CPU) với tải giả lập trên cùng máy, qua `ws://`. Chưa đo trên hạ tầng thật: xem mục 4.

## 1. Hai lỗi đã tái hiện: đã sửa

| Lỗi | Nguyên nhân | Cách sửa | Kiểm thử chứng minh |
|---|---|---|---|
| **A. Đáp án câu 1 bị tính vào câu 2** | Tin trả lời chỉ có "chọn A", máy chủ chấm theo câu đang mở lúc nhận được tin. | Mỗi tin trả lời mang đủ 3 mã: **mã kỳ thi** (`eid`, đổi khi làm lại hoặc thay đề), **mã câu hỏi** (`qid`, mới cho mỗi lần mở câu) và **mã lần gửi** (`sid`, do điện thoại tạo). Sai mã kỳ thi, sai mã câu, câu đã đóng hoặc thiếu mã thì máy chủ **từ chối rõ ràng** (`answer_rejected`) và điện thoại hiện lý do. | `test/test-v14-reliability.js`: giữ đáp án câu 1, gửi khi đang ở câu 2 → bị từ chối, câu 2 không có bài, điểm 0. Gửi thiếu mã hoặc mã kỳ thi cũ → bị từ chối. |
| **B. Đã báo nhận nhưng mất điểm khi tiến trình dừng đột ngột** | Báo "đã nộp" ngay khi nhận bài, còn việc lưu xuống đĩa thì đợi gộp lô 400 ms. | **Nhật ký ghi trước**: bài nộp được ghi vào `DATA_FILE.journal` (ghi nối tiếp + `fdatasync`) hoặc bảng `udika_journal` (PostgreSQL). **Chỉ khi ghi xong** máy chủ mới gửi "đã lưu bài nộp". Khi khởi động, máy chủ nạp bản lưu toàn phòng rồi phát lại nhật ký. Nếu ghi lỗi thì không báo nhận, huỷ bài và yêu cầu điện thoại gửi lại. Ghi danh cũng đi qua nhật ký. | `test-v14-reliability.js`: báo nhận xong thì `kill -9` sau 17 ms, lúc bản lưu toàn phòng chưa có bài → khởi động lại vẫn đủ điểm. Bật `FAIL_JOURNAL=1` (mô phỏng đĩa lỗi) → không báo nhận, không cộng điểm. |

## 2. Các hạng mục vận hành 3.000 người (mục 4 của báo cáo kiểm định)

| Hạng mục | Đã làm trong V14 |
|---|---|
| **Giới hạn người chơi** | Tách hai giới hạn: `MAX_PLAYERS` cho mỗi phòng (mặc định 3.000) và `MAX_ONLINE` cho tổng số điện thoại đang kết nối toàn máy chủ (mặc định 3.500). Khi đầy, máy báo "máy chủ đang quá tải – thử lại sau". |
| **Nhận và lưu đáp án** | Đúng kỳ thi, đúng câu. Gửi lại cùng mã lần gửi thì được xác nhận lại, không tính trùng. Gửi lần khác cho câu đã nộp thì bị từ chối ("chỉ tính lần đầu"). Xác nhận chỉ gửi sau khi lưu bền. Có thêm 1,5 giây ân hạn cho độ trễ mạng, điểm vẫn tính theo thời gian tối đa của câu. |
| **Kết nối lại** | Điện thoại vào lại phòng bằng danh tính cũ, nhận đồng bộ trạng thái **xong rồi mới** gửi lại bài đang chờ (nếu còn hợp lệ). Bài chờ được giữ cả khi tải lại trang (`sessionStorage`). Vào lại giữ nguyên danh tính, điểm, đội và chuỗi. |
| **Tránh dồn kết nối** | Nối lại theo khoảng chờ tăng dần từ 0,7 đến 15 giây, có độ lệch ngẫu nhiên ±40%. Hai tab cùng một người: tab cũ nhận thông báo "đang thi ở tab khác" và **dừng hẳn**, không tự nối lại nên hai tab không đẩy nhau qua lại. Có nút "Tiếp tục ở tab này". |
| **Kết nối chậm hoặc chết** | Máy chủ gửi ping mỗi 15 giây, ngắt kết nối im lặng quá 45 giây. Bật `TCP keepalive` và `noDelay`. Máy có hơn 2 MB dữ liệu chờ gửi (mạng quá yếu) bị ngắt để không dồn bộ nhớ, máy đó sẽ tự nối lại và đồng bộ. **Sửa lỗi đóng WebSocket:** máy chủ trả khung `close` đúng chuẩn trước khi đóng, xử lý sự kiện `end`, và khi tắt máy chủ thì gửi mã 1001 cho mọi kết nối. |
| **Giữ kín kết quả** | Khi câu còn chạy, điện thoại chỉ nhận "đã lưu bài nộp" kèm thời gian. Đúng/sai, điểm, thưởng chuỗi và chuỗi hiện tại đều không được gửi, kể cả khi vào lại giữa câu: điểm hiển thị là điểm trước câu này. Tất cả chỉ lộ ra khi công bố. Riêng chế độ tự làm bài vẫn chấm ngay, đúng luật của chế độ đó. |
| **Bảng điều khiển MC** | Hiện riêng **đã ghi danh / đang trực tuyến / đã nộp**. Khi chỉ đổi số bài, máy chủ gửi gói số liệu nhỏ (`presence`, vài trăm byte) thay vì cả danh sách 3.000 người và bộ đề. Danh sách đầy đủ chỉ gửi lại khi có người vào/ra, tối đa 3 giây một lần. |
| **Máy chủ khởi động lại giữa câu** | Câu đang mở được **tiếp tục**, không bị cắt. Thời gian gián đoạn được cộng bù vào đồng hồ, coi như tạm dừng. Mỗi lệnh MC được lưu ngay lập tức. |

## 3. Kết quả đo (chạy thật, máy 2 nhân CPU)

| Bài kiểm thử | Kết quả |
|---|---|
| `node test/load-multi.js 2000,500,500 3` (3 phòng cùng lúc; 30% nộp dồn trong 1,3 giây cuối; 20% điện thoại rớt mạng giữa câu rồi vào lại) | Ghi danh 3.000/3.000 trong 3,7 giây. 9.000/9.000 bài được xác nhận đã lưu. Phản hồi p50 ≈ 10 ms, p95 ≤ 27 ms. 1.753 lượt rớt mạng – vào lại. **Số câu đúng của 3.000/3.000 người khớp tuyệt đối, 0 sai lệch.** 3.000/3.000 kết nối đóng đúng chuẩn. RAM ≈ 160 MB. |
| `node test/load-test.js 3000 3` (1 phòng 3.000 người) | 3.000/3.000 nhận đề, nộp bài và nhận kết quả. Xác nhận lưu p95 ≈ 17 ms. Độ chính xác 3.000/3.000. Đóng kết nối 3.000/3.000 đúng chuẩn. |
| `node test/test-v14-reliability.js` | 6/6 đạt: lỗi A, lỗi B, câu đang mở được tiếp tục sau khởi động lại, đĩa lỗi không báo nhận, gửi lại không tính trùng, vào lại giữ điểm. |
| `python3 test/test_v14_net_ui.py` (Chrome thật) | Mất mạng đúng lúc bấm → giữ bài, có mạng thì tự gửi lại và được lưu. `kill -9` máy chủ giữa câu → điện thoại và MC tự nối lại, câu vẫn mở, không mất điểm cũ. Hai tab không đẩy nhau. |
| Các bài khác | `test-v14-features.js` (20), `test-v14-auto-reveal.js` (3), `test_v14_ui.py` (17), `test_vinhdanh_3d_v13.py` (13) cùng toàn bộ bài kiểm thử V5–V13: đạt. |

Hai bài `test_integration.py` và `test_ceremony_v4.py` đã được cập nhật theo giao thức mới (mã kỳ thi, mã câu, mã lần gửi; giữ kín kết quả) nhưng **chưa chạy được** trong môi trường này vì thiếu thư viện Python `websocket-client`. Muốn chạy thì cài `pip install websocket-client`.

## 4. Chưa thể nghiệm thu từ đây: cần làm trên hạ tầng thật

Các bước 2–4 trong mục 5 của báo cáo kiểm định vẫn cần làm, vì kết quả trên chỉ đo trong một máy:
1. Chạy lại `test/load-multi.js` trên **máy chủ và PostgreSQL dự kiến dùng**. Máy tạo tải đặt ở nơi khác, đi qua **WSS**: sửa biến `url` hoặc `port`, hoặc đặt sau proxy TLS.
2. Thử đủ thời lượng chương trình, có nhiều phòng chuyển câu đồng thời. Có thể dùng `node test/load-multi.js 2000,500,500 20`.
3. Kiểm tra Wi-Fi hội trường với 2.000 điện thoại. Việc này tách biệt với khả năng chịu tải của máy chủ.
4. **Không chạy nhiều bản sao máy chủ cho cùng một sự kiện.** V14 giữ trạng thái phòng trong bộ nhớ của một tiến trình. Hãy dùng **một** bản sao đủ mạnh, ví dụ Render "1 instance", **tắt autoscale**. Nếu dùng bộ cân bằng tải thì phải đưa mọi kết nối của một phòng về cùng một máy. Muốn chạy nhiều bản sao thì cần làm thêm lớp trạng thái dùng chung và khoá quyền điều khiển phòng.
5. Khi dùng tệp làm nơi lưu (không có `DATABASE_URL`): ổ đĩa phải là ổ bền (Render cần Persistent Disk). Ảnh và video tải lên cho câu hỏi cũng nằm trên ổ này (`MEDIA_DIR`).

## 5. Lệnh chạy lại

```
npm test                    # smoke
npm run test:reliability    # lỗi A, lỗi B, khởi động lại, đĩa lỗi
npm run test:v14            # dạng câu mới, đội, chặn tên, tự làm bài, kho đề, ảnh/video
npm run test:autoreveal     # tự công bố đáp án
npm run test:load3000       # 1 phòng 3.000
node test/load-multi.js 2000,500,500 3
python3 test/test_v14_ui.py ; python3 test/test_v14_net_ui.py   # cần Playwright + Chrome
```
