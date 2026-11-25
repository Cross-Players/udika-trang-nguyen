'use strict';
const qs = (s)=>document.querySelector(s);
const params = new URLSearchParams(location.search);
const escapeHtml=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stageNames=['LỚP THẦY ĐỒ','KHẢO HẠCH','THI HƯƠNG','THI HỘI','THI ĐÌNH'];
const fmt=(n)=>Number(n||0).toLocaleString('vi-VN');
const medal=(n)=>['🥇','🥈','🥉'][n]||'📜';
const timeLeft=(q)=>q?Math.max(0,Math.ceil((q.deadline-(Date.now()+serverOffset))/1000)):0;
let serverOffset=0;
let socket=null;
let onEvent=()=>{};
let onOpen=()=>{};
let onClose=()=>{};
let socketQueue=[];let wsRetry=0,wsStopped=false;
/* Kết nối kèm mã phòng: bộ định tuyến (router.js) đưa máy tới đúng tiến trình/máy chủ đang giữ phòng đó */
let wsPin=(params.get('pin')||'').replace(/\D/g,'').slice(0,6);
function useRoomPin(pin){pin=String(pin||'').replace(/\D/g,'').slice(0,6);if(!pin||pin===wsPin)return;wsPin=pin;if(socket){const old=socket;old.onclose=null;old.onopen=null;try{old.close()}catch{}socket=null}wsRetry=0;connect()}
function connect(){
 const protocol=location.protocol==='https:'?'wss:':'ws:';
 socket=new WebSocket(protocol+'//'+location.host+'/ws'+(wsPin?'?pin='+wsPin:''));
 socket.onopen=()=>{wsRetry=0;const jobs=socketQueue.splice(0);for(let j of jobs)socket.send(JSON.stringify(j));onOpen()};
 socket.onmessage=e=>{let msg;try{msg=JSON.parse(e.data)}catch{return}if(msg.time)serverOffset=msg.time-Date.now();if(msg.type==='replaced'){wsStopped=true;showReplaced(msg.message);try{socket.close()}catch{}return}onEvent(msg)};
 /* nối lại theo khoảng chờ tăng dần (0,7 → 15 giây) có độ lệch ngẫu nhiên: tránh hàng nghìn máy cùng dồn vào một lúc */
 socket.onclose=()=>{onClose();if(wsStopped)return;const d=Math.min(15000,700*2**Math.min(wsRetry,5))*(0.6+Math.random()*0.8);wsRetry++;setTimeout(connect,d)};
 socket.onerror=()=>{};
}
function emit(msg){if(socket&&socket.readyState===1)socket.send(JSON.stringify(msg));else if(socketQueue.length<20)socketQueue.push(msg)}
function renderRanks(list,limit=10,ups=null){return (list||[]).slice(0,limit).map((p,i)=>{const up=ups&&ups.get(p.name+'|'+p.avatar);return `<div class="rank${up?' up':''}"><span class="no" title="Hạng ${p.rank||i+1}">${medal((p.rank||i+1)-1)}</span><div><b>${escapeHtml(p.avatar||'📜')} ${escapeHtml(p.name)}</b>${up?`<span class="up-badge" title="Vượt lên ${up} hạng">▲${up}</span>`:''}<div class="meta">${p.correct||0} câu đúng</div></div><span class="pts">${fmt(p.score)} điểm</span></div>`}).join('')||'<p class="muted">Chưa có người ghi điểm.</p>'}
/* Cùng một người mở 2 tab/thiết bị: tab cũ dừng hẳn (không tự nối lại để tránh hai tab đẩy nhau ra liên tục) */
function showReplaced(text){let o=document.getElementById('replacedBox');if(!o){o=document.createElement('div');o.id='replacedBox';o.className='replaced-box';document.body.appendChild(o)}
 o.innerHTML=`<div><b>⏸ ${escapeHtml(text||'Bạn đang thi ở tab hoặc thiết bị khác.')}</b><p>Nếu muốn tiếp tục ở đây, bấm nút dưới (tab kia sẽ tạm dừng).</p><button class="btn primary" type="button">▶ Tiếp tục ở tab này</button></div>`;
 o.querySelector('button').onclick=()=>{o.remove();wsStopped=false;wsRetry=0;connect()}}

/* V15 #3 chạy mạng nội bộ (LAN, `npm run lan`): mở màn MC/LED ngay trên máy chủ (localhost) thì mã QR & link cho điện thoại phải là địa chỉ LAN
   của máy (vd http://192.168.1.10:3000), không phải "localhost" (điện thoại không vào được). Chỉ đổi khi máy chủ chạy chế độ LAN. */
let UDIKA_ORIGIN=location.origin;function pubOrigin(){return UDIKA_ORIGIN}
if(/^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(location.hostname)&&typeof fetch==='function')
 fetch('/api/lan-info',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(d&&d.lan&&d.urls&&d.urls[0]){UDIKA_ORIGIN=d.urls[0];window.dispatchEvent(new Event('udika-origin'))}}).catch(()=>{});
