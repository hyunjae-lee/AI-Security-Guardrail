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
import {
  campus,
  gateGlow,
  globe,
  globeAnim,
  GATE_FACE,
  HOME_FACE,
} from './_places.js'
import { scene2 as t } from '../content/strings.js'

export const iso = isoSpace({ ox: 406, oy: 130, s: 1 })
const { at, pt, box, slab, line, plane, grid, cutHatch, curve } = iso

const HOME = HOME_FACE

/* ---------------------------------------------------------------- 캠퍼스 */

const homeland = `
      ${slab(0, 0, 300, 400, 16, { tone: 'home' })}
      ${grid(0, 0, 300, 400, 50)}
      ${cutHatch(0, 0, 300, 400, 16, 'l')}
      ${cutHatch(0, 0, 300, 400, 16, 'r')}
      ${campus(iso, 0, 0, 300, 400)}`

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

/* 볼트(반원통) 지붕 — 이 건물만의 실루엣.

   상자에 평지붕을 얹으면 캠퍼스 연구동과 형태가 같아져, 색을 아무리 밝혀도
   '조금 밝은 건물' 로만 읽힌다.  아치 단면을 세워 두면 축소된 조감도에서도
   윤곽만으로 다른 종류의 건물이라는 게 먼저 온다 — 공항 터미널의 형태다.

   면을 부드럽게 잇지 않고 여덟 조각으로 각지게 나눈 것은 이 도면의 약속을
   따른 것이다(면은 평면, 음영은 세 단계).  뒤쪽 경사는 어둡게, 마루는 밝게. */
const VAULT_N = 8

const vault = (x0, x1, y0, y1, zBase, rise) => {
  const d = y1 - y0
  const zAt = (k) => zBase + rise * Math.sin(Math.PI * k)
  const tone = (k) => (k < 0.3 ? 'gate-r' : k < 0.62 ? 'gate-top' : 'gate-l')
  const strips = []
  for (let i = 0; i < VAULT_N; i++) {
    const k0 = i / VAULT_N
    const k1 = (i + 1) / VAULT_N
    strips.push(
      `<polygon class="${tone((k0 + k1) / 2)}" points="${[
        pt(x0, y0 + d * k0, zAt(k0)),
        pt(x1, y0 + d * k0, zAt(k0)),
        pt(x1, y0 + d * k1, zAt(k1)),
        pt(x0, y0 + d * k1, zAt(k1)),
      ].join(' ')}" />`,
    )
  }
  /* 보이는 쪽(+x) 마구리는 아치 그대로 뚫어 둔다 — 안이 비쳐야 '지나가는 곳'
     으로 읽힌다. 안쪽 면은 처마 밑 그늘색. */
  const archPts = []
  for (let i = 0; i <= VAULT_N * 2; i++) {
    const k = i / (VAULT_N * 2)
    archPts.push(pt(x1, y0 + d * k, zAt(k)))
  }
  const face = `<polygon class="gate-deep" points="${[
    pt(x1, y0, zBase),
    ...archPts,
    pt(x1, y1, zBase),
  ].join(' ')}" />`
  const rib = `<path class="gear" fill="none" d="M ${archPts.join(' L ')}" />`
  return `${strips.join('')}${face}${rib}`
}

/* ------------------------------------------------------------ 터미널 섬 */

const [beaconX, beaconY] = at(401, 214, 132)

/** 관문 — 가방이 실제로 통과하는 문.

    앞면에 아치로 뚫는다.  건물 앞에 문틀을 따로 세워 보았더니, 축소된 조감도
    에서는 건물 모서리에 걸린 고리 하나로 읽혀 무엇인지 알 수 없었다.  벽에
    뚫린 아치는 크기가 작아도 '들어가는 곳' 으로 바로 읽힌다. */
const portal = (() => {
  const X0 = 410
  const X1 = 448
  const H = 30 // 기둥 높이
  const R = 15 // 아치 높이
  const N = 10
  const arc = Array.from({ length: N + 1 }, (_, i) => {
    const k = i / N
    return pt(X0 + (X1 - X0) * k, 194, H + R * Math.sin(Math.PI * k))
  })
  const outline = `M ${pt(X0, 194, 0)} L ${arc.join(' L ')} L ${pt(X1, 194, 0)} Z`
  const [cx, cy] = at((X0 + X1) / 2, 194, H + R + 12)
  return `
        <g id="s2-portal">
          <path class="gate-deep" d="${outline}" />
          <path d="${outline}" fill="none" stroke="var(--c-gate-edge)"
                stroke-width="2.2" stroke-linejoin="round" />
          <!-- 문 위 표시등 — 열려서 돌아가고 있다는 신호 -->
          <circle cx="${cx}" cy="${cy}" r="3.4" class="gear-fill" opacity="0.9" />
        </g>`
})()

const terminal = `
      ${slab(380, 90, 160, 220, 16, { tone: 'home' })}
      ${cutHatch(380, 90, 160, 220, 16, 'l')}
      ${cutHatch(380, 90, 160, 220, 16, 'r')}
      <!-- 지면 후광 — 이 장면의 답이 되는 구조물이라 빛으로 한 번 더 짚는다 -->
      ${gateGlow(iso, [460, 200], 210, { id: 's2-gate' })}
      <g id="s2-terminal">
        <!-- 활주로 -->
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
        <!-- 본동 — 낮은 벽 위에 볼트 지붕 -->
        ${box(396, 122, 120, 72, 42, GATE_FACE)}
        ${vault(396, 516, 122, 194, 42, 34)}
        <!-- 앞면 유리 커튼월 — 벽 전체가 아니라 띠로만 넣어 면을 죽이지 않는다 -->
        ${plane(
          [
            [456, 194, 34],
            [512, 194, 34],
            [512, 194, 12],
            [456, 194, 12],
          ],
          'gate-glass',
          'opacity="0.16"',
        )}
        ${Array.from({ length: 4 }, (_, i) =>
          line(
            [
              [466 + i * 12, 194, 34],
              [466 + i * 12, 194, 12],
            ],
            'hair',
          ),
        ).join('')}
        <!-- 마루 위 표시등 줄 — 운영 중이라는 신호 -->
        ${[0, 1, 2, 3]
          .map((i) => {
            const [lx, ly] = at(414 + i * 28, 158, 76)
            return `<circle cx="${lx}" cy="${ly}" r="3.4" class="gear-fill" opacity="0.85" />`
          })
          .join('')}
        <!-- 가방이 들어오는 관문 -->
        ${portal}
        <!-- 관제탑 — 아래는 가늘게, 위는 내밀어 공항 관제탑 실루엣으로 -->
        ${box(394, 206, 14, 14, 96, GATE_FACE)}
        ${box(389, 201, 24, 24, 16, { z: 96, ...GATE_FACE })}
        ${box(392, 204, 18, 18, 5, { z: 112, ...GATE_FACE })}
        <path d="M ${at(401, 213, 117)[0]} ${at(401, 213, 117)[1]}
                 L ${beaconX} ${beaconY}" class="gear" fill="none" />
        <circle id="s2-beacon" class="gear-fill" cx="${beaconX}" cy="${beaconY}" r="6" />
        <!-- 탑승교 — 끝에 항공기 스탠드 표시 -->
        ${[130, 150, 170]
          .map((y) => {
            const [sxp, syp] = at(540, y + 3, 30)
            return `${box(516, y, 24, 6, 5, { z: 25, ...GATE_FACE })}
        <circle cx="${sxp}" cy="${syp}" r="4.2" fill="none"
                stroke="var(--c-gate-edge)" stroke-width="1.4" opacity="0.8" />`
          })
          .join('')}
      </g>`

/* 캠퍼스와 터미널을 잇는 유일한 다리 */
const bridge = `
      ${slab(296, 168, 86, 44, 8, { tone: 'home' })}`

/* -------------------------------------------------------------- 외부 대륙 */

const outland = globe(iso, [880, 200], 150, { id: 's2-globe' })

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
          cls: 'bag',
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

/* ------------------------------------------------------------------ 등식

   이 장면의 결론을 그림 바닥에 등식으로 박는다.  콜아웃은 부품을 가리키는
   주기지만, 이건 그림 전체가 무엇인지를 말하는 문장이라 격을 달리해 크게 쓴다.
   터미널 쪽은 호박(가방·비유), 가드레일 쪽은 청록(설비)으로 색을 갈라
   "왼쪽 말 = 오른쪽 말" 이 색으로도 읽히게 했다. */

/* 그림 바닥을 가로지르는 결론 띠.  괘선만 그으면 지구본을 뚫고 지나가므로
   판 색으로 채운 띠를 얹는다 — 겹침도 없애고, '이 장면의 결론' 이라는
   격도 생긴다. */

const EQ_TOP = 700
const EQ_H = 80
const EQ_MID = EQ_TOP + 34

const equation = `
      <g id="s2-equation">
        <rect x="60" y="${EQ_TOP}" width="1320" height="${EQ_H}" rx="4"
              fill="var(--c-stage)" stroke="#43BC9C" stroke-width="1.25" opacity="0.97" />
        <text x="694" y="${EQ_MID}" text-anchor="end"
              style="font-size:31px;fill:#F0A63A" font-weight="900">${t.equationLeft}</text>
        <text x="720" y="${EQ_MID}" text-anchor="middle"
              style="font-size:29px;fill:var(--c-muted)">=</text>
        <text x="746" y="${EQ_MID}" text-anchor="start"
              style="font-size:31px;fill:#43BC9C" font-weight="900">${t.equationRight}</text>
        <text x="720" y="${EQ_MID + 28}" text-anchor="middle"
              style="font-size:17px;fill:var(--c-label)">${t.equationNote}</text>
      </g>`

export function scene2Svg() {
  const body = `
      ${homeland}
      ${DEVICES}
      ${routes}
      ${bag('s2-bag-1', 190, 128)}
      ${bag('s2-bag-2', 168, 216)}
      ${bag('s2-bag-3', 238, 286)}
      ${bridge}
      ${bag('s2-bag-4', 330, 190)}
      ${terminal}
      ${bag('s2-bag-5', 394, 204)} <!-- 계류장 안으로 (귀퉁이가 허공에 걸려 있었다) -->
      ${border}
      ${outland}

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
        // 지구본에서 벗어난 국경 구간. 위쪽(y<150)은 지구본이 덮어 점이 파묻힌다.
        from: at(620, 210, 0),
        to: [1096, 196],
        side: 'right',
        title: t.border,
      })}
      ${callout({
        n: '05',
        from: at(880, 200, 250),
        to: [1096, 320],
        side: 'right',
        title: t.factory,
        sub: t.factorySub,
      })}
      ${equation}`

  return svgWrap({
    id: 's2',
    viewBox: '0 0 1440 796',
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
  globeAnim(root, gsap, 's2-globe', 150)

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

  // 후광 고리가 천천히 숨쉬면 '작동 중인 통제 지점' 으로 읽힌다
  gsap.to(root.querySelector('#s2-gate-ring'), {
    opacity: 0.18,
    duration: 2.6,
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
