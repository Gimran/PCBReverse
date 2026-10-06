/* ---------- components ---------- */
function compCorners(c){
  const g=PKG[c.size], k=mmScale||1;
  const hl=g.L/2*k, hw=g.W/2*k, t=g.T*k;
  const a=(c.rot||0)*Math.PI/180, co=Math.cos(a), si=Math.sin(a);
  const put=(u,v)=>({x:c.x+u*co-v*si, y:c.y+u*si+v*co});
  return {
    body:[put(-hl,-hw),put(hl,-hw),put(hl,hw),put(-hl,hw)],
    p1:[put(-hl,-hw),put(-hl+t,-hw),put(-hl+t,hw),put(-hl,hw)],
    p2:[put(hl-t,-hw),put(hl,-hw),put(hl,hw),put(hl-t,hw)],
    centre:{x:c.x,y:c.y}
  };
}
/* manual transform (mode M), CorelDRAW-like: click on the layer toggles scale / rotate handles,
   ⊕ = pivot for both (image px of the layer, runtime, default centre, drag to move, double-click resets) */
let xfMode='scale';
const pivotImg=l=>l.piv||{x:l.w/2,y:l.h/2};
const evXY=e=>{ const r=vp.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; };
function inLayer(l,e){ const p=imgOf(l,worldFromEvent(e)); return p.x>=0&&p.y>=0&&p.x<=l.w&&p.y<=l.h; }
function layerBox(l){
  const q=[{x:0,y:0},{x:l.w,y:0},{x:l.w,y:l.h},{x:0,y:l.h}].map(p=>screenOf(worldOf(l,p)));
  const e=[['sy',{x:l.w/2,y:0}],['sx',{x:l.w,y:l.h/2}],['sy',{x:l.w/2,y:l.h}],['sx',{x:0,y:l.h/2}]]   /* side midpoints */
    .map(([a,p])=>({a,p:screenOf(worldOf(l,p))}));
  return {q, e, P:screenOf(worldOf(l,pivotImg(l)))};
}
function drawPivot(P){
  const g=(a)=>marks.appendChild(svg(a[0],a[1]));
  g(['circle',{cx:P.x,cy:P.y,r:6,fill:'none',stroke:'#000','stroke-width':3,opacity:.6}]);
  g(['circle',{cx:P.x,cy:P.y,r:6,fill:'none',stroke:'#fff','stroke-width':1.2}]);
  g(['path',{d:`M${P.x-10} ${P.y}H${P.x+10}M${P.x} ${P.y-10}V${P.y+10}`,stroke:'#000','stroke-width':3,opacity:.6}]);
  g(['path',{d:`M${P.x-10} ${P.y}H${P.x+10}M${P.x} ${P.y-10}V${P.y+10}`,stroke:'#fff','stroke-width':1}]);
}
function frame(q,dash){ const pts=q.map(p=>p.x+','+p.y).join(' ');
  marks.appendChild(svg('polygon',{points:pts,fill:'none',stroke:'#000',opacity:.5,'stroke-width':3}));
  marks.appendChild(svg('polygon',{points:pts,fill:'none',stroke:'#fff','stroke-width':1,'stroke-dasharray':dash||'6 4'})); }
function drawLayerBox(){
  const l=sel_(); if(!l||l.H) return;
  const b=layerBox(l); frame(b.q);
  if(xfMode==='scale'){
    b.q.forEach(p=>marks.appendChild(svg('rect',{x:p.x-5,y:p.y-5,width:10,height:10,fill:'#fff',stroke:'#000','stroke-width':1})));
    b.e.forEach(({p})=>marks.appendChild(svg('rect',{x:p.x-4,y:p.y-4,width:8,height:8,fill:'#fff',stroke:'#000','stroke-width':1}))); }
  else b.q.forEach(p=>{ /* curved-arrow rotation handles at the corners */
    const t=svg('text',{x:p.x,y:p.y,fill:'#fff',stroke:'#000','stroke-width':3,'paint-order':'stroke','font-size':18,
      'font-weight':700,'text-anchor':'middle','dominant-baseline':'central'}); t.textContent='↻'; marks.appendChild(t); });
  drawPivot(b.P);
}
function hitLayerBox(e){ /* -> 'piv' | 'scale' | 'sx' | 'sy' | 'rot' | 'in' | null */
  const l=sel_(); if(!l||l.H) return null;
  const m=evXY(e), b=layerBox(l);
  if(Math.hypot(m.x-b.P.x,m.y-b.P.y)<=9) return 'piv';
  if(b.q.some(p=>Math.hypot(m.x-p.x,m.y-p.y)<=10)) return xfMode==='scale'?'scale':'rot';
  if(xfMode==='scale'){ const h=b.e.find(({p})=>Math.hypot(m.x-p.x,m.y-p.y)<=9); if(h) return h.a; }
  return inLayer(l,e)?'in':null;
}
/* crop mode: rectangle in image px of the active layer (works on warped layers too) */
const cropRect=l=>l.crop||{x0:0,y0:0,x1:l.w,y1:l.h};
const CROPH=[['x0','y0'],['x1','y0'],['x1','y1'],['x0','y1'],[null,'y0'],['x1',null],[null,'y1'],['x0',null]];
function cropHandles(l){ const c=cropRect(l), mx=(c.x0+c.x1)/2, my=(c.y0+c.y1)/2;
  return CROPH.map(([ex,ey])=>({ex,ey,p:screenOf(worldOf(l,{x:ex?c[ex]:mx,y:ey?c[ey]:my}))})); }
function drawCropBox(){
  const l=sel_(); if(!l) return;
  const full=[{x:0,y:0},{x:l.w,y:0},{x:l.w,y:l.h},{x:0,y:l.h}].map(p=>screenOf(worldOf(l,p)));
  marks.appendChild(svg('polygon',{points:full.map(p=>p.x+','+p.y).join(' '),fill:'none',stroke:'#fff',
    'stroke-width':1,'stroke-dasharray':'2 4',opacity:.6}));
  const c=cropRect(l); frame([{x:c.x0,y:c.y0},{x:c.x1,y:c.y0},{x:c.x1,y:c.y1},{x:c.x0,y:c.y1}].map(p=>screenOf(worldOf(l,p))),'none');
  cropHandles(l).forEach(h=>marks.appendChild(svg('rect',{x:h.p.x-4.5,y:h.p.y-4.5,width:9,height:9,
    fill:'#000',stroke:'#fff','stroke-width':1.2})));
}
function hitCropBox(e){ const l=sel_(); if(!l) return null;
  const m=evXY(e), h=cropHandles(l).find(h=>Math.hypot(m.x-h.p.x,m.y-h.p.y)<=9); if(h) return h;
  const c=cropRect(l), q=imgOf(l,worldFromEvent(e));
  return (q.x>=c.x0&&q.x<=c.x1&&q.y>=c.y0&&q.y<=c.y1)?{ex:'in'}:null; }
