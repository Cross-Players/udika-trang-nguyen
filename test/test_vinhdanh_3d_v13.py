'''V13: phim vinh danh 3D trên màn LED – tên thật của người đứng đầu, lệnh MC (tạm dừng/tiếp tục/phát lại/vinh danh/âm lượng),
không chồng tiếng, thẻ tên hiện đúng lúc. Chạy: python3 test/test_vinhdanh_3d_v13.py (cần playwright + Chrome).'''
import os, shutil
import json,os,subprocess,tempfile,time,urllib.request
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18931;TMP=tempfile.TemporaryDirectory()
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
  ctx=b.new_context();ctl=ctx.new_page();ctl.goto(f'http://127.0.0.1:{PORT}/health');ctl.evaluate("()=>{"+CTL+"}")
  J=lambda path,data:ctl.evaluate("a=>fetch(a[0],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a[1])}).then(r=>r.json())",[path,data])
  J('/api/login',{'role':'admin','password':ENV['ADMIN_PASSWORD']});pin=J('/api/rooms',{'title':'Thử vinh danh 3D','mcUser':'mctest','password':'password-test-0123'})['pin']
  J('/api/login',{'role':'mc','pin':pin,'user':'mctest','password':'password-test-0123'})
  E=lambda n,m:ctl.evaluate("a=>emit(a[0],a[1])",[n,m]);W=lambda n,ph=None:ctl.evaluate("a=>waitState(a[0],a[1])",[n,ph])
  for n in ('c','p1','p2'):ctl.evaluate("n=>mk(n)",n)
  E('c',{'type':'host_auth','pin':pin});W('c');E('p1',{'type':'join','pin':pin,'name':NAME});W('p1');E('p2',{'type':'join','pin':pin,'name':'Lê Văn Bình'});W('p2')
  E('c',{'type':'bank_set','bank':[{'stage':4,'q':'Câu thử?','a':['A','B','C','D'],'c':0,'t':10}]});W('c')
  pg=b.new_context(viewport={'width':1920,'height':1080}).new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto(f'http://127.0.0.1:{PORT}/led.html?pin={pin}');pg.wait_for_timeout(1500)
  E('c',{'type':'set_option','autoReveal':False});W('c');E('c',{'type':'start'});_st=W('c','running');qid=_st['q']['qid'];eid=_st['eid'];E('p1',{'type':'answer','qid':qid,'eid':eid,'sid':'a1','choice':0});time.sleep(0.3);E('p2',{'type':'answer','qid':qid,'eid':eid,'sid':'a2','choice':2});time.sleep(0.3)
  E('c',{'type':'reveal'});W('c','reveal');E('c',{'type':'next'});st=W('c','finished');assert st['honors'] and st['honors'][0]['name']==NAME,(st['honors'],st['leaderboard'][:3])
  pg.wait_for_selector('video.vqv',timeout=10000);print('PASS LED chuyển sang phim 3D khi có kết quả')
  pg.wait_for_function("()=>{const v=document.querySelector('video.vqv');return v&&v.currentTime>1}",timeout=15000)
  info=pg.evaluate("()=>{const v=document.querySelector('video.vqv');return {w:v.videoWidth,h:v.videoHeight,d:v.duration,muted:v.muted,title:document.querySelector('#vqTitle').textContent,aud:[...document.querySelectorAll('audio')].filter(a=>!a.paused).length}}")
  assert info['w']==1920 and info['h']==1080 and abs(info['d']-30)<0.2,info;print('PASS phim 1920×1080, 30 giây, đang phát',info['d'])
  assert NAME in info['title'],info['title'];print('PASS thẻ tên lấy dữ liệu thật:',NAME)
  assert info['aud']==0,info;print('PASS không có thẻ âm thanh nào khác phát chồng (chỉ tiếng của phim)')
  op=pg.evaluate("()=>+getComputedStyle(document.querySelector('#vqTitle')).opacity");assert op<0.05,op;print('PASS trước giây 20,3 chưa hiện thẻ tên')
  def vt():return pg.evaluate("()=>{const v=document.querySelector('video.vqv');return [v.currentTime,v.paused,v.volume]}")
  E('c',{'type':'vq','cmd':'pause'});pg.wait_for_timeout(600);a=vt();pg.wait_for_timeout(700);b2=vt();assert a[1] and abs(a[0]-b2[0])<0.01,(a,b2);print('PASS MC tạm dừng',round(a[0],2))
  E('c',{'type':'vq','cmd':'resume'});pg.wait_for_timeout(900);a=vt();assert not a[1] and a[0]>b2[0],a;print('PASS MC tiếp tục')
  E('c',{'type':'vq','cmd':'honor'});pg.wait_for_timeout(1800);a=vt();assert a[0]>=20.3,a;op=pg.evaluate("()=>+getComputedStyle(document.querySelector('#vqTitle')).opacity");assert op>0.9,op
  print('PASS MC "Vinh danh": tua tới lúc ngựa dừng, thẻ tên hiện',round(a[0],2))
  pg.screenshot(path=TMP.name+'/led.png');from PIL import Image;im=Image.open(TMP.name+'/led.png');im.save(os.environ.get('SHOT','/tmp/led_v13.png'))
  E('c',{'type':'vq','cmd':'volume','v':0.3});pg.wait_for_timeout(500);a=vt();assert abs(a[2]-0.3)<0.02,a;print('PASS âm lượng 30%')
  E('c',{'type':'vq','cmd':'replay'});pg.wait_for_timeout(700);a=vt();assert a[0]<1.5 and not a[1],a
  n=pg.evaluate("()=>document.querySelectorAll('video').length");assert n==1,n;print('PASS phát lại từ đầu, chỉ 1 phim (không chồng tiếng)')
  op=pg.evaluate("()=>+getComputedStyle(document.querySelector('#vqTitle')).opacity");assert op<0.05,op;print('PASS phát lại thì thẻ tên ẩn lại')
  pg2=b.new_context(viewport={'width':1600,'height':900}).new_page();pg2.on('pageerror',lambda e:errs.append(str(e)))
  pg2.goto(f'http://127.0.0.1:{PORT}/led.html?pin={pin}');pg2.wait_for_selector('video.vqv',timeout=10000)
  assert NAME in pg2.evaluate("()=>document.querySelector('#vqTitle').textContent");print('PASS mở màn LED khi đã có kết quả: vẫn phát phim 3D + tên thật')
  assert not errs,errs;print('PASS không lỗi JavaScript');b.close()
finally:
 proc.terminate()
 try:proc.communicate(timeout=3)
 except Exception:proc.kill()
 TMP.cleanup()
