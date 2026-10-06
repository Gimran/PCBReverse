/* ---------- persistence ---------- */
let saveTimer=null, statusHold=0; /* project messages stay visible a few seconds */
function snapshot(){
  return {v:4, count:layers.length, sel, refId, viewMode, swipe, view, boardSide, xray,
    inverted, grayView, grid, labels, blinkOn, tintMode,
    layers:layers.map(l=>({id:l.id,name:l.name,color:l.tc,side:l.side,src:l.src,stored:l.stored,
      x:l.x,y:l.y,rot:l.rot,scale:l.scale,sx:l.sx,sy:l.sy,fh:l.fh,fv:l.fv,op:l.op,on:l.on,H:l.H,
      tc:l.tc,tn:l.tn,tm:l.tm||tintMode,blend:l.blend,pairs:l.pairs,kOn:l.kOn,kc:l.kc,kt:l.kt,cor:l.cor,crop:l.crop,kind:l.kind,camId:l.camId,vmode:l.vmode,main:l.main,parent:l.parent,fe:l.fe})),
    nets, points, activeNet, netSeq,
    comps, mmScale, compSeq, compKind, compSize, compSide, compRot, icPat, icPins, sotPat, icRot, icPin0, compVal, sideCol:SIDECOL, sideOp, xrayOp, showSide, showNets, showComps, notes, showDraw, drawStyle, warpModel, imgDir, projName};
}
function save(quiet){ if(!booted)return; clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{ try{ localStorage.setItem(KEY,JSON.stringify(snapshot()));
    if(!quiet&&Date.now()>statusHold) $('saveStatus').innerHTML=L('Сохранено · ','Saved · ')+new Date().toLocaleTimeString(LOC);
  }catch(err){ $('saveStatus').innerHTML='<span class="bad">'+L('Не сохранено: ','Not saved: ')+err.message+'</span>'; } },400);
}
function restore(s){
  if(!s||!Array.isArray(s.layers))return false;
  layers.forEach(l=>{stopCam(l);l.clip.remove();l.fx.node.remove()}); layers=[];
  s.layers.forEach((d,i)=>{ const l=mkLayer(i,{
    id:d.id, name:d.name||L('Слой ','Layer ')+(i+1), color:d.color||LAYPAL[i%LAYPAL.length],
    side:d.side||'any',
    src:d.src||'', stored:!!d.stored, x:d.x||0,y:d.y||0,rot:d.rot||0,scale:d.scale||1,sx:+d.sx||1,sy:+d.sy||1,
    fh:!!d.fh,fv:!!d.fv,op:typeof d.op==='number'?d.op:1,on:d.on!==false,H:d.H||null,
    tc:d.tc||LAYPAL[i%LAYPAL.length], tn:typeof d.tn==='number'?d.tn:0,
    tm:d.tm||s.tintMode||'color',
    blend:d.blend||'normal', pairs:Array.isArray(d.pairs)?d.pairs:[],
    kOn:!!d.kOn, kc:d.kc||'#ffffff', kt:typeof d.kt==='number'?d.kt:.15, cor:Object.assign({...COR0},d.cor||{}), crop:d.crop||null, main:!!d.main, parent:d.parent||null, fe:+d.fe||0,
    ...(d.kind==='video'?{kind:'video',camId:d.camId||'',side:'any',vmode:d.vmode==='window'?'window':'overlay'}:{})});
    layers.push(l); });
  restack();
  sel=byId(s.sel)?s.sel:layers[layers.length-1].id;
  refId=byId(s.refId)&&s.refId!==sel?s.refId:(layers.find(l=>l.id!==sel)||layers[0]).id;
  viewMode=s.viewMode||'all'; swipe=typeof s.swipe==='number'?s.swipe:.5;
  boardSide=s.boardSide==='bot'?'bot':'top'; xray=!!s.xray;
  view=Object.assign({x:0,y:0,z:1,rot:0,fh:false,fv:false},s.view||{}); inverted=!!s.inverted; grayView=!!s.grayView; grid=s.grid!==false; labels=s.labels!==false;
  blinkOn=s.blinkOn!==false; tintMode=s.tintMode||'color';
  nets=s.nets||[]; points=s.points||[];
  activeNet=s.activeNet||(nets[0]?nets[0].id:null); netSeq=s.netSeq||nets.length+1;
  comps=Array.isArray(s.comps)?s.comps:[]; mmScale=+s.mmScale||0;
  compSeq=s.compSeq||{R:1,C:1}; compKind=s.compKind||'R'; compSize=s.compSize||'0603';
  icPat=ICPAT[s.icPat]?s.icPat:'d2'; icPins=+s.icPins||8; sotPat=SOTN[s.sotPat]?s.sotPat:'s3';
  icRot=typeof s.icRot==='number'?s.icRot:(s.icPat==='d2h'?270:0); icPin0=Number.isFinite(s.icPin0)?s.icPin0:1;
  compSide=s.compSide||'top'; compRot=+s.compRot||0;
  compVal=Object.assign({R:'',C:''},s.compVal||{});
  SIDECOL=Object.assign({...SIDECOL_DEF},s.sideCol||{});
  sideOp=Object.assign({top:1,bot:1},s.sideOp||{});
  xrayOp=typeof s.xrayOp==='number'?s.xrayOp:.5;
  showNets=s.showNets!==false; showComps=s.showComps!==false;
  notes=Array.isArray(s.notes)?s.notes:[]; showDraw=s.showDraw!==false; selNote=null;
  drawStyle=Object.assign({col:'#ffd400',w:2,fs:16},s.drawStyle||{});
  showSide=Object.assign({top:true,bot:true},s.showSide||{});
  selComp=null; calib=null; warpModel=s.warpModel==='persp'?'persp':'affine';
  if(typeof s.projName==='string'&&s.projName) projName=s.projName;
  /* old saves kept only the bare file name for files picked via dialog */
  layers.forEach(l=>{ if(l.stored && l.src && !/[\/\\]/.test(l.src)) l.src=dirJoin(imgDir,l.src); });
  return true;
}
/* browser copy of a layer image: original blob in IndexedDB; older saves kept a webp in localStorage */
function setBlobSrc(l,b){ if(l.url) URL.revokeObjectURL(l.url); l.url=URL.createObjectURL(b); l.el.src=l.url; }
function loadImages(){
  layers.forEach(l=>{ l.ok=false; l.blob=null;
    if(l.kind==='video'){ startCam(l,true); return; }
    const fromPath=()=>{ const d=l.stored? localStorage.getItem(IMGKEY(l.id)) : null;
      if(d) l.el.src=d; else if(l.src) l.el.src=l.src; else l.el.removeAttribute('src'); };
    if(!l.stored){ fromPath(); return; }
    idb.get(l.id).then(b=>{ if(b){ l.blob=b; setBlobSrc(l,b); } else fromPath(); }).catch(fromPath);
  });
}
function checkMissing(){
  const bad=layers.filter(l=>!l.ok&&(l.src||l.stored)), box=$('miss');
  const none=layers.every(l=>!l.ok);
  if(!bad.length&&!none){box.hidden=true;return;}
  box.hidden=false;
  box.innerHTML = bad.length
    ? L('Не загружено: ','Not loaded: ')+bad.map(l=>l.name+' — '+(l.src||L('нет файла','no file'))).join('<br>')+
      L('<br>СЛОИ → «Выбрать файл…» в карточке слоя (картинки ищутся в pcb_overlay_img/).',
        '<br>LAYERS → “Choose file…” in the layer card (images are looked up in pcb_overlay_img/).')
    : layers.length ? L('Изображения не заданы. СЛОИ → «Выбрать файл…» в карточке слоя (',
                        'No images set. LAYERS → “Choose file…” in the layer card (')+layers.map(l=>l.name).join(', ')+').'
    : L('Изображения не заданы. СЛОИ → «+ Добавить слой».','No images set. LAYERS → “+ Add layer”.');
}
function setPath(l,v,reread){ v=(v||'').trim().replace(/\\/g,'/');
  l.src=v; l.stored=false; l.blob=null; localStorage.removeItem(IMGKEY(l.id)); idb.del(l.id).catch(()=>{}); l.ok=false;
  if(v) l.el.src = reread ? v+(v.includes('?')?'&':'?')+'r='+Date.now() : v;
  else l.el.removeAttribute('src');
  save(); renderFiles(); sync(); }
function storeFile(id,file){
  const l=byId(id); if(!l)return;
  idb.put(l.id,file).then(()=>{
    l.blob=file; l.stored=true; l.src=dirJoin(imgDir,file.name); l.ok=false; setBlobSrc(l,file);
    localStorage.removeItem(IMGKEY(l.id)); save(); renderFiles(); sync();
  }).catch(()=>storeFileLS(l,file));
}
function storeFileLS(l,file){ /* fallback without IndexedDB: compressed webp in localStorage */
  l.blob=file;
  const fr=new FileReader();
  fr.onload=()=>{
    const im=new Image();
    im.onload=()=>{
      const maxw=1600, sc=Math.min(1,maxw/im.naturalWidth);
      const c=document.createElement('canvas');
      c.width=Math.round(im.naturalWidth*sc); c.height=Math.round(im.naturalHeight*sc);
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      let data=c.toDataURL('image/webp',0.85);
      if(data.length>3.5e6) data=c.toDataURL('image/webp',0.65);
      try{ localStorage.setItem(IMGKEY(l.id),data); l.stored=true; l.src=dirJoin(imgDir,file.name);
           l.ok=false; l.el.src=data; save(); }
      catch(err){ l.stored=false; l.el.src=fr.result;
        $('saveStatus').innerHTML='<span class="bad">'+L('не помещается в хранилище: ','does not fit in storage: ')+err.message+'</span>'; }
      renderFiles(); sync();
    };
    im.src=fr.result;
  };
  fr.readAsDataURL(file);
}

/* ---------- IndexedDB: original layer images ---------- */
const idb=(()=>{ let db=null;
  const open=()=>db||(db=new Promise((res,rej)=>{ const r=indexedDB.open('pcbreverse',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('img'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }));
  const run=(mode,fn)=>open().then(d=>new Promise((res,rej)=>{ const t=d.transaction('img',mode);
    const q=fn(t.objectStore('img')); t.oncomplete=()=>res(q&&q.result); t.onerror=()=>rej(t.error); }));
  return { get:k=>run('readonly',s=>s.get(k)), put:(k,v)=>run('readwrite',s=>s.put(v,k)),
           del:k=>run('readwrite',s=>s.delete(k)), clear:()=>run('readwrite',s=>s.clear()) };
})();

/* ---------- project file *.pcbr = zip (store, no compression) ---------- */
const CRC_T=(()=>{ const t=new Uint32Array(256);
  for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
function crc32(u){ let c=0xFFFFFFFF; for(let i=0;i<u.length;i++) c=CRC_T[(c^u[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function zipStore(files){ /* [{name, data:Uint8Array}] -> Blob */
  const enc=new TextEncoder(), body=[], dir=[]; let off=0;
  const d=new Date(), tm=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),
        dt=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  files.forEach(f=>{ const nm=enc.encode(f.name), crc=crc32(f.data), n=f.data.length;
    const h=new DataView(new ArrayBuffer(30));
    h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true);
    h.setUint16(10,tm,true); h.setUint16(12,dt,true); h.setUint32(14,crc,true);
    h.setUint32(18,n,true); h.setUint32(22,n,true); h.setUint16(26,nm.length,true);
    body.push(h.buffer,nm,f.data);
    const c=new DataView(new ArrayBuffer(46));
    c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true);
    c.setUint16(12,tm,true); c.setUint16(14,dt,true); c.setUint32(16,crc,true);
    c.setUint32(20,n,true); c.setUint32(24,n,true); c.setUint16(28,nm.length,true); c.setUint32(42,off,true);
    dir.push(c.buffer,nm);
    off+=30+nm.length+n; });
  const size=dir.reduce((a,b)=>a+b.byteLength,0), e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true);
  e.setUint32(12,size,true); e.setUint32(16,off,true);
  return new Blob([...body,...dir,e.buffer],{type:'application/zip'});
}
async function unzip(buf){ /* -> {name: Uint8Array}; store and deflate */
  const u=new Uint8Array(buf), v=new DataView(buf), dec=new TextDecoder(); let e=-1;
  for(let i=u.length-22;i>=Math.max(0,u.length-65557);i--) if(v.getUint32(i,true)===0x06054b50){e=i;break;}
  if(e<0) throw new Error(L('файл не является архивом проекта','the file is not a project archive'));
  const out={}; let p=v.getUint32(e+16,true);
  for(let k=v.getUint16(e+10,true);k>0;k--){
    if(v.getUint32(p,true)!==0x02014b50) throw new Error(L('повреждён каталог архива','archive directory is corrupted'));
    const m=v.getUint16(p+10,true), cs=v.getUint32(p+20,true), nl=v.getUint16(p+28,true),
          xl=v.getUint16(p+30,true), cl=v.getUint16(p+32,true), lo=v.getUint32(p+42,true);
    const name=dec.decode(u.subarray(p+46,p+46+nl)); p+=46+nl+xl+cl;
    const ds=lo+30+v.getUint16(lo+26,true)+v.getUint16(lo+28,true); let data=u.subarray(ds,ds+cs);
    if(m===8) data=new Uint8Array(await new Response(new Blob([data]).stream()
      .pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    else if(m!==0) throw new Error(L('метод сжатия '+m+' не поддерживается','compression method '+m+' is not supported'));
    if(!name.endsWith('/')) out[name]=data;
  }
  return out;
}
const MIME={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',
  bmp:'image/bmp',svg:'image/svg+xml',tif:'image/tiff',tiff:'image/tiff'};
const baseName=p=>(p||'').split(/[\\/]/).pop().split('?')[0];
const extOf=n=>{ const m=/\.([a-z0-9]+)$/i.exec(n||''); return m?m[1].toLowerCase():''; };
async function layerBlob(l){ /* original bytes of a layer image, or null if the page can't read them */
  if(l.blob) return l.blob;
  if(l.stored){ const b=await idb.get(l.id).catch(()=>null); if(b) return b;
    const d=localStorage.getItem(IMGKEY(l.id)); if(d) return (await fetch(d)).blob(); }
  if(l.src){
    try{ const r=await fetch(l.src); if(r.ok) return await r.blob(); }catch(err){}
    if(l.ok) try{ const c=document.createElement('canvas'); c.width=l.el.naturalWidth; c.height=l.el.naturalHeight;
      c.getContext('2d').drawImage(l.el,0,0);
      return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(),'image/png')); }catch(err){} /* file:// taints canvas */
  }
  return null;
}
let missLayers=[];
async function saveProject(skipMissing){
  const st=$('saveStatus'); st.textContent=L('Сборка проекта…','Building project…'); $('missRow').hidden=true;
  const imgs=[], miss=[];
  for(const l of layers){ if(!l.src&&!l.stored) continue;
    const b=await layerBlob(l); if(b) imgs.push({l,b}); else miss.push(l); }
  if(miss.length&&!skipMissing){ missLayers=miss;
    st.innerHTML='<span class="bad">'+L('Нет доступа к картинкам (страница открыта с диска):','No access to the images (the page is opened from disk):')+'</span><br>'+
      miss.map(l=>'<b>'+l.name+'</b> — '+(baseName(l.src)||'?')).join('<br>')+
      L('<br>Укажите эти файлы — они сохранятся в браузере, дальше не спросит.','<br>Locate these files — they will be kept in the browser and it will not ask again.');
    $('missRow').hidden=false; return; }
  const s=snapshot(), files=[], used=new Set();
  for(const {l,b} of imgs){
    const ext=extOf(baseName(l.src))||Object.keys(MIME).find(k=>MIME[k]===b.type)||'png';
    let nm='images/'+l.id+'_'+(baseName(l.src).replace(/\.[^.]*$/,'')||'image')+'.'+ext;
    while(used.has(nm)) nm=nm.replace(/(\.[^.]*)$/,'_$1'); used.add(nm);
    s.layers.find(d=>d.id===l.id).file=nm;
    files.push({name:nm, data:new Uint8Array(await b.arrayBuffer())});
  }
  files.unshift({name:'project.json', data:new TextEncoder().encode(JSON.stringify(s,null,1))});
  const zip=zipStore(files), fname=projName+'.pcbr';
  try{
    if(!window.showSaveFilePicker) throw 0;
    const h=await showSaveFilePicker({suggestedName:fname,
      types:[{description:L('Проект PCBReverse','PCBReverse project'),accept:{'application/zip':['.pcbr']}}]});
    const w=await h.createWritable(); await w.write(zip); await w.close();
    projName=h.name.replace(/\.pcbr$/i,'')||projName;
  }catch(err){
    if(err&&err.name==='AbortError'){ st.textContent=L('Сохранение отменено.','Save cancelled.'); return; }
    const a=document.createElement('a'); a.href=URL.createObjectURL(zip); a.download=fname; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  }
  st.innerHTML='<span class="good">'+L('Проект сохранён: ','Project saved: ')+projName+'.pcbr</span>'+L(' · картинок ',' · images ')+imgs.length+
    (miss.length?' · <span class="bad">'+L('без картинок: ','without images: ')+miss.map(l=>l.name).join(', ')+'</span>':'')+
    ' · '+(zip.size/1048576).toFixed(1)+L(' МБ',' MB');
  statusHold=Date.now()+5000; save(true);
}
function pickMissing(files){
  const left=[...missLayers];
  [...files].forEach(f=>{ const i=left.findIndex(l=>baseName(l.src).toLowerCase()===f.name.toLowerCase());
    if(i>=0) adoptFile(left.splice(i,1)[0],f); });
  if(left.length===1&&files.length===1&&missLayers.length===1) adoptFile(left.pop(),files[0]);
  saveProject(false);
}
function adoptFile(l,f){ /* keep the original next to the layer; path stays as is */
  l.blob=f; l.stored=true; idb.put(l.id,f).catch(()=>{}); }
function afterLoad(msg){
  renderCards(); renderFiles(); renderNets(); renderComps(); applyAll(); applyView(); sync(); checkMissing();
  $('missRow').hidden=true; $('saveStatus').innerHTML='<span class="good">'+msg+'</span>'; statusHold=Date.now()+5000; save(true);
}
async function loadProject(f){
  const st=$('saveStatus');
  try{
    if(/\.json$/i.test(f.name)){ /* old JSON export */
      const s=JSON.parse(await f.text()); if(!restore(s)) throw new Error(L('нет слоёв','no layers'));
      loadImages(); afterLoad(L('Загружено (JSON): ','Loaded (JSON): ')+f.name); return true; }
    st.textContent=L('Чтение проекта…','Reading project…');
    const ent=await unzip(await f.arrayBuffer());
    if(!ent['project.json']) throw new Error(L('в архиве нет project.json','no project.json in the archive'));
    const s=JSON.parse(new TextDecoder().decode(ent['project.json']));
    layers.forEach(l=>localStorage.removeItem(IMGKEY(l.id)));
    await idb.clear().catch(()=>{});
    if(!restore(s)) throw new Error(L('нет слоёв','no layers'));
    projName=f.name.replace(/\.(pcbr|zip)$/i,'');
    let n=0;
    for(const d of s.layers){ const l=byId(d.id); if(!l) continue; l.ok=false; l.blob=null;
      const data=d.file&&ent[d.file];
      if(data){ const b=new Blob([data],{type:MIME[extOf(d.file)]||''});
        l.blob=b; l.stored=true; setBlobSrc(l,b); idb.put(l.id,b).catch(()=>{}); n++; }
      else if(l.kind==='video') startCam(l,true);
      else { l.stored=false; if(l.src) l.el.src=l.src; else l.el.removeAttribute('src'); }
    }
    afterLoad(L('Проект загружен: ','Project loaded: ')+f.name+L(' · картинок ',' · images ')+n); return true;
  }catch(err){ st.innerHTML='<span class="bad">'+L('Ошибка загрузки: ','Load error: ')+err.message+'</span>'; }
}
