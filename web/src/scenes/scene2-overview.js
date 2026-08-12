/**
 * SCENE 02 · 조감도 — 아이소메트릭 부감.
 *
 * 평면좌표계에서 좌상(캠퍼스) → 우하(외부 AI 대륙) 으로 대각선 구성을 잡고,
 * 그 사이 유일한 통로로 터미널 섬을 놓는다.  캠퍼스 각지의 단말에서 출발한
 * 가방이 다리 하나로 모여 터미널로 들어간다.
 *
 * M3 애니메이션 대상 id:
 *   #s2-bag-1 … #s2-bag-5        경로를 따라 모여드는 가방
 *   #s2-route-phone|tablet|laptop|pc   가방이 탈 모션 경로
 *   #s2-beacon                   관제탑 경광등
 *   #s2-flight                   국경을 넘는 비행 경로
 *   #s2-smoke-1 … #s2-smoke-3    공장 연기
 *   #s2-device-phone|tablet|laptop|pc  단말 심볼
 */

import { callout, svgWrap } from './_svg.js'
import { isoSpace } from './_iso.js'
import { scene2 as t } from '../content/strings.js'

export const iso = isoSpace({ ox: 406, oy: 130, s: 1 })
const { at, box, slab, line, plane, grid, cutHatch, curve } = iso

/* ---------------------------------------------------------------- 캠퍼스 */

// (x, y, w, d, h) — 멀리 있는 것(x+y 작은 것)부터 그린다.
const CAMPUS_BLOCKS = [
  [30, 40, 46, 46, 92],
  [100, 24, 40, 56, 132],
  [46, 150, 46, 52, 116],
  [178, 60, 52, 46, 74],
  [24, 268, 42, 44, 84],
  [132, 168, 58, 50, 150],
  [224, 150, 44, 48, 96],
  [120, 282, 50, 46, 108],
  [210, 268, 46, 50, 130],
]

/** 건물 +y 면에 창 두 줄. 면 위 평면이라 원근이 흐트러지지 않는다. */
const windows = (x, y, w, d, h) => {
  const out = []
  const fy = y + d
  for (const z of [h - 26, h - 56]) {
    if (z < 16) continue
    for (let wx = x + 8; wx + 10 <= x + w - 8; wx += 18) {
      out.push(
        plane(
          [
            [wx, fy, z + 12],
            [wx + 10, fy, z + 12],
            [wx + 10, fy, z],
            [wx, fy, z],
          ],
          'f-top',
          'opacity="0.5"',
        ),
      )
    }
  }
  return out.join('')
}

const campus = `
      ${slab(0, 0, 300, 400, 16)}
      ${grid(0, 0, 300, 400, 50)}
      ${cutHatch(0, 0, 300, 400, 16, 'l')}
      ${cutHatch(0, 0, 300, 400, 16, 'r')}
      ${CAMPUS_BLOCKS.map((b) => box(...b) + windows(...b)).join('')}`

/* ------------------------------------------------------------ 단말 4종 */

/* 부감에서 단말을 실제 비율로 두면 안 보인다.  설명 다이어그램 관례대로
   심볼은 화면좌표로 크게 세워 두고, 발치에만 아이소메트릭 그림자를 깐다. */
const device = (id, plan, shape) => {
  const [x, y] = at(...plan)
  return `
      <g id="s2-device-${id}">
        <polygon points="${x - 15},${y} ${x},${y - 8} ${x + 15},${y} ${x},${y + 8}"
                 fill="#0f1116" opacity="0.55" />
        <g transform="translate(${x} ${y})">
${shape}
        </g>
      </g>`
}

const DEVICES = [
  device(
    'phone',
    [14, 96],
    `          <rect class="f-top solid" x="-11" y="-40" width="22" height="38" rx="3" />
          <rect fill="#F0A63A" x="-8" y="-36" width="16" height="27" rx="1" />`,
  ),
  device(
    'tablet',
    [12, 220],
    `          <rect class="f-top solid" x="-17" y="-46" width="34" height="44" rx="3" />
          <rect fill="#F0A63A" x="-13" y="-42" width="26" height="33" rx="1" />`,
  ),
  device(
    'laptop',
    [88, 366],
    `          <path class="f-l solid" d="M -27 0 L 27 0 L 22 -7 L -22 -7 Z" />
          <rect class="f-top solid" x="-22" y="-38" width="44" height="31" rx="2" />
          <rect fill="#F0A63A" x="-18" y="-34" width="36" height="23" />`,
  ),
  device(
    'pc',
    [250, 360],
    `          <rect class="f-top solid" x="-26" y="-44" width="52" height="35" rx="2" />
          <rect fill="#F0A63A" x="-22" y="-40" width="44" height="27" />
          <path class="f-l solid" d="M -7 -9 L 7 -9 L 10 0 L -10 0 Z" />
          <rect class="f-r solid" x="30" y="-36" width="15" height="36" rx="2" />`,
  ),
].join('')

/* ------------------------------------------------------------ 터미널 섬 */

const [beaconX, beaconY] = at(402, 210, 156)

const terminal = `
      ${slab(380, 90, 160, 220, 16)}
      ${cutHatch(380, 90, 160, 220, 16, 'l')}
      ${cutHatch(380, 90, 160, 220, 16, 'r')}
      <g id="s2-terminal">
        <!-- 활주로 (지면이라 가장 먼저) -->
        ${plane(
          [
            [396, 240, 1],
            [532, 240, 1],
            [532, 268, 1],
            [396, 268, 1],
          ],
          'f-r',
        )}
        ${line(
          [
            [404, 254, 2],
            [524, 254, 2],
          ],
          'route',
        )}
        <!-- 본동 -->
        ${box(398, 126, 116, 66, 62)}
        ${line(
          [
            [398, 126, 62],
            [514, 126, 62],
            [514, 192, 62],
            [398, 192, 62],
          ],
          'gear',
          true,
        )}
        <!-- 가방이 들어오는 입구 -->
        ${plane(
          [
            [416, 192, 30],
            [446, 192, 30],
            [446, 192, 0],
            [416, 192, 0],
          ],
          'gear-fill',
          'opacity="0.28"',
        )}
        <!-- 관제탑 -->
        ${box(392, 200, 20, 20, 130)}
        ${box(385, 193, 34, 34, 14, { z: 130 })}
        <circle id="s2-beacon" class="gear-fill" cx="${beaconX}" cy="${beaconY}" r="6" />
        <!-- 탑승교 -->
        ${box(514, 134, 30, 7, 5, { z: 30 })}
        ${box(514, 152, 30, 7, 5, { z: 30 })}
        ${box(514, 170, 30, 7, 5, { z: 30 })}
      </g>`

/* 캠퍼스와 터미널을 잇는 유일한 다리 */
const bridge = `
      ${slab(296, 168, 86, 44, 8)}`

/* -------------------------------------------------------------- 외부 대륙 */

const factoryWindows = () => {
  const out = []
  for (const z of [30, 62]) {
    for (let wx = 750; wx < 950; wx += 34) {
      out.push(
        plane(
          [
            [wx, 340, z + 16],
            [wx + 20, 340, z + 16],
            [wx + 20, 340, z],
            [wx, 340, z],
          ],
          'f-deep',
        ),
      )
    }
  }
  return out.join('')
}

const smoke = ['s2-smoke-1', 's2-smoke-2', 's2-smoke-3']
  .map((id, i) => {
    const [cx, cy] = at([772, 833, 890][i], [102, 74, 112][i], [206, 236, 186][i])
    return `<circle id="${id}" cx="${cx}" cy="${cy}" r="${[13, 17, 11][i]}"
              fill="#3C3E46" opacity="0.4" />`
  })
  .join('')

const factory = `
      ${slab(700, 0, 300, 400, 16, { id: 's2-outer' })}
      ${cutHatch(700, 0, 300, 400, 16, 'l')}
      ${cutHatch(700, 0, 300, 400, 16, 'r')}
      <g id="s2-factory">
        ${box(730, 40, 240, 300, 92)}
        ${factoryWindows()}
        <!-- 톱니 지붕 -->
        ${[0, 1, 2, 3, 4]
          .map((i) => box(736 + i * 48, 40, 30, 300, 20, { z: 92 }))
          .join('')}
        <!-- 굴뚝 -->
        ${box(760, 90, 24, 24, 102, { z: 92 })}
        ${box(820, 62, 26, 26, 132, { z: 92 })}
        ${box(878, 100, 22, 22, 82, { z: 92 })}
        ${smoke}
        <!-- 가동 표시 -->
        ${plane(
          [
            [746, 340, 18],
            [954, 340, 18],
            [954, 340, 8],
            [746, 340, 8],
          ],
          'bag-r',
          'opacity="0.5"',
        )}
      </g>`

/* ---------------------------------------------------------------- 경로·가방 */

const ROUTES = {
  phone: [
    [14, 96],
    [210, 116],
    [418, 190],
  ],
  tablet: [
    [12, 220],
    [212, 198],
    [420, 192],
  ],
  laptop: [
    [88, 366],
    [258, 262],
    [424, 194],
  ],
  pc: [
    [250, 360],
    [332, 282],
    [428, 196],
  ],
}

const routes = Object.entries(ROUTES)
  .map(([k, pts]) => curve(pts, 'route', `id="s2-route-${k}"`))
  .join('')

/** 여행 가방 — 평면 중심 (x, y) 에 놓는 아이소메트릭 상자 + 손잡이. */
const bag = (id, x, y, { z = 0, w = 22, d = 15, h = 17 } = {}) => {
  const [hx, hy] = at(x, y, z + h)
  return `
      <g id="${id}">
        ${box(x - w / 2, y - d / 2, w, d, h, {
          top: 'bag-top',
          l: 'bag-l',
          r: 'bag-r',
        })}
        <path d="M ${hx - 7} ${hy - 1} C ${hx - 7} ${hy - 11} ${hx + 7} ${hy - 11} ${hx + 7} ${hy - 1}"
              fill="none" stroke="#b97a22" stroke-width="2" />
      </g>`
}

/* ------------------------------------------------------------------ 국경 */

/* 국경 — 실선 하나로는 부감에서 읽히지 않아, 점선 본선에 짧은 경계 눈금을
   일정 간격으로 붙여 '경계'로 읽히게 한다. */
const border = `
      <g id="s2-border">
        ${line(
          [
            [620, -130],
            [620, 520],
          ],
          'border-line',
        )}
        ${Array.from({ length: 12 }, (_, i) => {
          const y = -110 + i * 56
          // 본선 한쪽으로만 뻗는 짧은 경계 눈금 (교차하면 X 자로 읽힌다).
          return line(
            [
              [620, y],
              [598, y],
            ],
            'hair',
          )
        }).join('')}
      </g>`

/* ------------------------------------------------------------------ 조립 */

export function scene2Svg() {
  const body = `
      ${campus}
      ${DEVICES}
      ${routes}
      ${bag('s2-bag-1', 190, 128)}
      ${bag('s2-bag-2', 168, 216)}
      ${bag('s2-bag-3', 238, 286)}
      ${bridge}
      ${bag('s2-bag-4', 330, 190)}
      ${terminal}
      ${bag('s2-bag-5', 388, 208)}
      ${border}
      ${factory}

      <!-- 국경을 넘는 비행 경로 (SCENE 04 로 이어짐) -->
      ${curve(
        [
          [532, 254, 6],
          [646, 196, 150],
          [756, 150, 118],
        ],
        'route',
        'id="s2-flight" opacity="0.4"',
      )}

      ${callout({
        n: '01',
        from: at(0, 0, 0),
        to: [366, 70],
        side: 'left',
        title: t.campus,
      })}
      ${callout({
        n: '02',
        from: at(250, 360, 0),
        to: [420, 600],
        side: 'right',
        title: t.devices,
        sub: t.devicesSub,
        cls: 'co-title--bag',
      })}
      ${callout({
        n: '03',
        from: at(456, 159, 62),
        to: [880, 250],
        side: 'right',
        title: t.terminal,
        sub: t.terminalSub,
      })}
      ${callout({
        n: '04',
        from: at(620, 20, 0),
        to: [1140, 196],
        side: 'right',
        title: t.border,
      })}
      ${callout({
        n: '05',
        from: at(833, 75, 224),
        to: [1140, 320],
        side: 'right',
        title: t.factory,
        sub: t.factorySub,
      })}`

  return svgWrap({
    id: 's2',
    viewBox: '0 0 1440 880',
    title: t.svgTitle,
    desc: t.svgDesc,
    body,
  })
}

/* ==========================================================================
   M3 애니메이션 — 캠퍼스 각지의 가방이 경로를 따라 터미널로 모여든다.
   MotionPathPlugin 으로 실제 경로(#s2-route-*) 위를 태우므로, 경로를 고치면
   애니메이션이 따라온다.
   ========================================================================== */

const BAG_ROUTES = [
  ['#s2-bag-1', '#s2-route-phone'],
  ['#s2-bag-2', '#s2-route-tablet'],
  ['#s2-bag-3', '#s2-route-laptop'],
  ['#s2-bag-4', '#s2-route-pc'],
]

export function scene2Anim(root, gsap) {
  const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } })

  BAG_ROUTES.forEach(([bagSel, pathSel], i) => {
    const el = root.querySelector(bagSel)
    const path = root.querySelector(pathSel)
    if (!el || !path) return
    const start = i * 1.5
    tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.9 }, start)
      .to(
        el,
        {
          duration: 7,
          motionPath: { path, align: path, alignOrigin: [0.5, 0.86] },
        },
        start,
      )
      // 터미널 입구에서 사라진다 — 안으로 들어갔다는 뜻.
      .to(el, { opacity: 0, duration: 0.8 }, start + 6.2)
  })

  // 터미널에 도착해 대기 중인 가방은 살짝 들썩인다.
  gsap.to(root.querySelector('#s2-bag-5'), {
    y: -5,
    duration: 1.4,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true,
  })

  gsap.to(root.querySelector('#s2-beacon'), {
    opacity: 0.25,
    duration: 0.85,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true,
  })

  gsap.to(root.querySelectorAll('[id^="s2-smoke-"]'), {
    y: -26,
    opacity: 0,
    scale: 1.5,
    transformOrigin: '50% 50%',
    duration: 4.5,
    ease: 'sine.out',
    repeat: -1,
    stagger: { each: 1.2, repeat: -1 },
  })

  // 국경을 넘는 항로는 점선이 흘러가는 것으로 방향을 보여 준다.
  gsap.to(root.querySelector('#s2-flight'), {
    strokeDashoffset: -36,
    duration: 2.2,
    ease: 'none',
    repeat: -1,
  })

  return tl
}
