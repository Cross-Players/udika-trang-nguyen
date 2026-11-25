'''V15 – kiểm thử giao diện thật (Chrome): MC, màn LED (chính sách tự phát âm thanh THÔNG THƯỜNG), 2 điện thoại.
Ký hiệu < > được hiển thị đúng & an toàn (L02), chọn nhiều + ảnh phương án + xáo trộn, nhập số, sắp xếp bằng bàn phím,
câu có âm thanh "phát xong mới mở trả lời" (5.4), trình duyệt chặn tiếng được báo cho MC (L07/4.2), hạng cá nhân (4.1),
chế độ Tự tin, phóng to ảnh, chế độ sân khấu LED (4.7), bản xem trước nhập đề giữ lại khi máy chủ từ chối (L05). Chạy: python3 test/test_v15_ui.py'''
import base64,io,json,math,os,struct,subprocess,tempfile,time,urllib.request,wave
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18951;TMP=tempfile.TemporaryDirectory();SHOT=os.environ.get('SHOTS','/tmp/v15shots');os.makedirs(SHOT,exist_ok=True)
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP.name+'/rooms.json','ADMIN_PASSWORD':'UDIKA-Local-Test-Password-8841','SESSION_SECRET':'udika-local-test-secret-random-1234567890'}
proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);U=f'http://127.0.0.1:{PORT}'
def ok(s):print('PASS',s,flush=True)
def png(color,label):
 im=Image.new('RGB',(320,200),color);d=ImageDraw.Draw(im);d.rectangle([10,10,310,190],outline='white',width=6);d.text((120,90),label,fill='white');b=io.BytesIO();im.save(b,'PNG');return b.getvalue()
def wav(sec=2.5):
 b=io.BytesIO();w=wave.open(b,'wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(22050)
 w.writeframes(b''.join(struct.pack('<h',int(8000*math.sin(2*math.pi*220*i/22050))) for i in range(int(22050*sec))));w.close();return b.getvalue()
XSS='<img src=x onerror="window.__xss=1">'
try:
 for i in range(80):
  try:urllib.request.urlopen(U+'/health',timeout=2);break
  except Exception:time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
  bl=pw.chromium.launch(args=['--autoplay-policy=document-user-activation-required'])  # LED: chính sách tự phát thông thường
  errs=[]
  def page(br,url,w=1400,h=1000,mobile=False):
   ctx=br.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile);p=ctx.new_page();p.on('pageerror',lambda e:errs.append(url+': '+str(e)));p.on('dialog',lambda d:d.accept());p.goto(url);return p
  hc=b.new_context();host0=hc.new_page();host0.goto(U+'/health')
  J=lambda path,data:host0.evaluate("a=>fetch(a[0],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a[1])}).then(r=>r.json())",[path,data])
  J('/api/login',{'role':'admin','password':ENV['ADMIN_PASSWORD']});pin=J('/api/rooms',{'title':'Thử V15 <Khoa> & "Bảng"','mcUser':'mc15','password':'password-test-0123'})['pin']
  J('/api/login',{'role':'mc','pin':pin,'user':'mc15','password':'password-test-0123'})
  up=lambda data,name:J(f'/api/rooms/{pin}/media',{'name':name,'data':base64.b64encode(data).decode()})
  imA=up(png('#a33329','A'),'a.png')['src'];imB=up(png('#2f5d9a','B'),'b.png')['src'];imQ=up(png('#2e7a4f','Q'),'q.png')['src'];au=up(wav(),'trong.wav')
  assert au['kind']=='audio' and au['src'].endswith('.wav'),au;ok(f'tải lên âm thanh WAV (nhận dạng theo nội dung tệp) → {au["src"]}; ảnh PNG cho phương án')
  BANK=[{'stage':0,'kind':'mc','q':'So sánh: 5 < 10 & 20 > 15? '+XSS,'a':['<b>đậm</b> đúng','sai'],'c':0,'t':40},
   {'stage':0,'kind':'multi','q':'Chọn 2 ô màu đỏ & chữ "Đỏ"','a':['','','Đỏ','Xanh'],'ai':[imA,imB,'',''],'cs':[0,2],'shuffle':True,'t':40},
   {'stage':0,'kind':'number','q':'Một nửa của 25 kg?','c':12.5,'tol':0,'unit':'kg','t':40},
   {'stage':0,'kind':'order','q':'Xếp từ thấp đến cao','a':['Thi Hương','Thi Hội','Thi Đình'],'t':40},
   {'stage':0,'kind':'mc','q':'Nghe tiếng gì?','a':['Trống','Kèn'],'c':0,'t':40,'media':{'kind':'audio','src':au['src'],'end':2}},
   {'stage':1,'kind':'mc','q':'Ảnh câu hỏi màu gì?','a':['Xanh lá','Đỏ'],'c':0,'t':40,'media':{'kind':'image','src':imQ,'where':'both','alt':'Một ô màu'}}]
  host=hc.new_page();host.set_viewport_size({'width':1500,'height':1100});host.on('pageerror',lambda e:errs.append('host: '+str(e)));host.on('dialog',lambda d:d.accept());host.goto(f'{U}/host?pin={pin}');host.wait_for_selector('#roomPanel:not(.hidden)')
  host.evaluate("b=>emit({type:'bank_set',bank:b})",BANK);host.wait_for_function("()=>bank.length===6")
  host.evaluate("()=>emit({type:'set_option',autoReveal:false,streak:false,confidence:true})");host.wait_for_function("()=>room.confidence===true")
  led=page(bl,f'{U}/led?pin={pin}',1600,1000);led.wait_for_selector('#display:not(.hidden)')
  host.wait_for_function("()=>(room.leds||[]).length===1",timeout=8000);led_txt=host.inner_text('#ledStatus');assert 'LED' in led_txt,led_txt
  ok('MC thấy màn LED đang kết nối và trạng thái thật: '+led_txt.replace('\n',' '))
  # F03: LED ở máy khác (chưa đăng nhập) → MC bấm "đặt làm màn chính" để ghép đôi; chỉ màn đã ghép đôi mới tự mở lượt sau clip
  assert 'chưa ghép đôi' in led_txt,led_txt
  host.click('#ledStatus [data-mainled]');host.wait_for_function("()=>room.leds.some(l=>l.main)",timeout=8000);led.wait_for_function("()=>document.body.classList.contains('led-is-main')",timeout=8000)
  ok('MC bấm "đặt làm màn chính" trên giao diện → màn LED nhận token ghép đôi từ máy chủ ('+host.inner_text('#ledStatus').split('·')[-1].strip()+')')
  A=page(b,f'{U}/join?pin={pin}',390,844,True);Bp=page(b,f'{U}/join?pin={pin}',390,844,True)
  for p,n in ((A,'Nguyễn Văn An'),(Bp,'Trần Thị Bình')):p.fill('#name',n);p.click('#joinButton');p.wait_for_selector('#playPanel:not(.hidden)')
  def start():
   host.click('#start');host.wait_for_function("()=>['running','media'].includes(room.phase)")
  def reveal():host.click('#reveal');host.wait_for_function("()=>room.phase==='reveal'")
  def nxt():host.click('#next');host.wait_for_function("()=>['ready','intermission','finished'].includes(room.phase)");
  # ---- 1. L02 ký hiệu & chống chèn mã; chế độ tự tin ----
  start();A.wait_for_selector('#choices [data-id="0"]')
  for pg,nm in ((A,'điện thoại'),(led,'LED'),(host,'MC')):
   qtxt=pg.inner_text('#question');assert '5 < 10 & 20 > 15' in qtxt and XSS in qtxt,(nm,qtxt)
   bad=pg.evaluate("()=>[!!window.__xss,!!document.querySelector('#question img,#question b,#choices .tile-t b,#choices .tile-t img'),(document.querySelector('#choices')?.innerHTML||'').slice(0,500)]");assert not bad[0] and not bad[1],(nm,bad)
  assert '<b>đậm</b> đúng' in A.inner_text('#choices');ok('L02: "5 < 10 & 20 > 15" và chuỗi có thẻ HTML hiển thị NGUYÊN VĂN trên điện thoại, LED, MC – không bị xoá ký hiệu, không chạy mã chèn')
  assert A.is_visible('#boostIn');A.check('#boostIn');A.click('#choices [data-id="0"]');Bp.click('#choices [data-id="1"]')
  A.wait_for_function("()=>document.querySelector('#answerNote').textContent.includes('Đã lưu')");reveal()
  A.wait_for_function("()=>document.querySelector('#answerNote').textContent.includes('chắc chắn +50')");A.wait_for_function("()=>document.querySelector('#myRankLine').textContent.includes('1/2')")
  Bp.wait_for_function("()=>document.querySelector('#myRankLine').textContent.includes('2/2')");A.screenshot(path=SHOT+'/1_phone_reveal.png')
  ok('chế độ Tự tin: điện thoại có ô "💪 Chắc chắn", đúng → +50; 4.1: mỗi máy hiện dòng hạng riêng: '+Bp.inner_text('#myRankLine'));nxt()
  # ---- 2. chọn nhiều + ảnh phương án + xáo trộn ----
  start();A.wait_for_selector('#choices [data-pick="0"] img.opt-img');led.wait_for_function("()=>current&&current.q&&current.q.ids&&current.phase==='running'");ids=A.evaluate("()=>current.q.ids");ids_led=led.evaluate("()=>current.q.ids");assert ids==ids_led
  A.click('#choices [data-pick="0"]');A.click('#choices [data-pick="1"]');A.click('#choices [data-pick="1"]');A.click('#choices [data-pick="2"]')  # đổi ý trước khi nộp
  assert 'NỘP BÀI (2 đã chọn)' in A.inner_text('#pickGo');A.click('#pickGo');Bp.click('#choices [data-pick="0"]');Bp.click('#pickGo')
  time.sleep(.4);led.screenshot(path=SHOT+'/2_led_multi.png');reveal();led.wait_for_function("()=>document.querySelectorAll('#choices .choice.bar img.opt-img').length===2")
  A.wait_for_function("()=>document.querySelector('#answerNote').textContent.includes('Bạn đúng')");Bp.wait_for_function("()=>document.querySelector('#answerNote').textContent.includes('chưa đúng')")
  led.screenshot(path=SHOT+'/2_led_multi_reveal.png');ok(f'Q03/Q04: chọn nhiều có ảnh phương án, thứ tự xáo {ids} giống nhau trên LED & điện thoại; đổi lựa chọn trước khi NỘP; chọn đủ tập đúng mới đúng');nxt()
  # ---- 3. nhập số ----
  start();A.wait_for_selector('#typeIn');assert A.get_attribute('#typeIn','inputmode')=='decimal' and 'kg' in A.inner_text('#choices')
  A.fill('#typeIn','1,000');A.click('#typeGo');A.wait_for_function("()=>document.querySelector('#errors').textContent.includes('không rõ')");assert A.is_enabled('#typeIn')
  A.fill('#typeIn','12,5');A.press('#typeIn','Enter');Bp.fill('#typeIn','13 kg');Bp.click('#typeGo');A.wait_for_function("()=>document.querySelector('#answerNote').textContent.includes('Đã lưu')")
  reveal();A.wait_for_function("()=>document.querySelector('#answerNote').textContent.includes('Bạn đúng')");led.wait_for_function("()=>document.querySelector('#choices').textContent.includes('12,5 kg')")
  ok('Q07: nhập số – bàn phím số, đơn vị "kg" cạnh ô; "1,000" bị yêu cầu viết lại (ô vẫn mở để sửa), "12,5" đúng; LED công bố "12,5 kg"');nxt()
  # ---- 4. sắp xếp bằng bàn phím ----
  start();A.wait_for_selector('#choices .order-t')
  want=['Thi Hương','Thi Hội','Thi Đình']
  for target,w in enumerate(want):
   items=A.eval_on_selector_all('#choices .order-t','els=>els.map(e=>e.textContent.trim())');pos=items.index(w)
   while pos>target:A.focus(f'#choices [data-okey="{pos}"]');A.keyboard.press('ArrowUp');pos-=1
  assert A.evaluate("()=>document.activeElement.dataset.okey")!=None
  assert A.eval_on_selector_all('#choices .order-t','els=>els.map(e=>e.textContent.trim())')==want
  A.click('#orderGo');A.wait_for_function("()=>pending===null&&selected",timeout=10000);reveal();A.wait_for_function("()=>document.querySelector('#answerNote').textContent.includes('Bạn đúng')")
  ok('Q05: sắp xếp chỉ bằng bàn phím (mũi tên ▲▼, giữ tiêu điểm trên mục đang di chuyển) rồi NỘP → đúng');nxt()
  # ---- 5. âm thanh: phát xong mới mở lượt trả lời; trình duyệt LED chặn tiếng ----
  start();host.wait_for_function("()=>room.phase==='media'");A.wait_for_function("()=>document.querySelector('#choices').textContent.includes('Clip đang phát')")
  led.wait_for_selector('#ledMedia .audio-vis');host.wait_for_function("()=>(room.leds||[]).some(l=>l.sound==='blocked')",timeout=8000)
  ok('L07/4.2: LED mở bằng chính sách tự phát thông thường → MC thấy "'+host.inner_text('#ledStatus').split('·')[1].strip()+'" (không giả vờ đang có tiếng)')
  host.wait_for_function("()=>room.phase==='running'",timeout=12000);A.wait_for_selector('#choices [data-id="0"]')
  ok('5.4: âm thanh phát trên LED (đoạn 0–2 giây), LED báo phát xong → máy chủ tự mở lượt trả lời, điện thoại hiện đáp án');
  A.click('#choices [data-id="0"]');led.click('#soundBtn');host.wait_for_function("()=>(room.leds||[]).some(l=>l.sound==='on')",timeout=8000)
  host.click('[data-vq="test"]');host.wait_for_function("()=>document.querySelector('#vqLog').textContent.includes('thử tiếng')",timeout=8000)
  ok('MC bấm "Thử tiếng LED" → nhận xác nhận từ LED: '+host.inner_text('#vqLog').split('\n')[0]);reveal();nxt();nxt()
  # ---- 6. ảnh câu hỏi phóng to trên điện thoại ----
  start();A.wait_for_selector('[data-zoom]');assert A.get_attribute('[data-zoom] img','alt')=='Một ô màu';A.click('[data-zoom]');A.wait_for_selector('#zoom:not(.hidden) img');A.screenshot(path=SHOT+'/6_zoom.png');A.keyboard.press('Escape');A.wait_for_selector('#zoom.hidden',state='attached')
  ok('ảnh câu hỏi (phát ở "LED + điện thoại") chạm để phóng to, có mô tả cho trình đọc màn hình, Esc để đóng')
  # ---- 7. LED chế độ sân khấu ----
  led.click('#cleanBtn');led.wait_for_function("()=>document.body.classList.contains('led-clean')");assert led.is_hidden('header') and led.is_hidden('aside')
  wsc=led.evaluate("()=>document.querySelector('#ledScene').getBoundingClientRect().width");assert wsc>1500,wsc;led.screenshot(path=SHOT+'/7_led_clean.png')
  host.wait_for_function("()=>(room.leds||[]).some(l=>l.clean)");ok(f'4.7: LED "chế độ sân khấu" ẩn thanh tiêu đề/cột bên, khung trình chiếu rộng {wsc:.0f}px; MC thấy LED đang ở chế độ sân khấu')
  # ---- 8. MC soạn câu nhập số & chọn nhiều bằng giao diện ----
  host.click('[data-add="2"]');host.select_option('#editKind','number');assert host.is_visible('#editNum') and host.is_hidden('#editA')
  host.fill('#editQuestion','Năm khoa thi đầu tiên?');host.fill('#editNum','1075');host.fill('#editNumUnit','năm');host.fill('#editTime','30');host.click('#qSave')
  host.wait_for_function("()=>bank.some(q=>q.kind==='number'&&q.c===1075&&q.unit==='năm')");host.wait_for_function("()=>document.querySelector('#editorNote').textContent.includes('Đã lưu')")
  host.click('[data-add="2"]');host.select_option('#editKind','multi');host.fill('#editQuestion','Chọn số chẵn');host.fill('#editA','2');host.fill('#editB','3');host.fill('#editC','4');host.check('#multiBoxes [data-cs="0"]');host.check('#multiBoxes [data-cs="2"]');host.click('#qSave')
  host.wait_for_function("()=>bank.some(q=>q.kind==='multi'&&JSON.stringify(q.cs)==='[0,2]')");ok('MC soạn câu "nhập số" và "chọn nhiều đáp án" bằng giao diện; trạng thái "✔ Đã lưu lên máy chủ"')
  # ---- 9. L05: máy chủ từ chối → bản xem trước nhập đề vẫn còn ----
  host.check('#optBankLock') if host.is_visible('#optBankLock') else host.evaluate("()=>{document.querySelector('#rulesBox').open=true}")
  if not host.is_checked('#optBankLock'):host.check('#optBankLock')
  host.wait_for_function("()=>room.bankLocked===true")
  host.evaluate("()=>{importList=[{stage:2,kind:'mc',q:'Câu nhập thử',a:['A','B'],c:0,t:20}];renderImport([],'thu.xlsx',[])}");host.click('#importAppend')
  host.wait_for_function("()=>document.querySelector('#importStatus').textContent.includes('từ chối')");assert 'Câu nhập thử' in host.inner_text('#importResult')
  ok('L05: máy chủ từ chối (bộ đề đã khoá) → bản xem trước nhập đề VẪN CÒN kèm lý do, không mất chỉnh sửa');host.screenshot(path=SHOT+'/9_host.png',full_page=True)
  assert not errs,errs;ok('không lỗi JavaScript trên MC, LED, điện thoại')
  b.close();bl.close()
finally:proc.kill()
