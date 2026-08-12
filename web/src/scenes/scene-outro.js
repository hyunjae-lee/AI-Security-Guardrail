/**
 * SCENE 08 · 아웃트로 — 지표 아래로 내려간 터미널.
 *
 * SCENE 03 조감도와 같은 시점·같은 좌표계를 쓰되, 터미널이 있던 자리는 그냥
 * 평범한 땅이고 터미널은 그 아래에 점선 윤곽으로만 남는다.  가방은 여전히
 * 같은 길로 흐른다 — 아무도 의식하지 않지만 검사대는 그대로 작동한다.
 *
 * M3 애니메이션 대상 id:
 *   #so-bag-1 … #so-bag-3   평소처럼 흐르는 가방
 *   #so-ghost               지표 아래 터미널 윤곽
 *   #so-pulse               아래에서 올라오는 미세한 기척
 */

import { callout, svgWrap } from './_svg.js'
import { isoSpace } from './_iso.js'
import { sceneOutro as t } from '../content/strings.js'

export const iso = isoSpace({ ox: 406, oy: 150, s: 1 })
const { at, box, slab, line, plane, grid, cutHatch, curve } = iso

const BLOCKS = [
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

const campus = `
      ${slab(0, 0, 300, 400, 16)}
      ${grid(0, 0, 300, 400, 50)}
      ${cutHatch(0, 0, 300, 400, 16, 'l')}
      ${cutHatch(0, 0, 300, 400, 16, 'r')}
      ${BLOCKS.map((b) => box(...b)).join('')}`

/* 터미널이 있던 자리 — 이제는 그냥 땅이다. */
const ground = `
      ${slab(296, 90, 244, 220, 16)}
      ${grid(296, 90, 244, 220, 50)}
      ${cutHatch(296, 90, 244, 220, 16, 'l')}
      ${cutHatch(296, 90, 244, 220, 16, 'r')}`

/* 지표 아래. 윤곽선만 남기고 채우지 않는다. */
const ghost = `
      <g id="so-ghost" opacity="0.45">
        ${line(
          [
            [352, 126, -44],
            [468, 126, -44],
            [468, 192, -44],
            [352, 192, -44],
          ],
          'gear',
          true,
        )}
        ${line(
          [
            [352, 126, -168],
            [468, 126, -168],
            [468, 192, -168],
            [352, 192, -168],
          ],
          'gear',
          true,
        )}
        ${[
          [352, 126],
          [468, 126],
          [468, 192],
          [352, 192],
        ]
          .map((p) =>
            line(
              [
                [p[0], p[1], -44],
                [p[0], p[1], -168],
              ],
              'gear',
            ),
          )
          .join('')}
        ${line(
          [
            [410, 108, -44],
            [410, 108, -12],
          ],
          'gear',
        )}
      </g>
      <circle id="so-pulse" cx="${at(410, 108, -4)[0]}" cy="${at(410, 108, -4)[1]}"
              r="7" class="gear-fill" opacity="0.6" />`

const factory = `
      <g opacity="0.4">
        ${slab(700, 0, 300, 400, 16)}
        ${box(730, 40, 240, 300, 92)}
        ${[0, 1, 2, 3, 4].map((i) => box(736 + i * 48, 40, 30, 300, 20, { z: 92 })).join('')}
        ${box(820, 62, 26, 26, 132, { z: 92 })}
      </g>`

const ROUTES = [
  [
    [14, 96],
    [210, 116],
    [418, 190],
  ],
  [
    [88, 366],
    [258, 262],
    [424, 194],
  ],
  [
    [250, 360],
    [332, 282],
    [428, 196],
  ],
]

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

/* ------------------------------------------------------------------ 조립 */

export function sceneOutroSvg() {
  const body = `
      ${campus}
      ${ghost}
      ${ground}
      ${ROUTES.map((pts, i) => curve(pts, 'route', `id="so-route-${i + 1}"`)).join('')}
      ${bag('so-bag-1', 200, 130)}
      ${bag('so-bag-2', 268, 258)}
      ${bag('so-bag-3', 352, 246)}
      ${factory}

      ${callout({
        n: '01',
        from: at(120, 200, 0),
        to: [300, 92],
        side: 'left',
        title: t.campus,
        sub: t.campusSub,
      })}
      ${callout({
        n: '02',
        from: at(410, 160, -120),
        to: [900, 640],
        side: 'right',
        title: t.sunk,
        sub: t.sunkSub,
        cls: 'co-title--bag',
      })}`

  return svgWrap({
    id: 'so',
    viewBox: '0 0 1440 860',
    title: t.svgTitle,
    desc: t.svgDesc,
    body,
  })
}

/* ==========================================================================
   M3 — 평소와 같은 흐름. 지표 아래에서만 아주 약한 기척이 올라온다.
   ========================================================================== */

export function sceneOutroAnim(root, gsap) {
  const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } })

  ;['so-bag-1', 'so-bag-2', 'so-bag-3'].forEach((id, i) => {
    const el = root.querySelector(`#${id}`)
    const path = root.querySelector(`#so-route-${i + 1}`)
    if (!el || !path) return
    tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.8 }, i * 2.2)
      .to(
        el,
        {
          duration: 6.5,
          motionPath: { path, align: path, alignOrigin: [0.5, 0.86] },
        },
        i * 2.2,
      )
      .to(el, { opacity: 0, duration: 0.7 }, i * 2.2 + 5.8)
  })

  gsap.to(root.querySelector('#so-pulse'), {
    opacity: 0.12,
    duration: 1.9,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true,
  })

  gsap.to(root.querySelector('#so-ghost'), {
    opacity: 0.16,
    duration: 3.2,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true,
  })

  return tl
}
