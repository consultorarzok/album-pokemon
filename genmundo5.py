"""Mundo Pokémon v5 · agrega una 7ª región (ALOLA) AL SUR del mapa de Jujuy, sin mover nada de lo que ya existe.
Parte de mundo4.txt/mundo4.json (322x120) y le agrega 60 filas abajo (y 120-179): el Valle de los Pericos
(San Pedro de Jujuy, Termas de Reyes, cañaverales y el río San Francisco), conectado con Valles por un camino
que sale del borde sur de San Salvador. Todo lo que está a la derecha del bloque son montañas.
Salida: mundo5.txt y mundo5.json (mismo formato que v4), que consume aplicar_mundo5.py.
El validador corta si algo no se alcanza a pie desde el spawn, si un altar no tiene 5x5 de tierra o si
hay dos altares a menos de 22 casilleros."""
import io
import json
import math
from collections import deque

base = io.open('mundo4.txt', encoding='utf-8').read().split('\n')
meta = json.load(io.open('mundo4.json', encoding='utf-8'))
W, H0, H = 322, 120, 180
Y0 = H0                      # primera fila nueva
XM = 53                      # el bloque ocupa x 1..52
g = [list(r) for r in base] + [[',' for _ in range(W)] for _ in range(H - H0)]
assert len(g[0]) == W and len(base) == H0
PROT = set()


def ruido(x, y, n=0):
    s = math.sin(x * 127.1 + y * 311.7 + n * 74.7) * 43758.5453
    return s - math.floor(s)


def R(x0, y0, x1, y1, ch):
    for y in range(max(Y0 - 1, y0), min(H - 2, y1) + 1):
        for x in range(max(1, x0), min(XM - 1, x1) + 1):
            if (x, y) not in PROT:
                g[y][x] = ch


def mancha(cx, cy, rx, ry, ch, n=0, solo=',"'):
    for y in range(int(cy - ry - 1), int(cy + ry + 2)):
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            if not (1 <= x < XM and Y0 <= y < H - 1) or (x, y) in PROT or g[y][x] not in solo:
                continue
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d <= 1 - .2 + ruido(x, y, n) * .35:
                g[y][x] = ch


def camino(x0, y0, x1, y1, ancho=3):
    """Camino de piedra recto (horizontal o vertical), con `ancho` casilleros."""
    horiz = y0 == y1
    for y in range(min(y0, y1), max(y0, y1) + 1):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            for d in range(ancho):
                xx, yy = (x, y + d) if horiz else (x + d, y)
                if 1 <= xx < XM and 0 <= yy < H - 1 and g[yy][xx] not in 'BCPpqrL':
                    g[yy][xx] = '.'
                    PROT.add((xx, yy))


# ---------------- terreno base ----------------
for y in range(Y0, H):
    for x in range(W):
        if y == H - 1 or x == 0 or x >= XM:
            g[y][x] = '^' if x >= XM + 1 else '#'
        elif x == XM:
            g[y][x] = '^'
for y in range(Y0, H - 1):                         # monte de borde a los costados del valle
    for x in list(range(1, 4)) + list(range(XM - 3, XM)):
        if ruido(x, y, 3) > .55:
            g[y][x] = '#'
for x in range(1, XM):                             # y abajo de todo
    for y in range(H - 4, H - 1):
        if ruido(x, y, 4) > .5:
            g[y][x] = '#'

# hierba alta (encuentros de hierba) y flores
for cx, cy, rx, ry, n in [(12, 132, 8, 5, 1), (40, 134, 9, 6, 2), (13, 152, 9, 6, 3), (40, 153, 9, 6, 4),
                          (25, 163, 13, 5, 5), (8, 146, 5, 3, 6), (46, 146, 5, 3, 7)]:
    mancha(cx, cy, rx, ry, '"', n)
for y in range(Y0, H - 1):
    for x in range(4, XM - 3):
        if g[y][x] == ',' and ruido(x, y, 8) > .965:
            g[y][x] = '*'

# ---------------- río San Francisco (cruza todo el valle de lado a lado, sólo se pasa por el puente) ----------------
RIO_Y = (141, 144)
for x in range(1, XM):
    for y in range(RIO_Y[0] - 1, RIO_Y[1] + 2):
        PROT.discard((x, y))
        g[y][x] = 'a' if y in (RIO_Y[0] - 1, RIO_Y[1] + 1) else '~'
PUENTE = (24, 26)
for x in range(PUENTE[0], PUENTE[1] + 1):
    for y in range(RIO_Y[0] - 1, RIO_Y[1] + 2):
        g[y][x] = 'B'

# ---------------- caminos ----------------
# puerta sur de San Salvador: se abre el borde y se baja hasta el puente
for x in range(24, 27):
    g[H0 - 1][x] = '.'
camino(24, H0 - 3, 24, RIO_Y[0] - 2)               # vertical de 3 de ancho (x 24-26)
camino(10, 136, 44, 136)                           # calle del pueblo (este-oeste), y 136-138
camino(24, RIO_Y[1] + 2, 24, 176)                  # sigue al sur del río hasta la cueva
camino(10, 160, 42, 160)                           # calle sur (y 160-162)
camino(10, 128, 10, 135, 2)                        # baja de los altares del norte a la calle
camino(42, 131, 42, 135, 2)
camino(10, 163, 10, 163, 1)

# ---------------- pueblo: San Pedro de Jujuy (Centro Pokémon + casas) ----------------
g[Y0 + 4][22], g[Y0 + 4][23] = 'p', 'q'            # Centro: techo (y124) y puerta (y125) pegado al camino
g[Y0 + 5][22], g[Y0 + 5][23] = 'P', 'r'
for y in (Y0 + 4, Y0 + 5):
    PROT.update({(22, y), (23, y)})
g[Y0 + 6][22] = '.'
g[Y0 + 6][23] = '.'
for (x, y) in [(30, 123), (33, 123), (36, 123), (30, 127), (33, 127), (36, 127), (14, 123), (17, 123), (14, 127), (17, 127),
               (30, 132), (34, 132), (14, 132), (18, 132)]:
    if g[y][x] in ',"*' and (x, y) not in PROT:
        g[y][x] = 'H'
for (x, y) in [(28, 123), (28, 127), (20, 123), (20, 127), (28, 132), (21, 132), (23, 141 - 3)]:
    if g[y][x] in ',"*' and (x, y) not in PROT:
        g[y][x] = 'n'                              # palmeras

# ---------------- Termas de Reyes (agua caliente + tierra ardiente), esquina nordeste ----------------
R(43, 121, 50, 128, ',')
mancha(46.5, 124.5, 4, 3.4, '%', 11, solo=',"*')
R(45, 124, 47, 125, '~')
for x in range(44, 49):
    for y in (123, 126):
        if g[y][x] in ',%':
            g[y][x] = 'a'
# ---------------- cañaverales de San Pedro: la hierba más alta, algunos '#' como cañas ----------------
for y in range(Y0 + 6, 139):
    for x in range(36, 51):
        if g[y][x] == '"' and ruido(x, y, 12) > .8:
            g[y][x] = '#'
# ---------------- ciénaga de Los Pericos ----------------
mancha(18, 154, 4, 2.6, 'm', 13, solo=',"*')
mancha(34, 150, 3.4, 2.6, 'm', 14, solo=',"*')
# ---------------- Usina del río Reyes (campo eléctrico) y Ruinas del Pucará (psíquico) ----------------
mancha(11, 166, 5, 3.4, 'e', 15, solo=',"*')
mancha(42, 169, 5, 3.4, 'u', 16, solo=',"*')

# ---------------- altares (5x5 de tierra y la losa 'L' en el medio) ----------------
ALTARES = {
    (10, 127): ('Termas de Reyes', ['Tapu Fini']),
    (42, 130): ('Cañaverales de San Pedro', ['Tapu Bulu']),
    (10, 167): ('Usina del río Reyes', ['Tapu Koko']),
    (42, 172): ('Ruinas del Pucará de Perico', ['Tapu Lele']),
}
for (ax, ay) in ALTARES:
    for y in range(ay - 2, ay + 3):
        for x in range(ax - 2, ax + 3):
            if g[y][x] in '~a%mHn#"*' or g[y][x] == ',':
                g[y][x] = ','
    g[ay][ax] = 'L'
    PROT.add((ax, ay))

# ---------------- cueva ----------------
CUEVA = (24, 176)
for y in range(174, 178):
    for x in range(21, 29):
        g[y][x] = ','
g[CUEVA[1]][CUEVA[0]] = 'C'
PROT.add(CUEVA)

# ---------------- carteles, objetos del piso, zonas ----------------
carteles, zonas = {}, []
cartel_pos = [
    ((27, H0 + 1), 'Camino al sur: el Valle de los Pericos. San Pedro, las Termas de Reyes y los cañaverales te esperan en ALOLA.'),
    ((21, 128), 'San Pedro de Jujuy. El Centro Pokémon está acá nomás.'),
    ((27, 140), 'Río San Francisco: se cruza por el puente. El río no se pasa a nado.'),
    ((46, 120 + 1), 'Termas de Reyes: aguas calientes que brotan del cerro. Dicen que acá salen Pokémon de fuego.'),
]
for (x, y), txt in cartel_pos:
    g[y][x] = 'i'
    PROT.add((x, y))
    carteles['%d,%d' % (x, y)] = txt
# cartel en el borde sur de Valles, al lado de la puerta
g[H0 - 2][28] = 'i'
carteles['28,%d' % (H0 - 2)] = 'Al sur: el Valle de los Pericos (ALOLA). Se llega bajando por este camino.'

# Pokébolas ('b') y monedas ('c') en el piso, sólo sobre tierra suelta
libres = [(x, y) for y in range(Y0 + 2, H - 4) for x in range(5, XM - 3) if g[y][x] == ',' and (x, y) not in PROT]
puestos = []
for k, (x, y) in enumerate(sorted(libres, key=lambda p: ruido(p[0], p[1], 21))):
    if all(max(abs(x - a), abs(y - b)) >= 9 for a, b in puestos):
        g[y][x] = 'c' if len(puestos) in (3, 8) else 'b'   # pocas monedas: el total del piso tiene que seguir por debajo de 2 sobres
        puestos.append((x, y))
    if len(puestos) >= 10:
        break

zonas = [
    {'n': 'Alola · Termas de Reyes', 'x0': 42, 'y0': 120, 'x1': 52, 'y1': 128},
    {'n': 'Alola · Puente del río San Francisco', 'x0': 22, 'y0': 139, 'x1': 28, 'y1': 146},
    {'n': 'Alola · Río San Francisco', 'x0': 1, 'y0': 139, 'x1': 52, 'y1': 146},
    {'n': 'Alola · San Pedro de Jujuy', 'x0': 12, 'y0': 120, 'x1': 41, 'y1': 138},
    {'n': 'Alola · Cañaverales', 'x0': 36, 'y0': 129, 'x1': 52, 'y1': 138},
    {'n': 'Alola · Usina del río Reyes', 'x0': 1, 'y0': 158, 'x1': 18, 'y1': 175},
    {'n': 'Alola · Ruinas del Pucará de Perico', 'x0': 34, 'y0': 160, 'x1': 52, 'y1': 177},
    {'n': 'Alola · Ciénaga de Los Pericos', 'x0': 12, 'y0': 147, 'x1': 40, 'y1': 157},
    {'n': 'Alola · Valle de los Pericos', 'x0': 1, 'y0': 120, 'x1': 52, 'y1': 178},
]

# ---------------- validación ----------------
CAMINABLES = set('.,@*aB"bF%CPokLENeumcvw')
filas = [''.join(r) for r in g]
assert len(filas) == H and all(len(f) == W for f in filas)


def alcanzables(sx, sy):
    vis = {(sx, sy)}
    q = deque([(sx, sy)])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in vis and filas[ny][nx] in CAMINABLES:
                vis.add((nx, ny))
                q.append((nx, ny))
    return vis


sp = [(r.index('@'), y) for y, r in enumerate(filas) if '@' in r][0]
vis = alcanzables(*sp)
errores = []
for y in range(Y0, H):
    for x in range(W):
        ch = filas[y][x]
        if ch in 'bcLCP' and (x, y) not in vis:
            errores.append('no se llega a %s en %d,%d' % (ch, x, y))
        if ch == 'i':
            if not any((x + dx, y + dy) in vis for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                errores.append('cartel inalcanzable %d,%d' % (x, y))
for (ax, ay) in ALTARES:
    for y in range(ay - 2, ay + 3):
        for x in range(ax - 2, ax + 3):
            if filas[y][x] not in CAMINABLES:
                errores.append('altar %d,%d sin tierra en %d,%d (%s)' % (ax, ay, x, y, filas[y][x]))
altares_todos = [tuple(map(int, k.split(','))) for k in meta['santuarios']] + list(ALTARES)
for a in ALTARES:
    for b in altares_todos:
        if a != b and max(abs(a[0] - b[0]), abs(a[1] - b[1])) < 22:
            errores.append('altares muy juntos %s %s' % (a, b))
# todo lo del mapa viejo sigue alcanzable (no se rompió nada)
vis_viejo = {p for p in vis if p[1] < H0}
for y in range(H0):
    for x in range(W):
        if base[y][x] in 'bcLCP' and (x, y) not in vis:
            errores.append('el mapa viejo perdió acceso a %s en %d,%d' % (base[y][x], x, y))
# el bloque nuevo sólo se alcanza por la puerta (y=119, x 24-26)
if errores:
    print('\n'.join(errores[:40]))
    print('\n'.join(''.join(filas[y][14:40]) for y in range(112,134)));raise SystemExit('VALIDACIÓN FALLÓ (%d errores)' % len(errores))

io.open('mundo5.txt', 'w', encoding='utf-8').write('\n'.join(filas))
sant = dict(meta['santuarios'])
for (x, y), (n, pk) in ALTARES.items():
    sant['%d,%d' % (x, y)] = {'n': n, 'pokes': pk}
out = dict(meta)
out.update({'filas': H, 'zonas': meta['zonas'] + zonas, 'carteles': dict(meta['carteles'], **carteles), 'santuarios': sant,
            'centros': meta['centros'] + [[22, Y0 + 5]], 'cuevas': meta['cuevas'] + [list(CUEVA)]})
json.dump(out, io.open('mundo5.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('OK mundo5: %dx%d, %d altares, %d carteles, %d objetos, alcanzables nuevos: %d' % (
    W, H, len(sant), len(carteles), len(puestos), len([p for p in vis if p[1] >= H0])))
