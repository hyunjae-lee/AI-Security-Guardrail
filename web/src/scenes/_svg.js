/**
 * 장면 SVG 공통 부품 — 콜아웃 라벨 체계와 화면좌표 심볼.
 *
 * 라벨은 "부품별 라벨 + 얇은 지시선" 규칙을 따른다:
 *   대상 위의 점 → 사선 → 짧은 수평 스텁 → 번호 배지 + 제목(+ 부제)
 * 스텁 길이와 배지 크기를 전 장면에서 통일해야 도면처럼 읽힌다.
 */

/** 라벨 쪽 수평 스텁 길이 — 전 장면 공통. */
const STUB = 30

/**
 * @param n     번호 (도면 부호)
 * @param from  [x, y] 대상 위 앵커 (화면좌표 — iso.at() 결과)
 * @param to    [x, y] 라벨이 앉을 지점 (수평선의 끝)
 * @param side  'right' | 'left' — 라벨이 앵커의 어느 쪽으로 나가는지
 */
export const callout = ({
  n,
  from,
  to,
  title,
  sub = '',
  side = 'right',
  cls = '',
}) => {
  const [ax, ay] = from
  const [tx, ty] = to
  const dir = side === 'right' ? 1 : -1
  // 대상에서 사선으로 올라와 라벨 앞에서 짧게 수평으로 꺾는다.
  const elbow = tx - dir * STUB
  const anchor = side === 'right' ? 'start' : 'end'
  const badgeX = tx + dir * 10
  const textX = tx + dir * 27

  return `
      <g class="callout">
        <path class="co-leader" d="M ${ax} ${ay} L ${elbow} ${ty} L ${tx} ${ty}" />
        <circle class="co-dot" cx="${ax}" cy="${ay}" r="2.5" />
        <circle class="co-badge" cx="${badgeX}" cy="${ty - 5}" r="9.5" />
        <text class="co-num" x="${badgeX}" y="${ty - 1}" text-anchor="middle">${n}</text>
        <text class="co-title${cls ? ` ${cls}` : ''}" x="${textX}" y="${ty}" text-anchor="${anchor}">${title}</text>${[]
          .concat(sub || [])
          .map(
            (l, i) => `
        <text class="co-sub" x="${textX}" y="${ty + 20 + i * 18}" text-anchor="${anchor}">${l}</text>`,
          )
          .join('')}
      </g>`
}

/* --------------------------------------------------------------- 글자 폭

   SVG 는 레이아웃을 알려 주지 않는데, 글자 위에 강조 상자를 얹으려면 조각의
   폭을 알아야 한다.  Noto Sans KR 기준 어드밴스 대략치 — 전부 0.55em 으로
   잡으면 공백·쉼표가 과대평가되어 조각 사이가 눈에 띄게 벌어진다.
   출국층·입국층 두 판독 화면이 같은 자를 써야 두 장면이 같은 화면으로 읽힌다. */

const advance = (c) => {
  if (/[가-힣ㄱ-ㅎㅏ-ㅣ一-鿿]/.test(c)) return 1.0
  if (c === ' ') return 0.26
  if (/[,.·:;'"]/.test(c)) return 0.28
  if (/[-–—/|]/.test(c)) return 0.36
  if (/[()[\]{}]/.test(c)) return 0.33
  if (/[ilj!.]/.test(c)) return 0.3
  // 대문자·숫자는 소문자보다 확실히 넓다. 뭉뚱그리면 [REDACTED:PHONE_KR] 같은
  // 토큰의 폭이 20px 넘게 모자라 다음 조각이 글자 위로 올라탄다.
  if (/[A-Z]/.test(c)) return 0.72
  if (c === '@') return 0.95
  if (/[0-9]/.test(c)) return 0.58
  if (c === '_') return 0.5
  return 0.56
}

/** 문자열이 글꼴 크기 f 에서 차지하는 대략 폭. */
export const runW = (str, f) => [...str].reduce((a, c) => a + f * advance(c), 0)

/** 강조 배경 — 글자 시작점은 고정이고 오른쪽 끝만 추정하므로 어긋나도 티가 안 난다. */
export const mark = (x, y, text, color, fs = 15, opacity = 0.16) =>
  `<rect x="${(x - 4).toFixed(1)}" y="${y - fs + 1}" width="${(runW(text, fs) + 8).toFixed(1)}"
                 height="${fs + 7}" rx="2" fill="${color}" opacity="${opacity}" />`

/** 장면 제목 옆에 붙는 도면 표제 (좌상단 고정). */
export const plate = (x, y, text) => `
      <text class="co-sub" x="${x}" y="${y}" letter-spacing="3">${text}</text>
      <path class="hair" d="M ${x} ${y + 10} H ${x + 210}" />`

/** SVG 껍데기 — 뷰박스 기반 반응형 + 스크린리더용 title/desc. */
export const svgWrap = ({ id, viewBox, title, desc, body }) => `
  <svg class="illus" viewBox="${viewBox}" role="img"
       aria-labelledby="${id}-title ${id}-desc"
       preserveAspectRatio="xMidYMid meet">
    <title id="${id}-title">${title}</title>
    <desc id="${id}-desc">${desc}</desc>
${body}
  </svg>`
