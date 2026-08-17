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
import { campus, globe, globeAnim } from './_places.js'
import { sceneWhy as t } from '../content/strings.js'

export const iso = isoSpace({ ox: 380, oy: 150, s: 0.92 })
const { at, delta, box, slab, line, plane, grid, cutHatch } = iso

/* 우리 쪽은 캠퍼스, 국경 밖은 지구본. 색만이 아니라 형태로 가른다. */

const homeland = `
      ${slab(0, 0, 260, 340, 14, { tone: 'home' })}
      ${grid(0, 0, 260, 340, 60)}
      ${cutHatch(0, 0, 260, 340, 14, 'l')}
      ${cutHatch(0, 0, 260, 340, 14, 'r')}
      ${campus(iso, 0, 0, 260, 340)}`

const outland = globe(iso, [760, 170], 138, { id: 'sw-globe' })

/* ------------------------------------------------------------------ 국경 */

const border = `
      <g id="sw-border">
        ${line(
          [
            [440, -230],
            [440, 450],
          ],
          'border-line',
        )}
        ${Array.from({ length: 14 }, (_, i) =>
          line(
            [
              [440, -210 + i * 52],
              [418, -210 + i * 52],
            ],
            'hair',
          ),
        ).join('')}
      </g>`

/* ------------------------------------------------- 여권 확인대가 없다는 표시

   이 장면은 '없는 것' 을 말하는데, 없는 것은 그릴 수가 없다.  그래서 있어야 할
   자리에 빈 확인대 자국만 남긴다 — 바닥에 점선 자리표시, 그 위에 여권 심볼과
   가위표.  출국층(SCENE 05)의 여권·비자 확인 포털과 같은 형태를 점선으로만
   그려, 뒤에 그것이 나왔을 때 "아, 여기 없던 게 저거구나" 로 이어지게 했다. */

const noCheckpoint = (() => {
  /* 없는 것을 그리는 방법: 있어야 할 것의 윤곽만 점선으로 세우고 가위표를 친다.
     모양은 출국층(SCENE 05)의 여권·비자 확인 포털과 같게 잡아, 뒤에 그 포털이
     나왔을 때 "여기 없던 게 저거였구나" 로 이어지게 했다.
     이름표는 달지 않는다 — 콜아웃 03 이 바로 이 자리를 가리킨다. */
  const GH = 74 // 포털 높이
  const ghost = 'stroke="#E25749" stroke-width="1.8" stroke-dasharray="7 6" opacity="0.9"'
  const post = (py) =>
    line([[434, py, 0], [434, py, GH]], '', false, ghost) +
    line([[446, py, 0], [446, py, GH]], '', false, ghost)
  const [cx, cy] = at(440, 200, GH / 2)
  return `
      <g id="sw-nocheck" fill="none">
        <!-- 비어 있는 부지 — 확인대가 서 있어야 할 자리 -->
        ${line(
          [[404, 164], [476, 164], [476, 236], [404, 236]],
          '', true,
          'stroke="#E25749" stroke-dasharray="9 7" opacity="0.5"',
        )}
        <!-- 서 있지 않은 포털: 기둥 둘 + 상인방, 전부 점선 -->
        ${post(170)}
        ${post(224)}
        ${line([[434, 170, GH], [434, 236, GH]], '', false, ghost)}
        ${line([[446, 170, GH], [446, 236, GH]], '', false, ghost)}
        ${line([[434, 170, GH], [446, 170, GH]], '', false, ghost)}
        ${line([[434, 236, GH], [446, 236, GH]], '', false, ghost)}
        <!-- 없다는 표시 -->
        <path d="M ${cx - 30} ${cy - 30} L ${cx + 30} ${cy + 30}
                 M ${cx + 30} ${cy - 30} L ${cx - 30} ${cy + 30}"
              stroke="#E25749" stroke-width="3.4" stroke-linecap="round" />
      </g>`
})()

/* --------------------------------------------------- 확인 없이 오가는 짐 */

const FLY_Z = 46

/** 가방 — 조감도와 같은 규격이라 두 장면이 한 세계로 읽힌다. */
const bag = (id, x, y, { z = 0, w = 24, d = 16, h = 18 } = {}) => {
  const [hx, hy] = at(x, y, z + h)
  return `
      <g id="${id}">
        ${box(x - w / 2, y - d / 2, w, d, h, {
          z,
          cls: 'bag fly', // 국경을 넘는 중 — 받침이 없는 게 맞다
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
          `id="sw-trail-in-${i + 1}" style="stroke:#E25749" opacity="0.45"`,
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
        <text x="${x}" y="${y + 8}" text-anchor="middle"
              font-weight="700" style="fill:${color};font-size:21px">${letter}</text>
        <text x="${x}" y="${y + 42}" text-anchor="middle" class="co-sub"
              letter-spacing="1" style="font-size:16px">${label}</text>
      </g>`
}

/* ------------------------------------------------------------------ 조립 */

export function sceneWhySvg() {
  const body = `
      ${homeland}
      ${border}
      ${noCheckpoint}
      <text x="${at(440, -230, 0)[0]}" y="${at(440, -230, 0)[1] - 16}"
            text-anchor="middle" class="co-sub" letter-spacing="6">${t.borderLabel}</text>
      ${outland}
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
      ${gradeChip([806, 216, 0], t.gradeOut, t.gradeOutLabel, '#9C9B93')}

      <!-- 방향 표시 -->
      <text class="co-sub" x="${at(300, 30, FLY_Z)[0]}" y="${at(300, 30, FLY_Z)[1] - 26}"
            text-anchor="middle" letter-spacing="2">${t.outbound} →</text>
      <text class="co-sub" x="${at(470, 356, FLY_Z)[0]}" y="${at(470, 356, FLY_Z)[1] + 34}"
            text-anchor="middle" letter-spacing="2" style="fill:#E25749">← ${t.inbound}</text>

      ${callout({
        n: '01',
        // 지구본 위쪽으로 트인 국경 구간. 아래쪽은 지구본이 덮어 점이 파묻힌다.
        from: at(440, -210, 0),
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
        // 비어 있는 여권 확인대 자리. '없는 것' 에도 가리킬 자국은 있어야 한다.
        from: at(440, 200, 60),
        to: [200, 690],
        side: 'right',
        title: t.risk2,
        sub: t.risk2Sub,
        cls: 'co-title--block',
      })}
      ${callout({
        n: '04',
        from: at(548, IN_Y[0], FLY_Z + 18), // 돌아오는 가방(sw-in-1) 윗면
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
  globeAnim(root, gsap, 'sw-globe', 138)

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
