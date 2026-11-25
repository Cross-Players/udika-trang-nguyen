'use strict';
// Chạy TOÀN BỘ kiểm thử, bộ nào thất bại tự chạy lại (tối đa 2 lần nữa).
// Bộ đạt sau khi chạy lại được ghi rõ "CHẬP CHỜN" kèm lỗi lần đầu – không giấu. Kết quả ghi vào KET_QUA_KIEM_THU_TONG.txt.
// Dùng: node test/run-all.js            (đủ bộ, gồm tải 3.000 kết nối)
//       node test/run-all.js --nhanh    (bỏ bộ tải nặng)
//       node test/run-all.js --nghiem-thu  (NGHIỆM THU NGHIÊM NGẶT: không bỏ qua bộ nào vì thiếu thư viện, KHÔNG chạy lại – một lần thất bại là KHÔNG ĐẠT)
const {spawnSync}=require('node:child_process');const fs=require('node:fs');const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');const quick=process.argv.includes('--nhanh');const strict=process.argv.includes('--nghiem-thu');const MAX=strict?1:3;
const has=mod=>spawnSync('python3',['-c','import '+mod],{stdio:'ignore'}).status===0;
const suites=[
 ['Khói – khởi động bản phát hành','node',['test/smoke-prod.js']],
 ['Thời gian & tính điểm','node',['test/test-time-v5.js']],
 ['Câu hỏi','node',['test/test-questions-v5.js']],
 ['Nhập đề & báo cáo','node',['test/test-import-report-v6.js']],
 ['Điều khiển vinh quy','node',['test/test-vq-control-v8.js']],
 ['Phim vinh danh','node',['test/test-video-v10.js']],
 ['Tính năng V14 kiểu Kahoot','node',['test/test-v14-features.js']],
 ['Tự công bố đáp án','node',['test/test-v14-auto-reveal.js']],
 ['Độ tin cậy: không mất điểm, mất mạng, kill -9','node',['test/test-v14-reliability.js']],
 ['V15 lõi: L01–L09, luật 4.x, dạng câu Q01–Q11','node',['test/test-v15-core.js']],
 ['Bộ định tuyến nhiều tiến trình (chia phòng, tắt đột ngột 1 nút)','node',['test/test-router.js']],
 ['Báo cáo kiểm định 25/11: QF01–QF05, C01–C07, chống lộ đề, chống bot','node',['test/test-audit-v15.js']],
 ['Rà soát thương mại: F01–F07, tổng duyệt, lịch sử, vòng đời phòng, thanh trượt, đóng gói','node',['test/test-release-v15.js']],
 ['Tài khoản khách tự vận hành: gói, hạn mức, cách ly dữ liệu, hết hạn/khoá','node',['test/test-khach-v15.js']],
 ['V15 giao diện: dạng câu mới, ảnh, âm thanh, LED','python3',['test/test_v15_ui.py'],'playwright'],
 ['Giao diện V14 (trình duyệt)','python3',['test/test_v14_ui.py'],'playwright'],
 ['Mạng chập chờn trên giao diện','python3',['test/test_v14_net_ui.py'],'playwright'],
 ['Trang chủ máy tính + điện thoại','python3',['test/test_home_ui.py'],'playwright'],
 ['Phông chữ tiếng Việt','python3',['test/test_fonts.py'],'playwright'],
 ['QR cỡ lớn trên LED','python3',['test/test_led_qr.py'],'cv2'],
 ['Nhập ảnh có sẵn trong Word/Excel + ô chèn ảnh','python3',['test/test_import_images.py'],'playwright'],
 ['Câu sắp xếp: kéo thả bằng chuột và ngón tay','python3',['test/test_order_drag.py'],'playwright'],
 ['Chơi thử một mình với đối thủ ảo','python3',['test/test_practice.py'],'playwright'],
 ['Ghi danh: duyệt tên, danh sách dự kiến, vào muộn (4.6)','python3',['test/test_entry_control.py'],'playwright'],
 ['LED phòng 1.000 người: 60 nhân vật + biển sĩ tử','python3',['test/test_led_crowd.py'],'playwright'],
 ['Tông xanh ngọc, lưới ảnh 2×2, màn 320 px, mạng 3G giả lập','python3',['test/test_theme_mobile.py'],'playwright'],
 ['Kiểm định 7.1–7.3: âm thanh tắt tiếng không mở lượt, LED chính, mất LED','python3',['test/test_led_media_audit.py'],'playwright'],
 ['Kiểm định 7.3: chế độ sân khấu hiện trọn tổng kết & bảng vàng','python3',['test/test_led_stage_clean.py'],'playwright'],
 ['Cải tiến từ phản ánh Kahoot: lý do lỡ câu, MC giữ bảng điểm, luật theo vòng, tự lưu nháp, kiểm tra trước giờ diễn','python3',['test/test_kahoot_feedback.py'],'playwright'],
 ['Cổng khách hàng /khach & cấp tài khoản khách trên /admin (trình duyệt)','python3',['test/test_khach_ui.py'],'playwright'],
 ['Hành trình đầy đủ của khách: cấp tài khoản → tạo phòng → ghép LED → 3 điện thoại → vinh danh tên thật → báo cáo → tổng duyệt → lưu trữ','python3',['test/test_hanh_trinh_khach.py'],'playwright'],
 ['Hành trình của khách qua CỤM 3 tiến trình (router.js), phòng khách nằm ở nút khác nút 0','python3',['test/test_hanh_trinh_khach.py'],'playwright',{ROUTER_NODES:'3'}],
 ['Phim vinh danh 3D','python3',['test/test_vinhdanh_3d_v13.py'],'playwright'],
 ['Tích hợp đầy đủ (websocket-client)','python3',['test/test_integration.py'],'websocket'],
 ['Lễ vinh danh (websocket-client)','python3',['test/test_ceremony_v4.py'],'websocket'],
 ['10 hình thức trả lời + cơ chế điểm riêng từng câu (máy chủ): tương thích ngược, không lộ đáp án, chấm từng dạng, MC duyệt tay, câu quyết định, nhập CSV','node',['test/test-dang-cau-moi.js']],
 ['10 hình thức trả lời trên giao diện: MC soạn & xem trước, 2 điện thoại 390 px + LED, ô chữ, ghép cặp, duyệt tay, vượt hạng','python3',['test/test_dang_cau_moi_ui.py'],'playwright'],
 ['Thanh toán tự động: VietQR + webhook ngân hàng (SePay/Casso), VNPAY, MoMo, chống trùng/thiếu tiền, đổi mật khẩu','node',['test/test-thanh-toan.js']],
 ['Chương trình liên hoàn: nhiều hoạt động, hệ số, trọng tài, khoá điểm, nhập điểm quiz','node',['test/test-lien-hoan.js']],
 ['Giới hạn kết nối CHUNG cả cụm (3 tiến trình, chỗ dự phòng người vào lại)','node',['test/test-gioi-han-cum.js']],
 ['PostgreSQL 16 thật: tạo bảng, kill -9, CSDL sập rồi sống lại','node',['test/test-postgres-that.js']],
 ['Giao diện thanh toán (giải mã ảnh VietQR) + liên hoàn: /khach, /admin, /chuongtrinh, /trongtai (điện thoại), /bangdiem','python3',['test/test_thanh_toan_lien_hoan_ui.py'],'cv2'],
 ['LED tải lại trang giữa phim vinh danh → chạy tiếp đúng chỗ (phim mp4 + hoạt cảnh)','python3',['test/test_led_resume_v15.py'],'playwright'],
 ['Chạy mạng nội bộ (LAN, không Internet) + trang tự kiểm tra máy /kiem-tra','python3',['test/test_lan_kiemtra_v15.py'],'cv2'],
 ['Diễn tập buổi thi có sự cố (kill -9, rớt mạng, gửi trễ, bấm trùng) + đối soát từng bài','node',['test/test-dien-tap-on-dinh.js',quick?'120':'300']],
 ...(quick?[]:[['Tải 3.000 kết nối/1 phòng','node',['test/load-test.js','3000','3']],['Tải nhiều phòng 2.000+500+500','node',['test/load-multi.js']]])
].map(([name,cmd,args,need,env])=>({name,cmd,args,need,env:env||{}}));
const rows=[];let bad=0;const t0=Date.now();
for(const s of suites){
 let extraEnv={},shim='';
 if(s.need==='websocket'&&!has('websocket')){extraEnv={PYTHONPATH:path.join(__dirname,'_pyshim')};shim=' (dùng bản websocket tối giản trong test/_pyshim vì máy thiếu websocket-client)'}
 else if(s.need&&!has(s.need)){if(strict){rows.push({...s,status:'KHÔNG ĐẠT',note:`NGHIỆM THU: thiếu thư viện "${s.need}" – cài theo requirements-test.txt rồi chạy lại`,tries:0,fails:['thiếu '+s.need]});bad++;console.log(`❌ ${s.name}: thiếu ${s.need} (chế độ nghiệm thu không cho bỏ qua)`);continue}rows.push({...s,status:'BỎ QUA',note:`máy này thiếu thư viện Python "${s.need}"`,tries:0});console.log(`⏭  ${s.name}: bỏ qua (thiếu ${s.need})`);continue}
 const fails=[];let passOut='',st=null;
 for(let k=1;k<=MAX;k++){const t=Date.now();const r=spawnSync(s.cmd,s.args,{cwd:ROOT,encoding:'utf8',timeout:15*60e3,maxBuffer:64e6,env:{...process.env,PYTHONUNBUFFERED:'1',UDIKA_STRICT:strict?'1':'',...extraEnv,...s.env}});
  const out=(r.stdout||'')+(r.stderr||'');const sec=((Date.now()-t)/1000).toFixed(1);
  if(r.status===0){passOut=out;st=k===1?'ĐẠT':'ĐẠT SAU CHẠY LẠI (chập chờn)';console.log(`${k===1?'✅':'⚠️ '} ${s.name}: ${st} – lần ${k}, ${sec}s`);break}
  const why=(out.match(/^(FAIL|AssertionError|Error|Traceback).*$/m)||[out.trim().split('\n').slice(-1)[0]||'thoát mã '+r.status])[0].slice(0,300);
  fails.push(`lần ${k}: ${why}`);try{fs.appendFileSync(path.join(ROOT,'test','last-failures.log'),`\n===== ${new Date().toISOString()} · ${s.name} · lần ${k} · mã ${r.status} =====\n${out.slice(-6000)}\n`)}catch{}console.log(`❌ ${s.name}: lần ${k} thất bại (${sec}s) – ${why}${k<MAX?' → tự chạy lại':''}`)}
 if(!st){st='KHÔNG ĐẠT';bad++}
 const passes=(passOut.match(/^PASS/mg)||[]).length;
 rows.push({...s,note:shim.trim(),status:st,tries:fails.length+(st==='KHÔNG ĐẠT'?0:1),passes,fails,summary:passOut.split('\n').filter(l=>/^(PASS|KẾT QUẢ|Kết quả|OK|✔)/.test(l)).slice(-40)})}
const lines=[`KẾT QUẢ KIỂM THỬ TỔNG HỢP – UDIKA Khoa Bảng`,`Thời điểm: ${new Date().toISOString()} · Node ${process.version} · tổng thời gian ${((Date.now()-t0)/60000).toFixed(1)} phút${quick?' · chế độ nhanh (bỏ bộ tải)':''}`,
 strict?'Quy tắc NGHIỆM THU: mỗi bộ chạy đúng MỘT lần, không chạy lại, không bỏ qua – thiếu thư viện hay thất bại đều là KHÔNG ĐẠT.':`Quy tắc: bộ nào thất bại được tự chạy lại tối đa ${MAX-1} lần; đạt sau khi chạy lại = CHẬP CHỜN (ghi lại lỗi lần đầu để điều tra).`,'',
 ...rows.map(r=>`[${r.status}] ${r.name}${r.passes?` – ${r.passes} mục PASS`:''}${r.tries>1?` – chạy ${r.tries} lần`:''}${r.note?' – '+r.note:''}${(r.fails||[]).length?'\n   lỗi: '+r.fails.join('\n   lỗi: '):''}`),'',
 `TỔNG: ${rows.filter(r=>r.status==='ĐẠT').length} đạt ngay · ${rows.filter(r=>r.status.startsWith('ĐẠT SAU')).length} đạt sau chạy lại · ${bad} không đạt · ${rows.filter(r=>r.status==='BỎ QUA').length} bỏ qua`,'',
 'CHI TIẾT CÁC MỤC PASS',...rows.filter(r=>r.summary&&r.summary.length).flatMap(r=>['— '+r.name,...r.summary.map(x=>'   '+x)])];
fs.writeFileSync(path.join(ROOT,strict?'KET_QUA_NGHIEM_THU.txt':'KET_QUA_KIEM_THU_TONG.txt'),lines.join('\n')+'\n');
console.log('\n'+lines.slice(0,rows.length+6).join('\n'));process.exitCode=bad?1:0;
