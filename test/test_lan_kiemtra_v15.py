'''V15 #1 + #3: chạy mạng nội bộ (npm run lan) và trang tự kiểm tra máy (/kiem-tra).
Kiểm: lan.js tự tạo mật khẩu/khoá phiên & in địa chỉ LAN + mã QR; /api/lan-info; màn LED/MC mở bằng localhost in QR theo địa chỉ LAN;
trang Admin hiện thẻ LAN; trang /kiem-tra chạy đủ mục, gửi kết quả cho MC (tổng hợp trên màn MC + bảng CSV); trình duyệt trong Zalo bị cảnh báo;
mọi trang tải được khi KHÔNG có Internet (chặn mọi địa chỉ ngoài máy chủ). Chạy: python3 test/test_lan_kiemtra_v15.py'''
import os,re,json,shutil,subprocess,tempfile,time,urllib.request
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18966;TMP=tempfile.TemporaryDirectory()
ENV={k:v for k,v in os.environ.items() if k not in('ADMIN_PASSWORD','SESSION_SECRET')};ENV.update({'PORT':str(PORT),'DATA_DIR':TMP.name})
proc=subprocess.Popen(['node','lan.js'],cwd=ROOT,env=ENV,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
def ok(s):print('PASS',s)
try:
 for i in range(100):
  try:urllib.request.urlopen(f'http://127.0.0.1:{PORT}/health',timeout=2);break
  except Exception:time.sleep(.1)
 sec=json.load(open(TMP.name+'/lan-secrets.json'));assert len(sec['adminPassword'])>=12 and len(sec['sessionSecret'])==64
 assert oct(os.stat(TMP.name+'/lan-secrets.json').st_mode)[-3:]=='600'
 ok('lan.js tự tạo mật khẩu Admin + khoá phiên ngẫu nhiên, lưu tệp quyền 600 (khởi động lại dùng lại, sĩ tử không bị đăng xuất)')
 info=json.loads(urllib.request.urlopen(f'http://127.0.0.1:{PORT}/api/lan-info').read());assert info['lan'] and info['urls'] and info['urls'][0].endswith(f':{PORT}'),info
 LAN=info['urls'][0];ok('/api/lan-info (chế độ LAN) trả địa chỉ cho điện thoại: '+LAN)
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path=os.environ.get('CHROME_PATH') or shutil.which('google-chrome'),args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
  ext=[]
  def offline(ctx):  # giả lập hội trường KHÔNG có Internet: mọi yêu cầu ra ngoài máy chủ đều bị chặn & ghi lại
   ctx.route(re.compile(r'^https?://(?!127\.0\.0\.1:%d|localhost:%d)'%(PORT,PORT)),lambda r:(ext.append(r.request.url),r.abort()))
  ctx=b.new_context(viewport={'width':1400,'height':900});offline(ctx);pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto(f'http://127.0.0.1:{PORT}/admin');J=lambda path,data,m='POST':pg.evaluate("a=>fetch(a[0],{method:a[2],headers:{'Content-Type':'application/json'},body:a[1]?JSON.stringify(a[1]):undefined}).then(r=>r.json())",[path,data,m])
  assert J('/api/login',{'role':'admin','password':sec['adminPassword']}).get('ok') is not False
  pin=J('/api/rooms',{'title':'Hội diễn LAN','mcUser':'mclan','password':'password-lan-0123'})['pin']
  pg.reload();pg.wait_for_selector('#lanCard:not(.hidden)',timeout=6000);t=pg.inner_text('#lanCard');assert LAN+'/join' in t and pg.locator('#lanCard svg').count()==1,t
  ok('trang Admin hiện thẻ "Chạy mạng nội bộ" với địa chỉ + mã QR cho điện thoại')
  J('/api/login',{'role':'mc','pin':pin,'user':'mclan','password':'password-lan-0123'})
  host=ctx.new_page();host.on('pageerror',lambda e:errs.append(str(e)));host.goto(f'http://localhost:{PORT}/health')
  host.evaluate("a=>fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a)})",{'role':'mc','pin':pin,'user':'mclan','password':'password-lan-0123'});host.goto(f'http://localhost:{PORT}/host?pin={pin}')
  host.wait_for_function("u=>document.querySelector('#joinLink')&&document.querySelector('#joinLink').href.startsWith(u)",arg=LAN,timeout=8000)
  ok('màn MC mở bằng localhost → link/QR sĩ tử dùng địa chỉ LAN ('+host.get_attribute('#joinLink','href')+')')
  led=ctx.new_page();led.on('pageerror',lambda e:errs.append(str(e)));led.goto(f'http://localhost:{PORT}/led?pin={pin}')
  led.wait_for_function("u=>typeof qrFor==='string'&&qrFor.startsWith(u)",arg=LAN,timeout=8000);ok('màn LED mở bằng localhost → mã QR in địa chỉ LAN')
  # ---- trang kiểm tra máy (điện thoại giả lập) ----
  ph=b.new_context(viewport={'width':390,'height':780},user_agent='Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',is_mobile=True,has_touch=True);offline(ph)
  m=ph.new_page();m.on('pageerror',lambda e:errs.append(str(e)));m.goto(f'http://127.0.0.1:{PORT}/join?pin={pin}')
  assert m.get_attribute('#checkLink','href')==f'/kiem-tra?pin={pin}';m.click('#checkLink');m.wait_for_url('**/kiem-tra?pin=*')
  m.fill('#name','Nguyễn Văn An');m.wait_for_function("()=>document.querySelector('[data-k=lat]').dataset.level!=='run'",timeout=10000)
  lv={k:m.get_attribute(f'[data-k={k}]','data-level') for k in ['browser','ws','lat','clock','storage','screen','wake','audio','typing']}
  assert lv['ws']=='ok' and lv['lat']=='ok' and lv['browser']=='ok' and lv['audio']=='todo' and lv['typing']=='todo',lv;ok('trang /kiem-tra tự thử: trình duyệt, kết nối thời gian thực, độ trễ, đồng hồ, lưu tạm, màn hình '+json.dumps(lv,ensure_ascii=False))
  m.click('#beep');m.click('#yes');m.fill('#typing','Trạng nguyên Lương Thế Vinh'.lower());m.wait_for_function("()=>document.querySelector('[data-k=typing]').dataset.level==='ok'")
  m.wait_for_function("()=>/đã gửi kết quả cho MC/.test(document.getElementById('verdict').textContent)",timeout=6000)
  ok('thử tiếng + gõ tiếng Việt có dấu (so theo chuẩn NFC) → '+m.inner_text('#verdict'))
  # gõ dạng tổ hợp (NFD – vài bàn phím cũ) vẫn được tính đúng
  m.fill('#typing','');m.evaluate("()=>{const i=document.getElementById('typing');i.value='Trạng nguyên Lương Thế Vinh'.normalize('NFD');i.dispatchEvent(new Event('input'))}");assert m.get_attribute('[data-k=typing]','data-level')=='ok';ok('chữ dạng tổ hợp (NFD) vẫn được nhận là gõ đúng')
  host.wait_for_function("()=>/1 máy/.test(document.getElementById('devSum').textContent)",timeout=6000);ok('màn MC thấy tổng hợp kiểm tra máy: '+host.inner_text('#devSum'))
  z=b.new_context(viewport={'width':390,'height':780},user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Zalo iOS/23.06.01');offline(z)
  zp=z.new_page();zp.goto(f'http://127.0.0.1:{PORT}/kiem-tra?pin={pin}');zp.fill('#name','Trần Thị Bé');zp.wait_for_function("()=>document.querySelector('[data-k=lat]').dataset.level!=='run'",timeout=10000)
  assert zp.get_attribute('[data-k=browser]','data-level')=='warn' and 'Zalo' in zp.inner_text('[data-k=browser]');zp.click('#beep');zp.click('#no')
  host.wait_for_function("()=>/2 máy/.test(document.getElementById('devSum').textContent)&&/⚠/.test(document.getElementById('devSum').textContent)",timeout=6000)
  ok('mở trong Zalo → cảnh báo "nên mở bằng Chrome/Safari"; không nghe tiếng → MC thấy '+host.inner_text('#devSum'))
  csv=host.evaluate("p=>fetch('/api/rooms/'+p+'/devices.csv').then(r=>r.text())",pin);assert 'Nguyễn Văn An' in csv and 'Trần Thị Bé' in csv and 'CẢNH BÁO' in csv and 'Zalo' in csv,csv[:400]
  ok('MC tải bảng CSV kiểm tra máy: '+str(csv.count('\n'))+' dòng, máy có vấn đề xếp đầu')
  anon=b.new_context().new_page();r=anon.goto(f'http://127.0.0.1:{PORT}/api/rooms/{pin}/devices.csv');assert r.status==403;ok('người ngoài không tải được bảng kiểm tra máy (403)')
  assert not ext,ext;ok('KHÔNG có yêu cầu nào ra Internet khi mở Admin, MC, LED, trang vào thi, trang kiểm tra (chạy được ở hội trường không Internet)')
  assert not errs,errs;ok('không lỗi JavaScript');b.close()
finally:
 proc.terminate()
 try:o,_=proc.communicate(timeout=4)
 except Exception:proc.kill();o=''
 assert 'CHẠY MẠNG NỘI BỘ' in o and '/join' in o and '▄' in o and 'cách ly máy khách' in o,o[:500];print('PASS lan.js in hướng dẫn hội trường + địa chỉ + mã QR trên màn hình dòng lệnh')
 TMP.cleanup()
