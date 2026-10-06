# 앞·뒤표지 장면 v2 — deck/print/intropage.png 시안 기준.
# 빛줄은 게이트를 가로로 지나고, 빨강·주황은 가운데 검사선에서 멈춘다. 노란 테두리 밖 쪽 끝까지 흐른다.
# 뒤표지는 같은 빛줄이 출발점(단말)에서 일어나 오른쪽 끝(책등)으로 나간다 — 앞표지 왼쪽 끝 높이 LY 와 맞물린다.
import random
W,H=182,257
CX=91; GL,GR=60,122; R=31; TOP=49+R; BASE=174
COL={'teal':'#5ff5c8','blue':'#b9dcff','yel':'#f6d36b','lime':'#b5e86a','ora':'#ff8a3d','red':'#ff4d4d'}
# (게이트 안 높이, 색, 굵기, 멈춤?, 왼쪽 끝 높이, 오른쪽 끝 높이)
L=[(89.5,'teal',1.0,False,58,70),(95.5,'lime',.45,False,98,104),(100.5,'red',.6,True,66,None),
   (107.5,'blue',.6,False,76,46),(115.5,'teal',1.0,False,148,112),(120.5,'ora',.45,True,138,None),
   (125,'yel',.45,False,98,140),(132.5,'red',.6,True,112,None),(140,'lime',.6,False,168,126),
   (146,'teal',.6,False,128,158),(153.5,'ora',.9,True,88,None),(157.5,'red',.45,True,166,None),
   (161,'teal',1.0,False,176,148),(167,'blue',.45,False,158,176)]
def cr(pts):
    d=f'M{pts[0][0]:.1f} {pts[0][1]:.1f}'
    for i in range(len(pts)-1):
        p0=pts[max(i-1,0)];p1=pts[i];p2=pts[i+1];p3=pts[min(i+2,len(pts)-1)]
        c1=(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6); c2=(p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6)
        d+=f' C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}'
    return d
def defs():
    return f'''<defs>
 <linearGradient id="sheet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fd3ad" stop-opacity=".55"/><stop offset="1" stop-color="#1f8a6e" stop-opacity=".35"/></linearGradient>
 <linearGradient id="core" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#bffff0" stop-opacity="0"/><stop offset=".5" stop-color="#bffff0" stop-opacity=".22"/><stop offset="1" stop-color="#bffff0" stop-opacity="0"/></linearGradient>
 <radialGradient id="halo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#3fe7c0" stop-opacity=".25"/><stop offset="1" stop-color="#3fe7c0" stop-opacity="0"/></radialGradient>
 <filter id="g1" filterUnits="userSpaceOnUse" x="-20" y="-20" width="{W+40}" height="{H+40}"><feGaussianBlur stdDeviation=".9"/></filter>
 <filter id="g2" filterUnits="userSpaceOnUse" x="-20" y="-20" width="{W+40}" height="{H+40}"><feGaussianBlur stdDeviation="2.6"/></filter>
</defs>'''
def line(o,d,c,w):
    o.append(f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w*2.6:.2f}" opacity=".35" filter="url(#g2)" stroke-linecap="round"/>')
    o.append(f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w:.2f}" stroke-linecap="round"/>')
def floor(o,cx,hor):
    for k in range(-22,23):
        o.append(f'<line x1="{cx}" y1="{hor}" x2="{cx+k*16}" y2="{H}" stroke="#3fe7c0" stroke-width=".14" opacity="{max(.05,.3-abs(k)*.012):.3f}"/>')
    y=hor; d=1.6
    while y<H:
        o.append(f'<line x1="0" y1="{y:.1f}" x2="{W}" y2="{y:.1f}" stroke="#3fe7c0" stroke-width=".14" opacity=".14"/>'); y+=d; d*=1.35

# ── 앞표지 ──
rnd=random.Random(3)
o=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">',defs(),
   f'<rect width="{W}" height="{H}" fill="#05070a"/>', f'<ellipse cx="{CX}" cy="115" rx="80" ry="75" fill="url(#halo)"/>']
floor(o,CX,BASE)
# 게이트 유리
o.append(f'<path d="M{GL} {BASE} V{TOP} A{R} {R} 0 0 1 {GR} {TOP} V{BASE} Z" fill="url(#sheet)" opacity=".75"/>')
o.append(f'<rect x="{CX-3}" y="{TOP-R}" width="6" height="{BASE-TOP+R}" fill="url(#core)"/>')
for k,(gy,c,w,stop,ly,ry) in enumerate(L):
    col=COL[c]
    wob=lambda a: a+rnd.uniform(-9,9)
    left=[(-6,ly),(14,wob((ly*2+gy)/3)),(32,wob((ly+gy*2)/3)),(48,gy+rnd.uniform(-3,3)),(GL,gy)]
    if stop:
        d=cr(left)+f' L{CX} {gy}'
        line(o,d,col,w)
    else:
        right=[(GR,gy),(136,gy+rnd.uniform(-3,3)),(152,wob((gy*2+ry)/3)),(168,wob((gy+ry*2)/3)),(W+6,ry)]
        d=cr(left)+f' L{GR} {gy} '+cr(right)[cr(right).index('C'):].join(['',''])
        d=cr(left)+f' L{GR} {gy}'+cr(right)[len(f'M{GR:.1f} {gy:.1f}'):]
        line(o,d,col,w)
# 게이트 테두리(이중) + 검사선
arch=lambda gl,gr,r,top: f'M{gl} {BASE} V{top} A{r} {r} 0 0 1 {gr} {top} V{BASE}'
for d,w in [(arch(GL,GR,R,TOP),1.1),(arch(GL+3.5,GR-3.5,R-3.5,TOP),.35)]:
    o.append(f'<path d="{d}" fill="none" stroke="#7ff5d6" stroke-width="{w*3:.2f}" opacity=".5" filter="url(#g2)"/>')
    o.append(f'<path d="{d}" fill="none" stroke="#c9fff0" stroke-width="{w}"/>')
o.append(f'<line x1="{CX}" y1="{TOP-R}" x2="{CX}" y2="{BASE}" stroke="#7ff5d6" stroke-width="1.4" opacity=".45" filter="url(#g1)"/>')
o.append(f'<line x1="{CX}" y1="{TOP-R}" x2="{CX}" y2="{BASE}" stroke="#effffa" stroke-width=".35"/>')
for gy,c,w,stop,ly,ry in L:
    if stop:
        o.append(f'<circle cx="{CX}" cy="{gy}" r="2.3" fill="none" stroke="{COL[c]}" stroke-width=".45"/>')
        o.append(f'<circle cx="{CX}" cy="{gy}" r="1.1" fill="#fff"/>')
o.append('</svg>')
open('/tmp/claude-1000/pw2/hero/ng.svg','w').write('\n'.join(o))

# ── 뒤표지 — 출발점(단말)에서 일어난 빛줄이 오른쪽 끝(책등)으로 ──
rnd=random.Random(9)
o=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">',defs(),
   f'<rect width="{W}" height="{H}" fill="#05070a"/>']
floor(o,40,BASE)
srcs=sorted(L,key=lambda t:t[4])   # 오른쪽 끝이 높은 줄일수록 왼쪽에서 출발 → 서로 엉키지 않는다
n=len(srcs)
for i,(gy,c,w,stop,ly,ry) in enumerate(srcs):
    sx=12+i*(128/(n-1)); sy=196+((i*37)%3)*5
    dx=W-sx
    pts=[(sx,sy),(sx+dx*.3,sy-(sy-ly)*.18),(sx+dx*.68,ly+(sy-ly)*.22),(W+6,ly)]
    line(o,cr(pts),COL[c],w)
    o.append(f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="2.6" fill="{COL[c]}" opacity=".35" filter="url(#g1)"/>')
    o.append(f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r=".9" fill="#fff"/>')
o.append('</svg>')
open('/tmp/claude-1000/pw2/hero/ngback.svg','w').write('\n'.join(o))
print('ok')
