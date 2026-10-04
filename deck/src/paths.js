/* 세 갈래 — 브라우저가 아닌 경로는 어떻게 되나.
 *
 * 「앱은? CLI 는? 코드는?」 은 발표에서 반드시 나오는 질문이다.  말로 답하면
 * 길어지는데, **끝단 화면을 나란히 놓으면** 왜 셋이 다른지가 한눈에 보인다.
 *   · 개발 도구는 주소를 바꿀 수 있다  → 게이트웨이로
 *   · 소비자 앱은 바꿀 칸이 없다       → 차단하고 포털로
 *   · 끼워진 AI 는 우리 것이 아니다    → 정책 결정
 */
import { gsap } from 'gsap';

const C = {
  amber: '#f5b355', teal: '#5fcfb0', red: '#f27a6d', green: '#95cf70',
  ink: '#f4f3ef', ink2: '#c7c8ce', ink3: '#9b9da6',
  line: '#3d4250', plate: '#1c1f27', ground2: '#14161c', ground: '#0b0c10',
};

const MX = 40, MW = 470;          // 끝단 화면
const AX = 536, AW = 150;         // 화살표·판정
const DX = 706, DW = 360;         // 도착지
const NX = 1096, NW = 464;        // 왜 그런가
const ROWS = [24, 222, 420];      // 세 줄
const RH = 174;

function win({ y, title, accent, chrome, lines, mono }) {
  return `
    <rect x="${MX}" y="${y}" width="${MW}" height="${RH}" rx="12"
          fill="${C.plate}" stroke="${C.line}" stroke-width="1.4"/>
    <line x1="${MX}" y1="${y + 36}" x2="${MX + MW}" y2="${y + 36}" stroke="${C.line}"/>
    <circle cx="${MX + 20}" cy="${y + 18}" r="4" fill="#4a4f5c"/>
    <circle cx="${MX + 34}" cy="${y + 18}" r="4" fill="#4a4f5c"/>
    <circle cx="${MX + 48}" cy="${y + 18}" r="4" fill="#4a4f5c"/>
    <text x="${MX + 66}" y="${y + 23}" font-size="13" fill="${C.ink3}">${chrome}</text>
    <text x="${MX + 20}" y="${y + 62}" font-size="15" font-weight="700" fill="${accent}">${title}</text>
    ${lines.map((l, i) => `<text x="${MX + 20}" y="${y + 90 + i * 24}"
          font-size="13.5" fill="${l.startsWith('·') ? C.ink3 : C.ink2}"
          ${mono ? `font-family="ui-monospace, 'SF Mono', Menlo, monospace"` : ''}>${l}</text>`).join('')}`;
}

function verdict(y, mark, label, color) {
  const cy = y + RH / 2;
  return `
    <path d="M${AX} ${cy} L${AX + 86} ${cy}" stroke="${color}" stroke-width="2.6"
          marker-end="url(#p-${mark})"/>
    <circle cx="${AX + 112}" cy="${cy}" r="19" fill="${color}" fill-opacity="0.16"
            stroke="${color}" stroke-width="1.6"/>
    <text x="${AX + 112}" y="${cy + 6}" text-anchor="middle" font-size="16"
          font-weight="700" fill="${color}">${mark === 'ok' ? '✓' : mark === 'no' ? '✕' : '?'}</text>
    <text x="${AX + 112}" y="${cy + 40}" text-anchor="middle" font-size="12.5"
          font-weight="700" fill="${color}">${label}</text>`;
}

function dest(y, title, sub, color) {
  return `
    <rect x="${DX}" y="${y + 30}" width="${DW}" height="${RH - 60}" rx="12"
          fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="1.5"/>
    <text x="${DX + DW / 2}" y="${y + 70}" text-anchor="middle" font-size="16"
          font-weight="700" fill="${color}">${title}</text>
    <text x="${DX + DW / 2}" y="${y + 96}" text-anchor="middle" font-size="13" fill="${C.ink2}">${sub}</text>`;
}

function note(y, lines) {
  return lines.map((l, i) => `<text x="${NX}" y="${y + 62 + i * 24}" font-size="13.5"
        fill="${i === 0 ? C.ink : C.ink2}" font-weight="${i === 0 ? 700 : 400}">${l}</text>`).join('');
}

export const PATH_STEPS = 4;

export function buildPaths(host) {
  const [y0, y1, y2] = ROWS;
  const body = `
    <!-- A. 개발 도구 -->
    <g id="pa-0">
      ${win({
        y: y0, chrome: 'research-server — zsh', title: 'A. 개발 도구', accent: C.teal, mono: true,
        lines: ['$ export ANTHROPIC_BASE_URL=https://ai.kaist.ac.kr',
                '$ claude',
                '· 연결됨 — 교내 게이트웨이 경유'],
      })}
      ${verdict(y0, 'ok', '바꿀 수 있다', C.teal)}
      ${dest(y0, '게이트웨이로', '이미 되는 길 — 환경변수 하나', C.teal)}
      ${note(y0, ['Claude Code · Codex · OpenAI SDK · Cursor',
                  'LiteLLM 이 Anthropic 형식 /v1/messages 를 낸다',
                  '서버 이미지에 심어 두면 평소처럼 claude 만 치면 된다'])}
    </g>

    <!-- B. 소비자 앱 -->
    <g id="pa-1">
      ${win({
        y: y1, chrome: 'ChatGPT', title: 'B. 소비자 앱', accent: C.red,
        lines: ['설정 → 고급', '· 엔드포인트를 바꿀 칸이 없습니다', '· 연결 실패'],
      })}
      ${verdict(y1, 'no', '바꿀 수 없다', C.red)}
      ${dest(y1, '차단하고 포털로', '포털이 존재하는 이유', C.teal)}
      ${note(y1, ['ChatGPT · Claude 데스크톱 / 모바일 앱',
                  '커스텀 엔드포인트 설정이 아예 없다',
                  '쓰는 사람이 코드를 안 쓰므로 포털 웹으로 충분하다'])}
    </g>

    <!-- C. 끼워진 AI -->
    <g id="pa-2">
      ${win({
        y: y2, chrome: '보고서.docx — Word', title: 'C. 끼워진 AI', accent: C.amber,
        lines: ['Copilot 패널', '· 문서 안에서 바로 호출된다', '· 경로도 끝단도 우리 것이 아니다'],
      })}
      ${verdict(y2, 'q', '우리 것이 아니다', C.amber)}
      ${dest(y2, '정책 결정', '막으면 생산성 도구가 함께 죽는다', C.amber)}
      ${note(y2, ['Office Copilot · Workspace Gemini · GitHub Copilot',
                  '기업 테넌트 설정으로 데이터 경계를 제한하는 것이 현실적',
                  '이건 기술이 아니라 기관의 판단이다'])}
    </g>

    <defs>
      <marker id="p-ok" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="${C.teal}"/></marker>
      <marker id="p-no" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="${C.red}"/></marker>
      <marker id="p-q" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="${C.amber}"/></marker>
    </defs>`;

  const uid = 'paths-svg';
  host.innerHTML = `
    <svg id="${uid}" viewBox="0 0 1600 616" role="img" aria-labelledby="${uid}-t ${uid}-d"
         preserveAspectRatio="xMidYMid meet" font-family="'Noto Sans KR', system-ui, sans-serif">
      <title id="${uid}-t">브라우저가 아닌 세 갈래 — 개발 도구 · 소비자 앱 · 끼워진 AI</title>
      <desc id="${uid}-d">개발 도구는 환경변수로 게이트웨이를 가리킬 수 있어 그대로 검사를 지난다.
        소비자 앱은 엔드포인트를 바꿀 설정이 없어 차단하고 교내 포털로 대체한다.
        업무도구에 끼워진 AI 는 경로도 끝단도 기관의 것이 아니라 정책으로 판단해야 한다.</desc>
      ${body}
    </svg>`;
  return host.querySelector('svg');
}

export const PATH_CAPTIONS = [
  '브라우저가 아닌 길이 실제로는 더 많습니다. <b>셋이 성격이 완전히 다릅니다.</b>',
  '<b>개발 도구는 이미 됩니다.</b> 환경변수 하나면 게이트웨이를 지납니다 — Claude Code 도 Codex 도.',
  '<b>소비자 앱은 바꿀 칸이 없습니다.</b> 차단하고 포털로 옮기는 수밖에 없습니다 — 포털이 필요한 이유입니다.',
  '<b>끼워진 AI 는 기술 문제가 아닙니다.</b> 막으면 생산성 도구가 함께 죽습니다. 기관이 정해야 합니다.',
];

export function makePathController(svg, reduced) {
  const groups = [0, 1, 2].map((i) => svg.querySelector(`#pa-${i}`));
  return function goto(index) {
    const n = Math.max(0, Math.min(index, PATH_STEPS - 1));
    groups.forEach((g, i) => {
      // 0 = 전체 보기. 1~3 = 그 줄만 선명하게.
      const on = n === 0 || n - 1 === i;
      gsap.to(g, { opacity: on ? 1 : 0.16, duration: reduced ? 0 : 0.4, overwrite: true });
    });
  };
}
