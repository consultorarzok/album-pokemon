/* Shiny: probabilidad (muy rara), fuerza casi siempre alta, viaja en el código (fuerza+100), se ve en la carta del
   sobre, el intercambio, la Pokédex y la Arena (sprite shiny). Servidor simulado. */
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
    const generados = [];
    await ctx.route('**://n8n.consultorarz.com/**', r => {
      const u = r.request().url();
      if(u.includes('pokemon-generar-codigo')){ generados.push(JSON.parse(r.request().postData())); return r.fulfill({status:200, body:'{"ok":true,"codigo":"ABCDEFG"}'}); }
      if(u.includes('pokemon-canjear-codigo')) return r.fulfill({status:200, body:'{"ok":true,"pokemonId":20,"fuerza":172}'});
      return r.abort();
    });
    /* sin internet de verdad: las imágenes se contestan con un PNG chico (así el respaldo no cambia la URL) */
    const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    await ctx.route('**/PokeAPI/sprites**', r => r.fulfill({status:200, contentType:'image/png', body:PNG}));
    await ctx.addInitScript(() => {
      if(sessionStorage.getItem('sembrado')) return; sessionStorage.setItem('sembrado', '1');
      localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador', 'Tester');
      const st = {}; for(let i = 1; i <= 151; i++) st[i] = {got:i <= 14, dup:0};
      st[4] = {got:true, dup:1, ej:[{f:80, c:'AAAA', s:true}, {f:40, c:'BBBB'}]};   // Charmander: una shiny
      st[1] = {got:true, dup:0, ej:[{f:55, c:'CCCC'}]};
      localStorage.setItem('album-kanto-progreso', JSON.stringify({coins:900, state:st}));
    });
    const p = await ctx.newPage();
    const errores = []; p.on('pageerror', e => errores.push(e.message));
    const pedidos = []; p.on('request', q => pedidos.push(q.url()));
    await p.goto('file:///root/pokemon/index.html');await p.click('#portadaEntrar',{force:true});
    await p.waitForTimeout(1200);
    for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await p.isVisible(s)){ await p.click(s); await p.waitForTimeout(250); }

    /* probabilidad real */
    const est = await p.evaluate(() => { let sh = 0, n = 300000, f75 = 0, min = 999; for(let i = 0; i < n; i++){ const e = nuevoEjemplar(); if(e.s){ sh++; if(e.f >= 75) f75++; min = Math.min(min, e.f); } } return {frac:sh / n, fuertes:f75, n:sh, min}; });
    check('muy raro: 1 de cada ~500 es shiny (' + (est.frac * 100).toFixed(2) + '%)', est.frac > .0012 && est.frac < .003);
    check('la mayoría de las shiny son fuertes (' + est.fuertes + ' de ' + est.n + ' con 75+) y ninguna sale con menos de 50', est.min >= 50 && est.fuertes / est.n > .75 && est.fuertes / est.n < .95);
    const dec = await p.evaluate(() => ({a:nuevoEjemplar(165), b:nuevoEjemplar(65), c:codigoFuerza({f:65, s:true}), d:codigoFuerza({f:65})}));
    check('fuerza 165 en un código = shiny de 65', dec.a.s === true && dec.a.f === 65 && !dec.b.s && dec.b.f === 65);
    check('al generar el código la shiny viaja como fuerza+100', dec.c === 165 && dec.d === 65);

    /* Pokédex */
    await p.evaluate(() => document.getElementById('pokedexBtn').click()); await p.waitForTimeout(500);
    const slot = await p.$eval('#grid .slot.vario', s => ({img:s.querySelector('img').src, tag:!!s.querySelector('.vario-tag'), name:s.textContent}));
    check('la Pokédex marca con ✨ y muestra la ilustración shiny', slot.tag && slot.img.includes('/official-artwork/shiny/4.png') && slot.name.includes('Charmander'));
    check('sólo Charmander está marcada', (await p.$$('#grid .slot.vario')).length === 1);
    if(SHOTS) await p.screenshot({path:`${SHOTS}/shiny-pokedex-${w}.png`});
    await p.evaluate(() => document.querySelectorAll('.pokedex-close, #pokedexCloseBtn').forEach(b => b.click()));
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);

    /* intercambio */
    await p.evaluate(() => abrirIntercambio()); await p.waitForTimeout(300);
    const chips = await p.$$eval('.ej-fila', fs => fs.map(f => f.textContent.replace(/\s+/g, ' ')).find(t => t.includes('Charmander')));
    check('el intercambio marca la shiny con ✨', /✨ 💪 80/.test(chips) && chips.includes('shiny'));
    await p.evaluate(() => { const f = [...document.querySelectorAll('.ej-fila')].find(x => x.textContent.includes('Charmander')); f.querySelector('.ej-chip[data-c="AAAA"]').click(); f.querySelector('.open-btn').click(); });
    await p.waitForTimeout(600);
    check('regalar la shiny manda fuerza 180', generados.some(g => g.pokemonId === 4 && g.fuerza === 180));
    check('la carta del código muestra ✨ y la ilustración shiny', (await p.textContent('#codigoCardName')).includes('✨') && (await p.getAttribute('#codigoCardImg', 'src')).includes('/shiny/4.png'));
    if(SHOTS) await p.screenshot({path:`${SHOTS}/shiny-codigo-${w}.png`});
    for(const s of ['#codigoCardOverlay.show button', '#specialContinueBtn']) if(await p.isVisible(s)) await p.click(s);

    /* canje de un código shiny */
    await p.evaluate(() => { document.querySelectorAll('.overlay.show, .special-overlay.show').forEach(o => o.classList.remove('show')); abrirIntercambio();
      document.getElementById('canjeCodigoInput').value = 'XYZ1234'; canjearCodigoInput(); });
    await p.waitForTimeout(900);
    const rc = await p.evaluate(() => ({ej:ejemplares(20)[0], carta:document.querySelector('#revealCards .reveal-card').className, txt:document.getElementById('revealCards').textContent, img:document.querySelector('#revealCards img').src}));
    check('el canjeado llega shiny con su fuerza (72)', rc.ej.s === true && rc.ej.f === 72);
    check('la carta del canje dice ¡Shiny! con la ilustración shiny', rc.txt.includes('✨ ¡Shiny!') && rc.carta.includes('vario') && rc.img.includes('/shiny/20.png'));
    if(SHOTS) await p.screenshot({path:`${SHOTS}/shiny-reveal-${w}.png`});

    /* arena */
    await p.evaluate(() => { document.querySelectorAll('.overlay.show, .special-overlay.show').forEach(o => o.classList.remove('show')); });
    await p.evaluate(() => document.getElementById('battleBtn').click()); await p.waitForSelector('.ar-sel');
    const sel = await p.$$eval('.ar-sel', bs => bs.map(b => ({t:b.textContent.replace(/\s+/g, ' '), src:b.querySelector('img').src})));
    const ch = sel.find(x => x.t.includes('Raticate'));
    check('al elegir equipo Raticate (la que canjeé shiny) lleva ✨ y su ícono shiny', ch && ch.t.includes('✨') && ch.src.includes('/shiny/20.png') && sel.filter(x => x.t.includes('✨')).length === 1);
    if(SHOTS) await p.screenshot({path:`${SHOTS}/shiny-pick-${w}.png`});
    /* equipo de 3 con Raticate (la shiny) primero */
    await p.evaluate(() => { let b; while((b = document.querySelector('.ar-sel.on'))) b.click(); });
    for(const n of ['Raticate', 'Charizard', 'Blastoise']) await p.evaluate(nombre => [...document.querySelectorAll('.ar-sel')].find(b => b.textContent.includes(nombre)).click(), n);
    await p.click('#arPickGo');
    await p.waitForFunction(() => window.__arena && window.__arena.estado().fase === 'lucha', null, {timeout:15000});
    const sp = await p.evaluate(() => { const E = window.__arena.ent(), m = E.yo.mon; return {v:m.vario, n:m.p.name, f:E.yo.imgs.frente.src, b:E.yo.imgs.espalda.src, o:E.riv.mon.vario, eq:window.__arena.estado().yo.mons.map(x => x.p.name + ':' + !!x.vario)}; });
    check('en la arena sale Raticate shiny (' + sp.eq.join(' ') + ')', sp.n === 'Raticate' && sp.v === true && sp.eq.filter(x => x.endsWith(':true')).length === 1);
    check('pide el sprite animado shiny (frente y espalda)', pedidos.some(u => u.includes('/animated/shiny/20.gif')) && pedidos.some(u => u.includes('/animated/back/shiny/20.gif')));
    check('si no carga el animado, cae a la ilustración shiny', sp.f.includes('/shiny/20'));
    check('el rival nunca es shiny', sp.o === false);
    if(SHOTS) await p.screenshot({path:`${SHOTS}/shiny-arena-${w}.png`});
    check('sin errores de JS', errores.length === 0 || (console.log(errores), false));
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${ok} ok · ${fail} fallan`);
  process.exit(fail ? 1 : 0);
})();
