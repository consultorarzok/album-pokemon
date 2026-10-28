/* Música de fondo: el tema cambia según la pantalla, se puede silenciar y recuerda la elección. Sin servidor. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
let ok = 0, fail = 0;
const check = (n, c, x) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };
(async () => {
  const browser = await chromium.launch({args: ['--autoplay-policy=no-user-gesture-required']});
  for(const [w, h] of [[390, 844], [1366, 768]]){
    console.log('— ' + w + '×' + h + ' —');
    const ctx = await browser.newContext({viewport:{width:w, height:h}});
    await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
    await ctx.addInitScript(() => {
      if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1');
      localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador', 'Tester'); localStorage.setItem('album-servidor', 'off');
      localStorage.setItem('album-musica-test', '1'); localStorage.setItem('album-novedades-visto', '20261028');
      const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got:i <= 300, dup:0};
      localStorage.setItem('album-kanto-progreso', JSON.stringify({coins:300, state:st}));
    });
    const p = await ctx.newPage();
    const errores = []; p.on('pageerror', e => errores.push(e.message));
    await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar', {force: true}).catch(() => {});
    await p.waitForTimeout(1500);
    for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await p.isVisible(s)){ await p.click(s); await p.waitForTimeout(250); }
    const tema = () => p.evaluate(() => Musica.tema());
    await p.mouse.click(5, 5); await p.waitForTimeout(1500);
    check('en el inicio suena el tema "inicio"', (await tema()) === 'inicio', await tema());
    check('el botón flotante 🎵 se ve en el inicio', await p.isVisible('#musicaBtn'));
    const estado = await p.evaluate(() => { const c = [...document.querySelectorAll('*')].length; return typeof Musica === 'object'; });
    await p.click('#pokedexBtn'); await p.waitForTimeout(1200);
    check('en la Pokédex cambia a "magia"', (await tema()) === 'magia', await tema());
    await p.click('#pokedexCloseBtn'); await p.waitForTimeout(1200);
    check('al cerrarla vuelve a "inicio"', (await tema()) === 'inicio');
    await p.click('#repetidasBtn'); await p.waitForTimeout(1200);
    check('en Repetidas suena "magia"', (await tema()) === 'magia');
    await p.click('#repetidasCloseBtn'); await p.waitForTimeout(1000);
    await p.evaluate(() => abrirAventura()); await p.waitForTimeout(1500);
    check('en la Aventura suena "aventura"', (await tema()) === 'aventura', await tema());
    check('la Aventura tiene su propio botón de música y el flotante se esconde', await p.isVisible('#advMusicaBtn') && !(await p.isVisible('#musicaBtn')));
    await p.evaluate(() => cerrarAventura()); await p.waitForTimeout(1200);
    await p.evaluate(() => abrirArena()); await p.waitForTimeout(1200);
    check('en la sala/selección de la Arena sigue el tema "inicio"', (await tema()) === 'inicio', await tema());
    await p.evaluate(() => { document.getElementById('arenaOverlay').classList.remove('show'); });
    // silenciar y recordar
    await p.click('#musicaBtn'); await p.waitForTimeout(500);
    check('al tocar 🎵 se silencia y se guarda', await p.evaluate(() => !Musica.estaActiva() && localStorage.getItem('album-musica') === '0'));
    check('el botón muestra 🔇', (await p.textContent('#musicaBtn')).includes('🔇'));
    await p.reload(); await p.click('#portadaEntrar', {force: true}).catch(() => {});
    await p.waitForTimeout(1200);
    check('al volver a entrar sigue silenciada', await p.evaluate(() => !Musica.estaActiva()));
    check('sin errores de página', errores.length === 0, errores);
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${ok} bien, ${fail} mal`); process.exit(fail ? 1 : 0);
})();
