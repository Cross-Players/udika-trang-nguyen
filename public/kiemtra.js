'use strict';
/* UDIKA – trang tự kiểm tra máy (V15 #1). Không cần đăng nhập; chỉ gửi kết quả kỹ thuật (không gửi dữ liệu cá nhân ngoài tên tự nhập). */
const $=id=>document.getElementById(id);const P=new URLSearchParams(location.search);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
const DEV=store.get('udika_dev_id')||(()=>{const x=Math.random().toString(36).slice(2,10);store.set('udika_dev_id',x);return x})();
$('pin').value=(P.get('pin')||store.get('udika_last_pin')||'').replace(/\D/g,'').slice(0,6);$('name').value=(store.get('udika_name')||'').slice(0,28);
const R={id:DEV};const items=[
 ['browser','Trình duyệt'],['ws','Kết nối tới máy chủ (thời gian thực)'],['lat','Độ trễ mạng'],['clock','Đồng hồ máy'],['storage','Lưu tạm trên máy (giữ chỗ khi mất mạng)'],
 ['screen','Màn hình'],['wake','Giữ màn hình sáng'],['audio','Âm thanh'],['typing','Gõ tiếng Việt']];
const st={};
function set(k,level,text,sub){st[k]={level,text,sub};draw()}
function draw(){$('list').innerHTML=items.map(([k,t])=>{const s=st[k]||{level:'run',text:'đang thử…'};const ic={ok:'✓',warn:'!',fail:'✕',run:'…',todo:'?'}[s.level];
 return `<div class="item" data-k="${k}" data-level="${s.level}"><span class="ic ${s.level}">${ic}</span><div><b>${esc(t)}: ${esc(s.text)}</b>${s.sub?`<small>${esc(s.sub)}</small>`:''}</div></div>`}).join('');
 const L=Object.values(st).map(x=>x.level);const lv=L.includes('fail')?'fail':L.includes('warn')||L.includes('run')||L.includes('todo')?'warn':'ok';R.level=lv;
 const todo=L.filter(x=>x==='todo').length,bad=L.includes('warn');const v=$('verdict');v.className=lv;
 v.textContent=(L.includes('run')?'Đang kiểm tra…':lv==='ok'?'✅ Máy sẵn sàng thi':lv==='fail'?'❌ Máy có lỗi – xem mục đỏ bên dưới hoặc báo MC/ban tổ chức':!bad&&todo?`Kết nối ổn – còn ${todo} bước tự thử bên dưới (âm thanh, gõ chữ)`:'⚠ Dùng được nhưng có lưu ý – xem mục vàng')+(v.dataset.sent?' · đã gửi kết quả cho MC':'')}
/* ---- trình duyệt ---- */
function browserCheck(){const ua=navigator.userAgent;let os='Khác',br='Khác',ver=0;
 if(/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)){os='iOS '+((ua.match(/OS (\d+)_/)||[])[1]||'')}else if(/Android/.test(ua))os='Android '+((ua.match(/Android (\d+)/)||[])[1]||'');else if(/Windows/.test(ua))os='Windows';else if(/Mac OS X/.test(ua))os='macOS';else if(/Linux/.test(ua))os='Linux';
 const inapp=/Zalo/i.test(ua)?'Zalo':/FBAN|FBAV|FB_IAB|Messenger/i.test(ua)?'Facebook/Messenger':/Instagram/i.test(ua)?'Instagram':/TikTok|musical_ly/i.test(ua)?'TikTok':/Line\//.test(ua)?'LINE':'';
 let m;if((m=ua.match(/Edg\/(\d+)/)))br='Edge',ver=+m[1];else if((m=ua.match(/SamsungBrowser\/(\d+)/)))br='Samsung Internet',ver=+m[1];else if((m=ua.match(/CocCoc\/(\d+)|coc_coc_browser\/(\d+)/i)))br='Cốc Cốc',ver=+(m[1]||m[2]);
 else if((m=ua.match(/CriOS\/(\d+)/)))br='Chrome',ver=+m[1];else if((m=ua.match(/Chrome\/(\d+)/)))br='Chrome',ver=+m[1];else if((m=ua.match(/Firefox\/(\d+)/)))br='Firefox',ver=+m[1];else if((m=ua.match(/Version\/(\d+).*Safari/)))br='Safari',ver=+m[1];
 R.os=os.trim();R.browser=(inapp?inapp+' (trong ứng dụng)':br+(ver?' '+ver:'')).slice(0,24);
 const iosV=+((ua.match(/OS (\d+)_/)||[])[1]||99);const old=(br==='Chrome'&&ver&&ver<80)||(br==='Safari'&&ver&&ver<13)||(/iPhone|iPad/.test(ua)&&iosV<13)||(br==='Firefox'&&ver&&ver<78)||!('WebSocket' in window);
 if(inapp)set('browser','warn',`${inapp} – trình duyệt trong ứng dụng`,'Nên mở bằng Chrome hoặc Safari: bấm ⋯ / "Mở bằng trình duyệt" để tránh bị đóng giữa chừng hoặc chặn âm thanh.');
 else if(old)set('browser','warn',`${br} ${ver||''} – bản cũ`,'Nên cập nhật trình duyệt; máy rất cũ có thể chậm hoặc lỗi hiển thị.');
 else set('browser','ok',`${br}${ver?' '+ver:''} · ${os}`)}
/* ---- kết nối, độ trễ, đồng hồ ---- */
let ws=null;
function wsCheck(){return new Promise(done=>{const pin=$('pin').value.replace(/\D/g,'');const url=(location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws'+(/^\d{6}$/.test(pin)?'?pin='+pin:'');
 const t0=performance.now();let opened=false;try{ws&&ws.close()}catch{}try{ws=new WebSocket(url)}catch(e){set('ws','fail','không mở được','Trình duyệt/mạng chặn kết nối thời gian thực.');return done(false)}
 const to=setTimeout(()=>{if(!opened){set('ws','fail','không kết nối được sau 8 giây','Kiểm tra Wi-Fi/4G; mạng công ty/khách sạn có thể chặn – thử đổi sang 4G hoặc Wi-Fi khác.');set('lat','fail','không đo được');set('clock','warn','không đo được');try{ws.close()}catch{}done(false)}},8000);
 const rtts=[],offs=[];let sentAt=0;
 ws.onopen=()=>{opened=true;clearTimeout(to);set('ws','ok',`đã kết nối (${Math.round(performance.now()-t0)} ms)`);ping()};
 ws.onerror=()=>{};ws.onclose=()=>{if(!opened)return};
 function ping(){sentAt=performance.now();R._wall=Date.now();ws.send(JSON.stringify({type:'ping'}))}
 ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.type==='device_ok'){sentNote(m.level);return}if(m.type==='error'&&R._sending){sentNote(null,m.message);return}if(m.type!=='pong')return;
  const rtt=performance.now()-sentAt;rtts.push(rtt);if(m.at)offs.push(m.at-(R._wall+rtt/2));
  if(rtts.length<8)return setTimeout(ping,120);
  const s=[...rtts].sort((a,b)=>a-b),med=s[s.length>>1],jit=s[s.length-1]-s[0];R.wsMs=Math.round(med);R.wsJitter=Math.round(jit);
  set('lat',med>600?'fail':med>250||jit>800?'warn':'ok',`${Math.round(med)} ms (dao động ${Math.round(jit)} ms)`,med>600?'Mạng quá chậm – câu hỏi tính giờ sẽ bất lợi. Đổi sang Wi-Fi hội trường hoặc 4G mạnh hơn.':med>250||jit>800?'Mạng hơi chậm/chập chờn – nên đứng gần điểm phát Wi-Fi.':'');
  const o=offs.sort((a,b)=>a-b)[offs.length>>1]||0;R.clockMs=Math.round(o);
  set('clock',Math.abs(o)>120000?'warn':'ok',Math.abs(o)<1500?'khớp máy chủ':`lệch ${Math.round(Math.abs(o)/1000)} giây`,'Máy chủ tự tính giờ nên lệch đồng hồ không ảnh hưởng điểm; lệch nhiều chỉ làm đồng hồ đếm ngược hiển thị sai vài giây.');
  done(true)}})}
function localChecks(){try{localStorage.setItem('udika_t','1');R.storage=localStorage.getItem('udika_t')==='1';localStorage.removeItem('udika_t')}catch{R.storage=false}
 set('storage',R.storage?'ok':'warn',R.storage?'có':'bị tắt (chế độ ẩn danh?)',R.storage?'':'Mất mạng giữa chừng có thể phải ghi danh lại – nên tắt chế độ ẩn danh.');
 const w=innerWidth,h=innerHeight;R.screen=`${w}×${h}@${(devicePixelRatio||1).toFixed(1)}`;set('screen',w<300?'warn':'ok',`${w}×${h}`,w<300?'Màn hình rất nhỏ – đáp án dài có thể khó đọc.':'');
 R.wake='wakeLock' in navigator;set('wake',R.wake?'ok':'warn',R.wake?'hỗ trợ':'không hỗ trợ',R.wake?'':'Vào Cài đặt → Màn hình, đặt thời gian tự khoá ≥ 5 phút để không bị tắt màn giữa câu.');
 const c=navigator.connection;R.net=c?(c.effectiveType||c.type||''):'';}
/* ---- âm thanh ---- */
let actx=null;$('beep').onclick=()=>{try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();actx.resume&&actx.resume();const t=actx.currentTime;
 for(const [f,d] of [[523,0],[659,.18],[784,.36]]){const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=f;g.gain.setValueAtTime(.0001,t+d);g.gain.exponentialRampToValueAtTime(.4,t+d+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d+.25);o.connect(g).connect(actx.destination);o.start(t+d);o.stop(t+d+.3)}
 $('heard').hidden=false;if(!st.audio||st.audio.level==='todo')set('audio','todo','đã phát – bạn có nghe thấy không?')}catch(e){R.audio=false;set('audio','warn','trình duyệt không phát được âm thanh',String(e.message||e));send()}};
$('yes').onclick=()=>{R.audio=true;set('audio','ok','nghe rõ');$('heard').hidden=true;send()};
$('no').onclick=()=>{R.audio=false;set('audio','warn','không nghe thấy','Tắt chế độ im lặng (công tắc bên hông iPhone), tăng âm lượng, thử lại. Vẫn thi được nhưng không nghe nhạc/câu hỏi âm thanh.');$('heard').hidden=true;send()};
/* ---- gõ tiếng Việt: so theo dạng chuẩn NFC (Unikey/Telex/VNI trên máy nào cũng phải ra cùng một chữ) ---- */
const norm=s=>String(s||'').normalize('NFC').toLocaleLowerCase('vi').replace(/\s+/g,' ').trim();
function typeCheck(final){const v=$('typing').value,want=$('target').textContent;if(!v.trim()){if(final)set('typing','todo','chưa gõ thử');return}
 if(norm(v)===norm(want)){R.typing=true;set('typing','ok','gõ dấu đúng');$('typeNote').textContent='✓ Chính xác';send();return}
 if(!final){$('typeNote').textContent='';return}
 const noMark=norm(v).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d')===norm(want).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d');
 R.typing=false;set('typing','warn',noMark?'chưa có dấu':'chưa khớp',noMark?'Bật bàn phím tiếng Việt (Telex/VNI) để trả lời câu tự luận có dấu – câu chọn đáp án không cần.':'Gõ lại đúng dòng mẫu; nếu chữ bị lặp/vỡ dấu, đổi kiểu gõ hoặc bàn phím (Gboard/Laban Key).');$('typeNote').textContent='Chưa khớp – xem gợi ý ở danh sách';send()}
$('typing').addEventListener('input',()=>typeCheck(false));$('typeOk').onclick=()=>typeCheck(true);$('typing').addEventListener('keydown',e=>{if(e.key==='Enter')typeCheck(true)});
/* ---- gửi kết quả cho MC ---- */
let sendT=null;function send(){clearTimeout(sendT);sendT=setTimeout(doSend,400)}
function doSend(){const pin=$('pin').value.replace(/\D/g,'');if(!/^\d{6}$/.test(pin)||!ws||ws.readyState!==1)return sentNote(null,/^\d{6}$/.test(pin)?null:'');R.name=$('name').value.trim().slice(0,28);
 const notes=Object.entries(st).filter(([,v])=>v.level==='fail'||v.level==='warn').map(([k,v])=>(items.find(i=>i[0]===k)||[,k])[1]+': '+v.text).join('; ');
 R._sending=true;ws.send(JSON.stringify({type:'device_report',pin,r:{...R,notes,_wall:undefined,_sending:undefined}}));store.set('udika_last_pin',pin);if(R.name)store.set('udika_name',R.name)}
function sentNote(level,err){const a=$('toJoin'),pin=$('pin').value.replace(/\D/g,'');a.href='/join'+(/^\d{6}$/.test(pin)?'?pin='+pin:'');
 const el=$('verdict');if(level){el.dataset.sent='1';draw()}if(err)el.textContent+=' · (chưa gửi được cho MC: '+err+')'}
async function run(){for(const k of Object.keys(st))delete st[k];set('audio','todo','bấm "Phát tiếng thử" bên dưới');set('typing','todo','gõ thử dòng mẫu bên dưới');browserCheck();localChecks();
 if(R.audio!=null)set('audio',R.audio?'ok':'warn',R.audio?'nghe rõ':'không nghe thấy');if(R.typing!=null)typeCheck(true);
 await wsCheck();send()}
$('again').onclick=run;$('pin').addEventListener('change',run);$('name').addEventListener('change',send);
run();
