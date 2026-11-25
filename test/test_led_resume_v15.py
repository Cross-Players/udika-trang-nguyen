'''V15 #4: màn LED tải lại trang (F5, mất điện máy chiếu, rút cáp) giữa lúc chiếu phim vinh danh → CHẠY TIẾP đúng chỗ, không chiếu lại từ đầu.
Thử cả phim dựng sẵn (mp4) lẫn hoạt cảnh vẽ (khi máy không có tệp phim). Chạy: python3 test/test_led_resume_v15.py'''
import os, shutil
import json,os,subprocess,tempfile,time,urllib.request
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18957;TMP=tempfile.TemporaryDirectory()
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP.name+'/rooms.json','ADMIN_PASSWORD':'UDIKA-Local-Test-Password-8841','SESSION_SECRET':'udika-local-test-secret-random-1234567890'}
assert os.path.exists(ROOT+'/public/assets/vinhquy/vinh_quy.mp4'),'thiếu phim'
proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
CTL=r"""
window.S={};
window.mk=(n)=>new Promise((res,rej)=>{const w=new WebSocket('ws://'+location.host+'/ws');w.q=[];w.onmessage=e=>w.q.push(JSON.parse(e.data));w.onopen=()=>res(true);w.onerror=rej;S[n]=w});
window.emit=(n,m)=>S[n].send(JSON.stringify(m));
window.waitState=(n,ph)=>new Promise((res,rej)=>{const t0=Date.now();(function f(){const w=S[n];while(w.q.length){const m=w.q.shift();if(m.type==='state'&&(!ph||m.phase===ph))return res(m)}if(Date.now()-t0>6000)return rej('timeout '+n+' '+ph);setTimeout(f,30)})()});
window.waitType=(n,ty)=>new Promise((res,rej)=>{const t0=Date.now();(function f(){const w=S[n];while(w.q.length){const m=w.q.shift();if(m.type===ty)return res(m)}if(Date.now()-t0>6000)return rej('timeout '+ty);setTimeout(f,30)})()});
"""

NAME='Trần Bảo Ngọc'
try:
 for i in range(80):
  try:urllib.request.urlopen(f'http://127.0.0.1:{PORT}/health',timeout=2);break
  except Exception:time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path=os.environ.get('CHROME_PATH') or (shutil.which('google-chrome') or None),args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
  ctx=b.new_context(viewport={'width':1600,'height':900});ctl=ctx.new_page();ctl.goto(f'http://127.0.0.1:{PORT}/health');ctl.evaluate("()=>{"+CTL+"}")
  J=lambda path,data:ctl.evaluate("a=>fetch(a[0],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a[1])}).then(r=>r.json())",[path,data])
  E=lambda n,m:ctl.evaluate("a=>emit(a[0],a[1])",[n,m]);W=lambda n,ph=None:ctl.evaluate("a=>waitState(a[0],a[1])",[n,ph])
  errs=[]
  def finished_room(tag):
   J('/api/login',{'role':'admin','password':ENV['ADMIN_PASSWORD']});pin=J('/api/rooms',{'title':'Thử chạy tiếp '+tag,'mcUser':'mc'+tag,'password':'password-test-0123'})['pin']
   J('/api/login',{'role':'mc','pin':pin,'user':'mc'+tag,'password':'password-test-0123'})
   for n in ('c'+tag,'p'+tag):ctl.evaluate("n=>mk(n)",n)
   E('c'+tag,{'type':'host_auth','pin':pin});W('c'+tag);E('p'+tag,{'type':'join','pin':pin,'name':NAME});W('p'+tag)
   E('c'+tag,{'type':'bank_set','bank':[{'stage':4,'q':'Câu thử?','a':['A','B','C','D'],'c':0,'t':10}]});W('c'+tag)
   E('c'+tag,{'type':'set_option','autoReveal':False});W('c'+tag);E('c'+tag,{'type':'start'});st=W('c'+tag,'running')
   E('p'+tag,{'type':'answer','qid':st['q']['qid'],'eid':st['eid'],'sid':'a1','choice':0});time.sleep(.3)
   E('c'+tag,{'type':'reveal'});W('c'+tag,'reveal');return pin
  def led(pin,block_film=False):
   pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))   # cùng phiên MC → là màn tin cậy (chưa ghép đôi màn chính nào)
   if block_film:pg.route('**/vinh_quy.mp4',lambda r:r.fulfill(status=404,body=''))
   pg.goto(f'http://127.0.0.1:{PORT}/led.html?pin={pin}');return pg
  # ---------- 1) phim dựng sẵn ----------
  pin=finished_room('v');pg=led(pin);pg.wait_for_timeout(1200);E('cv',{'type':'next'});W('cv','finished')
  pg.wait_for_function("()=>{const v=document.querySelector('video.vqv');return v&&v.currentTime>6.5}",timeout=20000);pg.wait_for_timeout(2300)  # ≥1 lần báo vị trí
  t0=pg.evaluate("()=>document.querySelector('video.vqv').currentTime");pg.reload()
  pg.wait_for_function("()=>{const v=document.querySelector('video.vqv');return v&&!v.paused&&v.currentTime>0.2}",timeout=15000);pg.wait_for_timeout(400)
  pg.wait_for_timeout(1600);t1=pg.evaluate("()=>document.querySelector('video.vqv').currentTime");pg.wait_for_timeout(1000);t2=pg.evaluate("()=>document.querySelector('video.vqv').currentTime")
  dbg=pg.evaluate("()=>{const v=document.querySelector('video.vqv');return {p:v.paused,rs:v.readyState,ns:v.networkState,n:document.querySelectorAll('video').length,res:window.__vqResumed,buf:[...Array(v.buffered.length).keys()].map(i=>[v.buffered.start(i),v.buffered.end(i)])}}")
  assert t1>=t0-2.6 and t1<t0+8 and t2>t1+0.15,(t0,t1,t2,dbg)  # máy kiểm thử giải mã phim 1080p bằng CPU nên có lúc chạy chậm hơn thời gian thực – chỉ cần phim đang chạy tiếp
  print(f'PASS phim mp4: tải lại trang ở giây {t0:.1f} → chạy tiếp từ giây {t1:.1f} (không chiếu lại từ đầu)')
  E('cv',{'type':'vq','cmd':'pause'})
  pg.wait_for_timeout(2600)
  tp=pg.evaluate("()=>document.querySelector('video.vqv').currentTime");pg.reload()
  pg.wait_for_function("()=>{const v=document.querySelector('video.vqv');return v&&v.readyState>=1&&v.currentTime>1}",timeout=15000);pg.wait_for_timeout(700)
  a=pg.evaluate("()=>{const v=document.querySelector('video.vqv');return [v.currentTime,v.paused]}");assert a[1] and abs(a[0]-tp)<0.6,(tp,a)
  print(f'PASS MC đang tạm dừng ở giây {tp:.1f}: tải lại vẫn dừng đúng chỗ ({a[0]:.1f})')
  E('cv',{'type':'vq','cmd':'replay'});pg.wait_for_timeout(500);pg.reload();pg.wait_for_function("()=>{const v=document.querySelector('video.vqv');return v&&!v.paused&&v.currentTime>0.1}",timeout=15000)
  a=pg.evaluate("()=>document.querySelector('video.vqv').currentTime");assert a<3.5,a;print(f'PASS MC bấm phát lại rồi màn tải lại: chạy từ đầu theo lệnh mới ({a:.1f}s), không nhảy về chỗ cũ')
  pg.close()
  # ---------- 2) hoạt cảnh vẽ (máy không có tệp phim) ----------
  pin=finished_room('a');pg=led(pin,True);pg.wait_for_timeout(1200);E('ca',{'type':'next'});W('ca','finished')
  pg.wait_for_selector('svg.vq',timeout=10000);pg.wait_for_function("()=>VQAnim.snapshot()&&VQAnim.snapshot().t>7",timeout=20000);pg.wait_for_timeout(2300)
  s0=pg.evaluate("()=>VQAnim.snapshot()");pg.reload();pg.wait_for_selector('svg.vq',timeout=10000);pg.wait_for_function("()=>window.__vqResumed",timeout=8000);pg.wait_for_timeout(300)
  s1=pg.evaluate("()=>VQAnim.snapshot()");assert s1['t']>=s0['t']-2.6 and s1['dx']<=s0['dx']+1,(s0,s1)
  print(f"PASS hoạt cảnh: tải lại ở giây {s0['t']:.1f} (cảnh {s0['mode']}) → chạy tiếp từ giây {s1['t']:.1f} (cảnh {s1['mode']}), đoàn rước không quay lại vạch xuất phát")
  E('ca',{'type':'vq','cmd':'honor'});pg.wait_for_function("()=>['honor','hold'].includes(VQAnim.snapshot().mode)",timeout=20000);pg.wait_for_timeout(2300)
  pg.reload();pg.wait_for_selector('svg.vq',timeout=10000);pg.wait_for_function("()=>window.__vqResumed",timeout=8000);pg.wait_for_timeout(300)
  s2=pg.evaluate("()=>[VQAnim.snapshot().mode,document.querySelector('#vinhQuy').classList.contains('celebrate'),+getComputedStyle(document.querySelector('#vqTitle')).opacity]")
  assert s2[0] in ('honor','hold') and s2[1] and s2[2]>0.5,s2;print('PASS tải lại lúc đang vinh danh: vẫn ở cảnh vinh danh, thẻ tên vẫn hiện',s2)
  # màn KHÔNG tin cậy (khách lạ mở /led) không được ghi đè vị trí
  pg3=b.new_context().new_page();pg3.goto(f'http://127.0.0.1:{PORT}/health');pg3.evaluate("()=>{"+CTL+"}")
  pg3.evaluate("p=>mk('x').then(()=>{emit('x',{type:'watch',pin:p});return new Promise(r=>setTimeout(r,300))}).then(()=>emit('x',{type:'vq_pos',s:{kind:'anim',mode:'intro',t:0,dx:999,speed:1},key:''}))",pin);pg.wait_for_timeout(300)
  pg.reload();pg.wait_for_selector('svg.vq',timeout=10000);pg.wait_for_function("()=>window.__vqResumed",timeout=8000)
  assert pg.evaluate("()=>VQAnim.snapshot().mode")!='intro';print('PASS màn lạ chưa ghép đôi gửi vị trí giả → bị bỏ qua')
  assert not errs,errs;print('PASS không lỗi JavaScript');b.close()
finally:
 proc.terminate()
 try:proc.communicate(timeout=3)
 except Exception:proc.kill()
 TMP.cleanup()
