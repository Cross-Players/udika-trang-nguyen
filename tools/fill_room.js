'use strict';
// Đổ N sĩ tử thật (WebSocket) vào một phòng để xem màn LED với phòng đông. Dùng: node tools/fill_room.js <url> <pin> <N> [answer=1]
// In "READY" khi tất cả đã vào; giữ kết nối tới khi bị dừng. Gửi "ANSWER\n" vào stdin để mọi người trả lời ngẫu nhiên câu hiện tại.
const [url,pin,N]=[process.argv[2],process.argv[3],Number(process.argv[4]||1000)];
const HO=['Nguyễn','Trần','Lê','Phạm','Hoàng','Vũ','Đặng','Bùi','Đỗ','Ngô','Phan','Dương','Lý','Mai','Trịnh','Hồ'],DEM=['Văn','Thị','Minh','Đức','Ngọc','Gia','Quốc','Thu','Hữu','Thanh','Bảo','Khánh'],TEN=['An','Bình','Châu','Dũng','Hà','Huy','Lan','Khánh','Nam','Ngọc','Long','My','Tùng','Thư','Vinh','Hiền','Kiệt','Linh','Triết','Phúc','Hùng','Quân','Tâm','Yến'];
const ws=[];let last=null;
(async()=>{const base=url.replace(/^http/,'ws');
 for(let i=0;i<N;i+=200){await Promise.all(Array.from({length:Math.min(200,N-i)},(_,k)=>new Promise(res=>{const j=i+k;const c=new WebSocket(`${base}/ws?pin=${pin}`);ws.push(c);
  c.onopen=()=>c.send(JSON.stringify({type:'join',pin,name:`${HO[j%16]} ${DEM[(j>>4)%12]} ${TEN[(j*7)%24]} ${j+1}`}));
  c.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state'){c.st=m;res()}};c.onerror=()=>res()})))}
 console.log('READY',ws.filter(c=>c.st).length);
 process.stdin.on('data',d=>{if(String(d).includes('ANSWER'))for(const c of ws){const q=c.st&&c.st.q;if(!q)continue;const ids=q.ids||q.a.map((_,i)=>i);setTimeout(()=>{try{c.send(JSON.stringify({type:'answer',qid:q.qid,eid:c.st.eid,sid:Math.random().toString(36).slice(2,10),choice:ids[(Math.random()*ids.length)|0]}))}catch{}},Math.random()*3000)}});
})();
