/* ---------- layer cards ---------- */
const TINTS=[['color',L('цвет','color'),L('цвет (сохраняет яркость)','color (keeps luminance)')],['multiply',L('умн','mult'),L('умножение','multiply')],
  ['screen',L('осв','scrn'),L('осветление','screen')],['hue',L('тон','hue'),L('тон','hue')],['normal',L('залив','fill'),L('заливка','fill')]];
const BLENDS_SHORT=LANG==='ru'?{normal:'норм',difference:'разн',screen:'осв',multiply:'умн',exclusion:'искл'}
                              :{normal:'norm',difference:'diff',screen:'scrn',multiply:'mult',exclusion:'excl'};
const BLENDS=[['normal',L('обычное','normal')],['difference',L('разность','difference')],['screen',L('осветление','screen')],
              ['multiply',L('умножение','multiply')],['exclusion',L('исключение','exclusion')]];
/* side label selector; "TOP main"/"BOT main" = main layer of that side (one per side); microscope snapshots
   become its sub-layers (l.parent). Changing a sub-layer to another side detaches it. */
function sideSel(l){
  const x=document.createElement('select'); x.className='slim tagsel'; x.title=L('сторона (метка) слоя; main — главный слой стороны','layer side (tag); main — the main layer of the side');
  [['any',L('обе','both')],['top','TOP'],['bot','BOT'],['top-main','TOP main'],['bot-main','BOT main']].forEach(([v,t])=>{
    const o=document.createElement('option'); o.value=v; o.textContent=t; x.appendChild(o); });
  x.value=(l.side||'any')+(l.main&&l.side!=='any'?'-main':'');
  x.onchange=()=>{ const [sd,m]=x.value.split('-'); l.side=sd; l.main=!!m;
    if(l.main){ l.parent=null; layers.forEach(o=>{ if(o!==l&&o.side===sd) o.main=false; }); }
    const P=l.parent&&byId(l.parent); if(P&&P.side!==sd) l.parent=null;
    layers.forEach(o=>{ if(o.parent===l.id) o.side=l.side; });   /* sub-layers follow their parent's side */
    restack(); renderCards(); renderFiles(); applyAll(); sync(); save(); };
  return x;
}
const parentOf=l=>l.parent?byId(l.parent):null;
function renderCards(){
  const box=$('layerCards'); box.innerHTML='';
  let lastG=null;
  [...layers].reverse().forEach(l=>{ if(l.kind==='video') return;   /* video layer lives in the ВИДЕО tab */
    const i=idx(l.id);
    if(grp(l)!==lastG){ lastG=grp(l); const sp=document.createElement('div'); sp.className='lsep';
      const nm=document.createElement('span'); nm.textContent=[L('обе','both'),'BOT','TOP'][lastG]; sp.appendChild(nm);
      if(l.side==='top'||l.side==='bot'){ const sd=l.side; sp.classList.add('gop');
        const ln=document.createElement('span'); ln.className='gline';
        const r=document.createElement('input'); r.type='range'; r.min=0; r.max=100; r.value=Math.round(sideOp[sd]*100);
        r.title=L('прозрачность всех слоёв стороны (умножается на α слоя); двойной клик — 100%',
                  'opacity of all layers of the side (multiplies the layer α); double-click — 100%');
        const v=document.createElement('span'); v.className='gv'; v.textContent=r.value+'%'; v.dataset.side=sd;
        v.title=L('клик — плавное мигание стороны (100% ⇄ 0)','click — smooth blinking of the side (100% ⇄ 0)');
        v.onclick=()=>togglePulse({k:'side',side:sd});
        r.oninput=()=>{ sideOp[sd]=r.value/100; v.textContent=r.value+'%'; applySideOp(sd); };
        r.ondblclick=()=>{ r.value=100; r.oninput(); };
        sp.append(ln,r,v); }
      box.appendChild(sp); }
    const card=document.createElement('div');
    card.className='layer'+(parentOf(l)?' sub':'')+(l.id===sel?' sel':'')+
      ((l.on && onSide(l))?'':' off');
    const head=document.createElement('div'); head.className='lhead';
    const pick=e=>{ if(/INPUT|BUTTON|SELECT|OPTION/.test(e.target.tagName))return;
      sel=l.id; if(refId===sel) refId=(layers.find(x=>x.id!==sel)||l).id;
      pending=null; renderCards(); sync(); drawMarks(); applyAll(); };
    card.onclick=pick;
    const sw=document.createElement('div'); sw.className='swatch'; sw.style.background=l.tc; sw.dataset.lid=l.id;
    const nm=document.createElement('input'); nm.type='text'; nm.className='lname'; nm.value=l.name; nm.spellcheck=false;
    nm.title=L('имя слоя','layer name'); nm.oninput=()=>{ l.name=nm.value; l.el.alt=nm.value; sync(); save(); };
    nm.onkeydown=e=>{ if(e.key==='Enter'||e.key==='Escape') nm.blur(); };
    nm.onchange=()=>renderCards();
    const sl=document.createElement('span'); sl.className='lbl tag'; sl.textContent=L('сторона','side');
    const sSel=sideSel(l);
    const up=document.createElement('button'); up.className='ibtn'; up.textContent='▲'; up.title=L('выше','up');
    const peers=layers.filter(o=>o.kind!=='video'&&grp(o)===grp(l)&&(parentOf(l)?o.parent===l.parent:!parentOf(o))), pi=peers.indexOf(l);
    const swap=o=>{ const a=layers.indexOf(l), b=layers.indexOf(o); layers[a]=o; layers[b]=l;
      restack(); renderCards(); renderFiles(); applyAll(); save(); };
    up.disabled=pi>=peers.length-1;
    up.onclick=()=>swap(peers[pi+1]);
    const dn=document.createElement('button'); dn.className='ibtn'; dn.textContent='▼'; dn.title=L('ниже','down');
    dn.disabled=pi<=0;
    dn.onclick=()=>swap(peers[pi-1]);
    const eye=document.createElement('button'); eye.className='ibtn'; eye.textContent=l.on?'●':'○';
    eye.title=L('видимость','visibility');
    eye.onclick=()=>{l.on=!l.on;renderCards();applyAll();sync()};
    const del=document.createElement('button'); del.className='ibtn'; del.textContent='✕'; del.title=L('удалить слой','delete layer');
    del.disabled=layers.filter(o=>o.kind!=='video').length<=1;
    del.onclick=()=>{ const np=points.filter(p=>p.layer===l.id).length;
      if(confirm(L('Удалить слой «'+l.name+'»'+(np?' и его точки NET ('+np+')':'')+'?','Delete layer “'+l.name+'”'+(np?' and its NET points ('+np+')':'')+'?'))) removeLayer(l); };
    head.append(sw,nm,sl,sSel,up,dn,eye,del);

    const body=document.createElement('div'); body.className='lbody';
    if(!l.ok){ /* image missing: the only place to pick a file now */
      const rm=document.createElement('div'); rm.className='row';
      const tx=document.createElement('span'); tx.className='bad'; tx.style.flex='1'; tx.style.fontSize='11px';
      tx.textContent=(l.src||l.stored)?L('не загружен: ','not loaded: ')+baseName(l.src):L('картинка не задана','no image');
      const bf=document.createElement('button'); bf.className='mini'; bf.textContent=L('Выбрать файл…','Choose file…');
      bf.title=L('картинка с диска; оригинал хранится в браузере и в проекте','image from disk; the original is kept in the browser and in the project'); bf.onclick=()=>{ browseTarget=l.id; $('fileImg').click(); };
      rm.append(tx,bf); body.appendChild(rm); }
    card.append(head); if(body.childNodes.length) card.appendChild(body); box.appendChild(card);
  });
  const rs=$('refSel'); rs.innerHTML='';
  layers.forEach(l=>{ const o=document.createElement('option'); o.value=l.id;
    o.textContent=l.name+(l.id===sel?L(' (активный)',' (active)'):''); rs.appendChild(o); });
  rs.value=refId||'';
}
function refreshFiles(force){ /* image status changed; don't rebuild cards under a focused name field */
  if(!booted) return;
  if(force||!$('layerCards').contains(document.activeElement)) renderCards();
  renderVideo(); }
function renderFiles(){ renderVideo(); }   /* ФАЙЛЫ tab dissolved; callers kept */
/* ВИДЕО tab: video layers live here only (not in СЛОИ / ФАЙЛЫ); the block selects the layer as active */
function renderVideo(){
  const box=$('vidRows'); if(!box) return; box.innerHTML='';
  const l=videoLayer(), live=!!(l&&l.stream), v=l&&l.vid;
  const row=document.createElement('div'); row.className='filerow'+(l&&l.id===sel?' sel':'');
  if(l) row.onclick=e=>{ if(/INPUT|BUTTON|SELECT|OPTION/.test(e.target.tagName)||l.id===sel) return;
    sel=l.id; if(refId===sel) refId=(layers.find(x=>x.id!==sel)||l).id; renderCards(); renderVideo(); applyAll(); sync(); };
  const add=(...n)=>n.forEach(x=>row.appendChild(x));
  const btn=(tx,tt,fn,cls)=>{ const b=document.createElement('button'); b.className='mini'+(cls?' '+cls:''); b.textContent=tx;
    if(tt) b.title=tt; b.onclick=fn; return b; };
  const grid=(cls,...b)=>{ const d=document.createElement('div'); d.className='modes'+(cls?' '+cls:''); b.forEach(x=>d.appendChild(x)); return d; };
  /* camera + visibility */
  const top=document.createElement('div'); top.className='row';
  const cs=document.createElement('select'); cs.className='slim'; cs.title=L('камера','camera');
  const opts=camList.length?camList:[{deviceId:(l&&l.camId)||'',label:L('камера','camera')}];
  opts.forEach((d,i)=>{ const o=document.createElement('option'); o.value=d.deviceId; o.textContent=d.label||(L('камера ','camera ')+(i+1)); cs.appendChild(o); });
  cs.value=(l&&l.camId)||''; cs.onchange=()=>{ if(l){ l.camId=cs.value; startCam(l); } else addVideoLayer(cs.value); };
  top.appendChild(cs);
  if(l){ const eye=btn(l.on?'●':'○',L('видимость','visibility'),()=>{ l.on=!l.on; renderVideo(); applyAll(); sync(); },'ibtn'); eye.className='ibtn'; top.appendChild(eye); }
  const st=document.createElement('div'); st.className='status';
  st.innerHTML = live ? `<span class="good">${L('видео идёт','video running')}</span> · ${v.videoWidth}×${v.videoHeight}`
    : '<span class="bad">'+((l&&l.camErr)||L('камера остановлена','camera stopped'))+'</span>';
  add(top,st);
  const ctl=grid('two',
    btn(live?L('Стоп','Stop'):L('Старт','Start'),'',()=>{ if(!l) addVideoLayer(cs.value); else if(l.stream){ stopCam(l); renderVideo(); } else startCam(l); }),
    btn(L('обновить список','refresh list'),L('заново найти камеры','re-scan cameras'),async()=>{ await listCams(); renderVideo(); }));
  if(!l){ add(ctl); box.appendChild(row); syncVidWin(); return; }
  if(l.side!=='any'){ l.side='any'; restack(); }
  const win=l.vmode==='window';
  const vm=grid('two',
    btn(L('наложение','overlay'),L('видео поверх платы, совмещается ручной деформацией','video over the board, aligned with free transform'),()=>setVmode(l,'overlay'),win?'':'on'),
    btn(L('окно','window'),L('видео внизу этой вкладки, на плате скрыто','video at the bottom of this tab, hidden on the board'),()=>setVmode(l,'window'),win?'on':''));
  const sl=(lab,val,max,tt,fn)=>{ const r=document.createElement('div'); r.className='row'; r.title=tt;
    const a=document.createElement('span'); a.className='lbl'; a.style.flex='none'; a.style.width='40px'; a.textContent=lab;
    if(lab==='α'){ a.style.textTransform='none'; a.style.fontSize='12px'; }
    const i=document.createElement('input'); i.type='range'; i.min=0; i.max=max; i.value=val;
    const vv=document.createElement('span'); vv.className='val'; vv.textContent=val+'%';
    if(lab==='α'){ vv.classList.add('pz'); vv.dataset.lid=l.id; vv.onclick=()=>togglePulse({k:'layer',id:l.id});
      vv.title=L('клик — плавное мигание (100% ⇄ 0)','click — smooth blinking (100% ⇄ 0)'); }
    i.oninput=()=>{ vv.textContent=i.value+'%'; fn(+i.value); }; r.append(a,i,vv); return r; };
  const ra=sl('α',Math.round(l.op*100),100,L('непрозрачность видео','video opacity'),x=>{ l.op=x/100; applyLayer(l); });
  const rf=sl(L('края','edges'),Math.round((l.fe||0)*100),50,L('размытие краёв кадра (участок задаёт кроп); переходит в снимок','frame edge feathering (area set by the crop); carried into the snapshot'),
    x=>{ l.fe=x/100; applyLayer(l); sync(); });
  const fl=grid('',...[['⇄','fh',L('отразить по горизонтали','mirror horizontally')],['⇅','fv',L('отразить по вертикали','mirror vertically')],['↺',-90,L('повернуть −90°','rotate −90°')],['↻',90,L('повернуть +90°','rotate +90°')]]
    .map(([tx,a,tt])=>btn(tx,tt,()=>{ if(l.H){l.H=null;warpInfo='';}
      if(typeof a==='string') l[a]=!l[a]; else { l.rot=Math.round((l.rot+a)*10)/10; if(l.rot>180)l.rot-=360; if(l.rot<-180)l.rot+=360; }
      applyLayer(l); renderVideo(); sync(); },l[a]===true?'on':'')));
  if(win) fl.querySelectorAll('button').forEach(b=>b.disabled=true);   /* they act on the overlay only */
  const md=grid('two',...[['move',L('Ручная деформация (M)','Free transform (M)'),L('рамка: масштаб / вращение (клик по слою переключает), ⊕ — центр','frame: scale / rotate (click the layer to toggle), ⊕ — pivot')],
     ['crop',L('Кроп','Crop'),L('участок кадра для снимка; края размываются внутри кропа','frame area for the snapshot; edges feather inside the crop')]].map(([m,tx,tt])=>{
      const b=btn(tx,tt,()=>videoMode(l,m),clickMode===m&&sel===l.id?'on':''); b.dataset.mode=m; b.dataset.lid=l.id;
      b.disabled=win||(m==='move'&&!!l.H); return b; }));
  const M=mainOf(boardSide), sn=btn(L('Дополнить слой','Patch layer'),'',()=>snapPatch(l),'wide');
  sn.title=M?L('кадр — подслоем «'+M.name+'» ('+boardSide.toUpperCase()+' main, сторона в просмотре)',
                'frame → sub-layer of “'+M.name+'” ('+boardSide.toUpperCase()+' main, the side in view)')
            :L('нет главного слоя стороны в просмотре — метка «'+boardSide.toUpperCase()+' main» у слоя',
                'no main layer for the side in view — tag a layer “'+boardSide.toUpperCase()+' main”');
  sn.disabled=!live||!M;
  add(vm,ra,rf,fl,md,ctl,sn);
  box.appendChild(row); syncVidWin();
}
function setVmode(l,m){ l.vmode=m;
  if(m==='window'&&sel===l.id&&(clickMode==='move'||clickMode==='crop')) clickMode='none';
  applyAll(); renderVideo(); sync(); drawMarks(); save(); }
function syncVidWin(){ /* window mode: the same stream in a plain <video> at the bottom of the tab */
  const l=videoLayer(), w=$('vidWin'), on=!!(l&&l.stream&&l.vmode==='window');
  $('vidWinBox').hidden=!on;
  w.style.transform=''; if(on&&w.srcObject!==l.stream) w.srcObject=l.stream;   /* raw camera image: no overlay transforms */
  else if(w.srcObject) w.srcObject=null;
}
