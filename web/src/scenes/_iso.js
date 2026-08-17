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

/**
 * 물리 검사용 기록기.  globalThis.__ISO_RECORD__ 에 배열을 넣어 두면 그 뒤로
 * 만들어지는 모든 직육면체·슬래브의 평면/높이 정보가 쌓인다.  평소에는 아무
 * 일도 하지 않는다 (undefined 검사 한 번).
 *
 * 있는 이유: '물체가 허공에 떠 있다', '바닥 밖으로 나갔다', '서로 관통한다'
 * 같은 것은 눈으로는 잘 안 보이는데 도면의 신뢰를 깎는다.  좌표로 잡는 게
 * 확실하다.
 */
const record = (kind, o) => {
  const log = globalThis.__ISO_RECORD__
  if (log) log.push({ kind, ...o })
}

export function isoSpace({ ox, oy, s = 1 }) {
  const sx = (x, y) => ox + (x - y) * COS30 * s
  const sy = (x, y, z = 0) => oy + ((x + y) * 0.5 - z) * s

  /** 평면좌표 → "screenX,screenY" 문자열 */
  const pt = (x, y, z = 0) => `${sx(x, y).toFixed(1)},${sy(x, y, z).toFixed(1)}`

  /** 평면좌표 → [screenX, screenY] (콜아웃 앵커용) */
  const at = (x, y, z = 0) => [+sx(x, y).toFixed(1), +sy(x, y, z).toFixed(1)]

  /**
   * 평면상 A→B 이동을 화면 이동량 {x, y} 로 환산.
   * 아이소메트릭은 아핀 투영이라, 지면을 미끄러지는 물체는 이 값만큼
   * translate 하면 정확히 맞는다 (M3 애니메이션이 이걸 쓴다).
   */
  const delta = (from, to) => {
    const a = at(...from)
    const b = at(...to)
    return { x: +(b[0] - a[0]).toFixed(2), y: +(b[1] - a[1]).toFixed(2) }
  }

  const poly = (pts, cls) =>
    `<polygon class="${cls}" points="${pts.map((p) => pt(...p)).join(' ')}" />`

  /** 평면좌표 배열을 잇는 선 (경로·점선·해칭에 공용) */
  const line = (pts, cls, close = false, attrs = '') =>
    `<path class="${cls}" d="M ${pts.map((p) => pt(...p)).join(' L ')}${
      close ? ' Z' : ''
    }" ${attrs} />`

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
    record('box', { x, y, w, d, z, h, top: t, id, cls })
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

  /**
   * 대지·바닥 슬래브 — 두께가 그대로 단면(컷어웨이)이 된다.
   * tone: 'ground'(기본) | 'home'(우리 영토) | 'away'(국경 밖)
   */
  const slab = (x, y, w, d, thickness, { id = '', tone = 'ground' } = {}) => {
    record('slab', { x, y, w, d, z: -thickness, h: thickness, top: 0, id, tone })
    const g = tone === 'ground' ? 'ground' : `${tone}-g`
    return box(x, y, w, d, thickness, {
      z: -thickness,
      id,
      cls: tone === 'ground' ? '' : `${tone}-edge`,
      top: `${g}-top`,
      l: `${g}-l`,
      r: `${g}-r`,
    })
  }

  /**
   * 지면 그림자.  물체가 바닥에 닿아 있는지, 떠 있다면 얼마나 떠 있는지를
   * 그림자의 위치로 말한다.  광원이 좌상단이므로(면 음영과 같은 약속)
   * 그림자는 우하단(+x, +y)으로 뜬 높이만큼 밀린다.
   *
   * lift 0 이면 접지 그림자 — 물체 바로 아래에 깔려 '닿아 있다' 를 말한다.
   */
  const shadow = (x, y, w, d, { z = 0, lift = 0, opacity = 0.32, grow = 1 } = {}) => {
    const k = lift * 0.45
    return plane(
      [
        [x + k - grow, y + k - grow, z + 0.4],
        [x + w + k + grow, y + k - grow, z + 0.4],
        [x + w + k + grow, y + d + k + grow, z + 0.4],
        [x + k - grow, y + d + k + grow, z + 0.4],
      ],
      'iso-shadow',
      `opacity="${opacity}"`,
    )
  }

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

  return {
    sx,
    sy,
    pt,
    at,
    delta,
    poly,
    line,
    curve,
    box,
    slab,
    plane,
    shadow,
    grid,
    cutHatch,
  }
}
