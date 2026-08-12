/**
 * SCENE 05 · 활주로 — 국경을 넘는 왕복 노선.
 *
 * 터미널에서 이륙한 편이 국경을 넘어 공장으로 갔다가 답변 화물을 싣고 돌아온다.
 * 국경 바깥은 우리가 볼 수 없는 구간이라, 그 너머 전체에 어두운 장막을 덮어
 * "여기서부터 관제 밖" 을 톤으로 말한다.
 *
 * M3 애니메이션 대상 id:
 *   #sr-plane-out / #sr-plane-in   나가는 편 · 돌아오는 편
 *   #sr-arc-out / #sr-arc-in       두 편의 항로
 *   #sr-veil                       관제 밖 장막
 */

import { callout, svgWrap } from './_svg.js'
import { isoSpace } from './_iso.js'
import { sceneRunway as t } from '../content/strings.js'

export const iso = isoSpace({ ox: 330, oy: 130, s: 1 })
const { at, box, slab, line, plane, grid, cutHatch, curve } = iso

/* ------------------------------------------------------------ 우리 쪽 */

const terminal = `
      ${slab(0, 60, 200, 200, 16)}
      ${grid(0, 60, 200, 200, 50)}
      ${cutHatch(0, 60, 200, 200, 16, 'l')}
      ${cutHatch(0, 60, 200, 200, 16, 'r')}
      ${plane(
        [
          [24, 186, 1],
          [190, 186, 1],
          [190, 216, 1],
          [24, 216, 1],
        ],
        'f-r',
      )}
      ${line(
        [
          [36, 201, 2],
          [178, 201, 2],
        ],
        'route',
      )}
      ${box(34, 96, 104, 56, 52)}
      ${line(
        [
          [34, 96, 52],
          [138, 96, 52],
          [138, 152, 52],
          [34, 152, 52],
        ],
        'gear',
        true,
      )}
      ${box(150, 78, 18, 18, 96)}
      ${box(144, 72, 30, 30, 12, { z: 96 })}`

/* ------------------------------------------------------------ 저쪽 */

const factory = `
      ${slab(560, 0, 260, 320, 16)}
      ${cutHatch(560, 0, 260, 320, 16, 'l')}
      ${cutHatch(560, 0, 260, 320, 16, 'r')}
      ${box(590, 40, 200, 240, 80)}
      ${[0, 1, 2, 3].map((i) => box(596 + i * 46, 40, 28, 240, 16, { z: 80 })).join('')}
      ${box(616, 80, 20, 20, 84, { z: 80 })}
      ${box(672, 58, 22, 22, 104, { z: 80 })}`

/* ------------------------------------------------------------ 항공기 */

/** 아이소메트릭 여객기 — 동체 + 후퇴익 + 수평/수직 미익 + 기수.
    지면보다 밝은 craft-* 면을 써야 공중의 물체로 읽힌다. */
const CRAFT = { top: 'craft-top', l: 'craft-l', r: 'craft-r' }

const aircraft = (x, y, z) => `
      <g>
        ${box(x, y, 88, 20, 18, { z, ...CRAFT })}
        ${plane(
          [
            [x + 30, y - 34, z + 9],
            [x + 52, y - 34, z + 9],
            [x + 44, y + 54, z + 9],
            [x + 22, y + 54, z + 9],
          ],
          'craft-top',
        )}
        ${plane(
          [
            [x + 2, y - 14, z + 18],
            [x + 16, y - 14, z + 18],
            [x + 12, y + 34, z + 18],
            [x - 2, y + 34, z + 18],
          ],
          'craft-l',
        )}
        ${box(x + 3, y + 7, 12, 7, 26, { z: z + 18, ...CRAFT })}
        ${plane(
          [
            [x + 88, y + 3, z + 9],
            [x + 104, y + 10, z + 9],
            [x + 88, y + 17, z + 9],
          ],
          'craft-r',
        )}
      </g>`

/** 화물 — 나갈 땐 가방(질의), 돌아올 땐 상자(답변). */
const cargo = (x, y, z, kind) =>
  kind === 'bag'
    ? box(x, y, 24, 16, 18, { z, top: 'bag-top', l: 'bag-l', r: 'bag-r' })
    : box(x, y, 26, 18, 20, { z })

/* --------------------------------------------------------- 관제 밖 장막

   국경선을 화면좌표로 계산해 그 너머 전체를 덮는다.  평면 폴리곤으로는
   높이가 있는 물체를 덮지 못하므로 화면좌표로 그린다. */

const [bx1, by1] = at(380, -160, 0)
const [bx2, by2] = at(380, 460, 0)
const dx = bx2 - bx1
const dy = by2 - by1
const veil = `
      <polygon id="sr-veil" fill="#131418" opacity="0.55"
               points="${bx1 - dx},${by1 - dy} ${bx2 + dx},${by2 + dy} ${bx2 + dx + 900},${by2 + dy} ${bx1 - dx + 900},${by1 - dy}" />`

const border = `
      ${line(
        [
          [380, -160],
          [380, 460],
        ],
        'border-line',
      )}
      ${Array.from({ length: 11 }, (_, i) =>
        line(
          [
            [380, -140 + i * 58],
            [358, -140 + i * 58],
          ],
          'hair',
        ),
      ).join('')}`

/* ------------------------------------------------------------------ 조립 */

export function sceneRunwaySvg() {
  const body = `
      ${terminal}

      <!-- 항로 -->
      ${curve(
        [
          [196, 180, 24],
          [340, 90, 206],
          [576, 96, 96],
        ],
        'route',
        'id="sr-arc-out"',
      )}
      ${curve(
        [
          [576, 240, 96],
          [360, 282, 172],
          [196, 214, 24],
        ],
        'route',
        'id="sr-arc-in" stroke="#43BC9C" opacity="0.45"',
      )}

      ${factory}
      ${veil}
      ${border}
      <text x="${at(380, -180, 0)[0]}" y="${at(380, -180, 0)[1] - 14}"
            text-anchor="middle" class="co-sub" letter-spacing="6">${t.border}</text>

      <!-- 나가는 편 (아직 국경 안쪽). 화물이 함께 움직여야 하므로 한 그룹. -->
      <g id="sr-plane-out">
        ${aircraft(266, 86, 178)}
        ${cargo(292, 88, 196, 'bag')}
      </g>
      <!-- 돌아오는 편 (국경을 막 넘어옴) -->
      <g id="sr-plane-in">
        ${aircraft(408, 250, 142)}
        ${cargo(434, 252, 160, 'crate')}
      </g>

      ${callout({
        n: '01',
        from: at(310, 96, 200),
        to: [640, 74],
        side: 'right',
        title: t.depart,
        sub: t.departSub,
        cls: 'co-title--bag',
      })}
      ${callout({
        n: '02',
        from: at(452, 260, 164),
        to: [930, 214],
        side: 'right',
        title: t.arrive,
        sub: t.arriveSub,
      })}
      ${callout({
        n: '03',
        from: at(690, 160, 96),
        to: [1080, 560],
        side: 'right',
        title: t.outside,
        sub: t.outsideSub,
      })}`

  return svgWrap({
    id: 'sr',
    viewBox: '0 0 1440 780',
    title: t.svgTitle,
    desc: t.svgDesc,
    body,
  })
}

/* ==========================================================================
   M3 — 두 편이 항로를 따라 오간다. 스크롤과 무관한 상시 루프.
   ========================================================================== */

export function sceneRunwayAnim(root, gsap) {
  const fly = (sel, pathSel, delay, dur) => {
    const el = root.querySelector(sel)
    const path = root.querySelector(pathSel)
    if (!el || !path) return
    gsap
      .timeline({ repeat: -1, repeatDelay: 1.2, delay })
      .fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5 })
      .to(
        el,
        {
          duration: dur,
          ease: 'none',
          motionPath: { path, align: path, alignOrigin: [0.5, 0.5] },
        },
        0,
      )
      .to(el, { opacity: 0, duration: 0.5 }, dur - 0.5)
  }

  fly('#sr-plane-out', '#sr-arc-out', 0, 6)
  fly('#sr-plane-in', '#sr-arc-in', 3, 6)

  gsap.to([root.querySelector('#sr-arc-out'), root.querySelector('#sr-arc-in')], {
    strokeDashoffset: -40,
    duration: 2.4,
    ease: 'none',
    repeat: -1,
  })
}
