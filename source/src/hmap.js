/* Hoenn map: draws the whole overworld from the Pokémon Emerald game file already on this phone (nothing is uploaded or stored on the site),
   and shows a marker for where the trainer is, read from the game's memory every couple of seconds while the map is on screen. */
(function(){
'use strict';
var A = window.hdpApi; if (!A) return;
var $ = function(id){ return document.getElementById(id); };
var PLACE = [[0,40,232,30,30],[1,200,260,40,60],[2,200,140,40,20],[3,0,122,40,60],[4,320,0,40,20],[5,480,70,80,40],[6,640,100,80,40],[8,760,180,40,80],[9,120,282,20,20],[10,120,242,20,20],[11,60,362,20,20],[12,140,60,20,20],[13,80,0,20,20],[14,120,140,20,20],[15,480,260,20,40],[16,120,262,20,20],[17,70,242,50,20],[18,120,220,80,22],[19,0,182,40,80],[20,0,262,40,80],[21,0,342,80,20],[22,80,360,60,20],[23,140,360,60,20],[24,200,320,40,63],[25,200,160,40,100],[26,200,0,40,140],[27,160,20,40,60],[28,100,0,100,20],[29,40,2,40,80],[30,0,42,40,80],[31,40,122,100,20],[32,140,140,60,20],[33,240,140,80,20],[34,280,0,40,140],[35,360,0,40,100],[36,400,80,80,20],[37,420,100,40,40],[38,320,140,140,20],[39,560,60,80,80],[40,640,60,80,40],[41,560,140,80,80],[42,640,140,80,80],[43,640,220,120,40],[44,640,260,80,40],[45,560,260,80,40],[46,500,260,60,40],[47,400,260,80,40],[48,320,260,80,40],[49,240,260,80,40]];                       // [map number in group 0, x, y, width, height] in tiles, from the game's own map-connection data
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
  PLACE.forEach(function(pl){ warpsOf(0, pl[0]).forEach(function(w){ if (w.ok) out.push({x: pl[1] + MX + w.x + 0.5, y: pl[2] + MY + w.y + 0.5, g: w.g, n: w.n, id: w.id}); }); });
  return G.warps = out;
}
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
    for (var k = 0; k < PLACE.length; k++){ var L = layoutOf(mapHeader(PLACE[k][0])); if (L.w !== PLACE[k][3] || L.h !== PLACE[k][4]) throw new Error('layout'); }
  }catch(e){ G.err = 'This game file has different maps than the usual Emerald, so the map is not available.'; return done(); }
  G.cells = new Int32Array(WW * WH).fill(-1); G.atlas = new Uint8ClampedArray(1024 * 2048 * 4); G.n = 0; G.byId = {}; TS = {};
  var i = 0, pass = 0;
  (function step(){
    var t0 = Date.now();
    while (pass < 2 && Date.now() - t0 < 12){
      if (i >= PLACE.length){ pass++; i = 0; continue; }
      var pl = PLACE[i++], L2 = layoutOf(mapHeader(pl[0])), ax = pl[1] + MX, ay = pl[2] + MY;
      if (pass === 0){
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
    if (pass < 2) return setTimeout(step, 0);
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
  var pl = null; if (g === 0) for (var k = 0; k < PLACE.length; k++) if (PLACE[k][0] === n) pl = PLACE[k];
  if (pl){ G.last = {x: pl[1] + MX + x + 0.5, y: pl[2] + MY + y + 0.5}; G.indoors = false; }
  else G.indoors = true;
  G.pos = {g: g, n: n, x: x, y: y}; dirty = true;
  var pk = g + ':' + n;
  if (pk !== G.pk){   /* the trainer moved to a different map: the view follows */
    G.pk = pk; G.stack = [];
    try{ if (G.indoors && G.ready){ var R = roomOf(g, n); G.room = R; if (R && !$('map-view').hidden) fitRoom(R, x, y); } else { G.room = null; if (!$('map-view').hidden && G.last){ view.cx = G.last.x; view.cy = G.last.y; } } }catch(e){ G.room = null; }
    syncBack();
  }
  if (!$('map-view').hidden) renderBig();
}

/* ---------- drawing ---------- */
function dot(c, px, py, r, col, d){
  c.lineWidth = 3 * d; c.strokeStyle = '#fff'; c.beginPath(); c.arc(px, py, r, 0, 6.2832); c.stroke();
  c.lineWidth = 2 * d; c.strokeStyle = col; c.beginPath(); c.arc(px, py, r, 0, 6.2832); c.stroke();
  c.fillStyle = col; c.beginPath(); c.arc(px, py, Math.max(2.5 * d, r * 0.28), 0, 6.2832); c.fill();
}
function marks(c, list, sx, sy, s, w, h, d){   /* tappable doors and exits */
  var r = Math.max(4 * d, Math.min(s * 0.38, 9 * d));
  for (var i = 0; i < list.length; i++){
    var px = (list[i].x - sx) * s, py = (list[i].y - sy) * s; if (px < -r || py < -r || px > w + r || py > h + r) continue;
    c.beginPath(); c.moveTo(px, py - r); c.lineTo(px + r, py); c.lineTo(px, py + r); c.lineTo(px - r, py); c.closePath();
    c.fillStyle = '#19c3ff'; c.fill(); c.lineWidth = 1.5 * d; c.strokeStyle = '#fff'; c.stroke();
  }
}
function roomList(R){ return R.warps.map(function(w){ return {x: w.x + 0.5, y: w.y + 0.5, g: w.g, n: w.n, id: w.id}; }); }
function drawView(cv, cx, cy, s, tappable){
  var c = cv.getContext('2d'), w = cv.width, h = cv.height; c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
  if (!G.ready) return;
  var sx = cx - w / 2 / s, sy = cy - h / 2 / s, d0 = window.devicePixelRatio || 1;
  if (G.room){
    var R = G.room; c.imageSmoothingEnabled = false;
    c.drawImage(R.cv, (sx + MR) * 16, (sy + MR) * 16, w / s * 16, h / s * 16, 0, 0, w, h);
    if (tappable) marks(c, roomList(R), sx, sy, s, w, h, d0);
    if (G.pos && G.pos.g === R.g && G.pos.n === R.n){ var qx = (G.pos.x + 0.5 - sx) * s, qy = (G.pos.y + 0.5 - sy) * s; dot(c, qx, qy, Math.max(7 * d0, Math.min(s * 0.7, 16 * d0)), '#ffb020', d0); }
    return;
  }
  if (s < 5){ c.imageSmoothingEnabled = true; c.drawImage(G.over, sx * 4, sy * 4, w / s * 4, h / s * 4, 0, 0, w, h); }
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
    var px = (G.last.x - sx) * s, py = (G.last.y - sy) * s, d = window.devicePixelRatio || 1, r = Math.max(7 * d, Math.min(s * 0.7, 16 * d));
    dot(c, px, py, r, G.indoors ? '#ffb020' : '#ff3b30', d);
  }
}
function sizeCanvas(cv){
  var d = window.devicePixelRatio || 1, w = Math.round(cv.clientWidth * d), h = Math.round(cv.clientHeight * d);
  if (w && h && (cv.width !== w || cv.height !== h)){ cv.width = w; cv.height = h; return true; } return false;
}
function setMsg(t){ var e = $('map-empty'); if (!e) return; e.textContent = t; e.hidden = !t; }
var mini = $('map-mini'), dirty = true;
function miniVisible(){ var c = $('emu-card'); return c && c.dataset.view === 'map' && c.dataset.size !== 'off' && A.st.view === 'game'; }
function visible(){ return miniVisible() || !$('map-view').hidden; }
function renderMini(){
  if (!miniVisible() || !G.ready) return; var re = sizeCanvas(mini); if (!re && !dirty) return; dirty = false;
  var d = window.devicePixelRatio || 1, c = G.last || {x: 150, y: 300};
  if (G.room){ var R = G.room, here = G.pos && G.pos.g === R.g && G.pos.n === R.n; drawView(mini, here ? G.pos.x + 0.5 : R.w / 2, here ? G.pos.y + 0.5 : R.h / 2, Math.round((DESKM.matches ? 14 : 10) * d)); return; }
  drawView(mini, c.x, c.y, Math.round((DESKM.matches ? 12 : 8) * d));
}
setInterval(function(){ if (!G.ready && !G.building && !G.fatal && miniVisible() && A.st.rom && A.st.rom.buf) ensure(function(){ dirty = true; }); renderMini(); }, 300);
setInterval(poll, 2000);

/* ---------- the full-screen viewer: drag to move, pinch to zoom ---------- */
var tapInfo = null, big = $('map-big'), view = {cx: 0, cy: 0, s: 2}, vpts = {}, vpinch = null, vdrag = null, bigResume = false;
function renderBig(){ if ($('map-view').hidden || !G.ready) return; sizeCanvas(big); drawView(big, view.cx, view.cy, view.s * (window.devicePixelRatio || 1), true); }
function fitView(){ var cw = big.clientWidth || 360, ch = big.clientHeight || 600; view.cx = WW / 2; view.cy = WH / 2; view.s = Math.min(cw / WW, ch / WH) * 0.98; }
function fitRoom(R, x, y){
  var cw = big.clientWidth || 360, ch = big.clientHeight || 600;
  view.s = Math.max(6, Math.min(cw / (R.w + 2), ch / (R.h + 2), 40)); view.cx = x === undefined ? R.w / 2 : x + 0.5; view.cy = y === undefined ? R.h / 2 : y + 0.5;
}
function meView(){
  if (G.pos && G.indoors){ var R = roomOf(G.pos.g, G.pos.n); if (R){ G.room = R; G.stack = []; fitRoom(R, G.pos.x, G.pos.y); syncBack(); return; } }
  if (G.room){ G.room = null; G.stack = []; syncBack(); }
  if (G.last){ view.cx = G.last.x; view.cy = G.last.y; view.s = Math.max(view.s, 4); } else fitView();
}
/* going through a door: remember where we were so Back can return */
function snap(){ return {room: G.room, cx: view.cx, cy: view.cy, s: view.s}; }
function goWarp(w){
  var from = snap();
  if (w.g === 0){   /* out to the outdoor map */
    var pl = null; PLACE.forEach(function(p){ if (p[0] === w.n) pl = p; });
    if (pl){
      var dw = warpsOf(0, w.n)[w.id], tx = dw ? dw.x : pl[3] / 2, ty = dw ? dw.y : pl[4] / 2;
      G.stack.push(from); G.room = null; view.cx = pl[1] + MX + tx + 0.5; view.cy = pl[2] + MY + ty + 1.5; view.s = Math.max(view.s, 6); syncBack(); renderBig(); return;
    }
  }
  var R = roomOf(w.g, w.n); if (!R) return;
  G.stack.push(from); G.room = R; fitRoom(R); syncBack(); renderBig();
}
function goBack(){
  var p = G.stack.pop(); if (!p) return;
  G.room = p.room; view.cx = p.cx; view.cy = p.cy; view.s = p.s; syncBack(); renderBig();
}
function syncBack(){ var b = $('map-back'); if (b) b.hidden = !G.stack.length; dirty = true; try{ info(); }catch(e){} }
function tapAt(clientX, clientY){
  var rect = big.getBoundingClientRect(), d = window.devicePixelRatio || 1, s = view.s;
  var tx = view.cx + (clientX - rect.left - rect.width / 2) / s, ty = view.cy + (clientY - rect.top - rect.height / 2) / s;
  var list = G.room ? roomList(G.room) : (s >= 3 ? worldWarps() : []), best = null, bd = Math.max(0.8, 18 / s);
  for (var i = 0; i < list.length; i++){ var dd = Math.hypot(list[i].x - tx, list[i].y - ty); if (dd < bd){ bd = dd; best = list[i]; } }
  if (best) goWarp(best);
}
function openBig(was){
  if (!$('map-view').hidden) return;
  G.stack = []; syncBack();
  bigResume = (was === true) || A.st.running; if (A.st.running && A.pause) A.pause();
  $('map-view').hidden = false; $('map-info').textContent = '';
  ensure(function(){ if (G.err) return; fitView(); if (G.last){ view.cx = G.last.x; view.cy = G.last.y; view.s = 5; } if (G.room){ var R0 = G.room; if (G.pos && G.pos.g === R0.g && G.pos.n === R0.n) fitRoom(R0, G.pos.x, G.pos.y); else fitRoom(R0); } info(); renderBig(); });
  poke();
}
function poke(){   /* one position read right away when the map opens */
  if (A.st.running && window.hdpVoice && G.ready) poll();
}
function info(){
  var t;
  if (G.room) t = G.pos && G.pos.g === G.room.g && G.pos.n === G.room.n ? 'You are here. Tap a blue marker to go through it.' : 'Tap a blue marker to go through it. Back returns.';
  else t = G.indoors ? 'You are indoors. The marker shows the last spot outside.' : (G.last ? (view.s >= 3 ? 'Tap a blue door marker to look inside.' : '') : 'Your spot appears once you are playing.');
  $('map-info').textContent = t;
}
function closeBig(){ $('map-view').hidden = true; if (bigResume && A.play) A.play(); bigResume = false; dirty = true; }
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
$('map-back').addEventListener('click', goBack);
$('map-me').addEventListener('click', function(){ meView(); renderBig(); });
$('map-fit').addEventListener('click', function(){ fitView(); renderBig(); });
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

window.hdpMap = {G: G, setPos: setPos, readPos: readPos, ensure: ensure, drawView: drawView, view: view, openBig: openBig, closeBig: closeBig, setView: setView, PLACE: PLACE};
})();
