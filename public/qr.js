'use strict';
/* UDIKA – Tạo mã QR ngay trong trình duyệt, không cần Internet hay dịch vụ ngoài.
   Chuẩn ISO/IEC 18004: chế độ byte (UTF-8), mức sửa lỗi M (~15%), phiên bản 1–40 tự chọn, chọn mặt nạ theo điểm phạt.
   Dùng: QR.svg('https://…', {size:200}) → chuỗi <svg>; QR.matrix(text) → mảng 2 chiều true/false. */
const QR=(()=>{
 const ECC_M=[-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28];
 const BLK_M=[-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49];
 const rawModules=v=>{let r=(16*v+128)*v+64;if(v>=2){const n=Math.floor(v/7)+2;r-=(25*n-10)*n-55;if(v>=7)r-=36}return r};
 const dataCodewords=v=>Math.floor(rawModules(v)/8)-ECC_M[v]*BLK_M[v];
 function gfMul(x,y){let z=0;for(let i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11D);z^=((y>>>i)&1)*x}return z&255}
 function rsDivisor(deg){const r=new Array(deg).fill(0);r[deg-1]=1;let root=1;for(let i=0;i<deg;i++){for(let j=0;j<deg;j++){r[j]=gfMul(r[j],root);if(j+1<deg)r[j]^=r[j+1]}root=gfMul(root,2)}return r}
 function rsRemainder(data,div){const r=new Array(div.length).fill(0);for(const b of data){const f=b^r.shift();r.push(0);div.forEach((c,i)=>r[i]^=gfMul(c,f))}return r}
 function alignPos(v,size){if(v===1)return [];const n=Math.floor(v/7)+2,step=v===32?26:Math.ceil((v*4+4)/(n*2-2))*2;const r=[6];for(let p=size-7;r.length<n;p-=step)r.splice(1,0,p);return r}
 function encode(text){
  const bytes=[...new TextEncoder().encode(String(text))];let v=1;
  for(;v<=40;v++){const cc=v<10?8:16;if(4+cc+bytes.length*8<=dataCodewords(v)*8)break}
  if(v>40)throw Error('Nội dung quá dài cho mã QR');
  const bits=[];const put=(val,len)=>{for(let i=len-1;i>=0;i--)bits.push((val>>>i)&1)};
  put(4,4);put(bytes.length,v<10?8:16);for(const b of bytes)put(b,8);
  const cap=dataCodewords(v)*8;put(0,Math.min(4,cap-bits.length));put(0,(8-bits.length%8)%8);
  const data=[];for(let i=0;i<bits.length;i+=8){let b=0;for(let k=0;k<8;k++)b=b<<1|bits[i+k];data.push(b)}
  for(let p=0xEC;data.length<cap/8;p^=0xEC^0x11)data.push(p);
  // chia khối + mã Reed–Solomon + đan xen
  const nb=BLK_M[v],ecl=ECC_M[v],raw=Math.floor(rawModules(v)/8),nShort=nb-raw%nb,shortLen=Math.floor(raw/nb),div=rsDivisor(ecl);const blocks=[];
  for(let i=0,k=0;i<nb;i++){const len=shortLen-ecl+(i<nShort?0:1);const d=data.slice(k,k+len);k+=len;const e=rsRemainder(d,div);if(i<nShort)d.push(null);blocks.push(d.concat(e))}
  const out=[];for(let i=0;i<blocks[0].length;i++)blocks.forEach((b,j)=>{if(i!==shortLen-ecl||j>=nShort)out.push(b[i])});
  // vẽ mẫu cố định
  const size=v*4+17,M=Array.from({length:size},()=>new Array(size).fill(false)),F=Array.from({length:size},()=>new Array(size).fill(false));
  const set=(x,y,d)=>{M[y][x]=d;F[y][x]=true};
  for(let i=0;i<size;i++){set(6,i,i%2===0);set(i,6,i%2===0)}
  const finder=(x,y)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const xx=x+dx,yy=y+dy,d=Math.max(Math.abs(dx),Math.abs(dy));if(xx>=0&&xx<size&&yy>=0&&yy<size)set(xx,yy,d!==2&&d!==4)}};
  finder(3,3);finder(size-4,3);finder(3,size-4);
  const ap=alignPos(v,size);for(const ax of ap)for(const ay of ap){if((ax===6&&ay===6)||(ax===6&&ay===size-7)||(ax===size-7&&ay===6))continue;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(ax+dx,ay+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1)}
  const drawFormat=mask=>{const d=(0<<3)|mask;let r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);const b=((d<<10)|r)^0x5412,bit=i=>((b>>>i)&1)===1;
   for(let i=0;i<=5;i++)set(8,i,bit(i));set(8,7,bit(6));set(8,8,bit(7));set(7,8,bit(8));for(let i=9;i<15;i++)set(14-i,8,bit(i));
   for(let i=0;i<8;i++)set(size-1-i,8,bit(i));for(let i=8;i<15;i++)set(8,size-15+i,bit(i));set(8,size-8,true)};
  drawFormat(0);
  if(v>=7){let r=v;for(let i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1F25);const b=(v<<12)|r;for(let i=0;i<18;i++){const d=((b>>>i)&1)===1,a=size-11+i%3,c=Math.floor(i/3);set(a,c,d);set(c,a,d)}}
  // đặt dữ liệu theo đường zigzag
  let i=0;for(let right=size-1;right>=1;right-=2){if(right===6)right=5;for(let vert=0;vert<size;vert++)for(let j=0;j<2;j++){const x=right-j,up=((right+1)&2)===0,y=up?size-1-vert:vert;
   if(!F[y][x]&&i<out.length*8){M[y][x]=((out[i>>>3]>>>(7-(i&7)))&1)===1;i++}}}
  const MASKS=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,(x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0];
  const apply=m=>{for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(!F[y][x]&&MASKS[m](x,y))M[y][x]=!M[y][x]};
  // điểm phạt chuẩn (quy tắc 1–4, đếm cả viền sáng như mẫu tham chiếu của Nayuki)
  const addH=(len,rh)=>{if(rh[0]===0)len+=size;rh.pop();rh.unshift(len)};
  const cntP=rh=>{const n=rh[1],core=n>0&&rh[2]===n&&rh[3]===n*3&&rh[4]===n&&rh[5]===n;return (core&&rh[0]>=n*4&&rh[6]>=n?1:0)+(core&&rh[6]>=n*4&&rh[0]>=n?1:0)};
  const penalty=()=>{let p=0;
   for(let pass=0;pass<2;pass++)for(let a=0;a<size;a++){let col=false,run=0;const rh=[0,0,0,0,0,0,0];
    for(let b=0;b<size;b++){const c=pass?M[b][a]:M[a][b];if(c===col){run++;if(run===5)p+=3;else if(run>5)p++}else{addH(run,rh);if(!col)p+=cntP(rh)*40;col=c;run=1}}
    if(col){addH(run,rh);run=0}run+=size;addH(run,rh);p+=cntP(rh)*40}
   let dark=0;for(let y=0;y<size;y++)for(let x=0;x<size;x++){if(M[y][x])dark++;if(x<size-1&&y<size-1&&M[y][x]===M[y][x+1]&&M[y][x]===M[y+1][x]&&M[y][x]===M[y+1][x+1])p+=3}
   const tot=size*size;return p+(Math.ceil(Math.abs(dark*20-tot*10)/tot)-1)*10};
  let best=0,bestP=Infinity;for(let m=0;m<8;m++){apply(m);drawFormat(m);const p=penalty();if(p<bestP){bestP=p;best=m}apply(m)}
  apply(best);drawFormat(best);return M;
 }
 function svg(text,o={}){const M=encode(text),n=M.length,q=4,sz=o.size||200;let d='';
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(M[y][x])d+=`M${x+q} ${y+q}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n+2*q} ${n+2*q}" width="${sz}" height="${sz}" shape-rendering="crispEdges" role="img" aria-label="${o.label||'Mã QR'}"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="${o.color||'#000'}"/></svg>`}
 return {matrix:encode,svg};
})();
if(typeof module!=='undefined')module.exports=QR;
