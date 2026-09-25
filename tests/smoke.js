/*
 * Smoke test for index.html (PCB reverse overlay).
 * Run:   npm i -D playwright  (once)   then   node tests/smoke.js [state.json]
 * Loads the page from disk, optionally seeds localStorage with a saved state,
 * and checks the invariants that broke during development.
 */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const URL = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const STATE = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'pcb_overlay_state.json');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fail = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fail++; };

  await p.goto(URL); await p.waitForTimeout(600);
  if (fs.existsSync(STATE)) {
    const s = JSON.parse(fs.readFileSync(STATE, 'utf8'));
    // images picked via dialog live in the browser only - point them at the disk copies
    s.layers.forEach(l => { if (l.src) { l.src = 'pcb_overlay_img/' + l.src.split(/[\\/]/).pop(); l.stored = false; } });
    await p.evaluate(x => { localStorage.clear(); localStorage.setItem('pcb-overlay-v4', x); }, JSON.stringify(s));
  } else await p.evaluate(() => localStorage.clear());
  await p.reload(); await p.waitForTimeout(2000);

  const L = await p.evaluate(() => layers.map(l => ({ id: l.id, src: l.src, ok: l.ok })));
  ok(L.filter(l => l.src).every(l => l.ok), 'all layer images load: ' + L.map(l => l.id + (l.ok ? '+' : '-')).join(' '));

  // 1. click -> world -> screen round trip under every view rotation / flip
  const rt = await p.evaluate(() => {
    let worst = 0; const r = vp.getBoundingClientRect(), save = { ...view };
    for (const rot of [0, 90, 180, 270]) for (const fh of [0, 1]) for (const fv of [0, 1]) {
      Object.assign(view, { rot, fh: !!fh, fv: !!fv }); applyView();
      const m = worldFromEvent({ clientX: r.left + 400, clientY: r.top + 300 }), s = screenOf(m);
      worst = Math.max(worst, Math.hypot(s.x - 400, s.y - 300));
    }
    Object.assign(view, save); applyView(); return worst;
  });
  ok(rt < 1e-6, 'screen<->world round trip under rotate/flip (max err ' + rt.toExponential(1) + ')');

  // 2. two-point fit keeps the handedness of a mirrored layer (bug: similarity flipped it)
  const hand = await p.evaluate(() => {
    const l = layers[layers.length - 1], ref = layers[0], keep = { H: l.H, pairs: l.pairs, fv: l.fv, sel };
    sel = l.id; l.H = null; l.fv = true;
    const pts = [{ x: 200, y: 300 }, { x: 900, y: 1500 }, { x: 600, y: 900 }], w = pts.map(q => T(l, q)), off = { x: 25, y: -40 };
    l.pairs = [0, 1].map(i => ({ rl: ref.id, r: imgOf(ref, { x: w[i].x + off.x, y: w[i].y + off.y }), m: pts[i] }));
    recompute(false);
    const q = applyH(l.H, pts[2]), e = Math.hypot(q.x - w[2].x - off.x, q.y - w[2].y - off.y);
    Object.assign(l, { H: keep.H, pairs: keep.pairs, fv: keep.fv }); sel = keep.sel; applyLayer(l);
    return e;
  });
  ok(hand < 0.5, '2-point fit on mirrored layer: 3rd point error ' + hand.toFixed(2) + ' px');

  // 3. layer image never grabs the pointer / never native-drags
  const pe = await p.evaluate(() => layers.every(l => getComputedStyle(l.el).pointerEvents === 'none' && l.el.draggable === false));
  ok(pe, 'layer <img> has pointer-events:none and draggable=false');

  // 4. layer does not move on plain LMB drag outside move mode
  const moved = await p.evaluate(async () => { const s = sel_(); return { x: s.x, y: s.y }; });
  await p.mouse.move(700, 500); await p.mouse.down(); await p.mouse.move(760, 540, { steps: 4 }); await p.mouse.up();
  const after = await p.evaluate(() => { const s = sel_(); return { x: s.x, y: s.y }; });
  ok(moved.x === after.x && moved.y === after.y, 'plain LMB drag does not move the active layer');

  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
