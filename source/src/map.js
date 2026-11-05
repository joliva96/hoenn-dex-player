/* Map: stitches what you have seen on screen into a larger picture of the area.
   It watches how far the game picture scrolls between frames (no game memory needed), paints each frame into a growing
   image, and starts a new image when the scene changes (a door, a cave, a battle that does not match anything seen). */
(function(){
'use strict';
var A = window.hdpApi; if (!A) return;
var $ = function(id){ return document.getElementById(id); };
var W = 240, H = 160, N = W * H;
var MASK = {x0: 104, y0: 40, x1: 136, y1: 88};          // where the player sprite sits (never trusted over real scenery)
var GRID_X = [], GRID_Y = [];                              // sample points used for matching
(function(){ for (var y = 6; y < H - 5; y += 5) for (var x = 6; x < W - 5; x += 5){ if (x >= MASK.x0 && x < MASK.x1 && y >= MASK.y0 && y < MASK.y1) continue; GRID_X.push(x); GRID_Y.push(y); } })();
var GN = GRID_X.length, MAXAREAS = 6, MAXDIM = 6144;

/* ---------- one stitched area ---------- */
function Area(){
  this.cw = 1024; this.ch = 1024; this.cv = document.createElement('canvas'); this.cv.width = this.cw; this.cv.height = this.ch;
  this.ctx = this.cv.getContext('2d'); this.ox = 384; this.oy = 432;           // world (0,0) sits here inside the canvas
  this.x = 0; this.y = 0;                                                      // top-left of the screen, in world pixels
  this.bx0 = 1e9; this.by0 = 1e9; this.bx1 = -1e9; this.by1 = -1e9;           // bounds of what has been painted
  this.moved = 0; this.rev = 0; this.vx = 0; this.vy = 0;
}
Area.prototype.ensure = function(wx, wy){
  var x0 = wx + this.ox, y0 = wy + this.oy, pad = 256, gl = 0, gt = 0, gr = 0, gb = 0;
  if (x0 < 0) gl = Math.ceil(-x0 / pad) * pad; if (y0 < 0) gt = Math.ceil(-y0 / pad) * pad;
  if (x0 + W > this.cw) gr = Math.ceil((x0 + W - this.cw) / pad) * pad; if (y0 + H > this.ch) gb = Math.ceil((y0 + H - this.ch) / pad) * pad;
  if (!(gl || gt || gr || gb)) return true;
  var nw = this.cw + gl + gr, nh = this.ch + gt + gb; if (nw > MAXDIM || nh > MAXDIM) return false;
  var nc = document.createElement('canvas'); nc.width = nw; nc.height = nh; var nx = nc.getContext('2d'); nx.drawImage(this.cv, gl, gt);
  this.cv = nc; this.ctx = nx; this.cw = nw; this.ch = nh; this.ox += gl; this.oy += gt; return true;
};
/* paint the current frame at the area's position; the player box only fills gaps, so the sprite never overwrites scenery */
Area.prototype.paint = function(frame){
  if (!this.ensure(this.x, this.y)) return false;
  var cx = this.x + this.ox, cy = this.y + this.oy, c = this.ctx, M = MASK;
  c.globalCompositeOperation = 'source-over';
  c.drawImage(frame, 0, 0, W, M.y0, cx, cy, W, M.y0);
  c.drawImage(frame, 0, M.y1, W, H - M.y1, cx, cy + M.y1, W, H - M.y1);
  c.drawImage(frame, 0, M.y0, M.x0, M.y1 - M.y0, cx, cy + M.y0, M.x0, M.y1 - M.y0);
  c.drawImage(frame, M.x1, M.y0, W - M.x1, M.y1 - M.y0, cx + M.x1, cy + M.y0, W - M.x1, M.y1 - M.y0);
  c.globalCompositeOperation = 'destination-over';
  c.drawImage(frame, M.x0, M.y0, M.x1 - M.x0, M.y1 - M.y0, cx + M.x0, cy + M.y0, M.x1 - M.x0, M.y1 - M.y0);
  c.globalCompositeOperation = 'source-over';
  this.bx0 = Math.min(this.bx0, this.x); this.by0 = Math.min(this.by0, this.y); this.bx1 = Math.max(this.bx1, this.x + W); this.by1 = Math.max(this.by1, this.y + H);
  this.rev++; return true;
};

/* ---------- the tracker ---------- */
var prev = new Uint8Array(N), cur = new Uint8Array(N), have = false;
var areas = [], ci = -1, lost = false, stable = 0, coh = 0, lostFrames = 0, enabled = true, frames = 0;
function luma(d, out){ for (var i = 0, j = 0; j < N; i += 4, j++) out[j] = (d[i] * 77 + d[i + 1] * 151 + d[i + 2] * 28) >> 8; }
function changed(a, b){ var n = 0, t = 0; for (var i = 0; i < N; i += 7){ t++; var d = a[i] - b[i]; if (d > 20 || d < -20) n++; } return n / t; }
function mean(a){ var s = 0, c = 0; for (var i = 0; i < N; i += 11){ s += a[i]; c++; } return s / c; }
/* how much of the new frame (a) equals the old frame (b) when the camera moved by (dx,dy): a(x,y) ~ b(x+dx,y+dy) */
function match(a, b, dx, dy){
  var ok = 0, tot = 0;
  for (var k = 0; k < GN; k++){
    var x = GRID_X[k], y = GRID_Y[k], bx = x + dx, by = y + dy;
    if (bx < 0 || by < 0 || bx >= W || by >= H) continue;
    tot++; var d = a[y * W + x] - b[by * W + bx]; if (d < 13 && d > -13) ok++;
  }
  return tot > 200 ? ok / tot : 0;
}
function hintDir(){ var s = A.st.held || {}; return {x: (s.Right ? 1 : 0) - (s.Left ? 1 : 0), y: (s.Down ? 1 : 0) - (s.Up ? 1 : 0)}; }
function estimate(a, b, ar){
  var f0 = match(a, b, 0, 0); if (f0 >= 0.97) return {dx: 0, dy: 0, f: f0};
  var h = hintDir(), best = null, bs = -1;
  function tryD(dx, dy){
    var f = dx === 0 && dy === 0 ? f0 : match(a, b, dx, dy);
    var s = f + (dx === ar.vx && dy === ar.vy ? 0.003 : 0) + ((h.x && dx * h.x > 0) || (h.y && dy * h.y > 0) ? 0.004 : 0) - 0.0004 * (Math.abs(dx) + Math.abs(dy));
    if (s > bs){ bs = s; best = {dx: dx, dy: dy, f: f}; }
  }
  for (var j = -1; j <= 1; j++) for (var i = -1; i <= 1; i++) tryD(ar.vx + i, ar.vy + j);
  tryD(0, 0);
  if (best.f >= 0.9) return best;
  for (var y = -8; y <= 8; y++) for (var x = -8; x <= 8; x++) tryD(x, y);
  return best;
}
/* does the current frame fit onto an existing area at its last position? (used after fades, battles, menus) */
var probe = document.createElement('canvas'); probe.width = W; probe.height = H; var pctx = probe.getContext('2d', {willReadFrequently: true});
function fitsArea(ar){
  var cx = ar.x + ar.ox, cy = ar.y + ar.oy; if (cx < 0 || cy < 0 || cx + W > ar.cw || cy + H > ar.ch) return 0;
  pctx.clearRect(0, 0, W, H); pctx.drawImage(ar.cv, cx, cy, W, H, 0, 0, W, H);
  var d = pctx.getImageData(0, 0, W, H).data, ok = 0, tot = 0, painted = 0;
  for (var k = 0; k < GN; k++){
    var p = GRID_Y[k] * W + GRID_X[k]; painted++;
    if (d[p * 4 + 3] < 255) continue;
    tot++; var l = (d[p * 4] * 77 + d[p * 4 + 1] * 151 + d[p * 4 + 2] * 28) >> 8, df = cur[p] - l; if (df < 13 && df > -13) ok++;
  }
  return tot > painted * 0.25 ? ok / tot : 0;
}
function newArea(frame){
  var ar = new Area(); areas.push(ar); if (areas.length > MAXAREAS) areas.shift(); ci = areas.length - 1; ar.paint(frame); lost = false; return ar;
}
function swap(){ var t = prev; prev = cur; cur = t; }

/* one captured frame in: `data` is RGBA, `frame` a canvas holding the same picture */
function feed(data, frame){
  frames++; luma(data, cur);
  if (!have){ prev.set(cur); have = true; stable = 0; coh = 0; lost = true; return; }
  var ch = changed(cur, prev), m = mean(cur);
  var ar = ci >= 0 ? areas[ci] : null;
  if (lost || !ar){
    var e0 = m > 14 ? estimate(cur, prev, {vx: 0, vy: 0}) : {f: 0};
    coh = e0.f >= 0.9 ? coh + 1 : 0; lostFrames++;
    if (coh >= 8){
      for (var i = areas.length - 1; i >= 0; i--) if (fitsArea(areas[i]) >= 0.55){ ci = i; lost = false; coh = 0; lostFrames = 0; swap(); return; }
      if (coh >= 24){ newArea(frame); lostFrames = 0; coh = 0; }
    }
    swap(); return;
  }
  if (ch < 0.02){ swap(); return; }                                    // nothing moved
  if (m < 10 || Math.abs(m - mean(prev)) > 25){ lost = true; stable = 0; coh = 0; lostFrames = 0; swap(); return; }   // fade to or from black
  var e = estimate(cur, prev, ar);
  if (e.f < 0.45){ lost = true; stable = 0; coh = 0; lostFrames = 0; swap(); return; }
  if (e.dx || e.dy){ ar.x += e.dx; ar.y += e.dy; ar.vx = e.dx; ar.vy = e.dy; ar.moved++; ar.paint(frame); }
  swap();
}

/* ---------- capture loop ---------- */
var scr = document.createElement('canvas'); scr.width = W; scr.height = H; var sctx = scr.getContext('2d', {willReadFrequently: true});
var cvs = $('emu-canvas');
function tick(){
  if (enabled && A.st.running && A.st.view === 'game'){
    try{ sctx.drawImage(cvs, 0, 0, W, H); feed(sctx.getImageData(0, 0, W, H).data, scr); }catch(e){}
  }
  requestAnimationFrame(tick);
}

/* ---------- views ---------- */
function current(){ return ci >= 0 ? areas[ci] : null; }
function youAt(ar){ return {x: ar.x + 120, y: ar.y + 72}; }
function drawView(canvas, ar, cx, cy, scale, you){
  var c = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  c.imageSmoothingEnabled = false; c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
  if (!ar) return;
  var sx = cx - w / 2 / scale, sy = cy - h / 2 / scale;
  c.drawImage(ar.cv, sx + ar.ox, sy + ar.oy, w / scale, h / scale, 0, 0, w, h);
  if (you !== false){
    var p = youAt(ar), px = (p.x - sx) * scale, py = (p.y - sy) * scale, r = Math.max(5, 7 * scale * 0.6);
    c.lineWidth = Math.max(2, 2 * (window.devicePixelRatio || 1)); c.strokeStyle = '#fff'; c.beginPath(); c.arc(px, py, r, 0, 6.2832); c.stroke();
    c.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#2de08a'; c.beginPath(); c.arc(px, py, r + c.lineWidth, 0, 6.2832); c.stroke();
  }
}

/* the small map that replaces the Pokédex card contents */
var mini = $('map-mini'), lastRev = -1, lastKey = '';
function sizeCanvas(cv){
  var d = window.devicePixelRatio || 1, w = Math.round(cv.clientWidth * d), h = Math.round(cv.clientHeight * d);
  if (w && h && (cv.width !== w || cv.height !== h)){ cv.width = w; cv.height = h; return true; } return false;
}
function renderMini(){
  var card = $('emu-card'); if (!card || card.dataset.view !== 'map' || card.dataset.size === 'off') return;
  var ar = current(), re = sizeCanvas(mini), d = window.devicePixelRatio || 1, scale = Math.max(1, Math.round(d * 0.75));   // whole device pixels per game pixel
  var key = ar ? ar.rev + ':' + ci + ':' + ar.x + ':' + ar.y + ':' + mini.width : 'none:' + mini.width;
  if (!re && key === lastKey) return; lastKey = key;
  var p = ar ? youAt(ar) : {x: 0, y: 0};
  drawView(mini, ar, p.x, p.y, scale, true);
  $('map-empty').hidden = !!(ar && ar.moved > 2);
}
setInterval(renderMini, 150);

/* the full-screen viewer: drag to move around, pinch to zoom */
var big = $('map-big'), view = {cx: 0, cy: 0, s: 2}, vpts = {}, vpinch = null, vdrag = null;
function renderBig(){
  if ($('map-view').hidden) return; sizeCanvas(big);
  var d = window.devicePixelRatio || 1; drawView(big, current(), view.cx, view.cy, view.s * d, true);
}
function centerBig(){
  var ar = current(); if (!ar){ view.cx = view.cy = 0; return; }
  var w = ar.bx1 - ar.bx0, h = ar.by1 - ar.by0, cw = big.clientWidth || 360, ch = big.clientHeight || 600;
  view.cx = (ar.bx0 + ar.bx1) / 2; view.cy = (ar.by0 + ar.by1) / 2; view.s = Math.max(0.5, Math.min(4, Math.min(cw / w, ch / h) * 0.95));
}
var bigResume = false;
function openBig(was){ if (!$('map-view').hidden) return; bigResume = (was === true) || A.st.running; if (A.st.running && A.pause) A.pause(); $('map-view').hidden = false; var ar = current(), p = ar ? youAt(ar) : {x: 0, y: 0}; centerBig(); sizeCanvas(big); renderBig(); $('map-info').textContent = ar ? areas.length + ' area' + (areas.length > 1 ? 's' : '') + ' remembered' : 'Nothing mapped yet'; }
function closeBig(){ $('map-view').hidden = true; if (bigResume && A.play) A.play(); bigResume = false; }
function ids(){ return Object.keys(vpts); }
big.addEventListener('pointerdown', function(e){
  vpts[e.pointerId] = [e.clientX, e.clientY]; try{ big.setPointerCapture(e.pointerId); }catch(x){}
  if (ids().length === 2){ var k = ids(); vpinch = {d0: Math.hypot(vpts[k[0]][0] - vpts[k[1]][0], vpts[k[0]][1] - vpts[k[1]][1]) || 1, s0: view.s}; vdrag = null; }
  else vdrag = {x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy};
});
big.addEventListener('pointermove', function(e){
  if (!vpts[e.pointerId]) return; vpts[e.pointerId] = [e.clientX, e.clientY];
  if (vpinch && ids().length === 2){ var k = ids(); view.s = Math.max(0.4, Math.min(8, vpinch.s0 * Math.hypot(vpts[k[0]][0] - vpts[k[1]][0], vpts[k[0]][1] - vpts[k[1]][1]) / vpinch.d0)); renderBig(); }
  else if (vdrag){ view.cx = vdrag.cx - (e.clientX - vdrag.x) / view.s; view.cy = vdrag.cy - (e.clientY - vdrag.y) / view.s; renderBig(); }
});
function vend(e){ delete vpts[e.pointerId]; if (ids().length < 2) vpinch = null; if (ids().length === 1){ var k = ids()[0]; vdrag = {x: vpts[k][0], y: vpts[k][1], cx: view.cx, cy: view.cy}; } else if (!ids().length) vdrag = null; }
big.addEventListener('pointerup', vend); big.addEventListener('pointercancel', vend);
$('map-close').addEventListener('click', closeBig);
$('map-me').addEventListener('click', function(){ var ar = current(); if (!ar) return; var p = youAt(ar); view.cx = p.x; view.cy = p.y; renderBig(); });
$('map-fit').addEventListener('click', function(){ centerBig(); renderBig(); });
$('map-clear').addEventListener('click', function(){
  if (!confirmClear){ confirmClear = true; $('map-clear').textContent = 'Tap again to clear'; setTimeout(function(){ confirmClear = false; $('map-clear').textContent = 'Clear'; }, 3000); return; }
  confirmClear = false; $('map-clear').textContent = 'Clear'; clearAll(); renderBig();
});
var confirmClear = false;
function clearAll(){ areas = []; ci = -1; lost = true; have = false; stable = 0; lastKey = ''; renderMini(); }
setInterval(renderBig, 250);
window.addEventListener('resize', function(){ lastKey = ''; renderBig(); });

/* card tabs: Pokédex | Map */
function setView(v){
  var card = $('emu-card'); card.dataset.view = v; try{ localStorage.setItem('hdp-cardview', v); }catch(e){}
  $('ec-tab-dex').setAttribute('aria-pressed', v === 'dex'); $('ec-tab-map').setAttribute('aria-pressed', v === 'map');
  if (A.fitCard) A.fitCard(); lastKey = ''; renderMini();
}
$('ec-tab-dex').addEventListener('click', function(){ setView('dex'); });
$('ec-tab-map').addEventListener('click', function(){ setView('map'); });
$('ec-expand').addEventListener('click', function(){ openBig(); });
$('map-mini').addEventListener('click', function(){ openBig(); });
$('mn-map').addEventListener('click', function(){ var was = !!(A.st.running || A.st.resumeAfterMenu); A.closeMenu(false); A.st.resumeAfterMenu = false; openBig(was); });
function setEnabled(on){
  enabled = on; try{ localStorage.setItem('hdp-map', on ? '1' : '0'); }catch(e){}
  $('mn-map-t').textContent = 'Map recording: ' + (on ? 'On' : 'Off'); if (!on){ have = false; lost = true; }
}
$('mn-maprec').addEventListener('click', function(){ setEnabled(!enabled); });
try{ if (localStorage.getItem('hdp-map') === '0') enabled = false; }catch(e){}
$('mn-map-t').textContent = 'Map recording: ' + (enabled ? 'On' : 'Off');
try{ setView(localStorage.getItem('hdp-cardview') === 'map' ? 'map' : 'dex'); }catch(e){ setView('dex'); }
requestAnimationFrame(tick);

window.hdpMap = {feed: feed, areas: function(){ return areas; }, current: current, clear: clearAll, state: function(){ return {frames: frames, lost: lost, area: ci, areas: areas.length, x: current() && current().x, y: current() && current().y, moved: current() && current().moved}; }, scr: scr, sctx: sctx, setView: setView, openBig: openBig, closeBig: closeBig};
})();
