/* =================== MODO SERVIDOR ===================
   Sólo se usa si SERVIDOR_URL (arriba de app.js) tiene una dirección. Ahí el álbum vive en el
   servidor: cada jugada (abrir un sobre, responder, comprar, atrapar, pelear, regalar...) se le
   pide al servidor, que la hace, la guarda y devuelve el álbum actualizado. El navegador sólo
   muestra. Así no se puede hacer trampa cambiando cosas en el navegador.

   Las funciones de app.js tienen un desvío de una línea al principio
   (if(MODO_SERVIDOR) return xxxServidor(...)) que viene a parar acá. Sin servidor, nada de
   este archivo se ejecuta. */

const TOKEN_KEY = 'album-kanto-token';
/* El juego se mudó a entrenadoresrz.com. El link viejo (github.io) queda de PUENTE: el álbum de
   cada chico está guardado en su navegador bajo esa dirección, así que ahí se sube al servidor y
   después se lo pasa al sitio nuevo con su sesión en el link (#pase=...). */
const SITIO_NUEVO = 'https://entrenadoresrz.com/';
const LINK_VIEJO = 'consultorarzok.github.io/album-pokemon';
const ES_SITIO_VIEJO = /github\.io$/.test(location.hostname);
const PIN_OFRECIDO_KEY = 'album-kanto-pin-ofrecido';
const RESPALDO_KEY = 'album-kanto-progreso-antes-servidor';
let tokenServidor = '';
try{ tokenServidor = localStorage.getItem(TOKEN_KEY) || ''; }catch(e){}

/* Llegó del link viejo con su sesión: se queda con su nombre, su dispositivo y su sesión. */
(function recibirPase(){
  const m = /[#&]pase=([^&]+)/.exec(location.hash || '');
  if(!m) return;
  try{
    const p = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')))));
    if(p && p.t && p.j){
      tokenServidor = p.t; jugador = p.j;
      if(p.d) dispositivo = p.d;
      localStorage.setItem(TOKEN_KEY, p.t);
      localStorage.setItem(NAME_KEY, p.j);
      if(p.d) localStorage.setItem(DEVICE_KEY, p.d);
    }
  }catch(e){}
  try{ history.replaceState(null, '', location.pathname + location.search); }catch(e){}
})();
function irAlSitioNuevo(){
  let pase = '';
  if(tokenServidor && jugador){
    pase = btoa(unescape(encodeURIComponent(JSON.stringify({t: tokenServidor, j: jugador, d: dispositivo}))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  avisoServidor('', '¡Entrenadores RZ se mudó! Te llevamos a entrenadoresrz.com…');
  setTimeout(() => location.replace(SITIO_NUEVO + (pase ? '#pase=' + pase : '')), 900);
}
let servidorListo = false;           // ya llegó el álbum del servidor: se puede jugar
const enCurso = new Set();           // jugadas esperando respuesta (evita el doble toque)
const POR_ID_C = Object.fromEntries(DATA.map(p => [p.id, p]));
const aPull = x => ({p: POR_ID_C[x.id], isNew: x.isNew});
/* jugadas que pueden cambiar las figuritas: sólo ésas vuelven a dibujar el álbum entero */
const CAMBIAN_ALBUM = new Set(['sobre', 'canje', 'tirar', 'arenaTerminar']);

const MENSAJES = {
  sin_monedas: 'No te alcanzan las monedas.',
  tope_diario: 'Ya compraste la de hoy.',
  pocas_repetidas: 'Necesitás 3 repetidas para canjear.',
  album_completo: '¡Ya tenés todas!',
  sin_bolas: 'No te quedan de esa pokébola.',
  no_es_tuyo: 'Ese Pokémon no está en tu álbum.',
  equipo_invalido: 'Elegí entre 3 y 6 Pokémon.',
  pelea_muy_corta: 'Esa pelea no se pudo anotar.',
  pelea_imposible: 'Esa pelea no se pudo anotar.',
  sin_migrar: 'Estamos cargando tu álbum, esperá un segundo.',
  cargando: 'Estamos cargando tu álbum, esperá un segundo.',
  bloqueado: 'Tu álbum está pausado. Hablá con quien organiza el juego.',
  ocupado_reintentar: 'Hay mucha gente jugando, probá de nuevo.',
  error_servidor: 'Algo falló en el servidor, probá de nuevo.',
  sin_conexion: 'Sin conexión, probá de nuevo.'
};
/* las que pasan solas por jugar rápido no hace falta contarlas */
const SILENCIOSOS = new Set(['muy_seguido', 'sin_encuentro_aca', 'ya_tomado', 'no_hay_objeto', 'lejos_del_altar', 'sin_pelea']);

/* ---------------- avisos ---------------- */
let toastTimer = null;
function avisoServidor(motivo, texto){
  if(SILENCIOSOS.has(motivo)) return;
  const el = document.getElementById('toastServidor');
  el.textContent = texto || MENSAJES[motivo] || 'No se pudo hacer: ' + motivo;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}
let reintentoTimer = null;
function sinConexion(si){
  document.getElementById('offlineOverlay').classList.toggle('show', !!si);
  setStatus(si ? 'sin conexión con el servidor' : '', !!si);
  clearTimeout(reintentoTimer);
  if(si) reintentoTimer = setTimeout(() => { if(!navigator.onLine) return sinConexion(true); conectar(); }, 8000);
}
document.getElementById('offlineBtn').onclick = () => conectar();
window.addEventListener('online', () => conectar());

/* ---------------- pedidos al servidor ---------------- */
function api(ruta, datos){
  return fetch(SERVIDOR_URL + ruta, {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=UTF-8'},
    body: JSON.stringify(Object.assign({token: tokenServidor}, datos || {}))
  })
  .then(r => r.json().catch(() => ({ok: false, motivo: 'error_servidor'})))
  .then(res => {
    if(document.getElementById('offlineOverlay').classList.contains('show')) sinConexion(false);
    if(res && res.motivo === 'sin_sesion' && ruta !== '/registrar') perderSesion();
    return res || {ok: false, motivo: 'error_servidor'};
  }, err => { sinConexion(true); throw err; });
}
function accionServidor(accion, args){
  return api('/accion', {accion, args}).then(res => {
    if(res.progreso) aplicarProgreso(res.progreso, CAMBIAN_ALBUM.has(accion));
    return res;
  });
}
function guardarToken(t){
  tokenServidor = t || '';
  try{ if(t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); }catch(e){}
}
function perderSesion(){
  guardarToken('');
  servidorListo = false;
  if(jugador) registrarEnServidor(jugador, {alArrancar: true});
}

/* El álbum que manda el servidor pisa al de la pantalla (mismo formato que el localStorage). */
function aplicarProgreso(P, conAlbum = true){
  coins = P.coins;
  Object.keys(state).forEach(id => { state[id] = P.state[id] || {got: false, dup: 0}; });
  Object.keys(bolas).forEach(k => { bolas[k] = P.bolas[k] || 0; });
  Object.assign(maestro, P.maestro);
  comprasDia = P.comprasDia || {};
  legendariosDia = P.legendariosDia || {dia: null, obtenidos: {}};
  advTomados.clear();
  (P.tomados || []).forEach(k => advTomados.add(k));
  especiales = P.especiales || {};
  eventosServidor = P.eventos || {};
  saveProgress();   // queda una copia en el navegador para que la próxima vez arranque rápido
  if(conAlbum){ renderGrid(); updateProgress(); renderEspeciales(); }
  updateCoins();
  if(advAbierto) advSyncHud();
}

/* ---------------- arranque y cuenta ---------------- */
function arrancarServidor(){
  document.getElementById('playerName').textContent = jugador || '-';
  document.getElementById('resetBtn').textContent = '🔒 PIN de tu álbum';
  document.getElementById('nameViejo').hidden = ES_SITIO_VIEJO;
  cargarTop();
  sincronizarEvento();
  setInterval(sincronizarEvento, 60000);
  conectar();
}
function conectar(){
  if(!jugador){ if(ES_SITIO_VIEJO) return irAlSitioNuevo(); pedirNombre(); return; }
  if(!tokenServidor){ registrarEnServidor(jugador, {alArrancar: true}); return; }
  cargarDelServidor();
}
function cargarDelServidor(){
  return api('/progreso').then(res => {
    if(!res.ok) return res.motivo === 'sin_sesion' ? null : avisoServidor(res.motivo);
    if(!res.migrado) return migrarAlServidor();
    listo(res.progreso, res.tienePin, res.avatar);
  }).catch(() => {});
}
function listo(progreso, tienePin, avatar){
  aplicarProgreso(progreso);
  if(ES_SITIO_VIEJO){ servidorListo = true; return irAlSitioNuevo(); }   // su álbum ya está arriba: al sitio nuevo
  servidorListo = true;
  cobrarRegalosServidor();
  sincronizarCodigos();
  pedirAvatarSiFalta(() => { if(!tienePin) ofrecerPin(); }, avatar === undefined ? null : avatar);
}

/* Subir UNA vez el álbum que el chico tenía en este navegador (el servidor no deja hacerlo dos
   veces). Antes se guarda una copia aparte, por las dudas. */
function migrarAlServidor(){
  const leer = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(e){ return d; } };
  const crudo = leer(STORAGE_KEY, null);
  try{ if(crudo && !localStorage.getItem(RESPALDO_KEY)) localStorage.setItem(RESPALDO_KEY, JSON.stringify(crudo)); }catch(e){}
  const base = leer(EVENTO_BASE_KEY, {}), ids = leer(EVENTO_BASE_IDS_KEY, {}), ini = leer(EVENTO_INICIO_KEY, {});
  const eventos = {};
  Object.keys(base).forEach(slug => { if(Array.isArray(ids[slug])) eventos[slug] = {base: base[slug], baseIds: ids[slug], inicio: ini[slug]}; });
  return api('/migrar', {progreso: crudo, regalosUsados: leer(REGALOS_KEY, []), eventos}).then(res => {
    if(res.ok) return listo(res.progreso, false);
    if(res.motivo === 'ya_migrado') return cargarDelServidor();
    avisoServidor(res.motivo);
  }).catch(() => {});
}

function registrarEnServidor(nombre, {alArrancar} = {}){
  const err = document.getElementById('nameError');
  return api('/registrar', {nombre, dispositivo}).then(res => {
    if(res.ok){
      guardarToken(res.token);
      aceptarNombreServidor(res.jugador);
      return res.migrado ? cargarDelServidor() : migrarAlServidor();
    }
    if(res.motivo === 'ocupado'){
      /* el nombre ya es de otro entrenador en el servidor. Si es él desde otro celular, entra con
         su PIN; si no, elige otro nombre (sus figuritas de este navegador se suben igual). */
      if(alArrancar){
        pedirNombre();
        document.getElementById('nameInput').value = nombre;
        err.textContent = 'El nombre «' + nombre + '» ya lo tiene otro entrenador. ' +
          (res.tienePin ? 'Si sos vos, entrá con tu PIN. Si no, elegí otro nombre: tus figuritas no se pierden.' : 'Elegí otro nombre: tus figuritas no se pierden.');
      } else {
        err.textContent = res.tienePin ? 'Ese nombre ya tiene dueño. Si sos vos, entrá con tu PIN.'
          : 'Ese nombre ya lo está usando otro entrenador. Elegí otro.' +
            (ES_SITIO_VIEJO ? '' : ' Si ya jugabas antes, abrí una vez el link viejo (' + LINK_VIEJO + ') desde tu celular y tu álbum viene solo.');
      }
      document.getElementById('namePinBtn').hidden = !res.tienePin;
      return;
    }
    if(alArrancar) pedirNombre();
    err.textContent = res.motivo === 'vacio' ? 'Escribí un nombre.' : res.motivo === 'demasiados_registros' ? 'Demasiados nombres nuevos desde este celular por hoy.' : 'No se pudo registrar, probá de nuevo.';
  });
}
function aceptarNombreServidor(nombre){
  jugador = nombre;
  try{ localStorage.setItem(NAME_KEY, jugador); }catch(e){}
  document.getElementById('playerName').textContent = jugador;
  document.getElementById('nameOverlay').classList.remove('show');
  document.getElementById('namePinBtn').hidden = true;
}
function guardarNombreServidor(){
  const inp = document.getElementById('nameInput');
  const btn = document.getElementById('nameSaveBtn');
  const err = document.getElementById('nameError');
  const val = inp.value.replace(/[<>]/g, '').trim().slice(0, 20);
  if(!val){ err.textContent = 'Escribí un nombre.'; inp.focus(); return; }
  const textoBtn = btn.textContent;
  btn.disabled = true; btn.textContent = 'Verificando...'; err.textContent = '';
  registrarEnServidor(val).catch(() => { err.textContent = 'Sin conexión: el álbum se guarda en internet, probá cuando vuelva la señal.'; })
    .then(() => { btn.disabled = false; btn.textContent = textoBtn; });
}

/* ---------------- PIN ---------------- */
let pinModo = 'poner';
function abrirPin(modo){
  pinModo = modo;
  const entrar = modo === 'entrar';
  document.getElementById('pinTitle').textContent = entrar ? 'Entrar con tu PIN' : 'Protegé tu álbum';
  document.getElementById('pinTexto').textContent = entrar
    ? 'Escribí tu nombre de entrenador y tu PIN para traer tu álbum a este celular.'
    : 'Elegí un PIN de 4 números. Si cambiás de celular o se borra el navegador, entrás con tu nombre y este PIN y recuperás todo.';
  const nom = document.getElementById('pinNombre');
  nom.hidden = !entrar;
  if(entrar) nom.value = document.getElementById('nameInput').value.trim();
  document.getElementById('pinOkBtn').textContent = entrar ? 'Entrar' : 'Guardar PIN';
  document.getElementById('pinNoBtn').textContent = entrar ? 'Volver' : 'Ahora no';
  document.getElementById('pinInput').value = '';
  document.getElementById('pinError').textContent = '';
  document.getElementById('nameOverlay').classList.remove('show');
  document.getElementById('pinOverlay').classList.add('show');
  setTimeout(() => document.getElementById(entrar && !nom.value ? 'pinNombre' : 'pinInput').focus(), 100);
}
function cerrarPin(){
  document.getElementById('pinOverlay').classList.remove('show');
  if(pinModo === 'entrar' && !servidorListo) pedirNombre();
}
function ofrecerPin(){
  let ya = null;
  try{ ya = localStorage.getItem(PIN_OFRECIDO_KEY); }catch(e){}
  if(ya) return;
  try{ localStorage.setItem(PIN_OFRECIDO_KEY, '1'); }catch(e){}
  /* espera un momento tranquilo: que no haya ninguna pantalla abierta (sobre, regalo, tienda...) */
  const intentar = n => setTimeout(() => {
    if(!document.querySelector('.overlay.show, .special-overlay.show, .name-overlay.show') && !advAbierto) abrirPin('poner');
    else if(n < 40) intentar(n + 1);
  }, 3000);
  intentar(0);
}
function okPin(){
  const pin = document.getElementById('pinInput').value.trim();
  const err = document.getElementById('pinError');
  const btn = document.getElementById('pinOkBtn');
  if(!/^\d{4,6}$/.test(pin)){ err.textContent = 'El PIN tiene que ser de 4 a 6 números.'; return; }
  btn.disabled = true;
  const fin = () => { btn.disabled = false; };
  if(pinModo === 'poner'){
    api('/pin', {pin}).then(res => {
      if(!res.ok){ err.textContent = 'No se pudo guardar, probá de nuevo.'; return; }
      document.getElementById('pinOverlay').classList.remove('show');
      avisoServidor('', '🔒 Listo: tu álbum quedó protegido con tu PIN.');
    }).catch(() => { err.textContent = 'Sin conexión, probá de nuevo.'; }).then(fin);
    return;
  }
  const nombre = document.getElementById('pinNombre').value.trim();
  if(!nombre){ err.textContent = 'Escribí tu nombre de entrenador.'; fin(); return; }
  api('/entrar', {nombre, pin, dispositivo}).then(res => {
    if(!res.ok){
      err.textContent = res.motivo === 'pin_incorrecto' ? 'PIN incorrecto.' : res.motivo === 'muchos_intentos' ? 'Muchos intentos. Esperá 15 minutos.'
        : res.motivo === 'sin_pin' ? 'Ese entrenador no tiene PIN. Pedile ayuda a quien organiza el juego.' : res.motivo === 'no_existe' ? 'No hay ningún entrenador con ese nombre.' : 'No se pudo entrar.';
      return;
    }
    guardarToken(res.token);
    aceptarNombreServidor(res.jugador);
    document.getElementById('pinOverlay').classList.remove('show');
    return res.migrado ? cargarDelServidor() : migrarAlServidor();
  }).catch(() => { err.textContent = 'Sin conexión, probá de nuevo.'; }).then(fin);
}
document.getElementById('pinOkBtn').onclick = okPin;
document.getElementById('pinNoBtn').onclick = cerrarPin;
document.getElementById('pinInput').addEventListener('keydown', e => { if(e.key === 'Enter') okPin(); });
document.getElementById('namePinBtn').onclick = () => abrirPin('entrar');

/* ---------------- jugadas ---------------- */
function puedeJugar(clave){
  if(!servidorListo){ avisoServidor('cargando'); return false; }
  if(enCurso.has(clave)) return false;
  enCurso.add(clave);
  return true;
}
const soltar = clave => () => enCurso.delete(clave);

function openPackServidor(){
  if(coins < PACK_COST || !puedeJugar('sobre')) return;
  document.getElementById('openBtn').disabled = true;
  accionServidor('sobre').then(res => {
    if(!res.ok) return avisoServidor(res.motivo);
    const pulls = res.resultado.pulls.map(aPull);
    enviarPuntaje();
    const specials = pulls.filter(x => isSpecial(x.p));
    if(specials.length) playSpecialSequence(specials, 0, () => showReveal(pulls));
    else showReveal(pulls);
  }).catch(() => {}).then(soltar('sobre')).then(updateCoins);
}

function canjearRepetidasServidor(){
  if(!puedeJugar('canje')) return;
  accionServidor('canje').then(res => {
    if(!res.ok) return avisoServidor(res.motivo);
    const pulls = res.resultado.pulls.map(aPull);
    enviarPuntaje();
    if(isSpecial(pulls[0].p)) playSpecialSequence(pulls, 0, () => showReveal(pulls, 'Canjeaste 3 repetidas'));
    else showReveal(pulls, 'Canjeaste 3 repetidas');
  }).catch(() => {}).then(soltar('canje'));
}

/* "Responder y ganar": el servidor arma la pregunta y se queda con la respuesta. */
function startQuizServidor(){
  if(!puedeJugar('quiz')) return;
  accionServidor('quiz').then(res => {
    if(!res.ok) return avisoServidor(res.motivo);
    const q = res.resultado;
    quizModo = q.modo;
    quizTarget = POR_ID_C[q.id];
    const img = document.getElementById('quizImg');
    const nameBox = document.getElementById('quizName');
    const optBox = document.getElementById('quizOptions');
    document.getElementById('quizFeedback').textContent = '';
    optBox.innerHTML = '';
    img.classList.remove('silueta');
    img.src = quizTarget.img;
    if(quizModo === 'silueta'){
      document.getElementById('quizTitle').textContent = '¿Quién es este Pokémon?';
      img.classList.add('silueta');
      nameBox.textContent = '';
      img.onerror = () => { if(quizModo === 'silueta') nameBox.textContent = quizTarget.name; };
    } else {
      document.getElementById('quizTitle').textContent = '¿De qué tipo es...?';
      img.onerror = null;
      nameBox.textContent = quizTarget.name;
    }
    q.opciones.forEach(op => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt';
      if(quizModo === 'silueta') btn.textContent = op;
      else {
        btn.textContent = TYPE_LABEL[op];
        btn.style.borderColor = TYPE_COLORS[op];
        btn.style.background = TYPE_COLORS[op] + '22';
      }
      btn.onclick = () => responderServidor(op, optBox, btn);
      optBox.appendChild(btn);
    });
    document.getElementById('quizOverlay').classList.add('show');
    arrancarReloj('quizTimer', q.segundos || QUIZ_SEGUNDOS, () => {
      Array.from(optBox.children).forEach(b => b.disabled = true);
      accionServidor('responder', {eleccion: null}).then(r => { if(r.ok) quizSinResponder(optBox, r.resultado.correcta); }).catch(() => {});
    });
  }).catch(() => {}).then(soltar('quiz'));
}
function responderServidor(eleccion, optBox, btnElegido){
  ocultarReloj();
  Array.from(optBox.children).forEach(b => b.disabled = true);
  const feedback = document.getElementById('quizFeedback');
  accionServidor('responder', {eleccion}).then(res => {
    if(!res.ok){ feedback.style.color = '#E3453B'; feedback.textContent = 'Esa pregunta ya venció. Tocá "Otra".'; return; }
    const r = res.resultado, correct = r.correcta;
    btnElegido.classList.add(r.acerto ? 'correcta' : 'errada');
    const eraEste = quizModo === 'silueta' ? quizTarget.name : TYPE_LABEL[correct];
    if(quizModo === 'silueta'){
      document.getElementById('quizImg').classList.remove('silueta');
      document.getElementById('quizName').textContent = quizTarget.name;
      if(!r.acerto) Array.from(optBox.children).forEach(b => { if(b.textContent === correct) b.classList.add('correcta'); });
    }
    if(r.tope){ feedback.style.color = '#E3453B'; feedback.textContent = (r.acerto ? '¡Correcto! ' : `Era ${eraEste}. `) + 'Ya respondiste un montón hoy: hasta mañana no dan monedas.'; }
    else if(r.tarde){ feedback.style.color = '#E3453B'; feedback.textContent = `¡Se acabó el tiempo! Era ${eraEste}. 0 monedas`; }
    else if(r.acerto){ feedback.style.color = '#3DAA5B'; feedback.textContent = `¡Correcto! +${r.premio} monedas`; }
    else { feedback.style.color = '#E3453B'; feedback.textContent = `Era ${eraEste}. +${r.premio} monedas de consuelo`; }
  }).catch(() => { feedback.style.color = '#E3453B'; feedback.textContent = 'Sin conexión, probá de nuevo.'; });
}

function comprarBolaServidor(tipo){
  if(!puedeComprar(tipo) || !puedeJugar('comprar')) return;
  accionServidor('comprar', {tipo}).then(res => {
    if(!res.ok) return avisoServidor(res.motivo);
    const b = BOLAS[tipo];
    renderTienda();
    const ev = eventoActivo();
    const proxima = (ev && ev.cooldownCompraMaestraMin) ? `en ${ev.cooldownCompraMaestraMin} min` : 'mañana';
    document.getElementById('shopFeedback').innerHTML =
      `Compraste ${b.cantidad > 1 ? b.cantidad + ' ' : ''}<b>${b.nombre}</b>` + (b.porDia ? ' · la próxima, ' + proxima : '');
  }).catch(() => {}).then(soltar('comprar'));
}

/* ---------------- Aventura ---------------- */
function levantarServidor(mapa, x, y){
  if(!servidorListo) return;
  accionServidor('levantar', {mapa, x, y, region: advRegion}).then(res => {
    if(!res.ok) return;
    const r = res.resultado;
    if(r.moneda != null){ advMensaje(`Encontraste <b>${r.moneda}</b> monedas 🪙`); enviarPuntaje(); }
    else advMensaje(`Encontraste una <b>${BOLAS[r.bola].nombre}</b> en el piso`);
  }).catch(() => {});
}

function encuentroServidor(x, y){
  if(!servidorListo || enCurso.has('encuentro')) return;
  enCurso.add('encuentro');
  const mapa = advMapa;
  accionServidor('encuentro', {mapa, x, y, region: advRegion}).then(res => {
    if(res.ok && advAbierto && advMapa === mapa && !encuentro && !avistamientoActivo()) iniciarEncuentro(POR_ID_C[res.resultado.id]);
  }).catch(() => {}).then(soltar('encuentro'));
}

/* Cerca de un altar el juego tiraba los dados en cada paso; con servidor se juntan los pasos y
   se pregunta como mucho una vez por segundo (el servidor tira los dados por cada paso). */
let altarPasos = 0, altarEnVuelo = false, altarUltimo = 0;
function tirarAltarServidor(santuario, ax, ay, px, py){
  if(!servidorListo) return;
  altarPasos++;
  if(altarEnVuelo || Date.now() - altarUltimo < 900) return;
  const pasos = Math.min(6, altarPasos);
  altarPasos = 0; altarEnVuelo = true; altarUltimo = Date.now();
  const mapa = advMapa;
  accionServidor('altar', {mapa, x: px, y: py, region: advRegion, pasos}).then(res => {
    if(!res.ok || !advAbierto || advMapa !== mapa) return;
    const r = res.resultado;
    if(r.silencio){
      if(r.motivo === 'evento') advMensaje('✨ El altar está en silencio. Durante el evento sólo aparecen legendarios de Kanto y Johto.');
      else {
        const ev = eventoVistaActiva();
        const cierre = (ev && ev.cooldownLegendarioMin) ? `Volvé a probar en ${ev.cooldownLegendarioMin} minutos.` : 'Volvé mañana.';
        advMensaje(`✨ El altar está en silencio. Ya aparecieron <b>${r.salidos.join('</b>, <b>')}</b> acá. ${cierre}`);
      }
      advDescanso = DESCANSO_ENCUENTRO * 4;
      return;
    }
    if(r.aparece){
      advDescanso = DESCANSO_ENCUENTRO;
      advMensaje(`✨ <b>${r.altar}</b> se ilumina… ¡acercate al altar!`);
      mostrarLegendarioEnMapa(POR_ID_C[r.aparece], r.x, r.y);
    }
  }).catch(() => {}).then(() => { altarEnVuelo = false; });
}

function tirarBolaServidor(tipo){
  if(!encuentro || bolas[tipo] <= 0 || enCurso.has('tirar')) return;
  enCurso.add('tirar');
  const p = encuentro.p;
  const fb = document.getElementById('encFeedback');
  accionServidor('tirar', {tipo}).then(res => {
    if(!res.ok){
      if(res.motivo === 'sin_encuentro'){
        encuentro = null;
        fb.innerHTML = `<b>${p.name}</b> se fue 💨`;
        document.getElementById('encBolas').innerHTML = '';
        document.getElementById('encCloseBtn').textContent = 'Seguir explorando';
      } else avisoServidor(res.motivo);
      return;
    }
    const r = res.resultado;
    if(encuentro) encuentro.tiros = r.tiros;
    advSyncHud();
    renderEncuentro();
    if(r.atrapado){ renderGrid(); updateProgress(); capturarVista(p, r.pull.isNew); return; }
    if(r.seEscapo){
      fb.innerHTML = totalBolas() === 0 && r.tiros < ENC_TIROS
        ? `Te quedaste sin pokébolas y <b>${p.name}</b> se escapó 💨`
        : `<b>${p.name}</b> se soltó por última vez y se escapó 💨`;
      document.getElementById('encCloseBtn').textContent = 'Seguir explorando';
      encuentro = null;
      document.getElementById('encBolas').innerHTML = '';
      return;
    }
    fb.innerHTML = `¡Casi! <b>${p.name}</b> se soltó. Te quedan ${r.quedan} tiro(s).`;
  }).catch(() => {}).then(soltar('tirar'));
}

/* ---------------- Regalos ---------------- */
function cobrarRegalosServidor(){
  if(!servidorListo) return;
  api('/regalos').then(res => {
    if(!res.ok) return;
    if(res.progreso) aplicarProgreso(res.progreso);
    const out = res.resultado;
    if(!out) return;
    const regaladas = out.pulls.map(aPull), ejPulls = out.ejemplares.map(aPull);
    const espPulls = out.especiales.map(x => ({p: ESPECIAL_POR_ID[x.id], isNew: x.isNew})).filter(x => x.p);
    if(!out.monedas && !regaladas.length && !ejPulls.length && !espPulls.length && !Object.keys(out.bolas).length) return;
    enviarPuntaje();
    mostrarRegalos({total: out.monedas, regaladas, ejPulls, espPulls, bolasGanadas: out.bolas, esAventura: out.aventura,
      esEvento: out.evento ? EVENTOS.find(e => e.slug === out.evento) : null, esBienvenida: !!out.bienvenida, mensaje: out.mensaje || ''});
  }).catch(() => {});
}

/* ---------------- Códigos de intercambio ---------------- */
function sincronizarCodigos(){
  api('/codigo/mios').then(res => {
    if(!res.ok) return;
    const lista = res.codigos.map(c => ({codigo: c.codigo, pokemonId: c.pokemonId, creado: Date.parse(c.creado) || Date.now()}));
    try{ localStorage.setItem(CODIGOS_KEY, JSON.stringify(lista)); }catch(e){}
    if(document.getElementById('intercambioOverlay').classList.contains('show')) renderMisCodigos();
  }).catch(() => {});
}
function generarCodigoServidor(pokemonId, btn, serie){
  if(!jugador || state[pokemonId].dup < 1 || !servidorListo) return;
  btn.disabled = true;
  btn.textContent = 'Generando...';
  api('/codigo/generar', {pokemonId, serie}).then(res => {
    if(!res.ok) throw new Error(res.motivo);
    aplicarProgreso(res.progreso);
    const r = res.resultado;
    guardarCodigoGenerado(r.codigo, pokemonId);
    enviarPuntaje();
    renderIntercambioDup();
    renderMisCodigos();
    mostrarCartaCodigo(pokemonId, r.codigo, r.fuerza > 100 ? r.fuerza - 100 : r.fuerza, r.fuerza > 100);
  }).catch(() => {
    btn.disabled = false;
    btn.textContent = 'No se pudo, probá de nuevo';
    setTimeout(() => { btn.textContent = 'Generar código'; }, 2500);
  });
}
function canjearCodigoServidor(){
  const inp = document.getElementById('canjeCodigoInput');
  const btn = document.getElementById('canjeCodigoBtn');
  const fb  = document.getElementById('canjeCodigoFeedback');
  const codigo = inp.value.trim().toUpperCase();
  if(!codigo){ fb.style.color = 'var(--red)'; fb.textContent = 'Escribí un código.'; return; }
  if(!jugador || !servidorListo) return;
  const textoBtn = btn.textContent;
  btn.disabled = true; btn.textContent = 'Canjeando...'; fb.textContent = '';
  api('/codigo/canjear', {codigo}).then(res => {
    if(!res.ok){
      fb.style.color = 'var(--red)';
      fb.textContent = res.motivo === 'propio' ? 'Ese código lo generaste vos: no te lo podés canjear a vos mismo.'
        : res.motivo === 'usado' ? 'Ese código ya lo usó otro entrenador.'
        : res.motivo === 'cancelado' ? 'Ese código lo canceló quien lo hizo.'
        : res.motivo === 'no_existe' ? 'Ese código no existe. Revisalo bien.'
        : 'No se pudo canjear. Revisá el código.';
      return;
    }
    aplicarProgreso(res.progreso);
    enviarPuntaje();
    inp.value = '';
    document.getElementById('intercambioOverlay').classList.remove('show');
    const r = res.resultado;
    if(r.especial){ mostrarEspeciales([{p: ESPECIAL_POR_ID[r.especial], isNew: r.isNew}]); return; }
    const pull = [aPull(r.pull)];
    if(isSpecial(pull[0].p)) playSpecialSequence(pull, 0, () => showReveal(pull, 'Canjeaste un código'));
    else showReveal(pull, 'Canjeaste un código');
  }).catch(() => { fb.style.color = 'var(--red)'; fb.textContent = 'Sin conexión. Probá de nuevo en un rato.'; })
    .then(() => { btn.disabled = false; btn.textContent = textoBtn; });
}
function cancelarCodigoServidor(codigo, btn, alTerminar){
  if(!jugador) return;
  if(btn.dataset.confirmar !== '1'){
    btn.dataset.confirmar = '1';
    btn.dataset.texto = btn.textContent;
    btn.textContent = '¿Seguro? Tocá de nuevo';
    setTimeout(() => { if(btn.dataset.confirmar === '1'){ btn.dataset.confirmar = ''; btn.textContent = btn.dataset.texto; } }, 3500);
    return;
  }
  btn.dataset.confirmar = '';
  btn.disabled = true;
  btn.textContent = 'Cancelando...';
  const sacarDeLista = () => { try{ localStorage.setItem(CODIGOS_KEY, JSON.stringify(misCodigos().filter(i => i.codigo !== codigo))); }catch(e){} };
  api('/codigo/cancelar', {codigo}).then(res => {
    if(!res.ok){
      sacarDeLista(); renderMisCodigos();
      if(alTerminar) alTerminar(false, 'No se pudo cancelar: ese código ya lo canjeó otro entrenador.');
      return;
    }
    aplicarProgreso(res.progreso);
    sacarDeLista();
    enviarPuntaje();
    renderIntercambioDup();
    renderMisCodigos();
    const p = POR_ID_C[res.resultado.pokemonId] || ESPECIAL_POR_ID[res.resultado.pokemonId];
    if(alTerminar) alTerminar(true, 'Código ' + codigo + ' cancelado: ' + (p ? p.name : 'la figurita') + ' volvió a tu álbum.');
  }).catch(() => {
    btn.disabled = false;
    btn.textContent = 'Sin conexión, probá de nuevo';
    setTimeout(() => { btn.textContent = btn.dataset.texto || 'Cancelar'; }, 2500);
  });
}

if(MODO_SERVIDOR) arrancarServidor();
