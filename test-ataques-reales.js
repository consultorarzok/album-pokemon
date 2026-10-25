/* Ataques reales por ejemplar: cada botón muestra un ataque que ese Pokémon aprende de verdad
   (PokeAPI), el mismo ejemplar tiene siempre los mismos, ejemplares distintos varían, Smeargle
   puede tener cualquiera y Ditto copia al rival. */
let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'))}
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport:{width:390, height:844}});
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  await ctx.addInitScript(() => {
    if(sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1');
    localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador', 'Tester');
    const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got:[6, 25, 132, 235, 249].includes(i), dup:i === 6 ? 7 : 0};
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins:300, state:st}));
  });
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar', {force:true}); await p.waitForTimeout(1000);

  const r = await p.evaluate(() => {
    const {movsDe, APRENDE, MOVS_CAT, ATAQUES} = window.__arenaMovs;
    const todos = [];
    for(let id = 1; id <= 251; id++) for(let k = 0; k < 6; k++){
      const mv = movsDe({id}, 'S' + k);
      ATAQUES.forEach(a => todos.push({id, a, m:mv[a]}));
    }
    const vacios = todos.filter(x => !x.m && x.id !== 132).map(x => x.id + x.a);
    const fuera = todos.filter(x => x.m && x.id !== 235 && !APRENDE[x.id][x.a].some(y => MOVS_CAT[y.i][0] === x.m.n)).map(x => x.id + ':' + x.m.n);
    const fxMal = todos.filter(x => x.m && !({corto:['garra','mordisco','golpe','cuerpo','picotazo','latigo','patada','aguijon'],
      largo:['rayo','lluvia','zona','trueno','propia','embestida']}[x.a] || ['bola','chorro','onda','hojas','agujas','piedra','rayito','polvo','estrella','lodo','burbujas','tornado','hueso','semillas','suelo','monedas']).includes(x.m.fx)).map(x => x.id + ':' + x.m.n + ':' + x.m.fx);
    const lista = ejemplares(6).map(e => ATAQUES.map(a => movsDe({id:6}, (e.c || '') + ':' + e.f)[a].n).join('|'));
    return {vacios, fuera, fxMal, lista, distintos:new Set(lista).size, cat:MOVS_CAT.length,
      smeargle:new Set([...Array(20)].map((_, k) => movsDe({id:235}, 'Z' + k).largo.n)).size};
  });
  check('los 251 tienen ataque en los 3 botones (salvo Ditto) ' + r.vacios.slice(0, 5), r.vacios.length === 0);
  check('ningún ataque fuera de lo que ese Pokémon aprende ' + r.fuera.slice(0, 5), r.fuera.length === 0);
  check('cada efecto corresponde a su botón ' + r.fxMal.slice(0, 5), r.fxMal.length === 0);
  console.log('   8 Charizard:', r.lista.join('  /  '));
  check('ejemplares distintos del mismo Pokémon pelean distinto (' + r.distintos + ' combinaciones de 8)', r.distintos >= 3);
  check('Smeargle puede tener cualquier ataque (' + r.smeargle + ' largos distintos en 20)', r.smeargle >= 8);

  // el mismo ejemplar, mismos ataques después de recargar
  const antes = await p.evaluate(() => { const {movsDe, ATAQUES} = window.__arenaMovs; saveProgress(); return ejemplares(6).map(e => ATAQUES.map(a => movsDe({id:6}, (e.c || '') + ':' + e.f)[a].n).join('|')); });
  await p.reload(); await p.click('#portadaEntrar', {force:true}); await p.waitForTimeout(900);
  const despues = await p.evaluate(() => { const {movsDe, ATAQUES} = window.__arenaMovs; return ejemplares(6).map(e => ATAQUES.map(a => movsDe({id:6}, (e.c || '') + ':' + e.f)[a].n).join('|')); });
  check('al recargar cada ejemplar conserva sus ataques', JSON.stringify(antes) === JSON.stringify(despues));

  // selector con los ataques y pelea de Ditto contra un rival fijo
  await p.evaluate(() => { document.querySelectorAll('.show').forEach(e => e.classList.remove('show')); window.__arenaTurbo = 3; window.__rivalIds = [25, 25, 25]; });
  await p.click('#battleBtn'); await p.waitForSelector('.ar-sel');
  const movsTxt = await p.evaluate(() => [...document.querySelectorAll('.ar-sel')].map(e => e.dataset.id + '=' + e.querySelector('.ar-movs').textContent));
  console.log('   ' + movsTxt.join('\n   '));
  check('cada tarjeta del selector muestra sus 3 ataques', movsTxt.every(t => t.startsWith('132=') ? t.includes('Transformación') : t.split('·').length === 3));
  // dejar sólo a Ditto primero: desmarcar todos y marcar Ditto, Charizard, Pikachu
  await p.evaluate(() => { document.querySelectorAll('.ar-sel.on').forEach(e => e.click()); });
  for(const id of [132, 6, 25]) await p.click(`.ar-sel[data-id="${id}"]`);
  await p.click('#arPickGo');
  await p.waitForFunction(() => window.__arena && window.__arena.estado() && window.__arena.estado().fase === 'lucha', null, {timeout:15000});
  const ditto = await p.evaluate(() => { const {nombreAtaque, ATAQUES} = window.__arenaMovs; const A = window.__arena.estado(); return {yo:A.yo.act.p.id,
    mios:ATAQUES.map(a => nombreAtaque(A.yo.act, a)), suyos:ATAQUES.map(a => nombreAtaque(A.riv.act, a)),
    botones:['corto', 'medio', 'largo'].map(k => document.querySelector('#arB-' + k + ' b').textContent)}; });
  console.log('   Ditto', ditto.mios.join(', '), '· Pikachu rival', ditto.suyos.join(', '));
  check('Ditto pelea primero y copia los ataques del rival', ditto.yo === 132 && JSON.stringify(ditto.mios) === JSON.stringify(ditto.suyos) && JSON.stringify(ditto.botones) === JSON.stringify(ditto.mios));
  for(let i = 0; i < 18; i++){ const k = ['j', 'k', 'l'][i % 3]; await p.keyboard.down(k); await p.waitForTimeout(k === 'l' ? 700 : 120); await p.keyboard.up(k); await p.waitForTimeout(100); }
  check('sin errores de JS ' + errores.join(' | '), errores.length === 0);
  console.log(ok + ' ok, ' + fail + ' fallas'); await b.close(); process.exit(fail ? 1 : 0);
})();
