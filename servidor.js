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
const CAMBIAN_ALBUM = new Set(['sobre', 'canje', 'evolucionar', 'subirFuerza', 'mejorarStat', 'reiniciarMejoras', 'cambiarAtaques', 'ejemplarFavorito', 'tirar', 'arenaTerminar', 'calendarioCobrar']);

const MENSAJES = {
  lejos_del_lider: 'Para desafiar al gimnasio tenés que estar al lado del líder.', falta_medalla_previa: 'Primero tenés que ganarle al líder anterior: los gimnasios van en orden.', ya_ganado: 'A ese líder ya le ganaste: seguí con el siguiente.', faltan_requisitos: 'Todavía no cumplís lo que pide ese líder para pelear.', todavia_no: 'Todavía no completaste esa misión.',
  sin_habilitar: 'Primero habilitá a ese Pokémon como compañero', ya_habilitado: 'Ese Pokémon ya está habilitado de compañero', no_puede_ser_companero: 'Ese Pokémon no puede ser compañero (no queda bien en el mapa)', se_consigue_canjeando: 'Esa pokébola se consigue cambiando las de abajo', sin_bolas: 'No te alcanzan las pokébolas para ese cambio', canje_invalido: 'Ese cambio no existe',
  sin_monedas: 'No te alcanzan las monedas.',
  fuerza_maxima: 'Esa figurita ya tiene el nivel máximo.',
  fusion_shiny_distinto: 'Shiny sólo se usa con shiny, y común con común.', fusion_invalida: 'Elegí qué copias fusionar.', mejora_invalida: 'Elegí qué mejorar.', mejora_maxima: 'Esa característica ya está al máximo.', mejora_copias: 'Elegí la cantidad justa de copias.', especialidades_llenas: 'Este Pokémon ya eligió sus 2 especialidades: las otras están bloqueadas.', sin_mejoras: 'Este Pokémon no tiene mejoras para reiniciar.', sobran_copias: 'Con menos copias ya llega a 100: sacá alguna.',
  especial_sin_cambio: 'Los ataques de las figuritas especiales no se cambian.',
  slots_invalidos: 'Elegí qué ataque cambiar.',
  sin_diamantes: 'No te alcanzan los diamantes.',
  sin_repetidas: 'Necesitás tener copias repetidas para elegir.',
  especial_sin_repetidas: 'Las figuritas especiales son una sola.',
  ya_la_tenes: 'Ya tenés esa montura.',
  tienda_cerrada: 'Esta tienda todavía no está abierta para vos.',
  tope_diario: 'Ya llegaste al tope de hoy (se renueva mañana).',
  pocas_repetidas: 'Necesitás 3 repetidas para canjear.',
  pocas_repetidas_evo: 'No te alcanzan las repetidas para evolucionar.',
  no_evoluciona: 'Ese Pokémon no evoluciona en eso.',
  evento_solo_kanto_johto: 'Durante el evento sólo se puede evolucionar a Pokémon de Kanto y Johto.',
  album_completo: '¡Ya tenés todas!',
  sin_bolas: 'No te quedan de esa pokébola.',
  no_es_tuyo: 'Ese Pokémon no está en tu álbum.',
  equipo_invalido: 'Elegí entre 3 y 6 Pokémon.', falta_ganar_pelea: 'Primero tenés que ganarle la pelea al legendario.', ya_ganado_altar: 'Ya le ganaste: ¡tirá las pokébolas!', sin_encuentro: 'El legendario ya se fue del altar.',
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
  if(t && typeof MUNDO !== 'undefined' && MUNDO.abierto) mundoConectar();   // 22/11: jugador nuevo que entra a la Aventura antes de tener sesión
}
function perderSesion(){
  guardarToken('');
  servidorListo = false;
  if(jugador) registrarEnServidor(jugador, {alArrancar: true});
}

/* El álbum que manda el servidor pisa al de la pantalla (mismo formato que el localStorage). */
let premioAlbumPedido = false;
function aplicarProgreso(P, conAlbum = true){
  coins = P.coins;
  Object.keys(state).forEach(id => { state[id] = P.state[id] || {got: false, dup: 0}; });
  Object.keys(bolas).forEach(k => { bolas[k] = P.bolas[k] || 0; });
  Object.assign(maestro, P.maestro);
  emperador = P.emperador || null;
  incBolas = P.incBolas || 0; incursionPendiente = P.incursionPendiente || null;
  comprasDia = P.comprasDia || {};
  canjesDia = P.canjesDia || {};
  legendariosDia = P.legendariosDia || {dia: null, obtenidos: {}};
  advTomados.clear();
  (P.tomados || []).forEach(k => advTomados.add(k));
  especiales = P.especiales || {};
  /* completó las 1025 en esta sesión: el servidor entrega el premio del álbum (una vez; si ya lo cobró no hace nada) */
  if(servidorListo && !premioAlbumPedido && Object.keys(state).every(id => state[id].got)){ premioAlbumPedido = true; setTimeout(cobrarRegalosServidor, 3000); }
  eventosServidor = P.eventos || {};
  diamantes = P.diamantes || 0; monturas = P.monturas || {}; montura = P.montura || null;
  companeroHabs = (P.companero && P.companero.hab) || {}; companero = (P.companero && P.companero.id) || null;
  npcRegalos = P.npc || {};
  if(typeof actualizarBotonMontura === 'function') actualizarBotonMontura();
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
  setTimeout(() => mostrarNovedades(0), 2500);
  calAlEntrar();
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
    if(isSpecial(pulls[0].p)) playSpecialSequence(pulls, 0, () => showReveal(pulls, tituloCanje(pulls[0].isNew)));
    else showReveal(pulls, tituloCanje(pulls[0].isNew));
  }).catch(() => {}).then(soltar('canje'));
}

function evolucionarServidor(id, destId, serie){
  if(!puedeJugar('evolucionar')) return;
  const ej = Object.assign({}, ((state[id] && state[id].ej) || []).find(e => e.c === serie) || {});   // fuerza y shiny se conservan al evolucionar
  accionServidor('evolucionar', {id, a: destId, c: serie}).then(res => {
    if(!res.ok) return avisoServidor(res.motivo);
    const pulls = res.resultado.pulls.map(aPull);
    escenaEvolucion(id, pulls[0], ej);   // la lista se rehace al cerrar la escena
    setTimeout(enviarPuntaje, 6000);   // 14/11: escena de evolución con música (antes: carta "Evolucionó a …")
  }).catch(() => {}).then(soltar('evolucionar'));
}


/* Entrenar (05/11): subir fuerza y cambiar ataques al azar, cuestan monedas. Los precios los decide el servidor; estos son los que se muestran. */
const ENTRENAR = {fuerza: [[40, 400], [70, 900], [90, 1700], [99, 3500]], ataque: 1000, ataqueTres: 2500, especialX: 3};
const precioSubirFuerza = f => (ENTRENAR.fuerza.find(([h]) => f <= h) || ENTRENAR.fuerza[ENTRENAR.fuerza.length - 1])[1];
function subirFuerzaServidor(id, serie){
  if(!puedeJugar('entrenar')) return;
  accionServidor('subirFuerza', {id, c: serie}).then(res => {
    if(!res.ok) return avisoServidor(res.motivo);
    const r = res.resultado;
    avisoServidor('ok', '💪 Nivel ' + r.antes + ' → ' + r.f + ' (−' + r.costo + ' monedas)');
    updateCoins(); abrirDetalle(id);
  }).catch(() => {}).then(soltar('entrenar'));
}
function favoritoServidor(id, serie){
  if(!puedeJugar('favorito')) return;
  accionServidor('ejemplarFavorito', {id, c: serie}).then(res => {
    if(!res.ok) return avisoServidor(res.motivo);
    avisoServidor('ok', res.resultado.fav ? '⭐ Ésta es la que va a pelear' : 'Volvió a pelear la más fuerte');
    abrirDetalle(id);
  }).catch(() => {}).then(soltar('favorito'));
}
function cambiarAtaquesServidor(id, serie, slots){
  if(!puedeJugar('entrenar')) return;
  accionServidor('cambiarAtaques', {id, c: serie, slots}).then(res => {
    if(!res.ok) return avisoServidor(res.motivo);
    avisoServidor('ok', '🔀 Ataques cambiados (−' + res.resultado.costo + ' monedas)');
    updateCoins(); abrirDetalle(id);
  }).catch(() => {}).then(soltar('entrenar'));
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

function companeroHabilitarServidor(id){
  if(!puedeJugar('compa')) return;
  accionServidor('companeroHabilitar', {id}).then(res => {
    if(!res.ok) return avisoServidor(res.motivo);
    companeroRefrescarUI();
    const f = document.getElementById('shopFeedback'); if(f) f.textContent = '¡Compañero habilitado!';
  }).catch(() => {}).then(soltar('compa'));
}
function companeroElegirServidor(id){
  if(!puedeJugar('compa')) return;
  accionServidor('companeroElegir', {id}).then(res => {
    if(!res.ok) return avisoServidor(res.motivo);
    rastroReiniciar(); companeroRefrescarUI();
  }).catch(() => {}).then(soltar('compa'));
}
function canjearBolasServidor(de, veces){
  if(!puedeJugar('canje')) return;
  accionServidor('canjearBolas', {de, veces}).then(res => {
    if(!res.ok) return avisoServidor(res.motivo);
    renderTienda();
    document.getElementById('shopFeedback').innerHTML = `Cambiaste ${res.gasto != null ? res.gasto : ''} <b>${BOLAS[de].nombre}</b> por ${veces} <b>${BOLAS[(CANJES_BOLAS.find(x => x.de === de) || {}).a].nombre}</b>`;
  }).catch(() => {}).then(soltar('canje'));
}

/* ---------------- Monturas (tienda de diamantes, modo prueba) ---------------- */
function monturaComprarServidor(clave){
  if(!puedeJugar('montura')) return;
  accionServidor('monturaComprar', {id: clave}).then(res => {
    if(!res.ok) return avisoServidor(res.motivo);
    renderTienda();
    try{ localStorage.setItem('album-montura-ultima', clave); }catch(e){}
    document.getElementById('shopFeedback').innerHTML = `¡Ahora tenés a <b>${MONTURAS[clave].nombre}</b>! Ya la llevás puesta.`;
  }).catch(() => {}).then(soltar('montura'));
}
function monturaElegirServidor(clave){
  if(!puedeJugar('montura')) return;
  accionServidor('monturaElegir', {id: clave}).then(res => {
    if(!res.ok) return avisoServidor(res.motivo);
    if(clave) try{ localStorage.setItem('album-montura-ultima', clave); }catch(e){}
    if(document.getElementById('shopOverlay').classList.contains('show')) renderTienda();
  }).catch(() => {}).then(soltar('montura'));
}

/* ---------------- NPC que regalan pokébolas (Gobernador Sadir) ---------------- */
let npcRegalos = {};   // npc -> cuándo cobraste (ms), viene del servidor
const NPC_CADA_MS = 24 * 3600e3;
/* Frases de cada uno al regalar (a revisar por Zeta) */
const NPC_FRASE = {
  millon: '¡Desde el Concejo Deliberante, para los vecinos entrenadores de Jujuy!',
  chuli: '¡Del Intendente para los entrenadores de la ciudad!',
  gunzack: '¡Del equipo de admins, para los entrenadores de todo el mapa!',
  joker: '¡Un regalito del admin JokeR, a seguir atrapando!',
  mago: '¡Magia de admin: pokébolas y oro para vos!'
};
let npcActual = null;
function npcBoton(cerca){
  const b = document.getElementById('advNpcBtn');
  if(!b) return;
  npcActual = cerca;
  const ver = !!cerca && servidorListo;
  if(b.hidden === ver) b.hidden = !ver;
  if(ver && b.dataset.npc !== cerca.id){ b.dataset.npc = cerca.id; b.textContent = (HIST_NPC[cerca.id] ? '💬 Hablar con ' : '🎁 Hablar con ') + cerca.nombre; }
}
function npcFaltante(npc){
  const falta = (npcRegalos[npc] || 0) + NPC_CADA_MS - Date.now();
  if(falta <= 0) return '';
  const h = Math.floor(falta / 3600e3), m = Math.ceil((falta % 3600e3) / 60e3);
  return h ? `${h} h ${m} min` : `${m} min`;
}
function hablarConNpc(){
  const n = npcActual;
  if(n && HIST_NPC[n.id]) return HIST_NPC[n.id](n);   // modo historia: Profesor y líderes
  if(!n || !puedeJugar('npc')) return;
  const espera = npcFaltante(n.id);
  if(espera){ soltar('npc')(); return advMensaje(`🏛️ <b>${n.nombre}</b>: ¡Ya te di tus pokébolas de hoy! Volvé en ${espera}.`); }
  accionServidor('regaloNpc', {npc: n.id, mapa: advMapa, x: Math.round(advPx), y: Math.round(advPy)}).then(res => {
    if(!res.ok){
      if(res.motivo === 'lejos_del_npc') return advMensaje('Acercate un poco más 🚶');
      if(res.motivo === 'volve_mas_tarde') return advMensaje(`🏛️ <b>${n.nombre}</b>: ¡Ya te di tus pokébolas de hoy! Volvé mañana.`);
      return avisoServidor(res.motivo);
    }
    const b = res.resultado.bolas, txt = Object.keys(b).map(t => `+${b[t]} ${BOLAS[t] ? BOLAS[t].nombre : t}`).concat(res.resultado.monedas ? [`+${res.resultado.monedas} monedas 🪙`] : []).join(' · ');
    if(res.resultado.monedas) enviarPuntaje();
    advMensaje(`🏛️ <b>${n.nombre}</b>: ${NPC_FRASE[n.id] || '¡Para los entrenadores de Jujuy!'}<br>${txt}`);
  }).catch(() => {}).then(soltar('npc'));
}
(() => { const b = document.getElementById('advNpcBtn'); if(b) b.onclick = hablarConNpc; })();

/* ================= MODO HISTORIA (14/11): "La Liga de Jujuy" =================
   Lo decide el servidor (juego.js: historiaVer, misionCobrar, hablarProfesor, arenaEmpezar con reto). Acá sólo se muestra. */
const MEDALLAS = [
  {id: 'g1', nombre: 'Medalla Lapacho', emoji: '🌸', lider: 'Rey sin Corona del Lapacho', lugar: 'Parque San Martín (Valles)', tipo: 'Planta', x: 93, y: 148},
  {id: 'g2', nombre: 'Medalla Selva', emoji: '🪲', lider: 'Guardián de la Selva', lugar: 'Calilegua (Yungas)', tipo: 'Bicho', x: 139, y: 135},
  {id: 'g3', nombre: 'Medalla Siete Colores', emoji: '⛰️', lider: 'Señor de los Siete Colores', lugar: 'Purmamarca (Quebrada)', tipo: 'Roca y Tierra', x: 26, y: 177},
  {id: 'g4', nombre: 'Medalla Hornocal', emoji: '🥊', lider: 'Titán del Hornocal', lugar: 'Hornocal (Alta Quebrada)', tipo: 'Lucha', x: 133, y: 109},
  {id: 'g5', nombre: 'Medalla Rayo', emoji: '⚡', lider: 'Señor del Rayo', lugar: 'Cauchari (Puna)', tipo: 'Eléctrico', x: 38, y: 31},
  {id: 'g6', nombre: 'Medalla Llama de Hielo', emoji: '❄️', lider: 'Rey de la Helada', lugar: 'La Quiaca (Puna norte)', tipo: 'Hielo', x: 90, y: 12},
  {id: 'g7', nombre: 'Medalla Pucará', emoji: '👁️', lider: 'Vidente del Pucará', lugar: 'Tilcara (Quebrada)', tipo: 'Psíquico y Hada', x: 12, y: 127},
  {id: 'g8', nombre: 'Medalla Carnaval', emoji: '👻', lider: 'Heraldo de las Sombras', lugar: 'Humahuaca', tipo: 'Siniestro y Fantasma', x: 120, y: 22},
  {id: 'g9', nombre: 'Medalla Altos Hornos', emoji: '⚙️', lider: 'Forjador de Acero', lugar: 'San Pedro de Jujuy (Alola)', tipo: 'Acero', x: 81, y: 249},
  {id: 'g10', nombre: 'Medalla Flamenco', emoji: '🦩', lider: 'Dama de la Laguna', lugar: 'Laguna de los Pozuelos (Puna)', tipo: 'Agua y Volador', x: 14, y: 47},
  {id: 'g11', nombre: 'Medalla Salar', emoji: '🧂', lider: 'Alquimista del Salar', lugar: 'Salinas Grandes', tipo: 'Veneno y Tierra', x: 27, y: 211},
  {id: 'g12', nombre: 'Medalla Paleta del Pintor', emoji: '🎨', lider: 'Pintora de la Paleta', lugar: 'Maimará (Quebrada)', tipo: 'Normal', x: 13, y: 167},
  {id: 'g13', nombre: 'Medalla Volcán', emoji: '🌋', lider: 'Señor del Fuego', lugar: 'Cerro Colorado (Puna norte)', tipo: 'Fuego y Dragón', x: 82, y: 90},
  {id: 'g14', nombre: 'Medalla Trueno', emoji: '🌩️', lider: 'Dama del Trueno', lugar: 'Iruya (Alta Quebrada)', tipo: 'Eléctrico y Lucha', x: 148, y: 55},
  {id: 'g15', nombre: 'Medalla Tormenta', emoji: '⛈️', lider: 'Amo de la Tormenta', lugar: 'Dique La Ciénaga (Valles)', tipo: 'Agua y Eléctrico', x: 76, y: 166},
  {id: 'g16', nombre: 'Medalla Zenta', emoji: '🔮', lider: 'Oráculo del Zenta', lugar: 'Valle de los Pericos (Alola)', tipo: 'Psíquico', x: 79, y: 271},
  {id: 'g17', nombre: 'Medalla Sombras', emoji: '🌙', lider: 'Señor de las Sombras', lugar: 'Yala (Valle de las Sombras)', tipo: 'Fantasma y Siniestro', x: 132, y: 193},
  {id: 'g18', nombre: 'Medalla Cielo y Mar', emoji: '🌊', lider: 'Señora del Cielo y el Mar', lugar: 'Dique Los Alisos', tipo: 'Agua, Dragón y Volador', x: 96, y: 213},
  {id: 'g19', nombre: 'Medalla Sol de Jujuy', emoji: '☀️', lider: 'Campeón del Sol', lugar: 'Ruinas del Pucará de Perico (Alola)', tipo: 'Fuego, Tierra y Acero', x: 101, y: 286}
];
/* Lo que dice el Guardián de la Liga en cada paso del capítulo 1 (pide / felicita) */
const CAP1 = [
  {pide: '¡Hola! Soy el <b>Guardián de la Liga</b>. Jujuy está lleno de Pokémon y de entrenadores con ganas de llegar a la <b>Liga</b> del Estadio del Lobo. Para eso hacen falta las <b>19 medallas</b> de los gimnasios de todo Jujuy. ¡Tomá, para empezar!',
   meta: ''},
  {pide: 'Primero lo primero: <b>atrapá 3 Pokémon</b> en el pasto y volvé a contarme.', meta: 'Atrapá 3 Pokémon', n: 3},
  {pide: 'Bien ahí. Ahora probá tu equipo: <b>ganale a un entrenador en la Arena</b> (botón ⚔️ Arena del inicio, o una batalla en la Aventura).', meta: 'Ganá 1 pelea en la Arena', n: 1},
  {pide: 'Estás listo para tu primer gimnasio. El <b>Rey sin Corona del Lapacho</b> te espera en el <b>Parque San Martín</b>, acá cerquita al sur. Usa Pokémon de tipo Planta: ¡llevá Fuego o Volador!', meta: 'Ganale a el Rey sin Corona del Lapacho (Parque San Martín)'}
];
const CAP1_FIN = '¡La <b>Medalla Lapacho</b>! Sabía que podías. Ahora los <b>18 gimnasios</b> que faltan están abiertos, en el orden que quieras: cuanto más lejos, más difíciles. Mirá tus medallas en 📜 Misiones. ¡Y no te olvides de las misiones de cada día!';
/* Requisitos para desafiar a un líder (los pide el servidor): ✅/⬜ con lo que llevás */
const listaReq = req => (req || []).map(r => `${r.ok ? '✅' : '⬜'} ${r.t} <small>(${r.v}/${r.meta})</small>`).join('<br>');
const GUARDIAN = {x: 79, y: 125};   // Plaza Belgrano
const HIST = {estado: null};
const premioTexto = pr => {
  if(!pr) return '';
  const nom = {roja: 'Poké Ball', azul: 'Súper Ball', ultra: 'Ultra Ball', maestra: 'Master Ball'};
  return [pr.monedas ? `+${pr.monedas} 🪙` : '', ...Object.keys(pr.bolas || {}).map(t => `+${pr.bolas[t]} ${nom[t] || t}`), pr.diamantes ? `+${pr.diamantes} 💎` : ''].filter(Boolean).join(' · ');
};
function charla(quien, txt, botones){
  const c = document.getElementById('advCharla');
  document.getElementById('advCharlaQuien').textContent = quien;
  document.getElementById('advCharlaTxt').innerHTML = txt;
  const bx = document.getElementById('advCharlaBotones'); bx.innerHTML = '';
  (botones && botones.length ? botones : [{t: 'Seguir'}]).forEach(b => {
    const el = document.createElement('button'); el.type = 'button'; el.textContent = b.t; if(b.sec) el.className = 'sec';
    el.onclick = () => { c.hidden = true; if(b.fn) b.fn(); };
    bx.appendChild(el);
  });
  teclasApretadas.clear(); advEje = {x: 0, y: 0};
  c.hidden = false;
  bx.firstChild.focus({preventScroll: true});
}
/* 16/11: pelea previa del legendario del altar. Lo decide el servidor (equipo, fuerza según tu rango, 3 intentos); acá sólo se pregunta y se abre la Arena. */
function retarAltar(p, quedan){
  const falta = quedan !== undefined ? `<br>Te quedan <b>${quedan}</b> oportunidad${quedan === 1 ? '' : 'es'}.` : '<br>Tenés <b>3 oportunidades</b>.';
  charla(p.name, `¡<b>${p.name}</b> te desafía! Para poder atraparlo primero tenés que ganarle una pelea. Su nivel depende de tu rango de Maestro.${falta}`,
    [{t: '⚔️ ¡A pelear!', fn: () => { window.__retoArena = Object.assign({reto: 'altar', nombre: p.name}, posAdv()); window.__altarVuelta = {id: p.id}; cerrarAventura(); abrirArena(); }},
     {t: 'Huir', sec: true, fn: () => { accionServidor('huir').catch(() => {}); advMensaje(`💨 <b>${p.name}</b> se fue del altar.`); }}]);
}
/* Al volver de la Arena: si ganó, a tirar pokébolas; si perdió, cuántas oportunidades le quedan */
function altarDeVuelta(){
  const v = window.__altarVuelta; window.__altarVuelta = null;
  if(!v || !v.fin) return;
  const p = POR_ID_C[v.id];
  if(!p) return;
  if(v.gano) iniciarEncuentro(p);
  else if(v.seFue) advMensaje(`💨 <b>${p.name}</b> se cansó de esperar y se fue. Volvé mañana.`);
  else retarAltar(p, v.quedan);   // perdió: le quedan oportunidades, se ofrece pelear otra vez
}
function posAdv(){ return {mapa: advMapa, x: Math.round(advPx), y: Math.round(advPy)}; }
function hablarProfesor(n){
  if(!puedeJugar('profesor')) return;
  accionServidor('hablarProfesor', posAdv()).then(res => {
    if(!res.ok){ if(res.motivo === 'lejos_del_npc') return advMensaje('Acercate un poco más 🚶'); return avisoServidor(res.motivo); }
    const r = res.resultado, quien = n.nombre;
    if(r.fin && !r.premio) return charla(quien, CAP1_FIN);
    if(r.falta){ const p = CAP1[r.paso], obj = proximoObjetivo({paso: r.paso, cnt: r.cnt, medallas: (HIST.estado && HIST.estado.medallas) || []}); return charla(quien, p.pide + (p.n ? `<br><br>Vas <b>${r.cnt} de ${p.n}</b>.` : ''), obj ? [{t: '🧭 Guiame', fn: () => guiarA(obj)}, {t: 'Seguir', sec: true}] : null); }
    updateCoins(); enviarPuntaje();
    const sig = r.fin ? CAP1_FIN : CAP1[r.paso].pide;
    const antes = r.paso === 1 ? CAP1[0].pide + '<br><br>' : '¡Muy bien hecho! ';
    const obj = proximoObjetivo(Object.assign({}, HIST.estado || {medallas: []}, {paso: r.paso, cnt: 0}));
    charla(quien, antes + `<span style="color:#3ddc6e">${premioTexto(r.premio)}</span><br><br>` + (r.paso === 1 ? CAP1[1].pide : sig),
      obj ? [{t: '🧭 Guiame', fn: () => guiarA(obj)}, {t: 'Seguir', sec: true}] : null);
    HIST.estado = null; misPunto();
  }).catch(() => {}).then(soltar('profesor'));
}
/* Flechita que guía (como las incursiones): apunta al personaje y se quita sola al llegar */
const objDe = m => ({x: m.x, y: m.y, texto: `<b>${m.lider}</b> (${m.lugar}) para la <b>${m.nombre}</b>`});
function guiarA(obj){ advGuia = null; advGuiaObj = {x: obj.x, y: obj.y}; advMensaje('🧭 Seguí la flecha dorada hasta ' + (obj.texto || 'tu próximo objetivo')); }
/* Botón de arriba "🧭 La Liga": prende la flecha hacia tu próximo objetivo (o la apaga si ya está prendida) */
function guiaLiga(){
  if(advGuiaObj){ advGuiaObj = null; advMensaje('🧭 Flecha quitada'); return; }
  if(!servidorListo) return advMensaje('La Liga necesita conexión 📶');
  cargarHistoria().then(e => {
    if(!e) return advMensaje('No pude consultar tu avance, probá de nuevo.');
    const o = proximoObjetivo(e);
    if(o) return guiarA(o);
    const p = CAP1[e.paso];
    advMensaje(p ? `📜 <b>La Liga de Jujuy:</b> ${p.meta || p.pide}. Cuando lo cumplas, la flecha te lleva con el Guardián.` : '🏆 <b>¡Ya les ganaste a todos los líderes de Jujuy!</b>');
  });
}
(() => {
  const b = document.getElementById('advLigaGuiaBtn'), g = document.getElementById('advLigaGrupo'); if(!b || !g) return;
  b.onclick = guiaLiga;
  setInterval(() => { g.hidden = !servidorListo; b.classList.toggle('activo', !!advGuiaObj); }, 600);   // se muestra con el servidor y se ilumina mientras hay flecha
})();
/* Qué viene ahora en la historia (capítulo 1 y después los gimnasios EN ORDEN); null si no hay un lugar al que ir todavía */
function proximoObjetivo(e){
  if(!e) return null;
  const p = CAP1[e.paso], g1 = MEDALLAS[0];
  if(p){
    const hecho = e.paso === 0 || (e.paso === 3 ? e.medallas.includes('g1') : (e.cnt || 0) >= p.n);
    if(hecho) return {x: GUARDIAN.x, y: GUARDIAN.y, texto: e.paso === 0 ? 'hablar con el <b>Guardián de la Liga</b> (Plaza Belgrano)' : 'volver con el <b>Guardián de la Liga</b> (Plaza Belgrano)'};
    return e.paso === 3 ? objDe(g1) : null;
  }
  const sig = MEDALLAS.find(m => !e.medallas.includes(m.id));
  return sig ? objDe(sig) : null;
}
function ofrecerGuiaProximo(){
  cargarHistoria().then(e => {
    const o = proximoObjetivo(e);
    if(!o) return;
    charla('📜 La Liga de Jujuy', `Tu próximo objetivo: ${o.texto}.<br><br>¿Querés que una <b>flecha</b> te guíe hasta ahí?`, [{t: '🧭 Sí, guiame', fn: () => guiarA(o)}, {t: 'No, gracias', sec: true}]);
  });
}
function desafioGimnasio(reto){
  const idx = MEDALLAS.findIndex(m => m.id === reto), g = MEDALLAS[idx], prev = MEDALLAS[idx - 1];
  return n => {
    cargarHistoria(reto).then(e => {   // siempre con lo último del servidor (por si ganaste uno hace un momento)
      const ya = !!(e && e.medallas.includes(reto));
      if(ya){   // Zeta 14/11: a un líder que ya te ganó no se lo vuelve a pelear: se sigue con el siguiente
        const sig = MEDALLAS.find(m => !e.medallas.includes(m.id));
        return charla(n.nombre, `Ya me ganaste y tenés la <b>${g.nombre}</b> ${g.emoji}. Conmigo ya no hay más pelea.<br><br>` +
          (sig ? `Tu próximo desafío: ${objDe(sig).texto}.` : '¡Ya les ganaste a todos los líderes de Jujuy! 🏆'),
          sig ? [{t: '🧭 Guiame al siguiente', fn: () => guiarA(objDe(sig))}, {t: 'Entendido', sec: true}] : null);
      }
      if(prev && e && !ya && !e.medallas.includes(prev.id)){   // los gimnasios van EN ORDEN (el servidor también lo exige)
        const falta = MEDALLAS.find(m => !e.medallas.includes(m.id)) || prev;   // el PRIMERO que todavía no ganaste (si estás en el 5 y te falta el 2, te manda al 2)
        return charla(n.nombre, `Todavía no estás listo para enfrentarme. Primero tenés que ganarle a ${objDe(falta).texto}.`,
          [{t: '🧭 Guiame hasta él', fn: () => guiarA(objDe(falta))}, {t: 'Entendido', sec: true}]);
      }
      /* 14/11 Zeta: cada líder pide cosas ANTES de pelear (tener Pokémon, hacer acciones como las misiones); el servidor también lo exige */
      if(e && e.reqGym && e.reqGym.id === reto && e.reqGym.req.some(r => !r.ok))
        return charla(n.nombre, `Antes de enfrentarme tenés que cumplir esto:<br><br>${listaReq(e.reqGym.req)}<br><br>Volvé cuando lo tengas.`, [{t: 'Entendido'}]);
      charla(n.nombre, `¡Bienvenido al gimnasio! Si me ganás te llevás la <b>${g.nombre}</b> ${g.emoji}. ` +
        `Mis Pokémon son de tipo <b>${g.tipo}</b>. ¿Aceptás el desafío?`,
        [{t: '⚔️ ¡Acepto!', fn: () => { window.__retoArena = Object.assign({reto, nombre: n.nombre}, posAdv()); cerrarAventura(); abrirArena(); }}, {t: 'Ahora no', sec: true}]);
    });
  };
}
const HIST_NPC = {profesor: hablarProfesor, rosa: desafioGimnasio('g1')};
for(let i = 2; i <= MEDALLAS.length; i++) HIST_NPC['g' + i] = desafioGimnasio('g' + i);   // etapa 2: los líderes 2 a 19 (npc g2…g19)

function misPunto(){
  const e = HIST.estado, pt = document.getElementById('advMisPunto');
  if(!pt || !e) return;
  const cobrable = e.dia.ms.some(m => !m.ok && m.n >= m.meta) || (!e.dia.bono && e.dia.ms.every(m => m.ok));
  pt.hidden = !cobrable;
}
function pintarMisiones(){
  const e = HIST.estado;
  if(!e) return;
  const p = CAP1[e.paso];
  document.getElementById('advMisHistoria').innerHTML = '<div class="adv-mis-paso">' + (p ? `<b>Capítulo 1 · Paso ${e.paso + 1} de ${CAP1.length}</b><br>` +
    (e.paso === 0 ? 'Buscá al <b>Guardián de la Liga</b> en la <b>Plaza Belgrano</b> (Valles, San Salvador) y hablale.' :
      p.meta + (p.n ? ` · vas <b>${Math.min(e.cnt, p.n)} de ${p.n}</b>` : '') + (e.paso < 3 || e.medallas.includes('g1') ? '. Después volvé con el Guardián de la Liga en la Plaza Belgrano.' : '.'))
    : '<b>Capítulo 1 completo</b> 🎉<br>Ya podés ir por los gimnasios de todo Jujuy: tus medallas están acá abajo.') + '</div>';
  const ob = proximoObjetivo(e);
  if(ob){
    const act = !!(advGuiaObj && advGuiaObj.x === ob.x && advGuiaObj.y === ob.y);
    const reqTxt = e.paso >= CAP1.length && e.req && e.req.length ? `<br><small>Para desafiarlo necesitás:</small><br>${listaReq(e.req)}<br>` : '';
    document.getElementById('advMisHistoria').insertAdjacentHTML('beforeend', `<div class="adv-mis-paso" style="margin-top:8px">📍 <b>Próximo objetivo:</b> ${ob.texto}.${reqTxt}<br><button type="button" class="adv-liga-btn" id="advMisGuia" style="margin:8px 0 0">${act ? '❌ Quitar flecha' : '🧭 Guiarme con una flecha'}</button></div>`);
    document.getElementById('advMisGuia').onclick = () => { if(act) advGuiaObj = null; else { guiarA(ob); document.getElementById('advLigaGuiaPanel').hidden = true; } pintarMisiones(); };
  }
  document.getElementById('advMisMedallas').innerHTML = `<div style="width:100%;text-align:center;font-size:12px;margin-bottom:2px">🏅 Medallas: <b>${e.medallas.length} de ${MEDALLAS.length}</b></div>` + MEDALLAS.map(m => `<span class="adv-mis-medalla${e.medallas.includes(m.id) ? ' on' : ''}" title="${m.nombre} · ${m.lider} · ${m.lugar}"><img src="images/medallas/${m.id}.png" alt="${m.nombre}${e.medallas.includes(m.id) ? '' : ' (todavía no)'}"></span>`).join('');
  const L = document.getElementById('advMisLista'); L.innerHTML = '';
  e.dia.ms.forEach((m, i) => {
    const f = document.createElement('div'); f.className = 'adv-mis-fila';
    const t = m.t.replace('{tipo}', (typeof TYPE_LABEL !== 'undefined' && TYPE_LABEL[m.tipo]) || m.tipo || '');
    f.innerHTML = `<div class="txt">${m.ok ? '✅ ' : ''}${t}<small>${Math.min(m.n, m.meta)} de ${m.meta} · ${premioTexto(m.premio)}</small><div class="adv-mis-barra"><i style="width:${Math.min(100, m.n / m.meta * 100)}%"></i></div></div>`;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'adv-mis-cobrar';
    b.textContent = m.ok ? 'Listo' : 'Cobrar'; b.disabled = m.ok || m.n < m.meta;
    b.onclick = () => cobrarMision(i);
    f.appendChild(b); L.appendChild(f);
  });
  const todas = e.dia.ms.every(m => m.ok);
  const fb = document.createElement('div'); fb.className = 'adv-mis-fila';
  fb.innerHTML = `<div class="txt">🎁 Bono por completar las 3<small>${premioTexto(e.bonoPremio)}</small></div>`;
  const bb = document.createElement('button'); bb.type = 'button'; bb.className = 'adv-mis-cobrar';
  bb.textContent = e.dia.bono ? 'Listo' : 'Cobrar'; bb.disabled = e.dia.bono || !todas; bb.onclick = () => cobrarMision('bono');
  fb.appendChild(bb); L.appendChild(fb);
  misPunto();
}
function cargarHistoria(gym){
  if(!servidorListo) return Promise.resolve(null);
  return accionServidor('historiaVer', gym ? {gym} : {}).then(res => { if(res.ok){ HIST.estado = res.resultado; pintarMisiones(); } return HIST.estado; }).catch(() => null);
}
function cobrarMision(i){
  if(!puedeJugar('mision')) return;
  accionServidor('misionCobrar', {i}).then(res => {
    if(!res.ok) return avisoServidor(res.motivo);
    HIST.estado.dia = res.resultado.dia; pintarMisiones(); updateCoins(); enviarPuntaje();
    advMensaje('🎉 ¡Misión cumplida! ' + premioTexto(res.resultado.premio));
  }).catch(() => {}).then(soltar('mision'));
}
function abrirMisiones(){
  if(!servidorListo){ advMensaje('Las misiones necesitan conexión 📶'); return; }
  teclasApretadas.clear(); advEje = {x: 0, y: 0};
  document.getElementById('advMisPanel').hidden = false;
  cargarHistoria(); cargarLiga();
}
function abrirLigaGuia(){
  if(!servidorListo){ advMensaje('La guía de la Liga necesita conexión 📶'); return; }
  teclasApretadas.clear(); advEje = {x: 0, y: 0};
  document.getElementById('advLigaGuiaPanel').hidden = false;
  cargarHistoria(); cargarLiga();
}
/* ---- Liga de Jujuy: los 10 primeros con las 19 medallas (los anota el servidor; acá sólo se muestran) ---- */
const LIGA = {datos: null, timer: null};
const horaLiga = ts => { try{ return new Date(ts).toLocaleString('es-AR', {timeZone: 'America/Argentina/Jujuy', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false}).replace(',', ' ·'); }catch(e){ return ''; } };
function pintarLiga(){
  const d = LIGA.datos, ol = document.getElementById('advLigaLista');
  if(!ol) return;
  const cupos = (d && d.cupos) || 10, lista = (d && d.clasificados) || [];
  const yo = (typeof jugador === 'string' ? jugador : '').toLowerCase();
  document.getElementById('advLigaCont').textContent = d ? `(${lista.length}/${cupos})` : '';
  document.getElementById('advLigaSub').textContent = !d ? 'Cargando…' : lista.length >= cupos ? '¡Ya están los 10 clasificados! Pronto se anuncia el campeonato.' : `Los primeros ${cupos} en reunir las 19 medallas. Faltan ${cupos - lista.length}.`;
  ol.innerHTML = '';
  for(let i = 1; i <= cupos; i++){
    const c = lista.find(x => x.puesto === i), li = document.createElement('li');
    if(c){ li.className = yo && c.nombre.toLowerCase() === yo ? 'yo' : ''; li.innerHTML = '<span class="pto">' + i + '</span><span class="nom"></span><span class="hora"></span>'; li.querySelector('.nom').textContent = c.nombre; li.querySelector('.hora').textContent = horaLiga(c.ts); }
    else { li.className = 'libre'; li.innerHTML = '<span class="pto">' + i + '</span><span class="nom">— lugar libre —</span><span class="hora"></span>'; }
    ol.appendChild(li);
  }
}
function cargarLiga(){
  if(!servidorListo || typeof SERVIDOR_URL === 'undefined') return Promise.resolve(null);
  return fetch(SERVIDOR_URL + '/liga', {cache: 'no-store'}).then(r => r.json()).then(d => { if(d && d.ok){ LIGA.datos = d; pintarLiga(); } return d; }).catch(() => null);
}
function abrirLiga(){
  document.getElementById('advLigaPanel').hidden = false;
  pintarLiga(); cargarLiga();
  clearInterval(LIGA.timer); LIGA.timer = setInterval(() => { if(document.getElementById('advLigaPanel').hidden) clearInterval(LIGA.timer); else cargarLiga(); }, 20000);   // los nombres van apareciendo a medida que terminan
}
(() => {
  const b = document.getElementById('advLigaBtn'); if(b) b.onclick = abrirLiga;
  const c = document.getElementById('advLigaCerrar'); if(c) c.onclick = () => { document.getElementById('advLigaPanel').hidden = true; };
})();
(() => {
  const b = document.getElementById('advMisBtn'); if(b) b.onclick = abrirMisiones;
  const c = document.getElementById('advMisCerrar'); if(c) c.onclick = () => { document.getElementById('advMisPanel').hidden = true; };
  const li = document.getElementById('advLigaInfoBtn'); if(li) li.onclick = abrirLigaGuia;
  const lc = document.getElementById('advLigaGuiaCerrar'); if(lc) lc.onclick = () => { document.getElementById('advLigaGuiaPanel').hidden = true; };
  setInterval(() => { if(servidorListo && typeof advAbierto !== 'undefined' && advAbierto) cargarHistoria(); }, 90000);   // el puntito de "hay algo para cobrar"
})();


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
    if(res.ok && advAbierto && advMapa === mapa && !encuentro && !avistamientoActivo()){
      const ids = res.resultado.opciones || [res.resultado.id];   // varias a la vista; el servidor las sorteó
      if(ids.length > 1) aparecerSalvajes(ids.map(id => POR_ID_C[id]), x, y);
      else iniciarEncuentro(POR_ID_C[ids[0]]);
    }
  }).catch(() => {}).then(soltar('encuentro'));
}

/* Eligió a cuál ir: el servidor valida que sea una de las que sorteó y recién ahí empieza la pelea. */
function elegirSalvajeServidor(p){
  if(!servidorListo || enCurso.has('elegir')) return;
  enCurso.add('elegir');
  accionServidor('elegirSalvaje', {id: p.id}).then(res => {
    if(res.ok && advAbierto && !encuentro) iniciarEncuentro(POR_ID_C[res.resultado.id]);
    else if(!res.ok) advMensaje('💨 Se escapó antes de que llegaras.');
  }).catch(() => {}).then(soltar('elegir'));
}

/* Le salieron salvajes a este entrenador: se avisa a los de al lado (el servidor revisa que sean los que de verdad sorteó) */
function compartirSalvajes(lista){
  const ws = MUNDO.ws;
  if(!ws || ws.readyState !== 1) return;
  try{ ws.send(JSON.stringify({k: 's', s: lista.map(sv => ({id: sv.p.id, x: sv.x, y: sv.y}))})); }catch(e){}
}
/* Eligió uno de los salvajes que le salieron a OTRO: cada uno atrapa el suyo, el servidor valida que el grupo exista y no haya vencido. */
function unirseSalvajeServidor(sv){
  if(!servidorListo || enCurso.has('elegir')) return;
  enCurso.add('elegir');
  accionServidor('unirseSalvaje', {sp: sv.comp, id: sv.p.id}).then(res => {
    if(res.ok && advAbierto && !encuentro) iniciarEncuentro(POR_ID_C[res.resultado.id]);
    else if(!res.ok) advMensaje('💨 Se escapó antes de que llegaras.');
  }).catch(() => {}).then(soltar('elegir'));
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
    if(Array.isArray(out.favoritos)){       // un regalo dejó armado el equipo favorito de la Arena
      try{ localStorage.setItem('arena-favoritos', JSON.stringify(out.favoritos)); }catch(e){}
    }
    const regaladas = out.pulls.map(aPull), ejPulls = out.ejemplares.map(aPull);
    const espPulls = out.especiales.map(x => ({p: ESPECIAL_POR_ID[x.id], isNew: x.isNew})).filter(x => x.p);
    if(!out.monedas && !regaladas.length && !ejPulls.length && !espPulls.length && !Object.keys(out.bolas).length && !out.diamantes && !(out.monturas || []).length) return;
    enviarPuntaje();
    mostrarRegalos({total: out.monedas, regaladas, ejPulls, espPulls, bolasGanadas: out.bolas, esAventura: out.aventura,
      esEvento: out.evento ? EVENTOS.find(e => e.slug === out.evento) : null, esBienvenida: !!out.bienvenida, mensaje: out.mensaje || '',
      diamantesGanados: out.diamantes || 0, monturasGanadas: out.monturas || []});
  }).catch(() => {});
}


/* ---------------- Calendario de regalos de 28 días (21/11) ----------------
   El servidor decide todo (qué día toca, el premio y el Pokémon sorpresa); acá sólo se muestra y se cobra. Personal de cada jugador:
   avanza por día jugado, faltar un día no pierde nada. */
const CAL = {estado: null, avisado: false};
const calTextoPremio = x => x.tipo ? x.texto : [premioTexto(x.premio), x.premio && x.premio.epica ? '+' + x.premio.epica + ' carta épica' : ''].filter(Boolean).join(' · ');
const calImg = id => (typeof POR_ID_C !== 'undefined' && POR_ID_C[id]) ? POR_ID_C[id].img : '';
const calNom = id => (typeof POR_ID_C !== 'undefined' && POR_ID_C[id]) ? POR_ID_C[id].name : '';
const calNivel = n => n[0] === n[1] ? String(n[0]) : n[0] + ' a ' + n[1];
/* lo que se gana ese día, con dibujo: el del día 28 es el Pokémon real (+ su montura); los de 7, 14 y 21 son una silueta de ejemplo y se sortean al cobrar */
function calPremioHTML(x){
  if(!x.tipo) return calTextoPremio(x);
  if(x.tipo === 'inicial'){
    const m = (typeof MONTURAS !== 'undefined' && MONTURAS[x.montura]) || null;
    const av = (typeof avatarActual !== 'undefined' && (avatarActual === 'may' || avatarActual === 'red')) ? avatarActual : 'red';
    const lado = m ? `images/monturas/${x.montura}-${av}-lado-cuerpo.png` : '';   // la montura vista de costado, con tu entrenador arriba
    return `<div class="cal-prem"><div class="cal-prem-img"><img src="${calImg(x.pokemon)}" alt="${calNom(x.pokemon)}"></div>`
      + (m ? `<div class="cal-prem-img cal-prem-mont"><img src="${lado}" alt="${m.nombre} con tu entrenador" onerror="this.src='${calImg(m.id)}'"></div>` : '')
      + `<div class="cal-prem-txt"><b>${calNom(x.pokemon)} nivel ${calNivel(x.nivel)}</b>con Vida y Velocidad ya mejoradas${m ? `<br>+ la montura <em class="cal-mn">${m.nombre}</em>` : ''}</div></div>`;
  }
  return `<div class="cal-prem"><div class="cal-prem-img"><img class="cal-sil" src="${calImg(x.muestra)}" alt=""></div>`
    + `<div class="cal-prem-txt"><b>${x.nombre} sorpresa</b>nivel ${calNivel(x.nivel)} · ¿cuál será? 🤔</div></div>`;
}
function calPintar(){
  const e = CAL.estado, box = document.getElementById('calBox');
  if(!e || !box) return;
  const hecho = e.hoyCobrado, dia = e.proximo, sig = e.lista[dia - 1], meta = e.lista[e.lista.length - 1];
  box.hidden = false; box.classList.toggle('cal-listo', !hecho);
  document.getElementById('calTitulo').textContent = hecho ? `Día ${e.dias} de ${e.lista.length} cobrado ✔` : `Hoy: día ${dia} de ${e.lista.length}`;
  document.getElementById('calDetalle').textContent = hecho
    ? `Mañana te espera: ${calTextoPremio(sig)}`
    : `Tu regalo de hoy: ${calTextoPremio(sig)}`;
  document.getElementById('calFill').style.width = Math.round(e.dias / e.lista.length * 100) + '%';
  const b = document.getElementById('calBtn'); b.textContent = hecho ? 'Ver' : 'Cobrar';
  const g = document.getElementById('calGrid'); if(!g) return;
  /* el premio mayor, siempre a la vista: ahí está lo que vale la pena llegar al día 28 */
  let mx = document.getElementById('calMeta');
  if(!mx){ mx = document.createElement('div'); mx.id = 'calMeta'; mx.className = 'cal-meta'; g.insertAdjacentElement('beforebegin', mx); }
  const faltan = Math.max(0, meta.d - e.dias - (hecho ? 0 : 0));
  mx.innerHTML = `<small>🏆 Premio del día ${meta.d}${faltan ? ` · te faltan ${faltan} día${faltan === 1 ? '' : 's'}` : ' · ¡listo!'}</small>` + calPremioHTML(meta);
  g.innerHTML = '';
  e.lista.forEach(x => {
    const d = document.createElement('button'); d.type = 'button';
    d.className = 'cal-dia' + (x.cobrado ? ' hecho' : '') + (x.tipo ? ' gordo' : '') + (!hecho && x.d === dia ? ' hoy' : '');
    const mini = x.tipo ? (x.tipo === 'inicial' ? calImg(x.pokemon) : calImg(x.muestra)) : '';
    d.innerHTML = `${x.d}<small>${x.cobrado ? '✅' : mini ? `<img class="cal-mini${x.tipo === 'inicial' ? '' : ' cal-sil'}" src="${mini}" alt="">` : x.tipo ? '🎁' : '·'}</small>`;
    d.setAttribute('aria-label', `Día ${x.d}: ${x.tipo ? x.texto : calTextoPremio(x)}${x.cobrado ? ' (cobrado)' : ''}`);
    d.onclick = () => { document.getElementById('calDet').innerHTML = `<b>Día ${x.d}${x.cobrado ? ' ✅' : ''}:</b> ` + calPremioHTML(x); };
    g.appendChild(d);
  });
  let det = document.getElementById('calDet');
  if(!det){ det = document.createElement('div'); det.id = 'calDet'; det.className = 'cal-det'; g.insertAdjacentElement('afterend', det); }
  det.innerHTML = `<b>${hecho ? 'Mañana' : 'Hoy'}, día ${dia}:</b> ` + calPremioHTML(sig);
  const c = document.getElementById('calCobrar'); c.hidden = hecho; c.disabled = false;
  document.getElementById('calOvSub').textContent = e.ciclo > 1 ? `Calendario nº ${e.ciclo}. Un regalo por cada día que entrás: si faltás un día no perdés nada.` : 'Un regalo por cada día que entrás. Si faltás un día no perdés nada: seguís donde quedaste.';
}
function calCargar(){
  if(!servidorListo) return Promise.resolve(null);
  return accionServidor('calendarioVer', {}).then(res => { if(res.ok){ CAL.estado = res.resultado; calPintar(); } return CAL.estado; }).catch(() => null);
}
function calCobrar(){
  if(!servidorListo || !puedeJugar('calendario')) return;
  document.getElementById('calCobrar').disabled = true;
  accionServidor('calendarioCobrar', {}).then(res => {
    if(!res.ok){ avisoServidor(res.motivo); return calCargar(); }
    const out = res.resultado;
    CAL.estado = out.vista; calPintar(); updateCoins(); enviarPuntaje();
    document.getElementById('calOverlay').classList.remove('show');
    mostrarRegalos({total: out.monedas, regaladas: [], ejPulls: out.pulls.map(aPull), espPulls: [], bolasGanadas: out.bolas, esAventura: false, esEvento: null, esBienvenida: false,
      mensaje: `Regalo del día ${out.dia} de tu calendario`, diamantesGanados: 0, monturasGanadas: out.montura && !out.montura_repetida ? [out.montura] : []});
  }).catch(() => {}).then(soltar('calendario'));
}
function calAbrir(){
  if(!servidorListo){ avisoServidor('sin_conexion', 'El calendario necesita conexión 📶'); return; }
  document.getElementById('calOverlay').classList.add('show');
  calCargar();
}
(() => {
  const b = document.getElementById('calBtn'); if(b) b.onclick = calAbrir;
  const c = document.getElementById('calCobrar'); if(c) c.onclick = calCobrar;
  const x = document.getElementById('calCerrar'); if(x) x.onclick = () => document.getElementById('calOverlay').classList.remove('show');
})();
/* al entrar: se muestra la tarjeta y, UNA vez por día, se abre solo el calendario si todavía no cobró (sin pisar otra ventana abierta) */
function calAlEntrar(){
  calCargar().then(e => {
    if(!e || e.hoyCobrado || CAL.avisado) return;
    let intentos = 0;   // si hay otra ventana abierta (PIN, novedades, regalo de bienvenida) se espera a que la cierren, hasta ~1 minuto
    const t = setInterval(() => {
      if(CAL.avisado || (CAL.estado && CAL.estado.hoyCobrado) || ++intentos > 20){ clearInterval(t); return; }
      if(intentos < 2 || (typeof advAbierto !== 'undefined' && advAbierto) || document.querySelector('.name-overlay.show, .overlay.show, #overlay.show, #battleOverlay.show')) return;   // sólo en el inicio: nunca encima de la Aventura, la Arena u otra ventana
      clearInterval(t); CAL.avisado = true; calAbrir();
    }, 3000);
  });
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

/* ---------------- Aventura en vivo: ver a los otros entrenadores ----------------
   Mientras la Aventura está abierta, una conexión al "mundo" del servidor: cada celular cuenta
   dónde está (~5 veces por segundo, sólo si se movió; si está quieto, cada 20 s para seguir
   visible) y recibe a los demás. Es sólo para verse: no paga ni descuenta nada. */
const MUNDO = {log: [], ws: null, abierto: false, otros: {}, ultimoEnvio: 0, ultimo: '', reintento: null, yo: null, globos: {}, buscando: false, busca: {}, bots: null, desfase: 0};
function mundoEntrar(){
  if(!MODO_SERVIDOR) return;
  MUNDO.abierto = true;
  mundoConectar();
}
function mundoConectar(){
  if(!MUNDO.abierto || MUNDO.ws || !tokenServidor) return;
  let ws;
  try{ ws = new WebSocket(SERVIDOR_URL.replace(/^http/, 'ws') + '/mundo/ws?token=' + encodeURIComponent(tokenServidor)); }catch(e){ return; }
  MUNDO.ws = ws; MUNDO.ultimo = '';
  ws.onopen = () => { chatMostrarBoton(true); batallaReiniciar(); };
  ws.onmessage = ev => { let m; try{ m = JSON.parse(ev.data); }catch(e){ return; } mundoMensaje(m); };
  ws.onclose = () => {
    if(MUNDO.ws === ws) MUNDO.ws = null;
    MUNDO.otros = {}; MUNDO.globos = {}; MUNDO.busca = {}; MUNDO.bots = null;
    chatMostrarBoton(false); batallaReiniciar();
    if(MUNDO.abierto){ clearTimeout(MUNDO.reintento); MUNDO.reintento = setTimeout(mundoConectar, 4000); }   // se cortó la señal: reintenta solo
  };
}
function mundoSalir(){
  MUNDO.abierto = false;
  clearTimeout(MUNDO.reintento);
  const ws = MUNDO.ws; MUNDO.ws = null;
  if(ws) try{ ws.close(); }catch(e){}
  MUNDO.otros = {}; MUNDO.globos = {}; MUNDO.busca = {}; MUNDO.bots = null;
  chatMostrarBoton(false); batallaReiniciar(); npcBoton(null);
  sincronizarNombres([], 1);
  sincronizarBatGlobos([], 1);
  sincronizarGlobos([], 1);
}
function mundoMensaje(m){
  const ahora = performance.now();
  if(m.t === 'chat'){
    MUNDO.globos[m.id] = {txt: String(m.txt || '').slice(0, 60), hasta: ahora + 6500};
    const o = MUNDO.otros[m.id], quien = m.id === MUNDO.yo ? 'Vos' : ((o && o.n) || 'Entrenador');   // 22/11: historial para leer lo que te contestan mientras escribís
    MUNDO.log.push({q: quien, t: String(m.txt || '').slice(0, 60), a: Date.now()}); if(MUNDO.log.length > 30) MUNDO.log.shift();
    chatLogPintar(); return;
  }
  if(m.t === 'chat_no'){ chatAviso(m); return; }
  if(m.t === 'busca'){ if(!arenaAbierta()) MUNDO.busca[m.id] = ahora + BATALLA_BUSCA_MS; return; }
  if(m.t === 'busca_no'){ delete MUNDO.busca[m.id]; return; }
  if(m.t === 'batalla'){ batallaEmpezar(m); return; }
  if(m.t === 'todos'){
    MUNDO.yo = m.yo; MUNDO.otros = {};
    // los bots (Sadir y cía.) los mueve este celular con su ruta y el reloj del servidor: el servidor ya no les manda cada paso
    MUNDO.bots = Array.isArray(m.bots) ? m.bots : null; MUNDO.desfase = Number.isFinite(m.ts) ? m.ts - Date.now() : 0;
    (m.lista || []).forEach(o => { if(!(MUNDO.bots && o.id < 0)) mundoPoner(o, ahora, true); });
    botsMover(ahora, true);
  }
  else if(m.t === 'sal') salvajesCompartidos(m);
  else if(m.t === 'aparece'){   // el servidor te hace aparecer un Pokémon cerca (ya lo dejó entre tus opciones)
    if(advAbierto && !encuentro && !avistamientoActivo() && POR_ID_C[m.id]) aparecerSalvajes([POR_ID_C[m.id]], Math.floor((advPx + 8) / ADV_PX), Math.floor((advPy + 11) / ADV_PX), true, !!m.privado);
  }
  else if(m.t === 'p') mundoPoner(m, ahora, false);
  else if(m.t === 'sale'){ delete MUNDO.otros[m.id]; delete MUNDO.busca[m.id]; }
}
const BOT_DIR = {R: [1, 0, 'der'], L: [-1, 0, 'izq'], D: [0, 1, 'abajo'], U: [0, -1, 'arriba']};
const botsRuta = new Map();   // id -> posiciones por paso (se arma una vez); misma cuenta que botEn() del servidor
function botsMover(ahora, saltar){
  if(!MUNDO.bots) return;
  const t = Date.now() + MUNDO.desfase;
  for(const b of MUNDO.bots){
    let ruta = botsRuta.get(b.id);
    if(!ruta){
      ruta = [[b.x, b.y, 'abajo']]; let x = b.x, y = b.y;
      for(const c of b.pasos){ const d = BOT_DIR[c]; x += d[0]; y += d[1]; ruta.push([x, y, d[2]]); }
      botsRuta.set(b.id, ruta);
    }
    const i = Math.floor(t / b.ms) % (ruta.length - 1), a = ruta[i + 1];
    mundoPoner({id: b.id, n: b.n, av: b.av, npc: b.npc, m: 'overworld', x: a[0] * 16, y: a[1] * 16, d: a[2], p: i % 4}, ahora, !!saltar);
  }
}
/* 22/11 (Zeta): jugadores de relleno. 10 nombres que se ven como entrenadores más, para todos. Cada 5 min cambia AL AZAR cuántos y quiénes
   están en el mapa (de 2 a 8): el que se va entra a una cueva, el que llega sale de una. Cada 5 min van a un lugar nuevo: parados al lado de uno
   de los 6 primeros líderes, sobre un altar, cazando en la hierba alta (sale un globo "¡Atrapé a …!"), paseando, o metiéndose en una cueva. Caminan
   por los caminos reales del mapa. Todo sale del reloj del servidor (igual que los bots), así que todos ven lo mismo, sin gastar nada del servidor.
   Buscan batalla (⚔️) y se los puede enfrentar (ver batallaFalso); no tienen chat, ni ranking, ni premios propios. */
const FALSOS = [
  {n: 'Naruto Uzumaki', av: 'red', rg: 3}, {n: 'Gabriel0027', av: 'red', rg: 1}, {n: 'Bosterito', av: 'red', rg: 2},
  {n: 'Luana L.', av: 'may', rg: 2}, {n: 'Franco Lopez', av: 'red', rg: 4},
  {n: 'Anto ♡', av: 'may', rg: 3}, {n: 'Robert', av: 'red', rg: 2}, {n: 'Guerrero09', av: 'red', rg: 1},
  {n: 'Slayer', av: 'red', rg: 5}, {n: 'Dark28', av: 'red', rg: 1}
];
const FALSO_BLOQUE_MS = 5 * 60e3, FALSO_PASO_MS = 280;   // cada 5 min cambia quiénes están y a dónde van
const falsosCache = {}, falsosPelea = {};   // falsosPelea: id -> hasta cuándo no buscan batalla (después de pelear)
function falsosInicio(){
  if(falsosCache.ok !== undefined) return falsosCache.ok;
  falsosCache.ok = false;
  try{
    const mp = ADV_MAPS.overworld, rows = mp.rows, W = mp.cols, H = rows.length;
    const cam = new Uint8Array(W * H), altares = [], cuevas = [];
    for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){
      const ch = rows[y].charAt(x), t = ADV_TILE[ch];
      if(t && t.walk) cam[y * W + x] = 1;
      if(ch === 'L') altares.push([x, y]);
      if(ch === 'C' || ch === '$') cuevas.push([x, y]);
    }
    /* los 6 primeros líderes (los bots -107…-112 de bots.json); alrededor de cada uno, casilleros caminables donde pararse */
    const lid = [[93, 149], [139, 136], [26, 178], [133, 110], [38, 32], [90, 13]].map(([lx, ly]) => {
      const c = [];
      for(const r of [1, 2]) for(const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [2, 0], [-2, 0], [0, 2], [0, -2]]){
        if(Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = lx + dx, y = ly + dy;
        if(x >= 0 && y >= 0 && x < W && y < H && cam[y * W + x]) c.push([x, y, Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'izq' : 'der') : (dy > 0 ? 'arriba' : 'abajo')]);
      }
      return c;
    }).filter(c => c.length);
    Object.assign(falsosCache, {ok: lid.length > 0 && cuevas.length > 0, W, H, cam, altares, cuevas, lid, memo: new Map()});
    /* sólo los lugares del continente principal (hay islitas a las que no se llega caminando) */
    const base = falsoBFS(lid[0][0][0], lid[0][0][1]).dist;
    const sirve = a => base[a[1] * W + a[0]] >= 0;
    falsosCache.altares = altares.filter(sirve); falsosCache.cuevas = cuevas.filter(sirve);
    falsosCache.lid = lid.map(c => c.filter(sirve)).filter(c => c.length);
    falsosCache.hierba = []; falsosCache.libres = [];
    for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){
      if(!sirve([x, y])) continue;
      const ch = rows[y].charAt(x);
      if(ch === '"') falsosCache.hierba.push([x, y]);
      if(ch === '.' || ch === ',' || ch === '"' || ch === '*') falsosCache.libres.push([x, y]);
    }
    falsosCache.ok = falsosCache.lid.length > 0 && falsosCache.cuevas.length > 0 && falsosCache.hierba.length > 0;
  }catch(e){ falsosCache.ok = false; }
  return falsosCache.ok;
}
function falsoRand(a, b, c){ let h = Math.imul(a + 1, 73856093) ^ Math.imul(b + 1, 19349663) ^ Math.imul(c + 1, 83492791); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
/* Camino más corto (por casilleros caminables) desde (x0,y0): devuelve las distancias y de dónde se llegó a cada casillero */
function falsoBFS(x0, y0){
  const {W, H, cam} = falsosCache, dist = new Int32Array(W * H).fill(-1), ant = new Int32Array(W * H).fill(-1);
  const q = new Int32Array(W * H); let a = 0, b = 0;
  q[b++] = y0 * W + x0; dist[y0 * W + x0] = 0;
  while(a < b){
    const i = q[a++], x = i % W;
    for(const j of [i + 1, i - 1, i + W, i - W]){
      if(j < 0 || j >= W * H || dist[j] >= 0 || !cam[j]) continue;
      if(Math.abs((j % W) - x) > 1) continue;
      dist[j] = dist[i] + 1; ant[j] = i; q[b++] = j;
    }
  }
  return {dist, ant};
}
/* Quiénes están en cada bloque de 5 min: una cantidad AL AZAR (de 2 a 8 de los 10) y los que sean también al azar. Todos los celulares sacan la misma cuenta. */
function falsoPresente(i, bk){
  const n = 2 + Math.floor(falsoRand(77, bk, 3) * 7);                 // 2…8 a la vez
  let rango = 0; const mio = falsoRand(i, bk, 41);
  for(let k = 0; k < FALSOS.length; k++) if(k !== i && (falsoRand(k, bk, 41) < mio || (falsoRand(k, bk, 41) === mio && k < i))) rango++;
  return rango < n;
}
/* A dónde va el jugador i en el bloque bk (nº de bloque de 5 min desde 1970) y por dónde camina. Si no estaba en el bloque anterior, sale de una cueva;
   si no va a estar en el siguiente, el bloque termina en una cueva. Tipos: lider, altar, atrapar (hierba alta, cazando), pasear (caminata), cueva. */
function falsoPlan(i, bk, prof){
  const C = falsosCache, clave = i + ':' + bk;
  let r = C.memo.get(clave); if(r) return r;
  let ini;
  if((prof || 0) > 40 || !falsoPresente(i, bk - 1)){ const c = C.cuevas[Math.floor(falsoRand(i, bk, 90) * C.cuevas.length)]; ini = {x: c[0], y: c[1]}; }
  else ini = falsoPlan(i, bk - 1, (prof || 0) + 1).fin;
  const {dist, ant} = falsoBFS(ini.x, ini.y), W = C.W;
  const alcanza = (x, y, max) => dist[y * W + x] >= 0 && dist[y * W + x] <= (max || 700);
  const sale = !falsoPresente(i, bk + 1);
  /* el que no sigue en el próximo bloque: la mitad se mete en una cueva cercana; los otros se desconectan donde están (desaparecen al final del bloque) */
  const u = falsoRand(i, bk, 5);
  let tipo = sale ? (falsoRand(i, bk, 6) < .5 ? 'cueva' : (u < .35 ? 'lider' : u < .5 ? 'altar' : u < .85 ? 'atrapar' : 'pasear'))
                  : (u < .30 ? 'lider' : u < .48 ? 'altar' : u < .75 ? 'atrapar' : u < .90 ? 'pasear' : 'cueva');
  let cand = [];
  if(tipo === 'lider'){   // cada jugador siempre se para en SU casillero alrededor del líder (así no se pisan)
    C.lid.forEach(c => { const t = c[i % c.length]; if(alcanza(t[0], t[1])) cand.push({x: t[0], y: t[1], d: t[2]}); });
  }else if(tipo === 'altar') cand = C.altares.filter(a => alcanza(a[0], a[1])).map(a => ({x: a[0], y: a[1], d: 'abajo'}));
  else if(tipo === 'atrapar') cand = C.hierba.filter(a => alcanza(a[0], a[1], 160)).map(a => ({x: a[0], y: a[1], d: 'abajo'}));
  else if(tipo === 'pasear') cand = C.libres.filter(a => alcanza(a[0], a[1], 60) && dist[a[1] * W + a[0]] > 8).map(a => ({x: a[0], y: a[1], d: 'der'}));
  else cand = C.cuevas.filter(a => alcanza(a[0], a[1], sale ? 150 : 700) && !(a[0] === ini.x && a[1] === ini.y)).map(a => ({x: a[0], y: a[1], d: 'arriba'}));
  if(!cand.length){ tipo = 'quieto'; cand = [{x: ini.x, y: ini.y, d: 'abajo'}]; }
  const fin = cand[Math.floor(falsoRand(i, bk, 17) * cand.length)];
  const cam = [];   // [x, y, dirección] por paso, desde el origen hasta el destino
  let j = fin.y * W + fin.x;
  while(j >= 0){ cam.push([j % W, (j - j % W) / W]); j = ant[j]; }
  cam.reverse();
  for(let k = 0; k < cam.length; k++){
    const p = cam[k], q = cam[k + 1];
    p[2] = q ? (q[0] > p[0] ? 'der' : q[0] < p[0] ? 'izq' : q[1] > p[1] ? 'abajo' : 'arriba') : fin.d;
  }
  r = {fin: {x: fin.x, y: fin.y}, d: fin.d, tipo, cam, sale};
  C.memo.set(clave, r);
  if(C.memo.size > 600) C.memo.delete(C.memo.keys().next().value);
  return r;
}
const falsosCaptura = {};   // id -> última captura anunciada (nº de intento)
function falsosMover(ahora){
  if(!falsosInicio()) return;
  const t = Date.now() + (MUNDO.desfase || 0);
  const bk = Math.floor(t / FALSO_BLOQUE_MS), seg = t % FALSO_BLOQUE_MS;
  FALSOS.forEach((f, i) => {
    const id = -500 - i;
    if(!falsoPresente(i, bk)){ delete MUNDO.otros[id]; delete MUNDO.busca[id]; return; }
    let plan;
    try{ plan = falsoPlan(i, bk); }catch(e){ delete MUNDO.otros[id]; return; }
    const paso = Math.floor(seg / FALSO_PASO_MS);
    let a;
    if(paso < plan.cam.length) a = plan.cam[paso];
    else if(plan.tipo === 'cueva'){ delete MUNDO.otros[id]; delete MUNDO.busca[id]; return; }   // ya entró a la cueva: no se ve hasta que vuelva a estar presente
    else a = [plan.fin.x, plan.fin.y, plan.d];
    if(plan.sale && plan.tipo !== 'cueva' && seg > FALSO_BLOQUE_MS - 12e3){ delete MUNDO.otros[id]; delete MUNDO.busca[id]; return; }   // se desconectó
    mundoPoner({id, n: f.n, av: f.av, rg: f.rg, m: 'overworld', x: a[0] * 16, y: a[1] * 16, d: a[2], p: 0}, ahora, false);
    const quieto = paso >= plan.cam.length, desde = seg - plan.cam.length * FALSO_PASO_MS;
    /* en la hierba alta "atrapan": cada ~45 s sale un globo con lo que atraparon (un Pokémon de la Aventura al azar, a veces brillante) */
    if(quieto && plan.tipo === 'atrapar'){
      const n = Math.floor(desde / 45e3), k = bk * 100 + n;
      if(n >= 0 && falsosCaptura[id] !== k){
        falsosCaptura[id] = k;
        const lista = (typeof ADV_DATA !== 'undefined' && ADV_DATA.length) ? ADV_DATA : null;
        if(lista){
          const p = lista[Math.floor(falsoRand(i, k, 63) * lista.length)], brilla = falsoRand(i, k, 64) < .04, fallo = falsoRand(i, k, 65) < .25;
          MUNDO.globos[id] = {txt: fallo ? '¡Uh, se escapó ' + p.name + '!' : '¡Atrapé a ' + (brilla ? '✨' : '') + p.name + '! 🔴', hasta: ahora + 5500};
        }
      }
    }
    /* parados en su lugar (no en la hierba cazando), "buscan batalla" (⚔️) 60 s de cada 100 s, salvo un rato después de pelear con uno */
    const hasta = falsosPelea[id] || 0;
    if(quieto && plan.tipo !== 'atrapar' && Date.now() > hasta && ((desde + 1000e3 - i * 13e3) % 100e3) < 60e3) MUNDO.busca[id] = ahora + 600;
    else if(MUNDO.busca[id]) delete MUNDO.busca[id];
  });
}
function mundoPoner(o, ahora, saltar){
  const v = MUNDO.otros[o.id];
  // cambió de mapa o pegó un salto grande (Centro Pokémon, cueva): aparece directo, sin deslizarse
  if(!v || saltar || v.m !== o.m || Math.abs(v.x - o.x) + Math.abs(v.y - o.y) > 64)
    MUNDO.otros[o.id] = {n: o.n, av: o.av, em: o.em || null, rg: o.rg || 0, mo: o.mo || null, co: o.co || null, npc: o.npc || null, m: o.m, x: o.x, y: o.y, tx: o.x, ty: o.y, d: o.d, visto: ahora};
  else Object.assign(v, {n: o.n, av: o.av, em: o.em || null, rg: o.rg || 0, mo: o.mo || null, co: o.co || null, npc: o.npc || null, tx: o.x, ty: o.y, d: o.d, visto: ahora});
}
/* Se llama en cada cuadro desde advRender, antes de dibujar al propio jugador (que queda arriba). */
function dibujarOtros(ctx, camX, camY, vw, vh, escala){
  const ahora = performance.now();
  const ws = MUNDO.ws;
  botsMover(ahora, false);
  falsosMover(ahora);
  if(ws && ws.readyState === 1 && ahora - MUNDO.ultimoEnvio > 200){
    const msg = JSON.stringify({k: 'p', m: advMapa, x: Math.round(advPx), y: Math.round(advPy), d: advDir, p: advPaso, mo: montura || null, c: (companero && companeroHabs[companero]) ? companero : null});
    if(msg !== MUNDO.ultimo || ahora - MUNDO.ultimoEnvio > 20000){
      try{ ws.send(msg); }catch(e){}
      MUNDO.ultimo = msg; MUNDO.ultimoEnvio = ahora;
    }
  }
  const nombres = [], globos = [], bats = [], companeros = [];
  let npcCerca = null;
  nombres.push({n: '', r: nombreRango(rangoPropio()), px: advPx - camX, py: advPy - camY - subeMontura(montura, avatarActual), yo: true});   // mi propio rango, sin repetir mi nombre
  if(MUNDO.buscando) bats.push({id: null, px: advPx - camX, py: advPy - camY});
  const miGlobo = MUNDO.globos[MUNDO.yo];
  if(miGlobo && ahora < miGlobo.hasta) globos.push({txt: miGlobo.txt, px: advPx - camX, py: advPy - camY});
  for(const id in MUNDO.otros){
    const o = MUNDO.otros[id];
    if(ahora - o.visto > 60000){ delete MUNDO.otros[id]; continue; }   // hace rato que no se sabe nada
    if(o.m !== advMapa) continue;
    const dx = o.tx - o.x, dy = o.ty - o.y;
    const camina = Math.abs(dx) + Math.abs(dy) > .5;
    o.x += dx * .2; o.y += dy * .2;   // se desliza hacia la última posición que llegó
    const sx = o.x - camX, sy = o.y - camY;
    if(sx < -24 || sy < -32 || sx > vw + 8 || sy > vh + 8) continue;
    if(!(o.mo && dibujarMontadoOtro(ctx, sx, sy, o, camina))) dibujarEntrenador(ctx, sx, sy, o.d, camina ? Math.floor(ahora / 140) % 4 : 0, o.av);
    /* el compañero del otro jugador: va atrás suyo a la misma distancia que el mío, sin correr los cálculos del rastro (le alcanza con seguirlo con correa) */
    if(o.co && !o.mo && typeof companeroSpriteDe === 'function'){
      const v = {abajo: [0, 1], arriba: [0, -1], izq: [-1, 0], der: [1, 0]}[o.d] || [0, 1], dist = Math.round(10 + alturaMundoPoke(o.co) * .75);
      if(o.fx == null || o.fco !== o.co){ o.fx = o.x - v[0] * dist; o.fy = o.y - v[1] * dist; o.fco = o.co; o.fdir = o.d; o.frx = o.fx - o.x; o.fry = o.fy - o.y; o.fk = 0; o.ftm = 0; }
      const ddx = o.x - o.fx, ddy = o.y - o.fy, dd = Math.hypot(ddx, ddy);
      if(dd > dist + .2){ const k = (dd - dist) / dd; o.fx += ddx * k; o.fy += ddy * k; o.ftm = ahora; o.fdir = Math.abs(ddx) > Math.abs(ddy) ? (ddx < 0 ? 'izq' : 'der') : (ddy < 0 ? 'arriba' : 'abajo'); }
      o.frx += (o.fx - o.x - o.frx) * .3; o.fry += (o.fy - o.y - o.fry) * .3;   // desfase suave respecto del personaje dibujado (sin heredar su redondeo)
      o.fk += ((ahora - o.ftm < 220 ? 1 : 0) - o.fk) * .2;
      const cs = companeroSpriteDe(o.co, Math.round(sx) + o.frx, Math.round(sy) + o.fry, o.fdir || o.d, o.fk);
      if(cs){ companeros.push(cs); sombraSuave(ctx, cs.px + 8, cs.py + 15, cs.vuela ? 3.6 : 4.4, cs.vuela ? 1.3 : 1.7, cs.vuela ? .28 : .38); }
    }
    nombres.push({n: (o.em ? '👑 ' : '') + o.n, r: nombreRango(o.rg), px: sx, py: sy - (o.mo ? subeMontura(o.mo, o.av) : 0)});
    if(o.npc && Math.abs(o.x - advPx) <= 40 && Math.abs(o.y - advPy) <= 40) npcCerca = {id: o.npc, nombre: o.n};
    if(MUNDO.busca[id] && ahora < MUNDO.busca[id] && !MUNDO.buscando) bats.push({id, px: sx, py: sy});
    const g = MUNDO.globos[id];
    if(g && ahora < g.hasta) globos.push({txt: g.txt, px: sx, py: sy});
  }
  for(const id in MUNDO.globos) if(ahora >= MUNDO.globos[id].hasta) delete MUNDO.globos[id];
  sincronizarSprites(companeros, escala, 'advCompaOtros');
  sincronizarNombres(nombres, escala);
  sincronizarGlobos(globos, escala);
  sincronizarBatGlobos(bats, escala);
  npcBoton(npcCerca);
}
/* Los globos de chat son <span> que se mueven con el personaje (textContent: nunca HTML). */
function sincronizarGlobos(lista, escala){
  const caja = document.getElementById('advGlobos');
  if(!caja) return;
  while(caja.children.length < lista.length) caja.appendChild(document.createElement('span'));
  [...caja.children].forEach((el, i) => {
    const o = lista[i];
    if(!o){ el.style.display = 'none'; return; }
    if(el.textContent !== o.txt) el.textContent = o.txt;
    el.style.display = 'block';
    el.style.left = Math.round((o.px + 8) * escala) + 'px';
    el.style.top  = Math.round((o.py - 16) * escala) + 'px';
  });
}
/* Escribir: botón 💬 → barra abajo → el servidor revisa (teléfonos, links, insultos) y avisa si no pasó. */
const CHAT_AVISOS = {
  numero: 'No se pueden pasar números de teléfono.', link: 'No se pueden mandar links.', insulto: 'Ese mensaje no se puede mandar. Tratemos bien a todos 💛',
  contacto: 'No se pueden pedir ni dar contactos.', rapido: 'Esperá un momentito antes de mandar otro.', silenciado: 'Estás en pausa unos minutos por mensajes no permitidos.'
};
function chatMostrarBoton(ver){
  const b = document.getElementById('advChatBtn'), bb = document.getElementById('advBatBtn');
  if(b) b.hidden = !ver;
  if(bb) bb.hidden = !ver;
  if(!ver) chatCerrar();
}
function chatAviso(m){
  const a = document.getElementById('advChatAviso');
  if(!a) return;
  a.textContent = CHAT_AVISOS[m.motivo] || 'No se pudo mandar.';
  clearTimeout(chatAviso._t); chatAviso._t = setTimeout(() => { a.textContent = ''; }, 4000);
}
/* 22/11 Zeta: "a la hora de escribir se corta, no se ve la pantalla, se pone lento". Al abrir el teclado el celular achica la pantalla y el juego redibujaba el mapa
   en cada cuadro de la animación (y lo estiraba). Ahora, mientras se escribe: el mapa queda con el tamaño que tenía (no se redibuja por el cambio de tamaño), la barra se pega
   justo arriba del teclado (visualViewport) y se ve el historial de los últimos mensajes. */
function chatTecladoInicio(){
  const cv = document.getElementById('advMap'); if(!cv || document.body.classList.contains('chat-abierto')) return;
  cv._fijo = {w: cv.clientWidth, h: cv.clientHeight};
  cv.style.width = cv._fijo.w + 'px'; cv.style.height = cv._fijo.h + 'px'; cv.style.top = '0'; cv.style.bottom = 'auto'; cv.style.right = 'auto';
  document.body.classList.add('chat-abierto');
  teclasApretadas.clear(); advEje = {x: 0, y: 0};
  if(window.visualViewport){ window.visualViewport.addEventListener('resize', chatTecladoAjustar); window.visualViewport.addEventListener('scroll', chatTecladoAjustar); }
  chatTecladoAjustar();
}
function chatTecladoFin(){
  const cv = document.getElementById('advMap'), bar = document.getElementById('advChatBar');
  if(!document.body.classList.contains('chat-abierto')) return;
  document.body.classList.remove('chat-abierto');
  if(window.visualViewport){ window.visualViewport.removeEventListener('resize', chatTecladoAjustar); window.visualViewport.removeEventListener('scroll', chatTecladoAjustar); }
  if(cv){ cv.style.width = cv.style.height = cv.style.top = cv.style.bottom = cv.style.right = ''; cv._fijo = null; }
  if(bar){ bar.style.bottom = ''; }
  const lg = document.getElementById('advChatLog'); if(lg){ lg.hidden = true; lg.style.bottom = ''; }
  requestAnimationFrame(() => { try{ advRender(); }catch(e){} });
}
function chatTecladoAjustar(){
  const bar = document.getElementById('advChatBar'), lg = document.getElementById('advChatLog'), vv = window.visualViewport;
  if(!bar || bar.hidden) return;
  const tapado = vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;   // lo que tapa el teclado (iPhone: no achica la página, achica la vista)
  bar.style.bottom = tapado + 'px';
  if(lg) lg.style.bottom = (tapado + bar.offsetHeight + 6) + 'px';
  clearTimeout(chatTecladoAjustar._t); chatTecladoAjustar._t = setTimeout(chatMapaAjustar, 260);   // cuando el teclado termina de abrirse: UN solo redibujado
}
/* el mapa pasa a ocupar sólo lo que se ve arriba de la barra, así el personaje queda a la vista (centrado) y no detrás del teclado */
function chatMapaAjustar(){
  const cv = document.getElementById('advMap'), bar = document.getElementById('advChatBar'), vv = window.visualViewport;
  if(!cv || !bar || bar.hidden || !document.body.classList.contains('chat-abierto')) return;
  const visibleAbajo = vv ? vv.offsetTop + vv.height : window.innerHeight;
  const h = Math.max(160, Math.round(visibleAbajo - bar.offsetHeight - 4));
  if(Math.abs(h - cv.clientHeight) > 2){ cv.style.height = h + 'px'; try{ advRender(); }catch(e){} }
}
function chatLogPintar(){
  const lg = document.getElementById('advChatLog'), bar = document.getElementById('advChatBar');
  if(!lg || !bar || bar.hidden) return;
  const hace = Date.now() - 90000, ult = MUNDO.log.filter(l => l.a >= hace).slice(-5);
  lg.innerHTML = '';
  ult.forEach(l => { const d = document.createElement('div'); const b = document.createElement('b'); b.textContent = l.q + ': '; d.appendChild(b); d.appendChild(document.createTextNode(l.t)); lg.appendChild(d); });
  lg.hidden = !ult.length; lg.scrollTop = lg.scrollHeight;
  chatTecladoAjustar();
}
/* 22/11: salir a WhatsApp y volver: la conexión del mundo se cae en segundo plano; al volver se rehace YA (y no a los 4 s, ni quedarse sin ver a nadie) */
function mundoRevivir(){
  if(!MUNDO.abierto) return;
  const ws = MUNDO.ws;
  if(ws && ws.readyState === 1){ MUNDO.ultimo = ''; return; }   // sigue viva: que mande su posición ya
  if(ws && ws.readyState === 0) return;
  MUNDO.ws = null; clearTimeout(MUNDO.reintento); mundoConectar();
}
function chatCerrar(){
  const bar = document.getElementById('advChatBar');
  if(bar && !bar.hidden){ bar.hidden = true; const i = document.getElementById('advChatInput'); if(i){ i.value = ''; i.blur(); } chatTecladoFin(); }
  const b = document.getElementById('advChatBtn'); if(b && MUNDO.ws) b.hidden = false;
  const bb = document.getElementById('advBatBtn'); if(bb && MUNDO.ws) bb.hidden = false;
}
(() => {
  const btn = document.getElementById('advChatBtn'), bar = document.getElementById('advChatBar'), inp = document.getElementById('advChatInput');
  if(!btn || !bar || !inp) return;
  btn.onclick = () => { chatTecladoInicio(); bar.hidden = false; btn.hidden = true; const bb = document.getElementById('advBatBtn'); if(bb) bb.hidden = true; chatLogPintar(); inp.focus({preventScroll: true}); };
  bar.addEventListener('submit', ev => {
    ev.preventDefault();
    const txt = inp.value.trim();
    if(!txt){ chatCerrar(); return; }
    if(MUNDO.ws && MUNDO.ws.readyState === 1) try{ MUNDO.ws.send(JSON.stringify({k: 'c', txt: txt.slice(0, 60)})); }catch(e){}
    inp.value = '';
    document.getElementById('advChatAviso').textContent = '';
    chatCerrar();
  });
  inp.addEventListener('keydown', ev => { if(ev.key === 'Escape') chatCerrar(); });
})();
/* ⚔️ Batalla rápida: tocás ⚔️ y quedás "buscando rival" (1 minuto). Si otro entrenador que está en la Aventura
   también toca ⚔️, el servidor los junta: a los dos se les abre la Arena para elegir equipo (15 segundos) y arranca el duelo. */
const BATALLA_BUSCA_MS = 60000;
function batallaAviso(txt, ms){
  const a = document.getElementById('advBatAviso');
  if(!a) return;
  a.textContent = txt || '';
  clearTimeout(batallaAviso._t);
  if(txt && ms) batallaAviso._t = setTimeout(() => { if(a.textContent === txt) a.textContent = ''; }, ms);
}
function batallaReiniciar(){
  MUNDO.buscando = false;
  clearTimeout(batallaReiniciar._t);
  const bb = document.getElementById('advBatBtn');
  if(bb) bb.classList.remove('buscando');
  batallaAviso('');
}
const arenaAbierta = () => { const o = document.getElementById('arenaOverlay'); return !!(o && o.classList.contains('show')); };
/* El logo ⚔️ sale sobre la cabeza de quien busca batalla, como un globo de chat; el que está cerca lo toca para aceptar. */
function sincronizarBatGlobos(lista, escala){
  const caja = document.getElementById('advBatGlobos');
  if(!caja) return;
  while(caja.children.length < lista.length){
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'adv-batglobo'; b.textContent = '⚔️'; b.setAttribute('aria-label', 'Aceptar la batalla');
    b.addEventListener('pointerdown', ev => ev.stopPropagation());   // no es para caminar
    b.onclick = () => { const id = Number(b.dataset.id); if(id <= -500 && id > -600) batallaFalso(id); else batallaTocar(); };
    caja.appendChild(b);
  }
  [...caja.children].forEach((el, i) => {
    const o = lista[i];
    if(!o){ el.style.display = 'none'; return; }
    el.style.display = 'grid';
    el.dataset.id = o.id == null ? '' : String(o.id);
    el.classList.toggle('propio', o.id == null);
    el.style.left = Math.round((o.px + 8) * escala) + 'px';
    el.style.top  = Math.round((o.py - 17) * escala) + 'px';
  });
}
function batallaEmpezar(m){
  batallaReiniciar();
  if(typeof window.abrirDueloRapido !== 'function' || !m.codigo || arenaAbierta()) return;
  window.abrirDueloRapido({codigo: String(m.codigo), rival: String(m.rival || 'otro entrenador').slice(0, 20)});
}
/* Tocás el ⚔️ de uno de los jugadores de relleno: peleás en la Arena contra un equipo armado por el juego (parecido al tuyo), con su nombre.
   Paga lo mismo que una pelea común de la Arena (no suma nada especial). Después de pelear, ese jugador no busca batalla por 3 min. */
function batallaFalso(id){
  const f = FALSOS[-500 - id];
  if(!f || arenaAbierta() || typeof window.abrirArena !== 'function') return;
  if(typeof window.puedeDueloRapido === 'function' && !window.puedeDueloRapido()) return;
  if(MUNDO.buscando){ try{ MUNDO.ws && MUNDO.ws.send(JSON.stringify({k: 'b', on: false})); }catch(e){} batallaReiniciar(); }
  falsosPelea[id] = Date.now() + 180e3; delete MUNDO.busca[id];
  window.__rivalFalso = {n: f.n, fig: Math.round(((typeof DATA !== 'undefined' && DATA.length) || 400) * (.25 + .1 * f.rg)), hasta: Date.now() + 5 * 60e3};
  window.abrirArena();
}
function batallaTocar(){
  const bb = document.getElementById('advBatBtn');
  if(!MUNDO.ws || MUNDO.ws.readyState !== 1) return;
  if(MUNDO.buscando){
    try{ MUNDO.ws.send(JSON.stringify({k: 'b', on: false})); }catch(e){}
    batallaReiniciar(); batallaAviso('Dejaste de buscar batalla.', 2500);
    return;
  }
  if(typeof window.puedeDueloRapido === 'function' && !window.puedeDueloRapido()) return;
  try{ MUNDO.ws.send(JSON.stringify({k: 'b', on: true})); }catch(e){ return; }
  MUNDO.buscando = true; if(bb) bb.classList.add('buscando');
  batallaAviso('⚔️ Buscando rival… tocá ⚔️ otra vez para cancelar');
  clearTimeout(batallaReiniciar._t);
  batallaReiniciar._t = setTimeout(() => {
    if(!MUNDO.buscando) return;
    try{ MUNDO.ws && MUNDO.ws.send(JSON.stringify({k: 'b', on: false})); }catch(e){}
    batallaReiniciar(); batallaAviso('Nadie quiso pelear por ahora. Probá de nuevo en un rato.', 4000);
  }, BATALLA_BUSCA_MS);
}
(() => { const bb = document.getElementById('advBatBtn'); if(bb) bb.onclick = batallaTocar; })();
/* Nombre del rango ganado (los bots y el 'Novato' no llevan cartel) */
/* Cuánto hay que subir el cartel para que quede arriba de la cabeza del Pokémon de montura y no encima */
function subeMontura(clave, av){
  const m = clave && MONTURAS[clave]; if(!m) return 0;
  const hd = MONTURA_HD[clave + '-' + av];
  if(hd){ const hMax = Math.max(...Object.values(hd.vistas).map(v => v.h)) * hd.alto / 300; return Math.max(0, hMax + (m.vuela ? 9 : 0) - 17); }   // arriba de la cabeza del jinete, no sobre el cuerpo
  return Math.max(0, m.alto + (m.vuela ? 8 : 0) - 16);
}
function nombreRango(i){ const r = RANGOS_MAESTRO[i | 0]; return i > 0 && r ? r.nombre : ''; }
function sincronizarNombres(lista, escala){
  const caja = document.getElementById('advNombres');
  if(!caja) return;
  while(caja.children.length < lista.length) caja.appendChild(document.createElement('span'));
  [...caja.children].forEach((el, i) => {
    const o = lista[i];
    if(!o){ el.style.display = 'none'; return; }
    const clave = (o.r || '') + '|' + o.n;
    if(el.dataset.k !== clave){
      el.dataset.k = clave; el.textContent = '';
      if(o.r){ const r = document.createElement('i'); r.className = 'rg'; r.textContent = o.r; el.appendChild(r); }
      if(o.n) el.appendChild(document.createTextNode(o.n));
      el.classList.toggle('solo-rg', !o.n);
    }
    el.style.display = 'block';
    el.style.left = Math.round((o.px + 8) * escala) + 'px';
    el.style.top  = Math.round((o.py - 3) * escala) + 'px';
  });
}
