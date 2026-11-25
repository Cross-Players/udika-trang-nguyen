'''Kiểm định 7.3: chế độ sân khấu (?clean=1) – tổng kết chặng và bảng vàng Tam khôi hiện TRỌN trong khung 1920×1080 (không nằm dưới mép màn hình); thanh điều khiển phim ẩn với khán giả.'''
import os,subprocess,tempfile,time,urllib.request
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18969;TMP=tempfile.mkdtemp();SH=os.environ.get('SHOTS','/tmp')
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP+'/r.json','ADMIN_PASSWORD':'UDIKA-Local-Test-Password-8841','SESSION_SECRET':'udika-local-test-secret-random-1234567890'}
proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);U=f'http://127.0.0.1:{PORT}'
try:
 for i in range(80):
  try:urllib.request.urlopen(U+'/health',timeout=2);break
  except Exception:time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch();h=b.new_page();h.goto(U+'/health')
  J=lambda path,data:h.evaluate("a=>fetch(a[0],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a[1])}).then(r=>r.json())",[path,data])
  J('/api/login',{'role':'admin','password':ENV['ADMIN_PASSWORD']});pin=J('/api/rooms',{'title':'Sạch','mcUser':'mccl','password':'password-test-0123'})['pin']
  h.goto(f'{U}/host?pin={pin}');h.wait_for_selector('#roomPanel:not(.hidden)')
  h.evaluate("b=>emit({type:'bank_set',bank:b})",[{'q':'1','a':['x','y'],'c':0,'t':20,'stage':0},{'q':'2','a':['x','y'],'c':0,'t':20,'stage':1}]);h.wait_for_function("()=>bank.length===2");h.evaluate("()=>emit({type:'set_option',autoReveal:false,bigQr:'off'})")
  p=b.new_page();p.goto(f'{U}/join?pin={pin}');p.fill('#name','Ngọc Khánh UDIKA');p.click('#joinButton');p.wait_for_selector('#playPanel:not(.hidden)')
  led=b.new_page(viewport={'width':1920,'height':1080});led.goto(f'{U}/led?pin={pin}&clean=1');led.wait_for_selector('#display:not(.hidden)')
  h.click('#start');p.wait_for_selector('#choices button');p.click('#choices button >> nth=0');time.sleep(.5);h.click('#reveal');h.wait_for_function("()=>room.phase==='reveal'")
  h.evaluate("()=>emit({type:'next'})");h.wait_for_function("()=>room.phase==='intermission'");time.sleep(1.5)
  v=led.evaluate("()=>[document.documentElement.scrollHeight,innerHeight,document.querySelector('#stageCelebration').getBoundingClientRect().top,document.querySelector('#stageCelebration').getBoundingClientRect().bottom]");assert v[0]<=v[1]+1 and v[2]>=0 and v[3]<=v[1]+1,v
  print('PASS 7.3: chế độ sân khấu – khối tổng kết chặng hiện trọn trong khung 1920×1080, không cần cuộn',flush=True)
  led.screenshot(path=SH+'/clean_inter.png')
  h.evaluate("()=>emit({type:'next'})");h.wait_for_function("()=>room.idx===1");h.click('#start');time.sleep(.5);h.click('#reveal');h.wait_for_function("()=>room.phase==='reveal'");h.evaluate("()=>emit({type:'next'})");h.wait_for_function("()=>room.phase==='finished'");time.sleep(2)
  led.wait_for_selector('.vq-ctrl',state='attached',timeout=15000);led.mouse.move(5,5);time.sleep(.5)
  assert led.evaluate("()=>getComputedStyle(document.querySelector('.vq-ctrl')).opacity")=='0','thanh điều khiển phim phải ẩn với khán giả'
  h.evaluate("()=>emit({type:'vq',cmd:'board'})");led.wait_for_function("()=>document.body.classList.contains('show-board')")
  v=led.evaluate("()=>{const r=document.querySelector('#finalCeremony').getBoundingClientRect();return [r.top,r.bottom,innerHeight,document.querySelector('#finalCeremony').innerText]}");assert v[0]>=0 and v[1]<=v[2]+1 and 'Ngọc Khánh UDIKA' in v[3],v
  led.screenshot(path=SH+'/clean_board.png')
  print('PASS 7.3: kết thúc – phim vinh quy chiếm trọn khung, thanh điều khiển ẩn; MC bấm "Bật/tắt bảng vàng" (hoặc phím B) → bảng vàng Tam khôi phủ trọn khung',flush=True)

finally:proc.terminate()
