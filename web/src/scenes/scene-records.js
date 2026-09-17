/**
 * SCENE 08 · 기록실 — "기록부에는 판정만 남습니다"
 *
 * 문장 하나: **내용 칸이 비어 있다.**
 * 그래서 그림은 표 한 장이면 된다.  채워진 세 칸과 비어 있는 한 칸의 대비가
 * 전부다.  방·선반·스탬프 기계 같은 것을 그리면 그 대비가 묻힌다.
 */

import { svgWrap } from './_svg.js'
import { C } from './_palette.js'
import { VB, card, chip, note, table, title } from './_flat.js'
import { sceneRecords as t } from '../content/strings.js'

const T = { x: 150, y: 150, w: 1140 }
const COLS = [...t.cols, t.colBlank]
const WIDTHS = [200, 330, 250, 360]
/* 마지막 열은 값이 아니라 '남기지 않았다' 는 표시다 — 문자열을 그대로 넣는다. */
const ROWS = t.rows.map((r) => [...r, t.blankMark])

const VERDICT_INK = { 통과: C.allowInk, 치환: C.bagInk, 거부: C.blockInk }

export function sceneRecordsSvg() {
  const body = `
      ${table(T.x, T.y, T.w, COLS, ROWS, WIDTHS, {
        id: 'sk-ledger',
        rowH: 72,
        ink: (ri, ci) => (ci === 2 ? VERDICT_INK[ROWS[ri][2]] : null),
      })}
      ${title(T.x, T.y - 34, t.ledger, { anchor: 'start' })}

      <!-- 비어 있는 칸 — 파선 상자로 '여기는 비워 둔 자리' 임을 말한다. -->
      ${ROWS.map((_, i) => {
        const y = T.y + 62 + 72 * i + 16
        const x = T.x + WIDTHS[0] + WIDTHS[1] + WIDTHS[2] + 22
        return `<rect id="sk-blank-${i + 1}" x="${x}" y="${y}" width="${WIDTHS[3] - 44}" height="40" rx="8"
                      fill="none" stroke="${C.blockInk}" stroke-width="1.5" stroke-dasharray="7 6" opacity="0.7" />`
      }).join('')}

      ${chip(T.x + T.w - 180, T.y + 62 + 72 * ROWS.length + 66, t.note, { tone: C.blockInk, id: 'sk-note' })}
      ${note(T.x + T.w - 180, T.y + 62 + 72 * ROWS.length + 112, t.noteSub)}

      ${card(T.x, T.y + 62 + 72 * ROWS.length + 44, 420, 96, { fill: C.panelSoft, stroke: C.panelLine })}
      <text x="${T.x + 30}" y="${T.y + 62 + 72 * ROWS.length + 88}" class="d-label"
            style="fill:var(--c-text)">${t.stamp}</text>
      <text x="${T.x + 30}" y="${T.y + 62 + 72 * ROWS.length + 118}" class="d-note"
            style="fill:var(--c-muted)">${t.stampSub}</text>`

  return svgWrap({ id: 'scene-records', viewBox: VB, title: t.svgTitle, desc: t.svgDesc, body })
}

export function sceneRecordsAnim(root, gsap, ScrollTrigger) {
  const tl = gsap.timeline({
    scrollTrigger: { trigger: root, start: 'top 68%', once: true },
    defaults: { ease: 'power3.out' },
  })
  tl.from('#sk-ledger', { opacity: 0, y: 24, duration: 0.7 })
    .from('[id^="sk-ledger-row-"]', { opacity: 0, x: -18, duration: 0.45, stagger: 0.08 }, '-=0.35')
    /* 비어 있는 칸은 맨 나중에 켠다 — 채워진 칸을 먼저 읽어야 '비었다' 가 보인다. */
    .from('[id^="sk-blank-"]', { opacity: 0, duration: 0.5, stagger: 0.07 }, '+=0.1')
    .from('#sk-note', { opacity: 0, y: -12, duration: 0.5 }, '-=0.2')
  ScrollTrigger.refresh()
}
