# Builds v2/index.html: the same app, running on the EmulatorJS engine (libretro mGBA). Needs v2/ejs/ (engine files) next to it.
import os,sys,re
S=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(S); B=ROOT+'/v2'
c=open(ROOT+'/index.html',encoding='utf8').read()
c=c.replace('<head><meta charset="utf-8">','<head><meta charset="utf-8"><script>window.__EJS=true</script>',1)
c=re.sub(r'<title>(.*?)</title>',lambda m:'<title>'+m.group(1)+' V2</title>',c,count=1)
c=re.sub(r'Menu · build (\d+)',r'Menu · build \1 · V2 engine',c,count=1)
c=c.replace('href="manifest.webmanifest"','href="../manifest.webmanifest"').replace('href="icons/','href="../icons/')
os.makedirs(B,exist_ok=True); open(B+'/index.html','w',encoding='utf8').write(c); print('v2 built',len(c))
