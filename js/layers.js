/* ---------- layer factory ---------- */
function freeId(){ let n=1; while(layers.some(l=>l.id==='L'+n)) n++; return 'L'+n; }
function mkLayer(i,init){
  const id=(init&&init.id)||freeId();
  const l=Object.assign({
    id, name:L('Слой ','Layer ')+(i+1), color:LAYPAL[i%LAYPAL.length], side:'any',
    src:'', stored:false, ok:false,
    x:0,y:0,rot:0,scale:1,sx:1,sy:1,fh:false,fv:false,op:1,on:true,H:null,
    tc:LAYPAL[i%LAYPAL.length], tn:0, tm:null, blend:'normal', kOn:false, kc:'#ffffff', kt:.15, cor:{...COR0}, crop:null, main:false, parent:null, fe:0, file:'',
    w:1200,h:1200, pairs:[]
  },init||{});
  const clip=document.createElement('div'); clip.className='clip'; clip.dataset.id=id;
  const scene=document.createElement('div'); scene.className='scene';
  const box=document.createElement('div'); box.className='lbox';
  const img=document.createElement('img'); img.alt=l.name;
  img.draggable=false; img.setAttribute('draggable','false');
  box.appendChild(img); scene.appendChild(box); clip.appendChild(scene);
  l.clip=clip; l.scene=scene; l.box=box; l.el=img;
  if(l.kind==='video') attachVideo(l);
  img.addEventListener('load',()=>{ l.ok=true;
    if(img.naturalWidth) l.h=1200*img.naturalHeight/img.naturalWidth;
    applyLayer(l); checkMissing(); sync(); refreshFiles(); });
  img.addEventListener('error',()=>{ l.ok=false; checkMissing(); sync(); refreshFiles(); });
  const f=document.createElementNS(SVGNS,'filter');
  f.id='tf_'+id; f.setAttribute('x','0'); f.setAttribute('y','0');
  f.setAttribute('width','100%'); f.setAttribute('height','100%');
  f.setAttribute('color-interpolation-filters','sRGB');
  /* colour key: alpha = clamp((Σ|c-key| - tol)/soft); |x| = (x)+ + (-x)+ from two clamped colour matrices */
  const fe=(tag,a)=>{ const n=document.createElementNS(SVGNS,tag); for(const k in a) n.setAttribute(k,a[k]); return n; };
  const kp=fe('feColorMatrix',{in:'SourceGraphic',type:'matrix',result:'kp'});
  const km=fe('feColorMatrix',{in:'SourceGraphic',type:'matrix',result:'km'});
  const kd=fe('feComposite',{in:'kp',in2:'km',operator:'arithmetic',k1:0,k2:1,k3:1,k4:0,result:'kd'});
  const ka=fe('feColorMatrix',{in:'kd',type:'matrix',result:'ka'});
  const ks=fe('feComposite',{in:'SourceGraphic',in2:'ka',operator:'in',result:'k0'});
  f.append(kp,km,kd,ka,ks);
  const ctf=(inp,res)=>{ const n=fe('feComponentTransfer',{in:inp,result:res});
    const fs=['R','G','B'].map(ch=>{ const x=document.createElementNS(SVGNS,'feFunc'+ch); n.appendChild(x); return x; });
    f.appendChild(n); return fs; };
  const shp=fe('feConvolveMatrix',{in:'k0',order:3,kernelMatrix:'0 0 0 0 1 0 0 0 0',preserveAlpha:'true',result:'c0'});
  f.appendChild(shp);
  const lv=ctf('c0','c1'), gmf=ctf('c1','c2'), ctr=ctf('c2','c3');
  const sat=fe('feColorMatrix',{in:'c3',type:'saturate',values:1,result:'c4'}); f.appendChild(sat);
  const pzf=ctf('c4','src');
  const flood=document.createElementNS(SVGNS,'feFlood');
  flood.setAttribute('flood-color',l.tc); flood.setAttribute('result','f');
  const c1=document.createElementNS(SVGNS,'feComposite');
  c1.setAttribute('in','f'); c1.setAttribute('in2','src');
  c1.setAttribute('operator','in'); c1.setAttribute('result','t');
  const bl=document.createElementNS(SVGNS,'feBlend');
  bl.setAttribute('in','t'); bl.setAttribute('in2','src');
  bl.setAttribute('mode',tintMode); bl.setAttribute('result','b');
  const c2=document.createElementNS(SVGNS,'feComposite');
  c2.setAttribute('in','b'); c2.setAttribute('in2','src');
  c2.setAttribute('operator','arithmetic');
  c2.setAttribute('k1','0'); c2.setAttribute('k2','0'); c2.setAttribute('k3','1'); c2.setAttribute('k4','0');
  f.append(flood,c1,bl,c2); defs.appendChild(f);
  l.fx={flood,bl,c2,kp,km,ka,shp,lv,gmf,ctr,sat,pzf,node:f};
  return l;
}
/* stack order by label group (index 0 = bottom): обе, BOT, TOP; order inside a group is kept */
const SIDE_RANK={any:0,bot:1,top:2};
const grp=l=>SIDE_RANK[l.side]??0;
function restack(){
  layers=layers.map((l,i)=>[l,i]).sort((a,b)=>grp(a[0])-grp(b[0])||a[1]-b[1]).map(x=>x[0]);
  const kids=layers.filter(l=>parentOf(l)), tops=layers.filter(l=>!parentOf(l)), out=[];
  tops.forEach(t=>{ out.push(t); kids.filter(k=>k.parent===t.id).forEach(k=>out.push(k)); });
  layers=[...out.filter(l=>l.kind!=='video'),...out.filter(l=>l.kind==='video')];
  layers.forEach((l,i)=>{ l.clip.style.zIndex=i+1; stack.appendChild(l.clip); });
}
function layersChanged(){
  restack();
  if(!byId(sel)) sel=layers[layers.length-1].id;
  if(!byId(refId)||refId===sel) refId=(layers.find(l=>l.id!==sel)||layers[0]).id;
  renderCards(); renderFiles(); layers.forEach(applyLayer); applyClip();
  sync(); checkMissing(); save();
}
function addLayer(){ /* new layer on the current board side, top of its group, becomes active */
  const n=parseInt(freeId().slice(1),10);
  const l=mkLayer(n-1,{side:boardSide}); l.name=L('Слой ','Layer ')+n;
  layers.push(l); sel=l.id; layersChanged(); return l;
}
/* soft edges: two linear gradients intersected, positions in element px */
function featherMask(x0,y0,x1,y1,f){
  if(!(f>0)) return 'none';
  const g=(dir,a,b)=>`linear-gradient(${dir}, transparent ${a}px, #000 ${a+f}px, #000 ${b-f}px, transparent ${b}px)`;
  return g('to right',x0,x1)+', '+g('to bottom',y0,y1);
}
function setMask(el,m){ el.style.maskImage=el.style.webkitMaskImage=m;
  el.style.maskComposite='intersect'; el.style.webkitMaskComposite='source-in';
  el.style.maskRepeat=el.style.webkitMaskRepeat='no-repeat'; }
