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
    localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador', nombre);
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
  const SHOTS = process.env.SHOTS || '';
  const equipos = [[1, 4, 7, 25], [133, 143, 147, 152], [16, 19, 21, 39], [74, 95, 111, 129]];
  const X = [];
  for(let i = 0; i < 4; i++) X.push(await chico(br, ['Ana', 'Beto', 'Cami', 'Dani'][i] + ' ' + suf, equipos[i], regalos));
  const [A, B, C, D] = X;
  const entrar = async x => { await x.p.evaluate(() => abrirArena()); await x.p.waitForSelector('#arPickDuelo'); await x.p.click('#arPickDuelo'); await x.p.waitForSelector('#arDCrear'); };
  console.log('1) Sala de 4 → 2 vs 2');
  await entrar(A); await A.p.click('#arDCrear');
  await espera(A.p, () => document.querySelector('.ar-lobby-cod b'));
  const cod = (await A.p.textContent('.ar-lobby-cod b')).trim();
  for(const x of [B, C, D]){ await entrar(x); await x.p.fill('#arDCodigo', cod); await x.p.click('#arDUnir'); }
  check('el anfitrión ve 4 en la sala y el modo 2 vs 2 con botones de equipo', await espera(A.p, () => document.querySelectorAll('.ar-lobby-lista li').length === 4 && document.querySelectorAll('.ar-lobby-b').length === 4 && !document.getElementById('arLEmpezar').disabled));
  check('puede elegir entre 2 vs 2 y todos contra todos', await A.p.evaluate(() => document.querySelectorAll('.ar-lobby-m').length === 2));
  if(SHOTS) await A.p.screenshot({path: SHOTS + '/sala-4.png'});
  await A.p.click('#arLEmpezar');
  const t0 = Date.now();
  for(const x of X) check(x.nombre + ' entra a la pelea', await espera(x.p, () => window.__arena && window.__arena.estado() && window.__arena.estado().fase === 'lucha', null, 20000));
  const info = x => x.p.evaluate(() => { const S = window.__arena.estado(); return {multi: S.multi, modo: S.modo, lados: S.lados.slice(), bando: Object.assign({}, S.bando), huds: document.querySelectorAll('.ar-hud.mini').length,
    nombres: S.lados.map(l => S[l].nombre), equipos: S.lados.map(l => S[l].mons.map(m => m.p.id))}; });
  const ia = await info(A), ic = await info(C), ib = await info(B);
  check('cada uno ve 4 Pokémon y 4 HUD', ia.lados.length === 4 && ia.huds === 4 && ic.lados.length === 4, ia);
  check('A ve a C de compañero (al) y a B y D de rivales', ia.bando.yo === ia.bando.al && ia.nombres[ia.lados.indexOf('al')].startsWith('Cami') && ia.lados.includes('riv') && ia.lados.includes('r2'), ia);
  check('los equipos son los REALES de cada uno', JSON.stringify(ia.equipos[0]) !== JSON.stringify(ib.equipos[0]) && ia.equipos[ia.lados.indexOf('al')].includes(16), [ia.equipos, ib.equipos]);
  check('B ve a A y C como rivales (y a D de compañero)', ib.nombres.filter((n, k) => ib.bando[ib.lados[k]] !== ib.bando.yo).length === 2 && ib.lados.includes('al') && ib.nombres[ib.lados.indexOf('al')].startsWith('Dani'), ib);
  if(SHOTS) await A.p.screenshot({path: SHOTS + '/multi-2v2.png'});

  console.log('2) Movimiento: lo que hace A lo ven los otros 3, cada uno desde su lado');
  await A.p.evaluate(() => { window.__arena.estado().joy = {x: -1, y: 0}; });
  await A.p.waitForTimeout(1200);
  await A.p.evaluate(() => { window.__arena.estado().joy = {x: 0, y: 0}; });
  await A.p.waitForTimeout(700);
  const posA = await A.p.evaluate(() => { const e = window.__arena.ent().yo; return {x: e.x, y: e.y}; });
  const ven = x => x.p.evaluate(() => { const S = window.__arena.estado(), E = window.__arena.ent(); const l = S.lados.find(k => S[k].nombre.startsWith('Ana')); return {l, x: E[l].x, y: E[l].y}; });
  const vC = await ven(C), vB = await ven(B), vD = await ven(D);
  check('C (compañero) ve a A en el mismo lugar', Math.abs(vC.x - posA.x) < .08 && Math.abs(vC.y - posA.y) < .08, [posA, vC]);
  check('B y D (rivales) ven a A espejado', Math.abs(vB.x + posA.x) < .08 && Math.abs(vB.y + posA.y) < .08 && Math.abs(vD.x + posA.x) < .08, [posA, vB, vD]);

  console.log('3) Fuego amigo: A no le pega a su compañero C');
  const tiro = (x, de) => x.p.evaluate(d => { const S = window.__arena.estado(), E = window.__arena.ent(); E.yo.invul = 0; E.yo.rodando = false; E.yo.mon.hp = E.yo.mon.max;
    const l = d === 'amigo' ? 'al' : S.lados.find(k => k !== 'yo' && k !== 'al'); const antes = E.yo.mon.hp; const r = window.__arena.golpeDe(l, 'yo', 'largo'); return {r, antes, desp: E.yo.mon.hp}; }, de);
  const fa = await tiro(C, 'amigo'), fr = await tiro(C, 'rival');
  check('el golpe de un compañero no hace daño', fa.r === false && fa.desp === fa.antes, fa);
  check('el golpe de un rival sí', fr.r === true && fr.desp < fr.antes, fr);

  console.log('4) Cae el equipo B (B y D) y ganan A y C; el servidor paga');
  const falta = 2500 + 2000 * 2 + 2300 + 1500 - (Date.now() - t0);
  if(falta > 0) await A.p.waitForTimeout(falta);
  for(const x of [B, D]){
    await x.p.evaluate(() => { const S = window.__arena.estado(); S.yo.mons.forEach(m => { if(m !== S.yo.act){ m.vivo = false; m.hp = 0; } }); S.yo.act.hp = 1; });
    for(let i = 0; i < 8; i++){
      const listo = await x.p.evaluate(() => { const S = window.__arena.estado(); if(!S || S.fase === 'fin' || S.espectador) return true;
        const E = window.__arena.ent(); E.yo.invul = 0; E.yo.rodando = false; window.__arena.golpe('largo'); return !S.yo.act.vivo; });
      if(listo) break; await x.p.waitForTimeout(300);
    }
    await x.p.waitForTimeout(1500);
  }
  check('B y D quedan eliminados y lo ven (espectadores o resultado)', await espera(B.p, () => /eliminado|Perdiste|Ganaste/.test(document.getElementById('arLog').textContent + (document.getElementById('arFin') || {}).textContent), null, 8000));
  check('los cuatro ven el resultado confirmado', await Promise.all(X.map(x => espera(x.p, () => /¡Ganaste!|Perdiste/.test((document.getElementById('arFin') || {}).textContent || ''), null, 15000))).then(r => r.every(Boolean)));
  const tx = async x => (await x.p.textContent('#arFin'));
  const [tA, tB, tC, tD] = [await tx(A), await tx(B), await tx(C), await tx(D)];
  check('A y C ganaron y cobraron', /¡Ganaste!/.test(tA) && /¡Ganaste!/.test(tC) && /Victoria/.test(tA), [tA.slice(0, 120), tC.slice(0, 120)]);
  check('B y D perdieron', /Perdiste/.test(tB) && /Perdiste/.test(tD));
  if(SHOTS) await A.p.screenshot({path: SHOTS + '/multi-fin.png'});
  check('sin errores de JavaScript', X.every(x => !x.errores.length), X.map(x => x.errores));
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`); process.exit(fail ? 1 : 0);
})();
