/* ---------- nets ---------- */
function renderNets(){
  const box=$('netlist'); box.innerHTML='';
  if(!nets.length){ const d=document.createElement('div'); d.className='empty';
    d.textContent=L('NET пока нет — нажмите «+ NET».','No NETs yet — press “+ NET”.'); box.appendChild(d); return; }
  nets.forEach(n=>{
    const row=document.createElement('div');
    row.className='net'+(n.id===activeNet?' active':'');
    const grip=document.createElement('span'); grip.className='grip'; grip.textContent=n.id===activeNet?'▶':'';
    grip.title=L('выделить NET','select NET');
    const col=document.createElement('input'); col.type='color'; col.value=n.color;
    col.oninput=e=>{n.color=e.target.value;drawMarks();save()};
    col.onclick=e=>e.stopPropagation();
    const nm=document.createElement('input'); nm.type='text'; nm.value=n.name; nm.dataset.net=n.id;
    nm.onkeydown=e=>{ if(e.key==='Enter'||e.key==='Escape') nm.blur(); };
    nm.oninput=e=>{n.name=e.target.value;drawMarks();save()};
    nm.onclick=e=>e.stopPropagation();
    const cnt=document.createElement('span'); cnt.className='cnt';
    cnt.textContent=points.filter(p=>p.net===n.id).length;
    const eye=document.createElement('button'); eye.className='x'; eye.textContent=n.on?'●':'○';
    eye.onclick=e=>{e.stopPropagation();n.on=!n.on;renderNets();drawMarks();save()};
    const del=document.createElement('button'); del.className='x'; del.textContent='✕';
    del.onclick=e=>{e.stopPropagation();
      points=points.filter(p=>p.net!==n.id); nets=nets.filter(x=>x.id!==n.id);
      if(activeNet===n.id)activeNet=nets.length?nets[0].id:null;
      if(hlNet===n.id)hlNet=null; renderNets();drawMarks();sync();save()};
    row.onclick=()=>{ if(mergeFrom){ if(n.id!==mergeFrom) mergeNets(mergeFrom,n.id); return; }
      activeNet=n.id; hlNet=(hlNet===n.id?null:n.id); renderNets(); drawMarks(); sync(); };
    if(n.id===mergeFrom) row.classList.add('merge');
    row.append(grip,col,nm,cnt,eye,del); box.appendChild(row);
  });
}
function addNet(focus){
  const n={id:'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),
    name:'NET'+(netSeq++), color:NETPAL[nets.length%NETPAL.length], on:true};
  nets.push(n); activeNet=n.id; hlNet=n.id; renderNets(); sync(); save(); drawMarks();
  if(focus) focusNetName(n.id);
}
function focusNetName(id){ /* type the name right away */
  if(document.querySelector('[data-page="nets"]').hidden) document.querySelector('[data-tab="nets"]').click();
  const i=$('netlist').querySelector(`input[data-net="${id}"]`);
  if(i){ i.scrollIntoView({block:'nearest'}); i.focus(); i.select(); }
}
/* Alt+A: assign the highlighted NET to the next clicked one (point on the board or row in the list) */
let mergeFrom=null;
function startMerge(){
  const sp=selPoint&&points.find(p=>p.id===selPoint), id=hlNet||(sp&&sp.net)||null;
  if(!id||!nets.some(n=>n.id===id)) return;
  mergeFrom=id; hlNet=null; showNets=true;   /* unmask the other NETs so one can be picked */
  renderNets(); drawMarks(); sync();
}
function mergeNets(from,to){
  const a=nets.find(n=>n.id===from), b=nets.find(n=>n.id===to); mergeFrom=null;
  if(a&&b&&a!==b){
    points.forEach(p=>{ if(p.net===from) p.net=to; });
    comps.forEach(c=>{ if(c.n1===from) c.n1=to; if(c.n2===from) c.n2=to;
      (c.pads||[]).forEach(pd=>{ if(pd.net===from) pd.net=to; }); });
    nets=nets.filter(n=>n!==a); b.on=true;
    activeNet=hlNet=to; save(); }
  renderNets(); renderProps(); drawMarks(); sync();
}
/* Delete: whatever is selected, any mode; the mode decides when several are selected */
function delSelected(){
  const delPt=()=>{ points=points.filter(p=>p.id!==selPoint); selPoint=null; renderNets(); drawMarks(); sync(); save(); };
  const delC=()=>{ comps=comps.filter(o=>o.id!==selComp); selComp=null; renderComps(); drawMarks(); sync(); save(); };
  if(clickMode==='draw'&&selNote) return delNote(selNote);
  if(clickMode==='net'&&selPoint) return delPt();
  if(clickMode==='comp'&&selComp) return delC();
  if(selPoint) return delPt();
  if(selComp) return delC();
  if(selNote) delNote(selNote);
}
function hitPoint(m){
  let best=null,bd=12/Math.abs(view.z);
  if(showNets) points.forEach(pt=>{ const net=nets.find(n=>n.id===pt.net), lay=byId(pt.layer);
    if(!net||!net.on||!lay||!ptShown(pt,lay))return;
    const w=worldOf(lay,pt.p), d=Math.hypot(w.x-m.x,w.y-m.y);
    if(d<bd){bd=d;best=pt;} });
  return best;
}

/* ---------- warp ---------- */
let warpModel='affine';
function baseMirror(l){ return (!!l.fh)!==(!!l.fv); }   /* manual ⇄/⇅ parity = image handedness */
function recompute(report){
  const s=sel_(); if(!s)return;
  if(s.pairs.length<2){s.H=null;warpInfo='';return;}
  const src=s.pairs.map(p=>p.m);
  const dst=s.pairs.map(p=>{const rl=byId(p.rl); return rl?worldOf(rl,p.r):null;});
  if(dst.some(d=>!d))return;
  const mirror=baseMirror(s);
  const f=fitTransform(src,dst,{mirror, model:warpModel}); if(!f)return;
  s.H=f.H;
  let e=0; src.forEach((p,i)=>{const q=applyH(f.H,p); e+=(q.x-dst[i].x)**2+(q.y-dst[i].y)**2;});
  const det=f.H[0]*f.H[4]-f.H[1]*f.H[3];
  const flipped=(det<0)!==mirror;
  warpInfo=L(`модель: ${f.model} · ${s.pairs.length} пар`,`model: ${f.model} · ${s.pairs.length} pairs`)+` · RMS ${Math.sqrt(e/src.length).toFixed(1)} px`+
    (flipped?'<br><span class="bad">'+L('Точки дают зеркальное соответствие относительно текущей ориентации слоя — '+
      'проверьте порядок кликов (сначала активный, потом опора) или отражение ⇄/⇅ слоя.',
      'The points give a mirrored match relative to the current layer orientation — '+
      'check the click order (active layer first, then the reference) or the layer ⇄/⇅ mirroring.')+'</span>':'');
  s.box.style.transformOrigin='0 0';
  s.box.style.transform=`matrix3d(${f.H[0]},${f.H[3]},0,${f.H[6]},${f.H[1]},${f.H[4]},0,${f.H[7]},0,0,1,0,${f.H[2]},${f.H[5]},0,1)`;
  if(report)sync();
  drawMarks(); save();
}
