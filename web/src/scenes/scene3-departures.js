/**
 * SCENE 03 · 출국층 단면
 *
 * 터미널 위층을 잘라 본 단면.  컨베이어에 오른 가방이
 *   [여권·비자 확인] → [X-ray 스캐너] → [게이트 3갈래: 통과 / 물건 제거 후 통과 / 탑승 거부]
 * 순서로 흐르고, 전략물자·위조 여권이 잡히면 게이트를 건너뛰고 즉시 거부 통로로 빠진다.
 *
 * M3 애니메이션 대상 id:
 *   #s3-bag-1 … #s3-bag-3     컨베이어 위 가방
 *   #s3-belt-teeth            벨트 무늬 (좌→우 반복 이동)
 *   #s3-beam / #s3-beam-glow  X-ray 스캔 빔 (상하 스윕)
 *   #s3-screen-sweep          판독 화면 주사선
 *   #s3-xray-idcard / #s3-xray-note   화면에 비친 내용물 (적발 시 점멸)
 *   #s3-path-allow|mask|block 게이트 3갈래 모션 경로
 *   #s3-lamp-allow|mask|block 게이트 표시등
 *   #s3-path-override / #s3-override-outlet  즉시 거부 우회로
 */

import { bag, label, leader, person, svgWrap } from './_svg.js'
import { scene3 as t } from '../content/strings.js'

/* --- 층 기준선 -------------------------------------------------------- */
const CEIL = 88 // 천장 슬래브 상단
const FLOOR = 570 // 바닥 슬래브 상단
const BELT = 452 // 컨베이어 상면
const PERSON = 1.75 // 층고 대비 사람 배율 (머리가 벨트 위로 올라오도록)
const BAG = 1.15 // 사람 기준 가방 배율

/** 단면임을 드러내는 톱니 절단면. */
const cutEdge = (x) => {
  const pts = []
  for (let y = CEIL + 22; y <= FLOOR; y += 26) {
    pts.push(`${x + (pts.length % 2 ? 7 : -7)} ${y}`)
  }
  return `<polyline points="${pts.join(' ')}" fill="none" stroke="#3C3E46"
              stroke-width="1.25" opacity="0.7" />`
}

/** 바닥 아래(아래층 방향)가 잘려 나갔음을 나타내는 해칭. */
const hatch = () => {
  const lines = []
  for (let x = 100; x < 1350; x += 22) {
    lines.push(`<path d="M ${x} 630 L ${x + 20} 598" stroke="#3C3E46"
                 stroke-width="1" opacity="0.45" />`)
  }
  return lines.join('\n        ')
}

const conveyor = () => {
  const parts = []
  for (let x = 300; x <= 1004; x += 236) {
    parts.push(`<rect class="bldg" x="${x - 4}" y="468" width="8" height="${FLOOR - 468}" />`)
  }
  for (let x = 190; x <= 1010; x += 68) {
    parts.push(`<circle cx="${x}" cy="476" r="6" fill="none" stroke="#3C3E46" stroke-width="1.25" />`)
  }
  return parts.join('\n        ')
}

const beltTeeth = () => {
  const ticks = []
  for (let x = 182; x <= 1012; x += 40) {
    ticks.push(`<path d="M ${x} 456 V 464" stroke="#3C3E46" stroke-width="2" />`)
  }
  return `<g id="s3-belt-teeth">
        ${ticks.join('\n        ')}
      </g>`
}

/* --- 게이트 3갈래 ------------------------------------------------------ */
const LANES = [
  { key: 'allow', cy: 330, color: '#7FBF57', text: t.gateAllow },
  { key: 'mask', cy: 460, color: '#F0A63A', text: t.gateMask },
  { key: 'block', cy: 540, color: '#E25749', text: t.gateBlock },
]

const LANE_PATH = {
  allow: 'M 1020 460 C 1082 460 1104 330 1176 330',
  mask: 'M 1020 460 L 1176 460',
  block: 'M 1020 460 C 1082 460 1104 540 1176 540',
}

const gates = () =>
  LANES.map(
    ({ key, cy, color, text }) => `
      <g class="gate gate--${key}">
        <path d="${LANE_PATH[key]}" fill="none" stroke="#3C3E46" stroke-width="10" stroke-linecap="round" />
        <path id="s3-path-${key}" d="${LANE_PATH[key]}" fill="none" stroke="${color}"
              stroke-width="2" stroke-linecap="round" opacity="0.9" />
        <rect x="1176" y="${cy - 30}" width="68" height="60" rx="4"
              fill="none" stroke="${color}" stroke-width="2" />
        <path d="M 1176 ${cy - 30} H 1244" stroke="${color}" stroke-width="5" />
        <circle id="s3-lamp-${key}" cx="1210" cy="${cy - 12}" r="10" fill="${color}" />
        <text x="1258" y="${cy + 6}" class="lbl-title" fill="${color}">${text}</text>
      </g>`,
  ).join('')

/* --- 즉시 거부 우회로 (전략물자·위조 여권) ---------------------------- */
const override = `
      <g id="s3-override">
        <path id="s3-path-override" d="M 752 362 C 796 240 862 194 942 192 L 1140 194"
              fill="none" stroke="#E25749" stroke-width="2.5"
              stroke-dasharray="10 8" stroke-linecap="round" />
        <path d="M 1128 186 L 1144 194 L 1128 202 Z" fill="#E25749" />
        <g id="s3-override-outlet">
          <rect x="1146" y="160" width="98" height="68" rx="4"
                fill="none" stroke="#E25749" stroke-width="2" />
          <path d="M 1180 178 L 1210 210 M 1210 178 L 1180 210"
                stroke="#E25749" stroke-width="3" stroke-linecap="round" />
        </g>
      </g>`

/* --- X-ray 판독 화면 --------------------------------------------------- */
const screen = `
      <g id="s3-screen">
        <path class="leader" d="M 610 318 L 640 362" />
        <rect x="498" y="168" width="224" height="150" rx="4"
              fill="#0F1013" stroke="#43BC9C" stroke-width="2" />
        <rect x="512" y="182" width="196" height="122" fill="#131418" />
        <rect id="s3-screen-sweep" x="512" y="188" width="196" height="2"
              fill="#43BC9C" opacity="0.5" />
        <!-- 화면에 비친 가방과 그 내용물 -->
        <rect x="540" y="198" width="144" height="90" rx="12"
              fill="none" stroke="#43BC9C" stroke-width="1.5" opacity="0.55" />
        <path d="M 596 198 C 596 186 628 186 628 198" fill="none"
              stroke="#43BC9C" stroke-width="1.5" opacity="0.55" />
        <g id="s3-xray-idcard">
          <rect x="558" y="214" width="48" height="32" rx="3"
                fill="none" stroke="#F0A63A" stroke-width="1.75" />
          <circle cx="571" cy="226" r="6" fill="none" stroke="#F0A63A" stroke-width="1.5" />
          <path d="M 583 222 H 600 M 583 232 H 596" stroke="#F0A63A" stroke-width="1.5" />
        </g>
        <g id="s3-xray-note">
          <path d="M 628 214 L 664 208 L 670 246 L 634 252 Z"
                fill="none" stroke="#E25749" stroke-width="1.75" />
          <path d="M 636 224 H 660 M 636 234 H 656" stroke="#E25749" stroke-width="1.5" />
        </g>
        <text x="582" y="272" text-anchor="middle" fill="#F0A63A"
              font-size="13">${t.screenIdCard}</text>
        <text x="650" y="272" text-anchor="middle" fill="#E25749"
              font-size="13">${t.screenNote}</text>
      </g>`

export function scene3Svg() {
  const body = `
      <!-- 터미널 껍데기 (컷어웨이) -->
      <rect class="land" x="90" y="${CEIL}" width="1260" height="22" />
      <rect class="land" x="90" y="${FLOOR}" width="1260" height="26" />
      ${hatch()}
      ${cutEdge(90)}
      ${cutEdge(1350)}

      <!-- 컨베이어 구조 -->
      ${conveyor()}

      <!-- 여권·비자 확인대 -->
      <g id="s3-passport">
        <path class="gear" d="M 250 452 L 250 344 L 380 344 L 380 452" />
        <rect class="gear" x="298" y="352" width="34" height="26" rx="3" />
        <path class="gear" d="M 304 365 H 326" />
      </g>

      <!-- X-ray 터널 -->
      <g id="s3-xray">
        <rect class="land" x="520" y="362" width="240" height="140" rx="6" />
        <rect class="gear" x="520" y="362" width="240" height="140" rx="6" />
        <path d="M 526 418 V 452 M 536 418 V 452 M 546 418 V 452"
              stroke="#3C3E46" stroke-width="2" />
        <path d="M 734 418 V 452 M 744 418 V 452 M 754 418 V 452"
              stroke="#3C3E46" stroke-width="2" />
      </g>

      <!-- 직원 (벨트 뒤에 선다) -->
      ${person(412, FLOOR, PERSON)}
      ${person(848, FLOOR, PERSON)}

      <!-- 벨트 -->
      <rect x="170" y="${BELT}" width="850" height="16" rx="8"
            fill="#23262E" stroke="#3C3E46" stroke-width="1.25" />
      ${beltTeeth()}

      <!-- 스캔 빔 -->
      <rect id="s3-beam-glow" x="634" y="370" width="12" height="124"
            fill="#43BC9C" opacity="0.14" />
      <path id="s3-beam" d="M 640 370 V 494" stroke="#43BC9C"
            stroke-width="2.5" stroke-linecap="round" opacity="0.85" />

      <!-- 가방 -->
      ${bag('s3-bag-1', 202, BELT, BAG)}
      ${bag('s3-bag-2', 476, BELT, BAG)}
      ${bag('s3-bag-3', 640, BELT, BAG)}

      ${screen}
      ${gates()}
      ${override}

      <!-- 라벨 -->
      ${label({ x: 110, y: 66, title: t.floor })}

      ${leader('M 172 508 L 196 476')}
      ${label({ x: 108, y: 528, title: t.conveyor, sub: t.conveyorSub })}

      ${leader('M 315 326 L 315 340')}
      ${label({ x: 315, y: 294, title: t.passport, sub: t.passportSub, anchor: 'middle' })}

      ${leader('M 640 502 L 640 514')}
      ${label({ x: 640, y: 534, title: t.xray, sub: t.xraySub, anchor: 'middle' })}

      ${leader('M 452 200 L 498 200')}
      ${label({ x: 446, y: 204, title: t.screen, anchor: 'end' })}

      ${leader('M 1210 278 L 1210 298')}
      ${label({ x: 1210, y: 268, title: t.gates, anchor: 'middle' })}

      ${label({ x: 1136, y: 150, title: t.override, sub: t.overrideSub, anchor: 'end', cls: 'lbl-block' })}`

  return svgWrap({
    id: 's3',
    viewBox: '0 0 1440 780',
    title: t.svgTitle,
    desc: t.svgDesc,
    body,
  })
}
