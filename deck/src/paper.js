/* 종이 모드 (`?paper`) — 책자·인쇄용 흰 바탕.
 *
 * 발표 화면은 강당 프로젝터 기준으로 어둡지만, 인쇄물은 흰 종이가 바탕이다.
 * 색의 뜻(호박=질의 · 청록=설비 · 빨강=차단 · 초록=허용)은 그대로 두고
 * 명도만 흰 바탕용 잉크 단계로 내린다 — web/ 의 잉크 색과 같은 계열이다.
 * 그림 모듈의 C 는 const 객체라 값만 바꿔 끼운다(모듈마다 paperize(C) 한 줄). */
export const PAPER = typeof location !== 'undefined'
  && new URLSearchParams(location.search).has('paper');

const PAPER_C = {
  amber: '#9a6408', teal: '#0d7a63', red: '#b3251a', green: '#3f7a24',
  ink: '#1d1d1f', ink2: '#3c3c43', ink3: '#6e6e73',
  line: '#c7c7cc', plate: '#f5f5f7', ground: '#ffffff', ground2: '#fafafc',
};

export function paperize(C) {
  if (PAPER) for (const k of Object.keys(C)) if (k in PAPER_C) C[k] = PAPER_C[k];
  return C;
}

if (PAPER) document.documentElement.classList.add('paper');
