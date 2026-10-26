"""Mundo Pokémon v4 · JUJUY. Mismo esqueleto que el v3 (6 franjas = 6 regiones del juego, 24 altares,
7 biomas por región, cruces únicos y el mismo validador), con la geografía de Jujuy:
Valles (San Salvador, sobre datos reales de OpenStreetMap) · Yungas · Quebrada (Tilcara/Purmamarca y el
Cerro de los Siete Colores) · Quebrada alta (Humahuaca y el Hornocal) · Puna (Abra Pampa, Salinas Grandes)
· Puna norte (La Quiaca y Yavi). Salida: mundo4.txt y mundo4.json.

Mundo Pokémon v3: el doble de grande que el v2, con zonas propias para los
tipos que antes no tenían hábitat (eléctrico y psíquico) y una ciénaga para
veneno/tierra, y con los altares repartidos con distancia mínima entre sí.

Reglas que valida solo (si alguna falla, avisa y no hay que publicar):
  1. todo POI (centros, cuevas, altares, bolas) alcanzable a pie desde el spawn
  2. ningún par de altares a menos de DIST_MIN casilleros
  3. cada altar con 5x5 de tierra alrededor (la losa del altar mide ~3 tiles)
  4. cada bioma con casilleros accesibles en las 3 regiones
  5. el cruce entre regiones sigue siendo ÚNICO (puente y desfiladero)

Salida: mundo3.txt (el mapa) y mundo3.json (cols/rows/zonas/carteles/
santuarios), que consume aplicar_mundo3.py para escribir app.js.
"""
import json
import math
from collections import deque

W, H = 322, 84
DIST_MIN = 22                      # separación mínima entre altares (bajó de 30: con 6 regiones y 24 altares no entraba)
g = [[',' for _ in range(W)] for _ in range(H)]
PROT = set()            # casilleros que los parches no pisan (ríos, calles, casas) mientras está activo

# fronteras (columnas): Kanto | río | Johto | cordillera | Hoenn | estrecho |
#                       Sinnoh | desfiladero2 | Teselia | río3 | Kalos
RIO    = (51, 57)
CORD   = (105, 111)
RIO2   = (159, 165)                # Hoenn -> Sinnoh (el mar de Hoenn sigue como estrecho)
CORD2  = (213, 219)                # Sinnoh -> Teselia
RIO3   = (267, 273)                # Teselia -> Kalos
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
            if d <= 1 - .2 + ruido(x, y, n) * .35 and g[y][x] not in PROT:
                g[y][x] = ch


def _pon(x, y, ch):
    if 0 < x < W - 1 and 0 < y < H - 1:
        g[y][x] = 'B' if (ch == '.' and g[y][x] == '~') else ch


def camino(puntos, ch='.', ancho=2):
    for (x0, y0), (x1, y1) in zip(puntos, puntos[1:]):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            for k in range(ancho):
                _pon(x, y0 + k, ch)
        for y in range(min(y0, y1), max(y0, y1) + 1):
            for k in range(ancho):
                _pon(x1 + k, y, ch)


def centro_pokemon(x, y):
    """El Centro ocupa 2x2: techo arriba (p q) y puerta abajo (P r)."""
    g[y - 1][x] = 'p'; g[y - 1][x + 1] = 'q'
    g[y][x] = 'P';     g[y][x + 1] = 'r'


# ============================ HELPERS DE JUJUY ============================
PROT = set()            # casilleros que los parches NO pisan (ríos, calles, casas) mientras está activo


def casas(x0, y0, x1, y1, hueco=.1, n=0, calle=3):
    """Manzanas de casas (2x2) con calles cada `calle` casilleros."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if g[y][x] in PROT and g[y][x] != ',':
                continue
            if x % calle == 0 or y % calle == 0:
                g[y][x] = '.'
            else:
                g[y][x] = ',' if ruido(x, y, 200 + n) < hueco else 'H'


def salpicar(x0, x1, y0, y1, ch, p, n, sobre=','):
    """Árboles/cardones sueltos (p = probabilidad por casillero)."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if g[y][x] == sobre and ruido(x, y, 300 + n) < p:
                g[y][x] = ch


def cerro(cx, cy, rx, ry, ch, n):
    """Cerro macizo (no se camina), más alto en el medio: perfil de montaña, no un óvalo."""
    for y in range(cy - ry - 1, cy + 3):
        for x in range(cx - rx - 2, cx + rx + 3):
            if not (1 <= x < W - 1 and 1 <= y < H - 1):
                continue
            dx = abs(x - cx) / rx
            # altura del perfil en esa columna: pico a la izquierda del centro y una segunda cumbre más baja
            alto = ry * max(0, 1 - dx ** 1.4) * (.82 + .18 * math.sin(x * .9 + n)) + ry * .22 * math.exp(-((x - cx - rx * .55) / 2.2) ** 2)
            if dx <= 1.05 and cy - alto <= y <= cy + 2 and g[y][x] not in PROT:
                g[y][x] = ch


def pueblo(x0, y0, x1, y1, n=0):
    casas(x0, y0, x1, y1, .16, n)



# ---- Detalle de San Salvador hecho mirando el satélite y las fotos (Plaza Belgrano, Parque San Martín, Xibi Xibi) ----
def _poner(x, y, ch):
    if 0 < x < W - 1 and 0 < y < H - 1:
        g[y][x] = ch


def _camino(x0, y0, x1, y1):
    for x in range(min(x0, x1), max(x0, x1) + 1):
        for y in range(min(y0, y1), max(y0, y1) + 1):
            _poner(x, y, 'B' if g[y][x] == '~' else '.')


# Fuentes redondas (se dibujan pixel a pixel en app.js, FUENTES): (centro x, centro y, radio en casilleros, con reja)
FUENTES = [(33.0, 26.0, 2.0, False),      # plazoleta frente a la Casa de Gobierno
           (6.0, 17.0, 1.7, True)]        # Parque San Martín (con reja de hierro)


def _fuentes():
    for (fx, fy, r, _reja) in FUENTES:
        for y in range(int(fy - r - 2), int(fy + r + 3)):
            for x in range(int(fx - r - 2), int(fx + r + 3)):
                if math.hypot(x + .5 - fx, y + .5 - fy) <= r + .5:
                    _poner(x, y, 'X')


def plaza_belgrano():
    """Plaza Belgrano, la manzana de 15x15 (sacada de las fotos): senderos en cruz y en diagonal que convergen en la
    rotonda con el monumento ecuestre a Belgrano, cedros, palmeras, bancos y canteros. Alrededor, calles; al norte
    la Catedral y el Cabildo; al sur la plazoleta con la fuente redonda y la Casa de Gobierno de frente."""
    cx, cy = 33, 15
    for x in range(25, 42):
        _poner(x, 7, '.'); _poner(x, 23, '.')
    for y in range(7, 24):
        _poner(25, y, '.'); _poner(41, y, '.')
    cedros = {(5, 3), (3, 5)}; palmas = {(6, 2), (2, 6)}; arbustos = {(4, 1), (1, 4), (6, 4), (4, 6)}
    bancos = {(1, 3), (3, 1)}; flores = {(4, 2), (2, 4), (5, 1), (1, 5), (6, 3), (3, 6)}
    for dy in range(-7, 8):
        for dx in range(-7, 8):
            ax, ay = abs(dx), abs(dy)
            k = (ax, ay) if ax <= ay else (ay, ax)
            if dx == 0 or dy == 0 or ax == ay or max(ax, ay) <= 2:
                ch = '.'
            elif (ax, ay) in cedros or (ay, ax) in cedros:
                ch = 'g'
            elif (ax, ay) in palmas or (ay, ax) in palmas:
                ch = 'n'
            elif (ax, ay) in arbustos or (ay, ax) in arbustos:
                ch = '#'
            elif (ax, ay) in bancos or (ay, ax) in bancos:
                ch = 't'
            elif (ax, ay) in flores or (ay, ax) in flores:
                ch = '*'
            elif max(ax, ay) == 7 and (ax + ay) % 2 == 1:
                ch = '#'
            else:
                ch = ','
            _poner(cx + dx, cy + dy, ch)
    _poner(cx, cy, 'z')
    for (fx, fy) in ((28, 9), (38, 9), (28, 21), (38, 21)):   # faroles en las esquinas de la plaza
        _poner(fx, fy, 'l')
    for x in range(26, 41):                              # frente de la Catedral y el Cabildo
        for y in (4, 5, 6):
            _poner(x, y, ',')
    for x in range(26, 41):                              # plazoleta de la fuente frente a la Casa de Gobierno
        for y in range(24, 29):
            _poner(x, y, ',')
    _fuentes()
    for (fx, fy) in ((29, 25), (37, 25), (29, 27), (37, 27)):
        _poner(fx, fy, '*')
    for (fx, fy) in ((27, 24), (39, 24), (27, 28), (39, 28)):
        _poner(fx, fy, 'n')
    for (fx, fy) in ((30, 28), (36, 28)):
        _poner(fx, fy, 'l')
    centro_pokemon(22, 12)                               # Centro Pokémon al oeste de la plaza, sobre la avenida
    _camino(22, 13, 24, 13)


def parque_san_martin():
    """Parque San Martín (~600 m): avenidas España (oeste), Córdoba (este) y General Paz (sur); adentro, monte denso
    con senderos que salen en diagonal de la rotonda central y la fuente con reja al suroeste."""
    x0, x1, y0, y1 = 2, 20, 4, 21
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if x in (x0, x1) or y in (y0, y1):
                _poner(x, y, '.')
            else:
                r = ruido(x, y, 61)
                _poner(x, y, 'g' if r < .08 else ('#' if r < .46 else '"'))
    cx, cy = 11, 13
    for k in range(-8, 9):
        for (a, b) in ((k, k), (k, -k)):
            _poner(cx + a, cy + b, '.')
    for d in range(-2, 3):
        for e in range(-2, 3):
            _poner(cx + d, cy + e, '.')
    _poner(cx, cy, 'O')
    _fuentes()
    for (fx, fy) in ((6, 12), (16, 8), (16, 17), (7, 8)):
        _poner(fx, fy, '*')
    _camino(20, 10, 24, 10)                              # al oeste de la avenida principal
    _camino(11, 21, 11, 30)                              # salida sur hacia el Xibi Xibi


def rio_grande_y_xibi_xibi():
    """Río Grande por el borde este y el Xibi Xibi, que cruza la ciudad de oeste a este serpenteando y lo alcanza.
    Cauce de 3 casilleros con playa ancha (orilla: salen Pokémon de agua), parque con árboles e hierba alta,
    lagunitas, una ciénaga en la desembocadura (bañado), una avenida por orilla y puentes."""
    def eje(x):
        return int(round(36 + 2.2 * math.sin((x - 2) / 5.5)))
    for y in range(1, 42):
        for x in range(46, 49):
            _poner(x, y, '~')
        for x in (43, 44, 45, 49):
            _poner(x, y, 'a')
    for x in range(2, 49):
        for y in range(eje(x) - 1, eje(x) + 2):
            _poner(x, y, '~')
    for x in range(2, 43):
        for y in range(31, 41):
            if g[y][x] == '~':
                continue
            dist = min(abs(y - (eje(x) - 1)), abs(y - (eje(x) + 1)))
            if dist <= 2:
                _poner(x, y, 'a')
            else:
                r = ruido(x, y, 77)
                _poner(x, y, '#' if r < .38 else ('"' if r < .85 else ','))
        for y in (30, 41):
            _poner(x, y, '.')
    def libre(x, y, w, h):
        return all(g[yy][xx] in '"#,' for yy in range(y - 2, y + h + 2) for xx in range(x - 2, x + w + 2))
    puestas = 0
    for (lx, ly) in ((12, 32), (12, 38), (28, 32), (28, 38), (20, 32), (34, 38), (34, 32), (6, 38)):
        if puestas < 3 and libre(lx, ly, 3, 2):
            for yy in range(ly, ly + 2):
                for xx in range(lx, lx + 3):
                    _poner(xx, yy, '~')
            puestas += 1
    for y in range(31, 41):                              # bañado en la desembocadura
        for x in range(36, 43):
            if g[y][x] in '"#,' and ((x - 40) / 3.6) ** 2 + ((y - 35.5) / 4.5) ** 2 < 1 and ruido(x, y, 88) > .3:
                _poner(x, y, 'm')
    for bx in (8, 14, 20, 31, 38, 43):                   # puentes (Lavalle, Necochea...)
        _camino(bx, 30, bx, 41)
    for x in range(2, 45):                               # avenida norte
        _poner(x, 3, '.')

# ============================ REGIÓN 1 · VALLES · SAN SALVADOR DE JUJUY (x 1..50) ============================
# Base real: ríos Grande y Xibi Xibi, parques y calles de OpenStreetMap (capital_raster.py, 1 casillero ≈ 70 m).
import capital_raster as _cap
for (_x, _y), _c in _cap.grid.items():
    if 1 <= _x <= 50 and 1 <= _y <= 82:
        g[_y][_x] = _c
# Sin casas: se deja el terreno tal como se ve desde arriba (ríos, parques, avenidas y cerros de OpenStreetMap).
PROT = set('~B')
# los parques reales son finitos a esta escala: se ensanchan un casillero para que se lean como parques
_nuevos = []
for _y in range(2, 40):
    for _x in range(2, 50):
        if g[_y][_x] == ',' and any(g[_y + _dy][_x + _dx] == '"' for _dx, _dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            _nuevos.append((_x, _y))
for _x, _y in _nuevos:
    g[_y][_x] = '"'
for _y in range(1, 42):
    for _x in range(1, 51):
        g[_y][_x] = ','
rio_grande_y_xibi_xibi()
parque_san_martin()
plaza_belgrano()
mancha(45, 52, 5, 4, 'e', 21)                      # Usina del dique
mancha(28, 56, 8, 5, '~', 4)                       # laguna
mancha(42, 66, 7, 5, 'm', 22)                      # bañado del Río Grande
mancha(25, 44, 5, 4, 'u', 30)                      # viejo cementerio
mancha(46, 76, 6, 4, 'F', 31)                      # Cerro Colorado
mancha(14, 76, 15, 5, 'Z', 29)                     # cordón nevado del Chañi (al fondo)
mancha(14, 72, 11, 3, 'N', 23)
camino([(24, 3), (24, 42), (58, 42)])             # avenida principal: cruza el Xibi Xibi por un puente y sigue hasta el Río Grande
camino([(24, 52), (45, 52)])                       # a la usina
camino([(14, 42), (14, 72)])                       # bajada al cordón nevado
camino([(25, 42), (25, 46)])                       # al cementerio
camino([(42, 42), (42, 66)])                       # bajada al bañado
camino([(42, 66), (46, 66), (46, 75)])             # ramal al Cerro Colorado
salpicar(2, 49, 2, 80, '#', .03, 1)                # tipas y lapachos sueltos

# ============================ REGIÓN 2 · YUNGAS · LIBERTADOR GENERAL SAN MARTÍN (x 59..104) ============================
mancha(76, 12, 14, 8, '#', 6)                      # selva de yungas
mancha(76, 12, 10, 4, '"', 7)
mancha(100, 9, 6, 8, '#', 16)
mancha(61, 52, 3, 11, '#', 17)
mancha(92, 23, 8, 6, 'u', 24)                      # ruinas entre el follaje
mancha(73, 41, 12, 7, '~', 8)                      # Lagunas de Yala
mancha(67, 63, 12, 8, '"', 9)                      # cañaverales de Ledesma
mancha(66, 49, 5, 3, '"', 18)                      # orilla alta de las lagunas
mancha(99, 53, 6, 5, 'e', 25)                      # usina del ingenio
mancha(87, 71, 9, 5, 'm', 26)                      # bañados
mancha(90, 52, 6, 4, 'N', 32)                      # cumbres altas con nieve
mancha(80, 30, 7, 5, 'F', 33)                      # Altos Hornos
R(93, 60, 103, 70, '^')                            # sierra de Calilegua
R(88, 45, 94, 48, 'Z')
R(62, 3, 76, 12, '.')
R(62, 5, 72, 9, '.')
centro_pokemon(65, 7)
camino([(68, 10), (68, 42), (104, 42)])
camino([(58, 42), (68, 42)])
camino([(68, 22), (92, 22)])
camino([(68, 52), (99, 52)])
camino([(68, 60), (68, 66)])
camino([(87, 42), (87, 70)])
camino([(80, 22), (80, 31)])
salpicar(60, 103, 2, 80, '#', .06, 2)

# ============================ REGIÓN 3 · QUEBRADA · TILCARA Y PURMAMARCA (x 112..158) ============================
mancha(127, 21, 12, 8, '"', 10)                    # monte de churquis
mancha(116, 16, 7, 5, 'u', 27)                     # Pucará de Tilcara
R(148, 5, 157, 78, '~')                            # Río Grande de la Quebrada
mancha(140, 28, 5, 3, '~', 11)                     # remanso
mancha(153, 27, 3, 2, ',', 12)
mancha(119, 46, 7, 6, 'm', 28)                     # vega de Maimará
mancha(139, 78, 6, 3, 'N', 34)                     # Salinas Grandes (costra blanca)
mancha(135, 35, 6, 5, 'e', 29)                     # parque solar
mancha(127, 77, 9, 4, 'F', 13)                     # Paseo de los Colorados (al sur de Purmamarca)
R(114, 3, 126, 10, '.')
R(114, 5, 124, 9, '.')
centro_pokemon(117, 7)
cerro(122, 63, 8, 13, 'M', 4)                      # EL CERRO DE LOS SIETE COLORES (al oeste del pueblo, como en el satélite)
camino([(120, 10), (120, 42), (112, 42)])
camino([(120, 21), (140, 21)])
camino([(120, 35), (135, 35)])
camino([(120, 46), (126, 46)])
camino([(120, 42), (120, 47), (134, 47), (134, 53)])   # de la Quebrada al pueblo de Purmamarca
camino([(120, 16), (116, 16)])
camino([(120, 42), (158, 42)])
salpicar(112, 147, 2, 80, '#', .05, 3)             # cardones

# --- Purmamarca: pueblo de adobe al pie del cerro (x 131..143, y 53..71), con plaza, iglesia, cabildo y puestos ---
for _y in range(53, 72):
    for _x in range(131, 144):
        if g[_y][_x] in ',"#':
            g[_y][_x] = 'h' if ruido(_x, _y, 210) > .8 else ','
for _x in range(131, 144):
    for _y in (58, 66, 70):
        g[_y][_x] = '.'
for _y in range(47, 73):
    for _x in (134, 140):
        g[_y][_x] = '.'
for _y in range(59, 66):                            # plaza empedrada con algarrobos y puestos de artesanías
    for _x in range(135, 140):
        g[_y][_x] = '.'
for (_x, _y) in ((135, 59), (139, 59), (135, 65), (139, 65)):
    g[_y][_x] = '#'
g[62][137] = '*'
for _y in (60, 62, 64):
    g[_y][135] = 'y'; g[_y][139] = 'y'
for _x in range(135, 140):
    g[57][_x] = ','
g[57][135] = 'D'; g[57][137] = 'I'
for _x in (131, 132, 133):                           # entrada al pueblo desde el cerro
    g[62][_x] = '.'

# ============================ REGIÓN 4 · QUEBRADA ALTA · HUMAHUACA Y EL HORNOCAL (x 166..212) ============================
mancha(189, 20, 13, 8, '"', 50)
mancha(178, 45, 6, 5, 'u', 51)                     # ruinas de Coctaca
mancha(172, 35, 9, 7, '~', 52)                     # Río Grande, remanso de Uquía
mancha(170, 55, 11, 10, '#', 53)                   # cardonal
mancha(170, 55, 7, 7, '"', 54)
mancha(200, 30, 7, 6, 'e', 55)
mancha(195, 62, 9, 6, 'm', 56)                     # vega de Iruya
mancha(205, 72, 7, 5, 'F', 57)
mancha(186, 74, 11, 5, 'Z', 58)
mancha(184, 73, 10, 5, 'N', 59)
R(178, 3, 190, 10, '.')
R(179, 5, 189, 9, '.')
centro_pokemon(182, 7)
cerro(204, 72, 7, 7, 'M', 9)                       # Serranía del Hornocal (14 colores)
camino([(184, 10), (184, 42), (159, 42)])
camino([(184, 42), (213, 42)])
camino([(184, 22), (178, 22), (178, 45)])
camino([(184, 35), (172, 35)])
camino([(184, 55), (177, 55)])
camino([(184, 62), (195, 62)])
camino([(200, 42), (200, 30)])
camino([(184, 66), (205, 66), (205, 71)])
salpicar(166, 211, 2, 80, '#', .045, 4)

# ============================ REGIÓN 5 · PUNA · ABRA PAMPA Y LAS SALINAS (x 220..266) ============================
mancha(243, 20, 13, 8, '"', 60)                    # pajonales de ichu
mancha(228, 40, 9, 7, 'u', 61)                     # pucará
mancha(230, 55, 9, 6, '~', 62)                     # Laguna de los Pozuelos
mancha(255, 30, 7, 6, 'e', 63)                     # parque solar Cauchari
mancha(250, 60, 9, 6, 'm', 64)                     # vegas
mancha(258, 70, 7, 5, 'F', 65)
mancha(258, 70, 3, 2, 'V', 66)                     # volcán
R(222, 66, 244, 78, 'Z')
mancha(232, 73, 12, 5, 'N', 67)                    # Salinas Grandes
R(232, 3, 244, 10, '.')
R(233, 5, 243, 9, '.')
centro_pokemon(236, 7)
camino([(238, 10), (238, 42), (213, 42)])
camino([(238, 42), (267, 42)])
camino([(238, 22), (228, 22), (228, 40)])
camino([(238, 30), (255, 30)])
camino([(238, 55), (230, 55)])
camino([(238, 60), (250, 60)])
camino([(238, 66), (258, 66), (258, 69)])
camino([(238, 66), (228, 66), (228, 72)])
salpicar(220, 265, 2, 80, '#', .02, 5)

# ============================ REGIÓN 6 · PUNA NORTE · LA QUIACA Y YAVI (x 274..320) ============================
mancha(283, 16, 13, 9, '"', 70)                    # pastizal de altura
mancha(283, 16, 11, 7, ',', 71)
mancha(283, 42, 7, 6, 'u', 72)                     # iglesia y ruinas de Yavi
mancha(300, 50, 8, 6, '~', 73)                     # laguna
mancha(295, 62, 6, 5, 'e', 74)
mancha(313, 40, 6, 5, 'm', 75)
mancha(305, 68, 8, 5, 'F', 76)                     # cerro colorado
mancha(305, 68, 4, 3, 'V', 77)
mancha(310, 25, 8, 5, 'N', 78)
R(302, 20, 316, 32, 'Z')
R(286, 3, 298, 10, '.')
R(287, 5, 297, 9, '.')
centro_pokemon(290, 7)
camino([(292, 10), (292, 42), (267, 42)])
camino([(292, 22), (287, 22)])
camino([(292, 30), (292, 42)])
camino([(292, 42), (283, 42)])
camino([(292, 50), (300, 50)])
camino([(292, 62), (295, 62)])
camino([(292, 68), (305, 68)])
camino([(295, 30), (310, 30), (310, 26)])
salpicar(274, 319, 2, 80, '#', .02, 6)

def repartir(x0, x1, n, semilla, sobre=',*"a.'):
    """Elige n casilleros de tierra libre en la franja x0..x1, separados entre sí (mismo mapa => mismos objetos)."""
    cand = [(x, y) for y in range(3, H - 3) for x in range(x0, x1 + 1) if g[y][x] in sobre]
    cand.sort(key=lambda p: ruido(p[0], p[1], semilla))
    out = []
    for p in cand:
        if all(abs(p[0] - q[0]) + abs(p[1] - q[1]) >= 9 for q in out):
            out.append(p)
            if len(out) == n:
                break
    return out


# ============================ LUGARES EMBLEMÁTICOS DE JUJUY ============================
# Cada uno es un casillero propio (no se camina) con su dibujo, y un cartel al lado que lo nombra.
LUG_CARTELES = {}


def _libre_cerca(x, y, r=3, ok=',".*a'):
    for d in range(r + 1):
        for dy in range(-d, d + 1):
            for dx in range(-d, d + 1):
                if max(abs(dx), abs(dy)) == d and 0 < x + dx < W - 1 and 0 < y + dy < H - 1 and g[y + dy][x + dx] in ok:
                    return x + dx, y + dy
    return None


def lugar(x, y, ch, texto, sx=None, sy=None):
    """Pone el monumento en (x,y) y su cartel en (sx,sy) (por defecto, justo abajo)."""
    g[y][x] = ch
    cx, cy = (x, y + 1) if sx is None else (sx, sy)
    p = _libre_cerca(cx, cy, 2, ',".*a')
    if p:
        g[p[1]][p[0]] = 'i'
        LUG_CARTELES[f'{p[0]},{p[1]}'] = texto


def cartel_en(x, y, texto, r=3):
    p = _libre_cerca(x, y, r, ',".*a')
    if p:
        g[p[1]][p[0]] = 'i'
        LUG_CARTELES[f'{p[0]},{p[1]}'] = texto


# --- Valles: la Plaza Belgrano de San Salvador ---
def cartel_xy(x, y, texto):
    g[y][x] = 'i'
    LUG_CARTELES[f'{x},{y}'] = texto


for _i, _c in enumerate('QQGQQ'):                  # Casa de Gobierno: palacio de 5 casilleros con la torre al centro
    g[29][31 + _i] = _c
for _i, _c in enumerate('dDdd'):                    # Cabildo: galería de arcos con la torre del reloj
    g[5][37 + _i] = _c
g[5][36] = 'd'
for _i, _c in enumerate('JKJ'):                     # Catedral: fachada con torre y naves laterales
    g[5][32 + _i] = _c
cartel_xy(29, 29, 'La Casa de Gobierno de Jujuy: un palacio de estilo francés frente a la Plaza Belgrano, con su fuente al frente.')
cartel_xy(30, 5, 'Catedral Basílica de Jujuy, junto a la Plaza Belgrano. Guarda un púlpito colonial de madera dorada.')
cartel_xy(41, 5, 'El Cabildo de Jujuy, sobre la Plaza Belgrano: el viejo edificio colonial de la ciudad.')
cartel_xy(27, 9, 'Plaza Belgrano: en el centro, el monumento ecuestre al General Belgrano, entre cedros y palmeras.')
cartel_xy(21, 12, 'Centro Pokémon de la Plaza Belgrano ➜ ahí venden pokébolas.')
cartel_xy(22, 8, 'Parque San Martín: el gran pulmón verde de San Salvador de Jujuy.')
cartel_xy(36, 31, 'Río Xibi Xibi y su Paseo Lineal: el lugar favorito de los jujeños para caminar.')
cartel_xy(44, 12, 'Río Grande: rodea la capital por el norte y el este. Acá empiezan las Yungas.')
cartel_en(46, 50, 'Dique La Ciénaga: de acá viene el agua y la luz de los Valles.')
cartel_en(18, 70, 'Nevado del Chañi (6.200 m): la cumbre más alta de Jujuy.')
# --- Yungas ---
lugar(74, 6, 'W', 'Ingenio Ledesma: el azúcar de Libertador General San Martín, corazón de las Yungas.')
cartel_en(68, 44, 'Lagunas de Yala: lagos de montaña en plena Yunga, a 40 minutos de la capital.')
cartel_en(84, 14, 'Parque Nacional Calilegua: selva de yungas con tucanes, tapires y yaguaretés.')
cartel_en(66, 62, 'Cañaverales de Ledesma: acá nace el azúcar jujeño.')
# --- Quebrada ---
cartel_xy(136, 56, 'Iglesia de Santa Rosa de Lima, Purmamarca (1648), frente a la plaza. Al fondo, el Cerro de los Siete Colores.')
cartel_xy(133, 56, 'Cabildo de Purmamarca, sobre la plaza. Alrededor, el mercado de artesanías.')
cartel_en(121, 9, 'Tilcara: pueblo de la Quebrada de Humahuaca, Patrimonio de la Humanidad.')
cartel_en(119, 18, 'Pucará de Tilcara: ciudadela preincaica de piedra sobre la Quebrada.')
cartel_en(131, 63, 'Cerro de los Siete Colores, Purmamarca. Las franjas son millones de años de historia.')
cerro(127, 45, 5, 5, 'M', 12)                      # La Paleta del Pintor (Maimará)
cartel_en(124, 49, 'La Paleta del Pintor, Maimará: la montaña pintada de mil colores.')
cartel_en(141, 72, 'Salinas Grandes: un desierto de sal a más de 3.400 m de altura.')

# (el Tren Solar con su vía este-oeste se coloca más abajo, después de las fronteras)
# --- Alta Quebrada ---
lugar(186, 6, 'D', 'Cabildo de Humahuaca: a las 12 sale San Francisco Solano a bendecir el pueblo.')
lugar(188, 6, 'O', 'Monumento a la Independencia, Humahuaca: sube la escalinata y mirá todo el valle.')
cartel_en(200, 66, 'Serranía del Hornocal: los 14 colores, a más de 4.300 m de altura.')
cartel_en(181, 44, 'Coctaca: gigantescos andenes de cultivo preincaicos cerca de Humahuaca.')
# --- Puna ---
cartel_en(240, 8, 'Abra Pampa: la ciudad más alta de Jujuy, entre llamas y vicuñas.')
cartel_en(231, 51, 'Laguna de los Pozuelos: reserva de flamencos rosados en plena Puna.')
cartel_en(232, 68, 'Salinas Grandes: un mar blanco de sal.')
cartel_en(253, 33, 'Parque Solar Cauchari: uno de los más grandes de Sudamérica, a 4.000 m.')
# --- Puna norte ---
lugar(283, 38, 'I', 'Iglesia de San Francisco de Yavi (1690): capilla colonial con altar de pan de oro.', 286, 38)
cartel_en(294, 8, 'La Quiaca: el último pueblo de Argentina, frente a Villazón (Bolivia).')

# llamas (Quebrada, Puna) y flamencos (Pozuelos)
for _cant, _a, _b, _sem in [(3, 113, 146, 700), (4, 167, 210, 701), (8, 221, 264, 702), (6, 275, 318, 703)]:
    for (_x, _y) in repartir(_a, _b, _cant, _sem, sobre=',"'):
        g[_y][_x] = 'j'
# ============================ FRONTERAS ============================
# Alternan puente/desfiladero: río, cordillera, estrecho, desfiladero2, río3.
RIOS  = [RIO, RIO2, RIO3]
CORDS = [CORD, CORD2]
for rio in RIOS:
    R(rio[0], 1, rio[1], H - 2, '~')
    R(rio[0] - 1, 1, rio[0] - 1, H - 2, 'a')
    R(rio[1] + 1, 1, rio[1] + 1, H - 2, 'a')
    R(rio[0], PASO_Y, rio[1], PASO_Y + 1, 'B')          # el puente
for cord in CORDS:
    R(cord[0], 1, cord[1], H - 2, '^')
    R(cord[0], PASO_Y, cord[1], PASO_Y + 1, '.')        # el desfiladero

for cruce in RIOS + CORDS:
    g[PASO_Y - 1][cruce[0] - 2] = 'T'; g[PASO_Y + 2][cruce[0] - 2] = 'i'
    g[PASO_Y - 1][cruce[1] + 2] = 'T'; g[PASO_Y + 2][cruce[1] + 2] = 'i'

# ============================ TREN SOLAR: VÍA ESTE-OESTE POR LAS 6 REGIONES ============================
# Sale de la 1ª región (San Salvador) y va de izquierda a derecha por todas, cruzando los ríos por los puentes y las
# cordilleras por los desfiladeros (comparte la fila del paso: PASO_Y+1). Una estación por región, al sur de la vía.
TREN_Y = PASO_Y + 1
TREN_ESTACIONES = [('San Salvador', 30), ('Volcán', 84), ('Purmamarca', 134), ('Humahuaca', 188), ('Abra Pampa', 244), ('La Quiaca', 298)]
for _x in range(2, W - 2):
    if g[TREN_Y][_x] == '~':
        g[TREN_Y][_x] = 'B'
    elif g[TREN_Y][_x] != 'B':
        g[TREN_Y][_x] = 'v'
for _n, _x in TREN_ESTACIONES:
    g[TREN_Y + 1][_x] = 'Y'
    cartel_xy(_x + 1, TREN_Y + 1, f'Estación {_n} del Tren Solar: el tren eléctrico alimentado con paneles solares va de oeste a este por todas las regiones.')

# ============================ CUEVAS Y ALTARES ============================
CENTROS = [(22, 12), (65, 7), (117, 7), (182, 7), (236, 7), (290, 7)]     # la puerta 'P' de cada Centro
CUEVAS  = [(16, 67), (97, 61), (134, 51), (183, 68), (225, 68), (305, 22)]

# Cada altar va en el bioma de SUS legendarios (Moltres en el volcán, Zapdos en
# el campo eléctrico, Articuno en la nieve...). Las coordenadas NO se eligen a
# mano: colocar_altares() las busca respetando bioma, distancia mínima y que
# haya tierra alrededor para la losa. Los legendarios "de cueva" (tipo dark o
# fighting: no tienen bioma propio a cielo abierto) van directo en
# ADV_MAPS.cueva.santuariosPorRegion en app.js, no acá.
PEDIDOS = [
    # región, bioma, nombre, legendarios, zona preferida (centro temático)
    ('kanto', 'N',  'Cumbre Nevada del Chañi', ['Articuno'],                  (19, 72)),
    ('kanto', 'e',  'Usina del Dique',     ['Zapdos'],                          (45, 52)),
    ('kanto', 'F',  'Cerro Colorado',      ['Moltres'],                         (45, 76)),
    ('kanto', '"',  'Parque San Martín',   ['Mew'],                             (9, 7)),
    ('johto', 'F',  'Altos Hornos de Zapla', ['Entei', 'Ho-Oh'],                (80, 30)),
    ('johto', 'e',  'Usina del Ingenio',   ['Raikou'],                          (99, 53)),
    ('johto', '"',  'Lagunas de Yala',     ['Lugia', 'Suicune'],                (66, 49)),
    ('hoenn', 'F',  'Cerro de los Siete Colores', ['Groudon'],                  (127, 77)),
    ('hoenn', 'u',  'Pucará de Tilcara',   ['Latios', 'Latias', 'Rayquaza'],    (116, 16)),
    ('hoenn', ',"', 'Costa del Río Grande', ['Kyogre'],                         (146, 28)),
    ('sinnoh', 'u', 'Ruinas de Coctaca',   ['Uxie', 'Mesprit', 'Azelf'],        (178, 45)),
    ('sinnoh', 'F', 'Serranía del Hornocal', ['Heatran'],                       (205, 72)),
    ('sinnoh', 'N', 'Nevado de Aguilar',   ['Cresselia'],                       (184, 73)),
    ('sinnoh', ',"a', 'Remanso de Uquía',  ['Manaphy'],                         (172, 35)),
    ('sinnoh', '"', 'Cardonal de Humahuaca', ['Shaymin'],                       (170, 55)),
    ('unova', 'u',  'Pucará de Rinconada', ['Victini'],                         (228, 40)),
    ('unova', ',"a', 'Laguna de los Pozuelos', ['Keldeo'],                      (230, 55)),
    ('unova', 'e',  'Parque Solar Cauchari', ['Tornadus', 'Thundurus', 'Landorus'], (255, 30)),
    ('unova', 'F',  'Volcán de la Puna',   ['Reshiram', 'Zekrom', 'Kyurem'],    (258, 70)),
    ('unova', 'N',  'Salinas Grandes',     ['Cobalion', 'Terrakion', 'Virizion'], (232, 73)),
    ('unova', '"',  'Pajonales de Abra Pampa', ['Meloetta'],                    (243, 20)),
    ('kalos', '"',  'Altos de Yavi',       ['Xerneas'],                         (280, 20)),
    ('kalos', 'u',  'Iglesia y ruinas de Yavi', ['Hoopa'],                      (283, 42)),
    ('kalos', 'F',  'Cerro Colorado de La Quiaca', ['Zygarde', 'Diancie', 'Volcanion'], (305, 68)),
]

for (x, y) in CUEVAS:
    g[y][x] = 'C'

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
g[19][33] = '@'
_fl = [(x, y) for y in range(46, 64) for x in range(220, 245) if g[y][x] == 'a']
_fl.sort(key=lambda p: ruido(p[0], p[1], 710))
_pos = []
for _p in _fl:
    if all(abs(_p[0] - q[0]) + abs(_p[1] - q[1]) >= 3 for q in _pos):
        _pos.append(_p)
    if len(_pos) == 9:
        break
for (_x, _y) in _pos:
    g[_y][_x] = 'f'


FRANJAS = [(2, 49), (59, 103), (113, 147), (167, 211), (221, 265), (275, 319)]
BOLAS = [p for i, (a, b) in enumerate(FRANJAS) for p in repartir(a, b, 6, 400 + i)]
# monedas sueltas por el piso, repartidas por las seis regiones
MONEDAS = [p for i, (a, b) in enumerate(FRANJAS) for p in repartir(a, b, 6, 500 + i)]
for (x, y) in BOLAS:
    if g[y][x] in ',*"a.emuNF':
        g[y][x] = 'b'
for (x, y) in MONEDAS:
    if g[y][x] in ',*"a.emuNF':
        g[y][x] = 'c'

# ============================ VALIDACIÓN ============================
CAM = set('.,@*"aBFCPbckoLEeumNZv') - set('Z')       # Z (montaña nevada) NO se camina
problemas = []


def bfs(bloquear=()):
    ini = (33, 19)
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


REGIONES = ['kanto', 'johto', 'hoenn', 'sinnoh', 'unova', 'kalos']
# columna a partir de la cual empieza cada frontera (la región de la izquierda
# termina ahí); la última región no tiene techo.
CORTES = [RIO[0], CORD[0], RIO2[0], CORD2[0], RIO3[0], W]


def region(x):
    for corte, nombre in zip(CORTES, REGIONES):
        if x < corte:
            return nombre
    return REGIONES[-1]


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
print('  bioma      ' + ''.join(f'{r:>9}' for r in REGIONES))
for nombre, ch in BIOMAS.items():
    fila = []
    for r in REGIONES:
        n = sum(1 for (x, y) in vis if region(x) == r and g[y][x] == ch)
        fila.append(n)
        if n == 0:
            problemas.append(f'bioma {nombre} sin casilleros accesibles en {r}')
    print(f'  {nombre:10}' + ''.join(f'{n:>9}' for n in fila))

# 5. cruce único: bloqueando CADA cruce, todo lo que queda del otro lado tiene
# que dejar de ser alcanzable.
CRUCES = [(RIO, 'johto'), (CORD, 'hoenn'), (RIO2, 'sinnoh'), (CORD2, 'unova'), (RIO3, 'kalos')]
for cruce, del_otro_lado in CRUCES:
    bloqueo = {(x, y) for y in (PASO_Y, PASO_Y + 1) for x in range(cruce[0], cruce[1] + 1)}
    if any(region(x) == del_otro_lado for (x, y) in bfs(bloquear=bloqueo)):
        problemas.append(f'se llega a {del_otro_lado} sin cruzar en {cruce}')
print('  cruce único: OK en los 5 cruces' if not any('se llega a' in p for p in problemas) else '')

print('\nPROBLEMAS:', '\n  - '.join([''] + problemas) if problemas else 'ninguno')

# ============================ SALIDA ============================
open('mundo4.txt', 'w').write('\n'.join(''.join(r) for r in g))

zonas = [
    {'n': 'Puente del Río Grande',   'x0': RIO[0] - 2, 'y0': 1, 'x1': RIO[1] + 2, 'y1': H - 2},
    {'n': 'Cuesta de Zenta',         'x0': CORD[0] - 2, 'y0': 1, 'x1': CORD[1] + 2, 'y1': H - 2},
    {'n': 'Río Grande de la Quebrada', 'x0': RIO2[0] - 2, 'y0': 1, 'x1': RIO2[1] + 2, 'y1': H - 2},
    {'n': 'Cuesta de Azul Pampa',    'x0': CORD2[0] - 2, 'y0': 1, 'x1': CORD2[1] + 2, 'y1': H - 2},
    {'n': 'Puente del Río Yavi',     'x0': RIO3[0] - 2, 'y0': 1, 'x1': RIO3[1] + 2, 'y1': H - 2},
    {'n': 'Valles · Plaza Belgrano', 'x0': 1, 'y0': 1, 'x1': 50, 'y1': 12},
    {'n': 'Valles · San Salvador',   'x0': 1, 'y0': 13, 'x1': 30, 'y1': 44},
    {'n': 'Valles · Parque San Martín', 'x0': 31, 'y0': 13, 'x1': 50, 'y1': 44},
    {'n': 'Valles · Usina del Dique', 'x0': 31, 'y0': 45, 'x1': 50, 'y1': 58},
    {'n': 'Valles · Cerros del Oeste', 'x0': 1, 'y0': 45, 'x1': 30, 'y1': 66},
    {'n': 'Valles · Bañado del Río Grande', 'x0': 31, 'y0': 59, 'x1': 50, 'y1': 68},
    {'n': 'Valles · Cordón del Chañi', 'x0': 1, 'y0': 67, 'x1': 30, 'y1': H - 2},
    {'n': 'Valles · Cerro Colorado', 'x0': 31, 'y0': 69, 'x1': 50, 'y1': H - 2},
    {'n': 'Yungas · Libertador General San Martín', 'x0': 58, 'y0': 1, 'x1': 104, 'y1': 16},
    {'n': 'Yungas · Selva de Calilegua', 'x0': 84, 'y0': 17, 'x1': 104, 'y1': 34},
    {'n': 'Yungas · Lagunas de Yala', 'x0': 58, 'y0': 17, 'x1': 83, 'y1': 55},
    {'n': 'Yungas · Usina del Ingenio', 'x0': 84, 'y0': 35, 'x1': 104, 'y1': 58},
    {'n': 'Yungas · Cañaverales de Ledesma', 'x0': 58, 'y0': 56, 'x1': 83, 'y1': H - 2},
    {'n': 'Yungas · Bañados', 'x0': 84, 'y0': 59, 'x1': 104, 'y1': H - 2},
    {'n': 'Quebrada · Tilcara',      'x0': 112, 'y0': 1, 'x1': 158, 'y1': 16},
    {'n': 'Quebrada · Monte de Churquis', 'x0': 112, 'y0': 17, 'x1': 145, 'y1': 30},
    {'n': 'Quebrada · Río Grande',   'x0': 146, 'y0': 17, 'x1': 158, 'y1': H - 2},
    {'n': 'Quebrada · Vega de Maimará', 'x0': 112, 'y0': 31, 'x1': 129, 'y1': 55},
    {'n': 'Quebrada · Parque Solar', 'x0': 130, 'y0': 31, 'x1': 145, 'y1': 55},
    {'n': 'Quebrada · Purmamarca y los Siete Colores', 'x0': 112, 'y0': 56, 'x1': 145, 'y1': H - 2},
    {'n': 'Alta Quebrada · Humahuaca', 'x0': 166, 'y0': 1, 'x1': 212, 'y1': 12},
    {'n': 'Alta Quebrada · Valle de Cardones',   'x0': 166, 'y0': 13, 'x1': 212, 'y1': 26},
    {'n': 'Alta Quebrada · Cardonal', 'x0': 166, 'y0': 27, 'x1': 183, 'y1': 58},
    {'n': 'Alta Quebrada · Ruinas de Coctaca', 'x0': 184, 'y0': 27, 'x1': 212, 'y1': 40},
    {'n': 'Alta Quebrada · Vega de Iruya', 'x0': 184, 'y0': 41, 'x1': 212, 'y1': 65},
    {'n': 'Alta Quebrada · Serranía del Hornocal', 'x0': 166, 'y0': 66, 'x1': 212, 'y1': H - 2},
    {'n': 'Puna · Abra Pampa',       'x0': 220, 'y0': 1, 'x1': 266, 'y1': 12},
    {'n': 'Puna · Pajonales',        'x0': 220, 'y0': 13, 'x1': 266, 'y1': 26},
    {'n': 'Puna · Pucará',           'x0': 220, 'y0': 27, 'x1': 237, 'y1': 58},
    {'n': 'Puna · Parque Solar Cauchari', 'x0': 238, 'y0': 27, 'x1': 266, 'y1': 40},
    {'n': 'Puna · Vegas',            'x0': 238, 'y0': 41, 'x1': 266, 'y1': 65},
    {'n': 'Puna · Salinas Grandes',  'x0': 220, 'y0': 66, 'x1': 266, 'y1': H - 2},
    {'n': 'Puna norte · La Quiaca',  'x0': 274, 'y0': 1, 'x1': 320, 'y1': 12},
    {'n': 'Puna norte · Altos de Yavi', 'x0': 274, 'y0': 13, 'x1': 320, 'y1': 26},
    {'n': 'Puna norte · Yavi',       'x0': 274, 'y0': 27, 'x1': 291, 'y1': 58},
    {'n': 'Puna norte · Parque Solar', 'x0': 292, 'y0': 27, 'x1': 320, 'y1': 45},
    {'n': 'Puna norte · Vegas',      'x0': 292, 'y0': 46, 'x1': 320, 'y1': 58},
    {'n': 'Puna norte · Cerro Colorado', 'x0': 274, 'y0': 59, 'x1': 320, 'y1': H - 2},
]

carteles = {
    f'{RIO[0]-2},{PASO_Y+2}': 'El puente cruza el Río Grande hacia las YUNGAS. Es el único paso: el río no se cruza a nado.',
    f'{RIO[1]+2},{PASO_Y+2}': 'Bienvenido a las YUNGAS. San Salvador queda al oeste, cruzando el puente.',
    f'{CORD[0]-2},{PASO_Y+2}': 'La cuesta lleva a la QUEBRADA. Es el único paso por la cordillera.',
    f'{CORD[1]+2},{PASO_Y+2}': 'Bienvenido a la QUEBRADA. Las Yungas quedan al oeste, cruzando la cuesta.',
    f'{RIO2[0]-2},{PASO_Y+2}': 'El puente cruza el Río Grande hacia la ALTA QUEBRADA. Es el único paso.',
    f'{RIO2[1]+2},{PASO_Y+2}': 'Bienvenido a la ALTA QUEBRADA, camino a Humahuaca. Purmamarca queda al oeste.',
    f'{CORD2[0]-2},{PASO_Y+2}': 'La cuesta de Azul Pampa lleva a la PUNA. Es el único paso por la cordillera.',
    f'{CORD2[1]+2},{PASO_Y+2}': 'Bienvenido a la PUNA. Aquí el aire es fino y el cielo muy azul. Humahuaca queda al oeste.',
    f'{RIO3[0]-2},{PASO_Y+2}': 'El puente cruza a la PUNA NORTE, hacia La Quiaca. Es el único paso.',
    f'{RIO3[1]+2},{PASO_Y+2}': 'Bienvenido a la PUNA NORTE: La Quiaca y Yavi. Abra Pampa queda al oeste.',
}

def _nombre_altar(x, y, n):
    """Si el altar quedó lejos del lugar que le tocaba, se nombra por la zona donde está."""
    pref = next(p[4] for p in PEDIDOS if p[2] == n)
    if math.hypot(x - pref[0], y - pref[1]) <= 8:
        return n
    for z in zonas:
        if z['x0'] <= x <= z['x1'] and z['y0'] <= y <= z['y1'] and ' · ' in z['n']:
            return z['n'].split(' · ')[1]
    return n


carteles.update(LUG_CARTELES)

santuarios = {f'{x},{y}': {'n': _nombre_altar(x, y, n), 'pokes': pokes} for (x, y), n, pokes in ALTARES}

json.dump({
    'cols': W, 'filas': H,
    'rio': RIO, 'cord': CORD, 'pasoY': PASO_Y,
    'fronteras': [{'hasta': (RIO[0] + RIO[1]) // 2, 'region': 'kanto'},
                  {'hasta': (CORD[0] + CORD[1]) // 2, 'region': 'johto'},
                  {'hasta': (RIO2[0] + RIO2[1]) // 2, 'region': 'hoenn'},
                  {'hasta': (CORD2[0] + CORD2[1]) // 2, 'region': 'sinnoh'},
                  {'hasta': (RIO3[0] + RIO3[1]) // 2, 'region': 'unova'},
                  {'hasta': 9999, 'region': 'kalos'}],
    'zonas': zonas, 'carteles': carteles, 'santuarios': santuarios,
    'centros': CENTROS, 'cuevas': CUEVAS,
    # Inicial de cada región para el minimapa: una letra que no se repita,
    # centrada en la mitad de SU franja (no de todo el mapa).
    'letras': list(zip(['V', 'Y', 'Q', 'H', 'P', 'L'],
                       [(1 + RIO[0] - 1) // 2, (RIO[1] + 1 + CORD[0] - 1) // 2,
                        (CORD[1] + 1 + RIO2[0] - 1) // 2, (RIO2[1] + 1 + CORD2[0] - 1) // 2,
                        (CORD2[1] + 1 + RIO3[0] - 1) // 2, (RIO3[1] + 1 + W - 1) // 2])),
}, open('mundo4.json', 'w'), ensure_ascii=False, indent=1)
print('escrito mundo4.txt y mundo4.json')
