/* Regresión 11/11: un 'resize' (pantalla completa del celular) durante la carga NO debe dejar al personaje en la esquina (1,1) */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport:{width:390, height:844}});
  await ctx.route('**://api.entrenadoresrz.com/**', r => r.abort());
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  await ctx.addInitScript(() => { localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador','Tester'); localStorage.setItem('album-servidor','off'); });
  const p = await ctx.newPage();
  await p.goto('file:///root/pokemon/index.html');
  await p.waitForTimeout(800);
  const r = await p.evaluate(async () => {
    abrirAventura();
    window.dispatchEvent(new Event('resize'));          // lo que hace el celular al entrar en pantalla completa
    await new Promise(r => setTimeout(r, 600));
    return {x: advPx / ADV_PX, y: advPy / ADV_PX};
  });
  console.log(JSON.stringify(r));
  const ok = r.x > 20 && r.y > 20;
  console.log(ok ? '✅ el personaje arranca en el inicio' : '❌ quedó en la esquina');
  await b.close(); process.exit(ok ? 0 : 1);
})();
