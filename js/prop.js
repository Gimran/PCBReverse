/* ---------- PROP tab: properties of the selected component / NET point / NET / drawing ---------- */
function focusProp(id){ if(document.querySelector('[data-page="prop"]').hidden) document.querySelector('[data-tab="prop"]').click();
  const i=$(id); if(i){ i.focus(); if(i.select) i.select(); } }
function propRow(box,label,node){ const r=document.createElement('div'); r.className='row';
  const l=document.createElement('span'); l.className='lbl'; l.style.flex='none'; l.style.width='64px'; l.textContent=label;
  r.append(l,node); box.appendChild(r); return r; }
function mkSelect(opts,val,fn){ const x=document.createElement('select'); x.className='slim';
  opts.forEach(([v,t])=>{ const o=document.createElement('option'); o.value=v; o.textContent=t; x.appendChild(o); });
  x.value=val; x.onchange=()=>fn(x.value); return x; }
function netPins(netId){ /* component pins on a NET: [{c,label}] */
  const out=[];
  comps.forEach(c=>{ if(isIC(c)) c.pads.forEach((pd,i)=>{ if(pd.net===netId) out.push({c,label:c.des+'.'+pinNo(c,i)}); });
    else [['n1','1'],['n2','2']].forEach(([k,n])=>{ if(c[k]===netId) out.push({c,label:c.des+'.'+n}); }); });
  return out;
}
function renderPointProps(pt){
  const box=$('pointProps'); box.innerHTML=''; if(!pt) return;
  propRow(box,'NET',mkSelect(nets.map(n=>[n.id,n.name]),pt.net,v=>{ pt.net=v; activeNet=hlNet=v; renderNets(); renderProp(); drawMarks(); save(); }));
  propRow(box,L('тип','type'),mkSelect([['pt',L('обычная','plain')],['via',L('сквозная (via)','through (via)')]],pt.via?'via':'pt',
    v=>{ if(v==='via') pt.via=true; else { delete pt.via; pt.side=pt.side||boardSide; } renderProp(); drawMarks(); save(); }));
  if(!pt.via) propRow(box,L('сторона','side'),mkSelect([['top','TOP'],['bot','BOT']],pt.side||(byId(pt.layer)||{}).side||boardSide,
    v=>{ pt.side=v; renderProp(); drawMarks(); save(); }));
  const lay=byId(pt.layer), ln=document.createElement('span'); ln.className='val'; ln.style.textAlign='left'; ln.style.flex='1';
  ln.textContent=lay?lay.name:'—'; propRow(box,L('слой','layer'),ln);
  const del=document.createElement('button'); del.className='mini wide'; del.textContent=L('Удалить точку','Delete point');
  del.onclick=()=>{ points=points.filter(p=>p.id!==pt.id); selPoint=null; renderNets(); renderProp(); drawMarks(); sync(); save(); };
  box.appendChild(del);
}
function renderNetProps(net){
  const box=$('netProps'); box.innerHTML=''; if(!net) return;
  const nm=document.createElement('input'); nm.type='text'; nm.value=net.name; nm.className='free';
  nm.oninput=()=>{ net.name=nm.value; renderNets(); drawMarks(); save(); };
  nm.onkeydown=e=>{ if(e.key==='Enter'||e.key==='Escape') nm.blur(); };
  propRow(box,L('имя','name'),nm);
  const r=document.createElement('div'); r.className='row'; r.style.flex='1';
  const col=document.createElement('input'); col.type='color'; col.value=net.color; col.oninput=()=>{ net.color=col.value; renderNets(); drawMarks(); save(); };
  const eye=document.createElement('button'); eye.className='mini free'; eye.textContent=net.on?L('видим','shown'):L('скрыт','hidden');
  eye.onclick=()=>{ net.on=!net.on; renderNets(); renderProp(); drawMarks(); save(); };
  const cnt=document.createElement('span'); cnt.className='val'; cnt.textContent=points.filter(p=>p.net===net.id).length+L(' точ.',' pts');
  r.append(col,eye,cnt); propRow(box,L('цвет','color'),r);
  const pins=netPins(net.id), cn=document.createElement('div'); cn.className='conn';
  if(!pins.length){ const e=document.createElement('span'); e.className='empty'; e.textContent=L('выводов нет','no pins'); cn.appendChild(e); }
  pins.forEach(pp=>{ const b=document.createElement('button'); b.className='mini free'; b.textContent=pp.label;
    b.title=L('выбрать компонент','select the component');
    b.onclick=()=>{ selComp=pp.c.id; renderComps(); drawMarks(); sync(); }; cn.appendChild(b); });
  propRow(box,L('выводы','pins'),cn);
}
function renderNoteProps(n){
  const box=$('noteProps'); box.innerHTML=''; if(!n) return;
  const kind={text:L('надпись','label'),arrow:L('стрелка','arrow'),rect:L('прямоугольник','rectangle'),circle:L('круг','circle')}[n.t];
  const k=document.createElement('span'); k.className='val'; k.style.textAlign='left'; k.style.flex='1'; k.textContent=kind;
  propRow(box,L('фигура','shape'),k);
  if(n.t==='text'){ const t=document.createElement('input'); t.type='text'; t.id='noteTxt'; t.value=n.txt||'';
    t.oninput=()=>{ n.txt=t.value; drawMarks(); save(); }; t.onkeydown=e=>{ if(e.key==='Enter'||e.key==='Escape') t.blur(); };
    propRow(box,L('текст','text'),t); }
  const col=document.createElement('input'); col.type='color'; col.value=n.col||'#ffd400';
  col.oninput=()=>{ n.col=drawStyle.col=col.value; drawMarks(); syncDraw(); save(); }; propRow(box,L('цвет','color'),col);
  const key=n.t==='text'?'fs':'w', mn=n.t==='text'?8:1, mx=n.t==='text'?64:10;
  const rr=document.createElement('div'); rr.className='row'; rr.style.flex='1';
  const sl=document.createElement('input'); sl.type='range'; sl.min=mn; sl.max=mx; sl.value=n[key];
  const sv=document.createElement('span'); sv.className='val'; sv.textContent=n[key];
  sl.oninput=()=>{ n[key]=drawStyle[key]=+sl.value; sv.textContent=sl.value; drawMarks(); syncDraw(); save(); };
  rr.append(sl,sv); propRow(box,n.t==='text'?L('размер','size'):L('линия','line'),rr);
  propRow(box,L('сторона','side'),mkSelect([['any',L('обе','both')],['top','TOP'],['bot','BOT']],n.side||'any',v=>{ n.side=v; drawMarks(); save(); }));
  const del=document.createElement('button'); del.className='mini wide'; del.textContent=L('Удалить','Delete'); del.onclick=()=>delNote(n.id);
  box.appendChild(del);
}
let propKey='';
function renderProp(){
  const c=comps.find(o=>o.id===selComp), pt=points.find(q=>q.id===selPoint), n=notes.find(o=>o.id===selNote);
  const net=nets.find(x=>x.id===(pt?pt.net:hlNet));
  $('propCompS').hidden=!c; $('propPointS').hidden=!pt; $('propNetS').hidden=!net; $('propNoteS').hidden=!n;
  $('propEmpty').hidden=!!(c||pt||net||n);
  renderPropsComp(); renderPointProps(pt); renderNetProps(net); renderNoteProps(n);
  propKey=[selComp,selPoint,selNote,hlNet,clickMode,nets.length,comps.length,notes.length].join('|');
}
function drawComps(){
  if(!comps.length&&!calib) return;
  const poly=(pts,fill,stroke,wd,dash,op)=>{
    const n=svg('polygon',{points:pts.map(p=>{const q=screenOf(p);return q.x+','+q.y}).join(' '),
      fill:fill,stroke:stroke,'stroke-width':wd,opacity:op});
    if(dash)n.setAttribute('stroke-dasharray',dash);
    return marks.appendChild(n); };
  if(drag&&drag.t==='icrect'&&drag.moved){ /* placement rubber band (rotated axes) + pad preview */
    const f=icFrame(drag.sx,drag.sy,drag.ex,drag.ey);
    marks.appendChild(svg('polygon',{points:f.corners.map(q=>q.x+','+q.y).join(' '),fill:'none',stroke:'#e8b04b','stroke-width':1.2,'stroke-dasharray':'5 4'}));
    icLayout(plPat(),plN(),f.x0,f.y0,f.x1,f.y1).map(f.toS).forEach((q,i)=>marks.appendChild(i===0
      ? svg('rect',{x:q.x-4,y:q.y-4,width:8,height:8,fill:'#e8b04b'}) : svg('circle',{cx:q.x,cy:q.y,r:3.5,fill:'#e8b04b'})));
  } else if(clickMode==='comp'&&placing&&frameKind()&&!drag&&mouseAt) drawICCursor();
  if(showComps) comps.forEach(c=>{
    if(!showSide[c.side])return;
    if(isSOT(c)){ drawSOT(c,SIDECOL[c.side],c.id===selComp); return; }
    if(isIC(c)){ drawIC(c,SIDECOL[c.side],c.id===selComp); return; }
    const g=compCorners(c), col=SIDECOL[c.side], isSel=c.id===selComp;
    const dash=c.side==='bot'?'4 3':null;
    const scr=p=>screenOf(p);
    if(isSel){
      /* halo: dark backing ring + bright dashed outline around the part */
      const c2=g.body.map(scr);
      const cx=c2.reduce((a,p)=>a+p.x,0)/4, cy=c2.reduce((a,p)=>a+p.y,0)/4;
      const grow=(p,k)=>({x:cx+(p.x-cx)*k, y:cy+(p.y-cy)*k});
      const outer=c2.map(p=>grow(p,1.45));
      marks.appendChild(svg('polygon',{points:outer.map(p=>p.x+','+p.y).join(' '),
        fill:'none',stroke:'#000',opacity:.55,'stroke-width':4}));
      marks.appendChild(svg('polygon',{points:outer.map(p=>p.x+','+p.y).join(' '),
        fill:'none',stroke:'#fff','stroke-width':1.6,'stroke-dasharray':'6 4'}));
      marks.appendChild(svg('polygon',{points:c2.map(p=>p.x+','+p.y).join(' '),
        fill:'none',stroke:'#000',opacity:.6,'stroke-width':5}));
      c2.forEach(p=>{ marks.appendChild(svg('rect',{x:p.x-3.5,y:p.y-3.5,width:7,height:7,
        fill:'#fff',stroke:'#000','stroke-width':1})); });
    }
    poly(g.body,c.kind==='R'?'rgba(180,140,60,.28)':'rgba(70,150,200,.28)',
         isSel?'#ffffff':col, isSel?2.6:1.4, dash, 1);
    [['p1',c.n1],['p2',c.n2]].forEach(([k,net])=>{
      const nc=net&&nets.find(n=>n.id===net);
      const hot=nc&&hlNet===nc.id;
      const pe=poly(g[k], 'none', nc?nc.color:(isSel?'#fff':col),
           hot?2.4:(isSel?1.8:1.3), null, hot?1:.9);   /* transparent pad, NET colour outline */
      if(hot){ pe.setAttribute('data-hot',''); pe.setAttribute('fill',nc.color); pe.setAttribute('fill-opacity','.6'); }   /* focused NET: filled pads */
    });
    /* pin numbers — centred on pads, skipped when the part is too small on screen */
    [['p1','1',c.n1],['p2','2',c.n2]].forEach(([k,num,net])=>{
      const q=g[k].map(scr);
      const pw=Math.min(Math.hypot(q[1].x-q[0].x,q[1].y-q[0].y),Math.hypot(q[2].x-q[1].x,q[2].y-q[1].y));
      if(pw<5) return;
      let cx=q.reduce((a,p)=>a+p.x,0)/4, cy=q.reduce((a,p)=>a+p.y,0)/4;
      let fs=Math.max(9,Math.min(14,pw*.8));
      const nc=net&&nets.find(n=>n.id===net);
      if(nc){   /* inner box of the (possibly turned) pad: number on top, NET name below */
        const xs=q.map(p=>p.x), ys=q.map(p=>p.y), a=((c.rot||0)%90+90)%90, k=a===0?1:.7;
        const bw=(Math.max(...xs)-Math.min(...xs))*k, bh=(Math.max(...ys)-Math.min(...ys))*k;
        fs=Math.max(7,Math.min(fs,bh*.38));
        padNet(cx,cy+bh*.2,bw*.92,bh*.4,nc,hlNet===nc.id);
        cy-=bh*.2; }
      const t=svg('text',{x:cx,y:cy,fill:'#fff',stroke:'#000','stroke-width':2.5,'paint-order':'stroke',
        'font-size':fs,'font-weight':600,'text-anchor':'middle','dominant-baseline':'central',
        'font-family':'IBM Plex Mono, monospace'});
      t.textContent=num; marks.appendChild(t);
    });
    const p=screenOf(g.centre);
    if(isSel){
      const w=Math.max(26,c.des.length*7.6+10);
      marks.appendChild(svg('rect',{x:p.x-w/2,y:p.y-16,width:w,height:15,rx:3,
        fill:'#000',opacity:.62,stroke:'#fff','stroke-width':1}));
    }
    const t=svg('text',{x:p.x,y:p.y-4,fill:isSel?'#fff':col,'font-size':isSel?12:11,
      'text-anchor':'middle','font-family':'IBM Plex Mono, monospace',
      'font-weight':isSel?600:400});
    t.textContent=c.des; marks.appendChild(t);
    if(c.val){ const v=svg('text',{x:p.x,y:p.y+12,fill:isSel?'#fff':col,'font-size':10,
      'text-anchor':'middle','font-family':'IBM Plex Mono, monospace',opacity:.9});
      v.textContent=c.val; marks.appendChild(v); }
  });
  if(calib){
    const g=compCorners({x:calib.x,y:calib.y,rot:calib.rot||0,size:calib.size});
    poly(g.body,'rgba(232,176,75,.25)','#e8b04b',2,null,1);
    poly(g.p1,'rgba(232,176,75,.5)','#e8b04b',1,null,1);
    poly(g.p2,'rgba(232,176,75,.5)','#e8b04b',1,null,1);
    const p=screenOf(g.centre);
    const t=svg('text',{x:p.x,y:p.y-6,fill:'#e8b04b','font-size':11,'text-anchor':'middle',
      'font-family':'IBM Plex Mono, monospace'});
    t.textContent=L('эталон ','gauge ')+calib.size+(calib.rot?' · '+calib.rot+'°':''); marks.appendChild(t);
  }
}
function hitComp(m){
  let best=null,bd=Infinity;
  if(showComps) comps.forEach(c=>{ if(!showSide[c.side])return;
    if(isSOT(c)){ const k=mmScale||1, v=rotV({x:m.x-c.x,y:m.y-c.y},-(c.rot||0)*Math.PI/180);
      if(Math.abs(v.x)<=SOT23.L/2*k&&Math.abs(v.y)<=SOT23.W/2*k){ const d=Math.hypot(v.x,v.y); if(d<bd){ bd=d; best=c; } } return; }
    if(isIC(c)){ const b=icBox(c), q=screenOf(m);       /* IC: its body box */
      if(Math.abs(q.x-b.p.x)<=b.w/2+2&&Math.abs(q.y-b.p.y)<=b.h/2+2){ bd=-1; best=c; } return; }
    const g=PKG[c.size], k=mmScale||1;
    const a=-(c.rot||0)*Math.PI/180, co=Math.cos(a), si=Math.sin(a);
    const dx=m.x-c.x, dy=m.y-c.y;
    const u=dx*co-dy*si, v=dx*si+dy*co;
    if(Math.abs(u)<=g.L/2*k && Math.abs(v)<=g.W/2*k){
      const d=Math.hypot(u,v); if(d<bd){bd=d;best=c;}
    }});
  return best;
}
/* net point inside a pin's zone (its half of the body, with a margin) sets that pin's net;
   only points on visible layers, the active layer wins, then the one closest to the pad */
function pinZone(c,w){ /* world point -> {key:'n1'|'n2', d: distance to pad centre} or null */
  const g=PKG[c.size], k=mmScale||1, hl=g.L/2*k, hw=g.W/2*k, t=g.T*k;
  const a=-(c.rot||0)*Math.PI/180, co=Math.cos(a), si=Math.sin(a);
  const dx=w.x-c.x, dy=w.y-c.y, u=dx*co-dy*si, v=dx*si+dy*co;
  if(Math.abs(u)>hl+g.L*k*.15 || Math.abs(v)>hw+g.W*k*.25) return null;
  return {key:u<0?'n1':'n2', d:Math.hypot(Math.abs(u)-(hl-t/2),v)};
}
function autoPins(c){
  if(isIC(c)) return icAutoPins(c);
  const best={n1:null,n2:null};
  points.forEach(pt=>{ const net=nets.find(n=>n.id===pt.net), lay=byId(pt.layer);
    if(!net||!net.on||!lay||!ptShown(pt,lay))return;
    const z=pinZone(c,worldOf(lay,pt.p)); if(!z)return;
    const key=z.key, d=z.d, pri=lay.id===sel?0:1;
    const b=best[key]; if(!b||pri<b.pri||(pri===b.pri&&d<b.d)) best[key]={net:net.id,pri,d};
  });
  let ch=false;
  ['n1','n2'].forEach(k2=>{ if(best[k2]&&c[k2]!==best[k2].net){ c[k2]=best[k2].net; ch=true; } });
  /* after a turn the other pin may still carry the net that just moved over — drop it */
  [['n1','n2'],['n2','n1']].forEach(([k2,o])=>{
    if(best[k2]&&!best[o]&&c[o]===best[k2].net){ c[o]=null; ch=true; } });
  return ch;
}
function pinFromPoint(w,net,via){ /* new net point: write its net into the pin it lands on (via: either side) */
  let best=null;
  { let pb=null, bd=Infinity;                      /* IC pads first */
    comps.forEach(c=>{ if(!isIC(c)||(!via&&!showSide[c.side])) return; const R=icPadR(c);
      c.pads.forEach(pd=>{ const d=Math.hypot(pd.x-w.x,pd.y-w.y); if(d<R&&d<bd){ bd=d; pb={c,pd}; } }); });
    if(pb){ pb.pd.net=net; if(pb.c.id===selComp) renderProps(); return true; } }
  comps.forEach(c=>{ if(isIC(c)||(!via&&!showSide[c.side]))return; const z=pinZone(c,w);
    if(z&&(!best||z.d<best.z.d)) best={c,z}; });
  if(!best)return false;
  best.c[best.z.key]=net;
  if(best.c.id===selComp) renderProps();
  return true;
}
function addComp(m){
  if(!mmScale||frameKind()) return;
  compSeq[compKind]=compSeq[compKind]||1;
  const kind=compKind, des=kind+(compSeq[kind]++);
  const c={id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),
    kind, size:compSize, side:compSide, x:m.x, y:m.y, rot:compRot, des, val:compVal[kind]||'', n1:null, n2:null};
  autoPins(c); comps.push(c);
  if(!showSide[c.side]) showSide[c.side]=true; /* never place a part hidden by the filter */ selComp=c.id; renderComps(); drawMarks(); save();
}
function renderComps(){
  const box=$('complist'); box.innerHTML='';
  const list=comps.filter(c=>showSide[c.side]);
  if(!list.length){ const d=document.createElement('div'); d.className='empty';
    d.textContent=comps.length?L('Скрыты фильтром.','Hidden by filter.'):L('Компонентов нет.','No components.'); box.appendChild(d); }
  list.forEach(c=>{
    const row=document.createElement('div'); row.className='crow'+(c.id===selComp?' sel':'');
    const sw=document.createElement('span'); sw.className='swatch'; sw.style.height='14px';
    sw.style.background=SIDECOL[c.side];
    const d=document.createElement('span'); d.className='d'; d.textContent=c.des;
    const v=document.createElement('span'); v.className='v'; v.textContent=c.val||'—';
    const sz=document.createElement('span'); sz.className='s'; sz.textContent=c.size;
    const x=document.createElement('button'); x.className='x'; x.textContent='✕';
    x.onclick=e=>{e.stopPropagation(); comps=comps.filter(o=>o.id!==c.id);
      if(selComp===c.id)selComp=null; renderComps();drawMarks();save()};
    row.onclick=()=>{selComp=c.id;renderComps();drawMarks();sync()};
    row.append(sw,d,v,sz,x); box.appendChild(row);
  });
  renderProps();
  $('colTop').value=SIDECOL.top; $('colBot').value=SIDECOL.bot;
  $('showTop').classList.toggle('on',showSide.top);
  $('showBot').classList.toggle('on',showSide.bot);
}
function renderProps(){ renderProp(); }   /* PROP tab renders every selection */
function renderPropsComp(){
  const box=$('compProps'); box.innerHTML='';
  const c=comps.find(o=>o.id===selComp);
  if(!c){ const d=document.createElement('div'); d.className='empty';
    d.textContent=L('Компонент не выбран.','No component selected.'); box.appendChild(d); return; }
  const mkRow=(label,node)=>{ const r=document.createElement('div'); r.className='row';
    const l=document.createElement('span'); l.className='lbl'; l.textContent=label;
    r.append(l,node); box.appendChild(r); return r; };
  const des=document.createElement('input'); des.type='text'; des.value=c.des;
  des.oninput=()=>{c.des=des.value;renderComps0();drawMarks();save()};
  mkRow('designator',des);
  const val=document.createElement('input'); val.type='text'; val.value=c.val; val.placeholder='10k / 100n';
  val.oninput=()=>{c.val=val.value;compVal[c.kind]=c.val;renderComps0();drawMarks();save()};
  mkRow('value',val);
  if(isIC(c)){ /* IC / connector: pattern info, side, net per pin */
    val.placeholder=isSOT(c)?'BC847':'SN74AC14';
    const pi=document.createElement('span'); pi.className='val'; pi.style.textAlign='left'; pi.style.flex='1';
    pi.textContent=c.size+' · '+ICPATNAME(c.pat); mkRow(L('корпус','package'),pi);
    if(c.pat==='l1'){ const sp=document.createElement('input'); sp.type='text'; sp.className='num'; sp.value=pinNo(c,0);
      sp.title=L('номер первого вывода','first pin number');
      sp.onchange=()=>{ const v=parseInt(sp.value,10); c.pin0=Number.isFinite(v)?v:1; renderProps(); drawMarks(); save(); };
      mkRow('start pin',sp);
      const opt=(pairs,v,on)=>{ const x=document.createElement('select'); x.className='slim';
        pairs.forEach(([k,t])=>{ const o=document.createElement('option'); o.value=k; o.textContent=t; x.appendChild(o); });
        x.value=v; x.onchange=()=>{ on(x.value); drawMarks(); save(); }; return x; };
      mkRow(L('пады','pads'),opt([['round',L('круглые','round')],['rect',L('прямоугольные','rectangular')]],c.ps||'round',v=>c.ps=v));
      const ls=opt([['r',L('справа','right')],['l',L('слева','left')]],c.ls||'r',v=>c.ls=v);
      ls.title=L('сторона подписей NET от ряда; у горизонтального ряда «справа» = снизу','NET label side of the row; for a horizontal row “right” = below');
      mkRow(L('подписи','labels'),ls);
      const fz=document.createElement('input'); fz.type='text'; fz.className='num'; fz.value=c.fs||''; fz.placeholder=L('авто','auto');
      fz.title=L('размер шрифта подписей NET, px экрана; пусто — 60% ширины пада','NET label font size, screen px; empty — 60% of the pad width');
      fz.onchange=()=>{ const v=parseFloat(fz.value); if(Number.isFinite(v)) c.fs=Math.max(5,Math.min(40,v)); else delete c.fs;
        fz.value=c.fs||''; drawMarks(); save(); };
      mkRow(L('шрифт','font'),fz); }
    const sd=document.createElement('select'); sd.className='slim';
    [['top','top-comp'],['bot','bot-comp']].forEach(([v,t])=>{const o=document.createElement('option'); o.value=v;o.textContent=t;sd.appendChild(o)});
    sd.value=c.side; sd.onchange=()=>{c.side=sd.value;renderComps();drawMarks();save()}; mkRow(L('сторона','side'),sd);
    const pl=document.createElement('div'); pl.style.cssText='display:grid;grid-template-columns:auto 1fr;gap:3px 6px;max-height:240px;overflow:auto;align-items:center';
    c.pads.forEach((pd,i)=>{ const n=document.createElement('span'); n.className='lbl'; n.style.textAlign='right'; n.textContent=String(pinNo(c,i));
      const s2=document.createElement('select'); s2.className='slim';
      const o0=document.createElement('option'); o0.value=''; o0.textContent='—'; s2.appendChild(o0);
      nets.forEach(nt=>{const o=document.createElement('option');o.value=nt.id;o.textContent=nt.name;s2.appendChild(o)});
      s2.value=pd.net||''; s2.onchange=()=>{pd.net=s2.value||null;drawMarks();save()}; pl.append(n,s2); });
    const ph=document.createElement('div'); ph.className='lbl'; ph.textContent=L('выводы → NET','pins → NET'); box.append(ph,pl);
    const del=document.createElement('button'); del.className='mini wide'; del.textContent=L('Удалить компонент','Delete component');
    del.onclick=()=>{comps=comps.filter(o=>o.id!==c.id);selComp=null;renderComps();drawMarks();save()};
    box.appendChild(del);
    return;
  }
  const sz=document.createElement('select'); sz.className='slim';
  Object.keys(PKG).forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=k;sz.appendChild(o)});
  sz.value=c.size; sz.onchange=()=>{c.size=sz.value;if(autoPins(c))renderProps();renderComps0();drawMarks();save()};
  mkRow(L('корпус','package'),sz);
  const sd=document.createElement('select'); sd.className='slim';
  [['top','top-comp'],['bot','bot-comp']].forEach(([v,t])=>{const o=document.createElement('option');
    o.value=v;o.textContent=t;sd.appendChild(o)});
  sd.value=c.side; sd.onchange=()=>{c.side=sd.value;renderComps();drawMarks();save()};
  mkRow(L('сторона','side'),sd);
  const rot=document.createElement('div'); rot.className='row'; rot.style.flex='1';
  const rl=document.createElement('button'); rl.className='mini'; rl.textContent='↺45';
  const rr=document.createElement('button'); rr.className='mini'; rr.textContent='↻45';
  const rv=document.createElement('span'); rv.className='val'; rv.textContent=(c.rot||0)+'°';
  rl.onclick=()=>{rotateComp(-45);rv.textContent=(c.rot||0)+'°'};
  rr.onclick=()=>{rotateComp(45);rv.textContent=(c.rot||0)+'°'};
  rot.append(rl,rr,rv); mkRow(L('угол','angle'),rot);
  [[L('вывод 1','pin 1'),'n1'],[L('вывод 2','pin 2'),'n2']].forEach(([lab,key])=>{
    const s2=document.createElement('select'); s2.className='slim';
    const o0=document.createElement('option'); o0.value=''; o0.textContent='—'; s2.appendChild(o0);
    nets.forEach(n=>{const o=document.createElement('option');o.value=n.id;o.textContent=n.name;s2.appendChild(o)});
    s2.value=c[key]||'';
    s2.onchange=()=>{c[key]=s2.value||null;drawMarks();save()};
    mkRow(lab,s2);
  });
  const del=document.createElement('button'); del.className='mini wide'; del.textContent=L('Удалить компонент','Delete component');
  del.onclick=()=>{comps=comps.filter(o=>o.id!==c.id);selComp=null;renderComps();drawMarks();save()};
  box.appendChild(del);
}
function renderComps0(){ /* list refresh without rebuilding props (keeps focus) */
  const box=$('complist');
  [...box.querySelectorAll('.crow')].forEach((row,i)=>{
    const list=comps.filter(c=>showSide[c.side]); const c=list[i]; if(!c)return;
    row.querySelector('.d').textContent=c.des;
    row.querySelector('.v').textContent=c.val||'—';
    row.querySelector('.s').textContent=c.size;
  });
}
function rotateComp(d){
  if(clickMode==='calib'&&calib){ calib.rot=(((calib.rot||0)+d)%360+360)%360;
    compRot=calib.rot; drawMarks(); syncComps(); return; }
  const c=comps.find(o=>o.id===selComp);
  if(clickMode==='comp'&&placing&&frameKind()&&(!c||(drag&&drag.t==='icrect'))){   /* placement orientation */
    icRot=(((icRot+d)%360)+360)%360; drawMarks(); syncComps(); save(); return; }
  if(c&&clickMode==='comp'&&isIC(c)){ const a=d*Math.PI/180*((!!view.fh!==!!view.fv)?-1:1);   /* IC: turn pads about the body */
    c.pads.forEach(pd=>{ const v=rotV({x:pd.x-c.x,y:pd.y-c.y},a); pd.x=c.x+v.x; pd.y=c.y+v.y; });
    if(isSOT(c)) c.rot=(((c.rot||0)+a*180/Math.PI)%360+360)%360;
    autoPins(c); drawMarks(); renderProps(); save(); return; }
  if(c&&clickMode==='comp'){ c.rot=(((c.rot||0)+d)%360+360)%360; compRot=c.rot; autoPins(c); drawMarks(); renderProps(); save(); return; }
  compRot=(((compRot+d)%360)+360)%360; syncComps();
}
const SLIDER_MIN=2, SLIDER_MAX=400;
function sliderToScale(v){ return SLIDER_MIN*Math.pow(SLIDER_MAX/SLIDER_MIN, v/1000); }
function scaleToSlider(s){ return Math.round(1000*Math.log(s/SLIDER_MIN)/Math.log(SLIDER_MAX/SLIDER_MIN)); }
function syncComps(){
  $('kindR').classList.toggle('on',compKind==='R');
  $('kindC').classList.toggle('on',compKind==='C');
  $('kindU').classList.toggle('on',compKind==='U'); $('kindQ').classList.toggle('on',compKind==='Q');
  $('icPatRow').hidden=$('icPinsRow').hidden=compKind!=='U'; $('compSizeRow').hidden=frameKind(); $('sotPatRow').hidden=compKind!=='Q'; $('sotPat').value=sotPat;
  $('icPat').value=icPat; if(document.activeElement!==$('icPins')) $('icPins').value=icPins;
  $('icPin0Row').hidden=compKind!=='U'||icPat!=='l1'; if(document.activeElement!==$('icPin0')) $('icPin0').value=icPin0;
  $('compSize').value=compSize; $('compSide').value=compSide;
  $('compPick').disabled=!mmScale&&!frameKind();
  if(clickMode!=='comp') placing=false;
  $('compPlace').disabled=$('compPick').disabled; $('compPlace').classList.toggle('on',placing);
  $('compPick').classList.toggle('on',clickMode==='comp');
  $('compPick').textContent=L('Правка (K)','Edit (K)');
  $('calBtn').classList.toggle('on',clickMode==='calib');
  $('calBtn').textContent=clickMode==='calib'?L('Идёт калибровка','Calibrating…'):L('Калибровать','Calibrate');
  $('calDone').disabled=clickMode!=='calib';
  $('calRange').disabled=!calib&&!mmScale;
  $('calVal').textContent=mmScale?mmScale.toFixed(1):'—';
  if(mmScale) $('calRange').value=scaleToSlider(mmScale);
  const g=PKG[calib?calib.size:$('calSize').value];
  $('calStatus').innerHTML = mmScale
    ? L(`1 мм = <b>${mmScale.toFixed(1)}</b> px изображения.<br>`,`1 mm = <b>${mmScale.toFixed(1)}</b> image px.<br>`)+
      (clickMode==='calib'
        ? L(`Двигайте эталон ${calib?calib.size:''} (${g.L}×${g.W} мм), ползунком подгоните размер, Space — поворот, затем «Готово».`,
            `Move the ${calib?calib.size:''} gauge (${g.L}×${g.W} mm), fit its size with the slider, Space — rotate, then “Done”.`)
        : L('Компоненты ставятся в этом масштабе.','Components are placed at this scale.'))
    : (clickMode==='calib'
        ? L(`Кликните по плате — появится эталон ${$('calSize').value} (${g.L}×${g.W} мм), подгоните его ползунком.`,
            `Click the board — a ${$('calSize').value} gauge appears (${g.L}×${g.W} mm); fit it with the slider.`)
        : L('<span class="bad">Масштаб не задан.</span> Нажмите «Калибровать».','<span class="bad">Scale not set.</span> Press “Calibrate”.'));
  const editTip=L('Клик по компоненту — выбрать, перетаскивание — двигать (пад IC — отдельно), Space — поворот на 45°, клик по пустому — снять выбор. Новые — кнопка «Поставить».',
    'Click a component — select, drag — move (an IC pad on its own), Space — rotate 45°, click empty — deselect. New parts — “Place”.');
  $('compStatus').innerHTML = (!frameKind()&&!mmScale) ? L('Сначала калибровка масштаба.','Calibrate the scale first.')
    : !(clickMode==='comp'&&placing) ? editTip
    : frameKind()
       ? L(`Space / Shift+Space — повернуть пиктограмму (${icRot}°, кружок — вывод 1), затем растяните рамку по крайним выводам — встанут ${plN()} падов. Esc — закончить.`,
           `Space / Shift+Space — turn the pictogram (${icRot}°, dot — pin 1), then drag a frame over the outer pins — ${plN()} pads appear. Esc — finish.`)
       : L(`Клик по плате ставит <b>${compKind}${compSeq[compKind]||1}</b> · ${compKind==='Q'?'SOT-23':compSize} · ${compSide}-comp · ${compRot}°. Esc — закончить.`,
           `A click on the board places <b>${compKind}${compSeq[compKind]||1}</b> · ${compKind==='Q'?'SOT-23':compSize} · ${compSide}-comp · ${compRot}°. Esc — finish.`)
       + (clickMode==='move'||clickMode==='crop' ? L('<br><b>Режим правки слоя</b> — компоненты сейчас не ловятся.','<br><b>Layer edit mode</b> — components are not picked now.') : '');
}
