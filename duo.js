/* =================== AVENTURA DE A DOS (25/11) ===================
   Panel "Dúo", "Busco compañero", los 4 lugares del día en el mapa y las misiones. Todo lo decide el servidor (src/duo.js):
   acá sólo se muestra y se manda dónde estoy. */
const DUO = {d: null, visto: 0, timer: 0, enviando: false, ultimoVisto: null, resp: {}, cuando: 0, firma: ''};
const duoEl = id => document.getElementById(id);
const duoEsc = t => String(t).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
const duoAbierto = () => duoEl('duoOverlay').classList.contains('show');
const DUO_ICONO = {guardian: '⛏️', sabiduria: '📘', caceria: '🌿', combate: '⚔️'};
const DUO_ERRORES = {no_estas: 'Acercate al lugar de la misión para empezar.', falta_companero: 'Falta tu compañero: tiene que estar en el mismo lugar.', ya_hecha: 'Esa misión ya la hicieron hoy los dos.',
  ya_en_duo: 'Ya estás en un dúo.', ya_no_busca: 'Ya no está buscando compañero.', ocupado: 'Ya está jugando con otro compañero.', mision_en_curso: 'Ya tienen una misión en curso.', sin_duo: 'Primero armá un dúo.', sin_pregunta: 'Esa pregunta ya no está.'};
const duoMotivo = {tiempo: 'se acabó el tiempo', respuestas: 'alguna respuesta estuvo mal', derrota: 'ganó el Guardián'};
const duoReloj = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const duoResta = () => DUO.d && DUO.d.duo && DUO.d.duo.mision ? DUO.d.duo.mision.resta - (Date.now() - DUO.cuando) : 0;

function duoPedir(op, datos){
  if(!servidorListo) return Promise.resolve(null);
  const pos = typeof advAbierto !== 'undefined' && advAbierto ? {m: advMapa, x: advX, y: advY} : null;
  return api('/duo', Object.assign({op, pos}, datos || {})).then(res => {
    if(!res.ok){ if(op !== 'estado') avisoServidor(res.motivo, DUO_ERRORES[res.motivo]); return null; }
    DUO.d = res; DUO.cuando = Date.now();
    if(res.error) avisoServidor(res.error, DUO_ERRORES[res.error]);
    const u = res.duo && res.duo.ultimo;
    if(u && u.ts !== DUO.ultimoVisto){
      const primera = DUO.ultimoVisto === null;
      DUO.ultimoVisto = u.ts;
      if(!primera || op !== 'estado'){
        const nom = res.misiones[u.k].nombre;
        avisoServidor('', u.ok ? `🎉 ¡Misión cumplida: ${nom}! Tocá Dúo para dar los niveles.` : `No salió la misión ${nom}: ${duoMotivo[u.motivo] || 'probá de nuevo'}. Pueden reintentar.`);
        if(u.ok) duoRefrescarAlbum();
      }
    }else if(!u && DUO.ultimoVisto === null) DUO.ultimoVisto = 0;
    duoPintar(); duoCerca();
    return res;
  }).catch(() => null);
}
/* el premio y el cofre los escribe el servidor: se vuelve a traer el álbum */
function duoRefrescarAlbum(){
  return api('/progreso').then(res => { if(res.ok && res.progreso) aplicarProgreso(res.progreso, true); return duoPedir('estado'); }).catch(() => {});
}
/* se consulta seguido sólo mientras hace falta (panel abierto, buscando o en dúo) y con el juego a la vista */
function duoReloj4(){
  if(DUO.timer) return;
  DUO.timer = setInterval(() => {
    const d = DUO.d, activo = duoAbierto() || (d && (d.buscando || d.duo || d.buscan.some(q => q.invita)));
    duoCerca();
    if(!activo || document.hidden || DUO.enviando){ duoHud(); return; }
    if(d && d.buscando && Date.now() - DUO.cuando >= 3500){ duoPedir('estado'); return; }
    if(Date.now() - DUO.cuando >= 3500) duoPedir('estado');
    duoHud();
  }, 1000);
}
function duoHud(){
  const chip = duoEl('duoChip'), d = DUO.d, du = d && d.duo, pend = d && d.mio ? d.mio.pend.length : 0;
  const punto = duoEl('advDuoPunto'); if(punto) punto.hidden = !(pend || (d && !du && d.buscan.length));
  if(!du){ chip.hidden = !(d && d.buscando); if(!chip.hidden) chip.textContent = d.para ? '👥 Invitación enviada…' : '👥 Buscando compañero…'; return; }
  chip.hidden = false;
  const m = du.mision;
  let txt = '👥 ' + du.companero;
  if(m){ txt += ' · ' + d.misiones[m.k].nombre + ' ' + duoReloj(duoResta()); if(m.k === 'caceria' && m.avance) txt += ' · ' + (m.avance.yo + m.avance.el) + '/' + d.meta; }
  chip.textContent = txt;
  const r = duoEl('duoRelojTxt'); if(r) r.textContent = duoReloj(duoResta());
}
function duoBoton(texto, fn, clase){ const b = document.createElement('button'); b.type = 'button'; b.textContent = texto; if(clase) b.className = clase; b.onclick = fn; return b; }
function duoNodo(clase, html){ const e = document.createElement('div'); e.className = clase; if(html !== undefined) e.innerHTML = html; return e; }
function duoEnviar(op, datos){ if(DUO.enviando) return; DUO.enviando = true; return duoPedir(op, datos).then(() => { DUO.enviando = false; }); }

function duoPintar(){
  duoHud();
  if(!duoAbierto() || !DUO.d) return;
  const d = DUO.d, du = d.duo, m = du && du.mision, mio = d.mio || {hechas: [], pend: []}, cont = duoEl('duoCuerpo');
  /* no se redibuja si nada cambió (para no pisar lo que se está tocando ni las respuestas elegidas) */
  const firma = JSON.stringify([d.buscando, d.buscan, du && [du.companero, du.conectado, du.enLugar, du.ultimo, m && [m.k, m.desde, m.avance, m.respondi, !!m.preguntas]], mio, advMapa, advX, advY, DUO.eligiendo]);
  if(firma === DUO.firma && cont.childElementCount) return;
  DUO.firma = firma; cont.textContent = '';
  if(DUO.eligiendo && mio.pend.length) return duoElegir(cont, mio);
  DUO.eligiendo = false;
  if(mio.pend.length) cont.appendChild(duoBoton(`🎁 Dar niveles a un Pokémon (${mio.pend.length})`, () => { DUO.eligiendo = true; duoPintar(); }, 'duo-premio'));
  if(!du){
    cont.appendChild(duoNodo('duo-caja', 'Jueguen <b>de a dos</b>: 4 misiones por día y sus Pokémon suben de nivel <b>sin gastar monedas</b>.'));
    cont.appendChild(d.buscando ? duoBoton('Dejar de buscar', () => duoEnviar('cancelar'), 'btn-sec') : duoBoton('Busco compañero', () => duoEnviar('buscar')));
    if(d.buscando) cont.appendChild(duoNodo('duo-nota', 'Avisamos a los que están conectados. Dura 2 minutos.'));
    if(d.buscan.length) cont.appendChild(duoNodo('duo-sub', 'Están buscando compañero'));
    d.buscan.forEach(q => { const f = duoNodo('duo-fila', `<span><b>${duoEsc(q.n)}</b>${q.invita ? '<small>te invita a jugar de a dos</small>' : ''}</span>`); f.appendChild(duoBoton(q.invita ? 'Aceptar' : 'Unirme', () => duoEnviar('unirme', {con: q.id}))); cont.appendChild(f); });
  }else{
    cont.appendChild(duoNodo('duo-caja', `Tu compañero: <b>${duoEsc(du.companero)}</b> ${du.conectado ? '🟢' : '⚪ <small>sin conexión</small>'}`));
    if(m) duoPintarMision(cont, d, m);
  }
  cont.appendChild(duoNodo('duo-sub', 'Misiones de hoy'));
  Object.entries(d.misiones).forEach(([k, def]) => {
    const l = d.lugares[k], hecha = mio.hechas.includes(k), r = advMapa === 'overworld' ? rumboA(l.x, l.y) : null;
    const extra = k === 'caceria' ? ` Tipo: <b>${TYPE_LABEL[l.tipo] || l.tipo}</b>.` : '';
    const donde = r ? (r.dist <= d.radio ? '📍 Estás en el lugar' : `a ${r.dist} casilleros al ${r.rumbo}`) : 'salí de la cueva';
    const el = du && du.enLugar.includes(k) ? ' · tu compañero está ahí' : '';
    const f = duoNodo('duo-fila' + (hecha ? ' hecha' : ''), `<span><b>${DUO_ICONO[k]} ${def.nombre}${hecha ? ' ✅' : ''}</b><small>${def.texto}${extra}<br>${def.lugar === 'mina' ? 'Mina' : 'Santuario'} · ${donde}${el}</small></span>`);
    const acc = duoNodo('duo-acc');
    acc.appendChild(duoBoton('Guiarme', () => { duoEl('duoOverlay').classList.remove('show'); guiarA({x: l.x, y: l.y, texto: (def.lugar === 'mina' ? 'la mina' : 'el santuario ') + (def.lugar === 'mina' ? '' : def.nombre)}); }, 'btn-sec'));
    if(du && !m){ const b = duoBoton('Empezar', () => duoEnviar('empezar', {mision: k})); b.dataset.mision = k; b.disabled = !(r && r.dist >= 0 && Math.abs(advX - l.x) <= d.radio && Math.abs(advY - l.y) <= d.radio && du.enLugar.includes(k)); acc.appendChild(b); }
    f.appendChild(acc); cont.appendChild(f);
  });
  const cofre = mio.hechas.length >= Object.keys(d.misiones).length;
  cont.appendChild(duoNodo('duo-nota', cofre ? '🎁 ¡Hiciste las 4 de hoy! Cofre cobrado: 1.000 monedas y 3 Ultra Ball.' : 'Si hacés las 4 en el día: cofre con 1.000 monedas y 3 Ultra Ball. Los lugares cambian cada día.'));
  if(du) cont.appendChild(duoBoton('Dejar el dúo', () => { if(confirm('¿Dejar el dúo? Se corta la misión en curso.')) duoEnviar('salir'); }, 'btn-sec'));
}
function duoPintarMision(cont, d, m){
  const def = d.misiones[m.k], caja = duoNodo('duo-caja duo-activa', `<b>${DUO_ICONO[m.k]} ${def.nombre} en curso</b> · <span id="duoRelojTxt">${duoReloj(duoResta())}</span><br>`);
  if(m.k === 'caceria') caja.insertAdjacentHTML('beforeend', `Atrapen <b>${d.meta}</b> de tipo <b>${TYPE_LABEL[m.tipo] || m.tipo}</b>. Van ${m.avance ? m.avance.yo + m.avance.el : 0} / ${d.meta} (vos ${m.avance ? m.avance.yo : 0}).`);
  if(m.k === 'combate') caja.insertAdjacentHTML('beforeend', `Ganá una pelea en la <b>Arena</b>. Vos ${m.avance && m.avance.yo ? '✅' : '⬜'} · Tu compañero ${m.avance && m.avance.el ? '✅' : '⬜'}`);
  if(m.k === 'guardian'){
    caja.insertAdjacentHTML('beforeend', 'Entren los dos a pelear: arranca sola cuando estén ambos.');
    caja.appendChild(duoBoton('Entrar a pelear', () => { duoEl('duoOverlay').classList.remove('show'); window.abrirGuardianDuo(d.lugares.guardian.jefe); }));
  }
  if(m.k === 'sabiduria'){
    if(m.respondi || !m.preguntas) caja.insertAdjacentHTML('beforeend', 'Ya respondiste. Esperando a tu compañero…');
    else {
      if(DUO.resp.desde !== m.desde) DUO.resp = {desde: m.desde, r: []};
      m.preguntas.forEach((q, i) => {
        const p = POR_ID_C[q.id], sil = q.modo === 'silueta';
        caja.appendChild(duoNodo('duo-preg', `<img src="${p.img}" alt="" class="${sil ? 'silueta' : ''}" width="80" height="80"><b>${i + 1}. ${sil ? '¿Quién es?' : '¿De qué tipo es ' + p.name + '?'}</b>`));
        const ops = duoNodo('duo-ops');
        q.opciones.forEach(op => { const b = duoBoton(sil ? op : (TYPE_LABEL[op] || op), () => { DUO.resp.r[i] = op; [...ops.children].forEach(x => x.classList.toggle('sel', x === b)); const e = duoEl('duoResponder'); if(e) e.disabled = DUO.resp.r.filter(Boolean).length < 3; }, DUO.resp.r[i] === op ? 'sel' : ''); ops.appendChild(b); });
        caja.appendChild(ops);
      });
      const env = duoBoton('Enviar respuestas', () => duoEnviar('responder', {respuestas: DUO.resp.r})); env.id = 'duoResponder'; env.disabled = DUO.resp.r.filter(Boolean).length < 3; caja.appendChild(env);
    }
  }
  cont.appendChild(caja);
}
/* elegir a qué Pokémon darle los niveles */
function duoElegir(cont, mio){
  const lugar = mio.pend[0], sube = f => lugar === 'mina' ? (f <= 70 ? 3 : f <= 90 ? 2 : 1) : (f <= 70 ? 2 : 1);
  cont.appendChild(duoNodo('duo-caja', `Premio de ${lugar === 'mina' ? 'la mina' : 'santuario'}: elegí quién sube. Quedan <b>${mio.pend.length}</b>.`));
  const buscar = document.createElement('input'); buscar.type = 'search'; buscar.placeholder = 'Buscar Pokémon'; buscar.id = 'duoBuscar'; cont.appendChild(buscar);
  const lista = duoNodo('duo-lista'); cont.appendChild(lista);
  const todos = [];
  DATA.forEach(p => { const s = state[p.id]; if(s && s.got && Array.isArray(s.ej)) s.ej.forEach(e => todos.push({p, e})); });
  Object.keys(especiales || {}).forEach(id => { const p = ESPECIAL_POR_ID[id]; if(p) todos.push({p, e: especiales[id]}); });
  todos.sort((a, b) => b.e.f - a.e.f);
  const pintar = () => {
    const q = buscar.value.trim().toLowerCase(); lista.textContent = '';
    todos.filter(x => x.e.f < 100 && (!q || x.p.name.toLowerCase().includes(q))).slice(0, 40).forEach(({p, e}) => {
      const f = duoNodo('duo-fila', `<span><img src="${e.s ? imgVario(p) : p.img}" alt="" width="40" height="40" loading="lazy"><b>${e.s ? '✨ ' : ''}${p.name}</b><small>Nivel ${e.f} → ${Math.min(100, e.f + sube(e.f))}</small></span>`);
      const b = duoBoton('Subir', () => duoSubir(p.id, e.c)); b.dataset.id = p.id; f.appendChild(b); lista.appendChild(f);
    });
    if(!lista.childElementCount) lista.appendChild(duoNodo('duo-nota', 'No hay Pokémon para subir con ese nombre.'));
  };
  buscar.oninput = pintar; pintar();
  cont.appendChild(duoBoton('Después', () => { DUO.eligiendo = false; duoPintar(); }, 'btn-sec'));
}
function duoSubir(id, c){
  if(!puedeJugar('duoPremio')) return;
  accionServidor('duoPremio', {id, c}).then(res => {
    if(!res.ok){ avisoServidor(res.motivo, res.motivo === 'sin_premio' ? 'Ya no hay premios por cobrar.' : undefined); return duoPedir('estado'); }
    const r = res.resultado, p = POR_ID_C[r.id] || ESPECIAL_POR_ID[r.id];
    avisoServidor('', `⬆️ ${p.name} subió del nivel ${r.antes} al ${r.f}.`);
    DUO.eligiendo = r.quedan > 0; DUO.firma = '';
    if(DUO.d && DUO.d.mio) DUO.d.mio.pend.shift();
    duoPintar(); return duoPedir('estado');
  }).catch(() => {}).then(soltar('duoPremio'));
}
/* los 4 lugares del día dibujados en el mapa (santuario = dos piedras; mina = aro sobre la entrada) */
function dibujarDuoLugares(g, camX, camY, vw, vh){
  const d = DUO.d; if(!d || advMapa !== 'overworld') return;
  const hechas = d.mio ? d.mio.hechas : [], lat = (Math.sin(Date.now() / 320) + 1) / 2;
  Object.entries(d.lugares).forEach(([k, l]) => {
    const x = l.x * ADV_PX + 8 - camX, y = l.y * ADV_PX + 8 - camY;
    if(x < -60 || y < -60 || x > vw + 60 || y > vh + 60) return;
    const listo = hechas.includes(k), color = listo ? '120,220,140' : k === 'guardian' ? '255,150,70' : '130,210,255';
    g.save();
    g.strokeStyle = `rgba(${color},${.55 + .4 * lat})`; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y + 5, 26 + lat * 2, 12 + lat, 0, 0, 7); g.stroke();
    if(k !== 'guardian') [-20, 20].forEach(dx => {
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x + dx, y + 8, 8, 3, 0, 0, 7); g.fill();
      g.fillStyle = '#6f7787'; g.fillRect(x + dx - 6, y - 4, 12, 12); g.fillStyle = '#9aa3b5'; g.fillRect(x + dx - 5, y - 8, 10, 6);
      g.fillStyle = `rgb(${color})`; g.fillRect(x + dx - 2, y - 2, 4, 4);
    });
    const txt = DUO_ICONO[k] + ' ' + d.misiones[k].nombre + (listo ? ' ✅' : '');
    g.font = 'bold 8px sans-serif'; g.textAlign = 'center';
    const w = g.measureText(txt).width + 8;
    g.fillStyle = 'rgba(10,16,40,.85)'; g.fillRect(x - w / 2, y - 27, w, 12); g.fillStyle = '#fff'; g.fillText(txt, x, y - 18);
    g.restore();
  });
}
function duoAviso(m){ if(DUO.d && DUO.d.duo) return; avisoServidor('', `👥 ${m.n} busca compañero. Tocá Dúo para unirte.`); const p = duoEl('advDuoPunto'); if(p) p.hidden = false; duoPedir('estado'); }
/* Dúo con el que tenés cerca (25/11 Zeta): aparece un botón; uno invita, el otro acepta. Los personajes del juego (id negativo) no cuentan. */
const DUO_CERCA_PX = 16 * 8;
function duoVecino(){
  if(typeof MUNDO === 'undefined' || !MUNDO.otros) return null;
  let mejor = null, min = Infinity;
  for(const id in MUNDO.otros){
    const o = MUNDO.otros[id]; if(!(Number(id) > 0) || Number(id) === MUNDO.yo || o.m !== advMapa) continue;
    const dx = Math.abs(o.x - advPx), dy = Math.abs(o.y - advPy);
    if(dx <= DUO_CERCA_PX && dy <= DUO_CERCA_PX && dx + dy < min){ min = dx + dy; mejor = {id: Number(id), n: o.n || 'Entrenador'}; }
  }
  return mejor;
}
function duoCerca(){
  const b = duoEl('duoCerca'); if(!b) return;
  const d = DUO.d;
  if(!servidorListo || !advAbierto || !d || d.duo){ b.hidden = true; return; }
  const inv = d.buscan.find(q => q.invita), v = duoVecino();
  let txt = '', accion = null;
  if(inv){ txt = `✅ Aceptar dúo con ${inv.n}`; accion = ['unirme', {con: inv.id}]; }
  else if(d.buscando && d.para){ txt = '⏳ Esperando respuesta · cancelar'; accion = ['cancelar']; }
  else if(v){
    const q = d.buscan.find(x => x.id === v.id);
    txt = q ? `👥 Unirme al dúo de ${v.n}` : `👥 Activar dúo con ${v.n}`; accion = q ? ['unirme', {con: v.id}] : ['buscar', {para: v.id}];
  }
  b.hidden = !accion;
  if(!accion) return;
  if(b.textContent !== txt) b.textContent = txt;
  b.classList.toggle('acepta', !!inv);
  b.onclick = () => duoEnviar(accion[0], accion[1]);
}
function duoInvitacion(m){ if(DUO.d && DUO.d.duo) return; avisoServidor('', `👥 ${m.n} te invita a jugar de a dos.`); const p = duoEl('advDuoPunto'); if(p) p.hidden = false; duoPedir('estado'); }
(() => {
  const b = duoEl('advDuoBtn'); if(!b) return;
  b.onclick = () => {
    teclasApretadas.clear(); advEje = {x: 0, y: 0};
    if(!servidorListo){ avisoServidor('sin_conexion', 'Para jugar de a dos hace falta conexión 📶'); return; }
    DUO.firma = ''; duoEl('duoOverlay').classList.add('show'); duoPintar(); duoPedir('estado');
  };
  duoEl('duoCerrar').onclick = () => duoEl('duoOverlay').classList.remove('show');
  duoEl('duoChip').onclick = () => b.click();
  duoReloj4();
  /* al entrar: se recupera el dúo que tenías */
  let n = 0; const t = setInterval(() => { if(servidorListo){ clearInterval(t); duoPedir('estado'); } else if(++n > 60) clearInterval(t); }, 1500);
})();
