"""Mundo Pokémon v6 · Capital ampliada. Parte de mundo5.txt/json (322x180) y NO cambia el tamaño: sólo reemplaza casilleros.
 - Concejo Deliberante ('2') y Municipalidad ('1') frente a la avenida del casco céntrico (fila 30, "Av. Bolivia").
 - Alto Comedero (unos 6 km al sur del centro, como en la realidad): barrio nuevo en el bosque del sureste de Valles (x 32-48, y 100-117) con la Av. Forestal (este-oeste),
   la Av. Yuto (norte-sur) y los barrios 150 Hectáreas, 30 Hectáreas, La Loma, B4 y 128 Viviendas.
Salida: mundo6.txt y mundo6.json. El validador corta si algo deja de alcanzarse a pie desde el spawn."""
import io
import json
from collections import deque

base = io.open('mundo5.txt', encoding='utf-8').read().split('\n')
meta = json.load(io.open('mundo5.json', encoding='utf-8'))
W, H = len(base[0]), len(base)
g = [list(r) for r in base]
CAMINABLES = set('.,@*aB"bF%CPokLENeumcvw6')


def R(x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = ch


carteles, zonas = {}, []


def cartel(x, y, txt):
    g[y][x] = 'i'
    carteles['%d,%d' % (x, y)] = txt


# ---------------- el eje norte-sur de la capital, en el orden de la realidad (pedido de Zeta) ----------------
# Concejo Deliberante (punta norte, Av. Bolivia) · Casa de Gobierno (entre la Plaza Belgrano y el Parque San Martín) ·
# Parque Xibi Xibi · Municipalidad (Av. El Éxodo, Éxodo 215) · estadio 23 de Agosto (la cancha del Lobo) ·
# Nueva Terminal (Ruta 9 y 66, Acceso Sur) · Alto Comedero.
def limpiar(x0, y0, x1, y1, ch=','):
    R(x0, y0, x1, y1, ch)


def libre_cerca(x, y, r=4):
    """Casillero de pasto suelto más cercano (para poner un cartel sin tapar nada)."""
    for rr in range(r + 1):
        for dy in range(-rr, rr + 1):
            for dx in range(-rr, rr + 1):
                if max(abs(dx), abs(dy)) == rr and g[y + dy][x + dx] == ',':
                    return x + dx, y + dy
    raise SystemExit('sin lugar para cartel cerca de %d,%d' % (x, y))


# 1) Concejo Deliberante: en la punta norte, sobre la Av. Bolivia (x 43, junto al Río Grande)
R(43, 1, 43, 2, '.')                                    # la Av. Bolivia llega hasta la punta
R(39, 1, 42, 2, '2')                                    # 4 x 2, de frente a la avenida de la fila 3
cartel(38, 2, 'Concejo Deliberante de San Salvador de Jujuy, en la punta norte, sobre la Av. Bolivia (barrio Los Huaicos). Acá trabaja su presidente, Gastón Millón.')
zonas += [{'n': 'Valles · Concejo Deliberante (Av. Bolivia)', 'x0': 36, 'y0': 1, 'x1': 44, 'y1': 3}]

# 2) Casa de Gobierno: se muda al medio, separando la Plaza Belgrano (este) del Parque San Martín (oeste)
for x in range(32, 37):
    g[29][x] = ','                                      # sale de su lugar de antes (frente a la fila 30)
carteles['29,29'] = 'La Casa de Gobierno quedó al norte, entre la Plaza Belgrano y el Parque San Martín. Al sur siguen el Parque Xibi Xibi y la Av. El Éxodo.'
limpiar(21, 13, 25, 14)
for i, ch in enumerate('QQGQQ'):
    g[14][21 + i] = ch                                  # x 21-25; el carril x 26 de la avenida queda libre
cartel(21, 16, 'Casa de Gobierno de Jujuy, entre la Plaza Belgrano y el Parque San Martín: un palacio de estilo francés.')
zonas += [{'n': 'Valles · Casa de Gobierno', 'x0': 19, 'y0': 12, 'x1': 27, 'y1': 17}]

# 3) Municipalidad: pasando el Parque Xibi Xibi, sobre la Av. El Éxodo (Éxodo 215): la avenida de las filas 41-42
limpiar(26, 39, 32, 40)
R(27, 39, 30, 40, '1')                                  # 4 x 2, de frente a la Av. El Éxodo (fila 41)
cartel(31, 40, 'Municipalidad de San Salvador de Jujuy, Av. El Éxodo 215. Acá despacha el Intendente, Chuli Jorge.')
cartel(*libre_cerca(25, 42, 2), 'Av. El Éxodo: la gran avenida que pasa al sur del Parque Xibi Xibi. Ahí queda la Municipalidad.')
zonas += [{'n': 'Valles · Municipalidad (Av. El Éxodo)', 'x0': 24, 'y0': 38, 'x1': 33, 'y1': 42}]

# 4) Parque del Bicentenario del Éxodo (real, sobre la Éxodo) y estadio 23 de Agosto: la cancha del Lobo (Gimnasia y Esgrima)
cartel(28, 44, 'Parque del Bicentenario del Éxodo, sobre la Av. El Éxodo.')
# Estadio GRANDE y transitable (Zeta 31/10: "que sea grande, se pueda entrar, ahí aparecen Pokémon tipo lucha"): 13 x 11,
# tribunas '3' de 2 casilleros alrededor de la cancha '6' (caminable, bioma 'lucha'), túnel en el medio de cada lado.
# Se dibuja visto desde arriba (app.js PINTORES.estadio). El viejo cementerio (ruinas, Pokémon psíquicos) se corre al este.
for y in range(44, 49):
    for x in range(32, 42):
        if g[y][x] == 'u': g[y][x] = ','
EX0, EY0, EX1, EY1 = 31, 45, 43, 55
for y in range(EY0, EY1 + 2):
    for x in (EX0 - 1, EX1 + 1): g[y][x] = '.'
for x in range(EX0 - 1, EX1 + 2): g[EY1 + 1][x] = '.'
for x in range(EX0 + 1, EX1 + 2): g[44][x] = '.'          # (la estación del tren en 30,44 queda intacta)
R(EX0, EY0, EX1, EY1, '3')
R(EX0 + 2, EY0 + 2, EX1 - 2, EY1 - 2, '6')                # la cancha: 9 x 7
ECX, ECY = (EX0 + EX1) // 2, (EY0 + EY1) // 2
for (x_, y_) in [(ECX, EY0), (ECX, EY0 + 1), (ECX, EY1), (ECX, EY1 - 1), (EX0, ECY), (EX0 + 1, ECY), (EX1, ECY), (EX1 - 1, ECY)]:
    g[y_][x_] = '.'                                         # túneles
for y in range(EY0, EY1 + 1):
    pass
for y in range(45, 53):
    for x in range(45, 50):
        if g[y][x] in ',".#*': g[y][x] = 'u'                # el cementerio, del otro lado del estadio
cartel(EX0 - 1, EY0 - 1, 'Estadio 23 de Agosto: la cancha del Lobo, Gimnasia y Esgrima de Jujuy. Entrá por los túneles: en la cancha salen Pokémon de tipo Lucha.')
zonas += [{'n': 'Valles · Estadio 23 de Agosto (la cancha del Lobo)', 'x0': EX0 + 2, 'y0': EY0 + 2, 'x1': EX1 - 2, 'y1': EY1 - 2}]

# 5) sectores del camino al sur
cartel(*libre_cerca(43, 62, 4), 'Parque Cívico de las Banderas, camino al sur. Un poco más allá empiezan los barrios de la zona sur.')
cartel(*libre_cerca(47, 92, 4), 'Villa Aeroclub y el camino que lleva a Alto Comedero.')

# 6) Nueva Terminal de Ómnibus (Ruta 9 y 66, Acceso Sur), de frente a la ruta del este (x 46)
limpiar(39, 80, 45, 83)                                 # (más al norte que la zona de fuego de (43,87))
R(40, 80, 45, 81, '4')                                  # 6 x 2
R(39, 82, 45, 82, '.')                                  # playa de maniobras hasta la ruta (x 46)
cartel(38, 82, 'Nueva Terminal de Ómnibus, en el Acceso Sur (Rutas 9 y 66). De acá salen los micros a todo el país.')
zonas += [{'n': 'Zona sur · Nueva Terminal de Ómnibus', 'x0': 38, 'y0': 79, 'x1': 47, 'y1': 84}]

# ---------------- Alto Comedero ----------------
AX0, AX1, AY0, AY1 = 32, 48, 100, 117
R(AX0, AY0 + 3, AX1, AY1, ',')                          # se desmonta el bosque del barrio (y 103-117)
g[107][36] = 'b'                                        # la pokébola del piso que ya estaba ahí sigue en su casillero
for y in range(AY0 - 1, AY1 + 1):                       # entrada: bajada desde la ruta del norte (x 46-47) hasta la Av. Forestal
    for x in (46, 47):
        if y <= AY0 + 3:
            g[y][x] = '.'
# Av. Forestal (este-oeste, 2 de ancho) y Av. Yuto (norte-sur, 2 de ancho)
R(AX0, 108, AX1, 109, '.')
R(40, AY0 + 3, 41, AY1 + 1, '.')
R(46, AY0 + 3, 47, 107, '.')
# salida sur: la Av. Yuto baja hasta el camino de la fila 118 (que ya recorre todo el borde sur)
R(40, 118, 41, 118, '.')


def manzana(x0, y0, x1, y1, ch='H'):
    """Casas de a una con pasillos de pasto entre medio (separadas 2 en x y 2 en y)."""
    for y in range(y0, y1 + 1, 2):
        for x in range(x0, x1 + 1, 2):
            g[y][x] = ch


manzana(33, 104, 39, 106)                               # La Loma (NO)
manzana(43, 104, 45, 106)                               # 150 Hectáreas (NE, a la izquierda de la bajada)
manzana(33, 111, 39, 115)                               # B4 (SO)
manzana(43, 111, 48, 112)                               # 30 Hectáreas (SE norte)
manzana(43, 114, 48, 116)                               # 128 Viviendas (SE sur)
for (x, y) in [(36, 103), (44, 103), (36, 110), (44, 110)]:
    g[y][x] = 'n'                                       # palmeras en las esquinas
cartel(38, 107, 'Barrio La Loma, en Alto Comedero.')
cartel(42, 107, '150 Hectáreas, en Alto Comedero. Av. Forestal al sur.')
cartel(37, 110, 'Barrio B4, en Alto Comedero.')
cartel(42, 110, '30 Hectáreas, en Alto Comedero.')
cartel(42, 113, '128 Viviendas, en Alto Comedero.')
cartel(33, 110, 'Av. Forestal: la gran avenida de Alto Comedero. Cruza con la Av. Yuto.')
cartel(39, 110, 'Av. Yuto: sube desde el sur hasta la Av. Forestal. Por acá pasa la línea que va a El Chalicán.')
cartel(35, 110, 'Torres del Alto: 248 departamentos sobre la Av. Forestal.')
zonas = [
    {'n': 'Alto Comedero · La Loma', 'x0': 32, 'y0': 103, 'x1': 39, 'y1': 107},
    {'n': 'Alto Comedero · 150 Hectáreas', 'x0': 42, 'y0': 103, 'x1': 48, 'y1': 107},
    {'n': 'Alto Comedero · B4', 'x0': 32, 'y0': 110, 'x1': 39, 'y1': 117},
    {'n': 'Alto Comedero · 30 Hectáreas', 'x0': 42, 'y0': 110, 'x1': 48, 'y1': 112},
    {'n': 'Alto Comedero · 128 Viviendas', 'x0': 42, 'y0': 113, 'x1': 48, 'y1': 117},
    {'n': 'Alto Comedero · Av. Forestal', 'x0': 32, 'y0': 108, 'x1': 48, 'y1': 109},
    {'n': 'Alto Comedero · Av. Yuto', 'x0': 40, 'y0': 103, 'x1': 41, 'y1': 118},
    {'n': 'Alto Comedero', 'x0': 30, 'y0': 99, 'x1': 48, 'y1': 118},
] + zonas

# ---------------- guaridas de las incursiones (una por región) ----------------
# Zeta 31/10: "un espacio grande, verde o de fuego, encerrado por árboles y rocas bien dibujados, con una puerta que se abre cuando
# llega la hora". Claro de 9 x 7: anillo de árboles ('#') y rocas ('^'), adentro el suelo de la guarida ('8': no se pisa; ahí está el
# legendario) y la tranquera ('7') en el medio de abajo. El suelo es verde o de fuego según la región (lo pinta app.js).
def _alcanza(gr):
    fl = [''.join(r) for r in gr]
    sp_ = [(r.index('@'), y) for y, r in enumerate(fl) if '@' in r][0]
    vis_ = {sp_}; q_ = deque([sp_])
    while q_:
        x, y = q_.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if 0 <= n[0] < W and 0 <= n[1] < H and n not in vis_ and fl[n[1]][n[0]] in CAMINABLES: vis_.add(n); q_.append(n)
    return fl, vis_
_fl0, _vis0 = _alcanza(g)
_poi0 = sum(1 for y in range(H) for x in range(W) if _fl0[y][x] in 'bcLCP' and (x, y) in _vis0)
_altares = [tuple(map(int, k.split(','))) for k in meta['santuarios']]
GW, GH = 9, 7
GUARIDAS_REGIONES = [('kanto', 2, 48, 3, 116, 'verde'), ('johto', 60, 102, 3, 116, 'verde'), ('hoenn', 114, 156, 3, 116, 'fuego'),
                     ('sinnoh', 168, 210, 3, 116, 'fuego'), ('unova', 222, 264, 3, 116, 'verde'), ('kalos', 276, 319, 3, 116, 'verde'),
                     ('alola', 2, 50, 123, 175, 'fuego')]
guaridas = []
for region, gx0, gx1, gy0, gy1, suelo in GUARIDAS_REGIONES:
    cands = []
    for y0 in range(gy0, gy1 - GH - 1):
        for x0 in range(gx0, gx1 - GW):
            caja = [(x, y) for y in range(y0 - 1, y0 + GH + 1) for x in range(x0 - 1, x0 + GW + 1)]
            if not all(g[y][x] in ',"*#^ZN' for x, y in caja): continue
            if any(max(abs(ax - (x0 + 4)), abs(ay - (y0 + 3))) < 8 for ax, ay in _altares): continue
            cerca = sum(1 for y in range(y0 - 3, y0 + GH + 4) for x in range(x0 - 3, x0 + GW + 4) if 0 <= y < H and 0 <= x < W and g[y][x] in '.B')
            cands.append((-cerca, y0, x0))
    cands.sort()
    puesta = False
    for _, y0, x0 in cands[:80]:
        viejo = [row[:] for row in g]
        for y in range(y0, y0 + GH):
            for x in range(x0, x0 + GW):
                borde = x in (x0, x0 + GW - 1) or y in (y0, y0 + GH - 1)
                if not borde: g[y][x] = '8'
                else:
                    esquina = x in (x0, x0 + GW - 1) and y in (y0, y0 + GH - 1)
                    g[y][x] = '^' if esquina or (x + y) % 3 == 0 else '#'      # árboles con algunas rocas
        puerta = (x0 + GW // 2, y0 + GH - 1)
        g[puerta[1]][puerta[0]] = '7'
        if g[puerta[1] + 1][puerta[0]] not in CAMINABLES: g[puerta[1] + 1][puerta[0]] = ','
        fl, vis_ = _alcanza(g)
        poi = sum(1 for y in range(H) for x in range(W) if fl[y][x] in 'bcLCP' and (x, y) in vis_)
        if poi == _poi0 and (puerta[0], puerta[1] + 1) in vis_:
            guaridas.append({'region': region, 'x0': x0, 'y0': y0, 'w': GW, 'h': GH, 'suelo': suelo, 'puerta': list(puerta)})
            puesta = True
            break
        g[:] = viejo
    assert puesta, 'no hubo lugar para la guarida de ' + region

# ---------------- senderos y claros en los bosques (Zeta 31/10: "mucho bosque y árboles sin entrada, que tengan caminitos con sentido") ----------------
# 1) Johto sur (el monte entero, x 60-104 / y 78-117): un camino de piedra que sigue al de la laguna hasta la ruta del sur y otro de este a oeste,
#    con un claro en el cruce y dos claros más, con flores y piedras.
# 2) Bolsones de árboles macizos (sin ningún casillero caminable adentro): se les abre un sendero desde el camino más cercano hasta un claro.
RESPETAR = set('bcLCPikpqrH8723456789')   # objetos, carteles y edificios: un sendero nunca los pisa


def sendero_recto(x0, y0, x1, y1, ch='.'):
    """Camino de 1 casillero entre dos puntos (primero en x, después en y); no pisa objetos, agua ni rocas."""
    x, y = x0, y0
    while (x, y) != (x1, y1):
        if g[y][x] in '#gsn",' or g[y][x] in CAMINABLES and g[y][x] not in RESPETAR:
            if g[y][x] not in RESPETAR:
                g[y][x] = ch
        if x != x1:
            x += 1 if x1 > x else -1
        else:
            y += 1 if y1 > y else -1
    g[y1][x1] = ch if g[y1][x1] not in RESPETAR else g[y1][x1]


def claro(cx, cy, rx=2, ry=1, flores=True):
    """Claro de pasto limpio de árboles, con algunas flores y una piedra."""
    for yy in range(cy - ry, cy + ry + 1):
        for xx in range(cx - rx, cx + rx + 1):
            if g[yy][xx] in '#gsn"' and g[yy][xx] not in RESPETAR:
                g[yy][xx] = ','
    if flores:
        for dx, dy in ((-rx, 0), (rx, 0), (0, -ry), (0, ry)):
            if g[cy + dy][cx + dx] == ',':
                g[cy + dy][cx + dx] = '*'


# Johto sur
sendero_recto(79, 90, 79, 117)                 # sigue el camino de la laguna hasta la ruta del sur (fila 118)
sendero_recto(62, 100, 103, 100)               # camino de este a oeste
claro(79, 100, 3, 2)                           # el cruce
claro(67, 108, 2, 1)
claro(95, 88, 2, 1)
claro(70, 94, 2, 1)
claro(90, 110, 2, 1)
sendero_recto(67, 100, 67, 108)
sendero_recto(95, 100, 95, 88)
sendero_recto(70, 100, 70, 94)
sendero_recto(90, 100, 90, 110)
# Kanto sur: un camino bajando desde la ruta de la fila 83 hasta un claro
sendero_recto(33, 83, 33, 91)
claro(33, 91, 2, 1)

# bolsones macizos: BFS desde su centro hasta el camino más cercano que ya se alcanza a pie
_cam = set('.,@*aB"bF%CPokLENeumcvw6')


def _alcanzable():
    sp0 = [(r.index('@'), y) for y, r in enumerate(map(''.join, g)) if '@' in r][0]
    v, qq = {sp0}, deque([sp0])
    while qq:
        x, y = qq.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if 0 <= n[0] < W and 0 <= n[1] < H and n not in v and g[n[1]][n[0]] in _cam:
                v.add(n)
                qq.append(n)
    return v


def _bolsones():
    dist = {}
    qq = deque()
    for y in range(H):
        for x in range(W):
            if g[y][x] in _cam:
                dist[(x, y)] = 0
                qq.append((x, y))
    while qq:
        x, y = qq.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if 0 <= n[0] < W and 0 <= n[1] < H and n not in dist:
                dist[n] = dist[(x, y)] + 1
                qq.append(n)
    visto, res = set(), []
    for y in range(4, H - 4):
        for x in range(4, W - 4):
            if g[y][x] in '#gsn' and dist.get((x, y), 0) >= 3 and (x, y) not in visto:
                qq = deque([(x, y)])
                visto.add((x, y))
                c = []
                while qq:
                    cx, cy = qq.popleft()
                    c.append((cx, cy))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            n = (cx + dx, cy + dy)
                            if 4 <= n[0] < W - 4 and 4 <= n[1] < H - 4 and n not in visto and g[n[1]][n[0]] in '#gsn' and dist.get(n, 0) >= 3:
                                visto.add(n)
                                qq.append(n)
                if len(c) >= 10:
                    res.append(max(c, key=lambda p: dist[p]))
    return res


_dentro_guarida = lambda x, y: any(gg['x0'] - 1 <= x <= gg['x0'] + gg['w'] and gg['y0'] - 1 <= y <= gg['y0'] + gg['h'] for gg in guaridas)
_vis0 = _alcanzable()
for (cx, cy) in _bolsones():
    if _dentro_guarida(cx, cy):
        continue
    prev, qq, fin = {(cx, cy): None}, deque([(cx, cy)]), None
    while qq and fin is None:
        x, y = qq.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if 0 <= n[0] < W and 0 <= n[1] < H and n not in prev and not _dentro_guarida(*n) and g[n[1]][n[0]] in '#gsn' + ''.join(_cam):
                prev[n] = (x, y)
                if n in _vis0 and g[n[1]][n[0]] in '.,"a':
                    fin = n
                    break
                qq.append(n)
    if fin is None:
        continue
    p = prev[fin]
    while p is not None:
        if g[p[1]][p[0]] in '#gsn':
            g[p[1]][p[0]] = '.'
        p = prev[p]
    claro(cx, cy, 2, 1)

# ---------------- validación ----------------
filas = [''.join(r) for r in g]
assert len(filas) == H and all(len(f) == W for f in filas)
sp = [(r.index('@'), y) for y, r in enumerate(filas) if '@' in r][0]
vis = {sp}
q = deque([sp])
while q:
    x, y = q.popleft()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        n = (x + dx, y + dy)
        if 0 <= n[0] < W and 0 <= n[1] < H and n not in vis and filas[n[1]][n[0]] in CAMINABLES:
            vis.add(n)
            q.append(n)
errores = []
for y in range(H):
    for x in range(W):
        if filas[y][x] in 'bcLCP' and (x, y) not in vis:
            errores.append('no se llega a %s en %d,%d' % (filas[y][x], x, y))
        if filas[y][x] == 'i' and '%d,%d' % (x, y) in carteles and not any((x + dx, y + dy) in vis for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            errores.append('cartel inalcanzable %d,%d' % (x, y))
for k in carteles:
    pass
for p in [(41, 3), (24, 3), (24, 16), (26, 15), (28, 42), (35, 52), (43, 82), (41, 108), (46, 100), (41, 118), (36, 108), (44, 108)]:
    if p not in vis:
        errores.append('punto de ruta inalcanzable %s' % (p,))
# objetos del piso que había en el lote desmontado: no se pierde ninguno que ya existía en otro lado
if errores:
    print('\n'.join(errores[:40]))
    raise SystemExit('VALIDACIÓN FALLÓ (%d errores)' % len(errores))

io.open('mundo6.txt', 'w', encoding='utf-8').write('\n'.join(filas))
out = dict(meta)
out['zonas'] = zonas + meta['zonas']
out['carteles'] = dict(meta['carteles'], **carteles)
out['guaridas'] = guaridas
# los legendarios de las incursiones no salen en los altares; si un altar se queda sin ninguno, va otro de su región
SOLO_INC_NOMBRES = {'Mewtwo', 'Lugia', 'Rayquaza', 'Giratina', 'Kyurem', 'Xerneas', 'Necrozma'}
REEMPLAZO = {'Xerneas': 'Zygarde'}
for k, v in out['santuarios'].items():
    quedan = [p for p in v['pokes'] if p not in SOLO_INC_NOMBRES]
    v['pokes'] = quedan or [REEMPLAZO.get(p, 'Mew') for p in v['pokes']]
# Zygarde va en La Quiaca (Zeta): sale del altar del Cerro Colorado para no repetirse
out['santuarios']['310,68']['pokes'] = [p for p in out['santuarios']['310,68']['pokes'] if p != 'Zygarde']
json.dump(out, io.open('mundo6.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('OK mundo6: %dx%d, %d carteles nuevos' % (W, H, len(carteles)))
