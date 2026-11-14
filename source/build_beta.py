# Builds beta/index.html: same app, but with the newer mGBA-wasm 2.x engine (needs cross-origin isolation, supplied by coi-serviceworker.js).
import os,sys,re
S=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(S); B=ROOT+'/beta'
c=open(ROOT+'/index.html',encoding='utf8').read()
c=c.replace('<head><meta charset="utf-8">','<head><meta charset="utf-8"><script src="coi-serviceworker.js"></script><script>window.__BETA=true</script>',1)
c=re.sub(r'<title>(.*?)</title>',lambda m:'<title>'+m.group(1)+' BETA</title>',c,count=1)
c=re.sub(r'Menu · build (\d+)',r'Menu · build \1 BETA engine',c,count=1)
c=c.replace('href="manifest.webmanifest"','href="../manifest.webmanifest"').replace('href="icons/','href="../icons/')
os.makedirs(B,exist_ok=True); open(B+'/index.html','w',encoding='utf8').write(c); print('beta built',len(c))
