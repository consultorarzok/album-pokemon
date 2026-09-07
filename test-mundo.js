const { chromium } = require('playwright');

let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:1024, height:700} });
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file:///root/pokemon/index.html');
  await page.fill('#nameInput', 'TestMundo');
  await page.click('#nameSaveBtn');
  await page.waitForTimeout(700);
  for(let i = 0; i < 4; i++){
    if(await page.isVisible('#specialContinueBtn')){ await page.click('#specialContinueBtn'); await page.waitForTimeout(500); }
    if(await page.isVisible('#battleCloseBtn')){ await page.click('#battleCloseBtn'); await page.waitForTimeout(300); }
  }

  console.log('\n— El mundo —');
  await page.click('#advBtn');
  await page.waitForTimeout(500);
  const mundo = await page.evaluate(() => {
    const m = ADV_MAPS.overworld, cv = document.getElementById('advMap');
    return {
      cols: m.cols, filas: m.rows.length,
      anchoOk: cv.clientWidth === window.innerWidth && cv.clientHeight === window.innerHeight,
      fondo: advFondo('overworld').width + 'x' + advFondo('overworld').height,
      centros: m.rows.join('').split('P').length - 1,
      cuevas:  m.rows.join('').split('C').length - 1,
      region: advRegion, x: advX, y: advY
    };
  });
  check(`mundo gigante de ${mundo.cols}x${mundo.filas} = ${mundo.cols * mundo.filas} casilleros`, mundo.cols === 160 && mundo.filas === 84);
  check('el juego ocupa toda la pantalla', mundo.anchoOk);
  check('fondo pre-dibujado 2560x1344 px', mundo.fondo === '2560x1344');
  check('hay un Centro Pokémon por región', mundo.centros === 3);
  check('hay una cueva por región', mundo.cuevas === 3);
  check('arranca en Kanto', mundo.region === 'kanto');

  console.log('\n— Las 3 regiones —');
  const regs = await page.evaluate(() => ({
    /* Se muestrea el centro de cada franja a partir de FRONTERAS, así el test
       no se rompe cada vez que cambia el ancho del mapa. */
    limites: (() => {
      const cortes = FRONTERAS.map(f => Math.min(f.hasta, ADV_MAPS.overworld.cols - 1));
      let desde = 0;
      return cortes.map(hasta => { const x = Math.round((desde + hasta) / 2); desde = hasta; return regionDe(x); });
    })(),
    kanto: [...new Set(poolBioma('hierba', 'kanto').map(p => p.region))],
    johto: [...new Set(poolBioma('agua', 'johto').map(p => p.region))],
    hoenn: [...new Set(poolBioma('volcan', 'hoenn').map(p => p.region))],
    legKanto: poolBioma('legendario', 'kanto').map(p => p.name).slice(0, 3),
    zonas: ADV_MAPS.overworld.zonas.length
  }));
  check('el mapa se divide en kanto/johto/hoenn', regs.limites.join(',') === 'kanto,johto,hoenn');
  check('en Kanto sólo salen Pokémon de Kanto', regs.kanto.join() === 'kanto');
  check('en Johto sólo salen Pokémon de Johto', regs.johto.join() === 'johto');
  check('en Hoenn sólo salen Pokémon de Hoenn', regs.hoenn.join() === 'hoenn');
  check('los legendarios también son de la región (' + regs.legKanto.join(', ') + ')', regs.legKanto.length > 0);
  check('hay zonas con nombre (' + regs.zonas + ')', regs.zonas >= 10);

  console.log('\n— Movimiento fluido —');
  const antes = await page.evaluate(() => ({px: advPx, py: advPy}));
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(700);
  const medio = await page.evaluate(() => ({px: advPx, py: advPy, paso: advPaso, dir: advDir}));
  await page.keyboard.up('ArrowDown');
  await page.waitForTimeout(150);
  const quieto1 = await page.evaluate(() => advPy);
  await page.waitForTimeout(300);
  const quieto2 = await page.evaluate(() => advPy);
  check('camina en píxeles, no de a saltos de casillero', medio.py > antes.py && (medio.py - antes.py) % 16 !== 0);
  check('mira hacia donde camina', medio.dir === 'abajo');
  check('anima el paso mientras camina', medio.paso > 0);
  check('se frena al soltar la tecla', Math.abs(quieto2 - quieto1) < 0.5);

  const choque = await page.evaluate(async () => {
    advPonerEn(1, 1);                       // pegado al borde de árboles
    const y0 = advPy;
    advEje = {x:0, y:-1};
    for(let i = 0; i < 30; i++) advPaso1(1 / 60);
    advEje = {x:0, y:0};
    return {y0, y1: advPy, tile: advY};
  });
  /* Los pies son la caja de choque, así que la cabeza puede solapar medio
     casillero contra el árbol; lo que no puede es cruzarlo. */
  check('los árboles frenan al jugador', choque.tile === 1 && (choque.y0 - choque.y1) < 10);

  console.log('\n— El agua no se camina —');
  const agua = await page.evaluate(() => {
    const m = ADV_MAPS.overworld;
    let orilla = null;
    for(let y = 2; y < m.rows.length - 2 && !orilla; y++)
      for(let x = 2; x < m.cols - 2; x++)
        if(m.rows[y][x] === 'a' && m.rows[y][x + 1] === '~'){ orilla = {x, y}; break; }
    advPonerEn(orilla.x, orilla.y);
    const x0 = advPx;
    advEje = {x:1, y:0};
    for(let i = 0; i < 90; i++) advPaso1(1 / 60);
    advEje = {x:0, y:0};
    const tile = ADV_TILE[m.rows[advY][advX]];
    return {orilla, avanzo: advPx - x0, sobreAgua: !tile.walk, mojado: m.rows[advY][advX] === '~'};
  });
  check('no se puede entrar al agua desde la orilla', !agua.mojado && agua.avanzo < 16);
  check('el agua está marcada como no caminable', await page.evaluate(() => ADV_TILE['~'].walk === false));
  check('la orilla es la que saca los Pokémon de agua', await page.evaluate(() => ADV_TILE['a'].encuentro === 'agua'));
  const puente = await page.evaluate(() => {
    const m = ADV_MAPS.overworld;
    let ancho = 0, filas = new Set();
    for(let y = 0; y < m.rows.length; y++){
      const n = m.rows[y].split('').filter(c => c === 'B').length;
      if(n){ filas.add(y); ancho = Math.max(ancho, n); }
    }
    return {filas:[...filas], ancho};
  });
  check(`el puente cruza el río entero (${puente.ancho} casilleros de largo, filas ${puente.filas.join(' y ')})`, puente.ancho >= 6);

  console.log('\n— Encuentros más espaciados —');
  const probs = await page.evaluate(() => ({prob: ADV_PROB, descanso: DESCANSO_ENCUENTRO}));
  check('la hierba tira ' + Math.round(probs.prob.hierba * 100) + '% por casillero (antes 18%)', probs.prob.hierba <= .08);
  check('tras un encuentro hay ' + probs.descanso / 16 + ' casilleros de descanso', probs.descanso >= 48);
  const seguidos = await page.evaluate(() => {
    // camino 200 casilleros por hierba alta y cuento cuántos encuentros salen
    const m = ADV_MAPS.overworld;
    let hierba = null;
    for(let y = 2; y < m.rows.length - 2 && !hierba; y++)
      for(let x = 2; x < m.cols - 20; x++)
        if(m.rows[y].slice(x, x + 18).split('').every(c => c === '"')){ hierba = {x, y}; break; }
    let cuenta = 0;
    const original = iniciarEncuentro;
    window.iniciarEncuentro = () => { cuenta++; };
    for(let vuelta = 0; vuelta < 12; vuelta++){
      advPonerEn(hierba.x, hierba.y);
      advDescanso = 0;
      advEje = {x:1, y:0};
      for(let i = 0; i < 260; i++) advPaso1(1 / 60);   // ~15 casilleros
    }
    advEje = {x:0, y:0};
    window.iniciarEncuentro = original;
    return cuenta;
  });
  check(`caminando ~180 casilleros de hierba salieron ${seguidos} encuentros (antes ~32)`, seguidos > 0 && seguidos < 22);

  console.log('\n— Joystick —');
  const stick = await page.evaluate(() => {
    const el = document.getElementById('advStick');
    const r = el.getBoundingClientRect();
    return {x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width};
  });
  await page.mouse.move(stick.x, stick.y);
  await page.mouse.down();
  await page.mouse.move(stick.x + 45, stick.y);   // empujo a la derecha
  await page.waitForTimeout(400);
  const conStick = await page.evaluate(() => ({eje: advEje, dir: advDir, x: advPx}));
  await page.mouse.up();
  await page.waitForTimeout(200);
  const sueltoStick = await page.evaluate(() => advEje);
  check('el joystick empuja hacia donde lo arrastrás', conStick.eje.x > .5 && conStick.dir === 'der');
  check('al soltar el joystick el jugador para', sueltoStick.x === 0 && sueltoStick.y === 0);

  console.log('\n— Pokébolas del piso (PNG) —');
  const item = await page.evaluate(() => {
    const m = ADV_MAPS.overworld;
    for(let y = 0; y < m.rows.length; y++) for(let x = 0; x < m.cols; x++) if(m.rows[y][x] === 'b') return {x, y};
    return null;
  });
  const tomar = await page.evaluate(({x, y}) => {
    const antes = bolas.roja;
    advPonerEn(x, y - 1);
    advEje = {x:0, y:1};
    for(let i = 0; i < 40; i++) advPaso1(1 / 60);
    const media = bolas.roja;
    advPonerEn(x, y - 1);
    for(let i = 0; i < 40; i++) advPaso1(1 / 60);
    advEje = {x:0, y:0};
    return {antes, media, fin: bolas.roja};
  }, item);
  check('levantar una pokébola del piso suma 1', tomar.media === tomar.antes + 1);
  check('la misma pokébola no se puede levantar dos veces', tomar.fin === tomar.media);
  check('las bolas usan los PNG del CDN', await page.evaluate(() => BOLAS.roja.img.endsWith('poke-ball.png') && BOLAS.maestra.img.endsWith('master-ball.png')));
  const cuatro = await page.evaluate(() => ({
    tipos: Object.keys(BOLAS),
    ultra: BOLAS.ultra.img.endsWith('ultra-ball.png'),
    chancesLegendario: Object.keys(BOLAS).map(t => chanceCaptura(DATA.find(p => p.name === 'Mewtwo'), t)),
    precios: Object.keys(BOLAS).map(t => BOLAS[t].precio)
  }));
  check('4 pokébolas: roja, azul, ultra y master', cuatro.tipos.join() === 'roja,azul,ultra,maestra');
  check('la Ultra Ball usa su PNG', cuatro.ultra);
  check('contra un legendario: ' + cuatro.chancesLegendario.join('% / ') + '%', cuatro.chancesLegendario.join() === '6,10,16,100');
  check('la Master atrapa seguro y sale 500 (' + cuatro.precios.join('/') + ')', cuatro.precios.join() === '50,60,120,500');

  console.log('\n— Centro Pokémon —');
  const tienda = await page.evaluate(() => {
    const m = ADV_MAPS.overworld;
    for(let y = 0; y < m.rows.length; y++) for(let x = 0; x < m.cols; x++) if(m.rows[y][x] === 'P') return {x, y};
  });
  check('el Centro ocupa 2x2 (techo + paredes)', await page.evaluate(({x, y}) => {
    const m = ADV_MAPS.overworld;
    return m.rows[y - 1][x] === 'p' && m.rows[y - 1][x + 1] === 'q' && m.rows[y][x + 1] === 'r';
  }, tienda));
  await page.evaluate(({x, y}) => { advPonerEn(x, y + 1); advEje = {x:0, y:-1}; for(let i = 0; i < 40; i++) advPaso1(1/60); advEje = {x:0,y:0}; }, tienda);
  await page.waitForTimeout(300);
  check('entrar por la puerta abre la tienda', await page.isVisible('#shopList'));
  const m0 = await page.evaluate(() => [coins, bolas.roja]);
  await page.locator('#shopList .shop-row button').first().click();
  await page.waitForTimeout(200);
  const m1 = await page.evaluate(() => [coins, bolas.roja]);
  check('la Poké Ball x6 cuesta 50 monedas', m1[0] === m0[0] - 50 && m1[1] === m0[1] + 6);
  console.log('\n— Master Ball: una por día —');
  const master = await page.evaluate(() => {
    coins = 5000; updateCoins();
    const antes = bolas.maestra;
    const pudo1 = puedeComprar('maestra');
    comprarBola('maestra');
    const trasUna = bolas.maestra;
    const pudo2 = puedeComprar('maestra');
    comprarBola('maestra');
    const trasDos = bolas.maestra;
    const otras = ['roja','azul','ultra'].every(t => puedeComprar(t));
    return {antes, trasUna, trasDos, pudo1, pudo2, otras, dia: Object.keys(comprasDia)[0]};
  });
  check('se puede comprar una Master', master.pudo1 && master.trasUna === master.antes + 1);
  check('la segunda del día ya no se vende', !master.pudo2 && master.trasDos === master.trasUna);
  check('las otras bolas no tienen tope', master.otras);
  check('el tope se guarda por día (' + master.dia + ')', /^\d{4}-\d{2}-\d{2}$/.test(master.dia));
  const topeTrasRecarga = await page.evaluate(() => {
    saveProgress();
    comprasDia = {};                       // simulo que se reabre el juego
    loadProgress();
    return puedeComprar('maestra');
  });
  check('el tope sobrevive a recargar la página', topeTrasRecarga === false);
  const otroDia = await page.evaluate(() => { comprasDia = {'2020-01-01': {maestra: 1}}; return puedeComprar('maestra'); });
  check('al día siguiente se puede comprar de nuevo', otroDia === true);
  await page.evaluate(() => { comprasDia = {}; saveProgress(); });
  await page.click('#shopCloseBtn');
  await page.waitForTimeout(200);

  console.log('\n— Encuentro y captura —');
  await page.evaluate(() => { const p = ADV_DATA.find(x => x.name === 'Bulbasaur'); state[p.id] = {got:false, dup:0}; iniciarEncuentro(p); });
  await page.waitForTimeout(300);
  check('se abre el encuentro', await page.isVisible('#encOverlay'));
  check('3 tiros', await page.locator('#encTiros img').count() === 3);
  check('la roja marca 70% para un Común', (await page.locator('#encBolas .bola-btn').first().textContent()).includes('70%'));
  await page.evaluate(() => { Math.random = () => 0.001; });
  await page.locator('#encBolas .bola-btn').first().click();
  await page.waitForTimeout(1400);
  check('lo atrapa y entra al álbum', await page.evaluate(() => state[DATA.find(p => p.name === 'Bulbasaur').id].got === true));
  if(await page.isVisible('#closeBtn')) await page.click('#closeBtn');
  await page.waitForTimeout(200);

  console.log('\n— Cuevas (3 entradas, cada una vuelve a la suya) —');
  const cuevas = await page.evaluate(() => {
    const m = ADV_MAPS.overworld, r = [];
    for(let y = 0; y < m.rows.length; y++) for(let x = 0; x < m.cols; x++) if(m.rows[y][x] === 'C') r.push({x, y});
    return r;
  });
  let vueltasOk = 0;
  for(const c of cuevas){
    const r = await page.evaluate(({x, y}) => {
      advMapa = 'overworld'; advPonerEn(x, y);
      advIrA('cueva');
      const dentro = advMapa;
      advIrA('overworld');
      return {dentro, x: advX, y: advY, destinoX: x, destinoY: y, region: advRegion};
    }, c);
    if(r.dentro === 'cueva' && Math.abs(r.x - c.x) <= 2 && Math.abs(r.y - c.y) <= 2) vueltasOk++;
  }
  check(`las ${cuevas.length} cuevas devuelven a su propia entrada`, vueltasOk === cuevas.length);
  check('el altar sigue dando legendarios', await page.evaluate(() => poolBioma('legendario', 'johto').every(p => p.rarity === 'Legendario')));

  console.log('\n— Se puede llegar caminando a todo —');
  const alcance = await page.evaluate(() => {
    const m = ADV_MAPS.overworld;
    const clave = (x, y) => x + ',' + y;
    let ini;
    for(let y = 0; y < m.rows.length; y++) for(let x = 0; x < m.cols; x++) if(m.rows[y][x] === '@') ini = {x, y};
    const vistos = new Set([clave(ini.x, ini.y)]);
    const cola = [ini];
    while(cola.length){
      const {x, y} = cola.shift();
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if(nx < 0 || ny < 0 || ny >= m.rows.length || nx >= m.cols) return;
        if(vistos.has(clave(nx, ny))) return;
        const t = ADV_TILE[m.rows[ny][nx]];
        if(!t || !t.walk) return;
        vistos.add(clave(nx, ny));
        cola.push({x:nx, y:ny});
      });
    }
    const dondeHay = ch => {
      const r = [];
      for(let y = 0; y < m.rows.length; y++) for(let x = 0; x < m.cols; x++) if(m.rows[y][x] === ch) r.push({x, y});
      return r;
    };
    const alcanza = lista => lista.filter(p => vistos.has(clave(p.x, p.y))).length;
    const porRegion = {};
    ['kanto','johto','hoenn'].forEach(r => {
      porRegion[r] = {hierba:0, orilla:0};
      vistos.forEach(k => {
        const [x, y] = k.split(',').map(Number);
        if(regionDe(x) !== r) return;
        const ch = m.rows[y][x];
        if(ch === '"') porRegion[r].hierba++;
        if(ch === 'a') porRegion[r].orilla++;
      });
    });
    return {
      centros: alcanza(dondeHay('P')) + '/' + dondeHay('P').length,
      cuevas:  alcanza(dondeHay('C')) + '/' + dondeHay('C').length,
      bolas:   alcanza(dondeHay('b')) + '/' + dondeHay('b').length,
      porRegion, total: vistos.size
    };
  });
  check('se llega a los 3 Centros (' + alcance.centros + ')', alcance.centros === '3/3');
  check('se llega a las 3 cuevas (' + alcance.cuevas + ')', alcance.cuevas === '3/3');
  const [bolasOk, bolasTot] = alcance.bolas.split('/');
  check('se llega a todas las pokébolas del piso (' + alcance.bolas + ')', bolasOk === bolasTot && +bolasTot > 0);
  ['kanto','johto','hoenn'].forEach(r => {
    const z = alcance.porRegion[r];
    check(`en ${r} hay hierba (${z.hierba}) y orilla (${z.orilla}) accesibles`, z.hierba > 20 && z.orilla > 5);
  });

  console.log('\n— Regiones separadas: un solo paso ---');
  const cruce = await page.evaluate(() => {
    const m = ADV_MAPS.overworld;
    const paso = (bloq) => {
      const k = (x, y) => x + ',' + y;
      const vistos = new Set(['3,3']), cola = [{x:3, y:3}];
      while(cola.length){
        const {x, y} = cola.shift();
        for(const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const nx = x + dx, ny = y + dy;
          if(nx < 0 || ny < 0 || ny >= m.rows.length || nx >= m.cols) continue;
          if(vistos.has(k(nx, ny)) || bloq(nx, ny)) continue;
          const t = ADV_TILE[m.rows[ny][nx]];
          if(!t || !t.walk) continue;
          vistos.add(k(nx, ny)); cola.push({x:nx, y:ny});
        }
      }
      return vistos;
    };
    const normal = paso(() => false);
    const sinPuente = paso((x, y) => m.rows[y][x] === 'B');
    const llegaA = (set, region) => [...set].some(k => regionDe(Number(k.split(',')[0])) === region);
    return {
      johtoNormal: llegaA(normal, 'johto'),
      hoennNormal: llegaA(normal, 'hoenn'),
      johtoSinPuente: llegaA(sinPuente, 'johto'),
      puentes: m.rows.join('').split('B').length - 1,
      toriis: m.rows.join('').split('T').length - 1,
      carteles: Object.keys(m.carteles).length
    };
  });
  check('caminando se llega a Johto y a Hoenn', cruce.johtoNormal && cruce.hoennNormal);
  check('sin el puente Johto es inalcanzable: el río separa de verdad', !cruce.johtoSinPuente);
  check('el paso tiene arcos y carteles (' + cruce.toriis + ' torii, ' + cruce.carteles + ' carteles)', cruce.toriis >= 4 && cruce.carteles >= 5);

  const cartel = await page.evaluate(async (pasoY) => {
    /* Los encuentros se apagan un momento: si salta uno al cruzar, su mensaje
       pisa el cartel de la región y el test mide cualquier cosa. Se anula
       iniciarEncuentro en vez de ADV_PROB porque advPaso1 tiene un `|| .15`
       de reserva y poner las probabilidades en 0 no alcanza. */
    const encOriginal = iniciarEncuentro;
    window.iniciarEncuentro = () => {};
    const m = ADV_MAPS.overworld;
    let xPuente = 0;
    for(let x = 0; x < m.cols; x++) if(m.rows[pasoY][x] === 'B'){ xPuente = x; break; }
    advPonerEn(xPuente - 2, pasoY); advRegionAnterior = 'kanto'; advRegion = 'kanto';
    advEje = {x:1, y:0};
    for(let i = 0; i < 240; i++) advPaso1(1 / 60);
    advEje = {x:0, y:0};
    const box = document.getElementById('advZona');
    const r = {texto: box.textContent, grande: box.classList.contains('grande'), region: advRegion};
    window.iniciarEncuentro = encOriginal;
    return r;
  }, 42);
  check('al cruzar avisa en qué región entrás ("' + cartel.texto.slice(0, 28) + '…")', cartel.grande && /JOHTO/.test(cartel.texto));

  console.log('\n— Legendarios: cada altar el suyo, uno por día —');
  const altares = await page.evaluate(() => Object.entries(ADV_MAPS.overworld.santuarios).map(([k, s]) => ({k, n:s.n, pokes:s.pokes})));
  check(`${altares.length} altares repartidos por el mundo`, altares.length >= 6);
  /* Zeta fue explícito: ningún par de altares pegados. El generador lo valida
     al armar el mapa; acá se vuelve a chequear sobre lo que quedó publicado. */
  const distAltares = await page.evaluate(() => {
    const p = Object.keys(ADV_MAPS.overworld.santuarios).map(k => k.split(',').map(Number));
    let min = Infinity, par = null;
    for(let i = 0; i < p.length; i++) for(let j = i + 1; j < p.length; j++){
      const d = Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]);
      if(d < min){ min = d; par = [p[i], p[j]]; }
    }
    return {min: Math.round(min), par};
  });
  check(`ningún altar pegado a otro (el más cerca, a ${distAltares.min})`, distAltares.min >= 25);
  check('un solo altar en la cueva', await page.evaluate(() =>
    ADV_MAPS.cueva.rows.join('').split('').filter(c => c === 'L').length === 1));
  check('cada altar tiene sus propios legendarios', new Set(altares.flatMap(a => a.pokes)).size === altares.flatMap(a => a.pokes).length);
  check('Mewtwo ya no comparte altar con Mew', await page.evaluate(() =>
    ADV_MAPS.cueva.santuariosPorRegion.kanto.pokes.join() === 'Mewtwo' &&
    !Object.values(ADV_MAPS.overworld.santuarios).some(s => s.pokes.includes('Mewtwo'))));

  const salida = await page.evaluate((alt) => {
    legendariosDia = {dia: null, obtenidos: {}};
    Math.random = () => 0.01;
    const [x, y] = alt.k.split(',').map(Number);
    advMapa = 'overworld'; advPonerEn(x, y);
    let salio = null;
    const original = mostrarLegendarioEnMapa;
    window.mostrarLegendarioEnMapa = p => { salio = p.name; };
    const sacar = () => { salio = null; tirarAltar(x, y); return salio; };
    const primero = sacar();
    /* El altar tiene varios legendarios: se vacía sacándolos a todos, y recién
       ahí tiene que quedarse en silencio. */
    const restantes = alt.pokes.length - 1;
    for(let i = 0; i < restantes; i++) sacar();
    const agotado = sacar();
    const aviso = document.getElementById('advZona').textContent;
    window.mostrarLegendarioEnMapa = original;
    return {primero, anotados: Object.keys(legendariosDia.obtenidos), agotado, aviso, esperados: alt.pokes};
  }, altares[0]);
  check(`en ${altares[0].n} salió ${salida.primero} (de ${salida.esperados.join('/')})`, salida.esperados.includes(salida.primero));
  check('quedan anotados los que ya salieron hoy', salida.anotados.length === salida.esperados.length);
  check('agotado el altar, no sale ninguno más hoy', salida.agotado === null);
  check('el altar avisa cuáles salieron hoy', /ya aparecieron/.test(salida.aviso));
  const otroAltar = await page.evaluate((alt) => {
    Math.random = () => 0.01;
    const [x, y] = alt.k.split(',').map(Number);
    advPonerEn(x, y);
    let salio = null;
    const original = mostrarLegendarioEnMapa;
    window.mostrarLegendarioEnMapa = p => { salio = p.name; };
    tirarAltar(x, y);
    window.mostrarLegendarioEnMapa = original;
    return salio;
  }, altares[3]);
  check('el cupo es POR NOMBRE: otro altar sigue dando su legendario', otroAltar !== null);
  const guardado = await page.evaluate(() => {
    saveProgress();
    legendariosDia = {dia: null, obtenidos: {}};
    loadProgress();
    return legendariosDia;
  });
  check('lo que salió hoy sobrevive a recargar',
    guardado && guardado.dia === await page.evaluate(() => diaDeHoy()) && Object.keys(guardado.obtenidos).length > 0);
  const mañana = await page.evaluate(() => {
    legendariosDia = {dia:'2020-01-01', obtenidos:{Mew:'x'}};
    return legendarioYaSalioHoy('Mew');
  });
  check('al día siguiente vuelve a haber legendario', mañana === false);
  await page.evaluate(() => { legendariosDia = {dia: null, obtenidos: {}}; saveProgress(); });

  console.log('\n— Minimapa —');
  const mini = await page.evaluate(() => {
    advMapa = 'overworld'; advRender();
    const cv = document.getElementById('advMini');
    const fuera = cv.hidden;
    advMapa = 'cueva'; advRender();
    const enCueva = document.getElementById('advMini').hidden;
    advMapa = 'overworld'; advPonerEn(3, 3); advRender();
    return {fuera, enCueva, ancho: cv.width, alto: cv.height};
  });
  check('el minimapa se ve en el mundo (' + mini.ancho + 'x' + mini.alto + ')', !mini.fuera);
  check('el minimapa se esconde adentro de la cueva', mini.enCueva);

  console.log('\n— Que no se pisen los carteles —');
  const solapes = await page.evaluate(() => {
    bolas.azul = 2; bolas.ultra = 1; bolas.maestra = 1; advSyncHud(); saveProgress();
    advMensaje('📍 <b>Kanto · Pradera</b>');
    const caja = sel => { const b = document.querySelector(sel).getBoundingClientRect();
      return {x:b.x, y:b.y, der:b.right, ab:b.bottom, w:b.width, h:b.height}; };
    const choca = (a, b) => !(a.der <= b.x || b.der <= a.x || a.ab <= b.y || b.ab <= a.y);
    const hud = caja('.adv-hud'), mini = caja('#advMini'), back = caja('.adv-back'),
          stick = caja('#advStick'), zona = caja('#advZona');
    return {
      hudFuera: hud.der > innerWidth + 1 || hud.x < -1,
      miniFuera: mini.der > innerWidth + 1 || mini.ab > innerHeight + 1,
      zonaPisaMini: choca(zona, mini), zonaPisaHud: choca(zona, hud),
      backPisaHud: choca(back, hud), stickPisaZona: choca(stick, zona)
    };
  });
  check('el HUD entra en la pantalla', !solapes.hudFuera);
  check('el minimapa entra en la pantalla', !solapes.miniFuera);
  check('el cartel no tapa el minimapa', !solapes.zonaPisaMini);
  check('el cartel no tapa el HUD', !solapes.zonaPisaHud);
  check('el botón Atrás no pisa el HUD', !solapes.backPisaHud);

  console.log('\n— Regalo y persistencia —');
  check('hay 1500 monedas cargadas para zeta centeno', await page.evaluate(() =>
    REGALOS.some(r => r.para === 'zeta centeno' && r.monedas === 1500)));
  const bolasAntes = await page.evaluate(() => JSON.stringify(bolas));
  await page.reload();
  await page.waitForTimeout(900);
  const bolasDespues = await page.evaluate(() => JSON.stringify(bolas));
  check('las pokébolas sobreviven al recargar', bolasAntes === bolasDespues);

  check('sin errores de JS', errores.length === 0);
  if(errores.length) console.log(errores.slice(0, 5));
  console.log(`\n${ok} ok · ${fail} fallan`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
