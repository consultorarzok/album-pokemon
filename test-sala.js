/* Duelo en vivo entre DOS navegadores contra el servidor local (wrangler dev en :8787).
   A crea la sala, B se une con el código, pelean y el servidor paga. Correr con npm run dev andando. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8787';
let ok = 0, fail = 0;
const check = (n, c, x) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const suf = Math.random().toString(36).slice(2, 6);
const espera = (p, fn, arg, ms = 10000) => p.waitForFunction(fn, arg, {timeout: ms}).then(() => true, () => false);

async function chico(br, nombre, ids, regalos){
  const ctx = await br.newContext({viewport: {width: 390, height: 844}});
  await ctx.route(/n8n\.consultorarz\.com/, r => r.abort());
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  await p.addInitScript(([srv, nombre, ids, regalos]) => {
    if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1');
    localStorage.clear();
    localStorage.setItem('album-servidor', srv);
    localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador', nombre);
    localStorage.setItem('album-kanto-dispositivo', 'd' + nombre.replace(/\W/g, ''));
    localStorage.setItem('album-kanto-regalos', JSON.stringify(regalos));
    localStorage.setItem('album-kanto-pin-ofrecido', '1');
    const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got: false, dup: 0};
    ids.forEach(i => st[i] = {got: true, dup: 0});
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins: 0, state: st, bolas: {roja: 0, azul: 0, ultra: 0, maestra: 0}}));
    window.__arenaMudo = true;
  }, [SERVIDOR, nombre, ids, regalos]);
  await p.goto('file:///root/pokemon/index.html');
  await p.click('#portadaEntrar', {force: true}).catch(() => {});
  await espera(p, () => servidorListo);
  return {ctx, p, errores, nombre};
}
async function abrirDuelo(x){
  await x.p.evaluate(() => abrirArena());
  await x.p.waitForSelector('#arPickDuelo');
  await x.p.click('#arPickDuelo');
  await x.p.waitForSelector('#arDCrear');
}

(async () => {
  const br = await chromium.launch();
  const regalos = await (async () => { const c = await br.newContext(); const q = await c.newPage(); await q.goto('file:///root/pokemon/index.html'); const r = await q.evaluate(() => REGALOS.map(r => r.id)); await c.close(); return r; })();
  const A = await chico(br, 'Anfi ' + suf, [1, 4, 7, 25], regalos);
  const B = await chico(br, 'Beto ' + suf, [133, 143, 147, 152], regalos);
  const C = await chico(br, 'Cami ' + suf, [16, 19, 21, 39], regalos);
  const SHOTS = process.env.SHOTS || '';
  await abrirDuelo(A); await A.p.click('#arDCrear');
  check('el anfitrión ve la sala con él solo y 👑', await espera(A.p, () => document.querySelectorAll('.ar-lobby-lista li').length === 1 && /👑/.test(document.querySelector('.ar-lobby-lista').textContent)));
  check('Empezar apagado con 1', await A.p.evaluate(() => document.getElementById('arLEmpezar').disabled));
  const cod = (await A.p.textContent('.ar-lobby-cod b')).trim();
  for(const X of [B, C]){ await abrirDuelo(X); await X.p.fill('#arDCodigo', cod); await X.p.click('#arDUnir'); }
  check('con 3 en la sala todos los ven', await espera(A.p, () => document.querySelectorAll('.ar-lobby-lista li').length === 3) && await espera(C.p, () => document.querySelectorAll('.ar-lobby-lista li').length === 3));
  check('con 3 el modo es todos contra todos y Empezar se prende', await A.p.evaluate(() => !document.getElementById('arLEmpezar').disabled && /Todos contra todos/.test(document.querySelector('.ar-lobby-modo').textContent)));
  check('sólo el anfitrión ve Expulsar (2 botones)', (await A.p.$$('.ar-lobby-x')).length === 2 && (await C.p.$$('.ar-lobby-x')).length === 0);
  if(SHOTS) await A.p.screenshot({path: SHOTS + '/sala-3.png'});
  await A.p.click('.ar-lobby-x[aria-label*="Cami"]');
  check('Cami es expulsada y lo ve', await espera(C.p, () => /te sacó/.test((document.getElementById('arDEstado') || {}).textContent || '')));
  check('Cami vuelve a ver Crear/Unirme', await C.p.evaluate(() => !document.querySelector('.ar-duelo-ops').hidden));
  check('Cami no puede volver a entrar a esa sala', await (async () => { await C.p.fill('#arDCodigo', cod); await C.p.click('#arDUnir'); return espera(C.p, () => /te sacó/.test(document.getElementById('arDEstado').textContent)); })());
  check('quedan 2 y Empezar se prende', await espera(A.p, () => document.querySelectorAll('.ar-lobby-lista li').length === 2 && !document.getElementById('arLEmpezar').disabled));
  if(SHOTS) await A.p.screenshot({path: SHOTS + '/sala-2.png'});
  await A.p.click('#arLEmpezar');
  check('arranca el 1 vs 1 entre los dos', await espera(A.p, () => window.__arena && window.__arena.estado() && window.__arena.estado().fase === 'lucha', null, 15000) && await espera(B.p, () => window.__arena && window.__arena.estado() && window.__arena.estado().fase === 'lucha', null, 15000));
  check('sin errores de JavaScript', !A.errores.length && !B.errores.length && !C.errores.length, [A.errores, B.errores, C.errores]);
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`); process.exit(fail ? 1 : 0);
})();
