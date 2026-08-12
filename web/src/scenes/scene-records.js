/**
 * SCENE 07 · 기록실 — 판정만 남는 출입국 기록부.
 *
 * 왼쪽에 아이소메트릭 기록실(서가 + 검인대), 오른쪽에 기록부 자체를 크게 띄운다.
 * 핵심 연출은 '내용' 칸이 비어 있다는 것 — 무엇이 들어 있었는지는 남기지 않는다.
 *
 * 근거: 부록1 N2SF-IF-M2 「정보흐름 로그 기록 및 보존」
 *       — 정보흐름 통제 활동(허용/차단 등)을 로깅하고 일정 기간 보관한다.
 *         남기는 것은 '통제 활동' 이지 흘러간 내용물이 아니다.
 *
 * M3 애니메이션 대상 id:
 *   #sk-stamp           내려찍히는 판정 스탬프
 *   #sk-row-1 … #sk-row-4   한 줄씩 채워지는 기록
 *   #sk-blank-*         비워 두는 내용 칸
 */

import { callout, svgWrap } from './_svg.js'
import { isoSpace } from './_iso.js'
import { sceneRecords as t } from '../content/strings.js'

export const iso = isoSpace({ ox: 300, oy: 150, s: 0.8 })
const { at, box, slab, line, plane, grid, cutHatch } = iso

/* -------------------------------------------------------------- 기록실 */

const room = `
      ${box(-12, -12, 624, 12, 90)}
      ${box(-12, 0, 12, 400, 90)}
      ${slab(0, 0, 600, 400, 24)}
      ${grid(0, 0, 600, 400, 80)}
      ${cutHatch(0, 0, 600, 400, 24, 'l', 34)}
      ${cutHatch(0, 0, 600, 400, 24, 'r', 34)}
      <!-- 서가 -->
      ${[0, 1, 2].map((i) => box(60 + i * 130, 30, 96, 46, 108)).join('')}
      ${[0, 1, 2]
        .map((i) =>
          [0, 1, 2]
            .map((r) =>
              plane(
                [
                  [64 + i * 130, 76, 92 - r * 30],
                  [152 + i * 130, 76, 92 - r * 30],
                  [152 + i * 130, 76, 78 - r * 30],
                  [64 + i * 130, 76, 78 - r * 30],
                ],
                'f-r',
              ),
            )
            .join(''),
        )
        .join('')}
      <!-- 검인대 -->
      ${box(190, 236, 190, 104, 44)}
      ${plane(
        [
          [200, 246, 45],
          [370, 246, 45],
          [370, 330, 45],
          [200, 330, 45],
        ],
        'f-r',
      )}`

const [stampX, stampY] = at(286, 288, 45)

const stamp = `
      <g id="sk-stamp">
        ${box(258, 262, 56, 52, 26, { z: 46 })}
        ${box(276, 280, 20, 20, 44, { z: 72 })}
        ${box(264, 268, 44, 44, 12, { z: 116 })}
      </g>`

/* ------------------------------------------------------------- 기록부

   도면 옆에 붙는 표. 화면좌표로 그려야 표가 반듯하게 읽힌다. */

const LX = 742 // 표 좌측
const LW = 596 // 표 폭
const LY = 118 // 표 상단
const ROW_H = 62
const COLS = [0, 124, 316, 456] // 시각 / 유형 / 판정 / 내용(빈칸)

const VERDICT_COLOR = { 통과: '#7FBF57', 치환: '#F0A63A', 거부: '#E25749' }

const ledger = `
      <g id="sk-ledger">
        <rect x="${LX}" y="${LY}" width="${LW}" height="${ROW_H * (t.rows.length + 1) + 16}"
              rx="4" fill="#1C1E24" stroke="#3C3E46" stroke-width="1.25" />
        <text x="${LX + 22}" y="${LY - 16}" class="co-sub" letter-spacing="3">${t.ledger}</text>

        <!-- 머리글 -->
        ${t.cols
          .map(
            (c, i) =>
              `<text x="${LX + 22 + COLS[i]}" y="${LY + 40}" class="co-sub"
                     font-size="13" letter-spacing="2">${c}</text>`,
          )
          .join('')}
        <text x="${LX + 22 + COLS[3]}" y="${LY + 40}" class="co-sub"
              font-size="13" letter-spacing="2" fill="#E25749">${t.colBlank}</text>
        <path class="hair" d="M ${LX + 16} ${LY + 56} H ${LX + LW - 16}" />

        <!-- 내용 칸 전체를 사선으로 지운다 -->
        <g opacity="0.5">
          ${Array.from({ length: 14 }, (_, i) => {
            const x0 = LX + 12 + COLS[3] + i * 14
            return `<path d="M ${x0} ${LY + 62} L ${x0 - 22} ${LY + ROW_H * (t.rows.length + 1) + 10}"
                          stroke="#E25749" stroke-width="1" opacity="0.35" />`
          }).join('')}
        </g>

        ${t.rows
          .map(([time, kind, verdict], i) => {
            const y = LY + 56 + ROW_H * (i + 1)
            return `
        <g id="sk-row-${i + 1}">
          <text x="${LX + 22 + COLS[0]}" y="${y}" class="co-sub" font-size="15">${time}</text>
          <text x="${LX + 22 + COLS[1]}" y="${y}" class="co-sub" font-size="15" fill="#ECEAE3">${kind}</text>
          <text x="${LX + 22 + COLS[2]}" y="${y}" class="co-title" font-size="15"
                fill="${VERDICT_COLOR[verdict] || '#9C9B93'}">${verdict}</text>
          <text id="sk-blank-${i + 1}" x="${LX + 22 + COLS[3]}" y="${y}" class="co-sub"
                font-size="12" fill="#E25749" opacity="0.75">${t.blankMark}</text>
        </g>
        ${i < t.rows.length - 1 ? `<path class="hair" d="M ${LX + 16} ${y + 18} H ${LX + LW - 16}" opacity="0.35" />` : ''}`
          })
          .join('')}
      </g>`

/* ------------------------------------------------------------------ 조립 */

export function sceneRecordsSvg() {
  const body = `
      ${room}
      ${stamp}
      ${ledger}

      ${callout({
        n: '01',
        from: [stampX, stampY - 118],
        to: [300, 620],
        side: 'left',
        title: t.stamp,
        sub: t.stampSub,
      })}
      ${callout({
        n: '02',
        from: [LX + 22 + COLS[3] + 40, LY + 34],
        to: [LX + 60, 56],
        side: 'right',
        title: t.note,
        sub: t.noteSub,
        cls: 'co-title--block',
      })}`

  return svgWrap({
    id: 'sk',
    viewBox: '0 0 1440 760',
    title: t.svgTitle,
    desc: t.svgDesc,
    body,
  })
}

/* ==========================================================================
   M3 — 스탬프가 내려찍힐 때마다 기록이 한 줄씩 늘어난다.
   내용 칸은 끝까지 비어 있는 것이 이 장면의 요점이다.
   ========================================================================== */

export function sceneRecordsAnim(root, gsap) {
  const rows = t.rows.map((_, i) => root.querySelector(`#sk-row-${i + 1}`)).filter(Boolean)
  gsap.set(rows, { opacity: 0 })

  const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.4 })

  rows.forEach((row, i) => {
    const t0 = i * 1.1
    tl.to(root.querySelector('#sk-stamp'), { y: 16, duration: 0.22, ease: 'power2.in' }, t0)
      .to(root.querySelector('#sk-stamp'), { y: 0, duration: 0.32, ease: 'power2.out' }, t0 + 0.22)
      .fromTo(
        row,
        { opacity: 0, x: -14 },
        { opacity: 1, x: 0, duration: 0.45, ease: 'power2.out' },
        t0 + 0.24,
      )
  })

  tl.to(rows, { opacity: 0, duration: 0.5 }, rows.length * 1.1 + 1.2)

  return tl
}
