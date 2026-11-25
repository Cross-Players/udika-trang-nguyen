'''Cải tiến từ phản ánh người dùng Kahoot (25/11/2026):
A. Phân biệt "không trả lời" / "mất kết nối" / "gửi trễ do mạng" cho từng người, từng câu trong báo cáo (bằng chứng khi trao giải).
B. MC GIỮ bảng điểm & bảng vàng: dữ liệu xếp hạng không tới điện thoại/LED cho tới khi MC bấm.
C. Luật điểm theo từng vòng (chặng): vòng kiến thức không tính tốc độ, vòng phản xạ có thưởng tốc độ.
D. Tự lưu nháp soạn câu: tải lại trang vẫn khôi phục được; lưu xong thì xoá nháp.
E. Màn kiểm tra trước giờ diễn: báo tệp hỏng, tệp sẵn sàng, câu âm thanh cần tiếng, tình trạng màn LED.'''
import base64,io,math,os,struct,subprocess,tempfile,time,urllib.request,wave
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18973;TMP=tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP.name+'/r.json','ADMIN_PASSWORD':'UDIKA-Local-Test-Password-8841','SESSION_SECRET':'udika-local-test-secret-random-1234567890'}
proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);U=f'http://127.0.0.1:{PORT}'
def ok(s):print('PASS',s,flush=True)
def wav(sec=1.0):
 b=io.BytesIO();w=wave.open(b,'wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(22050);w.writeframes(b''.join(struct.pack('<h',int(6000*math.sin(2*math.pi*330*i/22050))) for i in range(int(22050*sec))));w.close();return b.getvalue()
try:
 for i in range(80):
  try:urllib.request.urlopen(U+'/health',timeout=2);break
  except Exception:time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch();errs=[]
  hc=b.new_context(viewport={'width':1400,'height':950});h=hc.new_page();h.on('pageerror',lambda e:errs.append(str(e)));h.goto(U+'/health')
  J=lambda path,data:h.evaluate("a=>fetch(a[0],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a[1])}).then(r=>r.json())",[path,data])
  J('/api/login',{'role':'admin','password':ENV['ADMIN_PASSWORD']});pin=J('/api/rooms',{'title':'Phản ánh Kahoot','mcUser':'mckh','password':'password-test-0123'})['pin']
  h.goto(f'{U}/host?pin={pin}');h.wait_for_selector('#roomPanel:not(.hidden)')
  emit=lambda m:h.evaluate("m=>emit(m)",m)
  emit({'type':'bank_set','bank':[{'q':'Kiến thức 1','a':['Đúng','Sai'],'c':0,'t':30,'stage':0},{'q':'Kiến thức 2','a':['Đúng','Sai'],'c':0,'t':30,'stage':0},{'q':'Phản xạ','a':['Đúng','Sai'],'c':0,'t':30,'stage':1}]})
  h.wait_for_function("()=>bank.length===3");emit({'type':'set_option','autoReveal':False,'bigQr':'off','streak':False,'stageScoring':{'0':'accuracy','1':'speed'},'holdBoard':True})
  h.wait_for_function("()=>room.holdBoard&&room.stageScoring&&room.stageScoring[0]==='accuracy'")
  def phone(n):
   p=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True).new_page();p.on('pageerror',lambda e:errs.append(str(e)));p.goto(f'{U}/join?pin={pin}');p.fill('#name',n);p.click('#joinButton');p.wait_for_selector('#playPanel:not(.hidden)');return p
  P1,P2,P3,P4=phone('Trả Lời'),phone('Im Lặng'),phone('Rớt Mạng'),phone('Gửi Trễ')
  led=b.new_page(viewport={'width':1280,'height':720});led.goto(f'{U}/led?pin={pin}');led.wait_for_selector('#display:not(.hidden)')
  # ---- câu 1 (vòng kiến thức, chấm chính xác) ----
  h.click('#start');P1.wait_for_selector('#choices button')
  assert 'ĐỘ CHÍNH XÁC' in P1.text_content('#answerNote').upper(),P1.text_content('#answerNote')
  time.sleep(2);P1.click('#choices button >> nth=0');P1.wait_for_function("()=>/Đã lưu bài nộp/.test(document.querySelector('#answerNote').textContent)")
  P3.context.close()  # mất kết nối, không trả lời
  h.click('#reveal');h.wait_for_function("()=>room.phase==='reveal'")
  # P4 gửi bài SAU khi đã đóng (mạng chậm)
  P4.evaluate("()=>socket.send(JSON.stringify({type:'answer',eid:current.eid,qid:current.q.qid,sid:'late1',choice:0}))");time.sleep(.6)
  # ---- B: giữ bảng điểm ----
  st=P1.evaluate("()=>current");ls=led.evaluate("()=>current")
  assert st['boardHeld'] and st['leaderboard']==[] and st['my']['rank'] is None,st['leaderboard']
  assert ls['boardHeld'] and ls['leaderboard']==[] and ls['teamBoard']==[],'LED không được nhận bảng điểm khi MC đang giữ'
  assert st['my']['score']==1000,'vòng kiến thức: chấm chính xác 1.000 điểm dù trả lời sau 2 giây (không tính tốc độ): '+str(st['my']['score'])
  ok('C: vòng "Lớp thầy đồ" đặt luật CHÍNH XÁC – trả lời sau 2 giây vẫn đủ 1.000 điểm; điện thoại hiện "Vòng này chấm theo ĐỘ CHÍNH XÁC"')
  assert h.is_visible('#showBoard');h.click('#showBoard');P1.wait_for_function("()=>current&&current.leaderboard&&current.leaderboard.length>0&&current.my.rank===1")
  led.wait_for_function("()=>current&&current.leaderboard.length>0")
  ok('B: MC bật "tự mở bảng điểm" → sau công bố, điện thoại & LED KHÔNG nhận bảng xếp hạng/thứ hạng/điểm đội (dữ liệu giữ ở máy chủ); MC bấm "HIỆN BẢNG ĐIỂM" mới gửi')
  # ---- câu 2 & 3 ----
  emit({'type':'next'});h.wait_for_function("()=>room.idx===1");h.click('#start');P1.wait_for_selector('#choices button:not([disabled])');P1.click('#choices button >> nth=0');time.sleep(.4)
  h.click('#reveal');h.wait_for_function("()=>room.phase==='reveal'");emit({'type':'next'});h.wait_for_function("()=>room.phase==='intermission'")
  assert P1.evaluate("()=>current.stageLeaders.length")==0,'tổng kết chặng cũng được giữ';h.click('#showBoard');P1.wait_for_function("()=>current.stageLeaders.length>0")
  emit({'type':'next'});h.wait_for_function("()=>room.idx===2&&room.phase!=='intermission'");h.click('#start');P1.wait_for_selector('#choices button:not([disabled])')
  assert 'ĐỘ CHÍNH XÁC' not in P1.text_content('#answerNote').upper()
  time.sleep(2);P1.click('#choices button >> nth=0');time.sleep(.4);h.click('#reveal');h.wait_for_function("()=>room.phase==='reveal'")
  pts=h.evaluate("()=>room.players.find(p=>p.name==='Trả Lời').score")-2000;assert 300<=pts<1000,pts
  ok(f'C: vòng "Khảo hạch" đặt luật TỐC ĐỘ – trả lời sau 2 giây được {pts} điểm (<1.000)')
  emit({'type':'next'});h.wait_for_function("()=>room.phase==='finished'");time.sleep(1)
  fs=P1.evaluate("()=>current");assert fs['honors']==[] and fs['boardHeld'];assert led.is_hidden('#vinhQuy'),'chưa chiếu phim vinh quy khi MC chưa xướng danh'
  assert 'chờ quan trường xướng danh' in P1.text_content('#myHonorMessage').lower()
  h.click('#showBoard');led.wait_for_selector('#vinhQuy:not(.hidden)',timeout=10000);P1.wait_for_function("()=>current.honors.length>0")
  ok('B: kết thúc kỳ thi – bảng vàng & phim vinh quy CHƯA gửi tới LED/điện thoại cho tới khi MC bấm "XƯỚNG DANH TAM KHÔI"')
  # ---- A: lý do không có bài ----
  csv=h.evaluate("p=>fetch('/api/rooms/'+p+'/report.csv').then(r=>r.text())",pin)
  line=lambda n:[l for l in csv.splitlines() if l.startswith(tuple(str(i) for i in range(1,9))) and n in l][0]
  assert 'có kết nối, không trả lời' in line('Im Lặng'),line('Im Lặng');assert 'mất kết nối lúc câu đóng' in line('Rớt Mạng'),line('Rớt Mạng')
  assert 'TRỄ' in line('Gửi Trễ') and 'không tính' in line('Gửi Trễ'),line('Gửi Trễ')
  ok('A: báo cáo ghi rõ từng người, từng câu: "có kết nối, không trả lời" / "mất kết nối lúc câu đóng" / "có gửi nhưng tới máy chủ TRỄ x giây sau hạn – không tính"')
  # ---- D: tự lưu nháp soạn câu ----
  emit({'type':'reset'});h.wait_for_function("()=>room.phase==='idle'")
  h.click('[data-add="2"]');h.fill('#editQuestion','Câu đang soạn dở – không được mất');h.fill('#editA','Phương án nháp');time.sleep(.6)
  assert 'Nháp tự lưu' in h.text_content('#editorNote')
  h.reload();h.wait_for_selector('#roomPanel:not(.hidden)');h.wait_for_function("()=>bank.length===3");h.click('[data-add="2"]')
  h.wait_for_selector('#qdRestore');h.click('#qdRestore');assert h.input_value('#editQuestion')=='Câu đang soạn dở – không được mất' and h.input_value('#editA')=='Phương án nháp'
  h.fill('#editB','B');h.click('#qSave');h.wait_for_function("()=>bank.some(q=>q.q==='Câu đang soạn dở – không được mất')")
  time.sleep(.3);h.click('[data-add="2"]');time.sleep(.3);assert h.locator('#qdRestore').count()==0,'lưu xong thì nháp phải được xoá'
  ok('D: soạn câu → tự lưu nháp trên máy MC; tải lại trang → "Khôi phục nháp" trả lại đúng nội dung; bấm LƯU lên máy chủ xong thì xoá nháp')
  # ---- E: kiểm tra trước giờ diễn ----
  au=J(f'/api/rooms/{pin}/media',{'name':'a.wav','data':base64.b64encode(wav()).decode()})
  emit({'type':'bank_set','bank':[{'q':'Ảnh hỏng','a':['x','y'],'c':0,'t':20,'media':{'kind':'image','src':'/media/khongton.png'}},{'q':'Nghe','a':['x','y'],'c':0,'t':20,'media':{'kind':'audio','src':au['src']}},{'q':'Clip YouTube','a':['x','y'],'c':0,'t':20,'media':{'kind':'youtube','src':'dQw4w9WgXcQ'}}]})
  h.wait_for_function("()=>bank.length===3&&bank[0].q==='Ảnh hỏng'");h.click('#rulesBox summary');h.click('#bankCheck');h.wait_for_selector('#checkResult table',timeout=20000)
  t=h.inner_text('#checkResult');assert '❌' in t and 'không mở được ảnh' in t,t;assert '✅ sẵn sàng' in t and 'CÓ TIẾNG' in t,t;assert 'YouTube' in t and 'Internet' in t;assert 'Màn LED' in t
  ok('E: "Kiểm tra chương trình trước giờ diễn" liệt kê từng câu: ảnh hỏng ❌, âm thanh ✅ sẵn sàng + "phát xong CÓ TIẾNG mới mở lượt", YouTube cần Internet, tình trạng từng màn LED và phương án dự phòng')
  assert not errs,errs
finally:proc.terminate()
