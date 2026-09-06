"""Mundo Pokémon v2: tres regiones grandes y SEPARADAS, unidas por un único
paso con carteles. El agua no se camina."""
import math
from collections import deque

W, H = 120, 60
g = [[',' for _ in range(W)] for _ in range(H)]

# fronteras (columnas): Kanto | río | Johto | cordillera | Hoenn
RIO      = (38, 44)
CORD     = (82, 88)
PASO_Y   = 30          # única fila por la que se cruza cada frontera

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
                if 0 < y0 + k < H - 1: g[y0 + k][x] = ch
        for y in range(min(y0, y1), max(y0, y1) + 1):
            for k in range(ancho):
                if 0 < x1 + k < W - 1: g[y][x1 + k] = ch

# ===================== KANTO =====================
mancha(24, 20, 13, 9, '"', 1)                     # pradera alta
mancha(9, 45, 9, 10, '#', 2)                      # bosque
mancha(9, 45, 7, 8, '"', 3)
mancha(30, 40, 7, 5, '~', 4)                      # laguna
R(20, 48, 36, 56, '^')                            # sierra del sur
mancha(16, 14, 5, 3, '*', 5)
R(3, 3, 13, 9, '.')                               # pueblo Paleta
camino([(7, 9), (7, 30), (44, 30)])               # ruta principal al puente
camino([(7, 20), (30, 20)])
camino([(24, 30), (24, 47)])                      # bajada a la sierra

# ===================== JOHTO =====================
mancha(70, 8, 12, 6, '#', 6)                      # bosque de cerezos
mancha(70, 8, 10, 4, '"', 7)
mancha(64, 33, 11, 8, '~', 8)                     # lago Espejo
mancha(52, 47, 10, 7, '"', 9)                     # pastizal
R(50, 18, 60, 20, '*')
R(47, 3, 57, 9, '.')                              # villa Cerezo
R(70, 46, 80, 54, '^')                            # montañas del sudeste
camino([(51, 9), (51, 30), (88, 30)])             # ruta principal hacia el paso
camino([(45, 30), (51, 30)])
camino([(51, 20), (70, 20)])
camino([(51, 40), (74, 40), (74, 45)])

# ===================== HOENN =====================
mancha(98, 20, 11, 8, '"', 10)                    # selva
R(108, 8, 118, 56, '~')                           # mar
mancha(104, 34, 8, 12, '~', 11)
mancha(114, 22, 3, 2, ',', 12)                    # isla
mancha(99, 47, 10, 7, 'F', 13)                    # campo de ceniza
mancha(99, 47, 5, 4, 'V', 14)                     # volcán
R(91, 3, 101, 9, '.')                             # puerto
R(100, 36, 107, 42, '^')                          # cerro con cueva
camino([(95, 9), (95, 30), (89, 30)])             # ruta principal al paso
camino([(95, 20), (106, 20)])
camino([(95, 36), (104, 36)])

# ===================== FRONTERAS =====================
# río ancho: sólo se cruza por el puente de la fila PASO_Y
R(RIO[0], 1, RIO[1], H - 2, '~')
R(RIO[0] - 1, 1, RIO[0] - 1, H - 2, 'a')
R(RIO[1] + 1, 1, RIO[1] + 1, H - 2, 'a')
R(RIO[0], PASO_Y, RIO[1], PASO_Y + 1, 'B')        # el puente
# cordillera ancha: sólo se cruza por el desfiladero de la fila PASO_Y
R(CORD[0], 1, CORD[1], H - 2, '^')
R(CORD[0], PASO_Y, CORD[1], PASO_Y + 1, '.')      # el paso

# arcos y carteles de entrada a cada región
g[PASO_Y - 1][RIO[0] - 2] = 'T'; g[PASO_Y + 2][RIO[0] - 2] = 'i'
g[PASO_Y - 1][RIO[1] + 2] = 'T'; g[PASO_Y + 2][RIO[1] + 2] = 'i'
g[PASO_Y - 1][CORD[0] - 2] = 'T'; g[PASO_Y + 2][CORD[0] - 2] = 'i'
g[PASO_Y - 1][CORD[1] + 2] = 'T'; g[PASO_Y + 2][CORD[1] + 2] = 'i'

# ===================== CENTROS, CUEVAS Y ALTARES =====================
CENTROS = [(5, 5), (49, 5), (93, 5)]
CUEVAS  = [(28, 48), (74, 46), (104, 36)]
# altares de legendarios, repartidos: dos al aire libre por región
ALTARES = [(33, 52), (9, 40),          # Kanto: cima de la sierra / claro del bosque
           (55, 33), (56, 22),         # Johto: orilla del lago / pradera de la torre
           (99, 42), (106, 30)]        # Hoenn: falda del volcán / punta de la costa
for (x, y) in CENTROS: g[y][x] = 'P'
for (x, y) in CUEVAS:  g[y][x] = 'C'
for (x, y) in ALTARES: g[y][x] = 'L'
g[4][11] = 'T'; g[6][9] = 'i'

# ===================== PLAYA Y BORDES =====================
for y in range(1, H - 1):
    for x in range(1, W - 1):
        if g[y][x] in ',*"' and any(g[y + dy][x + dx] == '~'
                                    for dx, dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1))):
            g[y][x] = 'a'
for x in range(W):
    g[0][x] = '#'; g[H - 1][x] = '#'
for y in range(H):
    g[y][0] = '#'; g[y][W - 1] = '#'
g[3][3] = '@'

# pokébolas del piso
BOLAS = [(15, 12), (26, 25), (11, 44), (33, 22), (55, 12), (66, 25), (58, 45), (77, 10),
         (95, 15), (103, 25), (97, 40), (92, 12)]
for (x, y) in BOLAS:
    if g[y][x] in ',*"a.': g[y][x] = 'b'

# ===================== VALIDACIÓN =====================
CAM = set('.,@*"aBFCPbkoLE')
def bfs(bloquear=()):
    ini = (3, 3)
    vis = {ini}; q = deque([ini])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < W and 0 <= ny < H): continue
            if (nx, ny) in vis or (nx, ny) in bloquear: continue
            if g[ny][nx] in CAM:
                vis.add((nx, ny)); q.append((nx, ny))
    return vis

vis = bfs()

# Lo que quedó encerrado (un altar adentro de la sierra, una bola en el bosque)
# se corre al casillero alcanzable más cercano en vez de quedar inservible.
def mudar(puntos, ch, libres=',*"aF.'):
    movidos = []
    for i, (x, y) in enumerate(puntos):
        if (x, y) in vis: continue
        cerca = min((p for p in vis if g[p[1]][p[0]] in libres),
                    key=lambda p: (p[0]-x)**2 + (p[1]-y)**2)
        g[y][x] = ',' if g[y][x] == ch else g[y][x]
        g[cerca[1]][cerca[0]] = ch
        puntos[i] = cerca
        movidos.append(((x, y), cerca))
    return movidos

for orig, nuevo in mudar(ALTARES, 'L') + mudar([(x, y) for y in range(H) for x in range(W) if g[y][x] == 'b'], 'b'):
    print('movido', orig, '->', nuevo)
vis = bfs()

def region(x):
    return 'kanto' if x < RIO[0] else 'johto' if x < CORD[0] else 'hoenn'

print(f'{W}x{H} = {W*H} casilleros · alcanzables a pie: {len(vis)}')
faltan = []
for nombre, puntos in [('centros', CENTROS), ('cuevas', CUEVAS), ('altares', ALTARES),
                       ('bolas', [(x, y) for y in range(H) for x in range(W) if g[y][x] == 'b'])]:
    malos = [p for p in puntos if p not in vis]
    print(f'{nombre:8} {len(puntos)-len(malos)}/{len(puntos)}', malos if malos else '')
    if malos: faltan.append(nombre)

for r in ('kanto', 'johto', 'hoenn'):
    hierba = sum(1 for (x, y) in vis if region(x) == r and g[y][x] == '"')
    orilla = sum(1 for (x, y) in vis if region(x) == r and g[y][x] == 'a')
    total  = sum(1 for (x, y) in vis if region(x) == r)
    alt    = sum(1 for (x, y) in ALTARES if region(x) == r)
    print(f'{r:6} caminable {total:5} · hierba {hierba:4} · orilla {orilla:4} · altares {alt}')

# el cruce tiene que ser ÚNICO: tapando el puente, Johto queda incomunicado
puente = {(x, y) for y in (PASO_Y, PASO_Y + 1) for x in range(RIO[0], RIO[1] + 1)}
sinPuente = bfs(bloquear=puente)
paso = {(x, y) for y in (PASO_Y, PASO_Y + 1) for x in range(CORD[0], CORD[1] + 1)}
sinPaso = bfs(bloquear=paso)
print('sin el puente se llega a Johto:', any(region(x) == 'johto' for (x, y) in sinPuente))
print('sin el paso se llega a Hoenn  :', any(region(x) == 'hoenn' for (x, y) in sinPaso))
print('SIN ACCESO:', faltan if faltan else 'nada')
open('mundo2.txt', 'w').write('\n'.join(''.join(r) for r in g))
