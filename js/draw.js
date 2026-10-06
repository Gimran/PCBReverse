/* ---------- DRAW: labels and shapes in world coords, shown on their board side (or with XRAY) ---------- */
let notes=[], selNote=null, drawTool='sel', showDraw=true, drawStyle={col:'#ffd400',w:2,fs:16};
const noteShown=n=>showDraw&&(xray||n.side==='any'||n.side===boardSide);
const nid=()=>'d'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
function segD(p,a,b){ const vx=b.x-a.x, vy=b.y-a.y, l=vx*vx+vy*vy||1;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*vx+(p.y-a.y)*vy)/l)); return Math.hypot(p.x-a.x-t*vx,p.y-a.y-t*vy); }
function noteGeom(n){ /* screen geometry */
  if(n.t==='text'){ const p=screenOf(n.a), w=Math.max(1,(n.txt||'').length)*n.fs*.6;
    return {p, box:{x0:p.x-3,y0:p.y-n.fs*.65,x1:p.x+w+3,y1:p.y+n.fs*.65}}; }
  if(n.t==='circle') return {c:screenOf(n.a), r:Math.abs((n.r||0)*view.z)};
  if(n.t==='rect') return {q:[{x:n.a.x,y:n.a.y},{x:n.b.x,y:n.a.y},{x:n.b.x,y:n.b.y},{x:n.a.x,y:n.b.y}].map(screenOf)};
  return {A:screenOf(n.a), B:screenOf(n.b)};
}
function noteHandles(n){ const g=noteGeom(n);
  if(n.t==='text') return [{k:'a',p:g.p}];
  if(n.t==='circle') return [{k:'a',p:g.c},{k:'r',p:{x:g.c.x+g.r,y:g.c.y}}];
  if(n.t==='rect') return [{k:'a',p:g.q[0]},{k:'b',p:g.q[2]}];
  return [{k:'a',p:g.A},{k:'b',p:g.B}];
}
function drawNotes(){
  notes.forEach(n=>{ if(!noteShown(n)) return;
    const g=noteGeom(n), col=n.col||'#ffd400', w=n.w||2, hc=haloFor(col);
    const both=(tag,a)=>{ marks.appendChild(svg(tag,{...a,fill:'none',stroke:hc,'stroke-width':w+3,opacity:.5,'stroke-linecap':'round','stroke-linejoin':'round'}));
      marks.appendChild(svg(tag,{...a,fill:'none',stroke:col,'stroke-width':w,'stroke-linecap':'round','stroke-linejoin':'round'})); };
    if(n.t==='text'){ const t=svg('text',{x:g.p.x,y:g.p.y,fill:col,'font-size':n.fs||16,'font-weight':600,'dominant-baseline':'central',
        'font-family':'IBM Plex Sans, sans-serif',stroke:hc,'stroke-width':Math.max(3,(n.fs||16)/5),'paint-order':'stroke','stroke-linejoin':'round'});
      t.textContent=n.txt||''; marks.appendChild(t); }
    else if(n.t==='circle') both('circle',{cx:g.c.x,cy:g.c.y,r:g.r});
    else if(n.t==='rect') both('polygon',{points:g.q.map(q=>q.x+','+q.y).join(' ')});
    else { const d=Math.hypot(g.B.x-g.A.x,g.B.y-g.A.y)||1, ux=(g.B.x-g.A.x)/d, uy=(g.B.y-g.A.y)/d, h=Math.max(10,w*4), hw=h*.55;
      const base={x:g.B.x-ux*h*.8,y:g.B.y-uy*h*.8};
      both('line',{x1:g.A.x,y1:g.A.y,x2:base.x,y2:base.y});
      const tri=[g.B,{x:g.B.x-ux*h-uy*hw,y:g.B.y-uy*h+ux*hw},{x:g.B.x-ux*h+uy*hw,y:g.B.y-uy*h-ux*hw}];
      marks.appendChild(svg('polygon',{points:tri.map(q=>q.x+','+q.y).join(' '),fill:col,stroke:hc,'stroke-width':1.2,'stroke-linejoin':'round'})); }
    if(n.id===selNote&&clickMode==='draw') noteHandles(n).forEach(hh=>marks.appendChild(svg('rect',
      {x:hh.p.x-4,y:hh.p.y-4,width:8,height:8,fill:'#fff',stroke:'#000','stroke-width':1})));
  });
}
function hitNote(e){ /* -> {n, h?} ; handles of the selected shape first */
  const m=evXY(e), s0=notes.find(o=>o.id===selNote);
  if(s0&&noteShown(s0)){ const hh=noteHandles(s0).find(q=>Math.hypot(q.p.x-m.x,q.p.y-m.y)<=7); if(hh) return {n:s0,h:hh.k}; }
  let best=null, bd=7;
  notes.forEach(n=>{ if(!noteShown(n)) return; const g=noteGeom(n); let d=Infinity;
    if(n.t==='text'){ const b=g.box; if(m.x>=b.x0&&m.x<=b.x1&&m.y>=b.y0&&m.y<=b.y1) d=0; }
    else if(n.t==='circle') d=Math.abs(Math.hypot(m.x-g.c.x,m.y-g.c.y)-g.r);
    else if(n.t==='rect') d=Math.min(...[0,1,2,3].map(i=>segD(m,g.q[i],g.q[(i+1)%4])));
    else d=segD(m,g.A,g.B);
    d-=(n.w||0)/2; if(d<bd){ bd=d; best={n}; } });
  return best;
}
function delNote(id){ notes=notes.filter(o=>o.id!==id); if(selNote===id) selNote=null; renderProp(); drawMarks(); save(); }
function syncDraw(){
  $('drawBtn').classList.toggle('on',clickMode==='draw');
  document.querySelectorAll('#drawTools [data-tool]').forEach(b=>b.classList.toggle('on',b.dataset.tool===drawTool));
  if(document.activeElement!==$('drawCol')) $('drawCol').value=drawStyle.col;
  $('drawW').value=drawStyle.w; $('drawWv').textContent=drawStyle.w; $('drawFs').value=drawStyle.fs; $('drawFsv').textContent=drawStyle.fs;
  $('showDrawBtn').classList.toggle('on',showDraw);
  $('drawStatus').innerHTML = clickMode!=='draw'
    ? L('Включите «Рисование (D)» или выберите инструмент.','Turn on “Drawing (D)” or pick a tool.')
    : ({sel:L('Клик — выбрать фигуру, тянуть — двигать, белые маркеры — менять форму. Delete — удалить выделенную.',
              'Click — pick a shape, drag — move, white handles — reshape. Delete — delete the selected one.'),
        text:L('Клик — поставить надпись; текст правится во вкладке PROP.','Click — place a label; edit its text in the PROP tab.'),
        arrow:L('Тяните от начала к острию.','Drag from the tail to the tip.'),
        rect:L('Тяните по диагонали.','Drag along the diagonal.'),
        circle:L('Тяните от центра наружу.','Drag from the centre outwards.')})[drawTool];
}
