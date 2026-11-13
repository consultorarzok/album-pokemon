/* Guardado del juego en el celular (13/11): la segunda vez abre sin esperar a la red y aguanta mala señal.
   - index.html: SIEMPRE se pide primero a la red (así una versión nueva llega al toque); si no hay señal en 8 s, sale el guardado (y el juego mira /version.json para actualizarse solo).
   - archivos con versión (app.js?v=…): del guardado, sin red. Al cambiar el número de versión se bajan de nuevo y se borra el viejo.
   - imágenes y demás archivos propios: del guardado al instante y se refrescan por detrás.
   - nada de otros dominios (servidor del juego, sprites externos) pasa por acá. */
const CAJA = 'rz-juego-1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for(const k of await caches.keys()) if(k !== CAJA) await caches.delete(k);
  await self.clients.claim();
})()));
async function guardar(req, res){
  if(!res || res.status !== 200 || res.type !== 'basic') return;
  const c = await caches.open(CAJA), u = new URL(req.url);
  if(u.search){ for(const k of await c.keys()){ const ku = new URL(k.url); if(ku.pathname === u.pathname && ku.search !== u.search) await c.delete(k); } }   // fuera la versión vieja del mismo archivo
  await c.put(req, res);
}
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if(req.method !== 'GET' || u.origin !== self.location.origin || req.headers.has('range')) return;
  if(u.pathname === '/sw.js' || u.pathname === '/version.json') return;   // siempre a la red
  if(req.mode === 'navigate' || u.pathname === '/' || u.pathname.endsWith('.html')){
    e.respondWith((async () => {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
      try{ const res = await fetch(req, {signal: ctl.signal, cache: 'no-store'}); clearTimeout(t); e.waitUntil(guardar(req, res.clone())); return res; }
      catch(err){ clearTimeout(t); const g = await caches.match(req, {ignoreSearch: true}); if(g) return g; throw err; }
    })());
    return;
  }
  if(/[?&]v=/.test(u.search)){
    e.respondWith((async () => { const g = await caches.match(req); if(g) return g; const res = await fetch(req); e.waitUntil(guardar(req, res.clone())); return res; })());
    return;
  }
  e.respondWith((async () => {
    const g = await caches.match(req);
    const red = fetch(req).then(res => { e.waitUntil(guardar(req, res.clone())); return res; });
    if(g){ e.waitUntil(red.catch(() => {})); return g; }
    return red;
  })());
});
