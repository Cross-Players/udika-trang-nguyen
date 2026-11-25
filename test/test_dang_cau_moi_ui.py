'''V15 đợt 6 – GIAO DIỆN 10 hình thức trả lời: MC soạn từng dạng trên màn soạn đề thật (đổi dạng → hiện đúng ô nhập), XEM TRƯỚC
trên điện thoại & LED trước khi lưu, rồi chơi thật trên 2 điện thoại 390 px + màn LED: đúng–sai, 6 phương án, chọn hình ảnh,
điền ô chữ (gõ tiếng Việt có dấu), ghép cặp (chạm trái → phải, sửa được), viết câu trả lời + MC duyệt tay, sắp xếp 8 mục,
ước lượng ×3, bình chọn giữ kín, câu quyết định khi bằng điểm; hiệu ứng vượt hạng; không lỗi JavaScript.
Chạy: python3 test/test_dang_cau_moi_ui.py'''
import os,json,shutil,subprocess,tempfile,time,urllib.request
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18968;TMP=tempfile.TemporaryDirectory()
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP.name+'/rooms.json','ADMIN_PASSWORD':'ui-admin-password-1','SESSION_SECRET':'ui-session-secret-long-enough-123'};ENV.pop('DATABASE_URL',None)
SHOTS=os.environ.get('SHOTS',TMP.name)
proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
U=f'http://127.0.0.1:{PORT}'
def ok(s):print('PASS',s,flush=True)
imgs=[]
for i,col in enumerate(['#c0392b','#2f5d9a','#c98a12']):
 p=f'{TMP.name}/anh{i}.png';im=Image.new('RGB',(320,240),col);d=ImageDraw.Draw(im);d.ellipse([90,50,230,190],fill='white');d.text((140,110),str(i+1),fill='black');im.save(p);imgs.append(p)
try:
 for i in range(80):
  try:urllib.request.urlopen(U+'/health',timeout=2);break
  except Exception:time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path=os.environ.get('CHROME_PATH') or shutil.which('google-chrome'),args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
  errs=[];ctx=b.new_context(viewport={'width':1440,'height':1000});h=ctx.new_page();h.on('pageerror',lambda e:errs.append('host: '+str(e)));h.on('dialog',lambda d:d.accept())
  h.goto(U+'/health');J=lambda path,data:h.evaluate("a=>fetch(a[0],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a[1])}).then(r=>r.json())",[path,data])
  J('/api/login',{'role':'admin','password':ENV['ADMIN_PASSWORD']});pin=J('/api/rooms',{'title':'Thử 10 hình thức','mcUser':'mcui','password':'password-test-0123'})['pin']
  J('/api/login',{'role':'mc','pin':pin,'user':'mcui','password':'password-test-0123'});h.goto(f'{U}/host?pin={pin}');h.wait_for_function("()=>typeof bank!=='undefined'&&bank.length>0",timeout=10000)
  n0=h.evaluate("bank.length")
  def new(kind,q,t=40):
   h.click('[data-add="0"]');h.select_option('#editKind',kind);h.fill('#editQuestion','[UI] '+q);h.fill('#editTime',str(t))
  def vis(sel):return h.is_visible(sel)
  def save():
   n=h.evaluate("bank.length");h.click('#qSave');h.wait_for_function("n=>bank.length===n+1",arg=n,timeout=8000)
  # 03 Đúng – Sai
  new('tf','Văn Miếu được lập năm 1070?');assert vis('#editTF') and not vis('#editA');h.select_option('#editTF','0');save()
  # 01 sáu phương án
  new('mc','Chọn phương án thứ sáu');assert vis('#editE') and vis('#editF') and not vis('#editG')
  for x,v in zip('ABCDEF',['Một','Hai','Ba','Bốn','Năm','Sáu']):h.fill('#edit'+x,v)
  h.select_option('#editCorrect','5');save()
  # 09 chọn hình ảnh
  new('img','Ảnh nào màu xanh?');assert vis('#optImgs')
  for i,p in enumerate(imgs):
   with h.expect_file_chooser() as fc:h.click(f'[data-imgup="{i}"]')
   fc.value.set_files(p);h.wait_for_selector(f'#optImgs img[alt="Ảnh phương án {"ABC"[i]}"]',timeout=8000)
  h.select_option('#editCorrect','1');save()
  # 04 điền ô chữ: bấm ô để hiện chữ gợi ý
  new('fill','👑📜 Đuổi hình bắt chữ');assert vis('#editWord') and not vis('#editA');h.fill('#editWord','TRẠNG NGUYÊN');h.click('#fillCells [data-fh="0"]');h.click('#fillCells [data-fh="7"]')
  assert h.locator('#fillCells .fill-cell.hint').count()==2
  h.click('#qPreview');ph=h.frame_locator('#previewPhone');ph.locator('#fillIn').wait_for(timeout=10000)
  assert ph.locator('.fill-cell.hint').count()==2 and ph.locator('.fill-cell').count()==11
  led=h.frame_locator('#previewLed');led.locator('.fill-cells.led').wait_for(timeout=10000)
  ph.locator('#fillIn').fill('RẠNNUYÊN');assert ph.locator('.fill-cell.typed').count()==8
  h.check('#previewAns');led.locator('.fill-cell.shown').first.wait_for(timeout=5000);assert 'TRẠNG NGUYÊN' in ph.locator('#answerNote').inner_text()
  h.wait_for_timeout(300);h.screenshot(path=SHOTS+'/xem_truoc_dien_o_chu.png');h.uncheck('#previewAns');h.click('#previewClose')
  ok('XEM TRƯỚC trước khi lưu: điện thoại hiện 11 ô (2 ô gợi ý), gõ "RẠNNUYÊN" lấp 8 ô trống; LED hiện ô chữ; bật "hiện đáp án" thấy TRẠNG NGUYÊN')
  save()
  # 10 ghép cặp
  new('match','Ghép Trạng nguyên với quê hương',60);assert vis('#editML1') and not vis('#editA')
  pairs=[('Lương Thế Vinh','Nam Định'),('Mạc Đĩnh Chi','Hải Dương'),('Nguyễn Hiền','Nam Định (Thượng Hiền)'),('Lê Văn Thịnh','Bắc Ninh')]
  for i,(l,r) in enumerate(pairs,1):h.fill(f'#editML{i}',l);h.fill(f'#editMR{i}',r)
  h.click('#qPreview');ph.locator('.match-grid').wait_for(timeout=10000);assert ph.locator('[data-ml]').count()==4 and ph.locator('[data-mr]').count()==4;led.locator('.match-grid.led').wait_for();h.click('#previewClose');save()
  # 05 viết câu trả lời
  new('type','Thủ đô nước ta?');h.fill('#editAcc','Hà Nội');save()
  # 06 sắp xếp 8 mục
  new('order','Xếp 1 → 8',60);assert vis('#editG') and vis('#editH')
  for x,v in zip('ABCDEFGH','12345678'):h.fill('#edit'+x,'Mục '+v)
  save()
  # 07 ước lượng ×3, điểm cố định, tối đa 2000
  new('number','Đoán năm khoa thi đầu tiên');h.fill('#editNum','1075');h.fill('#editNumTol','10');h.check('#editProx');h.click('#qRules summary')
  h.select_option('#editPts','3');h.select_option('#editScoring','accuracy');h.fill('#editMaxPts','2000');h.dispatch_event('#editMaxPts','change');assert '×3' in h.inner_text('#qRulesSum');save()
  # 08 bình chọn giữ kín
  new('poll','Bạn thích vòng thi nào?');h.fill('#editA','Thi Hương');h.fill('#editB','Thi Hội');h.fill('#editC','Thi Đình');h.check('#editHideLive');save()
  # câu quyết định khi bằng điểm
  new('mc','Câu quyết định: 1 + 1 = ?');h.fill('#editA','2');h.fill('#editB','3');h.fill('#editC','');h.fill('#editD','');h.select_option('#editCorrect','0');h.click('#qRules summary');h.check('#editTie');save()
  nb=h.evaluate("bank.length");h.click('#addSamples');h.wait_for_function("n=>bank.length===n+11",arg=nb,timeout=8000);ok('nút "🎲 Thêm câu mẫu trò chơi" thêm 11 câu mẫu vào cuối các chặng (không xoá câu cũ)')
  B=h.evaluate("bank.filter(q=>q.q.startsWith('[UI]'))");assert len(B)==10,len(B)
  K=[(q['kind'],q.get('tf'),q.get('pts'),q.get('tie'),q.get('hideLive'),q.get('prox')) for q in B]
  assert B[0]['tf'] and B[1]['c']==5 and len(B[1]['a'])==6 and len(B[2]['ai'])==3 and B[2]['c']==1 and B[3]['word']=='TRẠNG NGUYÊN' and B[3]['hint']==[0,7] and B[4]['kind']=='match' and len(B[6]['a'])==8 and B[7]['pts']==3 and B[7]['maxPts']==2000 and B[7]['prox'] and B[8]['hideLive'] and B[9]['tie'],K
  ok('MC soạn trên giao diện: đổi dạng câu → chỉ hiện ô nhập phù hợp; lưu đủ 10 câu (đúng–sai, 6 phương án, 3 ảnh, ô chữ có gợi ý, 4 cặp ghép, viết câu trả lời, 8 mục, ước lượng ×3 tối đa 2000 cố định, bình chọn giữ kín, câu quyết định)')
  # mở lại câu cũ: form hiện đúng dạng
  idx_fill=h.evaluate("bank.findIndex(q=>q.kind==='fill'&&q.q.startsWith('[UI]'))");h.evaluate(f"openEdit({idx_fill})");assert h.input_value('#editKind')=='fill' and h.input_value('#editWord')=='TRẠNG NGUYÊN'
  idx_img=h.evaluate("bank.findIndex(q=>q.ai&&q.q.startsWith('[UI]'))");h.evaluate(f"openEdit({idx_img})");assert h.input_value('#editKind')=='img'
  h.evaluate("emit({type:'bank_set',bank:bank.filter(q=>q.q.startsWith('[UI]'))})");h.wait_for_function("()=>bank.length===10",timeout=8000);h.evaluate("emit({type:'set_option',autoReveal:false,streak:false})")
  # ---------- chơi ----------
  lp=b.new_context(viewport={'width':1920,'height':1080}).new_page();lp.on('pageerror',lambda e:errs.append('led: '+str(e)));lp.goto(f'{U}/led?pin={pin}')
  P=[]
  for nm in ['Nguyễn Văn Giáp','Trần Thị Ất']:
   pg=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True).new_page();pg.on('pageerror',lambda e,nm=nm:errs.append(nm+': '+str(e)))
   pg.goto(f'{U}/join?pin={pin}');pg.fill('#name',nm);pg.click('#joinButton');pg.wait_for_selector('#playPanel:not(.hidden)',timeout=8000);P.append(pg)
  A,Bp=P
  def start():
   h.evaluate("emit({type:'start'})");[p.wait_for_function("()=>current&&current.phase==='running'&&current.q",timeout=8000) for p in P]
   lp.wait_for_function("()=>current&&current.phase==='running'",timeout=8000);t=lp.inner_text('#qcount')+A.inner_text('#qNumber');assert 'undefined' not in t and 'null' not in t,t
  def reveal():
   h.wait_for_timeout(300);h.evaluate("emit({type:'reveal'})");[p.wait_for_function("()=>current&&current.phase==='reveal'",timeout=8000) for p in P];lp.wait_for_function("()=>current&&current.phase==='reveal'",timeout=8000)
  def nxt():
   h.wait_for_timeout(300);h.evaluate("emit({type:'next'})");h.wait_for_function("()=>room&&room.phase==='ready'",timeout=8000)
  def saved(p):p.wait_for_function("()=>/Đã lưu bài nộp/.test(document.getElementById('answerNote').textContent)",timeout=8000)
  def no_hscroll(p):assert p.evaluate("()=>document.documentElement.scrollWidth<=innerWidth+1"),'tràn ngang'
  # Q1 đúng–sai
  start();assert A.locator('.tile.tf').count()==2 and '✔' in A.locator('.tile.tf .shape').first.inner_text();A.locator('.tile.tf',has_text='Đúng').click();Bp.locator('.tile.tf',has_text='Sai').click();saved(A);reveal();nxt()
  # Q2 sáu phương án
  start();assert A.locator('.choice.tile').count()==6 and A.locator('.tile.c5').count()==1 and lp.locator('.choice.tile').count()==6;no_hscroll(A)
  A.locator('.choice.tile',has_text='Sáu').click();Bp.locator('.choice.tile',has_text='Năm').click();saved(A);reveal();nxt()
  # Q3 chọn hình ảnh
  start();assert A.locator('.choice.tile img.opt-img').count()==3;A.locator('[data-id="1"]').click()  # phương án theo MÃ gốc: ảnh thứ 2 (xanh) là đáp án đúng
  Bp.locator('[data-id="0"]').click();saved(A);reveal();assert A.evaluate("()=>current.my.answer.correct");nxt()
  # Q4 điền ô chữ (gõ tiếng Việt có dấu)
  start();A.locator('#fillIn').fill('RẠNNUYÊN');A.click('#fillGo');assert 'Cần đúng 9 chữ' in A.inner_text('#errors'),'thiếu chữ phải báo trên máy, không gửi';A.locator('#fillIn').fill('RẠNGNUYÊN');assert A.locator('#fillCellsP .fill-cell.typed').count()==9;A.screenshot(path=SHOTS+'/dien_thoai_dien_o_chu.png');A.click('#fillGo');saved(A)
  Bp.locator('#fillIn').fill('RANGNUYEN');Bp.click('#fillGo');saved(Bp);lp.wait_for_selector('.fill-cells.led');lp.screenshot(path=SHOTS+'/led_dien_o_chu.png');reveal()
  assert A.evaluate("()=>current.my.answer.correct") and not Bp.evaluate("()=>current.my.answer.correct");nxt()
  ok('điện thoại: đúng–sai (✔/✘), 6 phương án (màu ô E/F mới, không tràn ngang 390 px), chọn hình ảnh, ô chữ: gõ thiếu chữ được nhắc ngay trên máy, gõ "RẠNGNUYÊN" → đúng, "RANGNUYEN" thiếu dấu → sai')
  # Q5 ghép cặp: chạm trái → phải; sửa một cặp trước khi nộp
  start();R=A.evaluate("()=>current.q.r");want=[r for _,r in pairs]
  def tap(p,i,rtext):p.locator(f'[data-ml="{i}"]').click();p.locator('[data-mr]',has_text=rtext).first.click() if sum(1 for x in R if x==rtext)==1 else None
  for i,(l,r) in enumerate(pairs):
   j=R.index(r);A.locator(f'[data-ml="{i}"]').click();A.locator(f'[data-mr="{j}"]').click()
  assert not A.locator('#matchGo').is_disabled()
  # sửa: ghép nhầm cặp 1 với vế của cặp 2 rồi sửa lại
  A.locator('[data-ml="0"]').click();A.locator(f'[data-mr="{R.index(want[1])}"]').click();assert A.locator('#matchGo').is_disabled(),'ghép trùng vế phải → cặp kia bị gỡ, chưa nộp được'
  A.locator('[data-ml="1"]').click();A.locator(f'[data-mr="{R.index(want[0])}"]').click();A.locator('[data-ml="0"]').click();A.locator(f'[data-mr="{R.index(want[0])}"]').click()
  A.locator('[data-ml="1"]').click();A.locator(f'[data-mr="{R.index(want[1])}"]').click();A.screenshot(path=SHOTS+'/dien_thoai_ghep_cap.png');no_hscroll(A);A.click('#matchGo');saved(A)
  for i,(l,r) in enumerate(pairs):
   o=pairs[1-i][1] if i<2 else r  # đổi chỗ 2 cặp đầu → đúng 2/4
   j=R.index(o);Bp.locator(f'[data-ml="{i}"]').click();Bp.locator(f'[data-mr="{j}"]').click()
  Bp.click('#matchGo');saved(Bp);reveal();lp.wait_for_selector('.match-led');lp.screenshot(path=SHOTS+'/led_ghep_cap.png')
  ra,rb=A.evaluate("()=>current.my.answer"),Bp.evaluate("()=>current.my.answer");assert ra['correct'] and ra['points']>900 and not rb['correct'] and rb.get('part')==0.5 and rb['points']<ra['points'],(ra,rb)
  assert A.locator('.match-reveal li.ok').count()==4;nxt()
  ok('ghép cặp: chạm trái → phải, ghép trùng thì cặp cũ tự gỡ (chưa nộp được), sửa lại rồi nộp; 4/4 đúng = đủ điểm (theo tốc độ), 2/4 = 50%; LED công bố từng cặp kèm tỷ lệ')
  # Q6 viết câu trả lời + MC duyệt tay trên giao diện
  start();A.fill('#typeIn','Hà Nội');A.click('#typeGo');Bp.fill('#typeIn','Ha Noi');Bp.click('#typeGo');saved(A);saved(Bp);reveal()
  h.wait_for_selector('#reviewBox [data-rv][data-on="1"]',timeout=8000);s0=h.evaluate("room.leaderboard.find(p=>p.name==='Trần Thị Ất').score")
  h.click('#reviewBox [data-rv][data-on="1"]');h.wait_for_function("s=>room.leaderboard.find(p=>p.name==='Trần Thị Ất').score>s",arg=s0,timeout=8000)
  Bp.wait_for_function("()=>current.my&&current.my.answer&&current.my.answer.correct",timeout=8000);nxt()
  ok('viết câu trả lời: MC thấy hộp "Duyệt tay" liệt kê "Ha Noi", bấm ✔ Chấp nhận (có hỏi xác nhận) → sĩ tử được tính đúng, bảng điểm cập nhật ngay')
  # Q7 sắp xếp 8 mục
  start();assert A.locator('.order-item').count()==8;A.click('#orderGo') if A.locator('#orderGo').count() else A.locator('button.submit-btn').click();saved(A);Bp.locator('button.submit-btn').click();saved(Bp);reveal();nxt()
  # Q8 ước lượng ×3: Ất đoán đúng → vượt hạng
  start();assert '×3' in A.inner_text('#qNumber');assert 'càng gần' in lp.inner_text('#examBoard') if lp.locator('#examBoard').count() else True
  A.fill('#typeIn','1200');A.click('#typeGo');Bp.fill('#typeIn','1075');Bp.click('#typeGo');saved(A);saved(Bp);reveal()
  rb=Bp.evaluate("()=>current.my.answer");assert rb['points']==6000,rb
  lp.wait_for_selector('.rank.up .up-badge',timeout=5000);Bp.wait_for_selector('.rank-up',timeout=5000);lp.screenshot(path=SHOTS+'/led_vuot_hang.png');nxt()
  ok('ước lượng ×3, cố định, tối đa 2000: đoán đúng tuyệt đối = 6000 điểm; người bị vượt / vượt lên: LED hiện ▲ ở bảng điểm, điện thoại hiện "🚀 vượt lên … hạng"')
  # Q9 bình chọn giữ kín
  start();A.locator('.choice.tile',has_text='Thi Đình').click();Bp.locator('.choice.tile',has_text='Thi Đình').click();h.wait_for_timeout(600)
  assert 'giữ kín' in lp.inner_text('body') and lp.locator('.bar-n').count()==0,'LED không được lộ kết quả bình chọn';reveal();lp.wait_for_function("()=>[...document.querySelectorAll('.bar-n')].some(x=>/2 · 100%/.test(x.textContent))",timeout=6000);nxt()
  # Q10 câu quyết định
  start();assert 'quyết định' in A.inner_text('#qNumber');sA=h.evaluate("room.leaderboard.find(p=>p.name==='Nguyễn Văn Giáp').score");A.locator('.choice.tile',has_text='2').first.click();saved(A);reveal()
  assert h.evaluate("room.leaderboard.find(p=>p.name==='Nguyễn Văn Giáp').score")==sA,'câu quyết định không cộng vào tổng'
  ok('bình chọn giữ kín: LED chỉ hiện các lựa chọn + "giữ kín", không lộ số; MC công bố → 2 phiếu · 100%; câu quyết định khi bằng điểm không cộng vào tổng')
  assert not errs,errs;ok('không lỗi JavaScript trên màn MC, LED, 2 điện thoại và khung xem trước');b.close()
finally:
 proc.terminate()
 try:proc.communicate(timeout=3)
 except Exception:proc.kill()
 TMP.cleanup()
