(function(){
'use strict';
var A = window.hdpApi; if (!A) return;
var $ = function(id){ return document.getElementById(id); };
var btn = $('emu-mic');

/* ---------- tuning ---------- */
var TAP_MS = 90, GAP_MS = 90, TILE_MS = 267, TRIM_MS = 50, MENU_WAIT_MS = 650;
var EW = 0x21000, IW = 0x19000;                 // where the game's two RAM blocks sit inside an engine snapshot
var BATTLE_MONS = 0x24084, MON_SIZE = 0x58;     // gBattleMons (Emerald US), offset inside EWRAM
var IN_BATTLE = 0x22C0 + 0x439;                 // gMain.inBattle, offset inside IWRAM (bit 1)

/* ---------- names ---------- */
var MOVES = ('-|Pound|Karate Chop|Double Slap|Comet Punch|Mega Punch|Pay Day|Fire Punch|Ice Punch|Thunder Punch|Scratch|Vice Grip|Guillotine|Razor Wind|Swords Dance|Cut|Gust|Wing Attack|Whirlwind|Fly|Bind|Slam|Vine Whip|Stomp|Double Kick|Mega Kick|Jump Kick|Rolling Kick|Sand Attack|Headbutt|Horn Attack|Fury Attack|Horn Drill|Tackle|Body Slam|Wrap|Take Down|Thrash|Double-Edge|Tail Whip|Poison Sting|Twineedle|Pin Missile|Leer|Bite|Growl|Roar|Sing|Supersonic|Sonic Boom|Disable|Acid|Ember|Flamethrower|Mist|Water Gun|Hydro Pump|Surf|Ice Beam|Blizzard|Psybeam|Bubble Beam|Aurora Beam|Hyper Beam|Peck|Drill Peck|Submission|Low Kick|Counter|Seismic Toss|Strength|Absorb|Mega Drain|Leech Seed|Growth|Razor Leaf|Solar Beam|Poison Powder|Stun Spore|Sleep Powder|Petal Dance|String Shot|Dragon Rage|Fire Spin|Thunder Shock|Thunderbolt|Thunder Wave|Thunder|Rock Throw|Earthquake|Fissure|Dig|Toxic|Confusion|Psychic|Hypnosis|Meditate|Agility|Quick Attack|Rage|Teleport|Night Shade|Mimic|Screech|Double Team|Recover|Harden|Minimize|Smokescreen|Confuse Ray|Withdraw|Defense Curl|Barrier|Light Screen|Haze|Reflect|Focus Energy|Bide|Metronome|Mirror Move|Self-Destruct|Egg Bomb|Lick|Smog|Sludge|Bone Club|Fire Blast|Waterfall|Clamp|Swift|Skull Bash|Spike Cannon|Constrict|Amnesia|Kinesis|Soft-Boiled|High Jump Kick|Glare|Dream Eater|Poison Gas|Barrage|Leech Life|Lovely Kiss|Sky Attack|Transform|Bubble|Dizzy Punch|Spore|Flash|Psywave|Splash|Acid Armor|Crabhammer|Explosion|Fury Swipes|Bonemerang|Rest|Rock Slide|Hyper Fang|Sharpen|Conversion|Tri Attack|Super Fang|Slash|Substitute|Struggle|Sketch|Triple Kick|Thief|Spider Web|Mind Reader|Nightmare|Flame Wheel|Snore|Curse|Flail|Conversion 2|Aeroblast|Cotton Spore|Reversal|Spite|Powder Snow|Protect|Mach Punch|Scary Face|Faint Attack|Sweet Kiss|Belly Drum|Sludge Bomb|Mud-Slap|Octazooka|Spikes|Zap Cannon|Foresight|Destiny Bond|Perish Song|Icy Wind|Detect|Bone Rush|Lock-On|Outrage|Sandstorm|Giga Drain|Endure|Charm|Rollout|False Swipe|Swagger|Milk Drink|Spark|Fury Cutter|Steel Wing|Mean Look|Attract|Sleep Talk|Heal Bell|Return|Present|Frustration|Safeguard|Pain Split|Sacred Fire|Magnitude|Dynamic Punch|Megahorn|Dragon Breath|Baton Pass|Encore|Pursuit|Rapid Spin|Sweet Scent|Iron Tail|Metal Claw|Vital Throw|Morning Sun|Synthesis|Moonlight|Hidden Power|Cross Chop|Twister|Rain Dance|Sunny Day|Crunch|Mirror Coat|Psych Up|Extreme Speed|Ancient Power|Shadow Ball|Future Sight|Rock Smash|Whirlpool|Beat Up|Fake Out|Uproar|Stockpile|Spit Up|Swallow|Heat Wave|Hail|Torment|Flatter|Will-O-Wisp|Memento|Facade|Focus Punch|Smelling Salts|Follow Me|Nature Power|Charge|Taunt|Helping Hand|Trick|Role Play|Wish|Assist|Ingrain|Superpower|Magic Coat|Recycle|Revenge|Brick Break|Yawn|Knock Off|Endeavor|Eruption|Skill Swap|Imprison|Refresh|Grudge|Snatch|Secret Power|Dive|Arm Thrust|Camouflage|Tail Glow|Luster Purge|Mist Ball|Feather Dance|Teeter Dance|Blaze Kick|Mud Sport|Ice Ball|Needle Arm|Slack Off|Hyper Voice|Poison Fang|Crush Claw|Blast Burn|Hydro Cannon|Meteor Mash|Astonish|Weather Ball|Aromatherapy|Fake Tears|Air Cutter|Overheat|Odor Sleuth|Rock Tomb|Silver Wind|Metal Sound|Grass Whistle|Tickle|Cosmic Power|Water Spout|Signal Beam|Shadow Punch|Extrasensory|Sky Uppercut|Sand Tomb|Sheer Cold|Muddy Water|Bullet Seed|Aerial Ace|Icicle Spear|Iron Defense|Block|Howl|Dragon Claw|Frenzy Plant|Bulk Up|Bounce|Mud Shot|Poison Tail|Covet|Volt Tackle|Magical Leaf|Water Sport|Calm Mind|Leaf Blade|Dragon Dance|Rock Blast|Shock Wave|Water Pulse|Doom Desire|Psycho Boost').split('|');
var HOENN = ('Treecko,Grovyle,Sceptile,Torchic,Combusken,Blaziken,Mudkip,Marshtomp,Swampert,Poochyena,Mightyena,Zigzagoon,Linoone,Wurmple,Silcoon,Beautifly,Cascoon,Dustox,Lotad,Lombre,Ludicolo,Seedot,Nuzleaf,Shiftry,Nincada,Ninjask,Shedinja,Taillow,Swellow,Shroomish,Breloom,Spinda,Wingull,Pelipper,Surskit,Masquerain,Wailmer,Wailord,Skitty,Delcatty,Kecleon,Baltoy,Claydol,Nosepass,Torkoal,Sableye,Barboach,Whiscash,Luvdisc,Corphish,Crawdaunt,Feebas,Milotic,Carvanha,Sharpedo,Trapinch,Vibrava,Flygon,Makuhita,Hariyama,Electrike,Manectric,Numel,Camerupt,Spheal,Sealeo,Walrein,Cacnea,Cacturne,Snorunt,Glalie,Lunatone,Solrock,Azurill,Spoink,Grumpig,Plusle,Minun,Mawile,Meditite,Medicham,Swablu,Altaria,Wynaut,Duskull,Dusclops,Roselia,Slakoth,Vigoroth,Slaking,Gulpin,Swalot,Tropius,Whismur,Loudred,Exploud,Clamperl,Huntail,Gorebyss,Absol,Shuppet,Banette,Seviper,Zangoose,Relicanth,Aron,Lairon,Aggron,Castform,Volbeat,Illumise,Lileep,Cradily,Anorith,Armaldo,Ralts,Kirlia,Gardevoir,Bagon,Shelgon,Salamence,Beldum,Metang,Metagross,Regirock,Regice,Registeel,Kyogre,Groudon,Rayquaza,Latias,Latios,Jirachi,Deoxys,Chimecho').split(',');
function nz(s){ return String(s).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function speciesName(id){
  if (id >= 1 && id <= 251 && window.hdfDex) return window.hdfDex.names([id])[0];
  if (id >= 277 && id <= 411) return HOENN[id - 277];
  return null;
}
var allSpecies = null;
function speciesList(){
  if (allSpecies) return allSpecies;
  allSpecies = [];
  for (var i = 1; i <= 251; i++){ var n = speciesName(i); if (n) allSpecies.push(n); }
  return allSpecies.concat(HOENN);
}
function lev(a, b){
  var m = a.length, n = b.length, i, j, d = [], t;
  if (!m) return n; if (!n) return m;
  for (j = 0; j <= n; j++) d[j] = j;
  for (i = 1; i <= m; i++){ var prev = d[0]; d[0] = i;
    for (j = 1; j <= n; j++){ t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; } }
  return d[n];
}
function tol(len, loose){ return len >= 9 ? (loose ? 3 : 2) : len >= 5 ? (loose ? 2 : 1) : len >= 4 && loose ? 1 : 0; }

/* ---------- reading the game's memory (via an engine snapshot) ---------- */
function snapshot(){
  var M = A.st.M;
  if (!M || !A.st.running) return Promise.reject(new Error('not running'));
  if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('no DecompressionStream'));
  var dir = '/data/states', name = 'pokemon.ss9', path = dir + '/' + name;
  if (!M.saveState(9)) return Promise.reject(new Error('snapshot failed'));
  var d;
  try{ d = M.FS.readFile(path); }catch(e){ return Promise.reject(e); }
  try{ M.FS.unlink(path); }catch(e){}
  var dv = new DataView(d.buffer, d.byteOffset, d.byteLength), o = 8, data = null;
  while (o + 12 <= d.length){
    var len = dv.getUint32(o), type = String.fromCharCode(d[o + 4], d[o + 5], d[o + 6], d[o + 7]);
    if (type === 'gbAs'){ data = d.slice(o + 8, o + 8 + len); break; }
    o += 12 + len;
  }
  if (!data) return Promise.reject(new Error('no state data'));
  var ds = new DecompressionStream('deflate'), w = ds.writable.getWriter(); w.write(data); w.close();
  return new Response(ds.readable).arrayBuffer().then(function(b){
    var u = new Uint8Array(b);
    return {ew: u.subarray(EW, EW + 0x40000), iw: u.subarray(IW, IW + 0x8000)};
  });
}
function readMem(){ return window.hdpVoice && window.hdpVoice.__mem ? Promise.resolve(window.hdpVoice.__mem()) : snapshot(); }
function u16(u, o){ return u[o] | (u[o + 1] << 8); }
function gbaText(u, o, max){
  var s = '';
  for (var i = 0; i < max; i++){ var c = u[o + i];
    if (c === 0xFF) break;
    if (c >= 0xBB && c <= 0xD4) s += String.fromCharCode(65 + c - 0xBB);
    else if (c >= 0xD5 && c <= 0xEE) s += String.fromCharCode(97 + c - 0xD5);
    else if (c >= 0xA1 && c <= 0xAA) s += String.fromCharCode(48 + c - 0xA1);
    else if (c === 0x00) s += ' '; else if (c === 0xAE) s += '-'; else if (c === 0xAD) s += '.'; }
  return s.trim();
}
function parseBattle(m){
  var ew = m.ew, iw = m.iw, b = BATTLE_MONS, i;
  var r = {species: u16(ew, b), moves: [], pp: [], hp: u16(ew, b + 0x28), nick: gbaText(ew, b + 0x30, 10), inBattle: !!(iw[IN_BATTLE] & 2), plausible: true};
  for (i = 0; i < 4; i++){ r.moves.push(u16(ew, b + 0x0C + i * 2)); r.pp.push(ew[b + 0x24 + i]); }
  if (!(r.species >= 1 && r.species <= 411) || r.moves.some(function(x){ return x > 354; }) || !r.moves[0] || r.pp.some(function(x){ return x > 64; })) r.plausible = false;
  r.name = speciesName(r.species);
  return r;
}

/* ---------- phrases ---------- */
var NUM = {one:1, won:1, once:1, two:2, to:2, too:2, twice:2, three:3, tree:3, thrice:3, four:4, for:4, five:5, six:6, seven:7, eight:8, ate:8, nine:9, ten:10};
var CNT = '(?: (\\d+|one|won|once|two|to|too|twice|three|tree|thrice|four|for|five|six|seven|eight|ate|nine|ten))?(?: (?:times?|steps?|tiles?|spaces?))?';
var DIR = '(up|app|down|dawn|left|lift|right|write|rite|alright)';
var DIRS = {up:'Up', app:'Up', down:'Down', dawn:'Down', left:'Left', lift:'Left', right:'Right', write:'Right', rite:'Right', alright:'Right'};
var BTNS = {a:'A', ay:'A', eh:'A', ah:'A', hey:'A', okay:'A', ok:'A', confirm:'A', yes:'A', accept:'A', b:'B', be:'B', bee:'B', back:'B', cancel:'B', no:'B', start:'Start', select:'Select', l:'L', r:'R'};
function num(w){ return w === undefined ? null : (/^\d+$/.test(w) ? Math.min(+w, 20) : NUM[w]); }
function norm(raw){ return String(raw || '').toLowerCase().replace(/[’'`]/g, '').replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function parseOne(raw){
  var s = norm(raw), m;
  if (!s) return null;
  if (/^(stop|halt|freeze|release|wait|cancel that)$/.test(s)) return {t:'stop', label:'stop'};
  if (/^(again|repeat|repeat that|do that again)$/.test(s)) return {t:'again', label:'again'};
  if ((m = s.match(new RegExp('^(?:hold|keep going|keep walking|keep moving|keep) ' + DIR + '$')))) return {t:'hold', d:DIRS[m[1]], label:'hold ' + DIRS[m[1]].toLowerCase()};
  if ((m = s.match(new RegExp('^(?:(?:walk|go|move|step|head|run) )?' + DIR + CNT + '$')))){
    var n = num(m[2]); if (m[2] !== undefined && !n) return null;
    return n ? {t:'walk', d:DIRS[m[1]], n:n, label:DIRS[m[1]].toLowerCase() + ' ' + n} : {t:'tap', k:DIRS[m[1]], label:DIRS[m[1]].toLowerCase()};
  }
  if (/^(open (the )?menu|start menu|pause menu)$/.test(s)) return {t:'tap', k:'Start', label:'start'};
  if ((m = s.match(new RegExp('^(?:press |hit |tap |push )?(a|ay|eh|ah|hey|b|be|bee|start|select|l|r|okay|ok|confirm|yes|accept|back|cancel|no)(?: button)?' + CNT + '$')))){
    var c = num(m[2]); if (m[2] !== undefined && !c) return null;
    return {t:'tap', k:BTNS[m[1]], n:c || 1, label:BTNS[m[1]] + (c > 1 ? ' x' + c : '')};
  }
  if (/^(fight|attack)$/.test(s)) return {t:'menu', which:'fight', label:'fight'};
  if (/^(bag|items?)$/.test(s)) return {t:'menu', which:'bag', label:'bag'};
  if (/^(pokemon|switch|party)$/.test(s)) return {t:'menu', which:'pokemon', label:'Pokémon'};
  if (/^(run|run away|flee|escape)$/.test(s)) return {t:'menu', which:'run', label:'run'};
  if (/^(check battle|what moves( do i have)?|show moves|list moves|moves|check moves)$/.test(s)) return {t:'moves', label:'moves'};
  if ((m = s.match(/^(?:use )?(?:move|slot) (\d+|one|won|two|to|too|three|tree|four|for)$/)) || (m = s.match(/^use (first|second|third|fourth) move$/))){
    var sl = {first:1, second:2, third:3, fourth:4}[m[1]] || num(m[1]);
    if (sl >= 1 && sl <= 4) return {t:'move', slot:sl - 1, label:'move ' + sl};
  }
  if ((m = s.match(/^(?:(.+?) )?(?:use|uses|cast|do) (.+?)(?: on .*)?$/)) && m[2] && (!m[1] || m[1].split(' ').length <= 3))
    return {t:'move', who:m[1] || null, moveName:m[2], label:'use ' + m[2]};
  return null;
}

/* several short commands in one breath: "down down down", "up up right a" */
function parseSeq(raw){
  var w = norm(raw).replace(/\b(then|and|next)\b/g, ' ').replace(/\s+/g, ' ').trim().split(' '), steps = [], i = 0, len, a;
  if (w.length < 2 || w.length > 40) return null;
  while (i < w.length){
    a = null;
    for (len = Math.min(4, w.length - i); len >= 1 && !a; len--){
      var r = parseOne(w.slice(i, i + len).join(' '));
      if (r && (r.t === 'tap' || r.t === 'walk')){ a = r; i += len; break; } else a = null;
    }
    if (!a) return null;
    steps.push(a);
  }
  if (steps.length < 2 || steps.length > 14) return null;
  return {t:'seq', steps:steps, label:steps.map(function(s){ return s.label; }).join(', ')};
}
function parse(raw){ return parseOne(raw) || parseSeq(raw); }

/* ---------- pressing buttons ---------- */
var ABORT = {abort:true}, gen = 0, held = {}, holdKey = null, q = Promise.resolve(), last = null;
function key(k, on){ A.setKey(k, on); if (on) held[k] = 1; else delete held[k]; }
function releaseHeld(){ for (var k in held) A.setKey(k, false); held = {}; holdKey = null; }
function cancelAll(){ gen++; releaseHeld(); }
function sleep(ms, g){ return new Promise(function(r){ setTimeout(r, ms); }).then(function(){ if (g !== gen) throw ABORT; }); }
function tap(k, g, hold){
  key(k, true);
  return sleep(hold || TAP_MS, g).then(function(){ key(k, false); return sleep(GAP_MS, g); }, function(e){ key(k, false); throw e; });
}
function taps(list, g){ var p = Promise.resolve(); list.forEach(function(k){ p = p.then(function(){ return tap(k, g); }); }); return p; }
function say(html, bad, ms){ A.toast(bad ? '<span style="color:var(--emu-warn)">' + html + '</span>' : html, ms || (bad ? 5500 : 2600)); }
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

function battle(){
  if (!A.st.rom || A.st.rom.code !== 'BPEE'){ say('Battle commands work with Pokémon Emerald (US) only.', true); return Promise.resolve(null); }
  return readMem().then(function(m){
    var b = parseBattle(m);
    if (!b.plausible){ say('I could not read the battle data. Say “check battle” during a fight and tell Claude what it shows.', true, 7000); return null; }
    if (!b.inBattle){ say('You do not seem to be in a battle.', true); return null; }
    return b;
  }, function(){ say('I could not read the game just now.', true); return null; });
}
var MENU_KEYS = {fight:[], bag:['Right'], pokemon:['Down'], run:['Right', 'Down']};
function resetCursor(g){ return taps(['Up', 'Left'], g); }
function describe(b){
  var parts = [];
  b.moves.forEach(function(id, i){ if (id) parts.push(esc(MOVES[id] || '?') + ' ' + b.pp[i]); });
  return '<b>' + esc(b.nick || b.name || 'Pokémon') + '</b>: ' + parts.join(', ');
}

function doMenu(a, g){
  return battle().then(function(b){
    if (!b) return;
    say('<b>' + esc(a.label) + '</b>', false, 1200);
    return resetCursor(g).then(function(){ return taps(MENU_KEYS[a.which].concat(['A']), g); });
  });
}
function doMoves(g){
  return readMem().then(function(m){
    var b = parseBattle(m);
    if (!b.plausible){ say('No battle data found. Raw: species ' + b.species + ', moves ' + b.moves.join('/') + ', in-battle flag ' + (b.inBattle ? 1 : 0), true, 8000); return; }
    say(describe(b) + (b.inBattle ? '' : ' <i>(not in a battle)</i>') + '<br><small>species ' + b.species + ', in-battle flag ' + (b.inBattle ? 1 : 0) + '</small>', false, 8000);
  }, function(){ say('I could not read the game just now.', true); });
}
function matchMove(spoken, b){
  var sp = nz(spoken), best = null, bd = 99, tie = false, i, d;
  for (i = 0; i < 4; i++){ var id = b.moves[i]; if (!id) continue; var nm = nz(MOVES[id]); d = nm === sp ? 0 : lev(sp, nm);
    if (d <= tol(nm.length, true) && d < bd){ best = i; bd = d; tie = false; } else if (d === bd && best !== null) tie = true; }
  if (best !== null && !tie) return {slot:best};
  for (i = 1; i < MOVES.length; i++){ var n2 = nz(MOVES[i]); if (n2 === sp || (sp.length >= 5 && lev(sp, n2) <= tol(n2.length, false))) return {other:MOVES[i]}; }
  return {unknown:true};
}
function doMove(a, g){
  return battle().then(function(b){
    if (!b) return;
    var mine = b.nick || b.name || 'Your Pokémon';
    if (a.who){
      var w = nz(a.who), ok = (b.name && nz(b.name) === w) || (b.nick && nz(b.nick) === w);
      if (!ok){
        var other = speciesList().filter(function(n){ return nz(n) === w || lev(w, nz(n)) <= (w.length >= 6 ? 1 : 0); })[0];
        if (other && nz(other) !== nz(b.name || '')){ say(esc(other) + ' is not the one up front. It is ' + esc(mine) + '.', true); return; }
      }
    }
    var slot;
    if (a.slot !== undefined){
      slot = a.slot;
      if (!b.moves[slot]){ say(esc(mine) + ' has no move in slot ' + (slot + 1) + '.', true); return; }
    } else {
      var r = matchMove(a.moveName, b);
      if (r.slot === undefined){
        say(r.other ? esc(mine) + ' does not know <b>' + esc(r.other) + '</b>.<br><small>' + describe(b) + '</small>' : 'I do not know a move called “' + esc(a.moveName) + '”.<br><small>' + describe(b) + '</small>', true, 7000);
        return;
      }
      slot = r.slot;
    }
    if (b.pp[slot] === 0){ say('<b>' + esc(MOVES[b.moves[slot]]) + '</b> has no PP left.<br><small>' + describe(b) + '</small>', true, 6000); return; }
    say('<b>' + esc(MOVES[b.moves[slot]]) + '</b>', false, 1800);
    var nav = [slot % 2 ? 'Right' : null, slot > 1 ? 'Down' : null].filter(Boolean);
    return resetCursor(g).then(function(){ return taps(['A'], g); }).then(function(){ return sleep(MENU_WAIT_MS, g); })
      .then(function(){ return resetCursor(g); }).then(function(){ return taps(nav.concat(['A']), g); });
  });
}

function exec(a, g){
  if (a.t === 'seq'){ var p = Promise.resolve(); a.steps.forEach(function(s){ p = p.then(function(){ return exec(s, g); }); }); return p; }
  switch (a.t){
    case 'tap': { var p = Promise.resolve(), n = a.n || 1; for (var i = 0; i < n; i++) p = p.then(function(){ return tap(a.k, g); }); return p; }
    case 'walk': key(a.d, true); return sleep(Math.max(120, a.n * TILE_MS - TRIM_MS), g).then(function(){ key(a.d, false); return sleep(120, g); }, function(e){ key(a.d, false); throw e; });
    case 'hold': key(a.d, true); holdKey = a.d; return Promise.resolve();
    case 'menu': return doMenu(a, g);
    case 'moves': return doMoves(g);
    case 'move': return doMove(a, g);
  }
  return Promise.resolve();
}
function run(a){
  if (a.t === 'stop'){ cancelAll(); q = Promise.resolve(); say('Stopped.', false, 1200); return; }
  if (a.t === 'again'){ if (!last){ say('Nothing to repeat yet.', true, 1800); return; } a = last; } else last = a;
  if (!A.st.running){ say('The game is paused.', true, 1800); return; }
  if (holdKey){ key(holdKey, false); holdKey = null; }
  var g = gen;
  q = q.then(function(){ if (g !== gen) return; return exec(a, g); }).catch(function(e){ if (e !== ABORT) console.error(e); });
}
function handle(text){
  var a = parse(text);
  if (!a){ if (/\b(use|uses|cast)\b/.test(norm(text))) say('Did not understand “' + esc(text) + '”.', true, 2500); return false; }
  run(a); return true;
}

/* ---------- microphone ---------- */
var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
var rec = null, on = false, handled = {}, timers = {}, fails = [];
function setUi(){ btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.setAttribute('aria-label', on ? 'Voice control on. Tap to turn off' : 'Voice control off. Tap to turn on'); }
function clearTimers(){ for (var k in timers) clearTimeout(timers[k]); timers = {}; }
function SIMPLE(a){ return a && (a.t === 'tap' && !a.n || a.t === 'tap' && a.n === 1); }
function start(){
  if (!on) return;
  var r = rec = new SR(); r.lang = 'en-US'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 3; handled = {}; clearTimers();
  r.onresult = function(e){
    for (var i = e.resultIndex; i < e.results.length; i++){
      (function(i){
        var res = e.results[i], text = res[0].transcript;
        if (handled[i]) return;
        clearTimeout(timers[i]);
        if (res.isFinal){
          var alt = null; for (var j = 0; j < res.length && !alt; j++) if (parse(res[j].transcript)) alt = res[j].transcript;
          handled[i] = 1; handle(alt || text);
        } else if (SIMPLE(parse(text))){
          timers[i] = setTimeout(function(){ if (!handled[i]){ handled[i] = 1; handle(text); } }, 450);
        }
      })(i);
    }
  };
  r.onerror = function(e){
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed'){ off(); explain(e.error); }
    else if (e.error === 'network'){ fails.push(Date.now()); }
  };
  r.onend = function(){
    clearTimers();
    if (!on || rec !== r) return;
    var now = Date.now(); fails = fails.filter(function(t){ return now - t < 8000; }); fails.push(now);
    if (fails.length > 6){ off(); say('Voice control keeps stopping on this device, so I turned it off.', true, 6000); return; }
    setTimeout(start, 250);
  };
  try{ r.start(); }catch(err){ setTimeout(start, 500); }
}
function explain(code){
  var gum = navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? navigator.mediaDevices.getUserMedia({audio:true}) : Promise.reject({name:'NoMediaDevices'});
  gum.then(function(s){ try{ s.getTracks().forEach(function(t){ t.stop(); }); }catch(e){}
    say(code === 'service-not-allowed'
      ? 'The microphone works, but iPhone speech recognition is off. Turn on Settings, General, Keyboard, Enable Dictation, then try again.'
      : 'The microphone works, but speech recognition was refused here.', true, 10000);
  }, function(err){
    say(window.claude
      ? 'This page is not allowed to use the microphone (' + esc(err && err.name || 'blocked') + '). The Claude page around it may not pass microphone access through.<br><small>speech code: ' + esc(code) + '</small>'
      : 'The microphone was refused (' + esc(err && err.name || 'blocked') + '). In Settings, Safari, Microphone, allow this site, then close and reopen the app.<br><small>speech code: ' + esc(code) + '</small>', true, 10000);
  });
}
function off(){
  on = false; setUi(); cancelAll(); clearTimers();
  var r = rec; rec = null; if (r){ r.onend = null; r.onresult = null; r.onerror = null; try{ r.abort(); }catch(e){} }
}
function toggle(){
  if (!SR){ say('Voice control is not available in this view. Try opening the page in Safari.', true, 6000); return; }
  if (on){ off(); say('Voice control off.', false, 1400); return; }
  on = true; fails = []; setUi(); start();
  say('Voice control on. Try <b>up two</b>, <b>fight</b>, <b>use Ember</b>.', false, 3500);
}
btn.addEventListener('click', toggle);
document.addEventListener('visibilitychange', function(){ if (document.hidden && on) off(); });
window.addEventListener('blur', function(){ releaseHeld(); });
if (!SR) btn.classList.add('bad');
setUi();

window.hdpVoice = {parse: parse, handle: handle, MOVES: MOVES, HOENN: HOENN, speciesName: speciesName, parseBattle: parseBattle, snapshot: snapshot, cancel: cancelAll, isOn: function(){ return on; }};
})();
