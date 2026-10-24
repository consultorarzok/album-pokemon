/* Puente del link viejo (github.io) al sitio nuevo (entrenadoresrz.com), con el servidor LOCAL.
   Las dos direcciones se simulan sirviendo los archivos locales (no toca nada real). */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const LOCAL = process.env.SERVIDOR || 'http://localhost:8787';
const SERVIDOR = 'https://api-prueba.test';   // el navegador le habla a esta dirección y la prueba la pasa al servidor local
let ok = 0, fail = 0;
const check = (n, c, x) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const suf = Math.random().toString(36).slice(2, 6);
const TIPOS = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml'};
async function proxy(route){
  const req = route.request();
  const u = new URL(req.url());
  if(req.method() === 'OPTIONS') return route.fulfill({status: 204, headers: {'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS'}});
  const r = await fetch(LOCAL + u.pathname + u.search, {method: req.method(), headers: {'content-type': 'text/plain'}, body: req.method() === 'POST' ? req.postData() : undefined});
  route.fulfill({status: r.status, headers: {'content-type': 'application/json', 'access-control-allow-origin': '*'}, body: await r.text()});
}
function servirLocal(route, base){
  const u = new URL(route.request().url());
  let rel = u.pathname.replace(base, '') || 'index.html';
  if(rel.endsWith('/')) rel += 'index.html';
  const f = path.join(__dirname, rel);
  if(!fs.existsSync(f)) return route.fulfill({status: 404, body: 'no'});
  route.fulfill({status: 200, contentType: TIPOS[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f)});
}

(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({viewport: {width: 390, height: 844}});
  await ctx.route(/n8n\.consultorarz\.com/, r => r.abort());
  await ctx.route(/^https:\/\/api-prueba\.test\//, proxy);
  await ctx.route(/^https:\/\/consultorarzok\.github\.io\/album-pokemon\//, r => servirLocal(r, '/album-pokemon/'));
  await ctx.route(/^https:\/\/(www\.)?entrenadoresrz\.com\//, r => servirLocal(r, '/'));
  const nombre = 'Puente ' + suf;
  await ctx.addInitScript(([srv, nombre, suf]) => {
    localStorage.setItem('album-servidor', srv);
    if(location.hostname.endsWith('github.io') && !localStorage.getItem('sembrado')){
      localStorage.setItem('sembrado', '1');
      localStorage.setItem('album-kanto-jugador', nombre);
      localStorage.setItem('album-kanto-dispositivo', 'dpuente' + suf);
      const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got: false, dup: 0};
      [1, 2, 3, 4, 5, 6, 7].forEach(i => st[i] = {got: true, dup: 0});
      localStorage.setItem('album-kanto-progreso', JSON.stringify({coins: 4321, state: st, bolas: {roja: 9, azul: 0, ultra: 0, maestra: 0}}));
      localStorage.setItem('album-kanto-pin-ofrecido', '1');
    }
  }, [SERVIDOR, nombre, suf]);
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(p.url() + ' ' + e.message));

  console.log('1) Chico que ya jugaba abre el link viejo');
  await p.goto('https://consultorarzok.github.io/album-pokemon/');
  const llego = await p.waitForURL(/entrenadoresrz\.com/, {timeout: 15000}).then(() => true, () => false);
  check('lo pasa solo a entrenadoresrz.com', llego, p.url());
  check('el link nuevo no deja la sesión a la vista', !/pase=/.test(p.url()) || await p.waitForFunction(() => !/pase=/.test(location.href), null, {timeout: 5000}).then(() => true, () => false));
  await p.click('#portadaEntrar', {force: true}).catch(() => {});
  /* 4321 monedas y 7 figuritas suyas (+ los regalos "para todos" que no había cobrado) */
  check('en el sitio nuevo ve SU álbum', await p.waitForFunction(() => typeof servidorListo !== 'undefined' && servidorListo && coins >= 4321 && [1,2,3,4,5,6,7].every(i => state[i].got), null, {timeout: 10000}).then(() => true, () => false),
    await p.evaluate(() => [typeof coins !== 'undefined' && coins, typeof figuritasObtenidas === 'function' && figuritasObtenidas(), jugador]));
  await p.waitForTimeout(1500);
  const base = await p.evaluate(() => coins);
  check('con su nombre', (await p.textContent('#playerName')).trim() === nombre);
  check('no le pide nombre de nuevo', !(await p.evaluate(() => document.getElementById('nameOverlay').classList.contains('show'))));

  console.log('2) Juega en el sitio nuevo y recarga');
  for(const s of ['#specialContinueBtn', '#battleCloseBtn', '#closeBtn', '#pinNoBtn']) if(await p.isVisible(s)) await p.click(s);
  await p.evaluate(() => openPack());
  check('abre un sobre', await p.waitForFunction(b => coins === b - 150, base, {timeout: 8000}).then(() => true, () => false));
  await p.reload(); await p.click('#portadaEntrar', {force: true}).catch(() => {});
  check('al recargar sigue con su sesión y su álbum', await p.waitForFunction(b => servidorListo && coins === b - 150, base, {timeout: 10000}).then(() => true, () => false));

  console.log('3) Vuelve a abrir el link viejo: lo vuelve a mandar al nuevo, sin perder nada');
  await p.goto('https://consultorarzok.github.io/album-pokemon/');
  await p.waitForURL(/entrenadoresrz\.com/, {timeout: 15000}).catch(() => {});
  await p.click('#portadaEntrar', {force: true}).catch(() => {});
  check('sigue igual, sin perder nada', await p.waitForFunction(b => typeof servidorListo !== 'undefined' && servidorListo && coins === b - 150, base, {timeout: 10000}).then(() => true, () => false));

  console.log('4) Chico nuevo que abre el link viejo');
  const ctx2 = await br.newContext({viewport: {width: 390, height: 844}});
  await ctx2.route(/n8n\.consultorarz\.com/, r => r.abort());
  await ctx2.route(/^https:\/\/api-prueba\.test\//, proxy);
  await ctx2.route(/^https:\/\/consultorarzok\.github\.io\/album-pokemon\//, r => servirLocal(r, '/album-pokemon/'));
  await ctx2.route(/^https:\/\/(www\.)?entrenadoresrz\.com\//, r => servirLocal(r, '/'));
  await ctx2.addInitScript(srv => localStorage.setItem('album-servidor', srv), SERVIDOR);
  const q = await ctx2.newPage();
  await q.goto('https://consultorarzok.github.io/album-pokemon/');
  check('lo manda al sitio nuevo', await q.waitForURL(/entrenadoresrz\.com/, {timeout: 15000}).then(() => true, () => false));
  await q.click('#portadaEntrar', {force: true}).catch(() => {});
  check('ahí le pide el nombre, con el aviso para los que ya jugaban', await q.waitForFunction(() => document.getElementById('nameOverlay').classList.contains('show') && !document.getElementById('nameViejo').hidden, null, {timeout: 8000}).then(() => true, () => false));

  check('sin errores de JavaScript', errores.length === 0, errores);
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`);
  process.exit(fail ? 1 : 0);
})();
