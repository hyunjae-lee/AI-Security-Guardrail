/**
 * SCENE 02 · 왜 검사대인가 — "지금은, 아무도 가방을 열어 보지 않습니다"
 *
 * 이 장면의 문장도 하나다: **있어야 할 자리에 검사대가 없다.**
 * 그래서 그림의 주인공은 게이트가 아니라 **비어 있는 게이트 자리**다 —
 * 파선으로만 그린 아치.  가방은 그 한가운데를 그냥 통과한다.
 * 나가는 길과 돌아오는 길 둘 다 뚫려 있다는 것을 두 줄로 보인다.
 */

import { svgWrap } from './_svg.js'
import { C } from './_palette.js'
import { VB, arrow, bag, border, card, chip, gate, globe, note, title, zone } from './_flat.js'
import { sceneWhy as t } from '../content/strings.js'

const HOME = { x: 66, y: 140, w: 404, h: 410 }
const GATE_X = 748
const OUT_Y = 258 // 나가는 길
const IN_Y = 438 // 돌아오는 길
const GLOBE = { x: 1218, y: 348, r: 126 }

/* 가방에 무엇이 들었을 수 있는지 — 셋이면 충분하다.
   목록이 길어지면 '무엇이 들었나' 가 아니라 '목록' 이 주인공이 된다. */
const RISKS = [
  [t.risk1, t.risk1Sub],
  [t.risk2, t.risk2Sub],
  [t.risk3, t.risk3Sub],
]

const campus = `
      ${zone(HOME.x, HOME.y, HOME.w, HOME.h, { fill: 'var(--c-home-g-top)' })}
      ${title(HOME.x + 30, HOME.y + 54, t.gap, { anchor: 'start' })}
      ${RISKS.map(
        ([name, sub], i) => `
      <g id="sw-risk-${i + 1}">
        ${card(HOME.x + 30, HOME.y + 86 + i * 100, HOME.w - 60, 84, { fill: C.panel, r: 14 })}
        <text x="${HOME.x + 52}" y="${HOME.y + 86 + i * 100 + 36}" class="d-label"
              style="fill:var(--c-text)">${name}</text>
        <text x="${HOME.x + 52}" y="${HOME.y + 86 + i * 100 + 64}" class="d-note"
              style="fill:var(--c-muted)">${sub}</text>
      </g>`,
      ).join('')}
      ${note(HOME.x + HOME.w / 2, HOME.y + HOME.h + 44, t.gapSub)}`

/* 이 장면의 주인공 — 비어 있는 게이트 자리. */
const missing = `
      ${border(GATE_X, 96, 610, { id: 'sw-border' })}
      ${note(GATE_X, 76, t.borderLabel)}
      ${gate(GATE_X, 348, 1.05, { tone: C.block, ghost: true, id: 'sw-ghost' })}
      ${chip(GATE_X, 562, t.noCheck, { tone: C.blockInk, id: 'sw-nocheck' })}`

/* 나가는 길과 돌아오는 길 — 둘 다 파선이다. 파선은 '통제되지 않는 흐름' 이다. */
const flows = `
      ${arrow(HOME.x + HOME.w + 40, OUT_Y, GLOBE.x - GLOBE.r - 26, OUT_Y, {
        tone: C.bag,
        sw: 4,
        dashed: true,
        id: 'sw-out',
      })}
      ${note(HOME.x + HOME.w + 56, OUT_Y - 28, t.outbound, { anchor: 'start' })}
      ${bag(HOME.x + HOME.w + 112, OUT_Y, 0.6, { id: 'sw-bag-out' })}

      ${arrow(GLOBE.x - GLOBE.r - 26, IN_Y, HOME.x + HOME.w + 40, IN_Y, {
        tone: C.block,
        sw: 4,
        dashed: true,
        id: 'sw-in',
      })}
      ${note(GLOBE.x - GLOBE.r - 44, IN_Y - 28, t.inbound, { anchor: 'end' })}
      ${bag(GLOBE.x - GLOBE.r - 104, IN_Y, 0.6, { tone: C.block, id: 'sw-bag-in' })}`

const outland = `
      ${globe(GLOBE.x, GLOBE.y, GLOBE.r, { id: 'sw-globe' })}
      ${note(GLOBE.x, GLOBE.y + GLOBE.r + 48, t.awayLabel)}`

export function sceneWhySvg() {
  return svgWrap({
    id: 'scene-why',
    viewBox: VB,
    title: t.svgTitle,
    desc: t.svgDesc,
    body: `
      ${campus}
      ${missing}
      ${flows}
      ${outland}`,
  })
}

export function sceneWhyAnim(root, gsap, ScrollTrigger) {
  const tl = gsap.timeline({
    scrollTrigger: { trigger: root, start: 'top 68%', once: true },
    defaults: { ease: 'power3.out' },
  })

  tl.from('[id^="sw-risk-"]', { opacity: 0, x: -22, duration: 0.55, stagger: 0.08 })
    .from('#sw-border', { opacity: 0, duration: 0.5 }, '-=0.2')
    .from('#sw-globe', { opacity: 0, scale: 0.9, transformOrigin: '50% 50%', duration: 0.7 }, '-=0.3')
    /* 가방이 먼저 지나가고, 그 다음에 '여기 검사대가 없다' 가 뜬다.
       순서를 뒤집으면 '없다' 가 설명이 아니라 제목이 되어 버린다. */
    .from('#sw-out, #sw-bag-out', { opacity: 0, x: -60, duration: 0.7 }, '-=0.25')
    .from('#sw-in, #sw-bag-in', { opacity: 0, x: 60, duration: 0.7 }, '-=0.45')
    .from('#sw-ghost', { opacity: 0, scale: 0.92, transformOrigin: '50% 100%', duration: 0.6 }, '-=0.1')
    .from('#sw-nocheck', { opacity: 0, y: -12, duration: 0.5 }, '-=0.35')

  ScrollTrigger.refresh()
}
