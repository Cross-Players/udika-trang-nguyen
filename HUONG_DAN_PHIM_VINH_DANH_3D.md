# Hướng dẫn sản xuất phim vinh danh 3D cho màn LED Khoa Bảng

Tài liệu này dành cho studio, họa sĩ 3D hoặc người dùng công cụ dựng phim. Phim chỉ cần dựng **một lần**. Tên và điểm của Trạng nguyên được phần mềm chèn tự động lên phim theo dữ liệu thật, nên vinh danh bao nhiêu thí sinh cũng không phải dựng lại.

## 1. Cách phần mềm dùng phim

- Đặt tệp phim tại `public/assets/vinhquy/vinh_quy.mp4` trên máy chủ.
- Màn LED tự phát hiện phim khi tải trang. Có phim thì phát phim, không có phim thì dùng hoạt cảnh vẽ sẵn trong phần mềm.
- Lớp tên (bảng "VINH QUY BÁI TỔ · CHÚC MỪNG TRẠNG NGUYÊN · [tên] · [điểm]") hiện mềm vào từ giây 20.
- Nếu muốn đổi thời điểm hoặc vị trí bảng tên, tạo tệp `public/assets/vinhquy/vinh_quy.json`:

  ```json
  { "nameAt": 20, "nameY": 40 }
  ```

  - `nameAt`: giây bắt đầu hiện tên.
  - `nameY`: vị trí bảng tính từ mép trên, theo khung 1200 × 675.
- MC điều khiển phim bằng các nút sẵn có (trên màn MC hoặc thanh điều khiển của màn LED):
  - bắt đầu / phát lại từ đầu;
  - tạm dừng, tiếp tục;
  - "Vinh danh" (tua thẳng tới giây hiện tên);
  - bật/tắt tiếng;
  - tốc độ 0.5× / 1× / 1.5×.

## 2. Thông số kỹ thuật phim

| Mục | Yêu cầu |
|---|---|
| Khung hình | 16:9, 1920 × 1080 (có thể dựng 3840 × 2160 rồi xuất bản 1080p) |
| Tốc độ khung | 30 fps tối thiểu (khuyến nghị 30 hoặc 60) |
| Độ dài | 30 giây |
| Mã hóa | MP4, H.264 High, 8–15 Mbps, `-movflags +faststart`, âm thanh AAC 48 kHz stereo |
| Vùng an toàn | Không đặt chi tiết quan trọng cách mép dưới 5% |
| Vùng chừa cho bảng tên | Từ giây 20 đến hết: dải trên giữa khung, x từ 400 đến 1520, y từ 60 đến 330 (theo 1920 × 1080). Giữ vùng này thoáng (bầu trời, mái đình, ngọn cờ), không đặt mặt nhân vật vào đó |
| Không chèn chữ tên trong phim | Tên, điểm do phần mềm chèn. Phim chỉ được có chữ cố định: "VINH QUY" trên cờ, "TRẠNG NGUYÊN" trên biển, "BÁI TỔ" trên tàn |

Lệnh xuất mẫu:

```
ffmpeg -i render.mov -c:v libx264 -profile:v high -crf 18 -preset slow -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -movflags +faststart vinh_quy.mp4
```

## 3. Kịch bản phân cảnh (30 giây)

| Thời gian | Cảnh | Máy quay | Âm thanh |
|---|---|---|---|
| 0–5 s | Toàn cảnh làng quê Bắc Bộ: sân đình mái ngói nâu, cây đa, lũy tre, hàng cau, cờ hội đuôi nheo. Bà con đứng hai bên đường chờ đón | Toàn cảnh, máy quay trôi chậm từ phải sang | Trống hội nổi lên |
| 5–12 s | Lính cầm cờ "VINH QUY" và người cầm biển "TRẠNG NGUYÊN" bước vào trước. Tiếp theo là người hầu dắt ngựa, Trạng nguyên cưỡi ngựa, người che lọng, lính cầm tàn "BÁI TỔ" | Trung cảnh, lia theo đoàn, tốc độ bằng đoàn đi | Trống, tiếng chân, cờ bay |
| 12–20 s | Đoàn tiến qua sân đình. Trạng nguyên mỉm cười, giơ tay chào. Bà con vỗ tay, reo hò | Máy quay đi song song với ngựa, hơi thấp | Reo hò vừa phải, trống |
| 20–26 s | Đoàn giảm tốc, dừng giữa sân. Trạng nguyên quay mặt nhìn khán giả, giơ tay chào. Vùng trên khung để trống cho bảng tên | Trung cảnh chính diện, ổn định | Pháo nổ, trống dồn |
| 26–30 s | Cận cảnh Trạng nguyên mỉm cười. Cờ và lọng vẫn bay nhẹ. Giấy màu rơi vừa phải | Đẩy máy chậm vào nửa người trên của Trạng nguyên, mặt ở nửa dưới khung | Nhạc kết, pháo nhỏ dần |

Hai giây cuối nên là khung hình ổn định, để phim dừng ở khung đẹp nếu MC tạm dừng.

## 4. Thiết kế nhân vật (bám tranh "Vinh quy bái tổ")

Phong cách: hoạt hình 3D cách điệu, mặt đẹp và có thần, chuyển động mềm, ánh sáng ban ngày ấm. Giữ màu, trang phục và vai trò như tranh dân gian; không sao chép nhân vật của phim khác, không theo kiểu hoạt hình phương Tây.

Bảng màu gốc:
- xanh lá đậm `#2E7A4F`
- vàng nghệ `#EAB84A`
- đỏ son `#BD3328`
- hồng `#E4A0B2`
- đen `#1D1612`
- trắng ngà `#F5ECD5`
- ngựa đỏ nâu `#B8382B`

| Nhân vật | Trang phục, đạo cụ | Diễn xuất |
|---|---|---|
| Trạng nguyên | Mũ cánh chuồn đen viền vàng; áo bào xanh lá đậm, cổ giao vàng, lót trắng; đai đỏ khóa vàng; hia đen mũi cong | Mặt thanh tú, phúc hậu, mắt sáng; ngồi thẳng; mỉm cười, chớp mắt, quay đầu, giơ tay chào |
| Ngựa | Ngựa đỏ nâu, bờm sẫm, đuôi trắng ngà; dây cương vàng, chùm tua đỏ ở hàm và ức; chăn yên vàng viền đỏ có tua | Đi bốn nhịp, gật đầu theo bước, đuôi và bờm mềm; móng không trượt |
| Lính cầm cờ | Áo vàng viền đỏ, quần xanh ống túm, xà cạp, nón chóp vàng nhạt có tua đỏ. Cờ "VINH QUY" nền hồng, viền xanh và vàng, viền răng cưa đen | Bước đều, hai tay nắm cán, cờ phấp phới |
| Người cầm biển | Áo xanh viền vàng, quần hồng, khăn vàng. Biển khung đỏ nền vàng "TRẠNG NGUYÊN" | Biển lắc nhẹ theo bước, chữ luôn đọc rõ |
| Người dắt ngựa | Áo nâu, khăn đen, quần trắng ngà | Một tay cầm dây cương, tay kia vung theo bước |
| Người che lọng | Áo đỏ viền vàng, quần xám, búi tóc khăn đỏ. Lọng vàng viền đỏ, tua đỏ | Cán nghiêng che phía trên Trạng nguyên; tua lọng đung đưa |
| Lính cầm tàn | Áo xanh viền đỏ, quần vàng, nón chóp. Tàn vàng – đỏ – xanh "BÁI TỔ", dải hồng hai bên | Bước đều, tàn rung nhẹ |
| Bà con | Áo tứ thân, yếm, khăn mỏ quạ, nón quai thao, nón lá, khăn xếp; cụ già râu bạc, trẻ em để chỏm | Mỗi người một động tác: vỗ tay, vẫy, giơ tay reo, quay đầu nhìn theo, mỉm cười |

Lịch sử, văn hóa: không dùng chữ Hán, không đèn lồng đỏ, không họa tiết Trung Hoa. Chữ trên đạo cụ dùng tiếng Việt như trên.

## 5. Quy trình gợi ý

1. Vẽ bảng thiết kế nhân vật 2D (mặt trước, mặt nghiêng, bảng màu). Có thể dùng `ban_thiet_ke_tao_hinh.png` trong gói làm bản phác vai trò và trang phục.
2. Dựng mô hình, điêu khắc mặt, làm chất liệu vải, mũ, gỗ cán cờ, lụa lọng.
3. Gắn khung xương (rig) mặt và thân; chuyển động bước bằng điều khiển chân (IK) để không trượt.
4. Dựng cảnh làng, ánh sáng ngày, chiều sâu (sương nhẹ, xóa phông xa).
5. Diễn hoạt theo kịch bản, kết xuất, xuất MP4 theo mục 2.
6. Chép vào `public/assets/vinhquy/vinh_quy.mp4` rồi kiểm tra trên màn LED: tên hiện đúng giây 20, không che mặt Trạng nguyên.

## 6. Âm thanh cho phim 3D

Dùng đúng bản trống đã dựng sẵn `public/assets/vinhquy/trong_mua_lan.m4a`. Bản này dài 30 giây, lấy từ "Đánh Trống Múa Lân" do khách cung cấp, có đoạn cao trào 18,4–22,3 s trùng lúc vinh danh. Phim 3D cần căn hình theo bản này. Không thêm nhạc nền hay tiếng hiệu ứng khác.

## 7. Yêu cầu dựng hình 3D (bắt buộc, theo phản hồi của khách)

- **Cơ thể liền mạch:** khung xương có skinning, không ghép mảnh. Đầu và cổ, vai và tay, hông và chân biến dạng mềm tại khớp.
- **Quần áo:**
  - mô hình riêng nhưng gắn trọng số theo xương;
  - không để da xuyên qua áo;
  - giữ phần xẻ tà có chủ đích;
  - vạt áo dùng mô phỏng vải nhẹ hoặc xương phụ.
- **Mũ, đai, phụ kiện:** gắn vào xương đầu và xương hông.
- **Đám đông:** ít nhất 6 mẫu người, 4 kiểu nét mặt, 4 kiểu động tác (vỗ tay chạm tay thật, vẫy tay, giơ tay reo, nhìn theo đoàn), lệch nhịp nhau.
- **Kiểm tra trước khi nhân bản đám đông:**
  - tư thế biên: tay giơ cao nhất, đầu quay nhiều nhất, bước rộng nhất, hai tay chạm nhau;
  - điểm nối vòng lặp của từng động tác.
- **Bàn giao:**
  - tệp dự án (.blend hoặc tương đương);
  - mô hình GLB hoặc FBX đã gắn xương;
  - phim MP4 theo mục 2.

## 8. Phim 3D đã dựng sẵn trong bản V13 (đang dùng)

- Tệp: `public/assets/vinhquy/vinh_quy.mp4`, 1920×1080, 30 khung/giây, 30 giây, H.264 + AAC. Âm thanh **chỉ** là bản thu
  "Đánh Trống Múa Lân" khách cung cấp (`trong_mua_lan.m4a`, đã nối tại phách trống, không kéo giãn).
- `public/assets/vinhquy/vinh_quy.json`: `{"nameAt":20.3,"nameY":22}`. Thẻ tên hiện từ giây 20,3, lúc ngựa dừng giữa sân.
  Thẻ nằm ở dải trên cùng (khoảng 2–23% chiều cao). Đã đo bằng phép chiếu máy quay: từ giây 20 tới 30, đỉnh mũ Trạng nguyên
  luôn thấp hơn 30% chiều cao khung, nên thẻ không che mặt.
- Tên, điểm và số câu đúng là **dữ liệu thật** của người đứng đầu bảng. Phim không in sẵn tên. Thẻ tên là lớp phủ do app vẽ.
- Mã nguồn dựng phim và mô hình nằm trong gói `UDIKA_PHIM_3D_NGUON.zip`:
  - Mô hình hoá: `man.py`, `woman.py`, `trang.py`, `horse.py`, `props.py`, `env.py`, `lib3d.py`, `sdf.py`.
  - Khung xương và chuyển động: `rig.py`, `horse_anim.py`, `procession.py`, `scene.py`.
  - Bộ dựng: `r3d.html`, `rend.py`, `film.py`.
  - Mô hình `.glb` (glTF 2.0 có khung xương và trọng số) mở được bằng Blender, three.js và các phần mềm khác.
- Dựng lại phim: chạy `python3 film.py range 0 900`, sau đó ghép bằng ffmpeg với `trong_mua_lan.m4a`
  (xem `LAM_LAI_PHIM.txt` trong gói nguồn).
- Muốn thay phim khác: chép đè `vinh_quy.mp4` (giữ khung 16:9) rồi sửa `nameAt`/`nameY` cho khớp lúc dừng và chỗ trống phía trên.
