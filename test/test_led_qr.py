'''Mã QR cỡ lớn trên màn LED (sảnh chờ kiểu Kahoot): hiện khi chờ sĩ tử, đọc được bằng camera từ ảnh chụp màn LED,
mã phòng khổng lồ, số người + tên người mới vào cập nhật trực tiếp, MC bật/tắt được, tự ẩn khi câu hỏi bắt đầu.
Chạy: python3 test/test_led_qr.py'''
import os,subprocess,tempfile,time,urllib.request,cv2,numpy as np
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18947;TMP=tempfile.TemporaryDirectory();SHOT=os.environ.get('SHOTS','/tmp/homeshots');os.makedirs(SHOT,exist_ok=True)
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP.name+'/rooms.json','ADMIN_PASSWORD':'UDIKA-Local-Test-Password-8841','SESSION_SECRET':'udika-local-test-secret-random-1234567890'}
proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);U=f'http://127.0.0.1:{PORT}'
def ok(s):print('PASS',s,flush=True)
def decode(png,scale=1.0):
  im=cv2.imdecode(np.frombuffer(png,np.uint8),cv2.IMREAD_COLOR)
  if scale!=1.0:im=cv2.resize(im,None,fx=scale,fy=scale,interpolation=cv2.INTER_AREA)
  return cv2.QRCodeDetector().detectAndDecode(im)[0]
try:
 for i in range(80):
  try:urllib.request.urlopen(U+'/health',timeout=2);break
  except Exception:time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch();errs=[]
  adm=b.new_context().new_page();adm.goto(U+'/health')
  J=lambda path,data:adm.evaluate("a=>fetch(a[0],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a[1])}).then(r=>r.json())",[path,data])
  J('/api/login',{'role':'admin','password':ENV['ADMIN_PASSWORD']});pin=J('/api/rooms',{'title':'Gala Tri thức Việt 2026','mcUser':'mcq','password':'password-test-0123'})['pin']
  led=b.new_context(viewport={'width':1920,'height':1080}).new_page();led.on('pageerror',lambda e:errs.append(str(e)))
  led.goto(f'{U}/led?pin={pin}');led.wait_for_function("()=>!document.querySelector('#display').classList.contains('hidden')||document.querySelector('#enterBtn')")
  # trang LED tự vào lại bằng ?pin= ; chỉ bấm "VÀO" nếu sau 3 giây vẫn còn màn nhập mã (trước đây kiểm tra rồi bấm ngay → chập chờn khi trang tự vào giữa chừng)
  try:led.wait_for_selector('#display:not(.hidden)',timeout=3000)
  except Exception:
   led.fill('#pinInput',pin);led.click('#enterBtn',timeout=5000)
  led.wait_for_selector('#joinGate:not(.hidden)');led.evaluate('document.fonts.ready');led.wait_for_timeout(500)
  scene=led.query_selector('#ledScene');bb=scene.bounding_box()
  qbb=led.query_selector('.jg-qr-frame svg').bounding_box()
  assert qbb['height']>=0.6*bb['height'],(qbb,bb)
  ok(f'sảnh chờ: QR chiếm {qbb["height"]/bb["height"]*100:.0f}% chiều cao màn LED ({qbb["width"]:.0f}px trên khung {bb["width"]:.0f}px)')
  assert led.inner_text('.jg-pin').replace(' ','')==pin;ok(f'mã phòng khổng lồ "{led.inner_text(".jg-pin")}" + địa chỉ "{led.inner_text(".jg-label")}"')
  png=scene.screenshot();open(f'{SHOT}/led_qr_lon.png','wb').write(png)
  want=f'{U}/join?pin={pin}'
  assert decode(png)==want;ok('camera đọc được QR trên ảnh chụp màn LED → '+want)
  # mô phỏng quét từ xa: thu nhỏ ảnh còn 1/4 (như đứng cuối hội trường)
  assert decode(png,0.25)==want;ok('vẫn đọc được khi ảnh thu nhỏ còn 25% (mô phỏng quét từ cuối hội trường)')
  # người chơi quét → vào phòng: số người và tên mới cập nhật trên LED
  names=['Nguyễn Văn An','Trần Thị Bích Ngọc','Lê Hoàng Quân']
  for n in names:
   pc=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True).new_page();pc.goto(want);pc.fill('#name',n);pc.click('#joinButton');pc.wait_for_selector('#playPanel:not(.hidden)')
  led.wait_for_function("()=>document.querySelector('.jg-count b').textContent.trim()==='3'")
  shown=led.inner_text('.jg-names');assert all(n in shown for n in names) and shown.index(names[-1])<shown.index(names[0]),shown
  led.wait_for_timeout(700);scene.screenshot(path=f'{SHOT}/led_qr_lon_3_nguoi.png');ok('3 sĩ tử quét mã vào phòng → LED cập nhật "3 sĩ tử đã ghi danh", tên người mới nhất đứng đầu')
  # MC điều khiển
  hp=b.new_context().new_page();hp.goto(U+'/health');hp.evaluate("a=>fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a)})",{'role':'mc','pin':pin,'user':'mcq','password':'password-test-0123'})
  hp.goto(f'{U}/host?pin={pin}');hp.wait_for_selector('#roomPanel:not(.hidden)');hp.wait_for_function("()=>document.querySelector('#bigQrBtn').dataset.on==='1'")
  hp.click('#bigQrBtn');led.wait_for_selector('#joinGate.hidden',state='attached');ok('MC bấm "Ẩn QR lớn trên LED" → LED trở về cảnh trường thi')
  hp.select_option('#optBigQr','auto');led.wait_for_selector('#joinGate:not(.hidden)');ok('MC chọn "Tự động" → QR lớn hiện lại khi đang chờ sĩ tử')
  hp.click('#start');led.wait_for_function("()=>current&&current.phase==='running'");led.wait_for_selector('#joinGate.hidden',state='attached');ok('MC mở câu hỏi → QR lớn tự ẩn, nhường màn hình cho đề thi')
  hp.click('#bigQrBtn');led.wait_for_selector('#joinGate:not(.hidden)');led.wait_for_timeout(700);assert decode(scene.screenshot())==want;scene.screenshot(path=f'{SHOT}/led_qr_lon_dang_thi.png')
  ok('đang thi, MC bấm "Chiếu QR lớn" cho người đến muộn → QR hiện và vẫn quét được')
  hp.click('#bigQrBtn');led.wait_for_selector('#joinGate.hidden',state='attached')
  # khởi động lại máy chủ: lựa chọn của MC được giữ
  hp.select_option('#optBigQr','off');hp.wait_for_function("()=>room.bigQr==='off'");time.sleep(1.2)
  proc.terminate();proc.wait();proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  for i in range(80):
   try:urllib.request.urlopen(U+'/health',timeout=2);break
   except Exception:time.sleep(.1)
  led.reload();
  # trang LED tự vào lại bằng ?pin= ; chỉ bấm "VÀO" nếu sau 3 giây vẫn còn màn nhập mã (trước đây kiểm tra rồi bấm ngay → chập chờn khi trang tự vào giữa chừng)
  try:led.wait_for_selector('#display:not(.hidden)',timeout=3000)
  except Exception:
   led.fill('#pinInput',pin);led.click('#enterBtn',timeout=5000)
  led.wait_for_function("()=>current&&current.bigQr==='off'",timeout=15000);assert led.is_hidden('#joinGate');ok('khởi động lại máy chủ → lựa chọn QR của MC được giữ nguyên')
  assert not errs,errs;ok('không lỗi JavaScript')
  b.close()
finally:proc.kill()
