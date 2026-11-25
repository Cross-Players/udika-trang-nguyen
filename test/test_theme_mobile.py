'''Tông xanh ngọc thống nhất (điện thoại, MC, LED) + bố cục điện thoại: phương án bằng ảnh xếp lưới 2×2 với ảnh lớn;
không tràn ngang ở màn 320 px; điều kiện mạng chậm (giả lập 3G) vẫn vào phòng & nộp bài được.'''
import os,subprocess,tempfile,time,urllib.request,base64,io
from PIL import Image,ImageDraw
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18979;TMP=tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP.name+'/r.json','ADMIN_PASSWORD':'UDIKA-Local-Test-Password-8841','SESSION_SECRET':'udika-local-test-secret-random-1234567890'}
proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);U=f'http://127.0.0.1:{PORT}'
SHOTS=os.environ.get('SHOTS')
def ok(s):print('PASS',s,flush=True)
def png(color,label):
 im=Image.new('RGB',(480,360),color);d=ImageDraw.Draw(im);d.rectangle((30,30,450,330),outline='white',width=8);d.ellipse((170,110,310,250),fill='white');b=io.BytesIO();im.save(b,'PNG');return b.getvalue()
import re
def rgb(s):return tuple(int(x) for x in re.search(r'rgba?\((\d+),\s*(\d+),\s*(\d+)',s).groups())
try:
 for i in range(80):
  try:urllib.request.urlopen(U+'/health',timeout=2);break
  except Exception:time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch();errs=[]
  h=b.new_context(viewport={'width':1440,'height':900}).new_page();h.on('pageerror',lambda e:errs.append(str(e)));h.goto(U+'/health')
  J=lambda path,data:h.evaluate("a=>fetch(a[0],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a[1])}).then(r=>r.json())",[path,data])
  J('/api/login',{'role':'admin','password':ENV['ADMIN_PASSWORD']});pin=J('/api/rooms',{'title':'Giao diện','mcUser':'mcthm','password':'password-test-0123'})['pin']
  srcs=[J(f'/api/rooms/{pin}/media',{'name':f'{i}.png','data':base64.b64encode(png(c,i)).decode()})['src'] for i,c in enumerate(['#b23a2e','#2f5d9a','#c8962f','#2e7a4f'])]
  h.goto(f'{U}/host?pin={pin}');h.wait_for_selector('#roomPanel:not(.hidden)')
  h.evaluate("b=>emit({type:'bank_set',bank:b})",[{'kind':'mc','q':'Ô nào màu xanh lam?','a':['','','',''],'ai':srcs,'c':1,'t':60},{'kind':'mc','q':'Câu 2?','a':['Có','Không'],'c':0,'t':60}]);h.wait_for_function("()=>bank.length===2")
  h.evaluate("()=>emit({type:'set_option',autoReveal:false,bigQr:'off'})")
  hb=rgb(h.evaluate("()=>getComputedStyle(document.querySelector('header')).backgroundImage"))
  assert hb[1]>hb[0] and hb[1]>hb[2]-10,hb;ok(f'đầu trang MC màu xanh ngọc {hb} (không còn nâu)')
  # điện thoại 3G giả lập
  ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True);p=ctx.new_page();p.on('pageerror',lambda e:errs.append(str(e)))
  cdp=ctx.new_cdp_session(p);cdp.send('Network.enable');cdp.send('Network.emulateNetworkConditions',{'offline':False,'latency':400,'downloadThroughput':750*1024/8,'uploadThroughput':250*1024/8})
  t0=time.time();p.goto(f'{U}/join?pin={pin}');p.fill('#name','Nguyễn Văn An');p.click('#joinButton');p.wait_for_selector('#playPanel:not(.hidden)',timeout=20000);tj=time.time()-t0
  pb=rgb(p.evaluate("()=>getComputedStyle(document.querySelector('header')).backgroundImage"));assert pb[1]>pb[0],pb
  ok(f'mạng chậm giả lập (3G: trễ 400 ms, 750 kbit/s): mở trang + vào phòng trong {tj:.1f} giây; đầu trang điện thoại xanh ngọc')
  h.click('#start');p.wait_for_selector('#choices .choice img')
  p.wait_for_function("()=>[...document.querySelectorAll('#choices .choice img')].every(i=>i.complete&&i.naturalWidth>0)",timeout=20000)
  boxes=p.eval_on_selector_all('#choices .choice','e=>e.map(x=>{const r=x.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width)]})')
  imgs=p.eval_on_selector_all('#choices .choice img','e=>e.map(x=>Math.round(x.getBoundingClientRect().width))')
  assert len({x[1] for x in boxes})==2 and len({x[0] for x in boxes})==2,boxes;assert min(imgs)>=140,imgs
  ok(f'phương án bằng ảnh: lưới 2×2, mỗi ảnh rộng ≥140 px ({imgs})')
  if SHOTS:p.screenshot(path=SHOTS+'/phone_img_grid.png')
  p.click('#choices .choice >> nth=1');p.wait_for_function("()=>/Đã nộp|đã nộp|chờ công bố/i.test(document.body.innerText)",timeout=20000);ok('mạng chậm: chạm đáp án → máy chủ xác nhận đã nhận bài')
  # 320 px: không tràn ngang
  for path in ['/','/join?pin='+pin,'/practice']:
   q=b.new_context(viewport={'width':320,'height':640},is_mobile=True,has_touch=True).new_page();q.goto(U+path);q.wait_for_timeout(600)
   ov=q.evaluate("()=>document.documentElement.scrollWidth-document.documentElement.clientWidth");assert ov<=1,(path,ov)
  ok('màn 320 px (điện thoại nhỏ): trang chủ, ghi danh, chơi thử không bị tràn ngang')
  led=b.new_context(viewport={'width':1600,'height':900}).new_page();led.goto(f'{U}/led?pin={pin}');led.wait_for_selector('#display:not(.hidden)')
  lb=rgb(led.evaluate("()=>getComputedStyle(document.querySelector('header')).backgroundImage"));assert lb[1]>lb[0],lb
  bc=rgb(led.evaluate("()=>getComputedStyle(document.querySelector('#ledScene')).borderTopColor"));assert bc[0]>bc[1] and bc[0]>bc[2],bc;ok('màn LED: nền sơn mài xanh ngọc, khung sân thi gỗ SƠN SON viền vàng (chất liệu "Trạng nguyên dân gian" – đổi theo yêu cầu 25/11)')
  assert not errs,errs
finally:proc.terminate()
