/**
 * SCENE 02 · 조감도
 *
 * 왼쪽 = 캠퍼스 영토(건물 실루엣 + 단말 4종), 오른쪽 = 외부 AI 대륙(거대 공장),
 * 그 사이 유일한 통로로 공항 터미널.  캠퍼스 각지에서 출발한 가방들이 하나의
 * 터미널로 모여든다.
 *
 * M3 애니메이션 대상 id:
 *   #s2-bag-1 … #s2-bag-5   경로를 따라 터미널로 모여드는 가방
 *   #s2-route-phone|tablet|laptop|pc   위 가방들이 탈 모션 경로
 *   #s2-beacon              관제탑 경광등 (점멸)
 *   #s2-flight              국경을 넘는 비행 경로 (stroke-dashoffset)
 *   #s2-smoke-1 … #s2-smoke-3  공장 연기
 */

import { bag, label, leader, svgWrap } from './_svg.js'
import { scene2 as t } from '../content/strings.js'

/** 창문 몇 줄이 들어간 건물 실루엣. */
const building = (x, baseY, w, h, { roof = false } = {}) => {
  const top = baseY - h
  const rows = []
  for (let wy = top + 16; wy < baseY - 14; wy += 22) {
    for (let wx = x + 9; wx < x + w - 8; wx += 16) {
      rows.push(`<rect x="${wx}" y="${wy}" width="6" height="9" fill="#3C3E46" />`)
    }
  }
  return `
      <g class="bldg-group">
        ${roof ? `<path class="bldg" d="M ${x - 6} ${top} L ${x + w / 2} ${top - 26} L ${x + w + 6} ${top} Z" />` : ''}
        <rect class="bldg" x="${x}" y="${top}" width="${w}" height="${h}" rx="2" />
        ${rows.join('\n        ')}
      </g>`
}

/* 단말 4종 — 어느 것에서 띄운 질문이든 가방 한 개가 된다.
   캠퍼스 각지에 흩어 놓아 경로가 한 지점으로 모이는 게 보이도록 한다.
   원점은 바닥 중앙, 화면 면은 호박색(질의)으로 칠한다. */
const device = (id, x, y, shape) => `
      <g id="s2-device-${id}" transform="translate(${x} ${y}) scale(1.35)">
${shape}
      </g>`

const devices = [
  device(
    'phone',
    150,
    640,
    `        <rect class="bldg" x="-12" y="-40" width="24" height="40" rx="5" />
        <rect fill="#F0A63A" opacity="0.6" x="-8" y="-35" width="16" height="26" rx="2" />`,
  ),
  device(
    'tablet',
    232,
    678,
    `        <rect class="bldg" x="-18" y="-46" width="36" height="46" rx="5" />
        <rect fill="#F0A63A" opacity="0.6" x="-13" y="-41" width="26" height="32" rx="2" />`,
  ),
  device(
    'laptop',
    392,
    660,
    `        <rect class="bldg" x="-21" y="-38" width="42" height="30" rx="3" />
        <rect fill="#F0A63A" opacity="0.6" x="-17" y="-34" width="34" height="22" rx="1" />
        <path class="bldg" d="M -28 0 L 28 0 L 23 -8 L -23 -8 Z" />`,
  ),
  device(
    'pc',
    468,
    604,
    `        <rect class="bldg" x="-26" y="-44" width="52" height="36" rx="4" />
        <rect fill="#F0A63A" opacity="0.6" x="-21" y="-39" width="42" height="26" rx="2" />
        <path class="bldg" d="M -7 -8 L 7 -8 L 10 0 L -10 0 Z" />
        <rect class="bldg" x="30" y="-36" width="16" height="36" rx="2" />`,
  ),
].join('')

/* 각 단말에서 터미널 입구(약 648,505)로 모여드는 경로.
   M3 에서 MotionPath 로 가방을 태울 실제 경로이기도 하다. */
const routes = `
      <path id="s2-route-phone"  class="route" d="M 150 618 C 330 594 490 534 666 486" />
      <path id="s2-route-tablet" class="route" d="M 232 656 C 386 648 528 566 668 500" />
      <path id="s2-route-laptop" class="route" d="M 392 640 C 484 630 588 560 670 512" />
      <path id="s2-route-pc"     class="route" d="M 468 584 C 540 574 614 536 672 524" />`

const terminal = `
      <g id="s2-terminal">
        <!-- 관제탑 -->
        <path class="gear" d="M 706 430 L 710 376" />
        <path class="gear" d="M 722 430 L 718 376" />
        <rect class="bldg" x="694" y="350" width="38" height="28" rx="4" />
        <path class="gear" d="M 694 356 H 732" />
        <circle id="s2-beacon" class="gear-fill" cx="713" cy="338" r="7" />
        <!-- 터미널 본동 -->
        <path class="bldg" d="M 684 502 L 684 454 Q 684 428 712 426 L 850 415 Q 876 413 876 440 L 876 490 Z" />
        <path class="gear" d="M 684 454 Q 684 428 712 426 L 850 415 Q 876 413 876 440" />
        <path class="gear" d="M 692 496 H 870" />
        <g fill="#43BC9C" opacity="0.5">
          <rect x="704" y="452" width="9" height="16" />
          <rect x="726" y="450" width="9" height="16" />
          <rect x="748" y="448" width="9" height="16" />
          <rect x="770" y="446" width="9" height="16" />
          <rect x="792" y="444" width="9" height="16" />
          <rect x="814" y="443" width="9" height="16" />
          <rect x="836" y="441" width="9" height="16" />
        </g>
        <!-- 가방이 들어오는 입구 -->
        <path class="gear" d="M 684 476 L 668 478 L 668 494 L 684 492" />
        <!-- 탑승교 3 -->
        <path class="gear" d="M 878 440 L 906 434" />
        <path class="gear" d="M 878 456 L 906 452" />
        <path class="gear" d="M 878 472 L 906 470" />
        <!-- 활주로 -->
        <path class="land" d="M 692 550 L 876 526 L 880 550 L 696 574 Z" />
        <path d="M 710 556 L 862 536" stroke="#9C9B93" stroke-width="1.5"
              stroke-dasharray="14 12" opacity="0.55" fill="none" />
      </g>`

const factory = `
      <g id="s2-factory">
        <!-- 굴뚝 + 연기 -->
        <rect class="bldg" x="1094" y="322" width="26" height="118" />
        <rect class="bldg" x="1156" y="306" width="26" height="134" />
        <rect class="bldg" x="1218" y="330" width="26" height="110" />
        <circle id="s2-smoke-1" cx="1107" cy="300" r="15" fill="#3C3E46" opacity="0.45" />
        <circle id="s2-smoke-2" cx="1169" cy="282" r="19" fill="#3C3E46" opacity="0.4" />
        <circle id="s2-smoke-3" cx="1231" cy="308" r="13" fill="#3C3E46" opacity="0.45" />
        <!-- 톱니 지붕 -->
        <path class="bldg" d="M 1054 440 L 1054 412 L 1094 440 L 1094 412 L 1134 440
                              L 1134 412 L 1174 440 L 1174 412 L 1214 440 L 1214 412
                              L 1254 440 L 1254 412 L 1294 440 L 1294 412 L 1330 440 Z" />
        <!-- 본체 -->
        <rect class="bldg" x="1054" y="438" width="276" height="176" rx="2" />
        <g fill="#3C3E46">
          <rect x="1076" y="470" width="30" height="20" />
          <rect x="1122" y="470" width="30" height="20" />
          <rect x="1168" y="470" width="30" height="20" />
          <rect x="1214" y="470" width="30" height="20" />
          <rect x="1260" y="470" width="30" height="20" />
          <rect x="1076" y="516" width="30" height="20" />
          <rect x="1122" y="516" width="30" height="20" />
          <rect x="1168" y="516" width="30" height="20" />
          <rect x="1214" y="516" width="30" height="20" />
          <rect x="1260" y="516" width="30" height="20" />
        </g>
        <rect fill="#F0A63A" opacity="0.18" x="1076" y="562" width="214" height="32" rx="2" />
      </g>`

export function scene2Svg() {
  const body = `
      <!-- 우리 영토 -->
      <path class="land" d="M 70 600 L 104 330 L 470 296 L 566 448 L 500 660 L 118 692 Z" />
      ${building(142, 596, 52, 118)}
      ${building(206, 606, 38, 74)}
      ${building(256, 590, 62, 146, { roof: true })}
      ${building(332, 580, 42, 92)}
      ${building(390, 570, 56, 126)}
      ${building(458, 560, 34, 66)}
      ${devices}

      <!-- 터미널이 선 섬 -->
      <path class="land" d="M 640 402 L 880 378 L 900 578 L 662 604 Z" />
      ${terminal}

      <!-- 국경 -->
      <path class="border-line" d="M 926 108 L 926 742" />
      <text x="926" y="86" text-anchor="middle" class="lbl-sub"
            letter-spacing="6">${t.border}</text>

      <!-- 외부 AI 대륙 -->
      <path class="land land--outer" d="M 970 330 L 1390 296 L 1412 664 L 998 694 Z" />
      ${factory}

      <!-- 국경을 넘는 비행 경로 (SCENE 04 로 이어짐) -->
      <path id="s2-flight" d="M 880 528 C 986 470 1074 432 1170 420"
            stroke="#9C9B93" stroke-width="1.5" stroke-dasharray="8 10"
            opacity="0.4" fill="none" />

      <!-- 모여드는 경로와 가방 -->
      ${routes}
      ${bag('s2-bag-1', 524, 546, 0.8)}
      ${bag('s2-bag-2', 566, 592, 0.8)}
      ${bag('s2-bag-3', 592, 556, 0.8)}
      ${bag('s2-bag-4', 622, 528, 0.8)}
      ${bag('s2-bag-5', 652, 500, 0.8)}

      <!-- 라벨 -->
      ${leader('M 128 244 L 128 300 L 176 330')}
      ${label({ x: 122, y: 232, title: t.campus })}

      ${leader('M 250 712 L 250 682')}
      ${label({ x: 244, y: 740, title: t.devices, sub: t.devicesSub })}

      ${leader('M 770 652 L 770 610')}
      ${label({ x: 770, y: 682, title: t.terminal, sub: t.terminalSub, anchor: 'middle' })}

      ${leader('M 1188 252 L 1188 296')}
      ${label({ x: 1188, y: 214, title: t.factory, sub: t.factorySub, anchor: 'middle' })}`

  return svgWrap({
    id: 's2',
    viewBox: '0 0 1440 780',
    title: t.svgTitle,
    desc: t.svgDesc,
    body,
  })
}
