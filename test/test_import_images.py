'''Ảnh trong câu hỏi: (1) soạn tay – khung "THÊM ẢNH CHO CÂU HỎI" bấm chọn tệp, KÉO THẢ, ảnh phương án kéo thả;
(2) nhập Word/Excel có ảnh nhúng → xem trước có hình thu nhỏ → thêm vào bộ đề → điện thoại & LED hiện ảnh.
Chạy: python3 test/test_import_images.py'''
import base64,os,subprocess,tempfile,time,urllib.request,io
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18964;TMP=tempfile.TemporaryDirectory(ignore_cleanup_errors=True);SHOT=os.environ.get('SHOTS','/tmp/imgshots');os.makedirs(SHOT,exist_ok=True)
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP.name+'/rooms.json','ADMIN_PASSWORD':'UDIKA-Local-Test-Password-8841','SESSION_SECRET':'udika-local-test-secret-random-1234567890'}
proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);U=f'http://127.0.0.1:{PORT}'
def ok(s):print('PASS',s,flush=True)
def png(color):
 b=io.BytesIO();Image.new('RGB',(300,200),color).save(b,'PNG');return b.getvalue()
try:
 for i in range(80):
  try:urllib.request.urlopen(U+'/health',timeout=2);break
  except Exception:time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch();errs=[]
  ctx=b.new_context(viewport={'width':1400,'height':1000});host=ctx.new_page();host.on('pageerror',lambda e:errs.append(str(e)));host.on('dialog',lambda d:d.accept())
  host.goto(U+'/health');J=lambda path,data:host.evaluate("a=>fetch(a[0],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a[1])}).then(r=>r.json())",[path,data])
  J('/api/login',{'role':'admin','password':ENV['ADMIN_PASSWORD']});pin=J('/api/rooms',{'title':'Ảnh','mcUser':'mcimg','password':'password-test-0123'})['pin']
  host.goto(f'{U}/host?pin={pin}');host.wait_for_selector('#roomPanel:not(.hidden)');n0=host.evaluate('bank.length')
  # ---- (1) soạn tay ----
  host.click('[data-add="2"]');assert host.is_visible('#qizEmpty') and 'THÊM ẢNH CHO CÂU HỎI' in host.inner_text('#qizEmpty')
  host.fill('#editQuestion','Màu của ô trong ảnh?')
  host.set_input_files('#qizFile',files=[{'name':'do.png','mimeType':'image/png','buffer':png('#a33329')}])
  host.wait_for_selector('#qizFull:not(.hidden) img[src^="/media/"]');ok('bấm khung "THÊM ẢNH CHO CÂU HỎI" → chọn tệp → ảnh hiện to ngay trong trình soạn')
  host.click('#qizRemove');host.wait_for_selector('#qizEmpty:not(.hidden)')
  # kéo thả ảnh vào khung
  b64=base64.b64encode(png('#2e7a4f')).decode()
  host.evaluate("""b64=>{const bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);const f=new File([u],'xanh.png',{type:'image/png'});const dt=new DataTransfer();dt.items.add(f);
   const z=document.querySelector('#qImageZone');z.dispatchEvent(new DragEvent('dragover',{dataTransfer:dt,bubbles:true,cancelable:true}));z.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}))}""",b64)
  host.wait_for_selector('#qizFull:not(.hidden) img[src^="/media/"]');ok('KÉO THẢ ảnh vào khung → ảnh được tải lên và gắn cho câu hỏi')
  # dán ảnh (Ctrl+V) vào ô phương án B → ảnh phương án
  host.fill('#editA','Đỏ');host.fill('#editB','Xanh');host.focus('#editB')
  host.evaluate("""b64=>{const bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);const dt=new DataTransfer();dt.items.add(new File([u],'b.png',{type:'image/png'}));
   document.activeElement.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))}""",base64.b64encode(png('#2f5d9a')).decode())
  host.wait_for_function("()=>editAi[1]&&editAi[1].startsWith('/media/')");assert host.evaluate("editMedia.src").startswith('/media/')
  ok('DÁN ảnh (Ctrl+V) khi con trỏ đang ở ô phương án B → thành ảnh của phương án B (ảnh câu hỏi giữ nguyên)')
  host.select_option('#editCorrect','1');host.click('#qSave');host.wait_for_function(f"()=>bank.length==={n0+1}")
  q=host.evaluate(f"bank.find(q=>q.q==='Màu của ô trong ảnh?')");assert q['media']['kind']=='image' and q['ai'][1].startswith('/media/'),q
  host.screenshot(path=SHOT+'/1_editor.png',full_page=False);ok('LƯU CÂU → câu có ảnh câu hỏi + ảnh phương án B được lưu trên máy chủ')
  # ---- (2) nhập Word có ảnh ----
  for fn,want_imgs in (('mau-de-thi-co-anh.docx',10),('mau-cau-hoi-co-anh.xlsx',5)):
   host.set_input_files('#importFile',os.path.join(ROOT,'public',fn));host.wait_for_selector('#importResult .import-table',timeout=15000)
   txt=host.inner_text('#importResult .status');thumbs=host.eval_on_selector_all('#importResult img.imp-q-img,#importResult img.imp-opt-img','e=>e.map(x=>x.src)')
   assert len(thumbs)==want_imgs and all('/media/' in t for t in thumbs),(fn,txt,thumbs)
   host.wait_for_function("()=>[...document.querySelectorAll('#importResult img')].every(i=>i.complete&&i.naturalWidth>0)",timeout=10000)  # chờ ảnh thu nhỏ tải xong (trước đây kiểm tra ngay → chập chờn)
   host.screenshot(path=SHOT+f'/2_import_{fn}.png',full_page=True);ok(f'nhập {fn}: {txt.split("·")[0].strip()} · {len(thumbs)} ảnh nhúng được trích ra, lưu vào máy chủ và hiện hình thu nhỏ trong bản xem trước')
   n=host.evaluate('bank.length');host.click('#importAppend');host.wait_for_function(f"()=>bank.length>{n}")
  imgs=host.evaluate("bank.filter(q=>q.media&&q.media.kind==='image'||(q.ai||[]).some(Boolean)).length");assert imgs>=6,imgs
  ok(f'thêm vào bộ đề: {imgs} câu có ảnh (ảnh câu hỏi hoặc ảnh phương án)')
  # ---- (3) chạy thử câu "hình nào là hình tròn" trên điện thoại & LED ----
  idx=host.evaluate("bank.findIndex(q=>q.q.startsWith('Hình nào là hình tròn'))")
  host.evaluate(f"()=>emit({{type:'bank_set',bank:[bank[{idx}]],baseVer:room.bankVer}})");host.wait_for_function("()=>bank.length===1")
  led=b.new_page(viewport={'width':1600,'height':1000});led.goto(f'{U}/led?pin={pin}');led.wait_for_selector('#display:not(.hidden)')
  ph=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True).new_page();ph.goto(f'{U}/join?pin={pin}');ph.fill('#name','Sĩ tử Ảnh');ph.click('#joinButton');ph.wait_for_selector('#playPanel:not(.hidden)')
  host.click('#start');ph.wait_for_selector('#choices .choice img.opt-img');ph.wait_for_function("()=>[...document.querySelectorAll('#choices .choice img.opt-img')].filter(i=>i.complete&&i.naturalWidth>0).length===4",timeout=10000);n_img=ph.eval_on_selector_all('#choices .choice img.opt-img','e=>e.filter(i=>i.complete&&i.naturalWidth>0).length')
  led.wait_for_selector('#choices .choice img.opt-img');assert n_img==4,n_img;time.sleep(.5)
  ph.screenshot(path=SHOT+'/3_phone.png');led.screenshot(path=SHOT+'/3_led.png')
  ph.click('#choices [data-id="1"]');host.click('#reveal');ph.wait_for_function("()=>document.querySelector('#answerNote').textContent.includes('Bạn đúng')")
  ok('câu nhập từ Word: 4 phương án chỉ có ảnh hiện trên điện thoại & LED; chọn ảnh hình tròn → chấm đúng')
  assert not errs,errs;ok('không lỗi JavaScript')
  b.close()
finally:proc.kill()
