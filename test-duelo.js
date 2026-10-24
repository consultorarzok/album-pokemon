/* Duelo en vivo entre DOS navegadores contra el servidor local (wrangler dev en :8787).
   A crea la sala, B se une con el código, pelean y el servidor paga. Correr con npm run dev andando. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8787';
let ok = 0, fail = 0;
const check = (n, c, x) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const suf = Math.random().toString(36).slice(2, 6);
const espera = (p, fn, arg, ms = 10000) => p.waitForFunction(fn, arg, {timeout: ms}).then(() => true, () => false);

async function chico(br, nombre, ids, regalos){
  const ctx = await br.newContext({viewport: {width: 390, height: 844}});
  await ctx.route(/n8n\.consultorarz\.com/, r => r.abort());
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  await p.addInitScript(([srv, nombre, ids, regalos]) => {
    if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1');
    localStorage.clear();
    localStorage.setItem('album-servidor', srv);
    localStorage.setItem('album-kanto-jugador', nombre);
    localStorage.setItem('album-kanto-dispositivo', 'd' + nombre.replace(/\W/g, ''));
    localStorage.setItem('album-kanto-regalos', JSON.stringify(regalos));
    localStorage.setItem('album-kanto-pin-ofrecido', '1');
    const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got: false, dup: 0};
    ids.forEach(i => st[i] = {got: true, dup: 0});
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins: 0, state: st, bolas: {roja: 0, azul: 0, ultra: 0, maestra: 0}}));
    window.__arenaMudo = true;
  }, [SERVIDOR, nombre, ids, regalos]);
  await p.goto('file:///root/pokemon/index.html');
  await p.click('#portadaEntrar', {force: true}).catch(() => {});
  await espera(p, () => servidorListo);
  return {ctx, p, errores, nombre};
}
async function abrirDuelo(x){
  await x.p.evaluate(() => abrirArena());
  await x.p.waitForSelector('#arPickDuelo');
  await x.p.click('#arPickDuelo');
  await x.p.waitForSelector('#arDCrear');
}

(async () => {
  const br = await chromium.launch();
  const regalos = await (async () => { const c = await br.newContext(); const q = await c.newPage(); await q.goto('file:///root/pokemon/index.html'); const r = await q.evaluate(() => REGALOS.map(r => r.id)); await c.close(); return r; })();
  const A = await chico(br, 'Rojo ' + suf, [1, 4, 7, 25], regalos);
  const B = await chico(br, 'Azul ' + suf, [133, 143, 147, 152], regalos);

  console.log('1) A crea la sala, B se une con el código');
  await abrirDuelo(A);
  check('la pantalla del equipo tiene el botón de duelo', true);
  await A.p.click('#arDCrear');
  check('A recibe un código', await espera(A.p, () => /[A-Z0-9]{5}/.test((document.querySelector('.ar-duelo-codigo') || {}).textContent || '')));
  const codigo = (await A.p.textContent('.ar-duelo-codigo')).trim();
  check('ofrece copiar y mandar por WhatsApp', await A.p.isVisible('#arDWa') && await A.p.isVisible('#arDCopiar'));
  await abrirDuelo(B);
  await B.p.fill('#arDCodigo', codigo.toLowerCase());
  await B.p.click('#arDUnir');
  const enA = await espera(A.p, () => window.__arena && window.__arena.estado() && window.__arena.estado().fase === 'lucha', null, 15000);
  const enB = await espera(B.p, () => window.__arena && window.__arena.estado() && window.__arena.estado().fase === 'lucha', null, 15000);
  check('los dos entran a la pelea', enA && enB);
  const t0 = Date.now();
  const vista = x => x.p.evaluate(() => { const S = window.__arena.estado(); return {riv: S.rivalNombre, yo: S.yo.mons.map(m => m.p.id), rivIds: S.riv.mons.map(m => m.p.id), rivF: S.riv.mons.map(m => m.fz), yoF: S.yo.mons.map(m => m.fz)}; });
  const va = await vista(A), vb = await vista(B);
  check('cada uno ve el nombre del otro', va.riv === B.nombre && vb.riv === A.nombre, [va.riv, vb.riv]);
  check('cada uno ve el equipo REAL del otro', JSON.stringify(va.rivIds) === JSON.stringify(vb.yo) && JSON.stringify(vb.rivIds) === JSON.stringify(va.yo), [va, vb]);
  check('con la misma fuerza de cada figurita', JSON.stringify(va.rivF) === JSON.stringify(vb.yoF));

  console.log('2) Movimiento: lo que hace uno lo ve el otro');
  await A.p.evaluate(() => { window.__arena.estado().joy = {x: -1, y: 0}; });
  await A.p.waitForTimeout(1200);
  await A.p.evaluate(() => { window.__arena.estado().joy = {x: 0, y: 0}; });
  await A.p.waitForTimeout(600);
  const posA = await A.p.evaluate(() => { const e = window.__arena.ent().yo; return {x: e.x, y: e.y}; });
  const rivEnB = await B.p.evaluate(() => { const e = window.__arena.ent().riv; return {x: e.x, y: e.y}; });
  check('B ve a A donde está (espejado)', Math.abs(rivEnB.x + posA.x) < .08 && Math.abs(rivEnB.y + posA.y) < .08, {posA, rivEnB});

  console.log('3) Ataques y golpes');
  await A.p.evaluate(() => { const e = window.__arena.ent().yo; e.cd.medio = 0; e.mon.en = 100; });
  await A.p.keyboard.press('k');
  check('B ve el ataque de A', await espera(B.p, () => { const e = window.__arena.ent().riv; return !!(e.accion && e.accion.tipo === 'medio') || window.__vioAtaque; }, null, 3000)
    || await B.p.evaluate(() => window.__arena.estado().proys.some(p => p.lado === 'riv')));
  /* un golpe que recibe B: lo calcula el celular de B y A lo ve */
  const hpAntes = await A.p.evaluate(() => window.__arena.estado().riv.act.hp);
  /* forzar un golpe de A sobre B, calculado en el celular de B */
  const hpB = await B.p.evaluate(() => { const E = window.__arena.ent(); E.yo.invul = 0; E.yo.rodando = false; const antes = E.yo.mon.hp;
    window.__arena.golpe('largo'); return [antes, E.yo.mon.hp]; }).catch(() => null);
  check('el golpe lo descuenta el celular de B', hpB && hpB[1] < hpB[0], hpB);
  check('A ve bajar la vida de B', await espera(A.p, h => window.__arena.estado().riv.act.hp < h, hpAntes, 3000),
    [hpAntes, await A.p.evaluate(() => window.__arena.estado().riv.act.hp)]);

  console.log('3b) A B le tumban un Pokémon: elige otro y A lo ve salir');
  await B.p.evaluate(() => { const S = window.__arena.estado(); S.yo.act.hp = 1; });
  for(let i = 0; i < 6; i++){
    const listo = await B.p.evaluate(() => { const S = window.__arena.estado(); if(!S.yo.act.vivo) return true;
      const E = window.__arena.ent(); E.yo.invul = 0; E.yo.rodando = false; window.__arena.golpe('largo'); return !S.yo.act.vivo; });
    if(listo) break;
    await B.p.waitForTimeout(300);
  }
  check('a B le aparece la lista para elegir', await espera(B.p, () => !document.getElementById('arEquipo').hidden && document.querySelector('#arEquipo [data-i]:not([disabled])'), null, 5000));
  check('A ve que el Pokémon de B se debilitó', await espera(A.p, () => !window.__arena.estado().riv.mons[0].vivo, null, 3000));
  check('mientras B elige, A sigue jugando (no se pausa)', await A.p.evaluate(() => !window.__arena.estado().pausa));
  await B.p.click('#arEquipo [data-i="2"]');
  check('A ve salir el que eligió B', await espera(A.p, () => window.__arena.estado().riv.idx === 2, null, 4000), await A.p.evaluate(() => window.__arena.estado().riv.idx));

  console.log('4) Fin: B se queda sin Pokémon; los dos cuentan lo mismo y el servidor paga');
  const falta = 2500 + 4000 * 4 + 2300 + 1500 - (Date.now() - t0);
  if(falta > 0) await A.p.waitForTimeout(falta);   // que la pelea dure algo creíble para el servidor
  await B.p.evaluate(() => { const S = window.__arena.estado(); S.yo.mons.forEach(m => { if(m !== S.yo.act){ m.vivo = false; m.hp = 0; } }); S.yo.act.hp = 1; });
  for(let i = 0; i < 6; i++){
    const listo = await B.p.evaluate(() => { const S = window.__arena.estado(); if(!S || S.fase === 'fin' || !S.yo.act.vivo) return true;
      const E = window.__arena.ent(); E.yo.invul = 0; E.yo.rodando = false; window.__arena.golpe('largo'); return !S.yo.act.vivo; });
    if(listo) break;
    await B.p.waitForTimeout(300);
  }
  const finA = await espera(A.p, () => /Otro duelo/.test((document.getElementById('arFin') || {}).textContent || ''), null, 20000);
  const finB = await espera(B.p, () => /Otro duelo/.test((document.getElementById('arFin') || {}).textContent || ''), null, 20000);
  check('los dos ven el resultado confirmado', finA && finB);
  const txtA = await A.p.textContent('#arFin'), txtB = await B.p.textContent('#arFin');
  check('A ganó y cobró', /¡Ganaste!/.test(txtA) && /Victoria/.test(txtA), txtA.slice(0, 160));
  check('B perdió y cobró lo de "por pelear"', /Perdiste/.test(txtB) && /Por pelear/.test(txtB), txtB.slice(0, 160));
  check('A suma puntos de Maestro guardados', await A.p.evaluate(() => maestro.ganadas === 1 && maestro.pts > 0));
  console.log('5) Otro duelo y B abandona en el medio: gana A');
  await A.p.click('#arOtra'); await B.p.click('#arOtra');
  await A.p.waitForSelector('#arPickDuelo'); await A.p.click('#arPickDuelo'); await A.p.click('#arDCrear');
  await espera(A.p, () => document.querySelector('.ar-duelo-codigo'));
  const cod2 = (await A.p.textContent('.ar-duelo-codigo')).trim();
  await B.p.waitForSelector('#arPickDuelo'); await B.p.click('#arPickDuelo'); await B.p.fill('#arDCodigo', cod2); await B.p.click('#arDUnir');
  await espera(B.p, () => window.__arena && window.__arena.estado() && window.__arena.estado().fase === 'lucha', null, 15000);
  await B.p.click('#arCloseBtn');
  check('en duelo, el cartel de salir avisa que se pierde', /perdés el duelo/.test(await B.p.textContent('#arConfirm')));
  check('y no pausa la pelea', await B.p.evaluate(() => !window.__arena.estado().pausa));
  await B.p.click('#arAbandonar');
  check('A gana por abandono', await espera(A.p, () => /abandonó/.test((document.getElementById('arFin') || {}).textContent || ''), null, 10000),
    await A.p.textContent('#arFin').catch(() => ''));
  check('sin errores de JavaScript', !A.errores.length && !B.errores.length, [A.errores, B.errores]);
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`);
  process.exit(fail ? 1 : 0);
})();
