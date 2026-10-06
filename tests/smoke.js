/*
 * Smoke test for index.html (PCB reverse overlay).
 * Run:   npm i -D playwright  (once)   then   node tests/smoke.js [project.pcbr | state.json]
 * Loads the page from disk, opens the reference project (default tests/test_project.pcbr)
 * through «Загрузить проект», and checks the invariants that broke during development.
 */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const URL = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const STATE = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, 'test_project.pcbr');
const PCBR = /\.pcbr$/i.test(STATE);

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fail = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fail++; };

  // 0. first start (empty profile): the demo project from the repo opens by itself
  await p.goto(URL);
  ok(await p.waitForFunction(() => layers.length > 2 && layers.every(l => l.ok || !(l.src || l.stored)) &&
      /демо|Demo/.test($('saveStatus').textContent), null, { timeout: 20000 }).then(() => true, () => false), 'demo project opens on first start');
  await p.evaluate(() => localStorage.clear());
  await p.goto(URL + '?nodemo'); await p.waitForTimeout(600);
  if (PCBR) {
    await p.setInputFiles('#fileProj', STATE); await p.waitForTimeout(2000);
    ok(await p.evaluate(() => /Проект загружен|Project loaded/.test($('saveStatus').textContent)), 'project loads: ' + path.basename(STATE));
  } else if (fs.existsSync(STATE)) {
    const s = JSON.parse(fs.readFileSync(STATE, 'utf8'));
    // images picked via dialog live in the browser only - point them at the disk copies
    s.layers.forEach(l => { if (l.src) { l.src = 'pcb_overlay_img/' + l.src.split(/[\\/]/).pop(); l.stored = false; } });
    await p.evaluate(x => { localStorage.setItem('pcb-overlay-v4', x); }, JSON.stringify(s));
    await p.reload(); await p.waitForTimeout(2000);
  }

  const L = await p.evaluate(() => layers.map(l => ({ id: l.id, src: l.src, stored: l.stored, ok: l.ok })));
  ok(L.filter(l => l.src || l.stored).every(l => l.ok), 'all layer images load: ' + L.map(l => l.id + (l.ok ? '+' : '-')).join(' '));

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

  // 5. «Сохранить проект» writes a .pcbr whose project.json matches the live state, with every image
  if (PCBR) {
    await p.evaluate(() => { window.showSaveFilePicker = undefined; });
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#projSave')]);
    const buf = fs.readFileSync(await dl.path());
    const r = await p.evaluate(async a => {
      const ent = await unzip(new Uint8Array(a).buffer), s = JSON.parse(new TextDecoder().decode(ent['project.json']));
      const strip = o => JSON.stringify({ ...o, layers: o.layers.map(({ stored, file, ...rest }) => rest) });
      return { eq: strip(s) === strip(snapshot()), files: s.layers.filter(l => l.file && ent[l.file]).length,
               n: layers.filter(l => l.src || l.stored).length };
    }, [...buf]);
    ok(r.eq && r.files === r.n, 'save project round trip: json equal=' + r.eq + ', images ' + r.files + '/' + r.n);
  }

  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
