/* Regression: side chains share vias, never ordinary points from the other side. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(pathToFileURL(path.join(ROOT, 'index.html')).href + '?nodemo');
    await p.setInputFiles('#fileProj', path.join(__dirname, 'eeprom version.pcbr'));
    await p.waitForFunction(() => /Project loaded|Проект загружен/.test($('saveStatus').textContent) && nets.length > 0);
    const result = await p.evaluate(() => {
      const check = P => {
        const C = netChain(P);
        if (C.length !== P.length || new Set(C).size !== P.length) throw Error('Lost/repeated point');
        const degree = new Map(C.map(o => [o, 0]));
        C.slice(1).forEach((o, i) => { degree.set(o, degree.get(o) + 1); degree.set(C[i], degree.get(C[i]) + 1); });
        if ([...degree.values()].some(d => d > 2)) throw Error('Branch');
        return C;
      };
      [[], [{w:{x:0,y:0}}], [{w:{x:0,y:0}}, {w:{x:0,y:0}}]].forEach(check);
      const node=(id,x,y,side,via=false)=>({pt:{id,side,via},w:{x,y}});
      const top=node('top',0,0,'top'), top2=node('top2',100,0,'top');
      const bot=node('bot',50,10,'bot'), via=node('via',50,0,'top',true);
      const mixed=[top,top2,bot,via];
      const E=netChainEdges(mixed);
      if(E.length!==3 || E.filter(e=>e.includes(via)).length!==3) throw Error('Via is not the side junction');
      if(netChainEdges([top,top2,bot]).length!==1) throw Error('Sides connected without a via');
      const via2=node('via2',75,0,'bot',true);
      if(netChainEdges([via,via2]).length!==1) throw Error('Duplicate via edge');
      const old=node('legacy',25,0,'any');
      if(netChainEdges([top,bot,old]).length) throw Error('Legacy point bridges sides');
      // Screenshot-like layout: a tight left cluster, a centre point and two distant endpoints.
      // Keep this in the isolated browser only; never write the fixture back to the project.
      const host = layers.find(l => l.kind !== 'video'), fixture = {id:'chain-test',name:'CHAIN',color:'#ffcc00',on:true};
      nets.push(fixture);
      [[57,117],[73,133],[156,133],[191,100],[541,96],[766,117],[965,323]].forEach(([x,y],i) =>
        points.push({id:'chain-'+i,net:fixture.id,layer:host.id,side:boardSide,p:imgOf(host,{x,y})}));
      let tested = 0;
      for (const n of nets) {
        const P = points.filter(pt => pt.net === n.id && byId(pt.layer)).map(pt => ({pt,w:worldOf(byId(pt.layer),pt.p)}));
        check(P); if (P.length < 2) continue;
        n.on = true; hlNet = n.id; showNets = true; selPoint = P[0].pt.id; drawMarks();
        const edges = () => [...marks.querySelectorAll('[data-net-chain]')].map(l => ['x1','y1','x2','y2'].map(a => l.getAttribute(a)).join(','));
        const before = edges();
        const expected=netChainEdges(P);
        if (before.length !== expected.length) throw Error('Wrong edge count');
        for(const [a,b] of expected){
          const side=o=>o.pt.side||byId(o.pt.layer).side;
          if(!a.pt.via&&!b.pt.via&&side(a)!==side(b)) throw Error('Cross-side ordinary edge');
        }
        selPoint = P[P.length-1].pt.id; drawMarks();
        if (JSON.stringify(before) !== JSON.stringify(edges())) throw Error('Selection changed the chain');
        tested++;
      }
      return tested;
    });
    assert.ok(result > 0); assert.deepEqual(errors, []);
    console.log('OK NET chains: ' + result + ' multi-point NETs; separate sides, via junctions, no duplicate edges, stable selection; empty/single/coincident points');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
