'use strict';
/* ===== UDIKA – BÁN GÓI CHO KHÁCH TỰ VẬN HÀNH: bảng giá, đơn hàng, thanh toán =====
   • Admin UDIKA đặt bảng giá gói (giá, số ngày, số phòng cùng lúc, số sĩ tử/phòng).
   • Khách đặt mua / gia hạn → đơn hàng có MÃ (vd. UDK7X9QA2) → trả bằng:
       1) Chuyển khoản VietQR vào tài khoản ngân hàng của UDIKA; dịch vụ báo biến động số dư (SePay / Casso) gọi webhook
          → khớp mã đơn + đủ tiền → TỰ GIA HẠN gói.
       2) Cổng VNPAY (chuyển hướng, chữ ký HMAC-SHA512; IPN xác nhận).
       3) Ví MoMo (tạo giao dịch qua API, chữ ký HMAC-SHA256; IPN xác nhận).
       4) Admin xác nhận tay (khi khách chuyển khoản không đúng nội dung…).
   • Mỗi giao dịch chỉ được tính MỘT lần (chống trùng theo mã giao dịch của ngân hàng/cổng); số tiền phải đủ; mọi bước ghi nhật ký.
   • Khoá/thông tin cổng lấy từ biến môi trường – KHÔNG nằm trong mã nguồn. Phương thức nào chưa cấu hình thì không hiện cho khách.
   Lưu ý trung thực: chưa thử với tài khoản ngân hàng / cổng VNPAY / MoMo thật (cần hợp đồng & khoá của UDIKA) – đã thử bằng
   chữ ký và máy chủ giả lập đúng đặc tả công bố của từng bên (test/test-thanh-toan.js). */
const crypto=require('node:crypto');
const CODE_CH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ORDER_TTL=Number(process.env.PAY_ORDER_TTL_HOURS||48)*3600e3;
function cfg(){const e=process.env;return {
 bank:e.PAY_BANK_BIN&&e.PAY_ACCOUNT_NO?{bin:String(e.PAY_BANK_BIN).trim(),acc:String(e.PAY_ACCOUNT_NO).trim(),name:String(e.PAY_ACCOUNT_NAME||'').trim(),bankName:String(e.PAY_BANK_NAME||'').trim()}:null,
 webhookKey:e.PAY_WEBHOOK_KEY||'',
 vnpay:e.VNPAY_TMN_CODE&&e.VNPAY_HASH_SECRET?{tmn:e.VNPAY_TMN_CODE,secret:e.VNPAY_HASH_SECRET,url:e.VNPAY_URL||'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'}:null,
 momo:e.MOMO_PARTNER_CODE&&e.MOMO_ACCESS_KEY&&e.MOMO_SECRET_KEY?{partner:e.MOMO_PARTNER_CODE,access:e.MOMO_ACCESS_KEY,secret:e.MOMO_SECRET_KEY,endpoint:e.MOMO_ENDPOINT||'https://test-payment.momo.vn/v2/gateway/api/create'}:null,
 publicUrl:(e.PUBLIC_URL||'').replace(/\/+$/,''),selfSignup:e.SELF_SIGNUP==='1',trialDays:Math.max(0,Number(e.TRIAL_DAYS||0))}}
/* ---------- VietQR (chuẩn EMVCo / NAPAS 247) ---------- */
const tlv=(id,v)=>id+String(v.length).padStart(2,'0')+v;
function crc16(s){let c=0xFFFF;for(const b of Buffer.from(s,'utf8')){c^=b<<8;for(let i=0;i<8;i++)c=(c&0x8000)?((c<<1)^0x1021)&0xFFFF:(c<<1)&0xFFFF}return c.toString(16).toUpperCase().padStart(4,'0')}
function vietqr(bin,acc,amount,content){const ascii=String(content).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').replace(/[^\x20-\x7e]/g,'').slice(0,25);
 const p=tlv('00','01')+tlv('01','12')+tlv('38',tlv('00','A000000727')+tlv('01',tlv('00',bin)+tlv('01',acc))+tlv('02','QRIBFTTA'))+tlv('53','704')+(amount?tlv('54',String(Math.round(amount))):'')+tlv('58','VN')+tlv('62',tlv('08',ascii))+'6304';
 return p+crc16(p)}
/* ---------- VNPAY 2.1.0 ---------- */
function vnpSortEncode(o){return Object.keys(o).filter(k=>o[k]!==undefined&&o[k]!==''&&k!=='vnp_SecureHash'&&k!=='vnp_SecureHashType').sort().map(k=>encodeURIComponent(k)+'='+encodeURIComponent(String(o[k])).replace(/%20/g,'+')).join('&')}
const vnpSign=(o,secret)=>crypto.createHmac('sha512',secret).update(Buffer.from(vnpSortEncode(o),'utf8')).digest('hex');
function vnTime(t){const d=new Date(t+7*3600e3);const p=n=>String(n).padStart(2,'0');return `${d.getUTCFullYear()}${p(d.getUTCMonth()+1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`}
/* ---------- MoMo v2 ---------- */
const hmac256=(s,k)=>crypto.createHmac('sha256',k).update(s).digest('hex');
const momoCreateRaw=o=>`accessKey=${o.accessKey}&amount=${o.amount}&extraData=${o.extraData}&ipnUrl=${o.ipnUrl}&orderId=${o.orderId}&orderInfo=${o.orderInfo}&partnerCode=${o.partnerCode}&redirectUrl=${o.redirectUrl}&requestId=${o.requestId}&requestType=${o.requestType}`;
const momoIpnRaw=(o,accessKey)=>`accessKey=${accessKey}&amount=${o.amount}&extraData=${o.extraData??''}&message=${o.message??''}&orderId=${o.orderId}&orderInfo=${o.orderInfo??''}&orderType=${o.orderType??''}&partnerCode=${o.partnerCode}&payType=${o.payType??''}&requestId=${o.requestId}&responseTime=${o.responseTime}&resultCode=${o.resultCode}&transId=${o.transId}`;
const safeEq=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)};

module.exports=function makePay(C){ // C: các hàm & dữ liệu của máy chủ
 const {PLANS,ORDERS,PAYLOG,TENANTS,sendJson,jsonBody,persistNow,audit,token,clean,loginOf,passwordRecord,tenantPublic}=C;
 const newCode=()=>{for(;;){const b=crypto.randomBytes(7);let c='UD';for(const x of b)c+=CODE_CH[x%CODE_CH.length];if(!ORDERS.some(o=>o.code===c))return c}};
 const findCode=text=>{const T=String(text||'').toUpperCase();for(const s of [T,T.replace(/[^A-Z0-9]/g,'')]){const m=s.match(/UD[A-HJ-NP-Z2-9]{7}/g);if(m)for(const c of m){const o=ORDERS.find(x=>x.code===c);if(o)return o}}return null};
 const planPublic=p=>({id:p.id,name:p.name,price:p.price,days:p.days,maxRooms:p.maxRooms,maxPlayers:p.maxPlayers,note:p.note||'',active:p.active!==false});
 const orderPublic=o=>({code:o.code,tenant:o.tenant,tenantName:TENANTS.get(o.tenant)?.name||'',plan:o.plan,amount:o.amount,status:o.status,createdAt:o.createdAt,expiresAt:o.expiresAt,paidAt:o.paidAt||0,method:o.method||'',paidAmount:o.paidAmount||0,note:o.note||''});
 function expireOld(){const t=Date.now();for(const o of ORDERS)if(o.status==='pending'&&o.expiresAt<t)o.status='expired'}
 /* ghi nhận tiền vào: CHỈ MỘT LẦN cho mỗi mã giao dịch; đủ tiền mới kích hoạt gói */
 async function credit(o,{method,txn,amount,raw}){const key=method+':'+txn;
  if(PAYLOG.some(p=>p.key===key))return {dup:true,order:o};
  PAYLOG.unshift({key,code:o?o.code:null,method,txn:String(txn),amount,at:Date.now(),raw:raw?JSON.stringify(raw).slice(0,1500):''});if(PAYLOG.length>5000)PAYLOG.length=5000;
  if(!o){await persistNow();return {unmatched:true}}
  o.paidAmount=(o.paidAmount||0)+amount;
  if(o.status==='paid'){o.note=(o.note?o.note+' | ':'')+`tiền thừa ${amount}đ qua ${method} (${txn}) – cần hoàn/ghi có thủ công`;await persistNow();return {already:true,order:o}}
  if(o.paidAmount+0.5<o.amount){o.note=`đã nhận ${o.paidAmount}đ / ${o.amount}đ – THIẾU, chưa kích hoạt`;await persistNow();return {partial:true,order:o}}
  activate(o,method,txn);await persistNow();return {paid:true,order:o}}
 function activate(o,method,txn){const t=TENANTS.get(o.tenant);o.status='paid';o.paidAt=Date.now();o.method=method;o.txn=String(txn||'');
  if(!t)return;const base=Math.max(Date.now(),t.expiresAt||0);t.expiresAt=base+o.plan.days*86400e3;t.maxRooms=o.plan.maxRooms;t.maxPlayers=o.plan.maxPlayers;t.plan=o.plan.name;
  t.payHistory=(t.payHistory||[]).concat({code:o.code,amount:o.amount,at:o.paidAt,method,plan:o.plan.name}).slice(-100);audit('thanh-toan:'+method,'order_paid',o.code)}
 const base=req=>{const c=cfg();if(c.publicUrl)return c.publicUrl;const proto=req.headers['x-forwarded-proto']||(req.socket.encrypted?'https':'http');return proto+'://'+req.headers.host};
 async function api(req,res,u,L){const P=u.pathname,c=cfg();
  /* ---- cấu hình công khai (trang khách biết phương thức nào đang mở) ---- */
  if(P==='/api/pay/config'&&req.method==='GET')return sendJson(res,200,{methods:{vietqr:!!c.bank,vnpay:!!c.vnpay,momo:!!c.momo,manual:true},bank:c.bank?{bankName:c.bank.bankName,acc:c.bank.acc,name:c.bank.name}:null,selfSignup:c.selfSignup,trialDays:c.trialDays}),true;
  /* ---- bảng giá ---- */
  if(P==='/api/plans'&&req.method==='GET'){const all=L&&L.role==='admin';return sendJson(res,200,{items:PLANS.filter(p=>all||p.active!==false).map(planPublic)}),true}
  if(P==='/api/plans'&&req.method==='POST'){if(!L||L.role!=='admin')return sendJson(res,403,{error:'Chỉ Admin UDIKA'}),true;const b=await jsonBody(req);
   const p={id:'g'+token().slice(0,8),name:clean(b.name,60),price:Math.round(Number(b.price)),days:Math.round(Number(b.days)),maxRooms:Math.max(1,Math.round(Number(b.maxRooms)||1)),maxPlayers:Math.max(10,Math.round(Number(b.maxPlayers)||100)),note:clean(b.note,160),active:true,createdAt:Date.now()};
   if(!p.name||!(p.price>=1000)||!(p.days>=1&&p.days<=3660))return sendJson(res,400,{error:'Cần tên gói, giá ≥ 1.000đ và số ngày 1–3660'}),true;
   PLANS.push(p);if(!(await persistNow())){PLANS.pop();return sendJson(res,503,{error:'Máy chủ CHƯA lưu được'}),true}audit(L.user,'plan_created',p.id);return sendJson(res,201,planPublic(p)),true}
  const plM=P.match(/^\/api\/plans\/([\w-]{3,20})$/);
  if(plM&&req.method==='PATCH'){if(!L||L.role!=='admin')return sendJson(res,403,{error:'Chỉ Admin UDIKA'}),true;const p=PLANS.find(x=>x.id===plM[1]);if(!p)return sendJson(res,404,{error:'Không thấy gói'}),true;const b=await jsonBody(req);
   if(b.name)p.name=clean(b.name,60)||p.name;if('price' in b&&Number(b.price)>=1000)p.price=Math.round(Number(b.price));if('days' in b&&Number(b.days)>=1)p.days=Math.round(Number(b.days));if('maxRooms' in b)p.maxRooms=Math.max(1,Math.round(Number(b.maxRooms)||1));if('maxPlayers' in b)p.maxPlayers=Math.max(10,Math.round(Number(b.maxPlayers)||100));if('active' in b)p.active=!!b.active;if('note' in b)p.note=clean(b.note,160);
   if(!(await persistNow()))return sendJson(res,503,{error:'Máy chủ CHƯA lưu được'}),true;return sendJson(res,200,planPublic(p)),true}
  /* ---- khách tự đăng ký (chỉ khi UDIKA bật SELF_SIGNUP=1) ---- */
  if(P==='/api/signup'&&req.method==='POST'){if(!c.selfSignup)return sendJson(res,403,{error:'Chưa mở đăng ký trực tuyến – liên hệ UDIKA'}),true;if(C.signupLimited(req))return sendJson(res,429,{error:'Bạn đăng ký quá nhiều lần – thử lại sau'}),true;
   const b=await jsonBody(req);const name=clean(b.name,80),login=loginOf(b.login),pw=String(b.password||''),contact=clean(b.contact,120);
   if(!name||!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(login)||pw.length<10||!contact)return sendJson(res,400,{error:'Cần tên đơn vị, tên đăng nhập (3–40 ký tự a-z 0-9 . _ -), mật khẩu ≥ 10 ký tự và số điện thoại / email liên hệ'}),true;
   if([...TENANTS.values()].some(t=>t.login===login))return sendJson(res,409,{error:'Tên đăng nhập này đã có người dùng'}),true;
   const t={id:'k'+token().slice(0,11),name,login,password:passwordRecord(pw),ver:token().slice(0,12),maxRooms:1,maxPlayers:50,expiresAt:Date.now()+c.trialDays*86400e3,locked:false,createdAt:Date.now(),note:'Tự đăng ký · '+contact,selfSignup:true,contact};
   TENANTS.set(t.id,t);if(!(await persistNow())){TENANTS.delete(t.id);return sendJson(res,503,{error:'Máy chủ CHƯA lưu được – thử lại'}),true}audit(login,'self_signup',t.id);C.afterTenantChange&&C.afterTenantChange();
   return sendJson(res,201,{ok:true,trialDays:c.trialDays}),true}
  /* ---- đơn hàng ---- */
  if(P==='/api/orders'&&req.method==='GET'){if(!L||!(L.role==='admin'||L.role==='owner'))return sendJson(res,403,{error:'Cần đăng nhập'}),true;expireOld();
   return sendJson(res,200,{items:ORDERS.filter(o=>L.role==='admin'||o.tenant===L.tenant).slice(0,500).map(orderPublic),payments:L.role==='admin'?PAYLOG.slice(0,200).map(({raw,...x})=>x):undefined}),true}
  if(P==='/api/orders'&&req.method==='POST'){if(!L||!(L.role==='owner'||L.role==='admin'))return sendJson(res,403,{error:'Đăng nhập tài khoản khách để đặt mua'}),true;const b=await jsonBody(req);
   const tid=L.role==='owner'?L.tenant:String(b.tenant||'');const t=TENANTS.get(tid);if(!t)return sendJson(res,404,{error:'Không thấy tài khoản khách'}),true;
   const p=PLANS.find(x=>x.id===String(b.plan||'')&&x.active!==false);if(!p)return sendJson(res,404,{error:'Gói không tồn tại hoặc đã ngừng bán'}),true;expireOld();
   if(ORDERS.filter(o=>o.tenant===tid&&o.status==='pending').length>=5)return sendJson(res,429,{error:'Bạn đang có 5 đơn chưa thanh toán – huỷ bớt hoặc thanh toán đơn cũ'}),true;
   const o={code:newCode(),tenant:tid,plan:planPublic(p),amount:p.price,status:'pending',createdAt:Date.now(),expiresAt:Date.now()+ORDER_TTL,by:L.user};ORDERS.unshift(o);if(ORDERS.length>20000)ORDERS.length=20000;
   if(!(await persistNow())){ORDERS.shift();return sendJson(res,503,{error:'Máy chủ CHƯA lưu được đơn – thử lại'}),true}audit(L.user,'order_created',o.code);return sendJson(res,201,orderInfo(o,req)),true}
  const odM=P.match(/^\/api\/orders\/(UD[A-Z0-9]{7})(\/(cancel|confirm))?$/);
  if(odM){const o=ORDERS.find(x=>x.code===odM[1]);if(!L||!o||!(L.role==='admin'||(L.role==='owner'&&o.tenant===L.tenant)))return sendJson(res,404,{error:'Không thấy đơn hàng'}),true;expireOld();
   if(!odM[2]&&req.method==='GET')return sendJson(res,200,orderInfo(o,req)),true;
   if(odM[3]==='cancel'&&req.method==='POST'){if(o.status!=='pending')return sendJson(res,409,{error:'Chỉ huỷ được đơn đang chờ thanh toán'}),true;o.status='cancelled';await persistNow();return sendJson(res,200,orderPublic(o)),true}
   if(odM[3]==='confirm'&&req.method==='POST'){if(L.role!=='admin')return sendJson(res,403,{error:'Chỉ Admin UDIKA xác nhận đã nhận tiền'}),true;const b=await jsonBody(req);
    if(o.status==='paid')return sendJson(res,409,{error:'Đơn đã thanh toán'}),true;if(o.status==='cancelled')return sendJson(res,409,{error:'Đơn đã huỷ'}),true;
    const r=await credit(o,{method:'thu-cong',txn:'admin-'+o.code+'-'+Date.now(),amount:Math.round(Number(b.amount)||o.amount),raw:{by:L.user,note:clean(b.note,200)}});
    C.afterTenantChange&&C.afterTenantChange();return sendJson(res,200,{...orderPublic(o),result:Object.keys(r)[0]}),true}}
  /* ---- webhook ngân hàng (SePay / Casso / định dạng chung) ---- */
  if(P==='/api/pay/bank-webhook'&&req.method==='POST'){const key=c.webhookKey;if(!key)return sendJson(res,503,{error:'Chưa cấu hình PAY_WEBHOOK_KEY'}),true;
   const auth=String(req.headers.authorization||'').replace(/^(Apikey|Bearer)\s+/i,''),st=String(req.headers['secure-token']||req.headers['x-webhook-key']||'');
   if(!(safeEq(auth,key)||safeEq(st,key)))return sendJson(res,401,{error:'Sai khoá webhook'}),true;
   const b=await jsonBody(req);const arr=Array.isArray(b.data)?b.data:(b.data&&typeof b.data==='object'?[b.data]:null);const list=arr?arr.map(x=>({id:x.id??x.tid??x.reference,amount:Number(x.amount),content:x.description??x.content,dir:Number(x.amount)>0?'in':'out'}))
    :[{id:b.id??b.referenceCode,amount:Number(b.transferAmount??b.amount),content:b.content??b.description,dir:b.transferType||'in'}];
   const out=[];for(const x of list){if(x.dir!=='in'||!(x.amount>0)||x.id==null){out.push({id:x.id,skip:true});continue}
    const o=findCode(x.content);const r=await credit(o&&o.status!=='cancelled'?o:null,{method:'chuyen-khoan',txn:x.id,amount:Math.round(x.amount),raw:x});out.push({id:x.id,code:o?o.code:null,...r,order:undefined})}
   C.afterTenantChange&&C.afterTenantChange();return sendJson(res,200,{success:true,results:out}),true}
  /* ---- VNPAY ---- */
  const vnM=P.match(/^\/api\/pay\/vnpay\/(UD[A-Z0-9]{7})$/);
  if(vnM&&req.method==='GET'){if(!c.vnpay)return sendJson(res,503,{error:'Chưa cấu hình VNPAY'}),true;const o=ORDERS.find(x=>x.code===vnM[1]);
   if(!L||!o||!(L.role==='admin'||o.tenant===L.tenant))return sendJson(res,404,{error:'Không thấy đơn hàng'}),true;if(o.status!=='pending')return sendJson(res,409,{error:'Đơn không còn chờ thanh toán'}),true;
   const t=Date.now(),q={vnp_Version:'2.1.0',vnp_Command:'pay',vnp_TmnCode:c.vnpay.tmn,vnp_Amount:String(o.amount*100),vnp_CurrCode:'VND',vnp_TxnRef:o.code,vnp_OrderInfo:'Thanh toan don '+o.code,vnp_OrderType:'other',vnp_Locale:'vn',
    vnp_ReturnUrl:base(req)+'/api/pay/vnpay/return',vnp_IpAddr:C.clientIp(req)||'127.0.0.1',vnp_CreateDate:vnTime(t),vnp_ExpireDate:vnTime(Math.min(o.expiresAt,t+15*60e3))};
   const url=c.vnpay.url+'?'+vnpSortEncode(q)+'&vnp_SecureHash='+vnpSign(q,c.vnpay.secret);res.writeHead(302,{Location:url,'Cache-Control':'no-store'});res.end();return true}
  if(P==='/api/pay/vnpay/ipn'&&req.method==='GET'){if(!c.vnpay)return sendJson(res,200,{RspCode:'99',Message:'Not configured'}),true;const q=Object.fromEntries(u.searchParams);
   if(!q.vnp_SecureHash||!safeEq(String(q.vnp_SecureHash).toLowerCase(),vnpSign(q,c.vnpay.secret)))return sendJson(res,200,{RspCode:'97',Message:'Invalid signature'}),true;
   const o=ORDERS.find(x=>x.code===q.vnp_TxnRef);if(!o)return sendJson(res,200,{RspCode:'01',Message:'Order not found'}),true;
   if(Number(q.vnp_Amount)!==o.amount*100)return sendJson(res,200,{RspCode:'04',Message:'Invalid amount'}),true;
   if(o.status==='paid')return sendJson(res,200,{RspCode:'02',Message:'Order already confirmed'}),true;
   if(q.vnp_ResponseCode==='00'&&q.vnp_TransactionStatus==='00'){await credit(o,{method:'vnpay',txn:q.vnp_TransactionNo||q.vnp_TxnRef,amount:o.amount,raw:q});C.afterTenantChange&&C.afterTenantChange()}
   else{o.note='VNPAY báo không thành công (mã '+q.vnp_ResponseCode+')';await persistNow()}
   return sendJson(res,200,{RspCode:'00',Message:'Confirm Success'}),true}
  if(P==='/api/pay/vnpay/return'&&req.method==='GET'){const q=Object.fromEntries(u.searchParams);const ok=c.vnpay&&q.vnp_SecureHash&&safeEq(String(q.vnp_SecureHash).toLowerCase(),vnpSign(q,c.vnpay.secret));
   res.writeHead(302,{Location:'/khach?thanhtoan='+(ok&&q.vnp_ResponseCode==='00'?'ok':'loi')+'&don='+encodeURIComponent(q.vnp_TxnRef||''),'Cache-Control':'no-store'});res.end();return true}
  /* ---- MoMo ---- */
  const moM=P.match(/^\/api\/pay\/momo\/(UD[A-Z0-9]{7})$/);
  if(moM&&req.method==='GET'){if(!c.momo)return sendJson(res,503,{error:'Chưa cấu hình MoMo'}),true;const o=ORDERS.find(x=>x.code===moM[1]);
   if(!L||!o||!(L.role==='admin'||o.tenant===L.tenant))return sendJson(res,404,{error:'Không thấy đơn hàng'}),true;if(o.status!=='pending')return sendJson(res,409,{error:'Đơn không còn chờ thanh toán'}),true;
   const reqId=o.code+'-'+Date.now(),B=base(req),body={partnerCode:c.momo.partner,accessKey:c.momo.access,requestId:reqId,amount:String(o.amount),orderId:reqId,orderInfo:'Thanh toan don '+o.code,redirectUrl:B+'/khach?thanhtoan=momo&don='+o.code,ipnUrl:B+'/api/pay/momo/ipn',extraData:'',requestType:'captureWallet'};
   const signature=hmac256(momoCreateRaw(body),c.momo.secret);let r;
   try{const resp=await fetch(c.momo.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({partnerCode:body.partnerCode,requestId:reqId,amount:o.amount,orderId:reqId,orderInfo:body.orderInfo,redirectUrl:body.redirectUrl,ipnUrl:body.ipnUrl,lang:'vi',requestType:body.requestType,autoCapture:true,extraData:'',signature}),signal:AbortSignal.timeout(15000)});r=await resp.json()}
   catch(e){return sendJson(res,502,{error:'Không kết nối được MoMo: '+String(e.message||e)}),true}
   if(r.resultCode!==0||!r.payUrl)return sendJson(res,502,{error:'MoMo từ chối tạo giao dịch: '+(r.message||r.resultCode)}),true;
   res.writeHead(302,{Location:r.payUrl,'Cache-Control':'no-store'});res.end();return true}
  if(P==='/api/pay/momo/ipn'&&req.method==='POST'){if(!c.momo){res.writeHead(204);res.end();return true}const b=await jsonBody(req);
   if(!b.signature||!safeEq(String(b.signature),hmac256(momoIpnRaw(b,c.momo.access),c.momo.secret))){sendJson(res,400,{error:'Sai chữ ký'});return true}
   const code=String(b.orderId||'').split('-')[0];const o=ORDERS.find(x=>x.code===code);
   if(o&&Number(b.resultCode)===0){if(Number(b.amount)===o.amount)await credit(o,{method:'momo',txn:b.transId,amount:o.amount,raw:b});else{o.note='MoMo báo số tiền khác đơn ('+b.amount+')';await persistNow()}C.afterTenantChange&&C.afterTenantChange()}
   res.writeHead(204);res.end();return true}
  return false}
 function orderInfo(o,req){const c=cfg();return {...orderPublic(o),pay:{vietqr:c.bank&&o.status==='pending'?{payload:vietqr(c.bank.bin,c.bank.acc,o.amount,o.code),bankName:c.bank.bankName,acc:c.bank.acc,name:c.bank.name,content:o.code,amount:o.amount}:null,
  vnpay:!!c.vnpay&&o.status==='pending'?'/api/pay/vnpay/'+o.code:null,momo:!!c.momo&&o.status==='pending'?'/api/pay/momo/'+o.code:null}}}
 return {api,credit,vietqr,crc16,vnpSign,vnpSortEncode,momoIpnRaw,momoCreateRaw,hmac256}};
module.exports.vietqr=vietqr;module.exports.crc16=crc16;module.exports.vnpSign=vnpSign;module.exports.vnpSortEncode=vnpSortEncode;module.exports.momoIpnRaw=momoIpnRaw;module.exports.momoCreateRaw=momoCreateRaw;module.exports.hmac256=hmac256;
