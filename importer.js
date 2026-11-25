'use strict';
/* UDIKA – Nhập câu hỏi từ Word (.docx), Excel (.xlsx), CSV hoặc văn bản (.txt).
   Không cần thư viện ngoài: tự giải nén .docx/.xlsx bằng zlib của Node.
   - Tự nhận dạng câu hỏi, đáp án A–D (2–4 đáp án), đáp án đúng, thời gian, chặng.
   - Câu nào chưa ghi chặng: tự chấm độ khó và chia vào 5 chặng (dễ → khó).
   - Câu nào chưa ghi thời gian: tự đặt theo độ dài đề và đáp án. */
const zlib=require('node:zlib');

function unzip(buf){
 let eocd=-1;for(let i=buf.length-22;i>=Math.max(0,buf.length-65557);i--){if(buf.readUInt32LE(i)===0x06054b50){eocd=i;break}}
 if(eocd<0)throw Error('Tệp không đúng định dạng Word/Excel (.docx/.xlsx)');
 const count=buf.readUInt16LE(eocd+10);let p=buf.readUInt32LE(eocd+16);const files={};
 for(let k=0;k<count;k++){if(buf.readUInt32LE(p)!==0x02014b50)break;
  const method=buf.readUInt16LE(p+10),csize=buf.readUInt32LE(p+20),nlen=buf.readUInt16LE(p+28),elen=buf.readUInt16LE(p+30),clen=buf.readUInt16LE(p+32),off=buf.readUInt32LE(p+42);
  const name=buf.slice(p+46,p+46+nlen).toString('utf8');p+=46+nlen+elen+clen;
  const lnl=buf.readUInt16LE(off+26),lel=buf.readUInt16LE(off+28),start=off+30+lnl+lel,data=buf.slice(start,start+csize);
  files[name]=()=>method===0?data:method===8?zlib.inflateRawSync(data):Buffer.alloc(0);
 }
 return files;
}
const decode=s=>String(s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16))).replace(/&#(\d+);/g,(_,d)=>String.fromCodePoint(+d)).replace(/&amp;/g,'&');
const norm=s=>String(s??'').replace(/\s+/g,' ').trim();
const fold=s=>norm(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d');

/* ---- Đọc Excel ---- */
function readXlsx(buf){
 const f=unzip(buf);const shared=[];
 if(f['xl/sharedStrings.xml']){const x=f['xl/sharedStrings.xml']().toString('utf8');for(const si of x.match(/<si>[\s\S]*?<\/si>/g)||[])shared.push(decode((si.match(/<t[^>]*>([\s\S]*?)<\/t>/g)||[]).map(t=>t.replace(/<[^>]+>/g,'')).join('')))}
 const sheetName=Object.keys(f).filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a,b)=>parseInt(a.match(/\d+/))-parseInt(b.match(/\d+/)))[0];
 if(!sheetName)throw Error('Không tìm thấy trang tính trong tệp Excel');
 const x=f[sheetName]().toString('utf8');const rows=[];const byNum=new Map();
 for(const row of x.match(/<row[^>]*>[\s\S]*?<\/row>/g)||[]){const cells=[];const rnum=Number((row.match(/<row[^>]* r="(\d+)"/)||[])[1]||rows.length+1);
  for(const c of row.match(/<c [^>]*?(?:\/>|>[\s\S]*?<\/c>)/g)||[]){const ref=(c.match(/ r="([A-Z]+)\d+"/)||[])[1]||'';let col=0;for(const ch of ref)col=col*26+ch.charCodeAt(0)-64;col=Math.max(0,col-1);
   const t=(c.match(/ t="(\w+)"/)||[])[1];let v='';
   if(t==='s')v=shared[Number((c.match(/<v>([\s\S]*?)<\/v>/)||[])[1])]??'';
   else if(t==='inlineStr')v=decode(((c.match(/<is>([\s\S]*?)<\/is>/)||[])[1]||'').replace(/<[^>]+>/g,''));
   else v=decode((c.match(/<v>([\s\S]*?)<\/v>/)||[])[1]||'');
   cells[col]=norm(v)}
  const arr=Array.from(cells,x=>x||'');byNum.set(rnum,arr);rows.push(arr)}
 // ảnh: trang tính → bản vẽ (drawing) → neo theo ô (hàng, cột) → tệp trong xl/media
 const assets={};let unplaced=0;const relsOf=(name)=>{const rp=name.replace(/([^/]+)$/,'_rels/$1.rels');const m={};if(f[rp])for(const r of f[rp]().toString('utf8').match(/<Relationship [^>]*>/g)||[]){const id=(r.match(/Id="([^"]+)"/)||[])[1],t=(r.match(/Target="([^"]+)"/)||[])[1];if(id&&t)m[id]=resolvePath(name,t)}return m};
 const srels=relsOf(sheetName);
 for(const dname of Object.values(srels).filter(t=>/drawings\/drawing\d+\.xml$/.test(t))){if(!f[dname])continue;const dx=f[dname]().toString('utf8'),drels=relsOf(dname);
  // tiền tố không gian tên khác nhau tuỳ phần mềm tạo tệp (xdr:… trong Excel, không tiền tố trong một số công cụ)
  for(const an of dx.match(/<(?:\w+:)?(?:twoCellAnchor|oneCellAnchor|absoluteAnchor)\b[\s\S]*?<\/(?:\w+:)?(?:twoCellAnchor|oneCellAnchor|absoluteAnchor)>/g)||[]){
   const from=(an.match(/<(?:\w+:)?from>([\s\S]*?)<\/(?:\w+:)?from>/)||[])[1]||'';const cm=from.match(/<(?:\w+:)?col>(\d+)<\/(?:\w+:)?col>/),rm=from.match(/<(?:\w+:)?row>(\d+)<\/(?:\w+:)?row>/);const col=cm?Number(cm[1]):NaN,row=rm?Number(rm[1]):NaN;
   const rid=(an.match(/r:embed="([^"]+)"/)||[])[1];const target=rid&&drels[rid];if(!target||!f[target]||!Number.isFinite(col)||!Number.isFinite(row)){unplaced++;continue}
   const arr=byNum.get(row+1);if(!arr){unplaced++;continue}const key='asset:'+target;assets[key]=f[target];arr.imgs=arr.imgs||[];(arr.imgs[col]=arr.imgs[col]||[]).push(key)}}
 const inCell=Object.keys(f).some(n=>/^xl\/richData\//.test(n));
 rows.meta={assets,unplaced,inCell};
 return rows;
}
/* đường dẫn tương đối trong gói Office (../media/image1.png) → đường dẫn đầy đủ trong tệp zip */
function resolvePath(from,t){if(t.startsWith('/'))return t.slice(1);const parts=from.split('/');parts.pop();for(const seg of t.split('/')){if(seg==='..')parts.pop();else if(seg&&seg!=='.')parts.push(seg)}return parts.join('/')}
/* ---- Đọc Word ---- */
function readDocx(buf){
 const f=unzip(buf);if(!f['word/document.xml'])throw Error('Không đọc được nội dung tệp Word');
 const x=f['word/document.xml']().toString('utf8');const rel={};const assets={};
 if(f['word/_rels/document.xml.rels'])for(const r of f['word/_rels/document.xml.rels']().toString('utf8').match(/<Relationship [^>]*>/g)||[]){const id=(r.match(/Id="([^"]+)"/)||[])[1],t=(r.match(/Target="([^"]+)"/)||[])[1],ext=/TargetMode="External"/.test(r);if(id&&t&&!ext)rel[id]=resolvePath('word/document.xml',t)}
 const imgsOf=p=>{const out=[];for(const m of p.matchAll(/(?:r:embed|r:id)="([^"]+)"/g)){const t=rel[m[1]];if(t&&/^word\/media\//.test(t)&&f[t]){const key='asset:'+t;assets[key]=f[t];if(!out.includes(key))out.push(key)}}return out};
 const runs=p=>(p.match(/<w:r[ >][\s\S]*?<\/w:r>/g)||[]).map(r=>({t:decode((r.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)||[]).map(t=>t.replace(/<[^>]+>/g,'')).join('')),mark:/<w:b\/>|<w:b w:val="(1|true)"\/>|<w:highlight |<w:u w:val="(single|double)"|<w:color w:val="(FF0000|C00000|E00000)"/i.test(r)}));
 const paraOf=p=>{const rs=runs(p),text=norm(rs.map(r=>r.t).join(''));const imgs=imgsOf(p);const body=rs.filter(r=>norm(r.t));const marked=body.length>0&&body.filter(r=>r.mark).map(r=>r.t).join('').replace(/\s/g,'').length>=body.map(r=>r.t).join('').replace(/^\s*[A-Da-d]\s*[.):\-]\s*/,'').replace(/\s/g,'').length*.6;return {text,marked,imgs}};
 const tables=[];let rest=x;
 for(const tb of x.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g)||[]){const rows=[];for(const tr of tb.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g)||[]){const tcs=tr.match(/<w:tc>[\s\S]*?<\/w:tc>/g)||[];const row=tcs.map(tc=>norm((tc.match(/<w:p[ >][\s\S]*?<\/w:p>/g)||[]).map(p=>paraOf(p).text).join(' ')));const im=tcs.map(imgsOf);if(im.some(a=>a.length))row.imgs=im;rows.push(row)}tables.push(rows);rest=rest.replace(tb,'')}
 const paras=(rest.match(/<w:p[ >][\s\S]*?<\/w:p>/g)||[]).map(paraOf).filter(p=>p.text||p.imgs.length);
 return {tables,paras,assets,images:Object.keys(f).filter(k=>/^word\/media\//.test(k)).length};
}
/* ---- Nhận dạng đáp án, chặng ---- */
const STAGES=['lop thay do','khao hach','thi huong','thi hoi','thi dinh'];
function parseStage(v){const s=fold(v);if(!s)return null;
 const i=STAGES.findIndex(n=>s.includes(n)||s===n.replace('thi ',''));if(i>=0)return i;
 if(/^[1-5]$/.test(s))return Number(s)-1;
 if(/rat kho|cuc kho|nang cao/.test(s))return 4;if(/\bkho\b/.test(s))return 3;if(/trung binh|vua/.test(s))return 2;if(/\bde\b|co ban|nhan biet/.test(s))return 0;
 return null}
function parseAnswer(v,opts){const raw=norm(v);if(!raw)return null;const s=fold(raw);
 const m=s.match(/^([a-f])(?:[.):\s]|$)/);if(m)return 'abcdef'.indexOf(m[1]);
 if(/^[1-6]$/.test(s))return Number(s)-1;
 const i=opts.findIndex(o=>fold(o)===s);if(i>=0)return i;
 if(/^(dung|d|true|t|co)$/.test(s)){const k=opts.findIndex(o=>/^(dung|true|co)$/.test(fold(o)));return k>=0?k:0}
 if(/^(sai|s|false|f|khong)$/.test(s)){const k=opts.findIndex(o=>/^(sai|false|khong)$/.test(fold(o)));return k>=0?k:1}
 return null}
function parseKind(v){const s=fold(v);if(!s)return null;
 if(/nhieu dap an|chon nhieu|nhieu lua chon|multi|checkbox/.test(s))return 'multi';if(/nhap so|dap an so|^so$|number|con so/.test(s))return 'number';
 if(/o chu|dien chu|crossword|tu khoa bi mat|giai ma tu/.test(s))return 'fill';if(/ghep cap|ghep doi|noi cap|noi doi|matching|^match$/.test(s))return 'match';
 if(/dung ?sai|dung\/sai|true|tf\b/.test(s))return 'tf';if(/trac nghiem|^mc$|lua chon/.test(s))return 'mc';
 if(/^go|go dap an|nhap dap an|dien|tu luan|type|viet/.test(s))return 'type';if(/sap xep|thu tu|order|puzzle/.test(s))return 'order';
 if(/tham do|binh chon|y kien|poll|khao sat/.test(s))return 'poll';if(/thanh truot|slider|uoc luong|gia tri so/.test(s))return 'slider';if(/dam may|cloud|tu khoa/.test(s))return 'cloud';return null}
const parseMulti=(v,opts)=>{const s=fold(v);if(!s)return [];const out=new Set();for(const part of s.split(/\s*(?:,|;|\+|&|\/|\bva\b|\s)\s*/)){if(!part)continue;const m=part.match(/^([a-f])$/);if(m)out.add('abcdef'.indexOf(m[1]));else if(/^[1-6]$/.test(part))out.add(Number(part)-1);else{const i=opts.findIndex(o=>fold(o)===part);if(i>=0)out.add(i)}}return [...out].sort()};
const parsePts=v=>{const s=fold(v);if(!s)return null;if(/x ?3|nhan ba|gap ba|triple|\b3\b/.test(s))return 3;if(/x ?2|nhan doi|gap doi|double|\b2\b/.test(s))return 2;if(/x ?0|khong tinh|no point|\b0\b/.test(s))return 0;if(/x ?1|chuan|\b1\b/.test(s))return 1;return null};
const httpsUrl=v=>{const t=norm(v);return /^https:\/\/[^\s"'<>\\]+$/.test(t)?t:''};
const numOf=v=>{const m=String(v??'').replace(/\s/g,'').replace(',','.').match(/-?\d+(\.\d+)?/);return m?Number(m[0]):null};
const parseTime=v=>{const n=parseInt(String(v||'').replace(/[^\d]/g,''),10);return n>=5&&n<=300?n:null};

/* ---- Từ bảng (Excel, CSV, bảng trong Word) ---- */
function fromRows(rows){
 rows=rows.filter(r=>r.some(c=>norm(c))||r.imgs);if(!rows.length)return [];
 const hi=rows.findIndex(r=>r.some(c=>/cau hoi|noi dung|question/.test(fold(c))));
 let map;
 if(hi>=0){const h=rows[hi].map(fold);map={q:h.findIndex(c=>/cau hoi|noi dung|question/.test(c)),a:[],ans:-1,t:-1,st:-1};
  ['a','b','c','d','e','f','g','h'].forEach(L=>{map.a.push(h.findIndex(c=>c===L||new RegExp('^(dap an|phuong an|lua chon|option)\\s*'+L+'$').test(c)))});
  map.ans=h.findIndex(c=>/^(dap an dung|dap an|da|answer|dung)$/.test(c)||/dap an dung/.test(c));
  map.t=h.findIndex(c=>/thoi gian|giay|time/.test(c));map.st=h.findIndex(c=>/chang|vong|muc do|do kho|ky thi|level/.test(c));map.kind=h.findIndex(c=>/^(dang|loai|kieu)( cau)?( hoi)?$|^type$|^kind$/.test(c));map.note=h.findIndex(c=>/giai thich|ghi chu|note/.test(c));map.pts=h.findIndex(c=>/^(diem|he so|he so diem|points?)$/.test(c));map.img=h.findIndex(c=>/^(anh|hinh|hinh anh|anh cau hoi|image)$/.test(c));map.ai=['a','b','c','d','e','f','g','h'].map(L=>h.findIndex(c=>new RegExp('^(anh|hinh)( phuong an| dap an)?\\s*'+L+'$').test(c)));map.tol=h.findIndex(c=>/^(sai so|tolerance)$/.test(c));map.unit=h.findIndex(c=>/^(don vi|unit)$/.test(c));
  map.vid=h.findIndex(c=>/^(video|clip|am thanh|audio|youtube|media|nhac)$/.test(c));
  // QF04: cột tiêu đề không dùng được → cảnh báo (không âm thầm bỏ dữ liệu)
  const usedCols=new Set([map.q,...map.a,map.ans,map.t,map.st,map.kind,map.note,map.pts,map.img,...map.ai,map.tol,map.unit,map.vid,h.findIndex(c=>/^(stt|so thu tu|#|tt)$/.test(c))]);
  map.unused=rows[hi].map((c,i)=>norm(c)&&!usedCols.has(i)?norm(c):null).filter(Boolean);
  rows=rows.slice(hi+1)}
 else map={q:0,a:[1,2,3,4],ans:5,t:6,st:7,kind:8,note:9,pts:-1,img:-1,ai:[-1,-1,-1,-1],tol:-1,unit:-1,vid:-1,unused:[]};
 const out=[];
 for(const r of rows){const q=norm(r[map.q]);if(!q)continue;let a=map.a.map(i=>i>=0?norm(r[i]):'');while(a.length&&!a[a.length-1])a.pop();
  const st=map.st>=0?parseStage(r[map.st]):null;const tt=map.t>=0?parseTime(r[map.t]):null;
  let kind=map.kind>=0?parseKind(r[map.kind]):null;const isTf=kind==='tf';if(isTf)kind='mc';const badKind=map.kind>=0&&norm(r[map.kind])&&!kind?norm(r[map.kind]):'';const ansRaw=map.ans>=0?norm(r[map.ans]):'';const note=map.note>=0?norm(r[map.note]):'';
  const extra={};const pv=map.pts>=0?parsePts(r[map.pts]):null;if(pv!=null)extra.pts=pv;const im=map.img>=0?httpsUrl(r[map.img]):'';if(im)extra.media={kind:'image',src:im};const ai=map.ai.map(i=>i>=0?httpsUrl(r[i]):'');
  if(r.imgs){const pic=c=>c>=0&&r.imgs[c]&&r.imgs[c][0];const qi=pic(map.img)||pic(map.q);if(qi&&!extra.media)extra.media={kind:'image',src:qi};map.a.forEach((c,i)=>{const x=pic(c);if(x&&!ai[i])ai[i]=x});
   const used=new Set([map.img,map.q,...map.a]);r.imgs.forEach((l,c)=>{if(l&&l.length&&!used.has(c))extra.lost=(extra.lost||0)+l.length})}
  if(ai.some(Boolean))extra.ai=ai;
  if(badKind)extra._why=[`dạng câu "${badKind}" chưa hỗ trợ – các dạng: trắc nghiệm, đúng – sai, chọn nhiều, gõ đáp án, điền ô chữ, nhập số, sắp xếp, ghép cặp, khảo sát, thanh trượt, đám mây từ`];
  if(map.vid>=0&&norm(r[map.vid])){const v=norm(r[map.vid]);const yt=v.match(/(?:[?&]v=|youtu\.be\/|\/embed\/|\/shorts\/)([\w-]{11})/);const u=httpsUrl(v);
   if(yt)extra.media={kind:'youtube',src:yt[1]};else if(u&&/\.(mp3|m4a|ogg|wav)(\?|$)/i.test(u))extra.media={kind:'audio',src:u};else if(u)extra.media={kind:'video',src:u};
   else(extra._why=extra._why||[]).push(`cột media "${v.slice(0,50)}" không phải đường dẫn https:// hoặc YouTube`)}
  if(map.tol>=0&&norm(r[map.tol]))extra.tol=numOf(r[map.tol]);if(map.unit>=0&&norm(r[map.unit]))extra.unit=norm(r[map.unit]);
  if(extra.ai){const n=extra.ai.reduce((m,x,i)=>x?i+1:m,0);while(a.length<n)a.push('');extra.ai=extra.ai.slice(0,Math.max(a.length,n))}
  if(kind&&kind!=='mc'){out.push({...special(kind,q,a,ansRaw,tt,st,note),...extra,...(kind==='number'&&extra.tol!=null?{tol:extra.tol}:{})});continue}
  let c=map.ans>=0?parseAnswer(r[map.ans],a):null;
  if((a.length===0||isTf&&a.length<2)&&map.ans>=0&&/^(dung|sai|d|s|true|false)$/.test(fold(r[map.ans]))){a=['Đúng','Sai'];c=parseAnswer(r[map.ans],a)}
  out.push({q,a,c,t:tt,stage:st,note,src:'bảng',...(isTf&&a.length===2?{tf:true}:{}),...extra})}
 if(map.unused&&map.unused.length)Object.defineProperty(out,'unused',{value:map.unused});
 return out;
}
/* Dạng câu đặc biệt từ một dòng bảng: gõ đáp án (Đáp án: nhiều cách viết cách nhau |), sắp xếp (A–D theo đúng thứ tự),
   thăm dò (A–D, không có đáp án), thanh trượt (A = nhỏ nhất, B = lớn nhất, C = bước, D = sai số, Đáp án = giá trị đúng), đám mây từ */
function special(kind,q,a,ansRaw,t,stage,note){const o={kind,q,a:[],c:null,t,stage,note:note||''};
 if(kind==='type')o.acc=String(ansRaw||'').split(/\s*[|;\/]\s*|\s+hoặc\s+/i).map(norm).filter(Boolean);
 if(kind==='order'||kind==='poll')o.a=a;
 if(kind==='fill'){o.word=norm(ansRaw);const ch=Array.from(o.word);o.hint=String(a[0]||'').split(/[,;\s]+/).map(Number).filter(i=>Number.isInteger(i)&&i>=1&&i<=ch.length).map(i=>i-1);if(a[1]&&/khong dau|bo dau|loose/.test(fold(a[1])))o.loose=true}
 if(kind==='match'){o.l=[];o.r=[];o.bad=[];a.filter(Boolean).forEach((x,i)=>{const m=String(x).split(/\s*(?:=|↔|⟷|<->|->|→|\|)\s*/);if(m.length===2&&m[0]&&m[1]){o.l.push(m[0]);o.r.push(m[1])}else o.bad.push(i)})}
 if(kind==='multi'){o.a=a;o.cs=parseMulti(ansRaw,a)}
 if(kind==='number'){const m=String(ansRaw||'').match(/^\s*([+\-−]?\d+(?:[.,]\d+)?)\s*(?:±\s*([\d.,]+))?\s*(.*)$/);if(m){o.c=Number(m[1].replace('−','-').replace(',','.'));if(m[2])o.tol=numOf(m[2]);if(norm(m[3]))o.unit=norm(m[3])}else o.c=null}
 if(kind==='slider'){o.min=numOf(a[0]);o.max=numOf(a[1]);o.step=numOf(a[2])??1;o.tol=numOf(a[3])??0;o.c=numOf(ansRaw)}
 return o}
/* ---- Từ văn bản (đoạn Word, .txt) ---- */
function fromParas(paras){
 const out=[];let cur=null;
 const push=()=>{if(cur&&cur.q){while(cur.a.length&&!cur.a[cur.a.length-1]&&!(cur.ai&&cur.ai[cur.a.length-1]))cur.a.pop();
   if(cur.kind&&cur.kind!=='mc'){const o=special(cur.kind,cur.q,cur.a,cur.ansRaw||'',cur.t,cur.stage,cur.note);if(cur.media)o.media=cur.media;if(cur.ai)o.ai=cur.ai;if(cur.lost)o.lost=cur.lost;if(cur.kind==='slider'){o.min=cur.min;o.max=cur.max;o.step=cur.step??1;o.tol=cur.tol??0;o.c=numOf(cur.ansRaw)}if(cur.kind==='number'){if(cur.tol!=null)o.tol=cur.tol;if(cur.unit)o.unit=cur.unit}if(cur.pts!=null)o.pts=cur.pts;out.push(o)}
   else{if(cur.c==null&&cur.marked.length===1)cur.c=cur.marked[0];out.push(cur)}}cur=null};
 const optRe=/^(\*)?\s*([A-Ha-h])\s*[.):\-]\s+(.+)$/;
 let lastOpt=-1;
 for(const {text,marked,imgs=[]} of paras){let t=norm(text);
  // ảnh: đoạn chỉ có ảnh ngay sau dòng câu hỏi → ảnh câu hỏi; ảnh nằm trong/ngay sau dòng phương án → ảnh của phương án đó
  if(imgs.length&&cur){const optLine=t&&/^(\*)?\s*([A-Ha-h])\s*[.):\-]\s*/.test(t);
   if(!t&&lastOpt>=0){cur.ai=cur.ai||[];if(!cur.ai[lastOpt]){cur.ai[lastOpt]=imgs[0];if(imgs.length>1)cur.lost=(cur.lost||0)+imgs.length-1}else cur.lost=(cur.lost||0)+imgs.length}
   else if(!t&&!cur.a.length){if(!cur.media)cur.media={kind:'image',src:imgs[0]};else cur.lost=(cur.lost||0)+1}
   else if(optLine){const L='abcdefgh'.indexOf(t.match(/^(\*)?\s*([A-Ha-h])/)[2].toLowerCase());cur.ai=cur.ai||[];cur.ai[L]=imgs[0];
    if(!/^(\*)?\s*[A-Ha-h]\s*[.):\-]\s+\S/.test(t)){if(/^\*/.test(t))cur.c=L;while(cur.a.length<L)cur.a.push('');cur.a[L]='';lastOpt=L;continue}}
   else if(!t){cur.lost=(cur.lost||0)+imgs.length;continue}
   if(!t)continue}
  else if(imgs.length&&!cur){continue}
  // dòng chỉ có nhãn "A." (ảnh của phương án nằm ở dòng kế tiếp)
  if(cur&&/^(\*)?\s*([A-Ha-h])\s*[.):\-]\s*$/.test(t)){const mm=t.match(/^(\*)?\s*([A-Ha-h])/);const L='abcdefgh'.indexOf(mm[2].toLowerCase());while(cur.a.length<L)cur.a.push('');cur.a[L]=cur.a[L]||'';if(mm[1])cur.c=L;lastOpt=L;continue}
  const qm=t.match(/^(?:câu|cau|question|q)\s*(\d+)\s*[:.)\-–]?\s*(.*)$/i)||t.match(/^(\d+)\s*[.)]\s+(.+)$/);
  if(qm&&!optRe.test(t)){push();lastOpt=-1;cur={q:norm(qm[2]),a:[],c:null,t:null,stage:null,marked:[]};if(imgs.length)cur.media={kind:'image',src:imgs[0]};
   const inl=cur.q.split(/\s(?=\*?[A-H][.)]\s)/);if(inl.length>2){cur.q=norm(inl[0]);for(const part of inl.slice(1)){const m=part.match(optRe);if(m){if(m[1])cur.c=cur.a.length;cur.a.push(norm(m[3]))}}}
   continue}
  if(!cur)continue;
  const am=t.match(/^(?:đáp án(?: đúng)?|dap an(?: dung)?|đa|answer)\s*[:\-–]?\s*(.+)$/i);if(am&&cur.kind&&cur.kind!=='mc'){cur.ansRaw=norm(am[1]);continue}
  if(am){cur.c=parseAnswer(am[1],cur.a)??cur.c;if((cur.a.length===0||cur.tf&&cur.a.length<2)&&/^(đúng|sai|dung)$/i.test(norm(am[1]))){cur.a=['Đúng','Sai'];cur.c=parseAnswer(am[1],cur.a)}continue}
  const km=t.match(/^(?:dạng|dang|loại câu|loai cau|kiểu câu)\s*[:\-–]\s*(.+)$/i);if(km){const kk=parseKind(km[1]);if(kk==='tf'){cur.kind='mc';cur.tf=true}else cur.kind=kk;continue}
  const rm=t.match(/^(?:khoảng|khoang)\s*[:\-–]?\s*(-?[\d.,]+)\s*(?:-|–|đến|den|tới)\s*(-?[\d.,]+)/i);if(rm){cur.min=numOf(rm[1]);cur.max=numOf(rm[2]);continue}
  const hm=t.match(/^(?:gợi ý|goi y|chữ gợi ý|chu goi y)\s*[:\-–]?\s*(.+)$/i);if(hm&&cur.kind==='fill'){cur.a=[norm(hm[1])];continue}
  const bm=t.match(/^(?:bước|buoc)\s*[:\-–]?\s*(.+)$/i);if(bm){cur.step=numOf(bm[1]);continue}
  const um=t.match(/^(?:đơn vị|don vi)\s*[:\-–]?\s*(.+)$/i);if(um){cur.unit=norm(um[1]);continue}
  const pm=t.match(/^(?:điểm|diem|hệ số|he so)\s*[:\-–]\s*(.+)$/i);if(pm){const v=parsePts(pm[1]);if(v!=null)cur.pts=v;continue}
  const em=t.match(/^(?:sai số|sai so)\s*[:\-–]?\s*(.+)$/i);if(em){cur.tol=numOf(em[1]);continue}
  const gm=t.match(/^(?:giải thích|giai thich|ghi chú|ghi chu)\s*[:\-–]?\s*(.+)$/i);if(gm){cur.note=norm(gm[1]);continue}
  const tm=t.match(/^(?:thời gian|thoi gian|time)\s*[:\-–]?\s*(.+)$/i);if(tm){cur.t=parseTime(tm[1]);continue}
  const sm=t.match(/^(?:chặng|chang|vòng|vong|mức độ|muc do|độ khó|do kho|kỳ thi|ky thi)\s*[:\-–]?\s*(.+)$/i);if(sm){cur.stage=parseStage(sm[1]);continue}
  const parts=t.split(/\s(?=\*?[A-F][.)]\s)/);
  if(optRe.test(parts[0])){for(const part of parts){const m=part.match(optRe);if(!m)continue;let txt=norm(m[3]);
    if(/\((đúng|dung|x)\)$|✓$|✔$/i.test(txt)){txt=norm(txt.replace(/\((đúng|dung|x)\)$|✓$|✔$/i,''));cur.c=cur.a.length}
    if(m[1])cur.c=cur.a.length;if(marked&&parts.length===1)cur.marked.push(cur.a.length);const Li='abcdef'.indexOf(m[2].toLowerCase());if(Li===cur.a.length){cur.a.push(txt)}else{while(cur.a.length<Li)cur.a.push('');cur.a[Li]=txt}lastOpt=Li}continue}
  if(!cur.a.length)cur.q=norm(cur.q+' '+t);
 }
 push();return out;
}
/* ---- Chấm độ khó & tự xếp chặng, tự đặt thời gian ---- */
function difficulty(q){const f=fold(q.q),opt=q.a.join(' ');let s=q.q.length/45+opt.length/(25*Math.max(1,q.a.length))*1.2;
 if(/\d{3,4}/.test(q.q+opt))s+=1;if(/nam nao|trieu|thoi ky|the ky|nien hieu/.test(f))s+=.8;if(/vi sao|tai sao|y nghia|nguyen nhan/.test(f))s+=1.2;
 if(/khong phai|khong dung|sai\b/.test(f)||/KHÔNG/.test(q.q))s+=1;if(/nao sau day|dau la/.test(f))s+=.4;if(q.a.length===2)s-=.8;if(q.a.length===3)s-=.3;return s}
function autoTime(q){const chars=q.q.length+q.a.join('').length;return Math.max(10,Math.min(60,Math.round((8+chars/14)/5)*5))}
const LIM={q:260,opt:160,acc:80,note:240};const ulen=x=>Array.from(String(x??'')).length;
const optKey=x=>String(x||'').normalize('NFC').toLocaleLowerCase('vi').replace(/\s+/g,' ').trim();
/* L03: giữ NGUYÊN VĂN – câu nào vượt giới hạn hoặc có phương án trùng nhau thì báo lỗi (không nhập) để người soạn sửa trong tệp;
   tuyệt đối không tự cắt khiến hai phương án khác nhau trở thành giống hệt nhau. Cảnh báo (vẫn nhập) cho các điểm cần xem lại. */
function finalize(list,meta={}){
 const errors=[],ok=[],warnings=[];const L='ABCDEFGH';
 list.forEach((q,i)=>{const why=[];const k=q.kind||'mc';const n=i+1;
  if(q._why)why.push(...q._why);
  if(!q.q)why.push('thiếu nội dung');if(ulen(q.q)>LIM.q)why.push(`câu hỏi dài ${ulen(q.q)} ký tự (tối đa ${LIM.q})`);
  (q.a||[]).forEach((x,j)=>{if(ulen(x)>LIM.opt)why.push(`phương án ${L[j]} dài ${ulen(x)} ký tự (tối đa ${LIM.opt})`)});
  (q.acc||[]).forEach((x,j)=>{if(ulen(x)>LIM.acc)why.push(`đáp án chấp nhận ${j+1} dài ${ulen(x)} ký tự (tối đa ${LIM.acc})`)});
  if(q.note&&ulen(q.note)>LIM.note)why.push(`giải thích dài ${ulen(q.note)} ký tự (tối đa ${LIM.note})`);
  const maxOpt=k==='order'?8:6;if(k!=='match'&&k!=='fill'&&(q.a||[]).length>maxOpt)why.push(`có ${q.a.length} phương án – tối đa ${maxOpt}`);
  if(['mc','multi','poll','order'].includes(k)){const has=j=>q.a[j]||(q.ai&&q.ai[j]);if(q.a.length<(k==='order'?3:2))why.push(k==='order'?'câu sắp xếp cần 3–8 mục':'cần ít nhất 2 đáp án');if(q.a.some((x,j)=>!has(j)))why.push('đáp án bị trống ở giữa');
   const seen=new Map();q.a.forEach((x,j)=>{if(!x)return;const key=optKey(x)+'|'+((q.ai&&q.ai[j])||'');if(seen.has(key))why.push(`phương án ${L[seen.get(key)]} và ${L[j]} giống hệt nhau`);else seen.set(key,j)});
   const fseen=new Map();q.a.forEach((x,j)=>{if(!x)return;const f=fold(x);if(fseen.has(f)&&optKey(q.a[fseen.get(f)])!==optKey(x))warnings.push({n,why:`phương án ${L[fseen.get(f)]} và ${L[j]} chỉ khác nhau ở dấu – kiểm tra lại có đúng ý đồ không`});else fseen.set(f,j)})}
  if(k==='mc'&&(q.c==null||q.c<0||q.c>=q.a.length))why.push('chưa xác định được đáp án đúng');
  if(k==='multi'&&!(q.cs||[]).length)why.push('chưa xác định được các đáp án đúng (ví dụ "A, C")');
  if(k==='type'&&!(q.acc||[]).length)why.push('chưa có đáp án được chấp nhận');
  if(k==='fill'&&Array.from(q.word||'').filter(c=>/[\p{L}\p{N}]/u.test(c)).length<2)why.push('điền ô chữ cần từ khoá ở cột Đáp án (ít nhất 2 chữ cái); cột A = vị trí chữ gợi ý, ví dụ "1,4"');
  if(k==='match'){if((q.bad||[]).length)why.push(`ghép cặp: mục ${q.bad.map(i=>L[i]).join(', ')} chưa đúng dạng "vế trái = vế phải"`);else if(q.l.length<3||q.l.length>6)why.push(`ghép cặp cần 3–6 cặp (đang có ${q.l.length}), mỗi ô A–F ghi "vế trái = vế phải"`)}
  if(k==='number'&&!Number.isFinite(q.c))why.push('câu nhập số cần đáp án là một số (ví dụ 1075 hoặc 12,5 ±0,5 kg)');
  if(k==='slider'&&!(q.min!=null&&q.max!=null&&q.max>q.min&&q.c!=null&&q.c>=q.min&&q.c<=q.max&&q.step>0))why.push('thanh trượt cần khoảng (nhỏ nhất < lớn nhất), bước > 0 và đáp án nằm trong khoảng');
  if(why.length)errors.push({n,q:Array.from(q.q||'').slice(0,80).join(''),why:why.join(', ')});else ok.push(q)});
 list.forEach((q,i)=>{if(q.lost)warnings.push({n:i+1,why:`có ${q.lost} ảnh không xác định được thuộc câu hỏi hay phương án nào – chưa nhập; đặt ảnh ngay dưới dòng câu hỏi (ảnh câu hỏi) hoặc cùng dòng "A." (ảnh phương án)`})});
 if(meta.unplaced)warnings.push({n:'–',why:`${meta.unplaced} ảnh trong tệp không nằm trong dòng câu hỏi nào nên chưa được nhập`});
 if(meta.inCell)warnings.push({n:'–',why:'Excel có ảnh kiểu "Đặt trong ô" (Place in Cell) – bản này chỉ đọc ảnh nổi "Đặt trên ô" (Place over Cells): chọn ảnh → chuột phải → Đặt ảnh trên ô'});
 const need=ok.filter(q=>q.stage==null);
 if(need.length){const sorted=need.map(q=>({q,d:difficulty(q)})).sort((a,b)=>a.d-b.d);sorted.forEach((x,i)=>{x.q.stage=Math.min(4,Math.floor(i*5/sorted.length));x.q.auto=true})}
 for(const q of ok){if(q.t==null){q.t=autoTime(q);q.autoT=true}}
 // giữ thứ tự theo chặng, trong chặng giữ thứ tự gốc
 const questions=ok.map((q,i)=>({...q,_i:i})).sort((a,b)=>a.stage-b.stage||a._i-b._i).map(x=>{const k=x.kind||'mc';const o={stage:x.stage,kind:k,q:x.q,a:x.a.slice(),c:k==='mc'||k==='slider'||k==='number'?x.c:null,t:x.t,autoStage:!!x.auto,autoTime:!!x.autoT};
  if(x.note)o.note=x.note;if(x.tf)o.tf=true;if(k==='fill'){o.a=[];o.word=x.word;o.hint=x.hint.slice();if(x.loose)o.loose=true}if(k==='match'){o.a=[];o.l=x.l.slice();o.r=x.r.slice()}if(k==='type'){o.acc=x.acc.slice()}if(k==='slider')Object.assign(o,{min:x.min,max:x.max,step:x.step,tol:x.tol});
  if(k==='multi')o.cs=x.cs.slice();if(k==='number'){o.tol=x.tol||0;if(x.unit)o.unit=x.unit}if(x.pts!=null&&x.pts!==1)o.pts=x.pts;if(x.media)o.media=x.media;if(x.ai&&x.ai.some(Boolean))o.ai=Array.from({length:o.a.length},(_,i)=>x.ai[i]||'');return o});
 return {questions,errors,warnings};
}
function parseCsv(text){const rows=[];let row=[],cell='',q=false;const sep=(text.split('\n')[0].match(/;/g)||[]).length>(text.split('\n')[0].match(/,/g)||[]).length?';':',';
 for(let i=0;i<text.length;i++){const ch=text[i];if(q){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++}else q=false}else cell+=ch}
  else if(ch==='"')q=true;else if(ch===sep){row.push(cell);cell=''}else if(ch==='\n'){row.push(cell);rows.push(row);row=[];cell=''}else if(ch!=='\r')cell+=ch}
 if(cell||row.length){row.push(cell);rows.push(row)}return rows}

function importQuestions(name,buf){
 const ext=String(name||'').toLowerCase().split('.').pop();let list=[],meta={};
 if(ext==='xlsx'||ext==='xlsm'){const rows=readXlsx(buf);Object.assign(meta,rows.meta||{});list=fromRows(rows)}
 else if(ext==='docx'){const d=readDocx(buf);meta.assets=d.assets;const un=[];for(const t of d.tables)if(t.length>1&&t[0].length>=3){const part=fromRows(t);list.push(...part);if(part.unused)un.push(...part.unused)}if(un.length)Object.defineProperty(list,'unused',{value:[...new Set(un)]});list.push(...fromParas(d.paras))}
 else if(ext==='csv')list=fromRows(parseCsv(buf.toString('utf8').replace(/^﻿/,'')));
 else if(ext==='txt'||ext==='md')list=fromParas(buf.toString('utf8').replace(/^﻿/,'').split(/\r?\n/).map(text=>({text,marked:false})).filter(p=>norm(p.text)));
 else if(ext==='doc'||ext==='xls')throw Error('Tệp .doc/.xls đời cũ chưa hỗ trợ – hãy "Lưu thành" .docx hoặc .xlsx rồi tải lại');
 else throw Error('Chỉ nhận tệp Word (.docx), Excel (.xlsx), .csv hoặc .txt');
 if(!list.length)throw Error('Không tìm thấy câu hỏi nào. Xem hướng dẫn định dạng bên dưới nút tải tệp.');
 const res=finalize(list,meta);
 if(list.unused&&list.unused.length)res.warnings.push({n:'–',why:`cột ${list.unused.map(c=>'"'+c+'"').join(', ')} không thuộc mẫu nhập đề – dữ liệu trong cột này KHÔNG được nhập (các cột dùng được: Câu hỏi, A–F, Đáp án, Thời gian, Chặng, Dạng, Điểm, Ảnh, Ảnh A–F, Video/Âm thanh, Sai số, Đơn vị, Giải thích)`});
 // tệp ảnh được dùng thật sự (máy chủ lưu vào thư mục media rồi thay 'asset:…' bằng /media/…)
 const used=new Set();for(const q of res.questions){if(q.media&&/^asset:/.test(q.media.src))used.add(q.media.src);for(const a of q.ai||[])if(/^asset:/.test(a))used.add(a)}
 res.assets={};for(const k of used){const g=(meta.assets||{})[k];if(g)res.assets[k]=typeof g==='function'?g():g}return res;
}
module.exports={importQuestions,_internal:{fromParas,fromRows,parseAnswer,parseStage,difficulty}};
