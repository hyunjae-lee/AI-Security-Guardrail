/**
 * SCENE 05 · 출국층 — "가방은 세 개의 문 중 하나로 나갑니다"
 *
 * 이 장면은 **순서**가 전부다.  여권·비자를 보고, 가방 속을 보고, 그 다음에
 * 문이 갈린다.  그래서 그림도 왼→오른쪽 한 줄로 흐르고 끝에서만 세 갈래로
 * 벌어진다.  판독 화면·컨베이어·층 단면 같은 것은 넣지 않는다 — 순서가 묻힌다.
 *
 * 곧장 거부되는 길(전략물자·위조 여권)은 검사 단계에서 **문을 건너뛰어**
 * 바로 내려간다.  이 지름길이 보이지 않으면 "점수와 무관하게 즉시 차단" 이라는
 * 사실이 그림에서 사라진다.
 */

import { svgWrap } from './_svg.js'
import { C } from './_palette.js'
import { VB, arrow, bag, banned, card, chip, feed, maskGlyph, note, pass, title } from './_flat.js'
import { scene3 as t } from '../content/strings.js'

const LINE_Y = 300 // 가방이 흐르는 높이
const STEP = { w: 250, h: 150 }
const S1_X = 210
const S2_X = 520
const FAN_X = 830 // 여기서 세 갈래로 갈린다
const GATE_X = 980
const GATE_W = 380
const GATES = [
  { key: 'allow', y: 150, name: t.gateAllow, tone: C.allow, ink: C.allowInk, glyph: pass },
  { key: 'mask', y: 300, name: t.gateMask, tone: C.bag, ink: C.bagInk, glyph: maskGlyph },
  { key: 'block', y: 450, name: t.gateBlock, tone: C.block, ink: C.blockInk, glyph: banned },
]

/** 검사 한 단계 — 흰 판 + 이름 + 무엇을 보는지 한 줄. */
const step = (id, x, name, sub) => `
      <g id="${id}">
        ${card(x, LINE_Y - STEP.h / 2, STEP.w, STEP.h)}
        ${title(x + STEP.w / 2, LINE_Y - 8, name)}
        ${note(x + STEP.w / 2, LINE_Y + 28, sub)}
      </g>`

const flow = `
      ${bag(110, LINE_Y, 0.82, { id: 's3-bag' })}
      ${arrow(156, LINE_Y, S1_X - 14, LINE_Y, { tone: C.bag, sw: 4, id: 's3-f1' })}
      ${step('s3-step-1', S1_X, t.passport, t.passportSub)}
      ${arrow(S1_X + STEP.w + 14, LINE_Y, S2_X - 14, LINE_Y, { tone: C.bag, sw: 4, id: 's3-f2' })}
      ${step('s3-step-2', S2_X, t.xray, t.xraySub)}
      ${feed(S2_X + STEP.w + 14, LINE_Y, FAN_X, LINE_Y, { tone: C.bag, sw: 4, id: 's3-f3' })}`

/* 세 갈래 — 색이 곧 판정이다. 글자를 읽기 전에 색으로 먼저 갈려야 한다. */
const gates = `
      ${GATES.map(
        (g, i) => `
      <g id="s3-gate-${g.key}">
        ${feed(FAN_X, LINE_Y, GATE_X - 16, g.y, { tone: g.tone, sw: 3.5, id: `s3-fan-${i + 1}` })}
        ${card(GATE_X, g.y - 52, GATE_W, 104, { stroke: g.tone, sw: 2.5 })}
        ${g.glyph(GATE_X + 56, g.y, 26, { tone: g.tone })}
        <text x="${GATE_X + 104}" y="${g.y + 12}" class="d-title" style="fill:${g.ink}">${g.name}</text>
      </g>`,
      ).join('')}`

/* 지름길 — 점수를 매기지 않고 곧장 거부로 내려간다. */
const override = `
      <g id="s3-override">
        ${arrow(S2_X + STEP.w / 2, LINE_Y + STEP.h / 2 + 12, GATE_X - 16, 450, {
          tone: C.block,
          sw: 3.5,
          dashed: true,
        })}
        ${chip(S2_X + STEP.w / 2 + 116, LINE_Y + STEP.h / 2 + 96, t.override, { tone: C.blockInk })}
        ${note(S2_X + STEP.w / 2 + 116, LINE_Y + STEP.h / 2 + 140, t.overrideSub)}
      </g>`

export function scene3Svg() {
  return svgWrap({
    id: 'scene-departures',
    viewBox: VB,
    title: t.svgTitle,
    desc: t.svgDesc,
    body: `
      ${flow}
      ${gates}
      ${override}
      ${note(GATE_X + GATE_W / 2, 604, t.gates)}`,
  })
}

export function scene3Anim(root, gsap, ScrollTrigger) {
  const tl = gsap.timeline({
    scrollTrigger: { trigger: root, start: 'top 68%', once: true },
    defaults: { ease: 'power3.out' },
  })

  /* 순서가 논지이므로 순서대로 켠다 — 가방, 1단계, 2단계, 그 다음 세 갈래. */
  tl.from('#s3-bag', { opacity: 0, x: -50, duration: 0.55 })
    .from('#s3-f1', { opacity: 0, duration: 0.35 }, '-=0.2')
    .from('#s3-step-1', { opacity: 0, y: 20, duration: 0.55 }, '-=0.15')
    .from('#s3-f2', { opacity: 0, duration: 0.35 })
    .from('#s3-step-2', { opacity: 0, y: 20, duration: 0.55 }, '-=0.15')
    .from('#s3-f3', { opacity: 0, duration: 0.35 })
    .from('[id^="s3-gate-"]', { opacity: 0, x: 34, duration: 0.6, stagger: 0.1 }, '-=0.1')
    .from('#s3-override', { opacity: 0, y: -16, duration: 0.6 }, '-=0.2')

  ScrollTrigger.refresh()
}
