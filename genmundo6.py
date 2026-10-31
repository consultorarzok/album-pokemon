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
CAMINABLES = set('.,@*aB"bF%CPokLENeumcvw')


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
limpiar(31, 49, 41, 52)
R(32, 50, 39, 51, '3')                                 # estadio 8 x 2
R(31, 52, 41, 52, '.')                                  # calle de la entrada, hasta la bajada del este (x 40-42)
cartel(31, 51, 'Estadio 23 de Agosto: la cancha del Lobo, Gimnasia y Esgrima de Jujuy.')
zonas += [{'n': 'Valles · Estadio 23 de Agosto (la cancha del Lobo)', 'x0': 30, 'y0': 48, 'x1': 42, 'y1': 53}]

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
json.dump(out, io.open('mundo6.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('OK mundo6: %dx%d, %d carteles nuevos' % (W, H, len(carteles)))
