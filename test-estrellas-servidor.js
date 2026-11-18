/* Estrellas de entrenamiento en MODO SERVIDOR (SERVIDOR=http://localhost:PUERTO): elegir copias, gastar, y que crítico/velocidad cambien en la ficha. */
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
    localStorage.clear();
    localStorage.setItem('album-servidor', srv);
    localStorage.setItem('album-avatar', 'red'); localStorage.setItem('album-kanto-jugador', 'Estrella ' + suf);
    localStorage.setItem('album-kanto-dispositivo', 'dest' + suf);
    localStorage.setItem('album-kanto-regalos', JSON.stringify(regalos));
    localStorage.setItem('album-kanto-pin-ofrecido', '1');
    const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got: false, dup: 0};
    [1, 4, 7, 16, 19].forEach(i => st[i] = {got: true, dup: 0});
    st[25] = {got: true, dup: 11}; st[150] = {got: true, dup: 4};
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins: 0, state: st, bolas: {roja: 0, azul: 0, ultra: 0, maestra: 0}}));
  }, [SERVIDOR, suf, ids]);
  await p.goto('file:///root/pokemon/index.html');
  await p.click('#portadaEntrar', {force: true}).catch(() => {});
  await p.waitForFunction(() => servidorListo, null, {timeout: 15000});
  const abrir = id => p.evaluate(i => { document.querySelectorAll('.overlay.show').forEach(e => e.classList.remove('show')); abrirDetalle(i); }, id).then(() => p.waitForSelector('.ent-ej'));
  const ficha = (id, c) => p.evaluate(([i, c]) => { const e = ejemplares(i).find(x => x.c === c); const s = window.__arenaMovs.fichaStats(POR_ID_C[i], e); return {crit: s.crit, mult: s.critMult, vel: s.velRaw, velTxt: s.velTxt, est: e.est || null}; }, [id, c]);
  for(const [id, mejora, campo] of [[25, 'cr', 'crit'], [150, 'cm', 'mult']]){
    await abrir(id);
    const obj = await p.evaluate(() => document.querySelector('.ent-ej').dataset.c);
    const f0 = await ficha(id, obj);
    const box = `.ent-ej[data-c="${obj}"]`;
    check(`#${id}: botones apagados al empezar`, await p.evaluate(b => [...document.querySelectorAll(b + ' .ent-est-go')].every(x => x.disabled), box));
    const cks = await p.$$(`${box} .est-ck`);
    await cks[0].check(); await cks[1].check(); await cks[2].check(); await cks[3].check();
    check(`#${id}: con las 4 copias elegidas se prenden los botones`, await p.evaluate(b => [...document.querySelectorAll(b + ' .ent-est-go')].filter(x => !x.disabled).length >= 2, box));
    await p.click(`${box} .ent-est-go[data-m="${mejora}"]`);
    await p.waitForFunction(([c, i]) => { const e = ejemplares(i).find(x => x.c === c); return e && e.est; }, [obj, id], {timeout: 8000}).catch(() => {});
    const f1 = await ficha(id, obj);
    check(`#${id}: quedó 1 estrella en ${mejora}`, f1.est && f1.est[mejora] === 1, f1.est);
    check(`#${id}: la ficha refleja la mejora (${campo})`, campo === 'crit' ? f1.crit - f0.crit === 2 : Math.abs(f1.mult - f0.mult - .1) < .01, {f0, f1});
    const txt = await p.textContent(`.ent-ej[data-c="${obj}"]`);
    check(`#${id}: se ve ★☆☆☆☆`, /★☆☆☆☆/.test(txt), txt.slice(0, 160));
  }
  // velocidad en Pikachu: la 2ª estrella pide 6 copias
  await abrir(25);
  const obj = await p.evaluate(() => [...document.querySelectorAll('.ent-ej')].find(b => /★☆☆☆☆/.test(b.textContent)).dataset.c);
  const box = `.ent-ej[data-c="${obj}"]`;
  check('la 2ª estrella pide 6 copias', /elegí <b>6<\/b> copias/.test(await p.innerHTML(box)));
  const f0 = await ficha(25, obj);
  const cks = await p.$$(`${box} .est-ck`); for(let i = 0; i < 6; i++) await cks[i].check();
  await p.click(`${box} .ent-est-go[data-m="ve"]`);
  await p.waitForFunction(([c]) => { const e = ejemplares(25).find(x => x.c === c); return e && e.est && e.est.ve === 1; }, [obj], {timeout: 8000}).catch(() => {});
  const f1 = await ficha(25, obj);
  check('velocidad sube media estrella (+0,07) salvo que ya esté al tope', f1.vel > f0.vel + .06 || f1.vel >= 1.349, {f0, f1});
  check('sin errores de JavaScript', errores.length === 0, errores);
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`);
  process.exit(fail ? 1 : 0);
})();
