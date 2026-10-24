/* =================== SERVIDOR (opcional) ===================
   Con SERVIDOR_URL vacío el juego funciona como siempre: el álbum vive en el navegador y el
   ranking en n8n. Con una dirección, el álbum vive en el servidor (Cloudflare) y cada jugada
   se le pide a él: ver servidor.js. Para probar contra otro servidor, en la consola del navegador:
   localStorage.setItem('album-servidor', 'http://localhost:8787') y recargar. */
const SERVIDOR_POR_DEFECTO = 'https://api.entrenadoresrz.com';
/* 'album-servidor' = otra dirección (pruebas) u 'off' (forzar el modo viejo en este navegador).
   Abierto como archivo (file://, las pruebas) NUNCA usa el servidor real salvo que se lo pidan. */
const SERVIDOR_URL = (() => { let u = ''; try{ u = localStorage.getItem('album-servidor') || ''; }catch(e){}
  if(u === 'off') return '';
  return u || (location.protocol === 'file:' ? '' : SERVIDOR_POR_DEFECTO); })();
const MODO_SERVIDOR = !!SERVIDOR_URL;
let eventosServidor = {};   // bases de los eventos que guarda el servidor (las llena servidor.js)

const TYPE_COLORS = {
  normal:'#A8A77A', fire:'#EE8130', water:'#6390F0', electric:'#F7D02C',
  grass:'#7AC74C', ice:'#96D9D6', fighting:'#C22E28', poison:'#A33EA1',
  ground:'#E2BF65', flying:'#A98FF3', psychic:'#F95587', bug:'#A6B91A',
  rock:'#B6A136', ghost:'#735797', dragon:'#6F35FC', fairy:'#D685AD',
  dark:'#705746', steel:'#B7B7CE'
};
const TYPE_LABEL = {
  normal:'Normal', fire:'Fuego', water:'Agua', electric:'Eléctrico', grass:'Planta',
  ice:'Hielo', fighting:'Lucha', poison:'Veneno', ground:'Tierra', flying:'Volador',
  psychic:'Psíquico', bug:'Bicho', rock:'Roca', ghost:'Fantasma', dragon:'Dragón', fairy:'Hada',
  dark:'Siniestro', steel:'Acero'
};
const REGION_LABEL = { kanto:'Kanto', johto:'Johto', hoenn:'Hoenn', sinnoh:'Sinnoh',
  unova:'Teselia', kalos:'Kalos', alola:'Alola', galar:'Galar', paldea:'Paldea' };

const KANTO_DATA = [
[1,"Bulbasaur","grass","Común",70],[2,"Ivysaur","grass","Poco Común",25],[3,"Venusaur","grass","Rara",8],
[4,"Charmander","fire","Común",70],[5,"Charmeleon","fire","Poco Común",25],[6,"Charizard","fire","Épico",4],
[7,"Squirtle","water","Común",70],[8,"Wartortle","water","Poco Común",25],[9,"Blastoise","water","Rara",8],
[10,"Caterpie","bug","Común",70],[11,"Metapod","bug","Poco Común",25],[12,"Butterfree","bug","Rara",8],
[13,"Weedle","bug","Común",70],[14,"Kakuna","bug","Poco Común",25],[15,"Beedrill","bug","Rara",8],
[16,"Pidgey","normal","Común",70],[17,"Pidgeotto","normal","Poco Común",25],[18,"Pidgeot","normal","Rara",8],
[19,"Rattata","normal","Común",70],[20,"Raticate","normal","Poco Común",25],
[21,"Spearow","normal","Común",70],[22,"Fearow","normal","Poco Común",25],
[23,"Ekans","poison","Común",70],[24,"Arbok","poison","Poco Común",25],
[25,"Pikachu","electric","Épico",4],[26,"Raichu","electric","Rara",8],
[27,"Sandshrew","ground","Común",70],[28,"Sandslash","ground","Poco Común",25],
[29,"Nidoran (H)","poison","Común",70],[30,"Nidorina","poison","Poco Común",25],[31,"Nidoqueen","poison","Rara",8],
[32,"Nidoran (M)","poison","Común",70],[33,"Nidorino","poison","Poco Común",25],[34,"Nidoking","poison","Rara",8],
[35,"Clefairy","fairy","Común",70],[36,"Clefable","fairy","Poco Común",25],
[37,"Vulpix","fire","Común",70],[38,"Ninetales","fire","Poco Común",25],
[39,"Jigglypuff","normal","Común",70],[40,"Wigglytuff","normal","Poco Común",25],
[41,"Zubat","poison","Común",70],[42,"Golbat","poison","Poco Común",25],
[43,"Oddish","grass","Común",70],[44,"Gloom","grass","Poco Común",25],[45,"Vileplume","grass","Rara",8],
[46,"Paras","bug","Común",70],[47,"Parasect","bug","Poco Común",25],
[48,"Venonat","bug","Común",70],[49,"Venomoth","bug","Poco Común",25],
[50,"Diglett","ground","Común",70],[51,"Dugtrio","ground","Poco Común",25],
[52,"Meowth","normal","Común",70],[53,"Persian","normal","Poco Común",25],
[54,"Psyduck","water","Común",70],[55,"Golduck","water","Poco Común",25],
[56,"Mankey","fighting","Común",70],[57,"Primeape","fighting","Poco Común",25],
[58,"Growlithe","fire","Común",70],[59,"Arcanine","fire","Rara",8],
[60,"Poliwag","water","Común",70],[61,"Poliwhirl","water","Poco Común",25],[62,"Poliwrath","water","Rara",8],
[63,"Abra","psychic","Común",70],[64,"Kadabra","psychic","Poco Común",25],[65,"Alakazam","psychic","Rara",8],
[66,"Machop","fighting","Común",70],[67,"Machoke","fighting","Poco Común",25],[68,"Machamp","fighting","Rara",8],
[69,"Bellsprout","grass","Común",70],[70,"Weepinbell","grass","Poco Común",25],[71,"Victreebel","grass","Rara",8],
[72,"Tentacool","water","Común",70],[73,"Tentacruel","water","Poco Común",25],
[74,"Geodude","rock","Común",70],[75,"Graveler","rock","Poco Común",25],[76,"Golem","rock","Rara",8],
[77,"Ponyta","fire","Común",70],[78,"Rapidash","fire","Poco Común",25],
[79,"Slowpoke","water","Común",70],[80,"Slowbro","water","Poco Común",25],
[81,"Magnemite","electric","Común",70],[82,"Magneton","electric","Poco Común",25],
[83,"Farfetch'd","normal","Poco Común",25],
[84,"Doduo","normal","Común",70],[85,"Dodrio","normal","Poco Común",25],
[86,"Seel","water","Común",70],[87,"Dewgong","water","Poco Común",25],
[88,"Grimer","poison","Común",70],[89,"Muk","poison","Poco Común",25],
[90,"Shellder","water","Común",70],[91,"Cloyster","water","Rara",8],
[92,"Gastly","ghost","Común",70],[93,"Haunter","ghost","Poco Común",25],[94,"Gengar","ghost","Épico",4],
[95,"Onix","rock","Poco Común",25],
[96,"Drowzee","psychic","Común",70],[97,"Hypno","psychic","Poco Común",25],
[98,"Krabby","water","Común",70],[99,"Kingler","water","Poco Común",25],
[100,"Voltorb","electric","Común",70],[101,"Electrode","electric","Poco Común",25],
[102,"Exeggcute","grass","Común",70],[103,"Exeggutor","grass","Rara",8],
[104,"Cubone","ground","Común",70],[105,"Marowak","ground","Poco Común",25],
[106,"Hitmonlee","fighting","Poco Común",25],[107,"Hitmonchan","fighting","Poco Común",25],
[108,"Lickitung","normal","Poco Común",25],
[109,"Koffing","poison","Común",70],[110,"Weezing","poison","Poco Común",25],
[111,"Rhyhorn","ground","Común",70],[112,"Rhydon","ground","Poco Común",25],
[113,"Chansey","normal","Rara",8],
[114,"Tangela","grass","Poco Común",25],
[115,"Kangaskhan","normal","Rara",8],
[116,"Horsea","water","Común",70],[117,"Seadra","water","Poco Común",25],
[118,"Goldeen","water","Común",70],[119,"Seaking","water","Poco Común",25],
[120,"Staryu","water","Común",70],[121,"Starmie","water","Poco Común",25],
[122,"Mr. Mime","psychic","Poco Común",25],
[123,"Scyther","bug","Rara",8],
[124,"Jynx","ice","Poco Común",25],
[125,"Electabuzz","electric","Poco Común",25],
[126,"Magmar","fire","Poco Común",25],
[127,"Pinsir","bug","Rara",8],
[128,"Tauros","normal","Poco Común",25],
[129,"Magikarp","water","Común",70],[130,"Gyarados","water","Épico",4],
[131,"Lapras","water","Épico",4],
[132,"Ditto","normal","Épico",4],
[133,"Eevee","normal","Épico",4],
[134,"Vaporeon","water","Rara",8],[135,"Jolteon","electric","Rara",8],[136,"Flareon","fire","Rara",8],
[137,"Porygon","normal","Poco Común",25],
[138,"Omanyte","rock","Común",70],[139,"Omastar","rock","Rara",8],
[140,"Kabuto","rock","Común",70],[141,"Kabutops","rock","Rara",8],
[142,"Aerodactyl","rock","Rara",8],
[143,"Snorlax","normal","Épico",4],
[144,"Articuno","ice","Legendario",2],[145,"Zapdos","electric","Legendario",2],[146,"Moltres","fire","Legendario",2],
[147,"Dratini","dragon","Común",8],[148,"Dragonair","dragon","Poco Común",8],[149,"Dragonite","dragon","Épico",4],
[150,"Mewtwo","psychic","Legendario",2],[151,"Mew","psychic","Legendario",2]
].map(r => ({
  id:r[0], name:r[1], type:r[2], rarity:r[3], weight:r[4], region:'kanto',
  img:`https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${r[0]}.png`
}));

const JOHTO_RAW = [
[152,"Chikorita","grass","Común",70],[153,"Bayleef","grass","Poco Común",25],[154,"Meganium","grass","Rara",8],
[155,"Cyndaquil","fire","Común",70],[156,"Quilava","fire","Poco Común",25],[157,"Typhlosion","fire","Rara",8],
[158,"Totodile","water","Común",70],[159,"Croconaw","water","Poco Común",25],[160,"Feraligatr","water","Rara",8],
[161,"Sentret","normal","Común",70],[162,"Furret","normal","Poco Común",25],
[163,"Hoothoot","normal","Común",70],[164,"Noctowl","normal","Poco Común",25],
[165,"Ledyba","bug","Común",70],[166,"Ledian","bug","Poco Común",25],
[167,"Spinarak","bug","Común",70],[168,"Ariados","bug","Poco Común",25],
[169,"Crobat","poison","Rara",8],
[170,"Chinchou","water","Común",70],[171,"Lanturn","water","Poco Común",25],
[172,"Pichu","electric","Común",70],
[173,"Cleffa","fairy","Común",70],
[174,"Igglybuff","normal","Común",70],
[175,"Togepi","fairy","Poco Común",25],[176,"Togetic","fairy","Rara",8],
[177,"Natu","psychic","Común",70],[178,"Xatu","psychic","Poco Común",25],
[179,"Mareep","electric","Común",70],[180,"Flaaffy","electric","Poco Común",25],[181,"Ampharos","electric","Rara",8],
[182,"Bellossom","grass","Rara",8],
[183,"Marill","water","Común",70],[184,"Azumarill","water","Poco Común",25],
[185,"Sudowoodo","rock","Poco Común",25],
[186,"Politoed","water","Rara",8],
[187,"Hoppip","grass","Común",70],[188,"Skiploom","grass","Poco Común",25],[189,"Jumpluff","grass","Rara",8],
[190,"Aipom","normal","Poco Común",25],
[191,"Sunkern","grass","Común",70],[192,"Sunflora","grass","Poco Común",25],
[193,"Yanma","bug","Poco Común",25],
[194,"Wooper","water","Común",70],[195,"Quagsire","water","Poco Común",25],
[196,"Espeon","psychic","Épico",4],
[197,"Umbreon","dark","Épico",4],
[198,"Murkrow","dark","Poco Común",25],
[199,"Slowking","water","Rara",8],
[200,"Misdreavus","ghost","Poco Común",25],
[201,"Unown","psychic","Rara",8],
[202,"Wobbuffet","psychic","Poco Común",25],
[203,"Girafarig","normal","Poco Común",25],
[204,"Pineco","bug","Común",70],[205,"Forretress","bug","Poco Común",25],
[206,"Dunsparce","normal","Poco Común",25],
[207,"Gligar","ground","Poco Común",25],
[208,"Steelix","steel","Rara",8],
[209,"Snubbull","fairy","Común",70],[210,"Granbull","fairy","Poco Común",25],
[211,"Qwilfish","water","Poco Común",25],
[212,"Scizor","bug","Rara",8],
[213,"Shuckle","bug","Poco Común",25],
[214,"Heracross","bug","Rara",8],
[215,"Sneasel","dark","Poco Común",25],
[216,"Teddiursa","normal","Común",70],[217,"Ursaring","normal","Poco Común",25],
[218,"Slugma","fire","Común",70],[219,"Magcargo","fire","Poco Común",25],
[220,"Swinub","ice","Común",70],[221,"Piloswine","ice","Poco Común",25],
[222,"Corsola","water","Poco Común",25],
[223,"Remoraid","water","Común",70],[224,"Octillery","water","Poco Común",25],
[225,"Delibird","ice","Poco Común",25],
[226,"Mantine","water","Rara",8],
[227,"Skarmory","steel","Rara",8],
[228,"Houndour","dark","Común",70],[229,"Houndoom","dark","Rara",8],
[230,"Kingdra","water","Rara",8],
[231,"Phanpy","ground","Común",70],[232,"Donphan","ground","Poco Común",25],
[233,"Porygon2","normal","Rara",8],
[234,"Stantler","normal","Poco Común",25],
[235,"Smeargle","normal","Poco Común",25],
[236,"Tyrogue","fighting","Común",70],
[237,"Hitmontop","fighting","Poco Común",25],
[238,"Smoochum","ice","Común",70],
[239,"Elekid","electric","Común",70],
[240,"Magby","fire","Común",70],
[241,"Miltank","normal","Poco Común",25],
[242,"Blissey","normal","Rara",8],
[243,"Raikou","electric","Legendario",2],[244,"Entei","fire","Legendario",2],[245,"Suicune","water","Legendario",2],
[246,"Larvitar","rock","Común",70],[247,"Pupitar","rock","Poco Común",25],[248,"Tyranitar","rock","Épico",4],
[249,"Lugia","psychic","Legendario",2],[250,"Ho-Oh","fire","Legendario",2],[251,"Celebi","psychic","Legendario",2]
].map(r => ({
  id:r[0], name:r[1], type:r[2], rarity:r[3], weight:r[4], region:'johto',
  img:`https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${r[0]}.png`
}));

const HOENN_RAW = [
[252,"Treecko","grass","Común",70],[253,"Grovyle","grass","Poco Común",25],[254,"Sceptile","grass","Épico",4],
[255,"Torchic","fire","Común",70],[256,"Combusken","fire","Poco Común",25],[257,"Blaziken","fire","Épico",4],
[258,"Mudkip","water","Común",70],[259,"Marshtomp","water","Poco Común",25],[260,"Swampert","water","Rara",8],
[261,"Poochyena","dark","Común",70],[262,"Mightyena","dark","Poco Común",25],
[263,"Zigzagoon","normal","Común",70],[264,"Linoone","normal","Poco Común",25],
[265,"Wurmple","bug","Común",70],[266,"Silcoon","bug","Poco Común",25],[267,"Beautifly","bug","Rara",8],
[268,"Cascoon","bug","Poco Común",25],[269,"Dustox","bug","Rara",8],
[270,"Lotad","water","Común",70],[271,"Lombre","water","Poco Común",25],[272,"Ludicolo","water","Rara",8],
[273,"Seedot","grass","Común",70],[274,"Nuzleaf","grass","Poco Común",25],[275,"Shiftry","grass","Rara",8],
[276,"Taillow","normal","Común",70],[277,"Swellow","normal","Poco Común",25],
[278,"Wingull","water","Común",70],[279,"Pelipper","water","Poco Común",25],
[280,"Ralts","psychic","Común",70],[281,"Kirlia","psychic","Poco Común",25],[282,"Gardevoir","psychic","Épico",4],
[283,"Surskit","bug","Común",70],[284,"Masquerain","bug","Poco Común",25],
[285,"Shroomish","grass","Común",70],[286,"Breloom","grass","Poco Común",25],
[287,"Slakoth","normal","Común",70],[288,"Vigoroth","normal","Poco Común",25],[289,"Slaking","normal","Rara",8],
[290,"Nincada","bug","Común",70],[291,"Ninjask","bug","Poco Común",25],[292,"Shedinja","bug","Rara",8],
[293,"Whismur","normal","Común",70],[294,"Loudred","normal","Poco Común",25],[295,"Exploud","normal","Rara",8],
[296,"Makuhita","fighting","Común",70],[297,"Hariyama","fighting","Poco Común",25],
[298,"Azurill","normal","Común",70],
[299,"Nosepass","rock","Poco Común",25],
[300,"Skitty","normal","Común",70],[301,"Delcatty","normal","Poco Común",25],
[302,"Sableye","dark","Rara",8],
[303,"Mawile","steel","Rara",8],
[304,"Aron","steel","Común",70],[305,"Lairon","steel","Poco Común",25],[306,"Aggron","steel","Rara",8],
[307,"Meditite","fighting","Común",70],[308,"Medicham","fighting","Poco Común",25],
[309,"Electrike","electric","Común",70],[310,"Manectric","electric","Poco Común",25],
[311,"Plusle","electric","Poco Común",25],[312,"Minun","electric","Poco Común",25],
[313,"Volbeat","bug","Poco Común",25],[314,"Illumise","bug","Poco Común",25],
[315,"Roselia","grass","Poco Común",25],
[316,"Gulpin","poison","Común",70],[317,"Swalot","poison","Poco Común",25],
[318,"Carvanha","water","Común",70],[319,"Sharpedo","water","Rara",8],
[320,"Wailmer","water","Común",70],[321,"Wailord","water","Rara",8],
[322,"Numel","fire","Común",70],[323,"Camerupt","fire","Poco Común",25],
[324,"Torkoal","fire","Poco Común",25],
[325,"Spoink","psychic","Común",70],[326,"Grumpig","psychic","Poco Común",25],
[327,"Spinda","normal","Poco Común",25],
[328,"Trapinch","ground","Común",70],[329,"Vibrava","ground","Poco Común",25],[330,"Flygon","ground","Épico",4],
[331,"Cacnea","grass","Común",70],[332,"Cacturne","grass","Poco Común",25],
[333,"Swablu","normal","Común",70],[334,"Altaria","dragon","Rara",8],
[335,"Zangoose","normal","Poco Común",25],
[336,"Seviper","poison","Poco Común",25],
[337,"Lunatone","rock","Poco Común",25],[338,"Solrock","rock","Poco Común",25],
[339,"Barboach","water","Común",70],[340,"Whiscash","water","Poco Común",25],
[341,"Corphish","water","Común",70],[342,"Crawdaunt","water","Poco Común",25],
[343,"Baltoy","ground","Común",70],[344,"Claydol","ground","Poco Común",25],
[345,"Lileep","rock","Común",70],[346,"Cradily","rock","Poco Común",25],
[347,"Anorith","rock","Común",70],[348,"Armaldo","rock","Poco Común",25],
[349,"Feebas","water","Común",70],[350,"Milotic","water","Épico",4],
[351,"Castform","normal","Poco Común",25],
[352,"Kecleon","normal","Poco Común",25],
[353,"Shuppet","ghost","Común",70],[354,"Banette","ghost","Poco Común",25],
[355,"Duskull","ghost","Común",70],[356,"Dusclops","ghost","Poco Común",25],
[357,"Tropius","grass","Poco Común",25],
[358,"Chimecho","psychic","Poco Común",25],
[359,"Absol","dark","Rara",8],
[360,"Wynaut","psychic","Común",70],
[361,"Snorunt","ice","Común",70],[362,"Glalie","ice","Poco Común",25],
[363,"Spheal","ice","Común",70],[364,"Sealeo","ice","Poco Común",25],[365,"Walrein","ice","Rara",8],
[366,"Clamperl","water","Común",70],[367,"Huntail","water","Rara",8],[368,"Gorebyss","water","Rara",8],
[369,"Relicanth","water","Rara",8],
[370,"Luvdisc","water","Poco Común",25],
[371,"Bagon","dragon","Común",70],[372,"Shelgon","dragon","Poco Común",25],[373,"Salamence","dragon","Épico",4],
[374,"Beldum","steel","Común",70],[375,"Metang","steel","Poco Común",25],[376,"Metagross","steel","Épico",4],
[377,"Regirock","rock","Legendario",2],[378,"Regice","ice","Legendario",2],[379,"Registeel","steel","Legendario",2],
[380,"Latias","dragon","Legendario",2],[381,"Latios","dragon","Legendario",2],
[382,"Kyogre","water","Legendario",2],[383,"Groudon","ground","Legendario",2],[384,"Rayquaza","dragon","Legendario",2],
[385,"Jirachi","steel","Legendario",2],[386,"Deoxys","psychic","Legendario",2]
].map(r => ({
  id:r[0], name:r[1], type:r[2], rarity:r[3], weight:r[4], region:'hoenn',
  img:`https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${r[0]}.png`
}));

const SINNOH_RAW = [
[387,"Turtwig","grass","Común",70],[388,"Grotle","grass","Poco Común",25],[389,"Torterra","grass","Rara",8],
[390,"Chimchar","fire","Común",70],[391,"Monferno","fire","Poco Común",25],[392,"Infernape","fire","Rara",8],
[393,"Piplup","water","Común",70],[394,"Prinplup","water","Poco Común",25],[395,"Empoleon","water","Rara",8],
[396,"Starly","normal","Común",70],[397,"Staravia","normal","Poco Común",25],[398,"Staraptor","normal","Rara",8],
[399,"Bidoof","normal","Común",70],[400,"Bibarel","normal","Poco Común",25],
[401,"Kricketot","bug","Común",70],[402,"Kricketune","bug","Poco Común",25],
[403,"Shinx","electric","Común",70],[404,"Luxio","electric","Poco Común",25],[405,"Luxray","electric","Épico",4],
[406,"Budew","grass","Común",70],[407,"Roserade","grass","Rara",8],
[408,"Cranidos","rock","Común",70],[409,"Rampardos","rock","Poco Común",25],
[410,"Shieldon","rock","Común",70],[411,"Bastiodon","rock","Poco Común",25],
[412,"Burmy","bug","Común",70],[413,"Wormadam","bug","Poco Común",25],[414,"Mothim","bug","Poco Común",25],
[415,"Combee","bug","Común",70],[416,"Vespiquen","bug","Poco Común",25],
[417,"Pachirisu","electric","Poco Común",25],
[418,"Buizel","water","Común",70],[419,"Floatzel","water","Poco Común",25],
[420,"Cherubi","grass","Común",70],[421,"Cherrim","grass","Poco Común",25],
[422,"Shellos","water","Común",70],[423,"Gastrodon","water","Poco Común",25],
[424,"Ambipom","normal","Poco Común",25],
[425,"Drifloon","ghost","Común",70],[426,"Drifblim","ghost","Poco Común",25],
[427,"Buneary","normal","Común",70],[428,"Lopunny","normal","Poco Común",25],
[429,"Mismagius","ghost","Rara",8],
[430,"Honchkrow","dark","Rara",8],
[431,"Glameow","normal","Común",70],[432,"Purugly","normal","Poco Común",25],
[433,"Chingling","psychic","Común",70],
[434,"Stunky","poison","Común",70],[435,"Skuntank","poison","Poco Común",25],
[436,"Bronzor","steel","Común",70],[437,"Bronzong","steel","Poco Común",25],
[438,"Bonsly","rock","Común",70],
[439,"Mime Jr.","psychic","Común",70],
[440,"Happiny","normal","Común",70],
[441,"Chatot","normal","Poco Común",25],
[442,"Spiritomb","ghost","Rara",8],
[443,"Gible","dragon","Común",70],[444,"Gabite","dragon","Poco Común",25],[445,"Garchomp","dragon","Épico",4],
[446,"Munchlax","normal","Poco Común",25],
[447,"Riolu","fighting","Común",70],[448,"Lucario","fighting","Épico",4],
[449,"Hippopotas","ground","Común",70],[450,"Hippowdon","ground","Poco Común",25],
[451,"Skorupi","poison","Común",70],[452,"Drapion","poison","Poco Común",25],
[453,"Croagunk","poison","Común",70],[454,"Toxicroak","poison","Poco Común",25],
[455,"Carnivine","grass","Poco Común",25],
[456,"Finneon","water","Común",70],[457,"Lumineon","water","Poco Común",25],
[458,"Mantyke","water","Poco Común",25],
[459,"Snover","grass","Común",70],[460,"Abomasnow","grass","Poco Común",25],
[461,"Weavile","dark","Rara",8],
[462,"Magnezone","electric","Rara",8],
[463,"Lickilicky","normal","Poco Común",25],
[464,"Rhyperior","ground","Rara",8],
[465,"Tangrowth","grass","Poco Común",25],
[466,"Electivire","electric","Rara",8],
[467,"Magmortar","fire","Rara",8],
[468,"Togekiss","fairy","Rara",8],
[469,"Yanmega","bug","Rara",8],
[470,"Leafeon","grass","Rara",8],
[471,"Glaceon","ice","Rara",8],
[472,"Gliscor","ground","Rara",8],
[473,"Mamoswine","ice","Rara",8],
[474,"Porygon-Z","normal","Rara",8],
[475,"Gallade","psychic","Rara",8],
[476,"Probopass","rock","Poco Común",25],
[477,"Dusknoir","ghost","Rara",8],
[478,"Froslass","ice","Rara",8],
[479,"Rotom","electric","Rara",8],
[480,"Uxie","psychic","Legendario",2],[481,"Mesprit","psychic","Legendario",2],[482,"Azelf","psychic","Legendario",2],
[483,"Dialga","steel","Legendario",2],[484,"Palkia","water","Legendario",2],
[485,"Heatran","fire","Legendario",2],[486,"Regigigas","normal","Legendario",2],
[487,"Giratina","ghost","Legendario",2],[488,"Cresselia","psychic","Legendario",2],
[489,"Phione","water","Poco Común",25],[490,"Manaphy","water","Legendario",2],
[491,"Darkrai","dark","Legendario",2],[492,"Shaymin","grass","Legendario",2],[493,"Arceus","normal","Legendario",2]
].map(r => ({
  id:r[0], name:r[1], type:r[2], rarity:r[3], weight:r[4], region:'sinnoh',
  img:`https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${r[0]}.png`
}));

const UNOVA_RAW = [
[494,"Victini","psychic","Legendario",2],[495,"Snivy","grass","Común",70],[496,"Servine","grass","Poco Común",25],
[497,"Serperior","grass","Rara",8],[498,"Tepig","fire","Común",70],[499,"Pignite","fire","Poco Común",25],
[500,"Emboar","fire","Rara",8],[501,"Oshawott","water","Común",70],[502,"Dewott","water","Poco Común",25],
[503,"Samurott","water","Rara",8],[504,"Patrat","normal","Común",70],[505,"Watchog","normal","Rara",8],
[506,"Lillipup","normal","Común",70],[507,"Herdier","normal","Poco Común",25],[508,"Stoutland","normal","Rara",8],
[509,"Purrloin","dark","Común",70],[510,"Liepard","dark","Rara",8],[511,"Pansage","grass","Común",70],
[512,"Simisage","grass","Rara",8],[513,"Pansear","fire","Común",70],[514,"Simisear","fire","Rara",8],
[515,"Panpour","water","Común",70],[516,"Simipour","water","Rara",8],[517,"Munna","psychic","Común",70],
[518,"Musharna","psychic","Rara",8],[519,"Pidove","normal","Común",70],[520,"Tranquill","normal","Poco Común",25],
[521,"Unfezant","normal","Rara",8],[522,"Blitzle","electric","Común",70],[523,"Zebstrika","electric","Rara",8],
[524,"Roggenrola","rock","Común",70],[525,"Boldore","rock","Poco Común",25],[526,"Gigalith","rock","Rara",8],
[527,"Woobat","psychic","Común",70],[528,"Swoobat","psychic","Rara",8],[529,"Drilbur","ground","Común",70],
[530,"Excadrill","ground","Rara",8],[531,"Audino","normal","Poco Común",25],[532,"Timburr","fighting","Común",70],
[533,"Gurdurr","fighting","Poco Común",25],[534,"Conkeldurr","fighting","Rara",8],[535,"Tympole","water","Común",70],
[536,"Palpitoad","water","Poco Común",25],[537,"Seismitoad","water","Rara",8],[538,"Throh","fighting","Poco Común",25],
[539,"Sawk","fighting","Poco Común",25],[540,"Sewaddle","bug","Común",70],[541,"Swadloon","bug","Poco Común",25],
[542,"Leavanny","bug","Rara",8],[543,"Venipede","bug","Común",70],[544,"Whirlipede","bug","Poco Común",25],
[545,"Scolipede","bug","Rara",8],[546,"Cottonee","grass","Común",70],[547,"Whimsicott","grass","Rara",8],
[548,"Petilil","grass","Común",70],[549,"Lilligant","grass","Rara",8],[550,"Basculin","water","Común",70],
[551,"Sandile","ground","Común",70],[552,"Krokorok","ground","Poco Común",25],[553,"Krookodile","ground","Rara",8],
[554,"Darumaka","fire","Común",70],[555,"Darmanitan","fire","Rara",8],[556,"Maractus","grass","Poco Común",25],
[557,"Dwebble","bug","Común",70],[558,"Crustle","bug","Rara",8],[559,"Scraggy","dark","Común",70],
[560,"Scrafty","dark","Rara",8],[561,"Sigilyph","psychic","Poco Común",25],[562,"Yamask","ghost","Común",70],
[563,"Cofagrigus","ghost","Rara",8],[564,"Tirtouga","water","Común",70],[565,"Carracosta","water","Rara",8],
[566,"Archen","rock","Común",70],[567,"Archeops","rock","Rara",8],[568,"Trubbish","poison","Común",70],
[569,"Garbodor","poison","Rara",8],[570,"Zorua","dark","Común",70],[571,"Zoroark","dark","Épico",4],
[572,"Minccino","normal","Común",70],[573,"Cinccino","normal","Rara",8],[574,"Gothita","psychic","Común",70],
[575,"Gothorita","psychic","Poco Común",25],[576,"Gothitelle","psychic","Rara",8],[577,"Solosis","psychic","Común",70],
[578,"Duosion","psychic","Poco Común",25],[579,"Reuniclus","psychic","Rara",8],[580,"Ducklett","water","Común",70],
[581,"Swanna","water","Rara",8],[582,"Vanillite","ice","Común",70],[583,"Vanillish","ice","Poco Común",25],
[584,"Vanilluxe","ice","Rara",8],[585,"Deerling","normal","Común",70],[586,"Sawsbuck","normal","Rara",8],
[587,"Emolga","electric","Poco Común",25],[588,"Karrablast","bug","Común",70],[589,"Escavalier","bug","Rara",8],
[590,"Foongus","grass","Común",70],[591,"Amoonguss","grass","Rara",8],[592,"Frillish","water","Común",70],
[593,"Jellicent","water","Rara",8],[594,"Alomomola","water","Poco Común",25],[595,"Joltik","bug","Común",70],
[596,"Galvantula","bug","Rara",8],[597,"Ferroseed","grass","Común",70],[598,"Ferrothorn","grass","Rara",8],
[599,"Klink","steel","Común",70],[600,"Klang","steel","Poco Común",25],[601,"Klinklang","steel","Rara",8],
[602,"Tynamo","electric","Común",70],[603,"Eelektrik","electric","Poco Común",25],[604,"Eelektross","electric","Rara",8],
[605,"Elgyem","psychic","Común",70],[606,"Beheeyem","psychic","Rara",8],[607,"Litwick","ghost","Común",70],
[608,"Lampent","ghost","Poco Común",25],[609,"Chandelure","ghost","Épico",4],[610,"Axew","dragon","Común",70],
[611,"Fraxure","dragon","Poco Común",25],[612,"Haxorus","dragon","Rara",8],[613,"Cubchoo","ice","Común",70],
[614,"Beartic","ice","Rara",8],[615,"Cryogonal","ice","Rara",8],[616,"Shelmet","bug","Común",70],
[617,"Accelgor","bug","Rara",8],[618,"Stunfisk","ground","Poco Común",25],[619,"Mienfoo","fighting","Común",70],
[620,"Mienshao","fighting","Rara",8],[621,"Druddigon","dragon","Poco Común",25],[622,"Golett","ground","Común",70],
[623,"Golurk","ground","Rara",8],[624,"Pawniard","dark","Común",70],[625,"Bisharp","dark","Poco Común",25],
[626,"Bouffalant","normal","Poco Común",25],[627,"Rufflet","normal","Común",70],[628,"Braviary","normal","Rara",8],
[629,"Vullaby","dark","Común",70],[630,"Mandibuzz","dark","Rara",8],[631,"Heatmor","fire","Poco Común",25],
[632,"Durant","bug","Poco Común",25],[633,"Deino","dark","Común",70],[634,"Zweilous","dark","Poco Común",25],
[635,"Hydreigon","dark","Épico",4],[636,"Larvesta","bug","Común",70],[637,"Volcarona","bug","Rara",8],
[638,"Cobalion","steel","Legendario",2],[639,"Terrakion","rock","Legendario",2],[640,"Virizion","grass","Legendario",2],
[641,"Tornadus","flying","Legendario",2],[642,"Thundurus","electric","Legendario",2],[643,"Reshiram","dragon","Legendario",2],
[644,"Zekrom","dragon","Legendario",2],[645,"Landorus","ground","Legendario",2],[646,"Kyurem","dragon","Legendario",2],
[647,"Keldeo","water","Legendario",2],[648,"Meloetta","normal","Legendario",2],[649,"Genesect","bug","Legendario",2]
].map(r => ({
  id:r[0], name:r[1], type:r[2], rarity:r[3], weight:r[4], region:'unova',
  img:`https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${r[0]}.png`
}));

const KALOS_RAW = [
[650,"Chespin","grass","Común",70],[651,"Quilladin","grass","Poco Común",25],[652,"Chesnaught","grass","Rara",8],
[653,"Fennekin","fire","Común",70],[654,"Braixen","fire","Poco Común",25],[655,"Delphox","fire","Rara",8],
[656,"Froakie","water","Común",70],[657,"Frogadier","water","Poco Común",25],[658,"Greninja","water","Épico",4],
[659,"Bunnelby","normal","Común",70],[660,"Diggersby","normal","Rara",8],[661,"Fletchling","normal","Común",70],
[662,"Fletchinder","fire","Poco Común",25],[663,"Talonflame","fire","Rara",8],[664,"Scatterbug","bug","Común",70],
[665,"Spewpa","bug","Poco Común",25],[666,"Vivillon","bug","Rara",8],[667,"Litleo","fire","Común",70],
[668,"Pyroar","fire","Rara",8],[669,"Flabébé","fairy","Común",70],[670,"Floette","fairy","Poco Común",25],
[671,"Florges","fairy","Rara",8],[672,"Skiddo","grass","Común",70],[673,"Gogoat","grass","Rara",8],
[674,"Pancham","fighting","Común",70],[675,"Pangoro","fighting","Rara",8],[676,"Furfrou","normal","Poco Común",25],
[677,"Espurr","psychic","Común",70],[678,"Meowstic","psychic","Rara",8],[679,"Honedge","steel","Común",70],
[680,"Doublade","steel","Poco Común",25],[681,"Aegislash","steel","Épico",4],[682,"Spritzee","fairy","Común",70],
[683,"Aromatisse","fairy","Rara",8],[684,"Swirlix","fairy","Común",70],[685,"Slurpuff","fairy","Rara",8],
[686,"Inkay","dark","Común",70],[687,"Malamar","dark","Rara",8],[688,"Binacle","rock","Común",70],
[689,"Barbaracle","rock","Rara",8],[690,"Skrelp","poison","Común",70],[691,"Dragalge","poison","Rara",8],
[692,"Clauncher","water","Común",70],[693,"Clawitzer","water","Rara",8],[694,"Helioptile","electric","Común",70],
[695,"Heliolisk","electric","Rara",8],[696,"Tyrunt","rock","Común",70],[697,"Tyrantrum","rock","Rara",8],
[698,"Amaura","rock","Común",70],[699,"Aurorus","rock","Rara",8],[700,"Sylveon","fairy","Épico",4],
[701,"Hawlucha","fighting","Rara",8],[702,"Dedenne","electric","Poco Común",25],[703,"Carbink","rock","Rara",8],
[704,"Goomy","dragon","Común",70],[705,"Sliggoo","dragon","Poco Común",25],[706,"Goodra","dragon","Épico",4],
[707,"Klefki","steel","Poco Común",25],[708,"Phantump","ghost","Común",70],[709,"Trevenant","ghost","Rara",8],
[710,"Pumpkaboo","ghost","Común",70],[711,"Gourgeist","ghost","Rara",8],[712,"Bergmite","ice","Común",70],
[713,"Avalugg","ice","Rara",8],[714,"Noibat","flying","Común",70],[715,"Noivern","flying","Rara",8],
[716,"Xerneas","fairy","Legendario",2],[717,"Yveltal","dark","Legendario",2],[718,"Zygarde","dragon","Legendario",2],
[719,"Diancie","rock","Legendario",2],[720,"Hoopa","psychic","Legendario",2],[721,"Volcanion","fire","Legendario",2]
].map(r => ({
  id:r[0], name:r[1], type:r[2], rarity:r[3], weight:r[4], region:'kalos',
  img:`https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${r[0]}.png`
}));

const ALOLA_RAW = [
[722,"Rowlet","grass","Común",70],[723,"Dartrix","grass","Poco Común",25],[724,"Decidueye","grass","Épico",4],
[725,"Litten","fire","Común",70],[726,"Torracat","fire","Poco Común",25],[727,"Incineroar","fire","Rara",8],
[728,"Popplio","water","Común",70],[729,"Brionne","water","Poco Común",25],[730,"Primarina","water","Rara",8],
[731,"Pikipek","normal","Común",70],[732,"Trumbeak","normal","Poco Común",25],[733,"Toucannon","normal","Rara",8],
[734,"Yungoos","normal","Común",70],[735,"Gumshoos","normal","Rara",8],[736,"Grubbin","bug","Común",70],
[737,"Charjabug","bug","Poco Común",25],[738,"Vikavolt","bug","Rara",8],[739,"Crabrawler","fighting","Común",70],
[740,"Crabominable","fighting","Rara",8],[741,"Oricorio","fire","Poco Común",25],[742,"Cutiefly","bug","Común",70],
[743,"Ribombee","bug","Rara",8],[744,"Rockruff","rock","Común",70],[745,"Lycanroc","rock","Épico",4],
[746,"Wishiwashi","water","Poco Común",25],[747,"Mareanie","poison","Común",70],[748,"Toxapex","poison","Rara",8],
[749,"Mudbray","ground","Común",70],[750,"Mudsdale","ground","Rara",8],[751,"Dewpider","water","Común",70],
[752,"Araquanid","water","Rara",8],[753,"Fomantis","grass","Común",70],[754,"Lurantis","grass","Rara",8],
[755,"Morelull","grass","Común",70],[756,"Shiinotic","grass","Rara",8],[757,"Salandit","poison","Común",70],
[758,"Salazzle","poison","Rara",8],[759,"Stufful","normal","Común",70],[760,"Bewear","normal","Rara",8],
[761,"Bounsweet","grass","Común",70],[762,"Steenee","grass","Poco Común",25],[763,"Tsareena","grass","Rara",8],
[764,"Comfey","fairy","Poco Común",25],[765,"Oranguru","normal","Poco Común",25],[766,"Passimian","fighting","Poco Común",25],
[767,"Wimpod","bug","Común",70],[768,"Golisopod","bug","Rara",8],[769,"Sandygast","ghost","Común",70],
[770,"Palossand","ghost","Rara",8],[771,"Pyukumuku","water","Poco Común",25],[772,"Type: Null","normal","Legendario",2],
[773,"Silvally","normal","Legendario",2],[774,"Minior","rock","Poco Común",25],[775,"Komala","normal","Poco Común",25],
[776,"Turtonator","fire","Poco Común",25],[777,"Togedemaru","electric","Poco Común",25],[778,"Mimikyu","ghost","Épico",4],
[779,"Bruxish","water","Poco Común",25],[780,"Drampa","normal","Poco Común",25],[781,"Dhelmise","ghost","Rara",8],
[782,"Jangmo-o","dragon","Común",70],[783,"Hakamo-o","dragon","Poco Común",25],[784,"Kommo-o","dragon","Épico",4],
[785,"Tapu Koko","electric","Legendario",2],[786,"Tapu Lele","psychic","Legendario",2],[787,"Tapu Bulu","grass","Legendario",2],
[788,"Tapu Fini","water","Legendario",2],[789,"Cosmog","psychic","Legendario",2],[790,"Cosmoem","psychic","Legendario",2],
[791,"Solgaleo","psychic","Legendario",2],[792,"Lunala","psychic","Legendario",2],[793,"Nihilego","rock","Épico",4],
[794,"Buzzwole","bug","Épico",4],[795,"Pheromosa","bug","Épico",4],[796,"Xurkitree","electric","Épico",4],
[797,"Celesteela","steel","Épico",4],[798,"Kartana","grass","Épico",4],[799,"Guzzlord","dark","Épico",4],
[800,"Necrozma","psychic","Legendario",2],[801,"Magearna","steel","Legendario",2],[802,"Marshadow","fighting","Legendario",2],
[803,"Poipole","poison","Épico",4],[804,"Naganadel","poison","Épico",4],[805,"Stakataka","rock","Épico",4],
[806,"Blacephalon","fire","Épico",4],[807,"Zeraora","electric","Legendario",2],[808,"Meltan","steel","Legendario",2],
[809,"Melmetal","steel","Legendario",2]
].map(r => ({
  id:r[0], name:r[1], type:r[2], rarity:r[3], weight:r[4], region:'alola',
  img:`https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${r[0]}.png`
}));

const GALAR_RAW = [
[810,"Grookey","grass","Común",70],[811,"Thwackey","grass","Poco Común",25],[812,"Rillaboom","grass","Rara",8],
[813,"Scorbunny","fire","Común",70],[814,"Raboot","fire","Poco Común",25],[815,"Cinderace","fire","Rara",8],
[816,"Sobble","water","Común",70],[817,"Drizzile","water","Poco Común",25],[818,"Inteleon","water","Rara",8],
[819,"Skwovet","normal","Común",70],[820,"Greedent","normal","Rara",8],[821,"Rookidee","flying","Común",70],
[822,"Corvisquire","flying","Poco Común",25],[823,"Corviknight","flying","Épico",4],[824,"Blipbug","bug","Común",70],
[825,"Dottler","bug","Poco Común",25],[826,"Orbeetle","bug","Rara",8],[827,"Nickit","dark","Común",70],
[828,"Thievul","dark","Rara",8],[829,"Gossifleur","grass","Común",70],[830,"Eldegoss","grass","Rara",8],
[831,"Wooloo","normal","Común",70],[832,"Dubwool","normal","Rara",8],[833,"Chewtle","water","Común",70],
[834,"Drednaw","water","Rara",8],[835,"Yamper","electric","Común",70],[836,"Boltund","electric","Rara",8],
[837,"Rolycoly","rock","Común",70],[838,"Carkol","rock","Poco Común",25],[839,"Coalossal","rock","Rara",8],
[840,"Applin","grass","Común",70],[841,"Flapple","grass","Rara",8],[842,"Appletun","grass","Rara",8],
[843,"Silicobra","ground","Común",70],[844,"Sandaconda","ground","Rara",8],[845,"Cramorant","flying","Poco Común",25],
[846,"Arrokuda","water","Común",70],[847,"Barraskewda","water","Rara",8],[848,"Toxel","electric","Común",70],
[849,"Toxtricity","electric","Épico",4],[850,"Sizzlipede","fire","Común",70],[851,"Centiskorch","fire","Rara",8],
[852,"Clobbopus","fighting","Común",70],[853,"Grapploct","fighting","Rara",8],[854,"Sinistea","ghost","Común",70],
[855,"Polteageist","ghost","Rara",8],[856,"Hatenna","psychic","Común",70],[857,"Hattrem","psychic","Poco Común",25],
[858,"Hatterene","psychic","Rara",8],[859,"Impidimp","dark","Común",70],[860,"Morgrem","dark","Poco Común",25],
[861,"Grimmsnarl","dark","Rara",8],[862,"Obstagoon","dark","Rara",8],[863,"Perrserker","steel","Rara",8],
[864,"Cursola","ghost","Rara",8],[865,"Sirfetch'd","fighting","Rara",8],[866,"Mr. Rime","ice","Rara",8],
[867,"Runerigus","ground","Rara",8],[868,"Milcery","fairy","Común",70],[869,"Alcremie","fairy","Rara",8],
[870,"Falinks","fighting","Poco Común",25],[871,"Pincurchin","electric","Poco Común",25],[872,"Snom","ice","Común",70],
[873,"Frosmoth","ice","Rara",8],[874,"Stonjourner","rock","Poco Común",25],[875,"Eiscue","ice","Poco Común",25],
[876,"Indeedee","psychic","Poco Común",25],[877,"Morpeko","electric","Poco Común",25],[878,"Cufant","steel","Común",70],
[879,"Copperajah","steel","Rara",8],[880,"Dracozolt","electric","Rara",8],[881,"Arctozolt","electric","Rara",8],
[882,"Dracovish","water","Rara",8],[883,"Arctovish","water","Rara",8],[884,"Duraludon","steel","Común",70],
[885,"Dreepy","dragon","Común",70],[886,"Drakloak","dragon","Poco Común",25],[887,"Dragapult","dragon","Épico",4],
[888,"Zacian","fairy","Legendario",2],[889,"Zamazenta","fighting","Legendario",2],[890,"Eternatus","poison","Legendario",2],
[891,"Kubfu","fighting","Legendario",2],[892,"Urshifu","fighting","Legendario",2],[893,"Zarude","dark","Legendario",2],
[894,"Regieleki","electric","Legendario",2],[895,"Regidrago","dragon","Legendario",2],[896,"Glastrier","ice","Legendario",2],
[897,"Spectrier","ghost","Legendario",2],[898,"Calyrex","psychic","Legendario",2],[899,"Wyrdeer","normal","Rara",8],
[900,"Kleavor","bug","Rara",8],[901,"Ursaluna","ground","Rara",8],[902,"Basculegion","water","Rara",8],
[903,"Sneasler","fighting","Rara",8],[904,"Overqwil","dark","Rara",8],[905,"Enamorus","fairy","Legendario",2]
].map(r => ({
  id:r[0], name:r[1], type:r[2], rarity:r[3], weight:r[4], region:'galar',
  img:`https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${r[0]}.png`
}));

const PALDEA_RAW = [
[906,"Sprigatito","grass","Común",70],[907,"Floragato","grass","Poco Común",25],[908,"Meowscarada","grass","Rara",8],
[909,"Fuecoco","fire","Común",70],[910,"Crocalor","fire","Poco Común",25],[911,"Skeledirge","fire","Rara",8],
[912,"Quaxly","water","Común",70],[913,"Quaxwell","water","Poco Común",25],[914,"Quaquaval","water","Rara",8],
[915,"Lechonk","normal","Común",70],[916,"Oinkologne","normal","Rara",8],[917,"Tarountula","bug","Común",70],
[918,"Spidops","bug","Rara",8],[919,"Nymble","bug","Común",70],[920,"Lokix","bug","Rara",8],
[921,"Pawmi","electric","Común",70],[922,"Pawmo","electric","Poco Común",25],[923,"Pawmot","electric","Rara",8],
[924,"Tandemaus","normal","Común",70],[925,"Maushold","normal","Rara",8],[926,"Fidough","fairy","Común",70],
[927,"Dachsbun","fairy","Rara",8],[928,"Smoliv","grass","Común",70],[929,"Dolliv","grass","Poco Común",25],
[930,"Arboliva","grass","Rara",8],[931,"Squawkabilly","normal","Poco Común",25],[932,"Nacli","rock","Común",70],
[933,"Naclstack","rock","Poco Común",25],[934,"Garganacl","rock","Rara",8],[935,"Charcadet","fire","Común",70],
[936,"Armarouge","fire","Rara",8],[937,"Ceruledge","fire","Rara",8],[938,"Tadbulb","electric","Común",70],
[939,"Bellibolt","electric","Rara",8],[940,"Wattrel","electric","Común",70],[941,"Kilowattrel","electric","Rara",8],
[942,"Maschiff","dark","Común",70],[943,"Mabosstiff","dark","Rara",8],[944,"Shroodle","poison","Común",70],
[945,"Grafaiai","poison","Rara",8],[946,"Bramblin","grass","Común",70],[947,"Brambleghast","grass","Rara",8],
[948,"Toedscool","ground","Común",70],[949,"Toedscruel","ground","Rara",8],[950,"Klawf","rock","Poco Común",25],
[951,"Capsakid","grass","Común",70],[952,"Scovillain","grass","Rara",8],[953,"Rellor","bug","Común",70],
[954,"Rabsca","bug","Rara",8],[955,"Flittle","psychic","Común",70],[956,"Espathra","psychic","Rara",8],
[957,"Tinkatink","fairy","Común",70],[958,"Tinkatuff","fairy","Poco Común",25],[959,"Tinkaton","fairy","Rara",8],
[960,"Wiglett","water","Común",70],[961,"Wugtrio","water","Rara",8],[962,"Bombirdier","flying","Poco Común",25],
[963,"Finizen","water","Común",70],[964,"Palafin","water","Rara",8],[965,"Varoom","steel","Común",70],
[966,"Revavroom","steel","Rara",8],[967,"Cyclizar","dragon","Rara",8],[968,"Orthworm","steel","Poco Común",25],
[969,"Glimmet","rock","Común",70],[970,"Glimmora","rock","Rara",8],[971,"Greavard","ghost","Común",70],
[972,"Houndstone","ghost","Rara",8],[973,"Flamigo","flying","Rara",8],[974,"Cetoddle","ice","Común",70],
[975,"Cetitan","ice","Rara",8],[976,"Veluza","water","Poco Común",25],[977,"Dondozo","water","Rara",8],
[978,"Tatsugiri","dragon","Poco Común",25],[979,"Annihilape","fighting","Rara",8],[980,"Clodsire","poison","Rara",8],
[981,"Farigiraf","normal","Rara",8],[982,"Dudunsparce","normal","Rara",8],[983,"Kingambit","dark","Rara",8],
[984,"Great Tusk","ground","Épico",4],[985,"Scream Tail","fairy","Épico",4],[986,"Brute Bonnet","grass","Épico",4],
[987,"Flutter Mane","ghost","Épico",4],[988,"Slither Wing","bug","Épico",4],[989,"Sandy Shocks","electric","Épico",4],
[990,"Iron Treads","ground","Épico",4],[991,"Iron Bundle","ice","Épico",4],[992,"Iron Hands","fighting","Épico",4],
[993,"Iron Jugulis","dark","Épico",4],[994,"Iron Moth","fire","Épico",4],[995,"Iron Thorns","rock","Épico",4],
[996,"Frigibax","dragon","Común",70],[997,"Arctibax","dragon","Poco Común",25],[998,"Baxcalibur","dragon","Épico",4],
[999,"Gimmighoul","ghost","Común",70],[1000,"Gholdengo","steel","Rara",8],[1001,"Wo-Chien","dark","Legendario",2],
[1002,"Chien-Pao","dark","Legendario",2],[1003,"Ting-Lu","dark","Legendario",2],[1004,"Chi-Yu","dark","Legendario",2],
[1005,"Roaring Moon","dragon","Épico",4],[1006,"Iron Valiant","fairy","Épico",4],[1007,"Koraidon","fighting","Legendario",2],
[1008,"Miraidon","electric","Legendario",2],[1009,"Walking Wake","water","Épico",4],[1010,"Iron Leaves","grass","Épico",4],
[1011,"Dipplin","grass","Poco Común",25],[1012,"Poltchageist","grass","Común",70],[1013,"Sinistcha","grass","Rara",8],
[1014,"Okidogi","poison","Legendario",2],[1015,"Munkidori","poison","Legendario",2],[1016,"Fezandipiti","poison","Legendario",2],
[1017,"Ogerpon","grass","Legendario",2],[1018,"Archaludon","steel","Rara",8],[1019,"Hydrapple","grass","Rara",8],
[1020,"Gouging Fire","fire","Épico",4],[1021,"Raging Bolt","electric","Épico",4],[1022,"Iron Boulder","rock","Épico",4],
[1023,"Iron Crown","steel","Épico",4],[1024,"Terapagos","normal","Legendario",2],[1025,"Pecharunt","poison","Legendario",2]
].map(r => ({
  id:r[0], name:r[1], type:r[2], rarity:r[3], weight:r[4], region:'paldea',
  img:`https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${r[0]}.png`
}));

const DATA = KANTO_DATA.concat(JOHTO_RAW).concat(HOENN_RAW).concat(SINNOH_RAW)
  .concat(UNOVA_RAW).concat(KALOS_RAW).concat(ALOLA_RAW).concat(GALAR_RAW).concat(PALDEA_RAW);

/* Para el modo evento "sólo Kanto+Johto" (ver EVENTOS/eventoVistaActiva()
   más abajo): quién pertenece a esas dos regiones, precalculado una sola
   vez porque DATA no cambia en runtime. */
const IDS_KANTO_JOHTO = new Set(DATA.filter(p => p.region === 'kanto' || p.region === 'johto').map(p => p.id));

const STORAGE_KEY = 'album-kanto-progreso';

let coins = 300;
let currentFilter = 'all';
let currentRegion = 'all';
const PACK_COST = 150;
const PACK_SIZE = 6;

const state = {};
DATA.forEach(p => state[p.id] = {got:false, dup:0});

/* ---------- Ejemplares: cada figurita que tenés es única ----------
   La pegada y cada repetida son ejemplares distintos, con su fuerza (1-100) y
   su número de serie. got/dup siguen siendo la cuenta oficial: ejemplares()
   completa la lista con sorteos nuevos y, si sobran (se canjearon repetidas),
   se pierden los más débiles. La fuerza se sortea al guardar, así recargar
   la página no la vuelve a sortear. La arena usa el más fuerte de cada uno. */
const SERIE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/* Shiny: muy raro (1 de cada 500 ejemplares nuevos), con otro color y casi siempre fuerte:
   el 85% sale entre 75 y 100 de fuerza y el resto entre 50 y 74.
   Viaja en los códigos de intercambio como fuerza+100 (101-200), así no hizo falta tocar
   la tabla del servidor: el que lo recibe lo decodifica acá. */
const PROB_SHINY = 1 / 500;
const fuerzaShiny = () => Math.random() < .85 ? 75 + Math.floor(Math.random() * 26) : 50 + Math.floor(Math.random() * 25);
function nuevoEjemplar(fuerza){
  let shiny = false;
  if(fuerza > 100 && fuerza <= 200){ shiny = true; fuerza -= 100; }
  else if(!(fuerza >= 1 && fuerza <= 100)){
    /* promedio de dos sorteos: casi todos andan por el medio, los de 90+ son raros */
    fuerza = Math.max(1, Math.round((Math.random() + Math.random()) / 2 * 100));
    if(Math.random() < PROB_SHINY){ shiny = true; fuerza = fuerzaShiny(); }
  }
  let c = '';
  for(let i = 0; i < 4; i++) c += SERIE[Math.floor(Math.random() * SERIE.length)];
  return shiny ? {f:fuerza, c, s:true} : {f:fuerza, c};
}
const codigoFuerza = e => e.f + (e.s ? 100 : 0);
/* Ilustración oficial: la shiny tiene su propia carpeta en el mismo repositorio */
/* Shiny con arte propio, hecho a medida (el de PokeAPI no gustaba). 94 = Gengar: blanco con
   ojos rojos. Los archivos están en images/shiny/ (recoloreados desde los originales). */
const SHINY_PROPIO = {
  94: {arte:'images/shiny/gengar-arte.png', icono:'images/shiny/gengar-icono.png',
       frente:'images/shiny/gengar-frente.gif', espalda:'images/shiny/gengar-espalda.gif'}
};

/* Figuritas ESPECIALES (edición especial, como las de evento): NO son parte de las 1025, no
   cuentan para el álbum ni para el ranking y no tocan a su Pokémon base (el Mewtwo común sigue
   igual). Se guardan aparte (progreso.especiales) y se pueden usar en la Arena. Por ahora sólo
   llegan por regalo. Mewtwo Acorazado: arte de Pokémon GO limpio de destellos; los sprites de la
   Arena salen de esa imagen (la espalda es la misma figura espejada y más oscura: no hay una
   vista de espaldas oficial). bst 780 = más fuerte que el Mewtwo común (680). */
const ESPECIALES = [
  {id:10150, base:150, name:'Mewtwo Acorazado', type:'psychic', rarity:'Legendario', region:'kanto', especial:true, bst:780,
   img:'images/especial/mewtwo-acorazado-arte.png', icono:'images/especial/mewtwo-acorazado-icono.png',
   frente:'images/especial/mewtwo-acorazado-frente.gif', espalda:'images/especial/mewtwo-acorazado-espalda.gif'}
];
const ESPECIAL_POR_ID = Object.fromEntries(ESPECIALES.map(e => [e.id, e]));
let especiales = {};   // id -> {f, c}: las especiales que tiene el jugador
function especialesMios(){ return ESPECIALES.filter(e => especiales[e.id]); }
function renderEspeciales(){
  const box = document.getElementById('especialesBox');
  if(!box) return;
  const mias = especialesMios();
  box.hidden = !mias.length;
  /* misma figurita que las del álbum (.slot dentro de .grid), sólo marcada como especial */
  const estrella = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>';
  box.innerHTML = mias.length ? '<h3 class="esp-tit">Especiales</h3><div class="grid esp-grid" role="list" aria-label="Figuritas especiales">' + mias.map(e =>
    `<div class="slot got especial" role="listitem" aria-label="${e.name}, figurita especial, fuerza ${especiales[e.id].f}. Se usa en la Arena" title="${e.name} · fuerza ${especiales[e.id].f}">` +
    `<div class="num">#${String(e.base).padStart(3,'0')}</div><div class="esp-tag">${estrella}</div>` +
    `<img src="${e.img}" alt="" loading="lazy"><div class="name">${e.name}</div>` +
    `<div class="typebar" style="background:${TYPE_COLORS[e.type]}"></div></div>`).join('') + '</div>' : '';
}
const imgVario = p => (SHINY_PROPIO[p.id] && SHINY_PROPIO[p.id].arte) || p.img.replace('/official-artwork/', '/official-artwork/shiny/');
/* jsDelivr bloquea algunas imágenes shiny (archivos grandes: 19 en total). Respaldo en cadena:
   1) el mismo archivo desde GitHub directo, 2) la versión normal. Se usa con onerror="respaldoShiny(this)". */
function respaldoShiny(el){
  const paso = Number(el.dataset.rs || 0);
  el.dataset.rs = paso + 1;
  if(!/^https?:/.test(el.src) || !el.src.includes('/shiny/')){ el.onerror = null; return; }
  if(paso === 0 && el.src.includes('cdn.jsdelivr.net')) el.src = el.src.replace('https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/');
  else if(paso <= 1){ el.src = el.src.replace('/shiny/', '/'); }
  else el.onerror = null;
}
const imgEj = (p, e) => e && e.s ? imgVario(p) : p.img;
const tieneShiny = id => !!(state[id].ej && state[id].ej.some(e => e && e.s));
function ejemplares(id){
  const s = state[id], n = s.got ? 1 + s.dup : 0;
  if(!Array.isArray(s.ej)) s.ej = [];
  s.ej = s.ej.filter(e => e && e.f >= 1 && e.f <= 100);
  while(s.ej.length < n) s.ej.push(nuevoEjemplar());
  if(s.ej.length > n){ s.ej.sort((a, b) => (b.f + (b.s ? 1000 : 0)) - (a.f + (a.s ? 1000 : 0))); s.ej.length = n; }   // las shiny son las últimas en irse
  return s.ej;
}
function mejorEjemplar(id){
  if(ESPECIAL_POR_ID[id]) return especiales[id] ? {f:especiales[id].f, c:especiales[id].c} : null;
  return ejemplares(id).reduce((m, e) => (!m || e.f > m.f || (e.f === m.f && e.s)) ? e : m, null);
}
function sincronizarEjemplares(){
  Object.keys(state).forEach(id => { if(state[id].got || state[id].ej) ejemplares(id); });
}
function nivelFuerza(f){
  return f >= 90 ? 'Excepcional' : f >= 70 ? 'Fuerte' : f >= 35 ? 'Normal' : 'Débil';
}
function claseFuerza(f){
  return f >= 90 ? 'f-top' : f >= 70 ? 'f-alta' : f >= 35 ? 'f-media' : 'f-baja';
}

function saveProgress(){
  sincronizarEjemplares();
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({coins, state, bolas, comprasDia, legendariosDia, maestro,
      tomados: [...advTomados], especiales}));
  }catch(e){
    console.warn('No se pudo guardar el progreso', e);
  }
}

function loadProgress(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const data = JSON.parse(raw);
    if(typeof data.coins === 'number') coins = data.coins;
    if(data.state){
      Object.keys(state).forEach(id=>{
        if(data.state[id]) state[id] = data.state[id];
      });
    }
    if(data.bolas){
      Object.keys(bolas).forEach(k=>{
        if(typeof data.bolas[k] === 'number') bolas[k] = data.bolas[k];
      });
    }
    if(data.maestro) Object.keys(maestro).forEach(k => { if(typeof data.maestro[k] === 'number') maestro[k] = data.maestro[k]; });
    if(data.comprasDia && typeof data.comprasDia === 'object') comprasDia = data.comprasDia;
    if(data.legendariosDia && data.legendariosDia.dia) legendariosDia = data.legendariosDia;
    /* Los objetos del piso son de UNA sola vez. Sin esto, recargar la página
       los hacía reaparecer a todos y se podían juntar infinitas monedas y
       pokébolas -incluida la Master Ball-. */
    if(Array.isArray(data.tomados)) data.tomados.forEach(k => advTomados.add(k));
    if(data.especiales && typeof data.especiales === 'object')
      Object.keys(data.especiales).forEach(id => { const e = data.especiales[id];
        if(ESPECIAL_POR_ID[id] && e && e.f >= 1 && e.f <= 100) especiales[id] = e; });
  }catch(e){
    console.warn('No se pudo leer el progreso guardado', e);
  }
}

function resetProgress(){
  if(MODO_SERVIDOR) return abrirPin('poner');   // con servidor el botón es para el PIN
  if(!confirm('¿Reiniciar el álbum? Perdés todas las figuritas y monedas guardadas.')) return;
  try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
  coins = 300;
  DATA.forEach(p => state[p.id] = {got:false, dup:0});
  Object.assign(bolas, BOLAS_INICIALES);
  Object.assign(maestro, {pts:0, ganadas:0, peleas:0, nivel:0});
  especiales = {};
  comprasDia = {};
  legendariosDia = {dia: null, obtenidos: {}};
  advTomados.clear();
  renderGrid();
  updateProgress();
  updateCoins();
}

/* Contraste: devuelve un color de texto que se lea (>=4.5:1) sobre `fondo`,
   oscureciendo el color pedido hacia la tinta del juego. Los colores de tipo y
   de rareza se pensaron para fondo oscuro y sobre el panel claro no se leían. */
function _lum(hex){
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); })
    .reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
}
function _contraste(a, b){
  const [x, y] = [_lum(a), _lum(b)].sort((m, n) => n - m);
  return (x + .05) / (y + .05);
}
function colorLegible(hex, fondo){
  fondo = fondo || '#EAECF5';
  const tinta = [0x1B, 0x21, 0x40], base = parseInt(hex.slice(1), 16);
  const c = [(base >> 16) & 255, (base >> 8) & 255, base & 255];
  for(let t = 0; t <= 1.001; t += .05){
    const m = c.map((v, i) => Math.round(v + (tinta[i] - v) * t));
    const h = '#' + m.map(v => v.toString(16).padStart(2, '0')).join('');
    if(_contraste(h, fondo) >= 4.5) return h;
  }
  return '#1B2140';
}
/* Texto (blanco o tinta) que mejor se lee sobre un fondo de color. */
function textoSobre(hex){
  return _contraste('#FFFFFF', hex) >= _contraste('#14172A', hex) ? '#FFFFFF' : '#14172A';
}

/* Los filtros de la Pokédex son botones de verdad (teclado y lector de
   pantalla). Al repintarlos el foco se perdería: se marca cuál tenía el foco
   y se lo devuelve al chip nuevo con el mismo valor. */
function chipFiltro(grupo, valor, texto, activo, onClick){
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip' + (activo ? ' active' : '');
  chip.textContent = texto;
  chip.dataset.valor = valor;
  chip.setAttribute('aria-pressed', activo ? 'true' : 'false');
  chip.onclick = () => {
    const teniaFoco = document.activeElement === chip;
    onClick();
    if(teniaFoco){
      const nuevo = document.querySelector('#' + grupo + ' .chip[data-valor="' + valor + '"]');
      if(nuevo) nuevo.focus();
    }
  };
  return chip;
}

function renderRegionFilters(){
  const regions = eventoVistaActiva() ? ['all', 'kanto', 'johto'] : ['all', ...new Set(DATA.map(p=>p.region))];
  const box = document.getElementById('regionFilters');
  box.innerHTML = '';
  regions.forEach(r=>{
    const chip = chipFiltro('regionFilters', r, r==='all' ? 'Todas las regiones' : REGION_LABEL[r], r===currentRegion,
      () => { currentRegion = r; renderRegionFilters(); renderGrid(); });
    if(r===currentRegion){ chip.style.background = '#2A75BB'; chip.style.color='#fff'; }
    box.appendChild(chip);
  });
}

function renderFilters(){
  const types = ['all', ...new Set(DATA.map(p=>p.type))];
  const box = document.getElementById('filters');
  box.innerHTML = '';
  types.forEach(t=>{
    const chip = chipFiltro('filters', t, t==='all' ? 'Todos los tipos' : TYPE_LABEL[t], t===currentFilter,
      () => { currentFilter = t; renderFilters(); renderGrid(); });
    if(t===currentFilter){
      const fondo = t==='all' ? '#F4C744' : TYPE_COLORS[t];
      chip.style.background = fondo;
      chip.style.color = textoSobre(fondo);
    }
    box.appendChild(chip);
  });
}

/* Durante un evento con soloRegion12, la Pokédex muestra una VISTA
   temporal: sólo Kanto+Johto, y "conseguida" significa conseguida DESPUÉS
   de que el dispositivo empezó a ver el evento (eventoBaseIds), no el
   historial real completo. state[] nunca se toca acá — es sólo lectura
   distinta para pintar la grilla; al terminar el evento vuelve a leerse
   tal cual. */
let currentBusqueda = '';
// Los filtros arrancan abiertos en pantallas anchas y plegados en el celular,
// para que las figuritas se vean sin bajar medio kilómetro.
(function(){
  const box = document.getElementById('filtrosBox');
  if(box && window.matchMedia('(min-width:720px)').matches) box.open = true;
})();
function normalizarBusqueda(t){
  return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
(function(){
  let t = null;
  const inp = document.getElementById('buscarInput');
  if(!inp) return;
  inp.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => { currentBusqueda = inp.value; renderGrid(); }, 120);
  });
  inp.addEventListener('keydown', e => { if(e.key === 'Escape' && inp.value){ e.stopPropagation(); inp.value = ''; currentBusqueda = ''; renderGrid(); } });
})();

function renderGrid(){
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  const ev = eventoVistaActiva();
  const delEvento = ev ? eventoTiene(ev) : null;
  let lista = ev ? DATA.filter(p => IDS_KANTO_JOHTO.has(p.id)) : DATA;
  lista = lista.filter(p => (currentFilter==='all' || p.type===currentFilter) && (currentRegion==='all' || p.region===currentRegion));
  /* Búsqueda: el NÚMERO sirve siempre, pero el NOMBRE sólo en las que ya
     tenés. Si no, buscar "Mewtwo" revelaría cuáles faltan y se pierde la
     gracia de descubrirlas. */
  const q = normalizarBusqueda(currentBusqueda);
  if(q){
    const num = q.replace(/^#/, '');
    lista = lista.filter(p => {
      const s = state[p.id];
      const gotV = ev ? delEvento(p.id) : s.got;
      return (/^\d+$/.test(num) && p.id === Number(num))
        || (gotV && normalizarBusqueda(p.name).includes(q));
    });
  }
  const activos = (currentFilter !== 'all' ? 1 : 0) + (currentRegion !== 'all' ? 1 : 0);
  const resumen = document.getElementById('filtrosResumen');
  if(resumen) resumen.textContent = activos ? 'Filtros · ' + activos + (activos === 1 ? ' activo' : ' activos') : 'Filtros';
  const estado = document.getElementById('buscarEstado');
  if(estado){
    estado.textContent = q
      ? (lista.length ? lista.length + (lista.length === 1 ? ' figurita' : ' figuritas')
                      : 'No hay figuritas que coincidan.')
      : '';
  }
  if(q && !lista.length){
    grid.innerHTML = '<div class="grid-vacio">No encontramos ninguna figurita con eso.<br>Buscá el nombre de una que ya tengas, o un número (ej: 25).</div>';
    return;
  }
  lista.forEach(p=>{
    const s = state[p.id];
    const gotVista = ev ? delEvento(p.id) : s.got;
    const slot = document.createElement('div');
    slot.className = 'slot' + (gotVista ? ' got' : '');
    slot.setAttribute('role', 'listitem');
    const numero = '#' + String(p.id).padStart(3,'0');
    slot.setAttribute('aria-label', gotVista
      ? numero + ' ' + p.name + (s.dup > 0 ? ', repetida, tenés ' + (s.dup + 1) : '') + (tieneShiny(p.id) ? ', shiny' : '')
      : numero + ', todavía no la tenés');
    const numTag = `<div class="num">#${String(p.id).padStart(3,'0')}</div>`;
    const dupTag = s.dup>0 ? `<div class="dup">x${s.dup+1}</div>` : '';
    const bar = `<div class="typebar" style="background:${TYPE_COLORS[p.type]}"></div>`;
    if(gotVista){
      const vario = tieneShiny(p.id);
      slot.classList.toggle('vario', vario);
      slot.innerHTML = numTag + dupTag + (vario ? '<div class="vario-tag" title="Tenés una shiny">✨</div>' : '') +
        `<img src="${vario ? imgVario(p) : p.img}" alt="" loading="lazy"${vario ? ' onerror="respaldoShiny(this)"' : ''}><div class="name">${p.name}</div>` + bar;
    } else {
      slot.innerHTML = numTag + `<div class="ball-icon"></div>` + bar;
    }
    grid.appendChild(slot);
  });
}

function updateProgress(){
  renderEspeciales();
  const ev = eventoVistaActiva();
  let got, total;
  if(ev){
    const delEvento = eventoTiene(ev);
    const listaEvento = DATA.filter(p => IDS_KANTO_JOHTO.has(p.id));
    got = listaEvento.filter(p => delEvento(p.id)).length;
    total = listaEvento.length;
  } else {
    got = Object.values(state).filter(s=>s.got).length;
    total = DATA.length;
  }
  const pct = Math.round((got/total)*100);
  document.getElementById('progressText').textContent = `${got} / ${total} figuritas`;
  document.getElementById('progressPct').textContent = `${pct}%`;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('pokedexLaunchProgress').textContent = `${got} / ${total} figuritas · ${pct}%`;
  document.getElementById('pokedexLaunchFill').style.width = pct + '%';
  updateBarras();
}

/* En la portada, bajo la Arena: tu rango de Maestro y cuánto falta para el próximo */
function pintarMaestroResumen(){
  const el = document.getElementById('maestroResumen');
  if(!el) return;
  const n = rangoPropio(), sig = RANGOS_MAESTRO[n + 1];
  el.innerHTML = '<b>' + RANGOS_MAESTRO[n].nombre + '</b> · ' + maestro.pts + ' pts' +
    (sig ? ' · ' + (sig.pts - maestro.pts) + ' para ' + sig.nombre : '');
}

function updateCoins(){
  pintarMaestroResumen();
  document.getElementById('coinAmount').textContent = coins;
  document.getElementById('openBtn').disabled = coins < PACK_COST;
  advSyncHud();
  updateBarras();
}

/* Durante un evento con soloRegion12, el sobre sólo puede dar Kanto/Johto
   (ver eventoVistaActiva() más abajo) — fuera de un evento así, es DATA
   completo como siempre. */
function poolSobre(){
  const ev = eventoVistaActiva();
  return ev ? DATA.filter(p => IDS_KANTO_JOHTO.has(p.id)) : DATA;
}

function weightedPick(){
  const pool = poolSobre();
  const total = pool.reduce((a,p)=>a+p.weight,0);
  let r = Math.random()*total;
  for(const p of pool){
    if(r < p.weight) return p;
    r -= p.weight;
  }
  return pool[pool.length-1];
}

/* La carta dorada sale por rareza. Antes había una lista suelta de ids
   "especiales" (Pikachu, Charizard, Gengar...); ahora todos esos son Épicos,
   así que la lista quedó de más y se borró: una sola fuente de verdad. */
function isSpecial(p){ return p.rarity === 'Legendario' || p.rarity === 'Épico'; }

function openPack(){
  if(MODO_SERVIDOR) return openPackServidor();
  if(coins < PACK_COST) return;
  coins -= PACK_COST;
  updateCoins();
  const pulls = [];
  for(let i=0;i<PACK_SIZE;i++){
    const p = weightedPick();
    const s = state[p.id];
    const isNew = !s.got;
    if(isNew){ s.got = true; } else { s.dup += 1; }
    pulls.push({p, isNew});
  }
  renderGrid();
  updateProgress();
  saveProgress();
  enviarPuntaje();

  const specials = pulls.filter(pull => isSpecial(pull.p));
  if(specials.length > 0){
    playSpecialSequence(specials, 0, () => showReveal(pulls));
  } else {
    showReveal(pulls);
  }
}

function playSpecialSequence(specials, index, onDone){
  if(index >= specials.length){ onDone(); return; }
  const pull = specials[index];
  const p = pull.p;
  const card = document.getElementById('specialCardWrap');
  card.style.animation = 'none';
  void card.offsetWidth;
  card.style.animation = '';

  document.getElementById('specialBanner').textContent =
    p.rarity === 'Legendario' ? '¡Figura legendaria!' :
    p.rarity === 'Épico'      ? '¡Figura épica!' : '¡Figura especial!';
  document.getElementById('specialImg').src = p.img;
  document.getElementById('specialName').textContent = p.name;
  document.getElementById('specialTag').textContent = `${pull.isNew ? '¡Nueva!' : 'Repetida'} · Tipo ${TYPE_LABEL[p.type]}`;
  document.getElementById('specialCardWrap').style.background = `linear-gradient(160deg, ${TYPE_COLORS[p.type]}33, #12172B)`;

  document.getElementById('specialOverlay').classList.add('show');

  document.getElementById('specialContinueBtn').onclick = () => {
    if(index + 1 < specials.length){
      playSpecialSequence(specials, index + 1, onDone);
    } else {
      document.getElementById('specialOverlay').classList.remove('show');
      onDone();
    }
  };
}

function showReveal(pulls, titulo){
  document.getElementById('revealTitle').textContent = titulo || 'Abriste un sobre';
  const box = document.getElementById('revealCards');
  box.innerHTML = '';
  const vistos = {};
  pulls.forEach((pull,i)=>{
    /* el ejemplar recién sacado es el último de la lista (si salió dos veces, el anteúltimo, etc.) */
    const l = ejemplares(pull.p.id), k = vistos[pull.p.id] = (vistos[pull.p.id] || 0) + 1;
    const ej = l[l.length - k] || l[l.length - 1];
    const card = document.createElement('div');
    card.className = 'reveal-card';
    card.style.animationDelay = (i*0.12)+'s';
    card.style.borderLeft = `3px solid ${TYPE_COLORS[pull.p.type]}`;
    if(ej && ej.s) card.classList.add('vario');
    card.innerHTML = `<img src="${imgEj(pull.p, ej)}" alt="${pull.p.name}"${ej && ej.s ? ' onerror="respaldoShiny(this)"' : ''}>
      <div class="rname">${pull.p.name}</div>
      <div class="tag ${pull.isNew?'new':'dup'}">${pull.isNew?'¡Nueva!':'Repetida'}</div>
      ${ej && ej.s ? '<div class="rvario">✨ ¡Shiny!</div>' : ''}
      ${ej ? `<div class="rfuerza ${claseFuerza(ej.f)}" title="${nivelFuerza(ej.f)}">💪 ${ej.f}</div>` : ''}`;
    box.appendChild(card);
  });
  document.getElementById('overlay').classList.add('show');
}

/* Carta de una figurita especial regalada (mismo cartel que el sobre). Al cerrarla sigue 'despues'. */
function mostrarEspeciales(pulls, despues){
  document.getElementById('revealTitle').textContent = '¡Figurita especial!';
  const box = document.getElementById('revealCards');
  box.innerHTML = pulls.map(pull => `<div class="reveal-card vario" style="border-left:3px solid ${TYPE_COLORS[pull.p.type]}">
      <img src="${pull.p.img}" alt="${pull.p.name}"><div class="rname">${pull.p.name}</div>
      <div class="tag new">⭐ Edición especial</div>
      <div class="rfuerza ${claseFuerza(especiales[pull.p.id].f)}">💪 ${especiales[pull.p.id].f}</div></div>`).join('');
  const ov = document.getElementById('overlay');
  ov.classList.add('show');
  if(despues){
    const obs = new MutationObserver(() => { if(!ov.classList.contains('show')){ obs.disconnect(); despues(); } });
    obs.observe(ov, {attributes:true, attributeFilter:['class']});
  }
}

/* ====================== CANJE DE REPETIDAS ====================== */
const CANJE_COSTO = 3;

function repetidasTotales(){
  return Object.values(state).reduce((a,s) => a + (s.dup || 0), 0);
}

function faltantes(){
  const ev = eventoVistaActiva();
  if(ev){
    const soloKJ = DATA.filter(p => IDS_KANTO_JOHTO.has(p.id) && !state[p.id].got);
    if(soloKJ.length) return soloKJ;
  }
  return DATA.filter(p => !state[p.id].got);
}

/* Igual que weightedPick pero dentro de una lista: el canje no puede ser
   la vía fácil para conseguir legendarias, sigue mandando la rareza. */
function elegirPesado(lista){
  const total = lista.reduce((a,p) => a + p.weight, 0);
  let r = Math.random() * total;
  for(const p of lista){
    if(r < p.weight) return p;
    r -= p.weight;
  }
  return lista[lista.length - 1];
}

function canjearRepetidas(){
  if(MODO_SERVIDOR) return canjearRepetidasServidor();
  const falta = faltantes();
  if(repetidasTotales() < CANJE_COSTO || falta.length === 0) return;

  // se descuentan primero de las que más repetidas tenés
  let restan = CANJE_COSTO;
  const ordenadas = Object.keys(state)
    .filter(id => state[id].dup > 0)
    .sort((a,b) => state[b].dup - state[a].dup);
  for(const id of ordenadas){
    while(state[id].dup > 0 && restan > 0){ state[id].dup--; restan--; }
    if(restan === 0) break;
  }

  const nueva = elegirPesado(falta);
  state[nueva.id].got = true;

  renderGrid();
  updateProgress();
  saveProgress();
  enviarPuntaje();

  if(isSpecial(nueva)){
    playSpecialSequence([{p:nueva, isNew:true}], 0, () => showReveal([{p:nueva, isNew:true}], 'Canjeaste 3 repetidas'));
  } else {
    showReveal([{p:nueva, isNew:true}], 'Canjeaste 3 repetidas');
  }
}

/* ====================== TIPOS Y FUERZA (los usa la arena, arena.js) ====================== */
/* Tabla de efectividad oficial (6ª generación en adelante).
   Sólo se listan las excepciones: lo que no figura vale x1. */
const TYPE_CHART = {
  normal:   {rock:.5, steel:.5, ghost:0},
  fire:     {grass:2, ice:2, bug:2, steel:2, fire:.5, water:.5, rock:.5, dragon:.5},
  water:    {fire:2, ground:2, rock:2, water:.5, grass:.5, dragon:.5},
  electric: {water:2, flying:2, electric:.5, grass:.5, dragon:.5, ground:0},
  grass:    {water:2, ground:2, rock:2, fire:.5, grass:.5, poison:.5, flying:.5, bug:.5, dragon:.5, steel:.5},
  ice:      {grass:2, ground:2, flying:2, dragon:2, fire:.5, water:.5, ice:.5, steel:.5},
  fighting: {normal:2, ice:2, rock:2, dark:2, steel:2, poison:.5, flying:.5, psychic:.5, bug:.5, fairy:.5, ghost:0},
  poison:   {grass:2, fairy:2, poison:.5, ground:.5, rock:.5, ghost:.5, steel:0},
  ground:   {fire:2, electric:2, poison:2, rock:2, steel:2, grass:.5, bug:.5, flying:0},
  flying:   {grass:2, fighting:2, bug:2, electric:.5, rock:.5, steel:.5},
  psychic:  {fighting:2, poison:2, psychic:.5, steel:.5, dark:0},
  bug:      {grass:2, psychic:2, dark:2, fire:.5, fighting:.5, poison:.5, flying:.5, ghost:.5, steel:.5, fairy:.5},
  rock:     {fire:2, ice:2, flying:2, bug:2, fighting:.5, ground:.5, steel:.5},
  ghost:    {psychic:2, ghost:2, dark:.5, normal:0},
  dragon:   {dragon:2, steel:.5, fairy:0},
  dark:     {psychic:2, ghost:2, fighting:.5, dark:.5, fairy:.5},
  steel:    {ice:2, rock:2, fairy:2, fire:.5, water:.5, electric:.5, steel:.5},
  fairy:    {fighting:2, dragon:2, dark:2, fire:.5, poison:.5, steel:.5}
};

function efectividad(atacante, defensor){
  const fila = TYPE_CHART[atacante] || {};
  return fila[defensor] === undefined ? 1 : fila[defensor];
}

/* Fuerza real de cada Pokémon = "base stat total" (suma de sus 6 estadísticas
   base), bajado de los datos oficiales de PokeAPI. Va del 180 de Sunkern al 720
   de Arceus. Índice = número de Pokédex - 1. */
const BST = [
  318,405,525,309,405,534,314,405,530,195,205,395,195,205,395,251,349,479,253,413,262,442,288,448,320,
  485,300,450,275,365,505,273,365,505,323,483,299,505,270,435,245,455,320,395,490,285,405,305,450,265,
  425,290,440,320,500,305,455,350,555,300,385,510,310,400,500,305,405,505,300,390,490,335,515,300,390,
  495,410,500,315,490,325,465,377,310,470,325,475,325,500,305,525,310,405,500,385,328,483,325,475,330,
  490,325,530,320,425,455,455,385,340,490,345,485,450,435,490,295,440,320,450,340,520,460,500,455,490,
  495,500,490,200,540,535,288,325,525,525,525,395,355,495,355,495,515,540,580,580,580,300,420,600,680,
  600,318,405,525,309,405,534,314,405,530,215,415,262,452,265,390,250,400,535,330,460,205,218,210,245,
  405,320,470,280,365,510,490,250,420,410,500,250,340,460,360,180,425,390,210,430,525,525,405,490,435,
  336,405,455,290,465,415,430,510,300,450,440,500,505,500,430,330,500,250,430,250,450,410,300,480,330,
  485,465,330,500,540,330,500,515,465,250,210,455,305,360,365,490,540,580,580,580,300,410,600,680,680,
  600,310,405,530,310,405,530,310,405,535,220,420,240,420,195,205,395,205,385,220,340,480,220,340,480,
  270,455,270,440,198,278,518,269,454,295,460,280,440,670,266,456,236,240,360,490,237,474,190,375,260,
  400,380,380,330,430,530,280,410,295,475,405,405,430,430,400,302,467,305,460,400,500,305,460,470,330,
  470,360,290,340,520,335,475,310,490,458,458,460,460,288,468,308,468,300,500,355,495,355,495,200,540,
  420,440,295,455,295,455,460,455,465,260,300,480,290,410,530,345,485,485,485,330,300,420,600,300,420,
  600,580,580,580,600,600,670,670,680,600,600,318,405,525,309,405,534,314,405,530,245,340,485,250,410,
  194,384,263,363,523,280,515,350,495,350,495,224,424,424,244,474,405,330,495,275,450,325,475,482,348,
  498,350,480,495,505,310,452,285,329,479,300,500,290,310,220,411,485,300,410,600,390,285,525,330,525,
  330,500,300,490,454,330,460,345,334,494,510,535,515,535,535,540,540,545,515,525,525,510,530,535,518,
  525,525,480,440,580,580,580,680,680,600,670,680,580,480,600,600,600,720,
  600,308,413,528,308,418,528,308,413,528,255,420,275,370,500,281,446,316,498,316,498,316,498,292,487,
  264,358,488,295,497,280,390,515,323,425,328,508,445,305,405,505,294,384,509,465,465,310,380,500,260,
  360,485,280,480,280,480,460,292,351,519,315,480,461,325,485,348,488,490,303,483,355,495,401,567,329,
  474,330,510,300,470,290,390,490,290,370,490,305,473,305,395,535,335,475,428,315,495,294,464,335,480,
  470,319,472,305,489,300,440,520,275,405,515,335,485,275,370,520,320,410,540,305,505,515,305,495,471,
  350,510,485,303,483,340,490,490,350,510,370,510,484,484,300,420,600,360,550,580,580,580,580,580,680,
  680,600,660,580,600,600,313,405,530,307,409,534,314,405,530,237,423,278,382,499,200,213,411,369,507,
  303,371,552,350,531,348,495,472,355,466,325,448,500,341,462,341,480,288,482,306,500,320,494,330,500,
  289,481,362,521,362,521,525,500,431,500,300,452,600,470,309,474,335,494,304,514,245,535,680,680,600,
  600,600,600,320,420,530,320,420,530,320,420,530,265,355,485,253,418,300,400,500,338,478,476,304,464,
  280,487,175,305,495,385,500,269,454,250,480,285,405,320,480,340,500,210,290,510,485,490,490,230,530,
  320,480,410,534,570,440,480,485,435,476,475,485,517,300,420,600,570,570,570,570,200,400,680,680,570,
  570,570,570,570,570,570,600,600,600,420,540,570,570,600,300,600,310,420,530,310,420,530,310,420,530,
  275,460,245,365,495,180,335,505,245,455,250,460,270,490,284,485,270,490,240,410,510,260,485,485,315,
  510,475,280,490,242,502,305,525,310,480,308,508,265,370,510,265,370,510,520,440,510,507,520,483,270,
  495,470,435,185,475,470,470,475,436,330,500,505,505,505,505,535,270,410,600,660,660,690,385,550,600,
  580,580,580,580,500,525,500,550,530,510,510,580,310,410,530,310,411,530,310,410,530,254,489,210,404,
  210,450,240,350,490,305,470,312,477,260,354,510,417,280,355,500,255,525,525,272,495,280,490,340,505,
  290,485,275,480,335,515,450,304,486,270,470,255,481,297,380,506,245,425,485,315,457,300,500,501,480,
  350,525,290,488,500,334,521,478,530,475,535,430,520,520,550,570,570,570,570,570,570,570,570,570,570,
  570,570,320,423,600,300,550,570,570,570,570,590,590,670,670,590,590,485,308,508,555,555,555,550,600,
  540,590,590,590,590,450,600
];

/* La ventaja de tipo NO es x2 acá. En el juego real el x2 se aplica al daño de
   un golpe, pero ganar un combate entero también depende de la vida y la
   defensa, que crecen con la fuerza del Pokémon. Con x2 pelado, un Magikarp
   (200) le ganaba a un Charizard (534) y eso no tiene sentido. Con x1,6 la
   ventaja de tipo sigue pesando muchísimo — le gana a cualquier rival hasta
   2,5 veces más fuerte — pero una diferencia enorme de nivel se impone.
   La inmunidad (x0) se respeta tal cual: Tierra no le llega a un Volador. */
const VENTAJA = 1.6;

function factorTipo(mult){
  if(mult === 0) return 0;
  if(mult > 1) return VENTAJA;
  if(mult < 1) return 1 / VENTAJA;
  return 1;
}

/* =================== RELOJ DE LOS JUEGOS ===================
   Sin límite de tiempo cualquiera puede sacarle una captura a la pregunta,
   pasársela a una IA y volver con la respuesta. Con el reloj corriendo hay
   que contestar de memoria. Si se vence: 0 monedas en el quiz. */
const QUIZ_SEGUNDOS    = 8;

let relojId   = null;
let relojWrap = null;

function pararReloj(){
  if(relojId){ clearInterval(relojId); relojId = null; }
}

function ocultarReloj(){
  pararReloj();
  if(relojWrap){ relojWrap.hidden = true; relojWrap = null; }
}

function arrancarReloj(id, segundos, alVencer){
  ocultarReloj();
  const wrap = document.getElementById(id);
  if(!wrap) return;
  relojWrap = wrap;
  const bar = wrap.querySelector('.timer-bar');
  const num = wrap.querySelector('.timer-num');
  wrap.hidden = false;
  wrap.classList.remove('vencido');

  const total = segundos * 1000;
  const fin   = Date.now() + total;
  const pintar = () => {
    const resta = Math.max(0, fin - Date.now());
    const frac  = resta / total;
    bar.style.width = (frac * 100) + '%';
    bar.style.background = frac > .5 ? '#3DAA5B' : (frac > .25 ? '#F0A93B' : '#E3453B');
    num.textContent = Math.ceil(resta / 1000) + 's';
    if(resta <= 0){
      pararReloj();
      wrap.classList.add('vencido');
      num.textContent = '0s';
      alVencer();
    }
  };
  pintar();
  relojId = setInterval(pintar, 100);
}

function avisoBatalla(txt){
  ocultarReloj();
  document.getElementById('battleTitle').textContent = 'Batalla de tipos';
  document.getElementById('battleStage').innerHTML = '<div class="bat-aviso">' + txt + '</div>';
  document.getElementById('battleFeedback').textContent = '';
  document.getElementById('battleOverlay').classList.add('show');
}

/* Para entrar a la arena hacen falta PELEA_MIN Pokémon de Kanto o Johto (ver arena.js). */
const PELEA_MIN = 3;
const REGIONES_ARENA = ['kanto', 'johto'];
function kantoMios(){ return DATA.filter(p => REGIONES_ARENA.includes(p.region) && state[p.id].got); }   // nombre histórico: ahora son Kanto + Johto

function updateBarras(){
  const dups = repetidasTotales();
  const tengo = DATA.filter(p => state[p.id].got).length;
  const dc = document.getElementById('dupCount');
  if(dc) dc.textContent = dups;
  const cb = document.getElementById('canjeBtn');
  if(cb) cb.disabled = dups < CANJE_COSTO || tengo === DATA.length;
  const bb = document.getElementById('battleBtn');
  if(bb) bb.disabled = kantoMios().length < PELEA_MIN;
}

const QUIZ_REWARD_CORRECT = 15;
const QUIZ_REWARD_WRONG = 5;

let quizModo = 'tipo';
let quizTarget = null;

function mezclar(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}

function startQuiz(){
  if(MODO_SERVIDOR) return startQuizServidor();
  quizModo = Math.random() < 0.5 ? 'silueta' : 'tipo';
  quizTarget = DATA[Math.floor(Math.random()*DATA.length)];

  const img = document.getElementById('quizImg');
  const nameBox = document.getElementById('quizName');
  const optBox = document.getElementById('quizOptions');

  document.getElementById('quizFeedback').textContent = '';
  optBox.innerHTML = '';
  img.classList.remove('silueta');
  img.src = quizTarget.img;

  if(quizModo === 'silueta'){
    document.getElementById('quizTitle').textContent = '¿Quién es este Pokémon?';
    img.classList.add('silueta');
    nameBox.textContent = '';

    // si la imagen no carga, la silueta queda vacía y la pregunta es imposible: se revela el nombre
    img.onerror = () => { if(quizModo === 'silueta') nameBox.textContent = quizTarget.name; };

    const otros = mezclar(DATA.filter(p => p.name !== quizTarget.name)).slice(0,3);
    mezclar([quizTarget, ...otros]).forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt';
      btn.textContent = p.name;
      btn.onclick = () => answerQuiz(p.name, quizTarget.name, optBox, btn);
      optBox.appendChild(btn);
    });
  } else {
    document.getElementById('quizTitle').textContent = '¿De qué tipo es...?';
    img.onerror = null;
    nameBox.textContent = quizTarget.name;

    const correctType = quizTarget.type;
    const otherTypes = mezclar([...new Set(DATA.map(p=>p.type))].filter(t=>t!==correctType));
    mezclar([correctType, ...otherTypes.slice(0,3)]).forEach(optType => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt';
      btn.textContent = TYPE_LABEL[optType];
      btn.style.borderColor = TYPE_COLORS[optType];
      btn.style.background = TYPE_COLORS[optType] + '22';
      btn.onclick = () => answerQuiz(optType, correctType, optBox, btn);
      optBox.appendChild(btn);
    });
  }

  document.getElementById('quizOverlay').classList.add('show');

  const correcta = quizModo === 'silueta' ? quizTarget.name : quizTarget.type;
  arrancarReloj('quizTimer', QUIZ_SEGUNDOS, () => quizSinResponder(optBox, correcta));
}

/* Se acabó el tiempo sin elegir opción: 0 monedas (ni siquiera las de consuelo
   del error) y se muestra cuál era. */
function quizSinResponder(optBox, correct){
  Array.from(optBox.children).forEach(b => b.disabled = true);
  const eraEste = quizModo === 'silueta' ? quizTarget.name : TYPE_LABEL[correct];

  if(quizModo === 'silueta'){
    document.getElementById('quizImg').classList.remove('silueta');
    document.getElementById('quizName').textContent = quizTarget.name;
  }
  Array.from(optBox.children).forEach(b => { if(b.textContent === eraEste) b.classList.add('correcta'); });

  const feedback = document.getElementById('quizFeedback');
  feedback.style.color = '#E3453B';
  feedback.textContent = `¡Se acabó el tiempo! Era ${eraEste}. 0 monedas`;
}

function answerQuiz(chosen, correct, optBox, btnElegido){
  ocultarReloj();
  Array.from(optBox.children).forEach(b => b.disabled = true);
  const acerto = chosen === correct;
  btnElegido.classList.add(acerto ? 'correcta' : 'errada');

  if(quizModo === 'silueta'){
    document.getElementById('quizImg').classList.remove('silueta');
    document.getElementById('quizName').textContent = quizTarget.name;
    if(!acerto){
      Array.from(optBox.children).forEach(b => { if(b.textContent === correct) b.classList.add('correcta'); });
    }
  }

  const feedback = document.getElementById('quizFeedback');
  if(acerto){
    coins += QUIZ_REWARD_CORRECT;
    feedback.style.color = '#3DAA5B';
    feedback.textContent = `¡Correcto! +${QUIZ_REWARD_CORRECT} monedas`;
  } else {
    coins += QUIZ_REWARD_WRONG;
    feedback.style.color = '#E3453B';
    const eraEste = quizModo === 'silueta' ? quizTarget.name : TYPE_LABEL[correct];
    feedback.textContent = `Era ${eraEste}. +${QUIZ_REWARD_WRONG} monedas de consuelo`;
  }
  updateCoins();
  saveProgress();
}

/* ====================== AVENTURA ======================
   Mapa visto desde arriba (tipo dron) recorrible a pie. Cada tecla mueve un
   casillero; pisar hierba alta, agua, ceniza del volcán o escombros de la cueva
   puede sacar un Pokémon salvaje al que se le tiran pokébolas. */

const ADV_TILE = {
  '.': {walk:true,  label:'Camino de piedra',  pinta:'camino'},
  ',': {walk:true,  label:'Pasto',             pinta:'pasto'},
  '@': {walk:true,  label:'Pasto',             pinta:'pasto'},
  '*': {walk:true,  label:'Flores',            pinta:'flores'},
  /* El agua NO se camina: se cruza por los puentes. Los Pokémon de agua salen
     pescando desde la orilla. */
  'a': {walk:true,  label:'Orilla',            pinta:'arena',  encuentro:'agua'},
  'B': {walk:true,  label:'Puente de madera',  pinta:'puente'},
  '"': {walk:true,  label:'Hierba alta',       pinta:'hierba', encuentro:'hierba'},
  '~': {walk:false, label:'Agua',              pinta:'agua'},
  '#': {walk:false, label:'Árbol',             pinta:'arbol'},
  '^': {walk:false, label:'Montaña',           pinta:'montana'},
  'V': {walk:false, label:'Volcán',            pinta:'volcan'},
  'T': {walk:false, label:'Torii',             pinta:'torii'},
  'i': {walk:false, label:'Cartel',            pinta:'cartel', cartel:true},
  'b': {walk:true,  label:'Objeto en el piso', pinta:'pisoObjeto', item:'roja'},
  'F': {walk:true,  label:'Ceniza caliente',   pinta:'ceniza', encuentro:'volcan'},
  'C': {walk:true,  label:'Entrada de cueva',  pinta:'entradaCueva', entra:'cueva'},
  'P': {walk:true,  label:'Centro Pokémon',    pinta:'centro',  accion:'centro'},
  'p': {walk:false, label:'Centro Pokémon',    pinta:'techoIzq'},
  'q': {walk:false, label:'Centro Pokémon',    pinta:'techoDer'},
  'r': {walk:false, label:'Centro Pokémon',    pinta:'paredDer'},
  'o': {walk:true,  label:'Piso de la cueva',  pinta:'pisoCueva'},
  'k': {walk:true,  label:'Escombros',         pinta:'escombros', encuentro:'cueva'},
  'L': {walk:true,  label:'Altar escondido',   pinta:'altar',   encuentro:'legendario'},
  'S': {walk:false, label:'Pared de roca',     pinta:'pared'},
  'E': {walk:true,  label:'Salida de la cueva',pinta:'salida',  entra:'overworld'},
  'N': {walk:true,  label:'Nieve',             pinta:'nieve',   encuentro:'hielo'},
  'Z': {walk:false, label:'Montaña nevada',    pinta:'montananevada'},
  'e': {walk:true,  label:'Campo eléctrico',   pinta:'campoElectrico', encuentro:'electrico'},
  'u': {walk:true,  label:'Ruinas antiguas',   pinta:'ruinas',  encuentro:'psiquico'},
  'm': {walk:true,  label:'Ciénaga',           pinta:'cienaga', encuentro:'cienaga'},
  'c': {walk:true,  label:'Moneda en el piso',  pinta:'pisoObjeto', item:'moneda'}
};

const ADV_MAPS = {
  overworld: {
    nombre:'Mundo Pokémon',
    cols:322,
    rows:[
      "##################################################################################################################################################################################################################################################################################################################################",
      "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,..............,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,.............,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,.............,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,.............,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,.............,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,.............,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,.@............,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,.............,#,#,#,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,.............,,,,,,,,,,,,,,,,,,,,aaaaaaaaaaaa~~~~~~~a,,,,,,,,,,,.............,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,.............,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,.............,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,..........T...,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,.............#######,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,.............,,,,,,,,,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,.............,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,.............,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,.............,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,...pq.........,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,...pq........#########,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,...pq........,,,,,,,,,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,....pq.......,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,....pq.......,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,....pq.......,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,...Pr.........,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,...Pr........\"\"#\"########,,,,,,,,,,,,,,,,,,^^^^^^^,,...Pr........,,,,,,,,,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,....Pr.......,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,....Pr.......,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,###,,....Pr.......,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,........i....c,,,,,,,,\",,\",,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,....c........\"\"\"\"\"\"\"#####,#,,,,,,,,,,,,,,,,^^^^^^^,,.............,,,,,,,,,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,.............,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,.............,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,##,######.............,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,..............\"\",\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,.............\"\"\"\"\"\"\"\"\"\"####,,,,,,,,,,,,,,,,^^^^^^^,,.............,,,,,,,,,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,.............,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,.............,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a########\"\"#.............,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,..............**\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,,,,,,a~~~~~~~a,,,.............\"\"\"\"\"\"\"\"\"\"\"####,,,,,,,,,,,,,,,^^^^^^^,,........c....,,,,,,,,,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,c............,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,....c........,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,#\"\"\"\"\"\"\"\"\"....c........,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,..*********\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,,,,a~~~~~~~a,,,,,##\"\"..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"###,,,,,,,,,,,,,,,,^^^^^^^,,u,u,u,..,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,..,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,..,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"..,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,..*********\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",\",,b,,,,,,,,,a~~~~~~~a,,,,,##\"#..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"####,,,,,,,,,,,,,,,^^^^^^^uuuuuuuu..,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,..\",\"\"\"\",,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,..,,\"\",\",,,,,,,,,,,,,,,,,,,,a~~~~~~~a\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"..#,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,..*********\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,,,a~~~~~~~a,,,,,,###..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"####,,,,,,,,,,,,,,,,^^^^^^^uuuuuuuu..,,,\",,,,,\",,,,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,\"..\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,\"..\"\"\"\"\"\"\"\"\",,,,,,,,,,,,,,,,,a~~~~~~~a\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"..##,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,..\"*******\"b\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,,,a~~~~~~~a,,,,,,,##..b\"\"\"\"\"\"\"\"\"\"\"\"######,,,,,,,,,,,,,,,,^^^^^^^uuLuuuuu..u\"\"\"\"\"\"\"\"\",\"\",,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,\"\"\"..\"\"\"\"\"\"\"\"\"\"\",\",,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,\"\"\"\"..\"\"\"\"\"\"\"\"\"\"\",\",,,,,,,,,,,,,a~~~~~~~a\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"..###,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,..\"\"\"\"*\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,a~~~~~~~a,,,,,,,,#..######\"\"########,,,,,,,,,,,,,,,,,,,^^^^^^^uuuuuuuu..u\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,\",\"\"\"\"..\"\"\"\"\"\"\"\"\"\"\"\",\",,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,\"\"\"\"..\"\"\"b\"\"\"\"\"\"\"\"\",,,,,,,,,,,,,a~~~~~~~a\"\"\"\"\"\"\"\"\"\"\"\"b\"\"\"\"..\",,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,,a~~~~~~~a,,,,,,,##..################,,,,,,,,,,,,,,,,,,,^^^^^^^uuuu......u\"b\"\"\"\"\"\"\"\"\"\",\",,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,\"\"\"\"\"..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,\"\"\"\"\"..\"\"\"\"\"\"\"\"\"\"\"\"\",\",,,,,,,,,,,a~~~~~~~a\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"..#,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,a~~~~~~~a,,,,,,,,,..,###########,#,,,,,,,u,uu,,,,,,,,,,^^^^^^^uuuu......u\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,\"\"\"\"\"\"\"..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,,^^^^^^^,,,,,,,,,,,\"\"\"\"\"\"\"..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",\",,,,,,,,,a~~~~~~~a\"\"\"\"\"\"L\"\"\"\"\"\"\"\"\"\"..#,#,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,,a~~~~~~~a,,,,,,,,,..,,#,,,,,,,c,,,,,,,uuuuuuuu,,,,,,,,,^^^^^^^uuuuuuuu..u\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,\"\"\"\"\"\"..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,^^^^^^^,,,,,,,,,,,\"\"\"\"L\"\"..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,a~~~~~~~a\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"..##,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,,a~~~~~~~a,,,,,,,,,..,,,,,,,,,,,,,,,,uuuuuuuuuuuu,,,,,,,^^^^^^^uuuuuuuu..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,\"\"\"\"\"\"\"..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,^^^^^^^,,,,,,,,,,\",\"\"\"\"\"\"..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,a~~~~~~~a\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"..#,,,,,,,,,,C,,,,,,,,,,,,,,,#",
      "#,,,,,,,,...................c.........\",,,,,,,,,,,a~~~~~~~a,,,,,,,,,..,,,,,,,,,,,,,,,,uuuuuuuuuuuuu,,,,,,^^^^^^^uuuuuuuu..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,b,,,\"\"\"\"\"\"\"\"..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,^^^^^^^,,,,,,,,,,,\"\"\"\"\"\"\"..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,a~~~~~~~a\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"#..#,,,,,,,ZZZZZZZZZZZZZZZ,,,,#",
      "#,,,,,,,,............................\"\",,,,,,,,,,,a~~~~~~~a,,,,,,,,,..,,,,,,,,,,,,,,,,uuuuuuuuuuuuuu,,,,,^^^^^^^,,,u\"\"\"\"......................,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,\"\"\"\"\"\"..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,^^^^^^^,,,,,,,,,,,\"\"\"\"\"\"\"..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,a~~~~~~~a##\"\"\"\"\"\"\"\"\"\"\"\"\"\"#..#,,,,,,,ZZZZZZZZZZZZZZZ,,,,#",
      "#,,,,,,,,..\",\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,..........................uuuuuuu,,,,^^^^^^^,,,,\"\"\"\"..........c..........,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,\"........\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,^^^^^^^,,,,,,,,............\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,a~~~~~~~a####\"\"\"\"\"\"\"\".......,,,,,,,,ZZZ,ZZZZZZZZZZZ,,,,#",
      "#,,,,,,,,..,,\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",\",,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,.........................uuuuuuuu,,,,^^^^^^^,,,\",\"\"\"..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,........\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,,^^^^^^^,,,,,,,,............\"\"\"\"\"\"\"\"\"\"\"\"\"\",\",,,,,,,,,,a~~~~~~~a####\"####\"\"#.......,,,,,,,,ZZZZZZZZZZZZZZZ,,,,#",
      "#,,,,,,,,..,,,,\",\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,b,,,,,,,,,e,,,,,a~~~~~~~a,,,,,,,,,..,,,,,,,,,,..,,,uuuuuuuuuuuuuuu,,,,,^^^^^^^,,,,\"\"\"\"..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,b,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,..\"\"\"\"..\"\"\"\"\"\"\"\"\"\"\"\"e\"e\",,,,,,,,,,,^^^^^^^,,,,,,,,..,,,\"\"\"\"\"..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"ee,,,,,,,,,a~~~~~~~a,,,########,,,#,,..,,,,,,,,ZZZZZZZZZZZZZZZN,,,#",
      "#,,,,,,,,..,,,,,\",,\",\"\"\"\"\"\"\"\"\",\",,,,,,,,eeeeeee,,,a~~~~~~~a,,,,,,,,,..,,,,,,,,,,..,,,,uuuuuuuuuuuuuu,,,,,^^^^^^^,,,,,\"\"\"..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,..\"\"\"\"..\"\"\"c\"\"L\"\"\"e\"eeeee,,,,,,,,,,^^^^^^^,,,,,,,,..,,,\",\"\"\"..\"\"\"c\"\"\"\"\"\"\"eeeebeee,,,,,,,a~~~~~~~a,,,,#,#,,,,#c,,,,..,,,,,,,,ZZZZZZZZZZZZZZZNN,,#",
      "#,,,,,,,,..,,,,,,,,,,,,\",,\"\",,,,,,,,,,eeeeeeeeeee,a~~~~~~~a,,,,,,,,,..,,,,,,F,FF..FFb,uuuuuuuuuuuuuu,,,,,^^^^^^^,,,,,,\"\"..\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,a~~~aaaaa~~a~~~~~~~a,,L,,,,,,,,..,,\"\"..\"\"\"\"\"\"\"\"\"eeeeeeeeeee,,,,,,,^^^^^^^,,,,,,,,..,,,,\"\"\"\"..\"\"\"\"\"\"\"\"\"\"\"eeeeeeeee,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,..,,,,,,,,ZZZZZZZZ..ZZZZZN,,,#",
      "#,,,,,,,,..,,,,,,,,,,,,,,,,,,,,,,,,,,eeeeeeeLeeeeea~~~~~~~a,,,,,,,,,..,,,,,,FFFF..FFFFuuuuuuuuuuuu,,,,,,,^^^^^^^,,,,,,,,..\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,L,,a~~aa,,,a~~a~~~~~~~a,,,,aaaa,,,..,,,,..\"\"\"\"\"\"\"\"\"eeeeeeeeeee,,,,,,,^^^^^^^,,,,,,,,..,,,,,,,,..\"\"\"\"\"\"\"\",eeeeeeeeeeee,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,..,,,,,,,,ZZZZZZZZ..ZZZZZ,,,,#",
      "#,,,,,,,,..,,,,,,,,,,,,,,,,,,,,,,,,,,eeeeeeeeeeee,a~~~~~~~a,,,,,,,,,..,,,,,FFFFF..FFFFF,,uuuuuuu,c,,,,,,,^^^^^^^,,,,,,,,..\"\"\"\"\"\"\"\"\"b,,,,,,,,,,,,,,,a~~~aaaaa~~a~~~~~~~aaaaaa~~aaaa..,,,,..,\",\",\",\"eeeeeeeeeeeee,,,,,,^^^^^^^,,,,,,,,..,,,,,,,,..,,,,,\",,,eeeeeeeeeeeee,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,..,,,,,,,,ZZZZZZZZb.ZZZZZ,,,,#",
      "#,,,,,,,,..#,,,,,,,,,,,,,,,,,,,,,,,,,eeeeeeeeeeeeea~~~~~~~a,,,,,,,,,..,,,,FFFFVV..VFFFFF,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,..,,,,,\",,,,,,,,,,,,,,,,,,,a~~~~~a~~~~a~~~~~~~a~a~~~~~~~~a..,,,,..,,,,,,,,eeeeeeeeeeeee,,,,,,^^^^^^^,,,,,,,,..,,,,,,,,..,,,,,,,,,eeeeeeeeeLeee,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,..,,,,,,,,ZZZZZZZZ..ZZZZZ,,,,#",
      "#,,,,,###...c................................eeeeea~~~~~~~a,,,,,,,,,..,,,FFFFVVV..VFFLFF,,,,,,,,,,,,b,,,,^^^^^^^,,,,,,,,..,,,,,,,,,,,,,,,,,,c,,,,,,a~~~~~~~~~~a~~~~~~~a~~~~~~~~~~~..aa,,..,,,b,,,,eeeeee..eeeee,,,,,,^^^^^^^,,,,,,,,..,,,,,,,,...................eeeeee,,,a~~~~~~~a,,,,,,,,,,,,,,,,,..,b................ZZZZZ,,,,#",
      "#,,,,,###...................................eeeeeea~~~~~~~a,,,,,,,,,..,,,,FFFFVV..VFFFFF,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,..,,,,,,,,,eeeeeeee,,,,,,,,a~~~~~~~~~~a~~~~~~~a~~~~~~~~~~~..~a,,..,,,,,,,eeeeeee..eeeeee,,,,,^^^^^^^,,,,,,,,..,,,,,,,,..................eeeeee,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,..,................ZZZZZZ,,,,#",
      "#,,,,####..#########,,,,,,,,,,,,,,,,,eeeeeeeeeeeeea~~~~~~~a,,,,,,,,,..,,,,FFFFFFVFFFFFF,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,..,,,,,,,,eeeeeeeeee,,,,,,,a~~~~~~~~~~a~~~~~~~a~~~~~~~~~~~..~a,,..,,,,,,,,eeeeee..eeeee,,,,,,^^^^^^^,,,,,,,,..,,,,,,,,..,,,,,,,,,eeeeeeeeeeee,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,..,,,,,,,,ZZZZZZZZZZZZZZZ,,,,#",
      "#,,,#####..#######,,,,,,,,,,,,,,,,,,,eeeeeeeeeeee,a~~~~~~~a,,,,,,,,,..aaaaaFFFFFFFFFFF,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,..,,,,,,,,eeeeeeeeeeaaa,,,,a~~~~~~~~~~a~~~~~~~a~~~~~~~~~~~..~aa,..,,,,,,,,eeeeee..eeeee,,,,,,^^^^^^^,,,,,,uu..,u,,,,,,..,,,,,,,,,eeeeeeeeeeee,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,..,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,#####\"\"..\"\"\"######,,,,,,,,,,,,,,,,,,,eeeeeebce,,a~~~~~~~a,,,,,,,,,..~a~a~aFFFFFFFF,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,..,,,,,,,,eeeeeeeeeea~aaaaaa~~~~~~~~~~a~~~~~~~a~~~~~~~~~~~..~~a,..,,,,,,,,,eeeee..eeee,,,,,,,^^^^^^^,,,,,uuu..uuu,,,,,..,,,,,,,,,,,eeeeeeeee,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,..,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,#####\"\"..\"\"\"\"\"#####,,,,,,,,,,,,,,,,,,,eeeeeee,,,a~~~~~~~a,,,,,,aaa..~~~~~~~~~~FaFa,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,.................eeea~~~~~aa~~~~~~~~~~a~~~~~~~a~~~~~..............,,,,,,,,,,,eeeb.eee,,,,,,,,^^^^^^^,,,uuuuub.uuuuu,,,..,,,,,,,,,,,eeeeeeee,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,..,,,,,,,,,,,,,,,,,,,,m,,,,,,#",
      "#,###\"\"\"\"....\"\"\"\"#####,,,,,,,,,,,,,,,,,,,e,e,,,,,,a~~~~~~~a,,,,aaa~~..~~~~~~~~~~~a~a,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,................eeeea~~~aaaa~~~~~~~~~~a~~~~~~~a~~~~~..............,,,,,,,,,,,,,e..,,,,,,,,,,,^^^^^^^,uuuuuuu..uuuuu,,,..,,,,,,,,,,,,,,e,,,,,,,,,,,a~~~~~~~a,,,,,,,u,uu,,,,,,..,,,,,,,,,,,,,,,,,mmmmmm,,,,#",
      "######\"\"\"....\"\"\"\"#####,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,aa~~~~..~~~~~~~~~~~~~aaa,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,..,,,,,,,,,eeeeeeeeaa~~~~~~~~~~~~~~~~~a~~~~~~~a~~~~~~~~~~~..~a,,..,,,,,,,,,,,,,,..,,,,,,,,,,,^^^^^^^,uuuuuuu..uuuuuuu,..,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,uuuuu,,,,,,..,,,,,,,,,,,,,,,mmmmmmmmm,,,#",
      "#####\"\"\"\"....\"\"\"\"\"####,,,aaaaaa,,,,,,,,,,,,,,,,,,,a~~~~~~~a,aaa~~~~~..~~~~~~~~~~~~~~~a,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,c,,..,,,,,,,,,eeeeeeeaa~~~~~~~a~~~~~~~~~~a~~~~~~~a~~~~~~~~~~~..aa,,..,,,,,,,,,,,,,,..,,,,,,,,,,,^^^^^^^,uuuuuuu..uuuuuu,,..,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,uuuuuuuuuuu,,,..,,,,,,,,,,,,,,mmmmmmmmmmm,,#",
      "#####\"\"\"\"....\"\"\"\"\"####aaaa~a~~aaa,,,,,,,,,,,,,,,,,a~~~~~~~a,a~~~~~~~..~~~~~~~~~~~~~~~aa,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,..,,,,,,,,,eeeaaaaa~~~~~~~~~~~~~~~~~~~a~~~~~~~a~~~~~~~~~~~..,,,,..,,,,,,,,,,,,,,..,,,,,,,,,,,^^^^^^^uuuuuLuu..uuuuuuu,..,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,uuuuuLuuuuuu,,..,,,,,,,,,,,,,mmmmmmmmmmmmm,#",
      "#####\"\"\"\"....b\"\"\"\"\"###a~~~~~~~~~aaaaa,,,,,,,,,,,,,a~~~~~~~a,aa~~~~~~..~~~~~~~~~~~~~~~~a,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,m..,,,,,,,,,,aaa~a~~~~~~~~~~~~~~~~~~~~~a~~~~~~~a~~~~~~~~~~a..,,,,..,,,,,,,,,,,,,,..,,,,,,,,,,,^^^^^^^uuuuuuuu..uuuuuuu,..,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,uuuuuuuuuuuuu,,..,,,,,,,,,,,,,,mmmmmmmmmmmm,#",
      "#####\"\"\"\"....\"\"\"\"\"\"####~~~~~~~~~~~~~a,,,,,,,,,,,,Ta~~~~~~~aT,a~~~~~~..~~~~~~~~~~~~~~~aa,,,,,,,,,,,,,,,,T,^^^^^^^,T,,mmmm..m,,,,,,,,,a~~~~~~~~~~~~~~~~~~~~~~~~Ta~~~~~~~aT~~~~~~~~aa..uu,,..,,,,,,,,,,,,,,..,,,,,,,,,T,^^^^^^^uTuuuuuuuuuuuuuuu,..,,,,,,,,,,,,,,,,,,,,,,,,,Ta~~~~~~~aT,uuuuuuuuuuuuu,,..,,,,,,,,,,,,,,mmmmmmmmmmm,,#",
      "#####\"\"\"\".........................................aBBBBBBBa...................................................................................................aBBBBBBBa...................................................................................................aBBBBBBBa...................,,,,,,,,,,,,,,,mmmmbmmmmm,,#",
      "####\"\"\"\"\".........................................aBBBBBBBa...................................................................................................aBBBBBBBa...................................................................................................aBBBBBBBa..................,,,,,,aaa,,,,,,,mmmmmmmmm,,,#",
      "#####\"\"\"\"\"\"\"\"\"..\"######~~~~~~~~~~~~~~~~..,,,,,,,,ia~~~~~~~ai,,a~~~~~~~~~~~~~~~~~~~~~a,,..,c,,,,,,,,,,,,i,^^^^^^^,immmmmmmmmmm..,,,,,aa~~~~~~~~~~~~~~~~~~~~~~~ia~~~~~~~ai,,,,,uuuuu..uuuuu,,,,,,,,,,,,,,,,,,,,,,,,,,i,^^^^^^^,iuuuuuuuuuuuuu,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,ia~~~~~~~ai,uuuuuuuuuuuu,u,,,,aaaaa~aaaa,,,,,mmmmmmm,,,,#",
      "######\"\"\"\"\"\"\"\"..\"#####~~~~~~~~~~~~~~~~~..,,,,uu,,,a~~~~~~~a,,,aaa~~~~~~~~~~~~~~~~~~aa,,..,,,,,,,,,,,,,,,,^^^^^^^,mmmmmmmmmmmm..,,,,,a~~~~~~~~~~~~~~~~~~~~~~~~~a~~~~~~~a,,#,,#uuuuu..uuuu,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,uuuuucuuuuu,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,uuuuuuuuuuuu,,,aac~~~~~~~~aaa,,,,,,,,,,,,,,#",
      "#,,####\"c\"\"L\"\"..\"#####~~~~~~~~~~~~~~~~a..,uuuuuuuua~~~~~~~a,,,,b~a~~~~~~~~~~~~~~~aaa,,,..,,,,,,,,,,,,,,,,^^^^^^^mmmmmmmm........,,,,a~~~~~~~~~~~~~~~~~~~~~~~~~a~~~~~~~a#########uuuuLuuuu,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,uuuuuuuuu,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,uuuuuuuuuu,,,,,a~~~~~~~~~~~~aa,,,,,,,,,,,,,#",
      "#,#####\"\"\"\"\"\"\"..#####~~~~~~~~~~~~~~~~~~..uuuuuuuuua~~~~~~~a,,,,aaaaaa~~~~~~~~~~aaa,,,,,..,,,,,,,,,,,,,,,,^^^^^^^,mmmmmmm.......,,,,,a~~~~~~~~~~~~~~~~~~~~~~~~~a~~~~~~~a#########uuuuuuu,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,uu,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,uuuuuuu,,,,,,aa~~~~~~~~~~~~~aa,,,,,,,,,,,,#",
      "#,######\"\"\"\"\"\"..#####~~~~~~~~~~~~~~~a~a..uuuuuuuuua~~~~~~~a,,,,,,,,,aaa~~aa~aaaa,,,,,,,..,,,N,,,,,,e,,,,,^^^^^^^,mmmmmmmmmmmm..,,,,,a~~~~~~~~~~~~~~~~~~~~~~~~~a~~~~~~~a##\"\"\"######uuuuu,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,aaa,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,b,u,,,,,,a~~~~~~~~~~~~~~~a,,,,,,,,,,,,#",
      "#,#,#####\"\"\"\"#..####a~~~~~~~~~~~~~~aaaa..uuuuuuuuua~~~~~~~a,,,,,,,,,,,aaaaaaa,,,,,,,,,N..NNNNNNeeeeeee,e,^^^^^^^,mmmmmmmmmmmm..,,,,,C~~~~~~~~~~~~~~~~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"#####uu,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,aa~aaaaaaa,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,a~~~~~~~~~~~~~~~a,,,,,,,,,,,,#",
      "#,,,,#########..###,aaaa~~~~~~~~~~aa,,,........uuua~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,N..NNNNNNbeeeeeeee,^^^^^^^,,,mmmmbmmmmm..,,,,^^^^^^^^^^^~~~~~~~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"#####u,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,aaaaa~~~~~~~~aa,b,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,..........~~~~~~a,,,,,,,,,,,,#",
      "#,,,,##,######..##,,,,,aaa~~aaaaaaa,,,,.......uuuua~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,NNN..NNNNNNNeeeeeeeee^^^^^^^,,,,,mmmmmm,,..,,,,^^^,^^^^^^^~~~~~~~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"\"#####,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,a~~~~~~~~~~~~~aaa,,,,,L,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,.........~~~~~~~a,,,,,,,,,,,,#",
      "#,,,,,,,,#####..#,,,,,,,,aaaa,,,,,,,,,,..uuuuuuuuua~~~~~~~a,,,,,,,,,.................................eeee^^^^^^^,,,,,m,mm,,,,.c,,,,^^^^^^^^^^^~~~~~~~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"\"\"####,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,a~~~~~~~~~~~~~~~aa,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,a~~~~~~~~~~~~~~~a,,,,,,,,,,,,#",
      "#,,,,,,,,#,,,,..,,,,,,,,,,,,,,,,,,,,,,,..uuuuuuuuua~~~~~~~a,,,,,,,,,................................eeeee^^^^^^^,,,,,,,,,,,,,..,,,,^^^^^^^^^^^~~~~~~~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"\"\"#####,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,aa~~~~~~~~~~~~~~~~aa,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,a~~~~~~~~~~~~~~aa,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,..,,,,,,,,,,,,,,,,,,,,,,,..m,uuuuuu,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,N..NNNNNNNeeeeeeeee^^^^^^^,,,,,,,,,,,,,..,,,,^^^^^^^^^^^~~~~~~~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"\"\"####,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^aa~~~~~~~~~~~~~~~~~~a,,,,,,,,,,,m,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,aaa~~~~~~~~~~~aa,,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,..,,,,,c,,,,,,,,,,,,,mmmm..mm,,,,,,,a~~~~~~~a,,,,,,,\"\"\",,,,,,,,,,,,,,,,,,..NNNNNeeeeeeLeee,^^^^^^^,,,,,,,,,,,,,..,,,,^^^^^^^^^^^~~~~~~~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"\"\"........,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^a~~~~~~~~~.........~a,,,,mmmmmmmmmmm,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,aaa~~~~~~~~ba,,,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,..,,,,,,,,,,,,,,,,,,mmmmm..mmmm,,,,,a~~~~~~~a,,,\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,,,,,..,NN,,,eeeeeeeee,^^^^^^^,,,,,,,,,,,,,..,,,,^^^^^^^^^^^~~~~~a~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"\"\"........,,,,,,,,,mm,,,,,,,,,,,,,,,,,^^^^^^^aa~~~~~~~~.........aa,,,mmmmmmmmmmmmmm,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,aaa~~aaaaa,,,,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,..,,,,,,,,,,,,,,,,,mmmmmm..mmmmm,,,,a~~~~~~~a\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,,,,..,,,,,,e,eeeeee,,^^^^^^^,,,,,,,,,,,,,..,,,,^^^^^^^^^^^~~~~~a~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"\"\"\"##,,,,,,,,,,mmmmmmmmmm,,,,,,,,,,,,,^^^^^^^,a~~~~~~~~~~~~~~~~~a,,,,mmmmmmmmmmmmmm,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,aaaa,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,..,,,,,,,,,,,,,,,,,mmmmmm..mmmmmm,,,a~~~~~~~a\"\"\"c\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,,,,,,..,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,..b,,,^^^^^^^^^^^~~~~~a~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"\"####,,,,,,,,,mmmmmmmmmmmm,m,,,,,,,,,,^^^^^^^,aa~~~~~~~~~~~~~~~aa,,mmmmmmmmmmmmmmmm,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,eeeeeee,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,..,,,,,,,,,,,,,,,mmmmmmmm..mmmmmmm,,a~~~~~~~a\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",\",,,,,,,,..,,,,,,,,C,,,,,,,^^^^^^^,,,,,,,,,,,,,..,,,,^^^^^^^^^^^~aaaaa~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"######,,,,,,,mmmmmmmmmmmmmmm,,,,,,,,,,^^^^^^^,,aa~~~~~~~~~~~~aaa,,,mmmmmmmmmmmmmmmmm,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,eeeeeeeeeee,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,..,,,,,,,,,,,,,,,,mmmmmmm........,,,a~~~~~~~a\"\"\"\"\"\"\"\"\"..\"\"\"\"\"\"\"\"\",,,,,,,,..,,,,^^^^^^^^^^^,^^^^^^^,,c,,,,,,,,,,..,,,,^^^^^^^^^^^~a,,,a~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"####,,,,,b,,mmmmmmmmmmmmmmmm,,,,,,,,,,^^^^^^^,,,aa~~~~~~~~~aaa,..............mmmmmmm,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,eeeeeeeeeee,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,..,,,,,,,,,,,,,,,,mmmmmmm........m,,a~~~~~~~a\"\"\"\"\"\"L\"\"..\"\"\"\"\"\"\"\"\"\",,,,,,,..,,,,^^^^,^^^^^^,^^^^^^^,,,,,,,,,,,,,..,,,,,,,,,,,,,,aaa,,,a~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"######,,,,,,mmmmmmmmmmmmmmmmmm,,,,,,,,,^^^^^^^,,,,aaaaa~~~aaa,,,.............mmmmmmmm,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,eeeeeeeeeee,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,..,,,,,,,,,,b,,,,,mmmmmmmmmmmmm..,,,a~~~~~~~a\"\"\"\"\"\"\"\"\"..\"\"\"\"\"\"\"\",\",,,,,,,..,,,,^^^^^^^^^^^,^^^^^^^,,,,,,,,FFFFF..FFFF,,,,,,,,,,,,,c,,a~~~~~~~~~~a~~~~~~~a####\"#####,#,,,,,.............mmmmmmmm,,,,,,,,^^^^^^^,,,,,,,,aaaaa,,,,,,,,,,mmmmmmmmmmmmmmm,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,ee.....eeeee,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,..,,,,,,,,,,,,,,,,mmmmmmmmmmmmm..,,,a~~~~~~~a\"\"\"\"\"\"\"\"\"..\"\"\"\"\"\"\"\"\"\",,,,,,,..,,,,^^^^^^^^^^^,^^^^^^^,,,,,,FFFFFFF..FFFFFF,,,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a#########,,,,,,,,............mmmmmmmm,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,mmmmmmmmmmmmm,m,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,ee....eeeee,,,,F,,,,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,..,,,,,,,,,,,,,,,,,mmmmmmmmmmmm..,,,a~~~~~~~a\"\"\"\"\"\"\"\"\"..\"\"\"\"\"\"\"\"\",,,,,,,,..,,,,^^^^^^^^^^^,^^^^^^^,,,,FFFFFFFFV..FFFFFFF,,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,#######,,,,,,,,,,,,,mmmmmmmmmmmmmmm,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,mmmmmmmmmmmmm,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,eeeeeeeeeeFFFFFFFFFF,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,..,,,,,,,,,,,,,,,,,,,mmmmmmmmm,..,,,a~~~~~~~a\"\"\"\"\"\"\"\"\"..\"\"\"\"\"\"\"\"\"\",,,,,,,..,,,,^^^^^^^^^^^,^^^^^^^,,,FFFFFFFVVVVVVVFFFFFF,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,#,#,,,,,,,,,,,,,,mmmmmmmmmmmmmmmm,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,mmmmbmmmmm,FF,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,eeeeeeeeFFFFFVFFFFFF,,,,,,,,,,#",
      "#,,ZZZZZZZZZZZ..ZZZZZZZZZZZZZZZ,,,,,,m,mm,,,,..,,,a~~~~~~~a\"\"\"\"\"\"\"\"\"..\"\"\"\"b\"\"\"\",,,,,,,,..,,,,^^^^^^^^^^^,^^^^^^^,,,FFFFFFVVVVVVVVVFFF........,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,ZZZZ.......................,,,,,,^^^^^^^,,ZZZZZZ................................F,F,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,eeeeeFFFFVVVVVVFFFFF,,,,,,,,#",
      "#,,ZZZZZZZZZNN..CZZZZZZZZZZZZZZ,,,,,,,,,,,,,,..,,,a~~~~~~~a\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,mmmmm..mmm,^^^^^^^^^^^,^^^^^^^,,FFFFFFFVVVVVVVVVFFF........NNN,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,ZZZZ.......................,,,,,,^^^^^^^,,ZZZZZZ................................FFFFF,a~~~~~~~a,,,,,,,,,,,,,,,,,,,ee,FFFFFVVVVVVVFFFF,,,,,,,,#",
      "#,,ZZZZZNNNNNN..NNNNZZZZZZZZZZZ,,c,,,,,,,FFFF..FF,a~~~~~~~a\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,mmmmmm..mmmm^^^^^^^^^^^,^^^^^^^,,,,FFLFFVVVVVVVVVVFFFFFFNN..NNNN,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,ZZNCZZNNZZZZZZZZZZZZZZZZZb.FF,,,,^^^^^^^,,ZZZCNZ..NZZZZZZZZZZZZZZ,,,,,,,,FFFFF..FFFF,,a~~~~~~~a,,,,,,,,,,,,,,,,,...............VVVLFFF,,,,,,,#",
      "#,,ZNNNNNNNNNN..NNNNNNZZZZZZZZZ,,,,,,,,,,FFFF..FFFa~~~~~~~a,\"\"\"\"\"\"\"\"\"\"\"\"\"\",,,,,mmmmmmmm..mmmm^^^^^^^^^^^,^^^^^^^,,,,FFFFVVVVVVVVVVFFFFFFNNN..NNNN,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,NNNNNNNNNNNNZZZZZZZZZZZZZZZ..FFF,,,^^^^^^^,,ZNNNNN..NNNNZZZZZZZZZZZ,,,,,,,FFFFVV..VFFFF,a~~~~~~~a,,,,,,,,,,,,,,,,,..............VVVFFFF,,,,,,,,#",
      "#,,NNNNNNNNNNN..NNNNNNNZZZZZZZZ,,,,,,,,FFFFFF..FFFa~~~~~~~a,,,\"\"\"\"\"\"\"\"\"\"\",,,,,mmmmmmmmm..mmmm^^^^^^^^^^^,^^^^^^^,,,FFFFFFVVVVVVVVVFFFFFFFNN..NNNN,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,NNNNNNNNNNNNNNNNZZZZZZZZZZZZ..FFFFF,^^^^^^^,,NNNNNN..NNNNNNZZZZZZZZZ,,,,,,,FFFVVVVVVVFFFFa~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,FFFVVVVVVFFFFF,,,,,,,,#",
      "#,NZNNNNNNNNNNNNNNNNNNNNZZZZZZZ,,,,,,,,FFFFVVVVVFFa~~~~~~~a,,,,,,\",\",\",,,,,,,,,mmmmmmmmmmmmmmmmm,,,,,,,,,^^^^^^^,,,,FFFFFFVVVVVVVFFFFFFNNNNNNNNNN,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,NNNNNNNNNNNNNNNNNNZZZZZZZZZZZZ..VFFFF,^^^^^^^,NNNNNNN..NNNNNNNZZZZZZZZ,,,,,,,FFLFVVVVVFFFFFa~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,FFFFFVVFFFFF,,,,,,,,,,#",
      "#,NNNNNNNNNNNNNNNNNNNNNNNZZZZZZ,,,,,,,FFFLFVVVVVVFa~~~~~~~a,,,,,,,,,,,,,,,,,,,,mmmmmmmmmmmmmmmmm,,,,,,,,,^^^^^^^,,,,,,FFFFFFVVVFFFFFFFFNNNNNNNNN,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,NNNNNNNNNNNNNNNNNNNNZZZZZZZZZZZZVVVLFFF^^^^^^^NNNNNNNN..NNLNNNNZZZZZZZZ,,,,,,,FFFFFFFVFFFFF,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,FFFFFFFFF,,,,,,,,,,,,#",
      "#,NNNNNNNNNNNNLNNNNNNNNNZZZZZZZ,,,,,,,,FFFFVVVVVFFa~~~~~~~a,,,,,,,,,,,,,,,,,,,,,mmmmmmmmmmmmmmm,,,,,,,,,,^^^^^^^,,,,,F,FFFFFFFFFFFFFFF,NNNNNNNNN,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,NNNNNNNNNLNNNNNNNNNZZZZZZZZZZZZVVFFFF,^^^^^^^NNNNNNNNNNNNNNNNNZZZZZZZZ,,,,,,,,FFFFFFFFFFF,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,F,F,,,,,,,,,,,,,,#",
      "#,,ZNNNNNNNNNNNNNNNNNNNZZZZZZZZ,,,,,,,,FFFFFFVFFFFa~~~~~~~a,,,,,,,,,,,,,,,,,,,c,mmmmmmmmmmmmmmm,,,,,,,,,,^^^^^^^,,,,,,,FFFFFFFFFFF,,,,,,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,NNNNNNNNNNNNNNNNNNNNZZZZZZZZZZZZFFFFF,,^^^^^^^NNNNNNNNNNNNNNNNNZZZZZZZZ,,,,,,,,,,FFFFFFF,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,ZZNNNNNNNNNNNNNNNNNZZZZZZZZZ,,,,,,,,,FFFFFFFFFFa~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,mmmmmmmmmmm,,,,,,,,,,,^^^^^^^,,,,,,,,,,,F,F,F,,,,,,,,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,NNNNNNNNNNNNNNNNNNNZZZZZZZZZZZZFFFFF,,^^^^^^^,NNNNNNNNNNNNNNNNZZZZZZZZ,,,,,,,,,,,FF,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,ZZZZNNNNNNNNNNNNZNZZZZZZZZZZ,,,,,,,,,,F,FFFFFFFa~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,mmm,,m,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,c,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,NNNNNNNNNNNNNNNNNZZZZZZZZZZZZZFFFF,,,^^^^^^^,NNNNNNNNNNNNNNNZZZZZZZZZ,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,ZZZZZZZZNNNNNZZZZZZZZZZZZZZZ,,,,,,,,,,,,FF,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,N,NNNNNNNNNZZZZZZZZZZZZZZZZZF,,,,,,^^^^^^^,,NNNNNNNNNNNZZZZZZZZZZZZ,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,ZZZZZZZZZZZZZZZZZZZZZZZZZZZZ,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,ZZNZZZNZZZZZZZZZZZZZZZZZZZ,,,,,,,^^^^^^^,,ZZZZZNZZNZZZZZZZZZZZZZZ,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,aaaaaaaaaaaa~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "##################################################################################################################################################################################################################################################################################################################################"
    ],
    /* Las franjas del río y de la cordillera van primero: advZonaDe() se queda
       con la primera zona que coincide. */
    zonas:[
      {n:'Puente del Río',            x0:49,  y0:1,   x1:59,  y1:82},
      {n:'Paso de la Cordillera',     x0:103, y0:1,   x1:113, y1:82},
      {n:'Estrecho de Hoenn',         x0:157, y0:1,   x1:167, y1:82},
      {n:'Desfiladero de Sinnoh',     x0:211, y0:1,   x1:221, y1:82},
      {n:'Puente de Teselia',         x0:265, y0:1,   x1:275, y1:82},
      {n:'Kanto · Pueblo Paleta',     x0:1,   y0:1,   x1:50,  y1:12},
      {n:'Kanto · Pradera',           x0:1,   y0:13,  x1:50,  y1:26},
      {n:'Kanto · Central Eléctrica', x0:36,  y0:27,  x1:50,  y1:40},
      {n:'Kanto · Bosque Verde',      x0:1,   y0:27,  x1:35,  y1:58},
      {n:'Kanto · Ciénaga',           x0:36,  y0:41,  x1:50,  y1:66},
      {n:'Kanto · Sierra Nevada',     x0:1,   y0:59,  x1:50,  y1:82},
      {n:'Johto · Villa Cerezo',      x0:58,  y0:1,   x1:104, y1:16},
      {n:'Johto · Ruinas',            x0:84,  y0:17,  x1:104, y1:34},
      {n:'Johto · Lago Espejo',       x0:58,  y0:17,  x1:83,  y1:55},
      {n:'Johto · Campo Eléctrico',   x0:84,  y0:35,  x1:104, y1:58},
      {n:'Johto · Pastizal',          x0:58,  y0:56,  x1:83,  y1:82},
      {n:'Johto · Ciénaga',           x0:84,  y0:59,  x1:104, y1:82},
      {n:'Hoenn · Puerto',            x0:112, y0:1,   x1:158, y1:16},
      {n:'Hoenn · Selva',             x0:112, y0:17,  x1:145, y1:30},
      {n:'Hoenn · Costa',             x0:146, y0:17,  x1:158, y1:82},
      {n:'Hoenn · Ciénaga',           x0:112, y0:31,  x1:129, y1:55},
      {n:'Hoenn · Cerro',             x0:130, y0:31,  x1:145, y1:60},
      {n:'Hoenn · Volcán',            x0:112, y0:56,  x1:145, y1:82},
      {n:'Sinnoh · Ciudad Cristal',   x0:166, y0:1,   x1:212, y1:12},
      {n:'Sinnoh · Estepa',           x0:166, y0:13,  x1:212, y1:26},
      {n:'Sinnoh · Bosque Eterna',    x0:166, y0:27,  x1:183, y1:58},
      {n:'Sinnoh · Ruinas Solaceon',  x0:184, y0:27,  x1:212, y1:40},
      {n:'Sinnoh · Gran Pantano',     x0:184, y0:41,  x1:212, y1:65},
      {n:'Sinnoh · Monte Corona',     x0:166, y0:66,  x1:212, y1:82},
      {n:'Teselia · Ciudad Arcilla',  x0:220, y0:1,   x1:266, y1:12},
      {n:'Teselia · Pastizales',      x0:220, y0:13,  x1:266, y1:26},
      {n:'Teselia · Castillo Reliquia', x0:220, y0:27,  x1:237, y1:58},
      {n:'Teselia · Llanura de las Tormentas', x0:238, y0:27,  x1:266, y1:40},
      {n:'Teselia · Puente Maravilla', x0:238, y0:41,  x1:266, y1:65},
      {n:'Teselia · Caos Gigante',    x0:220, y0:66,  x1:266, y1:82},
      {n:'Kalos · Ciudad Luminalia',  x0:274, y0:1,   x1:320, y1:12},
      {n:'Kalos · Bosque de la Vida', x0:274, y0:13,  x1:320, y1:26},
      {n:'Kalos · Reino Espectral',   x0:274, y0:27,  x1:291, y1:58},
      {n:'Kalos · Central Eléctrica', x0:292, y0:27,  x1:320, y1:45},
      {n:'Kalos · Ciénaga',           x0:292, y0:46,  x1:320, y1:58},
      {n:'Kalos · Tierra Ígnea',      x0:274, y0:59,  x1:320, y1:82}
    ],
    carteles:{
      '12,9': 'Centro Pokémon del pueblo ➜ ahí venden pokébolas.',
      '49,44': 'El puente cruza a JOHTO. Es el único paso: el río no se cruza a nado.',
      '59,44': 'Bienvenido a JOHTO. Kanto queda al oeste, cruzando el puente.',
      '103,44': 'El desfiladero lleva a HOENN. Es el único paso por la cordillera.',
      '113,44': 'Bienvenido a HOENN. Johto queda al oeste, cruzando el paso.',
      '157,44': 'El estrecho cruza a SINNOH. Es el único paso: el mar no se cruza a nado.',
      '167,44': 'Bienvenido a SINNOH. Hoenn queda al oeste, cruzando el estrecho.',
      '211,44': 'El desfiladero lleva a TESELIA. Es el único paso por la cordillera.',
      '221,44': 'Bienvenido a TESELIA. Sinnoh queda al oeste, cruzando el paso.',
      '265,44': 'El puente cruza a KALOS. Es el único paso: el río no se cruza a nado.',
      '275,44': 'Bienvenido a KALOS. Teselia queda al oeste, cruzando el puente.'
    },
    /* Cada altar tiene SUS legendarios: no salen todos del mismo lugar. */
    santuarios:{
      '209,72': {n:'Monte Corona', pokes:['Heatran']},
      '180,46': {n:'Ruinas Solaceon', pokes:['Uxie','Mesprit','Azelf']},
      '41,72': {n:'Cráter Ardiente', pokes:['Moltres']},
      '100,55': {n:'Llanura del Trueno', pokes:['Raikou']},
      '114,14': {n:'Ruinas del Cielo', pokes:['Latios','Latias','Rayquaza']},
      '254,71': {n:'Torre Dragospiral', pokes:['Reshiram','Zekrom','Kyurem']},
      '310,68': {n:'Tierra Ígnea', pokes:['Zygarde','Diancie','Volcanion']},
      '85,30': {n:'Torre Quemada', pokes:['Entei','Ho-Oh']},
      '283,39': {n:'Reino Espectral', pokes:['Hoopa']},
      '44,27': {n:'Central Eléctrica', pokes:['Zapdos']},
      '258,29': {n:'Llanura de las Tormentas', pokes:['Tornadus','Thundurus','Landorus']},
      '232,72': {n:'Cueva Sellada', pokes:['Cobalion','Terrakion','Virizion']},
      '225,39': {n:'Castillo Reliquia', pokes:['Victini']},
      '184,73': {n:'Cueva de la Luna', pokes:['Cresselia']},
      '118,68': {n:'Falda del Volcán', pokes:['Groudon']},
      '14,73': {n:'Cima Nevada', pokes:['Articuno']},
      '281,17': {n:'Bosque de la Vida', pokes:['Xerneas']},
      '235,18': {n:'Escenario Melódico', pokes:['Meloetta']},
      '65,61': {n:'Claro del Lago', pokes:['Lugia','Suicune']},
      '192,25': {n:'Bosque Eterna', pokes:['Shaymin']},
      '11,46': {n:'Claro del Bosque', pokes:['Mew']},
      '144,27': {n:'Mirador del Mar', pokes:['Kyogre']},
      '244,51': {n:'Cascada del Guerrero', pokes:['Keldeo']},
      '169,26': {n:'Lago Verity', pokes:['Manaphy']}
    }
  },
  cueva: {
    nombre:'Cueva Secreta',
    cols:20,
    rows:[
      "SSSSSSSSSESSSSSSSSSS",
      "SooooooooooooooooooS",
      "SokkkkkkkkkkkkkkkkoS",
      "SokkkkkkooookkkkkkoS",
      "SoooSSSSooooSSSSoooS",
      "SoooSSSSokkoSSSSoooS",
      "SoboSSSSokkoSSSSoooS",
      "SoooSSSSokkoSSSSoooS",
      "SoooSSSSokkoSSSSoooS",
      "SoooSSSSooooSSSSoooS",
      "SoookkkkkkkkkkkkoboS",
      "SoookkbkkkkkkkkkoooS",
      "SSSSSSSSoLooSSSSSSSS",
      "SSSSSSSSSSSSSSSSSSSS"
    ],
    zonas:[
      {n:'Cueva Secreta', x0:1, y0:1,  x1:18, y1:11},
      {n:'El Altar',      x0:8, y0:12, x1:11, y1:12}
    ],
    carteles:{},
    /* El altar del fondo saca el legendario de la región por la que bajaste. */
    santuariosPorRegion:{
      kanto: {n:'Altar de la Cueva de Kanto', pokes:['Mewtwo']},
      johto: {n:'Altar de la Cueva de Johto', pokes:['Celebi']},
      hoenn: {n:'Altar de la Cueva de Hoenn', pokes:['Regirock','Regice','Registeel','Jirachi','Deoxys']},
      sinnoh: {n:'Pilar Lanza', pokes:['Dialga','Palkia','Giratina','Arceus','Darkrai','Regigigas']},
      unova: {n:'Laboratorio Congelado', pokes:['Genesect']},
      kalos: {n:'Guarida del Caos', pokes:['Yveltal']}
    }
  }
};

/* Qué tipos salen en cada bioma. Las legendarias NO entran en los biomas
   normales: se consiguen en el altar de la cueva o de casualidad (ver
   PROB_LEGENDARIA_SUELTA), para que sigan siendo difíciles de encontrar. */
const ADV_TIPOS = {
  hierba:    ['grass','bug','normal','poison','fairy'],
  agua:      ['water'],
  volcan:    ['fire','rock','ground','dragon'],
  cueva:     ['rock','ground','steel','dark','ghost','fighting'],
  hielo:     ['ice'],
  /* 'flying' se sumó acá (06/09 la nota decía "no hay flying" porque sólo
     estaban Kanto/Johto/Hoenn; con Teselia y Kalos ya hay voladores puros
     -Tornadus, Bombirdier, etc- y no tenían NINGÚN bioma. Zapdos ya probaba
     que eléctrico+volador combinan bien en este mundo). */
  electrico: ['electric','steel','flying'],
  psiquico:  ['psychic','ghost','fairy'],
  cienaga:   ['poison','ground','bug']
};
/* Probabilidad por casillero caminado. Bajas a propósito: con .18 no se podía
   dar tres pasos sin que saltara un encuentro. */
const ADV_PROB = { hierba:.07, agua:.06, volcan:.08, cueva:.07, hielo:.08,
                   electrico:.08, psiquico:.08, cienaga:.08, legendario:.12 };
const DESCANSO_ENCUENTRO = 64;   // píxeles a caminar tras un encuentro antes de que salga otro

/* Probabilidad real de encuentro para un bioma: durante un evento con
   boostEncuentrosFactor se multiplica, salvo 'legendario' — ese ya tiene su
   propio boost (cooldown de 15 min en vez de 1 por día), así que subirle
   también la probabilidad de encuentro sería duplicar el empujón. */
function probEncuentro(bioma){
  const base = ADV_PROB[bioma] || .15;
  const ev = eventoActivo();
  if(ev && ev.boostEncuentrosFactor && bioma !== 'legendario') return Math.min(.9, base * ev.boostEncuentrosFactor);
  return base;
}
/* El avistamiento ya no exige pisar el altar: alcanza con andar cerca. La
   cámara se aleja sola en advEscala() según haga falta para que jugador y
   altar entren los dos en pantalla. Radio chico a propósito (Zeta pidió que
   salgan menos seguido): que sea de verdad raro, no algo que pasa en
   cualquier paso por la cueva o cerca de cualquier altar del mundo. */
const RADIO_AVISTAMIENTO = 6;   // casilleros de distancia (Chebyshev) al altar

/* Los PNG de las bolas salen del mismo CDN que las figuritas (sprites de items
   de PokeAPI): son pixel-art, así que pegan con el mapa. */
const ITEM_CDN = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/';
const BOLAS = {
  roja:    {nombre:'Poké Ball',   img:ITEM_CDN + 'poke-ball.png',   precio:50,  cantidad:6, mult:1,   desc:'La común. Se venden de a 6.'},
  azul:    {nombre:'Súper Ball',  img:ITEM_CDN + 'great-ball.png',  precio:60,  cantidad:1, mult:1.6, desc:'Atrapa bastante mejor que la roja.'},
  ultra:   {nombre:'Ultra Ball',  img:ITEM_CDN + 'ultra-ball.png',  precio:120, cantidad:1, mult:2.6, desc:'La negra y amarilla: la mejor sin ser segura.'},
  maestra: {nombre:'Master Ball', img:ITEM_CDN + 'master-ball.png', precio:500, cantidad:1, mult:99, seguro:true, porDia:1,
            desc:'La violeta. Atrapa SIEMPRE, hasta un legendario. Sale carísima y sólo se vende 1 por día.'}
};

/* Tope diario de la Master Ball. El día se toma del reloj del dispositivo con
   la zona de Jujuy: es un juego familiar, no vale la pena blindarlo contra
   alguien que se cambie la hora del celular. */
const ZONA_HORARIA = 'America/Argentina/Jujuy';
function diaDeHoy(){
  try{ return new Date().toLocaleDateString('en-CA', {timeZone: ZONA_HORARIA}); }
  catch(e){ return new Date().toISOString().slice(0, 10); }
}
let comprasDia = {};                 // {'2026-09-06': {maestra:1}}

/* =================== MODO EVENTO =================== */
/* Sistema genérico para eventos presenciales cortos: cada entrada de EVENTOS
   define nombre + ventana [inicio,fin] (con huso horario explícito, así no
   depende de en qué zona esté el dispositivo) + un slug que separa su
   ranking del de cualquier otro evento futuro. Para el próximo evento
   alcanza con agregar una entrada nueva acá — nada más de esto cambia. */
const EVENTOS = [
  {
    slug: 'aniversario-pachamanga-2026-10',
    nombre: 'Evento Aniversario Pachamanga',
    inicio: '2026-10-03T19:45:00-03:00',
    fin:    '2026-10-03T23:00:00-03:00',
    cooldownLegendarioMin: 15,
    cooldownCompraMaestraMin: 5,
    soloRegion12: true,
    boostEncuentrosFactor: 1.7,
    boostPokebolasPiso: true
  },
  {
    /* Halloween (pedido por Zeta el 24/10): sólo Kanto y Johto (sobres, aventura, regalos), el
       mapa de Hoenn en adelante clausurado con calabazas, más Pokémon en el pasto, legendarios
       cada 15 min, y ranking de Pokémon ATRAPADOS en la Aventura. Al terminar, los 3 primeros
       quedan para siempre en "Ganadores de eventos" y les llega el premio solo (lo entrega el
       servidor, ver resolverEventos en pokemon-servidor). */
    slug: 'halloween-2026',
    nombre: '¡PACHAMANGA FEST: EDICIÓN HALLOWEEN!',
    inicio: '2026-10-24T15:00:00-03:00',
    fin:    '2026-10-24T20:00:00-03:00',
    cooldownLegendarioMin: 15,
    soloRegion12: true,
    boostEncuentrosFactor: 1.7,
    mapaCerradoDesdeX: 109,           // de Hoenn en adelante (Johto llega hasta la columna 108)
    ranking: 'capturas',
    tema: 'halloween',
    subtitulo: 'Sólo Kanto y Johto · suman los Pokémon que atrapes en la Aventura y las figuritas nuevas de tus sobres',
    premios: [
      {texto: 'Mewtwo Acorazado + Gengar shiny + 2 legendarias + 2 épicas + 5000 monedas + 30 Poké Ball, 15 Súper Ball, 10 Ultra Ball y 3 Master Ball',
        monedas: 5000, especiales: [10150], shiny: [94], legendarias: 2, epicas: 2, bolas: {roja: 30, azul: 15, ultra: 10, maestra: 3}},
      {texto: 'Gengar shiny + 2 legendarias + 1 épica + 3000 monedas + 20 Poké Ball, 10 Súper Ball, 5 Ultra Ball y 1 Master Ball',
        monedas: 3000, shiny: [94], legendarias: 2, epicas: 1, bolas: {roja: 20, azul: 10, ultra: 5, maestra: 1}},
      {texto: '1 legendaria + 1 épica + 2000 monedas + 15 Poké Ball, 5 Súper Ball y 3 Ultra Ball',
        monedas: 2000, legendarias: 1, epicas: 1, bolas: {roja: 15, azul: 5, ultra: 3}},
      {texto: '1 legendaria + 1200 monedas + 10 Poké Ball y 3 Ultra Ball',
        monedas: 1200, legendarias: 1, bolas: {roja: 10, ultra: 3}},
      {texto: '1 épica + 800 monedas + 10 Poké Ball',
        monedas: 800, epicas: 1, bolas: {roja: 10}}
    ]
  }
];

function eventoActivo(){
  const ahora = Date.now();
  return EVENTOS.find(e => {
    const ini = new Date(e.inicio).getTime();
    const fin = new Date(e.fin).getTime();
    return ahora >= ini && ahora < fin;
  }) || null;
}

/* Evento activo que además restringe el pool a Kanto+Johto (sobres,
   Aventura y la vista de la Pokédex). Un evento futuro puede no tener
   soloRegion12 y entonces no entra por acá — sigue dando las 9 regiones. */
function eventoVistaActiva(){
  const ev = eventoActivo();
  return (ev && ev.soloRegion12) ? ev : null;
}

/* Cooldown de legendarios: normalmente "una vez por día calendario" (ver
   diaDeHoy() arriba); durante un evento con cooldownLegendarioMin, en vez
   de por día se resetea cada tantos minutos. Devuelve un string opaco que
   sólo se usa para comparar igualdad, nunca se parsea como fecha. */
function claveCooldownLegendario(){
  const ev = eventoActivo();
  if(ev && ev.cooldownLegendarioMin){
    const bloqueMs = ev.cooldownLegendarioMin * 60000;
    return 'evento:' + ev.slug + ':' + Math.floor(Date.now() / bloqueMs);
  }
  return diaDeHoy();
}

/* Mismo patrón que claveCooldownLegendario(), pero para el tope de compra
   de la Master Ball: normalmente 1 por día, durante un evento con
   cooldownCompraMaestraMin pasa a 1 cada tantos minutos. */
function claveCooldownCompra(){
  const ev = eventoActivo();
  if(ev && ev.cooldownCompraMaestraMin){
    const bloqueMs = ev.cooldownCompraMaestraMin * 60000;
    return 'evento:' + ev.slug + ':' + Math.floor(Date.now() / bloqueMs);
  }
  return diaDeHoy();
}

function compradasHoy(tipo){
  const hoy = claveCooldownCompra();
  return (comprasDia[hoy] || {})[tipo] || 0;
}
function puedeComprar(tipo){
  const b = BOLAS[tipo];
  if(coins < b.precio) return false;
  return !b.porDia || compradasHoy(tipo) < b.porDia;
}
const BOLA_IMG = {};
Object.keys(BOLAS).forEach(t => {
  const im = new Image();
  im.crossOrigin = 'anonymous';   // hace falta para poder leerle los píxeles y agregarle contorno
  im.src = BOLAS[t].img;
  BOLA_IMG[t] = im;
});
const BOLAS_INICIALES = {roja:5, azul:0, ultra:0, maestra:0};
const bolas = Object.assign({}, BOLAS_INICIALES);
/* Puntos de Maestro Pokémon: sólo se suman ganando en la arena y van al
   ranking de Maestros. 'nivel' = último rango cuyo premio ya se cobró. */
const maestro = {pts:0, ganadas:0, peleas:0, nivel:0};
const RANGOS_MAESTRO = [
  {pts:0,    nombre:'Entrenador Novato'},
  {pts:100,  nombre:'Entrenador',        premio:{monedas:150, bolas:{azul:3}}},
  {pts:1000, nombre:'Líder de Gimnasio', premio:{monedas:1000, bolas:{ultra:4}}},
  {pts:3000, nombre:'Alto Mando',        premio:{monedas:2500, bolas:{maestra:2}}},
  {pts:7000, nombre:'Campeón',           premio:{monedas:5000, legendarias:1, bolas:{maestra:3}}},
  {pts:15000, nombre:'Maestro Pokémon',   premio:{monedas:12000, legendarias:2, bolas:{maestra:6}}}
];
const NOMBRE_BOLA = {roja:'Poké Ball', azul:'Súper Ball', ultra:'Ultra Ball', maestra:'Master Ball'};
/* Un rango ya cobrado no se pierde aunque se muevan los puntajes */
function rangoPropio(){ return Math.max(rangoMaestro(maestro.pts), maestro.nivel); }
function rangoMaestro(pts){
  let n = 0;
  RANGOS_MAESTRO.forEach((x, i) => { if(pts >= x.pts) n = i; });
  return n;
}
function textoPremioRango(pr){
  const partes = [];
  if(pr.monedas) partes.push(pr.monedas + ' monedas');
  if(pr.legendarias) partes.push(pr.legendarias + ' legendaria' + (pr.legendarias > 1 ? 's' : ''));
  Object.keys(pr.bolas || {}).forEach(t => partes.push(pr.bolas[t] + ' ' + NOMBRE_BOLA[t]));
  return partes.join(' + ');
}
/* Paga los premios de los rangos alcanzados que todavía no se cobraron.
   Devuelve qué subió, para mostrarlo al final de la pelea. */
function cobrarRangosMaestro(){
  const subidas = [], hasta = rangoMaestro(maestro.pts);
  for(let i = maestro.nivel + 1; i <= hasta; i++){
    const pr = RANGOS_MAESTRO[i].premio || {};
    coins += pr.monedas || 0;
    Object.keys(pr.bolas || {}).forEach(t => { bolas[t] = (bolas[t] || 0) + pr.bolas[t]; });
    const leg = [];
    for(let k = 0; k < (pr.legendarias || 0); k++){ const pull = regalarLegendaria(); if(pull) leg.push(pull.p.name); }
    if(leg.length){ renderGrid(); updateProgress(); }
    subidas.push({nombre:RANGOS_MAESTRO[i].nombre, premio:textoPremioRango(pr) + (leg.length ? ' (' + leg.join(', ') + ')' : '')});
    maestro.nivel = i;
  }
  return subidas;
}

/* Un color por rareza, para que se lea de un vistazo qué salió. */
const RAREZA_COLOR = {'Común':'#B9C6DA', 'Poco Común':'#6FD08C', 'Rara':'#5AA9F0',
                      'Épico':'#C77DFF', 'Legendario':'#F0B400'};
const CAPTURA_BASE = {'Común':70, 'Poco Común':50, 'Rara':25, 'Épico':12, 'Legendario':6};
const ENC_TIROS = 3;

function chanceCaptura(p, tipoBola){
  if(BOLAS[tipoBola].seguro) return 100;       // la Master no falla nunca
  const base = CAPTURA_BASE[p.rarity] || 40;
  return Math.max(3, Math.min(95, Math.round(base * BOLAS[tipoBola].mult)));
}

/* El mundo tiene 6 regiones y CADA UNA saca sus propios Pokémon: de oeste a
   este, Kanto/Johto/Hoenn/Sinnoh/Teselia(unova)/Kalos, separadas por 5
   cruces (río, cordillera, estrecho, desfiladero, río) que alternan puente y
   desfiladero — ver genmundo3.py. */
const ADV_REGIONES = ['kanto', 'johto', 'hoenn', 'sinnoh', 'unova', 'kalos'];
const ADV_DATA = DATA.filter(p => ADV_REGIONES.includes(p.region));
/* El corte cae en el medio de cada cruce, así que el puente/paso queda
   repartido entre las dos regiones que une. */
const FRONTERAS = [{hasta:54, region:'kanto'}, {hasta:108, region:'johto'}, {hasta:162, region:'hoenn'}, {hasta:216, region:'sinnoh'}, {hasta:270, region:'unova'}, {hasta:9999, region:'kalos'}];
const NOMBRE_REGION = {kanto:'KANTO', johto:'JOHTO', hoenn:'HOENN', sinnoh:'SINNOH', unova:'TESELIA', kalos:'KALOS'};

function regionDe(x){
  return (FRONTERAS.find(f => x <= f.hasta) || FRONTERAS[0]).region;
}

/* Dentro de la cueva manda la región de la entrada por la que se bajó. */
let advRegion = 'kanto';

/* ---------- Legendarios: cada altar tiene el suyo, y cada NOMBRE sale a lo
   sumo UNA vez por día ---------- El cupo es por legendario, no por altar ni
   compartido entre todos: el mismo día pueden salir Mew Y Articuno, cada uno
   una sola vez. */
let legendariosDia = {dia: null, obtenidos: {}};   // {dia:'2026-09-06', obtenidos:{Mewtwo:'Cima de la Sierra'}}

/* Todos los altares del mapa actual, con su casillero. La cueva tiene un solo
   altar fijo por mapa (el mismo dibujo para las 3 regiones): se ubica una vez
   buscando la 'L' en las filas y se cachea en el propio objeto del mapa. */
function altaresDelMapaActual(){
  const mapa = ADV_MAPS[advMapa];
  if(mapa.santuarios){
    return Object.keys(mapa.santuarios).map(clave => {
      const [x, y] = clave.split(',').map(Number);
      return {x, y, santuario: mapa.santuarios[clave]};
    });
  }
  if(mapa.santuariosPorRegion){
    if(!mapa._altarXY){
      for(let y = 0; y < mapa.rows.length; y++){
        const x = mapa.rows[y].indexOf('L');
        if(x !== -1){ mapa._altarXY = {x, y}; break; }
      }
    }
    const santuario = mapa.santuariosPorRegion[advRegion];
    return (mapa._altarXY && santuario) ? [{x: mapa._altarXY.x, y: mapa._altarXY.y, santuario}] : [];
  }
  return [];
}

/* El altar más cercano al casillero (cx,cy), con la distancia Chebyshev
   (la que importa para "entra en pantalla", no la diagonal real). */
function altarMasCercano(cx, cy){
  let mejor = null;
  for(const a of altaresDelMapaActual()){
    const dist = Math.max(Math.abs(a.x - cx), Math.abs(a.y - cy));
    if(!mejor || dist < mejor.dist) mejor = {x: a.x, y: a.y, santuario: a.santuario, dist};
  }
  return mejor;
}

function legendarioYaSalioHoy(nombre){
  if(!legendariosDia.dia || legendariosDia.dia !== claveCooldownLegendario()) return false;
  return !!legendariosDia.obtenidos[nombre];
}

/* "Agotado" ahora es simplemente "legendarioDelAltar no tiene candidato",
   sea porque ya salieron todos (cooldown) o porque ninguno de los legendarios
   de ESTE santuario cae en Kanto/Johto durante un evento soloRegion12 (ej.
   Ruinas Antiguas en Hoenn: Regirock/Regice/Registeel/Jirachi/Deoxys). Una
   sola fuente de verdad en vez de duplicar el filtro en dos funciones. */
function legendariosAgotadosHoy(santuario){
  return legendarioDelAltar(santuario) === null;
}

function legendarioDelAltar(santuario){
  const ev = eventoVistaActiva();
  const posibles = santuario.pokes
    .map(n => ADV_DATA.find(p => p.name === n))
    .filter(p => p && !legendarioYaSalioHoy(p.name))
    .filter(p => !ev || IDS_KANTO_JOHTO.has(p.id));
  if(!posibles.length) return null;
  return posibles[Math.floor(Math.random() * posibles.length)];
}

function anotarLegendario(p, santuario){
  const clave = claveCooldownLegendario();
  if(!legendariosDia.dia || legendariosDia.dia !== clave) legendariosDia = {dia: clave, obtenidos: {}};
  legendariosDia.obtenidos[p.name] = santuario.n;
  saveProgress();
}

/* ---------- Avistamiento: el legendario se ve parado en el altar ----------
   Cuando el tiro de dados de tirarAltar() sale bien, el Pokémon se muestra un
   instante sobre el altar, en el mundo, antes de pasar a la pantalla de
   captura — como un avistamiento. El sprite sale de bajar de resolución la
   imagen real (misma idea que las pokébolas del piso), no
   de un dibujo a mano: sería un montón de legendarios distintos para pintar
   pixel por pixel. */
const LEG_SPRITE_CACHE = {};
const LEG_TAM = 52;   // lado mayor del sprite en píxeles de mundo (el tile mide 16)

/* Paleta por "median cut": parte la nube de colores en cajas por el canal de
   más rango hasta tener n, y cada caja se resume en su promedio. Con pocos
   colores (y bien elegidos) la reducción lee como pixel art dibujado a mano
   en vez de una miniatura lavada. */
function paletaMedianCut(pixeles, n){
  let cajas = [pixeles];
  while(cajas.length < n){
    let mejor = -1, mejorPuntaje = 0, mejorCanal = 0;
    cajas.forEach((c, i) => {
      if(c.length < 2) return;
      for(let k = 0; k < 3; k++){
        let mn = 255, mx = 0;
        c.forEach(px => { if(px[k] < mn) mn = px[k]; if(px[k] > mx) mx = px[k]; });
        const puntaje = (mx - mn) * Math.sqrt(c.length);
        if(puntaje > mejorPuntaje){ mejorPuntaje = puntaje; mejor = i; mejorCanal = k; }
      }
    });
    if(mejor < 0) break;
    const c = cajas[mejor].slice().sort((x, y) => x[mejorCanal] - y[mejorCanal]);
    const mitad = c.length >> 1;
    cajas.splice(mejor, 1, c.slice(0, mitad), c.slice(mitad));
  }
  return cajas.map(c => {
    const t = c.length || 1;
    return [0, 1, 2].map(k => Math.round(c.reduce((a, px) => a + px[k], 0) / t));
  });
}

/* Imagen grande -> sprite pixel art: recorta al contenido, achica por pasos
   (mitad por mitad, con suavizado, para promediar bien en vez de saltear
   píxeles), corta la transparencia a todo-o-nada, aviva color y contraste
   (al achicar todo se lava), reduce a una paleta chica y rodea con un
   contorno del tono oscuro del propio color en vez de negro parejo. */
function pixelarImagen(img, lado){
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
  const t = document.createElement('canvas'); t.width = W; t.height = H;
  const tctx = t.getContext('2d'); tctx.drawImage(img, 0, 0);
  const d0 = tctx.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){
    if(d0[(y * W + x) * 4 + 3] > 40){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
  }
  if(x1 <= x0 || y1 <= y0) return null;
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const k = lado / Math.max(cw, ch);
  const w = Math.max(1, Math.round(cw * k)), h = Math.max(1, Math.round(ch * k));

  let cur = document.createElement('canvas'); cur.width = cw; cur.height = ch;
  cur.getContext('2d').drawImage(t, x0, y0, cw, ch, 0, 0, cw, ch);
  let cw2 = cw, ch2 = ch;
  while(cw2 / 2 > w * 1.2 && ch2 / 2 > h * 1.2){
    cw2 = Math.round(cw2 / 2); ch2 = Math.round(ch2 / 2);
    const n = document.createElement('canvas'); n.width = cw2; n.height = ch2;
    const nc = n.getContext('2d'); nc.imageSmoothingEnabled = true; nc.imageSmoothingQuality = 'high';
    nc.drawImage(cur, 0, 0, cw2, ch2); cur = n;
  }
  const fin = document.createElement('canvas'); fin.width = w; fin.height = h;
  const fctx = fin.getContext('2d'); fctx.imageSmoothingEnabled = true; fctx.imageSmoothingQuality = 'high';
  fctx.drawImage(cur, 0, 0, w, h);
  const id = fctx.getImageData(0, 0, w, h), d = id.data;

  const pix = [];
  for(let i = 0; i < d.length; i += 4){
    if(d[i + 3] < 120){ d[i + 3] = 0; continue; }
    d[i + 3] = 255;
    const gris = .3 * d[i] + .59 * d[i + 1] + .11 * d[i + 2];
    for(let c = 0; c < 3; c++){
      let v = gris + (d[i + c] - gris) * 1.3;          // más color
      v = (v - 128) * 1.12 + 128;                       // más contraste
      d[i + c] = Math.max(0, Math.min(255, Math.round(v)));
    }
    pix.push([d[i], d[i + 1], d[i + 2]]);
  }
  if(!pix.length) return null;
  const pal = paletaMedianCut(pix, 18);
  const cercano = (r, g, b) => {
    let mj = pal[0], md = 1e9;
    for(const c of pal){
      const dd = (c[0] - r) * (c[0] - r) + (c[1] - g) * (c[1] - g) + (c[2] - b) * (c[2] - b);
      if(dd < md){ md = dd; mj = c; }
    }
    return mj;
  };
  for(let i = 0; i < d.length; i += 4){
    if(!d[i + 3]) continue;
    const c = cercano(d[i], d[i + 1], d[i + 2]);
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
  }
  fctx.putImageData(id, 0, 0);

  // contorno: 1px alrededor, del tono oscuro del vecino opaco más cercano
  const out = document.createElement('canvas'); out.width = w + 2; out.height = h + 2;
  const octx = out.getContext('2d');
  octx.drawImage(fin, 1, 1);
  const od = octx.getImageData(0, 0, w + 2, h + 2), o = od.data, W2 = w + 2, H2 = h + 2;
  const copia = new Uint8ClampedArray(o);
  const op = (x, y) => x >= 0 && y >= 0 && x < W2 && y < H2 && copia[(y * W2 + x) * 4 + 3] > 0;
  for(let y = 0; y < H2; y++) for(let x = 0; x < W2; x++){
    if(op(x, y)) continue;
    const vec = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].find(([a, b]) => op(a, b));
    if(!vec) continue;
    const j = (vec[1] * W2 + vec[0]) * 4, i = (y * W2 + x) * 4;
    o[i] = Math.round(copia[j] * .22 + 6); o[i + 1] = Math.round(copia[j + 1] * .22 + 4); o[i + 2] = Math.round(copia[j + 2] * .22 + 8); o[i + 3] = 255;
  }
  octx.putImageData(od, 0, 0);
  return out;
}

function spriteLegendario(p){
  let entry = LEG_SPRITE_CACHE[p.name];
  if(entry) return entry.canvas;
  entry = {canvas: null};
  LEG_SPRITE_CACHE[p.name] = entry;
  const img = new Image();
  /* jsdelivr manda Access-Control-Allow-Origin:*, así que pedir la imagen
     como anónima no la tapa y deja el canvas SIN "tainted": hace falta para
     leer los píxeles (recorte, paleta y contorno). */
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try{ entry.canvas = pixelarImagen(img, LEG_TAM); }
    catch(e){ /* si falla, se sigue mostrando el destello de reserva */ }
  };
  img.src = p.img;
  return null;
}

let legendarioVisible = null;              // {p, mapa, x, y, hasta}
/* Ya no es un vistazo de un instante: el legendario se queda esperando en el
   altar y el jugador tiene que caminar hasta ahí para pelear. Este es el
   tiempo que aguanta antes de irse si no llegás. */
const LEGENDARIO_REVEAL_MS = 15000;

function mostrarLegendarioEnMapa(p, x, y){
  spriteLegendario(p);                     // dispara la carga si hace falta
  legendarioVisible = {p, mapa: advMapa, x, y, hasta: Date.now() + LEGENDARIO_REVEAL_MS};
}

function dibujarLegendario(ctx, p, ox, oy){
  ox = Math.round(ox); oy = Math.round(oy);
  const t = Date.now() / 1000;
  const cx = ox + 8;                       // centro del tile del altar
  // aura: dos óvalos de luz que laten, a pasos para que siga siendo pixel art
  const latido = (Math.sin(t * 2.4) + 1) / 2;
  ctx.fillStyle = `rgba(255,224,120,${(.16 + latido * .10).toFixed(3)})`;
  ctx.beginPath(); ctx.ellipse(cx, oy + 4, 30 + latido * 3, 26 + latido * 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(255,244,190,${(.22 + latido * .12).toFixed(3)})`;
  ctx.beginPath(); ctx.ellipse(cx, oy + 4, 20 + latido * 2, 17 + latido, 0, 0, Math.PI * 2); ctx.fill();
  // sombra en el piso (más chica cuando flota más alto)
  const flota = Math.round(Math.sin(t * 2.4) * 1.5);
  ctx.fillStyle = 'rgba(0,0,0,.38)';
  const sw = 22 - (flota > 0 ? 0 : 2);
  ctx.fillRect(cx - sw / 2, oy + 14, sw, 2);
  ctx.fillRect(cx - sw / 2 + 2, oy + 16, sw - 4, 1);
  const spr = spriteLegendario(p);
  /* Se ancla por los pies (centro-abajo) sobre el altar y flota un poquito.
     El sprite mide ~LEG_TAM px: bastante más que el tile (16) a propósito,
     ahora hay una plataforma grande debajo que lo banca. */
  if(spr) ctx.drawImage(spr, Math.round(cx - spr.width / 2), oy + 14 - spr.height - 2 - flota);
  else{ ctx.fillStyle = '#FFD63A'; ctx.fillRect(ox + 6, oy + 5, 4, 4); }   // mientras carga
  // cuatro destellos girando alrededor
  for(let i = 0; i < 4; i++){
    const ang = t * 1.1 + i * Math.PI / 2;
    const sx = Math.round(cx + Math.cos(ang) * 24), sy = Math.round(oy - 8 + Math.sin(ang) * 15);
    const on = Math.sin(t * 5 + i * 1.7) > -.2;
    if(!on) continue;
    ctx.fillStyle = '#FFF6C2'; ctx.fillRect(sx, sy, 1, 1);
    ctx.fillStyle = 'rgba(255,230,120,.8)';
    ctx.fillRect(sx - 1, sy, 1, 1); ctx.fillRect(sx + 1, sy, 1, 1); ctx.fillRect(sx, sy - 1, 1, 1); ctx.fillRect(sx, sy + 1, 1, 1);
  }
}

/* Regalo puntual: a Matías le suben las chances de que salgan en la Aventura
   los Kanto que todavía le faltan, para que termine de completar esa región
   jugando (en vez de regalárselos directo). El progreso vive en el
   localStorage de su propio dispositivo, así que esto se decide en tiempo
   real contra su `state`, no contra uno guardado acá. */
const BOOST_FALTANTES = { jugador: 'matias', region: 'kanto', factor: 6 };

function conBoostFaltantes(lista){
  if(claveNombre(jugador) !== BOOST_FALTANTES.jugador) return lista;
  return lista.map(p => (p.region === BOOST_FALTANTES.region && !state[p.id].got)
    ? Object.assign({}, p, {weight: p.weight * BOOST_FALTANTES.factor})
    : p);
}

/* Durante un evento con soloRegion12, el universo entero de la Aventura se
   acota a Kanto+Johto ANTES de mirar en qué región del mapa está parado el
   jugador: caminar por Hoenn sigue andando igual (no se toca el mapa), pero
   lo que puede salir ahí es Kanto/Johto igual que en cualquier otro lado.
   Todos los fallbacks de abajo parten de basePool, así que la restricción
   nunca se escapa aunque algún bioma puntual quede sin tipos propios. */
function poolBioma(bioma, region){
  const ev = eventoVistaActiva();
  const basePool = ev ? ADV_DATA.filter(p => IDS_KANTO_JOHTO.has(p.id)) : ADV_DATA;
  const reg = region || advRegion;
  const dePar = ev ? basePool : basePool.filter(p => p.region === reg);
  const base = dePar.length ? dePar : basePool;
  if(bioma === 'legendario'){
    const leg = base.filter(p => p.rarity === 'Legendario');
    return conBoostFaltantes(leg.length ? leg : basePool.filter(p => p.rarity === 'Legendario'));
  }
  const tipos = ADV_TIPOS[bioma] || [];
  const pool = base.filter(p => p.rarity !== 'Legendario' && tipos.includes(p.type));
  return conBoostFaltantes(pool.length ? pool : base.filter(p => p.rarity !== 'Legendario'));
}

let advAbierto = false;
let advMapa    = 'overworld';
let advX = 1, advY = 1;          // casillero donde está parado (derivado de la posición)
let advPx = 16, advPy = 16;      // posición real en píxeles de mundo (movimiento fluido)
let advDir     = 'abajo';
let advPaso    = 0;              // cuadro de la animación de caminata
let advCamino  = 0;              // píxeles caminados, para tirar los encuentros
let advDescanso = 0;             // píxeles que faltan caminar hasta el próximo encuentro posible
let advDibujado = false;
let advZonaTimer = null;
let advZonaActual = '';
let advRegionAnterior = '';
let advCartelHasta = 0;          // hasta cuándo manda el cartel grande de región
let advRaf = null;
let advUltimo = 0;
const advTomados = new Set();    // pokébolas del piso ya levantadas

/* ---------- Tiles pixel-art de 16x16 ----------
   Estética de los cenitales de 16 bits estilo Pocky & Rocky (Natsume, SNES):
   verdes saturados, camino empedrado, cerezos, agua con espuma y un edificio
   con techo de santuario. Los tiles se dibujan acá con rectángulos de 1 px
   (nada de sprites del juego original) y el canvas se agranda pixelado. */
const ADV_PX = 16;

function ruido(x, y, n){
  const s = Math.sin(x * 127.1 + y * 311.7 + n * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function pinta(ctx, color, x, y, w, h){
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w === undefined ? 1 : w, h === undefined ? 1 : h);
}

function charEn(x, y){
  const mapa = ADV_MAPS[advMapa];
  if(y < 0 || y >= mapa.rows.length || x < 0 || x >= mapa.cols) return '';
  return mapa.rows[y][x];
}

/* Dibuja una silueta simétrica a partir de los anchos de cada fila: es lo que
   saca a las copas de los árboles y a las rocas del aspecto de ladrillo. */
function silueta(ctx, ox, oy, anchos, color, desdeY){
  anchos.forEach((w, i) => {
    if(w > 0) pinta(ctx, color, ox + Math.round((16 - w) / 2), oy + desdeY + i, w, 1);
  });
}

function suaviza(t){ return t * t * (3 - 2 * t); }

/* Ruido de VALOR interpolado entre las 4 esquinas del casillero (x,y),
   (x+1,y), (x,y+1), (x+1,y+1). Al compartir esquinas con los casilleros
   vecinos, la mancha de textura sigue de uno a otro SIN costura -es lo que
   reemplaza a la vieja ruidoSuave(), que promediaba un bloque de 3x3
   casilleros entero y dejaba parches rectangulares con bordes rectos
   (se notaba como un tablero de ajedrez gigante en el pasto/la montaña). */
function ruidoValor(px, py, n){
  const x0 = Math.floor(px), y0 = Math.floor(py);
  const fx = suaviza(px - x0), fy = suaviza(py - y0);
  const v00 = ruido(x0, y0, n),     v10 = ruido(x0 + 1, y0, n);
  const v01 = ruido(x0, y0 + 1, n), v11 = ruido(x0 + 1, y0 + 1, n);
  return (v00 + (v10 - v00) * fx) * (1 - fy) + (v01 + (v11 - v01) * fx) * fy;
}

/* Rellena el casillero (16x16) en bloques de 4x4px, tomando el tono de
   ruidoValor() en el centro de cada bloque. El resultado son manchas
   orgánicas de tamaño variable que atraviesan casilleros -el mismo look que
   antes daba ruidoSuave(), pero sin el corte duro cada 3 casilleros. */
function textura3(ctx, ox, oy, x, y, n, oscuro, medio, claro){
  for(let by = 0; by < 16; by += 4){
    for(let bx = 0; bx < 16; bx += 4){
      const v = ruidoValor(x + (bx + 2) / 16, y + (by + 2) / 16, n);
      pinta(ctx, v > .58 ? claro : v < .40 ? oscuro : medio, ox + bx, oy + by, 4, 4);
    }
  }
}

/* La Cueva Secreta es un único mapa/layout (ya probado con BFS), pero se
   pinta distinto según por qué entrada se bajó -advRegion no cambia dentro
   de la cueva, queda fijo en el de la entrada usada-, para que cada una
   tenga la identidad del legendario que guarda (santuariosPorRegion):
   Kanto=Mewtwo (laboratorio psíquico), Johto=Celebi (santuario del bosque,
   tomado por el musgo), Hoenn=Regirock/Regice/Registeel/Jirachi/Deoxys
   (ruinas antiguas), Sinnoh=Pilar Lanza (roca azulada, Dialga/Palkia/
   Giratina/Arceus/Darkrai/Regigigas), Teselia=laboratorio congelado
   (Genesect), Kalos=guarida del caos (Yveltal). */
const TEMA_CUEVA = {
  kanto: {piso:'#3C3B49', pisoClaro:'#4A4957', pisoOscuro:'#333240',
          pared:'#23222E', paredClaro:'#34333F', paredOscuro:'#15141C',
          escombro:'#7A6BB8', escombroClaro:'#9C8FD6', escombroOscuro:'#2A2340'},
  johto: {piso:'#2E3A28', pisoClaro:'#3B4E33', pisoOscuro:'#242E1F',
          pared:'#212D1C', paredClaro:'#35492A', paredOscuro:'#131A10',
          escombro:'#4F7A3A', escombroClaro:'#72A852', escombroOscuro:'#1E2917'},
  hoenn: {piso:'#4A4030', pisoClaro:'#5C4F3B', pisoOscuro:'#372E20',
          pared:'#332A1C', paredClaro:'#544526', paredOscuro:'#1D170F',
          escombro:'#8A6B3E', escombroClaro:'#B08F57', escombroOscuro:'#2B2216'},
  sinnoh: {piso:'#39424E', pisoClaro:'#47535F', pisoOscuro:'#2B3239',
           pared:'#232C36', paredClaro:'#354352', paredOscuro:'#141A20',
           escombro:'#5E8AB0', escombroClaro:'#82B4D6', escombroOscuro:'#233A48'},
  unova: {piso:'#324249', pisoClaro:'#3F535C', pisoOscuro:'#263238',
          pared:'#1E2A2F', paredClaro:'#30454C', paredOscuro:'#11181B',
          escombro:'#5FA8A0', escombroClaro:'#84CFC5', escombroOscuro:'#20403C'},
  kalos: {piso:'#3A2E42', pisoClaro:'#4A3B53', pisoOscuro:'#2A2130',
          pared:'#241C2A', paredClaro:'#39293F', paredOscuro:'#150F19',
          escombro:'#9B4E7A', escombroClaro:'#C273A0', escombroOscuro:'#331A29'}
};
function temaCueva(){ return TEMA_CUEVA[advRegion] || TEMA_CUEVA.kanto; }

const PINTORES = {
  pasto(ctx, ox, oy, x, y){
    textura3(ctx, ox, oy, x, y, 1, '#469229', '#4E9E33', '#57A93A');
    for(let i = 0; i < 7; i++){
      const rx = ox + Math.floor(ruido(x, y, i) * 15);
      const ry = oy + Math.floor(ruido(x, y, i + 40) * 15);
      pinta(ctx, i % 2 ? '#3F8A28' : '#63B846', rx, ry, 2, 1);
    }
    // matitas y florcitas sueltas, para que el pasto no sea una plancha lisa
    if(ruido(x, y, 33) > .86){
      const mx = ox + 4 + Math.floor(ruido(x, y, 34) * 8);
      const my = oy + 5 + Math.floor(ruido(x, y, 35) * 7);
      pinta(ctx, '#377A22', mx, my, 3, 1);
      pinta(ctx, '#63B846', mx + 1, my - 1, 1, 1);
    }
    if(ruido(x, y, 47) > .93) pinta(ctx, '#F5EAC4', ox + 6, oy + 9, 2, 2);
  },
  flores(ctx, ox, oy, x, y){
    PINTORES.pasto(ctx, ox, oy, x, y);
    const colores = ['#F27A9B', '#FFF3B0', '#FFFFFF'];
    for(let i = 0; i < 4; i++){
      const rx = ox + 2 + Math.floor(ruido(x, y, i + 7) * 11);
      const ry = oy + 2 + Math.floor(ruido(x, y, i + 21) * 11);
      pinta(ctx, colores[i % colores.length], rx, ry, 2, 2);
      pinta(ctx, '#E0B23A', rx, ry);
    }
  },
  hierba(ctx, ox, oy, x, y){
    PINTORES.pasto(ctx, ox, oy, x, y);
    pinta(ctx, '#2F7A2A', ox, oy, 16, 16);
    for(let i = 0; i < 14; i++){
      const rx = ox + Math.floor(ruido(x, y, i) * 15);
      const alto = 3 + Math.floor(ruido(x, y, i + 11) * 4);
      const ry = oy + 4 + Math.floor(ruido(x, y, i + 55) * 10);
      pinta(ctx, i % 3 ? '#46A63A' : '#69C452', rx, ry - alto, 1, alto);
    }
    /* Borde dentado contra el pasto: el corte recto delataba el casillero. */
    const esHierba = (cx, cy) => charEn(cx, cy) === '"';
    if(!esHierba(x, y - 1)){
      for(let i = 0; i < 16; i++){
        const h = 1 + Math.floor(ruido(x * 16 + i, y, 71) * 3);
        pinta(ctx, '#4E9E33', ox + i, oy, 1, h);
        pinta(ctx, '#377A22', ox + i, oy + h, 1, 1);
      }
    }
    if(!esHierba(x, y + 1)) pinta(ctx, '#245F20', ox, oy + 15, 16, 1);
    if(!esHierba(x - 1, y)){
      for(let i = 0; i < 16; i++) if(ruido(x, y * 16 + i, 72) > .5) pinta(ctx, '#4E9E33', ox, oy + i, 1, 1);
    }
    if(!esHierba(x + 1, y)){
      for(let i = 0; i < 16; i++) if(ruido(x, y * 16 + i, 73) > .5) pinta(ctx, '#4E9E33', ox + 15, oy + i, 1, 1);
    }
  },
  camino(ctx, ox, oy, x, y){
    pinta(ctx, '#C6AC7C', ox, oy, 16, 16);
    // adoquines chicos e irregulares, no cuatro baldosones iguales
    for(let f = 0; f < 3; f++){
      for(let c = 0; c < 3; c++){
        const jx = Math.floor(ruido(x * 3 + c, y * 3 + f, 12) * 2);
        const jy = Math.floor(ruido(x * 3 + c, y * 3 + f, 13) * 2);
        const px0 = ox + c * 5 + jx, py0 = oy + f * 5 + jy;
        const claro = ruido(x * 3 + c, y * 3 + f, 14) > .5 ? '#D9C296' : '#CDB88C';
        pinta(ctx, claro, px0, py0, 4, 4);
        pinta(ctx, '#B79A6B', px0, py0 + 3, 4, 1);
      }
    }
    // orilla de tierra donde el camino toca el pasto
    const esCamino = (cx, cy) => ['.', 'P', 'T', 'i'].includes(charEn(cx, cy));
    const orilla = '#A98E5F';
    if(!esCamino(x, y - 1)) for(let i = 0; i < 16; i++) if(ruido(x * 16 + i, y, 81) > .35) pinta(ctx, orilla, ox + i, oy, 1, 1 + Math.floor(ruido(x * 16 + i, y, 82) * 2));
    if(!esCamino(x, y + 1)) for(let i = 0; i < 16; i++) if(ruido(x * 16 + i, y, 83) > .35) pinta(ctx, orilla, ox + i, oy + 15, 1, 1);
    if(!esCamino(x - 1, y)) for(let i = 0; i < 16; i++) if(ruido(x, y * 16 + i, 84) > .35) pinta(ctx, orilla, ox, oy + i, 1, 1);
    if(!esCamino(x + 1, y)) for(let i = 0; i < 16; i++) if(ruido(x, y * 16 + i, 85) > .35) pinta(ctx, orilla, ox + 15, oy + i, 1, 1);
  },
  agua(ctx, ox, oy, x, y){
    pinta(ctx, '#2C68C8', ox, oy, 16, 16);
    /* La franja más oscura variaba SIEMPRE a la misma altura (oy+9): en un
       lago grande se veía como una raya horizontal perfecta cruzando todos
       los casilleros en línea. Ahora su altura y grosor salen del ruido. */
    const by = 6 + Math.floor(ruido(x, y, 6) * 6);
    const bh = 3 + Math.floor(ruido(x, y, 7) * 3);
    pinta(ctx, '#2455A6', ox, oy + by, 16, bh);
    for(let i = 0; i < 3; i++){
      const rx = ox + Math.floor(ruido(x, y, i + 3) * 10);
      const ry = oy + 2 + Math.floor(ruido(x, y, i + 17) * 11);
      pinta(ctx, '#7FB4F2', rx, ry, 5, 1);
      pinta(ctx, '#A8D0FA', rx + 1, ry + 1, 3, 1);
    }
    // espuma contra la orilla: sin esto el lago termina en un corte recto
    if(charEn(x, y - 1) !== '~'){ pinta(ctx, '#BFE0FF', ox, oy, 16, 1); pinta(ctx, '#8FC2F7', ox, oy + 1, 16, 1); }
    if(charEn(x, y + 1) !== '~'){ pinta(ctx, '#BFE0FF', ox, oy + 15, 16, 1); }
    if(charEn(x - 1, y) !== '~'){ pinta(ctx, '#8FC2F7', ox, oy, 1, 16); }
    if(charEn(x + 1, y) !== '~'){ pinta(ctx, '#8FC2F7', ox + 15, oy, 1, 16); }
  },
  arbol(ctx, ox, oy, x, y){
    PINTORES.pasto(ctx, ox, oy, x, y);
    const cerezo = ruido(x, y, 91) > .78;
    const hoja   = cerezo ? '#D9578A' : '#2F7C2C';
    const claro  = cerezo ? '#F7A8C2' : '#4EAC42';
    const oscuro = cerezo ? '#A63E68' : '#1D5A1C';
    /* Jitter propio de CADA árbol (según su casillero): sin esto, todos los
       árboles del mismo tipo eran el mismo dibujo pixel por pixel, y un
       bosque entero se leía como una fila de "paletas" repetidas. */
    const jitter = i => Math.floor(ruido(x, y, 110 + i) * 3) - 1;   // -1, 0 o 1
    pinta(ctx, 'rgba(0,0,0,.22)', ox + 3, oy + 13, 10, 2);
    const tx = 7 + jitter(20);
    pinta(ctx, '#6B4A2A', ox + tx, oy + 11, 3, 4);
    pinta(ctx, '#4E3520', ox + tx + 2, oy + 11, 1, 4);
    const base = [6, 10, 12, 14, 14, 14, 12, 10, 6];
    const forma = base.map((w, i) => Math.max(4, Math.min(15, w + jitter(i))));
    silueta(ctx, ox, oy, forma.map(w => w + 2), oscuro, 1);   // contorno
    silueta(ctx, ox, oy, forma, hoja, 1);
    const hx = 4 + jitter(21), hy = 3 + jitter(22);
    pinta(ctx, claro, ox + hx, oy + hy, 4, 2);
    pinta(ctx, claro, ox + hx - 1, oy + hy + 2, 2, 2);
    pinta(ctx, oscuro, ox + 6, oy + 8, 5, 2);
    if(cerezo){ pinta(ctx, '#FFFFFF', ox + 9, oy + 4, 2, 2); pinta(ctx, '#FFFFFF', ox + 6, oy + 7, 1, 1); }
  },
  /* La roca se dibuja como macizo continuo: sólo lleva borde del lado donde
     NO hay más roca. Si cada casilla llevara su propio contorno, la sierra se
     veía como una fila de lápidas sueltas. */
  montana(ctx, ox, oy, x, y){
    const roca = (cx, cy) => ['^', 'V', 'C'].includes(charEn(cx, cy));
    textura3(ctx, ox, oy, x, y, 61, '#828077', '#8E8C82', '#96948A');
    for(let i = 0; i < 6; i++){
      const rx = ox + Math.floor(ruido(x, y, i + 8) * 14);
      const ry = oy + 3 + Math.floor(ruido(x, y, i + 70) * 10);
      pinta(ctx, i % 2 ? '#7C7A72' : '#A9A79B', rx, ry, 3, 1);
    }
    /* Crestas adentro del macizo: una cordillera de 7 casilleros de ancho sin
       esto quedaba como una plancha gris. El perfil de cada cresta (largo,
       alto y dónde cae el pico) sale del ruido -antes era SIEMPRE el mismo
       chevrón simétrico, y una sierra entera se leía como el mismo sello
       estampado una y otra vez. */
    if(ruido(x, y, 62) > .55 && roca(x, y - 1) && roca(x, y + 1)){
      const largo = 5 + Math.floor(ruido(x, y, 66) * 4);          // 5..8
      const cx0 = ox + 1 + Math.floor(ruido(x, y, 63) * (15 - largo));
      const altoMax = 2 + Math.floor(ruido(x, y, 65) * 3);        // 2..4
      const pico = Math.floor(ruido(x, y, 67) * largo);
      const baseY = oy + 8 + Math.floor(ruido(x, y, 68) * 3);
      for(let i = 0; i < largo; i++){
        const h = Math.max(0, altoMax - Math.abs(i - pico));
        pinta(ctx, '#B9B7AA', cx0 + i, baseY - h, Math.max(1, 3 - (i % 2)), 1);
        if(h > 0) pinta(ctx, '#6B6960', cx0 + i, baseY - h + 1, 2, Math.min(2, h));
      }
    }
    if(!roca(x, y - 1)){ pinta(ctx, '#C3C1B4', ox, oy, 16, 2); pinta(ctx, '#A9A79B', ox, oy + 2, 16, 1); }
    if(!roca(x, y + 1)){ pinta(ctx, '#6E6C64', ox, oy + 12, 16, 3); pinta(ctx, '#4C4A44', ox, oy + 15, 16, 1); }
    if(!roca(x - 1, y)){ pinta(ctx, '#6E6C64', ox, oy, 1, 16); }
    if(!roca(x + 1, y)){ pinta(ctx, '#6E6C64', ox + 15, oy, 1, 16); }
  },
  /* Pico nevado de Articuno: mismo armado que montana() (macizo continuo,
     borde sólo del lado sin roca) pero en paleta de hielo. */
  montananevada(ctx, ox, oy, x, y){
    const roca = (cx, cy) => charEn(cx, cy) === 'Z';
    textura3(ctx, ox, oy, x, y, 61, '#C7D3DE', '#D6E0E8', '#E8EEF4');
    for(let i = 0; i < 6; i++){
      const rx = ox + Math.floor(ruido(x, y, i + 8) * 14);
      const ry = oy + 3 + Math.floor(ruido(x, y, i + 70) * 10);
      pinta(ctx, i % 2 ? '#AEBECB' : '#F5F9FC', rx, ry, 3, 1);
    }
    /* Mismo perfil de cresta variable que montana(), en paleta de hielo. */
    if(ruido(x, y, 62) > .55 && roca(x, y - 1) && roca(x, y + 1)){
      const largo = 5 + Math.floor(ruido(x, y, 66) * 4);
      const cx0 = ox + 1 + Math.floor(ruido(x, y, 63) * (15 - largo));
      const altoMax = 2 + Math.floor(ruido(x, y, 65) * 3);
      const pico = Math.floor(ruido(x, y, 67) * largo);
      const baseY = oy + 8 + Math.floor(ruido(x, y, 68) * 3);
      for(let i = 0; i < largo; i++){
        const h = Math.max(0, altoMax - Math.abs(i - pico));
        pinta(ctx, '#FFFFFF', cx0 + i, baseY - h, Math.max(1, 3 - (i % 2)), 1);
        if(h > 0) pinta(ctx, '#8FA6B8', cx0 + i, baseY - h + 1, 2, Math.min(2, h));
      }
    }
    if(!roca(x, y - 1)){ pinta(ctx, '#FFFFFF', ox, oy, 16, 3); pinta(ctx, '#EDF3F7', ox, oy + 3, 16, 1); }
    if(!roca(x, y + 1)){ pinta(ctx, '#8FA6B8', ox, oy + 12, 16, 3); pinta(ctx, '#5E7386', ox, oy + 15, 16, 1); }
    if(!roca(x - 1, y)){ pinta(ctx, '#8FA6B8', ox, oy, 1, 16); }
    if(!roca(x + 1, y)){ pinta(ctx, '#8FA6B8', ox + 15, oy, 1, 16); }
  },
  /* Pastizal reseco de la Central: amarillo apagado con chispas sueltas. */
  campoElectrico(ctx, ox, oy, x, y){
    textura3(ctx, ox, oy, x, y, 41, '#A8933A', '#B9A344', '#C9B44E');
    for(let i = 0; i < 6; i++){
      const rx = ox + Math.floor(ruido(x, y, i + 3) * 15);
      const ry = oy + Math.floor(ruido(x, y, i + 50) * 15);
      pinta(ctx, i % 2 ? '#8E7B2C' : '#D9C566', rx, ry, 2, 1);
    }
    if(ruido(x, y, 44) > .80){                  // chispa en zigzag
      const cx = ox + 4 + Math.floor(ruido(x, y, 45) * 7);
      const cy = oy + 4 + Math.floor(ruido(x, y, 46) * 6);
      pinta(ctx, '#FFF07A', cx + 2, cy, 2, 2);
      pinta(ctx, '#FFE04D', cx + 1, cy + 2, 2, 2);
      pinta(ctx, '#FFF07A', cx, cy + 4, 2, 2);
    }
    if(ruido(x, y, 47) > .88){                  // grieta seca con una chispa adentro
      const gx = ox + 2 + Math.floor(ruido(x, y, 48) * 10);
      const gy = oy + 6 + Math.floor(ruido(x, y, 49) * 6);
      pinta(ctx, '#6B5B1E', gx, gy, 4, 1);
      pinta(ctx, '#FFE04D', gx + 1, gy, 1, 1);
    }
  },
  /* Ruinas: losas viejas con juntas, alguna grieta y una runa tallada. */
  ruinas(ctx, ox, oy, x, y){
    textura3(ctx, ox, oy, x, y, 43, '#8A8070', '#968B77', '#A2977F');
    pinta(ctx, '#7A7263', ox, oy, 16, 1);
    pinta(ctx, '#7A7263', ox, oy, 1, 16);
    for(let i = 0; i < 4; i++){
      const rx = ox + 2 + Math.floor(ruido(x, y, i + 9) * 11);
      const ry = oy + 2 + Math.floor(ruido(x, y, i + 55) * 11);
      pinta(ctx, i % 2 ? '#B3A98F' : '#7F7768', rx, ry, 3, 1);
    }
    if(ruido(x, y, 78) > .62){                  // grieta serpenteante, como la lava del volcán
      let gx = ox + 3 + Math.floor(ruido(x, y, 79) * 10);
      let gy = oy + 2 + Math.floor(ruido(x, y, 80) * 3);
      const largo = 4 + Math.floor(ruido(x, y, 81) * 6);
      for(let i = 0; i < largo; i++){
        pinta(ctx, '#6B6255', gx, gy + i, 1, 1);
        if(ruido(x, y, 82 + i) > .55) gx += ruido(x, y, 83 + i) > .5 ? 1 : -1;
      }
    }
    /* 3 runas distintas en vez de una sola repetida: si no, toda la ruina se
       lee como el mismo sello tallado infinitas veces. */
    if(ruido(x, y, 48) > .78){
      const cx = ox + 5 + Math.floor(ruido(x, y, 49) * 5);
      const cy = oy + 5 + Math.floor(ruido(x, y, 51) * 4);
      const variante = Math.floor(ruido(x, y, 50) * 3);
      if(variante === 0){
        pinta(ctx, '#5E5749', cx, cy, 5, 1);
        pinta(ctx, '#5E5749', cx + 2, cy + 1, 1, 4);
      } else if(variante === 1){
        pinta(ctx, '#5E5749', cx + 1, cy, 1, 5);
        pinta(ctx, '#5E5749', cx, cy + 2, 3, 1);
      } else {
        pinta(ctx, '#5E5749', cx + 1, cy, 1, 1);
        pinta(ctx, '#5E5749', cx, cy + 1, 3, 1);
        pinta(ctx, '#5E5749', cx + 1, cy + 2, 1, 1);
      }
      pinta(ctx, '#8FA6C8', cx + 1, cy + 1, 1, 1);
    }
  },
  /* Ciénaga: barro verdoso con burbujas y juncos. */
  cienaga(ctx, ox, oy, x, y){
    textura3(ctx, ox, oy, x, y, 45, '#3A4A2C', '#455633', '#4E5F3A');
    for(let i = 0; i < 5; i++){
      const rx = ox + Math.floor(ruido(x, y, i + 15) * 14);
      const ry = oy + Math.floor(ruido(x, y, i + 65) * 14);
      pinta(ctx, i % 2 ? '#33422A' : '#5C7042', rx, ry, 3, 1);
    }
    if(ruido(x, y, 52) > .72){                  // burbuja de barro
      const bx = ox + 3 + Math.floor(ruido(x, y, 53) * 9);
      const by = oy + 4 + Math.floor(ruido(x, y, 54) * 8);
      pinta(ctx, '#6E8450', bx, by, 3, 2);
      pinta(ctx, '#93AA6B', bx + 1, by, 1, 1);
    }
    if(ruido(x, y, 56) > .86){                  // juncos
      const jx = ox + 2 + Math.floor(ruido(x, y, 57) * 11);
      pinta(ctx, '#6F8A46', jx, oy + 6, 1, 7);
      pinta(ctx, '#8AA75C', jx + 2, oy + 8, 1, 5);
    }
    if(ruido(x, y, 58) > .9){                   // hoja de nenúfar, suelta
      const lx = ox + 3 + Math.floor(ruido(x, y, 59) * 9);
      const ly = oy + 3 + Math.floor(ruido(x, y, 60) * 9);
      pinta(ctx, '#4C6E38', lx, ly, 4, 3);
      pinta(ctx, '#6F8A46', lx + 1, ly, 2, 1);
    }
  },
  /* El casillero con un objeto tirado (pokébola o moneda) se pinta con el
     terreno de sus VECINOS caminables. Con un pintor fijo quedaba un
     cuadrado de pasto en medio de la roca de la cueva, y después otro en
     medio del camino de piedra del pueblo. */
  pisoObjeto(ctx, ox, oy, x, y){
    const cuenta = {};
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const t = ADV_TILE[charEn(x + dx, y + dy)];
      if(!t || !t.walk || t.item) return;
      cuenta[t.pinta] = (cuenta[t.pinta] || 0) + 1;
    });
    const cual = Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a])[0];
    const porDefecto = advMapa === 'cueva' ? PINTORES.pisoCueva : PINTORES.pasto;
    (PINTORES[cual] || porDefecto)(ctx, ox, oy, x, y);
  },
  nieve(ctx, ox, oy, x, y){
    textura3(ctx, ox, oy, x, y, 1, '#D3E3EC', '#E0EDF4', '#EAF3F8');
    for(let i = 0; i < 7; i++){
      const rx = ox + Math.floor(ruido(x, y, i) * 15);
      const ry = oy + Math.floor(ruido(x, y, i + 40) * 15);
      pinta(ctx, i % 2 ? '#C3D6E2' : '#FFFFFF', rx, ry, 2, 1);
    }
    if(ruido(x, y, 33) > .86){                  // huella o piedra asomando
      const mx = ox + 4 + Math.floor(ruido(x, y, 34) * 8);
      const my = oy + 5 + Math.floor(ruido(x, y, 35) * 7);
      pinta(ctx, '#AEC3D1', mx, my, 3, 1);
      pinta(ctx, '#FFFFFF', mx + 1, my - 1, 1, 1);
    }
    if(ruido(x, y, 47) > .93) pinta(ctx, '#B8D6E8', ox + 6, oy + 9, 2, 2);   // cristal de hielo
  },
  pared(ctx, ox, oy, x, y){
    const t = temaCueva();
    textura3(ctx, ox, oy, x, y, 97, t.paredOscuro, t.pared, t.paredClaro);
    /* Facetas de roca más claras en posición VARIABLE: antes salían siempre
       en la misma esquina de cada casillero, y una pared entera se leía como
       un enrejado de ladrillos idénticos. */
    const fx = 1 + Math.floor(ruido(x, y, 98) * 8);
    const fy = 1 + Math.floor(ruido(x, y, 99) * 6);
    pinta(ctx, t.paredClaro, ox + fx, oy + fy, 5, 4);
    if(ruido(x, y, 100) > .5){
      const gx = 1 + Math.floor(ruido(x, y, 101) * 9);
      const gy = 8 + Math.floor(ruido(x, y, 102) * 5);
      pinta(ctx, t.paredClaro, ox + gx, oy + gy, 4, 3);
    }
    pinta(ctx, t.paredOscuro, ox, oy + 14, 16, 2);
  },
  volcan(ctx, ox, oy, x, y){
    const roca = (cx, cy) => ['V', '^'].includes(charEn(cx, cy));
    textura3(ctx, ox, oy, x, y, 17, '#452719', '#4C3620', '#54301F');
    for(let i = 0; i < 6; i++){                 // piedra quemada
      const rx = ox + Math.floor(ruido(x, y, i + 12) * 13);
      const ry = oy + 1 + Math.floor(ruido(x, y, i + 80) * 13);
      pinta(ctx, i % 2 ? '#331B12' : '#66392A', rx, ry, 3, 2);
    }
    // grietas de lava: sólo en algunas piedras y con forma irregular
    if(ruido(x, y, 90) > .45){
      let gx = ox + 3 + Math.floor(ruido(x, y, 91) * 9);
      let gy = oy + 2 + Math.floor(ruido(x, y, 92) * 4);
      const largo = 4 + Math.floor(ruido(x, y, 93) * 7);
      for(let i = 0; i < largo; i++){
        pinta(ctx, i % 3 ? '#E4622A' : '#F5A623', gx, gy + i, 1, 1);
        if(ruido(x, y, 94 + i) > .6) gx += ruido(x, y, 95 + i) > .5 ? 1 : -1;
      }
    }
    if(!roca(x, y - 1)){                        // boca del cráter
      pinta(ctx, '#7A4630', ox, oy, 16, 2);
      pinta(ctx, '#E4622A', ox + 2, oy + 1, 12, 3);
      pinta(ctx, '#F5A623', ox + 4, oy + 1, 8, 2);
      pinta(ctx, '#FFE07A', ox + 6, oy + 1, 4, 1);
    }
    if(!roca(x, y + 1)) pinta(ctx, '#241009', ox, oy + 14, 16, 2);
    if(!roca(x - 1, y)) pinta(ctx, '#331B12', ox, oy, 1, 16);
    if(!roca(x + 1, y)) pinta(ctx, '#331B12', ox + 15, oy, 1, 16);
  },
  ceniza(ctx, ox, oy, x, y){
    textura3(ctx, ox, oy, x, y, 23, '#63361D', '#6F3E21', '#7C4526');
    for(let i = 0; i < 4; i++){                 // ceniza volada
      const rx = ox + Math.floor(ruido(x, y, i + 5) * 13);
      const ry = oy + Math.floor(ruido(x, y, i + 30) * 14);
      pinta(ctx, '#8A5B38', rx, ry, 3, 1);
    }
    if(ruido(x, y, 41) > .55){                  // grieta
      const gx = ox + 2 + Math.floor(ruido(x, y, 42) * 10);
      const gy = oy + 3 + Math.floor(ruido(x, y, 43) * 8);
      pinta(ctx, '#46240F', gx, gy, 5, 1);
      pinta(ctx, '#46240F', gx + 3, gy + 1, 4, 1);
    }
    if(ruido(x, y, 55) > .82){                  // brasa
      const bx = ox + 3 + Math.floor(ruido(x, y, 56) * 9);
      const by = oy + 4 + Math.floor(ruido(x, y, 57) * 8);
      pinta(ctx, '#E4622A', bx, by, 2, 2);
      pinta(ctx, '#FFC65C', bx, by, 1, 1);
    }
  },
  entradaCueva(ctx, ox, oy, x, y){
    PINTORES.montana(ctx, ox, oy, x, y);
    pinta(ctx, '#151420', ox + 3, oy + 5, 10, 11);
    pinta(ctx, '#151420', ox + 5, oy + 3, 6, 4);
    pinta(ctx, '#000000', ox + 5, oy + 8, 6, 8);
  },
  pisoCueva(ctx, ox, oy, x, y){
    const t = temaCueva();
    textura3(ctx, ox, oy, x, y, 103, t.pisoOscuro, t.piso, t.pisoClaro);
    for(let i = 0; i < 5; i++){
      const rx = ox + Math.floor(ruido(x, y, i + 2) * 15);
      const ry = oy + Math.floor(ruido(x, y, i + 60) * 15);
      pinta(ctx, i % 2 ? t.pisoOscuro : t.pisoClaro, rx, ry, 2, 1);
    }
  },
  /* Piedras sueltas con silueta redondeada (angosta arriba/abajo, ancha al
     medio) y sombra de contacto -antes eran rectángulos lisos con una franja
     clara y otra oscura fijas, que a este tamaño se leían como triangulitos
     flotando en vez de rocas apoyadas en el piso. */
  escombros(ctx, ox, oy, x, y){
    PINTORES.pisoCueva(ctx, ox, oy, x, y);
    const t = temaCueva();
    const n = 2 + Math.floor(ruido(x, y, 96) * 2);
    for(let i = 0; i < n; i++){
      const rx = ox + 1 + Math.floor(ruido(x, y, i + 13) * 10);
      const ry = oy + 2 + Math.floor(ruido(x, y, i + 44) * 10);
      const w = 3 + Math.floor(ruido(x, y, i + 66) * 3);
      pinta(ctx, 'rgba(0,0,0,.25)', rx, ry + w, w + 1, 1);
      pinta(ctx, t.escombroOscuro, rx + 1, ry, w - 1, 1);
      pinta(ctx, t.escombro, rx, ry + 1, w + 1, Math.max(1, w - 2));
      pinta(ctx, t.escombroClaro, rx, ry + 1, Math.ceil((w + 1) / 2), 1);
      pinta(ctx, t.escombroOscuro, rx + 1, ry + w - 1, w - 1, 1);
    }
  },
  /* Relleno de base del tile del altar: la plataforma de verdad (mucho más
     grande, se mete en los vecinos) la pinta dibujarPlataformaAltar() en una
     pasada aparte -ver advFondo()-. Esto sólo evita un hueco si algún
     redondeo del círculo no llega a cubrir el tile entero. */
  altar(ctx, ox, oy){
    pinta(ctx, '#83837A', ox, oy, 16, 16);
  },
  salida(ctx, ox, oy, x, y){
    PINTORES.pisoCueva(ctx, ox, oy, x, y);
    pinta(ctx, '#C6AC7C', ox + 4, oy, 8, 9);
    pinta(ctx, '#EBDCB4', ox + 6, oy, 4, 6);
  },
  arena(ctx, ox, oy, x, y){
    textura3(ctx, ox, oy, x, y, 21, '#D3C08A', '#E8D9A8', '#F5EAC4');
    for(let i = 0; i < 4; i++){
      const rx = ox + Math.floor(ruido(x, y, i + 63) * 15);
      const ry = oy + Math.floor(ruido(x, y, i + 72) * 15);
      pinta(ctx, i % 2 ? '#B39B63' : '#FFF6DE', rx, ry, 2, 1);
    }
  },
  puente(ctx, ox, oy, x, y){
    PINTORES.agua(ctx, ox, oy, x, y);
    pinta(ctx, '#8A5F35', ox, oy, 16, 16);
    for(let i = 0; i < 4; i++) pinta(ctx, '#6B4522', ox, oy + i * 4 + 3, 16, 1);
    pinta(ctx, '#A8794A', ox, oy, 16, 2);
    pinta(ctx, '#5A3A1C', ox, oy + 15, 16, 1);
    pinta(ctx, '#C89B63', ox + 1, oy + 5, 1, 10);
    pinta(ctx, '#C89B63', ox + 14, oy + 5, 1, 10);
  },
  torii(ctx, ox, oy, x, y){
    PINTORES.pasto(ctx, ox, oy, x, y);
    pinta(ctx, '#8F231D', ox, oy + 1, 16, 2);   // dintel superior
    pinta(ctx, '#C0392B', ox, oy + 3, 16, 2);
    pinta(ctx, '#C0392B', ox + 2, oy + 6, 12, 2);
    pinta(ctx, '#C0392B', ox + 3, oy + 5, 2, 11); // columnas
    pinta(ctx, '#C0392B', ox + 11, oy + 5, 2, 11);
    pinta(ctx, '#8F231D', ox + 4, oy + 5, 1, 11);
    pinta(ctx, '#8F231D', ox + 12, oy + 5, 1, 11);
  },
  cartel(ctx, ox, oy, x, y){
    PINTORES.pasto(ctx, ox, oy, x, y);
    pinta(ctx, '#6B4A2A', ox + 7, oy + 9, 2, 6);
    pinta(ctx, '#B98A50', ox + 2, oy + 3, 12, 7);
    pinta(ctx, '#8A6033', ox + 2, oy + 3, 12, 1);
    pinta(ctx, '#8A6033', ox + 2, oy + 9, 12, 1);
    pinta(ctx, '#6B4A2A', ox + 4, oy + 5, 8, 1);
    pinta(ctx, '#6B4A2A', ox + 4, oy + 7, 6, 1);
  },
  /* El Centro Pokémon ocupa 2x2 casilleros: techo arriba (p q) y paredes
     abajo (P r). La puerta está en la P, que es la que abre la tienda. */
  techoIzq(ctx, ox, oy, x, y){
    PINTORES.camino(ctx, ox, oy, x, y);
    pinta(ctx, '#8F231D', ox, oy + 1, 16, 3);
    pinta(ctx, '#C0392B', ox + 1, oy + 4, 15, 10);
    pinta(ctx, '#D9564D', ox + 3, oy + 5, 9, 2);
    pinta(ctx, '#A32A24', ox + 1, oy + 9, 15, 1);
    pinta(ctx, '#8F231D', ox, oy + 14, 16, 2);
  },
  techoDer(ctx, ox, oy, x, y){
    PINTORES.camino(ctx, ox, oy, x, y);
    pinta(ctx, '#8F231D', ox, oy + 1, 16, 3);
    pinta(ctx, '#C0392B', ox, oy + 4, 15, 10);
    pinta(ctx, '#D9564D', ox + 4, oy + 5, 8, 2);
    pinta(ctx, '#A32A24', ox, oy + 9, 15, 1);
    pinta(ctx, '#8F231D', ox, oy + 14, 16, 2);
    pinta(ctx, '#FFFFFF', ox + 8, oy + 5, 5, 5);   // pokébola pintada en el techo
    pinta(ctx, '#EE1515', ox + 8, oy + 5, 5, 3);
    pinta(ctx, '#2A2A34', ox + 8, oy + 7, 5, 1);
  },
  paredDer(ctx, ox, oy, x, y){
    PINTORES.camino(ctx, ox, oy, x, y);
    pinta(ctx, '#EFE7D5', ox, oy, 15, 14);
    pinta(ctx, '#DCD2BC', ox, oy + 12, 15, 2);
    pinta(ctx, '#7FA8D8', ox + 3, oy + 3, 7, 6);   // ventana
    pinta(ctx, '#5C86B8', ox + 3, oy + 3, 7, 1);
    pinta(ctx, '#EFE7D5', ox + 6, oy + 3, 1, 6);
    pinta(ctx, '#C9BFA6', ox, oy + 14, 15, 2);
  },
  centro(ctx, ox, oy, x, y){
    PINTORES.camino(ctx, ox, oy, x, y);
    pinta(ctx, '#EFE7D5', ox + 1, oy, 15, 14);
    pinta(ctx, '#DCD2BC', ox + 1, oy + 12, 15, 2);
    pinta(ctx, '#6B4A2A', ox + 7, oy + 4, 7, 10);  // puerta
    pinta(ctx, '#8A6033', ox + 8, oy + 5, 5, 9);
    pinta(ctx, '#F0B400', ox + 12, oy + 9, 1, 2);  // picaporte
    pinta(ctx, '#C9BFA6', ox + 1, oy + 14, 15, 2);
  }
};

/* Plataforma del altar: un círculo grande de piedra/cemento centrado en el
   tile del altar, que se mete adentro de los casilleros vecinos -así se ve
   como una losa ceremonial de verdad y no un cuadradito de 16px-. Gris de
   cemento a propósito (no el morado místico de antes): así no le compite el
   color a NINGÚN legendario, sea del tono que sea. Se pinta en una pasada
   aparte después de todos los tiles (ver advFondo) para que los vecinos no
   la tapen. */
/* Los grises son los MISMOS de la montaña del mapa (PINTORES.montana), no
   una paleta nueva: así el altar se lee como piedra de este mundo y no como
   un parche pegado encima. */
const PIEDRA_ALTAR = {
  base:   '#8E8C82',
  claro:  '#A9A79B',
  oscuro: '#6E6C64',
  borde:  '#4C4A44',
  junta:  '#7C7A72',
  canto:  '#5C5A54'
};

const ALTAR_LADO = 44;                      // losa cuadrada de 44x44 (casi 3 tiles)

/* Dibuja la losa en coordenadas propias (0,0 = esquina de la losa). */
function dibujarLosaAltar(ctx){
  const P = PIEDRA_ALTAR, lado = ALTAR_LADO;
  pinta(ctx, P.borde, 0, 0, lado, lado);
  pinta(ctx, P.base,  1, 1, lado - 2, lado - 2);

  // baldosas: juntas cada 11px, igual criterio que el camino de piedra
  for(let i = 11; i < lado - 1; i += 11){
    pinta(ctx, P.junta, i, 1, 1, lado - 2);
    pinta(ctx, P.junta, 1, i, lado - 2, 1);
  }
  // manchas de desgaste, mismo truco de ruido que el resto de los pintores
  for(let i = 0; i < 22; i++){
    const rx = 2 + Math.floor(ruido(i, 0, 91 + i) * (lado - 6));
    const ry = 2 + Math.floor(ruido(0, i, 130 + i) * (lado - 6));
    pinta(ctx, i % 2 ? P.claro : P.oscuro, rx, ry, 2, 1);
  }
  // canto iluminado arriba y sombreado abajo (luz desde arriba a la izquierda)
  pinta(ctx, P.claro,  1, 1, lado - 2, 1);
  pinta(ctx, P.oscuro, 1, lado - 2, lado - 2, 1);

  // una columna en cada esquina
  const dentro = 4, ancho = 6, alto = 14;
  [[dentro, dentro],
   [lado - dentro - ancho, dentro],
   [dentro, lado - dentro - alto],
   [lado - dentro - ancho, lado - dentro - alto]]
    .forEach(([px, py]) => dibujarColumnaAltar(ctx, px, py));

  // pedestal central: es donde se para el legendario
  const c = lado / 2;
  pinta(ctx, P.borde,  c - 8, c - 6, 16, 13);
  pinta(ctx, P.oscuro, c - 7, c - 5, 14, 11);
  pinta(ctx, P.claro,  c - 6, c - 4, 12, 2);
  pinta(ctx, P.base,   c - 6, c - 2, 12, 7);
}

/* Se arma en un canvas propio (coordenadas locales, más fácil de leer) y se
   pega entero sobre el fondo del mundo.
   ⚠️ Se probó recortarla contra el agua para que no se meta en el lago del
   altar de la Cima de la Sierra, pero ahí la losa queda cortada al medio y
   pierde dos de las cuatro columnas: se ve rota, no prolija. Entre eso y que
   el borde de piedra pise un poco la orilla -que lee como un muelle-, se
   eligió lo segundo: el altar es igual de cuadrado y simétrico en los 6. */
function dibujarPlataformaAltar(ctx, ox, oy){
  const lado = ALTAR_LADO;
  const losa = document.createElement('canvas');
  losa.width = losa.height = lado;
  dibujarLosaAltar(losa.getContext('2d'));
  ctx.drawImage(losa, ox + 8 - lado / 2, oy + 8 - lado / 2);
}

/* Columna de 6x14: base, fuste con cara iluminada y canto oscuro, capitel y
   sombra sobre la losa. Mismo lenguaje que el torii y los árboles del mapa,
   que también se dibujan como elementos verticales con sombra al pie. */
function dibujarColumnaAltar(ctx, x, y){
  const P = PIEDRA_ALTAR;
  pinta(ctx, 'rgba(0,0,0,.25)', x + 1, y + 13, 8, 2);   // sombra al pie
  pinta(ctx, P.oscuro, x - 1, y,      8, 3);            // capitel
  pinta(ctx, P.claro,  x - 1, y,      8, 1);
  pinta(ctx, P.base,   x,     y + 3,  6, 9);            // fuste
  pinta(ctx, P.claro,  x,     y + 3,  2, 9);            // cara iluminada
  pinta(ctx, P.canto,  x + 5, y + 3,  1, 9);            // canto sombreado
  pinta(ctx, P.oscuro, x - 1, y + 11, 8, 3);            // base
  pinta(ctx, P.borde,  x - 1, y + 13, 8, 1);
}

/* Contorno oscuro genérico: los sprites de Pokémon (entrenador y overworld)
   siempre llevan un borde de 1px separándolos del fondo -si no, un sprite
   chico se funde con el pasto-. Se agrega por post-proceso leyendo el alpha
   del canvas ya dibujado, así no hay que tocar el diseño pixel por pixel.
   Requiere que el canvas NO esté "tainted": las imágenes cross-origin deben
   cargarse con crossOrigin='anonymous' (jsdelivr manda Access-Control-Allow-
   Origin: *, así que funciona). */
function agregarBordeCanvas(origen, colorBorde){
  const w = origen.width, h = origen.height;
  const octx0 = origen.getContext('2d');
  let data;
  try{ data = octx0.getImageData(0, 0, w, h).data; }
  catch(e){ return origen; }   // canvas tainted (CORS): se muestra sin contorno
  const out = document.createElement('canvas');
  out.width = w + 2; out.height = h + 2;
  const octx = out.getContext('2d');
  const opaco = (x, y) => {
    if(x < 0 || y < 0 || x >= w || y >= h) return false;
    return data[(y * w + x) * 4 + 3] > 10;
  };
  for(let y = 0; y < h; y++){
    for(let x = 0; x < w; x++){
      if(opaco(x, y)) continue;
      /* Un borde de verdad tiene 1 o 2 vecinos opacos (un canto o una
         esquina). En un hueco angosto -las piernas separadas al caminar,
         por ejemplo- el pixel transparente queda rodeado por 3 o 4 lados:
         si a ESE también se le pinta el borde, el hueco entero (2-4px)
         termina pintado del color del borde y las dos piernas se ven
         fundidas en una sola mancha negra. Con 3+ vecinos opacos se deja
         el hueco transparente en vez de taparlo. */
      const vecinosOpacos = (opaco(x - 1, y) ? 1 : 0) + (opaco(x + 1, y) ? 1 : 0) +
                             (opaco(x, y - 1) ? 1 : 0) + (opaco(x, y + 1) ? 1 : 0);
      if(vecinosOpacos === 1 || vecinosOpacos === 2){
        pinta(octx, colorBorde, x + 1, y + 1);
      }
    }
  }
  octx.drawImage(origen, 1, 1);
  return out;
}

/* Sprite del entrenador: hoja real de Red (4 direcciones x 4 cuadros de
   caminata) que pasó Zeta, recortada a una grilla prolija de 48x72 por
   cuadro en images/red_walk.png. Local (mismo origen que el juego en
   GitHub Pages), así que no hace falta crossOrigin para leerle los
   píxeles. Reemplaza al dibujo a mano de antes -Zeta pidió explícitamente
   usar una imagen real, como con las pokébolas-. */
const RED_SHEET = new Image();
RED_SHEET.src = 'images/red_walk.png';
const RED_FRAME_W = 48, RED_FRAME_H = 72;
const RED_FILA = {abajo: 0, izq: 1, der: 2, arriba: 3};
const RED_FINAL_W = 14, RED_FINAL_H = 21;   // mantiene la proporción 48:72 del original

/* Sólo hay 16 combinaciones (4 direcciones x 4 cuadros), así que el recorte
   + suavizado + contorno se hace una sola vez por combinación y se cachea. */
const JUGADOR_SPRITE_CACHE = {};
function spriteJugadorCacheado(dir, paso){
  const clave = dir + '|' + paso;
  if(JUGADOR_SPRITE_CACHE[clave]) return JUGADOR_SPRITE_CACHE[clave];
  if(!RED_SHEET.complete || !RED_SHEET.naturalWidth) return null;   // todavía cargando
  const fila = RED_FILA[dir] ?? 0;
  /* Reducir de 48x72 a 14x21 de UN salto con suavizado mezclaba de golpe
     brazos y piernas que en la hoja original están separados, y el
     resultado eran manchas grises/negras confusas -sobre todo en los
     cuadros de caminar (izq/der), que es justo donde se ven las piernas
     cruzadas-. Mismo arreglo que ya se usó para los legendarios y los
     íconos de pokébola: paso intermedio CON suavizado (conserva la
     silueta general) y recién ahí el final SIN suavizado (nitidez
     pixel-art, sin la mezcla de la reducción grande). */
  const inter = document.createElement('canvas');
  inter.width = RED_FRAME_W / 2; inter.height = RED_FRAME_H / 2;
  const ictx = inter.getContext('2d');
  ictx.imageSmoothingEnabled = true;
  ictx.drawImage(RED_SHEET,
    paso * RED_FRAME_W, fila * RED_FRAME_H, RED_FRAME_W, RED_FRAME_H,
    0, 0, inter.width, inter.height);
  const cv = document.createElement('canvas');
  cv.width = RED_FINAL_W; cv.height = RED_FINAL_H;
  const cctx = cv.getContext('2d');
  cctx.imageSmoothingEnabled = false;
  cctx.drawImage(inter, 0, 0, RED_FINAL_W, RED_FINAL_H);
  const sprConBorde = agregarBordeCanvas(cv, '#1A1310');
  JUGADOR_SPRITE_CACHE[clave] = sprConBorde;
  return sprConBorde;
}

function dibujarJugador(ctx, ox, oy){
  ox = Math.round(ox); oy = Math.round(oy);
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.fillRect(ox + 4, oy + 14, 8, 2);
  const spr = spriteJugadorCacheado(advDir, advPaso);
  if(spr) ctx.drawImage(spr, ox, oy - 7);   // 14+2 de contorno = 16, justo el ancho del tile
}

/* Qué pokébola hay tirada en cada casillero. Sale por rareza, pero de forma
   DETERMINÍSTICA (a partir de la posición, con el mismo ruido que usa el
   resto del mapa): es un objeto tirado en el mundo, no una tómbola, así que
   tiene que ser el mismo cada vez que volvés. */
const BOLA_PISO_RAREZA = [['roja', 66], ['azul', 24], ['ultra', 9], ['maestra', 1]];
/* Durante un evento con boostPokebolasPiso: no se puede cambiar CUÁNTOS
   casilleros tienen un ítem tirado (eso es geometría fija del mapa
   generado), pero sí la rareza de lo que sale en esas mismas posiciones. */
const BOLA_PISO_RAREZA_EVENTO = [['roja', 35], ['azul', 35], ['ultra', 22], ['maestra', 8]];
function bolaDelPiso(x, y){
  const ev = eventoActivo();
  const tabla = (ev && ev.boostPokebolasPiso) ? BOLA_PISO_RAREZA_EVENTO : BOLA_PISO_RAREZA;
  const total = tabla.reduce((a, [, peso]) => a + peso, 0);
  let tiro = ruido(x, y, 77) * total;
  for(const [tipo, peso] of tabla){
    tiro -= peso;
    if(tiro < 0) return tipo;
  }
  return 'roja';
}

/* Cuánto vale cada moneda tirada en el piso. Igual criterio que las
   pokébolas: sale por posición, no al azar en cada visita.
   Valores chicos a propósito: las monedas se ganan en el quiz (15 por
   acierto) y en la pelea; lo del piso es un extra de una sola vez, no una
   fuente que compita con esos dos. Juntarlas TODAS da ~155, o sea un sobre. */
const MONEDA_PISO_VALORES = [[5, 60], [10, 30], [20, 10]];
function monedasDelPiso(x, y){
  const total = MONEDA_PISO_VALORES.reduce((a, [, peso]) => a + peso, 0);
  let tiro = ruido(x, y, 91) * total;
  for(const [valor, peso] of MONEDA_PISO_VALORES){
    tiro -= peso;
    if(tiro < 0) return valor;
  }
  return 25;
}

/* Las pokébolas y las monedas del piso se muestran como <img> encima del mapa, no dibujadas
   adentro del canvas. Motivo: el canvas del mundo se dibuja en baja resolución
   y se agranda por CSS, así que una bola de 13px terminaba con 13 píxeles
   estirados 3x -cuadriculada-. Como <img> usa la misma imagen y la misma
   nitidez que las pastillas del HUD, que es lo que pidió Zeta.
   Se reciclan los mismos elementos entre cuadros (nunca se recrean). */
function sincronizarObjetos(visibles, escala){
  const caja = document.getElementById('advObjetos');
  if(!caja) return;
  while(caja.children.length < visibles.length) caja.appendChild(document.createElement('span'));
  const lado = Math.round(ADV_PX * escala * .8);
  [...caja.children].forEach((el, i) => {
    const o = visibles[i];
    if(!o){ el.style.display = 'none'; return; }
    if(el.dataset.tipo !== o.tipo){
      el.dataset.tipo = o.tipo;
      /* La moneda usa el mismo emoji que el contador del HUD; las pokébolas,
         su imagen real. */
      el.innerHTML = o.tipo === 'moneda' ? '🪙' : o.tipo === 'calabaza' ? `<img src="${CALABAZA_IMG}" alt="Calabaza" style="image-rendering:pixelated">` : `<img src="${BOLAS[o.tipo].img}" alt="">`;
    }
    el.style.display = 'block';
    el.style.fontSize = lado + 'px';
    el.style.left = Math.round((o.px + ADV_PX / 2) * escala) + 'px';
    el.style.top  = Math.round((o.py + ADV_PX / 2) * escala) + 'px';
    const im = el.firstElementChild;
    if(im) im.style.width = im.style.height = lado + 'px';
  });
}

function advTileEn(x, y){
  const mapa = ADV_MAPS[advMapa];
  if(y < 0 || y >= mapa.rows.length || x < 0 || x >= mapa.cols) return null;
  const t = ADV_TILE[mapa.rows[y][x]] || null;
  return t && t.walk && cerradoPorEvento(x) ? TILE_CERRADO : t;
}

/* ---------- Evento con mapa cerrado (Halloween) ----------
   De la columna mapaCerradoDesdeX en adelante el mundo está clausurado: no se camina y en los
   pasos de la frontera hay calabazas. Se lee como un cartel al chocarlo. */
const TILE_CERRADO = {walk:false, cartel:true, label:'Clausurado por el evento'};
function cerradoPorEvento(x){
  const ev = eventoActivo();
  return !!(ev && ev.mapaCerradoDesdeX && advMapa === 'overworld' && x >= ev.mapaCerradoDesdeX);
}
/* calabazas en los pasos de la frontera (dos columnas, donde el camino cruza) */
function calabazasDelEvento(){
  const ev = eventoActivo();
  if(!ev || !ev.mapaCerradoDesdeX || advMapa !== 'overworld') return [];
  if(calabazasDelEvento._x !== ev.mapaCerradoDesdeX){
    const rows = ADV_MAPS.overworld.rows, lista = [];
    for(const x of [ev.mapaCerradoDesdeX, ev.mapaCerradoDesdeX + 1])
      for(let y = 0; y < rows.length; y++){ const t = ADV_TILE[rows[y][x]]; if(t && t.walk) lista.push({x, y}); }
    calabazasDelEvento._x = ev.mapaCerradoDesdeX; calabazasDelEvento._lista = lista;
  }
  return calabazasDelEvento._lista;
}
/* si quedó parado del lado clausurado (abrió la aventura antes del evento), vuelve al inicio */
function sacarDeZonaCerrada(){
  const ev = eventoActivo();
  if(!ev || !ev.mapaCerradoDesdeX) return;
  const enCuevaCerrada = advMapa !== 'overworld' && !['kanto', 'johto'].includes(advRegion);
  if(enCuevaCerrada || (advMapa === 'overworld' && advX >= ev.mapaCerradoDesdeX)){
    advMapa = 'overworld';
    const inicio = advBuscarTile('overworld', '@');
    advPonerEn(inicio.x, inicio.y);
    advMensaje('🎃 Durante el <b>' + ev.nombre + '</b> sólo se puede andar por Kanto y Johto.');
  }
}
/* calabaza pixel-art 16x16 (se dibuja una vez) */
const CALABAZA_IMG = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const g = c.getContext('2d');
  const px = (col, pts) => { g.fillStyle = col; pts.forEach(([x, y, w, h]) => g.fillRect(x, y, w || 1, h || 1)); };
  px('#5A2A0A', [[3,5,10,1],[2,6,1,7],[13,6,1,7],[3,13,10,1],[1,7,1,5],[14,7,1,5],[4,14,8,1]]);
  px('#F28C28', [[3,6,10,7],[2,7,12,5],[4,13,8,1]]);
  px('#C2571A', [[6,6,1,7],[9,6,1,7]]);
  px('#FFB347', [[4,7,1,2],[11,7,1,2]]);
  px('#2B1B0E', [[4,8,2,2],[10,8,2,2],[5,11,6,1],[6,12,1,1],[9,12,1,1]]);
  px('#3E8E2F', [[7,2,2,4],[9,3,2,1]]);
  return c.toDataURL();
})();

function advBuscarTile(mapaId, chars){
  const mapa = ADV_MAPS[mapaId];
  for(let y = 0; y < mapa.rows.length; y++){
    for(let x = 0; x < mapa.cols; x++){
      if(chars.includes(mapa.rows[y][x])) return {x, y};
    }
  }
  return {x:1, y:1};
}

/* El HUD muestra la Poké Ball siempre y las demás sólo si tenés alguna: con
   cuatro pastillas fijas no entraban en la pantalla del celular. */
function advSyncHud(){
  const c = document.getElementById('advCoins');
  if(!c) return;
  c.textContent = coins;
  const caja = document.getElementById('advBolasHud');
  const visibles = Object.keys(BOLAS).filter(t => t === 'roja' || bolas[t] > 0);
  const firma = visibles.map(t => t + bolas[t]).join('|');
  if(caja.dataset.firma !== firma){
    caja.dataset.firma = firma;
    caja.innerHTML = visibles.map(t =>
      `<span class="pill"><img src="${BOLAS[t].img}" alt="${BOLAS[t].nombre}"> <b>${bolas[t]}</b></span>`).join('');
  }
  const sc = document.getElementById('shopCoins');
  if(sc) sc.textContent = coins;
}

function advMensaje(txt){
  const box = document.getElementById('advZona');
  if(advZonaTimer){ clearTimeout(advZonaTimer); advZonaTimer = null; }
  if(!txt){ box.classList.remove('ver'); return; }
  box.innerHTML = txt;
  box.classList.add('ver');
  advZonaTimer = setTimeout(() => { advZonaTimer = null; box.classList.remove('ver'); }, 2800);
}

/* Cartel grande al cruzar una frontera: antes las regiones estaban pegadas y
   no se notaba en cuál estabas. */
function advCartelRegion(region){
  const box = document.getElementById('advZona');
  if(advZonaTimer){ clearTimeout(advZonaTimer); advZonaTimer = null; }
  box.innerHTML = `<span class="adv-region">🏞️ Entrás a ${NOMBRE_REGION[region] || region}</span>` +
    `<br><span style="opacity:.85">Acá salen los Pokémon de ${NOMBRE_REGION[region] || region}</span>`;
  box.classList.add('ver', 'grande');
  advCartelHasta = Date.now() + 3200;
  advZonaTimer = setTimeout(() => {
    advZonaTimer = null;
    box.classList.remove('ver', 'grande');
  }, 3200);
}

function advZonaDe(x, y){
  const zonas = ADV_MAPS[advMapa].zonas || [];
  const z = zonas.find(z => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1);
  return z ? z.n : ADV_MAPS[advMapa].nombre;
}

/* ---------- Fondo pre-dibujado ----------
   Con 90x54 casilleros, repintar tile por tile en cada cuadro del movimiento
   fluido era carísimo. El mapa se dibuja UNA vez en un canvas aparte y cada
   cuadro sólo copia el pedazo visible. */
const advFondos = {};

function advFondo(mapaId){
  /* La cueva se pinta distinto según la región de la entrada (temaCueva),
     así que su fondo pre-dibujado no puede cachearse sólo por mapaId: si no,
     la primera región que entra deja su paleta pegada para siempre. Mismo
     motivo para el estado del evento: bolaDelPiso() depende de él, así que
     si no entra en la clave, arrancar/terminar el evento deja pegada la
     rareza vieja de pokébolas hasta recargar la página. */
  const ev = eventoActivo();
  const boostBolas = (ev && ev.boostPokebolasPiso) ? 'evB' : 'evN';
  const clave = (mapaId === 'cueva' ? mapaId + ':' + advRegion : mapaId) + ':' + boostBolas;
  if(advFondos[clave]) return advFondos[clave];
  const mapa = ADV_MAPS[mapaId];
  const cv = document.createElement('canvas');
  cv.width  = mapa.cols * ADV_PX;
  cv.height = mapa.rows.length * ADV_PX;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const antes = advMapa;
  advMapa = mapaId;                       // los pintores miran vecinos con charEn
  const altares = [];
  mapa.rows.forEach((fila, y) => {
    [...fila].forEach((ch, x) => {
      const t = ADV_TILE[ch] || ADV_TILE['.'];
      if(ch === 'L') altares.push([x, y]);
      (PINTORES[t.pinta] || PINTORES.pasto)(ctx, x * ADV_PX, y * ADV_PX, x, y);
    });
  });
  /* La plataforma del altar se pinta en una pasada aparte, DESPUÉS de todos
     los tiles: se mete adentro de los casilleros vecinos (por eso queda más
     grande e imponente) y si se pintara tile por tile, el vecino de abajo o
     de la derecha -que todavía no se dibujó- la taparía con su propio fondo. */
  altares.forEach(([x, y]) => dibujarPlataformaAltar(ctx, x * ADV_PX, y * ADV_PX));
  advMapa = antes;
  advFondos[clave] = cv;
  return cv;
}

/* El avistamiento activo (si lo hay) para el mapa que se está por dibujar. */
function avistamientoActivo(){
  return (legendarioVisible && legendarioVisible.mapa === advMapa && Date.now() < legendarioVisible.hasta)
    ? legendarioVisible : null;
}

/* Zoom: casilleros grandes (el juego ocupa toda la pantalla, así que se ve un
   pedazo del mapa y la cámara sigue al jugador). */
function advEscala(ancho, alto){
  const chico = Math.min(ancho, alto);
  let base = chico < 420 ? 3 : chico < 700 ? 3.4 : 4;
  /* El avistamiento ya no pasa siempre pegado al altar (RADIO_AVISTAMIENTO):
     la cámara se aleja lo que haga falta para que jugador y altar-plataforma
     entren los dos en pantalla, con aire, en vez de un alejamiento fijo que
     sólo alcanzaba para la distancia de "parado encima". */
  const avist = avistamientoActivo();
  if(avist){
    const MARGEN = 5 * ADV_PX;
    const distX = Math.abs(avist.x * ADV_PX - advPx) + MARGEN;
    const distY = Math.abs(avist.y * ADV_PX - advPy) + MARGEN;
    base = Math.min(base * 0.72, ancho / distX, alto / distY);
    base = Math.max(base, 1.3);   // piso: que no se achique tanto que deje de leerse
  }
  return base;
}

function advRender(){
  const cv = document.getElementById('advMap');
  const mapa = ADV_MAPS[advMapa];
  const anchoCss = cv.clientWidth  || window.innerWidth;
  const altoCss  = cv.clientHeight || window.innerHeight;
  const escala = advEscala(anchoCss, altoCss);

  // el canvas interno mide lo que se ve en píxeles de mundo
  const vw = Math.ceil(anchoCss / escala);
  const vh = Math.ceil(altoCss  / escala);
  if(cv.width !== vw || cv.height !== vh){ cv.width = vw; cv.height = vh; }

  // durante el avistamiento la cámara no sigue solo al jugador: se centra
  // en el punto medio entre el jugador y el altar, para que entren los dos.
  const avist = avistamientoActivo();
  const centroX = avist ? (advPx + 8 + avist.x * ADV_PX + 8) / 2 : advPx + 8;
  const centroY = avist ? (advPy + 8 + avist.y * ADV_PX + 8) / 2 : advPy + 8;

  const mundoW = mapa.cols * ADV_PX, mundoH = mapa.rows.length * ADV_PX;
  let camX = Math.round(centroX - vw / 2);
  let camY = Math.round(centroY - vh / 2);
  camX = mundoW <= vw ? Math.round((mundoW - vw) / 2) : Math.max(0, Math.min(mundoW - vw, camX));
  camY = mundoH <= vh ? Math.round((mundoH - vh) / 2) : Math.max(0, Math.min(mundoH - vh, camY));

  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0B1020';
  ctx.fillRect(0, 0, vw, vh);
  ctx.drawImage(advFondo(advMapa), -camX, -camY);

  // pokébolas tiradas en el piso (las que todavía no levantó)
  const objetos = [];
  mapa.rows.forEach((fila, y) => {
    [...fila].forEach((ch, x) => {
      const t = ADV_TILE[ch];
      if(!t || !t.item || advTomados.has(advMapa + ':' + x + ',' + y)) return;
      const px0 = x * ADV_PX - camX, py0 = y * ADV_PX - camY;
      if(px0 < -16 || py0 < -16 || px0 > vw || py0 > vh) return;
      objetos.push({tipo: t.item === 'moneda' ? 'moneda' : bolaDelPiso(x, y), px: px0, py: py0});
    });
  });
  calabazasDelEvento().forEach(({x, y}) => {
    const px0 = x * ADV_PX - camX, py0 = y * ADV_PX - camY;
    if(px0 >= -16 && py0 >= -16 && px0 <= vw && py0 <= vh) objetos.push({tipo: 'calabaza', px: px0, py: py0});
  });
  sincronizarObjetos(objetos, escala);

  if(legendarioVisible && legendarioVisible.mapa === advMapa && Date.now() < legendarioVisible.hasta){
    dibujarLegendario(ctx, legendarioVisible.p, legendarioVisible.x * ADV_PX - camX, legendarioVisible.y * ADV_PX - camY);
  } else if(legendarioVisible && Date.now() >= legendarioVisible.hasta){
    const p = legendarioVisible.p;
    legendarioVisible = null;
    advMensaje(`💨 <b>${p.name}</b> se fue antes de que llegaras.`);
  }

  dibujarJugador(ctx, advPx - camX, advPy - camY);
  dibujarMini();
  advDibujado = true;
}

/* ---------- Minimapa ----------
   Versión chiquita del mundo (2 px por casillero) con las fronteras marcadas y
   un punto donde estás. Sirve para saber en qué región andás. */
let advMiniFondo = null;
const MINI_PX = 2;

function miniFondo(){
  if(advMiniFondo) return advMiniFondo;
  const mapa = ADV_MAPS.overworld;
  const cv = document.createElement('canvas');
  cv.width = mapa.cols * MINI_PX;
  cv.height = mapa.rows.length * MINI_PX;
  const ctx = cv.getContext('2d');
  const color = {'~':'#2C68C8', 'a':'#E8D9A8', 'B':'#8A5F35', '#':'#2E7A2C', '"':'#2F7A2A',
                 '^':'#8E8C82', 'V':'#54301F', 'F':'#6F3E21', '.':'#C6AC7C', 'P':'#C0392B',
                 'p':'#C0392B', 'q':'#C0392B', 'r':'#EFE7D5', 'C':'#151420', 'L':'#C6A6FF',
                 'T':'#C0392B', 'i':'#B98A50', 'b':'#FFFFFF', 'c':'#F0B400'};
  mapa.rows.forEach((fila, y) => {
    [...fila].forEach((ch, x) => {
      ctx.fillStyle = color[ch] || '#4E9E33';
      ctx.fillRect(x * MINI_PX, y * MINI_PX, MINI_PX, MINI_PX);
    });
  });
  // líneas de frontera + inicial de cada región
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  FRONTERAS.slice(0, -1).forEach(f => ctx.fillRect(f.hasta * MINI_PX, 0, 1, cv.height));
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  [['K', 25], ['J', 81], ['H', 135], ['S', 189], ['T', 243], ['X', 297]].forEach(([letra, col]) => {
    ctx.fillText(letra, col * MINI_PX, 13);
  });
  advMiniFondo = cv;
  return cv;
}

function dibujarMini(){
  const cv = document.getElementById('advMini');
  if(!cv) return;
  if(advMapa !== 'overworld'){ cv.hidden = true; return; }   // adentro de la cueva no sirve
  cv.hidden = false;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(miniFondo(), 0, 0);
  const px = (advPx / ADV_PX) * MINI_PX, py = (advPy / ADV_PX) * MINI_PX;
  ctx.fillStyle = '#141728';
  ctx.fillRect(px - 3, py - 3, 7, 7);
  ctx.fillStyle = '#F0B400';
  ctx.fillRect(px - 2, py - 2, 5, 5);
}

/* Hay una cueva por región y todas dan al mismo interior, así que se guarda
   por dónde se bajó para devolver al jugador a ESA entrada. */
let advVuelta = null;

function advIrA(mapaId){
  if(mapaId === 'cueva'){
    advVuelta = {x:advX, y:advY, region:advRegion};
    advMapa = 'cueva';
    const boca = advBuscarTile('cueva', 'E');
    advPonerEn(boca.x, boca.y + 1);
    advMensaje('🕳️ Entraste a la <b>Cueva Secreta</b>. Dicen que al fondo hay un altar…');
  } else {
    advMapa = 'overworld';
    const v = advVuelta || advBuscarTile('overworld', '@');
    const libre = advLugarLibre(v.x, v.y);
    advPonerEn(libre.x, libre.y);
    advRegion = regionDe(advX);
    advMensaje('☀️ Volviste a la superficie');
  }
  advZonaActual = '';
  advRender();
}

function advPonerEn(x, y){
  const t = advTileEn(x, y);
  if(!t || !t.walk){ const libre = advLugarLibre(x, y); x = libre.x; y = libre.y; }
  advX = x; advY = y;
  advPx = x * ADV_PX; advPy = y * ADV_PX;
  if(advMapa === 'overworld') advRegion = regionDe(x);
}

/* Casillero caminable al lado de (x,y) que NO sea una puerta: al volver de la
   cueva, caer justo sobre la entrada te hacía entrar de nuevo, en bucle. */
function advLugarLibre(x, y){
  const cerca = [[0,1], [0,-1], [-1,0], [1,0], [1,1], [-1,1], [0,2]];
  for(const [dx, dy] of cerca){
    const t = advTileEn(x + dx, y + dy);
    if(t && t.walk && !t.entra) return {x:x + dx, y:y + dy};
  }
  return {x, y:y + 1};
}

function advOcupado(){
  return document.getElementById('encOverlay').classList.contains('show')
      || document.getElementById('shopOverlay').classList.contains('show')
      || document.getElementById('overlay').classList.contains('show')
      || document.getElementById('specialOverlay').classList.contains('show');
  // el avistamiento YA NO frena al jugador: hay que caminar hasta el altar
}

/* ---------- Motor de movimiento ----------
   El jugador se mueve en píxeles, no de a casilleros. La caja de choque son
   los pies (10x7): así se puede pasar rozando un árbol, como en los cenitales
   de consola, en vez de quedar trabado por la cabeza. */
const ADV_VEL = 58;                        // píxeles de mundo por segundo
const CAJA = {x:3, y:8, w:10, h:7};
let advEje = {x:0, y:0};                   // hacia dónde empuja el teclado o el joystick

function advChoca(px, py){
  const x0 = px + CAJA.x, y0 = py + CAJA.y;
  const esquinas = [[x0, y0], [x0 + CAJA.w - 1, y0], [x0, y0 + CAJA.h - 1], [x0 + CAJA.w - 1, y0 + CAJA.h - 1]];
  return esquinas.some(([cx, cy]) => {
    const t = advTileEn(Math.floor(cx / ADV_PX), Math.floor(cy / ADV_PX));
    return !t || !t.walk;
  });
}

function advPaso1(dt){
  if(advOcupado()){ advPaso = 0; return; }
  let vx = advEje.x, vy = advEje.y;
  const largo = Math.hypot(vx, vy);
  if(largo < .15){ advPaso = 0; advCamino = 0; return; }
  if(largo > 1){ vx /= largo; vy /= largo; }

  advDir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'izq' : 'der') : (vy < 0 ? 'arriba' : 'abajo');

  const paso = ADV_VEL * dt;
  const antesX = advPx, antesY = advPy;
  const nx = advPx + vx * paso;
  if(!advChoca(nx, advPy)) advPx = nx;
  const ny = advPy + vy * paso;
  if(!advChoca(advPx, ny)) advPy = ny;

  const mapa = ADV_MAPS[advMapa];
  advPx = Math.max(0, Math.min(mapa.cols * ADV_PX - ADV_PX, advPx));
  advPy = Math.max(0, Math.min(mapa.rows.length * ADV_PX - ADV_PX, advPy));

  const anduvo = Math.hypot(advPx - antesX, advPy - antesY);
  if(anduvo > 0){
    advCamino += anduvo;
    advPaso = Math.floor(advCamino / 7) % 4;   // los 4 cuadros de caminata de la hoja de Red
  }

  // casillero donde están los pies
  const cx = Math.floor((advPx + 8) / ADV_PX), cy = Math.floor((advPy + 11) / ADV_PX);
  const cambioCasillero = cx !== advX || cy !== advY;
  advX = cx; advY = cy;
  if(advMapa === 'overworld') advRegion = regionDe(cx);

  // si el paso quedó frenado contra un cartel, se lee solo
  if(cambioCasillero === false && anduvo < paso * .4){
    const mira = advDir === 'izq' ? [-1,0] : advDir === 'der' ? [1,0] : advDir === 'arriba' ? [0,-1] : [0,1];
    const frente = advTileEn(cx + mira[0], cy + mira[1]);
    if(frente && frente.cartel) advLeerCartel(cx + mira[0], cy + mira[1]);
  }

  const zona = advZonaDe(cx, cy);
  if(advRegion !== advRegionAnterior && advMapa === 'overworld'){
    advRegionAnterior = advRegion;
    advZonaActual = zona;
    advCartelRegion(advRegion);
  } else if(zona !== advZonaActual){
    advZonaActual = zona;
    /* El cartel de la región tiene prioridad: si se anuncia la zona apenas
       cruzás, el "Entrás a JOHTO" dura dos pasos y no se llega a leer. */
    if(Date.now() > advCartelHasta) advMensaje(`📍 <b>${zona}</b>`);
  }

  const t = advTileEn(cx, cy);
  if(!t) return;
  if(cambioCasillero) advPisar(t, cx, cy);

  // llegaste al altar donde está esperando el legendario avistado: a pelear.
  const avist = avistamientoActivo();
  if(avist && cx === avist.x && cy === avist.y){
    legendarioVisible = null;
    iniciarEncuentro(avist.p);
    return;
  }

  if(advDescanso > 0){ advDescanso -= anduvo; return; }   // recién salió uno: dejalo caminar
  if(avist) return;   // ya hay uno esperando: no tirar otro altar ni cruzarlo con un encuentro salvaje
  if(advCamino >= 16){
    const cerca = altarMasCercano(cx, cy);
    if(cerca && cerca.dist <= RADIO_AVISTAMIENTO){
      advCamino = 0;
      tirarAltar(cerca.santuario, cerca.x, cerca.y, cx, cy);
      return;
    }
    if(t.encuentro){
      advCamino = 0;
      if(Math.random() <= probEncuentro(t.encuentro)){
        advDescanso = DESCANSO_ENCUENTRO;
        salirEncuentro(t, cx, cy);
      }
    }
  }
}

/* Los legendarios SÓLO salen en los altares, uno por día CADA UNO: el mismo
   altar puede seguir dando otro legendario distinto de su lista el mismo día.
   Ya no hace falta pisar el altar: se llama con el más cercano dentro de
   RADIO_AVISTAMIENTO, así que (x,y) puede quedar lejos de donde está parado
   el jugador. */
/* Racha de mala suerte: cada tiro fallado cerca de un altar sube un poco la
   chance del siguiente, para que no dependa solo de acertar el 12% justo al
   pisar el altar. Sube despacio a propósito (a diferencia del radio y la
   base, esto NO se bajó): la idea es que siga siendo raro en general, pero
   que si te quedás dando vueltas pegado al altar no sea eterno. Se resetea
   al acertar. */
let avistamientoPity = {};

function tirarAltar(santuario, x, y, px, py){
  if(MODO_SERVIDOR) return tirarAltarServidor(santuario, x, y, px, py);
  if(!santuario) return;
  if(legendariosAgotadosHoy(santuario)){
    const evLeg = eventoVistaActiva();
    const ningunoDeKJ = evLeg && !santuario.pokes.some(n => {
      const p = ADV_DATA.find(d => d.name === n);
      return p && IDS_KANTO_JOHTO.has(p.id);
    });
    if(ningunoDeKJ){
      advMensaje('✨ El altar está en silencio. Durante el evento sólo aparecen legendarios de Kanto y Johto.');
      advDescanso = DESCANSO_ENCUENTRO * 4;
      return;
    }
    const salidos = santuario.pokes.filter(n => legendarioYaSalioHoy(n));
    const cierre = (evLeg && evLeg.cooldownLegendarioMin)
      ? `Volvé a probar en ${evLeg.cooldownLegendarioMin} minutos.`
      : 'Volvé mañana.';
    advMensaje(`✨ El altar está en silencio. Ya aparecieron <b>${salidos.join('</b>, <b>')}</b> acá. ${cierre}`);
    advDescanso = DESCANSO_ENCUENTRO * 4;
    return;
  }
  const fallos = avistamientoPity[santuario.n] || 0;
  const prob = Math.min(.6, ADV_PROB.legendario + fallos * .08);
  if(Math.random() > prob){
    avistamientoPity[santuario.n] = fallos + 1;
    return;
  }
  avistamientoPity[santuario.n] = 0;
  const p = legendarioDelAltar(santuario);
  if(!p) return;
  anotarLegendario(p, santuario);
  advDescanso = DESCANSO_ENCUENTRO;
  advMensaje(`✨ <b>${santuario.n}</b> se ilumina… ¡acercate al altar!`);
  mostrarLegendarioEnMapa(p, x, y);
  /* Ya no arranca la pelea solo con avistarlo: hay que caminar hasta el
     altar (ver el chequeo de llegada en advPaso1/advMover). Si no llega a
     tiempo, advRender() lo hace desaparecer solo al vencer legendarioVisible.hasta. */
}

function advPisar(t, x, y){
  if(t.entra){ advIrA(t.entra); return; }
  if(t.accion === 'centro'){ abrirTienda(); return; }
  if(t.item){
    const clave = advMapa + ':' + x + ',' + y;
    if(advTomados.has(clave)) return;
    advTomados.add(clave);
    if(MODO_SERVIDOR) return levantarServidor(advMapa, x, y);
    if(t.item === 'moneda'){
      const valor = monedasDelPiso(x, y);
      coins += valor;
      updateCoins(); saveProgress(); advSyncHud(); enviarPuntaje();
      advMensaje(`Encontraste <b>${valor}</b> monedas 🪙`);
      return;
    }
    const tipo = bolaDelPiso(x, y);
    bolas[tipo] += 1;
    saveProgress(); advSyncHud();
    advMensaje(`Encontraste una <b>${BOLAS[tipo].nombre}</b> en el piso`);
  }
}

/* Los carteles no se pisan (son postes): el mensaje sale al chocarlos. */
function advLeerCartel(x, y){
  if(cerradoPorEvento(x)){
    const ev = eventoActivo();
    const fin = new Date(ev.fin).toLocaleTimeString('es-AR', {timeZone: ZONA_HORARIA, hour: '2-digit', minute: '2-digit', hour12: false});
    advMensaje('🎃 <b>Clausurado por el ' + ev.nombre.replace(/!$/, '') + '.</b> Hasta las ' + fin + ' sólo se puede andar por Kanto y Johto.');
    return;
  }
  const txt = (ADV_MAPS[advMapa].carteles || {})[x + ',' + y];
  if(txt) advMensaje(txt);
}

function advCiclo(ahora){
  if(!advAbierto){ advRaf = null; return; }
  const dt = Math.min(.05, (ahora - advUltimo) / 1000 || 0);
  advUltimo = ahora;
  advPaso1(dt);
  advRender();
  advRaf = requestAnimationFrame(advCiclo);
}

/* Compatibilidad con el modo de a pasos: mueve un casillero entero. */
function advMover(dx, dy){
  if(!advAbierto || advOcupado()) return;
  advDir = dy < 0 ? 'arriba' : dy > 0 ? 'abajo' : dx < 0 ? 'izq' : 'der';
  const nx = advX + dx, ny = advY + dy;
  const t = advTileEn(nx, ny);
  if(!t || !t.walk){
    if(t && t.cartel) advLeerCartel(nx, ny);
    advRender();
    return;
  }
  advPonerEn(nx, ny);
  advCamino = 16;
  advRender();
  advPisar(t, nx, ny);

  const avist = avistamientoActivo();
  if(avist && nx === avist.x && ny === avist.y){
    legendarioVisible = null;
    iniciarEncuentro(avist.p);
    return;
  }

  if(advDescanso > 0){ advDescanso -= ADV_PX; return; }
  if(avist) return;
  const cerca = altarMasCercano(nx, ny);
  if(cerca && cerca.dist <= RADIO_AVISTAMIENTO){ tirarAltar(cerca.santuario, cerca.x, cerca.y, nx, ny); return; }
  if(t.encuentro && Math.random() <= probEncuentro(t.encuentro)){
    advDescanso = DESCANSO_ENCUENTRO;
    salirEncuentro(t, nx, ny);
  }
}

/* ---------- Encuentro y captura ---------- */
let encuentro = null;

/* Quién sale en el encuentro: lo sortea el juego o, con servidor, el servidor. */
function salirEncuentro(t, x, y){
  if(MODO_SERVIDOR) return encuentroServidor(x, y);
  iniciarEncuentro(elegirPesado(poolBioma(t.encuentro)));
}

function iniciarEncuentro(p){
  encuentro = {p, tiros:0};
  document.getElementById('encTitle').textContent = `¡Un ${p.name} salvaje!`;
  document.getElementById('encImg').src = p.img;
  document.getElementById('encName').textContent = p.name;
  document.getElementById('encInfo').innerHTML =
    `<span style="color:${colorLegible(TYPE_COLORS[p.type])};font-weight:700;">${TYPE_LABEL[p.type]}</span>` +
    ` · <span style="color:${colorLegible(RAREZA_COLOR[p.rarity] || '#CFE0FF')};font-weight:700;">${p.rarity}</span>`;
  document.getElementById('encFeedback').textContent = totalBolas() === 0
    ? 'No te quedan pokébolas. Comprá en el Centro Pokémon 🏥'
    : 'Elegí con qué pokébola tirar.';
  document.getElementById('encCloseBtn').textContent = 'Huir';
  renderEncuentro();
  // fogonazo en el mapa, como cuando arranca un combate
  const cv = document.getElementById('advMap');
  cv.classList.remove('flash');
  void cv.offsetWidth;
  cv.classList.add('flash');
  document.getElementById('encOverlay').classList.add('show');
  advMensaje(`¡Apareció un <b>${p.name}</b>!`);
}

function totalBolas(){ return Object.keys(BOLAS).reduce((a, t) => a + (bolas[t] || 0), 0); }

function renderEncuentro(){
  if(!encuentro) return;
  const tiros = document.getElementById('encTiros');
  tiros.innerHTML = '';
  for(let i = 0; i < ENC_TIROS; i++){
    const b = document.createElement('img');
    b.src = BOLAS.roja.img;
    b.alt = 'tiro';
    b.style.cssText = 'width:20px;height:20px;image-rendering:pixelated;';
    if(i < encuentro.tiros) b.className = 'usado';
    tiros.appendChild(b);
  }
  const box = document.getElementById('encBolas');
  box.innerHTML = '';
  Object.keys(BOLAS).forEach(tipo => {
    const b = BOLAS[tipo];
    const btn = document.createElement('button');
    btn.className = 'bola-btn';
    btn.disabled = bolas[tipo] <= 0;
    btn.innerHTML = `<img class="bola-ico" src="${b.img}" alt=""><b>${b.nombre}</b>` +
      `<span>x${bolas[tipo]}</span><span>${BOLAS[tipo].seguro ? 'seguro' : chanceCaptura(encuentro.p, tipo) + '% de atraparlo'}</span>`;
    btn.onclick = () => tirarBola(tipo);
    box.appendChild(btn);
  });
}

function cerrarEncuentro(){
  if(MODO_SERVIDOR && encuentro) accionServidor('huir').catch(() => {});
  encuentro = null;
  document.getElementById('encOverlay').classList.remove('show');
}

function tirarBola(tipo){
  if(MODO_SERVIDOR) return tirarBolaServidor(tipo);
  if(!encuentro || bolas[tipo] <= 0) return;
  const p = encuentro.p;
  bolas[tipo]--;
  encuentro.tiros++;
  const chance = chanceCaptura(p, tipo);
  const atrapado = Math.random() * 100 < chance;
  saveProgress();
  advSyncHud();
  renderEncuentro();

  const fb = document.getElementById('encFeedback');
  if(atrapado){ capturar(p); return; }

  if(encuentro.tiros >= ENC_TIROS || totalBolas() === 0){
    fb.innerHTML = totalBolas() === 0 && encuentro.tiros < ENC_TIROS
      ? `Te quedaste sin pokébolas y <b>${p.name}</b> se escapó 💨`
      : `<b>${p.name}</b> se soltó por última vez y se escapó 💨`;
    document.getElementById('encCloseBtn').textContent = 'Seguir explorando';
    encuentro = null;
    document.getElementById('encBolas').innerHTML = '';
    return;
  }
  fb.innerHTML = `¡Casi! <b>${p.name}</b> se soltó. Te quedan ${ENC_TIROS - encuentro.tiros} tiro(s).`;
}

function capturar(p){
  const s = state[p.id];
  const isNew = !s.got;
  if(isNew){ s.got = true; } else { s.dup += 1; }
  renderGrid();
  updateProgress();
  saveProgress();
  capturarVista(p, isNew);
}
function capturarVista(p, isNew){
  enviarPuntaje();
  encuentro = null;

  document.getElementById('encFeedback').innerHTML =
    `¡Atrapaste a <b>${p.name}</b>! ${isNew ? 'Nueva figurita 🎉' : 'Ya la tenías: suma repetida.'}`;
  document.getElementById('encBolas').innerHTML = '';
  setTimeout(() => {
    cerrarEncuentro();
    const pull = [{p, isNew}];
    if(isSpecial(p)) playSpecialSequence(pull, 0, () => showReveal(pull, '¡Lo atrapaste!'));
    else showReveal(pull, '¡Lo atrapaste!');
  }, 900);
}

/* ---------- Centro Pokémon (sólo vende pokébolas) ---------- */
function abrirTienda(){
  document.getElementById('shopFeedback').textContent = '';
  renderTienda();
  document.getElementById('shopOverlay').classList.add('show');
}

function renderTienda(){
  const lista = document.getElementById('shopList');
  lista.innerHTML = '';
  advSyncHud();
  const evTienda = eventoActivo();
  const textoCooldown = (evTienda && evTienda.cooldownCompraMaestraMin)
    ? `cada ${evTienda.cooldownCompraMaestraMin} min durante el evento`
    : 'por día';
  Object.keys(BOLAS).forEach(tipo => {
    const b = BOLAS[tipo];
    const fila = document.createElement('div');
    fila.className = 'shop-row';
    fila.innerHTML = `<img class="bola-ico" src="${b.img}" alt="">
      <span class="txt"><b>${b.nombre}${b.cantidad > 1 ? ` x${b.cantidad}` : ''}</b>${b.desc}<br>Tenés ${bolas[tipo]}${b.porDia ? ' · ' + (compradasHoy(tipo) >= b.porDia ? '<b>ya compraste la de ' + textoCooldown + '</b>' : 'te queda la de ' + textoCooldown) : ''}</span>`;
    const btn = document.createElement('button');
    btn.className = 'open-btn';
    btn.style.padding = '9px 14px';
    const agotadaHoy = b.porDia && compradasHoy(tipo) >= b.porDia;
    btn.textContent = agotadaHoy ? 'no' : `${b.precio} 🪙`;
    btn.title = agotadaHoy ? 'Sólo se vende una ' + textoCooldown : '';
    btn.disabled = !puedeComprar(tipo);
    btn.onclick = () => comprarBola(tipo);
    fila.appendChild(btn);
    lista.appendChild(fila);
  });
}

function comprarBola(tipo){
  if(MODO_SERVIDOR) return comprarBolaServidor(tipo);
  const b = BOLAS[tipo];
  if(!puedeComprar(tipo)) return;
  coins -= b.precio;
  bolas[tipo] += b.cantidad;
  if(b.porDia){
    const hoy = claveCooldownCompra();
    comprasDia = {[hoy]: Object.assign({}, comprasDia[hoy])};   // sólo se guarda la clave actual
    comprasDia[hoy][tipo] = (comprasDia[hoy][tipo] || 0) + 1;
  }
  updateCoins();
  saveProgress();
  renderTienda();
  const evComp = eventoActivo();
  const proxima = (evComp && evComp.cooldownCompraMaestraMin)
    ? `en ${evComp.cooldownCompraMaestraMin} min`
    : 'mañana';
  document.getElementById('shopFeedback').innerHTML =
    `Compraste ${b.cantidad > 1 ? b.cantidad + ' ' : ''}<b>${b.nombre}</b>` +
    (b.porDia ? ' · la próxima, ' + proxima : '');
}

/* ---------- Abrir / cerrar la aventura ---------- */
function abrirAventura(){
  advAbierto = true;
  document.getElementById('advOverlay').classList.add('show');
  if(!advDibujado){
    const inicio = advBuscarTile('overworld', '@');
    advPonerEn(inicio.x, inicio.y);
    advZonaActual = '';
  }
  sacarDeZonaCerrada();
  advRender();
  advSyncHud();
  advMensaje('Caminá hasta la <b>hierba alta</b> o el <b>lago</b> para que salgan Pokémon');
  // la ayuda de los mandos se retira sola: después tapa el mapa
  const ayuda = document.querySelector('.adv-ayuda');
  if(ayuda){ ayuda.classList.remove('oculta'); clearTimeout(abrirAventura._t); abrirAventura._t = setTimeout(() => ayuda.classList.add('oculta'), 9000); }
  advUltimo = performance.now();
  if(!advRaf) advRaf = requestAnimationFrame(advCiclo);
  // pantalla completa de verdad donde el navegador lo permita
  try{
    const el = document.documentElement;
    if(!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }catch(e){}
}

function cerrarAventura(){
  advAbierto = false;
  advEje = {x:0, y:0};
  if(advRaf){ cancelAnimationFrame(advRaf); advRaf = null; }
  sincronizarObjetos([], 1);        // esconder las pokébolas del piso al salir
  document.getElementById('advOverlay').classList.remove('show');
  try{ if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); }catch(e){}
}

/* ---------- Teclado (se mantiene apretada la tecla) ---------- */
const TECLAS = {ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0],
                w:[0,-1], s:[0,1], a:[-1,0], d:[1,0]};
const teclasApretadas = new Set();

function ejeDeTeclado(){
  let x = 0, y = 0;
  teclasApretadas.forEach(k => { const d = TECLAS[k]; if(d){ x += d[0]; y += d[1]; } });
  return {x:Math.max(-1, Math.min(1, x)), y:Math.max(-1, Math.min(1, y))};
}

document.addEventListener('keydown', e => {
  if(!advAbierto) return;
  const k = TECLAS[e.key] ? e.key : (e.key || '').toLowerCase();
  if(!TECLAS[k]) return;
  e.preventDefault();
  teclasApretadas.add(k);
  if(!stickActivo) advEje = ejeDeTeclado();
});
document.addEventListener('keyup', e => {
  const k = TECLAS[e.key] ? e.key : (e.key || '').toLowerCase();
  if(!TECLAS[k]) return;
  teclasApretadas.delete(k);
  if(!stickActivo) advEje = ejeDeTeclado();
});

/* ---------- Joystick ---------- */
const RADIO_STICK = 48;
let stickActivo = false;
let stickPuntero = null;

function moverKnob(dx, dy){
  const knob = document.getElementById('advKnob');
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
}

function stickDesde(ev){
  const base = document.getElementById('advStick').getBoundingClientRect();
  const cx = base.left + base.width / 2, cy = base.top + base.height / 2;
  let dx = ev.clientX - cx, dy = ev.clientY - cy;
  const largo = Math.hypot(dx, dy);
  if(largo > RADIO_STICK){ dx = dx / largo * RADIO_STICK; dy = dy / largo * RADIO_STICK; }
  moverKnob(dx, dy);
  const vx = dx / RADIO_STICK, vy = dy / RADIO_STICK;
  const fuerza = Math.hypot(vx, vy);
  advEje = fuerza < .22 ? {x:0, y:0} : {x:vx, y:vy};   // zona muerta
}

function soltarStick(){
  stickActivo = false;
  stickPuntero = null;
  moverKnob(0, 0);
  document.getElementById('advStick').classList.remove('activo');
  advEje = ejeDeTeclado();
}

const stickEl = document.getElementById('advStick');
stickEl.addEventListener('pointerdown', ev => {
  ev.preventDefault();
  stickActivo = true;
  stickPuntero = ev.pointerId;
  stickEl.setPointerCapture(ev.pointerId);
  stickEl.classList.add('activo');
  stickDesde(ev);
});
stickEl.addEventListener('pointermove', ev => {
  if(!stickActivo || ev.pointerId !== stickPuntero) return;
  ev.preventDefault();
  stickDesde(ev);
});
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(tipo => {
  stickEl.addEventListener(tipo, ev => { if(ev.pointerId === stickPuntero) soltarStick(); });
});

window.addEventListener('resize', () => { if(advAbierto) advRender(); });

document.getElementById('advBtn').onclick = abrirAventura;
document.getElementById('advCloseBtn').onclick = cerrarAventura;
document.getElementById('encCloseBtn').onclick = cerrarEncuentro;
document.getElementById('shopCloseBtn').onclick = () => document.getElementById('shopOverlay').classList.remove('show');
document.getElementById('intercambioBtn').onclick = abrirIntercambio;
document.getElementById('intercambioCloseBtn').onclick = () => document.getElementById('intercambioOverlay').classList.remove('show');
document.getElementById('intercambioAtrasBtn').onclick = () => document.getElementById('intercambioCloseBtn').click();
document.getElementById('canjeCodigoBtn').onclick = canjearCodigoInput;
document.getElementById('codigoCardCerrarBtn').onclick = () => document.getElementById('codigoCardOverlay').classList.remove('show');
document.getElementById('codigoCardCancelarBtn').onclick = () => {
  const b = document.getElementById('codigoCardCancelarBtn');
  cancelarCodigo(document.getElementById('codigoCardTexto').textContent, b, (ok, txt) => {
    document.getElementById('codigoCardOverlay').classList.remove('show');
    b.disabled = false; b.textContent = 'Cancelar código';
    avisoIntercambio(ok, txt);
  });
};
/* Intercambio: botón "Arriba" que aparece al bajar por la lista */
(() => {
  const panel = document.getElementById('intercambioOverlay').querySelector('.reveal-panel');
  const arriba = document.getElementById('intercambioArribaBtn');
  panel.addEventListener('scroll', () => { arriba.hidden = panel.scrollTop < 240; }, {passive:true});
  arriba.onclick = () => panel.scrollTo({top:0, behavior:'smooth'});
})();
document.getElementById('codigoCardWhatsBtn').onclick = () => {
  const cod = document.getElementById('codigoCardTexto').textContent;
  compartirCodigoWhatsApp(cod, Number(document.getElementById('codigoCardOverlay').dataset.pokemonId) || 0);
};
document.getElementById('codigoCardCopiarBtn').onclick = () => copiarTexto(document.getElementById('codigoCardTexto').textContent, document.getElementById('codigoCardCopiarBtn'));
document.getElementById('canjeCodigoInput').addEventListener('keydown', e => { if(e.key === 'Enter') canjearCodigoInput(); });

document.getElementById('closeBtn').onclick = () => document.getElementById('overlay').classList.remove('show');
document.getElementById('pokedexBtn').onclick = () => document.getElementById('pokedexOverlay').classList.add('show');
document.getElementById('pokedexCloseBtn').onclick = () => document.getElementById('pokedexOverlay').classList.remove('show');
document.getElementById('quizCloseBtn').onclick = () => { ocultarReloj(); document.getElementById('quizOverlay').classList.remove('show'); };
document.getElementById('quizNextBtn').onclick = startQuiz;
document.getElementById('openBtn').onclick = openPack;
document.getElementById('canjeBtn').onclick = canjearRepetidas;
document.getElementById('battleBtn').onclick = () => abrirArena();
document.getElementById('battleCloseBtn').onclick = () => { ocultarReloj(); document.getElementById('battleOverlay').classList.remove('show'); };
document.getElementById('battleNextBtn').onclick = () => document.getElementById('battleCloseBtn').click();
document.getElementById('earnBtn').onclick = startQuiz;
document.getElementById('resetBtn').onclick = resetProgress;

document.getElementById('packSize').textContent = PACK_SIZE;
document.getElementById('packCost').textContent = PACK_COST;

loadProgress();
renderRegionFilters();
renderFilters();
renderGrid();
updateProgress();
updateCoins();

/* =================== RANKING COMPARTIDO =================== */
const API_BASE   = 'https://n8n.consultorarz.com/webhook';
const NAME_KEY   = 'album-kanto-jugador';
const DEVICE_KEY = 'album-kanto-dispositivo';
let dispositivo  = '';
try{ dispositivo = localStorage.getItem(DEVICE_KEY) || ''; }catch(e){}
if(!dispositivo){
  dispositivo = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  try{ localStorage.setItem(DEVICE_KEY, dispositivo); }catch(e){}
}
let jugador      = '';

/* Regalos puntuales de monedas. Se aplican UNA sola vez por dispositivo y sólo
   al entrenador que corresponde; los ids ya cobrados quedan en localStorage.
   Sirve para reconocer algo fuera del juego sin tocar el localStorage a mano. */
const REGALOS_KEY = 'album-kanto-regalos';
const REGALOS = [
  { id: 'zeta-2000-20260906',  para: 'zeta centeno', monedas: 2000 },
  { id: 'todos-900-20260906', para: '*',            monedas: 900  },
  { id: 'agusg-1200-20260906', para: 'agus g.',      monedas: 1200 },
  { id: 'agusg-legendaria-20260906', para: 'agus g.', monedas: 0, legendarias: 1 },
  { id: 'zeta-2legendarias-20260906', para: 'zeta centeno', monedas: 0, legendarias: 2 },
  { id: 'zeta-legendaria-prueba-20260906', para: 'zeta centeno', monedas: 0, legendarias: 1 },
  { id: 'zeta-legendaria-prueba2-20260906', para: 'zeta centeno', monedas: 0, legendarias: 1 },
  { id: 'todos-legendaria-20260906', para: '*',    monedas: 0, legendarias: 1 },
  { id: 'agusg-2000-20260906', para: 'agus g.',      monedas: 2000 },
  { id: 'zeta-1500-aventura-20260906', para: 'zeta centeno', monedas: 1500 },
  { id: 'zeta-bolas-aventura-20260907', para: 'zeta centeno', monedas: 0,
    bolas: {roja: 200, azul: 100, ultra: 100, maestra: 50}, aventura: true },
  { id: 'todos-bolas-aventura-20260907', para: '*', monedas: 0,
    bolas: {roja: 50, azul: 50, ultra: 50, maestra: 2}, aventura: true,
    excluir: ['zeta centeno'] },
  { id: 'mostaza-4000-20260907', para: ['mostaza', 'el mostaza'], monedas: 4000 },
  /* 22/10/2026: pedido de Zeta para El Mostaza — 5 shiny fuertes y un Mewtwo de fuerza 100
     (el Mewtwo "acorazado" no existe como figurita: es el 150 normal). */
  { id: 'mostaza-5shiny-mewtwo-20261022', para: ['mostaza', 'el mostaza'], monedas: 0,
    ejemplares: [{id:6, f:100, s:true}, {id:149, f:98, s:true}, {id:130, f:96, s:true}, {id:94, f:95, s:true}, {id:65, f:94, s:true}, {id:150, f:100}] },
  /* 22/10/2026: pedido de Zeta para sí mismo — 50.000 monedas, 10 shiny poderosos y un Mewtwo de
     fuerza 100 (el "acorazado" no existe como figurita: es el 150 normal). */
  { id: 'zeta-50000-10shiny-mewtwo-20261022', para: 'zeta centeno', monedas: 50000,
    ejemplares: [{id:6, f:100, s:true}, {id:149, f:99, s:true}, {id:130, f:98, s:true}, {id:94, f:97, s:true}, {id:65, f:96, s:true},
                 {id:248, f:95, s:true}, {id:373, f:94, s:true}, {id:445, f:93, s:true}, {id:376, f:92, s:true}, {id:9, f:91, s:true},
                 {id:150, f:100}] },
  /* 22/10/2026: Zeta pidió el Mewtwo Acorazado para él, poderoso y APARTE del Mewtwo común:
     figurita especial (ver ESPECIALES), se usa en la Arena. */
  /* 22/10/2026: Zeta pidió sacar el Mewtwo shiny común de fuerza 100 que le llegó con el regalo viejo
     'zeta-mewtwo-acorazado-20261022' (antes de que el Acorazado fuera figurita aparte). Sólo se quita
     si ese regalo llegó a cobrarse; si no, no hay nada que sacar. */
  /* 22/10/2026: Zeta pidió otro Charizard y otro Gengar shiny, poderosos. */
  { id: 'zeta-charizard-gengar-shiny-20261022', para: 'zeta centeno', monedas: 0,
    ejemplares: [{id:6, f:100, s:true}, {id:94, f:100, s:true}] },
  { id: 'zeta-quitar-mewtwo-shiny-20261022', para: 'zeta centeno', monedas: 0,
    quitar: [{id:150, f:100, s:true}], siCobro: 'zeta-mewtwo-acorazado-20261022' },
  { id: 'zeta-acorazado-especial-20261022', para: 'zeta centeno', monedas: 0, especiales: [{id:10150, f:100}] },
  { id: 'todos-2500-bolas-20260907', para: '*', monedas: 2500,
    bolas: {roja: 25, azul: 50, ultra: 20, maestra: 10}, aventura: true },
  { id: 'matias-bolas-kanto-20260908', para: 'matias', monedas: 0,
    bolas: {roja: 50, azul: 50, ultra: 50, maestra: 5}, aventura: true },
  { id: 'matias-pikachu-20260908', para: 'matias', monedas: 0, especies: [25] },
  { id: 'matias-faltante2-20260908', para: 'matias', monedas: 0, faltantes: 1 },
  { id: 'matias-monedas-20260908', para: 'matias', monedas: 1000 },
  { id: 'zeta-5000-20260908', para: 'zeta centeno', monedas: 5000 },
  { id: 'evento-bienvenida-aniversario-pachamanga-2026-10', para: '*', monedas: 1500,
    legendarias: 1, bolas: {roja: 20, azul: 15, ultra: 8, maestra: 1},
    soloDuranteEvento: 'aniversario-pachamanga-2026-10' }
];

/* Misma normalización que usa el registro de nombres en el servidor:
   sin tildes, en minúsculas y con los espacios colapsados. */
function claveNombre(n){
  return (n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function avisoRegalo(txt){
  document.getElementById('battleTitle').textContent = '¡Regalo!';
  document.getElementById('battleStage').innerHTML = '<div class="bat-aviso">' + txt + '</div>';
  document.getElementById('battleFeedback').textContent = '';
  document.getElementById('battleOverlay').classList.add('show');
}

/* Regala una legendaria: primero de las que le faltan al álbum; si ya las
   tiene todas, entra como repetida (sirve para el canje). */
function regalarLegendaria(){
  let legendarias = DATA.filter(p => p.rarity === 'Legendario');
  /* Durante un evento soloRegion12 esto también respeta Kanto/Johto, salvo
     que el jugador ya tenga las de esas dos regiones y no quede ninguna
     para elegir — ahí se prioriza NO perder el regalo (ver aplicarRegalos:
     el regalo se marca usado pase lo que pase) por sobre la restricción. */
  const ev = eventoVistaActiva();
  if(ev){
    const soloKJ = legendarias.filter(p => IDS_KANTO_JOHTO.has(p.id));
    if(soloKJ.length) legendarias = soloKJ;
  }
  if(!legendarias.length) return null;
  const faltan = legendarias.filter(p => !state[p.id].got);
  const lista  = faltan.length ? faltan : legendarias;
  const p = lista[Math.floor(Math.random() * lista.length)];
  const isNew = !state[p.id].got;
  if(isNew) state[p.id].got = true;
  else state[p.id].dup++;
  /* Mismo formato que usa openPack(), así entra directo en la carta dorada. */
  return {p, isNew};
}

/* Regala una figurita al azar de las que le faltan al álbum (cualquier
   rareza/región), igual mecánica que regalarLegendaria() pero sin filtrar
   por rareza. Si ya lo tiene todo, entra como repetida. */
function regalarFaltante(){
  let universo = DATA;
  const ev = eventoVistaActiva();
  if(ev){
    const soloKJ = DATA.filter(p => IDS_KANTO_JOHTO.has(p.id));
    if(soloKJ.length) universo = soloKJ;
  }
  const faltan = universo.filter(p => !state[p.id].got);
  const lista  = faltan.length ? faltan : universo;
  const p = lista[Math.floor(Math.random() * lista.length)];
  const isNew = !state[p.id].got;
  if(isNew) state[p.id].got = true;
  else state[p.id].dup++;
  return {p, isNew};
}

/* Regala una figurita puntual por id (ej. Pikachu = 25), no una rareza al
   azar. Si ya la tiene entra como repetida, igual que el resto de regalos. */
function regalarEspecie(id){
  const p = DATA.find(p => p.id === id);
  if(!p) return null;
  const isNew = !state[p.id].got;
  if(isNew) state[p.id].got = true;
  else state[p.id].dup++;
  return {p, isNew};
}

/* Regala UN ejemplar concreto (fuerza y shiny a medida), no uno al azar. */
function regalarEjemplar(id, f, shiny){
  const p = DATA.find(d => d.id === id);
  if(!p) return null;
  ejemplares(id);   // completa lo que ya tenía antes de sumar éste
  const isNew = !state[id].got;
  if(isNew) state[id].got = true; else state[id].dup++;
  const e = nuevoEjemplar(f);
  if(shiny) e.s = true;
  state[id].ej.push(e);
  return {p, isNew};
}

/* Saca UN ejemplar concreto (misma fuerza y shiny). Si era el único, la figurita vuelve a faltar. */
function quitarEjemplar(id, f, shiny){
  if(!state[id]) return false;
  const l = ejemplares(id), i = l.findIndex(e => e.f === f && !!e.s === !!shiny);
  if(i < 0) return false;
  l.splice(i, 1);
  if(state[id].dup > 0) state[id].dup--; else { state[id].got = false; state[id].dup = 0; }
  return true;
}

function aplicarRegalos(){
  if(MODO_SERVIDOR) return cobrarRegalosServidor();
  let usados = [];
  try{ usados = JSON.parse(localStorage.getItem(REGALOS_KEY) || '[]'); }catch(e){}
  if(!Array.isArray(usados)) usados = [];

  /* Sin nombre todavía no hay entrenador: el regalo espera a que se registre,
     así no se lo lleva la pantalla de bienvenida antes de elegir nombre. */
  const clave = claveNombre(jugador);
  if(!clave) return;

  let total = 0;
  let esAventura = false;
  let esEvento = null;
  const regaladas = [];
  const ejPulls = [];
  const bolasGanadas = {};
  const espPulls = [];
  let quitados = 0;
  REGALOS.forEach(r => {
    /* 'para' puede ser un nombre, '*' (todos) o una LISTA de nombres: sirve
       cuando no se sabe con cuál variante se registró (a "El Mostaza" no le
       llegaba el regalo porque estaba puesto para "mostaza" a secas). */
    const destinos = Array.isArray(r.para) ? r.para : [r.para];
    if(!destinos.includes('*') && !destinos.includes(clave)) return;
    if(r.excluir && r.excluir.indexOf(clave) !== -1) return;
    if(usados.indexOf(r.id) !== -1) return;
    /* Regalo de bienvenida a UN evento puntual: si ese evento no está
       activo ahora, no se entrega NI se marca usado — así queda esperando
       a que el jugador entre durante la ventana correcta, en vez de
       perderse para siempre por haber entrado antes o después. */
    if(r.soloDuranteEvento){
      const ev = eventoActivo();
      if(!ev || ev.slug !== r.soloDuranteEvento) return;
      esEvento = ev;
    }
    /* Quitar un ejemplar puntual que se regaló de más: sólo si el regalo de origen se cobró. */
    if(r.quitar){
      if(r.siCobro && usados.indexOf(r.siCobro) !== -1) r.quitar.forEach(x => { if(quitarEjemplar(x.id, x.f, x.s)) quitados++; });
      usados.push(r.id);
      return;
    }
    coins += (r.monedas || 0);
    for(let i = 0; i < (r.legendarias || 0); i++){
      const pull = regalarLegendaria();
      if(pull) regaladas.push(pull);
    }
    (r.especies || []).forEach(id => {
      const pull = regalarEspecie(id);
      if(pull) regaladas.push(pull);
    });
    (r.especiales || []).forEach(x => {
      const e = ESPECIAL_POR_ID[x.id];
      if(!e) return;
      const nueva = !especiales[x.id];
      if(nueva || x.f > especiales[x.id].f) especiales[x.id] = {f:x.f, c:nuevoEjemplar(x.f).c};
      espPulls.push({p:e, isNew:nueva});
    });
    (r.ejemplares || []).forEach(x => {
      const pull = regalarEjemplar(x.id, x.f, x.s);
      if(pull) ejPulls.push(pull);
    });
    for(let i = 0; i < (r.faltantes || 0); i++){
      const pull = regalarFaltante();
      if(pull) regaladas.push(pull);
    }
    if(r.bolas){
      Object.keys(r.bolas).forEach(t => {
        bolas[t] = (bolas[t] || 0) + r.bolas[t];
        bolasGanadas[t] = (bolasGanadas[t] || 0) + r.bolas[t];
      });
    }
    if(r.aventura) esAventura = true;
    usados.push(r.id);
    total += (r.monedas || 0);
  });
  const totalBolas = Object.keys(bolasGanadas).reduce((a, t) => a + bolasGanadas[t], 0);
  if(quitados){
    try{ localStorage.setItem(REGALOS_KEY, JSON.stringify(usados)); }catch(e){}
    saveProgress(); renderGrid(); updateProgress(); enviarPuntaje();
  }
  if(total === 0 && !regaladas.length && !totalBolas && !ejPulls.length && !espPulls.length){
    try{ localStorage.setItem(REGALOS_KEY, JSON.stringify(usados)); }catch(e){}
    return;
  }

  try{ localStorage.setItem(REGALOS_KEY, JSON.stringify(usados)); }catch(e){}
  saveProgress();
  updateCoins();
  if(regaladas.length || ejPulls.length){
    renderGrid();
    updateProgress();
  }
  enviarPuntaje();
  mostrarRegalos({total, regaladas, ejPulls, espPulls, bolasGanadas, esAventura, esEvento});
}

/* El cartel "¡Regalo!" con las cartas de lo que llegó. */
function mostrarRegalos({total, regaladas, ejPulls, espPulls, bolasGanadas, esAventura, esEvento, esBienvenida, mensaje}){
  const totalBolas = Object.keys(bolasGanadas).reduce((a, t) => a + bolasGanadas[t], 0);
  const partes = [];
  if(total) partes.push('<b>' + total + '</b> monedas');
  if(ejPulls.length) partes.push(ejPulls.map(pull => '<b>' + pull.p.name + '</b>').join(', '));
  if(espPulls.length) partes.push('la figurita especial ' + espPulls.map(pull => '<b>' + pull.p.name + '</b>').join(', '));
  renderEspeciales();
  if(regaladas.length) partes.push((regaladas.length > 1 ? 'las figuritas <b>' : 'la figurita <b>')
    + regaladas.map(pull => pull.p.name).join('</b> y <b>') + '</b>');
  if(totalBolas){
    const nombreBola = {roja: 'Poké Ball', azul: 'Súper Ball', ultra: 'Ultra Ball', maestra: 'Master Ball'};
    partes.push('<b>' + Object.keys(bolasGanadas)
      .map(t => bolasGanadas[t] + ' ' + nombreBola[t])
      .join('</b>, <b>') + '</b>');
  }
  const cartelAventura = esAventura
    ? '<br><br>🗺️ <b>¡Regalo por el nuevo modo Aventura!</b> Salí a recorrer el mundo y usalas para atrapar Pokémon.'
    : '';
  const cartelEvento = esEvento
    ? '<br><br><b>¡Bienvenido al ' + esEvento.nombre + '!</b> Durante el evento sólo cuentan figuritas de Kanto y Johto.'
    : '';
  const aviso = () => avisoRegalo(esBienvenida
    ? '<b>¡Bienvenido a Entrenadores RZ!</b><br><br>Arrancás con <b>' + coins + '</b> monedas, <b>' + bolas.roja + '</b> Poké Ball y ' +
      (regaladas.length ? 'la figurita <b>' + regaladas[0].p.name + '</b>' : 'tu primera figurita') + '. Abrí sobres, salí de aventura y peleá en la Arena. ¡A jugar!'
    : mensaje ? '<b>' + mensaje + '</b><br><br>Tu premio: ' + partes.join(' y ') + '. ¡Felicitaciones!'
    : 'Te regalaron ' + partes.join(' y ') + '.' + cartelAventura + cartelEvento + ' ¡A jugar!');

  /* La legendaria regalada se muestra con la misma carta dorada del sobre,
     una por una; recién después aparece el cartel del regalo. */
  /* los ejemplares regalados se muestran como cartas (con su ✨ Shiny y su 💪) */
  /* un premio (con mensaje) muestra sus cartas y, al cerrarlas, el cartel de felicitación */
  const cartas = () => {
    showReveal(ejPulls, mensaje ? '¡Tu premio!' : '¡Te regalaron!');
    if(!mensaje) return;
    const ov = document.getElementById('overlay');
    const obs = new MutationObserver(() => { if(!ov.classList.contains('show')){ obs.disconnect(); aviso(); } });
    obs.observe(ov, {attributes:true, attributeFilter:['class']});
  };
  const mostrar = () => espPulls.length ? mostrarEspeciales(espPulls, ejPulls.length ? cartas : aviso)
                                        : ejPulls.length ? cartas() : aviso();
  if(regaladas.length) playSpecialSequence(regaladas, 0, mostrar);
  else mostrar();
}
let rankTab      = 'hoy';
let ultimoTop    = null;
let ultimoEnvio  = 0;
let enviosPend   = null;

function figuritasObtenidas(){
  return Object.values(state).filter(s => s.got).length;
}

function setStatus(txt, esError){
  const el = document.getElementById('rankStatus');
  el.textContent = txt || '';
  el.className = 'rank-status' + (esError ? ' err' : '');
}

/* Se manda como text/plain a propósito: evita el preflight CORS del navegador. */
function enviarPuntaje(){
  if(MODO_SERVIDOR){ clearTimeout(enviosPend); enviosPend = setTimeout(cargarTop, 1500); return; }
  if(!jugador) return;
  const ahora = Date.now();
  if(ahora - ultimoEnvio < 3000){
    clearTimeout(enviosPend);
    enviosPend = setTimeout(enviarPuntaje, 3000 - (ahora - ultimoEnvio));
    return;
  }
  ultimoEnvio = ahora;
  const cuerpo = {
    jugador: jugador,
    figuritas: figuritasObtenidas(),
    total: DATA.length,
    monedas: coins
  };
  fetch(API_BASE + '/pokemon-score', {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=UTF-8'},
    body: JSON.stringify(cuerpo)
  }).then(r => {
    if(!r.ok) throw new Error('HTTP ' + r.status);
    return cargarTop();
  }).catch(() => setStatus('sin conexión con el ranking', true));

  enviarPuntajeEvento();
}

/* =================== RANKING DE MAESTROS =================== */
/* Se manda después de cada pelea de la arena (el acumulado, no la pelea
   suelta): el servidor se queda con la fila de más puntos de cada uno. */
let ultimoTopMaestro = null, topMaestroFallo = false;
function enviarMaestro(){
  if(MODO_SERVIDOR) return cargarTopMaestro();
  if(!jugador || !maestro.peleas) return Promise.resolve();
  return fetch(API_BASE + '/pokemon-maestro-score', {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=UTF-8'},
    body: JSON.stringify({jugador: jugador, pts: maestro.pts, ganadas: maestro.ganadas, peleas: maestro.peleas})
  }).then(r => {
    if(!r.ok) throw new Error('HTTP ' + r.status);
    return cargarTopMaestro();
  }).catch(() => {});
}
function cargarTopMaestro(){
  return fetch(MODO_SERVIDOR ? SERVIDOR_URL + '/maestro-top' : API_BASE + '/pokemon-maestro-top', {cache: 'no-store'})
    .then(r => { if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(data => { ultimoTopMaestro = data; topMaestroFallo = false; if(rankTab === 'maestro') renderRank(); })
    .catch(() => { topMaestroFallo = true; if(rankTab === 'maestro') renderRank(); });
}

function renderRankMaestro(lista, cont, done){
  if(!ultimoTopMaestro){
    lista.innerHTML = topMaestroFallo
      ? '<div class="rank-empty">No se pudo cargar el ranking de Maestros.<br><button type="button" class="close-btn" id="rankReintentarMa" style="margin-top:10px;padding:10px 18px;">Reintentar</button></div>'
      : '<div class="rank-empty">Cargando el ranking de Maestros…</div>';
    const b = document.getElementById('rankReintentarMa');
    if(b) b.onclick = () => cargarTopMaestro();
    cont.hidden = true;
  } else {
    const filas = ultimoTopMaestro.top || [];
    document.getElementById('rankCountNum').textContent = ultimoTopMaestro.jugadores || 0;
    cont.hidden = false;
    if(!filas.length){
      lista.innerHTML = '<div class="rank-empty">Todavía nadie ganó en la Arena. ¡Ganá una batalla y sé el primer Maestro!</div>';
    }
    filas.forEach(f => {
      const row = document.createElement('div');
      row.className = 'rank-row' + (f.jugador === jugador ? ' me' : '');
      row.innerHTML =
        '<div class="rank-pos">' + f.puesto + '</div>' +
        '<div class="rank-name"><span></span><small class="rank-rango"></small></div>' +
        iconoPuesto(f.puesto) +
        '<div class="rank-score">' + f.pts + ' <span style="font-size:10px;color:var(--ink-dim);font-family:\'Space Mono\',monospace;">pts · ' + f.ganadas + ' ganadas</span></div>';
      row.querySelector('.rank-name span').textContent = f.jugador;
      row.querySelector('.rank-rango').textContent = RANGOS_MAESTRO[rangoMaestro(f.pts)].nombre;
      lista.appendChild(row);
    });
  }
  /* abajo: en qué rango estás y qué premio destraba cada uno */
  const mio = rangoPropio(), sig = RANGOS_MAESTRO[mio + 1];
  done.innerHTML = '<div class="hof-title">⚔️ Rangos de Maestro</div>' +
    '<div class="hof-sub">Sumás puntos ganando en la Arena (más si tumbás a todos y no perdés a ninguno).<br>' +
    'Vos: <b>' + RANGOS_MAESTRO[mio].nombre + '</b> · ' + maestro.pts + ' pts' +
    (sig ? ' · te faltan ' + (sig.pts - maestro.pts) + ' para ' + sig.nombre : ' · ¡llegaste al máximo!') + '</div>' +
    RANGOS_MAESTRO.slice(1).map((x, i) => '<div class="hof-row rango' + (i + 1 <= maestro.nivel ? ' ok' : '') + '">' +
      '<span class="rango-pts">' + x.pts + '</span><div class="hof-name"><b>' + x.nombre + '</b><br><small>' + textoPremioRango(x.premio) + '</small></div>' +
      '<div class="hof-date">' + (i + 1 <= maestro.nivel ? '✅' : '🔒') + '</div></div>').join('');
}

/* =================== RANKING DE EVENTO =================== */
/* "Todos arrancan de 0" sin tocar el ranking de siempre: en vez de borrar
   pokemon_ranking, cada dispositivo guarda cuántas figuritas tenía la
   PRIMERA vez que vio el evento activo (su "base"), y lo que manda al
   ranking de evento es sólo la diferencia desde ahí. El ranking histórico
   de toda la vida queda intacto. Quien ya completó el álbum (ver
   [[project_pokemon_album]], Salón de la Fama) no tiene mucho margen para
   sumar figuritas nuevas durante el evento, así que naturalmente no
   encabeza este ranking sin necesidad de excluirlo a mano. */
const EVENTO_BASE_KEY = 'album-kanto-evento-base';

function eventoBase(ev){
  let base = {};
  try{ base = JSON.parse(localStorage.getItem(EVENTO_BASE_KEY) || '{}'); }catch(e){ base = {}; }
  if(typeof base[ev.slug] !== 'number'){
    base[ev.slug] = figuritasObtenidas();
    try{ localStorage.setItem(EVENTO_BASE_KEY, JSON.stringify(base)); }catch(e){}
  }
  return base[ev.slug];
}

/* Mismo criterio que eventoBase() pero por figurita puntual, no por conteo:
   el id de cada Pokémon que el dispositivo YA tenía la primera vez que vio
   el evento activo. Lo usan renderGrid()/updateProgress() para que la
   Pokédex "arranque de 0" durante el evento sin tocar state[] para nada —
   se fija en el mismo momento que eventoBase() (desde sincronizarEvento()),
   así ambas quedan cortadas en el mismo instante. */
const EVENTO_BASE_IDS_KEY = 'album-kanto-evento-base-ids';

function eventoBaseIds(ev){
  if(MODO_SERVIDOR){
    const e = eventosServidor[ev.slug];
    return new Set(e ? e.baseIds : DATA.filter(p => state[p.id].got).map(p => p.id));
  }
  let base = {};
  try{ base = JSON.parse(localStorage.getItem(EVENTO_BASE_IDS_KEY) || '{}'); }catch(e){ base = {}; }
  if(!Array.isArray(base[ev.slug])){
    base[ev.slug] = DATA.filter(p => state[p.id].got).map(p => p.id);
    try{ localStorage.setItem(EVENTO_BASE_IDS_KEY, JSON.stringify(base)); }catch(e){}
  }
  return new Set(base[ev.slug]);
}

/* Qué figuritas se ven "conseguidas" en el álbum del evento. En el evento por puntos (Halloween) el
   servidor guarda las que salieron EN EL EVENTO (vistos), aunque ya estuvieran en el álbum de siempre;
   en los otros eventos, las que no tenía cuando empezó. */
function eventoTiene(ev){
  const e = MODO_SERVIDOR && eventosServidor[ev.slug];
  if(e && Array.isArray(e.vistos)){ const v = new Set(e.vistos); return id => v.has(id); }
  if(MODO_SERVIDOR && ev.ranking === 'capturas') return () => false;
  const base = eventoBaseIds(ev);
  return id => state[id].got && !base.has(id);
}

function figuritasEvento(ev){
  return Math.max(0, figuritasObtenidas() - eventoBase(ev));
}

/* Marca de tiempo de cuándo este dispositivo empezó a contar para el
   evento — mismo momento que eventoBase()/eventoBaseIds() (se fijan
   juntas desde sincronizarEvento()). Sirve para medir cuánto tardó en
   completar Kanto+Johto, para el Salón de la Fama del evento. */
const EVENTO_INICIO_KEY = 'album-kanto-evento-inicio';

function eventoInicioMs(ev){
  let base = {};
  try{ base = JSON.parse(localStorage.getItem(EVENTO_INICIO_KEY) || '{}'); }catch(e){ base = {}; }
  if(typeof base[ev.slug] !== 'number'){
    base[ev.slug] = Date.now();
    try{ localStorage.setItem(EVENTO_INICIO_KEY, JSON.stringify(base)); }catch(e){}
  }
  return base[ev.slug];
}

function enviarPuntajeEvento(){
  const ev = eventoActivo();
  if(MODO_SERVIDOR){ if(ev) cargarTopEvento(ev); return; }
  if(!ev || !jugador) return;
  const vista = eventoVistaActiva();
  let completo = false, duracionMs = 0;
  if(vista){
    /* Se fija (o se lee, si ya existía) en CADA llamada, no sólo cuando ya
       completó — si no, "inicio" y "fin" quedarían en el mismo instante y
       la duración siempre daría ~0. */
    const inicio = eventoInicioMs(vista);
    const baseIds = eventoBaseIds(vista);
    const listaEvento = DATA.filter(p => IDS_KANTO_JOHTO.has(p.id));
    const gotEvento = listaEvento.filter(p => state[p.id].got && !baseIds.has(p.id)).length;
    if(gotEvento === listaEvento.length){
      completo = true;
      duracionMs = Date.now() - inicio;
    }
  }
  fetch(API_BASE + '/pokemon-evento-score', {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=UTF-8'},
    body: JSON.stringify({ jugador: jugador, evento: ev.slug, figuritas: figuritasEvento(ev), completo: completo, duracionMs: duracionMs })
  }).then(() => cargarTopEvento(ev)).catch(() => {});
}

let ultimoTopEvento = null;

function cargarTopEvento(ev){
  return fetch((MODO_SERVIDOR ? SERVIDOR_URL + '/evento-top' : API_BASE + '/pokemon-evento-top') + '?evento=' + encodeURIComponent(ev.slug), {cache: 'no-store'})
    .then(r => { if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(data => { ultimoTopEvento = data; if(rankTab === 'evento') renderRank(); })
    .catch(() => {});
}

/* Muestra/oculta el banner y la pestaña "Evento" según si hay uno activo
   ahora mismo, y arranca el ranking de evento la primera vez que lo ve.
   Se llama al cargar y después cada un minuto, así el banner desaparece
   solo cuando termina la ventana sin necesitar recargar la página. */
let eventoYaIniciado = null;
let proximoEvento = null;      // evento que todavía no empezó (se muestra con cuenta regresiva)
function actualizarCuentaAtras(){
  const p = proximoEvento;
  if(!p) return;
  const falta = new Date(p.inicio).getTime() - Date.now();
  if(falta <= 0){ proximoEvento = null; sincronizarEvento(); return; }
  const hh = h => new Date(h).toLocaleTimeString('es-AR', {timeZone: ZONA_HORARIA, hour: '2-digit', minute: '2-digit', hour12: false});
  const s = Math.floor(falta / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), seg = s % 60;
  const t = (h ? h + ' h ' : '') + (h || m ? String(m).padStart(h ? 2 : 1, '0') + ' min ' : '') + String(seg).padStart(2, '0') + ' s';
  document.getElementById('eventoBannerSub').textContent = 'Empieza hoy a las ' + hh(p.inicio) + ' y dura hasta las ' + hh(p.fin) + ' · faltan ' + t + '. Mientras tanto, jugá y aprendé cómo funciona: cuando arranca, todo se reinicia para el evento.';
}
setInterval(actualizarCuentaAtras, 1000);   // slug del evento cuyo top ya se pidió, para no repetir el fetch cada minuto

/* true cuando la última vez que se corrió esto la Pokédex estaba mostrando
   la vista acotada a Kanto+Johto — para re-renderizar grid/filtros/progreso
   SÓLO al cruzar esa frontera (arranca o termina el evento), no en cada
   poll de 60s. */
let vistaEventoPrevia = false;

/* Decoración del Pachamanga Fest Halloween, todo estático y dentro del flujo (no tapa nada):
   un Gengar asomando en el banner del evento y, arriba del logo de Pachamanga, una
   fila de Pokémon fantasma con calabazas. */
function decorarHalloween(on){
  const viejo = document.querySelectorAll('.dh-asoma, #decorHalloween');
  if(!on){ viejo.forEach(n => n.remove()); return; }
  if(viejo.length) return;
  const art = id => 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/' + id + '.png';
  const banner = document.getElementById('eventoBanner');
  if(banner){
    const g = document.createElement('img');
    g.className = 'dh-asoma'; g.alt = ''; g.src = art(200);
    banner.appendChild(g);
  }
  const pie = document.querySelector('.firma-colab');
  if(pie){
    const d = document.createElement('div');
    d.id = 'decorHalloween'; d.setAttribute('aria-hidden', 'true');
    const calab = '<img class="dh-calabaza" alt="" src="' + CALABAZA_IMG + '">';
    d.innerHTML = calab + '<img alt="" src="' + art(92) + '">' + calab + '<img alt="" src="' + art(93) + '">' + calab + '<img class="dh-grande" alt="" src="' + art(94) + '">' + calab;
    pie.parentNode.insertBefore(d, pie);
  }
}

function sincronizarEvento(){
  const ev = eventoActivo();
  const banner = document.getElementById('eventoBanner');
  const tab = document.getElementById('tabEvento');
  const vistaActual = !!(ev && ev.soloRegion12);

  const prox = ev ? null : EVENTOS.find(e => e.tema === 'halloween' && Date.now() < new Date(e.inicio).getTime());
  decorarHalloween(!!((ev && ev.tema === 'halloween') || prox));
  /* En el Halloween el ranking se reduce a Evento, Maestros y Salón de la Fama */
  const soloEvento = !!(ev && ev.tema === 'halloween');
  document.getElementById('tabHoy').hidden = soloEvento;
  document.getElementById('tabHist').hidden = soloEvento;
  document.getElementById('tabSalon').hidden = !soloEvento;
  if(soloEvento && (rankTab === 'hoy' || rankTab === 'historico')) activarRankTab('evento');
  if(!soloEvento && rankTab === 'salon') activarRankTab('hoy');
  if(prox){
    proximoEvento = prox;
    banner.classList.add('evento-halloween');
    document.getElementById('eventoBannerNombre').textContent = prox.nombre;
    actualizarCuentaAtras();
    banner.hidden = false;
  }
  if(!ev){
    if(!prox){ banner.hidden = true; proximoEvento = null; }
    tab.hidden = true;
    if(rankTab === 'evento') activarRankTab('hoy');
    eventoYaIniciado = null;
    if(vistaEventoPrevia){
      vistaEventoPrevia = false;
      currentRegion = 'all';
      renderRegionFilters();
      renderGrid();
      updateProgress();
    }
    return;
  }

  const fin = new Date(ev.fin);
  const hora = fin.toLocaleTimeString('es-AR', {timeZone: ZONA_HORARIA, hour: '2-digit', minute: '2-digit', hour12: false});
  const nomEl = document.getElementById('eventoBannerNombre');
  nomEl.textContent = ev.nombre;
  document.getElementById('eventoBannerSub').textContent = ev.subtitulo
    ? ev.subtitulo + ' · termina a las ' + hora
    : 'Ranking propio del evento · los legendarios reaparecen cada ' + ev.cooldownLegendarioMin + ' min · termina a las ' + hora;
  banner.classList.toggle('evento-halloween', ev.tema === 'halloween');
  banner.hidden = false;
  if(advAbierto) sacarDeZonaCerrada();
  tab.hidden = false;

  if(eventoYaIniciado !== ev.slug){
    eventoYaIniciado = ev.slug;
    cargarTopEvento(ev);
    if(jugador) enviarPuntajeEvento();
  }

  if(vistaActual !== vistaEventoPrevia){
    vistaEventoPrevia = vistaActual;
    currentRegion = 'all';
    renderRegionFilters();
    renderGrid();
    updateProgress();
  }
}

let topFallo = false;   // el último intento de traer el ranking falló
function cargarTop(){
  topFallo = false;
  setStatus('actualizando...');
  return fetch(MODO_SERVIDOR ? SERVIDOR_URL + '/top' : API_BASE + '/pokemon-top', {cache: 'no-store'})
    .then(r => {
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(data => {
      ultimoTop = data;
      setStatus('');
      renderRank();
    })
    .catch(() => {
      topFallo = true;
      setStatus('sin conexión con el ranking', true);
      if(!ultimoTop) renderRank();
    });
}

/* Top 3: medalla en el ranking de Hoy, corona en el Histórico. Del 4º
   puesto en adelante no lleva ícono. */
function iconoPuesto(puesto){
  if(puesto > 3) return '';
  const nivel = puesto === 1 ? 'oro' : puesto === 2 ? 'plata' : 'bronce';
  if(rankTab === 'hoy' || rankTab === 'evento'){
    return '<img class="rank-medal" src="images/medal-' + nivel + '.svg" alt="Medalla de ' + nivel + '">';
  }
  return '<img class="rank-medal" src="images/crown-' + nivel + '.svg" alt="Corona de ' + nivel + '">';
}

function renderRank(){
  const lista = document.getElementById('rankList');
  const done  = document.getElementById('rankDone');
  const cont  = document.getElementById('rankCount');
  lista.innerHTML = '';

  if(rankTab === 'maestro'){
    renderRankMaestro(lista, cont, done);
    return;
  }

  if(rankTab === 'salon'){
    cont.hidden = true;
    if(!ultimoTop) lista.innerHTML = '<div class="rank-empty">Cargando…</div>';
    else renderSalonDeLaFama(done);
    return;
  }

  if(rankTab === 'evento'){
    renderRankEvento(lista, cont);
    const evA = eventoActivo();
    if(evA && evA.premios) renderPremiosEvento(done, evA);
    else renderSalonDeLaFamaEvento(done);
    return;
  }

  if(!ultimoTop){
    if(topFallo){
      lista.innerHTML = '<div class="rank-empty">No se pudo cargar el ranking. Revisá la conexión y probá de nuevo.<br>' +
        '<button type="button" class="close-btn" id="rankReintentar" style="margin-top:10px;padding:10px 18px;">Reintentar</button></div>';
      document.getElementById('rankReintentar').onclick = () => cargarTop();
    } else {
      lista.innerHTML = '<div class="rank-empty">Cargando el ranking…</div>';
    }
    done.innerHTML = '';
    cont.hidden = true;
    return;
  }

  /* Cantidad total de entrenadores que jugaron alguna vez (no es un tab: es
     un dato fijo al lado de Hoy/Histórico). */
  if(Number.isFinite(ultimoTop.jugadores)){
    document.getElementById('rankCountNum').textContent = ultimoTop.jugadores;
    cont.hidden = false;
  } else {
    cont.hidden = true;
  }

  const filas = (rankTab === 'hoy' ? ultimoTop.hoy : ultimoTop.historico) || [];
  if(filas.length === 0){
    lista.innerHTML = '<div class="rank-empty">Todavía no hay nadie en el ranking' +
      (rankTab === 'hoy' ? ' hoy' : '') + '. ¡Abrí un sobre y sé el primero!</div>';
  } else {
    filas.forEach(f => {
      const row = document.createElement('div');
      row.className = 'rank-row' + (f.jugador === jugador ? ' me' : '');
      /* El % SIEMPRE se mide contra el álbum actual, nunca contra el 'total'
         que mandó el cliente: las filas viejas quedaron guardadas con 493 y
         hacían que el 2º puesto mostrara más porcentaje que el 1º. */
      const pct = Math.round((f.figuritas / DATA.length) * 100);
      row.innerHTML =
        '<div class="rank-pos">' + f.puesto + '</div>' +
        '<div class="rank-name"></div>' +
        iconoPuesto(f.puesto) +
        '<div class="rank-score">' + f.figuritas + ' <span style="font-size:10px;color:var(--ink-dim);font-family:\'Space Mono\',monospace;">(' + pct + '%)</span></div>';
      row.querySelector('.rank-name').textContent = f.jugador;
      lista.appendChild(row);
    });
  }

  renderSalonDeLaFama(done);
}

/* Salón de la Fama · Edición Halloween: completaron Kanto+Johto durante el Pachamanga Fest.
   Se pide una vez al cargar, así sigue visible cuando el evento termina. */
let topHalloween = null;
function cargarTopHalloween(){
  const ev = EVENTOS.find(e => e.tema === 'halloween');
  if(!ev || !MODO_SERVIDOR) return;
  fetch(SERVIDOR_URL + '/evento-top?evento=' + encodeURIComponent(ev.slug), {cache: 'no-store'}).then(r => r.json())
    .then(d => { topHalloween = d; if(rankTab === 'salon') renderRank(); }).catch(() => {});
}

function renderSalonDeLaFama(done){
  const comp = (ultimoTop && ultimoTop.completaron) || [];
  if(comp.length > 0){
    done.innerHTML = '<div class="hof-title">🏆 Salón de la Fama</div>' +
      '<div class="hof-sub">(Completaron el álbum)</div>' +
      comp.map(c => {
        const fecha = (c.dia || '').split('-').reverse().join('/');
        return '<div class="hof-row"><img class="hof-crown" src="images/crown-oro.svg" alt="">' +
          '<div class="hof-name"></div><div class="hof-date">' + fecha + '</div></div>';
      }).join('');
    done.querySelectorAll('.hof-name').forEach((el, i) => { el.textContent = comp[i].jugador; });
  } else {
    done.innerHTML = '<div class="rank-done-empty"><b style="color:var(--ink);font-family:\'Baloo 2\',sans-serif;">Nadie completó el álbum todavía.</b><br>' +
      'El primero que junte las ' + DATA.length + ' figuritas queda en esta lista para siempre.</div>';
  }
  const hal = (topHalloween && topHalloween.completaron) || [];
  if(hal.length){
    const caja = document.createElement('div');
    caja.innerHTML = '<div class="hof-title" style="margin-top:14px">🏆 Salón de la Fama</div>' +
      '<div class="hof-sub">Edición Halloween · completaron Kanto+Johto</div>' +
      hal.map(() => '<div class="hof-row"><img class="hof-crown" src="images/crown-oro.svg" alt=""><div class="hof-name"></div><div class="hof-date"></div></div>').join('');
    caja.querySelectorAll('.hof-name').forEach((el, i) => { el.textContent = hal[i].jugador; });
    caja.querySelectorAll('.hof-date').forEach((el, i) => { el.textContent = formatearDuracion(hal[i].duracionMs); });
    done.appendChild(caja);
  }
  /* Ganadores de eventos especiales: quedan para siempre */
  const gan = (ultimoTop && ultimoTop.eventos) || [];
  if(gan.length){
    const caja = document.createElement('div');
    caja.innerHTML = '<div class="hof-title" style="margin-top:14px">Ganadores de eventos</div>' +
      gan.map(g => '<div class="hof-row"><img class="hof-crown" src="images/medal-' + (['oro', 'plata', 'bronce'][g.puesto - 1] || 'bronce') + '.svg" alt="' + g.puesto + 'º">' +
        '<div class="hof-name"></div><div class="hof-date"></div></div>').join('');
    caja.querySelectorAll('.hof-name').forEach((el, i) => { el.textContent = gan[i].nombre; });
    caja.querySelectorAll('.hof-date').forEach((el, i) => { el.textContent = gan[i].evento + ' · ' + gan[i].puesto + 'º'; });
    done.appendChild(caja);
  }
}

function formatearDuracion(ms){
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m} min`;
}

/* Salón de la fama PROPIO del evento: quién completó las 251 de Kanto+Johto
   DURANTE la ventana, ordenado por cuánto tardó (no por orden de llegada —
   lo arma así el servidor en Armar Top Evento). Vive aparte del Salón de la
   Fama normal: completar el evento no completa el álbum real de 1025, y
   viceversa. */
function renderSalonDeLaFamaEvento(done){
  const comp = (ultimoTopEvento && ultimoTopEvento.completaron) || [];
  if(comp.length > 0){
    done.innerHTML = '<div class="hof-title">🏆 Salón de la Fama del evento</div>' +
      '<div class="hof-sub">(Completaron Kanto+Johto durante el evento)</div>' +
      comp.map(c => {
        return '<div class="hof-row"><img class="hof-crown" src="images/crown-oro.svg" alt="">' +
          '<div class="hof-name"></div><div class="hof-date">' + formatearDuracion(c.duracionMs) + '</div></div>';
      }).join('');
    done.querySelectorAll('.hof-name').forEach((el, i) => { el.textContent = comp[i].jugador; });
  } else {
    done.innerHTML = '<div class="rank-done-empty"><b style="color:var(--ink);font-family:\'Baloo 2\',sans-serif;">Nadie completó Kanto+Johto todavía.</b><br>' +
      'El más rápido en juntar las 251 figuritas queda acá.</div>';
  }
}

function renderRankEvento(lista, cont){
  if(!ultimoTopEvento){
    lista.innerHTML = '<div class="rank-empty">Cargando el ranking del evento...</div>';
    cont.hidden = true;
    return;
  }
  const filas = ultimoTopEvento.top || [];
  if(Number.isFinite(ultimoTopEvento.jugadores)){
    document.getElementById('rankCountNum').textContent = ultimoTopEvento.jugadores;
    cont.hidden = false;
  } else {
    cont.hidden = true;
  }
  const evR = EVENTOS.find(e => e.slug === ultimoTopEvento.evento) || {};
  const capturas = evR.ranking === 'capturas';
  if(filas.length === 0){
    lista.innerHTML = capturas ? '<div class="rank-empty">Todavía nadie sumó puntos en el evento. ¡Abrí sobres o salí de aventura y sé el primero!</div>'
      : '<div class="rank-empty">Todavía nadie sumó figuritas en el evento. ¡Arrancá vos!</div>';
    return;
  }
  filas.forEach(f => {
    const row = document.createElement('div');
    row.className = 'rank-row' + (f.jugador === jugador ? ' me' : '');
    row.innerHTML =
      '<div class="rank-pos">' + f.puesto + '</div>' +
      '<div class="rank-name"></div>' +
      iconoPuesto(f.puesto) +
      '<div class="rank-score">' + f.figuritas + ' <span style="font-size:10px;color:var(--ink-dim);font-family:\'Space Mono\',monospace;">' + (capturas ? 'puntos' : 'nuevas') + '</span></div>';
    row.querySelector('.rank-name').textContent = f.jugador;
    lista.appendChild(row);
  });
}

/* Premios del evento (los que tienen premio): se muestran en la pestaña del evento */
function renderPremiosEvento(done, ev){
  done.innerHTML = '<div class="hof-title">Premios del ' + ev.nombre + '</div>' +
    '<div class="hof-sub">(Se entregan solos al terminar, a las ' +
    new Date(ev.fin).toLocaleTimeString('es-AR', {timeZone: ZONA_HORARIA, hour: '2-digit', minute: '2-digit', hour12: false}) + ')</div>' +
    ev.premios.map((p, i) => '<div class="hof-row hof-premio">' + (i < 3 ? '<img class="hof-crown" src="images/medal-' + ['oro', 'plata', 'bronce'][i] + '.svg" alt="' + (i + 1) + 'º">' : '<span class="hof-crown"></span>') +
      '<div class="hof-name"><b>' + (i + 1) + 'º</b> ' + p.texto + '</div></div>').join('');
}

/* =================== INTERCAMBIO ENTRE JUGADORES =================== */
/* Generás un código a partir de una figurita que tengas repetida (siempre
   te queda 1 en el álbum, el código sale de las copias de más). El dup
   local recién se resta cuando el servidor confirma el alta del código:
   a diferencia del nombre, acá no tiene sentido dejar jugar "offline" -
   si no hay conexión el código no existe en ningún lado, así que no sirve
   de nada regalar algo que nadie puede canjear.
   El canje lo resuelve el servidor con un update atómico filtrado por
   {codigo, usado:false}: si dos entrenadores canjean el mismo código a la
   vez, sólo uno de los dos matchea esa fila. */
const CODIGOS_KEY = 'album-kanto-codigos-generados';

function misCodigos(){
  try{ return JSON.parse(localStorage.getItem(CODIGOS_KEY) || '[]'); }catch(e){ return []; }
}
function guardarCodigoGenerado(codigo, pokemonId){
  const lista = misCodigos();
  lista.unshift({codigo, pokemonId, creado: Date.now()});
  try{ localStorage.setItem(CODIGOS_KEY, JSON.stringify(lista)); }catch(e){}
}

function copiarTexto(txt, btn){
  const textoOriginal = btn.textContent;
  const hecho = () => { btn.textContent = '¡Copiado!'; setTimeout(() => { btn.textContent = textoOriginal; }, 1500); };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(hecho).catch(() => {});
  } else {
    const ta = document.createElement('textarea');
    ta.value = txt; document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); hecho(); }catch(e){}
    document.body.removeChild(ta);
  }
}

/* Compartir por WhatsApp: abre el chat con el mensaje ya escrito (wa.me
   funciona igual en celular y en la compu). El código viaja en el texto. */
function compartirCodigoWhatsApp(codigo, pokemonId){
  const p = DATA.find(d => d.id === pokemonId);
  const nombre = p ? p.name : 'una figurita';
  const msg = '¡Te regalo a ' + nombre + ' en Entrenadores RZ! 🎁\n' +
    'Entrá a Intercambio, pegá este código y es tuya:\n*' + codigo + '*\n' +
    'https://entrenadoresrz.com/';
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
}

function renderIntercambioDup(){
  const cont = document.getElementById('intercambioList');
  cont.innerHTML = '';
  const conDup = DATA.filter(p => state[p.id].dup > 0);
  if(!conDup.length){
    cont.innerHTML = '<div style="font-size:11px;color:var(--ink-dim);">Todavía no tenés ninguna repetida.</div>';
    return;
  }
  /* Cada repetida es un ejemplar con su fuerza: elegís cuál regalar y cuál
     te quedás. Viene marcado el más débil; el más fuerte es el de la Arena. */
  conDup.forEach(p => {
    const lista = ejemplares(p.id).slice().sort((a, b) => b.f - a.f);
    let elegido = lista[lista.length - 1].c;
    const fila = document.createElement('div');
    fila.className = 'shop-row ej-fila';
    fila.innerHTML = `<img src="${p.img}" alt="" style="width:34px;height:34px;object-fit:contain;flex:0 0 auto;">
      <span class="txt"><b>${p.name}</b>Tenés ${lista.length}: elegí cuál dar</span>
      <div class="ej-lista" role="radiogroup" aria-label="Ejemplares de ${p.name}">${lista.map((e, i) =>
        `<button type="button" class="ej-chip ${claseFuerza(e.f)}" title="${nivelFuerza(e.f)}" data-c="${e.c}" role="radio">
          <b>${e.s ? '✨ ' : ''}💪 ${e.f}</b><small>N.º ${e.c}${e.s ? ' · shiny' : ''}${i === 0 ? ' · ⭐ Arena' : ''}</small></button>`).join('')}</div>`;
    const btn = document.createElement('button');
    btn.className = 'open-btn';
    btn.style.padding = '9px 14px';
    btn.textContent = 'Generar código';
    const marcar = () => fila.querySelectorAll('.ej-chip').forEach(ch => {
      const on = ch.dataset.c === elegido;
      ch.classList.toggle('on', on); ch.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    fila.querySelectorAll('.ej-chip').forEach(ch => ch.onclick = () => { elegido = ch.dataset.c; marcar(); });
    marcar();
    btn.onclick = () => generarCodigo(p.id, btn, elegido);
    fila.appendChild(btn);
    cont.appendChild(fila);
  });
}

/* Cancelar un código generado: el servidor lo anula sólo si es tuyo y nadie lo canjeó todavía
   (update atómico), y te devuelve la figurita con la misma fuerza (y shiny) que tenía.
   Pide confirmar con un segundo toque para no cancelar sin querer. */
function cancelarCodigo(codigo, btn, alTerminar){
  if(MODO_SERVIDOR) return cancelarCodigoServidor(codigo, btn, alTerminar);
  if(!jugador) return;
  if(btn.dataset.confirmar !== '1'){
    btn.dataset.confirmar = '1';
    btn.dataset.texto = btn.textContent;
    btn.textContent = '¿Seguro? Tocá de nuevo';
    setTimeout(() => { if(btn.dataset.confirmar === '1'){ btn.dataset.confirmar = ''; btn.textContent = btn.dataset.texto; } }, 3500);
    return;
  }
  btn.dataset.confirmar = '';
  btn.disabled = true;
  btn.textContent = 'Cancelando...';
  const sacarDeLista = () => {
    try{ localStorage.setItem(CODIGOS_KEY, JSON.stringify(misCodigos().filter(i => i.codigo !== codigo))); }catch(e){}
  };
  fetch(API_BASE + '/pokemon-cancelar-codigo', {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=UTF-8'},
    body: JSON.stringify({jugador, dispositivo, codigo})
  })
  .then(r => r.json())
  .then(res => {
    const p = res && res.ok ? DATA.find(d => d.id === res.pokemonId) : null;
    if(!p){
      /* ya lo canjeó otro entrenador (o no es tuyo): no vuelve nada y deja de figurar */
      sacarDeLista();
      renderMisCodigos();
      if(alTerminar) alTerminar(false, 'No se pudo cancelar: ese código ya lo canjeó otro entrenador.');
      return;
    }
    const isNew = !state[p.id].got;
    ejemplares(p.id).push(nuevoEjemplar(res.fuerza));   // vuelve con la fuerza que tenía
    if(isNew) state[p.id].got = true; else state[p.id].dup += 1;
    sacarDeLista();
    renderGrid();
    updateProgress();
    saveProgress();
    enviarPuntaje();
    renderIntercambioDup();
    renderMisCodigos();
    if(alTerminar) alTerminar(true, 'Código ' + codigo + ' cancelado: ' + p.name + ' volvió a tu álbum.');
  })
  .catch(() => {
    btn.disabled = false;
    btn.textContent = 'Sin conexión, probá de nuevo';
    setTimeout(() => { btn.textContent = btn.dataset.texto || 'Cancelar'; }, 2500);
  });
}

/* Aviso corto arriba de la lista de códigos (resultado de cancelar). */
function avisoIntercambio(ok, txt){
  const fb = document.getElementById('canjeCodigoFeedback');
  fb.style.color = ok ? 'var(--poke-blue)' : 'var(--red)';
  fb.textContent = txt;
  document.getElementById('intercambioOverlay').querySelector('.reveal-panel').scrollTo({top:0, behavior:'smooth'});
}

function renderMisCodigos(){
  const wrap = document.getElementById('intercambioMisCodigosWrap');
  const cont = document.getElementById('misCodigosList');
  const lista = misCodigos();
  wrap.hidden = lista.length === 0;
  cont.innerHTML = '';
  lista.forEach(item => {
    const p = DATA.find(d => d.id === item.pokemonId);
    const fila = document.createElement('div');
    fila.className = 'shop-row';
    fila.innerHTML = `<span class="txt"><b style="font-family:'Space Mono',monospace;letter-spacing:2px;font-size:14px;">${item.codigo}</b>${p ? p.name : '?'} · queda disponible hasta que alguien lo use</span>`;
    const btn = document.createElement('button');
    btn.className = 'open-btn';
    btn.style.padding = '9px 14px';
    btn.textContent = 'Copiar';
    btn.onclick = () => copiarTexto(item.codigo, btn);
    const wa = document.createElement('button');
    wa.className = 'btn-whats';
    wa.textContent = 'WhatsApp';
    wa.setAttribute('aria-label', 'Compartir el código ' + item.codigo + ' por WhatsApp');
    wa.onclick = () => compartirCodigoWhatsApp(item.codigo, item.pokemonId);
    const cancelar = document.createElement('button');
    cancelar.className = 'btn-cancelar-codigo';
    cancelar.textContent = 'Cancelar';
    cancelar.setAttribute('aria-label', 'Cancelar el código ' + item.codigo + ' y recuperar la figurita');
    cancelar.onclick = () => cancelarCodigo(item.codigo, cancelar, avisoIntercambio);
    const caja = document.createElement('div');
    caja.className = 'acciones-codigo';
    caja.appendChild(btn); caja.appendChild(wa); caja.appendChild(cancelar);
    fila.appendChild(caja);
    cont.appendChild(fila);
  });
}

function abrirIntercambio(){
  document.getElementById('intercambioArribaBtn').hidden = true;
  document.getElementById('intercambioOverlay').querySelector('.reveal-panel').scrollTop = 0;
  document.getElementById('canjeCodigoInput').value = '';
  document.getElementById('canjeCodigoFeedback').textContent = '';
  renderIntercambioDup();
  renderMisCodigos();
  document.getElementById('intercambioOverlay').classList.add('show');
}

function generarCodigo(pokemonId, btn, serie){
  if(MODO_SERVIDOR) return generarCodigoServidor(pokemonId, btn, serie);
  if(!jugador || state[pokemonId].dup < 1) return;
  const lista = ejemplares(pokemonId);
  const ej = lista.find(e => e.c === serie) || lista.slice().sort((a, b) => a.f - b.f)[0];
  btn.disabled = true;
  btn.textContent = 'Generando...';
  fetch(API_BASE + '/pokemon-generar-codigo', {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=UTF-8'},
    body: JSON.stringify({jugador, dispositivo, pokemonId, fuerza: codigoFuerza(ej)})
  })
  .then(r => r.json())
  .then(res => {
    if(!res || res.ok === false || !res.codigo) throw new Error('sin código');
    const i = lista.indexOf(ej);
    if(i >= 0) lista.splice(i, 1);   // se va ESE ejemplar, no el más débil
    state[pokemonId].dup -= 1;
    renderGrid();
    updateProgress();
    saveProgress();
    enviarPuntaje();
    guardarCodigoGenerado(res.codigo, pokemonId);
    renderIntercambioDup();   // reconstruye la lista entera; este btn queda descartado
    renderMisCodigos();
    mostrarCartaCodigo(pokemonId, res.codigo, ej.f, ej.s);
  })
  .catch(() => {
    btn.disabled = false;
    btn.textContent = 'Sin conexión, probá de nuevo';
    setTimeout(() => { btn.textContent = 'Generar código'; }, 2500);
  });
}

/* Misma carta giratoria que usa playSpecialSequence() para legendarias/épicas
   (reusa las clases .special-overlay/.special-card), pero con el código en
   vez del cartel "¡Nueva!"/"Repetida" — acá lo importante no es si es nueva,
   es que el código se vea grande y fácil de copiar. */
function mostrarCartaCodigo(pokemonId, codigo, fuerza, shiny){
  const p = DATA.find(d => d.id === pokemonId);
  if(!p) return;
  const card = document.getElementById('codigoCardWrap');
  card.style.animation = 'none';
  void card.offsetWidth;
  card.style.animation = '';

  const imgCodigo = document.getElementById('codigoCardImg');
  imgCodigo.removeAttribute('data-rs'); imgCodigo.onerror = shiny ? () => respaldoShiny(imgCodigo) : null;
  imgCodigo.src = shiny ? imgVario(p) : p.img;
  document.getElementById('codigoCardName').textContent = (shiny ? '✨ ' : '') + p.name + (fuerza ? ' · 💪 ' + fuerza : '');
  document.getElementById('codigoCardOverlay').dataset.pokemonId = p.id;
  document.getElementById('codigoCardTexto').textContent = codigo;
  card.style.background = `linear-gradient(160deg, ${TYPE_COLORS[p.type]}33, #12172B)`;
  document.getElementById('codigoCardOverlay').classList.add('show');
}

function canjearCodigoInput(){
  if(MODO_SERVIDOR) return canjearCodigoServidor();
  const inp = document.getElementById('canjeCodigoInput');
  const btn = document.getElementById('canjeCodigoBtn');
  const fb  = document.getElementById('canjeCodigoFeedback');
  const codigo = inp.value.trim().toUpperCase();
  if(!codigo){ fb.style.color = 'var(--red)'; fb.textContent = 'Escribí un código.'; return; }
  if(!jugador) return;

  const textoBtn = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Canjeando...';
  fb.textContent = '';

  fetch(API_BASE + '/pokemon-canjear-codigo', {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=UTF-8'},
    body: JSON.stringify({jugador, dispositivo, codigo})
  })
  .then(r => r.json())
  .then(res => {
    if(!res || res.ok === false){
      const motivo = res && res.motivo;
      fb.style.color = 'var(--red)';
      fb.textContent = motivo === 'propio' ? 'Ese código lo generaste vos: no te lo podés canjear a vos mismo.'
        : motivo === 'usado' ? 'Ese código ya lo usó otro entrenador.'
        : motivo === 'no_existe' ? 'Ese código no existe. Revisalo bien.'
        : 'No se pudo canjear. Revisá el código.';
      btn.disabled = false;
      btn.textContent = textoBtn;
      return;
    }
    /* figurita especial (Mewtwo Acorazado): va a las especiales, no al álbum; si ya la tenía
       se queda con la más fuerte, igual que con los regalos */
    const esp = ESPECIAL_POR_ID[res.pokemonId];
    if(esp){
      const f = res.fuerza >= 1 && res.fuerza <= 100 ? res.fuerza : 100;
      const nueva = !especiales[esp.id];
      if(nueva || f > especiales[esp.id].f) especiales[esp.id] = {f, c:nuevoEjemplar(f).c};
      saveProgress();
      renderEspeciales();
      inp.value = '';
      btn.disabled = false;
      btn.textContent = textoBtn;
      document.getElementById('intercambioOverlay').classList.remove('show');
      mostrarEspeciales([{p:esp, isNew:nueva}]);
      return;
    }
    const p = DATA.find(d => d.id === res.pokemonId);
    if(!p){
      fb.style.color = 'var(--red)';
      fb.textContent = 'Código canjeado pero la figurita no se reconoce.';
      btn.disabled = false;
      btn.textContent = textoBtn;
      return;
    }
    const isNew = !state[p.id].got;
    ejemplares(p.id).push(nuevoEjemplar(res.fuerza));   // llega con la fuerza que tenía (los códigos viejos: sorteo)
    if(isNew) state[p.id].got = true; else state[p.id].dup += 1;
    renderGrid();
    updateProgress();
    saveProgress();
    enviarPuntaje();
    inp.value = '';
    btn.disabled = false;
    btn.textContent = textoBtn;
    document.getElementById('intercambioOverlay').classList.remove('show');
    const pull = [{p, isNew}];
    if(isSpecial(p)) playSpecialSequence(pull, 0, () => showReveal(pull, 'Canjeaste un código'));
    else showReveal(pull, 'Canjeaste un código');
  })
  .catch(() => {
    fb.style.color = 'var(--red)';
    fb.textContent = 'Sin conexión. Probá de nuevo en un rato.';
    btn.disabled = false;
    btn.textContent = textoBtn;
  });
}

// Solo se llama al entrar por primera vez: una vez elegido, el nombre es definitivo.
function pedirNombre(){
  const inp = document.getElementById('nameInput');
  inp.value = '';
  document.getElementById('nameOverlay').classList.add('show');
  setTimeout(() => inp.focus(), 100);
}

/* Escotilla para CORREGIR un nombre ya elegido: abrir el juego con
   ?jugador=Nombre lo cambia por única vez y limpia la dirección. No hay botón
   en la pantalla a propósito: jugando, el nombre sigue sin poder cambiarse.
   Igual pasa por el registro, así que no sirve para robar el nombre de otro. */
function fijarNombreDesdeLink(nuevo){
  if(MODO_SERVIDOR) return;   // con servidor el nombre no se cambia por link
  fetch(API_BASE + '/pokemon-registrar', {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=UTF-8'},
    body: JSON.stringify({ jugador: nuevo, dispositivo: dispositivo })
  })
  .then(r => r.json())
  .then(res => {
    if(res && res.ok === false) return;   // ocupado por otro: se queda como estaba
    jugador = nuevo;
    try{ localStorage.setItem(NAME_KEY, jugador); }catch(e){}
    document.getElementById('playerName').textContent = jugador;
    enviarPuntaje();
    aplicarRegalos();
  })
  .catch(() => {});
}

function aceptarNombre(val){
  jugador = val;
  try{ localStorage.setItem(NAME_KEY, jugador); }catch(e){}
  document.getElementById('playerName').textContent = jugador;
  document.getElementById('nameOverlay').classList.remove('show');
  enviarPuntaje();
  aplicarRegalos();
}

/* Reserva el nombre en el servidor: dos entrenadores no pueden llamarse igual
   (se compara sin tildes ni mayúsculas). Como text/plain para evitar el preflight. */
function guardarNombre(){
  if(MODO_SERVIDOR) return guardarNombreServidor();
  const inp = document.getElementById('nameInput');
  const btn = document.getElementById('nameSaveBtn');
  const err = document.getElementById('nameError');
  const val = inp.value.replace(/[<>]/g, '').trim().slice(0, 20);
  if(!val){ err.textContent = 'Escribí un nombre.'; inp.focus(); return; }
  if(jugador){ document.getElementById('nameOverlay').classList.remove('show'); return; }

  const textoBtn = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Verificando...';
  err.textContent = '';

  fetch(API_BASE + '/pokemon-registrar', {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=UTF-8'},
    body: JSON.stringify({ jugador: val, dispositivo: dispositivo })
  })
  .then(r => r.json())
  .then(res => {
    if(res && res.ok === false){
      err.textContent = res.motivo === 'vacio'
        ? 'Escribí un nombre.'
        : 'Ese nombre ya lo está usando otro entrenador. Elegí otro.';
      inp.focus(); inp.select();
      return;
    }
    aceptarNombre(val);
  })
  .catch(() => {
    /* Sin conexión no lo dejamos afuera del juego: juega igual,
       pero el nombre no queda reservado hasta que vuelva la señal. */
    aceptarNombre(val);
  })
  .then(() => { btn.disabled = false; btn.textContent = textoBtn; });
}

document.getElementById('nameSaveBtn').onclick = guardarNombre;
document.getElementById('nameInput').addEventListener('keydown', e => {
  if(e.key === 'Enter') guardarNombre();
});
function activarRankTab(valor){
  rankTab = valor;
  ['tabEvento', 'tabHoy', 'tabHist', 'tabMaestro', 'tabSalon'].forEach(id => {
    const el = document.getElementById(id);
    const on = (id === 'tabEvento' && valor === 'evento')
      || (id === 'tabMaestro' && valor === 'maestro')
      || (id === 'tabSalon' && valor === 'salon')
      || (id === 'tabHoy' && valor === 'hoy')
      || (id === 'tabHist' && valor === 'historico');
    el.classList.toggle('active', on);
    el.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  if(valor === 'maestro') cargarTopMaestro();
  if(valor === 'salon') cargarTopHalloween();
  renderRank();
}
document.getElementById('tabMaestro').onclick = () => activarRankTab('maestro');
document.getElementById('tabEvento').onclick = () => activarRankTab('evento');
document.getElementById('tabSalon').onclick = () => activarRankTab('salon');
document.getElementById('tabHoy').onclick = () => activarRankTab('hoy');
document.getElementById('tabHist').onclick = () => activarRankTab('historico');
document.querySelectorAll('.rank-tab').forEach(t => t.addEventListener('keydown', e => {
  if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); t.click(); return; }
  if(e.key === 'ArrowRight' || e.key === 'ArrowLeft'){
    const tabs = [...document.querySelectorAll('.rank-tab')].filter(x => !x.hidden);
    const sig = tabs[(tabs.indexOf(t) + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    e.preventDefault(); sig.focus(); sig.click();
  }
}));

/* ---------- Foco de los paneles ----------
   Al abrir un panel el foco entra en él, Tab no se escapa a la página de
   atrás (queda inerte) y al cerrar vuelve al botón que lo abrió. */
(function(){
  const paneles = [...document.querySelectorAll('.overlay, .special-overlay, .name-overlay')];
  const principal = document.getElementById('main');
  const abiertos = () => paneles.filter(p => p.classList.contains('show'));
  const enfocables = p => [...p.querySelectorAll('button, input, [tabindex="0"]')]
    .filter(el => !el.disabled && !el.hidden && el.offsetParent !== null);
  const memoria = new Map();

  const obs = new MutationObserver(muts => {
    // primero el estado de la página de atrás: un elemento inerte no recibe foco
    if(principal){ if(abiertos().length) principal.setAttribute('inert', ''); else principal.removeAttribute('inert'); }
    muts.forEach(m => {
      const p = m.target;
      const abierto = p.classList.contains('show');
      const estaba = memoria.has(p);
      if(abierto && !estaba){
        memoria.set(p, document.activeElement);
        setTimeout(() => {
          if(p.contains(document.activeElement)) return;
          const f = enfocables(p);
          // preventScroll: si no, el navegador corre el panel hasta el primer
          // botón y en el celular acostado se pierden el título y la imagen.
          if(f.length) f[0].focus({preventScroll:true});
          p.querySelectorAll('.reveal-panel, .pokedex-body').forEach(x => { x.scrollTop = 0; });
        }, 60);
      } else if(!abierto && estaba){
        const antes = memoria.get(p);
        memoria.delete(p);
        if(antes && document.contains(antes) && !abiertos().length && antes.focus) antes.focus();
      }
    });
  });
  paneles.forEach(p => obs.observe(p, {attributes:true, attributeFilter:['class']}));

  document.addEventListener('keydown', e => {
    if(e.key !== 'Tab') return;
    const arriba = abiertos().sort((a, b) =>
      (parseInt(getComputedStyle(b).zIndex) || 0) - (parseInt(getComputedStyle(a).zIndex) || 0))[0];
    if(!arriba) return;
    const f = enfocables(arriba);
    if(!f.length) return;
    const primero = f[0], ultimo = f[f.length - 1];
    if(e.shiftKey && (document.activeElement === primero || !arriba.contains(document.activeElement))){ e.preventDefault(); ultimo.focus(); }
    else if(!e.shiftKey && document.activeElement === ultimo){ e.preventDefault(); primero.focus(); }
  });
})();
// Escape cierra el panel abierto (sólo los que ya tienen botón Cerrar)
document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && advAbierto){
    const encima = document.querySelector('.overlay.show, .special-overlay.show');
    if(!encima) cerrarAventura();
    return;
  }
  if(e.key !== 'Escape' || advAbierto) return;
  const cierres = ['intercambioCloseBtn','shopCloseBtn','pokedexCloseBtn','closeBtn','quizCloseBtn','battleCloseBtn'];
  for(const id of cierres){
    const b = document.getElementById(id);
    const ov = b && b.closest('.overlay');
    if(ov && ov.classList.contains('show')){ b.click(); return; }
  }
});

try{ jugador = localStorage.getItem(NAME_KEY) || ''; }catch(e){ jugador = ''; }

let nombreDelLink = '';
try{
  nombreDelLink = (new URLSearchParams(location.search).get('jugador') || '')
    .replace(/[<>]/g, '').trim().slice(0, 20);
  if(nombreDelLink) history.replaceState(null, '', location.pathname);
}catch(e){ nombreDelLink = ''; }

if(!MODO_SERVIDOR){   // con servidor, el arranque lo hace servidor.js (arrancarServidor)
document.getElementById('playerName').textContent = jugador || '-';
aplicarRegalos();
cargarTop();
cargarTopHalloween();
enviarMaestro();   // por si la última pelea no llegó a mandarse
sincronizarEvento();
setInterval(sincronizarEvento, 60000);

if(nombreDelLink && nombreDelLink !== jugador){
  fijarNombreDesdeLink(nombreDelLink);
} else if(jugador){
  if(figuritasObtenidas() > 0) enviarPuntaje();
} else {
  pedirNombre();
}
window.addEventListener('online', () => { if(topFallo) cargarTop(); });
}
