/**
 * 장면별 타일 톤 — 밝은 타일과 어두운 타일이 번갈아 온다.
 *
 * 애플식 구성에서는 **색이 바뀌는 것 자체가 장면 사이의 구분선**이다.
 * 그래서 장면 사이에 선을 긋지 않는 대신 이 순서가 리듬을 만든다.
 *
 * 어두운 타일은 두 장뿐이고 둘 다 내용이 그것을 요구한다:
 * 06 활주로는 국경 밖이라 우리 관제가 닿지 않고, 10 아웃트로는 터미널이
 * 지표 아래로 내려가며 끝난다.
 *
 * main.js(장면 마크업)와 tools/render-scenes.mjs(도면 미리보기)가 같이 읽는다 —
 * 한쪽만 고치면 미리보기와 실제 화면의 바탕색이 어긋나므로 여기 한 곳에만 둔다.
 */

/** 장면 id → <section> 에 붙을 클래스. 빈 문자열이면 기본(흰 캔버스). */
export const TILE = {
  intro: '',
  why: 'scene--parchment',
  basis: '',
  overview: 'scene--parchment',
  departures: '',
  runway: 'scene--dark',
  arrivals: 'scene--parchment',
  records: '',
  shared: 'scene--parchment',
  outro: 'scene--dark scene--dark-deep',
}

/**
 * 도면이 실제로 앉는 바탕색.
 *
 * 어두운 타일에서는 도면을 파치먼트 판 위에 올리므로(styles/main.css 의
 * `.scene--dark .scene__stage`), 도면 뒤의 색은 타일 색이 아니라 판 색이다.
 * 미리보기는 이 값을 배경으로 깔아야 화면과 같아진다.
 */
export const stageGround = (id) =>
  TILE[id]?.includes('scene--dark')
    ? '#f5f5f7'
    : TILE[id]?.includes('parchment')
      ? '#f5f5f7'
      : '#ffffff'
