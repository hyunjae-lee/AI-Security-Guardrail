/**
 * SCENE 03 · 출국층 단면 — 아이소메트릭 컷어웨이.
 *
 * 바닥 슬래브의 두께가 그대로 절단면이 되고, 먼 쪽 두 벽만 남겨 위층을 잘라
 * 낸 것처럼 보이게 한다.  컨베이어에 오른 가방이
 *   [여권·비자 확인] → [X-ray 스캐너] → [게이트 3갈래]
 * 로 흐르고, 전략물자·위조 여권이 잡히면 게이트를 건너뛰어 즉시 거부로 빠진다.
 *
 * M3 애니메이션 대상 id:
 *   #s3-bag-1 … #s3-bag-4     컨베이어 위 가방 (대기열)
 *   #s3-bag-ov                즉시 거부 연출 전용 가방
 *   #s3-belt-teeth            벨트 무늬 (흐름)
 *   #s3-beam                  X-ray 스캔 빔
 *   #s3-screen-sweep          판독 화면 주사선
 *   #s3-xray-idcard / #s3-xray-note   화면에 비친 내용물
 *   #s3-path-allow|mask|block 게이트 3갈래 벨트
 *   #s3-lamp-allow|mask|block 게이트 표시등
 *   #s3-path-override / #s3-override-outlet  즉시 거부 우회로
 */

import { callout, svgWrap } from './_svg.js'
import { isoSpace } from './_iso.js'
import { scene3 as t } from '../content/strings.js'

export const iso = isoSpace({ ox: 350, oy: 76, s: 1.12 })
const { at, pt, delta, box, slab, line, plane, grid, cutHatch, curve } = iso

const BELT_Z = 32 // 벨트 상면 높이
const LANES = [
  { key: 'allow', y: 60, color: '#7FBF57' },
  { key: 'mask', y: 128, color: '#F0A63A' },
  { key: 'block', y: 196, color: '#E25749' },
]

/* --------------------------------------------------------- 바닥 · 남은 벽 */

const shell = `
      ${box(-10, -10, 910, 10, 54)}
      ${box(-10, 0, 10, 300, 54)}
      ${slab(0, 0, 900, 300, 26)}
      ${grid(0, 0, 900, 300, 60)}
      ${cutHatch(0, 0, 900, 300, 26, 'l', 30)}
      ${cutHatch(0, 0, 900, 300, 26, 'r', 30)}`

/* ------------------------------------------------------------- 컨베이어 */

const beltTeeth = () => {
  const out = []
  for (let x = 38; x < 700; x += 28) {
    out.push(
      line(
        [
          [x, 118, BELT_Z],
          [x, 162, BELT_Z],
        ],
        'hatch',
      ),
    )
  }
  return `<g id="s3-belt-teeth">${out.join('')}</g>`
}

const BELT_FACES = { top: 'belt-top', l: 'belt-l', r: 'belt-r' }

const conveyor = `
      ${box(24, 116, 676, 48, BELT_Z, BELT_FACES)}
      ${plane(
        [
          [24, 136, BELT_Z + 0.4],
          [700, 136, BELT_Z + 0.4],
          [700, 144, BELT_Z + 0.4],
          [24, 144, BELT_Z + 0.4],
        ],
        '',
        'fill="#F0A63A" opacity="0.5"',
      )}
      ${beltTeeth()}`

/* --------------------------------------------------- 여권·비자 확인 포털 */

const passport = `
      <g id="s3-passport">
        ${box(146, 96, 14, 14, 96)}
        ${box(146, 170, 14, 14, 96)}
        ${box(146, 96, 14, 88, 14, { z: 96 })}
        ${line(
          [
            [146, 96, 110],
            [146, 184, 110],
          ],
          'gear',
        )}
        ${plane(
          [
            [153, 122, 88],
            [153, 158, 88],
            [153, 158, 70],
            [153, 122, 70],
          ],
          'gear-fill',
          'opacity="0.35"',
        )}
      </g>`

/* ------------------------------------------------------- X-ray 스캐너 */

const xrayFrame = (x0) => `
        ${box(x0, 92, 12, 12, 104)}
        ${box(x0, 180, 12, 12, 104)}
        ${box(x0, 92, 12, 100, 12, { z: 104 })}`

const xray = `
      <g id="s3-xray">
        ${xrayFrame(300)}
        ${box(312, 92, 146, 12, 12, { z: 104 })}
        ${box(312, 180, 146, 12, 12, { z: 104 })}
        ${xrayFrame(458)}
        ${line(
          [
            [300, 92, 116],
            [470, 92, 116],
          ],
          'gear',
        )}
        ${line(
          [
            [300, 192, 116],
            [470, 192, 116],
          ],
          'gear',
        )}
      </g>
      <g id="s3-beam">
        ${plane(
          [
            [380, 96, 104],
            [380, 188, 104],
            [380, 188, 0],
            [380, 96, 0],
          ],
          'gear-fill',
          'opacity="0.16"',
        )}
        ${line(
          [
            [380, 96, 104],
            [380, 188, 104],
          ],
          'gear',
        )}
      </g>`

/* ---------------------------------------------------------- 게이트 3갈래 */

const gates = `
      <g id="s3-gates">
        ${box(700, 52, 58, 196, BELT_Z, BELT_FACES)}
        ${LANES.map(
          ({ key, y, color }) => `
        ${box(758, y, 112, 44, BELT_Z, { id: `s3-path-${key}`, ...BELT_FACES })}
        ${plane(
          [
            [758, y + 18, BELT_Z + 0.4],
            [866, y + 18, BELT_Z + 0.4],
            [866, y + 26, BELT_Z + 0.4],
            [758, y + 26, BELT_Z + 0.4],
          ],
          '',
          `fill="${color}" opacity="0.75"`,
        )}
        ${box(866, y, 12, 12, 68)}
        ${box(866, y + 32, 12, 12, 68)}
        ${box(866, y, 12, 44, 12, { z: 68 })}
        <path d="M ${pt(866, y, 82)} L ${pt(866, y + 44, 82)}"
              fill="none" stroke="${color}" stroke-width="2" />
        <circle id="s3-lamp-${key}" cx="${at(872, y + 22, 92)[0]}"
                cy="${at(872, y + 22, 92)[1]}" r="8" fill="${color}" />`,
        ).join('')}
      </g>`

/* ------------------------------------------- 즉시 거부 (전략물자·위조 여권) */

const [outX, outY] = at(830, 24, 206)

const override = `
      <g id="s3-override">
        ${curve(
          [
            [470, 140, 44],
            [620, 96, 250],
            [800, 30, 214],
          ],
          'route',
          'id="s3-path-override" stroke="#E25749" stroke-dasharray="9 7" opacity="0.95"',
        )}
        <g id="s3-override-outlet" transform="translate(${outX} ${outY})">
          <rect x="-34" y="-26" width="68" height="52" rx="3"
                fill="none" stroke="#E25749" stroke-width="2" />
          <path d="M -13 -10 L 13 12 M 13 -10 L -13 12"
                stroke="#E25749" stroke-width="2.5" stroke-linecap="round" />
        </g>
      </g>`

/* -------------------------------------------------------------- 가방·직원 */

const bag = (id, x, y, { z = 0, w = 22, d = 15, h = 17 } = {}) => {
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

/* 사람은 부감 투영에서 뭉개지므로 심볼로 세워 둔다 (설명 다이어그램 관례). */
const figure = (plan) => {
  const [x, y] = at(...plan)
  return `
      <g class="figure">
        <polygon points="${x - 13},${y} ${x},${y - 7} ${x + 13},${y} ${x},${y + 7}"
                 fill="#0f1116" opacity="0.5" />
        <circle class="gear-fill" cx="${x}" cy="${y - 70}" r="9.5" opacity="0.8" />
        <rect class="gear-fill" x="${x - 11}" y="${y - 52}" width="22" height="52"
              rx="10" opacity="0.8" />
      </g>`
}

/* ---------------------------------------------------------- 판독 화면 */

const screen = `
      <g id="s3-screen">
        <path class="co-leader" d="M 604 186 L 581 238" />
        <rect x="590" y="26" width="240" height="160" rx="3"
              fill="#0f1116" stroke="#43BC9C" stroke-width="1.75" />
        <path d="M 590 52 H 830" stroke="#43BC9C" stroke-width="1" opacity="0.6" />
        <text class="co-sub" x="604" y="45" fill="#43BC9C" letter-spacing="2">${t.screen}</text>
        <rect id="s3-screen-sweep" x="590" y="60" width="240" height="2"
              fill="#43BC9C" opacity="0.45" />
        <!-- 가방 투시 -->
        <rect x="620" y="76" width="146" height="82" rx="10"
              fill="none" stroke="#43BC9C" stroke-width="1.5" opacity="0.5" />
        <path d="M 672 76 C 672 64 714 64 714 76" fill="none"
              stroke="#43BC9C" stroke-width="1.5" opacity="0.5" />
        <g id="s3-xray-idcard">
          <rect x="634" y="94" width="46" height="31" rx="2"
                fill="none" stroke="#F0A63A" stroke-width="1.75" />
          <circle cx="647" cy="106" r="6" fill="none" stroke="#F0A63A" stroke-width="1.5" />
          <path d="M 659 102 H 675 M 659 112 H 671" stroke="#F0A63A" stroke-width="1.5" />
        </g>
        <g id="s3-xray-note">
          <path d="M 702 92 L 736 86 L 742 124 L 708 130 Z"
                fill="none" stroke="#E25749" stroke-width="1.75" />
          <path d="M 710 102 H 732 M 710 112 H 728" stroke="#E25749" stroke-width="1.5" />
        </g>
        <text x="657" y="150" text-anchor="middle" fill="#F0A63A" font-size="12">${t.screenIdCard}</text>
        <text x="723" y="150" text-anchor="middle" fill="#E25749" font-size="12">${t.screenNote}</text>
      </g>`

/* ------------------------------------------------------------------ 조립 */

export function scene3Svg() {
  const body = `
      ${shell}
      ${conveyor}
      ${passport}
      ${bag('s3-bag-1', 60, 140, { z: BELT_Z })}
      ${bag('s3-bag-2', 160, 140, { z: BELT_Z })}
      ${bag('s3-bag-3', 260, 140, { z: BELT_Z })}
      ${xray}
      ${bag('s3-bag-4', 380, 140, { z: BELT_Z })}
      <!-- 즉시 거부 연출 전용. 정지 상태에서는 보이지 않는다. -->
      <g id="s3-bag-ov-wrap" opacity="0">${bag('s3-bag-ov', 380, 140, { z: BELT_Z })}</g>
      ${gates}
      ${figure([215, 250])}
      ${figure([610, 262])}
      ${override}
      ${screen}

      ${callout({
        n: '01',
        from: at(0, 0, 0),
        to: [300, 36],
        side: 'left',
        title: t.floor,
      })}
      ${callout({
        n: '02',
        from: at(64, 164, BELT_Z),
        to: [172, 340],
        side: 'left',
        title: t.conveyor,
        sub: t.conveyorSub,
      })}
      ${callout({
        n: '03',
        from: at(153, 138, 110),
        to: [300, 128],
        side: 'left',
        title: t.passport,
        sub: t.passportSub,
      })}
      ${callout({
        n: '04',
        from: at(464, 192, 104),
        to: [330, 486],
        side: 'left',
        title: t.xray,
        sub: t.xraySub,
      })}
      ${callout({
        n: '05',
        from: at(872, 82, 82),
        to: [1168, 448],
        side: 'right',
        title: t.gateAllow,
        cls: 'co-title--allow',
      })}
      ${callout({
        n: '06',
        from: at(872, 150, 82),
        to: [1168, 528],
        side: 'right',
        title: t.gateMask,
        cls: 'co-title--bag',
      })}
      ${callout({
        n: '07',
        from: at(872, 218, 82),
        to: [1168, 608],
        side: 'right',
        title: t.gateBlock,
        cls: 'co-title--block',
      })}
      ${callout({
        n: '08',
        from: [outX + 34, outY - 14],
        to: [1152, 252],
        side: 'right',
        title: t.override,
        sub: t.overrideSub,
        cls: 'co-title--block',
      })}`

  return svgWrap({
    id: 's3',
    viewBox: '0 0 1440 860',
    title: t.svgTitle,
    desc: t.svgDesc,
    body,
  })
}

/* ==========================================================================
   M3 애니메이션 — 출국층 시퀀스.

   이 장면만 pin + scrub 이다.  가방 한 개가 검사대를 통과하는 과정은 "순서"가
   핵심이라, 사용자가 스크롤 속도로 직접 되감아 볼 수 있어야 한다.

   대기열 4개가 차례로 스캐너에 들어가 네 가지 판정을 하나씩 보여 준다:
     통과 → 물건만 빼고 통과 → 탑승 거부 → (판정 생략) 즉시 거부
   ========================================================================== */

const SCAN = [380, 140, BELT_Z] // 스캐너 안 정지 위치
const JUNCTION = [724, 150, BELT_Z] // 3갈래가 갈라지는 분기점
const LANE_END = {
  allow: [856, 82, BELT_Z],
  mask: [856, 150, BELT_Z],
  block: [856, 218, BELT_Z],
}

/** 대기열: [id, 최초 평면위치, 판정] — 앞의 가방이 빠지면 한 칸씩 당긴다. */
const QUEUE = [
  ['s3-bag-4', [380, 140, BELT_Z], 'allow'],
  ['s3-bag-3', [260, 140, BELT_Z], 'mask'],
  ['s3-bag-2', [160, 140, BELT_Z], 'block'],
  ['s3-bag-1', [60, 140, BELT_Z], 'override'],
]

export function scene3Anim(root, gsap, ScrollTrigger) {
  const q = (sel) => root.querySelector(sel)
  const lamps = {
    allow: q('#s3-lamp-allow'),
    mask: q('#s3-lamp-mask'),
    block: q('#s3-lamp-block'),
  }

  // 판정 전에는 표시등이 꺼져 있고, 화면 속 내용물도 아직 안 잡혔다.
  gsap.set(Object.values(lamps).filter(Boolean), { opacity: 0.18 })
  gsap.set([q('#s3-xray-idcard'), q('#s3-xray-note')].filter(Boolean), { opacity: 0 })
  gsap.set(q('#s3-beam'), { opacity: 0 })
  gsap.set(q('#s3-override'), { opacity: 0 })

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: root.closest('.scene'),
      start: 'center center',
      end: '+=2800',
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
    },
  })

  const beam = q('#s3-beam')
  const beamSweep = delta([320, 140, 0], [450, 140, 0])

  /** 스캔 1회: 빔이 가방을 훑고, 판독 화면에 내용물이 뜬다. */
  const scan = (t0, { idcard = false, note = false }) => {
    tl.fromTo(beam, { opacity: 0, x: 0, y: 0 }, { opacity: 1, duration: 0.15 }, t0)
      .to(beam, { x: beamSweep.x, y: beamSweep.y, duration: 0.7 }, t0)
      .to(beam, { opacity: 0, duration: 0.15 }, t0 + 0.7)
      .fromTo(
        q('#s3-screen-sweep'),
        { attr: { y: 60 } },
        { attr: { y: 180 }, duration: 0.7 },
        t0,
      )
    if (idcard) tl.to(q('#s3-xray-idcard'), { opacity: 1, duration: 0.25 }, t0 + 0.35)
    if (note) tl.to(q('#s3-xray-note'), { opacity: 1, duration: 0.25 }, t0 + 0.45)
    // 다음 가방을 위해 판독 결과를 비운다.
    tl.to([q('#s3-xray-idcard'), q('#s3-xray-note')], { opacity: 0, duration: 0.2 }, t0 + 1.55)
  }

  /** 판정 후 분기점을 거쳐 해당 레인 끝까지 보낸다. */
  const divert = (id, origin, verdict, t0) => {
    const el = q(`#${id}`)
    if (!el) return
    const toJunction = delta(origin, JUNCTION)
    const toLane = delta(origin, LANE_END[verdict])
    if (!lamps[verdict]) return
    tl.to(lamps[verdict], { opacity: 1, duration: 0.2 }, t0)
      .to(el, { x: toJunction.x, y: toJunction.y, duration: 0.55 }, t0)
      .to(el, { x: toLane.x, y: toLane.y, duration: 0.5 }, t0 + 0.55)
      .to(lamps[verdict], { opacity: 0.18, duration: 0.3 }, t0 + 1.2)
  }

  QUEUE.forEach(([id, origin, verdict], i) => {
    const t0 = i * 2 // 가방 하나당 두 박자: 스캔 → 판정
    const scanned = { idcard: verdict !== 'allow', note: verdict === 'block' || verdict === 'override' }
    scan(t0, scanned)

    if (verdict === 'override') {
      // 판정 게이트를 아예 건너뛴다. 전용 가방으로 갈아타 경로를 태운다.
      const ov = q('#s3-bag-ov')
      tl.to(q('#s3-override'), { opacity: 1, duration: 0.2 }, t0 + 0.8)
        .to(q(`#${id}`), { opacity: 0, duration: 0.15 }, t0 + 1)
        .set(q('#s3-bag-ov-wrap'), { opacity: 1 }, t0 + 1)
        .to(
          ov,
          {
            duration: 1.1,
            ease: 'power1.in',
            motionPath: {
              path: q('#s3-path-override'),
              align: q('#s3-path-override'),
              alignOrigin: [0.5, 0.9],
            },
          },
          t0 + 1,
        )
        .to(
          q('#s3-override-outlet'),
          { scale: 1.18, transformOrigin: '50% 50%', duration: 0.2, yoyo: true, repeat: 3 },
          t0 + 2,
        )
    } else {
      divert(id, origin, verdict, t0 + 0.9)
      // 뒤에 남은 가방들을 한 칸씩 당긴다.  x/y 는 최초 위치 기준 절대 변위이므로
      // '몇 칸 당겼는지' 가 아니라 '지금 몇 번 슬롯인지' 로 목표를 잡아야 한다.
      QUEUE.slice(i + 1).forEach(([nextId, nextOrigin], k) => {
        const slot = QUEUE[k][1] // k 번째 슬롯(= 앞에서 k 번째 자리)
        tl.to(
          q(`#${nextId}`),
          { ...delta(nextOrigin, slot), duration: 0.8 },
          t0 + 1.1,
        )
      })
    }
  })

  // 벨트 무늬는 스크럽과 무관하게 계속 흐른다 (설비가 살아 있다는 신호).
  const tooth = delta([0, 140, BELT_Z], [28, 140, BELT_Z])
  const beltLoop = gsap.to(q('#s3-belt-teeth'), {
    x: tooth.x,
    y: tooth.y,
    duration: 1.1,
    ease: 'none',
    repeat: -1,
  })

  // 화면 밖에서는 루프를 멈춰 둔다.
  ScrollTrigger.create({
    trigger: root.closest('.scene'),
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => (self.isActive ? beltLoop.play() : beltLoop.pause()),
  })

  return tl
}
