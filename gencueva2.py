from collections import deque
W, H = 20, 14
g = [['S' for _ in range(W)] for _ in range(H)]
def rect(x0,y0,x1,y1,ch):
    for y in range(y0,y1+1):
        for x in range(x0,x1+1): g[y][x] = ch

rect(1,1,18,3,'o')            # galeria de entrada
rect(2,2,17,3,'k')            # escombros
rect(1,4,3,10,'o')            # pasillo izquierdo
rect(16,4,18,10,'o')          # pasillo derecho
rect(1,10,18,11,'o')          # galeria del fondo
rect(4,10,15,11,'k')
rect(8,4,11,9,'o')            # camara central
rect(9,5,10,8,'k')
rect(8,3,11,4,'o')            # conexion arriba
rect(4,12,15,12,'S')
rect(8,12,11,12,'o')          # camarita del altar
g[12][9] = 'L'
g[12][10] = 'L'
g[0][9] = 'E'                 # salida arriba
g[1][9] = 'o'
g[6][2] = 'b'; g[10][17] = 'b'; g[11][6] = 'b'

CAM = set('okLEb')
ini = (9,1)
vis = {ini}; q = deque([ini])
while q:
    x,y = q.popleft()
    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
        nx,ny = x+dx, y+dy
        if 0<=nx<W and 0<=ny<H and (nx,ny) not in vis and g[ny][nx] in CAM:
            vis.add((nx,ny)); q.append((nx,ny))
for ch,n in [('L','altar'),('b','pokebola'),('E','salida')]:
    p = [(x,y) for y in range(H) for x in range(W) if g[y][x]==ch]
    print(n, sum(1 for c in p if c in vis), '/', len(p))
print()
print('\n'.join('"%s",' % ''.join(r) for r in g))
