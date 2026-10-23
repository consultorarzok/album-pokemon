/* ====================== ARENA DE BATALLA (Kanto y Johto) · tiempo real ======================
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
const PREMIO = {ganar:80, perder:15, porKO:20, porVivo:15, segPorMoneda:3, topeTiempo:60};
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
  ['Aerochorro','flying','rayo','l'],['Agarre','normal','garra','c'],['Agua Fría','water','chorro','m'],['Agua Lodosa','water','propia','l'],
  ['Aguijón Letal','bug','aguijon','c'],['Aire Afilado','flying','tornado','m','medialuna'],['Ala Bis','flying','golpe','c'],
  ['Ala de Acero','steel','golpe','c'],['Alarido','dark','onda','m'],['Alboroto','normal','propia','l'],['Allanador Férreo','steel','embestida','l'],
  ['Alto Voltaje','electric','bola','m'],['Alud','ice','golpe','c'],['Anillo Ígneo','fire','zona','l'],['Antiaéreo','rock','piedra','m'],
  ['Arañazo','normal','garra','c'],['Arenas Ardientes','ground','tornado','m'],['Aria Burbuja','water','propia','l'],['Arrumaco','psychic','golpe','c'],
  ['Asalto Barrera','psychic','golpe','c'],['Ascuas','fire','bola','m','llama'],['Atadura','normal','latigo','c'],
  ['Ataque Aéreo','flying','embestida','l'],['Ataque Ala','flying','golpe','c'],['Ataque Arena','ground','polvo','m'],
  ['Ataque Furia','normal','picotazo','c'],['Ataque Óseo','ground','hueso','m'],['Ataque Rápido','normal','golpe','c'],['Atizar','normal','cuerpo','c'],
  ['Autodestrucción','normal','propia','l'],['Avalancha','rock','lluvia','l','roca'],['Azote','normal','golpe','c'],
  ['Beso Amoroso','normal','onda','m','corazon'],['Beso Drenaje','fairy','bola','m','corazon'],['Beso Dulce','fairy','onda','m','corazon'],
  ['Bofetón Lodo','ground','lodo','m'],['Bola de Polen','bug','zona','l'],['Bola Hielo','ice','piedra','m','cristal'],
  ['Bola Sombra','ghost','bola','m','bola'],['Bola Voltio','electric','bola','m','voltio'],['Bomba Ácida','poison','lodo','m'],
  ['Bomba Fango','ground','lodo','m','lodo'],['Bomba Germen','grass','semillas','m'],['Bomba Huevo','normal','bola','m','huevo'],
  ['Bomba Imán','steel','estrella','m','estrella'],['Bomba Lodo','poison','lodo','m'],['Bomba Sónica','normal','onda','m','anillo'],
  ['Bombardeo','normal','bola','m','huevo'],['Bote','flying','cuerpo','c'],['Brillo Mágico','fairy','estrella','m','estrella'],
  ['Brinco','bug','cuerpo','c'],['Bruma Explosiva','fairy','propia','l'],['Buceo','water','golpe','c'],['Bucle Arena','ground','tornado','m'],
  ['Burbuja','water','burbujas','m'],['Cabeza de Hierro','steel','golpe','c'],['Cabezazo','normal','embestida','l'],
  ['Cabezazo Zen','psychic','golpe','c'],['Canto','normal','onda','m','nota'],['Canto Encantador','fairy','onda','m','nota'],
  ['Cañón Resplandor','steel','onda','m'],['Cara Susto','normal','onda','m'],['Carámbano','ice','agujas','m','cristal'],
  ['Carantoña','fairy','embestida','l'],['Carga Dragón','dragon','embestida','l'],['Carga Parábola','electric','rayito','m'],
  ['Cascada','water','golpe','c'],['Chispa','electric','golpe','c'],['Chispazo','electric','propia','l'],['Chulería','dark','golpe','c'],
  ['Chupavidas','bug','mordisco','c'],['Chuzos','ice','lluvia','l','cristal'],['Ciclón','dragon','tornado','m'],
  ['Ciclón de Hojas','grass','tornado','m'],['Clavo Cañón','normal','agujas','m'],['Cola Dragón','dragon','latigo','c'],
  ['Cola Férrea','steel','embestida','l'],['Cola Veneno','poison','latigo','c'],['Cólera Ardiente','fire','golpe','c'],
  ['Colmillo Hielo','ice','mordisco','c'],['Colmillo Ígneo','fire','mordisco','c'],['Colmillo Rayo','electric','mordisco','c'],
  ['Colmillo Veneno','poison','mordisco','c'],['Comesueños','psychic','zona','l'],['Cometa Draco','dragon','lluvia','l','estrella'],
  ['Concha Filo','water','garra','c'],['Confusión','psychic','onda','m'],['Constricción','normal','latigo','c'],['Contraataque','fighting','golpe','c'],
  ['Cornada','normal','picotazo','c'],['Corte','normal','garra','c'],['Corte Furia','bug','garra','c'],['Cuchilla Solar','grass','embestida','l'],
  ['Cuchillada','normal','garra','c'],['Cuerno Certero','steel','picotazo','c'],['Cuerpo Pesado','steel','cuerpo','c'],
  ['Danza Pétalo','grass','lluvia','l','hoja'],['Demolición','fighting','golpe','c'],['Derribo','normal','embestida','l'],
  ['Desahogo','dark','golpe','c'],['Desarme','dark','golpe','c'],['Desquite','fighting','golpe','c'],['Destructor','normal','golpe','c'],
  ['Día de Pago','normal','monedas','m','moneda'],['Disparo Demora','bug','polvo','m'],['Disparo Espejo','steel','onda','m'],
  ['Disparo Lodo','ground','lodo','m'],['Doble Ataque','bug','aguijon','c'],['Doble Bofetón','normal','golpe','c'],
  ['Doble Filo','normal','embestida','l'],['Doble Golpe','normal','golpe','c'],['Doble Patada','fighting','patada','c'],
  ['Dragoaliento','dragon','onda','m','llama'],['Dulce Aroma','normal','polvo','m'],['Electrocañón','electric','rayo','l'],
  ['Electrotela','electric','polvo','m'],['Empujón','fighting','golpe','c'],['Energibola','grass','bola','m'],['Enfado','dragon','embestida','l'],
  ['Envidia Ardiente','fire','bola','m','llama'],['Envite Acuático','water','embestida','l'],['Envite Ígneo','fire','embestida','l'],
  ['Erupción de Ira','fire','embestida','l'],['Escaldar','water','chorro','m'],['Esfera Aural','fighting','bola','m','bola'],
  ['Esfuerzo','normal','golpe','c'],['Espora','grass','polvo','m'],['Esporagodón','grass','polvo','m'],['Esquirla Helada','ice','piedra','m','cristal'],
  ['Estallido','fire','zona','l'],['Estoicismo','bug','bola','m'],['Estrujón','normal','bola','m'],['Excavar','ground','golpe','c'],
  ['Explosión','normal','propia','l'],['Fachada','normal','golpe','c'],['Falso Tortazo','normal','garra','c'],['Finta','dark','garra','c'],
  ['Fisura','ground','propia','l'],['Fitoimpulso','grass','golpe','c'],['Frío Polar','ice','zona','l'],['Fuego Fatuo','fire','bola','m','llama'],
  ['Fuego Sagrado','fire','zona','l'],['Fuerza','normal','golpe','c'],['Fuerza Bruta','fighting','embestida','l'],
  ['Fuerza Equina','ground','embestida','l'],['Fuerza Lunar','fairy','rayo','l'],['Furia','normal','golpe','c'],
  ['Furia Dragón','dragon','bola','m','llama'],['Furia Taurina','normal','embestida','l'],['Gancho Alto','fighting','golpe','c'],
  ['Garra Brutal','normal','garra','c'],['Garra Dragón','dragon','garra','c'],['Garra Metal','steel','garra','c'],['Garra Umbría','ghost','garra','c'],
  ['Gas Venenoso','poison','polvo','m'],['Gigadrenado','grass','semillas','m'],['Gigaimpacto','normal','embestida','l'],
  ['Giro Bola','steel','cuerpo','c'],['Giro Fuego','fire','bola','m','llama'],['Giro Rápido','normal','cuerpo','c'],['Giro Vil','dark','golpe','c'],
  ['Golpe Aéreo','flying','garra','c'],['Golpe Bis','dragon','golpe','c'],['Golpe Cabeza','normal','golpe','c'],['Golpe Calor','fire','cuerpo','c'],
  ['Golpe Cuerpo','normal','cuerpo','c'],['Golpe Fantasma','ghost','embestida','l'],['Golpe Kárate','fighting','golpe','c'],
  ['Golpe Mordaza','dark','mordisco','c'],['Golpe Rastrero','bug','golpe','c'],['Golpe Roca','fighting','golpe','c'],
  ['Golpes Furia','normal','garra','c'],['Guardia Baja','normal','golpe','c'],['Guillotina','normal','embestida','l'],
  ['Hidroariete','water','golpe','c'],['Hidrobomba','water','rayo','l'],['Hidrocañón','water','rayo','l'],['Hidropulso','water','onda','m'],
  ['Hierba Lazo','grass','latigo','c'],['Hipercolmillo','normal','mordisco','c'],['Hiperrayo','normal','rayo','l'],
  ['Hipertaladro','normal','embestida','l'],['Hipnosis','psychic','onda','m'],['Hoja Afilada','grass','hojas','m'],['Hoja Aguda','grass','garra','c'],
  ['Hoja Mágica','grass','hojas','m'],['Hueso Palo','ground','hueso','m'],['Huesomerang','ground','hueso','m'],['Humareda','fire','propia','l'],
  ['Ida y Vuelta','bug','golpe','c'],['Impactrueno','electric','rayito','m'],['Impresionar','ghost','golpe','c'],['Infierno','fire','rayo','l'],
  ['Infortunio','ghost','bola','m'],['Inversión','fighting','golpe','c'],['Joya de Luz','rock','estrella','m','estrella'],
  ['Juego Sucio','dark','zona','l'],['Ladrón','dark','garra','c'],['Lanzallamas','fire','rayo','l'],['Lanzamugre','poison','zona','l'],
  ['Lanzarrocas','rock','piedra','m'],['Lariat Oscuro','dark','golpe','c'],['Láser Doble','psychic','rayito','m'],['Latigazo','grass','embestida','l'],
  ['Látigo Cepa','grass','latigo','c'],['Lengüetazo','ghost','latigo','c'],['Liofilización','ice','piedra','m','cristal'],
  ['Llama Embrujada','fire','bola','m','llama'],['Llama Final','fire','rayo','l'],['Llamarada','fire','zona','l'],['Llave Corsé','fighting','golpe','c'],
  ['Llave Giro','fighting','cuerpo','c'],['Llave Vital','fighting','golpe','c'],['Lluevehojas','grass','lluvia','l','hoja'],
  ['Machada','fighting','embestida','l'],['Magnitud','ground','propia','l'],['Manto Espejo','psychic','onda','m'],['Martillazo','water','zona','l'],
  ['Mazazo','grass','embestida','l'],['Megaagotar','grass','semillas','m'],['Megacuerno','bug','embestida','l'],['Megapatada','normal','embestida','l'],
  ['Megapuño','normal','golpe','c'],['Metaláser','steel','rayo','l'],['Meteoros','normal','estrella','m','estrella'],
  ['Metrónomo','normal','estrella','m'],['Mil Púas Tóxicas','poison','cuerpo','c'],['Mismo Destino','ghost','zona','l'],
  ['Moflete Estático','electric','golpe','c'],['Mordisco','dark','mordisco','c'],['Nieve Polvo','ice','tornado','m'],['Nitrocarga','fire','golpe','c'],
  ['Onda Certera','fighting','zona','l','bola'],['Onda Ígnea','fire','propia','l'],['Onda Mental','psychic','rayo','l'],
  ['Onda Tóxica','poison','propia','l'],['Onda Trueno','electric','rayito','m'],['Onda Vacío','fighting','onda','m','medialuna'],
  ['Onda Voltio','electric','rayito','m'],['Pájaro Osado','flying','embestida','l'],['Palma Rauda','fighting','golpe','c'],
  ['Pantalla de Humo','normal','polvo','m'],['Paralizador','grass','polvo','m'],['Paranormal','psychic','onda','m'],
  ['Patada Baja','fighting','patada','c'],['Patada Giro','fighting','patada','c'],['Patada Hacha','fighting','embestida','l'],
  ['Patada Ígnea','fire','patada','c'],['Patada Salto','fighting','embestida','l'],['Patada Salto Alta','fighting','embestida','l'],
  ['Pataleta','ground','golpe','c'],['Pedrada','rock','piedra','m'],['Perforador','normal','embestida','l'],['Persecución','dark','golpe','c'],
  ['Picadura','bug','mordisco','c'],['Pico Taladro','flying','picotazo','c'],['Picotazo','flying','picotazo','c'],
  ['Picotazo Veneno','poison','aguijon','c'],['Pin Misil','bug','agujas','m'],['Pirotecnia','fire','bola','m','llama'],
  ['Pirueta Helada','ice','patada','c'],['Pisotón','normal','cuerpo','c'],['Pistola Agua','water','chorro','m'],['Placaje','normal','golpe','c'],
  ['Placaje Eléctrico','electric','embestida','l'],['Plancha','bug','cuerpo','c'],['Plancha Corporal','fighting','cuerpo','c'],
  ['Plancha Voltaica','electric','embestida','l'],['Planta Feroz','grass','zona','l'],['Plumerazo','normal','latigo','c'],
  ['Poder Oculto','normal','estrella','m','estrella'],['Poder Pasado','rock','piedra','m'],['Poder Reserva','psychic','bola','m'],
  ['Poltergeist','ghost','embestida','l'],['Polución','poison','polvo','m'],['Polvo Veneno','poison','polvo','m'],
  ['Premonición','psychic','lluvia','l','estrella'],['Prensa Metálica','steel','golpe','c'],['Presente','normal','bola','m','huevo'],
  ['Psicoataque','psychic','zona','l'],['Psicocarga','psychic','onda','m'],['Psicocolmillo','psychic','mordisco','c'],
  ['Psicocorte','psychic','garra','c'],['Psicoonda','psychic','onda','m'],['Psicorrayo','psychic','onda','m','arcoiris'],
  ['Psicorruido','psychic','onda','m'],['Psíquico','psychic','zona','l'],['Pulpocañón','water','chorro','m'],['Pulso de Campo','normal','bola','m'],
  ['Pulso Dragón','dragon','bola','m','llama'],['Pulso Umbrío','dark','bola','m'],['Puntapié','fighting','patada','c'],['Puño Bala','steel','golpe','c'],
  ['Puño Cometa','normal','golpe','c'],['Puño Dinámico','fighting','embestida','l'],['Puño Drenaje','fighting','golpe','c'],
  ['Puño Fuego','fire','golpe','c'],['Puño Furia','ghost','golpe','c'],['Puño Hielo','ice','golpe','c'],['Puño Incremento','fighting','golpe','c'],
  ['Puño Mareo','normal','golpe','c'],['Puño Meteoro','steel','embestida','l'],['Puño Sombra','ghost','golpe','c'],
  ['Puño Trueno','electric','golpe','c'],['Puya Nociva','poison','aguijon','c'],['Ráfaga Escamas','dragon','golpe','c'],['Rayo','electric','rayo','l'],
  ['Rayo Aurora','ice','onda','m','arcoiris'],['Rayo Burbuja','water','burbujas','m'],['Rayo Carga','electric','rayito','m'],
  ['Rayo Confuso','ghost','onda','m'],['Rayo Hielo','ice','rayo','l'],['Rayo Meteórico','rock','rayo','l'],['Rayo Señal','bug','onda','m'],
  ['Rayo Solar','grass','rayo','l'],['Represalia','normal','golpe','c'],['Resarcimiento','dark','golpe','c'],['Residuos','poison','lodo','m'],
  ['Restricción','normal','latigo','c'],['Retribución','normal','golpe','c'],['Roca Afilada','rock','lluvia','l','roca'],['Rodar','rock','cuerpo','c'],
  ['Rodillo de Púas','bug','golpe','c'],['Rueda Fuego','fire','cuerpo','c'],['Salmuera','water','chorro','m'],['Salpicadura','normal','burbujas','m'],
  ['Salpicar','water','propia','l'],['Saña','normal','embestida','l'],['Semilladora','grass','semillas','m'],['Sísmico','fighting','zona','l'],
  ['Sofoco','fire','zona','l'],['Sombra Vil','ghost','bola','m'],['Somnífero','grass','polvo','m'],['Sumisión','fighting','cuerpo','c'],
  ['Superdiente','normal','mordisco','c'],['Supersónico','normal','onda','m'],['Surf','water','propia','l'],
  ['Tajo Aéreo','flying','tornado','m','medialuna'],['Tajo Cruzado','fighting','embestida','l'],['Tajo Umbrío','dark','garra','c'],
  ['Taladradora','ground','picotazo','c'],['Telaraña','bug','polvo','m'],['Tenaza','water','garra','c'],['Teraexplosión','normal','estrella','m'],
  ['Terratemblor','ground','suelo','m'],['Terremoto','ground','propia','l'],['Testarazo','rock','embestida','l'],['Tierra Viva','ground','suelo','m'],
  ['Tijera X','bug','garra','c'],['Tinieblas','ghost','onda','m'],['Torbellino','water','tornado','m'],['Tormenta Floral','grass','lluvia','l','hoja'],
  ['Tornado','flying','tornado','m'],['Transformación','normal','estrella','m'],['Treparrocas','normal','embestida','l'],
  ['Triataque','normal','estrella','m','estrella'],['Triple Axel','ice','golpe','c'],['Triple Patada','fighting','patada','c'],
  ['Triturar','dark','mordisco','c'],['Trueno','electric','trueno','l'],['Tumba Rocas','rock','piedra','m'],['Ultrapuño','fighting','golpe','c'],
  ['Vaho Gélido','ice','tornado','m'],['Vasta Fuerza','psychic','bola','m'],['Vasto Impacto','dragon','golpe','c'],
  ['Velocidad Extrema','normal','golpe','c'],['Vendaval','flying','lluvia','l','pluma'],['Vendetta','dark','golpe','c'],
  ['Veneno X','poison','garra','c'],['Ventisca','ice','lluvia','l','cristal'],['Viento Aciago','ghost','tornado','m'],
  ['Viento Cortante','normal','lluvia','l'],['Viento Feérico','fairy','tornado','m'],['Viento Hielo','ice','tornado','m'],
  ['Viento Plata','bug','tornado','m'],['Viraje','water','golpe','c'],['Voltio Cruel','electric','embestida','l'],['Voto Agua','water','chorro','m'],
  ['Voto Fuego','fire','bola','m','llama'],['Voto Planta','grass','bola','m'],['Voz Cautivadora','fairy','onda','m'],['Vozarrón','normal','propia','l'],
  ['Vuelo','flying','embestida','l'],['Zumbido','bug','rayo','l']
];
const MOVS_APR = `1 212,271,186.2,146.2,1.2,98.3,29.3,171.3/191,50,325.1,163.1,193.1,227.2,53.2,336.2/322,211,106,117,104.1,221.1,379.1,64.1;
2 212,271,186.2,146.2,1.2,98.3,29.3,171.3/191,50,227.2,53.2,163.2,336.2,193.2,125.2/322,211,106,117,104.1,221.2,126.3;
3 212,271,312.2,186.2,146.2,1.2,98.3,29.3/191,50,227.2,53.2,163.2,336.2,193.2,125.2/322,104,211,359,106,117,276.2,221.2;
4 88,23,154,179,101,160,31.1,237.1/28,166,267,155,120,279.1,13.1,297.1/206,129,200,38.1,126.1,84.1,72.1,217.2;
5 88,23,154,179,101,160,237.1,96.1/28,166,267,155,120,279.1,386.2,232.3/206,129,200,84.1,72.1,217.2,241.2,338.2;
6 31,88,23,96,154,179,101,160/28,166,345,267,155,120,279.1,13.2/206,241,129,200,84.1,72.1,390.2,217.2;
7 171,271,237,167,7.1,39.1,74.2,60.2/270,316,62,185,332.1,94.1,224.1,132.1/183,6,128,64,334.1,11.1,344.2,229.3;
8 171,271,237,167,7.1,39.1,74.2,60.2/270,316,62,185,224.1,358.2,332.2,131.2/183,6,128,64,334.1,344.2,11.2,229.3;
9 7,171,271,237,167,39.1,74.2,60.2/270,316,62,185,68,224.1,358.2,332.2/183,6,128,64,334.1,344.2,184.2,11.2;
10 262,271/123.3/262!embestida,123.3!embestida,271!embestida;11 262.2/123.3/262.2!embestida,123.3!embestida;
12 262,271,169.2,197.2,5.2,14.2,171.3,154.3/360,382,345,292,94,13.2,321.2,138.2/391,374.2,44.2,379.3,106.3,117.3,188.3,322.3;
13 265,262/123.3/262!embestida,123.3!embestida,265!embestida;14 262.2/123.3/262.2!embestida,123.3!embestida;
15 265,115,99,312,262,12,33,264/266,53.2,382.2,138.2,4.2,227.3,232.3,163.3/126,106.3,117.3,188.3,322.3,64.3,164.3;
16 31,271,35,169,144.1,15.1,261.1,171.2/360,345,80,13.1,232.2,278.2,43.3,378.3/379,374,17.1,247.1,390.2,106.2,117.2,30.2;
17 31,271,35,169,171.2,154.2,327.2,142.2/360,345,80,232.2,278.2,13.2,43.3,378.3/379,374,390.2,106.2,117.2,30.2,17.2,241.3;
18 31,271,35,169,171.2,154.2,327.2,142.2/360,345,80,232.2,278.2,13.2,43.3,378.3/379,30,374,241,390.2,106.2,117.2,188.2;
19 271,35,187,342,133,237,261,366/232.2,278.2,270.3,316.3,53.3,43.3,381.3,46.3/106,117,17.1,64.2,319.3,377.3,314.3,367.3;
20 271,35,179,187,342,133,237,96/232.2,278.2,270.3,316.3,53.3,43.3,381.3,46.3/106,117,188.2,64.2,17.2,164.2,319.3,377.3;
21 31,33,264,263,169,261,35.1,143.1/363.1,232.2,278.2,13.2,43.3,80.3,378.3/106,379.1,30.1,17.1,390.2,117.2,241.3;
22 31,33,264,263,35,169,261,348/232.2,363.2,278.2,13.2,43.3,80.3,378.3/106,30,379.2,390.2,117.2,188.2,17.2,164.2;
23 265,312,36,95,237,90.1,85.1,261.1/3,53,48,49,227.3,43.3,163.3,278.3/207,84.1,243.2,106.3,117.3,353.3,145.3,64.3;
24 265,312,36,95,237,366,89,87/3,53,48,49,227.3,43.3,163.3,278.3/207,243.2,106.3,117.3,188.3,353.3,145.3,64.3;
25 75,236,36,119,35,311.2,230.3,171.3/198,47,232,246.2,317.2,123.2,19.2,111.3/314,367,76,384,84,122.2,272.2,229.3;
26 311,75,236,36,35,230.3,171.3,173.3/198,47,232,246.2,317.2,123.2,19.2,111.3/314,367,76,84,122.2,384.2,229.3,106.3;
27 140,23,265,179,101,329,99,167/61,352,232,43.1,114.1,355.2,24.2,278.3/353,223,38.1,362.1,145.2,152.2,106.3,117.3;
28 140,23,265,96,179,101,329,99/61,352,232,43.1,114.2,355.2,24.2,266.3/353,223,145.2,152.2,106.3,117.3,188.3,337.3;
29 265,90,23,119,271,237,179,342/355,53.2,43.3,278.3,246.3,185.3/106.1,64.1,84.1,117.3,319.3,377.3,314.3,367.3;
30 265,90,23,119,271,237,179,342/355,53.2,270.3,316.3,43.3,278.3,246.3,185.3/260.3,106.3,117.3,319.3,377.3,314.3,367.3,64.3;
31 265,23,119,271,173,237,96,179/355,53.2,43.2,61.2,114.2,352.2,24.2,111.3/243,151,353.2,145.2,152.2,229.3,260.3,106.3;
32 265,312,119,97,33,271,264,85.1/355,94.1,53.2,43.3,278.3,246.3,185.3/260,106.1,335.1,84.1,354.1,117.3,319.3,377.3;
33 265,312,119,97,33,271,264,98.3/355,53.2,270.3,316.3,43.3,278.3,246.3,185.3/260,106.3,117.3,319.3,377.3,314.3,367.3,64.3;
34 265,312,119,97,33,271,264,96/355,53.2,43.2,61.2,114.2,352.2,24.2,111.3/243,335,228,353.2,145.2,152.2,229.3,260.3;
35 110,116,271,173,230.3,304.3,306.3,311.3/388,41,380,280,286.1,57.2,67.2,270.3/153,117,294,309,71.2,59.2,229.3,106.3;
36 110,116,271,230.3,304.3,306.3,311.3,171.3/388,41,380,280,286.1,57.2,67.2,270.3/153,117,294,309,71.2,59.2,229.3,106.3;
37 331,271,35,144,375,239.1,39.1,277.1/28,166,267,251,201,125.1,215.2,127.2/206,217,200,241.1,129.1,338.2,106.3,117.3;
38 331,271,35,239.1,39.1,171.3,173.3,140.3/28,166,251,201,215.2,127.2,357.3,232.3/206,217,200,241.2,338.2,129.2,106.3,117.3;
39 110,116,173,329,165,230.2,171.2,150.2/388,232.2,363.2,278.2,41.2,57.2,351.2,67.2/117,389,71,229.2,106.2,37.2,64.2,17.2;
40 110,116,173,165,230.2,171.2,150.2,154.2/388,232.2,363.2,278.2,41.2,57.2,351.2,67.2/117,389,71,229.2,106.2,188.2,37.2,64.2;
41 31,90,376,5,237,78,199,35.1/360,13,345,2,232,163.1,53.2,227.3/247.1,390.2,379.3,106.3,117.3,17.3,241.3;
42 31,90,376,5,237,35,78,366/360,13,345,2,232,53.2,227.3,163.3/390.2,247.2,379.3,106.3,117.3,188.3,17.3,241.3;
43 39.1,186.2,146.2,1.2,98.3,171.3,154.3,327.3/3,2,227,191,163,53.2,336.2,193.2/322,104,153,221.2,106.3,117.3;
44 39.1,186.2,146.2,1.2,98.3,171.3,154.3,327.3/3,2,227,191,163,53.2,336.2,193.2/322,104,359,153,221.2,106.3,117.3,44.3;
45 39.1,186.2,146.2,1.2,98.3,171.3,173.3,154.3/3,2,227,163,191.1,53.2,336.2,193.2/322,104,359,153,221.2,243.2,100.2,106.3;
46 78,99,356,23,179,101,262.1,12.1/2,163,125,292.1,227.2,336.2,50.2,138.2/322.2,106.3,117.3,64.3;
47 78,99,356,23,179,101,376,186.2/2,163,125,227.2,336.2,50.2,138.2,53.3/322.2,106.3,117.3,188.3,64.3,164.3;
48 78,90,271,65,262.1,273.2,177.2,58.2/321,138,292,227,94,163.1,53.2,48.2/391,294,106.3,117.3,322.3;
49 78,90,271,65,197.2,262.2,273.2,177.2/382,321,138,360,292,227,94,345/391,294,243.2,379.3,106.3,117.3,188.3,322.3;
50 140,23,179,101,199,171.1,202.1,144.1/43,355,49,352,279.1,61.2,114.2,24.2/353,145,223,38.1,17.1,106.3,117.3,328.3;
51 140,23,179,101,199,347,258.2,98.3/43,61,355,49,352,363,114.2,24.2/353,145,223,152.2,106.3,117.3,188.3,38.3;
52 23,179,101,237,144,347,39.1,98.2/111,232.2,278.2,351.2,270.3,316.3,43.3,381.3/71,84.1,204.1,106.2,117.2,64.2,17.2,389.2;
53 23,179,101,237,144,347,98.2,171.2/111,232,203,278.2,351.2,270.3,316.3,43.3/71,106.2,117.2,188.2,64.2,17.2,389.2,164.2;
54 23,179,65,74.2,60.2,182.2,383.2,230.3/270,62,185,292,94,49.1,316.2,358.2/183,344,6,319.1,294.1,346.1,284.1,11.2;
55 7,23,179,65,74.2,60.2,182.2,383.2/270,62,185,292,94,316.2,358.2,332.2/183,344,6,11.2,229.3,106.3,117.3,319.3;
56 175,252,23,179,261,197,323,258/43,245.2,111.3,232.3,278.3,368.3,50.3,22.3/337,346,0,335,64,126,38.1,302.2;
57 175,252,96,23,154,179,261,197/43,245.2,111.3,232.3,278.3,368.3,50.3,22.3/337,346,0,335,64,126,302.2,240.2;
58 331,88,237,202,366,323,119.1,173.1/28,267,166.1,155.3,232.3,43.3,120.3,278.3/206,241,129,106,126,71,216.1,130.1;
59 331,88,237,202,366,373,89,323/28,166.2,155.3,232.3,43.3,120.3,278.3,297.3/206,129,216,106,117,71,217.2,241.2;
60 110,116,173,252,133.1,74.2,60.2,182.2/270,316,62,114,355,49,185.1,45.1/183,117,11.1,344.2,106.3,319.3,377.3,294.3;
61 110,116,173,252,133.1,74.2,60.2,182.2/270,316,62,114,355,49,185.1,358.2/183,117,11.1,344.2,229.3,106.3,319.3,377.3;
62 341,219,110,116,173,133.1,252.2,96.2/270,316,62,114,355,185.1,358.2,245.2/183,302,151,117,11.1,344.2,337.2,0.2;
63 304.1,306.1,311.1,108.1,65.2,230.3,171.3,173.3/94.1,291.2,288.2,232.3,363.3,278.3,46.3,321.3/294.2,91.2,229.3,106.3,117.3,337.3,64.3,122.3;
64 290,65,230.3,304.3,306.3,311.3,171.3,173.3/292,94,288,357,291.2,371.2,232.3,363.3/294,284,91.2,229.3,106.3,117.3,337.3,64.3;
65 290,65,230.3,304.3,306.3,311.3,171.3,173.3/292,94,288,357,291.2,280.2,371.2,232.3/294,284,91.2,229.3,106.3,117.3,188.3,337.3;
66 175,341,252,369,220,178,109,105/245.2,43.3,278.3,368.3,22.3,352.3/337,302,346,151,0,117,38.1,240.2;
67 175,341,252,369,220,178,109,105/245.2,43.3,278.3,368.3,22.3,352.3/337,302,346,151,0,117,240.2,229.3;
68 175,341,252,96,369,220,178,109/245.2,43.3,278.3,368.3,259.3,22.3,352.3/337,302,346,151,0,117,240.2,229.3;
69 212,312,36,95,108,78.1,186.2,146.2/3,191,139,163.1,336.1,193.1,48.1,227.2/211,322.2,221.2,243.2,106.3,117.3;
70 212,312,36,95,108,186.2,146.2,1.2/3,191,139,227.2,53.2,163.2,336.2,193.2/211,322.2,221.2,243.2,106.3,117.3;
71 212,192,312,36,95,78,108,186.2/3,191,81,227.2,53.2,163.2,336.2,193.2/221,211,322.2,243.2,106.3,117.3,188.3,164.3;
72 265,312,95,326,167.1,108.1,74.2,60.2/3,270,316,62,185,332,48,139/183,344,243,11.1,207.2,106.3,117.3,319.3;
73 265,312,95,326,167.1,108.1,74.2,60.2/3,270,316,62,185,332,48,224/183,344,243,11.2,207.2,106.3,117.3,319.3;
74 329,271,230.1,39.1,140.2,258.2,304.3,311.3/208,43,259,22,352,279.2,368.2,114.2/353,38,223,328,106,117,37,141;
75 329,271,230.1,39.1,140.2,258.2,304.3,311.3/208,43,259,22,352,279.2,368.2,114.2/353,38,223,328,106,117,37,141;
76 329,230,271,103,330,39.1,140.2,258.2/208,43,259,22,352,279.2,368.2,114.2/353,38,223,328,106,117,37,141;
77 331,239,269,119,271,35,56,118/28,166,215.2,232.3,278.3/217,129,200,106,117,260.1,335.1,152.1;
78 331,239,269,119,33,271,35,56/28,166,215.2,111.3,232.3,278.3,24.3/217,129,200,260,106,117,228,206.2;
79 65,171,271,269.1,74.2,60.2,182.2,173.3/270,94,185,292.2,316.2,291.2,358.2,332.2/344,294,284.1,183.2,91.2,6.2,106.3,117.3;
80 65,269,171,271,74.2,60.2,93.2,182.2/270,94,185,292.2,316.2,291.2,358.2,332.2/344,294,284.1,183.2,91.2,11.2,6.2,229.3;
81 75,165,271,63.2,103.2,171.3,154.3,329.3/198,113,68,52,47,54,232,123.1/314,367,122,76,141.1,384.2,231.2,106.3;
82 75,165,271,63.2,103.2,171.3,154.3,329.3/198,113,68,52,47,54,232,363/314,367,122,76,384.2,231.2,106.3,117.3;
83 98,33,264,35,101,143,169,5/13,345,191,360.1,43.1,232.2,278.2,80.3/30,247,379.2,390.2,106.2,117.2,64.2,17.2;
84 31,33,264,263,35,154,133,118/363,232.2,278.2,13.2,351.2,43.3/335,17,256,30.1,247.1,390.2,106.2,117.2;
85 31,33,264,263,35,154,133,118/363,232.2,278.2,13.2,351.2,43.3/335,17,256,30.1,390.2,106.2,117.2,188.2;
86 74,60,7,171,36.1,264.1,213.1,383.2/270,332,315,381,136,185.1,321.1,70.1/6,106,117,319,260.1,84.1,183.2,344.2;
87 74,60,7,171,213.1,20.2,182.2,383.2/270,316,315,381,332,136,321,358.2/319,147,6,260,106,117,183.2,344.2;
88 110,213.1,310.1,307.1,312.2,304.3,306.3,311.3/282,325,53,43,114,49,48.1,339.1/207,243,141.1,106.3,206.3,314.3,367.3,37.3;
89 110,312.2,304.3,306.3,311.3,171.3,173.3,150.3/282,325,53,43,114,49,48.2,227.3/207,243,153,106.3,206.3,188.3,314.3,367.3;
90 350,93,271,115.1,167.1,20.1,74.2,60.2/270,358,332,315,70,136,316.1,185.1/183,319,106.1,344.2,117.3,377.3,37.3,141.3;
91 350,93,271,115,74.2,60.2,20.2,182.2/270,315,358,70,136,82,316.2,381.2/183,319,79,344.2,377.2,106.3,117.3,188.3;
92 213,199,375,304.1,306.1,311.1,312.2,171.3/357,282,46,201,298,291.1,53.2,378.2/91,141.1,207.2,243.2,281.2,314.3,367.3,294.3;
93 213,199,310,375,312.2,161.2,304.3,306.3/357,282,46,201,298,53.2,378.2,48.2/91,207.2,243.2,174.2,281.2,314.3,367.3,294.3;
94 213,199,310,375,312.2,161.2,230.3,304.3/357,282,46,201,298,53.2,378.2,48.2/91,207.2,243.2,174.2,281.2,229.3,106.3,117.3;
95 140,329,29,36,271,154,165,39.1/208,368,61,22,352,120,259.1,43.2/353,38,328,152,117,84,354.1,141.1;
96 65,110,171,290.1,304.1,306.1,311.1,230.3/292,94,288,291.2,280.2,371.2,293.2,357.3/294,91,284,229.3,106.3,117.3,337.3,64.3;
97 65,110,171,230.3,304.3,306.3,311.3,173.3/292,94,288,291.2,280.2,371.2,293.2,357.3/294,91,284,229.3,106.3,117.3,188.3,337.3;
98 93,9,36,269,39,160,140.1,101.1/270,316,62,332,114,279.1,358.2,185.2/225,181,222.1,344.2,106.3,117.3,319.3,377.3;
99 93,9,36,269,39,160,60.2,182.2/270,316,62,332,114,358.2,185.2,131.2/225,181,222,183.2,344.2,106.3,117.3,319.3;
100 75,271,329,165,171.3,154.3,205.3,327.3/198,317,47,54,232,224,246.2,123.2/314,76,37,141,367.2,122.2,384.2,106.3;
101 75,271,329,165,171.3,154.3,205.3,327.3/198,317,47,54,232,224,246.2,123.2/314,76,37,141,367.2,122.2,384.2,275.2;
102 65.2,186.2,146.2,171.3,150.3,154.3,205.3,329.3/292,2,227,94,163,251,336,55/322,294,17,221.1,91.2,106.3,117.3,37.3;
103 269,290.2,65.2,186.2,146.2,171.3,173.3,252.3/2,227,94,163,251,336,50,288/322,221,211,226,17,294.2,91.2,284.2;
104 258,171,154,143,133,323,119.1,63.1/194,195,43,34,279.1,355.2,352.2,24.2/335,117,64.1,38.1,353.2,145.2,229.3,106.3;
105 258,171,154,143,133,323,140.2,230.3/194,195,43,34,355.2,352.2,24.2,270.3/335,117,353.2,145.2,229.3,106.3,206.3,319.3;
106 119,253,252,202,109,105,299,271/245.1,132.2,232.3,43.3,278.3,368.3,352.3,351.3/256,257,0,254,229,337.2,302.2,151.2;
107 96,369,109,157,303,307,301,230/245,232,132.2,43.3,278.3,368.3,352.3,351.3/0,257.1,337.2,302.2,240.2,229.3,106.3,117.3;
108 29,36,269,271,95,180,213,329/139,3,352,278.2,296.2,270.3,316.3,43.3/335,117,164,211,223.1,11.1,222.1,229.2;
109 271,165,171.3,173.3,154.3,205.3,329.3,327.3/282,325,53,292.1,291.1,48.2,278.3,46.3/37,141,207.2,243.2,106.3,206.3,314.3,367.3;
110 271,165,118,171.3,173.3,154.3,205.3,329.3/282,325,53,292,48.2,278.3,46.3,246.3/37,141,241,207.2,243.2,106.3,206.3,188.3;
111 348,269,97,33,271,178,180,96.1/208,259,22,352,43.2,279.2,368.2,114.2/353,38,328,152,260,106,117,228;
112 348,269,97,33,271,96,366,178/208,259,22,352,43.2,279.2,368.2,114.2/353,38,328,152,260,106,117,228;
113 110,116,271,96.1,230.2,171.2,173.2,150.2/51,388,41,380,286.1,49.1,232.2,363.2/106,117,337.1,229.2,188.2,64.2,17.2,389.2;
114 212,29,36,326,108,118,39.1,133.1/2,227,163,125,94,279,139,48/211,221.1,322.2,106.3,117.3,188.3,64.3,164.3;
115 110,301,230,269,171,154,308,118/278.2,296.2,270.3,316.3,43.3,381.3,46.3,358.3/126,117.1,17.1,222.1,229.2,106.2,188.2,64.2;
116 74,39.1,60.2,182.2,383.2,171.3,154.3,327.3/270,316,62,185,332,120,80,297/183,11.1,379.1,126.1,344.2,106.3,117.3,319.3;
117 74,39.1,60.2,182.2,383.2,171.3,154.3,327.3/270,316,62,185,332,120,80,297/183,344.2,11.2,106.3,117.3,319.3,377.3,188.3;
118 74,97,33,264,35,39,173.1,60.2/185,292.1,43.1,321.1,114.1,270.2,316.2,358.2/260,228,183.1,6.1,64.1,344.2,11.2,106.3;
119 74,97,33,264,35,39,312,60.2/185,292,270.2,316.2,358.2,131.2,232.3,43.3/260,64,228,183.2,344.2,11.2,6.2,106.3;
120 271,167,165,74.2,60.2,383.2,171.3,154.3/270,316,332,292,232,291,203,315.1/183,344,294,106.3,117.3,319.3,377.3,314.3;
121 271,167,74.2,60.2,290.2,383.2,171.3,154.3/270,292,316,291,332,232,203,358.2/183,344,294,91.2,106.3,117.3,319.3,377.3;
122 65,110,116,230.3,304.3,306.3,311.3,171.3/292,94,291,57,193,381.1,288.2,280.2/294,284.1,91.2,229.3,106.3,117.3,188.3,337.3;
123 31,99,169,356,35,101,143,261/382,345,245,13.2,138.2,232.3,278.3,378.3/379,0,391.1,106.3,117.3,188.3,64.3,164.3;
124 306,20,26,110,116,173,213,290.2/94,238,139,41,291.2,381.2,70.2,288.2/377,294,335,319.2,91.2,284.2,229.3,106.3;
125 311,75,252,35,230.3,304.3,306.3,171.3/198,246,47,232,317.2,123.2,19.2,291.3/314,367,76,164,302.1,346.1,222.1,122.2;
126 304,331,271,252,144,369.1,239.2,172.2/28,166,267,282,127.2,291.3,43.3,278.3/206,217,196,188,302.1,346.1,241.2,338.2;
127 356,262,9,29,341,150,101,220/138.2,278.3,368.3,22.3,352.3/181,335,337,151,0.1,106.3,117.3,188.3;
128 269,97,271,154,261,375,65,133.1/278.2,351.2,381.3,46.3,358.3,368.3,246.3,185.3/106,335,117,164,156,126,260.2,188.2;129 271,39,56.3/333.5/183.2;
130 74,29,271,237,154,39,366,87/358,185,332,155,80,270.2,316.2,131.2/183,6,374,335,188,126,344.2,11.2;
131 173,20.1,74.2,60.2,182.2,171.3,150.3,154.3/270,185,332,136,297,315.1,358.1,214.1/183,344,319,377,147,25.1,260.1,145.1;
132 361.5!golpe/361.5/361.5!embestida,361.5!embestida;
133 271,35,119,237,39.1,171.2,173.2,154.2/232,43.1,280.1,111.2,278.2,351.2,46.3,67.3/106,117,64.2,389.2,84.3;
134 119,271,237,35,74.2,60.2,182.2,383.2/270,62,185,315,232,316.2,358.2,332.2/183,11,6,106,117,344.2,319.3,377.3;
135 89,119,271,237,35,171.3,173.3,150.3/198,266,232,246.2,317.2,47.2,123.2,19.2/314,367,76,106,117,122.2,384.2,188.3;
136 88,119,271,237,35,154,239.2,86.2/28,166,282,232,215.2,127.2,111.3,43.3/206,217,129,196,106,117,241.2,338.2;
137 271,75,171.2,154.2,327.2,142.2,205.3,169.3/363,292,198,321,232.2,278.2,351.2,291.3/117,188,314,122,76,106.2,64.2,164.2;
138 329,29,97,237,326,36.1,108.1,74.2/270,208,279,259,332,82,114,316.1/183,344,38,11.1,320.2,106.3,117.3,319.3;
139 329,29,97,237,326,366,74.2,60.2/270,208,279,259,332,82,114,316.2/183,344,38,11.2,328.2,320.2,260.3,106.3;
140 7,182,23,78,101,140.1,39.1,167.1/208,279,332,2,227,114,139,316.1/183,38,328,106.1,344.2,320.2,117.3,319.3;
141 7,182,23,78,101,99,347,74.2/208,279,332,2,227,114,139,270.2/183,38,328,344.2,6.2,320.2,379.3,229.3;
142 31,237,366,89,87,88,63,15.1/208,279,120.1,13.2,368.2,259.2,22.2,155.3/390,38,328,106,188,164,30.2,374.2;
143 171,271,173,39,180,237,213,329/352,111.2,278.2,296.2,351.2,270.3,316.3,291.3/117,188,164,151,222,152,145.1,229.2;
144 264,169.2,20.2,364.2,14.2,268.2,171.3,154.3/360,238,136,214,224,279,381.2,13.2/319,377,30,147,374,390.2,247.2,379.3;
145 264,263,169.2,5.2,14.2,171.3,154.3,15.3/198,279,13.2,246.2,317.2,47.2,19.2,232.3/314,367,30,122,76,390.2,247.2,384.2;
146 31,264,169.2,239.2,5.2,14.2,86.2,171.3/360,28,166,345,279,13.2,215.2,127.2/206,30,241,338,374,216,322,390.2;
147 83,36,95,373.1,7.1,372.2,313.2,29.3/155,80,120.1,297.1,185.1,270.3,316.3,166.3/126,72,188,6,84.1,92.2,106.3,117.3;
148 83,36,95,372.2,313.2,29.3,171.3,173.3/155,80,120.2,297.2,270.3,316.3,166.3,232.3/126,72,188,6,92.2,260.3,106.3,117.3;
149 31,83,304,311,36,95,373,7/155,80,120.2,13.2,345.2,297.2,270.3,316.3/126,72,374,188,6,390.2,92.2,379.3;
150 290,65.2,230.3,304.3,306.3,311.3,171.3,173.3/292,94,291,232,279,132,288.2,280.2/294,284,242,91.2,229.3,106.3,117.3,206.3;
151 110,230,290.2,65.2,289.2,304.3,306.3,311.3/94,291,232,279,132,292.2,288.2,280.2/294,91.2,284.2,379.3,390.3,229.3,260.3,106.3;
152 271,173,212.1,96.1,39.1,186.2,146.2,1.2/191,163,193,279.1,139.1,336.2,50.2,125.2/322,221.1,100.2,106.3,117.3,84.3;
153 271,173,212.1,96.1,39.1,186.2,146.2,1.2/191,163,193,279.1,336.2,50.2,125.2,387.2/322,221.2,100.2,106.3,117.3,84.3;
154 271,173,212.1,96.1,39.1,186.2,146.2,1.2/191,163,193,279.1,336.2,50.2,125.2,387.2/322,104,359,276.2,221.2,100.2,106.3,117.3;
155 331,239,271,35,329,119.1,341.1,179.1/28,232,267.1,251.1,166.2,386.2,127.2,43.3/206,137,338,196,200,216,117,129.1;
156 331,239,271,35,329,119.1,202.1,88.2/28,232,251.1,166.2,386.2,127.2,43.3,278.3/206,137,338,196,200,216,117,217.2;
157 331,239,271,35,329,165,119.1,202.1/28,232,251.1,166.2,386.2,127.2,357.3,43.3/206,137,338,196,200,216,117,217.2;
158 23,237,252,154,101,39,366,87/270,43,185.1,279.1,358.2,131.2,385.2,10.2/183,6,335,151,379.1,38.1,344.2,11.2;
159 23,237,252,154,101,39,366,87/270,43,279.1,358.2,185.2,131.2,385.2,10.2/183,6,335,151,344.2,11.2,229.3,106.3;
160 23,237,252,154,101,39,366,87/270,43,279.1,358.2,185.2,131.2,385.2,10.2/183,6,335,151,344.2,184.2,11.2,229.3;
161 23,36,271,35,179,202,101.1,261.1/232.2,278.2,351.2,43.3,46.3,358.3,246.3,185.3/117,389,84.1,106.2,17.2,206.3,344.3,319.3;
162 23,36,35,179,202,101.1,98.2,171.2/232.2,278.2,351.2,43.3,46.3,358.3,246.3,185.3/117,389,106.2,188.2,17.2,164.2,206.3,344.3;
163 271,264,65,31.1,144.1,327.2,142.2,169.2/345,94,251,357.1,232.2,278.2,13.2,351.2/106,17,91,153,30.1,374.1,390.2,117.2;
164 271,264,65,31.1,173.2,327.2,142.2,169.2/345,94,251,357.1,232.2,278.2,13.2,351.2/106,30,17,91,153,390.2,117.2,188.2;
165 301,271,369,262.1,96.1,308.1,108.1,303.1/382,345,138,232,292.1,13.2,4.2,163.3/391,117,322.3,302.3,17.3;
166 301,271,369,169.2,197.2,262.2,5.2,230.3/382,345,138,232,13.2,4.2,163.3,278.3/391,117,188.3,322.3,302.3,17.3,240.3,164.3;
167 265,78,312,376,326,179,115.1,273.1/266,4,2,357,339,321.1,54.1,292.1/294,228.1,391.2,243.2,117.3,322.3,204.3;
168 265,78,312,376,262,12,326,179/266,4,2,357,339,53.2,321.2,48.2/294,228.1,391.2,243.2,117.3,188.3,322.3,164.3;
169 31,90,376,5,237,78,199,169.2/360,13,345,2,232,53.2,163.3,278.3/390.2,30.2,247.2,374.2,117.3,188.3,17.3,241.3;
170 75,39,74.2,60.2,182.2,383.2,327.3,142.3/270,316,62,47,321,358.1,246.1,185.1/183,76,106,344.2,314.2,367.2,122.2,11.2;
171 75,39,74.2,60.2,182.2,383.2,327.3,142.3/270,316,62,47,321,185.1,292.1,358.2/183,76,106,344.2,314.2,367.2,122.2,11.2;
172 75,236,35,311.1,116.1,39.1,202.1,230.3/198,232,286.1,388.1,246.2,317.2,47.2,123.2/314,367,84,272.1,122.2,384.2,229.3,106.3;
173 110,271,230.3,171.3,173.3,96.3,140.3,329.3/388,41,380,193,286.1,280.1,57.2,67.2/153,117,294,71.2,229.3,206.3,337.3,322.3;
174 110,144.1,329.1,230.2,171.2,173.2,327.2,142.2/388,286.1,232.2,278.2,41.2,57.2,351.2,67.2/229.2,106.2,117.2,17.2,389.2,71.2,206.3,337.3;
175 110,271,264.1,169.1,230.3,171.3,173.3,96.3/41,380,279,251,286.1,280.1,57.2,232.3/153,117,284.1,71.2,229.3,206.3,337.3,322.3;
176 110,271,169.2,14.2,230.3,171.3,173.3,96.3/13,345,41,380,279,251,193,57.2/153,117,390.2,30.2,71.2,229.3,206.3,188.3;
177 264,263.1,65.1,35.1,144.1,15.1,169.2,14.2/280,357,378,13.2,345.2,288.2,371.2,232.3/294,284,91.2,30.2,117.3,322.3,241.3;
178 264,169.2,65.2,14.2,205.3,15.3,327.3,142.3/345,280,357,378,13.2,288.2,371.2,232.3/294,284,390.2,91.2,30.2,117.3,188.3,322.3;
179 271,173.1,171.3,140.3,327.3,142.3,133.3,1.3/198,317,47,321,203,57,123.1,246.2/367,76,106,314.1,84.1,122.2,384.2,117.3;
180 271,311.2,230.3,304.3,306.3,171.3,173.3,252.3/198,317,47,321,203,57,246.2,123.2/367,76,106,314.2,122.2,384.2,229.3,117.3;
181 311,304,271,230.3,306.3,171.3,173.3,252.3/198,317,47,321,297,203,57,246.2/367,122,76,106,314.2,384.2,275.2,229.3;
182 192,39.1,186.2,146.2,1.2,98.3,327.3,142.3/2,227,163,193,3,191.1,336.2,50.2/322,104,221,359,153,100.2,117.3,188.3;
183 36,271,329,56,7.1,173.1,74.2,60.2/270,316,62,286.1,358.2,185.2,131.2,388.2/183,6,71,117,151,11.1,284.1,344.2;
184 36,271,329,56,74.2,60.2,182.2,230.3/270,316,62,358.2,185.2,131.2,388.2,41.2/183,6,71,117,151,344.2,11.2,59.2;
185 329,36,271,252,96,39,144,171.1/208,368,61.1,259.2,203.2,22.2,43.3,278.3/38,328,354,117,222,226,37.1,320.2;
186 110,116,173,56,133.1,74.2,60.2,182.2/270,316,114,355,185.1,358.2,131.2,10.2/183,117,389,11.1,344.2,229.3,106.3,319.3;
187 56,5,271,197,169.2,186.2,1.2,171.3/2,227,163,336,380,50.1,111.1,94.1/117.1,322.2,221.2,106.3,44.3;
188 56,5,271,197,169.2,186.2,1.2,171.3/2,227,163,336,380,193.2,50.2,125.2/322.2,221.2,106.3,117.3,44.3;
189 56,5,271,197,169.2,186.2,1.2,171.3/2,227,163,336,380,193.2,50.2,125.2/322.2,221.2,106.3,117.3,188.3,164.3,44.3;
190 23,35,179,118,199,116.1,36.1,277.1/232,49,278.2,351.2,43.3,46.3,114.3,246.3/117,84,229.2,106.2,17.2,337.3,322.3,314.3;
191 271,133,186.2,1.2,98.3,327.3,142.3/2,227,191,163,50,336.2,193.2,125.2/322,117,221.2,106.3,17.3;
192 110,271,133,186.2,146.2,1.2,98.3,327.3/2,227,191,163,336,50,193.2,125.2/322,104,221,359,117,106.3,188.3,17.3;
193 31,169,197,262,271,35,261,78.1/360,13,382,345,54,232,279,321.1/391,17,117.1,106.3,322.3,294.3,91.3;
194 36,119.1,173.1,96.1,307.1,140.2,74.2,60.2/270,114,49,279.1,48.1,43.2,358.2,185.2/353,11,6,183.2,344.2,106.3,117.3,319.3;
195 36,140.2,74.2,60.2,258.2,182.2,230.3,306.3/270,114,49,43.2,358.2,185.2,355.2,131.2/353,11,6,183.2,344.2,152.2,229.3,106.3;
196 271,237,35,65.2,289.2,98.3,171.3,173.3/292,94,232,288.2,280.2,371.2,293.2,111.3/294,284,106,117,91.2,188.3,122.3,84.3;
197 237,144,261,271,35,205.2,366.2,375.2/298,16,232,111.3,43.3,278.3,46.3,280.3/204,106,117,188.3,294.3,91.3,122.3,84.3;
198 31,264,144,261,169,347,199,263.1/360,13,298,345,16,357,232.3,43.3/204,30.1,247.1,390.2,374.2,106.3,117.3,188.3;
199 65,171,271,74.2,60.2,93.2,182.2,230.3/270,94,185,278,203,292.2,358.2,332.2/344,294,284.1,183.2,91.2,11.2,6.2,229.3;
200 199,375,171.3,205.3,327.3,142.3,169.3,186.3/46,339,201,292,94,291,251,203/174.2,281.2,117.3,188.3,314.3,367.3,294.3,91.3;
201 278!golpe/278/278!embestida,278!embestida;202 96/224/235.5;
203 269,271,65,118,366,199,289.1,119.1/292,94,210,224.1,232.2,278.2,288.2,280.2/294,379.1,106.1,284.1,17.1,117.2,188.2,91.2;
204 262,271,329,167,165,375,96.1,39.1/266.1,232.1,61.1,138.2,163.3,278.3,368.3,259.3/106,117,37,141,391.2,322.3,353.3,38.3;
205 165,262,103,271,329,167,375,63.2/113,321.2,68.2,138.2,232.3,163.3,278.3,368.3/106,117,37,141,122,391.2,231.2,188.3;
206 173,154,39,133,140,329,261,348/43,279,345,201.1,278.2,296.2,351.2,46.3/106,117,189,72,38.1,6.1,188.2,17.2;
207 169,5,265,35,101,144,99,108/43,49,61.1,114.2,355.2,352.2,232.3,53.3/353,181,225,379.1,117.1,362.1,152.2,106.3;
208 140,165,29,36,271,154,329,366/61,352,208,120,368,22,43.2,355.2/84,152,117,38,328,353.2,231.2,18.2;
209 171,271,237,154,213,366,375,89/286.1,57.2,53.3,43.3,278.3,46.3,246.3,185.3/71,106,117.1,0.1,229.3,206.3,337.3,322.3;
210 171,271,237,154,213,366,375,89/286.1,57.2,53.3,43.3,278.3,46.3,368.3,246.3/71,106,126,229.3,117.3,206.3,188.3,337.3;
211 265,312,271,329,109,12,7.1,234.1/270,62,332,266,316.1,185.1,48.1,321.1/183,6,106,37.1,344.2,207.2,243.2,117.3;
212 99,160,356,300,63,31,35,101/382,345,68.2,138.2,232.3,278.3,13.3,61.3/379,0,391.2,231.2,106.3,117.3,188.3,151.3;
213 329,262,95,326,108.1,177.2,29.3,171.3/208,138,259.1,4.1,3.1,43.1,61.1,279.2/38,328,320.2,117.3,353.3,243.3,18.3;
214 96,202,178,105,124,97,33,271/266,336,259.1,245.2,138.2,278.3,368.3,22.3/228,0,106,335,117,337.1,391.2,240.2;
215 144,23,35,179,101,160,312,306.1/381,136,232,70.2,298.2,16.2,43.3,278.3/377,79.1,319.2,204.2,229.3,106.3,117.3,344.3;
216 23,271,179,101,213,144,375,180.1/352,232.2,278.2,351.2,43.3,368.3,50.3,22.3/335,117,71,152,106.1,337.1,346.1,0.1;
217 23,271,179,101,213,144,375,230.2/352,232.2,278.2,351.2,43.3,368.3,50.3,22.3/335,117,222,71,152,229.2,106.2,188.2;
218 173,329.1,239.2,172.2,86.2,327.3,178.3,142.3/28,267,208,282,279,355,166.2,43.3/206,196,38,241.1,200.1,217.2,338.2,106.3;
219 173,329.1,239.2,172.2,86.2,150.3,327.3,178.3/28,208,279,267,282,355,166.2,368.2/206,38,196,200.1,217.2,241.2,338.2,129.2;
220 271,39,20.1,173.1,237.1,140.2,87.2,258.2/238,43,381,136,49,352,279,70.1/377,353,79,152,106,117,145.1,38.1;
221 87,97,33,271,264,39,237.1,140.2/238,43,381,136,49,352,279,214.1/377,353,79,152,106,335,117,145.1;
222 271,39,182.1,329.2,171.3,173.3,150.3,140.3/270,316,62,279,259,332,203,82/38.1,354.1,183.2,344.2,328.2,320.2,117.3,319.3;
223 39.1,74.2,60.2,205.3,327.3,142.3,56.3/270,316,62,185,292,315,321,336/183,319,188,334.1,344.2,117.3,206.3,377.3;
224 95,326,74.2,60.2,182.2,29.3,205.3,327.3/270,316,62,295,185,292,315,321/183,319,188,207,344.2,117.3,206.3,377.3;
225 263,306.1,96.1,35.1,167.1,169.2,56.2,20.2/286,315.1,381.1,45.1,136.1,214.1,13.2,70.2/284.1,390.2,319.2,377.2,30.2,247.2,229.3,106.3;
226 31,169,56,171,271,36.1,74.2,60.2/270,316,62,185,345,292,321,336/183,106,117,38.1,344.2,6.2,374.2,319.3;
227 31,264,263,15,160,33,101,375/13,345,232,68.2,43.3,381.3,278.3,80.3/247,30.1,390.2,374.2,231.2,106.3,117.3,188.3;
228 237,144,366,375,88,239,324,261.1/28,282,166.1,298.2,16.2,127.2,232.3,53.3/206,204,200,217.2,241.2,338.2,129.2,106.3;
229 237,144,366,375,88,239,324,89/28,282,166.2,298.2,16.2,127.2,232.3,53.3/206,204,200,217.2,241.2,338.2,129.2,106.3;
230 39.1,74.2,60.2,182.2,372.2,313.2,383.2,171.3/270,316,62,120,80,358,185,332/183,128,344.2,126.2,11.2,92.2,106.3,117.3;
231 36,271,39,329,173.1,96.1,133.1,103.1/352,43.1,270.1,279.1,136.1,61.2,114.2,355.2/106,117,145.1,152.1,354.1,71.1,353.2,38.3;
232 258,36,97,33,271,39,329,167/352,368,43.2,61.2,114.2,355.2,278.3,279.3/353,223,106,117,164,152.2,188.3,38.3;
233 271,327.2,142.2,205.3,169.3,65.3/363,292,198,321,232.2,278.2,351.2,381.3/188,122,76,106.2,117.2,164.2,319.3,377.3;
234 269,271,199,65,273,27,154.1,119.1/94,251,232.2,278.2,351.2,292.3,43.3,46.3/106,117,256,335.1,228.1,188.2,17.2,164.2;235 //;
236 271,96.1,369.1,261.1,167.1,300.1,252.2,178.2/245.1,232.3,43.3,278.3,352.3,351.3/257.1,337.2,229.3,106.3,117.3,353.3,38.3,17.3;
237 253,96,365,109,271,140,35,261/245.1,232.3,43.3,278.3,80.3,352.3,351.3/0,257.1,337.2,240.2,229.3,106.3,117.3,353.3;
238 306,20,26,110,213,65.2,230.3,173.3/94,238,381.2,288.2,280.2,370.2,43.3,278.3/377,294,319.2,91.2,229.3,117.3,337.3,302.3;
239 311,75,252,35,175.1,304.1,306.1,253.1/198,246,47,232,317.2,123.2,43.3,278.3/314,367,76,302.1,346.1,222.1,122.2,384.2;
240 304,331,271,252,144,175.1,230.1,311.1/28,166,267,282,127.2,43.3,278.3,48.3/206,217,196,129.1,302.1,84.1,346.1,241.2;
241 269,171,271,173,329,165,65,308.1/286.1,278.2,43.3,381.3,46.3,358.3,368.3,246.3/71,152,117.1,337.1,222.1,229.2,188.2,164.2;
242 110,116,271,230.2,171.2,173.2,150.2,327.2/51,388,41,380,286.1,232.2,363.2,278.2/106,117,337.1,229.2,188.2,17.2,389.2,164.2;
243 75,89,237,35,366,373,98.3,171.3/198,251,246.2,317.2,47.2,123.2,19.2,232.3/367,122,76,314.2,384.2,275.2,106.3,117.3;
244 331,88,269,237,366,373,239.2,98.3/28,166,251,232.3,43.3,278.3,46.3,352.3/206,217,149,137,196,241.2,338.2,129.2;
245 237,366,373,87,74.2,60.2,182.2,98.3/270,316,185,360,315,224,251,358.2/183,344,377,147,106.3,117.3,319.3,188.3;
246 258,271,237,366,375,180,269.1,261.1/208,22,298,279.1,43.2,368.2,61.2,114.2/353,38,328,335,188,126.1,84.1,106.3;
247 258,271,237,366,375,180,140.2,171.3/208,22,298,43.2,279.2,368.2,61.2,114.2/353,38,328,335,188,152.2,106.3,117.3;
248 237,366,375,271,89,87,88,180/208,298,22,279.2,368.2,259.2,203.2,16.2/38,328,335,188,353,164,204.2,229.3;
249 169.2,65.2,5.2,14.2,171.3,173.3,150.3,74.3/360,251,232,279,13.2,345.2,288.2,293.2/30,8,284,183,72,390.2,294.2,91.2;
250 169.2,239.2,14.2,173.3,150.3,15.3,327.3,178.3/360,232,279,251,166.2,13.2,345.2,215.2/217,30,149,338,247,216,284,390.2;
251 192.2,290.2,65.2,186.2,146.2,98.3,327.3,142.3/94,193,279,163.2,50.2,125.2,371.2,232.3/284,221,322.2,294.2,91.2,100.2,117.3,188.3`;

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
function movsDe(p, semilla){
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
const u = () => Math.min(G.W, G.H * 1.4) / 100;       // unidad de longitud de efectos y velocidades
const otro = e => e.lado === 'yo' ? E.riv : E.yo;

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
  const hud = $('arHud-riv'), hudH = hud ? hud.offsetHeight + 8 : 90;
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
  ['yo', 'riv'].forEach(l => { if(E[l]) tamanoSprite(E[l]); });
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
function crearMon(p, rival){
  const ej = rival ? null : mejorEjemplar(p.id);
  const fz = rival ? fuerzaRival() : ((ej || {}).f || 50);
  const k = .9 + fz / 500, bst = bstDe(p), max = Math.round((60 + bst * .22) * k);
  /* los ataques salen del número de serie del ejemplar (siempre los mismos para esa figurita);
     el rival, como no tiene ejemplar guardado, saca unos al azar en cada pelea */
  const movs = movsDe(p, ej ? (ej.c || '') + ':' + ej.f : Math.random());
  return {p, bst, max, hp:max, en:EN_MAX, vivo:true, st:statsDe(p), fz, k, vario:!!(ej && ej.s), movs};
}
function crearEntidad(lado){
  const w = $('arMon-' + lado);
  const e = {lado, wrap:w, cuerpo:w.querySelector('.ar-cuerpo'), flip:w.querySelector('.ar-flip'), giroEl:w.querySelector('.ar-giro'),
    rot:w.querySelector('.ar-rot'), imgs:{frente:w.querySelector('.ar-spr.frente'), espalda:w.querySelector('.ar-spr.espalda')},
    sombra:w.querySelector('.ar-sombra'), refl:w.querySelector('.ar-reflejo img'),
    vista:lado === 'yo' ? 'espalda' : 'frente', vistaQ:null, flipAp:1, girando:false, giroT:0,
    x:0, y:0, vx:0, vy:0, rvx:0, rvy:0, px:null, py:null, kx:0, ky:0, fase:0, polvoT:0, fantT:0, cara:lado === 'yo' ? -1 : 1,
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
  const sf = ESCALA_POKE[e.lado] * (img.dataset.fb ? .25 : 1);
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
  ['yo', 'riv'].forEach(lado => {
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
  const v = ventaja(AR.yo.act, AR.riv.act), vb = $('arHud-yo').querySelector('.v');
  vb.textContent = v > 0 ? '▲ ventaja' : (v < 0 ? '▼ desventaja' : '');
  vb.className = 'v ' + (v > 0 ? 'bien' : (v < 0 ? 'mal' : ''));
  pintarBotones();
}

function pintarEnergia(){
  ['yo', 'riv'].forEach(l => {
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
  };
  ATAQUES.forEach(k => set('arB-' + k, e.cd[k], ALC[k].cd, ALC[k].coste));
  set('arB-esquivar', e.cd.esq, ESQ.cd, ESQ.coste);
  const cb = $('arB-equipo');
  if(cb) cb.disabled = !AR.yo.mons.some((x, i) => x.vivo && i !== AR.yo.idx) || AR.cambioCd > 0;
}

/* ---------------- combate ---------------- */
function calcularDanio(a, d, alc, tipoMov){
  const mult = efectividad(tipoMov, d.p.type), f = factorTipo(mult);
  const crit = f > 0 && Math.random() < a.st.crit;
  let dmg = ALC[alc].poder * Math.sqrt(a.bst / d.bst) * f * (a.k || 1) * azar(.9, 1.1) * (crit ? a.st.critMult : 1);
  dmg = f === 0 ? 0 : Math.max(1, Math.round(dmg));
  return {dmg, mult, crit};
}

/* Devuelve true si el golpe pegó (false: esquivado, protegido o inmune). */
function golpear(att, def, alc, x, y){
  if(!def.mon.vivo) return false;
  const mov = movDe(att.mon, alc), tipo = mov.tipo;
  const c = cen(def), arriba = c.y - def.h * def.s * .6, ahora = performance.now();
  const roce = def.rodando && alc === 'largo';
  if(def.rodando && !roce){
    if(ahora - def.tEsq > 400){
      texto(c.x, arriba, '¡Esquivó!', '#8be9ff', 3.6);
      def.mon.en = Math.min(EN_MAX, def.mon.en + EN_PREMIO_ESQUIVE);
      if(def.lado === 'yo') sfx('esquive');
    }
    def.tEsq = ahora;
    return false;
  }
  if(def.invul > 0) return false;
  const res = calcularDanio(att.mon, def.mon, alc, tipo), d = def.mon;
  if(roce && res.dmg > 0){
    res.dmg = Math.max(1, Math.round(res.dmg * ROCE_LARGO)); res.crit = false;
    texto(c.x, arriba - u() * 4.5, '¡Lo rozó!', '#8be9ff', 3.2);
  }
  if(res.dmg === 0){ texto(c.x, arriba, 'No afecta', '#aab', 3.4); return false; }
  d.hp = Math.max(0, d.hp - res.dmg);
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
  const m = e.mon;
  if(!m || !m.vivo || e.accion || e.stun > 0 || e.aparece > 0 || AR.pausa || AR.fase !== 'lucha') return false;
  const O = otro(e);
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
  e.accion = {tipo, t:0, dir:unit(pie(e), pie(O)), hecho:false, mov:movDe(m, tipo)};
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
  AR.proys.push({lado:e.lado, x:sx, y:sy, vx:d.x * o.vel * U, vy:d.y * o.vel * U, v:o.vel * U, tipo:o.tipo, forma:o.forma, el,
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
    const att = E[z.e], O = otro(att);
    if(z.estalla) estallidoZona(z.zona, z.mov);
    else { marca(z.zona.x, z.zona.y, z.zona.r * .9, TYPE_COLORS[z.mov.tipo]); sacudir(1.3); }
    if(z.mov.fx === 'trueno') estallido(z.zona.x, z.zona.y, 'electric', 20, 1.4);
    if(att.mon && O.mon && O.mon.vivo){
      const p = pie(O), dx = p.x - z.zona.x, dy = (p.y - z.zona.y) / G.pz;
      if(Math.hypot(dx, dy) <= z.zona.r) golpear(att, O, 'largo');
    }
    return false;
  });
}

function avanzarProyectiles(dt){
  const U = u();
  AR.proys = AR.proys.filter(p => {
    p.vida -= dt; p.t += dt; p.tr -= dt;
    const dest = E[p.lado === 'yo' ? 'riv' : 'yo'], att = E[p.lado];
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
    if(dest.mon && dest.mon.vivo){
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
    if(AR[lado].mons.every(x => !x.vivo)){ terminar(lado === 'riv'); return; }
    if(lado === 'riv'){
      const b = mejorBanca(AR.riv, AR.yo.act);
      sacar('riv', b.i); AR.fase = 'lucha';
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
  decir(lado === 'yo' ? `¡Adelante, ${eq.act.p.name}!` : `${AR.rivalNombre} saca a ${eq.act.p.name}.`);
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
  AR.pausa = true; AR.hold.clear();
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
  const O = otro(e);
  if(O.mon && O.mon.vivo && e.lado === 'yo'){
    const c1 = cen(e), c2 = cen(O), min = (radio(e) + radio(O)) * .8, d = dist(c1, c2);
    if(d < min && d > 0){ const s = (min - d) / 2, dir = unit(c2, c1); empujar(e, dir.x * s, dir.y * s); empujar(O, -dir.x * s, -dir.y * s); }
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
  if(AR.pausa || !dt){ dibujar(E.yo, 0); dibujar(E.riv, 0); return; }
  /* hit-stop: un instante congelado en cada golpe */
  if(AR.congela > 0){ AR.congela -= dt; return; }
  /* cámara lenta mientras se carga un largo (entra y sale suave) */
  const cargando = [E.yo, E.riv].some(x => x.accion && x.accion.tipo === 'largo' && !x.accion.hecho);
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
    const bi = botActualizar(E.riv, h);
    actualizarMon(E.yo, h, intent);
    actualizarMon(E.riv, h, bi);
    avanzarProyectiles(h);
    avanzarZonas(h);
    AR.pend = AR.pend.filter(p => { p.t -= h; if(p.t <= 0){ p.fn(); return false; } return true; });
    if(!AR || tok !== TOK) return;
    if(AR.fase === 'lucha') AR.tLucha += h;
    if(AR.congela > 0) break;
  }
  dibujar(E.yo, dt); dibujar(E.riv, dt);
  pintarEnergia(); pintarCooldowns();
}

/* ---------------- armado de la arena ---------------- */
function hudHTML(lado, titulo){
  return `<div class="ar-hud ${lado}" id="arHud-${lado}">
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
    <div class="ar-stage" id="arStage">
      <div class="ar-shake" id="arShake">
        <canvas class="ar-bg" id="arBg"></canvas>
        <div class="ar-luz"><div class="ar-cono"></div><div class="ar-motas"></div><div class="ar-lampara"></div></div>
        <div class="ar-piso" id="arPiso"></div>
        <div class="ar-ent-sprite riv"></div><div class="ar-ent-sprite yo"></div>
        ${monHTML('riv')}${monHTML('yo')}
        <div class="ar-fx" id="arFx"></div>
      </div>
      ${hudHTML('riv', AR.rivalNombre)}${hudHTML('yo', window.__yoNombre || 'Vos')}
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
  $('arAbandonar').onclick = cerrarArena;
  $('arSonido').onclick = () => {
    SONIDO = !SONIDO;
    try{ localStorage.setItem('arena-sonido', SONIDO ? '1' : '0'); }catch(e){}
    const b = $('arSonido'); b.textContent = SONIDO ? '🔊' : '🔇'; b.setAttribute('aria-pressed', SONIDO);
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
function pulsar(a){
  if(!AR) return;
  AR.hold.add(a);
  if(AR.fase === 'lucha' && !AR.pausa) iniciar(E.yo, a, a === 'esquivar' ? entradaJugador() : null);
}

function pedirSalida(){
  if(!AR || AR.fase === 'fin'){ cerrarArena(); return; }
  const c = $('arConfirm');
  c.hidden = !c.hidden;
  if(!c.hidden){ AR.pausaAntes = AR.pausa; AR.pausa = true; $('arSeguir').focus(); }
  else AR.pausa = AR.pausaAntes;
}

async function luchar(mios){
  audio();   // el navegador sólo deja arrancar el sonido después de un toque del usuario
  const rival = armarRival(mios);
  const ent = elegirRival();
  rivalFig = ent.fig;
  const estilo = elige(Object.keys(ESTILOS));
  AR = {
    yo:  {mons:mios.map(p => crearMon(p)), idx:0, act:null},
    riv: {mons:rival.map(p => crearMon(p, true)), idx:0, act:null},
    estilo:ESTILOS[estilo], proys:[], zonas:[], pend:[], hold:new Set(), keys:new Set(), joy:{x:0, y:0},
    fase:'intro', tLucha:0, esc:1, pausa:false, pausaAntes:false, cambioCd:0, cambioRiv:3, ult:0, congela:0,
    combo:{lado:null, n:0, t:0},
    rivalNombre:ent.nombre
  };
  armarEscenario();
  E = {yo:crearEntidad('yo'), riv:crearEntidad('riv')};
  E.riv.bot = {guion:nuevoGuion(AR.estilo), hist:[], modo:'orbitar', t:1.2, reac:0, huye:0, huyeDir:1, dirOrb:1, ejecutado:false};
  E.yo.x = .55; E.yo.y = .35; E.riv.x = -.55; E.riv.y = -.2;
  AR.yo.act = AR.yo.mons[0]; AR.riv.act = AR.riv.mons[0];
  E.yo.mon = AR.yo.act; E.riv.mon = AR.riv.act;
  medir(); pintarFondo(); acomodarEscena();
  orientarYa(E.yo); orientarYa(E.riv);
  if(typeof ResizeObserver === 'function'){
    RO = new ResizeObserver(() => { if(AR) alCambiarTamano(); });
    RO.observe(ST);
  }
  ponerSprite(E.yo); ponerSprite(E.riv);
  pintarHud();
  ['yo', 'riv'].forEach(l => { dibujar(E[l], 0); E[l].spr.addEventListener('load', () => dibujar(E[l], 0), {once:true}); });
  window.__arena = {estado:() => AR, ent:() => E};
  decir(`¡${AR.rivalNombre} quiere pelear!`);
  const aviso = $('arAviso'), tok = TOK, turbo = window.__arenaTurbo > 0 ? window.__arenaTurbo : 1;
  /* mientras cuenta, los dos ya respiran y miran al rival */
  const respira = ts => { if(tok !== TOK || !AR || AR.fase !== 'intro') return; dibujar(E.yo, 0); dibujar(E.riv, 0); requestAnimationFrame(respira); };
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
  E.yo.invul = E.riv.invul = .6;
  AR.fase = 'lucha';
  decir('¡A pelear!');
  RAF = requestAnimationFrame(bucle);
}

function terminar(gane){
  AR.fase = 'fin'; AR.hold.clear();
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
    <div><button class="ar-b ar-med" id="arCerrar2"><b>Cerrar</b></button>
    <button class="ar-b ar-med" id="arOtra"><b>Revancha</b></button></div></div>`;
  $('arCerrar2').onclick = cerrarArena;
  $('arOtra').onclick = () => abrirArena();
  $('arOtra').focus({preventScroll:true});
}

function calcularPremio(gane){
  const kos = AR.riv.mons.filter(m => !m.vivo).length, vivos = AR.yo.mons.filter(m => m.vivo).length;
  const tiempo = Math.min(PREMIO.topeTiempo, Math.floor(AR.tLucha / PREMIO.segPorMoneda));
  const lineas = [[gane ? 'Victoria' : 'Por pelear', gane ? PREMIO.ganar : PREMIO.perder]];
  if(kos) lineas.push([`${kos} rival${kos > 1 ? 'es' : ''} derrotado${kos > 1 ? 's' : ''}`, kos * PREMIO.porKO]);
  if(gane && vivos) lineas.push([`${vivos} de los tuyos en pie`, vivos * PREMIO.porVivo]);
  if(tiempo) lineas.push([`${Math.round(AR.tLucha)} s de pelea`, tiempo]);
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
function abrirArena(){
  const ov = $('arenaOverlay');
  const mios = kantoMios().concat(especialesMios());   // las especiales (Mewtwo Acorazado) pelean aparte
  if(mios.length < EQUIPO_MIN){
    if(typeof avisoBatalla === 'function')
      avisoBatalla(`Necesitás al menos ${EQUIPO_MIN} Pokémon de Kanto o Johto para pelear en la arena. Abrí un sobre primero.`);
    return;
  }
  limpiar();
  if(!ultimoTopMaestro) cargarTopMaestro();   // más nombres de entrenadores para los rivales
  ov.classList.add('show');
  const orden = mios.slice().sort((a, b) => bstDe(b) - bstDe(a));
  const sel = orden.slice(0, EQUIPO_MAX).map(p => p.id);
  const root = $('arRoot');
  const pintar = () => {
    root.innerHTML = `<div class="ar-pick">
      <h2>Arena Pokémon · Kanto y Johto</h2>
      <p>Elegí tu equipo: de ${EQUIPO_MIN} a ${EQUIPO_MAX}. Sale primero el que marcaste con el 1. Pelea tu ejemplar más fuerte (💪).</p>
      <div class="ar-grid">${orden.map(p => {
        const n = sel.indexOf(p.id) + 1, s = statsDe(p);
        return `<button class="ar-sel${n ? ' on' : ''}" data-id="${p.id}" aria-pressed="${n ? 'true' : 'false'}" style="border-color:${n ? TYPE_COLORS[p.type] : '#34407a'}">
          ${n ? `<span class="ar-n">${n}</span>` : ''}
          <img src="${spIcono(p.id, (mejorEjemplar(p.id) || {}).s)}" alt="" width="64" height="64" loading="lazy">
          <b>${(mejorEjemplar(p.id) || {}).s ? '✨ ' : ''}${p.name}</b><small>${TYPE_LABEL[p.type]} · ${bstDe(p)} · 💪${(mejorEjemplar(p.id) || {}).f || 50}</small>
          <small class="ar-st">Crít. ${Math.round(s.crit * 100)}% ×${s.critMult.toFixed(1)}</small>
          <small class="ar-st">Veloc. ${'★'.repeat(Math.max(1, Math.round((s.vel - .65) / .14)))}</small>
          <small class="ar-movs">${(id => id === 132 ? 'Transformación: copia al rival' : (mv => ATAQUES.map(a => mv[a] ? mv[a].n : '').filter(Boolean).join(' · '))(crearMon(p).movs))(p.base || p.id)}</small></button>`;
      }).join('')}</div>
      <div class="ar-pick-pie"><span>${sel.length} de ${EQUIPO_MAX}</span>
        <button class="ar-b ar-med" id="arPickCerrar"><b>Cerrar</b></button>
        <button class="ar-b ar-med ar-go" id="arPickGo"${sel.length < EQUIPO_MIN ? ' disabled' : ''}><b>¡A pelear!</b></button></div></div>`;
    root.querySelectorAll('.ar-sel').forEach(b => {
      b.onclick = () => {
        const id = Number(b.dataset.id), i = sel.indexOf(id);
        if(i >= 0) sel.splice(i, 1); else if(sel.length < EQUIPO_MAX) sel.push(id);
        const g = root.querySelector('.ar-grid').scrollTop;
        pintar();
        root.querySelector('.ar-grid').scrollTop = g;
      };
    });
    $('arPickCerrar').onclick = cerrarArena;
    $('arPickGo').onclick = () => luchar(sel.map(id => DATA.find(p => p.id === id) || ESPECIAL_POR_ID[id]));
  };
  pintar();
}

function limpiar(){
  TOK++; cancelAnimationFrame(RAF); RAF = 0;
  if(RO){ RO.disconnect(); RO = null; }
  AR = null; ST = null; FX = null; SHAKE = null; BG = null; PISO = null; E = {};
  window.__arena = null;
}

function cerrarArena(){
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
})();
