/**
 * 두 영토의 '장소감' 부품.
 *
 * 색만 다르면 같은 땅에 페인트만 바꾼 것으로 보인다.  형태 자체를 갈라 놓는다.
 *
 *   우리 쪽  = 캠퍼스.  높은 빌딩이 아니라 낮고 넓은 연구동, 그 사이 잔디와 나무,
 *              연못과 그 위 다리, 세워 둔 자전거.  KAIST 를 아는 사람이면
 *              연못과 자전거에서 바로 캠퍼스로 읽는다.
 *   국경 밖  = 지구본.  평평한 대륙이 아니라 구(球)로 두어 "지구 반대편 어딘가"
 *              라는 걸 형태로 말한다.  그 위에 데이터센터가 얹혀 있다.
 *
 * 색은 tokens 의 home/away 계열을 쓰고, 조경색만 여기서 정의한다
 * (시맨틱 4색과 겹치지 않도록 채도를 크게 낮춘 값).
 */

const LAWN = '#26362f' // 잔디 — 허용(초록)과 헷갈리지 않게 채도를 뺐다
const LEAF = '#3b5c4d'
const TRUNK = '#2a2b28'
const WATER = '#1f3f49'
const WATER_EDGE = '#2f5c68'
const BIRD = '#cfcdc4'
const METAL = '#4a5563'

export const HOME_FACE = {
  top: 'home-top',
  l: 'home-l',
  r: 'home-r',
  cls: 'home-edge',
}
export const AWAY_FACE = {
  top: 'away-top',
  l: 'away-l',
  r: 'away-r',
  cls: 'away-edge',
}

/* ==========================================================================
   캠퍼스
   ========================================================================== */

/** 나무 — 줄기는 아이소메트릭, 수관은 화면좌표 원 (작은 크기에서 형태가 산다). */
const tree = (iso, x, y, h = 20, r = 15) => {
  const [cx, cy] = iso.at(x, y, h)
  return `
      <g class="tree">
        ${iso.box(x - 2.5, y - 2.5, 5, 5, h, { top: 'f-top', l: 'f-l', r: 'f-r' })}
        <circle cx="${cx}" cy="${cy - r * 0.5}" r="${r}" fill="${LEAF}" />
        <circle cx="${cx - r * 0.45}" cy="${cy - r * 0.15}" r="${r * 0.62}" fill="${LEAF}" opacity="0.85" />
        <circle cx="${cx + r * 0.45}" cy="${cy - r * 0.2}" r="${r * 0.55}" fill="${LEAF}" opacity="0.75" />
      </g>`
}

/** 자전거 — 캠퍼스 풍경의 표식. 옆모습 실루엣으로 세워 둔다. */
const bike = (iso, x, y, s = 1) => {
  const [px, py] = iso.at(x, y)
  return `
      <g class="bike" transform="translate(${px} ${py}) scale(${s})">
        <circle cx="-9" cy="-7" r="7" fill="none" stroke="${METAL}" stroke-width="1.6" />
        <circle cx="9" cy="-7" r="7" fill="none" stroke="${METAL}" stroke-width="1.6" />
        <path d="M -9 -7 L -2 -16 L 6 -16 M -2 -16 L 4 -7 L 9 -7 M 4 -7 L -3 -7"
              fill="none" stroke="${METAL}" stroke-width="1.6"
              stroke-linecap="round" stroke-linejoin="round" />
        <path d="M 6 -16 l 4 -2" stroke="${METAL}" stroke-width="1.6" stroke-linecap="round" />
      </g>`
}

/** 거위 — 연못가에 둘. 캠퍼스의 그 연못이라는 신호. */
const goose = (iso, x, y, flip = false) => {
  const [px, py] = iso.at(x, y)
  const d = flip ? -1 : 1
  return `
      <g transform="translate(${px} ${py})">
        <ellipse cx="0" cy="-4" rx="7" ry="4.4" fill="${BIRD}" />
        <path d="M ${3.5 * d} -6 q ${3 * d} -1 ${3.2 * d} -5 q 0 -2.4 ${-1.8 * d} -2.4"
              fill="none" stroke="${BIRD}" stroke-width="2.2" stroke-linecap="round" />
      </g>`
}

/**
 * 캠퍼스 한 벌.
 * (X, Y, W, D) 는 대지 평면 사각형. 안의 배치는 비율로 잡아 어느 장면에서든 쓴다.
 */
export function campus(iso, X, Y, W, D, { pond = true, detail = true } = {}) {
  const { box, plane, line } = iso
  const rx = (f) => X + W * f
  const ry = (f) => Y + D * f

  // 낮고 넓은 연구동 — 도심 빌딩과 달리 층수가 낮고 폭이 넓다.
  const halls = [
    [0.06, 0.05, 0.26, 0.13, 62],
    [0.4, 0.03, 0.3, 0.11, 78],
    [0.76, 0.08, 0.2, 0.12, 54],
    [0.05, 0.3, 0.24, 0.14, 70],
    [0.38, 0.28, 0.28, 0.12, 92],
    [0.74, 0.34, 0.22, 0.13, 58],
    [0.08, 0.62, 0.22, 0.12, 66],
  ]

  const windows = (x, y, w, d, h) => {
    const out = []
    const fy = y + d
    for (let z = h - 22; z > 12; z -= 24) {
      for (let wx = x + 7; wx + 9 <= x + w - 7; wx += 16) {
        out.push(
          plane(
            [
              [wx, fy, z + 10],
              [wx + 9, fy, z + 10],
              [wx + 9, fy, z],
              [wx, fy, z],
            ],
            'home-top',
            'opacity="0.55"',
          ),
        )
      }
    }
    return out.join('')
  }

  const lawn = plane(
    [
      [rx(0.32), ry(0.46), 0.6],
      [rx(0.7), ry(0.46), 0.6],
      [rx(0.7), ry(0.62), 0.6],
      [rx(0.32), ry(0.62), 0.6],
    ],
    '',
    `fill="${LAWN}"`,
  )

  // 연못 — 모서리를 죽인 사각형으로 물가처럼 보이게 한다.
  const pw = W * 0.3
  const pd = D * 0.2
  const px0 = rx(0.36)
  const py0 = ry(0.74)
  const pondArt = pond
    ? `
      ${plane(
        [
          [px0 + pw * 0.16, py0, 0.6],
          [px0 + pw * 0.84, py0, 0.6],
          [px0 + pw, py0 + pd * 0.4, 0.6],
          [px0 + pw * 0.8, py0 + pd, 0.6],
          [px0 + pw * 0.2, py0 + pd, 0.6],
          [px0, py0 + pd * 0.45, 0.6],
        ],
        '',
        `fill="${WATER}" stroke="${WATER_EDGE}" stroke-width="1.25"`,
      )}
      ${line(
        [
          [px0 + pw * 0.1, py0 + pd * 0.62, 1],
          [px0 + pw * 0.92, py0 + pd * 0.3, 1],
        ],
        '',
        false,
        `stroke="${WATER_EDGE}" stroke-width="1" opacity="0.5" fill="none"`,
      )}
      <!-- 연못을 건너는 작은 다리 -->
      ${box(px0 + pw * 0.42, py0 - 4, 10, pd + 8, 3, { z: 1, ...HOME_FACE })}
      ${goose(iso, px0 + pw * 0.26, py0 + pd * 0.5)}
      ${goose(iso, px0 + pw * 0.58, py0 + pd * 0.72, true)}`
    : ''

  const paths = `
      ${line(
        [
          [rx(0.02), ry(0.24), 0.5],
          [rx(0.98), ry(0.22), 0.5],
        ],
        'hair',
      )}
      ${line(
        [
          [rx(0.34), ry(0.02), 0.5],
          [rx(0.3), ry(0.98), 0.5],
        ],
        'hair',
      )}`

  const built = halls
    .map(([fx, fy, fw, fd, h]) => {
      const x = rx(fx)
      const y = ry(fy)
      const w = W * fw
      const d = D * fd
      return box(x, y, w, d, h, HOME_FACE) + windows(x, y, w, d, h)
    })
    .join('')

  const green = detail
    ? `
      ${tree(iso, rx(0.2), ry(0.2), 18, 13)}
      ${tree(iso, rx(0.66), ry(0.18), 16, 11)}
      ${tree(iso, rx(0.14), ry(0.52), 20, 14)}
      ${tree(iso, rx(0.9), ry(0.56), 17, 12)}
      ${tree(iso, rx(0.5), ry(0.66), 15, 11)}
      ${tree(iso, rx(0.86), ry(0.82), 18, 13)}
      ${bike(iso, rx(0.24), ry(0.44), 0.95)}
      ${bike(iso, rx(0.6), ry(0.42), 0.85)}`
    : ''

  return `${paths}${lawn}${pondArt}${built}${green}`
}

/* ==========================================================================
   국경 밖 — 지구본
   ========================================================================== */

/**
 * 지구본.  평면 대륙 대신 구(球)로 두어 "지구 반대편" 을 형태로 말한다.
 * plan 은 지구본이 놓인 평면 위치, r 은 화면 반지름.
 */
export function globe(iso, plan, r, { id = '', datacenter = true } = {}) {
  const [cx, cyGround] = iso.at(...plan)
  const cy = cyGround - r * 1.02 // 지면에 살짝 얹힌 것처럼

  // 경선: 가운데로 갈수록 납작해지는 타원 여러 개
  const meridians = [0.34, 0.68]
    .map(
      (k) =>
        `<ellipse cx="${cx}" cy="${cy}" rx="${(r * k).toFixed(1)}" ry="${r}"
                  fill="none" stroke="var(--c-away-edge)" stroke-width="1" opacity="0.7" />`,
    )
    .join('')

  // 위선: 위아래로 갈수록 짧아지는 가로 타원
  const parallels = [-0.62, -0.3, 0, 0.3, 0.62]
    .map((k) => {
      const ry = r * 0.16
      const rx = r * Math.sqrt(Math.max(0, 1 - k * k))
      return `<ellipse cx="${cx}" cy="${(cy + r * k).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}"
                       fill="none" stroke="var(--c-away-edge)" stroke-width="1"
                       opacity="${k === 0 ? 0.85 : 0.45}" />`
    })
    .join('')

  // 대륙 — 알아볼 수 있는 지형이 아니라 덩어리로만 둔다.
  const land = `
        <path d="M ${cx - r * 0.62} ${cy - r * 0.3}
                 q ${r * 0.24} ${-r * 0.22} ${r * 0.5} ${-r * 0.04}
                 q ${r * 0.18} ${r * 0.12} ${r * 0.04} ${r * 0.3}
                 q ${-r * 0.3} ${r * 0.16} ${-r * 0.58} ${-r * 0.04} Z"
              fill="var(--c-away-top)" opacity="0.9" />
        <path d="M ${cx - r * 0.1} ${cy + r * 0.18}
                 q ${r * 0.3} ${-r * 0.14} ${r * 0.52} ${r * 0.08}
                 q ${r * 0.06} ${r * 0.24} ${-r * 0.22} ${r * 0.32}
                 q ${-r * 0.3} ${r * 0.02} ${-r * 0.34} ${-r * 0.4} Z"
              fill="var(--c-away-top)" opacity="0.8" />
        <path d="M ${cx - r * 0.74} ${cy + r * 0.32}
                 q ${r * 0.2} ${-r * 0.06} ${r * 0.26} ${r * 0.16}
                 q ${-r * 0.1} ${r * 0.16} ${-r * 0.3} ${r * 0.06} Z"
              fill="var(--c-away-top)" opacity="0.7" />`

  // 지구본 위에 얹힌 데이터센터 — 외부 AI 가 도는 자리
  const dc = datacenter
    ? `
        <g transform="translate(${cx - r * 0.16} ${cy - r * 1.02})">
          <rect x="-26" y="-16" width="52" height="18" rx="2" fill="var(--c-away-top)"
                stroke="var(--c-away-edge)" stroke-width="1.25" />
          <rect x="-18" y="-30" width="36" height="16" rx="2" fill="var(--c-away-l)"
                stroke="var(--c-away-edge)" stroke-width="1.25" />
          <path d="M -8 -30 v -12 M 8 -30 v -8" stroke="var(--c-away-edge)" stroke-width="1.5"
                stroke-linecap="round" />
          <circle cx="-8" cy="-44" r="2.6" fill="#F0A63A" opacity="0.85" />
        </g>`
    : ''

  return `
      <g${id ? ` id="${id}"` : ''} class="globe">
        <!-- 궤도 — 전 세계 어디서나 같은 서비스라는 표시 -->
        <ellipse cx="${cx}" cy="${cy}" rx="${(r * 1.28).toFixed(1)}" ry="${(r * 0.34).toFixed(1)}"
                 fill="none" stroke="var(--c-away-edge)" stroke-width="1"
                 stroke-dasharray="5 8" opacity="0.55" />
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--c-away-g-top)"
                stroke="var(--c-away-edge)" stroke-width="1.5" />
        ${land}
        ${parallels}
        ${meridians}
        ${dc}
      </g>`
}
