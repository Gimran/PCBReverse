/* ---------- working folder: the project lives on disk as project.json + images/ (File System Access, Chrome / Edge) ----------
   Every autosave also writes project.json (debounced); a layer image is written once into images/ (l.file).
   The folder handle is kept in IndexedDB meta 'dir:<scope>'; the tab's scope (project.js) says which folder it works in,
   so two tabs can hold two folders. Chrome asks for access once per browser session («Подключить»).
   DIRTY flag (per scope): something saved to the browser is not in the folder yet (no access, or a write pending). */
let workDir=null, workDirOk=false, dirTimer=null, dirQ=Promise.resolve(), dirErr='', dirAt=0, saveSeq=0;
const DIRTY='pcbr-dirdirty';
const hasFSA=()=>!!window.showDirectoryPicker;
async function fsFile(dir,path,create){ const parts=path.split('/'); let d=dir;
  for(const p of parts.slice(0,-1)) d=await d.getDirectoryHandle(p,{create:!!create});
  return d.getFileHandle(parts[parts.length-1],{create:!!create}); }
async function fsRead(dir,path){ try{ return await (await fsFile(dir,path,false)).getFile(); }catch(err){ return null; } }
async function fsWrite(dir,path,data){ const w=await (await fsFile(dir,path,true)).createWritable(); await w.write(data); await w.close(); }
function imgFileName(l,b){
  const ext=extOf(baseName(l.src))||Object.keys(MIME).find(k=>MIME[k]===b.type)||'png';
  return 'images/'+l.id+'_'+(baseName(l.src).replace(/\.[^.]*$/,'')||'image')+'.'+ext; }
const dirtyKey=()=>DIRTY+':'+scope;
function setDirty(on){ try{ on?localStorage.setItem(dirtyKey(),'1'):localStorage.removeItem(dirtyKey()); }catch(err){} }
function dirSave(){ /* from saveNow */
  if(!workDir) return;
  saveSeq++; setDirty(true);
  if(!workDirOk){ syncDir(); return; }
  clearTimeout(dirTimer); dirTimer=setTimeout(()=>{ dirTimer=null; writeDirQ(); },600);
}
function writeDirQ(){ return dirQ=dirQ.then(writeDir).catch(err=>{ dirErr=err.message||String(err); syncDir(); }); }
async function writeDir(){
  const d=workDir; if(!d||!workDirOk) return;
  const seq=saveSeq;
  for(const l of layers){ if(l.kind==='video'||!l.blob||l.fileBlob===l.blob) continue;
    const nm=(l.file&&!l.fileBlob)?l.file:imgFileName(l,l.blob), old=await fsRead(d,nm);   /* replaced image: new name */
    if(!(old&&old.size===l.blob.size)) await fsWrite(d,nm,l.blob);   /* already there (folder opened / reconnected) — skip */
    l.file=nm; l.fileBlob=l.blob; }
  await fsWrite(d,'project.json',JSON.stringify(snapshot(),null,1));
  dirErr=''; dirAt=Date.now(); if(seq===saveSeq) setDirty(false); syncDir();
}
async function dirScope(h){ /* the same folder picked again keeps its id */
  const ks=await idb.meta.keys().catch(()=>[]);
  for(const k of ks){ if(!String(k).startsWith('dir:')) continue;
    const o=await idb.meta.get(k).catch(()=>null); if(o&&await o.isSameEntry(h).catch(()=>false)) return String(k).slice(4); }
  return 'd'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
}
function moveScope(s){ /* the project in memory now belongs to scope s: browser copy and cached images go there */
  setScope(s); saveNow(true);
  layers.forEach(l=>{ if(l.blob&&l.kind!=='video') idb.put(ik(l.id),l.blob).catch(()=>{}); });
}
async function bindDir(h,keep){ /* keep: the current project goes into the folder (else the folder's project is loaded) */
  const id=await dirScope(h);
  await idb.meta.put('dir:'+id,h).catch(()=>{});
  workDir=h; workDirOk=true; projName=h.name;
  if(keep) moveScope(id); else setScope(id);
}
function unbindDir(){ workDir=null; workDirOk=false; clearTimeout(dirTimer); setDirty(false);
  moveScope(''); syncDir(); }
async function pickWorkDir(){
  if(!hasFSA()){ $('saveStatus').innerHTML='<span class="bad">'+L('Этот браузер не работает с папками — нужен Chrome или Edge.',
    'This browser cannot use folders — Chrome or Edge is needed.')+'</span>'; return; }
  let h; try{ h=await showDirectoryPicker({id:'pcbreverse',mode:'readwrite'}); }catch(err){ return; }
  if(await fsRead(h,'project.json')){
    if(!confirm(L(`В папке «${h.name}» уже есть проект. Открыть его?\n\nТекущий проект в браузере будет заменён.`,
                  `Folder “${h.name}” already holds a project. Open it?\n\nThe current project in the browser will be replaced.`))) return;
    await bindDir(h,false); await loadFromDir(h); return; }
  layers.forEach(l=>{ l.file=''; l.fileBlob=null; });   /* new folder: all images go there */
  await bindDir(h,true);
  $('saveStatus').textContent=L('Запись в папку…','Writing to the folder…'); syncDir();
  await writeDirQ();
  if(!dirErr){ $('saveStatus').innerHTML='<span class="good">'+L('Проект записан в папку «','Project written to folder “')+h.name+
    L('» — дальше сохраняется туда сам.','” — it is saved there from now on.')+'</span>'; statusHold=Date.now()+5000; save(true); }
}
async function loadFromDir(h){
  const st=$('saveStatus');
  try{ st.textContent=L('Чтение папки…','Reading the folder…');
    const f=await fsRead(h,'project.json'); if(!f) throw new Error(L('в папке нет project.json','no project.json in the folder'));
    const s=JSON.parse(await f.text());
    const n=await openProject(s,d=>d.file?fsRead(h,d.file):null);
    layers.forEach(l=>{ if(l.blob) l.fileBlob=l.blob; });
    projName=h.name; setDirty(false);
    afterLoad(L('Проект открыт из папки «','Project opened from folder “')+h.name+L('» · картинок ','” · images ')+n);
  }catch(err){ st.innerHTML='<span class="bad">'+L('Ошибка чтения папки: ','Folder read error: ')+err.message+'</span>'; }
  syncDir();
}
async function connectDir(auto){ /* auto: access is still granted (same browser session) — no questions */
  const h=workDir; if(!h) return;
  if(!auto){ let p='denied'; try{ p=await h.requestPermission({mode:'readwrite'}); }catch(err){}
    if(p!=='granted'){ syncDir(); return; } }
  workDirOk=true; projName=h.name;
  const f=await fsRead(h,'project.json'), dirty=localStorage.getItem(dirtyKey())==='1';
  if(!f){ await writeDirQ(); return; }   /* the folder lost its project: write the browser copy */
  if(dirty&&(auto||confirm(L(`В браузере есть изменения, которых нет в папке «${h.name}».\n\nOK — записать их в папку.\nОтмена — открыть проект из папки (эти изменения пропадут).`,
      `The browser has changes that are not in folder “${h.name}”.\n\nOK — write them to the folder.\nCancel — open the project from the folder (these changes are lost).`)))){
    await writeDirQ(); return; }
  if(!dirty&&keyOf(JSON.parse(await f.text()))===keyOf(snapshot())){   /* same project: only images missing in the browser */
    for(const l of layers){ if(l.blob||!l.file||l.kind==='video') continue; const b=await fsRead(h,l.file);
      if(b){ l.blob=b; l.stored=true; l.fileBlob=b; setBlobSrc(l,b); idb.put(ik(l.id),b).catch(()=>{}); } }
    syncDir(); return; }
  await loadFromDir(h);   /* the folder is the truth (it may be synced from another computer) */
}
async function initWorkDir(){ /* boot */
  syncDir(); if(!hasFSA()) return;
  { const old=await idb.meta.get('workDir').catch(()=>null);   /* first version kept one folder for all tabs */
    if(old){ await idb.meta.del('workDir').catch(()=>{}); if(!scope){ const id=await dirScope(old);
      await idb.meta.put('dir:'+id,old).catch(()=>{});
      for(const l of layers){ const b=await idb.get(l.id).catch(()=>null); if(b) await idb.put(id+'/'+l.id,b).catch(()=>{}); }
      moveScope(id); } } }
  if(!scope) return;
  const h=await idb.meta.get('dir:'+scope).catch(()=>null);
  if(!h){ setScope(''); return; }
  workDir=h; let p='prompt'; try{ p=await h.queryPermission({mode:'readwrite'}); }catch(err){}
  if(p==='granted') await connectDir(true); else syncDir();
}
function syncDir(){
  const nm=$('dirName'); if(!nm) return;
  $('dirPick').disabled=!hasFSA();
  $('dirConnect').hidden=!(workDir&&!workDirOk); $('dirOff').hidden=!workDir;
  nm.innerHTML=!workDir ? L('— только браузер','— browser only')
    : '<b>'+workDir.name+'</b> · '+( !workDirOk ? '<span class="bad">'+L('нет доступа','no access')+'</span>'
      : dirErr ? '<span class="bad">'+L('ошибка записи: ','write error: ')+dirErr+'</span>'
      : dirAt ? L('записано ','written ')+new Date(dirAt).toLocaleTimeString(LOC) : L('подключена','connected'));
}
$('dirPick').onclick=pickWorkDir;
$('dirConnect').onclick=()=>connectDir(false);
$('dirOff').onclick=()=>{ if(!workDir) return;
  if(!confirm(L(`Отключить папку «${workDir.name}»?\n\nПроект останется в ней и в браузере; дальше сохраняется только в браузер.`,
                `Disconnect folder “${workDir.name}”?\n\nThe project stays there and in the browser; from now on it is saved to the browser only.`))) return;
  unbindDir(); };
