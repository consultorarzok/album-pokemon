let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'))}
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: 900, height: 640}});
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  const page = await ctx.newPage(); const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file:///root/pokemon/index.html'); await page.click('#portadaEntrar', {force: true});
  await page.fill('#nameInput', 'TestIncursion'); await page.click('#nameSaveBtn'); await page.waitForTimeout(700);
  if(await page.isVisible('#avatarOverlay')){ await page.click('.avatar-op[data-avatar="red"]'); await page.waitForTimeout(200); }
  for(let i = 0; i < 4; i++){ for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await page.isVisible(s)) await page.evaluate(s => document.querySelector(s).click(), s); await page.waitForTimeout(300); }
  console.log('\n— Guaridas en el mapa —');
  await page.evaluate(() => document.getElementById('advBtn').click()); await page.waitForTimeout(600);
  const g = await page.evaluate(() => ({n: GUARIDAS.length, regiones: GUARIDAS.map(g => g.region).join(), puertas: GUARIDAS.every(g => ADV_MAPS.overworld.rows[g.puerta[1]][g.puerta[0]] === '7'),
    solo: [...SOLO_INCURSION].join(), sobreSinSolo: poolSobre().every(p => !SOLO_INCURSION.has(p.id)), advSinSolo: ADV_DATA.every(p => !SOLO_INCURSION.has(p.id))}));
  check('una guarida por región (7) con su puerta', g.n === 7 && g.puertas && g.regiones === 'kanto,johto,hoenn,sinnoh,unova,kalos,alola');
  check('los legendarios de incursión no salen en sobres ni en la Aventura', g.sobreSinSolo && g.advSinSolo && g.solo === '150,249,384,487,646,716,800');
  const msj = await page.evaluate(() => {
    const k = GUARIDAS[0], real = Date.now;
    Date.now = () => Date.parse('2026-11-03T08:00:00-03:00'); advLeerCartel(k.puerta[0], k.puerta[1]); const cerrada = document.getElementById('advZona').textContent;
    Date.now = () => Date.parse('2026-11-03T10:10:00-03:00'); advLeerCartel(k.puerta[0], k.puerta[1]); const abierta = document.getElementById('advZona').textContent;
    Date.now = real; return {cerrada, abierta};
  });
  check('cerrada: dice el horario (' + msj.cerrada.slice(0, 50) + '…)', /Mewtwo/.test(msj.cerrada) && /10:00 y 19:00/.test(msj.cerrada) && /Próxima: 10:00/.test(msj.cerrada));
  check('abierta: avisa que entran exactamente 5', /abierta/.test(msj.abierta) && /exactamente 5/.test(msj.abierta));
  await page.evaluate(() => { const k = GUARIDAS[0]; advPonerEn(k.puerta[0], k.puerta[1] + 2); advRender(); });
  await page.waitForTimeout(800);
  await page.screenshot({path: '/tmp/claude-0/-root/b70858be-5edb-4e9c-bb87-88f6028271ef/scratchpad/guarida.png'});
  console.log('\n— La pelea: 5 contra el legendario —');
  await page.evaluate(() => { document.getElementById('advCloseBtn').click(); });
  const eq = [{id: 25, f: 60, c: 'aa'}, {id: 6, f: 70, c: 'bb'}, {id: 9, f: 65, c: 'cc'}];
  const m = {t: 'empezar', multi: true, modo: 'raid', miSlot: 0, hostJefe: 0, jefe: {slot: 5, id: 150, f: 97, vida: 12},
    jugadores: [0, 1, 2, 3, 4].map(s => ({slot: s, nombre: s ? 'Amigo ' + s : 'TestIncursion', bando: 'A', equipo: eq}))};
  await page.evaluate(m => { document.getElementById('arenaOverlay').classList.add('show'); window.__incursionPrueba(m); }, m);
  await page.waitForTimeout(3600);
  const st = await page.evaluate(() => { const A = __arena.estado(), E = __arena.ent(); return {modo: A.modo, host: A.raid.host, lados: A.lados.join(), jefe: E.riv.mon.p.name, max: E.riv.mon.max, f: E.riv.mon.fz, jefeAlto: E.riv.h * E.riv.s, yoAlto: E.yo.h * E.yo.s, aliados: A.lados.filter(l => A.bando[l] === 'A').length, x0: E.riv.x, y0: E.riv.y}; });
  check('arranca la incursión: 5 compañeros (bando A) contra ' + st.jefe, st.modo === 'raid' && st.aliados === 5 && st.jefe === 'Mewtwo');
  check('el legendario tiene fuerza 97 y 12 veces más vida (' + st.max + ')', st.f === 97 && st.max > 600);
  check('el legendario tiene el mismo tamaño que los demás', st.jefeAlto < st.yoAlto * 1.6);
  const mov = await page.evaluate(() => new Promise(r => { const E = __arena.ent(), x0 = E.riv.x, y0 = E.riv.y; let max = 0, n = 0;
    const t = setInterval(() => { max = Math.max(max, Math.hypot(E.riv.x - x0, E.riv.y - y0)); if(++n >= 15){ clearInterval(t); r(max); } }, 250); }));
  check('en el anfitrión el legendario se mueve solo (su cerebro corre acá)', mov > .02);
  const dano = await page.evaluate(() => { const E = __arena.ent(); E.riv.invul = 0; E.riv.rodando = false; const antes = E.riv.mon.hp; __arena.golpeDe('yo', 'riv', 'largo'); return antes - E.riv.mon.hp; });
  check('el anfitrión calcula el daño que recibe el legendario (' + dano + ')', dano > 0);
  const fuerte = await page.evaluate(() => { const E = __arena.ent(); E.yo.invul = 0; E.yo.rodando = false; const antes = E.yo.mon.hp; let dmg = 0; for(const a of ['corto', 'medio', 'largo']){ E.yo.mon.vivo = true; E.yo.invul = 0; E.yo.rodando = false; E.yo.mon.hp = E.yo.mon.max; __arena.golpeDe('riv', 'yo', a); dmg = Math.max(dmg, E.yo.mon.max - E.yo.mon.hp); } return {dmg, max: E.yo.mon.max, movs: E.riv.mon.movs ? JSON.stringify(E.riv.mon.movs).slice(0, 200) : ''}; });
  check('el legendario pega fuerte (' + fuerte.dmg + ' de ' + fuerte.max + ')', fuerte.dmg > fuerte.max * .15);
  await page.screenshot({path: '/tmp/claude-0/-root/b70858be-5edb-4e9c-bb87-88f6028271ef/scratchpad/incursion_pelea.png'});
  check('sin errores de JS', errores.length === 0); if(errores.length) console.log(errores.slice(0, 4));
  console.log('\n' + ok + ' ok · ' + fail + ' fallan');
  await browser.close(); process.exit(fail ? 1 : 0);
})();
