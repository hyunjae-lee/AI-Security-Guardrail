/* 세 갈래 — 끝단 화면 + 그 아래 실제 동작 순서.
 *
 * 처음에 기술 용어만 늘어놓았다가 「이해가 안 간다」는 지적을 받고 비유로
 * 바꿨더니 「비유를 하니 더 이상하다」는 지적을 받았다.  그래서 세 번째 안이다:
 * **끝단 화면(샘플)은 그대로 두고, 그 아래에 요청이 어디로 가서 무엇을 거치는지를
 * 번호로 푼다.**  비유는 없고, 대신 추상적인 용어 대신 **실제 경로**를 적는다.
 *
 * 「base_url 을 바꿀 수 있다」가 아니라
 * 「POST /v1/messages → 교내 게이트웨이 → 검사 → api.anthropic.com」 이라고 적는다.
 * 무슨 일이 일어나는지가 그대로 보이면 설명이 필요 없다.
 */
import { gsap } from 'gsap';

const C = {
  amber: '#f5b355', teal: '#5fcfb0', red: '#f27a6d', green: '#95cf70',
  ink: '#f4f3ef', ink2: '#c7c8ce', ink3: '#9b9da6',
  line: '#3d4250', plate: '#1c1f27', ground2: '#14161c', ground: '#0b0c10',
};
/* 채팅 앱 화면은 **흰색 기본 테마**로 그린다 — ChatGPT·Claude 를 처음 여는 사람이
 * 보는 모습이 그것이라 청중이 「내가 쓰는 그 화면」으로 바로 알아본다.
 * 바탕이 흰색이므로 강조색은 web/ 의 잉크 단계(흰 바탕에서 4.5:1 이상)를 쓴다.
 * 시스템 쪽(방화벽·검사 단계) 패널은 화면이 아니므로 어두운 채로 둔다. */
const L = {
  amber: '#8A5A06', teal: '#0D7A63', red: '#B3251A', green: '#3F7A24',
  ink: '#1d1d1f', ink2: '#3c3c43', ink3: '#6e6e73',
  line: '#dcdce2', plate: '#ffffff', ground2: '#f4f4f6', ground: '#ffffff',
  dot: '#d1d1d6', hover: '#ececf1', bubble: '#f0f0f3',
};

const MONO = `font-family="ui-monospace, 'SF Mono', Menlo, monospace"`;

const COLS = [36, 548, 1060];
const CW = 504;
const WIN_Y = 62, WIN_H = 150;
const FLOW_Y = 248;

/** 끝단 화면 — 터미널이든 앱이든 같은 창 모양을 쓴다. */
function win(x, { chrome, accent, lines, light = false }) {
  const K = light ? L : C;
  const edge = light ? (accent === C.red ? L.red : accent === C.amber ? L.amber : L.teal) : accent;
  return `
    <rect x="${x}" y="${WIN_Y}" width="${CW - 24}" height="${WIN_H}" rx="11"
          fill="${K.plate}" stroke="${edge}" stroke-width="1.5" stroke-opacity="0.75"/>
    <line x1="${x}" y1="${WIN_Y + 32}" x2="${x + CW - 24}" y2="${WIN_Y + 32}" stroke="${K.line}"/>
    <circle cx="${x + 18}" cy="${WIN_Y + 16}" r="3.6" fill="${light ? L.dot : '#4a4f5c'}"/>
    <circle cx="${x + 31}" cy="${WIN_Y + 16}" r="3.6" fill="${light ? L.dot : '#4a4f5c'}"/>
    <circle cx="${x + 44}" cy="${WIN_Y + 16}" r="3.6" fill="${light ? L.dot : '#4a4f5c'}"/>
    <text x="${x + 60}" y="${WIN_Y + 21}" font-size="12.5" fill="${K.ink3}">${chrome}</text>
    ${lines.map((l, i) => {
      const [txt, kind] = Array.isArray(l) ? l : [l, 'mono'];
      const fill = kind === 'dim' ? K.ink3 : kind === 'warn' ? K.red : K.ink2;
      return `<text x="${x + 18}" y="${WIN_Y + 58 + i * 23}" font-size="13"
            fill="${fill}" ${kind === 'mono' ? MONO : ''}>${txt}</text>`;
    }).join('')}`;
}

/** 요청이 어디로 가서 무엇을 거치는지 — 번호로 푼다. */
function flow(x, steps, accent) {
  return steps.map((st, i) => {
    const [head, sub] = Array.isArray(st) ? st : [st, null];
    const y = FLOW_Y + i * (sub ? 46 : 32);
    return `
      <g>
        <circle cx="${x + 11}" cy="${y - 5}" r="10" fill="${accent}" fill-opacity="0.16"
                stroke="${accent}" stroke-width="1.2"/>
        <text x="${x + 11}" y="${y - 1}" text-anchor="middle" font-size="11"
              font-weight="700" fill="${accent}">${i + 1}</text>
        <text x="${x + 30}" y="${y}" font-size="14.5" fill="${C.ink}">${head}</text>
        ${sub ? `<text x="${x + 30}" y="${y + 21}" font-size="13" fill="${C.ink3}" ${MONO}>${sub}</text>` : ''}
      </g>`;
  }).join('');
}

function footer(x, y, color, title, lines) {
  return `
    <rect x="${x}" y="${y}" width="${CW - 24}" height="${32 + lines.length * 23}" rx="10"
          fill="${color}" fill-opacity="0.09" stroke="${color}" stroke-width="1.3"/>
    <text x="${x + 18}" y="${y + 24}" font-size="13.5" font-weight="700" fill="${color}">${title}</text>
    ${lines.map((l, i) => `<text x="${x + 18}" y="${y + 50 + i * 23}" font-size="13.5"
          fill="${C.ink2}">${l}</text>`).join('')}`;
}

export const PATH_STEPS = 4;

export function buildPaths(host) {
  const [xa, xb, xc] = COLS;
  const body = `
    <!-- A ─ 개발 도구 -->
    <g id="pa-0">
      <text x="${xa}" y="26" font-size="14" font-weight="700" fill="${C.teal}" letter-spacing="1.2">A · 개발 도구</text>
      <text x="${xa}" y="50" font-size="17" font-weight="700" fill="${C.ink}">Claude Code · Codex · SDK</text>
      ${win(xa, {
        chrome: 'research-server — zsh', accent: C.teal,
        lines: ['$ export ANTHROPIC_BASE_URL=https://ai.kaist.ac.kr',
                '$ export ANTHROPIC_AUTH_TOKEN=kaist-••••',
                '$ claude',
                ['● 교내 게이트웨이에 연결됨', 'dim']],
      })}
      ${flow(xa, [
        ['클라이언트가 교내 주소로 요청', 'POST https://ai.kaist.ac.kr/v1/messages'],
        ['게이트웨이가 토큰을 확인하고 등급을 정함', '교내 토큰 → CLR 0~4'],
        ['입력 검사 8단계 → 판정', 'ALLOW / SANITIZE / FLAG / BLOCK'],
        ['통과분만 공급자로 중계', '→ api.anthropic.com'],
        ['응답은 꼬리를 붙잡고 흘려보냄', '출력 검사 6단계'],
      ], C.teal)}
      ${footer(xa, 486, C.teal, '게이트웨이가 내야 하는 것', [
        '/v1/messages · /v1/messages/count_tokens',
        'anthropic-version · anthropic-beta 헤더 전달',
        '배포: /etc/profile.d · 컨테이너 ENV · settings.json',
      ])}
    </g>

    <!-- B ─ 소비자 앱 -->
    <g id="pa-1">
      <text x="${xb}" y="26" font-size="14" font-weight="700" fill="${C.red}" letter-spacing="1.2">B · 소비자 앱</text>
      <text x="${xb}" y="50" font-size="17" font-weight="700" fill="${C.ink}">ChatGPT · Claude 데스크톱 / 모바일</text>
      ${win(xb, {
        chrome: 'ChatGPT — 설정', accent: C.red, light: true,
        lines: [['계정 · 일반 · 데이터 제어 · 정보', 'plain'],
                ['서버 주소를 바꾸는 항목이 없음', 'dim'],
                ['', 'plain'],
                ['네트워크 오류 — 연결할 수 없습니다', 'warn']],
      })}
      ${flow(xb, [
        ['앱이 고정된 주소로 TLS 연결 시도', 'chatgpt.com · api.openai.com'],
        ['방화벽이 ClientHello 의 SNI 를 보고 차단', '복호화하지 않음 — 끊을 뿐'],
        ['앱에는 「네트워크 오류」만 표시', 'HTTP 가 아니라 안내 페이지를 못 띄움'],
        ['사용자는 교내 포털로 이동', 'ai.kaist.ac.kr · PWA 설치본'],
      ], C.red)}
      ${footer(xb, 486, C.red, '왜 가로채지 않나', [
        '앱이 인증서 피닝을 써서 TLS 인터셉션은 깨진다',
        '구성원 통신 복호화는 통신비밀 문제이기도 하다',
        '그래서 차단 전 공지와 헬프데스크가 필수다',
      ])}
    </g>

    <!-- C ─ 끼워진 AI -->
    <g id="pa-2">
      <text x="${xc}" y="26" font-size="14" font-weight="700" fill="${C.amber}" letter-spacing="1.2">C · 끼워진 AI</text>
      <text x="${xc}" y="50" font-size="17" font-weight="700" fill="${C.ink}">Office Copilot · Workspace Gemini</text>
      ${win(xc, {
        chrome: '보고서.docx — Word', accent: C.amber, light: true,
        lines: [['문서 본문 …', 'dim'],
                ['Copilot 패널 — 이 문서를 요약해 줘', 'plain'],
                ['', 'plain'],
                ['↳ 벤더 백엔드로 바로 나감', 'warn']],
      })}
      ${flow(xc, [
        ['편집기가 벤더 백엔드로 직접 호출', '우리 서버를 지나지 않음'],
        ['우리 망은 지나지만 통제 지점이 없음', '끝단도 경로도 기관의 것이 아님'],
        ['도메인이 Office 전체와 겹쳐 선별 차단 불가', '막으면 문서·메일이 함께 죽음'],
        ['남는 수단은 세 가지', '테넌트 설정 · 데이터 경계 · 계약'],
      ], C.amber)}
      ${footer(xc, 486, C.amber, '가드레일이 들어갈 자리가 없다', [
        '기술이 아니라 조달·계약의 문제다',
        '학습 미사용 · 리전 상주 · 보존기간을 계약에 건다',
        '구체적 설정은 벤더·계약 등급에 따라 다르다',
      ])}
    </g>`;

  const uid = 'paths-svg';
  host.innerHTML = `
    <svg id="${uid}" viewBox="0 0 1600 606" role="img" aria-labelledby="${uid}-t ${uid}-d"
         preserveAspectRatio="xMidYMid meet" font-family="'Noto Sans KR', system-ui, sans-serif">
      <title id="${uid}-t">브라우저가 아닌 세 경로의 실제 동작</title>
      <desc id="${uid}-d">개발 도구는 교내 주소로 요청을 보내 게이트웨이에서 등급 확인과 입력·출력
        검사를 거친 뒤 공급자로 중계된다. 소비자 앱은 주소를 바꿀 설정이 없어 방화벽이 SNI 로
        차단하고 사용자는 교내 포털로 이동한다. 업무도구에 끼워진 AI 는 편집기가 벤더 백엔드로
        직접 호출해 통제 지점이 없으므로 테넌트 설정과 계약으로 다룬다.</desc>
      ${body}
    </svg>`;
  return host.querySelector('svg');
}

export const PATH_CAPTIONS = [
  '브라우저 말고도 길이 있습니다. <b>셋 다 통제 지점이 다릅니다.</b>',
  '<b>A — 주소를 바꿀 수 있습니다.</b> 요청이 교내 게이트웨이로 들어와 검사를 거친 뒤 공급자로 중계됩니다. 이미 되는 길입니다.',
  '<b>B — 주소를 바꿀 설정이 없습니다.</b> 방화벽에서 끊고 포털로 대체합니다. 앱은 안내 페이지를 못 보므로 사전 공지가 필수입니다.',
  '<b>C — 통제 지점 자체가 없습니다.</b> 편집기가 벤더로 바로 갑니다. 기술이 아니라 계약으로 다룰 문제입니다.',
];

export function makePathController(svg, reduced) {
  const groups = [0, 1, 2].map((i) => svg.querySelector(`#pa-${i}`));
  return function goto(index) {
    const n = Math.max(0, Math.min(index, PATH_STEPS - 1));
    groups.forEach((g, i) => {
      const on = n === 0 || n - 1 === i;
      gsap.to(g, { opacity: on ? 1 : 0.15, duration: reduced ? 0 : 0.4, overwrite: true });
    });
  };
}
