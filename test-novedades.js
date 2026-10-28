/* Cartel de novedades al entrar: aparece una vez, se cierra y no vuelve. Necesita npm run dev andando (modo servidor). */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8787';
let ok = 0, fail = 0;
const check = (n, c, x) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };
const SHOTS = process.env.SHOTS || '';
const suf = Math.random().toString(36).slice(2, 6);
(async () => {
  const br = await chromium.launch();
  for(const [w, h] of [[390, 844], [1366, 768]]){
    console.log('— ' + w + '×' + h + ' —');
    const ctx = await br.newContext({viewport: {width: w, height: h}});
    await ctx.route(/n8n\.consultorarz\.com/, r => r.abort());
    await ctx.addInitScript(([srv, n]) => {
      if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1');
      localStorage.setItem('album-servidor', srv); localStorage.setItem('album-avatar', 'red');
      localStorage.setItem('album-kanto-jugador', n); localStorage.setItem('album-kanto-dispositivo', 'd' + n.replace(/\W/g, ''));
      localStorage.setItem('album-kanto-pin-ofrecido', '1'); localStorage.setItem('album-novedades-test', '1');
    }, [SERVIDOR, 'Nov ' + suf + w]);
    const p = await ctx.newPage();
    const errores = []; p.on('pageerror', e => errores.push(e.message));
    await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar', {force: true}).catch(() => {});
    const cerrarCarteles = async () => { for(const sel of ['#specialContinueBtn', '#battleCloseBtn', '#closeBtn', '#pinNoBtn', '#avatarOverlay .avatar-op']) if(await p.isVisible(sel)){ await p.click(sel).catch(() => {}); await p.waitForTimeout(250); } };
    let sale = false;
    for(let i = 0; i < 30 && !sale; i++){ await cerrarCarteles(); sale = await p.isVisible('#novedadesOverlay .reveal-panel'); if(!sale) await p.waitForTimeout(700); }
    check('aparece el cartel al entrar (después de cerrar la bienvenida)', sale);
    const t = await p.textContent('#novedadesOverlay');
    check('explica Pelea (1 vs 1, 2 vs 2, todos contra todos), Evolución y la semana que viene', /Modo Pelea/.test(t) && /2 vs 2/.test(t) && /Todos contra todos/.test(t) && /Modo Evolución/.test(t) && /semana que viene/.test(t) && /competitividad/.test(t));
    if(SHOTS) await p.screenshot({path: SHOTS + '/novedades-' + w + '.png'});
    await p.click('#novedadesCierraBtn'); await p.waitForTimeout(300);
    check('se cierra con ¡A jugar!', !(await p.isVisible('#novedadesOverlay .reveal-panel')));
    await p.reload(); await p.click('#portadaEntrar', {force: true}).catch(() => {});
    await p.waitForFunction(() => typeof servidorListo !== 'undefined' && servidorListo, null, {timeout: 15000}).catch(() => {});
    for(let i = 0; i < 8; i++){ await cerrarCarteles(); await p.waitForTimeout(700); }
    check('al volver a entrar ya no sale', !(await p.isVisible('#novedadesOverlay .reveal-panel')));
    check('sin errores de página', errores.length === 0, errores);
    await ctx.close();
  }
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`); process.exit(fail ? 1 : 0);
})();
