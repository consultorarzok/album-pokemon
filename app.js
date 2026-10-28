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
let currentEstado = 'all';   // 'all' | 'shiny' | 'dup'
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

function renderEstadoFilters(){
  const box = document.getElementById('estadoFilters');
  box.innerHTML = '';
  [['all', 'Todas'], ['shiny', '✨ Shiny'], ['dup', 'Repetidas']].forEach(([v, t]) => {
    const chip = chipFiltro('estadoFilters', v, t, v === currentEstado,
      () => { currentEstado = v; renderEstadoFilters(); renderGrid(); });
    if(v === currentEstado){ chip.style.background = v === 'shiny' ? '#B88BFF' : '#F4C744'; chip.style.color = '#1b1530'; }
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
  if(currentEstado === 'shiny') lista = lista.filter(p => state[p.id].got && tieneShiny(p.id));
  else if(currentEstado === 'dup') lista = lista.filter(p => state[p.id].got && state[p.id].dup > 0);
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
  const activos = (currentFilter !== 'all' ? 1 : 0) + (currentRegion !== 'all' ? 1 : 0) + (currentEstado !== 'all' ? 1 : 0);
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
  if(!lista.length && currentEstado !== 'all'){
    grid.innerHTML = '<div class="grid-vacio">' + (currentEstado === 'shiny' ? 'Todavía no tenés ninguna ✨ shiny con estos filtros.<br>Salen muy de vez en cuando al abrir sobres o atrapar.' : 'No tenés repetidas con estos filtros.') + '</div>';
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
      /* tocar la carta abre su ficha: copias con su fuerza, shiny, evolución */
      slot.tabIndex = 0;
      slot.classList.add('tocable');
      slot.onclick = () => abrirDetalle(p.id);
      slot.onkeydown = ev => { if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); abrirDetalle(p.id); } };
    } else {
      slot.innerHTML = numTag + `<div class="ball-icon"></div>` + bar;
    }
    grid.appendChild(slot);
  });
}

/* ====================== CARTEL DE NOVEDADES ======================
   Aparece UNA vez por dispositivo cuando entra al juego (después de los carteles de nombre, personaje y PIN) y
   deja de salir pasada la fecha, porque habla de "la semana que viene". */
const NOVEDADES_ID = '20261028', NOVEDADES_HASTA = '2026-11-05';
function mostrarNovedades(intentos){
  try{
    if(localStorage.getItem('album-novedades-visto') === NOVEDADES_ID) return;
    if(new Date().toISOString().slice(0, 10) > NOVEDADES_HASTA) return;
    /* las pruebas automáticas no lo ven (taparía los botones), salvo que lo pidan */
    if(navigator.webdriver && !localStorage.getItem('album-novedades-test')) return;
  }catch(e){ return; }
  /* si hay otro cartel abierto (nombre, personaje, PIN, bienvenida...) espera a que se cierre */
  if(document.querySelector('.overlay.show, .special-overlay.show, .name-overlay.show')){
    if((intentos || 0) < 40) setTimeout(() => mostrarNovedades((intentos || 0) + 1), 1500);
    return;
  }
  document.getElementById('novedadesOverlay').querySelector('.reveal-panel').scrollTop = 0;
  document.getElementById('novedadesOverlay').classList.add('show');
}
document.getElementById('novedadesCierraBtn').onclick = () => {
  try{ localStorage.setItem('album-novedades-visto', NOVEDADES_ID); }catch(e){}
  document.getElementById('novedadesOverlay').classList.remove('show');
};

/* ====================== FICHA DE UNA FIGURITA ====================== */
function abrirDetalle(id){
  const p = DATA.find(x => x.id === id);
  if(!p || !state[id].got) return;
  const copias = ejemplares(id).slice().sort((a, b) => (b.f + (b.s ? 1000 : 0)) - (a.f + (a.s ? 1000 : 0)));
  const vario = copias.some(e => e.s);
  const mejor = copias.reduce((m, e) => (!m || e.f > m.f || (e.f === m.f && e.s)) ? e : m, null);
  const num = '#' + String(id).padStart(3, '0');
  const nombreDe = i => (DATA.find(x => x.id === i) || {}).name || '';
  const viene = Object.keys(EVOLUCIONES).filter(o => EVOLUCIONES[o].includes(id)).map(Number);
  const va = destinosEvolucion(id);
  const dup = state[id].dup;
  document.getElementById('detalleTit').textContent = num + ' ' + p.name;
  document.getElementById('detalleBody').innerHTML = `
    <div class="det-arte ${vario ? 'vario' : ''}"><img src="${vario ? imgVario(p) : p.img}" alt="${p.name}"${vario ? ' onerror="respaldoShiny(this)"' : ''}></div>
    <div class="det-datos">
      <span class="det-pill" style="background:${TYPE_COLORS[p.type]};color:${textoSobre(TYPE_COLORS[p.type])}">${TYPE_LABEL[p.type]}</span>
      <span class="det-pill">${REGION_LABEL[p.region]}</span>
      <span class="det-pill">${p.rarity}</span>
      ${vario ? '<span class="det-pill det-shiny">✨ Shiny</span>' : ''}
    </div>
    <div class="det-sec"><b>Tus copias</b><span>Tenés ${copias.length}${dup > 0 ? ' (' + dup + ' repetida' + (dup === 1 ? '' : 's') + ')' : ' · sin repetidas'}</span></div>
    <div class="ej-lista det-copias" role="list" aria-label="Copias de ${p.name}">${copias.map(e =>
      `<div class="ej-chip ${claseFuerza(e.f)}" role="listitem" title="${nivelFuerza(e.f)}"><b>${e.s ? '✨ ' : ''}💪 ${e.f}</b><small>N.º ${e.c}${e.s ? ' · shiny' : ''}${e === mejor ? ' · ⭐ Arena' : ''}</small></div>`).join('')}</div>
    <div class="det-sec"><b>Evolución</b></div>
    <div class="det-evo">
      ${viene.length ? `<div>Viene de: ${viene.map(nombreDe).join(', ')}</div>` : ''}
      ${va.length ? va.map(d => `<div>→ <b>${d.name}</b> · cuesta ${costoEvolucion(d.id)} repetidas${dup >= costoEvolucion(d.id) ? ' <span class="det-ok">¡Ya podés!</span>' : ' (te faltan ' + (costoEvolucion(d.id) - dup) + ')'}</div>`).join('') : '<div>No evoluciona.</div>'}
    </div>
    ${va.length ? '<button class="open-btn sec" id="detalleEvolBtn" style="margin-top:10px;">Ir a Evolucionar</button>' : ''}`;
  const eb = document.getElementById('detalleEvolBtn');
  if(eb) eb.onclick = () => { cerrarDetalle(); document.getElementById('pokedexCloseBtn').click(); abrirEvolucion(); };
  const ov = document.getElementById('detalleOverlay');
  ov.querySelector('.reveal-panel').scrollTop = 0;
  ov.classList.add('show');
  document.getElementById('detalleCloseBtn').focus({preventScroll:true});
}
function cerrarDetalle(){ document.getElementById('detalleOverlay').classList.remove('show'); }
document.getElementById('detalleCloseBtn').onclick = cerrarDetalle;
document.getElementById('detalleAtrasBtn').onclick = cerrarDetalle;

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
/* Al canjear, esta es la chance de que salga una figurita que NO tenés; si no, sale una cualquiera (puede ser repetida).
   Antes era 1 (siempre una nueva): Zeta lo bajó a 0,4 el 28/10. */
const CANJE_PROB_NUEVA = .4;
const tituloCanje = nueva => nueva ? 'Canjeaste 3 repetidas: ¡una nueva!' : 'Canjeaste 3 repetidas: te tocó una que ya tenías';

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

  const ev = eventoVistaActiva();
  const pool = ev ? DATA.filter(p => IDS_KANTO_JOHTO.has(p.id)) : DATA;
  const sale = Math.random() < CANJE_PROB_NUEVA ? elegirPesado(falta) : elegirPesado(pool);
  const eraNueva = !state[sale.id].got;
  if(eraNueva) state[sale.id].got = true; else state[sale.id].dup++;
  const pull = {p:sale, isNew:eraNueva};

  renderGrid();
  updateProgress();
  saveProgress();
  enviarPuntaje();

  if(isSpecial(sale)){
    playSpecialSequence([pull], 0, () => showReveal([pull], tituloCanje(eraNueva)));
  } else {
    showReveal([pull], tituloCanje(eraNueva));
  }
}

/* ====================== EVOLUCIONAR ======================
   Tabla en evoluciones.js. Se elige un ejemplar de un Pokémon con repetidas: ese ejemplar pasa a
   ser su evolución (mismo número de fuerza y shiny) y se gastan otras copias hasta completar el costo,
   que depende de la rareza de lo que se consigue. Siempre queda 1 del original en el álbum. */
const costoEvolucion = destId => COSTO_EVOLUCION[DATA.find(p => p.id === destId).rarity];
function destinosEvolucion(id){
  const ev = eventoVistaActiva();
  return (EVOLUCIONES[id] || []).map(d => DATA.find(p => p.id === d))
    .filter(d => d && !(ev && !IDS_KANTO_JOHTO.has(d.id)));
}
/* Pokémon que se podrían evolucionar ya mismo (alcanzan las repetidas para al menos una rama) */
function evolucionablesYa(){
  return DATA.filter(p => state[p.id].got && destinosEvolucion(p.id).some(d => state[p.id].dup >= costoEvolucion(d.id)));
}
function evolucionarLocal(id, destId, serie){
  const dest = DATA.find(p => p.id === destId), costo = costoEvolucion(destId);
  if(!destinosEvolucion(id).some(d => d.id === destId) || state[id].dup < costo) return null;
  const l = ejemplares(id), i = l.findIndex(e => e.c === serie);
  if(i < 0) return null;
  const elegido = l[i];
  l.splice(i, 1);
  const resto = l.map((e, k) => k).sort((x, y) => (l[x].f + (l[x].s ? 1000 : 0)) - (l[y].f + (l[y].s ? 1000 : 0))).slice(0, costo - 1);
  resto.sort((x, y) => y - x).forEach(k => l.splice(k, 1));
  state[id].dup -= costo;
  ejemplares(destId);   // completa lo que ya tenía antes de sumar éste
  const nueva = !state[destId].got;
  if(nueva) state[destId].got = true; else state[destId].dup++;
  state[destId].ej.push(nuevoEjemplar(codigoFuerza(elegido)));
  renderGrid(); updateProgress(); saveProgress(); enviarPuntaje();
  return {p: dest, isNew: nueva};
}
function evolucionar(id, destId, serie){
  if(MODO_SERVIDOR) return evolucionarServidor(id, destId, serie);
  const pull = evolucionarLocal(id, destId, serie);
  if(!pull) return;
  const titulo = 'Evolucionó a ' + pull.p.name;
  renderEvolucion();
  if(isSpecial(pull.p)) playSpecialSequence([pull], 0, () => showReveal([pull], titulo));
  else showReveal([pull], titulo);
}
function renderEvolucion(){
  const cont = document.getElementById('evolucionList');
  document.getElementById('evoCostos').textContent = ['Poco Común', 'Rara', 'Épico', 'Legendario']
    .map(r => (r === 'Poco Común' ? 'Común/Poco Común' : r) + ' ' + COSTO_EVOLUCION[r]).join(' · ');
  cont.innerHTML = '';
  const lista = DATA.filter(p => state[p.id].dup > 0 && destinosEvolucion(p.id).length)
    .sort((a, b) => Number(evolucionablesYa().includes(b)) - Number(evolucionablesYa().includes(a)) || a.id - b.id);
  if(!lista.length){
    cont.innerHTML = '<div style="font-size:11px;color:var(--ink-dim);">Todavía no tenés repetidas de Pokémon que evolucionen. Cuando te salgan, vení acá.</div>';
    return;
  }
  lista.forEach(p => {
    const copias = ejemplares(p.id).slice().sort((a, b) => b.f - a.f);
    let elegido = copias[0].c;
    const fila = document.createElement('div');
    fila.className = 'shop-row ej-fila';
    fila.innerHTML = `<img src="${p.img}" alt="" style="width:34px;height:34px;object-fit:contain;flex:0 0 auto;">
      <span class="txt"><b>${p.name}</b>Tenés ${copias.length} (${state[p.id].dup} repetida${state[p.id].dup === 1 ? '' : 's'}): elegí cuál evoluciona</span>
      <div class="ej-lista" role="radiogroup" aria-label="Copias de ${p.name}">${copias.map((e, i) =>
        `<button type="button" class="ej-chip ${claseFuerza(e.f)}" title="${nivelFuerza(e.f)}" data-c="${e.c}" role="radio">
          <b>${e.s ? '✨ ' : ''}💪 ${e.f}</b><small>N.º ${e.c}${e.s ? ' · shiny' : ''}${i === 0 ? ' · ⭐ Arena' : ''}</small></button>`).join('')}</div>
      <div class="ej-lista evo-destinos"></div>`;
    const marcar = () => fila.querySelectorAll('.ej-chip').forEach(ch => {
      const on = ch.dataset.c === elegido;
      ch.classList.toggle('on', on); ch.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    fila.querySelectorAll('.ej-chip').forEach(ch => ch.onclick = () => { elegido = ch.dataset.c; marcar(); });
    marcar();
    const dBox = fila.querySelector('.evo-destinos');
    destinosEvolucion(p.id).forEach(d => {
      const costo = costoEvolucion(d.id), falta = costo - state[p.id].dup;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'open-btn evo-btn';
      b.disabled = falta > 0;
      b.innerHTML = `<img src="${d.img}" alt="" style="width:26px;height:26px;object-fit:contain;vertical-align:middle;margin-right:6px;">` +
        `→ ${d.name} <small>${falta > 0 ? 'te faltan ' + falta : costo + ' repetidas'}${state[d.id].got ? ' · ya lo tenés' : ' · nuevo'}</small>`;
      b.onclick = () => evolucionar(p.id, d.id, elegido);
      dBox.appendChild(b);
    });
    cont.appendChild(fila);
  });
}
function abrirEvolucion(){
  document.getElementById('evolucionOverlay').querySelector('.reveal-panel').scrollTop = 0;
  renderEvolucion();
  document.getElementById('evolucionOverlay').classList.add('show');
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

/* Para entrar a la arena hacen falta PELEA_MIN Pokémon de Kanto, Johto, Hoenn o Sinnoh (ver arena.js). */
const PELEA_MIN = 3;
const REGIONES_ARENA = ['kanto', 'johto', 'hoenn', 'sinnoh'];
function kantoMios(){ return DATA.filter(p => REGIONES_ARENA.includes(p.region) && state[p.id].got); }   // nombre histórico: ahora son Kanto + Johto + Hoenn + Sinnoh

function updateBarras(){
  const dups = repetidasTotales();
  const tengo = DATA.filter(p => state[p.id].got).length;
  const dc = document.getElementById('dupCount');
  if(dc) dc.textContent = dups;
  const dh = document.getElementById('dupCountHome');
  if(dh) dh.textContent = dups;
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
  'c': {walk:true,  label:'Moneda en el piso',  pinta:'pisoObjeto', item:'moneda'},
  'H': {walk:false, label:'Casa',              pinta:'casa'},
  'M': {walk:false, label:'Cerro de colores',  pinta:'cerroColores'},
  'G': {walk:false, label:'Casa de Gobierno',  pinta:'gobierno'},
  'K': {walk:false, label:'Catedral',          pinta:'catedral'},
  'D': {walk:false, label:'Cabildo',           pinta:'cabildo'},
  'I': {walk:false, label:'Iglesia',           pinta:'iglesia'},
  'O': {walk:false, label:'Monumento',         pinta:'monumento'},
  'X': {walk:false, label:'Fuente',            pinta:'fuente'},
  'z': {walk:false, label:'Monumento a Belgrano', pinta:'ecuestre'},
  'n': {walk:false, label:'Palmera',           pinta:'palmera'},
  'g': {walk:false, label:'Cedro',             pinta:'cedro'},
  'l': {walk:false, label:'Farol',             pinta:'farol'},
  't': {walk:false, label:'Banco',             pinta:'banco'},
  'Q': {walk:false, label:'Casa de Gobierno',  pinta:'gobiernoAla'},
  'd': {walk:false, label:'Cabildo',           pinta:'cabildoArcos'},
  'J': {walk:false, label:'Catedral',          pinta:'catedralNave'},
  'v': {walk:true,  label:'Vía del Tren Solar', pinta:'via'},
  'x': {walk:false, label:'Panel solar',      pinta:'panelSolar'},
  'w': {walk:true,  label:'Pasarela del dique', pinta:'pasarela', encuentro:'agua'},
  'U': {walk:false, label:'Torre de toma',     pinta:'torreToma'},
  'R': {walk:false, label:'Usina eléctrica',   pinta:'usina'},
  'A': {walk:false, label:'Algarrobo Histórico', pinta:'algarroboHistorico'},
  's': {walk:false, label:'Algarrobo',         pinta:'algarrobo'},
  'Y': {walk:false, label:'Estación del Tren Solar', pinta:'estacionSolar'},
  'h': {walk:false, label:'Casa de adobe',     pinta:'casaAdobe'},
  'y': {walk:false, label:'Puesto de artesanías', pinta:'puestoArtesanias'},
  'W': {walk:false, label:'Ingenio',           pinta:'ingenio'},
  'j': {walk:false, label:'Llama',             pinta:'llama'},
  'f': {walk:false, label:'Flamenco',          pinta:'flamenco'}
};

const ADV_MAPS = {
  overworld: {
    nombre:'Mundo Pokémon',
    cols:322,
    rows:[
      "##################################################################################################################################################################################################################################################################################################################################",
      "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,aaa~~~aa~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~a,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,\"\"aaa~~~aaa,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,aaa~~~aa~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,\"#,#\"#\",,#a~~a#####,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a#,,,,,,,,,,,,,,,,,,,,,,,\"\"aaa~~~aaa,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,\",,,,,,,,#\",,#,,,\",,,,\",,,,\",a~~~~~~~a\",,,\",,,,,#,\",,,,,,,,,#,,\",,\",,,,aaaaa\"\",\",,,,#",
      "#,...........................................a~~~aa~~~~~~~a,,,...............,,,,,,#,,,\"#####\",#a~~a####,^^^^^^^,,.............,,,#,,,,,,,,#,\"\"\"\"\"\"\",,,,,,,,,,a~~~~~~~a,,,#,,,,,,,..........^.^^^aaa~~~aaa,,,,,,,,,,,^^^^^^^,,#,j#\"\",,##.............#,,,,\",,,,,,,\",\",,,\",a~~~~~~~a,#,\",,\",\",\".............,\",,,,,,#a~~~a,\",,,\"\",#",
      "#,...................,,,..,,,,,,,#,,,,,,,,,aaa~~~aa~~~~~~~a,,c...............,WWW,,,,###\",#,#,\"#a~~a#####^^^^^^^,,.............,,,,,,,,,,,,,,\"\"\"\"\"\"aaaaaaaaaaaa~~~~~~~a,,,,,,,,,,,...........^^^^aaa~~~aaa,,,,,,,,,,,^^^^^^^,,,,,,,#,\",\".............\"#,,,,,b,,,,,#,,,,,,\"a~~~~~~~a,,,,,,,\"\"\",...........b.,,,,,,,#,a~~~a\"\"\",\",#,#",
      "#,..##\"#\"\"\"\"#\"#g#\"#..,,,..,,,,i,JKJ,ddDddi,aaa~~~aa~~~~~~~a,,,...............#####,,,\"#,,\",##\"##a~~a#####^^^^^^^,,.............,,#,#,,,,,,,,,\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,..........^^^^^aaa~~~aaa,,,,,#,,,,,^^^^^^^,,,,,\",,,\",\".............#,,,#,,,,,,,\",\"\",,,,,a~~~~~~~a\",\",,#\",,,#.............,,\",,,##,a~~~a,,,,,,,,#",
      "#,.\".#g\"#g#\"\"\"#g\"#.g.,,,..,,,,,,,,,,,,,,,,,aaa~~~aa~~~~~~~a,,,...pq.......W..#######,,,###\"#,,##a~~a#####^^^^^^^,,...pq........,,,,,,,,,,,,,,\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,....pq.....^^^^aaa~~~aaa,#,#,,,,,,,^^^^^^^,,,,,\",,,\",\"....pq.......,,,,\",,,,,\",#,,\",,,,,a~~~~~~~a\"#,,,,,#,,,....pq.......,###,,,,,a~~~a#,,,,,,,#",
      "#,.\"\".\"\"\"#\"##\"#\"#.\"#.,,,..................,aaa~~~aa~~~~~~~a,,,...Pr.......i..##########,,\"\",#,#a~~a######^^^^^^^#,...Pr........,,#,,,,,c,,,,,\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,....Pr......O\"\"aaa~~~aaa,,,,,,,,,,,^^^^^^^,,,\"\"\",\"#,,\"....Pr.......,,j,,,,,,,,,,,,,,,,,,a~~~~~~~a,,#,\"\"\"\"\",,....Pr.......,,\",c,,,#a~~~a\",,,,,\",#",
      "#,.\"#\".*\"#\"#\"\"#g*\"\"\".,i,...#,#c#,.,#,#,#..,aaa~~~aa~~~~~~~a,,,...............\"#############,#,aa~~a######^^^^^^^,,.............,,#,,,,,,,,,,,\"\"\"\"\"ba~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,.........b...L\"aaa~~~aaa,,,,,,,,,,,^^^^^^^,\"\"\",,,#,,\",.............,\",,,,\",\",#,\",,,,\",,\"a~~~~~~~a,,\"\",\"\"\"\"\"\".............,,,,,,,,,a~~~a,,,,,,,,#",
      "#,.g#\"\".\"\"\"#\"\"\".\"\"\"#.,,,..#il#*n,.,n*#l.#.,aaa~~~aa~~~~~~~a,,#...............\"\"\"\"\"\"#######,,##a~~a#######^^^^^^^,,.......i.....c,,,,,#,,,,#,,\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a,,,,,,#,,,,.i...........i\"aaa~~~aaa,,,,,,,,#,,^^^^^^^,#\",,\",\"\",,,.............,,,,,#\",\"\"\"\"\",,\",,,j,a~~~~~~~a\"\"\"\"\"\"L\",,\".............,,,#,,\"##a~~~a,\"\",,,,,#",
      "#,.#\"\"#\".\"\"\"##.##\"\"\"......,,.,g,*.*,g#.,,.,aaa~~~aa~~~~~~~a,,,...............\"\"\"\"\"\"\"\"#####,\",a~~a########^^^^^^^,,.............,,,,,,,,,,,,,,\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,..dDd........\"\"aaa~~~aaa,,,,,,,,,,,^^^^^^^,,,,,,,,,,\",.............,,,\",,,,,\",\",,,\",,,,\"a~~~~~~~a,\"#,,\"#,,,,.............,,,,,\",,,a~~~c,\",,,,#,#",
      "#,.ggc#\"#.....#\"#\"##.,pq..##,.,*#.#*,.,##.,aaa~~~aa~~~~~~~a,,,...............\"\"\"\"\"\"\"\"####,#,aa~~a########^^^^^^^,,u,u,u#.....................\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a,,,........................aa~~~aaa,,,,,,,,,,,^^^^^^^,,,,,,\",,,,,,,,L,#i.,,,\"\",,,,,,,,,,#\",\",,,,\",,a~~~~~~~a,,,,,,\",,\"##,,,,#..,,,,,,\",,,,,,,a~~~a\"\"\"\",,,,#",
      "#,.#\"\"*#g.....\"\"\"\"\"#.iPr..,*g,.,t.t,.,g*,.,aia~~~aa~~~~~~~a,,,..............i\"\"\"\"\"\"\"\"\"\"#####a~~a#########^^^^^^^uuuuuuuu..,,hhi.s,.,s.,,,h,.h\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a,,,,h.,hh,h.,s.s,..hh,h.,haaa~~~aaa,,,,,,,,#,,^^^^^^^,,,,,,..........................,,,,##,#,##,#,a~~~~~~~a,,,.............................,a~~~ai,,,,,,,#",
      "#,.\"\"####..O..\"####\".,....#n,*,.....,*,n#.,aaa~~~aa~~~~~~~a,,,,,###....................####,a~~a#########^^^^^^^uuuuuuuu..,,,h,.,s.,,.hhh,,.,\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a,,,hh.h,,,h.s,.,s..,,h,.h,aaa~~~aaa,,,,,,,#,,,^^^^^^^,#,,,,.,,,,h.,h,h,..,h,,.h,h,,.,,\"\",#,,,,\",,,,a~~~~~~~a,,,.,,,,,.,,,hh.,..,h.hh,hh.h,,.\"a~~~a,,,,,,\",#",
      "#,.\"\"\"#\"#.....\"g\"g\"#.,,,..,,*#t.....t#*,,.,aaa~~~aa~~~~~~~a,.\"\"\"\".\"...h,h.s,.,,.h,,,h.,###,,a~~a#########^^^^^^^uuLuuuuu..uh,,,...*...I,h,,.,\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a,,#,,.,,,,,...*.........h,aaa~~~aaa,,,#,,,,,,,^^^^^^^,,,,,,.,,,,h.,h,,h..,,h,.,,,h,.,\",,,,\",,,#,,,,a~~~~~~~a,,,.,,,,,.,,,,,.,..,,.,,h,h.,hh...BBB..,,,,\"b,#",
      "#,.\"XXXX\".....\"##\"\"#.,,,.........z.@......,aaa~~~aa~~~~~~~a,.\"\"\"\".\"...h,h.,s.s,.,,,,,.h#i##,a~~aa########^^^^^^^uuuuuuuu..uh,,h.,s.s,.h,hhh.,\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a,,j,,.,,,h,.s,.,,..,i,h.h,aaa~~~aaa,,,,,,,,,,,^^^^^^^,,,,\"\".,,hh,.,hh,,..,,h,.hh,,h.h\"\",\"#,,,,,,,,#a~~~~~~~a,,\".,,hh,.hhhh,.,..,,.,h,hh.,,i.,a~~~a,,,,,,\",#",
      "#,.\"XXXX.\"#\"##.#\"\"\"\".,,#..,,*#t.....t#*,,.,aaa~~~aa~~~~~~~a,.\"\"\"\".\"..c,,,...*...Ih,,,.,,##,##a~~a######\",^^^^^^^uuuu......u,h,h.s,.,,.,h,h,.h\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a,,,hh.,,h,h.,s.,,..h,,,.h,aaa~~~aaa,,,,,,,,,,,^^^^^^^,,\",,,.,h,,,.h,h,,..,h,,.,,,,h.,\",\",,,c,,,,,,,a~~~~~~~a,,,.h,h,h.,,,hh.,..h,.h,h,,.,,h.,a~~~a,\",,,\",,#",
      "#,.\"XXXX\"\"#\"g\"\".*\"\"\".,,,..#n,*,.....,*,n#.,aaa~~~aa~~~~~~~a,.\"\"\"\".\"...h,h.,s.s,.,h,,,.,\"##,u,a~~a#\"###,,,^^^^^^^uuuu..i......................\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a,,,...................c....aa~~~aaa,,,,,,#,,,,^^^^^^^,,\",,,.,,,,h.,,c,h..h,,,.,,hhh.h\"\"\",\",,,,,,,,,a~~~~~~~a\"#,.,,hh,.h,,,h.,..h,.hhh,,.,h,.\"a~~~a,,,,,,\",#",
      "#,.\"XXXX#\"\"g\"\"\"L.\"#\".,,,..,*g,.,t.t,.,g*,.,aaa~~~aa~~~~~~~a,.c\"\"\".\"...,,h.s,.,,.,,hhh.h,uuuuuaa~~aa\",\"##,^^^^^^^uuuuuuuu..u,h,h.,,,h,.,,,,h.,\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a,,,,,.,,,,,.,,,,h..,,h,.,,aaa~~~aaa,,,,,,,,,,,^^^^^^^,,,,\",.........I................\"\"\"\",#,,,,,\",#a~~~~~~~a,#,.............................#a~~~a,,,,,,,,#",
      "#,.\"g.\"\"\"#\"###\"\"\".g\"c,,#..##,.,*#.#*,.###.,aaa~~~aa~~~~~~~a,.\"\"\"\".\"....................uuuuuuuaa~~a###,#,^^^^^^^uuuuuuiu..,h,,h.h,h,,.,h,,h.,\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a,,,,,.,,,,,.hh,,,..h,hh.h,aaa~~~aaab,,,,,,,,,,^^^^^^^,,,,,,.,,,,,.*,.*,..hhh,.,,h,,.,\"\"\"\"\",,,##,,#,a~~~~~~~a\",,.hhhhh.,,,,,.,..h,.h,,,,.h,h.,a~~~a,,,,\",,,#",
      "#,.#.\"\"#\"#\"\"\"\"\"\"\"\".#.,,,..,,.,g,*.*,g,.,,.,aaa~~~aa~~~~~~~a,.\"\"\"\".\"...,h,.,,,,,.,hh,,.uuuuuuuuua~~aa#\"#\",^^^^^^^uuuuuuuu..,,,,,.,,,h,.,,h,,.,\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a,,,,h.,,,,h.hh,h,..h,,,.h,aaa~~~aaa,,,,,,,,,,,^^^^^^^,,\",,,.h,,h,.,,.,,..,,,,.,,h,,.,j\"\"\"\",,,\",,,,,a~~~~~~~a,,,.,,hhh.,,,,h.h..hh.h,hh,.ZZZ.Za~~~aZZZZ,,,,#",
      "#,...................,,,..#.l#*n,.,n*#l.#.,aaa~~~aa~~~~~~~a,.\"\"\"\".\"...,,,.,,h,,.,,,,,.uuuuuuuuuaa~~a####,^^^^^^^,,,u\"\"\"\"......................\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a,,#,,.,,h,,.hh,,,..,,,,.,,aaa~~~aaa#,,,,,,,,#,^^^^^^^,,,,,,.,,,h,........,,hh.b,,,,.,\"\"\"\"b\"\",,,#,\",a~~~~~~~a\"\",.,hh,,.,h,,h.h..,h.hh,,h.ZZZ.Za~~~aZZZZ,\"#,#",
      "#,,,,,,,,,,.,,,,,,,,,,,,...#,#,#,.,#,#,#..,aaa~~~aa~~~~~~~a,.\"\"\"b.\"..............................BB..#,#,^^^^^^^,,,,\"\"\"\".....................\"\"\"L\"\"a~~~~~~~~~~a~~~~~~~a,,,h,.,,,,,........hhhh.,,aaa~~~aaa,,,,,,,,,,,^^^^^^^,#,,,,.h.....*,.*,..,,hh.,,,,,.,\"\"\"\",,,,,,,,\",a~~~~~~~a\"\"\".,,,,h.,,.......,,.hh,h,.ZZC.Za~~~aZZZZ,,#,#",
      "#,,,,#,,,,#.,,,,,,,,,,,,..................,aca~~~aa~~~~~~~a,.\"\"\"\".\"..........................uuua~~au,#\",^^^^^^^,,#\",\"\"\".....................\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a,,,........................aa~~~aaa,,,,,,,#,,,^^^^^^^,,,,#,.,.....,,.,,..,,,,.,hh,,.,\"\",\",,,,,,,,\",a~~~~~~~a\"\"\".hhhh,.,h.......h,.h,,,,.ZZZ.Za~~~aZZZZ,\",,#",
      "#,,,,,,,,,#.,#,,,,,,,,,,..,n,,,XXXX,,,#n,,,aaa~~~aa~~~~~~~a,.\"\"\"\".\"...,,,.,hhh,...h,,.uuuuuu.uuaa~~a#,##,^^^^^^^,,,,\"\"\"\"..h,,,,.h,,,,.h,,,,.aa\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a,,,,,.,,,h,..,,,h..,,h,.h,aaa~~~aaa,,,,,,,,,,,^^^^^^^,\"\",,,..........................xxxeexxx,xxxx,a~~~~~~~a,,,...............I.............Za~~~aZZZZN#\",#",
      "#,,,,,,,#,,.,,,,,,,,,,,,..,,,*,XXXX,,*,,,,,aaa~~~aa~~~~~~~a,.\"\"\"\".\"....................uuuuu.uua~~aa\"\",,,^^^^^^^,,,,,\"\"\"..,,,,h.h,,,,.,,aaa.~aaaaa\"a~~~~~~~~~~a~~~~~~~a,,,,h.,,bih..,,,,..,,h,.,,aaa~~~aaae,,,,,,,,,,^^^^^^^,,,,,,.h..h,.,,h,,..,hhh.,,h,,.eeeeeeee,,##,#,a~~~~~~~a,,#.,,,,,.,,,,h.,,.,,.h,,h,.ZZZ.Za~~~aZZZZNN,,#",
      "#,,,,,,,#,,.,b,,,,,,,,,,..,,#,,XXXX,,,,,,,,aaa~~~aa~~~~~~~a,.\"\"\"\".\"...h,,.,,FhF...FF,.uuuuuucuaa~~au#\"##,^^^^^^^,,,,,,\"c..hh,,,.,,,,,.hha~~.~~~~~a\"a~~~~~~~~~~a~~~~~~~a,L,,,.h,h,h..,,,,..,,,,.,,aaa~~~aaaeeee,,,,,,,^^^^^^^,,,,,,.h..,,.h,,,h..hhh,.,xxxx.eeeeeeeee,xxxx,a~~~~~~~a,\",.,h,,h.,h,h,.,*.,*.hh,h,.ZZZ.Za~~~aZZZZN#,,#",
      "#,,,,,,,,,,.,,,,,,,,,,,,..,,,*,XXXX#,*,,,,,aaa~~~aa~~~~~~~a,.\"\"\"\".\"...h,,.h,FFF...FFF.uuuuuuuaa~~aa###,#,^^^^^^^,,,,,,,,..,,,,,.,,,,,.aa~~~.~~~~~a\"a~~~~~~~~~~a~~~~~~~a,,,,,.ahhh,..,,,h..,,,,.hhaaa~~~aaaeeee,,,,,,,^^^^^^^,,,,,,.,..,,.,h,,,..hh,h.,,,,e.eeeLeeeeee,#,,,a~~~~~~~a,,,.hh,,,.,,,,h.......hh,,h.ZZZ.Za~~~aZZZZ\",,,#",
      "#,,,,,,,,,,.,,,,,,,,,,,#..,n,,l,,,,,l,,n,,,baa~~~aa~~~~~~~a,.\"\"\"\".\"...,,,.,FLFF...FFF.F,#uuuua~~aa###\",#,^^^^^^^,#,,,,,,..,h,,,.hhhhh.a~~~~.~~~~~a\"a~~~~~~~~~~a~~~~~~~aaa#a,.~a,,h..h,,h..,,,,.,,aaa~~~aaaeeeee,,,,,,^^^^^^^,,,,\",.,..,,.h,hh,..h,,,.,xxxe.eeeeeeeeeeexxx,a~~~~~~~a\",,.h,,,,.,b,,,.,,.,,.,,h,,.ZZZ.Za~~~aZZZZ,,#,#",
      "#,,,,,#,,,,.,,,,,,,,,,,,..,,,i,QQGQQ,,,,,,,aaa~~~aa~~~~~~~a,.\"\"\"\".\"...,h,.FFFFF...FFF.FF###\"aa~~a##,,,,,,^^^^^^^,,,,,,,,.....................~~~~a\"a~~~~~~~~~~a~~~~~~~a~a~........................aa~~~aaaeeeee,,,,,,^^^^^^^,,,,#,.,..,,.,,,,h..,,,h.h,,,e.eeeeeeeeeee,,,#a~~~~~~~a,,\".,,,,,.,hh,h.,*.,*.,,,,,.ZZZ.Za~~~aZZZZ,,,,#",
      "#,..........................................aa~~~aa~~~~~~~a,.\"\"\"\".\"...h,,.FFFFF...FFF.FF#,##a~~aa\",#,#\",,^^^^^^^,,,,,,,,..h,h,,,h,,,hh,h~~~~~~~~aa\"a~~~~~~~~~~a~~~~~~~a~~~~~~~~~~~..aa,,..,,h,,,,aaa~~~aaaeeeee,,,,,,^^^^^^^,\",,,,...............................eeeeee,\",a~~~~~~~a,#,..............................a~~~aZZZZ,,,,#",
      "#,#,#\"#\".\",#\"#.,\"##,b\"\"#..aaaaa.a#\"\"i,.\"\"\"\".aa~~~aa~~~~~~~a,.\"\"\"\".\"....................F,#\"\"a~~a#,#\"##,,,^^^^^^^,,,,,b,,..,,,,,,,,,eeeeaaaaaaaaaa\"\"a~~~~~~~~~~a~~~~~~~a~~~~~~~~~~~BB~#,,..,,,,,\"\"aaa~~~aaaeeeeee,,,,,^^^^^^^,,,,,,.,..h,.,,,,h..................eeeeee\",,,a~~~~~~~a,,,.h,,,,.,,,h,.,..,.............a~~~aZZZZ,,#,#",
      "#,#\"\"\"\"\".\"##,#.\"##\"#.aaa..aaaaa.aaaa\"\".mm#,.aa~~~aa~~~~~~~a,.\"\"\"\".\",..,,,,FFFFFFFFFFFFF##\"##a~~a,#\"#,#,\",^^^^^^^,,,,#,,,..,,,,,,,,eeeeeeeeee,\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a~~~~~~~~~~~BB~a,,.b,,,,#\"\"aaa~~~aaaeeeee,,,,,,^^^^^^^,,,,,,.,..hh.,,,h,..,,,,.,hh,e.eeeeeeeeee,,\",#a~~~~~~~a\",,.,,,hh.hh,,,.,..,h.,h,,,.ZZZ.Za~~~aZZZZ#,\",#",
      "#,aa\"\"##.,\"###.#\"\"#a.aaaBB~~~~~B~aaaaa.mm#m.aa~~~aa~~~~~~~a,.\"\"\"\".\"...\"\".\"\"FF.FFFF.FFF\"#,#,#a~~aa#####\"#,^^^^^^^,,,,,,,,..,,,,,,,,eeeeeeeeeee\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a~~~~~~~~~~~BB~aa,..,,,,,\"\"aaa~~~aaaeeeee,,,,,,^^^^^^^,,,,,\".u..hu.h,,,,..h,,,.hh,,e.eeeeieeeee#,,,\"a~~~~~~~a#,,.,,,hh.,,,,h.,..,,.,hh,,.hh,.,a~~~a,,\",,\",,#",
      "#aaaaaa#.\"#\"#\".\"aaaa.~~~BB~~~~~B~~~~aa.aamm.aa~~~aa~~~~~~~a,.\"\"\"\".\"...\"\".\"\"\"F.FFFF.F\"\"\"#,#,##a~~a####\"##,^^^^^^^,,,,,,,,..,,,,,,,,eeeeeeeeeee\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a~~~~~~~~~~~BB~~a,..,,,,,\"\"aaa~~~aaaeeee,,#,,,,^^^^^^^,,,,,u.u..uu.,,,,,..,,h,.,,h,h.eeeeeeeee,,,,,\"a~~~~~~~a,#,.hh,h,.h,,,h.,..,h.h,,,,.,,,.,a~~~a,,,,,,,,#",
      "#a~~aaaa.aaaaa.aaaa~B~~~BB~~~~~B~~~~~~.aaaa.aa~~~aa~~~~~~~a,.\"\"\"\".\"...\"\".\"\"\"\".\"\"F\".\"\"\"\"#\"\"###a~~a#,#,#,#,^^^^^^^#,,,,,,,.................eeee\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a~~~~~..BBBB..B.....,,,,,\"\"aaa~~~aaaeee#,,,,,,,^^^^^^^,,\"uuu..........................eeeeeee,,#,#,,a~~~~~~~a,,,.,,hh,.,,,,h.h..h,.h,,,,.h,,.,a~~~a,m,,,#,,#",
      "#a~~~~~a.aaaaa.a~~~~B~~~..aaaaa.a~~~~~B~~aa.aa~~~aa~~~~~~~a,.\"\"\"\".\"...\"\".\"\"\"\".\"\"\"\".\"\"\"\"\"\"\"\"\"\"#a~~aa##,##,^^^^^^^,,,,,,,,................eeeee\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a~~~~~BBBBBB..B.....,,,,,\"\"aaa~~~aaa,,,,,,,,,,,^^^^^^^,uuuuuuu..uuuuu,#,..,\",#,,xxxx,xxxe,xxxx,xxxx,a~~~~~~~a\",,.............................,a~~~ammmm,,,,#",
      "#a~~~~~~B~~~~~B~~~~~Baaa..aaaaa.aaaa~~B~~~~B~~~~~aa~~~~~~~a,.\"\"\"\".\"...\"\".\"\"\"\".\"\"\"\".\"\"\"\"\"\",#\",\"#a~~a##,,\",^^^^^^^,,,,,,,,..,,,,,,,,,eeeeeeeeee\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a~~~~~~~~~~~BB~a,,..,,,,,\"\"aaa~~~aaa,,,,,,,,#,,^^^^^^^,uuuuuuu..uuuuuuu,..,,,,,\",,#,,,,,,,,,,,,,,\",\"a~~~~~~~a,,,.,huuu.u,,,h.h..,,.,,,hh.,,,.,a~~~ammmmm,,,#",
      "#aaa~~~~B~~~~~B~~~~a.aaa..##\",#.\"aaaaaB~~~~B~~~~~aa~~~~~~~a,.\"\"\"\".\"...\"\".\"\"\"\".\"\"\"\".\"\"\"\"\"\",#,,,#a~~a#\",##,^^^^^^^,,,,,,,,..,,,,,,#,#eeeeeeeee,\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a~~~~~~~~~~~BBaa,,..,,,,,\"\"aaa~~~aaa,,,,,,,,,,,^^^^^^^,uuuuuuu..uuuuuu,\"..\"c,,\",xxxx,xxxx#xxxx,xxxx,a~~~~~~~a#,,.uuuuu.uuuuh.h..h,.,,,h,.h,h.,a~~~ammmmmm\",#",
      "#,aaaaa~B~~~~~B~aaaa.\"##..\"###\".\"\"#\"aa.aa~~B~~~~~aa~~~~~~~a,.\"\"\"\".\"...\"\".\"\"\"\".\"\"\"\".\"\"\"\",#\"##,###a~~a#\"##,^^^^^^^,,,,,,,,..#,,,#,,,,eeeeeeee,,\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a~~~~~~~~~~~BB,,##..,,,,,\"\"aaa~~~aaa,,,,,,,,,,,^^^^^^^uuuuuLuu..uuuuuuu#..,#\",,,#,\",#,,,,,,\",\"\"\"\"\",,a~~~~~~~a#,,.uuuuu.uuuuu.,..,,.,h,hh.,hh.ma~~~ammmmmmm,#",
      "#,\"\"aaaa.aaaaa.aaaa\".#\"\"..#\"\"##.\"\"\"#,\".aaaa.aa~~~aa~~~~~~~a,.\"\"\"\".\"...\"\".\"\"\"\".\"\"\"\".\"\"\"\"#,\",##\"#,a~~a,#\"#,^^^^^^^,,,,,,,m..,,,,,,M,,,,,e,e,,,,\"\"\"\"\"\"a~~~~~~~~~~a~~~~~~~a~~~~~~~~~~aa.uu,,..,,#,,\"\"aaa~~~aaa,,,,,,,,,,,^^^^^^^uuuuuuuu..uuuuuuu,..,#,,,,xxxx#xxxx,xxxx,xxxx,a~~~~~~~a,,u.............................,a~~~ammmmmmm,#",
      "#,..........................................aa~~~Ta~~~~~~~aT,,,i,,,...\"\".\"\"\"\".\"\"\"\".\"\"\"\"##,#,#,#,a#a#\"##T,^^^^^^^,T#,mmmm..m,#,,MMM,,,,,,,,,,,,,,,,,a~~~~~~~~~Ta~~~~~~~aT~~~~~~~~aa..,,,,..,,#,,\"\"aaa~~~aaa,,,,,,,,,T,^^^^^^^uTuuuuuuuuuuuuuuu,..\"\",\",\",,,,,,\",\",\"#\",,#\"##Ta~~~~~~~aT,uuuuuuuuuuuuu\"\"..\"#,#,\",\",,#\",,aaaaammmmmm\",#",
      "#,,,,,,,,,,,,,,#.....,,,..........................aBBBBBBBa...................................................................MMMMM.................BBBBBBBBBBaBBBBBBBa...B....a.................aaa~~~aaa................................................................aBBBBBBBa...................\",,,,,,\"#,,,,,\"mmmmmmmmmm#,#",
      "#,vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvBBBBBBBvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvBBBBBBBBBBvBBBBBBBvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvBBBvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvBBBBBBBvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv,#",
      "#,##,,,#\",,\"#,,,,,,,..R.\"#\"#,,Yi.uuuu..uu,.......ia~~~~~~~ai####,,,,.\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"Yi\"\"\"\"\",######,#,,\"i,^^^^^^^,immmmmm..mMMMMMMMMM,,Yi,,,,,,,,,,,a~~~~~~~~~ia~~~~~~~ai,,,,,,,,,,..,,,,,,,,Yi,\"\"aaa~~~a.a,,#,,,,#,i,^^^^^^^,iuuuuuuuuuuuuu\"\",,\"#,,\"Yi,,.,,,\",\",,,,,,,,,\"ia~~~~~~~ai,uuuuuuuuuuuu,u\".,,aaaYi~a#aa,,\"#,mmmmmmm,,,,#",
      "#,#aaaaaaa#aa#aa#aaa,..\"#\"\"#,#,\",uuuu..uuu..##,,..a~~~~~~~a#####,#\"#.\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"ZZZZ\"###,###\",^^^^^^^,mmmmmmm..MMMMMMMMMMM,,,##,,,,,,,c,a~~~~~~~~~~a~~~~~~~a,,#,,,,,,,,..,,,,,,,,,,,\"\"aaa~~~a.a,,,,,,,,,,,^^^^^^^,#,uuuuuuuuuuu,\",,\",,,,,,,\",.,#,,,,,,,,,,,,,,,a~~~~~~~a,,,uuuuuuuuuuuu\",.aaa~~~~~~~~aaa,\",,#\"\",,,\",\",#",
      "#,a~~~~~~~~~~~~~~~~....i..eeee#,,uuuu..uuu..#,,\",.a~~~~~~~a######,,,.\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"ZZZZ\",,####\"#,^^^^^^^mmmmmmmm..MMMMMMMMMMM,,,,,#,,#,,,,,#~~~~~~~~~~a~~~~~~~a###uuuuuuuuuLuuuuuuu#i,,\"\"aaa~~~a.a,,,,,,#,,,,^^^^^^^,,,,uuuuuuuuu,,,,,\",\",,##,,#.,,,#,\",,,#,\",,,,,a~~~~~~~a,,\"uuuLuu.uuu,hh,.a~~~~~~~~~~~~aa,,,,,\",##,,,,#",
      "#,a~~~~~~~~~~~~~~~~......eeeLe.#,uuuuuuuuu..\"##,,.a~~~~~~~a#####,#\",.\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"ZZZZ#\"\",#,#,,,^^^^^^^,mmmmmmm..MMMMMMMMMMM...,,,,.,,,,,,a~~~~~~~~~~a~~~~~~~a###,,,,,,,c,,,,,,,,,,,,,\"\"aaa~~~a.a,,,,,,#,,,,^^^^^^^,\",,,,,#\",uu\"#,#,,\",,\",,,,,\".,,\"#,#,,#\",,,,#,,a~~~~~~~a\",,,uuuuu.u,,h,,,.a~~~~~~~~~~~~~aa,,\",\",,\",,,,#",
      "#,a~~~~~~~~~~~~~~~~..#aaaaaaeee..,uuuuuuu,..,\",,#,a~~~~~~~a######,,\".\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"ZZZZ#,#\"e#,\"\",^^^^^^^,mimmmmm...i............AAAA.,,,,,,a~~~~~~~~~~a~~~~~~~a##\",,,,,,,,,,,,,,,,,,,,,\"\"aaa~~~a.a,,,,,#,,,#,^^^^^^^,,,,\",,aaa,,,#aa,,,,\",,,,,,,.\"\",,,,,,\",,#,,,,#a~~~~~~~a,\"#h,,,,u.u,,h,,,.~~~~~~~~~~~~~~~a,,,,,,,#,,,,#",
      "#,#~~~~~wwwwwwwww~..\"##~ia~aae.....,,..#,,..,#,,,#a~~~~~~~a######\"##.\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"NNNNeeeeeee,e,^^^^^^^#mmm.mmmmmmmmm,,,,#,,,..AAAA.,,,,,,a~~~~~~~~~~a~~~~~~~a\"\"\"\"uuuuuuuuuuuuuuu,,,,,\"\"aaa~~~a.a,,,,,,,,,,,^^^^^^^,,\",,,fa~faifa~faaa,,,,,,,,,.,,,,,,#,,\",,,#,,,a~~~~~~~a\",,,hh,i,.,h,,,,,.~~~~~~~~~~~~~~~a,,#,#,,,,,,,#",
      "#,#~~~~~Uwwwwwwww...\"#aa~a~~aa,,.......,,...,,\"#,#a~~~~~~~a#####\"###.\"#\"\"##,###,####\"\"N..NNNNNNeeeeeeeee,^^^^^^^,,hm.mmmmmmmm,,,,,,,,,..AAAA.,,,,,,a~~~~~~~~~~a~~~~~~~a\"\"\"\",,,,,,,,,,,,,,,,,,,,\"\"aaa~~~a.a,,,,,,,,#,,^^^^^^^,,a#aja~~~~~~~~a~~aaNNNN#\",,.,,\",b,,,,\",,\",\",,a~~~~~~~a\",,,,,h,,I,h,,,,h.BBBBBBB.B~~~~~~a,,,,,#,,#,,,#",
      "###~~~~~wwwwwwwww..iaaaa#a~~~aa#\",......,...\"\"\"\",\"a~~~~~~~a#########.#\"\"\",,,,,,#\"\"##NNN..NNNNNeeeeeeeeeee^^^^^^^,hh,.mmmmmMM,,,,,,,,,,C.AAAA.,,,,,,a~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\",,,,,,,,,,,,,#,,,,\"\"aaa~~~a.a,,,,#,,,,,,^^^^^^^,,a~~~~~~~~~~~~~~~f~NNNN#,,,.#,,,,,,,,,,\"\",#\",a~~~~~~~a,,,,hh,h,.hh,,h,,.BBBBBBBB~~~~~~~a,,,,,#,,\",#,#",
      "###~~~~~~~~~~~~~..\"##~~aa##~~~#a\",#.........\",,,\"#a~~~~~~~a#^^^##\"\"#.............b............eeeeeeeeeee^^^^^^^,,,,.mImm,MMM,,,,,,,,,.,,i,,.,,,,,,a~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"uuuuuuu,,,,#,,,,\"\"aaa~~~a.a,#,,,,,,,,,^^^^^^^aaf~~~~~~~~~~~~~~~~~NNNN#,\",.,,,,,\",,\",,\",,,,,a~~~~~~~a,,,...............~~~~~~~~~~~~~~~a,,,,,,,,,,\",#",
      "###~~~~~~~~~~~~..\"\"a~~~~#~a#~~~a##,###..i....#,#b,a~~~~~~~a#^^^^##,,..........................eeeeeLeeeee^^^^^^^,,,h.,,,,,MMM,,,,,#,hh.,,,,,.,,,,,,a~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"\"\"#####,,,,,,,,,\"\"aaa~~~a.a,,,,,,,,,,,^^^^^^^~~~~~~~~~~~~~~~~~~~~~~NNN\",,.,,\"\",,,,,,,,,\",\"#a~~~~~~~a,,\",,,,hh.h,hh,,,.~~~~~~~~~~~~~~aa,,,,,,\",#,,,#",
      "###~~~~~~~~~~~...\"\"a#~~~~~~~a~~~aa,,,,\",,.....,\",,a~~~~~~~a#^^^^,,,,.#,\",####,##,##\",,N..NNNNeeeeeeeeeeee^^^^^^^,,hh.,h,,MMMMM,,,,,,,h.,,,,,.hh,,,,a~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"\"\"####,,,,,,,,,,\"\"aaa~~~a.a,,,,,,,,,,,^^^^^^^f~~~~~~~~~~~~~~~~~~~~~NNN,,#.,#,m,,,,,,,,,,,,#a~~~~~~~a,,,hh,,,,.,hh,,,,.aa~~~~~~~~~~~aa,,,,,,,,,,,,,#",
      "###~~~~~~~~~~~..\"#######~~~~~~~~~a###aa,\"#.....\"#,a~~~~~~~a#^^^^##\"#.#,,\"##\"\"#,\"###,##\"..NNNNNeeeeeeeeee,^^^^^^^,h,,.,h,,MMMMMM,,,,,,h.,,,,,.,,,,,,a~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"\"\"........,,,,,,\"\"aaa~~~a.a,,,,,,,,,,,^^^^^^^~~~~~~~~~~..BBBBBBB~~~~NNmmm.mmmmmmm,,\"#,,,b,,a~~~~~~~a,,,hhh,,,.,,,,,,,.,aaa~~~~~~~~#a,#\",,,,,,,,#,,#",
      "###~~~~~~~~~~..\"\"########~~~~~~~~~~~~~aa##..#\"...\"a~~~~~~~a##^^^\",##.,ia#a\"#\"#,#\"##,,##..\"NN,#ceeeeeeeee,^^^^^^^,h,h.,,,MMMMMMM,,,,,,i.,i,,,.,,h,,,a~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"\"\"........,,,,,j\"\"aaa~~~a.a,,h,.,,,,,,^^^^^^^~~~~~~~~~~BBBBBBBBB~~~~NNNmm.mmmmmmmmm,,,,,,,,a~~~~~~~a,,,h,h,,,.hh,h,,,.,,,#a#~~aaaa#\",,,,#\",\"#,,,,,#",
      "#####~~#####...#\"##########aa~~~~~~~~~~~a,..,m,,..a~~~~~~~a#^^^^\"\"#a.###~aL##\"##,\",\",#,..#####,e,eeeeee,,^^^^^^^,,,,.,MMMMMMMMMM,,,,,,.D,I,,.,hh,,,a~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"\"\"\"##,,,,,,,,,,,\"\"aaa~~~a.a,,h,.,,h,,,^^^^^^^~~~~~~~~~~~~~~~~~~~~~~~NNmmm.mmmmmmmmm,,\",,,,,a~~~~~~~a\",,,,h,,,.,,h,,hh.,,,,,aa#a,,,\",\",\",,\",\",,,#,,#",
      "######~######.##############aaa~~~~~~~~~aa..,mmmm.a~~~~~~~a#^^^^aa#~.BBBBBBBB..,,##\"\"#,..,#\",\",,,,,#,\"\",,^^^^^^^,,,,,MMMMMMMMMMMM,,.............,,,a~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"\"####,,,,,,#,#,,\"\"aaa~~~a.a,hih.hh,,,,^^^^^^^a~~~~~~~~~~~~~~~~~~~~~~~NNmm.mmmmmmmmm,##\",,\",a~~~~~~~a\"\",,h,,,h.,,,,,,,.eeeeee,,,#,,,\",,\",,j\",,,\",,,#",
      "######~~#####.#####~~~~~~#~~#~~~~~~~~~~~~...mmmmm,a~~~~~~~a###^^a~~~~~~~~~~~~~.#a#,#,,,..,#,#\"#,##C#,###,^^^^^^^,,,,MMMMMMMMMMMMM,,,,,.s,.ss.,,,,,,a~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"\"######,,,,,,,,,,\"\"aaa~~~a.ah,,,.,,hh,,^^^^^^^~~~~~~~~~~~~~~~~~~~~~~~~Nmmm.mmmmmmmmmm,#,,,,,a~~~~~~~a,,,,,,,h,.,,,,,ee.eeeeeeee,,\"\",,,,\"\",,\",,,,,\",#",
      "####,aaaI,,,,.#####~~~~~~~~~~~~~~~~~~~~~~...mmmmm,a~~~~~~~a,^^^^a~~~~~~~~~~~~~B~a\"#\"##,..,\"##^^^^^^^^^^^,^^^^^^^##,,MMMMMMMMMMMMM,,h,h.s,.sy.,h,,,,a~~~~~~~~~~a~~~~~~~ac\"\"\"\"\"\"\"####,,,,,,,,,,,,\"\"aaa~~~a.a,h,hI,,,,,,^^^^^^^f~~~~~~~~~~~~~~~~~BBBBBNN.......mmmmmmm,\",,\",,a~~~~~~~a,#,,,,,,\"#c,\",,ee.eeeeeeee,,\",,,#\",,,#,\"#,,,,,#",
      "####,h,,,,,h#.#####~~~~~~~~~~~~~~~~~~~~~~...mmmmmma~~~~~~~a#^^^^#~~~~~~~~~~~~~B~##,##,#..,##\"^^^^,^^^^^^,^^^^^^^,,,MMMMMMMMMMMMMMM,,,h.ss.,s.,,,,,,a~~~~~~~~~~a~~~~~~~a\"\"\"\"\"\"\"######,,,,,,,,,,,\"\"aaa~~~a.ajhhh.m,hh,,^^^^^^^#a~~~~~~~~~~~~~~~~BBBBNNN......mmmmmmmm\",,,,,\"a~~~~~~~a,,,,,\",,,,,,,,\"ee.eeeeeeee,,,,,,\",,,,,,,,\",,,,#",
      "####,,#...#,,B########~#~~~~~~~~~~~~~~~~~...mmmmmma~~~~~~~a,\"^^^a~~~~~~~~~~~~~B~~a\"##,,..#,,,^^^^^^^^^^^,^^^^^^^,,,MMMMMMMMMMMMMMM,........y.hh,,,,a~~~~~~~~~~a~~~~~~~a####\"#######,,,,,,#,,,,,\"\"aaa~~~a...........,,^^^^^^^,f~~~~~~~~~~~~~~~~~~~NNNNmmm.mmmmmmmmm#,,,,\",,a~~~~~~~a,,,\",,,,,,\",,#,eec....eeeee,,,,,,,,,,,\",,,,,,,#",
      "####,,.........~~~############~~~~~~~~~~~a..mmmmm,a~~~~~~~a,^^^^~~~~~~~~~~~~~~B~##\"\"\"\"\"..#\"\",^^^^^^^^^^^,^^^^^^^,,MMMMMMMMMMMMMMMMMi,,.s,.ss.,,h,,,a~~~~~~~~~~a~~~~~~~a#########,,,,,,,,,,,,,,,\"\"aaa~~~a.a,mmm.mmm,,,^^^^^^^,aa~~~~~~~~~~~~~~~~NNNNNmmmm.mmmmmmmm,m,\",\",,,a~~~~~~~a,,,,,,#,\",,,,,,ee....eeeee\"\",\"F\"#,,,\",,,,,,,,,#",
      "####h,..*......#~~~~~~~~~~~~~~~~~~~~~~~~~a..mmmmm,a~~~~~~~a,^,^^#a~~~~~~~~~~~~B~a\"#,,#\"..,#,,^^^^^^^^^^^,^^^^^^^,,MMMMMMMMMMMMMMMMMhh,.,s.sy.,h,,,,a~~~~~~~~~~a~~~~~~~a,#######,,,,,,,,,,,,,,,,\"\"aaa~~~a.ammmm.mmmh,,^^^^^^^,,aa#aa~~~~~~~~~~aaNNNNNmmmm.mmmmmmmm\",,,\",,,#a~~~~~~~a,,,,,,,,,\",\",,,ee.eeeeeeeFFFFFFFFFF#,,\",\",\",,,#",
      "####,,.i...#,..#####~~~#~~~~~~~~~~~~~~~~~a..mmmmm,a~~~~~~~a,^^^^,#~~~~~~~~~~~~B#a####a\"..,,##^^^^^^^^^^^,^^^^^^^##MMMMMMMMMMMMMMMMM,h,.ss.s,.,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,#,#,#,,,,,,,#,,#,#,,\"\"aaa~~~a.ahmmm.mmmm,,^^^^^^^,,L\",Caa#~#aa##aaa,,,,,\",#mm.mmmmmmm,FF,,,,,\",a~~~~~~~a,,\"\",,,#,#,,,,,,e.eeeeeeFFFFFVFFFFFF\",,,,,\"\",,#",
      "####,,#...##,..#####~~~~~~~~~~~~~~~~~~~~aa......,#a~~~~~~~a,^,^^\"a#~a~~~~~~~~~.aaa~a~##..a,,#^^^^^^^^^^^,^^^^^^^,,,,,#,,,,,,,,,,,,,.............#,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,\"\"aaa~~~a.ah,mm.mmm,,,^^^^^^^,,ZZZZZZ................................F,F,,,a~~~~~~~a,,,,,,,,,,,,,\",,,.eeeeeFFFFVVVVVVFFFFF,,,,,,,,#",
      "####h,,,,,,,,.C#,##~~~~~~~~~#~~#~~~~~~~~a#......##a~~~~~~~a,^^^^#\"##a#~~##~#aa.~#~~~~~~~~aam#^^^^^^^^^^^,^^^^^^^,,#,,,,,,,,,,,,,,,,,,,.,,,,,.,,,,,,a~~~~~~~~~~a~~~~~~~a,#,,,,,,,,,,,,,,,,,,,,,,\"\"aaa~~~a.ah,,h.h,h,,,^^^^^^^,,ZZZZZZ................................FFFFF,a~~~~~~~a,,\",,,,,,,,,,,,,,.\"ee,FFFFFVVVVVVVFFFF,,,,,,,,#",
      "####,h,,h,,h,..#####~~~#######~~~~~~~aa#a.aa#~BBaaa~~~~~~~a,^^^^,#,,,##aaa#aa#B~~~~~~~~~~~aam^^^^^^^^^^^,^^^^^^^,,,,,,,,,,,,,,,,,,,hh,.,h,,h.,h,,,#a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,NC,,NN,,,\"\"aaa~~~a.a,hhh.,h,,,,^^^^^^^,\"ZZZ,ZZ..ZZZZZZZZZZZZZZZ,,\".,,\"#FFFFF..FFFF,\"a~~~~~~~a,#\",,\",,\",,,,,,,,...............VVVLFFF##,,,,,#",
      "#~#########NN..N###########~~~~~~~#aa#aaa.a~~~.B~~a~~~~~~~a,^^^^#,\",,#\"#,##,a~B~~~~~~~~~~~~am^^^^^^^^^^^,^^^^^^^,,#,,,,,,,,,,,,,,,,,,,.,h,h,.,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,#,,,,,NNNNNNNNNNNN,\"\"aaa~~~a.a,,h,.hhh,,,^^^^^^^,\"ZZZZZZ..ZZZZZZZZZZZZZZZ,,,.\",\"FFFFVV..VFFFF,a~~~~~~~a,,\"\"\",,,,\",,,,\"#,..............VVVFFFF,,,,,,\",#",
      "#~~~###NNNNNN..NNNNNNN####~~~~~~#~~~~~#~~.~~##..##a~~~~~~~a,^#^^##\"#,#\"\"####a~B~~~~~~~~~~~~am^^^^^^^^^^^,^^^^^^^,,,,#,,,,,,,,,,,,,,.............,,,a~~~~~~~~~~a~~~~~~~a##,,,,,,,,NNNNNNNNNNNNNNNNaaa~~~a.a,,,,,,,,,,,^^^^^^^,,ZZZZZZ..ZZZZZZZZZZZZZZZ\"\",.,\",FFFVVVVVVVFFFFa~~~~~~~a,,,,,,,,,,,,,,,,,.,,##,,FFFVVVVVVFFFFF,,,,,,,,#",
      "##~~NNNNN~NNN..NNLNNNNNN~~~~~##a~~~~~~~~~.aaa#..##a~~~~~~~a,^^^^\",\",,,,,\",#\"#~B~~~~~~~~~~~~ammmm###\",,\",,^^^^^^^,,,,,#,,,,,,,,,,,,#,,h.h,h,,.,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,NNNNNNNNNNNNNNNNNNaaa~~~a.a,,,,,,,,,,,^^^^^^^,,ZZZZZZ..ZZZZZZZZZZZZZZZ,,,.\",,FFLFVVVVVFFFFFa~~~~~~~a\"\",\"#,\"\",,,,,,\"\",.\"\",,#,FFFFFVVFFFFF\",,,,,,b,,#",
      "##~~~~~~~~~~~..NNNNNNNN~~~~##a~~~~~#aa####.\"\",..\",a~~~~~~~a,\"#,^##,#\"#,\"\"#,##a.~~~~~~~~~~~aammmm,##,#\"##,^^^^^^^,,,,,,,,,,,,,,,j,,,,b,.,,,,,.,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,#,,NNNNNNNNNNNNNNNNNNNaaa~~~a.a,,,,,,,,,,,^^^^^^^,\"ZZZZZZ..ZZZZZZZZZZZZZZZ,,,.,,jFFFFFFFVFFFFF,a~~~~~~~a\",\",,\"\",,,#\",,,,#.,,\",,,,FFFFFFFFF,,,,,,,,\",,,#",
      "#~~ZZNNNNNNN~~NNNNNNNNN~~####a~~~a#a,\",,\",FFFF..FFa~~~~~~~a,^^^^#,,###,,\"\"\"#\"\".#~~~~~~~~~~ammmm###,\"##\"\",^^^^^^^,,,,,MM,#,,,,,,,F,,,,,.,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,NNNNNNNNNLNNNNNNNNaaa~~~a.a,,,,,,,,,,,^^^^^^^,,ZZZZZZZZZZZZZZZZZZZZZZZ\",,.,\",,FFFFFFFFFFF\",a~~~~~~~a\",,\",,,,,\"\",\",,,#.,,,#\"\",,#\"#F,F,,,,#,,\",,,,,,#",
      "#~ZZZZZNNNNNN~~~~~~~~~~~~~~##aaaaa,,,,#,#FFFFF..FFa~~~~~~~a,^^^^##,\",###,#a##a.aaaaa~~aaaaammmm,\"##\",##\",^^^^^^^,,,,MMMMM,FFFFFFFFFFF,.#,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,NNNNNNNNNNNNNNNNNNNaaa~~~a.a,,,,,,,,,#,^^^^^^^,,ZZZZZZZZZZZZZZZZZZZZZZZ#,,.,\"\"\",#FFFFFFF,#\",a~~~~~~~a,\"#,,,,,,\",,#,,,,.,,,,,#,,,,,,,,,\",,,,j,\",,,,,#",
      "#~ZZZZZZZZZZNNNZZNZZZZ~~ZZ~~ZZ,,,,,aaaa,FFFFFF..FFa~~~~~~~a,^^^^#,\",###aaa~#~#.,#,,aaaammmmmmm\",,##\",,,#,^^^^^^^,#,MMMMMMMFFFFFFFFFFFF.F,,c,,,#,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,NNNNNNNNNNNNNNNNNNaaa~~~a.a,,,,,,#,,,,^^^^^^^,,ZZZZZZZZZZZZZZZZZZZZZZZ,,,.,,\",,,\"FF,#\"\",#,,a~~~~~~~a,,,,,\"#,,,,,,,,,,.,,,,#,,#,\"#,,#,,,\",,#,,,,,,,#",
      "#~ZZZZZZZZZZZZZZZZZZZZZZZZZZ~Z#a,,,#~~a,FFFLFF.FFFa~~~~~~~a,^^#^,#,a#a~~~~~~~~Bai\"\"#mmm\"#m#\"#\"#\"\"#\"#,,\",,^^^^^^^,#MMMMMMMMMFFFFFFFFFFF.F,,,,#,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,NNNNNNNNNNNNNNNNNaaa~~~a.a##,,,,,,,,,^^^^^^^,,ZZZZZZZZZZZZZZZZZZZZZZZ,\",.,,##,,\",,,\"#\"\",,,a~~~~~~~a#,,,\",#,\",,,,\",\",.,,\",,\"\",,,,,,#,#,,\",#,,,\",,,#",
      "#ZZZZZZZZZZZZZZZZZZZZZZZZZZZ~~~#,,##~~a,,FFFFF.FFFa~~~~~~~a,^^^^\"###~~~~~~~~~~B~####,#,####\"#\"#,,#######,^^^^^^^,,MMMMMMMMMFFFFLFFFFFF.FM#,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,NZNNNNNNNNNZZZZaca~~~a.a,,,,,,,,,,,^^^^^^^#,ZZZZZZZZZZZZZZZZZZZZZZZ,,,.,,\",\",,,,,,,,,,,,a~~~~~~~a###,,\",,,,,,,,#,,.,,,\",,#,,,,,,,\",,,,#,,,,,,,,#",
      "#ZZZZZZZZZZZZZZZZZZZZZZZZZZ##~~#####aaa,,FFFFF.FFFa~~~~~~~a,^^^#,,\"aa~~~~~~~~~B~~#,\"#,#,###\"\",\",#\"\"\",###,^^^^^^^,,MMMMMMMMMFFFFFFFFFFF.MMM,,,,,,,,,#~~~~~~~~~~a~~~~~~~a#,,,,#,,,,,,,,ZNZZZNZZZZZZaaa~~~a.a,,,,,,,,,,,^^^^^^^,cZZZZZZZZZZZZZZZZZZZZZZZ,,,.,,,#,,#,,,,#,,,##a~~~~~~~a,#,,,,\"#\",,,,,##,.\",,,,\"\",\",,,,,,,,,,#,,,,,,,,#",
      "###ZZZZZZZZZZZZZZZZZZZZZZ#ZZ##~~####a,#,,,,FFF.FFFa~~~~~~~a,^^^^\"#,#a~~~~~~~~~B~#a#\",#,,\"#\",#,,,,,#\"\",#,,^^^^^^^,,,,,,#,FFFFFFFFFFFFFF.MMMMM,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,#,ZZZZZ,,,\"\"aaa~~~a.a,,,,,,,,,,,^^^^^^^,\"\",,,##,,,,,,,\",#,,,,,,,,,,.,,,,,\",\",,,,,,,,,a~~~~~~~a,\",\",\"\",c#,,,,,\",.,\",,,,\",,,,,,,,,#,,,,,,,,,,,#",
      "#######ZZZZZZZZZZZZZZZ########~~~~~~###,,,,,,,.F,,a~~~~~~~a,^^^^##\",a#~~~~~~~~B#a,###\"####,#######\"#\"##\",^^^^^^^,,,,,,,,#FFFFFFFFFFFFM.MMMMMM,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,#,,,,,,,,,,,,,,,,\"\"aaa~~~a.a,,,,,,,,,,,^^^^^^^,\",\"\",\"\",,,,,,,,,#,,\",,,,\"\"#.,,,\",,,\",,\",\",\",#a~~~~~~~a,,,,,,,,\",,,,,,,,.,,,,,,\",\",,,,,\",,,,\",,#,,#,,#",
      "###################Z#############~~~~##a,,aaa,.,,,a~~~~~~~a,^^,^,#,#,aaa~a~~aa.,,\"###\"\"\"#,#,,,\"##\",\"##\",,^^^^^^^,,,,,,,,,,,,,,,,FFFMMM.MMMMMMM,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,\"\"aaa~~~a.a,,,,,,,,,,,^^^^^^^,,,\",\",,\"\",,,#,,,#,,,,,,,,\"#.,,,\",,\"\",,\",,,,,#a~~~~~~~a,,,#,\"b,,,,,,,,,,.,,\",,,,,#,,\",\",,,,,,,\"\",,,,,#",
      "####################################~~~a,,a~a,.,,,a~~~~~~~a,^^^^,##\",,,#a###a\".##,,,,##\"#,######,#,,,,,,,^^^^^^^,,,,,,,,,,,,MM,,,,,MMM.MMMMMMM,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,\"\"aaa~~~a.a,,,,,,,c,,,^^^^^^^,#,,#,,,\",,,,\"#,,,,\",,,\"#,,\".,,,\"#j\"\"\",#,,#,,\"a~~~~~~~a\",,,,,,,\",,,,,,,,.,,,#,,,,#,,,,,,,,,,,,,,,,\",,#",
      "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,aaaaa,,aaa,.,,ca~~~~~~~a,^^^^##,,\"\"\",#,#\"#\".,\"######\"###,#\"\",####\",,#,^^^^^^^,,,,,,,,,,MMMMM,,,,MMM.MMMMMMM,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,\"\"aaa~~~a.a,,,,,,,,,,,^^^^^^^,,,,,,,\"\",,,\",,,,,,#\",,\"\",,,.,,,,,#,,\",,,,\"\"\",a~~~~~~~a,,,,,,,,,\",,\",,,#.,\",,,,,,#,,,,,\"\"##,,\",,,,,\",#",
      "#,,,,#,#\"\",#,N#,\",#,##,##\",,\"\"\",#\"##,,,,#\"#,,,.#,#a~~~~~~~a,^^\"^####,,#,#\"#,,,.,\",##,,#,\",\"##,,,,##,#\",,,^^^^^^^,,,#,,,,,MMMMMMM,,,,,,.,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,\"\"aaa~~~a.a,,,,,,,,,,,^^^^^^^,,,,\",,\",,,\",,,\",,\",,\",,,,#,.,,,,,,,,,,,,,,,\",a~~~~~~~a,,,\",,,,,,,,,,,#,.\",,,\"\"\"\"#,,,,,\"\",,,,\",,,,,,,#",
      "#,#,#,NNNNNNNNNNNNNNN,,##,\"##\",,\"\"#,,,\"##\"\",\"\".,\"#a~~~~~~~a,^^^^#,,,,\"#,\"##,#,.,,\"##,\"\",#,#\"\",\"##\"#\"#,,#,^^^^^^^,,,,,,,,,MMMMMMM,,,,,,.,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,\"\"ama~~~a.m,,,,,,,,,,,^^^^^^^,,\"\",,,,\",\",,\",,,#\",,,,,\",,#.\",,,,\",#,\",,,,,\",a~~~~~~~a,,,,,,,,,,,,,,\",#.,#,,,,,\",,\",,,,\",,\",,,,\"#,,,#",
      "#,,NNNNNNNNNNNNNNNNNNNNN##\"##,\",\"#\"\"##,\"\"#\",,,.,,#a~~~~~~~a,^^^^,,##,#,,,,\"#,,.#,#,\"###,b,\",##\",\"\"b#,\"\"\",^^^^^^^,,,,,,,#,MMMMMMM#,,,,,.,,,,,,,,,,#,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,\"\"mma~~~a.m,,,,,,,,,,,^^^^^^^,,,,,\",,,,,#,,,\",,,,NN,N,#,,.,\",,,\",,\",,,,\",,,a~~~~~~~a,,,,,,,,,,,\",,\",\".,,,,,,,,,,\",,,,,,,,,,,,,,,\",#",
      "#,NNNNNNNNNNNNNNNNNNNNNNNN,\"\"#,,,,,,,b,#\",,##,.,,,a~~~~~~~a,^^,^\"#,,,#,##\"#,#,.,\"#\"##,##,#\"#,#\"##,\",####,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,.c,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,mmmaaaaa.mm,,,,,,,,,,^^^^^^^,\",,,,,\"##N#,,,N,NNNNNN,N\",,.N\",,,,,\",\",,,,\",,a~~~~~~~a,,,,,,,,,,,\"\"\",,,.,,\"\"#,\",,,,#,,,#,,,#\",,,#,,,#",
      "#,NNNNNNNNNNNNNNNNNNNNNNNNN\"##\",#\",,#\",,\",,\",\".,#\"a~~~~~~~a,^^^,,\"#\"\"\"##,#\"#,\".,#,,#\"\"#,,,#,###\"##\"#\"\"#,,^^^^^^^,,#,,,,,,,,,,#,,#,,,,,.,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,...............mm,,,,,,,,,,^^^^^^^,,,,,,,,\"\",,,NNNNNNNNNNNNNNN.,,,,,,#\",,,\",,\",,a~~~~~~~a\",#,,,\",,,\",,,,\",.,,,,,,,,,,\"\"\",,,,\",,,,,,,,,,#",
      "#,ZNNNNNNNNNNNNNNNNNNNNNNN##,,,##\"#\"#,,,,,,,##.,,\"a~~~~~~~a,#^^#\"\"#\"\"\"#\",,\"##,.,b\",##,,#\",##\"##,#\"#,,,##,^^^^^^^,,,,,,,,,,,,,,,,,,b,,,.#,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,,,,,,mmmmmmm,i,b,,,,,,,,^^^^^^^,,\",,,,,N\"NNNNNNNNNNNNNNNNNN.NNN,,,,,,,,,#,,,\"a~~~~~~~a,,,,,,,,#\",\",,\",,.,,,,,,,\",\"#,#,,,#,,,,j,\",,#,#",
      "#,\"NNNNNNNNNNNNNNNNNNNNNZZ,\",,,\"#\"#\"\",\"\",\",#\",.#,\"a~~~~~~~a,^^^^,#,#\"#,###,\"##.,\",,,,\"\"\"\"\",,#,#\",,#\"#\"#\",^^^^^^^,#,,,,,#,,,,,,,,,,,,,#.,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,NN,NNNNNNNNNNNNNNNNNNi.NN,,,,,,\",,,,\",,,a~~~~~~~a,,,,,,,,,,\"\",,,,,.,#,#,,,,,,\",,,#,,,,,,,,\",\"\",#",
      "#ZZZZZNZNNNNNNNNNNNNNZNZZZZZ##,\"#\"\"##,#\",,\"#,\".\"\",a~~~~~~~a,^^^^,#\"\"\"##,,\"\"\"\"\",,,###\"\"###,\"\",#\"\",\"#\",,#\",^^^^^^^,,,#,,#,,,,,,,,,#,,,,,.,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,M,,,,,,,,,,,^^^^^^^,,,,,NNNNNNNNNNNNNNNNNNNNNNN.NNNNNNN,,,,,,,,\",a~~~~~~~a,#,,,,,,,\",,,#,#,.\",,,,,,,,,#\",,,,,,,,,,,,,#\",#",
      "#ZZZZZZZZZZZZZZNZZZZZZZZZZZZ,####\"\",##\"###\"#,\".#,#a~~~~~~~a,^^^^,\"#\"###,#,#\"\"#,#,\",\",,,####,,,\"#,##,###\",^^^^^^^,,,,,,,,,,#,,,,,,,,#,,.,,#,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,MMM,,,,,,,,,,^^^^^^^,,\",,NNNNNNNNNNNNNNNNNNNNNNN.NNNNNNN,\"\",,,,\",,a~~~~~~~a,,,,,,,,,,,#,,#,,.,,,,,,aaaaa,,,,\",,#,,,,,,,,,#",
      "#ZZZZZZZZZZZZZZZZZZZZZZZZZZZZ,,#,,\"##a#a#\"\"#\",.\",\"a~~~~~~~a,\"^^^,,#\",,,####\",#,##,#,,#\",,,,,#####\",,,\",#,^^^^^^^,,,,,,,,,,,,,,,#,,,,,,.,i,,,#,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,MMM,,,,,,,,,,^^^^^^^,,,,,NNNNNNNNNNNNNNNNNNNNNNN.NNNNNNNN,#,,,,,,,a~~~~~~~a,##,,#\",,,,#,,,,,.,aaaaaa~a~aa,,,,,,,,,,,\",\",,#",
      "#ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ\"##a##aa~aa,,,\",.,,#a~~~~~~~a,^^^^#\"\"\"#,#\"\"###,,,###,#,###,#\"\"####,,\",,##,,^^^^^^^,#,,,,,,,,,,,,,,,,,N#,.#,,,,,,,,,,#a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,MMMM,,,,,,,,,,^^^^^^^,,,,NNNNNNNNNNNNNNNNNNNNNNNN.NNNNNNN,,\",,#,,,,a~~~~~~~a,,,,,,,,,\",,,,\",\".,a~i~~~~~~~aaa,,,,,,,,\",,,,,#",
      "#ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZa#~~~~~~~~aaa###.###a~~~~~~~a,^^#^##,#,\"###,\",,,,,,,#\"\",,\"#\"##,\"\",#,#\"####,^^^^^^^,,,,,,,,,,,,,##,,NN,NNNNNNNN#,,##,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,,,,,,,M,,,MMMMM,,MM,,,,,^^^^^^^,,,NNNNNNNNNNNNNNNNNNNNNNNNN.NNNNNNNNN,,,\",,,,a~~~~~~~a,,,,,\",,,,,,,,,,,,a#~~~~~~~~~~~aa,,,,,,,,\",,\",#",
      "#ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZa~~~~~~~~~~~~#i,.#,#a~~~~~~~a,^^^^,##,##\"\"#,\"b####\"##,#,#\"#,#\"\",#\",,,#,\"##,^^^^^^^,,,,,,,,,b,,,,NNNNNNNNNNNNNNN,,N##,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,,,,,,MMMMMMMMMMMMMMM,j,,^^^^^^^,N,NNNNNNNNNNNNNNNNNNNNNNNNN.NNNNNNNNNN,\",\",,,a~~~~~~~a,,,,#,,,,#,##,,#aa#~~~~~~~~~~~~~aa\",,,,#,,,#,,#",
      "#ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ~~~~~~~~~~~~~a\"#.##,a~~~~~~~a,^^^^#,#,,,,\",,\"#,#,,\",\",#,,##\"\"#,#,,##,,#\"##,^^^^^^^,,,,,,,,#,,NNNNNNNNNNNNNNNNNNNNN,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,,,,,,MMMMMMMMMMMMMMM,,,,^^^^^^^,\",NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN,,,,,\",a~~~~~~~a,,,,,,,,\",,,,j,,a~~~~~~~~~~~~~~~~a,,,,#,,,,,,,#",
      "#ZZZZZZZZZZZZZZZZZZZZZZZZZZZZ~~~~~~~~~~~~~~B...,,,a~~~~~~~a,^^^^###,,#\"#\"\"\"##,\"\"\",#\"\"\",###\"##\",,#,#\",#,\",^^^^^^^,,,,,,,,,,,N,NNNNNNNNNNNNNNNNNNN,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,,,,,MMMMMMMMMMMMMMMM,,,,^^^^^^^,,NNNNNNNNNNNNNNNNNNLNNNNNNNNNNNNNNNNN,\"\",,,,\"a~~~~~~~a,,,,\"\",,\",,\",\",,a~~~~~~~~~~~~~~~~a,,,,,,,,,\",,#",
      "#ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ~~~~~~~~~~~~~a\"##\"\"\"a~~~~~~~a,#^^^#,#,###,\"#,#,\"#####,,,,,#,,,\"##,,#\",\"\"#\",^^^^^^^,,,,,,,,,,NNNNNNNNNNNNNNNNNNNNNNNN,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,,,,,MMMMMMMMMMMMMMMMM,,,^^^^^^^,c,NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN\"\"\",,,,\"a~~~~~~~a,,c,,,,\",,#,,#,,aa~~~~~~~~~~~~~~~#,,,,\",,,,,,,#",
      "#ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ#~~~~~~~~~~~aa,\",\"#,a~~~~~~~a,\"##\"\"#,#\"\"#,,,#,,##,\"#,,,,,##\",\"#\"\"#,\"\",#,##,^^^^^^^,,#,,,,,,,NNNNNNNNNNNNNNNNNNNNNNNNNN~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,,,,MMMMMMMMMMMMMMMMMM,,,^^^^^^^,\"#NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN,,\",\",,a~~~~~~~a,,\"\",,,\",,,,,,,,,a~~~~~~~~~~~~~~aa,\",#\"\"\",,,,,#",
      "#ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ#~~~~~~~~~~aa###\"#,,a~~~~~~~a,##\",\",\"\",,,##,##,,,,,,##\"#,##\"\",##\",,,,#\"#,,,^^^^^^^,,,,,,,,,,NNNNNNNNNNNNNNNNNNNNNNNNNa~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,,,,MMMMMMMMMMMMMMMMMM,,,^^^^^^^,,,NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN,#,,,#,\"a~~~~~~~a,,,,,,,,,,\",,\",,#aaa~~~~~~~~~~~~a,,,,,,,,,,\"#,#",
      "#ZZZZZZZZZZZZZZZZZZZZZZZZZZZZ###a#aaaaa#aa,##\"\",#\"a~~~~~~~a,,#\"\",#\"\",,#,###\",\"#,,,#####,,,,,,##,##,#\",##,^^^^^^^,,,#,,,,N,NNNNNNNNNNNNNNNNNNNNNNNNNN~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,,MMMMMMMMMMMMMMMMMMMMM,,^^^^^^^,,,#\"NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN#,,,,,\",\"a~~~~~~~a,,,,\",,,,,\",\"\",,,,,aa~~~~~~~~~a##,,,,,,,\",,\",,#",
      "#ZZZZZZZZZZZZZZZZZZZZZZZZZZZ\",#,##\"####,#,,,,,#,,,a~~~~~~~a,,##,,#,,\",,,,#,#,#,,,,#,,#,,,\"###\"\",\"#\"###\",,^^^^^^^,,,,,,,,NNNNNNNNNNNNNNNNNNNNNNNNNNNN~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,MMMMMMMMMMMMMMMMMMMMMMM,^^^^^^^,\",,NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN,,,,,\",,,a~~~~~~~a,\",,,\"\",\",,,,\"#,\"\"\",aaaaa~aaaaa,,,,\",\",,,b,,,,#",
      "#ZZZZZZZZZZZZZZZZZZZZZZZZZZ\",#,,\"##,\"\",####\",,##,#a~~~~~~~a,,#,\"#\"\"###\",#\"\"#,,#\",#\"#,\",,,#####\"##\",#\",##,^^^^^^^,,,,,,,,NNNNNNNNNNNNNNNNNNNNNNNNNNNa~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,MMMMMMMMMMMMMMMMMMMMMMMMM^^^^^^^,,,\"NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN,,,,,\",#\",a~~~~~~~a,\"\",,,,,,,,\"\",,,#\",,,,\"\"jaa\",\",\",,,,,,,,,,,\",,#",
      "#,ZZZZZZZZZZZZZZZZZZZZZZZZZZZ,\"\",\",#,,##,#,\"#,#,,,a~~~~~~~a,,\"\"\"\",,#,\"#,\",,#,#,,\"\"#,,\",#,#\"\"#\",,##,#,,,,,^^^^^^^,,,,,##,,NNNNNNNNNNNNNNNNNNNNNNNNNNa~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,MMMMMMMMMMMMMMMMMMMMMMMMM^^^^^^^,,\"\",NNNNNNNNNNNNNNNNNNNNNNNNNNNNNN,,,#\",,,,,,a~~~~~~~a,,\"#,,,\",,,#,\"\",,,,,,,\"#\"\"\"\",,,,,\",#\",,,,,#,,,#",
      "#,ZZZZZZZZZZZZZZZZZZZZZZZ#Z,,#\",###\"\"#,,,###,\"\",\",a~~~~~~~a,,,\"\"#\",,,\"###\",\"c\"\"\",,###,\"\"#,,\",\"##\",,#\",#\",^^^^^^^,,#,,,,,,NNNNNNNNNNNNNNNNNNNNNNNNNNN~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,MMMMMMMMMMMMMMMMMMMMMMMMM^^^^^^^,,,,,\",\"NNNNNNNNNNNNNNNNNNNNNNNNNNN,\",,,,,\"#\",a~~~~~~~a^^^,^^^^^^^^^^,^^^^^^^^^,^#,^^^^^^^,^,^^,^^^,,#",
      "#,ZZ,ZZZZZZZZZZZZZZZZZZZZ,Z#,,#,#,##b##\"##,##,,\"\"\"a~~~~~~~a,\"\"#\"\"#\",,,\"#\"#,,\"##,,#\"##,##,#,###,\"#,#\"#\"##,^^^^^^^,,,,,,#,,,NNNNNNNNNNNNNNNNNNNNNNNNNN~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,\",,,,,NNNNNNNNNNNNNNNNNNNNN#,,,,,,,,,,,,,a~~~~~~~a,^^^^^^^^^^^^^^\"^^,^^,^^^^^^\"^^,^##^^^^^^^^^,,#",
      "#,\"#,,ZZZZZZZZZZZZZZZZZ\"\",##,,,#,##,,\",##,,\",#,,,\"a~~~~~~~a,#,,\",,###,\",#,,,,#\"\",#\",####,,\",#,#\"\"\"#,,\"#,,^^^^^^^,,,#,,,#,,NNNNNNNNNNNNNNNNNNNNNNNNNN~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,N,NNNNNNNNNNNNNNNNN,N\"N,,,,,\"\",,,,,,,a~~~~~~~a^^^^^^^^\",^^^,^,^^,^\",^^^,^^^^^^,^^\"\"^^,^^^^,,#",
      "#,,,,#,ZZZZZZZZZZZZZZZZZ,#,##,,\"#,,\"##,,,##,##,,,\"a~~~~~~~a,,,,#\"\"#,,,#######,,\"\"##,\"\",\",#,##\"#\"##\",##,,,^^^^^^^,,,,,,,,,#,NNNNNNNNNNNNNNNNNNNNNNN,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,NN,NNNNNNNNNNNNN,,#,,,,##,,,#,,,,,a~~~~~~~a^^^^^,^^^^,^^^,^^^,,^^^^,^^^^,^^^\",^^^^^^^^^,,#",
      "#,,,##ZZ\",ZZZZZZZZ#Z\",##,\"##,,\",#\",#,\",\",,,,##,,,\"a~~~~~~~a,\"#\",#,,,,,\"#,,\"\"##,\"\",\"###,,\"#\",\"\"#\"\"\"##\"#,\",^^^^^^^,,,,,,,,,,,NNNNNNNNNNNNNNNNNNNNN,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,F,F,,,,,,,b,,,^^^^^^^,,#,,,,,\",\"\",,,NN,NNN,,,,,N\",,#,,\",#,,,\"#,,\"\",a~~~~~~~a,^^^,^^,,^^^,^^^^^^^^^^^^\"^^^\"^^#^^^,^^,^^^^^,#",
      "#,,,,,,#,\"#Z,,Z#,,Z,#,\",#\"##,\",,#,,#,,#,,,\"###,,,\"a~~~~~~~a,\"\",##\"###\"\"#,\"#,#,,\"##\"#,,,,#\"\"#\"\"####\",#,##,^^^^^^^,,,,,,,,,,,,,,NNNNNNNNNNNNNNNN,N,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.,i,,,,,,FFFFFFFFFFFF,,,,,,^^^^^^^,\",,,,,,,,\",,,\",,,,,,,,,,,,#,,,,,,,,,#,,,\",,,,a~~~~~~~aZZZZZZZ,,ZZ,ZZZZZ\",ZZZZZZZZZZZZZZZZZZZZZ#ZZ,Z,#",
      "#,\",\"###\",,\",#,,,,,\",\"###,#,\",#\",#\",,\"##,,#,,\",#\"\"a~~~~~~~a,\"#,\"#,\",,\",,##\"\",#\"#,#\"###\"####\",\"\"#\"#,##\"#,,^^^^^^^,,,,,,,,,,,,,,#NNNNNNNNNNNNNNN,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,.........................,,^^^^^^^,,\"#,,,#\"\",,,,,\",,,,,#,\",,,c,,,,,\",\",,,,\",,,\",a~~~~~~~a#ZZ,ZZZZZZZZZZZZ,ZZZZ,\"ZZZZZ,,Z,Z,ZZZZ\"ZZZZZ,,#",
      "#,\"\",,#,\"##,,\",##,,,,#\"\"##,##\",\"#\"####,,,,\"#,#\",#,a~~~~~~~a,#\",#,,#,,#,##,\"\",\"\"#,,##,\"##,\",,,,,\"\"##,##,\",^^^^^^^,,,,,#,,,#,,,,,,,NNNNNNNNNN##N#,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,FFFFFFFFLFFFFFFFFF,,,^^^^^^^,,\",,,,,,,,,,\"#,,\",,\",,,,,\",,\"\",\",,,,\",,,,,,,,a~~~~~~~aZZZZZZ,ZZ,Z,,Z,,Z,\"\"ZZZZZZZZZZZZZZZZZZZ\"ZZZZ,,#",
      "#,,\"#,,#,\"##\",\",\"#,,,,##,#,,#,#,\"#,#,##,,,,\"\"#,#\",a~~~~~~~a,#\"\"##,#\"##\"##,,\"##,\",#\",,#\",#\",,,,#\"#\",#,,\"\",^^^^^^^,,j,,,,,,,,,,,,,,,,NNNN,,,,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,FFFFFFFFFFFFFFFF,,,,^^^^^^^,,,,,,,\",\"\",,,,#,,,,,\",\",,,,,,,,,#j,,\",\"\",,,,,a~~~~~~~a,ZZZZZ\",ZZZ,ZZZ,ZZZZ,,ZZ,ZZ,\"ZZZZZZ,,ZZZZZZZZ,#",
      "#,###\",#\"\",#c#,,,\",#,#,,,\"##,\"##\",\",#\"#,#\"\"#,#,\"#,a~~~~~~~a,,\"#\",,#,,\",,#\",,##\",\"\",###\",,\"###,#\",\"#,\"###,^^^^^^^,,,,,,,,,,,,,,,,,,#,b,,,,,,#,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,FFFFFFFFFFFF,,,,,,,^^^^^^^,\"#,\"#,,,,#,,,,,,,,,,,,##b,,,\"#\",\",\",,,,,\"\",\",a~~~~~~~aZZ,Z,Z\"ZZZZZZZZZ,ZZZZj,ZZZ,,ZZZZZ,ZZ,ZZZZZZ,Z,#",
      "#,#####,#,,#,#,,#,,#,,\",#,##,#\"\",,\"#,##,,#\",,\"###,a~~~~~~~a,\"\",,\",\"#\"####,#,,,,\"###,#\",,\",##\"\"\"\"#,\"###,,,^^^^^^^,,,,,,,,#,#,,,#,,,,#,,,,,#,,,,,,,,,a~~~~~~~~~~a~~~~~~~a,,,,,,,,,,,,,,,,,,,,c,,,,,,,,,,,,F,F,,,,,,,,,,^^^^^^^,\",,,,,,,,,,\",,#,,,\",,,,,,,,,,,\",#\"#,\",,\",,,,,a~~~~~~~aZZ,,ZZZ,\"ZZZZZZZZZZ,ZZZZZZ#\"ZZZ,ZZZZZZZZ,ZZZ,,#",
      "#,#\",\"#,,,,\"\"\"#,,\"\"\",,\"#,,#\"\"#,,,\",,,##,#\"#\",\",,,,a~~~~~~~a,#,#\",\",,#,\"##,#,#,#,##,##\"#,,\"#,,\"\"\"\"\"#\"\",##,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,aaaaaaaaaaaa~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,\",,,,\",\"\",\",\",,,,#,,,,\"\"\"\"\"\",\",,,,,,##\",#,,,\"a~~~~~~~aZZ,ZZZZZ,Z\"ZZ,ZZZ,ZZZZZZZZZZZZZZZZZZ#Z,,Z,ZZ,,#",
      "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^^^^^^^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,a~~~~~~~a,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
      "##################################################################################################################################################################################################################################################################################################################################"
    ],
    /* Las franjas del río y de la cordillera van primero: advZonaDe() se queda
       con la primera zona que coincide. */
    zonas:[
      {n:'Puente del Río Grande',     x0:49,  y0:1,   x1:59,  y1:118},
      {n:'Cuesta de Zenta',           x0:103, y0:1,   x1:113, y1:118},
      {n:'Río Grande de la Quebrada', x0:157, y0:1,   x1:167, y1:118},
      {n:'Cuesta de Azul Pampa',      x0:211, y0:1,   x1:221, y1:118},
      {n:'Puente del Río Yavi',       x0:265, y0:1,   x1:275, y1:118},
      {n:'Valles · Plaza Belgrano',   x0:1,   y0:1,   x1:50,  y1:12},
      {n:'Valles · San Salvador',     x0:1,   y0:13,  x1:30,  y1:44},
      {n:'Valles · Parque San Martín', x0:31,  y0:13,  x1:50,  y1:44},
      {n:'Valles · Embalse Las Maderas', x0:31,  y0:45,  x1:50,  y1:58},
      {n:'Valles · Dique La Ciénaga y El Carmen', x0:1,   y0:45,  x1:30,  y1:66},
      {n:'Valles · Bañado del Río Grande', x0:31,  y0:59,  x1:50,  y1:68},
      {n:'Valles · Cordón del Chañi', x0:1,   y0:67,  x1:30,  y1:118},
      {n:'Valles · Dique Los Alisos', x0:31,  y0:90,  x1:50,  y1:118},
      {n:'Valles · Cerro Colorado',   x0:31,  y0:69,  x1:50,  y1:118},
      {n:'Yungas · Libertador General San Martín', x0:58,  y0:1,   x1:88,  y1:31},
      {n:'Yungas · Selva de Calilegua', x0:84,  y0:1,   x1:104, y1:41},
      {n:'Yungas · Cañaverales de Ledesma', x0:58,  y0:32,  x1:83,  y1:50},
      {n:'Yungas · Usina del Ingenio', x0:84,  y0:42,  x1:104, y1:58},
      {n:'Yungas · Lagunas de Yala',  x0:58,  y0:51,  x1:83,  y1:90},
      {n:'Yungas · Bañados',          x0:84,  y0:59,  x1:104, y1:118},
      {n:'Yungas · Selva nublada',    x0:58,  y0:91,  x1:83,  y1:118},
      {n:'Quebrada · Río Grande',     x0:146, y0:1,   x1:158, y1:118},
      {n:'Quebrada · Tilcara',        x0:112, y0:1,   x1:145, y1:30},
      {n:'Quebrada · Vega de Maimará', x0:112, y0:31,  x1:129, y1:55},
      {n:'Quebrada · Parque Solar',   x0:130, y0:31,  x1:145, y1:52},
      {n:'Quebrada · Purmamarca y los Siete Colores', x0:112, y0:53,  x1:145, y1:74},
      {n:'Quebrada · Paseo de los Colorados', x0:112, y0:75,  x1:145, y1:90},
      {n:'Quebrada · Salinas Grandes', x0:112, y0:91,  x1:145, y1:118},
      {n:'Alta Quebrada · Humahuaca', x0:166, y0:1,   x1:194, y1:30},
      {n:'Alta Quebrada · Río Grande de Humahuaca', x0:195, y0:1,   x1:201, y1:90},
      {n:'Alta Quebrada · Ruinas de Coctaca', x0:166, y0:38,  x1:194, y1:54},
      {n:'Alta Quebrada · Valle de Cardones', x0:166, y0:31,  x1:194, y1:37},
      {n:'Alta Quebrada · Cardonal',  x0:166, y0:55,  x1:194, y1:80},
      {n:'Alta Quebrada · Iruya',     x0:202, y0:1,   x1:212, y1:75},
      {n:'Alta Quebrada · Serranía del Hornocal', x0:166, y0:81,  x1:212, y1:118},
      {n:'Puna · Abra Pampa',         x0:220, y0:1,   x1:266, y1:37},
      {n:'Puna · Parque Solar Cauchari', x0:244, y0:38,  x1:266, y1:41},
      {n:'Puna · Pucará',             x0:220, y0:38,  x1:237, y1:48},
      {n:'Puna · Laguna de los Pozuelos', x0:220, y0:49,  x1:247, y1:66},
      {n:'Puna · Vegas',              x0:248, y0:42,  x1:266, y1:65},
      {n:'Puna · Sierra de la Puna',  x0:220, y0:67,  x1:266, y1:84},
      {n:'Puna · Salar de Cauchari',  x0:220, y0:85,  x1:266, y1:118},
      {n:'Puna norte · La Quiaca',    x0:274, y0:1,   x1:320, y1:41},
      {n:'Puna norte · Yavi',         x0:274, y0:42,  x1:291, y1:62},
      {n:'Puna norte · Vegas',        x0:292, y0:42,  x1:320, y1:58},
      {n:'Puna norte · Cerro Colorado', x0:274, y0:59,  x1:320, y1:90},
      {n:'Puna norte · Laguna de altura', x0:274, y0:91,  x1:320, y1:118}
    ],
    carteles:{
      '49,44': 'El puente cruza el Río Grande hacia las YUNGAS. Es el único paso: el río no se cruza a nado.',
      '59,44': 'Bienvenido a las YUNGAS. San Salvador queda al oeste, cruzando el puente.',
      '103,44': 'La cuesta lleva a la QUEBRADA. Es el único paso por la cordillera.',
      '113,44': 'Bienvenido a la QUEBRADA. Las Yungas quedan al oeste, cruzando la cuesta.',
      '157,44': 'El puente cruza el Río Grande hacia la ALTA QUEBRADA. Es el único paso.',
      '167,44': 'Bienvenido a la ALTA QUEBRADA, camino a Humahuaca. Purmamarca queda al oeste.',
      '211,44': 'La cuesta de Azul Pampa lleva a la PUNA. Es el único paso por la cordillera.',
      '221,44': 'Bienvenido a la PUNA. Aquí el aire es fino y el cielo muy azul. Humahuaca queda al oeste.',
      '265,44': 'El puente cruza a la PUNA NORTE, hacia La Quiaca. Es el único paso.',
      '275,44': 'Bienvenido a la PUNA NORTE: La Quiaca y Yavi. Abra Pampa queda al oeste.',
      '29,29': 'La Casa de Gobierno de Jujuy: un palacio de estilo francés frente a la Plaza Belgrano, con su fuente al frente.',
      '30,5': 'Catedral Basílica de Jujuy, junto a la Plaza Belgrano. Guarda un púlpito colonial de madera dorada.',
      '41,5': 'El Cabildo de Jujuy, sobre la Plaza Belgrano: el viejo edificio colonial de la ciudad.',
      '27,9': 'Plaza Belgrano: en el centro, el monumento ecuestre al General Belgrano, entre cedros y palmeras.',
      '21,12': 'Centro Pokémon de la Plaza Belgrano ➜ ahí venden pokébolas.',
      '22,8': 'Parque San Martín: el gran pulmón verde de San Salvador de Jujuy.',
      '36,31': 'Río Xibi Xibi y su Paseo Lineal: el lugar favorito de los jujeños para caminar.',
      '44,12': 'Río Grande: rodea la capital por el norte y el este. Acá empiezan las Yungas.',
      '23,46': 'Dique La Ciénaga, en El Carmen: el más antiguo de Jujuy. Riega, frena las crecidas y da luz con su usina. Al fondo, la torre de toma de piedra.',
      '19,51': 'La pasarela blanca lleva a la torre de toma: desde ahí se abren las compuertas.',
      '24,49': 'Embalse Las Maderas: se conecta con La Ciénaga por canales y riega el Valle de los Pericos.',
      '40,53': 'Ruta 62: bordea el embalse Las Maderas, con el Club de Pesca y Náutica Inti Sumaj.',
      '7,65': 'El Carmen, a unos 30 km de San Salvador: el pueblo de los diques.',
      '74,7': 'Ingenio Ledesma: el azúcar de Libertador General San Martín, corazón de las Yungas.',
      '83,13': 'Parque Nacional Calilegua: selva de yungas con tucanes, tapires y yaguaretés.',
      '136,56': 'Iglesia de Santa Rosa de Lima, Purmamarca (1648), frente a la plaza. Al fondo, el Cerro de los Siete Colores.',
      '133,56': 'Cabildo de Purmamarca, sobre la plaza 9 de Julio. Alrededor, el mercado de artesanías.',
      '137,52': 'El Algarrobo Histórico de Purmamarca: un gigante de tronco retorcido que vio pasar la historia del pueblo. Lo cuida una reja de hierro forjado.',
      '121,9': 'Tilcara: pueblo de la Quebrada de Humahuaca, Patrimonio de la Humanidad.',
      '118,17': 'Pucará de Tilcara: ciudadela preincaica de piedra sobre la Quebrada.',
      '131,63': 'Cerro de los Siete Colores, Purmamarca. Las franjas son millones de años de historia.',
      '123,48': 'La Paleta del Pintor, Maimará: la montaña pintada de mil colores.',
      '76,12': 'Libertador General San Martín: la ciudad del azúcar, a la sombra del Ingenio Ledesma.',
      '63,41': 'Cañaverales de Ledesma: acá nace el azúcar jujeño.',
      '88,15': 'Parque Nacional Calilegua: selva de yungas con tucanes, tapires y yaguaretés.',
      '70,56': 'Lagunas de Yala: lagos de montaña en plena Yunga, a 40 minutos de la capital.',
      '80,76': 'Yala: ahí empieza la selva nublada, donde el aire se llena de neblina.',
      '238,11': 'Abra Pampa: la ciudad más alta de Jujuy, entre llamas y vicuñas.',
      '255,33': 'Parque Solar Cauchari: uno de los más grandes de Sudamérica, a 4.000 m.',
      '231,49': 'Laguna de los Pozuelos: reserva de flamencos rosados en plena Puna.',
      '247,90': 'Salar de Cauchari: una costra blanca de sal que brilla bajo el sol de la Puna.',
      '305,15': 'La Quiaca: el último pueblo de Argentina, frente a Villazón (Bolivia).',
      '313,12': 'Puente Internacional: del otro lado empieza Bolivia (Villazón).',
      '282,49': 'Yavi: pueblito colonial de adobe a los pies de la sierra, con su iglesia de pan de oro.',
      '296,94': 'Laguna de altura: acá viven los flamencos y las vicuñas de la Puna.',
      '44,96': 'Dique Los Alisos: de ahí sale el agua que toma San Salvador de Jujuy.',
      '126,12': 'Tilcara: pueblo de la Quebrada de Humahuaca, Patrimonio de la Humanidad.',
      '118,19': 'Pucará de Tilcara: ciudadela preincaica de piedra sobre la Quebrada.',
      '114,48': 'Maimará: el pueblo de la Paleta del Pintor, con su cementerio colgado de la loma.',
      '136,93': 'Salinas Grandes: un mar blanco de sal a más de 3.400 m de altura.',
      '179,9': 'Cabildo de Humahuaca: a las 12 sale San Francisco Solano a bendecir el pueblo.',
      '187,15': 'Iglesia de Nuestra Señora de la Candelaria, patrona de Humahuaca (siglo XVII).',
      '191,9': 'Monumento a la Independencia, Humahuaca: sube la escalinata y mirá todo el valle.',
      '176,25': 'Humahuaca, en la Quebrada Patrimonio de la Humanidad: pueblo de calles angostas y mucha historia.',
      '188,46': 'Coctaca: gigantescos andenes de cultivo preincaicos cerca de Humahuaca.',
      '204,58': 'Iruya: pueblo de calles empedradas colgado de la montaña, al final de un camino de cornisa.',
      '202,89': 'Serranía del Hornocal: los 14 colores, a más de 4.300 m de altura. Vista desde el mirador.',
      '188,111': 'Mirador del Hornocal: la montaña pintada se ve mejor al atardecer.',
      '31,44': 'Estación San Salvador del Tren Solar: el tren eléctrico alimentado con paneles solares va de oeste a este por todas las regiones.',
      '85,44': 'Estación Volcán del Tren Solar: el tren eléctrico alimentado con paneles solares va de oeste a este por todas las regiones.',
      '135,44': 'Estación Purmamarca del Tren Solar: el tren eléctrico alimentado con paneles solares va de oeste a este por todas las regiones.',
      '189,44': 'Estación Humahuaca del Tren Solar: el tren eléctrico alimentado con paneles solares va de oeste a este por todas las regiones.',
      '245,44': 'Estación Abra Pampa del Tren Solar: el tren eléctrico alimentado con paneles solares va de oeste a este por todas las regiones.',
      '299,44': 'Estación La Quiaca del Tren Solar: el tren eléctrico alimentado con paneles solares va de oeste a este por todas las regiones.'
    },
    /* Cada altar tiene SUS legendarios: no salen todos del mismo lugar. */
    santuarios:{
      '28,47': {n:'Usina del Dique', pokes:['Zapdos']},
      '179,46': {n:'Ruinas de Coctaca', pokes:['Uxie','Mesprit','Azelf']},
      '43,76': {n:'Cerro Colorado', pokes:['Moltres']},
      '200,113': {n:'Serranía del Hornocal', pokes:['Heatran']},
      '76,28': {n:'Altos Hornos de Zapla', pokes:['Entei','Ho-Oh']},
      '114,14': {n:'Pucará de Tilcara', pokes:['Latios','Latias','Rayquaza']},
      '254,71': {n:'Volcán de la Puna', pokes:['Reshiram','Zekrom','Kyurem']},
      '310,68': {n:'Cerro Colorado de La Quiaca', pokes:['Zygarde','Diancie','Volcanion']},
      '281,46': {n:'Iglesia y ruinas de Yavi', pokes:['Hoopa']},
      '99,53': {n:'Usina del Ingenio', pokes:['Raikou']},
      '127,77': {n:'Cerro de los Siete Colores', pokes:['Groudon']},
      '254,27': {n:'Parque Solar Cauchari', pokes:['Tornadus','Thundurus','Landorus']},
      '225,39': {n:'Pucará de Rinconada', pokes:['Victini']},
      '184,73': {n:'Nevado de Aguilar', pokes:['Cresselia']},
      '17,71': {n:'Cumbre Nevada del Chañi', pokes:['Articuno']},
      '191,8': {n:'Humahuaca', pokes:['Shaymin']},
      '15,18': {n:'San Salvador', pokes:['Mew']},
      '281,9': {n:'La Quiaca', pokes:['Xerneas']},
      '235,11': {n:'Abra Pampa', pokes:['Meloetta']},
      '240,98': {n:'Salar de Cauchari', pokes:['Cobalion','Terrakion','Virizion']},
      '74,57': {n:'Lagunas de Yala', pokes:['Lugia','Suicune']},
      '144,22': {n:'Costa del Río Grande', pokes:['Kyogre']},
      '222,65': {n:'Laguna de los Pozuelos', pokes:['Keldeo']},
      '168,26': {n:'Humahuaca', pokes:['Manaphy']}
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

/* ---------- Mapa sin espacios muertos ----------
   Zeta 27/10: "que no queden lugares sin poder entrar". Después de armar los mapas se revisa que TODO casillero
   caminable se pueda alcanzar desde el punto de partida. Si quedó algún bolsón aislado (un claro rodeado de árboles,
   una isla, un tramo de puente suelto) se abre el paso más corto: claro en el bosque, puente en el agua, paso en la
   montaña. Es determinístico (todos los celulares arman el mismo mapa) y se vuelve a verificar solo si el mapa cambia. */
const REPARA_COSTO = {'#': 1, 'n': 3, 'g': 3, 's': 3, '~': 3, '^': 3, 'Z': 3, 'V': 6, 'M': 4, 'x': 4, 'S': 3};
const REPARA_CAMBIO = {'#': ',', 'n': ',', 'g': ',', 's': ',', '~': 'B', '^': '.', 'Z': 'N', 'V': 'F', 'M': '.', 'x': '.', 'S': 'o'};
function repararMapa(mapa, inicioCh){
  const W = mapa.cols, H = mapa.rows.length;
  const g = mapa.rows.map(r => r.split(''));
  const camina = ch => !!(ADV_TILE[ch] && ADV_TILE[ch].walk);
  let ini = null;
  for(let y = 0; y < H && !ini; y++) for(let x = 0; x < W; x++) if(g[y][x] === inicioCh){ ini = [x, y]; break; }
  if(!ini) return {abiertos: 0, bolsones: 0};
  const alcanzables = () => {
    const vis = new Uint8Array(W * H), pila = [ini[1] * W + ini[0]]; vis[pila[0]] = 1;
    while(pila.length){
      const i = pila.pop(), x = i % W, y = (i / W) | 0;
      for(const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
        const nx = x + dx, ny = y + dy;
        if(nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if(!vis[j] && camina(g[ny][nx])){ vis[j] = 1; pila.push(j); }
      }
    }
    return vis;
  };
  let vis = alcanzables(), abiertos = 0, bolsones = 0;
  for(let guardia = 0; guardia < 600; guardia++){
    // primer casillero caminable que no se alcanza
    let obj = -1;
    for(let y = 0; y < H && obj < 0; y++) for(let x = 0; x < W; x++) if(camina(g[y][x]) && !vis[y * W + x]){ obj = y * W + x; break; }
    if(obj < 0) break;
    bolsones++;
    // todo el bolsón (se avanza desde él hacia afuera)
    const bols = [obj], marca = new Uint8Array(W * H); marca[obj] = 1;
    for(let k = 0; k < bols.length; k++){
      const x = bols[k] % W, y = (bols[k] / W) | 0;
      for(const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
        const nx = x + dx, ny = y + dy;
        if(nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if(!marca[j] && camina(g[ny][nx]) && !vis[j]){ marca[j] = 1; bols.push(j); }
      }
    }
    // camino más barato (Dijkstra) desde el bolsón hasta cualquier casillero alcanzable
    const dist = new Float32Array(W * H).fill(1e9), prev = new Int32Array(W * H).fill(-1);
    let cola = bols.map(i => { dist[i] = 0; return i; }), meta = -1;
    const sacar = () => { let b = 0; for(let i = 1; i < cola.length; i++) if(dist[cola[i]] < dist[cola[b]]) b = i; const r = cola[b]; cola[b] = cola[cola.length - 1]; cola.pop(); return r; };
    while(cola.length){
      const i = sacar(), x = i % W, y = (i / W) | 0;
      if(vis[i] && !marca[i]){ meta = i; break; }
      for(const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
        const nx = x + dx, ny = y + dy;
        if(nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;   // el borde del mapa no se toca
        const j = ny * W + nx, ch = g[ny][nx];
        const c = camina(ch) ? 0 : (REPARA_COSTO[ch] !== undefined ? REPARA_COSTO[ch] : 60);
        if(dist[i] + c + .01 < dist[j]){ dist[j] = dist[i] + c + .01; prev[j] = i; if(!cola.includes(j)) cola.push(j); }
      }
    }
    if(meta < 0){ for(const i of bols) vis[i] = 1; continue; }   // no hay forma razonable de unirlo: se deja
    for(let i = meta; i >= 0 && !marca[i]; i = prev[i]){
      const x = i % W, y = (i / W) | 0, ch = g[y][x];
      if(!camina(ch)){ g[y][x] = REPARA_CAMBIO[ch] || '.'; abiertos++; }
    }
    vis = alcanzables();
  }
  mapa.rows = g.map(r => r.join(''));
  return {abiertos, bolsones};
}
const MAPA_REPARO = {overworld: repararMapa(ADV_MAPS.overworld, '@'), cueva: repararMapa(ADV_MAPS.cueva, 'E')};


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
const ADV_PROB = { hierba:.14, agua:.12, volcan:.16, cueva:.14, hielo:.16,
                   electrico:.16, psiquico:.16, cienaga:.16, legendario:.12 };   // 28/10: Zeta pidió que los salvajes salgan el DOBLE de seguido (antes .07 .06 .08 .07 .08 .08 .08 .08); el legendario no se tocó
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
    fin:    '2026-10-24T21:00:00-03:00',
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
const LEG_TAM = 39;   // lado mayor del sprite en píxeles de mundo (el tile mide 16)

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

function spriteLegendario(p){ return spriteDe(p, LEG_TAM, LEG_SPRITE_CACHE); }
function spriteDe(p, lado, cache){
  let entry = cache[p.name];
  if(entry) return entry.canvas;
  entry = {canvas: null};
  cache[p.name] = entry;
  const img = new Image();
  /* jsdelivr manda Access-Control-Allow-Origin:*, así que pedir la imagen
     como anónima no la tapa y deja el canvas SIN "tainted": hace falta para
     leer los píxeles (recorte, paleta y contorno). */
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try{ entry.canvas = pixelarImagen(img, lado); }
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
  sombraSuave(ctx, cx, oy + 14.5, 13 - (flota > 0 ? 0 : 1.5), 3.6, .38);
  /* el legendario es un sprite animado en el DOM (sincronizarSprites), anclado por los pies sobre el altar */
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

/* ---------- Pokémon salvajes a la vista ----------
   Cuando "salta" un encuentro ya no se abre la pelea de golpe: aparecen 2 o 3 Pokémon parados
   en el pasto, cerca, y cada entrenador camina hasta el que quiere atrapar. Si no se acerca a
   ninguno, se van solos. Los sortea el servidor (o el juego, sin servidor); la elección es de cada uno. */
const SALVAJE_TAM = 14;          // lado mayor del sprite en píxeles de mundo (el tile mide 16)
const SALVAJE_VIVE_MS = 25000;
const SALVAJE_SPRITE_CACHE = {};
let salvajes = [];               // {p, mapa, x, y (casillero), hasta}

function salvajesActivos(){
  const ahora = Date.now();
  return salvajes.filter(sv => sv.mapa === advMapa && ahora < sv.hasta);
}

function aparecerSalvajes(pokes, cx, cy){
  pokes = (pokes || []).filter(Boolean);
  if(!pokes.length) return;
  const bioma = (advTileEn(cx, cy) || {}).encuentro;
  const sitios = [];
  for(let dy = -5; dy <= 5; dy++) for(let dx = -3; dx <= 3; dx++){
    if(Math.max(Math.abs(dx), Math.abs(dy)) < 2) continue;      // ni arriba tuyo
    const t = advTileEn(cx + dx, cy + dy);
    if(t && t.walk && !t.item && !t.entra && !t.cartel && t.encuentro && t.encuentro === bioma) sitios.push({x: cx + dx, y: cy + dy});
  }
  for(let i = sitios.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [sitios[i], sitios[j]] = [sitios[j], sitios[i]]; }
  const elegidos = [];
  for(const st of sitios){
    if(elegidos.length >= pokes.length) break;
    if(elegidos.every(e => Math.max(Math.abs(e.x - st.x), Math.abs(e.y - st.y)) >= 2)) elegidos.push(st);
  }
  if(!elegidos.length){ iniciarEncuentro(pokes[0]); return; }   // no hay lugar para verlos: pelea directa, como antes
  const hasta = Date.now() + SALVAJE_VIVE_MS;
  salvajes = elegidos.map((st, i) => ({p: pokes[i], mapa: advMapa, x: st.x, y: st.y, hasta}));
  salvajes.forEach(sv => spriteDe(sv.p, SALVAJE_TAM, SALVAJE_SPRITE_CACHE));   // que ya estén cargando
  const nombres = salvajes.map(sv => `<b>${sv.p.name}</b>`);
  const lista = nombres.length > 1 ? nombres.slice(0, -1).join(', ') + ' y ' + nombres[nombres.length - 1] : nombres[0];
  advMensaje(`👀 ¡Aparecieron ${lista}! Acercate al que quieras atrapar`);
}

function salvajeTocado(){
  const px = advPx + 8, py = advPy + 11;
  return salvajesActivos().find(sv => Math.hypot(sv.x * ADV_PX + 8 - px, sv.y * ADV_PX + 8 - py) < 13) || null;
}

function elegirSalvaje(sv){
  salvajes = [];
  advDescanso = DESCANSO_ENCUENTRO;
  if(MODO_SERVIDOR) return elegirSalvajeServidor(sv.p);
  iniciarEncuentro(sv.p);
}

/* Se llama en cada cuadro: si ninguno se eligió a tiempo, se van. */
function salvajesVencer(){
  if(!salvajes.length) return;
  const ahora = Date.now();
  if(salvajes.some(sv => ahora < sv.hasta)) return;
  const eraAca = salvajes.some(sv => sv.mapa === advMapa);
  salvajes = [];
  advDescanso = DESCANSO_ENCUENTRO;
  if(eraAca) advMensaje('💨 Los Pokémon se escaparon antes de que llegaras.');
}

function dibujarSalvaje(ctx, sv, ox, oy){
  ox = Math.round(ox); oy = Math.round(oy);
  const t = Date.now() / 1000;
  const flota = Math.round(Math.sin(t * 3 + sv.x) * 1);
  const cx = ox + 8;
  sombraSuave(ctx, cx, oy + 14, 8.5, 2.8, .34);
  /* el Pokémon en sí es un sprite animado en el DOM (sincronizarSprites); acá queda la sombra suave */
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
    pinta(ctx, 'rgba(0,25,60,.30)', ox, oy + 1, 16, 15);                       // sombra sobre el agua
    pinta(ctx, '#8A5F35', ox, oy, 16, 15);
    for(let i = 0; i < 4; i++){ pinta(ctx, '#6B4522', ox, oy + i * 4 + 3, 16, 1); pinta(ctx, '#9C7044', ox, oy + i * 4, 16, 1); }   // tablones
    for(let k = 0; k < 4; k++) pinta(ctx, ruido(x, y, 300 + k) > .5 ? '#7A5230' : '#946A3D', ox + Math.floor(ruido(x, y, 310 + k) * 14), oy + k * 4 + 1, 2, 2);   // vetas
    pinta(ctx, '#5A3A1C', ox, oy + 14, 16, 2);
    pinta(ctx, '#C89B63', ox, oy, 16, 1);
    for(let px = 1; px < 16; px += 5){ pinta(ctx, '#4A2F16', ox + px, oy, 2, 15); pinta(ctx, '#B88A55', ox + px, oy, 1, 15); }    // vigas / postes de baranda
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


/* ---------- Jujuy: cada región del mapa tiene su clima (colores y detalles propios) ----------
   Las 6 franjas del mundo siguen siendo las 6 regiones del juego (qué Pokémon salen, altares, reglas del
   servidor): acá sólo cambia cómo se ven. Valles = San Salvador (verde, como siempre), Yungas = selva,
   Quebrada = Tilcara/Purmamarca, Alta Quebrada = Humahuaca/Hornocal, Puna = Abra Pampa/Salinas/La Quiaca.
   Las cuevas (otro mapa) no cambian. Los pintores originales se conservan en PINTORES_BASE. */
const CLIMA_DE_REGION = {kanto:'valles', johto:'yungas', hoenn:'quebrada', sinnoh:'altaquebrada', unova:'puna', kalos:'puna'};
function climaDe(x){ return advMapa === 'overworld' ? (CLIMA_DE_REGION[regionDe(x)] || 'valles') : 'valles'; }
const PINTORES_BASE = Object.assign({}, PINTORES);

/* Oscurece (f<0) o aclara (f>0) un color '#RRGGBB'. */
function tono(hex, f){
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

const SECO = {
  yungas:       {pasto:['#2F7F2A', '#378A30', '#409637'], trazo:['#276B24', '#4BAA45']},
  quebrada:     {pasto:['#A89451', '#B5A05A', '#C2AE67'], trazo:['#8F7C3F', '#D3C07A']},
  altaquebrada: {pasto:['#B09556', '#BDA261', '#CAAF6E'], trazo:['#957B40', '#DCC580']},
  puna:         {pasto:['#BFA766', '#CBB473', '#D6C181'], trazo:['#A38B4D', '#E6D596']}
};
PINTORES.pasto = (ctx, ox, oy, x, y) => {
  const c = SECO[climaDe(x)];
  if(!c) return PINTORES_BASE.pasto(ctx, ox, oy, x, y);
  textura3(ctx, ox, oy, x, y, 1, c.pasto[0], c.pasto[1], c.pasto[2]);
  for(let i = 0; i < 7; i++){
    const rx = ox + Math.floor(ruido(x, y, i) * 15), ry = oy + Math.floor(ruido(x, y, i + 40) * 15);
    pinta(ctx, c.trazo[i % 2], rx, ry, 2, 1);
  }
  if(ruido(x, y, 33) > .84){                       // matita seca
    const mx = ox + 4 + Math.floor(ruido(x, y, 34) * 8), my = oy + 5 + Math.floor(ruido(x, y, 35) * 7);
    pinta(ctx, c.trazo[0], mx, my, 3, 1); pinta(ctx, c.trazo[1], mx + 1, my - 1, 1, 1);
  }
  if(ruido(x, y, 36) > .92){                       // piedrita
    const px = ox + 3 + Math.floor(ruido(x, y, 37) * 9), py = oy + 4 + Math.floor(ruido(x, y, 38) * 8);
    pinta(ctx, '#8D8576', px, py, 2, 2); pinta(ctx, '#B7AE9C', px, py, 1, 1);
  }
};

/* Hierba alta: misma forma que la original (con borde dentado), distinto color según la región. */
const HIERBA_PAL = {
  yungas:       {fondo:'#1F6A28', hoja:['#2E8A35', '#4BB04A'], borde:'#2A7C30', sombra:'#154B1C'},
  quebrada:     {fondo:'#6E7438', hoja:['#8E9648', '#B2B965'], borde:'#8A9146', sombra:'#4E5326'},
  altaquebrada: {fondo:'#7A7339', hoja:['#9C9347', '#C2B864'], borde:'#948B43', sombra:'#555022'},
  puna:         {fondo:'#9A8230', hoja:['#BC9F3F', '#E2C961'], borde:'#B39638', sombra:'#6D5A1E'}
};
PINTORES.hierba = (ctx, ox, oy, x, y) => {
  const p = HIERBA_PAL[climaDe(x)];
  if(!p) return PINTORES_BASE.hierba(ctx, ox, oy, x, y);
  PINTORES.pasto(ctx, ox, oy, x, y);
  pinta(ctx, p.fondo, ox, oy, 16, 16);
  for(let i = 0; i < 14; i++){
    const rx = ox + Math.floor(ruido(x, y, i) * 15), alto = 3 + Math.floor(ruido(x, y, i + 11) * 4);
    const ry = oy + 4 + Math.floor(ruido(x, y, i + 55) * 10);
    pinta(ctx, p.hoja[i % 3 ? 0 : 1], rx, ry - alto, 1, alto);
  }
  const esHierba = (cx, cy) => charEn(cx, cy) === '"';
  if(!esHierba(x, y - 1)){
    for(let i = 0; i < 16; i++){
      const h = 1 + Math.floor(ruido(x * 16 + i, y, 71) * 3);
      pinta(ctx, p.borde, ox + i, oy, 1, h); pinta(ctx, p.sombra, ox + i, oy + h, 1, 1);
    }
  }
  if(!esHierba(x, y + 1)) pinta(ctx, p.sombra, ox, oy + 15, 16, 1);
  if(!esHierba(x - 1, y)) for(let i = 0; i < 16; i++) if(ruido(x, y * 16 + i, 72) > .5) pinta(ctx, p.borde, ox, oy + i, 1, 1);
  if(!esHierba(x + 1, y)) for(let i = 0; i < 16; i++) if(ruido(x, y * 16 + i, 73) > .5) pinta(ctx, p.borde, ox + 15, oy + i, 1, 1);
};

/* Árbol: en el Valle, el de siempre (con lapachos rosados); en las Yungas, selva cerrada; de la Quebrada
   para arriba, el cardón. */
function copaArbol(ctx, ox, oy, x, y, hoja, claro, oscuro){
  const jitter = i => Math.floor(ruido(x, y, 110 + i) * 3) - 1;
  pinta(ctx, 'rgba(0,0,0,.25)', ox + 2, oy + 13, 12, 2);
  const tx = 7 + jitter(20);
  pinta(ctx, '#5A3E22', ox + tx, oy + 10, 3, 5); pinta(ctx, '#3F2B16', ox + tx + 2, oy + 10, 1, 5);
  const base = [8, 12, 14, 15, 16, 16, 15, 13, 8];
  const forma = base.map((w, i) => Math.max(5, Math.min(16, w + jitter(i))));
  silueta(ctx, ox, oy, forma.map(w => Math.min(16, w + 2)), oscuro, 0);
  silueta(ctx, ox, oy, forma, hoja, 1);
  const hx = 3 + jitter(21), hy = 2 + jitter(22);
  pinta(ctx, claro, ox + hx, oy + hy + 1, 5, 2); pinta(ctx, claro, ox + hx + 6, oy + hy + 4, 4, 2);
  pinta(ctx, oscuro, ox + 5, oy + 8, 6, 2);
}
function cardon(ctx, ox, oy, x, y){
  const j = i => Math.floor(ruido(x, y, 130 + i) * 3) - 1;
  pinta(ctx, 'rgba(0,0,0,.22)', ox + 3, oy + 13, 10, 2);
  const tx = 7 + j(0), cima = 1 + Math.floor(ruido(x, y, 131) * 3);
  const verde = '#5E8A4E', luz = '#82B06C', sombra = '#3F6636';
  pinta(ctx, verde, tx, oy + cima, 3, 14 - cima); pinta(ctx, luz, tx, oy + cima, 1, 14 - cima); pinta(ctx, sombra, tx + 2, oy + cima, 1, 14 - cima);
  pinta(ctx, luz, tx, oy + cima - 1, 2, 1);
  if(ruido(x, y, 132) > .25){                       // brazo izquierdo
    const by = oy + 6 + Math.floor(ruido(x, y, 133) * 3);
    pinta(ctx, verde, tx - 4, by, 5, 2); pinta(ctx, verde, tx - 4, by - 4, 2, 5); pinta(ctx, luz, tx - 4, by - 4, 1, 5);
  }
  if(ruido(x, y, 134) > .4){                        // brazo derecho
    const by = oy + 8 + Math.floor(ruido(x, y, 135) * 3);
    pinta(ctx, verde, tx + 2, by, 5, 2); pinta(ctx, verde, tx + 5, by - 4, 2, 5); pinta(ctx, sombra, tx + 6, by - 4, 1, 5);
  }
  for(let i = 0; i < 5; i++) pinta(ctx, '#EFE7C6', tx + (i % 3), oy + cima + 2 + i * 2, 1, 1);   // espinas
}
PINTORES.arbol = (ctx, ox, oy, x, y) => {
  const c = climaDe(x);
  if(c === 'valles') return PINTORES_BASE.arbol(ctx, ox, oy, x, y);
  PINTORES.pasto(ctx, ox, oy, x, y);
  if(c === 'yungas'){
    const flor = ruido(x, y, 91) > .85;
    copaArbol(ctx, ox, oy, x, y, flor ? '#2C7A3A' : '#1F6B2B', flor ? '#4FA85A' : '#36923D', '#0F4018');
    if(flor){ pinta(ctx, '#F2A1C0', ox + 5, oy + 4, 2, 2); pinta(ctx, '#F2A1C0', ox + 10, oy + 7, 2, 2); }
  } else cardon(ctx, ox, oy, x, y);
};

/* Casas: del Valle (paredes claras y tejas), de las Yungas (pasteles) y de adobe en la Quebrada y la Puna. */
PINTORES.casa = (ctx, ox, oy, x, y) => {
  const c = climaDe(x);
  PINTORES.pasto(ctx, ox, oy, x, y);
  pinta(ctx, 'rgba(0,0,0,.25)', ox + 1, oy + 14, 15, 2);
  if(c === 'valles' || c === 'yungas'){
    const paredes = c === 'valles' ? ['#F2E8D0', '#F4DDB8', '#E9C4B5', '#CFE0E6', '#F1EBC9'] : ['#F7E3B4', '#BFE0C2', '#F2C6B4', '#CBE3EC'];
    const pared = paredes[Math.floor(ruido(x, y, 121) * paredes.length)];
    pinta(ctx, pared, ox + 1, oy + 7, 14, 7);
    pinta(ctx, tono(pared, -.14), ox + 1, oy + 12, 14, 2);
    const teja = c === 'valles' ? '#B5412F' : '#9C4A2E';
    [[5, 8], [3, 10], [2, 12], [1, 14], [0, 16], [0, 16]].forEach(([dx, w], i) => {
      pinta(ctx, i % 2 ? tono(teja, -.18) : teja, ox + dx, oy + 2 + i, w, 1);
    });
    pinta(ctx, tono(teja, .25), ox + 6, oy + 2, 4, 1);
    pinta(ctx, '#6B4A2A', ox + 7, oy + 10, 3, 4); pinta(ctx, '#F0B400', ox + 9, oy + 12, 1, 1);
    pinta(ctx, '#7FA8D8', ox + 3, oy + 9, 3, 3); pinta(ctx, '#7FA8D8', ox + 11, oy + 9, 3, 3);
    pinta(ctx, '#FFFFFF', ox + 4, oy + 9, 1, 3); pinta(ctx, '#FFFFFF', ox + 12, oy + 9, 1, 3);
  } else {                                           // adobe
    const adobes = ['#C9A57A', '#BE9A6E', '#D2B088', '#C4A07E'];
    const pared = adobes[Math.floor(ruido(x, y, 122) * adobes.length)];
    pinta(ctx, pared, ox + 1, oy + 5, 14, 9);
    pinta(ctx, tono(pared, -.16), ox + 1, oy + 12, 14, 2);
    pinta(ctx, tono(pared, .14), ox + 1, oy + 5, 14, 1);
    pinta(ctx, '#8E6A47', ox, oy + 3, 16, 3);          // techo plano de torta de barro
    pinta(ctx, '#A57F58', ox, oy + 3, 16, 1);
    for(let i = 0; i < 4; i++) pinta(ctx, '#5B3F25', ox + 1 + i * 4, oy + 6, 2, 1);   // cabezas de las vigas
    if(ruido(x, y, 123) > .55){ pinta(ctx, '#B8573A', ox + 11, oy + 1, 2, 3); }          // ristra de ají/chimenea
    pinta(ctx, '#F2EBDD', ox + 6, oy + 8, 5, 6);       // marco encalado de la puerta
    pinta(ctx, '#4A3320', ox + 7, oy + 9, 3, 5);
    pinta(ctx, '#2F4E78', ox + 2, oy + 8, 3, 3); pinta(ctx, '#2F4E78', ox + 12, oy + 8, 2, 3);   // ventanitas
  }
};

/* El Cerro de los Siete Colores (Quebrada) y la Serranía del Hornocal (Alta Quebrada, 14 colores):
   estratos inclinados, surcos de erosión y una falda de tierra. Cada casillero 'M' pinta SU parte del
   mismo cerro con las coordenadas del mundo, así que las franjas siguen de un casillero al otro. */
const SIETE_COLORES = ['#B5573A', '#E6CC9A', '#C9798D', '#8E6DAE', '#86A56E', '#D9A441', '#A8503A'];
const CATORCE_COLORES = ['#B04A32', '#E0A33C', '#D9762F', '#EFD9A8', '#C8668A', '#8A5FA0', '#B8523C', '#E8C873', '#A9775A', '#F0B8A0', '#7FA061', '#D18A3A', '#9C4B6B', '#E4D2B0'];
PINTORES.cerroColores = (ctx, ox, oy, x, y) => {
  const alta = climaDe(x) !== 'quebrada';
  const cols = alta ? CATORCE_COLORES : SIETE_COLORES, grosor = alta ? 9 : 17;
  PINTORES.pasto(ctx, ox, oy, x, y);
  const hay = (cx, cy) => charEn(cx, cy) === 'M';
  const arriba = hay(x, y - 1), abajo = hay(x, y + 1), izq = hay(x - 1, y), der = hay(x + 1, y);
  for(let py = 0; py < 16; py++){
    for(let px = 0; px < 16; px++){
      const wx = x * 16 + px, wy = y * 16 + py;
      if(!arriba && py < Math.floor(ruidoValor(wx / 4, y, 140) * 6)) continue;          // cresta irregular
      if(!izq && px < Math.floor(ruido(wy >> 1, x, 142) * 3)) continue;
      if(!der && px > 15 - Math.floor(ruido(wy >> 1, x + 1, 142) * 3)) continue;
      let col;
      if(!abajo && py > 11 - Math.floor(ruido(wx >> 1, y, 141) * 3)){                  // falda de derrubio
        col = ruido(wx, wy, 144) > .5 ? '#A88A64' : '#8E7250';
      } else {
        const t = (wy * .92 + wx * .3 + Math.sin(wx * .08) * 6 + Math.sin(wx * .21) * 2) / grosor;
        col = cols[((Math.floor(t) % cols.length) + cols.length) % cols.length];
        const surco = ruidoValor(wx / 2.3, 7, 143);
        if(surco > .8) col = tono(col, -.12);
        else if(surco < .14) col = tono(col, .08);
        if(py > 8) col = tono(col, -.06 * ((py - 8) / 4));
      }
      pinta(ctx, col, ox + px, oy + py, 1, 1);
    }
  }
};

/* Montaña con paleta propia de cada región (la del Valle es la original). */
const MONT_PAL = {
  yungas:       {a:'#3F6B3C', b:'#4A7A45', c:'#57884F', lo:'#365E34', hi:'#78A66A', cr1:'#9CC88A', cr2:'#2A4B28', t1:'#A9D49A', t2:'#78A66A', b1:'#2E5230', b2:'#1D361F'},
  quebrada:     {a:'#9A5B3C', b:'#A9684A', c:'#B8775A', lo:'#8A4F33', hi:'#C98B6B', cr1:'#E0B08C', cr2:'#6E3E28', t1:'#E3B793', t2:'#C98B6B', b1:'#7A4630', b2:'#4F2C1D'},
  altaquebrada: {a:'#8E5A52', b:'#9C6860', c:'#AB776F', lo:'#7C4B44', hi:'#C08F85', cr1:'#E2B7AA', cr2:'#633A34', t1:'#E6C0B2', t2:'#C08F85', b1:'#6E423C', b2:'#472623'},
  puna:         {a:'#7F6C5C', b:'#8C7867', c:'#9A8573', lo:'#6F5D4F', hi:'#B09A86', cr1:'#CDB9A4', cr2:'#58493E', t1:'#D2BFA9', t2:'#B09A86', b1:'#5E5044', b2:'#3D332B'}
};
PINTORES.montana = (ctx, ox, oy, x, y) => {
  const p = MONT_PAL[climaDe(x)];
  if(!p) return PINTORES_BASE.montana(ctx, ox, oy, x, y);
  const roca = (cx, cy) => ['^', 'V', 'C'].includes(charEn(cx, cy));
  textura3(ctx, ox, oy, x, y, 61, p.a, p.b, p.c);
  for(let i = 0; i < 6; i++){
    const rx = ox + Math.floor(ruido(x, y, i + 8) * 14), ry = oy + 3 + Math.floor(ruido(x, y, i + 70) * 10);
    pinta(ctx, i % 2 ? p.lo : p.hi, rx, ry, 3, 1);
  }
  if(ruido(x, y, 62) > .55 && roca(x, y - 1) && roca(x, y + 1)){
    const largo = 5 + Math.floor(ruido(x, y, 66) * 4), cx0 = ox + 1 + Math.floor(ruido(x, y, 63) * (15 - largo));
    const altoMax = 2 + Math.floor(ruido(x, y, 65) * 3), pico = Math.floor(ruido(x, y, 67) * largo);
    const baseY = oy + 8 + Math.floor(ruido(x, y, 68) * 3);
    for(let i = 0; i < largo; i++){
      const h = Math.max(0, altoMax - Math.abs(i - pico));
      pinta(ctx, p.cr1, cx0 + i, baseY - h, Math.max(1, 3 - (i % 2)), 1);
      if(h > 0) pinta(ctx, p.cr2, cx0 + i, baseY - h + 1, 2, Math.min(2, h));
    }
  }
  if(!roca(x, y - 1)){ pinta(ctx, p.t1, ox, oy, 16, 2); pinta(ctx, p.t2, ox, oy + 2, 16, 1); }
  if(!roca(x, y + 1)){ pinta(ctx, p.b1, ox, oy + 12, 16, 3); pinta(ctx, p.b2, ox, oy + 15, 16, 1); }
  if(!roca(x - 1, y)) pinta(ctx, p.b1, ox, oy, 1, 16);
  if(!roca(x + 1, y)) pinta(ctx, p.b1, ox + 15, oy, 1, 16);
};

/* Salinas Grandes: en la Puna la "nieve" es la costra blanca de sal, con su red de grietas. */
PINTORES.nieve = (ctx, ox, oy, x, y) => {
  if(climaDe(x) !== 'puna') return PINTORES_BASE.nieve(ctx, ox, oy, x, y);
  textura3(ctx, ox, oy, x, y, 1, '#E4DFD2', '#EDE9DD', '#F6F3EA');
  for(let i = 0; i < 4; i++){
    const gx = ox + Math.floor(ruido(x, y, i + 150) * 12), gy = oy + Math.floor(ruido(x, y, i + 160) * 12);
    const h = ruido(x, y, i + 170) > .5;
    pinta(ctx, '#CFC8B4', gx, gy, h ? 6 : 1, h ? 1 : 6);
    pinta(ctx, '#CFC8B4', gx + (h ? 5 : 0), gy + (h ? 0 : 5), h ? 1 : 3, h ? 3 : 1);
  }
  if(ruido(x, y, 47) > .9) pinta(ctx, '#BFD9E4', ox + 6, oy + 9, 3, 2);            // charquito de agua salada
};

/* El suelo "volcánico" cambia de color con la región: tierra colorada en el Valle y la Quebrada. */
const CENIZA_PAL = {
  valles:       ['#8E4A28', '#9C5530', '#AA6038', '#6E3416'],
  yungas:       ['#7C4A2C', '#8A5636', '#98623F', '#5E3320'],
  quebrada:     ['#A9502E', '#B85C36', '#C76A40', '#7B3418'],
  altaquebrada: ['#9E5A44', '#AC664F', '#BA735A', '#74382A']
};
PINTORES.ceniza = (ctx, ox, oy, x, y) => {
  const p = CENIZA_PAL[climaDe(x)];
  if(!p) return PINTORES_BASE.ceniza(ctx, ox, oy, x, y);
  textura3(ctx, ox, oy, x, y, 23, p[0], p[1], p[2]);
  for(let i = 0; i < 4; i++){
    const rx = ox + Math.floor(ruido(x, y, i + 5) * 13), ry = oy + Math.floor(ruido(x, y, i + 30) * 14);
    pinta(ctx, tono(p[2], .12), rx, ry, 3, 1);
  }
  if(ruido(x, y, 41) > .55){
    const gx = ox + 2 + Math.floor(ruido(x, y, 42) * 10), gy = oy + 3 + Math.floor(ruido(x, y, 43) * 8);
    pinta(ctx, p[3], gx, gy, 5, 1); pinta(ctx, p[3], gx + 3, gy + 1, 4, 1);
  }
};

/* Campo eléctrico: parque solar en la Quebrada y la Puna (paneles sobre tierra seca). */
PINTORES.campoElectrico = (ctx, ox, oy, x, y) => {
  const c = climaDe(x);
  if(c === 'valles' || c === 'yungas') return PINTORES_BASE.campoElectrico(ctx, ox, oy, x, y);
  PINTORES.pasto(ctx, ox, oy, x, y);
  [[1, 1], [9, 1], [1, 9], [9, 9]].forEach(([dx, dy]) => {
    pinta(ctx, '#9AA3AD', ox + dx - 1, oy + dy - 1, 7, 6);            // marco
    pinta(ctx, '#1F3B6B', ox + dx, oy + dy, 5, 4);
    pinta(ctx, '#3F67A8', ox + dx, oy + dy, 5, 1);
    pinta(ctx, '#5A86C8', ox + dx + 2, oy + dy, 1, 4);
    pinta(ctx, '#5A86C8', ox + dx, oy + dy + 2, 5, 1);
  });
  if(ruido(x, y, 44) > .8) pinta(ctx, '#FFF07A', ox + 7, oy + 7, 2, 2);   // destello
};


/* ---------- Lugares emblemáticos de Jujuy ----------
   Un casillero cada uno (no se camina), con un cartel al lado que dice qué es. G/K/D = Plaza Belgrano
   (Casa de Gobierno, Catedral, Cabildo), I = iglesia (adobe encalado en la Quebrada, blanca en la Puna),
   O = Monumento a la Independencia de Humahuaca, W = Ingenio Ledesma, j = llama, f = flamenco. */
PINTORES.gobierno = (ctx, ox, oy) => {                // Casa de Gobierno: palacio francés
  PINTORES.camino(ctx, ox, oy, ox >> 4, oy >> 4);
  pinta(ctx, 'rgba(0,0,0,.22)', ox + 1, oy + 14, 15, 2);
  pinta(ctx, '#E9D6B4', ox + 1, oy + 7, 14, 7);
  pinta(ctx, '#CDB78F', ox + 1, oy + 12, 14, 2);
  pinta(ctx, '#6D7885', ox + 1, oy + 4, 14, 3);        // mansarda gris
  pinta(ctx, '#8794A3', ox + 1, oy + 4, 14, 1);
  pinta(ctx, '#E9D6B4', ox + 6, oy + 1, 4, 6);         // torre central
  pinta(ctx, '#6D7885', ox + 5, oy + 0, 6, 2);
  pinta(ctx, '#8AC2E8', ox + 11, oy + 0, 1, 1);        // banderita celeste y blanca
  pinta(ctx, '#8AC2E8', ox + 12, oy + 0, 3, 1); pinta(ctx, '#FFFFFF', ox + 12, oy + 1, 3, 1);
  pinta(ctx, '#7FA8D8', ox + 3, oy + 8, 2, 3); pinta(ctx, '#7FA8D8', ox + 11, oy + 8, 2, 3);
  pinta(ctx, '#5B3A22', ox + 7, oy + 9, 2, 5);
  pinta(ctx, '#7FA8D8', ox + 7, oy + 3, 2, 2);
};
PINTORES.catedral = (ctx, ox, oy) => {                // Catedral: fachada colonial con torre y cruz
  PINTORES.camino(ctx, ox, oy, ox >> 4, oy >> 4);
  pinta(ctx, 'rgba(0,0,0,.22)', ox + 1, oy + 14, 15, 2);
  pinta(ctx, '#EFE2B8', ox + 2, oy + 6, 12, 8);
  pinta(ctx, '#D3C28F', ox + 2, oy + 12, 12, 2);
  pinta(ctx, '#EFE2B8', ox + 2, oy + 1, 4, 6);         // torre
  pinta(ctx, '#7A5A38', ox + 3, oy + 2, 2, 2);         // campanario
  pinta(ctx, '#B5412F', ox + 2, oy + 0, 4, 1);
  pinta(ctx, '#7A5A38', ox + 3, oy - 0, 1, 1);
  pinta(ctx, '#EFE2B8', ox + 7, oy + 3, 6, 3);         // frontón
  pinta(ctx, '#EFE2B8', ox + 8, oy + 2, 4, 1);
  pinta(ctx, '#C9A24A', ox + 9, oy + 0, 1, 3); pinta(ctx, '#C9A24A', ox + 8, oy + 1, 3, 1);   // cruz dorada
  pinta(ctx, '#5B3A22', ox + 8, oy + 9, 3, 5);         // portón con arco
  pinta(ctx, '#5B3A22', ox + 9, oy + 8, 1, 1);
  pinta(ctx, '#7FA8D8', ox + 4, oy + 9, 2, 3); pinta(ctx, '#7FA8D8', ox + 12, oy + 9, 1, 3);
};
PINTORES.cabildo = (ctx, ox, oy) => {                 // Cabildo: arcos blancos y torre del reloj
  PINTORES.camino(ctx, ox, oy, ox >> 4, oy >> 4);
  pinta(ctx, 'rgba(0,0,0,.22)', ox + 1, oy + 14, 15, 2);
  pinta(ctx, '#F4F1E8', ox + 1, oy + 7, 14, 7);
  pinta(ctx, '#D9D3C2', ox + 1, oy + 12, 14, 2);
  for(let i = 0; i < 4; i++){ pinta(ctx, '#5A4A3A', ox + 2 + i * 3, oy + 9, 2, 5); pinta(ctx, '#5A4A3A', ox + 3 + i * 3, oy + 8, 1, 1); }   // galería de arcos
  pinta(ctx, '#B5412F', ox + 1, oy + 5, 14, 2);
  pinta(ctx, '#F4F1E8', ox + 6, oy + 0, 4, 6);         // torre con reloj
  pinta(ctx, '#B5412F', ox + 5, oy - 0, 6, 1);
  pinta(ctx, '#2F3A55', ox + 7, oy + 2, 2, 2); pinta(ctx, '#F4F1E8', ox + 8, oy + 3, 1, 1);
};
/* ---------- Plaza Belgrano y Parque San Martín en detalle (sacado de las fotos) ----------
   FUENTES = las mismas del generador (genmundo4.py): [centro x, centro y, radio en casilleros, con reja]. La fuente
   se dibuja pixel a pixel con la distancia al centro, así los casilleros 'X' arman un círculo continuo. */
const FUENTES = [[33.0, 26.0, 2.0, false], [6.0, 17.0, 1.7, true]];
PINTORES.fuente = (ctx, ox, oy, x, y) => {
  PINTORES.camino(ctx, ox, oy, x, y);
  const f = FUENTES.reduce((m, c) => Math.hypot(x + .5 - c[0], y + .5 - c[1]) < Math.hypot(x + .5 - m[0], y + .5 - m[1]) ? c : m);
  const R = f[2] * 16, reja = f[3];
  const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const gotas = new Set();                               // chorros: 8 hilos que salen del centro y caen en arco
  for(let k = 0; k < 8; k++){
    const ang = k * Math.PI / 4 + .2;
    for(let t = 5; t <= 13; t += .8) gotas.add(Math.round(f[0] * 16 + Math.cos(ang) * t) + ',' + Math.round(f[1] * 16 + Math.sin(ang) * t));
  }
  for(let py = 0; py < 16; py++) for(let px = 0; px < 16; px++){
    const wx = x * 16 + px, wy = y * 16 + py;
    const dx = wx + .5 - f[0] * 16, dy = wy + .5 - f[1] * 16, d = Math.hypot(dx, dy);
    if(d > R + .6) continue;
    let col;
    if(d > R){ col = 'rgba(0,0,0,.28)'; }                                                   // sombra del borde
    else if(reja && d > R - 1.6){ const poste = Math.floor((Math.atan2(dy, dx) + Math.PI) * R / 3.4) % 2 === 0 && Math.abs(((Math.atan2(dy, dx) + Math.PI) * R / 3.4) % 1 - .5) < .22; col = poste ? '#8E95A3' : '#1E2026'; }     // reja de hierro negra: aro liso con postes
    else if(reja && d > R - 3.2) col = '#8A8F97';
    else if(d > R - 1.2) col = '#6F6C63';                                                    // contorno de piedra
    else if(d > R - 3.4){                                                                    // borde claro, armado con bloques de piedra
      const bloque = Math.floor((Math.atan2(dy, dx) + Math.PI) * R / 5.2), junta = Math.abs(((Math.atan2(dy, dx) + Math.PI) * R / 5.2) % 1 - .5) > .46;
      col = junta ? '#A8A496' : (dy < 0 ? (bloque % 2 ? '#F6F3E8' : '#EDEADD') : (bloque % 2 ? '#DAD6C7' : '#E3DFD0'));   // luz desde arriba
    }
    else if(d > R - 4.6) col = '#B3AFA2';                                                    // cara interior del borde
    else if(d < 2.4) col = (dx + dy < -.5) ? '#B2C49B' : '#7E906C';                              // estatua de bronce verdoso, con luz
    else if(d < 4.2) col = '#EDEADF';                                                        // taza de arriba
    else if(d < 6.4) col = d > 5.4 ? '#9C998D' : '#CFCBBD';                                  // pedestal escalonado
    else if(gotas.has(wx + ',' + wy)) col = '#FFFFFF';                                       // chorros
    else {
      const h = hash(wx, wy), ring = Math.sin(d * 1.7);
      const hondo = Math.max(0, (d - R * .55) / (R * .45));                               // más oscura hacia el borde (profundidad)
      col = h > .985 ? '#E3F4FF' : (h > .94 ? '#9ED3F3' : (h < .03 ? '#468CC6' : (ring > .72 ? '#79BCEA' : (hondo > .72 ? '#4C9AD2' : '#62AEE3'))));   // agua con brillitos chicos
      if(d > 12.5 && d < 14 && h > .55) col = '#EAF7FF';                                     // espuma donde cae el agua
    }
    pinta(ctx, col, ox + px, oy + py, 1, 1);
  }
};
PINTORES.ecuestre = (ctx, ox, oy, x, y) => {          // monumento ecuestre a Belgrano: caballo en dos patas sobre pedestal
  PINTORES.camino(ctx, ox, oy, x, y);
  pinta(ctx, 'rgba(0,0,0,.22)', ox + 1, oy + 14, 15, 2);
  pinta(ctx, '#9A988E', ox + 2, oy + 11, 12, 4); pinta(ctx, '#B9B7AB', ox + 2, oy + 11, 12, 1);          // base escalonada
  pinta(ctx, '#B9B7AB', ox + 3, oy + 8, 10, 4); pinta(ctx, '#7C7A70', ox + 3, oy + 11, 10, 1);
  pinta(ctx, '#3E3B33', ox + 5, oy + 9, 6, 2);                                                          // placa de bronce
  pinta(ctx, '#4A5A3E', ox + 4, oy + 5, 7, 3);                                                          // cuerpo del caballo
  pinta(ctx, '#4A5A3E', ox + 3, oy + 3, 2, 3); pinta(ctx, '#4A5A3E', ox + 2, oy + 2, 2, 2);             // pecho y cabeza
  pinta(ctx, '#4A5A3E', ox + 3, oy + 6, 1, 3); pinta(ctx, '#4A5A3E', ox + 5, oy + 7, 1, 2);             // patas
  pinta(ctx, '#4A5A3E', ox + 9, oy + 7, 1, 2); pinta(ctx, '#4A5A3E', ox + 11, oy + 7, 1, 2);
  pinta(ctx, '#4A5A3E', ox + 11, oy + 4, 2, 3);                                                         // cola
  pinta(ctx, '#2F3B27', ox + 7, oy + 1, 2, 4);                                                          // el prócer
  pinta(ctx, '#2F3B27', ox + 8, oy + 0, 2, 1); pinta(ctx, '#2F3B27', ox + 9, oy + 1, 3, 1);             // sombrero y brazo en alto
};
PINTORES.palmera = (ctx, ox, oy, x, y) => {           // palmera alta de la plaza
  PINTORES.pasto(ctx, ox, oy, x, y);
  pinta(ctx, 'rgba(0,0,0,.2)', ox + 3, oy + 13, 10, 3);
  pinta(ctx, '#8B6B47', ox + 7, oy + 6, 2, 9); pinta(ctx, '#6E5236', ox + 7, oy + 8, 2, 1); pinta(ctx, '#6E5236', ox + 7, oy + 11, 2, 1);
  pinta(ctx, '#2F8F46', ox + 1, oy + 3, 14, 2); pinta(ctx, '#2F8F46', ox + 3, oy + 1, 10, 2);
  pinta(ctx, '#3FAE5A', ox + 5, oy + 0, 6, 2); pinta(ctx, '#1F6B2B', ox + 1, oy + 5, 3, 2); pinta(ctx, '#1F6B2B', ox + 12, oy + 5, 3, 2);
  pinta(ctx, '#6E5236', ox + 7, oy + 5, 2, 2);
};
PINTORES.cedro = (ctx, ox, oy, x, y) => {             // cedro / araucaria: conífera alta y oscura
  PINTORES.pasto(ctx, ox, oy, x, y);
  pinta(ctx, 'rgba(0,0,0,.22)', ox + 3, oy + 13, 11, 3);
  pinta(ctx, '#5B3A22', ox + 7, oy + 11, 2, 4);
  pinta(ctx, '#17502B', ox + 1, oy + 8, 14, 4); pinta(ctx, '#1D6636', ox + 3, oy + 4, 10, 4);
  pinta(ctx, '#17502B', ox + 5, oy + 1, 6, 3); pinta(ctx, '#2A8048', ox + 6, oy + 0, 4, 2);
  pinta(ctx, '#2A8048', ox + 3, oy + 8, 4, 1); pinta(ctx, '#2A8048', ox + 8, oy + 5, 3, 1);
};
PINTORES.farol = (ctx, ox, oy, x, y) => {             // farol de hierro
  PINTORES.camino(ctx, ox, oy, x, y);
  pinta(ctx, 'rgba(0,0,0,.2)', ox + 5, oy + 13, 7, 2);
  pinta(ctx, '#2F3239', ox + 7, oy + 4, 2, 11); pinta(ctx, '#2F3239', ox + 5, oy + 13, 6, 2);
  pinta(ctx, '#2F3239', ox + 5, oy + 2, 6, 2);
  pinta(ctx, '#FFE9A0', ox + 6, oy + 3, 4, 1); pinta(ctx, '#FFD25E', ox + 7, oy + 3, 2, 1);
  pinta(ctx, '#2F3239', ox + 7, oy + 0, 2, 2);
};
PINTORES.banco = (ctx, ox, oy, x, y) => {             // banco de plaza (listones de madera sobre patas de hierro)
  PINTORES.pasto(ctx, ox, oy, x, y);
  pinta(ctx, 'rgba(0,0,0,.2)', ox + 1, oy + 13, 14, 2);
  pinta(ctx, '#2F3239', ox + 2, oy + 10, 1, 4); pinta(ctx, '#2F3239', ox + 13, oy + 10, 1, 4);
  pinta(ctx, '#A87445', ox + 1, oy + 8, 14, 2); pinta(ctx, '#C58F58', ox + 1, oy + 8, 14, 1);
  pinta(ctx, '#A87445', ox + 1, oy + 5, 14, 2); pinta(ctx, '#8A5C34', ox + 1, oy + 6, 14, 1);
};
PINTORES.gobiernoAla = (ctx, ox, oy) => {             // ala de la Casa de Gobierno: pared crema, mansarda gris y ventanas
  PINTORES.camino(ctx, ox, oy, ox >> 4, oy >> 4);
  pinta(ctx, 'rgba(0,0,0,.22)', ox + 0, oy + 14, 16, 2);
  pinta(ctx, '#E9D6B4', ox + 0, oy + 7, 16, 7); pinta(ctx, '#CDB78F', ox + 0, oy + 12, 16, 2);
  pinta(ctx, '#6D7885', ox + 0, oy + 3, 16, 4); pinta(ctx, '#8794A3', ox + 0, oy + 3, 16, 1);
  pinta(ctx, '#7FA8D8', ox + 3, oy + 4, 2, 2); pinta(ctx, '#7FA8D8', ox + 11, oy + 4, 2, 2);      // lucarnas
  pinta(ctx, '#7FA8D8', ox + 2, oy + 8, 3, 4); pinta(ctx, '#7FA8D8', ox + 11, oy + 8, 3, 4);      // ventanas
  pinta(ctx, '#B79F78', ox + 7, oy + 8, 2, 5);
};
PINTORES.cabildoArcos = (ctx, ox, oy) => {            // galería de arcos del Cabildo
  PINTORES.camino(ctx, ox, oy, ox >> 4, oy >> 4);
  pinta(ctx, 'rgba(0,0,0,.22)', ox + 0, oy + 14, 16, 2);
  pinta(ctx, '#F4F1E8', ox + 0, oy + 7, 16, 7); pinta(ctx, '#D9D3C2', ox + 0, oy + 12, 16, 2);
  for(let i = 0; i < 3; i++){ pinta(ctx, '#5A4A3A', ox + 1 + i * 5, oy + 9, 3, 5); pinta(ctx, '#5A4A3A', ox + 2 + i * 5, oy + 8, 1, 1); }
  pinta(ctx, '#B5412F', ox + 0, oy + 5, 16, 2);
};
PINTORES.catedralNave = (ctx, ox, oy) => {            // nave lateral de la Catedral
  PINTORES.camino(ctx, ox, oy, ox >> 4, oy >> 4);
  pinta(ctx, 'rgba(0,0,0,.22)', ox + 0, oy + 14, 16, 2);
  pinta(ctx, '#EFE2B8', ox + 0, oy + 5, 16, 9); pinta(ctx, '#D3C28F', ox + 0, oy + 12, 16, 2);
  pinta(ctx, '#B5412F', ox + 0, oy + 3, 16, 2);
  pinta(ctx, '#7FA8D8', ox + 3, oy + 7, 3, 4); pinta(ctx, '#7FA8D8', ox + 10, oy + 7, 3, 4);
  pinta(ctx, '#C9A24A', ox + 7, oy + 8, 2, 1);
};
/* ---------- Purmamarca y el Tren Solar de la Quebrada ---------- */
PINTORES.via = (ctx, ox, oy, x, y) => {               // vía de trocha angosta sobre balasto (este-oeste)
  PINTORES.pasto(ctx, ox, oy, x, y);
  pinta(ctx, '#B9A98A', ox, oy + 2, 16, 12); pinta(ctx, '#9C8D70', ox, oy + 2, 16, 1); pinta(ctx, '#9C8D70', ox, oy + 13, 16, 1);
  for(let i = 1; i < 16; i += 4) pinta(ctx, '#6B4A2B', ox + i, oy + 3, 2, 10);              // durmientes
  pinta(ctx, '#7D838C', ox, oy + 5, 16, 1); pinta(ctx, '#7D838C', ox, oy + 10, 16, 1);       // rieles
  pinta(ctx, '#C9CED6', ox, oy + 5, 16, 1); pinta(ctx, '#C9CED6', ox, oy + 10, 16, 1);
};
PINTORES.estacionSolar = (ctx, ox, oy, x, y) => {      // estación con techo de paneles solares
  PINTORES.camino(ctx, ox, oy, x, y);
  pinta(ctx, 'rgba(0,0,0,.22)', ox + 1, oy + 14, 15, 2);
  pinta(ctx, '#F2EBDD', ox + 2, oy + 7, 12, 7); pinta(ctx, '#D9CFBA', ox + 2, oy + 12, 12, 2);
  pinta(ctx, '#5B3A22', ox + 6, oy + 9, 3, 5);                                              // puerta
  pinta(ctx, '#7FA8D8', ox + 3, oy + 8, 2, 3); pinta(ctx, '#7FA8D8', ox + 11, oy + 8, 2, 3);
  pinta(ctx, '#1F3A5F', ox + 0, oy + 3, 16, 5);                                              // techo de paneles solares
  for(let i = 0; i < 16; i += 4) pinta(ctx, '#3B66A1', ox + i, oy + 3, 3, 2);
  for(let i = 0; i < 16; i += 4) pinta(ctx, '#2A528C', ox + i, oy + 5, 3, 2);
  pinta(ctx, '#F4C430', ox + 3, oy + 1, 10, 2);                                              // cartel amarillo
};
PINTORES.casaAdobe = (ctx, ox, oy, x, y) => {          // casa de adobe: pared de barro, techo plano, cardón en la puerta
  PINTORES.pasto(ctx, ox, oy, x, y);
  pinta(ctx, 'rgba(0,0,0,.22)', ox + 1, oy + 14, 15, 2);
  const t = ruido(x, y, 215);
  pinta(ctx, t > .5 ? '#C8946A' : '#BE8A5E', ox + 1, oy + 5, 14, 9); pinta(ctx, '#A87448', ox + 1, oy + 12, 14, 2);
  pinta(ctx, '#8A5C34', ox + 0, oy + 4, 16, 2); pinta(ctx, '#6E4524', ox + 2, oy + 3, 2, 1); pinta(ctx, '#6E4524', ox + 7, oy + 3, 2, 1); pinta(ctx, '#6E4524', ox + 12, oy + 3, 2, 1);   // vigas del techo
  pinta(ctx, '#4A3320', ox + (t > .5 ? 3 : 10), oy + 8, 3, 6);                              // puerta
  pinta(ctx, '#7FA8D8', ox + (t > .5 ? 9 : 3), oy + 8, 3, 3);
};
PINTORES.puestoArtesanias = (ctx, ox, oy, x, y) => {   // puesto del mercado: toldo a rayas y mantas tejidas
  PINTORES.camino(ctx, ox, oy, x, y);
  pinta(ctx, 'rgba(0,0,0,.2)', ox + 1, oy + 14, 15, 2);
  const cols = ['#D9453B', '#F4C430', '#2F7FC1', '#3FA55B'], a = Math.floor(ruido(x, y, 220) * 4);
  for(let i = 0; i < 7; i++) pinta(ctx, cols[(i + a) % 4], ox + 1 + i * 2, oy + 3, 2, 4);   // toldo a rayas
  pinta(ctx, '#7A5A38', ox + 2, oy + 7, 1, 7); pinta(ctx, '#7A5A38', ox + 13, oy + 7, 1, 7);
  pinta(ctx, '#A87445', ox + 2, oy + 10, 12, 3);
  for(let i = 0; i < 4; i++) pinta(ctx, cols[(i + a + 1) % 4], ox + 3 + i * 3, oy + 8, 2, 2);   // mantas y ponchos
};

/* Tren Solar: sale de la primera región (San Salvador), va de izquierda a derecha por las seis regiones parando en
   cada estación, llega a La Quiaca y vuelve. Es el mismo para todos (depende sólo de la hora). La vía está en la fila
   TREN_Y (la del paso entre regiones). TREN_EST = columnas de las estaciones (las mismas que genmundo4.py). */
const TREN_Y = 43, TREN_EST = [30, 84, 134, 188, 244, 298], TREN_V = 4, TREN_PARADA = 8000;   // casilleros/seg y ms parado
const TREN_TRAMOS = (() => {
  const ida = []; for(let i = 0; i < TREN_EST.length - 1; i++) ida.push({de: TREN_EST[i], a: TREN_EST[i + 1]});
  const vuelta = ida.slice().reverse().map(t => ({de: t.a, a: t.de}));
  return ida.concat(vuelta).map(t => ({...t, ms: Math.abs(t.a - t.de) / TREN_V * 1000}));
})();
const TREN_CICLO = TREN_TRAMOS.reduce((s, t) => s + t.ms + TREN_PARADA, 0);
function trenEstado(ahora){                             // {x, dir, parado}: x en casilleros, dir +1 = hacia el este
  let t = ahora % TREN_CICLO;
  for(const tr of TREN_TRAMOS){
    if(t < TREN_PARADA) return {x: tr.de, dir: tr.a > tr.de ? 1 : -1, parado: true};
    t -= TREN_PARADA;
    if(t < tr.ms) return {x: tr.de + (tr.a - tr.de) * (t / tr.ms), dir: tr.a > tr.de ? 1 : -1, parado: false};
    t -= tr.ms;
  }
  return {x: TREN_EST[0], dir: 1, parado: true};
}
const TREN_ESCALA = 1.5, TREN_ANCHO = 2.1, TREN_NOMBRES = ['San Salvador', 'Volcán', 'Purmamarca', 'Humahuaca', 'Abra Pampa', 'La Quiaca'];
function dibujarTren(ctx, camX, camY, vw, vh){          // visto desde arriba, con la librea real: crema, franja naranja con montañas blancas
  const e = trenEstado(Date.now());
  const px = Math.round(e.x * ADV_PX + 8 - camX), py = TREN_Y * ADV_PX + 8 - camY;
  if(py < -20 || py > vh + 20 || px < -60 || px > vw + 60) return;
  ctx.save(); ctx.translate(px, py); ctx.rotate(-Math.PI / 2); ctx.scale(TREN_ANCHO, TREN_ESCALA);   // se arma parado, se gira hacia el este; más ancho (2,8 m reales frente a un personaje de 1,7 m)
  const cx = 0, cy = 0;
  const L = 64, top = cy - L / 2, naranja = '#E8631F', crema = '#F1EADB';
  pinta(ctx, 'rgba(0,0,0,.28)', cx - 5, top + 3, 12, L);
  pinta(ctx, naranja, cx - 6, top + 2, 12, L - 4);                                     // flancos naranjas
  for(let i = 4; i < L - 4; i += 6){                                                   // montañitas blancas de la librea
    pinta(ctx, '#FFFFFF', cx - 6, top + i, 1, 2); pinta(ctx, '#FFFFFF', cx + 5, top + i, 1, 2);
    pinta(ctx, '#FFFFFF', cx - 6, top + i + 2, 2, 1); pinta(ctx, '#FFFFFF', cx + 4, top + i + 2, 2, 1);
  }
  pinta(ctx, crema, cx - 4, top + 2, 8, L - 4);                                         // techo crema
  pinta(ctx, '#DDD5C2', cx - 1, top + 6, 2, L - 12);                                    // lomo del techo
  for(const k of [0, 1]){ const y0 = top + 14 + k * (L / 2 - 4); pinta(ctx, '#243A5C', cx - 3, y0, 6, L / 2 - 12); pinta(ctx, '#3F63A0', cx - 3, y0, 1, L / 2 - 12); pinta(ctx, '#3F63A0', cx + 2, y0, 1, L / 2 - 12); }   // paneles solares del techo
  for(let i = 0; i < 2; i++){                                                           // rejillas de ventilación
    const y0 = top + 10 + i * (L / 2 - 4);
    for(let k = 0; k < 4; k++) pinta(ctx, '#B9B2A1', cx - 3, y0 + k * 2, 6, 1);
  }
  pinta(ctx, '#2A2E36', cx - 5, top + L / 2 - 1, 10, 2);                                // fuelle entre los dos coches
  pinta(ctx, naranja, cx - 6, top + L / 2 - 1, 1, 2); pinta(ctx, naranja, cx + 5, top + L / 2 - 1, 1, 2);
  for(const lado of [0, 1]){                                                            // las dos cabinas (el tren anda para los dos lados)
    const adelante = (lado === 1) === (e.dir > 0);
    const y0 = lado === 0 ? top : top + L - 12, signo = lado === 0 ? 1 : -1;
    const base = lado === 0 ? top : top + L;                                            // punta
    pinta(ctx, '#14161B', cx - 5, lado === 0 ? top : top + L - 6, 10, 6);               // frente negro
    pinta(ctx, '#1B2430', cx - 4, lado === 0 ? top + 6 : top + L - 12, 8, 6);           // parabrisas grande
    pinta(ctx, '#3C4A5E', cx - 3, lado === 0 ? top + 7 : top + L - 11, 3, 1);
    pinta(ctx, '#FF5A3C', cx - 2, lado === 0 ? top + 12 : top + L - 13, 4, 1);          // cartel de destino
    for(let k = 0; k < 6; k++) pinta(ctx, k % 2 ? '#14161B' : naranja, cx - 6 + k * 2, lado === 0 ? top - 1 : top + L, 2, 1);   // paragolpes rayado
    pinta(ctx, adelante ? '#FFF6C2' : '#E53935', cx - 5, lado === 0 ? top + 1 : top + L - 3, 2, 2);
    pinta(ctx, adelante ? '#FFF6C2' : '#E53935', cx + 3, lado === 0 ? top + 1 : top + L - 3, 2, 2);
    pinta(ctx, adelante ? '#FFFFFF' : '#BFD2F2', cx - 1, lado === 0 ? top + 1 : top + L - 3, 2, 2);
  }
  ctx.restore();
};
/* ---------- Algarrobos de Purmamarca ----------
   ALGARROBOS = [centro x, centro y, media anchura de la reja en casilleros] (igual que genmundo4.py). El Algarrobo
   Histórico se dibuja pixel a pixel sobre sus casilleros 'A': copa irregular, ramas retorcidas, tronco grueso y la reja. */
const ALGARROBOS = [[138.0, 50.0, 2.0]];
PINTORES.algarrobo = (ctx, ox, oy, x, y) => {           // algarrobo común de la plaza: copa ancha y verde grisácea
  PINTORES.pasto(ctx, ox, oy, x, y);
  pinta(ctx, 'rgba(0,0,0,.2)', ox + 2, oy + 12, 13, 4);
  pinta(ctx, '#5B3F26', ox + 7, oy + 8, 2, 7); pinta(ctx, '#3E2A18', ox + 8, oy + 9, 1, 6);
  pinta(ctx, '#3F6B3A', ox + 1, oy + 3, 14, 7); pinta(ctx, '#4F8144', ox + 3, oy + 1, 10, 5);
  pinta(ctx, '#2F5230', ox + 2, oy + 7, 12, 3); pinta(ctx, '#6A9A58', ox + 5, oy + 2, 3, 1); pinta(ctx, '#6A9A58', ox + 10, oy + 5, 3, 1);
  pinta(ctx, '#6B4A2B', ox + 4, oy + 5, 1, 2); pinta(ctx, '#6B4A2B', ox + 11, oy + 4, 1, 3);
};
PINTORES.algarroboHistorico = (ctx, ox, oy, x, y) => {
  PINTORES.pasto(ctx, ox, oy, x, y);                                                     // jardín cercado: pasto y tierra
  const A = ALGARROBOS.reduce((m, c) => Math.hypot(x + .5 - c[0], y + .5 - c[1]) < Math.hypot(x + .5 - m[0], y + .5 - m[1]) ? c : m);
  const cxp = A[0] * 16, cyp = A[1] * 16, H = A[2] * 16, Rc = H * .9;
  const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  for(let py = 0; py < 16; py++) for(let px = 0; px < 16; px++){
    const wx = x * 16 + px, wy = y * 16 + py, dx = wx + .5 - cxp, dy = wy + .5 - cyp, d = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx), borde = Rc * (.8 + .2 * Math.sin(ang * 4 + 1.3) + .1 * Math.sin(ang * 9));
    const h = hash(wx, wy);
    let col = null;
    if(Math.max(Math.abs(dx), Math.abs(dy)) > H - 1.2){                                 // reja de hierro forjado negra
      col = ((wx + wy) % 4 === 0) ? '#5A5F6B' : '#1E2026';
    } else if(d < 6.5 + 1.5 * Math.sin(ang * 3)){ col = d < 3.5 ? '#3E2A18' : (h > .5 ? '#6B4A2B' : '#523820'); }   // tronco ancho y retorcido
    else if(d < borde){
      const giro = Math.sin(ang * 6 + d * .085 + Math.sin(ang * 2) * 2);                // ramas que se enroscan al salir del tronco
      if(giro > .8 && d < borde * .95) col = giro > .93 ? '#6B4A2B' : '#523820';
      else if(h < .62) col = h < .12 ? '#2A4A2B' : (h < .36 ? '#3F6B3A' : (h < .55 ? '#4F8144' : '#6A9A58'));   // hojas
    }
    if(!col && d < borde + 3 && d >= borde * .55 && Math.max(Math.abs(dx), Math.abs(dy)) <= H - 3.2) col = 'rgba(0,0,0,.18)';   // sombra de la copa
    if(col) pinta(ctx, col, ox + px, oy + py, 1, 1);
  }
};
/* ---- Viajar en el Tren Solar ----
   Con el tren parado en una estación y el jugador cerca de la vía aparece el botón "Subir". Arriba, el personaje va
   pegado al tren (la cámara lo sigue) y cruza las regiones solo; en cada parada aparece "Bajar". No cuenta como
   caminata (no suma pasos ni dispara encuentros) y el servidor no interviene: la posición sólo la ven los demás. */
let advTrenAbordo = false;
function trenSiguiente(e){                              // nombre de la próxima estación según para dónde va
  if(e.dir > 0){ const i = TREN_EST.findIndex(x => x > e.x + .01); return TREN_NOMBRES[i < 0 ? TREN_EST.length - 1 : i]; }
  let j = -1; TREN_EST.forEach((x, i) => { if(x < e.x - .01) j = i; });
  return TREN_NOMBRES[j < 0 ? 0 : j];
}
function trenEstacionActual(e){ const i = TREN_EST.findIndex(x => Math.abs(x - e.x) < .05); return i; }
function trenCerradoPorEvento(){ const ev = eventoActivo(); return !!(ev && ev.mapaCerradoDesdeX); }
function trenBoton(){
  let b = document.getElementById('advTrenBtn');
  if(!b){
    b = document.createElement('button'); b.id = 'advTrenBtn'; b.hidden = true;
    b.style.cssText = 'position:absolute;left:50%;bottom:215px;transform:translateX(-50%);z-index:6;min-height:48px;padding:10px 20px;border-radius:14px;border:2px solid #FFD25E;background:rgba(232,99,31,.94);color:#fff;font-family:"Baloo 2",sans-serif;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4);';
    b.addEventListener('click', ev => { ev.stopPropagation(); trenAccion(); });
    b.addEventListener('pointerdown', ev => ev.stopPropagation());
    document.getElementById('advOverlay').appendChild(b);
  }
  return b;
}
function trenAccion(){
  const e = trenEstado(Date.now());
  if(advTrenAbordo){
    if(!e.parado) return;
    advTrenAbordo = false;
    advPonerEn(Math.round(e.x), TREN_Y - 1);              // baja al camino que corre al lado de la vía
    advDir = 'abajo'; advPaso = 0; advEje = {x: 0, y: 0};
    advMensaje('🚉 Bajaste en la estación <b>' + TREN_NOMBRES[trenEstacionActual(e)] + '</b>');
    return;
  }
  if(!trenPuedeSubir(e)) return;
  if(trenCerradoPorEvento()){ advMensaje('🚆 El Tren Solar no sale mientras dura el evento.'); return; }
  advTrenAbordo = true; advEje = {x: 0, y: 0};
  advMensaje('🚆 ¡Subiste al <b>Tren Solar</b>! Próxima parada: <b>' + trenSiguiente(e) + '</b>');
}
function trenPuedeSubir(e){
  return advMapa === 'overworld' && e.parado && Math.abs((advPx + 8) / ADV_PX - 0.5 - e.x) <= 3.4 && Math.abs(advY - TREN_Y) <= 1;
}
/* Entran 8 a la vez: 4 a lo largo del tren y 2 a lo ancho. Cada uno ocupa un lugar fijo según su nombre, así todos
   se ven repartidos en el tren y no apilados en el mismo punto. */
let trenPlazaN = null;
function trenPlaza(){
  if(trenPlazaN === null){
    let h = 0; try{ const n = localStorage.getItem(NAME_KEY) || ''; for(let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0; }catch(e){}
    trenPlazaN = h % 8;
  }
  return {dx: ((trenPlazaN % 4) - 1.5) * 14, dy: (trenPlazaN >> 2) ? 4 : -4};
}
function trenActualizar(){                              // se llama en cada cuadro: mueve al viajero y muestra el botón que toque
  const b = trenBoton();
  if(advMapa !== 'overworld'){ advTrenAbordo = false; b.hidden = true; return; }
  const e = trenEstado(Date.now());
  if(advTrenAbordo){
    const pl = trenPlaza();
    advPx = e.x * ADV_PX + pl.dx; advPy = TREN_Y * ADV_PX - 3 + pl.dy;
    advX = Math.floor((advPx + 8) / ADV_PX); advY = TREN_Y; advDir = e.dir > 0 ? 'der' : 'izq'; advPaso = 0;
    advRegion = regionDe(advX);
    if(advRegion !== advRegionAnterior){ advRegionAnterior = advRegion; advCartelRegion(advRegion); }
    b.hidden = false;
    b.textContent = e.parado ? '🚉 Bajar en ' + TREN_NOMBRES[trenEstacionActual(e)] : '🚆 Viajando a ' + trenSiguiente(e) + '…';
    b.style.opacity = e.parado ? '1' : '.75';
  } else if(trenPuedeSubir(e)){
    b.hidden = false; b.style.opacity = '1';
    b.textContent = '🚆 Subir al Tren Solar (' + TREN_NOMBRES[trenEstacionActual(e)] + ')';
  } else b.hidden = true;
}
/* ---------- Diques de El Carmen (sacado de las fotos de Zeta) ---------- */
PINTORES.pasarela = (ctx, ox, oy, x, y) => {          // pasarela de hierro blanca, ancha (3 casilleros): baranda sólo en los bordes
  PINTORES.agua(ctx, ox, oy, x, y);
  const arriba = 'wU'.includes(charEn(x, y - 1)), abajo = 'wU'.includes(charEn(x, y + 1));
  const y0 = arriba ? 0 : 3, y1 = abajo ? 16 : 13;
  pinta(ctx, 'rgba(0,0,0,.18)', ox, oy + y1 - 1, 16, 2);
  pinta(ctx, '#C4B05A', ox, oy + y0, 16, y1 - y0);                                           // tablones amarillentos
  for(let i = 0; i < 16; i += 4) pinta(ctx, '#8C7A3A', ox + i, oy + y0, 1, y1 - y0);
  pinta(ctx, '#B09C4C', ox, oy + (y0 + y1) / 2 | 0, 16, 1);
  if(!arriba){ pinta(ctx, '#F2F2EE', ox, oy + 2, 16, 2); for(let i = 0; i < 16; i += 4) pinta(ctx, '#C9CCD2', ox + i, oy + 2, 1, 2); }      // barandas blancas
  if(!abajo){ pinta(ctx, '#F2F2EE', ox, oy + 12, 16, 2); for(let i = 0; i < 16; i += 4) pinta(ctx, '#C9CCD2', ox + i, oy + 12, 1, 2); }
};
PINTORES.torreToma = (ctx, ox, oy, x, y) => {         // torre de toma de piedra con arcos y volantes amarillos
  PINTORES.agua(ctx, ox, oy, x, y);
  pinta(ctx, 'rgba(0,0,0,.25)', ox + 2, oy + 13, 14, 3);
  pinta(ctx, '#B7AE96', ox + 1, oy + 4, 14, 10); pinta(ctx, '#8E866F', ox + 1, oy + 11, 14, 3);   // base de piedra
  pinta(ctx, '#D8D1BC', ox + 1, oy + 1, 14, 4); pinta(ctx, '#A39B84', ox + 1, oy + 4, 14, 1);     // cornisa
  pinta(ctx, '#2A2E33', ox + 3, oy + 6, 3, 6); pinta(ctx, '#2A2E33', ox + 10, oy + 6, 3, 6);      // arcos oscuros
  pinta(ctx, '#2A2E33', ox + 4, oy + 5, 1, 1); pinta(ctx, '#2A2E33', ox + 11, oy + 5, 1, 1);
  pinta(ctx, '#E5B93E', ox + 4, oy + 8, 1, 4); pinta(ctx, '#E5B93E', ox + 3, oy + 9, 3, 1);        // volantes de las compuertas
  pinta(ctx, '#E5B93E', ox + 11, oy + 8, 1, 4); pinta(ctx, '#E5B93E', ox + 10, oy + 9, 3, 1);
};
PINTORES.usina = (ctx, ox, oy, x, y) => {             // Usina Eléctrica La Ciénaga: edificio de piedra con techo gris y chimenea
  PINTORES.pasto(ctx, ox, oy, x, y);
  pinta(ctx, 'rgba(0,0,0,.22)', ox + 1, oy + 14, 15, 2);
  pinta(ctx, '#CFC8B4', ox + 1, oy + 7, 14, 7); pinta(ctx, '#A8A18C', ox + 1, oy + 12, 14, 2);
  pinta(ctx, '#6D7885', ox + 0, oy + 4, 16, 4); pinta(ctx, '#8794A3', ox + 0, oy + 4, 16, 1);
  pinta(ctx, '#7FA8D8', ox + 3, oy + 9, 2, 3); pinta(ctx, '#7FA8D8', ox + 11, oy + 9, 2, 3);
  pinta(ctx, '#5B3A22', ox + 7, oy + 9, 2, 5);
  pinta(ctx, '#B5573A', ox + 12, oy + 0, 3, 5); pinta(ctx, '#2B2B2B', ox + 12, oy + 0, 3, 1);  // chimenea
  pinta(ctx, '#F4C430', ox + 4, oy + 5, 3, 2);                                                  // rayo de electricidad
};
PINTORES.panelSolar = (ctx, ox, oy, x, y) => {         // hilera de paneles solares sobre la estepa
  PINTORES.pasto(ctx, ox, oy, x, y);
  pinta(ctx, 'rgba(0,0,0,.22)', ox + 1, oy + 12, 15, 3);
  pinta(ctx, '#7D838C', ox + 7, oy + 10, 2, 4);
  pinta(ctx, '#1F3A5F', ox + 1, oy + 2, 14, 9); pinta(ctx, '#2F5C9A', ox + 2, oy + 3, 12, 7);
  for(let i = 5; i < 14; i += 4) pinta(ctx, '#7FA8D8', ox + i, oy + 3, 1, 7);
  pinta(ctx, '#7FA8D8', ox + 2, oy + 6, 12, 1);
};
PINTORES.iglesia = (ctx, ox, oy, x, y) => {           // iglesia: adobe encalado (Quebrada) o blanca (Puna)
  PINTORES.camino(ctx, ox, oy, x, y);
  const blanca = climaDe(x) === 'puna';
  const pared = blanca ? '#F5F1E6' : '#E4D2AA', sombra = blanca ? '#D8D2C0' : '#C4AE80';
  pinta(ctx, 'rgba(0,0,0,.22)', ox + 1, oy + 14, 15, 2);
  pinta(ctx, pared, ox + 2, oy + 6, 10, 8); pinta(ctx, sombra, ox + 2, oy + 12, 10, 2);
  pinta(ctx, '#8E6A47', ox + 1, oy + 5, 12, 2);        // techo de paja y barro
  pinta(ctx, pared, ox + 11, oy + 1, 4, 13);           // campanario
  pinta(ctx, sombra, ox + 14, oy + 1, 1, 13);
  pinta(ctx, '#3B2A1A', ox + 12, oy + 3, 2, 3);        // arco con campana
  pinta(ctx, '#E5B93E', ox + 12, oy + 4, 2, 1);
  pinta(ctx, '#8E6A47', ox + 11, oy + 0, 4, 1);
  pinta(ctx, '#5B3A22', ox + 5, oy + 9, 3, 5);         // puerta de cardón
  pinta(ctx, '#C9A24A', ox + 6, oy + 2, 1, 4); pinta(ctx, '#C9A24A', ox + 5, oy + 3, 3, 1);    // cruz
};
PINTORES.monumento = (ctx, ox, oy, x, y) => {         // Monumento a la Independencia: escalinata y figura de bronce
  PINTORES.camino(ctx, ox, oy, x, y);
  pinta(ctx, 'rgba(0,0,0,.22)', ox + 1, oy + 14, 15, 2);
  for(let i = 0; i < 4; i++) pinta(ctx, i % 2 ? '#A9A79B' : '#BEBCAF', ox + 1 + i, oy + 14 - i * 2, 14 - i * 2, 2);   // escalinata
  pinta(ctx, '#8E8C82', ox + 5, oy + 5, 6, 4); pinta(ctx, '#A9A79B', ox + 5, oy + 5, 6, 1);                           // pedestal
  pinta(ctx, '#4F7D5C', ox + 7, oy + 1, 2, 4);         // figura de bronce
  pinta(ctx, '#6FA37E', ox + 7, oy + 0, 2, 1);
  pinta(ctx, '#4F7D5C', ox + 9, oy + 1, 3, 1); pinta(ctx, '#4F7D5C', ox + 11, oy - 0, 1, 1);   // brazo en alto
};
PINTORES.ingenio = (ctx, ox, oy, x, y) => {          // Ingenio Ledesma: chimenea de ladrillo y galpón
  PINTORES.pasto(ctx, ox, oy, x, y);
  pinta(ctx, 'rgba(0,0,0,.22)', ox + 1, oy + 14, 15, 2);
  pinta(ctx, '#9AA3AD', ox + 1, oy + 8, 10, 6); pinta(ctx, '#7B858F', ox + 1, oy + 8, 10, 1); pinta(ctx, '#7B858F', ox + 1, oy + 12, 10, 2);
  pinta(ctx, '#B5573A', ox + 11, oy + 2, 3, 12); pinta(ctx, '#8E3F29', ox + 13, oy + 2, 1, 12); pinta(ctx, '#2B2B2B', ox + 11, oy + 2, 3, 1);
  pinta(ctx, '#E8E8E8', ox + 10, oy + 0, 3, 1); pinta(ctx, '#D2D2D2', ox + 12, oy - 1, 3, 1);   // humo
  pinta(ctx, '#5E7A9C', ox + 3, oy + 10, 2, 2); pinta(ctx, '#5E7A9C', ox + 7, oy + 10, 2, 2);
};
PINTORES.llama = (ctx, ox, oy, x, y) => {             // llama, blanca, marrón o manchada
  PINTORES.pasto(ctx, ox, oy, x, y);
  const v = ruido(x, y, 180), cuerpo = v > .66 ? '#F2EBDD' : v > .33 ? '#B98B5E' : '#7A5638', sombra = tono(cuerpo, -.2);
  pinta(ctx, 'rgba(0,0,0,.2)', ox + 3, oy + 14, 11, 2);
  pinta(ctx, cuerpo, ox + 4, oy + 7, 9, 5); pinta(ctx, sombra, ox + 4, oy + 11, 9, 1);
  pinta(ctx, cuerpo, ox + 3, oy + 2, 2, 7);            // cuello largo
  pinta(ctx, cuerpo, ox + 2, oy + 1, 3, 2);            // cabeza
  pinta(ctx, '#3A2A1E', ox + 2, oy + 1, 1, 1);
  pinta(ctx, cuerpo, ox + 4, oy + 0, 1, 2);            // orejas
  [5, 7, 10, 12].forEach(dx => pinta(ctx, sombra, ox + dx, oy + 12, 1, 3));   // patas
  if(v > .33 && v < .5) pinta(ctx, '#F2EBDD', ox + 7, oy + 8, 3, 2);
  pinta(ctx, '#D84C4C', ox + 5, oy + 7, 1, 2);         // arete de lana colorida
};
PINTORES.flamenco = (ctx, ox, oy, x, y) => {          // flamenco rosado en la orilla
  PINTORES.arena(ctx, ox, oy, x, y);
  pinta(ctx, 'rgba(0,0,0,.15)', ox + 4, oy + 14, 8, 1);
  pinta(ctx, '#F28BA8', ox + 5, oy + 6, 6, 4); pinta(ctx, '#E0627F', ox + 5, oy + 9, 6, 1);
  pinta(ctx, '#F28BA8', ox + 4, oy + 2, 2, 5);         // cuello en S
  pinta(ctx, '#F28BA8', ox + 4, oy + 1, 3, 1);
  pinta(ctx, '#2B2B2B', ox + 6, oy + 1, 2, 1);         // pico
  pinta(ctx, '#E05A7A', ox + 7, oy + 10, 1, 5);        // patas
  if(ruido(x, y, 181) > .5) pinta(ctx, '#E05A7A', ox + 9, oy + 10, 1, 3);
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
/* Personajes elegibles (se elige UNA vez, como el nombre). May (Rubí/Zafiro,
   pañuelo y ropa roja) la pidió Zeta para las chicas: hoja de FireRed armada
   con la misma grilla 4x4 de 48x72 que la de Red. Se guarda en el celular y,
   con servidor, también en la cuenta (POST /avatar) para que lo vean los demás
   y no se pregunte de nuevo en otro celular. */
const AVATARES = {
  red: {src: 'images/red_walk.png', fw: 48, fh: 72, w: 14, h: 21, suave: true},
  may: {src: 'images/may_walk.png', fw: 16, fh: 21, w: 16, h: 21, suave: false}   // ya viene a tamaño real: se copia pixel por pixel
};
let avatarActual = 'red';
try{ if(AVATARES[localStorage.getItem('album-avatar')]) avatarActual = localStorage.getItem('album-avatar'); }catch(e){}
/* las dos hojas cargadas siempre: en la Aventura en vivo se ven Reds y Mays a la vez */
const HOJAS = {};
for(const a in AVATARES){ HOJAS[a] = new Image(); HOJAS[a].src = AVATARES[a].src; }
function fijarAvatar(a, subir = true){
  avatarActual = a;
  try{ localStorage.setItem('album-avatar', a); }catch(e){}
  if(subir) subirAvatar(a);
}
function subirAvatar(a){
  if(MODO_SERVIDOR && typeof api === 'function' && tokenServidor) api('/avatar', {avatar: a})
    .then(res => { if(res && AVATARES[res.avatar] && res.avatar !== avatarActual) fijarAvatar(res.avatar, false); })   // la cuenta ya tenía otro: manda ése
    .catch(() => {});
}
/* Zeta 25/10: que cada chico elija personaje al crear su nombre, y los que ya
   tenían cuenta también (una sola vez, al entrar). `luego` sigue con lo que
   venía (p. ej. ofrecer el PIN) cuando ya eligió. */
function pedirAvatarSiFalta(luego, delServidor){
  // el de la cuenta manda (eligió en otro celular)
  if(AVATARES[delServidor]){ if(delServidor !== avatarActual) fijarAvatar(delServidor, false); luego && luego(); return; }
  let elegido = null;
  try{ elegido = localStorage.getItem('album-avatar'); }catch(e){ elegido = 'red'; }   // sin almacenamiento no se puede recordar: no molestar
  // ya había elegido en este celular antes de que se guardara en el servidor: se sube solo
  if(AVATARES[elegido]){ if(delServidor === null) subirAvatar(elegido); luego && luego(); return; }
  const ov = document.getElementById('avatarOverlay');
  ov.querySelectorAll('.avatar-op').forEach(b => b.onclick = () => {
    fijarAvatar(b.dataset.avatar);
    ov.classList.remove('show');
    luego && luego();
  });
  ov.classList.add('show');
}
const RED_FILA = {abajo: 0, izq: 1, der: 2, arriba: 3};

/* Sólo hay 16 combinaciones (4 direcciones x 4 cuadros), así que el recorte
   + suavizado + contorno se hace una sola vez por combinación y se cachea. */
const JUGADOR_SPRITE_CACHE = {};
function spriteJugadorCacheado(dir, paso, av = avatarActual){
  if(!AVATARES[av]) av = 'red';
  const clave = av + '|' + dir + '|' + paso;
  if(JUGADOR_SPRITE_CACHE[clave]) return JUGADOR_SPRITE_CACHE[clave];
  const HOJA = HOJAS[av];
  if(!HOJA.complete || !HOJA.naturalWidth) return null;   // todavía cargando
  const fila = RED_FILA[dir] ?? 0;
  const A = AVATARES[av];
  const cv = document.createElement('canvas');
  cv.width = A.w; cv.height = A.h;
  const cctx = cv.getContext('2d');
  cctx.imageSmoothingEnabled = false;
  if(!A.suave){
    cctx.drawImage(HOJA, paso * A.fw, fila * A.fh, A.fw, A.fh, 0, 0, A.w, A.h);
  }else{
  /* Reducir de 48x72 a 14x21 de UN salto con suavizado mezclaba de golpe
     brazos y piernas que en la hoja original están separados, y el
     resultado eran manchas grises/negras confusas -sobre todo en los
     cuadros de caminar (izq/der), que es justo donde se ven las piernas
     cruzadas-. Mismo arreglo que ya se usó para los legendarios y los
     íconos de pokébola: paso intermedio CON suavizado (conserva la
     silueta general) y recién ahí el final SIN suavizado (nitidez
     pixel-art, sin la mezcla de la reducción grande). */
  const inter = document.createElement('canvas');
  inter.width = A.fw / 2; inter.height = A.fh / 2;
  const ictx = inter.getContext('2d');
  ictx.imageSmoothingEnabled = true;
  ictx.drawImage(HOJA,
    paso * A.fw, fila * A.fh, A.fw, A.fh,
    0, 0, inter.width, inter.height);
  cctx.drawImage(inter, 0, 0, A.w, A.h);
  }
  const sprConBorde = agregarBordeCanvas(cv, '#1A1310');
  JUGADOR_SPRITE_CACHE[clave] = sprConBorde;
  return sprConBorde;
}

/* Personajes en alta resolución: se dibuja el cuadro de la hoja original (Red 48x72) sin achicarlo a 14x21.
   May es de 16x21: se agranda con píxeles nítidos (nearest) y recién después se ajusta a la pantalla. */
const HD_AVATAR = {red: {dw: 11.3, dh: 17, up: 1}, may: {dw: 12.4, dh: 16.4, up: 8}};   // ~1 casillero de alto (antes 1,5): el terreno pesa más
const HD_CACHE = {};
function spriteHD(av, dir, paso){
  if(!HD_AVATAR[av]) av = 'red';
  const k = av + '|' + dir + '|' + paso;
  if(HD_CACHE[k]) return HD_CACHE[k];
  const HOJA = HOJAS[av], A = AVATARES[av], H = HD_AVATAR[av];
  if(!HOJA || !HOJA.complete || !HOJA.naturalWidth) return null;
  const fila = RED_FILA[dir] ?? 0;
  const c = document.createElement('canvas');
  c.width = A.fw * H.up; c.height = A.fh * H.up;
  const cc = c.getContext('2d');
  cc.imageSmoothingEnabled = H.up === 1;   // Red ya es arte suave; May es pixel art
  cc.drawImage(HOJA, paso * A.fw, fila * A.fh, A.fw, A.fh, 0, 0, c.width, c.height);
  return HD_CACHE[k] = {c, dw: H.dw, dh: H.dh, av};
}
/* Sombra redonda y suave en el piso */
function sombraSuave(ctx, cx, cy, rx, ry, a){
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(10,14,8,${a})`); g.addColorStop(.55, `rgba(10,14,8,${(a * .62).toFixed(3)})`); g.addColorStop(1, 'rgba(10,14,8,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function dibujarEntrenador(ctx, ox, oy, dir, paso, av){
  ox = Math.round(ox); oy = Math.round(oy);
  sombraSuave(ctx, ox + 8, oy + 15, 5, 1.9, .40);
  const h = spriteHD(av, dir, paso);
  if(h){
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(h.c, ox + 8 - h.dw / 2, oy + 16 - h.dh, h.dw, h.dh);
    ctx.imageSmoothingEnabled = false;
    return;
  }
  const spr = spriteJugadorCacheado(dir, paso, av);
  if(spr) ctx.drawImage(spr, ox - (spr.width - 16) / 2, oy - 7);   // mientras carga la hoja: el de siempre
}
function dibujarJugador(ctx, ox, oy){ dibujarEntrenador(ctx, ox, oy, advDir, advPaso, avatarActual); }

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
  let base = chico < 420 ? 2.3 : chico < 700 ? 2.7 : 3.2;   // Zeta 27/10: con mejor gráfico se ve más terreno (antes 3 / 3,4 / 4)
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

/* ---------- Pokémon con sprite animado (los mismos de la Arena) ----------
   Se dibujan como <img> sobre el mapa: un GIF animado no se mueve si se pinta en un canvas. Los de la
   1ª a la 5ª generación tienen su versión animada; el resto cae al arte oficial (quieto, pero grande y nítido). */
/* Altura real de cada especie en decímetros (PokeAPI), índice = número de Pokédex - 1 */
const ALTURA_DM = [7,10,20,6,11,17,5,10,16,3,7,11,3,6,10,3,11,15,3,7,3,12,20,35,4,8,6,10,4,8,13,5,9,14,6,13,6,11,5,10,8,16,5,8,12,3,10,10,15,2,7,4,10,8,17,5,10,7,19,6,10,13,9,13,15,8,15,16,7,10,17,9,16,4,10,14,10,17,12,16,3,10,8,14,18,11,17,9,12,3,15,13,16,15,88,10,16,4,13,5,12,4,20,4,10,15,14,12,6,12,10,19,11,10,22,4,12,6,13,8,11,13,15,14,11,13,15,14,9,65,25,3,3,10,8,9,8,4,10,5,13,18,21,17,16,20,18,40,22,20,4,9,12,18,5,9,17,6,11,23,8,18,7,16,10,14,5,11,18,5,12,3,3,3,3,6,2,15,6,8,14,4,4,8,12,11,4,6,8,8,3,8,12,4,14,9,10,5,20,7,5,13,15,6,12,15,11,92,6,14,5,18,6,15,9,6,18,7,8,4,11,6,6,9,9,21,17,6,14,18,5,11,6,14,12,7,14,4,6,7,12,15,19,21,20,6,12,20,52,38,6,5,9,17,4,9,19,4,7,15,5,10,4,5,3,6,10,7,12,5,12,15,5,10,13,3,7,6,12,4,8,16,5,8,4,12,8,14,20,5,8,8,6,10,15,10,23,2,10,6,11,5,6,4,9,21,6,13,6,15,4,4,7,6,3,4,17,8,18,20,145,7,19,5,7,9,11,7,11,20,4,13,4,11,13,27,10,12,4,9,6,11,5,15,10,15,7,15,6,62,3,10,6,11,8,16,20,6,12,6,7,15,8,11,14,4,17,18,10,6,6,11,15,6,12,16,17,18,19,14,20,45,35,70,3,17,4,11,22,5,9,12,4,8,17,3,6,12,5,10,3,10,5,9,14,2,9,9,16,5,13,2,5,9,3,12,4,7,11,4,5,3,9,12,4,12,4,12,9,9,5,10,2,4,10,5,13,5,6,6,5,10,7,14,19,6,7,12,8,20,8,13,7,13,14,4,12,10,10,22,11,12,17,24,20,18,16,15,19,10,8,20,25,9,16,14,22,13,3,3,3,3,54,42,17,37,45,15,4,3,15,2,32,4,6,8,33,5,10,16,5,8,15,5,11,4,9,12,4,11,6,11,6,10,6,10,6,11,3,6,12,8,16,4,9,17,4,9,3,7,11,6,12,14,5,8,15,13,14,3,5,12,4,12,25,3,7,5,11,10,7,10,15,6,13,10,3,14,6,11,14,5,17,7,12,5,14,6,19,7,16,4,5,4,7,15,3,6,10,5,13,4,11,13,6,19,4,5,10,2,6,12,22,12,1,8,6,10,3,6,6,2,12,21,5,10,3,6,10,6,10,18,5,26,11,4,8,7,9,14,16,10,28,5,16,16,5,15,5,12,14,3,8,14,18,11,16,21,19,20,15,15,32,29,15,30,14,6,15,4,7,16,4,10,15,3,6,15,4,10,3,7,12,3,3,12,6,15,1,2,11,9,17,6,21,12,3,6,8,8,17,2,8,4,8,4,15,5,13,5,18,5,13,5,10,8,25,13,27,10,8,2,3,3,8,20,2,4,15,4,9,10,20,5,15,30,58,50,7,5,17,3,7,16,4,7,18,4,6,18,3,6,11,4,7,4,5,15,6,17,6,1,2,5,8,2,4,7,10,25,3,18,3,9,2,10,6,12,5,21,3,7,12,1,15,20,5,20,5,13,3,19,23,3,4,20,3,2,9,30,39,6,12,16,18,12,19,13,2,1,34,40,12,24,18,38,92,3,55,24,10,7,6,36,55,18,15,2,25,3,7,21,3,6,14,3,7,19,3,6,2,8,22,4,4,4,6,12,4,5,6,13,3,10,3,10,3,11,28,2,3,4,22,38,8,5,13,4,16,7,30,6,16,1,2,4,6,21,4,8,15,16,8,10,8,15,16,2,3,30,3,3,13,25,14,9,3,12,30,18,23,23,20,18,5,14,30,28,29,200,6,19,18,12,21,22,20,11,18,18,24,30,13,25,16,4,9,15,4,10,16,5,12,18,5,10,3,10,2,10,3,4,9,3,3,3,5,3,6,14,6,4,6,23,6,15,16,3,12,4,14,5,11,2,7,6,12,9,19,13,3,9,2,3,2,19,4,7,7,12,12,15,13,13,10,18,16,25,7,15,6,20,16,12,45,25,120,3,12,18,32,36,20,22,12,12,14,32,23,9,6,18,13,12,16,5,8,21,3,12,15,19,27,4,20,14,25,35,35,15,4,1,2,18,10,14,12,20,18,35,52,15,16,2,3];
const GIF_ANIM = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/animated/';
/* Rectángulo del dibujo sin el margen transparente (primer cuadro), para poder darle el tamaño real */
function cuerpoDeSprite(im){
  try{
    const w = im.naturalWidth, h = im.naturalHeight;
    if(!w || !h) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', {willReadFrequently: true});
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, w, h).data;
    let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) if(d[(y * w + x) * 4 + 3] > 24){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
    return x1 < 0 ? null : {l: x0, r: x1 + 1, t: y0, b: y1 + 1};
  }catch(e){ return null; }
}
function sincronizarSprites(lista, escala){
  const caja = document.getElementById('advSprites');
  if(!caja) return;
  while(caja.children.length < lista.length){
    const im = document.createElement('img');
    im.alt = ''; im.draggable = false;
    im.crossOrigin = 'anonymous';   // el CDN lo permite: hace falta para medir el cuerpo real del sprite (sin el margen transparente)
    im.onerror = () => { if(im.dataset.fallo !== '1'){ im.dataset.fallo = '1'; im._bb = null; im.style.imageRendering = 'auto'; im.src = im.dataset.arte; } };
    im.onload = () => { im._bb = cuerpoDeSprite(im); };
    caja.appendChild(im);
  }
  const t = Date.now() / 1000;
  [...caja.children].forEach((im, i) => {
    const o = lista[i];
    if(!o){ im.style.display = 'none'; return; }
    const clave = String(o.p.id);
    if(im.dataset.id !== clave){
      im.dataset.id = clave; im.dataset.fallo = ''; im.dataset.arte = o.p.img || '';
      im.style.imageRendering = 'pixelated';
      im.src = o.p.id <= 649 ? GIF_ANIM + o.p.id + '.gif' : (o.p.img || '');
      if(o.p.id > 649) im.style.imageRendering = 'auto';
    }
    const nw = im.naturalWidth || 96, nh = im.naturalHeight || 96;
    /* tamaño real: un entrenador mide 17 px de mundo (1,7 m); los demás salen de su altura (con curva suave: Pikachu
       queda chico y los gigantes no se comen el mapa). Se mide el CUERPO del sprite, no el cuadro con márgenes. */
    const m = ((ALTURA_DM[o.p.id - 1] || 12) / 10);
    const hMundo = Math.max(6.5, Math.min(34 * (o.mult || 1), 17 * Math.pow(m / 1.7, .62) * (o.mult || 1)));
    const bb = im._bb || {l: 0, r: nw, t: 0, b: nh};
    const z = hMundo * escala / Math.max(1, bb.b - bb.t);
    const flota = o.flota ? Math.sin(t * 2.4) * 1.6 * escala : 0;
    im.style.display = 'block';
    im.style.width = Math.round(nw * z) + 'px'; im.style.height = Math.round(nh * z) + 'px';
    im.style.left = Math.round((o.px + 8) * escala + (nw / 2 - (bb.l + bb.r) / 2) * z) + 'px';
    im.style.top = Math.round((o.py + 14.5) * escala + (nh - bb.b) * z - flota) + 'px';
    im.style.opacity = o.parpadea && Math.floor(t * 4) % 2 === 0 ? '.45' : '1';
  });
}

/* ---------- Capa "alta": copas de árboles por ENCIMA de los personajes ----------
   El mapa es una grilla de casilleros de 16 px, pero un árbol real es mucho más alto que una persona.
   Los árboles siguen ocupando UN casillero (la colisión no cambia), pero su copa se dibuja grande, hacia
   arriba, en un canvas aparte que va encima de los personajes: caminás "por detrás" de los árboles.
   Si el jugador o un Pokémon quedan tapados, la copa se vuelve semitransparente. */
const ALTA_S = 4;   // resolución con la que se pre-dibujan las copas (píxeles por píxel de mundo)
const ALTA_CACHE = {};
function rngSemilla(n){ let a = (n * 2654435761) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function lienzoAlto(w, h){ const c = document.createElement('canvas'); c.width = Math.ceil(w * ALTA_S); c.height = Math.ceil(h * ALTA_S); const g = c.getContext('2d'); g.scale(ALTA_S, ALTA_S); return [c, g]; }
/* nube de follaje: círculos con degradé (luz arriba a la izquierda), contorno oscuro y puntitos de hojas */
function follaje(g, W, H, cx, cy, rx, ry, pal, rng, n){
  const blobs = [];
  for(let i = 0; i < n; i++){
    const a = (i / n) * Math.PI * 2 + rng() * .6, d = .55 + rng() * .35;
    blobs.push([cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d * .9, Math.min(rx, ry) * (.42 + rng() * .22)]);
  }
  blobs.push([cx, cy - ry * .12, Math.min(rx, ry) * .8]);
  g.fillStyle = pal.oscuro;
  blobs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r + .9, 0, Math.PI * 2); g.fill(); });
  blobs.forEach(([x, y, r]) => {
    const gr = g.createRadialGradient(x - r * .35, y - r * .45, r * .08, x, y, r);
    gr.addColorStop(0, pal.claro); gr.addColorStop(.5, pal.hoja); gr.addColorStop(1, pal.medio);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  });
  g.save(); g.globalCompositeOperation = 'source-atop';
  const sombra = g.createLinearGradient(0, cy - ry * .1, 0, cy + ry);
  sombra.addColorStop(0, 'rgba(0,25,0,0)'); sombra.addColorStop(1, 'rgba(0,25,0,.38)');
  g.fillStyle = sombra; g.fillRect(0, 0, W, H);
  for(let i = 0; i < n * 9; i++){
    const x = cx + (rng() * 2 - 1) * rx * .85, y = cy + (rng() * 2 - 1) * ry * .8;
    const arriba = y < cy;
    g.fillStyle = arriba ? pal.claro : pal.oscuro; g.globalAlpha = .35 + rng() * .3;
    g.beginPath(); g.ellipse(x, y, .8 + rng() * 1.2, .5 + rng() * .6, rng() * 3, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
let COPA_HIST = null;
/* Algarrobo Histórico (fotos de Zeta): tronco ancho y retorcido, ramas muy gruesas que se enroscan y se bifurcan,
   y hojas finas y ralas en los extremos: se ven las ramas, el cielo y el piso entre medio. */
function copaHistorica(){
  if(COPA_HIST) return COPA_HIST;
  const W = 124, H = 104, [c, g] = lienzoAlto(W, H), rng = rngSemilla(4242);
  const cx = W / 2, cy = H / 2 + 6, puntas = [];
  g.lineCap = 'round'; g.lineJoin = 'round';
  const rama = (x, y, ang, largo, ancho, prof) => {
    const n = Math.max(3, Math.round(largo / 5)), pts = [[x, y]];
    let a = ang, px = x, py = y;
    for(let k = 1; k <= n; k++){
      a += (rng() - .5) * .9 + Math.sin(k * 1.3 + ang * 3) * .22;          // se retuerce
      px += Math.cos(a) * largo / n; py += Math.sin(a) * largo / n * .82;
      pts.push([px, py]);
    }
    const trazo = (col, k, desvio) => {
      g.strokeStyle = col; g.lineWidth = Math.max(.8, ancho * k); g.beginPath();
      pts.forEach(([qx, qy], i) => { const w = ancho * (1 - i / pts.length * .55); i ? g.lineTo(qx + desvio, qy + desvio) : g.moveTo(qx + desvio, qy + desvio); });
      g.stroke();
    };
    trazo('#2A1B10', 1.28, .8);       // sombra
    trazo('#4F3722', 1, 0);           // corteza
    trazo('#7A5A3A', .55, -.7);       // luz de arriba
    if(ancho > 2.2){ g.strokeStyle = '#2E1F12'; g.lineWidth = .7; for(let i = 1; i < pts.length - 1; i += 2){ g.beginPath(); g.moveTo(pts[i][0] - ancho * .2, pts[i][1] - 1); g.lineTo(pts[i + 1][0] + ancho * .15, pts[i + 1][1] + 1); g.stroke(); } }   // grietas
    const fin = pts[pts.length - 1];
    if(prof > 0){
      const hijas = prof > 1 ? 2 + (rng() < .5 ? 1 : 0) : 2;
      for(let h = 0; h < hijas; h++){
        const at = pts[Math.max(1, Math.floor(pts.length * (.45 + h * .25)))];
        rama(at[0], at[1], a + (h % 2 ? 1 : -1) * (.5 + rng() * .6), largo * (.55 + rng() * .15), ancho * .6, prof - 1);
      }
    } else puntas.push(fin);
  };
  for(let i = 0; i < 7; i++) rama(cx + (rng() - .5) * 5, cy + (rng() - .5) * 3, (i / 7) * Math.PI * 2 + rng() * .5, 26 + rng() * 6, 9.5, 3);   // ramas madre muy gruesas
  g.fillStyle = '#3E2A18'; g.beginPath(); g.ellipse(cx, cy, 9, 7.5, 0, 0, 6.3); g.fill();                                                   // cima del tronco
  g.fillStyle = '#5E442B'; g.beginPath(); g.ellipse(cx - 1.5, cy - 1.5, 6.5, 5, 0, 0, 6.3); g.fill();
  g.strokeStyle = '#2A1B10'; g.lineWidth = .8; for(let i = 0; i < 6; i++){ const a = i * 1.05; g.beginPath(); g.moveTo(cx + Math.cos(a) * 2, cy + Math.sin(a) * 2); g.lineTo(cx + Math.cos(a + .5) * 8, cy + Math.sin(a + .5) * 6.5); g.stroke(); }
  const hoja = (x, y, r) => {                                                     // racimo ralo de hojitas finas
    for(let i = 0; i < 5; i++){
      const a = rng() * 6.28, d = rng() * r, lx = x + Math.cos(a) * d, ly = y + Math.sin(a) * d * .8;
      g.fillStyle = ['#6E9A52', '#86B060', '#4F7A3E', '#9CC274'][i % 4]; g.globalAlpha = .9;
      g.beginPath(); g.ellipse(lx, ly, 2.3 + rng() * 1.2, 1 + rng() * .5, rng() * 3.1, 0, 6.3); g.fill();
    }
    g.globalAlpha = 1;
  };
  puntas.forEach(([x, y]) => { if(rng() < .8) hoja(x, y, 5.5); });
  return COPA_HIST = {c, w: W, h: H};
}
function copaAlta(tipo, variante){
  const k = tipo + variante;
  if(ALTA_CACHE[k]) return ALTA_CACHE[k];
  const rng = rngSemilla(variante * 977 + tipo.charCodeAt(0) * 31 + 7);
  let W, H, c, g, ancla;   // ancla = y (en el lienzo) donde la copa toca el casillero
  if(tipo === 'arbol' || tipo === 'cerezo'){
    W = 28; H = 30; [c, g] = lienzoAlto(W, H);
    const pal = tipo === 'cerezo' ? {hoja: '#D9578A', claro: '#F9B6CC', medio: '#B84673', oscuro: '#8E2F57'} : {hoja: '#2F7C2C', claro: '#62BE52', medio: '#256B24', oscuro: '#164A18'};
    follaje(g, W, H, W / 2, 14.5, 12.6, 13.4, pal, rng, 9);
    if(tipo === 'cerezo'){ g.fillStyle = '#FFFFFF'; for(let i = 0; i < 9; i++){ g.globalAlpha = .75; g.beginPath(); g.arc(5 + rng() * 18, 4 + rng() * 18, .8 + rng() * .6, 0, 6.3); g.fill(); } g.globalAlpha = 1; }
    ancla = 28.5;
  } else if(tipo === 'algarrobo' || tipo === 'historico'){
    const gr = tipo === 'historico';
    W = gr ? 46 : 38; H = gr ? 44 : 36; [c, g] = lienzoAlto(W, H);
    const pal = {hoja: '#5F8A4A', claro: '#9CBF76', medio: '#4A7240', oscuro: '#2F4D2C'};
    g.fillStyle = '#4E3520'; g.fillRect(W / 2 - (gr ? 3 : 2), H - 16, gr ? 6 : 4, 16);   // tronco
    follaje(g, W, H, W / 2, H * .44, W * .46, H * .4, pal, rng, gr ? 12 : 10);
    ancla = H;
  } else if(tipo === 'cedro'){
    W = 22; H = 46; [c, g] = lienzoAlto(W, H);
    g.fillStyle = '#4E3520'; g.fillRect(W / 2 - 1.5, H - 9, 3, 9);
    const cols = ['#1B4D2A', '#22603A', '#2A7447', '#33885A'];
    for(let t = 0; t < 5; t++){                                 // pisos de la conífera, de abajo hacia arriba
      const y1 = H - 8 - t * 7.4, y0 = y1 - 11, w = 10.5 - t * 1.6;
      const gr = g.createLinearGradient(W / 2 - w, 0, W / 2 + w, 0);
      gr.addColorStop(0, cols[Math.min(3, t)]); gr.addColorStop(.45, '#3E9966'); gr.addColorStop(1, '#14402A');
      g.fillStyle = '#0F3320'; g.beginPath(); g.moveTo(W / 2, y0 - .8); g.lineTo(W / 2 + w + .9, y1 + .5); g.lineTo(W / 2 - w - .9, y1 + .5); g.closePath(); g.fill();
      g.fillStyle = gr; g.beginPath(); g.moveTo(W / 2, y0); g.lineTo(W / 2 + w, y1); g.lineTo(W / 2 - w, y1); g.closePath(); g.fill();
    }
    ancla = H;
  } else {   // palmera
    W = 34; H = 48; [c, g] = lienzoAlto(W, H);
    g.strokeStyle = '#8A6A44'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(W / 2 - 1, H); g.quadraticCurveTo(W / 2 + 4, H * .55, W / 2 + 1, 15); g.stroke();
    g.strokeStyle = '#5E4528'; g.lineWidth = 1; for(let y = H - 4; y > 18; y -= 4){ g.beginPath(); g.moveTo(W / 2 - 1 + (H - y) * .05, y); g.lineTo(W / 2 + 2 + (H - y) * .05, y - 1); g.stroke(); }
    for(let i = 0; i < 8; i++){                                  // hojas largas y caídas
      const a = (i / 8) * Math.PI * 2 + .2, lx = Math.cos(a) * 14, ly = Math.sin(a) * 6;
      g.strokeStyle = i % 2 ? '#2E8B3A' : '#3EA64B'; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(W / 2 + 1, 15); g.quadraticCurveTo(W / 2 + 1 + lx * .6, 15 - 7 + ly * .3, W / 2 + 1 + lx, 15 + 3 + Math.abs(ly) * .8); g.stroke();
    }
    g.fillStyle = '#6B4A2A'; g.beginPath(); g.arc(W / 2 + 1, 16, 2.2, 0, 6.3); g.fill();
    ancla = H;
  }
  return ALTA_CACHE[k] = {c, w: W, h: H, ancla};
}
/* ---------- Edificios altos (misma capa que las copas) ----------
   Las construcciones del mapa son de 1 casillero de alto (una catedral = 1,7 m). Se dibujan como fachadas mucho más
   altas, hacia arriba, sin tocar el mapa ni la colisión (no se crea ningún espacio muerto). Si alguien camina detrás
   de la parte alta, el edificio se vuelve semitransparente, igual que los árboles. */
const EDIF_FAMILIAS = [['gobierno', 'GQ', 1], ['catedral', 'KJ', 5], ['cabildo', 'Dd', 3], ['iglesia', 'I', 3], ['centro', 'pqrP', 1], ['adobe', 'h', 1], ['estacion', 'Y', 1]];
const EDIF_CACHE = {};   // por mapa: lista de {tipo, x0, y0, w, h, extra}
function edificiosDe(mapaId){
  if(EDIF_CACHE[mapaId]) return EDIF_CACHE[mapaId];
  const mapa = ADV_MAPS[mapaId], H = mapa.rows.length, W = mapa.cols, lista = [], visto = new Set();
  if(mapaId === 'overworld') for(const [tipo, chars, extra] of EDIF_FAMILIAS){
    for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){
      if(!chars.includes(mapa.rows[y][x]) || visto.has(x + ',' + y)) continue;
      const pila = [[x, y]]; visto.add(x + ',' + y);
      let x0 = x, x1 = x, y0 = y, y1 = y;
      while(pila.length){
        const [a, b] = pila.pop();
        x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b);
        for(const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
          const nx = a + dx, ny = b + dy;
          if(nx >= 0 && ny >= 0 && nx < W && ny < H && chars.includes(mapa.rows[ny][nx]) && !visto.has(nx + ',' + ny)){ visto.add(nx + ',' + ny); pila.push([nx, ny]); }
        }
      }
      lista.push({tipo, x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1, extra});
    }
  }
  return EDIF_CACHE[mapaId] = lista;
}
function rectG(g, x, y, w, h, c0, c1){ const gr = g.createLinearGradient(x, y, x + w, y); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(x, y, w, h); }
function ventana(g, x, y, w, h, marco){ g.fillStyle = marco; g.fillRect(x - .6, y - .6, w + 1.2, h + 1.2); const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#9CC7E8'); gr.addColorStop(1, '#3E6A93'); g.fillStyle = gr; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x + .5, y + .5, w * .35, h * .3); }
function techoTejas(g, x, y, w, h, c0, c1, c2){ rectG(g, x, y, w, h, c0, c1); g.fillStyle = c2; for(let i = 2; i < h; i += 2.6) g.fillRect(x, y + i, w, .5); }
function puerta(g, x, y, w, h, c, arco){ g.fillStyle = c; if(arco){ g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.fill(); } else g.fillRect(x, y, w, h); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + w / 2 - .3, y + 2, .6, h - 2); }
function fachada(e){
  const k = e.tipo + e.w + 'x' + e.h + '/' + (e.x0 * 7 + e.y0 * 13) % 3;
  if(ALTA_CACHE[k]) return ALTA_CACHE[k];
  const base = e.h * ADV_PX, alto = base + e.extra * ADV_PX, W = e.w * ADV_PX + 6, H = alto + 8;
  const [c, g] = lienzoAlto(W, H);
  const x0 = 3, xr = W - 3, wb = xr - x0, yb = H;                // yb = piso (borde inferior del edificio)
  const sombraLado = (x, y, w, h) => { g.fillStyle = 'rgba(40,20,10,.16)'; g.fillRect(x, y, w, h); };
  const var_ = (e.x0 * 7 + e.y0 * 13) % 3;
  if(e.tipo === 'gobierno'){            // neoclásico: crema, columnata, frontón con bandera, techo azul pizarra
    const top = yb - alto + 9;
    rectG(g, x0, top + 5, wb, yb - top - 5, '#F2E6C4', '#D8C898');
    techoTejas(g, x0 - 2, top - 2, wb + 4, 8, '#6E7F99', '#4C5C75', 'rgba(255,255,255,.18)');
    g.fillStyle = '#EDE0B8'; g.beginPath(); g.moveTo(W / 2 - 12, top + 5); g.lineTo(W / 2, top - 7); g.lineTo(W / 2 + 12, top + 5); g.closePath(); g.fill();   // frontón
    g.strokeStyle = '#B9A672'; g.lineWidth = .8; g.stroke();
    g.fillStyle = '#C0392B'; g.fillRect(W / 2 - .4, top - 14, .8, 8); g.fillStyle = '#74ACDF'; g.fillRect(W / 2 + .4, top - 14, 5, 1.6); g.fillStyle = '#FFF'; g.fillRect(W / 2 + .4, top - 12.4, 5, 1.6); g.fillStyle = '#74ACDF'; g.fillRect(W / 2 + .4, top - 10.8, 5, 1.6);   // bandera
    const cols = Math.max(4, Math.round(wb / 9));
    for(let i = 0; i < cols; i++){ const cx = x0 + 4 + i * ((wb - 8) / (cols - 1)); rectG(g, cx - 1.3, top + 8, 2.6, yb - top - 14, '#FFF8E4', '#CFC096'); }
    for(let r = 0; r < 2; r++) for(let i = 0; i < cols - 1; i++){ const cx = x0 + 4 + (i + .5) * ((wb - 8) / (cols - 1)); ventana(g, cx - 1.6, top + 11 + r * 11, 3.2, 6, '#FFF8E4'); }
    puerta(g, W / 2 - 2.5, yb - 12, 5, 12, '#5B3A22', true);
    g.fillStyle = '#C9B98A'; g.fillRect(x0 - 1, yb - 2, wb + 2, 2);
  } else if(e.tipo === 'catedral'){     // dos torres con campanario y cúpula, rosetón central
    const top = yb - alto + 4, tw = 12;
    rectG(g, x0 + 2, top + 22, wb - 4, yb - top - 22, '#EFE3C8', '#CDBB93');
    for(const tx of [x0, xr - tw]){
      rectG(g, tx, top + 8, tw, yb - top - 8, '#F4E9D0', '#C9B68B');
      g.fillStyle = '#8C5A3C'; g.beginPath(); g.moveTo(tx - 1, top + 9); g.lineTo(tx + tw / 2, top - 4); g.lineTo(tx + tw + 1, top + 9); g.closePath(); g.fill();   // aguja
      g.fillStyle = '#E8D9B0'; g.fillRect(tx + tw / 2 - .5, top - 9, 1, 6); g.fillRect(tx + tw / 2 - 2, top - 7.5, 4, 1);   // cruz
      puerta(g, tx + 3.5, top + 13, 5, 9, '#2E2118', true);
      ventana(g, tx + 4, top + 28, 4, 8, '#F7EBCB');
    }
    g.fillStyle = '#E3D2A6'; g.beginPath(); g.moveTo(x0 + 8, top + 22); g.lineTo(W / 2, top + 8); g.lineTo(xr - 8, top + 22); g.closePath(); g.fill();
    g.fillStyle = '#4E7A9A'; g.beginPath(); g.arc(W / 2, top + 26, 4.2, 0, 6.3); g.fill(); g.strokeStyle = '#F7EBCB'; g.lineWidth = .9; g.stroke();
    puerta(g, W / 2 - 3, yb - 14, 6, 14, '#4A2F1C', true);
  } else if(e.tipo === 'cabildo'){      // colonial: blanco con arcadas y torre de reloj, teja roja
    const top = yb - alto + 10;
    rectG(g, x0, top + 6, wb, yb - top - 6, '#FBF6EA', '#DDD3BC');
    techoTejas(g, x0 - 1.5, top, wb + 3, 7, '#B8553A', '#8E3F2B', 'rgba(0,0,0,.2)');
    const n = Math.max(3, Math.round(wb / 8));
    for(let i = 0; i < n; i++){ const cx = x0 + 3 + i * ((wb - 6) / (n - 1)) - 2.4; puerta(g, cx, yb - 12, 4.8, 12, '#8C7A5E', true); ventana(g, cx + 1, top + 11, 2.8, 5, '#FFF'); }
    rectG(g, W / 2 - 5, top - 12, 10, 18, '#FBF6EA', '#D5CAB0'); techoTejas(g, W / 2 - 6, top - 17, 12, 5, '#B8553A', '#8E3F2B', 'rgba(0,0,0,.2)');
    g.fillStyle = '#fff'; g.beginPath(); g.arc(W / 2, top - 7, 3, 0, 6.3); g.fill(); g.strokeStyle = '#3B3A36'; g.lineWidth = .7; g.stroke();
    g.beginPath(); g.moveTo(W / 2, top - 7); g.lineTo(W / 2, top - 9); g.moveTo(W / 2, top - 7); g.lineTo(W / 2 + 1.6, top - 6.4); g.stroke();
  } else if(e.tipo === 'iglesia'){      // capilla blanca con campanario
    const top = yb - alto + 8;
    rectG(g, x0 + 1, top + 12, wb - 2, yb - top - 12, '#F7F1E3', '#D9CFB8');
    rectG(g, W / 2 - 4, top, 8, 14, '#F7F1E3', '#D2C7AE');
    g.fillStyle = '#9B4A32'; g.beginPath(); g.moveTo(W / 2 - 5, top + 1); g.lineTo(W / 2, top - 8); g.lineTo(W / 2 + 5, top + 1); g.closePath(); g.fill();
    g.fillStyle = '#E8D9B0'; g.fillRect(W / 2 - .4, top - 13, .8, 6); g.fillRect(W / 2 - 1.6, top - 11.4, 3.2, .8);
    puerta(g, W / 2 - 1.4, top + 4, 2.8, 5, '#2E2118', true);
    techoTejas(g, x0, top + 11, wb, 4, '#B8553A', '#8E3F2B', 'rgba(0,0,0,.2)');
    puerta(g, W / 2 - 2, yb - 8, 4, 8, '#4A2F1C', true);
  } else if(e.tipo === 'centro'){       // Centro Pokémon: techo rojo, paredes blancas, pokébola
    const top = yb - alto + 6;
    rectG(g, x0, top + 12, wb, yb - top - 12, '#FFFFFF', '#E1E4EA');
    techoTejas(g, x0 - 2, top, wb + 4, 14, '#E5484D', '#B8262C', 'rgba(255,255,255,.22)');
    g.fillStyle = '#fff'; g.beginPath(); g.arc(W / 2, top + 7, 4, 0, 6.3); g.fill(); g.fillStyle = '#E5484D'; g.beginPath(); g.arc(W / 2, top + 7, 4, Math.PI, 0); g.fill();
    g.strokeStyle = '#2B2F3A'; g.lineWidth = .7; g.beginPath(); g.arc(W / 2, top + 7, 4, 0, 6.3); g.moveTo(W / 2 - 4, top + 7); g.lineTo(W / 2 + 4, top + 7); g.stroke();
    ventana(g, x0 + 3, top + 17, 5, 6, '#fff'); ventana(g, xr - 8, top + 17, 5, 6, '#fff');
    puerta(g, W / 2 - 3, yb - 10, 6, 10, '#6FA8DC', false);
  } else if(e.tipo === 'estacion'){     // estación del Tren Solar
    const top = yb - alto + 8;
    rectG(g, x0, top + 7, wb, yb - top - 7, '#F1EADB', '#D5CDB8');
    techoTejas(g, x0 - 2, top, wb + 4, 8, '#E8631F', '#C24E12', 'rgba(255,255,255,.25)');
    ventana(g, x0 + 3, top + 12, 4, 5, '#fff'); ventana(g, xr - 7, top + 12, 4, 5, '#fff');
    g.fillStyle = '#2A2E36'; g.fillRect(W / 2 - 4, top + 2, 8, 3.4); g.fillStyle = '#FFD166'; g.fillRect(W / 2 - 3, top + 3, 6, 1.2);
    puerta(g, W / 2 - 2.2, yb - 9, 4.4, 9, '#3A4B5E', false);
  } else {                              // casa de adobe: ocre con techo plano y vigas
    const top = yb - alto + 4, tonos = [['#D9A66C', '#B98450'], ['#CF9A62', '#AE7A48'], ['#E0B07A', '#C08C58']][var_];
    rectG(g, x0, top + 4, wb, yb - top - 4, tonos[0], tonos[1]);
    g.fillStyle = '#9A6B3E'; g.fillRect(x0 - 1, top + 1, wb + 2, 4);
    g.fillStyle = '#6B4A2A'; for(let i = 0; i < Math.floor(wb / 5); i++) g.fillRect(x0 + 1.5 + i * 5, top + 3, 1.6, 2.4);   // cabezas de viga
    puerta(g, W / 2 - 2, yb - 8, 4, 8, '#5B3A22', false);
    if(wb > 20) ventana(g, x0 + 3, top + 10, 3.6, 4.2, '#7A5330');
    sombraLado(xr - 3, top + 5, 3, yb - top - 5);
  }
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x0, yb - 1.2, wb, 1.2);
  return ALTA_CACHE[k] = {c, w: W, h: H, ancla: H, base, alto};
}
const ALTA_TIPOS = {'#': 'arbol', 'n': 'palmera', 'g': 'cedro', 's': 'algarrobo', 'A': 'historico'};
const altaAlfa = {};
function advAltoRender(mapa, camX, camY, vw, vh, kk, cw, chh, tapa){
  const cv = document.getElementById('advAlto');
  if(!cv) return;
  if(cv.width !== cw || cv.height !== chh){ cv.width = cw; cv.height = chh; }
  const g = cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  if(advMapa !== 'overworld') return;   // las letras de la cueva significan otra cosa
  g.setTransform(kk, 0, 0, kk, 0, 0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const x0 = Math.max(0, Math.floor(camX / ADV_PX) - 2), x1 = Math.min(mapa.cols - 1, Math.ceil((camX + vw) / ADV_PX) + 2);
  const y0 = Math.max(0, Math.floor(camY / ADV_PX) - 1), y1 = Math.min(mapa.rows.length - 1, Math.ceil((camY + vh) / ADV_PX) + 4);
  const vistos = {};
  for(const e of edificiosDe('overworld')){
    const f = fachada(e);
    const dx = e.x0 * ADV_PX - camX - 3, dy = (e.y0 + e.h) * ADV_PX - camY - f.h;
    if(dx > vw + 8 || dx + f.w < -8 || dy > vh + 8 || dy + f.h < -8) continue;
    let alvo = 1;
    const altoSobre = f.h - f.base;   // la parte que sobresale por encima del casillero original
    for(const t of tapa){ if(t.x1 > dx + 1 && t.x0 < dx + f.w - 1 && t.y1 > dy + 2 && t.y0 < dy + altoSobre - 2){ alvo = .4; break; } }
    const key = 'e' + e.x0 + ',' + e.y0;
    const a = altaAlfa[key] === undefined ? alvo : altaAlfa[key] + (alvo - altaAlfa[key]) * .3;
    vistos[key] = a;
    g.globalAlpha = a;
    g.drawImage(f.c, dx, dy, f.w, f.h);
  }
  for(let y = y0; y <= y1; y++){
    const fila = mapa.rows[y];
    for(let x = x0; x <= x1; x++){
      let tipo = ALTA_TIPOS[fila[x]];
      if(!tipo || tipo === 'historico') continue;   // el histórico se dibuja una sola vez, abajo
      if(tipo === 'algarrobo' && ((x + y) & 1)) continue;   // las plazas son densas: una de cada dos, así no se amontonan las copas
      const r = ruido(x, y, 91), v = Math.floor(ruido(x, y, 17) * 4);
      if(tipo === 'arbol' && r > .78) tipo = 'cerezo';
      const copa = copaAlta(tipo, v);
      const ox = x * ADV_PX - camX, oy = y * ADV_PX - camY;
      const dx = ox + 8 - copa.w / 2, dy = oy + 11.5 - copa.ancla;
      // ¿hay alguien detrás de la copa? entonces se hace transparente (suave)
      let alvo = 1;
      for(const t of tapa){ if(t.x1 > dx + 2 && t.x0 < dx + copa.w - 2 && t.y1 > dy + 2 && t.y0 < dy + copa.ancla - 2 && t.pie < oy + 12){ alvo = .38; break; } }
      const key = x + ',' + y;
      const a = altaAlfa[key] === undefined ? alvo : altaAlfa[key] + (alvo - altaAlfa[key]) * .3;
      vistos[key] = a;
      g.globalAlpha = a;
      g.drawImage(copa.c, dx, dy, copa.w, copa.h);
    }
  }
  for(const A of ALGARROBOS){                          // Algarrobo Histórico: UNA copa enorme sobre toda la reja
    const copa = copaHistorica();
    const dx = A[0] * ADV_PX - camX - copa.w / 2, dy = A[1] * ADV_PX - camY - copa.h / 2 - 8;
    if(dx > vw + 8 || dx + copa.w < -8 || dy > vh + 8 || dy + copa.h < -8) continue;
    let alvo = 1;
    for(const t of tapa){ if(t.x1 > dx + 8 && t.x0 < dx + copa.w - 8 && t.y1 > dy + 8 && t.y0 < dy + copa.h - 14){ alvo = .38; break; } }
    const key = 'h' + A[0] + ',' + A[1];
    const a = altaAlfa[key] === undefined ? alvo : altaAlfa[key] + (alvo - altaAlfa[key]) * .3;
    vistos[key] = a; g.globalAlpha = a;
    g.drawImage(copa.c, dx, dy, copa.w, copa.h);
  }
  g.globalAlpha = 1;
  for(const k in altaAlfa) delete altaAlfa[k];
  Object.assign(altaAlfa, vistos);
}

/* Realce del piso (cada cuadro, sólo lo que se ve): sombras suaves de árboles, montañas y edificios,
   y brillos que se mueven en el agua. El mapa de fondo sigue siendo el de siempre. */
const ALTO_SOMBRA = {'#': [9.5, 3.4, .30], 'H': [11, 3.4, .30], 'G': [11, 3.6, .30], 'K': [11, 3.6, .30], 'D': [11, 3.6, .30], 'I': [11, 3.6, .30],
  'O': [9, 3, .28], '^': [11, 3.6, .30], 'Z': [11, 3.6, .30], 'V': [11, 3.6, .30], 'M': [10, 3.4, .26], 'T': [8, 2.6, .26], 'i': [5.5, 2, .24], 'p': [10, 3, .26], 'q': [10, 3, .26], 'r': [10, 3, .26]};
function advRealce(ctx, mapa, camX, camY, vw, vh){
  const t = Date.now() / 1000;
  const x0 = Math.max(0, Math.floor(camX / ADV_PX) - 1), x1 = Math.min(mapa.cols - 1, Math.ceil((camX + vw) / ADV_PX) + 1);
  const y0 = Math.max(0, Math.floor(camY / ADV_PX) - 1), y1 = Math.min(mapa.rows.length - 1, Math.ceil((camY + vh) / ADV_PX) + 1);
  for(let y = y0; y <= y1; y++){
    const fila = mapa.rows[y], abajo = mapa.rows[y + 1];
    for(let x = x0; x <= x1; x++){
      const ch = fila[x], ox = x * ADV_PX - camX, oy = y * ADV_PX - camY;
      const sh = ALTO_SOMBRA[ch];
      if(sh && !(abajo && ALTO_SOMBRA[abajo[x]])) sombraSuave(ctx, ox + 9, oy + ADV_PX + 1.5, sh[0], sh[1], sh[2]);   // cae hacia abajo y un poco a la derecha
      else if(ch === '~'){
        const f = (x * 7 + y * 13) % 5, ph = t * .9 + x * 1.3 + y * .7;
        for(let k = 0; k < 2; k++){
          const a = (Math.sin(ph + k * 2.4) + 1) / 2;
          if(a < .35) continue;
          ctx.fillStyle = `rgba(235,248,255,${(.10 + .26 * a).toFixed(3)})`;
          ctx.beginPath(); ctx.ellipse(ox + 3 + ((f * 3 + k * 7) % 11), oy + 4 + ((f * 5 + k * 6) % 9), 2.3, .55, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }
}

function advRender(){
  const cv = document.getElementById('advMap');
  const mapa = ADV_MAPS[advMapa];
  const anchoCss = cv.clientWidth  || window.innerWidth;
  const altoCss  = cv.clientHeight || window.innerHeight;
  const dprE = Math.min(window.devicePixelRatio || 1, 2.5);
  /* cada píxel de mundo = un número ENTERO de píxeles del dispositivo: el piso queda parejo y nítido */
  const escala = Math.max(1, Math.round(advEscala(anchoCss, altoCss) * dprE)) / dprE;

  /* Resolución real de pantalla: el canvas tiene los píxeles del dispositivo y el dibujo se hace en
     "píxeles de mundo" con una transformación. Así los personajes y los Pokémon salen nítidos (no
     achicados a 14 px) y las sombras y la luz son suaves; el piso sigue siendo pixel art. */
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const vw = Math.ceil(anchoCss / escala);
  const vh = Math.ceil(altoCss  / escala);
  const cw = Math.round(anchoCss * dpr), chh = Math.round(altoCss * dpr);
  if(cv.width !== cw || cv.height !== chh){ cv.width = cw; cv.height = chh; }
  const kk = escala * dpr;

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
  ctx.setTransform(kk, 0, 0, kk, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0B1020';
  ctx.fillRect(0, 0, vw + 1, vh + 1);
  ctx.drawImage(advFondo(advMapa), -camX, -camY);
  advRealce(ctx, mapa, camX, camY, vw, vh);   // sombras, brillos del agua y luz sobre el piso

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

  salvajesVencer();
  const sprites = [];
  salvajesActivos().forEach(sv => {
    dibujarSalvaje(ctx, sv, sv.x * ADV_PX - camX, sv.y * ADV_PX - camY);
    sprites.push({p: sv.p, px: sv.x * ADV_PX - camX, py: sv.y * ADV_PX - camY, parpadea: sv.hasta - Date.now() < 5000});
  });
  if(legendarioVisible && legendarioVisible.mapa === advMapa && Date.now() < legendarioVisible.hasta)
    sprites.push({p: legendarioVisible.p, px: legendarioVisible.x * ADV_PX - camX, py: legendarioVisible.y * ADV_PX - camY, mult: 1.3, flota: true});
  sincronizarSprites(sprites, escala);

  if(advMapa === 'overworld') dibujarTren(ctx, camX, camY, vw, vh);
  if(typeof dibujarOtros === 'function') dibujarOtros(ctx, camX, camY, vw, vh, escala);   // Aventura en vivo (servidor.js)
  dibujarJugador(ctx, advPx - camX, advPy - camY);
  // quiénes pueden quedar tapados por una copa: yo y los Pokémon salvajes (los demás entrenadores también)
  const tapa = [{x0: advPx - camX + 1, x1: advPx - camX + 15, y0: advPy - camY - 2, y1: advPy - camY + 16, pie: advPy - camY + 16}];
  sprites.forEach(sp => tapa.push({x0: sp.px - 1, x1: sp.px + 17, y0: sp.px === undefined ? 0 : sp.py - 8, y1: sp.py + 15, pie: sp.py + 15}));
  if(typeof MUNDO !== 'undefined' && MUNDO.otros) for(const id in MUNDO.otros){ const o = MUNDO.otros[id]; if(o.m === advMapa) tapa.push({x0: o.x - camX + 1, x1: o.x - camX + 15, y0: o.y - camY - 2, y1: o.y - camY + 16, pie: o.y - camY + 16}); }
  advAltoRender(mapa, camX, camY, vw, vh, kk, cw, chh, tapa);
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
                 'T':'#C0392B', 'v':'#6B5A44', 'Y':'#3B66A1', 'i':'#B98A50', 'b':'#FFFFFF', 'c':'#F0B400'};
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
  [['V', 25], ['Y', 81], ['Q', 135], ['H', 189], ['P', 243], ['L', 297]].forEach(([letra, col]) => {
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
  const te = trenEstado(Date.now());
  ctx.fillStyle = '#E8631F'; ctx.fillRect(te.x * MINI_PX - 3, TREN_Y * MINI_PX - 1, 6, 3);        // el tren en el minimapa
  /* los otros que están en la Aventura (personas y bots): puntos celestes; vos: punto rojo con aro blanco que late */
  if(typeof MUNDO !== 'undefined' && MUNDO.otros){
    for(const id in MUNDO.otros){
      const o = MUNDO.otros[id];
      if(o.m !== 'overworld') continue;
      const ox = (o.x / ADV_PX) * MINI_PX, oy = (o.y / ADV_PX) * MINI_PX;
      ctx.fillStyle = '#0B1020'; ctx.beginPath(); ctx.arc(ox, oy, 8.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#19E0FF'; ctx.beginPath(); ctx.arc(ox, oy, 6.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  const latido = (Math.sin(Date.now() / 260) + 1) / 2;
  ctx.fillStyle = `rgba(255,255,255,${(.25 + .25 * latido).toFixed(2)})`;
  ctx.beginPath(); ctx.arc(px, py, 16 + latido * 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0B1020'; ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(px, py, 9.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#E5232B'; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
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
  trenActualizar();
  if(advTrenAbordo) return;                                            // viajando en el tren: no se camina
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

  const sv = salvajeTocado();
  if(sv){ elegirSalvaje(sv); return; }

  if(advDescanso > 0){ advDescanso -= anduvo; return; }   // recién salió uno: dejalo caminar
  if(avist) return;   // ya hay uno esperando: no tirar otro altar ni cruzarlo con un encuentro salvaje
  if(salvajesActivos().length) return;   // hay Pokémon a la vista: primero elegí uno
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
  if(!advAbierto || advOcupado() || advTrenAbordo) return;
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

  const sv = salvajeTocado();
  if(sv){ elegirSalvaje(sv); return; }

  if(advDescanso > 0){ advDescanso -= ADV_PX; return; }
  if(avist) return;
  if(salvajesActivos().length) return;
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
  const pool = poolBioma(t.encuentro), sale = [elegirPesado(pool)];
  for(let i = 0; i < 8 && sale.length < 3; i++){ const q = elegirPesado(pool); if(!sale.includes(q)) sale.push(q); }
  aparecerSalvajes(sale, x, y);
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
  if(typeof mundoEntrar === 'function') mundoEntrar();
  // pantalla completa de verdad donde el navegador lo permita
  try{
    const el = document.documentElement;
    if(!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }catch(e){}
}

function cerrarAventura(){
  advAbierto = false; advTrenAbordo = false;
  advEje = {x:0, y:0};
  if(advRaf){ cancelAnimationFrame(advRaf); advRaf = null; }
  sincronizarObjetos([], 1);        // esconder las pokébolas del piso al salir
  salvajes = [];
  if(typeof mundoSalir === 'function') mundoSalir();
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

const escribiendo = e => e.target && e.target.closest && e.target.closest('input, textarea');   // chat: las letras no mueven al personaje
document.addEventListener('keydown', e => {
  if(!advAbierto || escribiendo(e)) return;
  const k = TECLAS[e.key] ? e.key : (e.key || '').toLowerCase();
  if(!TECLAS[k]) return;
  e.preventDefault();
  teclasApretadas.add(k);
  if(!stickActivo) advEje = ejeDeTeclado();
});
document.addEventListener('keyup', e => {
  if(escribiendo(e)){ teclasApretadas.clear(); if(!stickActivo) advEje = ejeDeTeclado(); return; }
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
  let dx = ev.clientX - stickCentro.x, dy = ev.clientY - stickCentro.y;
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

/* Joystick flotante: se toca en cualquier lado de la pantalla y el control aparece ahí mismo */
const stickEl = document.getElementById('advStick');
const zonaToque = document.getElementById('advOverlay');
let stickCentro = {x:0, y:0};
zonaToque.addEventListener('pointerdown', ev => {
  if(stickActivo || ev.target.closest('button, .adv-chatbar')) return;
  ev.preventDefault();
  stickActivo = true;
  stickPuntero = ev.pointerId;
  try{ zonaToque.setPointerCapture(ev.pointerId); }catch(e){}
  const r = stickEl.offsetWidth / 2;
  const pr = zonaToque.getBoundingClientRect();
  const x = Math.min(Math.max(ev.clientX, pr.left + r), pr.right - r);   // que el aro no se salga de la pantalla
  const y = Math.min(Math.max(ev.clientY, pr.top + r), pr.bottom - r);
  stickCentro = {x, y};
  stickEl.style.left = (x - pr.left - r) + 'px';
  stickEl.style.top = (y - pr.top - r) + 'px';
  stickEl.classList.add('activo');
  stickDesde(ev);
});
zonaToque.addEventListener('pointermove', ev => {
  if(!stickActivo || ev.pointerId !== stickPuntero) return;
  ev.preventDefault();
  stickDesde(ev);
});
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(tipo => {
  zonaToque.addEventListener(tipo, ev => { if(ev.pointerId === stickPuntero) soltarStick(); });
});

window.addEventListener('resize', () => { if(advAbierto) advRender(); });

document.getElementById('advBtn').onclick = abrirAventura;
document.getElementById('advCloseBtn').onclick = cerrarAventura;
document.getElementById('encCloseBtn').onclick = cerrarEncuentro;
document.getElementById('shopCloseBtn').onclick = () => document.getElementById('shopOverlay').classList.remove('show');
document.getElementById('repetidasBtn').onclick = () => { document.getElementById('repetidasOverlay').classList.add('show'); document.getElementById('repetidasCloseBtn').focus({preventScroll:true}); };
document.getElementById('repetidasCloseBtn').onclick = () => { document.getElementById('repetidasOverlay').classList.remove('show'); document.getElementById('repetidasBtn').focus({preventScroll:true}); };
document.getElementById('repetidasAtrasBtn').onclick = () => document.getElementById('repetidasCloseBtn').click();
document.getElementById('evolucionarBtn').onclick = abrirEvolucion;
document.getElementById('evolucionCloseBtn').onclick = () => document.getElementById('evolucionOverlay').classList.remove('show');
document.getElementById('evolucionAtrasBtn').onclick = () => document.getElementById('evolucionCloseBtn').click();
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
renderEstadoFilters();
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
  /* 26/10/2026: Zeta pidió 6 Pokémon nuevos para pelear (los más fuertes de la Arena, shiny, fuerza 100) con ataques puestos a mano
     [corto, medio, largo; 'Nombre|efecto' fuerza el efecto]: Lucario de lucha con los tres puños (fuego, trueno y hielo), Gengar con
     Meteoros, y a su Mewtwo le cambia el ataque largo por Onda Mental (rayo en línea). */
  { id: 'zeta-equipo-cheto-20261026', para: 'zeta centeno', monedas: 0,
    ejemplares: [
      {id:448, f:100, s:true, m:['Puño Fuego', 'Puño Trueno|rayito', 'Puño Hielo|embestida|cristal']},
      {id:94,  f:100, s:true, m:['Puño Sombra', 'Meteoros', 'Comesueños']},
      {id:493, f:100, s:true, m:['Velocidad Extrema', 'Tierra Viva', 'Hiperrayo']},
      {id:384, f:100, s:true, m:['Garra Dragón', 'Pulso Dragón', 'Ascenso Draco']},
      {id:483, f:100, s:true, m:['Cabeza de Hierro', 'Cañón Resplandor', 'Distorsión']},
      {id:484, f:100, s:true, m:['Hidroariete', 'Pulso Dragón', 'Corte Vacío']}],
    ajustar: [{id:150, m:[null, null, 'Onda Mental']}] },
  /* 26/10/2026: Zeta pidió entrar a jugar con su equipo ya armado en los favoritos de la Arena (el primero sale primero):
     Arceus, Dialga, Mewtwo, Rayquaza, Lucario y Gengar. */
  { id: 'zeta-favoritos-20261026', para: 'zeta centeno', monedas: 0, favoritos: [493, 483, 150, 384, 448, 94] },
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
/* Ataques fijos de un ejemplar: [corto, medio, largo], cada uno 'Nombre', 'Nombre|efecto' o null (null = el de siempre). */
const movsOk = m => Array.isArray(m) && m.length === 3 && m.every(x => x == null || (typeof x === 'string' && x.length <= 40));
function regalarEjemplar(id, f, shiny, movs){
  const p = DATA.find(d => d.id === id);
  if(!p) return null;
  ejemplares(id);   // completa lo que ya tenía antes de sumar éste
  const isNew = !state[id].got;
  if(isNew) state[id].got = true; else state[id].dup++;
  const e = nuevoEjemplar(f);
  if(shiny) e.s = true;
  if(movsOk(movs)) e.m = movs;
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
      const pull = regalarEjemplar(x.id, x.f, x.s, x.m);
      if(pull) ejPulls.push(pull);
    });
    if(Array.isArray(r.favoritos)){       // equipo favorito de la Arena (un regalo lo puede dejar armado)
      try{ localStorage.setItem('arena-favoritos', JSON.stringify(r.favoritos.filter(Number.isInteger).slice(0, 6))); }catch(e){}
    }
    (r.ajustar || []).forEach(x => {       // cambia los ataques del ejemplar más fuerte que ya tenía
      if(!state[x.id] || !state[x.id].got || !movsOk(x.m)) return;
      const mejor = ejemplares(x.id).reduce((m, e) => (!m || e.f > m.f || (e.f === m.f && e.s)) ? e : m, null);
      if(mejor) mejor.m = x.m;
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
let ultimoTopSemana = null, subMaestro = 'semana';
function cargarTopSemana(){
  if(!MODO_SERVIDOR) return Promise.resolve();
  return fetch(SERVIDOR_URL + '/semana-top', {cache: 'no-store'})
    .then(r => { if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(d => { ultimoTopSemana = d; if(rankTab === 'maestro') renderRank(); })
    .catch(() => {});
}
function cargarTopMaestro(){
  cargarTopSemana();
  return fetch(MODO_SERVIDOR ? SERVIDOR_URL + '/maestro-top' : API_BASE + '/pokemon-maestro-top', {cache: 'no-store'})
    .then(r => { if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(data => { ultimoTopMaestro = data; topMaestroFallo = false; if(rankTab === 'maestro') renderRank(); })
    .catch(() => { topMaestroFallo = true; if(rankTab === 'maestro') renderRank(); });
}

/* Maestros tiene tres vistas: la semana de la Arena, los coleccionistas de la semana (sobres) y el histórico de siempre.
   Lo de la semana arranca de cero cada lunes 00:00; el histórico, los rangos y el álbum no se tocan. */
const semanalActivo = () => MODO_SERVIDOR && !!ultimoTopSemana && ultimoTopSemana.activa !== false;
function pintarSubMaestro(){
  let sub = document.getElementById('rankSub');
  if(!sub){
    sub = document.createElement('div');
    sub.id = 'rankSub'; sub.className = 'rank-sub-tabs';
    document.getElementById('rankList').parentNode.insertBefore(sub, document.getElementById('rankList'));
  }
  sub.hidden = rankTab !== 'maestro' || !semanalActivo();
  if(sub.hidden) return;
  const op = [['semana', '⚔️ Semana'], ['colec', '📦 Sobres'], ['historico', '👑 Histórico']];
  sub.innerHTML = op.map(o => '<button type="button" class="rank-subchip' + (subMaestro === o[0] ? ' on' : '') + '" data-sub="' + o[0] + '">' + o[1] + '</button>').join('');
  sub.querySelectorAll('button').forEach(b => b.onclick = () => { subMaestro = b.dataset.sub; renderRank(); });
}
function textoFaltaSemana(fin){
  const ms = new Date(fin).getTime() - Date.now();
  if(!(ms > 0)) return 'cierra en este momento';
  const d = Math.floor(ms / 86400e3), h = Math.floor(ms % 86400e3 / 3600e3), m = Math.floor(ms % 3600e3 / 60e3);
  return 'cierra el lunes 00:00 · faltan ' + (d ? d + ' d ' : '') + h + ' h' + (d ? '' : ' ' + m + ' min');
}
function esc(t){ return String(t).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c])); }
function renderRankSemana(lista, cont, done){
  const d = ultimoTopSemana, colec = subMaestro === 'colec';
  if(!d){ lista.innerHTML = '<div class="rank-empty">Cargando la semana…</div>'; cont.hidden = true; done.innerHTML = ''; return; }
  const filas = (colec ? d.colec : d.arena).slice(0, TOPE_RANKING), cfg = colec ? d.premios.colec : d.premios.arena;
  cont.hidden = true;
  if(!filas.length) lista.innerHTML = '<div class="rank-empty">' + (colec ? 'Nadie abrió sobres todavía esta semana. ¡Abrí uno y sé el primero!' : 'Nadie ganó todavía esta semana en la Arena. ¡Ganá una pelea y sé el primero!') + '</div>';
  filas.forEach(f => {
    const row = document.createElement('div');
    row.className = 'rank-row rank-row-ma' + (f.jugador === jugador ? ' me' : '');
    row.innerHTML = '<div class="rank-pos">' + iconoPuesto(f.puesto) + '<span>' + f.puesto + '</span></div>' +
      '<div class="rank-name"><span></span><small class="rank-rango"></small></div>' +
      '<div class="rank-score">' + (colec ? f.nuevas + ' <span class="rank-sub">figuritas nuevas</span>' : f.pts + ' <span class="rank-sub">pts · ' + f.ganadas + ' ganadas</span>') + '</div>';
    row.querySelector('.rank-name span').textContent = f.jugador;
    row.querySelector('.rank-rango').remove();
    lista.appendChild(row);
  });
  const ant = d.anterior && (colec ? d.anterior.colec : d.anterior.arena);
  done.innerHTML = '<div class="hof-title">🎁 Premios de la semana</div>' +
    '<div class="hof-sub">' + (colec ? 'Gana el que consigue más figuritas NUEVAS abriendo sobres.' : 'Gana el que suma más puntos peleando en la Arena.') +
    ' Todos arrancan de cero cada lunes.<br><b>' + textoFaltaSemana(d.termina) + '</b><br>Los premios te llegan solos al entrar al juego.</div>' +
    cfg.textos.map((t, i) => '<div class="hof-row rango premio-sem"><span class="rango-pts">' + (i + 1) + '°</span><div class="hof-name">' + esc(t) + '</div></div>').join('') +
    '<div class="hof-row rango premio-sem"><span class="rango-pts">+</span><div class="hof-name"><b>Participar</b><br><small>' + (colec ? cfg.minimo + ' figuritas nuevas' : cfg.minimo + ' peleas') + ' en la semana: ' + esc(cfg.textoMinimo) + '</small></div></div>' +
    (ant && ant.length ? '<div class="hof-title" style="margin-top:14px">🏅 La semana pasada</div>' + ant.map(g => '<div class="hof-row"><span class="rango-pts">' + g.puesto + '°</span><div class="hof-name"><b>' + esc(g.nombre) + '</b></div></div>').join('') : '');
}
function renderRankMaestro(lista, cont, done){
  pintarSubMaestro();
  if(semanalActivo() && subMaestro !== 'historico') return renderRankSemana(lista, cont, done);
  return renderRankMaestroHistorico(lista, cont, done);
}
function renderRankMaestroHistorico(lista, cont, done){
  if(!ultimoTopMaestro){
    lista.innerHTML = topMaestroFallo
      ? '<div class="rank-empty">No se pudo cargar el ranking de Maestros.<br><button type="button" class="close-btn" id="rankReintentarMa" style="margin-top:10px;padding:10px 18px;">Reintentar</button></div>'
      : '<div class="rank-empty">Cargando el ranking de Maestros…</div>';
    const b = document.getElementById('rankReintentarMa');
    if(b) b.onclick = () => cargarTopMaestro();
    cont.hidden = true;
  } else {
    const filas = (ultimoTopMaestro.top || []).slice(0, TOPE_RANKING);
    document.getElementById('rankCountNum').textContent = ultimoTopMaestro.jugadores || 0;
    cont.hidden = false;
    if(!filas.length){
      lista.innerHTML = '<div class="rank-empty">Todavía nadie ganó en la Arena. ¡Ganá una batalla y sé el primer Maestro!</div>';
    }
    filas.forEach(f => {
      const row = document.createElement('div');
      row.className = 'rank-row rank-row-ma' + (f.jugador === jugador ? ' me' : '');
      row.innerHTML =
        '<div class="rank-pos">' + iconoPuesto(f.puesto) + '<span>' + f.puesto + '</span></div>' +
        '<div class="rank-name"><span></span><small class="rank-rango"></small></div>' +
        '<div class="rank-score">' + f.pts + ' <span class="rank-sub">pts · ' + f.ganadas + ' ganadas</span></div>';
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

function pintarEnLinea(){
  const el = document.getElementById('rankOnline');
  if(!el) return;
  const n = ultimoTop && Number.isFinite(ultimoTop.enLinea) ? ultimoTop.enLinea : null;
  el.hidden = n === null;
  if(n !== null) document.getElementById('rankOnlineNum').textContent = n;
}

/* Los rankings muestran sólo los 10 primeros (el servidor puede mandar más). */
const TOPE_RANKING = 10;
let hofAbierto = false;

function renderRank(){
  pintarEnLinea();
  if(rankTab !== 'maestro'){ const sb = document.getElementById('rankSub'); if(sb) sb.hidden = true; }
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

  const filas = ((rankTab === 'hoy' ? ultimoTop.hoy : ultimoTop.historico) || []).slice(0, TOPE_RANKING);
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
  /* el Salón de la Fama y los ganadores de eventos van plegados: el ranking queda corto y se ve de un vistazo */
  const det = document.createElement('details');
  det.className = 'hof-det'; det.open = hofAbierto;
  det.innerHTML = '<summary>🏆 Salón de la Fama y ganadores de eventos</summary>';
  while(done.firstChild) det.appendChild(done.firstChild);
  det.addEventListener('toggle', () => { hofAbierto = det.open; });
  done.appendChild(det);
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
    caja.innerHTML = '<div class="hof-title" style="margin-top:14px">Ganadores de eventos</div>';
    const eventos = [...new Set(gan.map(g => g.evento))];
    eventos.forEach(evNombre => {
      const tit = document.createElement('div');
      tit.style.cssText = 'text-align:center;font-family:"Baloo 2",sans-serif;font-weight:700;font-size:14px;color:#5B4300;margin:10px 0 8px';
      tit.textContent = evNombre;
      caja.appendChild(tit);
      gan.filter(g => g.evento === evNombre).forEach(g => {
        const fila = document.createElement('div');
        fila.className = 'hof-row';
        /* medalla sólo para el 1.º, 2.º y 3.º: del 4.º en adelante va el lugar vacío (si no, parecía que tenían bronce) */
        fila.innerHTML = (g.puesto >= 1 && g.puesto <= 3
          ? '<img class="hof-crown" src="images/medal-' + ['oro', 'plata', 'bronce'][g.puesto - 1] + '.svg" alt="' + g.puesto + 'º">'
          : '<span class="hof-crown hof-sin" aria-hidden="true"></span>') + '<div class="hof-name"></div><div class="hof-date"></div>';
        fila.querySelector('.hof-name').textContent = g.nombre;
        const pu = fila.querySelector('.hof-date');
        pu.textContent = g.puesto + 'º'; pu.style.fontSize = '14px'; pu.style.fontWeight = '700';
        caja.appendChild(fila);
      });
    });
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
  const filas = (ultimoTopEvento.top || []).slice(0, TOPE_RANKING);
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
  pedirAvatarSiFalta();
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
        /* el foco vuelve al botón de origen si no queda ningún panel abierto o si ese botón está en uno que sigue abierto (ej: Repetidas → Intercambio) */
        if(antes && document.contains(antes) && antes.focus && (!abiertos().length || abiertos().some(o => o.contains(antes)))) antes.focus();
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
  const cierres = ['novedadesCierraBtn','detalleCloseBtn','evolucionCloseBtn','intercambioCloseBtn','shopCloseBtn','pokedexCloseBtn','closeBtn','quizCloseBtn','battleCloseBtn','repetidasCloseBtn'];
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
  pedirAvatarSiFalta();
} else {
  pedirNombre();
}
window.addEventListener('online', () => { if(topFallo) cargarTop(); });
}
