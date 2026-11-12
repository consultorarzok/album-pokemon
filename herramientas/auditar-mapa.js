/* Audita el mapa de Aventura: casilleros caminables a los que no se llega, y pasillos de 1 casillero de ancho. */
let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'))}
(async()=>{const b=await chromium.launch(),p=await b.newPage();await p.route('**://n8n.consultorarz.com/**',r=>r.abort());await p.route('**://api.entrenadoresrz.com/**',r=>r.abort());
await p.goto('file:///root/pokemon/index.html');
const r=await p.evaluate(()=>{
  const M=ADV_MAPS.overworld, rows=M.rows, H=rows.length, W=M.cols, w=(x,y)=>{const t=ADV_TILE[(rows[y]||'')[x]];return !!(t&&t.walk);};
  const ini=advBuscarTile('overworld','@'), vis=new Uint8Array(W*H), cola=[[ini.x,ini.y]]; vis[ini.y*W+ini.x]=1; let n=0;
  while(cola.length){const [x,y]=cola.pop(); n++; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,c=y+dy; if(a<0||c<0||a>=W||c>=H||vis[c*W+a]||!w(a,c))continue; vis[c*W+a]=1; cola.push([a,c]);}}
  let tot=0; const islas=[], v2=new Uint8Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){ if(!w(x,y))continue; tot++; if(vis[y*W+x]||v2[y*W+x])continue;
    const q=[[x,y]]; v2[y*W+x]=1; let k=0,x0=x,x1=x,y0=y,y1=y; const ch={};
    while(q.length){const [a,c]=q.pop(); k++; x0=Math.min(x0,a);x1=Math.max(x1,a);y0=Math.min(y0,c);y1=Math.max(y1,c); ch[rows[c][a]]=(ch[rows[c][a]]||0)+1;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const e=a+dx,g=c+dy; if(e<0||g<0||e>=W||g>=H||v2[g*W+e]||vis[g*W+e]||!w(e,g))continue; v2[g*W+e]=1; q.push([e,g]);}}
    islas.push({k,x0,y0,x1,y1,ch}); }
  /* pasillos angostos: caminable con pared a los dos lados (izq+der) o (arriba+abajo) */
  let ang=0; const porReg={};
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){ if(!w(x,y))continue; const h=!w(x-1,y)&&!w(x+1,y), v=!w(x,y-1)&&!w(x,y+1); if(h||v){ang++; const rg=regionDe(x,y); porReg[rg]=(porReg[rg]||0)+1;} }
  const cuenta={}; rows.forEach(f=>[...f].forEach(c=>cuenta[c]=(cuenta[c]||0)+1));
  return {W,H,caminables:tot,alcanzables:n,islas,angostos:ang,porReg,arboles:(cuenta['#']||0)+(cuenta['"']||0),total:W*H};
});
console.log(JSON.stringify(r,null,1));await b.close();})();
