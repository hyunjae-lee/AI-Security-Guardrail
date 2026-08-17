/**
 * SCENE 03 · 설계 근거 — N2SF 「위치-주체-객체」 모델 도해.
 *
 * 이 장면만 비유가 아니라 근거를 그린다.  가이드라인이 실제로 쓰는 모델을
 * 우리 화법으로 다시 그려, 앞 장면(문제)과 뒤 장면(검사대)을 잇는다.
 *
 * 핵심은 **두 갈래 경로의 대조**다.  같은 출발지·같은 도착지를 두고
 *
 *   위(붉은 점선)  주체(단말, S) ──직접──▶ 객체(외부 AI, O)   ✕ 「정보 이동」 위배
 *   아래(청록 실선) 주체 ──▶ 연계체계 ──▶ 객체                  ○ 가이드라인이 시킨 형태
 *
 * 이 대조가 그대로 다음 장면(검사대)의 존재 이유가 된다.
 *
 * M3 애니메이션 대상 id:
 *   #sb-bad       위배 경로 (흐르다 막힌다)
 *   #sb-cross     위배 표시
 *   #sb-good-1/2  연계체계를 경유하는 경로
 *   #sb-gate      연계체계
 */

import { callout, svgWrap } from './_svg.js'
import { isoSpace } from './_iso.js'
import { HOME_FACE, AWAY_FACE } from './_places.js'
import { sceneBasis as t } from '../content/strings.js'

export const iso = isoSpace({ ox: 340, oy: 190, s: 1 })
const { at, box, slab, plane, grid, cutHatch } = iso

/* 두 영역의 평면 좌표.  away 는 -y 쪽으로 크게 물려 두 대지가 화면에서
   나란히 놓이게 한다 (같은 y 대에 두면 오른쪽 대지가 아래로 흘러내린다). */
const HOME = [0, 0, 300, 230]
const AWAY = [501, -256, 240, 230]

/* 등급 배지 — 이 장면의 논지가 등급이라 크게 단다. */
const badge = (plan, letter, note, color) => {
  const [x, y] = at(...plan)
  return `
      <g class="grade-badge">
        <rect x="${x - 26}" y="${y - 26}" width="52" height="52" rx="8"
              fill="#131418" stroke="${color}" stroke-width="1.75" />
        <text x="${x}" y="${y + 10}" text-anchor="middle"
              style="font-size:28px;fill:${color}" font-weight="700">${letter}</text>
        <text x="${x}" y="${y + 46}" text-anchor="middle"
              style="font-size:16px;fill:${color}">${note}</text>
      </g>`
}

/* ------------------------------------------------------- 위치 · 주체 (S) */

const [hx, hy, hw, hd] = HOME

const homeSide = `
      ${slab(hx, hy, hw, hd, 16, { tone: 'home' })}
      ${grid(hx, hy, hw, hd, 60)}
      ${cutHatch(hx, hy, hw, hd, 16, 'l')}
      ${cutHatch(hx, hy, hw, hd, 16, 'r')}
      <!-- 주체: 이용자 단말 -->
      ${box(110, 76, 80, 56, 16, HOME_FACE)}
      ${plane(
        [
          [118, 84, 17],
          [182, 84, 17],
          [182, 124, 17],
          [118, 124, 17],
        ],
        '',
        'fill="#F0A63A" opacity="0.45"',
      )}
      ${box(140, 132, 20, 14, 6, HOME_FACE)}`

/* ------------------------------------------------------------- 객체 (O) */

const [ax0, ay0, aw, ad] = AWAY

const awaySide = `
      ${slab(ax0, ay0, aw, ad, 16, { tone: 'away' })}
      ${cutHatch(ax0, ay0, aw, ad, 16, 'l')}
      ${cutHatch(ax0, ay0, aw, ad, 16, 'r')}
      <!-- 객체: 외부 생성형 AI 서버 -->
      ${box(556, -196, 110, 80, 26, AWAY_FACE)}
      ${box(572, -180, 78, 48, 22, { z: 26, ...AWAY_FACE })}
      ${[0, 1, 2]
        .map((i) => {
          const [cx, cy] = at(588 + i * 22, -156, 50)
          return `<circle cx="${cx}" cy="${cy}" r="3.6" fill="#F0A63A" opacity="0.75" />`
        })
        .join('')}`

/* ---------------------------------------------------------- 두 갈래 경로 */

/** 주체(단말) 위 · 객체(서버) 위 — 두 경로가 공유하는 출발·도착점. */
const SRC = at(150, 104, 20)
const DST = at(560, -130, 52)
/** 대지 앞자락 — 아래쪽(연계체계 경유) 경로가 지나는 지점. */
const SRC_LOW = at(230, 208, 4)
const DST_LOW = at(520, -50, 4)

const arrow = (x, y, dx, dy, color) => {
  const len = Math.hypot(dx, dy) || 1
  const [ux, uy] = [dx / len, dy / len]
  const [px, py] = [-uy, ux]
  const p = (a, b) => `${(x + ux * a + px * b).toFixed(1)} ${(y + uy * a + py * b).toFixed(1)}`
  return `<path d="M ${p(0, 0)} L ${p(-19, 9)} L ${p(-19, -9)} Z" fill="${color}" />`
}

/* 위: 직접 연결 — 위로 크게 부풀린 붉은 점선. 가운데서 ✕ 로 끊긴다. */
const BAD_MID = [(SRC[0] + DST[0]) / 2, Math.min(SRC[1], DST[1]) - 190]
const badPath = `M ${SRC[0]} ${SRC[1]} Q ${BAD_MID[0]} ${BAD_MID[1]} ${DST[0]} ${DST[1]}`
/* 2차 베지어의 t=0.5 지점 = (P0 + 2·P1 + P2) / 4 */
const CROSS = [
  (SRC[0] + 2 * BAD_MID[0] + DST[0]) / 4,
  (SRC[1] + 2 * BAD_MID[1] + DST[1]) / 4,
]

const routeBad = `
      <g class="route-bad">
        <path id="sb-bad" d="${badPath}" fill="none"
              style="stroke:#E25749;stroke-width:2.5;stroke-dasharray:11 9" opacity="0.9" />
        ${arrow(DST[0], DST[1], DST[0] - BAD_MID[0], DST[1] - BAD_MID[1], '#E25749')}
        <text x="${CROSS[0]}" y="${CROSS[1] - 42}" text-anchor="middle"
              letter-spacing="1" style="font-size:18px;fill:#E25749">${t.routeBad}</text>
        <g id="sb-cross" transform="translate(${CROSS[0]} ${CROSS[1]})">
          <circle cx="0" cy="0" r="23" fill="#131418" stroke="#E25749" stroke-width="2.25" />
          <path d="M -9 -9 L 9 9 M 9 -9 L -9 9" stroke="#E25749"
                stroke-width="3" stroke-linecap="round" />
        </g>
      </g>`

/* 아래: 연계체계 경유 — 청록 실선이 게이트를 한 번 거쳐 간다. */
const GATE = [(SRC_LOW[0] + DST_LOW[0]) / 2, Math.max(SRC_LOW[1], DST_LOW[1]) + 118]
const GW = 190
const GH = 74
const GIN = [GATE[0] - GW / 2, GATE[1]]
const GOUT = [GATE[0] + GW / 2, GATE[1]]

const goodPath1 = `M ${SRC_LOW[0]} ${SRC_LOW[1]} Q ${SRC_LOW[0] + 40} ${GATE[1]} ${GIN[0]} ${GIN[1]}`
const goodPath2 = `M ${GOUT[0]} ${GOUT[1]} Q ${DST_LOW[0] - 30} ${GATE[1]} ${DST_LOW[0]} ${DST_LOW[1]}`

const routeGood = `
      <g class="route-good">
        <path id="sb-good-1" d="${goodPath1}" fill="none"
              style="stroke:#43BC9C;stroke-width:2.5" opacity="0.9" />
        <path id="sb-good-2" d="${goodPath2}" fill="none"
              style="stroke:#43BC9C;stroke-width:2.5" opacity="0.9" />
        ${arrow(DST_LOW[0], DST_LOW[1], 26, -34, '#43BC9C')}
        <g id="sb-gate">
          <rect x="${GATE[0] - GW / 2}" y="${GATE[1] - GH / 2}" width="${GW}" height="${GH}" rx="10"
                fill="var(--c-gate-top)" stroke="#43BC9C" stroke-width="2" />
          <text x="${GATE[0]}" y="${GATE[1] + 8}" text-anchor="middle"
                style="font-size:21px;fill:#ECEAE3" font-weight="700">${t.gateLabel}</text>
          ${[0, 1, 2]
            .map(
              (i) =>
                `<circle cx="${GATE[0] - 30 + i * 30}" cy="${GATE[1] - 24}" r="3.8"
                         fill="#43BC9C" opacity="0.85" />`,
            )
            .join('')}
        </g>
        <text x="${GATE[0]}" y="${GATE[1] + 64}" text-anchor="middle"
              letter-spacing="1" style="font-size:18px;fill:#43BC9C">${t.routeGood}</text>
      </g>`

/* ------------------------------------------------------------------ 조립 */

export function sceneBasisSvg() {
  const body = `
      ${homeSide}
      ${awaySide}
      ${routeGood}
      ${routeBad}

      ${badge([255, 90, 0], t.gradeS, t.gradeSNote, '#43BC9C')}
      ${badge([700, -104, 0], t.gradeO, t.gradeONote, '#9C9B93')}

      ${callout({
        n: '01',
        from: at(258, 30, 16),
        to: [250, 152],
        side: 'left',
        title: t.domain,
        sub: t.domainSub,
      })}
      ${callout({
        n: '02',
        from: SRC,
        to: [250, 560],
        side: 'left',
        title: t.subject,
        sub: t.subjectSub,
      })}
      ${callout({
        n: '03',
        // 객체는 '외부 생성형 AI' 이므로 대지가 아니라 서버를 가리켜야 한다.
        from: at(666, -160, 26),
        to: [1180, 330],
        side: 'right',
        title: t.object,
        sub: t.objectSub,
      })}
      ${callout({
        n: '04',
        from: [CROSS[0] + 22, CROSS[1] - 8],
        to: [1046, 96],
        side: 'right',
        title: t.violation,
        sub: t.violationSub,
        cls: 'co-title--block',
      })}
      ${callout({
        n: '05',
        from: GOUT,
        to: [1000, 690],
        side: 'right',
        title: t.remedy,
        sub: t.remedySub,
      })}`

  return svgWrap({
    id: 'sb',
    viewBox: '0 0 1440 760',
    title: t.svgTitle,
    desc: t.svgDesc,
    body,
  })
}

/* ==========================================================================
   M3 — 위배되는 이동이 시도되다 ✕ 에서 멈추고, 그때마다 아래 경로가
   대신 흐른다.  "막는다" 가 아니라 "이렇게 지나가라" 가 이 장면의 결론이다.
   ========================================================================== */

export function sceneBasisAnim(root, gsap) {
  const q = (sel) => root.querySelector(sel)
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5 })

  tl.fromTo(
    q('#sb-bad'),
    { strokeDashoffset: 0 },
    { strokeDashoffset: -120, duration: 2.2, ease: 'none' },
    0,
  )
    .fromTo(
      q('#sb-cross'),
      { scale: 0.75, opacity: 0.35, transformOrigin: '50% 50%' },
      { scale: 1, opacity: 1, duration: 0.42, ease: 'back.out(2.4)' },
      1.0,
    )
    .to(q('#sb-cross'), { opacity: 0.4, duration: 0.7 }, 2.4)

  // 아래 경로는 선 자체가 그려지며 흐른다 (경유한다는 뜻이 드러나게 순차로).
  ;['#sb-good-1', '#sb-good-2'].forEach((sel, i) => {
    const el = q(sel)
    if (!el) return
    const len = el.getTotalLength ? el.getTotalLength() : 320
    tl.fromTo(
      el,
      { strokeDasharray: len, strokeDashoffset: len },
      { strokeDashoffset: 0, duration: 1.0, ease: 'power1.inOut' },
      1.6 + i * 0.9,
    )
  })

  gsap.to(root.querySelectorAll('#sb-gate circle'), {
    opacity: 0.3,
    duration: 1.1,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true,
    stagger: 0.18,
  })

  return tl
}
