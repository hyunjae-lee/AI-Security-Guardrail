/* 시스템 구조 · 트래픽 흐름 — 전체를 보여 준 뒤 단계마다 확대한다.
 *
 * 왜 확대하나
 * ----------
 * 전체 흐름을 한 장에 담으면 상자가 작아져서 글자가 안 읽히고, 크게 그리면
 * 전체 모양이 안 보인다.  **둘 다 필요하다** — 청중은 먼저 「어디서 어디로
 * 가는가」를 보고, 그다음 「각 단계가 무엇을 하는가」를 봐야 한다.
 * 그래서 viewBox 를 옮겨 가며 확대한다.  작은 상자는 확대하면 읽히므로
 * 전체 그림에서 굳이 크게 그릴 이유가 없다.
 *
 * 발표자가 방향키로 넘긴다 (reveal 의 fragment).  자동 재생하지 않는 이유는
 * 설명 속도가 사람마다 다르기 때문이다.
 */
import { gsap } from 'gsap';

const C = {
  amber: '#f0a63a', teal: '#43bc9c', red: '#e25749', green: '#7fbf57',
  ink: '#f4f3ef', ink2: '#a8a9b0', ink3: '#70737d',
  line: '#2e323d', plate: '#1c1f27', ground2: '#14161c',
};

/** 입력 파이프라인 — 왼쪽에서 오른쪽으로 순서대로 거친다. */
const IN_STAGES = [
  ['정규화', 'base64\n호모글리프 해제', '규칙'],
  ['이상 탐지', '길이 폭탄\n반복 플러드', '규칙'],
  ['자격증명', 'API 키·토큰\n엔트로피', '규칙'],
  ['개인정보', '주민번호·카드\n체크섬', '규칙'],
  ['한국어 NER', '이름·주소\nKoELECTRA', 'ML'],
  ['인젝션', '지시 무시\n역할 조작 · 6종', '규칙'],
  ['유해 요청', '주제 ×\n실행 의도', '규칙'],
  ['권한·등급', 'CLR 0~4\nL0~L4', '규칙'],
];

/** 출력 파이프라인 — 돌아온 답변을 검사한다. */
const OUT_STAGES = [
  ['카나리아', '시스템 프롬프트\n유출 확정'],
  ['자격증명', '응답에 키가\n섞였나'],
  ['개인정보', '마스킹이\n풀렸나'],
  ['반출 링크', '이미지·URL로\n빼내나'],
  ['응답 유해성', '입력을 우회해\n성공했나'],
  ['거절 일관성', '거절했어야\n했는데'],
];

function stageBox(x, y, w, h, [title, sub, kind], idx) {
  const isML = kind === 'ML';
  const accent = isML ? C.amber : C.teal;
  const lines = sub.split('\n');
  return `
    <g id="in-${idx}" class="stage-box">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10"
            fill="${isML ? 'rgba(240,166,58,.10)' : C.plate}"
            stroke="${accent}" stroke-width="${isML ? 2 : 1.3}"/>
      <text x="${x + w / 2}" y="${y + 26}" text-anchor="middle"
            font-size="15" font-weight="700" fill="${accent}">${title}</text>
      ${lines.map((l, i) => `<text x="${x + w / 2}" y="${y + 50 + i * 17}" text-anchor="middle"
            font-size="12" fill="${C.ink2}">${l}</text>`).join('')}
      ${isML ? `<text x="${x + w / 2}" y="${y + h - 10}" text-anchor="middle"
            font-size="10" font-weight="700" fill="${C.amber}">ONNX 56MB · 3ms</text>` : ''}
    </g>`;
}

function outBox(x, y, w, h, [title, sub], idx) {
  const lines = sub.split('\n');
  return `
    <g id="out-${idx}" class="stage-box">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10"
            fill="${C.plate}" stroke="${C.green}" stroke-width="1.3"/>
      <text x="${x + w / 2}" y="${y + 24}" text-anchor="middle"
            font-size="14" font-weight="700" fill="${C.green}">${title}</text>
      ${lines.map((l, i) => `<text x="${x + w / 2}" y="${y + 46 + i * 16}" text-anchor="middle"
            font-size="11.5" fill="${C.ink2}">${l}</text>`).join('')}
    </g>`;
}

function person(x, y, s, color) {
  return `<g transform="translate(${x},${y}) scale(${s})" fill="${color}">
    <circle cx="0" cy="-12" r="7"/>
    <path d="M-8 4 Q-8 -3 0 -3 Q8 -3 8 4 L8 11 Q8 13 6 13 L-6 13 Q-8 13 -8 11 Z"/></g>`;
}

export function buildArchitecture(host) {
  const IW = 86, IG = 8, IX = 452, IY = 120, IH = 118;      // 입력 단계 상자
  const OW = 112, OG = 10, OX = 452, OY = 560, OH = 96;      // 출력 단계 상자

  const body = `
    <!-- 캠퍼스 -->
    <g id="z-campus">
      <rect x="40" y="96" width="196" height="178" rx="14"
            fill="${C.ground2}" stroke="${C.line}" stroke-width="1.4"/>
      <text x="138" y="124" text-anchor="middle" font-size="14" font-weight="700" fill="${C.ink2}">캠퍼스</text>
      ${person(90, 180, 1.5, C.amber)}${person(138, 180, 1.5, C.amber)}${person(186, 180, 1.5, C.amber)}
      <text x="138" y="232" text-anchor="middle" font-size="11.5" fill="${C.ink3}">구성원 14,000명</text>
      <text x="138" y="250" text-anchor="middle" font-size="11.5" fill="${C.ink3}">학생 · 교직원 · 연구원</text>
    </g>

    <!-- 포털 / 프록시 -->
    <g id="z-portal">
      <rect x="264" y="96" width="160" height="178" rx="14"
            fill="${C.plate}" stroke="${C.teal}" stroke-width="1.6"/>
      <text x="344" y="124" text-anchor="middle" font-size="14" font-weight="700" fill="${C.teal}">교내 AI 포털</text>
      <line x1="284" y1="138" x2="404" y2="138" stroke="${C.line}"/>
      <text x="344" y="160" text-anchor="middle" font-size="11.5" fill="${C.ink2}">사람 → 웹 채팅</text>
      <text x="344" y="182" text-anchor="middle" font-size="11.5" fill="${C.ink2}">앱 → OpenAI 호환 API</text>
      <rect x="284" y="198" width="120" height="30" rx="7"
            fill="rgba(67,188,156,.12)" stroke="${C.teal}" stroke-width="1"/>
      <text x="344" y="218" text-anchor="middle" font-size="11.5" font-weight="600" fill="${C.teal}">LiteLLM 프록시</text>
      <text x="344" y="250" text-anchor="middle" font-size="11" fill="${C.ink3}">SSO 로 CLR 등급 확인</text>
    </g>

    <!-- 입력 검사 -->
    <g id="z-in">
      <rect x="440" y="84" width="${IX - 440 + IN_STAGES.length * (IW + IG)}" height="${IH + 76}" rx="14"
            fill="none" stroke="${C.teal}" stroke-width="1.2" stroke-dasharray="6 5" stroke-opacity="0.55"/>
      <text x="452" y="106" font-size="13" font-weight="700" fill="${C.teal}">출국 검사 — 질의 파이프라인</text>
      ${IN_STAGES.map((s, i) => stageBox(IX + i * (IW + IG), IY, IW, IH, s, i)).join('')}
      <text x="${IX}" y="${IY + IH + 30}" font-size="11.5" fill="${C.ink3}">
        앞 단계가 디코딩한 결과를 다음 단계가 본다 — 인코딩으로 우회할 수 없다
      </text>
    </g>

    <!-- 판정 -->
    <g id="z-verdict">
      <text x="452" y="330" font-size="13" font-weight="700" fill="${C.ink2}">판정 — 막는 것이 아니라 등급에 따라 다르게 보낸다</text>
      ${[
        ['ALLOW', '그대로 통과', C.green],
        ['SANITIZE', '금지 물건만 빼고', C.teal],
        ['FLAG', '보내고 표시', C.amber],
        ['BLOCK', '반출 금지', C.red],
      ].map(([t, d, col], i) => `
        <g id="vd-${i}">
          <rect x="${452 + i * 196}" y="346" width="180" height="62" rx="10"
                fill="${col}" fill-opacity="0.12" stroke="${col}" stroke-width="1.5"/>
          <text x="${542 + i * 196}" y="370" text-anchor="middle" font-size="14" font-weight="700" fill="${col}">${t}</text>
          <text x="${542 + i * 196}" y="392" text-anchor="middle" font-size="11.5" fill="${C.ink2}">${d}</text>
        </g>`).join('')}
    </g>

    <!-- 국경 + 외부 AI -->
    <g id="z-border">
      <line x1="1250" y1="60" x2="1250" y2="470" stroke="${C.red}" stroke-width="2.4" stroke-dasharray="9 7"/>
      <text x="1250" y="50" text-anchor="middle" font-size="12.5" font-weight="700" fill="${C.red}">국경</text>
      <g transform="translate(1390,180)">
        <circle r="54" fill="none" stroke="${C.ink3}" stroke-width="1.6"/>
        <ellipse rx="54" ry="20" fill="none" stroke="${C.ink3}" stroke-width="1.1"/>
        <ellipse rx="21" ry="54" fill="none" stroke="${C.ink3}" stroke-width="1.1"/>
        <line x1="-54" y1="0" x2="54" y2="0" stroke="${C.ink3}" stroke-width="1.1"/>
      </g>
      <text x="1390" y="262" text-anchor="middle" font-size="13" font-weight="700" fill="${C.ink2}">외부 생성형 AI</text>
      <text x="1390" y="282" text-anchor="middle" font-size="11.5" fill="${C.ink3}">ChatGPT · Claude · Gemini</text>
      <text x="1390" y="302" text-anchor="middle" font-size="11" fill="${C.red}">여기서부터 우리 관제 밖</text>
      <text x="1140" y="430" text-anchor="middle" font-size="11.5" fill="${C.red}">직접 접속은 차단</text>
      <text x="1140" y="448" text-anchor="middle" font-size="11.5" fill="${C.red}">(SNI · DNS 정책)</text>
    </g>

    <!-- 출력 검사 -->
    <g id="z-out">
      <rect x="440" y="524" width="${OX - 440 + OUT_STAGES.length * (OW + OG)}" height="${OH + 72}" rx="14"
            fill="none" stroke="${C.green}" stroke-width="1.2" stroke-dasharray="6 5" stroke-opacity="0.55"/>
      <text x="452" y="546" font-size="13" font-weight="700" fill="${C.green}">입국 검사 — 답변 파이프라인</text>
      ${OUT_STAGES.map((s, i) => outBox(OX + i * (OW + OG), OY, OW, OH, s, i)).join('')}
      <text x="${OX}" y="${OY + OH + 28}" font-size="11.5" fill="${C.ink3}">
        나갈 때 깨끗했어도 돌아올 때 깨끗하다는 보장은 없다
      </text>
    </g>

    <!-- 감사 -->
    <g id="z-audit">
      <rect x="40" y="560" width="372" height="96" rx="12"
            fill="${C.plate}" stroke="${C.line}" stroke-width="1.4"/>
      <text x="226" y="586" text-anchor="middle" font-size="13.5" font-weight="700" fill="${C.ink2}">감사 기록</text>
      <text x="226" y="610" text-anchor="middle" font-size="11.5" fill="${C.ink2}">시각 · 탐지 유형 · 판정 · 길이</text>
      <text x="226" y="630" text-anchor="middle" font-size="12" font-weight="700" fill="${C.red}">원문은 저장하지 않는다</text>
      <text x="226" y="648" text-anchor="middle" font-size="10.5" fill="${C.ink3}">소금 친 해시만 — 같은 질의인지는 알고, 내용은 못 되살린다</text>
    </g>

    <!-- 흐름선 -->
    <g id="z-flow" stroke-linecap="round">
      <path d="M236 185 L256 185" stroke="${C.amber}" stroke-width="2.6" marker-end="url(#a-am)"/>
      <path d="M424 185 L444 185" stroke="${C.amber}" stroke-width="2.6" marker-end="url(#a-am)"/>
      <!-- 검사 → 판정 → 국경. 파이프라인 상자 안을 가로지르지 않도록 돌린다. -->
      <path d="M828 284 L828 338" stroke="${C.amber}" stroke-width="2.4"
            fill="none" marker-end="url(#a-am)"/>
      <path d="M1220 377 C 1292 377, 1300 200, 1244 186" stroke="${C.amber}"
            stroke-width="2.6" fill="none" marker-end="url(#a-am)"/>
      <path d="M1258 180 L1330 180" stroke="${C.amber}" stroke-width="2.6" marker-end="url(#a-am)"/>
      <!-- 돌아오는 길 -->
      <path d="M1390 240 L1390 608 L1200 608" stroke="${C.green}" stroke-width="2.6"
            fill="none" marker-end="url(#a-gr)"/>
      <path d="M440 608 L420 608" stroke="${C.green}" stroke-width="2.6" fill="none" marker-end="url(#a-gr)"/>
      <!-- 감사로 -->
      <path d="M620 284 L620 308 L226 308 L226 552" stroke="${C.line}" stroke-width="1.4"
            fill="none" stroke-dasharray="5 5"/>
    </g>

    <defs>
      <marker id="a-am" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="${C.amber}"/></marker>
      <marker id="a-gr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="${C.green}"/></marker>
    </defs>`;

  const uid = 'arch-svg';
  host.innerHTML = `
    <svg id="${uid}" viewBox="0 0 1600 700" role="img"
         aria-labelledby="${uid}-t ${uid}-d" preserveAspectRatio="xMidYMid meet"
         font-family="'Noto Sans KR', system-ui, sans-serif">
      <title id="${uid}-t">가드레일 시스템 구조와 트래픽 흐름</title>
      <desc id="${uid}-d">캠퍼스 구성원의 질의가 교내 AI 포털과 LiteLLM 프록시를 거쳐
        여덟 단계의 출국 검사를 통과하고, 네 갈래 판정에 따라 국경 밖 외부 생성형 AI 로
        나간다. 돌아온 답변은 여섯 단계의 입국 검사를 거쳐 전달되며, 감사 기록에는
        판정만 남고 원문은 저장되지 않는다.</desc>
      ${body}
    </svg>`;
  return host.querySelector('svg');
}

/** 확대 단계 — [viewBox, 강조할 그룹, 캡션] */
export const ARCH_STEPS = [
  [[0, 20, 1600, 680], null,
   '전체 흐름 — 캠퍼스에서 나간 질의가 검사를 거쳐 국경을 넘고, 돌아온 답변이 다시 검사를 받습니다.'],
  [[24, 80, 420, 210], ['z-campus', 'z-portal'],
   '구성원은 <b>교내 포털</b>만 봅니다. 사람은 웹 채팅으로, 앱·연구실은 OpenAI 호환 API 로 들어옵니다. 여기서 SSO 로 권한 등급(CLR)이 정해집니다.'],
  [[436, 76, 790, 230], ['z-in'],
   '<b>출국 검사 여덟 단계.</b> 앞 단계가 디코딩한 결과를 다음 단계가 보기 때문에, base64 로 감싸 우회할 수 없습니다.'],
  [[840, 100, 360, 165], ['z-in'],
   '여덟 중 <b>기계학습 모델은 하나뿐</b>입니다 — 한국어 이름·주소를 잡는 KoELECTRA. ONNX 로 구워 <b>56MB·CPU 3ms</b> 입니다. GPU 가 필요 없습니다.'],
  [[440, 316, 790, 110], ['z-verdict'],
   '판정은 넷입니다. <b>막는 것이 아니라 등급에 따라 다르게 보냅니다</b> — 가방째 압수하면 사람들은 우회로를 찾습니다.'],
  [[1100, 30, 420, 300], ['z-border'],
   '국경 밖은 우리 관제 밖입니다. 그래서 <b>직접 접속은 네트워크에서 차단</b>하고, 이 경로만 열어 둡니다.'],
  [[436, 516, 790, 200], ['z-out'],
   '<b>입국 검사 여섯 단계.</b> 나갈 때 깨끗했어도 돌아올 때 깨끗하다는 보장은 없습니다. 카나리아 토큰이 응답에 나오면 유출이 확정됩니다.'],
  [[24, 548, 400, 130], ['z-audit'],
   '남는 것은 <b>판정뿐</b>입니다. 원문은 저장하지 않고 소금 친 해시만 남겨, 같은 질의가 반복됐는지는 알되 내용은 되살릴 수 없게 합니다.'],
];

/** viewBox 를 부드럽게 옮긴다. 문자열이라 gsap 이 직접 보간하지 못해 객체로 돌린다. */
export function makeArchController(svg, captionEl, reduced) {
  const state = { x: 0, y: 20, w: 1600, h: 680 };
  const groups = [...svg.querySelectorAll('g[id^="z-"]')];

  function apply() {
    svg.setAttribute('viewBox', `${state.x} ${state.y} ${state.w} ${state.h}`);
  }

  return function goto(index) {
    const step = ARCH_STEPS[Math.max(0, Math.min(index, ARCH_STEPS.length - 1))];
    const [[x, y, w, h], focus, caption] = step;
    if (captionEl) captionEl.innerHTML = caption;

    // 초점 밖은 흐리게. 전체 보기(focus 없음)에서는 모두 선명하게 둔다.
    groups.forEach((g) => {
      const dim = focus && !focus.includes(g.id);
      gsap.to(g, { opacity: dim ? 0.18 : 1, duration: reduced ? 0 : 0.4, overwrite: true });
    });

    if (reduced) {
      Object.assign(state, { x, y, w, h });
      apply();
      return;
    }
    gsap.to(state, {
      x, y, w, h, duration: 0.85, ease: 'power3.inOut', overwrite: true, onUpdate: apply,
    });
  };
}
