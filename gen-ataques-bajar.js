/* Uso: node gen-ataques-bajar.js <carpeta-cache>  → baja de PokeAPI lo que aprende cada Pokémon 1-251 y los datos de cada ataque,
   y deja learnsets.json en la carpeta de arriba. Después: node gen-ataques.js learnsets.json salida.json */
const fs=require('fs'),D=process.argv[2];
const get=async u=>{for(let i=0;i<5;i++){try{const r=await fetch(u);if(r.ok)return r.json();}catch(e){}await new Promise(r=>setTimeout(r,800*(i+1)));}throw new Error('fallo '+u)};
(async()=>{
 const pk={},movs=new Set();
 for(let id=1;id<=251;id+=8){await Promise.all([...Array(8)].map(async(_,k)=>{const i=id+k;if(i>251)return;const f=D+'/p'+i+'.json';
   let j; if(fs.existsSync(f)) j=JSON.parse(fs.readFileSync(f)); else {const r=await get('https://pokeapi.co/api/v2/pokemon/'+i);
   j={id:i,name:r.name,types:r.types.map(t=>t.type.name),moves:r.moves.map(m=>({n:m.move.name,how:[...new Set(m.version_group_details.map(v=>v.move_learn_method.name))]}))};fs.writeFileSync(f,JSON.stringify(j));}
   pk[i]=j; j.moves.forEach(m=>movs.add(m.n));}));}
 console.log('pokemon',Object.keys(pk).length,'movimientos distintos',movs.size);
 const mv={};const lista=[...movs];
 for(let i=0;i<lista.length;i+=10){await Promise.all(lista.slice(i,i+10).map(async n=>{const f=D+'/m-'+n+'.json';let j;
   if(fs.existsSync(f)) j=JSON.parse(fs.readFileSync(f)); else {const r=await get('https://pokeapi.co/api/v2/move/'+n);
   const es=(r.names.find(x=>x.language.name==='es')||{}).name||null;
   j={n,es,type:r.type.name,cls:r.damage_class.name,power:r.power,target:r.target.name,gen:r.generation.name};fs.writeFileSync(f,JSON.stringify(j));}
   mv[n]=j;}));}
 fs.writeFileSync(D+'/../learnsets.json',JSON.stringify({pk,mv}));console.log('listo',Object.keys(mv).length);
})();
