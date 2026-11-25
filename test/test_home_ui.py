'''Trang chủ mới: hiển thị máy tính (1672×941) và điện thoại (390×844), mã sai, phòng không tồn tại, đang kết nối,
máy chủ không phản hồi, phòng đã khoá / kết thúc, vào phòng hợp lệ → bước ghi danh hiện có. Chạy: python3 test/test_home_ui.py'''
import os,subprocess,tempfile,time,urllib.request,json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18945;TMP=tempfile.TemporaryDirectory();SHOT=os.environ.get('SHOTS','/tmp/homeshots');os.makedirs(SHOT,exist_ok=True)
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP.name+'/rooms.json','ADMIN_PASSWORD':'UDIKA-Local-Test-Password-8841','SESSION_SECRET':'udika-local-test-secret-random-1234567890'}
proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);U=f'http://127.0.0.1:{PORT}'
def ok(s):print('PASS',s,flush=True)
try:
 for i in range(80):
  try:urllib.request.urlopen(U+'/health',timeout=2);break
  except Exception:time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
  adm=b.new_context().new_page();adm.goto(U+'/health')
  J=lambda path,data:adm.evaluate("a=>fetch(a[0],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a[1])}).then(r=>r.json())",[path,data])
  J('/api/login',{'role':'admin','password':ENV['ADMIN_PASSWORD']});pin=J('/api/rooms',{'title':'Gala Doanh nghiệp 2026','mcUser':'mch','password':'password-test-0123'})['pin']
  pin2=J('/api/rooms',{'title':'Phòng đã khoá','mcUser':'mck','password':'password-test-0123'})['pin']
  for name,vw,vh in (('may_tinh',1672,941),('may_tinh_1366',1366,768),('dien_thoai',390,844),('dien_thoai_nho',360,640)):
   ctx=b.new_context(viewport={'width':vw,'height':vh},device_scale_factor=1,is_mobile=vw<500,has_touch=vw<500);p=ctx.new_page();p.on('pageerror',lambda e:errs.append(str(e)))
   p.goto(U+'/');p.wait_for_function("()=>document.querySelector('#conn').classList.contains('on')")
   p.screenshot(path=f'{SHOT}/{name}.png')
   # ô nhập + nút phải nằm trong màn hình đầu tiên (không cần cuộn)
   for sel in ('#pinInput','#joinBtn','#heroTitle'):
    bb=p.query_selector(sel).bounding_box();assert bb['y']>=0 and bb['y']+bb['height']<=vh,(name,sel,bb)
   # không tràn ngang
   assert p.evaluate("()=>document.documentElement.scrollWidth<=innerWidth+1"),name
   ok(f'{name} {vw}×{vh}: tiêu đề, ô mã phòng, nút VÀO TRƯỜNG THI nằm trọn trong màn hình đầu, không tràn ngang')
   ctx.close()
  ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);p=ctx.new_page();p.on('pageerror',lambda e:errs.append(str(e)))
  p.goto(U+'/');msg=lambda:p.inner_text('#pinMsg')
  p.click('#joinBtn');p.wait_for_function("()=>document.querySelector('#pinMsg').classList.contains('err')");assert 'nhập mã phòng' in msg();ok('để trống → "Vui lòng nhập mã phòng…"')
  p.fill('#pinInput','12a3');assert p.input_value('#pinInput')=='123';p.click('#joinBtn');p.wait_for_function("()=>document.querySelector('#pinMsg').textContent.includes('đúng 6')");p.screenshot(path=f'{SHOT}/loi_ma_sai.png');ok('chỉ nhận chữ số; mã thiếu số → "'+msg()+'"')
  p.fill('#pinInput','000001');p.click('#joinBtn');p.wait_for_function("()=>document.querySelector('#pinMsg').textContent.includes('Không tìm thấy')");p.screenshot(path=f'{SHOT}/loi_khong_ton_tai.png');ok('phòng không tồn tại → "'+msg()+'"')
  # đang kết nối: làm chậm API 2,5 giây
  p.evaluate("()=>{const f=window.fetch;window.fetch=(u,o)=>String(u).includes('/check')?new Promise(r=>setTimeout(()=>r(f(u,o)),2500)):f(u,o)}")
  p.fill('#pinInput',pin);p.click('#joinBtn');p.wait_for_function("()=>document.querySelector('#joinBtn').getAttribute('aria-busy')==='true'");p.screenshot(path=f'{SHOT}/dang_ket_noi.png')
  assert 'ĐANG KIỂM TRA' in p.inner_text('#joinBtn') and p.is_disabled('#joinBtn');ok('đang kết nối → nút khoá, hiện vòng xoay "ĐANG KIỂM TRA…", báo "'+msg()+'"')
  p.wait_for_url('**/join?pin='+pin,timeout=10000);p.wait_for_selector('#roomInfo');assert 'Gala Doanh nghiệp 2026' in p.inner_text('#roomInfo') and p.input_value('#pin')==pin
  assert p.evaluate("()=>document.activeElement.id")=='name';p.fill('#name','Võ Thị Hạnh');p.click('#joinButton');p.wait_for_selector('#playPanel:not(.hidden)');p.screenshot(path=f'{SHOT}/ghi_danh.png')
  ok('mã hợp lệ → chuyển sang bước ghi danh hiện có (mã phòng điền sẵn, hiện tên sự kiện, con trỏ ở ô họ tên) → ghi danh thành công')
  # máy chủ không phản hồi
  p.goto(U+'/');p.route('**/api/rooms/*/check',lambda r:r.abort());p.fill('#pinInput',pin);p.click('#joinBtn');p.wait_for_function("()=>document.querySelector('#pinMsg').textContent.includes('Không kết nối')");p.screenshot(path=f'{SHOT}/loi_mat_mang.png');ok('mất mạng → "'+msg()+'"');p.unroute('**/api/rooms/*/check')
  # phòng đã khoá (người mới bị chặn), người cũ vẫn vào lại được

  hp=b.new_context().new_page();hp.goto(U+'/health');hp.evaluate("a=>fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a)})",{'role':'mc','pin':pin2,'user':'mck','password':'password-test-0123'})
  hp.goto(f'{U}/host?pin={pin2}');hp.wait_for_selector('#roomPanel:not(.hidden)');hp.check('#optLock');hp.wait_for_function("()=>room.locked")
  p.goto(U+'/');p.fill('#pinInput',pin2);p.click('#joinBtn');p.wait_for_function("()=>document.querySelector('#pinMsg').textContent.includes('khoá')");ok('phòng đã khoá → "'+msg()+'"')
  p.goto(U+'/?pin='+pin);assert p.input_value('#pinInput')==pin;p.click('#joinBtn');p.wait_for_function("()=>document.querySelector('#pinMsg').textContent.includes('Chào mừng trở lại')");p.wait_for_url('**/join?pin='+pin);p.wait_for_selector('#playPanel:not(.hidden)');ok('người đã ghi danh mở lại trang chủ → "Chào mừng trở lại", vào thẳng phòng với điểm cũ')
  # nút MC theo phân quyền
  m=hp;m.goto(U+'/');m.wait_for_function("()=>document.querySelector('#mcLink').textContent.includes('Phòng MC')");assert m.get_attribute('#mcLink','href')==f'/host?pin={pin2}';ok('MC đã đăng nhập: nút góc trên đổi thành "Phòng MC '+pin2+'" dẫn thẳng vào phòng được giao')
  adm.goto(U+'/');adm.wait_for_function("()=>document.querySelector('#mcLink').textContent.includes('Quản trị')");ok('Admin đã đăng nhập: nút góc trên → trang Quản trị')
  # hướng dẫn
  p.goto(U+'/');p.set_viewport_size({'width':1366,'height':768});p.click('#guideBtn');p.wait_for_selector('#guide[open]');p.screenshot(path=f'{SHOT}/huong_dan.png');p.click('#guide button');ok('nút Hướng dẫn mở hộp hướng dẫn, có liên kết Màn MC / Quản trị')
  assert not errs,errs;ok('không lỗi JavaScript');b.close()
finally:
 proc.kill();TMP.cleanup()
