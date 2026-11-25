'''Phòng đông trên màn LED (1.000 người thật qua WebSocket): 60 nhân vật có tên + "biển sĩ tử" vẽ đủ mỗi người còn lại một bóng;
trước giờ thi là người mới vào, sau khi công bố đáp án là 60 người DẪN ĐẦU (người hạng 1 chắc chắn có mặt); trong lúc làm câu không đổi danh sách.'''
import os,subprocess,tempfile,time,urllib.request
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18976;TMP=tempfile.TemporaryDirectory(ignore_cleanup_errors=True);N=int(os.environ.get('CROWD_N','1000'))
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP.name+'/r.json','ADMIN_PASSWORD':'UDIKA-Local-Test-Password-8841','SESSION_SECRET':'udika-local-test-secret-random-1234567890'}
proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);U=f'http://127.0.0.1:{PORT}';fill=None
def ok(s):print('PASS',s,flush=True)
try:
 for i in range(80):
  try:urllib.request.urlopen(U+'/health',timeout=2);break
  except Exception:time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch();errs=[]
  h=b.new_context(viewport={'width':1500,'height':950}).new_page();h.goto(U+'/health')
  J=lambda path,data:h.evaluate("a=>fetch(a[0],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a[1])}).then(r=>r.json())",[path,data])
  J('/api/login',{'role':'admin','password':ENV['ADMIN_PASSWORD']});pin=J('/api/rooms',{'title':'Phòng đông','mcUser':'mcbig','password':'password-test-0123'})['pin']
  h.goto(f'{U}/host?pin={pin}');h.wait_for_selector('#roomPanel:not(.hidden)');h.evaluate("()=>emit({type:'set_option',bigQr:'off',autoReveal:false})")
  fill=subprocess.Popen(['node','tools/fill_room.js',U,pin,str(N)],cwd=ROOT,stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
  line=fill.stdout.readline().strip();assert line==f'READY {N}',line
  led=b.new_context(viewport={'width':1920,'height':1080}).new_page();led.on('pageerror',lambda e:errs.append(str(e)));led.goto(f'{U}/led?pin={pin}&clean=1')
  led.wait_for_function(f"()=>document.querySelectorAll('#crowdBooths .booth').length===60&&/{N//1000}\\.000/.test(document.querySelector('#candidateNames').textContent)")
  t=led.text_content('#candidateNames');assert 'mới vào' in t and 'mỗi bóng' not in t,t
  figs=led.evaluate("()=>lastSea");assert figs['figs']==N-60 and figs['per']==1,figs
  ink=led.evaluate("()=>{const c=document.querySelector('#crowdSea'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n/(c.width*c.height)}")
  assert ink>0.05,ink;ok(f'{N} người: 60 nhân vật có tên (người mới vào) + {figs["figs"]} bóng phía sau, mỗi người đúng 1 bóng; bộ đếm ghi rõ')
  names0=led.eval_on_selector_all('#crowdBooths .nametag','e=>e.map(x=>x.textContent.trim())')
  h.click('#start');h.wait_for_timeout(600);fill.stdin.write('ANSWER\n');fill.stdin.flush();h.wait_for_timeout(4000)
  assert led.eval_on_selector_all('#crowdBooths .nametag','e=>e.map(x=>x.textContent.trim())')==names0;ok('trong lúc làm câu: danh sách trên sân giữ nguyên (không lộ ai đúng/sai)')
  h.evaluate("()=>emit({type:'reveal'})");led.wait_for_function("()=>/dẫn đầu/.test(document.querySelector('#candidateNames').textContent)")
  top=led.evaluate("()=>current.leaderboard[0].name");led.wait_for_timeout(500)
  tags=led.eval_on_selector_all('#crowdBooths .nametag','e=>e.map(x=>x.getAttribute("title"))');assert top in tags,(top,tags[:5]);assert led.locator('#crowdBooths .booth.top1').count()>=1
  ok('sau khi công bố: 60 người dẫn đầu lên sân, người hạng 1 có mặt và đeo huy chương')
  assert not errs,errs;ok('không có lỗi JavaScript')
finally:
 proc.terminate()
 if fill:fill.terminate()
