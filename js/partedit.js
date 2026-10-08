/* ---------- part placement edit (PROP → «Правка расположения», clickMode 'pedit'): IC / connector / SOT pads in a frame,
   free transform like a layer in mode M — click in the frame toggles scale ⇄ rotate, corners scale proportionally,
   side handles stretch along one frame axis, ⊕ pivot (drag, double-click — back to the centre), drag inside — move.
   The frame is rebuilt from the pads every time: axis = the first row of pins (icSides), extent = outer pad centres
   + 0.6 pitch. */
let pe=null, peMode='scale';
const PDRAG=new Set(['ppiv','pmove','pscale','prot','pstretch']);   /* pe: {id, piv} — piv: world pivot or null (frame centre) */
const peComp=()=>pe&&comps.find(c=>c.id===pe.id);
const canPartEdit=c=>!!c&&isIC(c)&&!isSOT(c)&&c.pads.length>0;
function partFrame(c){ /* -> {o, u, v, hw, hh} in world */
  const P=c.pads, n=P.length, nrm=v=>{ const d=Math.hypot(v.x,v.y); return d>1e-9?{x:v.x/d,y:v.y/d}:null; };
  let u=null;
  for(const g of icSides(c)) if(g.length>1&&(u=nrm({x:P[g[g.length-1]].x-P[g[0]].x,y:P[g[g.length-1]].y-P[g[0]].y}))) break;
  if(!u) u={x:1,y:0};
  const v={x:-u.y,y:u.x}, C=P.reduce((a,q)=>({x:a.x+q.x/n,y:a.y+q.y/n}),{x:0,y:0});
  const S=P.map(q=>(q.x-C.x)*u.x+(q.y-C.y)*u.y), T=P.map(q=>(q.x-C.x)*v.x+(q.y-C.y)*v.y);
  const s0=Math.min(...S), s1=Math.max(...S), t0=Math.min(...T), t1=Math.max(...T);
  let pitch=Infinity; P.forEach((a,i)=>{ for(let j=i+1;j<n;j++) pitch=Math.min(pitch,Math.hypot(a.x-P[j].x,a.y-P[j].y)); });
  const m=Number.isFinite(pitch)?pitch*.6:icPadR0();   /* margin around the pad centres: the frame encloses the pads */
  const sm=(s0+s1)/2, tm=(t0+t1)/2;
  return {o:{x:C.x+u.x*sm+v.x*tm,y:C.y+u.y*sm+v.y*tm}, u, v, hw:(s1-s0)/2+m, hh:(t1-t0)/2+m};
}
const fAt=(f,a,b)=>({x:f.o.x+f.u.x*a+f.v.x*b, y:f.o.y+f.u.y*a+f.v.y*b});
function partBox(c){ const f=partFrame(c);
  return { f, q:[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>screenOf(fAt(f,a*f.hw,b*f.hh))),
    e:[['su',fAt(f,f.hw,0)],['su',fAt(f,-f.hw,0)],['sv',fAt(f,0,f.hh)],['sv',fAt(f,0,-f.hh)]].map(([a,w])=>({a,p:screenOf(w)})),
    Pw:pe&&pe.piv||f.o }; }
function drawPartBox(){
  const c=peComp(); if(!c) return;
  const b=partBox(c); frame(b.q);
  if(peMode==='scale'){
    b.q.forEach(p=>marks.appendChild(svg('rect',{x:p.x-5,y:p.y-5,width:10,height:10,fill:'#fff',stroke:'#000','stroke-width':1})));
    b.e.forEach(({p})=>marks.appendChild(svg('rect',{x:p.x-4,y:p.y-4,width:8,height:8,fill:'#fff',stroke:'#000','stroke-width':1}))); }
  else b.q.forEach(p=>{ const t=svg('text',{x:p.x,y:p.y,fill:'#fff',stroke:'#000','stroke-width':3,'paint-order':'stroke','font-size':18,
      'font-weight':700,'text-anchor':'middle','dominant-baseline':'central'}); t.textContent='↻'; marks.appendChild(t); });
  drawPivot(screenOf(b.Pw));
}
function hitPartBox(e){ /* -> 'piv' | 'scale' | 'rot' | 'su' | 'sv' | 'in' | null */
  const c=peComp(); if(!c) return null;
  const m=evXY(e), b=partBox(c), P=screenOf(b.Pw);
  if(Math.hypot(m.x-P.x,m.y-P.y)<=9) return 'piv';
  if(b.q.some(p=>Math.hypot(m.x-p.x,m.y-p.y)<=10)) return peMode==='scale'?'scale':'rot';
  if(peMode==='scale'){ const h=b.e.find(({p})=>Math.hypot(m.x-p.x,m.y-p.y)<=9); if(h) return h.a; }
  const w=worldFromEvent(e), f=b.f, d={x:w.x-f.o.x,y:w.y-f.o.y}, pad=8/Math.abs(view.z);
  return Math.abs(d.x*f.u.x+d.y*f.u.y)<=f.hw+pad&&Math.abs(d.x*f.v.x+d.y*f.v.y)<=f.hh+pad?'in':null;
}
function startPartEdit(){
  const c=comps.find(o=>o.id===selComp); if(!canPartEdit(c)) return;
  if(clickMode==='pedit'&&pe&&pe.id===c.id){ endPartEdit(); return; }
  pe={id:c.id,piv:null}; peMode='scale'; clickMode='pedit'; placing=false; pending=null; calib=null; showComps=true;
  if(!showSide[c.side]) showSide[c.side]=true;
  renderComps(); sync(); drawMarks();
}
function endPartEdit(){ pe=null; if(clickMode==='pedit') clickMode='none'; renderProp(); sync(); drawMarks(); }
function partDragStart(e,hb){ /* pointerdown in 'pedit' -> drag or null */
  const c=peComp(), b=partBox(c), w=worldFromEvent(e), W=b.Pw;
  const o={pads:c.pads.map(p=>({x:p.x,y:p.y})), cx:c.x, cy:c.y, piv:pe.piv&&{...pe.piv}};
  const base={x:e.clientX,y:e.clientY,moved:false,id:c.id,o,w0:w,W};
  if(hb==='piv') return {...base,t:'ppiv'};
  if(hb==='scale') return {...base,t:'pscale',d0:Math.hypot(w.x-W.x,w.y-W.y)||1};
  if(hb==='rot') return {...base,t:'prot',a0:Math.atan2(w.y-W.y,w.x-W.x)};
  if(hb==='su'||hb==='sv'){ const ax=hb==='su'?b.f.u:b.f.v, d0=(w.x-W.x)*ax.x+(w.y-W.y)*ax.y;
    if(Math.abs(d0)*Math.abs(view.z)<4) return null;   /* pivot under the handle: nothing to stretch about */
    return {...base,t:'pstretch',ax,d0}; }
  return {...base,t:'pmove'};
}
function partDragMove(d,e){
  const c=comps.find(o=>o.id===d.id); if(!c) return;
  const w=worldFromEvent(e), W=d.W, o=d.o; let map;
  if(d.t==='ppiv'){ pe.piv=w; drawMarks(); return; }
  if(d.t==='pmove'){ const dx=w.x-d.w0.x, dy=w.y-d.w0.y; map=p=>({x:p.x+dx,y:p.y+dy}); }
  else if(d.t==='pscale'){ const k=Math.max(.02,Math.hypot(w.x-W.x,w.y-W.y)/d.d0); map=p=>({x:W.x+k*(p.x-W.x),y:W.y+k*(p.y-W.y)}); }
  else if(d.t==='prot'){ let a=Math.atan2(w.y-W.y,w.x-W.x)-d.a0;
    if(e.shiftKey) a=Math.round(a/(Math.PI/12))*(Math.PI/12);   /* Shift — 15° steps */
    map=p=>{ const v=rotV({x:p.x-W.x,y:p.y-W.y},a); return {x:W.x+v.x,y:W.y+v.y}; }; }
  else if(d.t==='pstretch'){ const ax=d.ax, k=Math.max(.02,((w.x-W.x)*ax.x+(w.y-W.y)*ax.y)/d.d0);
    map=p=>{ const s=(p.x-W.x)*ax.x+(p.y-W.y)*ax.y; return {x:p.x+(k-1)*s*ax.x,y:p.y+(k-1)*s*ax.y}; }; }
  if(!map) return;
  c.pads.forEach((p,i)=>{ const q=map(o.pads[i]); p.x=q.x; p.y=q.y; });
  { const q=map({x:o.cx,y:o.cy}); c.x=q.x; c.y=q.y; }
  if(o.piv) pe.piv=map(o.piv);
  drawMarks();
}
function partDragEnd(d){
  const c=comps.find(o=>o.id===d.id);
  if(!d.moved){ if(d.t==='pmove'){ peMode=peMode==='scale'?'rot':'scale'; sync(); } drawMarks(); return; }   /* click — toggle */
  if(c&&d.t!=='ppiv'){ autoPins(c); renderProps(); save(); }
  drawMarks();
}
