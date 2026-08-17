/**
 * SCENE 09 · 각 부서의 몫 — 장비와 품목표.
 *
 * 발표에서 반드시 나오는 반론("그건 정보보안팀 일 아닙니까")을 도면 하나로
 * 끊는 장면이다.  그래서 비유를 새로 만들지 않고 **화면을 둘로 가른다**:
 *
 *   왼쪽 (청록) 정보보안팀이 만드는 것 — 검색대 장비
 *   오른쪽 (호박) 각 부서가 채우는 것 — 품목표
 *
 * 표의 아래 두 행은 일부러 비워 두었다.  "우리가 못 채우는 칸" 이 눈에 보여야
 * 이 장면이 성립한다.  표에서 장비로 들어가는 화살표가 둘의 관계다.
 *
 * 표는 일부러 아이소메트릭이 아니라 평면이다 — 출국층(SCENE 06)의 판독 콘솔과
 * 같은 규칙으로, '읽는 것' 은 눕히지 않는다.
 *
 * M3 애니메이션 대상 id:
 *   #sh-beam       검색대 스캔 빔
 *   #sh-feed       품목표 → 장비로 들어가는 경로
 *   #sh-blank-1/2  비어 있는 행
 */

import { svgWrap } from './_svg.js'
import { isoSpace } from './_iso.js'
import { GATE_FACE, HOME_FACE } from './_places.js'
import { sceneShared as t } from '../content/strings.js'

const AMBER = '#F0A63A'
const TEAL = '#43BC9C'

/* ------------------------------------------------------------ 왼쪽 · 장비 */

export const iso = isoSpace({ ox: 238, oy: 262, s: 0.86 })
const { at, box, slab, plane, grid } = iso

const machine = `
      ${slab(0, 0, 190, 170, 12, { tone: 'home' })}
      ${grid(0, 0, 190, 170, 50)}
      <!-- 검색대 본체: 가운데가 뚫린 문틀 -->
      ${box(30, 40, 26, 90, 96, GATE_FACE)}
      ${box(134, 40, 26, 90, 96, GATE_FACE)}
      ${box(30, 40, 130, 90, 22, { z: 96, ...GATE_FACE })}
      <!-- 컨베이어와 그 위의 가방 -->
      ${box(0, 74, 190, 22, 14, HOME_FACE)}
      ${box(74, 78, 30, 15, 17, { z: 14, top: 'bag-top', l: 'bag-l', r: 'bag-r' })}
      <!-- 스캔 빔 -->
      ${plane(
        [
          [56, 44, 92],
          [134, 44, 92],
          [134, 126, 92],
          [56, 126, 92],
        ],
        '',
        `id="sh-beam" fill="${TEAL}" opacity="0.16"`,
      )}`

const bullet = (i, text) => {
  const y = 496 + i * 34
  return `
      <g>
        <circle cx="52" cy="${y - 5}" r="3.4" fill="${TEAL}" />
        <text x="70" y="${y}" style="font-size:18px;fill:var(--c-label)">${text}</text>
      </g>`
}

const leftPanel = `
      <text x="42" y="132" letter-spacing="3"
            style="font-size:17px;fill:${TEAL}" font-weight="700">${t.ourSide}</text>
      <text x="42" y="164" style="font-size:30px;fill:var(--c-text)"
            font-weight="700">${t.ourSideSub}</text>
      <path class="hair" d="M 42 184 H 400" />
      ${machine}
      ${t.ourItems.map((x, i) => bullet(i, x)).join('')}`

/* ----------------------------------------------------------- 오른쪽 · 품목표 */

const TX = 520
const TW = 872
const HEAD_Y = 196
const ROW_H = 62
const BODY_Y = HEAD_Y + 46
const COL_W = [186, 296, 128, 262]
const COL_X = COL_W.reduce((a, w, i) => [...a, a[i] + w], [TX])

const cell = (text, ci, ri, { blank = false } = {}) => {
  const x = COL_X[ci] + 18
  const y = BODY_Y + ri * ROW_H + 39
  if (blank) {
    return `
        <g>
          <rect x="${COL_X[ci] + 14}" y="${BODY_Y + ri * ROW_H + 16}"
                width="${COL_W[ci] - 34}" height="30" rx="4" fill="none"
                stroke="${AMBER}" stroke-width="1.25" stroke-dasharray="5 5" opacity="0.7" />
          <text x="${COL_X[ci] + 14 + (COL_W[ci] - 34) / 2}" y="${y}" text-anchor="middle"
                style="font-size:19px;fill:${AMBER}" font-weight="700">?</text>
        </g>`
  }
  const isGrade = /^(L\d|CLR)/.test(text)
  return `<text x="${x}" y="${y}"
                style="font-size:19px;fill:${isGrade ? AMBER : 'var(--c-text)'}"${
                  isGrade ? ' font-weight="700"' : ''
                }>${text}</text>`
}

const table = `
      <rect x="${TX}" y="${HEAD_Y}" width="${TW}" height="${46 + ROW_H * t.rows.length}"
            rx="4" fill="none" stroke="var(--c-line)" stroke-width="1.25" />
      <rect x="${TX}" y="${HEAD_Y}" width="${TW}" height="46"
            fill="${AMBER}" opacity="0.09" />
      ${t.cols
        .map(
          (c, i) =>
            `<text x="${COL_X[i] + 18}" y="${HEAD_Y + 30}" letter-spacing="1"
                   style="font-size:16px;fill:${AMBER}" font-weight="700">${c}</text>`,
        )
        .join('')}
      ${COL_X.slice(1, -1)
        .map(
          (x) =>
            `<path class="hair" d="M ${x} ${HEAD_Y} V ${HEAD_Y + 46 + ROW_H * t.rows.length}" />`,
        )
        .join('')}
      ${t.rows
        .map((row, ri) => {
          const blankRow = row.slice(1).every((v) => v === '?')
          const y = BODY_Y + ri * ROW_H
          return `
      <g${blankRow ? ` id="sh-blank-${ri - 2}"` : ''}>
        <path class="hair" d="M ${TX} ${y} H ${TX + TW}" />
        ${row.map((v, ci) => cell(v, ci, ri, { blank: v === '?' })).join('')}
      </g>`
        })
        .join('')}`

const TB = BODY_Y + ROW_H * t.rows.length

const rightPanel = `
      <text x="${TX}" y="132" letter-spacing="3"
            style="font-size:17px;fill:${AMBER}" font-weight="700">${t.theirSide}</text>
      <text x="${TX}" y="164" style="font-size:30px;fill:var(--c-text)"
            font-weight="700">${t.theirSideSub}</text>
      <path class="hair" d="M ${TX} 184 H ${TX + TW}" />
      ${table}
      <text x="${TX}" y="${TB + 30}" style="font-size:16px;fill:var(--c-muted)">※ ${
        t.sampleNote
      }</text>

      <!-- 비어 있는 두 행을 가리키는 주기 -->
      <path class="co-leader" d="M ${TX + TW} ${BODY_Y + ROW_H * 3.9}
            L ${TX + TW + 22} ${TB + 74} H ${TX + TW - 4}" />
      <text x="${TX + TW - 12}" y="${TB + 74}" text-anchor="end"
            style="font-size:20px;fill:#E25749" font-weight="700">${t.blankLabel}</text>
      <text x="${TX + TW - 12}" y="${TB + 98}" text-anchor="end"
            style="font-size:17px;fill:var(--c-label)">${t.blankSub}</text>`

/* ------------------------------------------------- 표 → 장비 (관계 화살표) */

/* 표에서 장비로 — 가운데 분할선을 가로질러야 '부서가 채운 값이 장비로
   들어간다' 가 읽힌다.  그래서 두 패널 사이 빈 구간을 그대로 통로로 쓴다. */
const FEED_Y = 455
const feed = `
      <path id="sh-feed" d="M ${TX - 8} ${FEED_Y} H 412"
            fill="none" style="stroke:${AMBER};stroke-width:2.25;stroke-dasharray:10 8" />
      <path d="M 404 ${FEED_Y} l 16 -7 v 14 Z" fill="${AMBER}" transform="rotate(180 412 ${FEED_Y})" />
      <text x="${(TX + 412) / 2 - 4}" y="${FEED_Y - 18}" text-anchor="middle"
            style="font-size:17px;fill:${AMBER}">${t.feedLabel}</text>`

/* ------------------------------------------------------------------ 조립 */

export function sceneSharedSvg() {
  const body = `
      ${leftPanel}
      <path class="hair" d="M 458 128 V ${TB + 40}" />
      ${rightPanel}
      ${feed}
      <!-- 결론 한 줄 — 장비 쪽에 붙여야 '장비가 무력해진다' 로 읽힌다. -->
      <path class="hair" d="M 42 630 H 400" />
      <text x="42" y="658"
            style="font-size:19px;fill:#E25749" font-weight="700">${t.emptyWarn}</text>`

  return svgWrap({
    id: 'sh',
    viewBox: '0 0 1440 700',
    title: t.svgTitle,
    desc: t.svgDesc,
    body,
  })
}

/* ==========================================================================
   M3 — 장비는 계속 돌지만(빔), 표의 빈 칸은 계속 비어 있다(깜빡임).
   둘을 잇는 경로가 흐르며 "표가 있어야 장비가 판정한다" 를 반복해 보여 준다.
   ========================================================================== */

export function sceneSharedAnim(root, gsap) {
  const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } })

  gsap.to(root.querySelector('#sh-beam'), {
    opacity: 0.34,
    duration: 1.3,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true,
  })

  tl.fromTo(
    root.querySelector('#sh-feed'),
    { strokeDashoffset: 0 },
    { strokeDashoffset: -108, duration: 2.4 },
    0,
  )

  gsap.to(root.querySelectorAll('[id^="sh-blank-"] rect'), {
    opacity: 0.28,
    duration: 1.15,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true,
    stagger: 0.22,
  })

  return tl
}
