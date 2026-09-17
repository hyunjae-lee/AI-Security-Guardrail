/**
 * SCENE 04 · 조감도 — "이 터미널이 가드레일입니다"
 *
 * 이 장면이 할 일은 딱 하나다: **길이 하나로 모인다**는 것.
 * 캠퍼스 어디서 띄운 질의든 가방이 되어 한 게이트로 모이고, 그 게이트를 지나야
 * 국경 밖으로 나간다.  그래서 그림도 왼쪽(여럿) → 가운데(하나) → 오른쪽(바깥)
 * 세 칸뿐이다.  여기에 층·단면·부속을 더하면 "하나로 모인다" 가 묻힌다.
 */

import { svgWrap } from './_svg.js'
import { C } from './_palette.js'
import {
  VB,
  arrow,
  bag,
  feed,
  border,
  card,
  chip,
  gate,
  globe,
  label,
  note,
  title,
  zone,
} from './_flat.js'
import { scene2 as t } from '../content/strings.js'

/* --- 칸 나누기 (좌표는 여기서만 정한다) --- */
const HOME = { x: 70, y: 120, w: 430, h: 400 }
const FUNNEL_X = 630
const GATE_X = 790
const GATE_Y = 320
const BORDER_X = 1020
const GLOBE = { x: 1230, y: 320, r: 132 }
const DEV_W = 200 // 단말 카드는 폭을 맞춘다 — 들쭉날쭉하면 목록으로 안 읽힌다

/* 단말 세 대 — '어느 단말에서 띄웠든' 을 말하는 최소 개수다.
   더 그리면 캠퍼스가 주인공처럼 보인다. */
const DEVICES = [
  { y: 236, name: t.devPhone },
  { y: 326, name: t.devLaptop },
  { y: 416, name: t.devPc },
]

const campus = `
      ${zone(HOME.x, HOME.y, HOME.w, HOME.h, { fill: 'var(--c-home-g-top)' })}
      ${title(HOME.x + 30, HOME.y + 54, t.campus, { anchor: 'start' })}
      ${DEVICES.map(
        (d, i) => `
      <g id="s2-dev-${i + 1}">
        ${card(HOME.x + 40, d.y - 32, DEV_W, 64, { fill: C.panel, r: 12 })}
        ${note(HOME.x + 40 + DEV_W / 2, d.y + 8, d.name)}
      </g>`,
      ).join('')}
      ${note(HOME.x + 30, HOME.y + HOME.h + 40, t.devicesSub, { anchor: 'start' })}`

/* 가방 셋이 각자 출발해 한 점으로 모인다 — 이 장면의 문장 그 자체다. */
const funnel = `
      ${DEVICES.map((d, i) => {
        const x0 = HOME.x + 40 + DEV_W + 78
        return `
      ${feed(x0, d.y, FUNNEL_X, GATE_Y, { tone: C.bag, sw: 3, id: `s2-flow-${i + 1}` })}
      ${bag(x0 - 40, d.y, 0.6, { id: `s2-bag-${i + 1}` })}`
      }).join('')}
      ${arrow(FUNNEL_X, GATE_Y, GATE_X - 118, GATE_Y, { tone: C.bag, sw: 5, id: 's2-flow-main' })}`

const terminal = `
      ${gate(GATE_X, GATE_Y, 1, { id: 's2-gate' })}
      ${title(GATE_X, GATE_Y + 168, t.terminal)}
      ${note(GATE_X, GATE_Y + 200, t.terminalSub)}
      ${bag(GATE_X, GATE_Y + 18, 0.78, { id: 's2-bag-in' })}`

const outland = `
      ${border(BORDER_X, 96, 580, { id: 's2-border' })}
      ${note(BORDER_X, 76, t.border)}
      ${arrow(GATE_X + 110, GATE_Y, GLOBE.x - GLOBE.r - 22, GATE_Y, { tone: C.bag, sw: 5, id: 's2-flow-out' })}
      ${globe(GLOBE.x, GLOBE.y, GLOBE.r, { id: 's2-globe' })}
      ${title(GLOBE.x, GLOBE.y + GLOBE.r + 54, t.factory)}
      ${note(GLOBE.x, GLOBE.y + GLOBE.r + 86, t.factorySub)}`

/* 결론 등식 — 콜아웃이 부품을 가리키는 주기라면, 이건 그림 전체가 무엇인지를
   말하는 문장이라 격을 달리해 바닥에 박는다. */
const equation = `
      <g id="s2-equation">
        ${card(150, 622, 1140, 92, { fill: C.panel, stroke: C.panelLine })}
        <text x="700" y="${622 + 56}" text-anchor="end" class="d-title"
              style="fill:${C.bagInk}">${t.equationLeft}</text>
        <text x="720" y="${622 + 54}" text-anchor="middle" class="d-title"
              style="fill:var(--c-muted)">=</text>
        <text x="740" y="${622 + 56}" text-anchor="start" class="d-title"
              style="fill:${C.gearInk}">${t.equationRight}</text>
      </g>`

export function scene2Svg() {
  return svgWrap({
    id: 'scene-overview',
    viewBox: VB,
    title: t.svgTitle,
    desc: t.svgDesc,
    body: `
      ${campus}
      ${funnel}
      ${terminal}
      ${outland}
      ${equation}
      ${chip(FUNNEL_X - 20, GATE_Y - 150, t.oneWay, { tone: C.gearInk, id: 's2-oneway' })}`,
  })
}

/* ------------------------------------------------------------------ 동작

   움직임은 하나뿐이다 — 가방이 모여서 게이트를 지난다.
   장면의 문장이 하나이므로 움직임도 하나여야 한다. */
export function scene2Anim(root, gsap, ScrollTrigger) {
  const q = (s) => root.querySelector(s)
  const tl = gsap.timeline({
    scrollTrigger: { trigger: root, start: 'top 68%', once: true },
    defaults: { ease: 'power3.out' },
  })

  tl.from('#s2-dev-1, #s2-dev-2, #s2-dev-3', { opacity: 0, x: -24, duration: 0.6, stagger: 0.08 })
    .from('[id^="s2-flow-"]', { opacity: 0, duration: 0.5, stagger: 0.07 }, '-=0.25')
    .from('#s2-bag-1, #s2-bag-2, #s2-bag-3', { opacity: 0, scale: 0.6, transformOrigin: '50% 50%', duration: 0.5, stagger: 0.07 }, '-=0.35')
    .from('#s2-gate', { opacity: 0, y: 28, duration: 0.7 }, '-=0.2')
    .from('#s2-bag-in', { opacity: 0, x: -70, duration: 0.6 }, '-=0.35')
    .from('#s2-border', { opacity: 0, duration: 0.5 }, '-=0.3')
    .from('#s2-globe', { opacity: 0, scale: 0.88, transformOrigin: '50% 50%', duration: 0.8 }, '-=0.4')
    .from('#s2-oneway', { opacity: 0, y: -14, duration: 0.5 }, '-=0.5')
    .from('#s2-equation', { opacity: 0, y: 20, duration: 0.7 }, '-=0.3')

  /* 게이트 램프 — 꺼진 것이 아니라 돌고 있다는 신호. 느리게, 한 번에 하나만. */
  const lamp = q('#s2-gate circle')
  if (lamp) {
    gsap.to(lamp, {
      opacity: 0.25,
      duration: 1.4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      scrollTrigger: { trigger: root, start: 'top 80%', end: 'bottom 20%', toggleActions: 'play pause resume pause' },
    })
  }

  ScrollTrigger.refresh()
}
