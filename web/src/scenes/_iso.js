/**
 * 아이소메트릭 투영 툴킷.
 *
 * 정투상(true isometric, 30°) 을 쓴다:
 *   screenX = (x - y) · cos30
 *   screenY = (x + y) · 0.5 - z
 * 평면좌표 x 는 화면 오른쪽-아래로, y 는 왼쪽-아래로, z 는 위로 간다.
 * 따라서 눈에 보이는 옆면은 +x 면(오른쪽)과 +y 면(왼쪽) 두 개뿐이고,
 * 윗면 > 좌면 > 우면 순으로 밝게 칠해 부피를 읽힌다 (광원 좌상단).
 *
 * 겹치는 물체는 (x + y) 가 작은 것부터 그린다 — 멀리 있는 것이 먼저다.
 */

const COS30 = 0.8660254

export function isoSpace({ ox, oy, s = 1 }) {
  const sx = (x, y) => ox + (x - y) * COS30 * s
  const sy = (x, y, z = 0) => oy + ((x + y) * 0.5 - z) * s

  /** 평면좌표 → "screenX,screenY" 문자열 */
  const pt = (x, y, z = 0) => `${sx(x, y).toFixed(1)},${sy(x, y, z).toFixed(1)}`

  /** 평면좌표 → [screenX, screenY] (콜아웃 앵커용) */
  const at = (x, y, z = 0) => [+sx(x, y).toFixed(1), +sy(x, y, z).toFixed(1)]

  const poly = (pts, cls) =>
    `<polygon class="${cls}" points="${pts.map((p) => pt(...p)).join(' ')}" />`

  /** 평면좌표 배열을 잇는 선 (경로·점선·해칭에 공용) */
  const line = (pts, cls, close = false) =>
    `<path class="${cls}" d="M ${pts.map((p) => pt(...p)).join(' L ')}${
      close ? ' Z' : ''
    }" />`

  /** 곡선 경로 — 평면 위 제어점을 그대로 투영해 잇는다. */
  const curve = (pts, cls, attrs = '') => {
    const p = pts.map((q) => pt(...q))
    let d = `M ${p[0]}`
    for (let i = 1; i < p.length - 1; i += 2) {
      d += ` Q ${p[i]} ${p[i + 1]}`
    }
    return `<path class="${cls}" d="${d}" ${attrs} />`
  }

  /**
   * 직육면체 3면.
   * (x, y) 는 평면상 가장 가까운 모서리, (w, d) 는 평면 크기, h 는 높이.
   */
  const box = (
    x,
    y,
    w,
    d,
    h,
    { z = 0, id = '', cls = '', top = 'f-top', l = 'f-l', r = 'f-r' } = {},
  ) => {
    const t = z + h
    return `<g class="solid ${cls}"${id ? ` id="${id}"` : ''}>
        ${poly(
          [
            [x, y, t],
            [x + w, y, t],
            [x + w, y + d, t],
            [x, y + d, t],
          ],
          top,
        )}
        ${poly(
          [
            [x, y + d, t],
            [x + w, y + d, t],
            [x + w, y + d, z],
            [x, y + d, z],
          ],
          l,
        )}
        ${poly(
          [
            [x + w, y, t],
            [x + w, y + d, t],
            [x + w, y + d, z],
            [x + w, y, z],
          ],
          r,
        )}
      </g>`
  }

  /** 대지·바닥 슬래브 — 두께가 그대로 단면(컷어웨이)이 된다. */
  const slab = (x, y, w, d, thickness, { id = '' } = {}) =>
    box(x, y, w, d, thickness, {
      z: -thickness,
      id,
      top: 'ground-top',
      l: 'ground-l',
      r: 'ground-r',
    })

  /** 임의의 사각 평면 (스캔 빔, 활주로 노면 등) */
  const plane = (pts, cls, attrs = '') =>
    `<polygon class="${cls}" points="${pts
      .map((p) => pt(...p))
      .join(' ')}" ${attrs} />`

  /** 평면 위 아이소메트릭 격자 — 지면이 '대지'로 읽히게 하는 보조선. */
  const grid = (x, y, w, d, step) => {
    const out = []
    for (let gx = x + step; gx < x + w; gx += step) {
      out.push(
        line(
          [
            [gx, y],
            [gx, y + d],
          ],
          'hair',
        ),
      )
    }
    for (let gy = y + step; gy < y + d; gy += step) {
      out.push(
        line(
          [
            [x, gy],
            [x + w, gy],
          ],
          'hair',
        ),
      )
    }
    return `<g opacity="0.5">${out.join('')}</g>`
  }

  /** 슬래브 옆면(=절단면)에 넣는 해칭. side: 'l'(+y 면) | 'r'(+x 면) */
  const cutHatch = (x, y, w, d, thickness, side, step = 26) => {
    const out = []
    if (side === 'l') {
      for (let gx = x + step; gx < x + w; gx += step) {
        out.push(
          line(
            [
              [gx, y + d, 0],
              [gx - thickness, y + d, -thickness],
            ],
            'hatch',
          ),
        )
      }
    } else {
      for (let gy = y + step; gy < y + d; gy += step) {
        out.push(
          line(
            [
              [x + w, gy, 0],
              [x + w, gy - thickness, -thickness],
            ],
            'hatch',
          ),
        )
      }
    }
    return out.join('')
  }

  return { sx, sy, pt, at, poly, line, curve, box, slab, plane, grid, cutHatch }
}
