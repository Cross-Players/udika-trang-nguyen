# UDIKA V15 – Kiến trúc mở rộng tới 1.000.000 người dùng đồng thời

**Mục tiêu:** tổng 1.000.000 người cùng truy cập, chia thành nhiều phòng, **mỗi phòng tối đa 6.000 người**.

**Phân định rõ:**
- Phần **đã đo** là các con số ghi trong mục 4. Chúng được đo trên máy thử 2 nhân CPU, 8 GB RAM.
- Con số 1.000.000 là **mục tiêu thiết kế**. Muốn công bố đạt mục tiêu này phải thử tải trên chính hạ tầng triển khai, theo mục 5.

## 1. Nguyên tắc

1. **Mỗi phòng thuộc trọn một tiến trình `server.js`**, gọi là một *nút*.
   - Mọi thao tác chấm điểm, xếp hạng và phát trạng thái của phòng diễn ra trong bộ nhớ của nút đó.
   - Không cần khoá phân tán hay đồng bộ giữa các máy cho từng câu trả lời.
2. **Mã phòng quyết định nút.** Nút giữ phòng có `mã phòng % NODE_COUNT = NODE_INDEX`. Nút tự sinh mã thoả quy tắc này khi tạo phòng.
3. **`router.js` không giữ trạng thái thi.**
   - Router đọc mã phòng trong đường dẫn (`/ws?pin=…`, `/api/rooms/<mã>/…`, `/host?pin=…`) rồi nối thẳng tới nút.
   - Vì vậy có thể chạy bao nhiêu router song song cũng được, phía sau một bộ cân bằng tải L4 hoặc DNS.
4. **Các việc cần nhìn toàn cục được router gom từ mọi nút:** danh sách phòng của Admin, kiểm tra sức khoẻ, kho đề (đặt ở nút 0).
5. **Độ bền dữ liệu giữ nguyên ở từng nút.** Bài nộp được ghi vào nhật ký trước rồi mới báo "đã nhận".
   - Với PostgreSQL: mỗi nút có bảng nhật ký `udika_journal_n<i>` và một dòng ảnh chụp riêng.
   - Một nút chết thì router khởi động lại nút đó (khi chạy cùng máy) và phòng được khôi phục từ nhật ký.

```
 Điện thoại / LED / MC ──HTTPS/WSS──► Caddy / LB (L4) ──► router.js × R (không trạng thái)
                                                           │  mã phòng % N
                                   ┌──────────────┬────────┴─────┬──────────────┐
                                   ▼              ▼              ▼              ▼
                              server.js #0   server.js #1   …   server.js #N-1
                              (phòng …0)     (phòng …1)         (phòng …N-1)
                                   └──────────────┴── PostgreSQL (mỗi nút 1 bảng nhật ký) ─┘
                                   Ảnh/âm thanh: thư mục dùng chung (NFS) hoặc kho đối tượng + CDN
```

## 2. Định cỡ cho 1.000.000 người

Định cỡ dựa trên số đo ở mục 4 và **cộng thêm biên an toàn**. Phải xác nhận lại bằng thử tải trên máy thật.

| Thành phần | Ước lượng | Cách tính |
|---|---|---|
| Số phòng | ≈ 170 phòng × 6.000 | 1.000.000 / 6.000 |
| Nút `server.js` | 1 nút giữ ~20.000–30.000 kết nối, tức 3–5 phòng đầy → **35–50 nút** | Đo được: 1 nút ≈ 9.000 kết nối, RAM ~300 MB, phản hồi p95 < 60 ms trên máy thử 2 nhân |
| Máy chủ ứng dụng | 8 nhân / 16 GB, chạy 6–8 nút/máy → **6–8 máy** | Chừa 1–2 nhân cho router, hệ điều hành và TLS |
| Router | 1 router chuyển tiếp ~20.000–40.000 kết nối, giữ 2 file descriptor mỗi kết nối → **30–50 tiến trình**, chạy cùng các máy trên | Router chỉ nối luồng TCP |
| Bộ cân bằng tải / TLS | Cân bằng tải L4 hoặc 2–4 máy Caddy | Giải mã TLS cho 1 triệu kết nối WebSocket tốn CPU đáng kể |
| PostgreSQL | 1 máy chủ mạnh (hoặc dịch vụ có quản lý) | Ghi nhật ký theo lô ~15 ms; mỗi bài nộp chỉ 1 dòng |
| Băng thông lúc công bố | ≈ 1 triệu × ~2–3 KB ≈ 2–3 GB mỗi lần công bố, rải trong 1–2 giây | Bản V15 đã bỏ danh sách tên người chơi khỏi gói tin gửi điện thoại |

**Giới hạn hệ điều hành:** `ulimit -n` ≥ 1.048.576 (đã có trong `docker-compose.yml`) và `deploy/sysctl-udika.conf`. Nếu không đặt, Linux mặc định chỉ cho khoảng 1.024 kết nối mỗi tiến trình.

## 3. Triển khai nhiều máy

1. Trên **máy i** (i = 0…M−1), mỗi máy chạy K nút. Tổng số nút N = M×K.
   ```
   NODE_INDEX=<chỉ số toàn cục> NODE_COUNT=<N> PORT=4000+k DATABASE_URL=… MEDIA_DIR=/mnt/shared/media node server.js
   ```
2. Trên mỗi máy chạy thêm 1–4 router với **cùng một danh sách** `NODES` (thứ tự = NODE_INDEX):
   ```
   NODES=http://10.0.0.11:4000,http://10.0.0.11:4001,…,http://10.0.0.18:4007 PORT=3000 node router.js
   ```
3. Bộ cân bằng tải chia đều kết nối tới mọi router. Router nào cũng định tuyến đúng nút theo mã phòng.
4. **Không đổi `NODE_COUNT` khi đang có phòng hoạt động.** Mã phòng đã gắn với nút cũ. Chỉ thêm máy vào giữa hai sự kiện.

## 4. Số đo thực tế (máy thử 2 nhân CPU, 8 GB RAM, Node 22)

| Bài thử | Kết quả | Tệp |
|---|---|---|
| 1 phòng 6.000 người, 1 tiến trình | 6.000/6.000 ghi danh, nộp bài và đối chiếu điểm khớp; phát đề p95 ≈ 220 ms, công bố p95 ≤ 376 ms; RAM 182 MB | `KET_QUA_KIEM_THU_6000.txt` |
| 2.000 + 500 + 500, 1 tiến trình, có dồn bài sát giờ và mất mạng | 9.000/9.000 bài lưu, 0 sai lệch | `KET_QUA_KIEM_THU_NHIEU_PHONG.txt` |
| 6.000 + 2.000 + 1.000 qua router, 2 nút | 27.000/27.000 bài, 5.468 lượt mất mạng rồi vào lại, 0 sai lệch, p95 ≤ 59 ms | `KET_QUA_KIEM_THU_ROUTER_9000.txt` |
| **18.000 kết nối**: 6.000 + 6.000 + 3.000 + 2.000 + 1.000, 2 router, 2 nút | 54.000/54.000 bài, 10.662 lượt mất mạng rồi vào lại, 0 sai lệch, p95 ≤ 170 ms, tối đa 434 ms, RAM tổng 868 MB | `KET_QUA_KIEM_THU_ROUTER_18000.txt` |
| **36.000 kết nối**: 6 phòng × 6.000 người, 3 nút, 4 router, 2 tiến trình phát tải | **108.000/108.000 bài lưu**, 21.679 lượt mất mạng rồi vào lại, **0 sai lệch**, 0 lỗi đóng kết nối; phản hồi p95 0,65–1,7 giây (CPU bị chia cho 9 tiến trình); RAM máy chủ 1,7 GB | `KET_QUA_KIEM_THU_CUM_36000.txt` |
| Thử 50.000 kết nối | **Không hoàn thành**: một tiến trình phát tải bị dừng vì máy thử hết RAM (8 GB dùng chung cho cả công cụ thử và máy chủ). 32.000 kết nối còn lại chạy hết với 0 sai lệch, nhưng ~3% bài bị từ chối vì quá giờ do CPU quá tải. **Không tính là đạt** | `KET_QUA_KIEM_THU_CUM_50000.txt` |

**Ghi chú:**
- Tiến trình kiểm thử, router và máy chủ chạy **chung 2 nhân CPU**. Vì vậy độ trễ đo được cao hơn so với khi tách máy.
- Bài thử chạy trong mạng nội bộ của một máy, không có Wi-Fi và không có TLS.
- Chưa thử với trình duyệt thật ở quy mô lớn. Chưa thử ảnh, video trên hàng nghìn điện thoại.

## 5. Nghiệm thu trước khi công bố "1.000.000 người"

1. Dựng đúng hạ tầng ở mục 2: số máy, số nút, PostgreSQL, Caddy hoặc bộ cân bằng tải, CDN.
2. Chạy `test/load-cluster.sh` từ **nhiều máy phát tải riêng**. Mỗi máy phát tải giữ ≤ 50.000 kết nối và dùng nhiều IP nguồn.
   - Tăng dần: 50.000 → 200.000 → 500.000 → 1.000.000.
   - Ghi lại độ trễ, tỷ lệ lỗi, CPU, RAM của từng nút, và tải PostgreSQL.
3. Thống nhất ngưỡng đạt **trước** khi chạy. Ví dụ: 0 bài đã xác nhận bị mất; p95 nhận bài < 500 ms; p95 công bố < 2 giây; 0 sai lệch điểm.
4. Thử sự cố: tắt một nút, tắt một router, khởi động lại PostgreSQL. Phòng phải khôi phục và không sai điểm.
5. Thử thiết bị thật: 50–100 điện thoại thật trên Wi-Fi hoặc 4G tại địa điểm, kết hợp tải giả lập.
