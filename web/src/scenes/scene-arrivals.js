/**
 * SCENE 07 · 입국층 — "돌아온 가방도 검역대를 지납니다"
 *
 * 출국층(05)의 거울상이다.  거기서는 왼→오른쪽으로 나갔고, 여기서는
 * 오른→왼쪽으로 들어온다.  방향이 뒤집힌 것만으로 "돌아오는 길에도 게이트가
 * 있다" 가 읽혀야 한다.
 *
 * 문장 하나: **가려낸 것은 트레이에 남고, 가방만 나간다.**
 * 그래서 게이트 뒤가 두 갈래로 갈린다 — 나가는 가방과, 남는 것들.
 */

import { svgWrap } from './_svg.js'
import { C } from './_palette.js'
import { VB, arrow, bag, border, card, chip, feed, gate, globe, note, person, title } from './_flat.js'
import { sceneArrivals as t } from '../content/strings.js'

const GLOBE = { x: 152, y: 250, r: 104 }
const BORDER_X = 392
const GATE_X = 660
const LINE_Y = 250
const TRAY = { x: 474, y: 398, w: 372, h: 206 }

const incoming = `
      ${globe(GLOBE.x, GLOBE.y, GLOBE.r, { id: 'sa-globe' })}
      ${note(GLOBE.x, GLOBE.y + GLOBE.r + 46, t.belt)}
      ${border(BORDER_X, 90, 420, { id: 'sa-border' })}
      ${arrow(GLOBE.x + GLOBE.r + 24, LINE_Y, GATE_X - 116, LINE_Y, { tone: C.ink3, sw: 4, id: 'sa-in' })}
      ${bag(GLOBE.x + GLOBE.r + 92, LINE_Y, 0.6, { tone: C.ink3, id: 'sa-bag-in' })}`

const quarantine = `
      ${gate(GATE_X, LINE_Y, 0.98, { id: 'sa-gate' })}
      ${title(GATE_X, LINE_Y - 148, t.quarantine)}
      ${note(GATE_X, LINE_Y - 116, t.quarantineSub)}`

/* 게이트 뒤에서 갈린다 — 위로는 깨끗해진 가방이, 아래로는 걸러낸 것이. */
const outgoing = `
      ${arrow(GATE_X + 112, LINE_Y, 1150, LINE_Y, { tone: C.allow, sw: 4, id: 'sa-out' })}
      ${bag(GATE_X + 180, LINE_Y, 0.6, { tone: C.allow, id: 'sa-bag-out' })}
      ${chip(1054, LINE_Y - 56, t.deliver, { tone: C.allowInk, id: 'sa-deliver' })}
      ${person(1236, LINE_Y + 6, 1.1, { tone: C.ink3, id: 'sa-user' })}`

const tray = `
      <g id="sa-tray">
        ${feed(GATE_X, LINE_Y + 100, GATE_X, TRAY.y - 18, { tone: C.block, sw: 3.5, dashed: true })}
        ${card(TRAY.x, TRAY.y, TRAY.w, TRAY.h, { stroke: C.block, sw: 2 })}
        <text x="${TRAY.x + 28}" y="${TRAY.y + 48}" class="d-title" style="fill:${C.blockInk}">${t.tray}</text>
        ${t.found
          .map(
            (f, i) => `
        <circle cx="${TRAY.x + 40}" cy="${TRAY.y + 88 + i * 40}" r="5" fill="${C.block}" />
        <text x="${TRAY.x + 62}" y="${TRAY.y + 96 + i * 40}" class="d-label"
              style="fill:var(--c-text)">${f}</text>`,
          )
          .join('')}
        ${note(TRAY.x + TRAY.w / 2, TRAY.y + TRAY.h + 38, t.traySub)}
      </g>`

/* 남길 수 없는 것이 섞여 있으면 짐 전체가 폐기된다 — 트레이와 다른 결말이다. */
const dropped = `
      <g id="sa-drop">
        ${feed(TRAY.x + TRAY.w + 20, TRAY.y + 104, 1038, TRAY.y + 104, { tone: C.block, sw: 3, dashed: true })}
        ${chip(1140, TRAY.y + 104, t.drop, { tone: C.blockInk })}
      </g>`

export function sceneArrivalsSvg() {
  return svgWrap({
    id: 'scene-arrivals',
    viewBox: VB,
    title: t.svgTitle,
    desc: t.svgDesc,
    body: `
      ${incoming}
      ${quarantine}
      ${outgoing}
      ${tray}
      ${dropped}`,
  })
}

export function sceneArrivalsAnim(root, gsap, ScrollTrigger) {
  const tl = gsap.timeline({
    scrollTrigger: { trigger: root, start: 'top 68%', once: true },
    defaults: { ease: 'power3.out' },
  })
  tl.from('#sa-globe', { opacity: 0, scale: 0.9, transformOrigin: '50% 50%', duration: 0.6 })
    .from('#sa-border', { opacity: 0, duration: 0.4 }, '-=0.3')
    .from('#sa-in, #sa-bag-in', { opacity: 0, x: -50, duration: 0.6 }, '-=0.2')
    .from('#sa-gate', { opacity: 0, y: 22, duration: 0.6 }, '-=0.25')
    /* 걸러진 것이 먼저 떨어지고, 그 다음에 깨끗해진 가방이 나간다.
       순서가 뒤집히면 '가려낸 뒤에 내보낸다' 가 안 읽힌다. */
    .from('#sa-tray', { opacity: 0, y: -18, duration: 0.7 }, '-=0.1')
    .from('#sa-out, #sa-bag-out, #sa-deliver, #sa-user', { opacity: 0, x: -40, duration: 0.65, stagger: 0.06 }, '-=0.3')
    .from('#sa-drop', { opacity: 0, duration: 0.5 }, '-=0.2')
  ScrollTrigger.refresh()
}
