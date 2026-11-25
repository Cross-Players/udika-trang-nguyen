'''V14.1 – Chrome thật: ô đáp án có màu, tự công bố khi mọi người đã nộp, mất mạng lúc đang nộp (giữ bài, tự gửi lại khi có mạng),
máy chủ khởi động lại giữa câu (điện thoại tự nối lại, câu vẫn mở), 2 tab cùng một người không đẩy nhau qua lại. Chạy: python3 test/test_v14_net_ui.py'''
import os,subprocess,tempfile,time,urllib.request,signal
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18943;TMP=tempfile.TemporaryDirectory();SHOT=os.environ.get('SHOTS','/tmp/v14shots');os.makedirs(SHOT,exist_ok=True)
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP.name+'/rooms.json','ADMIN_PASSWORD':'UDIKA-Local-Test-Password-8841','SESSION_SECRET':'udika-local-test-secret-random-1234567890'}
def start():
 p=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 for i in range(80):
  try:urllib.request.urlopen(f'http://127.0.0.1:{PORT}/health',timeout=2);return p
  except Exception:time.sleep(.1)
 raise RuntimeError('no start')
proc=start();U=f'http://127.0.0.1:{PORT}'
def ok(s):print('PASS',s,flush=True)
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
  def page(ctx,url,w=420,h=860):
   p=ctx.new_page();p.set_viewport_size({'width':w,'height':h});p.on('pageerror',lambda e:errs.append(str(e)));p.on('dialog',lambda d:d.accept());p.goto(url);return p
  hc=b.new_context();adm=page(hc,U+'/health',1200,900)
  J=lambda path,data:adm.evaluate("a=>fetch(a[0],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a[1])}).then(r=>r.json())",[path,data])
  J('/api/login',{'role':'admin','password':ENV['ADMIN_PASSWORD']});pin=J('/api/rooms',{'title':'Thử mạng','mcUser':'mcn','password':'password-test-0123'})['pin'];J('/api/login',{'role':'mc','pin':pin,'user':'mcn','password':'password-test-0123'})
  host=page(hc,f'{U}/host?pin={pin}',1400,1000);host.wait_for_selector('#roomPanel:not(.hidden)')
  host.evaluate("()=>emit({type:'bank_set',bank:[1,2,3,4].map(i=>({q:'Câu '+i+'?',a:['Đỏ','Lam','Vàng','Lục'],c:1,t:40}))})");host.wait_for_function("()=>bank.length===4")
  pc=b.new_context();P=page(pc,f'{U}/join?pin={pin}');P.fill('#name','Phạm Văn Dũng');P.click('#joinButton');P.wait_for_selector('#playPanel:not(.hidden)')
  # 1. ô màu + tự công bố
  host.click('#start');P.wait_for_selector('#choices .choice.tile.c0')
  cols=P.eval_on_selector_all('#choices .choice.tile','els=>els.map(e=>getComputedStyle(e).backgroundColor)');assert len(set(cols))==4,cols;P.screenshot(path=SHOT+'/net_tiles.png')
  P.click('#choices [data-id="1"]');P.wait_for_function("()=>document.querySelector('#answerNote').textContent.includes('Đã lưu')")
  note=P.inner_text('#answerNote');assert 'điểm' not in note,note
  t0=time.time();host.wait_for_function("()=>room.phase==='reveal'",timeout=6000);P.wait_for_function("()=>document.querySelector('#answerNote').textContent.includes('Bạn đúng')")
  ok(f'4 ô đáp án 4 màu khác nhau {cols}; khi đang chạy chỉ báo "đã lưu" (giữ kín điểm); mọi người nộp xong → tự công bố sau {time.time()-t0:.1f} giây, MC không bấm');P.screenshot(path=SHOT+'/net_reveal.png')
  # 2. mất mạng đúng lúc nộp
  host.click('#next');host.wait_for_function("()=>room.phase==='ready'");host.click('#start');P.wait_for_selector('#choices [data-id="1"]:not([disabled])')
  pc.set_offline(True);P.evaluate("()=>{try{socket.close()}catch(e){}}");time.sleep(.3);P.click('#choices [data-id="1"]')
  P.wait_for_function("()=>/Đang lưu|giữ/.test(document.querySelector('#answerNote').textContent+document.querySelector('#connection').textContent)");ok('mất mạng lúc bấm: điện thoại giữ bài, báo "đang lưu… sẽ tự gửi lại": '+P.inner_text('#connection'))
  time.sleep(2);pc.set_offline(False);P.wait_for_function("()=>document.querySelector('#answerNote').textContent.includes('Đã lưu')",timeout=25000);ok('có mạng lại: tự nối lại, vào lại phòng rồi mới gửi lại bài – máy chủ xác nhận đã lưu')
  host.wait_for_function("()=>room.answeredCount===1||room.phase==='reveal'",timeout=8000)
  # 3. máy chủ tắt đột ngột giữa câu rồi chạy lại
  host.wait_for_function("()=>room.phase==='reveal'",timeout=6000);host.click('#next');host.wait_for_function("()=>room.phase==='ready'");host.click('#start');P.wait_for_selector('#choices [data-id="1"]:not([disabled])')
  before=host.evaluate("()=>room.leaderboard.find(p=>p.name==='Phạm Văn Dũng').score")
  proc.send_signal(signal.SIGKILL);proc.wait();time.sleep(3);proc=start()
  P.wait_for_function("()=>document.querySelector('#connection').textContent.includes('Trực tuyến')&&current&&current.phase==='running'",timeout=30000)
  P.click('#choices [data-id="1"]');P.wait_for_function("()=>document.querySelector('#answerNote').textContent.includes('Đã lưu')",timeout=15000)
  host.wait_for_function("()=>room&&room.phase==='reveal'",timeout=30000);after=host.evaluate("()=>room.leaderboard.find(p=>p.name==='Phạm Văn Dũng').score")
  assert after>before,(before,after);ok(f'máy chủ bị tắt đột ngột giữa câu 3: điện thoại + MC tự nối lại, câu vẫn mở, trả lời được; điểm {before} → {after} (không mất điểm cũ)')
  # 4. hai tab cùng một người
  P2=page(pc,f'{U}/join?pin={pin}');P2.wait_for_selector('#playPanel:not(.hidden)');P.wait_for_selector('#replacedBox');time.sleep(6)
  assert P2.is_visible('#playPanel') and not P2.query_selector('#replacedBox');ok('mở tab thứ 2 cùng người: tab cũ hiện "đang thi ở tab khác" và DỪNG, không đẩy nhau qua lại (đã chờ 6 giây)')
  P.click('#replacedBox button');P2.wait_for_selector('#replacedBox');P.wait_for_selector('#playPanel:not(.hidden)');ok('bấm "Tiếp tục ở tab này" → chuyển quyền về tab cũ, tab kia tạm dừng')
  assert not errs,errs;ok('không lỗi JavaScript');b.close()
finally:
 proc.kill();TMP.cleanup()
