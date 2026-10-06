/* ---------- video layer (experimental): camera / USB microscope via getUserMedia ----------
   the <video> sits in the layer box instead of the <img>; geometry, warp, crop, key, correction, tint all apply */
function attachVideo(l){
  const v=document.createElement('video'); v.muted=true; v.playsInline=true; v.autoplay=true;
  l.el.style.display='none'; l.box.appendChild(v); l.vid=v;
  v.addEventListener('loadedmetadata',()=>{ if(v.videoWidth){ l.h=1200*v.videoHeight/v.videoWidth; }
    l.ok=true; applyLayer(l); sync(); refreshFiles(); });
}
async function startCam(l,quiet){
  stopCam(l); l.camErr='';
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){ l.camErr=L('браузер не даёт доступ к камере','the browser gives no camera access'); refreshFiles(); return; }
  try{
    l.stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{
      ...(l.camId?{deviceId:{exact:l.camId}}:{}), width:{ideal:1920}, height:{ideal:1080}}});
    l.vid.srcObject=l.stream; await l.vid.play().catch(()=>{});
    const tr=l.stream.getVideoTracks()[0]; if(tr&&!l.camId) l.camId=tr.getSettings().deviceId||'';
    await listCams(); save();
  }catch(err){ l.stream=null; l.camErr=quiet?L('камера не запущена — «Старт»','camera not started — “Start”'):(err.name+': '+err.message); }
  refreshFiles(true);
}
function stopCam(l){ if(l.stream){ l.stream.getTracks().forEach(t=>t.stop()); l.stream=null; }
  if(l.vid) l.vid.srcObject=null; l.ok=false; }
let camList=[];
async function listCams(){ try{ camList=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput'); }catch(err){} }
const videoLayer=()=>layers.find(l=>l.kind==='video');
function addVideoLayer(camId){ /* the single camera layer, created on first «Старт» */
  const l=addLayer(); l.kind='video'; l.name=L('Видео','Video'); l.side='any'; l.vmode='overlay'; l.fe=.15; l.camId=camId||'';
  attachVideo(l); layersChanged(); startCam(l); return l;
}
function snapLayer(l){ /* freeze the current frame into a new image layer at the same place */
  const v=l.vid; if(!v||!v.videoWidth) return;
  const c=document.createElement('canvas'); c.width=v.videoWidth; c.height=v.videoHeight;
  c.getContext('2d').drawImage(v,0,0);
  c.toBlob(b=>{ if(!b) return;
    const n=addLayer(), keep=['x','y','rot','scale','sx','sy','fh','fv','side','H','crop','fe'];
    keep.forEach(k=>n[k]=JSON.parse(JSON.stringify(l[k]??null))); n.cor={...l.cor};
    n.name=L('Снимок ','Snapshot ')+new Date().toLocaleTimeString(LOC);
    storeFile(n.id,new File([b],'micro_'+Date.now()+'.png',{type:'image/png'}));
    layersChanged();
  },'image/png');
}
function mainOf(side){ return layers.find(x=>x.main&&x.side===side&&x.kind!=='video'); }
function snapPatch(l){ /* «Дополнить слой»: frame -> image layer at the same place, sub-layer of the main layer
                          of the side being viewed (TOP main / BOT main) */
  const side=boardSide, M=mainOf(side);
  if(!M){ l.camErr=L('нет главного слоя — поставьте метку «'+side.toUpperCase()+' main»','no main layer — tag a layer “'+side.toUpperCase()+' main”'); renderVideo(); return; }
  const v=l.vid; if(!v||!v.videoWidth) return;
  const c=document.createElement('canvas'); c.width=v.videoWidth; c.height=v.videoHeight;
  c.getContext('2d').drawImage(v,0,0);
  c.toBlob(b=>{ if(!b) return;
    const n=addLayer(), keep=['x','y','rot','scale','sx','sy','fh','fv','H','crop','fe'];
    keep.forEach(k=>n[k]=JSON.parse(JSON.stringify(l[k]??null))); n.cor={...l.cor};
    n.side=M.side; n.parent=M.id; n.name=L('патч ','patch ')+new Date().toLocaleTimeString(LOC);
    storeFile(n.id,new File([b],'patch_'+Date.now()+'.png',{type:'image/png'}));
    l.camErr=''; layersChanged();
  },'image/png');
}
function removeLayer(l){
  if(layers.length<=1) return;
  layers.forEach(o=>{ if(o.parent===l.id) o.parent=null; });
  stopCam(l);
  layers=layers.filter(x=>x!==l);
  points=points.filter(p=>p.layer!==l.id);
  layers.forEach(o=>o.pairs=o.pairs.filter(pr=>pr.rl!==l.id));
  localStorage.removeItem(IMGKEY(l.id)); idb.del(l.id).catch(()=>{});
  if(l.url) URL.revokeObjectURL(l.url);
  l.clip.remove(); l.fx.node.remove();
  renderNets(); layersChanged(); drawMarks();
}
