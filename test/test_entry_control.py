'''4.6 Kiểm soát người tham gia: duyệt tên (người chờ thấy "đang chờ", MC duyệt → vào thẳng; từ chối/chặn), danh sách dự kiến
(nhập bằng tên hoặc mã; tên hiển thị lấy theo danh sách; mã chỉ MC thấy; một dòng một thiết bị), "chỉ danh sách", không nhận người vào muộn,
thống kê ai chưa vào, mã dự thi có trong báo cáo CSV; thiết lập còn nguyên sau khi máy chủ khởi động lại.'''
import os,subprocess,tempfile,time,urllib.request
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18977;TMP=tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP.name+'/r.json','ADMIN_PASSWORD':'UDIKA-Local-Test-Password-8841','SESSION_SECRET':'udika-local-test-secret-random-1234567890'}
U=f'http://127.0.0.1:{PORT}'
def boot():
 p=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 for i in range(100):
  try:urllib.request.urlopen(U+'/health',timeout=2);return p
  except Exception:time.sleep(.1)
 raise SystemExit('server not ready')
def ok(s):print('PASS',s,flush=True)
proc=boot()
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch();errs=[]
  h=b.new_context(viewport={'width':1400,'height':1000}).new_page();h.on('pageerror',lambda e:errs.append(str(e)));h.goto(U+'/health')
  J=lambda path,data:h.evaluate("a=>fetch(a[0],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a[1])}).then(r=>r.json())",[path,data])
  J('/api/login',{'role':'admin','password':ENV['ADMIN_PASSWORD']});pin=J('/api/rooms',{'title':'Kiểm soát','mcUser':'mcentry','password':'password-test-0123'})['pin']
  h.goto(f'{U}/host?pin={pin}');h.wait_for_selector('#roomPanel:not(.hidden)')
  def phone(name,code=''):
   p=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True).new_page();p.on('pageerror',lambda e:errs.append(str(e)));p.goto(f'{U}/join?pin={pin}')
   if name:p.fill('#name',name)
   if code:p.click('#codeOpt summary');p.fill('#code',code)
   p.click('#joinButton');return p
  inside=lambda p:p.wait_for_selector('#playPanel:not(.hidden)',timeout=8000)
  # --- duyệt tên ---
  h.select_option('#entryMode','approve');h.wait_for_function("()=>room&&room.entry==='approve'")
  a=phone('Nguyễn Văn An');a.wait_for_selector('#joinWait:not(.hidden)');assert 'chờ MC duyệt' in a.text_content('#joinWait')
  x=phone('Kẻ Phá Rối')
  h.wait_for_function("()=>document.querySelectorAll('#pendingList .pending-row').length===2");assert '2 người chờ duyệt' in h.text_content('#pendingTitle')
  ok('chế độ Duyệt tên: điện thoại hiện "đang chờ MC duyệt", MC thấy 2 người chờ')
  h.locator('#pendingList .pending-row',has_text='Nguyễn Văn An').locator('[data-ap]').click();inside(a);ok('MC bấm Duyệt → điện thoại vào thẳng phòng thi, không phải nhập lại')
  h.once('dialog',lambda d:d.accept());h.locator('#pendingList .pending-row',has_text='Kẻ Phá Rối').locator('[data-db]').click()
  x.wait_for_function("()=>/không duyệt|chặn/.test(document.querySelector('#errors').textContent)");x.click('#joinButton');x.wait_for_function("()=>/bị MC chặn/.test(document.querySelector('#errors').textContent)")
  ok('Từ chối + chặn tên: người đó nhận thông báo và không gửi lại được tên ấy')
  # --- danh sách dự kiến ---
  h.click('#rosterDetails summary');h.fill('#rosterText','Mã, Họ tên\nSV001, Trần Thị Bình\nSV002, Lê Minh Châu\nPhạm Đức Dũng');h.click('#rosterSave')
  h.wait_for_function("()=>room&&room.roster&&room.roster.total===3");h.select_option('#entryMode','roster');h.wait_for_function("()=>room.entry==='roster'")
  c=phone('','sv002');inside(c);assert c.input_value('#name')=='Lê Minh Châu';ok('theo danh sách: nhập MÃ "sv002" (không phân biệt hoa/thường) → vào ngay, tên hiển thị lấy theo danh sách')
  d2=phone('pham duc dung');inside(d2);assert d2.input_value('#name')=='Phạm Đức Dũng'
  d=phone('Ngoài Danh Sách');d.wait_for_selector('#joinWait:not(.hidden)');assert 'chưa có trong danh sách' in d.text_content('#joinWait')
  ok('gõ họ tên không dấu vẫn nhận ra người trong danh sách (hiển thị đúng "Phạm Đức Dũng"); người ngoài danh sách vào hàng chờ duyệt')
  c2=phone('','SV002');c2.wait_for_function("()=>/thiết bị khác/.test(document.querySelector('#errors').textContent)");ok('một dòng danh sách chỉ dùng trên một thiết bị (mã SV002 lần 2 bị từ chối)')
  h.wait_for_function("()=>room.roster.joined===2");assert 'Trần Thị Bình' in h.text_content('#rosterMissing');ok('MC thấy 2/3 đã vào và tên người chưa vào')
  h.wait_for_function("()=>[...document.querySelectorAll('#playerList .player-row')].some(r=>/Lê Minh Châu/.test(r.textContent)&&/SV002/.test(r.textContent))")
  led=b.new_context().new_page();led.goto(f'{U}/led?pin={pin}');led.wait_for_timeout(1200);assert 'SV002' not in led.content();ok('mã dự thi hiện trong danh sách của MC, không xuất hiện trên LED')
  # --- chỉ danh sách ---
  h.select_option('#entryMode','roster_only');h.wait_for_function("()=>room.entry==='roster_only'")
  e=phone('Người Lạ');e.wait_for_function("()=>/chỉ nhận người có tên trong danh sách/.test(document.querySelector('#errors').textContent)");ok('Chỉ danh sách: người ngoài danh sách bị từ chối kèm hướng dẫn')
  # chuyển về Mở → người đang chờ (pham duc dung) được vào luôn
  h.once('dialog',lambda d:d.accept());h.select_option('#entryMode','open');inside(d);ok('chuyển về "Mở": người đang chờ được vào luôn (có hỏi MC xác nhận)')
  # --- vào muộn ---
  h.select_option('#lateMode','block');h.wait_for_function("()=>room.late==='block'");h.click('#start');h.wait_for_function("()=>room.phase==='running'")
  f=phone('Đến Muộn');f.wait_for_function("()=>/không nhận người vào muộn/.test(document.querySelector('#errors').textContent)")
  a.reload();inside(a);ok('Không nhận vào muộn: người mới bị chặn sau khi mở câu 1, người đã ghi danh tải lại trang vẫn vào được')
  csv=h.evaluate("p=>fetch('/api/rooms/'+p+'/report.csv').then(r=>r.text())",pin)
  assert 'Mã dự thi' in csv and 'SV002' in csv,csv[:400];ok('báo cáo CSV có cột Mã dự thi')
  assert not errs,errs
 proc.terminate();proc.wait();proc=boot()
 with sync_playwright() as pw:
  b=pw.chromium.launch();h=b.new_context().new_page();h.goto(U+'/health')
  h.evaluate("a=>fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a)})",{'role':'admin','password':ENV['ADMIN_PASSWORD']})
  h.goto(f'{U}/host?pin={pin}');h.wait_for_function("()=>room&&room.roster")
  assert h.evaluate("()=>[room.late,room.roster.total,room.roster.joined]")==['block',3,2];ok('khởi động lại máy chủ: luật vào muộn, danh sách dự kiến và ai đã vào vẫn còn nguyên')
finally:proc.terminate()
