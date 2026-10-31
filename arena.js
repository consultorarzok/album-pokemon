/* ====================== ARENA DE BATALLA (Kanto, Johto, Hoenn y Sinnoh) · tiempo real ======================
   Cada uno maneja a su Pokémon por la arena (joystick o WASD) y ataca con botones:
     · Corto  = embestida con garra (pega fuerte pero hay que estar encima)
     · Medio  = proyectil con forma según el tipo (se esquiva moviéndose)
     · Largo  = se carga ~0,6 s mostrando por dónde va a pegar (rayo o lluvia) y
                después golpea fuerte: hay que salir de la zona marcada
     · Esquivar = voltereta corta con invulnerabilidad
   Equipo de hasta 6, con cambio en cualquier momento (pausa mientras elegís).
   Cada Pokémon tiene su propio crítico (chance y multiplicador) y su velocidad.

   El cuerpo de cada Pokémon no se desliza quieto: acelera y frena con inercia,
   da saltitos al caminar, se inclina hacia donde va, se da vuelta, respira,
   se agacha antes de atacar, se estira en la embestida, retrocede al disparar,
   vibra al cargar y deja estela al esquivar. Cada golpe congela la acción un
   instante (hit-stop), deja marca en el piso y hace reaccionar al público.

   El rival es un bot sin inteligencia: sigue un guion de acciones sorteadas según
   su estilo, con reflejos (a veces esquiva proyectiles, se corre de lo que carga el
   jugador) y un tope contra la repetición.
   El fondo se dibuja en código con píxeles, a la medida de la pantalla (celular,
   tablet o compu). Sonido 8-bit sintetizado (sin archivos), con botón de silencio. */
(function(){
'use strict';

const CDN = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/';
const spFrente  = (id, v) => ESPECIAL_POR_ID[id] ? ESPECIAL_POR_ID[id].frente : v && SHINY_PROPIO[id] ? SHINY_PROPIO[id].frente : CDN + 'versions/generation-v/black-white/animated/' + (v ? 'shiny/' : '') + id + '.gif';
const spEspalda = (id, v) => ESPECIAL_POR_ID[id] ? ESPECIAL_POR_ID[id].espalda : v && SHINY_PROPIO[id] ? SHINY_PROPIO[id].espalda : CDN + 'versions/generation-v/black-white/animated/back/' + (v ? 'shiny/' : '') + id + '.gif';
const spIcono   = (id, v) => ESPECIAL_POR_ID[id] ? ESPECIAL_POR_ID[id].icono : v && SHINY_PROPIO[id] ? SHINY_PROPIO[id].icono : CDN + (v ? 'shiny/' : '') + id + '.png';

/* ---------------- reglas ---------------- */
/* El corto pega menos y se recarga más lento que antes: que la pelea no sea sólo
   puño. El largo es el golpe fuerte que vale la pena cargar. */
const ALC = {
  corto: {etq:'Corto', poder:22, coste:10, cd:1.7},
  medio: {etq:'Medio', poder:34, coste:16, cd:1.0},
  largo: {etq:'Largo', poder:64, coste:34, cd:2.4}
};
/* Mientras alguien carga el largo el juego va en cámara lenta, pero la carga avanza
   más rápido que el resto: da tiempo de reaccionar, no de pasear. Esquivar rodando
   adentro del ataque sólo lo roza (media pegada): para salvarse hay que salir. */
const CAMARA_LENTA = .5, CARGA_EN_LENTA = 1.4, ROCE_LARGO = .5;
const ATAQUES = ['corto', 'medio', 'largo'];
const ESQ = {coste:12, cd:1.3, dur:.30};
const EN_MAX = 100, EN_REGEN = 14, EN_PREMIO_ESQUIVE = 18;
const CAMBIO_CD = 3, INVUL_ENTRADA = 1;
const EQUIPO_MAX = 6, EQUIPO_MIN = PELEA_MIN;
/* Premio según cómo fue la pelea: base + cada rival que tumbaste + los tuyos que quedaron
   en pie + el tiempo peleado (con tope, para que no convenga estirarla). */
const PREMIO = {ganar:economiaDe(Date.now()).ganar, bonoVivos:40, bonoRapidez:20, rapidezMin:30, rapidezMax:90, perder:15, porKO:20, segPorMoneda:3, topeTiempo:60};
/* Ganar paga de 100 a 160 según la destreza: 100 de base + hasta 40 por los tuyos que quedaron en pie + hasta 20 por la rapidez
   (todo el bono si ganás en 30 s o menos, nada si tardás 90 s o más). Perder paga menos que ganar (tope 90). */
const TOPE_DERROTA = 90;
/* Tamaño de los sprites respecto del píxel del fondo: más chicos que 1:1 para
   que la arena se vea grande y quede en escala con el público y los entrenadores. */
const ESCALA_POKE = {yo:.66, riv:.6};
const ESCALA_ENTRENADOR = .42;
const VEL_BASE = 34;          // en unidades u() por segundo
const ACEL = 11;              // qué tan rápido llega a la velocidad pedida (inercia)

/* Críticos y velocidad propios de cada Pokémon: salen de su número y de su tipo,
   así que son siempre los mismos para el mismo Pokémon. */
const frac = n => n - Math.floor(n);
const hash = (id, k) => frac(Math.sin(id * 12.9898 + k * 78.233) * 43758.5453);
const SESGO_CRIT = {fighting:.05, dark:.04, ghost:.03, psychic:.03, electric:.02, bug:.02, rock:-.02, normal:-.01};
const SESGO_VEL  = {electric:.22, flying:.18, bug:.10, ghost:.08, psychic:.06, fighting:.05, normal:.04, fire:.04,
                    fairy:.03, dragon:.02, water:0, ice:-.02, grass:-.04, poison:-.06, ground:-.12, rock:-.22};
function statsDe(p){
  const crit = Math.min(.30, Math.max(.04, .07 + hash(p.id, 1) * .14 + (SESGO_CRIT[p.type] || 0)));
  const critMult = Math.round((1.4 + hash(p.id, 2) * .8 + (p.type === 'fighting' ? .1 : 0)) * 10) / 10;
  const vel = Math.min(1.35, Math.max(.7, .92 + hash(p.id, 3) * .2 + (SESGO_VEL[p.type] || 0)));
  return {crit, critMult, vel};
}

/* Ataques REALES de cada Pokémon (datos de PokeAPI: lo que aprende por nivel, huevo, tutor o MT,
   con su nombre oficial en español y su tipo oficial). Cada ataque tiene su botón y un efecto que
   imita al del juego:
     corto: garra, mordisco, golpe, cuerpo (salta y aplasta), picotazo, latigo, patada, aguijon
     medio: bola, chorro, onda (aros que crecen), hojas, agujas, piedra, rayito, polvo (nube lenta),
            estrella (persigue), lodo, burbujas, tornado, hueso (vuelve como bumerán),
            semillas, suelo (onda que viaja por el piso), monedas
     largo: rayo, lluvia (muchos golpes sobre la zona), zona (estallido sobre la zona),
            trueno (rayo del cielo), propia (onda alrededor de uno mismo),
            embestida (cruza la arena por la línea marcada y termina a los golpes)
   MOVS_CAT: [nombre, tipo, efecto, botón (c/m/l), forma opcional]. Lo arma un script desde PokeAPI
   con correcciones a mano para que el efecto se parezca al ataque real.
   MOVS_APR: por Pokémon, los ataques que puede tener en cada botón (corto/medio/largo), índices de
   MOVS_CAT; «.n» = prioridad (0 por nivel, 1 huevo, 2 MT/tutor de su tipo, 3 otras MT), «!efecto»
   = efecto distinto cuando le faltan ataques de ese botón y usa uno de otro.
   Cada EJEMPLAR saca sus tres ataques de esas listas según su número de serie: dos Charizard
   pueden pelear distinto, y el mismo ejemplar siempre tiene los mismos. */
const MOVS_CAT = [
  ['A Bocajarro','fighting','embestida','l'],['Abrecaminos','grass','golpe','c'],['Absorber','grass','semillas','m'],['Ácido','poison','lodo','m'],
  ['Acoso','bug','bola','m'],['Acróbata','flying','golpe','c'],['Acua Cola','water','embestida','l'],['Acua Jet','water','golpe','c'],
  ['Aerochorro','flying','rayo','l'],['Agarre','normal','garra','c'],['Agarrón','normal','golpe','c'],['Agua Fría','water','chorro','m'],
  ['Agua Lodosa','water','propia','l'],['Aguijón Letal','bug','aguijon','c'],['Aire Afilado','flying','tornado','m','medialuna'],['Al Ataque','bug','embestida','l'],
  ['Ala Bis','flying','golpe','c'],['Ala de Acero','steel','golpe','c'],['Alarido','dark','onda','m'],['Alboroto','normal','propia','l'],
  ['Allanador Férreo','steel','embestida','l'],['Alto Voltaje','electric','bola','m'],['Alud','ice','golpe','c'],['Anillo Ígneo','fire','zona','l'],
  ['Antiaéreo','rock','piedra','m'],['Arañazo','normal','garra','c'],['Arenas Ardientes','ground','tornado','m'],['Aria Burbuja','water','propia','l'],
  ['Arremetida','ground','embestida','l'],['Arrumaco','psychic','golpe','c'],['Asalto Barrera','psychic','golpe','c'],['Ascenso Draco','flying','embestida','l'],
  ['Ascuas','fire','bola','m','llama'],['Atadura','normal','latigo','c'],['Ataque Aéreo','flying','embestida','l'],['Ataque Ala','flying','golpe','c'],
  ['Ataque Arena','ground','polvo','m'],['Ataque Furia','normal','picotazo','c'],['Ataque Óseo','ground','hueso','m'],['Ataque Rápido','normal','golpe','c'],
  ['Atizar','normal','cuerpo','c'],['Autodestrucción','normal','propia','l'],['Avalancha','rock','lluvia','l','roca'],['Azote','normal','golpe','c'],
  ['Beso Amoroso','normal','onda','m','corazon'],['Beso Drenaje','fairy','bola','m','corazon'],['Beso Dulce','fairy','onda','m','corazon'],['Bofetón Lodo','ground','lodo','m'],
  ['Bola de Polen','bug','zona','l'],['Bola Hielo','ice','piedra','m','cristal'],['Bola Neblina','psychic','rayo','l'],['Bola Sombra','ghost','bola','m','bola'],
  ['Bola Voltio','electric','bola','m','voltio'],['Bomba Ácida','poison','lodo','m'],['Bomba Fango','ground','lodo','m','lodo'],['Bomba Germen','grass','semillas','m'],
  ['Bomba Huevo','normal','bola','m','huevo'],['Bomba Imán','steel','estrella','m','estrella'],['Bomba Lodo','poison','lodo','m'],['Bomba Sónica','normal','onda','m','anillo'],
  ['Bombardeo','normal','bola','m','huevo'],['Bote','flying','cuerpo','c'],['Brazo Pincho','grass','golpe','c'],['Brillo Mágico','fairy','estrella','m','estrella'],
  ['Brinco','bug','cuerpo','c'],['Bruma Explosiva','fairy','propia','l'],['Buceo','water','golpe','c'],['Bucle Arena','ground','tornado','m'],
  ['Burbuja','water','burbujas','m'],['Cabeza de Hierro','steel','golpe','c'],['Cabezazo','normal','embestida','l'],['Cabezazo Zen','psychic','golpe','c'],
  ['Canto','normal','onda','m','nota'],['Canto Encantador','fairy','onda','m','nota'],['Cañón Resplandor','steel','onda','m'],['Cara Susto','normal','onda','m'],
  ['Carámbano','ice','agujas','m','cristal'],['Carantoña','fairy','embestida','l'],['Carga Dragón','dragon','embestida','l'],['Carga Parábola','electric','rayito','m'],
  ['Cascada','water','golpe','c'],['Cháchara','flying','bola','m'],['Chispa','electric','golpe','c'],['Chispazo','electric','propia','l'],
  ['Chulería','dark','golpe','c'],['Chupavidas','bug','mordisco','c'],['Chuzos','ice','lluvia','l','cristal'],['Ciclón','dragon','tornado','m'],
  ['Ciclón de Hojas','grass','tornado','m'],['Clavo Cañón','normal','agujas','m'],['Cola Dragón','dragon','latigo','c'],['Cola Férrea','steel','embestida','l'],
  ['Cola Veneno','poison','latigo','c'],['Cólera Ardiente','fire','golpe','c'],['Colmillo Hielo','ice','mordisco','c'],['Colmillo Ígneo','fire','mordisco','c'],
  ['Colmillo Rayo','electric','mordisco','c'],['Colmillo Veneno','poison','mordisco','c'],['Comesueños','psychic','zona','l'],['Cometa Draco','dragon','lluvia','l','estrella'],
  ['Concha Filo','water','garra','c'],['Confusión','psychic','onda','m'],['Constricción','normal','latigo','c'],['Contraataque','fighting','golpe','c'],
  ['Cornada','normal','picotazo','c'],['Corte','normal','garra','c'],['Corte Furia','bug','garra','c'],['Corte Vacío','dragon','rayo','l'],
  ['Cuchilla Solar','grass','embestida','l'],['Cuchillada','normal','garra','c'],['Cuerno Certero','steel','picotazo','c'],['Cuerpo Pesado','steel','cuerpo','c'],
  ['Danza Pétalo','grass','lluvia','l','hoja'],['Demolición','fighting','golpe','c'],['Derribo','normal','embestida','l'],['Desahogo','dark','golpe','c'],
  ['Desarme','dark','golpe','c'],['Deseo Oculto','steel','rayo','l'],['Desquite','fighting','golpe','c'],['Destructor','normal','golpe','c'],
  ['Día de Pago','normal','monedas','m','moneda'],['Disparo Demora','bug','polvo','m'],['Disparo Espejo','steel','onda','m'],['Disparo Lodo','ground','lodo','m'],
  ['Distorsión','dragon','rayo','l'],['Doble Ataque','bug','aguijon','c'],['Doble Bofetón','normal','golpe','c'],['Doble Filo','normal','embestida','l'],
  ['Doble Golpe','normal','golpe','c'],['Doble Patada','fighting','patada','c'],['Dragoaliento','dragon','onda','m','llama'],['Dulce Aroma','normal','polvo','m'],
  ['Electrocañón','electric','rayo','l'],['Electrotela','electric','polvo','m'],['Empujón','fighting','golpe','c'],['Energibola','grass','bola','m'],
  ['Enfado','dragon','embestida','l'],['Envidia Ardiente','fire','bola','m','llama'],['Envite Acuático','water','embestida','l'],['Envite Ígneo','fire','embestida','l'],
  ['Erupción de Ira','fire','embestida','l'],['Escaldar','water','chorro','m'],['Esfera Aural','fighting','bola','m','bola'],['Esfuerzo','normal','golpe','c'],
  ['Espada Santa','fighting','embestida','l'],['Espora','grass','polvo','m'],['Esporagodón','grass','polvo','m'],['Esquirla Helada','ice','piedra','m','cristal'],
  ['Estallido','fire','zona','l'],['Estoicismo','bug','bola','m'],['Estruendo','normal','propia','l'],['Estrujón','normal','bola','m'],
  ['Excavar','ground','golpe','c'],['Explosión','normal','propia','l'],['Fachada','normal','golpe','c'],['Falso Tortazo','normal','garra','c'],
  ['Filo del Abismo','ground','embestida','l'],['Finta','dark','garra','c'],['Fisura','ground','propia','l'],['Fitoimpulso','grass','golpe','c'],
  ['Follaje','grass','golpe','c'],['Frío Polar','ice','zona','l'],['Fuego Fatuo','fire','bola','m','llama'],['Fuego Sagrado','fire','zona','l'],
  ['Fuerza','normal','golpe','c'],['Fuerza Bruta','fighting','embestida','l'],['Fuerza Equina','ground','embestida','l'],['Fuerza Lunar','fairy','rayo','l'],
  ['Fulgor Semilla','grass','rayo','l'],['Furia','normal','golpe','c'],['Furia Dragón','dragon','bola','m','llama'],['Furia Taurina','normal','embestida','l'],
  ['Gancho Alto','fighting','golpe','c'],['Garra Brutal','normal','garra','c'],['Garra Dragón','dragon','garra','c'],['Garra Metal','steel','garra','c'],
  ['Garra Umbría','ghost','garra','c'],['Gas Venenoso','poison','polvo','m'],['Gigadrenado','grass','semillas','m'],['Gigaimpacto','normal','embestida','l'],
  ['Giro Bola','steel','cuerpo','c'],['Giro Fuego','fire','bola','m','llama'],['Giro Rápido','normal','cuerpo','c'],['Giro Vil','dark','golpe','c'],
  ['Golpe Aéreo','flying','garra','c'],['Golpe Bis','dragon','golpe','c'],['Golpe Cabeza','normal','golpe','c'],['Golpe Calor','fire','cuerpo','c'],
  ['Golpe Cuerpo','normal','cuerpo','c'],['Golpe Fantasma','ghost','embestida','l'],['Golpe Kárate','fighting','golpe','c'],['Golpe Mordaza','dark','mordisco','c'],
  ['Golpe Rastrero','bug','golpe','c'],['Golpe Roca','fighting','golpe','c'],['Golpe Umbrío','ghost','embestida','l'],['Golpes Furia','normal','garra','c'],
  ['Guardia Baja','normal','golpe','c'],['Guillotina','normal','embestida','l'],['Hidroariete','water','golpe','c'],['Hidrobomba','water','rayo','l'],
  ['Hidrocañón','water','rayo','l'],['Hidropulso','water','onda','m'],['Hierba Lazo','grass','latigo','c'],['Hipercolmillo','normal','mordisco','c'],
  ['Hiperrayo','normal','rayo','l'],['Hipertaladro','normal','embestida','l'],['Hipnosis','psychic','onda','m'],['Hoja Afilada','grass','hojas','m'],
  ['Hoja Aguda','grass','garra','c'],['Hoja Mágica','grass','hojas','m'],['Hueso Palo','ground','hueso','m'],['Huesomerang','ground','hueso','m'],
  ['Humareda','fire','propia','l'],['Ida y Vuelta','bug','golpe','c'],['Impactrueno','electric','rayito','m'],['Impresionar','ghost','golpe','c'],
  ['Infierno','fire','rayo','l'],['Infortunio','ghost','bola','m'],['Inversión','fighting','golpe','c'],['Joya de Luz','rock','estrella','m','estrella'],
  ['Juego Sucio','dark','zona','l'],['Ladrón','dark','garra','c'],['Lanzallamas','fire','rayo','l'],['Lanzamugre','poison','zona','l'],
  ['Lanzarrocas','rock','piedra','m'],['Lariat Oscuro','dark','golpe','c'],['Láser Doble','psychic','rayito','m'],['Latigazo','grass','embestida','l'],
  ['Látigo Cepa','grass','latigo','c'],['Lengüetazo','ghost','latigo','c'],['Liofilización','ice','piedra','m','cristal'],['Llama Embrujada','fire','bola','m','llama'],
  ['Llama Final','fire','rayo','l'],['Llamarada','fire','zona','l'],['Llave Corsé','fighting','golpe','c'],['Llave Giro','fighting','cuerpo','c'],
  ['Llave Vital','fighting','golpe','c'],['Lluevehojas','grass','lluvia','l','hoja'],['Lluvia Ígnea','fire','rayo','l'],['Machada','fighting','embestida','l'],
  ['Magnitud','ground','propia','l'],['Manto Espejo','psychic','onda','m'],['Martillazo','water','zona','l'],['Martillo Dragón','dragon','embestida','l'],
  ['Martillo Hielo','ice','embestida','l'],['Mazazo','grass','embestida','l'],['Megaagotar','grass','semillas','m'],['Megacuerno','bug','embestida','l'],
  ['Megapatada','normal','embestida','l'],['Megapuño','normal','golpe','c'],['Metaláser','steel','rayo','l'],['Meteoros','normal','estrella','m','estrella'],
  ['Metrónomo','normal','estrella','m'],['Mil Púas Tóxicas','poison','cuerpo','c'],['Mismo Destino','ghost','zona','l'],['Moflete Estático','electric','golpe','c'],
  ['Mordisco','dark','mordisco','c'],['Nieve Polvo','ice','tornado','m'],['Nitrocarga','fire','golpe','c'],['Onda Certera','fighting','zona','l','bola'],
  ['Onda Ígnea','fire','propia','l'],['Onda Mental','psychic','rayo','l'],['Onda Tóxica','poison','propia','l'],['Onda Trueno','electric','rayito','m'],
  ['Onda Vacío','fighting','onda','m','medialuna'],['Onda Voltio','electric','rayito','m'],['Pájaro Osado','flying','embestida','l'],['Palma Rauda','fighting','golpe','c'],
  ['Palmeo','fighting','golpe','c'],['Pantalla de Humo','normal','polvo','m'],['Paralizador','grass','polvo','m'],['Paranormal','psychic','onda','m'],
  ['Patada Baja','fighting','patada','c'],['Patada Giro','fighting','patada','c'],['Patada Hacha','fighting','embestida','l'],['Patada Ígnea','fire','patada','c'],
  ['Patada Salto','fighting','embestida','l'],['Patada Salto Alta','fighting','embestida','l'],['Pataleta','ground','golpe','c'],['Pedrada','rock','piedra','m'],
  ['Perforador','normal','embestida','l'],['Persecución','dark','golpe','c'],['Picadura','bug','mordisco','c'],['Pico Taladro','flying','picotazo','c'],
  ['Picotazo','flying','picotazo','c'],['Picotazo Veneno','poison','aguijon','c'],['Pin Misil','bug','agujas','m'],['Pirotecnia','fire','bola','m','llama'],
  ['Pirueta Helada','ice','patada','c'],['Pisotón','normal','cuerpo','c'],['Pistola Agua','water','chorro','m'],['Placaje','normal','golpe','c'],
  ['Placaje Eléctrico','electric','embestida','l'],['Plancha','bug','cuerpo','c'],['Plancha Corporal','fighting','cuerpo','c'],['Plancha Voltaica','electric','embestida','l'],
  ['Planta Feroz','grass','zona','l'],['Plumerazo','normal','latigo','c'],['Poder Místico','psychic','bola','m'],['Poder Oculto','normal','estrella','m','estrella'],
  ['Poder Pasado','rock','piedra','m'],['Poder Reserva','psychic','bola','m'],['Poltergeist','ghost','embestida','l'],['Polución','poison','polvo','m'],
  ['Polvo Veneno','poison','polvo','m'],['Premonición','psychic','lluvia','l','estrella'],['Prensa Metálica','steel','golpe','c'],['Presente','normal','bola','m','huevo'],
  ['Psicoataque','psychic','zona','l'],['Psicocarga','psychic','onda','m'],['Psicocolmillo','psychic','mordisco','c'],['Psicocorte','psychic','garra','c'],
  ['Psicoonda','psychic','onda','m'],['Psicorrayo','psychic','onda','m','arcoiris'],['Psicorruido','psychic','onda','m'],['Psíquico','psychic','zona','l'],
  ['Pulpocañón','water','chorro','m'],['Pulso de Campo','normal','bola','m'],['Pulso Dragón','dragon','bola','m','llama'],['Pulso Primigenio','water','rayo','l'],
  ['Pulso Umbrío','dark','bola','m'],['Puntapié','fighting','patada','c'],['Puño Bala','steel','golpe','c'],['Puño Cometa','normal','golpe','c'],
  ['Puño Dinámico','fighting','embestida','l'],['Puño Drenaje','fighting','golpe','c'],['Puño Fuego','fire','golpe','c'],['Puño Furia','ghost','golpe','c'],
  ['Puño Hielo','ice','golpe','c'],['Puño Incremento','fighting','golpe','c'],['Puño Mareo','normal','golpe','c'],['Puño Meteoro','steel','embestida','l'],
  ['Puño Sombra','ghost','golpe','c'],['Puño Trueno','electric','golpe','c'],['Puya Nociva','poison','aguijon','c'],['Ráfaga Escamas','dragon','golpe','c'],
  ['Rayo','electric','rayo','l'],['Rayo Aurora','ice','onda','m','arcoiris'],['Rayo Burbuja','water','burbujas','m'],['Rayo Carga','electric','rayito','m'],
  ['Rayo Confuso','ghost','onda','m'],['Rayo Hielo','ice','rayo','l'],['Rayo Meteórico','rock','rayo','l'],['Rayo Señal','bug','onda','m'],
  ['Rayo Solar','grass','rayo','l'],['Represalia','normal','golpe','c'],['Resarcimiento','dark','golpe','c'],['Residuos','poison','lodo','m'],
  ['Resplandor','psychic','rayo','l'],['Restricción','normal','latigo','c'],['Retribución','normal','golpe','c'],['Roca Afilada','rock','lluvia','l','roca'],
  ['Rodar','rock','cuerpo','c'],['Rodillo de Púas','bug','golpe','c'],['Romperrocas','rock','rayo','l'],['Rueda Fuego','fire','cuerpo','c'],
  ['Salmuera','water','chorro','m'],['Salpicadura','normal','burbujas','m'],['Salpicar','water','propia','l'],['Saña','normal','embestida','l'],
  ['Semilladora','grass','semillas','m'],['Sentencia','normal','rayo','l'],['Sísmico','fighting','zona','l'],['Sofoco','fire','zona','l'],
  ['Sombra Vil','ghost','bola','m'],['Somnífero','grass','polvo','m'],['Sumisión','fighting','cuerpo','c'],['Superdiente','normal','mordisco','c'],
  ['Supersónico','normal','onda','m'],['Surf','water','propia','l'],['Tajo Acuático','water','golpe','c'],['Tajo Aéreo','flying','tornado','m','medialuna'],
  ['Tajo Cruzado','fighting','embestida','l'],['Tajo Umbrío','dark','garra','c'],['Taladradora','ground','picotazo','c'],['Telaraña','bug','polvo','m'],
  ['Tenaza','water','garra','c'],['Teraexplosión','normal','estrella','m'],['Terratemblor','ground','suelo','m'],['Terremoto','ground','propia','l'],
  ['Testarazo','rock','embestida','l'],['Tierra Viva','ground','suelo','m'],['Tijera X','bug','garra','c'],['Tinieblas','ghost','onda','m'],
  ['Torbellino','water','tornado','m'],['Tormenta Floral','grass','lluvia','l','hoja'],['Tornado','flying','tornado','m'],['Transformación','normal','estrella','m'],
  ['Treparrocas','normal','embestida','l'],['Triataque','normal','estrella','m','estrella'],['Triple Axel','ice','golpe','c'],['Triple Patada','fighting','patada','c'],
  ['Triturar','dark','mordisco','c'],['Trueno','electric','trueno','l'],['Tumba Rocas','rock','piedra','m'],['Ultrapuño','fighting','golpe','c'],
  ['Vaho Gélido','ice','tornado','m'],['Vasta Fuerza','psychic','bola','m'],['Vasto Impacto','dragon','golpe','c'],['Velocidad Extrema','normal','golpe','c'],
  ['Vendaval','flying','lluvia','l','pluma'],['Vendetta','dark','golpe','c'],['Veneno X','poison','garra','c'],['Ventisca','ice','lluvia','l','cristal'],
  ['Viento Aciago','ghost','tornado','m'],['Viento Cortante','normal','lluvia','l'],['Viento Feérico','fairy','tornado','m'],['Viento Hielo','ice','tornado','m'],
  ['Viento Plata','bug','tornado','m'],['Viraje','water','golpe','c'],['Voltio Cruel','electric','embestida','l'],['Voto Agua','water','chorro','m'],
  ['Voto Fuego','fire','bola','m','llama'],['Voto Planta','grass','bola','m'],['Voz Cautivadora','fairy','onda','m'],['Vozarrón','normal','propia','l'],
  ['Vuelo','flying','embestida','l'],['Zumbido','bug','rayo','l']
];
const MOVS_APR = `1 228,291,202.2,159.2,1.2,105.3,33.3,186.3/207,55,347.1,178.1,209.1,246.2,58.2,360.2/344,227,114,127,112.1,237.1,405.1,70.1;
2 228,291,202.2,159.2,1.2,105.3,33.3,186.3/207,55,246.2,58.2,178.2,360.2,209.2,135.2/344,227,114,127,112.1,237.2,136.3;
3 228,291,334.2,202.2,159.2,1.2,105.3,33.3/207,55,246.2,58.2,178.2,360.2,209.2,135.2/344,112,227,385,114,127,296.2,237.2;
4 95,25,169,195,109,175,35.1,256.1/32,181,287,170,130,300.1,14.1,318.1/222,139,216,42.1,136.1,91.1,78.1,233.2;
5 95,25,169,195,109,175,256.1,103.1/32,181,287,170,130,300.1,412.2,251.3/222,139,216,91.1,78.1,233.2,260.2,363.2;
6 35,95,25,103,169,195,109,175/32,181,371,287,170,130,300.1,14.2/222,260,139,216,91.1,78.1,416.2,233.2;
7 186,291,256,182,7.1,43.1,80.2,66.2/290,338,68,201,356.1,101.1,241.1,142.1/199,6,138,70,358.1,12.1,369.2,248.3;
8 186,291,256,182,7.1,43.1,80.2,66.2/290,338,68,201,241.1,384.2,356.2,141.2/199,6,138,70,358.1,369.2,12.2,248.3;
9 7,186,291,256,182,43.1,80.2,66.2/290,338,68,201,74,241.1,384.2,356.2/199,6,138,70,358.1,369.2,200.2,12.2;
10 282,291/133.3/282!embestida,133.3!embestida,291!embestida;
11 282.2/133.3/282.2!embestida,133.3!embestida;
12 282,291,184.2,213.2,5.2,16.2,186.3,169.3/386,408,371,313,101,14.2,343.2,149.2/417,400.2,48.2,405.3,114.3,127.3,204.3,344.3;
13 285,282/133.3/282!embestida,133.3!embestida,285!embestida;
14 282.2/133.3/282.2!embestida,133.3!embestida;
15 285,125,106,334,282,13,37,284/286,58.2,408.2,149.2,4.2,246.3,251.3,178.3/136,114.3,127.3,204.3,344.3,70.3,179.3;
16 35,291,39,184,157.1,17.1,281.1,186.2/386,371,87,14.1,251.2,299.2,47.3,404.3/405,400,19.1,266.1,416.2,114.2,127.2,34.2;
17 35,291,39,184,186.2,169.2,350.2,154.2/386,371,87,251.2,299.2,14.2,47.3,404.3/405,400,416.2,114.2,127.2,34.2,19.2,260.3;
18 35,291,39,184,186.2,169.2,350.2,154.2/386,371,87,251.2,299.2,14.2,47.3,404.3/405,34,400,260,416.2,114.2,127.2,204.2;
19 291,39,203,367,143,256,281,392/251.2,299.2,290.3,338.3,58.3,47.3,407.3,51.3/114,127,19.1,70.2,341.3,403.3,336.3,393.3;
20 291,39,195,203,367,143,256,103/251.2,299.2,290.3,338.3,58.3,47.3,407.3,51.3/114,127,204.2,70.2,19.2,179.2,341.3,403.3;
21 35,37,284,283,184,281,39.1,155.1/389.1,251.2,299.2,14.2,47.3,87.3,404.3/114,405.1,34.1,19.1,416.2,127.2,260.3;
22 35,37,284,283,39,184,281,374/251.2,389.2,299.2,14.2,47.3,87.3,404.3/114,34,405.2,416.2,127.2,204.2,19.2,179.2;
23 285,334,40,102,256,97.1,92.1,281.1/3,58,53,54,246.3,47.3,178.3,299.3/223,91.1,262.2,114.3,127.3,379.3,158.3,70.3;
24 285,334,40,102,256,392,96,94/3,58,53,54,246.3,47.3,178.3,299.3/223,262.2,114.3,127.3,204.3,379.3,158.3,70.3;
25 82,255,40,129,39,333.2,249.3,186.3/214,52,251,265.2,339.2,133.2,21.2,120.3/336,393,83,410,91,132.2,292.2,248.3;
26 333,82,255,40,39,249.3,186.3,188.3/214,52,251,265.2,339.2,133.2,21.2,120.3/336,393,83,91,132.2,410.2,248.3,114.3;
27 152,25,285,195,109,352,106,182/67,378,251,47.1,123.1,381.2,26.2,299.3/379,240,42.1,388.1,158.2,166.2,114.3,127.3;
28 152,25,285,103,195,109,352,106/67,378,251,47.1,123.2,381.2,26.2,286.3/379,240,158.2,166.2,114.3,127.3,204.3,362.3;
29 285,97,25,129,291,256,195,367/381,58.2,47.3,299.3,265.3,201.3/114.1,70.1,91.1,127.3,341.3,403.3,336.3,393.3;
30 285,97,25,129,291,256,195,367/381,58.2,290.3,338.3,47.3,299.3,265.3,201.3/280.3,114.3,127.3,341.3,403.3,336.3,393.3,70.3;
31 285,25,129,291,188,256,103,195/381,58.2,47.2,67.2,123.2,378.2,26.2,120.3/262,165,379.2,158.2,166.2,248.3,280.3,114.3;
32 285,334,129,104,37,291,284,92.1/381,101.1,58.2,47.3,299.3,265.3,201.3/280,114.1,359.1,91.1,380.1,127.3,341.3,403.3;
33 285,334,129,104,37,291,284,105.3/381,58.2,290.3,338.3,47.3,299.3,265.3,201.3/280,114.3,127.3,341.3,403.3,336.3,393.3,70.3;
34 285,334,129,104,37,291,284,103/381,58.2,47.2,67.2,123.2,378.2,26.2,120.3/262,359,247,379.2,158.2,166.2,248.3,280.3;
35 119,126,291,188,249.3,326.3,328.3,333.3/414,45,406,301,307.1,63.2,73.2,290.3/167,127,315,331,77.2,65.2,248.3,114.3;
36 119,126,291,249.3,326.3,328.3,333.3,186.3/414,45,406,301,307.1,63.2,73.2,290.3/167,127,315,331,77.2,65.2,248.3,114.3;
37 355,291,39,157,401,258.1,43.1,297.1/32,181,287,271,217,135.1,231.2,137.2/222,233,216,260.1,139.1,363.2,114.3,127.3;
38 355,291,39,258.1,43.1,186.3,188.3,152.3/32,181,271,217,231.2,137.2,383.3,251.3/222,233,216,260.2,363.2,139.2,114.3,127.3;
39 119,126,188,352,180,249.2,186.2,164.2/414,251.2,389.2,299.2,45.2,63.2,377.2,73.2/127,415,77,248.2,114.2,41.2,70.2,19.2;
40 119,126,188,180,249.2,186.2,164.2,169.2/414,251.2,389.2,299.2,45.2,63.2,377.2,73.2/127,415,77,248.2,114.2,204.2,41.2,70.2;
41 35,97,402,5,256,85,215,39.1/386,14,371,2,251,178.1,58.2,246.3/266.1,416.2,405.3,114.3,127.3,19.3,260.3;
42 35,97,402,5,256,39,85,392/386,14,371,2,251,58.2,246.3,178.3/416.2,266.2,405.3,114.3,127.3,204.3,19.3,260.3;
43 43.1,202.2,159.2,1.2,105.3,186.3,169.3,350.3/3,2,246,207,178,58.2,360.2,209.2/344,112,167,237.2,114.3,127.3;
44 43.1,202.2,159.2,1.2,105.3,186.3,169.3,350.3/3,2,246,207,178,58.2,360.2,209.2/344,112,385,167,237.2,114.3,127.3,48.3;
45 43.1,202.2,159.2,1.2,105.3,186.3,188.3,169.3/3,2,246,178,207.1,58.2,360.2,209.2/344,112,385,167,237.2,262.2,108.2,114.3;
46 85,106,382,25,195,109,282.1,13.1/2,178,135,313.1,246.2,360.2,55.2,149.2/344.2,114.3,127.3,70.3;
47 85,106,382,25,195,109,402,202.2/2,178,135,246.2,360.2,55.2,149.2,58.3/344.2,114.3,127.3,204.3,70.3,179.3;
48 85,97,291,71,282.1,293.2,192.2,64.2/343,149,313,246,101,178.1,58.2,53.2/417,315,114.3,127.3,344.3;
49 85,97,291,71,213.2,282.2,293.2,192.2/408,343,149,386,313,246,101,371/417,315,262.2,405.3,114.3,127.3,204.3,344.3;
50 152,25,195,109,215,186.1,218.1,157.1/47,381,54,378,300.1,67.2,123.2,26.2/379,158,240,42.1,19.1,114.3,127.3,351.3;
51 152,25,195,109,215,373,278.2,105.3/47,67,381,54,378,389,123.2,26.2/379,158,240,166.2,114.3,127.3,204.3,42.3;
52 25,195,109,256,157,373,43.1,105.2/120,251.2,299.2,377.2,290.3,338.3,47.3,407.3/77,91.1,220.1,114.2,127.2,70.2,19.2,415.2;
53 25,195,109,256,157,373,105.2,186.2/120,251,219,299.2,377.2,290.3,338.3,47.3/77,114.2,127.2,204.2,70.2,19.2,415.2,179.2;
54 25,195,71,80.2,66.2,198.2,409.2,249.3/290,68,201,313,101,54.1,338.2,384.2/199,369,6,341.1,315.1,372.1,305.1,12.2;
55 7,25,195,71,80.2,66.2,198.2,409.2/290,68,201,313,101,338.2,384.2,356.2/199,369,6,12.2,248.3,114.3,127.3,341.3;
56 190,272,25,195,281,213,345,278/47,264.2,120.3,251.3,299.3,394.3,55.3,24.3/362,372,0,359,70,136,42.1,324.2;
57 190,272,103,25,169,195,281,213/47,264.2,120.3,251.3,299.3,394.3,55.3,24.3/362,372,0,359,70,136,324.2,259.2;
58 355,95,256,218,392,345,129.1,188.1/32,287,181.1,170.3,251.3,47.3,130.3,299.3/222,260,139,114,136,77,232.1,140.1;
59 355,95,256,218,392,399,96,345/32,181.2,170.3,251.3,47.3,130.3,299.3,318.3/222,139,232,114,127,77,233.2,260.2;
60 119,126,188,272,143.1,80.2,66.2,198.2/290,338,68,123,381,54,201.1,49.1/199,127,12.1,369.2,114.3,341.3,403.3,315.3;
61 119,126,188,272,143.1,80.2,66.2,198.2/290,338,68,123,381,54,201.1,384.2/199,127,12.1,369.2,248.3,114.3,341.3,403.3;
62 366,235,119,126,188,143.1,272.2,103.2/290,338,68,123,381,201.1,384.2,264.2/199,324,165,127,12.1,369.2,362.2,0.2;
63 326.1,328.1,333.1,116.1,71.2,249.3,186.3,188.3/101.1,312.2,309.2,251.3,389.3,299.3,51.3,343.3/315.2,98.2,248.3,114.3,127.3,362.3,70.3,132.3;
64 311,71,249.3,326.3,328.3,333.3,186.3,188.3/313,101,309,383,312.2,397.2,251.3,389.3/315,305,98.2,248.3,114.3,127.3,362.3,70.3;
65 311,71,249.3,326.3,328.3,333.3,186.3,188.3/313,101,309,383,312.2,301.2,397.2,251.3/315,305,98.2,248.3,114.3,127.3,204.3,362.3;
66 190,366,272,395,236,193,118,113/264.2,47.3,299.3,394.3,24.3,378.3/362,324,372,165,0,127,42.1,259.2;
67 190,366,272,395,236,193,118,113/264.2,47.3,299.3,394.3,24.3,378.3/362,324,372,165,0,127,259.2,248.3;
68 190,366,272,103,395,236,193,118/264.2,47.3,299.3,394.3,279.3,24.3,378.3/362,324,372,165,0,127,259.2,248.3;
69 228,334,40,102,116,85.1,202.2,159.2/3,207,151,178.1,360.1,209.1,53.1,246.2/227,344.2,237.2,262.2,114.3,127.3;
70 228,334,40,102,116,202.2,159.2,1.2/3,207,151,246.2,58.2,178.2,360.2,209.2/227,344.2,237.2,262.2,114.3,127.3;
71 228,208,334,40,102,85,116,202.2/3,207,88,246.2,58.2,178.2,360.2,209.2/237,227,344.2,262.2,114.3,127.3,204.3,179.3;
72 285,334,102,349,182.1,116.1,80.2,66.2/3,290,338,68,201,356,53,151/199,369,262,12.1,223.2,114.3,127.3,341.3;
73 285,334,102,349,182.1,116.1,80.2,66.2/3,290,338,68,201,356,53,241/199,369,262,12.2,223.2,114.3,127.3,341.3;
74 352,291,249.1,43.1,152.2,278.2,326.3,333.3/224,47,279,24,378,300.2,394.2,123.2/379,42,240,351,114,127,41,153;
75 352,291,249.1,43.1,152.2,278.2,326.3,333.3/224,47,279,24,378,300.2,394.2,123.2/379,42,240,351,114,127,41,153;
76 352,249,291,111,353,43.1,152.2,278.2/224,47,279,24,378,300.2,394.2,123.2/379,42,240,351,114,127,41,153;
77 355,258,289,129,291,39,61,128/32,181,231.2,251.3,299.3/233,139,216,114,127,280.1,359.1,166.1;
78 355,258,289,129,37,291,39,61/32,181,231.2,120.3,251.3,299.3,26.3/233,139,216,280,114,127,247,222.2;
79 71,186,291,289.1,80.2,66.2,198.2,188.3/290,101,201,313.2,338.2,312.2,384.2,356.2/369,315,305.1,199.2,98.2,6.2,114.3,127.3;
80 71,289,186,291,80.2,66.2,100.2,198.2/290,101,201,313.2,338.2,312.2,384.2,356.2/369,315,305.1,199.2,98.2,12.2,6.2,248.3;
81 82,180,291,69.2,111.2,186.3,169.3,352.3/214,122,74,57,52,59,251,133.1/336,393,132,83,153.1,410.2,250.2,114.3;
82 82,180,291,69.2,111.2,186.3,169.3,352.3/214,122,74,57,52,59,251,389/336,393,132,83,410.2,250.2,114.3,127.3;
83 105,37,284,39,109,155,184,5/14,371,207,386.1,47.1,251.2,299.2,87.3/34,266,405.2,416.2,114.2,127.2,70.2,19.2;
84 35,37,284,283,39,169,143,128/389,251.2,299.2,14.2,377.2,47.3/359,19,276,34.1,266.1,416.2,114.2,127.2;
85 35,37,284,283,39,169,143,128/389,251.2,299.2,14.2,377.2,47.3/359,19,276,34.1,416.2,114.2,127.2,204.2;
86 80,66,7,186,40.1,284.1,229.1,409.2/290,356,337,407,147,201.1,343.1,76.1/6,114,127,341,280.1,91.1,199.2,369.2;
87 80,66,7,186,229.1,22.2,198.2,409.2/290,338,337,407,356,147,343,384.2/341,161,6,280,114,127,199.2,369.2;
88 119,229.1,332.1,329.1,334.2,326.3,328.3,333.3/303,347,58,47,123,54,53.1,364.1/223,262,153.1,114.3,222.3,336.3,393.3,41.3;
89 119,334.2,326.3,328.3,333.3,186.3,188.3,164.3/303,347,58,47,123,54,53.2,246.3/223,262,167,114.3,222.3,204.3,336.3,393.3;
90 376,100,291,125.1,182.1,22.1,80.2,66.2/290,384,356,337,76,147,338.1,201.1/199,341,114.1,369.2,127.3,403.3,41.3,153.3;
91 376,100,291,125,80.2,66.2,22.2,198.2/290,337,384,76,147,89,338.2,407.2/199,341,86,369.2,403.2,114.3,127.3,204.3;
92 229,215,401,326.1,328.1,333.1,334.2,186.3/383,303,51,217,320,312.1,58.2,404.2/98,153.1,223.2,262.2,302.2,336.3,393.3,315.3;
93 229,215,332,401,334.2,176.2,326.3,328.3/383,303,51,217,320,58.2,404.2,53.2/98,223.2,262.2,189.2,302.2,336.3,393.3,315.3;
94 229,215,332,401,334.2,176.2,249.3,326.3/383,303,51,217,320,58.2,404.2,53.2/98,223.2,262.2,189.2,302.2,248.3,114.3,127.3;
95 152,352,33,40,291,169,180,43.1/224,394,67,24,378,130,279.1,47.2/379,42,351,166,127,91,380.1,153.1;
96 71,119,186,311.1,326.1,328.1,333.1,249.3/313,101,309,312.2,301.2,397.2,314.2,383.3/315,98,305,248.3,114.3,127.3,362.3,70.3;
97 71,119,186,249.3,326.3,328.3,333.3,188.3/313,101,309,312.2,301.2,397.2,314.2,383.3/315,98,305,248.3,114.3,127.3,204.3,362.3;
98 100,9,40,289,43,175,152.1,109.1/290,338,68,356,123,300.1,384.2,201.2/242,197,239.1,369.2,114.3,127.3,341.3,403.3;
99 100,9,40,289,43,175,66.2,198.2/290,338,68,356,123,384.2,201.2,141.2/242,197,239,199.2,369.2,114.3,127.3,341.3;
100 82,291,352,180,186.3,169.3,221.3,350.3/214,339,52,59,251,241,265.2,133.2/336,83,41,153,393.2,132.2,410.2,114.3;
101 82,291,352,180,186.3,169.3,221.3,350.3/214,339,52,59,251,241,265.2,133.2/336,83,41,153,393.2,132.2,410.2,295.2;
102 71.2,202.2,159.2,186.3,164.3,169.3,221.3,352.3/313,2,246,101,178,271,360,60/344,315,19,237.1,98.2,114.3,127.3,41.3;
103 289,311.2,71.2,202.2,159.2,186.3,188.3,272.3/2,246,101,178,271,360,55,309/344,237,227,245,19,315.2,98.2,305.2;
104 278,186,169,155,143,345,129.1,69.1/210,211,47,38,300.1,381.2,378.2,26.2/359,127,70.1,42.1,379.2,158.2,248.3,114.3;
105 278,186,169,155,143,345,152.2,249.3/210,211,47,38,381.2,378.2,26.2,290.3/359,127,379.2,158.2,248.3,114.3,222.3,341.3;
106 129,273,272,218,118,113,321,291/264.1,142.2,251.3,47.3,299.3,394.3,378.3,377.3/276,277,0,274,248,362.2,324.2,165.2;
107 103,395,118,172,325,329,323,249/264,251,142.2,47.3,299.3,394.3,378.3,377.3/0,277.1,362.2,324.2,259.2,248.3,114.3,127.3;
108 33,40,289,291,102,196,229,352/151,3,378,299.2,317.2,290.3,338.3,47.3/359,127,179,227,240.1,12.1,239.1,248.2;
109 291,180,186.3,188.3,169.3,221.3,352.3,350.3/303,347,58,313.1,312.1,53.2,299.3,51.3/41,153,223.2,262.2,114.3,222.3,336.3,393.3;
110 291,180,128,186.3,188.3,169.3,221.3,352.3/303,347,58,313,53.2,299.3,51.3,265.3/41,153,260,223.2,262.2,114.3,222.3,204.3;
111 374,289,104,37,291,193,196,103.1/224,279,24,378,47.2,300.2,394.2,123.2/379,42,351,166,280,114,127,247;
112 374,289,104,37,291,103,392,193/224,279,24,378,47.2,300.2,394.2,123.2/379,42,351,166,280,114,127,247;
113 119,126,291,103.1,249.2,186.2,188.2,164.2/56,414,45,406,307.1,54.1,251.2,389.2/114,127,362.1,248.2,204.2,70.2,19.2,415.2;
114 228,33,40,349,116,128,43.1,143.1/2,246,178,135,101,300,151,53/227,237.1,344.2,114.3,127.3,204.3,70.3,179.3;
115 119,323,249,289,186,169,330,128/299.2,317.2,290.3,338.3,47.3,407.3,51.3,384.3/136,127.1,19.1,239.1,248.2,114.2,204.2,70.2;
116 80,43.1,66.2,198.2,409.2,186.3,169.3,350.3/290,338,68,201,356,130,87,318/199,12.1,405.1,136.1,369.2,114.3,127.3,341.3;
117 80,43.1,66.2,198.2,409.2,186.3,169.3,350.3/290,338,68,201,356,130,87,318/199,369.2,12.2,114.3,127.3,341.3,403.3,204.3;
118 80,104,37,284,39,43,188.1,66.2/201,313.1,47.1,343.1,123.1,290.2,338.2,384.2/280,247,199.1,6.1,70.1,369.2,12.2,114.3;
119 80,104,37,284,39,43,334,66.2/201,313,290.2,338.2,384.2,141.2,251.3,47.3/280,70,247,199.2,369.2,12.2,6.2,114.3;
120 291,182,180,80.2,66.2,409.2,186.3,169.3/290,338,356,313,251,312,219,337.1/199,369,315,114.3,127.3,341.3,403.3,336.3;
121 291,182,80.2,66.2,311.2,409.2,186.3,169.3/290,313,338,312,356,251,219,384.2/199,369,315,98.2,114.3,127.3,341.3,403.3;
122 71,119,126,249.3,326.3,328.3,333.3,186.3/313,101,312,63,209,407.1,309.2,301.2/315,305.1,98.2,248.3,114.3,127.3,204.3,362.3;
123 35,106,184,382,39,109,155,281/408,371,264,14.2,149.2,251.3,299.3,404.3/405,0,417.1,114.3,127.3,204.3,70.3,179.3;
124 328,22,29,119,126,188,229,311.2/101,257,151,45,312.2,407.2,76.2,309.2/403,315,359,341.2,98.2,305.2,248.3,114.3;
125 333,82,272,39,249.3,326.3,328.3,186.3/214,265,52,251,339.2,133.2,21.2,312.3/336,393,83,179,324.1,372.1,239.1,132.2;
126 326,355,291,272,157,395.1,258.2,187.2/32,181,287,303,137.2,312.3,47.3,299.3/222,233,212,204,324.1,372.1,260.2,363.2;
127 382,282,9,33,366,164,109,236/149.2,299.3,394.3,24.3,378.3/197,359,362,165,0.1,114.3,127.3,204.3;
128 289,104,291,169,281,401,71,143.1/299.2,377.2,407.3,51.3,384.3,394.3,265.3,201.3/114,359,127,179,171,136,280.2,204.2;
129 291,43,61.3/357.5/199.2;
130 80,33,291,256,169,43,392,94/384,201,356,170,87,290.2,338.2,141.2/199,6,400,359,204,136,369.2,12.2;
131 188,22.1,80.2,66.2,198.2,186.3,164.3,169.3/290,201,356,147,318,337.1,384.1,230.1/199,369,341,403,161,27.1,280.1,158.1;
132 387.5!golpe/387.5/387.5!embestida,387.5!embestida;
133 291,39,129,256,43.1,186.2,188.2,169.2/251,47.1,301.1,120.2,299.2,377.2,51.3,73.3/114,127,70.2,415.2,91.3;
134 129,291,256,39,80.2,66.2,198.2,409.2/290,68,201,337,251,338.2,384.2,356.2/199,12,6,114,127,369.2,341.3,403.3;
135 96,129,291,256,39,186.3,188.3,164.3/214,286,251,265.2,339.2,52.2,133.2,21.2/336,393,83,114,127,132.2,410.2,204.3;
136 95,129,291,256,39,169,258.2,93.2/32,181,303,251,231.2,137.2,120.3,47.3/222,233,139,212,114,127,260.2,363.2;
137 291,82,186.2,169.2,350.2,154.2,221.3,184.3/389,313,214,343,251.2,299.2,377.2,312.3/127,204,336,132,83,114.2,70.2,179.2;
138 352,33,104,256,349,40.1,116.1,80.2/290,224,300,279,356,89,123,338.1/199,369,42,12.1,342.2,114.3,127.3,341.3;
139 352,33,104,256,349,392,80.2,66.2/290,224,300,279,356,89,123,338.2/199,369,42,12.2,351.2,342.2,280.3,114.3;
140 7,198,25,85,109,152.1,43.1,182.1/224,300,356,2,246,123,151,338.1/199,42,351,114.1,369.2,342.2,127.3,341.3;
141 7,198,25,85,109,106,373,80.2/224,300,356,2,246,123,151,290.2/199,42,351,369.2,6.2,342.2,405.3,248.3;
142 35,256,392,96,94,95,69,17.1/224,300,130.1,14.2,394.2,279.2,24.2,170.3/416,42,351,114,204,179,34.2,400.2;
143 186,291,188,43,196,256,229,352/378,120.2,299.2,317.2,377.2,290.3,338.3,312.3/127,204,179,165,239,166,158.1,248.2;
144 284,184.2,22.2,390.2,16.2,288.2,186.3,169.3/386,257,147,230,241,300,407.2,14.2/341,403,34,161,400,416.2,266.2,405.3;
145 284,283,184.2,5.2,16.2,186.3,169.3,17.3/214,300,14.2,265.2,339.2,52.2,21.2,251.3/336,393,34,132,83,416.2,266.2,410.2;
146 35,284,184.2,258.2,5.2,16.2,93.2,186.3/386,32,181,371,300,14.2,231.2,137.2/222,34,260,363,400,232,344,416.2;
147 90,40,102,399.1,7.1,398.2,335.2,33.3/170,87,130.1,318.1,201.1,290.3,338.3,181.3/136,78,204,6,91.1,99.2,114.3,127.3;
148 90,40,102,398.2,335.2,33.3,186.3,188.3/170,87,130.2,318.2,290.3,338.3,181.3,251.3/136,78,204,6,99.2,280.3,114.3,127.3;
149 35,90,326,333,40,102,399,7/170,87,130.2,14.2,371.2,318.2,290.3,338.3/136,78,400,204,6,416.2,99.2,405.3;
150 311,71.2,249.3,326.3,328.3,333.3,186.3,188.3/313,101,312,251,300,142,309.2,301.2/315,305,261,98.2,248.3,114.3,127.3,222.3;
151 119,249,311.2,71.2,310.2,326.3,328.3,333.3/101,312,251,300,142,313.2,309.2,301.2/315,98.2,305.2,405.3,416.3,248.3,280.3,114.3;
152 291,188,228.1,103.1,43.1,202.2,159.2,1.2/207,178,209,300.1,151.1,360.2,55.2,135.2/344,237.1,108.2,114.3,127.3,91.3;
153 291,188,228.1,103.1,43.1,202.2,159.2,1.2/207,178,209,300.1,360.2,55.2,135.2,413.2/344,237.2,108.2,114.3,127.3,91.3;
154 291,188,228.1,103.1,43.1,202.2,159.2,1.2/207,178,209,300.1,360.2,55.2,135.2,413.2/344,112,385,296.2,237.2,108.2,114.3,127.3;
155 355,258,291,39,352,129.1,366.1,195.1/32,251,287.1,271.1,181.2,412.2,137.2,47.3/222,148,363,212,216,232,127,139.1;
156 355,258,291,39,352,129.1,218.1,95.2/32,251,271.1,181.2,412.2,137.2,47.3,299.3/222,148,363,212,216,232,127,233.2;
157 355,258,291,39,352,180,129.1,218.1/32,251,271.1,181.2,412.2,137.2,383.3,47.3/222,148,363,212,216,232,127,233.2;
158 25,256,272,169,109,43,392,94/290,47,201.1,300.1,384.2,141.2,411.2,11.2/199,6,359,165,405.1,42.1,369.2,12.2;
159 25,256,272,169,109,43,392,94/290,47,300.1,384.2,201.2,141.2,411.2,11.2/199,6,359,165,369.2,12.2,248.3,114.3;
160 25,256,272,169,109,43,392,94/290,47,300.1,384.2,201.2,141.2,411.2,11.2/199,6,359,165,369.2,200.2,12.2,248.3;
161 25,40,291,39,195,218,109.1,281.1/251.2,299.2,377.2,47.3,51.3,384.3,265.3,201.3/127,415,91.1,114.2,19.2,222.3,369.3,341.3;
162 25,40,39,195,218,109.1,105.2,186.2/251.2,299.2,377.2,47.3,51.3,384.3,265.3,201.3/127,415,114.2,204.2,19.2,179.2,222.3,369.3;
163 291,284,71,35.1,157.1,350.2,154.2,184.2/371,101,271,383.1,251.2,299.2,14.2,377.2/114,19,98,167,34.1,400.1,416.2,127.2;
164 291,284,71,35.1,188.2,350.2,154.2,184.2/371,101,271,383.1,251.2,299.2,14.2,377.2/114,34,19,98,167,416.2,127.2,204.2;
165 323,291,395,282.1,103.1,330.1,116.1,325.1/408,371,149,251,313.1,14.2,4.2,178.3/417,127,344.3,324.3,19.3;
166 323,291,395,184.2,213.2,282.2,5.2,249.3/408,371,149,251,14.2,4.2,178.3,299.3/417,127,204.3,344.3,324.3,19.3,259.3,179.3;
167 285,85,334,402,349,195,125.1,293.1/286,4,2,383,364,343.1,59.1,313.1/315,247.1,417.2,262.2,127.3,344.3,220.3;
168 285,85,334,402,282,13,349,195/286,4,2,383,364,58.2,343.2,53.2/315,247.1,417.2,262.2,127.3,204.3,344.3,179.3;
169 35,97,402,5,256,85,215,184.2/386,14,371,2,251,58.2,178.3,299.3/416.2,34.2,266.2,400.2,127.3,204.3,19.3,260.3;
170 82,43,80.2,66.2,198.2,409.2,350.3,154.3/290,338,68,52,343,384.1,265.1,201.1/199,83,114,369.2,336.2,393.2,132.2,12.2;
171 82,43,80.2,66.2,198.2,409.2,350.3,154.3/290,338,68,52,343,201.1,313.1,384.2/199,83,114,369.2,336.2,393.2,132.2,12.2;
172 82,255,39,333.1,126.1,43.1,218.1,249.3/214,251,307.1,414.1,265.2,339.2,52.2,133.2/336,393,91,292.1,132.2,410.2,248.3,114.3;
173 119,291,249.3,186.3,188.3,103.3,152.3,352.3/414,45,406,209,307.1,301.1,63.2,73.2/167,127,315,77.2,248.3,222.3,362.3,344.3;
174 119,157.1,352.1,249.2,186.2,188.2,350.2,154.2/414,307.1,251.2,299.2,45.2,63.2,377.2,73.2/248.2,114.2,127.2,19.2,415.2,77.2,222.3,362.3;
175 119,291,284.1,184.1,249.3,186.3,188.3,103.3/45,406,300,271,307.1,301.1,63.2,251.3/167,127,305.1,77.2,248.3,222.3,362.3,344.3;
176 119,291,184.2,16.2,249.3,186.3,188.3,103.3/14,371,45,406,300,271,209,63.2/167,127,416.2,34.2,77.2,248.3,222.3,204.3;
177 284,283.1,71.1,39.1,157.1,17.1,184.2,16.2/301,383,404,14.2,371.2,309.2,397.2,251.3/315,305,98.2,34.2,127.3,344.3,260.3;
178 284,184.2,71.2,16.2,221.3,17.3,350.3,154.3/371,301,383,404,14.2,309.2,397.2,251.3/315,305,416.2,98.2,34.2,127.3,204.3,344.3;
179 291,188.1,186.3,152.3,350.3,154.3,143.3,1.3/214,339,52,343,219,63,133.1,265.2/393,83,114,336.1,91.1,132.2,410.2,127.3;
180 291,333.2,249.3,326.3,328.3,186.3,188.3,272.3/214,339,52,343,219,63,265.2,133.2/393,83,114,336.2,132.2,410.2,248.3,127.3;
181 333,326,291,249.3,328.3,186.3,188.3,272.3/214,339,52,343,318,219,63,265.2/393,132,83,114,336.2,410.2,295.2,248.3;
182 208,43.1,202.2,159.2,1.2,105.3,350.3,154.3/2,246,178,209,3,207.1,360.2,55.2/344,112,237,385,167,108.2,127.3,204.3;
183 40,291,352,61,7.1,188.1,80.2,66.2/290,338,68,307.1,384.2,201.2,141.2,414.2/199,6,77,127,165,12.1,305.1,369.2;
184 40,291,352,61,80.2,66.2,198.2,249.3/290,338,68,384.2,201.2,141.2,414.2,45.2/199,6,77,127,165,369.2,12.2,65.2;
185 352,40,291,272,103,43,157,186.1/224,394,67.1,279.2,219.2,24.2,47.3,299.3/42,351,380,127,239,245,41.1,342.2;
186 119,126,188,61,143.1,80.2,66.2,198.2/290,338,123,381,201.1,384.2,141.2,11.2/199,127,415,12.1,369.2,248.3,114.3,341.3;
187 61,5,291,213,184.2,202.2,1.2,186.3/2,246,178,360,406,55.1,120.1,101.1/127.1,344.2,237.2,114.3,48.3;
188 61,5,291,213,184.2,202.2,1.2,186.3/2,246,178,360,406,209.2,55.2,135.2/344.2,237.2,114.3,127.3,48.3;
189 61,5,291,213,184.2,202.2,1.2,186.3/2,246,178,360,406,209.2,55.2,135.2/344.2,237.2,114.3,127.3,204.3,179.3,48.3;
190 25,39,195,128,215,126.1,40.1,297.1/251,54,299.2,377.2,47.3,51.3,123.3,265.3/127,91,248.2,114.2,19.2,362.3,344.3,336.3;
191 291,143,202.2,1.2,105.3,350.3,154.3/2,246,207,178,55,360.2,209.2,135.2/344,127,237.2,114.3,19.3;
192 119,291,143,202.2,159.2,1.2,105.3,350.3/2,246,207,178,360,55,209.2,135.2/344,112,237,385,127,114.3,204.3,19.3;
193 35,184,213,282,291,39,281,85.1/386,14,408,371,59,251,300,343.1/417,19,127.1,114.3,344.3,315.3,98.3;
194 40,129.1,188.1,103.1,329.1,152.2,80.2,66.2/290,123,54,300.1,53.1,47.2,384.2,201.2/379,12,6,199.2,369.2,114.3,127.3,341.3;
195 40,152.2,80.2,66.2,278.2,198.2,249.3,328.3/290,123,54,47.2,384.2,201.2,381.2,141.2/379,12,6,199.2,369.2,166.2,248.3,114.3;
196 291,256,39,71.2,310.2,105.3,186.3,188.3/313,101,251,309.2,301.2,397.2,314.2,120.3/315,305,114,127,98.2,204.3,132.3,91.3;
197 256,157,281,291,39,221.2,392.2,401.2/320,18,251,120.3,47.3,299.3,51.3,301.3/220,114,127,204.3,315.3,98.3,132.3,91.3;
198 35,284,157,281,184,373,215,283.1/386,14,320,371,18,383,251.3,47.3/220,34.1,266.1,416.2,400.2,114.3,127.3,204.3;
199 71,186,291,80.2,66.2,100.2,198.2,249.3/290,101,201,299,219,313.2,384.2,356.2/369,315,305.1,199.2,98.2,12.2,6.2,248.3;
200 215,401,186.3,221.3,350.3,154.3,184.3,202.3/51,364,217,313,101,312,271,219/189.2,302.2,127.3,204.3,336.3,393.3,315.3,98.3;
201 299!golpe/299/299!embestida,299!embestida;
202 103/241/254.5;
203 289,291,71,128,392,215,310.1,129.1/313,101,226,241.1,251.2,299.2,309.2,301.2/315,405.1,114.1,305.1,19.1,127.2,204.2,98.2;
204 282,291,352,182,180,401,103.1,43.1/286.1,251.1,67.1,149.2,178.3,299.3,394.3,279.3/114,127,41,153,417.2,344.3,379.3,42.3;
205 180,282,111,291,352,182,401,69.2/122,343.2,74.2,149.2,251.3,178.3,299.3,394.3/114,127,41,153,132,417.2,250.2,204.3;
206 188,169,43,143,152,352,281,374/47,300,371,217.1,299.2,317.2,377.2,51.3/114,127,205,78,42.1,6.1,204.2,19.2;
207 184,5,285,39,109,157,106,116/47,54,67.1,123.2,381.2,378.2,251.3,58.3/379,197,242,405.1,127.1,388.1,166.2,114.3;
208 152,180,33,40,291,169,352,392/67,378,224,130,394,24,47.2,381.2/91,166,127,42,351,379.2,250.2,20.2;
209 186,291,256,169,229,392,401,96/307.1,63.2,58.3,47.3,299.3,51.3,265.3,201.3/77,114,127.1,0.1,248.3,222.3,362.3,344.3;
210 186,291,256,169,229,392,401,96/307.1,63.2,58.3,47.3,299.3,51.3,394.3,265.3/77,114,136,248.3,127.3,222.3,204.3,362.3;
211 285,334,291,352,118,13,7.1,253.1/290,68,356,286,338.1,201.1,53.1,343.1/199,6,114,41.1,369.2,223.2,262.2,127.3;
212 106,175,382,322,69,35,39,109/408,371,74.2,149.2,251.3,299.3,14.3,67.3/405,0,417.2,250.2,114.3,127.3,204.3,165.3;
213 352,282,102,349,116.1,192.2,33.3,186.3/224,149,279.1,4.1,3.1,47.1,67.1,300.2/42,351,342.2,127.3,379.3,262.3,20.3;
214 103,218,193,113,134,104,37,291/286,360,279.1,264.2,149.2,299.3,394.3,24.3/247,0,114,359,127,362.1,417.2,259.2;
215 157,25,39,195,109,175,334,328.1/407,147,251,76.2,320.2,18.2,47.3,299.3/403,86.1,341.2,220.2,248.3,114.3,127.3,369.3;
216 25,291,195,109,229,157,401,196.1/378,251.2,299.2,377.2,47.3,394.3,55.3,24.3/359,127,77,166,114.1,362.1,372.1,0.1;
217 25,291,195,109,229,157,401,249.2/378,251.2,299.2,377.2,47.3,394.3,55.3,24.3/359,127,239,77,166,248.2,114.2,204.2;
218 188,352.1,258.2,187.2,93.2,350.3,193.3,154.3/32,287,224,303,300,381,181.2,47.3/222,212,42,260.1,216.1,233.2,363.2,114.3;
219 188,352.1,258.2,187.2,93.2,164.3,350.3,193.3/32,224,300,287,303,381,181.2,394.2/222,42,212,216.1,233.2,260.2,363.2,139.2;
220 291,43,22.1,188.1,256.1,152.2,94.2,278.2/257,47,407,147,54,378,300,76.1/403,379,86,166,114,127,158.1,42.1;
221 94,104,37,291,284,43,256.1,152.2/257,47,407,147,54,378,300,230.1/403,379,86,166,114,359,127,158.1;
222 291,43,198.1,352.2,186.3,188.3,164.3,152.3/290,338,68,300,279,356,219,89/42.1,380.1,199.2,369.2,351.2,342.2,127.3,341.3;
223 43.1,80.2,66.2,221.3,350.3,154.3,61.3/290,338,68,201,313,337,343,360/199,341,204,358.1,369.2,127.3,222.3,403.3;
224 102,349,80.2,66.2,198.2,33.3,221.3,350.3/290,338,68,316,201,313,337,343/199,341,204,223,369.2,127.3,222.3,403.3;
225 283,328.1,103.1,39.1,182.1,184.2,61.2,22.2/307,337.1,407.1,49.1,147.1,230.1,14.2,76.2/305.1,416.2,341.2,403.2,34.2,266.2,248.3,114.3;
226 35,184,61,186,291,40.1,80.2,66.2/290,338,68,201,371,313,343,360/199,114,127,42.1,369.2,6.2,400.2,341.3;
227 35,284,283,17,175,37,109,401/14,371,251,74.2,47.3,407.3,299.3,87.3/266,34.1,416.2,400.2,250.2,114.3,127.3,204.3;
228 256,157,392,401,95,258,346,281.1/32,303,181.1,320.2,18.2,137.2,251.3,58.3/222,220,216,233.2,260.2,363.2,139.2,114.3;
229 256,157,392,401,95,258,346,96/32,303,181.2,320.2,18.2,137.2,251.3,58.3/222,220,216,233.2,260.2,363.2,139.2,114.3;
230 43.1,80.2,66.2,198.2,398.2,335.2,409.2,186.3/290,338,68,130,87,384,201,356/199,138,369.2,136.2,12.2,99.2,114.3,127.3;
231 40,291,43,352,188.1,103.1,143.1,111.1/378,47.1,290.1,300.1,147.1,67.2,123.2,381.2/114,127,158.1,166.1,380.1,77.1,379.2,42.3;
232 278,40,104,37,291,43,352,182/378,394,47.2,67.2,123.2,381.2,299.3,300.3/379,240,114,127,179,166.2,204.3,42.3;
233 291,350.2,154.2,221.3,184.3,71.3/389,313,214,343,251.2,299.2,377.2,407.3/204,132,83,114.2,127.2,179.2,341.3,403.3;
234 289,291,215,71,293,30,169.1,129.1/101,271,251.2,299.2,377.2,313.3,47.3,51.3/114,127,276,359.1,247.1,204.2,19.2,179.2;
235 //;
236 291,103.1,395.1,281.1,182.1,322.1,272.2,193.2/264.1,251.3,47.3,299.3,378.3,377.3/277.1,362.2,248.3,114.3,127.3,379.3,42.3,19.3;
237 273,103,391,118,291,152,39,281/264.1,251.3,47.3,299.3,87.3,378.3,377.3/0,277.1,362.2,259.2,248.3,114.3,127.3,379.3;
238 328,22,29,119,229,71.2,249.3,188.3/101,257,407.2,309.2,301.2,396.2,47.3,299.3/403,315,341.2,98.2,248.3,127.3,362.3,324.3;
239 333,82,272,39,190.1,326.1,328.1,273.1/214,265,52,251,339.2,133.2,47.3,299.3/336,393,83,324.1,372.1,239.1,132.2,410.2;
240 326,355,291,272,157,190.1,249.1,333.1/32,181,287,303,137.2,47.3,299.3,53.3/222,233,212,139.1,324.1,91.1,372.1,260.2;
241 289,186,291,188,352,180,71,330.1/307.1,299.2,47.3,407.3,51.3,384.3,394.3,265.3/77,166,127.1,362.1,239.1,248.2,204.2,179.2;
242 119,126,291,249.2,186.2,188.2,164.2,350.2/56,414,45,406,307.1,251.2,389.2,299.2/114,127,362.1,248.2,204.2,19.2,415.2,179.2;
243 82,96,256,39,392,399,105.3,186.3/214,271,265.2,339.2,52.2,133.2,21.2,251.3/393,132,83,336.2,410.2,295.2,114.3,127.3;
244 355,95,289,256,392,399,258.2,105.3/32,181,271,251.3,47.3,299.3,51.3,378.3/222,233,163,148,212,260.2,363.2,139.2;
245 256,392,399,94,80.2,66.2,198.2,105.3/290,338,201,386,337,241,271,384.2/199,369,403,161,114.3,127.3,341.3,204.3;
246 278,291,256,392,401,196,289.1,281.1/224,24,320,300.1,47.2,394.2,67.2,123.2/379,42,351,359,204,136.1,91.1,114.3;
247 278,291,256,392,401,196,152.2,186.3/224,24,320,47.2,300.2,394.2,67.2,123.2/379,42,351,359,204,166.2,114.3,127.3;
248 256,392,401,291,96,94,95,196/224,320,24,300.2,394.2,279.2,219.2,18.2/42,351,359,204,379,179,220.2,248.3;
249 184.2,71.2,5.2,16.2,186.3,188.3,164.3,80.3/386,271,251,300,14.2,371.2,309.2,314.2/34,8,305,199,78,416.2,315.2,98.2;
250 184.2,258.2,16.2,188.3,164.3,17.3,350.3,193.3/386,251,300,271,181.2,14.2,371.2,231.2/233,34,163,363,266,232,305,416.2;
251 208.2,311.2,71.2,202.2,159.2,105.3,350.3,154.3/101,209,300,178.2,55.2,135.2,397.2,251.3/305,237,344.2,315.2,98.2,108.2,127.3,204.3;
252 160,119,40,39,281,143,129.1,109.1/2,246,178,135,360.1,209.1,130.1,55.2/237,405.1,344.2,248.3,114.3,127.3,362.3,42.3;
253 208,160,119,40,39,155,106,281/2,246,178,135,130.1,360.2,209.2,55.2/237,344.2,108.2,248.3,114.3,127.3,362.3,42.3;
254 208,160,119,40,39,155,106,281/2,246,178,135,130.1,360.2,209.2,55.2/237,344.2,296.2,108.2,248.3,114.3,127.3,204.3;
255 258,25,284,39,109,218,184,61/32,181,287,412.2,251.3,47.3,299.3,394.3/222,139,42.1,233.2,260.2,363.2,248.3,114.3;
256 129,218,275,172,258,25,284,39/32,181.2,264.2,412.2,251.3,47.3,299.3,394.3/222,139,362.2,233.2,324.2,260.2,363.2,0.2;
257 326,129,218,275,172,258,25,284/32,181.2,142.2,264.2,412.2,251.3,47.3,299.3/222,277,0,139,266,362.2,233.2,324.2;
258 291,193,143,289.1,256.1,103.1,22.1,80.2/290,384,201,224,47,347.1,241.1,300.1/199,369,114,42,127.1,19.1,12.2,6.2;
259 291,193,143,289.1,256.1,103.1,152.2,80.2/290,47,123,201,54,224,347.1,241.1/199,369,379,12,114,42,127.1,6.2;
260 291,193,143,289.1,256.1,103.1,152.2,80.2/290,47,123,201,54,224,347.1,241.1/199,369,379,12,114,42,239,127.1;
261 256,221,392,186,291,97.1,215.1,96.1/47,320.2,18.2,299.3,51.3,377.3/114,77,220.2,127.3,91.3,19.3,415.3;
262 256,221,392,186,291,96,94,95/18,47,320.2,299.3,51.3,377.3/114,77,220.2,127.3,204.3,91.3,19.3,415.3;
263 186,291,43,399.1,281.1,105.2,188.2,367.2/286,47.1,251.2,299.2,407.3,51.3,384.3,123.3/114,127,388.1,415.2,369.3,341.3,403.3,336.3;
264 186,291,195,109,43,105.2,188.2,164.2/286,251.2,299.2,47.3,407.3,51.3,384.3,123.3/114,127,77,204.2,415.2,179.2,369.3,341.3;
265 282,291,285/133.3/282!embestida,133.3!embestida,291!embestida;
266 291,285,282.2/133.3/282.2!embestida,133.3!embestida,291!embestida;
267 85,282,291,285,169,184.2,213.2,5.2/386,14,408,371,2,246,178,343.2/417,127.3,204.3,344.3,315.3,179.3;
268 291,285,282.2/133.3/282.2!embestida,133.3!embestida,291!embestida;
269 285,85,282,291,213.2,221.3,350.3,154.3/408,386,313,101,271,58.2,343.2,149.2/417,127.3,204.3,344.3,315.3,179.3;
270 43,215,71,103.1,202.2,159.2,1.2,186.3/290,338,2,246,68,178,135,207.1/369.2,344.2,12.2,114.3,127.3,341.3,403.3,19.3;
271 195,221,43,116,215,71,103.1,80.2/290,338,2,246,68,178,135,207.1/199,19,369.2,344.2,12.2,248.3,114.3,127.3;
272 195,43,116,215,71,103.1,80.2,66.2/290,338,2,246,178,135,207.1,384.2/199,369.2,344.2,12.2,237.2,248.3,114.3,127.3;
273 186,291,352,215,401,39.1,155.1,373.1/2,246,360.1,178.2,209.2,55.2,135.2,299.3/153,405.1,114.1,220.1,344.2,237.2,127.3,41.3;
274 157,208,401,119,291,352,215,373.1/2,246,207,14,271,178.2,360.2,209.2/405,153,114.1,344.2,237.2,220.2,108.2,248.3;
275 157,208,401,119,291,352,215,373.1/2,246,207,88,14,271,178.2,360.2/237,153,400,114.1,344.2,220.2,385.2,108.2;
276 35,284,39,143,184,218,169.1,17.1/371,251.2,299.2,14.2,47.3,87.3,404.3/266,34.1,400.1,150.1,416.2,127.2,260.3;
277 35,284,39,143,184,218,350.2,154.2/371,251.2,299.2,14.2,47.3,87.3,404.3/266,416.2,127.2,204.2,34.2,179.2,260.3;
278 35,184,39,281,116.1,80.2,5.2,198.2/290,14,201,371,386.1,356.1,87.1,384.2/400,416.2,199.2,369.2,34.2,12.2,266.2,114.3;
279 35,39,401,80.2,184.2,5.2,198.2,16.2/290,201,356,371,384.2,14.2,141.2,11.2/199,400,416.2,369.2,34.2,12.2,266.2,114.3;
280 116.1,71.2,249.3,326.3,328.3,333.3,186.3,188.3/313,101,301,414,45,209,364.1,231.1/315,98,305,248.3,127.3,336.3,415.3;
281 71.2,249.3,326.3,328.3,333.3,186.3,188.3,221.3/313,101,301,414,45,209,309.2,63.2/315,98,305,248.3,127.3,204.3,336.3,415.3;
282 71.2,249.3,326.3,328.3,333.3,186.3,188.3,221.3/313,101,301,414,45,63,209,142/315,98,305,167,65.2,248.3,127.3,204.3;
283 7,39,282.1,13.1,293.1,80.2,85.2,198.2/290,338,68,343.1,313.1,123.1,201.2,141.2/199.1,369.2,417.2,114.3,127.3,341.3,403.3,344.3;
284 39,7,85.2,184.2,213.2,282.2,5.2,293.2/386,14,408,371,290,338,68,178/417,400.2,114.3,127.3,199.3,369.3,341.3,403.3;
285 186,291,155.1,325.1,202.2,188.3,350.3,154.3/2,246,178,55,360.1,209.2,135.2,251.3/344.2,114.3,127.3,223.3;
286 103,395,113,172,268,325,186,291/2,246,178,55,360.2,209.2,264.2,135.2/324,362.2,344.2,165.2,0.2,259.2,237.2,248.3;
287 25,186,43,196,103,157,191,188.1/299.2,377.2,47.3,407.3,51.3,394.3,123.3,265.3/77,239.1,248.2,114.2,127.2,222.3,341.3,403.3;
288 25,186,195,109,43,196,103,218/299.2,377.2,47.3,407.3,51.3,394.3,123.3,265.3/19,77,248.2,114.2,127.2,415.2,388.2,222.3;
289 25,186,195,109,43,196,103,218/299.2,377.2,47.3,407.3,51.3,394.3,123.3,265.3/248,19,239,77,114.2,127.2,204.2,415.2;
290 152,85,25,195,155,175,282.1,43.1/47,2,408.1,386.1,149.2,178.3,299.3,51.3/417.1,127.3,344.3;
291 85,106,184,382,282,25,152,195/2,47,14.2,408.2,371.2,149.2,251.3,178.3/417.2,127.3,204.3,344.3,19.3,179.3;
292 85,176,25,152,195,155,175,106.2/51,364,2,47,217.2,149.2,178.3,299.3/189,417.2,302.2,127.3,204.3,344.3,98.3,179.3;
293 119,289,215,143.1,235.1,249.2,186.2,188.2/271.1,414.1,299.2,47.3,407.3,51.3,265.3,201.3/19,415,114.1,239.1,248.2,127.2,222.3,341.3;
294 119,289,256,215,249.2,186.2,188.2,164.2/299.2,47.3,407.3,51.3,394.3,265.3,201.3,24.3/19,415,248.2,127.2,222.3,341.3,403.3,362.3;
295 119,289,256,392,215,96,94,95/299.2,317.2,47.3,407.3,51.3,384.3,394.3,265.3/204,19,415,150,248.2,127.2,179.2,388.2;
296 218,236,134,268,291,116,111,103.1/264.2,251.3,47.3,299.3,384.3,394.3,123.3,24.3/362,0,324.1,372.1,165.2,259.2,248.3,114.3;
297 218,236,134,268,291,116,111,272.2/356,264.2,251.3,47.3,299.3,384.3,394.3,123.3/362,0,28,324.2,165.2,259.2,248.3,114.3;
298 40,61,188.1,7.1,186.2,350.2,154.2,80.3/290,338,68,307.1,251.2,299.2,45.2,377.2/12.1,114.2,127.2,19.2,415.2,369.3,341.3,403.3;
299 291,82,352.1,326.3,328.3,333.3,186.3,188.3/224,279,219,381,300.2,394.2,24.2,47.3/42,351,132,83,380.1,127.1,153.1,240.1;
300 126,291,195,154,157,401,71.1,186.2/414,54.1,251.2,299.2,47.3,407.3,51.3,265.3/127,77,19.1,415.2,341.3,403.3,344.3,336.3;
301 126,291,195,154,401,186.2,188.2,164.2/414,251.2,299.2,47.3,407.3,51.3,265.3,201.3/127,77,204.2,19.2,415.2,179.2,341.3,403.3;
302 157,116,215,176,25,195,71,221.2/383,51,364,219,320.2,404.2,217.2,18.2/220,189.2,302.2,248.3,114.3,127.3,204.3,362.3;
303 69,9,256,157,392,215,40.1,155.1/406,300.1,74.2,45.2,58.3,47.3,407.3,299.3/77,362.1,250.2,248.3,127.3,222.3,341.3,204.3;
304 175,69,111,186,291,289.1,188.1,218.1/394,47,300.2,299.3,265.3,201.3,381.3,378.3/42,91,114,127,380.1,165.1,78.1,250.2;
305 175,69,111,186,291,352.2,105.3,188.3/394,47,300.2,279.2,299.3,67.3,265.3,201.3/42,91,114,127,351.2,250.2,20.2,379.3;
306 175,69,111,186,291,352.2,110.2,249.3/394,47,300.2,279.2,74.2,24.2,407.3,299.3/42,91,114,127,351.2,250.2,20.2,342.2;
307 272,103,218,268,71,119,325.1,311.1/313,101,299,264.2,309.2,301.2,397.2,383.3/277,324.1,362.2,315.2,98.2,0.2,259.2,248.3;
308 272,103,218,268,71,119,326,328/313,101,299,142.2,264.2,309.2,301.2,397.2/277,274,362.2,315.2,98.2,324.2,0.2,259.2;
309 82,96,291,256,39,186.1,392.1,94.1/265,52.1,251.1,287.1,339.2,21.2,47.3,299.3/393,83,410,19.1,336.2,127.3,222.3,91.3;
310 82,96,291,256,39,95,186.3,188.3/265,339.2,52.2,21.2,251.3,47.3,299.3,343.3/393,83,410,336.2,127.3,222.3,204.3,91.3;
311 82,255,39,333.2,249.3,186.3,188.3,103.3/52,251,265.2,339.2,133.2,47.3,299.3,343.3/393,83,336.2,410.2,248.3,127.3,362.3,324.3;
312 82,255,39,333.2,249.3,186.3,188.3,103.3/52,251,265.2,339.2,133.2,47.3,299.3,343.3/393,83,336.2,410.2,248.3,127.3,362.3,324.3;
313 291,39,71,293.1,103.1,330.1,213.2,282.2/343,149,4,408.1,251.3,47.3,178.3,299.3/417,127,77,362.1,248.3,114.3,344.3,336.3;
314 291,39,71,213.2,282.2,192.2,64.2,249.3/149,4,408.1,251.3,47.3,178.3,299.3,51.3/417,77,248.3,114.3,127.3,362.3,344.3,336.3;
315 285,334,202.2,159.2,105.3,188.3,106.3,350.3/2,246,178,209,135,207.1,360.1,55.1/112,385,237.1,227.1,344.2,127.3,19.3;
316 119,334.2,326.3,328.3,333.3,186.3,188.3,103.3/347,58,53,151,303.1,47.1,178.3,299.3/223,98.1,262.2,114.3,127.3,341.3,344.3,41.3;
317 119,188,334.2,326.3,328.3,333.3,186.3,103.3/347,58,53,151,47.3,178.3,299.3,51.3/223,262.2,114.3,127.3,341.3,204.3,344.3,379.3;
318 256,392,7,198,169,97,94,310.1/201.1,356.1,251.1,300.1,384.2,320.2,141.2,18.2/114,199.1,359.1,127.1,369.2,341.3,403.3,19.3;
319 256,392,373,7,198,169,109,97/384.2,201.2,356.2,320.2,141.2,18.2,251.3,47.3/114,70,199.2,369.2,127.3,341.3,403.3,204.3;
320 66,188,352,215,61,111,71.1,80.2/290,384,201,356,141.2,407.3,299.3,394.3/199,358,359.1,127.1,158.1,369.2,341.3,403.3;
321 66,188,352,215,61,111,80.2,198.2/290,384,201,356,141.2,407.3,299.3,394.3/199,358,369.2,127.3,341.3,403.3,204.3,379.3;
322 355,291,289.1,188.1,352.1,69.1,111.1,152.2/32,381,287,378,54.1,300.1,181.2,47.2/222,379,240,212,114,127,260.1,233.2;
323 355,291,152.2,258.2,187.2,278.2,93.2,186.3/32,381,287,378,181.2,47.2,123.2,26.2/222,379,158,240,148,212,114,127;
324 355,188,43,182,258.2,187.2,93.2,186.3/32,181,303,287.1,300.1,137.2,58.3,47.3/222,260,148,212,216,379.1,158.1,70.1;
325 71,61,401,186.3,188.3,221.3,350.3,154.3/313,101,312,309,219,241.1,271.1,301.2/315,305.1,98.2,114.3,127.3,91.3,19.3;
326 71,61,401,249.3,326.3,328.3,333.3,186.3/313,101,312,309,219,301.2,397.2,314.2/315,98.2,305.2,248.3,114.3,127.3,204.3,362.3;
327 291,188,330,43,157,182.1,311.1,249.2/313,407.1,201.1,251.2,299.2,47.3,51.3,394.3/359,127,19,42.1,248.2,415.2,362.3,315.3;
328 152,256,157,392,215,39.1,43.1,106.1/47,67,381,378,123.1,386.1,343.1,26.2/379,158,204,42,165,114.3,127.3,344.3;
329 152,90,256,157,392,215,39.1,43.1/47,130,67,381,378,59,386.1,87.2/379,158,78,204,42,19,165,417;
330 152,174,90,256,157,392,215,39.1/47,130,67,381,378,59,386.1,87.2/379,158,136,78,204,42,19,165;
331 62,285,157,401,334,84,272.1,103.1/2,360,135,286,209.1,55.1,3.1,178.2/324.1,344.2,237.2,114.3,127.3,362.3,220.3;
332 157,62,401,84,285,118,334,221.2/2,360,135,286,178.2,209.2,320.2,55.2/344.2,237.2,220.2,248.3,114.3,127.3,204.3,362.3;
333 37,284,215,169.1,17.1,281.1,188.2,155.2/130,318,414,251.2,299.2,14.2,377.2,47.3/114,167,415.1,78.1,77.1,416.2,127.2,34.2;
334 284,37,215,184.2,174.2,5.2,398.2,16.2/130,318,414,87.2,14.2,181.3,251.3,47.3/34,400,114,167,416.2,136.2,266.2,99.2;
335 25,39,109,155,154,173,106,281/251.2,299.2,377.2,47.3,407.3,178.3,51.3,394.3/0,405.1,91.1,248.2,114.2,127.2,204.2,179.2;
336 97,92,334,102,256,229,392,373/58,151,53.2,251.3,47.3,178.3,299.3,320.3/91.1,223.2,262.2,114.3,127.3,222.3,204.3,379.3;
337 291,352.2,71.2,188.3,350.3,154.3,180.3,69.3/224,101,312,219,309,300.2,394.2,279.2/315,42,305,351,153,167,98.2,342.2;
338 71,291,352.2,188.3,350.3,154.3,180.3,69.3/224,101,312,181,300.2,394.2,279.2,309.2/315,42,351,344,153,139,98.2,342.2;
339 71,43.1,82.1,80.2,66.2,278.2,198.2,186.3/290,47,201,381,54,384.1,123.1,141.2/379,158,240,12,6,305,199.1,114.1;
340 71,80.2,66.2,278.2,198.2,186.3,188.3,164.3/290,47,201,381,54,384.2,67.2,123.2/379,158,240,12,6,359,305,199.2;
341 100,9,392,116,143,373,128,7.1/290,338,68,300.1,384.2,201.2,141.2,11.2/242,197,127.1,165.1,199.2,369.2,12.2,114.3;
342 392,116,373,100,9,143,128,7.1/290,338,68,251,300.1,384.2,201.2,320.2/242,197,127.1,199.2,369.2,12.2,114.3,341.3;
343 182,152.2,71.2,374.2,186.3,350.3,154.3,180.3/313,101,47,271,381,300,394,67.2/41,153,379.2,315.2,98.2,127.3,341.3,344.3;
344 182,152.2,71.2,374.2,186.3,164.3,350.3,193.3/313,101,47,271,381,300,394,67.2/204,41,153,379.2,315.2,98.2,305.2,127.3;
345 102,349,215,33.1,202.2,188.3,350.3,154.3/246,178,300,135,3,356,151,241.1/42.1,344.2,342.2,127.3;
346 102,349,215,202.2,33.3,186.3,188.3,164.3/246,178,300,135,3,356,151,394.2/344.2,42.2,227.2,351.2,342.2,127.3,204.3,379.3;
347 106,382,282,25,109,175,173,182.1/300,279,24,290,356,201.1,394.2,149.2/42.1,342.2,127.3;
348 106,382,282,25,109,175,173,105.3/300,279,24,290,356,394.2,149.2,47.3/42.2,351.2,342.2,127.3,204.3,362.3,379.3,91.3;
349 291,43,80.2,66.2,350.3,154.3,335.3/356.1,130.1,241.1,318.1,384.2,201.2,141.2,11.2/91.1,369.2,12.2,127.3,341.3,403.3;
350 291,102,43,90,80.2,66.2,409.2,33.3/290,201,87,414,130.1,241.1,384.2,356.2/199,369,6,12.2,114.3,127.3,341.3,403.3;
351 186,291,188.2,350.2,154.2,345.2,221.3,22.3/32,290,257,404.1,217.1,251.2,299.2,407.3/199,403,233,400,305.1,127.2,222.3,341.3;
352 25,33,195,109,229,221,157,215/313,300,364,251.2,299.2,47.3,407.3,51.3/220,248.2,127.2,222.3,341.3,403.3,362.3,344.3;
353 215,157,116,281.1,401.1,186.3,188.3,221.3/383,51,364,217,404.1,313.3,407.3,299.3/189,223.1,302.2,127.3,336.3,393.3,315.3,98.3;
354 157,116,176.2,186.3,188.3,221.3,350.3,154.3/383,51,364,217,404.2,313.3,47.3,407.3/189,302.2,127.3,204.3,336.3,393.3,315.3,98.3;
355 215,85,281,401,157.1,186.3,188.3,221.3/383,51,364,217,2,320,404.1,407.3/315,305,189.2,302.2,127.3,341.3,403.3,98.3;
356 215,332,326,328,333,33,85,281/383,51,364,217,2,320,404.2,47.3/315,305,189.2,302.2,248.3,127.3,341.3,403.3;
357 289,188,208.1,40.1,186.1,184.2,202.2,16.2/386,207,209,371,88,360.1,178.2,14.2/344,237,136,243,405.1,416.2,400.2,385.2;
358 291,102,215,71.2,33.3,352.3,350.3,154.3/101,312,271,301,404,313.2,309.2,397.2/315,114,127,19,98.1,305.1,415.3;
359 256,281,116,373,25,39,109,311/217.1,320.2,18.2,251.3,47.3,407.3,299.3,51.3/405,305,127.1,247.1,77.1,220.2,222.3,341.3;
360 103/241/254.5;
361 94,186,256,392,215,22.1,352.1,288.2/257,407,147,396,217.1,76.2,299.3,51.3/341,403,86,114.3,127.3;
362 94,186,256,392,215,22.2,288.2,188.3/257,407,49,147,396,230,76.2,299.3/341,403,161,86,114.3,127.3,204.3,379.3;
363 198,188,352,80.2,66.2,186.3,164.3,367.3/290,337,257,49,201,356,343.1,407.2/369,341,403,161,158.1,42.1,6.2,127.3;
364 198,188,352,80.2,66.2,186.3,164.3,367.3/290,337,257,49,201,356,407.2,384.2/369,341,403,161,6.2,127.3,379.3,42.3;
365 94,198,188,352,392,80.2,66.2,22.2/290,337,257,49,201,356,407.2,384.2/369,341,403,161,199.2,6.2,127.3,204.3;
366 376,188.1,80.2,66.2,350.3,154.3/290,384,201.1,356.1,141.2,407.3,299.3/12.1,369.2,127.3,341.3,403.3;
367 66,256,157,392,94,80.2,33.3,188.3/290,384,201,356,141.2,251.3,47.3,407.3/199,6,369.2,127.3,341.3,403.3,204.3,179.3;
368 66,80.2,33.3,188.3,350.3,154.3,61.3/290,384,201,101,45,356.2,141.2,251.3/199,6,315,369.2,127.3,341.3,403.3,204.3;
369 66,291,43,71.1,80.2,198.2,186.3,188.3/290,300,394,356.1,47.1,123.1,384.2,279.2/199,6,380,114,127,42.1,12.1,70.1;
370 291,43,29,7.1,80.2,66.2,198.2,409.2/290,201,356,45,384.2,141.2,251.3,407.3/199,114,369.2,127.3,341.3,403.3;
371 174,186,256,169,392,71,176.1,95.1/130,32,170.1,87.1,318.1,181.3,47.3,299.3/136,127,222,78.1,359.1,199.1,99.2,114.3;
372 174,186,256,169,392,71,90.2,105.3/130,32,87.2,318.2,181.3,47.3,299.3,394.3/136,127,222,99.2,114.3,199.3,233.3,42.3;
373 174,90,16,186,256,169,392,96/130,32,87.2,14.2,371.2,318.2,181.3,251.3/416,136,127,222,99.2,400.2,114.3,199.3;
374 291,71.2,69.2,186.3/377.3/114,250.2;
375 175,322,71,291,281,180.2,311.2,69.2/101,74,309.2,397.2,314.2,251.3,58.3,47.3/315,331,114,204,305.2,250.2,20.2,127.3;
376 175,322,71,291,281,180.2,311.2,69.2/101,74,309.2,397.2,314.2,251.3,58.3,47.3/315,331,114,204,239,153.1,305.2,250.2;
377 289,352.2,249.3,326.3,328.3,333.3,186.3,188.3/224,300,339,378,394.2,279.2,219.2,24.2/42,351,204,153,132,165,239,342.2;
378 289,328.2,22.2,288.2,249.3,333.3,186.3,188.3/407,300,339,378,76.2,396.2,47.3,299.3/341,403,204,153,132,165,239,248.3;
379 175,69,111,289,306.2,249.3,328.3,333.3/74,300,339,378,47.3,299.3,394.3,67.3/204,153,132,165,239,250.2,20.2,248.3;
380 71,174.2,311.2,398.2,335.2,105.3,188.3,80.3/101,312,130,318,301,87.2,309.2,251.3/315,50,98.2,136.2,305.2,99.2,416.3,114.3;
381 71,174.2,311.2,398.2,335.2,105.3,188.3,80.3/101,312,130,318,301,87.2,309.2,314.2/315,348,98.2,136.2,305.2,99.2,416.3,114.3;
382 188,80.2,66.2,198.2,186.3,164.3,350.3,193.3/201,300,384.2,356.2,141.2,11.2,251.3,47.3/199,358,12,6,319,127,341,161;
383 109,152.2,278.2,249.3,326.3,333.3,105.3,186.3/123,381,300,47.2,67.2,378.2,26.2,251.3/379,158,156,344,233,148,239,212;
384 174,392,399,184.2,90.2,398.2,335.2,33.3/87,371,318,300,251.3,47.3,407.3,299.3/416,136,400,31,204,415,99.2,114.3;
385 71,69.2,249.3,326.3,328.3,333.3,186.3,188.3/101,251,313.2,74.2,309.2,301.2,397.2,314.2/315,305,331,117,127,98.2,250.2,248.3;
386 71,102,281,116,326.3,328.3,333.3,105.3/309,383,313.2,301.2,397.2,314.2,251.3,47.3/315,308,204,98.2,305.2,114.3,127.3,341.3;
387 208,160,291,256,392,188.1,111.1,202.2/2,246,207,178,378,55.1,67.1,381.1/237,127,359.1,165.1,344.2,114.3,91.3,388.3;
388 208,160,291,256,392,202.2,159.2,1.2/2,246,207,178,378,360.2,209.2,55.2/237,127,359.1,165.1,344.2,114.3,91.3,388.3;
389 208,160,291,256,392,202.2,278.2,159.2/2,246,207,178,378,47.2,67.2,360.2/379,237,245,28,127,359.1,165.1,344.2;
390 355,25,291,195,154,5,329,326.1/32,181,251,412.2,137.2,47.3,299.3,394.3/222,127,260.1,233.2,363.2,139.2,114.3,42.3;
391 355,395,329,25,291,195,154,5/32,181,251,264.2,412.2,137.2,47.3,299.3/222,0,139,127,260.1,233.2,363.2,259.2;
392 355,395,329,25,291,195,154,213/32,181,251,142.2,264.2,412.2,137.2,47.3/222,0,139,140,127,260.1,233.2,23.2;
393 198,119,37,291,284,283,184,43.1/290,338,68,384,201,356,47.1,407.1/199,127,369.2,341.3,403.3;
394 198,119,37,291,284,283,175,184/290,338,68,384,201,356,141.2,411.2/199,127,369.2,114.3,341.3,403.3;
395 175,7,198,119,37,291,284,283/290,338,68,384,201,356,74,141.2/199,138,127,369.2,200.2,250.2,114.3,341.3;
396 35,291,39,143,184,37.1,17.1,281.1/386,371,251.2,299.2,14.2,377.2,47.3,87.3/114,127,266,179,19.1,416.2,400.2,260.3;
397 35,291,39,143,184,350.2,154.2,5.2/386,371,251.2,299.2,14.2,377.2,47.3,87.3/114,127,266,179,416.2,19.2,400.2,260.3;
398 35,291,39,143,184,350.2,154.2,5.2/386,371,251.2,299.2,14.2,377.2,47.3,87.3/114,127,266,179,0,416.2,204.2,34.2;
399 186,291,203,367,256,352,392,39.1/251.2,299.2,47.3,407.3,51.3,265.3,339.3/114,127,165,70.1,388.1,6.1,341.3,403.3;
400 186,291,203,367,7,256,352,392/290,201,251.2,299.2,384.2,141.2,47.3,407.3/114,127,6,165,369.2,204.2,179.2,388.2;
401 282,119,291,293.2,192.2,143.3/149,2,47.3,377.3/19.3;
402 85,106,382,282,13,119,291,109/149,2,408.2,4.2,47.3,178.3,299.3,377.3/417,114.3,204.3,19.3,415.3,179.3;
403 82,96,291,256,39,392,129.1,373.1/214,265.1,251.1,343.1,339.2,52.2,133.2,21.2/393,83,410,114.1,336.2,127.3,91.3,77.3;
404 82,96,291,256,39,392,186.3,164.3/214,265.2,339.2,52.2,133.2,21.2,251.3,47.3/393,83,410,336.2,114.3,127.3,91.3,77.3;
405 82,96,291,256,39,392,186.3,188.3/214,265.2,339.2,52.2,133.2,21.2,251.3,47.3/393,83,410,336.2,295.2,114.3,127.3,204.3;
406 285,334,202.2,159.2,105.3,350.3,154.3/2,246,135,207.1,178.1,55.1,286.1,271.1/112,237.1,344.2,19.3;
407 285,334,202.2,159.2,105.3,188.3,106.3,350.3/2,246,178,209,135,58.2,360.2,55.2/112,385,344.2,237.2,227.2,204.3,19.3,179.3;
408 40,186,291,256,281,392,193,71/300,394.2,279.2,24.2,47.3,299.3,265.3,318.3/42,380,114,127,359.1,91.1,239.1,351.2;
409 40,186,291,256,281,392,193,143/300,394.2,279.2,24.2,47.3,299.3,384.3,265.3/42,380,114,127,359.1,239.1,351.2,222.3;
410 69,111,291,186.1,188.1,103.1,306.2,164.3/300,381,279.1,394.2,219.2,74.2,24.2,47.3/42,114,127,158.1,91.2,351.2,250.2,222.3;
411 69,111,291,186.1,103.1,306.2,188.3,164.3/300,381,394.2,279.2,219.2,74.2,24.2,47.3/42,114,127,158.1,91.2,351.2,250.2,342.2;
412 282,291/149,299,133.3/282!embestida,299!embestida,133.3!embestida;
413 282,291,43,202.2,152.3,221.3,350.3,154.3/207,408,135,149,4,386,313,101/417,237,315,344.2,204.3,98.3,19.3,179.3;
414 282,293,291,184.2,213.2,5.2,221.3,350.3/386,408,371,149,313,101,299,14.2/417,315,204.3,344.3,98.3,179.3;
415 282,293.2,192.2,16.2,143.3/386,149,14.2,251.3,47.3,404.3,377.3/417;
416 106,282,13,285,195,109,281,184.2/386,286,408,371,149,219,14.2,343.2/417,15,400.2,48.2,114.3,204.3,19.3,179.3;
417 82,255,256,39,203,367,392,43.1/214,52,251,265.2,339.2,133.2,47.3,299.3/393,83,91.1,336.2,410.2,114.3,204.3,19.3;
418 80,7,198,291,256,39,281,128/290,384,201,59,251,47.1,356.2,141.2/199,6,138,405,369.2,114.3,341.3,403.3;
419 80,7,198,291,256,39,281,392/290,384,201,59,251,356.2,141.2,11.2/199,6,138,405,369.2,12.2,114.3,127.3;
420 160,291,352.1,202.2,159.2,350.3,154.3/2,209,135,45,207.1,55.1,178.2,360.2/344,112,385,114,127,48.3;
421 160,291,202.2,159.2,352.3,350.3,154.3/2,209,135,45,178.2,360.2,55.2,299.3/344,112,385,114,127,108.2,204.3,179.3;
422 291,188,103.1,80.2,66.2,198.2,186.3,350.3/290,201,47,299,300,381,54,356.1/199,12,158.1,369.2,114.3,341.3,403.3,42.3;
423 291,188,152.2,80.2,66.2,278.2,198.2,186.3/290,47,201,381,54,299,300,384.2/199,12,369.2,379.2,114.3,341.3,403.3,204.3;
424 25,39,195,128,215,185,40.1,103.1/251,54,299.2,377.2,47.3,51.3,123.3,265.3/127,91,114.2,204.2,19.2,179.2,344.3,336.3;
425 215,349,401,188.1,184.2,5.2,105.3,33.3/386,51,404,217,101,271,231,383.2/41,153,416.2,189.2,336.3,393.3,315.3,98.3;
426 215,349,401,184.2,5.2,105.3,33.3,188.3/386,51,404,217,101,271,231,383.2/189,41,153,416.2,204.3,336.3,393.3,315.3;
427 119,186,39,330,128,129,61,43.1/251,45,299.2,47.3,51.3,265.3,201.3,339.3/127,276,77,248.2,19.2,415.2,341.3,344.3;
428 119,186,39,330,350,128,129,395/251,241,45,299.2,47.3,51.3,265.3,201.3/127,276,277,0,77,248.2,204.2,19.2;
429 215,401,186.3,221.3,350.3,154.3,184.3,202.3/51,364,217,313,101,312,271,209/189,302.2,204.3,336.3,393.3,315.3,98.3,305.3;
430 35,284,281,184,373,346,215,221.2/386,14,320,371,18,383,251.3,47.3/266,220,416.2,34.2,400.2,114.3,127.3,204.3;
431 25,291,195,109,345,157,184,373/251.2,299.2,47.3,51.3,265.3,201.3/127,77,415.2,336.3,393.3,98.3,91.3,220.3;
432 25,291,188,195,109,345,157,184/251.2,299.2,47.3,51.3,265.3,201.3,378.3/127,77,204.2,415.2,179.2,336.3,393.3,98.3;
433 291,102,215,71.2,33.3,352.3,350.3,154.3/101,271,404,301.1,309.2,314.2,251.3,407.3/127,19,98.1,305.1,315.2,415.3;
434 256,334,373,25,291,195,109,281.1/53,303.1,287.1,58.2,320.2,18.2,251.3,47.3/127,153,220.1,91.1,77.1,223.2,262.2,114.3;
435 256,334,373,25,291,195,109,221.2/53,58.2,320.2,18.2,181.3,251.3,47.3,299.3/127,222,153,223.2,262.2,220.2,114.3,204.3;
436 180,111,291,157,401,71.2,69.2,188.3/101,312,271,74,217,309.2,301.2,397.2/305,315.2,98.2,250.2,20.2,114.3,344.3,379.3;
437 180,111,291,157,401,71.2,69.2,306.2/101,312,271,74,217,313.2,309.2,301.2/305,315.2,98.2,250.2,20.2,114.3,204.3,344.3;
438 352,40,291,272,103,43,157,186.1/224,394,67.1,279.2,219.2,24.2,47.3,299.3/42,380,127,41.1,351.2,114.3,379.3,153.3;
439 71,119,126,186.3,221.3,350.3,154.3,113.3/313,101,63,407.1,309.2,301.2,47.3,299.3/315,305.1,98.2,344.3,336.3,393.3,19.3;
440 119,291,103.1,186.2,350.2,154.2,143.2,352.3/414,45,406,307.1,54.1,299.2,377.2,47.3/127,362.1,114.2,19.2,415.2,222.3,344.3,315.3;
441 37,284,17.1,350.2,154.2,184.2,221.3,213.3/386,251,14,371,81,383.1,299.2,47.3/19,415,400,77,150.1,416.2,34.2,260.3;
442 157,281,401,221.2,115.2,188.3,350.3,154.3/383,51,320,364,404,217,271,18.2/98,220.1,189.2,302.2,204.3,315.3,19.3,179.3;
443 152,174,291,256,109,188.1,175.1,69.1/170,130,87,67,381,378,123.1,47.2/136,78,114,127,359.1,91.1,388.1,379.2;
444 152,174,185,291,256,109,90.2,398.2/170,130,87,67,381,378,47.2,123.2/136,78,114,127,379.2,99.2,222.3,233.3;
445 152,174,185,291,256,109,392,95/170,130,87,67,381,378,47.2,123.2/136,78,114,127,379.2,99.2,222.3,369.3;
446 291,188,43,196,256,229,352,71/378,120.2,299.2,377.2,47.3,407.3,51.3,384.3/127,179,166,41.1,158.1,248.2,114.2,19.2;
447 103,218,193,268,256,39,175,392/142,264,251.3,47.3,299.3,394.3,378.3,377.3/0,277.1,372.1,331.1,259.2,248.3,114.3,379.3;
448 103,218,395,175,193,268,322,329/142,264,38,320,318,74.2,251.3,47.3/331,0,91.2,259.2,250.2,248.3,114.3,204.3;
449 152,291,256,392,188.1,118.1,278.2,186.3/67,54,47.2,123.2,381.2,378.2,26.2,299.3/379,158,166,114,127,42.3,91.3,165.3;
450 152,291,256,392,96,94,95,278.2/67,54,47.2,123.2,381.2,378.2,26.2,299.3/379,158,166,114,127,204.3,42.3,91.3;
451 285,97,382,402,282,13,256,281/286,58.2,149.2,4.2,47.3,299.3,51.3,394.3/91.1,417.2,6.3;
452 285,256,281,392,116,97,373,402/286,58.2,320.2,18.2,47.3,299.3,51.3,394.3/204.3,379.3,42.3,91.3,6.3,417.3,179.3,388.3;
453 285,272,193,118,334,157,281,215/58,47,381,54,264.1,53.2,407.3,299.3/0,324.1,372.1,259.2,223.2,262.2,248.3,114.3;
454 285,272,193,118,334,157,281,215/58,47,381,54,264.2,53.2,407.3,299.3/0,259.2,223.2,262.2,248.3,114.3,204.3,379.3;
455 228,202,33,256,157,392,40.1,105.3/2,55,135,88,151,53,207.1,178.1/227,344.2,204.3,179.3;
456 119,43,61,213,80.2,66.2,409.2,221.3/290,68,384,201,386,408,371,356.1/199,6.1,369.2,114.3,341.3,403.3;
457 119,43,61,213,80.2,66.2,409.2,221.3/290,68,384,201,386,408,371,356.2/199,369.2,6.2,114.3,341.3,403.3,204.3,179.3;
458 35,184,61,186,291,40.1,80.2,66.2/290,338,68,201,371,87.1,241.1,343.1/199,114,127,42.1,369.2,341.3,403.3,379.3;
459 160,22.1,289.1,328.2,202.2,159.2,288.2,1.2/207,257,407,135,147,360.1,209.1,55.1/403,161,245,86,127.1,70.1,341.2,344.2;
460 328,160,22.2,202.2,159.2,288.2,1.2,249.3/207,257,407,135,147,178.2,360.2,76.2/403,161,245,86,341.2,344.2,237.2,248.3;
461 157,373,25,39,195,109,175,118/407,320,147,251,76.2,18.2,47.3,299.3/403,341.2,220.2,248.3,114.3,369.3,204.3,98.3;
462 82,180,291,69.2,111.2,306.2,188.3,352.3/214,122,74,57,52,59,389,241/336,393,132,83,410.2,250.2,20.2,295.2;
463 40,289,291,102,196,229,352,116/151,378,299.2,317.2,47.3,407.3,51.3,384.3/127,179,227,248.2,204.2,41.2,153.2,388.2;
464 374,289,104,37,291,193,334,196/279,24,378,47.2,300.2,394.2,123.2,381.2/379,42,354,351,166,280,114,127;
465 228,33,40,349,116,128,202.2,159.2/2,246,178,135,58,300,151,53/227,344.2,237.2,108.2,204.3,379.3,42.3,259.3;
466 333,82,326,272,39,249.3,328.3,186.3/214,265,52,251,339.2,133.2,21.2,47.3/336,393,83,410,179,324.1,372.1,239.1;
467 326,355,333,291,272,157,395.1,258.2/32,181,287,303,231.2,137.2,47.3,299.3/222,233,212,204,324.1,372.1,260.2,363.2;
468 119,291,399,184.2,16.2,249.3,186.3,188.3/14,371,45,406,389,300,271,142/34,167,127,416.2,77.2,248.3,222.3,204.3;
469 35,184,213,282,291,39,109,281/386,408,371,59,300,14.2,343.2,149.2/417,19,127.1,114.3,204.3,344.3,315.3,98.3;
470 208,160,291,256,39,202.2,159.2,1.2/207,178,209,251,360.2,55.2,135.2,120.3/114,127,344.2,237.2,108.2,204.3,91.3,415.3;
471 94,291,256,39,22.2,390.2,186.3,188.3/257,407,147,230,251,241,76.2,396.2/341,403,114,127,204.3,91.3,415.3,6.3;
472 184,5,285,39,109,157,106,116/47,381,54,286,67.2,123.2,378.2,251.3/379,197,242,127.1,34.2,166.2,114.3,204.3;
473 94,37,291,284,43,128,256.1,152.2/257,47,407,147,54,378,300,230.1/403,379,86,166,114,359,127,158.1;
474 291,82,350.2,154.2,221.3,184.3,71.3/389,313,214,343,251.2,299.2,377.2,407.3/127,204,336,132,83,114.2,19.2,179.2;
475 311,109,155,106,184,208,373,370/313,101,301,414,45,142.2,264.2,309.2/315,98,305,0,144,259.2,248.3,114.3;
476 291,82,294,352.1,69.2,111.2,306.2,326.3/224,279,219,74,57,24,389,381/42,351,132,83,380.1,127.1,250.2,342.2;
477 215,332,326,328,333,33,85,281/383,51,364,217,2,320,404.2,251.3/315,305,189.2,302.2,248.3,341.3,403.3,204.3;
478 215,94,186,256,392,328.2,22.2,390.2/257,407,51,147,404,217,396,45/403,86,341.2,302.2,114.3,204.3,336.3,393.3;
479 215,221.3,350.3,154.3/214,51,265,339,404,52,217,383.2/336,393,83,19,302.2,98.3,415.3,220.3;
480 43,128,311.2,71.2,326.3,328.3,333.3,186.3/313,101,271,298,251,389,309.2,301.2/315,305,98.2,204.3,344.3,336.3,393.3,91.3;
481 128,311.2,71.2,326.3,328.3,333.3,186.3,350.3/313,101,271,298,251,389,309.2,301.2/315,305,98.2,127.3,341.3,403.3,204.3,336.3;
482 128,311.2,71.2,326.3,328.3,333.3,186.3,350.3/313,101,271,298,251,389,309.2,301.2/315,305,41,153,19,98.2,127.3,222.3;
483 175,174,109,69.2,111.2,90.2,398.2,335.2/130,87,318,74,300,142,219,381/91,124,136.2,99.2,250.2,114.3,222.3,341.3;
484 174,109,80.2,66.2,90.2,198.2,398.2,335.2/130,87,201,318,300,142,219,381/199,6,107,369.2,136.2,99.2,114.3,222.3;
485 175,95,69,392,111.2,258.2,187.2,306.2/32,181,300,381,74.2,137.2,47.3,299.3/260,212,238,351,222.2,233.2,363.2,139.2;
486 119,249,289,291,330,154,10,326/300,378,299.2,317.2,377.2,47.3,407.3,394.3/179,165,239,248.2,127.2,204.2,388.2,336.3;
487 174,176,109,90.2,398.2,105.3,186.3,188.3/130,364,404,217,300,142,381,87.2/194,136.2,99.2,189.2,302.2,416.3,114.3,204.3;
488 311,291,109,71.2,188.3,106.3,350.3,154.3/313,101,337,309.2,301.2,397.2,251.3,47.3/315,305,167,98.2,341.3,204.3,344.3,336.3;
489 66,71,80.2,198.2,409.2,350.3,154.3,116.3/290,338,68,384,201,101,356.2,141.2/199,167,369.2,341.3,403.3,19.3;
490 66,71,80.2,198.2,409.2,350.3,154.3,116.3/290,338,68,384,201,101,356.2,141.2/199,167,369.2,341.3,403.3,204.3,315.3,19.3;
491 157,281,39,221.2,116.2,401.2,191.2,115.2/320,383,51,364,404,217,18.2,251.3/315,98,220.2,341.3,403.3,204.3,336.3,393.3;
492 160,39,202.2,159.2,1.2,186.3,350.3,154.3/209,135,371,381,178.2,360.2,55.2,251.3/168,77,344.2,237.2,385.2,114.3,127.3,204.3;
493 39,399,105.2,186.2,188.2,164.2,350.2,154.2/101,300,271,381,251.2,299.2,377.2,58.3/204,415,361,362,305,114.2,127.2,179.2`;

const APRENDE = {};
MOVS_APR.split(';').forEach(l => {
  const m = l.trim().match(/^(\d+) (.*)$/); if(!m) return;
  const [c, me, la] = m[2].split('/').map(x => x ? x.split(',').map(e => {
    const r = e.match(/^(\d+)(?:\.(\d))?(?:!(\w+))?$/);
    return {i:+r[1], pr:+(r[2] || 0), fx:r[3] || null};
  }) : []);
  APRENDE[m[1]] = {corto:c, medio:me, largo:la};
});
const BOTON = {c:'corto', m:'medio', l:'largo'};
/* Smeargle aprende con Esquema cualquier ataque: sus listas son todo el catálogo. */
const TODOS = {corto:[], medio:[], largo:[]};
MOVS_CAT.forEach((d, i) => TODOS[BOTON[d[3]]].push({i, pr:3, fx:null}));
const PESO_PRI = [6, 3, 2, 1];
function semillaNum(txt){ let h = 2166136261; for(const ch of String(txt)){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
/* Ataques EXCLUSIVOS de las figuritas especiales (premio del álbum completo): no existen para ningún otro Pokémon y
   pegan más fuerte (pot = multiplicador del daño del alcance; el corto y el medio ×1,3, el largo ×1,4).
   Usan los mismos efectos visuales (fx/forma) que el resto, con el color de su tipo. */
const POT_ESPECIAL = {corto:1.3, medio:1.3, largo:1.4};
const MOVS_ESPECIALES = {
  10150: {corto:['Garra Acorazada','psychic','garra'], medio:['Pulso Blindado','psychic','onda','anillo'], largo:['Psicorrayo Total','psychic','rayo']},
  10151: {corto:['Garra Umbría','dark','garra'], medio:['Aura Oscura','dark','tornado','medialuna'], largo:['Abismo Total','dark','propia']},
  10152: {corto:['Pico Carmesí','fire','picotazo'], medio:['Llama Sombría','dark','bola','llama'], largo:['Fuego Eclipse','fire','propia']},
  10153: {corto:['Garra Plasma','electric','garra'], medio:['Relámpago Veloz','electric','rayito'], largo:['Puño Plasma','electric','trueno']},
  10154: {corto:['Garra Azul','dragon','garra'], medio:['Llama Azul','fire','bola','llama'], largo:['Aliento Azul','fire','rayo']},
  10155: {corto:['Puño Hoopa','dark','golpe'], medio:['Portal Anillo','psychic','onda','anillo'], largo:['Dimensión Total','dark','propia']}
};
function movsDe(p, semilla){
  if(p.especial && MOVS_ESPECIALES[p.id]){
    const out = {};
    ATAQUES.forEach(alc => { const [n, tipo, fx, forma] = MOVS_ESPECIALES[p.id][alc]; out[alc] = {n, tipo, fx, forma:forma || FORMA_FX[fx] || 'bola', pot:POT_ESPECIAL[alc]}; });
    return out;
  }
  const id = p.base || p.id, pools = id === 235 ? TODOS : APRENDE[id];
  const out = {};
  ATAQUES.forEach(alc => {
    const lista = (pools && pools[alc]) || [];
    if(!lista.length){ out[alc] = null; return; }
    const pesos = lista.map(x => PESO_PRI[Math.min(x.pr, 3)]), tot = pesos.reduce((a, b) => a + b, 0);
    let r = (semillaNum(id + ':' + alc + ':' + semilla) % 100000) / 100000 * tot, k = 0;
    while(k < lista.length - 1 && (r -= pesos[k]) >= 0) k++;
    const x = lista[k], d = MOVS_CAT[x.i];
    out[alc] = {n:d[0], tipo:d[1], fx:x.fx || d[2], forma:d[4] || FORMA_FX[x.fx || d[2]] || 'bola'};
  });
  return out;
}
const FORMA_FX = {bola:'bola', chorro:'gota', onda:'anillo', hojas:'hoja', agujas:'aguja', piedra:'roca', rayito:'chispa', polvo:'nube',
  estrella:'estrella', lodo:'lodo', burbujas:'burbuja', tornado:'tornado', hueso:'hueso', semillas:'semilla', suelo:'suelo', monedas:'moneda'};
/* El ataque de un Pokémon en pelea (mon = el que está peleando, con su ejemplar). Ditto sólo sabe
   Transformación: se transforma y usa los ataques del rival que tiene enfrente. */
function movDe(mon, alc){
  if((mon.p.base || mon.p.id) === 132 && typeof AR !== 'undefined' && AR){
    const otro = AR.yo && AR.yo.act === mon ? (AR.riv && AR.riv.act) : (AR.yo && AR.yo.act);
    if(otro && (otro.p.base || otro.p.id) !== 132) return movDe(otro, alc);
  }
  if(!mon.movs) mon.movs = movsDe(mon.p, Math.random());
  const m = mon.movs[alc];
  return m || {n:'Transformación', tipo:'normal', fx:{corto:'golpe', medio:'estrella', largo:'rayo'}[alc], forma:'estrella'};
}
const nombreAtaque = (mon, alc) => movDe(mon, alc).n;
/* para las pruebas (no se usa en el juego) */
window.__arenaMovs = {movsDe, APRENDE, MOVS_CAT, nombreAtaque, ATAQUES};
/* Ataques medios que se ven distinto a lo que da su efecto genérico. */
const FORMA_MOV = {'Ascuas':'llama', 'Furia Dragón':'llama', 'Pulso Dragón':'llama', 'Canto':'nota', 'Beso Amoroso':'corazon',
  'Rayo Aurora':'arcoiris', 'Psicorrayo':'arcoiris', 'Bola Voltio':'voltio', 'Bomba Huevo':'huevo', 'Onda Vacío':'medialuna'};

const PART = {
  normal:  {c:['#A8A77A', '#ffffff'], g:0},
  fire:    {c:['#EE8130', '#F7D02C', '#FFF3B0'], g:-1},
  water:   {c:['#6390F0', '#BCD2FF', '#ffffff'], g:1},
  electric:{c:['#F7D02C', '#ffffff'], g:0, m:'zap'},
  grass:   {c:['#7AC74C', '#3F8A2A'], g:.8},
  ice:     {c:['#96D9D6', '#ffffff'], g:.4},
  fighting:{c:['#C22E28', '#ffffff', '#F7D02C'], g:0},
  poison:  {c:['#A33EA1', '#D68AD4'], g:-.6},
  ground:  {c:['#E2BF65', '#8A6D2A'], g:1.2},
  flying:  {c:['#ffffff', '#A98FF3'], g:0, m:'viento'},
  psychic: {c:['#F95587', '#FFD0DF'], g:0, m:'anillo'},
  bug:     {c:['#A6B91A', '#DFE88A'], g:.5},
  rock:    {c:['#B6A136', '#6D5F1F'], g:1.6},
  ghost:   {c:['#735797', '#2B1F45', '#C9B5F0'], g:-.8},
  dragon:  {c:['#6F35FC', '#B49CFF'], g:0},
  fairy:   {c:['#D685AD', '#ffffff', '#FFE27A'], g:-.7},
  dark:    {c:['#705746', '#241a14'], g:0},
  steel:   {c:['#B7B7CE', '#ffffff'], g:.5}
};
const partDe = tipo => PART[tipo] || PART.normal;

/* Estilos del rival: peso de cada acción en su guion. */
const ESTILOS = {
  agresivo:    {nombre:'Agresivo',    w:{acercar:2, corto:3, medio:2, largo:1.6, orbitar:1, esquivar:.5}, reflejo:.35},
  tirador:     {nombre:'Tirador',     w:{acercar:.5, corto:.6, medio:4, largo:2.5, orbitar:2, retroceder:1.5, esquivar:.6}, reflejo:.45},
  escurridizo: {nombre:'Escurridizo', w:{acercar:1, corto:1.6, medio:2, largo:1.8, orbitar:3, retroceder:1, esquivar:2}, reflejo:.65},
  equilibrado: {nombre:'Equilibrado', w:{acercar:1.5, corto:2, medio:2.5, largo:2, orbitar:2, retroceder:.5, esquivar:1}, reflejo:.45}
};
const NOMBRES_RIVAL = ['Marcos', 'Lucía', 'Nico', 'Sofi', 'Facu', 'Cami', 'Tomi', 'Vale', 'Lauti', 'Mica'];

/* El rival lleva el nombre de un entrenador REAL del álbum (ranking de hoy, histórico, los que
   completaron y Maestros), nunca uno mismo. Sigue siendo el bot de siempre con ese nombre: no hay
   pelea online. El ranking sólo trae nombre y figuritas, así que la fuerza de sus Pokémon sale de
   eso: de 20 (recién empieza) a 85 de piso (álbum completo), más un azar de 0-15. Sin ranking
   cargado (sin conexión) quedan los nombres de reserva y la fuerza al azar de siempre. */
let rivalFig = null;
function entrenadoresReales(){
  const yo = claveNombre(jugador);
  const vistos = new Map();
  const sumar = (n, fig) => {
    const k = claveNombre(n);
    if(!k || k === yo) return;
    const prev = vistos.get(k);
    if(!prev || fig > prev.fig) vistos.set(k, {nombre:n.trim(), fig});
  };
  const t = ultimoTop || {};
  (t.hoy || []).concat(t.historico || []).forEach(r => sumar(r.jugador, r.figuritas || 0));
  (t.completaron || []).forEach(r => sumar(r.jugador, DATA.length));
  ((ultimoTopMaestro || {}).top || []).forEach(r => sumar(r.jugador, 0));
  return [...vistos.values()];
}
function elegirRival(){
  if(window.__rivalNombre) return {nombre:window.__rivalNombre, fig:null};
  const reales = entrenadoresReales();
  return reales.length ? elige(reales) : {nombre:'Entrenador ' + elige(NOMBRES_RIVAL), fig:null};
}
function fuerzaRival(){
  if(rivalFig == null) return nuevoEjemplar(50).f;
  const piso = Math.round(20 + Math.min(1, rivalFig / DATA.length) * 65);
  return Math.min(100, piso + Math.floor(Math.random() * 16));
}

const REDUCE = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- estado ---------------- */
let AR = null;       // batalla en curso
let TOK = 0;         // se incrementa al cerrar: corta el bucle y los pendientes
let ST = null, SHAKE = null, FX = null, BG = null, PISO = null;
let E = {};          // entidades en pantalla: E.yo y E.riv
let G = {W:360, H:480, K:1, cx:180, cy:300, rx:150, ry:110, pz:.7};
let RAF = 0, RO = null;

const $ = id => document.getElementById(id);
const azar = (a, b) => a + Math.random() * (b - a);
const elige = arr => arr[Math.floor(Math.random() * arr.length)];
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const bstDe = p => p.bst || (typeof BST !== 'undefined' && BST[p.id - 1]) || 300;
const u = () => Math.min(G.W, G.H * 1.4) / 100 * (AR && AR.zoom || 1);       // unidad de longitud de efectos y velocidades (zoom < 1 = cámara más lejos, en partidas de varios)
/* Equipos: AR.bando[lado] = 'A'/'B' (o uno por jugador en todos contra todos). En 1 vs 1 es yo contra riv de siempre. */
const enemigosDe = e => AR.lados.filter(l => AR.bando[l] !== AR.bando[e.lado]).map(l => E[l]).filter(Boolean);
const escalaLado = e => (AR && AR.bando && AR.bando[e.lado] === AR.bando.yo) ? 'yo' : 'riv';
/* A quién apunta: el que eligió al empezar el ataque; si no, el enemigo vivo más cercano. */
function otro(e){
  if(!AR || !AR.lados) return e.lado === 'yo' ? E.riv : E.yo;
  const A = e.accion && e.accion.obj && E[e.accion.obj];
  if(A && A.mon && A.mon.vivo) return A;
  const en = enemigosDe(e);
  let mejor = null, md = Infinity;
  for(const o of en){ if(!o.mon || !o.mon.vivo) continue; const d = dist(pie(e), pie(o)); if(d < md){ md = d; mejor = o; } }
  return mejor || en[0];
}
/* el enemigo vivo que mejor coincide con la dirección d (para los ataques de otro celular) */
function objetivoPorDir(e, d){
  let mejor = null, mp = -2;
  for(const o of enemigosDe(e)){
    if(!o.mon || !o.mon.vivo) continue;
    const v = unit(pie(e), pie(o)), pr = v.x * d.x + v.y * d.y;
    if(pr > mp){ mp = pr; mejor = o; }
  }
  return mejor || otro(e);
}
const dibujarTodos = dt => AR.lados.forEach(l => { if(E[l]) dibujar(E[l], dt); });

function mk(cls, css, padre){
  const d = document.createElement('div');
  d.className = cls;
  if(css) Object.assign(d.style, css);
  (padre || FX).appendChild(d);
  return d;
}

/* ---------------- sonido 8-bit ---------------- */
let AC = null, RUIDO = null, SONIDO = true;
try{ SONIDO = localStorage.getItem('arena-sonido') !== '0'; }catch(e){}
function audio(){
  if(!AC){ const C = window.AudioContext || window.webkitAudioContext; if(!C) return null; AC = new C(); }
  if(AC.state === 'suspended') AC.resume();
  return AC;
}
function tono(f1, f2, dur, tipo, vol, demora){
  const a = audio(); if(!a) return;
  const t = a.currentTime + (demora || 0), o = a.createOscillator(), g = a.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .02);
}
function ruido(dur, vol, frec, demora){
  const a = audio(); if(!a) return;
  if(!RUIDO){
    RUIDO = a.createBuffer(1, a.sampleRate * .5, a.sampleRate);
    const d = RUIDO.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = a.currentTime + (demora || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = RUIDO; f.type = 'bandpass'; f.frequency.value = frec;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + dur + .02);
}
const SFX = {
  golpe:   () => { ruido(.12, .25, 900); tono(180, 60, .12, 'square', .07); },
  critico: () => { ruido(.22, .35, 1400); tono(520, 90, .25, 'square', .09); tono(780, 780, .08, 'square', .05, .05); },
  garra:   () => ruido(.08, .16, 4200),
  disparo: () => tono(300, 900, .12, 'square', .045),
  carga:   () => tono(120, 600, .6, 'sawtooth', .03),
  rayo:    () => { tono(900, 200, .4, 'sawtooth', .05); ruido(.35, .12, 2500); },
  lluvia:  () => { ruido(.5, .14, 700); tono(400, 120, .5, 'triangle', .05); },
  esquive: () => ruido(.16, .1, 3200),
  ko:      () => tono(600, 70, .7, 'square', .08),
  cuenta:  () => tono(660, 660, .1, 'square', .05),
  pelea:   () => { tono(880, 880, .1, 'square', .06); tono(1320, 1320, .2, 'square', .06, .1); },
  gana:    () => [523, 659, 784, 1046].forEach((f, i) => tono(f, f, .16, 'square', .06, i * .12)),
  pierde:  () => [392, 330, 262].forEach((f, i) => tono(f, f * .98, .22, 'triangle', .08, i * .18)),
  sale:    () => { tono(500, 1000, .12, 'square', .04); ruido(.1, .08, 2000, .08); }
};
function sfx(n){ if(!SONIDO || window.__arenaMudo) return; try{ SFX[n](); }catch(e){} }

/* ---------------- fondo en píxeles ----------------
   Se dibuja en un canvas chico (1 píxel = K píxeles de pantalla) y se agranda
   sin suavizar. Se rehace al cambiar el tamaño. */
function rng(sem){ let s = sem >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function medir(){
  const W = ST.clientWidth, H = ST.clientHeight;
  G.W = W; G.H = H;
  G.K = Math.max(1, Math.floor(Math.min(W / 300, H / 210) * 4) / 4);
  const ctrl = $('arCtrl');
  const margen = ctrl && getComputedStyle(ctrl).position === 'absolute' ? Math.min(130, H * .26) : 0;
  const disp = H - margen;
  G.rx = Math.min(W * .42, (W / 2 - 40 * G.K * ESCALA_POKE.yo) / .96);   // que un sprite en el borde no se salga de la pantalla
  /* el piso va debajo de los HUD y arriba de los controles */
  const hud = $('arHuds') || $('arHud-riv'), hudH = hud ? hud.offsetHeight + 8 : 90;
  G.hudH = hudH;
  const top = Math.max(hudH * .8, disp * .2), bajo = disp - 6;
  G.ry = Math.min((bajo - top) / 2 / 1.07, G.rx * .8);
  G.cx = W / 2;
  G.cy = top + (bajo - top) / 2;
  G.pz = Math.max(.5, G.ry / G.rx);
}

function pintarFondo(){
  const K = G.K, cw = Math.max(40, Math.ceil(G.W / K)), ch = Math.max(40, Math.ceil(G.H / K));
  BG.width = cw; BG.height = ch;
  const g = BG.getContext('2d', {willReadFrequently:true});
  g.imageSmoothingEnabled = false;
  const ex = G.cx / K, ey = G.cy / K, erx = G.rx / K, ery = G.ry / K;
  const R = rng(7);

  g.fillStyle = '#04050a'; g.fillRect(0, 0, cw, ch);

  /* pared del galpón al fondo, casi invisible en la oscuridad */
  const pared = Math.max(16, ey - ery * 1.9);
  for(let y = 0, fila = 0; y < pared; y += 5, fila++){
    for(let x = -(fila % 2) * 6; x < cw; x += 12){
      const v = 7 + Math.floor(R() * 5);
      g.fillStyle = `rgb(${v},${v + 1},${v + 6})`; g.fillRect(x, y, 11, 4);
    }
  }
  g.fillStyle = '#0b0d16'; g.fillRect(0, pared - 2, cw, 2);

  /* piso de cemento: la luz de la lámpara cae al centro y se pierde en lo oscuro */
  g.save(); g.translate(ex, ey); g.scale(1, ery / erx);
  const L = erx * 2.1;
  const luz = g.createRadialGradient(0, -erx * .05, 0, 0, 0, L);
  luz.addColorStop(0, '#d8c79c'); luz.addColorStop(.22, '#a89d7c'); luz.addColorStop(.42, '#5a5648');
  luz.addColorStop(.6, '#22232a'); luz.addColorStop(.8, '#0c0d13'); luz.addColorStop(1, '#05060b');
  g.fillStyle = luz; g.fillRect(-L * 1.6, -L * 1.2, L * 3.2, L * 2.4);
  /* losas, grietas y manchas */
  const lado = Math.max(8, erx * .16);
  g.fillStyle = 'rgba(0,0,0,.18)';
  for(let x = -L; x < L; x += lado) g.fillRect(Math.round(x), -L, 1, L * 2);
  for(let y = -L; y < L; y += lado) g.fillRect(-L, Math.round(y), L * 2, 1.4);
  for(let k = 0; k < 14; k++){
    const r = erx * azar(.06, .2);
    g.fillStyle = `rgba(0,0,0,${azar(.06, .16)})`;
    g.beginPath(); g.ellipse(azar(-erx, erx) * 1.2, azar(-erx, erx) * 1.2, r, r * azar(.5, 1), R() * 3, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1;
  for(let k = 0; k < 22; k++){
    let x = azar(-erx, erx) * 1.3, y = azar(-erx, erx) * 1.3;
    g.beginPath(); g.moveTo(x, y);
    for(let j = 0; j < 4; j++){ x += azar(-1, 1) * erx * .08; y += azar(-1, 1) * erx * .08; g.lineTo(x, y); }
    g.stroke();
  }
  /* la arena pintada a mano, gastada: aro, línea del medio y la Pokébola */
  g.globalAlpha = .55;
  g.strokeStyle = '#e9e2cf'; g.lineWidth = 2.2;
  for(let a = 0; a < Math.PI * 2; a += .09){
    if(R() < .16) continue;                       // pintura saltada
    g.beginPath(); g.arc(0, 0, erx, a, a + .07); g.stroke();
  }
  g.lineWidth = 1.2; g.globalAlpha = .3;
  g.beginPath(); g.arc(0, 0, erx * .86, 0, Math.PI * 2); g.stroke();
  g.globalAlpha = .4; g.fillStyle = '#e9e2cf'; g.fillRect(-erx, -.7, erx * 2, 1.4);
  const rb = erx * .19;
  g.globalAlpha = .62;
  g.fillStyle = '#b5463c'; g.beginPath(); g.arc(0, 0, rb, Math.PI, 0); g.fill();
  g.fillStyle = '#ddd3b8'; g.beginPath(); g.arc(0, 0, rb, 0, Math.PI); g.fill();
  g.strokeStyle = '#1e2030'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, rb, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(-rb, 0); g.lineTo(rb, 0); g.stroke();
  g.fillStyle = '#ddd3b8'; g.beginPath(); g.arc(0, 0, rb * .32, 0, 7); g.fill(); g.stroke();
  g.globalAlpha = 1;
  /* brillo de la lámpara reflejado en el piso */
  const brillo = g.createRadialGradient(0, -erx * .12, 0, 0, -erx * .12, erx * .45);
  brillo.addColorStop(0, 'rgba(255,248,220,.38)'); brillo.addColorStop(1, 'rgba(255,248,220,0)');
  g.fillStyle = brillo; g.fillRect(-erx, -erx, erx * 2, erx * 2);
  g.restore();

  /* cosas tiradas en la penumbra: cajones, un barril y una tarima */
  const cajon = (x, y, w, h) => {
    g.fillStyle = '#17140f'; g.fillRect(x, y - h, w, h);
    g.fillStyle = '#231e16'; g.fillRect(x, y - h, w, 2);
    g.fillStyle = '#0c0a07'; g.fillRect(x + 1, y - h + 3, w - 2, 1); g.fillRect(x + 1, y - h * .5, w - 2, 1);
    g.fillRect(x + 1, y - h + 1, 1, h - 2); g.fillRect(x + w - 2, y - h + 1, 1, h - 2);
  };
  const barril = (x, y, w, h) => {
    g.fillStyle = '#141619'; g.fillRect(x, y - h, w, h);
    g.fillStyle = '#20242a'; g.fillRect(x + 1, y - h, Math.max(1, w * .25), h);
    g.fillStyle = '#0a0b0d'; g.fillRect(x, y - h * .7, w, 1); g.fillRect(x, y - h * .3, w, 1);
  };
  const s = Math.max(6, erx * .09);
  cajon(ex - erx * 1.55, ey - ery * .55, s * 1.6, s * 1.3); cajon(ex - erx * 1.42, ey - ery * .6, s * 1.2, s * 2);
  barril(ex + erx * 1.38, ey - ery * .62, s, s * 1.5); cajon(ex + erx * 1.5, ey - ery * .5, s * 1.5, s * 1.2);
  cajon(ex - erx * 1.65, ey + ery * .7, s * 1.8, s * 1.1); barril(ex + erx * 1.6, ey + ery * .75, s * 1.1, s * 1.6);

  /* viñeta fuerte: todo lo que no está bajo la lámpara se va a negro */
  const vig = g.createRadialGradient(ex, ey, Math.min(erx, ery) * .9, ex, ey, Math.max(cw, ch) * .7);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.75)');
  g.fillStyle = vig; g.fillRect(0, 0, cw, ch);
  posterizar(g, cw, ch);
}

function posterizar(g, cw, ch){
  const img = g.getImageData(0, 0, cw, ch), d = img.data, paso = 14;
  for(let y = 0; y < ch; y++) for(let x = 0; x < cw; x++){
    const i = (y * cw + x) * 4;
    const b = (BAYER[(x & 3) + (y & 3) * 4] - 7.5) * 1.1;
    d[i] = Math.min(255, Math.max(0, Math.round((d[i] + b) / paso) * paso));
    d[i + 1] = Math.min(255, Math.max(0, Math.round((d[i + 1] + b) / paso) * paso));
    d[i + 2] = Math.min(255, Math.max(0, Math.round((d[i + 2] + b) / paso) * paso));
  }
  g.putImageData(img, 0, 0);
}

function acomodarEscena(){
  const th = 72 * G.K * ESCALA_ENTRENADOR, tw = 48 * G.K * ESCALA_ENTRENADOR;
  [['riv', G.cx - G.rx * 1.12, G.cy - G.ry * .15], ['yo', G.cx + G.rx * 1.12, G.cy + G.ry * .25]].forEach(([l, x, y]) => {
    const t = ST.querySelector('.ar-ent-sprite.' + l);
    x = Math.min(G.W - tw / 2 - 2, Math.max(tw / 2 + 2, x));
    Object.assign(t.style, {width:tw + 'px', height:th + 'px', left:x + 'px', top:y + 'px', zIndex:Math.round(y)});
  });
  /* lámpara colgante sobre el centro y su cono de luz hasta el piso */
  const lamp = ST.querySelector('.ar-lampara'), cono = ST.querySelector('.ar-cono');
  const ly = Math.min(Math.max(G.hudH * .95, G.cy - G.ry * 2.2), G.cy - G.ry * .9), tam = Math.max(18, G.rx * .14);   // debajo de los botones de arriba
  Object.assign(lamp.style, {left:G.cx + 'px', top:'0px', height:ly + 'px', '--tam':tam + 'px'});
  Object.assign(cono.style, {left:G.cx + 'px', top:(ly + tam * .3) + 'px', height:(G.cy + G.ry * .9 - ly) + 'px', width:(G.rx * 2.3) + 'px'});
  const motas = ST.querySelector('.ar-motas');
  if(motas && !motas.childElementCount && !REDUCE){
    for(let i = 0; i < 16; i++){
      const m = document.createElement('i');
      m.style.left = azar(30, 70) + '%'; m.style.top = azar(5, 90) + '%';
      m.style.animationDuration = azar(5, 11) + 's'; m.style.animationDelay = -azar(0, 10) + 's';
      motas.appendChild(m);
    }
  }
  if(motas) Object.assign(motas.style, {left:G.cx + 'px', top:(ly + tam) + 'px', height:(G.cy - ly) + 'px', width:(G.rx * 1.2) + 'px'});
}

function alCambiarTamano(){
  if(!ST) return;
  medir(); pintarFondo(); acomodarEscena();
  AR.lados.forEach(l => { if(E[l]) tamanoSprite(E[l]); });
}

/* ---------------- efectos pixel ---------------- */
/* Partículas con forma: llama, gota, chispa, hoja, cristal, burbuja, humo, nota, corazón,
   pluma, estrella, roca (o un cuadradito si no se pide forma). */
function particula(x, y, col, tam, dx, dy, dur, o){
  if(!FX) return;
  o = o || {};
  const f = o.forma, texto = f === 'nota' || f === 'corazon';
  const d = mk('ar-p' + (f ? ' p-' + f : ''), {left:x + 'px', top:y + 'px', width:tam + 'px', height:(f === 'chispa' ? Math.max(2, tam * .28) : tam) + 'px',
    background:texto || f === 'burbuja' ? 'none' : col, color:col, fontSize:(tam * 1.5) + 'px', opacity:0}, o.capa);
  if(texto) d.textContent = f === 'nota' ? (Math.random() < .5 ? '♪' : '♫') : '♥';
  const g = o.g || 0, rot = o.rot || 0, s0 = o.s0 || 1, s1 = o.s1 == null ? 1 : o.s1, r0 = o.rot0 || 0;
  const T = (px, py, r, s) => `translate(-50%,-50%) translate(${px}px,${py}px) rotate(${r}deg) scale(${s})`;
  const kf = [
    {transform:T(0, 0, r0, s0), opacity:o.op || 1},
    {transform:T(dx * .6, dy * .6 + g * .3, r0 + rot, (s0 + s1) / 2), opacity:o.op || 1, offset:.6},
    {transform:T(dx, dy + g, r0 + rot * 2, s1), opacity:0}
  ];
  if(o.colores){ kf[0].backgroundColor = o.colores[0]; kf[1].backgroundColor = o.colores[1]; kf[2].backgroundColor = o.colores[2]; }
  const a = d.animate(kf, {duration:dur, delay:o.delay || 0, easing:o.suave ? 'ease-out' : 'steps(7,end)', fill:'forwards'});
  const quitar = () => d.remove();
  a.finished.then(quitar, quitar);
}

/* Cómo estalla cada elemento: formas, colores, gravedad (+ cae, − sube) y movimiento. */
const ELEM = {
  fire:    {f:['llama'], c:['#FFF3B0', '#F7D02C', '#EE8130'], g:-1.5, seq:['#FFF6C8', '#F08A2C', '#7a2410']},
  water:   {f:['gota', 'gota', 'burbuja'], c:['#6390F0', '#BCD2FF', '#ffffff'], g:1.7},
  electric:{f:['chispa'], c:['#F7D02C', '#ffffff', '#FFF59A'], g:0, m:'zap'},
  grass:   {f:['hoja'], c:['#7AC74C', '#3F8A2A', '#B5E07A'], g:.7, gira:true},
  ice:     {f:['cristal', 'cristal', null], c:['#96D9D6', '#ffffff', '#D8F6FF'], g:.4},
  fighting:{f:['estrella', null], c:['#ffffff', '#F7D02C', '#ff8a5c'], g:0},
  poison:  {f:['burbuja', 'humo'], c:['#A33EA1', '#D68AD4', '#6b2a6a'], g:-.8},
  ground:  {f:['roca', 'humo'], c:['#E2BF65', '#8A6D2A', '#c9b98a'], g:1.3},
  flying:  {f:['pluma', null], c:['#ffffff', '#DCD3FF'], g:.25, m:'viento', gira:true},
  psychic: {f:['burbuja', 'estrella'], c:['#F95587', '#FFD0DF', '#C77DFF'], g:0, m:'anillo'},
  bug:     {f:[null, 'hoja'], c:['#A6B91A', '#DFE88A'], g:.5},
  rock:    {f:['roca'], c:['#B6A136', '#6D5F1F', '#8a7a3a'], g:1.9},
  ghost:   {f:['humo'], c:['#735797', '#2B1F45', '#C9B5F0'], g:-1},
  dragon:  {f:['llama'], c:['#B49CFF', '#6F35FC', '#ffffff'], g:-.9, seq:['#ffffff', '#9b6bff', '#2c1470']},
  fairy:   {f:['estrella', 'corazon', 'estrella'], c:['#FFB3D9', '#ffffff', '#FFE27A'], g:-.6},
  dark:    {f:['humo'], c:['#3a2c24', '#705746', '#120c08'], g:-.5},
  steel:   {f:['chispa', null], c:['#E0E0F0', '#ffffff'], g:.6},
  normal:  {f:['estrella', null], c:['#ffffff', '#E8E4D0'], g:.2}
};
const elemDe = t => ELEM[t] || ELEM.normal;

/* Una partícula suelta del elemento (para estelas y auras). */
function chispa(x, y, tipo, k, dx, dy, dur, extra){
  const st = elemDe(tipo), U = u(), f = elige(st.f), tam = Math.max(2, azar(.9, 1.8) * U * (k || 1));
  const o = Object.assign({forma:f, g:(st.g || 0) * U * 4 * (k || 1)}, extra);
  if(f === 'llama'){ Object.assign(o, {s0:.6, s1:1.8, colores:st.seq, suave:true}); }
  else if(f === 'humo'){ Object.assign(o, {s0:.6, s1:2.4, op:.7, suave:true}); dur *= 1.5; }
  else if(f === 'burbuja'){ Object.assign(o, {suave:true}); }
  else if(f === 'chispa'){ o.rot0 = Math.atan2(dy, dx) * 180 / Math.PI; }
  else if(f === 'hoja' || f === 'pluma' || f === 'roca' || f === 'estrella' || f === 'cristal'){ o.rot = azar(-180, 180); }
  particula(x, y, elige(st.c), f === 'chispa' ? tam * 2.4 : tam, dx, dy, dur, o);
}

function estallido(x, y, tipo, n, k){
  const st = elemDe(tipo), U = u();
  n = REDUCE ? Math.ceil(n / 3) : n; k = k || 1;
  for(let i = 0; i < n; i++){
    const ang = Math.random() * Math.PI * 2, dist = azar(3, 9) * U * k;
    let dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
    if(st.m === 'viento'){ dy *= .25; dx *= 1.7; }
    if(st.m === 'anillo'){ dx = Math.cos(ang) * 8 * U * k; dy = Math.sin(ang) * 8 * U * k; }
    if(st.m === 'zap'){ dx = Math.round(dx / U) * U; dy = Math.round(dy / U) * U; }
    chispa(x, y, tipo, k, dx, dy, azar(380, 640));
  }
}

/* Estela que deja un proyectil o un golpe en movimiento. */
function rastro(x, y, tipo, k){
  const U = u();
  chispa(x + azar(-1, 1) * U, y + azar(-1, 1) * U, tipo, (k || 1) * .8, azar(-1.5, 1.5) * U, azar(-1.5, 1.5) * U, 340);
}

function polvo(x, y, n, k){
  const U = u();
  for(let i = 0; i < n; i++){
    particula(x + azar(-2, 2) * U, y, elige(['#b9ae8a', '#8f8768', '#d6cba3']), Math.max(2, azar(.7, 1.3) * U * (k || 1)),
      azar(-3, 3) * U, -azar(.5, 2.2) * U, azar(320, 520), {op:.7, capa:PISO});
  }
}

function texto(x, y, txt, color, tam){
  if(!FX) return;
  const d = mk('ar-txt', {left:x + 'px', top:y + 'px', color:color || '#fff',
    fontSize:Math.max(12, u() * (tam || 3.4)) + 'px'});
  d.textContent = txt;
  const a = d.animate([
    {transform:'translate(-50%,0) scale(1.6)', opacity:0},
    {transform:`translate(-50%,${-u() * 2}px) scale(1)`, opacity:1, offset:.18},
    {transform:`translate(-50%,${-u() * 7}px) scale(1)`, opacity:1, offset:.75},
    {transform:`translate(-50%,${-u() * 9}px) scale(.9)`, opacity:0}
  ], {duration:1050, easing:'steps(12,end)', fill:'forwards'});
  const quitar = () => d.remove();
  a.finished.then(quitar, quitar);
}

function sacudir(fuerza, zoom){
  if(REDUCE || !SHAKE) return;
  const p = u() * (fuerza || 1), z = zoom ? 1.03 : 1;
  SHAKE.animate([
    {transform:`translate(0,0) scale(${z})`}, {transform:`translate(${-p}px,${p * .4}px) scale(${z})`},
    {transform:`translate(${p}px,${-p * .4}px)`}, {transform:`translate(${-p * .6}px,0)`}, {transform:'translate(0,0)'}
  ], {duration:280, easing:'steps(5,end)'});
}

function tajos(x, y, color, dir){
  const U = u(), ang = dir < 0 ? 35 : -35;
  for(let i = 0; i < 3; i++){
    const d = mk('ar-tajo', {left:(x + (i - 1) * 2.2 * U) + 'px', top:(y + (i - 1) * 1.1 * U) + 'px',
      width:(9 * U) + 'px', height:Math.max(3, 1 * U) + 'px', background:'#fff', boxShadow:`0 0 0 ${Math.max(1, U * .4)}px ${color}`});
    const a = d.animate([
      {transform:`translate(-50%,-50%) rotate(${ang}deg) scaleX(0)`, opacity:1},
      {transform:`translate(-50%,-50%) rotate(${ang}deg) scaleX(1)`, opacity:1, offset:.45},
      {transform:`translate(-50%,-50%) rotate(${ang}deg) scaleX(1)`, opacity:0}
    ], {duration:340, delay:i * 60, easing:'steps(6,end)', fill:'both'});
    const quitar = () => d.remove();
    a.finished.then(quitar, quitar);
  }
}

function destello(x, y, k){
  if(!FX) return;
  const f = mk('ar-flash', {left:x + 'px', top:y + 'px', width:(10 * u() * (k || 1)) + 'px', height:(10 * u() * (k || 1)) + 'px'});
  const a = f.animate([{transform:'translate(-50%,-50%) scale(.2)', opacity:.95}, {transform:'translate(-50%,-50%) scale(2.6)', opacity:0}],
    {duration:380, easing:'steps(6,end)'});
  const q = () => f.remove(); a.finished.then(q, q);
}

/* Marca que queda en el piso (quemadura, charco, cráter) y se va borrando. */
function marca(x, y, r, col){
  if(!PISO) return;
  const d = mk('ar-marca', {left:x + 'px', top:y + 'px', width:r * 2 + 'px', height:r * 2 * G.pz + 'px',
    background:`radial-gradient(closest-side, rgba(10,10,20,.55), ${col}55 60%, transparent 100%)`}, PISO);
  const a = d.animate([{opacity:.95}, {opacity:.95, offset:.6}, {opacity:0}], {duration:6500, fill:'forwards'});
  const q = () => d.remove(); a.finished.then(q, q);
}

/* Copia del sprite que se desvanece: estela al esquivar o embestir. Al esquivar
   va suave (pocas copias, tenues y sin brillo) para no tapar la pelea. */
function fantasma(e, col, suave){
  if(!PISO || REDUCE || !e.spr.naturalWidth) return;
  const s = ST.getBoundingClientRect(), r = e.spr.getBoundingClientRect();
  if(!r.width) return;
  const g = document.createElement('img');
  g.src = e.spr.src; g.alt = ''; g.className = 'ar-fant';
  Object.assign(g.style, {left:(r.left - s.left) + 'px', top:(r.top - s.top) + 'px', width:r.width + 'px', height:r.height + 'px',
    filter:suave ? 'saturate(.6)' : `brightness(1.7) drop-shadow(0 0 3px ${col})`, transform:`scaleX(${e.flipAp})`});
  PISO.appendChild(g);
  const a = g.animate([{opacity:suave ? .28 : .5}, {opacity:0}], {duration:suave ? 180 : 260, easing:'steps(4,end)', fill:'forwards'});
  const q = () => g.remove(); a.finished.then(q, q);
}

/* En los golpes grandes la lámpara se hamaca y parpadea. */
function festejo(fuerte){
  if(!ST || REDUCE) return;
  const l = ST.querySelector('.ar-luz');
  if(l) l.animate([{transform:'rotate(0)', opacity:1}, {transform:`rotate(${fuerte ? 4 : 2}deg)`, opacity:.55, offset:.15},
    {transform:`rotate(${fuerte ? -3 : -1.5}deg)`, opacity:1, offset:.4}, {transform:'rotate(1.5deg)', opacity:.75, offset:.6}, {transform:'rotate(0)', opacity:1}],
    {duration:fuerte ? 1200 : 700, easing:'ease-in-out'});
}

/* ---------------- entidades ---------------- */
/* La fuerza del ejemplar (1-100) mueve vida y golpe un ±10%: el tuyo es tu mejor
   ejemplar; el del rival se sortea como cualquier figurita nueva. */
/* Ataques puestos a mano en un ejemplar (regalos): ej.m = [corto, medio, largo]; cada uno 'Nombre' (del catálogo),
   'Nombre|efecto' o 'Nombre|efecto|forma'. null = el que le tocaba por su serie. */
function movsFijos(m, base){
  const out = Object.assign({}, base);
  ATAQUES.forEach((alc, k) => {
    const e = m[k]; if(!e) return;
    const [nom, fx, forma] = String(e).split('|');
    const d = MOVS_CAT.find(x => x[0] === nom); if(!d) return;
    const f = fx || d[2];
    out[alc] = {n:d[0], tipo:d[1], fx:f, forma:forma || (!fx && d[4]) || FORMA_FX[f] || 'bola'};
  });
  return out;
}
function crearMon(p, rival, ejFijo){
  const ej = ejFijo || (rival ? null : mejorEjemplar(p.id));
  const fz = ejFijo ? ejFijo.f : rival ? fuerzaRival() : ((ej || {}).f || 50);
  const k = .9 + fz / 500, bst = bstDe(p), max = Math.round((60 + bst * .22) * k);
  /* los ataques salen del número de serie del ejemplar (siempre los mismos para esa figurita);
     el rival, como no tiene ejemplar guardado, saca unos al azar en cada pelea */
  let movs = movsDe(p, ej ? (ej.c || '') + ':' + ej.f : Math.random());
  if(ej && Array.isArray(ej.m)) movs = movsFijos(ej.m, movs);
  return {p, bst, max, hp:max, en:EN_MAX, vivo:true, st:statsDe(p), fz, k, vario:!!(ej && ej.s), movs};
}
function crearEntidad(lado){
  const amigo = lado === 'yo' || (AR.bando && AR.bando[lado] === AR.bando.yo);
  const w = $('arMon-' + lado);
  const e = {lado, wrap:w, cuerpo:w.querySelector('.ar-cuerpo'), flip:w.querySelector('.ar-flip'), giroEl:w.querySelector('.ar-giro'),
    rot:w.querySelector('.ar-rot'), imgs:{frente:w.querySelector('.ar-spr.frente'), espalda:w.querySelector('.ar-spr.espalda')},
    sombra:w.querySelector('.ar-sombra'), refl:w.querySelector('.ar-reflejo img'),
    vista:amigo ? 'espalda' : 'frente', vistaQ:null, flipAp:1, girando:false, giroT:0,
    x:0, y:0, vx:0, vy:0, rvx:0, rvy:0, px:null, py:null, kx:0, ky:0, fase:0, polvoT:0, fantT:0, cara:amigo ? -1 : 1,
    quieto:0, pose:null, accion:null, cd:{corto:0, medio:0, largo:0, esq:0}, stun:0, invul:0, tEsq:0,
    rodando:false, w:40, h:40, s:1, mon:null, aparece:0, bot:null};
  /* el sprite que se ve: de frente o de espalda según hacia dónde mira */
  Object.defineProperty(e, 'spr', {get(){ return this.imgs[this.vista]; }});
  return e;
}
const pie = e => ({x:G.cx + e.x * G.rx, y:G.cy + e.y * G.ry});
const cen = e => { const p = pie(e); return {x:p.x, y:p.y - e.h * e.s * .45}; };
const radio = e => Math.max(10, Math.min(e.w, e.h) * e.s * .38);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const unit = (a, b) => { const d = dist(a, b) || 1; return {x:(b.x - a.x) / d, y:(b.y - a.y) / d}; };
const velMax = e => VEL_BASE * u() * (e.mon ? e.mon.st.vel : 1);

function encerrar(e){
  const r = Math.hypot(e.x, e.y);
  if(r > .96){ e.x *= .96 / r; e.y *= .96 / r; }
  /* que la cabeza no se meta debajo de los HUD de arriba */
  const yMin = (G.hudH + e.h * e.s * .8 - G.cy) / G.ry;
  if(e.y < yMin) e.y = Math.min(yMin, .9);
}
function empujar(e, dx, dy){ e.x += dx / G.rx; e.y += dy / G.ry; encerrar(e); }

function medidas(e, img){
  const sf = ESCALA_POKE[escalaLado(e)] * (AR && AR.zoom || 1) * (img.dataset.fb ? .25 : 1) * ((e.mon && e.mon.p.escala) || 1);   // escala: sprites de Showdown más grandes que los de siempre
  return {w:img.naturalWidth * G.K * sf, h:img.naturalHeight * G.K * sf};
}
function tamanoSprite(e){
  for(const v of ['frente', 'espalda']){
    const img = e.imgs[v]; if(!img.naturalWidth) continue;
    const m = medidas(e, img); img.style.width = m.w + 'px'; img.style.height = m.h + 'px';
  }
  const vis = e.spr; if(!vis.naturalWidth) return;
  const m = medidas(e, vis); e.w = m.w; e.h = m.h;
  e.refl.style.width = m.w + 'px'; e.refl.style.height = m.h + 'px';
  e.sombra.style.width = e.w * .8 + 'px'; e.sombra.style.height = Math.max(5, e.w * .2) + 'px';
}
function mostrarVista(e){
  e.imgs.frente.classList.toggle('vis', e.vista === 'frente');
  e.imgs.espalda.classList.toggle('vis', e.vista === 'espalda');
  if(e.spr.src) e.refl.src = e.spr.src;
  tamanoSprite(e);
}

function ponerSprite(e){
  const mon = e.mon;
  e.giroEl.style.opacity = '0';
  for(const v of ['frente', 'espalda']){
    const img = e.imgs[v];
    img.removeAttribute('data-fb'); img.removeAttribute('data-rs');
    img.onload = () => { tamanoSprite(e); if(v === e.vista){ e.refl.src = img.src; e.giroEl.style.opacity = '1'; } };
    img.onerror = () => {
      /* shiny que jsDelivr no sirve: probar GitHub directo y después la versión normal */
      if(mon.vario && /^https?:/.test(img.src) && img.src.includes('/shiny/') && !img.dataset.fb){ respaldoShiny(img); if(img.dataset.rs <= 2) return; }
      if(img.dataset.fb) return;
      img.dataset.fb = '1';     // si no carga el animado, la ilustración oficial (en chico)
      img.src = mon.vario ? imgVario(mon.p) : mon.p.img;
    };
    img.alt = mon.p.name;
    img.src = v === 'frente' ? spFrente(mon.p.id, mon.vario) : spEspalda(mon.p.id, mon.vario);
  }
  mostrarVista(e);
  e.rot.style.setProperty('--tc', TYPE_COLORS[mon.p.type]);
  e.wrap.classList.toggle('ar-aura-oscura', mon.p.aura === 'oscura');   // sólo los Apex Oscuros
}

/* Mirar ya hacia el rival, sin animación (al entrar a la arena). */
function orientarYa(e){
  const O = otro(e);
  if(!O || !O.mon) return;
  const d = unit(pie(e), pie(O));
  e.vista = e.vistaQ = d.y > 0 ? 'frente' : 'espalda';
  e.cara = Math.sign(d.x) || e.cara;
  e.flipAp = e.cara === (e.vista === 'frente' ? -1 : 1) ? 1 : -1;
  e.flip.style.transform = `scaleX(${e.flipAp})`;
  mostrarVista(e);
}

/* Darse vuelta: se angosta de costado, cambia de lado (o de frente a espalda) y se abre
   de nuevo, con un saltito. Así se entiende que gira y se le ve la cara del otro lado. */
function girar(e, vista, flip){
  e.girando = true;
  const cambia = vista !== e.vista;
  if(cambia) e.giroT = .22;
  const a = e.giroEl.animate([{transform:'scaleX(1)'}, {transform:'scaleX(.06)'}], {duration:cambia ? 90 : 70, easing:'ease-in', fill:'forwards'});
  a.finished.then(() => {
    e.vista = vista; e.flipAp = flip;
    e.flip.style.transform = `scaleX(${flip})`;
    if(cambia) mostrarVista(e);
    const b = e.giroEl.animate([{transform:'scaleX(.06)'}, {transform:'scaleX(1)'}], {duration:cambia ? 110 : 80, easing:'ease-out'});
    a.cancel();
    const listo = () => { e.girando = false; };
    b.finished.then(listo, listo);
  }, () => { e.girando = false; });
}

function clase(e, nombre, ms){
  e.wrap.classList.remove(nombre); void e.wrap.offsetWidth; e.wrap.classList.add(nombre);
  if(ms) setTimeout(() => e.wrap.classList.remove(nombre), ms);
}

/* El cuerpo: hacia dónde mira (frente/espalda e izquierda/derecha), saltitos al caminar,
   inclinación, aplastar/estirar, respiración y la pose del ataque en curso. */
function dibujar(e, dt){
  const p = pie(e);
  e.s = .9 + .18 * ((e.y + 1) / 2);
  if(dt > 0){
    if(e.px != null){
      const k = 1 - Math.exp(-dt * 18);
      e.rvx += ((p.x - e.px) / dt - e.rvx) * k; e.rvy += ((p.y - e.py) / dt - e.rvy) * k;
    }
    e.px = p.x; e.py = p.y;
  }
  const vmax = velMax(e), vel = Math.hypot(e.rvx, e.rvy), mov = lim(vel / vmax, 0, 1.6);
  const O = otro(e);
  if(e.vistaQ == null) e.vistaQ = e.vista;
  /* hacia dónde quiere mirar: al rival si ataca o está quieto; si no, hacia donde camina */
  let d = null;
  if(vel > vmax * .25 && !(e.accion && e.accion.tipo !== 'esquivar')){ d = {x:e.rvx / vel, y:e.rvy / vel}; e.quieto = 0; }
  else {
    if(dt > 0) e.quieto += dt;
    if((e.accion && e.accion.tipo !== 'esquivar') || e.quieto > .5) if(O && O.mon) d = unit(p, pie(O));
  }
  if(d){
    if(Math.abs(d.x) > .22) e.cara = Math.sign(d.x);
    if(d.y > .38) e.vistaQ = 'frente'; else if(d.y < -.38) e.vistaQ = 'espalda';
  }
  /* los de frente miran a la izquierda y los de espalda a la derecha */
  const flipQ = e.cara === (e.vistaQ === 'frente' ? -1 : 1) ? 1 : -1;
  if((e.vistaQ !== e.vista || flipQ !== e.flipAp) && !e.girando && e.mon && e.mon.vivo && e.aparece <= 0 && !e.rodando) girar(e, e.vistaQ, flipQ);

  let sx = 1, sy = 1, rot = 0, dx = 0, dy = 0, hop = 0;
  const t = performance.now() / 1000;
  if(mov > .15 && !e.rodando){
    e.fase += dt * (5.5 + 5 * mov);
    const s = Math.abs(Math.sin(e.fase * Math.PI));
    hop = s * Math.min(1, mov) * e.h * .09;
    const sq = (1 - s) * .07 * Math.min(1, mov);
    sx += sq; sy -= sq;
    rot += lim(e.rvx / vmax, -1.2, 1.2) * 9;
    if(dt > 0){
      e.polvoT -= dt;
      if(e.polvoT <= 0 && s < .25){ e.polvoT = .18; polvo(p.x, p.y, 2, .9); }
    }
  } else {
    const b = Math.sin(t * 3.1 + (e.lado === 'yo' ? 0 : 1.7));
    sy += b * .028; sx -= b * .014;
  }
  if(e.giroT > 0){ hop += Math.sin((1 - e.giroT / .22) * Math.PI) * e.h * .12; if(dt > 0) e.giroT -= dt; }
  if(e.pose){ sx *= e.pose.sx || 1; sy *= e.pose.sy || 1; rot += (e.pose.rot || 0) * e.cara; dx += (e.pose.dx || 0) * e.cara; dy += e.pose.dy || 0; }
  if(e.stun > 0){ rot -= e.cara * 12 * Math.min(1, e.stun / .2); dx += azar(-1, 1) * e.h * .03; }
  e.wrap.style.transform = `translate(${p.x}px,${p.y}px) scale(${e.s})`;
  e.wrap.style.zIndex = Math.round(p.y) + 10;
  e.cuerpo.style.transform = `translate(${dx}px,${dy - hop}px) rotate(${rot}deg) scale(${sx},${sy})`;
  /* reflejo en el cemento: la misma figura dada vuelta, que se aleja cuando salta */
  e.refl.parentNode.style.transform = `translate(-50%,0) translate(${dx}px,${hop - dy}px) scale(${e.flipAp * sx},${-sy})`;
  e.refl.style.opacity = e.giroEl.style.opacity === '0' ? 0 : '';
  const somb = 1 - Math.min(.5, (hop - dy) / (e.h || 1) * 1.6);
  e.sombra.style.transform = `translate(-50%,-50%) scale(${somb})`;
  if(dt > 0 && (e.rodando || (e.accion && ((e.accion.tipo === 'corto' && e.accion.t > .08 && e.accion.t < .3) || (e.accion.dash && !e.accion.dash.pego && e.accion.dash.t < .3))))){
    e.fantT -= dt;
    if(e.fantT <= 0){ e.fantT = e.rodando ? .11 : .05; fantasma(e, TYPE_COLORS[e.mon.p.type], e.rodando); }
  }
}

/* ---------------- HUD ---------------- */
function ventaja(a, b){
  const sc = m => m === 0 ? -2 : (m > 1 ? 1 : (m < 1 ? -1 : 0));
  return sc(efectividad(a.p.type, b.p.type)) - sc(efectividad(b.p.type, a.p.type));
}

function pintarHud(){
  AR.lados.forEach(lado => {
    const eq = AR[lado], m = eq.act, h = $('arHud-' + lado);
    if(!m) return;
    h.querySelector('.n').textContent = m.p.name;
    h.querySelector('.t').textContent = TYPE_LABEL[m.p.type];
    const fr = m.hp / m.max, hp = h.querySelector('.hp');
    hp.style.width = (fr * 100) + '%';
    hp.style.background = fr > .5 ? '#3DDC6E' : (fr > .2 ? '#F7B731' : '#F0463C');
    h.querySelector('.ar-num').textContent = `PS ${Math.max(0, Math.round(m.hp))}/${m.max}`;
    h.querySelectorAll('.ar-bola').forEach((b, i) => {
      b.classList.toggle('muerta', !eq.mons[i].vivo);
      b.classList.toggle('activa', i === eq.idx);
    });
  });
  const oy = otro(E.yo), v = oy && oy.mon ? ventaja(AR.yo.act, oy.mon) : 0, vb = $('arHud-yo').querySelector('.v');
  vb.textContent = v > 0 ? '▲ ventaja' : (v < 0 ? '▼ desventaja' : '');
  vb.className = 'v ' + (v > 0 ? 'bien' : (v < 0 ? 'mal' : ''));
  pintarBotones();
}

function pintarEnergia(){
  AR.lados.forEach(l => {
    const m = AR[l].act; if(!m) return;
    const i = $('arHud-' + l).querySelector('.en i'), w = (m.en / EN_MAX * 100).toFixed(0) + '%';
    if(i.style.width !== w) i.style.width = w;
  });
}

function decir(txt){ const l = $('arLog'); if(l) l.textContent = txt; }

function pintarBotones(){
  const m = AR.yo.act; if(!m) return;
  const col = TYPE_COLORS[m.p.type];
  ATAQUES.forEach(k => {
    const b = $('arB-' + k); if(!b) return;
    const n = nombreAtaque(m, k), el = b.querySelector('b');
    el.textContent = n;
    /* que las palabras largas (Aerochorro, Autodestrucción) entren enteras en el botón del celular */
    const larga = Math.max(...n.split(' ').map(w => w.length));
    el.style.fontSize = larga > 12 ? '9px' : larga > 9 ? '10px' : '';
    b.style.borderColor = col;
  });
}

function pintarCooldowns(){
  const e = E.yo, m = e.mon; if(!m) return;
  const set = (id, cd, tot, coste) => {
    const b = $(id); if(!b) return;
    b.querySelector('.cd').style.height = (cd > 0 ? Math.min(1, cd / tot) * 100 : 0).toFixed(0) + '%';
    b.classList.toggle('sinEn', m.en < coste);
    b.classList.toggle('listo', cd <= 0 && m.en >= coste);
  };
  ATAQUES.forEach(k => set('arB-' + k, e.cd[k], ALC[k].cd, ALC[k].coste));
  set('arB-esquivar', e.cd.esq, ESQ.cd, ESQ.coste);
  const cb = $('arB-equipo');
  if(cb) cb.disabled = !AR.yo.mons.some((x, i) => x.vivo && i !== AR.yo.idx) || AR.cambioCd > 0;
}

/* ---------------- combate ---------------- */
function calcularDanio(a, d, alc, tipoMov, pot){
  const mult = efectividad(tipoMov, d.p.type), f = factorTipo(mult);
  const crit = f > 0 && Math.random() < a.st.crit;
  let dmg = ALC[alc].poder * Math.sqrt(a.bst / d.bst) * f * (a.k || 1) * (pot || 1) * azar(.9, 1.1) * (crit ? a.st.critMult : 1);
  dmg = f === 0 ? 0 : Math.max(1, Math.round(dmg));
  return {dmg, mult, crit};
}

/* Devuelve true si el golpe pegó (false: esquivado, protegido o inmune). */
function golpear(att, def, alc, x, y){
  if(!def.mon.vivo) return false;
  if(AR.bando[att.lado] === AR.bando[def.lado]) return false;   // no se pegan entre compañeros
  if(AR.online && def.lado !== 'yo') return false;   // en duelo, el daño de los otros lo decide SU celular (llega por golpeRemoto)
  const mov = movDe(att.mon, alc), tipo = mov.tipo;
  const c = cen(def), arriba = c.y - def.h * def.s * .6, ahora = performance.now();
  const roce = def.rodando && alc === 'largo';
  if(def.rodando && !roce){
    if(ahora - def.tEsq > 400){
      texto(c.x, arriba, '¡Esquivó!', '#8be9ff', 3.6);
      def.mon.en = Math.min(EN_MAX, def.mon.en + EN_PREMIO_ESQUIVE);
      if(def.lado === 'yo') sfx('esquive');
      if(AR.online) enviarRed({k:'g', r:'esq'});
    }
    def.tEsq = ahora;
    return false;
  }
  if(def.invul > 0) return false;
  const res = calcularDanio(att.mon, def.mon, alc, tipo, mov.pot), d = def.mon;
  if(roce && res.dmg > 0){
    res.dmg = Math.max(1, Math.round(res.dmg * ROCE_LARGO)); res.crit = false;
    texto(c.x, arriba - u() * 4.5, '¡Lo rozó!', '#8be9ff', 3.2);
  }
  if(res.dmg === 0){ texto(c.x, arriba, 'No afecta', '#aab', 3.4); if(AR.online) enviarRed({k:'g', r:'nada'}); return false; }
  d.hp = Math.max(0, d.hp - res.dmg);
  if(AR.online) enviarRed({k:'g', r:'hit', dmg:res.dmg, crit:res.crit, mult:res.mult, hp:d.hp, roce, tipo, alc});
  /* combo: golpes seguidos del mismo lado sin recibir */
  const cb = AR.combo;
  if(cb.lado === att.lado && ahora - cb.t < 2600) cb.n++; else { cb.lado = att.lado; cb.n = 1; }
  cb.t = ahora;
  texto(c.x, arriba, (res.crit ? '¡CRÍTICO! ' : '') + '-' + res.dmg,
    res.crit ? '#ff9f2e' : (res.mult > 1 ? '#ffd54a' : (res.mult < 1 ? '#c9ccd8' : '#fff')), res.crit ? 4.6 : 3.6);
  if(res.mult !== 1) setTimeout(() => AR && texto(c.x, c.y - def.h * def.s * .25, res.mult > 1 ? 'Súper efectivo' : 'Poco efectivo',
    res.mult > 1 ? '#ffd54a' : '#c9ccd8', 2.5), 120);
  if(cb.n >= 2) setTimeout(() => AR && texto(c.x, arriba - u() * 4.5, `Combo ×${cb.n}`, cb.lado === 'yo' ? '#7CF2FF' : '#FF9A9A', 2.8), 60);
  estallido(x == null ? c.x : x, y == null ? c.y : y, tipo, res.crit ? 22 : 11, res.crit ? 1.4 : 1);
  destello(x == null ? c.x : x, y == null ? c.y : y, res.crit ? 1.2 : .7);
  sacudir(res.crit ? 1.5 : .7, res.crit);
  if(def.lado === 'yo') vibrar(res.crit ? [30, 20, 30] : 22);
  sfx(res.crit ? 'critico' : 'golpe');
  AR.congela = res.crit ? .11 : .055;
  clase(def, 'ar-golpe', 320);
  def.stun = res.crit ? .3 : .18;
  const dir = unit(pie(att), pie(def)), emp = u() * (alc === 'corto' ? 55 : 30) * (res.crit ? 1.4 : 1);
  def.kx = dir.x * emp; def.ky = dir.y * emp; def.vx = def.vy = 0;
  if(def.accion && def.accion.tipo !== 'esquivar') cortarAccion(def);
  if(res.crit || res.mult > 1) festejo(res.crit);
  pintarHud();
  if(d.hp <= 0) caer(def);
  return true;
}

function cortarAccion(e){
  const A = e.accion; if(!A) return;
  if(A.tele) A.tele.forEach(t => t.remove());
  e.wrap.classList.remove('ar-carga');
  e.accion = null; e.pose = null;
}

function iniciar(e, tipo, dirPref){
  const ok = iniciarBase(e, tipo, dirPref);
  if(ok && AR.online && e.lado === 'yo'){
    const d = e.accion && e.accion.dir;
    enviarRed({k:'a', a:tipo, dx:d ? +d.x.toFixed(3) : 0, dy:d ? +d.y.toFixed(3) : 0});
  }
  return ok;
}
function iniciarBase(e, tipo, dirPref){
  const m = e.mon;
  if(!m || !m.vivo || e.accion || e.stun > 0 || e.aparece > 0 || AR.pausa || AR.fase !== 'lucha') return false;
  const O = tipo !== 'esquivar' && dirPref && (dirPref.x || dirPref.y) && e.lado !== 'yo' ? objetivoPorDir(e, dirPref) : otro(e);
  if(tipo === 'esquivar'){
    if(e.cd.esq > 0 || m.en < ESQ.coste) return false;
    m.en -= ESQ.coste; e.cd.esq = ESQ.cd;
    let d = dirPref && (dirPref.x || dirPref.y) ? dirPref : null;
    if(!d && Math.hypot(e.vx, e.vy) > velMax(e) * .3) d = {x:e.vx, y:e.vy};
    if(!d){
      const a = unit(pie(e), pie(O));
      d = Math.random() < .5 ? {x:-a.y, y:a.x} : {x:a.y, y:-a.x};
    }
    const n = Math.hypot(d.x, d.y) || 1;
    e.accion = {tipo, t:0, dir:{x:d.x / n, y:d.y / n}};
    e.rodando = true; clase(e, 'ar-rodar', 330);
    polvo(pie(e).x, pie(e).y, 4, 1.1);
    if(e.lado === 'yo') sfx('esquive');
    return true;
  }
  const a = ALC[tipo];
  if(e.cd[tipo] > 0 || m.en < a.coste) return false;
  m.en -= a.coste; e.cd[tipo] = a.cd;
  e.accion = {tipo, t:0, dir:unit(pie(e), pie(O)), hecho:false, mov:movDe(m, tipo), obj:O.lado};
  if(tipo === 'largo'){ prepararLargo(e); sfx('carga'); }
  return true;
}

/* ---- golpes cuerpo a cuerpo: cómo se ve el impacto según el ataque ---- */
function fxSimple(cls, css, kf, dur, capa){
  if(!FX) return;
  const d = mk(cls, css, capa);
  const a = d.animate(kf, {duration:dur, easing:'steps(6,end)', fill:'forwards'});
  const q = () => d.remove(); a.finished.then(q, q);
}
function impacto(x, y, col, k){
  const t = 9 * u() * k;
  fxSimple('ar-impacto', {left:x + 'px', top:y + 'px', width:t + 'px', height:t + 'px', filter:`drop-shadow(0 0 4px ${col})`},
    [{transform:'translate(-50%,-50%) scale(.3) rotate(0)', opacity:1}, {transform:'translate(-50%,-50%) scale(1.15) rotate(25deg)', opacity:1, offset:.5},
     {transform:'translate(-50%,-50%) scale(1.3) rotate(35deg)', opacity:0}], 280);
}
function aro(x, y, col, r, capa){
  fxSimple('ar-aro', {left:x + 'px', top:y + 'px', width:r * 2 + 'px', height:r * 2 * G.pz + 'px', borderColor:col},
    [{transform:'translate(-50%,-50%) scale(.15)', opacity:1}, {transform:'translate(-50%,-50%) scale(1)', opacity:0}], 520, capa || PISO);
}
function mordida(x, y, col){
  const U = u(), w = 8 * U, h = 2.6 * U;
  [-1, 1].forEach(s => fxSimple('ar-diente' + (s > 0 ? ' abajo' : ''), {left:x + 'px', top:y + 'px', width:w + 'px', height:h + 'px', filter:`drop-shadow(0 0 3px ${col})`},
    [{transform:`translate(-50%,-50%) translateY(${s * 5 * U}px)`, opacity:1}, {transform:`translate(-50%,-50%) translateY(${s * .8 * U}px)`, opacity:1, offset:.55},
     {transform:`translate(-50%,-50%) translateY(${s * .8 * U}px)`, opacity:0}], 300));
}
function pinchazo(x, y, col, dir){
  const U = u();
  fxSimple('ar-pincho', {left:x + 'px', top:y + 'px', width:6 * U + 'px', height:Math.max(2, .7 * U) + 'px', background:col},
    [{transform:`translate(-50%,-50%) rotate(${dir > 0 ? 180 : 0}deg) translateX(${5 * U}px)`, opacity:1},
     {transform:`translate(-50%,-50%) rotate(${dir > 0 ? 180 : 0}deg) translateX(${-1 * U}px)`, opacity:0}], 170);
}
function latigazo(x, y, col, dir){
  const U = u();
  fxSimple('ar-latigo', {left:x + 'px', top:y + 'px', width:13 * U + 'px', height:8 * U + 'px', borderTopColor:col},
    [{transform:`translate(-50%,-50%) rotate(${-70 * dir}deg)`, opacity:1}, {transform:`translate(-50%,-50%) rotate(${40 * dir}deg)`, opacity:1, offset:.6},
     {transform:`translate(-50%,-50%) rotate(${50 * dir}deg)`, opacity:0}], 300);
}
function fxCorto(mov, att, def, x, y, dir){
  const U = u(), fx = mov.fx, col = mov.n === 'Lengüetazo' ? '#ff7fa8' : TYPE_COLORS[mov.tipo];
  if(fx === 'garra') tajos(x, y, col, dir);
  else if(fx === 'mordisco') mordida(x, y, col);
  else if(fx === 'picotazo' || fx === 'aguijon'){
    for(let i = 0; i < 3; i++) setTimeout(() => FX && pinchazo(x + azar(-2, 2) * U, y + azar(-2, 2) * U, fx === 'aguijon' ? '#d58cf0' : '#fff', dir), i * 60);
  }
  else if(fx === 'latigo') latigazo(x, y, col, dir);
  else {
    impacto(x, y, col, fx === 'cuerpo' ? 1.6 : (fx === 'patada' ? 1.25 : 1));      // golpe, patada, cuerpo
    if(fx === 'cuerpo'){ aro(x, y + 4 * U, col, 9 * U); polvo(x, y + 4 * U, 6, 1.3); }
  }
  /* lo propio del elemento encima del golpe: llamas, salpicadura, chispas, hojas... */
  if(mov.tipo !== 'normal') estallido(x, y, mov.tipo, 14, 1.1);
  if(mov.tipo === 'water') aro(pie(def).x, pie(def).y, '#BCD2FF', 7 * U);
  if(mov.n === 'Chupavidas'){
    const a = cen(att);
    for(let i = 0; i < 10; i++) particula(x, y, '#ff4d6d', Math.max(2, U * 1.2), a.x - x + azar(-2, 2) * U, a.y - y + azar(-2, 2) * U, 520, {delay:i * 35, suave:true});
  }
}

/* ---- ataques de medio alcance ---- */
function proyectil(e, o){
  const O = otro(e), U = u(), c = o.suelo ? pie(e) : cen(e);
  let d = unit(c, o.suelo ? pie(O) : cen(O));
  if(o.ang){ const ca = Math.cos(o.ang), sa = Math.sin(o.ang); d = {x:d.x * ca - d.y * sa, y:d.x * sa + d.y * ca}; }
  const tam = Math.max(6, o.tam * U), col = TYPE_COLORS[o.tipo];
  const alto = o.forma === 'aguja' || o.forma === 'chispa' ? tam * .35 : (o.forma === 'suelo' ? tam * G.pz * .55 : tam);
  const alto2 = o.forma === 'gota' && o.orient ? tam * .55 : alto;
  const el = mk('ar-orbe f-' + o.forma, {width:tam + 'px', height:alto2 + 'px', left:'0px', top:'0px', fontSize:(tam * 1.2) + 'px'}, o.suelo ? PISO : FX);
  if(o.forma === 'nota') el.textContent = Math.random() < .5 ? '♪' : '♫';
  if(o.forma === 'corazon') el.textContent = '♥';
  el.style.setProperty('--c', o.forma === 'roca' ? TYPE_COLORS.rock : col);
  const sx = c.x + d.x * (o.suelo ? e.w * .2 : e.w * .3), sy = o.arriba ? c.y - e.h * .55 : c.y + d.y * (o.suelo ? 0 : e.h * .2);
  AR.proys.push({lado:e.lado, obj:O.lado, x:sx, y:sy, vx:d.x * o.vel * U, vy:d.y * o.vel * U, v:o.vel * U, tipo:o.tipo, forma:o.forma, el,
    vida:o.vida || 1.5, vida0:o.vida || 1.5, rad:tam * .5 * (o.radK || 1), rot:0, giro:o.giro || 0, arco:o.arco || 0,
    crecer:o.crecer || 0, wobble:o.wobble || 0, homing:o.homing || 0, boom:o.boom ? {vuelta:false} : null, suelo:!!o.suelo,
    orient:!!o.orient, grupo:o.grupo, t:0, tr:0, esq:false, fade:!!o.fade, estela:o.estela !== false});
}

function disparoMedio(e){
  const mov = movDe(e.mon, 'medio'), grupo = {pego:false}, base = {tipo:mov.tipo, grupo, forma:FORMA_MOV[mov.n] || mov.forma};
  const rafaga = (n, cada, o) => {
    for(let i = 0; i < n; i++){
      const f = () => { if(AR && e.mon && e.mon.vivo) proyectil(e, Object.assign({}, base, typeof o === 'function' ? o(i) : o)); };
      if(i) despues(cada * i, f); else f();
    }
  };
  switch(mov.fx){
    case 'chorro':   rafaga(12, .022, () => ({tam:2.6, vel:120, ang:azar(-.03, .03), vida:1.1, orient:true})); break;
    case 'onda':     rafaga(base.forma === 'nota' || base.forma === 'corazon' ? 4 : 3, .09, i => ({tam:3, vel:70, crecer:base.forma === 'nota' || base.forma === 'corazon' ? .3 : 1.4, vida:1.3, radK:1.2, estela:false, ang:base.forma === 'anillo' || base.forma === 'arcoiris' ? 0 : azar(-.18, .18), wobble:base.forma === 'nota' ? 2 : 0})); break;
    case 'hojas':    rafaga(3, 0, i => ({tam:2.6, vel:95, ang:(i - 1) * .22, giro:720})); break;
    case 'semillas': rafaga(3, .05, i => ({tam:1.7, vel:85, ang:(i - 1) * .15, arco:3})); break;
    case 'agujas':   rafaga(4, .06, () => ({tam:3.6, vel:135, ang:azar(-.08, .08), orient:true, vida:1})); break;
    case 'piedra':   rafaga(1, 0, mov.n === 'Tumba Rocas' ? {tam:4.6, vel:80, arco:8, giro:240, arriba:true} : {tam:3.8, vel:78, arco:10, giro:300}); break;
    case 'rayito':   rafaga(1, 0, {tam:4.5, vel:210, orient:true, vida:.8}); break;
    case 'polvo':    rafaga(1, 0, {tam:7, vel:42, crecer:.8, vida:2, radK:1.1, fade:true, estela:false}); break;
    case 'estrella': rafaga(3, .08, i => ({tam:2.6, vel:85, ang:(i - 1) * .35, giro:500, homing:3.2, vida:1.8})); break;
    case 'lodo':     rafaga(1, 0, {tam:3.4, vel:80, arco:7}); break;
    case 'burbujas': rafaga(4, .07, () => ({tam:2 + Math.random(), vel:60, ang:azar(-.15, .15), wobble:2.2, vida:1.8, estela:false})); break;
    case 'tornado':  rafaga(1, 0, {tam:4.5, vel:62, wobble:3, vida:1.9}); break;
    case 'hueso':    rafaga(1, 0, {tam:4, vel:95, giro:900, boom:true, vida:2.4}); break;
    case 'suelo':    rafaga(1, 0, {tam:7, vel:80, suelo:true, vida:1.6, estela:false}); break;
    case 'monedas':  rafaga(3, .07, i => ({tam:2.3, vel:88, ang:(i - 1) * .2, arco:5, giro:600})); break;
    default:         rafaga(1, 0, {tam:3, vel:90, giro:600});
  }
  const O = otro(e), c = cen(e), d = unit(c, cen(O)), U = u();
  if(mov.fx === 'suelo'){ aro(pie(e).x, pie(e).y, '#c9b98a', 8 * U); polvo(pie(e).x, pie(e).y, 6, 1.2); sacudir(.6); }
  else if(mov.n === 'Tumba Rocas'){ polvo(pie(e).x, pie(e).y, 8, 1.3); estallido(pie(e).x, pie(e).y, 'rock', 8, .9); marca(pie(e).x, pie(e).y, 4 * U, '#6D5F1F'); }
  else destello(c.x + d.x * e.w * .3, c.y + d.y * e.h * .2, .45);
  e.kx -= d.x * 22 * U; e.ky -= d.y * 22 * U;        // retroceso del disparo
  sfx('disparo');
}

/* ---- ataques de largo alcance ---- */
function prepararLargo(e){
  const A = e.accion, mov = A.mov, O = otro(e), col = TYPE_COLORS[mov.tipo];
  e.wrap.classList.add('ar-carga'); e.rot.style.setProperty('--tc', col);
  if(mov.fx === 'rayo' || mov.fx === 'embestida'){ A.tele = [mk('ar-mira', {background:col})]; return; }
  const propia = mov.fx === 'propia';
  const c = pie(propia ? e : O), r = (propia ? 15 : (mov.fx === 'zona' ? 8.5 : 9)) * u();
  A.zona = {x:c.x, y:c.y, r, propia};
  A.tele = [mk('ar-zona', {left:c.x + 'px', top:c.y + 'px', width:r * 2 + 'px', height:r * 2 * G.pz + 'px', borderColor:col}, PISO)];
}

function relampagoEntre(x0, y0, x1, y1, grosor, col){
  if(!FX) return;
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'ar-trueno'); svg.setAttribute('width', G.W); svg.setAttribute('height', G.H);
  const largo = Math.hypot(x1 - x0, y1 - y0), pasos = Math.max(5, Math.round(largo / (5 * u())));
  const nx = -(y1 - y0) / (largo || 1), ny = (x1 - x0) / (largo || 1);
  const pts = [];
  for(let i = 0; i <= pasos; i++){
    const f = i / pasos, j = (i === 0 || i === pasos) ? 0 : azar(-2.6, 2.6) * u();
    pts.push((x0 + (x1 - x0) * f + nx * j).toFixed(1) + ',' + (y0 + (y1 - y0) * f + ny * j).toFixed(1));
  }
  const pl = document.createElementNS(ns, 'polyline');
  pl.setAttribute('points', pts.join(' ')); pl.setAttribute('fill', 'none'); pl.setAttribute('stroke', col || '#fff7b0');
  pl.setAttribute('stroke-width', Math.max(2, grosor || u() * 1.2)); pl.setAttribute('stroke-linejoin', 'bevel');
  svg.appendChild(pl); FX.appendChild(svg);
  const a = svg.animate([{opacity:1}, {opacity:.25}, {opacity:1}, {opacity:.5}, {opacity:0}], {duration:340, easing:'steps(5,end)', fill:'forwards'});
  const q = () => svg.remove(); a.finished.then(q, q);
}
function relampago(x, y){ relampagoEntre(x + azar(-8, 8) * u(), -10, x, y); }
function flashPantalla(col){
  fxSimple('ar-flash-pant', {background:col || '#fff'}, [{opacity:.55}, {opacity:0}], 220);
}

function haz(c, ang, largo, alto, fondo, sombra, dur, cls){
  const h = mk('ar-rayo' + (cls ? ' ' + cls : ''), {left:c.x + 'px', top:c.y + 'px', width:largo + 'px', height:Math.max(4, alto) + 'px', background:fondo, boxShadow:sombra || 'none'});
  const R = `translate(0,-50%) rotate(${ang}deg)`;
  const an = h.animate([{transform:`${R} scaleX(0)`, opacity:1}, {transform:`${R} scaleX(1)`, opacity:1, offset:.2},
    {transform:`${R} scaleX(1) scaleY(.6)`, opacity:1, offset:.65}, {transform:`${R} scaleX(1) scaleY(.35)`, opacity:0}],
    {duration:dur || 420, easing:'steps(6,end)', fill:'forwards'});
  const q = () => h.remove(); an.finished.then(q, q);
}

/* El ataque largo en línea recta, con la forma de su elemento. */
function rayoTipo(e, mov, c, d){
  const t = mov.tipo, col = TYPE_COLORS[t], U = u(), O = otro(e), oc = cen(O);
  const L = Math.hypot(G.W, G.H) * 1.1, ang = Math.atan2(d.y, d.x) * 180 / Math.PI;
  const hasta = Math.min(L, dist(c, oc) + radio(O) * 1.5 + 6 * U);
  const lado = {x:-d.y, y:d.x};
  if(t === 'fire'){                                         // Lanzallamas: chorro de llamas que se abre
    haz(c, ang, hasta, 3 * U, `linear-gradient(to bottom, transparent, ${col}55 40%, #ffe9a066 50%, ${col}55 60%, transparent)`, 'none', 460);
    for(let i = 0; i < (REDUCE ? 12 : 46); i++){
      const f = azar(.55, 1), ab = azar(-1, 1) * 2.4 * U * f;
      particula(c.x, c.y, '#F7D02C', Math.max(3, U * 1.6), d.x * hasta * f + lado.x * ab, d.y * hasta * f + lado.y * ab - U * 2 * f, 380,
        {forma:'llama', s0:.5, s1:2.6, colores:elemDe('fire').seq, suave:true, delay:i * 9});
    }
    return;
  }
  if(t === 'water'){                                        // Hidrobomba: chorro de agua con espuma
    haz(c, ang, hasta, 5.2 * U, '', `0 0 ${U * 1.5}px #9cc0ff`, 480, 'ar-agua');
    for(let i = 0; i < (REDUCE ? 10 : 34); i++){
      const f = Math.random();
      chispa(c.x + d.x * hasta * f, c.y + d.y * hasta * f, 'water', 1, lado.x * azar(-3, 3) * U, lado.y * azar(-3, 3) * U - 2 * U, 420, {delay:i * 12});
    }
    return;
  }
  if(t === 'electric'){                                     // Rayo: descargas en zigzag
    const fin = {x:c.x + d.x * hasta, y:c.y + d.y * hasta};
    relampagoEntre(c.x, c.y, fin.x, fin.y, 1.4 * U);
    setTimeout(() => FX && relampagoEntre(c.x, c.y, fin.x, fin.y, .8 * U, '#ffffff'), 90);
    setTimeout(() => FX && relampagoEntre(c.x, c.y, fin.x, fin.y, 1.1 * U), 190);
    for(let i = 0; i < 12; i++){ const f = Math.random(); chispa(c.x + d.x * hasta * f, c.y + d.y * hasta * f, 'electric', 1, azar(-3, 3) * U, azar(-3, 3) * U, 300, {delay:i * 20}); }
    return;
  }
  if(t === 'ice'){                                          // Rayo Hielo: haz fino y cristales que se forman en el camino
    haz(c, ang, hasta, 2.4 * U, 'linear-gradient(to bottom, transparent, #96D9D6 25%, #ffffff 50%, #96D9D6 75%, transparent)', `0 0 ${U * 1.5}px #c8f4ff`, 520);
    for(let i = 0; i < (REDUCE ? 6 : 16); i++){
      const f = (i + 1) / 17;
      particula(c.x + d.x * hasta * f, c.y + d.y * hasta * f, elige(['#ffffff', '#D8F6FF', '#96D9D6']), Math.max(4, U * 2.2), azar(-1, 1) * U, azar(-1, 1) * U, 620,
        {forma:'cristal', s0:.2, s1:1.3, rot0:azar(0, 90), delay:i * 18, suave:true});
    }
    return;
  }
  if(t === 'grass'){                                        // Rayo Solar: un haz enorme de luz
    haz(c, ang, L, 7.5 * U, 'linear-gradient(to bottom, transparent, #B5E07A88 15%, #fff7c2 35%, #ffffff 50%, #fff7c2 65%, #B5E07A88 85%, transparent)', `0 0 ${U * 4}px #fff3a0`, 560);
    flashPantalla('#fffbe0');
    for(let i = 0; i < 10; i++){ const f = Math.random(); chispa(c.x + d.x * hasta * f, c.y + d.y * hasta * f, 'grass', 1, azar(-3, 3) * U, azar(-3, 3) * U, 500, {delay:i * 25}); }
    return;
  }
  if(t === 'bug'){                                          // Zumbido: ondas de sonido en fila
    for(let i = 0; i < 7; i++){
      particula(c.x, c.y, '#DFE88A', Math.max(6, U * 3), d.x * hasta, d.y * hasta, 380, {forma:'burbuja', s0:.6, s1:2.2, delay:i * 45, suave:true});
    }
    return;
  }
  if(t === 'fairy'){                                        // Fuerza Lunar: una luna que cruza la arena
    const luna = mk('ar-orbe f-luna', {width:7 * U + 'px', height:7 * U + 'px', left:c.x + 'px', top:c.y + 'px'});
    const an = luna.animate([{transform:'translate(-50%,-50%) scale(.3)'}, {transform:`translate(-50%,-50%) translate(${d.x * hasta}px,${d.y * hasta}px) scale(1)`}],
      {duration:260, easing:'ease-in', fill:'forwards'});
    an.finished.then(() => { luna.remove(); estallido(oc.x, oc.y, 'fairy', 20, 1.4); }, () => luna.remove());
    for(let i = 0; i < 10; i++){ const f = i / 10; chispa(c.x + d.x * hasta * f, c.y + d.y * hasta * f, 'fairy', 1, 0, -2 * U, 500, {delay:i * 24}); }
    return;
  }
  if(t === 'flying'){                                       // Ataque Aéreo: estela de viento y plumas
    haz(c, ang, hasta, 3 * U, 'linear-gradient(to bottom, transparent, #ffffffaa 40%, #ffffff 50%, #ffffffaa 60%, transparent)', `0 0 ${U * 2}px #fff`, 380);
    for(let i = 0; i < 12; i++){ const f = Math.random(); chispa(c.x + d.x * hasta * f, c.y + d.y * hasta * f, 'flying', 1.2, azar(-3, 3) * U, azar(-3, 3) * U, 600, {delay:i * 15}); }
    return;
  }
  /* Hiperrayo (y lo demás): el rayo grueso de siempre */
  haz(c, ang, L, 4 * U, `linear-gradient(to bottom, transparent 0, ${col} 22%, #fff 50%, ${col} 78%, transparent 100%)`, `0 0 ${U * 2}px ${col}`, 420);
  for(let i = 0; i < (REDUCE ? 4 : 14); i++){
    const f = Math.random();
    particula(c.x + d.x * L * .5 * f, c.y + d.y * L * .5 * f, elige(elemDe(t).c), Math.max(2, azar(.9, 1.7) * U), azar(-2, 2) * U, azar(-3, 3) * U, 360, {delay:i * 20});
  }
}

/* Estallido sobre una zona (o alrededor de uno mismo), con la forma de su elemento. */
function estallidoZona(z, mov){
  const tipo = mov.tipo, col = TYPE_COLORS[tipo], U = u(), n = mov.n;
  const explota = /Explosión|Autodestrucción/.test(n);
  aro(z.x, z.y, col, z.r * 1.1);
  if(explota){
    estallido(z.x, z.y - 3 * U, 'fire', 50, 2.4); destello(z.x, z.y - 3 * U, 1.4); flashPantalla('#ffd9a0');
    setTimeout(() => PISO && aro(z.x, z.y, '#ffd28a', z.r * 1.4), 120);
  } else if(tipo === 'fire' && n === 'Giro Fuego'){        // aro de llamas que gira alrededor
    for(let i = 0; i < 26; i++){
      const a = i / 26 * Math.PI * 2;
      particula(z.x + Math.cos(a) * z.r * .85, z.y + Math.sin(a) * z.r * .85 * G.pz, '#F7D02C', Math.max(4, U * 2.2), -Math.sin(a) * 4 * U, -azar(5, 9) * U, 620,
        {forma:'llama', s0:.6, s1:2.4, colores:elemDe('fire').seq, suave:true, delay:(i % 6) * 40});
    }
  } else if(tipo === 'fire'){                               // Llamarada: estrella de fuego de cinco puntas
    [-90, -18, 54, 126, 198].forEach((g, k) => {
      const a = g * Math.PI / 180;
      for(let i = 0; i < 9; i++){
        const f = (i + 1) / 9;
        particula(z.x, z.y - 4 * U, '#F7D02C', Math.max(4, U * 2), Math.cos(a) * z.r * 1.3 * f, Math.sin(a) * z.r * 1.3 * f, 520,
          {forma:'llama', s0:.6, s1:2.6 - f, colores:elemDe('fire').seq, suave:true, delay:i * 18 + k * 8});
      }
    });
  } else if(tipo === 'psychic'){                            // ondas psíquicas que laten sobre el rival
    for(let i = 0; i < 4; i++) setTimeout(() => PISO && aro(z.x, z.y, i % 2 ? '#C77DFF' : '#F95587', z.r * (.7 + i * .2)), i * 90);
    for(let i = 0; i < 16; i++) chispa(z.x + azar(-z.r, z.r) * .6, z.y - azar(2, 12) * U, 'psychic', 1.2, 0, -3 * U, 600, {delay:i * 25});
  } else if(tipo === 'ghost'){                              // humo violeta que sube y dos ojos
    for(let i = 0; i < 22; i++) chispa(z.x + azar(-z.r, z.r) * .7, z.y, 'ghost', 1.8, azar(-1, 1) * U, -azar(6, 14) * U, 900, {delay:i * 20});
    [-1, 1].forEach(s => particula(z.x + s * 2.2 * U, z.y - 12 * U, '#f05bff', Math.max(3, U * 1.4), 0, 0, 700, {op:1}));
  } else if(tipo === 'poison'){                             // charco tóxico que burbujea
    marca(z.x, z.y, z.r * 1.1, '#A33EA1');
    for(let i = 0; i < 20; i++) particula(z.x + azar(-z.r, z.r) * .8, z.y + azar(-z.r, z.r) * G.pz * .6, '#D68AD4', Math.max(4, U * azar(1.4, 2.6)), 0, -azar(4, 10) * U, 800,
      {forma:'burbuja', suave:true, delay:i * 30});
  } else if(tipo === 'flying'){                             // Vendaval: un tornado sobre el rival
    fxSimple('ar-torbellino', {left:z.x + 'px', top:z.y + 'px', width:z.r * 1.4 + 'px', height:34 * U + 'px'},
      [{transform:'translate(-50%,-100%) scaleY(0)', opacity:.9}, {transform:'translate(-50%,-100%) scaleY(1)', opacity:.9, offset:.25},
       {transform:'translate(-50%,-100%) scaleY(1) scaleX(.7)', opacity:.8, offset:.8}, {transform:'translate(-50%,-100%) scaleY(1.1) scaleX(.3)', opacity:0}], 800);
    for(let i = 0; i < 16; i++) chispa(z.x, z.y - azar(0, 20) * U, 'flying', 1.2, Math.cos(i) * 8 * U, -azar(2, 8) * U, 700, {delay:i * 30});
  } else if(tipo === 'fighting'){                           // Sísmico: lo levanta y lo estampa contra el piso
    impacto(z.x, z.y - 4 * U, '#ff8a5c', 2.2); polvo(z.x, z.y, 12, 1.6);
    estallido(z.x, z.y - 3 * U, 'rock', 12, 1.2);
  } else if(tipo === 'ground'){                             // Terremoto/Fisura: grietas que salen de uno
    for(let i = 0; i < 7; i++){
      const a = i / 7 * Math.PI * 2 + azar(-.2, .2);
      fxSimple('ar-grieta', {left:z.x + 'px', top:z.y + 'px', width:z.r * azar(.9, 1.3) + 'px', height:Math.max(3, U * 1.1) + 'px'},
        [{transform:`translate(0,-50%) rotate(${a * 180 / Math.PI}deg) scaleY(${G.pz}) scaleX(0)`, opacity:1},
         {transform:`translate(0,-50%) rotate(${a * 180 / Math.PI}deg) scaleY(${G.pz}) scaleX(1)`, opacity:1, offset:.3},
         {transform:`translate(0,-50%) rotate(${a * 180 / Math.PI}deg) scaleY(${G.pz}) scaleX(1)`, opacity:0}], 1400, PISO);
    }
    setTimeout(() => PISO && aro(z.x, z.y, '#c9b98a', z.r * 1.4), 150);
    polvo(z.x, z.y, 14, 1.6); estallido(z.x, z.y, 'ground', 16, 1.6);
  } else if(tipo === 'water'){                              // Surf: una ola que sale para todos lados
    aro(z.x, z.y, '#6390F0', z.r * 1.3); setTimeout(() => PISO && aro(z.x, z.y, '#ffffff', z.r * 1.35), 80);
    for(let i = 0; i < 30; i++){
      const a = i / 30 * Math.PI * 2;
      chispa(z.x + Math.cos(a) * z.r, z.y + Math.sin(a) * z.r * G.pz, 'water', 1.3, Math.cos(a) * 3 * U, -azar(3, 7) * U, 600, {delay:120});
    }
  } else {
    fxSimple('ar-pilar', {left:z.x + 'px', top:z.y + 'px', width:z.r * 1.3 + 'px', height:30 * U + 'px',
      background:`linear-gradient(to top, ${col}, ${col}88 40%, transparent)`},
      [{transform:'translate(-50%,-100%) scaleY(0)', opacity:1}, {transform:'translate(-50%,-100%) scaleY(1)', opacity:.9, offset:.35},
       {transform:'translate(-50%,-100%) scaleY(1.1) scaleX(.4)', opacity:0}], 520);
  }
  if(!explota) estallido(z.x, z.y - 3 * U, tipo, 16, 1.4);
  if(tipo !== 'fire' && !z.propia) destello(z.x, z.y - 3 * U, .8);
  marca(z.x, z.y, z.r * .9, col);
  sacudir(explota ? 2.2 : 1.6, true);
}

function dispararLargo(e){
  const A = e.accion, mov = A.mov, O = otro(e), tipo = mov.tipo, col = TYPE_COLORS[tipo], U = u(), st = partDe(tipo);
  if(mov.fx === 'embestida'){
    A.dash = {dir:A.dirLock || unit(cen(e), cen(O)), t:0, pego:false};
    polvo(pie(e).x, pie(e).y, 6, 1.4); sfx('garra');
    return;
  }
  if(mov.fx === 'rayo'){
    const c = cen(e), d = A.dirLock || unit(c, cen(O));
    rayoTipo(e, mov, c, d);
    destello(c.x + d.x * e.w * .3, c.y + d.y * e.h * .3, .9);
    e.kx -= d.x * 40 * U; e.ky -= d.y * 40 * U;
    sacudir(1.2);
    sfx('rayo');
    const oc = cen(O), vx = oc.x - c.x, vy = oc.y - c.y, proj = vx * d.x + vy * d.y;
    const lat = Math.abs(vx * d.y - vy * d.x);
    if(proj > 0 && lat <= radio(O) + 2.4 * U){
      if(golpear(e, O, 'largo', oc.x, oc.y)) marca(pie(O).x, pie(O).y, 6 * U, col);
    }
    return;
  }
  const z = A.zona;
  if(mov.fx === 'lluvia'){
    const n = REDUCE ? 4 : 10;
    for(let i = 0; i < n; i++){
      const tx = z.x + azar(-z.r, z.r) * .85, ty = z.y + azar(-z.r, z.r) * G.pz * .85;
      const tam = Math.max(8, (mov.forma === 'roca' ? 3.4 : 2.4) * U);
      const o = mk('ar-orbe f-' + mov.forma, {width:tam + 'px', height:tam + 'px', left:tx + 'px', top:'0px', opacity:0});
      o.style.setProperty('--c', (mov.n === 'Danza Pétalo' || mov.n === 'Tormenta Floral') ? elige(['#FFB3D9', '#FF7FBF', '#ffffff']) : elige(elemDe(tipo).c));
      const a = o.animate([
        {transform:'translate(-50%,-50%) translateY(0) rotate(0)', opacity:1},
        {transform:`translate(-50%,-50%) translateY(${ty}px) rotate(200deg)`, opacity:1}
      ], {duration:320, delay:i * 50, easing:'steps(7,start)', fill:'forwards'});
      a.finished.then(() => { o.remove(); estallido(tx, ty, tipo, 4, .65); if(tipo === 'rock') polvo(tx, ty, 2); }, () => o.remove());
    }
    sfx('lluvia');
    AR.zonas.push({e:e.lado, zona:z, t:0, imp:.32 + n * .05, mov, lluvia:true});
    return;
  }
  if(mov.fx === 'trueno'){
    relampago(z.x, z.y - 2 * U);
    setTimeout(() => FX && relampago(z.x + azar(-3, 3) * U, z.y - 2 * U), 120);
    flashPantalla('#fffbe0');
    sfx('rayo');
    AR.zonas.push({e:e.lado, zona:z, t:0, imp:.06, mov});
    return;
  }
  if(z.propia){ const p = pie(e); z.x = p.x; z.y = p.y; }
  sfx('lluvia');
  AR.zonas.push({e:e.lado, zona:z, t:0, imp:.05, mov, estalla:true});
}

/* Avanza el ataque en curso y define la pose del cuerpo (anticipación, golpe, recuperación). */
function avanzarAccion(e, dt){
  const A = e.accion, O = otro(e), U = u(), vel = e.mon.st.vel;
  A.t += dt * (A.tipo === 'largo' && !A.hecho && AR.esc < 1 ? 1 + (CARGA_EN_LENTA - 1) * (1 - AR.esc) / (1 - CAMARA_LENTA) : 1);
  if(A.tipo === 'esquivar'){
    const f = 1 - (A.t / ESQ.dur) * .55;
    empujar(e, A.dir.x * 86 * U * f * dt, A.dir.y * 86 * U * f * dt);
    e.pose = {sx:1.05, sy:.88};
    if(A.t >= ESQ.dur){ e.rodando = false; e.accion = null; e.pose = null; polvo(pie(e).x, pie(e).y, 3); }
    return;
  }
  const fx = A.mov.fx;
  if(A.tipo === 'corto'){
    if(A.t < .09){
      const d = unit(pie(e), pie(O));
      empujar(e, -d.x * 14 * U * dt, -d.y * 14 * U * dt);
      e.pose = {sx:1.14, sy:.84, rot:-10};                 // se agacha y toma impulso
    } else if(A.t < .28){
      if(!A.salio){
        A.salio = true; if(fx === 'garra' || fx === 'picotazo' || fx === 'aguijon') sfx('garra'); polvo(pie(e).x, pie(e).y, 3, 1.1);
        if(A.mov.tipo !== 'normal'){ e.rot.style.setProperty('--tc', TYPE_COLORS[A.mov.tipo]); e.wrap.classList.add('ar-carga'); A.aura = true; }
        if(A.mov.n === 'Rodar') clase(e, 'ar-rodar', 330);
      }
      if(A.mov.tipo !== 'normal' && Math.random() < dt * 40){ const c0 = cen(e), d0 = unit(c0, cen(O)); rastro(c0.x + d0.x * e.w * .35, c0.y + d0.y * e.h * .2, A.mov.tipo); }
      const d = unit(pie(e), pie(O));
      const cerca = dist(cen(e), cen(O)) <= radio(e) + radio(O) * .9;
      if(!cerca) empujar(e, d.x * 100 * U * vel * dt, d.y * 100 * U * vel * dt);
      const k = (A.t - .09) / .19;
      if(fx === 'cuerpo') e.pose = {sx:.92, sy:1.12, dy:-Math.sin(k * Math.PI) * e.h * .5};   // salta y cae encima
      else if(fx === 'patada') e.pose = {sx:1.1, sy:.92, rot:26, dx:e.w * .1};
      else e.pose = {sx:1.22, sy:.88, rot:14, dx:e.w * .08};                                // se estira hacia el golpe
      if(!A.hecho && A.t > (fx === 'cuerpo' ? .2 : .1) && dist(cen(e), cen(O)) <= radio(e) + radio(O) + 5 * U){
        A.hecho = true;
        const c = cen(O);
        if(golpear(e, O, 'corto')) fxCorto(A.mov, e, O, c.x, c.y, Math.sign(c.x - cen(e).x) || 1);
      }
    } else {
      const k = (A.t - .28) / .18;
      e.pose = fx === 'cuerpo' ? {sx:1 + .25 * (1 - k), sy:1 - .2 * (1 - k)} : {sx:1 + .1 * (1 - k), sy:1 - .06 * (1 - k)};
      if(fx === 'cuerpo' && !A.cayo){ A.cayo = true; aro(pie(e).x, pie(e).y, '#c9b98a', 7 * U); polvo(pie(e).x, pie(e).y, 5, 1.2); }
      if(A.aura){ A.aura = false; e.wrap.classList.remove('ar-carga'); }
      if(A.t >= .46){ e.accion = null; e.pose = null; }
    }
    return;
  }
  if(A.tipo === 'medio'){
    if(A.mov.n === 'Tumba Rocas'){                       // se agacha, la arranca y la levanta
      if(A.t < .14) e.pose = {sx:1.16, sy:.8, rot:-8};
      else if(A.t < .28) e.pose = {sx:.9, sy:1.15, dy:-e.h * .08, rot:10};
      else e.pose = null;
    } else if(fx === 'suelo'){                              // levanta la pata y pisa fuerte
      if(A.t < .14) e.pose = {sy:1.08, sx:.95, dy:-e.h * .18 * (A.t / .14), rot:-6};
      else if(A.t < .26) e.pose = {sx:1.2, sy:.82};
      else e.pose = null;
    } else {
      if(A.t < .14) e.pose = {sx:1.1, sy:.9, rot:-6};
      else if(A.t < .26) e.pose = {sx:.9, sy:1.12, rot:6, dx:-e.w * .06};
      else e.pose = null;
    }
    if(!A.hecho && A.t >= .14){ A.hecho = true; disparoMedio(e); }
    if(A.t >= .4){ e.accion = null; e.pose = null; }
    return;
  }
  if(A.tipo === 'largo'){
    if(A.t < .62){
      const prog = A.t / .62;
      e.pose = {sx:1 + Math.sin(A.t * 50) * .04 * prog, sy:1 - .08 * prog, dy:-e.h * .08 * prog, dx:azar(-1, 1) * e.w * .03 * prog};
      /* la mira sigue al rival hasta poco antes de disparar */
      const c = cen(e), t = cen(O), tele = A.tele && A.tele[0];
      if(fx === 'rayo' || fx === 'embestida'){
        if(A.t < .42) A.dirLock = unit(c, t);
        const d = A.dirLock || unit(c, t), ang = Math.atan2(d.y, d.x) * 180 / Math.PI;
        if(tele){
          Object.assign(tele.style, {left:c.x + 'px', top:c.y + 'px', width:Math.hypot(G.W, G.H) + 'px', height:Math.max(3, .8 * U) + 'px',
            transform:`translate(0,-50%) rotate(${ang}deg)`, opacity:A.t < .42 ? .5 : (Math.floor(A.t * 24) % 2 ? 1 : .35)});
          if(A.t >= .42) tele.style.background = '#ff3b3b';
        }
      } else if(tele){
        if(A.zona.propia){ const p = pie(e); A.zona.x = p.x; A.zona.y = p.y; tele.style.left = p.x + 'px'; tele.style.top = p.y + 'px'; }
        tele.style.opacity = Math.floor(A.t * 14) % 2 ? .95 : .5;
        if(A.t >= .4) tele.style.borderColor = '#ff3b3b';
      }
      if(Math.random() < dt * 34){
        const ang = Math.random() * 6.28, r = azar(5, 8) * U, st = partDe(A.mov.tipo);
        particula(c.x + Math.cos(ang) * r, c.y + Math.sin(ang) * r, elige(st.c), Math.max(2, U * 1.1), -Math.cos(ang) * r, -Math.sin(ang) * r, 380);
      }
    } else if(!A.hecho){
      A.hecho = true;
      e.wrap.classList.remove('ar-carga');
      dispararLargo(e);
      if(A.tele) A.tele.forEach(x => x.remove());
      A.tele = null;
    } else if(A.dash && A.dash.t < .3 && !A.dash.pego){
      /* la carrera: va derecho por la línea marcada; si alcanza al rival, ráfaga de golpes */
      const D = A.dash; D.t += dt;
      empujar(e, D.dir.x * 230 * U * dt, D.dir.y * 230 * U * dt);
      e.pose = fx === 'embestida' && A.mov.n === 'Patada Salto Alta' ? {sx:1.1, sy:.9, rot:30, dy:-e.h * .25} : {sx:1.28, sy:.84, rot:18, dx:e.w * .1};
      if(Math.random() < dt * 50) rastro(pie(e).x, pie(e).y - e.h * .3, 'fighting', 1);
      if(dist(cen(e), cen(O)) <= radio(e) + radio(O) + 4 * U){
        D.pego = true;
        const c = cen(O), dirx = Math.sign(c.x - cen(e).x) || 1;
        if(golpear(e, O, 'largo')){
          for(let i = 0; i < 4; i++) setTimeout(() => { if(!FX) return; impacto(c.x + azar(-3, 3) * U, c.y + azar(-3, 3) * U, '#ff8a5c', 1 + i * .25); if(i) sfx('golpe'); }, i * 70);
          estallido(c.x, c.y, 'fighting', 18, 1.4);
        }
      }
    } else {
      const k = Math.min(1, (A.t - .62) / .3);
      e.pose = {sx:.86 + .14 * k, sy:1.14 - .14 * k, dx:-e.w * .1 * (1 - k)};
    }
    if(A.t >= .62 + (fx === 'lluvia' ? .85 : .42)) cortarAccion(e);
  }
}

/* Las zonas pegan cuando cae el golpe (al final de la lluvia, o enseguida). */
function avanzarZonas(dt){
  AR.zonas = AR.zonas.filter(z => {
    z.t += dt;
    if(z.t < z.imp) return true;
    const att = E[z.e];
    if(z.estalla) estallidoZona(z.zona, z.mov);
    else { marca(z.zona.x, z.zona.y, z.zona.r * .9, TYPE_COLORS[z.mov.tipo]); sacudir(1.3); }
    if(z.mov.fx === 'trueno') estallido(z.zona.x, z.zona.y, 'electric', 20, 1.4);
    if(att.mon){
      for(const O of enemigosDe(att)){
        if(!O.mon || !O.mon.vivo) continue;
        const p = pie(O), dx = p.x - z.zona.x, dy = (p.y - z.zona.y) / G.pz;
        if(Math.hypot(dx, dy) <= z.zona.r) golpear(att, O, 'largo');
      }
    }
    return false;
  });
}

function avanzarProyectiles(dt){
  const U = u();
  AR.proys = AR.proys.filter(p => {
    p.vida -= dt; p.t += dt; p.tr -= dt;
    const att = E[p.lado], dest = (E[p.obj] && E[p.obj].mon && E[p.obj].mon.vivo) ? E[p.obj] : otro(att);
    if(p.homing && dest.mon && dest.mon.vivo){
      const c = cen(dest), d = unit(p, c), k = Math.min(1, p.homing * dt);
      p.vx += (d.x * p.v - p.vx) * k; p.vy += (d.y * p.v - p.vy) * k;
    }
    if(p.boom && !p.boom.vuelta && p.t > .55){ p.boom.vuelta = true; p.grupo = {pego:false}; }
    if(p.boom && p.boom.vuelta && att.mon){
      const c = cen(att), d = unit(p, c); p.vx = d.x * p.v; p.vy = d.y * p.v;
      if(dist(p, c) < radio(att)){ p.el.remove(); return false; }
    }
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.giro * dt;
    let xx = p.x, yy = p.y - (p.arco ? Math.sin(Math.min(1, p.t / .6) * Math.PI) * p.arco * U : 0);
    if(p.wobble){ const w = Math.sin(p.t * 14) * p.wobble * U, n = Math.hypot(p.vx, p.vy) || 1; xx += -p.vy / n * w; yy += p.vx / n * w; }
    const esc = 1 + p.crecer * (1 - p.vida / p.vida0);
    const ang = p.orient ? Math.atan2(p.vy, p.vx) * 180 / Math.PI : p.rot;
    p.el.style.transform = `translate(-50%,-50%) translate(${xx}px,${yy}px) rotate(${ang}deg) scale(${esc})`;
    if(p.fade) p.el.style.opacity = Math.min(1, p.vida * 1.5);
    if(p.tr <= 0){
      if(p.suelo){ p.tr = .07; polvo(xx, yy, 2, 1.1); }
      else if(p.estela){ p.tr = .04; rastro(xx, yy, p.tipo, .8); }
    }
    for(const dest of enemigosDe(att)){
      if(!dest.mon || !dest.mon.vivo) continue;
      const c = p.suelo ? pie(dest) : cen(dest);
      const dx = c.x - xx, dy = (c.y - yy) / (p.suelo ? G.pz : 1);
      if(Math.hypot(dx, dy) <= radio(dest) * (p.suelo ? .9 : 1) + p.rad * esc){
        if(dest.rodando){ if(!p.esq){ p.esq = true; golpear(att, dest, 'medio'); } }
        else if(p.grupo.pego || dest.invul > 0){
          if(!p.boom){ estallido(xx, yy, p.tipo, 3, .5); p.el.remove(); return false; }
        } else {
          p.grupo.pego = true;
          golpear(att, dest, 'medio', xx, p.suelo ? cen(dest).y : yy);
          if(p.forma === 'lodo') marca(pie(dest).x, pie(dest).y, 5 * U, TYPE_COLORS.poison);
          if(!p.boom){ p.el.remove(); return false; }
        }
      }
    }
    if(p.vida <= 0 || p.x < -40 || p.x > G.W + 40 || p.y < -40 || p.y > G.H + 40){ p.el.remove(); return false; }
    return true;
  });
}

function caer(e){
  const m = e.mon;
  m.vivo = false; m.hp = 0;
  cortarAccion(e); e.rodando = false; e.pose = null;
  AR.hold.clear();
  decir(`¡${m.p.name} se debilitó!`);
  const c = cen(e);
  estallido(c.x, c.y, m.p.type, 26, 1.5);
  marca(pie(e).x, pie(e).y, e.w * .55, TYPE_COLORS[m.p.type]);
  festejo(true);
  sfx('ko');
  AR.congela = .25;
  e.giroEl.getAnimations().forEach(a => a.cancel()); e.girando = false;
  e.giroEl.animate([{transform:'translateY(0) rotate(0)', opacity:1, filter:'brightness(1)'},
    {transform:`translateY(${-e.h * .15}px) rotate(${-e.cara * 20}deg)`, opacity:1, filter:'brightness(2.5)', offset:.25},
    {transform:`translateY(${e.h * .1}px) rotate(${-e.cara * 90}deg)`, opacity:0, filter:'brightness(1)'}],
    {duration:800, easing:'steps(9,end)', fill:'forwards'});
  AR.fase = 'caida';
  pintarHud();
  const lado = e.lado;
  despues(1.1, () => {
    if(AR[lado].mons.every(x => !x.vivo)){
      if(AR.multi){
        if(lado === 'yo') eliminadoMulti();
        else decir(`${AR[lado].nombre} se quedó sin Pokémon.`);
        if(AR.fase !== 'fin') AR.fase = 'lucha';
        return;
      }
      terminar(lado === 'riv'); return;
    }
    if(lado !== 'yo' && AR.online){ AR.fase = 'lucha'; decir(`${AR[lado].nombre} está eligiendo...`); return; }
    if(lado !== 'yo'){
      const b = mejorBanca(AR[lado], AR.yo.act);
      sacar(lado, b.i); AR.fase = 'lucha';
    } else {
      abrirEquipo(true);
    }
  });
}

/* ---------------- cambio de Pokémon ---------------- */
function sacar(lado, idx){
  const eq = AR[lado], e = E[lado];
  eq.idx = idx; eq.act = eq.mons[idx]; e.mon = eq.act;
  e.giroEl.getAnimations().forEach(a => a.cancel()); e.girando = false; e.giroT = 0;
  e.accion = null; e.pose = null; e.rodando = false; e.stun = 0; e.kx = e.ky = 0; e.vx = e.vy = 0;
  e.cd = {corto:.3, medio:.3, largo:.6, esq:0};
  e.invul = INVUL_ENTRADA; e.aparece = .45;
  if(e.bot) e.bot.t = .5;
  e.wrap.classList.remove('ar-golpe', 'ar-rodar', 'ar-carga');
  ponerSprite(e);
  orientarYa(e);
  pintarHud();
  const c = cen(e); destello(c.x, c.y, 1.3);
  sfx('sale');
  const ent = ST.querySelector('.ar-ent-sprite.' + lado);
  if(ent && !REDUCE) ent.animate([{transform:'translate(-50%,-100%)'}, {transform:'translate(-50%,-112%)'}, {transform:'translate(-50%,-100%)'}], {duration:300, easing:'steps(4,end)'});
  e.spr.addEventListener('load', () => e.giroEl.animate([{transform:'scale(.2)', opacity:0, filter:'brightness(3)'}, {transform:'scale(1)', opacity:1, filter:'brightness(1)'}],
    {duration:420, easing:'steps(6,end)'}), {once:true});
  decir(lado === 'yo' ? `¡Adelante, ${eq.act.p.name}!` : `${AR[lado].nombre || AR.rivalNombre} saca a ${eq.act.p.name}.`);
}

function sortearPeso(w, evitar){
  let ent = Object.entries(w).filter(([k, v]) => v > 0);
  const sin = ent.filter(([k]) => k !== evitar);
  if(sin.length && Math.random() > .35) ent = sin;
  const total = ent.reduce((s, [, v]) => s + v, 0);
  let r = Math.random() * total;
  for(const [k, v] of ent){ r -= v; if(r <= 0) return k; }
  return ent.length ? ent[0][0] : 'orbitar';
}

function mejorBanca(eq, contra){
  return eq.mons.map((m, i) => ({m, i})).filter(o => o.m.vivo && o.i !== eq.idx)
    .map(o => ({i:o.i, s:ventaja(o.m, contra) + Math.random() * .8})).sort((a, b) => b.s - a.s)[0];
}

function abrirEquipo(forzado){
  if(!AR || AR.fase === 'fin') return;
  if(!forzado && (AR.pausa || AR.cambioCd > 0 || E.yo.accion || AR.fase !== 'lucha')) return;
  if(!AR.online) AR.pausa = true;
  AR.hold.clear();
  const eq = AR.yo, ov = $('arEquipo');
  ov.hidden = false;
  ov.innerHTML = `<div class="ar-eq-caja" role="dialog" aria-label="Equipo"><b>${forzado ? `${eq.act.p.name} no puede seguir. ¿A quién mandás?` : '¿Con quién cambiás?'}</b>
    <div class="ar-eq-grid">${eq.mons.map((m, i) => {
      const off = !m.vivo || i === eq.idx, fr = m.hp / m.max;
      return `<button class="ar-b ar-carta" data-i="${i}"${off ? ' disabled' : ''} style="border-left-color:${TYPE_COLORS[m.p.type]}">
        <img src="${spIcono(m.p.id, m.vario)}" alt="" width="48" height="48"><b>${m.vario ? "✨ " : ""}${m.p.name}</b>
        <span class="ar-mini"><i style="width:${fr * 100}%;background:${fr > .5 ? '#3DDC6E' : (fr > .2 ? '#F7B731' : '#F0463C')}"></i></span>
        <small>${m.vivo ? Math.round(m.hp) + '/' + m.max : 'Debilitado'}</small></button>`;
    }).join('')}</div>${forzado ? '' : '<button class="ar-b ar-med" id="arVolver"><b>← Volver</b></button>'}</div>`;
  const cerrar = () => { ov.hidden = true; ov.innerHTML = ''; AR.pausa = false; };
  ov.querySelectorAll('[data-i]').forEach(b => { b.onclick = () => {
    const i = Number(b.dataset.i); cerrar();
    sacar('yo', i); AR.cambioCd = CAMBIO_CD; AR.fase = 'lucha';
    if(AR.online) enviarRed({k:'s', i});
  }; });
  const v = $('arVolver'); if(v) v.onclick = cerrar;
  const primero = ov.querySelector('[data-i]:not([disabled])'); if(primero) primero.focus();
}

/* ---------------- el rival (guion + reflejos) ---------------- */
function nuevoGuion(est){ return Array.from({length:6}, () => sortearPeso(est.w)); }
const alcanceDe = (e, O) => (radio(e) + radio(O) + 5 * u()) * 2.1;

function botDecidir(e){
  const b = e.bot, est = AR.estilo, O = otro(e), d = dist(pie(e), pie(O)), alcance = alcanceDe(e, O);
  /* a veces, con poca vida y en desventaja, cambia de Pokémon */
  if(AR.riv.mons.some((m, i) => m.vivo && i !== AR.riv.idx) && AR.cambioRiv <= 0){
    const p = (ventaja(e.mon, O.mon) < 0 ? .18 : 0) + (e.mon.hp / e.mon.max < .25 ? .25 : 0);
    if(Math.random() < p){ const k = mejorBanca(AR.riv, O.mon); AR.cambioRiv = 7; sacar('riv', k.i); return; }
  }
  if(!b.guion.length) b.guion = nuevoGuion(est);
  let acc = b.guion.shift();
  if(Math.random() < .3) acc = sortearPeso(est.w);
  if(ATAQUES.includes(acc) && acc === b.hist[0] && acc === b.hist[1]) acc = sortearPeso(est.w, acc);
  if(acc === 'corto' && d > alcance * 1.6) acc = 'acercar';
  if(acc === 'medio' && d < alcance * .7) acc = Math.random() < .5 ? 'corto' : 'retroceder';
  if(ATAQUES.includes(acc) && e.mon.en < ALC[acc].coste) acc = 'orbitar';
  b.hist.unshift(acc); b.hist.length = Math.min(3, b.hist.length);
  b.modo = acc; b.dirOrb = Math.random() < .5 ? 1 : -1;
  b.t = {acercar:azar(.7, 1.3), orbitar:azar(1, 1.8), retroceder:azar(.6, 1), esquivar:.3, corto:.6, medio:.7, largo:1.3}[acc] * azar(.85, 1.2);
  b.ejecutado = false;
}

function botActualizar(e, dt){
  const b = e.bot, O = otro(e), out = {x:0, y:0};
  if(!e.mon.vivo || AR.fase !== 'lucha' || e.aparece > 0) return out;
  b.t -= dt; b.reac -= dt;
  /* reflejo: proyectil que viene hacia mí */
  if(b.reac <= 0 && !e.accion){
    for(const p of AR.proys){
      if(p.lado === e.lado) continue;
      const c = cen(e), rx = c.x - p.x, ry = c.y - p.y, v = Math.hypot(p.vx, p.vy), t = (rx * p.vx + ry * p.vy) / (v * v);
      const lat = Math.abs(rx * p.vy - ry * p.vx) / v;
      if(t > 0 && t < .38 && lat < radio(e) * 1.5){
        b.reac = .7;
        const s = Math.random() < .5 ? 1 : -1;
        if(Math.random() < AR.estilo.reflejo && iniciar(e, 'esquivar', {x:-p.vy / v * s, y:p.vx / v * s})) return out;
        break;
      }
    }
    /* reflejo: el jugador está cargando algo largo → se corre */
    if(O.accion && O.accion.tipo === 'largo' && !b.huye && O.accion.t > .12 && Math.random() < AR.estilo.reflejo + .15){
      b.huye = .75; b.huyeDir = Math.random() < .5 ? 1 : -1;
    }
  }
  if(!O.accion || O.accion.tipo !== 'largo') b.huye = 0;
  if(b.huye > 0){
    b.huye -= dt;
    const z = O.accion && O.accion.zona;
    if(z){ const f = unit(z, pie(e)); out.x = f.x; out.y = f.y; }
    else { const d = unit(pie(O), pie(e)); out.x = -d.y * b.huyeDir; out.y = d.x * b.huyeDir; }
    return out;
  }
  if(e.accion) return out;
  if(b.t <= 0) botDecidir(e);
  const pe = pie(e), po = pie(O), d = dist(pe, po), hacia = unit(pe, po), alcance = alcanceDe(e, O);
  switch(b.modo){
    case 'acercar': if(d > alcance * .6){ out.x = hacia.x; out.y = hacia.y; } else b.t = Math.min(b.t, .1); break;
    case 'retroceder': out.x = -hacia.x; out.y = -hacia.y; break;
    case 'orbitar': {
      const ideal = alcance * 1.5, k = d > ideal * 1.15 ? .8 : (d < ideal * .85 ? -.8 : 0);
      out.x = -hacia.y * b.dirOrb + hacia.x * k; out.y = hacia.x * b.dirOrb + hacia.y * k; break;
    }
    case 'esquivar': if(!b.ejecutado){ b.ejecutado = true; iniciar(e, 'esquivar'); } break;
    case 'corto':
      if(d > alcance * .75){ out.x = hacia.x; out.y = hacia.y; }
      else if(!b.ejecutado || b.t > .25){ if(iniciar(e, 'corto')) b.ejecutado = true; }
      break;
    case 'medio':
      if(!b.ejecutado && iniciar(e, 'medio')) b.ejecutado = true;
      else { out.x = -hacia.y * b.dirOrb * .6; out.y = hacia.x * b.dirOrb * .6; }
      break;
    case 'largo':
      if(!b.ejecutado && iniciar(e, 'largo')) b.ejecutado = true;
      break;
  }
  return out;
}

/* ---------------- bucle ---------------- */
function despues(seg, fn){ AR.pend.push({t:seg, fn}); }

function actualizarMon(e, dt, intent){
  const m = e.mon; if(!m) return;
  for(const k in e.cd) if(e.cd[k] > 0) e.cd[k] = Math.max(0, e.cd[k] - dt);
  if(m.vivo) m.en = Math.min(EN_MAX, m.en + EN_REGEN * dt);
  if(e.stun > 0) e.stun -= dt;
  if(e.invul > 0) e.invul -= dt;
  if(e.aparece > 0) e.aparece -= dt;
  if(Math.abs(e.kx) + Math.abs(e.ky) > 1){
    empujar(e, e.kx * dt, e.ky * dt);
    const f = Math.pow(.004, dt); e.kx *= f; e.ky *= f;
  }
  if(!m.vivo){ e.vx = e.vy = 0; return; }
  if(e.accion) avanzarAccion(e, dt);
  /* caminar con inercia: la velocidad se acerca a la pedida, no salta de golpe */
  let factor = 1;
  const A = e.accion;
  if(A) factor = A.tipo === 'medio' ? .5 : (A.tipo === 'largo' ? .3 : 0);
  if(e.stun > 0) factor = 0;
  const v = velMax(e) * factor, n = Math.min(1, Math.hypot(intent.x, intent.y));
  const ang = Math.atan2(intent.y, intent.x);
  const tx = n ? Math.cos(ang) * v * n : 0, ty = n ? Math.sin(ang) * v * n : 0;
  const k = 1 - Math.exp(-dt * ACEL);
  e.vx += (tx - e.vx) * k; e.vy += (ty - e.vy) * k;
  if(Math.abs(e.vx) + Math.abs(e.vy) > .5) empujar(e, e.vx * dt, e.vy * dt);
  /* separación: que no se atraviesen */
  if(e.lado === 'yo'){
    for(const l of AR.lados){
      const O = E[l];
      if(O === e || !O.mon || !O.mon.vivo) continue;
      const c1 = cen(e), c2 = cen(O), min = (radio(e) + radio(O)) * .8, d = dist(c1, c2);
      if(d < min && d > 0){ const s = (min - d) / 2, dir = unit(c2, c1); empujar(e, dir.x * s, dir.y * s); empujar(O, -dir.x * s, -dir.y * s); }
    }
  }
}

function entradaJugador(){
  let x = AR.joy.x, y = AR.joy.y;
  const k = AR.keys;
  if(k.has('a') || k.has('arrowleft')) x -= 1;
  if(k.has('d') || k.has('arrowright')) x += 1;
  if(k.has('w') || k.has('arrowup')) y -= 1;
  if(k.has('s') || k.has('arrowdown')) y += 1;
  const n = Math.hypot(x, y);
  if(n > 1){ x /= n; y /= n; }
  return n < .12 ? {x:0, y:0} : {x, y};
}

function bucle(ts){
  if(!AR) return;
  const tok = TOK;
  RAF = requestAnimationFrame(bucle);
  let dt = AR.ult ? (ts - AR.ult) / 1000 : 0; AR.ult = ts;
  dt = Math.min(.05, Math.max(0, dt)) * (window.__arenaTurbo > 0 ? window.__arenaTurbo : 1);
  if(AR.pausa || !dt){ dibujarTodos(0); return; }
  /* hit-stop: un instante congelado en cada golpe */
  if(AR.congela > 0){ AR.congela -= dt; return; }
  /* cámara lenta mientras se carga un largo (entra y sale suave) */
  const cargando = AR.lados.map(l => E[l]).some(x => x.accion && x.accion.tipo === 'largo' && !x.accion.hecho);
  AR.esc += ((cargando ? CAMARA_LENTA : 1) - AR.esc) * Math.min(1, dt * 12);
  ST.classList.toggle('ar-lento', AR.esc < .85);
  dt *= AR.esc;
  const pasos = Math.max(1, Math.ceil(dt / .05)), h = dt / pasos;
  for(let i = 0; i < pasos; i++){
    if(tok !== TOK || !AR) return;
    AR.cambioCd = Math.max(0, AR.cambioCd - h); AR.cambioRiv = Math.max(0, AR.cambioRiv - h);
    const intent = entradaJugador();
    if(AR.fase === 'lucha'){
      for(const t of ['largo', 'medio', 'corto']) if(AR.hold.has(t)) iniciar(E.yo, t);
      if(AR.hold.has('esquivar')) iniciar(E.yo, 'esquivar', intent);
    }
    const bi = AR.online ? {x:0, y:0} : botActualizar(E.riv, h);
    actualizarMon(E.yo, h, intent);
    AR.lados.forEach(l => { if(l !== 'yo') actualizarMon(E[l], h, l === 'riv' ? bi : {x:0, y:0}); });
    if(AR.online) seguirRemoto(h);
    avanzarProyectiles(h);
    avanzarZonas(h);
    AR.pend = AR.pend.filter(p => { p.t -= h; if(p.t <= 0){ p.fn(); return false; } return true; });
    if(!AR || tok !== TOK) return;
    if(AR.fase === 'lucha') AR.tLucha += h;
    if(AR.congela > 0) break;
  }
  dibujarTodos(dt);
  pintarEnergia(); pintarCooldowns();
  if(AR.online) mandarPosicion();
}

/* ---------------- armado de la arena ---------------- */
function hudHTML(lado, titulo){
  return `<div class="ar-hud ${lado}${AR.multi ? ' mini' : ''}" id="arHud-${lado}">
    <div class="ar-ent">${titulo}</div>
    <div class="ar-nom"><span class="n"></span><span class="v"></span></div>
    <div class="ar-tip"><span class="t"></span></div>
    <div class="ar-barra"><i class="hp"></i></div><div class="ar-num"></div>
    <div class="ar-barra en" title="Energía"><i></i></div>
    <div class="ar-bolas">${'<span class="ar-bola"></span>'.repeat(AR[lado].mons.length)}</div></div>`;
}
const monHTML = lado => `<div class="ar-mon ${lado}" id="arMon-${lado}"><div class="ar-reflejo"><img alt=""></div><div class="ar-sombra"></div>
  <div class="ar-ancla"><div class="ar-cuerpo"><div class="ar-flip"><div class="ar-giro"><div class="ar-rot"><img class="ar-spr frente" alt=""><img class="ar-spr espalda" alt=""></div></div></div></div></div></div>`;

function armarEscenario(){
  $('arRoot').innerHTML = `
    <div class="ar-stage${AR.multi ? ' multi' : ''}" id="arStage">
      <div class="ar-shake" id="arShake">
        <canvas class="ar-bg" id="arBg"></canvas>
        <div class="ar-luz"><div class="ar-cono"></div><div class="ar-motas"></div><div class="ar-lampara"></div></div>
        <div class="ar-piso" id="arPiso"></div>
        <div class="ar-ent-sprite riv"></div><div class="ar-ent-sprite yo"></div>
        ${AR.lados.map(monHTML).join('')}
        <div class="ar-fx" id="arFx"></div>
      </div>
      ${AR.multi ? `<div class="ar-huds" id="arHuds">${AR.lados.map(l => hudHTML(l, AR[l].nombre)).join('')}</div>` : hudHTML('riv', AR.rivalNombre) + hudHTML('yo', window.__yoNombre || 'Vos')}
      <div class="ar-lineas"></div>
      <div class="ar-log" id="arLog" aria-live="polite"></div>
      <div class="ar-aviso" id="arAviso" aria-hidden="true"></div>
      <button class="ar-x" id="arCloseBtn" aria-label="Salir de la arena">✕</button>
      <button class="ar-son" id="arSonido" aria-label="Sonido" aria-pressed="${SONIDO}">${SONIDO ? '🔊' : '🔇'}</button>
      <div class="ar-fin" id="arFin" hidden></div>
    </div>
    <div class="ar-ctrl" id="arCtrl">
      <div class="ar-joy" id="arJoy" role="group" aria-label="Joystick para mover"><div class="base"><div class="knob"></div></div></div>
      <div class="ar-hint">Mover: WASD o flechas · Garra J · Disparo K · Rayo L · Esquivar Espacio · Equipo Q</div>
      <div class="ar-btns">
        <button class="ar-act" id="arB-largo" data-a="largo"><i class="cd"></i><b></b><small>Largo · ⚡${ALC.largo.coste}</small></button>
        <button class="ar-act" id="arB-medio" data-a="medio"><i class="cd"></i><b></b><small>Medio · ⚡${ALC.medio.coste}</small></button>
        <button class="ar-act" id="arB-corto" data-a="corto"><i class="cd"></i><b></b><small>Corto · ⚡${ALC.corto.coste}</small></button>
        <button class="ar-act esq" id="arB-esquivar" data-a="esquivar"><i class="cd"></i><b>Esquivar</b><small>⚡${ESQ.coste}</small></button>
        <button class="ar-act eqp" id="arB-equipo" data-a="equipo"><i class="cd"></i><b>Equipo</b><small>Cambiar</small></button>
      </div>
    </div>
    <div class="ar-equipo" id="arEquipo" hidden></div>
    <div class="ar-confirm" id="arConfirm" hidden>
      <div class="ar-conf-caja" role="alertdialog" aria-label="¿Abandonar la batalla?">
        <b>¿Abandonar la batalla?</b><span>No ganás monedas si salís ahora.</span>
        <div><button class="ar-b ar-med" id="arSeguir"><b>Seguir</b></button>
        <button class="ar-b ar-med" id="arAbandonar"><b>Abandonar</b></button></div>
      </div>
    </div>`;
  ST = $('arStage'); SHAKE = $('arShake'); FX = $('arFx'); BG = $('arBg'); PISO = $('arPiso');
  $('arCloseBtn').onclick = pedirSalida;
  $('arSeguir').onclick = () => { $('arConfirm').hidden = true; AR.pausa = AR.pausaAntes; };
  $('arAbandonar').onclick = () => { if(AR && AR.online) enviarSala({t:'salir'}); cerrarArena(); };
  if(AR.online) $('arConfirm').querySelector('.ar-conf-caja span').textContent = 'Si salís, perdés el duelo.';
  $('arSonido').onclick = () => {
    SONIDO = !SONIDO;
    try{ localStorage.setItem('arena-sonido', SONIDO ? '1' : '0'); }catch(e){}
    const b = $('arSonido'); b.textContent = SONIDO ? '🔊' : '🔇'; b.setAttribute('aria-pressed', SONIDO);
    if(window.Musica) Musica.poner(SONIDO);
    if(SONIDO) sfx('cuenta');
  };
  iniciarControles();
}

function iniciarControles(){
  const joy = $('arJoy'), knob = joy.querySelector('.knob'), base = joy.querySelector('.base');
  let id = null;
  const set = ev => {
    const r = base.getBoundingClientRect(), R = r.width * .42;
    let dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy); if(d > R){ dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    if(AR) AR.joy = {x:dx / R, y:dy / R};
  };
  joy.addEventListener('pointerdown', ev => { id = ev.pointerId; try{ joy.setPointerCapture(id); }catch(e){} set(ev); ev.preventDefault(); });
  joy.addEventListener('pointermove', ev => { if(ev.pointerId === id) set(ev); });
  const fin = ev => { if(ev.pointerId !== id) return; id = null; knob.style.transform = ''; if(AR) AR.joy = {x:0, y:0}; };
  joy.addEventListener('pointerup', fin); joy.addEventListener('pointercancel', fin); joy.addEventListener('lostpointercapture', fin);

  $('arCtrl').querySelectorAll('.ar-act').forEach(b => {
    const a = b.dataset.a;
    b.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if(!AR) return;
      if(a === 'equipo'){ abrirEquipo(false); return; }
      pulsar(a);
    });
    const suelta = () => { if(AR) AR.hold.delete(a); };
    b.addEventListener('pointerup', suelta); b.addEventListener('pointerleave', suelta); b.addEventListener('pointercancel', suelta);
    b.addEventListener('contextmenu', ev => ev.preventDefault());
  });
}

/* Apretar un botón o tecla: intenta la acción ya y la deja "mantenida" para repetirla al soltarse el enfriamiento. */
/* vibración corta en el celular (si el navegador la permite): confirma el toque y avisa los golpes recibidos */
function vibrar(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(e){} }
function pulsar(a){
  if(!AR) return;
  vibrar(a === 'esquivar' ? 12 : 8);
  AR.hold.add(a);
  if(AR.fase === 'lucha' && !AR.pausa) iniciar(E.yo, a, a === 'esquivar' ? entradaJugador() : null);
}

function pedirSalida(){
  if(!AR || AR.fase === 'fin'){ cerrarArena(); return; }
  const c = $('arConfirm');
  c.hidden = !c.hidden;
  if(!c.hidden && AR.online){ AR.pausaAntes = AR.pausa; $('arSeguir').focus(); return; }   // en duelo no se puede pausar
  if(!c.hidden){ AR.pausaAntes = AR.pausa; AR.pausa = true; $('arSeguir').focus(); }
  else AR.pausa = AR.pausaAntes;
}

/* Partida de 2 vs 2 o todos contra todos: el servidor manda quiénes juegan, en qué equipo y con qué Pokémon.
   Yo soy 'yo'; mi compañero 'al'; los rivales 'riv', 'r2', 'r3', 'r4'. En 2 vs 2 los rivales se ven "espejados"
   (como el duelo de siempre); en todos contra todos hay una sola cancha igual para todos. */
function armarMulti(d, pDe){
  const yo = d.jugadores.find(j => j.slot === d.miSlot), otros = d.jugadores.filter(j => j.slot !== d.miSlot);
  const eq = j => j.equipo.map(x => crearMon(pDe(x.id), j.slot !== d.miSlot, x));
  AR.multi = true; AR.modo = d.modo; AR.miSlot = d.miSlot;
  /* más gente en la cancha = cámara más lejos (todo se ve más chico) para que haya lugar para pelear */
  AR.zoom = d.modo === '2v2' ? .78 : ({3:.86, 4:.76, 5:.68})[d.jugadores.length] || .72;
  AR.lados = ['yo']; AR.bando = {yo:d.modo === '2v2' ? yo.bando : 'yo'}; AR.espejo = {}; AR.porSlot = {[d.miSlot]:'yo'}; AR.spawn = {};
  AR.yo = {mons:eq(yo), idx:0, act:null, nombre:yo.nombre}; AR.slotDe = {yo:yo.slot};
  const nombresRival = [], libres = ['riv', 'r2', 'r3', 'r4'];
  otros.forEach(j => {
    const amigo = d.modo === '2v2' && j.bando === yo.bando, l = amigo ? 'al' : libres.shift();
    AR.lados.push(l); AR.bando[l] = d.modo === '2v2' ? j.bando : l; AR.espejo[l] = d.modo === '2v2' && !amigo;
    AR.porSlot[j.slot] = l; AR.slotDe[l] = j.slot; AR[l] = {mons:eq(j), idx:0, act:null, nombre:j.nombre};
    if(!amigo) nombresRival.push(j.nombre);
  });
  AR.rivalNombre = d.modo === '2v2' ? nombresRival.join(' y ') : 'todos';
  /* dónde arranca cada uno (en mi pantalla) */
  if(d.modo === '2v2'){
    const S = [[.45, .4], [-.45, .4]];
    const idxEquipo = j => d.jugadores.filter(x => x.bando === j.bando).sort((a, b) => a.slot - b.slot).findIndex(x => x.slot === j.slot);
    d.jugadores.forEach(j => { const l = AR.porSlot[j.slot], k = S[idxEquipo(j)] || S[0], f = AR.espejo[l] ? -1 : 1; AR.spawn[l] = [k[0] * f, k[1] * f]; });
  } else {
    const orden = d.jugadores.slice().sort((a, b) => a.slot - b.slot), n = orden.length;
    orden.forEach((j, i) => { const a = Math.PI / 2 + 2 * Math.PI * i / n; AR.spawn[AR.porSlot[j.slot]] = [+(.66 * Math.cos(a)).toFixed(3), +(.5 * Math.sin(a)).toFixed(3)]; });
  }
}

async function luchar(mios, duelo){
  audio();   // el navegador sólo deja arrancar el sonido después de un toque del usuario
  /* con servidor: anota que empieza la pelea y con qué equipo (al terminar controla el tiempo y los premios) */
  if(MODO_SERVIDOR && !duelo){
    const res = await accionServidor('arenaEmpezar', {equipo: mios.map(p => p.id)}).catch(() => null);
    if(!res || !res.ok){ avisoServidor(res ? res.motivo : 'sin_conexion'); return; }
  }
  const pDe = id => DATA.find(p => p.id === id) || ESPECIAL_POR_ID[id];
  const multi = !!(duelo && duelo.multi);
  const rival = duelo && !multi ? duelo.rival.equipo.map(x => pDe(x.id)) : (multi ? [] : armarRival(mios));
  const ent = duelo && !multi ? {nombre:duelo.rival.nombre, fig:null} : multi ? {nombre:'', fig:null} : elegirRival();
  rivalFig = ent.fig;
  const estilo = elige(Object.keys(ESTILOS));
  AR = {
    yo:  {mons:duelo && !multi ? duelo.yo.equipo.map(x => crearMon(pDe(x.id), false, x)) : mios ? mios.map(p => crearMon(p)) : [], idx:0, act:null, nombre:window.__yoNombre || 'Vos'},
    riv: {mons:duelo && !multi ? duelo.rival.equipo.map(x => crearMon(pDe(x.id), true, x)) : rival.map(p => crearMon(p, true)), idx:0, act:null, nombre:ent.nombre},
    zoom:1, lados:['yo', 'riv'], bando:{yo:'A', riv:'B'}, espejo:{riv:true}, porSlot:{}, miSlot:null, multi:false, modo:'1v1', spawn:{yo:[.55, .35], riv:[-.55, -.2]},
    online:!!duelo, red:{ult:0, obj:{}},
    estilo:ESTILOS[estilo], proys:[], zonas:[], pend:[], hold:new Set(), keys:new Set(), joy:{x:0, y:0},
    fase:'intro', tLucha:0, esc:1, pausa:false, pausaAntes:false, cambioCd:0, cambioRiv:3, ult:0, congela:0,
    combo:{lado:null, n:0, t:0},
    rivalNombre:ent.nombre
  };
  if(multi) armarMulti(duelo, pDe);
  armarEscenario();
  E = {};
  AR.lados.forEach(l => { E[l] = crearEntidad(l); });
  E.riv.bot = duelo ? null : {guion:nuevoGuion(AR.estilo), hist:[], modo:'orbitar', t:1.2, reac:0, huye:0, huyeDir:1, dirOrb:1, ejecutado:false};
  AR.lados.forEach(l => { E[l].x = AR.spawn[l][0]; E[l].y = AR.spawn[l][1]; AR[l].act = AR[l].mons[0]; E[l].mon = AR[l].act; });
  medir(); pintarFondo(); acomodarEscena();
  AR.lados.forEach(l => orientarYa(E[l]));
  if(typeof ResizeObserver === 'function'){
    RO = new ResizeObserver(() => { if(AR) alCambiarTamano(); });
    RO.observe(ST);
  }
  AR.lados.forEach(l => ponerSprite(E[l]));
  pintarHud();
  AR.lados.forEach(l => { dibujar(E[l], 0); E[l].spr.addEventListener('load', () => dibujar(E[l], 0), {once:true}); });
  window.__arena = {estado:() => AR, ent:() => E, golpe:alc => golpear(E.riv, E.yo, alc || 'largo'), golpeDe:(de, a, alc) => golpear(E[de], E[a], alc || 'largo')};   // golpe, golpeDe: sólo para pruebas
  decir(multi ? (AR.modo === '2v2' ? `¡2 vs 2! Tu compañero: ${AR.al ? AR.al.nombre : '—'}` : '¡Todos contra todos!') : duelo ? `¡Duelo contra ${AR.rivalNombre}!` : `¡${AR.rivalNombre} quiere pelear!`);
  const aviso = $('arAviso'), tok = TOK, turbo = window.__arenaTurbo > 0 ? window.__arenaTurbo : 1;
  /* mientras cuenta, los dos ya respiran y miran al rival */
  const respira = ts => { if(tok !== TOK || !AR || AR.fase !== 'intro') return; dibujarTodos(0); requestAnimationFrame(respira); };
  requestAnimationFrame(respira);
  for(const t of ['3', '2', '1', '¡PELEA!']){
    if(tok !== TOK) return;
    aviso.textContent = t; aviso.classList.remove('pop'); void aviso.offsetWidth; aviso.classList.add('pop');
    sfx(t === '¡PELEA!' ? 'pelea' : 'cuenta');
    if(t === '¡PELEA!') festejo(true);
    await new Promise(r => setTimeout(r, (t === '¡PELEA!' ? 700 : 520) / turbo));
  }
  if(tok !== TOK) return;
  aviso.textContent = '';
  AR.lados.forEach(l => { E[l].invul = .6; });
  AR.fase = 'lucha';
  decir('¡A pelear!');
  RAF = requestAnimationFrame(bucle);
}

function terminar(gane){
  AR.fase = 'fin'; AR.hold.clear();
  if(AR.online){ terminarDuelo(gane); return; }
  if(MODO_SERVIDOR){ terminarServidor(gane); return; }
  const pr = calcularPremio(gane);
  coins += pr.monedas;
  for(const t in pr.bolas) if(typeof bolas !== 'undefined' && t in bolas) bolas[t] += pr.bolas[t];
  maestro.peleas++; if(gane) maestro.ganadas++;
  maestro.pts += pr.pts;
  const subidas = cobrarRangosMaestro();
  updateCoins(); saveProgress();
  enviarMaestro();
  sfx(gane ? 'gana' : 'pierde');
  if(gane) festejo(true);
  decir(gane ? '¡Ganaste la batalla!' : 'Te quedaste sin Pokémon...');
  pintarFin(gane, pr, subidas);
}

/* Con servidor: se le cuenta cómo terminó la pelea y él calcula y guarda el premio. */
function terminarServidor(gane){
  const kos = AR.riv.mons.filter(m => !m.vivo).length, vivos = AR.yo.mons.filter(m => m.vivo).length;
  sfx(gane ? 'gana' : 'pierde');
  if(gane) festejo(true);
  decir(gane ? '¡Ganaste la batalla!' : 'Te quedaste sin Pokémon...');
  const nombres = {roja:'Poké Ball', azul:'Súper Ball', ultra:'Ultra Ball', maestra:'Master Ball'};
  const vacio = {monedas:0, lineas:[], bolas:{}, bolasTxt:'', pts:0};
  accionServidor('arenaTerminar', {gane, kos, vivos, tLucha: AR.tLucha}).then(res => {
    if(!res.ok){ pintarFin(gane, vacio, [], 'Esta pelea no se pudo anotar.'); return; }
    const r = res.resultado;
    const pr = {monedas:r.monedas, lineas:r.lineas, bolas:r.bolas, pts:r.pts,
      bolasTxt:Object.keys(r.bolas).map(t => `+${r.bolas[t]} ${nombres[t]}`).join(' · ')};
    const subidas = r.subidas.map(u => ({nombre:u.nombre, premio:textoPremioRango(RANGOS_MAESTRO[u.nivel].premio || {}) +
      (u.legendarias.length ? ' (' + u.legendarias.map(x => (DATA.find(d => d.id === x.id) || {}).name).join(', ') + ')' : '')}));
    cargarTopMaestro();
    pintarFin(gane, pr, subidas, r.tope ? 'Ya peleaste un montón hoy: las peleas de acá a mañana no dan premio.' : '');
  }).catch(() => pintarFin(gane, vacio, [], 'Sin conexión: esta pelea no se anotó.'));
}

function pintarFin(gane, pr, subidas, aviso){
  const col = gane ? '#3DDC6E' : '#F0463C', f = $('arFin');
  f.hidden = false;
  f.innerHTML = `<div class="ar-fin-caja" style="border-color:${col}">
    <b style="color:${col}">${gane ? '¡Ganaste!' : 'Perdiste'}</b>
    <span>${gane ? `Le ganaste a ${AR.rivalNombre}.` : `${AR.rivalNombre} fue más fuerte esta vez.`}</span>
    <ul class="ar-premio">${pr.lineas.map(([t, v]) => `<li><span>${t}</span><b>+${v} 🪙</b></li>`).join('')}
      <li class="tot"><span>Total</span><b>+${pr.monedas} 🪙</b></li></ul>
    ${pr.bolasTxt ? `<span class="ar-premio-bolas">${pr.bolasTxt}</span>` : ''}
    <span class="ar-premio-maestro">${pr.pts ? `+${pr.pts} puntos de Maestro · ` : ''}${RANGOS_MAESTRO[rangoPropio()].nombre}: <b>${maestro.pts}</b> pts · ${maestro.ganadas} ganada${maestro.ganadas === 1 ? '' : 's'} de ${maestro.peleas}</span>
    ${subidas.map(u => `<span class="ar-rango-sube">🏅 ¡Subiste a <b>${u.nombre}</b>! Premio: ${u.premio}</span>`).join('')}
    ${aviso ? `<span class="ar-premio-maestro">${aviso}</span>` : ''}
    <div><button class="ar-b ar-med" id="arCerrar2"><b>Cerrar</b></button>
    <button class="ar-b ar-med" id="arOtra"><b>Revancha</b></button></div></div>`;
  $('arCerrar2').onclick = cerrarArena;
  $('arOtra').onclick = () => abrirArena();
  $('arOtra').focus({preventScroll:true});
}

function calcularPremio(gane){
  const kos = AR.riv.mons.filter(m => !m.vivo).length, vivos = AR.yo.mons.filter(m => m.vivo).length, n = AR.yo.mons.length;
  const lineas = [[gane ? 'Victoria' : 'Por pelear', gane ? PREMIO.ganar : PREMIO.perder]];
  if(gane){
    const bv = n ? Math.round(PREMIO.bonoVivos * vivos / n) : 0;
    const bonoR = Math.round(PREMIO.bonoRapidez * Math.max(0, Math.min(1, (PREMIO.rapidezMax - AR.tLucha) / (PREMIO.rapidezMax - PREMIO.rapidezMin))));
    if(bv) lineas.push([`${vivos} de ${n} de los tuyos en pie`, bv]);
    if(bonoR) lineas.push([`Rapidez (${Math.round(AR.tLucha)} s)`, bonoR]);
  }else{
    const tiempo = Math.min(PREMIO.topeTiempo, Math.floor(AR.tLucha / PREMIO.segPorMoneda));
    if(kos) lineas.push([`${kos} rival${kos > 1 ? 'es' : ''} derrotado${kos > 1 ? 's' : ''}`, kos * PREMIO.porKO]);
    if(tiempo) lineas.push([`${Math.round(AR.tLucha)} s de pelea`, tiempo]);
  }
  /* pokébolas: ganar da rojas; equipo completo suma una Súper y ganar sin perder a nadie, una Ultra */
  const b = {};
  if(gane){
    b.roja = 3;
    if(AR.yo.mons.length >= EQUIPO_MAX) b.azul = 1;
    if(vivos === AR.yo.mons.length) b.ultra = 1;
  }else if(kos) b.roja = 1;
  const nombres = {roja:'Poké Ball', azul:'Súper Ball', ultra:'Ultra Ball'};
  const bolasTxt = Object.keys(b).map(t => `+${b[t]} ${nombres[t]}`).join(' · ');
  /* Puntos de Maestro: sólo ganando; suman los rivales tumbados y no perder a ninguno */
  const pts = gane ? 10 + kos * 2 + (vivos === AR.yo.mons.length ? 5 : 0) : 0;
  /* perder tiene tope (mismo cálculo que el servidor); ganar ya está acotado entre 100 y 160 */
  const total = lineas.reduce((a, l) => a + l[1], 0);
  if(!gane && total > TOPE_DERROTA){
    lineas.forEach(l => { l[1] = Math.floor(l[1] * TOPE_DERROTA / total); });
    lineas[0][1] += TOPE_DERROTA - lineas.reduce((a, l) => a + l[1], 0);
  }
  return {monedas:lineas.reduce((a, l) => a + l[1], 0), lineas, bolas:b, bolasTxt, pts};
}

function armarRival(mios){
  /* para grabar videos: window.__rivalIds = [ids] fija el equipo rival (no se usa en el juego) */
  if(Array.isArray(window.__rivalIds)){
    const fijo = window.__rivalIds.map(id => DATA.find(p => p.id === id)).filter(Boolean);
    if(fijo.length) return fijo;
  }
  const prom = mios.reduce((s, p) => s + bstDe(p), 0) / mios.length;
  const ids = new Set(mios.map(p => p.id));
  const pool = DATA.filter(p => REGIONES_ARENA.includes(p.region))
    .sort((x, y) => Math.abs(bstDe(x) - prom) - Math.abs(bstDe(y) - prom)).slice(0, 18);
  const sorteado = pool.sort(() => Math.random() - .5);
  const sinRepetir = sorteado.filter(p => !ids.has(p.id));
  return (sinRepetir.length >= mios.length ? sinRepetir : sorteado).slice(0, mios.length);
}

/* ---------------- elegir equipo ---------------- */
/* Favoritos: hasta 6 Pokémon marcados con la ★ que se guardan en el celular. Al abrir la Arena el equipo ya viene
   armado con ellos (los que todavía tengas), así no hay que buscarlos de cero cada vez. */
const FAV_KEY = 'arena-favoritos';
function cargarFav(){
  try{ const a = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); return Array.isArray(a) ? a.filter(n => Number.isInteger(n)).slice(0, EQUIPO_MAX) : []; }
  catch(e){ return []; }
}
function guardarFav(a){ try{ localStorage.setItem(FAV_KEY, JSON.stringify(a.slice(0, EQUIPO_MAX))); }catch(e){} }
const sinTildes = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function abrirArena(){ return abrirArenaBase(null); }
/* Duelo rápido (botón ⚔️ de la Aventura): ya hay sala y rival; sólo falta elegir equipo, con 15 segundos. */
const SEG_ELEGIR = 15;
function puedeDueloRapido(){
  const n = kantoMios().concat(especialesMios()).length;
  if(n < EQUIPO_MIN){
    if(typeof avisoBatalla === 'function') avisoBatalla(`Necesitás al menos ${EQUIPO_MIN} Pokémon de Kanto, Johto, Hoenn o Sinnoh para pelear. Abrí un sobre primero.`);
    return false;
  }
  return true;
}
function abrirDueloRapido(info){ if(puedeDueloRapido()) abrirArenaBase(info); }
function abrirArenaBase(rapido){
  const ov = $('arenaOverlay');
  const mios = kantoMios().concat(especialesMios());   // las especiales (Mewtwo Acorazado) pelean aparte
  if(mios.length < EQUIPO_MIN){
    if(typeof avisoBatalla === 'function')
      avisoBatalla(`Necesitás al menos ${EQUIPO_MIN} Pokémon de Kanto, Johto, Hoenn o Sinnoh para pelear en la arena. Abrí un sobre primero.`);
    return;
  }
  limpiar();
  if(!ultimoTopMaestro) cargarTopMaestro();   // más nombres de entrenadores para los rivales
  ov.classList.add('show');
  const orden = mios.slice().sort((a, b) => bstDe(b) - bstDe(a));
  const mios_ids = new Set(orden.map(p => p.id));
  let fav = cargarFav();
  let sel = fav.filter(id => mios_ids.has(id));            // el equipo arranca con tus favoritos
  if(!sel.length) sel = orden.slice(0, EQUIPO_MAX).map(p => p.id);
  let q = '', aviso = '';
  const root = $('arRoot');

  const lista = () => {
    const t = sinTildes(q).trim().replace(/^#/, '');
    const coincide = p => !t || sinTildes(p.name).includes(t) || String(p.id) === t || sinTildes(TYPE_LABEL[p.type] || '').includes(t);
    return orden.filter(coincide).sort((a, b) => (fav.includes(b.id) ? 1 : 0) - (fav.includes(a.id) ? 1 : 0));   // favoritos arriba
  };
  const tarjeta = p => {
    const n = sel.indexOf(p.id) + 1, s = statsDe(p), esFav = fav.includes(p.id);
    return `<button class="ar-sel${n ? ' on' : ''}" data-id="${p.id}" aria-pressed="${n ? 'true' : 'false'}" style="border-color:${n ? TYPE_COLORS[p.type] : '#34407a'}">
      ${n ? `<span class="ar-n">${n}</span>` : ''}<span class="ar-fav${esFav ? ' on' : ''}" data-fav="${p.id}" role="button" aria-label="${esFav ? 'Sacar de favoritos' : 'Marcar como favorito'}">★</span>
      <img src="${spIcono(p.id, (mejorEjemplar(p.id) || {}).s)}" alt="" width="64" height="64" loading="lazy">
      <b>${(mejorEjemplar(p.id) || {}).s ? '✨ ' : ''}${p.name}</b><small>${TYPE_LABEL[p.type]} · ${bstDe(p)} · 💪${(mejorEjemplar(p.id) || {}).f || 50}</small>
      <small class="ar-st">Crít. ${Math.round(s.crit * 100)}% ×${s.critMult.toFixed(1)}</small>
      <small class="ar-st">Veloc. ${'★'.repeat(Math.max(1, Math.round((s.vel - .65) / .14)))}</small>
      <small class="ar-movs">${(id => id === 132 ? 'Transformación: copia al rival' : (mv => ATAQUES.map(a => mv[a] ? mv[a].n : '').filter(Boolean).join(' · '))(crearMon(p).movs))(p.base || p.id)}</small></button>`;
  };
  const actualizarPie = () => {
    $('arPickN').textContent = `${sel.length} de ${EQUIPO_MAX}`;
    $('arPickGo').disabled = sel.length < EQUIPO_MIN;
    const bd = $('arPickDuelo'); if(bd) bd.disabled = sel.length < EQUIPO_MIN;
    const av = $('arFavInfo'); av.textContent = aviso; av.hidden = !aviso;
  };
  const alternarFav = id => {
    const i = fav.indexOf(id);
    if(i >= 0){ fav.splice(i, 1); aviso = ''; }
    else if(fav.length >= EQUIPO_MAX){ aviso = `Ya tenés ${EQUIPO_MAX} favoritos: sacá uno con la ★ para poner otro.`; }
    else { fav.push(id); aviso = ''; }
    guardarFav(fav); pintarLista();
  };
  const pintarLista = () => {
    const grid = $('arGrid'), top = grid.scrollTop;
    const l = lista();
    grid.innerHTML = l.length ? l.map(tarjeta).join('') : '<p class="ar-vacio">Ninguno de tus Pokémon se llama así.</p>';
    grid.scrollTop = top;
    grid.querySelectorAll('.ar-sel').forEach(b => {
      b.onclick = () => {
        const id = Number(b.dataset.id), i = sel.indexOf(id);
        aviso = '';
        if(i >= 0) sel.splice(i, 1);
        else if(sel.length < EQUIPO_MAX) sel.push(id);
        else aviso = `Ya elegiste ${EQUIPO_MAX}: tocá uno de tu equipo para sacarlo y poder elegir a ${(DATA.find(p => p.id === id) || ESPECIAL_POR_ID[id] || {}).name || 'éste'}.`;
        pintarLista();
      };
    });
    grid.querySelectorAll('.ar-fav').forEach(st => {
      st.onclick = ev => { ev.stopPropagation(); alternarFav(Number(st.dataset.fav)); };
    });
    actualizarPie();
  };
  const pintar = () => {
    root.innerHTML = `<div class="ar-pick">
      <h2>${rapido ? `⚔️ Duelo contra ${rapido.rival.replace(/[<>&"]/g, '')}` : 'Arena Pokémon · Kanto, Johto, Hoenn y Sinnoh'}</h2>
      <p>${rapido ? `Elegí tu equipo (${EQUIPO_MIN} a ${EQUIPO_MAX}) antes de que se acabe el tiempo: si se acaba, pelea el que tenés marcado.` : `Elegí tu equipo: de ${EQUIPO_MIN} a ${EQUIPO_MAX}. Sale primero el que marcaste con el 1. Pelea tu ejemplar más fuerte (💪).`}</p>
      <div class="ar-busca"><input id="arBuscar" type="search" inputmode="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="🔎 Buscar" aria-label="Buscar Pokémon"></div>
      <div class="ar-favaviso" id="arFavInfo" hidden></div>
      <div class="ar-grid" id="arGrid"></div>
      <div class="ar-pick-pie"><span id="arPickN"></span>${rapido ? `<span class="ar-cuenta" id="arCuenta" aria-live="off">${SEG_ELEGIR}</span>` : ''}
        <button class="ar-b ar-med" id="arPickCerrar"><b>${rapido ? 'Salir' : 'Cerrar'}</b></button>
        <button class="ar-b ar-med ar-go" id="arPickGo"><b>${rapido ? '¡Listo!' : '¡A pelear!'}</b></button></div>
      ${MODO_SERVIDOR && !rapido ? `<button class="ar-b ar-duelo-btn" id="arPickDuelo"><b>👥 Duelo con un amigo${dueloPendiente ? ' · código ' + dueloPendiente : ''}</b><small>En vivo, contra su equipo real</small></button>` : ''}</div>`;
    const bq = $('arBuscar'); bq.value = q;
    bq.oninput = () => { q = bq.value; pintarLista(); };       // sólo se repinta la lista: el teclado no se cierra
    $('arPickCerrar').onclick = cerrarArena;
    $('arPickGo').onclick = () => rapido ? confirmarRapido() : luchar(sel.map(id => DATA.find(p => p.id === id) || ESPECIAL_POR_ID[id]));
    const bd = $('arPickDuelo');
    if(bd) bd.onclick = () => pintarDuelo(sel.map(id => DATA.find(p => p.id === id) || ESPECIAL_POR_ID[id]), pintar);
    pintarLista();
  };
  /* duelo rápido: cuenta regresiva y envío del equipo (a mano con "¡Listo!" o solo al llegar a 0) */
  let relojRapido = 0;
  const confirmarRapido = () => {
    clearInterval(relojRapido);
    for(const p of orden){ if(sel.length >= EQUIPO_MIN) break; if(!sel.includes(p.id)) sel.push(p.id); }   // si le faltaron, completa con los más fuertes
    esperarRapido(rapido, sel.slice(0, EQUIPO_MAX));
  };
  pintar();
  if(rapido){
    const miTok = TOK;
    let resta = SEG_ELEGIR;
    relojRapido = setInterval(() => {
      if(TOK !== miTok || !$('arPickGo')){ clearInterval(relojRapido); return; }
      resta--;
      const c = $('arCuenta');
      if(c){ c.textContent = Math.max(0, resta); c.classList.toggle('urge', resta <= 5); }
      if(resta <= 0) confirmarRapido();
    }, 1000);
  }
}

/* Después de elegir: se manda el equipo a la sala ya preparada y se espera al rival (hasta 45 s) */
function esperarRapido(info, ids){
  const root = $('arRoot'), miTok = TOK;
  root.innerHTML = `<div class="ar-pick ar-duelo">
    <h2>⚔️ Duelo contra ${info.rival.replace(/[<>&"]/g, '')}</h2>
    <div class="ar-duelo-eq">${ids.map(id => { const p = DATA.find(x => x.id === id) || ESPECIAL_POR_ID[id]; return p ? `<img src="${spIcono(p.id, (mejorEjemplar(p.id) || {}).s)}" alt="${p.name}" title="${p.name}" width="48" height="48">` : ''; }).join('')}</div>
    <div class="ar-duelo-estado" id="arDEstado" role="status" aria-live="polite">Enviando tu equipo…</div>
    <div class="ar-pick-pie"><button class="ar-b ar-med" id="arDVolver"><b>Salir</b></button></div></div>`;
  const est = $('arDEstado');
  let espera = 0;
  $('arDVolver').onclick = () => { clearTimeout(espera); cerrarArena(); };
  const motivo = mm => ({no_es_tuyo:'Ese Pokémon no está en tu álbum.', equipo_invalido:'Elegí entre 3 y 6 Pokémon.', no_existe:'La sala ya no existe.',
    empezada:'Ese duelo ya empezó.', no_autorizado:'No sos parte de este duelo.', sin_sesion:'Volvé a entrar al juego.'})[mm] || 'No se pudo: ' + mm;
  const alMensaje = m => {
    if(TOK !== miTok) return;
    if(m.t === 'sala'){
      if(m.estado === 'rival') est.innerHTML = `<b>¡${info.rival.replace(/[<>&"]/g, '')} ya está listo!</b><br>Arrancando…`;
      if(m.estado === 'esperando') est.textContent = `Esperando que ${info.rival.replace(/[<>&"]/g, '')} termine de elegir…`;
      if(m.estado === 'rival_se_fue') est.textContent = 'Tu rival se fue de la sala. Esperando que vuelva…';
      return;
    }
    if(m.t === 'empezar'){ clearTimeout(espera); RED.alMensaje = mensajeDuelo; luchar(null, m); return; }
    if(m.t === 'error_red'){ clearTimeout(espera); est.textContent = 'Sin conexión con la sala. Probá de nuevo.'; }
  };
  api('/duelo/par', {codigo: info.codigo, equipo: ids}).then(res => {
    if(TOK !== miTok) return;
    if(!res.ok){ est.textContent = motivo(res.motivo); return; }
    est.textContent = `Esperando que ${info.rival.replace(/[<>&"]/g, '')} termine de elegir…`;
    conectarSala(info.codigo, alMensaje);
    espera = setTimeout(() => { if(TOK === miTok && !(AR && AR.online)){ cerrarSala(); est.textContent = 'Tu rival no llegó a confirmar a tiempo. Volvé a tocar ⚔️ para buscar otra batalla.'; } }, 45000);
  }).catch(() => { est.textContent = 'Sin conexión, probá de nuevo.'; });
}


/* =================== DUELO EN VIVO CON UN AMIGO ===================
   Sólo con servidor. Uno crea una sala (le damos un código), el otro se une con ese código, y
   los dos celulares se conectan a la sala por WebSocket. Cada uno maneja SU Pokémon:
     - le cuenta al otro dónde está (k:'p', ~15 veces por segundo),
     - qué ataque o esquive hace (k:'a'),
     - cómo le fue con cada golpe que RECIBIÓ (k:'g': su celular sabe si esquivó o no),
     - y a quién manda cuando cambia (k:'s').
   Las posiciones van "espejadas": cada uno se ve a sí mismo abajo y al rival arriba.
   Los equipos los arma el servidor con las figuritas reales, y los premios los paga él sólo si
   los dos celulares cuentan lo mismo al final. */
const RED = {ws:null, codigo:null, alMensaje:null, cerrado:false, intentos:0};
const POS_CADA_MS = 66;

function enviarSala(o){ if(RED.ws && RED.ws.readyState === 1) RED.ws.send(JSON.stringify(o)); }
function enviarRed(o){ if(RED.ws && RED.ws.readyState === 1) RED.ws.send(JSON.stringify(Object.assign({t:'r'}, AR && AR.multi ? {d:AR.miSlot} : {}, o))); }

function conectarSala(codigo, alMensaje){
  cerrarSala();
  RED.codigo = codigo; RED.alMensaje = alMensaje; RED.cerrado = false; RED.intentos = 0;
  abrirSocket();
}
function abrirSocket(){
  const url = SERVIDOR_URL.replace(/^http/, 'ws') + '/duelo/ws?codigo=' + encodeURIComponent(RED.codigo) + '&token=' + encodeURIComponent(tokenServidor);
  let ws;
  try{ ws = new WebSocket(url); }catch(e){ RED.alMensaje && RED.alMensaje({t:'error_red'}); return; }
  RED.ws = ws;
  ws.onopen = () => { RED.intentos = 0; };
  ws.onmessage = ev => { let m; try{ m = JSON.parse(ev.data); }catch(e){ return; } if(RED.alMensaje) RED.alMensaje(m); };
  ws.onclose = () => {
    if(RED.ws !== ws || RED.cerrado) return;
    /* se cortó: reintenta unas veces (la sala espera 20 s antes de dar el duelo por perdido) */
    if(RED.intentos < 5){
      RED.intentos++;
      if(RED.alMensaje) RED.alMensaje({t:'reconectando'});
      setTimeout(() => { if(!RED.cerrado && RED.ws === ws) abrirSocket(); }, 1200 * RED.intentos);
    } else if(RED.alMensaje) RED.alMensaje({t:'error_red'});
  };
}
function cerrarSala(){
  RED.cerrado = true;
  const ws = RED.ws; RED.ws = null;
  if(ws) try{ ws.close(1000, 'fin'); }catch(e){}
}

/* lo que llega del otro celular durante la pelea */
function mensajeDuelo(m){
  if(m.t === 'r'){ if(AR && AR.online) recibirJugada(m); return; }
  const quien = () => AR && AR.multi && AR.porSlot[m.d] ? AR[AR.porSlot[m.d]].nombre : AR && AR.rivalNombre;
  if(m.t === 'rival_se_fue'){ if(AR && AR.fase !== 'fin') decir(`Se cortó la conexión de ${quien()}… esperando que vuelva.`); return; }
  if(m.t === 'rival_volvio'){ if(AR && AR.fase !== 'fin') decir(`¡${quien()} volvió!`); return; }
  if(m.t === 'jugador_fuera'){ if(AR && AR.multi) jugadorFuera(AR.porSlot[m.d], m.abandono); return; }
  if(m.t === 'reconectando'){ if(AR && AR.fase !== 'fin') decir('Se cortó tu conexión… reconectando.'); return; }
  if(m.t === 'error_red'){ if(AR && AR.fase !== 'fin') decir('Sin conexión con la sala.'); else if(AR && AR.esperandoResultado) mostrarResultadoDuelo({t:'resultado', empate:true, motivo:'sin_conexion'}); return; }
  if(m.t === 'resultado') mostrarResultadoDuelo(m);
}

function recibirJugada(m){
  const lado = AR.multi ? AR.porSlot[m.d] : 'riv';
  const e = E[lado];
  if(!e || !e.mon) return;
  const sg = AR.espejo[lado] ? -1 : 1;
  if(m.k === 'p'){
    AR.red.obj[lado] = {x:sg * m.x, y:sg * m.y, vx:sg * m.vx * G.rx, vy:sg * m.vy * G.ry, t:performance.now()};
    /* su vida y su energía las manda su celular: es la verdad */
    if(m.i === AR[lado].idx && e.mon.vivo && typeof m.hp === 'number'){ e.mon.hp = Math.max(0, Math.min(e.mon.max, m.hp)); }
    if(typeof m.en === 'number') e.mon.en = m.en;
    return;
  }
  if(m.k === 'a'){
    if(!e.mon.vivo || AR.fase === 'fin') return;
    /* el ataque ya salió en su celular: acá se arranca igual, sin mirar enfriamientos ni energía */
    cortarAccion(e); e.stun = 0; e.aparece = 0;
    e.cd[m.a === 'esquivar' ? 'esq' : m.a] = 0;
    e.mon.en = Math.max(e.mon.en, m.a === 'esquivar' ? ESQ.coste : ALC[m.a].coste);
    const fase = AR.fase; AR.fase = 'lucha';
    iniciarBase(e, m.a, m.dx || m.dy ? {x:sg * m.dx, y:sg * m.dy} : null);
    if(fase !== 'lucha') AR.fase = fase;
    return;
  }
  if(m.k === 'g') return golpeRemoto(m, lado);
  if(m.k === 's'){
    const i = Number(m.i);
    if(AR[lado].mons[i] && AR[lado].mons[i].vivo && i !== AR[lado].idx){ sacar(lado, i); AR.fase = AR.fase === 'fin' ? 'fin' : 'lucha'; }
  }
}

/* cómo le fue al Pokémon del rival con un golpe mío (lo calculó su celular) */
function golpeRemoto(m, lado){
  const def = E[lado || 'riv'], d = def.mon;
  if(!d || !d.vivo) return;
  const c = cen(def), arriba = c.y - def.h * def.s * .6;
  if(m.r === 'esq'){ texto(c.x, arriba, '¡Esquivó!', '#8be9ff', 3.6); return; }
  if(m.r === 'nada'){ texto(c.x, arriba, 'No afecta', '#aab', 3.4); return; }
  d.hp = Math.max(0, Number(m.hp) || 0);
  if(m.roce) texto(c.x, arriba - u() * 4.5, '¡Lo rozó!', '#8be9ff', 3.2);
  texto(c.x, arriba, (m.crit ? '¡CRÍTICO! ' : '') + '-' + m.dmg,
    m.crit ? '#ff9f2e' : (m.mult > 1 ? '#ffd54a' : (m.mult < 1 ? '#c9ccd8' : '#fff')), m.crit ? 4.6 : 3.6);
  if(m.mult !== 1) setTimeout(() => AR && texto(c.x, c.y - def.h * def.s * .25, m.mult > 1 ? 'Súper efectivo' : 'Poco efectivo',
    m.mult > 1 ? '#ffd54a' : '#c9ccd8', 2.5), 120);
  const tipo = m.tipo || (E.yo.mon && E.yo.mon.p.type) || 'normal';
  estallido(c.x, c.y, tipo, m.crit ? 22 : 11, m.crit ? 1.4 : 1);
  destello(c.x, c.y, m.crit ? 1.2 : .7);
  sacudir(m.crit ? 1.2 : .5, m.crit);
  vibrar(m.crit ? [30, 20, 30] : 22);
  sfx(m.crit ? 'critico' : 'golpe');
  AR.congela = m.crit ? .08 : .04;
  clase(def, 'ar-golpe', 320);
  if(def.accion && def.accion.tipo !== 'esquivar') cortarAccion(def);
  if(m.crit || m.mult > 1) festejo(m.crit);
  pintarHud();
  if(d.hp <= 0) caer(def);
}

/* el rival va hacia donde dice su celular (con un poco de adelanto según su velocidad) */
function seguirRemoto(h){
  AR.lados.forEach(lado => {
    if(lado === 'yo') return;
    const o = AR.red.obj[lado], e = E[lado];
    if(!o || !e.mon || !e.mon.vivo) return;
    const adel = Math.min(.15, (performance.now() - o.t) / 1000);
    const tx = o.x + o.vx / G.rx * adel, ty = o.y + o.vy / G.ry * adel;
    const k = Math.min(1, h * 14);
    e.x += (tx - e.x) * k; e.y += (ty - e.y) * k;
    e.vx = o.vx; e.vy = o.vy;
    encerrar(e);
  });
}
function mandarPosicion(){
  const ahora = performance.now();
  if(AR.fase === 'intro' || ahora - AR.red.ult < POS_CADA_MS || !E.yo.mon) return;
  AR.red.ult = ahora;
  enviarRed({k:'p', x:+E.yo.x.toFixed(4), y:+E.yo.y.toFixed(4), vx:+(E.yo.vx / G.rx).toFixed(3), vy:+(E.yo.vy / G.ry).toFixed(3),
    hp:Math.round(E.yo.mon.hp * 10) / 10, en:Math.round(E.yo.mon.en), i:AR.yo.idx});
}

/* Partidas con varios: el servidor lleva la cuenta de quién quedó eliminado y cuándo; yo sólo aviso que me quedé sin Pokémon. */
function eliminadoMulti(){
  if(AR.espectador) return;
  AR.espectador = true;
  sfx('pierde');
  decir('Quedaste eliminado. Mirá cómo sigue la batalla…');
  enviarSala({t:'elim'});
}
/* alguien (otro) ya no está: se fue o quedó sin Pokémon; que no estorbe en la cancha */
function jugadorFuera(lado, abandono){
  if(!lado || !AR[lado] || lado === 'yo') return;
  AR[lado].mons.forEach(x => { x.vivo = false; x.hp = 0; });
  const e = E[lado];
  if(e){ cortarAccion(e); e.rodando = false; e.wrap.style.display = 'none'; }
  pintarHud();
  decir(abandono ? `${AR[lado].nombre} abandonó.` : `${AR[lado].nombre} quedó eliminado.`);
}

/* fin: cada uno cuenta cómo le fue; el servidor confirma y paga */
function terminarDuelo(gane){
  sfx(gane ? 'gana' : 'pierde');
  if(gane) festejo(true);
  decir(gane ? '¡Ganaste el duelo!' : 'Te quedaste sin Pokémon...');
  AR.esperandoResultado = true;
  enviarSala({t:'fin', gane, vivos:AR.yo.mons.filter(m => m.vivo).length});
  const f = $('arFin');
  f.hidden = false;
  f.innerHTML = `<div class="ar-fin-caja" style="border-color:${gane ? '#3DDC6E' : '#F0463C'}"><b style="color:${gane ? '#3DDC6E' : '#F0463C'}">${gane ? '¡Ganaste!' : 'Perdiste'}</b>
    <span>Confirmando el resultado con ${AR.rivalNombre}…</span></div>`;
  /* si el servidor no contesta, que no quede colgado */
  setTimeout(() => { if(AR && AR.esperandoResultado) mostrarResultadoDuelo({t:'resultado', empate:true, motivo:'sin_respuesta'}); }, 25000);
}
function mostrarResultadoDuelo(m){
  if(!AR || !AR.online) return;
  if(AR.fase !== 'fin'){   // terminó por el servidor (el rival abandonó, por ejemplo)
    AR.fase = 'fin'; AR.hold.clear();
    if(m.gane){ sfx('gana'); festejo(true); }
  }
  AR.esperandoResultado = false;
  cerrarSala();
  if(m.progreso && typeof aplicarProgreso === 'function') aplicarProgreso(m.progreso);
  const nombres = {roja:'Poké Ball', azul:'Súper Ball', ultra:'Ultra Ball', maestra:'Master Ball'};
  const r = m.premio;
  const pr = r ? {monedas:r.monedas, lineas:r.lineas, bolas:r.bolas, pts:r.pts, bolasTxt:Object.keys(r.bolas).map(t => `+${r.bolas[t]} ${nombres[t]}`).join(' · ')}
    : {monedas:0, lineas:[], bolas:{}, bolasTxt:'', pts:0};
  const subidas = r ? r.subidas.map(u => ({nombre:u.nombre, premio:textoPremioRango(RANGOS_MAESTRO[u.nivel].premio || {})})) : [];
  const puesto = m.puesto && m.total ? `Quedaste ${m.puesto}.º de ${m.total}. ` : '';
  const aviso = puesto + (m.empate ? (m.motivo === 'sin_conexion' || m.motivo === 'sin_respuesta' ? 'Se cortó la conexión: el duelo no se anotó.' : 'No se pudo confirmar quién ganó: este duelo no da premio.')
    : m.motivo === 'abandono' ? (m.gane ? `${AR.rivalNombre} abandonó el duelo.` : 'Abandonaste el duelo.')
    : m.sinPremio ? 'Fue demasiado rápido: este duelo no da premio.'
    : (r && r.tope) ? 'Ya peleaste un montón hoy: los duelos de acá a mañana no dan premio.' : '');
  if(typeof cargarTopMaestro === 'function') cargarTopMaestro();
  pintarFin(!!m.gane, pr, subidas, aviso);
  const otra = $('arOtra'); if(otra){ otra.querySelector('b').textContent = 'Otro duelo'; }
}

/* ---- pantalla para crear o unirse a una sala ---- */
let dueloPendiente = '';   // código que llegó por link (#duelo=XXXXX)
try{ const mm = /[#&]duelo=([A-Za-z0-9]{4,8})/.exec(location.hash || ''); if(mm){ dueloPendiente = mm[1].toUpperCase(); history.replaceState(null, '', location.pathname + location.search); } }catch(e){}

function pintarDuelo(equipo, volver){
  const root = $('arRoot');
  root.innerHTML = `<div class="ar-pick ar-duelo">
    <h2>Duelo con un amigo</h2>
    <p>Peleás en vivo contra el equipo real de tu amigo. Tu equipo:</p>
    <div class="ar-duelo-eq">${equipo.map(p => `<img src="${spIcono(p.id, (mejorEjemplar(p.id) || {}).s)}" alt="${p.name}" title="${p.name}" width="48" height="48">`).join('')}</div>
    <div class="ar-duelo-ops">
      <button class="ar-b ar-go" id="arDCrear"><b>Crear sala</b><small>Te damos un código para pasarle</small></button>
      <div class="ar-duelo-o">o</div>
      <div class="ar-duelo-unir">
        <input id="arDCodigo" maxlength="5" placeholder="Código" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Código de la sala" value="${dueloPendiente}">
        <button class="ar-b" id="arDUnir"><b>Unirme</b></button>
      </div>
    </div>
    <div class="ar-duelo-estado" id="arDEstado" role="status" aria-live="polite"></div>
    <div class="ar-pick-pie"><button class="ar-b ar-med" id="arDVolver"><b>← Volver</b></button></div>
  </div>`;
  const est = $('arDEstado'), ids = equipo.map(p => p.id);
  const ocupado = si => { ['arDCrear', 'arDUnir', 'arDCodigo'].forEach(id => { const el = $(id); if(el) el.disabled = si; }); };
  const motivo = mm => ({no_es_tuyo:'Ese Pokémon no está en tu álbum.', equipo_invalido:'Elegí entre 3 y 6 Pokémon.', no_existe:'No hay ninguna sala con ese código.',
    llena:'Esa sala ya está llena (máximo 5).', propia:'Esa sala la creaste vos: pasale el código a tu amigo.', empezada:'Ese duelo ya empezó.',
    muchas_salas:'Creaste muchas salas seguidas, esperá unos minutos.', sin_sesion:'Volvé a entrar al juego.', vacio:'Escribí el código.',
    expulsado:'El anfitrión te sacó de esa sala.'})[mm] || 'No se pudo: ' + mm;
  const aviso = {hace_falta_otro:'Hace falta otro entrenador para empezar.', solo_dos:'Por ahora se pelea 1 vs 1: tienen que quedar 2 en la sala. (2 vs 2 y todos contra todos vienen pronto.)',
    sin_conexion:'Alguien perdió la conexión: esperá que vuelva.', equipos_parejos:'Para 2 vs 2 tienen que ser 2 y 2: tocá el equipo de un jugador para cambiarlo.'};
  const NOMBRE_MODO = {'1v1':'⚔️ 1 vs 1', '2v2':'🤝 2 vs 2', 'ffa':'🥊 Todos contra todos'};
  const esc = t => String(t).replace(/[<>&"]/g, '');
  /* sala de espera: lista de entrenadores, anfitrión 👑 que puede expulsar y empezar */
  const pintarLobby = m => {
    const ops = document.querySelector('.ar-duelo-ops'); if(ops) ops.hidden = true;
    const pie = $('arDVolver'); if(pie) pie.hidden = true;
    let box = $('arDLobby');
    if(!box){ box = document.createElement('div'); box.id = 'arDLobby'; box.className = 'ar-lobby'; est.parentNode.insertBefore(box, est); }
    const soyHost = m.host === m.yo, n = m.jugadores.length;
    const dosVsDos = m.modo === '2v2', nA = m.jugadores.filter(x => x.bando === 'A').length, nB = m.jugadores.filter(x => x.bando === 'B').length;
    const listo = !!m.modo && (!dosVsDos || (nA === 2 && nB === 2));
    const modo = n < 2 ? 'Esperando entrenadores… (podés sumar hasta 5)'
      : m.modos.length > 1 ? `<span class="ar-lobby-modos" role="group" aria-label="Modo de batalla">${m.modos.map(k => `<button type="button" class="ar-b ar-lobby-m${k === m.modo ? ' on' : ''}" data-m="${k}"${soyHost ? '' : ' disabled'} aria-pressed="${k === m.modo}"><b>${NOMBRE_MODO[k]}</b></button>`).join('')}</span>`
      : `${NOMBRE_MODO[m.modo]} listo`;
    box.innerHTML = `<div class="ar-lobby-cod">Sala <b>${esc(m.codigo)}</b></div>
      <div class="ar-lobby-comp"><button class="ar-b" id="arLCopiar"><b>Copiar código</b></button><button class="ar-b ar-wa" id="arLWa"><b>WhatsApp</b></button></div>
      <ul class="ar-lobby-lista" aria-label="Entrenadores en la sala">${m.jugadores.map(x => `<li${x.conectado ? '' : ' class="off"'}>
        <span>${x.id === m.host ? '👑 ' : ''}<b>${esc(x.nombre)}</b>${x.id === m.yo ? ' (vos)' : ''}${x.conectado ? '' : ' · sin conexión'}</span>
        <span class="ar-lobby-acc">${dosVsDos ? `<button type="button" class="ar-b ar-lobby-b b${x.bando}" data-b="${x.id}" data-bando="${x.bando}"${soyHost ? '' : ' disabled'} aria-label="Equipo ${x.bando} de ${esc(x.nombre)}"><b>Equipo ${x.bando}</b></button>` : ''}
        ${soyHost && x.id !== m.yo ? `<button class="ar-b ar-lobby-x" data-id="${x.id}" aria-label="Expulsar a ${esc(x.nombre)}"><b>Expulsar</b></button>` : ''}</span></li>`).join('')}</ul>
      <div class="ar-lobby-modo" role="status">${modo}</div>
      ${dosVsDos && !listo ? '<div class="ar-duelo-esp">Para 2 vs 2 tienen que ser 2 y 2.</div>' : ''}
      ${soyHost ? `<button class="ar-b ar-go" id="arLEmpezar"${listo ? '' : ' disabled'}><b>¡Empezar!</b></button>` : '<div class="ar-duelo-esp">Esperando que el anfitrión empiece…</div>'}
      <button class="ar-b ar-med" id="arLIrse"><b>Salir de la sala</b></button>`;
    est.textContent = '';
    $('arLCopiar').onclick = () => copiarTexto(m.codigo, $('arLCopiar').querySelector('b'));
    $('arLWa').onclick = () => window.open('https://wa.me/?text=' + encodeURIComponent(
      '¡Te invito a una sala de batalla Pokémon en Entrenadores RZ! ⚔️\nEntrá a la Arena → Duelo con un amigo y poné este código: *' + m.codigo + '*\n' + SITIO_NUEVO + '#duelo=' + m.codigo), '_blank', 'noopener');
    box.querySelectorAll('.ar-lobby-x').forEach(b => b.onclick = () => enviarSala({t:'expulsar', id:Number(b.dataset.id)}));
    box.querySelectorAll('.ar-lobby-m').forEach(b => b.onclick = () => enviarSala({t:'modo', modo:b.dataset.m}));
    box.querySelectorAll('.ar-lobby-b').forEach(b => b.onclick = () => enviarSala({t:'bando', id:Number(b.dataset.b), bando:b.dataset.bando === 'A' ? 'B' : 'A'}));
    const em = $('arLEmpezar'); if(em) em.onclick = () => { em.disabled = true; enviarSala({t:'empezar'}); setTimeout(() => { if($('arLEmpezar')) $('arLEmpezar').disabled = !listo; }, 1500); };
    $('arLIrse').onclick = () => { enviarSala({t:'irse'}); cerrarSala(); volver(); };
  };
  const alMensaje = m => {
    if(m.t === 'lobby'){ pintarLobby(m); return; }
    if(m.t === 'lobby_error'){ est.textContent = aviso[m.motivo] || 'No se pudo empezar.'; return; }
    if(m.t === 'expulsado'){
      cerrarSala(); const b = $('arDLobby'); if(b) b.remove();
      const ops = document.querySelector('.ar-duelo-ops'); if(ops) ops.hidden = false;
      const pie = $('arDVolver'); if(pie) pie.hidden = false;
      ocupado(false); est.textContent = 'El anfitrión te sacó de la sala.'; return;
    }
    if(m.t === 'sala'){
      if(m.estado === 'rival') est.innerHTML = `<b>¡${m.rival} está en la sala!</b><br>Arrancando…`;
      if(m.estado === 'rival_se_fue') est.innerHTML = 'Tu amigo se fue de la sala. Esperando que vuelva…';
      return;
    }
    if(m.t === 'empezar'){ RED.alMensaje = mensajeDuelo; luchar(null, m); return; }
    if(m.t === 'error_red'){ est.textContent = 'Sin conexión con la sala. Probá de nuevo.'; ocupado(false); }
  };
  $('arDVolver').onclick = () => { cerrarSala(); volver(); };
  $('arDCrear').onclick = () => {
    ocupado(true); est.textContent = 'Creando la sala…';
    api('/duelo/sala', {equipo:ids}).then(res => {
      if(!res.ok){ est.textContent = motivo(res.motivo); ocupado(false); return; }
      est.textContent = 'Abriendo la sala…';
      conectarSala(res.codigo, alMensaje);
    }).catch(() => { est.textContent = 'Sin conexión, probá de nuevo.'; ocupado(false); });
  };
  const unir = () => {
    const codigo = $('arDCodigo').value.trim().toUpperCase();
    if(!codigo){ est.textContent = 'Escribí el código que te pasó tu amigo.'; return; }
    ocupado(true); est.textContent = 'Entrando a la sala…';
    api('/duelo/unirse', {codigo, equipo:ids}).then(res => {
      if(!res.ok){ est.textContent = motivo(res.motivo); ocupado(false); return; }
      dueloPendiente = '';
      est.innerHTML = `<b>Sala de ${res.rival}</b><br>Conectando…`;
      conectarSala(codigo, alMensaje);
    }).catch(() => { est.textContent = 'Sin conexión, probá de nuevo.'; ocupado(false); });
  };
  $('arDUnir').onclick = unir;
  $('arDCodigo').addEventListener('keydown', ev => { if(ev.key === 'Enter') unir(); });
}

function limpiar(){
  TOK++; cancelAnimationFrame(RAF); RAF = 0;
  if(RO){ RO.disconnect(); RO = null; }
  AR = null; ST = null; FX = null; SHAKE = null; BG = null; PISO = null; E = {};
  window.__arena = null;
}

function cerrarArena(){
  if(AR && AR.online && AR.fase !== 'fin') enviarSala({t:'salir'});
  cerrarSala();
  limpiar();
  $('arenaOverlay').classList.remove('show');
  $('arRoot').innerHTML = '';
  if(typeof updateBarras === 'function') updateBarras();
}

/* ---------------- teclado ---------------- */
const TECLAS_ACC = {j:'corto', z:'corto', k:'medio', x:'medio', l:'largo', c:'largo', ' ':'esquivar', shift:'esquivar'};
document.addEventListener('keydown', e => {
  const ov = $('arenaOverlay');
  if(!ov || !ov.classList.contains('show')) return;
  const k = e.key.toLowerCase();
  if(k === 'escape'){ e.stopPropagation(); pedirSalida(); return; }
  if(!AR || !AR.keys) return;
  if(['a', 'd', 'w', 's', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)){ AR.keys.add(k); e.preventDefault(); return; }
  if(TECLAS_ACC[k]){ if(!e.repeat) pulsar(TECLAS_ACC[k]); else AR.hold.add(TECLAS_ACC[k]); e.preventDefault(); return; }
  if(k === 'q' || k === 'e') abrirEquipo(false);
});
document.addEventListener('keyup', e => {
  if(!AR || !AR.keys) return;
  const k = e.key.toLowerCase();
  AR.keys.delete(k);
  if(TECLAS_ACC[k]) AR.hold.delete(TECLAS_ACC[k]);
});
window.addEventListener('blur', () => { if(AR && AR.keys){ AR.keys.clear(); AR.hold.clear(); } });

window.abrirArena = abrirArena;
window.abrirDueloRapido = abrirDueloRapido;
window.puedeDueloRapido = puedeDueloRapido;
})();
