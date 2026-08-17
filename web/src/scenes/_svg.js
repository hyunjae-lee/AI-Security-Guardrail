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
