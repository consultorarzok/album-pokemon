let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'))}
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:1024, height:700} });
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file:///root/pokemon/index.html'); await page.click('#portadaEntrar', {force: true});
  await page.fill('#nameInput', 'TestSur'); await page.click('#nameSaveBtn'); await page.waitForTimeout(700);
  if(await page.isVisible('#avatarOverlay')){ await page.click('.avatar-op[data-avatar="red"]'); await page.waitForTimeout(200); }
  for(let i = 0; i < 4; i++){
    if(await page.isVisible('#specialContinueBtn')){ await page.click('#specialContinueBtn'); await page.waitForTimeout(500); }
    if(await page.isVisible('#battleCloseBtn')){ await page.click('#battleCloseBtn'); await page.waitForTimeout(300); }
  }
  console.log('\n— Región del sur (Alola) —');
  await page.click('#advBtn'); await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const m = ADV_MAPS.overworld;
    const out = {};
    out.regiones = [regionDe(25, 60), regionDe(80, 60), regionDe(25, 119), regionDe(25, 120), regionDe(25, 150), regionDe(300, 150)];
    out.clima = climaDe(25, 150);
    out.zona = [advZonaDe(25, 124), advZonaDe(46, 125), advZonaDe(25, 142), advZonaDe(25, 60)];
    out.puerta = [m.rows[119][24], m.rows[119][25], m.rows[119][26], m.rows[119][23]];
    out.altares = Object.keys(m.santuarios).filter(k => +k.split(',')[1] >= 120).length;
    out.pokes = [...new Set(poolBioma('hierba', 'alola').map(p => p.region))].join();
    out.legendarios = [...new Set(poolBioma('legendario', 'alola').map(p => p.name))].sort().join();
    out.cuevaAlola = !!m.santuariosPorRegion;
    out.cueva = !!ADV_MAPS.cueva.santuariosPorRegion.alola;
    // caminar de verdad: de la puerta al río, por el puente y hasta la cueva (BFS sobre advTileEn)
    const q = [[25, 118]], vis = new Set(['25,118']); let alcanzo = {};
    while(q.length){
      const [x, y] = q.shift();
      for(const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if(vis.has(k)) continue;
        const t = advTileEn(nx, ny);
        if(t && t.walk){ vis.add(k); q.push([nx, ny]); }
      }
    }
    out.llegaCueva = vis.has('24,176'); out.llegaCentro = vis.has('22,125'); out.llegaAltar = ['10,127', '42,130', '10,167', '42,172'].every(k => vis.has(k));
    out.cruzaRio = vis.has('25,150') && vis.has('25,130');
    // el eje norte-sur de la capital, en el orden de la realidad (pedido de Zeta)
    const hallar = ch => { const r = []; m.rows.forEach((f, y) => [...f].forEach((c, x) => { if(c === ch && x < 54 && y < 120) r.push({x, y}); })); return r; };
    const media = ch => { const l = hallar(ch); return l.length ? {x: l.reduce((a, p) => a + p.x, 0) / l.length, y: l.reduce((a, p) => a + p.y, 0) / l.length, n: l.length} : null; };
    out.eje = {concejo: media('2'), gobierno: media('G'), muni: media('1'), estadio: media('3'), terminal: media('4'), casas: media('H')};
    out.edificios = edificiosDe('overworld').map(e => e.tipo);
    // pararse adentro: el juego pinta y cambia a la región nueva
    advPonerEn(25, 150); advRender();
    out.advRegion = advRegion;
    advPonerEn(25, 60); advRender();
    out.advRegionN = advRegion;
    // evento con el mapa cerrado: el sur queda clausurado
    const orig = eventoActivo;
    window.eventoActivo = () => ({mapaCerradoDesdeX: 109, nombre: 'Prueba', fin: new Date(Date.now() + 3600e3).toISOString(), soloRegion12: true});
    out.cerrado = [cerradoPorEvento(25, 150), cerradoPorEvento(25, 60), cerradoPorEvento(200, 60)];
    window.eventoActivo = orig;
    out.abierto = cerradoPorEvento(25, 150);
    return out;
  });
  check('regionDe: norte sigue igual (kanto, johto) y el sur es alola', r.regiones.join() === 'kanto,johto,kanto,alola,alola,alola');
  check('el clima del sur es de yungas (selva)', r.clima === 'yungas');
  check('los nombres de zona del sur (' + r.zona.join(' | ') + ')', r.zona[0].startsWith('Alola') && r.zona[1] === 'Alola · Termas de Reyes' && r.zona[2].includes('San Francisco') && !r.zona[3].startsWith('Alola'));
  check('la puerta del borde sur de San Salvador está abierta (3 de ancho)', r.puerta.slice(0, 3).every(c => c === '.') && r.puerta[3] === '#');
  check('4 altares nuevos en el sur', r.altares === 4);
  check('en Alola sólo salen Pokémon de Alola', r.pokes === 'alola');
  check('legendarios de Alola en los altares (' + r.legendarios + ')', r.legendarios.length > 0);
  check('la cueva tiene altar de Alola', r.cueva);
  check('se camina desde la puerta hasta el Centro, la cueva y los 4 altares', r.llegaCueva && r.llegaCentro && r.llegaAltar);
  check('el río se cruza por el puente (ida y vuelta)', r.cruzaRio);
  check('parado en el sur el juego sabe que está en alola y en el norte en kanto', r.advRegion === 'alola' && r.advRegionN === 'kanto');
  check('con el evento (mapa cerrado) el sur queda clausurado y el norte de Valles no', r.cerrado.join() === 'true,false,true' && r.abierto === false);
  await page.screenshot({path: '/tmp/claude-0/-root/b70858be-5edb-4e9c-bb87-88f6028271ef/scratchpad/sur.png'});
  const E = r.eje;
  check('Concejo en la punta norte (y 1-2, x 39-42, sobre la Av. Bolivia)', E.concejo && E.concejo.y < 3 && E.concejo.x > 38 && E.concejo.n === 8);
  check('Casa de Gobierno entre el Parque San Martín (oeste) y la Plaza Belgrano (este): x 21-25, fila 14', E.gobierno && E.gobierno.x === 23 && E.gobierno.y === 14);
  check('orden de norte a sur: Concejo < Gobierno < Municipalidad < Estadio < Terminal < Alto Comedero', E.concejo.y < E.gobierno.y && E.gobierno.y < E.muni.y && E.muni.y < E.estadio.y && E.estadio.y < E.terminal.y && E.terminal.y < 103);
  check('Municipalidad pasando el Xibi Xibi (y 39-40) y estadio del Lobo (y 50-51) después', E.muni.y > 38 && E.muni.y < 41 && E.estadio.y > 49 && E.estadio.y < 52);
  check('se dibujan los 4 edificios nuevos', ['concejo', 'municipalidad', 'estadio', 'terminal'].every(t => r.edificios.includes(t)));
  check('sin errores de JS', errores.length === 0); if(errores.length) console.log(errores);
  console.log('\n' + ok + ' ok · ' + fail + ' fallan');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
