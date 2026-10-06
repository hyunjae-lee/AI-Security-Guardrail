# 앞·뒤표지 장면 — 펼치면 이어진다(뒤표지 오른쪽 끝 = 앞표지 왼쪽 끝, 책등을 건너 빛 궤적이 이어짐).
import random, math
W,H=182,257
def defs(extra=''):
    return f'''<defs>
 <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#020308"/><stop offset=".55" stop-color="#07131c"/><stop offset="1" stop-color="#010307"/></linearGradient>
 <radialGradient id="halo" cx="50%" cy="50%" r="50%">
  <stop offset="0" stop-color="#3fe7c0" stop-opacity=".55"/><stop offset=".4" stop-color="#16a98a" stop-opacity=".16"/><stop offset="1" stop-color="#0b2a2a" stop-opacity="0"/></radialGradient>
 <radialGradient id="warm" cx="50%" cy="50%" r="50%">
  <stop offset="0" stop-color="#ff9d2e" stop-opacity=".42"/><stop offset=".5" stop-color="#c8600e" stop-opacity=".12"/><stop offset="1" stop-color="#3a1a05" stop-opacity="0"/></radialGradient>
 <linearGradient id="sheet" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#bffff0" stop-opacity=".45"/><stop offset=".6" stop-color="#3fe7c0" stop-opacity=".2"/><stop offset="1" stop-color="#3fe7c0" stop-opacity=".05"/></linearGradient>
 <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#3fe7c0" stop-opacity=".16"/><stop offset="1" stop-color="#3fe7c0" stop-opacity="0"/></linearGradient>
 <filter id="b1" filterUnits="userSpaceOnUse" x="-20" y="-20" width="{W+40}" height="{H+40}"><feGaussianBlur stdDeviation=".45"/></filter>
 <filter id="b2" filterUnits="userSpaceOnUse" x="-20" y="-20" width="{W+40}" height="{H+40}"><feGaussianBlur stdDeviation="1.7"/></filter>
 <filter id="b3" filterUnits="userSpaceOnUse" x="-20" y="-20" width="{W+40}" height="{H+40}"><feGaussianBlur stdDeviation="5"/></filter>
 <filter id="b4" filterUnits="userSpaceOnUse" x="-40" y="-40" width="{W+80}" height="{H+80}"><feGaussianBlur stdDeviation="14"/></filter>
 {extra}
</defs>'''
def grad(id,x1,x2,stops):
    s=''.join(f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o,c,a in stops)
    return f'<linearGradient id="{id}" gradientUnits="userSpaceOnUse" x1="{x1}" y1="0" x2="{x2}" y2="0">{s}</linearGradient>'
def glow(o,path,col,k=1.0):
    for w,f,op in [(2.4,'b2',.45),(.7,'b1',.9),(.26,None,1)]:
        flt=f' filter="url(#{f})"' if f else ''
        o.append(f'<path d="{path}" fill="none" stroke="{col}" stroke-width="{w*k:.2f}" stroke-linecap="round" opacity="{op}"{flt}/>')
def ground(o,VX,HOR,rnd):
    o.append(f'<rect width="{W}" height="{H}" fill="url(#sky)"/>')
    for _ in range(60):
        x,y=rnd.uniform(0,W),rnd.uniform(0,HOR-40)
        o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rnd.uniform(.07,.22):.2f}" fill="#cfe9ff" opacity="{rnd.uniform(.1,.45):.2f}"/>')
    for k in range(-18,19):
        o.append(f'<line x1="{VX}" y1="{HOR}" x2="{VX+k*20}" y2="{H}" stroke="#3fe7c0" stroke-width=".12" opacity="{max(.035,.19-abs(k)*.009):.3f}"/>')
    y=HOR; d=1.1
    while y<H:
        o.append(f'<line x1="0" y1="{y:.1f}" x2="{W}" y2="{y:.1f}" stroke="#3fe7c0" stroke-width=".12" opacity="{min(.19,.05+(y-HOR)/420):.3f}"/>')
        y+=d; d*=1.3
    o.append(f'<rect x="0" y="{HOR}" width="{W}" height="{H-HOR}" fill="url(#floor)" opacity=".55"/>')

# 공통: 책등에서 만나는 높이(앞표지 x=0 == 뒤표지 x=W)
EDGE=[140,150,160,170,180,190,200,210]

# ── 앞표지 ─────────────────────────────
rnd=random.Random(11)
VX,HOR=91,150; GL,GR,TOP,R=67,115,94,24
o=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">',
   defs(grad('ina',0,GL,[(0,'#ffb347',.35),(.6,'#ffb347',.8),(1,'#ffe0a8',1)])+grad('inr',0,GL,[(0,'#ff5a4a',.3),(.6,'#ff5a4a',.8),(1,'#ffb1a6',1)])
        +grad('outt',GR,W,[(0,'#b5fff0',1),(.5,'#3fe7c0',.75),(1,'#3fe7c0',.1)])+grad('outg',GR,W,[(0,'#e2ffc4',1),(.5,'#8fdc5a',.75),(1,'#8fdc5a',.1)]))]
ground(o,VX,HOR,rnd)
o.append(f'<ellipse cx="10" cy="190" rx="90" ry="70" fill="url(#warm)"/>')
o.append(f'<ellipse cx="{VX}" cy="125" rx="92" ry="80" fill="url(#halo)"/>')
gys=[104,112,120,128,136,143,149,146]  # 게이트 높이
order=[(EDGE[i],g) for i,g in enumerate([104,111,118,125,132,139,145,149])]
red={3,6}
for i,(y0,gy) in enumerate(order):
    col='url(#inr)' if i in red else 'url(#ina)'
    k=1.0 if i in (0,2,4,7) else .7
    glow(o,f'M-2 {y0} C34 {y0-6} {GL-34} {gy} {GL+1} {gy}',col,k)
    if i in red:
        o.append(f'<circle cx="{GL-1.5}" cy="{gy}" r="3.6" fill="#ff4a3a" opacity=".6" filter="url(#b2)"/>')
        o.append(f'<circle cx="{GL-1.5}" cy="{gy}" r="1" fill="#ffe2dd"/>')
    else:
        y3=70+i*12
        glow(o,f'M{GR-1} {gy} C{GR+30} {gy} {W-36} {y3} {W+4} {y3-3}', 'url(#outt)' if i%2==0 else 'url(#outg)',k)
arch=f'M{GL} {HOR} V{TOP} A{R} {R} 0 0 1 {GR} {TOP} V{HOR}'
o.append(f'<path d="{arch} Z" fill="url(#sheet)"/>')
for w,f,op,col in [(8,'b3',.45,'#3fe7c0'),(2.6,'b2',.85,'#3fe7c0'),(1.1,'b1',1,'#7ff5d6'),(.42,None,1,'#effffa')]:
    flt=f' filter="url(#{f})"' if f else ''
    o.append(f'<path d="{arch}" fill="none" stroke="{col}" stroke-width="{w}" opacity="{op}"{flt}/>')
o.append(f'<line x1="{GL}" y1="122" x2="{GR}" y2="122" stroke="#bffff0" stroke-width="1.8" opacity=".55" filter="url(#b2)"/>')
o.append(f'<line x1="{GL}" y1="122" x2="{GR}" y2="122" stroke="#f0fffb" stroke-width=".3"/>')
o.append(f'<ellipse cx="{VX}" cy="{HOR+1}" rx="48" ry="4" fill="#3fe7c0" opacity=".32" filter="url(#b2)"/>')
o.append(f'<path d="M{GL} {HOR} V{HOR+30} M{GR} {HOR} V{HOR+30}" stroke="#3fe7c0" stroke-width="1.6" opacity=".18" filter="url(#b2)"/>')
o.append('</svg>')
open('/tmp/claude-1000/pw2/hero/ng.svg','w').write('\n'.join(o))

# ── 뒤표지 — 캠퍼스 쪽. 빛 궤적이 시작되어 오른쪽(책등)으로 나간다 ─────
rnd=random.Random(5)
VX2,HOR2=60,150
o=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">',
   defs(grad('src',0,W,[(0,'#ffb347',0),(.35,'#ffb347',.25),(1,'#ffb347',.35)])+grad('srcr',0,W,[(0,'#ff5a4a',0),(.35,'#ff5a4a',.22),(1,'#ff5a4a',.3)]))]
ground(o,VX2,HOR2,rnd)
o.append(f'<ellipse cx="{W}" cy="190" rx="110" ry="80" fill="url(#warm)"/>')
# 출발점 — 바닥 위의 작은 빛(단말) 여러 개에서 궤적이 일어난다
starts=[(16,176),(32,196),(50,182),(68,204),(86,188),(104,210),(122,194),(140,214)]
for i,((sx,sy),ye) in enumerate(zip(starts,EDGE)):
    col='url(#srcr)' if i in (3,6) else 'url(#src)'
    glow(o,f'M{sx} {sy} C{sx+30} {sy-6} {W-50} {ye+4} {W+2} {ye}',col,.85)
    o.append(f'<circle cx="{sx}" cy="{sy}" r="2.6" fill="#ffb347" opacity=".45" filter="url(#b2)"/>')
    o.append(f'<circle cx="{sx}" cy="{sy}" r=".7" fill="#fff1d6"/>')
o.append('</svg>')
open('/tmp/claude-1000/pw2/hero/ngback.svg','w').write('\n'.join(o))
print('ok')
