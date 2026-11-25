'''V14 – kiểm thử giao diện thật trên Chrome: MC, màn LED, 3 điện thoại sĩ tử.
Dạng câu mới, đội, thưởng chuỗi, mời rời/chặn, QR tự tạo (giải mã bằng OpenCV), tự làm bài, kho đề. Chạy: python3 test/test_v14_ui.py'''
import json,os,subprocess,tempfile,time,urllib.request,sys
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18941;TMP=tempfile.TemporaryDirectory();SHOT=os.environ.get('SHOTS','/tmp/v14shots');os.makedirs(SHOT,exist_ok=True)
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP.name+'/rooms.json','ADMIN_PASSWORD':'UDIKA-Local-Test-Password-8841','SESSION_SECRET':'udika-local-test-secret-random-1234567890'}
proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
U=f'http://127.0.0.1:{PORT}'
def ok(s):print('PASS',s,flush=True)
BANK=[{'stage':0,'kind':'mc','q':'Kỳ thi nào cao nhất thời Lê?','a':['Thi Hương','Thi Hội','Thi Đình','Khảo hạch'],'c':2,'t':30},
 {'stage':0,'kind':'type','q':'Kinh đô thời Lê sơ tên là gì?','acc':['Thăng Long','Đông Kinh'],'loose':True,'t':30,'note':'Thăng Long được đổi tên thành Đông Kinh năm 1430.'},
 {'stage':0,'kind':'order','q':'Xếp các kỳ thi từ thấp đến cao','a':['Thi Hương','Thi Hội','Thi Đình'],'t':30},
 {'stage':0,'kind':'poll','q':'Bạn muốn đỗ danh hiệu nào?','a':['Trạng nguyên','Bảng nhãn','Thám hoa'],'t':30},
 {'stage':0,'kind':'slider','q':'Khoa thi Nho học đầu tiên năm nào?','min':1000,'max':1100,'step':1,'c':1075,'tol':3,'t':30},
 {'stage':0,'kind':'cloud','q':'Một từ bạn nghĩ tới khi nói về Văn Miếu','t':30},
 {'stage':1,'kind':'mc','q':'Văn Miếu ở Hà Nội?','a':['Đúng','Sai'],'c':0,'t':30}]
try:
 for i in range(80):
  try:urllib.request.urlopen(U+'/health',timeout=2);break
  except Exception:time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
  errs=[]
  def page(ctx,url,w=1400,h=1000):
   p=ctx.new_page();p.set_viewport_size({'width':w,'height':h});p.on('pageerror',lambda e:errs.append(url+': '+str(e)));p.on('dialog',lambda d:d.accept());p.goto(url);return p
  hc=b.new_context();adm=page(hc,U+'/health')
  J=lambda path,data,m='POST':adm.evaluate("a=>fetch(a[0],{method:a[2],headers:{'Content-Type':'application/json'},body:a[1]?JSON.stringify(a[1]):undefined}).then(r=>r.json())",[path,data,m])
  J('/api/login',{'role':'admin','password':ENV['ADMIN_PASSWORD']});pin=J('/api/rooms',{'title':'Thử giao diện V14','mcUser':'mcui','password':'password-test-0123'})['pin']
  J('/api/login',{'role':'mc','pin':pin,'user':'mcui','password':'password-test-0123'})
  host=page(hc,f'{U}/host?pin={pin}',1500,1100);host.wait_for_selector('#roomPanel:not(.hidden)')
  # QR tự tạo – không gọi dịch vụ ngoài
  assert host.query_selector('#qrBox svg') and 'qrserver' not in host.content();ok('MC: mã QR tự tạo trong app (không dùng dịch vụ ngoài)')
  host.evaluate("b=>emit({type:'bank_set',bank:b})",BANK);host.wait_for_function("()=>bank.length===7")
  # soạn câu thanh trượt bằng giao diện
  host.click('[data-add="1"]');host.select_option('#editKind','slider');host.fill('#editQuestion','Văn Miếu xây năm nào?');host.fill('#editMin','1000');host.fill('#editMax','1200');host.fill('#editStep','1');host.fill('#editVal','1070');host.fill('#editTol','2');host.fill('#editUnit','năm');host.fill('#editTime','25')
  assert host.is_hidden('#editA') and host.is_visible('#editMin');host.click('#qSave');host.wait_for_function("()=>bank.length===8&&bank.some(q=>q.kind==='slider'&&q.c===1070&&q.unit==='năm')");ok('MC: soạn câu thanh trượt bằng giao diện (ô nhập đổi theo dạng câu)')
  host.wait_for_timeout(500);host.click('[data-add="1"]');host.select_option('#editKind','type');assert host.is_visible('#editAcc') and host.is_hidden('#editMin');host.click('#qCancel')
  # đội
  host.click('#teamDetails summary');host.fill('#teamNames','Đội Hồng\nĐội Lam');host.click('#teamApply');host.wait_for_function("()=>room&&room.teams.length===2");ok('MC: bật chơi theo đội (2 đội)')
  led=page(b.new_context(),f'{U}/led?pin={pin}',1600,1000);led.wait_for_selector('#display:not(.hidden)');led.wait_for_selector('#joinQr svg')
  # giải mã QR trên màn LED
  led.query_selector('#joinQr').screenshot(path=SHOT+'/led_qr.png')
  import cv2;txt,_,_=cv2.QRCodeDetector().detectAndDecode(cv2.imread(SHOT+'/led_qr.png'));assert txt==f'{U}/join?pin={pin}',txt;ok('LED: QR quét ra đúng link vào phòng: '+txt)
  players=[]
  for name,team in (('Nguyễn Văn An','Đội Hồng'),('Trần Thị Bình','Đội Hồng'),('Lê Minh Châu','Đội Lam')):
   p=page(b.new_context(),f'{U}/join?pin={pin}',420,900);p.fill('#name',name);p.click('#joinButton');p.wait_for_selector('#playPanel:not(.hidden)');p.wait_for_selector('#teamBox .team-chip')
   p.click(f'#teamBox .team-list button:has-text("{team}")');p.wait_for_function(f"()=>current&&current.my&&current.teams.find(t=>t.id===current.my.team).name==={json.dumps(team)}");players.append(p)
  ok('3 điện thoại ghi danh, tự chọn đội')
  bad=page(b.new_context(),f'{U}/join?pin={pin}',420,800);bad.fill('#name','dcm thằng ngu');bad.click('#joinButton');bad.wait_for_function("()=>document.querySelector('#errors').textContent.includes('chưa phù hợp')");ok('tên phản cảm bị từ chối ngay trên điện thoại')
  def start():host.click('#start');host.wait_for_function("()=>room.phase==='running'")
  def reveal():host.click('#reveal');host.wait_for_function("()=>room.phase!=='running'")
  def nxt():host.click('#next');host.wait_for_function("()=>room.phase==='ready'")
  def answered(p):p.wait_for_function("()=>current&&current.my&&(current.my.answer||document.querySelector('#answerNote').textContent.includes('Đã'))")
  A,B,C=players
  # 1. trắc nghiệm
  start();A.click('#choices [data-id="2"]');B.click('#choices [data-id="2"]');C.click('#choices [data-id="0"]');time.sleep(.5);reveal()
  led.wait_for_function("()=>document.querySelectorAll('#choices .choice.bar').length===4");led.screenshot(path=SHOT+'/1_mc_reveal.png');nxt()
  # 2. gõ đáp án
  start();A.fill('#typeIn','thang long');A.click('#typeGo');B.fill('#typeIn','Đông Kinh');B.press('#typeIn','Enter');C.fill('#typeIn','Huế');C.click('#typeGo');time.sleep(.6)
  led.screenshot(path=SHOT+'/2_type_running.png');reveal();led.wait_for_selector('#choices .word-chip');A.wait_for_function("()=>document.querySelector('#answerNote').textContent.includes('chuỗi 2')")
  ok('gõ đáp án: "thang long" (không dấu) được chấp nhận, điện thoại báo chuỗi 2 câu đúng: '+A.inner_text('#answerNote'));led.screenshot(path=SHOT+'/2_type_reveal.png');nxt()
  # 3. sắp xếp: chạm theo thứ tự đúng
  start();A.screenshot(path=SHOT+'/3_order_phone.png')
  for p,right in ((A,True),(B,True),(C,False)):
   want=['Thi Hương','Thi Hội','Thi Đình'] if right else ['Thi Đình','Thi Hội','Thi Hương']
   for target,w in enumerate(want):  # xếp bằng nút ▲ (cảm ứng); mục 0 dùng phím mũi tên (bàn phím)
    items=p.eval_on_selector_all('#choices .order-t','els=>els.map(e=>e.textContent.trim())');pos=items.index(w)
    while pos>target:
     if target==0 and p is A:p.focus(f'#choices [data-okey="{pos}"]');p.keyboard.press('ArrowUp')
     else:p.click(f'#choices [data-up="{pos}"]')
     pos-=1
   assert p.eval_on_selector_all('#choices .order-t','els=>els.map(e=>e.textContent.trim())')==want
   p.click('#orderGo')
  time.sleep(.6);reveal();A.wait_for_function("()=>document.querySelector('#answerNote').textContent.includes('Bạn đúng')");C.wait_for_function("()=>document.querySelector('#answerNote').textContent.includes('chưa đúng')");led.screenshot(path=SHOT+'/3_order_reveal.png');ok('sắp xếp: đổi chỗ bằng nút ▲▼ và phím mũi tên, bấm NỘP, chấm đúng/sai');nxt()
  # 4. thăm dò: biểu đồ trực tiếp
  start();A.click('#choices [data-id="0"]');B.click('#choices [data-id="0"]');C.click('#choices [data-id="2"]')
  led.wait_for_function("()=>document.querySelector('#choices').textContent.includes('2 · 67%')",timeout=8000);led.screenshot(path=SHOT+'/4_poll_live.png');ok('thăm dò: LED cập nhật biểu đồ trực tiếp (2 · 67%)');reveal();nxt()
  # 5. thanh trượt
  start()
  for p,v in ((A,1075),(B,1077),(C,1090)):
   p.evaluate(f"()=>{{const s=document.querySelector('#slIn');s.value={v};s.dispatchEvent(new Event('input'))}}");p.click('#slGo')
  time.sleep(.6);reveal();led.wait_for_selector('#choices .hist');led.screenshot(path=SHOT+'/5_slider_reveal.png');A.wait_for_function("()=>document.querySelector('#answerNote').textContent.includes('Bạn đúng')");ok('thanh trượt: kéo – chốt giá trị, LED hiện biểu đồ phân bố');nxt()
  # 6. đám mây từ
  start()
  for p,t in ((A,'Khuê Văn Các'),(B,'khuê văn các'),(C,'Bia tiến sĩ')):p.fill('#typeIn',t);p.click('#typeGo')
  led.wait_for_function("()=>document.querySelectorAll('#choices .cloud span').length===2",timeout=8000);led.screenshot(path=SHOT+'/6_cloud.png');ok('đám mây từ: gộp "Khuê Văn Các" ×2, hiện trực tiếp trên LED');reveal()
  # bảng đội trên LED
  led.wait_for_selector('#teamPanel:not(.hidden) .team-row');ok('LED: bảng xếp hạng đội');led.screenshot(path=SHOT+'/7_team_board.png',full_page=True)
  # mời rời phòng bằng nút
  host.fill('#playerFilter','Lê Minh');host.wait_for_selector('#playerList [data-ban]');host.click('#playerList [data-ban]');C.wait_for_selector('#joinPanel:not(.hidden)')
  host.wait_for_function("()=>room.bannedNames.length===1&&room.count===2");C.fill('#name','Lê Minh Châu');C.click('#joinButton');C.wait_for_function("()=>document.querySelector('#errors').textContent.includes('bị MC chặn')");ok('MC bấm "Mời rời + chặn tên": điện thoại bị đưa ra, không vào lại được bằng tên cũ')
  host.screenshot(path=SHOT+'/8_host.png',full_page=True)
  # kho đề
  host.fill('#libName','Bộ đề thử V14');host.click('#libSave');host.wait_for_selector('#libList td:has-text("Bộ đề thử V14")');ok('kho đề: lưu bộ đề từ màn MC')
  # tự làm bài
  host.click('#reset');host.wait_for_function("()=>room.phase==='idle'");host.click('[data-mode="self"]');host.wait_for_function("()=>room.mode==='self'");assert host.is_checked('#optSelfHide'),'mặc định giữ kín kết quả';host.uncheck('#optSelfHide');host.wait_for_function("()=>room.selfHide===false");host.click('#selfOpen');host.wait_for_function("()=>room.phase==='self'")
  A.wait_for_selector('#selfGo');A.click('#selfGo');A.wait_for_selector('#choices [data-id]');A.screenshot(path=SHOT+'/9_self_q1.png');A.click('#choices [data-id="2"]')
  A.wait_for_selector('#selfGo');assert 'Chính xác' in A.inner_text('#question');A.screenshot(path=SHOT+'/9_self_feedback.png')
  A.click('#selfGo');A.wait_for_selector('#typeIn');A.click('#selfSkip');A.wait_for_function("()=>document.querySelector('#question').textContent.includes('bỏ qua')")
  ok('tự làm bài: bấm bắt đầu từng câu, chấm ngay "Chính xác", bỏ qua câu; MC thấy tiến độ');led.screenshot(path=SHOT+'/10_led_self.png')
  host.click('#selfClose');host.wait_for_function("()=>room.phase==='finished'");A.wait_for_selector('#finalPanel:not(.hidden)');ok('MC đóng bài → xướng danh')
  assert not errs,errs;ok('không có lỗi JavaScript trên MC, LED, điện thoại')
  b.close()
finally:
 proc.terminate()
 try:proc.communicate(timeout=3)
 except Exception:proc.kill()
 TMP.cleanup()
