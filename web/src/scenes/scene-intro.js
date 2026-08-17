/**
 * SCENE 01 · 인트로 — 사용자가 실제로 보는 화면.
 *
 * 이 장면만 아이소메트릭이 아니라 납작한 UI 다.  의도한 대비다:
 *   여기(평면) = 이용자에게 보이는 전부,  이후(아이소메트릭) = 그 뒤에서 도는 기계.
 *
 * ChatGPT·Claude 를 쓸 때 실제로 보는 배치를 그대로 따른다 — 왼쪽 대화 목록,
 * 상단 모델 선택, 가운데 아래 둥근 입력창, 그 밑 면책 문구.  진입 지점이
 * 어디인지 한눈에 알아보는 게 이 장면의 목적이라 로고 대신 배치로 재현한다.
 *
 * 입력창에는 장학금 대상자 명단이 표째로 붙여 넣어져 있고, 오른쪽으로 그 값들이
 * 화면 밖으로 빠져나간다.
 *
 * M3 애니메이션 대상 id:
 *   #si-caret        입력 커서
 *   #si-send         전송 버튼
 *   #si-leak-1 … 3   화면 밖으로 빠져나가는 자료
 *   #si-trail-1 … 3  그 궤적
 */

import { callout, svgWrap } from './_svg.js'
import { sceneIntro as t } from '../content/strings.js'

/* 이 창만 밝은 색이다.  ChatGPT·Claude 의 기본이 라이트 모드라 그쪽이 실제
   화면에 가깝고, 어두운 페이지 위에 놓이면 "이용자가 들여다보는 화면" 이라는
   점도 더 분명해진다.  아래 색들은 사이트 디자인 시스템이 아니라 남의 UI 를
   묘사하기 위한 값이라 이 파일 안에만 둔다. */
const UI = {
  bg: '#ffffff',
  side: '#f7f7f5',
  line: '#e5e5e1',
  lineSoft: '#eeeeea',
  text: '#1f2023',
  muted: '#6e6e6b',
  faint: '#b9b9b4',
  active: '#ececE8',
  field: '#ffffff',
  send: '#1f2023',
  // 밝은 바탕에서 대비를 확보한 시맨틱 변형 (지면용 #E25749/#F0A63A 의 라이트판)
  hot: '#c4392b',
  warm: '#9a6a0d',
}

/* --- 창 좌표 (화면좌표계) --- */
const WX = 52
const WY = 60
const WW = 952
const WH = 616
const SIDE = 236 // 사이드바 폭
const MX = WX + SIDE // 본문 영역 시작
const MW = WW - SIDE

const isWide = (c) => /[^\x00-\x7F]/.test(c)
const runWidth = (s, f) => [...s].reduce((a, c) => a + f * (isWide(c) ? 1 : 0.55), 0)

/* ------------------------------------------------------------- 사이드바 */

const sidebar = `
      <rect x="${WX}" y="${WY}" width="${SIDE}" height="${WH}" rx="12" fill="${UI.side}" />
      <rect x="${WX + SIDE - 12}" y="${WY}" width="12" height="${WH}" fill="${UI.side}" />
      <path d="M ${MX} ${WY} V ${WY + WH}" stroke="${UI.line}" stroke-width="1.25" />

      <!-- 새 채팅 -->
      <rect x="${WX + 16}" y="${WY + 20}" width="${SIDE - 32}" height="38" rx="10"
            fill="${UI.bg}" stroke="${UI.line}" stroke-width="1.25" />
      <path d="M ${WX + 34} ${WY + 39} h 14 M ${WX + 41} ${WY + 32} v 14"
            stroke="${UI.muted}" stroke-width="1.6" stroke-linecap="round" />
      <text x="${WX + 58}" y="${WY + 45}" style="font-size:15px;fill:${UI.text}">${t.newChat}</text>

      <text x="${WX + 20}" y="${WY + 90}"
            letter-spacing="2" style="font-size:12px;fill:${UI.faint}">${t.historyLabel}</text>

      <!-- 대화 목록. 첫 항목이 지금 열려 있는 대화다. -->
      ${t.history
        .map((label, i) => {
          const y = WY + 104 + i * 34
          const on = i === 0
          return `${
            on
              ? `<rect x="${WX + 12}" y="${y}" width="${SIDE - 24}" height="30" rx="8"
                       fill="${UI.active}" />`
              : ''
          }
      <text x="${WX + 24}" y="${y + 20}" style="font-size:14px;fill:${on ? UI.text : UI.muted}">${label}</text>`
        })
        .join('')}

      <!-- 하단 계정 -->
      <path d="M ${WX + 16} ${WY + WH - 56} H ${WX + SIDE - 16}"
            stroke="${UI.line}" stroke-width="1.25" />
      <circle cx="${WX + 34}" cy="${WY + WH - 30}" r="12" fill="${UI.line}" />
      <text x="${WX + 54}" y="${WY + WH - 25}" style="font-size:14px;fill:${UI.muted}">${t.account}</text>`

/* ----------------------------------------------------- 상단 모델 선택 */

const modelBar = `
      <rect x="${MX + 20}" y="${WY + 18}" width="132" height="34" rx="9"
            fill="${UI.bg}" stroke="${UI.line}" stroke-width="1.25" />
      <text x="${MX + 36}" y="${WY + 40}" font-weight="700" style="font-size:15px;fill:${UI.text}">${t.models[0]}</text>
      <path d="M ${MX + 126} ${WY + 32} l 6 7 l 6 -7" stroke="${UI.muted}" stroke-width="1.6"
            fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <!-- 다른 서비스도 배치는 같다 -->
      <text x="${MX + 172}" y="${WY + 40}" style="font-size:14px;fill:${UI.faint}">/ ${t.models[1]}</text>`

/* --------------------------------------------------------- 붙여 넣은 표

   폭을 추정해 흘리면 강조 구간이 서로 붙는다. 고정 열로 못 박아야 정확하고
   '붙여 넣은 표' 처럼도 읽힌다. */

const FS = 18
const BOX_X = MX + 34
const BOX_W = MW - 68
const BOX_Y = 396
const HEAD_Y = BOX_Y + 42
const COLHDR_Y = BOX_Y + 76
const ROW_Y = [BOX_Y + 104, BOX_Y + 140]

// [열 x, 예상 폭, 강조 종류]
const COLS = [
  [BOX_X + 26, 58, ''],
  [BOX_X + 140, 88, 'warm'],
  [BOX_X + 292, 154, 'hot'],
  [BOX_X + 518, 46, 'warm'],
]
const TONE = { hot: UI.hot, warm: UI.warm }

const cell = (x, w, kind, text, y) => {
  const color = TONE[kind]
  const mark = kind
    ? `<rect x="${x - 5}" y="${y - FS + 1}" width="${w + 10}" height="${FS + 8}" rx="3"
             fill="${color}" opacity="0.14" />
       <rect x="${x - 5}" y="${y + 9}" width="${w + 10}" height="1.5" fill="${color}" />`
    : ''
  return `${mark}<text x="${x}" y="${y}"${
    kind ? ' font-weight="700"' : ''
  } style="font-size:${FS}px;fill:${color || UI.text}">${text}</text>`
}

const composer = `
      <!-- 입력창 -->
      <rect x="${BOX_X}" y="${BOX_Y}" width="${BOX_W}" height="210" rx="16"
            fill="${UI.field}" stroke="${UI.line}" stroke-width="1.5" />
      <text x="${BOX_X + 26}" y="${HEAD_Y}" style="font-size:${FS}px;fill:${UI.text}">${t.promptHead}</text>
      ${t.promptCols
        .map(
          (c, i) =>
            `<text x="${COLS[i][0]}" y="${COLHDR_Y}"
                   letter-spacing="1" style="font-size:12px;fill:${UI.faint}">${c}</text>`,
        )
        .join('')}
      ${t.promptRows
        .map((row, r) =>
          row.map((v, i) => cell(COLS[i][0], COLS[i][1], COLS[i][2], v, ROW_Y[r])).join(''),
        )
        .join('')}
      <rect id="si-caret" x="${COLS[3][0] + COLS[3][1] + 10}" y="${ROW_Y[1] - FS + 2}"
            width="2" height="${FS + 4}" fill="${UI.text}" />

      <!-- 첨부 / 전송 -->
      <circle cx="${BOX_X + 30}" cy="${BOX_Y + 180}" r="14" fill="none"
              stroke="${UI.faint}" stroke-width="1.4" />
      <path d="M ${BOX_X + 23} ${BOX_Y + 180} h 14 M ${BOX_X + 30} ${BOX_Y + 173} v 14"
            stroke="${UI.muted}" stroke-width="1.5" stroke-linecap="round" />
      <g id="si-send">
        <circle cx="${BOX_X + BOX_W - 34}" cy="${BOX_Y + 174}" r="19" fill="${UI.send}" />
        <path d="M ${BOX_X + BOX_W - 34} ${BOX_Y + 183} v -17 m -7 7 l 7 -7 l 7 7"
              stroke="${UI.bg}" stroke-width="2.2" fill="none"
              stroke-linecap="round" stroke-linejoin="round" />
      </g>

      <!-- 면책 문구 -->
      <text x="${MX + MW / 2}" y="${BOX_Y + 244}" text-anchor="middle" style="font-size:12px;fill:${UI.faint}">${t.disclaimer}</text>`

/* 대화 영역은 아직 비어 있다 — 보내기 직전의 순간이다. */
const emptyState = `
      <text x="${MX + MW / 2}" y="${WY + 210}" text-anchor="middle" style="font-size:24px;fill:${UI.faint}">${t.placeholder}</text>`

const chatWindow = `
      <g id="si-window">
        <rect x="${WX}" y="${WY}" width="${WW}" height="${WH}" rx="12"
              fill="${UI.bg}" stroke="${UI.line}" stroke-width="1.5" />
        ${sidebar}
        ${modelBar}
        ${emptyState}
        ${composer}
      </g>`

/* ------------------------------------------------- 화면 밖으로 나가는 자료 */

const LEAK_Y = [188, 296, 404]
const LX0 = WX + WW + 16

const leaks = t.leaks
  .map((label, i) => {
    const y = LEAK_Y[i]
    const w = runWidth(label, 15) + 32
    return `
      <path id="si-trail-${i + 1}" d="M ${LX0} ${y} H ${LX0 + 286}"
            stroke="#E25749" stroke-width="1.25" stroke-dasharray="6 7"
            opacity="0.4" fill="none" />
      <g id="si-leak-${i + 1}">
        <rect x="${LX0 + 30}" y="${y - 16}" width="${w.toFixed(1)}" height="32" rx="16"
              fill="#131418" stroke="#E25749" stroke-width="1.25" />
        <text x="${(LX0 + 30 + w / 2).toFixed(1)}" y="${y + 5}" text-anchor="middle" style="font-size:15px;fill:#E25749">${label}</text>
      </g>`
  })
  .join('')

const OUT_X = LX0 + 168
const outside = `
      <path d="M ${OUT_X} 96 V 620" stroke="#9C9B93" stroke-width="1.25"
            stroke-dasharray="9 7" opacity="0.5" fill="none" />
      <text x="${OUT_X + 12}" y="646"
            letter-spacing="2" style="font-size:15px;fill:#9C9B93">${t.outside}</text>`

/* ------------------------------------------------------------------ 조립 */

export function sceneIntroSvg() {
  const body = `
      ${outside}
      ${leaks}
      ${chatWindow}

      ${callout({
        n: '01',
        from: [COLS[2][0] + 70, ROW_Y[1] + 16],
        to: [MX + 40, 728],
        side: 'right',
        title: t.paste,
        sub: t.pasteSub,
        cls: 'co-title--block',
      })}
      ${callout({
        n: '02',
        from: [WX + WW, WY + 92],
        to: [WX + WW + 74, 60],
        side: 'right',
        title: t.visible,
        sub: t.visibleSub,
      })}
      ${callout({
        n: '03',
        from: [LX0 + 232, LEAK_Y[2]],
        to: [LX0 + 56, 700],
        side: 'right',
        title: t.leaving,
        sub: t.leavingSub,
        cls: 'co-title--block',
      })}`

  return svgWrap({
    id: 'si',
    viewBox: '0 0 1440 780',
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
    scale: 1.08,
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
    tl.fromTo(el, { x: -44, opacity: 0 }, { x: 0, opacity: 1, duration: 1 }, i * 1.3)
      .to(el, { x: 122, duration: 3.4 }, i * 1.3 + 1)
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
