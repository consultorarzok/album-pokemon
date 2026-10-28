/* Evolucionar (modo local, sin servidor): se elige UN ejemplar de un Pokémon con repetidas, evoluciona
   conservando fuerza y shiny, se gasta el costo según la rareza del destino y siempre queda 1 del original.
   Con SHOTS=carpeta guarda capturas. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
const SHOTS = process.env.SHOTS || '';

(async () => {
  const browser = await chromium.launch();
  for(const [w, h] of [[390, 844], [1366, 768]]){
    console.log('— ' + w + '×' + h + ' —');
    const ctx = await browser.newContext({viewport:{width:w, height:h}});
    await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
    await ctx.route('**://api.entrenadoresrz.com/**', r => r.abort());
    await ctx.addInitScript(() => {
      if(sessionStorage.getItem('sembrado')) return;
      sessionStorage.setItem('sembrado', '1');
      localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador', 'Tester'); localStorage.setItem('album-servidor', 'off');
      const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got:false, dup:0};
      st[1] = {got:true, dup:10, ej:[{f:10,c:'AAAA'},{f:40,c:'BBBB'},{f:90,c:'CCCC',s:true},{f:70,c:'DDDD'},{f:20,c:'EEEE'},{f:30,c:'FFFF'},{f:1,c:'X001'},{f:2,c:'X002'},{f:3,c:'X003'},{f:4,c:'X004'},{f:5,c:'X005'}]};   // Bulbasaur: 10 rep -> Ivysaur (10)
      st[2] = {got:true, dup:0};                                                                                // Ivysaur sin repetidas
      st[4] = {got:true, dup:10};                                                                               // Charmander 10 rep
      st[133] = {got:true, dup:19};                                                                              // Eevee 4: Vaporeon/Jolteon/Flareon (Rara 15) sí, Espeon/Umbreon (Épico 20) no
      st[10] = {got:true, dup:1};                                                                               // Caterpie: no alcanza
      localStorage.setItem('album-kanto-progreso', JSON.stringify({coins:300, state:st}));
    });
    const p = await ctx.newPage();
    const errores = []; p.on('pageerror', e => errores.push(e.message));
    await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar',{force:true});
    await p.waitForTimeout(1500);
    for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await p.isVisible(s)){ await p.click(s); await p.waitForTimeout(250); }

    check('el botón Evolucionar siempre está habilitado', await p.evaluate(() => !document.getElementById('evolucionarBtn').disabled));
    await p.evaluate(() => document.getElementById('evolucionarBtn').click());
    await p.waitForTimeout(300);
    check('abre la pantalla de evolución', await p.isVisible('#evolucionOverlay .reveal-panel'));
    const filas = await p.$$eval('#evolucionList .ej-fila', fs => fs.map(f => f.querySelector('b').textContent));
    check('lista los que tienen repetidas y evolucionan (Bulbasaur, Charmander, Caterpie, Eevee)', ['Bulbasaur','Charmander','Caterpie','Eevee'].every(n => filas.includes(n)) && filas.length === 4);
    check('los que se pueden evolucionar ya van primero', filas.indexOf('Caterpie') === 3);
    const eevee = await p.$$eval('#evolucionList .ej-fila', fs => { const f = fs.find(x => x.querySelector('b').textContent === 'Eevee'); return [...f.querySelectorAll('.evo-btn')].map(b => b.textContent.replace(/\s+/g,' ').trim() + (b.disabled ? ' [off]' : ' [on]')); });
    check('Eevee: ramas Rara (15) habilitadas y Épico (20) apagadas con "te falta 1"', eevee.some(t => /Vaporeon.*15 repetidas.*\[on\]/.test(t)) && eevee.some(t => /Espeon.*te faltan 1.*\[off\]/.test(t)));
    if(SHOTS) await p.screenshot({path: SHOTS + '/evolucion-' + w + '-lista.png'});

    // Bulbasaur: elijo la shiny (90) y evoluciono a Ivysaur
    await p.evaluate(() => { const f = [...document.querySelectorAll('#evolucionList .ej-fila')].find(x => x.querySelector('b').textContent === 'Bulbasaur'); f.querySelector('.ej-chip[data-c="CCCC"]').click(); });
    await p.evaluate(() => { const f = [...document.querySelectorAll('#evolucionList .ej-fila')].find(x => x.querySelector('b').textContent === 'Bulbasaur'); f.querySelector('.evo-btn').click(); });
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => ({b: {got: state[1].got, dup: state[1].dup, n: ejemplares(1).length}, i: {got: state[2].got, dup: state[2].dup, ej: ejemplares(2).map(e => ({f: e.f, s: !!e.s}))}}));
    check('Bulbasaur queda con 1 y 0 repetidas', r.b.got && r.b.dup === 0 && r.b.n === 1);
    check('Ivysaur (ya lo tenía) suma 1 repetida con fuerza 90 y shiny', r.i.dup === 1 && r.i.ej.some(e => e.f === 90 && e.s));
    check('el costo se pagó con los más débiles: queda el mejor de los no elegidos (70)', await p.evaluate(() => ejemplares(1)[0].c === 'DDDD'));
    check('muestra la carta de la evolución', /Evolucionó a Ivysaur/.test(await p.textContent('#revealTitle')));
    if(SHOTS) await p.screenshot({path: SHOTS + '/evolucion-' + w + '-carta.png'});
    await p.evaluate(() => document.getElementById('closeBtn').click());
    await p.waitForTimeout(300);

    // Charmander: 3 rep -> Charmeleon (Poco Común: 10) y recién 0 -> no se puede seguir
    await p.evaluate(() => evolucionar(4, 5, ejemplares(4)[0].c));
    await p.waitForTimeout(600);
    check('Charmander -> Charmeleon: nuevo, Charmander queda con 1', await p.evaluate(() => state[5].got && state[5].dup === 0 && state[4].dup === 0 && ejemplares(4).length === 1));
    // servidor-local no deja saltear etapa ni evolucionar sin repetidas
    const mal = await p.evaluate(() => [evolucionarLocal(4, 6, ejemplares(4)[0].c), evolucionarLocal(10, 11, ejemplares(10)[0].c), evolucionarLocal(1, 3, ejemplares(1)[0].c)]);
    check('no deja saltear etapa, ni evolucionar sin repetidas suficientes', mal.every(x => x === null));
    // cuenta de la barra
    check('el botón se apaga si ya no queda nada para evolucionar ahora (Eevee sigue)', await p.evaluate(() => evolucionablesYa().map(p => p.name).join() === 'Eevee'));
    check('sin errores de página', errores.length === 0);
    if(errores.length) console.log(errores);
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${ok} bien, ${fail} mal`);
  process.exit(fail ? 1 : 0);
})();
