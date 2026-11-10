let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'))}
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:900, height:700} });
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  await page.goto('file:///root/pokemon/index.html'); await page.click('#portadaEntrar', {force:true});
  await page.fill('#nameInput', 'TestTren'); await page.click('#nameSaveBtn'); await page.waitForTimeout(700);
  if(await page.isVisible('#avatarOverlay')){ await page.click('.avatar-op[data-avatar="red"]'); await page.waitForTimeout(200); }
  for(let i = 0; i < 4; i++){
    if(await page.isVisible('#specialContinueBtn')){ await page.click('#specialContinueBtn'); await page.waitForTimeout(500); }
    if(await page.isVisible('#battleCloseBtn')){ await page.click('#battleCloseBtn'); await page.waitForTimeout(300); }
  }
  await page.click('#advBtn'); await page.waitForTimeout(600);
  console.log('\n— Tren Solar (mundo v7: recorre TODA la grilla 3x3) —');
  const rec = await page.evaluate(() => {
    const r = {regiones: new Set(), fuera: 0, muestras: 0, paradas: new Set(), saltoMax: 0};
    let ant = null;
    for(let t = 0; t < TREN_CICLO; t += 250){
      const e = trenEstado(t); r.muestras++;
      const ch = ADV_MAPS.overworld.rows[Math.round(e.y)][Math.round(e.x)];
      if(!(ADV_TILE[ch] && ADV_TILE[ch].walk)) r.fuera++;
      r.regiones.add(regionDe(Math.round(e.x), Math.round(e.y)));
      if(e.parado) r.paradas.add(e.est);
      if(ant) r.saltoMax = Math.max(r.saltoMax, Math.abs(e.x - ant.x) + Math.abs(e.y - ant.y));
      ant = e;
    }
    return {regiones: [...r.regiones].sort(), fuera: r.fuera, muestras: r.muestras, paradas: [...r.paradas].sort(), saltoMax: r.saltoMax, n: TREN_DATOS.paradas.length};
  });
  console.log('  regiones:', rec.regiones.join(','), '· paradas:', rec.paradas.join(','), '· salto máx', rec.saltoMax.toFixed(2));
  check('el tren recorre las 7 regiones', rec.regiones.length === 7);
  check('el tren para en las 7 estaciones', rec.paradas.length === rec.n && rec.n === 7);
  check('en todo el recorrido va sobre casilleros caminables (vía/puente/estación)', rec.fuera === 0);
  check('no da saltos (muestras cada 250 ms avanzan <= 1,1 casillero)', rec.saltoMax <= 1.1);
  const paradas = await page.evaluate(() => TREN_DATOS.paradas.map(p => ({n: p.n, x: p.x, y: p.y, baja: p.baja, ok: (() => { const c = ADV_MAPS.overworld.rows[p.baja[1]][p.baja[0]]; return !!(ADV_TILE[c] && ADV_TILE[c].walk); })()})));
  check('el lugar donde se baja en cada estación es caminable', paradas.every(p => p.ok));
  const fijar = (tt, x, y) => page.evaluate(([tt, x, y]) => { Date.now = () => tt; advPonerEn(x, y); advEje = {x:0, y:0}; }, [tt, x, y]);
  const momento = (est) => page.evaluate(e => { let t = 0; for(const tr of TREN_TRAMOS){ if(tr.de === e) return t; t += TREN_PARADA + tr.ms; } return -1; }, est);
  // lejos de la estación no hay botón; cerca con el tren parado, sí; en marcha, no
  const cap = paradas[0], t0 = await momento(0);
  await fijar(t0 + 1000, cap.x + 10, cap.y - 1); await page.waitForTimeout(300);
  check('lejos de la estación no se ofrece subir', await page.evaluate(() => document.getElementById('advTrenBtn').hidden));
  await fijar(t0 + 1000, cap.baja[0], cap.baja[1]); await page.waitForTimeout(300);
  check('en la Capital, con el tren parado, aparece "Subir"', await page.evaluate(() => !document.getElementById('advTrenBtn').hidden && /Subir/.test(document.getElementById('advTrenBtn').textContent)));
  await page.click('#advTrenBtn'); await page.waitForTimeout(200);
  check('al tocar, el jugador sube al tren', await page.evaluate(() => advTrenAbordo === true));
  // viaja por todo el ciclo: baja en cada parada del ciclo, en su lugar, y la región cambia
  const ciclo = await page.evaluate(() => TREN_TRAMOS.map(t => t.de));
  let bien = 0, regs = [];
  for(let i = 1; i < ciclo.length; i++){
    const ti = await momento(ciclo[i]);
    await page.evaluate(([tt]) => { Date.now = () => tt; }, [ti + 500]); await page.waitForTimeout(250);
    const lleg = await page.evaluate(() => ({reg: advRegion, txt: document.getElementById('advTrenBtn').textContent, x: advX, y: advY}));
    regs.push(lleg.reg);
    if(/Bajar/.test(lleg.txt)) bien++;
  }
  check('en cada parada del ciclo ofrece "Bajar" (' + bien + '/' + (ciclo.length - 1) + ')', bien === ciclo.length - 1);
  check('viajando pasó por regiones distintas: ' + [...new Set(regs)].join(','), new Set(regs).size >= 6);
  // a mitad de un tramo vertical va en marcha y el jugador sigue al tren
  await page.evaluate(() => { const tr = TREN_TRAMOS[1]; let t = 0; for(const q of TREN_TRAMOS){ if(q === tr) break; t += TREN_PARADA + q.ms; } Date.now = () => t + TREN_PARADA + tr.ms * 0.55; });
  await page.waitForTimeout(300);
  const mov = await page.evaluate(() => { const e = trenEstado(Date.now()); return {viaja: /Viajando/.test(document.getElementById('advTrenBtn').textContent), dx: Math.abs(advX - e.x), dy: Math.abs(advY - e.y), hx: e.hx, hy: e.hy}; });
  check('en marcha el botón dice "Viajando" y el jugador va pegado al tren', mov.viaja && mov.dx <= 1.5 && mov.dy <= 1.5);
  await page.evaluate(() => { advEje = {x: -1, y: 0}; }); await page.waitForTimeout(300);
  check('arriba del tren no se camina', await page.evaluate(() => { const e = trenEstado(Date.now()); return Math.abs(advX - e.x) <= 1.5 && Math.abs(advY - e.y) <= 1.5; }));
  // baja en Alola
  const ta = await momento(6);
  await page.evaluate(([tt]) => { Date.now = () => tt; }, [ta + 500]); await page.waitForTimeout(300);
  await page.click('#advTrenBtn'); await page.waitForTimeout(300);
  const baj = await page.evaluate(() => ({a: advTrenAbordo, x: advX, y: advY, r: regionDe(advX, advY)}));
  const alola = paradas[6];
  check('bajó en San Pedro de Jujuy (Alola) junto a la vía', baj.a === false && baj.x === alola.baja[0] && baj.y === alola.baja[1] && baj.r === 'alola');
  check('sin errores de JS', errores.length === 0);
  if(errores.length) console.log(errores);
  console.log(`\n${ok} ok · ${fail} fallan`);
  await browser.close(); process.exit(fail ? 1 : 0);
})();
