/* Hoenn map: draws the whole overworld from the Pokémon Emerald game file already on this phone (nothing is uploaded or stored on the site),
   and shows a marker for where the trainer is, read from the game's memory every couple of seconds while the map is on screen. */
(function(){
'use strict';
var A = window.hdpApi; if (!A) return;
function dpr(){ try{ var b = document.getElementById('map-big') || (pop && pop.document.getElementById('map-big')); var w = b && b.ownerDocument.defaultView; return (w || window).devicePixelRatio || 1; }catch(e){ return 1; } }
var pop = null, popped = false, popHome = null, popMV = null;   // the map's own window (desktop)
var $ = function(id){ return document.getElementById(id) || (popped && popMV ? popMV.ownerDocument.getElementById(id) : null); };
var PLACE = [[0,40,232,30,30],[1,200,260,40,60],[2,200,140,40,20],[3,0,122,40,60],[4,320,0,40,20],[5,480,70,80,40],[6,640,100,80,40],[8,760,180,40,80],[9,120,282,20,20],[10,120,242,20,20],[11,60,362,20,20],[12,140,60,20,20],[13,80,0,20,20],[14,120,140,20,20],[15,480,260,20,40],[16,120,262,20,20],[17,70,242,50,20],[18,120,220,80,22],[19,0,182,40,80],[20,0,262,40,80],[21,0,342,80,20],[22,80,360,60,20],[23,140,360,60,20],[24,200,320,40,63],[25,200,160,40,100],[26,200,0,40,140],[27,160,20,40,60],[28,100,0,100,20],[29,40,2,40,80],[30,0,42,40,80],[31,40,122,100,20],[32,140,140,60,20],[33,240,140,80,20],[34,280,0,40,140],[35,360,0,40,100],[36,400,80,80,20],[37,420,100,40,40],[38,320,140,140,20],[39,560,60,80,80],[40,640,60,80,40],[41,560,140,80,80],[42,640,140,80,80],[43,640,220,120,40],[44,640,260,80,40],[45,560,260,80,40],[46,500,260,60,40],[47,400,260,80,40],[48,320,260,80,40],[49,240,260,80,40],[65,597,313,56,72,25],[75,653,313,72,72,25],[70,336,364,33,30,25]];   /* the last three (6th number = map group) are Battle Frontier (west, east) and the small island south of Pacifidlog's sea, found by matching the game's maps to the reference picture */                       // [map number in group 0, x, y, width, height] in tiles, from the game's own map-connection data
var WW = 816, WH = 395, MX = 8, MY = 6;      // world size in tiles including the scenery margin around the edge
var GROUPS = 0x486578, SB1PTR = 0x5D8C;  // table of map groups in the game file; where the game keeps the pointer to its player data
var POSX = 0;                         // number added to the stored x/y to get the map tile

var G = {rom: null, dv: null, ready: false, building: false, err: '', cells: null, atlas: null, atlasCv: null, over: null, n: 0, byId: {}, pos: null, last: null, indoors: false, room: null, stack: [], warps: null, pk: ''};
var MR = 3, RC = {};   // border (in tiles) drawn around a room; cache of drawn rooms

/* ---------- reading the game file ---------- */
function u32(o){ return G.dv.getUint32(o, true); }
function a2o(p){ return p - 0x08000000; }
function lz77(o){
  var r = G.rom; if (r[o] !== 0x10) return null;
  var n = r[o + 1] | r[o + 2] << 8 | r[o + 3] << 16, out = new Uint8Array(n), p = o + 4, k = 0;
  while (k < n){
    var f = r[p++];
    for (var b = 0; b < 8 && k < n; b++){
      if (f & (0x80 >> b)){ var x = r[p] << 8 | r[p + 1]; p += 2; var ln = (x >> 12) + 3, ds = (x & 0xFFF) + 1; for (var i = 0; i < ln && k < n; i++){ out[k] = out[k - ds]; k++; } }
      else out[k++] = r[p++];
    }
  }
  return out;
}
var TS = {};
function tileset(o){
  if (TS[o]) return TS[o];
  var r = G.rom, comp = r[o], tiles = a2o(u32(o + 4)), pal = a2o(u32(o + 8)), mt = a2o(u32(o + 12));
  var t = comp ? lz77(tiles) : r.subarray(tiles, tiles + 0x4000), pals = [];
  for (var p = 0; p < 16; p++){ var c = []; for (var i = 0; i < 16; i++){ var v = G.dv.getUint16(pal + p * 32 + i * 2, true); c.push([(v & 31) * 255 / 31 | 0, ((v >> 5) & 31) * 255 / 31 | 0, ((v >> 10) & 31) * 255 / 31 | 0]); } pals.push(c); }
  return TS[o] = {tiles: t, pals: pals, mt: mt};
}
/* one 16x16 block of scenery, written into the picture sheet at cell `idx` */
function paintMetatile(t1o, t2o, mid, idx){ paintInto(G.atlas, 1024, (idx & 63) * 16, (idx >> 6) * 16, t1o, t2o, mid); }
function paintInto(px, W, ox, oy, t1o, t2o, mid){
  var t1 = tileset(t1o), t2 = tileset(t2o), ts = mid < 512 ? t1 : t2, base = ts.mt + (mid < 512 ? mid : mid - 512) * 16;
  for (var layer = 0; layer < 2; layer++) for (var q = 0; q < 4; q++){
    var e = G.dv.getUint16(base + (layer * 4 + q) * 2, true), ti = e & 0x3FF, hf = (e >> 10) & 1, vf = (e >> 11) & 1, pl = e >> 12;
    var tdata = ti < 512 ? t1.tiles : t2.tiles, tix = ti < 512 ? ti : ti - 512, pal = (pl < 6 ? t1 : t2).pals[pl], qx = ox + (q & 1) * 8, qy = oy + (q >> 1) * 8;
    for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++){
      var xx = hf ? 7 - x : x, yy = vf ? 7 - y : y, off = tix * 32 + yy * 4 + (xx >> 1);
      if (off >= tdata.length) continue;
      var b = tdata[off], c = (xx & 1) ? (b >> 4) : (b & 15);
      if (c === 0 && layer === 1) continue;
      var o = ((qy + y) * W + qx + x) * 4, col = pal[c]; px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255;
    }
  }
}
function cellFor(t1o, t2o, mid){
  var key = t1o + ':' + t2o + ':' + mid, i = G.byId[key];
  if (i === undefined){ i = G.n++; if (i >= 64 * 128) return 0; G.byId[key] = i; paintMetatile(t1o, t2o, mid, i); }
  return i;
}
function layoutOf(hoff){ var lo = a2o(u32(hoff)); return {w: u32(lo), h: u32(lo + 4), border: a2o(u32(lo + 8)), map: a2o(u32(lo + 12)), t1: a2o(u32(lo + 16)), t2: a2o(u32(lo + 20))}; }
function mapHeader(i){ var g0 = a2o(u32(GROUPS)); return a2o(u32(g0 + 4 * i)); }
function romPtr(p){ return p >= 0x08000000 && p < 0x08000000 + G.rom.length; }
function mapHeaderG(g, n){
  if (g > 60 || n > 250) return -1;
  var gp = u32(GROUPS + 4 * g); if (!romPtr(gp)) return -1;
  var hp = u32(a2o(gp) + 4 * n); if (!romPtr(hp)) return -1;
  var ho = a2o(hp), lp = u32(ho); if (!romPtr(lp)) return -1;
  var lo = a2o(lp), w = u32(lo), h = u32(lo + 4); if (w < 1 || h < 1 || w > 255 || h > 255) return -1;
  if (!romPtr(u32(lo + 12)) || !romPtr(u32(lo + 16)) || !romPtr(u32(lo + 20)) || !romPtr(u32(lo + 8))) return -1;
  return ho;
}
/* doors, stairs and cave mouths of a map: where each leads (map group, map number, and which exit of that map you arrive at) */
function warpsOf(g, n){
  var ho = mapHeaderG(g, n), out = []; if (ho < 0) return out;
  var ep = u32(ho + 4); if (!romPtr(ep)) return out;
  var eo = a2o(ep), cnt = G.rom[eo + 1], wp = u32(eo + 8); if (!cnt || !romPtr(wp)) return out;
  for (var i = 0; i < cnt; i++){
    var o = a2o(wp) + i * 8, mn = G.rom[o + 6], mg = G.rom[o + 7];
    out.push({x: G.dv.getInt16(o, true), y: G.dv.getInt16(o + 2, true), id: G.rom[o + 5], g: mg, n: mn, ok: mg < 60 && mn < 250 && mapHeaderG(mg, mn) >= 0});
  }
  return out;
}
function worldWarps(){
  if (G.warps) return G.warps; var out = [];
  PLACE.forEach(function(pl){ warpsOf(pl[5] || 0, pl[0]).forEach(function(w){ if (w.ok) out.push({x: pl[1] + MX + w.x + 0.5, y: pl[2] + MY + w.y + 0.5, g: w.g, n: w.n, id: w.id}); }); });
  out.push({x: 611, y: 192, g: 0, n: 7, id: 0});   /* Sootopolis City has no place on the overworld: its entrance is the dark crater of Route 126 */
  return G.warps = out;
}
function plHdr(pl){ return pl[5] ? mapHeaderG(pl[5], pl[0]) : mapHeader(pl[0]); }
function isWorld(g, n){ for (var k = 0; k < PLACE.length; k++) if (PLACE[k][0] === n && (PLACE[k][5] || 0) === g) return true; return false; }
var CC = {};
/* a building or cave with several rooms: every room reachable from this one without going outdoors, laid out side by side; doors that join two rooms get the same letter */
function compositeOf(g, n){
  if (!roomOf(g, n)) return null;
  var seen = {}, order = [], q = [[g, n]]; seen[g + ':' + n] = 1;
  while (q.length && order.length < 30){
    var c = q.shift(); order.push(c);
    warpsOf(c[0], c[1]).forEach(function(w){
      if (!w.ok || isWorld(w.g, w.n)) return; var k = w.g + ':' + w.n;
      if (!seen[k] && roomOf(w.g, w.n)){ seen[k] = 1; q.push([w.g, w.n]); }
    });
  }
  var key = order.map(function(c){ return c[0] + ':' + c[1]; }).sort().join(',');
  if (CC[key]) return CC[key];
  order.sort(function(a, b){ return a[0] - b[0] || a[1] - b[1]; });
  var GAP = 4, ROWW = order.length > 1 ? 70 : 9999, x = 0, y = 0, rh = 0, sw = 0, off = {}, rooms = [];
  order.forEach(function(c){
    var R = roomOf(c[0], c[1]);
    if (x > 0 && x + R.w > ROWW){ x = 0; y += rh + GAP; rh = 0; }
    off[c[0] + ':' + c[1]] = {x: x, y: y}; rooms.push({R: R, x: x, y: y});
    x += R.w + GAP; rh = Math.max(rh, R.h); sw = Math.max(sw, x - GAP);
  });
  var SW = sw, SH = y + rh, W = (SW + 2 * MR) * 16, H = (SH + 2 * MR) * 16, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  var cx = cv.getContext('2d'); cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
  rooms.forEach(function(r){
    cx.drawImage(r.R.cv, MR * 16, MR * 16, r.R.w * 16, r.R.h * 16, (r.x + MR) * 16, (r.y + MR) * 16, r.R.w * 16, r.R.h * 16);
    if (order.length > 1){ cx.strokeStyle = '#7a8a99'; cx.lineWidth = 2; cx.strokeRect((r.x + MR) * 16 - 1, (r.y + MR) * 16 - 1, r.R.w * 16 + 2, r.R.h * 16 + 2); }
  });
  /* doors: letters for pairs that join two rooms here, plain exits for the rest */
  var all = [], pos = {}, lab = {}, nextL = 0, LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  rooms.forEach(function(r){ warpsOf(r.R.g, r.R.n).forEach(function(w, i){
    if (!w.ok) return; var e = r.R.g + ':' + r.R.n + '#' + i;
    var it = {e: e, x: r.x + w.x + 0.5, y: r.y + w.y + 0.5, g: w.g, n: w.n, id: w.id, dest: w.g + ':' + w.n + '#' + w.id, label: ''}; all.push(it); pos[e] = it;
  }); });
  var pairL = {};
  all.forEach(function(it){
    if (!off[it.g + ':' + it.n] || !pos[it.dest] || order.length < 2) return;
    var pk = [it.e, it.dest].sort().join('~'); if (!pairL[pk]) pairL[pk] = LET.charAt(nextL++ % LET.length);
    it.pk = pk; it.label = it.label || pairL[pk];
  });
  all.forEach(function(it){ if (it.label && pos[it.dest]){ var o = pos[it.dest]; if (!o.label) o.label = it.label; it.link = o; } });
  all.forEach(function(it){ if (it.pk && !it.link){ for (var k = 0; k < all.length; k++) if (all[k].pk === it.pk && all[k] !== it){ it.link = all[k]; break; } } });
  return CC[key] = {g: g, n: n, key: key, single: order.length < 2, w: SW, h: SH, cv: cv, off: off, warps: all, count: order.length};
}
/* where the trainer is on a room sheet, in sheet tiles (or null) */
function hereOf(R){ if (!R || !G.pos) return null; var o = R.off[G.pos.g + ':' + G.pos.n]; return o ? {x: o.x + G.pos.x + 0.5, y: o.y + G.pos.y + 0.5} : null; }
/* a room (building, cave, any map) drawn once at full size from the game file */
function roomOf(g, n){
  var key = g + ':' + n; if (RC[key]) return RC[key];
  var ho = mapHeaderG(g, n); if (ho < 0) return null;
  var L = layoutOf(ho), W = (L.w + 2 * MR) * 16, H = (L.h + 2 * MR) * 16, px = new Uint8ClampedArray(W * H * 4);
  var bl = [0, 1, 2, 3].map(function(q){ return G.dv.getUint16(L.border + 2 * q, true) & 0x3FF; });
  for (var ty = -MR; ty < L.h + MR; ty++) for (var tx = -MR; tx < L.w + MR; tx++){
    var mid = (tx >= 0 && tx < L.w && ty >= 0 && ty < L.h) ? G.dv.getUint16(L.map + (ty * L.w + tx) * 2, true) & 0x3FF : bl[(tx & 1) + (ty & 1) * 2];
    paintInto(px, W, (tx + MR) * 16, (ty + MR) * 16, L.t1, L.t2, mid);
  }
  var cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').putImageData(new ImageData(px, W, H), 0, 0);
  return RC[key] = {g: g, n: n, w: L.w, h: L.h, cv: cv, warps: warpsOf(g, n).filter(function(w){ return w.ok; })};
}

/* ---------- building the world (in small slices so the game is not held up) ---------- */
function build(done){
  var rom = A.st.rom && A.st.rom.buf; G.err = '';
  if (!rom){ G.err = 'Load your game first.'; return done(); }
  G.rom = new Uint8Array(rom); G.dv = new DataView(G.rom.buffer, G.rom.byteOffset, G.rom.byteLength);
  var code = String.fromCharCode(G.rom[0xAC], G.rom[0xAD], G.rom[0xAE], G.rom[0xAF]);
  if (code !== 'BPEE'){ G.err = 'The map is made for Pokémon Emerald.'; return done(); }
  try{
    for (var k = 0; k < PLACE.length; k++){ var L = layoutOf(plHdr(PLACE[k])); if (L.w !== PLACE[k][3] || L.h !== PLACE[k][4]) throw new Error('layout'); }
  }catch(e){ G.err = 'This game file has different maps than the usual Emerald, so the map is not available.'; return done(); }
  G.cells = new Int32Array(WW * WH).fill(-1); G.atlas = new Uint8ClampedArray(1024 * 2048 * 4); G.n = 0; G.byId = {}; TS = {};
  var i = 0, pass = 1, LASTP = 3,   /* pass 0 (game margins) is no longer used */  F = null, fy = 0;   /* with the reference picture loaded there is no margin or gap fill: the picture shows through */
  (function step(){
    var t0 = Date.now();
    while (pass < LASTP && Date.now() - t0 < 12){
      if (pass === 2){   /* the gaps between places: continue the scenery of the nearest place (its border tiles) */
        if (!F){ rockBits(); }   /* before any filler is laid, so only real map tiles are sampled */
        if (!F) F = PLACE.map(function(pl2){
          var L3 = layoutOf(plHdr(pl2)), bl3 = [0, 1, 2, 3].map(function(q){ return G.dv.getUint16(L3.border + 2 * q, true) & 0x3FF; }), sr = 0, sg = 0, sb = 0;
          bl3.forEach(function(m){ var ci = cellFor(L3.t1, L3.t2, m), ox = (ci & 63) * 16, oy = (ci >> 6) * 16; for (var yy = 0; yy < 16; yy++) for (var xx = 0; xx < 16; xx++){ var o = ((oy + yy) * 1024 + ox + xx) * 4; sr += G.atlas[o]; sg += G.atlas[o + 1]; sb += G.atlas[o + 2]; } });
          var cl = (sb > sr + 40 * 1024 && sb > sg + 40 * 1024) ? 0 : (sr > sg - 5 * 1024 ? 2 : 1);   /* what the border looks like: sea, land or mountain */
          return {pl5: pl2[5], x0: pl2[1] + MX, y0: pl2[2] + MY, x1: pl2[1] + MX + L3.w, y1: pl2[2] + MY + L3.h, t1: L3.t1, t2: L3.t2, bl: bl3, cl: cl};
        });
        if (!G.K) buildK(F);
        for (var gx = 0; gx < WW; gx++){
          if (G.cells[fy * WW + gx] >= 0) continue;
          var want = G.K[fy * WW + gx], bi = -1, bd = 1e12, bi2 = -1, bd2 = 1e12;
          for (var fi = 0; fi < F.length; fi++){ var f = F[fi], ddx = gx < f.x0 ? f.x0 - gx : (gx >= f.x1 ? gx - f.x1 + 1 : 0), ddy = fy < f.y0 ? f.y0 - fy : (fy >= f.y1 ? fy - f.y1 + 1 : 0), dd = ddx * ddx + ddy * ddy; if (dd < bd2){ bd2 = dd; bi2 = fi; } if (f.cl === want && dd < bd){ bd = dd; bi = fi; } }
          var fb = F[bi >= 0 ? bi : bi2], pick = cellFor(fb.t1, fb.t2, fb.bl[((gx - fb.x0) & 1) + ((fy - fb.y0) & 1) * 2]);
          if (want === 2){ var rk = rockBits(), hh = ((gx * 73856093) ^ (fy * 19349663)) >>> 0; if (rk.length && hh % 100 < 14) pick = rk[(hh >>> 8) % rk.length]; }   /* a scattering of real rock/cliff tiles so mountains are not one flat colour */
          if (!G.edge) G.edge = learnEdges(F);
          var eb = (kAt(gx, fy - 1) === 0 ? 1 : 0) | (kAt(gx + 1, fy) === 0 ? 2 : 0) | (kAt(gx, fy + 1) === 0 ? 4 : 0) | (kAt(gx - 1, fy) === 0 ? 8 : 0);
          if (eb && want > 0){ var el = G.edge[want * 16 + eb]; if (el){ var h2 = ((gx * 2654435761) ^ (fy * 40503)) >>> 0; pick = el[h2 % el.length]; } }   /* shorelines and cliff edges use the real edge tiles */
          G.cells[fy * WW + gx] = pick;
        }
        if (++fy >= WH) pass++;
        continue;
      }
      if (i >= PLACE.length){ pass++; i = 0; continue; }
      var pl = PLACE[i++], L2 = layoutOf(plHdr(pl)), ax = pl[1] + MX, ay = pl[2] + MY;
      if (pass === 0){
        if (pl[5]) continue;   /* the picture shows through around these */
        var bl = [0, 1, 2, 3].map(function(q){ return G.dv.getUint16(L2.border + 2 * q, true) & 0x3FF; });
        for (var ty = -MY; ty < L2.h + MY; ty++) for (var tx = -MX; tx < L2.w + MX; tx++){
          if (tx >= 0 && tx < L2.w && ty >= 0 && ty < L2.h) continue;
          var cx = ax + tx, cy = ay + ty; if (cx < 0 || cy < 0 || cx >= WW || cy >= WH) continue;
          G.cells[cy * WW + cx] = cellFor(L2.t1, L2.t2, bl[(tx & 1) + (ty & 1) * 2]);
        }
      } else {
        for (var y = 0; y < L2.h; y++) for (var x = 0; x < L2.w; x++){
          var v = G.dv.getUint16(L2.map + (y * L2.w + x) * 2, true) & 0x3FF, cx2 = ax + x, cy2 = ay + y;
          G.cells[cy2 * WW + cx2] = cellFor(L2.t1, L2.t2, v);
        }
      }
    }
    if (pass < LASTP) return setTimeout(step, 0);
    finish(); done();
  })();
}
function finish(){
  var rows = ((G.n >> 6) + 1) * 16, cv = document.createElement('canvas'); cv.width = 1024; cv.height = Math.max(16, rows);
  var img = new ImageData(G.atlas.subarray(0, 1024 * cv.height * 4), 1024, cv.height); cv.getContext('2d').putImageData(img, 0, 0); G.atlasCv = cv;
  /* zoomed-out picture: 4 px per tile, each block shrunk 16 -> 4 by averaging */
  var small = new Uint8ClampedArray(G.n * 16 * 4);
  for (var i = 0; i < G.n; i++) for (var sy = 0; sy < 4; sy++) for (var sx = 0; sx < 4; sx++){
    var r = 0, g = 0, b = 0;
    for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++){ var o = (((i >> 6) * 16 + sy * 4 + y) * 1024 + (i & 63) * 16 + sx * 4 + x) * 4; r += G.atlas[o]; g += G.atlas[o + 1]; b += G.atlas[o + 2]; }
    var q = (i * 16 + sy * 4 + sx) * 4; small[q] = r >> 4; small[q + 1] = g >> 4; small[q + 2] = b >> 4; small[q + 3] = 255;
  }
  var ow = WW * 4, oh = WH * 4, od = new Uint8ClampedArray(ow * oh * 4);
  for (var cy = 0; cy < WH; cy++) for (var cx = 0; cx < WW; cx++){
    var c = G.cells[cy * WW + cx]; if (c < 0) { for (var yy = 0; yy < 4; yy++) for (var xx = 0; xx < 4; xx++) od[((cy * 4 + yy) * ow + cx * 4 + xx) * 4 + 3] = 255; continue; }
    for (var yy2 = 0; yy2 < 4; yy2++) for (var xx2 = 0; xx2 < 4; xx2++){ var s = (c * 16 + yy2 * 4 + xx2) * 4, d = ((cy * 4 + yy2) * ow + cx * 4 + xx2) * 4; od[d] = small[s]; od[d + 1] = small[s + 1]; od[d + 2] = small[s + 2]; od[d + 3] = 255; }
  }
  var oc = document.createElement('canvas'); oc.width = ow; oc.height = oh; oc.getContext('2d').putImageData(new ImageData(od, ow, oh), 0, 0); G.over = oc;
  G.atlas = null; G.ready = true;
}
function ensure(cb){
  if (G.ready) return cb(); if (G.building) return; G.building = true; setMsg('Drawing the map from your game…');
  build(function(){ G.building = false; G.fatal = !!G.err && G.err !== 'Load your game first.'; if (G.err) setMsg(G.err); else setMsg(''); cb(); });
}
/* coarse sea / land / mountain shape of Hoenn, one value per tile of the world (run-length coded: run*3+class in base 36; 0 sea, 1 land, 2 mountain). It only says WHERE land and sea go; all the scenery is made from your game's tiles. */
var SHAPE = 'u,14,q,2v,h,41,h,64,6e,p,8,d7,w6,14,q,2v,h,g,9,3d,h,64,6e,p,8,dm,vr,14,q,2v,h,g,9,3d,h,64,6e,p,8,dp,vl,17,q,2v,h,g,3,3j,h,64,6e,p,8,dp,vl,17,q,2v,h,27,b,1m,h,64,6e,p,8,ds,vf,1a,q,2p,55,5y,6h,p,8,1s,5,6,ca,ux,1a,q,2p,55,11,5,4v,6h,p,8,1p,5,9,cd,uu,1a,q,1s,62,y,8,2d,e,4,8,s,8,y,6k,p,8,1m,f,cd,uu,1a,q,1p,65,p,h,7,e,1a,18,s,5,11,6k,p,8,1j,i,cg,ur,1a,q,1m,68,a,1h,s,1e,1p,5,7,6e,7,8,p,b,1a,o,27,e,4,8,a7,u6,1d,q,v,k,a,68,a,t,4,e,11,z,21,8,7,32,7,35,a,8,p,e,14,r,27,n,aa,u3,1d,q,s,1h,r,2h,a,28,m,e,1m,n,7,5,y,8,y,8,a,2b,17,2t,a,b,m,e,14,r,6g,5,7,8,64,8,u0,1d,2w,r,2e,d,8,a,1q,s,b,14,5,j,h,11,h,y,q,a,t,7,t,1a,2w,7,e,j,h,y,u,6g,8,6d,8,u0,1d,2t,i,w,9,25,a,1q,7,8,j,8,11,b,j,h,7,5,p,k,7,8,4,z,1j,n,1p,2h,7,h,m,b,s,10,3j,h,9p,ti,1d,2t,f,w,f,4b,j,e,s,n,a,h,4,8,p,n,4,t,4,e,1m,k,1p,2e,a,h,m,b,p,13,17,5,2a,h,9s,tf,1d,2t,f,z,9,3t,a,e,m,b,d,8,a,q,a,8,7,b,d,8,7,n,g,8,4g,32,m,b,m,16,14,8,2d,8,9y,tf,1d,2t,f,12,3,3z,17,b,7,b,a,t,m,8,d,8,a,e,m,8,4g,32,m,8,m,19,14,8,5d,8,71,tc,1d,2t,f,3k,3,1h,21,w,11,8,g,8,p,k,s,15,2a,32,m,b,g,1c,14,5,11,6,3j,b,g,e,77,t3,1d,2t,f,3h,9,1e,21,w,y,b,1a,w,d,1e,24,32,m,e,d,1c,14,8,v,c,3g,b,f,7,b,7,5,6v,t3,1d,2h,7,8,f,e,6,e,9,2e,9,1e,2d,n,d,q,1a,2t,1y,35,j,e,v,u,11,8,y,9,3j,8,l,7,c,8,4,8,6s,su,1v,1w,d,i,e,6,b,f,2b,6,4,1b,1a,b,y,k,g,q,17,2w,1y,2n,4,k,g,e,v,x,y,8,4p,b,3,5,f,g,h,6v,sr,1v,1w,3,7,l,e,6,b,f,2e,7,h,7,b,4,e,14,w,m,h,j,n,17,2w,1g,e,a,2h,7,k,j,b,v,9,d,f,v,5,4s,k,r,h,74,si,1y,1b,1f,q,f,h,4,25,7,8,7,5,d,e,y,15,1d,k,1a,2w,1g,e,d,2h,4,n,g,b,1j,9,y,8,4p,b,16,b,74,si,2d,8,j,8,1i,n,f,e,a,1z,14,b,y,15,1a,n,1a,2t,1j,b,g,2t,4,b,g,b,1j,9,y,8,4s,5,1c,8,77,sf,31,8,c,5,3,a,u,n,c,h,d,8,d,12,1g,5,14,12,a,h,7,8,a,n,1a,2e,2m,2h,4,b,7,8,g,b,1j,c,5p,8,1f,7g,s9,31,q,a,x,k,a,n,a,5,14,e,3v,z,4,b,2a,k,v,b,2p,2e,7,b,7,8,g,b,1j,c,5p,8,1f,7m,s3,3d,e,a,5,x,h,3,4,6,e,d,5,2y,5,2a,1e,4s,8,1j,2e,a,b,a,5,g,b,1j,c,5v,o,b,i,7p,s0,3d,e,7,8,10,b,l,5,d,8,2v,8,27,1h,4s,b,1g,2b,d,b,s,b,1m,9,s,5,54,l,e,c,7v,rx,3j,k,10,b,o,d,5,31,5,1y,1w,4m,5,1j,2b,g,b,s,h,1g,9,6a,6,a,8,6,81,rx,3j,k,10,b,o,a,8,a,b,4,5,4,e,4,b,v,5,4,5,4,5,4,5,4,8,1v,1z,4m,5,1g,2e,g,b,v,e,p,8,m,9,fd,ri,5,3v,5,13,b,r,7,8,a,t,a,1z,1p,28,44,e,11,2q,m,b,v,1k,a,9,4,h,a,5,em,rf,8,3s,8,6,d,i,b,r,q,y,1z,1m,3h,2y,8,14,2q,p,b,a,5,m,1n,4,c,h,7,8,ep,rc,8,3s,8,6,d,i,b,u,n,y,2w,m,4h,1y,b,a,3k,p,b,a,8,y,18,f,h,d,b,em,r9,3v,5,9,d,i,b,x,1g,32,d,4k,1y,b,a,3k,p,b,a,b,11,h,4,5,a,8,c,4,k,d,8,ev,r0,3y,f,7,i,b,u,1j,82,1s,8,a,3h,v,b,d,8,y,n,g,5,c,7,8,7,8,d,5,ey,qx,1j,5,2g,10,b,u,1j,82,1p,b,a,3h,v,b,d,8,y,n,d,8,c,7,8,7,8,d,8,4p,3,s,6,9a,qu,1g,8,2g,10,b,u,1j,7q,21,e,7,3h,v,b,d,8,1v,8,c,7,8,4,5,j,8,4m,3,ad,qr,1g,8,2g,10,b,x,5,1d,7q,21,e,7,3h,v,b,d,8,1v,8,f,4,5,4,8,g,e,4g,6,m,3,g,3,9g,qi,1g,5,2p,u,b,u,4,8,17,4t,a,2q,27,b,7,3h,v,b,d,b,1s,8,c,g,5,g,e,4g,9,g,6,d,6,9g,qi,1g,5,31,i,a,6,h,g,5,14,4w,a,2t,27,8,7,3h,v,b,d,b,1s,b,4,3,j,8,d,12,3v,3,11,6,g,3,91,qf,1g,8,3v,h,1m,8b,1s,8,7,3h,v,b,g,b,1p,b,9,j,5,j,8,7,k,51,6,a,6,97,q9,1g,e,3s,5,4,8,1m,8b,24,3h,v,b,j,8,m,b,v,8,c,7,5,1g,z,44,6,4,6,a,6,9a,q6,1g,e,5p,7n,4,t,s,q,j,3n,p,b,m,8,g,h,v,5,f,4,8,1s,k,41,9,9y,q6,1g,e,5p,7n,4,w,m,w,j,3k,p,b,m,8,g,k,s,l,24,e,44,3,a7,q0,1g,e,5p,8t,d,z,g,3k,p,b,p,8,j,e,s,o,24,b,eg,px,1g,e,2a,8,3a,8z,7,z,d,3n,p,b,p,8,j,e,s,o,24,b,ej,pu,1g,e,2a,8,3a,7t,4,8,d,1t,a,3n,p,e,m,8,m,5,y,5,l,1s,n,em,pr,1g,e,2a,8,3a,82,g,1n,d,3n,p,h,j,8,1j,8,l,1v,k,ep,pr,1d,e,2a,8,24,8,11,82,g,1q,7,3t,p,e,j,8,1j,8,r,gy,pr,1a,e,27,b,3a,82,7,5w,p,e,j,b,1m,19,gg,pr,1a,e,1y,k,37,e5,v,8,j,e,7,5,1m,13,y,8,47,8,ay,po,1a,e,1v,n,37,85,4,5z,v,8,2p,13,v,b,47,8,ay,5,pl,1a,t,a,n,a,8,7,t,31,68,a,1k,p,5k,v,8,31,x,p,b,47,8,ay,8,pi,1a,t,a,n,j,e,7,e,34,65,d,1e,s,5,4,5e,v,8,34,8,3,7,f,p,b,44,b,ay,8,pi,1a,e,4,5,4,k,7,e,j,e,3m,3t,7,3t,j,e,a,5b,v,8,2m,b,4,h,a,c,p,b,41,e,b7,pf,1v,k,a,b,j,e,j,8,2y,3t,7,3t,g,h,a,58,y,8,14,8,1a,w,a,c,p,b,41,e,ba,pc,1s,t,7,h,a,e,j,8,2y,7e,m,k,d,58,y,8,17,b,y,w,g,f,m,b,41,e,bd,p9,1v,q,a,e,a,e,j,8,1d,b,1d,6e,7,w,m,h,g,58,y,8,17,b,y,t,j,f,m,b,41,e,bd,p9,2g,5,a,e,a,e,1y,5,4,8,17,62,d,8,7,1b,4,k,7,5h,y,8,1a,5,j,15,p,f,m,b,3g,5,j,e,ba,8,p6,2g,5,j,5,a,e,24,8,17,62,d,8,d,1q,4,5k,y,b,1s,t,7,5,s,f,m,b,3d,b,j,b,ba,8,p6,1j,b,m,8,v,8,1s,e,1j,4w,7,z,y,1n,7,5k,y,b,17,t,1p,c,m,b,3d,b,g,e,ba,8,p3,5,1j,8,p,8,v,8,1s,b,g,5,14,4k,4,b,a,t,11,1n,7,h,7,4z,y,b,17,8,4,k,1p,c,m,b,3y,h,ba,8,p3,8,2a,8,3d,b,y,4k,a,b,4,z,y,1k,a,b,d,4z,y,e,3g,f,m,b,41,e,bm,ox,8,2a,8,3g,8,v,4n,7,1e,11,1h,7,e,a,52,y,e,3g,f,m,b,3d,6,j,e,bm,p0,b,27,5,1p,8,1p,5,p,6b,14,1w,d,4z,11,h,11,6,21,f,p,b,3d,6,j,e,bp,p0,b,1a,5,2j,8,v,5,1j,6b,14,1w,d,4z,11,h,11,6,1v,l,p,b,3d,6,j,e,bm,8,p3,5,1a,5,1v,8,g,b,2g,6h,14,1q,d,4w,17,e,2v,o,s,b,44,b,bm,8,p6,34,e,4,k,2g,6h,14,1q,d,4w,1a,b,2v,l,v,b,1g,5,2m,b,bm,8,p6,34,w,2j,55,9,t,6,5,17,1e,1j,3z,1d,b,2v,l,v,e,1d,8,2j,b,j,8,4,b,am,8,er,4,ac,34,t,2m,55,c,n,c,17,8,7,e,4,h,1v,5,a,3h,1d,b,2v,l,y,b,1d,e,1m,6,m,b,j,q,ag,8,83,7,6i,4,af,31,h,2y,52,f,4,e,7,9,1a,8,j,5,2v,38,1d,e,2m,i,17,e,1g,8,2a,e,j,q,ag,8,7x,a,13,4,fx,5,2y,e,31,55,9,a,8,5d,35,1j,h,2g,f,1a,e,1g,8,1y,q,j,l,5,ag,8,2r,a,4x,7,16,7,fx,2y,e,31,58,3,3a,e,4,5,24,35,1j,k,2a,i,1d,e,v,5,g,b,1v,8,d,8,j,l,8,ad,8,2i,e,a,4x,4,h9,2y,e,31,5b,3a,q,1y,35,1m,n,21,i,1g,h,s,8,d,8,7,8,1m,8,d,8,6,m,9,4,8,ad,8,2c,k,g,m3,2y,e,v,5,24,5b,d,5,g,5,2j,8,4,b,1g,b,a,35,1s,n,1v,i,1g,h,s,b,m,8,1m,8,d,8,6,m,c,5,6s,8,d,b,31,5,2c,q,d,m0,2y,5,14,h,1j,5e,m,5,4,5,a,5,1y,5,p,b,d,n,g,e,a,35,1v,t,1g,l,1p,b,s,b,p,5,1m,8,d,8,j,o,6p,8,j,8,21,i,g,8,2c,q,3,a,4r,d,gu,5,41,k,1j,5e,p,8,2d,5,m,b,d,8,7,8,p,8,a,35,v,8,1d,b,1g,i,1s,b,v,8,m,8,1g,e,d,8,j,o,64,b,a,b,m,5,1v,o,g,8,2c,q,3,a,2c,4,2c,d,60,4,f,4,a9,8,14,e,2j,8,g,5,1d,5q,5s,32,y,5,1d,e,1d,i,1s,b,y,5,p,5,1d,b,j,8,j,o,61,b,34,o,p,23,7,q,3,a,2c,a,x,7,13,d,60,a,9,7,a6,b,11,h,2g,8,d,8,1d,5q,d,q,4p,35,2d,e,1d,i,1s,e,3s,5,a,6,7,o,5y,b,37,6,d,6,1j,16,a,q,d,2c,a,x,7,13,d,63,a,3,7,a9,e,14,e,4d,5b,a,8,d,q,34,12,p,35,2a,e,1g,9,1y,e,44,10,5a,8,21,5,1v,6,d,6,a,c,7,6,y,l,m,n,g,u,4,1f,7,23,g,70,7,9u,8,14,b,4g,58,v,n,37,12,m,38,2a,e,1g,9,1y,e,47,10,57,5,24,8,2a,6,a,c,7,c,11,c,m,n,d,x,4,3r,d,5l,7,19,7,9x,a,b,p,b,g,8,3v,58,4j,12,p,38,2a,e,1j,6,14,18,v,5,2s,5,7,6,d,o,54,b,24,b,d,6,27,9,a,9,14,3,7,6,4,b,o,d,ar,4,bc,a,b,s,b,d,n,3g,58,4g,18,j,3e,27,e,1j,6,14,18,v,8,2m,8,7,6,g,l,51,e,27,8,d,6,27,9,d,6,11,8,7,6,4,b,r,7,m9,a,b,v,15,3g,5e,1m,k,1p,1q,j,3h,24,e,1g,9,14,18,v,b,2j,8,s,i,4j,8,2y,8,a,5,44,8,m,bf,4,bu,4,3,e,7,5,j,w,4,b,3a,5h,1j,z,1a,1t,g,3k,24,e,1j,6,14,e,7,q,v,b,2j,8,v,f,4j,8,31,8,4d,8,m,96,a,e6,j,5,7,8,m,b,7,b,3a,88,p,22,g,3k,24,e,g,z,4,9,w,a,e,1v,5,2j,8,17,8,4g,5,7m,8,d,9c,v,do,m,b,p,q,34,8e,m,25,g,3k,24,e,d,12,4,9,z,7,e,1v,5,1g,l,j,8,17,8,7v,8,2a,8,1p,8,a,1c,4,80,y,u,4,co,p,5,m,h,a,8,2v,8n,j,25,g,3n,24,15,p,9,8,a,5,7,b,7,n,1j,8,1g,o,g,8,17,8,7v,e,7,9,4,e,4,t,a,e,4,c,1m,93,a,c,s,u,7,co,m,8,j,5,7,5,d,8,2v,8n,j,22,j,3n,24,12,s,9,p,12,1j,b,1d,o,g,8,3,14,b,11,5,6s,b,7,9,4,15,d,b,7,c,1a,3,a,89,a,c,4,9,7,f,s,o,a,co,14,8,d,8,7,8,2s,8q,d,28,j,3n,24,z,y,6,p,z,1p,b,1a,o,g,8,3,17,b,v,8,77,6,21,9,1a,9,a,89,7,9,4,f,4,i,d,du,8,y,8,g,8,7,8,2s,8q,a,2b,j,3n,24,12,m,b,9,8,d,12,1p,b,1a,o,j,5,1d,b,p,b,77,6,24,6,1d,6,a,93,7,o,4,dx,8,1v,8,2s,b5,v,3e,27,w,s,8,9,5,j,15,1p,5,1a,o,g,8,ds,b,8x,4,3o,7,ax,8,1v,5,11,e,1j,b5,v,3e,27,t,y,9,p,1b,1j,5,1d,l,4,8,7,8,7,5,dj,h,4,8l,4,30,7,l,7,ax,8,1p,e,j,b,j,b,1a,b2,11,3b,3v,9,p,1b,1j,8,1j,6,a,8,j,8,dm,b,p,b0,4,6,4,bl,8,1d,8,7,h,g,8,p,8,1a,b2,11,3b,3s,c,s,t,7,b,1j,b,1y,5,j,8,dm,e,m,93,4,6,4,1l,4,6,4,bl,h,14,8,a,w,24,b5,11,35,3a,6,j,f,p,q,d,8,1j,b,1v,8,1p,e,p,8,74,9,p,f,2v,h,m,9i,4,1l,7,bo,h,14,8,7,z,21,b5,14,35,3v,i,p,q,d,k,1a,b,1m,e,1m,h,p,8,1m,b,5a,9,p,f,2m,8,4,e,p,n0,h,1d,n,4,12,1d,b8,11,35,3s,i,j,q,m,k,1d,b,1d,8,4,b,41,n,5d,9,s,c,v,e,11,8,7,e,j,6,4,n9,h,24,z,1a,bb,11,35,3s,i,j,t,p,e,1d,b,1d,8,7,8,41,8,7,8,5j,6,v,9,v,8,17,8,7,b,m,6,4,6o,7,2x,4,30,7,a6,4,h,27,1k,m,bb,17,2z,3s,i,j,w,s,8,1j,5,1d,8,2a,8,1m,5,4v,8,f,1m,k,v,5,1s,3,a,b,a,6r,a,2i,d,di,k,2p,z,m,bb,17,32,3p,i,j,t,v,8,1j,8,11,h,24,9,5,3,1g,b,4s,5,i,1m,b,4,8,2p,3,a,b,a,6u,4,2o,7,dl,k,2p,k,d,c5,y,38,3g,o,j,e,1a,b,1g,b,s,e,1a,8,s,r,s,12,d,9,m,f,27,3,p,l,5m,nf,n,2s,5,j,ce,p,38,3g,o,j,e,17,w,21,8,1a,b,3,4,1c,s,z,o,m,3x,41,5,j,b,m,o0,8,3a,ct,d,38,3d,r,p,5,1d,t,2y,8,23,d,h,f,8,10,m,3x,p,k,2j,h,m,e,g,79,7,go,5,3s,ch,d,32,3a,x,2j,b,2v,8,26,d,e,1r,j,3x,p,n,27,q,m,e,g,5x,7,16,a,go,3v,ch,a,32,3a,10,2g,b,2v,2c,7,h,69,p,n,u,p,1e,4,6,a,b,g,60,7,c,4,x,7,1u,4,eo,44,ce,7,32,3a,10,2j,8,2v,2c,7,e,6f,m,k,x,p,1b,7,9,7,8,3,4,6,7,u,4,1c,4,3o,7,f,4,x,4,1u,4,eo,4a,c8,7,32,3a,10,2j,5,2v,2f,7,b,6i,14,10,p,b,7,q,4,6,8,4,3,d,9,7,r,7,53,7,26,7,f6,4v,c8,a,2z,3a,10,5d,2i,7,b,6l,14,x,s,8,7,k,d,b,9,d,6,7,u,4,53,7,f,4,1o,a,el,h,57,bt,m,2t,37,13,5a,2f,d,b,6l,1d,o,14,k,g,8,9,p,60,a,9,7,1o,7,3i,e,f,7,a6,4,e,5a,bq,s,2q,31,b,10,5d,1x,s,b,6l,1d,o,14,k,g,8,4,6,p,66,7,3,7,33,7,23,e,p,a6,e,5g,b5,c,11,2q,2s,e,13,5a,20,s,b,6l,1d,u,31,90,1v,h,j,h,v,a0,8,5m,b2,i,y,k,7,22,17,8,14,3,7,3,5,6,4,13,g,h,4g,20,s,b,6r,14,10,2y,8x,1y,h,j,h,v,8,7,6,4,9f,b,5j,az,l,11,e,g,1w,11,h,v,1x,d,k,2a,5,24,1o,s,n,6x,p,1c,8,1y,8,m,3i,7,36,7,1u,1d,8,m,e,1s,8,p,96,b,5m,at,f,1a,b,j,1w,y,k,v,1x,d,h,4m,1l,m,t,90,5,3,1j,f,5,3,g,3l,7,36,7,1r,p,8,m,8,3m,93,b,5m,aq,i,1g,5,j,1w,s,k,6,s,1u,d,b,7,8,1s,5,2y,1f,m,t,f6,a,39,4,f,4,19,a,5,d,8,4g,90,b,5m,aq,i,1g,5,j,1z,m,h,c,s,1u,d,8,24,b,2v,1c,p,t,e3,7,4u,7,1f,4,8,a,8,4d,8,8x,b,5p,an,i,1a,k,7,22,m,b,r,d,r,1g,e,24,e,4j,t,j9,7,1i,7,5,2s,8,1v,b,8u,e,5p,ah,4,i,1a,k,7,22,m,8,1u,1g,e,2a,b,4j,q,l0,7,8,2m,b,a,8,1d,h,8r,k,5j,ae,a,f,1d,e,a,22,g,e,1o,47,e,a,q,3g,n,4c,4,gr,7,b,y,5,1j,b,a,8,1d,k,7,8i,k,5j,ae,7,i,1y,22,d,e,19,4s,25,2j,k,4f,4,cc,4,4i,k,p,8,1g,8,j,b,14,h,d,8l,e,5p,ab,l,21,1z,d,b,13,51,2n,21,h,li,4,h,1g,6,1g,b,d,5,m,h,d,8x,5p,ae,i,1y,22,d,b,r,6a,8,4,k,4,1k,m,15,lf,24,6,7,8,v,n,y,h,d,8x,5p,ae,i,1y,22,d,8,o,7d,1n,d,18,lf,17,8,d,8,m,8,v,q,v,h,a,8x,5s,ae,d,f,1d,2e,d,8,l,81,8,4,5,7,1e,a,e,gu,4,6,7,49,d,8,m,8,g,8,m,b,v,t,d,t,7,5,8u,5v,ae,d,f,1a,2h,d,8,l,8m,15,s,gu,4,6,7,49,d,8,m,5,1a,b,y,q,g,z,8u,5y,ae,1y,2h,g,l,aj,h6,4,3c,a,o,d,e,1y,8,11,h,m,h,4,e,8u,5y,aq,1m,2h,g,i,8,aj,kf,m,f,g,e,1m,5,7,e,v,h,j,h,7,e,8u,5y,5q,1s,3t,1a,2b,d,l,8,aj,gu,7,3i,s,6,p,b,14,8,4,8,g,h,m,8,m,b,d,h,8u,5y,5k,21,3q,1a,2b,d,l,8,ag,6l,p,9o,7,3i,5,p,6,s,8,14,8,4,8,j,5,4,8,m,5,p,8,g,h,8u,5v,5b,2m,3h,s,b,a,2b,d,l,5,am,69,14,9i,7,3i,b,7,6,4,6,1d,b,1p,8,1a,8,a,k,8x,5j,e,7,55,2m,3h,s,e,7,2b,d,i,8,as,60,1d,9c,7,3f,4,b,7,3,4,9,m,3,p,b,1s,8,1m,k,8x,5j,e,7,4z,2y,5,4,3b,s,2n,d,i,8,as,5u,1m,cu,7,8,a,5,6,m,6,v,8,1v,b,1d,h,8o,5v,e,7,4z,3a,2t,7,b,s,2k,d,i,8,av,5r,1p,6u,4,5u,7,8,7,b,m,6,y,8,1v,e,d,8,p,h,8o,5y,e,s,4e,3d,h,d,1e,s,8,1d,22,d,i,5,b1,5o,1p,6r,a,5u,7,h,7,i,37,b,d,8,7,5,g,e,8r,74,4b,3d,h,g,18,v,8,1d,22,d,i,ba,3f,4,1x,1s,6u,7,5u,7,h,7,l,a,3,2v,8,m,b,4,n,8r,74,18,a,2t,3m,b,2d,b,17,8,7,1w,d,i,5,b7,33,j,1r,1y,cu,4,h,19,24,5,1d,t,8u,7,8,71,w,g,8,4,8,4,e,4,1q,3p,b,2d,8,1a,8,7,1w,d,i,8,b4,33,j,1r,21,f3,34,n,8u,7,b,71,t,1g,1n,5g,5,2m,1q,g,i,8,bg,19,7,3l,21,fc,37,93,7,b,71,t,1g,1n,5g,5,2m,1q,g,i,8,bg,19,7,3l,21,fi,2y,96,7,h,6v,t,1d,1q,81,1t,g,i,8,bm,4u,21,7o,7,7o,2m,9i,7,h,6y,q,14,1z,81,1t,g,i,8,bm,4u,21,fi,p,5,1s,9l,7m,k,v,2b,8v,z,g,i,8,14,w,v,15,7v,4r,1y,fl,p,3,1d,a0,1j,k,5s,b,y,2b,8y,w,g,i,5,11,18,d,5,a,1e,81,1x,d,20,1y,fo,1m,ai,1j,k,6y,2b,8y,t,j,i,5,11,1e,7,8,7,1h,7y,1x,d,1x,21,fo,11,b3,1j,k,6y,2b,3s,6,51,t,j,i,8,y,1e,7,8,7,1h,7y,1x,d,1x,21,fo,11,b0,94,1n,6,h,3m,f,4y,n,p,i,8,v,1h,7,8,7,1h,7y,1x,d,1x,21,6l,7,f,7,8c,7,3,7,3,a,b9,94,1h,4,c,e,1y,i,g,b,j,f,4y,n,s,f,8,v,1h,7,8,7,1h,3y,12,31,9,4,1l,d,1x,21,6l,a,c,7,kc,94,15,g,6,2g,l,a,h,g,c,d,e,11,e,y,8,1y,n,s,f,8,y,1e,7,8,7,1h,3y,15,3d,1i,d,1u,21,6r,4,f,7,kc,9p,k,31,l,a,e,j,9,g,e,11,e,y,b,1v,q,m,i,e,s,q,j,8,7,8,7,1h,1v,b,1v,15,3g,1f,d,1r,21,e3,4,do,9s,e,34,o,7,8,p,6,j,b,3g,e,p,q,m,l,b,p,n,11,8,j,15,1v,b,v,i,14,k,3j,1c,d,1o,24,du,g,di,dm,c,1p,b,3j,8,s,n,d,b,4,l,b,p,n,1p,15,1v,b,s,o,11,h,3p,19,d,1o,24,dr,7,3,d,9,4,d3,dm,c,6g,8,7,5,d,e,o,b,y,b,1v,w,31,o,5d,10,d,1c,2d,8i,4,53,7,c,a,9,7,d0,ds,6,74,e,r,e,3a,b,3a,o,5g,x,d,19,2d,8f,4,59,7,e0,cs,5,1j,8,6g,h,r,k,6p,i,5p,r,d,u,2s,80,4,5o,7,2x,7,au,cs,8,1g,b,14,8,54,h,u,k,cy,o,d,u,2s,7x,7,5l,a,3,4,2r,7,au,ca,n,d,6,s,8,1g,b,51,h,10,h,dd,3,j,3,3g,dl,a,3,d,dl,ca,n,d,6,s,5,1j,8,51,h,16,h,hd,dl,m,dl,da,f,24,5,2m,6,m,8,1j,h,19,n,h1,dr,j,l,4,d0,da,f,p,5,41,6,m,8,1j,h,19,z,d,8,g7,dr,4,2f,4,bl,da,i,p,8,3y,6,17,8,s,h,1i,b,4,k,4,h,g4,hi,a,3,a,9u,da,l,m,b,11,5,44,8,4,8,g,3,h,1o,7,3,z,c4,5,41,gi,4,r,s,9o,dd,l,p,8,y,8,4a,b,3o,7v,8,8a,e6,g,1u,4,l,d,c,j,9f,1a,b,by,i,1s,8,4d,b,3o,7y,8,8a,cf,7,10,4,f,j,2f,a,o,a,9c,1d,h,i4,4x,fs,ci,7,1c,m,23,d,19,7,90,1p,8,i4,50,fp,ci,7,19,p,23,a,1f,7,8u,k1,53,fp,89,4,5i,p,3r,7,8u,k1,53,fs,7l,a,9,g,59,p,3r,7,8u,k1,53,fs,7i,d,6,p,53,p,3r,7,8u,k4,53,fp,7i,a,9,p,53,p,3o,a,8r,k7,56,fm,83,m,26,d,2r,7,30,a,96,4,f,1s,6,e4,19,21,f,m,59,fj,8f,7,2c,d,4i,7,o,a,9,a,i,7,8i,7,c,1s,6,dm,1r,21,f,m,59,fj,b0,7,4l,7,o,a,10,7,8x,fm,1r,11,8,1v,59,fj,fr,a,au,fd,23,11,8,1v,5f,fd,fr,a,au,fd,23,11,5,v,3,11,5o,f1,qx,f1,2f,y,8,v,3,11,5x,es,qx,f1,2f,y,8,1d,3,j,69,ed,r0,ev,2l,y,8,1y,6f,bg,u,1v,r3,ev,2l,v,8,27,6l,2s,13,6y,1f,1d,rc,ep,2r,p,e,27,6o,2j,1f,6m,1x,v,ri,ep,2r,m,5,2j,6r,24,23,5y,cr,1j,7o,g,89,ej,2x,37,6u,1v,2l,5d,d0,1m,7l,g,89,ej,2x,27,6,v,6x,1j,30,4y,d3,1v,7f,m,c,4,7r,ej,2x,27,6,v,70,1d,3i,47,df,1y,79,p,86,ej,2x,2v,b,79,v,49,3g,b9,a,23,2a,73,s,83,ed,33,m,1c,4,3,a,9,a,e,cr,2p,bi,a,23,2a,73,s,83,ed,36,g,1l,a,c,h,dc,1s,e3,11,e,4,b,y,6x,s,83,ed,36,g,1l,a,c,h,t3,14,b,a,8,y,3f,7,3f,p,83,ed,36,g,r,4,r,7,f,h,4,sx,17,8,d,8,11,70,j,86,e7,3c,g,o,a,o,7,f,8,d,sx,17,5,g,8,14,70,g,53,a,c,7,f,7,1r,31,6,b1,3c,g,o,a,o,7,f,j,r6,7,i,4,10,1p,8,11,cl,y,6,d,1o,2m,5,d,6,b1,3c,g,o,a,o,7,f,j,r6,7,f,7,13,1m,8,11,ci,1j,1o,24,6,g,5,bg,3c,g,1l,7,f,j,r9,4,c,a,10,1p,8,11,ci,1v,1c,24,6,bv,3f,g,1l,7,f,j,r9,4,c,a,10,1p,8,11,9,7,c0,1y,6,7,10,e1,3i,g,1i,d,c,g,r6,d,c,7,13,2v,6,7,c0,1y,3,a,10,2g,3,bj,3i,g,6,1s,c,d,r3,g,1o,2s,6,7,bx,v,6,1d,10,2d,9,a,x,aa,19,n,1o,g,6,1v,rl,p,1i,2s,cc,m,i,17,10,2a,c,7,10,a7,19,t,1l,g,6,1v,rl,p,1i,2p,cf,m,l,14,10,2d,9,7,10,a4,19,12,1f,g,c,7,t3,p,1i,2m,ci,m,l,17,x,2a,c,7,10,a4,16,18,1c,g,f,4,t3,p,1i,2m,ci,s,c,1a,x,1v,r,7,10,a4,10,1h,19,g,to,m,1i,2m,cf,y,9,y,19,1s,u,7,10,a1,13,1k,16,g,f,4,t6,m,1l,2g,83,4,4f,v,f,s,19,y,h,g,u,a,x,9y,13,1n,16,g,c,7,tf,a,1r,2d,ci,14,l,j,16,y,h,d,x,a,6,4,o,9y,10,1t,13,j,6,d,vc,2a,co,1g,6,g,19,11,5,m,23,9v,10,1w,13,2y,tl,1p,7u,4,3,4,50,1g,c,a,19,1p,23,9v,x,22,10,31,rc,7,29,14,83,4,9,4,4x,1d,f,a,19,1p,23,9s,10,25,x,31,rc,7,b3,7,3,7,59,m,9,m,c,a,19,1p,1f,7,i,9s,10,28,u,31,126,4,f,d,c,4,4u,a,r,g,c,a,19,1p,1f,a,f,9s,x,2b,1o,4,1f,p,120,7,o,7,c,7,5u,d,9,g,16,1s,3,7,13,d,9,9s,x,2e,1o,4,1i,m,11x,7,r,d,6,7,5u,d,9,d,19,dd,x,2n,1f,a,1f,m,r6,a,af,a,r,g,63,d,6,d,1c,34,8,a4,u,2q,1i,4,1i,m,r6,a,af,d,o,d,69,d,6,a,i,7,o,1j,5,1j,8,a4,u,2t,1f,7,x,7,c,m,r6,7,ai,7,6,4,l,4,69,m,3,g,f,7,o,1j,5,bp,x,2t,1f,7,x,7,c,m,r6,4,ax,7,f,7,66,m,6,j,c,7,o,d7,10,2q,1i,4,1i,m,s6,j,40,4,5i,4,c,a,63,m,9,m,9,7,o,d4,10,2w,1f,4,1i,m,s6,m,3u,a,5u,7,66,j,c,p,6,7,o,5,d1,x,32,10,11,x,j,s9,s,3o,7,5x,7,6c,1g,x,4,5,d1,u,35,x,11,10,g,s9,v,9o,7,6c,17,3,4,13,5,d1,u,35,x,11,10,g,sf,p,9l,a,6x,m,1c,cy,x,38,u,14,x,g,sf,7,c,4,2l,7,ec,d,1c,5,cs,10,38,u,14,x,g,ti,7,1u,d,e9,d,1f,8,cm,x,3b,u,14,x,g,tf,a,3,7,c,7,x,g,ef,7,1i,b,cj,u,3e,u,14,x,g,tf,7,6,7,9,a,x,d,g9,8,cd,10,3h,x,a,6,g,10,g,tr,7,c,a,x,4,cr,7,3l,b,c4,13,3k,6,5,10,d,13,g,189,7,3o,k,bs,13,3z,x,a,13,g,189,a,3o,h,bv,10,42,u,a,13,g,1ci,8,bp,16,42,7,6,7,c,7,13,g,193,a,39,8,bm,19,3z,7,8,7,c,7,13,g,193,a,3c,5,d,5,b4,1f,1t,d,e,1p,5,7,9,7,13,j,18u,14,6,7,2f,bj,1i,t,p,b,2p,9,7,13,j,zo,7,8u,1a,6,7,2i,bj,1f,b,7,8,3s,9,a,x,s,zc,a,6,4,8f,7,3,17,2x,5,bg,1o,44,9,a,x,s,zc,a,6,7,8o,1d,2o,4,5,b7,26,5y,zc,m,1i,7,6c,4,l,1g,30,av,2c,5v,zf,j,1i,a,69,7,i,y,3,g,36,ap,2c,2d,5,y,5,2g,11l,4,2l,4,33,7,10,y,3,j,33,5,am,29,2d,8,11,5,2d,13o,4,i,7,30,7,10,1g,36,av,26,1y,8,3s,13o,a,4r,1a,39,5,as,26,p,5,14,8,1p,6,d,15c,d,4r,4,3,11,36,5,2p,e,14,9,6m,1o,41,c,a,120,4,3c,m,4o,y,39,2p,e,y,i,6m,1l,41,c,7,123,4,3i,j,43,4,i,d,3,g,39,3j,8,7,i,6s,1i,41,9,d,15o,d,39,7,u,7,x,7,9,7,30,h,2s,h,7,i,6s,1i,3s,5,7,9,17,18f,7,u,a,4c,k,2s,h,7,l,6m,1l,3p,8,7,6,1a,1e3,h,3d,l,6m,1l,3p,8,7,6,d,3,v,110,4,u,4,1c,4,7o,7,2u,k,3a,f,6v,1i,3p,8,7,19,7,110,7,o,7,10,7,6,7,7l,7,2u,k,3a,6,74,1i,3s,5,7,19,7,113,7,l,4,13,7,6,7,7i,a,2u,n,3m,9,6s,16,47,19,7,116,p,19,d,7l,7,2x,n,m,5,2y,9,6s,13,4a,19,7,nr,4,di,j,60,4,u,7,23,a,2r,t,g,b,1a,8,m,5,d4,i,4,c,11,179,7,13,a,1o,d,2r,w,d,b,17,e,g,8,4m,9,7y,8,7,9,g,9,11,ox,4,ji,a,1o,g,2o,w,1p,9,14,b,41,9,1p,9,61,8,y,3,14,ou,7,lf,4,6,4,2r,z,1j,c,14,b,41,f,s,8,m,9,61,8,24,6,4,17u,4,1x,4,3c,12,1d,f,5d,f,s,8,6y,5,11,c,d,i,7,pl,7,c6,a,u,y,3u,a,c,7,1u,7,2u,12,1a,i,7,b,a,5,4p,6,v,8,81,c,a,l,7,pl,7,c0,g,u,y,10,4,2u,7,c,7,1l,4,6,7,2u,12,1a,i,7,b,a,8,eg,3,a,3,a,11r,a,u,7,3,a,6,4,6,7,10,7,33,g,1i,a,30,4,z,1a,i,7,8,d,5,f7,11r,4,10,g,i,4,4c,g,1l,7,30,7,z,17,i,ds,b,1y,100,a,2i,d,59,4,4x,7,15,11,f,dy,b,1v,100,a,2f,d,af,4,1b,v,f,14,b,ep,12l,7,ar,1b,v,f,14,b,ep,12l,7,ax,5,7,w,v,u,d,5,a,b,5a,b,m,8,8g,12o,7,ax,7,w,v,u,d,8,7,8,5d,b,m,8,8g,12o,a,b6,k,11,u,d,k,ep,1eo,11,u,fg,1eu,h7,1ex,h4,1ex,h4,7x,7,16u,h4,7x,7,lx,17,jr,dy,6,31,16,4,4f,a,6,a,ni,1j,jl,dy,9,2y,2o,7,2u,a,6,a,nc,1s,6c,a,cx,dv,c,2y,l,4,20,7,qr,1v,6f,7,d3,dm,f,21,n,d,2o,7,5x,4,9,4,46,7,73,7,8r,27,69,7,d3,dj,f,21,n,d,2r,a,60,7,46,7,76,4,8o,2a,jl,dg,f,21,n,36,a,4c,j,10,7,49,7,c3,4,2i,4,13,2d,jo,dd,f,21,n,36,a,2u,4,1c,4,6,d,x,a,56,4,3,4,b3,4,2l,4,13,2a,2u,4,h6,cy,i,2d,2r,7,i,4,2i,7,9,a,1l,4,9,m,2r,a,30,7,6u,a,7i,2a,l,4,26,4,3l,7,df,cv,l,2d,2r,7,f,7,2i,7,6,a,20,j,2u,g,2i,7,6,a,4u,4,1u,a,6f,4,10,2a,l,4,5r,7,e6,c4,o,2m,3,a,20,d,c,d,9,4,3,7,20,d,1r,4,3,7,3f,m,26,a,9,7,dc,4,16,24,6l,4,cl,4,1i,c4,r,2v,20,g,c,a,9,d,1x,g,1f,p,3i,s,1u,d,ar,4,2x,4,1f,1m,ll,bm,r,2y,20,a,10,s,16,m,1c,j,3x,s,1o,g,6i,d,8i,1j,lo,bj,r,2y,1x,d,13,m,9,1j,1f,g,29,7,40,g,6,a,60,7,3,7,8i,1j,lx,ba,o,1g,5,11,2f,d,19,g,13,j,40,4,9,7,40,7,c,a,5x,7,3l,4,3,4,5f,m,mf,ba,o,21,9,7,p0,a,5l,d,k9,4,29,b7,o,1s,mu,7,5c,4,1u,a,8f,7,d0,4,2c,b4,o,1s,mu,7,5f,4,1r,a,9,7,1i,7,69,d,ff,b1,l,1v,uf,7,6,j,u,m,6,7,60,a,b3,4,46,b1,l,1v,mf,7,3i,4,49,7,6,1y,3,a,63,4,fi,ay,l,1v,6,11,hf,4,o,4,30,a,7r,7,9,1p,6,7,lu,ay,l,y,9,p,6,11,29,d,dl,a,1c,g,b6,4,c,1j,9,7,lu,ay,l,7,b,j,9,p,6,11,29,j,7o,j,6,j,3o,4,3,4,l,d,u,4,c,7,3,4,bc,a,9,14,i,a,j9,7,2f,81,3,2v,l,a,8,m,3,s,6,11,29,j,7l,m,6,j,3l,d,1o,a,9,a,bf,d,9,11,i,4,59,4,gl,51,e,m,e,1s,c,2p,l,31,26,m,79,7,3,1d,3l,d,1l,d,6,d,bo,7,1c,d,40,7,hu,51,e,m,e,1s,c,2p,l,31,23,m,40,d,30,1m,3l,d,1l,7,c,d,bo,d,10,d,46,7,hr,5a,5,p,8,1s,o,2j,l,31,23,d,43,j,30,s,3,m,3x,7,1l,7,9,d,90,4,2o,g,l,4,9,7,m6,81,o,2j,l,2y,26,a,46,j,36,y,6,7,3x,7,x,7,l,7,9,a,bu,a,4f,4,gl,4,23,84,o,2j,l,s,8,y,2i,7,o,7,46,j,39,p,f,7,3x,4,u,a,o,4,c,a,3r,4,af,4,20,4,go,7,1o,8g,o,2j,l,s,8,y,2i,7,50,j,3c,g,4o,7,r,a,o,4,c,d,e6,7,io,a,1l,8d,r,2j,l,2p,6u,g,3f,a,4u,a,1o,7,6,j,e0,4,iu,4,1c,8p,r,2j,l,2s,6r,d,8l,a,1r,4,6,m,dl,7,ki,8m,10,27,r,2m,if,7,y6,8s,10,27,r,2j,1gu,8s,10,27,r,2j,6,7,i0,4,1l,4,wl,8y,10,27,r,2j,6,7,1gc,8y,10,27,r,37,1g0,8y,10,27,r,37,1ei,4,1c,91,10,27,r,a,6,g,6,27,1ei,4,19,94,10,27,r,7,9,g,6,27,zf,y,3,4,fc,94,10,27,r,a,6,2a,zo,1g,f9,94,10,27,r,2p,zo,1d,co,7,2i,94,10,27,r,a,6,2a,zo,1d,co,a,2f,94,10,27,r,7,c,d,6,1p,zo,1d,co,d,2c,94,10,27,r,7,9,g,6,1p,zr,1a,cl,g,2c,94,10,27,r,2m,zu,1a,ci,g,2f,94,16,21,r,a,6,g,3,s,10r,g,c,j,ci,j,2c,94,16,21,r,7,c,a,9,p,16,7,zl,a,f,g,ci,j,2c,8y,1c,21,r,7,9,g,6,p,l,v,106,7,8,7,cf,j,2c,8y,1c,21,r,34,zc,4,u,4,8,7,ci,d,2l,8s,1c,1v,x,34,zc,4,u,4,3,7,bu,a,i,a,2o,8s,1c,1v,x,g,8,14,8,7,8,y,xl,5,1o,4,u,4,3,1a,ar,a,l,7,2o,8s,1c,1v,x,g,8,14,n,v,5,xc,7,5,4,1i,7,u,4,3,5,1a,ao,d,i,7,2u,8m,1c,1v,10,d,8,14,q,p,8,u9,54,u,4,3,8,v,5,7,8,1i,5,90,d,3l,8j,1c,1v,10,d,8,14,w,g,8,u6,8,54,u,4,3,5,d,12,a,6,b,c,1e,89,d,3u,8a,1c,1v,1c,7,8,4,h,d,12,7,8,u9,b,4m,8,a,5,u,4,3,g,12,j,8,d,1k,7u,7,3,d,3u,8a,1c,1v,1i,t,7,1e,uc,b,4m,8,7,8,u,4,3,g,12,11,1n,80,d,4i,7m,1c,1v,1i,2b,u9,e,4y,8,u,4,3,p,w,11,1k,80,d,4i,7m,1c,1v,1i,2e,u6,e,4y,16,v,n,p,5,a,1n,do,6s,1c,1v,1i,b,a,1w,u6,e,2a,e,1d,8,v,x,4,6,v,n,m,b,7,1n,do,6s,1c,1v,1i,8,g,q,7,w,u9,e,2a,1w,v,x,7,6,s,n,m,b,7,1n,a6,7,4f,5p,1f,1m,1r,5,d,b,a,b,a,t,u9,e,27,1z,v,x,7,6,11,5,v,b,7,1n,eu,5m,1i,1j,1r,8,7,e,a,h,4,t,u9,e,1m,5,g,n,s,5,a,e,v,l,4,6,a,6,1y,b,7,1n,fc,51,1l,1j,1r,28,u9,e,s,b,c,e,g,k,1d,8,14,6,p,8,1y,b,a,1k,ff,4v,1o,1j,1o,2b,u9,e,s,w,j,k,x,g,b,2a,5,1m,b,a,1k,fo,4j,1r,1j,1r,18,7,n,4,5,uc,e,7,8,j,o,m,h,9,7,o,d,8,2a,8,1m,b,j,k,d,h,fr,4g,1r,1j,1r,q,4,h,7,q,uf,q,j,3,g,3,p,e,c,p,9,2p,8,1m,b,m,h,g,e,fu,4d,1u,1a,20,b,d,k,7,h,7,5,uf,q,1s,e,6,y,9,2g,e,1m,k,g,b,j,e,fx,4a,1x,17,1x,e,d,15,a,uf,q,1s,b,9,11,6,2g,b,1p,n,d,b,j,e,g0,4a,23,m,29,8,7,1n,ui,8,d,8,1s,b,9,y,9,2y,8,17,t,a,b,j,e,g3,47,26,j,2c,5,7,q,4,w,ui,5,g,8,1s,b,9,y,c,2v,b,4,x,z,4,h,g,e,86,a,7o,44,53,b,7,b,m,q,ui,g,8,1s,b,9,j,8,a,c,v,5,1d,5,j,b,1f,h,a,b,j,e,86,a,7o,47,53,5,a,b,m,q,ui,g,8,1s,b,9,j,8,a,c,v,8,17,8,j,8,1l,e,a,b,j,e,86,d,7o,41,53,d,w,m,5,ul,g,b,1g,k,9,j,8,a,c,11,k,m,b,d,b,l,j,o,e,4,h,d,h,86,d,7r,3v,56,a,b,4,q,j,uo,g,8,1m,h,9,j,8,d,6,17,h,17,b,9,8,3,p,8,f,z,7,k,86,g,7o,3v,5c,4,8,a,5,d,5,4,c,4,ur,2j,5,9,g,b,d,6,14,k,17,8,6,e,s,b,c,1n,86,g,7o,3v,5f,8,a,5,a,b,7,ux,5,2j,8,6,g,b,d,6,14,8,7,8,17,8,6,h,m,h,9,8,4,h,4,w,89,7,7u,3v,5c,4,12,7,ux,8,a,b,a,h,1a,8,9,d,b,d,6,7,8,2g,8,6,n,4,t,9,8,y,8,7,8,g9,3v,5f,4,z,a,uu,8,3,4,3,b,9,q,11,8,6,8,a,b,d,6,7,b,6,b,1y,8,6,1h,6,4,8,y,8,7,8,g9,3s,5o,z,4,vr,4,f,k,v,5,6,8,v,u,8,1y,8,6,1h,9,8,y,8,7,8,gc,3m,5r,4,w,vr,a,i,e,v,c,y,x,1v,e,6,1h,9,8,1a,8,a6,7,63,3j,5u,a,h,vi,14,6,8,11,9,y,x,1v,b,9,7,1b,9,8,1a,8,a9,7,60,3j,60,7,vu,d,8,m,6,14,f,p,13,1v,8,c,d,15,9,8,1a,8,gf,3g,11x,e,7,e,a,b,c,m,l,b,g,16,14,5,m,8,i,14,b,9,8,1a,8,gi,3a,11x,12,4,h,9,m,o,8,d,1f,5,6,8,g,e,j,i,8,11,b,9,8,1a,8,gu,2m,126,1q,6,m,o,j,1r,5,g,h,d,l,8,11,b,9,8,1a,8,gx,2g,129,h,4,t,7,b,3,p,r,g,1x,d,h,a,o,8,14,8,9,8,1a,8,h6,21,hf,14,jx,b,g,8,p,8,3,p,x,7,20,d,h,a,r,1a,c,8,1a,8,h6,1y,hf,1a,ju,8,1d,8,3,p,x,a,1x,d,h,d,l,1d,c,8,17,b,4,8x,7,80,1v,hc,1m,jo,8,17,e,3,44,8,2j,c,1p,8x,7,8i,y,89,4,9c,1p,jo,b,4,e,p,e,6,6s,3,1v,b0,1h,ef,4,93,1y,jl,q,g,n,4,6,1p,k,7,8,j,5,5j,au,1w,1i,v,kx,24,jl,n,g,h,24,k,7,8,j,5,5g,a6,2b,7,b,4,6,4,10,11,kr,2d,ji,b,5p,t,3a,af,2e,7,q,x,11,ko,5,2d,5,jf,b,5p,t,3a,ac,2e,a,w,o,14,kl,b,27,b,jc,e,s,k,p,w,4g,c,v,9,m,5,d,ac,2e,j,n,l,17,ki,e,27,b,jc,e,s,k,p,w,4a,i,s,f,g,b,a,ac,15,m,h,v,n,f,1a,ki,e,27,b,jc,b,74,i,s,i,a,b,a,ac,15,21,n,9,1d,9u,7,ai,e,27,b,jc,b,3s,3,j,e,1a,k,p,6,1d,9,a,8,d,5,a9,15,24,k,9,1d,9c,4,c,7,al,e,27,b,jc,b,3p,9,g,e,1a,k,p,6,1g,6,a,8,7,b,a3,7,15,1y,9,h,9,1d,9r,7,al,e,27,b,jc,b,3p,9,31,c,1g,9,4,8,a,b,a3,a,12,1y,9,h,9,1d,5x,7,3,s,dl,e,24,e,jc,e,6v,c,d,w,a,9,j,ac,a,12,24,k,9,1a,2f,4,3i,11,u,4,co,e,24,e,jc,12,24,8,3y,c,a,z,a,9,m,a9,a,12,24,e,4,c,1a,2f,4,3u,p,o,d,cl,e,24,e,jc,12,g,8,11,z,3p,c,a,z,a,9,p,a0,g,12,1v,k,7,f,14,56,7,16,m,l,g,cl,e,24,e,jx,h,g,8,11,z,3s,6,m,h,j,9,m,8,9x,j,z,1v,h,7,l,g,6,g,56,7,1c,g,u,4,co,e,24,e,k0,b,1v,w,1g,8,2y,b,m,9,m,8,9x,g,12,1s,n,3,4,m6,h,1y,h,k3,8,1v,2h,3p,c,j,8,7,9u,g,12,1v,n,a,m0,k,1v,h,k6,5,1v,2b,3p,i,a,5,4,b,7,9u,g,q,2d,h,a,m0,k,1v,h,k9,5,1s,8,20,2g,1r,a,5,m,9u,g,q,2g,n,7,lx,h,1v,e,kr,1g,26,2d,1o,14,9o,3p,k,j,9,7,3,8,b0,4,9x,h,1v,e,l0,p,2o,2d,1o,14,9o,3g,t,7,8,7,9,a,8,4,au,a,9x,e,1v,e,l3,4,e,7,2o,2d,1o,g,5,m,9o,3g,15,a,3,s,ao,a,3,a,9l,h,7,5,1m,b,l0,q,2o,5,7,5,4,1w,4,1o,g,b,d,9r,3g,18,11,36,7,7c,a,3,a,9l,t,p,8,p,b,l0,q,2r,28,1r,g,b,a,9u,3g,1h,s,33,4,3,4,6l,a,i,7,9,4,9o,k,7,b,a,h,s,8,k3,7,i,4,3,s,4l,e,1r,4,b,4,b,a3,3g,e,7,8,7,n,s,30,4,20,4,4r,a,u,7,9o,k,7,b,a,b,v,8,k3,a,6,1a,4r,8,4,1r,k,4,a3,3j,8,m,e,11,53,4,60,4,9l,w,1a,e,k3,1p,76,4,a6,3j,8,m,b,17,ku,t,1a,e,k6,1m,hf,5p,l3,w,d,e,d,ki,a,3,j,i3,5p,lc,n,d,e,13r,5s,lu,d,143,5s,lu,a,146,5s,li,p,143,5s,li,p,143,5s,1q9,5s,1nx';
function fanClassAt(gx, gy){
  if (!G.fcls){ var d = new Uint8Array(WW * WH), p = 0; SHAPE.split(',').forEach(function(t){ var v = parseInt(t, 36), n = (v / 3) | 0, c = v % 3; for (var q = 0; q < n && p < d.length; q++) d[p++] = c; }); G.fcls = d; }
  if (gx < 0) gx = 0; if (gy < 0) gy = 0; if (gx >= WW) gx = WW - 1; if (gy >= WH) gy = WH - 1;
  return G.fcls[gy * WW + gx];
}
function rockBits(){   /* rock-looking tiles used by the real map around Route 111/112 (x 90-147, y 128-147 of the world) */
  if (G.rk) return G.rk;
  var seen = {}, out = [];
  for (var y = 128; y < 148; y++) for (var x = 90; x < 148; x++){
    var c = G.cells[y * WW + x]; if (c < 0 || seen[c]) continue; seen[c] = 1;
    var ox = (c & 63) * 16, oy = (c >> 6) * 16, r = 0, g = 0, b = 0, dk = 0, gn = 0;
    for (var yy = 0; yy < 16; yy++) for (var xx = 0; xx < 16; xx++){ var o = ((oy + yy) * 1024 + ox + xx) * 4, R = G.atlas[o], Gg = G.atlas[o + 1], B = G.atlas[o + 2]; r += R; g += Gg; b += B; if (R + Gg + B < 330) dk++; if (Gg > R + 8 || B > R) gn++; }
    r /= 256; g /= 256; b /= 256;
    if (r > g + 12 && r > b + 25 && gn === 0 && dk > 6 && dk < 120) out.push(c);
  }
  return (G.rk = out);
}
function kAt(x, y){ if (x < 0 || y < 0 || x >= WW || y >= WH) return 0; return G.K[y * WW + x]; }
/* which kind of scenery each empty tile gets: near a real map it continues what that map has at its edge; farther away it follows the shape file; and land that is not joined to any real map becomes sea */
function buildK(F){
  var N = WW * WH, K = new Uint8Array(N), dist = new Int16Array(N).fill(-1), cls = new Int8Array(N), q = new Int32Array(N), qh = 0, qt = 0, i, x, y;
  F.forEach(function(f){ for (y = f.y0; y < f.y1; y++) for (x = f.x0; x < f.x1; x++){ i = y * WW + x; var c = tileCls(G.cells[i]); dist[i] = 0; cls[i] = c < 0 ? 1 : c; q[qt++] = i; } });
  while (qh < qt){ i = q[qh++]; x = i % WW; y = (i / WW) | 0; var d1 = dist[i] + 1;
    if (d1 > 40) continue;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function(v){ var X = x + v[0], Y = y + v[1]; if (X < 0 || Y < 0 || X >= WW || Y >= WH) return; var j = Y * WW + X; if (dist[j] >= 0) return; dist[j] = d1; cls[j] = cls[i]; q[qt++] = j; }); }
  for (i = 0; i < N; i++) K[i] = (dist[i] >= 0 && dist[i] <= 2) ? cls[i] : fanClassAt(i % WW, (i / WW) | 0);
  var seen = new Uint8Array(N), st = [];
  for (var s0 = 0; s0 < N; s0++){
    if (K[s0] === 0 || seen[s0] || dist[s0] === 0) continue;
    var comp = [], near = false; st.push(s0); seen[s0] = 1;
    while (st.length){ var p = st.pop(); comp.push(p); if (dist[p] >= 0 && dist[p] <= 10) near = true; var px = p % WW, py = (p / WW) | 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function(v){ var X = px + v[0], Y = py + v[1]; if (X < 0 || Y < 0 || X >= WW || Y >= WH) return; var j = Y * WW + X; if (K[j] !== 0 && !seen[j] && dist[j] !== 0){ seen[j] = 1; st.push(j); } }); }
    if (!near) comp.forEach(function(k){ K[k] = 0; });
  }
  /* mountain shapes that touch no real land (only sea and sea-rocks) are the picture's stand-ins: sea */
  var seen2 = new Uint8Array(N);
  for (var r0 = 0; r0 < N; r0++){
    if (K[r0] !== 2 || seen2[r0] || dist[r0] === 0) continue;
    var comp2 = [], land = false; st.push(r0); seen2[r0] = 1;
    while (st.length){ var p2 = st.pop(); comp2.push(p2); var qx = p2 % WW, qy = (p2 / WW) | 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function(v){ var X = qx + v[0], Y = qy + v[1]; if (X < 0 || Y < 0 || X >= WW || Y >= WH) return; var j = Y * WW + X;
        if (dist[j] === 0){ if (tileCls(G.cells[j]) === 1) land = true; } else if (K[j] === 1) land = true; else if (K[j] === 2 && !seen2[j]){ seen2[j] = 1; st.push(j); } }); }
    if (!land) comp2.forEach(function(k){ K[k] = 0; });
  }
  G.K = K;
}
function tileCls(c){   /* what a tile looks like on average: 0 sea, 1 land, 2 mountain, -1 other (sand, paths, buildings) */
  if (!G.tcl) G.tcl = {};
  if (G.tcl[c] !== undefined) return G.tcl[c];
  var ox = (c & 63) * 16, oy = (c >> 6) * 16, r = 0, g = 0, b = 0, yy, xx;
  for (yy = 0; yy < 16; yy++) for (xx = 0; xx < 16; xx++){ var o = ((oy + yy) * 1024 + ox + xx) * 4; r += G.atlas[o]; g += G.atlas[o + 1]; b += G.atlas[o + 2]; }
  r /= 256; g /= 256; b /= 256;
  return (G.tcl[c] = (b > r + 40 && b > g + 30) ? 0 : ((r > g - 8 && r > b + 10 && !(g >= r - 5 && r > 150)) ? 2 : (g > r + 12 ? 1 : -1)));
}
/* learn, from the real maps, which tile the game puts where sea meets land, land meets cliff, and so on: key = this tile's class and which of its 4 neighbours (up, right, down, left) are a different class */
function learnEdges(F){
  var pm = new Uint8Array(WW * WH), T = {}, x, y;
  F.forEach(function(f){ if (f.pl5) return; for (y = f.y0; y < f.y1; y++) for (x = f.x0; x < f.x1; x++) pm[y * WW + x] = 1; });
  var dx = [0, 1, 0, -1], dy = [-1, 0, 1, 0];
  for (y = 1; y < WH - 1; y++) for (x = 1; x < WW - 1; x++){
    var i = y * WW + x; if (!pm[i]) continue; var c = tileCls(G.cells[i]); if (c < 0) continue;
    var bits = 0, ok = true;
    for (var k = 0; k < 4; k++){ var j = (y + dy[k]) * WW + x + dx[k]; if (!pm[j]){ ok = false; break; } var nc = tileCls(G.cells[j]); if (nc < 0){ ok = false; break; } if (nc !== c){ if (nc !== 0 || c === 0){ ok = false; break; } bits |= 1 << k; } }
    if (!ok || !bits) continue;
    var key = c * 16 + bits; (T[key] || (T[key] = {}))[G.cells[i]] = (T[key][G.cells[i]] || 0) + 1;
  }
  var out = {};
  Object.keys(T).forEach(function(key){ var ids = Object.keys(T[key]), tot = 0, list = []; ids.forEach(function(id){ tot += T[key][id]; }); if (tot < 12) return; ids.forEach(function(id){ var n = T[key][id]; if (n * 12 >= tot) for (var q = 0; q < n; q++) list.push(+id); }); if (list.length) out[key] = list; });
  return out;
}

/* ---------- where the trainer is ---------- */
function poll(){
  if (!G.ready || !visible() || !A.st.running || !window.hdpVoice) return;
  window.hdpVoice.snapshot().then(function(m){ readPos(m); }).catch(function(){});
}
function readPos(m){
  var dv = new DataView(m.iw.buffer, m.iw.byteOffset, m.iw.byteLength), p = dv.getUint32(SB1PTR, true);
  if (p < 0x02000000 || p >= 0x02040000 - 0x4000) return;
  var q = p - 0x02000000, ev = new DataView(m.ew.buffer, m.ew.byteOffset, m.ew.byteLength);
  var x = ev.getInt16(q, true) - POSX, y = ev.getInt16(q + 2, true) - POSX, g = m.ew[q + 4], n = m.ew[q + 5];
  setPos(g, n, x, y);
}
function setPos(g, n, x, y){
  var pl = null; for (var k = 0; k < PLACE.length; k++) if (PLACE[k][0] === n && (PLACE[k][5] || 0) === g) pl = PLACE[k];
  if (pl){ G.last = {x: pl[1] + MX + x + 0.5, y: pl[2] + MY + y + 0.5}; G.indoors = false; }
  else G.indoors = true;
  G.pos = {g: g, n: n, x: x, y: y}; dirty = true;
  var pk = g + ':' + n;
  if (pk !== G.pk){   /* the trainer moved to a different map: the view follows */
    G.pk = pk; G.stack = [];
    try{ if (G.indoors && G.ready){ var R = compositeOf(g, n); G.room = R; if (R && !$('map-view').hidden) fitRoom(R, hereOf(R)); } else { G.room = null; if (!$('map-view').hidden && G.last){ view.cx = G.last.x; view.cy = G.last.y; } } }catch(e){ G.room = null; }
    syncBack();
  }
  if (!$('map-view').hidden) renderBig();
}

/* ---------- drawing ---------- */
/* draw part of a picture; the part is cut to the picture's edges by hand, because iPhone Safari stretches the result when asked for a part that sticks out */
function blit(c, img, sx, sy, sw, sh, dw, dh){
  var iw = img.width, ih = img.height, kx = dw / sw, ky = dh / sh;
  var x0 = Math.max(sx, 0), y0 = Math.max(sy, 0), x1 = Math.min(sx + sw, iw), y1 = Math.min(sy + sh, ih);
  if (x1 <= x0 || y1 <= y0) return;
  c.drawImage(img, x0, y0, x1 - x0, y1 - y0, (x0 - sx) * kx, (y0 - sy) * ky, (x1 - x0) * kx, (y1 - y0) * ky);
}
function dot(c, px, py, r, col, d){
  c.lineWidth = 3 * d; c.strokeStyle = '#fff'; c.beginPath(); c.arc(px, py, r, 0, 6.2832); c.stroke();
  c.lineWidth = 2 * d; c.strokeStyle = col; c.beginPath(); c.arc(px, py, r, 0, 6.2832); c.stroke();
  c.fillStyle = col; c.beginPath(); c.arc(px, py, Math.max(2.5 * d, r * 0.28), 0, 6.2832); c.fill();
}
function marks(c, list, sx, sy, s, w, h, d){   /* tappable doors and exits */
  var r = Math.max(4 * d, Math.min(s * 0.38, 9 * d));
  for (var i = 0; i < list.length; i++){
    var px = (list[i].x - sx) * s, py = (list[i].y - sy) * s; if (px < -r * 2 || py < -r * 2 || px > w + r * 2 || py > h + r * 2) continue;
    if (list[i].label){
      var lr = Math.max(7 * d, Math.min(s * 0.6, 13 * d));
      c.beginPath(); c.arc(px, py, lr, 0, 6.2832); c.fillStyle = '#ffd54a'; c.fill(); c.lineWidth = 1.5 * d; c.strokeStyle = '#000'; c.stroke();
      c.fillStyle = '#000'; c.font = '800 ' + Math.round(lr * 1.25) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(list[i].label, px, py + lr * 0.06);
      continue;
    }
    c.beginPath(); c.moveTo(px, py - r); c.lineTo(px + r, py); c.lineTo(px, py + r); c.lineTo(px - r, py); c.closePath();
    c.fillStyle = '#19c3ff'; c.fill(); c.lineWidth = 1.5 * d; c.strokeStyle = '#fff'; c.stroke();
  }
}
function roomList(R){ return R.warps; }
function drawView(cv, cx, cy, s, tappable){
  var c = cv.getContext('2d'), w = cv.width, h = cv.height; c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
  if (!G.ready) return;
  var sx = cx - w / 2 / s, sy = cy - h / 2 / s, d0 = dpr() || 1;
  if (G.room){
    var R = G.room; c.imageSmoothingEnabled = false;
    blit(c, R.cv, (sx + MR) * 16, (sy + MR) * 16, w / s * 16, h / s * 16, w, h);
    if (tappable) marks(c, roomList(R), sx, sy, s, w, h, d0);
    var hp = hereOf(R); if (hp){ dot(c, (hp.x - sx) * s, (hp.y - sy) * s, Math.max(7 * d0, Math.min(s * 0.7, 16 * d0)), '#ffb020', d0); }
    if (G.flash && Date.now() - G.flash.t < 1500){ var fr = Math.max(10 * d0, Math.min(s * 0.9, 22 * d0)); c.lineWidth = 3 * d0; c.strokeStyle = '#ff2d95'; c.beginPath(); c.arc((G.flash.x - sx) * s, (G.flash.y - sy) * s, fr, 0, 6.2832); c.stroke(); }
    return;
  }
  if (s < 5){ { c.imageSmoothingEnabled = true; blit(c, G.over, sx * 4, sy * 4, w / s * 4, h / s * 4, w, h); } }
  else {
    c.imageSmoothingEnabled = false;
    var x0 = Math.max(0, Math.floor(sx)), y0 = Math.max(0, Math.floor(sy)), x1 = Math.min(WW, Math.ceil(sx + w / s)), y1 = Math.min(WH, Math.ceil(sy + h / s));
    for (var ty = y0; ty < y1; ty++){
      var dy = Math.round((ty - sy) * s), dh = Math.round((ty + 1 - sy) * s) - dy;
      for (var tx = x0; tx < x1; tx++){
        var i = G.cells[ty * WW + tx]; if (i < 0) continue; var dx = Math.round((tx - sx) * s);
        c.drawImage(G.atlasCv, (i & 63) * 16, (i >> 6) * 16, 16, 16, dx, dy, Math.round((tx + 1 - sx) * s) - dx, dh);
      }
    }
  }
  if (tappable && s >= 3) marks(c, worldWarps(), sx, sy, s, w, h, d0);
  if (G.last){
    var px = (G.last.x - sx) * s, py = (G.last.y - sy) * s, d = dpr() || 1, r = Math.max(7 * d, Math.min(s * 0.7, 16 * d));
    dot(c, px, py, r, G.indoors ? '#ffb020' : '#ff3b30', d);
  }
}
function sizeCanvas(cv){
  var d = dpr() || 1, w = Math.round(cv.clientWidth * d), h = Math.round(cv.clientHeight * d);
  if (w && h && (cv.width !== w || cv.height !== h)){ cv.width = w; cv.height = h; return true; } return false;
}
function setMsg(t){ var e = $('map-empty'); if (!e) return; e.textContent = t; e.hidden = !t; }
var mini = $('map-mini'), dirty = true;
function miniVisible(){ var c = $('emu-card'); return c && c.dataset.view === 'map' && c.dataset.size !== 'off' && A.st.view === 'game'; }
function visible(){ return miniVisible() || !$('map-view').hidden; }
function renderMini(){
  if (!miniVisible() || !G.ready) return; var re = sizeCanvas(mini); if (!re && !dirty) return; dirty = false;
  var d = dpr() || 1, c = G.last || {x: 150, y: 300};
  if (G.room){ var R = G.room, hp = hereOf(R); drawView(mini, hp ? hp.x : R.w / 2, hp ? hp.y : R.h / 2, Math.round((DESKM.matches ? 14 : 10) * d)); return; }
  drawView(mini, c.x, c.y, Math.round((DESKM.matches ? 12 : 8) * d));
}
setInterval(function(){ if (!G.ready && !G.building && !G.fatal && miniVisible() && A.st.rom && A.st.rom.buf) ensure(function(){ dirty = true; }); renderMini(); }, 300);
setInterval(poll, 2000);

/* ---------- the full-screen viewer: drag to move, pinch to zoom ---------- */
var tapInfo = null, big = $('map-big'), view = {cx: 0, cy: 0, s: 2}, vpts = {}, vpinch = null, vdrag = null, bigResume = false;
function renderBig(){ if ($('map-view').hidden || !G.ready) return; sizeCanvas(big); drawView(big, view.cx, view.cy, view.s * (dpr() || 1), true); }
function fitView(){ var cw = big.clientWidth || 360, ch = big.clientHeight || 600; view.cx = WW / 2; view.cy = WH / 2; view.s = Math.min(cw / WW, ch / WH) * 0.98; }
function fitRoom(R, at){
  var cw = big.clientWidth || 360, ch = big.clientHeight || 600;
  var fit = Math.min(cw / (R.w + 2), ch / (R.h + 2), 40);
  if (R.single){ view.s = Math.max(6, fit); view.cx = at ? at.x : R.w / 2; view.cy = at ? at.y : R.h / 2; }
  else if (at){ view.s = Math.max(9, fit); view.cx = at.x; view.cy = at.y; }
  else { view.s = Math.max(1.5, fit); view.cx = R.w / 2; view.cy = R.h / 2; }
}
function meView(){
  if (G.pos && G.indoors){ var R = compositeOf(G.pos.g, G.pos.n); if (R){ G.room = R; G.stack = []; fitRoom(R, hereOf(R)); syncBack(); return; } }
  if (G.room){ G.room = null; G.stack = []; syncBack(); }
  if (G.last){ view.cx = G.last.x; view.cy = G.last.y; view.s = Math.max(view.s, 4); } else fitView();
}
function fitAll(){ if (G.room) fitRoom(G.room); else fitView(); }
/* going through a door: remember where we were so Back can return */
function snap(){ return {room: G.room, cx: view.cx, cy: view.cy, s: view.s}; }
function goWarp(w){
  if (w.link){   /* a lettered door inside a building: jump to the other end */
    view.cx = w.link.x; view.cy = w.link.y; view.s = Math.max(view.s, 9); G.flash = {x: w.link.x, y: w.link.y, t: Date.now()};
    renderBig(); setTimeout(renderBig, 1600); return;
  }
  var from = snap();
  if (isWorld(w.g, w.n)){   /* out to the outdoor map */
    var pl = null; PLACE.forEach(function(p){ if (p[0] === w.n && (p[5] || 0) === w.g) pl = p; });
    var dw = warpsOf(w.g, w.n)[w.id], tx = dw ? dw.x : pl[3] / 2, ty = dw ? dw.y : pl[4] / 2;
    G.stack.push(from); G.room = null; view.cx = pl[1] + MX + tx + 0.5; view.cy = pl[2] + MY + ty + 1.5; view.s = Math.max(view.s, 6); syncBack(); renderBig(); return;
  }
  var R = compositeOf(w.g, w.n); if (!R) return;
  var o = R.off[w.g + ':' + w.n], dw2 = warpsOf(w.g, w.n)[w.id];
  G.stack.push(from); G.room = R; fitRoom(R, R.single ? undefined : (o && dw2 ? {x: o.x + dw2.x + 0.5, y: o.y + dw2.y + 0.5} : undefined)); syncBack(); renderBig();
}
function goBack(){
  var p = G.stack.pop(); if (!p) return;
  G.room = p.room; view.cx = p.cx; view.cy = p.cy; view.s = p.s; syncBack(); renderBig();
}
function syncBack(){ var b = $('map-back'); if (b) b.hidden = !G.stack.length; dirty = true; try{ info(); }catch(e){} }
function tapAt(clientX, clientY){
  var rect = big.getBoundingClientRect(), d = dpr() || 1, s = view.s;
  var tx = view.cx + (clientX - rect.left - rect.width / 2) / s, ty = view.cy + (clientY - rect.top - rect.height / 2) / s;
  var list = G.room ? roomList(G.room) : (s >= 3 ? worldWarps() : []), best = null, bd = Math.max(0.8, 18 / s);
  for (var i = 0; i < list.length; i++){ var dd = Math.hypot(list[i].x - tx, list[i].y - ty); if (dd < bd){ bd = dd; best = list[i]; } }
  if (best) goWarp(best);
}
function openBig(was){
  if (popped){ try{ pop.focus(); }catch(e){} return; }
  if (!$('map-view').hidden) return;
  G.stack = []; syncBack();
  bigResume = (was === true) || A.st.running; if (A.st.running && A.pause) A.pause();
  $('map-view').hidden = false; $('map-info').textContent = '';
  ensure(function(){ if (G.err) return; fitView(); if (G.last){ view.cx = G.last.x; view.cy = G.last.y; view.s = 5; } if (G.room){ var R0 = G.room, hp0 = hereOf(R0); fitRoom(R0, hp0 || undefined); } info(); renderBig(); });
  poke();
}
/* the map in its own browser window (for a second monitor): the same map view is moved into the new window, so it keeps updating; the game keeps running */
function popOut(){
  if (popped && pop && !pop.closed){ pop.focus(); return; }
  var w = window.open('', 'hdp-map', 'popup=yes,width=1100,height=720'); if (!w){ A.toast && A.toast('Your browser blocked the new window. Allow pop-ups for this site and try again.', 6000); return; }
  var d = w.document; d.open(); d.write('<!doctype html><html><head><meta charset="utf-8"><title>Hoenn map</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#000"></body></html>'); d.close();
  Array.prototype.forEach.call(document.querySelectorAll('style, link[rel=stylesheet]'), function(n){ d.head.appendChild(n.cloneNode(true)); });
  d.documentElement.className = document.documentElement.className; d.body.className = document.body.className;
  var mv = document.getElementById('map-view'); if (!mv) return;
  popMV = mv; popHome = {parent: mv.parentNode, next: mv.nextSibling, was: !mv.hidden};
  d.body.appendChild(d.adoptNode(mv)); pop = w; popped = true; mv.hidden = false; $('map-full').hidden = false;
  w.addEventListener('resize', function(){ renderBig(); });
  w.addEventListener('pagehide', popIn);
  w.addEventListener('keydown', function(e){ if (e.code === 'KeyF') goFull(); });
  window.addEventListener('pagehide', function(){ try{ w.close(); }catch(e){} });
  G.stack = []; syncBack();
  ensure(function(){ if (G.err) return; fitView(); if (G.last){ view.cx = G.last.x; view.cy = G.last.y; view.s = 5; } if (G.room){ var R0 = G.room, hp0 = hereOf(R0); fitRoom(R0, hp0 || undefined); } info(); renderBig(); });
  poke(); setTimeout(renderBig, 300);
}
function popIn(){
  if (!popped) return; popped = false;
  var mv = popMV, w = pop; pop = null;
  if (mv && popHome){ var m2 = document.adoptNode(mv); popHome.parent.insertBefore(m2, popHome.next); }
  var m = document.getElementById('map-view'); if (m){ m.hidden = true; var f = document.getElementById('map-full'); if (f) f.hidden = true; }
  dirty = true;
}
function goFull(){ try{ var d = (pop && !pop.closed) ? pop.document : document; if (d.fullscreenElement) d.exitFullscreen(); else d.documentElement.requestFullscreen(); }catch(e){} }
function poke(){   /* one position read right away when the map opens */
  if (A.st.running && window.hdpVoice && G.ready) poll();
}
function info(){
  var t;
  if (G.room) t = (G.room.single ? '' : 'Matching letters are the same door. Tap a letter to jump to its other end. ') + (hereOf(G.room) ? 'You are here. ' : '') + 'Blue diamonds lead out.';
  else t = G.indoors ? 'You are indoors. The marker shows the last spot outside.' : (G.last ? (view.s >= 3 ? 'Tap a blue door marker to look inside.' : '') : 'Your spot appears once you are playing.');
  $('map-info').textContent = t;
}
function closeBig(){ if (popped){ var pw = pop; popIn(); try{ pw.close(); }catch(e){} return; }
  $('map-view').hidden = true; if (bigResume && A.play) A.play(); bigResume = false; dirty = true; }
function ids(){ return Object.keys(vpts); }
big.addEventListener('pointerdown', function(e){
  vpts[e.pointerId] = [e.clientX, e.clientY]; try{ big.setPointerCapture(e.pointerId); }catch(x){}
  if (ids().length === 2){ var k = ids(); vpinch = {d0: Math.hypot(vpts[k[0]][0] - vpts[k[1]][0], vpts[k[0]][1] - vpts[k[1]][1]) || 1, s0: view.s}; vdrag = null; }
  else vdrag = {x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy};
  tapInfo = ids().length === 1 ? {x: e.clientX, y: e.clientY, t: Date.now()} : null;
});
big.addEventListener('pointermove', function(e){
  if (!vpts[e.pointerId]) return; vpts[e.pointerId] = [e.clientX, e.clientY];
  if (vpinch && ids().length === 2){ var k = ids(); view.s = Math.max(0.4, Math.min(40, vpinch.s0 * Math.hypot(vpts[k[0]][0] - vpts[k[1]][0], vpts[k[0]][1] - vpts[k[1]][1]) / vpinch.d0)); renderBig(); }
  else if (vdrag){ view.cx = vdrag.cx - (e.clientX - vdrag.x) / view.s; view.cy = vdrag.cy - (e.clientY - vdrag.y) / view.s; renderBig(); }
});
function vend(e){ delete vpts[e.pointerId]; if (ids().length < 2) vpinch = null; if (ids().length === 1){ var k = ids()[0]; vdrag = {x: vpts[k][0], y: vpts[k][1], cx: view.cx, cy: view.cy}; } else if (!ids().length) vdrag = null; }
big.addEventListener('pointerup', function(e){
  var t = tapInfo; tapInfo = null;
  if (t && ids().length === 1 && Date.now() - t.t < 600 && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 8) tapAt(e.clientX, e.clientY);
  vend(e);
}); big.addEventListener('pointercancel', vend);
big.addEventListener('wheel', function(e){ e.preventDefault(); view.s = Math.max(0.4, Math.min(40, view.s * Math.exp(-e.deltaY * 0.0015))); renderBig(); }, {passive: false});
$('map-close').addEventListener('click', closeBig);
$('map-full').addEventListener('click', goFull);
$('mn-mappop').addEventListener('click', function(){ A.closeMenu(true); A.st.resumeAfterMenu = false; popOut(); });
$('map-back').addEventListener('click', goBack);
$('map-me').addEventListener('click', function(){ meView(); renderBig(); });
$('map-fit').addEventListener('click', function(){ fitAll(); renderBig(); });
window.addEventListener('resize', function(){ dirty = true; renderBig(); });
setInterval(function(){ if (!$('map-view').hidden){ info(); } }, 1000);

/* ---------- Pokédex | Map tabs on the card ---------- */
var DESKM = window.matchMedia('(min-width:900px) and (hover:hover) and (pointer:fine)');
function setView(v){
  var card = $('emu-card'); card.dataset.view = v; if (!DESKM.matches) try{ localStorage.setItem('hdp-cardview', v); }catch(e){}
  $('ec-tab-dex').setAttribute('aria-pressed', v === 'dex'); $('ec-tab-map').setAttribute('aria-pressed', v === 'map');
  if (A.fitCard) A.fitCard(); dirty = true;
  if (v === 'map') ensure(function(){ dirty = true; renderMini(); poke(); });
}
$('ec-tab-dex').addEventListener('click', function(){ setView('dex'); });
$('ec-tab-map').addEventListener('click', function(){ setView('map'); });
$('ec-expand').addEventListener('click', function(){ openBig(); });
mini.addEventListener('click', function(){ openBig(); });
$('mn-map').addEventListener('click', function(){ var was = !!(A.st.running || A.st.resumeAfterMenu); A.closeMenu(false); A.st.resumeAfterMenu = false; openBig(was); });
function initView(){ if (DESKM.matches) return setView('map'); var v = 'dex'; try{ v = localStorage.getItem('hdp-cardview') === 'map' ? 'map' : 'dex'; }catch(e){} setView(v); }
initView(); if (DESKM.addEventListener) DESKM.addEventListener('change', initView);

window.hdpMap = {roomOf: roomOf, warpsOf: warpsOf, mapHeaderG: mapHeaderG, layoutOf: layoutOf, G: G, setPos: setPos, readPos: readPos, ensure: ensure, drawView: drawView, view: view, openBig: openBig, closeBig: closeBig, setView: setView, PLACE: PLACE};
})();
