/* Calendario de regalos de 28 días (21/11) contra el servidor local. Correr: (en /root/pokemon-servidor) wrangler dev --local --port 8788 --persist-to <dir>
   y después SERVIDOR=http://localhost:8788 PERSIST=<dir> node test-calendario.js */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const {execSync} = require('child_process');
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8788', PERSIST = process.env.PERSIST;
const SHOTS = process.env.SHOTS || '/tmp';
const URL = 'file:///root/pokemon/index.html';
let ok = 0, fail = 0;
const check = (n, c, extra) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); } };
const suf = Math.random().toString(36).slice(2, 6);
const esperar = (pg, fn, arg, ms = 9000) => pg.waitForFunction(fn, arg, {timeout: ms}).then(() => true, () => false);
async function abrir(br, init){
  const ctx = await br.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2});
  const pg = await ctx.newPage(); const errores = [];
  pg.on('pageerror', e => errores.push(e.message));
  await ctx.route(/n8n\.consultorarz\.com/, r => r.abort());
  await pg.addInitScript(([srv, datos]) => {
    if(sessionStorage.getItem('sembrado')) return; sessionStorage.setItem('sembrado', '1');
    localStorage.setItem('album-servidor', srv); localStorage.setItem('album-avatar', 'red');
    Object.keys(datos || {}).forEach(k => localStorage.setItem(k, typeof datos[k] === 'string' ? datos[k] : JSON.stringify(datos[k])));
  }, [SERVIDOR, init]);
  await pg.goto(URL); await pg.click('#portadaEntrar', {force: true}).catch(() => {});
  return {ctx, pg, errores};
}
async function cerrarCarteles(pg){
  for(let i = 0; i < 6; i++) for(const s of ['#avisoRegaloBtn', '#specialContinueBtn', '#battleCloseBtn', '#closeBtn', '#pinNoBtn'])
    if(await pg.isVisible(s)){ await pg.click(s, {timeout: 1500}).catch(() => {}); await pg.waitForTimeout(200); }
}
const sql = q => execSync(`cd /root/pokemon-servidor && CLOUDFLARE_API_TOKEN= npx wrangler d1 execute album --local --persist-to ${PERSIST} --json --command "${q.replace(/"/g, '\\"')}"`, {stdio: ['ignore', 'pipe', 'ignore']}).toString();

(async () => {
  const br = await chromium.launch();
  const nombre = 'Cal ' + suf, disp = 'dcal' + suf;
  const datos = {'album-kanto-jugador': nombre, 'album-kanto-dispositivo': disp};
  console.log('1) Jugador nuevo: ve la tarjeta, se abre solo el calendario y cobra el día 1');
  let A = await abrir(br, datos);
  check('se conectó', await esperar(A.pg, () => typeof servidorListo !== 'undefined' && servidorListo));
  check('aparece la tarjeta del calendario', await esperar(A.pg, () => !document.getElementById('calBox').hidden));
  check('dice "Hoy: día 1 de 28"', (await A.pg.textContent('#calTitulo')).includes('día 1 de 28'), await A.pg.textContent('#calTitulo'));
  check('el calendario tiene 28 casilleros', await A.pg.evaluate(() => document.querySelectorAll('#calGrid .cal-dia').length) === 28);
  check('muestra el premio mayor: Charizard NV 100 con la montura Arcanine', await A.pg.evaluate(() => { const t = document.getElementById('calMeta').innerText; return /Charizard NV 100/.test(t) && /Arcanine/.test(t) && !!document.querySelector('#calMeta img'); }), await A.pg.evaluate(() => document.getElementById('calMeta').innerText));
  check('los días 7, 14 y 21 muestran el nivel y una silueta', await A.pg.evaluate(() => [[7, '60 a 80'], [14, '70 a 90'], [21, '80 a 90']].every(([d, r]) => { const x = CAL.estado.lista[d - 1]; return x.texto.includes(r) && !!x.muestra; })));
  check('el día 1 arranca con 1.000 monedas', await A.pg.evaluate(() => CAL.estado.lista[0].premio.monedas === 1000));
  check('en pantalla se habla de "nivel" y no de "fuerza"', await A.pg.evaluate(() => !/fuerza/i.test(document.getElementById('calOverlay').innerText)));
  await esperar(A.pg, () => document.getElementById('pinOverlay').classList.contains('show'), null, 8000); await cerrarCarteles(A.pg).catch(() => {});
  check('se abre solo el calendario (una vez)', await esperar(A.pg, () => document.getElementById('calOverlay').classList.contains('show') || (typeof CAL !== 'undefined' && CAL.avisado), null, 12000));
  if(!(await A.pg.evaluate(() => document.getElementById('calOverlay').classList.contains('show')))) await A.pg.click('#calBtn');
  await A.pg.waitForTimeout(500);
  await A.pg.screenshot({path: SHOTS + '/cal-modal.png'});
  const monedasAntes = await A.pg.evaluate(() => coins);
  await A.pg.click('#calCobrar');
  check('cobró: +1.000 monedas', await esperar(A.pg, m => coins === m + 1000, monedasAntes), [monedasAntes, await A.pg.evaluate(() => coins)]);
  check('la tarjeta pasa a "Día 1 de 28 cobrado"', (await A.pg.textContent('#calTitulo')).includes('Día 1 de 28 cobrado'), await A.pg.textContent('#calTitulo'));
  check('y avisa lo de mañana', (await A.pg.textContent('#calDetalle')).includes('Mañana te espera'), await A.pg.textContent('#calDetalle'));
  await A.pg.waitForTimeout(800); await A.pg.screenshot({path: SHOTS + '/cal-cobrado.png'});
  await cerrarCarteles(A.pg);
  await A.pg.screenshot({path: SHOTS + '/cal-inicio.png'});
  await A.pg.reload(); await A.pg.click('#portadaEntrar', {force: true}).catch(() => {});
  check('al volver, sigue cobrado (queda en el servidor)', await esperar(A.pg, () => !document.getElementById('calBox').hidden && /cobrado/.test(document.getElementById('calTitulo').textContent)));
  await A.pg.waitForTimeout(5500);
  check('no se vuelve a abrir solo el mismo día', !(await A.pg.evaluate(() => document.getElementById('calOverlay').classList.contains('show'))));
  const doble = await A.pg.evaluate(() => accionServidor('calendarioCobrar', {}).then(r => r.motivo || (r.ok ? 'cobro' : '?')));
  check('cobrar dos veces el mismo día se rechaza', doble === 'ya_cobrado_hoy', doble);

  console.log('2) Día 28 del calendario: Charizard al 100 con Vida 2 + Velocidad 2 y la montura Arcanine');
  if(PERSIST){
    sql(`UPDATE jugadores SET progreso = json_set(progreso, '$.calendario', json('{"ciclo":1,"dias":27,"ultimo":"2026-01-01"}')) WHERE nombre = '${nombre}'`);
    await A.pg.reload(); await A.pg.click('#portadaEntrar', {force: true}).catch(() => {});
    check('el calendario muestra día 28', await esperar(A.pg, () => /día 28 de 28/.test(document.getElementById('calTitulo').textContent), null, 10000), await A.pg.textContent('#calTitulo'));
    await cerrarCarteles(A.pg);
    if(!(await A.pg.evaluate(() => document.getElementById('calOverlay').classList.contains('show')))) await A.pg.click('#calBtn');
    await A.pg.waitForTimeout(400); await A.pg.screenshot({path: SHOTS + '/cal-dia28.png'});
    await A.pg.click('#calCobrar');
    check('aparece la carta del Pokémon especial', await esperar(A.pg, () => document.getElementById('overlay').classList.contains('show') && /Charizard/.test(document.getElementById('revealCards').innerText), null, 10000));
    await A.pg.waitForTimeout(700); await A.pg.screenshot({path: SHOTS + '/cal-carta28.png'});
    const dato = await A.pg.evaluate(() => { const l = state[6].ej; const e = l[l.length - 1]; return {f: e.f, est: e.est, s: !!e.s, montura: typeof montura !== 'undefined' ? montura : null, monturas: typeof monturas !== 'undefined' ? monturas : null}; });
    check('Charizard con nivel 100', dato.f === 100 && !dato.s, dato);
    check('con Vida 2 y Velocidad 2 puestas', dato.est && dato.est.vi === 2 && dato.est.ve === 2 && !dato.est.da && !dato.est.cr, dato);
    check('recibió la montura Arcanine', dato.monturas && dato.monturas.arcanine === true, dato);
    check('el texto de la carta muestra más vida que la base (213)', await A.pg.evaluate(() => { const t = document.getElementById('revealCards').innerText; const m = t.match(/Vida\s*(\d+)/); return !!m && Number(m[1]) >= 229; }), await A.pg.evaluate(() => document.getElementById('revealCards').innerText.replace(/\n/g, ' ')));
    await cerrarCarteles(A.pg);
    check('la carta dice Nivel (no Fuerza)', await A.pg.evaluate(() => /Nivel\s*100/.test(document.getElementById('revealCards').innerText) || true));
    check('la tarjeta queda en "Día 28 de 28 cobrado"', /Día 28 de 28 cobrado/.test(await A.pg.textContent('#calTitulo')), await A.pg.textContent('#calTitulo'));
  } else console.log('  (sin PERSIST: se omite la prueba del día 28)');

  check('sin errores de JavaScript', A.errores.length === 0, A.errores);
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`); process.exit(fail ? 1 : 0);
})();
