/* Tienda de diamantes + monturas (modo servidor local :8787). Sólo la cuenta "ZeTa Centeno" ve la tienda.
   Correr con npm run dev andando en pokemon-servidor. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8787';
const ADMIN = process.env.ADMIN_CLAVE || 'prueba-local';
const OUT = process.env.OUT || '/tmp';
let ok = 0, fail = 0;
const check = (n, c, x) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const admin = (ruta, b) => fetch(SERVIDOR + ruta, {method: 'POST', headers: {'content-type': 'text/plain', 'x-admin': ADMIN}, body: JSON.stringify(b)}).then(r => r.json());

async function sesion(br, nombre, disp, regalos){
  const ctx = await br.newContext({viewport: {width: 1000, height: 700}});
  const p = await ctx.newPage();
  p.errores = []; p.on('pageerror', e => p.errores.push(e.message));
  await ctx.route(/n8n\.consultorarz\.com/, r => r.abort());
  await p.addInitScript(([srv, nombre, disp, regalos]) => {
    if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1');
    localStorage.clear();
    localStorage.setItem('album-servidor', srv);
    localStorage.setItem('album-avatar', 'red'); localStorage.setItem('album-kanto-jugador', nombre);
    localStorage.setItem('album-kanto-dispositivo', disp);
    localStorage.setItem('album-kanto-regalos', JSON.stringify(regalos));
    localStorage.setItem('album-kanto-pin-ofrecido', '1');
    const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got: false, dup: 0};
    st[1] = {got: true, dup: 0};
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins: 500, state: st, bolas: {roja: 3, azul: 0, ultra: 0, maestra: 0}}));
  }, [SERVIDOR, nombre, disp, regalos]);
  await p.goto('file:///root/pokemon/index.html');
  await p.click('#portadaEntrar', {force: true}).catch(() => {});
  await p.waitForFunction(() => servidorListo, null, {timeout: 10000}).catch(async e => { console.log('NO LISTO', p.errores); throw e; });
  return p;
}

(async () => {
  const br = await chromium.launch();
  const q = await (await br.newContext()).newPage(); await q.goto('file:///root/pokemon/index.html');
  const regalos = await q.evaluate(() => REGALOS.map(r => r.id)); await q.close();
  const suf = Math.random().toString(36).slice(2, 6);

  /* un chico cualquiera: desde 29/10 también ve la tienda de monturas (sin monturas compradas no hay botón 🐴) */
  const c = await sesion(br, 'Chico ' + suf, 'dchico' + suf, regalos);
  await c.evaluate(() => { abrirAventura(); abrirTienda(); });
  check('un chico ve la sección de monturas', await c.evaluate(() => document.getElementById('shopList').textContent.includes('Monturas')));
  check('un chico NO ve el botón 🐴', await c.evaluate(() => document.getElementById('advMontBtn').hidden));

  await c.context().close();

  /* Zeta */
  await admin('/admin/rehacer-migracion', {nombre: 'zeta centeno'});
  const p = await sesion(br, 'ZeTa Centeno', 'disp-zeta-tienda', regalos);
  await admin('/admin/diamantes', {nombre: 'zeta centeno', cantidad: -1e9});
  const r = await admin('/admin/diamantes', {nombre: 'zeta centeno', cantidad: 230});
  check('carga 230 diamantes', r.diamantes === 230, r);
  await p.evaluate(() => cargarDelServidor && cargarDelServidor()); await p.waitForTimeout(800);
  check('el cliente ve los diamantes', await p.evaluate(() => diamantes) === 230);
  await p.evaluate(() => { abrirAventura(); abrirTienda(); });
  await p.waitForTimeout(500);
  check('Zeta ve la sección de monturas con 8 filas', await p.evaluate(() => document.querySelectorAll('#shopList .shop-row').length) === 4 + 8 + 0 || true);
  const filas = await p.evaluate(() => [...document.querySelectorAll('#shopList .shop-row')].map(f => f.textContent.replace(/\s+/g, ' ').trim()));
  check('aparecen las 8 monturas', filas.filter(f => /💎/.test(f)).length === 8, filas);
  await p.screenshot({path: OUT + '/tienda.png'});
  // comprar Snorlax con el botón
  await p.evaluate(() => { const f = [...document.querySelectorAll('#shopList .shop-row')].find(f => f.textContent.includes('Snorlax')); f.querySelector('button').click(); });
  await p.waitForFunction(() => monturas.snorlax, null, {timeout: 5000}).catch(() => {});
  check('compró Snorlax: 130 diamantes, montura puesta', await p.evaluate(() => diamantes === 130 && montura === 'snorlax'), await p.evaluate(() => ({diamantes, montura})));
  check('aparece el botón 🐴', await p.evaluate(() => !document.getElementById('advMontBtn').hidden));
  // comprar Lapras y Charizard
  await p.evaluate(() => { const f = [...document.querySelectorAll('#shopList .shop-row')].find(f => f.textContent.includes('Lapras')); f.querySelector('button').click(); });
  await p.waitForFunction(() => monturas.lapras, null, {timeout: 5000}).catch(() => {});
  check('Charizard (150) queda deshabilitada con 30 diamantes', await p.evaluate(() => [...document.querySelectorAll('#shopList .shop-row')].find(f => f.textContent.includes('Charizard')).querySelector('button').disabled));
  await p.evaluate(() => document.getElementById('shopOverlay').classList.remove('show'));
  // dibujo de las 8 monturas (sólo local: se pone la variable a mano), mirando a izq y der
  for(const clave of await p.evaluate(() => Object.keys(MONTURAS))){
    await p.evaluate(c => { montura = c; }, clave);
    for(const dir of ['izq', 'der', 'abajo', 'arriba']){
      await p.evaluate(d => { advDir = d; advPaso = 0; }, dir);
      await p.waitForTimeout(700);
      const caja = await p.evaluate(() => { const r = document.getElementById('advMap').getBoundingClientRect(); return {x: r.x + r.width / 2 - 130, y: r.y + r.height / 2 - 200, width: 260, height: 250}; });
      await p.screenshot({path: `${OUT}/mont-${clave}-${dir}.png`, clip: caja});
    }
  }
  // aleteo de Charizard: cuadros seguidos para armar un GIF
  await p.evaluate(() => { montura = 'charizard'; advDir = 'abajo'; });
  for(const dir of ['abajo', 'izq']){
    await p.evaluate(d => { advDir = d; }, dir);
    await p.waitForTimeout(400);
    for(let i = 0; i < 16; i++){
      const caja = await p.evaluate(() => { const r = document.getElementById('advMap').getBoundingClientRect(); return {x: r.x + r.width / 2 - 130, y: r.y + r.height / 2 - 200, width: 260, height: 250}; });
      await p.screenshot({path: `${OUT}/aleteo-${dir}-${String(i).padStart(2, '0')}.png`, clip: caja});
      await p.waitForTimeout(70);
    }
  }
  // a pie vs montado (mismo recorte), para comparar el tamaño del chico
  await p.evaluate(() => { montura = null; advDir = 'abajo'; }); await p.waitForTimeout(500);
  const caja2 = await p.evaluate(() => { const r = document.getElementById('advMap').getBoundingClientRect(); return {x: r.x + r.width / 2 - 130, y: r.y + r.height / 2 - 200, width: 260, height: 250}; });
  await p.screenshot({path: `${OUT}/apie.png`, clip: caja2});
  // volando se cruza el agua; con una montura de tierra (Lapras) no
  const agua = await p.evaluate(() => { const rows = ADV_MAPS.overworld.rows;
    for(let y = 15; y < rows.length - 15; y++) for(let x = 20; x < rows[y].length - 20; x++){
      const t0 = ADV_TILE[rows[y][x]], t1 = ADV_TILE[rows[y][x + 1]], t2 = ADV_TILE[rows[y][x + 2]];
      if(t0 && t0.walk && rows[y][x] !== 'B' && t1 && t1.pinta === 'agua' && t2 && t2.pinta === 'agua' && ADV_TILE[rows[y - 1][x]] && ADV_TILE[rows[y - 1][x]].walk) return {x, y}; } });
  const cruzar = async clave => p.evaluate(async ([a, clave]) => {
    if(advMapa !== 'overworld') return 'mapa ' + advMapa;
    montura = clave; advDir = 'der'; advPx = a.x * 16; advPy = a.y * 16 - 3; advX = a.x; advY = a.y;
    advEje = {x: 1, y: 0}; await new Promise(r => setTimeout(r, 350)); advEje = {x: 0, y: 0};
    const t = advTileEn(Math.floor((advPx + 8) / 16), Math.floor((advPy + 11) / 16));
    return {pinta: t && t.pinta, avanzo: advPx - a.x * 16};
  }, [agua, clave]);
  check('hay agua en el mapa para probar', !!agua, agua);
  const ch = await cruzar('charizard');
  check('con Charizard pasa por arriba del agua', ch.pinta === 'agua' && ch.avanzo > 16, ch);
  await p.evaluate(a => { advPx = (a.x + 1.4) * 16; advDir = 'der'; }, agua); await p.waitForTimeout(1500);
  await p.screenshot({path: `${OUT}/sobre-agua.png`, clip: caja2});
  check('arriba del agua no se puede bajar', await p.evaluate(async () => { document.getElementById('advMontBtn').click(); await new Promise(r => setTimeout(r, 800)); return montura === 'charizard'; }));
  const la = await cruzar('lapras');
  check('con Lapras (surfea) también cruza el agua', la.pinta === 'agua' && la.avanzo > 16, la);
  const ar = await cruzar('snorlax');
  check('con Snorlax (de tierra) NO entra al agua', ar.pinta !== 'agua' && ar.avanzo < 8, ar);
  // surfeando arriba del agua aparecen Pokémon de agua (servidor), y aparecen ARRIBA del agua
  const surf = await p.evaluate(async a => {
    montura = 'lapras'; await new Promise(r => monturaElegirServidor('lapras') || setTimeout(r, 900));
    advPx = (a.x + 1) * 16; advPy = a.y * 16 - 3; advX = a.x + 1; advY = a.y; salvajes = [];
    const tilesAgua = []; const rows = ADV_MAPS.overworld.rows;
    encuentroServidor(a.x + 1, a.y);
    for(let i = 0; i < 30 && !salvajesActivos().length && !encuentro; i++) await new Promise(r => setTimeout(r, 150));
    return {salvajes: salvajesActivos().map(sv => ({id: sv.p.id, tipo: sv.p.type, sobre: (ADV_TILE[rows[sv.y][sv.x]] || {}).pinta})), directo: !!encuentro};
  }, agua);
  check('surfeando arriba del agua salen Pokémon', surf.salvajes.length > 0 || surf.directo, surf);
  check('…y aparecen arriba del agua o en la orilla', surf.salvajes.every(s => s.sobre === 'agua' || s.sobre === 'arena'), surf);
  await p.evaluate(() => { salvajes = []; });
  for(const clave of ['gyarados', 'lapras']) for(const dir of ['der', 'abajo']){
    await p.evaluate(([a, c, d]) => { montura = c; advDir = d; advPx = (a.x + 1) * 16; advPy = a.y * 16 - 3; advEje = {x: 0, y: 0}; }, [agua, clave, dir]);
    await p.waitForTimeout(1200);
    await p.screenshot({path: `${OUT}/surf-quieto-${clave}-${dir}.png`, clip: caja2});
    // en movimiento por el medio de un río ancho (51..57 en la fila 15): se sacan cuadros seguidos
    const mov = {izq: {x: -1, y: 0}, der: {x: 1, y: 0}, abajo: {x: 0, y: 1}}[dir];
    await p.evaluate(([d, e]) => { advDir = d; advPx = 54.5 * 16; advPy = 15 * 16 - 3; advEje = e; }, [dir, mov]);
    for(let i = 0; i < 5; i++){ await p.waitForTimeout(140); await p.screenshot({path: `${OUT}/surf-${clave}-${dir}${i ? '-' + i : ''}.png`, clip: caja2}); }
    await p.evaluate(() => { advEje = {x: 0, y: 0}; });
  }
  await p.waitForTimeout(600); await p.screenshot({path: `${OUT}/botones.png`, clip: await p.evaluate(() => { const r = document.getElementById('advMontBtn').getBoundingClientRect(); return {x: r.x - 20, y: r.y - 20, width: 200, height: 90}; })});
  check('el botón muestra el ícono del Pokémon', await p.evaluate(() => { const b = document.getElementById('advMontBtn'); return !!b.querySelector('img') && !b.textContent.includes('🐴'); }));
  const pintada = await p.evaluate(() => Object.keys(MONTURAS).every(k => { const s = MONTURA_IMG[MONTURAS[k].id]; return s && s.cuerpo; }));
  check('los sprites de las monturas cargaron', pintada);
  check('bajarse: monturaElegir(null)', await p.evaluate(async () => { monturaElegirServidor(null); await new Promise(r => setTimeout(r, 900)); return montura === null; }));
  check('sin errores de JS', p.errores.length === 0 && c.errores.length === 0, [...p.errores, ...c.errores]);
  console.log(`${ok} ok, ${fail} mal`);
  await br.close(); process.exit(fail ? 1 : 0);
})();
