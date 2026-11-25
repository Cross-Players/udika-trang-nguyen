'use strict';
/* Kiểm thử BÁN GÓI & THANH TOÁN (máy chủ thật + cổng thanh toán GIẢ LẬP đúng đặc tả công bố):
   bảng giá → khách đặt đơn → VietQR (đúng chuẩn EMVCo, CRC) → webhook ngân hàng (SePay & Casso) tự gia hạn; chống trùng, thiếu tiền;
   VNPAY: URL có chữ ký HMAC-SHA512, IPN sai chữ ký / sai tiền / đã xác nhận; MoMo: tạo giao dịch (máy chủ MoMo giả lập kiểm chữ ký) + IPN;
   Admin xác nhận tay; khách tự đăng ký; khách tự đổi mật khẩu. KHÔNG thay cho thử với tài khoản ngân hàng / cổng thật. */
const assert=require('node:assert/strict');const http=require('node:http');const crypto=require('node:crypto');const {spawn}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');const PAY=require('../pay.js');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const results=[],fails=[];const ok=s=>{console.log('PASS',s);results.push(s)};const KEEP=process.env.AUDIT_KEEP_GOING==='1';
async function step(n,fn){try{await fn()}catch(e){fails.push(n);console.log('FAIL',n,'–',String(e.message||e).split('\n')[0]);if(!KEEP)throw e}}
const port=18952,url='http://127.0.0.1:'+port,mport=18953,dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-pay-'));
const VNP={tmn:'UDIKATST',secret:'VNPAYSECRETTESTKEY0123456789ABCD'},MOMO={partner:'MOMOUDIKA',access:'acc-key-test',secret:'momo-secret-test'};
let momoSeen=null;const mock=http.createServer((req,res)=>{let d='';req.on('data',c=>d+=c);req.on('end',()=>{const b=JSON.parse(d||'{}');momoSeen=b;
 const raw=PAY.momoCreateRaw({accessKey:MOMO.access,amount:b.amount,extraData:b.extraData,ipnUrl:b.ipnUrl,orderId:b.orderId,orderInfo:b.orderInfo,partnerCode:b.partnerCode,redirectUrl:b.redirectUrl,requestId:b.requestId,requestType:b.requestType});
 const good=PAY.hmac256(raw,MOMO.secret)===b.signature;res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(good?{resultCode:0,payUrl:'https://test-payment.momo.vn/pay/'+b.orderId}:{resultCode:11007,message:'sai chữ ký'}))})});
let app;function start(extra={}){app=spawn(process.execPath,['server.js'],{cwd:ROOT,env:{...process.env,PORT:String(port),ADMIN_PASSWORD:'pay-admin-password-1',SESSION_SECRET:'pay-session-secret-long-enough',DATA_FILE:path.join(dir,'rooms.json'),DATABASE_URL:'',
 PAY_BANK_BIN:'970436',PAY_ACCOUNT_NO:'0011004455667',PAY_ACCOUNT_NAME:'CONG TY UDIKA',PAY_BANK_NAME:'Vietcombank',PAY_WEBHOOK_KEY:'webhook-key-xyz',VNPAY_TMN_CODE:VNP.tmn,VNPAY_HASH_SECRET:VNP.secret,
 MOMO_PARTNER_CODE:MOMO.partner,MOMO_ACCESS_KEY:MOMO.access,MOMO_SECRET_KEY:MOMO.secret,MOMO_ENDPOINT:`http://127.0.0.1:${mport}/v2/gateway/api/create`,PUBLIC_URL:'https://thi.udika.vn',SELF_SIGNUP:'1',TRIAL_DAYS:'3',...extra}});let out='';app.stdout.on('data',x=>out+=x);app.stderr.on('data',x=>out+=x);app.out=()=>out}
process.on('exit',()=>{try{app.kill('SIGKILL')}catch{}});
async function wait(){for(let i=0;i<100;i++){try{if((await fetch(url+'/health')).ok)return}catch{}await sleep(100)}throw Error('server')}
async function req(m,p,b,c,h={}){const r=await fetch(url+p,{method:m,redirect:'manual',headers:{'Content-Type':'application/json',...(c?{Cookie:c}:{}),...h},body:b?JSON.stringify(b):undefined});const t=await r.text();let d=null;try{d=JSON.parse(t)}catch{}return {status:r.status,data:d,text:t,loc:r.headers.get('location'),cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
const login=async b=>(await req('POST','/api/login',b)).cookie;
/* giải mã VietQR để đối chiếu */
function parseTLV(s){const o={};let i=0;while(i<s.length){const id=s.slice(i,i+2),n=+s.slice(i+2,i+4);o[id]=s.slice(i+4,i+4+n);i+=4+n}return o}
(async()=>{await new Promise(r=>mock.listen(mport,'127.0.0.1',r));start();try{await wait();const A=await login({role:'admin',password:'pay-admin-password-1'});
 let plan,K,T,order;
 await step('BANG_GIA',async()=>{assert.equal((await req('POST','/api/plans',{name:'x',price:1000,days:30})).status,403,'chưa đăng nhập không tạo gói');
  const r=await req('POST','/api/plans',{name:'Gói Sự kiện 1 tháng',price:2500000,days:30,maxRooms:3,maxPlayers:500,note:'Tối đa 3 phòng, 500 sĩ tử/phòng'},A);assert.equal(r.status,201,r.text);plan=r.data;
  assert.equal((await req('POST','/api/plans',{name:'Rẻ',price:500,days:30},A)).status,400,'giá < 1.000đ bị chặn');
  const pub=(await req('GET','/api/plans')).data.items;assert.ok(pub.some(p=>p.id===plan.id&&p.price===2500000));
  const cfg=(await req('GET','/api/pay/config')).data;assert.deepEqual(cfg.methods,{vietqr:true,vnpay:true,momo:true,manual:true});
  ok('Admin đặt bảng giá gói (giá, số ngày, số phòng, sĩ tử/phòng); trang khách thấy gói đang bán và các phương thức đã cấu hình');
 });
 await step('TU_DANG_KY',async()=>{const r=await req('POST','/api/signup',{name:'Công ty Bình Minh',login:'binhminh',password:'password-binhminh1',contact:'0909 123 456'});assert.equal(r.status,201,r.text);
  K=await login({role:'owner',login:'binhminh',password:'password-binhminh1'});const me=(await req('GET','/api/session',null,K)).data.user;T=me.tenant;
  assert.ok(T.expiresAt>Date.now()+2.9*86400e3&&T.expiresAt<Date.now()+3.1*86400e3,'dùng thử 3 ngày');assert.equal(T.maxRooms,1);
  assert.equal((await req('POST','/api/signup',{name:'Trùng',login:'BinhMinh',password:'password-binhminh2',contact:'a@b.vn'})).status,409);
  ok('Khách tự đăng ký (khi UDIKA bật SELF_SIGNUP): có ngay tài khoản dùng thử 3 ngày, 1 phòng; tên đăng nhập trùng bị chặn');
 });
 await step('DON_VIETQR',async()=>{const r=await req('POST','/api/orders',{plan:plan.id},K);assert.equal(r.status,201,r.text);order=r.data;assert.match(order.code,/^UD[A-Z2-9]{7}$/);assert.equal(order.amount,2500000);
  const q=order.pay.vietqr;assert.ok(q&&q.payload);const body=q.payload.slice(0,-4);assert.equal(PAY.crc16(body),q.payload.slice(-4),'CRC đúng');
  const T0=parseTLV(q.payload);assert.equal(T0['00'],'01');assert.equal(T0['53'],'704');assert.equal(T0['54'],'2500000');assert.equal(T0['58'],'VN');
  const m=parseTLV(T0['38']);assert.equal(m['00'],'A000000727');assert.equal(m['02'],'QRIBFTTA');const ben=parseTLV(m['01']);assert.equal(ben['00'],'970436');assert.equal(ben['01'],'0011004455667');
  assert.equal(parseTLV(T0['62'])['08'],order.code,'nội dung chuyển khoản = mã đơn');assert.ok(order.pay.vnpay&&order.pay.momo);
  ok(`Khách đặt gói → đơn ${order.code}; mã VietQR đúng chuẩn EMVCo/NAPAS (ngân hàng 970436, số TK, số tiền 2.500.000, nội dung = mã đơn, CRC hợp lệ)`);
 });
 await step('WEBHOOK_NGAN_HANG',async()=>{const H={Authorization:'Apikey webhook-key-xyz'};
  assert.equal((await req('POST','/api/pay/bank-webhook',{id:1,transferType:'in',transferAmount:2500000,content:order.code},null,{Authorization:'Apikey sai'})).status,401,'sai khoá bị chặn');
  let r=await req('POST','/api/pay/bank-webhook',{id:9001,gateway:'Vietcombank',transferType:'in',transferAmount:1000000,content:'IBFT '+order.code.toLowerCase()+' thanh toan'},null,H);assert.equal(r.status,200,r.text);assert.ok(r.data.results[0].partial,'thiếu tiền');
  let me=(await req('GET','/api/session',null,K)).data.user.tenant;assert.equal(me.maxRooms,1,'chưa đủ tiền → chưa kích hoạt');
  r=await req('POST','/api/pay/bank-webhook',{error:0,data:[{id:9002,tid:'FT2611',description:'CT DEN:'+order.code.slice(0,4)+' '+order.code.slice(4)+' gia han',amount:1500000,when:'2026-11-25 10:00:00'}]},null,{'secure-token':'webhook-key-xyz'});
  assert.ok(r.data.results[0].paid,'Casso: đủ tiền (cộng dồn) → kích hoạt: '+r.text);
  me=(await req('GET','/api/session',null,K)).data.user.tenant;assert.equal(me.maxRooms,3);assert.equal(me.maxPlayers,500);assert.ok(me.expiresAt>Date.now()+32.9*86400e3,'gia hạn cộng nối tiếp sau thời gian dùng thử');
  r=await req('POST','/api/pay/bank-webhook',{error:0,data:[{id:9002,tid:'FT2611',description:order.code,amount:1500000}]},null,{'secure-token':'webhook-key-xyz'});assert.ok(r.data.results[0].dup,'gửi lại cùng giao dịch → bỏ qua');
  const ex=me.expiresAt;me=(await req('GET','/api/session',null,K)).data.user.tenant;assert.equal(me.expiresAt,ex,'không gia hạn 2 lần');
  r=await req('POST','/api/pay/bank-webhook',{id:9003,transferType:'in',transferAmount:777000,content:'chuyen tien khong ma'},null,H);assert.ok(r.data.results[0].unmatched,'tiền không mã đơn được ghi lại để đối soát');
  const ad=(await req('GET','/api/orders',null,A)).data;assert.ok(ad.payments.some(p=>p.txn==='9003'&&p.code===null),'Admin thấy khoản chưa khớp');
  ok('Webhook ngân hàng (SePay & Casso): sai khoá bị chặn; chuyển THIẾU → chưa kích hoạt; chuyển bù cộng dồn đủ → TỰ gia hạn 30 ngày nối tiếp & nâng gói; gửi lại cùng giao dịch không gia hạn 2 lần; tiền không ghi mã đơn được lưu để Admin đối soát');
 });
 await step('VNPAY',async()=>{const o=(await req('POST','/api/orders',{plan:plan.id},K)).data;const r=await req('GET','/api/pay/vnpay/'+o.code,null,K);assert.equal(r.status,302);
  const u=new URL(r.loc);assert.equal(u.origin+u.pathname,'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');const q=Object.fromEntries(u.searchParams);
  assert.equal(q.vnp_Amount,String(2500000*100));assert.equal(q.vnp_TxnRef,o.code);assert.equal(q.vnp_ReturnUrl,'https://thi.udika.vn/api/pay/vnpay/return');
  const signed=u.search.slice(1).replace(/&vnp_SecureHash=[0-9a-f]+$/,'');assert.equal(crypto.createHmac('sha512',VNP.secret).update(signed).digest('hex'),q.vnp_SecureHash,'chữ ký HMAC-SHA512 trên chuỗi đã sắp xếp');
  const ipn=extra=>{const p={vnp_TmnCode:VNP.tmn,vnp_Amount:String(2500000*100),vnp_BankCode:'NCB',vnp_TransactionNo:'14000001',vnp_ResponseCode:'00',vnp_TransactionStatus:'00',vnp_TxnRef:o.code,vnp_OrderInfo:'Thanh toan don '+o.code,vnp_PayDate:'20261125101500',...extra};
   p.vnp_SecureHash=PAY.vnpSign(p,VNP.secret);return '/api/pay/vnpay/ipn?'+new URLSearchParams(p).toString()};
  let x=await req('GET',ipn({}).replace(/vnp_SecureHash=[0-9a-f]+/,'vnp_SecureHash='+'0'.repeat(128)));assert.equal(x.data.RspCode,'97','sai chữ ký');
  x=await req('GET',ipn({vnp_Amount:'100'}));assert.equal(x.data.RspCode,'04','sai số tiền');
  const before=(await req('GET','/api/session',null,K)).data.user.tenant.expiresAt;
  x=await req('GET',ipn({}));assert.equal(x.data.RspCode,'00');const after=(await req('GET','/api/session',null,K)).data.user.tenant.expiresAt;assert.ok(after-before>29.9*86400e3,'gia hạn thêm 30 ngày');
  x=await req('GET',ipn({}));assert.equal(x.data.RspCode,'02','đã xác nhận');assert.equal((await req('GET','/api/session',null,K)).data.user.tenant.expiresAt,after);
  const ret=await req('GET','/api/pay/vnpay/return?'+ipn({}).split('?')[1]);assert.equal(ret.status,302);assert.match(ret.loc,/thanhtoan=ok/);
  ok('VNPAY: chuyển hướng tới cổng với chữ ký HMAC-SHA512 đúng; IPN sai chữ ký (97), sai tiền (04) bị từ chối; IPN đúng → gia hạn 30 ngày; IPN lặp → 02, không gia hạn lần 2');
 });
 await step('MOMO',async()=>{const o=(await req('POST','/api/orders',{plan:plan.id},K)).data;const r=await req('GET','/api/pay/momo/'+o.code,null,K);assert.equal(r.status,302,r.text);assert.match(r.loc,/test-payment\.momo\.vn\/pay\//);
  assert.equal(momoSeen.amount,2500000);assert.equal(momoSeen.ipnUrl,'https://thi.udika.vn/api/pay/momo/ipn');
  const b={partnerCode:MOMO.partner,orderId:momoSeen.orderId,requestId:momoSeen.requestId,amount:2500000,orderInfo:momoSeen.orderInfo,orderType:'momo_wallet',transId:4100000001,resultCode:0,message:'Thành công.',payType:'qr',responseTime:Date.now(),extraData:''};
  const bad={...b,signature:'00'};assert.equal((await req('POST','/api/pay/momo/ipn',bad)).status,400,'IPN sai chữ ký');
  b.signature=PAY.hmac256(PAY.momoIpnRaw(b,MOMO.access),MOMO.secret);const before=(await req('GET','/api/session',null,K)).data.user.tenant.expiresAt;
  assert.equal((await req('POST','/api/pay/momo/ipn',b)).status,204);assert.ok((await req('GET','/api/session',null,K)).data.user.tenant.expiresAt-before>29.9*86400e3);
  assert.equal((await req('POST','/api/pay/momo/ipn',b)).status,204);assert.equal((await req('GET','/api/orders/'+o.code,null,K)).data.status,'paid');
  ok('MoMo: máy chủ gửi yêu cầu tạo giao dịch có chữ ký HMAC-SHA256 đúng (máy chủ MoMo giả lập kiểm tra) → chuyển tới payUrl; IPN sai chữ ký bị từ chối; IPN đúng → gia hạn; IPN lặp không gia hạn lần 2');
 });
 await step('DUYET_TAY',async()=>{const o=(await req('POST','/api/orders',{plan:plan.id},K)).data;assert.equal((await req('POST',`/api/orders/${o.code}/confirm`,{},K)).status,403,'khách không tự xác nhận');
  const r=await req('POST',`/api/orders/${o.code}/confirm`,{amount:2500000,note:'KH chuyển sai nội dung'},A);assert.equal(r.status,200,r.text);assert.equal(r.data.status,'paid');
  const o2=(await req('POST','/api/orders',{plan:plan.id},K)).data;assert.equal((await req('POST',`/api/orders/${o2.code}/cancel`,{},K)).data.status,'cancelled');
  const r2=await req('POST','/api/pay/bank-webhook',{id:9100,transferType:'in',transferAmount:2500000,content:o2.code},null,{Authorization:'Apikey webhook-key-xyz'});assert.ok(r2.data.results[0].unmatched,'đơn đã huỷ không tự kích hoạt');
  ok('Admin xác nhận tay đơn khách chuyển sai nội dung (khách không tự xác nhận được); đơn đã huỷ mà vẫn nhận tiền → không tự kích hoạt, ghi lại để Admin xử lý');
 });
 await step('DOI_MAT_KHAU',async()=>{assert.equal((await req('POST','/api/khach/password',{oldPassword:'sai-mat-khau-0',newPassword:'password-moi-binhminh'},K)).status,400);
  const r=await req('POST','/api/khach/password',{oldPassword:'password-binhminh1',newPassword:'password-moi-binhminh'},K);assert.equal(r.status,200);const K2=r.cookie;
  assert.equal((await req('GET','/api/rooms',null,K)).status,403,'phiên cũ mất hiệu lực');assert.equal((await req('GET','/api/rooms',null,K2)).status,200,'phiên hiện tại được cấp lại');
  assert.ok(await login({role:'owner',login:'binhminh',password:'password-moi-binhminh'}));assert.equal(await login({role:'owner',login:'binhminh',password:'password-binhminh1'}),'');
  ok('Khách tự đổi mật khẩu: phải đúng mật khẩu cũ; mọi phiên cũ mất hiệu lực, phiên đang dùng được cấp lại; mật khẩu cũ không đăng nhập được nữa');
 });
 await step('KHOI_DONG_LAI',async()=>{app.kill('SIGKILL');await new Promise(r=>app.once('exit',r));start();await wait();const A2=await login({role:'admin',password:'pay-admin-password-1'});
  const d=(await req('GET','/api/orders',null,A2)).data;assert.ok(d.items.filter(o=>o.status==='paid').length>=4,'đơn đã thanh toán còn sau kill -9');assert.ok(d.payments.length>=4);
  const r=await req('POST','/api/pay/bank-webhook',{id:9002,transferType:'in',transferAmount:2500000,content:order.code},null,{Authorization:'Apikey webhook-key-xyz'});assert.ok(r.data.results[0].dup,'sau khởi động lại vẫn nhận ra giao dịch đã xử lý');
  ok('kill -9 rồi khởi động lại: đơn hàng, lịch sử thanh toán còn nguyên; giao dịch cũ gửi lại vẫn bị nhận ra là trùng');
 });
 console.log(`\nTỔNG: ${results.length} ca đạt, ${fails.length} ca thất bại${fails.length?' ('+fails.join(', ')+')':''}`);process.exitCode=fails.length?1:0;
}catch(e){console.log('FAIL',e.stack||e);console.log(app.out().slice(-1500));process.exitCode=1}finally{mock.close();app.kill('SIGKILL')}})();
