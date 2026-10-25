/* Pelea de la Arena en MODO SERVIDOR (servidor local :8787): el premio lo calcula el servidor.
   La pelea se "gana" bajando a 0 la vida de los rivales desde la prueba (lo que importa acá es
   lo que pasa al terminar). Correr con el servidor local andando (npm run dev en pokemon-servidor). */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8787';
let ok = 0, fail = 0;
const check = (n, c, x) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const suf = Math.random().toString(36).slice(2, 6);

(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({viewport: {width: 1366, height: 768}});
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  await ctx.route(/n8n\.consultorarz\.com/, r => r.abort());
  /* álbum viejo con 6 de Kanto para armar equipo, todos los regalos ya cobrados */
  const ids = await (async () => { const q = await ctx.newPage(); await q.goto('file:///root/pokemon/index.html'); const r = await q.evaluate(() => REGALOS.map(r => r.id)); await q.close(); return r; })();
  await p.addInitScript(([srv, suf, regalos]) => {
    if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1');
    localStorage.clear();
    localStorage.setItem('album-servidor', srv);
    localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador', 'Peleador ' + suf);
    localStorage.setItem('album-kanto-dispositivo', 'dpel' + suf);
    localStorage.setItem('album-kanto-regalos', JSON.stringify(regalos));
    localStorage.setItem('album-kanto-pin-ofrecido', '1');
    const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got: false, dup: 0};
    [1, 4, 7, 25, 133, 143].forEach(i => st[i] = {got: true, dup: 0});
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins: 0, state: st, bolas: {roja: 0, azul: 0, ultra: 0, maestra: 0}, maestro: {pts: 0, ganadas: 0, peleas: 0, nivel: 0}}));
  }, [SERVIDOR, suf, ids]);
  await p.goto('file:///root/pokemon/index.html');
  await p.click('#portadaEntrar', {force: true}).catch(() => {});
  await p.waitForFunction(() => servidorListo, null, {timeout: 10000});
  await p.click('#battleBtn');
  await p.waitForSelector('.ar-sel');
  await p.click('#arPickGo');
  await p.waitForFunction(() => window.__arena && window.__arena.estado() && window.__arena.estado().fase === 'lucha', null, {timeout: 15000});
  check('arrancó la pelea (el servidor aceptó el equipo)', true);
  /* perder rápido: queda un solo Pokémon propio con muy poca vida y el rival lo tumba */
  await p.evaluate(() => { const S = window.__arena.estado(); S.yo.mons.forEach(m => { if(m !== S.yo.act){ m.vivo = false; m.hp = 0; } }); S.yo.act.hp = 1; });
  const fin = await p.waitForSelector('#arOtra', {timeout: 60000}).then(() => true, () => false);
  check('terminó la pelea', fin);
  await p.waitForFunction(() => /🪙/.test(document.getElementById('arFin').textContent), null, {timeout: 8000}).catch(() => {});
  const txt = await p.textContent('#arFin');
  check('muestra el premio que calculó el servidor', /Por pelear/.test(txt) && /\+15 🪙/.test(txt), txt.slice(0, 200));
  const st = await p.evaluate(() => ({coins, peleas: maestro.peleas, ganadas: maestro.ganadas}));
  check('monedas y pelea guardadas', st.coins >= 15 && st.peleas === 1 && st.ganadas === 0, st);
  await p.click('#arCerrar2');
  await p.reload(); await p.click('#portadaEntrar', {force: true}).catch(() => {});
  await p.waitForFunction(() => servidorListo, null, {timeout: 10000});
  check('al recargar sigue todo (lo guardó el servidor)', await p.evaluate(s => coins === s.coins && maestro.peleas === 1, st));
  check('sin errores de JavaScript', errores.length === 0, errores);
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`);
  process.exit(fail ? 1 : 0);
})();
