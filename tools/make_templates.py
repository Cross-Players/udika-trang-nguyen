"""Tạo tệp mẫu nhập đề CÓ ẢNH: public/mau-de-thi-co-anh.docx và public/mau-cau-hoi-co-anh.xlsx
Chạy: python3 tools/make_templates.py   (cần python-docx, openpyxl, Pillow)"""
import io,os,math
from PIL import Image,ImageDraw,ImageFont
from docx import Document
from docx.shared import Cm,Pt
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));PUB=os.path.join(ROOT,'public')
FONT=os.path.join(PUB,'assets','fonts')
def font(sz):
    for f in ['/usr/share/fonts/truetype/google-fonts/ofl/montserrat/Montserrat[wght].ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
        if os.path.exists(f):return ImageFont.truetype(f,sz)
    return ImageFont.load_default()
def card(draw_fn,w=640,h=400,bg='#f7efe0'):
    im=Image.new('RGB',(w,h),bg);d=ImageDraw.Draw(im);draw_fn(d,w,h);b=io.BytesIO();im.save(b,'PNG');b.seek(0);return b
def shape(kind,color):
    def f(d,w,h):
        cx,cy,r=w//2,h//2,min(w,h)//3
        if kind=='tron':d.ellipse([cx-r,cy-r,cx+r,cy+r],fill=color)
        elif kind=='vuong':d.rectangle([cx-r,cy-r,cx+r,cy+r],fill=color)
        elif kind=='tamgiac':d.polygon([(cx,cy-r),(cx-r,cy+r),(cx+r,cy+r)],fill=color)
        else:d.polygon([(cx+r*math.cos(a*math.pi/3),cy+r*math.sin(a*math.pi/3)) for a in range(6)],fill=color)
    return card(f,400,300)
def drum(d,w,h):  # hoa văn mặt trống đồng Đông Sơn giản lược (vẽ tay bằng mã, minh hoạ)
    cx,cy=w//2,h//2
    for r,wd in [(180,4),(165,2),(130,2),(95,2),(60,2)]:d.ellipse([cx-r,cy-r,cx+r,cy+r],outline='#7a4a12',width=wd)
    for a in range(14):
        t=a*2*math.pi/14;d.polygon([(cx,cy),(cx+45*math.cos(t-0.12),cy+45*math.sin(t-0.12)),(cx+55*math.cos(t),cy+55*math.sin(t)),(cx+45*math.cos(t+0.12),cy+45*math.sin(t+0.12))],fill='#b0711c')
    for a in range(36):
        t=a*2*math.pi/36;x,y=cx+147*math.cos(t),cy+147*math.sin(t);d.ellipse([x-5,y-5,x+5,y+5],outline='#7a4a12',width=2)
def label(text,color):
    return card(lambda d,w,h:(d.rounded_rectangle([20,20,w-20,h-20],radius=24,fill=color),d.text((w/2,h/2),text,fill='white',font=font(44),anchor='mm')),400,300)

# ---------------- WORD ----------------
doc=Document();st=doc.styles['Normal'];st.font.name='Arial';st.font.size=Pt(12)
doc.add_heading('MẪU ĐỀ THI CÓ ẢNH – UDIKA KHOA BẢNG',1)
doc.add_paragraph('Cách 1 – ĐOẠN VĂN. Ảnh câu hỏi: chèn ảnh ở dòng NGAY DƯỚI dòng "Câu …". Ảnh phương án: chèn ảnh ngay sau "A." (cùng dòng) hoặc ở dòng ngay dưới dòng "A. …". Đánh dấu đáp án đúng bằng dòng "Đáp án: …", chữ đậm hoặc dấu * trước phương án.')
doc.add_paragraph('Câu 1: Hoa văn trong ảnh dưới đây thường thấy trên hiện vật nào?')
doc.add_paragraph().add_run().add_picture(card(drum),width=Cm(7))
for t in ['A. Trống đồng','B. Bình gốm men lam','C. Chiếu cói','D. Nón lá']:doc.add_paragraph(t)
doc.add_paragraph('Đáp án: A');doc.add_paragraph('Thời gian: 20');doc.add_paragraph('Chặng: Thi Hương')
doc.add_paragraph('Câu 2: Hình nào là hình tròn? (phương án chỉ có ảnh)')
for L,(k,c) in zip('ABCD',[('vuong','#2f5d9a'),('tron','#a33329'),('tamgiac','#2e7a4f'),('luc','#b07a12')]):
    p=doc.add_paragraph(f'{L}. ');p.add_run().add_picture(shape(k,c),width=Cm(3))
doc.add_paragraph('Đáp án: B')
doc.add_paragraph('Câu 3: Chọn TẤT CẢ các ô màu đỏ')
doc.add_paragraph('Dạng: chọn nhiều đáp án')
for L,(t,c) in zip('ABCD',[('Đỏ','#a33329'),('Xanh','#2f5d9a'),('Đỏ','#c0392b'),('Vàng','#b07a12')]):
    doc.add_paragraph(f'{L}. Ô {L}');doc.add_paragraph().add_run().add_picture(label(t,c),width=Cm(3))
doc.add_paragraph('Đáp án: A, C')
doc.add_paragraph('Cách 2 – BẢNG. Ảnh câu hỏi đặt trong ô "Câu hỏi" (hoặc cột "Ảnh"); ảnh phương án đặt trong ô A/B/C/D.')
tb=doc.add_table(rows=2,cols=7);tb.style='Table Grid'
for i,hd in enumerate(['Câu hỏi','A','B','C','D','Đáp án','Thời gian']):tb.rows[0].cells[i].text=hd
c=tb.rows[1].cells;c[0].text='Hình trong ảnh có mấy cạnh?';c[0].add_paragraph().add_run().add_picture(shape('luc','#7d3c98'),width=Cm(3))
for i,t in enumerate(['4','5','6','8']):c[i+1].text=t
c[5].text='C';c[6].text='20'
doc.save(os.path.join(PUB,'mau-de-thi-co-anh.docx'))

# ---------------- EXCEL ----------------
wb=Workbook();ws=wb.active;ws.title='Câu hỏi'
ws.append(['Câu hỏi','A','B','C','D','Đáp án','Thời gian','Chặng','Ảnh'])
ws.append(['Hoa văn trong ảnh thường thấy trên hiện vật nào?','Trống đồng','Bình gốm men lam','Chiếu cói','Nón lá','A',20,'Thi Hương',''])
ws.append(['Hình nào là hình tròn?','','','','','B',20,'Thi Hương',''])
hd=wb.create_sheet('Hướng dẫn');hd.column_dimensions['A'].width=120
for t in ['Trang tính đầu tiên là danh sách câu hỏi – mỗi dòng một câu.','Ảnh câu hỏi: đặt ảnh NỔI trên ô cột "Ảnh" (hoặc ô "Câu hỏi") của đúng dòng đó.','Ảnh phương án: đặt ảnh nổi trên ô A/B/C/D của dòng; ô có ảnh có thể để trống chữ.','Excel: Chèn → Ảnh → "Đặt trên ô" (Place over Cells). Ảnh kiểu "Đặt trong ô" (Place in Cell) chưa đọc được.','Hoặc ghi đường dẫn https://… của ảnh vào cột "Ảnh", "Ảnh A"…"Ảnh D".']:hd.append([t])
for col,wd in zip('ABCDEFGHI',[46,16,16,16,16,9,10,12,22]):ws.column_dimensions[col].width=wd
for r in (2,3):ws.row_dimensions[r].height=95
def xl(buf,cell,px=110):
    im=XLImage(buf);ratio=im.height/im.width;im.width=px;im.height=int(px*ratio);im.anchor=cell;ws.add_image(im)
xl(card(drum),'I2',120)
for col,(k,c) in zip('BCDE',[('vuong','#2f5d9a'),('tron','#a33329'),('tamgiac','#2e7a4f'),('luc','#b07a12')]):xl(shape(k,c),f'{col}3',100)
wb.save(os.path.join(PUB,'mau-cau-hoi-co-anh.xlsx'))
print('ok')
