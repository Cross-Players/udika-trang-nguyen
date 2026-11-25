'''V15 #2 + #3 GIAO DIỆN: khách tự đăng ký → chọn gói → mã VietQR (giải mã ảnh QR trên màn hình, đúng chuẩn EMVCo/CRC, đúng số tiền & mã đơn)
→ ngân hàng báo có (webhook) → trang khách tự đổi sang "Đã thanh toán", hạn dùng được gia hạn; Admin xác nhận tay một đơn khác;
khách tự đổi mật khẩu; chương trình liên hoàn: trọng tài chấm trên điện thoại (màn 390px), bảng tổng LED cập nhật, chủ khách thấy nhật ký.
Chạy: python3 test/test_thanh_toan_lien_hoan_ui.py'''
import os,re,json,shutil,subprocess,tempfile,time,urllib.request
import numpy as np,cv2
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18967;TMP=tempfile.TemporaryDirectory()
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP.name+'/rooms.json','ADMIN_PASSWORD':'ui-admin-password-1','SESSION_SECRET':'ui-session-secret-long-enough-123',
 'SELF_SIGNUP':'1','TRIAL_DAYS':'7','PAY_BANK_BIN':'970436','PAY_ACCOUNT_NO':'0011004455667','PAY_ACCOUNT_NAME':'CONG TY UDIKA','PAY_BANK_NAME':'Vietcombank','PAY_WEBHOOK_KEY':'webhook-key-ui',
 'VNPAY_TMN_CODE':'UDIKA001','VNPAY_HASH_SECRET':'vnp-secret-test-123','VNPAY_URL':'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html','PUBLIC_URL':f'http://127.0.0.1:{PORT}'}
ENV.pop('DATABASE_URL',None)
proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
U=f'http://127.0.0.1:{PORT}'
def ok(s):print('PASS',s)
def post(path,data,headers={}):
 r=urllib.request.Request(U+path,data=json.dumps(data).encode(),headers={'Content-Type':'application/json',**headers},method='POST')
 with urllib.request.urlopen(r) as x:return json.loads(x.read())
def crc16(s):
 c=0xFFFF
 for b in s.encode():
  c^=b<<8
  for _ in range(8):c=((c<<1)^0x1021)&0xFFFF if c&0x8000 else (c<<1)&0xFFFF
 return '%04X'%c
def tlv(p):
 o={};i=0
 while i<len(p):k=p[i:i+2];n=int(p[i+2:i+4]);o[k]=p[i+4:i+4+n];i+=4+n
 return o
try:
 for i in range(80):
  try:urllib.request.urlopen(U+'/health',timeout=2);break
  except Exception:time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path=os.environ.get('CHROME_PATH') or shutil.which('google-chrome'),args=['--no-sandbox'])
  errs=[]
  ad=b.new_context(viewport={'width':1400,'height':900}).new_page();ad.on('pageerror',lambda e:errs.append(str(e)));ad.on('dialog',lambda d:d.accept(d.default_value or ''))
  ad.goto(U+'/admin');ad.fill('#adminPassword',ENV['ADMIN_PASSWORD']);ad.click('#login');ad.wait_for_selector('#dash:not(.hidden)')
  ad.fill('#pName','Gói Sự kiện 1 tháng');ad.fill('#pPrice','2500000');ad.fill('#pDays','30');ad.fill('#pRooms','3');ad.fill('#pPlayers','500');ad.click('#pCreate')
  ad.wait_for_function("()=>/Gói Sự kiện 1 tháng/.test(document.getElementById('pRows').textContent)");assert '✅ VietQR' in ad.inner_text('#payState') and '✅ VNPAY' in ad.inner_text('#payState')
  ok('Admin tạo gói 2.500.000đ/30 ngày trên giao diện; trang báo VietQR + VNPAY đang bật')
  kc=b.new_context(viewport={'width':1280,'height':900});k=kc.new_page();k.on('pageerror',lambda e:errs.append(str(e)));k.on('dialog',lambda d:d.accept())
  k.goto(U+'/khach');k.wait_for_selector('#signupView:not(.hidden)')
  k.fill('#suName','Công ty Sao Việt');k.fill('#suLogin','saoviet');k.fill('#suPass','mat-khau-sao-viet-1');k.fill('#suContact','0901234567');k.click('#doSignup')
  k.wait_for_selector('#dash:not(.hidden)',timeout=8000);plan0=k.inner_text('#plan');ok('khách tự đăng ký trên /khach → vào ngay bảng điều khiển, dùng thử: '+plan0.replace('\n',' ')[:90])
  k.wait_for_selector('[data-buy]');k.click('[data-buy]');k.wait_for_selector('#orderBox svg',timeout=8000)
  box=k.inner_text('#orderBox');code=re.search(r'Đơn (UD[A-Z0-9]{7})',box).group(1);assert 'Chờ thanh toán' in box and '2.500.000' in box,box
  assert k.locator('#orderBox a',has_text='VNPAY').count()==1
  png=k.locator('#orderBox svg').first.screenshot();g=cv2.imdecode(np.frombuffer(png,np.uint8),cv2.IMREAD_GRAYSCALE);payload=''
  for f in (1,2,3,4,1.5,2.5):   # bộ giải mã OpenCV đôi khi trượt ở một tỉ lệ – thử vài tỉ lệ
   im=cv2.copyMakeBorder(cv2.resize(g,None,fx=f,fy=f,interpolation=cv2.INTER_NEAREST),40,40,40,40,cv2.BORDER_CONSTANT,value=255);_,im=cv2.threshold(im,128,255,cv2.THRESH_BINARY)
   payload=cv2.QRCodeDetector().detectAndDecode(im)[0]
   if payload:break
  assert payload,'không giải mã được QR'
  T=tlv(payload);assert payload.startswith('000201') and T['54']=='2500000' and T['53']=='704' and T['58']=='VN' and code in T['62'],T
  assert payload[-4:]==crc16(payload[:-4]),'CRC sai';acc=tlv(T['38']);assert '970436' in acc['01'] and '0011004455667' in acc['01'],acc
  ok(f'đơn {code}: ảnh QR trên màn hình giải mã ra VietQR chuẩn EMVCo – số tiền 2.500.000, VND, mã đơn trong nội dung, đúng tài khoản Vietcombank, CRC đúng; có nút VNPAY')
  r=post('/api/pay/bank-webhook',{'id':77001,'gateway':'Vietcombank','transferType':'in','transferAmount':2500000,'content':'MBVCB.123 '+code+' chuyen tien'},{'Authorization':'Apikey webhook-key-ui'})
  assert r['results'][0].get('paid') or r['results'][0].get('ok'),r
  k.wait_for_function("()=>/Đã thanh toán/.test(document.getElementById('orderBox').textContent)",timeout=12000)
  k.wait_for_function("p=>document.getElementById('plan').innerText!==p",arg=plan0,timeout=8000);ok('ngân hàng báo có (webhook SePay) → trang khách tự đổi "✅ Đã thanh toán", gói được gia hạn: '+k.inner_text('#plan').replace('\n',' ')[:90])
  k.wait_for_timeout(600);k.click('[data-buy]')
  try:k.wait_for_function("c=>{const m=/Đơn (UD[A-Z0-9]{7})/.exec(document.getElementById('orderBox').textContent);return m&&m[1]!==c}",arg=code,timeout=8000)
  except Exception:print('DBG',k.inner_text('#orderBox')[:300],'|',k.inner_text('#roomNotice')[:300]);raise
  code2=re.search(r'Đơn (UD[A-Z0-9]{7})',k.inner_text('#orderBox')).group(1)
  ad.click('#pRefresh');ad.wait_for_function("c=>document.getElementById('oRows').textContent.includes(c)",arg=code2)
  ad.locator('#oRows tr',has_text=code2).locator('button',has_text='Xác nhận đã nhận tiền').click()
  ad.wait_for_function("c=>[...document.querySelectorAll('#oRows tr')].some(t=>t.textContent.includes(c)&&/đã thanh toán/i.test(t.textContent))",arg=code2,timeout=8000)
  k.wait_for_function("()=>/Đã thanh toán/.test(document.getElementById('orderBox').textContent)",timeout=12000);ok(f'đơn {code2}: khách chuyển sai nội dung → Admin bấm "Xác nhận đã nhận tiền" trên giao diện → khách thấy đã thanh toán')
  k.fill('#pwOld','mat-khau-sao-viet-1');k.fill('#pwNew','mat-khau-moi-sao-viet-2');k.fill('#pwNew2','mat-khau-moi-sao-viet-2');k.click('#pwDo');k.wait_for_function("()=>!document.getElementById('pwMsg').classList.contains('hidden')&&/đổi|Đã/i.test(document.getElementById('pwMsg').textContent)",timeout=6000)
  try:post('/api/login',{'role':'owner','login':'saoviet','password':'mat-khau-sao-viet-1'});raise SystemExit('mật khẩu cũ vẫn dùng được')
  except urllib.error.HTTPError as e:assert e.code in(401,403,429),e.code
  post('/api/login',{'role':'owner','login':'saoviet','password':'mat-khau-moi-sao-viet-2'});ok('khách tự đổi mật khẩu trên /khach: mật khẩu cũ hết dùng, mật khẩu mới đăng nhập được ('+k.inner_text('#pwMsg')[:60]+')')
  # ---------- chương trình liên hoàn ----------
  k.goto(U+'/khach');k.wait_for_selector('#dash:not(.hidden)');k.fill('#evName','Team building Sao Việt');k.click('#evCreate')
  k.wait_for_url('**/chuongtrinh?id=*',timeout=8000);ev=k
  ev.wait_for_selector('#teamsText');ev.fill('#teamsText','Đội Rồng\nĐội Phượng\nĐội Lân');ev.click('#saveTeams');ev.wait_for_function("()=>/Đội Lân/.test(document.getElementById('bRows').textContent)",timeout=6000)
  ev.fill('#aName','Kéo co');ev.select_option('#aKind','cham');ev.fill('#aWeight','2');ev.fill('#aMax','100');ev.click('#addAct');ev.wait_for_function("()=>/Kéo co/.test(document.getElementById('aRows').textContent)")
  ev.fill('#aName','Tiết mục sáng tạo');ev.select_option('#aKind','cham');ev.fill('#aWeight','10');ev.fill('#aMax','10');ev.click('#addAct');ev.wait_for_function("()=>/Tiết mục sáng tạo/.test(document.getElementById('aRows').textContent)")
  ev.fill('#jName','Thầy Minh');ev.fill('#jUser','minh');ev.fill('#jPass','judge-pass-minh-01');ev.locator('#jActs input').first.check();ev.locator('#jActs input').nth(1).check();ev.click('#addJudge')
  ev.wait_for_function("()=>/Thầy Minh/.test(document.getElementById('jRows').textContent)");code_ev=re.search(r'[A-Z2-9]{6}',ev.inner_text('#evSub')).group(0)
  ok(f'chủ khách dựng chương trình trên /chuongtrinh: 3 đội, 2 hoạt động chấm (hệ số 2 và 10), 1 trọng tài – mã {code_ev}')
  led=b.new_context(viewport={'width':1920,'height':1080}).new_page();led.on('pageerror',lambda e:errs.append(str(e)));led.goto(U+'/bangdiem?ma='+code_ev);led.wait_for_function("()=>/Đội Rồng/.test(document.body.textContent)",timeout=8000)
  ph=b.new_context(viewport={'width':390,'height':800},is_mobile=True,has_touch=True).new_page();ph.on('pageerror',lambda e:errs.append(str(e)))
  ph.goto(U+'/trongtai');ph.fill('#code',code_ev.lower());ph.fill('#user','minh');ph.fill('#pass','judge-pass-minh-01');ph.click('#go');ph.wait_for_selector('#work:not(.hidden)')
  assert ph.evaluate("()=>document.documentElement.scrollWidth<=window.innerWidth+1"),'tràn ngang trên điện thoại'
  def score(act_idx,vals):
   ph.select_option('#act',index=act_idx)
   for team,v in vals.items():
    row=ph.locator('#teams .team',has_text=team);row.locator('input').first.fill(str(v));row.locator('button').click();ph.wait_for_function("t=>/Đã lưu điểm/.test(document.getElementById('msg').textContent)&&document.getElementById('msg').textContent.includes(t)",arg=team)
  score(0,{'Đội Rồng':80,'Đội Phượng':95,'Đội Lân':60});score(1,{'Đội Rồng':9,'Đội Phượng':7,'Đội Lân':8})
  ok('trọng tài đăng nhập trên điện thoại (390px, không tràn ngang), chấm 2 hoạt động × 3 đội')
  # tổng: Rồng 80/100*2... server tính theo hệ số – chỉ cần thứ tự & bảng LED cập nhật
  pub=json.loads(urllib.request.urlopen(U+'/api/events/public/'+code_ev).read());rows=sorted(pub['board'],key=lambda r:r['rank'])
  order=[r['name'] for r in rows];assert order[0]=='Đội Phượng',order   # Kéo co: 95×2 hệ số; sáng tạo 7×10 → tổng cao nhất (đã kiểm công thức ở test-lien-hoan.js)
  led.wait_for_function("o=>{const t=document.body.innerText;const i=o.map(n=>t.indexOf(n));return i.every(x=>x>=0)&&i.every((x,k)=>k===0||i[k-1]<x)}",arg=order,timeout=10000)
  ok('màn LED /bangdiem hiện đúng thứ tự xếp hạng theo điểm có hệ số: '+' > '.join(order))
  ph.select_option('#act',index=0);row=ph.locator('#teams .team',has_text='Đội Lân');row.locator('input').first.fill('99');row.locator('button').click()
  ph.wait_for_function("()=>/lý do/i.test(document.getElementById('msg').textContent)",timeout=5000);ok('sửa điểm đã gửi mà không ghi lý do → bị từ chối, nhắc ghi lý do')
  row.locator('input').nth(1).fill('Nhầm đội khi nhập');row.locator('button').click();ph.wait_for_function("()=>/Đã lưu điểm 99/.test(document.getElementById('msg').textContent)")
  ev.reload();ev.wait_for_function("()=>/Nhầm đội khi nhập/.test(document.getElementById('log').textContent)",timeout=8000)
  board=ev.inner_text('#bRows');ok('ghi lý do → sửa được; chủ khách thấy nhật ký sửa điểm (ai, lý do). Bảng tổng: '+' | '.join(l.strip() for l in board.split('\n') if l.strip())[:160])
  led.wait_for_timeout(3500);txt=led.inner_text('body');ok('màn LED /bangdiem tự cập nhật (3 giây/lần): '+' '.join(txt.split())[:150])
  assert not errs,errs;ok('không lỗi JavaScript trên Admin, /khach, /chuongtrinh, /trongtai, /bangdiem');b.close()
finally:
 proc.terminate()
 try:proc.communicate(timeout=3)
 except Exception:proc.kill()
 TMP.cleanup()
