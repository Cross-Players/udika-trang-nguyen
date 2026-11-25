'''Chơi thử một mình: trang chủ có lối vào; tải bộ đề mẫu; chơi hết với đối thủ ảo; phản hồi đúng/sai + đáp án; bảng xếp hạng có dòng của mình;
cuối bài có ôn lại câu sai và làm lại câu sai; bộ đề thư viện chỉ mở khi Admin bật "Chơi thử công khai"; không lộ đáp án bộ đề kín.'''
import os,subprocess,tempfile,time,urllib.request,json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PORT=18971;TMP=tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
ENV={**os.environ,'PORT':str(PORT),'DATA_FILE':TMP.name+'/rooms.json','ADMIN_PASSWORD':'UDIKA-Local-Test-Password-8841','SESSION_SECRET':'udika-local-test-secret-random-1234567890'}
proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env=ENV,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);U=f'http://127.0.0.1:{PORT}'
def ok(s):print('PASS',s,flush=True)
try:
 for i in range(80):
  try:urllib.request.urlopen(U+'/health',timeout=2);break
  except Exception:time.sleep(.1)
 with sync_playwright() as pw:
  b=pw.chromium.launch();errs=[]
  p=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True).new_page();p.on('pageerror',lambda e:errs.append(str(e)))
  p.goto(U+'/');p.click('#practiceLink');p.wait_for_url('**/practice');ok('trang chủ có nút "Chơi thử một mình" dẫn tới /practice')
  p.wait_for_function("()=>document.querySelector('#pSet option[value]')&&document.querySelector('#pSet').value==='mau'")
  p.click('#pStart');assert 'tên' in p.text_content('#pMsg');ok('bắt buộc nhập tên')
  p.fill('#pName','Người Thử');p.select_option('#pCount','5');p.select_option('#pBots','10');p.click('#pStart');p.wait_for_selector('#play:not(.hidden)')
  saw_ok=saw_no=False
  for i in range(5):
   p.wait_for_selector('#qInput button:not([disabled]),#qInput input')
   assert p.text_content('#qNo')==f'Câu {i+1}/5'
   # câu chẵn cố tình trả lời SAI, câu lẻ trả lời ĐÚNG; trắc nghiệm bấm ô thật, các dạng khác gửi qua cùng hàm chấm của trang
   q=p.evaluate("()=>cur.q");good=i%2==1;k=q.get('kind','mc')
   if k=='mc':
    want=q['c'] if good else (q['c']+1)%len(q['a']);p.click(f'#qInput .pr-tile[data-id="{want}"]')
   else:
    p.evaluate('''([q,good])=>{const k=q.kind,n=(q.a||[]).length;let a;
     if(k==='multi')a={choices:good?q.cs.slice():[...Array(n).keys()].filter(x=>!q.cs.includes(x)).slice(0,1).concat(q.cs.length>1?[]:[(q.cs[0]+1)%n])};
     else if(k==='order')a={order:good?[...Array(n).keys()]:[...Array(n).keys()].reverse()};
     else if(k==='type')a={text:good?q.acc[0]:'sai hoàn toàn'};else a={value:good?q.c:q.c+12345,text:''};finish(a)}''',[q,good])
   p.wait_for_selector('#qFeedback:not(.hidden)')
   v=p.text_content('.pr-verdict')
   if i%2==1:assert 'Chính xác' in v,v;saw_ok=True
   else:assert 'Chưa đúng' in v and 'Đáp án đúng' in p.text_content('#qFeedback'),v;saw_no=True
   assert p.locator('.pr-board li.me').count()==1;assert '/11' in p.text_content('.pr-me')
   assert p.locator('.pr-board li').filter(has_text='🤖').count()>=4
   p.click('#nextQ')
  ok('5 câu: phản hồi Chính xác/Chưa đúng + đáp án đúng, bảng xếp hạng 11 người có dòng "(bạn)" và đối thủ 🤖')
  p.wait_for_selector('#end:not(.hidden)');t=p.text_content('#end');assert 'đúng 2/5' in t.replace('\xa0',' ') or 'đúng 2/5' in t,t
  assert 'Ôn lại 3 câu chưa đúng' in t and 'không tính vào kỳ thi' in t;ok('màn kết thúc: thứ hạng, 2/5 đúng, ôn lại 3 câu sai, ghi rõ là luyện tập')
  p.click('#redoWrong');p.wait_for_selector('#play:not(.hidden)');assert p.text_content('#qNo')=='Câu 1/3';ok('"Làm lại câu sai" mở lượt mới chỉ gồm 3 câu sai')
  # thời gian hết → "Hết giờ"
  p.evaluate("()=>{cur.T=300}");p.wait_for_selector('#qFeedback:not(.hidden)',timeout=5000);assert 'Hết giờ' in p.text_content('.pr-verdict');ok('hết giờ hiện "Hết giờ!" và đáp án')
  # bộ đề thư viện: mặc định KHÔNG mở cho chơi thử
  a=b.new_context().new_page();a.goto(U+'/health')
  J=lambda m,path,data=None:a.evaluate("a=>fetch(a[1],{method:a[0],headers:{'Content-Type':'application/json'},body:a[2]?JSON.stringify(a[2]):undefined}).then(async r=>({s:r.status,j:await r.json()}))",[m,path,data])
  J('POST','/api/login',{'role':'admin','password':ENV['ADMIN_PASSWORD']})
  lib=J('POST','/api/library',{'name':'Bộ kín','bank':[{'q':'Câu bí mật?','a':['X','Y'],'c':1,'t':20}]})
  lid=lib['j'].get('id') or lib['j'].get('item',{}).get('id');assert lid,lib
  r=J('GET','/api/practice/'+lid);assert r['s']==404;assert all(x['id']!=lid for x in J('GET','/api/practice')['j']['items']);ok('bộ đề thư viện chưa bật: không xuất hiện, không tải được (không lộ đáp án)')
  r=J('PATCH','/api/library/'+lid,{'practice':True});assert r['s']==200,r
  assert any(x['id']==lid for x in J('GET','/api/practice')['j']['items']);assert J('GET','/api/practice/'+lid)['j']['bank'][0]['q']=='Câu bí mật?';ok('Admin bật "Chơi thử công khai" → bộ đề xuất hiện trong danh sách chơi thử')
  assert not errs,errs;ok('không có lỗi JavaScript')
finally:proc.terminate()
