# UDIKA Khoa Bảng V15 – Bàn giao cho lập trình viên

**Ngày bàn giao:** 25/11/2026.

**Phạm vi:** bản V15 đã cập nhật đầy đủ:
- sửa toàn bộ lỗi trong *Báo cáo kiểm định độc lập V15*;
- chống lộ đề và chống bot;
- các cải tiến rút ra từ phản ánh của người dùng Kahoot.

**Trạng thái kiểm thử:** `node test/run-all.js` → **32/32 bộ đạt ngay lần đầu** (xem `KET_QUA_KIEM_THU_TONG.txt`).

## 1. Chạy thử trong 2 phút

Yêu cầu Node.js ≥ 22. Ứng dụng **không cần cài thư viện npm** khi chạy bằng tệp; chỉ cần gói `pg` nếu dùng PostgreSQL.

```bash
cd UDIKA_KHOA_BANG_REALTIME
ADMIN_PASSWORD='mat-khau-admin-dai-it-nhat-12-ky-tu' SESSION_SECRET='chuoi-bi-mat-dai-it-nhat-24-ky-tu-1234567890' node server.js
# mở http://localhost:3000  (trang chủ) · /admin (tạo phòng) · /host (MC) · /led?pin=… (màn LED) · /join?pin=… (người chơi) · /practice (chơi thử)
```

Triển khai thật (Docker + Caddy, PostgreSQL, biến môi trường): xem `README.md` và `HUONG_DAN_POSTGRES_RENDER.md`.

## 2. Cấu trúc mã

| Tệp / thư mục | Vai trò |
|---|---|
| `server.js` | Máy chủ HTTP + WebSocket tự viết. Gồm: luật chấm điểm, luồng thi, nhật ký ghi trước (journal) + ảnh chụp (snapshot), báo cáo CSV, kho đề, chơi thử |
| `router.js` | Chia phòng cho nhiều tiến trình / nhiều máy (`pin % NODE_COUNT`) |
| `importer.js` | Nhập đề từ Word / Excel / CSV / TXT, kể cả ảnh nhúng |
| `public/` | Giao diện. `host.*` = màn MC, `led.*` + `scene.js` = màn LED, `player.*` = điện thoại, `practice.*` = chơi thử, `admin.*` = quản trị UDIKA, `khach.*` = **cổng khách hàng tự vận hành**, `index.html` = trang chủ, `style.css` / `home.css` = giao diện |
| `pay.js` | **Thanh toán**: bảng giá, đơn hàng, VietQR (EMVCo + CRC16), webhook ngân hàng SePay/Casso, VNPAY 2.1.0 (HMAC-SHA512, IPN), MoMo v2 (HMAC-SHA256, IPN), tự gia hạn; chống trùng theo `phương thức:mã giao dịch` (PAYLOG). Nạp lười qua `EXT()` trong `server.js` |
| `events.js` | **Chương trình liên hoàn**: đội, hoạt động (quiz/chấm), hệ số, trọng tài (vai `judge`, phiên có `jver`), điểm + nhật ký sửa, khoá, ẩn, nhập điểm đội từ phòng quiz (kể cả phòng ở nút khác qua header ký `x-udika-teamboard`) |
| `lan.js` | `npm run lan`: chạy một tiến trình trên `0.0.0.0`, tự tạo `data/lan-secrets.json`, in địa chỉ LAN + QR trên dòng lệnh, đặt `LAN_MODE=1` (bật `/api/lan-info`) |
| `questions.json` | Bộ đề mặc định của phòng thi |
| `practice_sample.json` | Bộ chơi thử công khai, **cố ý khác** bộ đề thi để chống lộ đề |
| `test/` | Kiểm thử. `run-all.js` chạy tất cả và tự chạy lại bộ thất bại; toàn văn lỗi ghi vào `test/last-failures.log` |
| `tools/` | `fill_room.js` (đổ N người thật vào phòng để xem LED), `make_templates.py` (tạo tệp mẫu Word/Excel có ảnh). Kho GitHub có thêm `tools/demo/` (đóng gói bản demo một tệp HTML) |
| `bang_chung_kiem_dinh/` | Nhật ký chạy ca kiểm định trên bản **trước** và **sau** khi sửa |

## 3. Những gì đã thay đổi trong đợt này

Chi tiết và tên kiểm thử của từng mục nằm trong `BAO_CAO_NGHIEM_THU_V15.md` (mục 6b, 6c, 6d, **6e**).

### Đợt 4: rà soát thương mại + tài khoản khách (`test/test-release-v15.js`, `test/test-khach-v15.js`, `test/test_khach_ui.py`, ca cụm trong `test/test-router.js`)

- **Vai trò mới `owner`** (chủ tài khoản khách).
  - Tài khoản lưu trong `TENANTS`, nằm trong ảnh chụp dữ liệu cùng `ARCHIVE`, qua `extraState()`.
  - Mỗi tài khoản có `{id,name,login,password,ver,maxRooms,maxPlayers,expiresAt,locked}`.
  - Phòng của khách mang `r.tenant`.
- **Kiểm phiên tập trung ở `liveSession()` / `roomUser()`.**
  - Phiên MC hợp lệ khi khớp `mcVersion`; phiên khách hợp lệ khi khớp `tenant.ver`.
  - Đổi mật khẩu thì phiên cũ mất hiệu lực ở **mọi** đường, kể cả kho đề.
  - Không viết lại kiểm tra quyền rời rạc: dùng `roomUser()`, `canControl()`, `libKey()`.
- **Hạn mức** kiểm ở máy chủ: `POST /api/rooms` (số phòng), `entryGate` (`roomPlayerCap`), `authHost` (`tenantBlock`: khoá / hết hạn).
- **Kho đề** gắn với `ownerKey`: `t:<khách>` / `room:<mã phòng>` / `admin`. Bộ đề cũ chưa có `ownerKey` thì chỉ Admin thấy.
- **API mới:**
  - `GET/POST /api/tenants`, `PATCH /api/tenants/:id`: chỉ Admin.
  - `DELETE /api/rooms/:pin`: Admin hoặc chủ khách. Phòng đóng lại và kết quả chuyển vào `ARCHIVE`.
  - `GET /api/archive`, `GET /api/archive/:pin/:eid.csv`.
  - `POST /api/login` với `{role:'owner',login,password}`.
- **Chạy nhiều nút:**
  - Sổ khách ở nút 0; router chép sang nút khác qua `/api/internal/tenants`.
  - Router ký các header `x-udika-principal` (MC ở nút khác dùng kho đề) và `x-udika-tenant-rooms` (số phòng toàn cụm). Ký bằng HMAC `SESSION_SECRET`, hết hạn sau 30 giây.
  - **Router phải có cùng `SESSION_SECRET` với các nút.**
- **Lịch sử kỳ thi** đóng băng toàn bộ đề và luật. CSV có phần "ĐỀ THI LÚC THI" (`historyCsv`, `historyKeyRows`).
- **Tổng duyệt:** bật hoặc tắt là sang kỳ thi mới (`resetScores`).
- **Đóng gói:**
  - Docker `node:22.12.0-alpine`, `pg` 8.16.3.
  - `requirements-test.txt`, CI `.github/workflows/kiem-thu.yml`, `docker-compose.portable.yml`.
  - `node test/run-all.js --nghiem-thu`: không bỏ qua, không chạy lại.

### Sửa theo báo cáo kiểm định (`test/test-audit-v15.js`, `test/test_led_media_audit.py`, `test/test_led_stage_clean.py`)

- **Chấm điểm.**
  - Câu gõ chữ giữ các dấu có nghĩa: hàm `normAnswer`, biến `MEANING_SIGNS`.
  - Câu số so sánh thập phân chính xác: `numClose`.
  - Báo cáo ghi đúng thứ tự A→F cho câu sắp xếp.
- **Nhập đề.**
  - `safeQ` báo lỗi khi thừa lựa chọn, dạng câu lạ, hoặc media/ảnh hỏng.
  - `importer.js` đọc cột A–F, cột Video/Âm thanh, và cảnh báo cột không dùng.
- **Không lộ kết quả trước khi công bố.** Các hàm `hiddenNow`, `shownOf`, `selfHidden`, `boardHeld`.
- **Độ bền dữ liệu.**
  - `durableMark` + `INFLIGHT` (ảnh chụp chỉ ghi mốc mà mọi bản ghi trước đó đã xong); `durablePlayers` (ảnh chụp không chứa bài đang chờ ghi).
  - Khi khôi phục, bài `_pending` bị loại.
- **Soạn đề đồng thời.** Lệnh `q_update` / `q_delete` dùng **mã câu `id` + bản gốc `orig`**. Gửi kèm vị trí mà không kèm mã câu sẽ bị từ chối (trừ khi kèm đúng `baseVer`).
- **Cấu hình.**
  - `REQUIRE_DATABASE` nhận 1/true/yes/on.
  - Thêm `RECONNECT_RESERVE` (chỗ dự phòng cho người vào lại) và `BOT_JOINS` (ngưỡng chống bot).
- **Màn LED.**
  - Phát tắt tiếng thì không mở lượt (`mediaMuted`).
  - `canDecode` / `verifyFilm` xác nhận phim phát thật.
  - Màn LED chính: lệnh `set_main_led`.
  - Báo khi mất LED: tin `media_alert`.
  - Bảng vàng ở chế độ sân khấu: lệnh `vq board` hoặc phím B.

### Chống lộ đề / chống bot

- **Tự làm bài:** mặc định giữ kín kết quả (`selfHide`) tới khi đóng bài.
- **Chơi thử:** bộ riêng. MC được cảnh báo khi bộ đề có câu trùng bộ đang công khai (`publicOverlap`).
- **Chống bot:**
  - Ghi danh dồn dập từ một địa chỉ mạng → chuyển sang hàng chờ duyệt.
  - Một kết nối gửi quá 40 tin/giây → bị ngắt.

### Cải tiến từ phản ánh Kahoot (`test/test_kahoot_feedback.py`)

- **Lý do lỡ câu trong báo cáo:** `p.miss`, `p.late`, `p.drop`, hàm `missText`.
- **MC giữ bảng điểm và xướng danh:** tuỳ chọn `holdBoard`, lệnh `show_board`.
- **Luật điểm theo vòng:** `stageScoring`, hàm `scoringOf`.
- **Tự lưu nháp soạn câu và bộ đề JSON** trên máy MC: localStorage, hàm `qd*` trong `host.js`.
- **Màn kiểm tra trước giờ diễn:** `checkBank` / `probeMedia` trong `host.js`.

### Thay đổi giao thức có thể ảnh hưởng mã khác

- `q_update` / `q_delete` phải gửi `id` (mã câu) và nên gửi `orig` (nội dung câu lúc mở) để phát hiện xung đột.
- Chế độ tự làm bài mặc định **không** trả `reveal` / `correct` / `points` cho người chơi tới khi đóng bài. Bộ test V14 cũ đã được chỉnh bằng `set_option {selfHide:false}`.
- `media_done` gửi kèm `muted`. **Ghép đôi LED:**
  - Mỗi kết nối có `connId`, hiện thành `conn` trong `leds`.
  - `set_main_led` nay nhận `{conn}` (không còn `{id}`). Máy chủ gửi `{type:'led_main',token}` cho đúng màn đó.
  - LED gửi lại `mainToken` trong `led_status` để giữ quyền sau khi tải lại trang.
  - `media_done` / `media_alert` chỉ được nhận từ màn đã ghép đôi. Khi chưa ghép đôi màn nào, chỉ nhận từ màn mở trên máy đã đăng nhập quyền của phòng.
  - Mã màn LED lưu theo **thẻ** trình duyệt (`sessionStorage`).
- Thanh trượt: giá trị phải nằm trên lưới `min + k·bước`; máy chủ từ chối giá trị lệch lưới.
- `bank_saved` / `q_saved` chỉ được gửi **sau khi ghi bền** (`ackSaved`); ghi lỗi thì gửi `error` và màn MC giữ bản nháp. `led_main` (token màn chính) cũng chỉ gửi sau khi đã lưu. Đổi MC, sửa tài khoản khách và lưu kho đề trả **503** nếu chưa lưu được.

### Đợt 5: bổ sung các việc còn mở (`BAO_CAO_NGHIEM_THU_V15.md` mục **6g**)

- **Thanh toán** (`pay.js`) + khách tự đăng ký/đổi mật khẩu (`POST /api/khach/password` đổi `ver` → mọi phiên cũ hết hiệu lực, chủ khách đang mở màn MC bị ngắt).
- **Liên hoàn / trọng tài** (`events.js`, trang `chuongtrinh`, `trongtai`, `bangdiem`). Dữ liệu ở nút 0; `router.js` chuyển `/api/events*`, `/api/judge/*`, `/api/pay/*`, `/api/plans`, `/api/orders`, `/api/signup` về nút 0.
- **LED chạy tiếp phim**: màn LED tin cậy gửi `vq_pos` 2 giây/lần (`VQAnim.snapshot()`); máy chủ giữ `r.vqPos` (xoá khi kết thúc ván mới, phát lại, tổng duyệt); màn vừa vào nhận `vq_sync` (vị trí + thời gian đã trôi) → `VQAnim.seek()`. Phim mp4: tua sau `loadeddata` và tự kiểm lại (Chrome có thể chạy lệnh tua về 0 muộn). Sửa kèm: lệnh tạm dừng chen vào `play()` (AbortError) không còn bị tự phát lại.
- **Giới hạn chung cả cụm**: `router.js` (`CLUSTER_MAX_ONLINE`, `CLUSTER_RESERVE`) hỏi `/health` từng nút rồi `POST /api/internal/cluster` (ký, hết hạn 30 giây) số người ở các nút khác; `clusterFull()` trong `entryGate` (người mới) và nhánh vào lại. Tin cũ hơn 15 giây bị bỏ qua (về giới hạn riêng nút). Sai số: trong 2 giây giữa hai lần đồng bộ, các nút khác có thể nhận thêm người → có thể vượt trần một ít; đặt trần thấp hơn sức chịu thật.
- **LAN**: `common.js` có `pubOrigin()` – mở trang bằng localhost thì link/QR dùng địa chỉ LAN từ `/api/lan-info` (chỉ trả khi `LAN_MODE=1` hoặc hỏi từ chính máy, không qua proxy).
- **Kiểm tra máy**: `public/kiemtra.*` (`/kiem-tra`), tin `device_report` (lưu `r.devices`, tối đa 3.000 máy/phòng, không lưu bền), `GET /api/rooms/:pin/devices(.csv)` cho MC/Admin, tổng hợp `devices` trong trạng thái MC.
- **PostgreSQL thật**: `test/test-postgres-that.js` dựng PostgreSQL 16 tạm. Trên máy không cài được `npm` dùng `test/_pgshim` (gọi `psql` – chỉ kiểm câu SQL, không kiểm tầng giao thức của gói `pg`); có gói `pg` thật thì tự dùng gói thật (CI). `docker-compose.postgres.yml` + bước CI dựng ảnh, kill -9 container, kiểm phòng còn.

### Đợt 6: 10 hình thức trả lời (`BAO_CAO_NGHIEM_THU_V15.md` mục **6h**, `HUONG_DAN_HINH_THUC_TRA_LOI.md`)

- `server.js`:
  - `KINDS` thêm `fill` và `match`.
  - `OPT_MAX` (mc/multi/poll 6, order 8), `LETTERS`.
  - `safeQ`: trường mới đều tuỳ chọn (`tf`, `word`/`hint`/`loose`, `l`/`r`, `prox`, `hideLive`, `pts` 3, `maxPts`, `scoring`, `noStreak`, `tie`, `hideBoard`, `noFx`, `media.hide`).
  - `judge` chấm `fill` theo từng chữ, `match` theo vị trí hiển thị qua `permFor` → mã gốc.
  - `basePoints` thay công thức cũ với kết quả bằng nhau khi `maxPts` = 1000.
  - Câu `tie` lưu `tiePts` và cộng vào `p.tie` qua `tallyAdd`/`tallySub`; `leaderCalc` xếp theo điểm → `tie` → câu đúng → thời gian.
  - Duyệt tay: lệnh `accept_text` ghi nhật ký `{t:'acc'}`; `applyAccept` chỉ áp một lần (cờ `mcOk`); `reviewOf` gửi danh sách cho MC.
- `public/host.*`: dạng hiển thị `tf`/`img` chỉ là cách nhập; `readForm` chuyển về `mc`/`multi`. Có mục ⚙ cơ chế và khung xem trước (`previewQ` dựng trạng thái giống máy chủ, gửi qua `postMessage` vào `/join?preview=1` và `/led?preview=1`).
- `public/player.js` / `led.js`: ô chữ, ghép cặp, 6 màu, ✔/✘, ảnh tự ẩn, hiệu ứng vượt hạng (`renderRanks(list,limit,ups)` trong `common.js`), chế độ xem trước.
- `importer.js`: cột A–H, dạng Đúng sai / Điền ô chữ / Ghép cặp, hệ số x3.
- `public/mau_tro_choi.json`: 11 câu mẫu trò chơi.

### Giao diện dân gian (`BAO_CAO_NGHIEM_THU_V15.md` mục **6i**)

`public/dan-gian.css` nạp **sau** CSS cũ trên mọi trang, chỉ đổi nền, viền, khung, chữ tiêu đề, nút; không đổi HTML hay bố cục. Hoạ tiết SVG vẽ bằng hình học nằm ở `public/assets/dangian/` (trống đồng, diềm, góc khung, giấy dó, bụi vàng). Bộ dựng demo nhúng các tệp này thành data URI. Muốn tắt: bỏ `<link rel="stylesheet" href="/dan-gian.css">`.

## 4. Kiểm thử

**Quy tắc khi viết bài kiểm thử mới (rút từ 2 lỗi chờ hụt đã gặp):**
- Luôn đăng ký chờ gói tin **trước** khi gửi lệnh gây ra gói đó.
- Không giả định thứ tự giữa hai gói khác loại, ví dụ "joined" và "state".
- Trước khi phát hành, chạy `node test/do-on-dinh.js`. Bộ nào dưới 5/5 phải tìm ra nguyên nhân, không được chạy lại cho tới khi qua.

```bash
node test/run-all.js --nhanh       # 36 bộ chức năng/giao diện (cần python3 + playwright cho bộ giao diện)
node test/run-all.js               # thêm 2 bộ tải (3.000 người/phòng; 2.000+500+500)
node test/run-all.js --nghiem-thu  # NGHIỆM THU: đủ 38 bộ, mỗi bộ đúng 1 lần, thiếu thư viện = KHÔNG ĐẠT → KET_QUA_NGHIEM_THU.txt
node test/test-release-v15.js      # ca rà soát thương mại F01–F07, 5.4–5.6, UI-01/02, đóng gói
node test/test-khach-v15.js        # tài khoản khách tự vận hành
node test/test-dien-tap-on-dinh.js 300   # diễn tập 1 buổi thi có sự cố (kill -9, rớt mạng, gửi trễ, bấm trùng) + đối soát từng bài; DIEN_TAP_SEED=… để lặp đúng kịch bản
python3 test/test_hanh_trinh_khach.py   # hành trình khách bằng giao diện; ROUTER_NODES=3 để chạy qua cụm router.js
node test/do-on-dinh.js 5 3        # đo độ ổn định: 13 bộ lõi × 5 vòng + 3 buổi diễn tập → KET_QUA_DO_ON_DINH.txt (chạy trước mỗi lần phát hành)
node test/test-audit-v15.js      # riêng các ca của báo cáo kiểm định
AUDIT_KEEP_GOING=1 node test/test-audit-v15.js   # chạy hết các ca kể cả khi có ca thất bại (dùng để so bản cũ/mới)
```

Bộ kiểm thử giao diện dùng Playwright (Chromium):

```bash
python3 -m pip install -r requirements-test.txt && python3 -m playwright install --with-deps chromium
# Chrome riêng: CHROME_PATH=/duong/dan/chrome
```

## 5. Việc còn mở (chưa làm – không tính là đạt)

- **Chưa thử thiết bị thật**, Wi-Fi hội trường, HTTPS dưới tải. Có sẵn công cụ: trang `/kiem-tra` + bảng CSV kiểm tra máy, kịch bản `KIEM_THU_THUC_DIA_DIEN_THOAI.md`.
- **Chưa dựng ảnh Docker** trên máy làm việc (không tải được ảnh gốc `node:22` từ kho Docker). CI có 2 bước dựng (một tiến trình; kèm PostgreSQL) nhưng chưa chạy vì chưa đẩy được lên GitHub.
- **Gói `pg` thật** chưa chạy ở máy làm việc (không có mạng tới npm) – SQL đã chạy trên PostgreSQL 16 thật qua `psql`; CI chạy `PG_REAL=1`. Chưa có `package-lock.json`.
- **Cổng thanh toán chưa nối tài khoản thật**: VietQR, SePay/Casso, VNPAY, MoMo được kiểm theo tài liệu kỹ thuật bằng máy giả lập. Cần chạy sandbox VNPAY/MoMo + một lần chuyển khoản thật nhỏ trước khi bán. Chưa xuất hoá đơn điện tử.
- Kiểm tra máy (`r.devices`) chỉ giữ trong bộ nhớ – khởi động lại máy chủ thì mất (không ảnh hưởng thi).
- Chưa có xem trước song song MC / LED / điện thoại khi soạn đề; ảnh "Đặt trong ô" của Excel 365 chưa đọc được.
- Quy mô 1.000.000 người mới là kiến trúc, chưa đo: `KIEN_TRUC_MO_RONG_1_TRIEU.md`.

## 6. Lịch sử git

Nhánh `udika-v15` có 11 commit tính từ commit gốc `9936180`. Do chưa đẩy được lên GitHub (lỗi 403: ứng dụng Claude GitHub chưa được cài cho tổ chức Cross-Players), nhánh được gửi kèm trong tệp `udika-v15.bundle`. Cách nhanh nhất: `sh tools/day_len_github.sh udika-v15.bundle` (Windows: `tools\day_len_github.bat udika-v15.bundle`) – chỉ tạo/cập nhật nhánh `udika-v15`, không đụng `main`, không ghi đè. Làm tay:

```bash
git clone https://github.com/Cross-Players/udika-trang-nguyen && cd udika-trang-nguyen
git fetch /duong/dan/udika-v15.bundle udika-v15:udika-v15
git checkout udika-v15
git push -u origin udika-v15     # (cần quyền ghi vào kho) rồi mở Pull Request udika-v15 → main
```
