/**
 * SCENE 01 · 인트로 — 사용자가 실제로 보는 화면.
 *
 * 이 장면만 아이소메트릭이 아니라 납작한 UI 다.  의도한 대비다:
 *   여기(평면) = 이용자에게 보이는 전부,  이후(아이소메트릭) = 그 뒤에서 도는 기계.
 *
 * 채팅창 입력란에 장학금 대상자 명단이 학번·주민등록번호·학점째로 붙여 넣어져
 * 있고, 오른쪽으로 그 값들이 화면 밖으로 빠져나간다.  "무심코 붙여 넣는다" 와
 * "그게 그대로 나간다" 를 한 화면에서 보여 주는 것이 이 장면의 전부다.
 *
 * M3 애니메이션 대상 id:
 *   #si-caret        입력 커서
 *   #si-send         전송 버튼
 *   #si-leak-1 … 3   화면 밖으로 빠져나가는 자료
 *   #si-trail-1 … 3  그 궤적
 */

import { callout, svgWrap } from './_svg.js'
import { sceneIntro as t } from '../content/strings.js'

/* 창 좌표 (화면좌표계) */
const WX = 64
const WY = 96
const WW = 812
const WH = 508
const BAR = 54 // 제목 표시줄 높이

/* 한글 1em, ASCII 0.52em 로 잡은 폭 추정. 강조 사각형을 글자에 맞추는 데만 쓴다. */
const isWide = (c) => /[^\x00-\x7F]/.test(c)
const runWidth = (s, f) => [...s].reduce((a, c) => a + f * (isWide(c) ? 1 : 0.52), 0)

/* ------------------------------------------------------------- 붙여 넣은 글

   표 데이터라 흐름 배치 대신 고정 열로 놓는다.  폭을 추정해 흘리면 강조 구간이
   서로 붙어 버려서, 열 위치를 못 박는 편이 정확하고 '붙여 넣은 표' 처럼 읽힌다. */

const FS = 19
const HEAD_Y = 420
const ROW_Y = [488, 526]
// [열 x, 예상 폭, 강조 종류]
const COLS = [
  [WX + 44, 60, ''],
  [WX + 168, 92, 'warm'],
  [WX + 328, 162, 'hot'],
  [WX + 566, 48, 'warm'],
]

const TONE = { hot: '#E25749', warm: '#F0A63A' }

const cell = (x, w, kind, text, y) => {
  const color = TONE[kind]
  const mark = kind
    ? `<rect x="${x - 5}" y="${y - FS + 1}" width="${w + 10}" height="${FS + 8}" rx="3"
             fill="${color}" opacity="0.14" />
       <rect x="${x - 5}" y="${y + 10}" width="${w + 10}" height="1.5" fill="${color}" />`
    : ''
  return `${mark}<text x="${x}" y="${y}" font-size="${FS}" fill="${color || '#ECEAE3'}"${
    kind ? ' font-weight="700"' : ''
  }>${text}</text>`
}

const promptBody = `
        <text x="${WX + 44}" y="${HEAD_Y}" font-size="${FS}" fill="#ECEAE3">${t.promptHead}</text>
        ${t.promptCols
          .map(
            (c, i) =>
              `<text x="${COLS[i][0]}" y="${ROW_Y[0] - 26}" font-size="13"
                     fill="#5A5F6B" letter-spacing="1">${c}</text>`,
          )
          .join('')}
        ${t.promptRows
          .map((row, r) =>
            row
              .map((v, i) => cell(COLS[i][0], COLS[i][1], COLS[i][2], v, ROW_Y[r]))
              .join(''),
          )
          .join('')}`

const caretX = COLS[3][0] + COLS[3][1] + 10

/* ----------------------------------------------------------------- 채팅창 */

const chatWindow = `
      <g id="si-window">
        <rect x="${WX}" y="${WY}" width="${WW}" height="${WH}" rx="10"
              fill="#1C1E24" stroke="#3C3E46" stroke-width="1.5" />
        <path d="M ${WX} ${WY + BAR} H ${WX + WW}" stroke="#3C3E46" stroke-width="1.25" />
        ${[0, 1, 2]
          .map(
            (i) =>
              `<circle cx="${WX + 26 + i * 18}" cy="${WY + BAR / 2}" r="5" fill="#3C3E46" />`,
          )
          .join('')}
        <text x="${WX + 92}" y="${WY + BAR / 2 + 6}" font-size="16" fill="#9C9B93">${t.windowTitle}</text>
        <!-- 서비스 탭 — 어느 서비스를 쓰든 화면은 똑같이 생겼다 -->
        ${t.services
          .map((name, i) => {
            const w = 108
            const x = WX + WW - 24 - (t.services.length - i) * (w + 8)
            const on = i === 0
            return `<rect x="${x}" y="${WY + 12}" width="${w}" height="30" rx="15"
                          fill="${on ? '#43BC9C' : 'none'}" fill-opacity="${on ? 0.16 : 0}"
                          stroke="${on ? '#43BC9C' : '#3C3E46'}" stroke-width="1.25" />
                    <text x="${x + w / 2}" y="${WY + 32}" text-anchor="middle" font-size="15"
                          fill="${on ? '#43BC9C' : '#9C9B93'}">${name}</text>`
          })
          .join('')}
        <text x="${WX + WW / 2}" y="${WY + 190}" text-anchor="middle" font-size="20"
              fill="#3C3E46">${t.placeholder}</text>
        <!-- 입력란 -->
        <rect x="${WX + 28}" y="392" width="${WW - 56}" height="164" rx="8"
              fill="#131418" stroke="#454954" stroke-width="1.25" />
        ${promptBody}
        <rect id="si-caret" x="${caretX}" y="${ROW_Y[1] - FS + 2}"
              width="2" height="${FS + 4}" fill="#F0A63A" />
        <g id="si-send">
          <circle cx="${WX + WW - 62}" cy="518" r="21" fill="#43BC9C" />
          <path d="M ${WX + WW - 70} 518 h 16 m -6 -6 l 6 6 l -6 6"
                stroke="#131418" stroke-width="2.2" fill="none"
                stroke-linecap="round" stroke-linejoin="round" />
        </g>
      </g>`

/* ------------------------------------------------- 화면 밖으로 나가는 자료 */

const LEAK_Y = [190, 300, 410]

const leaks = t.leaks
  .map((label, i) => {
    const y = LEAK_Y[i]
    const x0 = WX + WW + 18
    const w = runWidth(label, 16) + 34
    return `
      <path id="si-trail-${i + 1}" d="M ${x0} ${y} H ${x0 + 300}"
            stroke="#E25749" stroke-width="1.25" stroke-dasharray="6 7"
            opacity="0.4" fill="none" />
      <g id="si-leak-${i + 1}">
        <rect x="${x0 + 34}" y="${y - 17}" width="${w.toFixed(1)}" height="34" rx="17"
              fill="#131418" stroke="#E25749" stroke-width="1.25" />
        <text x="${(x0 + 34 + w / 2).toFixed(1)}" y="${y + 6}" text-anchor="middle"
              font-size="16" fill="#E25749">${label}</text>
      </g>`
  })
  .join('')

/* 화면 경계 — 여기부터가 학교 밖 */
const OUT_X = WX + WW + 176
const outside = `
      <path d="M ${OUT_X} 128 V 576" stroke="#9C9B93" stroke-width="1.25"
            stroke-dasharray="9 7" opacity="0.5" fill="none" />
      <text x="${OUT_X + 14}" y="600" font-size="16" fill="#9C9B93"
            letter-spacing="2">${t.outside}</text>`

/* ------------------------------------------------------------------ 조립 */

export function sceneIntroSvg() {
  const body = `
      ${outside}
      ${leaks}
      ${chatWindow}

      ${callout({
        n: '01',
        from: [COLS[2][0] + 60, ROW_Y[1] + 16],
        to: [WX + 96, 664],
        side: 'right',
        title: t.paste,
        sub: t.pasteSub,
        cls: 'co-title--block',
      })}
      ${callout({
        n: '02',
        from: [WX + WW, WY + BAR],
        to: [WX + WW + 88, 74],
        side: 'right',
        title: t.visible,
        sub: t.visibleSub,
      })}
      ${callout({
        n: '03',
        from: [WX + WW + 250, LEAK_Y[2]],
        to: [WX + WW + 150, 640],
        side: 'right',
        title: t.leaving,
        sub: t.leavingSub,
        cls: 'co-title--block',
      })}`

  return svgWrap({
    id: 'si',
    viewBox: '0 0 1440 720',
    title: t.svgTitle,
    desc: t.svgDesc,
    body,
  })
}

/* ==========================================================================
   M3 — 커서가 깜빡이고 전송 버튼이 맥동하는 사이,
   자료는 계속 화면 밖으로 흘러 나간다.
   ========================================================================== */

export function sceneIntroAnim(root, gsap) {
  gsap.to(root.querySelector('#si-caret'), {
    opacity: 0,
    duration: 0.5,
    repeat: -1,
    yoyo: true,
    ease: 'steps(1)',
  })

  gsap.to(root.querySelector('#si-send'), {
    scale: 1.09,
    transformOrigin: '50% 50%',
    duration: 1.1,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true,
  })

  const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } })
  t.leaks.forEach((_, i) => {
    const el = root.querySelector(`#si-leak-${i + 1}`)
    if (!el) return
    tl.fromTo(el, { x: -46, opacity: 0 }, { x: 0, opacity: 1, duration: 1 }, i * 1.3)
      .to(el, { x: 128, duration: 3.4 }, i * 1.3 + 1)
      .to(el, { opacity: 0, duration: 0.8 }, i * 1.3 + 3.6)
  })

  gsap.to(root.querySelectorAll('[id^="si-trail-"]'), {
    strokeDashoffset: -26,
    duration: 1.6,
    ease: 'none',
    repeat: -1,
  })

  return tl
}
