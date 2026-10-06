/* ---------- IC / connector (kind U, J for an in-line connector): body box Uxx at (x,y) + free pads
   c.pads=[{x,y,net}] in world; pads are numbered counter-clockwise from pin 1 as seen on screen at placement */
const ICPAT={ q4:[L('4 стороны (QFP / QFN)','4 sides (QFP / QFN)'),'QFP'],
  d2:[L('2 стороны (SO / DIP)','2 sides (SO / DIP)'),'2×'],
  l1:[L('в линию — разъём','in-line — connector'),'1×'] };
/* SOT-23 (TO-236): body L×W, pad centres (local mm, pin 1, 2, 3), land pad size */
const SOT23={L:2.9,W:1.3,pads:[{x:-.95,y:1.0},{x:.95,y:1.0},{x:0,y:-1.0}],pw:.6,ph:.7};
const isSOT=c=>c&&c.pat==='sot23';
const ICPATNAME=k=>(k==='sot23'||SOTN[k])?L('транзистор','transistor'):(ICPAT[k]||ICPAT[k==='d2v'||k==='d2h'?'d2':''])?.[0]||'';   /* old saves: d2v / d2h */
/* placement orientation (screen degrees, CW): rot 0 = pins on left/right (2 sides), pin 1 top-left */
let icRot=0, placing=false, icPin0=1;   /* icPin0: start pin of an in-line connector */   /* placing: «Поставить» armed inside the K mode */
const isIC=c=>!!c.pads;
const pinNo=(c,i)=>(Number.isFinite(c.pin0)?c.pin0:1)+i;   /* pin label: start pin + index */
function icLayout(pat,n,x0,y0,x1,y1){ /* screen rect -> pad screen points, CCW from pin 1 */
  const lerp=(a,b,t)=>a+(b-a)*t, f=(i,k)=>k>1?i/(k-1):.5, out=[];
  if(pat==='l1'){ const hor=x1-x0>=y1-y0;
    for(let i=0;i<n;i++) out.push(hor?{x:lerp(x0,x1,f(i,n)),y:(y0+y1)/2}:{x:(x0+x1)/2,y:lerp(y0,y1,f(i,n))}); return out; }
  if(pat==='s3') return [{x:x0,y:y1},{x:x1,y:y1},{x:(x0+x1)/2,y:y0}];   /* SOT: pins 1.. along the bottom, the rest back along the top */
  if(pat==='s5') return [{x:x0,y:y1},{x:(x0+x1)/2,y:y1},{x:x1,y:y1},{x:x1,y:y0},{x:x0,y:y0}];
  if(pat==='s6') return [{x:x0,y:y1},{x:(x0+x1)/2,y:y1},{x:x1,y:y1},{x:x1,y:y0},{x:(x0+x1)/2,y:y0},{x:x0,y:y0}];
  if(pat==='q4'){ const k=[0,1,2,3].map(j=>Math.floor(n/4)+(j<n%4?1:0)), g=(i,kk)=>(i+1)/(kk+1);
    for(let i=0;i<k[0];i++) out.push({x:x0,y:lerp(y0,y1,g(i,k[0]))});   /* left, down  */
    for(let i=0;i<k[1];i++) out.push({x:lerp(x0,x1,g(i,k[1])),y:y1});   /* bottom, right */
    for(let i=0;i<k[2];i++) out.push({x:x1,y:lerp(y1,y0,g(i,k[2]))});   /* right, up  */
    for(let i=0;i<k[3];i++) out.push({x:lerp(x1,x0,g(i,k[3])),y:y0});   /* top, left  */
    return out; }
  const a=Math.ceil(n/2), b=n-a;
  if(pat==='d2'||pat==='d2v'){ for(let i=0;i<a;i++) out.push({x:x0,y:lerp(y0,y1,f(i,a))});
                   for(let i=0;i<b;i++) out.push({x:x1,y:lerp(y1,y0,f(i,b))}); }
  else {           for(let i=0;i<a;i++) out.push({x:lerp(x0,x1,f(i,a)),y:y1});
                   for(let i=0;i<b;i++) out.push({x:lerp(x1,x0,f(i,b)),y:y0}); }
  return out;
}
function icSizeLabel(pat,n){ if(SOTN[pat]) return 'SOT23-'+SOTN[pat]; return pat==='q4'?'QFP-'+n:pat==='l1'?'1×'+n:'2×'+Math.ceil(n/2); }
/* placement frame in the rotated axes: start corner s, opposite corner e (vp px) -> local rect + mapper back to screen */
function icFrame(sx,sy,ex,ey){
  const a=icRot*Math.PI/180, d=rotV({x:ex-sx,y:ey-sy},-a);
  const x0=Math.min(0,d.x), x1=Math.max(0,d.x), y0=Math.min(0,d.y), y1=Math.max(0,d.y);
  const toS=q=>{ const v=rotV(q,a); return {x:sx+v.x,y:sy+v.y}; };
  return {x0,y0,x1,y1,toS, corners:[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}].map(toS)};
}
const icN=()=>Math.max(1,Math.min(400,icPins|0));
const SOTN={s3:3,s5:5,s6:6};
const frameKind=()=>compKind==='U'||compKind==='Q';   /* parts placed with a frame over the pins */
const plPat=()=>compKind==='Q'?sotPat:icPat, plN=()=>compKind==='Q'?SOTN[sotPat]:icN();
function addIC(f){ /* placement frame -> new IC with pads on its border */
  const r=vp.getBoundingClientRect(), W=q=>worldFromEvent({clientX:r.left+q.x,clientY:r.top+q.y});
  const pat=plPat(), n=plN(), kind=compKind==='Q'?'Q':pat==='l1'?'J':'U';
  compSeq[kind]=compSeq[kind]||1;
  const ctr=W(f.toS({x:(f.x0+f.x1)/2,y:(f.y0+f.y1)/2}));
  const c={id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), kind, pat,
    size:icSizeLabel(pat,n), side:compSide, x:ctr.x, y:ctr.y, rot:0, des:kind+(compSeq[kind]++),
    val:compVal[kind]||'', pads:icLayout(pat,n,f.x0,f.y0,f.x1,f.y1).map(q=>({...W(f.toS(q)),net:null})),
    ...(pat==='l1'&&icPin0!==1?{pin0:icPin0}:{})};
  autoPins(c); comps.push(c);
  if(!showSide[c.side]) showSide[c.side]=true;
  selComp=c.id; renderComps(); drawMarks(); save();
}
const icPadR0=()=>mmScale?Math.max(mmScale*.45,4/Math.abs(view.z)):10/Math.abs(view.z);
/* world pick radius of a part's pad: never more than half the distance to its nearest neighbour (small SOT / SC70) */
function icPadR(c){ const R=icPadR0(); if(!c||!c.pads||c.pads.length<2) return R; let d=Infinity;
  c.pads.forEach((a,i)=>{ for(let j=i+1;j<c.pads.length;j++) d=Math.min(d,Math.hypot(a.x-c.pads[j].x,a.y-c.pads[j].y)); });
  return Math.min(R,d*.5); }
/* NET name inside a pad: font shrinks to fit w×h (screen px), skipped when it would be unreadable */
function padNet(cx,cy,w,h,nc,hot){
  if(!nc||!nc.name) return;
  const fs=Math.min(9,(w-2)/(nc.name.length*.62),h*.9); if(fs<4.5) return;
  const t=svg('text',{x:cx,y:cy,fill:nc.color,stroke:haloFor(nc.color),'stroke-width':Math.max(1.2,fs*.32),'paint-order':'stroke',
    'font-size':fs.toFixed(2),'font-weight':500,'text-anchor':'middle','dominant-baseline':'central','font-family':'IBM Plex Mono, monospace'});
  t.textContent=nc.name; if(hot) t.setAttribute('data-hot',''); marks.appendChild(t);
}
function icBox(c){ const p=screenOf(c), w=Math.max(30,c.des.length*7.6+12); return {p,w,h:17}; }
/* pad index groups per package side, in icLayout order (pin 1 first) */
function icSides(c){ const n=c.pads.length, ix=(a,b)=>Array.from({length:b-a},(_,i)=>a+i);
  if(c.pat==='l1') return [ix(0,n)];
  if(c.pat==='s3') return [ix(0,2),ix(2,n)];
  if(c.pat==='s5'||c.pat==='s6') return [ix(0,3),ix(3,n)];
  if(c.pat==='q4'){ const k=[0,1,2,3].map(j=>Math.floor(n/4)+(j<n%4?1:0)); let o=0;
    return k.map(kk=>{ const r=ix(o,o+kk); o+=kk; return r; }).filter(g=>g.length); }
  const h=Math.ceil(n/2); return [ix(0,h),ix(h,n)].filter(g=>g.length);
}
/* label text along direction nv from point q: never upside down */
function dirText(q,nv,str,fs,fill,halo,hot){
  let ang=Math.atan2(nv.y,nv.x)*180/Math.PI, anchor='start';
  if(ang>90||ang<=-90){ ang+=180; anchor='end'; }
  const t=svg('text',{x:q.x,y:q.y,fill,stroke:halo,'stroke-width':Math.max(1.4,fs*.34),'paint-order':'stroke',
    'font-size':fs.toFixed(2),'font-weight':500,'text-anchor':anchor,'dominant-baseline':'central',
    'font-family':'IBM Plex Mono, monospace',transform:`rotate(${ang.toFixed(2)} ${q.x} ${q.y})`});
  t.textContent=str; if(hot) t.setAttribute('data-hot',''); marks.appendChild(t);
}
/* IC pad geometry on screen: pad centres, row axis U / label normal N per pad, pitch, pad sizes */
function icGeom(c){
  const b=icBox(c), P=c.pads.map(q=>screenOf(q)), n=P.length, conn=c.pat==='l1';
  const C=P.reduce((a,q)=>({x:a.x+q.x/n,y:a.y+q.y/n}),{x:0,y:0});
  const nrm=v=>{ const d=Math.hypot(v.x,v.y); return d>1e-6?{x:v.x/d,y:v.y/d}:null; };
  const dot=(a,v)=>a.x*v.x+a.y*v.y, sub=(a,q)=>({x:a.x-q.x,y:a.y-q.y});
  const sides=icSides(c), U=[], N=[]; let pitch=Infinity, depth=Infinity;
  sides.forEach(g=>{
    for(let i=1;i<g.length;i++) pitch=Math.min(pitch,Math.hypot(P[g[i]].x-P[g[i-1]].x,P[g[i]].y-P[g[i-1]].y));
    let u=g.length>1&&nrm(sub(P[g[g.length-1]],P[g[0]]));
    if(!u){ const d=nrm(sub(C,P[g[0]])); u=d?{x:-d.y,y:d.x}:{x:0,y:1}; }
    let nv={x:-u.y,y:u.x};
    if(conn){ /* label side of a connector: right (= below for a horizontal row) / left */
      const right=Math.abs(nv.x)>.3?nv.x>0:nv.y>0; if(right!==(c.ls!=='l')) nv={x:-nv.x,y:-nv.y}; }
    else{ if(dot(sub(C,P[g[0]]),nv)<0) nv={x:-nv.x,y:-nv.y};   /* inward */
      depth=Math.min(depth,Math.max(...P.map(q=>dot(sub(q,P[g[0]]),nv)))); }
    g.forEach(i=>{ U[i]=u; N[i]=nv; }); });
  if(c.pat==='s3') pitch/=2;
  if(!Number.isFinite(pitch)) pitch=20;
  /* pad size on screen follows the pitch and the body size */
  const round=conn&&c.ps!=='rect';
  const pw=conn?pitch*.7:Math.max(4,pitch*.55);
  const sot=!!SOTN[c.pat];   /* SOT: long pads, half the row distance */
  const pl=conn?pitch*1.1:sot&&Number.isFinite(depth)?depth*.45:Math.max(6,Math.min(pitch*1.5,(Number.isFinite(depth)?depth:pitch*6)*.28));
  const rr=Math.max(5,Math.min(22,pitch*.42)), half=round?rr:pl/2;
  return {b,P,n,conn,C,U,N,pitch,depth,round,pw,pl,rr,half,dot,sub};
}
function drawIC(c,col,isSel){
  const {b,P,n,conn,C,U,N,pitch,depth,round,pw,pl,rr,half,dot,sub}=icGeom(c);
  if(!conn&&Number.isFinite(depth)&&U[0]){   /* body: inner edges of the pad rows */
    const u0=U[0], v0=N[0], S=P.map(q=>dot(sub(q,C),u0)), T=P.map(q=>dot(sub(q,C),v0));
    const s0=Math.min(...S), s1=Math.max(...S), t0=Math.min(...T)+pl/2, t1=Math.max(...T)-pl/2;
    const [a0,a1]=c.pat==='q4'?[s0+pl/2,s1-pl/2]:[s0-pitch*.6,s1+pitch*.6];
    const at=(x,y)=>(C.x+u0.x*x+v0.x*y)+','+(C.y+u0.y*x+v0.y*y);
    marks.appendChild(svg('polygon',{points:[at(a0,t0),at(a1,t0),at(a1,t1),at(a0,t1)].join(' '),fill:'rgba(10,14,12,.16)',
      stroke:isSel?'#fff':col,'stroke-width':isSel?1.8:1.2,...(isSel?{'stroke-dasharray':'5 3'}:{})}));
  }
  if(isSel&&!conn) P.forEach(q=>marks.appendChild(svg('line',{x1:b.p.x,y1:b.p.y,x2:q.x,y2:q.y,stroke:'#fff',
    'stroke-width':1,opacity:.5})));                      /* leads to the body box — only while selected */
  const room=conn?220:(Number.isFinite(depth)?depth/2-pl/2-6:120);
  c.pads.forEach((pd,i)=>{ const q=P[i], u=U[i], nv=N[i], nc=pd.net&&nets.find(x=>x.id===pd.net), hot=nc&&hlNet===nc.id;
    const st=nc?nc.color:(isSel?'#fff':col), sw=hot?2.4:(isSel?1.8:1.3), f1=i===0?'rgba(255,255,255,.22)':'none';   /* pin 1 tinted */
    let pe;
    if(round) pe=svg('circle',{cx:q.x,cy:q.y,r:rr,fill:f1,stroke:st,'stroke-width':sw});
    else{ const cn=[[1,1],[1,-1],[-1,-1],[-1,1]].map(([a,e])=>(q.x+u.x*pw/2*a+nv.x*pl/2*e)+','+(q.y+u.y*pw/2*a+nv.y*pl/2*e));
      pe=svg('polygon',{points:cn.join(' '),fill:f1,stroke:st,'stroke-width':sw}); }
    if(hot){ pe.setAttribute('data-hot',''); pe.setAttribute('fill',nc.color); pe.setAttribute('fill-opacity','.6'); }   /* focused NET: filled pads */
    marks.appendChild(pe);
    if(nc&&nc.name){ const fd=Math.min(40,(round?2*rr:pw)*.6);   /* default label height: 60% of the pad width */
      const fs=conn?(c.fs||fd):Math.min(fd,room/(nc.name.length*.62));   /* connector: free space beside the row, font from PROP */
      if(fs>=4.5) dirText({x:q.x+nv.x*(half+3),y:q.y+nv.y*(half+3)},nv,nc.name,fs,nc.color,haloFor(nc.color),hot); }
    if(pitch>13||isSel){ const o=half+7;
      const t=svg('text',{x:q.x-nv.x*o,y:q.y-nv.y*o,fill:'#fff',stroke:'#000','stroke-width':2.5,'paint-order':'stroke',
        'font-size':9.5,'font-weight':600,'text-anchor':'middle','dominant-baseline':'central','font-family':'IBM Plex Mono, monospace'});
      t.textContent=String(pinNo(c,i)); marks.appendChild(t); } });
  marks.appendChild(svg('rect',{x:b.p.x-b.w/2,y:b.p.y-b.h/2,width:b.w,height:b.h,rx:3,fill:'rgba(10,14,12,.78)',
    stroke:isSel?'#fff':col,'stroke-width':isSel?2:1.3,...(isSel?{'stroke-dasharray':'5 3'}:{})}));
  const t=svg('text',{x:b.p.x,y:b.p.y+.5,fill:isSel?'#fff':col,'font-size':12,'font-weight':600,'text-anchor':'middle',
    'dominant-baseline':'central','font-family':'IBM Plex Mono, monospace'}); t.textContent=c.des; marks.appendChild(t);
  if(c.val){ const v=svg('text',{x:b.p.x,y:b.p.y+b.h/2+9,fill:isSel?'#fff':col,'font-size':10,'text-anchor':'middle',
    'font-family':'IBM Plex Mono, monospace',stroke:'rgba(0,0,0,.7)','stroke-width':3,'paint-order':'stroke'});
    v.textContent=c.val; marks.appendChild(v); }
}
/* pads of visible parts that carry a NET: [{c, net, has(w,q), zone(w,q)}] (w world, q screen). has — inside the drawn
   pad (a click there highlights the NET); zone — the pin's binding zone too: a NET point of the same NET there is not
   drawn, the pad already shows the name */
function padCover(){
  const out=[]; if(!showComps) return out;
  comps.forEach(c=>{ if(!showSide[c.side]) return;
    if(isSOT(c)){ const k=mmScale||1, a=-(c.rot||0)*Math.PI/180;
      c.pads.forEach(pd=>{ if(pd.net) out.push({c,net:pd.net,has:w=>{ const v=rotV({x:w.x-pd.x,y:w.y-pd.y},a);
        return Math.abs(v.x)<=SOT23.pw/2*k&&Math.abs(v.y)<=SOT23.ph/2*k; },zone:w=>Math.hypot(w.x-pd.x,w.y-pd.y)<icPadR(c)}); });
      return; }
    if(isIC(c)){ const G=icGeom(c), R=icPadR(c);
      c.pads.forEach((pd,i)=>{ if(!pd.net) return; const q0=G.P[i], u=G.U[i], nv=G.N[i];
        out.push({c,net:pd.net,zone:w=>Math.hypot(w.x-pd.x,w.y-pd.y)<R,has:(w,q)=>{ const d={x:q.x-q0.x,y:q.y-q0.y};
          return G.round?Math.hypot(d.x,d.y)<=G.rr:Math.abs(G.dot(d,u))<=G.pw/2&&Math.abs(G.dot(d,nv))<=G.pl/2; }}); });
      return; }
    const g=PKG[c.size]; if(!g) return; const k=mmScale||1, hl=g.L/2*k, hw=g.W/2*k, t=g.T*k, a=-(c.rot||0)*Math.PI/180;
    [['n1',-1],['n2',1]].forEach(([key,sg])=>{ const net=c[key]; if(!net) return;
      out.push({c,net,has:w=>{ const v=rotV({x:w.x-c.x,y:w.y-c.y},a), u=v.x*sg;
        return u>=hl-t&&u<=hl&&Math.abs(v.y)<=hw; },zone:w=>{   /* binding zone plus a bit: display only */
        const v=rotV({x:w.x-c.x,y:w.y-c.y},a), u=v.x*sg; return u>=0&&u<=hl+g.L*k*.3&&Math.abs(v.y)<=hw+g.W*k*.4; }}); });
  });
  return out;
}
function drawSOT(c,col,isSel){
  const k=mmScale||1, a=(c.rot||0)*Math.PI/180;
  const rect=(o,hx,hy)=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{ const w=rotV({x:u*hx,y:v*hy},a); return screenOf({x:o.x+w.x,y:o.y+w.y}); });
  const pts=q=>q.map(p=>p.x+','+p.y).join(' ');
  const body=rect(c,SOT23.L/2*k,SOT23.W/2*k);
  if(isSel) marks.appendChild(svg('polygon',{points:pts(body),fill:'none',stroke:'#000',opacity:.6,'stroke-width':5}));
  marks.appendChild(svg('polygon',{points:pts(body),fill:'rgba(90,90,90,.28)',stroke:isSel?'#fff':col,'stroke-width':isSel?2.6:1.4,
    ...(c.side==='bot'?{'stroke-dasharray':'4 3'}:{})}));
  c.pads.forEach((pd,i)=>{ const q=rect(pd,SOT23.pw/2*k,SOT23.ph/2*k), nc=pd.net&&nets.find(n=>n.id===pd.net), hot=nc&&hlNet===nc.id;
    const pe=svg('polygon',{points:pts(q),fill:'none',stroke:nc?nc.color:(isSel?'#fff':col),'stroke-width':hot?2.4:(isSel?1.8:1.3)});
    if(hot){ pe.setAttribute('data-hot',''); pe.setAttribute('fill',nc.color); pe.setAttribute('fill-opacity','.6'); }
    marks.appendChild(pe);
    const xs=q.map(p=>p.x), ys=q.map(p=>p.y), bw=Math.max(...xs)-Math.min(...xs), bh=Math.max(...ys)-Math.min(...ys);
    if(Math.min(bw,bh)<5) return;
    let cx=xs.reduce((s,x)=>s+x,0)/4, cy=ys.reduce((s,y)=>s+y,0)/4, fs=Math.max(8,Math.min(13,Math.min(bw,bh)*.6));
    if(nc){ const f=(c.rot||0)%90===0?1:.7; fs=Math.max(7,Math.min(fs,bh*f*.38));
      padNet(cx,cy+bh*f*.2,bw*f*.92,bh*f*.4,nc,hot); cy-=bh*f*.2; }
    const t=svg('text',{x:cx,y:cy,fill:'#fff',stroke:'#000','stroke-width':2.5,'paint-order':'stroke','font-size':fs,'font-weight':600,
      'text-anchor':'middle','dominant-baseline':'central','font-family':'IBM Plex Mono, monospace'});
    t.textContent=String(pinNo(c,i)); marks.appendChild(t); });
  const p=screenOf(c);
  const t=svg('text',{x:p.x,y:p.y-(c.val?5:0),fill:isSel?'#fff':col,'font-size':isSel?12:11,'font-weight':isSel?600:400,'text-anchor':'middle',
    'dominant-baseline':'central','font-family':'IBM Plex Mono, monospace',stroke:'rgba(0,0,0,.6)','stroke-width':2.5,'paint-order':'stroke'});
  t.textContent=c.des; marks.appendChild(t);
  if(c.val){ const v=svg('text',{x:p.x,y:p.y+7,fill:isSel?'#fff':col,'font-size':9.5,'text-anchor':'middle','dominant-baseline':'central',
    'font-family':'IBM Plex Mono, monospace',stroke:'rgba(0,0,0,.6)','stroke-width':2.5,'paint-order':'stroke'}); v.textContent=c.val; marks.appendChild(v); }
}
function drawICCursor(){ /* pictogram at the cursor: part outline, pin stubs, pin 1 dot, turned by icRot */
  const r=vp.getBoundingClientRect(), m={x:mouseAt.clientX-r.left,y:mouseAt.clientY-r.top};
  const icPat=plPat();   /* local: SOT patterns share the IC pictogram code */
  const sot=!!SOTN[icPat];
  const hw=sot?14:icPat==='q4'?18:icPat==='l1'?26:13, hh=sot?8:icPat==='q4'?18:icPat==='l1'?6:21;   /* local half sizes */
  const a=icRot*Math.PI/180, P=q=>{ const v=rotV(q,a); return {x:m.x+v.x,y:m.y+v.y}; };
  const g=svg('g',{opacity:.9}), add=n=>g.appendChild(n);
  const line=(p,q)=>{ const A=P(p), B=P(q); add(svg('line',{x1:A.x,y1:A.y,x2:B.x,y2:B.y,stroke:'#e8b04b','stroke-width':2})); };
  const box=[{x:-hw,y:-hh},{x:hw,y:-hh},{x:hw,y:hh},{x:-hw,y:hh}].map(P);
  add(svg('polygon',{points:box.map(q=>q.x+','+q.y).join(' '),fill:'rgba(0,0,0,.35)',stroke:'#000','stroke-width':3,opacity:.5}));
  add(svg('polygon',{points:box.map(q=>q.x+','+q.y).join(' '),fill:'none',stroke:'#e8b04b','stroke-width':1.4}));
  const st=5, k=3;
  if(sot){ const xs=[-hw+4,0,hw-4], bot=icPat==='s3'?[xs[0],xs[2]]:xs, top=icPat==='s3'?[0]:icPat==='s5'?[xs[0],xs[2]]:xs;
    bot.forEach(x=>line({x,y:hh},{x,y:hh+st})); top.forEach(x=>line({x,y:-hh},{x,y:-hh-st})); }
  else if(icPat==='l1') for(let i=0;i<5;i++){ const x=-hw+4+i*(2*hw-8)/4; line({x,y:-hh},{x,y:-hh-st}); line({x,y:hh},{x,y:hh+st}); }
  else for(let i=0;i<k;i++){ const t=(i+1)/(k+1);
    const y=-hh+2*hh*t; line({x:-hw,y},{x:-hw-st,y}); line({x:hw,y},{x:hw+st,y});
    if(icPat==='q4'){ const x=-hw+2*hw*t; line({x,y:-hh},{x,y:-hh-st}); line({x,y:hh},{x,y:hh+st}); } }
  const p1=P(sot?{x:-hw+4,y:hh-3.5}:icPat==='l1'?{x:-hw+4,y:0}:{x:-hw+4.5,y:-hh+4.5});
  add(svg('circle',{cx:p1.x,cy:p1.y,r:2.6,fill:'#e8b04b'}));
  marks.appendChild(g);
}
function hitICPad(e){ /* screen-space pick of an IC pad -> {c,i} */
  if(!showComps) return null; const m=evXY(e); let best=null, bd=8;
  comps.forEach(c=>{ if(!isIC(c)||!showSide[c.side]) return;
    c.pads.forEach((pd,i)=>{ const q=screenOf(pd), d=Math.hypot(q.x-m.x,q.y-m.y); if(d<bd){ bd=d; best={c,i}; } }); });
  return best;
}
function moveComp(c,dx,dy){ c.x+=dx; c.y+=dy; if(c.pads) c.pads.forEach(pd=>{ pd.x+=dx; pd.y+=dy; }); }
function icAutoPins(c){ /* nearest visible NET point within a pad radius sets that pad's net; a point serves one pad */
  const R=icPadR(c); let ch=false; const best=c.pads.map(()=>null);
  points.forEach(pt=>{ const net=nets.find(n=>n.id===pt.net), lay=byId(pt.layer);
    if(!net||!net.on||!lay||!ptShown(pt,lay)) return;
    const w=worldOf(lay,pt.p); let bi=-1, bd=R;
    c.pads.forEach((pd,i)=>{ const d=Math.hypot(w.x-pd.x,w.y-pd.y); if(d<bd){ bd=d; bi=i; } });
    if(bi>=0&&(!best[bi]||bd<best[bi].d)) best[bi]={net:net.id,d:bd}; });
  c.pads.forEach((pd,i)=>{ if(best[i]&&pd.net!==best[i].net){ pd.net=best[i].net; ch=true; } });
  return ch;
}
