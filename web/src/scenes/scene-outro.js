/**
 * SCENE 10 · 아웃트로 — 눈에 띄지 않는 자리에서 계속 돌아가는 검사대.
 *
 * 이 장면이 말해야 하는 것은 "사라졌다" 가 아니라 **"안 보일 뿐 그대로 돈다"**
 * 이다.  그래서 예전처럼 빈 윤곽선을 흐리게 깜빡이는 방식은 쓰지 않는다 —
 * 그건 '꺼져 가는 것' 으로 읽힌다.  대신 두 가지를 그림으로 증명한다:
 *
 *   1) 땅을 잘라 낸다.  위층은 평범한 캠퍼스, 아래층에는 불을 켠 검사대.
 *      '보이지 않는 것' 과 '없는 것' 이 다르다는 말을 단면으로 보여 준다.
 *   2) 가방 경로가 땅 아래로 내려갔다 올라온다.  캠퍼스에서 출발한 질문이
 *      검사대를 지나지 않고 국경으로 갈 길이 그림 안에 없다.
 *
 * 아래층은 SCENE 04 의 터미널과 같은 검사장 색을 그대로 쓴다.  가라앉히면
 * '꺼져 가는 것' 으로 읽혀 이 장면의 논지와 반대가 된다 — 안 보이는 것은
 * 위치이지 밝기가 아니다.  가려 주는 것은 색이 아니라 그 위를 덮은 땅이다.
 *
 * M3 애니메이션 대상 id:
 *   #so-bag-1 … #so-bag-3   땅 아래로 내려갔다 올라오는 가방
 *   #so-route-1 … #so-route-3   그 경로
 *   #so-belt                 아래층 컨베이어 흐름
 *   #so-gate-lamp-1 … 3   가동 표시등 (꺼지지 않는다 — 맥동만 한다)
 *   #so-gate-scan            검사대 스캔 커튼
 */

import { callout, svgWrap } from './_svg.js'
import { isoSpace } from './_iso.js'
import { campus, checkpointGate, globe, globeAnim, HOME_FACE } from './_places.js'
import { sceneOutro as t } from '../content/strings.js'

export const iso = isoSpace({ ox: 400, oy: 168, s: 1 })
const { at, pt, box, slab, line, plane, grid, cutHatch, curve, shadow } = iso

/* ------------------------------------------------------------ 위층 (보이는 것) */

const homeland = `
      ${slab(0, 0, 300, 400, 16, { tone: 'home' })}
      ${grid(0, 0, 300, 400, 50)}
      ${cutHatch(0, 0, 300, 400, 16, 'l')}
      ${cutHatch(0, 0, 300, 400, 16, 'r')}
      ${campus(iso, 0, 0, 300, 400, { detail: true })}`

/* 터미널이 있던 자리.  앞쪽 절반을 잘라 내 아래를 드러낸다 — 남은 것은 뒤쪽
   띠와, 잘린 자리를 알려 주는 점선뿐이다. */
const CUT_Y = 158 // 땅이 잘린 선

const siteGround = `
      ${slab(296, 90, 244, CUT_Y - 90, 16, { tone: 'home' })}
      ${grid(296, 90, 244, CUT_Y - 90, 50)}
      ${cutHatch(296, 90, 244, CUT_Y - 90, 16, 'l')}
      ${cutHatch(296, 90, 244, CUT_Y - 90, 16, 'r')}
      <!-- 걷어 낸 땅이 원래 있던 자리 -->
      ${line(
        [
          [296, CUT_Y],
          [540, CUT_Y],
          [540, 310],
          [296, 310],
        ],
        'hair',
        true,
        'stroke-dasharray="8 7" opacity="0.55"',
      )}`

/* ------------------------------------------------- 아래층 (실제로 일어나는 일) */

const FLOOR = -128 // 아래층 바닥
const BELT = FLOOR + 10

const underworld = `
      <g id="so-under">
        <!-- 바닥 -->
        ${box(306, 162, 228, 146, 14, { z: FLOOR - 14, cls: 'wall' })}
        <!-- 컨베이어 — 위층에서 내려온 가방이 타는 자리 -->
        ${box(306, 214, 228, 30, 10, { z: FLOOR, top: 'belt-top', l: 'belt-l', r: 'belt-r' })}
        ${plane(
          [
            [306, 226, BELT + 0.4],
            [534, 226, BELT + 0.4],
            [534, 234, BELT + 0.4],
            [306, 234, BELT + 0.4],
          ],
          '',
          'id="so-belt" fill="#F0A63A" opacity="0.5"',
        )}
        <!-- 검사대 — 위층 터미널과 같은 부품이다.  안 보이는 자리에 있을 뿐
             같은 관문이라는 것이 형태로 읽혀야 한다 -->
        ${shadow(392, 190, 28, 100, { z: FLOOR, opacity: 0.45, grow: 2 })}
        ${checkpointGate(iso, {
          x: 392,
          y: 188,
          d: 104,
          t: 24,
          h: 78,
          post: 22,
          beam: 20,
          rails: 46,
          z: FLOOR,
          id: 'so-gate',
        })}
        <text x="${at(406, 300, FLOOR + 4)[0]}" y="${at(406, 300, FLOOR + 4)[1] + 30}"
              text-anchor="middle" letter-spacing="3"
              style="font-size:16px;fill:#43BC9C" font-weight="700">${t.running}</text>
        <!-- 통과 시간 — '느려지지 않는다' 를 말이 아니라 숫자로 둔다. 가동 표시
             바로 아래에 붙여 검사대의 상태값으로 읽히게 하고, 가방 경로와 겹치지
             않는 빈자리에 놓는다. 색은 경로와 같은 호박색 — 지나가는 시간이다. -->
        ${(() => {
          const [gx, gy] = at(406, 300, FLOOR + 4)
          const ty = gy + 66
          return `<g id="so-timing">
          <rect x="${gx - 54}" y="${ty - 21}" width="108" height="30" rx="15"
                fill="#131418" stroke="#F0A63A" stroke-width="1.4" />
          <text x="${gx}" y="${ty}" text-anchor="middle" font-weight="700"
                style="font-size:17px;fill:#F0A63A">${t.timing}</text>
          <text x="${gx}" y="${ty + 25}" text-anchor="middle"
                style="font-size:14px;fill:var(--c-muted)">${t.timingSub}</text>
        </g>`
        })()}
      </g>`

/* 잘린 땅의 단면 — 아래층이 '땅속' 임을 이 면이 말한다. */
const cutFace = `
      <g class="solid" opacity="0.9">
        ${plane(
          [
            [296, CUT_Y, 0],
            [540, CUT_Y, 0],
            [540, CUT_Y, FLOOR - 14],
            [296, CUT_Y, FLOOR - 14],
          ],
          'home-g-r',
        )}
        ${Array.from({ length: 9 }, (_, i) =>
          line(
            [
              [302 + i * 28, CUT_Y, 0],
              [302 + i * 28, CUT_Y, FLOOR - 14],
            ],
            'hatch',
          ),
        ).join('')}
      </g>`

/* 지면선 — 위/아래를 가르는 기준선. 이 장면의 논지가 이 선 하나다. */
const groundLine = `
      ${line(
        [
          [296, CUT_Y, 0],
          [540, CUT_Y, 0],
        ],
        '',
        false,
        'stroke="#F0A63A" stroke-width="2" opacity="0.85"',
      )}
      <text x="${at(540, CUT_Y, 0)[0] + 16}" y="${at(540, CUT_Y, 0)[1] + 6}"
            letter-spacing="4" style="font-size:16px;fill:#F0A63A" font-weight="700">${
              t.groundLine
            }</text>`

/** 지면선의 화면 높이 — 왼쪽 레일 눈금을 여기에 맞춘다. */
const GL_Y = at(296, CUT_Y, 0)[1]

/* 국경 밖 — 비유가 끝나는 자리라 여기서만 실제 서비스 이름을 쓴다.
   "그래서 이게 어디로 가는 얘기냐" 를 그림 안에서 끊는다. */
const [obX, obY] = at(900, 40, 0)

const outland = `
      <g opacity="0.72">${globe(iso, [900, 40], 108, { id: 'so-globe' })}</g>
      <text x="${obX}" y="${obY + 34}" text-anchor="middle" letter-spacing="1"
            style="font-size:18px;fill:var(--c-label)" font-weight="700">${t.services}</text>
      <text x="${obX}" y="${obY + 57}" text-anchor="middle"
            style="font-size:15px;fill:var(--c-muted)">${t.servicesSub}</text>`

/* --------------------------------------------------- 내려갔다 올라오는 경로

   캠퍼스에서 출발한 가방이 땅 아래로 내려가 컨베이어를 타고, 검사대를 지난
   뒤 다시 올라가 국경 너머로 나간다.  검사대를 건너뛰는 길은 그리지 않는다 —
   그림 안에 없는 길은 실제로도 없다는 것이 이 장면의 주장이다. */

const ROUTES = [
  [
    [14, 96, 0],
    [190, 120, 0],
    [300, 176, -30],
    [330, 208, BELT],
    [420, 228, BELT],
    [540, 236, -40],
    [600, 200, 20],
  ],
  [
    [88, 366, 0],
    [232, 300, 0],
    [300, 252, -30],
    [336, 226, BELT],
    [432, 230, BELT],
    [548, 244, -40],
    [606, 208, 20],
  ],
  [
    [250, 360, 0],
    [318, 322, 0],
    [306, 274, -30],
    [344, 240, BELT],
    [444, 232, BELT],
    [556, 250, -40],
    [612, 216, 20],
  ],
]

/** 지면을 드나드는 지점 — 아래로 꽂히는 화살표와 위로 나가는 화살표. */
const arrowAt = (plan, dir) => {
  const [x, y] = at(...plan)
  const s = dir === 'down' ? 1 : -1
  return `
      <g opacity="0.95">
        <path d="M ${x} ${y - 22 * s} V ${y + 10 * s}" stroke="#F0A63A" stroke-width="2.4" />
        <path d="M ${x - 7} ${y + 2 * s} L ${x} ${y + 12 * s} L ${x + 7} ${y + 2 * s} Z"
              fill="#F0A63A" />
      </g>`
}

const diveMarks = `
      ${arrowAt([302, 214, -6], 'down')}
      ${arrowAt([540, 240, -18], 'up')}`

const bag = (id, x, y, { z = 0, w = 22, d = 15, h = 17 } = {}) => {
  const [hx, hy] = at(x, y, z + h)
  return `
      <g id="${id}">
        ${box(x - w / 2, y - d / 2, w, d, h, {
          z,
          cls: 'bag fly',
          top: 'bag-top',
          l: 'bag-l',
          r: 'bag-r',
        })}
        <path d="M ${hx - 7} ${hy - 1} C ${hx - 7} ${hy - 11} ${hx + 7} ${hy - 11} ${hx + 7} ${hy - 1}"
              fill="none" stroke="#b97a22" stroke-width="2" />
      </g>`
}

/* ------------------------------------------------------------------ 조립 */

export function sceneOutroSvg() {
  const body = `
      ${homeland}
      ${siteGround}
      ${cutFace}
      ${underworld}
      ${groundLine}
      ${ROUTES.map(
        (pts, i) =>
          curve(
            pts,
            'route',
            `id="so-route-${i + 1}" style="stroke:#F0A63A;stroke-width:2.2;stroke-dasharray:9 6" opacity="0.9"`,
          ),
      ).join('')}
      ${diveMarks}
      ${bag('so-bag-1', 200, 130)}
      ${bag('so-bag-2', 268, 258)}
      ${bag('so-bag-3', 352, 246)}
      ${outland}

      <!-- 두 층을 말로도 갈라 준다.  세로 레일은 캠퍼스를 가로질러 오히려
           지저분해져서, 각 층의 빈 자리에 직접 얹었다. -->
      <text x="104" y="296" letter-spacing="3"
            style="font-size:18px;fill:var(--c-label)" font-weight="700">${t.surfaceLabel}</text>
      <text x="150" y="646" letter-spacing="3"
            style="font-size:18px;fill:#43BC9C" font-weight="700">${t.undergroundLabel}</text>
      <text x="150" y="670"
            style="font-size:15px;fill:var(--c-muted)">${t.cutNote}</text>

      ${callout({
        n: '01',
        from: at(120, 200, 0),
        to: [430, 62],
        side: 'left',
        title: t.campus,
        sub: t.campusSub,
      })}
      ${callout({
        n: '02',
        from: at(422, 218, FLOOR + 74),
        to: [1020, 300],
        side: 'right',
        title: t.sunk,
        sub: t.sunkSub,
        cls: 'co-title--bag',
      })}
      ${callout({
        n: '03',
        from: at(470, 230, BELT),
        to: [962, 470],
        side: 'right',
        title: t.through,
        sub: t.throughSub,
        cls: 'co-title--allow',
      })}`

  return svgWrap({
    id: 'so',
    viewBox: '0 0 1440 760',
    title: t.svgTitle,
    desc: t.svgDesc,
    body,
  })
}

/* ==========================================================================
   M3 — 위층은 평소와 같고, 아래층은 쉬지 않는다.

   예전에는 아래층 윤곽이 서서히 사라졌다 나타났다 했는데, 그건 '꺼져 가는 것'
   으로 읽혀 이 장면의 논지와 정반대였다.  이제 표시등은 꺼지지 않고 맥동만
   하고, 벨트와 스캔 빔은 계속 돈다.
   ========================================================================== */

export function sceneOutroAnim(root, gsap) {
  globeAnim(root, gsap, 'so-globe', 108)

  const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } })

  ;['so-bag-1', 'so-bag-2', 'so-bag-3'].forEach((id, i) => {
    const el = root.querySelector(`#${id}`)
    const path = root.querySelector(`#so-route-${i + 1}`)
    if (!el || !path) return
    tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.7 }, i * 2.6)
      .to(
        el,
        {
          duration: 8,
          ease: 'none',
          motionPath: { path, align: path, alignOrigin: [0.5, 0.86] },
        },
        i * 2.6,
      )
      .to(el, { opacity: 0, duration: 0.7 }, i * 2.6 + 7.3)
  })

  // 벨트 흐름 — 아래층이 돌고 있다는 가장 단순한 신호.
  gsap.fromTo(
    root.querySelector('#so-belt'),
    { opacity: 0.28 },
    { opacity: 0.62, duration: 1.4, ease: 'sine.inOut', repeat: -1, yoyo: true },
  )

  // 스캔 빔 — 계속 훑는다.
  gsap.fromTo(
    root.querySelector('#so-gate-scan'),
    { opacity: 0.1 },
    { opacity: 0.3, duration: 1.1, ease: 'sine.inOut', repeat: -1, yoyo: true },
  )

  // 표시등 — 꺼지지 않는다. 0.45 아래로는 내려가지 않게 잡았다.
  gsap.to(root.querySelectorAll('[id^="so-gate-lamp-"]'), {
    opacity: 0.45,
    duration: 1.2,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true,
    stagger: 0.22,
  })

  return tl
}
