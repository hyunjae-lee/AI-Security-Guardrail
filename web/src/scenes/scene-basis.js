/**
 * SCENE 03 · 설계 근거 — "이미 국가가 기준을 정해 두었습니다"
 *
 * 문장 하나: **등급이 다른 두 영역을 직접 잇지 말고, 사이에 통제 지점을 둬라.**
 * 그래서 그림은 위아래 두 줄이다 — 위는 지금 하고 있는 것(직접 연결, 빨간 파선),
 * 아래는 가이드라인이 말하는 것(연계체계를 거치는 초록 실선).
 * 같은 두 상자를 두 번 잇는 것이 요점이라 상자는 왼쪽·오른쪽 하나씩만 둔다.
 */

import { svgWrap } from './_svg.js'
import { C } from './_palette.js'
import { VB, arrow, banned, card, chip, feed, lines, note, title } from './_flat.js'
import { sceneBasis as t } from '../content/strings.js'

const BOX = { w: 372, h: 210 }
const L_X = 96
const R_X = 972
const BOX_Y = 132
const BAD_Y = BOX_Y + BOX.h / 2
const GOOD_Y = 486
const MID = (L_X + BOX.w + R_X) / 2

/** 등급 상자 — 큰 등급 글자 하나 + 무엇인지 두 줄. */
const area = (id, x, grade, gradeNote, name, sub, tone) => `
      <g id="${id}">
        ${card(x, BOX_Y, BOX.w, BOX.h)}
        <circle cx="${x + 62}" cy="${BOX_Y + 72}" r="34" fill="none" stroke="${tone}" stroke-width="2.5" />
        <text x="${x + 62}" y="${BOX_Y + 84}" text-anchor="middle" class="d-title"
              style="fill:${tone}">${grade}</text>
        ${note(x + 62, BOX_Y + 138, gradeNote, { anchor: 'middle' })}
        <text x="${x + 118}" y="${BOX_Y + 62}" class="d-title" style="fill:var(--c-text)">${name}</text>
        ${lines(x + 118, BOX_Y + 100, sub, { anchor: 'start', gap: 28 })}
      </g>`

/* 지금 하고 있는 것 — 두 영역을 그냥 잇는다. 가운데 금지 표시가 논지다. */
const bad = `
      <g id="sb-bad">
        ${feed(L_X + BOX.w + 20, BAD_Y, MID - 44, BAD_Y, { tone: C.block, sw: 3.5, dashed: true })}
        ${arrow(MID + 44, BAD_Y, R_X - 20, BAD_Y, { tone: C.block, sw: 3.5, dashed: true })}
        ${banned(MID, BAD_Y, 30)}
        ${note(MID, BAD_Y - 60, t.routeBad)}
        <text x="${MID}" y="${BAD_Y + 96}" text-anchor="middle" class="d-title"
              style="fill:${C.blockInk}">${t.violation}</text>
        ${lines(MID, BAD_Y + 130, t.violationSub, { gap: 28 })}
      </g>`

/* 가이드라인이 말하는 것 — 사이에 연계체계를 둔다. 이것이 곧 우리가 만들 검사대다. */
const good = `
      <g id="sb-good">
        ${feed(L_X + 186, BOX_Y + BOX.h + 20, L_X + 186, GOOD_Y, { tone: C.gear, sw: 3.5 })}
        ${feed(L_X + 186, GOOD_Y, MID - 150, GOOD_Y, { tone: C.gear, sw: 3.5 })}
        ${card(MID - 146, GOOD_Y - 48, 292, 96, { stroke: C.gear, sw: 2.5, fill: 'var(--c-gate-top)' })}
        <text x="${MID}" y="${GOOD_Y + 10}" text-anchor="middle" class="d-title"
              style="fill:${C.gearInk}">${t.gateLabel}</text>
        ${feed(MID + 146, GOOD_Y, R_X + 186, GOOD_Y, { tone: C.gear, sw: 3.5 })}
        ${arrow(R_X + 186, GOOD_Y, R_X + 186, BOX_Y + BOX.h + 20, { tone: C.gear, sw: 3.5 })}
        ${chip(L_X + 186, GOOD_Y - 106, t.routeGood, { tone: C.gearInk })}
        <text x="${MID}" y="${GOOD_Y + 104}" text-anchor="middle" class="d-title"
              style="fill:${C.gearInk}">${t.remedy}</text>
        ${lines(MID, GOOD_Y + 138, t.remedySub, { gap: 28 })}
      </g>`

export function sceneBasisSvg() {
  return svgWrap({
    id: 'scene-basis',
    viewBox: VB,
    title: t.svgTitle,
    desc: t.svgDesc,
    body: `
      ${area('sb-left', L_X, t.gradeS, t.gradeSNote, t.domain, t.domainSub, C.gearInk)}
      ${area('sb-right', R_X, t.gradeO, t.gradeONote, t.object, t.objectSub, C.bagInk)}
      ${bad}
      ${good}
      ${chip(MID, 64, t.modelLabel, { tone: C.ink2, id: 'sb-model' })}`,
  })
}

export function sceneBasisAnim(root, gsap, ScrollTrigger) {
  const tl = gsap.timeline({
    scrollTrigger: { trigger: root, start: 'top 68%', once: true },
    defaults: { ease: 'power3.out' },
  })
  /* 두 상자를 먼저 세우고, 잘못된 길을 보인 뒤, 옳은 길을 놓는다.
     순서가 곧 논증이다 — 문제 다음에 해법. */
  tl.from('#sb-left, #sb-right', { opacity: 0, y: 22, duration: 0.6, stagger: 0.1 })
    .from('#sb-model', { opacity: 0, y: -12, duration: 0.45 }, '-=0.3')
    .from('#sb-bad', { opacity: 0, duration: 0.7 }, '-=0.1')
    .from('#sb-good', { opacity: 0, y: 18, duration: 0.8 }, '+=0.15')
  ScrollTrigger.refresh()
}
