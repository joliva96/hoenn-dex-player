(function(){
'use strict';
var $ = function(id){ return document.getElementById(id); };
var root = document.documentElement;
var ROMNAME = 'pokemon.gba', SAVNAME = 'pokemon.sav', SAVE_MIN = 131072;
var st = {M:null, enginePromise:null, rom:null, started:false, running:false, view:'game', resumeAfterMenu:false, wasRunning:false,
  held:{}, pointers:{}, lock:null, saveTimer:null, toastTimer:null, ack:false, noStore:false, remote:undefined, busy:false};

/* ---------- small helpers ---------- */
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function timeout(p, ms){ return new Promise(function(res){ var t = setTimeout(function(){ res(undefined); }, ms); p.then(function(v){ clearTimeout(t); res(v); }, function(){ clearTimeout(t); res(undefined); }); }); }
function toB64(u8){ var s = '', n = 0x8000; for (var i = 0; i < u8.length; i += n) s += String.fromCharCode.apply(null, u8.subarray(i, i + n)); return btoa(s); }
function fromB64(b){ var s = atob(b), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
function updateLens(){
  if (!window.hdfDex) return;
  var n = window.hdfDex.count(), lens = $('emu-lens');
  $('emu-lensN').textContent = n; lens.style.setProperty('--p', (n / 386 * 100).toFixed(2)); lens.classList.toggle('done', n >= 386);
  lens.setAttribute('aria-label', n + ' of 386 caught');
  renderCard();
}
function renderCard(){
  if (!window.hdfDex) return;
  var g = window.hdfDex.byGen(), n = window.hdfDex.count(), r = (st.recent || []).slice(0, 6), names = window.hdfDex.names(r);
  $('ec-n').textContent = n + ' of 386 caught';
  [1, 2, 3].forEach(function(i){ var e = $('ec-g' + i); e.querySelector('em').textContent = g[i].c + '/' + g[i].t; e.querySelector('label').textContent = g[i].n; e.querySelector('i').style.width = (g[i].t ? g[i].c / g[i].t * 100 : 0) + '%'; });
  $('ec-recent').hidden = !r.length;
  $('ec-sp').innerHTML = r.map(function(d, i){ return '<button class="ec-s" type="button" data-d="' + d + '" aria-label="' + esc(names[i]) + '">' + window.hdfDex.sprite(d) + '</button>'; }).join('');
  fitCard();
}
function fitCard(){
  var fill = $('emu-fill'), card = $('emu-card'); if ($('emu').hidden) return;
  var cs = getComputedStyle(fill), h = fill.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  var order = $('ec-recent').hidden ? ['compact'] : ['full', 'compact'], pick = 'off';
  for (var i = 0; i < order.length; i++){ card.dataset.size = order[i]; if (card.offsetHeight <= h){ pick = order[i]; break; } }
  card.dataset.size = pick;
}
$('ec-open').addEventListener('click', function(){ openDex(); });
$('ec-sp').addEventListener('click', function(e){ var b = e.target.closest('.ec-s'); if (!b) return; openDex(); window.hdfDex.show(+b.getAttribute('data-d')); });
function toast(html, ms){
  $('emu-toast-t').innerHTML = html; $('emu-toast').hidden = false;
  clearTimeout(st.toastTimer); st.toastTimer = setTimeout(function(){ $('emu-toast').hidden = true; }, ms || 4500);
}

/* ---------- storage on this device (IndexedDB), with the Pokédex account as a save backup ---------- */
function idb(){
  return new Promise(function(res, rej){
    try{
      var r = indexedDB.open('hdp', 1);
      r.onupgradeneeded = function(){ r.result.createObjectStore('kv'); };
      r.onsuccess = function(){ res(r.result); };
      r.onerror = function(){ rej(r.error); };
    }catch(e){ rej(e); }
  });
}
function kvGet(k){
  return idb().then(function(db){ return new Promise(function(res, rej){
    var q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = function(){ res(q.result); }; q.onerror = function(){ rej(q.error); };
  }); }).catch(function(e){ st.noStore = true; st.storeErr = (e && (e.name || e.message)) || 'unknown'; return undefined; });
}
function kvSet(k, v){
  return idb().then(function(db){ return new Promise(function(res, rej){
    var tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = function(){ res(true); }; tx.onerror = function(){ rej(tx.error); }; tx.onabort = function(){ rej(tx.error); };
  }); }).catch(function(e){ st.noStore = true; st.storeErr = (e && (e.name || e.message)) || 'unknown'; return false; });
}
function remoteCtx(){
  if (st.remote !== undefined) return st.remote;
  if (!window.claude || !window.claude.use) return (st.remote = Promise.resolve(null));
  st.remote = timeout(Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function(r){
    if (!r[0] || !r[1]) return null;
    return r[1].id().then(function(id){ return id ? {db:r[0], base:'data/users/' + id + '/'} : null; });
  }), 6000).then(function(v){ return v || null; });
  return st.remote;
}
function remoteRef(){ return remoteCtx().then(function(c){ return c ? c.db.doc(c.base + 'emerald-save') : null; }); }
/* counts visits in the account too, so a view that wipes its own storage on close can be told apart from one that just lost the ROM */
function remoteVisit(){
  return remoteCtx().then(function(c){
    if (!c) return;
    var ref = c.db.doc(c.base + 'visits');
    return timeout(ref.get().then(function(sn){
      var d = sn.exists ? sn.data() : null, n = d && typeof d.n === 'number' ? d.n : 0;
      st.remoteVisits = n; return ref.set({n:n + 1, t:Date.now()});
    }), 6000);
  }).catch(function(){}).then(function(){ if (!st.rom && !st.busy) splash('norom'); });
}
function remoteGet(){
  return remoteRef().then(function(ref){
    if (!ref) return null;
    return timeout(ref.get().then(function(s){ var d = s.exists ? s.data() : null; return d && typeof d.b === 'string' && typeof d.t === 'number' ? {b:fromB64(d.b), t:d.t, r:Array.isArray(d.r) ? d.r : []} : null; }), 6000).then(function(v){ return v || null; });
  }).catch(function(){ return null; });
}
function remoteSet(u8, t, recent){
  return remoteRef().then(function(ref){ if (!ref) return false; return ref.set({b:toB64(u8), t:t, r:recent || []}).then(function(){ return true; }); }).catch(function(){ return false; }).then(function(ok){ if (window.claude) st.backup = {ok:ok, t:t}; return ok; });
}
function pickSave(){
  return Promise.all([kvGet('sav'), remoteGet()]).then(function(r){
    var a = r[0] && r[0].b && r[0].b.length >= SAVE_MIN ? r[0] : null, b = r[1] && r[1].b.length >= SAVE_MIN ? r[1] : null;
    if (b) b.remote = true;
    if (a && b) return b.t > a.t ? b : a;
    return a || b || null;
  });
}

/* ---------- the splash over the screen ---------- */
function splash(kind, msg){
  var h = $('sp-h'), p = $('sp-p'), go = $('sp-go'), alt = $('sp-alt');
  $('emu-splash').hidden = false; go.hidden = true; alt.hidden = true; p.className = ''; p.textContent = msg || '';
  go.onclick = null;
  if (kind === 'norom'){
    h.textContent = 'Load your game';
    var v = st.visits || {ls:0, idb:0}, kept = v.ls > 0 || v.idb > 0, picked = false; try{ picked = localStorage.getItem('hdp-picked') === '1'; }catch(e){}
    p.textContent = st.noStore ? 'This view cannot keep files on your phone, so you will need to choose the ROM each time. Opening the link in Safari usually fixes that.'
      : kept && picked ? 'The ROM was not kept from last time, although this view remembers other things. The file is probably too big for it to hold. Choose it again, and tell Claude if this keeps happening.'
      : !kept && (st.remoteVisits || 0) > 0 ? 'This view clears everything it stored each time it closes, so it cannot keep the ROM. Opening the link in Safari should fix that.'
      : 'Choose your Pokémon Emerald ROM file (.gba). It stays on this device and is never uploaded.';
    go.textContent = 'Choose ROM'; go.hidden = false; go.onclick = function(){ $('emu-rom').click(); };
  } else if (kind === 'loading'){
    h.textContent = msg || 'Starting…'; p.textContent = '';
  } else if (kind === 'ready'){
    h.textContent = st.rom && st.rom.title ? st.rom.title : 'Ready';
    p.textContent = msg || '';
    go.textContent = 'Play'; go.hidden = false; go.onclick = playTap; alt.hidden = false;
  } else if (kind === 'paused'){
    h.textContent = 'Paused'; go.textContent = 'Resume'; go.hidden = false; go.onclick = playTap;
  } else if (kind === 'error'){
    h.textContent = 'Something went wrong'; p.className = 'err'; p.textContent = msg || '';
    go.textContent = st.rom ? 'Try again' : 'Choose ROM'; go.hidden = false; go.onclick = function(){ if (st.rom) boot(); else $('emu-rom').click(); };
    alt.hidden = !st.rom;
  }
}
$('sp-alt').addEventListener('click', function(){ $('emu-rom').click(); });
function hideSplash(){ $('emu-splash').hidden = true; }

/* ---------- the emulator engine (mGBA compiled to WebAssembly, single-threaded build) ---------- */
function loadEngine(){
  if (st.enginePromise) return st.enginePromise;
  st.enginePromise = import('./mgba.js').then(function(mod){ return mod.default({canvas:$('emu-canvas')}); }).then(function(M){
    return M.FSInit().then(function(){ try{ M.toggleInput(false); }catch(e){} st.M = M; return M; });
  });
  st.enginePromise.catch(function(){ st.enginePromise = null; });
  return st.enginePromise;
}

function romInfo(buf){
  var u = new Uint8Array(buf), t = '', code = '', i;
  for (i = 0; i < 4; i++) code += String.fromCharCode(u[0xAC + i]);
  for (i = 0; i < 12; i++){ var c = u[0xA0 + i]; if (!c) break; t += String.fromCharCode(c); }
  var emerald = /^BPE/.test(code);
  return {code:code, title: emerald ? 'Pokémon Emerald' : (t || 'Game Boy Advance'), track: emerald};
}

function startGame(){
  var M = st.M, P = M.filePaths(), sp = P.savePath + '/' + SAVNAME;
  return pickSave().then(function(save){
    try{ M.quitGame(); }catch(e){}
    st.running = false; st.started = false;
    return new Promise(function(res){ M.uploadRom(new File([st.rom.buf], ROMNAME), res); }).then(function(){
      try{ M.FS.unlink(sp); }catch(e){}
      if (save){ try{ M.FS.writeFile(sp, save.b); }catch(e){} }
      if (!M.loadGame(P.gamePath + '/' + ROMNAME)) throw new Error('The game would not start. Check that the file is a Game Boy Advance ROM.');
      M.pauseGame();
      M.addCoreCallbacks({saveDataUpdatedCallback: function(){ onSaveUpdated(); }}); /* a new function each time: the engine caches callbacks by identity and a reused one points at a freed slot */
      st.started = true;
      st.recent = save && save.r ? save.r.slice(0, 12) : [];
      if (save) dexFromSave(save.b);
      if (save && save.remote) toast('Restored your save from your account.', 4000);
    });
  });
}

function boot(){
  if (st.busy) return; st.busy = true;
  splash('loading', 'Starting emulator…');
  return loadEngine().then(function(){ splash('loading', 'Loading game…'); return startGame(); }).then(function(){
    st.busy = false; splash('ready', st.rom && st.rom.track ? 'Your Pokédex updates each time you save in the game.' : 'Pokédex tracking works with Pokémon Emerald only.');
  }).catch(function(e){
    st.busy = false; splash('error', 'Could not start: ' + (e && e.message ? e.message : e));
  });
}

/* ---------- audio, wake lock ---------- */
var SILENT = null;
function unlockAudio(){
  try{ var ac = st.M && st.M.SDL2 && st.M.SDL2.audioContext; if (ac && ac.state !== 'running' && ac.resume) ac.resume(); }catch(e){}
  try{ if (navigator.audioSession) navigator.audioSession.type = 'playback'; }catch(e){}
  try{
    if (!SILENT){
      var n = 4000, b = new Uint8Array(44 + n), dv = new DataView(b.buffer);
      b.set([82,73,70,70], 0); dv.setUint32(4, 36 + n, true); b.set([87,65,86,69,102,109,116,32], 8); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
      dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); b.set([100,97,116,97], 36); dv.setUint32(40, n, true);
      for (var i = 0; i < n; i++) b[44 + i] = 128;
      SILENT = new Audio('data:audio/wav;base64,' + toB64(b)); SILENT.loop = true; SILENT.setAttribute('playsinline', '');
    }
    var pr = SILENT.play(); if (pr && pr.catch) pr.catch(function(){});
  }catch(e){}
}
function wake(){
  try{
    if (navigator.wakeLock && !st.lock) navigator.wakeLock.request('screen').then(function(l){ st.lock = l; l.addEventListener('release', function(){ st.lock = null; }); }, function(){});
  }catch(e){}
}
function play(){
  if (!st.started || st.view !== 'game') return;
  unlockAudio();
  try{ st.M.resumeGame(); }catch(e){}
  applyVol();
  st.running = true; hideSplash(); wake();
}
function pause(){
  releaseAll();
  if (st.running){ try{ st.M.pauseGame(); }catch(e){} st.running = false; }
}
function playTap(){ play(); }

document.addEventListener('visibilitychange', function(){
  if (document.hidden){
    st.wasRunning = st.running; if (st.running) pause();
    flushSave();
  } else {
    wake();
    if (st.wasRunning && st.view === 'game' && st.started){ st.wasRunning = false; splash('paused', ''); }
  }
});
window.addEventListener('pagehide', flushSave);

/* ---------- saving: store the save, tick the Pokédex ---------- */
function onSaveUpdated(){ clearTimeout(st.saveTimer); st.saveTimer = setTimeout(captureSave, 1200); }
function flushSave(){ if (st.saveTimer){ clearTimeout(st.saveTimer); st.saveTimer = null; captureSave(); } }
function currentSave(){
  try{
    var raw = st.M && st.started ? st.M.getSave() : null;
    if (!raw || raw.length < SAVE_MIN) return null;
    var u = new Uint8Array(raw.length); u.set(raw); return u;
  }catch(e){ return null; }
}
function captureSave(){
  st.saveTimer = null;
  var u = currentSave(); if (!u) return;
  var t = Date.now();
  dexFromSave(u, true);
  kvSet('sav', {b:u, t:t, r:st.recent || []}); remoteSet(u, t, st.recent);
}
function dexFromSave(u8, announce){
  if (!st.rom || !st.rom.track || !window.hdfDex) return;
  var r; try{ r = window.hdfDex.parse(u8.slice(0, SAVE_MIN).buffer); }catch(e){ return; }
  if (!r || r.err) return;
  var fresh = window.hdfDex.apply(r.owned);
  if (announce && fresh.length) st.recent = fresh.slice().reverse().concat(st.recent || []).filter(function(d, i, a){ return a.indexOf(d) === i; }).slice(0, 12);
  updateLens();
  if (announce && fresh.length){
    var names = window.hdfDex.names(fresh);
    toast('<b>Pokédex updated.</b> ' + (fresh.length === 1 ? esc(names[0]) + ' is new.' : fresh.length + ' new: ' + esc(names.slice(0, 3).join(', ')) + (fresh.length > 3 ? ' and more' : '') + '.'));
  } else if (announce){ toast('Game saved. Nothing new for the Pokédex.', 2500); }
}

/* ---------- touch controls: any number of fingers, sliding between keys ---------- */
var KEYS = {};
Array.prototype.forEach.call(document.querySelectorAll('#emu [data-btn]'), function(el){ KEYS[el.getAttribute('data-btn')] = el; });
var ARMS = {};
Array.prototype.forEach.call(document.querySelectorAll('#emu-dpad .arm'), function(el){ ARMS[el.getAttribute('data-d')] = el; });
var ctl = $('emu-ctl'), pad = $('emu-dpad');

function hit(x, y, out){
  var r = pad.getBoundingClientRect(), slop = 6;
  if (x >= r.left - slop && x <= r.right + slop && y >= r.top - slop && y <= r.bottom + slop){
    var dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2), dead = r.width * 0.13;
    if (dx > dead) out.Right = 1; else if (dx < -dead) out.Left = 1;
    if (dy > dead) out.Down = 1; else if (dy < -dead) out.Up = 1;
    return;
  }
  var el = document.elementFromPoint(x, y), k = el && el.closest ? el.closest('[data-btn]') : null;
  if (k) out[k.getAttribute('data-btn')] = 1;
}
function apply(){
  var want = {}, id;
  for (id in st.pointers) hit(st.pointers[id][0], st.pointers[id][1], want);
  var n;
  for (n in st.held) if (!want[n]){ delete st.held[n]; setKey(n, false); }
  for (n in want) if (!st.held[n]){ st.held[n] = 1; setKey(n, true); }
}
function setKey(n, on){
  if (KEYS[n]) KEYS[n].classList.toggle('on', on);
  if (ARMS[n]) ARMS[n].classList.toggle('on', on);
  if (st.running && st.M){ try{ on ? st.M.buttonPress(n) : st.M.buttonUnpress(n); }catch(e){} }
}
function releaseAll(){ st.pointers = {}; apply(); }
ctl.addEventListener('pointerdown', function(e){
  if (e.target.closest && e.target.closest('#emu-menu, #emu-mic')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  try{ ctl.setPointerCapture(e.pointerId); }catch(err){}
  st.pointers[e.pointerId] = [e.clientX, e.clientY]; apply(); e.preventDefault();
});
ctl.addEventListener('pointermove', function(e){ if (st.pointers[e.pointerId]){ st.pointers[e.pointerId] = [e.clientX, e.clientY]; apply(); e.preventDefault(); } });
function up(e){ if (st.pointers[e.pointerId]){ delete st.pointers[e.pointerId]; apply(); } }
ctl.addEventListener('pointerup', up); ctl.addEventListener('pointercancel', up); ctl.addEventListener('lostpointercapture', up);
document.addEventListener('contextmenu', function(e){ if ($('emu').contains(e.target)) e.preventDefault(); });
window.addEventListener('blur', releaseAll);

/* ---------- sound level (our own gain stage between the engine and the speaker) ---------- */
var VOLS = [1, 0.7, 0.4], VOLN = ['Full', 'Softer', 'Quiet'];
function volIdx(){ try{ var v = +localStorage.getItem('hdp-vol'); return v >= 0 && v < 3 ? v : 0; }catch(e){ return 0; } }
function applyVol(){
  try{
    var s2 = st.M && st.M.SDL2, n = s2 && s2.audio && s2.audio.scriptProcessorNode, ctx = s2 && s2.audioContext;
    if (!n || !ctx) return;
    if (st.vnode !== n){ var g = ctx.createGain(); n.disconnect(); n.connect(g); g.connect(ctx.destination); st.vnode = n; st.vgain = g; }
    st.vgain.gain.value = VOLS[volIdx()];
  }catch(e){}
}
function volLabel(){ $('mn-vol-t').textContent = 'Sound: ' + VOLN[volIdx()]; }
$('mn-vol').addEventListener('click', function(){ try{ localStorage.setItem('hdp-vol', String((volIdx() + 1) % 3)); }catch(e){} applyVol(); volLabel(); });

/* ---------- menu ---------- */
function openMenu(){
  volLabel();
  st.resumeAfterMenu = st.running; if (st.running) pause();
  var n = window.hdfDex ? window.hdfDex.count() : 0;
  $('mn-stat').textContent = (st.rom && st.rom.track ? n + ' of 386 caught in your Pokédex' : '') + (st.noStore ? (window.claude ? '. This view cannot keep files on your phone, so your save is backed up to your account only.' : '. This browser cannot keep files on your phone, so export your save often.') : '')
    + (st.backup ? '\n' + (st.backup.ok ? 'Save backed up to your account at ' + new Date(st.backup.t).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'}) + '.' : 'The account backup did not work. Export your save to be safe.') : '');
  $('mn-ask').hidden = true; $('mn-list').hidden = false;
  $('emu-scrim').hidden = false; $('emu-sheet').hidden = false;
}
function closeMenu(resume){
  $('emu-scrim').hidden = true; $('emu-sheet').hidden = true;
  if (resume !== false && st.resumeAfterMenu) play();
  st.resumeAfterMenu = false;
}
function ask(msg, label, fn){
  var box = $('mn-ask');
  box.className = 'emu-ask'; box.innerHTML = '<p>' + msg + '</p><div class="acts"><button type="button" data-x="1">Cancel</button><button type="button" class="go" data-go="1">' + esc(label) + '</button></div>';
  box.hidden = false; $('mn-list').hidden = true;
  box.onclick = function(e){
    if (e.target.closest('[data-go]')){ box.hidden = true; $('mn-list').hidden = false; fn(); }
    else if (e.target.closest('[data-x]')){ box.hidden = true; $('mn-list').hidden = false; }
  };
}
$('emu-menu').addEventListener('click', openMenu);
$('emu-scrim').addEventListener('click', function(){ closeMenu(); });
$('mn-close').addEventListener('click', function(){ closeMenu(); });
$('mn-dex').addEventListener('click', function(){ closeMenu(false); st.resumeAfterMenu = false; openDex(); });
$('mn-rst').addEventListener('click', function(){
  ask('Restart the game? Anything you have not saved in the game is lost.', 'Restart', function(){ closeMenu(false); st.resumeAfterMenu = false; flushSave(); boot(); });
});
$('mn-rom').addEventListener('click', function(){ closeMenu(false); st.resumeAfterMenu = false; $('emu-rom').click(); });
$('mn-imp').addEventListener('click', function(){ $('emu-sav').click(); });
$('mn-exp').addEventListener('click', function(){ exportSave(); });

/* ---------- choosing a ROM ---------- */
$('emu-rom').addEventListener('change', function(){
  var f = this.files && this.files[0]; this.value = ''; if (!f) return;
  var rd = new FileReader();
  rd.onerror = function(){ splash('error', 'The file could not be read. Try choosing it again.'); };
  rd.onload = function(){
    var buf = rd.result, u = new Uint8Array(buf);
    if (u.length > 2 && u[0] === 0x50 && u[1] === 0x4B){ splash(st.rom ? 'ready' : 'norom', ''); toast('That is a zip file. Unzip it first, then choose the .gba file.', 6000); return; }
    if (u.length < 0x100000 || u.length > 0x2000000){ splash(st.rom ? 'ready' : 'norom', ''); toast('That does not look like a Game Boy Advance ROM.', 5000); return; }
    var info = romInfo(buf);
    st.rom = {buf:buf, code:info.code, title:info.title, track:info.track};
    try{ localStorage.setItem('hdp-picked', '1'); }catch(e){}
    kvSet('rom', {buf:buf, code:info.code}).then(function(ok){
      if (!ok) toast('This view could not keep the ROM on your phone (' + esc(st.storeErr || 'storage blocked') + '). You will need to choose it again next time. Try opening the link in Safari.', 9000);
    });
    boot();
  };
  splash('loading', 'Reading ROM…'); rd.readAsArrayBuffer(f);
});

/* ---------- importing and exporting the save ---------- */
$('emu-sav').addEventListener('change', function(){
  var f = this.files && this.files[0]; this.value = ''; if (!f) return;
  var rd = new FileReader();
  rd.onload = function(){
    var u = new Uint8Array(rd.result);
    if (u.length < SAVE_MIN || u.length > 262144){ toast('That does not look like a Game Boy Advance save file.', 5000); return; }
    var r = window.hdfDex ? window.hdfDex.parse(u.slice(0, SAVE_MIN).buffer) : {};
    if (r.err){ toast(esc(r.err), 5000); return; }
    var who = (r.name ? esc(r.name) + ' · ' : '') + r.owned.length + ' in the Pokédex';
    ask('Replace your current save with <b>' + who + '</b>? Your current save is overwritten.', 'Replace', function(){
      closeMenu(false); st.resumeAfterMenu = false;
      st.recent = []; kvSet('sav', {b:u, t:Date.now(), r:[]}).then(function(){ remoteSet(u, Date.now(), []); return boot(); });
    });
  };
  rd.readAsArrayBuffer(f);
});

var CRC = null;
function crc32(u8){
  if (!CRC){ CRC = new Uint32Array(256); for (var n = 0; n < 256; n++){ var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } }
  var x = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) x = CRC[(x ^ u8[i]) & 0xFF] ^ (x >>> 8); return (x ^ 0xFFFFFFFF) >>> 0;
}
function zipOne(name, data){
  var nb = []; for (var i = 0; i < name.length; i++) nb.push(name.charCodeAt(i));
  var crc = crc32(data), L = 30 + nb.length, C = 46 + nb.length, out = new Uint8Array(L + data.length + C + 22), dv = new DataView(out.buffer), o = 0;
  dv.setUint32(o, 0x04034b50, true); dv.setUint16(o + 4, 20, true); dv.setUint16(o + 8, 0, true); dv.setUint16(o + 10, 0, true); dv.setUint16(o + 12, 0x21, true);
  dv.setUint32(o + 14, crc, true); dv.setUint32(o + 18, data.length, true); dv.setUint32(o + 22, data.length, true); dv.setUint16(o + 26, nb.length, true);
  out.set(nb, o + 30); out.set(data, L);
  o = L + data.length;
  dv.setUint32(o, 0x02014b50, true); dv.setUint16(o + 4, 20, true); dv.setUint16(o + 6, 20, true); dv.setUint16(o + 14, 0x21, true);
  dv.setUint32(o + 16, crc, true); dv.setUint32(o + 20, data.length, true); dv.setUint32(o + 24, data.length, true); dv.setUint16(o + 28, nb.length, true); out.set(nb, o + 46);
  var e = o + C;
  dv.setUint32(e, 0x06054b50, true); dv.setUint16(e + 8, 1, true); dv.setUint16(e + 10, 1, true); dv.setUint32(e + 12, C, true); dv.setUint32(e + 16, L + data.length, true);
  return out;
}
function exportSave(){
  Promise.resolve(currentSave() || kvGet('sav').then(function(r){ return r && r.b; })).then(function(u){
    if (!u || u.length < SAVE_MIN){ toast('There is no save to export yet. Save in the game first.', 5000); return; }
    var sav = u.slice(0, SAVE_MIN);
    if (!(window.claude && window.claude.use)) return exportPlain(sav);
    var zip = zipOne('pokemon.sav', sav);
    return window.claude.use('downloads').then(function(dl){
      if (!dl){ toast('Saving files is not available in this view.', 5000); return; }
      return dl.save({filename:'pokemon-save.zip', data:new Blob([zip], {type:'application/zip'})}).then(function(){
        toast('Saved. Unzip it in Files to get the .sav file.', 6000);
      }, function(e){ if (!e || e.code !== 'declined') toast('The save could not be exported.', 4000); });
    });
  });
}
/* on its own page the .sav goes out directly: the share sheet (Save to Files) first, a plain download otherwise */
function exportPlain(sav){
  var file = null, blob = new Blob([sav], {type:'application/octet-stream'});
  try{ file = new File([blob], 'pokemon.sav', {type:'application/octet-stream'}); }catch(e){}
  function download(){
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pokemon.sav';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    toast('Saved pokemon.sav to your downloads.', 5000);
  }
  try{
    if (file && navigator.canShare && navigator.canShare({files:[file]})){
      return navigator.share({files:[file], title:'Pokémon save'}).then(function(){ toast('Saved.', 3000); }, function(e){ if (e && e.name !== 'AbortError') download(); });
    }
  }catch(e){}
  download();
}

/* ---------- moving between the game and the Pokédex ---------- */
var dexScroll = 0;
function openDex(){
  if (st.view === 'dex') return;
  st.view = 'dex'; st.wasRunning = false; pause();
  $('emu').hidden = true; root.classList.remove('emu-on'); $('dexroot').hidden = false;
  window.dispatchEvent(new Event('resize')); window.scrollTo(0, dexScroll);
}
function openGame(){
  if (st.view === 'game') return;
  dexScroll = window.scrollY; st.view = 'game';
  $('dexroot').hidden = true; $('emu').hidden = false; root.classList.add('emu-on'); window.scrollTo(0, 0); fitScreen(); updateLens(); fitCard();
  if (st.started) { play(); }
}
document.querySelector('.tabs').addEventListener('click', function(e){
  var b = e.target.closest('[data-tab="game"]'); if (!b) return;
  e.stopPropagation(); openGame();
}, true);

/* ---------- crisp scaling: size the screen to whole game pixels when that costs almost no width ---------- */
function fitScreen(){
  var box = $('emu-body'), el = document.querySelector('.emu-screen'); if ($('emu').hidden) return;
  var cs = getComputedStyle(box), avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  avail = Math.min(avail, window.innerHeight * 0.54 * 1.5);
  var dpr = window.devicePixelRatio || 1, phys = avail * dpr, n = Math.round(phys / 240);
  if (n >= 1 && Math.abs(n * 240 - phys) / phys <= 0.04){ el.style.width = (n * 240 / dpr) + 'px'; el.style.maxWidth = 'none'; }
  else { el.style.width = ''; el.style.maxWidth = ''; }
}
window.addEventListener('resize', function(){ fitScreen(); fitCard(); }); window.addEventListener('orientationchange', fitScreen);

/* ---------- start ---------- */
try{ if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); }catch(e){}
$('dexroot').hidden = true; root.classList.add('emu-on');
fitScreen(); updateLens();
splash('loading', 'Starting…');
var lsN = 0; try{ lsN = +localStorage.getItem('hdp-visits') || 0; localStorage.setItem('hdp-visits', String(lsN + 1)); }catch(e){ lsN = 0; }
Promise.all([kvGet('rom'), kvGet('visits')]).then(function(r){
  var rec = r[0], idbN = typeof r[1] === 'number' ? r[1] : 0;
  st.visits = {ls:lsN, idb:idbN}; kvSet('visits', idbN + 1); remoteVisit();
  if (rec && rec.buf && rec.buf.byteLength >= 0x100000){
    var info = romInfo(rec.buf); st.rom = {buf:rec.buf, code:info.code, title:info.title, track:info.track};
    boot();
  } else splash('norom');
});
window.hdp = st;
window.hdpApi = {st: st, setKey: setKey, toast: toast};
})();
