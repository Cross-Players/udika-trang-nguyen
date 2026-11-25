'use strict';
/* Cổng khách hàng tự vận hành: mọi quyền và hạn mức do MÁY CHỦ kiểm – trang này chỉ hiển thị và gửi yêu cầu. */
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(url,opt={}){const r=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...opt});let d;try{d=await r.json()}catch{throw Error('Máy chủ không trả dữ liệu hợp lệ')}if(!r.ok){const e=Error(d.error||'Không thực hiện được');e.status=r.status;throw e}return d}
const PHASE={idle:'Chưa bắt đầu',ready:'Chờ câu tiếp',media:'Đang phát clip',running:'ĐANG MỞ CÂU',reveal:'Đang công bố đáp án',finished:'Đã xướng danh',self:'Đang tự làm bài'};
const fmtDate=t=>t?new Date(t).toLocaleDateString('vi-VN'):'không giới hạn';
const fmtTime=t=>t?new Date(t).toLocaleString('vi-VN'):'';
let me=null;
function show(ok){$('loginView').classList.toggle('hidden',ok);$('dash').classList.toggle('hidden',!ok)}
function note(msg,id='roomNotice',html=false){const e=$(id);if(html)e.innerHTML=msg;else e.textContent=msg;e.classList.remove('hidden')}
function onAuthLost(e){if(e&&(e.status===401||e.status===403)&&/đăng nhập|hết hiệu lực/i.test(e.message)){show(false);note('Phiên đăng nhập đã hết hiệu lực – vui lòng đăng nhập lại','loginError');return true}return false}
async function load(){try{const s=await api('/api/session');if(s.user&&s.user.role==='owner'){me=s.user;show(true);renderPlan();await Promise.all([refresh(),libRefresh(),arRefresh(),payRefresh(),evRefresh()])}else{show(false);signupInit()}}catch{show(false)}}
function renderPlan(){const t=me.tenant;$('tName').textContent='🏮 '+t.name;
 $('plan').innerHTML=[['Phòng đang dùng',`${t.rooms} / ${t.maxRooms}`],['Sĩ tử tối đa mỗi phòng',t.maxPlayers.toLocaleString('vi-VN')],['Hạn dùng',fmtDate(t.expiresAt)],['Tình trạng',t.locked?'⛔ Đang bị khoá':t.expired?'⛔ Hết hạn':'✅ Đang hoạt động']].map(([k,v])=>`<div class="pill">${esc(k)}<b>${esc(v)}</b></div>`).join('');
 const b=$('blocked');if(me.blocked){b.textContent='⚠ '+me.blocked;b.classList.remove('hidden')}else b.classList.add('hidden');$('createRoom').disabled=!!me.blocked}
async function refreshSession(){try{const s=await api('/api/session');if(s.user&&s.user.role==='owner'){me=s.user;renderPlan()}else{show(false)}}catch{}}
function btn(label,fn,title){const b=document.createElement('button');b.className='btn';b.type='button';b.textContent=label;if(title)b.title=title;b.onclick=fn;return b}
async function refresh(){try{const d=await api('/api/rooms');const tb=$('roomRows');tb.innerHTML='';
 for(const r of d.rooms){const tr=document.createElement('tr');tr.innerHTML=`<td>${esc(r.title)}<div class="dim">${r.questions} câu · ${r.runs} kỳ đã lưu</div></td><td><b>${esc(r.pin)}</b></td><td>${esc(r.mcUser)}</td><td>${r.count}</td><td>${esc(PHASE[r.phase]||r.phase)}</td>`;
  const td=document.createElement('td'),a=document.createElement('div');a.className='admin-actions';
  a.append(btn('Mở màn MC',()=>location.href='/host?pin='+r.pin,'Bạn là chủ tài khoản – điều khiển trực tiếp được'),btn('Màn LED',()=>window.open('/led?pin='+r.pin,'_blank')),btn('Link sĩ tử',()=>copyText(location.origin+'/join?pin='+r.pin)),
   btn('Báo cáo CSV',()=>window.open('/api/rooms/'+r.pin+'/report.csv','_blank')),btn('Đổi / thu hồi MC',()=>changeMC(r)),btn('Lưu trữ & xoá',()=>removeRoom(r)));
  td.appendChild(a);tr.appendChild(td);tb.appendChild(tr)}
 if(!d.rooms.length)tb.innerHTML='<tr><td colspan="6" class="dim">Chưa có phòng nào – tạo phòng ở ô phía trên.</td></tr>'}catch(e){if(!onAuthLost(e))note(e.message)}}
function copyText(t){(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>note('Đã sao chép: '+t)).catch(()=>prompt('Sao chép đường link:',t))}
async function changeMC(r){const mcUser=prompt('Tên đăng nhập MC MỚI cho phòng '+r.pin+' (MC cũ sẽ bị ngắt ngay):',r.mcUser);if(!mcUser)return;const password=prompt('Mật khẩu MC mới (ít nhất 10 ký tự):');if(!password)return;
 try{await api('/api/rooms/'+r.pin+'/mc',{method:'PATCH',body:JSON.stringify({mcUser,password})});note('Đã cấp quyền MC mới "'+mcUser+'" cho phòng '+r.pin+'. MC cũ đã mất quyền.');refresh()}catch(e){if(!onAuthLost(e))note(e.message)}}
async function removeRoom(r){if(!confirm(`Lưu trữ & xoá phòng ${r.pin} – "${r.title}"?\n\nPhòng sẽ đóng (sĩ tử, MC, màn LED đang mở bị ngắt). Kết quả các kỳ thi chuyển vào mục Lưu trữ, vẫn tải CSV được.`))return;
 try{await api('/api/rooms/'+r.pin,{method:'DELETE'});note('Đã lưu trữ & đóng phòng '+r.pin);await refreshSession();refresh();arRefresh()}catch(e){if(!onAuthLost(e))note(e.message)}}
async function libRefresh(){try{const d=await api('/api/library');const tb=$('libRows');tb.innerHTML='';
 for(const x of d.items){const tr=document.createElement('tr');tr.innerHTML=`<td>${esc(x.name)}${x.mine?'':' <span class="tag">UDIKA</span>'}</td><td>${x.count}</td><td>${esc(x.owner)}</td><td>${esc(fmtTime(x.updatedAt))}</td>`;const td=document.createElement('td');
  if(x.mine)td.appendChild(btn('Xoá',async()=>{if(!confirm('Xoá bộ đề "'+x.name+'" khỏi kho của đơn vị?'))return;try{await api('/api/library/'+x.id,{method:'DELETE'});libRefresh()}catch(e){note(e.message)}}));tr.appendChild(td);tb.appendChild(tr)}
 if(!d.items.length)tb.innerHTML='<tr><td colspan="5" class="dim">Kho đề trống. Trong màn MC, soạn hoặc nhập đề từ Word/Excel rồi bấm "Lưu vào kho đề".</td></tr>'}catch(e){if(!onAuthLost(e))note(e.message)}}
async function arRefresh(){try{const d=await api('/api/archive');const tb=$('arRows');tb.innerHTML='';
 for(const a of d.items){const tr=document.createElement('tr');tr.innerHTML=`<td>${esc(a.title)}<div class="dim">MC ${esc(a.mcUser)} · ${a.players} sĩ tử · ${a.questions} câu</div></td><td>${esc(a.pin)}</td><td>${esc(fmtTime(a.deletedAt))}</td>`;const td=document.createElement('td');
  if(!a.runs.length)td.innerHTML='<span class="dim">không có kỳ thi nào có bài nộp</span>';
  for(const h of a.runs){const l=document.createElement('a');l.href=`/api/archive/${a.pin}/${h.eid}.csv`;l.textContent=`${fmtTime(h.at)} · ${h.count} người${h.rehearsal?' · TỔNG DUYỆT':''}${h.top.length?' · '+h.top[0]:''}`;l.className='link-btn';td.appendChild(l);td.appendChild(document.createElement('br'))}
  tr.appendChild(td);tb.appendChild(tr)}
 if(!d.items.length)tb.innerHTML='<tr><td colspan="4" class="dim">Chưa có phòng nào được lưu trữ.</td></tr>'}catch(e){if(!onAuthLost(e))note(e.message)}}
$('doLogin').onclick=async()=>{try{await api('/api/login',{method:'POST',body:JSON.stringify({role:'owner',login:$('login').value.trim(),password:$('password').value})});$('password').value='';$('loginError').classList.add('hidden');load()}catch(e){note(e.message,'loginError')}};
$('password').onkeydown=e=>{if(e.key==='Enter')$('doLogin').click()};
$('createRoom').onclick=async()=>{const b={title:$('roomTitle').value.trim(),mcUser:$('mcUser').value.trim(),password:$('mcPassword').value};
 if(!b.title||!b.mcUser)return note('Nhập tên sự kiện và tên đăng nhập MC');if(b.password.length<10)return note('Mật khẩu MC cần tối thiểu 10 ký tự');
 try{const d=await api('/api/rooms',{method:'POST',body:JSON.stringify(b)});$('mcPassword').value='';const o=location.origin;
  note(`✅ ĐÃ TẠO PHÒNG <b>${esc(d.pin)}</b> – MC <b>${esc(d.mcUser)}</b>.<br>Gửi MC: trang <code>${esc(o)}/host</code> · mã phòng <code>${esc(d.pin)}</code> · tên <code>${esc(d.mcUser)}</code> · mật khẩu vừa đặt.<br>Màn LED: <code>${esc(o)}/led?pin=${esc(d.pin)}</code> · Sĩ tử vào: <code>${esc(o)}/join?pin=${esc(d.pin)}</code>`,'roomNotice',true);
  await refreshSession();refresh()}catch(e){if(!onAuthLost(e))note(e.message)}};
$('refresh').onclick=()=>{refreshSession();refresh()};$('libRefresh').onclick=libRefresh;$('arRefresh').onclick=arRefresh;
$('logout').onclick=async()=>{await api('/api/logout',{method:'POST',body:'{}'});me=null;show(false)};

/* ===== Gói & thanh toán ===== */
const vnd=n=>Number(n||0).toLocaleString('vi-VN')+'đ';const ST={pending:'⏳ Chờ thanh toán',paid:'✅ Đã thanh toán',cancelled:'✖ Đã huỷ',expired:'⌛ Hết hạn'};
let PAYCFG=null,watchOrder=null;
async function payRefresh(){try{PAYCFG=PAYCFG||await api('/api/pay/config');const [pl,od]=await Promise.all([api('/api/plans'),api('/api/orders')]);
 $('plans').innerHTML=pl.items.length?pl.items.map(p=>`<div class="pill">${esc(p.name)}<b>${vnd(p.price)}</b><span class="dim">${p.days} ngày · ${p.maxRooms} phòng · ${p.maxPlayers.toLocaleString('vi-VN')} sĩ tử/phòng${p.note?'<br>'+esc(p.note):''}</span><br><button class="btn primary" type="button" data-buy="${esc(p.id)}">Chọn gói</button></div>`).join(''):'<span class="dim">UDIKA chưa mở bán gói trực tuyến – liên hệ UDIKA để gia hạn.</span>';
 for(const b of document.querySelectorAll('[data-buy]'))b.onclick=()=>buy(b.dataset.buy);
 const tb=$('orderRows');tb.innerHTML='';for(const o of od.items){const tr=document.createElement('tr');tr.innerHTML=`<td><b>${esc(o.code)}</b></td><td>${esc(o.plan.name)}</td><td>${vnd(o.amount)}${o.paidAmount&&o.status!=='paid'?'<div class="dim">đã nhận '+vnd(o.paidAmount)+'</div>':''}</td><td>${ST[o.status]||o.status}${o.note?'<div class="dim">'+esc(o.note)+'</div>':''}</td><td>${esc(fmtTime(o.createdAt))}</td>`;
  const td=document.createElement('td');if(o.status==='pending'){td.append(btn('Thanh toán',()=>showOrder(o.code)),btn('Huỷ',async()=>{if(!confirm('Huỷ đơn '+o.code+'?'))return;try{await api('/api/orders/'+o.code+'/cancel',{method:'POST',body:'{}'});payRefresh()}catch(e){note(e.message)}}))}tr.appendChild(td);tb.appendChild(tr)}
 if(!od.items.length)tb.innerHTML='<tr><td colspan="6" class="dim">Chưa có đơn hàng.</td></tr>'}catch(e){if(!onAuthLost(e))note(e.message)}}
async function buy(id){try{const o=await api('/api/orders',{method:'POST',body:JSON.stringify({plan:id})});renderOrder(o);payRefresh()}catch(e){note(e.message)}}
async function showOrder(code){try{renderOrder(await api('/api/orders/'+code))}catch(e){note(e.message)}}
function renderOrder(o){const box=$('orderBox');const P=o.pay||{};let h=`<b>Đơn ${esc(o.code)}</b> · ${esc(o.plan.name)} · <b>${vnd(o.amount)}</b> · ${ST[o.status]||o.status}<br>`;
 if(o.status==='pending'){if(P.vietqr){const q=P.vietqr;h+=`<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:center;margin-top:10px"><div style="background:#fff;padding:10px;border-radius:12px">${QR.svg(q.payload,{size:220,label:'Mã VietQR thanh toán đơn '+o.code})}</div><div>🏦 ${esc(q.bankName||'Ngân hàng')}<br>Số tài khoản: <b style="user-select:all">${esc(q.acc)}</b><br>Chủ tài khoản: <b>${esc(q.name)}</b><br>Số tiền: <b>${vnd(q.amount)}</b><br>Nội dung chuyển khoản: <b style="user-select:all;font-size:20px">${esc(q.content)}</b><br><span class="dim">Quét mã bằng ứng dụng ngân hàng – số tiền & nội dung tự điền. Nhận tiền là gói được gia hạn tự động.</span></div></div>`}
  const links=[];if(P.vnpay)links.push(`<a class="btn primary" href="${P.vnpay}">Thanh toán qua VNPAY</a>`);if(P.momo)links.push(`<a class="btn primary" href="${P.momo}">Thanh toán qua MoMo</a>`);
  if(links.length)h+=`<div class="admin-actions" style="margin-top:10px">${links.join('')}</div>`;if(!P.vietqr&&!links.length)h+='<div class="dim">UDIKA chưa bật thanh toán trực tuyến – liên hệ UDIKA, đọc mã đơn để được xác nhận.</div>';
  watchOrder=o.code}else watchOrder=null;
 box.innerHTML=h;box.classList.remove('hidden')}
setInterval(async()=>{if(!watchOrder||!me)return;try{const o=await api('/api/orders/'+watchOrder);if(o.status!=='pending'){renderOrder(o);payRefresh();refreshSession();if(o.status==='paid')note('✅ Đã nhận thanh toán đơn '+o.code+' – gói đã được gia hạn')}}catch{}},5000);
$('payRefresh').onclick=payRefresh;
/* ===== Chương trình liên hoàn ===== */
async function evRefresh(){try{const d=await api('/api/events');const tb=$('evRows');tb.innerHTML='';
 for(const e of d.items){const tr=document.createElement('tr');tr.innerHTML=`<td>${esc(e.name)}</td><td><b>${esc(e.code)}</b></td><td>${e.teams}</td><td>${e.activities}</td><td>${e.judges}</td><td>${e.locked?'🔒 đã khoá điểm':'đang chấm'}${e.hidden?' · giữ kín':''}</td>`;const td=document.createElement('td');
  td.append(btn('Quản lý',()=>location.href='/chuongtrinh?id='+e.id),btn('Bảng điểm LED',()=>window.open('/bangdiem?ma='+e.code,'_blank')));tr.appendChild(td);tb.appendChild(tr)}
 if(!d.items.length)tb.innerHTML='<tr><td colspan="7" class="dim">Chưa có chương trình nào.</td></tr>'}catch(e){if(!onAuthLost(e))note(e.message)}}
$('evRefresh').onclick=evRefresh;
$('evCreate').onclick=async()=>{const name=$('evName').value.trim();if(!name)return note('Đặt tên chương trình');try{const e=await api('/api/events',{method:'POST',body:JSON.stringify({name})});location.href='/chuongtrinh?id='+e.id}catch(e){note(e.message)}};
/* ===== Đổi mật khẩu ===== */
$('pwDo').onclick=async()=>{const a=$('pwOld').value,b=$('pwNew').value,c=$('pwNew2').value;if(b!==c)return note('Hai lần nhập mật khẩu mới không khớp','pwMsg');
 try{await api('/api/khach/password',{method:'POST',body:JSON.stringify({oldPassword:a,newPassword:b})});$('pwOld').value=$('pwNew').value=$('pwNew2').value='';note('✅ Đã đổi mật khẩu. Các máy khác đã bị đăng xuất.','pwMsg')}catch(e){note(e.message,'pwMsg')}};
/* ===== Tự đăng ký (khi UDIKA bật) ===== */
async function signupInit(){try{PAYCFG=PAYCFG||await api('/api/pay/config');if(!PAYCFG.selfSignup)return;$('signupView').classList.remove('hidden');
 if(PAYCFG.trialDays)$('signupNote').textContent=`Đăng ký để tự tổ chức thi – được dùng thử ${PAYCFG.trialDays} ngày (1 phòng, 50 sĩ tử). Sau đó chọn gói và thanh toán ngay trên trang này.`}catch{}}
$('doSignup').onclick=async()=>{const b={name:$('suName').value.trim(),login:$('suLogin').value.trim(),password:$('suPass').value,contact:$('suContact').value.trim()};
 try{await api('/api/signup',{method:'POST',body:JSON.stringify(b)});await api('/api/login',{method:'POST',body:JSON.stringify({role:'owner',login:b.login,password:b.password})});$('signupView').classList.add('hidden');load()}catch(e){note(e.message,'signupMsg')}};
{const q=new URLSearchParams(location.search);if(q.get('thanhtoan')){setTimeout(()=>{note(q.get('thanhtoan')==='loi'?'⚠ Cổng thanh toán báo chưa thành công cho đơn '+(q.get('don')||'')+'. Nếu đã bị trừ tiền, liên hệ UDIKA.':'Đang chờ cổng thanh toán xác nhận đơn '+(q.get('don')||'')+'… trang sẽ tự cập nhật.');watchOrder=q.get('don')||null},600)}}
load();
