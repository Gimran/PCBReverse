/* ---------- render ---------- */
/* layer shown by eye/side/view mode (α not counted) — net points follow this */
/* net point visibility: a via (multi-layer point) shows on both sides whatever the layer filter */
const ptShown=(pt,lay)=>{ if(pt.via||xray) return true;   /* via: both sides; others: their side only */
  const sd=pt.side||lay.side; return sd==='any'||sd===boardSide; };
function layerShown(l){
  if(!l.on||!onSide(l)) return false;
  const P=parentOf(l); if(P&&!P.on) return false;
  if(l.kind==='video'&&l.vmode==='window') return false;   /* window mode: shown in the ВИДЕО tab only */
  if(viewMode==='solo') return l.id===sel||(!!P&&P.id===sel);
  if(viewMode==='swipe') return l.id===sel||l.id===refId;
  return true;
}
function effOpacity(l){ return layerShown(l)? l.op*(sideOp[l.side]??1) : 0; }
function xraySideOp(){   /* XRAY: side in view translucent (xrayOp), the far side opaque; off — both 100% */
  const o=boardSide==='top'?'bot':'top';
  sideOp[boardSide]=xray?xrayOp:1; sideOp[o]=1; }
function applySideOp(sd){ layers.forEach(l=>{ if(l.side!==sd) return;   /* opacity only: cheap while the slider moves */
  const o=effOpacity(l); l.box.style.setProperty('--op',o); l.box.style.opacity=o; }); save(); }
function applyTint(l){
  const a=Math.max(0,Math.min(1,l.tn));
  l.fx.flood.setAttribute('flood-color',l.tc);
  l.fx.bl.setAttribute('mode',l.tm||tintMode);
  l.fx.c2.setAttribute('k2',a.toFixed(3));
  l.fx.c2.setAttribute('k3',(1-a).toFixed(3));
  const h=l.kc.replace('#',''), k=[0,2,4].map(i=>parseInt(h.substr(i,2),16)/255||0);
  const t=l.kt*1.5, soft=.06, g=1/soft;
  l.fx.kp.setAttribute('values',`1 0 0 0 ${-k[0]} 0 1 0 0 ${-k[1]} 0 0 1 0 ${-k[2]} 0 0 0 0 1`);
  l.fx.km.setAttribute('values',`-1 0 0 0 ${k[0]} 0 -1 0 0 ${k[1]} 0 0 -1 0 ${k[2]} 0 0 0 0 1`);
  l.fx.ka.setAttribute('values', l.kOn ? `0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${g} ${g} ${g} 0 ${-t*g}`
                                       : '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1');
  applyCor(l);
  l.el.style.filter = (a>0||l.kOn||corActive(l.cor)) ? `url(#tf_${l.id})` : 'none';
  if(l.vid) l.vid.style.filter=l.el.style.filter;
}
function applyCor(l){
  const c=l.cor, set=(fs,a)=>fs.forEach(x=>{ for(const k in a) x.setAttribute(k,a[k]); });
  const sh=c.sh;
  l.fx.shp.setAttribute('kernelMatrix',`0 ${-sh} 0 ${-sh} ${1+4*sh} ${-sh} 0 ${-sh} 0`);
  const ls=1/Math.max(.01,c.lw-c.lb);
  set(l.fx.lv,{type:'linear',slope:ls,intercept:-c.lb*ls});
  set(l.fx.gmf,{type:'gamma',amplitude:1,exponent:1/c.gm,offset:0});
  set(l.fx.ctr,{type:'linear',slope:c.ct,intercept:.5-.5*c.ct+c.br});
  l.fx.sat.setAttribute('values',c.sat);
  const n=c.pz|0;
  if(n>=2) set(l.fx.pzf,{type:'discrete',tableValues:Array.from({length:n},(_,i)=>(i/(n-1)).toFixed(4)).join(' ')});
  else set(l.fx.pzf,{type:'identity'});
}
function applyLayer(l){
  if(l.H){
    const H=l.H;
    l.box.style.transformOrigin='0 0';
    l.box.style.transform=`matrix3d(${H[0]},${H[3]},0,${H[6]},${H[1]},${H[4]},0,${H[7]},0,0,1,0,${H[2]},${H[5]},0,1)`;
  }else{
    l.box.style.transformOrigin='50% 50%';
    l.box.style.transform=`translate(-50%,-50%) translate(${l.x}px,${l.y}px) rotate(${l.rot}deg) scale(${kX(l)},${kY(l)})`;
  }
  const cr=l.crop;
  l.el.style.clipPath = cr ? `inset(${cr.y0}px ${l.w-cr.x1}px ${l.h-cr.y1}px ${cr.x0}px)` : 'none';
  if(l.vid) l.vid.style.clipPath=l.el.style.clipPath;
  { const c=cropRect(l); setMask(l.vid||l.el,featherMask(c.x0,c.y0,c.x1,c.y1,(l.fe||0)*Math.min(c.x1-c.x0,c.y1-c.y0))); }
  const o=effOpacity(l);
  l.box.style.setProperty('--op',o); l.box.style.opacity=o;
  l.box.style.filter=inverted?'invert(1) hue-rotate(180deg)':'none';
  l.clip.style.mixBlendMode = isBottom(l)?'normal':l.blend;
  applyTint(l);
  const s=byId(sel);
  if(s && s!==l && s.H && s.pairs.some(pr=>pr.rl===l.id)) recompute(false);
  drawMarks(); save();
}
function applyAll(){ layers.forEach(applyLayer); applyClip(); if(booted)drawMarks(); }
function applyClip(){
  const on=viewMode==='swipe' && byId(sel) && byId(refId);
  vp.classList.toggle('swipe',!!on);
  const w=vp.clientWidth, px=swipe*w;
  layers.forEach(l=>{ l.clip.style.clipPath='none'; });
  if(on){
    byId(refId).clip.style.clipPath=`inset(0 ${w-px}px 0 0)`;
    byId(sel).clip.style.clipPath=`inset(0 0 0 ${px}px)`;
    handle.style.left=px+'px';
  }
}
function applyView(){
  const sx=view.z*(view.fh?-1:1), sy=view.z*(view.fv?-1:1);
  layers.forEach(l=>l.scene.style.transform=
    `translate(${view.x}px,${view.y}px) scale(${sx},${sy}) rotate(${view.rot}deg)`);
  $('hudZoom').textContent='zoom '+Math.round(view.z*100)+'%'+(view.rot?' · '+view.rot+'°':'')+
    (view.fh?' · ⇄':'')+(view.fv?' · ⇅':'');
  drawMarks(); save();
}
function updateBlink(){
  const target=(blinkOn&&clickMode==='align') ? (pending? refId : sel) : null;
  layers.forEach(l=>l.box.classList.toggle('blink',l.id===target&&l.on));
}
const vrad=()=>view.rot*Math.PI/180;
const rotV=(v,a)=>{const c=Math.cos(a),s=Math.sin(a);return{x:v.x*c-v.y*s,y:v.x*s+v.y*c};};
const vsx=()=>view.z*(view.fh?-1:1), vsy=()=>view.z*(view.fv?-1:1);
const screenOf=m=>{const r=vp.getBoundingClientRect(), q=rotV(m,vrad());
  return {x:r.width/2+view.x+q.x*vsx(), y:r.height/2+view.y+q.y*vsy()};};
const worldFromEvent=e=>{const r=vp.getBoundingClientRect();
  const q={x:(e.clientX-r.left-r.width/2-view.x)/vsx(), y:(e.clientY-r.top-r.height/2-view.y)/vsy()};
  return rotV(q,-vrad());};
const screenDelta=(dx,dy)=>rotV({x:dx/vsx(),y:dy/vsy()},-vrad());
const cssVar=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function sel_(){return byId(sel);}
function layerDragAllowed(){ return clickMode==='move'; }

function svg(tag,attrs){const n=document.createElementNS(SVGNS,tag);
  for(const k in attrs) n.setAttribute(k,attrs[k]); return n;}
/* label halo contrasting with the text colour: dark text gets a light glow */
function haloFor(col){ const m=/^#?([0-9a-f]{6})$/i.exec(col||''); if(!m) return 'rgba(0,0,0,.78)';
  const n=parseInt(m[1],16), y=(.299*(n>>16)+.587*(n>>8&255)+.114*(n&255))/255;
  return y<.4?'rgba(255,255,255,.85)':'rgba(0,0,0,.78)'; }
function drawMarks(){
  while(marks.firstChild) marks.removeChild(marks.firstChild);
  const ring=(p,col,r,wd,op)=>marks.appendChild(svg('circle',{cx:p.x,cy:p.y,r:r,fill:'none',
    stroke:col,'stroke-width':wd,opacity:op}));
  const dot=(p,col,op)=>marks.appendChild(svg('circle',{cx:p.x,cy:p.y,r:1.6,fill:col,opacity:op}));
  const txt=(p,col,t,op)=>{const n=svg('text',{x:p.x+10,y:p.y-8,fill:col,'font-size':13,'font-weight':500,
    'font-family':'IBM Plex Mono, monospace',opacity:op,stroke:haloFor(col),'stroke-width':4,
    'stroke-linejoin':'round','paint-order':'stroke'}); n.textContent=t; marks.appendChild(n);};  /* halo keeps labels readable */
  /* warp pairs: thin black '+' — must not look like net points */
  const cross=(p,r,op)=>marks.appendChild(svg('path',{d:`M${p.x-r} ${p.y}H${p.x+r}M${p.x} ${p.y-r}V${p.y+r}`,
    stroke:'#000','stroke-width':1,fill:'none',opacity:op}));
  const s=sel_();
  if(s) s.pairs.forEach((pr,i)=>{
    const rl=byId(pr.rl); if(!rl)return;
    const pa=screenOf(worldOf(rl,pr.r)), pb=screenOf(worldOf(s,pr.m));
    marks.appendChild(svg('line',{x1:pa.x,y1:pa.y,x2:pb.x,y2:pb.y,stroke:'#8a9a92',
      'stroke-width':1,'stroke-dasharray':'3 3'}));
    cross(pa,5,.55); cross(pb,4,.55);
    const n=svg('text',{x:pa.x+5,y:pa.y-4,fill:'#000','font-size':9,
      'font-family':'IBM Plex Mono, monospace',opacity:.55}); n.textContent=String(i+1); marks.appendChild(n);
  });
  if(pending&&sel_()) cross(screenOf(worldOf(sel_(),pending)),6,.8);   /* pending = point on the active layer */
  const fNet=hlNet!==null&&nets.find(n=>n.id===hlNet&&n.on);   /* NET focus: the rest goes grey */
  $('stack').classList.toggle('gray',grayView||!!(fNet&&showNets));
  const grey=n0=>{ for(let i=n0;i<marks.children.length;i++){ const e=marks.children[i];
    if(!e.hasAttribute('data-hot')) e.style.filter='grayscale(1)'; } };
  if(showNets&&fNet){   /* star: from the selected point (else the one nearest the centre) to every other point */
    const P=points.filter(pt=>pt.net===fNet.id&&byId(pt.layer)).map(pt=>({pt,q:screenOf(worldOf(byId(pt.layer),pt.p))}));
    let c=P.find(o=>o.pt.id===selPoint);
    if(!c&&P.length){ const mx=P.reduce((a,o)=>a+o.q.x,0)/P.length, my=P.reduce((a,o)=>a+o.q.y,0)/P.length;
      c=P.reduce((b,o)=>Math.hypot(o.q.x-mx,o.q.y-my)<Math.hypot(b.q.x-mx,b.q.y-my)?o:b); }
    if(c) P.forEach(o=>{ if(o===c) return;
      marks.appendChild(svg('line',{x1:c.q.x,y1:c.q.y,x2:o.q.x,y2:o.q.y,stroke:haloFor(fNet.color),'stroke-width':3.5,opacity:.45}));
      marks.appendChild(svg('line',{x1:c.q.x,y1:c.q.y,x2:o.q.x,y2:o.q.y,stroke:fNet.color,'stroke-width':1.5,opacity:.9})); });
  }
  const cov=showNets&&clickMode!=='net'?padCover():[];
  if(showNets) points.forEach(pt=>{
    const net=nets.find(n=>n.id===pt.net), lay=byId(pt.layer);
    if(!net||!net.on||!lay) return;
    const far=!ptShown(pt,lay); if(far&&net!==fNet) return;   /* the focused NET shows on the far side too */
    const pw=worldOf(lay,pt.p), p=screenOf(pw), n0=marks.children.length;
    if(pt.id!==selPoint&&cov.some(o=>o.net===net.id&&(o.has(pw,p)||o.zone(pw,p)))) return;   /* the pad already shows this NET */
    const hot=hlNet===null||hlNet===net.id, op=hot?1:.28;
    if(pt.via) ring(p,net.color,hot&&hlNet!==null?6.5:5,hot&&hlNet!==null?4:3.2,op); /* via: thick annular pad */
    else ring(p,net.color,hot&&hlNet!==null?9:6,hot&&hlNet!==null?2.2:1.5,op);
    if(far) marks.lastChild.setAttribute('stroke-dasharray','3 2');   /* far-side point: dashed ring */
    dot(p,net.color,op);
    if(pt.id===selPoint) ring(p,cssVar('--text')||'#fff',12,1,.9);
    if(pt.net===mergeFrom){ ring(p,cssVar('--text')||'#fff',14,1.4,.95); marks.lastChild.setAttribute('stroke-dasharray','3 3'); }
    if(hlNet!==null&&hlNet===net.id){
      marks.appendChild(svg('line',{x1:p.x-13,y1:p.y,x2:p.x-7,y2:p.y,stroke:net.color,'stroke-width':1.4}));
      marks.appendChild(svg('line',{x1:p.x+7,y1:p.y,x2:p.x+13,y2:p.y,stroke:net.color,'stroke-width':1.4}));
    }
    if(labels) txt(p,net.color,net.name,op);
    if(fNet&&!hot) grey(n0);
  });
  { const n0=marks.children.length; drawComps(); if(fNet) grey(n0); }
  drawNotes();
  if(clickMode==='move') drawLayerBox();
  if(clickMode==='crop') drawCropBox();
  if(clickMode==='pedit') drawPartBox();
}
