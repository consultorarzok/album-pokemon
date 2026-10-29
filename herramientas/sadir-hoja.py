"""Hoja de caminata del Gobernador Sadir: la imagen de Gemini (4x4 sobre magenta) -> images/sadir_walk.png
con la misma grilla que Red (filas: frente, izquierda, derecha, espalda; 4 cuadros de caminar), 128x192 por cuadro,
fondo transparente, todos a la misma escala y con los pies en la misma línea.
Uso: python3 herramientas/sadir-hoja.py <imagen.jpg>"""
import sys
import numpy as np
from PIL import Image
import cv2

FW, FH = 128, 192
src = Image.open(sys.argv[1]).convert('RGB')
W, H = src.size
im = np.asarray(src).astype(np.float32)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
m = np.minimum(r, b) - g                       # "magentidad": fondo ~255 (misma receta que montura-capas.py)
al = np.clip((190 - m) / 110, 0, 1)
ex = np.clip(m, 0, None) * (1 - al)            # saca el tinte magenta de los bordes
rgba = np.dstack([np.clip(r - ex, 0, 255), g, np.clip(b - ex, 0, 255), al * 255]).astype(np.uint8)

cw, ch = W // 4, H // 4
recortes = []
for fila in range(4):
    for col in range(4):
        celda = rgba[fila * ch:(fila + 1) * ch, col * cw:(col + 1) * cw]
        n, lab, est, _ = cv2.connectedComponentsWithStats((celda[..., 3] > 40).astype(np.uint8), connectivity=8)
        if n < 2: raise SystemExit('cuadro vacío %d,%d' % (fila, col))
        celda = celda.copy(); celda[lab != (1 + int(np.argmax(est[1:, cv2.CC_STAT_AREA])))] = 0     # sólo la figura más grande (sin manchas sueltas)
        ys, xs = np.where(celda[..., 3] > 40)
        recortes.append(Image.fromarray(celda[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA'))
esc = min((FW - 8) / max(r.width for r in recortes), (FH - 8) / max(r.height for r in recortes))
hoja = Image.new('RGBA', (FW * 4, FH * 4), (0, 0, 0, 0))
for i, r in enumerate(recortes):
    r = r.resize((max(1, round(r.width * esc)), max(1, round(r.height * esc))), Image.LANCZOS)
    hoja.paste(r, ((i % 4) * FW + (FW - r.width) // 2, (i // 4) * FH + FH - 4 - r.height), r)
hoja.save('images/sadir_walk.png', optimize=True)
print('escala', round(esc, 3), 'hoja', hoja.size)
