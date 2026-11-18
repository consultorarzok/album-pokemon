/* Altar con pelea previa, de punta a punta en MODO SERVIDOR (SERVIDOR=http://localhost:PUERTO): el legendario sale, se lo reta, perder deja
   oportunidades, ganar abre las pokébolas. Se gana/pierde tocando la vida desde la prueba. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8787';
let ok = 0, fail = 0;
const check = (n, c, x) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const suf = Math.random().toString(36).slice(2, 6);
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  await ctx.route(/n8n\.consultorarz\.com/, r => r.abort());
  const ids = await (async () => { const q = await ctx.newPage(); await q.goto('file:///root/pokemon/index.html'); const r = await q.evaluate(() => REGALOS.map(r => r.id)); await q.close(); return r; })();
  await p.addInitScript(([srv, suf, regalos]) => {
    if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1');
    localStorage.clear();
    localStorage.setItem('album-servidor', srv);
    localStorage.setItem('album-avatar', 'red'); localStorage.setItem('album-kanto-jugador', 'Altar ' + suf);
    localStorage.setItem('album-kanto-dispositivo', 'dalt' + suf);
    localStorage.setItem('album-kanto-regalos', JSON.stringify(regalos));
    localStorage.setItem('album-kanto-pin-ofrecido', '1');
    const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got: false, dup: 0};
    [1, 4, 7, 25, 16, 19].forEach(i => st[i] = {got: true, dup: 0});
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins: 0, state: st, bolas: {roja: 0, azul: 0, ultra: 0, maestra: 5}}));
  }, [SERVIDOR, suf, ids]);
  await p.goto('file:///root/pokemon/index.html');
  await p.click('#portadaEntrar', {force: true}).catch(() => {});
  await p.waitForFunction(() => servidorListo, null, {timeout: 15000});
  await p.evaluate(() => document.querySelectorAll('.overlay.show').forEach(e => e.classList.remove('show')));
  await p.evaluate(() => abrirAventura());
  await p.waitForTimeout(2000);
  // al lado de un altar de overworld hasta que el servidor haga salir al legendario (el cliente lo anuncia y lo muestra)
  const altar = await p.evaluate(() => { const a = Object.keys(ADV_MAPS.overworld.santuarios)[0].split(',').map(Number); return {x: a[0], y: a[1]}; });
  await p.evaluate(a => { advPonerEn(a.x, a.y + 2); }, altar);
  const aparecio = await p.evaluate(async a => {
    for(let i = 0; i < 40; i++){
      const r = await accionServidor('altar', {mapa: 'overworld', x: advX, y: advY, region: advRegion, pasos: 6}).catch(() => null);
      if(r && r.ok && r.resultado && r.resultado.aparece){ window.__alt = r.resultado; return true; }
      await new Promise(s => setTimeout(s, 1000));
    }
    return false;
  }, altar);
  check('el altar hizo aparecer un legendario', aparecio);
  const pelea = async (gana) => {
    await p.evaluate(() => { window.__retoArena = Object.assign({reto: 'altar'}, posAdv()); window.__altarVuelta = {id: window.__alt.aparece}; });
    await p.evaluate(() => { cerrarAventura(); abrirArena(); });
    await p.waitForSelector('#arPickGo'); await p.click('#arPickGo');
    await p.waitForFunction(() => window.__arena && window.__arena.estado() && window.__arena.estado().fase === 'lucha', null, {timeout: 15000});
    await p.waitForTimeout(gana ? 7000 : 500);   // el servidor exige un mínimo de duración para ganar
    if(gana) await p.evaluate(() => { const S = window.__arena.estado(); S.riv.mons.forEach(m => { m.hp = 1; }); for(let i = 0; i < 12; i++) window.__arena.golpeDe('yo', 'riv', 'largo'); });
    else await p.evaluate(() => { const S = window.__arena.estado(); S.yo.mons.forEach(m => { if(m !== S.yo.act){ m.vivo = false; m.hp = 0; } }); S.yo.act.hp = 1; });
    await p.waitForSelector('#arOtra', {state: 'attached', timeout: 60000});
    await p.waitForFunction(() => /Ganaste|Perdiste/.test(document.getElementById('arFin').textContent), null, {timeout: 20000});
  };
  await pelea(false);
  check('al perder no hay Revancha', await p.evaluate(() => document.getElementById('arOtra').hidden));
  await p.click('#arCerrar2');
  check('perdió: vuelve a la Aventura y ofrece pelear otra vez (quedan 2)', await p.waitForFunction(() => !document.getElementById('advCharla').hidden && /2<\/b> oportunidades/.test(document.getElementById('advCharlaTxt').innerHTML), null, {timeout: 6000}).then(() => true, () => false));
  await p.evaluate(() => { document.getElementById('advCharla').hidden = true; });
  await pelea(true);
  await p.click('#arCerrar2');
  check('ganó: se abre la pantalla de pokébolas del legendario', await p.waitForFunction(() => encuentro && encuentro.p && document.getElementById('encTitle').textContent.includes(encuentro.p.name) && getComputedStyle(document.getElementById('encuentro') || document.body).display !== 'none', null, {timeout: 8000}).then(() => true, () => false));
  const r = await p.evaluate(async () => accionServidor('tirar', {tipo: 'maestra'}).catch(() => null));
  check('el servidor deja tirar pokébola (ya no pide ganar)', r && r.ok && r.resultado && r.resultado.atrapado === true, r);
  check('sin errores de JavaScript', errores.length === 0, errores);
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`);
  process.exit(fail ? 1 : 0);
})();
