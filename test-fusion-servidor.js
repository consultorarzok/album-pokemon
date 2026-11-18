/* Fusión de copias en MODO SERVIDOR (SERVIDOR=http://localhost:PUERTO): se eligen copias repetidas en la ficha, se ve la previa y el servidor las gasta. */
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
    localStorage.setItem('album-avatar', 'red'); localStorage.setItem('album-kanto-jugador', 'Fusion ' + suf);
    localStorage.setItem('album-kanto-dispositivo', 'dfus' + suf);
    localStorage.setItem('album-kanto-regalos', JSON.stringify(regalos));
    localStorage.setItem('album-kanto-pin-ofrecido', '1');
    const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got: false, dup: 0};
    [1, 4, 7, 16, 19].forEach(i => st[i] = {got: true, dup: 0});
    st[25] = {got: true, dup: 3}; st[150] = {got: true, dup: 2};   // Pikachu y un legendario (Mewtwo) con repetidas
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins: 0, state: st, bolas: {roja: 0, azul: 0, ultra: 0, maestra: 0}}));
  }, [SERVIDOR, suf, ids]);
  await p.goto('file:///root/pokemon/index.html');
  await p.click('#portadaEntrar', {force: true}).catch(() => {});
  await p.waitForFunction(() => servidorListo, null, {timeout: 15000});
  for(const id of [25, 150]){
    await p.evaluate(i => { document.querySelectorAll('.overlay.show').forEach(e => e.classList.remove('show')); abrirDetalle(i); }, id);
    await p.waitForSelector('.ent-ej');
    const antes = await p.evaluate(() => [...document.querySelectorAll('.ent-ej')].map(b => ({c: b.dataset.c, f: Number(b.querySelector('.ent-cab b').textContent.replace(/\D/g, ''))})));
    check(`#${id}: se ven ${antes.length} copias con bloque de fusión`, antes.length === (id === 25 ? 4 : 3) && await p.evaluate(() => document.querySelectorAll('.ent-fus-go').length >= 1));
    const obj = antes.slice().sort((a, b) => a.f - b.f)[0];   // la más débil recibe
    const box = `.ent-ej[data-c="${obj.c}"]`;
    check('el botón arranca apagado', await p.evaluate(b => document.querySelector(b + ' .ent-fus-go').disabled, box));
    await p.click(`${box} .fus-ck >> nth=0`);
    const txt = await p.textContent(`${box} .ent-fus-go`);
    check('la previa muestra "Fusionar 1 → 💪 a → b"', /Fusionar 1 → 💪 \d+ → \d+/.test(txt), txt);
    const esperado = Number(txt.match(/→ (\d+)$/)[1]);
    await p.click(`${box} .ent-fus-go`);
    await p.waitForFunction(([i, c, n]) => { const b = document.querySelector('.ent-ej[data-c="' + c + '"]'); return b && Number(b.querySelector('.ent-cab b').textContent.replace(/\D/g, '')) === n; }, [id, obj.c, esperado], {timeout: 8000}).catch(() => {});
    const desp = await p.evaluate(() => [...document.querySelectorAll('.ent-ej')].map(b => ({c: b.dataset.c, f: Number(b.querySelector('.ent-cab b').textContent.replace(/\D/g, ''))})));
    check('la fuerza subió a lo anunciado', (desp.find(x => x.c === obj.c) || {}).f === esperado, {obj, esperado, desp});
    check('se gastó una copia', desp.length === antes.length - 1, desp);
  }
  check('sin errores de JavaScript', errores.length === 0, errores);
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`);
  process.exit(fail ? 1 : 0);
})();
