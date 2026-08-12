/**
 * SCENE 02 · 왜 검사대인가 — 통제 지점이 없는 현재 상태.
 *
 * 조감도(SCENE 03)와 같은 지형을 쓰되 **터미널을 뺀다**.  캠퍼스와 외부 AI
 * 사이에 국경만 그어져 있고, 가방이 아무 확인 없이 그 위를 그냥 건너간다.
 * 되돌아오는 짐도 마찬가지다.  "여기에 아무것도 없다" 를 보여 주는 장면이라
 * 빈 구간을 일부러 넓게 비워 둔다.
 *
 * M3 애니메이션 대상 id:
 *   #sw-out-1 … #sw-out-3   국경을 넘어 나가는 가방
 *   #sw-in-1 … #sw-in-2     검사 없이 돌아오는 짐
 *   #sw-trail-out-1 …       가방이 탈 경로
 *   #sw-alert-1 … #sw-alert-3   위험 표시(경고 링)
 */

import { callout, svgWrap } from './_svg.js'
import { isoSpace } from './_iso.js'
import { sceneWhy as t } from '../content/strings.js'

export const iso = isoSpace({ ox: 380, oy: 150, s: 0.92 })
const { at, delta, box, slab, line, plane, grid, cutHatch } = iso

/* ---------------------------------------------------------------- 양쪽 대지 */

const CAMPUS_BLOCKS = [
  [24, 34, 40, 40, 78],
  [92, 22, 36, 48, 112],
  [40, 132, 40, 46, 96],
  [156, 56, 44, 40, 66],
  [110, 148, 50, 44, 128],
  [30, 240, 38, 40, 72],
  [136, 250, 44, 42, 92],
]

const campus = `
      ${slab(0, 0, 260, 340, 14)}
      ${grid(0, 0, 260, 340, 50)}
      ${cutHatch(0, 0, 260, 340, 14, 'l')}
      ${cutHatch(0, 0, 260, 340, 14, 'r')}
      ${CAMPUS_BLOCKS.map((b) => box(...b)).join('')}`

const factory = `
      ${slab(620, 0, 280, 340, 14)}
      ${cutHatch(620, 0, 280, 340, 14, 'l')}
      ${cutHatch(620, 0, 280, 340, 14, 'r')}
      ${box(648, 40, 224, 260, 84)}
      ${[0, 1, 2, 3]
        .map((i) => box(654 + i * 52, 40, 32, 260, 18, { z: 84 }))
        .join('')}
      ${box(676, 84, 22, 22, 88, { z: 84 })}
      ${box(736, 60, 24, 24, 110, { z: 84 })}
      ${plane(
        [
          [664, 300, 16],
          [856, 300, 16],
          [856, 300, 7],
          [664, 300, 7],
        ],
        'bag-r',
        'opacity="0.45"',
      )}`

/* ------------------------------------------------------------------ 국경 */

const border = `
      <g id="sw-border">
        ${line(
          [
            [440, -110],
            [440, 450],
          ],
          'border-line',
        )}
        ${Array.from({ length: 11 }, (_, i) =>
          line(
            [
              [440, -90 + i * 52],
              [418, -90 + i * 52],
            ],
            'hair',
          ),
        ).join('')}
      </g>`

/* --------------------------------------------------- 확인 없이 오가는 짐 */

const FLY_Z = 46

/** 가방 — 조감도와 같은 규격이라 두 장면이 한 세계로 읽힌다. */
const bag = (id, x, y, { z = 0, w = 24, d = 16, h = 18 } = {}) => {
  const [hx, hy] = at(x, y, z + h)
  return `
      <g id="${id}">
        ${box(x - w / 2, y - d / 2, w, d, h, {
          z,
          top: 'bag-top',
          l: 'bag-l',
          r: 'bag-r',
        })}
        <path d="M ${hx - 7} ${hy - 1} C ${hx - 7} ${hy - 11} ${hx + 7} ${hy - 11} ${hx + 7} ${hy - 1}"
              fill="none" stroke="#b97a22" stroke-width="2" />
      </g>`
}

/** 검사 없이 통과한다는 표시 — 가방을 감싸는 붉은 경고 링. */
const alertRing = (id, x, y, z) => {
  const [cx, cy] = at(x, y, z)
  return `
      <g id="${id}" opacity="0.9">
        <circle cx="${cx}" cy="${cy}" r="27" fill="none" stroke="#E25749"
                stroke-width="1.5" stroke-dasharray="4 5" />
      </g>`
}

const OUT_Y = [64, 142, 218]
const IN_Y = [286, 326]

const trails = `
      ${OUT_Y.map((y, i) =>
        line(
          [
            [262, y, FLY_Z],
            [616, y, FLY_Z],
          ],
          'route',
          false,
          `id="sw-trail-out-${i + 1}"`,
        ),
      ).join('')}
      ${IN_Y.map((y, i) =>
        line(
          [
            [616, y, FLY_Z],
            [262, y, FLY_Z],
          ],
          'route',
          false,
          `id="sw-trail-in-${i + 1}" stroke="#E25749" opacity="0.45"`,
        ),
      ).join('')}`

/* -------------------------------------------------------------- 등급 배지

   이 장면의 논거는 "등급이 섞인다" 는 것이다 (N2SF 「위치-주체-객체」 평가에서
   위치 S · 주체 S · 객체 O).  그래서 두 영역의 등급만은 도면 주기로 표기한다.
   본문 카피는 비유어로 두고, 무슨 뜻인지는 아래 '설계 근거' 카드가 설명한다. */

const gradeChip = (plan, letter, label, color) => {
  const [x, y] = at(...plan)
  return `
      <g class="grade-chip">
        <rect x="${x - 19}" y="${y - 19}" width="38" height="38" rx="6"
              fill="#131418" stroke="${color}" stroke-width="1.25" />
        <text x="${x}" y="${y + 8}" text-anchor="middle" fill="${color}"
              font-size="21" font-weight="700">${letter}</text>
        <text x="${x}" y="${y + 42}" text-anchor="middle" class="co-sub"
              font-size="16" letter-spacing="1">${label}</text>
      </g>`
}

/* ------------------------------------------------------------------ 조립 */

export function sceneWhySvg() {
  const body = `
      ${campus}
      ${border}
      ${factory}
      ${trails}

      ${bag('sw-out-1', 320, OUT_Y[0], { z: FLY_Z })}
      ${bag('sw-out-2', 452, OUT_Y[1], { z: FLY_Z })}
      ${alertRing('sw-alert-1', 452, OUT_Y[1], FLY_Z + 9)}
      ${bag('sw-out-3', 560, OUT_Y[2], { z: FLY_Z })}

      ${bag('sw-in-1', 548, IN_Y[0], { z: FLY_Z })}
      ${alertRing('sw-alert-2', 548, IN_Y[0], FLY_Z + 9)}
      ${bag('sw-in-2', 392, IN_Y[1], { z: FLY_Z })}
      ${alertRing('sw-alert-3', 392, IN_Y[1], FLY_Z + 9)}

      ${gradeChip([30, 320, 0], t.gradeIn, t.gradeInLabel, '#43BC9C')}
      ${gradeChip([700, 322, 0], t.gradeOut, t.gradeOutLabel, '#9C9B93')}

      <!-- 방향 표시 -->
      <text class="co-sub" x="${at(300, 30, FLY_Z)[0]}" y="${at(300, 30, FLY_Z)[1] - 26}"
            text-anchor="middle" letter-spacing="2">${t.outbound} →</text>
      <text class="co-sub" x="${at(470, 356, FLY_Z)[0]}" y="${at(470, 356, FLY_Z)[1] + 34}"
            text-anchor="middle" letter-spacing="2" fill="#E25749">← ${t.inbound}</text>

      ${callout({
        n: '01',
        from: at(440, -90, 0),
        to: [1010, 150],
        side: 'right',
        title: t.gap,
        sub: t.gapSub,
        cls: 'co-title--block',
      })}
      ${callout({
        n: '02',
        from: at(452, OUT_Y[1], FLY_Z + 18),
        to: [960, 268],
        side: 'right',
        title: t.risk1,
        sub: t.risk1Sub,
        cls: 'co-title--block',
      })}
      ${callout({
        n: '03',
        from: at(250, 300, 14),
        to: [420, 700],
        side: 'right',
        title: t.risk2,
        sub: t.risk2Sub,
        cls: 'co-title--block',
      })}
      ${callout({
        n: '04',
        from: at(548, IN_Y[0], FLY_Z + 18),
        to: [1000, 622],
        side: 'right',
        title: t.risk3,
        sub: t.risk3Sub,
        cls: 'co-title--block',
      })}`

  return svgWrap({
    id: 'sw',
    viewBox: '0 0 1440 820',
    title: t.svgTitle,
    desc: t.svgDesc,
    body,
  })
}

/* ==========================================================================
   M3 애니메이션 — 확인 없이 계속 흘러가는 상태를 루프로 보여 준다.
   스크럽이 아니라 상시 루프인 이유: 이 장면의 메시지는 "지금도 이러고 있다" 라
   스크롤을 멈춰도 흐름이 계속되어야 한다.
   ========================================================================== */

export function sceneWhyAnim(root, gsap) {
  const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } })
  const q = (sel) => root.querySelector(sel)

  /** 가방(과 딸린 경고 링)을 평면 A→B 로 흘려보낸다. */
  const drift = (ids, from, to, at0) => {
    const els = ids.map(q).filter(Boolean)
    if (!els.length) return
    const d = delta(from, to)
    tl.fromTo(els, { x: 0, y: 0, opacity: 0 }, { opacity: 1, duration: 1.1 }, at0)
      .to(els, { x: d.x, y: d.y, duration: 9 }, at0)
      .to(els, { opacity: 0, duration: 1.1 }, at0 + 7.9)
  }

  drift(['#sw-out-1'], [320, OUT_Y[0], FLY_Z], [610, OUT_Y[0], FLY_Z], 0)
  drift(['#sw-out-2', '#sw-alert-1'], [452, OUT_Y[1], FLY_Z], [610, OUT_Y[1], FLY_Z], 1.4)
  drift(['#sw-out-3'], [560, OUT_Y[2], FLY_Z], [610, OUT_Y[2], FLY_Z], 2.6)
  drift(['#sw-in-1', '#sw-alert-2'], [548, IN_Y[0], FLY_Z], [268, IN_Y[0], FLY_Z], 0.8)
  drift(['#sw-in-2', '#sw-alert-3'], [392, IN_Y[1], FLY_Z], [268, IN_Y[1], FLY_Z], 2.0)

  // 링은 가방과 함께 이동하면서 따로 맥동한다 (x/y 와 scale 은 서로 간섭하지 않는다).
  gsap.to(root.querySelectorAll('[id^="sw-alert-"]'), {
    scale: 1.14,
    transformOrigin: '50% 50%',
    duration: 1.1,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true,
    stagger: 0.3,
  })

  return tl
}
