'''Câu sắp xếp: kéo thả bằng chuột (giữ ⠿) và bằng NGÓN TAY (sự kiện chạm, chạm-giữ rồi kéo) trên điện thoại; nộp → chấm đúng.'''
import os,subprocess,tempfile,time,urllib.request
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18962;TMP=tempfile.TemporaryDirectory()
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP.name+'/rooms.json','ADMIN_PASSWORD':'UDIKA-Local-Test-Password-8841','SESSION_SECRET':'udika-local-test-secret-random-1234567890'}
proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);U=f'http://127.0.0.1:{PORT}'
def ok(s):print('PASS',s,flush=True)
WANT=['Thi Hương','Thi Hội','Thi Đình','Vinh quy bái tổ']
try:
 for i in range(80):
  try:urllib.request.urlopen(U+'/health',timeout=2);break
  except Exception:time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch();errs=[]
  host=b.new_context().new_page();host.on('pageerror',lambda e:errs.append(str(e)));host.goto(U+'/health')
  J=lambda path,data:host.evaluate("a=>fetch(a[0],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a[1])}).then(r=>r.json())",[path,data])
  J('/api/login',{'role':'admin','password':ENV['ADMIN_PASSWORD']});pin=J('/api/rooms',{'title':'Kéo thả','mcUser':'mcdrag','password':'password-test-0123'})['pin']
  host.goto(f'{U}/host?pin={pin}');host.wait_for_selector('#roomPanel:not(.hidden)')
  host.evaluate("b=>emit({type:'bank_set',bank:b})",[{'kind':'order','q':'Xếp đúng trình tự','a':WANT,'t':60},{'kind':'order','q':'Xếp lần 2','a':WANT,'t':60}]);host.wait_for_function("()=>bank.length===2")
  host.evaluate("()=>emit({type:'set_option',autoReveal:false})")
  P=[]
  for n in ('Chuột','Ngón tay'):
   p=b.new_context(viewport={'width':390,'height':844},is_mobile=(n=='Ngón tay'),has_touch=(n=='Ngón tay')).new_page();p.on('pageerror',lambda e:errs.append(str(e)));p.goto(f'{U}/join?pin={pin}');p.fill('#name',n);p.click('#joinButton');p.wait_for_selector('#playPanel:not(.hidden)');P.append(p)
  host.click('#start')
  items=lambda p:p.eval_on_selector_all('#choices .order-t','e=>e.map(x=>x.textContent.trim())')
  # --- chuột: giữ ⠿ rồi kéo ---
  m=P[0];m.wait_for_selector('#choices .order-grip')
  for target,w in enumerate(WANT):
   cur=items(m);pos=cur.index(w)
   if pos==target:continue
   g=m.query_selector_all('#choices .order-grip')[pos].bounding_box();t=m.query_selector_all('#choices .order-item')[target].bounding_box()
   m.mouse.move(g['x']+g['width']/2,g['y']+g['height']/2);m.mouse.down()
   for k in range(1,13):m.mouse.move(g['x']+g['width']/2,g['y']+g['height']/2+(t['y']+8-(g['y']+g['height']/2))*k/12)
   m.mouse.up();m.wait_for_timeout(80)
  assert items(m)==WANT,items(m);ok('kéo thả bằng chuột (giữ ⠿) xếp đúng 4 mục')
  # --- ngón tay: chạm giữ thân mục ~0,3 giây rồi kéo (Pointer Events kiểu touch) ---
  f=P[1];f.wait_for_selector('#choices .order-item')
  before=items(f);f.evaluate("""()=>new Promise(res=>{const it=document.querySelectorAll('#choices .order-item')[0],t=it.querySelector('.order-t'),r=t.getBoundingClientRect(),x=r.left+20,y=r.top+10;
    const P=(type,yy,el)=>(el||it).dispatchEvent(new PointerEvent(type,{pointerId:9,pointerType:'touch',isPrimary:true,clientX:x,clientY:yy,bubbles:true,cancelable:true}));P('pointerdown',y,t);
    setTimeout(()=>{P('pointermove',y+60);P('pointerup',y+60);setTimeout(res,300)},40)})""");assert items(f)==before,'vuốt nhanh không được đổi thứ tự'
  ok('vuốt nhanh (không chạm giữ) KHÔNG đổi thứ tự – để người chơi vẫn cuộn trang được')
  for target,w in enumerate(WANT):
   cur=items(f);pos=cur.index(w)
   if pos==target:continue
   f.evaluate("""([pos,target])=>new Promise(res=>{const it=document.querySelectorAll('#choices .order-item')[pos],tg=document.querySelectorAll('#choices .order-item')[target];
     const r=it.querySelector('.order-t').getBoundingClientRect(),x=r.left+r.width/2,y0=r.top+r.height/2,y1=tg.getBoundingClientRect().top+6;const P=(type,y,el)=>(el||it).dispatchEvent(new PointerEvent(type,{pointerId:7,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,bubbles:true,cancelable:true}));
     P('pointerdown',y0,it.querySelector('.order-t'));setTimeout(()=>{let k=0;const st=()=>{k++;P('pointermove',y0+(y1-y0)*k/10);if(k<10)setTimeout(st,16);else{P('pointerup',y1);setTimeout(res,50)}};st()},300)})""",[pos,target])
  assert items(f)==WANT,items(f);f.screenshot(path='/tmp/order_touch.png');ok('kéo thả bằng NGÓN TAY (chạm giữ ~0,3 giây rồi kéo) xếp đúng 4 mục')
  for p in P:p.click('#orderGo')
  host.click('#reveal')
  for p in P:p.wait_for_function("()=>document.querySelector('#answerNote').textContent.includes('Bạn đúng')")
  ok('nộp thứ tự sau khi kéo thả → cả hai được chấm ĐÚNG')
  assert not errs,errs;ok('không lỗi JavaScript')
  b.close()
finally:proc.kill()
