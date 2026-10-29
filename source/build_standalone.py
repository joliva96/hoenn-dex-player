import os,re,sys,shutil,json
from PIL import Image,ImageDraw,ImageFilter
S=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(S); BUILD=sys.argv[1] if len(sys.argv)>1 else '1'
OUT=ROOT; os.makedirs(OUT+'/icons',exist_ok=True)
os.system('python3 -I %s/build.py >/dev/null'%S)
c=open(S+'/dist/index.html',encoding='utf8').read()
c=re.sub(r'^<title>.*?</title>\s*','',c,count=1,flags=re.S)
c=re.sub(r'^<meta name="claude:viewport-fit-sides"[^>]*>\s*','',c,count=1)
assert '<title>' not in c[:200] and 'claude:viewport' not in c[:200]
n=c.count('<h2>Menu</h2>'); assert n==1,n
c=c.replace('<h2>Menu</h2>','<h2>Menu · build %s</h2>'%BUILD)
head='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Hoenn Dex Player</title><meta name="theme-color" content="#06281c">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Dex Player"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icons/icon-180.png"><link rel="icon" type="image/png" href="icons/icon-192.png">
<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>
'''
open(OUT+'/index.html','w',encoding='utf8').write(head+c+'</body></html>')
json.dump({"name":"Hoenn Dex Player","short_name":"Dex Player","start_url":"./","scope":"./","display":"standalone","orientation":"portrait","background_color":"#06281c","theme_color":"#06281c",
 "icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icons/icon-512.png","sizes":"512x512","type":"image/png"}]},open(OUT+'/manifest.webmanifest','w'),indent=1)
# icon: green lens, drawn at 1024 and scaled down
N=1024; im=Image.new('RGB',(N,N)); d=ImageDraw.Draw(im)
for y in range(N):
    t=y/N; d.line([(0,y),(N,y)],fill=(int(14+(5-14)*t),int(66+(34-66)*t),int(46+(24-46)*t)))
cx=cy=N//2
def ring(r,col,w=None):
    d.ellipse([cx-r,cy-r,cx+r,cy+r],fill=col)
ring(400,(8,40,28)); ring(372,(52,226,140)); ring(300,(10,52,36)); ring(236,(20,96,66)); ring(150,(8,40,28))
d.ellipse([cx-90,cy-150,cx-10,cy-70],fill=(120,255,190))
im=im.filter(ImageFilter.GaussianBlur(0.6))
for s in (512,192,180): im.resize((s,s),Image.LANCZOS).save(OUT+'/icons/icon-%d.png'%s)
open(OUT+'/.nojekyll','w').write('')
print('standalone built, build',BUILD, os.path.getsize(OUT+'/index.html'))
