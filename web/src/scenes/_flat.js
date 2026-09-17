/**
 * 평면 다이어그램 공용 부품 — 애플식 도해의 최소 단위.
 *
 * 왜 평면인가
 * -----------
 * 앞서는 아이소메트릭 컷어웨이로 그렸다.  정보량은 많았지만 두 가지가 걸렸다.
 *   1) 3D 를 흉내 내다 보니 물체가 뜨거나 어긋나 보이는 자리가 생겼다.
 *   2) 발표 화면에서 한눈에 안 들어왔다 — 요소가 많고 하나하나가 작다.
 * 평면은 흉내 낼 물리가 없고, 큰 도형 대여섯 개로 한 장면을 끝낼 수 있다.
 *
 * 규칙 (어기면 열 장면이 따로 논다)
 * ---------------------------------
 *   · 한 장면에 큰 덩어리는 **여섯 개 이하**.  더 필요하면 장면을 쪼갤 것.
 *   · 글자 크기는 아래 사다리만 쓴다.  발표 화면 기준이라 도면 글씨는 크다.
 *   · 모서리는 지면과 같은 값(8 / 18 / 알약).  그 사이 값은 쓰지 않는다.
 *   · 그림자 없음.  깊이는 면 색으로만 낸다.
 *   · 색은 _palette.js 의 C 만 쓴다.  물체색과 잉크를 섞지 말 것.
 *   · 화살표는 '흐름', 파선 화살표는 '통제되지 않는 흐름'.
 *
 * 좌표계: viewBox 0 0 1440 780.  왼→오른쪽이 시간의 방향이다.
 */

import { C } from './_palette.js'

export const VB = '0 0 1440 720'
export const W = 1440
export const H = 720

/* ---------------------------------------------------------------- 글자

   도면 글자는 본문보다 크다.  발표 화면에서 뒤에 앉은 사람이 읽어야 한다. */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

/** 덩어리 이름 — 이 그림에서 가장 큰 글자. */
export const title = (x, y, text, { anchor = 'middle', fill = 'var(--c-text)' } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" class="d-title" style="fill:${fill}">${esc(text)}</text>`

/** 덩어리 설명 — 이름 바로 아래 한 줄. */
export const label = (x, y, text, { anchor = 'middle', fill = 'var(--c-muted)' } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" class="d-label" style="fill:${fill}">${esc(text)}</text>`

/** 주기 — 도형 옆에 붙는 작은 글자. */
export const note = (x, y, text, { anchor = 'middle', fill = 'var(--c-muted)' } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" class="d-note" style="fill:${fill}">${esc(text)}</text>`

/** 여러 줄 — 줄 간격은 글자 급에 맞춰 고정한다. */
export const lines = (x, y, arr, { anchor = 'middle', gap = 30, fn = note, opts = {} } = {}) =>
  arr.map((t, i) => fn(x, y + i * gap, t, { anchor, ...opts })).join('')

/* ---------------------------------------------------------------- 면

   card  = 무언가가 '놓이는 자리'.  흰 판 + 헤어라인.
   zone  = 영역.  테두리 없이 아주 옅은 면으로만 구역을 말한다. */

export const card = (x, y, w, h, { fill = C.panel, stroke = C.panelLine, r = 18, sw = 1.5, id = '', cls = '' } = {}) =>
  `<rect ${id ? `id="${id}" ` : ''}${cls ? `class="${cls}" ` : ''}x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"
        fill="${fill}" stroke="${stroke}" stroke-width="${sw}" />`

export const zone = (x, y, w, h, { fill = C.panelSoft, r = 18, id = '' } = {}) =>
  `<rect ${id ? `id="${id}" ` : ''}x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" />`

/** 알약 — 상태·판정처럼 짧은 말 한 조각. */
export const chip = (cx, cy, text, { tone = C.ink2, solid = false, pad = 22, id = '' } = {}) => {
  const w = textWidth(text, 21) + pad * 2
  const h = 44
  return `<g ${id ? `id="${id}" ` : ''}class="chip">
      <rect x="${(cx - w / 2).toFixed(1)}" y="${cy - h / 2}" width="${w.toFixed(1)}" height="${h}" rx="22"
            fill="${solid ? tone : 'var(--tile)'}" stroke="${tone}" stroke-width="1.75" />
      <text x="${cx}" y="${cy + 8}" text-anchor="middle" class="d-chip"
            style="fill:${solid ? C.panel : tone}">${esc(text)}</text>
    </g>`
}

/* 한글은 폭이 거의 정사각이고 라틴·숫자는 절반쯤이다.  알약 폭을 잡는 데만 쓰므로
   이 정도 어림으로 충분하다 (_svg.js 의 advance 와 같은 사고방식). */
export const textWidth = (s, f) =>
  [...String(s)].reduce((a, c) => a + f * (/[가-힣ㄱ-ㅎ一-鿿]/.test(c) ? 1 : /[A-Z]/.test(c) ? 0.68 : /\s/.test(c) ? 0.3 : 0.54), 0)

/* ---------------------------------------------------------------- 흐름

   arrow  = 통제된 흐름 (실선)
   loose  = 통제되지 않는 흐름 (파선) — 이 사이트의 논지가 여기 걸려 있다 */

const HEAD = 13

export const arrow = (x1, y1, x2, y2, { tone = C.ink2, sw = 3.5, dashed = false, id = '', cls = '' } = {}) => {
  const a = Math.atan2(y2 - y1, x2 - x1)
  const bx = x2 - Math.cos(a) * HEAD
  const by = y2 - Math.sin(a) * HEAD
  const wing = (s) =>
    `${(x2 - Math.cos(a - s) * HEAD * 1.6).toFixed(1)},${(y2 - Math.sin(a - s) * HEAD * 1.6).toFixed(1)}`
  return `<g ${id ? `id="${id}" ` : ''}${cls ? `class="${cls}" ` : ''}>
      <path d="M ${x1} ${y1} L ${bx.toFixed(1)} ${by.toFixed(1)}" fill="none" stroke="${tone}"
            stroke-width="${sw}" stroke-linecap="round"${dashed ? ' stroke-dasharray="11 9"' : ''} />
      <polygon points="${x2},${y2} ${wing(0.42)} ${wing(-0.42)}" fill="${tone}" />
    </g>`
}

export const loose = (x1, y1, x2, y2, opts = {}) => arrow(x1, y1, x2, y2, { dashed: true, ...opts })

/** 화살촉 없는 흐름선 — 여러 갈래가 한 점으로 모일 때 쓴다.
    갈래마다 촉을 달면 모이는 지점에 촉이 겹쳐 지저분해진다. */
export const feed = (x1, y1, x2, y2, { tone = C.ink2, sw = 3, dashed = false, id = '' } = {}) =>
  `<path ${id ? `id="${id}" ` : ''}d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="${tone}"
        stroke-width="${sw}" stroke-linecap="round"${dashed ? ' stroke-dasharray="11 9"' : ''} />`

/** 굽은 흐름 — 위로 솟았다 내려온다 (국경을 넘어갔다 오는 길). */
export const bend = (x1, y1, x2, y2, lift, { tone = C.ink2, sw = 3.5, dashed = false, id = '' } = {}) => {
  const mx = (x1 + x2) / 2
  const a = Math.atan2(y2 - (y1 + y2) / 2 - lift / 2, x2 - mx)
  const bx = x2 - Math.cos(a) * HEAD
  const by = y2 - Math.sin(a) * HEAD
  const wing = (s) =>
    `${(x2 - Math.cos(a - s) * HEAD * 1.6).toFixed(1)},${(y2 - Math.sin(a - s) * HEAD * 1.6).toFixed(1)}`
  return `<g ${id ? `id="${id}" ` : ''}>
      <path d="M ${x1} ${y1} Q ${mx} ${y1 - lift} ${bx.toFixed(1)} ${by.toFixed(1)}" fill="none"
            stroke="${tone}" stroke-width="${sw}" stroke-linecap="round"${dashed ? ' stroke-dasharray="11 9"' : ''} />
      <polygon points="${x2},${y2} ${wing(0.42)} ${wing(-0.42)}" fill="${tone}" />
    </g>`
}

/* ---------------------------------------------------------------- 사물

   비유 매핑(CLAUDE.md)이 정한 것만 그린다.  새 사물을 들이지 말 것 —
   그림에 없는 비유가 생기면 본문과 어긋난다. */

/** 여행 가방 = 질의 한 건. 이 사이트에서 가장 자주 나오는 사물이다. */
export const bag = (cx, cy, s = 1, { tone = C.bag, id = '', cls = '' } = {}) => {
  const w = 72 * s
  const h = 60 * s
  const x = cx - w / 2
  const y = cy - h / 2
  return `<g ${id ? `id="${id}" ` : ''}class="bag${cls ? ` ${cls}` : ''}">
      <path d="M ${(cx - 15 * s).toFixed(1)} ${(y + 2).toFixed(1)} v ${(-11 * s).toFixed(1)}
               a ${(15 * s).toFixed(1)} ${(11 * s).toFixed(1)} 0 0 1 ${(30 * s).toFixed(1)} 0 v ${(11 * s).toFixed(1)}"
            fill="none" stroke="${tone}" stroke-width="${(5 * s).toFixed(1)}" stroke-linecap="round" />
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"
            rx="${(12 * s).toFixed(1)}" fill="${tone}" />
      <rect x="${(x + 14 * s).toFixed(1)}" y="${(y + 9 * s).toFixed(1)}" width="${(44 * s).toFixed(1)}"
            height="${(6 * s).toFixed(1)}" rx="3" fill="${C.panel}" opacity="0.55" />
    </g>`
}

/** 검사 게이트 = 가드레일. 가방이 이 아치를 지난다.
    ghost 는 '있어야 할 자리에 없는' 게이트 — SCENE 02 의 논지가 이것이다. */
export const gate = (cx, cy, s = 1, { tone = C.gear, id = '', ghost = false } = {}) => {
  const w = 190 * s
  const h = 200 * s
  const t = 26 * s
  const x = cx - w / 2
  const y = cy - h / 2
  /* 비어 있는 게이트 — 벽 두께 없이 한 줄 아치로만 그린다.
     두께까지 파선으로 그리면 아치가 두 겹으로 보여 '자리' 가 아니라 '물건' 이 된다. */
  if (ghost)
    return `<g ${id ? `id="${id}" ` : ''}class="gate gate--ghost">
      <path d="M ${x + t / 2} ${y + h} V ${y + 40 * s} a ${40 * s} ${40 * s} 0 0 1 ${40 * s} ${-40 * s}
               H ${x + w - 40 * s} a ${40 * s} ${40 * s} 0 0 1 ${40 * s} ${40 * s} V ${y + h}"
            fill="none" stroke="${tone}" stroke-width="3" stroke-dasharray="14 11" stroke-linecap="round" />
    </g>`

  return `<g ${id ? `id="${id}" ` : ''}class="gate">
      <path d="M ${x} ${y + h} V ${y + 40 * s} a ${40 * s} ${40 * s} 0 0 1 ${40 * s} ${-40 * s}
               H ${x + w - 40 * s} a ${40 * s} ${40 * s} 0 0 1 ${40 * s} ${40 * s} V ${y + h}
               h ${-t} V ${y + 40 * s} a ${(40 - 26) * s} ${(40 - 26) * s} 0 0 0 ${(-40 + 26) * s} ${(-40 + 26) * s}
               H ${x + 40 * s} a ${(40 - 26) * s} ${(40 - 26) * s} 0 0 0 ${(-40 + 26) * s} ${(40 - 26) * s} V ${y + h} Z"
            fill="${tone}" />
      <circle cx="${cx}" cy="${(y + 34 * s).toFixed(1)}" r="${(7 * s).toFixed(1)}" fill="${C.panel}" opacity="0.8" />
    </g>`
}

/** 국경 — 이 사이트의 주인공 중 하나. 파선 세로선. */
export const border = (x, y1, y2, { id = '', tone = 'var(--c-text)' } = {}) =>
  `<path ${id ? `id="${id}" ` : ''}d="M ${x} ${y1} V ${y2}" fill="none" stroke="${tone}"
        stroke-width="3" stroke-dasharray="16 12" stroke-linecap="butt" opacity="0.85" />`

/** 지구본 = 국경 밖의 외부 AI. 대륙은 덩어리로만 — 지도가 목적이 아니다. */
export const globe = (cx, cy, r, { id = '' } = {}) => `
    <g ${id ? `id="${id}" ` : ''}class="globe">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--c-away-top)" stroke="var(--c-away-edge)" stroke-width="1.5" />
      ${[
        [-0.34, -0.3, 0.3, 0.2],
        [0.26, -0.12, 0.22, 0.26],
        [-0.12, 0.34, 0.26, 0.16],
        [0.44, 0.34, 0.14, 0.12],
      ]
        .map(
          ([u, v, rx, ry]) =>
            `<ellipse cx="${(cx + u * r).toFixed(1)}" cy="${(cy + v * r).toFixed(1)}"
                      rx="${(rx * r).toFixed(1)}" ry="${(ry * r).toFixed(1)}" fill="var(--c-away-edge)" opacity="0.5" />`,
        )
        .join('')}
      ${[-0.55, 0, 0.55]
        .map(
          (v) =>
            `<path d="M ${(cx - r * Math.cos(Math.asin(v))).toFixed(1)} ${(cy + v * r).toFixed(1)}
                      H ${(cx + r * Math.cos(Math.asin(v))).toFixed(1)}"
                   stroke="var(--c-away-edge)" stroke-width="1" opacity="0.35" fill="none" />`,
        )
        .join('')}
    </g>`

/** 서류 한 장 — 원문·기록·표처럼 '적힌 것'. */
export const sheet = (x, y, w, h, rows, { id = '', tone = C.ink3, fill = C.panel } = {}) => `
    <g ${id ? `id="${id}" ` : ''}>
      ${card(x, y, w, h, { fill, r: 12 })}
      ${Array.from({ length: rows }, (_, i) => {
        const ry = y + 26 + i * 22
        const rw = i === rows - 1 ? w * 0.46 : w - 40
        return `<rect x="${x + 20}" y="${ry}" width="${rw.toFixed(1)}" height="7" rx="3.5"
                      fill="${tone}" opacity="0.4" />`
      }).join('')}
    </g>`

/** 사람 — 단순 실루엣(원 머리 + 라운드 몸통). CLAUDE.md 확정 규칙. */
export const person = (cx, cy, s = 1, { tone = C.ink3, id = '' } = {}) => `
    <g ${id ? `id="${id}" ` : ''}>
      <circle cx="${cx}" cy="${(cy - 26 * s).toFixed(1)}" r="${(13 * s).toFixed(1)}" fill="${tone}" />
      <path d="M ${(cx - 17 * s).toFixed(1)} ${(cy + 28 * s).toFixed(1)} v ${(-16 * s).toFixed(1)}
               a ${(17 * s).toFixed(1)} ${(17 * s).toFixed(1)} 0 0 1 ${(34 * s).toFixed(1)} 0
               v ${(16 * s).toFixed(1)} Z" fill="${tone}" />
    </g>`

/** 금지 표시 — 원 안의 사선. '여기서 끝' 을 말한다. */
export const banned = (cx, cy, r, { tone = C.block, id = '' } = {}) => `
    <g ${id ? `id="${id}" ` : ''}>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${tone}" stroke-width="4" />
      <path d="M ${(cx - r * 0.5).toFixed(1)} ${(cy - r * 0.5).toFixed(1)}
               L ${(cx + r * 0.5).toFixed(1)} ${(cy + r * 0.5).toFixed(1)}"
            stroke="${tone}" stroke-width="4" stroke-linecap="round" />
    </g>`

/** 체크 표시 — '통과'. */
export const pass = (cx, cy, r, { tone = C.allow, id = '' } = {}) => `
    <g ${id ? `id="${id}" ` : ''}>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${tone}" stroke-width="4" />
      <path d="M ${(cx - r * 0.44).toFixed(1)} ${cy} l ${(r * 0.3).toFixed(1)} ${(r * 0.32).toFixed(1)}
               l ${(r * 0.56).toFixed(1)} ${(-r * 0.6).toFixed(1)}"
            fill="none" stroke="${tone}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
    </g>`

/** 가위표 — '일부만 빼고'. 마스킹 자리에 쓴다. */
export const maskGlyph = (cx, cy, r, { tone = C.bag, id = '' } = {}) => `
    <g ${id ? `id="${id}" ` : ''}>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${tone}" stroke-width="4" />
      ${[-0.36, 0, 0.36]
        .map(
          (o) =>
            `<rect x="${(cx - r * 0.46).toFixed(1)}" y="${(cy + o * r - 3.5).toFixed(1)}"
                   width="${(r * 0.92).toFixed(1)}" height="7" rx="3.5" fill="${tone}" />`,
        )
        .join('')}
    </g>`

/* ---------------------------------------------------------------- 표

   기록부(08)와 품목표(09) 둘이 쓴다.  둘 다 "칸이 비어 있다" 가 논지라
   빈 칸을 그리는 방법이 표의 핵심이다 — 파선 테두리 + 옅은 글자. */

/**
 * @param cols   머리글 배열
 * @param rows   행 배열(문자열 배열).  값이 '?' 이면 '못 채운 칸' 으로 그린다.
 * @param widths 열 폭 배열 (합이 w 가 되게)
 */
export const table = (x, y, w, cols, rows, widths, { rowH = 64, id = '', blankNote = '', ink = null } = {}) => {
  const head = 62
  const h = head + rows.length * rowH
  const xs = widths.reduce((a, v) => [...a, a[a.length - 1] + v], [x])
  /* ink(행, 열) 이 색을 돌려주면 그 칸만 뜻 색으로 굵게 쓴다 (판정 칸 같은 것). */
  const cell = (val, cx, cy, cw, strong, tone) =>
    val === '?'
      ? `<g><rect x="${cx + 16}" y="${cy - 20}" width="${cw - 32}" height="40" rx="8" fill="none"
               stroke="${C.bagInk}" stroke-width="1.5" stroke-dasharray="7 6" />
         <text x="${cx + cw / 2}" y="${cy + 8}" text-anchor="middle" class="d-note"
               style="fill:${C.bagInk}">?</text></g>`
      : `<text x="${cx + 22}" y="${cy + 8}" class="d-label"
               style="fill:${tone || (strong ? 'var(--c-text)' : 'var(--c-muted)')}"${tone ? ' font-weight="700"' : ''}>${esc(val)}</text>`

  return `<g ${id ? `id="${id}" ` : ''}>
      ${card(x, y, w, h)}
      <rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${head}" rx="17" fill="${C.panelSoft}" />
      <rect x="${x + 1}" y="${y + head - 17}" width="${w - 2}" height="17" fill="${C.panelSoft}" />
      ${cols.map((c, i) => `<text x="${xs[i] + 22}" y="${y + 40}" class="d-note" style="fill:var(--c-muted)">${esc(c)}</text>`).join('')}
      <path d="M ${x} ${y + head} H ${x + w}" stroke="${C.panelLine}" stroke-width="1.5" fill="none" />
      ${rows
        .map((r, ri) => {
          const cy = y + head + rowH * ri + rowH / 2
          return `<g id="${id}-row-${ri + 1}">
        ${ri ? `<path d="M ${x + 16} ${y + head + rowH * ri} H ${x + w - 16}" stroke="${C.panelHair}" stroke-width="1.25" fill="none" />` : ''}
        ${r.map((v, ci) => cell(v, xs[ci], cy, widths[ci], ci === 0 || ci === 1, ink && ink(ri, ci))).join('')}
      </g>`
        })
        .join('')}
      ${blankNote ? note(x + w - 22, y + h + 36, blankNote, { anchor: 'end' }) : ''}
    </g>`
}

/** 점 목록 — 장비 목록처럼 '무엇 무엇이 있다' 를 나열할 때. */
export const bullets = (x, y, items, { gap = 54, tone = C.gearInk, id = '' } = {}) =>
  `<g ${id ? `id="${id}" ` : ''}>${items
    .map(
      (it, i) => `
      <circle cx="${x + 7}" cy="${y + i * gap - 7}" r="6" fill="${tone}" />
      <text x="${x + 30}" y="${y + i * gap}" class="d-label" style="fill:var(--c-text)">${esc(it)}</text>`,
    )
    .join('')}</g>`
