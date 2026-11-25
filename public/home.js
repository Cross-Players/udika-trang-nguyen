'use strict';
/* Trang chủ: kiểm tra mã phòng với máy chủ rồi chuyển sang bước ghi danh (/join?pin=…) theo luồng hiện có */
(()=>{
 const $=id=>document.getElementById(id);
 const form=$('joinForm'),input=$('pinInput'),msg=$('pinMsg'),btn=$('joinBtn'),btnText=btn.querySelector('.h-btn-text'),conn=$('conn');
 let busy=false;
 const say=(text,kind='')=>{msg.textContent=text;msg.className='h-msg'+(kind?' '+kind:'');input.setAttribute('aria-invalid',kind==='err'?'true':'false')};
 const setBusy=(on,label)=>{busy=on;btn.setAttribute('aria-busy',on?'true':'false');btn.disabled=on;btnText.textContent=on?(label||'ĐANG KIỂM TRA…'):'VÀO TRƯỜNG THI'};
 const digits=v=>String(v||'').replace(/\D/g,'').slice(0,6);
 const saved=pin=>{try{return JSON.parse(localStorage.getItem('udika_player_'+pin)||'null')}catch{return null}};

 // ô nhập: chỉ nhận số, tối đa 6 chữ số; dán "123 456" hoặc link có ?pin= vẫn được
 input.addEventListener('input',()=>{const raw=input.value;const m=raw.match(/pin=(\d{6})/);const v=m?m[1]:digits(raw);if(v!==raw)input.value=v;input.classList.toggle('filled',v.length>0);if(msg.classList.contains('err'))say('')});
 const q=new URLSearchParams(location.search);const pre=digits(q.get('pin'));if(pre){input.value=pre;input.classList.add('filled')}

 async function check(pin){
  const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),8000);
  try{const r=await fetch('/api/rooms/'+pin+'/check',{signal:ctl.signal,headers:{Accept:'application/json'},cache:'no-store'});let d={};try{d=await r.json()}catch{}return {status:r.status,data:d}}
  finally{clearTimeout(t)}
 }
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  const pin=digits(input.value);
  if(!pin){say('Vui lòng nhập mã phòng gồm 6 chữ số.','err');input.focus();return}
  if(pin.length!==6){say('Mã phòng gồm đúng 6 chữ số – bạn mới nhập '+pin.length+' số.','err');input.focus();return}
  setBusy(true);say('Đang kết nối tới phòng '+pin+'…','info');
  let res;
  try{res=await check(pin)}
  catch(err){setBusy(false);setConn('off');say(err.name==='AbortError'?'Máy chủ phản hồi quá lâu. Kiểm tra mạng rồi bấm thử lại.':'Không kết nối được máy chủ. Kiểm tra Wi-Fi/4G rồi bấm thử lại.','err');return}
  setConn('on');
  if(res.status===404){setBusy(false);say('Không tìm thấy phòng '+pin+'. Hãy xem lại mã trên màn hình chương trình.','err');input.focus();input.select();return}
  if(res.status===429){setBusy(false);say(res.data.error||'Bạn thử quá nhiều lần, vui lòng chờ 1 phút.','err');return}
  if(res.status!==200){setBusy(false);say(res.data.error||'Máy chủ đang bận, vui lòng thử lại.','err');return}
  const d=res.data,mine=saved(pin);
  if(d.status==='finished'&&!mine){setBusy(false);say('Khoa thi ở phòng '+pin+' đã kết thúc, không nhận ghi danh mới.','err');return}
  if(d.status==='locked'&&!mine){setBusy(false);say('MC đã khoá phòng '+pin+', không nhận thêm sĩ tử mới.','err');return}
  say((mine?'Chào mừng trở lại! ':'Đã tìm thấy phòng: ')+(d.title||pin)+' ✓','ok');setBusy(true,'ĐANG VÀO PHÒNG…');
  try{sessionStorage.setItem('udika_room_'+pin,JSON.stringify({title:d.title,status:d.status,teams:d.teams}))}catch{}
  setTimeout(()=>{location.href='/join?pin='+pin},350);
 });

 // trạng thái kết nối máy chủ
 function setConn(s){conn.className='h-conn '+s;conn.querySelector('span').textContent=s==='on'?'Máy chủ sẵn sàng':s==='off'?'Mất kết nối máy chủ – đang thử lại…':'Đang kết nối máy chủ…'}
 async function ping(){try{const r=await fetch('/health',{cache:'no-store'});setConn(r.ok?'on':'off')}catch{setConn('off')}}
 ping();setInterval(ping,20000);window.addEventListener('online',ping);window.addEventListener('offline',()=>setConn('off'));

 // nút "Dành cho MC": nếu đã đăng nhập thì vào thẳng phòng được giao / trang quản trị
 fetch('/api/session',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{const u=d&&d.user;if(!u)return;const a=$('mcLink');
  if(u.role==='mc'&&u.pin){a.href='/host?pin='+encodeURIComponent(u.pin);a.textContent='Phòng MC '+u.pin}else if(u.role==='admin'){a.href='/admin';a.textContent='Quản trị'}else if(u.role==='owner'){a.href='/khach';a.textContent='Cổng khách hàng'}}).catch(()=>{});

 // hướng dẫn
 const dlg=$('guide');$('guideBtn').addEventListener('click',()=>{if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','')});
 // trên điện thoại: đưa con trỏ vào ô mã ngay (không tự bật bàn phím trên iOS nếu chưa chạm – vẫn an toàn)
 if(!pre&&matchMedia('(min-width:761px)').matches)input.focus();
})();
