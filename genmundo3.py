"""Mundo Pokémon v3: el doble de grande que el v2, con zonas propias para los
tipos que antes no tenían hábitat (eléctrico y psíquico) y una ciénaga para
veneno/tierra, y con los altares repartidos con distancia mínima entre sí.

Reglas que valida solo (si alguna falla, avisa y no hay que publicar):
  1. todo POI (centros, cuevas, altares, bolas) alcanzable a pie desde el spawn
  2. ningún par de altares a menos de DIST_MIN casilleros
  3. cada altar con 5x5 de tierra alrededor (la losa del altar mide ~3 tiles)
  4. cada bioma con casilleros accesibles en las 3 regiones
  5. el cruce entre regiones sigue siendo ÚNICO (puente y desfiladero)

Salida: mundo3.txt (el mapa) y mundo3.json (cols/rows/zonas/carteles/
santuarios), que consume aplicar_mundo3.py para escribir index.html.
"""
import json
import math
from collections import deque

W, H = 160, 84
DIST_MIN = 30                     # separación mínima entre altares
g = [[',' for _ in range(W)] for _ in range(H)]

# fronteras (columnas): Kanto | río | Johto | cordillera | Hoenn
RIO    = (51, 57)
CORD   = (105, 111)
PASO_Y = 42                       # única fila por la que se cruza cada frontera


def R(x0, y0, x1, y1, ch):
    for y in range(max(0, y0), min(H - 1, y1) + 1):
        for x in range(max(0, x0), min(W - 1, x1) + 1):
            g[y][x] = ch


def ruido(x, y, n=0):
    s = math.sin(x * 127.1 + y * 311.7 + n * 74.7) * 43758.5453
    return s - math.floor(s)


def mancha(cx, cy, rx, ry, ch, n=0):
    for y in range(int(cy - ry - 1), int(cy + ry + 2)):
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            if not (0 <= x < W and 0 <= y < H):
                continue
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d <= 1 - .2 + ruido(x, y, n) * .35:
                g[y][x] = ch


def camino(puntos, ch='.', ancho=2):
    for (x0, y0), (x1, y1) in zip(puntos, puntos[1:]):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            for k in range(ancho):
                if 0 < y0 + k < H - 1:
                    g[y0 + k][x] = ch
        for y in range(min(y0, y1), max(y0, y1) + 1):
            for k in range(ancho):
                if 0 < x1 + k < W - 1:
                    g[y][x1 + k] = ch


def centro_pokemon(x, y):
    """El Centro ocupa 2x2: techo arriba (p q) y puerta abajo (P r)."""
    g[y - 1][x] = 'p'; g[y - 1][x + 1] = 'q'
    g[y][x] = 'P';     g[y][x + 1] = 'r'


# ============================ KANTO (x 1..50) ============================
mancha(24, 17, 15, 9, '"', 1)                      # pradera alta
mancha(43, 30, 7, 6, 'e', 21)                      # Central Eléctrica (canon de Kanto)
mancha(28, 45, 10, 6, '~', 4)                      # lago
mancha(11, 41, 11, 12, '#', 2)                     # Bosque Verde
mancha(11, 41, 7, 8, '"', 3)
mancha(39, 60, 8, 6, 'm', 22)                      # ciénaga
mancha(45, 50, 6, 5, 'u', 30)                      # ruinas de la Torre (psíquico)
mancha(45, 72, 7, 5, 'F', 31)                      # volcán del sudeste (fuego)
mancha(45, 72, 3, 2, 'V', 35)
R(3, 66, 30, 78, 'Z')                              # sierra nevada (sudoeste)
mancha(13, 72, 11, 5, 'N', 23)                     # campo de nieve
mancha(15, 12, 5, 3, '*', 5)
R(3, 3, 16, 10, '.')                               # Pueblo Paleta
centro_pokemon(6, 7)
camino([(9, 10), (9, 42), (58, 42)])               # ruta principal al puente
camino([(9, 20), (36, 20)])
camino([(9, 30), (43, 30)])                        # ramal a la central
camino([(14, 42), (14, 70)])                       # bajada a la sierra
camino([(11, 36), (11, 41)])                       # entrada al bosque
camino([(39, 42), (39, 60)])                       # bajada a la ciénaga
camino([(39, 50), (45, 50)])                       # ramal a las ruinas
camino([(39, 60), (45, 60), (45, 70)])             # ramal al volcán

# ============================ JOHTO (x 59..104) ============================
mancha(76, 11, 13, 7, '#', 6)                      # bosque de cerezos
mancha(76, 11, 10, 4, '"', 7)
mancha(92, 23, 8, 6, 'u', 24)                      # Ruinas (canon de Johto)
mancha(73, 41, 12, 7, '~', 8)                      # lago Espejo
mancha(67, 63, 12, 8, '"', 9)                      # pastizal
mancha(99, 53, 6, 5, 'e', 25)                      # campo eléctrico
mancha(87, 71, 9, 5, 'm', 26)                      # ciénaga
mancha(90, 52, 6, 4, 'N', 32)                      # nevada de la sierra (hielo)
mancha(80, 30, 7, 5, 'F', 33)                      # Torre Quemada (fuego)
mancha(80, 30, 3, 2, 'V', 36)
R(93, 60, 103, 70, '^')                            # sierra del sudeste
R(62, 3, 74, 10, '.')                              # Villa Cerezo
centro_pokemon(65, 7)
camino([(68, 10), (68, 42), (104, 42)])            # ruta principal al paso
camino([(58, 42), (68, 42)])
camino([(68, 22), (92, 22)])                       # ramal a las ruinas
camino([(68, 52), (99, 52)])                       # ramal al campo eléctrico
camino([(68, 60), (68, 66)])
camino([(87, 42), (87, 70)])                       # bajada a la ciénaga
camino([(80, 22), (80, 31)])                       # ramal a la Torre Quemada

# ============================ HOENN (x 112..158) ============================
mancha(127, 21, 12, 8, '"', 10)                    # selva
mancha(116, 16, 7, 5, 'u', 27)                     # ruinas del noroeste
R(148, 5, 157, 78, '~')                            # mar
mancha(141, 47, 9, 13, '~', 11)                    # bahía
mancha(153, 27, 3, 2, ',', 12)                     # isla
mancha(119, 46, 7, 6, 'm', 28)                     # ciénaga
mancha(139, 70, 6, 4, 'N', 34)                     # cumbre helada (hielo)
mancha(135, 35, 6, 5, 'e', 29)                     # campo eléctrico
mancha(125, 68, 11, 7, 'F', 13)                    # campo de ceniza
mancha(125, 68, 5, 4, 'V', 14)                     # volcán
R(131, 50, 141, 60, '^')                           # cerro con cueva
R(114, 3, 126, 10, '.')                            # Puerto
centro_pokemon(117, 7)
camino([(120, 10), (120, 42), (112, 42)])          # ruta principal al paso
camino([(120, 21), (140, 21)])
camino([(120, 35), (135, 35)])                     # ramal al campo eléctrico
camino([(120, 46), (126, 46)])
camino([(125, 42), (125, 64)])                     # bajada al volcán
camino([(120, 16), (116, 16)])                     # ramal a las ruinas
camino([(133, 66), (139, 66), (139, 70)])          # ramal a la cumbre helada

# ============================ FRONTERAS ============================
R(RIO[0], 1, RIO[1], H - 2, '~')
R(RIO[0] - 1, 1, RIO[0] - 1, H - 2, 'a')
R(RIO[1] + 1, 1, RIO[1] + 1, H - 2, 'a')
R(RIO[0], PASO_Y, RIO[1], PASO_Y + 1, 'B')         # el puente
R(CORD[0], 1, CORD[1], H - 2, '^')
R(CORD[0], PASO_Y, CORD[1], PASO_Y + 1, '.')       # el desfiladero

g[PASO_Y - 1][RIO[0] - 2] = 'T'; g[PASO_Y + 2][RIO[0] - 2] = 'i'
g[PASO_Y - 1][RIO[1] + 2] = 'T'; g[PASO_Y + 2][RIO[1] + 2] = 'i'
g[PASO_Y - 1][CORD[0] - 2] = 'T'; g[PASO_Y + 2][CORD[0] - 2] = 'i'
g[PASO_Y - 1][CORD[1] + 2] = 'T'; g[PASO_Y + 2][CORD[1] + 2] = 'i'

# ============================ CUEVAS Y ALTARES ============================
CENTROS = [(6, 7), (65, 7), (117, 7)]              # la puerta 'P' de cada Centro
CUEVAS  = [(16, 67), (97, 61), (134, 51)]

# Cada altar va en el bioma de SUS legendarios (Moltres en el volcán, Zapdos en
# el campo eléctrico, Articuno en la nieve...). Las coordenadas NO se eligen a
# mano: colocar_altares() las busca respetando bioma, distancia mínima y que
# haya tierra alrededor para la losa.
PEDIDOS = [
    # región, bioma, nombre, legendarios, zona preferida (centro temático)
    ('kanto', 'N',  'Cima Nevada',        ['Articuno'],                        (14, 73)),
    ('kanto', 'e',  'Central Eléctrica',  ['Zapdos'],                          (43, 30)),
    ('kanto', 'F',  'Cráter Ardiente',    ['Moltres'],                         (45, 72)),
    ('kanto', '"',  'Claro del Bosque',   ['Mew'],                             (11, 41)),
    ('johto', 'F',  'Torre Quemada',      ['Entei', 'Ho-Oh'],                  (80, 30)),
    ('johto', 'e',  'Llanura del Trueno', ['Raikou'],                          (99, 53)),
    ('johto', '"',  'Claro del Lago',     ['Lugia', 'Suicune'],                (67, 60)),
    ('hoenn', 'F',  'Falda del Volcán',   ['Groudon'],                         (125, 66)),
    ('hoenn', 'u',  'Ruinas del Cielo',   ['Latios', 'Latias', 'Rayquaza'],    (116, 16)),
    ('hoenn', ',"', 'Mirador del Mar',    ['Kyogre'],                          (146, 28)),
]

for (x, y) in CUEVAS:
    g[y][x] = 'C'
g[5][13] = 'T'; g[8][11] = 'i'

# ============================ PLAYA Y BORDES ============================
for y in range(1, H - 1):
    for x in range(1, W - 1):
        if g[y][x] in ',*"emu' and any(
                g[y + dy][x + dx] == '~'
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1))):
            g[y][x] = 'a'
for x in range(W):
    g[0][x] = '#'; g[H - 1][x] = '#'
for y in range(H):
    g[y][0] = '#'; g[y][W - 1] = '#'
g[4][4] = '@'

BOLAS = [(20, 14), (34, 24), (13, 40), (45, 34), (26, 62), (40, 12),
         (70, 14), (84, 26), (63, 46), (95, 50), (74, 66), (100, 30),
         (124, 16), (131, 28), (119, 50), (143, 24), (127, 58), (137, 40)]
# monedas sueltas por el piso, repartidas por las tres regiones
MONEDAS = [(16, 8), (28, 20), (12, 30), (36, 44), (21, 55), (46, 34), (33, 68), (8, 46),
           (66, 8), (80, 18), (72, 34), (90, 44), (62, 58), (97, 28), (78, 74), (101, 66),
           (122, 10), (130, 22), (117, 38), (140, 30), (126, 52), (144, 62), (134, 76), (114, 60)]
for (x, y) in BOLAS:
    if g[y][x] in ',*"a.emuNF':
        g[y][x] = 'b'
for (x, y) in MONEDAS:
    if g[y][x] in ',*"a.emuNF':
        g[y][x] = 'c'

# ============================ VALIDACIÓN ============================
CAM = set('.,@*"aBFCPbckoLEeumNZ') - set('Z')       # Z (montaña nevada) NO se camina
problemas = []


def bfs(bloquear=()):
    ini = (4, 4)
    vis = {ini}
    q = deque([ini])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < W and 0 <= ny < H):
                continue
            if (nx, ny) in vis or (nx, ny) in bloquear:
                continue
            if g[ny][nx] in CAM:
                vis.add((nx, ny)); q.append((nx, ny))
    return vis


vis = bfs()


def mudar(puntos, ch, libres=',*"aF.emuN'):
    """Si un POI quedó encerrado, lo corre al casillero alcanzable más cercano."""
    movidos = []
    for i, p in enumerate(puntos):
        x, y = p if isinstance(p, tuple) and len(p) == 2 else p[0]
        if (x, y) in vis:
            continue
        cerca = min((q for q in vis if g[q[1]][q[0]] in libres),
                    key=lambda q: (q[0] - x) ** 2 + (q[1] - y) ** 2)
        g[y][x] = ','
        g[cerca[1]][cerca[0]] = ch
        if isinstance(p, tuple) and len(p) == 2:
            puntos[i] = cerca
        else:
            puntos[i] = (cerca, p[1], p[2])
        movidos.append(((x, y), cerca))
    return movidos


def region(x):
    return 'kanto' if x < RIO[0] else 'johto' if x < CORD[0] else 'hoenn'


# ---- ubicación de los altares (bioma + distancia + tierra alrededor) ----
def secos(x, y, radio):
    """Cuántos casilleros SIN agua hay en el cuadrado de ese radio."""
    n = 0
    for dy in range(-radio, radio + 1):
        for dx in range(-radio, radio + 1):
            cx, cy = x + dx, y + dy
            if 0 <= cx < W and 0 <= cy < H and g[cy][cx] != '~':
                n += 1
    return n


def colocar_altares(pedidos):
    """Busca para cada altar un casillero de SU bioma que además esté
    alcanzable, tenga tierra alrededor para la losa y quede lejos de los
    altares ya puestos. Entre los que sirven, elige el que queda MÁS lejos
    de los otros: así se reparten solos por el mapa."""
    puestos = []
    # De más escaso a más abundante: si primero se sirve el bioma grande, se
    # queda con la zona y deja al chico sin ningún lugar a DIST_MIN (le pasó
    # al Cráter Ardiente, que es la única mancha de ceniza de Kanto).
    def candidatos(reg, ch):
        return sum(1 for (x, y) in vis if region(x) == reg and g[y][x] in ch)
    pedidos = sorted(pedidos, key=lambda p: candidatos(p[0], p[1]))
    def mismoBioma(x, y, ch):
        return sum(1 for dy in range(-2, 3) for dx in range(-2, 3)
                   if 0 <= x + dx < W and 0 <= y + dy < H and g[y + dy][x + dx] in ch)

    for reg, ch, nombre, pokes, pref in pedidos:
        mejor, mejorPuntaje = None, None
        # La zona temática es requisito, no preferencia: si no, el altar de Mew
        # se iba a la pradera del norte porque ahí el pasto es más parejo que
        # adentro del bosque. Se relaja sólo si de verdad no entra.
        for radio in (14, 25, 9999):
            for (x, y) in vis:
                if region(x) != reg or g[y][x] not in ch:
                    continue
                if not (4 <= x < W - 4 and 4 <= y < H - 4):   # que la losa no se salga del mapa
                    continue
                if secos(x, y, 1) < 9:             # la losa necesita 3x3 de tierra
                    continue
                if math.hypot(x - pref[0], y - pref[1]) > radio:
                    continue
                d = min([math.hypot(x - px, y - py) for (px, py), _, _ in puestos] or [9999])
                if d < DIST_MIN:
                    continue
                puntaje = (mismoBioma(x, y, ch), -round(math.hypot(x - pref[0], y - pref[1])))
                if mejorPuntaje is None or puntaje > mejorPuntaje:
                    mejor, mejorPuntaje = (x, y), puntaje
            if mejor:
                break
        if mejor is None:
            problemas.append('sin lugar para el altar ' + nombre + ' (bioma ' + ch + ' en ' + reg + ')')
            continue
        g[mejor[1]][mejor[0]] = 'L'
        puestos.append((mejor, nombre, pokes))
        print('  altar %-20s %-6s %-10s bioma alrededor %2d/25, a %d de la zona pedida'
              % (nombre, reg, str(mejor), mejorPuntaje[0], -mejorPuntaje[1]))
    return puestos


print('ubicando altares:')
ALTARES = colocar_altares(PEDIDOS)
vis = bfs()

bolas_pos = [(x, y) for y in range(H) for x in range(W) if g[y][x] == 'b']
monedas_pos = [(x, y) for y in range(H) for x in range(W) if g[y][x] == 'c']
for orig, nuevo in mudar(CUEVAS, 'C') + mudar(bolas_pos, 'b') + mudar(monedas_pos, 'c'):
    print('movido', orig, '->', nuevo)
vis = bfs()


print(f'{W}x{H} = {W*H} casilleros · alcanzables a pie: {len(vis)}')

# 1. POIs alcanzables
for nombre, puntos in [('centros', CENTROS), ('cuevas', CUEVAS),
                       ('altares', [p for p, _, _ in ALTARES]), ('bolas', bolas_pos),
                       ('monedas', monedas_pos)]:
    malos = [p for p in puntos if p not in vis]
    print(f'  {nombre:8} {len(puntos)-len(malos)}/{len(puntos)}', malos if malos else '')
    if malos:
        problemas.append(f'{nombre} sin acceso: {malos}')

# 2. altares separados
print('  distancias entre altares (mínimo pedido: %d)' % DIST_MIN)
for i in range(len(ALTARES)):
    for j in range(i + 1, len(ALTARES)):
        (x1, y1), n1, _ = ALTARES[i]
        (x2, y2), n2, _ = ALTARES[j]
        d = math.hypot(x1 - x2, y1 - y2)
        if d < DIST_MIN:
            problemas.append(f'altares pegados: {n1} y {n2} a {d:.0f}')
            print(f'    ✗ {n1} ↔ {n2}: {d:.0f}')
mind = min(math.hypot(a[0][0] - b[0][0], a[0][1] - b[0][1])
           for i, a in enumerate(ALTARES) for b in ALTARES[i + 1:])
print(f'    mínima: {mind:.0f}')

# 3. tierra alrededor de cada altar (la losa mide ~3 casilleros)
for (x, y), n, _ in ALTARES:
    if secos(x, y, 1) < 9:
        problemas.append(f'altar {n} sin 3x3 de tierra para la losa')
        print(f'    ✗ {n}: la losa no entra')

# 4. biomas por región
BIOMAS = {'hierba': '"', 'orilla': 'a', 'nieve': 'N', 'electrico': 'e',
          'psiquico': 'u', 'cienaga': 'm', 'ceniza': 'F'}
print('  bioma      ' + ''.join(f'{r:>9}' for r in ('kanto', 'johto', 'hoenn')))
for nombre, ch in BIOMAS.items():
    fila = []
    for r in ('kanto', 'johto', 'hoenn'):
        n = sum(1 for (x, y) in vis if region(x) == r and g[y][x] == ch)
        fila.append(n)
        if n == 0:
            problemas.append(f'bioma {nombre} sin casilleros accesibles en {r}')
    print(f'  {nombre:10}' + ''.join(f'{n:>9}' for n in fila))

# 5. cruce único
puente = {(x, y) for y in (PASO_Y, PASO_Y + 1) for x in range(RIO[0], RIO[1] + 1)}
paso = {(x, y) for y in (PASO_Y, PASO_Y + 1) for x in range(CORD[0], CORD[1] + 1)}
if any(region(x) == 'johto' for (x, y) in bfs(bloquear=puente)):
    problemas.append('se llega a Johto sin el puente')
if any(region(x) == 'hoenn' for (x, y) in bfs(bloquear=paso)):
    problemas.append('se llega a Hoenn sin el desfiladero')
print('  cruce único: puente y desfiladero OK' if not problemas else '')

print('\nPROBLEMAS:', '\n  - '.join([''] + problemas) if problemas else 'ninguno')

# ============================ SALIDA ============================
open('mundo3.txt', 'w').write('\n'.join(''.join(r) for r in g))

zonas = [
    {'n': 'Puente del Río',         'x0': RIO[0] - 2, 'y0': 1, 'x1': RIO[1] + 2, 'y1': H - 2},
    {'n': 'Paso de la Cordillera',  'x0': CORD[0] - 2, 'y0': 1, 'x1': CORD[1] + 2, 'y1': H - 2},
    {'n': 'Kanto · Pueblo Paleta',  'x0': 1, 'y0': 1, 'x1': 50, 'y1': 12},
    {'n': 'Kanto · Pradera',        'x0': 1, 'y0': 13, 'x1': 50, 'y1': 26},
    {'n': 'Kanto · Central Eléctrica', 'x0': 36, 'y0': 27, 'x1': 50, 'y1': 40},
    {'n': 'Kanto · Bosque Verde',   'x0': 1, 'y0': 27, 'x1': 35, 'y1': 58},
    {'n': 'Kanto · Ciénaga',        'x0': 36, 'y0': 41, 'x1': 50, 'y1': 66},
    {'n': 'Kanto · Sierra Nevada',  'x0': 1, 'y0': 59, 'x1': 50, 'y1': H - 2},
    {'n': 'Johto · Villa Cerezo',   'x0': 58, 'y0': 1, 'x1': 104, 'y1': 16},
    {'n': 'Johto · Ruinas',         'x0': 84, 'y0': 17, 'x1': 104, 'y1': 34},
    {'n': 'Johto · Lago Espejo',    'x0': 58, 'y0': 17, 'x1': 83, 'y1': 55},
    {'n': 'Johto · Campo Eléctrico', 'x0': 84, 'y0': 35, 'x1': 104, 'y1': 58},
    {'n': 'Johto · Pastizal',       'x0': 58, 'y0': 56, 'x1': 83, 'y1': H - 2},
    {'n': 'Johto · Ciénaga',        'x0': 84, 'y0': 59, 'x1': 104, 'y1': H - 2},
    {'n': 'Hoenn · Puerto',         'x0': 112, 'y0': 1, 'x1': 158, 'y1': 16},
    {'n': 'Hoenn · Selva',          'x0': 112, 'y0': 17, 'x1': 145, 'y1': 30},
    {'n': 'Hoenn · Costa',          'x0': 146, 'y0': 17, 'x1': 158, 'y1': H - 2},
    {'n': 'Hoenn · Ciénaga',        'x0': 112, 'y0': 31, 'x1': 129, 'y1': 55},
    {'n': 'Hoenn · Cerro',          'x0': 130, 'y0': 31, 'x1': 145, 'y1': 60},
    {'n': 'Hoenn · Volcán',         'x0': 112, 'y0': 56, 'x1': 145, 'y1': H - 2},
]

carteles = {
    f'{12},{9}': 'Centro Pokémon del pueblo ➜ ahí venden pokébolas.',
    f'{RIO[0]-2},{PASO_Y+2}': 'El puente cruza a JOHTO. Es el único paso: el río no se cruza a nado.',
    f'{RIO[1]+2},{PASO_Y+2}': 'Bienvenido a JOHTO. Kanto queda al oeste, cruzando el puente.',
    f'{CORD[0]-2},{PASO_Y+2}': 'El desfiladero lleva a HOENN. Es el único paso por la cordillera.',
    f'{CORD[1]+2},{PASO_Y+2}': 'Bienvenido a HOENN. Johto queda al oeste, cruzando el paso.',
}

santuarios = {f'{x},{y}': {'n': n, 'pokes': pokes} for (x, y), n, pokes in ALTARES}

json.dump({
    'cols': W, 'filas': H,
    'rio': RIO, 'cord': CORD, 'pasoY': PASO_Y,
    'fronteras': [{'hasta': (RIO[0] + RIO[1]) // 2, 'region': 'kanto'},
                  {'hasta': (CORD[0] + CORD[1]) // 2, 'region': 'johto'},
                  {'hasta': 9999, 'region': 'hoenn'}],
    'zonas': zonas, 'carteles': carteles, 'santuarios': santuarios,
    'centros': CENTROS, 'cuevas': CUEVAS,
}, open('mundo3.json', 'w'), ensure_ascii=False, indent=1)
print('escrito mundo3.txt y mundo3.json')
