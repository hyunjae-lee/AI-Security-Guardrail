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
   --------------------------------------------------------------------------
   책상 위 지구본이 아니라 우주에 떠 있는 지구다. 받침·기둥·자오선 고리 같은
   기구는 두지 않고, 구체로 읽히는 데 필요한 것만 남긴다:
     1. 구면 음영 — 좌상단에서 빛이 오는 방사 그라디언트. 이게 없으면 원이다.
     2. 대기광 — 가장자리에 얇게 도는 빛. 필터 없이 방사 그라디언트로 만들어
        비용이 들지 않는다. 떠 있는 행성으로 보이게 하는 결정적 한 겹.
     3. 도는 대륙 — 구에 클립한 지도 띠를 가로로 굴린다. 대륙이 옆으로 흘러가면
        회전으로 읽힌다 (경선 rx 를 흔드는 것보다 훨씬 자연스럽다).
   자전축 기울기(23.5°)는 유지하되 축이나 꼭지를 그리지는 않는다.
   ========================================================================== */

const SEA_LIT = '#3a3450'
const SEA_MID = '#2a2537'
const SEA_DARK = '#14121c'
const LANDMASS = '#4a4460'
const GRID = '#8a80a0'
const ATMO = '#8fa2d8' // 대기광 — 차가운 빛이라야 떠 있는 행성으로 읽힌다

/** 지도 띠 한 장 — 폭 2r 이 한 바퀴다. 대륙처럼 보이도록 굴곡을 준다. */
const mapBand = (r) => {
  const u = (n) => (n * r).toFixed(1)
  return `
        <path d="M ${u(0.05)} ${u(-0.62)}
                 q ${u(0.34)} ${u(-0.2)} ${u(0.62)} ${u(0.02)}
                 q ${u(0.22)} ${u(0.2)} ${u(0.02)} ${u(0.34)}
                 q ${u(-0.34)} ${u(0.16)} ${u(-0.66)} ${u(-0.02)}
                 q ${u(-0.16)} ${u(-0.16)} ${u(0.02)} ${u(-0.34)} Z"
              fill="${LANDMASS}" />
        <path d="M ${u(0.42)} ${u(-0.06)}
                 q ${u(0.2)} ${u(-0.06)} ${u(0.26)} ${u(0.18)}
                 q ${u(0.04)} ${u(0.3)} ${u(-0.12)} ${u(0.46)}
                 q ${u(-0.18)} ${u(0.08)} ${u(-0.22)} ${u(-0.16)}
                 q ${u(-0.04)} ${u(-0.28)} ${u(0.08)} ${u(-0.48)} Z"
              fill="${LANDMASS}" />
        <path d="M ${u(-0.72)} ${u(-0.28)}
                 q ${u(0.2)} ${u(-0.12)} ${u(0.26)} ${u(0.1)}
                 q ${u(0.02)} ${u(0.22)} ${u(-0.16)} ${u(0.28)}
                 q ${u(-0.2)} ${u(0.02)} ${u(-0.2)} ${u(-0.18)}
                 q ${u(0)} ${u(-0.14)} ${u(0.1)} ${u(-0.2)} Z"
              fill="${LANDMASS}" />
        <path d="M ${u(-0.5)} ${u(0.22)}
                 q ${u(0.16)} ${u(0.02)} ${u(0.14)} ${u(0.24)}
                 q ${u(-0.04)} ${u(0.22)} ${u(-0.2)} ${u(0.16)}
                 q ${u(-0.12)} ${u(-0.08)} ${u(0.06)} ${u(-0.4)} Z"
              fill="${LANDMASS}" />
        <ellipse cx="${u(1.16)}" cy="${u(0.34)}" rx="${u(0.16)}" ry="${u(0.11)}" fill="${LANDMASS}" />
        <ellipse cx="${u(1.5)}" cy="${u(-0.34)}" rx="${u(0.26)}" ry="${u(0.17)}" fill="${LANDMASS}" />
        <ellipse cx="${u(1.72)}" cy="${u(0.16)}" rx="${u(0.18)}" ry="${u(0.13)}" fill="${LANDMASS}" />`
}

/** 대륙 위 서버 표시 — 외부 AI 가 세계 곳곳에 있다는 신호. 같이 돈다. */
const servers = (r) =>
  [
    [0.3, -0.4],
    [-0.42, -0.16],
    [0.56, 0.26],
    [1.42, -0.28],
  ]
    .map(
      ([u, v]) =>
        `<circle cx="${(u * r).toFixed(1)}" cy="${(v * r).toFixed(1)}" r="${(r * 0.032).toFixed(1)}"
                 fill="#F0A63A" opacity="0.9" />`,
    )
    .join('')

/**
 * 지구본.  plan 은 받침이 놓인 평면 위치, r 은 구의 화면 반지름.
 * id 를 주면 `#{id}-spin` 그룹이 생기고, globeAnim() 이 그걸 굴린다.
 */
export function globe(iso, plan, r, { id = 'globe', datacenter = true } = {}) {
  const [gx, gyGround] = iso.at(...plan)
  const cy = gyGround - r * 1.02 // 지면보다 살짝 띄워 떠 있게
  const TILT = -23.5

  return `
      <g id="${id}" class="globe" transform="translate(${gx} ${cy})">
        <defs>
          <radialGradient id="${id}-sea" cx="34%" cy="28%" r="76%">
            <stop offset="0%" stop-color="${SEA_LIT}" />
            <stop offset="52%" stop-color="${SEA_MID}" />
            <stop offset="100%" stop-color="${SEA_DARK}" />
          </radialGradient>
          <!-- 대기광: 안쪽은 투명, 가장자리에서만 옅게 빛난다 (필터 없음) -->
          <radialGradient id="${id}-atm">
            <stop offset="78%" stop-color="${ATMO}" stop-opacity="0" />
            <stop offset="93%" stop-color="${ATMO}" stop-opacity="0.3" />
            <stop offset="100%" stop-color="${ATMO}" stop-opacity="0" />
          </radialGradient>
          <clipPath id="${id}-clip">
            <circle cx="0" cy="0" r="${r}" />
          </clipPath>
        </defs>

        <circle cx="0" cy="0" r="${(r * 1.13).toFixed(1)}" fill="url(#${id}-atm)" />

        <g transform="rotate(${TILT})">
          <circle cx="0" cy="0" r="${r}" fill="url(#${id}-sea)" />

          <!-- 도는 지도 띠 — 한 바퀴(2r)를 두 장 이어 붙여 끊김 없이 흐르게 한다 -->
          <g clip-path="url(#${id}-clip)">
            <g id="${id}-spin" opacity="0.92">
              <g transform="translate(${(-r).toFixed(1)} 0)">${mapBand(r)}${datacenter ? servers(r) : ''}</g>
              <g transform="translate(${r.toFixed(1)} 0)">${mapBand(r)}${datacenter ? servers(r) : ''}</g>
            </g>
          </g>

          <!-- 위선 — 지구로 읽히게만 하고 도면처럼 보이지 않게 아주 옅게 -->
          <g clip-path="url(#${id}-clip)" opacity="0.16">
            ${[-0.66, -0.34, 0, 0.34, 0.66]
              .map((k) => {
                const rx = r * Math.sqrt(Math.max(0, 1 - k * k))
                return `<ellipse cx="0" cy="${(r * k).toFixed(1)}" rx="${rx.toFixed(1)}"
                                 ry="${(r * 0.13).toFixed(1)}" fill="none"
                                 stroke="${GRID}" stroke-width="1" />`
              })
              .join('')}
          </g>

          <!-- 밝은 쪽 가장자리에만 얇게 도는 테 -->
          <circle cx="0" cy="0" r="${r}" fill="none" stroke="${ATMO}"
                  stroke-width="1" opacity="0.35" />
        </g>
      </g>`
}

/** 지구본 회전 — 지도 띠를 한 바퀴(2r)만큼 흘리고 되돌린다. */
export function globeAnim(root, gsap, id, r, duration = 26) {
  const el = root.querySelector(`#${id}-spin`)
  if (!el) return
  gsap.fromTo(
    el,
    { x: 0 },
    { x: -2 * r, duration, ease: 'none', repeat: -1 },
  )
}
