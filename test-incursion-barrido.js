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
  await page.fill('#nameInput', 'TestBarrido'); await page.click('#nameSaveBtn'); await page.waitForTimeout(700);
  if(await page.isVisible('#avatarOverlay')){ await page.click('.avatar-op[data-avatar="red"]'); await page.waitForTimeout(200); }
  for(let i = 0; i < 4; i++){ for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await page.isVisible(s)) await page.evaluate(s => document.querySelector(s).click(), s); await page.waitForTimeout(250); }
  const eq = [{id: 25, f: 60, c: 'aa'}, {id: 6, f: 70, c: 'bb'}, {id: 9, f: 65, c: 'cc'}];
  const m = {t: 'empezar', multi: true, modo: 'raid', miSlot: 0, hostJefe: 0, jefe: {slot: 5, id: 150, f: 97, vida: 12},
    jugadores: [0, 1, 2, 3, 4].map(s => ({slot: s, nombre: s ? 'Amigo ' + s : 'TestBarrido', bando: 'A', equipo: eq}))};
  await page.evaluate(m => { document.getElementById('arenaOverlay').classList.add('show'); window.__incursionPrueba(m); }, m);
  await page.waitForTimeout(3600);
  console.log('\n— Rayo barredor del legendario —');
  /* todos con muchísima vida; se anota la vida de cada uno para ver a cuántos les pega el rayo */
  await page.evaluate(() => { const A = __arena.estado(); A.lados.filter(l => A.bando[l] === 'A').forEach(l => A[l].mons.forEach(mm => { mm.max = 99999; mm.hp = 99999; })); window.__fx = {largos: 0, medios: 0, barr: 0, rectos: true, esq: 0}; });
  /* cuenta cuántos tiros del jefe hay y si alguno tiene arco / persecución, y las veces que esquiva */
  await page.evaluate(() => { const E = __arena.ent(), A = __arena.estado();
    window.__t = setInterval(() => {
      for(const p of A.proys) if(p.lado === 'riv'){ if(p.arco || p.wobble || p.homing || p.boom) window.__fx.rectos = false; if(p.vida0 < 1) window.__fx.corto = (window.__fx.corto || 0) + 1; }
      const a = E.riv.accion; if(a && a.barr) window.__fx.barr = Math.max(window.__fx.barr, a.barr.t);
      if(E.riv.rodando) window.__fx.esq++;
      A.lados.filter(l => A.bando[l] === 'A').forEach(l => { E[l].invul = 0; });
    }, 30); });
  /* fuerza un largo ya */
  await page.evaluate(() => { const E = __arena.ent(); E.riv.bot.cicloI = 2; E.riv.bot.t = 0; E.riv.bot.modo = 'orbitar'; });
  const hp0 = await page.evaluate(() => { const A = __arena.estado(); return A.lados.filter(l => A.bando[l] === 'A').map(l => A[l].mons[0].hp); });
  /* en el celular de cada uno sólo se resta la vida PROPIA (los otros 4 son remotos), así que además se mide cuántos Pokémon pasa por encima el rayo */
  const r = await page.evaluate(() => new Promise(res => { const E = __arena.ent(), A = __arena.estado(); let vioBarr = false, angs = [], quienes = new Set(), tocados = new Set(), n = 0;
    const lados = A.lados.filter(l => A.bando[l] === 'A'), h0 = Object.fromEntries(lados.map(l => [l, A[l].mons[0].hp]));
    const ctr = e => { const r = e.wrap.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.max(r.width, r.height) / 2}; };
    const t = setInterval(() => { const a = E.riv.accion; if(a && a.barr){ vioBarr = true; const ang = a.barr.a0 + a.barr.sign * 1.4 * Math.min(1, a.barr.t / 2.6); angs.push(ang);
        const b = ctr(E.riv), dx = Math.cos(ang), dy = Math.sin(ang);
        lados.forEach(l => { const o = ctr(E[l]), vx = o.x - b.x, vy = o.y - b.y; if(vx * dx + vy * dy > 0 && Math.abs(vx * dy - vy * dx) <= 28) tocados.add(l); }); }
      lados.forEach(l => { if(A[l].mons[0].hp < h0[l]) quienes.add(l); }); if(++n >= 160){ clearInterval(t); res({vioBarr, angs, golpeados: [...quienes], tocados: [...tocados], elem: !!document.querySelector('.ar-barrido')}); } }, 50); }));
  check('el legendario lanza un rayo barredor', r.vioBarr);
  check('el rayo dura al menos 2 s (llegó a ' + ((await page.evaluate(() => window.__fx.barr)).toFixed(2)) + ' s)', (await page.evaluate(() => window.__fx.barr)) >= 2);
  const mov = r.angs.length ? Math.abs(r.angs[r.angs.length - 1] - r.angs[0]) : 0;
  check('el rayo se mueve (giró ' + (mov * 57.3).toFixed(0) + '°)', mov > .8);
  check('el rayo pasa por encima de varios (' + r.tocados.length + ' de 5: ' + r.tocados.join() + ')', r.tocados.length >= 3);
  check('y le saca vida al mío cuando lo toca (' + r.golpeados.join() + ')', !r.tocados.includes('yo') || r.golpeados.includes('yo'));
  const fx = await page.evaluate(() => { clearInterval(window.__t); return window.__fx; });
  check('los tiros del legendario son rectos (sin arco ni curva)', fx.rectos);
  check('no quedan rayos colgados al terminar', await page.evaluate(() => new Promise(res => setTimeout(() => res(!document.querySelector('.ar-barrido') || !__arena.ent().riv.accion), 4000))));
  check('sin errores de página', errores.length === 0); if(errores.length) console.log(errores);
  await page.screenshot({path: '/tmp/claude-0/-root/7cdff047-2e8c-47f6-bfc1-2267af628ffb/scratchpad/barrido.png'});
  console.log(`\n${ok} ✅  ${fail} ❌`); await browser.close(); process.exit(fail ? 1 : 0);
})();
