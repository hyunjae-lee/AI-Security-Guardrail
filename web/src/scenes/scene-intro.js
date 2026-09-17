/**
 * SCENE 01 · 인트로 — "무엇을 입력하든, 막는 것이 없습니다"
 *
 * 문장 하나: **입력창과 국경 밖 사이에 아무것도 없다.**
 * 그래서 그림은 왼쪽 채팅창, 오른쪽 지구본, 그 사이를 잇는 한 줄이 전부다.
 * 그 줄 위에 무엇이 실려 나가는지를 세 조각으로 얹어, 검사 없이 지나간다는
 * 것을 말이 아니라 자리로 보인다.
 *
 * 채팅창 색은 이 파일 안에만 둔다 — 우리 디자인 시스템이 아니라 **남의 UI 를
 * 묘사한 것**이다.  ChatGPT·Claude 의 기본이 라이트 모드라 그쪽에 맞춘다.
 */

import { svgWrap } from './_svg.js'
import { C } from './_palette.js'
import { VB, arrow, bag, chip, card, gate, globe, note, title } from './_flat.js'
import { sceneIntro as t } from '../content/strings.js'

const UI = {
  line: '#e5e5e1',
  text: '#1f2023',
  muted: '#6e6e6b',
  field: '#ffffff',
  hot: '#c4392b', // 밝은 바탕에서 대비를 확보한 시맨틱 변형
  hotBg: '#fdeceb',
}

const WIN = { x: 70, y: 96, w: 610, h: 430 }
const GHOST_X = 950 // 검사대가 있어야 할 자리
const LEAK_X = 790 // 무엇이 실려 나가는지 — 게이트 자리와 겹치지 않게 앞쪽에 세운다
const GLOBE = { x: 1236, y: 314, r: 100 }
const LINE_Y = 300

/* 입력창 — 실제로 붙여 넣는 것이 무엇인지 네 열로 보인다.
   주민등록번호만 붉게 둔다. 전부 강조하면 아무것도 강조되지 않는다. */
const COLS = [0, 168, 300, 500]
const chatWindow = `
      <g id="si-window">
        ${card(WIN.x, WIN.y, WIN.w, WIN.h, { fill: UI.field, stroke: UI.line, r: 16 })}
        <path d="M ${WIN.x} ${WIN.y + 62} H ${WIN.x + WIN.w}" stroke="${UI.line}" stroke-width="1.5" fill="none" />
        <text x="${WIN.x + 28}" y="${WIN.y + 40}" class="d-label" style="fill:${UI.muted}">${t.models[0]} · ${t.models[1]}</text>

        <text x="${WIN.x + 28}" y="${WIN.y + 110}" class="d-label" style="fill:${UI.text}">${t.promptHead}</text>

        ${t.promptCols
          .map(
            (c, i) => `
        <text x="${WIN.x + 34 + COLS[i]}" y="${WIN.y + 168}" class="d-note" style="fill:${UI.muted}">${c}</text>`,
          )
          .join('')}
        ${t.promptRows
          .map((r, ri) =>
            r
              .map((v, ci) => {
                const x = WIN.x + 34 + COLS[ci]
                const y = WIN.y + 214 + ri * 52
                const hot = ci === 2
                return `${
                  hot
                    ? `<rect x="${x - 8}" y="${y - 26}" width="212" height="38" rx="8" fill="${UI.hotBg}" />`
                    : ''
                }
        <text x="${x}" y="${y}" class="d-label" style="fill:${hot ? UI.hot : UI.text}"${hot ? ' font-weight="700"' : ''}>${v}</text>`
              })
              .join(''),
          )
          .join('')}

        <rect x="${WIN.x + 28}" y="${WIN.y + WIN.h - 84}" width="${WIN.w - 56}" height="52" rx="26"
              fill="${C.panelSoft}" stroke="${UI.line}" stroke-width="1.5" />
        <text x="${WIN.x + 54}" y="${WIN.y + WIN.h - 50}" class="d-note" style="fill:${UI.muted}">${t.placeholder}</text>
        <circle cx="${WIN.x + WIN.w - 56}" cy="${WIN.y + WIN.h - 58}" r="18" fill="${UI.text}" />
        <path d="M ${WIN.x + WIN.w - 56} ${WIN.y + WIN.h - 66} v 16 M ${WIN.x + WIN.w - 64} ${WIN.y + WIN.h - 58}
                 l 8 -8 l 8 8" stroke="#ffffff" stroke-width="2.2" fill="none" stroke-linecap="round" />
      </g>`

/* 검사대가 있어야 할 자리 — 비어 있다. 이 장면의 논지다. */
const nothing = `
      ${gate(GHOST_X, LINE_Y, 0.9, { tone: C.block, ghost: true, id: 'si-ghost' })}
      ${chip(GHOST_X, LINE_Y + 170, t.paste, { tone: C.blockInk, id: 'si-nocheck' })}
      ${note(GHOST_X, LINE_Y + 216, t.pasteSub)}`

/* 무엇이 실려 나가는지 — 세 조각. 선 위에 얹어 '지나가는 중' 으로 읽히게 한다. */
const leaving = `
      ${arrow(WIN.x + WIN.w + 24, LINE_Y, GLOBE.x - GLOBE.r - 22, LINE_Y, {
        tone: C.block,
        sw: 4,
        dashed: true,
        id: 'si-flow',
      })}
      ${bag(WIN.x + WIN.w + 74, LINE_Y, 0.58, { tone: C.block, id: 'si-bag' })}
      ${t.leaks
        .map(
          (l, i) => `
      ${chip(LEAK_X, 150 + i * 52, l, { tone: C.blockInk, id: `si-leak-${i + 1}` })}`,
        )
        .join('')}`

/* 결론은 지구본 위에 얹는다 — 아래에 두면 게이트 자리의 말과 같은 높이에서
   부딪힌다. 오른쪽 끝에 맞춰 화면 밖으로 나가지 않게 한다. */
const outland = `
      ${globe(GLOBE.x, GLOBE.y, GLOBE.r, { id: 'si-globe' })}
      <text x="1390" y="${GLOBE.y - GLOBE.r - 66}" text-anchor="end" class="d-title"
            style="fill:${C.blockInk}">${t.leaving}</text>
      ${note(1390, GLOBE.y - GLOBE.r - 32, t.leavingSub, { anchor: 'end' })}
      ${note(GLOBE.x, GLOBE.y + GLOBE.r + 44, t.outside)}`

export function sceneIntroSvg() {
  return svgWrap({
    id: 'scene-intro',
    viewBox: VB,
    title: t.svgTitle,
    desc: t.svgDesc,
    body: `
      ${chatWindow}
      ${leaving}
      ${nothing}
      ${outland}
      ${note(WIN.x + WIN.w / 2, WIN.y + WIN.h + 48, t.visibleSub)}`,
  })
}

export function sceneIntroAnim(root, gsap, ScrollTrigger) {
  const tl = gsap.timeline({
    scrollTrigger: { trigger: root, start: 'top 68%', once: true },
    defaults: { ease: 'power3.out' },
  })
  tl.from('#si-window', { opacity: 0, y: 22, duration: 0.7 })
    /* 자료가 먼저 빠져나가고, 그 다음에 '검사가 없다' 가 뜬다.
       순서를 뒤집으면 경고가 먼저 와서 장면이 설명문이 된다. */
    .from('#si-flow, #si-bag', { opacity: 0, x: -60, duration: 0.7 }, '-=0.2')
    .from('[id^="si-leak-"]', { opacity: 0, x: -20, duration: 0.5, stagger: 0.09 }, '-=0.35')
    .from('#si-globe', { opacity: 0, scale: 0.9, transformOrigin: '50% 50%', duration: 0.7 }, '-=0.4')
    .from('#si-ghost', { opacity: 0, scale: 0.92, transformOrigin: '50% 100%', duration: 0.6 }, '-=0.15')
    .from('#si-nocheck', { opacity: 0, y: -12, duration: 0.5 }, '-=0.3')
  ScrollTrigger.refresh()
}
