'''HÀNH TRÌNH ĐẦY ĐỦ CỦA MỘT KHÁCH TỰ VẬN HÀNH – thao tác bằng GIAO DIỆN thật (Chrome), không gọi API tắt:
Admin cấp tài khoản khách → khách đăng nhập /khach, tạo phòng + MC → mở màn MC (bằng tài khoản khách) → màn LED mở trên MÁY KHÁC
(chưa đăng nhập) → MC bấm "đặt làm màn chính" → 3 điện thoại ghi danh qua /join → câu có âm thanh: phát xong mới mở lượt (LED đã
ghép đôi) → trả lời trên điện thoại → công bố → câu kế → xướng danh: LED vinh danh đúng TÊN THẬT người đứng đầu → tải báo cáo từ
/khach → bật Tổng duyệt (có hỏi xác nhận) → lưu trữ & xoá. Không được có lỗi JavaScript ở mọi màn.  Chạy: python3 test/test_hanh_trinh_khach.py'''
import base64,csv,io,math,os,shutil,struct,subprocess,tempfile,time,urllib.request,wave
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18958;TMP=tempfile.TemporaryDirectory();U=f'http://127.0.0.1:{PORT}'
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP.name+'/rooms.json','ADMIN_PASSWORD':'UDIKA-Local-Test-Password-8841','SESSION_SECRET':'udika-local-test-secret-random-1234567890','DATABASE_URL':''}
NODES=int(os.environ.get('ROUTER_NODES','0')) # ROUTER_NODES=3 → chạy cùng hành trình qua router.js với 3 tiến trình (cụm)
if NODES:ENV.update({'LOCAL_WORKERS':str(NODES),'WORKER_BASE_PORT':str(PORT+100)})
proc=subprocess.Popen(['node','router.js' if NODES else 'server.js'],cwd=ROOT,env=ENV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def ok(s):print('PASS',s,flush=True)
def wav(sec=1.6):
 b=io.BytesIO();w=wave.open(b,'wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(22050)
 w.writeframes(b''.join(struct.pack('<h',int(6000*math.sin(2*math.pi*196*i/22050))) for i in range(int(22050*sec))));w.close();return b.getvalue()
CH=os.environ.get('CHROME_PATH') or shutil.which('google-chrome') or None
try:
 for _ in range(100):
  try:urllib.request.urlopen(U+'/health');break
  except Exception:time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path=CH,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
  errs=[];DLG={'mode':'accept','msgs':[]}
  def onDlg(d):
   DLG['msgs'].append(d.message);d.dismiss() if DLG['mode']=='dismiss' else d.accept()
  def page(ctx,url,tag):
   p=ctx.new_page();p.on('pageerror',lambda e:errs.append(tag+': '+str(e)));p.on('dialog',onDlg);p.goto(url);return p
  # ---- 1. Admin cấp tài khoản khách ----
  ad=page(b.new_context(),U+'/admin','admin');ad.fill('#adminPassword',ENV['ADMIN_PASSWORD']);ad.click('#login');ad.wait_for_selector('#dash:not(.hidden)')
  ad.fill('#tName','Trường THPT Chu Văn An');ad.fill('#tLogin','chuvanan');ad.fill('#tPass','password-cva-2026');ad.fill('#tRooms','2');ad.fill('#tPlayers','50');ad.fill('#tExp','2099-06-30')
  ad.click('#tCreate');ad.wait_for_function("()=>/ĐÃ CẤP/.test(document.querySelector('#tNotice').textContent)")
  ok('Admin cấp tài khoản khách trên /admin')
  if NODES: # lấp nút 0 và 1 để phòng của khách rơi vào nút KHÁC nút 0 (nơi giữ sổ khách & kho đề) – kiểm đường chéo nút
   for i in range(NODES-1):ad.evaluate("t=>fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:t,mcUser:'mc-lap',password:'password-lap-0001'})}).then(r=>r.json())",'Phòng lấp '+str(i))
  # ---- 2. Khách tạo phòng ----
  kc=b.new_context(viewport={'width':1300,'height':900});k=page(kc,U+'/khach','khach')
  k.fill('#login','chuvanan');k.fill('#password','password-cva-2026');k.click('#doLogin');k.wait_for_selector('#dash:not(.hidden)')
  k.fill('#roomTitle','Rung chuông vàng Khoa bảng');k.fill('#mcUser','mc-cva');k.fill('#mcPassword','password-mc-cva-01');k.click('#createRoom')
  k.wait_for_function("()=>/ĐÃ TẠO PHÒNG/.test(document.querySelector('#roomNotice').textContent)");pin=k.text_content('#roomNotice b').strip()
  if NODES:assert int(pin)%NODES!=0,'phòng khách phải nằm ở nút khác 0: '+pin
  ok(f'Khách tự tạo phòng {pin} + tài khoản MC trên /khach'+(f' (nút {int(pin)%NODES} của cụm {NODES} nút)' if NODES else ''))
  # ---- 3. Màn MC bằng tài khoản khách; nạp đề có âm thanh ----
  k.click('text=Mở màn MC');k.wait_for_url(f'**/host?pin={pin}');k.wait_for_function("()=>typeof room!=='undefined'&&room&&room.pin")
  host=k;host.set_viewport_size({'width':1500,'height':1100})
  au=host.evaluate("a=>fetch('/api/rooms/'+a[0]+'/media',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'trong.wav',data:a[1]})}).then(r=>r.json())",[pin,base64.b64encode(wav()).decode()])
  BANK=[{'stage':0,'kind':'mc','q':'Nghe tiếng trống – nhạc cụ gì?','a':['Trống','Sáo'],'c':0,'t':30,'media':{'kind':'audio','src':au['src'],'end':1.5}},
        {'stage':0,'kind':'mc','q':'Văn Miếu được lập năm nào?','a':['1070','1075'],'c':0,'t':30}]
  host.evaluate("b=>emit({type:'bank_set',bank:b})",BANK);host.wait_for_function("()=>bank.length===2");host.evaluate("()=>emit({type:'set_option',autoReveal:false})");host.wait_for_function("()=>room.autoReveal===false")
  # ---- 4. LED trên máy khác (chưa đăng nhập) → ghép đôi bằng nút trên màn MC ----
  led=page(b.new_context(viewport={'width':1600,'height':950}),f'{U}/led?pin={pin}&label=San%20khau','led');led.wait_for_selector('#display:not(.hidden)')
  led.mouse.click(5,5)
  host.wait_for_function("()=>(room.leds||[]).length===1",timeout=10000)
  assert 'chưa ghép đôi' in host.inner_text('#ledStatus'),host.inner_text('#ledStatus')
  host.click('#ledStatus [data-mainled]');host.wait_for_function("()=>room.leds.some(l=>l.main)",timeout=8000);led.wait_for_function("()=>document.body.classList.contains('led-is-main')")
  ok('Màn LED mở trên máy khác được MC ghép đôi bằng nút "đặt làm màn chính"')
  # ---- 5. Ba điện thoại ghi danh qua /join ----
  names=['Nguyễn Thị Hoa','Trần Minh Đức','Lê Gia Bảo'];phones=[]
  for n in names:
   ph=page(b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True),f'{U}/join?pin={pin}','phone '+n)
   ph.fill('#name',n);ph.click('#joinButton');ph.wait_for_function("()=>typeof joinedOk!=='undefined'&&joinedOk",timeout=10000);phones.append(ph)
  host.wait_for_function("()=>room.count===3",timeout=8000);ok('3 điện thoại ghi danh qua /join')
  # ---- 6. Câu có âm thanh: phát xong trên LED đã ghép đôi → tự mở lượt ----
  host.click('#start');host.wait_for_function("()=>room.phase==='media'||room.phase==='running'",timeout=8000)
  host.wait_for_function("()=>room.phase==='running'",timeout=20000)
  ok('Câu có âm thanh: LED đã ghép đôi phát xong → máy chủ tự mở lượt trả lời')
  for i,ph in enumerate(phones):
   ph.wait_for_selector('#choices [data-id]',timeout=10000)
   btn=ph.query_selector_all('#choices [data-id]');texts=[x.inner_text() for x in btn];want=0 if i<2 else 1
   idx=[j for j,t in enumerate(texts) if ('Trống' if want==0 else 'Sáo') in t][0];btn[idx].click()
   ph.wait_for_function("()=>pending===null&&selected",timeout=8000)
  host.click('#reveal');host.wait_for_function("()=>room.phase==='reveal'")
  for ph in phones[:2]:ph.wait_for_function("()=>document.querySelector('#answerNote').textContent.includes('Bạn đúng')",timeout=8000)
  ok('Sĩ tử trả lời trên điện thoại; công bố: điện thoại báo đúng/sai')
  # ---- 7. Câu 2, rồi xướng danh ----
  host.evaluate("()=>emit({type:'next'})");host.wait_for_function("()=>room.idx===1&&room.phase==='ready'");host.click('#start');host.wait_for_function("()=>room.phase==='running'")
  for i,ph in enumerate(phones):
   ph.wait_for_function("()=>current&&current.q&&current.q.index===2",timeout=8000);btn=ph.query_selector_all('#choices [data-id]')
   want='1070' if i!=1 else '1075';[x for x in btn if want in x.inner_text()][0].click();ph.wait_for_function("()=>pending===null&&selected",timeout=8000)
  host.click('#reveal');host.wait_for_function("()=>room.phase==='reveal'")
  for _ in range(3):
   if host.evaluate("room.phase")=='finished':break
   host.evaluate("()=>emit({type:'next'})");time.sleep(.8)
  host.wait_for_function("()=>room.phase==='finished'",timeout=8000)
  top=host.evaluate("room.leaderboard[0].name");assert top=='Nguyễn Thị Hoa',top
  led.wait_for_function("t=>(window.__vqHonor&&window.__vqHonor.name)===t",arg=top,timeout=10000)
  ok(f'Xướng danh: LED vinh danh đúng tên thật người đứng đầu – {top}')
  # ---- 8. Báo cáo từ /khach ----
  k2=page(kc,U+'/khach','khach2');k2.wait_for_selector('#dash:not(.hidden)')
  rep=k2.evaluate("p=>fetch('/api/rooms/'+p+'/report.csv').then(r=>r.text())",pin);rows=list(csv.reader(io.StringIO(rep.lstrip('﻿'))))
  assert any(r and r[1]=='Nguyễn Thị Hoa' for r in rows if len(r)>1),rep[:300];ok('Khách tải báo cáo CSV của phòng mình từ /khach, có đủ tên sĩ tử')
  # ---- 9. Tổng duyệt có hỏi xác nhận → kỳ thi mới ----
  e0=host.evaluate("room.eid");DLG['mode']='dismiss';DLG['msgs'].clear();msgs=DLG['msgs']
  host.evaluate("()=>{const c=document.querySelector('#optRehearsal');c.checked=true;c.dispatchEvent(new Event('change'))}");time.sleep(.6)
  assert msgs and 'TỔNG DUYỆT' in msgs[0],msgs;assert host.evaluate("room.eid")==e0 and not host.evaluate("room.rehearsal"),'bấm Huỷ thì không đổi gì'
  assert not host.evaluate("document.querySelector('#optRehearsal').checked"),'Huỷ → ô Tổng duyệt trở lại chưa chọn';DLG['mode']='accept'
  host.evaluate("()=>{const c=document.querySelector('#optRehearsal');c.checked=true;c.dispatchEvent(new Event('change'))}");host.wait_for_function("e=>room.rehearsal&&room.eid!==e",arg=e0,timeout=8000)
  ok('Bật Tổng duyệt: màn MC hỏi xác nhận (Huỷ thì không đổi); đồng ý → kỳ thi mới, kết quả cũ vào lịch sử')
  # ---- 10. Lưu trữ & xoá ----
  k2.reload();k2.wait_for_selector('#dash:not(.hidden)');k2.wait_for_function(f"()=>document.querySelector('#roomRows').textContent.includes('{pin}')")
  k2.click('text=Lưu trữ & xoá');k2.wait_for_function(f"()=>document.querySelector('#arRows').textContent.includes('{pin}')",timeout=8000)
  n_links=k2.eval_on_selector_all('#arRows a','els=>els.length');assert n_links>=1,'lưu trữ phải có link CSV từng kỳ thi'
  csvtxt=k2.evaluate("h=>fetch(h).then(r=>r.text())",k2.eval_on_selector('#arRows a','a=>a.getAttribute("href")'));assert 'ĐỀ THI LÚC THI' in csvtxt and 'Nguyễn Thị Hoa' in csvtxt
  ok(f'Lưu trữ & xoá: phòng chuyển vào Lưu trữ, tải lại được CSV kỳ thi ({n_links} kỳ) có đề lúc thi và tên sĩ tử')
  assert not errs,errs;ok('Không có lỗi JavaScript trên admin, /khach, MC, LED và 3 điện thoại')
finally:
 proc.terminate()
 try:proc.wait(timeout=8)
 except Exception:proc.kill()
