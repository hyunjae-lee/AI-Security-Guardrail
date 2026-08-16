/**
 * SCENE 06 · 입국층 단면 — 터미널 아래층.
 *
 * 출국층(SCENE 04)의 거울상이다.  흐름이 반대(-x 방향)로 흐르고, 층도 한 칸
 * 아래라 절단면이 위쪽에 남는다.  돌아온 가방은 검역대를 지나며 숨어 들어온
 * 것을 적발당하고, 제거 후 전달되거나 전량 폐기된다.
 *
 * 근거: 부록2 모델2 「외부 비인가 접근 및 악성 콘텐츠 유입 차단」
 *       (N2SF-IF-3 임베디드 데이터 삽입 차단, N2SF-IF-5 일방향 정보흐름 통제)
 *
 * M3 애니메이션 대상 id:
 *   #sa-bag-1 … #sa-bag-3    도착 가방
 *   #sa-belt-teeth           벨트 무늬
 *   #sa-lamp                 검역대 표시등
 *   #sa-find-1 … #sa-find-3  적발 트레이에 쌓이는 것들
 *   #sa-path-deliver / #sa-path-drop
 */

import { callout, svgWrap } from './_svg.js'
import { isoSpace } from './_iso.js'
import { sceneArrivals as t } from '../content/strings.js'

export const iso = isoSpace({ ox: 330, oy: 96, s: 1.12 })
const { at, delta, box, slab, line, plane, grid, cutHatch } = iso

const BELT_Z = 32
const BELT_FACES = { top: 'belt-top', l: 'belt-l', r: 'belt-r' }

/* --------------------------------------------------------- 바닥 · 남은 벽 */

const shell = `
      ${box(-10, -10, 910, 10, 54)}
      ${box(-10, 0, 10, 300, 54)}
      ${slab(0, 0, 900, 300, 26)}
      ${grid(0, 0, 900, 300, 60)}
      ${cutHatch(0, 0, 900, 300, 26, 'l', 30)}
      ${cutHatch(0, 0, 900, 300, 26, 'r', 30)}`

/* -------------------------------------------------------- 도착 컨베이어 */

const beltTeeth = () => {
  const out = []
  for (let x = 174; x < 840; x += 28) {
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
  return `<g id="sa-belt-teeth">${out.join('')}</g>`
}

const conveyor = `
      ${box(160, 116, 680, 48, BELT_Z, BELT_FACES)}
      ${plane(
        [
          [160, 136, BELT_Z + 0.4],
          [840, 136, BELT_Z + 0.4],
          [840, 144, BELT_Z + 0.4],
          [160, 144, BELT_Z + 0.4],
        ],
        '',
        'fill="#43BC9C" opacity="0.4"',
      )}
      ${beltTeeth()}`

/* -------------------------------------------------------------- 검역대 */

const [lampX, lampY] = at(566, 140, 126)

const quarantine = `
      <g id="sa-quarantine">
        ${box(556, 96, 14, 14, 96)}
        ${box(556, 170, 14, 14, 96)}
        ${box(556, 96, 14, 88, 14, { z: 96 })}
        ${line(
          [
            [556, 96, 112],
            [556, 184, 112],
          ],
          'gear',
        )}
        <!-- 검역 스캔면 -->
        ${plane(
          [
            [563, 100, 96],
            [563, 180, 96],
            [563, 180, 0],
            [563, 100, 0],
          ],
          'gear-fill',
          'opacity="0.14"',
        )}
        <circle id="sa-lamp" cx="${lampX}" cy="${lampY}" r="9" fill="#43BC9C" />
      </g>`

/* --------------------------------------------------------- 적발 트레이

   검역대 옆 탁자.  가방에서 꺼낸 것이 여기 남고, 가방만 나간다. */

const FINDS = [
  { id: 'sa-find-1', x: 372, color: '#E25749' },
  { id: 'sa-find-2', x: 404, color: '#F0A63A' },
  { id: 'sa-find-3', x: 436, color: '#E25749' },
]

const tray = `
      <g id="sa-tray">
        ${box(352, 208, 112, 62, 22)}
        ${plane(
          [
            [358, 214, 23],
            [458, 214, 23],
            [458, 264, 23],
            [358, 264, 23],
          ],
          'f-r',
        )}
        ${FINDS.map(
          ({ id, x, color }) => `
        <g id="${id}">
          ${box(x, 226, 20, 20, 16, { z: 23 })}
          <path d="M ${at(x + 10, 236, 45)[0]} ${at(x + 10, 236, 45)[1] - 4}
                   m -6 0 a 6 6 0 1 1 12 0 a 6 6 0 1 1 -12 0"
                fill="none" stroke="${color}" stroke-width="1.75" />
        </g>`,
        ).join('')}
      </g>`

/* --------------------------------------------------------- 2갈래 출구 */

const LANES = [
  { key: 'deliver', y: 60, color: '#7FBF57', label: t.deliver },
  { key: 'drop', y: 196, color: '#E25749', label: t.drop },
]

const gates = `
      <g id="sa-gates">
        ${box(104, 52, 56, 196, BELT_Z, BELT_FACES)}
        ${LANES.map(
          ({ key, y, color }) => `
        ${box(0, y, 104, 44, BELT_Z, { id: `sa-path-${key}`, ...BELT_FACES })}
        ${plane(
          [
            [4, y + 18, BELT_Z + 0.4],
            [100, y + 18, BELT_Z + 0.4],
            [100, y + 26, BELT_Z + 0.4],
            [4, y + 26, BELT_Z + 0.4],
          ],
          '',
          `fill="${color}" opacity="0.75"`,
        )}
        <circle id="sa-lamp-${key}" cx="${at(24, y + 22, 58)[0]}"
                cy="${at(24, y + 22, 58)[1]}" r="8" fill="${color}" />`,
        ).join('')}
      </g>`

/* -------------------------------------------------------------- 가방 */

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

/* ------------------------------------------------------------------ 조립 */

export function sceneArrivalsSvg() {
  const body = `
      ${shell}
      ${conveyor}
      ${tray}
      ${bag('sa-bag-1', 800, 140, { z: BELT_Z })}
      ${bag('sa-bag-2', 690, 140, { z: BELT_Z })}
      ${quarantine}
      ${bag('sa-bag-3', 566, 140, { z: BELT_Z })}
      ${gates}
      ${figure([640, 250])}

      ${callout({
        n: '01',
        from: at(0, 0, 0),
        to: [300, 44],
        side: 'left',
        title: t.floor,
      })}
      ${callout({
        n: '02',
        from: at(820, 164, BELT_Z),
        to: [1120, 640],
        side: 'right',
        title: t.belt,
        sub: t.beltSub,
      })}
      ${callout({
        n: '03',
        from: at(563, 138, 112),
        to: [860, 128],
        side: 'right',
        title: t.quarantine,
        sub: t.quarantineSub,
      })}
      ${callout({
        n: '04',
        from: at(408, 266, 45),
        to: [430, 660],
        side: 'right',
        title: t.tray,
        sub: [t.traySub, ...t.found.map((f) => `· ${f}`)],
      })}
      ${callout({
        n: '05',
        from: at(24, 82, 58),
        to: [560, 214],
        side: 'right',
        title: t.deliver,
        cls: 'co-title--allow',
      })}
      ${callout({
        n: '06',
        from: at(24, 218, 58),
        to: [180, 470],
        side: 'left',
        title: t.drop,
        cls: 'co-title--block',
      })}`

  return svgWrap({
    id: 'sa',
    viewBox: '0 0 1440 812',
    title: t.svgTitle,
    desc: t.svgDesc,
    body,
  })
}

/* ==========================================================================
   M3 — 도착 가방이 검역대를 지나며 하나씩 적발되고 2갈래로 갈린다.
   출국층과 달리 pin 하지 않는다 (같은 장치를 두 번 쓰면 지루하다).
   ========================================================================== */

const QUARANTINE = [566, 140, BELT_Z]
const JUNCTION = [132, 150, BELT_Z]
const EXIT = {
  deliver: [40, 82, BELT_Z],
  drop: [40, 218, BELT_Z],
}

export function sceneArrivalsAnim(root, gsap) {
  const q = (sel) => root.querySelector(sel)
  gsap.set(root.querySelectorAll('[id^="sa-find-"]'), { opacity: 0 })

  const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8, defaults: { ease: 'none' } })

  const runBag = (id, origin, verdict, findSel, t0) => {
    const el = q(`#${id}`)
    if (!el) return
    const toQ = delta(origin, QUARANTINE)
    const toJ = delta(origin, JUNCTION)
    const toE = delta(origin, EXIT[verdict])

    tl.to(el, { x: toQ.x, y: toQ.y, duration: 1.1 }, t0)
      // 검역 표시등이 판정 색으로 바뀐다.
      .to(q('#sa-lamp'), { fill: verdict === 'drop' ? '#E25749' : '#F0A63A', duration: 0.2 }, t0 + 1.1)
    if (findSel) {
      tl.fromTo(
        q(findSel),
        { opacity: 0, y: -22 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
        t0 + 1.2,
      )
    }
    tl.to(q('#sa-lamp'), { fill: '#43BC9C', duration: 0.3 }, t0 + 1.9)
      .to(el, { x: toJ.x, y: toJ.y, duration: 1 }, t0 + 1.9)
      .to(el, { x: toE.x, y: toE.y, duration: 0.6 }, t0 + 2.9)
      .to(el, { opacity: 0, duration: 0.3 }, t0 + 3.4)
  }

  runBag('sa-bag-3', [566, 140, BELT_Z], 'deliver', '#sa-find-1', 0)
  runBag('sa-bag-2', [690, 140, BELT_Z], 'drop', '#sa-find-2', 2.2)
  runBag('sa-bag-1', [800, 140, BELT_Z], 'deliver', '#sa-find-3', 4.4)

  const tooth = delta([28, 140, BELT_Z], [0, 140, BELT_Z])
  gsap.to(q('#sa-belt-teeth'), {
    x: tooth.x,
    y: tooth.y,
    duration: 1.1,
    ease: 'none',
    repeat: -1,
  })

  return tl
}
