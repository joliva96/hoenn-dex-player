import re,os,shutil
S=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(S)
body=open(S+'/tracker_body.html',encoding='utf8').read()
st=body.index('<style>'); en=body.index('</style>')+8
tracker_css=body[st:en]
first=body.index('<script')
markup=body[en:first]
scripts=body[first:]
# split scripts
parts=re.findall(r'<script[^>]*>.*?</script>',scripts,re.S)
assert len(parts)==3,len(parts)
data_js,spr_js,main_js=parts
# patch main script: expose hooks before the IIFE closes
hook='''
/* ---------- hooks for the emulator: read a save, tick the checklist ---------- */
window.hdfDex = {
  parse: parseSave,
  count: totalCaught,
  names: function(list){ return list.map(function(d){ return D.pk[d-1].n; }); },
  byGen: function(){ var r = {1:{c:0,t:gTotal[1],n:GINFO[1].r}, 2:{c:0,t:gTotal[2],n:GINFO[2].r}, 3:{c:0,t:gTotal[3],n:GINFO[3].r}}; D.pk.forEach(function(p){ if (caught[p.d]) r[p.g].c++; }); return r; },
  sprite: function(d){ return spr(d); },
  show: function(d){ goFinder(d); },
  apply: function(owned){
    var fresh = owned.filter(function(d){ return !caught[d]; });
    if (fresh.length){ fresh.forEach(function(d){ caught[d] = 1; }); stamp = Date.now(); paintAll(); refreshCounts(); refreshCline(); saveLocal(); scheduleRemote(); }
    return fresh;
  }
};
'''
idx=main_js.rindex('})();')
main_js=main_js[:idx]+hook+main_js[idx:]
# tabs: add Game tab (first) and make the grid 4 wide
tab='''  <button class="tab" role="tab" id="tab-game" data-tab="game" aria-selected="false" type="button">
    <svg class="ti" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="7" width="19" height="11" rx="4"/><path d="M7 10.5v4M5 12.5h4"/><circle cx="16" cy="11.6" r=".9"/><circle cx="18.2" cy="13.6" r=".9"/></svg><span>Game</span>
  </button>
'''
m='<nav class="tabs" role="tablist" aria-label="Sections">\n'
assert m in markup
markup=markup.replace(m,m+tab)
assert 'grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;background:var(--surface)' in tracker_css
tracker_css=tracker_css.replace('grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;background:var(--surface)','grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;background:var(--surface)')
emu_css=open(S+'/src/emu.css',encoding='utf8').read()
emu_html=open(S+'/src/emu.html',encoding='utf8').read()
emu_js=open(S+'/src/emu.js',encoding='utf8').read()
voice_js=open(S+'/src/voice.js',encoding='utf8').read()
out='''<title>Hoenn Dex Player</title>
<meta name="claude:viewport-fit-sides" content="cover">
'''+tracker_css+'\n<style>\n'+emu_css+'</style>\n'+emu_html+'\n<div id="dexroot">\n'+markup+'</div>\n'+data_js+'\n'+spr_js+'\n'+main_js+'\n<script>\n'+emu_js+'</script>\n'+'<script>\n'+voice_js+'</script>\n'
os.makedirs(S+'/dist',exist_ok=True)
open(S+'/dist/index.html','w',encoding='utf8').write(out)

print(len(out))
