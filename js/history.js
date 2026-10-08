/* ---------- undo / redo: Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z — snapshots of the document, HIST_MAX steps ----------
   A step is what changed between two autosaves (400 ms debounce): a drag or a burst of typing is one step.
   View and tool settings (UI_KEYS) are not part of the document: undo keeps the current view, zoom, side, tools. */
const HIST_MAX=10;
const UI_KEYS=['count','sel','refId','viewMode','swipe','view','boardSide','xray','inverted','grayView','grid','labels',
  'blinkOn','pulseT','tintMode','activeNet','compKind','compSize','compSide','compRot','icPat','icPins','sotPat','icRot','icPin0',
  'compVal','sideOp','xrayOp','showSide','showNets','showComps','showDraw','drawStyle','warpModel','imgDir','projName'];
let hUndo=[], hRedo=[], hCur=null, hKey=null;   /* stacks of document JSON; hCur — the document as last saved, hKey — its
                                                   comparison key (without l.file: the folder's file names are bookkeeping) */
const blobMem=new Map();   /* id|src -> image blob seen this session: brings back images of layers restored by undo */
const blobKey=l=>l.id+'|'+(l.src||'');
function docOf(s){ const o={}; for(const k in s) if(!UI_KEYS.includes(k)) o[k]=s[k]; return JSON.stringify(o); }
function keyOf(s){ const o={}; for(const k in s) if(!UI_KEYS.includes(k)) o[k]=s[k];
  o.layers=(s.layers||[]).map(l=>{ const c={...l}; delete c.file; return c; }); return JSON.stringify(o); }
function uiOf(s){ const o={}; UI_KEYS.forEach(k=>{ if(k in s) o[k]=s[k]; }); return o; }
function histReset(){ const s=snapshot(); hUndo=[]; hRedo=[]; hCur=docOf(s); hKey=keyOf(s); }
function histNote(s){ /* from saveNow: the document changed since the last step -> new step */
  if(hCur===null){ hCur=docOf(s); hKey=keyOf(s); return; }
  if(drag) return;   /* mid-drag pause: the step is taken when the drag ends */
  const d=docOf(s), k=keyOf(s); if(k===hKey){ hCur=d; return; }   /* only file names changed — not a step */
  hUndo.push(hCur); if(hUndo.length>HIST_MAX) hUndo.shift();
  hRedo=[]; hCur=d; hKey=k;
}
function histStep(back){
  if(saveTimer) saveNow(true);   /* a change still waiting for autosave becomes its own step first */
  const from=back?hUndo:hRedo, to=back?hRedo:hUndo;
  if(!from.length){ toast(back?L('Отменять нечего','Nothing to undo'):L('Повторять нечего','Nothing to redo')); return; }
  to.push(hCur); applyDoc(from.pop()); { const s=snapshot(); hCur=docOf(s); hKey=keyOf(s); }
  toast((back?L('Отменено','Undone'):L('Повторено','Redone'))+' · '+L('ещё ','left ')+from.length);
  save(true);
}
const undo=()=>histStep(true), redo=()=>histStep(false);
function applyDoc(d){
  const s=Object.assign(JSON.parse(d),uiOf(snapshot())), keep={selComp,selPoint,selNote,hlNet};
  s.layers.forEach(x=>{ const l=byId(x.id); if(l&&l.file&&(l.src||'')===(x.src||'')) x.file=l.file; });   /* newest file names */
  layers.forEach(l=>{ if(l.blob) blobMem.set(blobKey(l),l.blob); });
  const same=layers.length===s.layers.length&&s.layers.every(x=>{ const l=byId(x.id);
    return l&&(l.src||'')===(x.src||'')&&!!l.stored===!!x.stored&&(l.kind||'')===(x.kind||''); });
  if(same){   /* same layers and images: update in place — no reload, no flicker */
    layers=s.layers.map((x,i)=>{ const l=byId(x.id), o=layerInit(x,i,s);
      ['id','src','stored','kind'].forEach(k=>delete o[k]); Object.assign(l,o); l.el.alt=l.name; return l; });
    restoreState(s);
  } else {   /* a layer was added / removed / got another image: rebuild, images from memory */
    restore(s);
    layers.forEach(l=>{ const b=blobMem.get(blobKey(l));
      if(b&&l.kind!=='video'){ l.ok=false; l.blob=b; setBlobSrc(l,b); if(l.stored) idb.put(ik(l.id),b).catch(()=>{}); }
      else loadImage(l); });
  }
  selComp=comps.some(c=>c.id===keep.selComp)?keep.selComp:null;
  selPoint=points.some(p=>p.id===keep.selPoint)?keep.selPoint:null;
  selNote=notes.some(n=>n.id===keep.selNote)?keep.selNote:null;
  hlNet=nets.some(n=>n.id===keep.hlNet)?keep.hlNet:null;
  pending=null; mergeFrom=null;
  renderCards(); renderFiles(); renderNets(); renderComps(); applyAll(); sync(); checkMissing();
}
let toastTimer=null;
function toast(msg){ const t=$('hudToast'); t.textContent=msg; t.hidden=false;
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.hidden=true,2200); }
