/**
 * 장면 SVG 공통 부품.
 *
 * 모든 헬퍼는 문자열을 돌려주고, 좌표계 원점은 "바닥 중앙"으로 맞춘다
 * (지면·컨베이어 위에 그대로 얹을 수 있도록).  색·선 두께는 CSS 클래스로만
 * 지정하고 여기에는 형태만 둔다.
 */

/** 여행 가방 = 질의 한 건. M3 에서 경로를 따라 움직일 대상이라 id 필수. */
export const bag = (id, x, y, scale = 1) => `
    <g id="${id}" class="bag" transform="translate(${x} ${y}) scale(${scale})">
      <rect class="bag-body" x="-26" y="-38" width="52" height="38" rx="6" />
      <path class="bag-line" d="M -9 -38 C -9 -52 9 -52 9 -38" />
      <path class="bag-line" d="M -26 -19 H 26" />
    </g>`

/** 직원 실루엣 — 원 머리 + 라운드 몸통. 설비보다 앞서 읽히지 않게 살짝 낮춘다. */
export const person = (x, y, scale = 1) => `
    <g class="person" transform="translate(${x} ${y}) scale(${scale})" opacity="0.8">
      <circle class="gear-fill" cx="0" cy="-86" r="13" />
      <rect class="gear-fill" x="-16" y="-70" width="32" height="70" rx="15" />
    </g>`

/** 얇은 지시선. */
export const leader = (d) => `<path class="leader" d="${d}" />`

/** 지시선 끝 라벨 (제목 + 선택적 부제). */
export const label = ({ x, y, title, sub = '', anchor = 'start', cls = '' }) => `
    <text x="${x}" y="${y}" text-anchor="${anchor}" class="lbl-title${cls ? ` ${cls}` : ''}">${title}</text>${
      sub
        ? `
    <text x="${x}" y="${y + 23}" text-anchor="${anchor}" class="lbl-sub">${sub}</text>`
        : ''
    }`

/** SVG 껍데기 — 뷰박스 기반 반응형 + 스크린리더용 title/desc. */
export const svgWrap = ({ id, viewBox, title, desc, body }) => `
  <svg class="illus" viewBox="${viewBox}" role="img"
       aria-labelledby="${id}-title ${id}-desc"
       preserveAspectRatio="xMidYMid meet">
    <title id="${id}-title">${title}</title>
    <desc id="${id}-desc">${desc}</desc>
${body}
  </svg>`
