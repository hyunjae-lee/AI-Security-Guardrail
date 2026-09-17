/**
 * SCENE 06 · 활주로 — "여기서부터는 우리 관제 밖입니다"
 *
 * 문장 하나: **국경을 넘은 뒤는 볼 수 없다.**  그래서 국경 오른쪽은 안개로
 * 덮고, 그 안에 있는 것은 지구본 하나뿐이다.  왼쪽(우리 쪽)은 또렷하고
 * 오른쪽(바깥)은 흐리다는 대비가 이 장면의 전부다.
 *
 * 바닥의 시간 막대는 발표에서 반드시 나오는 질문 — "검사를 끼우면 느려지지
 * 않느냐" — 에 대한 답이다.  말로 미루지 않고 같은 그림 안에 둔다.
 */

import { svgWrap } from './_svg.js'
import { C } from './_palette.js'
import { VB, arrow, bag, border, card, chip, gate, globe, lines, note, title } from './_flat.js'
import { sceneRunway as t } from '../content/strings.js'

const BORDER_X = 610
const GATE_X = 268
const OUT_Y = 212
const IN_Y = 372
const GLOBE = { x: 1010, y: 292, r: 132 }

/* 국경 밖 — 안개. 이 면이 이 장면의 논지다. */
const haze = `
      <rect id="sr-haze" x="${BORDER_X}" y="64" width="${1440 - BORDER_X - 40}" height="472" rx="18"
            fill="${C.veil}" opacity="0.14" />`

const here = `
      ${gate(GATE_X, 292, 0.98, { id: 'sr-gate' })}
      ${title(GATE_X, 292 + 156, t.depart)}
      ${note(GATE_X, 292 + 188, t.departSub)}`

const crossing = `
      ${border(BORDER_X, 64, 536, { id: 'sr-border' })}
      ${note(BORDER_X, 44, t.border)}
      ${arrow(GATE_X + 108, OUT_Y, GLOBE.x - GLOBE.r - 24, OUT_Y, { tone: C.bag, sw: 4, id: 'sr-out' })}
      ${bag(GATE_X + 160, OUT_Y, 0.58, { id: 'sr-bag-out' })}
      ${arrow(GLOBE.x - GLOBE.r - 24, IN_Y, GATE_X + 108, IN_Y, { tone: C.ink3, sw: 4, id: 'sr-in' })}
      ${note(GLOBE.x - GLOBE.r - 40, IN_Y + 38, t.arrive, { anchor: 'end' })}`

const outland = `
      ${globe(GLOBE.x, GLOBE.y, GLOBE.r, { id: 'sr-globe' })}
      <text x="${GLOBE.x}" y="${GLOBE.y + GLOBE.r + 54}" text-anchor="middle" class="d-title"
            style="fill:var(--c-text)">${t.outside}</text>
      ${lines(GLOBE.x, GLOBE.y + GLOBE.r + 90, t.outsideSub, { gap: 28 })}`

/* 시간 막대 — 막대의 면은 물체색, 글자는 잉크. 흰 판 위에서 대비가 무너지지 않게. */
const BAR = { x: 96, y: 604, w: 1248, h: 40 }
const SEG_OUT = 84
const SEG_IN = 84

const seg = (x, w, fill, ink, label, value, anchor) => `
      <rect x="${x}" y="${BAR.y}" width="${w}" height="${BAR.h}" rx="10"
            fill="${fill}" opacity="0.2" stroke="${fill}" stroke-width="1.5" />
      <text x="${x + w / 2}" y="${BAR.y + 27}" text-anchor="middle" class="d-note"
            style="fill:${ink}" font-weight="700">${value}</text>
      <text x="${x + w / 2}" y="${BAR.y - 16}" text-anchor="${anchor}" class="d-note"
            style="fill:var(--c-muted)">${label}</text>`

const timeBar = `
      <g id="sr-timebar">
        <text x="${BAR.x}" y="${BAR.y - 54}" class="d-label" style="fill:${C.bagInk}">${t.timeLabel}</text>
        ${seg(BAR.x, SEG_OUT, C.bag, C.bagInk, t.timeOut, t.timeOutVal, 'start')}
        ${seg(BAR.x + SEG_OUT + 8, BAR.w - SEG_OUT - SEG_IN - 16, C.ink3, C.ink2, t.timeAway, t.timeAwayVal, 'middle')}
        ${seg(BAR.x + BAR.w - SEG_IN, SEG_IN, C.bag, C.bagInk, t.timeIn, t.timeInVal, 'end')}
        ${note(BAR.x, BAR.y + BAR.h + 32, t.timeScaleNote, { anchor: 'start' })}
      </g>`

export function sceneRunwaySvg() {
  return svgWrap({
    id: 'scene-runway',
    viewBox: VB,
    title: t.svgTitle,
    desc: t.svgDesc,
    body: `
      ${haze}
      ${here}
      ${crossing}
      ${outland}
      ${timeBar}`,
  })
}

export function sceneRunwayAnim(root, gsap, ScrollTrigger) {
  const tl = gsap.timeline({
    scrollTrigger: { trigger: root, start: 'top 68%', once: true },
    defaults: { ease: 'power3.out' },
  })
  tl.from('#sr-gate', { opacity: 0, y: 24, duration: 0.6 })
    .from('#sr-border', { opacity: 0, duration: 0.45 }, '-=0.25')
    /* 안개가 나중에 덮인다 — 또렷하던 것이 흐려져야 '볼 수 없다' 가 사건이 된다. */
    .from('#sr-haze', { opacity: 0, duration: 0.9 }, '-=0.1')
    .from('#sr-out, #sr-bag-out', { opacity: 0, x: -50, duration: 0.65 }, '-=0.6')
    .from('#sr-globe', { opacity: 0, scale: 0.9, transformOrigin: '50% 50%', duration: 0.7 }, '-=0.35')
    .from('#sr-in', { opacity: 0, x: 50, duration: 0.65 }, '-=0.3')
    .from('#sr-timebar', { opacity: 0, y: 18, duration: 0.7 }, '-=0.2')
  ScrollTrigger.refresh()
}
