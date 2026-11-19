/* Regression: a focused NET is a single path, never a star; changing selection preserves the path. */
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
        if (before.length !== P.length - 1) throw Error('Wrong edge count');
        selPoint = P[P.length-1].pt.id; drawMarks();
        if (JSON.stringify(before) !== JSON.stringify(edges())) throw Error('Selection changed the chain');
        tested++;
      }
      return tested;
    });
    assert.ok(result > 0); assert.deepEqual(errors, []);
    console.log('OK NET chains: ' + result + ' multi-point NETs; n−1 edges, no branches, stable selection; empty/single/coincident points');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
