'use strict';
/* UDIKA – CHẠY MẠNG NỘI BỘ (LAN) TẠI HỘI TRƯỜNG, KHÔNG CẦN INTERNET
   Dùng:  npm run lan            (hoặc: node lan.js)
   - Máy tính chạy lệnh này là máy chủ. Điện thoại sĩ tử, máy MC, máy chiếu LED cùng vào MỘT mạng Wi-Fi / bộ phát với máy này.
   - In ra địa chỉ LAN (vd http://192.168.1.10:3000) + mã QR ngay trên màn hình dòng lệnh; màn LED/MC mở bằng localhost vẫn in QR đúng địa chỉ LAN.
   - Mật khẩu Admin & khoá phiên: nếu chưa đặt biến môi trường, tự tạo MỘT lần và lưu ở data/lan-secrets.json (khởi động lại vẫn dùng lại,
     sĩ tử không bị đăng xuất). Dữ liệu thi lưu ở data/rooms.json (nhật ký bền như bản chạy mạng).
   Không cần Internet: mọi phông chữ, mã QR, âm thanh, phim vinh danh đều nằm trong máy. Chỉ câu hỏi dùng link YouTube/ảnh trên mạng mới cần Internet. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const QR=require('./public/qr.js');
const DATA_DIR=process.env.DATA_DIR||path.join(__dirname,'data');fs.mkdirSync(DATA_DIR,{recursive:true});
const SEC=path.join(DATA_DIR,'lan-secrets.json');let sec={};try{sec=JSON.parse(fs.readFileSync(SEC,'utf8'))}catch{}
let created=false;
if(!process.env.ADMIN_PASSWORD){if(!sec.adminPassword){sec.adminPassword='UDIKA-'+crypto.randomBytes(6).toString('base64url');created=true}process.env.ADMIN_PASSWORD=sec.adminPassword}
if(!process.env.SESSION_SECRET){if(!sec.sessionSecret){sec.sessionSecret=crypto.randomBytes(32).toString('hex');created=true}process.env.SESSION_SECRET=sec.sessionSecret}
if(created){fs.writeFileSync(SEC,JSON.stringify(sec,null,1),{mode:0o600})}
process.env.HOST=process.env.HOST||'0.0.0.0';process.env.PORT=process.env.PORT||'3000';process.env.LAN_MODE='1';
process.env.DATA_FILE=process.env.DATA_FILE||path.join(DATA_DIR,'rooms.json');
const PORT=Number(process.env.PORT);

function addrs(){const out=[];for(const [name,list] of Object.entries(os.networkInterfaces()))for(const a of list||[])if(a.family==='IPv4'&&!a.internal)out.push({name,ip:a.address,priv:/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)});
 return out.sort((a,b)=>(b.priv-a.priv))}
/* mã QR trên dòng lệnh: mỗi ký tự là 2 điểm ảnh theo chiều dọc (▀ ▄ █), viền trắng 2 ô */
function qrText(text){const m=QR.matrix(text),n=m.length,q=2,W=n+2*q;const at=(x,y)=>x>=q&&y>=q&&x<n+q&&y<n+q&&m[y-q][x-q];let s='';
 for(let y=0;y<W;y+=2){let line='';for(let x=0;x<W;x++){const t=at(x,y),b=at(x,y+1);line+=t&&b?' ':t?'▄':b?'▀':'█'}s+=line+'\n'}return s}
function banner(){const A=addrs();const url=A.length?`http://${A[0].ip}${PORT===80?'':':'+PORT}`:`http://localhost:${PORT}`;
 const L=[];L.push('','══════════════ UDIKA KHOA BẢNG – CHẠY MẠNG NỘI BỘ (LAN) ══════════════');
 if(!A.length)L.push('⚠ Máy này CHƯA nối mạng Wi-Fi/LAN nào – cắm bộ phát hoặc vào Wi-Fi rồi chạy lại. Hiện chỉ mở được trên chính máy này.');
 else{L.push('Điện thoại sĩ tử vào (cùng Wi-Fi với máy này):  '+url+'/join');if(A.length>1)L.push('Địa chỉ khác của máy: '+A.slice(1).map(a=>`http://${a.ip}:${PORT} (${a.name})`).join(' · '))}
 L.push('Admin tạo phòng:  '+url+'/admin      Màn MC: '+url+'/host      Màn LED: '+url+'/led');
 L.push('Mật khẩu Admin: '+(sec.adminPassword&&process.env.ADMIN_PASSWORD===sec.adminPassword?process.env.ADMIN_PASSWORD+'   (lưu ở '+path.relative(process.cwd(),SEC)+')':'(theo biến môi trường ADMIN_PASSWORD)'));
 L.push('Kiểm tra máy sĩ tử trước giờ thi: '+url+'/kiem-tra');
 L.push('','Quét mã để mở trang vào thi:','');console.log(L.join('\n'));if(A.length)console.log(qrText(url+'/join'));
 console.log(['Lưu ý hội trường:',' • Bộ phát Wi-Fi phải TẮT "cách ly máy khách" (AP/client isolation) – bật thì điện thoại không thấy máy chủ.',
  ' • Tường lửa của máy chủ phải cho phép cổng '+PORT+' (Windows sẽ hỏi lần đầu: chọn "Cho phép" cho mạng Riêng tư).',
  ' • Đặt máy chủ IP cố định (hoặc giữ chỗ DHCP trên bộ phát) để mã QR in sẵn không đổi.',
  ' • Không có Internet: câu hỏi dùng link YouTube/ảnh trên mạng sẽ không chạy – dùng ảnh/âm thanh/phim TẢI LÊN máy chủ.',
  ' • Một bộ phát gia đình thường chịu 30–60 máy; hội trường đông người cần bộ phát chuyên dụng / nhiều điểm phát cùng mạng.',
  '═════════════════════════════════════════════════════════════════════════',''].join('\n'))}
if(require.main===module){banner();require('./server.js')}
module.exports={addrs,qrText};
