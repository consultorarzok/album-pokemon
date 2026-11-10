"""Mundo v7: grilla 3x3 con la CAPITAL AL MEDIO (10/11/2026, pedido de Zeta).

  Puna      | La Quiaca·Yavi | Humahuaca·Hornocal
  Quebrada  | CAPITAL        | Yungas
  (nada)    | Alola (sur)    | (nada)

Parte de mundo6.txt (6 franjas de 54 columnas, de oeste a este, Alola debajo de la Capital) y mueve cada franja a
su celda. Todo lo que tiene coordenadas (zonas, carteles, altares, guaridas, fuegos, fuentes, algarrobo, tren) se
traslada con la misma función T(x, y). Los bordes nuevos (2 horizontales y 3 verticales) se arman acá y el Tren Solar
pasa a ser un recorrido por puntos por TODAS las celdas. Escribe mundo7.txt y mundo7.json (los lee aplicar_mundo7.py).
No toca app.js."""
import io
import json
import heapq

W6, H6 = 322, 180
CELDA_W, CELDA_H = 54, 120
COLS, FILAS = 3 * CELDA_W, 3 * CELDA_H + 0          # 162 x 360 (la fila de abajo mide 60 y se recorta a 300)
FILAS = 300

# celda destino (cx, cy) -> franja de origen (s) ; 'alola' = filas 120.. de la franja 0
CELDAS = {(0, 0): 4, (1, 0): 5, (2, 0): 3,
          (0, 1): 2, (1, 1): 0, (2, 1): 1,
          (1, 2): 'alola'}
REGION_CELDA = {(0, 0): 'unova', (1, 0): 'kalos', (2, 0): 'sinnoh',
                (0, 1): 'hoenn', (1, 1): 'kanto', (2, 1): 'johto', (1, 2): 'alola'}

old = io.open('mundo6.txt', encoding='utf-8').read().split('\n')
base = json.load(io.open('/tmp/claude-0/work/base6.json', encoding='utf-8'))
TILES = base['tiles']
TILES['|'] = TILES['+'] = {'walk': True}      # rieles nuevos (norte-sur y giro/cruce)
caminable = lambda ch: bool(TILES.get(ch, {}).get('walk'))
assert len(old) == H6 and all(len(r) == W6 for r in old)


# ---------------------------------------------------------------- traslado de coordenadas
def celda_de(x, y):
    """(cx, cy, s) de la celda destino que recibe el casillero viejo (x, y); None si cae en el relleno."""
    if y >= CELDA_H:
        return (1, 2, 'alola') if x < CELDA_W else None
    s = min(5, x // CELDA_W)
    for (cx, cy), src in CELDAS.items():
        if src == s:
            return cx, cy, s


def T(x, y):
    c = celda_de(x, y)
    if c is None:
        return None
    cx, cy, s = c
    if s == 'alola':
        return x + CELDA_W * cx, y - CELDA_H + CELDA_H * 2      # y 120.. -> 240..
    return x - CELDA_W * s + CELDA_W * cx, y + CELDA_H * cy


# ---------------------------------------------------------------- armado del mapa
g = [['^'] * COLS for _ in range(FILAS)]
for (cx, cy), src in CELDAS.items():
    if src == 'alola':
        for y in range(CELDA_H, CELDA_H + 60):
            for x in range(CELDA_W):
                g[y - CELDA_H + 2 * CELDA_H][cx * CELDA_W + x] = old[y][x]
        continue
    for y in range(CELDA_H):
        for x in range(CELDA_W):
            sx = src * CELDA_W + x
            g[cy * CELDA_H + y][cx * CELDA_W + x] = old[y][sx] if sx < W6 else '#'

# ---- bordes de este-oeste nuevos: copian el medio río que falta (la otra mitad ya está en la celda vecina)
#  H1: Quebrada | Capital (x=54, filas 120..239): la Capital recibe la mitad este del río de Humahuaca (cols 162..166)
for y in range(CELDA_H):
    for k, sx in enumerate(range(162, 167)):
        g[CELDA_H + y][CELDA_W + k] = old[y][sx]
#  H2: La Quiaca | Humahuaca (x=108, filas 0..119): La Quiaca recibe la mitad oeste del mismo río (cols 158..161)
for y in range(CELDA_H):
    for k, sx in enumerate(range(158, 162)):
        g[y][2 * CELDA_W - 4 + k] = old[y][sx]

# ---- bordes exteriores: la cordillera que ya traía cada celda queda como muro del mundo
for y in range(FILAS):
    g[y][0] = '#'
    g[y][COLS - 1] = '#'
# la vía y los pasos que antes cruzaban hacia una región que ya no está quedan cerrados (ladrillo de montaña)
for cy in (0, 1):
    y0 = cy * CELDA_H
    for y in range(y0 + 38, y0 + 50):
        for x in list(range(1, 4)) + list(range(COLS - 4, COLS - 1)):
            if g[y][x] in 'vB.,"i':
                g[y][x] = '^'

# ---- aperturas verticales (muro de las filas 119/120 y 239/240)
def libre(x, y):
    return caminable(g[y][x])


def abrir_vertical(cx, cy_arriba, preferida):
    """Busca 3 columnas contiguas con terreno caminable a los dos lados del muro y las abre. Devuelve (x0, y_muro_sup)."""
    ym = (cy_arriba + 1) * CELDA_H - 1             # fila de muro de arriba; ym+1 = muro de abajo
    mejor = None
    for x0 in range(cx * CELDA_W + 10, cx * CELDA_W + CELDA_W - 12):
        ok = all(libre(x, ym - 1) and libre(x, ym + 2) for x in range(x0, x0 + 3))
        if not ok:
            continue
        d = abs(x0 + 1 - preferida)
        if mejor is None or d < mejor[0]:
            mejor = (d, x0)
    assert mejor, ('sin apertura', cx, cy_arriba)
    x0 = mejor[1]
    for x in range(x0, x0 + 3):
        for y in (ym, ym + 1):
            g[y][x] = ','
    return x0, ym


# Puna/Quebrada, La Quiaca/Capital, Humahuaca/Yungas: lo más cerca posible de las estaciones (x ~ 27, 82, 136)
APERTURAS = {}
for cx, pref in ((0, 27), (1, 82), (2, 136)):
    APERTURAS[cx] = abrir_vertical(cx, 0, pref)
# Capital/Alola ya tiene su paso de 3 columnas (24..26 de la Capital -> 78..80); se reusa
APERTURAS['sur'] = (CELDA_W + 24, 2 * CELDA_H - 1)
assert all(g[APERTURAS['sur'][1]][x] in '.,' for x in range(78, 81)), 'el paso sur no está donde se esperaba'


# ---------------------------------------------------------------- el Tren Solar: recorrido por puntos
# estaciones (x, y de la vía): las 6 de siempre trasladadas + la nueva de Alola
EST6 = [('San Salvador', 30, 6 - 6, 0), ('Volcán', 84, 0, 1), ('Purmamarca', 134, 0, 2), ('Humahuaca', 188, 0, 3),
        ('Abra Pampa', 244, 0, 4), ('La Quiaca', 298, 0, 5)]
def est_nueva(nombre, ox, region_s):
    x, y = T(ox, 43)
    return {'n': nombre, 'x': x, 'y': y}
ESTACIONES = {
    'capital': est_nueva('San Salvador', 30, 0),
    'yungas': est_nueva('Volcán', 84, 1),
    'quebrada': est_nueva('Purmamarca', 134, 2),
    'humahuaca': est_nueva('Humahuaca', 188, 3),
    'puna': est_nueva('Abra Pampa', 244, 4),
    'quiaca': est_nueva('La Quiaca', 298, 5),
    'alola': {'n': 'San Pedro de Jujuy', 'x': 79, 'y': 252},
}
for k, e in ESTACIONES.items():
    print('estación', k, e)

COSTO_CAM = {',': 1, '.': .6, '"': 1.4, 'a': 1.5, 'b': 2, 'c': 2, 'v': .2, '|': .2, '+': .2, '9': 1, '@': 3, '*': 1, 'N': 1.5, 'u': 2, 'm': 3, 'e': 2, 'F': 2, '%': 2, '6': 80}
def costo(ch):
    if ch in COSTO_CAM:
        return COSTO_CAM[ch]
    if ch == '~':
        return 25
    if ch == '#':
        return 7
    if ch == '^':
        return 18
    if ch in 'Pprq' or ch in 'CLY78AsGKDIOQdJ1234567':
        return 400
    if ch == 'i':
        return 15
    return 60 if not caminable(ch) else 3


MUROS_V = set()      # filas de muro (119/120, 239/240) -> sólo pasan las aperturas
APERT_COLS = {}
for k, (x0, ym) in APERTURAS.items():
    for y in (ym, ym + 1):
        APERT_COLS.setdefault(y, set()).update(range(x0, x0 + 3))
for y in (119, 120, 239, 240):
    MUROS_V.add(y)


def transitable(x, y):
    if x < 2 or x >= COLS - 2 or y < 1 or y >= FILAS - 1:
        return False
    if y in MUROS_V and x not in APERT_COLS.get(y, ()):
        return False
    return True


def astar(a, b, paso_extra=None, giro=12):
    """Camino de rieles de a=(x,y) a b=(x,y) por casilleros; estado = (x, y, dir)."""
    h = lambda x, y: abs(x - b[0]) + abs(y - b[1])
    pq = [(h(*a), 0, a[0], a[1], -1)]
    best = {(a[0], a[1], -1): 0}
    prev = {}
    while pq:
        f, c, x, y, d = heapq.heappop(pq)
        if (x, y) == tuple(b):
            ruta = [(x, y)]
            k = (x, y, d)
            while k in prev:
                k = prev[k]
                ruta.append((k[0], k[1]))
            return ruta[::-1]
        if best.get((x, y, d), 1e18) < c:
            continue
        for nd, (dx, dy) in enumerate(((1, 0), (-1, 0), (0, 1), (0, -1))):
            nx, ny = x + dx, y + dy
            if not transitable(nx, ny):
                continue
            nc = c + costo(g[ny][nx]) + (giro if d not in (-1, nd) else 0)
            k = (nx, ny, nd)
            if nc < best.get(k, 1e18):
                best[k] = nc
                prev[k] = (x, y, d)
                heapq.heappush(pq, (nc + h(nx, ny), nc, nx, ny, nd))
    raise RuntimeError(('sin camino', a, b))


def poner_rieles(ruta):
    """Escribe 'v' (este-oeste), '|' (norte-sur) o '+' (giro/cruce) en el mapa. El agua se cruza con puente 'B'."""
    cambios = []
    for i, (x, y) in enumerate(ruta):
        vecinos = [ruta[j] for j in (i - 1, i + 1) if 0 <= j < len(ruta)]
        hor = any(v[1] == y for v in vecinos)
        ver = any(v[0] == x for v in vecinos)
        ch0 = g[y][x]
        if ch0 == '~':
            g[y][x] = 'B'
            continue
        if ch0 in 'B':
            continue
        nuevo = '+' if (hor and ver) else ('|' if ver else 'v')
        if ch0 in 'v|+' and nuevo != ch0:
            nuevo = '+'
        if ch0 == 'i':
            cambios.append((x, y))
        g[y][x] = nuevo
    return cambios


E=ESTACIONES
# la estación nueva de Alola: tramo de vía recto sobre la calle que baja del paso (columna 79)
# tramos con A*: Yungas->Humahuaca, Puna->Quebrada, Capital->Alola
CORR = {}
def apertura_mas_cercana(cx, y):
    pass
CORR['yungas_humahuaca'] = astar((E['yungas']['x'], E['yungas']['y']), (E['humahuaca']['x'], E['humahuaca']['y']))
CORR['puna_quebrada'] = astar((E['puna']['x'], E['puna']['y']), (E['quebrada']['x'], E['quebrada']['y']))
CORR['capital_alola'] = astar((E['capital']['x'], E['capital']['y']), (E['alola']['x'], E['alola']['y']))
sig_borrados = []
for k, r in CORR.items():
    print(k, len(r), 'tiles')
    sig_borrados += poner_rieles(r)


# ---------------------------------------------------------------- estaciones: casilleros de la vía, edificio y paso
def alola_estacion():
    """Estación nueva de Alola (San Pedro de Jujuy): vía vertical en la calle (x=79); edificio al costado."""
    ex, ey = ESTACIONES['alola']['x'], ESTACIONES['alola']['y']
    g[ey][ex] = '|'
    g[ey][ex + 1] = 'Y'
    g[ey + 1][ex + 1] = 'i'
alola_estacion()

# ---------------------------------------------------------------- carteles, zonas y datos con coordenadas
carteles = {}
for k, v in base['carteles'].items():
    x, y = map(int, k.split(','))
    t = T(x, y)
    if t is None:
        continue
    carteles['%d,%d' % t] = v.replace('va de oeste a este por todas las regiones', 'recorre todas las regiones, de la Capital a Alola')

# los carteles de los pasos que ya no existen se pierden (el casillero se cerró)
for k in list(carteles):
    x, y = map(int, k.split(','))
    if g[y][x] != 'i':
        del carteles[k]
# sobrevivientes con texto que ya no es cierto
tt = lambda x, y: '%d,%d' % T(x, y)
carteles[tt(157, 44)] = 'El puente cruza el Río Grande hacia SAN SALVADOR (los VALLES). Es el único paso: el río no se cruza a nado.'
carteles[tt(167, 44)] = 'Bienvenido a la ALTA QUEBRADA, camino a Humahuaca. La Quiaca queda al oeste, cruzando el puente.'

def poner_cartel(x, y, texto):
    g[y][x] = 'i'
    carteles['%d,%d' % (x, y)] = texto

# H1 (Quebrada | Capital) y H2 (La Quiaca | Humahuaca): cartel del lado que no traía
poner_cartel(CELDA_W + 7, CELDA_H + 44, 'Bienvenido a los VALLES: acá está SAN SALVADOR, la capital. Purmamarca y la Quebrada quedan al oeste, cruzando el puente.')
poner_cartel(2 * CELDA_W - 5, 44, 'El puente cruza el Río Grande hacia la ALTA QUEBRADA y Humahuaca. Es el único paso: el río no se cruza a nado.')
# estación de Alola
carteles['%d,%d' % (ESTACIONES['alola']['x'] + 1, ESTACIONES['alola']['y'] + 1)] = 'Estación San Pedro de Jujuy del Tren Solar: el tren eléctrico alimentado con paneles solares recorre todas las regiones, de la Capital a Alola.'

# pasos verticales: dos carteles por paso, uno de cada lado
TEXTOS_V = {
    0: ('Seguí por este paso al sur: la QUEBRADA (Purmamarca y Tilcara). El Tren Solar baja por acá.',
        'Bienvenido a la QUEBRADA. Al norte queda la PUNA, subiendo por el paso.'),
    1: ('Seguí por este paso al sur: SAN SALVADOR, la capital. El Tren Solar baja por acá.',
        'Bienvenido a SAN SALVADOR. Al norte queda La Quiaca, subiendo por el paso.'),
    2: ('Seguí por este paso al sur: las YUNGAS (Libertador General San Martín). El Tren Solar baja por acá.',
        'Bienvenido a las YUNGAS. Al norte queda Humahuaca, subiendo por el paso.'),
}
for cx, (x0, ym) in ((c, APERTURAS[c]) for c in (0, 1, 2)):
    # el cartel va al costado del paso, sobre terreno libre (si el costado está ocupado se corre)
    for (x, y, txt) in ((x0 - 1, ym - 1, TEXTOS_V[cx][0]), (x0 + 3, ym + 2, TEXTOS_V[cx][1])):
        for dx in (0, 1, -1, 2, -2):
            if caminable(g[y][x + dx]) and g[y][x + dx] not in 'v|+B':
                poner_cartel(x + dx, y, txt)
                break

santuarios = {}
for k, v in base['santuarios'].items():
    x, y = map(int, k.split(','))
    t = T(x, y)
    if t:
        santuarios['%d,%d' % t] = v

zonas = []
def zona(n, x0, y0, x1, y1):
    zonas.append({'n': n, 'x0': x0, 'y0': y0, 'x1': min(x1, COLS - 2), 'y1': y1})

# franjas de río y cordillera de los bordes nuevos (van primero: advZonaDe() se queda con la primera que coincide)
zona('Puente del Río Grande de la Quebrada', 47, CELDA_H + 1, 61, 2 * CELDA_H - 2)
zona('Puente del Río Grande de Humahuaca', 100, 1, 112, CELDA_H - 2)
for cx, nombre in ((0, 'Paso de la Puna a la Quebrada'), (1, 'Paso de La Quiaca a San Salvador'), (2, 'Paso de Humahuaca a las Yungas')):
    x0, ym = APERTURAS[cx]
    zona(nombre, x0 - 2, ym - 4, x0 + 4, ym + 5)

def pedazos(z):
    """Parte un rectángulo viejo en un pedazo por franja/celda y lo traslada."""
    n, x0, y0, x1, y1 = z['n'], z['x0'], z['y0'], z['x1'], z['y1']
    if y0 >= CELDA_H:
        a, b = T(x0, y0), T(x1, y1)
        return [(n, a[0], a[1], b[0], b[1])]
    out = []
    for s in range(6):
        lo, hi = max(x0, s * CELDA_W), min(x1, s * CELDA_W + CELDA_W - 1 + (2 if s == 5 else 0))
        if lo > hi:
            continue
        a, b = T(lo, y0), T(hi, y1)
        out.append((n, a[0], a[1], b[0], b[1]))
    return out

for z in base['zonas']:
    for (n, a0, b0, a1, b1) in pedazos(z):
        # los pedazos que caen en las columnas exteriores cerradas no sirven
        if a1 <= 3 or a0 >= COLS - 4:
            continue
        zona(n, max(a0, 1), b0, a1, b1)

guaridas = []
for gu in base['GUARIDAS']:
    x0, y0 = T(gu['x0'], gu['y0'])
    px, py = T(*gu['puerta'])
    d = dict(gu); d['x0'], d['y0'], d['puerta'] = x0, y0, [px, py]
    guaridas.append(d)
fuego = [list(T(x, y)) for x, y in base['ZONAS_FUEGO']]
fuentes = [[T(f[0], f[1])[0] + .0, T(f[0], f[1])[1] + .0, f[2], f[3]] for f in base['FUENTES']]
algarrobos = [[T(a[0], a[1])[0] + .0, T(a[0], a[1])[1] + .0, a[2]] for a in base['ALGARROBOS']]

# ---------------------------------------------------------------- recorrido del tren
def seg(a, b):
    """Casilleros entre dos puntos alineados (incluye ambos)."""
    (x0, y0), (x1, y1) = a, b
    if x0 == x1:
        return [(x0, y) for y in (range(y0, y1 + 1) if y1 >= y0 else range(y0, y1 - 1, -1))]
    assert y0 == y1
    return [(x, y0) for x in (range(x0, x1 + 1) if x1 >= x0 else range(x0, x1 - 1, -1))]

def vertices(ruta):
    """Quita los casilleros del medio de los tramos rectos: queda sólo la poligonal."""
    out = [ruta[0]]
    for i in range(1, len(ruta) - 1):
        a, b, c = ruta[i - 1], ruta[i], ruta[i + 1]
        if (b[0] - a[0], b[1] - a[1]) != (c[0] - b[0], c[1] - b[1]):
            out.append(b)
    out.append(ruta[-1])
    # quita puntos repetidos
    lim = [out[0]]
    for p in out[1:]:
        if p != lim[-1]:
            lim.append(p)
    return lim

def pos(k):
    return (E[k]['x'], E[k]['y'])

def sin_vuelta(ruta):
    """El A* puede pasar dos veces por el mismo casillero (ida y vuelta); se acorta."""
    vistos = {}
    out = []
    for p in ruta:
        if p in vistos:
            out = out[:vistos[p] + 1]
            vistos = {q: i for i, q in enumerate(out)}
        else:
            vistos[p] = len(out)
            out.append(p)
    return out

PARADAS = ['capital', 'yungas', 'humahuaca', 'quiaca', 'puna', 'quebrada', 'capital', 'alola']
TRAMOS = [
    seg(pos('capital'), pos('yungas')),
    sin_vuelta(CORR['yungas_humahuaca']),
    seg(pos('humahuaca'), pos('quiaca')),
    seg(pos('quiaca'), pos('puna')),
    sin_vuelta(CORR['puna_quebrada']),
    seg(pos('quebrada'), pos('capital')),
    sin_vuelta(CORR['capital_alola']),
]
TRAMOS.append(TRAMOS[-1][::-1])
for i, t in enumerate(TRAMOS):
    de, a = PARADAS[i], PARADAS[(i + 1) % len(PARADAS)]
    assert t[0] == pos(de) and t[-1] == pos(a), (i, de, a, t[0], t[-1], pos(de), pos(a))
TREN = {
    'paradas': [{'n': E[k]['n'], 'x': E[k]['x'], 'y': E[k]['y']} for k in ('capital', 'yungas', 'humahuaca', 'quiaca', 'puna', 'quebrada', 'alola')],
    'ciclo': [['capital', 'yungas', 'humahuaca', 'quiaca', 'puna', 'quebrada', 'alola'].index(k) for k in PARADAS],
    'tramos': [vertices(t) for t in TRAMOS],
}

# ---------------------------------------------------------------- controles
def bfs_alcanzable(ini):
    vis = set([ini]); q = [ini]
    for (x, y) in q:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < COLS and 0 <= ny < FILAS and (nx, ny) not in vis and caminable(g[ny][nx]):
                vis.add((nx, ny)); q.append((nx, ny))
    return vis
inicio = [(x, y) for y in range(FILAS) for x in range(COLS) if g[y][x] == '@'][0]
alc = bfs_alcanzable(inicio)
total = sum(1 for y in range(FILAS) for x in range(COLS) if caminable(g[y][x]))
print('caminables', total, 'alcanzables desde @', len(alc), 'aislados', total - len(alc))
sin_texto = [(x, y) for y in range(FILAS) for x in range(COLS) if g[y][x] == 'i' and '%d,%d' % (x, y) not in carteles]
print('carteles sin texto:', sin_texto)

# bajada del tren: casillero caminable al lado de la vía de cada parada (no riel)
def baja(p):
    x, y = p['x'], p['y']
    for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1), (0, -2), (-2, 0)):
        nx, ny = x + dx, y + dy
        if caminable(g[ny][nx]) and g[ny][nx] not in 'v|+B' and (nx, ny) in alc:
            return [nx, ny]
    raise RuntimeError(('sin bajada', p))
for p in TREN['paradas']:
    p['baja'] = baja(p)

META = {'cols': COLS, 'filas': FILAS, 'zonas': zonas, 'carteles': carteles, 'santuarios': santuarios, 'guaridas': guaridas,
        'fuego': fuego, 'fuentes': fuentes, 'algarrobos': algarrobos, 'tren': TREN, 'inicio': list(inicio),
        'aperturas': {str(k): v for k, v in APERTURAS.items()}}
if __name__ == '__main__':
    io.open('mundo7.txt', 'w', encoding='utf-8').write('\n'.join(''.join(r) for r in g))
    io.open('mundo7.json', 'w', encoding='utf-8').write(json.dumps(META, ensure_ascii=False))
    io.open('/tmp/claude-0/work/mundo7_base.txt', 'w', encoding='utf-8').write('\n'.join(''.join(r) for r in g))
    print('mundo7.txt', COLS, 'x', FILAS, '| zonas', len(zonas), 'carteles', len(carteles), 'altares', len(santuarios))
    print('tramos (vértices):', [len(t) for t in TREN['tramos']])
