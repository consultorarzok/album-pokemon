/* Portada: el mundo real (continentes de Natural Earth, 1° por píxel) girando en
   pixel-art, con pokébolas, monedas y la Pokédex dando vueltas alrededor.
   Tocar el mundo o «Entrar» abre el juego. */
(function(){
  var portada = document.getElementById('portada');
  var cv = document.getElementById('portadaMundo');
  if (!portada || !cv) return;

  /* Máscara de tierra 360×180 (equirectangular, fila 0 = 90°N, columna 0 = 180°O), 1 bit por celda. */
  var MASK_B64 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADo/wMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADA/v9/MOb//z8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMD+//+H/////7//AQAAAAAAAAB4AAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAPjv/n/+//////8PAAAAwBUAADzzAQAAgB8AAAAAAAAAAAAAAAAAAAAAAAAAHPD//wf8//////8BAACAdz8AAAAAAAABAP4GAAAAAAAAAAAAAAAAAAAAAAB8+J7///n//////38BAACAfwMAAAAAAAAAAABfAAAAAAAAAAAAAAAAAAAAAOA5BDDyP9j///////8CAAAAPA4AAAAAAAAAIAC8AAAAAAAAAAAAAAAAAAAAAF7j2PP/H8D//////38AAAAAAAAAAAAA+gEAAJD/HwAAAAAAAAAAAAAAAAAAAMD/i7//DwAA/v////8DAAAAAAAAAADgAwAg8P//PwAA6N8BAAAAAAAAAAAAgA8EAAAIAAAA+P////8BAAAAAAAAAAB4AAAA/f//GwAAAAEAAAAAAAAAAAAAgP8Dx/e5fwAA8P///38AAAAAAAAAAAAeAIzx//9//4cfgAcAAAAAAAAAAAAAwP9/xy/89wEA8P///z8AAAAAAAAAAAAHAJ7m//////8fgP8BAAAAAAD4/wAA0P/////8//8A8P///z8AAAAAgP4HAABHgN//////////////DwAAAAD4/wAAEAD/v/j4//8A4P///zcAAAAAgP4HAABAgN//////////////DwAAAAD+///x/5//f/7H4/8BwP7//w8AAAAA4P8/ADAAH9///////////////89//P//////////////////////////////PwAA/PyHAGECAAAAAAAAAAAAAAAA8P//////////////////////////////DwAA4A4AADAAAAAAAAAAAAAAAAAAIf7/////////////////////////////AwDg8QAAAA4AAAAAAAAAAAAAAAAAj///////////////////////////////AR7ADwAAAAAAAAAAAAAAAAAAAAAAwAD9///////////vw/0HAP8PAMA/AADA//P//v////////////////////8/AAf+//////////9BIPAPAP4HAAADAADw//z///////////////////////9/AMD//////////38A04cLAP4DAAAAIAD+P/7/////////////////////f/8PAMD//////////z8AwA8AAPgDAAAAAAD+H/7/////////////////////Mf8BgKD///7//////x8AwL8IAMABAAAAAAT+//z///////////////////9/wG8AAAD8EwD//////x8AwH8MAAAAAAAAAAL+f/D///////////////////91cAAAAADACwD4/////38AwP8fAAAAAAAA4AGcH/z//////////////////wEAPAAAAADgDgDw//////8AgP8/AAAAAAAA8ANAX/b//////////////////wAAfgAAAAA4AADA//////8PkP9/AAAAAAAA4AFwH/7/////////////////PwAAfwAAAAAOAADA////////wP//AAAAAAAA0APwAv7/////////////////DwCAPwAAAIAAAAAA/v//////8///AwAAAAAA/A9w8////////////////////wSAHwAAABgAAACA/v//////4///DwAAAAAAvA/+/////////////////////wUADwAAoAAAAAAA+f//////4///DwAAAAAAPD///////////////////////wcABwACAAAAAAAA8P//////////DwAAAAAABJ///////////////////////wUAAwAAAAAAAAAA8P//////////DAAAAAAAgOD//////////////////////wyAAAAAAAAAAAAA4P////////81PAAAAAAAAPz//////////////////////wxAAAAAAAAAAAAAgP////////8PfgAAAAAAgP///////////////////////wQAAAAAAAAAAAAAgP////////8HcAAAAAAAAP7/////////////////////fwQAAAAAAAAAAAAAAP////////+3AAAAAAAAAPz///9//B/+////////////PwgAAAAAAAAAAAAAAP////////9/AAAAAAAAAPj////z/wf/////////////HwIBAAAAAAAAAAAAAP////////8OAAAAAAAAAPj/+P8h/IP/////////////D04AAAAAAAAAAAAAgP///////z8AAAAAAAAA+P/H8/8A8If/////////////Bz8AAAAAAAAAAAAAgP///////x8AAAAAAAAA+H+ww/8A4A/+//////////9/AAQAAAAAAAAAAAAAAP///////x8AAAAAAAAA+D8Aj//44R/8//////////8/AAAAAAAAAAAAAAAAgP///////wMAAAAAAAAA+A8wuO///z/+/////////98fAAMAAAAAAAAAAAAAAP///////wMAAAAAEAAA/E8wEMf//x/8/////////ycOAAMAAAAAAAAAAAAAAP7//////wEAAAAAgAAA+A8AGM///x/8/////////wMOwAMAAAAAAAAAAAAAAP7//////wAAAAAAAAAA+AMgBob//x/8/////////3ccwAEAAAAAAAAAAAAAAPz//////wAAAAAAAAAAQPB/AAA2/////////////x8c8AEAAAAAAAAAAAAAAPj//////wEAAAAAAAAAQPx/ADgg/////////////w8c/wAAAAAAAAAAAAAAAPj/////PwAAAAAAAAAA4P8/AAAA/////////////w+EHwAAAAAAAAAAAAAAAPD/////HwAAAAAAAAAA+P9/AACA/////////////x/kCQAAAAAAAAAAAAAAAID/////DwAAAAAAAAAA/P//BweA/////////////x/AAAAAAAAAAAAAAAAAAID9////BwAAAAAAAAAA/P//D3/M/////////////z9AAAAAAAAAAAAAAAAAAAD5////BwAAAAAAAAAA/P///////////////////x9AAAAAAAAAAAAAAAAAAAD+/x8HBwAAAAAAAAAA/P///////8///////////z8AAAAAAAAAAAAAAAAAAAD1/w8ABgAAAAAAAAAI/////////5///////////z8gAAAAAAAAAAAAAAAAAADu/wcADgAAAAAAAADA//////+//x///////////x8AAAAAAAAAAAAAAAAAAACY/wcADAAAAAAAAADg//////8//z/g/////////w8IAAAAAAAAAAAAAAAAAACQ/wcAiAAAAAAAAADg//////9//v+I/////////y8AAAAAAAAAAAAAAAAAAAAw/wMAIAEAAAAAAADg//////9//v8dgP///////7MAAAAAAAAAAAAAAAAAAABA/gMAAAAAAAAAAADw/////////P9/AP///////xEAAAAAAAAAAAAAAAAAAAAA/AOAPQAAAAAAAAD4////////+P//AP7/////PxAAAAAAAAAAAAAAAAAAAAAA+Acc4AAAAAAAAAD4////////+f9/APz/B///BAAAAAAAAAAAAAAAAAAAAAAA/AcegAMAAAAAAAD4////////+f9/AOD/B/9/BAAAAAAAAAAAAAAAAQAAAAAA+A8eBHgAAAAAAAD4////////4f8/AOD/Af4/ByAAAAAAAAAAAAAAAAAAAAAA8N8PYP4LAAAAAADw////////4/8fAOD/APw/AjAAAAAAAAAAAAAAAAAAAAAAgP8PAAAAAAAAAADw////////x/8HAOB/APx/ADAAAAAAAAAAAAAAAAAAAAAAAP4vAABAAAAAAAj4////////h/8BAOA/AOz/ADAAACAAAAAAAAAAAAAAAAAAAID/AABAAAAAAAD4////////z/8AAMAPAOD/ARAAAAAAAAAAAAAAAAAAAAAAAAD/AQAAAAAAAAD4////////nx8AAMAPAMD/AXAAAAAAAAAAAAAAAAAAAAAAAAD8AABAAAAAAAD4////////vwcAAIAPAMD+AdAAABAAAAAAAAAAAAAAAAAAAADgAJAAAAAAAAD4////////fwACAIAPAMH8AcABAAAAAAAAAAAAAAAAAAAAAADAAGwAAAAAAADw////////f3AAAIAPAMH4AcgDAAAAAAAAAAAAAAAAAAAAAADAAf9TAAAAAADg/////////38AAAAPAEBwAMgDAAAAAAAAAAAAAAAAAAAAAAAAE+9/AAAAAADA/////////38AAAAXAMAgAMQCAAAAAAAAAAAAAAAAAAAAAAAA7///AQAAAADA/////////z8AAAAaAMAAAIADAAAAAAAAAAAAAAAAAAAAAAAAyP//AwAAAACA/////////z8AAAAwAIIBAAAHBAAIABAAAAAAAAAAAAAAAAAAwP//BwAAAAAA/v///////x8AAAAwAIADAAMDAAAAAAAAAAAAAAAAAAAAAAAAwP//fwAAAAAA/A/+/////x8AAAAAAAgHgAcAAAAAAAAAAAAAAAAAAAAAAAAAwP///wEAAAAAEADk/////w8AAAAAADAHwAcEAAAAAAAAAAAAAAAAAAAAAAAAwP///wEAAAAAAADQ/////wcAAAAAAOAG4AMCAAAAAAAAAAAAAAAAAAAAAAAA4P///wEAAAAAAADA/////wMAAAAAAOAM+AMQAAAAAAAAAAAAAAAAAAAAAAAA4P///wMAAAAAAADg/////wAAAAAAAIAL/gcZAAAAAAAAAAAAAAAAAAAAAAAA8P///wMAAAAAAADk////fwAAAAAAAIAP/uMYAAAAAAAAAAAAAAAAAAAAAAAH+P///x8AAAAAAADw////PwAAAAAAAAAX/itICwAAAAAAAAAAAAAAAAAAAAAA+P///38AAAAAAADg////PwAAAAAAAAA//LmJOwACAAAAAAAAAAAAAAAAAAAA+P////8BAAAAAADA////HwAAAAAAAAD+/DkA9wEEAAAAAAAAAAAAAAAAAAAA+P////8/AAAAAACA////DwAAAAAAAAA8wChU/g8AAAAAAAAAAAAAAAAAAAAA/P////9/AAAAAAAA////BwAIAAAAAAA4AGgA8D8YAAAAAAAAAAAAAAAAAAAA+P//////AQAAAAAA////BwAAAAAAAAAwEEgAxT9PAAAAAAAAAAAAAAAAAAAA8P//////AQAAAAAA////BwAAAAAAAADgDQAAxP+AAQAAAAAAAAAAAAAAAAAA8P//////AQAAAAAA/v//BwAAAAAAAACAPwCEwP8ABQAAgAAAAAAAAAAAAAAA4P//////AQAAAAAA/v//BwAAAAAAAAAAwP8GAM8AGgAAAAAAAAAAAAAAAAAA4P//////AAAAAAAA/v//DwAAAAAAAAAAAJgBAIAHOAAAAAAAAAAAAAAAAAAAwP////9/AAAAAAAA/v//HwAAAAAAAAAgACAAAAQEIAAAAAAAAAAAAAAAAAAAwP////9/AAAAAAAA/P//DwAAAAAAAAAAAABAAQQgAAQAAAAAAAAAAAAAAAAAgP////8/AAAAAAAA/v//HyAAAAAAAAAAAADAHwYAAAAAgAAAAAAAAAAAAAAAAP////8fAAAAAAAA////HzAAAAAAAAAAAADAHw4AAAAAAAAAAAAAAAAAAAAAAP////8fAAAAAAAA////HzgAAAAAAAAAAADuDx4AAAQAAAAAAAAAAAAAAAAAAP7///8fAAAAAAAA////DzwAAAAAAAAAAAD/Hx4AAAQAAAAAEBAAAAAAAAAAAPj///8fAAAAAAAA////Dz8AAAAAAAAAAID/vz4AAAjAAAAAQAAAAAAAAAAAAPD///8fAAAAAACA////Ax8AAAAAAAAAAMD//z8AABBgAAAAAAAIAAAAAAAAAOD///8PAAAAAAAA////AR8AAAAAAAAAAOD//z8AAAAAAAAAAAAAAAAAAAAAAMD///8PAAAAAAAA/v9/AB8AAAAAAAAAAOD///8AAAAAAAAAAAAAAAAAAAAAAMD///8PAAAAAAAA/v9/AA8gAAAAAAAAAP////8BAAUAAAAAAAAAAAAAAAAAAMD///8HAAAAAAAA/P9/gA8AAAAAAAAAgP////8BAAIEAAAAAAAAAAAAAAAAAOD///8DAAAAAAAA/P9/gA8AAAAAAAAA4P////8HAAgAAAAAAAAAAAAAAAAAAOD//38AAAAAAAAA/P9/gA8AAAAAAAAA4P////8HAAAAAAAAAAAAAAAAAAAAAOD//x8AAAAAAAAA/P9/AAcAAAAAAAAA4P////8PAAAAAAAAAAAAAAAAAAAAAOD//w8AAAAAAAAA+P8fAAIAAAAAAAAA4P////8fAAAAAAAAAAAAAAAAAAAAAOD//wcAAAAAAAAA+P8fAAAAAAAAAAAA4P////8fAAAAAAAAAAAAAAAAAAAAAOD//w8AAAAAAAAA+P8fAAAAAAAAAAAAwP////8fAAAAAAAAAAAAAAAAAAAAAPD//wcAAAAAAAAA8P8PAAAAAAAAAAAAwP////8/AAAAAAAAAAAAAAAAAAAAAPD//wMAAAAAAAAA4P8HAAAAAAAAAAAAgP////8fAAAAAAAAAAAAAAAAAAAAAPD//wEAAAAAAAAA4P8DAAAAAAAAAAAAgP////8fAAAAAAAAAAAAAAAAAAAAAPD//wEAAAAAAAAAwP8BAAAAAAAAAAAAgP////8fAAAAAAAAAAAAAAAAAAAAAPD/fwAAAAAAAAAAwP8AAAAAAAAAAAAAgP8D/P8PAAAAAAAAAAAAAAAAAAAAAPD/fwAAAAAAAAAAwH8AAAAAAAAAAAAAgP8A2P8HAAAAAAAAAAAAAAAAAAAAAPD/OwAAAAAAAAAAgAAAAAAAAAAAAAAAgAcA6P8HAAAAAAAAAAAAAAAAAAAAAPj/BwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8P8DAAAGAAAAAAAAAAAAAAAAAPj/BwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8DAAAMAAAAAAAAAAAAAAAAAPz/BwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8DAABoAAAAAAAAAAAAAAAAAPz/AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGgAAAA8AAAAAAAAAAAAAAAAAPg/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAAAAPw/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAJAAAAAAAAAAAAAAAAAPwHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAIADAAAAAAAAAAAAAAAAAPgPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAIADCAAAAAAAAAAAAAAAAPgHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAOABAAAAAAAAAAAAAAAAAP4DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAAAAAAAAAP4BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHwAAAAAAAAAAAAAAAAAAP8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAP4DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH+AAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAPAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAAANAfAAAAxv//fIDn/wAAQAAAAAAAAAAAAAAAAAAAAIAHAAAAAAAAAAAAAAAAAP7/PwDA/////////y8AAAEAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAg8P///wP8//////////9/AAAAAAAAAAAAAAAAAAAAAPk/AAAAAAAAAAAAEADg+////wH/////////////DwAAAAAAAAAAAAAAAAAAAOL/AAAAAAAAIEF+fwr///////n/////////////3wcAAAAAAAAAAAAAAAAAAP9/AAAAAAAA//////////////j//////////////38AAAAAAAAAAAAAID4BAHh/AAAAAACo////////////f////////////////z8AAAAAAAAAcAYAYP//ff9/AAAAAAD4/////////////////////////////ycAAAAAAAAQ8fwzAP////9/AAAAAAD8/////////////////////////////wEAAAAAAPT///////////8PAAAAAOD/////////////////////////////fwAAAAAA4P///////////z8AAAAAwP//////////////////////////////fwAAAADg/////////////wcAAAAA/v///////////////////////////////xwAAACB////////////fMABAP6A/////////////////////////////////wcAAAAf4P///////////zADAP4ByP//////////////////////////////DwAAAAAAwP///////////zH44AcA////////////////////////////////HwAAAAAI/v////////////8/AAD8////////////////////////////////PwAAAAAA/P////////////8/+P///////////////////////////////////wMA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////';
  var MW = 360, MH = 180;
  var mask = (function(){
    var bin = atob(MASK_B64), m = new Uint8Array(MW * MH);
    for (var i = 0; i < bin.length; i++){
      var b = bin.charCodeAt(i);
      for (var k = 0; k < 8; k++) m[i * 8 + k] = (b >> k) & 1;
    }
    return m;
  })();

  /* Nubes: ruido suave fijo (siempre las mismas), giran un poco más rápido que la Tierra. */
  var nubes = (function(){
    var seed = 11; function rnd(){ seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    var GW = 24, GH = 12, g = [];
    for (var i = 0; i < GW * GH; i++) g.push(rnd());
    function v(x, y){ return g[((y % GH) + GH) % GH * GW + ((x % GW) + GW) % GW]; }
    function s(t){ return t * t * (3 - 2 * t); }
    var c = new Uint8Array(MW * MH);
    for (var y = 0; y < MH; y++) for (var x = 0; x < MW; x++){
      var n = 0, amp = 1, tot = 0;
      for (var o = 0; o < 3; o++){
        var f = 1 << o, fx = x / MW * GW * f, fy = y / MH * GH * f;
        var x0 = Math.floor(fx), y0 = Math.floor(fy), tx = s(fx - x0), ty = s(fy - y0);
        var a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * tx;
        var b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * tx;
        n += (a + (b - a) * ty) * amp; tot += amp; amp *= .5;
      }
      c[y * MW + x] = n / tot > .69 ? 1 : 0;
    }
    return c;
  })();

  var ITEM = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/';
  function img(src){ var i = new Image(); i.decoding = 'async'; i.src = src; return i; }

  /* Lo que recorre el mundo, repartido en tres órbitas cruzadas. */
  var COSAS = [
    {img:img(ITEM + 'poke-ball.png'), t:30}, {img:img(ITEM + 'great-ball.png'), t:30},
    {img:img(ITEM + 'ultra-ball.png'), t:30}, {img:img(ITEM + 'master-ball.png'), t:30},
    {img:img(ITEM + 'premier-ball.png'), t:30}, {img:img(ITEM + 'luxury-ball.png'), t:30},
    {img:img(ITEM + 'safari-ball.png'), t:30}, {img:img(ITEM + 'dive-ball.png'), t:30},
    {img:img(ITEM + 'quick-ball.png'), t:30},
    {moneda:true}, {moneda:true}, {moneda:true}, {moneda:true},
    {img:img('images/pokedex-icon.png'), t:34, liso:true}, {img:img('images/pokedex-icon.png'), t:34, liso:true}
  ];
  var ORB = [
    {rx:226, ry:60, tilt:-16, speed:-.00021},
    {rx:214, ry:72, tilt:34,  speed:.00016},
    {rx:206, ry:56, tilt:-64, speed:-.00013}
  ];
  COSAS.forEach(function(c, k){
    var o = k % 3, n = COSAS.filter(function(_, j){ return j % 3 === o; }).length;
    c.o = ORB[o]; c.fase = Math.floor(k / 3) * Math.PI * 2 / n + o * 1.1;
  });

  var GR = 58, R = 118;                       // radio del mundo: en píxeles del sprite y en unidades de la escena (500×500)
  var F0 = 10 * Math.PI / 180;                 // inclinación: se ve un poco más el norte
  var globo = document.createElement('canvas'); globo.width = globo.height = GR * 2;
  var gx = globo.getContext('2d'), gd = gx.createImageData(GR * 2, GR * 2);
  var PIX = [];
  (function(){
    var L = [-.45, .55, .7], ln = Math.hypot(L[0], L[1], L[2]);
    for (var py = 0; py < GR * 2; py++) for (var px = 0; px < GR * 2; px++){
      var x = (px + .5 - GR) / GR, y = (GR - py - .5) / GR, r2 = x * x + y * y;
      if (r2 > 1) continue;
      var z = Math.sqrt(1 - r2);
      var lat = Math.asin(z * Math.sin(F0) + y * Math.cos(F0));
      var lon = Math.atan2(x, z * Math.cos(F0) - y * Math.sin(F0));
      var luz = (x * L[0] + y * L[1] + z * L[2]) / ln;
      PIX.push({i:(py * GR * 2 + px) * 4, lat:lat, lon:lon, luz:luz, borde:r2 > .93});
    }
  })();
  // tres tonos por material (luz, medio, sombra): sombreado por bandas, como los sprites
  var COL = {
    mar:   [[74,150,224],[42,117,187],[26,78,140]],
    tierra:[[118,200,92],[70,160,70],[44,112,52]],
    arena: [[236,206,130],[206,170,96],[160,124,70]],
    hielo: [[246,250,255],[214,226,242],[170,190,218]],
    nube:  [[255,255,255],[232,238,248],[196,208,228]]
  };
  function esArena(lat, lon){
    return (lat > 15 && lat < 32 && lon > -16 && lon < 58) ||   // Sahara y Arabia
           (lat < -19 && lat > -31 && lon > 118 && lon < 146) || // Australia
           (lat > 36 && lat < 46 && lon > 75 && lon < 112);       // Taklamakán y Gobi
  }
  var D = 180 / Math.PI;
  function pintarGlobo(giro, giroNubes){
    var d = gd.data;
    for (var k = 0; k < PIX.length; k++){
      var p = PIX[k];
      var la = p.lat * D, lo = p.lon * D + giro;
      lo = ((lo + 180) % 360 + 360) % 360 - 180;
      var mx = Math.min(MW - 1, Math.floor(lo + 180)), my = Math.min(MH - 1, Math.floor(90 - la));
      var mat;
      var ln = ((p.lon * D + giroNubes + 180) % 360 + 360) % 360;
      var nube = nubes[my * MW + Math.min(MW - 1, Math.floor(ln))] && Math.abs(la) < 70;
      if (Math.abs(la) > 72) mat = COL.hielo;
      else if (mask[my * MW + mx]) mat = esArena(la, lo) ? COL.arena : COL.tierra;
      else mat = COL.mar;
      var t = p.luz > .55 ? 0 : p.luz > .12 ? 1 : 2;
      var c = mat[t];
      if (nube){ var w = COL.nube[t]; c = [c[0] * .3 + w[0] * .7, c[1] * .3 + w[1] * .7, c[2] * .3 + w[2] * .7]; }
      if (p.borde){ c = [c[0] * .82, c[1] * .82, c[2] * .9]; }
      d[p.i] = c[0]; d[p.i + 1] = c[1]; d[p.i + 2] = c[2]; d[p.i + 3] = 255;
    }
    gx.putImageData(gd, 0, 0);
  }

  var ctx = cv.getContext('2d');
  var estrellas = [];
  (function(){ var s = 5; function r(){ s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
    for (var i = 0; i < 46; i++){ var a = r() * Math.PI * 2, dd = 150 + r() * 110;
      estrellas.push({x:Math.cos(a) * dd, y:Math.sin(a) * dd, s:r() < .25 ? 3 : 2, f:r() * 6}); } })();

  function tamano(){
    var dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth;
    if (!w) return;
    cv.width = cv.height = Math.round(w * dpr);
  }
  function punto(o, th){
    var x0 = o.rx * Math.cos(th), y0 = o.ry * Math.sin(th), tr = o.tilt * Math.PI / 180;
    return {x:x0 * Math.cos(tr) - y0 * Math.sin(tr), y:x0 * Math.sin(tr) + y0 * Math.cos(tr), z:Math.sin(th)};
  }
  function moneda(x, y, s){
    var r = 11 * s;
    ctx.fillStyle = '#8A6200'; ctx.beginPath(); ctx.arc(x, y + 1.5 * s, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#F0B400'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFD84D'; ctx.beginPath(); ctx.arc(x, y, r * .7, 0, 7); ctx.fill();
    ctx.fillStyle = '#8A6200'; ctx.font = '700 ' + (13 * s) + "px 'Baloo 2',sans-serif";
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('P', x, y + s);
  }
  function cosa(c, t, delante){
    var p = punto(c.o, c.fase + t * c.o.speed);
    if ((p.z > 0) !== delante) return;
    var s = .78 + .22 * (p.z + 1) / 2;
    ctx.globalAlpha = delante ? 1 : .55 + .35 * (1 + p.z);
    if (c.moneda) moneda(p.x, p.y, s * 1.15);
    else if (c.img.complete && c.img.naturalWidth){
      var w = c.t * s * 1.3, h = w * c.img.naturalHeight / c.img.naturalWidth;
      ctx.imageSmoothingEnabled = !!c.liso;
      ctx.drawImage(c.img, p.x - w / 2, p.y - h / 2 + Math.sin(t / 420 + c.fase) * 3, w, h);
    }
    ctx.globalAlpha = 1;
  }
  function orbitas(delante){
    ctx.setLineDash([3, 7]); ctx.lineWidth = 1.2;
    ctx.strokeStyle = delante ? 'rgba(255,255,255,.42)' : 'rgba(255,255,255,.16)';
    ORB.forEach(function(o){
      ctx.save(); ctx.rotate(o.tilt * Math.PI / 180); ctx.beginPath();
      ctx.ellipse(0, 0, o.rx, o.ry, 0, delante ? 0 : Math.PI, delante ? Math.PI : Math.PI * 2);
      ctx.stroke(); ctx.restore();
    });
    ctx.setLineDash([]);
  }

  function dibujar(t){
    var W = cv.width; if (!W) return;
    ctx.setTransform(W / 500, 0, 0, W / 500, W / 2, W / 2);
    ctx.clearRect(-250, -250, 500, 500);
    estrellas.forEach(function(e){
      ctx.globalAlpha = .35 + .65 * Math.abs(Math.sin(t / 900 + e.f));
      ctx.fillStyle = '#fff'; ctx.fillRect(e.x, e.y, e.s, e.s);
    });
    ctx.globalAlpha = 1;
    var halo = ctx.createRadialGradient(0, 0, R * .9, 0, 0, R * 1.32);
    halo.addColorStop(0, 'rgba(110,180,255,.45)'); halo.addColorStop(1, 'rgba(110,180,255,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, R * 1.32, 0, 7); ctx.fill();

    orbitas(false);
    COSAS.forEach(function(c){ cosa(c, t, false); });

    // empieza mostrando Sudamérica (Jujuy) y gira de oeste a este, una vuelta cada 48 s
    pintarGlobo(-62 - t * 360 / 48000, -62 - t * 360 / 34000);
    ctx.fillStyle = '#14172A'; ctx.beginPath(); ctx.arc(0, 0, R + 3, 0, 7); ctx.fill();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(globo, -R, -R, R * 2, R * 2);

    orbitas(true);
    COSAS.forEach(function(c){ cosa(c, t, true); });
  }

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var corriendo = false, t0 = null, tAcum = 0;
  function frame(now){
    if (!corriendo) return;
    if (t0 === null) t0 = now - tAcum;
    tAcum = now - t0;
    dibujar(tAcum);
    requestAnimationFrame(frame);
  }
  function abierta(){ return !portada.classList.contains('is-out'); }
  function actualizar(){
    var on = abierta() && !reduced && !document.hidden;
    if (on && !corriendo){ corriendo = true; t0 = null; requestAnimationFrame(frame); }
    if (!on){ corriendo = false; dibujar(tAcum); }
  }
  function cerrar(){
    portada.classList.add('is-out');
    portada.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('portada-open');
    corriendo = false;
    var n = document.getElementById('nameInput');
    if (n && n.offsetParent) n.focus();
  }

  document.body.classList.add('portada-open');
  tamano(); dibujar(0);
  // cuando cargan los sprites y la letra, se redibuja aunque esté quieto (movimiento reducido)
  COSAS.forEach(function(c){ if (c.img) c.img.addEventListener('load', function(){ if (!corriendo) dibujar(tAcum); }); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ if (!corriendo) dibujar(tAcum); });
  window.addEventListener('resize', function(){ tamano(); if (!corriendo) dibujar(tAcum); });
  document.addEventListener('visibilitychange', actualizar);
  cv.addEventListener('click', cerrar);
  document.getElementById('portadaEntrar').addEventListener('click', cerrar);
  portada.addEventListener('keydown', function(e){ if (e.key === 'Escape') cerrar(); });
  actualizar();
  document.getElementById('portadaEntrar').focus({preventScroll:true});
})();
