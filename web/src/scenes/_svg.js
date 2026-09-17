/**
 * SVG 껍데기 — 모든 장면이 반드시 여기를 거친다.
 *
 * 접근성 때문이다.  도면은 그림이므로 스크린리더에게는 `role="img"` 와
 * 제목·설명이 있어야 한다.  각 장면이 직접 `<svg>` 를 쓰면 언젠가 빠뜨린다.
 * 그래서 통로를 하나로 두고 여기서 강제한다.
 *
 * (예전에는 아이소메트릭 콜아웃·글자 폭 추정 같은 부품도 여기 있었다.
 *  평면 다이어그램으로 옮기면서 그 역할은 _flat.js 가 가져갔다.)
 */

/** @param body 장면이 그린 SVG 내용 — 이 함수가 껍데기만 씌운다. */
export const svgWrap = ({ id, viewBox, title, desc, body }) => `
  <svg class="illus" viewBox="${viewBox}" role="img"
       aria-labelledby="${id}-title ${id}-desc"
       preserveAspectRatio="xMidYMid meet">
    <title id="${id}-title">${title}</title>
    <desc id="${id}-desc">${desc}</desc>
${body}
  </svg>`
