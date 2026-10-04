/* 세 갈래 — 비유로 먼저, 기술 용어는 작게.
 *
 * 이 프로젝트의 원칙이 그렇다 (CLAUDE.md): 본문은 비유어로 쓰고 실제 기술
 * 용어는 따로 작게 병기한다.  타깃 독자가 비전문가 교직원이기 때문이다.
 * 「base_url 을 바꿀 수 있다」는 말은 개발자에게만 통한다.
 *
 * 비유 하나로 셋을 가른다 — **봉투에 주소를 내가 쓸 수 있느냐.**
 *   A 주소 칸이 있다      → 교내 주소로 고쳐 쓴다
 *   B 주소가 인쇄돼 있다  → 그 길을 막고 똑같은 우리 길을 만들어 준다
 *   C 남의 집 안에 있다   → 손댈 수 없다. 집주인과 약속으로 정한다
 */
import { gsap } from 'gsap';

const C = {
  amber: '#f5b355', teal: '#5fcfb0', red: '#f27a6d', green: '#95cf70',
  ink: '#f4f3ef', ink2: '#c7c8ce', ink3: '#9b9da6',
  line: '#3d4250', plate: '#1c1f27', ground2: '#14161c', ground: '#0b0c10',
};

const COLS = [40, 560, 1080];   // 세 칸 왼쪽 좌표
const CW = 480;                 // 칸 너비

/** 봉투 — A·B 가 같은 그림을 쓰고 주소줄만 다르다. */
function envelope(x, y, accent, addr) {
  return `
    <rect x="${x}" y="${y}" width="200" height="130" rx="10"
          fill="${C.ground2}" stroke="${accent}" stroke-width="1.8"/>
    <path d="M${x} ${y} L${x + 100} ${y + 58} L${x + 200} ${y}"
          fill="none" stroke="${accent}" stroke-width="1.6" stroke-opacity="0.6"/>
    ${addr}`;
}

function column(i, { tag, tagColor, title, pict, big, how, howColor, real }) {
  const x = COLS[i];
  return `
    <g id="pa-${i}">
      <text x="${x}" y="34" font-size="15" font-weight="700"
            fill="${tagColor}" letter-spacing="1.2">${tag}</text>
      <text x="${x}" y="72" font-size="25" font-weight="700" fill="${C.ink}">${title}</text>

      <g transform="translate(${x + 10}, 104)">${pict}</g>

      ${big.map((l, k) => `<text x="${x}" y="${290 + k * 30}" font-size="18"
            fill="${k === 0 ? C.ink : C.ink2}"
            font-weight="${k === 0 ? 700 : 400}">${l}</text>`).join('')}

      <rect x="${x}" y="${352}" width="${CW - 20}" height="96" rx="12"
            fill="${howColor}" fill-opacity="0.1" stroke="${howColor}" stroke-width="1.5"/>
      <text x="${x + 24}" y="${384}" font-size="15" font-weight="700" fill="${howColor}">어떻게 하나</text>
      ${how.map((l, k) => `<text x="${x + 24}" y="${410 + k * 24}" font-size="15.5"
            fill="${C.ink}">${l}</text>`).join('')}

      <text x="${x}" y="${484}" font-size="13" fill="${C.ink3}">실제로는 — ${real}</text>
    </g>`;
}

export const PATH_STEPS = 4;

export function buildPaths(host) {
  const body = `
    ${column(0, {
      tag: 'A', tagColor: C.teal,
      title: '주소를 내가 쓰는 길',
      pict: envelope(0, 0, C.teal, `
        <line x1="24" y1="78" x2="150" y2="78" stroke="${C.ink3}" stroke-width="1.2"/>
        <text x="24" y="74" font-size="14" fill="${C.ink3}"
              text-decoration="line-through">바깥 AI 로</text>
        <text x="24" y="104" font-size="15" font-weight="700" fill="${C.teal}">교내 검사대로</text>
        <path d="M168 60 l18 -18 l10 10 l-18 18 z" fill="${C.teal}" fill-opacity="0.8"/>
        <path d="M168 60 l-4 14 l14 -4 z" fill="${C.teal}"/>`),
      big: ['주소 칸이 있습니다.', '그래서 고쳐 쓰면 됩니다.'],
      how: ['주소를 교내 검사대로 바꿔 둡니다.', '한 줄이면 끝납니다.'],
      howColor: C.teal,
      real: '개발 도구 (Claude Code · Codex). 환경변수 하나',
    })}

    ${column(1, {
      tag: 'B', tagColor: C.red,
      title: '주소가 박혀 있는 길',
      pict: envelope(0, 0, C.red, `
        <text x="24" y="74" font-size="14" fill="${C.ink3}">바깥 AI 로</text>
        <text x="24" y="98" font-size="13" fill="${C.ink3}">(지울 수 없음)</text>
        <g transform="translate(160,56)">
          <rect x="-14" y="0" width="28" height="22" rx="4"
                fill="${C.red}" fill-opacity="0.2" stroke="${C.red}" stroke-width="1.5"/>
          <path d="M-8 0 v-8 a8 8 0 0 1 16 0 v8" fill="none" stroke="${C.red}" stroke-width="1.8"/>
        </g>`),
      big: ['주소 칸이 없습니다.', '아무도 바꿀 수 없습니다.'],
      how: ['이 길을 막습니다.', '대신 똑같이 생긴 우리 길을 만들어 줍니다.'],
      howColor: C.teal,
      real: '앱 (ChatGPT · Claude 데스크톱). 교내 포털로 대체',
    })}

    ${column(2, {
      tag: 'C', tagColor: C.amber,
      title: '남의 집 안에 있는 길',
      pict: `
        <g stroke="${C.ink3}" stroke-width="1.6">
          ${[0, 18, 36, 54].map((d) => `<line x1="${d}" y1="18" x2="${d}" y2="120"/>`).join('')}
          <line x1="-6" y1="42" x2="62" y2="42"/>
          <line x1="-6" y1="92" x2="62" y2="92"/>
        </g>
        <rect x="92" y="28" width="108" height="96" rx="8"
              fill="${C.ground2}" stroke="${C.amber}" stroke-width="1.8"/>
        <rect x="110" y="48" width="30" height="26" rx="4" fill="${C.amber}" fill-opacity="0.22"/>
        <rect x="152" y="48" width="30" height="26" rx="4" fill="${C.amber}" fill-opacity="0.22"/>
        <circle cx="146" cy="100" r="11" fill="${C.amber}" fill-opacity="0.3"
                stroke="${C.amber}" stroke-width="1.4"/>
        <text x="146" y="105" text-anchor="middle" font-size="11"
              font-weight="700" fill="${C.amber}">AI</text>`,
      big: ['우리 길이 아닙니다.', '손댈 곳이 없습니다.'],
      how: ['집주인(회사)과 약속으로 정합니다.', '무엇까지 가져가도 되는지를.'],
      howColor: C.amber,
      real: '업무도구에 끼워진 AI (워드·엑셀 안의 Copilot)',
    })}`;

  const uid = 'paths-svg';
  host.innerHTML = `
    <svg id="${uid}" viewBox="0 0 1600 500" role="img" aria-labelledby="${uid}-t ${uid}-d"
         preserveAspectRatio="xMidYMid meet" font-family="'Noto Sans KR', system-ui, sans-serif">
      <title id="${uid}-t">AI 로 가는 세 가지 길과 각각의 처리 방법</title>
      <desc id="${uid}-d">봉투에 주소를 직접 쓸 수 있는 길은 교내 검사대 주소로 고쳐 쓴다.
        주소가 인쇄돼 바꿀 수 없는 길은 막고 똑같은 교내 길을 대신 만들어 준다.
        남의 건물 안에 있는 길은 손댈 수 없어 그 회사와 약속으로 정한다.</desc>
      ${body}
    </svg>`;
  return host.querySelector('svg');
}

export const PATH_CAPTIONS = [
  'AI 한테 가는 길은 하나가 아닙니다. <b>봉투에 주소를 내가 쓸 수 있느냐</b>로 셋이 갈립니다.',
  '<b>쓸 수 있으면 고쳐 씁니다.</b> 「바깥 AI 로」를 지우고 「교내 검사대로」라고 적으면 끝입니다.',
  '<b>쓸 수 없으면 길을 막고 대신 만들어 줍니다.</b> 막기만 하면 사람들은 다른 길로 갑니다.',
  '<b>남의 집 안이면 손댈 수 없습니다.</b> 그 회사와 약속으로 정하는 수밖에 없습니다.',
];

export function makePathController(svg, reduced) {
  const groups = [0, 1, 2].map((i) => svg.querySelector(`#pa-${i}`));
  return function goto(index) {
    const n = Math.max(0, Math.min(index, PATH_STEPS - 1));
    groups.forEach((g, i) => {
      const on = n === 0 || n - 1 === i;
      gsap.to(g, { opacity: on ? 1 : 0.14, duration: reduced ? 0 : 0.4, overwrite: true });
    });
  };
}
