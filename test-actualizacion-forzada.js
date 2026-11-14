const fs = require('fs');
let chromium; try{ ({ chromium } = require('playwright')); }catch(e){ ({ chromium } = require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const MIME = {js:'application/javascript', css:'text/css', html:'text/html', png:'image/png', json:'application/json', svg:'image/svg+xml', gif:'image/gif', mp3:'audio/mpeg', jpg:'image/jpeg', webp:'image/webp'};
let ok = 0, mal = 0; const chk = (n, c, x) => { c ? ok++ : mal++; console.log((c ? '✅ ' : '❌ ') + n + (c ? '' : '  → ' + JSON.stringify(x))); };
async function montar(versionJson, viejaAlInicio){
  const br = await chromium.launch(); const ctx = await br.newContext({viewport: {width: 390, height: 844}});
  const est = {cargas: 0, version: versionJson};
  await ctx.route(/.*/, async r => {
    const u = new URL(r.request().url());
    if(u.hostname !== 'entrenadoresrz.com') return r.abort();
    if(u.pathname === '/version.json') return r.fulfill({status: 200, contentType: 'application/json', body: est.version});
    if(u.pathname === '/sw.js') return r.fulfill({status: 404, body: ''});
    let f = u.pathname === '/' ? '/index.html' : u.pathname; const path = '/root/pokemon' + decodeURIComponent(f);
    if(!fs.existsSync(path)) return r.fulfill({status: 404, body: ''});
    let body = fs.readFileSync(path);
    if(f === '/index.html'){ est.cargas++; if(viejaAlInicio && est.cargas === 1) body = Buffer.from(body.toString().replace(/\?v=20261179/g, '?v=20261170')); }   // la 1.ª vez el celular corre una versión VIEJA
    r.fulfill({status: 200, contentType: MIME[path.split('.').pop()] || 'application/octet-stream', body});
  });
  const p = await ctx.newPage(); const logs = []; p.on('pageerror', e => logs.push(e.message));
  return {br, ctx, p, est, logs};
}
(async () => {
  // A) obligatoria: version.json trae min > lo que corre -> se recarga SOLA y queda en la nueva (sin bucle)
  { const {br, p, est} = await montar('{"v":"20261179","min":"20261179"}', true);
    await p.goto('https://entrenadoresrz.com/'); await p.waitForTimeout(6000);
    chk('A) obligatoria: se recargó sola (2 cargas) y quedó en la versión nueva', est.cargas === 2 && (await p.content()).includes('app.js?v=20261179'), est.cargas);
    await p.waitForTimeout(4000); chk('A) sin bucle: no vuelve a recargar', est.cargas === 2, est.cargas);
    await br.close(); }
  // B) no obligatoria (sin min): corre vieja y en plena sesión sólo aparece el cartelito (no recarga)
  { const {br, p, est} = await montar('{"v":"20261170"}', true);
    await p.goto('https://entrenadoresrz.com/'); await p.waitForTimeout(2500);
    est.version = '{"v":"20261179"}';
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(2500);
    chk('B) sin "min": aparece el cartelito y NO se recarga', est.cargas === 1 && await p.evaluate(() => !!document.getElementById('rzNueva')), est.cargas);
    await br.close(); }
  // C) obligatoria pero en plena pelea: espera; al terminar la pelea se actualiza
  { const {br, p, est} = await montar('{"v":"20261170"}', true);
    await p.goto('https://entrenadoresrz.com/'); await p.waitForTimeout(2500);
    await p.evaluate(() => document.getElementById('arenaOverlay').classList.add('show'));
    est.version = '{"v":"20261179","min":"20261179"}';
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(4000);
    chk('C) en plena pelea NO se corta (sigue la 1.ª carga)', est.cargas === 1, est.cargas);
    await p.evaluate(() => document.getElementById('arenaOverlay').classList.remove('show')); await p.waitForTimeout(11000);
    chk('C) al terminar la pelea se actualiza sola', est.cargas === 2, est.cargas);
    await br.close(); }
  console.log(`\n${ok} bien, ${mal} mal`); process.exit(mal ? 1 : 0);
})();
