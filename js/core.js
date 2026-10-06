const SVGNS="http://www.w3.org/2000/svg", KEY="pcb-overlay-v4", IMGKEY=id=>"pcb-overlay-img-"+id, NEWKEY="pcb-overlay-new";
const NETPAL=["#e05c5c","#e0a844","#57b85d","#68b6dd","#b07ede","#e0d24a","#4ac4b0","#e08ac0"];
/* colour correction per layer: brightness, contrast, gamma, levels black/white, saturation, sharpen, posterize */
const COR0={br:0,ct:1,gm:1,lb:0,lw:1,sat:1,sh:0,pz:0};
const CORUI=[['lb',L('чёрн','black'),0,1,.005,v=>Math.round(v*100)+'%',L('уровни: всё темнее — в чёрный','levels: everything darker turns black')],
  ['lw',L('бел','white'),0,1,.005,v=>Math.round(v*100)+'%',L('уровни: всё светлее — в белый','levels: everything lighter turns white')],
  ['gm',L('гамма','gamma'),.2,4,.01,v=>v.toFixed(2),L('гамма: >1 высветляет средние тона','gamma: >1 lightens midtones')],
  ['br',L('ярк','bright'),-1,1,.01,v=>(v>0?'+':'')+Math.round(v*100)+'%',L('яркость','brightness')],
  ['ct',L('контр','contr'),0,4,.01,v=>v.toFixed(2)+'×',L('контраст','contrast')],
  ['sat',L('насыщ','satur'),0,2,.01,v=>Math.round(v*100)+'%',L('насыщенность: 0 — Ч/Б','saturation: 0 — B/W')],
  ['sh',L('резк','sharp'),0,3,.05,v=>v.toFixed(2),L('резкость','sharpness')],
  ['pz',L('постер','poster'),0,16,1,v=>v<2?L('выкл','off'):String(v),L('постеризация: число уровней на канал','posterize: levels per channel')]];
const corActive=c=>Object.keys(COR0).some(k=>Math.abs(c[k]-COR0[k])>1e-9);
const LAYPAL=["#e0a844","#68b6dd","#57b85d","#e05c5c","#b07ede","#4ac4b0","#e08ac0","#c9c35a"];
const $=id=>document.getElementById(id);
const vp=$('vp'), stack=$('stack'), handle=$('handle'), marks=$('marks'), defs=$('filterDefs');

let layers=[];                 /* index 0 = bottom */
let view={x:0,y:0,z:1,rot:0,fh:false,fv:false}, sel=null, refId=null, viewMode='all', swipe=.5;
let grayView=false, inverted=false, grid=true, tintMode='color', labels=true, blinkOn=true;
let clickMode='none', pending=null, warpInfo='', boardSide='top', xray=false;
let showNets=true, showComps=true; /* global overlay toggles */
/* xray — boardSide не скрывает слои другой стороны */
const onSide=l=>xray||l.side==='any'||l.side===boardSide;
let nets=[], points=[], activeNet=null, hlNet=null, selPoint=null, netSeq=1;
const PKG={ '0201':{L:0.60,W:0.30,T:0.15}, '0402':{L:1.00,W:0.50,T:0.25},
            '0603':{L:1.60,W:0.80,T:0.35}, '0805':{L:2.00,W:1.25,T:0.40} };
const SIDECOL_DEF={top:'#ff0000', bot:'#0000ff'};
let SIDECOL={...SIDECOL_DEF}; /* component colour per side, editable, saved */
let comps=[], selComp=null, mmScale=0, compSeq={R:1,C:1};
let compKind='R', compSize='0603', compSide='top', compRot=0;
let icPat='d2', icPins=8, sotPat='s3';   /* sotPat: SOT23-3 / -5 / -6 */   /* IC / connector placement: pattern and pin count */
let compEditShown=false; /* comp panel rendered for edit mode */
let compVal={R:'',C:''}; /* last typed value per kind — default for new parts */
let showSide={top:true,bot:true};
let sideOp={top:1,bot:1}, xrayOp=.5;   /* xrayOp: side in view under XRAY; the far side stays opaque */   /* group opacity of the TOP / BOT layers, multiplies each layer's α */
let calib=null;   /* {size,x,y} while calibrating */
let browseTarget=null, booted=false, projName='project';
const imgDir='pcb_overlay_img/';   /* fixed: layer pictures by path live next to index.html in this folder */
const dirJoin=(d,n)=>{ d=(d||'').trim().replace(/\\/g,'/'); if(d&&!d.endsWith('/'))d+='/'; return d+n; };
const byId=id=>layers.find(l=>l.id===id);
const idx=id=>layers.findIndex(l=>l.id===id);
