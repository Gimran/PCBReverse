// README screenshots (docs/overview*.jpg, docs/nets*.jpg, EN + RU) via headless Chrome + raw CDP, no Playwright.
// Run from the project root with `python -m http.server 8765` running:  node tests/shots.mjs docs
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.argv[2];
const URL = 'http://127.0.0.1:8765/index.html';
const W = 1680, H = 1000, PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const prof = mkdtempSync(join(tmpdir(), 'pcbr-shots-'));
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`,
  `--window-size=${W},${H}`, '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });

let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); break; } catch { await sleep(200); } }
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const wait = new Map();
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } });
const cdp = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async expr => { const r = await cdp('Runtime.evaluate', { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true });
  if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
const nav = async () => { await cdp('Page.navigate', { url: URL }); await sleep(2500); };
const shot = async file => { const r = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
  writeFileSync(join(OUT, file), Buffer.from(r.result.data, 'base64')); console.log('saved', file); };

await cdp('Page.enable'); await cdp('Runtime.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
await nav();

const LOAD = `await loadProject(new File([await (await fetch('tests/test_project.pcbr')).blob()],'test_project.pcbr'));
  await new Promise(r=>setTimeout(r,2500));`;
const CENTER = `const cx=(pts)=>{ const c=pts.reduce((a,p)=>({x:a.x+p.x/pts.length,y:a.y+p.y/pts.length}),{x:0,y:0});
    const s=screenOf(c); view.x-=s.x-vp.clientWidth/2; view.y-=s.y-vp.clientHeight/2; applyView(); };`;
const OVERVIEW = `${LOAD}
  document.querySelector('[data-ltab="view"]').click(); document.querySelector('[data-tab="view"]').click();
  xray=false; clickMode='none'; if(boardSide!=='top') flipBoard();
  const t=layers.find(l=>l.name==='top'); if(t){ sel=t.id; }
  activeNet=null; hlNet=null; selComp=null; viewMode='all'; showComps=true; showSide.top=true; showSide.bot=false;
  ${CENTER}
  view.rot=0; view.z=.74; applyView(); cx([{x:0,y:0},{x:t.w,y:t.h}].map(p=>worldOf(t,p)));
  applyAll(); renderCards(); renderNets(); renderComps(); sync(); drawMarks(); await new Promise(r=>setTimeout(r,800)); return 1;`;
const NETS = `${LOAD}
  document.querySelector('[data-ltab="comp"]').click(); document.querySelector('[data-tab="nets"]').click();
  xray=false; if(boardSide!=='bot') flipBoard();
  const b=layers.find(l=>l.name==='bot'); if(b) sel=b.id;
  const g=nets.find(n=>n.name==='GND'); if(g){ activeNet=g.id; hlNet=g.id; }
  selComp=null; compKind='C'; compSize='0402'; compSide='bot'; viewMode='all'; showComps=true; showSide.top=false; showSide.bot=true;
  ${CENTER}
  const bc=comps.filter(c=>c.side==='bot'); view.z=1.62; applyView(); cx(bc.length?bc:[{x:0,y:0}]);
  clickMode='net'; showNets=true;
  applyAll(); renderCards(); renderNets(); renderComps(); sync(); drawMarks(); await new Promise(r=>setTimeout(r,800)); return 1;`;

for (const [lang, sfx] of [['en', '_en'], ['ru', '']]) {
  await js(`localStorage.clear(); localStorage.setItem('pcbr-lang','${lang}'); return 1;`);
  await nav(); await js(OVERVIEW); await shot(`overview${sfx}.jpg`);
  await nav(); await js(NETS); await shot(`nets${sfx}.jpg`);
}
ws.close(); ch.kill();
