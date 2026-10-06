/* Syntax check of the app scripts in the order index.html loads them: each file alone and all together.
 * Run: node tests/check.js   (npm run check) */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);
let fail = 0;
const src = files.map(f => { const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  try { new Function(s); } catch (e) { console.log('FAIL ' + f + ': ' + e.message); fail++; } return s; });
try { new Function(src.join('\n')); } catch (e) { console.log('FAIL all together: ' + e.message); fail++; }
console.log((fail ? 'FAIL ' : 'OK   ') + files.length + ' scripts: ' + files.join(' '));
process.exit(fail ? 1 : 0);
