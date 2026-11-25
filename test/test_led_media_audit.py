'''Kiểm định 7.1–7.3: câu ÂM THANH phát ở chế độ tắt tiếng (trình duyệt chặn tự phát có tiếng) KHÔNG được tự mở lượt;
bấm bật tiếng trên LED → phát lại TỪ ĐẦU có tiếng → mới mở lượt. Màn LED CHÍNH: màn phụ phát xong không mở lượt.
Màn LED mất kết nối giữa lúc phát → MC được báo. Dùng chính sách tự phát thông thường của Chrome.'''
import base64,io,math,os,struct,subprocess,tempfile,time,urllib.request,wave
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18968;TMP=tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP.name+'/r.json','ADMIN_PASSWORD':'UDIKA-Local-Test-Password-8841','SESSION_SECRET':'udika-local-test-secret-random-1234567890'}
proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);U=f'http://127.0.0.1:{PORT}'
def ok(s):print('PASS',s,flush=True)
def wav(sec=1.2):
 b=io.BytesIO();w=wave.open(b,'wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(22050);w.writeframes(b''.join(struct.pack('<h',int(8000*math.sin(2*math.pi*440*i/22050))) for i in range(int(22050*sec))));w.close();return b.getvalue()
try:
 for i in range(80):
  try:urllib.request.urlopen(U+'/health',timeout=2);break
  except Exception:time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch();bl=pw.chromium.launch(args=['--autoplay-policy=document-user-activation-required']);errs=[]
  h=b.new_context(viewport={'width':1400,'height':900}).new_page();h.on('pageerror',lambda e:errs.append(str(e)));h.goto(U+'/health')
  J=lambda path,data:h.evaluate("a=>fetch(a[0],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a[1])}).then(r=>r.json())",[path,data])
  J('/api/login',{'role':'admin','password':ENV['ADMIN_PASSWORD']});pin=J('/api/rooms',{'title':'Âm thanh','mcUser':'mcaud','password':'password-test-0123'})['pin']
  au=J(f'/api/rooms/{pin}/media',{'name':'a.wav','data':base64.b64encode(wav()).decode()})
  h.goto(f'{U}/host?pin={pin}');h.wait_for_selector('#roomPanel:not(.hidden)')
  q=lambda t:{'q':t,'a':['Trống','Kèn'],'c':0,'t':60,'media':{'kind':'audio','src':au['src'],'gate':True}}
  h.evaluate("b=>emit({type:'bank_set',bank:b})",[q('Nghe 1'),q('Nghe 2'),q('Nghe 3')]);h.wait_for_function("()=>bank.length===3");h.evaluate("()=>emit({type:'set_option',autoReveal:false,bigQr:'off'})")
  lc=bl.new_context(viewport={'width':1280,'height':720})
  # mô phỏng ĐÚNG chính sách tự phát của trình duyệt: chưa có thao tác người dùng thì play() CÓ TIẾNG bị từ chối (NotAllowedError), play() tắt tiếng được phép
  lc.add_init_script("(()=>{const o=HTMLMediaElement.prototype.play;let g=false;addEventListener('pointerdown',()=>g=true,true);addEventListener('click',()=>g=true,true);HTMLMediaElement.prototype.play=function(){if(!this.muted&&!g)return Promise.reject(new DOMException('play() failed because the user didn\\'t interact with the document first.','NotAllowedError'));return o.call(this)}})()")
  led=lc.new_page();led.on('pageerror',lambda e:errs.append(str(e)));led.goto(f'{U}/led?pin={pin}&label=LED1');led.wait_for_selector('#display:not(.hidden)')
  h.wait_for_function("()=>(room.leds||[]).length===1")
  # F03: màn LED mở trên máy KHÁC (chưa đăng nhập) phải được MC ghép đôi làm màn chính thì mới được mở lượt sau clip
  h.evaluate("()=>emit({type:'set_main_led',conn:room.leds[0].conn})");h.wait_for_function("()=>room.leds.some(l=>l.main&&l.label==='LED1')")
  # --- 7.1: phát tắt tiếng → không mở lượt ---
  h.click('#start');h.wait_for_function("()=>room.phase==='media'")
  h.wait_for_function("()=>/KHÔNG CÓ TIẾNG/.test(document.body.innerText)",timeout=15000)
  time.sleep(1);assert h.evaluate("()=>room.phase")=='media','phát tắt tiếng KHÔNG được mở lượt'
  assert led.is_visible('#mediaBlocked') and 'PHÁT LẠI' in led.text_content('#mediaBlocked')
  ok('7.1: Chrome chặn tự phát có tiếng → LED phát tắt tiếng tới hết đoạn nhưng lượt trả lời KHÔNG mở; MC nhận cảnh báo "KHÔNG CÓ TIẾNG"; LED hiện nút bật tiếng & phát lại')
  led.click('#mediaBlocked');h.wait_for_function("()=>room.phase==='running'",timeout=15000)
  assert led.evaluate("()=>!document.querySelector('#qMediaEl')||document.querySelector('#qMediaEl').muted===false")
  ok('7.1: bấm vào LED → phát lại TỪ ĐẦU có tiếng → phát xong mới mở lượt trả lời')
  # --- màn chính ---
  h.click('#reveal');h.wait_for_function("()=>room.phase==='reveal'")
  led2=b.new_context(viewport={'width':1280,'height':720}).new_page();led2.goto(f'{U}/led?pin={pin}&label=LED2');led2.wait_for_selector('#display:not(.hidden)')
  h.wait_for_function("()=>(room.leds||[]).length===2")
  led2conn=h.evaluate("()=>room.leds.find(l=>l.label==='LED2').conn")
  h.evaluate(f"()=>emit({{type:'set_main_led',conn:'{led2conn}'}})");h.wait_for_function("()=>room.leds.some(l=>l.main&&l.label==='LED2')")
  led2.evaluate("()=>{Sfx&&Sfx.isMuted&&Sfx.isMuted()&&Sfx.toggle()}")
  # LED2 (có tiếng do trình duyệt cho tự phát) là màn chính; LED1 (bị chặn tiếng) chỉ là màn phụ
  h.evaluate("()=>emit({type:'next'})");h.wait_for_function("()=>room.idx===1");h.click('#start');h.wait_for_function("()=>room.phase==='media'")
  qid=h.evaluate("()=>room.q.qid")
  led.evaluate(f"()=>emit({{type:'media_done',qid:'{qid}',muted:false}})");time.sleep(.8);assert h.evaluate("()=>room.phase")=='media','màn PHỤ phát xong không được mở lượt'
  h.wait_for_function("()=>room.phase==='running'",timeout=15000)
  ok('Màn LED chính: MC chọn LED2 làm màn chính → LED1 (màn phụ) báo phát xong KHÔNG mở lượt; chỉ khi LED2 phát xong mới mở')
  # --- mất LED giữa lúc phát ---
  h.click('#reveal');h.wait_for_function("()=>room.phase==='reveal'");h.evaluate("()=>emit({type:'next'})");h.wait_for_function("()=>room.idx===2");h.click('#start');h.wait_for_function("()=>room.phase==='media'")
  led2.close();h.wait_for_function("()=>/MẤT KẾT NỐI/.test(document.body.innerText)",timeout=10000);assert h.evaluate("()=>room.phase")=='media'
  ok('Màn LED chính mất kết nối giữa lúc phát clip → MC được báo ngay "MẤT KẾT NỐI", lượt chưa mở (MC tự quyết MỞ LƯỢT NGAY)')
  assert not errs,errs
finally:proc.terminate()
