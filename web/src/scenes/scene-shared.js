/**
 * SCENE 09 · 각 부서의 몫 — "장비는 우리가 만듭니다. 품목표는 우리가 못 씁니다"
 *
 * 문장 하나: **표가 비어 있으면 검색대는 통과시킬 수밖에 없다.**
 * 그래서 그림은 좌우 두 칸이고, 오른쪽 표의 빈 칸이 주인공이다.
 * 왼쪽(우리가 만드는 것)은 다 채워져 있고 오른쪽(각 부서가 채울 것)에는
 * 물음표가 있다 — 그 비대칭이 이 장면의 논지 전부다.
 */

import { svgWrap } from './_svg.js'
import { C } from './_palette.js'
import { VB, arrow, bullets, chip, note, table, title } from './_flat.js'
import { sceneShared as t } from '../content/strings.js'

const L = { x: 76, y: 132, w: 470 }
const R = { x: 632, y: 108, w: 736 }

const ours = `
      <g id="sh-ours">
        ${note(L.x, L.y, t.ourSide, { anchor: 'start', fill: C.gearInk })}
        ${title(L.x, L.y + 48, t.ourSideSub, { anchor: 'start' })}
        <path d="M ${L.x} ${L.y + 74} H ${L.x + L.w}" stroke="${C.panelLine}" stroke-width="1.5" fill="none" />
        ${bullets(L.x, L.y + 132, t.ourItems, { gap: 56, tone: C.gearInk })}
      </g>`

const theirs = `
      <g id="sh-theirs">
        ${note(R.x, R.y, t.theirSide, { anchor: 'start', fill: C.bagInk })}
        ${title(R.x, R.y + 48, t.theirSideSub, { anchor: 'start' })}
        ${table(R.x, R.y + 78, R.w, t.cols, t.rows, [176, 280, 110, 170], {
          id: 'sh-table',
          rowH: 62,
          blankNote: t.sampleNote,
        })}
      </g>`

/* 표가 판정 기준이 된다 — 오른쪽에서 왼쪽으로 흐른다. 방향이 뒤집힌 유일한
   화살표라, 이 장면이 앞의 장면들과 다른 이야기라는 신호도 된다.
   두 단 사이는 86px 뿐이라 화살표와 말을 거기 끼우면 양쪽 글을 덮는다 —
   왼쪽 단 아래 빈자리로 내린다. */
const FEED_Y = 528
const feedArrow = `
      <g id="sh-feed">
        ${arrow(R.x - 20, FEED_Y, L.x + 386, FEED_Y, { tone: C.bagInk, sw: 3.5, dashed: true })}
        ${chip(L.x + 210, FEED_Y, t.feedLabel, { tone: C.bagInk })}
      </g>`

const blank = `
      <g id="sh-blank">
        ${chip(R.x + R.w - 170, R.y + 78 + 62 * (t.rows.length + 1) + 108, t.blankLabel, { tone: C.blockInk })}
        ${note(R.x + R.w - 170, R.y + 78 + 62 * (t.rows.length + 1) + 152, t.blankSub)}
      </g>`

export function sceneSharedSvg() {
  return svgWrap({
    id: 'scene-shared',
    viewBox: VB,
    title: t.svgTitle,
    desc: t.svgDesc,
    body: `
      ${ours}
      ${theirs}
      ${feedArrow}
      ${blank}
      <text x="${L.x}" y="644" class="d-label" style="fill:${C.blockInk}">${t.emptyWarn}</text>`,
  })
}

export function sceneSharedAnim(root, gsap, ScrollTrigger) {
  const tl = gsap.timeline({
    scrollTrigger: { trigger: root, start: 'top 68%', once: true },
    defaults: { ease: 'power3.out' },
  })
  tl.from('#sh-ours', { opacity: 0, x: -24, duration: 0.65 })
    .from('#sh-theirs', { opacity: 0, x: 24, duration: 0.65 }, '-=0.45')
    .from('#sh-feed', { opacity: 0, duration: 0.6 }, '-=0.15')
    /* 빈 칸 경고는 맨 나중 — 표를 먼저 읽어야 '비었다' 가 사건이 된다. */
    .from('#sh-blank', { opacity: 0, y: -14, duration: 0.55 }, '+=0.1')
  ScrollTrigger.refresh()
}
