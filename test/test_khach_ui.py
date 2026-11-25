'''Cổng khách hàng /khach (trình duyệt): đăng nhập tài khoản khách, thấy gói, tạo phòng + MC, mở màn MC điều khiển phòng của mình,
lưu trữ & xoá phòng, tải CSV từ lưu trữ; Admin cấp tài khoản khách từ trang /admin. Chạy: python3 test/test_khach_ui.py'''
import json,os,shutil,subprocess,tempfile,time,urllib.request
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18957;TMP=tempfile.TemporaryDirectory();U=f'http://127.0.0.1:{PORT}'
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP.name+'/rooms.json','ADMIN_PASSWORD':'UDIKA-Local-Test-Password-8841','SESSION_SECRET':'udika-local-test-secret-random-1234567890','DATABASE_URL':''}
proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
def ok(s):print('PASS',s,flush=True)
try:
 for _ in range(100):
  try:urllib.request.urlopen(U+'/health');break
  except Exception:time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path=os.environ.get('CHROME_PATH') or shutil.which('google-chrome') or None,args=['--no-sandbox'])
  errs=[]
  ad=b.new_context().new_page();ad.on('pageerror',lambda e:errs.append(str(e)));ad.on('dialog',lambda d:d.accept())
  ad.goto(U+'/admin');ad.fill('#adminPassword',ENV['ADMIN_PASSWORD']);ad.click('#login');ad.wait_for_selector('#dash:not(.hidden)')
  ad.fill('#tName','Công ty Sao Mai');ad.fill('#tLogin','saomai');ad.fill('#tPass','password-saomai-01');ad.fill('#tRooms','1');ad.fill('#tPlayers','200');ad.fill('#tExp','2099-12-31')
  ad.click('#tCreate');ad.wait_for_function("()=>/ĐÃ CẤP/.test(document.querySelector('#tNotice').textContent)");ad.wait_for_function("()=>/Công ty Sao Mai/.test(document.querySelector('#tRows').textContent)")
  assert '1 phòng · 200 sĩ tử/phòng' in ad.text_content('#tRows')
  ok('Admin cấp tài khoản khách (1 phòng, 200 sĩ tử/phòng, hạn 31/12/2099) ngay trên trang /admin')
  ctx=b.new_context(viewport={'width':1280,'height':900});k=ctx.new_page();k.on('pageerror',lambda e:errs.append(str(e)));k.on('dialog',lambda d:d.accept())
  k.goto(U+'/khach');k.fill('#login','saomai');k.fill('#password','sai-mat-khau-0');k.click('#doLogin');k.wait_for_function("()=>!document.querySelector('#loginError').classList.contains('hidden')")
  k.fill('#password','password-saomai-01');k.click('#doLogin');k.wait_for_selector('#dash:not(.hidden)')
  assert 'Công ty Sao Mai' in k.text_content('#tName') and '0 / 1' in k.text_content('#plan') and '31/12/2099' in k.text_content('#plan')
  ok('Khách đăng nhập /khach (sai mật khẩu bị báo lỗi); thấy gói: phòng 0/1, hạn 31/12/2099')
  k.fill('#roomTitle','Hội thi Sao Mai');k.fill('#mcUser','mc-saomai');k.fill('#mcPassword','password-mc-0001');k.click('#createRoom')
  k.wait_for_function("()=>/ĐÃ TẠO PHÒNG/.test(document.querySelector('#roomNotice').textContent)");pin=k.text_content('#roomNotice b')
  k.wait_for_function(f"()=>document.querySelector('#roomRows').textContent.includes('{pin}')");k.wait_for_function("()=>document.querySelector('#plan').textContent.includes('1 / 1')")
  k.fill('#mcPassword','password-mc-0002');k.click('#createRoom');k.wait_for_function("()=>/tối đa 1 phòng/.test(document.querySelector('#roomNotice').textContent)")
  ok(f'Khách tạo phòng {pin} + MC; gói 1 phòng → tạo thêm bị máy chủ chặn, báo rõ "tối đa 1 phòng"')
  k.click('text=Mở màn MC');k.wait_for_url('**/host?pin='+pin);k.wait_for_function("()=>typeof room!=='undefined'&&room&&room.pin")
  assert k.evaluate('()=>room.pin')==pin
  ok('Chủ khách bấm "Mở màn MC" → điều khiển được phòng của mình (không cần tài khoản MC)')
  k.goto(U+'/khach');k.wait_for_selector('#dash:not(.hidden)');k.wait_for_function(f"()=>document.querySelector('#roomRows').textContent.includes('{pin}')")
  k.click('text=Lưu trữ & xoá');k.wait_for_function(f"()=>document.querySelector('#arRows').textContent.includes('{pin}')");k.wait_for_function("()=>document.querySelector('#plan').textContent.includes('0 / 1')")
  ok('Lưu trữ & xoá: phòng chuyển sang mục Lưu trữ, hạn mức trở lại 0/1')
  k.screenshot(path=TMP.name+'/khach.png',full_page=True)
  assert not errs,errs
  ok('Trang /khach và /admin không có lỗi JavaScript')
  if os.environ.get('SHOT'):k.screenshot(path=os.environ['SHOT'],full_page=True)
finally:proc.terminate()
