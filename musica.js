/* Música de fondo del juego: 5 temas ORIGINALES hechos con osciladores (chiptune), sin archivos de
   audio y sin música de nadie, así que no hay derechos de autor de por medio y se puede usar en videos.

   Cada tema es una grilla de 64 pasos (4 compases de 16 semicorcheas) con melodía, bajo, arpegio y
   batería. Los números de la melodía son GRADOS de la escala (0 = tónica, 7 = tónica una octava
   arriba); "." silencio; "-" sigue sonando la nota anterior. Los acordes son grados de la escala.

   Temas:  inicio (menú) · magia (Pokédex, evolución, repetidas) · aventura (mapa) · batalla (Arena)
           · equipo (2 vs 2 y todos contra todos).
   Qué suena lo decide elegir(): mira qué pantalla está abierta, cada 0,8 s. */
(function(){
'use strict';
/* 14/11: temas GRABADOS hechos por Zeta con IA (Gemini). Cada pantalla suena con su archivo de audio/ (recortado para repetirse sin salto,
   ver /root/pokemon/audio). Si el archivo no carga (sin señal, navegador viejo) sigue sonando el chiptune de siempre.
   'evolucion' no se repite: es la escena de evolución (subida + estallido a los 5 s + festejo). */
const ARCHIVOS = {inicio: 'audio/inicio.mp3', aventura: 'audio/aventura.mp3', magia: 'audio/magia.mp3', batalla: 'audio/batalla.mp3',
  equipo: 'audio/equipo.mp3', incursion: 'audio/incursion.mp3', evolucion: 'audio/evolucion.mp3'};
/* volumen de cada grabación respecto del chiptune (las grabaciones ya vienen fuertes; las peleas más bajo para oír los golpes) */
const NIVEL_ARCHIVO = {inicio: .55, aventura: .5, magia: .55, batalla: .42, equipo: .42, incursion: .45, evolucion: .8};
const UNA_VEZ = {evolucion: true};
const KEY = 'album-musica';
/* Volumen de fondo: bajo a propósito, que acompañe y no moleste. Cada tema además tiene su `nivel` (las peleas, más bajo, para que se oigan los golpes). */
const VOLUMEN = .32;
const ESC = {mayor:[0, 2, 4, 5, 7, 9, 11], menor:[0, 2, 3, 5, 7, 8, 10], lidia:[0, 2, 4, 6, 7, 9, 11]};
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

const PISTAS = {
  inicio: {bpm:104, raiz:60, esc:'mayor', acordes:[0, 5, 3, 4], trans:0, tBajo:-12, tArp:12, onda:'pulso25', vol:.8, nivel:.85,
    melodia:['4 - . 2 - . 4 - 7 - . 4 - 2 - .', '5 - . 4 - . 2 - 4 - . 2 - 0 - .', '3 - . 5 - . 7 - 5 - . 3 - 5 - .', '4 - . 6 - . 8 - 6 - . 4 - 1 - 4'],
    bajo:[0, -1, -1, -1, 2, -1, -1, -1, 0, -1, -1, -1, 2, -1, -1, -1],
    arp:[0, 1, 2, 3, 2, 1, 2, 1, 0, 1, 2, 3, 2, 1, 2, 1],
    kick:[1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], snare:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    hat:[0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]},
  aventura: {bpm:126, raiz:67, esc:'mayor', acordes:[0, 4, 5, 3], trans:-12, tBajo:-24, tArp:0, onda:'pulso25', vol:.8, nivel:.85,
    melodia:['2 - 4 - 7 - 4 - 2 - 4 - 7 - 9 -', '8 - 6 - 4 - 6 - 8 - 6 - 4 - 6 -', '9 - 7 - 5 - 7 - 9 - 11 - 9 - 7 -', '7 - 5 - 3 - 5 - 7 - 5 - 4 - 1 -'],
    bajo:[0, -1, 0, -1, 2, -1, 2, -1, 0, -1, 0, -1, 2, -1, 3, -1],
    arp:[-1, -1, 1, -1, -1, -1, 2, -1, -1, -1, 1, -1, -1, -1, 2, -1],
    kick:[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], snare:[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat:[0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]},
  batalla: {bpm:156, raiz:57, esc:'menor', acordes:[0, 5, 2, 6], trans:0, tBajo:-12, tArp:12, onda:'pulso25', vol:.75, nivel:.6,
    melodia:['0 . 0 2 . 0 . 4 0 . 0 2 . 4 2 0', '5 . 5 7 . 5 . 9 5 . 5 7 . 9 7 5', '2 . 2 4 . 2 . 6 2 . 2 4 . 6 4 2', '6 . 6 8 . 6 . 10 6 . 8 10 . 8 6 4'],
    bajo:[0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 2, 3, 2],
    arp:[-1, -1, -1, -1, 2, -1, -1, -1, -1, -1, -1, -1, 2, -1, 1, -1],
    kick:[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0], snare:[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    hat:[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]},
  equipo: {bpm:168, raiz:62, esc:'menor', acordes:[0, 5, 6, 4], trans:0, tBajo:-12, tArp:12, onda:'pulso25', vol:.75, nivel:.6,
    melodia:['4 . 2 . 0 . 2 4 . 7 . 4 . 2 0 .', '5 . 7 . 9 . 7 5 . 9 . 7 . 5 7 .', '6 . 8 . 10 . 8 6 . 10 . 8 . 6 8 .', '4 . 6 . 8 . 6 4 . 8 . 11 . 8 6 4'],
    bajo:[0, 0, -1, 0, 3, 0, -1, 0, 0, 0, -1, 0, 3, 0, 2, 3],
    arp:[2, -1, 1, -1, 2, -1, 3, -1, 2, -1, 1, -1, 2, -1, 3, 1],
    kick:[1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0], snare:[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat:[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]},
  magia: {bpm:84, raiz:65, esc:'lidia', acordes:[0, 1, 5, 4], trans:0, tBajo:-12, tArp:12, onda:'triangle', vol:.9,
    melodia:['4 - - - - - 2 - - - 4 - - - 7 -', '8 - - - - - 5 - - - 3 - - - 5 -', '9 - - - - - 7 - - - 5 - - - 7 -', '8 - - - 6 - - - 4 - - - 2 - 4 -'],
    bajo:[0, -1, -1, -1, -1, -1, -1, -1, 2, -1, -1, -1, -1, -1, -1, -1],
    arp:[0, 1, 2, 3, 2, 1, 2, 1, 0, 1, 2, 3, 2, 1, 2, 1],
    kick:[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], snare:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    hat:[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]}
};
Object.keys(PISTAS).forEach(k => { PISTAS[k].mel = PISTAS[k].melodia.map(c => c.trim().split(/\s+/)); });

/* grado de la escala → número de nota MIDI */
function grado(p, g){
  const e = ESC[p.esc], n = e.length, o = Math.floor(g / n), i = ((g % n) + n) % n;
  return p.raiz + 12 * o + e[i];
}

/* ---- las voces ---- */
/* Ondas de pulso finas (25 % y 12,5 %): el timbre típico de las consolas portátiles viejas */
function onda(ctx, nombre){
  const d = nombre === 'pulso25' ? .25 : .125;
  ctx._ondas = ctx._ondas || {};
  if(!ctx._ondas[nombre]){
    const N = 48, re = new Float32Array(N), im = new Float32Array(N);
    for(let n = 1; n < N; n++){ re[n] = 2 / (n * Math.PI) * Math.sin(n * Math.PI * d); im[n] = 2 / (n * Math.PI) * (1 - Math.cos(n * Math.PI * d)); }
    ctx._ondas[nombre] = ctx.createPeriodicWave(re, im);
  }
  return ctx._ondas[nombre];
}
function nota(ctx, dest, tipo, midi, t, dur, vol){
  const o = ctx.createOscillator(), g = ctx.createGain();
  if(tipo === 'pulso25' || tipo === 'pulso125') o.setPeriodicWave(onda(ctx, tipo)); else o.type = tipo;
  o.frequency.value = hz(midi);
  g.gain.setValueAtTime(.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + .006);
  g.gain.setValueAtTime(vol * .8, t + dur * .65);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur + .03);
}
function ruidoBuf(ctx){
  if(!ctx._ruido){
    const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0);
    for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    ctx._ruido = b;
  }
  return ctx._ruido;
}
function golpeRuido(ctx, dest, t, dur, vol, tipo, frec){
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = ruidoBuf(ctx); f.type = tipo; f.frequency.value = frec;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest);
  s.start(t, Math.random() * .5); s.stop(t + dur + .02);
}
function bombo(ctx, dest, t, vol){
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .16);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + .2);
}

/* programa UN paso (una semicorchea) de un tema, en el instante t */
function paso(ctx, dest, p, n, t){
  const sec = 60 / p.bpm / 4, c = Math.floor(n / 16) % 4, s = n % 16, r = p.acordes[c];
  const tono = i => [r, r + 2, r + 4, r + 7][i];
  const tok = p.mel[c][s];
  if(tok !== '.' && tok !== '-'){
    let largo = 1;
    for(let k = s + 1; k < 16 && p.mel[c][k] === '-'; k++) largo++;
    nota(ctx, dest, p.onda, grado(p, Number(tok)) + p.trans, t, largo * sec * .96, (p.onda === 'triangle' ? .1 : .15) * p.vol);
  }
  if(p.bajo[s] >= 0) nota(ctx, dest, 'triangle', grado(p, tono(p.bajo[s])) + p.tBajo, t, sec * 1.9, .2);
  if(p.arp[s] >= 0) nota(ctx, dest, 'pulso125', grado(p, tono(p.arp[s])) + p.tArp, t, sec * .9, .04);
  if(p.kick[s]) bombo(ctx, dest, t, .24);
  if(p.snare[s]) golpeRuido(ctx, dest, t, .1, .1, 'bandpass', 1800);
  if(p.hat[s]) golpeRuido(ctx, dest, t, .035, .035, 'highpass', 7000);
}

/* ---- reproductor en vivo ---- */
let ctx = null, maestro = null, actual = null, bus = null, plan = null, nPaso = 0, tProx = 0, pistaActual = '';
const audios = {}, fallidos = {};
let sonando = null;   // el <audio> que está sonando ahora
let activa = true;
try{ activa = localStorage.getItem(KEY) !== '0'; }catch(e){}
let desbloqueado = false;   // el navegador sólo deja sonar después de un toque

const permitido = () => {
  /* las pruebas automáticas no tienen que sonar (salvo que lo pidan) */
  try{ if((navigator.webdriver || window.__arenaMudo) && !localStorage.getItem('album-musica-test')) return false; }catch(e){}
  return true;
};

function asegurarCtx(){
  if(ctx) return ctx;
  const C = window.AudioContext || window.webkitAudioContext;
  if(!C) return null;
  ctx = new C();
  maestro = ctx.createGain();
  maestro.gain.value = activa ? VOLUMEN : 0;
  maestro.connect(ctx.destination);
  return ctx;
}

function programar(){
  const p = PISTAS[actual];
  if(!p || !ctx) return;
  const sec = 60 / p.bpm / 4;
  while(tProx < ctx.currentTime + .2){
    paso(ctx, bus, p, nPaso, tProx);
    nPaso = (nPaso + 1) % 64; tProx += sec;
  }
}

function sonar(nombre){
  if(nombre === pistaActual) return;
  pistaActual = nombre;
  if(!desbloqueado || !permitido() || !asegurarCtx()) return;
  if(ctx.state === 'suspended') ctx.resume();
  const ahora = ctx.currentTime;
  if(bus){   // el tema anterior se va apagando
    const viejo = bus;
    viejo.gain.cancelScheduledValues(ahora); viejo.gain.setValueAtTime(viejo.gain.value, ahora); viejo.gain.linearRampToValueAtTime(0, ahora + .6);
    setTimeout(() => { try{ viejo.disconnect(); }catch(e){} }, 900);
  }
  if(sonando){ const a = sonando; setTimeout(() => { if(sonando !== a){ try{ a.pause(); }catch(e){} } }, 700); sonando = null; }
  clearInterval(plan); plan = null;
  bus = ctx.createGain();
  bus.gain.setValueAtTime(0, ahora);
  bus.connect(maestro);
  const el = ARCHIVOS[nombre] && archivo(nombre);
  if(el){
    /* grabación: el <audio> entra al mismo volumen general (y al botón de silencio) por Web Audio */
    const miBus = bus;
    try{ el.fuente.disconnect(); }catch(e){}
    el.fuente.connect(miBus);
    bus.gain.linearRampToValueAtTime(NIVEL_ARCHIVO[nombre] || .5, ahora + (UNA_VEZ[nombre] ? .05 : .6));
    sonando = el.audio;
    actual = nombre;
    el.listo.then(() => {
      if(sonando !== el.audio || bus !== miBus) return;
      if(UNA_VEZ[nombre] || el.audio.ended) try{ el.audio.currentTime = 0; }catch(e){}
      return el.audio.play();
    }).catch(() => { if(pistaActual === nombre && bus === miBus) sintetizar(nombre, ctx.currentTime); });
    return;
  }
  sintetizar(nombre, ahora);
}
/* chiptune de siempre (también es el respaldo si una grabación falla) */
function sintetizar(nombre, ahora){
  if(!PISTAS[nombre]){ actual = nombre; return; }
  bus.gain.cancelScheduledValues(ahora); bus.gain.setValueAtTime(0, ahora); bus.gain.linearRampToValueAtTime(PISTAS[nombre].nivel || 1, ahora + .6);
  actual = nombre; nPaso = 0; tProx = ahora + .08;
  clearInterval(plan); plan = setInterval(programar, 30); programar();
}
/* un <audio> por tema, creado la primera vez que se lo necesita (así cada archivo se baja sólo si se abre esa pantalla) */
function archivo(nombre){
  if(fallidos[nombre] || !ctx || !ctx.createMediaElementSource) return null;
  if(!audios[nombre]){
    try{
      const a = new Audio(); a.preload = 'auto'; a.loop = !UNA_VEZ[nombre];
      /* se baja ENTERO y se toca desde la memoria (blob): el sitio no responde "por partes" (Range) y el iPhone lo necesita para un <audio> */
      const listo = fetch(ARCHIVOS[nombre]).then(r => { if(!r.ok) throw new Error('audio ' + r.status); return r.blob(); })
        .then(b => { a.src = URL.createObjectURL(b); })
        .catch(e => { fallidos[nombre] = true; if(pistaActual === nombre && actual === nombre){ pistaActual = ''; sonar(nombre); } throw e; });
      listo.catch(() => {});
      audios[nombre] = {audio: a, fuente: ctx.createMediaElementSource(a), listo};
    }catch(e){ fallidos[nombre] = true; return null; }
  }
  return audios[nombre];
}
/* deja bajada la descarga de un tema antes de que haga falta (la escena de evolución arranca justo con su música) */
function precargar(nombre){ if(desbloqueado && permitido() && asegurarCtx()) archivo(nombre); }

/* qué tema corresponde a la pantalla que está abierta */
function elegir(){
  const abierto = id => { const el = document.getElementById(id); return !!el && el.classList.contains('show'); };
  if(abierto('arenaOverlay')){
    const S = window.__arena && window.__arena.estado && window.__arena.estado();
    if(S && S.fase !== 'fin') return S.modo === 'raid' ? 'incursion' : S.multi ? 'equipo' : 'batalla';
    return 'inicio';
  }
  if(abierto('evoEscena')) return 'evolucion';
  if(abierto('advOverlay')) return 'aventura';
  if(['pokedexOverlay', 'detalleOverlay', 'evolucionOverlay', 'repetidasOverlay', 'intercambioOverlay'].some(abierto)) return 'magia';
  return 'inicio';
}
function revisar(){
  if(desbloqueado) sonar(elegir());
  /* el botón flotante sólo en el inicio (la Arena y la Aventura tienen el suyo) */
  const b = document.getElementById('musicaBtn');
  if(b) b.hidden = ['arenaOverlay', 'advOverlay'].some(id => { const el = document.getElementById(id); return el && el.classList.contains('show'); });
}

function pintarBotones(){
  document.querySelectorAll('[data-musica-btn]').forEach(b => {
    b.textContent = activa ? '🎵' : '🔇';
    b.setAttribute('aria-pressed', activa ? 'true' : 'false');
    b.title = activa ? 'Música: sí (tocá para silenciar)' : 'Música: no (tocá para activar)';
  });
}
function poner(si){
  activa = !!si;
  try{ localStorage.setItem(KEY, activa ? '1' : '0'); }catch(e){}
  if(maestro){ const t = ctx.currentTime; maestro.gain.cancelScheduledValues(t); maestro.gain.setValueAtTime(maestro.gain.value, t); maestro.gain.linearRampToValueAtTime(activa ? VOLUMEN : 0, t + .25); }
  if(activa && desbloqueado) sonar(pistaActual || elegir());
  pintarBotones();
}

/* el primer toque desbloquea el audio */
function desbloquear(){
  if(desbloqueado) return;
  desbloqueado = true;
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.removeEventListener(ev, desbloquear, true));
  if(permitido() && asegurarCtx() && ctx.state === 'suspended') ctx.resume();
  const t = pistaActual; pistaActual = '';
  sonar(t || elegir());
}
['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, desbloquear, true));
document.addEventListener('visibilitychange', () => {
  if(!ctx) return;
  if(document.hidden){ ctx.suspend(); if(sonando) try{ sonando.pause(); }catch(e){} }
  else if(activa){ ctx.resume(); if(sonando && !(UNA_VEZ[actual] && sonando.ended)) sonando.play().catch(() => {}); }
});
setInterval(revisar, 800);
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-musica-btn]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); poner(!activa); }));
  pintarBotones();
});

/* Renderiza un tema a un buffer (para escucharlo sin abrir el juego y para las pruebas) */
async function renderizar(nombre, vueltas){
  const p = PISTAS[nombre], sec = 60 / p.bpm / 4, total = 64 * (vueltas || 1);
  const off = new OfflineAudioContext(1, Math.ceil((total * sec + 1.2) * 44100), 44100);
  const salida = off.createGain(); salida.gain.value = VOLUMEN; salida.connect(off.destination);
  for(let n = 0; n < total; n++) paso(off, salida, p, n % 64, n * sec);
  const buf = await off.startRendering();
  return {datos:Array.from(buf.getChannelData(0)), segundos:total * sec, tasa:44100};
}

window.Musica = {pistas:Object.keys(PISTAS), archivos:ARCHIVOS, precargar, archivoSonando:() => (sonando && !sonando.paused ? sonando.src.split('/').pop() : null), poner, alternar:() => poner(!activa), estaActiva:() => activa, sonar, elegir, renderizar, tema:() => pistaActual};
})();
