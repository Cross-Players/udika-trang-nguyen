'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(url,opt={}){const r=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...opt});let d;try{d=await r.json()}catch{throw Error('Máy chủ không trả dữ liệu hợp lệ')}if(!r.ok){const e=Error(d.error||'Không thực hiện được');e.status=r.status;throw e}return d}
let ME=null;const fmt=n=>Number(n).toLocaleString('vi-VN',{maximumFractionDigits:2});
function msg(t,bad){const m=$('msg');m.textContent=t;m.classList.toggle('bad',!!bad);m.classList.remove('hidden');clearTimeout(msg.t);msg.t=setTimeout(()=>m.classList.add('hidden'),6000)}
async function load(){try{ME=await api('/api/judge/me');$('loginView').classList.add('hidden');$('work').classList.remove('hidden');render()}catch{ME=null;$('loginView').classList.remove('hidden');$('work').classList.add('hidden')}}
function render(){const E=ME.event;$('hello').textContent='⚖️ '+ME.judge.name;$('evName').textContent=E.name+' · mã '+E.code+(E.locked?' · 🔒 ĐÃ KHOÁ ĐIỂM – không sửa được nữa':'');
 const cur=$('act').value;$('act').innerHTML=E.activities.map(a=>`<option value="${esc(a.id)}">${esc(a.name)} (0–${a.max})</option>`).join('');if(cur&&E.activities.some(a=>a.id===cur))$('act').value=cur;
 if(!E.activities.length){$('teams').innerHTML='<p class="dim">Bạn chưa được giao hoạt động nào (hoặc đã bị thu hồi quyền).</p>';return}
 const a=E.activities.find(x=>x.id===$('act').value)||E.activities[0];$('actNote').textContent=`Thang điểm 0–${a.max}. Nhiều trọng tài: ${a.agg==='sum'?'cộng tổng':'lấy trung bình'}. Sửa điểm đã gửi phải ghi lý do.`;
 $('teams').innerHTML=E.teams.map(t=>{const s=ME.mine.find(m=>m.act===a.id&&m.team===t.id);return `<div class="team" data-t="${esc(t.id)}"><b>${esc(t.name)}</b><input class="input" inputmode="decimal" value="${s?fmt(s.points):''}" placeholder="điểm" ${E.locked?'disabled':''}><input class="input note" placeholder="${s?'lý do sửa (bắt buộc khi sửa)':'ghi chú (không bắt buộc)'}" style="max-width:none;flex:1;font-size:15px;text-align:left" ${E.locked?'disabled':''}><button class="btn primary" ${E.locked?'disabled':''}>${s?'Sửa':'Gửi'}</button><span class="${s?'tag-ok':'dim'}">${s?'✔ đã chấm '+fmt(s.points)+(s.rev?' · sửa '+s.rev+' lần':''):'chưa chấm'}</span></div>`}).join('');
 for(const row of document.querySelectorAll('#teams .team')){const [inp,note]=row.querySelectorAll('input');row.querySelector('button').onclick=async()=>{const v=inp.value.trim();if(!v)return msg('Nhập điểm',true);
  try{await api(`/api/events/${ME.event.id}/scores`,{method:'POST',body:JSON.stringify({act:a.id,team:row.dataset.t,points:v,note:note.value.trim()})});ME=await api('/api/judge/me');render();msg('✔ Đã lưu điểm '+v+' cho '+row.querySelector('b').textContent)}catch(e){if(e.status===403&&/hết hiệu lực/.test(e.message))return load();msg(e.message,true)}}}}
$('act').onchange=render;
$('go').onclick=async()=>{try{await api('/api/judge/login',{method:'POST',body:JSON.stringify({code:$('code').value.trim().toUpperCase(),user:$('user').value.trim(),password:$('pass').value})});$('pass').value='';load()}catch(e){const m=$('loginErr');m.textContent=e.message;m.classList.remove('hidden')}};
$('pass').onkeydown=e=>{if(e.key==='Enter')$('go').click()};
$('out').onclick=async()=>{await api('/api/logout',{method:'POST',body:'{}'});load()};
load();setInterval(()=>{if(ME&&!document.activeElement?.matches('input'))api('/api/judge/me').then(d=>{ME=d;render()}).catch(()=>load())},10000);
