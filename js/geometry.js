/* ---------- geometry ---------- */
/* layer scale along its image axes: uniform scale × per-axis stretch (side handles in mode M) × mirror */
const kX=l=>l.scale*(l.sx||1)*(l.fh?-1:1), kY=l=>l.scale*(l.sy||1)*(l.fv?-1:1);
function T(l,p){
  const dx=(p.x-l.w/2)*kX(l), dy=(p.y-l.h/2)*kY(l);
  const r=l.rot*Math.PI/180, c=Math.cos(r), s=Math.sin(r);
  return {x:dx*c-dy*s+l.x, y:dx*s+dy*c+l.y};
}
function Tinv(l,m){
  const r=-l.rot*Math.PI/180, c=Math.cos(r), s=Math.sin(r);
  const ax=m.x-l.x, ay=m.y-l.y, dx=ax*c-ay*s, dy=ax*s+ay*c;
  return {x:dx/kX(l)+l.w/2, y:dy/kY(l)+l.h/2};
}
function applyH(H,p){const d=H[6]*p.x+H[7]*p.y+1;
  return {x:(H[0]*p.x+H[1]*p.y+H[2])/d, y:(H[3]*p.x+H[4]*p.y+H[5])/d};}
function invH(H){
  const m=[[H[0],H[1],H[2]],[H[3],H[4],H[5]],[H[6],H[7],1]];
  const d=m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
  if(Math.abs(d)<1e-12)return null;
  const a=[(m[1][1]*m[2][2]-m[1][2]*m[2][1])/d,(m[0][2]*m[2][1]-m[0][1]*m[2][2])/d,(m[0][1]*m[1][2]-m[0][2]*m[1][1])/d,
           (m[1][2]*m[2][0]-m[1][0]*m[2][2])/d,(m[0][0]*m[2][2]-m[0][2]*m[2][0])/d,(m[0][2]*m[1][0]-m[0][0]*m[1][2])/d,
           (m[1][0]*m[2][1]-m[1][1]*m[2][0])/d,(m[0][1]*m[2][0]-m[0][0]*m[2][1])/d,(m[0][0]*m[1][1]-m[0][1]*m[1][0])/d];
  const k=a[8]; return a.slice(0,8).map(v=>v/k);
}
const worldOf=(l,p)=> l.H? applyH(l.H,p) : T(l,p);
function imgOf(l,m){ if(!l.H) return Tinv(l,m); const I=invH(l.H); return I?applyH(I,m):Tinv(l,m); }

/* ---------- solvers ---------- */
function solveLin(A,b){
  const n=b.length, M=A.map((r,i)=>r.concat([b[i]]));
  for(let c=0;c<n;c++){
    let p=c; for(let r=c+1;r<n;r++) if(Math.abs(M[r][c])>Math.abs(M[p][c])) p=r;
    if(Math.abs(M[p][c])<1e-12) return null;
    [M[c],M[p]]=[M[p],M[c]];
    for(let r=0;r<n;r++){ if(r===c)continue; const f=M[r][c]/M[c][c];
      for(let k=c;k<=n;k++) M[r][k]-=f*M[c][k]; }
  }
  return M.map((r,i)=>r[n]/r[i]);
}
function normal(rows,rhs,n){
  const A=Array.from({length:n},()=>new Array(n).fill(0)), b=new Array(n).fill(0);
  rows.forEach((r,i)=>{ for(let a=0;a<n;a++){ b[a]+=r[a]*rhs[i];
    for(let c=0;c<n;c++) A[a][c]+=r[a]*r[c]; }});
  return solveLin(A,b);
}
function fitTransform(src,dst,opt){
  opt=opt||{};
  const n=src.length; if(n<2) return null;
  if(n===2){
    const rows=[],rhs=[];
    if(opt.mirror){ /* x = a u + b v + tx ; y = b u - a v + ty  (reflection) */
      src.forEach((p,i)=>{ rows.push([p.x, p.y,1,0]); rhs.push(dst[i].x);
                           rows.push([-p.y,p.x,0,1]); rhs.push(dst[i].y); });
      const s=normal(rows,rhs,4); if(!s)return null;
      return {H:[s[0],s[1],s[2],s[1],-s[0],s[3],0,0], model:L('подобие (зерк.)','similarity (mirr.)')};
    }
    src.forEach((p,i)=>{ rows.push([p.x,-p.y,1,0]); rhs.push(dst[i].x);
                         rows.push([p.y, p.x,0,1]); rhs.push(dst[i].y); });
    const s=normal(rows,rhs,4); if(!s)return null;
    return {H:[s[0],-s[1],s[2],s[1],s[0],s[3],0,0], model:L('подобие','similarity')};
  }
  if(n===3 || opt.model!=='persp'){
    const rows=[],rhs=[];
    src.forEach((p,i)=>{ rows.push([p.x,p.y,1,0,0,0]); rhs.push(dst[i].x);
                         rows.push([0,0,0,p.x,p.y,1]); rhs.push(dst[i].y); });
    const s=normal(rows,rhs,6); if(!s)return null;
    return {H:[s[0],s[1],s[2],s[3],s[4],s[5],0,0], model:L('аффинная','affine')};
  }
  const nrm=pts=>{ const c={x:0,y:0}; pts.forEach(p=>{c.x+=p.x/pts.length;c.y+=p.y/pts.length});
    let d=0; pts.forEach(p=>d+=Math.hypot(p.x-c.x,p.y-c.y)/pts.length); d=d||1;
    const s=Math.SQRT2/d; return {s,c,pts:pts.map(p=>({x:(p.x-c.x)*s,y:(p.y-c.y)*s}))}; };
  const S=nrm(src), D=nrm(dst), rows=[], rhs=[];
  S.pts.forEach((p,i)=>{ const q=D.pts[i];
    rows.push([p.x,p.y,1,0,0,0,-p.x*q.x,-p.y*q.x]); rhs.push(q.x);
    rows.push([0,0,0,p.x,p.y,1,-p.x*q.y,-p.y*q.y]); rhs.push(q.y); });
  const h=normal(rows,rhs,8); if(!h)return null;
  const Hn=[[h[0],h[1],h[2]],[h[3],h[4],h[5]],[h[6],h[7],1]];
  const Ts=[[S.s,0,-S.s*S.c.x],[0,S.s,-S.s*S.c.y],[0,0,1]];
  const Ti=[[1/D.s,0,D.c.x],[0,1/D.s,D.c.y],[0,0,1]];
  const mul=(X,Y)=>X.map(r=>Y[0].map((_,j)=>r.reduce((s,v,k)=>s+v*Y[k][j],0)));
  const M=mul(Ti,mul(Hn,Ts)), k=M[2][2];
  return {H:[M[0][0]/k,M[0][1]/k,M[0][2]/k,M[1][0]/k,M[1][1]/k,M[1][2]/k,M[2][0]/k,M[2][1]/k], model:L('перспектива','perspective')};
}
