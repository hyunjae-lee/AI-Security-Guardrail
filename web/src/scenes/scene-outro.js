/**
 * SCENE 10 · 아웃트로 — "눈에 보이지 않을 뿐, 모든 질문이 여기를 지납니다"
 *
 * 문장 하나: **보이지 않는 것과 없는 것은 다르다.**
 * 그래서 그림은 지면선 하나로 위아래가 갈린다.  위는 이용자가 보는 것(평소의
 * 채팅창 하나뿐), 아래는 실제로 일어나는 일(게이트가 계속 돌고 있다).
 * 같은 순간을 두 층으로 보이는 것이 이 장면의 전부다.
 */

import { svgWrap } from './_svg.js'
import { C } from './_palette.js'
import { VB, arrow, bag, card, chip, gate, globe, lines, note, title } from './_flat.js'
import { sceneOutro as t } from '../content/strings.js'

const GROUND_Y = 258
const CHAT = { x: 470, y: 74, w: 500, h: 132 }
const GATE_X = 612
const GATE_Y = 452
const GLOBE = { x: 1180, y: 452, r: 96 }

/* 위층 — 보이는 것. 채팅창 한 장뿐이라야 '이것밖에 안 보인다' 가 성립한다. */
const surface = `
      <g id="so-surface">
        ${card(CHAT.x, CHAT.y, CHAT.w, CHAT.h, { r: 16 })}
        ${note(CHAT.x + CHAT.w / 2, CHAT.y + 58, t.campus)}
        <rect x="${CHAT.x + 40}" y="${CHAT.y + 78}" width="${CHAT.w - 80}" height="34" rx="17"
              fill="${C.panelSoft}" />
        ${note(CHAT.x + CHAT.w / 2, CHAT.y + 101, t.campusSub)}
      </g>
      ${note(96, CHAT.y + 38, t.surfaceLabel, { anchor: 'start' })}`

/* 지면선 — 이 한 줄이 장면을 둘로 가른다. */
const ground = `
      <g id="so-ground">
        <path d="M 60 ${GROUND_Y} H 1380" stroke="var(--c-text)" stroke-width="2.5"
              stroke-dasharray="1 0" opacity="0.28" fill="none" />
        ${note(1380, GROUND_Y - 16, t.groundLine, { anchor: 'end' })}
      </g>`

/* 아래층 — 실제로 일어나는 일. 게이트는 여전히 돌고 있다. */
const underground = `
      <g id="so-under">
        ${note(96, GROUND_Y + 60, t.undergroundLabel, { anchor: 'start', fill: C.gearInk })}
        ${note(96, GROUND_Y + 92, t.cutNote, { anchor: 'start' })}
        ${gate(GATE_X, GATE_Y, 0.94, { id: 'so-gate' })}
        ${bag(GATE_X, GATE_Y + 14, 0.66, { id: 'so-bag' })}
        ${chip(GATE_X, GATE_Y + 152, t.running, { tone: C.gearInk, id: 'so-running' })}
        ${chip(GATE_X, GATE_Y + 206, t.timing, { tone: C.bagInk, id: 'so-timing' })}
        ${note(GATE_X, GATE_Y + 250, t.timingSub)}
        ${arrow(GATE_X + 106, GATE_Y, GLOBE.x - GLOBE.r - 22, GATE_Y, { tone: C.bag, sw: 4, id: 'so-out' })}
        ${globe(GLOBE.x, GLOBE.y, GLOBE.r, { id: 'so-globe' })}
        <text x="${GLOBE.x}" y="${GLOBE.y + GLOBE.r + 46}" text-anchor="middle" class="d-note"
              style="fill:var(--c-muted)" font-style="italic">${t.services}</text>
        ${note(GLOBE.x, GLOBE.y + GLOBE.r + 76, t.servicesSub)}
      </g>`

/* 결론 — 위아래를 잇는 문장. 지면선 바로 아래 가운데에 놓는다. */
const verdict = `
      <g id="so-verdict">
        ${arrow(CHAT.x + CHAT.w / 2, CHAT.y + CHAT.h + 12, GATE_X + 4, GATE_Y - 116, {
          tone: C.bag,
          sw: 3.5,
          dashed: true,
        })}
        <!-- 결론은 왼쪽 빈자리에 둔다. 지구본 위에 얹으면 글자가 대륙에 묻힌다. -->
        <text x="96" y="${GROUND_Y + 200}" class="d-title" style="fill:var(--c-text)">${t.through}</text>
        <text x="96" y="${GROUND_Y + 236}" class="d-note" style="fill:var(--c-muted)">${t.throughSub}</text>
      </g>`

export function sceneOutroSvg() {
  return svgWrap({
    id: 'scene-outro',
    viewBox: VB,
    title: t.svgTitle,
    desc: t.svgDesc,
    body: `
      ${surface}
      ${ground}
      ${verdict}
      ${underground}`,
  })
}

export function sceneOutroAnim(root, gsap, ScrollTrigger) {
  const tl = gsap.timeline({
    scrollTrigger: { trigger: root, start: 'top 68%', once: true },
    defaults: { ease: 'power3.out' },
  })
  /* 보이는 것부터 켜고, 그 다음에 땅을 걷어 낸다.
     아래층이 먼저 보이면 '보이지 않을 뿐' 이라는 말이 성립하지 않는다. */
  tl.from('#so-surface', { opacity: 0, y: -18, duration: 0.65 })
    .from('#so-ground', { opacity: 0, duration: 0.5 }, '-=0.2')
    .from('#so-under', { opacity: 0, y: 26, duration: 0.85 }, '-=0.1')
    .from('#so-verdict', { opacity: 0, duration: 0.7 }, '-=0.4')

  const lamp = root.querySelector('#so-gate circle')
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
