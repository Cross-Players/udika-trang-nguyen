"""Kiểm thử phông chữ tiếng Việt: đủ glyph, tự lưu trữ (không gọi Google Fonts), mọi trang đều nạp được phông."""
import os,glob,re,subprocess,tempfile,time,unicodedata,sys
from fontTools.ttLib import TTFont
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PUB=ROOT+'/public';ok=True
def rep(c,m):
    global ok;print(('PASS ' if c else 'FAIL ')+m);ok=ok and c
base="aàảãáạăằẳẵắặâầẩẫấậeèẻẽéẹêềểễếệiìỉĩíịoòỏõóọôồổỗốộơờởỡớợuùủũúụưừửữứựyỳỷỹýỵđ"
VN=set(base+base.upper())
# 1) đủ 134 chữ cái tiếng Việt (67 thường + 67 hoa) trong mọi phông
fonts={os.path.basename(f):TTFont(f).getBestCmap() for f in glob.glob(PUB+'/assets/fonts/*.woff')}
rep(len(fonts)>=2,f'có {len(fonts)} phông tự lưu trữ: {", ".join(sorted(fonts))}')
for n,cm in fonts.items():
    miss=sorted(c for c in VN if ord(c) not in cm);rep(not miss,f'{n}: đủ {len(VN)} chữ cái tiếng Việt có dấu'+(f' – thiếu {"".join(miss)}' if miss else ''))
# 2) mọi chữ cái (Latin) xuất hiện trong giao diện đều có trong phông
used=set()
for f in glob.glob(PUB+'/*.html')+glob.glob(PUB+'/*.js')+glob.glob(PUB+'/*.css'):
    for ch in open(f,encoding='utf-8',errors='ignore').read():
        if ord(ch)>127 and unicodedata.category(ch).startswith('L') and 'LATIN' in unicodedata.name(ch,''):used.add(ch)
sans=fonts.get('udika-sans.woff',{});serif=fonts.get('udika-serif.woff',{})
miss=sorted(c for c in used if ord(c) not in sans or ord(c) not in serif)
rep(not miss,f'{len(used)} chữ cái có dấu dùng trong giao diện đều có trong cả hai phông'+(f' – thiếu: {"".join(miss)}' if miss else ''))
# 3) không còn phụ thuộc Google Fonts
ext=[f for f in glob.glob(PUB+'/*.*') if re.search(r'fonts\.(googleapis|gstatic)\.com',open(f,encoding='utf-8',errors='ignore').read())]
rep(not ext,'không trang nào tải phông từ Google Fonts (chạy được trong mạng nội bộ không Internet)'+(f' – còn: {ext}' if ext else ''))
# 4) trình duyệt: phông nạp thật trên mọi trang, không gọi ra ngoài, chữ hoa có dấu chồng không bị cắt
PORT=18965;T=tempfile.mkdtemp()
env={**os.environ,'PORT':str(PORT),'DATA_FILE':T+'/r.json','ADMIN_PASSWORD':'UDIKA-Local-Test-Password-8841','SESSION_SECRET':'udika-local-test-secret-random-1234567890'}
pr=subprocess.Popen(['node','server.js'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1.3)
try:
  with sync_playwright() as p:
    b=p.chromium.launch()
    for path in ['/','/join','/host','/led','/admin']:
        pg=b.new_page();outside=[]
        pg.on('request',lambda r:outside.append(r.url) if not r.url.startswith(f'http://127.0.0.1:{PORT}') and not r.url.startswith(('data:','blob:')) else None)
        pg.goto(f'http://127.0.0.1:{PORT}{path}',wait_until='load');pg.evaluate('document.fonts.ready');pg.wait_for_timeout(300)
        st=pg.evaluate("""async()=>{await document.fonts.load('700 40px "Udika Serif"','ẠỆỘỰ');await document.fonts.load('600 16px "Udika Sans"','ẠỆỘỰ');
          return {sans:document.fonts.check('16px "Udika Sans"','Trạng nguyên'),serif:document.fonts.check('700 40px "Udika Serif"','TRẠNG NGUYÊN'),
          body:getComputedStyle(document.body).fontFamily}}""")
        rep(st['sans'] and st['serif'] and 'Udika Sans' in st['body'] and not outside,f'{path}: nạp Udika Sans/Serif, phông thân trang = {st["body"].split(",")[0]}'+(f' – gọi ra ngoài: {outside}' if outside else ''))
        pg.close()
    pg=b.new_page(viewport={'width':1366,'height':768});pg.goto(f'http://127.0.0.1:{PORT}/');pg.evaluate('document.fonts.ready');pg.wait_for_timeout(400)
    # vùng tô chữ nhũ vàng phải chứa trọn dấu của chữ hoa: đo khung chữ thật so với khung phần tử
    m=pg.evaluate("""()=>{const t=document.querySelector('.h-title');const cs=getComputedStyle(t);const c=document.createElement('canvas').getContext('2d');c.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
      const out=[];for(const sp of t.querySelectorAll('span')){const mk=document.createElement('i');mk.style.cssText='display:inline-block;width:0;height:0;vertical-align:baseline';sp.appendChild(mk);
        const base=mk.getBoundingClientRect().top;mk.remove();out.push(base-c.measureText(sp.textContent).actualBoundingBoxAscent)}
      const box=t.getBoundingClientRect();return {glyphTop:Math.min(...out),boxTop:box.top,first:out[0]}}""")
    rep(m['glyphTop']>=m['boxTop'],f'tiêu đề: đỉnh dấu chữ hoa (À, Ê) nằm trong vùng tô nhũ vàng (đỉnh dấu {m["glyphTop"]-m["boxTop"]:+.1f}px so với mép trên)')
    b.close()
finally: pr.kill()
print('KẾT QUẢ:', 'ĐẠT' if ok else 'CHƯA ĐẠT');sys.exit(0 if ok else 1)
