/* ---------- interaction ---------- */
vp.addEventListener('wheel',e=>{e.preventDefault();
  const r=vp.getBoundingClientRect(), cx=e.clientX-r.left-r.width/2, cy=e.clientY-r.top-r.height/2;
  const f=Math.exp(-e.deltaY*0.0016), nz=Math.min(20,Math.max(.03,view.z*f)), k=nz/view.z;
  view.x=cx-(cx-view.x)*k; view.y=cy-(cy-view.y)*k; view.z=nz; applyView();
},{passive:false});

let drag=null;
vp.addEventListener('dragstart',e=>e.preventDefault());
vp.addEventListener('selectstart',e=>e.preventDefault());
vp.addEventListener('mousedown',e=>{ if(e.button===1) e.preventDefault(); });
vp.addEventListener('auxclick',e=>{ if(e.button===1) e.preventDefault(); });
vp.addEventListener('pointerdown',e=>{
  const s=sel_();
  if(e.button===1){ e.preventDefault();
    drag={t:'pan',x:e.clientX,y:e.clientY,moved:false,ox:view.x,oy:view.y};
    vp.classList.add('grabbing'); vp.setPointerCapture(e.pointerId); return; }
  if(e.button!==0)return;
  if(mergeFrom){ drag={t:'click',x:e.clientX,y:e.clientY,moved:false}; vp.setPointerCapture(e.pointerId); return; }
  if(e.target===handle){drag={t:'swipe'};vp.setPointerCapture(e.pointerId);return;}
  if(clickMode==='draw'){
    const m=worldFromEvent(e), h=hitNote(e);
    if(h){ selNote=h.n.id; renderProp();
      drag={t:'note',id:h.n.id,h:h.h||null,x:e.clientX,y:e.clientY,moved:false,o:JSON.parse(JSON.stringify(h.n))};
      vp.setPointerCapture(e.pointerId); drawMarks(); return; }
    if(drawTool==='arrow'||drawTool==='rect'||drawTool==='circle'){
      const n={id:nid(),t:drawTool,a:{x:m.x,y:m.y},b:{x:m.x,y:m.y},r:0,col:drawStyle.col,w:drawStyle.w,side:boardSide};
      if(n.t==='circle') delete n.b; else delete n.r;
      notes.push(n); selNote=n.id; drag={t:'nnew',id:n.id,x:e.clientX,y:e.clientY,moved:false};
      vp.setPointerCapture(e.pointerId); return; }
    drag={t:'click',x:e.clientX,y:e.clientY,moved:false}; vp.setPointerCapture(e.pointerId); return; }
  if(clickMode==='move'){
    const hb=hitLayerBox(e);
    if(hb==='piv'){ drag={t:'piv',x:e.clientX,y:e.clientY,moved:false}; vp.setPointerCapture(e.pointerId); return; }
    if(hb==='scale'||hb==='rot'){ const P=layerBox(s).P, m=evXY(e);
      drag={t:'l'+hb,x:e.clientX,y:e.clientY,moved:false,P,Pw:worldOf(s,pivotImg(s)),
        d0:Math.hypot(m.x-P.x,m.y-P.y)||1, a0:Math.atan2(m.y-P.y,m.x-P.x), osc:s.scale, orot:s.rot, ox:s.x, oy:s.y};
      vp.setPointerCapture(e.pointerId); return; }
    if(hb==='sx'||hb==='sy'){   /* side handle: stretch along that image axis about the pivot */
      const pv=pivotImg(s), P=layerBox(s).P, m=evXY(e);
      const a=screenOf(worldOf(s,hb==='sx'?{x:0,y:pv.y}:{x:pv.x,y:0})), c=screenOf(worldOf(s,hb==='sx'?{x:s.w,y:pv.y}:{x:pv.x,y:s.h}));
      const len=Math.hypot(c.x-a.x,c.y-a.y)||1, u={x:(c.x-a.x)/len,y:(c.y-a.y)/len}, d0=(m.x-P.x)*u.x+(m.y-P.y)*u.y;
      if(Math.abs(d0)<4) return;   /* pivot under the handle: nothing to stretch about */
      drag={t:'lstretch',a:hb,x:e.clientX,y:e.clientY,moved:false,P,u,d0,o:s[hb]||1,piv:{...pv},Pw:worldOf(s,pv)};
      vp.setPointerCapture(e.pointerId); return; }
    if(s&&!s.H){ drag={t:'layer',x:e.clientX,y:e.clientY,moved:false,ox:s.x,oy:s.y,inside:hb==='in'};
      vp.classList.add('grabbing'); vp.setPointerCapture(e.pointerId); }
    return; }
  if(clickMode==='crop'){
    const h=s&&hitCropBox(e);
    if(h){ drag={t:'crop',x:e.clientX,y:e.clientY,moved:false,h,oc:{...cropRect(s)},o:imgOf(s,worldFromEvent(e))};
      vp.setPointerCapture(e.pointerId); }
    return; }
  {
    const m=worldFromEvent(e);
    if(clickMode==='calib'&&calib){
      const g=PKG[calib.size], k=mmScale||1;
      if(Math.hypot(m.x-calib.x,m.y-calib.y)<=Math.max(g.L,g.W)/2*k*1.3){
        drag={t:'calib',x:e.clientX,y:e.clientY,moved:false,ox:calib.x,oy:calib.y};
        vp.setPointerCapture(e.pointerId); return; }
    }
    if(clickMode==='comp'){ const hb=hitComp(m), hp=!(hb&&isIC(hb))&&hitICPad(e);   /* IC pad (body box wins): move it alone */
      if(hp){ selComp=hp.c.id; renderComps();
        drag={t:'icpad',id:hp.c.id,i:hp.i,x:e.clientX,y:e.clientY,moved:false,ox:hp.c.pads[hp.i].x,oy:hp.c.pads[hp.i].y};
        vp.setPointerCapture(e.pointerId); drawMarks(); return; } }
    const hc=hitComp(m);
    if(hc && clickMode==='comp'){
      selComp=hc.id; renderComps();
      drag={t:'comp',id:hc.id,x:e.clientX,y:e.clientY,moved:false,ox:hc.x,oy:hc.y,
        pads:hc.pads?hc.pads.map(pd=>({x:pd.x,y:pd.y})):null};
      vp.setPointerCapture(e.pointerId); return; }
    if(clickMode==='comp'&&placing&&frameKind()){ const q=evXY(e);   /* drag a rectangle over the part's pins */
      drag={t:'icrect',x:e.clientX,y:e.clientY,moved:false,sx:q.x,sy:q.y,ex:q.x,ey:q.y};
      vp.setPointerCapture(e.pointerId); return; }
  }
  drag={t:'click',x:e.clientX,y:e.clientY,moved:false};
  vp.setPointerCapture(e.pointerId);
});
vp.addEventListener('dblclick',e=>{
  if(clickMode==='move'&&hitLayerBox(e)==='piv'){ const s=sel_(); s.piv=null; drawMarks(); }
});
vp.addEventListener('pointermove',e=>{
  if(!drag){
    if(clickMode==='move'){ const h=hitLayerBox(e);
      let c=h==='piv'?'move':h==='scale'?'nwse-resize':h==='rot'?'alias':'';
      if(h==='sx'||h==='sy'){ const q=layerBox(sel_()).q, v=h==='sx'?{x:q[1].x-q[0].x,y:q[1].y-q[0].y}:{x:q[3].x-q[0].x,y:q[3].y-q[0].y};
        c=Math.abs(v.x)>=Math.abs(v.y)?'ew-resize':'ns-resize'; }
      vp.style.cursor=c; }
    if(clickMode==='comp'&&placing&&frameKind()){ mouseAt={clientX:e.clientX,clientY:e.clientY}; drawMarks(); }
    if(clickMode==='crop'){ const h=sel_()&&hitCropBox(e);
      vp.style.cursor=!h?'':h.ex==='in'?'move':(h.ex&&h.ey)?'nwse-resize':h.ex?'ew-resize':'ns-resize'; }
    return; }
  if(drag.t==='swipe'){const r=vp.getBoundingClientRect();
    swipe=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)); applyClip(); save(); return;}
  const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
  if(Math.hypot(dx,dy)>3)drag.moved=true;
  if(drag.t==='pan'){view.x=drag.ox+dx; view.y=drag.oy+dy; applyView(); return;}
  if(drag.t==='layer'){const s=sel_(); if(!s||s.H)return;
    const d=screenDelta(dx,dy);
    s.x=drag.ox+d.x; s.y=drag.oy+d.y; applyLayer(s); sync(); return;}
  if(drag.t==='piv'){ const s=sel_(); if(!s)return; s.piv=imgOf(s,worldFromEvent(e)); drawMarks(); return; }
  if(drag.t==='lstretch'){ const s=sel_(); if(!s||s.H)return;
    const m=evXY(e), d=(m.x-drag.P.x)*drag.u.x+(m.y-drag.P.y)*drag.u.y;
    s[drag.a]=Math.max(.01,+(drag.o*d/drag.d0).toFixed(4));
    s.x=s.y=0; const v=T(s,drag.piv); s.x=drag.Pw.x-v.x; s.y=drag.Pw.y-v.y;   /* pivot stays in place */
    applyLayer(s); sync(); return;}
  if(drag.t==='lscale'||drag.t==='lrot'){ const s=sel_(); if(!s||s.H)return;
    const m=evXY(e), px=m.x-drag.P.x, py=m.y-drag.P.y, W=drag.Pw, t0={x:drag.ox-W.x,y:drag.oy-W.y};
    if(drag.t==='lscale'){       /* scale about the pivot: t' = Pw + k (t - Pw) */
      s.scale=Math.max(.01,+(drag.osc*Math.hypot(px,py)/drag.d0).toFixed(4));
      const k=s.scale/drag.osc; s.x=W.x+k*t0.x; s.y=W.y+k*t0.y;
    } else {                     /* rotate about the pivot: t' = Pw + R(d) (t - Pw) */
      let da=(Math.atan2(py,px)-drag.a0)*180/Math.PI;
      if(!!view.fh!==!!view.fv) da=-da;          /* mirrored view turns the other way */
      let a=drag.orot+da; if(e.shiftKey) a=Math.round(a/15)*15;
      s.rot=+((((a+180)%360+360)%360)-180).toFixed(2);
      const v=rotV(t0,(a-drag.orot)*Math.PI/180); s.x=W.x+v.x; s.y=W.y+v.y;
    }
    applyLayer(s); sync(); return;}
  if(drag.t==='crop'){ const s=sel_(); if(!s)return;
    const q=imgOf(s,worldFromEvent(e)), c={...drag.oc}, h=drag.h, MIN=8;
    const cx=v=>Math.max(0,Math.min(s.w,v)), cy=v=>Math.max(0,Math.min(s.h,v));
    if(h.ex==='in'){ const dx=Math.max(-c.x0,Math.min(s.w-c.x1,q.x-drag.o.x)), dy=Math.max(-c.y0,Math.min(s.h-c.y1,q.y-drag.o.y));
      c.x0+=dx; c.x1+=dx; c.y0+=dy; c.y1+=dy; }
    else {
      if(h.ex==='x0') c.x0=Math.min(cx(q.x),c.x1-MIN); if(h.ex==='x1') c.x1=Math.max(cx(q.x),c.x0+MIN);
      if(h.ey==='y0') c.y0=Math.min(cy(q.y),c.y1-MIN); if(h.ey==='y1') c.y1=Math.max(cy(q.y),c.y0+MIN);
    }
    for(const k in c) c[k]=Math.round(c[k]*10)/10;
    s.crop=(c.x0<=0&&c.y0<=0&&c.x1>=s.w&&c.y1>=s.h)?null:c; applyLayer(s); return; }
  if(drag.t==='note'){ const n=notes.find(o=>o.id===drag.id); if(!n)return;
    const d=screenDelta(dx,dy), o=drag.o, w=worldFromEvent(e);
    if(!drag.h||(drag.h==='a'&&n.t==='circle')){ n.a={x:o.a.x+d.x,y:o.a.y+d.y}; if(o.b&&!drag.h) n.b={x:o.b.x+d.x,y:o.b.y+d.y}; }
    else if(drag.h==='r') n.r=Math.hypot(w.x-n.a.x,w.y-n.a.y);
    else n[drag.h]={x:w.x,y:w.y};
    drawMarks(); return; }
  if(drag.t==='nnew'){ const n=notes.find(o=>o.id===drag.id); if(!n)return; const w=worldFromEvent(e);
    if(n.t==='circle') n.r=Math.hypot(w.x-n.a.x,w.y-n.a.y); else n.b={x:w.x,y:w.y}; drawMarks(); return; }
  if(drag.t==='comp'){const c=comps.find(o=>o.id===drag.id); if(!c)return;
    const d=screenDelta(dx,dy); c.x=drag.ox+d.x; c.y=drag.oy+d.y;
    if(drag.pads) c.pads.forEach((pd,i)=>{ pd.x=drag.pads[i].x+d.x; pd.y=drag.pads[i].y+d.y; });
    drawMarks(); save(); return;}
  if(drag.t==='icpad'){const c=comps.find(o=>o.id===drag.id); if(!c)return;
    const d=screenDelta(dx,dy), pd=c.pads[drag.i]; pd.x=drag.ox+d.x; pd.y=drag.oy+d.y; drawMarks(); return;}
  if(drag.t==='icrect'){ const q=evXY(e); drag.ex=q.x; drag.ey=q.y; drawMarks(); return; }
  if(drag.t==='calib'&&calib){const d=screenDelta(dx,dy);
    calib.x=drag.ox+d.x; calib.y=drag.oy+d.y; drawMarks(); return;}
});
vp.addEventListener('pointerup',e=>{
  if(e.button===1){ drag=null; vp.classList.remove('grabbing'); return; }
  if(e.button!==0)return;
  const d=drag; drag=null; vp.classList.remove('grabbing');
  if(d&&d.t==='layer'&&!d.moved&&d.inside){ xfMode=xfMode==='scale'?'rot':'scale'; drawMarks(); sync(); return; }
  if(d&&d.t==='comp'&&d.moved){ const c=comps.find(o=>o.id===d.id);
    if(c&&autoPins(c)){ renderProps(); drawMarks(); save(); } return; }
  if(d&&d.t==='icpad'){ const c=comps.find(o=>o.id===d.id);
    if(c&&d.moved){ autoPins(c); renderProps(); save(); } drawMarks(); return; }
  if(d&&d.t==='icrect'){ const f=icFrame(d.sx,d.sy,d.ex,d.ey);
    if(f.x1-f.x0>=8||f.y1-f.y0>=8) addIC(f);
    else { selComp=null; renderComps(); drawMarks(); }   /* short click on empty: deselect, Space turns the pictogram again */
    syncComps(); return; }
  if(d&&d.t==='note'){ if(d.moved) save(); renderProp(); drawMarks(); return; }
  if(d&&d.t==='nnew'){ const n=notes.find(o=>o.id===d.id);
    if(n&&!d.moved){ notes=notes.filter(o=>o!==n); selNote=null; } else save();   /* a click is not a shape */
    renderProp(); drawMarks(); return; }
  if(!d||d.moved||d.t!=='click')return;
  const m=worldFromEvent(e), s=sel_();
  if(mergeFrom){ const hit=hitPoint(m);
    if(hit&&hit.net!==mergeFrom) mergeNets(mergeFrom,hit.net);
    else if(!hit){ hlNet=mergeFrom; mergeFrom=null; renderNets(); drawMarks(); sync(); }   /* empty spot: cancel */
    return; }
  if(clickMode==='calib'){
    if(!calib){ calib={size:$('calSize').value,x:m.x,y:m.y,rot:compRot};
      if(!mmScale) mmScale=sliderToScale(+$('calRange').value); }
    else { calib.x=m.x; calib.y=m.y; }
    drawMarks(); syncComps(); save(); return;
  }
  if(clickMode==='draw'){
    if(drawTool==='text'){ const n={id:nid(),t:'text',a:{x:m.x,y:m.y},txt:L('текст','text'),col:drawStyle.col,fs:drawStyle.fs,w:0,side:boardSide};
      notes.push(n); selNote=n.id; save(); renderProp(); drawMarks(); focusProp('noteTxt'); }   /* type the text right away */
    else { selNote=null; renderProp(); drawMarks(); }
    return; }
  if(clickMode==='comp'){
    const hc=hitComp(m);
    if(hc){ selComp=hc.id; renderComps(); }
    else if(placing) addComp(m);
    else if(selComp){ selComp=null; renderComps(); }   /* edit mode: click on empty deselects */
    drawMarks(); syncComps(); return;
  }
  if(clickMode==='none'){
    const hit=hitPoint(m);
    if(!hit){ const q=screenOf(m), pc=padCover().find(o=>o.has(m,q));   /* a pad with a NET is a NET point too */
      if(pc){ hlNet=activeNet=pc.net; selPoint=null; selComp=pc.c.id; renderNets(); renderComps(); drawMarks(); syncComps(); sync(); return; } }
    const hc=!hit&&hitComp(m);
    if(hit&&selComp){ selComp=null; renderComps(); }
    if(hc) selPoint=null;
    if(!hit&&(hlNet||selPoint)){ hlNet=null; selPoint=null; renderNets(); sync(); }   /* click off a NET point clears it */
    if(hc){ selComp=hc.id; renderComps(); drawMarks(); syncComps(); return; }
    if(!hit&&selComp){ selComp=null; renderComps(); drawMarks(); syncComps(); sync(); }   /* empty spot: deselect the part too */
  }
  if(clickMode==='align'&&s){
    const r=byId(refId); if(!r)return;
    if(s.pairs.length>=8&&!pending)return;
    if(!pending) pending=imgOf(s,m);          /* 1st click: active layer, 2nd: the same point on the reference */
    else { s.pairs.push({rl:refId, r:imgOf(r,m), m:pending}); pending=null;
           if(s.pairs.length>=2)recompute(false); }
    sync(); drawMarks(); save(); return;
  }
  if(clickMode==='net'&&s){
    const newNet=e.ctrlKey;            /* Ctrl+click: new NET with its first point here, then type its name */
    if(newNet) addNet(false);
    const hit=!newNet&&hitPoint(m);
    if(hit){ selPoint=hit.id; activeNet=hit.net; hlNet=hit.net; renderNets(); }
    else if(activeNet){
      const via=e.altKey||newNet; /* Alt+click: via, shown on both sides; a new NET (Ctrl+click) starts with a via */
      const host=mainOf(boardSide)||s;   /* glued to the side's main photo, follows its move / warp */
      points.push({id:'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),
        net:activeNet, layer:host.id, side:boardSide, p:imgOf(host,m), ...(via?{via:true}:{})});
      pinFromPoint(m,activeNet,via);
      selPoint=null; renderNets();
    }
    sync(); drawMarks(); save();
    if(newNet) focusNetName(activeNet);
    return;
  }
  const hit=hitPoint(m);
  if(hit){ hlNet=hit.net; activeNet=hit.net; selPoint=hit.id; renderNets(); sync(); }
  drawMarks();
});
vp.addEventListener('contextmenu',e=>e.preventDefault());   /* no right-click delete: select, then Delete */

document.querySelectorAll('[data-ltab]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('[data-ltab]').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('[data-lpage]').forEach(p=>p.hidden=p.dataset.lpage!==b.dataset.ltab);
});
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('[data-page]').forEach(p=>p.hidden=p.dataset.page!==b.dataset.tab);
  if(b.dataset.tab==='video'){ const v=videoLayer(); if(v&&v.vmode!=='window') videoMode(v,'move',true); else renderVideo(); }
});
function videoMode(l,mode,force){ /* make the video layer active and toggle M / crop on it */
  sel=l.id; if(refId===sel) refId=(layers.find(x=>x.id!==sel)||l).id;
  if(mode==='move'&&l.H) mode='crop';
  clickMode=(!force&&clickMode===mode)?'none':mode; pending=null; calib=null;
  renderCards(); renderVideo(); applyAll(); sync(); syncComps(); drawMarks();
}
document.querySelectorAll('[data-vm]').forEach(b=>b.onclick=()=>{
  viewMode=b.dataset.vm; applyAll(); sync(); save();
});
$('refSel').onchange=e=>{ refId=e.target.value;
  if(refId===sel){ const o=layers.find(l=>l.id!==sel); if(o)refId=o.id; }
  pending=null; applyAll(); sync(); drawMarks(); save(); };
$('rot').oninput=()=>{const s=sel_(); if(!s)return; s.rot=parseFloat($('rot').value);applyLayer(s);sync()};
function numIn(id,apply){
  const el=$(id);
  const commit=()=>{ const v=parseFloat(String(el.value).replace(',','.').replace(/[^0-9.+\-eE]/g,''));
    if(!isFinite(v)){ el.classList.add('bad'); return; }
    el.classList.remove('bad'); apply(v); };
  el.addEventListener('keydown',e=>{ if(e.key==='Enter'){commit();el.blur();}
    else if(e.key==='Escape'){el.classList.remove('bad');el.blur();sync();} e.stopPropagation(); });
  el.addEventListener('change',commit);
  el.addEventListener('blur',()=>setTimeout(sync,0));
}
numIn('rotv',v=>{ const s=sel_(); if(!s||s.H)return;
  let a=((v+180)%360+360)%360-180; s.rot=Math.round(a*100)/100; applyLayer(s); sync(); });
numIn('sclv',v=>{ const s=sel_(); if(!s||s.H)return;
  s.scale=Math.min(50,Math.max(0.01,v)); applyLayer(s); sync(); });
$('scl').oninput=()=>{const s=sel_(); if(!s)return; s.scale=parseFloat($('scl').value);applyLayer(s);sync()};
$('rstLayer').onclick=()=>{const s=sel_(); if(!s)return;
  s.x=s.y=s.rot=0;s.scale=s.sx=s.sy=1;s.H=null;warpInfo='';applyLayer(s);renderCards();sync()};
$('cropBtn').onclick=()=>{ clickMode=clickMode==='crop'?'none':'crop';
  if(clickMode==='crop'){pending=null;calib=null;} sync();syncComps();drawMarks(); };
$('rstCrop').onclick=()=>{ const s=sel_(); if(!s)return; s.crop=null; applyLayer(s); sync(); };
$('moveBtn').onclick=()=>{ clickMode=clickMode==='move'?'none':'move';
  if(clickMode==='move'){pending=null;calib=null;} sync();syncComps();drawMarks(); };
/* flip keeps a fixed point on screen: the selected via, else the point under the cursor (else the viewport centre) */
let mouseAt=null;
vp.addEventListener('pointermove',e=>{ mouseAt={clientX:e.clientX,clientY:e.clientY}; });
vp.addEventListener('pointerleave',()=>{ mouseAt=null; });
function flipAnchor(){
  const pt=points.find(p=>p.id===selPoint), lay=pt&&byId(pt.layer);
  if(pt&&pt.via&&lay) return worldOf(lay,pt.p);
  if(mouseAt) return worldFromEvent(mouseAt);
  const r=vp.getBoundingClientRect(); return worldFromEvent({clientX:r.left+r.width/2,clientY:r.top+r.height/2});
}
function flipBoard(){
  const aw=flipAnchor(), as=screenOf(aw);
  boardSide = boardSide==='top' ? 'bot' : 'top';
  view.fh=!view.fh;
  { const s2=screenOf(aw); view.x+=as.x-s2.x; view.y+=as.y-s2.y; }
  if(!xray){ showSide.top = boardSide==='top'; showSide.bot = boardSide==='bot'; }
  else xraySideOp();
  const vis=layers.filter(onSide);
  if(vis.length && !vis.some(l=>l.on)) { /* nothing visible on this side — leave as is */ }
  if(!byId(sel)||effOpacity(byId(sel))===0){ const c=vis.find(l=>l.on); if(c)sel=c.id; }
  if(refId===sel){ const o=layers.find(l=>l.id!==sel); if(o)refId=o.id; }
  applyView(); applyAll(); renderCards(); renderComps(); renderVideo(); sync(); save();
}
$('flipBoard').onclick=flipBoard;
$('xrayBtn').onclick=()=>{
  xray=!xray; xraySideOp();
  if(xray){ showSide.top=showSide.bot=true; }
  else { showSide.top=boardSide==='top'; showSide.bot=boardSide==='bot';
    if(!byId(sel)||effOpacity(byId(sel))===0){ const c=layers.find(l=>l.on&&onSide(l)); if(c)sel=c.id; } }
  applyAll(); renderCards(); renderComps(); drawMarks(); sync(); save();
};
$('xrayOp').oninput=()=>{ const v=parseFloat($('xrayOp').value); if(!Number.isFinite(v)) return;
  xrayOp=Math.max(0,Math.min(100,v))/100; if(!xray) return;
  xraySideOp(); applySideOp(boardSide); renderCards(); };
$('xrayOp').onchange=()=>{ $('xrayOp').value=Math.round(xrayOp*100); };
$('xrayOp').onkeydown=e=>{ if(e.key==='Enter'||e.key==='Escape') $('xrayOp').blur(); };
$('rstView').onclick=()=>fit();
function rotateView(d){ view.rot=(((view.rot+d)%360)+360)%360; applyView(); sync(); }
$('vrotL').onclick=()=>rotateView(-90);
$('vrotR').onclick=()=>rotateView(90);
$('vflipH').onclick=()=>{view.fh=!view.fh;applyView();sync()};
$('vflipV').onclick=()=>{view.fv=!view.fv;applyView();sync()};
$('vreset').onclick=()=>{view.rot=0;view.fh=view.fv=false;applyView();sync()};
$('gridBtn').onclick=()=>{grid=!grid;sync();save()};
$('invBtn').onclick=()=>{inverted=!inverted;applyAll();sync()};
$('grayBtn').onclick=()=>{grayView=!grayView;drawMarks();sync();save()};

$('pickBtn').onclick=()=>{clickMode=clickMode==='align'?'none':'align';
  if(clickMode!=='align')pending=null;
  else{ const s=sel_(), r=byId(refId); if(s)s.on=true; if(r)r.on=true;
        if(viewMode==='swipe'){viewMode='all';} renderCards(); applyAll(); }
  sync();drawMarks()};
$('blinkBtn').onclick=()=>{blinkOn=!blinkOn;sync();save()};
$('applyWarp').onclick=()=>recompute(true);
$('warpModel').onchange=e=>{warpModel=e.target.value; const s=sel_();
  if(s&&s.pairs.length>=2)recompute(true); save(); };
$('undoPt').onclick=()=>{const s=sel_(); if(!s)return;
  if(pending)pending=null;else s.pairs.pop();
  if(s.pairs.length>=2)recompute(false);else{s.H=null;warpInfo='';applyLayer(s)}
  sync();drawMarks();save()};
$('clearPts').onclick=()=>{const s=sel_(); if(!s)return;
  s.pairs=[];pending=null;s.H=null;warpInfo='';applyLayer(s);sync();drawMarks();save()};
$('dropWarp').onclick=()=>{const s=sel_(); if(!s)return;
  s.H=null;warpInfo='';applyLayer(s);sync();drawMarks();save()};

$('kindR').onclick=()=>{compKind='R';syncComps()};
$('kindC').onclick=()=>{compKind='C';syncComps()};
$('kindU').onclick=()=>{compKind='U';syncComps();save()};
$('kindQ').onclick=()=>{compKind='Q';syncComps();save()};
Object.entries(ICPAT).forEach(([k,[t]])=>{ const o=document.createElement('option'); o.value=k; o.textContent=t; $('icPat').appendChild(o); });
$('icPat').onchange=e=>{icPat=e.target.value;syncComps();save()};
$('sotPat').onchange=e=>{sotPat=e.target.value;syncComps();drawMarks();save()};
$('icPins').onchange=e=>{ icPins=Math.max(1,Math.min(400,parseInt(e.target.value,10)||8)); syncComps(); save(); };
$('icPin0').onchange=e=>{ const v=parseInt(e.target.value,10); icPin0=Number.isFinite(v)?v:1; syncComps(); save(); };
$('compSize').onchange=e=>{compSize=e.target.value;syncComps();save()};
$('compSide').onchange=e=>{compSide=e.target.value;syncComps();save()};
$('compPick').onclick=()=>{ clickMode=clickMode==='comp'?'none':'comp'; placing=false;
  if(clickMode==='comp'){calib=null;showComps=true;} sync();syncComps();drawMarks(); };
$('compPlace').onclick=()=>{ placing=!placing;
  if(placing&&clickMode!=='comp'){ clickMode='comp'; calib=null; showComps=true; }
  if(placing) selComp=null;   /* Space turns the new part's pictogram, not the last one */
  renderComps(); sync(); syncComps(); drawMarks(); };
$('calBtn').onclick=()=>{ if(clickMode==='calib'){clickMode='none';calib=null;}
  else {clickMode='calib'; if(!mmScale) mmScale=sliderToScale(+$('calRange').value);}
  sync();syncComps();drawMarks(); };
$('calRotL').onclick=()=>rotateComp(-45);
$('calRotR').onclick=()=>rotateComp(45);
$('calDone').onclick=()=>{ clickMode='none'; calib=null; sync();syncComps();drawMarks();save(); };
$('calSize').onchange=()=>{ if(calib)calib.size=$('calSize').value; syncComps(); drawMarks(); };
$('calRange').oninput=e=>{ mmScale=sliderToScale(+e.target.value); syncComps(); drawMarks(); save(); };
$('colTop').oninput=e=>{SIDECOL.top=e.target.value;renderComps();drawMarks();save()};
$('colBot').oninput=e=>{SIDECOL.bot=e.target.value;renderComps();drawMarks();save()};
$('showTop').onclick=()=>{showSide.top=!showSide.top;renderComps();drawMarks();save()};
$('showBot').onclick=()=>{showSide.bot=!showSide.bot;renderComps();drawMarks();save()};
$('addNet').onclick=()=>addNet(true);
$('netPickBtn').onclick=()=>{ if(!nets.length)addNet();
  clickMode=clickMode==='net'?'none':'net'; if(clickMode==='net')showNets=true; sync();drawMarks()};
CORUI.forEach(([k,lab,mn,mx,st,fmt,tt])=>{
  const r=document.createElement('div'); r.className='row'; r.title=tt;
  const l=document.createElement('span'); l.className='lbl'; l.style.flex='none'; l.style.width='44px'; l.textContent=lab;
  const i=document.createElement('input'); i.type='range'; i.min=mn; i.max=mx; i.step=st; i.id='cor_'+k;
  const v=document.createElement('span'); v.className='val'; v.id='corv_'+k; v.style.minWidth='38px';
  i.oninput=()=>{ const s=sel_(); if(!s)return; s.cor[k]=+i.value; v.textContent=fmt(+i.value); applyTint(s); save(); };
  i.ondblclick=()=>{ const s=sel_(); if(!s)return; s.cor[k]=COR0[k]; applyTint(s); syncCor(); save(); };
  r.append(l,i,v); $('corBox').appendChild(r); });
function syncCor(){ const s=sel_();
  CORUI.forEach(([k,,,,,fmt])=>{ const i=$('cor_'+k); i.disabled=!s; if(!s)return;
    if(document.activeElement!==i) i.value=s.cor[k]; $('corv_'+k).textContent=fmt(s.cor[k]); });
  ['corText','corTextCol','corThr','corReset'].forEach(i=>$(i).disabled=!s); }
const corPreset=a=>{ const s=sel_(); if(!s)return; s.cor={...COR0,...a}; applyTint(s); syncCor(); save(); };
$('corText').onclick=()=>corPreset({sat:0,ct:1.8,sh:.6});
$('corTextCol').onclick=()=>{ const s=sel_(); if(!s)return;  /* coloured labels: also sets the layer's own tint */
  s.tm='screen'; s.tn=1; corPreset({sat:0,ct:1.8,sh:.6,lb:1}); renderCards(); sync(); };
$('corThr').onclick=()=>corPreset({sat:0,ct:1.6,pz:2});
$('corReset').onclick=()=>corPreset({});
/* СЛОИ header: α / blend / tint / flips / rotations of the active layer */
BLENDS.forEach(([v,t])=>{ const o=document.createElement('option'); o.value=v; o.textContent=BLENDS_SHORT[v]||t; o.title=t; $('aBlend').appendChild(o); });
TINTS.forEach(([v,t,full])=>{ const o=document.createElement('option'); o.value=v; o.textContent=t; if(full)o.title=full; $('aTm').appendChild(o); });
function syncActl(){ const l=sel_(), ids=['aOp','aBlend','aTc','aTn','aTm','aFh','aFv','aRl','aRr'];
  ids.forEach(i=>$(i).disabled=!l); if(!l) return;
  const keep=i=>document.activeElement!==$(i);
  if(keep('aOp')) $('aOp').value=Math.round(l.op*100); $('aOpV').textContent=Math.round(l.op*100)+'%';
  $('aBlend').value=l.blend; $('aBlend').disabled=idx(l.id)===0;
  $('aBlend').title=idx(l.id)===0?L('нижний слой смешивать не с чем','the bottom layer has nothing to blend with'):L('режим наложения на нижележащие слои','blend mode over the layers below');
  if(keep('aTc')) $('aTc').value=l.tc;
  if(keep('aTn')) $('aTn').value=Math.round(l.tn*100); $('aTnV').textContent=Math.round(l.tn*100)+'%';
  $('aTm').value=l.tm||tintMode;
  $('aFh').classList.toggle('on',!!l.fh); $('aFv').classList.toggle('on',!!l.fv); }
const actl=fn=>()=>{ const l=sel_(); if(l) fn(l); };
$('aOp').oninput=actl(l=>{ l.op=$('aOp').value/100; $('aOpV').textContent=$('aOp').value+'%'; applyLayer(l); renderVideo(); });
$('aBlend').onchange=actl(l=>{ l.blend=$('aBlend').value; applyLayer(l); save(); });
$('aTc').oninput=actl(l=>{ l.tc=l.color=$('aTc').value; applyTint(l); save();   /* layer colour = tint colour */
  document.querySelectorAll(`.swatch[data-lid="${l.id}"]`).forEach(x=>x.style.background=l.tc); });
$('aTn').oninput=actl(l=>{ l.tn=$('aTn').value/100; $('aTnV').textContent=$('aTn').value+'%'; applyTint(l); save(); });
$('aTm').onchange=actl(l=>{ l.tm=$('aTm').value; applyTint(l); save(); });
const aXf=fn=>actl(l=>{ if(l.H){l.H=null;warpInfo='';} fn(l);
  if(l.rot>180)l.rot-=360; if(l.rot<-180)l.rot+=360; applyLayer(l); renderVideo(); sync(); });
$('aFh').onclick=aXf(l=>l.fh=!l.fh); $('aFv').onclick=aXf(l=>l.fv=!l.fv);
$('aRl').onclick=aXf(l=>l.rot=Math.round((l.rot-90)*10)/10); $('aRr').onclick=aXf(l=>l.rot=Math.round((l.rot+90)*10)/10);
$('keyOn').onclick=()=>{ const l=sel_(); if(!l)return; l.kOn=!l.kOn; applyLayer(l); sync(); };
$('keyCol').oninput=e=>{ const l=sel_(); if(!l)return; l.kc=e.target.value; l.kOn=true; applyLayer(l); sync(); };
$('keyTol').oninput=e=>{ const l=sel_(); if(!l)return; l.kt=+e.target.value/100; applyLayer(l); sync(); };
$('keyPick').onclick=async()=>{ const l=sel_(); if(!l||!window.EyeDropper)return;
  try{ const r=await new EyeDropper().open(); l.kc=r.sRGBHex; l.kOn=true; applyLayer(l); sync(); }catch(err){} };
$('showNetsBtn').onclick=()=>{showNets=!showNets;sync();drawMarks();save()};
$('showCompsBtn').onclick=()=>{showComps=!showComps;sync();drawMarks();save()};
$('showDrawBtn').onclick=()=>{showDraw=!showDraw;sync();drawMarks();save()};
$('drawBtn').onclick=()=>{ clickMode=clickMode==='draw'?'none':'draw'; if(clickMode==='draw'){ showDraw=true; pending=null; calib=null; }
  sync(); drawMarks(); };
document.querySelectorAll('#drawTools [data-tool]').forEach(b=>b.onclick=()=>{ drawTool=b.dataset.tool;
  if(clickMode!=='draw'){ clickMode='draw'; showDraw=true; pending=null; calib=null; } sync(); drawMarks(); });
const styleSel=(k,v)=>{ drawStyle[k]=v; const n=notes.find(o=>o.id===selNote);
  if(n&&clickMode==='draw'&&((k==='fs')===(n.t==='text')||k==='col')) n[k]=v; syncDraw(); renderProp(); drawMarks(); save(); };
$('drawCol').oninput=e=>styleSel('col',e.target.value);
$('drawW').oninput=e=>styleSel('w',+e.target.value);
$('drawFs').oninput=e=>styleSel('fs',+e.target.value);
$('delPoint').onclick=()=>{points=points.filter(p=>p.id!==selPoint);selPoint=null;renderNets();drawMarks();sync();save()};
$('clearNetPts').onclick=()=>{points=points.filter(p=>p.net!==activeNet);selPoint=null;renderNets();drawMarks();sync();save()};
$('labelsBtn').onclick=()=>{labels=!labels;sync();drawMarks();save()};

$('addLayer').onclick=()=>{ const l=addLayer(); browseTarget=l.id; $('fileImg').click(); };
$('fileImg').onchange=e=>{const f=e.target.files[0]; if(f&&browseTarget)storeFile(browseTarget,f); e.target.value='';};
$('projSave').onclick=()=>saveProject(false);
$('projLoad').onclick=()=>$('fileProj').click();
$('fileProj').onchange=e=>{ const f=e.target.files[0]; e.target.value=''; if(f) loadProject(f); };
$('missPick').onclick=()=>$('fileMany').click();
$('missSkip').onclick=()=>saveProject(true);
$('fileMany').onchange=e=>{ const fs=[...e.target.files]; e.target.value=''; if(fs.length) pickMissing(fs); };
$('saveNow').onclick=()=>{booted=true;saveNow(); if(workDirOk){ clearTimeout(dirTimer); writeDirQ(); }};
$('newProj').onclick=()=>{
  const n=layers.filter(l=>l.src||l.stored).length;
  if(!confirm(L('Новый проект?\n\nИз браузера будут удалены: слои ('+layers.length+', с картинками '+n+'), NET ('+nets.length+
    '), компоненты ('+comps.length+'), деформации и калибровка.\nНе сохранённое в *.pcbr пропадёт.',
    'New project?\n\nThis removes from the browser: layers ('+layers.length+', with images '+n+'), NETs ('+nets.length+
    '), components ('+comps.length+'), warps and calibration.\nAnything not saved to *.pcbr will be lost.'))) return;
  booted=false; clearTimeout(saveTimer);          /* no autosave between clearing and reload */
  localStorage.removeItem(KEY);
  layers.forEach(l=>localStorage.removeItem(IMGKEY(l.id)));
  try{ sessionStorage.setItem(NEWKEY,'1'); }catch(err){}
  setDirty(false);   /* a new project is not the working folder's one: forget the folder */
  Promise.all([idb.clear().catch(()=>{}),idb.meta.del('workDir').catch(()=>{})]).then(()=>location.reload()); };

addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;
  const st=e.shiftKey?10:1, s=sel_(); let h=true;
  if(e.altKey&&e.code==='KeyA'){ e.preventDefault(); startMerge(); return; }   /* Alt+A: assign NET */
  if((e.ctrlKey||e.metaKey)&&!e.altKey&&(e.code==='KeyZ'||e.code==='KeyY')){ e.preventDefault();   /* undo / redo */
    if(e.code==='KeyY'||e.shiftKey) redo(); else undo(); return; }
  if(/^[1-8]$/.test(e.key)){ const l=layers[parseInt(e.key,10)-1];
    if(l){l.on=!l.on;renderCards();applyAll();sync()} e.preventDefault(); return; }
  switch(e.key){
    case 'x':case 'X':case 'ч':case 'Ч':{
      const i=idx(sel); sel=layers[(i+1)%layers.length].id;
      if(refId===sel){const o=layers.find(l=>l.id!==sel); if(o)refId=o.id;}
      pending=null; renderCards(); applyAll(); drawMarks(); break;}
    case 'r':case 'R':case 'к':case 'К':rotateView(e.shiftKey?-90:90);return;
    case 'h':case 'H':case 'р':case 'Р':$('vflipH').click();return;
    case 'v':case 'V':case 'м':case 'М':$('vflipV').click();return;
    case 'p':case 'P':case 'з':case 'З':$('pickBtn').click();return;
    case 'n':case 'N':case 'т':case 'Т':$('netPickBtn').click();return;
    case 'd':case 'D':case 'в':case 'В':$('drawBtn').click();return;
    case 'Delete': delSelected(); return;
    case 'k':case 'K':case 'л':case 'Л':if(!$('compPick').disabled)$('compPick').click();return;
    case 'm':case 'M':case 'ь':case 'Ь':if(!$('moveBtn').disabled)$('moveBtn').click();return;
    case 'f':case 'F':case 'а':case 'А':flipBoard();return;
    case ' ':case 'Spacebar':e.preventDefault();rotateComp(e.shiftKey?-45:45);return;
    case 'Escape': if(mergeFrom){ hlNet=mergeFrom; mergeFrom=null; renderNets(); drawMarks(); sync(); return; }
      if(placing){ placing=false; syncComps(); drawMarks(); return; }   /* first Esc ends placing, stays in K */
      clickMode='none';pending=null;calib=null;hlNet=null;renderNets();sync();drawMarks();return;
    case 'z':case 'Z':case 'я':case 'Я':if(!$('undoPt').disabled)$('undoPt').click();return;
    case 'ArrowLeft':case 'ArrowRight':case 'ArrowUp':case 'ArrowDown':{
      const v={ArrowLeft:{x:-st,y:0},ArrowRight:{x:st,y:0},
        ArrowUp:{x:0,y:-st},ArrowDown:{x:0,y:st}}[e.key];
      const d=screenDelta(v.x*view.z,v.y*view.z);
      const c=comps.find(o=>o.id===selComp);
      if(clickMode==='move'){ if(s&&!s.H){ s.x+=d.x; s.y+=d.y; applyLayer(s); } }
      else if(c&&clickMode==='comp'){ moveComp(c,d.x,d.y); if(autoPins(c))renderProps(); drawMarks(); save(); }
      break;}
    case '[':if(s&&!s.H){s.rot=Math.round((s.rot-0.1*st)*10)/10;applyLayer(s)}break;
    case ']':if(s&&!s.H){s.rot=Math.round((s.rot+0.1*st)*10)/10;applyLayer(s)}break;
    default:h=false;
  }
  if(h){e.preventDefault();sync()}
});
addEventListener('resize',()=>{applyClip();drawMarks()});
/* panel widths: drag the panel edge, double click = default; per-viewer UI setting, not part of the project */
(()=>{ const UIKEY='pcbr-ui', root=document.documentElement; let ui={};
  try{ ui=JSON.parse(localStorage.getItem(UIKEY))||{}; }catch(err){}
  const setW=(k,v)=>{ if(v) root.style.setProperty(k,v+'px'); else root.style.removeProperty(k); };
  setW('--lw',ui.lw); setW('--rw',ui.rw);
  const store=()=>{ try{ localStorage.setItem(UIKEY,JSON.stringify(ui)); }catch(err){} };
  document.querySelectorAll('.splitter').forEach(sp=>{ const left=sp.dataset.side==='l', k=left?'lw':'rw';
    sp.onpointerdown=e=>{ e.preventDefault(); sp.setPointerCapture(e.pointerId); sp.classList.add('drag');
      const mv=ev=>{ ui[k]=Math.round(Math.max(220,Math.min(720,left?ev.clientX:innerWidth-ev.clientX)));
        setW('--'+k,ui[k]); applyClip(); drawMarks(); };
      const up=()=>{ sp.classList.remove('drag'); sp.removeEventListener('pointermove',mv); sp.removeEventListener('pointerup',up); store(); };
      sp.addEventListener('pointermove',mv); sp.addEventListener('pointerup',up); };
    sp.ondblclick=()=>{ delete ui[k]; setW('--'+k,0); store(); applyClip(); drawMarks(); }; });
})();
function fit(){ const l=layers[0]||{w:1200,h:2680};
  const swap=(view.rot%180)!==0, w=swap?l.h:l.w, h=swap?l.w:l.h;
  view={x:0,y:0,z:Math.min(vp.clientWidth/w,vp.clientHeight/h)*0.88,
  rot:view.rot,fh:view.fh,fv:view.fv}; applyView(); }
