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
var FILLRLE = '6,d,8,j,5,4,8,v,b,1j,1q,4,5,3d,7x,d,8,g,1k,1j,1q,4,5,3j,7r,d,8,4,1w,4,e,7,h,d,1w,4,5,d,3,3a,7l,d,q,3,b,3,12,7,5,a,e,7,8,4,8,g,8,d,w,4,5,a,6,y,5,2g,7f,d,q,3,1b,j,b,7,5,d,n,m,t,d,9,1j,5,3,5,1v,79,g,k,6,b,3,z,a,b,7,5,4,8,a,t,j,t,7,5,d,3,1g,5,9,5,1s,76,s,8,4,6,8,3,8,4,e,4,5,p,h,m,5,7,5,p,w,4,5,d,3,1j,c,1y,70,v,8,9,5,6,w,g,n,1d,q,7,5,7,e,4,3,3v,6x,11,9,5,6,g,1z,m,z,7,8,a,b,3,b,3s,6r,11,9,5,6,d,22,j,z,a,5,m,3,5,7,5,3s,6o,d,5,1g,25,j,z,7,5,4,5,4,5,a,3,5,d,8,3m,6l,d,5,1g,2k,4,z,7,5,d,5,7,6,j,5,3m,6i,d,5,j,8,s,3k,7,5,m,c,44,6f,d,h,4,8,v,1z,4,1k,y,8,4,3,7,5,11,5,2s,6c,m,5,4,8,j,5,d,3k,s,b,7,3,7,5,11,5,2s,5,69,m,5,14,1k,a,k,4,1b,a,5,v,3,7,5,a,5,p,5,2v,6c,v,8,p,1n,a,h,4,1b,a,5,s,6,7,5,a,5,p,5,2v,5,30,b,30,s,8,s,1b,4,5,1a,w,d,5,p,6,a,5,d,5,j,8,4,8,2m,5,x,5,i,8,i,5,o,h,30,p,5,s,1e,v,8,j,t,g,8,g,6,d,5,17,6,2m,5,l,8,6,5,f,b,9,5,x,h,30,a,5,17,1h,4,8,s,8,a,t,m,5,d,3,j,5,14,6,1j,5,s,6,7,3,4,c,4,8,4,3,8,c,4,8,9,5,4,r,k,9,5,2o,4,5,7,b,y,1b,14,e,4,w,m,5,d,3,a,e,7,5,v,6,1a,5,j,5,1a,5,19,8,u,k,3,5,2x,4,5,7,b,s,25,7,k,4,z,j,h,3,h,d,5,g,3,3j,5,4,19,b,c,5,3,5,9,7,b,i,5,2l,1a,2t,7,z,j,b,7,5,7,b,s,6,3p,1r,b,6,5,6,4,r,5,2l,5,g,5,p,2t,a,w,y,3,7,e,d,5,41,8,4,1l,e,3u,8,d,h,a,2w,a,t,11,3,4,b,4,8,s,5,g,5,m,5,27,5,4,5,7,1l,e,f,5,3c,8,p,3b,7,w,v,6,4,8,a,8,11,c,4,e,6,7,10,1d,f,8,16,8,43,11,35,4,t,s,9,p,5,p,l,8,1l,7,5,9,7,e,4,5,7,i,5,u,4,5,9,5,3,b,3i,5,1a,32,7,q,s,9,1d,l,4,5,1o,d,6,a,8,4,5,7,1l,5,1c,5,7,2i,5,1g,2q,6,a,5,4,k,a,5,a,f,7,5,17,c,7,8,o,8,1f,p,x,b,l,8,c,1a,29,8,1d,2q,3,d,5,4,k,7,5,f,11,5,14,b,i,h,2o,5,3,5,6,5,13,5,p,5,g,5,29,5,1g,2n,3,j,k,4,5,9,1d,n,g,8,l,n,46,4,5,7,5,g,8,a,8,29,1g,2n,j,n,4,5,3,2a,b,7,l,n,46,m,8,7,8,4,b,26,1j,1h,j,z,a,n,7,3,2p,l,n,f,a,23,5,9,5,r,5,g,5,g,5,d,5,4,5,26,1g,1e,v,w,7,n,4,6,2s,l,h,f,g,1r,e,9,5,u,5,4,3,m,5,4,5,d,5,26,1v,b,4,q,1y,k,4,6,2v,i,8,3,4,i,g,1l,k,1r,s,8,26,8,1s,8,7,n,21,h,4,6,2y,16,j,1i,k,10,h,i,m,2f,g,5,1s,n,27,b,4,6,a,w,21,f,4,i,j,1i,k,x,t,9,a,l,5,23,2g,5,v,3,4,5,1g,8,7,6,5,7,8,d,e,g,5,m,8,v,c,4,f,m,1i,8,6,8,x,t,r,8,6,5,23,5a,5,6,5,1s,3,1g,6,4,9,p,1o,e,10,h,7,i,8,l,5,20,3d,3,7,5,1m,5,c,8,4a,1r,8,13,h,4,l,5,o,5,20,3d,6,1j,5,4,r,5,44,33,e,l,5,6,4,5,4,c,5,r,12,6,51,19,3y,36,b,3,7,c,5,3,h,9,5,r,12,6,51,1c,3y,20,7,10,5,u,8,4,f,5,r,12,3,3y,f,s,1c,3y,36,5,1i,5,r,15,3s,l,s,1l,3m,3l,8,f,5,6,5,6,5,3,5,r,15,3p,o,v,1o,j,l,1g,39,d,x,8,f,5,6,5,3,4,6,5,r,15,3m,r,s,5,1u,7,13,v,3c,m,1o,5,a,x,15,3m,r,7,c,4,3,5,4,79,p,1l,5,3,4,10,15,3j,u,7,c,4,3,7,10,e,5l,4,9,p,1i,8,16,b,j,e,m,3,4,6,2m,c,8,c,m,19,h,5c,7,c,p,i,5,x,5,19,b,7,8,a,b,j,f,2j,c,e,9,7,1o,k,59,7,c,p,i,5,1f,5,r,b,a,5,7,e,g,c,5,3,2j,9,k,6,s,10,n,5u,d,r,5,1f,5,r,b,d,5,4,e,j,9,4,3,2g,9,n,c,7,9,a,x,t,6r,5,x,4,b,4,8,r,n,7,b,3,3d,9,q,r,7,r,18,6i,8,o,5,6,8,6,8,r,k,4,5,4,b,3,3a,9,t,9,a,9,4,r,1e,50,7,1c,8,3,5,f,5,6,8,6,5,u,n,7,b,6,37,9,t,9,a,9,4,o,1k,6f,8,l,5,i,5,u,12,6,5,34,6,12,9,4,9,4,o,1k,6i,8,i,8,9,8,x,12,c,2y,c,z,7,3,4,9,4,r,1e,6l,8,l,k,x,h,7,h,c,2y,i,14,6,a,u,12,6u,5,3,4,1x,e,a,e,i,5,2p,i,1j,x,q,8c,8,r,e,d,8,l,p,5,a,3,1p,f,11,3,4,1f,k,8i,4,u,e,7,b,l,8,v,3,1s,c,y,5,3,a,1c,e,3o,k,i,8,46,e,6,b,9,b,l,8,2s,6,11,5,9,7,53,w,f,5,2i,5,1u,5,6,b,9,b,l,b,4j,4u,12,6,e,33,4,9,7,10,b,9,b,o,b,a,6,41,4u,12,3,k,39,4,8,c,e,f,4,19,e,7,6,7,8,3p,4r,15,3,k,2f,5,o,4,8,l,8,20,4d,4u,15,6,h,69,4a,4x,z,9,e,10,g,1l,e,30,3g,3,j,8,4,o,4,1c,8,10,4,1u,e,r,5,l,5,c,m,1l,8,39,3a,3,p,r,5,o,5,c,b,4,1f,4,1f,5,1f,5,6,8,9,5,m,5,3,b,c,b,3r,5,i,2v,9,p,i,4,9,7,b,7,f,4,c,n,3,7,f,a,1i,5,1x,b,d,8,4o,5,l,2s,6,j,f,5,73,q,49,5,13,2p,6,s,2l,e,1i,5,u,5,1x,j,5,5f,2s,6,s,l,4,1u,g,x,4,f,5,4,2x,4,e,f,5,l,b,3l,5,f,24,6,m,6,s,1o,4,u,7,1l,5,4,o,b,1c,5,1c,b,9,8,9,8,3i,5,9,2a,6,m,6,s,4i,4,c,w,6,5,3,5,9,b,19,5,4o,8,9,2a,6,m,6,v,4r,15,6r,8,6,2d,6,m,6,s,4u,1b,2r,d,36,4,l,2d,9,j,6,p,4x,1k,2i,d,36,4,l,2a,c,j,6,s,4u,1n,2i,4,3,4,36,5,o,27,c,g,9,g,8,a,4r,1n,19,1a,6,g,2o,4,3,5,r,24,c,g,f,n,4u,1n,16,1d,6,14,3f,1p,c,g,f,n,4x,1k,13,1g,6,14,2i,5,19,1a,c,g,f,n,53,1b,16,2p,2i,5,1c,14,i,d,f,k,5i,t,1c,2p,20,4,1x,11,1c,h,7l,1v,6,4,3,j,20,4,1x,11,1c,e,7o,2p,43,y,1f,8,7u,m,3,a,9,j,3,d,3,g,46,s,9i,m,6,4,f,d,6,d,3,g,4c,g,1u,8,2c,d,4x,27,3,g,2i,t,9,a,59,j,4x,2j,2l,b,4,8,7,8,6,a,56,5,j,5,4u,1v,3,a,3,a,2i,4,b,j,8,d,1l,4,3i,5,j,5,4u,2a,3,4,2l,4,b,g,8,4,3,a,1o,4,6,4,u,5,29,5,j,5,50,2d,2f,7,8,j,b,5i,5,j,5,53,g,i,p,f,a,2f,v,e,a,2o,5,2f,8,g,5,59,7,o,m,f,a,2f,14,5,a,59,8,d,53,g,4c,1g,5f,7,a0,1g,f0';   /* coarse land/sea/mountain outline of Hoenn (4x4-tile blocks, run-length coded: run*3+class in base 36; 0 sea, 1 land, 2 mountain), traced from a fan-made region map; used only to decide what scenery fills the gaps */
var FILLW = 204, FILLB = 4, FILLC = null;
function fillClass(gx, gy){ if (!FILLC){ FILLC = new Uint8Array(FILLW * 99); var p = 0; FILLRLE.split(',').forEach(function(t){ var v = parseInt(t, 36), n = (v / 3) | 0, c = v % 3; for (var q = 0; q < n; q++) FILLC[p++] = c; }); } var bx = (gx / FILLB) | 0, by = (gy / FILLB) | 0; return (bx >= FILLW || by >= 99) ? 0 : FILLC[by * FILLW + bx]; }
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
  var i = 0, pass = 0, LASTP = 3, F = null, fy = 0;   /* with the reference picture loaded there is no margin or gap fill: the picture shows through */
  (function step(){
    var t0 = Date.now();
    while (pass < LASTP && Date.now() - t0 < 12){
      if (pass === 2){   /* the gaps between places: continue the scenery of the nearest place (its border tiles) */
        if (!F) F = PLACE.map(function(pl2){
          var L3 = layoutOf(plHdr(pl2)), bl3 = [0, 1, 2, 3].map(function(q){ return G.dv.getUint16(L3.border + 2 * q, true) & 0x3FF; }), sr = 0, sg = 0, sb = 0;
          bl3.forEach(function(m){ var ci = cellFor(L3.t1, L3.t2, m), ox = (ci & 63) * 16, oy = (ci >> 6) * 16; for (var yy = 0; yy < 16; yy++) for (var xx = 0; xx < 16; xx++){ var o = ((oy + yy) * 1024 + ox + xx) * 4; sr += G.atlas[o]; sg += G.atlas[o + 1]; sb += G.atlas[o + 2]; } });
          var cl = (sb > sr + 40 * 1024 && sb > sg + 40 * 1024) ? 0 : (sr > sg - 5 * 1024 ? 2 : 1);   /* what the border looks like: sea, land or mountain */
          return {x0: pl2[1] + MX, y0: pl2[2] + MY, x1: pl2[1] + MX + L3.w, y1: pl2[2] + MY + L3.h, t1: L3.t1, t2: L3.t2, bl: bl3, cl: cl};
        });
        for (var gx = 0; gx < WW; gx++){
          if (G.cells[fy * WW + gx] >= 0) continue;
          var want = G.fanPx ? fanClassAt(gx, fy) : fillClass(gx, fy), bi = -1, bd = 1e12, bi2 = -1, bd2 = 1e12;
          for (var fi = 0; fi < F.length; fi++){ var f = F[fi], ddx = gx < f.x0 ? f.x0 - gx : (gx >= f.x1 ? gx - f.x1 + 1 : 0), ddy = fy < f.y0 ? f.y0 - fy : (fy >= f.y1 ? fy - f.y1 + 1 : 0), dd = ddx * ddx + ddy * ddy; if (dd < bd2){ bd2 = dd; bi2 = fi; } if (f.cl === want && dd < bd){ bd = dd; bi = fi; } }
          var fb = F[bi >= 0 ? bi : bi2]; G.cells[fy * WW + gx] = cellFor(fb.t1, fb.t2, fb.bl[((gx - fb.x0) & 1) + ((fy - fb.y0) & 1) * 2]);
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
  loadFan(function(){ build(function(){ G.building = false; G.fatal = !!G.err && G.err !== 'Load your game first.'; if (G.err) setMsg(G.err); else setMsg(''); cb(); }); });
}
/* the fan-made reference map (map/hoenn.png) is the scenery behind and around the places drawn from the game; ~1.51 px per tile, found by matching it to the game's own layout */
var FAN_S = 1.51, FAN_OX = 1.0, FAN_OY = 24.5;
function fanClassAt(gx, gy){   /* sea / land / mountain of the reference picture at this tile, smoothed over the 3x3 tiles around it */
  if (!G.fcls){
    var P = G.fanPx, c = new Uint8Array(WW * WH), x, y;
    for (y = 0; y < WH; y++) for (x = 0; x < WW; x++){
      var px = Math.floor(x * FAN_S + FAN_OX + 0.3), py = Math.floor(y * FAN_S + FAN_OY + 0.3), n = [0, 0, 0];
      for (var yy = py; yy <= py + 1; yy++) for (var xx = px; xx <= px + 1; xx++){
        if (xx < 0 || yy < 0 || xx >= G.fanW || yy >= G.fanH){ n[0]++; continue; }
        var o = (yy * G.fanW + xx) * 4, r = P[o], g = P[o + 1], b = P[o + 2];
        if (b > r + 40 && b > g + 30) n[0]++; else if (r > g - 8 && r > b + 10 && !(g >= r - 5 && r > 150)) n[2]++; else n[1]++;
      }
      c[y * WW + x] = n[0] >= n[1] && n[0] >= n[2] ? 0 : (n[2] > n[1] ? 2 : 1);
    }
    var d = new Uint8Array(WW * WH);
    for (y = 0; y < WH; y++) for (x = 0; x < WW; x++){
      var m = [0, 0, 0]; for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++){ var X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < WW && Y < WH) m[c[Y * WW + X]]++; }
      d[y * WW + x] = m[c[y * WW + x]] >= 4 ? c[y * WW + x] : (m[0] >= m[1] && m[0] >= m[2] ? 0 : (m[2] > m[1] ? 2 : 1));
    }
    /* rock shapes that touch no land are the picture author's stand-ins for things the game does not have: open sea instead */
    var seen = new Uint8Array(WW * WH), st = [];
    for (var i0 = 0; i0 < WW * WH; i0++){
      if (d[i0] !== 2 || seen[i0]) continue;
      var comp = [], touch = false; st.push(i0); seen[i0] = 1;
      while (st.length){ var q = st.pop(); comp.push(q); var qx = q % WW, qy = (q / WW) | 0;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function(v){ var X = qx + v[0], Y = qy + v[1]; if (X < 0 || Y < 0 || X >= WW || Y >= WH) return; var k = Y * WW + X; if (d[k] === 1) touch = true; else if (d[k] === 2 && !seen[k]){ seen[k] = 1; st.push(k); } }); }
      if (!touch) comp.forEach(function(k){ d[k] = 0; });
    }
    G.fcls = d;
  }
  return G.fcls[gy * WW + gx];
}
function detailMap(){   /* cells where the picture has detail, widened by 4 cells so plain land/sea next to detail stays with the picture too */
  var D = new Uint8Array(WW * WH), E = new Uint8Array(WW * WH), R = 4, x, y, k;
  for (y = 0; y < WH; y++) for (x = 0; x < WW; x++) D[y * WW + x] = fanDetail(x, y) ? 1 : 0;
  for (y = 0; y < WH; y++){ var run = 0; for (x = 0; x < WW; x++){ if (D[y * WW + x]) run = R + 1; else if (run) run--; if (run) E[y * WW + x] = 1; } for (x = WW - 1, run = 0; x >= 0; x--){ if (D[y * WW + x]) run = R + 1; else if (run) run--; if (run) E[y * WW + x] = 1; } }
  var F2 = new Uint8Array(WW * WH);
  for (x = 0; x < WW; x++){ var run2 = 0; for (y = 0; y < WH; y++){ if (E[y * WW + x]) run2 = R + 1; else if (run2) run2--; if (run2) F2[y * WW + x] = 1; } for (y = WH - 1, run2 = 0; y >= 0; y--){ if (E[y * WW + x]) run2 = R + 1; else if (run2) run2--; if (run2) F2[y * WW + x] = 1; } }
  G.det = F2;
}
function fanDetail(gx, gy){
  var P = G.fanPx; if (!P) return false;
  var x0 = Math.floor(gx * FAN_S + FAN_OX), y0 = Math.floor(gy * FAN_S + FAN_OY), lo = [255, 255, 255], hi = [0, 0, 0];
  for (var y = y0; y <= y0 + 2; y++) for (var x = x0; x <= x0 + 2; x++){ if (x < 0 || y < 0 || x >= G.fanW || y >= G.fanH) continue; var o = (y * G.fanW + x) * 4; for (var k = 0; k < 3; k++){ if (P[o + k] < lo[k]) lo[k] = P[o + k]; if (P[o + k] > hi[k]) hi[k] = P[o + k]; } }
  return Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) > 60;
}
function loadFan(cb){
  if (G.fan !== undefined) return cb();
  var im = new Image(), done = false; function fin(ok){ if (done) return; done = true; G.fan = ok ? im : null; cb(); }
  im.onload = function(){ try{ var fc = document.createElement('canvas'); fc.width = im.width; fc.height = im.height; var fx = fc.getContext('2d'); fx.drawImage(im, 0, 0); G.fanPx = fx.getImageData(0, 0, im.width, im.height).data; G.fanW = im.width; G.fanH = im.height; }catch(e){ G.fanPx = null; } fin(true); }; im.onerror = function(){ fin(false); }; im.src = 'map/hoenn.png';
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
