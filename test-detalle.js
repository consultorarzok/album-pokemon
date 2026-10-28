/* Pokédex: filtro Shiny / Repetidas y ficha al tocar una carta (copias con fuerza, shiny, evolución). */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
let ok = 0, fail = 0;
const check = (n, c, x) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };
const SHOTS = process.env.SHOTS || '';
(async () => {
  const browser = await chromium.launch();
  for(const [w, h] of [[390, 844], [1366, 768]]){
    console.log('— ' + w + '×' + h + ' —');
    const ctx = await browser.newContext({viewport:{width:w, height:h}});
    await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
    await ctx.route('**://api.entrenadoresrz.com/**', r => r.abort());
    await ctx.addInitScript(() => {
      if(sessionStorage.getItem('sembrado')) return; sessionStorage.setItem('sembrado', '1');
      localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador', 'Tester'); localStorage.setItem('album-servidor', 'off');
      const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got:false, dup:0};
      st[1] = {got:true, dup:2, ej:[{f:30,c:'AAAA'},{f:88,c:'BBBB',s:true},{f:60,c:'CCCC'}]};   // Bulbasaur: 3 copias, una shiny
      st[4] = {got:true, dup:0, ej:[{f:55,c:'DDDD'}]};
      st[25] = {got:true, dup:15, ej:Array.from({length:16}, (_, i) => ({f:20 + i, c:'P' + String(i).padStart(3, '0')}))};   // Pikachu 12 copias
      st[150] = {got:true, dup:0, ej:[{f:90,c:'EEEE',s:true}]};   // Mewtwo shiny (no evoluciona)
      localStorage.setItem('album-kanto-progreso', JSON.stringify({coins:300, state:st}));
    });
    const p = await ctx.newPage();
    const errores = []; p.on('pageerror', e => errores.push(e.message));
    await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar',{force:true});
    await p.waitForTimeout(1500);
    for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await p.isVisible(s)){ await p.click(s); await p.waitForTimeout(250); }
    await p.click('#pokedexBtn'); await p.waitForTimeout(400);
    await p.evaluate(() => document.getElementById('filtrosBox').open = true);
    const cartas = () => p.$$eval('#grid .slot.got', s => s.map(x => x.querySelector('.name').textContent));
    const todas = await cartas();
    check('sin filtro se ven las que tengo', ['Bulbasaur', 'Charmander', 'Pikachu', 'Mewtwo'].every(n => todas.includes(n)), todas);
    await p.click('#estadoFilters .chip[data-valor="shiny"]');
    const sh = await cartas();
    check('filtro ✨ Shiny: Bulbasaur y Mewtwo (y ninguna sin shiny)', sh.includes('Bulbasaur') && sh.includes('Mewtwo') && !sh.includes('Charmander') && !sh.includes('Pikachu'), sh);
    await p.click('#estadoFilters .chip[data-valor="dup"]');
    const du = await cartas();
    check('filtro Repetidas: Bulbasaur y Pikachu, sin las únicas', du.includes('Bulbasaur') && du.includes('Pikachu') && !du.includes('Charmander') && !du.includes('Mewtwo'), du);
    check('el resumen cuenta el filtro activo', /1 activo/.test(await p.textContent('#filtrosResumen')));
    await p.click('#estadoFilters .chip[data-valor="shiny"]');
    await p.click('#regionFilters .chip[data-valor="johto"]');
    check('shiny + región sin resultados avisa', /no tenés ninguna/i.test(await p.textContent('#grid')));
    await p.click('#regionFilters .chip[data-valor="all"]'); await p.click('#estadoFilters .chip[data-valor="all"]');

    await p.evaluate(() => document.querySelector('#grid .slot.got .name').closest('.slot'));
    await p.click('#grid .slot.got:has(.name:text("Bulbasaur"))');
    await p.waitForTimeout(300);
    check('tocar la carta abre la ficha', await p.isVisible('#detalleOverlay .reveal-panel'));
    const txt = await p.textContent('#detalleBody');
    check('muestra número y nombre', /#001 Bulbasaur/.test(await p.textContent('#detalleTit')));
    check('dice cuántas copias y repetidas', /Tenés 3 \(2 repetidas\)/.test(txt), txt.slice(0, 160));
    const chips = await p.$$eval('#detalleBody .ej-chip', c => c.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    check('lista las 3 copias con su fuerza, la shiny primero y ⭐ Arena', chips.length === 3 && /✨.*88/.test(chips[0]) && /Arena/.test(chips[0]) && /30/.test(chips[2]), chips);
    check('marca shiny', /Shiny/.test(txt));
    check('evolución: → Ivysaur · cuesta 10 · te faltan 8', /Ivysaur.*cuesta 10.*te faltan 8/.test(txt), txt);
    if(SHOTS) await p.screenshot({path: SHOTS + '/detalle-' + w + '.png'});
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    check('Escape cierra la ficha y queda la Pokédex', !(await p.isVisible('#detalleOverlay .reveal-panel')) && await p.isVisible('#pokedexOverlay'));
    await p.click('#grid .slot.got:has(.name:text("Pikachu"))'); await p.waitForTimeout(250);
    const tp = await p.textContent('#detalleBody');
    check('Pikachu: 16 copias, "¡Ya podés!" evolucionar y botón', /Tenés 16/.test(tp) && /Raichu.*¡Ya podés!/.test(tp) && await p.isVisible('#detalleEvolBtn'), tp.slice(0, 260));
    await p.click('#detalleEvolBtn'); await p.waitForTimeout(300);
    check('el botón lleva a Evolucionar', await p.isVisible('#evolucionOverlay .reveal-panel') && !(await p.isVisible('#detalleOverlay .reveal-panel')));
    check('la Pokédex se cierra para no tapar la evolución', !(await p.isVisible('#pokedexOverlay .pokedex-panel')));
    await p.click('#evolucionCloseBtn'); await p.click('#pokedexBtn'); await p.waitForTimeout(300);
    await p.click('#grid .slot.got:has(.name:text("Mewtwo"))'); await p.waitForTimeout(250);
    check('Mewtwo: dice que no evoluciona', /No evoluciona/.test(await p.textContent('#detalleBody')));
    await p.click('#detalleCloseBtn');
    const faltante = await p.evaluate(() => { const s = [...document.querySelectorAll('#grid .slot:not(.got)')][0]; s.click(); return document.getElementById('detalleOverlay').classList.contains('show'); });
    check('tocar una que no tengo no abre nada', faltante === false);
    check('sin errores de página', errores.length === 0, errores);
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${ok} bien, ${fail} mal`); process.exit(fail ? 1 : 0);
})();
