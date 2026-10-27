/* ⚔️ Batalla rápida desde la Aventura entre DOS navegadores contra el servidor local (npm run dev en :8787):
   A toca ⚔️ (busca), B se entera y toca ⚔️, se abre la Arena con 15 s para elegir y arranca el duelo. */
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

(async () => {
  const br = await chromium.launch();
  const regalos = await (async () => { const c = await br.newContext(); const q = await c.newPage(); await q.goto('file:///root/pokemon/index.html'); const r = await q.evaluate(() => REGALOS.map(r => r.id)); await c.close(); return r; })();
  const A = await chico(br, 'Rojo ' + suf, [1, 4, 7, 25], regalos);
  const B = await chico(br, 'Azul ' + suf, [133, 143, 147, 152], regalos);
  const aAventura = async x => { await x.p.evaluate(() => document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'))); await x.p.click('#advBtn', {force: true}); };
  await aAventura(A); await aAventura(B);
  check('A ve el botón ⚔️ al lado del 💬', await espera(A.p, () => { const b = document.getElementById('advBatBtn'); return b && !b.hidden && b.offsetWidth > 0; }));
  const pos = await A.p.evaluate(() => { const a = document.getElementById('advChatBtn').getBoundingClientRect(), b = document.getElementById('advBatBtn').getBoundingClientRect(); return {a: a.left, b: b.left, ay: a.top, by: b.top}; });
  check('⚔️ está a la izquierda del 💬 y a la misma altura', pos.b < pos.a && Math.abs(pos.ay - pos.by) < 2, pos);
  await A.p.screenshot({path: (process.env.SHOTS || '/tmp') + '/bat-A.png'});

  console.log('1) A busca, B se entera');
  await A.p.click('#advBatBtn');
  check('A queda "buscando"', await espera(A.p, () => /Buscando rival/.test(document.getElementById('advBatAviso').textContent)));
  await A.p.waitForTimeout(700);   // que los dos se vean (posiciones)
  check('B ve el logo ⚔️ sobre A', await espera(B.p, () => [...document.querySelectorAll('#advBatGlobos .adv-batglobo')].some(b => b.style.display !== 'none' && !b.classList.contains('propio'))));
  check('A ve su propio logo (sin tocarlo)', await espera(A.p, () => [...document.querySelectorAll('#advBatGlobos .adv-batglobo.propio')].some(b => b.style.display !== 'none')));
  await B.p.screenshot({path: (process.env.SHOTS || '/tmp') + '/bat-B.png'});

  console.log('2) B toca el logo ⚔️ de A: a los dos se les abre la Arena con cuenta de 15 s');
  await B.p.click('#advBatGlobos .adv-batglobo:not(.propio):not([style*="none"])');   // B acepta tocando el logo
  check('A ve la Arena para elegir equipo', await espera(A.p, () => document.getElementById('arCuenta') && document.getElementById('arenaOverlay').classList.contains('show')));
  check('B ve la Arena para elegir equipo', await espera(B.p, () => document.getElementById('arCuenta') && document.getElementById('arenaOverlay').classList.contains('show')));
  const c0 = Number(await A.p.textContent('#arCuenta'));
  check('la cuenta arranca en 15 (o 14)', c0 >= 13 && c0 <= 15, c0);
  check('dice contra quién es', /Azul/.test(await A.p.textContent('.ar-pick h2')));
  await A.p.screenshot({path: (process.env.SHOTS || '/tmp') + '/bat-pick.png'});

  console.log('3) A toca ¡Listo!, B deja que se acabe el tiempo');
  await A.p.click('#arPickGo');
  check('A queda esperando al rival', await espera(A.p, () => /Esperando que/.test((document.getElementById('arDEstado') || {}).textContent || '')));
  const t0 = Date.now();
  const enA = await espera(A.p, () => window.__arena && window.__arena.estado() && window.__arena.estado().fase === 'lucha', null, 25000);
  const enB = await espera(B.p, () => window.__arena && window.__arena.estado() && window.__arena.estado().fase === 'lucha', null, 25000);
  check('los dos entran a la pelea (B por tiempo)', enA && enB);
  check('B tuvo ~15 s para elegir', Date.now() - t0 > 8000, Date.now() - t0);
  check('sin errores de página', A.errores.length + B.errores.length === 0, [A.errores, B.errores]);
  console.log(`\n${ok} bien, ${fail} mal`);
  await br.close(); process.exit(fail ? 1 : 0);
})();
