/**
 * SCENE 01 · 인트로 — 캠퍼스의 밤.
 *
 * 사용자가 실제로 보는 것은 채팅창뿐이라는 걸 먼저 보여 준다.  불 켜진 캠퍼스
 * 위로 단말 4종이 서 있고, 각 단말에서 질문 말풍선이 하나씩 떠오른다.
 * 마지막 말풍선만 위험한 요청이라 뒤 장면의 실마리가 된다.
 *
 * M3 애니메이션 대상 id:
 *   #si-bubble-1 … #si-bubble-4   차례로 떠오르는 질문
 *   #si-caret                     깜빡이는 커서
 *   #si-win-*                     야간 창문 불빛
 */

import { callout, svgWrap } from './_svg.js'
import { isoSpace } from './_iso.js'
import { sceneIntro as t } from '../content/strings.js'

export const iso = isoSpace({ ox: 470, oy: 150, s: 1.4 })
const { at, box, slab, grid, cutHatch } = iso

/* 야간이라 창문에 불이 들어온다. 일부만 켜져야 '밤' 으로 읽힌다. */
const BLOCKS = [
  [24, 30, 44, 44, 96],
  [96, 20, 38, 52, 138],
  [40, 132, 44, 48, 108],
  [168, 52, 46, 42, 74],
  [116, 150, 52, 46, 158],
  [232, 130, 42, 46, 92],
  [28, 246, 40, 42, 82],
  [126, 262, 46, 44, 116],
  [216, 250, 44, 46, 124],
]

let winSeq = 0
const litWindows = (x, y, w, d, h) => {
  const out = []
  const fy = y + d
  for (let z = h - 24; z > 14; z -= 30) {
    for (let wx = x + 8; wx + 9 <= x + w - 8; wx += 17) {
      winSeq += 1
      // 결정적 패턴으로 절반쯤만 켠다 (렌더마다 달라지면 안 된다).
      const lit = winSeq % 3 !== 0
      out.push(
        `<polygon id="si-win-${winSeq}" class="${lit ? '' : 'f-r'}" points="${[
          [wx, fy, z + 11],
          [wx + 9, fy, z + 11],
          [wx + 9, fy, z],
          [wx, fy, z],
        ]
          .map((p) => iso.pt(...p))
          .join(' ')}" ${lit ? 'fill="#F0A63A" opacity="0.55"' : 'opacity="0.9"'} />`,
      )
    }
  }
  return out.join('')
}

const campus = `
      ${slab(0, 0, 290, 340, 16)}
      ${grid(0, 0, 290, 340, 60)}
      ${cutHatch(0, 0, 290, 340, 16, 'l')}
      ${cutHatch(0, 0, 290, 340, 16, 'r')}
      ${BLOCKS.map((b) => box(...b) + litWindows(...b)).join('')}`

/* ------------------------------------------------------------ 단말 4종 */

const DEVICE_PLAN = {
  phone: [10, 300],
  tablet: [160, 336],
  laptop: [280, 214],
  pc: [258, 40],
}

const device = (id, shape) => {
  const [x, y] = at(...DEVICE_PLAN[id])
  return `
      <g id="si-device-${id}">
        <polygon points="${x - 17},${y} ${x},${y - 9} ${x + 17},${y} ${x},${y + 9}"
                 fill="#0f1116" opacity="0.6" />
        <g transform="translate(${x} ${y})">
${shape}
        </g>
      </g>`
}

const DEVICES = [
  device(
    'phone',
    `          <rect class="f-top solid" x="-12" y="-44" width="24" height="42" rx="4" />
          <rect fill="#F0A63A" opacity="0.85" x="-9" y="-40" width="18" height="30" rx="1" />`,
  ),
  device(
    'tablet',
    `          <rect class="f-top solid" x="-19" y="-50" width="38" height="48" rx="4" />
          <rect fill="#F0A63A" opacity="0.85" x="-15" y="-46" width="30" height="36" rx="1" />`,
  ),
  device(
    'laptop',
    `          <path class="f-l solid" d="M -30 0 L 30 0 L 24 -8 L -24 -8 Z" />
          <rect class="f-top solid" x="-24" y="-42" width="48" height="34" rx="2" />
          <rect fill="#F0A63A" opacity="0.85" x="-20" y="-38" width="40" height="26" />`,
  ),
  device(
    'pc',
    `          <rect class="f-top solid" x="-28" y="-48" width="56" height="38" rx="2" />
          <rect fill="#F0A63A" opacity="0.85" x="-24" y="-44" width="48" height="30" />
          <path class="f-l solid" d="M -8 -10 L 8 -10 L 11 0 L -11 0 Z" />
          <rect class="f-r solid" x="32" y="-40" width="16" height="40" rx="2" />`,
  ),
].join('')

/* ----------------------------------------------------------- 질문 말풍선

   오른쪽에 세로로 쌓고 각 단말까지 얇은 지시선을 잇는다.  콜아웃과 같은
   지시선 문법을 써야 도면 전체가 한 체계로 읽힌다. */

const BUBBLES = [
  { id: 'si-bubble-1', to: [872, 168], from: 'phone' },
  { id: 'si-bubble-2', to: [938, 300], from: 'tablet' },
  { id: 'si-bubble-3', to: [902, 432], from: 'laptop' },
  { id: 'si-bubble-4', to: [968, 564], from: 'pc', risky: true },
]

const bubble = ({ id, to, from, risky }, i) => {
  const [ax, ay] = at(...DEVICE_PLAN[from], 44)
  const [bx, by] = to
  const w = 340
  const h = 60
  const stroke = risky ? '#E25749' : '#3C3E46'
  return `
      <g id="${id}">
        <path class="co-leader" d="M ${ax} ${ay} L ${bx - 26} ${by + h / 2} L ${bx} ${by + h / 2}" />
        <rect x="${bx}" y="${by}" width="${w}" height="${h}" rx="6"
              fill="#1C1E24" stroke="${stroke}" stroke-width="1.25" />
        <path d="M ${bx} ${by + h - 12} l -9 8 l 9 4 Z" fill="#1C1E24" stroke="${stroke}"
              stroke-width="1.25" stroke-linejoin="round" />
        <text x="${bx + 18}" y="${by + 32}" class="co-sub"
              fill="${risky ? '#E25749' : '#ECEAE3'}" font-size="19">${t.bubbles[i]}</text>
      </g>`
}

/* ------------------------------------------------------------------ 조립 */

export function sceneIntroSvg() {
  const [cx, cy] = at(...DEVICE_PLAN.laptop, 44)
  const body = `
      ${campus}
      ${DEVICES}
      ${BUBBLES.map(bubble).join('')}
      <rect id="si-caret" x="${cx + 2}" y="${cy - 12}" width="2" height="16" fill="#F0A63A" />

      ${callout({
        n: '01',
        from: at(...DEVICE_PLAN.tablet, 60),
        to: [330, 700],
        side: 'right',
        title: t.here,
        sub: t.hereSub,
      })}`

  return svgWrap({
    id: 'si',
    viewBox: '0 0 1440 800',
    title: t.svgTitle,
    desc: t.svgDesc,
    body,
  })
}

/* ==========================================================================
   M3 — 질문이 하나씩 떠오르고, 커서가 깜빡이고, 창문 불빛이 미세하게 흔들린다.
   ========================================================================== */

export function sceneIntroAnim(root, gsap) {
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6 })

  BUBBLES.forEach(({ id }, i) => {
    const el = root.querySelector(`#${id}`)
    if (!el) return
    tl.fromTo(
      el,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' },
      i * 0.9,
    ).to(el, { opacity: 0, duration: 0.6 }, 4.6 + i * 0.25)
  })

  gsap.to(root.querySelector('#si-caret'), {
    opacity: 0,
    duration: 0.5,
    repeat: -1,
    yoyo: true,
    ease: 'steps(1)',
  })

  // 창문 불빛은 아주 약하게만 흔든다 (밤 풍경의 기척 정도).
  gsap.to(root.querySelectorAll('[id^="si-win-"]'), {
    opacity: 0.32,
    duration: 2.6,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true,
    stagger: { each: 0.06, from: 'random' },
  })

  return tl
}
