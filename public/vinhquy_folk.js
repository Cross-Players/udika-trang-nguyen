'use strict';
/* ===== V9 – Hoạt cảnh rước Trạng nguyên: tạo hình vẽ lại theo tranh Đông Hồ "Vinh quy bái tổ" =====
   • Mỗi nhân vật được vẽ ở khổ lớn (người cao 300 đơn vị ≈ 6,5 đầu; ngựa vai 205) rồi mới thu nhỏ vào cảnh.
   • Tạo hình dân gian: áo ngắn viền hoa văn, quần ống túm phồng, xà cạp, giày vải; mặt trái xoan, mắt hạnh, má hồng.
   • Cắt lớp như rối: đùi – cẳng – bàn chân, thân – tay – đầu – mũ – đạo cụ; ngựa: thân – cổ – đầu – đuôi – 4 chân 2 đốt.
   • Chuyển động bằng động học ngược (IK): bàn chân đặt cố định trên đất khi chạm → không trượt; gối/khuỷu tự gập.
   • Đoàn đi sang trái như tranh gốc (nhóm đoàn được lật gương, chữ lật lại cho đọc đúng). */
const FK={ink:'#211510',red:'#bd3328',red2:'#8a2119',yel:'#eab84a',yel2:'#bf8a22',grn:'#2e7a4f',grn2:'#1d5435',pink:'#e4a0b2',pink2:'#b5677d',
 grey:'#a6a39a',grey2:'#77746c',cream:'#f5ecd5',skin:'#f7dbc0',skin2:'#e0b089',black:'#1d1612',horse:'#b8382b',horse2:'#7e2219',horse3:'#d9584a',
 gold:'#e6b84c',white:'#faf5e8',nau:'#8a5a36',nau2:'#5e3c22',cham:'#38578a',cham2:'#233c66',tia:'#7a4d6e',tia2:'#55344c',mane:'#2a1a14'};
const FKF="'Udika Serif','Noto Serif','Times New Roman',serif";
let FK_REG=[];
const f1=n=>(+n).toFixed(1);
const PT=(d,fill,sw=1.6,extra='')=>`<path d="${d}" fill="${fill}" stroke="${FK.ink}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`;
const LN=(d,c=FK.ink,w=1,extra='')=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const PART=(name,inner,extra='')=>`<g data-p="${name}" ${extra}>${inner}</g>`;
const fkText=(x,y,t,size,fill,mir,extra='')=>`<g transform="translate(${x} ${y})${mir?' scale(-1 1)':''}"><text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-family="${FKF}" font-weight="800" font-size="${size}" fill="${fill}" ${extra}>${t}</text></g>`;
const TRIM=(d,c,dot,w=5)=>`<path d="${d}" stroke="${FK.ink}" stroke-width="${w+1.6}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${dot}" stroke-width="1.7" fill="none" stroke-dasharray="0.1 4" stroke-linecap="round"/>`;
/* đoạn tay/chân thuôn có bo tròn giữa 2 điểm */
function limb(x1,y1,x2,y2,w1,w2,fill,sw=1.5){const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,a=w1/2,b=w2/2;
 const p=(x,y)=>f1(x)+' '+f1(y);
 return PT(`M${p(x1+nx*a,y1+ny*a)}L${p(x2+nx*b,y2+ny*b)}A${f1(b)} ${f1(b)} 0 0 1 ${p(x2-nx*b,y2-ny*b)}L${p(x1-nx*a,y1-ny*a)}A${f1(a)} ${f1(a)} 0 0 1 ${p(x1+nx*a,y1+ny*a)}Z`,fill,sw)}
/* tay áo rộng: hẹp ở khuỷu, loe ở cổ tay, có nếp */
function sleeve(x1,y1,x2,y2,w1,w2,fill,fold,cuff){const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,ux=dx/L,uy=dy/L,a=w1/2,b=w2/2,p=(x,y)=>f1(x)+' '+f1(y);
 const c1=[x2+nx*b,y2+ny*b],c2=[x2-nx*b,y2-ny*b];
 return PT(`M${p(x1+nx*a,y1+ny*a)}Q${p(x1+dx*.55+nx*(b+3),y1+dy*.55+ny*(b+3))} ${p(...c1)}Q${p(x2+ux*3,y2+uy*3)} ${p(...c2)}Q${p(x1+dx*.5-nx*(a+1),y1+dy*.5-ny*(a+1))} ${p(x1-nx*a,y1-ny*a)}A${f1(a)} ${f1(a)} 0 0 1 ${p(x1+nx*a,y1+ny*a)}Z`,fill,1.5)
  +LN(`M${p(x1+dx*.35+nx*a*.3,y1+dy*.35+ny*a*.3)}Q${p(x1+dx*.6,y1+dy*.6)} ${p(x2-ux*4+nx*b*.2,y2-uy*4+ny*b*.2)}`,fold,1)
  +(cuff?`<path d="M${p(...c1)}Q${p(x2+ux*3,y2+uy*3)} ${p(...c2)}" stroke="${FK.ink}" stroke-width="6.4" fill="none" stroke-linecap="round"/><path d="M${p(...c1)}Q${p(x2+ux*3,y2+uy*3)} ${p(...c2)}" stroke="${cuff}" stroke-width="4.6" fill="none" stroke-linecap="round"/>`:'')}
/* nắm tay ôm cán dọc tại (x,y) (cán đi qua tâm) */
const fistV=(x,y,flip)=>`<rect x="${f1(x-6.5)}" y="${f1(y-7)}" width="13" height="14" rx="5.5" fill="${FK.skin}" stroke="${FK.ink}" stroke-width="1.3"/>${LN(`M${f1(x-1)} ${f1(y-3.4)}h6.5M${f1(x-1)} ${f1(y+.2)}h6.5M${f1(x-1)} ${f1(y+3.6)}h6`,FK.skin2,1)}${LN(`M${f1(x-6)} ${f1(y-4)}q${flip?-4:4} -3 ${flip?-1:7} -4`,FK.ink,1)}`;
const fistAt=(x,y,r=6.5)=>`<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${FK.skin}" stroke="${FK.ink}" stroke-width="1.3"/>${LN(`M${f1(x-2)} ${f1(y-2)}q3 1 4 4`,FK.skin2,1)}`;

/* ---------- ĐẦU (gốc = chân cổ; mặt nghiêng 3/4 sang phải) ---------- */
function headArt(hat,o={}){const I=FK.ink;
 const face=`${PT('M-13 -30C-16 -45 -3 -53 9 -51C21 -49 27 -39 26 -27C26 -19 24 -12 21 -8C17 -2 9 1.5 2.5 1C-5.5 .5 -11.5 -5 -13.5 -13C-15 -19 -15 -25 -13 -30Z',FK.skin,1.7)}
  ${PT('M-14.5 -24C-17 -24 -18 -18 -16 -15C-14.5 -13 -12.5 -14 -12 -16Z',FK.skin,1.3)}${LN('M-15.6 -21q1.6 1 1.2 3.6',FK.skin2,1)}
  ${PART('eye',`${LN('M3.6 -25.6Q8 -29.4 12.6 -26.2',I,1.7)}${PT('M5 -26.4Q8 -28.4 11.6 -26.6Q8.4 -24.4 5 -26.4Z',I,.5)}<circle cx="8.9" cy="-27" r=".9" fill="#fff"/>${LN('M16.6 -26.2Q19.4 -28.6 22.2 -26.4',I,1.5)}${PT('M17.4 -26.6Q19.6 -27.9 21.7 -26.6Q19.8 -25.1 17.4 -26.6Z',I,.5)}`,`data-cx="12" data-cy="-26.5"`)}
  ${LN('M2.6 -32.6Q8 -36.4 13.6 -33.6M16.4 -33.4Q19.6 -35.6 22.8 -33.2',I,1.5)}
  ${LN('M24.4 -26Q28.4 -19.4 23.8 -16.8',I,1.3)}${LN('M22 -16.6q1.8 .6 2.6 -.3',I,.9)}
  ${PT('M12.2 -11.6Q16.4 -9 20.4 -11.8Q16.6 -6.4 12.2 -11.6Z',FK.red,.9)}${LN('M12.4 -11.6Q16.4 -12.6 20.2 -11.8',FK.red2,1)}
  <ellipse cx="7" cy="-17" rx="5" ry="2.8" fill="#ee8f8a" opacity=".5"/><ellipse cx="21.5" cy="-17.6" rx="2.6" ry="2" fill="#ee8f8a" opacity=".45"/>
  ${o.beard?PT('M8 -6Q14 8 22 -4Q16 2 8 -6Z',FK.white,1):''}${o.mous?LN('M11 -14.5Q14 -16 16.4 -14.4M17.4 -14.5Q20 -16 22 -14',I,1.2):''}`;
 const hair=`${PT('M-14 -28C-17 -44 -5 -55 9 -53C19 -52 25 -46 26.5 -38C19 -45 10 -45 2 -41C-3 -36 -7 -30 -8 -20C-11 -20 -13 -23 -14 -28Z',FK.black,1.3)}${PT('M-4 -30Q-2 -24 -3 -19L-6 -19Q-6 -25 -4 -30Z',FK.black,.6)}`;
 const H={
  non:()=>`${hair}${PT('M-24 -40Q4 -78 34 -40Q6 -33 -24 -40Z','#f0dda2',1.6)}${[-16,-6,4,14,24].map(x=>LN(`M5 -71L${x} -38`,'#c9b07a',.9)).join('')}${TRIM('M-22 -41Q6 -35 32 -41',FK.red,FK.yel,3.4)}<circle cx="5" cy="-72" r="3.4" fill="${FK.gold}" stroke="${I}" stroke-width="1.1"/>${PART('tas',`${LN('M5 -72Q-4 -66 -9 -54',FK.red,2.8)}<ellipse cx="-9.5" cy="-51" rx="2.8" ry="4.4" fill="${FK.red}" stroke="${I}" stroke-width=".8"/>`,`data-cx="5" data-cy="-72"`)}${LN('M-10 -38Q-4 -8 16 -2',I,.9)}`,
  khanvang:()=>`${hair}${PT('M-16 -36Q-18 -56 4 -59Q25 -59 28 -38Q24 -46 6 -47Q-10 -46 -16 -36Z',FK.yel,1.5)}${PT('M-17 -40Q5 -52 29 -41L28 -34Q5 -45 -16 -33Z',FK.yel2,1.2)}${LN('M-14 -38Q6 -48 27 -38',FK.red,1.6)}${PART('tas',PT('M-15 -36Q-26 -30 -28 -16L-22 -15Q-21 -27 -12 -33Z',FK.yel,1),`data-cx="-15" data-cy="-36"`)}`,
  bui:()=>`${hair}<circle cx="-4" cy="-58" r="9" fill="${FK.black}" stroke="${I}" stroke-width="1.2"/>${PT('M-15 -41Q5 -51 27 -42L26.4 -35.6Q5 -44 -14.6 -34.4Z',FK.red,1.1)}${PART('tas',PT('M-14 -38Q-24 -34 -27 -20L-22 -19Q-20 -30 -12 -35Z',FK.red,1),`data-cx="-14" data-cy="-38"`)}${LN('M-10 -64q4 -3 8 0',FK.red,2.2)}`,
  khan:()=>`${hair}${PT('M-15.5 -32Q-18 -52 3 -56Q24 -57 27 -37L26 -32Q20 -45 4 -46Q-8 -45 -15.5 -32Z','#3a2f2a',1.3)}${LN('M-13 -38Q5 -50 26 -40M-11 -44Q6 -54 24 -46',FK.grey2,1)}`,
  canhchuon:()=>`${hair}${PT('M-16 -38Q-18 -54 4 -57Q25 -57 28 -38Q12 -43 -16 -38Z',FK.black,1.4)}${PT('M-4 -54Q-6 -70 8 -72Q22 -71 21 -54Z',FK.black,1.3)}${TRIM('M-16.5 -40Q6 -45 28 -40',FK.gold,'#fff1b8',2.6)}
   ${PART('wingL',`${LN('M-10 -52L-34 -55',FK.black,2.4)}${PT('M-34 -55m-14 0a14 5.5 0 1 0 28 0a14 5.5 0 1 0 -28 0',FK.black,1)}${LN('M-44 -56.5h18',FK.grey2,1)}`,`data-cx="-10" data-cy="-52"`)}
   ${PART('wingR',`${LN('M17 -52L40 -55',FK.black,2.4)}${PT('M40 -55m-14 0a14 5.5 0 1 0 28 0a14 5.5 0 1 0 -28 0',FK.black,1)}${LN('M32 -56.5h18',FK.grey2,1)}`,`data-cx="17" data-cy="-52"`)}`
 };
 return `${PT('M-5 2L7 2L6.5 -6L-4.5 -6Z',FK.skin2,1.2)}${face}${(H[hat]||(()=>hair))()}`}

/* mặt Trạng nguyên nhìn thẳng khán giả (gốc = chân cổ) */
function headArtFront(){const I=FK.ink;return `${PT('M-6 2L6 2L5.5 -6L-5.5 -6Z',FK.skin2,1.2)}
 ${PT('M-18.6 -29q-5 1 -4 8q1 4 4.4 3.6Z',FK.skin,1.2)}${PT('M18.6 -29q5 1 4 8q-1 4 -4.4 3.6Z',FK.skin,1.2)}
 ${PT('M-19 -30C-20 -46 -10 -54 0 -54C10 -54 20 -46 19 -30C19 -16 12 -2 0 -1C-12 -2 -19 -16 -19 -30Z',FK.skin,1.7)}
 ${PT('M-19.5 -31C-21 -48 -8 -57 0 -56C8 -57 21 -48 19.5 -31C15 -41 8 -45 0 -45C-8 -45 -15 -41 -19.5 -31Z',FK.black,1.3)}
 ${PART('eye',`${PT('M-12.6 -27.6Q-8.8 -30.6 -5 -27.8Q-8.8 -25.8 -12.6 -27.6Z','#f6efe2',.7)}${PT('M5 -27.8Q8.8 -30.6 12.6 -27.6Q8.8 -25.8 5 -27.8Z','#f6efe2',.7)}<circle cx="-8.6" cy="-28" r="2.2" fill="#4a2c1a"/><circle cx="8.6" cy="-28" r="2.2" fill="#4a2c1a"/><circle cx="-8.6" cy="-28" r="1.1" fill="${I}"/><circle cx="8.6" cy="-28" r="1.1" fill="${I}"/><circle cx="-7.9" cy="-28.8" r=".7" fill="#fff"/><circle cx="9.3" cy="-28.8" r=".7" fill="#fff"/>${LN('M-14 -28.2Q-9 -32.6 -4 -28.4M4 -28.4Q9 -32.6 14 -28.2',I,1.6)}`,`data-cx="0" data-cy="-28"`)}
 ${LN('M-15 -35Q-9.6 -38.6 -4.4 -35.6M4.4 -35.6Q9.6 -38.6 15 -35',I,1.6)}${LN('M0 -25L-1.4 -18.4Q0 -17 1.6 -18',FK.skin2,1.2)}
 ${PT('M-7.6 -11.6Q0 -4 7.6 -11.6Q0 -9.4 -7.6 -11.6Z',FK.red,1)}${LN('M-7.6 -11.6Q0 -13 7.6 -11.6',FK.red2,1)}${LN('M-6.4 -14.2Q-3 -15.6 -.6 -14.4M.6 -14.4Q3 -15.6 6.4 -14.2',I,1.2)}
 <ellipse cx="-12" cy="-18" rx="4.4" ry="2.6" fill="#ee8f8a" opacity=".5"/><ellipse cx="12" cy="-18" rx="4.4" ry="2.6" fill="#ee8f8a" opacity=".5"/>
 ${PT('M-20 -38Q-21 -54 0 -57Q21 -54 20 -38Q0 -43 -20 -38Z',FK.black,1.4)}${PT('M-11 -54Q-12 -70 0 -72Q12 -70 11 -54Z',FK.black,1.3)}${TRIM('M-20.5 -40Q0 -45 20.5 -40',FK.gold,'#fff1b8',2.6)}<circle cx="0" cy="-47" r="2.6" fill="${FK.gold}" stroke="${I}" stroke-width=".8"/>
 ${PART('wingL',`${LN('M-14 -52L-38 -54',FK.black,2.4)}${PT('M-38 -54m-14 0a14 5.5 0 1 0 28 0a14 5.5 0 1 0 -28 0',FK.black,1)}${LN('M-48 -55.5h18',FK.grey2,1)}`,`data-cx="-14" data-cy="-52"`)}
 ${PART('wingR',`${LN('M14 -52L38 -54',FK.black,2.4)}${PT('M38 -54m-14 0a14 5.5 0 1 0 28 0a14 5.5 0 1 0 -28 0',FK.black,1)}${LN('M30 -55.5h18',FK.grey2,1)}`,`data-cx="14" data-cy="-52"`)}`}

/* ---------- PHẦN CHÂN NGƯỜI (khung riêng: gốc ở khớp, trục dọc +y) ---------- */
const HUM={HIP:150,L1:72,L2:70,ANK:11};
const thighArt=(c,dk)=>`${PT('M-18 -8C-24 12 -24 42 -17 64C-10 76 10 76 17 64C23 42 23 12 18 -8Z',c,1.6)}${LN('M-7 8C-10 28 -9 46 -5 62M6 14C8 32 8 48 6 60',dk,1.1)}`;
const shinArt=(c,dk,trim,wrap)=>`${PT('M-17 -6C-21 12 -18 34 -10 47L10 47C18 34 21 12 17 -6Z',c,1.6)}${LN('M-4 6C-6 22 -5 34 -3 44',dk,1.1)}
 ${wrap?`${PT('M-9.5 45L9.5 45L8 71L-8 71Z',FK.cream,1.3)}${LN('M-9 50L8 57M-8.6 57L7.6 64M-8.2 64L7.2 70.4',trim,1.3)}`:PT('M-8 45L8 45L7 71L-7 71Z',FK.skin,1.3)}
 ${TRIM('M-11 46.5L11 46.5',trim,FK.cream,3.6)}`;
const footArt=()=>`${PT('M-9 -5C-9.6 3 -7.6 9.5 -1 10L27 10C33 10 34 5 28 2.4C22 0 16 -3 10 -5Z',FK.black,1.4)}${LN('M-6 7.2L28 7.2',FK.grey2,1)}`;

/* ---------- NGƯỜI ĐI TRONG ĐOÀN ---------- */
function fkWalker(o){const I=FK.ink,mir=o.mir,i=FK_REG.length,reg={kind:'w',s:o.s,off:o.off||0,x:o.x,prop:o.prop,free:o.prop==='groom'};FK_REG.push(reg);
 const T0=o.tunic[0],T1=o.tunic[1],TR=o.trim,DT=o.dot;
 // thân áo (gốc ở hông, trục dọc lên trên âm)
 const tunic=`${PT('M-24 -94C-30 -70 -31 -40 -28 -12L-35 42C-15 49 15 49 35 42L28 -12C29 -40 27 -70 21 -94C9 -101 -12 -101 -24 -94Z',T0,1.8)}
  ${PT('M-24 -94C-30 -70 -31 -40 -28 -12L-35 42C-30 44 -24 45 -18 46L-14 -12C-16 -44 -14 -74 -10 -99Z',T1,0,'opacity=".42" stroke="none"')}
  ${LN('M-2 -10L-4 42M14 -8L19 40',T1,1.2)}
  ${TRIM('M-34 41.5C-15 48 15 48 34 41.5',TR,DT,5.2)}${TRIM('M-8 -98L17 -58L22 -12',TR,DT,5.6)}
  ${PT('M-29 -22Q0 -15 29 -22L29.6 -9Q0 -2 -30 -9Z',o.sash,1.4)}<ellipse cx="22" cy="-15" rx="6.4" ry="5.2" fill="${o.sash}" stroke="${I}" stroke-width="1.3"/>
  ${PART('sash',`${PT('M19 -12Q15 6 18 22L25 21Q22 6 25 -12Z',o.sash,1.2)}${PT('M24 -12Q27 4 32 16L37 12Q32 2 28 -12Z',o.sash,1.2)}`,`data-cx="22" data-cy="-13"`)}
  ${PT('M-9 -99Q2 -91 13 -98L12 -104Q2 -98 -8 -105Z',FK.cream,1)}`;
 const neck=[3,-103];
 let behind='',front='',pole='';const PX=33;
 if(o.prop==='groom'){ // người hầu dắt ngựa: tay sau cầm dây cương (khung thân), tay trước vung theo bước
  behind=sleeve(-12,-90,-30,-52,15,19,T0,T1,TR)+fistAt(-34,-46)+limb(-12,-90,-20,-70,16,15,T0)+'';
  front=PART('armU',`${limb(0,0,4,34,17,15,T0)}${PART('armL',`${sleeve(0,0,6,32,15,20,T0,T1,TR)}${fistAt(7,38)}`,`data-cx="0" data-cy="0" transform="translate(4 34)"`)}`,`data-cx="0" data-cy="0" transform="translate(12 -90)"`);
 }else{
  const hi=o.prop==='flag'||o.prop==='sign'||o.prop==='parasol';
  const H1=o.prop==='parasol'?[PX,-122]:hi?[PX,-150]:[PX,-74],H2=o.prop==='parasol'?[PX,-72]:hi?[PX,-82]:[PX,-40];
  const tilt=o.prop==='parasol'?o.tilt||0:0,px=y=>PX+(H2[1]-y)*tilt; // cán có thể nghiêng ra trước
  const top=o.top,bot=o.prop==='parasol'?H2[1]+40:60;
  pole=PT(`M${f1(px(top)-2.6)} ${top}L${f1(px(top)+2.6)} ${top}L${f1(px(bot)+2.6)} ${bot}L${f1(px(bot)-2.6)} ${bot}Z`,'#8a5a2c',1.1);
  const h1=[px(H1[1]),H1[1]],h2=[px(H2[1]),H2[1]];
  // tay sau (vai sau) với tới tay cầm trên; tay trước cầm dưới
  behind=hi?`${limb(-12,-90,-6,-122,16,15,T0)}${sleeve(-6,-122,h1[0]-7,h1[1]+4,15,20,T0,T1,TR)}`:`${limb(-12,-90,-2,-62,16,15,T0)}${sleeve(-2,-62,h1[0]-7,h1[1]+1,15,20,T0,T1,TR)}`;
  front=`${limb(13,-90,24,-60,17,15,T0)}${sleeve(24,-60,h2[0]-7,h2[1]+1,15,20,T0,T1,TR)}`;
  front+=fistV(h1[0],h1[1])+fistV(h2[0],h2[1]);
  if(o.prop==='flag'){reg.flag=fkFlagGeom(px(top)+2.6,top+6,o.flag.W,o.flag.H);pole=fkFlagSVG(reg.flag,o.flag,mir)+pole+`${PT(`M${f1(px(top))} ${top-20}L${f1(px(top)+6)} ${top-2}L${f1(px(top)-6)} ${top-2}Z`,FK.gold,1.2)}`}
  if(o.prop==='sign')front+=PART('prop',fkSignArt(px(top),top,mir),`data-cx="${f1(px(top))}" data-cy="${top+110}"`);
  if(o.prop==='tan')front+=PART('prop',fkTanArt(px(top),top,mir),`data-cx="${f1(px(top))}" data-cy="${top+120}"`);
  if(o.prop==='parasol')front+=PART('prop',fkParasolArt(px(top),top),`data-cx="${f1(px(top))}" data-cy="${top+40}"`);
 }
 const head=PART('head',headArt(o.hat,o),`data-cx="0" data-cy="0" transform="translate(${neck[0]} ${neck[1]})"`);
 const torso=PART('torso',`${o.prop==='groom'?behind:''}${o.prop!=='groom'?behind:''}${tunic}${pole}${head}${front}`);
 const legs=n=>PART(n+'th',thighArt(n==='lb'?o.pants[1]:o.pants[0],n==='lb'?o.pants[1]:o.pants[2]||o.pants[1]))+PART(n+'sh',shinArt(n==='lb'?o.pants[1]:o.pants[0],o.pants[1],TR,o.wrap!==false))+PART(n+'ft',footArt());
 return `<g data-a="${i}" transform="translate(${o.x} ${o.y}) scale(${o.s})"><ellipse cx="6" cy="2" rx="46" ry="6.5" fill="#3a2410" opacity=".2"/>${legs('lb')}${legs('lf')}${torso}</g>`}

/* ---------- ĐẠO CỤ (khung thân lính) ---------- */
function fkFlagGeom(px,top,W,H){const NS=18;
 const pt=(u,v,ph,amp)=>{const s=Math.sin(u*Math.PI*1.6-ph);return [px-u*W*(1-.03*s*amp/6),top+v*H+s*amp*Math.pow(u,1.15)+u*u*6]};
 const path=(ph,amp,inset,teeth)=>{const a=[],uMax=1-inset*.85;
  for(let i=0;i<=NS;i++){const u=i/NS*uMax,v=teeth?((i%2)?-.09:.02):inset;a.push(pt(u,v,ph,amp))}
  for(let j=1;j<6;j++){const v=j/6,uu=uMax+(teeth?(j%2?.05:-.01):0);a.push(pt(Math.min(uu,1.05),inset+v*(1-2*inset),ph,amp))}
  for(let i=NS;i>=0;i--){const u=i/NS*uMax,v=teeth?((i%2)?1.09:.98):1-inset;a.push(pt(u,v,ph,amp))}
  return 'M'+a.map(p=>f1(p[0])+' '+f1(p[1])).join('L')+'Z'};
 return {path,center:(ph,amp)=>pt(.48,.5,ph,amp)}}
function fkFlagSVG(g,o,mir){const c=g.center(0,6);
 return `<g data-flag="1"><path data-fl="0" d="${g.path(0,6,0,true)}" fill="${FK.black}" stroke="${FK.ink}" stroke-width="1.2" stroke-linejoin="round"/><path data-fl="1" d="${g.path(0,6,.08,false)}" fill="${o.border}"/><path data-fl="2" d="${g.path(0,6,.17,false)}" fill="${FK.grn}"/><path data-fl="3" d="${g.path(0,6,.24,false)}" fill="${o.field}"/>
  <g data-fc="1" transform="translate(${f1(c[0])} ${f1(c[1])})">${fkText(0,0,o.text,o.size,o.tc,mir,`textLength="${o.tl}" lengthAdjust="spacingAndGlyphs"`)}</g></g>`}
function fkSignArt(x,top,mir){const I=FK.ink,l=x-34,w=68;return `
 ${PT(`M${l+4} ${top}H${l+w-4}L${l+w+4} ${top+8}H${l-4}Z`,FK.gold,1.4)}
 ${PT(`M${l} ${top+8}h${w}v94h${-w}Z`,FK.red,1.8)}${PT(`M${l+7} ${top+15}h${w-14}v80h${-(w-14)}Z`,'#f4d98a',1.3)}
 <rect x="${l+11}" y="${top+19}" width="${w-22}" height="72" fill="none" stroke="${FK.red}" stroke-width="1" stroke-dasharray="3 2.4"/>
 ${fkText(x,top+38,'TRẠNG',17,FK.red2,mir,'textLength="40" lengthAdjust="spacingAndGlyphs"')}${fkText(x,top+70,'NGUYÊN',17,FK.red2,mir,'textLength="43" lengthAdjust="spacingAndGlyphs"')}
 ${PART('rib1',`${LN(`M${l+2} ${top+102}v10`,I,1)}<ellipse cx="${l+2}" cy="${top+118}" rx="3.4" ry="6.4" fill="${FK.red}" stroke="${I}" stroke-width=".9"/>`,`data-cx="${l+2}" data-cy="${top+102}"`)}
 ${PART('rib2',`${LN(`M${l+w-2} ${top+102}v10`,I,1)}<ellipse cx="${l+w-2}" cy="${top+118}" rx="3.4" ry="6.4" fill="${FK.red}" stroke="${I}" stroke-width=".9"/>`,`data-cx="${l+w-2}" data-cy="${top+102}"`)}`}
function fkTanArt(x,top,mir){const I=FK.ink,l=x-36,w=72;let fr='';for(let k=0;k<19;k++)fr+=LN(`M${f1(l+3+k*3.7)} ${top+62}v34`,FK.yel2,1.4);
 return `${PT(`M${l+8} ${top+16}Q${x} ${top-12} ${l+w-8} ${top+16}Z`,FK.yel,1.5)}<circle cx="${x}" cy="${top-2}" r="4.4" fill="${FK.gold}" stroke="${I}" stroke-width="1"/>
 ${PT(`M${l} ${top+16}h${w}v11h${-w}Z`,FK.red,1.4)}${PT(`M${l} ${top+27}h${w}v31h${-w}Z`,FK.grn,1.4)}
 ${fkText(x,top+42.5,'BÁI TỔ',16,'#f6d36a',mir,'textLength="52" lengthAdjust="spacingAndGlyphs"')}
 ${PT(`M${l} ${top+58}h${w}v5h${-w}Z`,FK.red,1.1)}${PT(`M${l} ${top+63}h${w}v34h${-w}Z`,FK.yel,1.2)}${fr}
 ${PART('rib1',PT(`M${l-4} ${top+20}h4v84l-2 6l-2 -6Z`,FK.pink,1),`data-cx="${l-2}" data-cy="${top+20}"`)}${PART('rib2',PT(`M${l+w} ${top+20}h4v84l-2 6l-2 -6Z`,FK.pink,1),`data-cx="${l+w+2}" data-cy="${top+20}"`)}`}
function fkParasolArt(x,top){const I=FK.ink;let sc='',fr='';for(let k=0;k<12;k++){const xx=x-66+k*11;sc+=`Q${xx+5.5} ${top+12} ${xx+11} ${top+3}`;fr+=LN(`M${xx+5.5} ${top+9}v15`,FK.yel2,1.4)}
 return `${PT(`M${x-67} ${top+3}Q${x-60} ${top-40} ${x} ${top-48}Q${x+60} ${top-40} ${x+67} ${top+3}Z`,FK.yel,1.7)}
 ${[-44,-22,0,22,44].map(d=>LN(`M${x} ${top-48}Q${x+d*.6} ${top-20} ${x+d*1.4} ${top+2}`,FK.yel2,1.2)).join('')}
 ${PT(`M${x-67} ${top+3}${sc}Z`,FK.red,1.3)}${fr}<circle cx="${x}" cy="${top-52}" r="5" fill="${FK.gold}" stroke="${I}" stroke-width="1.1"/>
 ${PART('rib1',`${LN(`M${x-62} ${top+4}v12`,I,1)}${PT(`M${x-62} ${top+14}q7 8 0 22q-7 -14 0 -22Z`,FK.red,1)}`,`data-cx="${x-62}" data-cy="${top+4}"`)}
 ${PART('rib2',`${LN(`M${x+62} ${top+4}v12`,I,1)}${PT(`M${x+62} ${top+14}q7 8 0 22q-7 -14 0 -22Z`,FK.red,1)}`,`data-cx="${x+62}" data-cy="${top+4}"`)}`}

/* ---------- NGỰA (vai 205; gốc mặt đất dưới thân; đầu sang phải) ---------- */
const HRS={F:[72,-122],Ff:[64,-124],Hd:[-76,-126],Hf:[-84,-128],FL1:58,FL2:52,HL1:62,HL2:54,FET:16};
function hLegUpper(front,c){return front
 ?`${PT('M-17 -12C-21 12 -13 36 -8 56L8 56C12 36 18 12 16 -12Z',c,1.6)}<circle cx="0" cy="57" r="8" fill="${c}" stroke="${FK.ink}" stroke-width="1.3"/>${LN('M-4 6C-6 22 -4 38 -2 50',FK.horse2,1.1)}`
 :`${PT('M-20 -14C-24 8 -14 34 -6 58L9 58C12 34 18 10 18 -14Z',c,1.6)}${PT('M-8 54L4 54L-2 66Z',c,1.2)}<circle cx="1" cy="60" r="6.6" fill="${c}" stroke="${FK.ink}" stroke-width="1.3"/>${LN('M-8 2C-10 22 -6 40 -2 54',FK.horse2,1.1)}`}
function hLegLower(c,sock){return `${PT('M-7.4 -2C-8 14 -6.6 30 -5.6 46L5.6 46C6.6 30 8 14 7.4 -2Z',c,1.4)}<circle cx="0" cy="49" r="6.4" fill="${sock}" stroke="${FK.ink}" stroke-width="1.2"/>${PT('M-5 50L6 50L9 60L-4 60Z',sock,1.2)}${PT('M-6.5 59L10 59L12.6 68L-6.5 68Z',FK.black,1.3)}`}
function fkHorseRider(x,y,s){const I=FK.ink,H=FK.horse,H2=FK.horse2,i=FK_REG.length;FK_REG.push({kind:'h',s,x});
 const tail=PART('tail',`${PT('M-6 -4C-26 2 -36 30 -34 62C-33 74 -30 82 -26 88C-28 66 -24 38 -2 10Z',FK.white,1.5)}${LN('M-10 6C-22 24 -26 48 -26 70M-4 4C-14 22 -18 44 -18 60',FK.grey,1.1)}
  ${PART('tail2',`${PT('M-30 70C-36 92 -30 112 -14 124C-22 106 -24 90 -20 72Z',FK.white,1.3)}${LN('M-26 80C-28 96 -24 108 -18 116',FK.grey,1)}`,`data-cx="-28" data-cy="72"`)}`,`data-cx="0" data-cy="0" transform="translate(-100 -184)"`);
 const body=`${PT('M-98 -186C-92 -206 -62 -212 -30 -204C-6 -198 18 -198 38 -206C58 -212 82 -196 96 -168C104 -150 100 -128 86 -118C60 -110 20 -108 -10 -112C-40 -114 -64 -116 -82 -124C-100 -132 -108 -150 -106 -168C-105 -176 -102 -182 -98 -186Z',H,2)}
  ${LN('M58 -190C78 -176 84 -150 74 -126M-58 -196C-82 -186 -90 -160 -80 -132M-40 -118C-10 -114 30 -114 64 -120',H2,1.4,'opacity=".75"')}
  ${[[-70,-176],[-50,-150],[-24,-178],[10,-150],[40,-178],[66,-150],[-80,-148]].map(([a,b])=>`<path d="M${a} ${b}q4 -3 8 0" stroke="${FK.horse3}" stroke-width="1.6" fill="none" opacity=".7"/>`).join('')}`;
 const mane=`${PT('M48 -200C56 -236 84 -270 116 -284L120 -276C94 -262 70 -234 58 -196Z',FK.mane,1)}${Array.from({length:11},(_,k)=>{const t=k/10,bx=50+t*66,by=-200-t*82;return PT(`M${f1(bx)} ${f1(by)}l${f1(-14+t*4)} ${f1(-6-t*4)}l${f1(10)} ${f1(-2)}Z`,FK.mane,.8)}).join('')}`;
 const head=PART('hhead',`${PT('M-8 -6C4 -18 18 -14 24 -2L48 40C52 48 48 56 40 56C32 56 22 52 14 46C2 38 -8 22 -10 10C-11 4 -11 -2 -8 -6Z',H,1.8)}
   ${PART('ear',PT('M-2 -10L2 -30L10 -12Z',H,1.4),`data-cx="4" data-cy="-10"`)}${PT('M-6 -6Q-16 2 -12 12Q-6 6 -2 -2Z',FK.mane,1)}
   <ellipse cx="12" cy="8" rx="4" ry="4.6" fill="${I}"/><circle cx="13.4" cy="6.6" r="1.3" fill="#fff"/>${LN('M6 2Q12 -3 18 2',I,1.2)}
   <ellipse cx="42" cy="44" rx="3" ry="2.2" fill="${I}"/>${LN('M34 52Q40 54 47 50',I,1.3)}${LN('M26 20Q36 30 40 40',H2,1.2)}
   ${LN('M0 -6L40 46M8 34Q26 28 36 22M18 -8L10 34',FK.gold,3)}<circle cx="24" cy="26" r="3.4" fill="${FK.gold}" stroke="${I}" stroke-width="1"/>
   ${PART('tasH',`${LN('M10 36v8',I,1)}${PT('M10 42q8 9 0 22q-8 -13 0 -22Z',FK.red,1)}`,`data-cx="10" data-cy="36"`)}`,`data-cx="0" data-cy="0" transform="translate(124 -282)"`);
 const neck=PART('neck',`${PT('M46 -202C56 -240 86 -272 118 -286C128 -289 136 -284 138 -276C128 -250 118 -220 104 -164C90 -172 68 -186 46 -202Z',H,2)}${LN('M70 -210C82 -230 98 -250 116 -262',H2,1.2,'opacity=".7"')}${mane}${head}
   ${LN('M164 -232Q118 -214 64 -248',FK.nau2,1.6)}`,`data-cx="70" data-cy="-190"`);
 const tack=`${PT('M-46 -206C-20 -212 22 -212 40 -204L44 -150C14 -142 -22 -142 -48 -150Z',FK.yel,1.6)}${LN('M-40 -200C-16 -205 18 -205 34 -198L37 -158C12 -152 -18 -152 -41 -158Z',FK.red,1.3,'stroke-dasharray="5 3"')}
  ${TRIM('M-48 -151C-20 -142 14 -142 44 -151',FK.red,FK.cream,5)}${Array.from({length:11},(_,k)=>{const xx=-44+k*8.6;return PT(`M${f1(xx)} -146l3.6 11l3.6 -11Z`,FK.red,.8)}).join('')}
  ${PT('M-32 -210C-24 -222 14 -222 24 -210Z',FK.gold,1.4)}
  ${LN('M96 -170Q84 -150 72 -128',FK.gold,2.6)}${PART('tasC',`${LN('M94 -166v6',I,1)}${PT('M94 -160q9 10 0 24q-9 -14 0 -24Z',FK.red,1)}`,`data-cx="94" data-cy="-166"`)}
  ${LN('M14 -150v26',I,1.2)}${PT('M8 -124h13l-1.5 5h-10Z',FK.gold,1)}`;
 // Trạng nguyên ngồi yên (gốc ở hông trên yên)
 const G=FK.grn,G2=FK.grn2,Y=FK.yel;
 const drape=`${PT('M-26 0C-36 22 -40 52 -36 80C-20 90 26 90 46 80C50 52 44 22 32 0Z',G,1.8)}${PT('M-36 80C-20 90 26 90 46 80L46 72C26 82 -20 82 -36 72Z',Y,1.3)}${LN('M-14 10C-18 34 -18 58 -14 76M10 12C12 36 12 58 12 78',G2,1.3)}
  ${PT('M30 40C38 46 42 56 44 66L52 68C50 54 44 42 36 34Z',G2,1.2)}${PT('M42 64Q38 78 46 82L64 82Q70 82 70 76Q64 77 60 72L50 64Z',FK.black,1.3)}${LN('M48 80H66',FK.grey2,1)}`;
 const reinArmFar=`${limb(-6,-70,14,-46,16,15,G2)}${sleeve(14,-46,34,-36,15,21,G2,G,Y)}${fistAt(40,-36,6)}`;
 const torsoR=`${PT('M-22 2C-27 -24 -25 -56 -17 -78C-5 -85 13 -85 21 -78C28 -56 28 -24 24 2Z',G,1.8)}${PT('M-22 2C-27 -24 -25 -56 -17 -78C-13 -80 -9 -81 -5 -82C-11 -58 -12 -26 -10 2Z',G2,0,'opacity=".45" stroke="none"')}
  ${PT('M-5 -84L14 -50L18 0L12 0L9 -48L-9 -80Z',FK.cream,1.1)}${TRIM('M-6 -83L13 -50L16 0',Y,FK.red,5.4)}
  ${PT('M-26 -20Q0 -13 27 -20L28 -9Q0 -2 -27 -9Z',FK.red,1.4)}${[-18,-6,6,18].map(xx=>`<rect x="${xx-3.5}" y="-18" width="7" height="7" rx="1.4" fill="${FK.gold}" stroke="${I}" stroke-width=".8"/>`).join('')}`;
 const greet=PART('rarmU',`${limb(0,0,10,30,18,16,G)}${PART('rarmL',`${sleeve(0,0,26,8,16,24,G,G2,Y)}${fistAt(32,8,6.4)}`,`data-cx="0" data-cy="0" transform="translate(10 30)"`)}`,`data-cx="0" data-cy="0" transform="translate(14 -72)"`);
 const rhead=PART('rhead',`<g data-v="r34">${headArt('canhchuon',{mous:true})}</g><g data-v="rF" style="opacity:0">${headArtFront()}</g>`,`data-cx="0" data-cy="0" transform="translate(3 -84)"`);
 const brocade=`<path d="M-22 2C-27 -24 -25 -56 -17 -78C-5 -85 13 -85 21 -78C28 -56 28 -24 24 2Z" fill="url(#fkBrocade)" opacity=".6"/>`,brocadeD=`<path d="M-26 0C-36 22 -40 52 -36 76C-20 84 26 84 46 76C50 52 44 22 32 0Z" fill="url(#fkBrocade)" opacity=".55"/>`;
 const halo=`<g data-v="halo" style="opacity:0"><ellipse cx="8" cy="-300" rx="96" ry="120" fill="url(#fkHalo)"/></g>`;
 const rider=PART('rider',`${reinArmFar}${drape}${brocadeD}${PART('rtorso',`${torsoR}${brocade}${rhead}${greet}`,`data-cx="0" data-cy="0"`)}`,`data-cx="0" data-cy="0" transform="translate(6 -214)"`);
 const leg=(n,front,far)=>{const c=far?H2:H,sock=far?'#d9d2c2':FK.white;return PART('h'+n+'u',hLegUpper(front,c))+PART('h'+n+'l',hLegLower(c,sock))};
 return `<g data-a="${i}" transform="translate(${x} ${y}) scale(${s})"><ellipse cx="-4" cy="2" rx="128" ry="9" fill="#3a2410" opacity=".2"/>
  ${leg('Hf',false,true)}${leg('Ff',true,true)}
  ${PART('hbody',`${halo}${tail}${body}${neck}${tack}${rider}`)}
  ${leg('Hn',false,false)}${leg('Fn',true,false)}</g>`}

/* ---------- BÀ CON (nhìn thẳng, cao 300 ≈ 6,5 đầu) ---------- */
const FK_FOLK=[
 {k:'nu',ao:FK.nau,ao2:FK.nau2,yem:FK.red,belt:FK.grn,hat:'moquat'},{k:'nu',ao:FK.pink,ao2:FK.pink2,yem:FK.cream,belt:FK.yel,hat:'quaithao'},
 {k:'nam',ao:FK.nau2,ao2:'#3e2816',ha:FK.cream,belt:FK.red,hat:'khanxep'},{k:'nu',ao:FK.yel,ao2:FK.yel2,yem:FK.red,belt:FK.grn,hat:'moquat'},
 {k:'tre',ao:FK.red,ao2:FK.red2,ha:FK.cream,hat:'chom'},{k:'nam',ao:FK.cham,ao2:FK.cham2,ha:FK.cream,belt:FK.yel,hat:'nonla'},
 {k:'gia',ao:'#3a3330',ao2:'#221d1a',ha:FK.cream,hat:'khanxep',beard:1},{k:'nu',ao:FK.grn,ao2:FK.grn2,yem:FK.yel,belt:FK.pink,hat:'quaithao'},
 {k:'tre',ao:FK.yel,ao2:FK.yel2,ha:FK.red,hat:'chom'},{k:'nu',ao:FK.tia,ao2:FK.tia2,yem:FK.cream,belt:FK.yel,hat:'moquat'},
 {k:'nam',ao:FK.cream,ao2:'#cfc3a4',ha:FK.nau2,belt:FK.red,hat:'nonla'},{k:'nu',ao:FK.red,ao2:FK.red2,yem:FK.yel,belt:FK.grn,hat:'nonla'}];
function fkVillager(x,y,s,f,act,seed){const I=FK.ink,i=FK_REG.length,kid=f.k==='tre';FK_REG.push({kind:'v',s,x,act,ph:(seed*1.37)%6.28,blink:2+(seed*.71)%3.5,tempo:.85+(seed*.37)%0.35});
 let legs;
 if(f.k==='nu')legs=`${PT('M-26 -118L-30 -4Q0 2 30 -4L26 -118Z',FK.black,1.6)}${LN('M-8 -110L-10 -6M10 -110L11 -6',FK.grey2,1)}${PT('M-20 -4h15v6h-17ZM5 -4h15l2 6h-17Z',FK.black,1)}`;
 else if(f.k==='gia')legs=`${PT('M-28 -132L-31 -6H31L28 -132Z',f.ao,1.6)}${LN('M0 -120V-8',f.ao2,1.2)}${PT('M-20 -6h15v7h-17ZM5 -6h15l2 7h-17Z',FK.black,1)}`;
 else legs=`${PT('M-26 -126C-30 -90 -28 -40 -22 -12L-4 -12L0 -70L4 -12L22 -12C28 -40 30 -90 26 -126Z',f.ha,1.6)}${LN('M-14 -100C-15 -70 -14 -40 -12 -16M14 -100C15 -70 14 -40 12 -16',FK.grey2,1)}${PT('M-24 -12h19v12h-21ZM5 -12h19l2 12h-21Z',FK.black,1.1)}`;
 const body=`${PT('M-30 -222Q-38 -170 -36 -112L36 -112Q38 -170 30 -222Q0 -232 -30 -222Z',f.ao,1.7)}${PT('M-30 -222Q-38 -170 -36 -112L-20 -112Q-22 -170 -16 -228Z',f.ao2,0,'opacity=".42" stroke="none"')}
  ${f.yem?`${PT('M-14 -222L0 -194L14 -222Z',f.yem,1.2)}${LN('M-14 -222L-30 -150M14 -222L30 -150',f.ao2,1.2)}`:`${LN('M0 -224V-114',f.ao2,1.3)}<circle cx="0" cy="-198" r="2.2" fill="${I}"/><circle cx="0" cy="-174" r="2.2" fill="${I}"/><circle cx="0" cy="-150" r="2.2" fill="${I}"/>`}
  ${f.belt?`${PT('M-36 -150Q0 -142 36 -150L36 -136Q0 -128 -36 -136Z',f.belt,1.3)}${PT('M-8 -136l-4 26h8ZM6 -136l2 26h8Z',f.belt,1)}`:''}
  ${PT('M-8 -236h16v14h-16Z',FK.skin2,1.2)}`;
 const hand=(hx,hy)=>`<circle cx="${hx}" cy="${hy}" r="8" fill="${FK.skin}" stroke="${I}" stroke-width="1.3"/>`;
 const arm=(name,sx,pts,h)=>PART(name,`${limb(sx,-212,pts[0],pts[1],17,15,f.ao)}${sleeve(pts[0],pts[1],h[0],h[1],15,21,f.ao,f.ao2,f.belt||f.ao2)}${hand(h[0],h[1])}`,`data-cx="${sx}" data-cy="-212"`);
 let arms;
 if(act==='cheer')arms=arm('armL',-30,[-46,-250],[-40,-292])+arm('armR',30,[46,-250],[40,-292]);
 else if(act==='wave')arms=arm('armL',-30,[-38,-168],[-20,-140])+arm('armR',30,[54,-236],[50,-284]);
 else arms=arm('armL',-30,[-36,-170],[-7,-186])+arm('armR',30,[36,-170],[7,-186]);
 const fv=act==='cheer'?1:(seed*7)%4,I2=FK.ink; // 0 cười híp · 1 reo há miệng · 2 mỉm cười hiền · 3 ngạc nhiên vui
 const eyes=fv===0?LN('M-14 -266q5 -5 10 0M4 -266q5 -5 10 0',I2,2)
  :`<ellipse cx="-9" cy="-266" rx="${fv===3?3.4:2.8}" ry="${fv===3?4:3.4}" fill="${I2}"/><ellipse cx="9" cy="-266" rx="${fv===3?3.4:2.8}" ry="${fv===3?4:3.4}" fill="${I2}"/><circle cx="-8" cy="-267.4" r="1" fill="#fff"/><circle cx="10" cy="-267.4" r="1" fill="#fff"/>`;
 const brows=fv===3?LN('M-15 -278q5 -5 10 -2M5 -280q5 -3 10 2',I2,1.4):fv===1?LN('M-15 -276q5 -5 10 -2M5 -278q5 -3 10 2',I2,1.4):LN('M-15 -275q5 -4 10 -1M5 -276q5 -3 10 1',I2,1.4);
 const mouth=fv===1?PT('M-6 -253Q0 -240 6 -253Q0 -251 -6 -253Z',FK.red2,1)+PT('M-4 -246Q0 -243 4 -246Q0 -248 -4 -246Z',FK.red,.4)
  :fv===2?LN('M-5 -251Q0 -247 5 -251',FK.red2,1.6):fv===3?`<ellipse cx="0" cy="-249" rx="3.4" ry="4" fill="${FK.red2}" stroke="${I2}" stroke-width=".8"/>`:PT('M-7 -252Q0 -244 7 -252Q0 -249 -7 -252Z',FK.red,1);
 const face=`${PT('M-22 -262C-24 -290 -12 -300 0 -300C12 -300 24 -290 22 -262C21 -248 12 -238 0 -238C-12 -238 -21 -248 -22 -262Z',FK.skin,1.6)}
  ${PART('eye',eyes,`data-cx="0" data-cy="-266"`)}${brows}${mouth}
  <ellipse cx="-14" cy="-255" rx="5" ry="3" fill="#ee8f8a" opacity=".5"/><ellipse cx="14" cy="-255" rx="5" ry="3" fill="#ee8f8a" opacity=".5"/>
  ${PT('M-24 -266q-5 -1 -4 7q2 4 5 2Z',FK.skin,1.1)}${PT('M24 -266q5 -1 4 7q-2 4 -5 2Z',FK.skin,1.1)}`;
 const hair=PT('M-23 -264Q-25 -298 0 -301Q25 -298 23 -264Q17 -284 0 -285Q-17 -284 -23 -264Z',FK.black,1.3);
 const HAT={moquat:`${PT('M-28 -246Q-32 -292 0 -303Q32 -292 28 -246Q22 -280 0 -284Q-22 -280 -28 -246Z',FK.black,1.4)}${PT('M-7 -300L0 -318L7 -300Z',FK.black,1)}`,
  quaithao:`${hair}${PT('M-50 -294a50 10 0 1 0 100 0a50 10 0 1 0 -100 0Z','#e6d29c',1.5)}${PT('M-20 -296a20 5 0 1 0 40 0a20 5 0 1 0 -40 0Z','#cdb478',1)}${LN('M-30 -290Q-26 -258 -8 -238M30 -290Q26 -258 8 -238',FK.red,1.6)}${LN('M-44 -290v10M-30 -287v12M30 -287v12M44 -290v10',FK.ink,.8)}`,
  khanxep:`${PT('M-25 -268Q-27 -300 0 -303Q27 -300 25 -268Q14 -280 0 -280Q-14 -280 -25 -268Z',FK.black,1.4)}${LN('M-25 -276Q0 -288 25 -276M-24 -285Q0 -297 24 -285',FK.grey2,1.2)}`,
  nonla:`${hair}${PT('M-52 -278L0 -326L52 -278Q0 -268 -52 -278Z','#f1e0ad',1.5)}${[-30,-12,8,28].map(xx=>LN(`M0 -326L${xx} -276`,'#cdb67e',.9)).join('')}${LN('M-14 -276Q-12 -254 -6 -240M14 -276Q12 -254 6 -240',FK.grey2,1)}`,
  chom:`${PT('M-22 -262Q-24 -294 0 -298Q24 -294 22 -262Q16 -282 0 -283Q-16 -282 -22 -262Z','#e4c3a0',1,'opacity=".55"')}<circle cx="0" cy="-298" r="7" fill="${FK.black}" stroke="${I}" stroke-width="1"/>`};
 const beard=f.beard?PT('M-8 -242Q0 -212 8 -242Q0 -236 -8 -242Z',FK.white,1.1):'';
 const head=PART('head',face+(HAT[f.hat]||hair)+beard,`data-cx="0" data-cy="-236"`);
 return `<g data-a="${i}" transform="translate(${x} ${y}) scale(${kid?s*.74:s})"><ellipse cx="0" cy="1" rx="36" ry="5" fill="#3a2410" opacity=".18"/>${PART('bob',legs+body+arms+head,`data-cx="0" data-cy="0"`)}</g>`}

/* ---------- DÀN CẢNH ---------- */
const FK_LAYOUT={GY:560,WS:.66,HS:.74,HX:600,dx0:1040};
function fkProcession(mir=true){const L=FK_LAYOUT,GY=L.GY,WS=L.WS;
 const W=o=>fkWalker(Object.assign({y:GY,s:WS,mir},o));
 let s='';
 s+=W({x:452,tunic:[FK.red,FK.red2],trim:FK.yel,dot:FK.red2,pants:[FK.grey,FK.grey2],sash:FK.yel,hat:'bui',prop:'parasol',top:-298,tilt:.62,off:.31});
 s+=W({x:270,tunic:[FK.grn,FK.grn2],trim:FK.red,dot:FK.yel,pants:[FK.yel,FK.yel2],sash:FK.red,hat:'non',prop:'tan',top:-262,off:.62});
 s+=fkHorseRider(L.HX,GY,L.HS);
 s+=W({x:790,tunic:[FK.nau,FK.nau2],trim:FK.nau2,dot:FK.cream,pants:[FK.cream,'#cfc3a4'],sash:FK.cham,hat:'khan',prop:'groom',wrap:false,off:.12});
 s+=`<path data-rein="1" d="M${f1(L.HX+164*L.HS)} ${f1(GY-232*L.HS)}Q${L.HX+150} ${GY-150} ${f1(790-34*WS)} ${f1(GY-196*WS)}" stroke="${FK.nau2}" stroke-width="1.6" fill="none"/>`;
 s+=W({x:870,tunic:[FK.grn,FK.grn2],trim:FK.yel,dot:FK.red,pants:[FK.pink,FK.pink2],sash:FK.yel,hat:'khanvang',prop:'sign',top:-270,off:.47});
 s+=W({x:995,tunic:[FK.yel,FK.yel2],trim:FK.red,dot:FK.cream,pants:[FK.grn,FK.grn2],sash:FK.red,hat:'non',prop:'flag',top:-335,off:.8,
  flag:{W:120,H:72,border:FK.yel,field:FK.pink,text:'VINH QUY',size:19,tc:FK.red2,tl:66}});
 return s}
function fkCrowd(){
 const gaps=[[166,234],[278,340],[450,560],[560,636],[656,696],[876,954]],free=x=>x>138&&x<1064&&!gaps.some(([a,b])=>x>a-10&&x<b+10);
 const front=[];for(let x=146;x<1064;x+=1){if(free(x)&&(!front.length||x-front[front.length-1]>=44))front.push(x)}
 const back=[];for(let i=0;i+1<front.length;i++){const m=(front[i]+front[i+1])/2;if(front[i+1]-front[i]<70&&free(m))back.push(m)}
 const acts=['clap','cheer','wave','clap','look','cheer','clap','wave','look','clap','cheer','clap'];
 const order=[0,7,2,5,9,3,10,1,8,4,11,6];let s='',n=0;
 // trống hội và chiêng treo giá gỗ đặt ở các khoảng trống phía sau đoàn rước
 const I=FK.ink,drum=(cx,gy)=>`<g><path d="M${cx-34} ${gy}L${cx-26} ${gy-58}M${cx+34} ${gy}L${cx+26} ${gy-58}M${cx-30} ${gy-22}H${cx+30}" stroke="#6b4423" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="${cx}" cy="${gy-66}" rx="36" ry="27" fill="${FK.red}" stroke="${I}" stroke-width="1.8"/><ellipse cx="${cx}" cy="${gy-66}" rx="36" ry="27" fill="none" stroke="${FK.gold}" stroke-width="3" stroke-dasharray="1.5 6"/>
  <ellipse cx="${cx+20}" cy="${gy-66}" rx="12" ry="25" fill="#ead6a4" stroke="${I}" stroke-width="1.4"/><circle cx="${cx+20}" cy="${gy-66}" r="5" fill="${FK.red}" opacity=".5"/>${LN(`M${cx-36} ${gy-66}Q${cx} ${gy-52} ${cx+34} ${gy-66}`,FK.red2,1.2)}</g>`;
 const gongS=(cx,gy)=>`<g>${LN(`M${cx-26} ${gy}V${gy-104}M${cx+26} ${gy}V${gy-104}M${cx-32} ${gy-104}H${cx+32}`,'#6b4423',4.4)}${LN(`M${cx} ${gy-104}V${gy-92}`,I,1.2)}
  <circle cx="${cx}" cy="${gy-68}" r="23" fill="#c99a3c" stroke="${I}" stroke-width="1.6"/><circle cx="${cx}" cy="${gy-68}" r="15" fill="none" stroke="#a87a26" stroke-width="1.4"/><circle cx="${cx}" cy="${gy-68}" r="7" fill="#e2b85a" stroke="${I}" stroke-width="1.2"/></g>`;
 s+=gongS(200,410)+drum(505,416)+drum(915,412);
 back.forEach((x,i)=>{s+=fkVillager(x,398,.27,FK_FOLK[order[(i*5+3)%12]],acts[(i*7+2)%12],n+1);n++});
 front.forEach((x,i)=>{s+=fkVillager(x,422,.305,FK_FOLK[order[(i*7)%12]],acts[(i*5)%12],n+1);n++});
 return s}
function fkSceneMarkup(){FK_REG=[];const crowd=fkCrowd(),proc=fkProcession(true);return {crowd,proc}}

/* ===== BỘ CHẠY HOẠT CẢNH (IK + máy quay + kịch bản 30 giây) =====
   0–5s mở đầu (toàn cảnh, trống hội, bà con chờ) → 5–20s đoàn rước vào và tiến qua sân đình (máy quay đi theo,
   Trạng giơ tay chào giữa đường) → ~20s dừng, Trạng nhìn thẳng khán giả, bảng vinh danh hiện tên thật
   → 26–30s máy quay đẩy cận Trạng → sau đó duy trì, máy quay lùi về trung cảnh.
   Nếu có phim 3D dựng sẵn (/assets/vinhquy/vinh_quy.mp4) thì phát phim, lớp tên vẫn lấy từ dữ liệu thật. */
const VQAnim=(()=>{let S=null;
 const ease=t=>t<0?0:t>1?1:t*t*(3-2*t),D=180/Math.PI,INTRO=5;
 function ik(hx,hy,tx,ty,L1,L2,bend){let dx=tx-hx,dy=ty-hy,d=Math.hypot(dx,dy);const m=L1+L2-.01;if(d>m){dx*=m/d;dy*=m/d;d=m}
  const a=Math.acos(Math.max(-1,Math.min(1,(L1*L1+d*d-L2*L2)/(2*L1*d)))),b=Math.atan2(dy,dx),ka=b-bend*a,kx=hx+L1*Math.cos(ka),ky=hy+L1*Math.sin(ka);
  return {kx,ky,ax:hx+dx,ay:hy+dy,t1:Math.atan2(-(kx-hx),ky-hy)*D,t2:Math.atan2(-(hx+dx-kx),hy+dy-ky)*D}}
 function collect(root){return [...root.querySelectorAll('[data-a]')].map(el=>{const reg=FK_REG[+el.dataset.a]||{};const p={};
   el.querySelectorAll('[data-p]').forEach(g=>{const n=g.dataset.p;if(g.dataset.base===undefined)g.dataset.base=g.getAttribute('transform')||'';(p[n]=p[n]||[]).push({el:g,cx:+(g.dataset.cx||0),cy:+(g.dataset.cy||0),base:g.dataset.base})});
   return {el,reg,p,views:{r34:el.querySelector('[data-v="r34"]'),rF:el.querySelector('[data-v="rF"]'),halo:el.querySelector('[data-v="halo"]')},flag:reg.flag?{paths:[...el.querySelectorAll('[data-fl]')],c:el.querySelector('[data-fc]')}:null}})}
 const set=(a,n,tf)=>{const L=a.p[n];if(L)for(const k of L)k.el.setAttribute('transform',tf)};
 const TR=(x,y,r)=>`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${r.toFixed(2)})`;
 const rotAt=(a,n,deg)=>{const L=a.p[n];if(L)for(const k of L)k.el.setAttribute('transform',`${k.base} rotate(${deg.toFixed(2)} ${k.base?0:k.cx} ${k.base?0:k.cy})`)};
 const blink=(a,n,k)=>{const L=a.p[n];if(L)for(const q of L)q.el.setAttribute('transform',`translate(0 ${q.cy}) scale(1 ${k.toFixed(2)}) translate(0 ${-q.cy})`)};
 function mount(root){stop();const vid=root.querySelector('video.vqv');
  if(vid){S={root,video:vid,title:root.querySelector('#vqTitle'),paused:false,speed:1,nameAt:+(vid.dataset.nameAt||20),raf:0};playVideo(0);ui();S.raf=requestAnimationFrame(vframe);return}
  const svg=root.querySelector('svg.vq');if(!svg)return;
  S={root,svg,proc:svg.querySelector('[data-proc]'),cam:svg.querySelector('[data-cam]'),title:svg.querySelector('#vqTitle'),actors:collect(svg),mode:'intro',paused:false,speed:1,t:0,tm:0,th:0,
   dx:FK_LAYOUT.dx0,v:0,cyc:0,hcyc:0,last:0,raf:0,honorFast:false,camZ:1,camX:600,camY:337,face:0};
  S.audio=root.querySelector('audio.vqa');audioStart(0);root.classList.remove('celebrate');if(S.title)S.title.style.opacity='0';update(0);ui();S.raf=requestAnimationFrame(frame)}
 function play(n){try{if(window.Sfx&&Sfx.play)Sfx.play(n)}catch(e){}}
 function stop(){if(S&&S.raf)cancelAnimationFrame(S.raf);if(S&&S.video)try{S.video.pause()}catch(e){}if(S&&S.audio)try{S.audio.pause()}catch(e){}S=null}
 /* ---- âm thanh: chỉ dùng bản thu trống múa lân (30 giây, đoạn cao trào 18,4–22,3 s trùng lúc vinh danh) ---- */
 const CLIMAX=18.4;let VOL=(()=>{try{const v=parseFloat(localStorage.getItem('udika_vq_vol'));return v>=0&&v<=1?v:.85}catch(e){return .85}})();
 const muted=()=>{try{return typeof Sfx!=='undefined'&&Sfx.isMuted()}catch(e){return false}};
 function audioApply(){const a=S&&S.audio;if(!a)return;a.volume=VOL;a.muted=muted();a.playbackRate=S.speed;try{a.preservesPitch=true}catch(e){}}
 function audioPlay(){const a=S&&S.audio;if(!a||S.manual)return;audioApply();if(S.paused||a.ended)return;const p=a.play();if(p&&p.catch)p.catch(()=>{const once=()=>{document.removeEventListener('pointerdown',once,true);if(S&&S.audio===a&&!S.paused)a.play().catch(()=>{})};document.addEventListener('pointerdown',once,true)})}
 function audioStart(at){const a=S&&S.audio;if(!a)return;try{a.pause();a.currentTime=at}catch(e){}audioPlay()}
 function audioSync(){const a=S&&S.audio;if(!a||S.manual)return;
  if(a.muted!==muted())a.muted=muted();
  if(S.paused){if(!a.paused)a.pause();return}
  if(S.mode==='honor'&&!S._climax){S._climax=1;if(a.currentTime<CLIMAX-.4)audioStart(CLIMAX)}
  if(a.paused&&!a.ended&&a.currentTime>0&&a.currentTime<29.9)audioPlay()}
 /* ---- chế độ phim dựng sẵn ---- */
 function playVideo(at){const v=S.video;try{v.currentTime=at}catch(e){}v.playbackRate=S.speed;v.volume=VOL;v.muted=!!(window.Sfx&&Sfx.isMuted&&Sfx.isMuted());
  const p=v.play();if(p&&p.catch)p.catch(e=>{ /* chỉ thử lại (tắt tiếng) khi trình duyệt CHẶN tự phát; lệnh tạm dừng của MC chen vào (AbortError) thì giữ nguyên dừng */
   if(!S||S.video!==v||S.paused||(e&&e.name==='AbortError'))return;v.muted=true;v.play().catch(()=>{})})}
 function vframe(){if(!S||!S.video)return;if(!S.video.isConnected){stop();return}const ct=S.video.currentTime||0,k=ease((ct-S.nameAt)/0.8);
  if(S.title){S.title.style.opacity=k.toFixed(3);S.title.style.transform=`translateY(${((1-k)*-12).toFixed(1)}px)`}S.root.classList.toggle('celebrate',ct>=S.nameAt);
  if(Math.floor(ct*2)!==S._ui){S._ui=Math.floor(ct*2);ui()}S.raf=requestAnimationFrame(vframe)}
 function command(cmd,v){if(!S)return;
  if(S.video){const V=S.video;
   if(cmd==='pause'){S.paused=true;V.pause()}else if(cmd==='resume'||cmd==='start'){S.paused=false;V.play().catch(()=>{})}else if(cmd==='toggle'){S.paused=!S.paused;S.paused?V.pause():V.play().catch(()=>{})}
   else if(cmd==='honor'){S.paused=false;playVideo(S.nameAt)}else if(cmd==='replay'){S.paused=false;playVideo(0)}
   else if(cmd==='speed'){S.speed=Math.max(.25,Math.min(2,+v||1));V.playbackRate=S.speed}
   else if(cmd==='volume'){VOL=Math.max(0,Math.min(1,+v||0));V.volume=VOL;try{localStorage.setItem('udika_vq_vol',String(VOL))}catch(e){}}
   else if(cmd==='sound'){const b=document.getElementById('soundBtn');if(b)b.click();else if(window.Sfx)Sfx.toggle();V.muted=!!(window.Sfx&&Sfx.isMuted&&Sfx.isMuted())}
   ui();return}
  if(cmd==='start'){S.paused=false}else if(cmd==='pause')S.paused=true;else if(cmd==='resume')S.paused=false;else if(cmd==='toggle')S.paused=!S.paused;
  else if(cmd==='honor'){if(S.mode==='intro'){S.mode='march';S.tm=0}if(S.mode==='march')S.honorFast=true;S.paused=false}
  else if(cmd==='replay'){const r=S.root,sp=S.speed;mount(r);if(S){S.speed=sp;ui()}return}
  else if(cmd==='speed')S.speed=Math.max(.25,Math.min(2,+v||1));
  else if(cmd==='sound'){const b=document.getElementById('soundBtn');if(b)b.click();else if(window.Sfx)Sfx.toggle()}
  else if(cmd==='volume'){VOL=Math.max(0,Math.min(1,+v||0));try{localStorage.setItem('udika_vq_vol',String(VOL))}catch(e){}}
  if(cmd==='pause'||cmd==='resume'||cmd==='toggle'||cmd==='start'){S.paused?S.audio&&S.audio.pause():audioPlay()}
  audioApply();ui()}
 function ui(){if(!S)return;const r=S.root,pb=r.querySelector('[data-vqc="pause"]');if(pb)pb.textContent=S.paused?'▶ Tiếp tục':'⏸ Tạm dừng';
  r.querySelectorAll('[data-vqs]').forEach(b=>b.classList.toggle('on',+b.dataset.vqs===S.speed));const vs=r.querySelector('[data-vqvol]');if(vs&&document.activeElement!==vs)vs.value=String(Math.round(VOL*100));
  const st=r.querySelector('.vq-ctrl .st');
  if(st)st.textContent=S.video?((S.video.currentTime||0)<S.nameAt?'Phim rước Trạng nguyên':'Vinh danh Trạng nguyên'):S.mode==='intro'?'Trống hội – bà con chờ đón':S.mode==='march'?(S.dx>420?'Đoàn rước đang vào sân':'Đoàn rước tiến qua sân đình'):S.mode==='honor'?(S.th<6?'Vinh danh Trạng nguyên':'Cận cảnh Trạng nguyên'):'Hoạt cảnh duy trì';
  const sb=r.querySelector('[data-vqc="sound"]');if(sb&&window.Sfx&&Sfx.isMuted)sb.textContent=Sfx.isMuted()?'🔇 Bật tiếng':'🔊 Tắt tiếng'}
 function frame(now){if(!S)return;if(!S.svg.isConnected){stop();return}
  const raw=S.last?Math.min(.05,(now-S.last)/1000):0;S.last=now;update(S.paused?0:raw*S.speed);if(S&&!S.manual)S.raf=requestAnimationFrame(frame)}
 const WALK={E:64,LIFT:15,ST:.6},HORSE={E:70,LIFTF:20,LIFTH:15,ST:.62};
 function footPath(p,E,lift,st){p=((p%1)+1)%1;if(p<st)return [E/2-(p/st)*E,0,0];const u=(p-st)/(1-st),e=u*u*(3-2*u);return [-E/2+E*e,-lift*Math.sin(Math.PI*u),u]}
 function camera(dt,t){const L=FK_LAYOUT;let z=1,fx=600,fy=337;
  if(S.mode==='intro'){z=1;fx=600;fy=337}
  else if(S.mode==='march'){z=1;fx=600;fy=337}
  else if(S.mode==='honor'&&S.th<6){z=1;fx=600;fy=337}
  else if(S.mode==='honor'){z=1;fx=600;fy=337}
  else{z=1;fx=600;fy=337}
  fx=Math.max(122+480/z,Math.min(1078-480/z,fx));fy=Math.max(100+238/z,Math.min(574-238/z,fy));
  const k=1-Math.exp(-dt*(S.mode==='honor'&&S.th>=6?1.1:1.6));S.camZ+=(z-S.camZ)*k;S.camX+=(fx-S.camX)*k;S.camY+=(fy-S.camY)*k;
  if(dt===0&&S.t===0){S.camZ=z;S.camX=fx;S.camY=fy}
  if(S.cam)S.cam.setAttribute('transform',`translate(600 337) scale(${S.camZ.toFixed(4)}) translate(${(-S.camX).toFixed(2)} ${(-S.camY).toFixed(2)})`)}
 function update(dt){S.t+=dt;const t=S.t,VMAX=83;let target=0;
  if(S.mode==='intro'&&t>=INTRO){S.mode='march';S.tm=0;ui()}
  if(S.mode==='march'){S.tm+=dt;const boost=S.honorFast?4.5:1;target=VMAX*boost*Math.min(1,S.tm/1.6)*Math.max(.16,Math.min(1,Math.sqrt(S.dx/(S.honorFast?320:260))));
   if(S.dx<=.5){S.dx=0;target=0;S.mode='honor';S.th=0;S.root.classList.add('celebrate');ui()}}
  S.v+=(target-S.v)*Math.min(1,dt*3);if(S.mode!=='march')S.v=Math.max(0,S.v-dt*120);S.dx=Math.max(0,S.dx-S.v*dt);
  if(S.proc)S.proc.setAttribute('transform',`translate(${(-S.dx).toFixed(2)} 0)`);
  const A=Math.min(1.35,S.v/58),Ah=A;
  S.cyc+=dt*(S.v>VMAX*1.3?S.v/(WALK.E*FK_LAYOUT.WS*1.3/WALK.ST):VMAX/(WALK.E*FK_LAYOUT.WS*1.31/WALK.ST));
  S.hcyc+=dt*(S.v>VMAX*1.3?S.v/(HORSE.E*FK_LAYOUT.HS*1.3/HORSE.ST):VMAX/(HORSE.E*FK_LAYOUT.HS*1.31/HORSE.ST));
  if(S.mode==='honor'){S.th+=dt;if(S.th>14){S.mode='hold';S.th=0;ui()}if(Math.floor(S.th)===6&&!S._cu){S._cu=1;ui()}}else if(S.mode==='hold')S.th+=dt;
  camera(dt,t);audioSync();
  if(S.title){const k=S.mode==='march'||S.mode==='intro'?0:ease(((S.mode==='honor'?S.th:9)-1.2)/0.8);S.title.style.opacity=k.toFixed(3);S.title.style.transform=`translateY(${((1-k)*-14).toFixed(1)}px)`}
  if(Math.floor(t*2)!==S._ui){S._ui=Math.floor(t*2);ui()}
  const excite=S.mode==='intro'?.55:S.mode==='march'?.85:1.25;
  // Trạng nhìn thẳng khán giả khi vinh danh và khi được đẩy cận; khi đi thì nghiêng 3/4 chào hai bên
  const faceT=(S.mode==='honor'&&S.th>.5)||(S.mode==='hold'&&(S.th%16)<5)?1:0;S.face+=(faceT-S.face)*Math.min(1,dt*7);
  for(const a of S.actors){const R=a.reg;
   if(R.kind==='w'){const E=WALK.E*Math.min(A,1.3),ph=S.cyc+R.off;
    const hipBob=-3.2*Math.min(1,A)*Math.cos(ph*Math.PI*4)-.6*(1-Math.min(1,A))*Math.sin(t*1.6+R.off*9),hy=-HUM.HIP+hipBob;
    for(const [leg,o,hx] of [['lf',0,5],['lb',.5,-5]]){const [fx,fy,u]=footPath(ph+o,E,WALK.LIFT*Math.min(1,A),WALK.ST);
     const k=ik(hx,hy,hx+fx,-HUM.ANK+fy,HUM.L1,HUM.L2,1);set(a,leg+'th',TR(hx,hy,k.t1));set(a,leg+'sh',TR(k.kx,k.ky,k.t2));
     const fa=fy<0?(-22*Math.sin(Math.PI*u)+8*Math.sin(Math.PI*u*2))*Math.min(1,A):0;set(a,leg+'ft',TR(k.ax,k.ay,fa))}
    const sw=Math.sin(ph*Math.PI*2),Ac=Math.min(1,A);
    set(a,'torso',TR(0,hy,1.4*Ac*sw+2*Ac+.5*(1-Ac)*Math.sin(t*1.1+R.off*7)));
    rotAt(a,'head',(Ac>.2?-2*sw:0)+2.6*Math.sin(t*.7+R.off*5)+(1-Ac)*2*Math.sin(t*.33+R.off*3));
    rotAt(a,'sash',6*Math.sin(ph*Math.PI*4+.6)*Ac+4*Math.sin(t*2.1+R.off*4));rotAt(a,'tas',8*Math.sin(t*2.4+R.off*5));
    rotAt(a,'prop',1.8*Ac*Math.sin(ph*Math.PI*2+.8)+.8*Math.sin(t*1.2+R.off*6));rotAt(a,'rib1',8*Math.sin(t*2.2+R.off*4));rotAt(a,'rib2',-8*Math.sin(t*2.5+R.off*3+1));
    if(R.free){rotAt(a,'armU',-22*Ac*sw+3*(1-Ac)*Math.sin(t*.9));rotAt(a,'armL',-14-10*Ac*Math.max(0,sw))}
    const bl=(t*.31+R.off)%1;blink(a,'eye',bl<.03?.12:1);
    if(a.flag){const amp=4+4*Ac+1.4*Math.sin(t*.6),ph2=t*(3.2+1.8*Ac);const g=R.flag;
     a.flag.paths[0].setAttribute('d',g.path(ph2,amp,0,true));a.flag.paths[1].setAttribute('d',g.path(ph2,amp,.08,false));a.flag.paths[2].setAttribute('d',g.path(ph2,amp,.17,false));a.flag.paths[3].setAttribute('d',g.path(ph2,amp,.24,false));
     const c=g.center(ph2,amp);a.flag.c.setAttribute('transform',`translate(${c[0].toFixed(1)} ${c[1].toFixed(1)})`)}
   }else if(R.kind==='h'){const P=S.hcyc,E=HORSE.E*Math.min(Ah,1.3),Ac=Math.min(1,Ah),idle=1-Ac;
    const bob=-2.6*Ac*Math.cos(P*Math.PI*4)-.8*idle*Math.sin(t*1.2),pitch=.8*Ac*Math.sin(P*Math.PI*4+.6)+.3*idle*Math.sin(t*.5);
    set(a,'hbody',`translate(0 ${bob.toFixed(2)}) rotate(${pitch.toFixed(2)} 0 -160)`);
    const rad=pitch/D,cs=Math.cos(rad),sn=Math.sin(rad),tp=(x,y)=>{const yy=y+160;return [x*cs-yy*sn,x*sn+yy*cs-160+bob]};
    for(const [n,off,front,base] of [['Hn',0,false,HRS.Hd],['Fn',.25,true,HRS.F],['Hf',.5,false,HRS.Hf],['Ff',.75,true,HRS.Ff]]){
     const [jx,jy]=tp(base[0],base[1]),[fx,fy]=footPath(P+off,E,(front?HORSE.LIFTF:HORSE.LIFTH)*Ac,HORSE.ST);
     const L1=front?HRS.FL1:HRS.HL1,L2=front?HRS.FL2:HRS.HL2,k=ik(jx,jy,base[0]+fx,-HRS.FET+fy,L1,L2,front?1:-1);
     set(a,'h'+n+'u',TR(jx,jy,k.t1));set(a,'h'+n+'l',TR(k.kx,k.ky,k.t2))}
    const nod=Ac*3.2*Math.sin(P*Math.PI*4+.9)+idle*(1.8*Math.sin(t*.8)+(Math.sin(t*.29)>.86?5*Math.sin(t*5):0));
    rotAt(a,'neck',nod);rotAt(a,'hhead',idle*2.4*Math.sin(t*.5+1)+Ac*1.5*Math.sin(P*Math.PI*4));
    rotAt(a,'ear',(Math.sin(t*.41)>.9?-14:0)+2*Math.sin(t*3));
    rotAt(a,'tail',5+5*Math.sin(t*1.6)+3*Ac*Math.sin(P*Math.PI*4)+idle*Math.max(0,Math.sin(t*.5))*10);rotAt(a,'tail2',8*Math.sin(t*2+.8));
    rotAt(a,'tasH',10*Math.sin(t*2.3+P*6));rotAt(a,'tasC',9*Math.sin(t*2+P*4));
    const rb=-1.6*Ac*Math.cos(P*Math.PI*4-.5);set(a,'rider',`translate(6 ${(-214+rb).toFixed(2)})`);
    rotAt(a,'rtorso',.8*Ac*Math.sin(P*Math.PI*4-.3)+.4*idle*Math.sin(t*.7));
    // giơ tay chào: giữa đường đi (12–17s) và khi vinh danh; chào lại định kỳ khi duy trì
    let th=-1;if(S.mode==='march'&&S.tm>8&&S.tm<13.5)th=S.tm-8;else if(S.mode==='honor')th=S.th;else if(S.mode==='hold')th=S.th%11;
    let up=0;if(th>=0)up=ease((th-.3)/.8)*(1-ease((th-(S.mode==='honor'?8.5:4.4))/.9));
    rotAt(a,'rarmU',-114*up+(up>.9?4*Math.sin(th*6):0)+(1-up)*1.5*Math.sin(t*1.4));rotAt(a,'rarmL',26*up+(up>.9?16*Math.sin(th*6+.5):0));
    if(a.views.r34){a.views.r34.style.opacity=(1-S.face).toFixed(2);a.views.rF.style.opacity=S.face.toFixed(2)}
    if(a.views.halo){const hk=S.mode==='honor'?ease((S.th-1)/1.2):S.mode==='hold'?1:0;a.views.halo.style.opacity=(hk*(.75+.25*Math.sin(t*1.3))).toFixed(2)}
    rotAt(a,'rhead',S.face>.5?1.5*Math.sin(t*.9):S.mode==='march'?6*Math.sin(t*.42)-1:4*Math.sin(t*.4));
    rotAt(a,'wingL',2.4*Math.sin(t*5+P*3));rotAt(a,'wingR',-2.4*Math.sin(t*5+P*3+.4));
    const bl=(t*.27)%1;blink(a,'eye',bl<.03?.12:1);
   }else if(R.kind==='v'){const ph=R.ph,I=excite*R.tempo;
    if(R.act==='clap'){const q=(t*1.9*I+ph/6.283)%1,c=q<.5?Math.pow(Math.sin(q*Math.PI*2),.7):0;rotAt(a,'armL',3+26*(1-Math.pow(1-c,2))*(q<.5?1:0));rotAt(a,'armR',-3-26*(1-Math.pow(1-c,2))*(q<.5?1:0))}
    else if(R.act==='cheer'){const c=Math.sin(t*Math.PI*2*(1.1*I)+ph);rotAt(a,'armL',4-8*c);rotAt(a,'armR',-4+8*c)}
    else if(R.act==='wave'){rotAt(a,'armR',20*Math.sin(t*Math.PI*2*1.3*I+ph));rotAt(a,'armL',2*Math.sin(t+ph))}
    else{const c=.5+.5*Math.sin(t*Math.PI*2*1.6*I+ph);rotAt(a,'armL',2+12*c);rotAt(a,'armR',-2-12*c)}
    const look=Math.max(-1,Math.min(1,((1200-FK_LAYOUT.HX)+S.dx-R.x)/420));
    rotAt(a,'head',(R.act==='look'?10:4)*look+2*Math.sin(t*1.3+ph));
    set(a,'bob',`translate(0 ${(-(I>1?8:I>.7?5:3)*Math.abs(Math.sin(t*Math.PI*(1.05*I)+ph))).toFixed(2)})`);
    const bl=(t/R.blink+ph)%1;blink(a,'eye',bl<.05?.2:1)}
  }}
 /* V15: chụp vị trí phim/hoạt cảnh để màn LED tải lại trang giữa chừng CHẠY TIẾP đúng chỗ, không chiếu lại từ đầu */
 const SNAPK=['t','tm','th','dx','v','cyc','hcyc','camZ','camX','camY','face'];
 function snapshot(){if(!S)return null;if(S.video)return {kind:'video',time:+(S.video.currentTime||0).toFixed(2),paused:!!S.paused,speed:S.speed};
  const o={kind:'anim',mode:S.mode,paused:!!S.paused,speed:S.speed,honorFast:!!S.honorFast,climax:!!S._climax,cu:!!S._cu};for(const k of SNAPK)o[k]=+(+S[k]||0).toFixed(3);return o}
 function seek(o,elapsed){if(!S||!o||typeof o!=='object')return false;const el=Math.max(0,Math.min(600,+elapsed||0));S.speed=Math.max(.25,Math.min(2,+o.speed||1));S.paused=!!o.paused;
  if(S.video){if(o.kind!=='video')return false;const V=S.video,at=Math.max(0,(+o.time||0)+el);
   const t0=performance.now();let tries=0;
   const go=()=>{if(!S||S.video!==V)return;const d=V.duration;const t=Number.isFinite(d)&&d>0?Math.min(at,Math.max(0,d-.05)):at;
    const want=S.paused?t:Math.min(Number.isFinite(d)&&d>0?d-.05:t,t+(performance.now()-t0)/1000*S.speed); /* thời gian trôi trong lúc chờ nạp phim */
    if(S.paused){try{V.currentTime=want}catch(e){}V.pause()}else playVideo(want);ui();
    /* Chrome có thể còn lệnh tua về 0 (từ lúc dựng phim) chạy SAU lệnh tua này → kiểm lại khi phim đã sẵn sàng, lệch thì tua lại (tối đa 3 lần) */
    setTimeout(()=>{if(!S||S.video!==V||++tries>3)return;const exp=S.paused?want:want+0.9*S.speed;if(Math.abs((V.currentTime||0)-exp)>1.5)go()},900)};
   if(V.readyState>=2)go();else V.addEventListener('loadeddata',go,{once:true});return true}
  if(o.kind!=='anim'||!['intro','march','honor','hold'].includes(o.mode))return false;
  S.mode=o.mode;for(const k of SNAPK)if(Number.isFinite(+o[k]))S[k]=+o[k];S.honorFast=!!o.honorFast;S._climax=o.climax?1:0;S._cu=o.cu?1:0;S.last=0;
  S.root.classList.toggle('celebrate',S.mode==='honor'||S.mode==='hold');
  let left=el;while(left>0){const d=Math.min(.05,left);update(d);left-=d}update(0);
  /* tiếng trống theo đúng chỗ: đang đi rước → theo thời gian; vinh danh → đoạn cao trào; đã duy trì → bản thu đã hết */
  const a=S.audio;if(a){const at=S.mode==='honor'?CLIMAX+S.th:S.mode==='hold'?30:S.t;if(at<29.9){S._climax=S.mode==='honor'?1:S._climax;audioStart(at)}else{try{a.pause();a.currentTime=Math.min(a.duration||30,30)}catch(e){}}}
  ui();return true}
 return {mount,command,stop,snapshot,seek,step(dt,n=1){if(!S||S.video)return;S.manual=true;cancelAnimationFrame(S.raf);for(let k=0;k<n;k++)update(dt*S.speed)},state:()=>S&&(S.video?{mode:'video',time:S.video.currentTime,paused:S.paused,speed:S.speed}:{mode:S.mode,dx:S.dx,v:S.v,paused:S.paused,speed:S.speed,t:S.t,cam:[S.camZ,S.camX,S.camY]})};
})();
window.VQAnim=VQAnim;
