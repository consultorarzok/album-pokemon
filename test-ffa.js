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
  const X = [];
  const eqs = [[1, 4, 7, 25], [133, 143, 147, 152], [16, 19, 21, 39]];
  for(let i = 0; i < 3; i++) X.push(await chico(br, ['Uno', 'Dos', 'Tres'][i] + ' ' + suf, eqs[i], regalos));
  const [A, B, C] = X;
  const entrar = async x => { await x.p.evaluate(() => abrirArena()); await x.p.waitForSelector('#arPickDuelo'); await x.p.click('#arPickDuelo'); await x.p.waitForSelector('#arDCrear'); };
  await entrar(A); await A.p.click('#arDCrear');
  await espera(A.p, () => document.querySelector('.ar-lobby-cod b'));
  const cod = (await A.p.textContent('.ar-lobby-cod b')).trim();
  for(const x of [B, C]){ await entrar(x); await x.p.fill('#arDCodigo', cod); await x.p.click('#arDUnir'); }
  check('con 3 el modo es todos contra todos y ya se puede empezar', await espera(A.p, () => document.querySelectorAll('.ar-lobby-lista li').length === 3 && !document.getElementById('arLEmpezar').disabled && /Todos contra todos/.test(document.querySelector('.ar-lobby-modo').textContent)));
  check('no hay botones de equipo (no es 2 vs 2)', await A.p.evaluate(() => document.querySelectorAll('.ar-lobby-b').length === 0));
  await A.p.click('#arLEmpezar');
  const t0 = Date.now();
  for(const x of X) check(x.nombre + ' entra a la pelea', await espera(x.p, () => window.__arena && window.__arena.estado() && window.__arena.estado().fase === 'lucha', null, 20000));
  const info = x => x.p.evaluate(() => { const S = window.__arena.estado(), E = window.__arena.ent(); return {modo: S.modo, lados: S.lados.slice(), bandos: S.lados.map(l => S.bando[l]),
    pos: S.lados.map(l => [S[l].nombre.split(' ')[0], +E[l].x.toFixed(2), +E[l].y.toFixed(2)])}; });
  const ia = await info(A), ib = await info(B), ic = await info(C);
  check('cada uno ve 3 Pokémon, todos enemigos entre sí', [ia, ib, ic].every(i => i.modo === 'ffa' && i.lados.length === 3 && new Set(i.bandos).size === 3), ia);
  const norm = i => JSON.stringify(i.pos.slice().sort((p, q) => p[0] < q[0] ? -1 : 1));
  check('la cancha es la misma para todos (cada uno en su lugar)', norm(ia) === norm(ib) && norm(ib) === norm(ic), [ia.pos, ib.pos, ic.pos]);
  if(SHOTS) await B.p.screenshot({path: SHOTS + '/multi-ffa.png'});
  const falta = 2500 + 2000 * 2 + 2300 + 1500 - (Date.now() - t0);
  if(falta > 0) await A.p.waitForTimeout(falta);
  const tumbar = async x => {
    await x.p.evaluate(() => { const S = window.__arena.estado(); S.yo.mons.forEach(m => { if(m !== S.yo.act){ m.vivo = false; m.hp = 0; } }); S.yo.act.hp = 1; });
    for(let i = 0; i < 8; i++){
      const listo = await x.p.evaluate(() => { const S = window.__arena.estado(); if(!S || S.fase === 'fin' || S.espectador) return true;
        const E = window.__arena.ent(); E.yo.invul = 0; E.yo.rodando = false; window.__arena.golpe('largo'); return !S.yo.act.vivo; });
      if(listo) break; await x.p.waitForTimeout(300);
    }
  };
  await tumbar(C);
  check('C queda eliminado y los otros lo ven fuera', await espera(A.p, () => { const S = window.__arena.estado(); return S.lados.some(l => S[l].nombre.startsWith('Tres') && S[l].mons.every(m => !m.vivo)); }, null, 8000)
    && await espera(C.p, () => window.__arena.estado().espectador === true, null, 8000));
  await tumbar(B);
  check('los tres ven el resultado', await Promise.all(X.map(x => espera(x.p, () => /¡Ganaste!|Perdiste/.test((document.getElementById('arFin') || {}).textContent || ''), null, 15000))).then(r => r.every(Boolean)));
  const [tA, tB, tC] = [await A.p.textContent('#arFin'), await B.p.textContent('#arFin'), await C.p.textContent('#arFin')];
  check('A es 1.º y cobra', /¡Ganaste!/.test(tA) && /Victoria/.test(tA) && /1\.º de 3/.test(tA), tA.slice(0, 160));
  check('B quedó 2.º y C 3.º', /2\.º de 3/.test(tB) && /3\.º de 3/.test(tC), [tB.slice(0, 160), tC.slice(0, 160)]);
  check('sin errores de JavaScript', X.every(x => !x.errores.length), X.map(x => x.errores));
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`); process.exit(fail ? 1 : 0);
})();
