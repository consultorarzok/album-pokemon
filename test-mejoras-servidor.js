/* Mejoras por repetidas en MODO SERVIDOR (SERVIDOR=http://localhost:PUERTO): 4 características, sólo 2 especialidades, bloqueo de las otras, reinicio con monedas. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8787';
let ok = 0, fail = 0;
const check = (n, c, x) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const suf = Math.random().toString(36).slice(2, 6);
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  p.on('dialog', d => d.accept());
  await ctx.route(/n8n\.consultorarz\.com/, r => r.abort());
  const ids = await (async () => { const q = await ctx.newPage(); await q.goto('file:///root/pokemon/index.html'); const r = await q.evaluate(() => REGALOS.map(r => r.id)); await q.close(); return r; })();
  await p.addInitScript(([srv, suf, regalos]) => {
    if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1');
    localStorage.clear(); localStorage.setItem('album-servidor', srv);
    localStorage.setItem('album-avatar', 'red'); localStorage.setItem('album-kanto-jugador', 'Mejora ' + suf);
    localStorage.setItem('album-kanto-dispositivo', 'dme' + suf); localStorage.setItem('album-kanto-regalos', JSON.stringify(regalos));
    localStorage.setItem('album-kanto-pin-ofrecido', '1'); localStorage.setItem('album-novedades-id', '99999999');
    const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got: false, dup: 0};
    [1, 4, 7, 16, 19].forEach(i => st[i] = {got: true, dup: 0});
    st[25] = {got: true, dup: 14}; st[150] = {got: true, dup: 4};
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins: 60000, state: st, bolas: {roja: 0, azul: 0, ultra: 0, maestra: 0}}));
  }, [SERVIDOR, suf, ids]);
  await p.goto('file:///root/pokemon/index.html');
  await p.click('#portadaEntrar', {force: true}).catch(() => {});
  await p.waitForFunction(() => servidorListo, null, {timeout: 15000});
  const abrir = id => p.evaluate(i => { document.querySelectorAll('.overlay.show').forEach(e => e.classList.remove('show')); abrirDetalle(i); }, id).then(() => p.waitForSelector('.ent-ej'));
  const ficha = (id, c) => p.evaluate(([i, c]) => { const e = ejemplares(i).find(x => x.c === c); const s = window.__arenaMovs.fichaStats(POR_ID_C[i], e); return {vida: s.vida, golpe: s.golpe, crit: s.crit, vel: s.velRaw, est: e.est || null, f: e.f, esq: window.__arenaMovs.esqCd(e)}; }, [id, c]);
  const esperar = (id, c, fn) => p.waitForFunction(([i, c, src]) => { const e = ejemplares(i).find(x => x.c === c); return e && (new Function('e', 'return ' + src))(e); }, [id, c, fn], {timeout: 8000}).catch(() => {});
  const marcar = async (box, n) => { const cks = await p.$$(`${box} .mej-ck`); for(let i = 0; i < n; i++) await cks[i].check(); };

  // ---- Pikachu: vida + daño y la 3ª (crítico) queda bloqueada
  await abrir(25);
  const obj = await p.evaluate(() => document.querySelector('.ent-ej').dataset.c);
  const box = `.ent-ej[data-c="${obj}"]`;
  const f0 = await ficha(25, obj);
  check('se ven las 4 características y el nivel dice que sólo sube con monedas', await p.evaluate(b => document.querySelectorAll(b + ' .mej-fila').length === 4 && /nivel sólo sube con monedas/.test(document.querySelector(b + ' .mej').innerText), box));
  check('todo empieza apagado hasta elegir las copias', await p.evaluate(b => [...document.querySelectorAll(b + ' .ent-mej-go')].every(x => x.disabled), box));
  await marcar(box, 4);
  check('con 4 copias elegidas se prenden las 4 características (nivel 1 cuesta 4)', await p.evaluate(b => [...document.querySelectorAll(b + ' .ent-mej-go')].every(x => !x.disabled), box));
  await p.click(`${box} .ent-mej-go[data-stat="vi"]`);
  await esperar(25, obj, 'e.est && e.est.vi === 1');
  const f1 = await ficha(25, obj);
  check('Vida nivel 1: la vida sube ~4 % y la FUERZA no cambia', f1.est && f1.est.vi === 1 && f1.vida > f0.vida && f1.f === f0.f, {f0, f1});
  await abrir(25);
  await marcar(box, 4);
  await p.click(`${box} .ent-mej-go[data-stat="da"]`);
  await esperar(25, obj, 'e.est && e.est.da === 1');
  const f2 = await ficha(25, obj);
  check('Daño nivel 1: el golpe sube 4 %', f2.est && f2.est.da === 1 && f2.golpe > f1.golpe, {f1, f2});
  await abrir(25);
  const bloq = await p.evaluate(b => { const x = (s) => document.querySelector(b + ' .ent-mej-go[data-stat="' + s + '"]'); return {cr: x('cr').dataset.fijo === '1' && /Bloqueada/.test(x('cr').textContent), ve: x('ve').dataset.fijo === '1' && /Bloqueada/.test(x('ve').textContent), viOk: !x('vi').dataset.fijo}; }, box);
  check('con 2 especialidades, Crítico y Velocidad quedan bloqueadas y las elegidas siguen subiendo', bloq.cr && bloq.ve && bloq.viOk, bloq);
  check('muestra "Especialidades 2/2"', await p.evaluate(b => /Especialidades 2\/2/.test(document.querySelector(b + ' .mej').innerText), box));
  // ---- reinicio con monedas
  check('"Cambiar de especialidad" cuesta 50.000 y está disponible (tiene 60.000)', await p.evaluate(b => { const r = document.querySelector(b + ' .ent-mej-reset'); return !!r && !r.disabled && /50\.000/.test(r.textContent); }, box));
  await p.click(`${box} .ent-mej-reset`);
  await esperar(25, obj, '!e.est');
  const f3 = await ficha(25, obj);
  check('reiniciar borra las mejoras y cobra 50.000', f3.est === null && await p.evaluate(() => coins) <= 10000, {f3});
  await abrir(25);
  check('después de reiniciar, las 4 vuelven a estar disponibles', await p.evaluate(b => [...document.querySelectorAll(b + ' .ent-mej-go')].every(x => x.dataset.fijo !== '1'), box));

  // ---- Legendario (Mewtwo): velocidad y esquiva con menos espera
  await abrir(150);
  const o2 = await p.evaluate(() => document.querySelector('.ent-ej').dataset.c), box2 = `.ent-ej[data-c="${o2}"]`;
  const g0 = await ficha(150, o2);
  await marcar(box2, 4);
  await p.click(`${box2} .ent-mej-go[data-stat="ve"]`);
  await esperar(150, o2, 'e.est && e.est.ve === 1');
  const g1 = await ficha(150, o2);
  check('Mewtwo (legendario) Velocidad nivel 1: más veloz (o en el tope) y la esquiva espera 0,08 s menos', g1.est && g1.est.ve === 1 && (g1.vel > g0.vel || g1.vel >= 1.349) && Math.abs((g0.esq - g1.esq) - .08) < .001, {g0, g1});
  check('sin errores de JavaScript', errores.length === 0, errores);
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`);
  process.exit(fail ? 1 : 0);
})();
