/* ---------- boot ---------- */
let restored=false;
setScope(scope);   /* pin the scope to this tab */
try{ const raw=localStorage.getItem(stKey()); if(raw) restored=restore(JSON.parse(raw)); }catch(err){}
let fresh=false; try{ fresh=sessionStorage.getItem(NEWKEY)==='1'; sessionStorage.removeItem(NEWKEY); }catch(err){}
if(!restored){   /* «Новый проект» / first start: empty main layers, pick photos in the cards */
  layers.push(mkLayer(0,{name:'TOP',side:'top',main:true}));
  layers.push(mkLayer(1,{name:'BOT',side:'bot',main:true,fh:true,op:.5}));
  restack(); sel='L1'; refId='L2';
}
loadImages(); renderCards(); renderFiles(); renderNets(); renderComps(); applyAll();
if(restored) applyView(); else fit();
sync(); checkMissing(); booted=true; histReset(); initWorkDir();
if(fresh&&!restored) save(true);   /* persist the empty project, else a reload brings the demo back */
$('saveStatus').innerHTML= restored? L('Состояние восстановлено.','State restored.') : L('Автосохранение включено.','Autosave is on.');
/* first start (nothing saved, not «Новый проект»): open the demo project from the repo. A file:// page cannot fetch(),
   so the .pcbr comes as base64 in tests/test_project.pcbr.js (built by tests/make_demo.js). ?nodemo — skip (tests). */
function loadDemo(){
  const sc=document.createElement('script'); sc.src='tests/test_project.pcbr.js';
  sc.onload=async()=>{ const b64=window.PCBR_DEMO; delete window.PCBR_DEMO; sc.remove(); if(!b64) return;
    const bin=atob(b64), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
    if(await loadProject(new File([u],'demo.pcbr')))
      $('saveStatus').innerHTML='<span class="good">'+L('Открыт демо-проект. Свой — «Новый проект» или «Загрузить проект».',
        'Demo project opened. Start your own with “New project” or “Open project”.')+'</span>'; };
  sc.onerror=()=>{ sc.remove(); $('saveStatus').innerHTML=L('Автосохранение включено.','Autosave is on.'); save(true); };
  $('saveStatus').textContent=L('Загрузка демо-проекта…','Loading the demo project…');
  document.body.appendChild(sc);
}
if(!restored&&!fresh&&!scope&&!/[?&]nodemo\b/.test(location.search)) loadDemo();   /* scope: the folder brings the project */
$('langBtn').textContent=L('EN','RU'); $('langBtn').title=L('Switch to English','Переключить на русский');
$('langBtn').onclick=()=>{ saveNow(true);   /* save now (marks the working folder dirty), then reload in the other language */
  try{ localStorage.setItem(LANGKEY,L('en','ru')); }catch(err){}
  location.reload(); };
