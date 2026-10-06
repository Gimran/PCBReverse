/* ---------- sync ---------- */
/* side for new parts follows the active layer's label (or the board side for "обе");
   re-evaluated only when the active layer or board side changes, so a manual pick holds until then */
let compSideKey='';
function autoCompSide(){
  const l=sel_(), k=(l?l.id+l.side:'')+'|'+boardSide; if(k===compSideKey) return;
  compSideKey=k; compSide=(l&&(l.side==='top'||l.side==='bot'))?l.side:boardSide;
}
function sync(){
  if(booted){ const k=[selComp,selPoint,selNote,hlNet,clickMode,nets.length,comps.length,notes.length].join('|');
    if(k!==propKey) renderProp(); }   /* PROP follows selection / mode changes */
  autoCompSide();
  const s=sel_(), r=byId(refId);
  const warped=!!(s&&s.H);
  $('rot').disabled=$('scl').disabled=warped||!s;
  if(s){ $('rot').value=s.rot; $('scl').value=s.scale; }
  $('rotv').disabled=$('sclv').disabled=warped||!s;
  if(document.activeElement!==$('rotv')) $('rotv').value=(warped||!s)?'—':String(+s.rot.toFixed(2));
  if(document.activeElement!==$('sclv')) $('sclv').value=(warped||!s)?'—':String(+s.scale.toFixed(4));
  $('hudSel').textContent=L('плата ','board ')+boardSide.toUpperCase()+L(' · актив: ',' · active: ')+(s?s.name:'—');
  $('hudXf').textContent= !s?'' : warped?L('деформация активна','warp active')
    : `dx ${Math.round(s.x)} · dy ${Math.round(s.y)} · ${s.rot.toFixed(1)}° · ${s.scale.toFixed(3)}×`+
      ((s.sx||1)!==1||(s.sy||1)!==1?` (x ${(s.sx||1).toFixed(3)} · y ${(s.sy||1).toFixed(3)})`:'');
  document.querySelectorAll('[data-vm]').forEach(b=>b.classList.toggle('on',b.dataset.vm===viewMode));

  const picking=clickMode==='align', np=s?s.pairs.length:0;
  $('applyWarp').disabled=np<2; $('undoPt').disabled=!np&&!pending;
  $('clearPts').disabled=!np&&!pending; $('dropWarp').disabled=!warped;
  $('pickBtn').classList.toggle('on',picking);
  $('pickBtn').textContent=picking?L('Завершить ввод','Finish input'):L('Задать точки','Set points');
  $('blinkBtn').classList.toggle('on',blinkOn);
  $('warpModel').value=warpModel;
  const nextL=pending?r:s, nextName=nextL?nextL.name:'—', nextHidden=picking&&nextL&&!layerShown(nextL);
  $('warpStatus').innerHTML=L(`Пар: <b>${np}</b>${np>=8?' (максимум)':''} · от 2 до 8.<br>`,`Pairs: <b>${np}</b>${np>=8?' (maximum)':''} · 2 to 8.<br>`)+
    (picking?L(`Клик по слою <b>${nextName}</b> — ${pending?'та же точка на опоре':'точка на активном слое'}${blinkOn?' (мигает)':''}.`,
               `Click layer <b>${nextName}</b> — ${pending?'the same point on the reference':'a point on the active layer'}${blinkOn?' (blinking)':''}.`)+
       (nextHidden?'<br><span class="bad">'+L(`«${nextName}» сейчас не виден — включите XRAY или выберите видимую опору.`,
                                              `“${nextName}” is not visible now — turn on XRAY or pick a visible reference.`)+'</span>':'')
            :L(`Опора <b>${r?r.name:'—'}</b> → подгоняется <b>${s?s.name:'—'}</b>.`,`Reference <b>${r?r.name:'—'}</b> → fitting <b>${s?s.name:'—'}</b>.`))+
    (warpInfo&&warped?`<br><span class="good">${warpInfo}</span>`:'');

  const netting=clickMode==='net', an=nets.find(n=>n.id===activeNet);
  $('netPickBtn').classList.toggle('on',netting);
  $('netPickBtn').textContent=L('Редактирование NET (N)','Edit NETs (N)');
  $('delPoint').disabled=!netting||!selPoint; $('clearNetPts').disabled=!netting||!an||!points.some(p=>p.net===activeNet);
  if(compEditShown!==(clickMode==='comp')){ compEditShown=clickMode==='comp'; renderComps(); }
  $('labelsBtn').classList.toggle('on',labels);
  $('netStatus').innerHTML= !an? L('Создайте NET, затем ставьте его точки на слоях.','Create a NET, then place its points on the layers.')
    : L(`Активный NET: <b>${an.name}</b> · точек ${points.filter(p=>p.net===activeNet).length}<br>`,
        `Active NET: <b>${an.name}</b> · points ${points.filter(p=>p.net===activeNet).length}<br>`)+
      L(`Точки ставятся на слой <b>${s?s.name:'—'}</b>.`,`Points go to layer <b>${s?s.name:'—'}</b>.`)+
      (netting?L(' <b>Alt+клик</b> — переходное (видно с обеих сторон). Выделить точку + Delete — удалить.',
                 ' <b>Alt+click</b> — via (visible on both sides). Select a point + Delete — delete.'):'')+
      (hlNet?`<br><span class="good">${L('подсвечен','highlighted')}: ${nets.find(n=>n.id===hlNet).name}</span>`:'');

  const cue=$('hudCue');
  const mf=mergeFrom&&nets.find(n=>n.id===mergeFrom);
  if(mf){cue.hidden=false;cue.textContent=L(`«${mf.name}» → клик по точке другого NET (или по NET в списке) — объединить в него · Esc / клик мимо — отмена`,
    `“${mf.name}” → click a point of another NET (or a NET in the list) — merge into it · Esc / click empty — cancel`);}
  else if(picking){cue.hidden=false;cue.textContent=L(`точка ${np+1}: клик по «${nextName}»`,`point ${np+1}: click “${nextName}”`);}
  else if(netting&&an){cue.hidden=false;cue.textContent=an.name+L(': клик — точка · Alt+клик — переходное · Ctrl+клик — новый NET (via)',': click — point · Alt+click — via · Ctrl+click — new NET (via)');}
  else if(clickMode==='move'){cue.hidden=false;cue.textContent=L(`деформация: ${xfMode==='scale'?'масштаб (углы — пропорц., стороны — по оси)':'вращение'} · клик по слою — сменить · ⊕ — центр (двойной клик — в центр) · Shift — шаг 15°`,
    `transform: ${xfMode==='scale'?'scale (corners — proportional, sides — one axis)':'rotate'} · click the layer — switch · ⊕ — pivot (double-click — back to centre) · Shift — 15° steps`);}
  else if(clickMode==='crop'){cue.hidden=false;cue.textContent=L('кроп «'+(s?s.name:'—')+'»: тяните стороны и углы, внутри — сдвиг рамки','crop “'+(s?s.name:'—')+'”: drag sides and corners, inside — move the frame');}
  else cue.hidden=true;
  vp.classList.toggle('picking',clickMode!=='none');
  $('moveBtn').classList.toggle('on',clickMode==='move');
  $('cropBtn').classList.toggle('on',clickMode==='crop'); $('cropBtn').disabled=!sel_();
  $('rstCrop').disabled=!(sel_()&&sel_().crop);
  document.querySelectorAll('#vidRows [data-mode]').forEach(b=>  /* ВИДЕО tab copies of M / crop */
    b.classList.toggle('on',clickMode===b.dataset.mode&&sel===b.dataset.lid));
  $('moveBtn').disabled=!!(sel_()&&sel_().H);
  $('gridBtn').classList.toggle('on',grid); vp.classList.toggle('nogrid',!grid);
  $('invBtn').classList.toggle('on',inverted); $('grayBtn').classList.toggle('on',grayView);
  $('flipBoard').textContent=L('Плата: ','Board: ')+(boardSide==='top'?'TOP':'BOT')+L(' · перевернуть (F)',' · flip (F)');
  $('xrayBtn').classList.toggle('on',xray); $('xrayBox').classList.toggle('on',xray);
  if(document.activeElement!==$('xrayOp')) $('xrayOp').value=Math.round(xrayOp*100);
  syncActl();
  { const l=sel_(); ['keyOn','keyCol','keyPick','keyTol'].forEach(i=>$(i).disabled=!l);
    if(l){ $('keyOn').classList.toggle('on',!!l.kOn); $('keyCol').value=l.kc;
      $('keyTol').value=Math.round(l.kt*100); $('keyTolv').textContent=Math.round(l.kt*100)+'%'; }
    $('keyPick').hidden=!window.EyeDropper; }
  syncCor();
  $('showNetsBtn').classList.toggle('on',showNets); $('showCompsBtn').classList.toggle('on',showComps);
  syncDraw();
  if(clickMode!=='move') vp.style.cursor='';
  $('vrotv').textContent=view.rot+'°';
  $('vflipH').classList.toggle('on',!!view.fh); $('vflipV').classList.toggle('on',!!view.fv);
  const rs=$('refSel'); if(rs.value!==refId) rs.value=refId||'';
  syncComps();
  updateBlink();
}
