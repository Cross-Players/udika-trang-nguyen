'use strict';
/* UDIKA V5.4 – Cảnh LED theo sử liệu khoa cử Việt Nam thời Hậu Lê (Lê sơ – Lê Trung hưng):
   0 Lớp thầy đồ: nhà thầy đồ ở làng; thầy ngồi xếp bằng trên phản, trước mặt có án thư; học trò ngồi chiếu.
   1 Khảo hạch: quan huyện khảo hạch học trò tại huyện đường (thời Lê – Trịnh, trước thi Hương khoảng nửa năm).
   2 Thi Hương: trường thi dựng tạm bằng tre nứa trên đất trống/ruộng đã gặt; rào tre kín bên ngoài,
     rào nứa thưa ngăn các vi; lối đi chữ thập; chòi canh; đuốc lớn ở cửa; sĩ tử tự dựng lều, đặt chõng.
   3 Thi Hội: ở kinh đô Thăng Long; trường thi như thi Hương, cắm lều ở bãi đất trống, quy mô lớn hơn.
   4 Thi Đình: sân rồng trước điện Kính Thiên; điện hai tầng mái đao cong lợp ngói hoàng lưu ly (vàng)
     và thanh lưu ly (xanh), đầu bờ nóc đặt đầu rồng, thềm bậc đá chạm rồng, sân có lan can;
     quân lính cầm cờ theo nghi thức; hai đại thần ngồi ghế có lọng che; bàn hai bên sân để quyển, bút, nghiên;
     cống sĩ ngồi trong lều gọng tre căng vải (theo ghi chép của Samuel Baron).
   Không dùng chữ Hán, không dùng đèn lồng tròn kiểu Trung Hoa, không thêm vật thể không có trong sử liệu. */

const SCENE_THEMES=[
 {sky:['#cfe3e6','#f3e9c8'],hill:['#b7c9b0','#8faa86'],ground:['#c9a979','#a3815a'],line:'#8f7350'},
 {sky:['#d4e2d6','#f6e1b4'],hill:['#b7c6b8','#8fa792'],ground:['#c0704f','#94492f'],line:'#7a3a24'},
 {sky:['#dbe4d2','#f4dcaa'],hill:['#b7c6b0','#8fa786'],ground:['#b89a6a','#8f7247'],line:'#7a6040'},
 {sky:['#e3e0cf','#f2d39c'],hill:['#c0c2aa','#9ea58a'],ground:['#c4a676','#9a7c50'],line:'#7f6644'},
 {sky:['#f3e6c4','#efc27a'],hill:['#d9c08a','#c4a364'],ground:['#d8c3a5','#b49a78'],line:'#8f7756'}
];
const SC_INK='#2b1a10';
function scRng(seed){return ()=>{seed=(seed*16807)%2147483647;return seed/2147483647}}

function scFoliage(cx,cy,w,h,tones,rnd,n=16){let g='';
 tones.forEach((t,layer)=>{for(let i=0;i<n;i++){const a=rnd()*Math.PI*2,r=Math.sqrt(rnd()),x=cx+Math.cos(a)*r*w,y=cy+Math.sin(a)*r*h-layer*4,rr=(16+rnd()*20)*(w/120)-layer*1.5;g+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.max(6,rr).toFixed(1)}" fill="${t}"/>`}});
 for(let i=0;i<n*1.4;i++){const a=rnd()*Math.PI*2,r=Math.sqrt(rnd()),x=cx+Math.cos(a)*r*w*.95,y=cy+Math.sin(a)*r*h*.9;g+=`<path d="M${x.toFixed(1)} ${y.toFixed(1)}q4 -7 9 -2q-4 6 -9 2z" fill="#a8cc84" opacity=".75"/>`}
 return g;
}
function scPaving(HZ,line,rows=13,step=120,op=.55){
 const VY=150,VX=600,t0=(HZ-VY)/(675-VY);let s=`<g stroke="${line}" stroke-width="1.4" opacity="${op}">`;
 for(let i=1;i<=rows;i++){const y=HZ+(675-HZ)*Math.pow(i/rows,1.6);s+=`<path d="M0 ${y.toFixed(1)}H1200"/>`}
 for(let xb=-900;xb<=2100;xb+=step){const xt=VX+(xb-VX)*t0;s+=`<path d="M${xt.toFixed(1)} ${HZ}L${xb} 675"/>`}
 return s+'</g>';
}
const scPersp=(HZ,xb,y)=>{const VY=150,VX=600,t=(y-VY)/(675-VY);return VX+(xb-VX)*t};

/* Nhà mái ngói (huyện đường, điện) – không gắn biển chữ */
function scHall(x0,w,o,HZ){
 const top=o.top||232,base=HZ-30,tile=o.tile||['#8a4330','#4f2418'],id='rf'+Math.round(x0+1000)+(o.idk||'');
 let body=`<rect x="${x0}" y="${top+4}" width="${w}" height="${base-top-4}" fill="${o.wall||'#3f2418'}"/>`;
 const cols=o.cols||4,colW=(w-38)/cols;
 for(let i=0;i<cols;i++){const dx=x0+24+i*colW,dw=colW-14;
  body+=`<rect x="${dx}" y="${top+12}" width="${dw}" height="${base-top-16}" fill="${o.doorFill||'#6b3a22'}" stroke="${o.trim||'#c9a46a'}" stroke-width="1.2"/><g stroke="${o.trim||'#c9a46a'}" stroke-width=".9" opacity=".8">${Array.from({length:5},(_,k)=>`<path d="M${dx+3} ${top+18+k*7}h${dw-6}"/>`).join('')}${Array.from({length:Math.max(2,Math.floor(dw/8))},(_,k)=>`<path d="M${dx+4+k*8} ${top+16}v32"/>`).join('')}</g>`;
 }
 let pillars='';for(let i=0;i<=cols;i++){const px=x0+14+i*colW;pillars+=`<rect x="${px}" y="${top}" width="10" height="${base-top}" fill="${o.pillar||'#5a3a24'}"/>`}
 const curl=o.curl||34,up=o.up||14;
 const roof=(y1,y2,inset,ridgeH,fillId)=>`<path d="M${x0-curl+inset} ${y1-up}Q${x0-6+inset} ${y1+6} ${x0+22+inset} ${y1+2}L${x0+w-22-inset} ${y1+2}Q${x0+w+6-inset} ${y1+6} ${x0+w+curl-inset} ${y1-up}L${x0+w-14-inset} ${y2}L${x0+14+inset} ${y2}Z" fill="url(#${fillId})"/>
  <g stroke="${o.tileLine||'#3a1a10'}" stroke-width="1.1" opacity=".5">${Array.from({length:Math.floor((w-2*inset)/11)},(_,i)=>`<path d="M${x0+18+inset+i*11} ${y2+2}L${x0+12+inset+i*11} ${y1}"/>`).join('')}</g>
  <path d="M${x0-curl+inset} ${y1-up}Q${x0-6+inset} ${y1+6} ${x0+22+inset} ${y1+2}L${x0+w-22-inset} ${y1+2}Q${x0+w+6-inset} ${y1+6} ${x0+w+curl-inset} ${y1-up}" stroke="${o.eave||'#3a1a10'}" stroke-width="${o.eaveW||2.2}" fill="none"/>
  <rect x="${x0+12+inset}" y="${y2-ridgeH}" width="${w-24-2*inset}" height="${ridgeH}" rx="3" fill="${o.ridge||'#33170e'}"/>
  ${o.dragonHeads?scDragonHead(x0+12+inset,y2-ridgeH/2,-1,o.dragonHeads)+scDragonHead(x0+w-12-inset,y2-ridgeH/2,1,o.dragonHeads)
   :`<path d="M${x0+12+inset} ${y2-ridgeH/2}q-16 -4 -18 -${18+up/2}q8 6 18 4zM${x0+w-12-inset} ${y2-ridgeH/2}q16 -4 18 -${18+up/2}q-8 6 -18 4z" fill="${o.ridge||'#33170e'}"/>`}`;
 let s=`<defs><linearGradient id="${id}" x2="0" y2="1"><stop stop-color="${tile[0]}"/><stop offset="1" stop-color="${tile[1]}"/></linearGradient></defs><g filter="url(#dropS)">
  ${o.platform?`<rect x="${x0-14}" y="${base}" width="${w+28}" height="${o.platformH||14}" fill="${o.platform}"/><path d="M${x0-14} ${base}h${w+28}" stroke="#fff" stroke-width="1" opacity=".5"/>`:''}
  ${body}${pillars}<path d="M${x0+10} ${top+4}h${w-20}" stroke="${o.trim||'#c9a46a'}" stroke-width="3"/>
  ${roof(top+4,top-42,0,8,id)}`;
 if(o.double)s+=roof(top-46,top-88,w*.2,7,id);
 return s+'</g>';
}
/* Đầu rồng ở đầu bờ nóc (theo hiện vật ngói rồng thời Lê sơ) */
function scDragonHead(x,y,dir,c){ // con kìm: đầu rồng há miệng ngậm đầu bờ nóc, thân cuộn lên
 const body='M2 2C14 -4 16 -20 8 -30C2 -38 10 -48 20 -44C26 -42 26 -34 20 -33';
 return `<g transform="translate(${x+dir*2} ${y}) scale(${-dir*1.55} 1.55)">
  <path d="${body}" stroke="#6a4a12" stroke-width="9" fill="none" stroke-linecap="round"/><path d="${body}" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M13 -12l6 -2l-3 5zM14 -22l6 0l-4 4zM8 -34l4 -5l0 6z" fill="${c}" stroke="#6a4a12" stroke-width=".8"/>
  <path d="M6 -6Q4 -12 -4 -11L-15 -9L-13 -5L-2 -3Z" fill="${c}" stroke="#6a4a12" stroke-width="1"/>
  <path d="M4 2Q2 6 -4 6L-13 5L-11 1L0 0Z" fill="${c}" stroke="#6a4a12" stroke-width="1"/>
  <path d="M-13 -5l2 2M-9 -4l1 2M-11 1l2 -2M-7 1l1 -2" stroke="#fff6d8" stroke-width=".9"/>
  <circle cx="-1" cy="-7.5" r="1.6" fill="#2b1a10"/><path d="M3 -10Q8 -18 2 -23" stroke="#6a4a12" stroke-width="1.6" fill="none"/>
  <path d="M-15 -9q-6 -4 -10 2" stroke="#6a4a12" stroke-width="1" fill="none"/></g>`;
}
/* ----- Cây cối, mây, tre ----- */
function scBigTree(cx,flip,rnd,tones){const f=flip?-1:1;
 let g=`<path d="M${cx} 340 C${cx+f*10} 270 ${cx-f*22} 210 ${cx+f*8} 110" stroke="#3f2d1f" stroke-width="26" fill="none" stroke-linecap="round"/>
  <path d="M${cx+f*2} 210 C${cx+f*40} 176 ${cx+f*80} 168 ${cx+f*128} 156M${cx-f*4} 170 C${cx-f*30} 150 ${cx-f*40} 120 ${cx-f*60} 100" stroke="#3f2d1f" stroke-width="9" fill="none" stroke-linecap="round"/>`;
 g+=scFoliage(cx+f*40,70,130,72,tones,rnd);
 return `<g filter="url(#dropS)">${g}</g>`;
}
function scCloud(x,y,sc,dur,stroke='#c9a46a',fill='#fffaf0'){return `<g transform="translate(${x} ${y}) scale(${sc})"><g style="animation:sceneCloud ${dur}s ease-in-out infinite alternate">
 <path d="M-6 0c-12 0-16-14-4-18c-2-14 16-20 22-8c6-12 28-8 26 6c12 0 14 16 2 20z" fill="${fill}" stroke="${stroke}" stroke-width="1.6" opacity=".92"/>
 <path d="M34 -2c6-2 8-8 3-10c-4-1-6 3-3 5" stroke="${stroke}" stroke-width="1.3" fill="none"/>
 <path d="M-6 0c-16 2-26 12-18 22c6 6 14 0 8-6" stroke="${stroke}" stroke-width="1.4" fill="none"/></g></g>`}
function scBamboo(x,h,lean,rnd,dur,base=330){
 let s=`<g class="sway" style="transform-origin:${x}px ${base}px;animation-duration:${dur}s"><path d="M${x} ${base}Q${x+lean*.4} ${base-h*.5} ${x+lean} ${base-h}" stroke="#6f9a4a" stroke-width="${7+rnd()*4}" fill="none" stroke-linecap="round"/>`;
 for(let k=1;k<h/38;k++){const t=k*38/h,nx=x+lean*t*t,ny=base-h*t;s+=`<path d="M${(nx-5).toFixed(1)} ${ny.toFixed(1)}h10" stroke="#4a6b2e" stroke-width="2"/>`;
  if(t>.45){for(let j=0;j<3;j++){const d=(j%2?1:-1),L=18+rnd()*14;s+=`<path d="M${nx.toFixed(1)} ${ny.toFixed(1)}q${d*L*.5} ${-4-rnd()*6} ${d*L} ${2+rnd()*8}q${-d*L*.5} ${2} ${-d*L} ${-2-rnd()*4}z" fill="${['#4f7a35','#5f8d3e','#3e6629'][j]}"/>`}}}
 return s+'</g>';
}
function scBambooClump(x0,n,rnd,base=330,hmin=200,hvar=120){let s='';for(let i=0;i<n;i++)s+=scBamboo(x0+i*15+rnd()*8,hmin+rnd()*hvar,(rnd()-.5)*90,rnd,4+rnd()*3,base);return s}
function scChicken(x,y,flip,delay){const f=flip?-1:1;return `<g transform="translate(${x} ${y}) scale(${f} 1)"><g class="peck" style="animation-delay:${delay}s">
 <path d="M-14 0q-6 -16 8 -20q8 -2 14 4q8 -8 12 -2q-2 10 -10 16z" fill="#c8742e" stroke="${SC_INK}" stroke-width="1.2"/>
 <path d="M-14 -6q-12 -10 -8 -20q6 6 10 12z" fill="#2f2a24"/><path d="M-12 -4q-10 -2 -14 -12q8 2 14 6z" fill="#6b3f1e"/>
 <circle cx="18" cy="-18" r="5" fill="#c8742e" stroke="${SC_INK}" stroke-width="1.2"/><path d="M16 -23q2 -5 5 -1q2 -4 4 1z" fill="#d22b1f"/>
 <path d="M23 -18l5 1.5l-5 1.5z" fill="#e6a521"/><circle cx="19" cy="-19" r="1" fill="#111"/>
 </g><path d="M-2 0v6M4 0v6" stroke="#e6a521" stroke-width="1.6"/></g>`}

/* ----- Con người trong cảnh ----- */
function scPerson(o){ // người đứng: lính / quan, nhìn chính diện
 const {x,y,flip=false,robe='#b8362a',trim='#f2c75a',hat='nondau',long=false,cls='guard',delay=0,hold=''}=o,f=flip?-1:1;
 const hatSvg=hat==='nondau'?`<ellipse cx="0" cy="-106" rx="19" ry="3.5" fill="#1d1b19" stroke="#c9a46a" stroke-width="1"/><path d="M-14 -107Q-6 -122 0 -126Q6 -122 14 -107Z" fill="#26221f"/><path d="M0 -126l2 -6l-4 0z" fill="#c9a46a"/><path d="M0 -125q-10 2 -11 12q6 -6 11 -7q5 1 11 7q-1 -10 -11 -12z" fill="#c8231a"/>`
  :hat==='canhchuon'?`<path d="M-10 -108Q-10 -124 0 -125Q10 -124 10 -108Z" fill="#1d1b19"/><rect x="-12" y="-110" width="24" height="5" rx="2" fill="#1d1b19"/><ellipse cx="-17" cy="-114" rx="7" ry="2.6" fill="#1d1b19"/><ellipse cx="17" cy="-114" rx="7" ry="2.6" fill="#1d1b19"/>`
  :`<path d="M-11 -103Q-12 -120 0 -121Q12 -120 11 -103Q6 -109 0 -109Q-6 -109 -11 -103Z" fill="#1d1b19"/>`;
 const body=long?`<path d="M-16 -88Q0 -94 16 -88L22 -2Q0 4 -22 -2Z" fill="${robe}" stroke="${SC_INK}" stroke-width="1.3"/><path d="M-22 -4Q0 2 22 -4" stroke="${trim}" stroke-width="3" fill="none"/><path d="M-6 -92L0 -78L6 -92" stroke="${trim}" stroke-width="2.4" fill="none"/>`
  :`<path d="M-10 -40l-2 38h9l3 -30l3 30h9l-2 -38z" fill="#2f3a5a" stroke="${SC_INK}" stroke-width="1.2"/><path d="M-12 -16h10M2 -16h10" stroke="#e8e0cc" stroke-width="5"/>
   <path d="M-15 -86Q0 -92 15 -86L18 -38Q0 -32 -18 -38Z" fill="${robe}" stroke="${SC_INK}" stroke-width="1.4"/><path d="M-4 -90Q0 -64 14 -52" stroke="${trim}" stroke-width="3" fill="none"/>
   <rect x="-18" y="-56" width="36" height="6" fill="${trim}" stroke="${SC_INK}" stroke-width="1"/>`;
 const holdSvg=hold==='flag'?`<g class="spear"><path d="M-30 6V-160" stroke="#6b4423" stroke-width="3"/><g class="bgflag" style="transform-origin:-30px -150px"><path d="M-30 -158h${f*0+40}v34h-40z" fill="${o.flag||'#e9c13a'}" stroke="${SC_INK}" stroke-width="1"/><path d="M-30 -124h40" stroke="${o.flagEdge||'#b8362a'}" stroke-width="4"/></g></g>`
  :hold==='spear'?`<g class="spear"><path d="M-30 6V-150" stroke="#6b4423" stroke-width="3"/><path d="M-30 -150l-5 -6l5 -18l5 18z" fill="#cfd4d8" stroke="${SC_INK}" stroke-width="1"/></g>`:'';
 return `<g transform="translate(${x} ${y}) scale(${f} 1)"><g class="${cls}" style="animation-delay:${delay}s">
  <ellipse cx="0" cy="2" rx="22" ry="4" fill="#000" opacity=".18"/>${body}
  <path d="M-12 -84q-12 14 -18 30" stroke="${robe}" stroke-width="8" stroke-linecap="round" fill="none"/>
  <path d="M12 -84q10 10 10 26" stroke="${robe}" stroke-width="8" stroke-linecap="round" fill="none"/>
  ${holdSvg}<circle cx="-30" cy="-54" r="4" fill="#f0c9a2"/><circle cx="22" cy="-58" r="4" fill="#f0c9a2"/>
  <ellipse cx="0" cy="-100" rx="10" ry="11" fill="#f0c9a2" stroke="${SC_INK}" stroke-width="1"/>
  <path d="M-5 -101q2 -1.5 4 0M2 -101q2 -1.5 4 0" stroke="${SC_INK}" stroke-width="1"/>${hatSvg}
 </g></g>`;
}

/* Lính theo tranh Đông Hồ "Vinh quy bái tổ" – mẫu lính dùng chung toàn hệ thống (assets/dongho) */
const SOLDIER={linh_co:[326,750],linh_tan:[235,723],linh_long:[358,679]};
const scAsset=n=>typeof dhAsset==='function'?dhAsset(n):`/assets/dongho/${n}.webp`;
function scSoldier(x,y,h,name,flip,delay=0){const [w0,h0]=SOLDIER[name],w=h*w0/h0;
 return `<g transform="translate(${x} ${y}) scale(${flip?-1:1} 1)"><ellipse cx="0" cy="1" rx="${(w*.32).toFixed(1)}" ry="4" fill="#000" opacity=".18"/><g class="guard" style="animation-delay:${delay}s"><image href="${scAsset(name)}" x="${(-w/2).toFixed(1)}" y="${(-h).toFixed(1)}" width="${w.toFixed(1)}" height="${h}"/></g></g>`}
/* ===== V7.3 – Lính cầm cờ vẽ vector (thay hình cắt từ tranh) =====
   Dựng theo lớp: bóng → chân sau → chân trước (xà cạp, giày vải) → áo cổ giao viền hoa văn → thắt lưng có tua
   → cán cờ → tay áo + nắm tay ôm cán → đầu, mũ. Cờ hiệu răng cưa thêu hoa sen, cờ đuôi nheo; vải cờ uốn sóng mượt.
   Chuyển động: thở nhẹ (tay trượt theo cán nên không rời cán), gật đầu khẽ, tua và dải lưng đung đưa. */
const GUARD_PAL={
 co:{tunic:['#f3cd63','#c8901f'],trim:'#b8362a',dot:'#f9e6a8',pants:['#3f8a5a','#235637'],sash:'#b8362a',hat:'non',flag:{field:'#b8362a',border:'#f0c75a',line:'#f9e6a8',emb:'#f6d36a'},kind:'flag'},
 nheo:{tunic:['#3f8a5a','#235637'],trim:'#e9b949',dot:'#b8362a',pants:['#e8a7b8','#b96c82'],sash:'#e9b949',hat:'khan',flag:{field:'#e9b949',border:'#b8362a',line:'#fff0c0',emb:'#b8362a'},kind:'pennant'}};
const GINK='#2a1a10',GSKIN='#f6d7b8',GSKIN2='#e3b58f';
function scGuardDefs(){return Object.entries(GUARD_PAL).map(([k,P])=>`<linearGradient id="gT-${k}" x1="0" x2="1"><stop offset="0" stop-color="${P.tunic[1]}"/><stop offset=".45" stop-color="${P.tunic[0]}"/><stop offset="1" stop-color="${P.tunic[0]}"/></linearGradient><linearGradient id="gP-${k}" x1="0" x2="1"><stop offset="0" stop-color="${P.pants[1]}"/><stop offset=".55" stop-color="${P.pants[0]}"/></linearGradient>`).join('')+
 `<radialGradient id="gSkin" cx=".62" cy=".4" r=".7"><stop offset="0" stop-color="#fde8d2"/><stop offset="1" stop-color="${GSKIN}"/></radialGradient><linearGradient id="gPole" x1="0" x2="1"><stop offset="0" stop-color="#5e3518"/><stop offset=".5" stop-color="#9a6332"/><stop offset="1" stop-color="#5e3518"/></linearGradient>`}
const gSpline=n=>Array(n).fill('.45 0 .55 1').join(';');
function gAnim(type,vals,dur,dl){return `<animateTransform attributeName="transform" type="${type}" values="${vals}" dur="${dur}s" begin="${(-dl).toFixed(2)}s" repeatCount="indefinite" calcMode="spline" keySplines="${gSpline(vals.split(';').length-1)}"/>`}
/* lá cờ: gắn ở cán (px, top), bay về phía -x; răng cưa ở viền, nền, đường chỉ, hoa sen */
function guardFlag(P,px,top,W,H,dl){const pen=P.kind==='pennant',F=8,NS=16,amp=pen?5.5:4.5,dur=pen?1.5:1.8;
 const pt=(u,v,ph)=>{const s=Math.sin(u*Math.PI*1.7-ph),hh=pen?H*(1-u*.88):H;return [px-u*W*(1-.035*s),top+(H-hh)/2+v*hh+s*amp*Math.pow(u,1.1)]};
 const path=(ph,inset,teeth)=>{const a=[];const uMax=1-inset*(pen?2.2:.9);
  for(let i=0;i<=NS;i++){const u=i/NS*uMax,v=teeth?((i%2)?-.07:.02):inset;a.push(pt(u,v,ph))}
  if(!pen||!teeth){for(let j=1;j<5;j++){const v=j/5,uu=uMax+(teeth?(j%2?.04:-.01):0);a.push(pt(Math.min(uu,1.04),inset+v*(1-2*inset),ph))}}
  for(let i=NS;i>=0;i--){const u=i/NS*uMax,v=teeth?((i%2)?1.07:.98):1-inset;a.push(pt(u,v,ph))}
  return 'M'+a.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L')+'Z'};
 const frames=k=>Array.from({length:F+1},(_,i)=>k(i%F*2*Math.PI/F));
 const anim=k=>`<animate attributeName="d" dur="${dur}s" begin="${(-dl).toFixed(2)}s" repeatCount="indefinite" values="${frames(k).join(';')}"/>`;
 const layer=(fill,inset,teeth,extra='')=>`<path d="${path(0,inset,teeth)}" fill="${fill}" ${extra}>${anim(ph=>path(ph,inset,teeth))}</path>`;
 const ec=ph=>{const p=pt(pen?.3:.46,.5,ph);return p[0].toFixed(1)+' '+p[1].toFixed(1)};
 const lotus=`<path d="M0 6C-6 2-5-4 0-8C5-4 6 2 0 6ZM0 6C-8 6-11 0-10-3C-6-2-3 1 0 6ZM0 6C8 6 11 0 10-3C6-2 3 1 0 6Z" fill="${P.flag.emb}" stroke="${GINK}" stroke-width=".6"/><circle r="1.6" cy="-1" fill="${P.flag.field}"/>`;
 return `<g>${layer(P.flag.border,0,true,`stroke="${GINK}" stroke-width="1" stroke-linejoin="round"`)}${layer(P.flag.field,.14,false)}${layer('none',.2,false,`stroke="${P.flag.line}" stroke-width=".9" stroke-dasharray="3 2"`)}
  <g transform="translate(${ec(0)})"><animateTransform attributeName="transform" type="translate" dur="${dur}s" begin="${(-dl).toFixed(2)}s" repeatCount="indefinite" values="${frames(ec).join(';')}"/><g transform="scale(${pen?.62:1})">${lotus}</g></g></g>`}
function scGuard(x,y,s,type,flip,dl=0){const P=GUARD_PAL[type],I=GINK,id=type,pen=P.kind==='pennant';
 const PX=27,top=pen?-252:-214,stripes=x0=>`<path d="M${x0} -21l13 5M${x0} -16l13 5M${x0} -26l13 5" stroke="${P.trim}" stroke-width="1.1"/>`;
 const leg=(front)=>front
  ?`<path d="M-1 -66C1 -46 3 -34 4 -23L18 -23C17 -34 15 -48 13 -66Z" fill="url(#gP-${id})" stroke="${I}" stroke-width="1.2" stroke-linejoin="round"/><path d="M3.6 -25L18 -25L17.4 -9L4.4 -9Z" fill="#f6eedb" stroke="${I}" stroke-width="1"/>${stripes(4.4)}<path d="M3.6 -9Q2 -2 6 0L24 0Q27.5-2 23-5.5L17.5 -9Z" fill="#2a1d15" stroke="${I}" stroke-width="1"/><path d="M8 -2H22" stroke="#5a4535" stroke-width="1"/>`
  :`<path d="M-15 -66C-17 -44 -17 -32 -16 -23L-3 -23C-3 -34 -2 -48 1 -66Z" fill="${P.pants[1]}" stroke="${I}" stroke-width="1.2" stroke-linejoin="round"/><path d="M-16.6 -25L-3 -25L-3.6 -9L-15.6 -9Z" fill="#e6dcc4" stroke="${I}" stroke-width="1"/>${stripes(-16)}<path d="M-17 -9Q-18.5 -2 -14 0L1 0Q3 -3 -2 -6L-4 -9Z" fill="#241a12" stroke="${I}" stroke-width="1"/>`;
 const dots=(d,n)=>`<path d="${d}" stroke="${P.trim}" stroke-width="4.6" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${P.dot}" stroke-width="1.5" fill="none" stroke-dasharray="0.1 3.2" stroke-linecap="round"/>`;
 const arm=(d,w=8)=>`<path d="${d}" stroke="${I}" stroke-width="${w+2.6}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${P.tunic[0]}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${P.tunic[1]}" stroke-width="${w*.35}" fill="none" stroke-linecap="round" opacity=".35" transform="translate(-1.4 1.2)"/>`;
 const fist=(cx,cy)=>`<ellipse cx="${cx-3.2}" cy="${cy}" rx="2.4" ry="4.4" fill="${P.trim}" stroke="${I}" stroke-width=".9"/><rect x="${cx-2.4}" y="${cy-4}" width="7.4" height="8.2" rx="3.4" fill="url(#gSkin)" stroke="${I}" stroke-width="1"/><path d="M${cx+.6} ${cy-1.6}h4M${cx+.6} ${cy+.6}h4M${cx+.6} ${cy+2.7}h3.6" stroke="${GSKIN2}" stroke-width=".7"/><path d="M${cx-1.8} ${cy-3.6}q3.4 -1.4 5.6 .6" stroke="${I}" stroke-width=".8" fill="none"/>`;
 const hat=P.hat==='non'
  ?`<path d="M-11 -127Q-12 -140 0 -142Q12 -142 14 -131L13 -126Q3 -133 -9 -122Z" fill="#1d1612"/><path d="M-22 -131Q2 -160 27 -131Q2 -126 -22 -131Z" fill="#f2e0a8" stroke="${I}" stroke-width="1.2" stroke-linejoin="round"/>${[-14,-6,2,10,18].map(xx=>`<path d="M2.5 -153L${xx} -130" stroke="#c9b37a" stroke-width=".7"/>`).join('')}<path d="M-20 -132.4Q2 -128 25 -132.4" stroke="#b8362a" stroke-width="2.4" fill="none"/><circle cx="2.5" cy="-154" r="2.4" fill="#e9b949" stroke="${I}" stroke-width=".8"/><g>${gAnim('rotate','-6 2.5 -154;8 2.5 -154;-6 2.5 -154',2.2,dl)}<path d="M2.5 -154Q-4 -150 -7 -142" stroke="#b8362a" stroke-width="2.2" fill="none" stroke-linecap="round"/><ellipse cx="-7.5" cy="-140.5" rx="2" ry="3" fill="#b8362a"/></g><path d="M-8 -129Q-3 -111 11 -111" stroke="${I}" stroke-width=".8" fill="none"/>`
  :`<path d="M-11.5 -125Q-13 -141 1 -142.5Q14 -142 14.5 -129L13 -125Q3 -132 -9 -121Z" fill="#1d1612"/><circle cx="-4" cy="-145" r="5.6" fill="#1d1612"/><path d="M-12.5 -131Q1 -137 15 -132L14.6 -127.4Q1 -132 -12.4 -126.4Z" fill="#b8362a" stroke="${I}" stroke-width=".8"/><g>${gAnim('rotate','-10 -12 -129;10 -12 -129;-10 -12 -129',1.9,dl)}<path d="M-12 -129Q-18 -126 -20 -118L-17 -117Q-15 -124 -11 -126Z" fill="#b8362a" stroke="${I}" stroke-width=".7"/></g><path d="M-6 -145.5q2 -2 4 0" stroke="#b8362a" stroke-width="1.4" fill="none"/>`;
 return `<g transform="translate(${x} ${y}) scale(${flip?-s:s} ${s})">
 <ellipse cx="6" cy="1" rx="32" ry="4.6" fill="#1b0f06" opacity=".22"/>
 ${guardFlag(P,PX+1.6,top+4,pen?104:86,pen?32:52,dl)}
 <path d="M${PX-1.6} ${top}H${PX+1.6}V-1H${PX-1.6}Z" fill="url(#gPole)" stroke="${I}" stroke-width=".8"/><ellipse cx="${PX}" cy="0" rx="3.6" ry="1.4" fill="#3a2414"/>
 <path d="M${PX} ${top-14}L${PX+4} ${top-2}L${PX-4} ${top-2}Z" fill="#e9b949" stroke="${I}" stroke-width=".9"/><circle cx="${PX}" cy="${top}" r="2.6" fill="#e9b949" stroke="${I}" stroke-width=".8"/>
 <g>${gAnim('rotate',`-8 ${PX} ${top+2};8 ${PX} ${top+2};-8 ${PX} ${top+2}`,1.6,dl)}<path d="M${PX} ${top+2}q2 8 0 15" stroke="#b8362a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M${PX-2} ${top+16}l2 6l2 -6z" fill="#b8362a"/></g>
 ${leg(false)}
 <g>${gAnim('translate','0 0;0 -0.9;0 0',3.2,dl)}
  ${leg(true).replace(/^/,'')}
  <path d="M-15 -112C-19 -96 -24 -78 -26 -54Q-24 -50 -20 -50L20 -49Q24 -50 25 -54C22 -78 18 -96 14 -112Q0 -118 -15 -112Z" fill="url(#gT-${id})" stroke="${I}" stroke-width="1.3" stroke-linejoin="round"/>
  <path d="M-5 -50L-4 -66" stroke="${I}" stroke-width=".9"/>
  ${dots('M-25.3 -54.5Q0 -49.5 24.4 -54.5')}${dots('M-5 -114L13.5 -82L16 -52')}
  <path d="M-22 -83Q0 -78 21 -83L21.4 -75Q0 -70 -22.6 -75Z" fill="${P.sash}" stroke="${I}" stroke-width="1"/>
  <g>${gAnim('rotate','-6 13 -77;7 13 -77;-6 13 -77',2.6,dl)}<path d="M11.5 -76Q9 -65 11 -57L15.4 -58Q13.6 -66 15 -76Z" fill="${P.sash}" stroke="${I}" stroke-width=".9"/><path d="M14 -76Q15 -67 18 -60L21 -62Q18 -68 16.6 -76Z" fill="${P.sash}" stroke="${I}" stroke-width=".9"/></g>
  <ellipse cx="13.5" cy="-78.5" rx="4" ry="3.2" fill="${P.sash}" stroke="${I}" stroke-width="1"/>
  ${arm('M-11 -106Q-11 -91 -2 -86Q10 -82 22 -80.5')}${arm('M12 -106Q17 -97 21 -89Q24 -95 25.4 -99')}
  ${fist(PX,-80)}${fist(PX,-103)}
  <path d="M-4 -118L5 -118L4.5 -110.5L-3 -110.5Z" fill="${GSKIN2}" stroke="${I}" stroke-width=".9"/>
  <path d="M-6.5 -114.5Q0 -108 7 -114.5" stroke="${P.trim}" stroke-width="3" fill="none"/>
  <g>${gAnim('rotate','-2 1 -112;2.4 1 -112;-2 1 -112',4.2,dl)}
   <ellipse cx="-9" cy="-124" rx="2.7" ry="3.8" fill="url(#gSkin)" stroke="${I}" stroke-width="1"/>
   <path d="M-9.5 -128Q-11 -113 0.5 -110.5Q12 -109.5 14.8 -121Q16 -134 6 -138.5Q-6.5 -140.5 -9.5 -128Z" fill="url(#gSkin)" stroke="${I}" stroke-width="1.2"/>
   <ellipse cx="5.5" cy="-125.6" rx="1.7" ry="2.2" fill="${I}"/><ellipse cx="12" cy="-125.8" rx="1.4" ry="2.1" fill="${I}"/><circle cx="6" cy="-126.4" r=".6" fill="#fff"/><circle cx="12.4" cy="-126.6" r=".5" fill="#fff"/>
   <path d="M3 -130.4Q5.6 -132 8 -130.6M10.6 -130.8Q12.5 -132 14.2 -130.6" stroke="${I}" stroke-width="1" fill="none" stroke-linecap="round"/>
   <path d="M14.6 -124Q16.4 -121 14 -119.8" stroke="${GSKIN2}" stroke-width="1" fill="none"/>
   <path d="M6.2 -116.6Q9.6 -113.2 13.2 -116.8Q9.6 -115.6 6.2 -116.6Z" fill="#a8322a" stroke="#7a1f16" stroke-width=".7"/>
   <ellipse cx="4.6" cy="-119.6" rx="3" ry="1.7" fill="#f09a96" opacity=".55"/>
   ${hat}
  </g>
 </g>
</g>`}
/* hai cụm lính cân đối hai bên bảng câu hỏi: lính cầm cờ hiệu + lính cầm cờ đuôi nheo, nhìn vào giữa, cờ bay ra phía ngoài */
function scGuardPair(FY,s=.9){return scGuard(116,FY,s,'nheo',false,0)+scGuard(174,FY+3,s,'co',false,.7)+scGuard(1084,FY,s,'nheo',true,.35)+scGuard(1026,FY+3,s,'co',true,1.05)}

/* Thầy đồ ngồi xếp bằng trên phản, trước mặt có án thư */
function scTeacher(x,y){return `<g transform="translate(${x} ${y})" filter="url(#dropS)">
 <rect x="-70" y="-20" width="140" height="12" fill="#7a4e2c" stroke="${SC_INK}" stroke-width="1.2"/><path d="M-64 -8v20M64 -8v20" stroke="#5a3a20" stroke-width="6"/>
 <rect x="-66" y="-26" width="132" height="7" fill="#d9c48e" stroke="#9a7a3e" stroke-width="1"/>
 <g class="teacher"><path d="M-30 -24Q-34 -40 -20 -46L20 -46Q34 -40 30 -24Z" fill="#3b3a46" stroke="${SC_INK}" stroke-width="1.2"/>
 <path d="M-18 -46Q0 -52 18 -46L22 -82Q0 -92 -22 -82Z" fill="#3b3a46" stroke="${SC_INK}" stroke-width="1.2"/><path d="M-4 -90L0 -76L4 -90" stroke="#e8e0cc" stroke-width="2.4" fill="none"/>
 <ellipse cx="0" cy="-98" rx="10" ry="11" fill="#f0c9a2" stroke="${SC_INK}" stroke-width="1"/><path d="M-5 -99q2 -1.5 4 0M2 -99q2 -1.5 4 0" stroke="${SC_INK}" stroke-width="1"/>
 <path d="M-7 -92q7 14 14 0q-2 10 -7 12q-5 -2 -7 -12z" fill="#eeeeea" stroke="#b9b5ac" stroke-width=".6"/>
 <path d="M-11 -101Q-12 -118 0 -119Q12 -118 11 -101Q6 -107 0 -107Q-6 -107 -11 -101Z" fill="#1d1b19"/><path d="M-11 -106Q0 -112 11 -106" stroke="#55493f" stroke-width="1.2" fill="none"/>
 <path class="roi" style="transform-origin:16px -58px" d="M16 -58L46 -84" stroke="#8a6a3a" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="-58" r="3.6" fill="#f0c9a2"/></g>
 <rect x="-44" y="-40" width="40" height="16" fill="#6b3a22" stroke="${SC_INK}" stroke-width="1"/><path d="M-40 -24v8M-8 -24v8" stroke="#4a2a14" stroke-width="3"/>
 <rect x="-40" y="-46" width="16" height="6" fill="#f6efdc" stroke="#a8946a" stroke-width=".6"/><rect x="-20" y="-45" width="10" height="5" rx="1" fill="#2d2a28"/>
</g>`}
/* Chòi canh tre trên cột cao */
function scWatchtower(x,base,h,flag){return `<g filter="url(#dropS)">
 <path d="M${x-22} ${base}L${x-14} ${base-h}M${x+22} ${base}L${x+14} ${base-h}M${x-20} ${base-h*.35}L${x+18} ${base-h*.7}M${x+20} ${base-h*.35}L${x-18} ${base-h*.7}" stroke="#8a6a3a" stroke-width="5"/>
 <rect x="${x-24}" y="${base-h-4}" width="48" height="8" fill="#9a7a44" stroke="#5a3e1e" stroke-width="1"/>
 <path d="M${x-22} ${base-h-4}V${base-h-28}M${x+22} ${base-h-4}V${base-h-28}" stroke="#8a6a3a" stroke-width="3"/>
 <g stroke="#b8955a" stroke-width="1.6">${[0,1,2].map(k=>`<path d="M${x-22} ${base-h-8-k*5}H${x+22}"/>`).join('')}</g>
 <path d="M${x-32} ${base-h-26}L${x} ${base-h-48}L${x+32} ${base-h-26}Z" fill="url(#thatchG)" stroke="#6b4f22" stroke-width="1.4"/>
 ${flag?`<path d="M${x} ${base-h-48}V${base-h-84}" stroke="#5a3520" stroke-width="2.4"/><g class="bgflag" style="transform-origin:${x}px ${base-h-80}px"><path d="M${x} ${base-h-84}h32v22h-32z" fill="${flag}" stroke="${SC_INK}" stroke-width="1"/></g>`:''}
</g>`}
/* Đuốc lớn (đình liệu) ở cửa trường */
function scTorch(x,base){return `<g><path d="M${x} ${base}V${base-70}" stroke="#6b4423" stroke-width="6"/><path d="M${x-7} ${base-70}h14l-3 -10h-8z" fill="#5a3a20"/>
 <g class="flame" style="transform-origin:${x}px ${base-80}px"><path d="M${x} ${base-80}q-12 -10 -4 -24q2 8 6 8q-2 -10 6 -18q4 14 4 22q4 -4 2 -10q8 10 -2 22z" fill="#ff9a2f"/><path d="M${x} ${base-82}q-5 -6 -1 -12q3 4 4 2q3 6 -3 10z" fill="#ffe27a"/></g>
 <circle cx="${x}" cy="${base-90}" r="26" fill="#ffb347" opacity=".18"/></g>`}
/* Rào tre: kín (phên đan) và thưa (nứa) */
function scFenceKin(y,h,x1=0,x2=1200){let s=`<rect x="${x1}" y="${y-h}" width="${x2-x1}" height="${h}" fill="#c9a96a"/><g stroke="#a8864c" stroke-width="1.2" opacity=".8">`;
 for(let x=x1;x<x2;x+=8)s+=`<path d="M${x} ${y-h}l8 ${h}"/>`;for(let x=x1;x<x2;x+=8)s+=`<path d="M${x+8} ${y-h}l-8 ${h}"/>`;
 s+=`</g><g fill="#8a6a3a">${Array.from({length:Math.ceil((x2-x1)/60)},(_,i)=>`<rect x="${x1+i*60}" y="${y-h-8}" width="6" height="${h+8}"/>`).join('')}</g><path d="M${x1} ${y-h+4}H${x2}M${x1} ${y-6}H${x2}" stroke="#7a5a2e" stroke-width="3"/>`;
 return s;
}
function scFenceThua(pts){ // hàng rào nứa thưa nối các điểm trên mặt sân
 let s='<g stroke="#8a6a3a" stroke-linecap="round">';
 for(let i=0;i<pts.length-1;i++){const [x1,y1,h1]=pts[i],[x2,y2,h2]=pts[i+1];s+=`<path d="M${x1} ${y1-h1*.8}L${x2} ${y2-h2*.8}M${x1} ${y1-h1*.35}L${x2} ${y2-h2*.35}" stroke-width="2"/>`}
 pts.forEach(([x,y,h])=>{s+=`<path d="M${x} ${y}v${-h}" stroke-width="2.6"/>`});
 return s+'</g>';
}
/* Đại thần ngồi ghế có lọng che (thi Đình) */
function scParasolOfficial(x,y,flip){const f=flip?-1:1;return `<g transform="translate(${x} ${y})" filter="url(#dropS)">
 <path d="M0 0V-150" stroke="#6b4423" stroke-width="3"/>
 <g class="canopy2" style="transform-origin:0px -150px"><path d="M-46 -140Q0 -186 46 -140Z" fill="#e9c13a" stroke="${SC_INK}" stroke-width="1.6"/>${Array.from({length:8},(_,i)=>`<path d="M${-46+i*11.5} -140q5.75 10 11.5 0" fill="#d9a92a" stroke="${SC_INK}" stroke-width="1"/>`).join('')}</g>
 <rect x="-22" y="-44" width="44" height="8" fill="#7a4e2c"/><path d="M-20 -36v34M20 -36v34" stroke="#5a3a20" stroke-width="4"/><rect x="-22" y="-80" width="6" height="40" fill="#7a4e2c"/><rect x="16" y="-80" width="6" height="40" fill="#7a4e2c"/>
 <path d="M-16 -46Q-18 -78 0 -84Q18 -78 16 -46Q0 -40 -16 -46Z" fill="#2f5d8a" stroke="${SC_INK}" stroke-width="1.2"/><path d="M-16 -44q0 22 -6 40h44q-6 -18 -6 -40" fill="#2f5d8a" stroke="${SC_INK}" stroke-width="1.2"/>
 <path d="M-4 -84L0 -72L4 -84" stroke="#f2c75a" stroke-width="2" fill="none"/>
 <ellipse cx="0" cy="-94" rx="9" ry="10" fill="#f0c9a2" stroke="${SC_INK}" stroke-width="1"/>
 <path d="M-9 -100Q-9 -114 0 -115Q9 -114 9 -100Z" fill="#1d1b19"/><rect x="-11" y="-102" width="22" height="4" rx="2" fill="#1d1b19"/><ellipse cx="-15" cy="-104" rx="6" ry="2.2" fill="#1d1b19"/><ellipse cx="15" cy="-104" rx="6" ry="2.2" fill="#1d1b19"/>
</g>`}
/* Bàn để quyển thi, bút, nghiên (thi Đình) */
function scExamTable(x,y){return `<g transform="translate(${x} ${y})" filter="url(#dropS)"><rect x="-46" y="-30" width="92" height="10" fill="#8e2a1c" stroke="${SC_INK}" stroke-width="1"/><path d="M-40 -20v20M40 -20v20" stroke="#6b1f14" stroke-width="5"/>
 ${[-30,-18,-6].map(dx=>`<rect x="${dx}" y="-40" width="10" height="10" fill="#f6efdc" stroke="#a8946a" stroke-width=".6"/>`).join('')}<rect x="10" y="-37" width="14" height="7" rx="1.5" fill="#2d2a28"/><path d="M28 -32l12 -6" stroke="#6b4a2a" stroke-width="2"/></g>`}
function scCitadel(HZ){ // tường thành kinh đô xa xa (thi Hội ở kinh đô Thăng Long)
 return `<g opacity=".55"><rect x="0" y="${HZ-62}" width="1200" height="22" fill="#9c8a72"/><g fill="#9c8a72">${Array.from({length:60},(_,i)=>`<rect x="${i*20}" y="${HZ-70}" width="12" height="9"/>`).join('')}</g></g>`}

/* ----- Tiểu cảnh theo từng kỳ ----- */
function scStage0(HZ,rnd){ // Lớp thầy đồ
 let s=`<g stroke="#7a5a32" stroke-width="3">${Array.from({length:61},(_,i)=>`<path d="M${i*20} ${HZ+2}V${HZ-26-(i%3)*3}"/>`).join('')}</g><path d="M0 ${HZ-18}H1200M0 ${HZ-8}H1200" stroke="#9a7442" stroke-width="3"/>`;
 const x0=-30,w=300;
 let straw='';for(let i=0;i<70;i++){const x=x0+rnd()*w,y=165+rnd()*70;straw+=`<path d="M${x.toFixed(1)} ${y.toFixed(1)}l${(-3+rnd()*6).toFixed(1)} 12"/>`}
 s+=`<g filter="url(#dropS)">
  <rect x="${x0}" y="228" width="${w}" height="${HZ-228-2}" fill="#d9c29a"/>
  <g stroke="#b79b6e" stroke-width="1.2" opacity=".7">${Array.from({length:8},(_,i)=>`<path d="M${x0} ${236+i*10}h${w}"/>`).join('')}</g>
  <rect x="${x0+40}" y="238" width="190" height="${HZ-240}" fill="#4a3624"/>
  <path d="M${x0-40} 240Q${x0+20} 238 ${x0+40} 160H${x0+w-40}Q${x0+w-20} 238 ${x0+w+40} 240Q${x0+w/2} 252 ${x0-40} 240Z" fill="url(#thatchG)" stroke="#6b4f22" stroke-width="2"/>
  <g stroke="#7d5c26" stroke-width="1.3" opacity=".6" fill="none">${straw}</g>
  <path d="M${x0+36} 162H${x0+w-36}" stroke="#7a5a26" stroke-width="10" stroke-linecap="round"/>
  <path d="M${x0-40} 240Q${x0+w/2} 252 ${x0+w+40} 240" stroke="#a37a34" stroke-width="5" fill="none"/>
  ${[x0+40,x0+120,x0+200].map(px=>`<rect x="${px-4}" y="244" width="8" height="${HZ-246}" fill="#7a5a32"/>`).join('')}
 </g>${scTeacher(110,HZ)}`;
 s+=`<g filter="url(#dropS)"><path d="M262 ${HZ}q-16 -10 -12 -34q4 -12 22 -12q18 0 22 12q4 24 -12 34z" fill="#7a4a2a" stroke="${SC_INK}" stroke-width="1.4"/><ellipse cx="272" cy="${HZ-46}" rx="15" ry="4" fill="#3a2414"/></g>`;
 s+=scBambooClump(975,14,rnd);
 s+=`<g filter="url(#dropS)"><path d="M1040 ${HZ}Q1040 250 1090 244Q1140 250 1140 ${HZ}Z" fill="#e2bd5a" stroke="#9a7a2a" stroke-width="1.6"/><path d="M1090 244V214" stroke="#6b4a22" stroke-width="4"/>${Array.from({length:12},(_,i)=>`<path d="M${1050+i*8} ${HZ-4}q2 -30 ${i<6?6:-6} -52" stroke="#b8952e" stroke-width="1.2" fill="none"/>`).join('')}</g>`;
 return s+scCloud(1040,110,1.3,7)+scCloud(150,110,1.1,9);
}
function scStage1(HZ,rnd){ // Khảo hạch tại huyện đường
 const o={tile:['#6e3a28','#3a1c12'],pillar:'#5a3a24',wall:'#2a1710',trim:'#b8955a',platform:'#9a937f',curl:30,up:12,cols:5};
 let s=`<rect x="0" y="${HZ-44}" width="1200" height="44" fill="#b8a582"/><g stroke="#9a8664" stroke-width="1" opacity=".7">${Array.from({length:5},(_,i)=>`<path d="M0 ${HZ-40+i*8}H1200"/>`).join('')}${Array.from({length:80},(_,i)=>`<path d="M${i*15+(i%2)*7} ${HZ-44}v44"/>`).join('')}</g><rect x="0" y="${HZ-50}" width="1200" height="8" fill="#5a3a24"/>`;
 s+=scHall(-60,330,o,HZ)+scHall(930,330,{...o,idk:'b'},HZ);
 const tones=['#2f5236','#3b6442','#4a7a4e','#5b8d58'];
 s+=scBigTree(30,false,rnd,tones)+scBigTree(1170,true,rnd,tones);
 return s+scCloud(1080,90,1.2,8)+scCloud(120,100,1,9)+scGuardPair(HZ-6);
}
function scExamField(HZ,rnd,big){ // trường thi tre nứa (thi Hương / thi Hội)
 let s='';
 if(big)s+=scCitadel(HZ);
 s+=scBambooClump(-10,6,rnd,HZ-30,160,90)+scBambooClump(1110,6,rnd,HZ-30,160,90);
 s+=scFenceKin(HZ,big?50:42);
 s+=scWatchtower(36,HZ,big?120:105,big?'#e9c13a':'#d9a441')+scWatchtower(1164,HZ,big?120:105,big?'#e9c13a':'#d9a441');
 s+=scTorch(78,HZ-4)+scTorch(1122,HZ-4);
 return s+scCloud(1040,100,1.3,7)+scCloud(150,120,1.1,9)+scGuardPair(HZ-6);
}
function scStage4(HZ,rnd){ // Thi Đình – sân rồng điện Kính Thiên
 const o={tile:['#f6d66e','#c9961e'],tileLine:'#8a5a10',ridge:'#2f8a5a',eave:'#2f8a5a',eaveW:4,pillar:'#a8322a',wall:'#3a1a12',doorFill:'#8e2a1c',trim:'#e9c13a',double:true,dragonHeads:'#e9c13a',platform:'#cfc6b2',platformH:22,curl:52,up:30,top:214,cols:6};
 let s=scHall(-120,1440,o,HZ-8);
 // thềm bậc đá chạm rồng chính giữa
 s+=`<g filter="url(#dropS)"><path d="M520 ${HZ-16}H680L700 ${HZ+20}H500Z" fill="#d8d0bd"/>${[0,1,2,3,4].map(k=>`<path d="M${520-k*4} ${HZ-16+k*7}H${680+k*4}" stroke="#a89f8a" stroke-width="1.4"/>`).join('')}
  ${[-1,1].map(d=>{const x=600+d*92;return `<path d="M${x} ${HZ-22}q${d*8} 10 ${d*2} 18q${-d*8} 8 ${d*2} 18q${d*8} 6 ${d*4} 10" stroke="#bdb39c" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M${x} ${HZ-22}q${d*8} 10 ${d*2} 18q${-d*8} 8 ${d*2} 18q${d*8} 6 ${d*4} 10" stroke="#e6dfcf" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="${x}" cy="${HZ-24}" r="6" fill="#d8d0bd" stroke="#a89f8a"/>`}).join('')}</g>`;
 // lan can quanh sân
 s+=`<g fill="#cfc6b2" stroke="#9a917c" stroke-width="1"><rect x="0" y="${HZ+16}" width="470" height="6"/><rect x="730" y="${HZ+16}" width="470" height="6"/>${Array.from({length:24},(_,i)=>{const x=i<12?10+i*38:740+(i-12)*38;return `<rect x="${x}" y="${HZ+6}" width="6" height="16"/>`}).join('')}</g>`;
 // quân lính cầm cờ theo nghi thức
 s+=scExamTable(320,HZ+40)+scExamTable(880,HZ+40);
 s+=scParasolOfficial(46,HZ+72)+scParasolOfficial(1154,HZ+72,true);
 return s+scCloud(1080,70,1.1,8,'#c98a1a','#fff6d8')+scCloud(130,80,1,9,'#c98a1a','#fff6d8')+scGuardPair(HZ-6);
}

function sceneMarkup(stage){
 stage=Math.max(0,Math.min(4,stage|0));
 const T=SCENE_THEMES[stage],HZ=318,rnd=scRng(stage*97+11);
 let s=`<defs>
  <linearGradient id="skyG" x2="0" y2="1"><stop stop-color="${T.sky[0]}"/><stop offset=".62" stop-color="${T.sky[1]}"/></linearGradient>
  <radialGradient id="sunG"><stop stop-color="#fff8de" stop-opacity=".95"/><stop offset="1" stop-color="#fff8de" stop-opacity="0"/></radialGradient>
  <linearGradient id="groundG" x2="0" y2="1"><stop stop-color="${T.ground[0]}"/><stop offset="1" stop-color="${T.ground[1]}"/></linearGradient>
  <linearGradient id="thatchG" x2="0" y2="1"><stop stop-color="#d8b46a"/><stop offset="1" stop-color="#9a7434"/></linearGradient>
  <radialGradient id="vignetteG" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#2a1608" stop-opacity="0"/><stop offset="1" stop-color="#2a1608" stop-opacity=".4"/></radialGradient>
  <filter id="softBlur"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="stoneTex" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".035 .09" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .3  0 0 0 0 .22  1.3 0 0 0 -.55"/></filter>
  ${scGuardDefs()}
  <filter id="dropS" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#2b1709" flood-opacity=".3"/></filter>
 </defs>
 <rect width="1200" height="675" fill="url(#skyG)"/>
 <circle cx="600" cy="250" r="190" fill="url(#sunG)"/>
 <g fill="#fff" opacity=".5" filter="url(#softBlur)"><ellipse cx="250" cy="95" rx="120" ry="22"/><ellipse cx="930" cy="70" rx="150" ry="24"/></g>
 <path d="M0 262 Q90 205 190 240 T390 228 T600 238 T820 222 T1010 236 T1200 214 V330 H0Z" fill="${T.hill[0]}" opacity=".75"/>
 <path d="M0 286 Q120 246 250 272 T520 266 T800 262 T1050 270 T1200 256 V330 H0Z" fill="${T.hill[1]}" opacity=".85"/>`;
 s+=stage===0?scStage0(HZ,rnd):stage===1?scStage1(HZ,rnd):stage===4?scStage4(HZ,rnd):scExamField(HZ,rnd,stage===3);
 s+=`<rect x="0" y="${HZ}" width="1200" height="${675-HZ}" fill="url(#groundG)"/>`;
 if(stage===0){ // sân đất làng, gà mổ thóc
  for(let i=0;i<40;i++){const x=rnd()*1200,y=HZ+20+rnd()*(675-HZ-20);s+=`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(2+rnd()*3).toFixed(1)}" ry="1.6" fill="#8f7350" opacity=".5"/>`}
  s+=scChicken(40,HZ+34,false,0)+scChicken(1160,HZ+44,true,.7);
 }else if(stage===1){ // sân gạch huyện đường
  s+=scPaving(HZ,T.line,22,60,.45);
 }else if(stage===2||stage===3){ // ruộng đã gặt / bãi đất trống, lối đi chữ thập, rào nứa thưa ngăn vi
  if(stage===2)for(let r=0;r<16;r++){const y=HZ+12+(675-HZ)*Math.pow(r/16,1.5);for(let k=0;k<40;k++){const xb=-300+k*48,x=scPersp(HZ,xb,y);if(x<-10||x>1210)continue;const hh=2+r*.35;s+=`<path d="M${x.toFixed(1)} ${y.toFixed(1)}v${(-hh).toFixed(1)}M${(x+2).toFixed(1)} ${y.toFixed(1)}l1 ${(-hh).toFixed(1)}" stroke="#d9b86a" stroke-width="1.2" opacity=".7"/>`}}
  else for(let i=0;i<50;i++){const x=rnd()*1200,y=HZ+20+rnd()*(675-HZ-20);s+=`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(2+rnd()*3).toFixed(1)}" ry="1.4" fill="#7f6644" opacity=".45"/>`}
  const yH=HZ+(675-HZ)*.42;
  s+=`<path d="M560 ${HZ} H640 L760 675 H440Z" fill="#dcc79c" opacity=".8"/><path d="M0 ${yH-10}H1200V${yH+16}H0Z" fill="#dcc79c" opacity=".7"/>`;
  const fl=[];for(let k=0;k<9;k++){const y=HZ+8+k*((yH-HZ-8)/8),x=scPersp(HZ,430,y);fl.push([x,y,10+k*1.6])}
  const fr=fl.map(([x,y,h])=>[1200-x,y,h]);
  s+=scFenceThua(fl)+scFenceThua(fr)+scFenceThua([[0,yH-12,16],[150,yH-12,16],[300,yH-12,16],[scPersp(HZ,430,yH-12),yH-12,16]])+scFenceThua([[1200-scPersp(HZ,430,yH-12),yH-12,16],[900,yH-12,16],[1050,yH-12,16],[1200,yH-12,16]]);
 }else{ // sân rồng lát gạch
  s+=scPaving(HZ+20,T.line,10,150,.5);
 }
 s+=`<rect x="0" y="${HZ}" width="1200" height="${675-HZ}" filter="url(#stoneTex)" opacity=".3"/>
  <rect x="0" y="${HZ}" width="1200" height="10" fill="#6d4a2c" opacity=".16"/>
  <rect width="1200" height="675" fill="url(#vignetteG)"/>`;
 return s;
}

/* ---------- Sĩ tử trong lều chõng ---------- */
const ROBES=['#2f5d8a','#8a2f2a','#356b4c','#6b3f7a','#9a6a1f','#2d6a73','#7a4a2c','#4a4f8c'];
function hashName(t){let h=0;for(const c of String(t))h=(h*31+c.codePointAt(0))>>>0;return h}

const CROWD_DEFS=`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
 <pattern id="weave" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
  <rect width="4" height="4" fill="#c99d5e"/>
  <rect width="2" height="2" fill="#dcb878"/><rect x="2" y="2" width="2" height="2" fill="#dcb878"/>
  <path d="M0 2h4M2 0v4" stroke="#a97e43" stroke-width=".35"/>
 </pattern>
 <linearGradient id="hoodShade" x2="1"><stop stop-color="#3b220e" stop-opacity=".45"/><stop offset=".3" stop-color="#3b220e" stop-opacity="0"/><stop offset=".7" stop-color="#3b220e" stop-opacity="0"/><stop offset="1" stop-color="#3b220e" stop-opacity=".5"/></linearGradient>
 <linearGradient id="hoodTop" x2="0" y2="1"><stop stop-color="#fff2c8" stop-opacity=".35"/><stop offset=".5" stop-color="#fff2c8" stop-opacity="0"/></linearGradient>
 <pattern id="chieu" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#e3cf98"/><path d="M0 1.5h6M0 4.5h6" stroke="#cdb57a" stroke-width=".8"/><path d="M3 0v6" stroke="#b8362a" stroke-width=".5" opacity=".45"/></pattern>
 <linearGradient id="bamboo" x2="0" y2="1"><stop stop-color="#e8c96a"/><stop offset=".5" stop-color="#c9a24a"/><stop offset="1" stop-color="#8f6d2a"/></linearGradient>
</defs></svg>`;

function boothSVG(robe,kind='cot'){
 const HOOD='M6 93V50Q6 9 50 9Q94 9 94 50V93H83V52Q83 21 50 21Q17 21 17 52V93Z';
 const mat=`<path d="M8 99L18 84H82L92 99Z" fill="url(#chieu)" stroke="#9a7a3e" stroke-width=".8"/>`;
 if(kind==='mat')return `<svg viewBox="0 30 100 70" class="booth-svg" aria-hidden="true">
  <ellipse cx="50" cy="97" rx="44" ry="3.5" fill="#2a1a0c" opacity=".22"/>${mat}
  <g class="writer">
   <path d="M28 93Q28 66 50 62Q72 66 72 93Z" fill="${robe}" stroke="#2a1a10" stroke-width=".8"/>
   <path d="M36 74Q38 86 37 93M64 74Q62 86 63 93" stroke="#000" stroke-width=".8" opacity=".3" fill="none"/>
   <path d="M42 63L50 76L58 63" fill="#f4e2bd" stroke="#2a1a10" stroke-width=".7"/>
   <path d="M44 63L50 72L56 63" fill="${robe}" opacity=".9"/>
   <path d="M44.5 61h11v3.5h-11z" fill="#e9bf98"/>
   <ellipse cx="40.6" cy="51.5" rx="1.8" ry="2.6" fill="#e2b38c"/><ellipse cx="59.4" cy="51.5" rx="1.8" ry="2.6" fill="#e2b38c"/>
   <ellipse cx="50" cy="51" rx="9.4" ry="10.2" fill="#f0c9a2" stroke="#6b4630" stroke-width=".6"/>
   <path d="M45 49.2q2 -1.2 4 0M51 49.2q2 -1.2 4 0" stroke="#2a1a10" stroke-width=".7" fill="none" stroke-linecap="round"/>
   <path d="M45.2 52.6q1.8 1.3 3.6 0M51.2 52.6q1.8 1.3 3.6 0" stroke="#2a1a10" stroke-width=".9" fill="none" stroke-linecap="round"/>
   <path d="M50 53.5q.9 1.6 -.4 2.4" stroke="#a8765a" stroke-width=".6" fill="none"/>
   <path d="M47.6 57.4q2.4 1.6 4.8 0" stroke="#a5483a" stroke-width=".9" fill="none" stroke-linecap="round"/>
   <circle cx="45" cy="55.5" r="1.6" fill="#e99a8a" opacity=".45"/><circle cx="55" cy="55.5" r="1.6" fill="#e99a8a" opacity=".45"/>
   <path d="M39.6 49.5Q39 37 50 36.6Q61 37 60.4 49.5Q50 45 39.6 49.5Z" fill="#1d1b19"/>
   <path d="M40 47.6Q50 43.4 60 47.6M40.6 44.8Q50 40.6 59.4 44.8M42 42Q50 38.4 58 42" stroke="#4d453d" stroke-width=".8" fill="none"/>
   <path d="M39.6 49.2Q50 44.8 60.4 49.2" stroke="#0e0d0c" stroke-width="1.4" fill="none"/>
   <path d="M34 80Q40 74 46 76" stroke="${robe}" stroke-width="6" stroke-linecap="round" fill="none"/>
   <path d="M66 80Q60 73 56 72" stroke="${robe}" stroke-width="6" stroke-linecap="round" fill="none"/>
   <circle cx="47" cy="76.4" r="2.3" fill="#f0c9a2" stroke="#6b4630" stroke-width=".5"/>
   <circle cx="55.4" cy="71.6" r="2.3" fill="#f0c9a2" stroke="#6b4630" stroke-width=".5"/>
  </g>
  <rect x="21" y="76" width="58" height="6" rx="1.2" fill="#8b5e34" stroke="#5a3a1e" stroke-width=".6"/>
  <path d="M21 77.2h58" stroke="#b48354" stroke-width=".8"/>
  <g transform="rotate(-4 45 74)"><rect x="34" y="71.6" width="22" height="5.6" fill="#fbf3dc" stroke="#cdb98e" stroke-width=".4"/><path d="M37 73v3M40 73v3M43 73v2.4M46 73v3" stroke="#3a2a20" stroke-width=".5"/></g>
  <rect x="64" y="72.5" width="8" height="4" rx="1" fill="#2d2a28"/><ellipse cx="68" cy="73.6" rx="2.6" ry="1" fill="#111"/>
  <path d="M55.8 71.6L58.6 63.8" stroke="#6b4a2a" stroke-width="1.1" stroke-linecap="round"/><path d="M55.8 71.6l-.8 2.2" stroke="#111" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M24 82v10M76 82v10" stroke="#5a3a1e" stroke-width="3"/>
 </svg>`;
 const cloth=kind==='vai';
 return `<svg viewBox="0 0 100 100" class="booth-svg" aria-hidden="true">
  <ellipse cx="50" cy="96" rx="47" ry="4.5" fill="#2a1a0c" opacity=".28"/>
  <path d="M17 93V52Q17 21 50 21Q83 21 83 52V93Z" fill="#3a2414"/>
  <path d="M17 93V52Q17 21 50 21Q83 21 83 52V60Q50 42 17 60Z" fill="#24150b" opacity=".6"/>
  ${cloth?mat:''}
  <g class="writer">
   <path d="M28 93Q28 66 50 62Q72 66 72 93Z" fill="${robe}" stroke="#2a1a10" stroke-width=".8"/>
   <path d="M36 74Q38 86 37 93M64 74Q62 86 63 93" stroke="#000" stroke-width=".8" opacity=".3" fill="none"/>
   <path d="M42 63L50 76L58 63" fill="#f4e2bd" stroke="#2a1a10" stroke-width=".7"/>
   <path d="M44 63L50 72L56 63" fill="${robe}" opacity=".9"/>
   <path d="M44.5 61h11v3.5h-11z" fill="#e9bf98"/>
   <ellipse cx="40.6" cy="51.5" rx="1.8" ry="2.6" fill="#e2b38c"/><ellipse cx="59.4" cy="51.5" rx="1.8" ry="2.6" fill="#e2b38c"/>
   <ellipse cx="50" cy="51" rx="9.4" ry="10.2" fill="#f0c9a2" stroke="#6b4630" stroke-width=".6"/>
   <path d="M45 49.2q2 -1.2 4 0M51 49.2q2 -1.2 4 0" stroke="#2a1a10" stroke-width=".7" fill="none" stroke-linecap="round"/>
   <path d="M45.2 52.6q1.8 1.3 3.6 0M51.2 52.6q1.8 1.3 3.6 0" stroke="#2a1a10" stroke-width=".9" fill="none" stroke-linecap="round"/>
   <path d="M50 53.5q.9 1.6 -.4 2.4" stroke="#a8765a" stroke-width=".6" fill="none"/>
   <path d="M47.6 57.4q2.4 1.6 4.8 0" stroke="#a5483a" stroke-width=".9" fill="none" stroke-linecap="round"/>
   <circle cx="45" cy="55.5" r="1.6" fill="#e99a8a" opacity=".45"/><circle cx="55" cy="55.5" r="1.6" fill="#e99a8a" opacity=".45"/>
   <path d="M39.6 49.5Q39 37 50 36.6Q61 37 60.4 49.5Q50 45 39.6 49.5Z" fill="#1d1b19"/>
   <path d="M40 47.6Q50 43.4 60 47.6M40.6 44.8Q50 40.6 59.4 44.8M42 42Q50 38.4 58 42" stroke="#4d453d" stroke-width=".8" fill="none"/>
   <path d="M39.6 49.2Q50 44.8 60.4 49.2" stroke="#0e0d0c" stroke-width="1.4" fill="none"/>
   <path d="M34 80Q40 74 46 76" stroke="${robe}" stroke-width="6" stroke-linecap="round" fill="none"/>
   <path d="M66 80Q60 73 56 72" stroke="${robe}" stroke-width="6" stroke-linecap="round" fill="none"/>
   <circle cx="47" cy="76.4" r="2.3" fill="#f0c9a2" stroke="#6b4630" stroke-width=".5"/>
   <circle cx="55.4" cy="71.6" r="2.3" fill="#f0c9a2" stroke="#6b4630" stroke-width=".5"/>
  </g>
  <rect x="21" y="76" width="58" height="6" rx="1.2" fill="#8b5e34" stroke="#5a3a1e" stroke-width=".6"/>
  <path d="M21 77.2h58" stroke="#b48354" stroke-width=".8"/>
  <g transform="rotate(-4 45 74)"><rect x="34" y="71.6" width="22" height="5.6" fill="#fbf3dc" stroke="#cdb98e" stroke-width=".4"/><path d="M37 73v3M40 73v3M43 73v2.4M46 73v3" stroke="#3a2a20" stroke-width=".5"/></g>
  <rect x="64" y="72.5" width="8" height="4" rx="1" fill="#2d2a28"/><ellipse cx="68" cy="73.6" rx="2.6" ry="1" fill="#111"/>
  <path d="M55.8 71.6L58.6 63.8" stroke="#6b4a2a" stroke-width="1.1" stroke-linecap="round"/><path d="M55.8 71.6l-.8 2.2" stroke="#111" stroke-width="1.4" stroke-linecap="round"/>
  ${cloth?`<path d="${HOOD}" fill="#efe6d2" stroke="#8a6a3a" stroke-width="1.3"/><path d="${HOOD}" fill="url(#hoodShade)"/>
  <path d="M6.5 92V50Q6.5 9.5 50 9.5Q93.5 9.5 93.5 50V92" stroke="#8a6230" stroke-width="2.4" fill="none"/>
  <path d="M28 14Q24 40 22 92M72 14Q76 40 78 92M50 9V21" stroke="#c9b48a" stroke-width="1" fill="none"/>
  <path d="M17.5 92V52Q17.5 21.5 50 21.5Q82.5 21.5 82.5 52V92" stroke="#8a6230" stroke-width="1.6" fill="none"/>`
  :`  <path d="${HOOD}" fill="url(#weave)" stroke="#7d5628" stroke-width="1.3"/>
  <path d="${HOOD}" fill="url(#hoodShade)"/>
  <path d="${HOOD}" fill="url(#hoodTop)"/>
  <path d="M6.5 92V50Q6.5 9.5 50 9.5Q93.5 9.5 93.5 50V92" stroke="#8a6230" stroke-width="2.6" fill="none"/>
  <path d="M6.5 92V50Q6.5 9.5 50 9.5Q93.5 9.5 93.5 50V92" stroke="#efd59a" stroke-width="1.1" fill="none"/>
  <path d="M17.5 92V52Q17.5 21.5 50 21.5Q82.5 21.5 82.5 52V92" stroke="#8a6230" stroke-width="1.6" fill="none"/>
  <path d="M28 14.5Q50 4 72 14.5" stroke="#7a2418" stroke-width="2.2" fill="none"/><circle cx="50" cy="9.6" r="2.2" fill="#c0392b" stroke="#5a1a10" stroke-width=".5"/>
  <rect x="2" y="88" width="96" height="5.5" rx="2.7" fill="url(#bamboo)"/>
  <rect x="5" y="93" width="90" height="4.5" rx="2.2" fill="url(#bamboo)"/>
  <path d="M22 88v5.5M50 88v5.5M78 88v5.5M36 93v4.5M64 93v4.5" stroke="#7a5a20" stroke-width="1"/>
`}
 </svg>`;
}
/* Xếp sĩ tử thành các dãy lều phối cảnh (dãy trước to, dãy sau nhỏ dần). */
function layoutCrowd(n,cap=1){
 if(!n)return [];
 let best=null;
 for(let R=1;R<=Math.min(6,n);R++){const L=layoutRows(n,R,cap);if(!best||L.minW>best.minW*1.03)best=L}
 return best.out;
}
function layoutRows(n,R,cap=1){
 const sc=Array.from({length:R},(_,k)=>1-0.1*k);
 const wts=sc.map(s=>1/s),sum=wts.reduce((a,b)=>a+b,0);
 const counts=wts.map(w=>Math.max(1,Math.round(n*w/sum)));
 let diff=n-counts.reduce((a,b)=>a+b,0);
 for(let k=R-1;diff!==0;k=(k-1+R)%R){if(diff>0){counts[k]++;diff--}else if(counts[k]>1){counts[k]--;diff++}}
 const AR=1200/(675*0.55); // tỷ lệ rộng/cao của lớp sĩ tử
 const BH=1.3, GAP=1.14;
 let f=1,ws,bots;
 for(let it=0;it<60;it++){
  ws=counts.map((c,k)=>Math.min(16*sc[k],96/(c*GAP))*f);
  bots=[];let b=1;
  for(let k=0;k<R;k++){bots.push(b);b+=ws[k]*BH*AR*0.8}
  const top=bots[R-1]+ws[R-1]*BH*AR;
  if(top<=99*cap)break;f*=0.96;
 }
 const out=[];
 for(let k=0;k<R;k++){
  const c=counts[k],w=ws[k],span=c*w*GAP,shift=(k%2&&span+w*GAP<=98)?w*GAP*0.5*(k%4===1?1:-1):0;
  for(let j=0;j<c;j++){
   const cx=50+(j-(c-1)/2)*w*GAP+shift;
   out.push({left:cx-w/2,bottom:bots[k],w,z:100-k*10});
  }
 }
 return {out,minW:Math.min(...ws)};
}

const SEEN_CANDIDATES=new Set();
function crowdMarkup(cands,highlights={},stage=2,cap=1){
 const kind=stage<=1?'mat':stage===4?'vai':'cot';
 const pos=layoutCrowd(cands.length,cap);
 return CROWD_DEFS+cands.map((c,i)=>{
  const P=pos[i],name=String(c.name||'Sĩ tử');
  const fs=Math.min(1,15/Math.max(10,[...name].length));
  const hl=highlights[name];
  const robe=ROBES[hashName(name)%ROBES.length];
  const fresh=!SEEN_CANDIDATES.has(name);SEEN_CANDIDATES.add(name);
  return `<div class="booth${fresh?' fresh':''}${hl?' top'+hl:''}" style="left:${P.left.toFixed(2)}%;bottom:${P.bottom.toFixed(2)}%;width:${P.w.toFixed(2)}%;z-index:${P.z};--w:${P.w.toFixed(2)};--fs:${fs.toFixed(2)};--d:${(i%9)*0.35}s">
   <div class="nametag" title="${escapeHtml(name)}">${hl?['','🥇','🥈','🥉'][hl]+' ':''}${escapeHtml(name)}</div>
   ${boothSVG(robe,kind)}
  </div>`;
 }).join('');
}

/* ===== "Biển sĩ tử": phòng đông (tới 6.000 người) không thể vẽ ai cũng có tên.
   Sân trước: tối đa 60 nhân vật có tên. Phía sau: mỗi người còn lại là một bóng người nhỏ đội khăn, xếp phối cảnh xa dần.
   Vẽ tối đa SEA_MAX bóng; quá số đó thì 1 bóng = k người (ghi rõ trên màn). Hạt giống cố định → không nhấp nháy khi vẽ lại. */
const SEA_MAX=1500;
function seaPlan(others){if(others<=0)return {figs:0,per:1};const per=Math.ceil(others/SEA_MAX);return {figs:Math.ceil(others/per),per}}
function drawCrowdSea(cv,figs,band=0.36){
 const W=cv.clientWidth|0,H=cv.clientHeight|0;if(!W||!H)return;const dpr=Math.min(2,window.devicePixelRatio||1);
 if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}
 const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);if(!figs)return;
 let seed=20261125;const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
 const yTop=H*0.02,yBot=H*band;
 // tìm cỡ bóng để vừa đủ số bóng trong dải (hàng xa nhỏ hơn hàng gần 45%)
 let s=W/60,rows;
 for(let it=0;it<80;it++){rows=[];let y=yTop+s*0.55,cap=0;
  while(y<yBot){const t=(y-yTop)/(yBot-yTop),sz=s*(0.55+0.45*t),n=Math.floor(W*0.98/(sz*0.82));rows.push({y,sz,n});cap+=n;y+=sz*0.5}
  if(cap>=figs&&it>0)break;if(cap<figs)s*=0.94;else break}
 let cap=rows.reduce((a,r)=>a+r.n,0),left=figs;
 // lấp từ hàng gần (dưới) lên hàng xa; mật độ đều trong mỗi hàng
 const fill=rows.map(r=>0);for(let k=rows.length-1;k>=0&&left>0;k--){const take=Math.min(rows[k].n,Math.ceil(left*rows[k].n/cap));fill[k]=take;left-=take;cap-=rows[k].n}
 const robes=['#2f5d8a','#7b2d26','#2e6b4f','#8a6a2a','#5a3d6e','#3b4f5e','#7a4a2a','#24524a'];
 for(let k=0;k<rows.length;k++){const r=rows[k],n=fill[k];if(!n)continue;const step=W*0.98/n;
  const shade=0.55+0.45*((r.y-yTop)/(yBot-yTop));
  for(let j=0;j<n;j++){const x=W*0.01+step*(j+0.5)+(rnd()-.5)*step*0.35,y=r.y+(rnd()-.5)*r.sz*0.12,sz=r.sz*(0.92+rnd()*0.16);
   g.globalAlpha=shade;
   g.fillStyle=robes[(rnd()*robes.length)|0];g.beginPath();g.moveTo(x-sz*0.3,y+sz*0.62);g.quadraticCurveTo(x-sz*0.26,y+sz*0.12,x,y+sz*0.1);g.quadraticCurveTo(x+sz*0.26,y+sz*0.12,x+sz*0.3,y+sz*0.62);g.closePath();g.fill();
   g.fillStyle='#e9c39b';g.beginPath();g.arc(x,y,sz*0.15,0,Math.PI*2);g.fill();
   g.fillStyle='#1d1612';g.beginPath();g.ellipse(x,y-sz*0.08,sz*0.17,sz*0.1,0,Math.PI,0);g.fill();g.fillRect(x-sz*0.17,y-sz*0.09,sz*0.34,sz*0.04)}}
 g.globalAlpha=1}
